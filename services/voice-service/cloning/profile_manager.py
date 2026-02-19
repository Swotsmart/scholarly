# =============================================================================
# SCHOLARLY VOICE SERVICE — Voice Profile Manager
# =============================================================================
# A VoiceProfile is a teacher's vocal identity captured in a form that the
# Chatterbox model can use to synthesise new speech. Think of it as a
# fingerprint — not the finger itself, but a mathematical representation
# that uniquely identifies it. The profile stores the speaker embedding
# (a high-dimensional vector), references to the original audio samples,
# quality metrics, and lifecycle state.
#
# The ProfileManager is the librarian for these profiles: it handles
# creation, retrieval, update, deletion, and the quality assessment
# workflow. It coordinates with the ConsentManager (is this cloning
# authorised?) and the CloneEngine (extract the embedding from audio).
#
# Profile lifecycle:
#   CREATING → samples uploaded, normalised, quality checked
#   READY    → embedding extracted, profile usable for synthesis
#   FAILED   → embedding extraction failed (bad audio, GPU error)
#   ARCHIVED → consent revoked or profile manually archived
# =============================================================================

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Optional

logger = logging.getLogger(__name__)


class ProfileStatus(str, Enum):
    """Voice profile lifecycle states."""
    CREATING = "creating"
    READY = "ready"
    FAILED = "failed"
    ARCHIVED = "archived"


@dataclass
class VoiceProfileSample:
    """An individual audio sample within a voice profile.

    Multiple samples improve clone quality — Chatterbox can work
    from as little as 6 seconds, but 30-60 seconds across multiple
    samples produces noticeably better results, particularly for
    capturing the speaker's tonal range and pacing patterns.
    """
    id: str
    profile_id: str
    audio_url: str
    duration_ms: int
    normalised: bool = False
    quality_assessment: Optional[dict[str, Any]] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class VoiceProfile:
    """A teacher's cloned voice profile.

    The embedding_url points to the serialised speaker embedding that
    Chatterbox uses during inference. Once the embedding is extracted,
    synthesis with this voice requires only the embedding + text —
    the original audio samples are retained for quality assessment
    and re-extraction, not for inference.
    """
    id: str
    tenant_id: str
    owner_id: str
    name: str
    language: str
    consent_id: str
    provider: str = "chatterbox"
    status: ProfileStatus = ProfileStatus.CREATING
    embedding_url: Optional[str] = None
    quality_score: Optional[float] = None
    sample_count: int = 0
    verified_languages: list[str] = field(default_factory=list)
    description: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> dict[str, Any]:
        """Serialise for API responses."""
        return {
            "id": self.id,
            "tenant_id": self.tenant_id,
            "owner_id": self.owner_id,
            "name": self.name,
            "language": self.language,
            "provider": self.provider,
            "status": self.status.value,
            "embedding_url": self.embedding_url,
            "quality_score": self.quality_score,
            "sample_count": self.sample_count,
            "verified_languages": self.verified_languages,
            "description": self.description,
            "consent_id": self.consent_id,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class ProfileNotFoundError(Exception):
    """Raised when a voice profile doesn't exist."""
    def __init__(self, profile_id: str):
        super().__init__(f"Voice profile '{profile_id}' not found")
        self.profile_id = profile_id


class ProfileStateError(Exception):
    """Raised when an operation is invalid for the current profile state."""
    def __init__(self, profile_id: str, current_status: str, attempted_action: str):
        super().__init__(
            f"Cannot {attempted_action} profile '{profile_id}' "
            f"in status '{current_status}'"
        )
        self.profile_id = profile_id


class ProfileManager:
    """CRUD operations for voice profiles and their samples.

    In-memory implementation for development and standalone deployments.
    In production, this would be backed by Prisma queries via the
    Scholarly platform API — the VoiceProfile and VoiceProfileSample
    Prisma models mirror the dataclasses defined here.

    Thread Safety: All mutations are synchronous and happen on the
    event loop thread. If concurrent access is needed (multiple
    Uvicorn workers), replace with a database-backed implementation.
    """

    def __init__(self, max_samples_per_profile: int = 10) -> None:
        self._profiles: dict[str, VoiceProfile] = {}
        self._samples: dict[str, list[VoiceProfileSample]] = {}
        self._max_samples = max_samples_per_profile

    # -------------------------------------------------------------------------
    # Profile CRUD
    # -------------------------------------------------------------------------

    def create_profile(
        self,
        *,
        tenant_id: str,
        owner_id: str,
        name: str,
        language: str,
        consent_id: str,
        description: Optional[str] = None,
    ) -> VoiceProfile:
        """Create a new voice profile in CREATING state.

        The profile starts empty — audio samples are added separately via
        add_sample(), and the embedding is extracted via the CloneEngine
        once enough samples are collected.
        """
        profile = VoiceProfile(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            owner_id=owner_id,
            name=name,
            language=language,
            consent_id=consent_id,
            description=description,
        )
        self._profiles[profile.id] = profile
        self._samples[profile.id] = []

        logger.info(
            "Profile created: id=%s, name='%s', owner=%s, tenant=%s",
            profile.id, name, owner_id, tenant_id,
        )
        return profile

    def get_profile(self, profile_id: str) -> VoiceProfile:
        """Retrieve a profile by ID."""
        profile = self._profiles.get(profile_id)
        if profile is None:
            raise ProfileNotFoundError(profile_id)
        return profile

    def list_profiles(
        self,
        tenant_id: Optional[str] = None,
        owner_id: Optional[str] = None,
        status: Optional[ProfileStatus] = None,
    ) -> list[VoiceProfile]:
        """List profiles with optional filters."""
        results = list(self._profiles.values())

        if tenant_id:
            results = [p for p in results if p.tenant_id == tenant_id]
        if owner_id:
            results = [p for p in results if p.owner_id == owner_id]
        if status:
            results = [p for p in results if p.status == status]

        return sorted(results, key=lambda p: p.updated_at, reverse=True)

    def update_profile(
        self,
        profile_id: str,
        *,
        name: Optional[str] = None,
        description: Optional[str] = None,
        language: Optional[str] = None,
    ) -> VoiceProfile:
        """Update mutable profile fields."""
        profile = self.get_profile(profile_id)

        if profile.status == ProfileStatus.ARCHIVED:
            raise ProfileStateError(profile_id, profile.status.value, "update")

        if name is not None:
            profile.name = name
        if description is not None:
            profile.description = description
        if language is not None:
            profile.language = language

        profile.updated_at = datetime.now(timezone.utc)
        logger.info("Profile updated: id=%s", profile_id)
        return profile

    def delete_profile(self, profile_id: str) -> None:
        """Permanently delete a profile and its samples.

        In production, this would be a soft delete (status → ARCHIVED).
        Hard deletion is available here for development convenience.
        """
        if profile_id not in self._profiles:
            raise ProfileNotFoundError(profile_id)

        del self._profiles[profile_id]
        self._samples.pop(profile_id, None)
        logger.info("Profile deleted: id=%s", profile_id)

    def archive_profile(self, profile_id: str) -> VoiceProfile:
        """Archive a profile. Used when consent is revoked."""
        profile = self.get_profile(profile_id)
        profile.status = ProfileStatus.ARCHIVED
        profile.updated_at = datetime.now(timezone.utc)
        logger.info("Profile archived: id=%s (consent revocation)", profile_id)
        return profile

    # -------------------------------------------------------------------------
    # Sample Management
    # -------------------------------------------------------------------------

    def add_sample(
        self,
        profile_id: str,
        *,
        audio_url: str,
        duration_ms: int,
        normalised: bool = False,
        quality_assessment: Optional[dict[str, Any]] = None,
    ) -> VoiceProfileSample:
        """Add an audio sample to a profile.

        Validates that the profile is in a state that accepts samples
        and that the sample limit hasn't been reached.
        """
        profile = self.get_profile(profile_id)

        if profile.status not in (ProfileStatus.CREATING, ProfileStatus.READY):
            raise ProfileStateError(
                profile_id, profile.status.value, "add sample to"
            )

        samples = self._samples.get(profile_id, [])
        if len(samples) >= self._max_samples:
            raise ValueError(
                f"Profile '{profile_id}' has reached the maximum "
                f"of {self._max_samples} samples"
            )

        sample = VoiceProfileSample(
            id=str(uuid.uuid4()),
            profile_id=profile_id,
            audio_url=audio_url,
            duration_ms=duration_ms,
            normalised=normalised,
            quality_assessment=quality_assessment,
        )
        samples.append(sample)
        self._samples[profile_id] = samples

        profile.sample_count = len(samples)
        profile.updated_at = datetime.now(timezone.utc)

        logger.info(
            "Sample added to profile %s: id=%s, duration=%dms, total=%d",
            profile_id, sample.id, duration_ms, len(samples),
        )
        return sample

    def get_samples(self, profile_id: str) -> list[VoiceProfileSample]:
        """Get all audio samples for a profile."""
        if profile_id not in self._profiles:
            raise ProfileNotFoundError(profile_id)
        return self._samples.get(profile_id, [])

    def get_total_sample_duration_ms(self, profile_id: str) -> int:
        """Total duration of all samples in milliseconds."""
        samples = self.get_samples(profile_id)
        return sum(s.duration_ms for s in samples)

    # -------------------------------------------------------------------------
    # Status Transitions
    # -------------------------------------------------------------------------

    def mark_ready(
        self,
        profile_id: str,
        *,
        embedding_url: str,
        quality_score: float,
        verified_languages: Optional[list[str]] = None,
    ) -> VoiceProfile:
        """Transition profile to READY after successful embedding extraction."""
        profile = self.get_profile(profile_id)

        if profile.status not in (ProfileStatus.CREATING, ProfileStatus.FAILED):
            raise ProfileStateError(profile_id, profile.status.value, "mark ready")

        profile.status = ProfileStatus.READY
        profile.embedding_url = embedding_url
        profile.quality_score = quality_score
        profile.verified_languages = verified_languages or [profile.language]
        profile.updated_at = datetime.now(timezone.utc)

        logger.info(
            "Profile ready: id=%s, quality=%.2f, languages=%s",
            profile_id, quality_score, profile.verified_languages,
        )
        return profile

    def mark_failed(self, profile_id: str, reason: str = "") -> VoiceProfile:
        """Transition profile to FAILED after embedding extraction failure."""
        profile = self.get_profile(profile_id)
        profile.status = ProfileStatus.FAILED
        profile.updated_at = datetime.now(timezone.utc)
        logger.warning("Profile failed: id=%s, reason=%s", profile_id, reason)
        return profile

    # -------------------------------------------------------------------------
    # Queries
    # -------------------------------------------------------------------------

    def get_ready_profiles_for_tenant(self, tenant_id: str) -> list[VoiceProfile]:
        """Get all READY profiles for a tenant — these are available for synthesis."""
        return self.list_profiles(tenant_id=tenant_id, status=ProfileStatus.READY)

    def find_profiles_by_consent(self, consent_id: str) -> list[VoiceProfile]:
        """Find all profiles linked to a consent record.
        Used during consent revocation to archive affected profiles.
        """
        return [
            p for p in self._profiles.values()
            if p.consent_id == consent_id
        ]
