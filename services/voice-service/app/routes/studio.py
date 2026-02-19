# =============================================================================
# SCHOLARLY VOICE SERVICE — Studio Routes
# =============================================================================
# The Educator Voice Studio endpoints. These power the /teacher/voice-studio
# UI in the Scholarly dashboard, giving teachers post-generation controls
# over narration audio: adjust pace for struggling readers, shift pitch
# for different age groups, warm up the tone for bedtime mode.
#
# Each endpoint takes existing audio (URL or base64) and returns
# processed audio with recalculated timestamps and cost metadata.
# =============================================================================

from __future__ import annotations

import base64
import io
import logging
import time
from typing import Any, Optional

import numpy as np
import soundfile as sf
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.config import Settings
from app.dependencies import get_settings
from app.routes.health import REQUEST_COUNT, REQUEST_LATENCY
from models.schemas import (
    AdjustRequest,
    AdjustResponse,
    AudioFormat,
    AudioQualityReport,
    CostEstimate,
    NormaliseRequest,
    NormaliseResponse,
    PhonicsNarrateRequest,
    VariantResult,
    VariantSpec,
    VariantsRequest,
    VariantsResponse,
    WordTimestamp,
)
from processing.normaliser import AudioNormaliser, NormalisationConfig
from processing.tempo import adjust_tempo, adjust_emphasis, recalculate_timestamps
from processing.pitch import adjust_pitch, adjust_warmth
from processing.analysis import analyse_audio
from providers.base import WordTimestampResult

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/studio", tags=["studio"])


# =============================================================================
# Helpers
# =============================================================================

def _decode_audio_input(
    audio_base64: Optional[str] = None,
    audio_url: Optional[str] = None,
) -> tuple[np.ndarray, int]:
    """Decode audio from base64 or URL. Returns (array, sample_rate)."""
    if audio_base64:
        raw = base64.b64decode(audio_base64)
        buf = io.BytesIO(raw)
        audio, sr = sf.read(buf, dtype="float32")
    elif audio_url:
        raise HTTPException(
            status_code=501,
            detail="URL-based audio input not yet implemented. Use audio_base64.",
        )
    else:
        raise HTTPException(status_code=400, detail="Provide audio_base64 or audio_url")

    # Ensure mono
    if len(audio.shape) > 1:
        audio = audio.mean(axis=1)

    return audio, sr


def _encode_audio(audio: np.ndarray, sample_rate: int, fmt: AudioFormat = AudioFormat.WAV) -> str:
    """Encode numpy array to base64 audio string."""
    buf = io.BytesIO()
    sf.write(buf, audio, sample_rate, format=fmt.value.upper())
    buf.seek(0)
    return base64.b64encode(buf.read()).decode("ascii")


def _make_quality_report(audio: np.ndarray, sample_rate: int) -> AudioQualityReport:
    """Generate a quality report from audio data."""
    analysis = analyse_audio(audio, sample_rate)
    return AudioQualityReport(
        loudness_lufs=analysis.loudness_lufs or -99.0,
        peak_dbfs=analysis.peak_dbfs or -99.0,
        snr_db=analysis.snr_db or 0.0,
        pace_wpm=analysis.pace_wpm,
        pitch_hz_mean=analysis.pitch_hz_mean,
        pitch_hz_range=analysis.pitch_hz_range,
        silence_ratio=analysis.silence_ratio,
        duration_seconds=analysis.duration_seconds,
        sample_rate=analysis.sample_rate,
        channels=analysis.channels,
    )


def _cpu_cost(duration: float) -> CostEstimate:
    """Estimate cost for CPU-based audio processing (~$0.0005 per minute)."""
    return CostEstimate(
        provider="processing",
        compute_seconds=0.0,
        estimated_cost_usd=round((duration / 60) * 0.0005, 6),
        model="audio-processing",
    )


# =============================================================================
# POST /api/v1/studio/normalise
# =============================================================================

@router.post(
    "/normalise",
    response_model=NormaliseResponse,
    summary="Normalise audio",
    description="5-stage normalisation: loudness, noise gate, spectral denoise, silence trim, peak limiting.",
)
async def normalise(
    request: NormaliseRequest,
    settings: Settings = Depends(get_settings),
) -> NormaliseResponse:
    start_time = time.monotonic()

    audio, sr = _decode_audio_input(request.audio_base64, request.audio_url)
    quality_before = _make_quality_report(audio, sr)

    config = NormalisationConfig(
        target_lufs=request.target_lufs,
        spectral_enabled=request.denoise,
        trim_enabled=request.trim_silence,
    )
    normaliser = AudioNormaliser(config)
    result = normaliser.normalise(audio, sr)

    quality_after = _make_quality_report(result.audio, sr)
    encoded = _encode_audio(result.audio, sr, request.output_format)

    elapsed = time.monotonic() - start_time
    REQUEST_LATENCY.labels(endpoint="/api/v1/studio/normalise", method="POST").observe(elapsed)

    return NormaliseResponse(
        audio_base64=encoded,
        quality_before=quality_before,
        quality_after=quality_after,
        cost=_cpu_cost(result.duration_after),
    )


# =============================================================================
# POST /api/v1/studio/adjust
# =============================================================================

@router.post(
    "/adjust",
    response_model=AdjustResponse,
    summary="Adjust audio",
    description="Post-generation pace, pitch, and warmth controls. Independent — each can be applied alone.",
)
async def adjust(request: AdjustRequest) -> AdjustResponse:
    """The teacher's mixing desk: three independent knobs for pace, pitch,
    and warmth. Each is applied in order, and timestamps are recalculated
    after pace changes."""
    audio, sr = _decode_audio_input(request.audio_base64, request.audio_url)
    timestamps: list[WordTimestampResult] = []
    adjustments: dict[str, float] = {}

    # Pace adjustment (changes duration, recalculates timestamps)
    if request.pace != 1.0:
        tempo_result = adjust_tempo(audio, sr, request.pace, timestamps)
        audio = tempo_result.audio
        timestamps = tempo_result.timestamps
        adjustments["pace"] = request.pace

    # Pitch adjustment (changes frequency, not duration)
    if request.pitch != 0.0:
        pitch_result = adjust_pitch(audio, sr, request.pitch)
        audio = pitch_result.audio
        adjustments["pitch"] = request.pitch

    # Warmth/brightness EQ
    if request.warmth != 0.0:
        eq_result = adjust_warmth(audio, sr, request.warmth)
        audio = eq_result.audio
        adjustments["warmth"] = request.warmth

    encoded = _encode_audio(audio, sr, request.output_format)
    duration = len(audio) / sr

    return AdjustResponse(
        audio_base64=encoded,
        duration_seconds=round(duration, 3),
        word_timestamps=[
            WordTimestamp(word=t.word, start=t.start, end=t.end, confidence=t.confidence)
            for t in timestamps
        ],
        adjustments_applied=adjustments,
        cost=_cpu_cost(duration),
    )


# =============================================================================
# POST /api/v1/studio/adjust/preview
# =============================================================================

@router.post(
    "/adjust/preview",
    response_model=AdjustResponse,
    summary="Preview adjustment (first 5 seconds)",
    description="Same as /adjust but only processes the first 5 seconds for quick preview.",
)
async def adjust_preview(request: AdjustRequest) -> AdjustResponse:
    """Quick preview: process only the first 5 seconds so the teacher
    can hear the effect without waiting for the full file."""
    audio, sr = _decode_audio_input(request.audio_base64, request.audio_url)

    # Truncate to 5 seconds
    max_samples = sr * 5
    audio = audio[:max_samples]

    # Apply same adjustments as /adjust
    timestamps: list[WordTimestampResult] = []
    adjustments: dict[str, float] = {}

    if request.pace != 1.0:
        result = adjust_tempo(audio, sr, request.pace, timestamps)
        audio = result.audio
        timestamps = result.timestamps
        adjustments["pace"] = request.pace

    if request.pitch != 0.0:
        result = adjust_pitch(audio, sr, request.pitch)
        audio = result.audio
        adjustments["pitch"] = request.pitch

    if request.warmth != 0.0:
        result = adjust_warmth(audio, sr, request.warmth)
        audio = result.audio
        adjustments["warmth"] = request.warmth

    encoded = _encode_audio(audio, sr, request.output_format)

    return AdjustResponse(
        audio_base64=encoded,
        duration_seconds=round(len(audio) / sr, 3),
        word_timestamps=[
            WordTimestamp(word=t.word, start=t.start, end=t.end, confidence=t.confidence)
            for t in timestamps
        ],
        adjustments_applied=adjustments,
        cost=_cpu_cost(len(audio) / sr),
    )


# =============================================================================
# POST /api/v1/studio/phonics-pace
# =============================================================================

@router.post(
    "/phonics-pace",
    summary="Phonics-aware pace adjustment",
    description=(
        "The capability unique to Scholarly: per-word tempo variation based "
        "on target GPCs. Words containing target grapheme-phoneme "
        "correspondences are slowed while surrounding text stays natural."
    ),
)
async def phonics_pace(request: PhonicsNarrateRequest) -> AdjustResponse:
    """The secret sauce: curriculum-aware narration emphasis.

    Given existing audio + timestamps + target GPCs, this endpoint slows
    down only the words containing those GPCs. "The ship sat on the shore"
    with target GPC 'sh' produces narration where "ship" and "shore" are
    held slightly longer — naturally drawing the child's attention to the
    target sound without making the narration sound robotic.
    """
    audio, sr = _decode_audio_input(request.audio_base64, request.audio_url)

    # Convert API timestamps to internal format
    internal_ts = [
        WordTimestampResult(word=t.word, start=t.start, end=t.end, confidence=t.confidence)
        for t in request.word_timestamps
    ]

    # Find words containing target GPCs
    target_words: set[str] = set()
    for ts in internal_ts:
        word_lower = ts.word.strip().lower()
        for gpc in request.target_gpcs:
            if gpc.lower() in word_lower:
                target_words.add(word_lower)
                break

    if not target_words:
        # No target words found — return unchanged
        encoded = _encode_audio(audio, sr)
        return AdjustResponse(
            audio_base64=encoded,
            duration_seconds=round(len(audio) / sr, 3),
            word_timestamps=[
                WordTimestamp(word=t.word, start=t.start, end=t.end, confidence=t.confidence)
                for t in request.word_timestamps
            ],
            adjustments_applied={"phonics_pace": request.emphasis_pace, "target_words": 0},
            cost=_cpu_cost(len(audio) / sr),
        )

    # Apply per-word emphasis
    adjusted, new_ts = adjust_emphasis(
        audio, sr, internal_ts, target_words, request.emphasis_pace,
    )

    encoded = _encode_audio(adjusted, sr)

    return AdjustResponse(
        audio_base64=encoded,
        duration_seconds=round(len(adjusted) / sr, 3),
        word_timestamps=[
            WordTimestamp(word=t.word, start=t.start, end=t.end, confidence=t.confidence)
            for t in new_ts
        ],
        adjustments_applied={
            "phonics_pace": request.emphasis_pace,
            "target_words": len(target_words),
            "target_gpcs": request.target_gpcs,
        },
        cost=_cpu_cost(len(adjusted) / sr),
    )


# =============================================================================
# POST /api/v1/studio/variants
# =============================================================================

@router.post(
    "/variants",
    response_model=VariantsResponse,
    summary="Generate pace/pitch variants",
    description="Generate multiple adjusted variants from a single source audio (e.g. Beginner 0.7x, Fluent 1.2x).",
)
async def generate_variants(request: VariantsRequest) -> VariantsResponse:
    """Batch variant generation for differentiated instruction.

    A teacher records one narration and generates three variants:
    - "Beginner" at 0.7x pace for struggling readers
    - "Standard" at 1.0x for on-level readers
    - "Fluent" at 1.2x for advanced readers

    All from a single recording, all with consistent voice quality.
    """
    audio, sr = _decode_audio_input(request.audio_base64, request.audio_url)
    variants: list[VariantResult] = []
    total_compute = 0.0
    total_cost = 0.0

    for spec in request.variants:
        start = time.monotonic()
        variant_audio = audio.copy()
        timestamps: list[WordTimestampResult] = []

        if spec.pace != 1.0:
            result = adjust_tempo(variant_audio, sr, spec.pace, timestamps)
            variant_audio = result.audio
            timestamps = result.timestamps

        if spec.pitch != 0.0:
            result = adjust_pitch(variant_audio, sr, spec.pitch)
            variant_audio = result.audio

        if spec.warmth != 0.0:
            result = adjust_warmth(variant_audio, sr, spec.warmth)
            variant_audio = result.audio

        encoded = _encode_audio(variant_audio, sr, request.output_format)
        duration = len(variant_audio) / sr
        compute = time.monotonic() - start
        total_compute += compute
        total_cost += (duration / 60) * 0.0005

        variants.append(VariantResult(
            name=spec.name,
            audio_base64=encoded,
            duration_seconds=round(duration, 3),
            word_timestamps=[
                WordTimestamp(word=t.word, start=t.start, end=t.end, confidence=t.confidence)
                for t in timestamps
            ],
        ))

    return VariantsResponse(
        variants=variants,
        total_cost=CostEstimate(
            provider="processing",
            compute_seconds=round(total_compute, 3),
            estimated_cost_usd=round(total_cost, 6),
            model="audio-processing",
        ),
    )


# =============================================================================
# POST /api/v1/studio/analyse
# =============================================================================

@router.post(
    "/analyse",
    response_model=AudioQualityReport,
    summary="Analyse audio quality",
    description="Measure loudness, peak level, SNR, pace, pitch, and silence ratio.",
)
async def analyse(
    audio: UploadFile = File(..., description="Audio file to analyse"),
    word_count: Optional[int] = Form(None, description="Word count for pace calculation"),
) -> AudioQualityReport:
    """Audio quality analysis for the Educator Voice Studio.

    Gives teachers immediate feedback on their recording quality:
    "Your recording is -22 LUFS (a bit quiet), has 15 dB SNR (some
    background noise), and 180 WPM pace (good for ages 7-9)."
    """
    audio_data = await audio.read()
    if not audio_data:
        raise HTTPException(status_code=400, detail="Empty audio file")

    buf = io.BytesIO(audio_data)
    try:
        audio_array, sr = sf.read(buf, dtype="float32")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not decode audio: {e}")

    if len(audio_array.shape) > 1:
        audio_array = audio_array.mean(axis=1)

    analysis = analyse_audio(audio_array, sr, word_count)

    return AudioQualityReport(
        loudness_lufs=analysis.loudness_lufs or -99.0,
        peak_dbfs=analysis.peak_dbfs or -99.0,
        snr_db=analysis.snr_db or 0.0,
        pace_wpm=analysis.pace_wpm,
        pitch_hz_mean=analysis.pitch_hz_mean,
        pitch_hz_range=analysis.pitch_hz_range,
        silence_ratio=analysis.silence_ratio,
        duration_seconds=analysis.duration_seconds,
        sample_rate=analysis.sample_rate,
        channels=analysis.channels,
    )
