# Voice Service Deployment — Step-by-Step Audit Trail

**Date**: 20 February 2026
**Objective**: Install all missing Python dependencies (faster-whisper, whisperx, pyannote-audio) and fix broken dependency injection wiring so the voice service starts with ALL providers operational: Kokoro TTS, Whisper STT, WhisperX Alignment, and Chatterbox voice cloning.

---

## 1. Files Modified

| File | Type of Change |
|------|---------------|
| `services/voice-service/Dockerfile` | Rewrote dependency installation pipeline |
| `services/voice-service/app/dependencies.py` | Fixed 4 bugs in DI wiring |

No new files were created. No files were deleted.

---

## 2. Changes to `Dockerfile`

### 2.1 What was wrong (original state)

The original Dockerfile:
- Installed `torch` without pinning a version (pulled latest, which dragged in numpy 2.4.x)
- Installed `numpy` without version pinning
- Did NOT install `torchaudio` (required by Chatterbox and audio processing)
- Did NOT install `faster-whisper` (required by Whisper STT provider)
- Did NOT install `whisperx` (required by WhisperX alignment provider)
- Did NOT install `pyannote-audio` (required at runtime by whisperx)
- Did NOT install `git` in the builder stage (required to pip-install whisperx from GitHub)
- Installed `chatterbox-tts` directly (with deps), which would downgrade numpy and break whisperx

### 2.2 The numpy incompatibility problem

The core challenge:
- `chatterbox-tts` (all versions) declares `numpy<1.26,>=1.24` in its package metadata
- `whisperx` (3.8.1) declares `numpy>=2.1.0`
- These are **fundamentally irreconcilable** via pip's resolver

However, chatterbox-tts **works at runtime** with numpy 2.x — the metadata constraint is overly strict. The solution is `--no-deps` for both packages.

Additionally:
- `pyannote-audio` has a very deep transitive dependency tree (`pytorch-lightning` -> `opentelemetry` -> `grpcio` -> ...) that causes pip's resolver to backtrack for 50+ minutes when installed alongside whisperx in a single command

### 2.3 What was changed (new Dockerfile pipeline)

The builder stage was restructured into 5 ordered steps:

**Step 1 — Pin numpy, then torch + torchaudio from CUDA index**
```dockerfile
RUN pip install --no-cache-dir --prefix=/install \
    "numpy>=2.1,<2.2" \
    && pip install --no-cache-dir --prefix=/install \
    "torch==2.5.1" "torchaudio==2.5.1" --index-url ${TORCH_INDEX}
```
- numpy is pinned FIRST to prevent torch from pulling in 2.4.x
- torch and torchaudio versions are pinned and must match exactly
- Separate pip commands: numpy from PyPI, torch from CUDA wheel index

**Step 2 — Core application dependencies from PyPI**
```dockerfile
RUN pip install --no-cache-dir --prefix=/install \
    "fastapi[standard]" "uvicorn[standard]" pydantic pydantic-settings \
    kokoro librosa pyrubberband pyloudnorm noisereduce soundfile scipy \
    azure-storage-blob redis prometheus-client httpx spacy faster-whisper
```
- Added `faster-whisper` (was missing entirely)
- Removed bare `numpy` (already pinned in Step 1)
- Quoted `fastapi[standard]` and `uvicorn[standard]` for shell safety

**Step 3 — pyannote-audio (whisperx runtime dependency), then whisperx**
```dockerfile
RUN pip install --no-cache-dir --prefix=/install \
    "pyannote-audio>=4.0,<5.0"

RUN pip install --no-cache-dir --prefix=/install --no-deps \
    git+https://github.com/m-bain/whisperX.git
```
- pyannote-audio installed separately to avoid 50+ minute resolver backtrack
- whisperx installed with `--no-deps` because all its runtime dependencies (torch, numpy, faster-whisper, transformers, pyannote-audio) are already present
- This is why `git` was added to the builder's apt-get

**Step 4 — spaCy English model (unchanged from original)**

**Step 5 — Chatterbox TTS (optional, gated by ENABLE_CLONING)**
```dockerfile
RUN if [ "$ENABLE_CLONING" = "true" ]; then \
        pip install --no-cache-dir --prefix=/install diffusers safetensors; \
        pip install --no-cache-dir --prefix=/install --no-deps chatterbox-tts; \
    fi
```
- `diffusers` and `safetensors` installed WITH deps (they're not in Step 2 and have no conflicts)
- `chatterbox-tts` installed with `--no-deps` to prevent it downgrading numpy from 2.1.x to 1.x
- Its actual runtime imports (torch, numpy, torchaudio, transformers, diffusers, safetensors) are all already present from Steps 1-3

### 2.4 Other Dockerfile changes

- Added `git` to builder's `apt-get install` (required for whisperx GitHub install)
- Removed stale model download comment block in Stage 2 (models are not baked in)
- Updated header comment with dependency resolution notes and known good configuration

---

## 3. Changes to `app/dependencies.py`

### 3.1 Fix 1 — Added `from fastapi import HTTPException`

**Line 25** (new import). Required for Fix 4 below.

### 3.2 Fix 2 — WhisperX Alignment Provider registration

**Lines 114-126** (new block in `create_registry()`). The WhisperX provider was never being registered in the provider registry. Added:

```python
try:
    from providers.whisperx_provider import WhisperXAlignmentProvider, WhisperXConfig
    whisperx_config = WhisperXConfig(
        whisperx_model_size=settings.stt.whisper_model_size,
        device=settings.stt.whisper_device,
        compute_type=settings.stt.whisper_compute_type,
    )
    whisperx_provider = WhisperXAlignmentProvider(config=whisperx_config)
    registry.register_stt(whisperx_provider, enabled=True)
except ImportError:
    whisperx_provider = None
    logger.info("whisperx not installed — alignment provider skipped")
```

Uses try/except ImportError to degrade gracefully when whisperx is not installed.

### 3.3 Fix 3 — WhisperX + PhonicsNarrator wiring into alignment routes

**Lines 141-150** (new block after warmup). The alignment routes module (`app/routes/alignment.py`) had a `set_providers()` function that was NEVER being called, so the alignment endpoints would always return 503. Added post-warmup wiring:

```python
if whisperx_provider is not None:
    try:
        from processing.phonics_narrator import PhonicsNarrator, PhonicsNarratorConfig
        from app.routes.alignment import set_providers as set_alignment_providers
        phonics_narrator = PhonicsNarrator(PhonicsNarratorConfig())
        set_alignment_providers(whisperx_provider, phonics_narrator)
        logger.info("Alignment routes wired (WhisperX + PhonicsNarrator)")
    except Exception as e:
        logger.warning("Failed to wire alignment routes: %s", e)
```

### 3.4 Fix 4 — CloneEngine constructor arguments

**Lines 211-215** (changed). The original code passed `sample_rate=settings.tts.default_sample_rate` to `CloneEngine()`, which is not a valid parameter. Fixed to match `CloneEngine.__init__` signature:

```python
# BEFORE (broken):
clone_engine = CloneEngine(
    sample_rate=settings.tts.default_sample_rate,
)

# AFTER (correct — matches CloneEngine.__init__):
clone_engine = CloneEngine(
    model_path=settings.cloning.chatterbox_model_path,
    device=settings.cloning.chatterbox_device,
    min_sample_duration_seconds=settings.cloning.min_sample_duration_seconds,
)
```

Verified against `cloning/clone_engine.py` which declares:
```python
def __init__(self, model_path: Path, device: str = "cuda", min_sample_duration_seconds: float = 6.0)
```

### 3.5 Fix 5 — HTTP 503 instead of RuntimeError for cloning getters

**Lines 248-266** (changed). The original `get_consent_manager()`, `get_profile_manager()`, and `get_clone_engine()` raised `RuntimeError` when cloning was unavailable. This caused FastAPI to return HTTP 500 (internal server error) instead of a meaningful response. Changed to `HTTPException(status_code=503)` so clients get a clear "service unavailable" response.

---

## 4. Build Attempts (Chronological)

| # | Image Tag | Outcome | Root Cause | Duration |
|---|-----------|---------|------------|----------|
| 1 | `gpu-2808926` | FAIL — runtime crash | numpy 2.4.2 installed by torch; stale .so files after chatterbox-tts downgraded numpy | ~22 min |
| 2 | `gpu-2808926b` | FAIL — runtime crash | Same stale .so issue — `pip install "numpy<2.1"` after torch didn't clean compiled extensions in `--prefix=/install` | ~22 min |
| 3 | `gpu-2808926c` | FAIL — pip resolution | Constraint `numpy<2.1` conflicts with `whisperx` requiring `numpy>=2.1` | ~22 min |
| 4 | `gpu-2808926d` | FAIL — pip timeout | whisperx + pyannote-audio in single pip command → 50+ min resolver backtrack | ~52 min |
| 5 | `gpu-2808926e` | PARTIAL — TTS + cloning work, whisperx fails | `--no-deps` for whisperx skipped pyannote-audio, which whisperx imports at top level | ~22 min |
| 6 | `gpu-2808926f` | **SUCCESS** | Added explicit `pyannote-audio>=4.0,<5.0` install before whisperx | 20m30s |

### Build command used (build #6)
```bash
az acr build \
  --registry scholarlyacr \
  --image voice-service:gpu-2808926f \
  --build-arg ENABLE_CLONING=true \
  --platform linux/amd64 \
  --file services/voice-service/Dockerfile \
  services/voice-service/
```

### Build #6 progress (verified from log)
- Step 7 (numpy + torch + torchaudio): numpy-2.1.3, torch-2.5.1+cu121, torchaudio-2.5.1+cu121 — SUCCESS
- Step 8 (core packages): faster-whisper-1.2.1, kokoro-0.9.4 — SUCCESS
- Step 9 (pyannote-audio): pyannote-audio-4.0.4 — SUCCESS
- Step 10 (whisperx --no-deps): whisperx installed from GitHub — SUCCESS
- Step 11 (spaCy model): en_core_web_sm — SUCCESS
- Step 12 (chatterbox-tts): diffusers, safetensors, chatterbox-tts — SUCCESS
- Steps 13-25 (Stage 2 runtime): Ubuntu packages, user setup, env config — SUCCESS
- **Build completed successfully in 20m30s** (Run ID: cr37, digest: sha256:0b23cfb7)

---

## 5. Known Good Configuration

| Package | Version | Source | Notes |
|---------|---------|--------|-------|
| numpy | 2.1.3 | PyPI | Must be >=2.1,<2.2 (whisperx needs >=2.1; <2.2 for ABI stability) |
| torch | 2.5.1+cu121 | pytorch.org/whl/cu121 | Must match CUDA 12.1 runtime base image |
| torchaudio | 2.5.1+cu121 | pytorch.org/whl/cu121 | Must match torch version exactly |
| faster-whisper | 1.2.1 | PyPI | Whisper STT backend |
| pyannote-audio | 4.0.4 | PyPI | whisperx runtime dependency (speaker diarisation) |
| whisperx | 3.8.1 | GitHub (m-bain/whisperX) | Installed with --no-deps |
| chatterbox-tts | latest | PyPI | Installed with --no-deps (numpy metadata conflict) |
| kokoro | 0.9.4 | PyPI | Primary TTS engine |

---

## 6. Deployment Steps (Not Yet Executed)

Once build #6 completes:

1. **Deploy to Container App**:
   ```bash
   az containerapp update \
     --name scholarly-voice \
     --resource-group scholarly-rg \
     --image scholarlyacr.azurecr.io/voice-service:gpu-2808926f
   ```

2. **Verify startup logs** — look for ALL four providers registering:
   - `Kokoro TTS provider registered`
   - `Whisper STT provider registered` (faster-whisper)
   - `WhisperX alignment provider registered`
   - `Voice cloning initialised (Chatterbox provider registered)`

3. **Verify health endpoint**: `GET /healthz` returns 200

4. **Smoke test endpoints**:
   - `POST /api/v1/synthesize` (Kokoro TTS)
   - `POST /api/v1/transcribe` (Whisper STT)
   - `POST /api/v1/align` (WhisperX alignment)
   - Voice cloning endpoints (if enabled)

---

## 7. Lessons Learned / Process Issues

### What went wrong
1. **No preflight dependency resolution check** — Each failed build wasted ~22 minutes. A `pip install --dry-run` or `pip check` before building would have caught conflicts immediately.
2. **Trial-and-error approach to numpy pinning** — Builds 1-3 each tried a different numpy constraint without first analysing the full dependency graph (`chatterbox-tts` needs `<1.26`, `whisperx` needs `>=2.1`).
3. **`--prefix=/install` stale .so bug not anticipated** — When pip downgrades a package in a `--prefix` directory, compiled C extensions from the old version can persist, causing `AttributeError` crashes.
4. **pyannote-audio resolver cost not anticipated** — Build 4 timed out at 52 minutes because pip's resolver spiralled through pyannote-audio's deep dependency tree.
5. **whisperx runtime import of pyannote-audio not checked** — Build 5 used `--no-deps` for whisperx without verifying which packages it imports at the top level.

### What should have been done
1. Run `pip install --dry-run` locally (or in a lightweight container) to validate the full dependency graph before triggering any ACR build
2. Examine `pip show <package>` / `pip metadata <package>` to read declared dependencies BEFORE choosing install strategy
3. When using `--no-deps`, verify the package's actual imports (not just metadata) to ensure all runtime dependencies are present
4. Pin all critical packages to exact versions in the Dockerfile to prevent drift
