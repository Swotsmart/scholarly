"""
CASEngine — SageMath wrapper for symbolic verification.

Design philosophy: every method returns a result object rather than raising —
the RubricEngine decides how to interpret partial failures.  If SageMath
cannot verify a claim (unsupported expression, timeout, parse error) the
result carries verified=False and a reason string so the frontend can display
an amber ~ badge rather than crashing.

Think of this as the dictionary that the spell-checker consults: if a word
isn't in the dictionary we say "unknown" rather than "wrong".
"""

import logging
import time
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger("mathkernel.cas")


@dataclass
class VerificationResult:
    verified: bool
    method: str          # e.g. "roots_exact", "derivative_symbolic", "unsupported"
    expected: Any = None # what CAS computed
    student: Any = None  # what the student claimed
    delta: float = 0.0   # numeric distance (0.0 = exact match)
    reason: str = ""     # human-readable explanation for the frontend


class CASEngine:
    """
    Wraps SageMath's symbolic engine.  Import of sage is deferred to warmup()
    so that the FastAPI app starts immediately even if SageMath is loading.
    """

    def __init__(self):
        self.ready = False
        self._sage = None

    def warmup(self):
        """
        Pre-import SageMath and run a trivial computation to warm the JVM-equivalent.
        SageMath's first symbolic operation after import can take 2–4 seconds;
        subsequent calls are fast.  By warming up at startup, students never
        experience that latency.
        """
        try:
            from sage.all import SR, solve, diff, integrate, var, numerical_approx
            _ = solve(SR("x^2 - 1"), SR("x"))   # trivial warmup expression
            self._sage = {
                "SR": SR,
                "solve": solve,
                "diff": diff,
                "integrate": integrate,
                "var": var,
                "numerical_approx": numerical_approx,
            }
            self.ready = True
            logger.info("SageMath warmup complete")
        except ImportError:
            logger.warning(
                "SageMath not installed — CAS verification unavailable. "
                "Install with: pip install sagemath-standard"
            )
            self.ready = False

    def verify(self, req) -> "VerifyResponse":
        """Route to the appropriate verification method based on req.type."""
        from rubric_engine import VerifyRequest, VerifyResponse

        if not self.ready:
            return VerifyResponse(
                verified=False,
                method="unavailable",
                reason="SageMath not installed on this server",
                cas_result=None,
            )

        handler = {
            "roots":      self._verify_roots,
            "derivative": self._verify_derivative,
            "integral":   self._verify_integral,
            "expression": self._verify_expression,
            "geometry":   self._verify_geometry,
            "statistics": self._verify_statistics,
        }.get(req.type)

        if handler is None:
            return VerifyResponse(
                verified=False,
                method="unsupported",
                reason=f"Verification type '{req.type}' not supported",
                cas_result=None,
            )

        result = handler(req)
        return VerifyResponse(
            verified=result.verified,
            method=result.method,
            reason=result.reason,
            cas_result={"expected": str(result.expected), "delta": result.delta},
        )

    # ------------------------------------------------------------------ #
    # Private verification methods
    # ------------------------------------------------------------------ #

    def _verify_roots(self, req) -> VerificationResult:
        """
        Solve f(x) = 0 symbolically and compare to student's claimed roots.
        e.g. expression="x^2 - 3*x + 2", student_answer=[1, 2]
        """
        try:
            sage = self._sage
            x = sage["var"]("x")
            expr = sage["SR"](req.expression)
            solutions = sage["solve"](expr == 0, x)
            cas_roots = sorted([
                float(sage["numerical_approx"](s.rhs(), digits=10))
                for s in solutions
            ])

            student_roots = sorted([float(r) for r in (req.student_answer or [])])

            if not cas_roots:
                return VerificationResult(
                    verified=False, method="roots_no_solution",
                    reason="Expression has no real roots",
                    expected=[], student=student_roots
                )

            if len(cas_roots) != len(student_roots):
                return VerificationResult(
                    verified=False, method="roots_count_mismatch",
                    expected=cas_roots, student=student_roots,
                    reason=f"Expected {len(cas_roots)} root(s), student found {len(student_roots)}"
                )

            max_delta = max(abs(a - b) for a, b in zip(cas_roots, student_roots))
            tolerance = 0.01
            return VerificationResult(
                verified=max_delta <= tolerance,
                method="roots_exact" if max_delta == 0 else "roots_approximate",
                expected=cas_roots,
                student=student_roots,
                delta=max_delta,
                reason="" if max_delta <= tolerance else f"Root error {max_delta:.4f} exceeds tolerance {tolerance}"
            )
        except Exception as exc:
            logger.debug("roots verify error: %s", exc)
            return VerificationResult(
                verified=False, method="roots_error",
                reason=f"Could not evaluate: {exc}"
            )

    def _verify_derivative(self, req) -> VerificationResult:
        """
        Differentiate expression and compare symbolically.
        e.g. expression="x^3", student_answer="3*x^2"
        """
        try:
            sage = self._sage
            x = sage["var"]("x")
            expr = sage["SR"](req.expression)
            cas_deriv = sage["diff"](expr, x)

            student_expr = sage["SR"](str(req.student_answer))
            diff_expr = sage["SR"](cas_deriv - student_expr).simplify_full()

            # If the simplified difference is zero, they're symbolically equal
            is_zero = bool(diff_expr == 0)

            return VerificationResult(
                verified=is_zero,
                method="derivative_symbolic",
                expected=str(cas_deriv),
                student=str(student_expr),
                delta=0.0 if is_zero else 1.0,
                reason="" if is_zero else f"CAS derivative: {cas_deriv}, student: {student_expr}"
            )
        except Exception as exc:
            logger.debug("derivative verify error: %s", exc)
            return VerificationResult(
                verified=False, method="derivative_error",
                reason=f"Could not differentiate: {exc}"
            )

    def _verify_integral(self, req) -> VerificationResult:
        """
        Integrate expression and check symbolic equivalence (up to constant).
        e.g. expression="2*x", student_answer="x^2"
        """
        try:
            sage = self._sage
            x = sage["var"]("x")
            expr = sage["SR"](req.expression)
            cas_integral = sage["integrate"](expr, x)

            student_expr = sage["SR"](str(req.student_answer))
            # Differentiate student's answer and compare to original (handles +C)
            student_deriv = sage["diff"](student_expr, x).simplify_full()
            original = expr.simplify_full()

            diff_check = sage["SR"](student_deriv - original).simplify_full()
            is_correct = bool(diff_check == 0)

            return VerificationResult(
                verified=is_correct,
                method="integral_by_differentiation",
                expected=str(cas_integral),
                student=str(student_expr),
                delta=0.0 if is_correct else 1.0,
                reason="" if is_correct else f"d/dx of student answer ≠ integrand"
            )
        except Exception as exc:
            logger.debug("integral verify error: %s", exc)
            return VerificationResult(
                verified=False, method="integral_error",
                reason=f"Could not verify integral: {exc}"
            )

    def _verify_expression(self, req) -> VerificationResult:
        """General algebraic equivalence: are two expressions symbolically equal?"""
        try:
            sage = self._sage
            expr_a = sage["SR"](req.expression)
            expr_b = sage["SR"](str(req.student_answer))
            diff = sage["SR"](expr_a - expr_b).simplify_full()
            is_equal = bool(diff == 0)
            return VerificationResult(
                verified=is_equal,
                method="expression_equivalence",
                expected=str(expr_a),
                student=str(expr_b),
                delta=0.0 if is_equal else 1.0,
                reason="" if is_equal else "Expressions are not symbolically equivalent"
            )
        except Exception as exc:
            return VerificationResult(
                verified=False, method="expression_error",
                reason=f"Could not compare expressions: {exc}"
            )

    def _verify_geometry(self, req) -> VerificationResult:
        """
        Numeric geometry verification (area, perimeter, angles).
        Compares student's numeric answer to computed value within 1% tolerance.
        """
        try:
            if req.expected_value is None:
                return VerificationResult(
                    verified=False, method="geometry_no_reference",
                    reason="No reference value provided for geometry verification"
                )
            expected = float(req.expected_value)
            student_val = float(req.student_answer)
            rel_error = abs(expected - student_val) / max(abs(expected), 1e-10)
            tolerance = 0.01  # 1%
            return VerificationResult(
                verified=rel_error <= tolerance,
                method="geometry_numeric",
                expected=expected,
                student=student_val,
                delta=rel_error,
                reason="" if rel_error <= tolerance else f"Error {rel_error*100:.1f}% exceeds 1% tolerance"
            )
        except Exception as exc:
            return VerificationResult(
                verified=False, method="geometry_error",
                reason=f"Geometry verification failed: {exc}"
            )

    def _verify_statistics(self, req) -> VerificationResult:
        """
        Statistics verification: mean, std, correlation from raw dataset.
        """
        try:
            if not req.dataset:
                return VerificationResult(
                    verified=False, method="statistics_no_data",
                    reason="No dataset provided for statistics verification"
                )
            import statistics as pystats
            data = [float(x) for x in req.dataset]

            stat_type = req.stat_type or "mean"
            if stat_type == "mean":
                expected = pystats.mean(data)
            elif stat_type == "stdev":
                expected = pystats.stdev(data) if len(data) > 1 else 0.0
            elif stat_type == "median":
                expected = pystats.median(data)
            else:
                return VerificationResult(
                    verified=False, method="statistics_unsupported",
                    reason=f"Stat type '{stat_type}' not supported"
                )

            student_val = float(req.student_answer)
            delta = abs(expected - student_val)
            tolerance = max(abs(expected) * 0.01, 0.001)  # 1% or 0.001 abs

            return VerificationResult(
                verified=delta <= tolerance,
                method=f"statistics_{stat_type}",
                expected=round(expected, 6),
                student=student_val,
                delta=delta,
                reason="" if delta <= tolerance else f"{stat_type}={expected:.4f}, student={student_val}"
            )
        except Exception as exc:
            return VerificationResult(
                verified=False, method="statistics_error",
                reason=f"Statistics verification failed: {exc}"
            )
