# =============================================================================
# SCHOLARLY VOICE SERVICE — Kokoro TTS Provider
# =============================================================================
# Kokoro is the primary TTS engine: Apache 2.0 licensed, 82M parameters,
# 48 built-in voices, 8+ languages, and 210x realtime on GPU. It runs
# acceptably on CPU too (3–11x realtime), making it the universal fallback
# when no GPU is available.
#
# Think of Kokoro as the house band at a recording studio — always there,
# always reliable, with a wide repertoire. Chatterbox (the voice cloning
# provider, Sprint 29 Week 4) is the guest artist who can impersonate
# any voice but needs more setup and more compute.
#
# This provider handles:
# - Model loading and device management (CUDA/CPU auto-detection)
# - Voice catalogue with language/gender/style metadata
# - Text-to-speech synthesis with word-level timestamp generation
# - Health checks and resource reporting
# =============================================================================

from __future__ import annotations

import asyncio
import logging
import time
from pathlib import Path
from typing import Any, Optional

import numpy as np
import soundfile as sf

from providers.base import (
    ProviderError,
    ProviderStatus,
    ProviderUnavailableError,
    ProviderValidationError,
    TTSProvider,
    TTSResult,
    VoiceInfoResult,
    WordTimestampResult,
)

logger = logging.getLogger(__name__)


# =============================================================================
# Section 1: Kokoro Voice Catalogue
# =============================================================================
# Kokoro's 48 voices are identified by short IDs like 'af_heart', 'bm_lewis'.
# The naming convention is: {language_prefix}{gender_letter}_{name}
#   a = American English, b = British English, e = Spanish, f = French,
#   h = Hindi, i = Italian, j = Japanese, p = Portuguese, z = Chinese
#   f = female, m = male
#
# We enrich this with metadata for the API's voice listing and filtering.

KOKORO_VOICES: list[dict[str, Any]] = [
    # --- American English ---
    {"id": "af_heart", "name": "Heart", "lang": "en-us", "gender": "female", "style": "warm"},
    {"id": "af_alloy", "name": "Alloy", "lang": "en-us", "gender": "female", "style": "neutral"},
    {"id": "af_aoede", "name": "Aoede", "lang": "en-us", "gender": "female", "style": "calm"},
    {"id": "af_bella", "name": "Bella", "lang": "en-us", "gender": "female", "style": "warm"},
    {"id": "af_jessica", "name": "Jessica", "lang": "en-us", "gender": "female", "style": "bright"},
    {"id": "af_kore", "name": "Kore", "lang": "en-us", "gender": "female", "style": "neutral"},
    {"id": "af_nicole", "name": "Nicole", "lang": "en-us", "gender": "female", "style": "warm"},
    {"id": "af_nova", "name": "Nova", "lang": "en-us", "gender": "female", "style": "energetic"},
    {"id": "af_river", "name": "River", "lang": "en-us", "gender": "female", "style": "calm"},
    {"id": "af_sarah", "name": "Sarah", "lang": "en-us", "gender": "female", "style": "neutral"},
    {"id": "af_sky", "name": "Sky", "lang": "en-us", "gender": "female", "style": "bright"},
    {"id": "am_adam", "name": "Adam", "lang": "en-us", "gender": "male", "style": "neutral"},
    {"id": "am_echo", "name": "Echo", "lang": "en-us", "gender": "male", "style": "calm"},
    {"id": "am_eric", "name": "Eric", "lang": "en-us", "gender": "male", "style": "warm"},
    {"id": "am_fenrir", "name": "Fenrir", "lang": "en-us", "gender": "male", "style": "energetic"},
    {"id": "am_liam", "name": "Liam", "lang": "en-us", "gender": "male", "style": "neutral"},
    {"id": "am_michael", "name": "Michael", "lang": "en-us", "gender": "male", "style": "warm"},
    {"id": "am_onyx", "name": "Onyx", "lang": "en-us", "gender": "male", "style": "calm"},
    {"id": "am_puck", "name": "Puck", "lang": "en-us", "gender": "male", "style": "bright"},
    # --- British English ---
    {"id": "bf_alice", "name": "Alice", "lang": "en-gb", "gender": "female", "style": "warm"},
    {"id": "bf_emma", "name": "Emma", "lang": "en-gb", "gender": "female", "style": "neutral"},
    {"id": "bf_isabella", "name": "Isabella", "lang": "en-gb", "gender": "female", "style": "calm"},
    {"id": "bf_lily", "name": "Lily", "lang": "en-gb", "gender": "female", "style": "bright"},
    {"id": "bm_daniel", "name": "Daniel", "lang": "en-gb", "gender": "male", "style": "neutral"},
    {"id": "bm_fable", "name": "Fable", "lang": "en-gb", "gender": "male", "style": "warm"},
    {"id": "bm_george", "name": "George", "lang": "en-gb", "gender": "male", "style": "calm"},
    {"id": "bm_lewis", "name": "Lewis", "lang": "en-gb", "gender": "male", "style": "neutral"},
    # --- French ---
    {"id": "ff_siwis", "name": "Siwis", "lang": "fr-fr", "gender": "female", "style": "warm"},
    # --- Hindi ---
    {"id": "hf_alpha", "name": "Alpha", "lang": "hi-in", "gender": "female", "style": "neutral"},
    {"id": "hf_beta", "name": "Beta", "lang": "hi-in", "gender": "female", "style": "warm"},
    {"id": "hm_omega", "name": "Omega", "lang": "hi-in", "gender": "male", "style": "neutral"},
    {"id": "hm_psi", "name": "Psi", "lang": "hi-in", "gender": "male", "style": "calm"},
    # --- Italian ---
    {"id": "if_sara", "name": "Sara", "lang": "it-it", "gender": "female", "style": "warm"},
    {"id": "im_nicola", "name": "Nicola", "lang": "it-it", "gender": "male", "style": "neutral"},
    # --- Japanese ---
    {"id": "jf_alpha", "name": "Alpha", "lang": "ja-jp", "gender": "female", "style": "neutral"},
    {"id": "jf_gongitsune", "name": "Gongitsune", "lang": "ja-jp", "gender": "female", "style": "calm"},
    {"id": "jm_kumo", "name": "Kumo", "lang": "ja-jp", "gender": "male", "style": "neutral"},
    # --- Portuguese (Brazilian) ---
    {"id": "pf_dora", "name": "Dora", "lang": "pt-br", "gender": "female", "style": "warm"},
    {"id": "pm_alex", "name": "Alex", "lang": "pt-br", "gender": "male", "style": "neutral"},
    {"id": "pm_santa", "name": "Santa", "lang": "pt-br", "gender": "male", "style": "warm"},
    # --- Chinese (Mandarin) ---
    {"id": "zf_xiaobei", "name": "Xiaobei", "lang": "zh-cn", "gender": "female", "style": "neutral"},
    {"id": "zf_xiaoni", "name": "Xiaoni", "lang": "zh-cn", "gender": "female", "style": "warm"},
    {"id": "zf_xiaoxiao", "name": "Xiaoxiao", "lang": "zh-cn", "gender": "female", "style": "bright"},
    {"id": "zf_xiaoyi", "name": "Xiaoyi", "lang": "zh-cn", "gender": "female", "style": "calm"},
    {"id": "zm_yunjian", "name": "Yunjian", "lang": "zh-cn", "gender": "male", "style": "neutral"},
    {"id": "zm_yunxi", "name": "Yunxi", "lang": "zh-cn", "gender": "male", "style": "warm"},
    {"id": "zm_yunxia", "name": "Yunxia", "lang": "zh-cn", "gender": "male", "style": "calm"},
    {"id": "zm_yunyang", "name": "Yunyang", "lang": "zh-cn", "gender": "male", "style": "energetic"},
    # --- Spanish ---
    {"id": "ef_dora", "name": "Dora", "lang": "es-es", "gender": "female", "style": "warm"},
    {"id": "em_alex", "name": "Alex", "lang": "es-es", "gender": "male", "style": "neutral"},
    {"id": "em_santa", "name": "Santa", "lang": "es-es", "gender": "male", "style": "warm"},
    # --- Korean ---
    {"id": "kf_alpha", "name": "Alpha", "lang": "ko-kr", "gender": "female", "style": "neutral"},
    {"id": "km_beta", "name": "Beta", "lang": "ko-kr", "gender": "male", "style": "neutral"},
]

# Build lookup maps for O(1) access
_VOICE_BY_ID: dict[str, dict[str, Any]] = {v["id"]: v for v in KOKORO_VOICES}
_VOICES_BY_LANG: dict[str, list[dict[str, Any]]] = {}
for _v in KOKORO_VOICES:
    _VOICES_BY_LANG.setdefault(_v["lang"], []).append(_v)

SUPPORTED_LANGUAGES = sorted(set(v["lang"] for v in KOKORO_VOICES))


# =============================================================================
# Section 2: KokoroTTSProvider Implementation
# =============================================================================

class KokoroTTSProvider(TTSProvider):
    """Kokoro TTS provider implementation.

    Manages model loading, voice enumeration, and synthesis with word-level
    timestamp generation. The model is loaded once during warmup and held
    in memory for the lifetime of the service — Kokoro at 82M params uses
    roughly 1GB of VRAM, well within budget on a T4 (16GB).

    GPU operations are serialised via an asyncio.Lock to prevent concurrent
    inference from corrupting GPU state. CPU operations (timestamp extraction,
    audio encoding) run in the default thread pool.
    """

    def __init__(
        self,
        model_path: Path = Path("/models/kokoro"),
        device: str = "auto",
        default_voice: str = "af_heart",
        sample_rate: int = 24000,
    ):
        self._model_path = model_path
        self._requested_device = device
        self._default_voice = default_voice
        self._sample_rate = sample_rate

        # Initialised during warmup()
        self._pipeline: Any = None
        self._device: str = "cpu"
        self._status = ProviderStatus.LOADING
        self._gpu_lock = asyncio.Lock()

    # -------------------------------------------------------------------------
    # Provider interface properties
    # -------------------------------------------------------------------------

    @property
    def provider_id(self) -> str:
        return "kokoro"

    @property
    def supported_languages(self) -> list[str]:
        return SUPPORTED_LANGUAGES

    @property
    def supports_cloning(self) -> bool:
        return False

    @property
    def supports_streaming(self) -> bool:
        # Kokoro supports streaming in principle; we'll enable this
        # when the WebSocket endpoint is implemented (Sprint 30+)
        return False

    @property
    def priority(self) -> int:
        return 1  # Highest priority — the house band

    @property
    def cost_tier(self) -> str:
        return "economy" if self._device == "cpu" else "standard"

    @property
    def status(self) -> ProviderStatus:
        return self._status

    # -------------------------------------------------------------------------
    # Lifecycle
    # -------------------------------------------------------------------------

    async def warmup(self) -> None:
        """Load the Kokoro model. Called once during service startup.

        This runs in the event loop's thread pool because model loading
        involves disk I/O and potentially CUDA initialisation, both of
        which are blocking operations.
        """
        logger.info("Kokoro TTS provider warming up...")
        try:
            self._device = await asyncio.to_thread(self._resolve_device)
            self._pipeline = await asyncio.to_thread(self._load_model)
            self._status = ProviderStatus.HEALTHY
            logger.info(
                "Kokoro TTS ready on %s (%d voices, %d languages)",
                self._device,
                len(KOKORO_VOICES),
                len(SUPPORTED_LANGUAGES),
            )
        except Exception as e:
            self._status = ProviderStatus.UNAVAILABLE
            logger.error("Kokoro TTS warmup failed: %s", e)
            raise ProviderUnavailableError("kokoro", f"Model loading failed: {e}") from e

    def _resolve_device(self) -> str:
        """Determine the best available device for inference."""
        import torch

        if self._requested_device == "auto":
            if torch.cuda.is_available():
                device = "cuda"
                gpu_name = torch.cuda.get_device_name(0)
                vram_gb = torch.cuda.get_device_properties(0).total_mem / (1024 ** 3)
                logger.info("CUDA available: %s (%.1f GB VRAM)", gpu_name, vram_gb)
                return device
            else:
                logger.info("No CUDA available, falling back to CPU")
                return "cpu"
        return self._requested_device

    def _load_model(self) -> Any:
        """Load the Kokoro pipeline. This is a blocking operation that
        runs in a thread pool.

        The pipeline object encapsulates the model, tokeniser, and
        inference logic. We interact with it through its __call__
        interface: pipeline(text, voice=voice_id, speed=pace).
        """
        try:
            from kokoro import KPipeline

            pipeline = KPipeline(lang_code="a", device=self._device)
            logger.info("Kokoro pipeline loaded from default model weights")
            return pipeline
        except ImportError:
            logger.warning(
                "Kokoro package not installed. Provider will be unavailable. "
                "Install with: pip install kokoro"
            )
            raise
        except Exception as e:
            logger.error("Failed to load Kokoro model: %s", e)
            raise

    async def shutdown(self) -> None:
        """Release model resources."""
        if self._pipeline is not None:
            # Allow garbage collection to reclaim GPU memory
            self._pipeline = None
            self._status = ProviderStatus.UNAVAILABLE
            logger.info("Kokoro TTS provider shut down")

            # Explicitly clear CUDA cache if available
            try:
                import torch
                if torch.cuda.is_available():
                    torch.cuda.empty_cache()
            except ImportError:
                pass

    # -------------------------------------------------------------------------
    # Synthesis
    # -------------------------------------------------------------------------

    async def synthesize(
        self,
        text: str,
        voice_id: str,
        language: str,
        *,
        pace: float = 1.0,
        pitch: float = 0.0,
        warmth: float = 0.0,
        **kwargs: Any,
    ) -> TTSResult:
        """Synthesise speech from text using Kokoro.

        The synthesis pipeline:
        1. Validate voice_id exists and supports the requested language
        2. Determine the language code prefix for Kokoro
        3. Run inference (GPU-serialised) to get raw audio samples
        4. Extract word-level timestamps from Kokoro's phoneme alignment
        5. Encode to the requested format

        Pitch and warmth adjustments are NOT applied here — they are
        post-processing operations handled by the audio processing pipeline
        (processing/tempo.py, processing/pitch.py, processing/eq.py).
        This keeps the provider focused on synthesis only, with adjustments
        as a composable layer on top.
        """
        if self._status != ProviderStatus.HEALTHY:
            raise ProviderUnavailableError("kokoro", "Model not loaded")

        if self._pipeline is None:
            raise ProviderUnavailableError("kokoro", "Pipeline not initialised")

        # Validate voice
        voice_id = voice_id or self._default_voice
        if voice_id not in _VOICE_BY_ID:
            raise ProviderValidationError(
                "kokoro",
                f"Unknown voice ID '{voice_id}'. "
                f"Available: {', '.join(sorted(_VOICE_BY_ID.keys())[:10])}..."
            )

        voice_meta = _VOICE_BY_ID[voice_id]
        lang_prefix = self._get_lang_prefix(language, voice_meta)

        start_time = time.monotonic()

        # Run synthesis in thread pool with GPU lock to prevent concurrent
        # CUDA operations from corrupting state
        async with self._gpu_lock:
            audio_segments = await asyncio.to_thread(
                self._run_synthesis,
                text=text,
                voice_id=voice_id,
                lang_prefix=lang_prefix,
                pace=pace,
            )

        # Concatenate audio segments and extract timestamps
        all_audio: list[np.ndarray] = []
        word_timestamps: list[WordTimestampResult] = []
        current_offset = 0.0

        for segment in audio_segments:
            audio_array = segment.get("audio")
            tokens = segment.get("tokens", [])

            if audio_array is not None and len(audio_array) > 0:
                all_audio.append(audio_array)
                segment_duration = len(audio_array) / self._sample_rate

                # Extract word timestamps from Kokoro's token output
                segment_timestamps = self._extract_timestamps(
                    tokens, audio_array, current_offset
                )
                word_timestamps.extend(segment_timestamps)
                current_offset += segment_duration

        if not all_audio:
            raise ProviderError(
                "Synthesis produced no audio",
                provider_id="kokoro",
                retryable=True,
            )

        # Concatenate all segments into a single audio array
        combined_audio = np.concatenate(all_audio)
        duration_seconds = len(combined_audio) / self._sample_rate
        compute_seconds = time.monotonic() - start_time

        # Encode to WAV bytes
        audio_bytes = self._encode_audio(combined_audio)

        logger.info(
            "Kokoro synthesised %.1fs audio from %d chars in %.2fs (%.0fx realtime) on %s",
            duration_seconds,
            len(text),
            compute_seconds,
            duration_seconds / max(compute_seconds, 0.001),
            self._device,
        )

        return TTSResult(
            audio_data=audio_bytes,
            sample_rate=self._sample_rate,
            duration_seconds=duration_seconds,
            word_timestamps=word_timestamps,
            provider_id="kokoro",
            model_name="kokoro-v1.0-82m",
            compute_seconds=compute_seconds,
            characters_processed=len(text),
        )

    def _run_synthesis(
        self,
        text: str,
        voice_id: str,
        lang_prefix: str,
        pace: float,
    ) -> list[dict[str, Any]]:
        """Run Kokoro synthesis. This is a blocking call that runs on the
        thread pool. Returns a list of segment dicts with 'audio' and 'tokens' keys.

        Kokoro's pipeline returns a generator of (graphemes, phonemes, audio)
        tuples. We collect them all since we need the complete audio for
        timestamp extraction.
        """
        segments: list[dict[str, Any]] = []

        try:
            # Kokoro pipeline: lang_code determines pronunciation rules
            # The pipeline object was created with a default lang_code,
            # but we can override per-call by recreating with the right prefix
            generator = self._pipeline(
                text,
                voice=voice_id,
                speed=pace,
            )

            for graphemes, phonemes, audio in generator:
                segments.append({
                    "audio": audio,
                    "tokens": {
                        "graphemes": graphemes,
                        "phonemes": phonemes,
                    },
                })

        except Exception as e:
            logger.error("Kokoro synthesis failed: %s", e)
            raise ProviderError(
                f"Synthesis failed: {e}",
                provider_id="kokoro",
                retryable=True,
            ) from e

        return segments

    def _extract_timestamps(
        self,
        tokens: dict[str, Any],
        audio: np.ndarray,
        offset: float,
    ) -> list[WordTimestampResult]:
        """Extract word-level timestamps from Kokoro's output.

        Kokoro provides grapheme-level alignment through its phoneme output.
        We map phoneme groups back to words and estimate time boundaries
        based on the audio duration and character positions.

        This is an approximation — for precise word-level timestamps,
        the WhisperX forced alignment provider (Sprint 29 Week 2) can
        refine these post-synthesis.
        """
        graphemes = tokens.get("graphemes", "")
        if not graphemes or len(audio) == 0:
            return []

        # Split graphemes into words and estimate proportional timing
        words = graphemes.split()
        if not words:
            return []

        total_duration = len(audio) / self._sample_rate
        total_chars = sum(len(w) for w in words)

        if total_chars == 0:
            return []

        timestamps: list[WordTimestampResult] = []
        current_time = offset

        for word in words:
            # Proportional duration based on character count
            word_duration = (len(word) / total_chars) * total_duration
            timestamps.append(WordTimestampResult(
                word=word,
                start=round(current_time, 3),
                end=round(current_time + word_duration, 3),
                confidence=None,  # Kokoro doesn't provide confidence scores
            ))
            current_time += word_duration

        return timestamps

    def _encode_audio(self, audio: np.ndarray) -> bytes:
        """Encode numpy audio array to WAV bytes."""
        import io
        buffer = io.BytesIO()
        sf.write(buffer, audio, self._sample_rate, format="WAV", subtype="PCM_16")
        buffer.seek(0)
        return buffer.read()

    def _get_lang_prefix(self, language: str, voice_meta: dict[str, Any]) -> str:
        """Map BCP-47 language code to Kokoro's internal language prefix.

        Kokoro uses single-letter prefixes: a=American English, b=British English,
        e=Spanish, f=French, h=Hindi, i=Italian, j=Japanese, p=Portuguese,
        z=Chinese, k=Korean.
        """
        lang_map: dict[str, str] = {
            "en-us": "a",
            "en-gb": "b",
            "es-es": "e",
            "fr-fr": "f",
            "hi-in": "h",
            "it-it": "i",
            "ja-jp": "j",
            "pt-br": "p",
            "zh-cn": "z",
            "ko-kr": "k",
        }

        # Try the requested language, fall back to the voice's native language
        prefix = lang_map.get(language.lower())
        if prefix is None:
            prefix = lang_map.get(voice_meta["lang"], "a")
            logger.warning(
                "Language '%s' not in lang_map, falling back to voice language '%s' (prefix '%s')",
                language,
                voice_meta["lang"],
                prefix,
            )

        return prefix

    # -------------------------------------------------------------------------
    # Voice listing
    # -------------------------------------------------------------------------

    async def list_voices(
        self,
        language: Optional[str] = None,
    ) -> list[VoiceInfoResult]:
        """List available Kokoro voices, optionally filtered by language."""
        if language:
            voices = _VOICES_BY_LANG.get(language.lower(), [])
        else:
            voices = KOKORO_VOICES

        return [
            VoiceInfoResult(
                voice_id=v["id"],
                name=v["name"],
                language=v["lang"],
                gender=v["gender"],
                style=v["style"],
                provider_id="kokoro",
                is_cloned=False,
                supported_languages=[v["lang"]],
                metadata={"model": "kokoro-v1.0-82m"},
            )
            for v in voices
        ]

    # -------------------------------------------------------------------------
    # Health check
    # -------------------------------------------------------------------------

    async def health_check(self) -> bool:
        """Check if Kokoro is operational by verifying the pipeline is loaded."""
        if self._pipeline is None:
            self._status = ProviderStatus.UNAVAILABLE
            return False

        self._status = ProviderStatus.HEALTHY
        return True

    async def estimate_cost(self, text_length: int) -> float:
        """Estimate cost based on device type.
        GPU (T4 spot): ~$0.002 per 1000 chars
        CPU: ~$0.001 per 1000 chars (slower but cheaper compute)
        """
        rate = 0.002 if self._device == "cuda" else 0.001
        return (text_length / 1000) * rate

    def get_model_info(self) -> dict[str, Any]:
        """Return model metadata for the /api/v1/models endpoint."""
        vram_mb: Optional[float] = None
        if self._device == "cuda":
            try:
                import torch
                # Approximate VRAM usage for Kokoro's 82M params
                vram_mb = 1024.0  # ~1GB
                if torch.cuda.is_available():
                    allocated = torch.cuda.memory_allocated(0) / (1024 ** 2)
                    vram_mb = max(vram_mb, allocated)
            except ImportError:
                pass

        return {
            "name": "kokoro-v1.0-82m",
            "provider": "kokoro",
            "status": self._status.value,
            "vram_mb": vram_mb,
            "supported_languages": SUPPORTED_LANGUAGES,
            "device": self._device,
            "voice_count": len(KOKORO_VOICES),
        }
