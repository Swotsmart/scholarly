# =============================================================================
# SCHOLARLY VOICE SERVICE — Voice Cloning Consent Manager
# =============================================================================
# In education, voice cloning carries uniquely sensitive implications. A
# teacher's voice is deeply personal — it's how their students recognise
# them, how parents identify authority, and how the classroom community
# is built. Cloning it without explicit, verifiable consent would be a
# profound breach of trust.
#
# This module enforces a strict consent-before-cloning policy. Think of it
# as the notary at a real estate closing: nothing happens until the notary
# verifies that every signature is authentic, every party understands
# what they're agreeing to, and the documents are properly witnessed.
# No consent record? No cloning. Expired consent? No cloning. Revoked
# consent? Profile gets archived, synthesised audio keeps working (it's
# already generated), but no new cloning operations are permitted.
#
# The consent model lives in the Scholarly platform's Prisma schema
# (VoiceCloneConsent) — this module provides a local representation
# that the Voice Service uses for verification without requiring a
# direct database connection. Consent records flow in via the API
# (created by the platform, verified here) or are stored locally
# in standalone deployments.
# =============================================================================

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Optional

logger = logging.getLogger(__name__)


class ConsentStatus(str, Enum):
    """Lifecycle states for a consent record."""
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


@dataclass
class VoiceCloneConsent:
    """A consent record authorising the cloning of a specific person's voice.

    Every field serves a compliance purpose:
    - voice_owner_id: Whose voice is being cloned (the teacher)
    - granted_by: Who gave permission (could be the teacher themselves,
      or a school administrator with delegated authority)
    - purpose: Why the clone exists ("classroom narration for Year 3 phonics")
    - expires_at: Optional expiry — consent doesn't last forever by default
    - revoked_at: Set when consent is withdrawn; triggers profile archival
    """
    id: str
    tenant_id: str
    voice_owner_id: str
    granted_by: str
    purpose: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None

    @property
    def status(self) -> ConsentStatus:
        """Derive the current consent status from timestamps.

        Active: granted, not revoked, not expired.
        Revoked: explicitly withdrawn by the granter or owner.
        Expired: past the expiry date (if one was set).
        """
        if self.revoked_at is not None:
            return ConsentStatus.REVOKED
        if self.expires_at is not None and datetime.now(timezone.utc) > self.expires_at:
            return ConsentStatus.EXPIRED
        return ConsentStatus.ACTIVE

    @property
    def is_valid(self) -> bool:
        """Whether this consent currently permits cloning operations."""
        return self.status == ConsentStatus.ACTIVE


class ConsentError(Exception):
    """Raised when a cloning operation is attempted without valid consent."""

    def __init__(self, message: str, consent_id: Optional[str] = None):
        super().__init__(message)
        self.consent_id = consent_id


class ConsentNotFoundError(ConsentError):
    """No consent record exists for the given ID."""
    pass


class ConsentExpiredError(ConsentError):
    """Consent exists but has expired."""
    pass


class ConsentRevokedError(ConsentError):
    """Consent exists but has been revoked."""
    pass


class ConsentManager:
    """Manages voice cloning consent records.

    In a full Scholarly deployment, this reads from the Prisma-managed
    VoiceCloneConsent table via the platform API. In standalone mode,
    it maintains an in-memory store that can be populated via the
    Voice Service's own /api/v1/cloning/consent endpoint.

    The in-memory store is suitable for development and testing. For
    production, replace with a database-backed implementation or a
    client that calls the Scholarly API's consent endpoint.
    """

    def __init__(self, require_consent: bool = True) -> None:
        self._require_consent = require_consent
        self._store: dict[str, VoiceCloneConsent] = {}

    def create_consent(
        self,
        *,
        tenant_id: str,
        voice_owner_id: str,
        granted_by: str,
        purpose: str,
        expires_at: Optional[datetime] = None,
    ) -> VoiceCloneConsent:
        """Create a new consent record.

        This is the "signing ceremony" — once this record exists, cloning
        operations for this voice owner are permitted until the consent
        expires or is revoked.
        """
        consent = VoiceCloneConsent(
            id=str(uuid.uuid4()),
            tenant_id=tenant_id,
            voice_owner_id=voice_owner_id,
            granted_by=granted_by,
            purpose=purpose,
            granted_at=datetime.now(timezone.utc),
            expires_at=expires_at,
        )
        self._store[consent.id] = consent
        logger.info(
            "Consent created: id=%s, owner=%s, granted_by=%s, purpose='%s'",
            consent.id, voice_owner_id, granted_by, purpose,
        )
        return consent

    def get_consent(self, consent_id: str) -> VoiceCloneConsent:
        """Retrieve a consent record by ID.

        Raises ConsentNotFoundError if the ID doesn't exist.
        """
        consent = self._store.get(consent_id)
        if consent is None:
            raise ConsentNotFoundError(
                f"No consent record found with ID '{consent_id}'",
                consent_id=consent_id,
            )
        return consent

    def verify_consent(self, consent_id: str) -> VoiceCloneConsent:
        """Verify that a consent record is currently valid for cloning.

        This is the gatekeeper method — called before every cloning
        operation. It checks existence, expiry, and revocation status.

        Returns the consent record if valid.
        Raises ConsentNotFoundError, ConsentExpiredError, or
        ConsentRevokedError if not.
        """
        if not self._require_consent:
            # In development/standalone mode, consent can be disabled
            # via SVS_CLONING_REQUIRE_CONSENT=false. Never in production.
            logger.warning("Consent verification bypassed (require_consent=False)")
            return VoiceCloneConsent(
                id=consent_id or "bypassed",
                tenant_id="standalone",
                voice_owner_id="standalone",
                granted_by="standalone",
                purpose="development",
                granted_at=datetime.now(timezone.utc),
            )

        consent = self.get_consent(consent_id)

        if consent.status == ConsentStatus.REVOKED:
            raise ConsentRevokedError(
                f"Consent '{consent_id}' has been revoked (revoked at {consent.revoked_at})",
                consent_id=consent_id,
            )
        if consent.status == ConsentStatus.EXPIRED:
            raise ConsentExpiredError(
                f"Consent '{consent_id}' has expired (expired at {consent.expires_at})",
                consent_id=consent_id,
            )

        logger.debug("Consent verified: id=%s, owner=%s", consent.id, consent.voice_owner_id)
        return consent

    def revoke_consent(self, consent_id: str) -> VoiceCloneConsent:
        """Revoke a consent record. This is irreversible.

        When consent is revoked:
        - The consent status changes to REVOKED
        - Any associated VoiceProfiles should be archived
        - Already-generated audio continues to work (it's just audio)
        - No new cloning operations are permitted for this consent

        The profile archival is handled by the ProfileManager, not here —
        separation of concerns. This module only manages consent state.
        """
        consent = self.get_consent(consent_id)
        if consent.revoked_at is not None:
            logger.warning("Consent '%s' already revoked", consent_id)
            return consent

        consent.revoked_at = datetime.now(timezone.utc)
        logger.info("Consent revoked: id=%s, owner=%s", consent.id, consent.voice_owner_id)
        return consent

    def list_consents(
        self,
        tenant_id: Optional[str] = None,
        voice_owner_id: Optional[str] = None,
        active_only: bool = False,
    ) -> list[VoiceCloneConsent]:
        """List consent records with optional filters."""
        results = list(self._store.values())

        if tenant_id:
            results = [c for c in results if c.tenant_id == tenant_id]
        if voice_owner_id:
            results = [c for c in results if c.voice_owner_id == voice_owner_id]
        if active_only:
            results = [c for c in results if c.is_valid]

        return sorted(results, key=lambda c: c.granted_at, reverse=True)
