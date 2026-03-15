"""
REPLEngine — Interactive CAS evaluation for the MathCanvas REPL tab.

Think of this as a symbolic calculator you can interrogate in real time.
A student types "diff x^3 + sin(x)" and instantly sees the derivative
computed by SageMath — not approximated numerically, but derived symbolically.
The engine returns both a plain-text result and a LaTeX rendering so the
frontend can display beautifully typeset mathematics.

Supported commands mirror what a Year 10–12 student would want at their
fingertips: differentiate, integrate, solve, factor, expand, simplify,
gradient, Taylor series, limits.  Each command degrades gracefully —
if SageMath can't handle the input, the engine returns an error result
rather than crashing, and the frontend shows an amber warning.
"""

import logging
from typing import Optional, List
from pydantic import BaseModel

logger = logging.getLogger("mathkernel.repl")


# ---------------------------------------------------------------------------
# Pydantic models (shared with FastAPI route)
# ---------------------------------------------------------------------------

class REPLRequest(BaseModel):
    command: str                        # e.g. "diff", "solve", "factor"
    expression: str                     # e.g. "x^3 + sin(x)"
    variable: Optional[str] = "x"      # primary variable for diff/integrate/solve
    variables: Optional[List[str]] = None  # for multi-variable ops (gradient)
    lower: Optional[float] = None       # lower bound for definite integrals
    upper: Optional[float] = None       # upper bound for definite integrals
    point: Optional[float] = None       # point for Taylor expansion / limit
    order: Optional[int] = None         # Taylor order (default 5)


class REPLResponse(BaseModel):
    success: bool
    command: str
    expression: str
    result: str                         # plain-text CAS result
    latex: str                          # LaTeX for KaTeX rendering in the frontend
    numeric: Optional[float] = None    # numeric approximation where meaningful
    steps_available: bool = True        # whether /steps can produce working for this
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class REPLEngine:
    """
    Routes REPL commands to the appropriate SageMath operation.

    The design mirrors a teacher's mental model: you say what you want
    (differentiate this, solve that), and the engine handles the symbolic
    machinery.  Results come back in two forms — a compact plain-text string
    for screen readers and the REPL history, and a LaTeX string for the
    rendered display pane.
    """

    def __init__(self, cas_engine):
        self.cas = cas_engine

    def evaluate(self, req: REPLRequest) -> REPLResponse:
        if not self.cas.ready:
            return REPLResponse(
                success=False,
                command=req.command,
                expression=req.expression,
                result="",
                latex="",
                error="SageMath not available on this server",
                steps_available=False,
            )

        handlers = {
            "simplify":   self._simplify,
            "expand":     self._expand,
            "factor":     self._factor,
            "diff":       self._diff,
            "integrate":  self._integrate,
            "solve":      self._solve,
            "evaluate":   self._evaluate,
            "partial":    self._partial,
            "gradient":   self._gradient,
            "taylor":     self._taylor,
            "limit":      self._limit,
        }

        handler = handlers.get(req.command.lower())
        if handler is None:
            return REPLResponse(
                success=False,
                command=req.command,
                expression=req.expression,
                result="",
                latex="",
                error=f"Unknown command '{req.command}'. Available: {', '.join(handlers.keys())}",
                steps_available=False,
            )

        try:
            return handler(req)
        except Exception as exc:
            logger.warning("REPL %s error on '%s': %s", req.command, req.expression, exc)
            return REPLResponse(
                success=False,
                command=req.command,
                expression=req.expression,
                result="",
                latex="",
                error=str(exc),
                steps_available=False,
            )

    # ------------------------------------------------------------------
    # Private handlers
    # ------------------------------------------------------------------

    def _sage(self):
        return self.cas._sage

    def _to_latex(self, sage_expr) -> str:
        """Convert a SageMath expression to LaTeX string."""
        try:
            return str(sage_expr._latex_())
        except Exception:
            return str(sage_expr)

    def _simplify(self, req: REPLRequest) -> REPLResponse:
        sage = self._sage()
        expr = sage["SR"](req.expression)
        result = expr.simplify_full()
        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=str(result), latex=self._to_latex(result),
            steps_available=True,
        )

    def _expand(self, req: REPLRequest) -> REPLResponse:
        sage = self._sage()
        expr = sage["SR"](req.expression)
        result = expr.expand()
        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=str(result), latex=self._to_latex(result),
            steps_available=True,
        )

    def _factor(self, req: REPLRequest) -> REPLResponse:
        sage = self._sage()
        x = sage["var"](req.variable or "x")
        expr = sage["SR"](req.expression)
        result = expr.factor()
        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=str(result), latex=self._to_latex(result),
            steps_available=True,
        )

    def _diff(self, req: REPLRequest) -> REPLResponse:
        sage = self._sage()
        var_sym = sage["var"](req.variable or "x")
        expr = sage["SR"](req.expression)
        result = sage["diff"](expr, var_sym)
        # Numeric approximation at x=1 for context
        try:
            numeric = float(result.subs({var_sym: 1}).numerical_approx(digits=6))
        except Exception:
            numeric = None
        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=str(result), latex=self._to_latex(result),
            numeric=numeric, steps_available=True,
        )

    def _integrate(self, req: REPLRequest) -> REPLResponse:
        sage = self._sage()
        var_sym = sage["var"](req.variable or "x")
        expr = sage["SR"](req.expression)

        if req.lower is not None and req.upper is not None:
            # Definite integral
            result = sage["integrate"](expr, var_sym, req.lower, req.upper)
            try:
                numeric = float(sage["numerical_approx"](result, digits=8))
            except Exception:
                numeric = None
            latex = f"\\int_{{{req.lower}}}^{{{req.upper}}} {self._to_latex(expr)} \\, d{req.variable or 'x'} = {self._to_latex(result)}"
        else:
            # Indefinite integral
            result = sage["integrate"](expr, var_sym)
            numeric = None
            latex = f"\\int {self._to_latex(expr)} \\, d{req.variable or 'x'} = {self._to_latex(result)} + C"

        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=str(result), latex=latex,
            numeric=numeric, steps_available=True,
        )

    def _solve(self, req: REPLRequest) -> REPLResponse:
        sage = self._sage()
        var_sym = sage["var"](req.variable or "x")

        # Allow "expr = 0" or "expr" (assume = 0)
        raw = req.expression.strip()
        if "=" in raw:
            lhs_str, rhs_str = raw.split("=", 1)
            lhs = sage["SR"](lhs_str.strip())
            rhs = sage["SR"](rhs_str.strip())
            equation = lhs == rhs
        else:
            equation = sage["SR"](raw) == 0

        solutions = sage["solve"](equation, var_sym)

        if not solutions:
            result_str = "No solutions found"
            latex_str = "\\text{No solutions}"
        else:
            parts = [str(s.rhs()) if hasattr(s, "rhs") else str(s) for s in solutions]
            result_str = f"{req.variable or 'x'} = {', '.join(parts)}"
            latex_parts = [self._to_latex(s.rhs()) if hasattr(s, "rhs") else self._to_latex(s) for s in solutions]
            latex_str = f"{req.variable or 'x'} = {', '.join(latex_parts)}"

        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=result_str, latex=latex_str,
            steps_available=True,
        )

    def _evaluate(self, req: REPLRequest) -> REPLResponse:
        sage = self._sage()
        expr = sage["SR"](req.expression)
        result = sage["numerical_approx"](expr, digits=10)
        try:
            numeric = float(result)
        except Exception:
            numeric = None
        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=str(result), latex=self._to_latex(result),
            numeric=numeric, steps_available=False,
        )

    def _partial(self, req: REPLRequest) -> REPLResponse:
        """Partial derivative — variable defaults to x, pass 'y' for ∂/∂y."""
        sage = self._sage()
        var_name = req.variable or "x"
        # Declare both x and y so multi-variable expressions parse correctly
        sage["var"]("x y")
        var_sym = sage["var"](var_name)
        expr = sage["SR"](req.expression)
        result = sage["diff"](expr, var_sym)
        latex = f"\\frac{{\\partial}}{{\\partial {var_name}}} \\left( {self._to_latex(expr)} \\right) = {self._to_latex(result)}"
        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=str(result), latex=latex, steps_available=True,
        )

    def _gradient(self, req: REPLRequest) -> REPLResponse:
        """Gradient vector ∇f = [∂f/∂x, ∂f/∂y]."""
        sage = self._sage()
        sage["var"]("x y")
        expr = sage["SR"](req.expression)
        dfdx = sage["diff"](expr, sage["var"]("x"))
        dfdy = sage["diff"](expr, sage["var"]("y"))
        result_str = f"[{dfdx}, {dfdy}]"
        latex = (
            f"\\nabla f = \\left[ {self._to_latex(dfdx)},\\; {self._to_latex(dfdy)} \\right]"
        )
        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=result_str, latex=latex, steps_available=True,
        )

    def _taylor(self, req: REPLRequest) -> REPLResponse:
        sage = self._sage()
        var_sym = sage["var"](req.variable or "x")
        expr = sage["SR"](req.expression)
        point = req.point if req.point is not None else 0
        order = req.order if req.order is not None else 5
        result = expr.taylor(var_sym, point, order)
        latex = f"T_{order}({req.variable or 'x'}) = {self._to_latex(result)}"
        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=str(result), latex=latex, steps_available=False,
        )

    def _limit(self, req: REPLRequest) -> REPLResponse:
        sage = self._sage()
        var_sym = sage["var"](req.variable or "x")
        expr = sage["SR"](req.expression)
        point = req.point if req.point is not None else 0

        from sage.all import limit as sage_limit
        result = sage_limit(expr, var_sym, point)

        try:
            numeric = float(sage["numerical_approx"](result, digits=8))
        except Exception:
            numeric = None

        latex = (
            f"\\lim_{{{req.variable or 'x'} \\to {point}}} "
            f"{self._to_latex(expr)} = {self._to_latex(result)}"
        )
        return REPLResponse(
            success=True, command=req.command, expression=req.expression,
            result=str(result), latex=latex, numeric=numeric, steps_available=False,
        )
