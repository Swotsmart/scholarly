# =============================================================================
# SCHOLARLY VOICE SERVICE — Configuration
# =============================================================================
# Pydantic Settings configuration that reads from environment variables.
# Every setting has a sensible default so the service can run standalone
# without any configuration — the "just works" principle. Think of this
# as the service's DNA: it defines every tunable parameter, from which
# TTS model to load to how loud the normalised audio should be.
#
# Environment variables follow the pattern: SVS_<SECTION>_<SETTING>
# (SVS = Scholarly Voice Service)
# =============================================================================

from __future__ import annotations

from enum import Enum
from pathlib import Path
from typing import Optional

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Environment(str, Enum):
    """Deployment environment. Controls logging verbosity, debug endpoints,
    and default storage backend selection."""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"


class StorageBackend(str, Enum):
    """Where generated audio files are persisted.
    - azure_blob: Production. Uses Azure Blob Storage containers.
    - local_fs: Development/standalone. Writes to a local directory.
    """
    AZURE_BLOB = "azure_blob"
    LOCAL_FS = "local_fs"


class CacheBackend(str, Enum):
    """Caching layer for voice listings, model metadata, and rate limiting.
    - redis: Production. Shared cache across replicas.
    - memory: Development/standalone. In-process LRU cache.
    """
    REDIS = "redis"
    MEMORY = "memory"


class LogLevel(str, Enum):
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"


class TTSSettings(BaseSettings):
    """Text-to-Speech configuration."""
    model_config = SettingsConfigDict(env_prefix="SVS_TTS_")

    # Primary TTS model. Kokoro is Apache 2.0, 82M params, 48 voices.
    kokoro_model_path: Path = Field(
        default=Path("/models/kokoro"),
        description="Path to Kokoro model weights. Baked into Docker image."
    )
    kokoro_device: str = Field(
        default="auto",
        description="Device for Kokoro inference: 'cuda', 'cpu', or 'auto' (prefer GPU)."
    )
    kokoro_default_voice: str = Field(
        default="af_heart",
        description="Default Kokoro voice ID when none specified."
    )
    default_sample_rate: int = Field(
        default=24000,
        description="Output sample rate in Hz. Kokoro native is 24kHz."
    )
    max_text_length: int = Field(
        default=10000,
        description="Maximum characters per synthesis request. Safety guardrail."
    )
    cache_voices: bool = Field(
        default=True,
        description="Cache voice listings to avoid re-enumerating on every request."
    )


class STTSettings(BaseSettings):
    """Speech-to-Text configuration. Activated in Sprint 29 Week 2."""
    model_config = SettingsConfigDict(env_prefix="SVS_STT_")

    whisper_model_size: str = Field(
        default="large-v3-turbo",
        description="Whisper model variant. 'large-v3-turbo' balances speed and accuracy."
    )
    whisper_model_path: Path = Field(
        default=Path("/models/whisper"),
        description="Path to faster-whisper model files."
    )
    whisper_device: str = Field(
        default="auto",
        description="Device for Whisper inference: 'cuda', 'cpu', or 'auto'."
    )
    whisper_compute_type: str = Field(
        default="float16",
        description="Compute type for faster-whisper. 'float16' for GPU, 'int8' for CPU."
    )
    max_audio_duration_seconds: int = Field(
        default=600,
        description="Maximum audio duration for transcription (10 minutes)."
    )
    default_language: Optional[str] = Field(
        default=None,
        description="Default language hint. None = auto-detect."
    )


class CloningSettings(BaseSettings):
    """Voice cloning configuration. Activated in Sprint 29 Week 4."""
    model_config = SettingsConfigDict(env_prefix="SVS_CLONING_")

    chatterbox_model_path: Path = Field(
        default=Path("/models/chatterbox"),
        description="Path to Chatterbox model weights."
    )
    chatterbox_device: str = Field(
        default="cuda",
        description="Device for Chatterbox. GPU required — cloning is unavailable on CPU."
    )
    min_sample_duration_seconds: float = Field(
        default=6.0,
        description="Minimum audio sample length for acceptable clone quality."
    )
    max_samples_per_profile: int = Field(
        default=10,
        description="Maximum audio samples per voice profile."
    )
    require_consent: bool = Field(
        default=True,
        description="Require a VoiceCloneConsent record before cloning. Never disable in production."
    )


class AudioProcessingSettings(BaseSettings):
    """Audio normalisation and studio processing defaults."""
    model_config = SettingsConfigDict(env_prefix="SVS_AUDIO_")

    # Normalisation pipeline defaults (Part 4.1 of architecture spec)
    target_lufs: float = Field(
        default=-16.0,
        description="Target loudness in LUFS (ITU-R BS.1770). -16 is broadcast standard."
    )
    noise_gate_threshold_db: float = Field(
        default=-40.0,
        description="Noise gate threshold in dB. Signals below this are silenced."
    )
    noise_gate_attack_ms: float = Field(default=5.0)
    noise_gate_release_ms: float = Field(default=50.0)
    spectral_denoise_reduction_db: float = Field(
        default=12.0,
        description="Spectral noise reduction strength in dB."
    )
    silence_trim_threshold_db: float = Field(
        default=-40.0,
        description="Threshold for leading/trailing silence detection."
    )
    silence_trim_pad_ms: float = Field(
        default=100.0,
        description="Padding added after trimming for natural breathing room."
    )
    peak_limiter_ceiling_dbfs: float = Field(
        default=-1.0,
        description="Peak limiter ceiling in dBFS. Prevents clipping."
    )

    # Post-generation adjustment ranges (Part 4.2)
    pace_min: float = Field(default=0.5, description="Minimum pace multiplier.")
    pace_max: float = Field(default=2.0, description="Maximum pace multiplier.")
    pitch_min_semitones: float = Field(default=-6.0, description="Minimum pitch shift.")
    pitch_max_semitones: float = Field(default=6.0, description="Maximum pitch shift.")
    warmth_min: float = Field(default=-6.0, description="Minimum warmth/brightness.")
    warmth_max: float = Field(default=6.0, description="Maximum warmth/brightness.")
    emphasis_pace_min: float = Field(
        default=0.6,
        description="Minimum emphasis pace for phonics-aware narration."
    )
    emphasis_pace_max: float = Field(default=1.0)
    emphasis_pace_default: float = Field(
        default=0.8,
        description="Default emphasis pace: target GPC words slowed to 0.8x."
    )


class StorageSettings(BaseSettings):
    """Audio file storage configuration."""
    model_config = SettingsConfigDict(env_prefix="SVS_STORAGE_")

    backend: StorageBackend = Field(
        default=StorageBackend.LOCAL_FS,
        description="Storage backend. Defaults to local filesystem for development."
    )

    # Azure Blob Storage settings (production)
    azure_connection_string: Optional[str] = Field(
        default=None,
        description="Azure Storage connection string. Required when backend=azure_blob."
    )
    azure_container_name: str = Field(
        default="voice-assets",
        description="Azure Blob container for generated audio files."
    )

    # Local filesystem settings (development)
    local_storage_path: Path = Field(
        default=Path("/data/voice-assets"),
        description="Local directory for audio file storage."
    )


class CacheSettings(BaseSettings):
    """Caching configuration."""
    model_config = SettingsConfigDict(env_prefix="SVS_CACHE_")

    backend: CacheBackend = Field(
        default=CacheBackend.MEMORY,
        description="Cache backend. Defaults to in-memory for development."
    )
    redis_url: Optional[str] = Field(
        default=None,
        description="Redis connection URL. Required when backend=redis."
    )
    default_ttl_seconds: int = Field(
        default=3600,
        description="Default cache TTL (1 hour)."
    )


class AuthSettings(BaseSettings):
    """Authentication configuration for JWT and API key validation."""
    model_config = SettingsConfigDict(env_prefix="SVS_AUTH_")

    jwt_secret: Optional[str] = Field(
        default=None,
        description="JWT signing secret for Scholarly platform tokens."
    )
    jwt_algorithm: str = Field(default="HS256")
    jwt_audience: str = Field(default="scholarly-voice-service")
    api_key_header: str = Field(
        default="X-API-Key",
        description="Header name for SDK/developer API key authentication."
    )
    enabled: bool = Field(
        default=False,
        description="Enable authentication. Disabled in development for easy testing."
    )


class WebhookSettings(BaseSettings):
    """Webhook event emission configuration."""
    model_config = SettingsConfigDict(env_prefix="SVS_WEBHOOK_")

    enabled: bool = Field(
        default=False,
        description="Enable webhook event emission. Disabled when running standalone."
    )
    target_url: Optional[str] = Field(
        default=None,
        description="URL to POST webhook events to (Scholarly API server)."
    )
    timeout_seconds: int = Field(default=10)
    max_retries: int = Field(default=3)


class ServerSettings(BaseSettings):
    """HTTP server configuration."""
    model_config = SettingsConfigDict(env_prefix="SVS_SERVER_")

    host: str = Field(default="0.0.0.0")
    port: int = Field(default=8100)
    workers: int = Field(
        default=4,
        description="Uvicorn worker count. GPU ops are serialised per-model regardless."
    )
    reload: bool = Field(
        default=False,
        description="Enable hot reload. Only for development."
    )
    cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://localhost:3001"],
        description="Allowed CORS origins. Add production domain in deployment."
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list[str]) -> list[str]:
        """Accept comma-separated string from env var or list from code."""
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v


class Settings(BaseSettings):
    """Root configuration aggregating all sub-configurations.

    Every sub-config reads its own SVS_<SECTION>_* environment variables,
    while root-level settings use the SVS_ prefix directly. This gives us
    clean namespacing without a monolithic env var list.

    Example environment:
        SVS_ENVIRONMENT=production
        SVS_TTS_KOKORO_DEVICE=cuda
        SVS_STORAGE_BACKEND=azure_blob
        SVS_STORAGE_AZURE_CONNECTION_STRING=DefaultEndpointsProtocol=...
        SVS_CACHE_BACKEND=redis
        SVS_CACHE_REDIS_URL=redis://scholarly-redis:6379/1
        SVS_AUTH_ENABLED=true
        SVS_AUTH_JWT_SECRET=<from-key-vault>
    """
    model_config = SettingsConfigDict(
        env_prefix="SVS_",
        env_nested_delimiter="__",
        case_sensitive=False,
    )

    environment: Environment = Field(
        default=Environment.DEVELOPMENT,
        description="Deployment environment."
    )
    log_level: LogLevel = Field(
        default=LogLevel.INFO,
        description="Logging level."
    )
    service_name: str = Field(
        default="scholarly-voice-service",
        description="Service name for logging and metrics."
    )
    version: str = Field(
        default="0.1.0",
        description="Service version. Updated on release."
    )

    # Sub-configurations
    tts: TTSSettings = Field(default_factory=TTSSettings)
    stt: STTSettings = Field(default_factory=STTSettings)
    cloning: CloningSettings = Field(default_factory=CloningSettings)
    audio: AudioProcessingSettings = Field(default_factory=AudioProcessingSettings)
    storage: StorageSettings = Field(default_factory=StorageSettings)
    cache: CacheSettings = Field(default_factory=CacheSettings)
    auth: AuthSettings = Field(default_factory=AuthSettings)
    webhook: WebhookSettings = Field(default_factory=WebhookSettings)
    server: ServerSettings = Field(default_factory=ServerSettings)

    @property
    def is_production(self) -> bool:
        return self.environment == Environment.PRODUCTION

    @property
    def is_development(self) -> bool:
        return self.environment == Environment.DEVELOPMENT

    @property
    def debug(self) -> bool:
        return self.log_level == LogLevel.DEBUG
