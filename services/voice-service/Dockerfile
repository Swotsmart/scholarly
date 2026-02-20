# =============================================================================
# SCHOLARLY VOICE SERVICE — Dockerfile
# =============================================================================
# Multi-stage build:
#   Stage 1 (builder): Install Python dependencies in a clean layer
#   Stage 2 (runtime): CUDA 12.1 runtime with only what's needed to run
#
# Models are baked into the image to ensure deterministic cold starts.
# The alternative (downloading at runtime) adds 30-60s to pod startup
# and creates a dependency on external model registries.
#
# Total image size: ~5GB (models dominate; application code is ~50MB)
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder — install Python packages
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /build

# System dependencies for audio processing libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libsndfile1-dev \
    libffi-dev \
    && rm -rf /var/lib/apt/lists/*

# Build argument: set to "true" to include voice cloning support
# Voice cloning adds ~2GB to the image (Chatterbox model weights)
ARG ENABLE_CLONING=false

# Install Python dependencies
COPY pyproject.toml ./
# Build argument: use CPU-only torch for non-GPU deployments
ARG TORCH_INDEX=https://download.pytorch.org/whl/cu121

# Install torch first from specified index, then everything else from PyPI
RUN pip install --no-cache-dir --prefix=/install \
    torch --index-url ${TORCH_INDEX} \
    && pip install --no-cache-dir --prefix=/install \
    fastapi[standard] \
    uvicorn[standard] \
    pydantic \
    pydantic-settings \
    kokoro \
    librosa \
    pyrubberband \
    pyloudnorm \
    noisereduce \
    soundfile \
    scipy \
    numpy \
    azure-storage-blob \
    redis \
    prometheus-client \
    httpx \
    spacy

# Download spaCy English model (required by Kokoro for text tokenisation)
RUN PYTHONPATH=/install/lib/python3.11/site-packages \
    python3 -m spacy download en_core_web_sm \
    --pip-args="--prefix=/install --no-cache-dir"

# Conditionally install Chatterbox TTS for voice cloning
# This is separated because the package adds significant weight and
# requires GPU — TTS-only deployments can skip it entirely.
RUN if [ "$ENABLE_CLONING" = "true" ]; then \
        pip install --no-cache-dir --prefix=/install chatterbox-tts; \
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

# ---------------------------------------------------------------------------
# Model download stage
# ---------------------------------------------------------------------------
# Kokoro model weights are downloaded during build so they're baked into
# the image layer. This ensures deterministic cold starts — the pod
# doesn't need network access to start serving.
#
# In production, you may want to use a separate model registry (Azure ACR
# or a shared volume) and mount models at /models/kokoro. In that case,
# comment out the download step and set SVS_TTS_KOKORO_MODEL_PATH to
# the mount point.
#
# For now, we let Kokoro download its default model on first use,
# which gets cached in the Docker layer.
# ---------------------------------------------------------------------------

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
