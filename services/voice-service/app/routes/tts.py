# =============================================================================
# SCHOLARLY VOICE SERVICE — TTS Routes
# =============================================================================
# Text-to-Speech API endpoints. These are the primary production endpoints
# that the Scholarly platform (via AIPAL adapter) and SDK developers call
# to generate speech from text.
#
# Every endpoint follows the same pattern:
# 1. Validate the request (Pydantic does this automatically)
# 2. Route to the right provider (via the registry)
# 3. Call the provider
# 4. Record metrics (for Prometheus)
# 5. Record circuit breaker feedback (success/failure)
# 6. Return the response with cost metadata
# =============================================================================

from __future__ import annotations

import base64
import logging
import time
from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_registry, get_settings, get_storage
from app.config import Settings
from app.routes.health import (
    REQUEST_COUNT,
    REQUEST_LATENCY,
    TTS_AUDIO_DURATION,
    TTS_INFERENCE_TIME,
    TTS_REALTIME_FACTOR,
)
from models.schemas import (
    AudioFormat,
    CostEstimate,
    CostEstimateRequest,
    NarrateBookRequest,
    NarrateBookResponse,
    NarratePageRequest,
    SynthesizeRequest,
    SynthesizeResponse,
    VoiceInfo,
    VoiceListResponse,
    WordTimestamp,
)
from providers.base import (
    NoProviderAvailableError,
    ProviderError,
    ProviderValidationError,
)
from providers.registry import ProviderRegistry, RoutingFilters

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/tts", tags=["tts"])


# =============================================================================
# POST /api/v1/tts/synthesize
# =============================================================================

@router.post(
    "/synthesize",
    response_model=SynthesizeResponse,
    summary="Generate speech from text",
    description=(
        "Synthesise audio from text with optional voice, language, and "
        "adjustment parameters. Returns audio data with word-level timestamps "
        "for karaoke-style highlighting."
    ),
)
async def synthesize(
    request: SynthesizeRequest,
    registry: ProviderRegistry = Depends(get_registry),
    settings: Settings = Depends(get_settings),
) -> SynthesizeResponse:
    """Core TTS endpoint. This is the workhorse that the AIPAL adapter
    (ScholarlyVoiceProvider.synthesize()) calls."""
    start_time = time.monotonic()
    endpoint = "/api/v1/tts/synthesize"

    try:
        # Build routing filters from request
        filters = RoutingFilters(
            language=request.language,
            cost_tier=request.cost_tier.value if request.cost_tier else None,
            preferred_provider=request.provider.value if request.provider else None,
        )

        # Route to the best provider
        provider = registry.get_tts(filters)

        # Synthesise
        result = await provider.synthesize(
            text=request.text,
            voice_id=request.voice_id or settings.tts.kokoro_default_voice,
            language=request.language,
            pace=request.pace,
            pitch=request.pitch,
            warmth=request.warmth,
        )

        # Record metrics
        registry.record_success(provider.provider_id)
        TTS_INFERENCE_TIME.labels(
            provider=provider.provider_id,
            voice=request.voice_id or "default",
        ).observe(result.compute_seconds)
        TTS_AUDIO_DURATION.labels(
            provider=provider.provider_id,
        ).observe(result.duration_seconds)
        if result.compute_seconds > 0:
            TTS_REALTIME_FACTOR.labels(
                provider=provider.provider_id,
                device="gpu" if provider.cost_tier == "standard" else "cpu",
            ).observe(result.duration_seconds / result.compute_seconds)

        # Build response
        word_timestamps = [
            WordTimestamp(
                word=wt.word,
                start=wt.start,
                end=wt.end,
                confidence=wt.confidence,
            )
            for wt in result.word_timestamps
        ]

        estimated_cost = await provider.estimate_cost(len(request.text))

        elapsed = time.monotonic() - start_time
        REQUEST_COUNT.labels(endpoint=endpoint, method="POST", status="200").inc()
        REQUEST_LATENCY.labels(endpoint=endpoint, method="POST").observe(elapsed)

        return SynthesizeResponse(
            audio_base64=base64.b64encode(result.audio_data).decode("ascii"),
            duration_seconds=result.duration_seconds,
            sample_rate=result.sample_rate,
            format=request.output_format,
            word_timestamps=word_timestamps,
            cost=CostEstimate(
                provider=result.provider_id,
                compute_seconds=result.compute_seconds,
                estimated_cost_usd=estimated_cost,
                model=result.model_name,
                characters_processed=result.characters_processed,
            ),
        )

    except NoProviderAvailableError as e:
        REQUEST_COUNT.labels(endpoint=endpoint, method="POST", status="503").inc()
        raise HTTPException(status_code=503, detail=str(e))
    except ProviderValidationError as e:
        REQUEST_COUNT.labels(endpoint=endpoint, method="POST", status="400").inc()
        raise HTTPException(status_code=400, detail=str(e))
    except ProviderError as e:
        registry.record_failure(e.provider_id)
        REQUEST_COUNT.labels(endpoint=endpoint, method="POST", status="500").inc()
        logger.error("TTS synthesis error: %s", e)
        raise HTTPException(
            status_code=500 if not e.retryable else 503,
            detail=str(e),
        )


# =============================================================================
# POST /api/v1/tts/narrate-page
# =============================================================================

@router.post(
    "/narrate-page",
    response_model=SynthesizeResponse,
    summary="Narrate a storybook page",
    description=(
        "Curriculum-aware narration for a single storybook page. "
        "Accepts target GPCs for per-word pace emphasis — words containing "
        "target grapheme-phoneme correspondences are slowed for phonics focus."
    ),
)
async def narrate_page(
    request: NarratePageRequest,
    registry: ProviderRegistry = Depends(get_registry),
    settings: Settings = Depends(get_settings),
) -> SynthesizeResponse:
    """Page narration with optional phonics-aware emphasis.

    If target_gpcs is empty, this behaves identically to /synthesize.
    If target_gpcs is provided, the emphasis processing (Sprint 29 Week 3)
    will slow words containing those GPCs after synthesis.

    For Sprint 29 Week 1, this generates narration at the base pace.
    Phonics-aware emphasis will be layered on in Week 3 when the
    audio processing pipeline is built.
    """
    # For now, delegate to the same synthesis path
    # Phonics-aware emphasis will be added in processing/phonics_narrator.py
    synth_request = SynthesizeRequest(
        text=request.text,
        voice_id=request.voice_id,
        language=request.language,
        pace=request.base_pace,
        output_format=request.output_format,
    )
    return await synthesize(synth_request, registry, settings)


# =============================================================================
# POST /api/v1/tts/narrate-book
# =============================================================================

@router.post(
    "/narrate-book",
    response_model=NarrateBookResponse,
    summary="Batch narrate a storybook",
    description=(
        "Narrate all pages of a storybook in a single request. "
        "Pages are processed concurrently for efficiency."
    ),
)
async def narrate_book(
    request: NarrateBookRequest,
    registry: ProviderRegistry = Depends(get_registry),
    settings: Settings = Depends(get_settings),
) -> NarrateBookResponse:
    """Batch narration endpoint. Processes pages sequentially for now
    (GPU serialisation means true concurrency won't help), but the
    API contract supports async job-based processing for future
    optimisation with multiple GPUs or CPU fallback.

    For a 12-page storybook at ~50 words per page, this takes roughly
    2-3 seconds on GPU (Kokoro at 210x realtime) or 10-15 seconds on CPU.
    """
    import asyncio

    pages: list[SynthesizeResponse] = []
    total_duration = 0.0
    total_compute = 0.0
    total_cost_usd = 0.0
    total_chars = 0

    # Process pages — sequential because GPU is serialised anyway
    for page in request.pages:
        page_request = SynthesizeRequest(
            text=page.text,
            voice_id=request.voice_id or page.voice_id,
            language=request.language or page.language,
            pace=page.base_pace,
            output_format=request.output_format,
        )
        result = await synthesize(page_request, registry, settings)
        pages.append(result)
        total_duration += result.duration_seconds
        total_compute += result.cost.compute_seconds
        total_cost_usd += result.cost.estimated_cost_usd
        total_chars += result.cost.characters_processed or 0

    provider_id = pages[0].cost.provider if pages else "unknown"
    model_name = pages[0].cost.model if pages else "unknown"

    return NarrateBookResponse(
        pages=pages,
        total_duration_seconds=total_duration,
        total_cost=CostEstimate(
            provider=provider_id,
            compute_seconds=total_compute,
            estimated_cost_usd=total_cost_usd,
            model=model_name,
            characters_processed=total_chars,
        ),
    )


# =============================================================================
# GET /api/v1/tts/voices
# =============================================================================

@router.get(
    "/voices",
    response_model=VoiceListResponse,
    summary="List available voices",
    description="List all available TTS voices. Filter by language, gender, or style.",
)
async def list_voices(
    language: str | None = None,
    gender: str | None = None,
    style: str | None = None,
    registry: ProviderRegistry = Depends(get_registry),
) -> VoiceListResponse:
    """Aggregate voices from all registered TTS providers.

    When cloned voice profiles are implemented (Sprint 29 Week 4),
    they'll appear here alongside built-in voices, tagged with
    is_cloned=True and the tenant's profile metadata.
    """
    all_voices: list[VoiceInfo] = []

    # Collect voices from all TTS providers
    for provider_info in registry.list_tts_providers():
        provider_id = provider_info["provider_id"]
        tts_reg = registry._tts_providers.get(provider_id)
        if tts_reg is None or not tts_reg.is_healthy:
            continue

        from providers.base import TTSProvider as TTSBase
        provider = tts_reg.provider
        if not isinstance(provider, TTSBase):
            continue

        try:
            provider_voices = await provider.list_voices(language=language)
            for v in provider_voices:
                # Apply optional filters
                if gender and v.gender.lower() != gender.lower():
                    continue
                if style and v.style.lower() != style.lower():
                    continue

                all_voices.append(VoiceInfo(
                    voice_id=v.voice_id,
                    name=v.name,
                    language=v.language,
                    gender=v.gender,
                    style=v.style,
                    provider=v.provider_id,
                    is_cloned=v.is_cloned,
                    preview_url=v.preview_url,
                    supported_languages=v.supported_languages,
                ))
        except Exception as e:
            logger.warning(
                "Failed to list voices from provider '%s': %s",
                provider_id, e,
            )

    return VoiceListResponse(
        voices=all_voices,
        total=len(all_voices),
    )


# =============================================================================
# POST /api/v1/tts/estimate-cost
# =============================================================================

@router.post(
    "/estimate-cost",
    response_model=CostEstimate,
    summary="Estimate synthesis cost",
    description="Estimate compute cost for a given text length and provider.",
)
async def estimate_cost(
    request: CostEstimateRequest,
    registry: ProviderRegistry = Depends(get_registry),
) -> CostEstimate:
    """Cost estimation for billing transparency.

    Returns the estimated infrastructure cost (not including markup)
    for synthesising text of the given length. Schools can use this
    to understand what voice services actually cost them.
    """
    filters = RoutingFilters(
        cost_tier=request.cost_tier.value if request.cost_tier else None,
        preferred_provider=request.provider.value if request.provider else None,
    )

    try:
        provider = registry.get_tts(filters)
    except NoProviderAvailableError:
        raise HTTPException(status_code=503, detail="No TTS provider available")

    estimated_cost = await provider.estimate_cost(request.text_length)

    return CostEstimate(
        provider=provider.provider_id,
        compute_seconds=0.0,  # Estimate, not actual
        estimated_cost_usd=estimated_cost,
        model="estimated",
        characters_processed=request.text_length,
    )
