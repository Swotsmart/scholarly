# =============================================================================
# SCHOLARLY VOICE SERVICE — Application Factory
# =============================================================================
# The main.py is the service's front door. It creates the FastAPI application,
# configures middleware (CORS, request logging, error handling), mounts all
# route modules, and manages the application lifecycle (startup/shutdown).
#
# The lifespan context manager ensures that:
# - On startup: settings are loaded, storage is initialised, providers are
#   registered and warmed up (models loaded into GPU/CPU)
# - On shutdown: providers release GPU memory, connections are closed,
#   and everything exits cleanly
#
# This file is what Uvicorn points at: uvicorn app.main:create_app --factory
# =============================================================================

from __future__ import annotations

import logging
import sys
import time
import uuid
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import Settings
from app.dependencies import (
    create_cache,
    create_cloning_dependencies,
    create_registry,
    create_storage,
    get_settings,
    shutdown_dependencies,
)

logger = logging.getLogger("scholarly-voice-service")


# =============================================================================
# Section 1: Application Lifespan
# =============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifecycle manager.

    Startup sequence:
    1. Load configuration from environment
    2. Configure logging
    3. Initialise storage backend (Azure Blob or local FS)
    4. Initialise cache backend (Redis or in-memory)
    5. Create and warm up provider registry (load ML models)
    6. Log readiness summary

    Shutdown sequence:
    1. Shut down all providers (release GPU memory)
    2. Close cache connections
    3. Log shutdown confirmation

    This is the equivalent of the ScholarlyBaseService.onModuleInit()
    pattern from the TypeScript codebase, but using FastAPI's lifespan
    protocol instead of NestJS lifecycle hooks.
    """
    settings = get_settings()
    _configure_logging(settings)

    logger.info("=" * 60)
    logger.info("SCHOLARLY VOICE SERVICE v%s", settings.version)
    logger.info("Environment: %s", settings.environment.value)
    logger.info("=" * 60)

    startup_start = time.monotonic()

    # Initialise infrastructure
    await create_storage(settings)
    await create_cache(settings)

    # Create provider registry and warm up models
    # This is the slowest part — model loading can take 10-30 seconds
    logger.info("Warming up providers (this may take 30s on first run)...")
    registry = await create_registry(settings)

    startup_time = time.monotonic() - startup_start
    tts_count = registry.tts_provider_count
    stt_count = registry.stt_provider_count

    # Initialise voice cloning (optional — skipped if chatterbox-tts not installed)
    cloning_ok = await create_cloning_dependencies(registry, settings)

    logger.info("-" * 60)
    logger.info("Ready in %.1fs | TTS providers: %d | STT providers: %d | Cloning: %s",
                startup_time, registry.tts_provider_count, stt_count,
                "enabled" if cloning_ok else "disabled")
    logger.info("Listening on %s:%d", settings.server.host, settings.server.port)
    logger.info("-" * 60)

    yield  # Application runs here

    # Shutdown
    logger.info("Shutting down...")
    await shutdown_dependencies()
    logger.info("Shutdown complete")


# =============================================================================
# Section 2: Application Factory
# =============================================================================

def create_app() -> FastAPI:
    """Create and configure the FastAPI application.

    This is the function Uvicorn calls:
        uvicorn app.main:create_app --factory

    Using a factory function (rather than a module-level app instance)
    allows tests to create fresh app instances with custom settings.
    """
    settings = get_settings()

    app = FastAPI(
        title="Scholarly Voice Service",
        description=(
            "Self-hosted TTS, STT, Voice Cloning & Educator Studio Tools. "
            "A standalone Python microservice providing voice AI capabilities "
            "through a RESTful API, designed for the Scholarly educational platform."
        ),
        version=settings.version,
        lifespan=lifespan,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
    )

    # --- CORS Middleware ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.server.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # --- Request ID Middleware ---
    @app.middleware("http")
    async def add_request_id(request: Request, call_next: object) -> Response:
        """Add a unique request ID to every request for tracing.

        The request ID propagates through logs and is returned in the
        response headers, enabling end-to-end request tracing across
        the Scholarly platform.
        """
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        response: Response = await call_next(request)  # type: ignore
        response.headers["X-Request-ID"] = request_id
        return response

    # --- Request Logging Middleware ---
    @app.middleware("http")
    async def log_requests(request: Request, call_next: object) -> Response:
        """Log every request with method, path, status, and duration."""
        start = time.monotonic()
        response: Response = await call_next(request)  # type: ignore
        duration_ms = (time.monotonic() - start) * 1000

        # Skip noisy health check logs in production
        if request.url.path not in ("/healthz", "/readyz", "/metrics"):
            logger.info(
                "%s %s %d %.0fms",
                request.method,
                request.url.path,
                response.status_code,
                duration_ms,
            )

        return response

    # --- Global Exception Handler ---
    @app.exception_handler(Exception)
    async def global_exception_handler(
        request: Request, exc: Exception
    ) -> JSONResponse:
        """Catch-all exception handler. Ensures every error returns
        the standard ErrorResponse shape, never a raw stack trace."""
        request_id = getattr(request.state, "request_id", None)
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)

        return JSONResponse(
            status_code=500,
            content={
                "error": "INTERNAL_ERROR",
                "message": "An internal error occurred. Please try again.",
                "request_id": request_id,
            },
        )

    # --- Mount Routes ---
    from app.routes.health import router as health_router
    from app.routes.tts import router as tts_router
    from app.routes.stt import router as stt_router
    from app.routes.studio import router as studio_router
    from app.routes.cloning import router as cloning_router
    from app.routes.alignment import router as alignment_router

    app.include_router(health_router)
    app.include_router(tts_router)
    app.include_router(stt_router)
    app.include_router(studio_router)
    app.include_router(cloning_router)
    app.include_router(alignment_router)

    return app


# =============================================================================
# Section 3: Logging Configuration
# =============================================================================

def _configure_logging(settings: Settings) -> None:
    """Configure structured logging based on environment.

    Development: Human-readable format with colours
    Production: JSON format for log aggregation (Grafana/Loki)
    """
    log_level = getattr(logging, settings.log_level.value, logging.INFO)

    if settings.is_production:
        # JSON format for production log aggregation
        formatter = logging.Formatter(
            '{"time":"%(asctime)s","level":"%(levelname)s",'
            '"logger":"%(name)s","message":"%(message)s"}'
        )
    else:
        # Human-readable for development
        formatter = logging.Formatter(
            "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%H:%M:%S",
        )

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(formatter)

    # Configure root logger
    root = logging.getLogger()
    root.setLevel(log_level)
    root.handlers = [handler]

    # Quiet noisy libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)


# =============================================================================
# Section 4: Direct Execution
# =============================================================================

if __name__ == "__main__":
    """Allow direct execution: python -m app.main

    For production, use: uvicorn app.main:create_app --factory --host 0.0.0.0 --port 8100
    """
    import uvicorn

    settings = get_settings()
    uvicorn.run(
        "app.main:create_app",
        factory=True,
        host=settings.server.host,
        port=settings.server.port,
        workers=settings.server.workers,
        reload=settings.server.reload,
        log_level=settings.log_level.value.lower(),
    )
