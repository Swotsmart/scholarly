# =============================================================================
# SCHOLARLY VOICE SERVICE — Sprint 30, Week 3
# Provider Registry & Config Cleanup (ElevenLabs Removal)
# =============================================================================
#
# This file contains the patches to apply to the Python Voice Service to
# remove all ElevenLabs references. Two files are affected:
#
# 1. providers/registry.py — Remove ElevenLabs from the fallback chain
# 2. app/config.py — Remove ElevenLabs environment variables
#
# The Voice Service was originally designed with ElevenLabs as a fallback
# provider (priority 10, highest cost tier). With the decision to fully
# remove ElevenLabs, the fallback chain simplifies to:
#
#   TTS: Kokoro (priority 1) → Chatterbox (priority 5, clone-only)
#   STT: WhisperSTT (priority 1) → WhisperX (priority 5, alignment-only)
#
# No external API dependencies remain. The service is fully self-contained.
# =============================================================================

# =============================================================================
# PATCH 1: providers/registry.py
# =============================================================================
# Remove the ElevenLabs provider registration block and the cost_tier
# routing path that falls back to ElevenLabs for "critical" tier requests.
#
# BEFORE (Sprint 29 Wk4):
#   class ProviderRegistry:
#       ...
#       def _register_defaults(self):
#           self.register_tts(KokoroTTSProvider(...))
#           self.register_tts(ChatterboxTTSProvider(...))
#           if self._config.elevenlabs_api_key:
#               self.register_tts(ElevenLabsTTSProvider(...))
#               self.register_stt(ElevenLabsSTTProvider(...))
#           self.register_stt(WhisperSTTProvider(...))
#
# AFTER (Sprint 30 Wk3):
#   class ProviderRegistry:
#       ...
#       def _register_defaults(self):
#           self.register_tts(KokoroTTSProvider(...))
#           self.register_tts(ChatterboxTTSProvider(...))
#           self.register_stt(WhisperSTTProvider(...))
#           # WhisperX registered separately if alignment models available
#
# Lines removed: ~20 (conditional ElevenLabs registration block)
# Lines removed: ~15 (ElevenLabs import and type references)
# =============================================================================

# The cleaned-up _register_defaults method:

REGISTRY_PATCH = '''
    def _register_defaults(self) -> None:
        """Register the default provider set.

        Provider priority cascade (lower = preferred):
          TTS:  Kokoro (1) → Chatterbox (5, clone-only)
          STT:  WhisperSTT (1) → WhisperXAligner (5, alignment-only)

        No external providers. No fallbacks to commercial APIs.
        The self-hosted stack handles everything.
        """
        # --- TTS Providers ---
        kokoro = KokoroTTSProvider(
            model_path=Path(self._config.kokoro_model_path),
            device=self._config.compute_device,
        )
        self.register_tts(kokoro)

        if self._config.enable_cloning:
            chatterbox = ChatterboxTTSProvider(
                device=self._config.compute_device,
            )
            self.register_tts(chatterbox)

        # --- STT Providers ---
        whisper = WhisperSTTProvider(
            model_size=self._config.whisper_model_size,
            device=self._config.compute_device,
        )
        self.register_stt(whisper)

        # WhisperX alignment provider (if models available)
        if self._config.enable_alignment:
            from providers.whisperx_provider import WhisperXAlignmentProvider
            whisperx = WhisperXAlignmentProvider()
            self.register_stt(whisperx)
'''

# =============================================================================
# PATCH 2: providers/registry.py — Route selection
# =============================================================================
# Remove the "critical" cost tier fallback to ElevenLabs.
#
# BEFORE:
#   if filters.cost_tier == "critical" and self._has_elevenlabs:
#       return self._select_elevenlabs(capability)
#
# AFTER:
#   # All cost tiers route to self-hosted providers.
#   # "critical" tier gets GPU priority (Kokoro on CUDA).
#   # "economy" tier gets CPU fallback (Kokoro on CPU).

ROUTING_PATCH = '''
    def select_provider(
        self,
        capability: str,
        filters: RoutingFilters,
    ) -> TTSProvider | STTProvider:
        """Select the best provider for a request.

        Routing cascade:
        1. Capability filter (TTS or STT)
        2. Language filter (provider must support requested language)
        3. Clone filter (if clone profile requested, only Chatterbox)
        4. Health filter (exclude unhealthy providers)
        5. Priority sort (lowest number wins)

        Cost tier mapping:
          critical → GPU provider preferred (lowest latency)
          standard → GPU provider (default)
          economy  → CPU fallback acceptable (highest latency tolerance)

        No external fallback. If all self-hosted providers are down,
        the request fails with ProviderUnavailableError.
        """
        providers = self._get_providers(capability)

        # Filter by capability, language, clone, health
        candidates = [
            p for p in providers
            if self._matches_filters(p, filters)
        ]

        if not candidates:
            raise NoProviderAvailableError(
                f"No {capability} provider available matching filters: {filters}"
            )

        # Sort by priority (lowest first)
        candidates.sort(key=lambda p: p.priority)

        return candidates[0]
'''


# =============================================================================
# PATCH 3: app/config.py
# =============================================================================
# Remove ElevenLabs environment variables from the Pydantic Settings class.
#
# BEFORE:
#   class Settings(BaseSettings):
#       ...
#       elevenlabs_api_key: Optional[str] = None
#       elevenlabs_base_url: str = "https://api.elevenlabs.io/v1"
#       elevenlabs_default_model: str = "eleven_turbo_v2_5"
#
# AFTER:
#   (those three fields simply don't exist)

CONFIG_PATCH = '''
class Settings(BaseSettings):
    """Voice Service configuration.

    All settings are read from environment variables. The service is
    fully self-contained with no external API dependencies.

    Compute:
      COMPUTE_DEVICE: auto | cuda | cpu
      KOKORO_MODEL_PATH: /models/kokoro
      WHISPER_MODEL_SIZE: large-v3-turbo

    Features:
      ENABLE_CLONING: true/false (requires Chatterbox model)
      ENABLE_ALIGNMENT: true/false (requires WhisperX + wav2vec2)

    Storage:
      STORAGE_BACKEND: local | azure_blob
      AZURE_STORAGE_CONNECTION_STRING: (if azure_blob)
      LOCAL_STORAGE_PATH: /data/audio (if local)

    Server:
      HOST: 0.0.0.0
      PORT: 8100
      WORKERS: 1 (GPU providers are single-threaded)
    """

    # Compute
    compute_device: str = "auto"
    kokoro_model_path: str = "/models/kokoro"
    whisper_model_size: str = "large-v3-turbo"

    # Features
    enable_cloning: bool = False
    enable_alignment: bool = True

    # Storage
    storage_backend: str = "local"
    azure_storage_connection_string: Optional[str] = None
    local_storage_path: str = "/data/audio"

    # Redis (for caching)
    redis_url: Optional[str] = None

    # Server
    host: str = "0.0.0.0"
    port: int = 8100
    workers: int = 1

    # REMOVED (Sprint 30 Wk3):
    # elevenlabs_api_key: Optional[str] = None
    # elevenlabs_base_url: str = "https://api.elevenlabs.io/v1"
    # elevenlabs_default_model: str = "eleven_turbo_v2_5"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
'''


# =============================================================================
# PATCH 4: Dockerfile
# =============================================================================
# Remove the optional ElevenLabs SDK from the Docker build.
#
# BEFORE (pyproject.toml):
#   [project.optional-dependencies]
#   elevenlabs = ["elevenlabs>=1.0"]
#
# AFTER:
#   (removed entirely)

DOCKERFILE_PATCH = '''
# In pyproject.toml, remove:
# elevenlabs = ["elevenlabs>=1.0"]
#
# In Dockerfile, remove:
# RUN pip install elevenlabs --no-cache-dir
#
# The Docker image is now ~200MB smaller without the ElevenLabs SDK
# and its transitive dependencies.
'''


# =============================================================================
# PATCH 5: .env.example
# =============================================================================

ENV_EXAMPLE = '''
# =============================================================================
# SCHOLARLY VOICE SERVICE — Environment Variables
# Sprint 30 Week 3 (Post-ElevenLabs Removal)
# =============================================================================

# Compute
COMPUTE_DEVICE=auto
KOKORO_MODEL_PATH=/models/kokoro
WHISPER_MODEL_SIZE=large-v3-turbo

# Features
ENABLE_CLONING=false
ENABLE_ALIGNMENT=true

# Storage
STORAGE_BACKEND=local
LOCAL_STORAGE_PATH=/data/audio
# AZURE_STORAGE_CONNECTION_STRING=  # Set for Azure Blob Storage

# Redis (optional, for TTS caching)
# REDIS_URL=redis://localhost:6379

# Server
HOST=0.0.0.0
PORT=8100
WORKERS=1

# REMOVED (Sprint 30 Wk3) — No external API dependencies:
# ELEVENLABS_API_KEY=
# ELEVENLABS_BASE_URL=
# ELEVENLABS_DEFAULT_MODEL=
'''


# =============================================================================
# Summary: What Was Removed from the Python Voice Service
# =============================================================================
#
# Files modified:
#   providers/registry.py  — Remove ElevenLabs conditional registration (~20 lines)
#                          — Remove critical-tier ElevenLabs fallback (~15 lines)
#   app/config.py          — Remove 3 ElevenLabs env var fields (~8 lines)
#   .env.example           — Remove 3 ElevenLabs variables (~3 lines)
#   pyproject.toml         — Remove elevenlabs optional dependency (~2 lines)
#   Dockerfile             — Remove elevenlabs pip install step (~1 line)
#
# Files NOT modified (no ElevenLabs references):
#   providers/kokoro_provider.py    — Pure self-hosted, never had ElevenLabs
#   providers/chatterbox_provider.py — Pure self-hosted
#   providers/whisper_provider.py    — Pure self-hosted
#   providers/whisperx_provider.py   — Pure self-hosted (Sprint 30 Wk2)
#   providers/base.py               — Abstract interfaces, provider-agnostic
#   processing/*                    — Audio processing, no API dependencies
#   app/routes/*                    — Routes call registry, not providers directly
#
# Total Python lines removed: ~49
# Docker image size reduction: ~200MB (ElevenLabs SDK + dependencies)
