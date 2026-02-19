# =============================================================================
# SCHOLARLY VOICE SERVICE — Sprint 30, Week 2
# Alignment & Phonics Narration Routes
# =============================================================================
#
# New REST endpoints that expose the WhisperX alignment provider and
# phonics-aware narrator to the platform.
#
# Endpoints:
#   POST /api/v1/stt/align              — Forced alignment (karaoke sync)
#   POST /api/v1/studio/phonics-pace    — GPC-aware narration emphasis
#   GET  /api/v1/studio/phonics-pace/preview — Preview emphasis settings
#
# These routes follow the same patterns as the existing stt.py and studio.py
# routes from Sprint 29. In production, they're added to those files.
# For sprint delivery, they're in a separate module for clarity.
#
# Authentication: JWT (platform) or API key (SDK) — same as all other routes.
# =============================================================================

from __future__ import annotations

import base64
import logging
import time
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import JSONResponse

from models.alignment_schemas import (
    AlignRequest,
    AlignResponse,
    CostEstimate,
    GPCScore,
    PaceMapEntry,
    PhonicsPaceEmphasisSummary,
    PhonicsPaceRequest,
    PhonicsPaceResponse,
    PhonemeTimestamp,
    WordPronunciationScore,
    WordTimestamp,
    EnhancedPronunciationResponse,
)
from providers.whisperx_provider import WhisperXAlignmentProvider, WhisperXConfig
from providers.base import (
    AlignmentResult,
    ProviderError,
    ProviderUnavailableError,
    ProviderValidationError,
    WordTimestampResult,
)
from processing.phonics_narrator import (
    PhonicsNarrator,
    PhonicsNarratorConfig,
    PaceMapGenerator,
)

logger = logging.getLogger(__name__)

# =============================================================================
# Router Setup
# =============================================================================

alignment_router = APIRouter(tags=["alignment"])
phonics_router = APIRouter(tags=["phonics-narration"])


# =============================================================================
# Dependency Injection Stubs
# =============================================================================
# In production, these are wired by the DI container (dependencies.py).
# The stubs here allow the route module to be self-contained for testing.

_whisperx_provider: Optional[WhisperXAlignmentProvider] = None
_phonics_narrator: Optional[PhonicsNarrator] = None


def get_whisperx_provider() -> WhisperXAlignmentProvider:
    """Get the WhisperX alignment provider from DI container."""
    if _whisperx_provider is None:
        raise HTTPException(
            status_code=503,
            detail="WhisperX alignment provider not available",
        )
    return _whisperx_provider


def get_phonics_narrator() -> PhonicsNarrator:
    """Get the phonics narrator from DI container."""
    if _phonics_narrator is None:
        raise HTTPException(
            status_code=503,
            detail="Phonics narrator not available",
        )
    return _phonics_narrator


def set_providers(
    whisperx: WhisperXAlignmentProvider,
    narrator: PhonicsNarrator,
) -> None:
    """Wire providers from the DI container. Called during app startup."""
    global _whisperx_provider, _phonics_narrator
    _whisperx_provider = whisperx
    _phonics_narrator = narrator


# =============================================================================
# Section 1: Forced Alignment Endpoint
# =============================================================================

@alignment_router.post(
    "/api/v1/stt/align",
    response_model=AlignResponse,
    summary="Forced alignment: audio + transcript → precise timestamps",
    description=(
        "Given audio and a known transcript, produce precise word-level and "
        "phoneme-level timestamps using WhisperX forced alignment. "
        "Used post-TTS synthesis to generate karaoke-style highlighting "
        "data for the storybook reader."
    ),
    responses={
        400: {"description": "Invalid request (missing audio or transcript)"},
        503: {"description": "WhisperX provider not available"},
    },
)
async def align_audio(
    request: AlignRequest,
    provider: WhisperXAlignmentProvider = Depends(get_whisperx_provider),
) -> AlignResponse:
    """Forced alignment endpoint.

    Accepts audio + transcript and returns precise timestamps.
    This is the endpoint that makes karaoke-style highlighting possible
    in the storybook reader.
    """
    start_time = time.monotonic()

    # Resolve audio source
    audio_bytes = await _resolve_audio(request.audio_base64, request.audio_url)

    try:
        result: AlignmentResult = await provider.align(
            audio_bytes,
            request.transcript,
            language=request.language,
        )
    except ProviderValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ProviderUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ProviderError as e:
        logger.error("Alignment failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Alignment failed: {e}")

    compute_seconds = time.monotonic() - start_time

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

    phoneme_timestamps = []
    if request.include_phonemes:
        phoneme_timestamps = [
            PhonemeTimestamp(
                phoneme=pt.phoneme,
                expected=pt.expected,
                score=pt.score,
                start=pt.start,
                end=pt.end,
            )
            for pt in result.phoneme_timestamps
        ]

    # Average confidence
    confidences = [wt.confidence for wt in result.word_timestamps if wt.confidence is not None]
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

    return AlignResponse(
        word_timestamps=word_timestamps,
        phoneme_timestamps=phoneme_timestamps,
        duration_seconds=result.duration_seconds,
        word_count=len(word_timestamps),
        average_confidence=round(avg_confidence, 4),
        cost=CostEstimate(
            provider_id=result.provider_id,
            compute_seconds=round(compute_seconds, 3),
            estimated_cost_usd=round(compute_seconds * 0.001, 6),
        ),
    )


# =============================================================================
# Section 2: Phonics-Aware Narration Endpoint
# =============================================================================

@phonics_router.post(
    "/api/v1/studio/phonics-pace",
    response_model=PhonicsPaceResponse,
    summary="Apply phonics-aware pace emphasis to narration audio",
    description=(
        "Takes pre-synthesised narration audio and applies curriculum-aware "
        "pace adjustments. Words containing target GPCs are slowed for emphasis, "
        "creating a natural reading experience that draws the learner's ear "
        "to the phonics patterns they are practising."
    ),
    responses={
        400: {"description": "Invalid request"},
        503: {"description": "Service not available"},
    },
)
async def apply_phonics_pace(
    request: PhonicsPaceRequest,
    provider: WhisperXAlignmentProvider = Depends(get_whisperx_provider),
    narrator: PhonicsNarrator = Depends(get_phonics_narrator),
) -> PhonicsPaceResponse:
    """Phonics-aware narration endpoint.

    This is the endpoint the Storybook Engine calls after TTS synthesis
    to add curriculum-aware emphasis to narration audio.

    Flow:
    1. If word_timestamps not provided, run WhisperX alignment first
    2. Generate pace map from text + target GPCs + timestamps
    3. Apply pace adjustments to the audio
    4. Return adjusted audio + updated timestamps + pace map
    """
    start_time = time.monotonic()

    # Resolve audio
    audio_bytes = await _resolve_audio(request.audio_base64, request.audio_url)

    # Get word timestamps (from request or via alignment)
    if request.word_timestamps:
        word_ts = [
            WordTimestampResult(
                word=wt.word,
                start=wt.start,
                end=wt.end,
                confidence=wt.confidence,
            )
            for wt in request.word_timestamps
        ]
    else:
        # Run alignment to get timestamps
        try:
            alignment = await provider.align(
                audio_bytes,
                request.text,
                language=request.language,
            )
            word_ts = alignment.word_timestamps
        except ProviderError as e:
            raise HTTPException(
                status_code=500,
                detail=f"Alignment failed (needed for timestamp generation): {e}",
            )

    # Configure narrator with request parameters
    config = PhonicsNarratorConfig(
        emphasis_pace=request.emphasis_pace,
        strong_emphasis_pace=request.strong_emphasis_pace,
        smooth_transitions=request.smooth_transitions,
    )
    narrator_instance = PhonicsNarrator(config)

    # Apply phonics-aware pacing
    try:
        result = await narrator_instance.narrate_with_emphasis(
            audio_data=audio_bytes,
            sample_rate=24000,  # Kokoro's output sample rate
            text=request.text,
            word_timestamps=word_ts,
            target_gpcs=request.target_gpcs,
        )
    except Exception as e:
        logger.error("Phonics narration failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Phonics narration failed: {e}")

    compute_seconds = time.monotonic() - start_time

    # Build pace map response
    pace_map_entries = [
        PaceMapEntry(
            word=entry.word,
            original_start=entry.original_start,
            original_end=entry.original_end,
            adjusted_start=entry.adjusted_start,
            adjusted_end=entry.adjusted_end,
            pace_factor=entry.pace_factor,
            contains_target_gpc=entry.contains_target_gpc,
            matched_gpcs=entry.matched_gpcs,
        )
        for entry in result.pace_map.entries
    ]

    # Build emphasis summary
    matched_gpc_counts: dict[str, int] = {}
    for entry in result.pace_map.entries:
        for gpc in entry.matched_gpcs:
            matched_gpc_counts[gpc] = matched_gpc_counts.get(gpc, 0) + 1

    emphasised_count = sum(1 for e in result.pace_map.entries if e.contains_target_gpc)
    duration_increase = (
        (result.pace_map.total_adjusted_duration - result.pace_map.total_original_duration)
        / result.pace_map.total_original_duration * 100
        if result.pace_map.total_original_duration > 0
        else 0.0
    )

    # Word timestamps response
    word_timestamps_response = [
        WordTimestamp(
            word=wt.word,
            start=wt.start,
            end=wt.end,
            confidence=wt.confidence,
        )
        for wt in result.word_timestamps
    ]

    # Encode audio to base64
    audio_b64 = base64.b64encode(result.audio_data).decode("ascii")

    return PhonicsPaceResponse(
        audio_base64=audio_b64,
        audio_url=None,
        duration_seconds=result.duration_seconds,
        original_duration_seconds=result.pace_map.total_original_duration,
        word_timestamps=word_timestamps_response,
        pace_map=pace_map_entries,
        emphasis_summary=PhonicsPaceEmphasisSummary(
            total_words=len(result.pace_map.entries),
            emphasised_words=emphasised_count,
            target_gpcs=request.target_gpcs,
            matched_gpcs=matched_gpc_counts,
            duration_increase_percent=round(duration_increase, 1),
        ),
        cost=CostEstimate(
            provider_id="whisperx-aligner",
            compute_seconds=round(compute_seconds, 3),
            estimated_cost_usd=round(compute_seconds * 0.001, 6),
        ),
    )


# =============================================================================
# Section 3: Pace Map Preview Endpoint
# =============================================================================

@phonics_router.post(
    "/api/v1/studio/phonics-pace/preview",
    summary="Preview phonics pace map without processing audio",
    description=(
        "Generate a pace map preview showing which words would be emphasised "
        "and by how much, without actually processing the audio. Useful for "
        "the Educator Studio UI to show emphasis before committing to processing."
    ),
)
async def preview_phonics_pace(
    text: str = Form(..., description="The narration text"),
    target_gpcs: str = Form(
        ...,
        description="Comma-separated GPCs (e.g., 'th,a,igh')",
    ),
    emphasis_pace: float = Form(
        default=0.8,
        ge=0.5,
        le=1.0,
        description="Pace factor for emphasis words",
    ),
) -> JSONResponse:
    """Preview pace map without audio processing.

    This lightweight endpoint lets the Educator Studio show which words
    would be emphasised before the teacher commits to processing. It's
    the "preview" button in the Studio UI — instant feedback on how
    the GPC targeting will affect the narration.
    """
    gpcs = [g.strip().lower() for g in target_gpcs.split(",") if g.strip()]
    if not gpcs:
        raise HTTPException(status_code=400, detail="At least one GPC required")

    config = PhonicsNarratorConfig(emphasis_pace=emphasis_pace)
    generator = PaceMapGenerator(config)

    # Create synthetic word timestamps (evenly spaced, ~0.3s per word)
    words = text.strip().split()
    word_ts: list[WordTimestampResult] = []
    current_time = 0.0
    for word in words:
        # Estimate word duration based on length (rough approximation)
        duration = max(0.15, len(word) * 0.06)
        word_ts.append(WordTimestampResult(
            word=word,
            start=round(current_time, 3),
            end=round(current_time + duration, 3),
            confidence=None,
        ))
        current_time += duration + 0.05  # 50ms gap between words

    pace_map = generator.generate(text, word_ts, gpcs)

    return JSONResponse(content={
        "text": text,
        "target_gpcs": gpcs,
        "words": [
            {
                "word": e.word,
                "pace_factor": e.pace_factor,
                "contains_target_gpc": e.contains_target_gpc,
                "matched_gpcs": e.matched_gpcs,
                "estimated_original_duration": round(e.original_end - e.original_start, 3),
                "estimated_adjusted_duration": round(e.adjusted_end - e.adjusted_start, 3),
            }
            for e in pace_map.entries
        ],
        "summary": {
            "total_words": len(pace_map.entries),
            "emphasised_words": sum(1 for e in pace_map.entries if e.contains_target_gpc),
            "estimated_duration_increase_percent": round(
                (pace_map.total_adjusted_duration - pace_map.total_original_duration)
                / pace_map.total_original_duration * 100
                if pace_map.total_original_duration > 0 else 0.0,
                1,
            ),
        },
    })


# =============================================================================
# Section 4: Enhanced Pronunciation Assessment Endpoint
# =============================================================================

@alignment_router.post(
    "/api/v1/stt/assess-pronunciation/enhanced",
    response_model=EnhancedPronunciationResponse,
    summary="Enhanced pronunciation assessment with GPC-level scoring",
    description=(
        "Assess pronunciation at the phoneme level against expected text "
        "and target GPCs. Returns per-word scores, per-phoneme scores, "
        "and per-GPC accuracy scores that feed directly into the BKT engine "
        "for mastery estimation."
    ),
)
async def assess_pronunciation_enhanced(
    expected_text: str = Form(..., description="Text the learner was supposed to read"),
    target_gpcs: str = Form(
        default="",
        description="Comma-separated target GPCs for focused scoring",
    ),
    language: str = Form(default="en", description="Language code"),
    audio: UploadFile = File(..., description="Audio recording of the learner's reading"),
    provider: WhisperXAlignmentProvider = Depends(get_whisperx_provider),
) -> EnhancedPronunciationResponse:
    """Enhanced pronunciation assessment with GPC-level scoring.

    This endpoint replaces the basic /api/v1/stt/assess-pronunciation
    for use cases that need GPC-level granularity. The basic endpoint
    (served by WhisperSTTProvider) remains available for simple
    word-level assessment.
    """
    start_time = time.monotonic()

    # Read audio
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Parse GPCs
    gpcs = [g.strip().lower() for g in target_gpcs.split(",") if g.strip()] if target_gpcs else []

    try:
        result = await provider.assess_pronunciation(
            audio_bytes,
            expected_text,
            target_gpcs=gpcs or None,
            language=language,
        )
    except ProviderValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ProviderUnavailableError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ProviderError as e:
        logger.error("Enhanced pronunciation assessment failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    compute_seconds = time.monotonic() - start_time

    # Build per-word scores
    words = [
        WordPronunciationScore(
            word=w.word,
            expected=w.expected,
            score=w.score,
            error_type="none" if w.score >= 0.5 else "mispronunciation" if w.word else "omission",
            phonemes=[
                PhonemeTimestamp(
                    phoneme=p.phoneme,
                    expected=p.expected,
                    score=p.score,
                    start=p.start,
                    end=p.end,
                )
                for p in w.phonemes
            ],
            contains_target_gpc=w.contains_target_gpc,
            matched_gpcs=[],
        )
        for w in result.words
    ]

    # Build GPC scores
    gpc_scores = [
        GPCScore(
            gpc=gpc,
            score=score,
            occurrences=sum(1 for w in result.words if w.contains_target_gpc),
            mastered=score >= 0.75,
        )
        for gpc, score in result.gpc_scores.items()
    ]

    # Calculate sub-scores
    total_words = len(words)
    correct_words = sum(1 for w in words if w.score >= 0.5)
    spoken_words = sum(1 for w in words if w.word)

    accuracy = correct_words / total_words if total_words > 0 else 0.0
    completeness = spoken_words / total_words if total_words > 0 else 0.0

    # Fluency score (normalised WCPM against expected range)
    # A typical 6-year-old reads 50-80 WCPM
    fluency_normalised = min(result.fluency_wpm / 80.0, 1.0) if result.fluency_wpm > 0 else 0.0

    return EnhancedPronunciationResponse(
        overall_score=result.overall_score,
        accuracy_score=round(accuracy, 4),
        fluency_score=round(fluency_normalised, 4),
        completeness_score=round(completeness, 4),
        fluency_wpm=result.fluency_wpm,
        words=words,
        gpc_scores=gpc_scores,
        duration_seconds=result.duration_seconds,
        cost=CostEstimate(
            provider_id=result.provider_id,
            compute_seconds=round(compute_seconds, 3),
            estimated_cost_usd=round(compute_seconds * 0.001, 6),
        ),
    )


# =============================================================================
# Helpers
# =============================================================================

async def _resolve_audio(
    audio_base64: Optional[str],
    audio_url: Optional[str],
) -> bytes:
    """Resolve audio from base64 or URL.

    At least one source must be provided. Base64 is preferred for
    small files; URLs for large files already stored in blob storage.
    """
    if audio_base64:
        try:
            return base64.b64decode(audio_base64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 audio: {e}")

    if audio_url:
        try:
            import httpx
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(audio_url)
                response.raise_for_status()
                return response.content
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch audio URL: {e}")

    raise HTTPException(
        status_code=400,
        detail="Either audio_base64 or audio_url must be provided",
    )
