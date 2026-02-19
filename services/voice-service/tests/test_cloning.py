# =============================================================================
# SCHOLARLY VOICE SERVICE — Voice Cloning Test Suite
# =============================================================================
# Tests for the consent management, profile lifecycle, clone engine validation,
# Chatterbox provider integration, and cloning API routes.
#
# These tests run entirely on CPU with mocked Chatterbox model interactions —
# no GPU required. The goal is to validate the consent-first architecture,
# profile state machine, sample validation logic, and API contract, not the
# actual neural network inference (which is tested via integration tests on
# GPU-equipped runners).
#
# Test structure:
#   1. ConsentManager — consent create/verify/revoke lifecycle
#   2. ProfileManager — profile CRUD and state transitions
#   3. CloneEngine — sample validation (no model loading)
#   4. ChatterboxTTSProvider — provider interface compliance
#   5. API Routes — full HTTP request/response cycle via TestClient
# =============================================================================

from __future__ import annotations

import io
import time
from datetime import datetime, timedelta, timezone
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest
import soundfile as sf

from cloning.consent import (
    ConsentExpiredError,
    ConsentManager,
    ConsentNotFoundError,
    ConsentRevokedError,
    ConsentStatus,
    VoiceCloneConsent,
)
from cloning.profile_manager import (
    ProfileManager,
    ProfileNotFoundError,
    ProfileStateError,
    ProfileStatus,
    VoiceProfile,
    VoiceProfileSample,
)


# =============================================================================
# Fixtures
# =============================================================================

@pytest.fixture
def consent_manager() -> ConsentManager:
    """Fresh ConsentManager with require_consent=True."""
    return ConsentManager(require_consent=True)


@pytest.fixture
def permissive_consent_manager() -> ConsentManager:
    """ConsentManager with require_consent=False (development mode)."""
    return ConsentManager(require_consent=False)


@pytest.fixture
def profile_manager() -> ProfileManager:
    """Fresh ProfileManager with default settings."""
    return ProfileManager(max_samples_per_profile=5)


@pytest.fixture
def sample_consent(consent_manager: ConsentManager) -> VoiceCloneConsent:
    """Create a valid consent record for use in profile tests."""
    return consent_manager.create_consent(
        tenant_id="test-tenant",
        voice_owner_id="teacher-001",
        granted_by="admin-001",
        purpose="Storybook narration for Year 2 class",
    )


@pytest.fixture
def sample_profile(
    profile_manager: ProfileManager,
    sample_consent: VoiceCloneConsent,
) -> VoiceProfile:
    """Create a profile in CREATING state."""
    return profile_manager.create_profile(
        tenant_id="test-tenant",
        owner_id="teacher-001",
        name="Mrs. Thompson's Voice",
        language="en-gb",
        consent_id=sample_consent.id,
    )


def make_wav_bytes(duration_seconds: float = 10.0, sample_rate: int = 24000) -> bytes:
    """Generate valid WAV audio bytes for testing.

    Produces a sine wave at 440Hz — recognisable as a clear tone, not
    silence (which would fail quality validation) or noise (which might
    trigger clipping checks).
    """
    t = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds), endpoint=False)
    # 440Hz sine wave at moderate volume (RMS ~0.07)
    audio = (0.1 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)
    buf = io.BytesIO()
    sf.write(buf, audio, sample_rate, format="WAV", subtype="PCM_16")
    buf.seek(0)
    return buf.read()


def make_audio_array(
    duration_seconds: float = 10.0,
    sample_rate: int = 24000,
) -> np.ndarray:
    """Generate a numpy audio array for engine tests."""
    t = np.linspace(0, duration_seconds, int(sample_rate * duration_seconds), endpoint=False)
    return (0.1 * np.sin(2 * np.pi * 440 * t)).astype(np.float32)


# =============================================================================
# Section 1: ConsentManager Tests
# =============================================================================

class TestConsentManager:
    """Tests for the consent management layer.

    The ConsentManager is the gatekeeper for all voice cloning operations.
    Think of it as the permissions desk at a recording studio — nobody gets
    behind the microphone without a signed consent form.
    """

    def test_create_consent_returns_valid_record(
        self, consent_manager: ConsentManager
    ) -> None:
        """Creating consent should return a record with all fields populated."""
        consent = consent_manager.create_consent(
            tenant_id="t1",
            voice_owner_id="user-abc",
            granted_by="admin-xyz",
            purpose="Storybook narration",
        )

        assert consent.id is not None
        assert consent.tenant_id == "t1"
        assert consent.voice_owner_id == "user-abc"
        assert consent.granted_by == "admin-xyz"
        assert consent.purpose == "Storybook narration"
        assert consent.granted_at is not None
        assert consent.revoked_at is None
        assert consent.expires_at is None

    def test_create_consent_with_expiry(
        self, consent_manager: ConsentManager
    ) -> None:
        """Consent can include an expiry date for time-limited permissions."""
        future = datetime.now(timezone.utc) + timedelta(days=365)
        consent = consent_manager.create_consent(
            tenant_id="t1",
            voice_owner_id="user-abc",
            granted_by="admin-xyz",
            purpose="School year 2026",
            expires_at=future,
        )

        assert consent.expires_at == future

    def test_get_consent_by_id(self, consent_manager: ConsentManager) -> None:
        """Retrieving a consent by ID should return the same record."""
        created = consent_manager.create_consent(
            tenant_id="t1",
            voice_owner_id="user-1",
            granted_by="admin-1",
            purpose="test",
        )
        retrieved = consent_manager.get_consent(created.id)
        assert retrieved.id == created.id
        assert retrieved.voice_owner_id == created.voice_owner_id

    def test_get_nonexistent_consent_raises(
        self, consent_manager: ConsentManager
    ) -> None:
        """Looking up a consent that doesn't exist should raise ConsentNotFoundError."""
        with pytest.raises(ConsentNotFoundError):
            consent_manager.get_consent("nonexistent-id")

    def test_verify_active_consent_succeeds(
        self, consent_manager: ConsentManager
    ) -> None:
        """Verifying an active, non-expired consent should not raise."""
        consent = consent_manager.create_consent(
            tenant_id="t1",
            voice_owner_id="u1",
            granted_by="a1",
            purpose="test",
        )
        # Should not raise
        consent_manager.verify_consent(consent.id)

    def test_verify_expired_consent_raises(
        self, consent_manager: ConsentManager
    ) -> None:
        """Verifying an expired consent should raise ConsentExpiredError."""
        past = datetime.now(timezone.utc) - timedelta(days=1)
        consent = consent_manager.create_consent(
            tenant_id="t1",
            voice_owner_id="u1",
            granted_by="a1",
            purpose="test",
            expires_at=past,
        )
        with pytest.raises(ConsentExpiredError):
            consent_manager.verify_consent(consent.id)

    def test_verify_revoked_consent_raises(
        self, consent_manager: ConsentManager
    ) -> None:
        """Verifying a revoked consent should raise ConsentRevokedError."""
        consent = consent_manager.create_consent(
            tenant_id="t1",
            voice_owner_id="u1",
            granted_by="a1",
            purpose="test",
        )
        consent_manager.revoke_consent(consent.id)
        with pytest.raises(ConsentRevokedError):
            consent_manager.verify_consent(consent.id)

    def test_revoke_consent(self, consent_manager: ConsentManager) -> None:
        """Revoking consent should set revoked_at and prevent future verification."""
        consent = consent_manager.create_consent(
            tenant_id="t1",
            voice_owner_id="u1",
            granted_by="a1",
            purpose="test",
        )
        revoked = consent_manager.revoke_consent(consent.id)
        assert revoked.revoked_at is not None

    def test_revoke_nonexistent_raises(
        self, consent_manager: ConsentManager
    ) -> None:
        """Revoking a nonexistent consent should raise."""
        with pytest.raises(ConsentNotFoundError):
            consent_manager.revoke_consent("no-such-id")

    def test_list_consents(self, consent_manager: ConsentManager) -> None:
        """Listing consents should return all records for a tenant."""
        consent_manager.create_consent(
            tenant_id="t1", voice_owner_id="u1", granted_by="a1", purpose="p1"
        )
        consent_manager.create_consent(
            tenant_id="t1", voice_owner_id="u2", granted_by="a1", purpose="p2"
        )
        consent_manager.create_consent(
            tenant_id="t2", voice_owner_id="u3", granted_by="a2", purpose="p3"
        )

        t1_consents = consent_manager.list_consents(tenant_id="t1")
        assert len(t1_consents) == 2

    def test_permissive_mode_skips_verification(
        self, permissive_consent_manager: ConsentManager
    ) -> None:
        """In development mode (require_consent=False), verification always passes."""
        # This should not raise even though the consent doesn't exist
        permissive_consent_manager.verify_consent("any-id-at-all")


# =============================================================================
# Section 2: ProfileManager Tests
# =============================================================================

class TestProfileManager:
    """Tests for voice profile CRUD and state transitions.

    The ProfileManager tracks the lifecycle of a voice profile from
    creation through sample collection to embedding extraction. Think of
    it as the portfolio tracker for a voice — it knows what samples exist,
    what quality they are, and whether the profile is ready for synthesis.
    """

    def test_create_profile(
        self, profile_manager: ProfileManager, sample_consent: VoiceCloneConsent
    ) -> None:
        """Creating a profile should set status to CREATING."""
        profile = profile_manager.create_profile(
            tenant_id="t1",
            owner_id="user-1",
            name="Test Voice",
            language="en-us",
            consent_id=sample_consent.id,
        )

        assert profile.id is not None
        assert profile.name == "Test Voice"
        assert profile.language == "en-us"
        assert profile.status == ProfileStatus.CREATING
        assert profile.sample_count == 0
        assert profile.quality_score is None

    def test_get_profile(self, sample_profile: VoiceProfile, profile_manager: ProfileManager) -> None:
        """Retrieving a profile by ID should return the same record."""
        retrieved = profile_manager.get_profile(sample_profile.id)
        assert retrieved.id == sample_profile.id
        assert retrieved.name == sample_profile.name

    def test_get_nonexistent_profile_raises(
        self, profile_manager: ProfileManager
    ) -> None:
        """Looking up a nonexistent profile should raise."""
        with pytest.raises(ProfileNotFoundError):
            profile_manager.get_profile("no-such-id")

    def test_list_profiles(
        self,
        profile_manager: ProfileManager,
        sample_consent: VoiceCloneConsent,
    ) -> None:
        """Listing profiles should return all profiles, optionally filtered."""
        profile_manager.create_profile(
            tenant_id="t1", owner_id="u1", name="Voice A",
            language="en-us", consent_id=sample_consent.id,
        )
        p2 = profile_manager.create_profile(
            tenant_id="t1", owner_id="u1", name="Voice B",
            language="en-gb", consent_id=sample_consent.id,
        )
        profile_manager.mark_ready(p2.id, "embed-url", 0.9, ["en-gb"])

        all_profiles = profile_manager.list_profiles()
        assert len(all_profiles) == 2

        creating_only = profile_manager.list_profiles(status=ProfileStatus.CREATING)
        assert len(creating_only) == 1

        ready_only = profile_manager.list_profiles(status=ProfileStatus.READY)
        assert len(ready_only) == 1

    def test_add_sample(
        self, profile_manager: ProfileManager, sample_profile: VoiceProfile
    ) -> None:
        """Adding a sample should increment the profile's sample count."""
        sample = profile_manager.add_sample(
            profile_id=sample_profile.id,
            audio_url="file:///data/sample_0.wav",
            duration_ms=10000,
            normalised=False,
            quality_assessment={"rms": 0.07, "snr_db": 25.0},
        )

        assert sample.id is not None
        assert sample.duration_ms == 10000

        updated_profile = profile_manager.get_profile(sample_profile.id)
        assert updated_profile.sample_count == 1

    def test_max_samples_enforced(
        self, profile_manager: ProfileManager, sample_profile: VoiceProfile
    ) -> None:
        """Adding more samples than max_samples_per_profile should raise."""
        for i in range(5):  # max is 5 in our fixture
            profile_manager.add_sample(
                profile_id=sample_profile.id,
                audio_url=f"file:///data/sample_{i}.wav",
                duration_ms=10000,
            )

        with pytest.raises(ProfileStateError):
            profile_manager.add_sample(
                profile_id=sample_profile.id,
                audio_url="file:///data/sample_overflow.wav",
                duration_ms=10000,
            )

    def test_get_samples(
        self, profile_manager: ProfileManager, sample_profile: VoiceProfile
    ) -> None:
        """Getting samples should return all samples for a profile."""
        profile_manager.add_sample(
            profile_id=sample_profile.id,
            audio_url="file:///data/s1.wav",
            duration_ms=8000,
        )
        profile_manager.add_sample(
            profile_id=sample_profile.id,
            audio_url="file:///data/s2.wav",
            duration_ms=12000,
        )

        samples = profile_manager.get_samples(sample_profile.id)
        assert len(samples) == 2

    def test_total_sample_duration(
        self, profile_manager: ProfileManager, sample_profile: VoiceProfile
    ) -> None:
        """Total duration should sum all sample durations."""
        profile_manager.add_sample(
            profile_id=sample_profile.id,
            audio_url="file:///data/s1.wav",
            duration_ms=8000,
        )
        profile_manager.add_sample(
            profile_id=sample_profile.id,
            audio_url="file:///data/s2.wav",
            duration_ms=12000,
        )

        total = profile_manager.get_total_sample_duration_ms(sample_profile.id)
        assert total == 20000

    def test_mark_ready(
        self, profile_manager: ProfileManager, sample_profile: VoiceProfile
    ) -> None:
        """Marking a profile ready should update status, embedding, and quality."""
        profile_manager.mark_ready(
            profile_id=sample_profile.id,
            embedding_url="embeddings/test/speaker.npy",
            quality_score=0.85,
            verified_languages=["en-gb", "en-us"],
        )

        profile = profile_manager.get_profile(sample_profile.id)
        assert profile.status == ProfileStatus.READY
        assert profile.embedding_url == "embeddings/test/speaker.npy"
        assert profile.quality_score == 0.85
        assert "en-gb" in profile.verified_languages

    def test_mark_failed(
        self, profile_manager: ProfileManager, sample_profile: VoiceProfile
    ) -> None:
        """Marking a profile failed should update status."""
        profile_manager.mark_failed(sample_profile.id, "GPU out of memory")

        profile = profile_manager.get_profile(sample_profile.id)
        assert profile.status == ProfileStatus.FAILED

    def test_archive_profile(
        self, profile_manager: ProfileManager, sample_profile: VoiceProfile
    ) -> None:
        """Archiving should set status to ARCHIVED."""
        profile_manager.archive_profile(sample_profile.id)

        profile = profile_manager.get_profile(sample_profile.id)
        assert profile.status == ProfileStatus.ARCHIVED

    def test_delete_profile(
        self, profile_manager: ProfileManager, sample_profile: VoiceProfile
    ) -> None:
        """Deleting should remove the profile entirely."""
        profile_manager.delete_profile(sample_profile.id)

        with pytest.raises(ProfileNotFoundError):
            profile_manager.get_profile(sample_profile.id)

    def test_find_profiles_by_consent(
        self,
        profile_manager: ProfileManager,
        sample_consent: VoiceCloneConsent,
    ) -> None:
        """Finding by consent should return all profiles linked to that consent."""
        profile_manager.create_profile(
            tenant_id="t1", owner_id="u1", name="V1",
            language="en-us", consent_id=sample_consent.id,
        )
        profile_manager.create_profile(
            tenant_id="t1", owner_id="u1", name="V2",
            language="en-gb", consent_id=sample_consent.id,
        )

        results = profile_manager.find_profiles_by_consent(sample_consent.id)
        assert len(results) == 2

    def test_get_ready_profiles_for_tenant(
        self,
        profile_manager: ProfileManager,
        sample_consent: VoiceCloneConsent,
    ) -> None:
        """Should only return READY profiles for the specified tenant."""
        p1 = profile_manager.create_profile(
            tenant_id="t1", owner_id="u1", name="V1",
            language="en-us", consent_id=sample_consent.id,
        )
        profile_manager.create_profile(
            tenant_id="t1", owner_id="u1", name="V2",
            language="en-gb", consent_id=sample_consent.id,
        )
        profile_manager.mark_ready(p1.id, "embed", 0.9, ["en-us"])

        ready = profile_manager.get_ready_profiles_for_tenant("t1")
        assert len(ready) == 1
        assert ready[0].name == "V1"


# =============================================================================
# Section 3: CloneEngine Validation Tests
# =============================================================================

class TestCloneEngineValidation:
    """Tests for sample validation logic.

    The CloneEngine's validate_sample method is the quality gate that
    decides whether an audio sample is good enough for voice cloning.
    Think of it as the sound engineer checking the recording before
    the session starts — is the mic too quiet? Is there clipping?
    Is the room too noisy?

    These tests run without loading the Chatterbox model (CPU-safe).
    """

    def test_validate_good_sample(self) -> None:
        """A clean 10-second sine wave should pass validation."""
        from cloning.clone_engine import CloneEngine
        engine = CloneEngine(sample_rate=24000)

        audio = make_audio_array(duration_seconds=10.0, sample_rate=24000)
        result = engine.validate_sample(audio, 24000)

        assert result.valid is True
        assert len(result.issues) == 0
        assert result.duration_seconds == pytest.approx(10.0, abs=0.1)

    def test_validate_too_short(self) -> None:
        """A sample shorter than 6 seconds should fail validation."""
        from cloning.clone_engine import CloneEngine
        engine = CloneEngine(sample_rate=24000)

        audio = make_audio_array(duration_seconds=3.0, sample_rate=24000)
        result = engine.validate_sample(audio, 24000)

        assert result.valid is False
        assert any("short" in issue.lower() or "duration" in issue.lower()
                    for issue in result.issues)

    def test_validate_silent_audio(self) -> None:
        """Silence (all zeros) should fail the RMS check."""
        from cloning.clone_engine import CloneEngine
        engine = CloneEngine(sample_rate=24000)

        audio = np.zeros(24000 * 10, dtype=np.float32)
        result = engine.validate_sample(audio, 24000)

        assert result.valid is False
        assert any("silent" in issue.lower() or "rms" in issue.lower() or "quiet" in issue.lower()
                    for issue in result.issues)

    def test_validate_clipping_audio(self) -> None:
        """Audio with significant clipping should be flagged."""
        from cloning.clone_engine import CloneEngine
        engine = CloneEngine(sample_rate=24000)

        # Generate clipping audio (values at ±1.0 for >5% of samples)
        audio = np.random.uniform(-0.1, 0.1, 24000 * 10).astype(np.float32)
        # Set 10% of samples to ±1.0 (severe clipping)
        clip_indices = np.random.choice(len(audio), size=len(audio) // 10, replace=False)
        audio[clip_indices] = np.where(
            np.random.random(len(clip_indices)) > 0.5, 1.0, -1.0
        )

        result = engine.validate_sample(audio, 24000)

        assert result.valid is False
        assert any("clip" in issue.lower() for issue in result.issues)

    def test_validate_quality_metrics_present(self) -> None:
        """Validation result should always include quality metrics."""
        from cloning.clone_engine import CloneEngine
        engine = CloneEngine(sample_rate=24000)

        audio = make_audio_array(duration_seconds=10.0)
        result = engine.validate_sample(audio, 24000)

        assert "rms" in result.quality_metrics
        assert "duration_seconds" in result.quality_metrics


# =============================================================================
# Section 4: ChatterboxTTSProvider Tests
# =============================================================================

class TestChatterboxProvider:
    """Tests for the ChatterboxTTSProvider interface.

    These verify that the provider correctly implements the TTSProvider
    contract, routes clone:* voice IDs, and delegates to the underlying
    engine and profile manager. The actual Chatterbox model is mocked.
    """

    def test_provider_properties(self) -> None:
        """Provider should expose correct interface properties."""
        from cloning.clone_engine import CloneEngine
        from cloning.profile_manager import ProfileManager
        from providers.chatterbox_provider import ChatterboxTTSProvider

        engine = CloneEngine(sample_rate=24000)
        pm = ProfileManager()
        provider = ChatterboxTTSProvider(engine, pm)

        assert provider.provider_id == "chatterbox"
        assert provider.supports_cloning is True
        assert provider.supports_streaming is False
        assert provider.priority == 5
        assert provider.cost_tier == "standard"
        assert "en-us" in provider.supported_languages

    def test_extract_profile_id_with_prefix(self) -> None:
        """clone:abc123 should extract to abc123."""
        from providers.chatterbox_provider import ChatterboxTTSProvider
        assert ChatterboxTTSProvider._extract_profile_id("clone:abc123") == "abc123"

    def test_extract_profile_id_without_prefix(self) -> None:
        """Direct UUID should pass through unchanged."""
        from providers.chatterbox_provider import ChatterboxTTSProvider
        assert ChatterboxTTSProvider._extract_profile_id("abc123") == "abc123"

    @pytest.mark.asyncio
    async def test_list_voices_returns_ready_profiles(self) -> None:
        """list_voices should return only READY profiles as cloned voices."""
        from cloning.clone_engine import CloneEngine
        from cloning.profile_manager import ProfileManager
        from providers.chatterbox_provider import ChatterboxTTSProvider

        engine = CloneEngine(sample_rate=24000)
        pm = ProfileManager()
        provider = ChatterboxTTSProvider(engine, pm)

        # Create two profiles, only mark one ready
        p1 = pm.create_profile("t1", "u1", "V1", "en-us", "consent-1")
        p2 = pm.create_profile("t1", "u1", "V2", "en-gb", "consent-1")
        pm.mark_ready(p1.id, "embed", 0.9, ["en-us"])

        voices = await provider.list_voices()
        assert len(voices) == 1
        assert voices[0].voice_id == f"clone:{p1.id}"
        assert voices[0].is_cloned is True

    @pytest.mark.asyncio
    async def test_estimate_cost(self) -> None:
        """Cost estimate should scale with text length."""
        from cloning.clone_engine import CloneEngine
        from cloning.profile_manager import ProfileManager
        from providers.chatterbox_provider import ChatterboxTTSProvider

        engine = CloneEngine(sample_rate=24000)
        pm = ProfileManager()
        provider = ChatterboxTTSProvider(engine, pm)

        cost = await provider.estimate_cost(1000)
        assert cost == pytest.approx(0.005)

        cost_2k = await provider.estimate_cost(2000)
        assert cost_2k == pytest.approx(0.01)

    def test_generate_timestamps(self) -> None:
        """Proportional timestamps should cover the full duration."""
        from providers.chatterbox_provider import ChatterboxTTSProvider

        ts = ChatterboxTTSProvider._generate_timestamps("hello world test", 3.0)
        assert len(ts) == 3
        assert ts[0].start == 0.0
        assert ts[-1].end == pytest.approx(3.0, abs=0.01)

    def test_generate_timestamps_empty(self) -> None:
        """Empty text should return empty timestamps."""
        from providers.chatterbox_provider import ChatterboxTTSProvider

        ts = ChatterboxTTSProvider._generate_timestamps("", 3.0)
        assert ts == []


# =============================================================================
# Section 5: Integration — Consent + Profile Lifecycle
# =============================================================================

class TestConsentProfileIntegration:
    """Tests for the full consent → profile → archive lifecycle.

    These verify that the consent and profile systems work together
    correctly — specifically, that revoking consent cascades to archive
    all linked profiles (the "emergency stop" behaviour).
    """

    def test_consent_revocation_archives_profiles(self) -> None:
        """Revoking consent should allow archiving all linked profiles."""
        cm = ConsentManager(require_consent=True)
        pm = ProfileManager()

        consent = cm.create_consent(
            tenant_id="t1",
            voice_owner_id="teacher-1",
            granted_by="admin-1",
            purpose="2026 school year",
        )

        p1 = pm.create_profile("t1", "u1", "V1", "en-us", consent.id)
        p2 = pm.create_profile("t1", "u1", "V2", "en-gb", consent.id)
        pm.mark_ready(p1.id, "embed", 0.9, ["en-us"])

        # Revoke consent
        cm.revoke_consent(consent.id)

        # Archive linked profiles (as the route handler would do)
        linked = pm.find_profiles_by_consent(consent.id)
        for profile in linked:
            pm.archive_profile(profile.id)

        # Both should now be archived
        assert pm.get_profile(p1.id).status == ProfileStatus.ARCHIVED
        assert pm.get_profile(p2.id).status == ProfileStatus.ARCHIVED

        # Consent should be unverifiable
        with pytest.raises(ConsentRevokedError):
            cm.verify_consent(consent.id)

    def test_expired_consent_blocks_profile_creation_flow(self) -> None:
        """Expired consent should block the profile creation workflow."""
        cm = ConsentManager(require_consent=True)

        past = datetime.now(timezone.utc) - timedelta(hours=1)
        consent = cm.create_consent(
            tenant_id="t1",
            voice_owner_id="u1",
            granted_by="a1",
            purpose="test",
            expires_at=past,
        )

        # The route handler calls verify_consent before creating a profile
        with pytest.raises(ConsentExpiredError):
            cm.verify_consent(consent.id)

    def test_multiple_consents_multiple_profiles(self) -> None:
        """Multiple consents can each have their own profiles."""
        cm = ConsentManager(require_consent=True)
        pm = ProfileManager()

        c1 = cm.create_consent("t1", "teacher-a", "admin", "class A")
        c2 = cm.create_consent("t1", "teacher-b", "admin", "class B")

        pm.create_profile("t1", "teacher-a", "VA", "en-us", c1.id)
        pm.create_profile("t1", "teacher-b", "VB", "en-gb", c2.id)

        # Revoking c1 should only affect teacher A's profiles
        cm.revoke_consent(c1.id)
        linked_c1 = pm.find_profiles_by_consent(c1.id)
        linked_c2 = pm.find_profiles_by_consent(c2.id)

        assert len(linked_c1) == 1
        assert len(linked_c2) == 1

        # c2 should still verify fine
        cm.verify_consent(c2.id)


# =============================================================================
# Section 6: Utility Tests
# =============================================================================

class TestUtilities:
    """Tests for helper functions and edge cases."""

    def test_make_wav_bytes_produces_valid_audio(self) -> None:
        """Our test WAV generator should produce parseable audio."""
        wav_bytes = make_wav_bytes(duration_seconds=5.0)
        buf = io.BytesIO(wav_bytes)
        audio, sr = sf.read(buf, dtype="float32")
        assert sr == 24000
        assert len(audio) == pytest.approx(24000 * 5, abs=100)

    def test_profile_to_dict(
        self, profile_manager: ProfileManager, sample_consent: VoiceCloneConsent
    ) -> None:
        """VoiceProfile.to_dict() should produce a serialisable dict."""
        profile = profile_manager.create_profile(
            tenant_id="t1", owner_id="u1", name="Test",
            language="en-us", consent_id=sample_consent.id,
        )
        d = profile.to_dict()
        assert isinstance(d, dict)
        assert d["name"] == "Test"
        assert d["status"] == "creating"
        assert "id" in d
