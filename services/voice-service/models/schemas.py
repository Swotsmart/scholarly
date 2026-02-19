# =============================================================================
# SCHOLARLY VOICE SERVICE — Pydantic Request/Response Models
# =============================================================================
# These models define the API contract. Every request body, response body,
# and error shape is defined here as a Pydantic model. This is the "single
# source of truth" for what the API accepts and returns — FastAPI uses these
# to generate OpenAPI docs, validate requests, and serialise responses.
#
# Think of these as the blueprints that both the builder (our code) and the
# inspector (the SDK/developer) agree on. If a field is here, it exists in
# the API. If it isn't, it doesn't.
# =============================================================================

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Section 1: Enumerations
# =============================================================================

class VoiceGender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    NEUTRAL = "neutral"


class VoiceStyle(str, Enum):
    WARM = "warm"
    BRIGHT = "bright"
    NEUTRAL = "neutral"
    CALM = "calm"
    ENERGETIC = "energetic"


class AudioFormat(str, Enum):
    WAV = "wav"
    MP3 = "mp3"
    OGG = "ogg"
    FLAC = "flac"


class ProcessingJobType(str, Enum):
    NARRATE_BOOK = "narrate-book"
    BATCH_VARIANT = "batch-variant"
    CLONE_PROFILE = "clone-profile"


class ProcessingJobStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETE = "complete"
    FAILED = "failed"


class VoiceProfileStatus(str, Enum):
    CREATING = "creating"
    READY = "ready"
    FAILED = "failed"
    ARCHIVED = "archived"


class ProviderName(str, Enum):
    """Available TTS/STT providers. Maps to concrete provider implementations."""
    KOKORO = "kokoro"
    CHATTERBOX = "chatterbox"
    WHISPER = "whisper"
    WHISPERX = "whisperx"


class CostTier(str, Enum):
    """Cost tier for provider routing. Lower tiers use cheaper compute paths."""
    ECONOMY = "economy"     # CPU-only, self-hosted
    STANDARD = "standard"   # GPU, self-hosted (default)
    CRITICAL = "critical"   # GPU-priority tier (lowest latency)


# =============================================================================
# Section 2: Shared Sub-Models
# =============================================================================

class WordTimestamp(BaseModel):
    """A single word with its time boundaries in the audio stream.
    This is the fundamental unit for karaoke-style highlighting
    and phonics-aware emphasis mapping."""
    word: str
    start: float = Field(description="Start time in seconds")
    end: float = Field(description="End time in seconds")
    confidence: Optional[float] = Field(
        default=None,
        description="Confidence score (0.0–1.0). Available from STT, not from TTS."
    )


class CostEstimate(BaseModel):
    """Cost metadata returned with every request. Enables schools to see
    exactly what voice services cost them — the cost-transparent principle."""
    provider: str = Field(description="Provider that handled the request")
    compute_seconds: float = Field(description="GPU/CPU seconds consumed")
    estimated_cost_usd: float = Field(description="Estimated infrastructure cost in USD")
    model: str = Field(description="Model variant used")
    characters_processed: Optional[int] = Field(
        default=None, description="Characters synthesised (TTS)"
    )
    audio_seconds_processed: Optional[float] = Field(
        default=None, description="Audio seconds processed (STT)"
    )


class AudioQualityReport(BaseModel):
    """Quality metrics for an audio recording. Returned by the /studio/analyse
    endpoint to give teachers feedback on their recordings."""
    loudness_lufs: float = Field(description="Integrated loudness in LUFS")
    peak_dbfs: float = Field(description="Peak level in dBFS")
    snr_db: float = Field(description="Signal-to-noise ratio in dB")
    pace_wpm: Optional[float] = Field(
        default=None, description="Speaking pace in words per minute"
    )
    pitch_hz_mean: Optional[float] = Field(
        default=None, description="Mean fundamental frequency in Hz"
    )
    pitch_hz_range: Optional[tuple[float, float]] = Field(
        default=None, description="Pitch range (min, max) in Hz"
    )
    silence_ratio: float = Field(
        description="Ratio of silence to total duration (0.0–1.0)"
    )
    duration_seconds: float = Field(description="Total audio duration")
    sample_rate: int = Field(description="Sample rate in Hz")
    channels: int = Field(description="Number of audio channels")


# =============================================================================
# Section 3: TTS Request/Response Models
# =============================================================================

class SynthesizeRequest(BaseModel):
    """Request body for POST /api/v1/tts/synthesize.
    Generate speech from text with optional voice, language, and adjustment parameters."""
    text: str = Field(
        min_length=1,
        max_length=10000,
        description="Text to synthesize. Maximum 10,000 characters."
    )
    voice_id: Optional[str] = Field(
        default=None,
        description="Voice ID. Defaults to the configured default voice."
    )
    language: str = Field(
        default="en-us",
        description="Language code (BCP-47). Determines pronunciation rules."
    )
    pace: float = Field(
        default=1.0,
        ge=0.5,
        le=2.0,
        description="Speaking pace multiplier. 0.5 = half speed, 2.0 = double speed."
    )
    pitch: float = Field(
        default=0.0,
        ge=-6.0,
        le=6.0,
        description="Pitch shift in semitones. Negative = lower, positive = higher."
    )
    warmth: float = Field(
        default=0.0,
        ge=-6.0,
        le=6.0,
        description="Warmth/brightness EQ. Negative = brighter, positive = warmer."
    )
    output_format: AudioFormat = Field(
        default=AudioFormat.WAV,
        description="Output audio format."
    )
    normalise: bool = Field(
        default=True,
        description="Apply normalisation pipeline to output."
    )
    provider: Optional[ProviderName] = Field(
        default=None,
        description="Force a specific provider. None = auto-route via registry."
    )
    cost_tier: CostTier = Field(
        default=CostTier.STANDARD,
        description="Cost tier for provider routing."
    )


class SynthesizeResponse(BaseModel):
    """Response body for POST /api/v1/tts/synthesize."""
    audio_url: Optional[str] = Field(
        default=None,
        description="URL to download the generated audio file."
    )
    audio_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded audio data (for inline responses)."
    )
    duration_seconds: float = Field(description="Audio duration in seconds")
    sample_rate: int = Field(description="Sample rate in Hz")
    format: AudioFormat = Field(description="Audio format")
    word_timestamps: list[WordTimestamp] = Field(
        default_factory=list,
        description="Word-level timestamps for karaoke sync."
    )
    cost: CostEstimate = Field(description="Cost metadata for this request")


class NarratePageRequest(BaseModel):
    """Request body for POST /api/v1/tts/narrate-page.
    Curriculum-aware narration: accepts target GPCs for per-word pace emphasis."""
    text: str = Field(
        min_length=1,
        max_length=5000,
        description="Page text to narrate."
    )
    voice_id: Optional[str] = Field(default=None)
    language: str = Field(default="en-us")
    target_gpcs: list[str] = Field(
        default_factory=list,
        description="Target grapheme-phoneme correspondences for emphasis. "
                    "Words containing these GPCs will be slowed to emphasis_pace."
    )
    emphasis_pace: float = Field(
        default=0.8,
        ge=0.6,
        le=1.0,
        description="Pace multiplier for words containing target GPCs."
    )
    base_pace: float = Field(
        default=1.0,
        ge=0.5,
        le=2.0,
        description="Base pace for non-target words."
    )
    output_format: AudioFormat = Field(default=AudioFormat.WAV)


class NarrateBookRequest(BaseModel):
    """Request body for POST /api/v1/tts/narrate-book.
    Batch narrate an entire storybook (8–24 pages). Pages run concurrently."""
    pages: list[NarratePageRequest] = Field(
        min_length=1,
        max_length=30,
        description="Pages to narrate. Each page is processed independently."
    )
    voice_id: Optional[str] = Field(
        default=None,
        description="Voice ID applied to all pages for consistency."
    )
    language: str = Field(default="en-us")
    output_format: AudioFormat = Field(default=AudioFormat.WAV)


class NarrateBookResponse(BaseModel):
    """Response body for POST /api/v1/tts/narrate-book."""
    job_id: Optional[str] = Field(
        default=None,
        description="Processing job ID for async tracking (if async)."
    )
    pages: list[SynthesizeResponse] = Field(
        default_factory=list,
        description="Per-page synthesis results (if sync)."
    )
    total_duration_seconds: float = Field(description="Combined duration of all pages")
    total_cost: CostEstimate = Field(description="Aggregated cost across all pages")


class VoiceInfo(BaseModel):
    """Information about an available voice."""
    voice_id: str = Field(description="Unique voice identifier")
    name: str = Field(description="Human-readable voice name")
    language: str = Field(description="Primary language code")
    gender: VoiceGender = Field(description="Voice gender")
    style: VoiceStyle = Field(description="Voice style category")
    provider: ProviderName = Field(description="Provider offering this voice")
    is_cloned: bool = Field(
        default=False, description="Whether this is a cloned voice profile"
    )
    preview_url: Optional[str] = Field(
        default=None, description="URL to a short audio preview"
    )
    supported_languages: list[str] = Field(
        default_factory=list,
        description="All languages this voice supports"
    )


class VoiceListResponse(BaseModel):
    """Response body for GET /api/v1/tts/voices."""
    voices: list[VoiceInfo] = Field(description="Available voices")
    total: int = Field(description="Total voice count")


class CostEstimateRequest(BaseModel):
    """Request body for POST /api/v1/tts/estimate-cost."""
    text_length: int = Field(
        ge=1, description="Character count to estimate cost for"
    )
    provider: Optional[ProviderName] = Field(default=None)
    cost_tier: CostTier = Field(default=CostTier.STANDARD)


# =============================================================================
# Section 4: STT Request/Response Models (Sprint 29 Week 2)
# =============================================================================

class TranscribeRequest(BaseModel):
    """Request body for POST /api/v1/stt/transcribe."""
    language: Optional[str] = Field(
        default=None,
        description="Language hint (BCP-47). None = auto-detect."
    )
    word_timestamps: bool = Field(
        default=True,
        description="Include word-level timestamps in response."
    )
    provider: Optional[ProviderName] = Field(default=None)
    # Audio is sent as multipart/form-data, not in the JSON body


class TranscriptionSegment(BaseModel):
    """A segment of transcribed text with timestamps."""
    text: str
    start: float
    end: float
    words: list[WordTimestamp] = Field(default_factory=list)


class TranscribeResponse(BaseModel):
    """Response body for POST /api/v1/stt/transcribe."""
    text: str = Field(description="Full transcribed text")
    language: str = Field(description="Detected or confirmed language")
    segments: list[TranscriptionSegment] = Field(
        description="Timestamped segments"
    )
    duration_seconds: float = Field(description="Audio duration processed")
    cost: CostEstimate


class PronunciationScore(BaseModel):
    """Per-word pronunciation assessment score."""
    word: str
    expected: str
    score: float = Field(ge=0.0, le=1.0, description="Pronunciation accuracy (0–1)")
    phonemes: list[dict[str, Any]] = Field(
        default_factory=list,
        description="Per-phoneme scores (when available from WhisperX)"
    )
    contains_target_gpc: bool = Field(
        default=False,
        description="Whether this word contains a target GPC"
    )


class PronunciationAssessmentRequest(BaseModel):
    """Request body for POST /api/v1/stt/assess-pronunciation."""
    expected_text: str = Field(description="The text the learner was supposed to read")
    target_gpcs: list[str] = Field(
        default_factory=list,
        description="Target GPCs for focused scoring"
    )
    language: str = Field(default="en-us")
    # Audio is sent as multipart/form-data


class PronunciationAssessmentResponse(BaseModel):
    """Response body for POST /api/v1/stt/assess-pronunciation."""
    overall_score: float = Field(
        ge=0.0, le=1.0, description="Overall pronunciation accuracy"
    )
    words: list[PronunciationScore] = Field(description="Per-word scores")
    gpc_scores: dict[str, float] = Field(
        default_factory=dict,
        description="Accuracy score per target GPC"
    )
    fluency_wpm: float = Field(description="Words correct per minute")
    duration_seconds: float
    cost: CostEstimate


# =============================================================================
# Section 5: Studio Processing Models
# =============================================================================

class AdjustRequest(BaseModel):
    """Request body for POST /api/v1/studio/adjust.
    Post-generation adjustment with independent pace/pitch/warmth controls."""
    audio_url: Optional[str] = Field(
        default=None,
        description="URL of audio to adjust (mutually exclusive with audio_base64)."
    )
    audio_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded audio data."
    )
    pace: float = Field(
        default=1.0, ge=0.5, le=2.0,
        description="Pace multiplier. Changes duration without affecting pitch."
    )
    pitch: float = Field(
        default=0.0, ge=-6.0, le=6.0,
        description="Pitch shift in semitones. Changes frequency without affecting duration."
    )
    warmth: float = Field(
        default=0.0, ge=-6.0, le=6.0,
        description="Warmth/brightness EQ. Positive = warmer, negative = brighter."
    )
    output_format: AudioFormat = Field(default=AudioFormat.WAV)

    @field_validator("audio_url", "audio_base64")
    @classmethod
    def check_audio_source(cls, v: Optional[str], info: Any) -> Optional[str]:
        """At least one audio source must be provided (validated at route level)."""
        return v


class AdjustResponse(BaseModel):
    """Response body for POST /api/v1/studio/adjust."""
    audio_url: Optional[str] = Field(default=None)
    audio_base64: Optional[str] = Field(default=None)
    duration_seconds: float
    word_timestamps: list[WordTimestamp] = Field(
        default_factory=list,
        description="Recalculated timestamps after adjustment."
    )
    adjustments_applied: dict[str, float] = Field(
        description="Map of adjustment name to value applied"
    )
    cost: CostEstimate


class NormaliseRequest(BaseModel):
    """Request body for POST /api/v1/studio/normalise."""
    audio_base64: Optional[str] = Field(default=None)
    audio_url: Optional[str] = Field(default=None)
    target_lufs: float = Field(default=-16.0, description="Target loudness")
    denoise: bool = Field(default=True, description="Apply spectral denoising")
    trim_silence: bool = Field(default=True, description="Trim leading/trailing silence")
    output_format: AudioFormat = Field(default=AudioFormat.WAV)


class NormaliseResponse(BaseModel):
    """Response body for POST /api/v1/studio/normalise."""
    audio_url: Optional[str] = Field(default=None)
    audio_base64: Optional[str] = Field(default=None)
    quality_before: AudioQualityReport
    quality_after: AudioQualityReport
    cost: CostEstimate


class PhonicsNarrateRequest(BaseModel):
    """Request body for POST /api/v1/studio/phonics-pace.
    The capability that could not exist outside Scholarly: curriculum-aware narration
    where target GPC words are naturally emphasised through pace variation."""
    audio_url: Optional[str] = Field(default=None)
    audio_base64: Optional[str] = Field(default=None)
    word_timestamps: list[WordTimestamp] = Field(
        description="Existing word timestamps for the audio"
    )
    target_gpcs: list[str] = Field(
        description="GPCs to emphasise (e.g., ['sh', 'ch', 'th'])"
    )
    emphasis_pace: float = Field(
        default=0.8, ge=0.6, le=1.0,
        description="Pace for target words (0.8 = slightly slower)"
    )


class VariantSpec(BaseModel):
    """A single variant specification for batch variant generation."""
    name: str = Field(description="Variant name (e.g., 'Beginner', 'Fluent')")
    pace: float = Field(ge=0.5, le=2.0)
    pitch: float = Field(default=0.0, ge=-6.0, le=6.0)
    warmth: float = Field(default=0.0, ge=-6.0, le=6.0)


class VariantsRequest(BaseModel):
    """Request body for POST /api/v1/studio/variants."""
    audio_url: Optional[str] = Field(default=None)
    audio_base64: Optional[str] = Field(default=None)
    variants: list[VariantSpec] = Field(
        min_length=1, max_length=5,
        description="Variant specifications to generate"
    )
    output_format: AudioFormat = Field(default=AudioFormat.WAV)


class VariantResult(BaseModel):
    """A single generated variant."""
    name: str
    audio_url: Optional[str] = Field(default=None)
    audio_base64: Optional[str] = Field(default=None)
    duration_seconds: float
    word_timestamps: list[WordTimestamp] = Field(default_factory=list)


class VariantsResponse(BaseModel):
    """Response body for POST /api/v1/studio/variants."""
    variants: list[VariantResult]
    total_cost: CostEstimate


# =============================================================================
# Section 6: Voice Cloning Models (Sprint 29 Week 4)
# =============================================================================

class CreateVoiceProfileRequest(BaseModel):
    """Request body for POST /api/v1/cloning/profiles.
    Audio samples are sent as multipart/form-data alongside this JSON."""
    name: str = Field(min_length=1, max_length=100, description="Profile display name")
    language: str = Field(default="en-us", description="Primary language of the voice")
    consent_id: str = Field(description="ID of the VoiceCloneConsent record")
    description: Optional[str] = Field(default=None, max_length=500)


class VoiceProfileResponse(BaseModel):
    """Response body for voice profile endpoints."""
    id: str
    tenant_id: str
    owner_id: str
    name: str
    language: str
    provider: ProviderName
    status: VoiceProfileStatus
    quality_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    sample_count: int
    verified_languages: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ConsentRequest(BaseModel):
    """Request body for POST /api/v1/cloning/consent."""
    voice_owner_id: str = Field(description="User ID of the person whose voice is being cloned")
    purpose: str = Field(description="Stated purpose of the voice clone")
    granted_by: str = Field(description="User ID of the person granting consent")
    expires_at: Optional[datetime] = Field(
        default=None, description="Consent expiry date"
    )


class ConsentResponse(BaseModel):
    """Response body for POST /api/v1/cloning/consent."""
    id: str
    voice_owner_id: str
    purpose: str
    granted_by: str
    granted_at: datetime
    expires_at: Optional[datetime]
    revoked: bool = Field(default=False)


# =============================================================================
# Section 7: Health & Error Models
# =============================================================================

class HealthResponse(BaseModel):
    """Response body for GET /healthz and GET /readyz."""
    status: str = Field(description="'healthy' or 'unhealthy'")
    service: str = Field(description="Service name")
    version: str = Field(description="Service version")
    uptime_seconds: float
    checks: dict[str, bool] = Field(
        default_factory=dict,
        description="Individual health check results (models loaded, storage accessible, etc.)"
    )


class ModelInfo(BaseModel):
    """Information about a loaded ML model."""
    name: str
    provider: ProviderName
    status: str = Field(description="'loaded', 'loading', 'unavailable'")
    vram_mb: Optional[float] = Field(default=None, description="VRAM usage in MB")
    supported_languages: list[str] = Field(default_factory=list)
    device: str = Field(description="Device the model is loaded on")


class ModelsResponse(BaseModel):
    """Response body for GET /api/v1/models."""
    models: list[ModelInfo]
    gpu_available: bool
    gpu_name: Optional[str] = Field(default=None)
    total_vram_mb: Optional[float] = Field(default=None)
    used_vram_mb: Optional[float] = Field(default=None)


class ErrorResponse(BaseModel):
    """Standard error response shape. Consistent across all endpoints,
    matching the Scholarly API error format."""
    error: str = Field(description="Error code (e.g., 'VALIDATION_ERROR')")
    message: str = Field(description="Human-readable error message")
    details: Optional[dict[str, Any]] = Field(
        default=None, description="Additional error context"
    )
    request_id: Optional[str] = Field(
        default=None, description="Request trace ID for debugging"
    )
