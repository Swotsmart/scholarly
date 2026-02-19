# =============================================================================
# SCHOLARLY VOICE SERVICE — Dependency Injection Container
# =============================================================================
# The DI container is the service's assembly line. It reads the configuration,
# constructs the right implementations (Kokoro or Chatterbox? Azure Blob or
# local filesystem? Redis or in-memory?), wires them together, and hands
# the fully assembled components to the FastAPI route handlers.
#
# Think of it as the backstage crew at a theatre: the audience (API consumers)
# sees the performance (the API), but the crew ensures every prop (provider),
# set piece (storage), and lighting rig (cache) is in the right place before
# the curtain goes up.
#
# FastAPI's Depends() system injects these components into route handlers:
#   async def synthesize(registry: ProviderRegistry = Depends(get_registry)):
# =============================================================================

from __future__ import annotations

import logging
from functools import lru_cache
from pathlib import Path
from typing import AsyncGenerator

from app.config import CacheBackend, Settings, StorageBackend
from providers.kokoro_provider import KokoroTTSProvider
from providers.registry import ProviderRegistry

# Cloning imports — guarded because chatterbox-tts is an optional dependency
try:
    from cloning.consent import ConsentManager
    from cloning.profile_manager import ProfileManager
    from cloning.clone_engine import CloneEngine
    from providers.chatterbox_provider import ChatterboxTTSProvider
    _CLONING_AVAILABLE = True
except ImportError:
    _CLONING_AVAILABLE = False

logger = logging.getLogger(__name__)


# =============================================================================
# Section 1: Settings Singleton
# =============================================================================
# Pydantic Settings reads environment variables on first access.
# We cache the result so every part of the service sees the same config.

@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the application settings singleton.

    Uses @lru_cache to ensure environment variables are read exactly once.
    In tests, use get_settings.cache_clear() then override.
    """
    settings = Settings()
    logger.info(
        "Settings loaded: env=%s, log=%s, tts_device=%s, storage=%s, cache=%s",
        settings.environment.value,
        settings.log_level.value,
        settings.tts.kokoro_device,
        settings.storage.backend.value,
        settings.cache.backend.value,
    )
    return settings


# =============================================================================
# Section 2: Provider Registry
# =============================================================================
# The registry is created once at startup and shared across all requests.
# It holds references to all TTS and STT providers, manages their lifecycle,
# and routes requests through the priority cascade.

_registry: ProviderRegistry | None = None


async def create_registry(settings: Settings) -> ProviderRegistry:
    """Create and populate the provider registry based on configuration.

    This is called once during the application lifespan startup. It:
    1. Creates the registry
    2. Registers providers based on what's available/configured
    3. Warms up all providers (loads models)
    4. Returns the ready-to-use registry
    """
    global _registry
    registry = ProviderRegistry()

    # --- Kokoro TTS (always registered, primary provider) ---
    kokoro = KokoroTTSProvider(
        model_path=settings.tts.kokoro_model_path,
        device=settings.tts.kokoro_device,
        default_voice=settings.tts.kokoro_default_voice,
        sample_rate=settings.tts.default_sample_rate,
    )
    registry.register_tts(kokoro, enabled=True)

    # --- Whisper STT (registered if faster-whisper is installed) ---
    try:
        from providers.whisper_provider import WhisperSTTProvider
        whisper = WhisperSTTProvider(
            model_size=settings.stt.whisper_model_size,
            model_path=settings.stt.whisper_model_path,
            device=settings.stt.whisper_device,
            compute_type=settings.stt.whisper_compute_type,
            max_audio_duration=settings.stt.max_audio_duration_seconds,
        )
        registry.register_stt(whisper, enabled=True)
    except ImportError:
        logger.info("faster-whisper not installed — STT provider skipped")

    # --- No external providers ---
    # The self-hosted stack handles all TTS/STT.
    # ElevenLabs was removed in Sprint 30 Week 3.

    # --- Warm up all providers (load models) ---
    warmup_results = await registry.warmup_all()
    for provider_id, success in warmup_results.items():
        if not success:
            logger.warning(
                "Provider '%s' failed warmup — will be unavailable for routing",
                provider_id,
            )

    _registry = registry
    return registry


def get_registry() -> ProviderRegistry:
    """FastAPI dependency: get the provider registry.

    Usage in route handlers:
        @router.post("/synthesize")
        async def synthesize(registry: ProviderRegistry = Depends(get_registry)):
            provider = registry.get_tts(filters)
            ...
    """
    if _registry is None:
        raise RuntimeError(
            "Provider registry not initialised. "
            "Ensure the application lifespan has completed startup."
        )
    return _registry


# =============================================================================
# Section 2b: Cloning Dependencies
# =============================================================================
# Voice cloning is optional — deployments that don't need it skip the
# chatterbox-tts dependency entirely. When available, we wire up the
# consent manager, profile manager, and clone engine, then register the
# Chatterbox provider with the registry so clone:* voice IDs route correctly.

_consent_manager: object | None = None
_profile_manager: object | None = None
_clone_engine: object | None = None


async def create_cloning_dependencies(
    registry: ProviderRegistry,
    settings: Settings,
) -> bool:
    """Create and wire up voice cloning components.

    This is called during the application lifespan startup, AFTER the
    provider registry is created. It:
    1. Creates the ConsentManager (consent-gate for all cloning ops)
    2. Creates the ProfileManager (CRUD for voice profiles)
    3. Creates the CloneEngine (Chatterbox model wrapper)
    4. Creates the ChatterboxTTSProvider and registers it in the registry
    5. Initialises the cloning route module's dependencies

    Returns True if cloning was successfully initialised, False otherwise.
    """
    global _consent_manager, _profile_manager, _clone_engine

    if not _CLONING_AVAILABLE:
        logger.info("Voice cloning not available (chatterbox-tts not installed)")
        return False

    try:
        consent_manager = ConsentManager(require_consent=True)
        profile_manager = ProfileManager(max_samples_per_profile=10)
        clone_engine = CloneEngine(
            sample_rate=settings.tts.default_sample_rate,
        )

        # Register Chatterbox as a TTS provider in the registry
        chatterbox_provider = ChatterboxTTSProvider(
            clone_engine=clone_engine,
            profile_manager=profile_manager,
            sample_rate=settings.tts.default_sample_rate,
        )
        registry.register_tts(chatterbox_provider, enabled=True)

        # Warm up Chatterbox (just checks GPU availability, doesn't load model)
        await chatterbox_provider.warmup()

        # Wire the cloning route module's dependency injection
        from app.routes.cloning import init_cloning_dependencies
        init_cloning_dependencies(
            consent_manager=consent_manager,
            profile_manager=profile_manager,
            clone_engine=clone_engine,
        )

        _consent_manager = consent_manager
        _profile_manager = profile_manager
        _clone_engine = clone_engine

        logger.info("Voice cloning initialised (Chatterbox provider registered)")
        return True

    except Exception as e:
        logger.warning("Voice cloning init failed: %s", e)
        return False


def get_consent_manager() -> object:
    """FastAPI dependency: get the consent manager."""
    if _consent_manager is None:
        raise RuntimeError("Consent manager not initialised — cloning unavailable")
    return _consent_manager


def get_profile_manager() -> object:
    """FastAPI dependency: get the profile manager."""
    if _profile_manager is None:
        raise RuntimeError("Profile manager not initialised — cloning unavailable")
    return _profile_manager


def get_clone_engine() -> object:
    """FastAPI dependency: get the clone engine."""
    if _clone_engine is None:
        raise RuntimeError("Clone engine not initialised — cloning unavailable")
    return _clone_engine


# =============================================================================
# Section 3: Storage Backend
# =============================================================================
# The storage backend persists generated audio files. In production, this is
# Azure Blob Storage. In development, it's a local directory. The interface
# is identical — calling code never knows which backend is behind it.

_storage: object | None = None


async def create_storage(settings: Settings) -> object:
    """Create the storage backend based on configuration.

    Returns a storage object that implements get/put/delete/exists.
    The concrete type depends on settings.storage.backend.
    """
    global _storage

    if settings.storage.backend == StorageBackend.AZURE_BLOB:
        from storage.azure_blob import AzureBlobStorage
        _storage = AzureBlobStorage(
            connection_string=settings.storage.azure_connection_string or "",
            container_name=settings.storage.azure_container_name,
        )
        logger.info("Storage: Azure Blob (%s)", settings.storage.azure_container_name)
    else:
        from storage.local_fs import LocalFSStorage
        local_path = settings.storage.local_storage_path
        local_path.mkdir(parents=True, exist_ok=True)
        _storage = LocalFSStorage(base_path=local_path)
        logger.info("Storage: Local filesystem (%s)", local_path)

    return _storage


def get_storage() -> object:
    """FastAPI dependency: get the storage backend."""
    if _storage is None:
        raise RuntimeError("Storage not initialised")
    return _storage


# =============================================================================
# Section 4: Cache Backend
# =============================================================================

_cache: object | None = None


async def create_cache(settings: Settings) -> object:
    """Create the cache backend based on configuration."""
    global _cache

    if settings.cache.backend == CacheBackend.REDIS:
        import redis.asyncio as aioredis
        _cache = aioredis.from_url(
            settings.cache.redis_url or "redis://localhost:6379/0",
            decode_responses=True,
        )
        logger.info("Cache: Redis (%s)", settings.cache.redis_url)
    else:
        # Simple in-memory dict cache for development
        _cache = InMemoryCache(default_ttl=settings.cache.default_ttl_seconds)
        logger.info("Cache: In-memory (TTL=%ds)", settings.cache.default_ttl_seconds)

    return _cache


def get_cache() -> object:
    """FastAPI dependency: get the cache backend."""
    if _cache is None:
        raise RuntimeError("Cache not initialised")
    return _cache


class InMemoryCache:
    """Simple in-memory cache for development/standalone mode.

    Not suitable for production (not shared across workers/replicas),
    but perfectly adequate for local development and testing.
    """

    def __init__(self, default_ttl: int = 3600):
        self._store: dict[str, tuple[object, float]] = {}
        self._default_ttl = default_ttl

    async def get(self, key: str) -> object | None:
        import time
        entry = self._store.get(key)
        if entry is None:
            return None
        value, expires_at = entry
        if time.time() > expires_at:
            del self._store[key]
            return None
        return value

    async def set(
        self,
        key: str,
        value: object,
        ttl: int | None = None,
    ) -> None:
        import time
        expires_at = time.time() + (ttl or self._default_ttl)
        self._store[key] = (value, expires_at)

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def exists(self, key: str) -> bool:
        return await self.get(key) is not None


# =============================================================================
# Section 5: Cleanup
# =============================================================================

async def shutdown_dependencies() -> None:
    """Clean up all dependencies during application shutdown."""
    global _registry, _storage, _cache, _consent_manager, _profile_manager, _clone_engine

    if _registry is not None:
        await _registry.shutdown_all()
        _registry = None

    if _cache is not None and hasattr(_cache, "close"):
        await _cache.close()  # type: ignore
        _cache = None

    _storage = None
    _consent_manager = None
    _profile_manager = None
    _clone_engine = None

    logger.info("All dependencies shut down")
