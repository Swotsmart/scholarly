# =============================================================================
# SCHOLARLY VOICE SERVICE — Cloning Routes
# =============================================================================
# Voice cloning API endpoints. These are the most sensitive endpoints in
# the entire service — they create digital representations of real
# people's voices. Every operation goes through the consent verification
# gate before anything happens.
#
# Endpoint groups:
#   /api/v1/cloning/consent   — Manage consent records
#   /api/v1/cloning/profiles  — CRUD for voice profiles
#   /api/v1/cloning/profiles/{id}/samples — Audio sample management
#   /api/v1/cloning/profiles/{id}/build   — Trigger embedding extraction
# =============================================================================

from __future__ import annotations

import io
import logging
import time
from typing import Any, Optional

import numpy as np
import soundfile as sf
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.config import Settings
from app.dependencies import get_settings, get_storage
from app.routes.health import REQUEST_COUNT, REQUEST_LATENCY
from cloning.clone_engine import CloneEngine
from cloning.consent import (
    ConsentError,
    ConsentExpiredError,
    ConsentManager,
    ConsentNotFoundError,
    ConsentRevokedError,
)
from cloning.profile_manager import (
    ProfileManager,
    ProfileNotFoundError,
    ProfileStateError,
    ProfileStatus,
)
from models.schemas import (
    ConsentRequest,
    ConsentResponse,
    CostEstimate,
    CreateVoiceProfileRequest,
    VoiceProfileResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/cloning", tags=["cloning"])


# =============================================================================
# Module-Level Singletons (initialised during app lifespan)
# =============================================================================
# These are set up by the dependency injection layer during startup.
# Route handlers access them via Depends() functions below.

_consent_manager: Optional[ConsentManager] = None
_profile_manager: Optional[ProfileManager] = None
_clone_engine: Optional[CloneEngine] = None


def init_cloning_dependencies(
    consent_manager: ConsentManager,
    profile_manager: ProfileManager,
    clone_engine: CloneEngine,
) -> None:
    """Initialise cloning module dependencies. Called during app startup."""
    global _consent_manager, _profile_manager, _clone_engine
    _consent_manager = consent_manager
    _profile_manager = profile_manager
    _clone_engine = clone_engine


def get_consent_manager() -> ConsentManager:
    """FastAPI dependency: get the consent manager."""
    if _consent_manager is None:
        raise RuntimeError("Consent manager not initialised")
    return _consent_manager


def get_profile_manager() -> ProfileManager:
    """FastAPI dependency: get the profile manager."""
    if _profile_manager is None:
        raise RuntimeError("Profile manager not initialised")
    return _profile_manager


def get_clone_engine() -> CloneEngine:
    """FastAPI dependency: get the clone engine."""
    if _clone_engine is None:
        raise RuntimeError("Clone engine not initialised")
    return _clone_engine


# =============================================================================
# CONSENT ENDPOINTS
# =============================================================================

@router.post(
    "/consent",
    response_model=ConsentResponse,
    summary="Grant voice cloning consent",
    description=(
        "Create a consent record authorising voice cloning for a specific person. "
        "This MUST be created before any cloning operations can proceed."
    ),
)
async def create_consent(
    request: ConsentRequest,
    consent_mgr: ConsentManager = Depends(get_consent_manager),
) -> ConsentResponse:
    """The signing ceremony: establish consent before any cloning.

    In a school context, this might be:
    - A teacher consenting to have their own voice cloned
    - A school administrator granting consent on behalf of staff
      (with appropriate delegation authority)

    The consent record is permanently linked to any voice profiles
    created under it. If consent is revoked, all linked profiles
    are archived.
    """
    try:
        consent = consent_mgr.create_consent(
            tenant_id="default",  # In production, from authenticated session
            voice_owner_id=request.voice_owner_id,
            granted_by=request.granted_by,
            purpose=request.purpose,
            expires_at=request.expires_at,
        )

        return ConsentResponse(
            id=consent.id,
            voice_owner_id=consent.voice_owner_id,
            purpose=consent.purpose,
            granted_by=consent.granted_by,
            granted_at=consent.granted_at,
            expires_at=consent.expires_at,
            revoked=False,
        )
    except Exception as e:
        logger.error("Failed to create consent: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to create consent: {e}")


@router.get(
    "/consent/{consent_id}",
    response_model=ConsentResponse,
    summary="Get consent record",
)
async def get_consent(
    consent_id: str,
    consent_mgr: ConsentManager = Depends(get_consent_manager),
) -> ConsentResponse:
    """Retrieve a consent record by ID."""
    try:
        consent = consent_mgr.get_consent(consent_id)
        return ConsentResponse(
            id=consent.id,
            voice_owner_id=consent.voice_owner_id,
            purpose=consent.purpose,
            granted_by=consent.granted_by,
            granted_at=consent.granted_at,
            expires_at=consent.expires_at,
            revoked=consent.revoked_at is not None,
        )
    except ConsentNotFoundError:
        raise HTTPException(status_code=404, detail=f"Consent '{consent_id}' not found")


@router.delete(
    "/consent/{consent_id}",
    summary="Revoke consent",
    description=(
        "Revoke voice cloning consent. This archives all associated "
        "voice profiles — no new cloning is permitted, but already-generated "
        "audio continues to work."
    ),
)
async def revoke_consent(
    consent_id: str,
    consent_mgr: ConsentManager = Depends(get_consent_manager),
    profile_mgr: ProfileManager = Depends(get_profile_manager),
) -> dict[str, Any]:
    """Revoke consent and archive all linked profiles.

    This is the "emergency stop" — once consent is revoked, the voice
    profile cannot be used for any new synthesis. Existing audio that
    was already generated is not affected (it's just audio data, not
    a live clone).
    """
    try:
        consent = consent_mgr.revoke_consent(consent_id)

        # Archive all profiles linked to this consent
        affected_profiles = profile_mgr.find_profiles_by_consent(consent_id)
        archived_count = 0
        for profile in affected_profiles:
            if profile.status != ProfileStatus.ARCHIVED:
                profile_mgr.archive_profile(profile.id)
                archived_count += 1

        return {
            "consent_id": consent_id,
            "revoked": True,
            "revoked_at": consent.revoked_at.isoformat() if consent.revoked_at else None,
            "profiles_archived": archived_count,
        }
    except ConsentNotFoundError:
        raise HTTPException(status_code=404, detail=f"Consent '{consent_id}' not found")


# =============================================================================
# PROFILE ENDPOINTS
# =============================================================================

@router.post(
    "/profiles",
    response_model=VoiceProfileResponse,
    summary="Create voice profile",
    description=(
        "Create a new voice profile. Requires a valid consent_id. "
        "After creation, upload audio samples via the /samples endpoint, "
        "then trigger embedding extraction via /build."
    ),
)
async def create_profile(
    name: str = Form(..., description="Profile display name"),
    language: str = Form("en-us", description="Primary language"),
    consent_id: str = Form(..., description="Consent record ID"),
    description: Optional[str] = Form(None, description="Optional description"),
    consent_mgr: ConsentManager = Depends(get_consent_manager),
    profile_mgr: ProfileManager = Depends(get_profile_manager),
) -> VoiceProfileResponse:
    """Create a new voice profile after verifying consent.

    The workflow is:
    1. POST /consent → get consent_id
    2. POST /profiles (this endpoint) → get profile_id
    3. POST /profiles/{id}/samples → upload audio samples
    4. POST /profiles/{id}/build → extract embedding
    5. Use voice_id='clone:{profile_id}' in /tts/synthesize
    """
    # Step 1: Verify consent is active
    try:
        consent_mgr.verify_consent(consent_id)
    except ConsentNotFoundError:
        raise HTTPException(status_code=404, detail="Consent record not found")
    except ConsentExpiredError:
        raise HTTPException(status_code=403, detail="Consent has expired")
    except ConsentRevokedError:
        raise HTTPException(status_code=403, detail="Consent has been revoked")

    # Step 2: Create the profile
    try:
        profile = profile_mgr.create_profile(
            tenant_id="default",
            owner_id="default",  # In production, from auth session
            name=name,
            language=language,
            consent_id=consent_id,
            description=description,
        )

        return VoiceProfileResponse(
            id=profile.id,
            tenant_id=profile.tenant_id,
            owner_id=profile.owner_id,
            name=profile.name,
            language=profile.language,
            provider="chatterbox",
            status=profile.status.value,
            quality_score=profile.quality_score,
            sample_count=profile.sample_count,
            verified_languages=profile.verified_languages,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
    except Exception as e:
        logger.error("Failed to create profile: %s", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/profiles",
    summary="List voice profiles",
)
async def list_profiles(
    status: Optional[str] = None,
    profile_mgr: ProfileManager = Depends(get_profile_manager),
) -> dict[str, Any]:
    """List all voice profiles for the current tenant."""
    status_filter = ProfileStatus(status) if status else None
    profiles = profile_mgr.list_profiles(status=status_filter)
    return {
        "profiles": [p.to_dict() for p in profiles],
        "total": len(profiles),
    }


@router.get(
    "/profiles/{profile_id}",
    response_model=VoiceProfileResponse,
    summary="Get voice profile",
)
async def get_profile(
    profile_id: str,
    profile_mgr: ProfileManager = Depends(get_profile_manager),
) -> VoiceProfileResponse:
    """Get a specific voice profile by ID."""
    try:
        profile = profile_mgr.get_profile(profile_id)
        return VoiceProfileResponse(
            id=profile.id,
            tenant_id=profile.tenant_id,
            owner_id=profile.owner_id,
            name=profile.name,
            language=profile.language,
            provider=profile.provider,
            status=profile.status.value,
            quality_score=profile.quality_score,
            sample_count=profile.sample_count,
            verified_languages=profile.verified_languages,
            created_at=profile.created_at,
            updated_at=profile.updated_at,
        )
    except ProfileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")


@router.delete(
    "/profiles/{profile_id}",
    summary="Delete voice profile",
)
async def delete_profile(
    profile_id: str,
    profile_mgr: ProfileManager = Depends(get_profile_manager),
) -> dict[str, str]:
    """Delete a voice profile and all its samples."""
    try:
        profile_mgr.delete_profile(profile_id)
        return {"status": "deleted", "profile_id": profile_id}
    except ProfileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")


# =============================================================================
# SAMPLE ENDPOINTS
# =============================================================================

@router.post(
    "/profiles/{profile_id}/samples",
    summary="Upload audio sample",
    description=(
        "Upload an audio sample for a voice profile. Multiple samples "
        "improve clone quality. Minimum 6 seconds per sample."
    ),
)
async def upload_sample(
    profile_id: str,
    audio: UploadFile = File(..., description="Audio file (WAV, MP3, OGG, FLAC)"),
    profile_mgr: ProfileManager = Depends(get_profile_manager),
    engine: CloneEngine = Depends(get_clone_engine),
    settings: Settings = Depends(get_settings),
) -> dict[str, Any]:
    """Upload and validate an audio sample for voice cloning.

    The sample goes through:
    1. Audio decoding and format normalisation
    2. Quality validation (duration, noise, clipping)
    3. Storage (local FS or Azure Blob)
    4. Registration with the profile
    """
    # Verify profile exists and accepts samples
    try:
        profile = profile_mgr.get_profile(profile_id)
    except ProfileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")

    if profile.status not in (ProfileStatus.CREATING, ProfileStatus.READY):
        raise HTTPException(
            status_code=409,
            detail=f"Profile in '{profile.status.value}' state does not accept samples"
        )

    # Read and decode audio
    audio_data = await audio.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")

    try:
        buf = io.BytesIO(audio_data)
        audio_array, sample_rate = sf.read(buf, dtype="float32")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not decode audio: {e}")

    # Mono conversion
    if len(audio_array.shape) > 1:
        audio_array = audio_array.mean(axis=1)

    # Validate sample quality
    validation = engine.validate_sample(audio_array, sample_rate)

    if not validation.valid:
        return {
            "valid": False,
            "issues": validation.issues,
            "quality_metrics": validation.quality_metrics,
            "duration_seconds": validation.duration_seconds,
        }

    # Store the sample (simplified: store raw bytes)
    storage = get_storage()
    sample_key = f"samples/{profile_id}/{len(profile_mgr.get_samples(profile_id))}.wav"

    # Re-encode to WAV for consistent storage
    wav_buf = io.BytesIO()
    sf.write(wav_buf, audio_array, sample_rate, format="WAV", subtype="PCM_16")
    wav_buf.seek(0)
    audio_url = await storage.put(sample_key, wav_buf.read(), content_type="audio/wav")

    # Register with profile
    duration_ms = int(len(audio_array) / sample_rate * 1000)
    sample = profile_mgr.add_sample(
        profile_id,
        audio_url=audio_url,
        duration_ms=duration_ms,
        normalised=False,
        quality_assessment=validation.quality_metrics,
    )

    return {
        "valid": True,
        "sample_id": sample.id,
        "profile_id": profile_id,
        "duration_seconds": validation.duration_seconds,
        "quality_metrics": validation.quality_metrics,
        "total_samples": profile.sample_count,
        "total_duration_ms": profile_mgr.get_total_sample_duration_ms(profile_id),
    }


@router.get(
    "/profiles/{profile_id}/samples",
    summary="List samples for a profile",
)
async def list_samples(
    profile_id: str,
    profile_mgr: ProfileManager = Depends(get_profile_manager),
) -> dict[str, Any]:
    """List all audio samples for a voice profile."""
    try:
        samples = profile_mgr.get_samples(profile_id)
        return {
            "profile_id": profile_id,
            "samples": [
                {
                    "id": s.id,
                    "audio_url": s.audio_url,
                    "duration_ms": s.duration_ms,
                    "normalised": s.normalised,
                    "quality_assessment": s.quality_assessment,
                    "created_at": s.created_at.isoformat(),
                }
                for s in samples
            ],
            "total": len(samples),
            "total_duration_ms": profile_mgr.get_total_sample_duration_ms(profile_id),
        }
    except ProfileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")


# =============================================================================
# BUILD ENDPOINT
# =============================================================================

@router.post(
    "/profiles/{profile_id}/build",
    summary="Build voice profile (extract embedding)",
    description=(
        "Trigger embedding extraction from the uploaded samples. "
        "Requires at least one sample with minimum 6 seconds of audio. "
        "GPU required — returns 503 on CPU-only deployments."
    ),
)
async def build_profile(
    profile_id: str,
    profile_mgr: ProfileManager = Depends(get_profile_manager),
    engine: CloneEngine = Depends(get_clone_engine),
    consent_mgr: ConsentManager = Depends(get_consent_manager),
) -> dict[str, Any]:
    """Extract the speaker embedding and make the profile usable.

    This is the heavy-lifting step: it loads audio samples, feeds them
    through Chatterbox's speaker encoder, and stores the resulting
    embedding. After this, the profile can be used for synthesis
    via voice_id='clone:{profile_id}'.
    """
    start_time = time.monotonic()

    # Verify profile
    try:
        profile = profile_mgr.get_profile(profile_id)
    except ProfileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Profile '{profile_id}' not found")

    # Re-verify consent (it could have been revoked since profile creation)
    try:
        consent_mgr.verify_consent(profile.consent_id)
    except ConsentError as e:
        raise HTTPException(status_code=403, detail=str(e))

    # Verify we have samples
    samples = profile_mgr.get_samples(profile_id)
    if not samples:
        raise HTTPException(status_code=400, detail="No audio samples uploaded")

    total_duration_ms = profile_mgr.get_total_sample_duration_ms(profile_id)
    min_duration_ms = int(engine._min_sample_duration * 1000)
    if total_duration_ms < min_duration_ms:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Insufficient audio: {total_duration_ms}ms total, "
                f"minimum {min_duration_ms}ms required"
            ),
        )

    # Load audio samples
    storage = get_storage()
    audio_samples: list[tuple[np.ndarray, int]] = []

    for sample in samples:
        try:
            audio_bytes = await storage.get(
                sample.audio_url.replace("file:///", "/").replace("file://", "")
                if sample.audio_url.startswith("file://")
                else sample.audio_url
            )
            if audio_bytes:
                buf = io.BytesIO(audio_bytes)
                audio_array, sr = sf.read(buf, dtype="float32")
                if len(audio_array.shape) > 1:
                    audio_array = audio_array.mean(axis=1)
                audio_samples.append((audio_array, sr))
        except Exception as e:
            logger.warning("Failed to load sample %s: %s", sample.id, e)

    if not audio_samples:
        profile_mgr.mark_failed(profile_id, "Could not load any audio samples")
        raise HTTPException(status_code=500, detail="Failed to load audio samples")

    # Extract embedding
    try:
        result = await engine.extract_embedding(
            profile_id=profile_id,
            audio_samples=audio_samples,
            storage=storage,
        )

        # Update profile status
        profile_mgr.mark_ready(
            profile_id,
            embedding_url=result.embedding_url,
            quality_score=result.quality_score,
            verified_languages=result.verified_languages,
        )

        elapsed = time.monotonic() - start_time

        return {
            "profile_id": profile_id,
            "status": "ready",
            "quality_score": result.quality_score,
            "voice_id": f"clone:{profile_id}",
            "verified_languages": result.verified_languages,
            "compute_seconds": round(result.compute_seconds, 2),
            "total_build_seconds": round(elapsed, 2),
            "cost": {
                "provider": "chatterbox",
                "compute_seconds": round(result.compute_seconds, 2),
                "estimated_cost_usd": round(result.compute_seconds * 0.001, 6),
                "model": "chatterbox-tts",
            },
        }

    except RuntimeError as e:
        profile_mgr.mark_failed(profile_id, str(e))
        if "CUDA" in str(e) or "GPU" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Voice cloning requires a GPU. No CUDA device available.",
            )
        raise HTTPException(status_code=500, detail=f"Embedding extraction failed: {e}")
    except Exception as e:
        profile_mgr.mark_failed(profile_id, str(e))
        logger.exception("Build failed for profile %s", profile_id)
        raise HTTPException(status_code=500, detail=f"Profile build failed: {e}")
