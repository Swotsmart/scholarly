# =============================================================================
# SCHOLARLY VOICE SERVICE — Provider Registry Tests
# =============================================================================
# Tests for the provider routing cascade, circuit breaker, and lifecycle
# management. Uses mock providers to test routing logic in isolation
# from actual ML model loading.
# =============================================================================

from __future__ import annotations

from typing import Any, Optional
from unittest.mock import AsyncMock

import pytest

from providers.base import (
    NoProviderAvailableError,
    ProviderStatus,
    TTSProvider,
    TTSResult,
    STTProvider,
    TranscriptionResult,
    PronunciationResult,
    VoiceInfoResult,
    WordTimestampResult,
)
from providers.registry import ProviderRegistry, RoutingFilters


# =============================================================================
# Section 1: Mock Providers
# =============================================================================

class MockTTSProvider(TTSProvider):
    """Configurable mock TTS provider for testing routing logic."""

    def __init__(
        self,
        *,
        id: str = "mock-tts",
        languages: list[str] | None = None,
        cloning: bool = False,
        streaming: bool = False,
        priority_val: int = 50,
        cost: str = "standard",
        status_val: ProviderStatus = ProviderStatus.HEALTHY,
    ):
        self._id = id
        self._languages = languages or ["en-us"]
        self._cloning = cloning
        self._streaming = streaming
        self._priority = priority_val
        self._cost = cost
        self._status = status_val
        self.synthesize_calls: list[dict] = []
        self.warmup_called = False
        self.shutdown_called = False

    @property
    def provider_id(self) -> str:
        return self._id

    @property
    def supported_languages(self) -> list[str]:
        return self._languages

    @property
    def supports_cloning(self) -> bool:
        return self._cloning

    @property
    def supports_streaming(self) -> bool:
        return self._streaming

    @property
    def priority(self) -> int:
        return self._priority

    @property
    def cost_tier(self) -> str:
        return self._cost

    @property
    def status(self) -> ProviderStatus:
        return self._status

    async def synthesize(
        self, text: str, voice_id: str, language: str, **kwargs: Any
    ) -> TTSResult:
        self.synthesize_calls.append({
            "text": text, "voice_id": voice_id, "language": language, **kwargs
        })
        return TTSResult(
            audio_data=b"mock-audio",
            sample_rate=24000,
            duration_seconds=1.0,
            word_timestamps=[
                WordTimestampResult(word="mock", start=0.0, end=0.5),
            ],
            provider_id=self._id,
            model_name="mock-model",
            compute_seconds=0.01,
            characters_processed=len(text),
        )

    async def list_voices(self, language: Optional[str] = None) -> list[VoiceInfoResult]:
        return [
            VoiceInfoResult(
                voice_id=f"{self._id}-voice-1",
                name="Mock Voice",
                language=self._languages[0] if self._languages else "en-us",
                gender="neutral",
                style="neutral",
                provider_id=self._id,
            )
        ]

    async def health_check(self) -> bool:
        return self._status == ProviderStatus.HEALTHY

    async def warmup(self) -> None:
        self.warmup_called = True

    async def shutdown(self) -> None:
        self.shutdown_called = True


class MockSTTProvider(STTProvider):
    """Configurable mock STT provider for testing."""

    def __init__(
        self,
        *,
        id: str = "mock-stt",
        languages: list[str] | None = None,
        priority_val: int = 50,
    ):
        self._id = id
        self._languages = languages or ["en-us"]
        self._priority = priority_val

    @property
    def provider_id(self) -> str:
        return self._id

    @property
    def supported_languages(self) -> list[str]:
        return self._languages

    @property
    def supports_streaming(self) -> bool:
        return False

    @property
    def supports_word_timestamps(self) -> bool:
        return True

    @property
    def supports_phoneme_alignment(self) -> bool:
        return False

    @property
    def priority(self) -> int:
        return self._priority

    async def transcribe(self, audio: bytes, **kwargs: Any) -> TranscriptionResult:
        return TranscriptionResult(
            text="mock transcription",
            language="en-us",
            provider_id=self._id,
        )

    async def assess_pronunciation(
        self, audio: bytes, expected_text: str, **kwargs: Any
    ) -> PronunciationResult:
        return PronunciationResult(
            overall_score=0.9,
            provider_id=self._id,
        )

    async def health_check(self) -> bool:
        return True


# =============================================================================
# Section 2: Registry Tests
# =============================================================================

class TestProviderRegistration:
    """Tests for provider registration and unregistration."""

    def test_register_tts_provider(self) -> None:
        registry = ProviderRegistry()
        provider = MockTTSProvider(id="test-tts")
        registry.register_tts(provider)
        assert registry.tts_provider_count == 1

    def test_register_stt_provider(self) -> None:
        registry = ProviderRegistry()
        provider = MockSTTProvider(id="test-stt")
        registry.register_stt(provider)
        assert registry.stt_provider_count == 1

    def test_register_multiple_providers(self) -> None:
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="tts-1"))
        registry.register_tts(MockTTSProvider(id="tts-2"))
        registry.register_stt(MockSTTProvider(id="stt-1"))
        assert registry.tts_provider_count == 2
        assert registry.stt_provider_count == 1

    def test_unregister_tts_provider(self) -> None:
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="tts-1"))
        assert registry.tts_provider_count == 1
        registry.unregister_tts("tts-1")
        assert registry.tts_provider_count == 0

    def test_overwrite_existing_provider(self) -> None:
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="tts-1", priority_val=10))
        registry.register_tts(MockTTSProvider(id="tts-1", priority_val=5))
        assert registry.tts_provider_count == 1
        # Should use the new registration
        provider = registry.get_tts()
        assert provider.priority == 5


class TestRoutingCascade:
    """Tests for the priority cascade routing logic."""

    def test_routes_to_highest_priority(self) -> None:
        """Step 6: Among remaining, select lowest priority number."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="low-priority", priority_val=10))
        registry.register_tts(MockTTSProvider(id="high-priority", priority_val=1))
        registry.register_tts(MockTTSProvider(id="mid-priority", priority_val=5))

        provider = registry.get_tts()
        assert provider.provider_id == "high-priority"

    def test_filters_by_language(self) -> None:
        """Step 2: Only providers supporting the requested language."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="english", languages=["en-us"]))
        registry.register_tts(MockTTSProvider(id="french", languages=["fr-fr"]))
        registry.register_tts(MockTTSProvider(id="both", languages=["en-us", "fr-fr"]))

        provider = registry.get_tts(RoutingFilters(language="fr-fr"))
        # Should get "both" (priority 50) or "french" (priority 50) — both match
        assert provider.provider_id in ("french", "both")

    def test_filters_by_cloning(self) -> None:
        """Step 3: If clone profile, only providers with supports_cloning=True."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="no-clone", cloning=False, priority_val=1))
        registry.register_tts(MockTTSProvider(id="clone", cloning=True, priority_val=10))

        # Without cloning requirement, prefer higher priority
        provider = registry.get_tts(RoutingFilters(requires_cloning=False))
        assert provider.provider_id == "no-clone"

        # With cloning requirement, only clone-capable provider matches
        provider = registry.get_tts(RoutingFilters(requires_cloning=True))
        assert provider.provider_id == "clone"

    def test_filters_by_cost_tier(self) -> None:
        """Step 4: Match tenant's cost tier."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="economy", cost="economy", priority_val=5))
        registry.register_tts(MockTTSProvider(id="standard", cost="standard", priority_val=1))
        registry.register_tts(MockTTSProvider(id="critical", cost="critical", priority_val=10))

        provider = registry.get_tts(RoutingFilters(cost_tier="economy"))
        assert provider.provider_id == "economy"

    def test_cost_tier_falls_through_if_no_match(self) -> None:
        """Cost tier filter is advisory — falls through to all candidates if none match."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="standard", cost="standard", priority_val=1))

        # Request economy tier, but only standard exists — should still work
        provider = registry.get_tts(RoutingFilters(cost_tier="economy"))
        assert provider.provider_id == "standard"

    def test_filters_by_health(self) -> None:
        """Step 5: Exclude providers failing health checks."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(
            id="healthy", priority_val=10, status_val=ProviderStatus.HEALTHY
        ))
        registry.register_tts(MockTTSProvider(
            id="unhealthy", priority_val=1, status_val=ProviderStatus.UNAVAILABLE
        ))

        # Even though "unhealthy" has higher priority, it's excluded
        provider = registry.get_tts()
        assert provider.provider_id == "healthy"

    def test_preferred_provider_shortcut(self) -> None:
        """Step 0: Preferred provider bypasses cascade if healthy."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="preferred", priority_val=100))
        registry.register_tts(MockTTSProvider(id="better", priority_val=1))

        # Without preference, get "better" (priority 1)
        provider = registry.get_tts()
        assert provider.provider_id == "better"

        # With preference, get "preferred" despite worse priority
        provider = registry.get_tts(RoutingFilters(preferred_provider="preferred"))
        assert provider.provider_id == "preferred"

    def test_preferred_provider_falls_through_if_unhealthy(self) -> None:
        """Preferred provider that's unhealthy falls through to cascade."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(
            id="preferred", priority_val=1, status_val=ProviderStatus.UNAVAILABLE
        ))
        registry.register_tts(MockTTSProvider(id="fallback", priority_val=10))

        provider = registry.get_tts(RoutingFilters(preferred_provider="preferred"))
        assert provider.provider_id == "fallback"

    def test_no_provider_available_raises(self) -> None:
        """NoProviderAvailableError when no provider matches filters."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="english", languages=["en-us"]))

        with pytest.raises(NoProviderAvailableError):
            registry.get_tts(RoutingFilters(language="ja-jp"))

    def test_empty_registry_raises(self) -> None:
        """NoProviderAvailableError on empty registry."""
        registry = ProviderRegistry()
        with pytest.raises(NoProviderAvailableError):
            registry.get_tts()

    def test_disabled_providers_excluded(self) -> None:
        """Disabled providers are not routed to."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="disabled", priority_val=1), enabled=False)
        registry.register_tts(MockTTSProvider(id="enabled", priority_val=10), enabled=True)

        provider = registry.get_tts()
        assert provider.provider_id == "enabled"


class TestCircuitBreaker:
    """Tests for the circuit breaker pattern in provider routing."""

    def test_circuit_opens_after_consecutive_failures(self) -> None:
        """Provider becomes unhealthy after 3 consecutive failures."""
        registry = ProviderRegistry()
        provider = MockTTSProvider(id="fragile", priority_val=1)
        backup = MockTTSProvider(id="reliable", priority_val=10)
        registry.register_tts(provider)
        registry.register_tts(backup)

        # Initially routes to "fragile" (priority 1)
        assert registry.get_tts().provider_id == "fragile"

        # Record 3 failures
        registry.record_failure("fragile")
        registry.record_failure("fragile")
        registry.record_failure("fragile")

        # Now routes to "reliable" because "fragile" circuit is open
        assert registry.get_tts().provider_id == "reliable"

    def test_circuit_closes_on_success(self) -> None:
        """Success resets the failure counter and closes the circuit."""
        registry = ProviderRegistry()
        provider = MockTTSProvider(id="recovering", priority_val=1)
        registry.register_tts(provider)
        registry.register_tts(MockTTSProvider(id="backup", priority_val=10))

        # Open the circuit
        registry.record_failure("recovering")
        registry.record_failure("recovering")
        registry.record_failure("recovering")
        assert registry.get_tts().provider_id == "backup"

        # Record a success — circuit closes
        registry.record_success("recovering")
        assert registry.get_tts().provider_id == "recovering"

    def test_partial_failures_dont_open_circuit(self) -> None:
        """Fewer than threshold failures don't affect routing."""
        registry = ProviderRegistry()
        provider = MockTTSProvider(id="sometimes-fails", priority_val=1)
        registry.register_tts(provider)

        registry.record_failure("sometimes-fails")
        registry.record_failure("sometimes-fails")
        # Only 2 failures, threshold is 3
        assert registry.get_tts().provider_id == "sometimes-fails"


class TestLifecycle:
    """Tests for provider lifecycle management."""

    @pytest.mark.asyncio
    async def test_warmup_all_calls_warmup(self) -> None:
        """warmup_all() calls warmup() on each provider."""
        registry = ProviderRegistry()
        p1 = MockTTSProvider(id="tts-1")
        p2 = MockSTTProvider(id="stt-1")
        registry.register_tts(p1)
        registry.register_stt(p2)

        results = await registry.warmup_all()
        assert p1.warmup_called
        assert results["tts-1"] is True

    @pytest.mark.asyncio
    async def test_shutdown_all_calls_shutdown(self) -> None:
        """shutdown_all() calls shutdown() on each provider."""
        registry = ProviderRegistry()
        p1 = MockTTSProvider(id="tts-1")
        registry.register_tts(p1)

        await registry.shutdown_all()
        assert p1.shutdown_called

    @pytest.mark.asyncio
    async def test_health_check_all(self) -> None:
        """health_check_all() queries each provider."""
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="healthy"))
        registry.register_tts(MockTTSProvider(
            id="unhealthy", status_val=ProviderStatus.UNAVAILABLE
        ))

        results = await registry.health_check_all()
        assert results["healthy"] is True
        assert results["unhealthy"] is False


class TestIntrospection:
    """Tests for registry introspection methods."""

    def test_list_tts_providers(self) -> None:
        registry = ProviderRegistry()
        registry.register_tts(MockTTSProvider(id="kokoro", priority_val=1))
        registry.register_tts(MockTTSProvider(id="elevenlabs", priority_val=10))

        providers = registry.list_tts_providers()
        assert len(providers) == 2
        ids = {p["provider_id"] for p in providers}
        assert ids == {"kokoro", "elevenlabs"}

    def test_list_stt_providers(self) -> None:
        registry = ProviderRegistry()
        registry.register_stt(MockSTTProvider(id="whisper"))

        providers = registry.list_stt_providers()
        assert len(providers) == 1
        assert providers[0]["provider_id"] == "whisper"


# =============================================================================
# Section 3: Kokoro Voice Catalogue Tests
# =============================================================================

class TestKokoroVoiceCatalogue:
    """Tests for the Kokoro voice catalogue constants."""

    def test_voice_count(self) -> None:
        from providers.kokoro_provider import KOKORO_VOICES
        # Architecture spec says 48 voices
        assert len(KOKORO_VOICES) >= 48

    def test_all_voices_have_required_fields(self) -> None:
        from providers.kokoro_provider import KOKORO_VOICES
        for voice in KOKORO_VOICES:
            assert "id" in voice, f"Voice missing 'id': {voice}"
            assert "name" in voice, f"Voice missing 'name': {voice}"
            assert "lang" in voice, f"Voice missing 'lang': {voice}"
            assert "gender" in voice, f"Voice missing 'gender': {voice}"
            assert "style" in voice, f"Voice missing 'style': {voice}"

    def test_voice_id_uniqueness(self) -> None:
        from providers.kokoro_provider import KOKORO_VOICES
        ids = [v["id"] for v in KOKORO_VOICES]
        assert len(ids) == len(set(ids)), "Duplicate voice IDs found"

    def test_supported_languages(self) -> None:
        from providers.kokoro_provider import SUPPORTED_LANGUAGES
        # Architecture spec: 8+ languages
        assert len(SUPPORTED_LANGUAGES) >= 8
        assert "en-us" in SUPPORTED_LANGUAGES
        assert "en-gb" in SUPPORTED_LANGUAGES
        assert "fr-fr" in SUPPORTED_LANGUAGES
        assert "ja-jp" in SUPPORTED_LANGUAGES
        assert "zh-cn" in SUPPORTED_LANGUAGES

    def test_voice_lookup_maps(self) -> None:
        from providers.kokoro_provider import _VOICE_BY_ID, _VOICES_BY_LANG
        assert "af_heart" in _VOICE_BY_ID
        assert "en-us" in _VOICES_BY_LANG
        assert len(_VOICES_BY_LANG["en-us"]) > 0


# =============================================================================
# Section 4: Configuration Tests
# =============================================================================

class TestConfiguration:
    """Tests for the Pydantic Settings configuration."""

    def test_default_settings_load(self) -> None:
        """Settings should load with all defaults without any env vars."""
        from app.config import Settings
        settings = Settings()
        assert settings.environment.value == "development"
        assert settings.tts.kokoro_device == "auto"
        assert settings.storage.backend.value == "local_fs"
        assert settings.cache.backend.value == "memory"
        assert settings.auth.enabled is False

    def test_audio_processing_defaults(self) -> None:
        """Audio processing settings match architecture spec defaults."""
        from app.config import Settings
        settings = Settings()
        assert settings.audio.target_lufs == -16.0
        assert settings.audio.pace_min == 0.5
        assert settings.audio.pace_max == 2.0
        assert settings.audio.pitch_min_semitones == -6.0
        assert settings.audio.pitch_max_semitones == 6.0
        assert settings.audio.emphasis_pace_default == 0.8

    def test_tts_defaults(self) -> None:
        """TTS defaults match architecture spec."""
        from app.config import Settings
        settings = Settings()
        assert settings.tts.default_sample_rate == 24000
        assert settings.tts.max_text_length == 10000
        assert settings.tts.kokoro_default_voice == "af_heart"

    def test_server_defaults(self) -> None:
        from app.config import Settings
        settings = Settings()
        assert settings.server.port == 8100
        assert settings.server.workers == 4


# =============================================================================
# Section 5: Pydantic Model Tests
# =============================================================================

class TestRequestModels:
    """Tests for request/response Pydantic models."""

    def test_synthesize_request_defaults(self) -> None:
        from models.schemas import SynthesizeRequest
        req = SynthesizeRequest(text="Hello world")
        assert req.pace == 1.0
        assert req.pitch == 0.0
        assert req.warmth == 0.0
        assert req.language == "en-us"
        assert req.normalise is True

    def test_synthesize_request_validation(self) -> None:
        from models.schemas import SynthesizeRequest
        # Text too short
        with pytest.raises(Exception):
            SynthesizeRequest(text="")

        # Pace out of range
        with pytest.raises(Exception):
            SynthesizeRequest(text="hello", pace=3.0)

        # Pitch out of range
        with pytest.raises(Exception):
            SynthesizeRequest(text="hello", pitch=10.0)

    def test_narrate_page_request(self) -> None:
        from models.schemas import NarratePageRequest
        req = NarratePageRequest(
            text="The cat sat on the mat",
            target_gpcs=["a", "t"],
            emphasis_pace=0.7,
        )
        assert req.emphasis_pace == 0.7
        assert len(req.target_gpcs) == 2

    def test_voice_info_model(self) -> None:
        from models.schemas import VoiceInfo
        voice = VoiceInfo(
            voice_id="af_heart",
            name="Heart",
            language="en-us",
            gender="female",
            style="warm",
            provider="kokoro",
        )
        assert voice.is_cloned is False
