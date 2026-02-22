# =============================================================================
# SCHOLARLY VOICE SERVICE — Dockerfile
# =============================================================================
# Multi-stage build:
#   Stage 1 (builder): Install Python dependencies in a clean layer
#   Stage 2 (runtime): CUDA 12.1 runtime with only what's needed to run
#
# DEPENDENCY RESOLUTION NOTES (Feb 2026):
#   chatterbox-tts pins numpy<1.26 in its metadata, but works at runtime
#   with numpy 2.x. whisperx requires numpy>=2.1. These are irreconcilable
#   via pip's resolver, so chatterbox-tts is installed with --no-deps.
#   All its actual runtime dependencies (torch, numpy, torchaudio, etc.)
#   are already installed by preceding steps.
#
#   whisperx is also installed with --no-deps because its deep dependency
#   tree (pyannote-audio → pytorch-lightning → opentelemetry → ...) causes
#   pip to backtrack for 50+ minutes. Its actual runtime deps (torch,
#   faster-whisper, transformers, numpy) are already present.
#
# KNOWN GOOD CONFIGURATION (pinned versions):
#   numpy    2.1.3    (>=2.1,<2.2 — satisfies whisperx, stable ABI)
#   torch    2.5.1    (cu121 — matches CUDA 12.1 runtime base image)
#   torchaudio 2.5.1  (must match torch version exactly)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder — install Python packages
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# System dependencies for audio processing libraries + git for whisperx
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1-dev \
    libffi-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Build argument: set to "true" to include voice cloning support
ARG ENABLE_CLONING=false

COPY pyproject.toml ./

# Build argument: use CPU-only torch for non-GPU deployments
ARG TORCH_INDEX=https://download.pytorch.org/whl/cu121

# ---------------------------------------------------------------------------
# Step 1: Pin numpy FIRST, then torch from CUDA index
# ---------------------------------------------------------------------------
# numpy must be pinned before torch to prevent torch from pulling in 2.4.x.
# torch and torchaudio versions must match exactly.
RUN pip install --no-cache-dir --prefix=/install \
    "numpy>=2.1,<2.2" \
    && pip install --no-cache-dir --prefix=/install \
    "torch==2.5.1" "torchaudio==2.5.1" --index-url ${TORCH_INDEX}

# ---------------------------------------------------------------------------
# Step 2: Core application dependencies from PyPI
# ---------------------------------------------------------------------------
RUN pip install --no-cache-dir --prefix=/install \
    "fastapi[standard]" \
    "uvicorn[standard]" \
    pydantic \
    pydantic-settings \
    kokoro \
    librosa \
    pyrubberband \
    pyloudnorm \
    noisereduce \
    soundfile \
    scipy \
    azure-storage-blob \
    redis \
    prometheus-client \
    httpx \
    spacy \
    faster-whisper

# ---------------------------------------------------------------------------
# Step 3: whisperx and its runtime dependencies
# ---------------------------------------------------------------------------
# whisperx depends on pyannote-audio which has a deep dependency tree.
# Installing everything in one pip command causes 50+ minute resolver backtrack.
# Solution: install pyannote-audio (the heavy dep) first in isolation, then
# install whisperx with --no-deps (all runtime deps are now present).
RUN pip install --no-cache-dir --prefix=/install \
    "pyannote-audio>=4.0,<5.0"

RUN pip install --no-cache-dir --prefix=/install --no-deps \
    git+https://github.com/m-bain/whisperX.git

# ---------------------------------------------------------------------------
# Step 4: spaCy model (required by Kokoro for text tokenisation)
# ---------------------------------------------------------------------------
RUN PYTHONPATH=/install/lib/python3.11/site-packages \
    python3 -m spacy download en_core_web_sm \
    && cp -r /usr/local/lib/python3.11/site-packages/en_core_web_sm* /install/lib/python3.11/site-packages/

# ---------------------------------------------------------------------------
# Step 5: Chatterbox TTS (optional — voice cloning)
# ---------------------------------------------------------------------------
# chatterbox-tts metadata pins numpy<1.26, but it works fine with numpy 2.x
# at runtime. Install with --no-deps to avoid downgrading numpy.
# Its actual runtime imports (torch, numpy, torchaudio, transformers,
# diffusers, safetensors) are already installed above.
# We install diffusers + safetensors explicitly as they're not in Step 2.
RUN if [ "$ENABLE_CLONING" = "true" ]; then \
        pip install --no-cache-dir --prefix=/install diffusers safetensors; \
        pip install --no-cache-dir --prefix=/install --no-deps chatterbox-tts; \
        echo "Voice cloning: ENABLED (chatterbox-tts installed)"; \
    else \
        echo "Voice cloning: DISABLED (set ENABLE_CLONING=true to enable)"; \
    fi

# ---------------------------------------------------------------------------
# Stage 2: Runtime — CUDA 12.1 + application
# ---------------------------------------------------------------------------
FROM nvidia/cuda:12.1.0-runtime-ubuntu22.04

# Prevent interactive prompts during package installation
ENV DEBIAN_FRONTEND=noninteractive

# Install Python 3.11 and audio processing system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3.11 \
    python3.11-venv \
    python3-pip \
    libsndfile1 \
    rubberband-cli \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && ln -sf /usr/bin/python3.11 /usr/bin/python3 \
    && ln -sf /usr/bin/python3.11 /usr/bin/python

# Copy Python packages from builder
COPY --from=builder /install /usr/local

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash svs
USER svs
WORKDIR /home/svs/app

# Copy application code
COPY --chown=svs:svs . .

# Create directories for local storage and model cache
RUN mkdir -p /home/svs/data/voice-assets /home/svs/.cache

# Environment configuration
ENV SVS_ENVIRONMENT=production \
    SVS_LOG_LEVEL=INFO \
    SVS_SERVER_HOST=0.0.0.0 \
    SVS_SERVER_PORT=8100 \
    SVS_SERVER_WORKERS=4 \
    SVS_TTS_KOKORO_DEVICE=auto \
    SVS_STORAGE_BACKEND=local_fs \
    SVS_STORAGE_LOCAL_STORAGE_PATH=/home/svs/data/voice-assets \
    SVS_CACHE_BACKEND=memory \
    PYTHONPATH=/home/svs/app:/usr/local/lib/python3.11/site-packages \
    PYTHONUNBUFFERED=1

# Health check — liveness probe
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8100/healthz')" || exit 1

EXPOSE 8100

# Run with Uvicorn
CMD ["python", "-m", "uvicorn", "app.main:create_app", \
     "--factory", \
     "--host", "0.0.0.0", \
     "--port", "8100", \
     "--workers", "4"]
