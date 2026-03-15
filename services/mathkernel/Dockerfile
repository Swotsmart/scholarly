# =============================================================================
# Scholarly MathKernel — FastAPI + SageMath
# Structural pattern mirrors services/voice-service/
# =============================================================================

# SageMath has its own base image — we extend it rather than fight the install.
# sagemath/sagemath:latest is an official Jupyter-based image; we use the
# "standalone" variant which is lighter and has no GUI dependencies.
FROM sagemath/sagemath:10.3 AS base

# Switch to root to install system packages, then back to sage user
USER root

# Install Python package manager
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python dependencies first (layer cache)
COPY requirements.txt .
RUN sage -pip install --no-cache-dir fastapi==0.111.0 "uvicorn[standard]==0.29.0" pydantic==2.7.1

# Copy application code
COPY main.py cas_engine.py rubric_engine.py ./

# Non-root user for runtime (sage image ships with 'sage' user)
USER sage

# Expose service port
EXPOSE 8001

# Health check — Azure Container Apps also polls /health but this catches
# issues during local `docker run` before the orchestrator takes over
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8001/health || exit 1

# SageMath startup is slow (~10s); the lifespan handler in main.py warms it up
# at boot so students never hit that latency.
CMD ["sage", "-python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
