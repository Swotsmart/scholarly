# =============================================================================
# SCHOLARLY VOICE SERVICE — Health & Observability Routes
# =============================================================================
# /healthz  — Liveness probe (is the process alive?)
# /readyz   — Readiness probe (can this pod serve traffic?)
# /metrics  — Prometheus scrape endpoint
# /api/v1/models — Loaded model information
# =============================================================================

from __future__ import annotations

import time
from typing import Any

from fastapi import APIRouter, Depends, Response
from prometheus_client import (
    Counter,
    Histogram,
    generate_latest,
    CONTENT_TYPE_LATEST,
)

from app.config import Settings
from app.dependencies import get_registry, get_settings, get_storage
from models.schemas import ErrorResponse, HealthResponse, ModelInfo, ModelsResponse
from providers.kokoro_provider import KokoroTTSProvider
from providers.registry import ProviderRegistry

router = APIRouter()

# =============================================================================
# Prometheus Metrics — module-level singletons
# =============================================================================

REQUEST_COUNT = Counter(
    "svs_requests_total",
    "Total requests by endpoint and status",
    ["endpoint", "method", "status"],
)

REQUEST_LATENCY = Histogram(
    "svs_request_duration_seconds",
    "Request latency in seconds",
    ["endpoint", "method"],
    buckets=[0.01, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
)

TTS_INFERENCE_TIME = Histogram(
    "svs_tts_inference_seconds",
    "TTS model inference time in seconds",
    ["provider", "voice"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
)

TTS_AUDIO_DURATION = Histogram(
    "svs_tts_audio_duration_seconds",
    "Generated audio duration in seconds",
    ["provider"],
    buckets=[1, 5, 10, 30, 60, 120, 300],
)

TTS_REALTIME_FACTOR = Histogram(
    "svs_tts_realtime_factor",
    "TTS realtime factor (audio_duration / compute_time)",
    ["provider", "device"],
    buckets=[1, 5, 10, 50, 100, 200, 500],
)

STT_INFERENCE_TIME = Histogram(
    "svs_stt_inference_seconds",
    "STT model inference time in seconds",
    ["provider"],
)

_start_time = time.monotonic()


# =============================================================================
# Health Endpoints
# =============================================================================

@router.get(
    "/healthz",
    response_model=HealthResponse,
    summary="Liveness probe",
    tags=["health"],
)
async def liveness(
    settings: Settings = Depends(get_settings),
) -> HealthResponse:
    """Liveness check. Intentionally cheap — no I/O, no model checks."""
    return HealthResponse(
        status="healthy",
        service=settings.service_name,
        version=settings.version,
        uptime_seconds=round(time.monotonic() - _start_time, 1),
        checks={"process": True},
    )


@router.get(
    "/readyz",
    response_model=HealthResponse,
    responses={503: {"model": ErrorResponse}},
    summary="Readiness probe",
    tags=["health"],
)
async def readiness(
    response: Response,
    settings: Settings = Depends(get_settings),
    registry: ProviderRegistry = Depends(get_registry),
) -> HealthResponse:
    """Readiness check. Verifies models are loaded and storage is accessible.

    During startup (while models are loading), this returns 503 so
    Kubernetes won't route traffic to the pod yet. Once everything
    is ready, it returns 200 and the pod joins the load balancer.
    """
    checks: dict[str, bool] = {}

    # Check all providers
    provider_health = await registry.health_check_all()
    checks.update({f"provider:{k}": v for k, v in provider_health.items()})

    # Check storage (attempt to verify connectivity)
    try:
        storage = get_storage()
        checks["storage"] = storage is not None
    except RuntimeError:
        checks["storage"] = False

    # Overall status: healthy only if at least one TTS provider is ready
    tts_healthy = any(
        v for k, v in checks.items()
        if k.startswith("provider:") and v
    )
    overall_healthy = tts_healthy and checks.get("storage", False)

    if not overall_healthy:
        response.status_code = 503

    return HealthResponse(
        status="healthy" if overall_healthy else "unhealthy",
        service=settings.service_name,
        version=settings.version,
        uptime_seconds=round(time.monotonic() - _start_time, 1),
        checks=checks,
    )


@router.get(
    "/metrics",
    summary="Prometheus metrics",
    tags=["health"],
)
async def metrics() -> Response:
    """Prometheus-compatible metrics endpoint.

    Exposes: request counts, latency histograms, TTS inference times,
    audio duration distribution, realtime factor, and STT inference times.
    """
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )


@router.get(
    "/api/v1/models",
    response_model=ModelsResponse,
    summary="Loaded models",
    tags=["health"],
)
async def list_models(
    registry: ProviderRegistry = Depends(get_registry),
) -> ModelsResponse:
    """List all loaded ML models with status, device, and VRAM usage.

    Used by the admin dashboard (/admin/voice-analytics) to monitor
    what's running and how much GPU memory is in use.
    """
    models: list[ModelInfo] = []
    gpu_available = False
    gpu_name: str | None = None
    total_vram_mb: float | None = None
    used_vram_mb: float | None = None

    # Check GPU availability
    try:
        import torch
        if torch.cuda.is_available():
            gpu_available = True
            gpu_name = torch.cuda.get_device_name(0)
            props = torch.cuda.get_device_properties(0)
            total_vram_mb = props.total_mem / (1024 ** 2)
            used_vram_mb = torch.cuda.memory_allocated(0) / (1024 ** 2)
    except ImportError:
        pass

    # Collect model info from all providers
    for provider_info in registry.list_tts_providers():
        provider_id = provider_info["provider_id"]

        # Get detailed model info if available
        tts_reg = registry._tts_providers.get(provider_id)
        if tts_reg and hasattr(tts_reg.provider, "get_model_info"):
            info = tts_reg.provider.get_model_info()  # type: ignore
            models.append(ModelInfo(
                name=info.get("name", provider_id),
                provider=info.get("provider", provider_id),
                status=info.get("status", "unknown"),
                vram_mb=info.get("vram_mb"),
                supported_languages=info.get("supported_languages", []),
                device=info.get("device", "unknown"),
            ))
        else:
            models.append(ModelInfo(
                name=provider_id,
                provider=provider_id,
                status=provider_info.get("status", "unknown"),
                vram_mb=None,
                supported_languages=provider_info.get("languages", []),
                device="unknown",
            ))

    return ModelsResponse(
        models=models,
        gpu_available=gpu_available,
        gpu_name=gpu_name,
        total_vram_mb=total_vram_mb,
        used_vram_mb=used_vram_mb,
    )
