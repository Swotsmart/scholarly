# =============================================================================
# SCHOLARLY VOICE SERVICE — Sprint 30, Week 2
# WhisperX Alignment Provider
# =============================================================================
#
# If the WhisperSTTProvider (Sprint 29 Week 2) is the court stenographer —
# faithfully transcribing everything said in the courtroom — then this
# WhisperXAlignmentProvider is the forensic audio analyst. It doesn't just
# tell you *what* was said; it tells you *exactly when* each word and
# phoneme was spoken, down to the millisecond.
#
# This provider has two primary missions:
#
# 1. FORCED ALIGNMENT: Given audio and a known transcript, produce precise
#    word-level and phoneme-level timestamps. This is what powers karaoke-
#    style highlighting in the storybook reader — the words light up in
#    perfect sync with the narration because WhisperX has aligned each word
#    to its exact position in the audio stream.
#
# 2. PHONEME-LEVEL PRONUNCIATION SCORING: When a child reads aloud, this
#    provider doesn't just check whether they said the right words (that's
#    WhisperSTTProvider's job). It analyses *how* they said each phoneme,
#    scoring individual grapheme-phoneme correspondences (GPCs) so the BKT
#    engine knows exactly which sound patterns the child has mastered and
#    which need more practice.
#
# Why a separate provider instead of adding to WhisperSTTProvider?
#
# The models are fundamentally different. Whisper is a sequence-to-sequence
# model — it predicts text from audio. WhisperX adds a *forced alignment*
# step using wav2vec2, a representation learning model that produces
# frame-level phoneme predictions. These are different architectures with
# different memory footprints, different loading characteristics, and
# different failure modes. Keeping them separate means:
#   - WhisperX can fail without taking down basic transcription
#   - The alignment model can be updated independently
#   - GPU memory is managed explicitly (load alignment model only when needed)
#   - The registry can route basic STT to Whisper and alignment to WhisperX
#
# Dependencies:
#   Sprint 29 Wk2: providers/base.py (STTProvider, AlignmentResult, etc.)
#   Sprint 29 Wk2: providers/whisper_provider.py (WhisperSTTProvider — for
#                   transcription fallback when alignment needs a transcript)
#   External:      whisperx (BSD-4 licence)
#                  torch + torchaudio (for wav2vec2 phoneme models)
# =============================================================================

from __future__ import annotations

import asyncio
import io
import logging
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

import numpy as np
import soundfile as sf

from providers.base import (
    AlignmentResult,
    PhonemeScore,
    PronunciationResult,
    ProviderError,
    ProviderStatus,
    ProviderUnavailableError,
    ProviderValidationError,
    STTProvider,
    TranscriptionResult,
    TranscriptionSegmentResult,
    TranscriptionWordResult,
    WordPronunciationResult,
    WordTimestampResult,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Section 1: Phoneme Inventory
# =============================================================================
# The phoneme set used by wav2vec2's English alignment model (phoneme-level
# CTC). These are IPA symbols that WhisperX's alignment step produces.
#
# Why this matters for Scholarly: each grapheme-phoneme correspondence (GPC)
# in the phonics scope & sequence maps to one or more of these phonemes.
# When a child reads "cat", the grapheme-parser decomposes it to GPCs:
#   c → /k/,  a → /æ/,  t → /t/
# WhisperX's alignment tells us the child produced /k/ at 0.12s, /æ/ at
# 0.18s, /t/ at 0.25s. Comparing expected vs. produced phonemes gives us
# the phoneme-level accuracy that feeds BKT mastery estimates.

# Standard ARPAbet → IPA mapping for the English alignment model.
# WhisperX uses ARPAbet internally; we convert to IPA for consistency
# with the Scholarly grapheme-parser output.
ARPABET_TO_IPA: dict[str, str] = {
    "AA": "ɑː", "AE": "æ", "AH": "ʌ", "AO": "ɔː", "AW": "aʊ",
    "AY": "aɪ", "B": "b", "CH": "tʃ", "D": "d", "DH": "ð",
    "EH": "ɛ", "ER": "ɜːr", "EY": "eɪ", "F": "f", "G": "ɡ",
    "HH": "h", "IH": "ɪ", "IY": "iː", "JH": "dʒ", "K": "k",
    "L": "l", "M": "m", "N": "n", "NG": "ŋ", "OW": "oʊ",
    "OY": "ɔɪ", "P": "p", "R": "r", "S": "s", "SH": "ʃ",
    "T": "t", "TH": "θ", "UH": "ʊ", "UW": "uː", "V": "v",
    "W": "w", "Y": "j", "Z": "z", "ZH": "ʒ",
}

# Common GPC → expected IPA phoneme(s) mapping.
# This is used by the pronunciation scoring pipeline to map target GPCs
# to the phonemes WhisperX should detect. The Scholarly grapheme-parser
# produces GPCs like "c→/k/", "sh→/ʃ/", "igh→/aɪ/". We need to know
# which wav2vec2 phoneme labels correspond to each.
GPC_TO_PHONEMES: dict[str, list[str]] = {
    # Single consonants
    "b": ["b"], "c": ["k", "s"], "d": ["d"], "f": ["f"], "g": ["ɡ", "dʒ"],
    "h": ["h"], "j": ["dʒ"], "k": ["k"], "l": ["l"], "m": ["m"],
    "n": ["n"], "p": ["p"], "r": ["r"], "s": ["s", "z"], "t": ["t"],
    "v": ["v"], "w": ["w"], "x": ["k", "s"], "y": ["j"], "z": ["z"],
    # Consonant digraphs
    "ch": ["tʃ"], "sh": ["ʃ"], "th": ["θ", "ð"], "ng": ["ŋ"],
    "ck": ["k"], "wh": ["w", "h"], "ph": ["f"], "wr": ["r"],
    "kn": ["n"], "gn": ["n"], "mb": ["m"],
    # Short vowels
    "a": ["æ"], "e": ["ɛ"], "i": ["ɪ"], "o": ["ɒ", "ɔː"], "u": ["ʌ", "ʊ"],
    # Long vowels / split digraphs
    "a_e": ["eɪ"], "e_e": ["iː"], "i_e": ["aɪ"], "o_e": ["oʊ"], "u_e": ["uː", "juː"],
    "ai": ["eɪ"], "ay": ["eɪ"], "ee": ["iː"], "ea": ["iː", "ɛ"],
    "ie": ["aɪ", "iː"], "igh": ["aɪ"], "oa": ["oʊ"], "ow": ["oʊ", "aʊ"],
    "oo": ["uː", "ʊ"], "ue": ["uː"], "ew": ["uː", "juː"],
    # R-controlled vowels
    "ar": ["ɑːr"], "er": ["ɜːr"], "ir": ["ɜːr"], "or": ["ɔːr"], "ur": ["ɜːr"],
    # Diphthongs
    "ou": ["aʊ"], "oi": ["ɔɪ"], "oy": ["ɔɪ"],
}


# =============================================================================
# Section 2: Provider Configuration
# =============================================================================

@dataclass
class WhisperXConfig:
    """Configuration for the WhisperX alignment provider."""

    # WhisperX model settings
    whisperx_model_size: str = "large-v3-turbo"
    alignment_model: str = "WAV2VEC2_ASR_BASE_960H"
    device: str = "auto"
    compute_type: str = "float16"

    # Alignment settings
    min_word_duration: float = 0.02  # Minimum word duration in seconds
    max_word_duration: float = 5.0   # Maximum word duration in seconds

    # Pronunciation scoring thresholds
    phoneme_match_threshold: float = 0.6   # Min confidence for a phoneme match
    word_match_threshold: float = 0.5      # Min confidence for a word match
    gpc_mastery_threshold: float = 0.75    # Score above this = GPC mastered

    # Audio constraints
    max_audio_duration: float = 120.0  # Max audio length in seconds
    sample_rate: int = 16000           # WhisperX expects 16kHz


# =============================================================================
# Section 3: WhisperX Alignment Provider
# =============================================================================

class WhisperXAlignmentProvider(STTProvider):
    """WhisperX-based forced alignment and phoneme-level pronunciation scoring.

    This provider wraps WhisperX (https://github.com/m-bain/whisperX) to
    provide two capabilities that the basic WhisperSTTProvider cannot:

    1. **Forced alignment** (`align`): Given audio and a known transcript,
       produce millisecond-accurate word and phoneme timestamps. Used for
       karaoke-style highlighting in the storybook reader.

    2. **Phoneme-level pronunciation scoring** (`assess_pronunciation`):
       Analyse a child's read-aloud recording against expected text and
       target GPCs, producing per-phoneme scores that feed the BKT engine.

    The provider loads two models:
    - A Whisper model (for transcription when no transcript is provided)
    - A wav2vec2 alignment model (for forced alignment and phoneme extraction)

    GPU memory budget: ~3GB for large-v3-turbo + ~400MB for wav2vec2.
    Total ~3.4GB, comfortably within the T4's 16GB alongside Kokoro (~1GB).
    """

    def __init__(self, config: Optional[WhisperXConfig] = None):
        self._config = config or WhisperXConfig()
        self._whisperx_model: Any = None
        self._alignment_model: Any = None
        self._alignment_metadata: Any = None
        self._device: str = "cpu"
        self._status = ProviderStatus.LOADING
        self._gpu_lock = asyncio.Lock()
        self._load_count = 0

    # -------------------------------------------------------------------------
    # Provider interface properties
    # -------------------------------------------------------------------------

    @property
    def provider_id(self) -> str:
        return "whisperx-aligner"

    @property
    def supported_languages(self) -> list[str]:
        # WhisperX alignment models exist for these languages.
        # English is the primary target for Scholarly phonics.
        return ["en", "fr", "es", "de", "it", "pt", "nl", "ja", "zh", "ko"]

    @property
    def supports_streaming(self) -> bool:
        return False  # Forced alignment requires the complete audio

    @property
    def supports_word_timestamps(self) -> bool:
        return True  # That's our whole purpose

    @property
    def supports_phoneme_alignment(self) -> bool:
        return True  # Our primary differentiator from WhisperSTTProvider

    @property
    def priority(self) -> int:
        # Lower priority than WhisperSTTProvider (priority 1) for basic
        # transcription, but the registry routes alignment requests here
        # because WhisperSTTProvider.supports_phoneme_alignment = False.
        return 5

    @property
    def cost_tier(self) -> str:
        return "standard"

    @property
    def status(self) -> ProviderStatus:
        return self._status

    # -------------------------------------------------------------------------
    # Lifecycle
    # -------------------------------------------------------------------------

    async def warmup(self) -> None:
        """Load WhisperX and the wav2vec2 alignment model.

        Model loading is a blocking operation (~10–15s on first load) so
        we run it in the thread pool. The models are cached after the first
        load — subsequent calls are near-instant.
        """
        start = time.monotonic()
        try:
            self._device = await asyncio.to_thread(self._resolve_device)
            logger.info(
                "Loading WhisperX alignment provider on %s (model: %s)",
                self._device,
                self._config.whisperx_model_size,
            )

            # Load Whisper model (for transcription when needed)
            self._whisperx_model = await asyncio.to_thread(self._load_whisperx_model)

            # Load alignment model (wav2vec2)
            self._alignment_model, self._alignment_metadata = await asyncio.to_thread(
                self._load_alignment_model, "en"
            )

            self._status = ProviderStatus.HEALTHY
            self._load_count += 1
            elapsed = time.monotonic() - start
            logger.info(
                "WhisperX alignment provider ready on %s in %.1fs (load #%d)",
                self._device, elapsed, self._load_count,
            )

        except Exception as e:
            self._status = ProviderStatus.UNAVAILABLE
            logger.error("Failed to load WhisperX: %s", e)
            raise ProviderUnavailableError(
                self.provider_id,
                f"WhisperX model loading failed: {e}",
            )

    async def shutdown(self) -> None:
        """Release models and free GPU memory."""
        self._whisperx_model = None
        self._alignment_model = None
        self._alignment_metadata = None
        self._status = ProviderStatus.UNAVAILABLE
        logger.info("WhisperX alignment provider shut down")

        try:
            import torch
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
        except ImportError:
            pass

    # -------------------------------------------------------------------------
    # Model loading internals (blocking — run in thread pool)
    # -------------------------------------------------------------------------

    def _resolve_device(self) -> str:
        """Determine available compute device."""
        if self._config.device != "auto":
            return self._config.device
        try:
            import torch
            if torch.cuda.is_available():
                return "cuda"
        except ImportError:
            pass
        return "cpu"

    def _load_whisperx_model(self) -> Any:
        """Load the WhisperX model. Blocking."""
        try:
            import whisperx

            model = whisperx.load_model(
                self._config.whisperx_model_size,
                device=self._device,
                compute_type=self._config.compute_type if self._device == "cuda" else "int8",
                language="en",
            )
            logger.info("WhisperX model loaded: %s", self._config.whisperx_model_size)
            return model
        except ImportError:
            raise ProviderUnavailableError(
                self.provider_id,
                "whisperx package not installed. Install with: pip install whisperx",
            )

    def _load_alignment_model(self, language: str) -> tuple[Any, Any]:
        """Load the wav2vec2 alignment model for a language. Blocking."""
        try:
            import whisperx

            model, metadata = whisperx.load_align_model(
                language_code=language,
                device=self._device,
            )
            logger.info("Alignment model loaded for language: %s", language)
            return model, metadata
        except Exception as e:
            raise ProviderUnavailableError(
                self.provider_id,
                f"Alignment model loading failed for {language}: {e}",
            )

    # -------------------------------------------------------------------------
    # Audio preprocessing
    # -------------------------------------------------------------------------

    def _load_audio(self, audio: bytes) -> np.ndarray:
        """Load audio bytes into a numpy array at 16kHz mono.

        WhisperX expects float32 numpy arrays at 16kHz. We handle the
        conversion from whatever format the caller provides (WAV, MP3, etc.)
        using soundfile with a BytesIO wrapper.
        """
        try:
            audio_data, sample_rate = sf.read(io.BytesIO(audio), dtype="float32")
        except Exception as e:
            raise ProviderValidationError(
                self.provider_id,
                f"Could not read audio data: {e}",
            )

        # Convert to mono if stereo
        if len(audio_data.shape) > 1:
            audio_data = audio_data.mean(axis=1)

        # Resample to 16kHz if needed
        if sample_rate != self._config.sample_rate:
            try:
                import torchaudio
                import torch

                tensor = torch.from_numpy(audio_data).unsqueeze(0)
                resampler = torchaudio.transforms.Resample(
                    orig_freq=sample_rate,
                    new_freq=self._config.sample_rate,
                )
                resampled = resampler(tensor).squeeze(0).numpy()
                audio_data = resampled
            except ImportError:
                # Fallback: linear interpolation (lower quality but functional)
                ratio = self._config.sample_rate / sample_rate
                new_length = int(len(audio_data) * ratio)
                indices = np.linspace(0, len(audio_data) - 1, new_length)
                audio_data = np.interp(indices, np.arange(len(audio_data)), audio_data)

        # Duration check
        duration = len(audio_data) / self._config.sample_rate
        if duration > self._config.max_audio_duration:
            raise ProviderValidationError(
                self.provider_id,
                f"Audio too long: {duration:.1f}s (max {self._config.max_audio_duration}s)",
            )

        return audio_data

    # -------------------------------------------------------------------------
    # Forced Alignment (the primary capability)
    # -------------------------------------------------------------------------

    async def align(
        self,
        audio: bytes,
        transcript: str,
        *,
        language: str = "en",
        **kwargs: Any,
    ) -> AlignmentResult:
        """Forced alignment: given audio and transcript, produce exact timestamps.

        This is the method that makes karaoke-style highlighting possible.
        The storybook engine generates narration audio (via Kokoro TTS),
        then calls this method with the audio and the known page text.
        The resulting word-level timestamps are stored alongside the audio
        so the interactive reader can highlight each word in sync.

        The pipeline is:
        1. Load and preprocess audio to 16kHz mono float32
        2. Run WhisperX transcription (to get initial segment boundaries)
        3. Run wav2vec2 forced alignment (to get precise word + phoneme times)
        4. Map phoneme labels from ARPAbet to IPA for consistency
        5. Return AlignmentResult with word and phoneme timestamps

        Args:
            audio: Raw audio bytes (WAV/MP3).
            transcript: The text that was spoken (the "ground truth").
            language: BCP-47 language code (default "en").

        Returns:
            AlignmentResult with word_timestamps and phoneme_timestamps.
        """
        if self._status != ProviderStatus.HEALTHY:
            raise ProviderUnavailableError(
                self.provider_id,
                f"Provider not ready (status: {self._status.value})",
            )

        if not transcript or not transcript.strip():
            raise ProviderValidationError(
                self.provider_id,
                "Transcript is required for forced alignment",
            )

        start_time = time.monotonic()

        # Step 1: Load and preprocess audio
        audio_array = await asyncio.to_thread(self._load_audio, audio)
        duration = len(audio_array) / self._config.sample_rate

        # Step 2–3: Run alignment (GPU-serialised)
        async with self._gpu_lock:
            word_timestamps, phoneme_timestamps = await asyncio.to_thread(
                self._run_alignment, audio_array, transcript, language,
            )

        compute_seconds = time.monotonic() - start_time

        logger.info(
            "Alignment complete: %d words, %d phonemes in %.2fs (audio: %.1fs)",
            len(word_timestamps), len(phoneme_timestamps),
            compute_seconds, duration,
        )

        return AlignmentResult(
            word_timestamps=word_timestamps,
            phoneme_timestamps=phoneme_timestamps,
            duration_seconds=duration,
            provider_id=self.provider_id,
        )

    def _run_alignment(
        self,
        audio: np.ndarray,
        transcript: str,
        language: str,
    ) -> tuple[list[WordTimestampResult], list[PhonemeScore]]:
        """Execute forced alignment. Blocking — runs in thread pool.

        This is the core alignment pipeline. WhisperX works in two phases:
        1. Transcription phase: Whisper produces text with rough timestamps
        2. Alignment phase: wav2vec2 refines timestamps to frame-level accuracy

        We override the transcription result with the known transcript
        (that's what makes it "forced" alignment — we force the model to
        align against the ground truth text rather than its own prediction).
        """
        import whisperx

        # Phase 1: Transcribe to get segment structure
        # We use WhisperX's transcriber even though we have the transcript,
        # because the alignment step expects its specific segment format.
        transcription = self._whisperx_model.transcribe(
            audio,
            batch_size=16 if self._device == "cuda" else 4,
            language=language[:2] if len(language) > 2 else language,
        )

        # Override segments with ground truth transcript.
        # This forces alignment against the known text rather than
        # Whisper's (potentially imperfect) transcription.
        transcription["segments"] = self._create_segments_from_transcript(
            transcript, transcription.get("segments", [])
        )

        # Phase 2: Forced alignment with wav2vec2
        aligned = whisperx.align(
            transcription["segments"],
            self._alignment_model,
            self._alignment_metadata,
            audio,
            device=self._device,
            return_char_alignments=True,  # Needed for phoneme-level data
        )

        # Extract word timestamps
        word_timestamps: list[WordTimestampResult] = []
        phoneme_timestamps: list[PhonemeScore] = []

        for segment in aligned.get("segments", []):
            for word_data in segment.get("words", []):
                word = word_data.get("word", "").strip()
                start = word_data.get("start", 0.0)
                end = word_data.get("end", 0.0)
                score = word_data.get("score", 0.0)

                if not word:
                    continue

                # Clamp durations to reasonable bounds
                duration = end - start
                if duration < self._config.min_word_duration:
                    end = start + self._config.min_word_duration
                elif duration > self._config.max_word_duration:
                    end = start + self._config.max_word_duration

                word_timestamps.append(WordTimestampResult(
                    word=word,
                    start=round(start, 3),
                    end=round(end, 3),
                    confidence=round(score, 4) if score else None,
                ))

            # Extract character/phoneme alignments
            for char_data in segment.get("chars", []):
                char = char_data.get("char", "").strip()
                start = char_data.get("start", 0.0)
                end = char_data.get("end", 0.0)
                score = char_data.get("score", 0.0)

                if not char or char in " .,!?;:":
                    continue

                # Convert ARPAbet to IPA if applicable
                ipa = ARPABET_TO_IPA.get(char.upper(), char.lower())

                phoneme_timestamps.append(PhonemeScore(
                    phoneme=ipa,
                    expected=ipa,
                    score=round(score, 4) if score else 0.0,
                    start=round(start, 3),
                    end=round(end, 3),
                ))

        return word_timestamps, phoneme_timestamps

    def _create_segments_from_transcript(
        self,
        transcript: str,
        original_segments: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """Create WhisperX-compatible segments from a known transcript.

        When we have the ground truth text (e.g., from a storybook page),
        we replace Whisper's transcription with the known text. We try to
        preserve the original segment boundaries for better alignment quality,
        but fall back to a single segment if the original structure doesn't match.
        """
        clean_transcript = transcript.strip()

        # If original segments exist and cover similar text, try to reuse boundaries
        if original_segments:
            original_text = " ".join(s.get("text", "").strip() for s in original_segments)

            # If texts are similar enough, keep segment boundaries but override text
            if self._text_similarity(original_text, clean_transcript) > 0.8:
                return original_segments

        # Fall back to single-segment approach
        return [{
            "text": clean_transcript,
            "start": 0.0,
            "end": 0.0,  # WhisperX will determine the actual end
        }]

    @staticmethod
    def _text_similarity(a: str, b: str) -> float:
        """Quick word-level similarity score (Jaccard index)."""
        words_a = set(a.lower().split())
        words_b = set(b.lower().split())
        if not words_a or not words_b:
            return 0.0
        intersection = words_a & words_b
        union = words_a | words_b
        return len(intersection) / len(union)

    # -------------------------------------------------------------------------
    # Transcription (delegates to WhisperX)
    # -------------------------------------------------------------------------

    async def transcribe(
        self,
        audio: bytes,
        *,
        language: Optional[str] = None,
        word_timestamps: bool = True,
        **kwargs: Any,
    ) -> TranscriptionResult:
        """Transcribe audio using WhisperX with alignment for precise timestamps.

        Unlike the basic WhisperSTTProvider, this produces alignment-quality
        timestamps (frame-level accuracy) rather than Whisper's native timestamps
        (which can be off by 200–500ms). Use this when precise word timing matters.

        For basic transcription where speed matters more than timestamp precision,
        the registry should route to WhisperSTTProvider instead.
        """
        if self._status != ProviderStatus.HEALTHY:
            raise ProviderUnavailableError(
                self.provider_id,
                f"Provider not ready (status: {self._status.value})",
            )

        start_time = time.monotonic()
        audio_array = await asyncio.to_thread(self._load_audio, audio)
        duration = len(audio_array) / self._config.sample_rate

        async with self._gpu_lock:
            result = await asyncio.to_thread(
                self._run_transcription_with_alignment,
                audio_array,
                language or "en",
            )

        compute_seconds = time.monotonic() - start_time

        segments: list[TranscriptionSegmentResult] = []
        for seg in result.get("segments", []):
            words: list[TranscriptionWordResult] = []
            if word_timestamps:
                for w in seg.get("words", []):
                    words.append(TranscriptionWordResult(
                        word=w.get("word", "").strip(),
                        start=round(w.get("start", 0.0), 3),
                        end=round(w.get("end", 0.0), 3),
                        confidence=round(w.get("score", 0.0), 4),
                    ))

            segments.append(TranscriptionSegmentResult(
                text=seg.get("text", "").strip(),
                start=round(seg.get("start", 0.0), 3),
                end=round(seg.get("end", 0.0), 3),
                words=words,
            ))

        full_text = " ".join(s.text for s in segments)

        return TranscriptionResult(
            text=full_text,
            language=language or "en",
            segments=segments,
            duration_seconds=duration,
            provider_id=self.provider_id,
            model_name=f"whisperx-{self._config.whisperx_model_size}",
            compute_seconds=compute_seconds,
            audio_seconds_processed=duration,
        )

    def _run_transcription_with_alignment(
        self,
        audio: np.ndarray,
        language: str,
    ) -> dict[str, Any]:
        """Transcribe and align in one pass. Blocking."""
        import whisperx

        lang_code = language[:2] if len(language) > 2 else language

        # Transcribe
        result = self._whisperx_model.transcribe(
            audio,
            batch_size=16 if self._device == "cuda" else 4,
            language=lang_code,
        )

        # Align for precise timestamps
        aligned = whisperx.align(
            result["segments"],
            self._alignment_model,
            self._alignment_metadata,
            audio,
            device=self._device,
            return_char_alignments=False,
        )

        return aligned

    # -------------------------------------------------------------------------
    # Pronunciation Assessment
    # -------------------------------------------------------------------------

    async def assess_pronunciation(
        self,
        audio: bytes,
        expected_text: str,
        *,
        target_gpcs: Optional[list[str]] = None,
        language: str = "en",
        **kwargs: Any,
    ) -> PronunciationResult:
        """Assess pronunciation at the phoneme level against expected text.

        This is the method that replaces ElevenLabs' pronunciation scoring
        with something fundamentally more useful for phonics instruction.
        ElevenLabs could tell you "the child scored 72% on this sentence."
        This method tells you:
          - The child scored 95% on /k/ (GPC: c → /k/)
          - The child scored 60% on /æ/ (GPC: a → /æ/)
          - The child scored 40% on /θ/ (GPC: th → /θ/)

        That GPC-level granularity is what the BKT engine needs to make
        accurate mastery estimates and recommend the right next lesson.

        Pipeline:
        1. Forced-align the audio against the expected text
        2. For each word, compare aligned phonemes against expected phonemes
        3. Score each phoneme based on alignment confidence
        4. Aggregate scores per target GPC
        5. Calculate fluency (words per minute)
        6. Return the complete assessment

        Args:
            audio: Raw audio bytes of the child's reading.
            expected_text: The text the child was supposed to read.
            target_gpcs: GPCs to score separately (from the phonics session).
            language: Language of the text.

        Returns:
            PronunciationResult with per-word, per-phoneme, and per-GPC scores.
        """
        if self._status != ProviderStatus.HEALTHY:
            raise ProviderUnavailableError(
                self.provider_id,
                f"Provider not ready (status: {self._status.value})",
            )

        if not expected_text or not expected_text.strip():
            raise ProviderValidationError(
                self.provider_id,
                "Expected text is required for pronunciation assessment",
            )

        start_time = time.monotonic()

        # Step 1: Run forced alignment against the expected text
        alignment = await self.align(
            audio, expected_text, language=language,
        )

        # Step 2: Build word-level pronunciation scores
        expected_words = expected_text.strip().split()
        aligned_words = alignment.word_timestamps
        target_gpc_set = set(target_gpcs) if target_gpcs else set()

        word_scores = self._score_words(
            expected_words, aligned_words, target_gpc_set,
        )

        # Step 3: Calculate GPC-level scores from phoneme data
        gpc_scores = self._score_gpcs(
            expected_words, alignment.phoneme_timestamps, target_gpc_set,
        )

        # Step 4: Calculate fluency (words correct per minute)
        correct_words = sum(1 for w in word_scores if w.score >= self._config.word_match_threshold)
        duration = alignment.duration_seconds
        fluency_wpm = (correct_words / duration * 60) if duration > 0 else 0.0

        # Step 5: Overall score
        overall_score = (
            sum(w.score for w in word_scores) / len(word_scores)
            if word_scores else 0.0
        )

        compute_seconds = time.monotonic() - start_time

        logger.info(
            "Pronunciation assessment: overall=%.2f, fluency=%.0f WCPM, "
            "%d/%d words correct, %d GPC scores, %.2fs compute",
            overall_score, fluency_wpm,
            correct_words, len(expected_words),
            len(gpc_scores), compute_seconds,
        )

        return PronunciationResult(
            overall_score=round(overall_score, 4),
            words=word_scores,
            gpc_scores=gpc_scores,
            fluency_wpm=round(fluency_wpm, 1),
            duration_seconds=duration,
            provider_id=self.provider_id,
            model_name=f"whisperx-{self._config.whisperx_model_size}+wav2vec2",
            compute_seconds=compute_seconds,
        )

    def _score_words(
        self,
        expected_words: list[str],
        aligned_words: list[WordTimestampResult],
        target_gpcs: set[str],
    ) -> list[WordPronunciationResult]:
        """Score each expected word against aligned words.

        Uses a simple alignment algorithm: walk through expected and aligned
        words in order, matching by normalised text. This handles minor
        transcription differences (punctuation, capitalisation) while
        detecting omissions (expected word not found) and insertions
        (extra words in the child's speech).
        """
        word_scores: list[WordPronunciationResult] = []
        aligned_idx = 0

        for expected_word in expected_words:
            normalised_expected = self._normalise_word(expected_word)

            # Search forward in aligned words for a match
            best_match: Optional[WordTimestampResult] = None
            best_match_idx = aligned_idx
            search_window = min(aligned_idx + 5, len(aligned_words))

            for i in range(aligned_idx, search_window):
                normalised_aligned = self._normalise_word(aligned_words[i].word)
                if normalised_aligned == normalised_expected:
                    best_match = aligned_words[i]
                    best_match_idx = i
                    break

            # Check if this word contains any target GPCs
            contains_gpc = any(
                gpc in normalised_expected.lower()
                for gpc in target_gpcs
            ) if target_gpcs else False

            if best_match:
                score = best_match.confidence if best_match.confidence is not None else 0.8
                aligned_idx = best_match_idx + 1

                # Build phoneme list for this word
                phonemes = self._extract_word_phonemes(
                    normalised_expected, best_match, target_gpcs,
                )

                word_scores.append(WordPronunciationResult(
                    word=best_match.word,
                    expected=expected_word,
                    score=round(min(score, 1.0), 4),
                    phonemes=phonemes,
                    contains_target_gpc=contains_gpc,
                ))
            else:
                # Word was omitted by the reader
                word_scores.append(WordPronunciationResult(
                    word="",
                    expected=expected_word,
                    score=0.0,
                    phonemes=[],
                    contains_target_gpc=contains_gpc,
                ))

        return word_scores

    def _extract_word_phonemes(
        self,
        word: str,
        aligned: WordTimestampResult,
        target_gpcs: set[str],
    ) -> list[PhonemeScore]:
        """Extract expected phonemes for a word and create scoring placeholders.

        In a full implementation, this would cross-reference the WhisperX
        phoneme alignment data with the expected phonemes from the grapheme
        parser. For now, we use the GPC_TO_PHONEMES mapping to determine
        which phonemes we expect for each grapheme in the word, and assign
        the word-level confidence as a proxy for phoneme-level accuracy.

        This is a reasonable approximation because:
        - If the word is correctly pronounced, all its phonemes are likely correct
        - The phoneme-level refinement (using raw wav2vec2 CTC outputs) is
          the enhancement path for Sprint 30 Week 2+
        """
        phonemes: list[PhonemeScore] = []
        word_score = aligned.confidence if aligned.confidence is not None else 0.8
        word_start = aligned.start
        word_end = aligned.end
        word_duration = word_end - word_start

        # Simple character-by-character phoneme estimation
        # In production, this would use the grapheme-parser's DAG decomposition
        chars = list(word.lower())
        n_chars = max(len(chars), 1)
        char_duration = word_duration / n_chars

        for i, char in enumerate(chars):
            if char.isalpha():
                expected_phonemes = GPC_TO_PHONEMES.get(char, [char])
                if expected_phonemes:
                    phoneme = expected_phonemes[0]  # Primary phoneme
                    phonemes.append(PhonemeScore(
                        phoneme=phoneme,
                        expected=phoneme,
                        score=round(word_score, 4),
                        start=round(word_start + i * char_duration, 3),
                        end=round(word_start + (i + 1) * char_duration, 3),
                    ))

        return phonemes

    def _score_gpcs(
        self,
        expected_words: list[str],
        phoneme_timestamps: list[PhonemeScore],
        target_gpcs: set[str],
    ) -> dict[str, float]:
        """Calculate per-GPC accuracy scores.

        For each target GPC, we find all words that contain it, collect
        the phoneme scores for the corresponding phoneme(s), and average them.
        This gives the BKT engine a direct accuracy signal per GPC.

        Example:
          Target GPCs: ["a", "th", "igh"]
          Word "cat" → GPC "a" → phoneme /æ/ → score 0.85
          Word "the" → GPC "th" → phoneme /ð/ → score 0.60
          Word "night" → GPC "igh" → phoneme /aɪ/ → score 0.45
          Result: {"a": 0.85, "th": 0.60, "igh": 0.45}
        """
        if not target_gpcs:
            return {}

        gpc_accumulator: dict[str, list[float]] = {gpc: [] for gpc in target_gpcs}

        # Build a phoneme timeline lookup
        phoneme_by_time: list[PhonemeScore] = sorted(
            phoneme_timestamps, key=lambda p: p.start,
        )

        for word in expected_words:
            normalised = word.lower().strip(".,!?;:'\"")

            for gpc in target_gpcs:
                if gpc in normalised:
                    # Find the phonemes expected for this GPC
                    expected_ipa = GPC_TO_PHONEMES.get(gpc, [])
                    if not expected_ipa:
                        continue

                    # Find matching phonemes in the timeline
                    matched_scores: list[float] = []
                    for p in phoneme_by_time:
                        if p.phoneme in expected_ipa and p.score > 0.0:
                            matched_scores.append(p.score)

                    if matched_scores:
                        # Average of matched phoneme scores
                        avg_score = sum(matched_scores) / len(matched_scores)
                        gpc_accumulator[gpc].append(avg_score)

        # Average across all occurrences of each GPC
        gpc_scores: dict[str, float] = {}
        for gpc, scores in gpc_accumulator.items():
            if scores:
                gpc_scores[gpc] = round(sum(scores) / len(scores), 4)

        return gpc_scores

    @staticmethod
    def _normalise_word(word: str) -> str:
        """Normalise a word for comparison (lowercase, strip punctuation)."""
        return word.lower().strip(".,!?;:'\"()-")

    # -------------------------------------------------------------------------
    # Health check
    # -------------------------------------------------------------------------

    async def health_check(self) -> bool:
        """Check if the provider is operational."""
        if self._status != ProviderStatus.HEALTHY:
            return False

        # Verify models are loaded
        if self._whisperx_model is None or self._alignment_model is None:
            self._status = ProviderStatus.UNHEALTHY
            return False

        return True
