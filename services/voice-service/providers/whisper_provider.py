# =============================================================================
# SCHOLARLY VOICE SERVICE — Whisper STT Provider
# =============================================================================
# The primary Speech-to-Text engine: faster-whisper (CTranslate2 backend)
# running Whisper Large V3 Turbo. This is the ears of the platform — it
# listens to children reading aloud, transcribes their speech with
# word-level timestamps, and provides the raw data that the phonics
# assessment pipeline uses to score pronunciation.
#
# Think of faster-whisper as a highly trained transcriptionist who can
# not only write down every word a child says, but also note the exact
# moment each word was spoken and how confident they are about each one.
# The WhisperX alignment layer then refines those timestamps to
# phoneme-level precision — like the transcriptionist going back and
# marking exactly which syllables were stressed.
#
# Architecture notes:
# - faster-whisper uses CTranslate2 for 4x faster inference than OpenAI's
#   original, with lower VRAM via int8/float16 quantisation
# - Word timestamps come from Whisper's cross-attention mechanism
# - Pronunciation assessment compares transcription against expected text
#   using sequence alignment (difflib), then scores each word
# - GPU operations serialised via asyncio.Lock (shared GPU with Kokoro)
# =============================================================================

from __future__ import annotations

import asyncio
import difflib
import io
import logging
import re
import time
from pathlib import Path
from typing import Any, Optional

import numpy as np

from providers.base import (
    AlignmentResult,
    PhonemeScore,
    ProviderError,
    ProviderStatus,
    ProviderUnavailableError,
    PronunciationResult,
    STTProvider,
    TranscriptionResult,
    TranscriptionSegmentResult,
    TranscriptionWordResult,
    WordPronunciationResult,
    WordTimestampResult,
)

logger = logging.getLogger(__name__)

# Whisper Large V3 Turbo supports 99+ languages. These are the ones
# most relevant to the Scholarly platform's current language coverage.
WHISPER_PRIMARY_LANGUAGES = [
    "en", "fr", "es", "hi", "ja", "zh", "it", "pt", "ko",
    "de", "nl", "ru", "ar", "tr", "pl", "sv", "da", "no",
    "fi", "el", "he", "th", "vi", "id", "ms", "tl", "sw",
]

# Map BCP-47 codes (used by our API) to Whisper's ISO 639-1 codes
BCP47_TO_WHISPER: dict[str, str] = {
    "en-us": "en", "en-gb": "en", "en-au": "en",
    "fr-fr": "fr", "fr-ca": "fr",
    "es-es": "es", "es-mx": "es",
    "hi-in": "hi",
    "ja-jp": "ja",
    "zh-cn": "zh", "zh-tw": "zh",
    "it-it": "it",
    "pt-br": "pt", "pt-pt": "pt",
    "ko-kr": "ko",
    "de-de": "de",
}


class WhisperSTTProvider(STTProvider):
    """faster-whisper STT provider implementation.

    Handles:
    - Audio transcription with word-level timestamps
    - Language auto-detection or hint-based selection
    - Pronunciation assessment via transcript-expected alignment
    - Forced alignment via WhisperX (when available)

    The model is loaded once during warmup and held in memory. Whisper
    Large V3 Turbo uses ~3GB VRAM in float16, fitting alongside
    Kokoro's ~1GB on a T4's 16GB total.
    """

    def __init__(
        self,
        model_size: str = "large-v3-turbo",
        model_path: Optional[Path] = None,
        device: str = "auto",
        compute_type: str = "float16",
        max_audio_duration: int = 600,
    ):
        self._model_size = model_size
        self._model_path = model_path
        self._requested_device = device
        self._compute_type = compute_type
        self._max_audio_duration = max_audio_duration

        self._model: Any = None
        self._device: str = "cpu"
        self._status = ProviderStatus.LOADING
        self._gpu_lock = asyncio.Lock()

    # -------------------------------------------------------------------------
    # Provider interface properties
    # -------------------------------------------------------------------------

    @property
    def provider_id(self) -> str:
        return "whisper"

    @property
    def supported_languages(self) -> list[str]:
        return WHISPER_PRIMARY_LANGUAGES

    @property
    def supports_streaming(self) -> bool:
        return False  # Sprint 30+ via WebSocket

    @property
    def supports_word_timestamps(self) -> bool:
        return True

    @property
    def supports_phoneme_alignment(self) -> bool:
        return self._whisperx_available

    @property
    def priority(self) -> int:
        return 1

    @property
    def cost_tier(self) -> str:
        return "economy" if self._device == "cpu" else "standard"

    @property
    def status(self) -> ProviderStatus:
        return self._status

    @property
    def _whisperx_available(self) -> bool:
        try:
            import whisperx  # noqa: F401
            return True
        except ImportError:
            return False

    # -------------------------------------------------------------------------
    # Lifecycle
    # -------------------------------------------------------------------------

    async def warmup(self) -> None:
        logger.info("Whisper STT provider warming up (model=%s)...", self._model_size)
        try:
            self._device = await asyncio.to_thread(self._resolve_device)
            self._model = await asyncio.to_thread(self._load_model)
            self._status = ProviderStatus.HEALTHY
            logger.info(
                "Whisper STT ready on %s (compute_type=%s, %d languages)",
                self._device, self._compute_type, len(WHISPER_PRIMARY_LANGUAGES),
            )
        except Exception as e:
            self._status = ProviderStatus.UNAVAILABLE
            logger.error("Whisper STT warmup failed: %s", e)
            raise ProviderUnavailableError("whisper", f"Model loading failed: {e}") from e

    def _resolve_device(self) -> str:
        if self._requested_device == "auto":
            try:
                import torch
                if torch.cuda.is_available():
                    return "cuda"
            except ImportError:
                pass
            return "cpu"
        return self._requested_device

    def _load_model(self) -> Any:
        try:
            from faster_whisper import WhisperModel

            compute_type = self._compute_type
            if self._device == "cpu" and compute_type == "float16":
                compute_type = "int8"
                logger.info("CPU mode: compute_type adjusted to int8")

            model = WhisperModel(
                self._model_size,
                device=self._device,
                compute_type=compute_type,
                download_root=str(self._model_path) if self._model_path else None,
            )
            logger.info("faster-whisper loaded: %s on %s (%s)",
                        self._model_size, self._device, compute_type)
            return model
        except ImportError:
            logger.warning("faster-whisper not installed. pip install faster-whisper")
            raise

    async def shutdown(self) -> None:
        if self._model is not None:
            self._model = None
            self._status = ProviderStatus.UNAVAILABLE
            logger.info("Whisper STT shut down")
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except ImportError:
                pass

    # -------------------------------------------------------------------------
    # Transcription
    # -------------------------------------------------------------------------

    async def transcribe(
        self,
        audio: bytes,
        *,
        language: Optional[str] = None,
        word_timestamps: bool = True,
        **kwargs: Any,
    ) -> TranscriptionResult:
        """Transcribe audio to text with word-level timestamps.

        Pipeline:
        1. Decode audio bytes → numpy array (resample to 16kHz mono)
        2. Validate duration
        3. Map BCP-47 language hint → Whisper ISO code
        4. Run inference (GPU-serialised) with word_timestamps=True
        5. Collect segments and word timestamps
        6. Return structured result
        """
        if self._status != ProviderStatus.HEALTHY or self._model is None:
            raise ProviderUnavailableError("whisper", "Model not loaded")

        start_time = time.monotonic()

        audio_array, sample_rate = await asyncio.to_thread(self._decode_audio, audio)

        duration = len(audio_array) / sample_rate
        if duration > self._max_audio_duration:
            raise ProviderError(
                f"Audio duration {duration:.1f}s exceeds max {self._max_audio_duration}s",
                provider_id="whisper", retryable=False,
            )

        whisper_lang = self._map_language(language)

        async with self._gpu_lock:
            segments_raw, info = await asyncio.to_thread(
                self._run_transcription, audio_array, whisper_lang, word_timestamps,
            )

        segments: list[TranscriptionSegmentResult] = []
        full_text_parts: list[str] = []

        for segment in segments_raw:
            words: list[TranscriptionWordResult] = []
            if word_timestamps and hasattr(segment, "words") and segment.words:
                for w in segment.words:
                    words.append(TranscriptionWordResult(
                        word=w.word.strip(),
                        start=round(w.start, 3),
                        end=round(w.end, 3),
                        confidence=round(getattr(w, "probability", 0.0), 3),
                    ))

            segments.append(TranscriptionSegmentResult(
                text=segment.text.strip(),
                start=round(segment.start, 3),
                end=round(segment.end, 3),
                words=words,
            ))
            full_text_parts.append(segment.text.strip())

        compute_seconds = time.monotonic() - start_time
        detected_lang = getattr(info, "language", None) or whisper_lang or "en"

        logger.info(
            "Whisper: %.1fs audio → %d segments, %d words in %.2fs (%.1fx RT) on %s",
            duration, len(segments), sum(len(s.words) for s in segments),
            compute_seconds, duration / max(compute_seconds, 0.001), self._device,
        )

        return TranscriptionResult(
            text=" ".join(full_text_parts),
            language=detected_lang,
            segments=segments,
            duration_seconds=duration,
            provider_id="whisper",
            model_name=f"whisper-{self._model_size}",
            compute_seconds=compute_seconds,
            audio_seconds_processed=duration,
        )

    def _run_transcription(
        self, audio: np.ndarray, language: Optional[str], word_timestamps: bool,
    ) -> tuple[Any, Any]:
        """Run faster-whisper transcription. Blocking — thread pool."""
        segments_gen, info = self._model.transcribe(
            audio,
            language=language,
            word_timestamps=word_timestamps,
            beam_size=5,
            best_of=5,
            vad_filter=True,
            vad_parameters=dict(min_silence_duration_ms=500, speech_pad_ms=200),
        )
        return list(segments_gen), info

    # -------------------------------------------------------------------------
    # Pronunciation Assessment
    # -------------------------------------------------------------------------

    async def assess_pronunciation(
        self,
        audio: bytes,
        expected_text: str,
        *,
        target_gpcs: Optional[list[str]] = None,
        language: str = "en-us",
        **kwargs: Any,
    ) -> PronunciationResult:
        """Assess pronunciation by comparing transcription against expected text.

        Pipeline:
        1. Transcribe the audio with word timestamps
        2. Normalise both transcribed and expected text
        3. Align using SequenceMatcher (handles insertions, deletions,
           substitutions — like comparing two manuscript versions)
        4. Score each word (1.0 = exact match, partial credit for near misses)
        5. Calculate per-GPC scores if target_gpcs provided
        6. Compute fluency (words correct per minute)

        This is word-level assessment — accurate enough for the read-aloud
        scoring in the storybook reader. Phoneme-level scoring (via WhisperX
        forced alignment + a pronunciation model) is a Sprint 30+ extension.
        """
        if self._status != ProviderStatus.HEALTHY:
            raise ProviderUnavailableError("whisper", "Model not loaded")

        start_time = time.monotonic()

        transcription = await self.transcribe(audio, language=language, word_timestamps=True)

        expected_words = self._normalise_text(expected_text)
        transcribed_words = self._normalise_text(transcription.text)

        word_results = self._align_and_score(
            expected_words, transcribed_words, transcription, target_gpcs or [],
        )

        overall_score = (
            sum(w.score for w in word_results) / len(word_results)
            if word_results else 0.0
        )

        gpc_scores = self._calculate_gpc_scores(word_results, target_gpcs or [])

        correct_words = sum(1 for w in word_results if w.score >= 0.8)
        duration_minutes = max(transcription.duration_seconds / 60.0, 0.001)
        fluency_wpm = correct_words / duration_minutes

        compute_seconds = time.monotonic() - start_time

        logger.info(
            "Pronunciation: %.0f%% overall, %.0f WCPM, %d/%d correct",
            overall_score * 100, fluency_wpm, correct_words, len(word_results),
        )

        return PronunciationResult(
            overall_score=round(overall_score, 3),
            words=word_results,
            gpc_scores=gpc_scores,
            fluency_wpm=round(fluency_wpm, 1),
            duration_seconds=transcription.duration_seconds,
            provider_id="whisper",
            model_name=f"whisper-{self._model_size}",
            compute_seconds=compute_seconds,
        )

    def _align_and_score(
        self,
        expected: list[str],
        transcribed: list[str],
        transcription: TranscriptionResult,
        target_gpcs: list[str],
    ) -> list[WordPronunciationResult]:
        """Align expected and transcribed words, scoring each pair.

        Uses difflib.SequenceMatcher to handle insertions, deletions, and
        substitutions. Like comparing two manuscript versions — the matcher
        identifies which words match, were changed, or are missing.
        """
        results: list[WordPronunciationResult] = []

        transcribed_flat: list[str] = []
        for seg in transcription.segments:
            for w in seg.words:
                transcribed_flat.append(self._normalise_word(w.word))

        matcher = difflib.SequenceMatcher(None, expected, transcribed_flat)

        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == "equal":
                for k, exp_word in enumerate(expected[i1:i2]):
                    t_idx = j1 + k
                    spoken = transcribed_flat[t_idx] if t_idx < len(transcribed_flat) else exp_word
                    results.append(WordPronunciationResult(
                        word=spoken, expected=exp_word, score=1.0,
                        contains_target_gpc=self._word_contains_gpc(exp_word, target_gpcs),
                    ))

            elif tag == "replace":
                for k, exp_word in enumerate(expected[i1:i2]):
                    t_idx = j1 + k
                    if t_idx < j2 and t_idx < len(transcribed_flat):
                        spoken = transcribed_flat[t_idx]
                        similarity = difflib.SequenceMatcher(None, exp_word, spoken).ratio()
                        results.append(WordPronunciationResult(
                            word=spoken, expected=exp_word, score=round(similarity, 3),
                            contains_target_gpc=self._word_contains_gpc(exp_word, target_gpcs),
                        ))
                    else:
                        results.append(WordPronunciationResult(
                            word="", expected=exp_word, score=0.0,
                            contains_target_gpc=self._word_contains_gpc(exp_word, target_gpcs),
                        ))

            elif tag == "delete":
                for exp_word in expected[i1:i2]:
                    results.append(WordPronunciationResult(
                        word="", expected=exp_word, score=0.0,
                        contains_target_gpc=self._word_contains_gpc(exp_word, target_gpcs),
                    ))
            # "insert" = extra words spoken — don't penalise

        return results

    def _calculate_gpc_scores(
        self, word_results: list[WordPronunciationResult], target_gpcs: list[str],
    ) -> dict[str, float]:
        """Average score per target GPC across all words containing it."""
        if not target_gpcs:
            return {}
        gpc_scores: dict[str, list[float]] = {gpc: [] for gpc in target_gpcs}
        for result in word_results:
            if result.contains_target_gpc:
                for gpc in target_gpcs:
                    if gpc.lower() in result.expected.lower():
                        gpc_scores[gpc].append(result.score)
        return {
            gpc: round(sum(s) / len(s), 3) if s else 0.0
            for gpc, s in gpc_scores.items()
        }

    # -------------------------------------------------------------------------
    # Forced Alignment (WhisperX)
    # -------------------------------------------------------------------------

    async def align(
        self,
        audio: bytes,
        transcript: str,
        *,
        language: str = "en-us",
        **kwargs: Any,
    ) -> AlignmentResult:
        """Forced alignment using WhisperX.

        Given audio + known transcript, produces exact word-level and
        phoneme-level timestamps via wav2vec2 alignment models. More
        precise than Whisper's native timestamps.

        Used post-TTS for karaoke sync and post-read-aloud for
        phoneme-level pronunciation scoring.
        """
        if not self._whisperx_available:
            raise ProviderError(
                "WhisperX not installed. pip install whisperx",
                provider_id="whisper", retryable=False,
            )

        start_time = time.monotonic()
        audio_array, sample_rate = await asyncio.to_thread(self._decode_audio, audio)
        whisper_lang = self._map_language(language) or "en"

        async with self._gpu_lock:
            alignment = await asyncio.to_thread(
                self._run_alignment, audio_array, transcript, whisper_lang,
            )

        return AlignmentResult(
            word_timestamps=alignment["word_timestamps"],
            phoneme_timestamps=alignment.get("phoneme_timestamps", []),
            duration_seconds=len(audio_array) / sample_rate,
            provider_id="whisper",
        )

    def _run_alignment(
        self, audio: np.ndarray, transcript: str, language: str,
    ) -> dict[str, Any]:
        """Run WhisperX forced alignment. Blocking — thread pool."""
        import whisperx

        align_model, align_metadata = whisperx.load_align_model(
            language_code=language, device=self._device,
        )
        segments = [{"text": transcript, "start": 0.0, "end": len(audio) / 16000}]
        result = whisperx.align(
            segments, align_model, align_metadata, audio,
            device=self._device, return_char_alignments=True,
        )

        word_timestamps: list[WordTimestampResult] = []
        phoneme_timestamps: list[PhonemeScore] = []

        if "segments" in result:
            for seg in result["segments"]:
                for w in seg.get("words", []):
                    word_timestamps.append(WordTimestampResult(
                        word=w.get("word", ""), start=round(w.get("start", 0.0), 3),
                        end=round(w.get("end", 0.0), 3),
                        confidence=round(w.get("score", 0.0), 3),
                    ))
                for c in seg.get("chars", []):
                    phoneme_timestamps.append(PhonemeScore(
                        phoneme=c.get("char", ""), expected=c.get("char", ""),
                        score=round(c.get("score", 0.0), 3),
                        start=round(c.get("start", 0.0), 3),
                        end=round(c.get("end", 0.0), 3),
                    ))

        return {"word_timestamps": word_timestamps, "phoneme_timestamps": phoneme_timestamps}

    # -------------------------------------------------------------------------
    # Utilities
    # -------------------------------------------------------------------------

    def _decode_audio(self, audio_bytes: bytes) -> tuple[np.ndarray, int]:
        """Decode audio bytes → numpy float32 array. Resample to 16kHz mono."""
        import soundfile as sf

        buffer = io.BytesIO(audio_bytes)
        try:
            audio_array, sample_rate = sf.read(buffer, dtype="float32")
        except Exception as e:
            raise ProviderError(
                f"Failed to decode audio: {e}", provider_id="whisper", retryable=False,
            ) from e

        if len(audio_array.shape) > 1:
            audio_array = audio_array.mean(axis=1)

        if sample_rate != 16000:
            import librosa
            audio_array = librosa.resample(audio_array, orig_sr=sample_rate, target_sr=16000)
            sample_rate = 16000

        return audio_array, sample_rate

    def _map_language(self, language: Optional[str]) -> Optional[str]:
        if language is None:
            return None
        return BCP47_TO_WHISPER.get(language.lower(), language.split("-")[0].lower())

    @staticmethod
    def _normalise_text(text: str) -> list[str]:
        text = text.lower()
        text = re.sub(r"[^\w\s]", "", text)
        return text.split()

    @staticmethod
    def _normalise_word(word: str) -> str:
        return re.sub(r"[^\w]", "", word.lower())

    @staticmethod
    def _word_contains_gpc(word: str, target_gpcs: list[str]) -> bool:
        word_lower = word.lower()
        return any(gpc.lower() in word_lower for gpc in target_gpcs)

    async def health_check(self) -> bool:
        if self._model is None:
            self._status = ProviderStatus.UNAVAILABLE
            return False
        self._status = ProviderStatus.HEALTHY
        return True

    def get_model_info(self) -> dict[str, Any]:
        vram_mb: Optional[float] = 3072.0 if self._device == "cuda" else None
        return {
            "name": f"whisper-{self._model_size}",
            "provider": "whisper",
            "status": self._status.value,
            "vram_mb": vram_mb,
            "supported_languages": WHISPER_PRIMARY_LANGUAGES,
            "device": self._device,
            "compute_type": self._compute_type,
            "whisperx_available": self._whisperx_available,
        }
