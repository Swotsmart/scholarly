"""
Scholarly MathKernel Service — v1.1.0
FastAPI + SageMath microservice providing CAS rubric assessment,
REPL evaluation, and step-by-step symbolic working generation.

Structural pattern mirrors services/voice-service/ (VOICE_SERVICE_URL pattern).
Deployed as a sidecar container alongside the main API in Azure Container Apps.

Routes:
  GET  /health          → liveness probe (returns 200 + version)
  POST /rubric          → CAS-verified rubric for a MathCanvas submission
  POST /verify          → single-expression symbolic verification
  POST /repl            → evaluate a single expression/command interactively
  POST /steps           → generate step-by-step symbolic working
  GET  /capabilities    → list of supported verification types

Environment variables:
  PORT              default 8001
  LOG_LEVEL         default info
  ALLOWED_ORIGINS   comma-separated CORS origins, default *
"""

import os
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from cas_engine import CASEngine
from rubric_engine import RubricEngine, RubricRequest, RubricResponse, VerifyRequest, VerifyResponse
from repl_engine import REPLEngine, REPLRequest, REPLResponse
from steps_engine import StepsEngine, StepsRequest, StepsResponse

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
log_level = os.getenv("LOG_LEVEL", "info").upper()
logging.basicConfig(
    level=getattr(logging, log_level, logging.INFO),
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("mathkernel")

# ---------------------------------------------------------------------------
# Lifespan — warm up SageMath on startup (first import is slow ~3s)
# ---------------------------------------------------------------------------
cas: CASEngine | None = None
repl_engine: REPLEngine | None = None
steps_engine: StepsEngine | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global cas, repl_engine, steps_engine
    logger.info("MathKernel starting — warming up SageMath…")
    cas = CASEngine()
    cas.warmup()
    repl_engine = REPLEngine(cas)
    steps_engine = StepsEngine(cas)
    logger.info("SageMath ready — REPL and Steps engines initialised")
    yield
    logger.info("MathKernel shutting down")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------
app = FastAPI(
    title="Scholarly MathKernel",
    description="CAS-powered assessment rubric verification, interactive REPL, and step-by-step working via SageMath",
    version="1.1.0",
    lifespan=lifespan,
)

allowed_origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "Authorization"],
)

# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health():
    """Liveness probe — Azure Container Apps polls this every 10s."""
    return {
        "status": "ok",
        "service": "mathkernel",
        "version": "1.1.0",
        "sage_ready": cas is not None and cas.ready,
        "repl_ready": repl_engine is not None,
        "steps_ready": steps_engine is not None,
    }


@app.get("/capabilities")
async def capabilities():
    """Return the verification types this kernel supports."""
    return {
        "verification_types": [
            "roots",          # solve(f(x) = 0, x) — verify marked roots
            "derivative",     # diff(f, x) — verify claimed derivative
            "integral",       # integrate(f, x) — verify claimed antiderivative
            "geometry",       # symbolic area / perimeter / angles
            "statistics",     # mean, std, correlation from dataset
            "expression",     # general algebraic equivalence check
        ],
        "repl_commands": [
            "simplify",       # simplify an expression
            "expand",         # expand brackets
            "factor",         # factorise
            "diff",           # differentiate (∂/∂x, or specify variable)
            "integrate",      # integrate (definite or indefinite)
            "solve",          # solve equation(s) for variable
            "evaluate",       # numerical evaluation
            "partial",        # partial derivative ∂f/∂x or ∂f/∂y
            "gradient",       # gradient vector [∂f/∂x, ∂f/∂y]
            "taylor",         # Taylor expansion about a point
            "limit",          # limit as x → value
        ],
        "steps_operations": [
            "simplify",
            "expand",
            "factor",
            "diff",
            "integrate",
            "solve",
            "partial_x",
            "partial_y",
            "gradient",
        ],
        "supported_strands": ["functions", "geometry", "statistics"],
    }


@app.post("/verify", response_model=VerifyResponse)
async def verify_expression(req: VerifyRequest):
    """
    Single-expression symbolic verification.
    Used by the frontend to check a student's answer against CAS truth.
    """
    if cas is None:
        raise HTTPException(503, detail="CAS engine not ready")
    try:
        return cas.verify(req)
    except Exception as exc:
        logger.warning("verify error: %s", exc)
        raise HTTPException(422, detail=str(exc))


@app.post("/rubric", response_model=RubricResponse)
async def cas_rubric(req: RubricRequest):
    """
    Full CAS-verified rubric for a MathCanvas submission.
    Called by the TypeScript mathkernel-client after a student submits work.
    """
    if cas is None:
        raise HTTPException(503, detail="CAS engine not ready")
    try:
        engine = RubricEngine(cas)
        return engine.evaluate(req)
    except Exception as exc:
        logger.exception("rubric error")
        raise HTTPException(422, detail=str(exc))


@app.post("/repl", response_model=REPLResponse)
async def repl_evaluate(req: REPLRequest):
    """
    Interactive REPL evaluation.
    Accepts a natural-language-ish command and an expression.
    Returns the CAS result plus a LaTeX rendering for display.

    Examples:
      { "command": "diff", "expression": "x^3 + sin(x)", "variable": "x" }
      { "command": "solve", "expression": "x^2 - 5*x + 6 = 0", "variable": "x" }
      { "command": "integrate", "expression": "2*x", "variable": "x", "lower": 0, "upper": 3 }
      { "command": "factor", "expression": "x^2 - 5*x + 6" }
      { "command": "gradient", "expression": "x^2 + y^2", "variables": ["x", "y"] }
    """
    if repl_engine is None:
        raise HTTPException(503, detail="REPL engine not ready")
    try:
        return repl_engine.evaluate(req)
    except Exception as exc:
        logger.warning("repl error: %s", exc)
        raise HTTPException(422, detail=str(exc))


@app.post("/steps", response_model=StepsResponse)
async def generate_steps(req: StepsRequest):
    """
    Step-by-step symbolic working generation.
    Returns an ordered list of working steps, each with a plain-text
    explanation and a LaTeX expression showing the state after that step.

    Examples:
      { "operation": "diff", "expression": "x^3 - 3*x + 2", "variable": "x" }
      { "operation": "integrate", "expression": "3*x^2", "variable": "x" }
      { "operation": "factor", "expression": "x^2 - 5*x + 6" }
      { "operation": "solve", "expression": "x^2 - 5*x + 6", "variable": "x" }
      { "operation": "partial_x", "expression": "x^2 + x*y + y^2" }
      { "operation": "gradient", "expression": "x^2 + y^2" }
    """
    if steps_engine is None:
        raise HTTPException(503, detail="Steps engine not ready")
    try:
        return steps_engine.generate(req)
    except Exception as exc:
        logger.warning("steps error: %s", exc)
        raise HTTPException(422, detail=str(exc))


# ---------------------------------------------------------------------------
# Dev runner
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8001"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
