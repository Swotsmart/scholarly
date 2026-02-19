# =============================================================================
# SCHOLARLY VOICE SERVICE — STT Routes
# =============================================================================
# Speech-to-Text endpoints powering the read-aloud experience.
# Audio uploaded as multipart/form-data (binary transfer, not base64).
# =============================================================================

from __future__ import annotations

import logging
import time
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.config import Settings
from app.dependencies import get_registry, get_settings
from app.routes.health import REQUEST_COUNT, REQUEST_LATENCY, STT_INFERENCE_TIME
from models.schemas import (
    CostEstimate,
    PronunciationAssessmentResponse,
    PronunciationScore,
    TranscribeResponse,
    TranscriptionSegment,
    WordTimestamp,
)
from providers.base import NoProviderAvailableError, ProviderError
from providers.registry import ProviderRegistry, RoutingFilters

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/stt", tags=["stt"])


@router.post(
    "/transcribe",
    response_model=TranscribeResponse,
    summary="Transcribe audio to text",
    description="Transcribe audio with word-level timestamps. Supports auto-detection or language hints.",
)
async def transcribe(
    audio: UploadFile = File(..., description="Audio file (WAV, MP3, OGG, FLAC)"),
    language: Optional[str] = Form(None, description="Language hint (BCP-47)"),
    word_timestamps: bool = Form(True, description="Include word-level timestamps"),
    provider: Optional[str] = Form(None, description="Force specific provider"),
    registry: ProviderRegistry = Depends(get_registry),
    settings: Settings = Depends(get_settings),
) -> TranscribeResponse:
    start_time = time.monotonic()
    endpoint = "/api/v1/stt/transcribe"

    try:
        audio_data = await audio.read()
        if not audio_data:
            raise HTTPException(status_code=400, detail="Empty audio file")
        if len(audio_data) > 50 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Audio file too large (max 50MB)")

        filters = RoutingFilters(language=language, preferred_provider=provider)
        try:
            stt_provider = registry.get_stt(filters)
        except NoProviderAvailableError:
            REQUEST_COUNT.labels(endpoint=endpoint, method="POST", status="503").inc()
            raise HTTPException(status_code=503, detail="No STT provider available")

        result = await stt_provider.transcribe(
            audio_data, language=language, word_timestamps=word_timestamps,
        )

        registry.record_success(stt_provider.provider_id)
        STT_INFERENCE_TIME.labels(provider=stt_provider.provider_id).observe(result.compute_seconds)

        segments = [
            TranscriptionSegment(
                text=seg.text, start=seg.start, end=seg.end,
                words=[
                    WordTimestamp(word=w.word, start=w.start, end=w.end, confidence=w.confidence)
                    for w in seg.words
                ],
            )
            for seg in result.segments
        ]

        elapsed = time.monotonic() - start_time
        REQUEST_COUNT.labels(endpoint=endpoint, method="POST", status="200").inc()
        REQUEST_LATENCY.labels(endpoint=endpoint, method="POST").observe(elapsed)

        estimated_cost = (result.audio_seconds_processed / 60.0) * 0.003

        return TranscribeResponse(
            text=result.text, language=result.language, segments=segments,
            duration_seconds=result.duration_seconds,
            cost=CostEstimate(
                provider=result.provider_id, compute_seconds=result.compute_seconds,
                estimated_cost_usd=round(estimated_cost, 6), model=result.model_name,
                audio_seconds_processed=result.audio_seconds_processed,
            ),
        )

    except HTTPException:
        raise
    except ProviderError as e:
        registry.record_failure(e.provider_id)
        REQUEST_COUNT.labels(endpoint=endpoint, method="POST", status="500").inc()
        logger.error("STT error: %s", e)
        raise HTTPException(status_code=503 if e.retryable else 500, detail=str(e))
    except Exception:
        REQUEST_COUNT.labels(endpoint=endpoint, method="POST", status="500").inc()
        logger.exception("Unexpected STT error")
        raise HTTPException(status_code=500, detail="Transcription failed")


@router.post(
    "/assess-pronunciation",
    response_model=PronunciationAssessmentResponse,
    summary="Assess pronunciation",
    description="Compare read-aloud audio against expected text. Returns per-word and per-GPC scores.",
)
async def assess_pronunciation(
    audio: UploadFile = File(..., description="Audio of learner reading aloud"),
    expected_text: str = Form(..., description="Text the learner was supposed to read"),
    target_gpcs: Optional[str] = Form(None, description="Comma-separated target GPCs (e.g. 'sh,ch,th')"),
    language: str = Form("en-us", description="Language code (BCP-47)"),
    provider: Optional[str] = Form(None),
    registry: ProviderRegistry = Depends(get_registry),
) -> PronunciationAssessmentResponse:
    """The critical feedback loop: child reads aloud → score pronunciation →
    feed into BKT engine → update mastery estimates."""
    start_time = time.monotonic()
    endpoint = "/api/v1/stt/assess-pronunciation"

    try:
        audio_data = await audio.read()
        if not audio_data:
            raise HTTPException(status_code=400, detail="Empty audio file")
        if not expected_text.strip():
            raise HTTPException(status_code=400, detail="Expected text cannot be empty")

        gpcs = [g.strip() for g in target_gpcs.split(",") if g.strip()] if target_gpcs else []

        filters = RoutingFilters(language=language, preferred_provider=provider)
        try:
            stt_provider = registry.get_stt(filters)
        except NoProviderAvailableError:
            raise HTTPException(status_code=503, detail="No STT provider available")

        result = await stt_provider.assess_pronunciation(
            audio_data, expected_text, target_gpcs=gpcs, language=language,
        )

        registry.record_success(stt_provider.provider_id)

        words = [
            PronunciationScore(
                word=w.word, expected=w.expected, score=w.score,
                phonemes=[
                    {"phoneme": p.phoneme, "score": p.score, "start": p.start, "end": p.end}
                    for p in w.phonemes
                ],
                contains_target_gpc=w.contains_target_gpc,
            )
            for w in result.words
        ]

        elapsed = time.monotonic() - start_time
        REQUEST_COUNT.labels(endpoint=endpoint, method="POST", status="200").inc()
        REQUEST_LATENCY.labels(endpoint=endpoint, method="POST").observe(elapsed)

        estimated_cost = (result.duration_seconds / 60.0) * 0.003

        return PronunciationAssessmentResponse(
            overall_score=result.overall_score, words=words,
            gpc_scores=result.gpc_scores, fluency_wpm=result.fluency_wpm,
            duration_seconds=result.duration_seconds,
            cost=CostEstimate(
                provider=result.provider_id, compute_seconds=result.compute_seconds,
                estimated_cost_usd=round(estimated_cost, 6), model=result.model_name,
                audio_seconds_processed=result.duration_seconds,
            ),
        )

    except HTTPException:
        raise
    except ProviderError as e:
        registry.record_failure(e.provider_id)
        logger.error("Pronunciation error: %s", e)
        raise HTTPException(status_code=503 if e.retryable else 500, detail=str(e))
    except Exception:
        logger.exception("Unexpected pronunciation error")
        raise HTTPException(status_code=500, detail="Assessment failed")


@router.post(
    "/align",
    summary="Forced alignment",
    description="Given audio + transcript, produce exact word/phoneme timestamps via WhisperX.",
)
async def forced_alignment(
    audio: UploadFile = File(..., description="Audio file"),
    transcript: str = Form(..., description="Known transcript to align"),
    language: str = Form("en-us", description="Language code"),
    registry: ProviderRegistry = Depends(get_registry),
) -> dict[str, Any]:
    """Forced alignment for karaoke sync refinement and phoneme-level scoring."""
    try:
        audio_data = await audio.read()
        if not audio_data:
            raise HTTPException(status_code=400, detail="Empty audio file")

        filters = RoutingFilters(language=language)
        try:
            stt_provider = registry.get_stt(filters)
        except NoProviderAvailableError:
            raise HTTPException(status_code=503, detail="No STT provider available")

        result = await stt_provider.align(audio_data, transcript, language=language)
        registry.record_success(stt_provider.provider_id)

        return {
            "word_timestamps": [
                {"word": w.word, "start": w.start, "end": w.end, "confidence": w.confidence}
                for w in result.word_timestamps
            ],
            "phoneme_timestamps": [
                {"phoneme": p.phoneme, "score": p.score, "start": p.start, "end": p.end}
                for p in result.phoneme_timestamps
            ],
            "duration_seconds": result.duration_seconds,
            "provider": result.provider_id,
        }

    except HTTPException:
        raise
    except NotImplementedError as e:
        raise HTTPException(status_code=501, detail=f"{e}. WhisperX required.")
    except ProviderError as e:
        registry.record_failure(e.provider_id)
        raise HTTPException(status_code=503 if e.retryable else 500, detail=str(e))
