# =============================================================================
# SCHOLARLY VOICE SERVICE — Provider Abstract Base Classes
# =============================================================================
# These abstract classes define the contract that every TTS and STT provider
# must implement. They are the "socket" into which concrete providers
# (Kokoro, Chatterbox, Whisper, ElevenLabs) plug. The calling code never
# knows or cares which provider is behind the interface — it asks for
# synthesis or transcription, and the provider delivers.
#
# This mirrors the AIPAL pattern from the Scholarly TypeScript codebase:
# abstract interfaces define capabilities, concrete implementations wrap
# specific models, and a registry routes requests to the right provider.
# The same architecture, translated into Python idioms.
# =============================================================================

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional


# =============================================================================
# Section 1: Result Types
# =============================================================================
# Every provider method returns a typed result rather than raw data.
# This ensures consistent error handling and metadata propagation
# regardless of which provider handled the request.

@dataclass
class WordTimestampResult:
    """A word with its time boundaries in the audio stream."""
    word: str
    start: float  # seconds
    end: float    # seconds
    confidence: Optional[float] = None


@dataclass
class TTSResult:
    """Result of a text-to-speech synthesis operation.
    Contains the audio data, timestamps, and cost metadata."""
    audio_data: bytes
    sample_rate: int
    duration_seconds: float
    word_timestamps: list[WordTimestampResult] = field(default_factory=list)
    provider_id: str = ""
    model_name: str = ""
    compute_seconds: float = 0.0
    characters_processed: int = 0


@dataclass
class TranscriptionWordResult:
    """A single word from transcription with timing and confidence."""
    word: str
    start: float
    end: float
    confidence: float = 0.0


@dataclass
class TranscriptionSegmentResult:
    """A segment of transcribed text (typically a sentence or phrase)."""
    text: str
    start: float
    end: float
    words: list[TranscriptionWordResult] = field(default_factory=list)


@dataclass
class TranscriptionResult:
    """Result of a speech-to-text transcription operation."""
    text: str
    language: str
    segments: list[TranscriptionSegmentResult] = field(default_factory=list)
    duration_seconds: float = 0.0
    provider_id: str = ""
    model_name: str = ""
    compute_seconds: float = 0.0
    audio_seconds_processed: float = 0.0


@dataclass
class PhonemeScore:
    """Pronunciation score for a single phoneme."""
    phoneme: str
    expected: str
    score: float  # 0.0 – 1.0
    start: float
    end: float


@dataclass
class WordPronunciationResult:
    """Pronunciation assessment for a single word."""
    word: str
    expected: str
    score: float  # 0.0 – 1.0
    phonemes: list[PhonemeScore] = field(default_factory=list)
    contains_target_gpc: bool = False


@dataclass
class PronunciationResult:
    """Result of a pronunciation assessment operation."""
    overall_score: float
    words: list[WordPronunciationResult] = field(default_factory=list)
    gpc_scores: dict[str, float] = field(default_factory=dict)
    fluency_wpm: float = 0.0
    duration_seconds: float = 0.0
    provider_id: str = ""
    model_name: str = ""
    compute_seconds: float = 0.0


@dataclass
class AlignmentResult:
    """Result of forced alignment (given audio + transcript, produce timestamps)."""
    word_timestamps: list[WordTimestampResult] = field(default_factory=list)
    phoneme_timestamps: list[PhonemeScore] = field(default_factory=list)
    duration_seconds: float = 0.0
    provider_id: str = ""


@dataclass
class VoiceInfoResult:
    """Information about an available voice from a provider."""
    voice_id: str
    name: str
    language: str
    gender: str  # "male", "female", "neutral"
    style: str   # "warm", "bright", "neutral", "calm", "energetic"
    provider_id: str
    is_cloned: bool = False
    preview_url: Optional[str] = None
    supported_languages: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


# =============================================================================
# Section 2: Provider Status
# =============================================================================

class ProviderStatus(str, Enum):
    """Health status of a provider. Used by the registry's circuit breaker."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"    # Responding but slower than expected
    UNHEALTHY = "unhealthy"  # Failed health check, excluded from routing
    LOADING = "loading"      # Model still loading, not yet ready
    UNAVAILABLE = "unavailable"  # Not configured or missing dependencies


# =============================================================================
# Section 3: Abstract TTS Provider
# =============================================================================

class TTSProvider(ABC):
    """Abstract base class for Text-to-Speech providers.

    Every TTS provider — whether it wraps Kokoro running on a local GPU,
    Chatterbox for voice cloning, or the ElevenLabs cloud API — must
    implement this interface. The provider registry uses this contract to
    route requests without knowing the implementation details.

    Think of this as the electrical outlet standard: every appliance
    (provider) has a different internal mechanism, but they all plug into
    the same socket shape. The house wiring (registry) doesn't need to
    know whether it's powering a lamp or a computer.
    """

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique identifier for this provider (e.g., 'kokoro', 'chatterbox')."""
        ...

    @property
    @abstractmethod
    def supported_languages(self) -> list[str]:
        """BCP-47 language codes this provider supports."""
        ...

    @property
    @abstractmethod
    def supports_cloning(self) -> bool:
        """Whether this provider can synthesise with cloned voice profiles."""
        ...

    @property
    @abstractmethod
    def supports_streaming(self) -> bool:
        """Whether this provider supports streaming synthesis via WebSocket."""
        ...

    @property
    def priority(self) -> int:
        """Routing priority. Lower = preferred. Default 50 (mid-range).
        Kokoro = 1, Chatterbox = 5, ElevenLabs = 10."""
        return 50

    @property
    def cost_tier(self) -> str:
        """Cost classification: 'economy', 'standard', or 'critical'."""
        return "standard"

    @property
    def status(self) -> ProviderStatus:
        """Current health status. Override if provider tracks internal state."""
        return ProviderStatus.HEALTHY

    @abstractmethod
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
        """Generate audio from text.

        Args:
            text: Text to synthesise (already validated for length).
            voice_id: Voice identifier from list_voices().
            language: BCP-47 language code.
            pace: Speaking rate multiplier (0.5–2.0).
            pitch: Pitch shift in semitones (-6 to +6).
            warmth: Warmth/brightness EQ (-6 to +6).

        Returns:
            TTSResult with audio bytes, timestamps, and cost metadata.

        Raises:
            ProviderError: If synthesis fails for any reason.
        """
        ...

    @abstractmethod
    async def list_voices(
        self,
        language: Optional[str] = None,
    ) -> list[VoiceInfoResult]:
        """List available voices, optionally filtered by language.

        Args:
            language: BCP-47 code to filter by. None = all voices.

        Returns:
            List of VoiceInfoResult describing available voices.
        """
        ...

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the provider is operational.

        Returns True if the provider can accept synthesis requests.
        Used by the registry's circuit breaker to exclude unhealthy providers.
        """
        ...

    async def estimate_cost(
        self,
        text_length: int,
    ) -> float:
        """Estimate infrastructure cost for synthesising text of given length.

        Default implementation uses a simple per-character model.
        Override for providers with different pricing models.

        Returns:
            Estimated cost in USD.
        """
        # Default: self-hosted GPU at ~$0.002 per 1000 chars
        return (text_length / 1000) * 0.002

    async def warmup(self) -> None:
        """Optional warmup routine. Called during service startup to
        pre-load models, pre-compile kernels, or establish connections.

        Default implementation does nothing. GPU providers should override
        to ensure models are loaded before the first request hits.
        """
        pass

    async def shutdown(self) -> None:
        """Optional cleanup routine. Called during service shutdown to
        release GPU memory, close connections, or flush caches."""
        pass


# =============================================================================
# Section 4: Abstract STT Provider
# =============================================================================

class STTProvider(ABC):
    """Abstract base class for Speech-to-Text providers.

    STT providers handle transcription, pronunciation assessment, and
    forced alignment. Not every provider supports all three — the
    supports_* properties declare capabilities, and the registry only
    routes requests to providers that declare the needed capability.
    """

    @property
    @abstractmethod
    def provider_id(self) -> str:
        """Unique identifier for this provider."""
        ...

    @property
    @abstractmethod
    def supported_languages(self) -> list[str]:
        """BCP-47 language codes this provider supports."""
        ...

    @property
    @abstractmethod
    def supports_streaming(self) -> bool:
        """Whether this provider supports streaming transcription."""
        ...

    @property
    @abstractmethod
    def supports_word_timestamps(self) -> bool:
        """Whether this provider produces word-level timestamps."""
        ...

    @property
    @abstractmethod
    def supports_phoneme_alignment(self) -> bool:
        """Whether this provider can produce phoneme-level alignment."""
        ...

    @property
    def priority(self) -> int:
        return 50

    @property
    def cost_tier(self) -> str:
        return "standard"

    @property
    def status(self) -> ProviderStatus:
        return ProviderStatus.HEALTHY

    @abstractmethod
    async def transcribe(
        self,
        audio: bytes,
        *,
        language: Optional[str] = None,
        word_timestamps: bool = True,
        **kwargs: Any,
    ) -> TranscriptionResult:
        """Transcribe audio to text with optional word timestamps.

        Args:
            audio: Raw audio bytes (WAV or MP3).
            language: Language hint. None = auto-detect.
            word_timestamps: Whether to include word-level timestamps.

        Returns:
            TranscriptionResult with text, segments, and metadata.
        """
        ...

    @abstractmethod
    async def assess_pronunciation(
        self,
        audio: bytes,
        expected_text: str,
        *,
        target_gpcs: Optional[list[str]] = None,
        language: str = "en-us",
        **kwargs: Any,
    ) -> PronunciationResult:
        """Assess pronunciation against expected text.

        Args:
            audio: Raw audio bytes of the learner's reading.
            expected_text: The text the learner was supposed to read.
            target_gpcs: GPCs to score separately (phonics focus).
            language: Language of the text.

        Returns:
            PronunciationResult with per-word and per-GPC scores.
        """
        ...

    async def align(
        self,
        audio: bytes,
        transcript: str,
        *,
        language: str = "en-us",
        **kwargs: Any,
    ) -> AlignmentResult:
        """Forced alignment: given audio and transcript, produce exact timestamps.

        Not all providers support this. Default raises NotImplementedError.
        WhisperX is the primary provider for forced alignment.
        """
        raise NotImplementedError(
            f"Provider {self.provider_id} does not support forced alignment"
        )

    @abstractmethod
    async def health_check(self) -> bool:
        """Check if the provider is operational."""
        ...

    async def warmup(self) -> None:
        """Optional warmup routine."""
        pass

    async def shutdown(self) -> None:
        """Optional cleanup routine."""
        pass


# =============================================================================
# Section 5: Provider Errors
# =============================================================================

class ProviderError(Exception):
    """Base exception for provider errors."""

    def __init__(
        self,
        message: str,
        provider_id: str = "unknown",
        *,
        retryable: bool = False,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.provider_id = provider_id
        self.retryable = retryable
        self.details = details or {}


class ProviderUnavailableError(ProviderError):
    """Provider is not available (model not loaded, service down)."""

    def __init__(self, provider_id: str, reason: str = "Provider unavailable"):
        super().__init__(reason, provider_id, retryable=True)


class ProviderOverloadedError(ProviderError):
    """Provider is overloaded (GPU queue full, rate limited)."""

    def __init__(self, provider_id: str, reason: str = "Provider overloaded"):
        super().__init__(reason, provider_id, retryable=True)


class ProviderValidationError(ProviderError):
    """Input validation failed at the provider level."""

    def __init__(self, provider_id: str, reason: str):
        super().__init__(reason, provider_id, retryable=False)


class NoProviderAvailableError(ProviderError):
    """No provider matched the routing criteria."""

    def __init__(self, capability: str, filters: dict[str, Any]):
        super().__init__(
            f"No provider available for capability '{capability}' with filters {filters}",
            provider_id="registry",
            retryable=False,
            details={"capability": capability, "filters": filters},
        )
