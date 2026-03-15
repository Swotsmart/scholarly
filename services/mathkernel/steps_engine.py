"""
StepsEngine — step-by-step symbolic working for the MathCanvas Steps panel.

The analogy: a maths teacher doesn't just hand back the answer — they show
their working on the board, one transformation at a time, so students can
see exactly where each line comes from.  This engine does the same thing
symbolically.  For "differentiate x³ − 3x + 2", a student shouldn't just
see "3x² − 3" — they should see the power rule applied term-by-term,
each step labelled with the rule that justifies it.

Each operation returns an ordered list of WorkingStep objects, each with:
  - a plain-English explanation of what rule or technique is being applied
  - a LaTeX expression showing the mathematical state after that step
  - an optional "note" for teacher-facing annotation

The frontend renders these as a vertical scroll of steps, each revealed
one at a time if the student wants to work through it at their own pace,
or all at once if they're stuck and need the full solution.
"""

import logging
from typing import Optional, List
from pydantic import BaseModel

logger = logging.getLogger("mathkernel.steps")


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class WorkingStep(BaseModel):
    step_number: int
    rule: str           # short rule name, e.g. "Power Rule", "Chain Rule"
    explanation: str    # full sentence explaining this step
    expression: str     # plain-text expression after this step
    latex: str          # LaTeX expression after this step
    note: Optional[str] = None  # teacher-facing annotation


class StepsRequest(BaseModel):
    operation: str              # "diff", "integrate", "factor", "solve", "simplify",
                                # "expand", "partial_x", "partial_y", "gradient"
    expression: str
    variable: Optional[str] = "x"
    lower: Optional[float] = None   # for definite integrals
    upper: Optional[float] = None


class StepsResponse(BaseModel):
    success: bool
    operation: str
    expression: str
    final_result: str
    final_latex: str
    steps: List[WorkingStep]
    concept_note: Optional[str] = None   # big-picture pedagogical note
    error: Optional[str] = None


# ---------------------------------------------------------------------------
# Engine
# ---------------------------------------------------------------------------

class StepsEngine:
    """
    Generates pedagogically structured step-by-step working using SageMath.

    Operations are broken into their constituent algebraic moves — not just
    "apply rule once" but "here is each term, here is the rule applied to
    that term, here is the result of combining them".  For differentiation
    this means term-by-term decomposition.  For factoring this means
    discriminant → roots → factored form.  For solving this means
    rearrangement → root finding → checking.
    """

    def __init__(self, cas_engine):
        self.cas = cas_engine

    def generate(self, req: StepsRequest) -> StepsResponse:
        if not self.cas.ready:
            return StepsResponse(
                success=False,
                operation=req.operation,
                expression=req.expression,
                final_result="",
                final_latex="",
                steps=[],
                error="SageMath not available on this server",
            )

        handlers = {
            "diff":       self._steps_diff,
            "integrate":  self._steps_integrate,
            "factor":     self._steps_factor,
            "solve":      self._steps_solve,
            "simplify":   self._steps_simplify,
            "expand":     self._steps_expand,
            "partial_x":  lambda r: self._steps_partial(r, "x"),
            "partial_y":  lambda r: self._steps_partial(r, "y"),
            "gradient":   self._steps_gradient,
        }

        handler = handlers.get(req.operation.lower())
        if handler is None:
            return StepsResponse(
                success=False,
                operation=req.operation,
                expression=req.expression,
                final_result="",
                final_latex="",
                steps=[],
                error=f"Unknown operation '{req.operation}'",
            )

        try:
            return handler(req)
        except Exception as exc:
            logger.warning("Steps %s error on '%s': %s", req.operation, req.expression, exc)
            return StepsResponse(
                success=False,
                operation=req.operation,
                expression=req.expression,
                final_result="",
                final_latex="",
                steps=[],
                error=str(exc),
            )

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _sage(self):
        return self.cas._sage

    def _latex(self, expr) -> str:
        try:
            return str(expr._latex_())
        except Exception:
            return str(expr)

    def _step(self, n: int, rule: str, explanation: str, expr, note: str = None) -> WorkingStep:
        return WorkingStep(
            step_number=n,
            rule=rule,
            explanation=explanation,
            expression=str(expr),
            latex=self._latex(expr),
            note=note,
        )

    # ------------------------------------------------------------------
    # Differentiation — term-by-term decomposition
    # ------------------------------------------------------------------

    def _steps_diff(self, req: StepsRequest) -> StepsResponse:
        """
        Differentiate term-by-term, labelling each rule.
        Approach: expand the expression, decompose into additive terms,
        apply power/trig/exp/log rules to each, then recombine.
        """
        sage = self._sage()
        var_sym = sage["var"](req.variable or "x")
        expr = sage["SR"](req.expression).expand()

        steps: List[WorkingStep] = []
        n = 1

        # Step 1 — identify the expression
        steps.append(self._step(
            n, "Identify", f"We want to find d/d{req.variable}[{req.expression}].",
            expr,
            note="Expand first to reveal individual terms clearly.",
        ))
        n += 1

        # Step 2 — collect terms
        try:
            # Try to iterate as a sum of terms
            from sage.symbolic.expression import Expression
            terms = expr.operands() if expr.operator().__name__ == "add" else [expr]
        except Exception:
            terms = [expr]

        if len(terms) > 1:
            term_list = " + ".join(str(t) for t in terms)
            steps.append(self._step(
                n, "Sum Rule",
                f"By the Sum Rule, differentiate each term separately: {term_list}.",
                expr,
            ))
            n += 1

        # Step 3 — differentiate each term
        derived_terms = []
        for term in terms:
            d_term = sage["diff"](term, var_sym).simplify_full()
            derived_terms.append(d_term)

            # Identify which rule was used
            term_str = str(term)
            if str(var_sym) not in term_str:
                rule_name = "Constant Rule"
                explanation = f"d/d{req.variable}[{term_str}] = 0  (constants differentiate to zero)"
            elif "sin" in term_str or "cos" in term_str or "tan" in term_str:
                rule_name = "Trigonometric Rule"
                explanation = f"d/d{req.variable}[{term_str}] = {d_term}"
            elif "exp" in term_str or "e^" in term_str:
                rule_name = "Exponential Rule"
                explanation = f"d/d{req.variable}[{term_str}] = {d_term}  (the exponential function is its own derivative)"
            elif "log" in term_str or "ln" in term_str:
                rule_name = "Logarithm Rule"
                explanation = f"d/d{req.variable}[{term_str}] = {d_term}"
            else:
                rule_name = "Power Rule"
                explanation = f"d/d{req.variable}[{term_str}] = {d_term}  (multiply by power, reduce power by 1)"

            steps.append(self._step(n, rule_name, explanation, d_term))
            n += 1

        # Step 4 — recombine
        final = sage["diff"](expr, var_sym).simplify_full()
        if len(terms) > 1:
            steps.append(self._step(
                n, "Combine",
                f"Combine the differentiated terms to get the final derivative.",
                final,
            ))
            n += 1

        return StepsResponse(
            success=True,
            operation=req.operation,
            expression=req.expression,
            final_result=str(final),
            final_latex=f"\\frac{{d}}{{d{req.variable}}}\\left({self._latex(expr)}\\right) = {self._latex(final)}",
            steps=steps,
            concept_note=(
                "The derivative gives the instantaneous rate of change at any point. "
                "On a 3D surface z = f(x,y), the partial derivatives give the slope "
                "in the x and y directions — together they define the gradient vector."
            ),
        )

    # ------------------------------------------------------------------
    # Integration — indefinite, with step decomposition
    # ------------------------------------------------------------------

    def _steps_integrate(self, req: StepsRequest) -> StepsResponse:
        sage = self._sage()
        var_sym = sage["var"](req.variable or "x")
        expr = sage["SR"](req.expression).expand()

        is_definite = req.lower is not None and req.upper is not None
        steps: List[WorkingStep] = []
        n = 1

        steps.append(self._step(
            n, "Identify",
            f"Find ∫ {req.expression} d{req.variable}" + (f" from {req.lower} to {req.upper}" if is_definite else " (indefinite)"),
            expr,
        ))
        n += 1

        # Term decomposition
        try:
            terms = expr.operands() if expr.operator().__name__ == "add" else [expr]
        except Exception:
            terms = [expr]

        if len(terms) > 1:
            steps.append(self._step(
                n, "Sum Rule",
                "By the Sum Rule for integration, integrate each term separately.",
                expr,
            ))
            n += 1

        for term in terms:
            i_term = sage["integrate"](term, var_sym)
            term_str = str(term)
            if str(var_sym) not in term_str:
                rule_name = "Constant Rule"
                explanation = f"∫ {term_str} d{req.variable} = {i_term}{req.variable}  (constants integrate to constant × variable)"
            elif "sin" in term_str or "cos" in term_str:
                rule_name = "Trigonometric Rule"
                explanation = f"∫ {term_str} d{req.variable} = {i_term}"
            elif "exp" in term_str or "e^" in term_str:
                rule_name = "Exponential Rule"
                explanation = f"∫ {term_str} d{req.variable} = {i_term}"
            else:
                rule_name = "Power Rule (Reverse)"
                explanation = f"∫ {term_str} d{req.variable} = {i_term}  (add 1 to power, divide by new power)"
            steps.append(self._step(n, rule_name, explanation, i_term))
            n += 1

        if is_definite:
            antideriv = sage["integrate"](expr, var_sym)
            final = sage["integrate"](expr, var_sym, req.lower, req.upper)
            steps.append(self._step(
                n, "Fundamental Theorem",
                f"Apply the Fundamental Theorem of Calculus: F({req.upper}) − F({req.lower}).",
                antideriv,
            ))
            n += 1
            steps.append(self._step(
                n, "Evaluate",
                f"Substitute limits: F({req.upper}) − F({req.lower}) = {final}",
                final,
            ))
            final_latex = (
                f"\\int_{{{req.lower}}}^{{{req.upper}}} {self._latex(expr)} \\, d{req.variable} "
                f"= {self._latex(final)}"
            )
        else:
            final = sage["integrate"](expr, var_sym)
            steps.append(self._step(
                n, "Combine + Constant",
                "Combine the integrated terms and add the constant of integration C.",
                final,
                note="The +C represents an arbitrary constant — all antiderivatives of a function differ only by a constant.",
            ))
            final_latex = (
                f"\\int {self._latex(expr)} \\, d{req.variable} = {self._latex(final)} + C"
            )

        return StepsResponse(
            success=True,
            operation=req.operation,
            expression=req.expression,
            final_result=str(final),
            final_latex=final_latex,
            steps=steps,
            concept_note=(
                "Integration is the reverse of differentiation — it finds the area under the curve. "
                "The definite integral gives a specific area; the indefinite integral gives a family of functions."
            ),
        )

    # ------------------------------------------------------------------
    # Factorisation — discriminant → roots → factored form
    # ------------------------------------------------------------------

    def _steps_factor(self, req: StepsRequest) -> StepsResponse:
        sage = self._sage()
        x = sage["var"](req.variable or "x")
        expr = sage["SR"](req.expression)
        steps: List[WorkingStep] = []
        n = 1

        steps.append(self._step(n, "Identify", f"Factorise: {req.expression}", expr))
        n += 1

        # Try to extract polynomial coefficients for step-by-step quadratic treatment
        try:
            poly = expr.polynomial(x)
            degree = poly.degree()
            if degree == 2:
                coeffs = poly.coefficients(sparse=False)
                a_val = float(coeffs[2]) if len(coeffs) > 2 else 0
                b_val = float(coeffs[1]) if len(coeffs) > 1 else 0
                c_val = float(coeffs[0]) if len(coeffs) > 0 else 0
                disc = b_val**2 - 4 * a_val * c_val

                steps.append(self._step(
                    n, "Identify Coefficients",
                    f"In the form ax² + bx + c: a = {a_val}, b = {b_val}, c = {c_val}",
                    expr,
                ))
                n += 1

                steps.append(self._step(
                    n, "Discriminant",
                    f"Calculate the discriminant: Δ = b² − 4ac = {b_val}² − 4({a_val})({c_val}) = {disc}",
                    sage["SR"](disc),
                    note=f"Δ > 0: two real roots. Δ = 0: one repeated root. Δ < 0: no real roots.",
                ))
                n += 1

                if disc >= 0:
                    solutions = sage["solve"](expr == 0, x)
                    roots = [s.rhs() for s in solutions if hasattr(s, "rhs")]
                    if roots:
                        root_str = ", ".join(str(r) for r in roots)
                        steps.append(self._step(
                            n, "Find Roots",
                            f"Use the quadratic formula: x = ({-b_val} ± √{disc}) / (2 × {a_val}). Roots: x = {root_str}",
                            sage["SR"](roots[0]),
                        ))
                        n += 1
        except Exception:
            pass  # Fall through to direct factoring

        factored = expr.factor()
        steps.append(self._step(
            n, "Factored Form",
            f"Write as a product of factors.",
            factored,
        ))

        return StepsResponse(
            success=True,
            operation=req.operation,
            expression=req.expression,
            final_result=str(factored),
            final_latex=f"{self._latex(expr)} = {self._latex(factored)}",
            steps=steps,
            concept_note=(
                "Factorising reveals the roots of the polynomial — the x-values where the function equals zero. "
                "On the 3D surface, these are where the surface intersects the z = 0 plane."
            ),
        )

    # ------------------------------------------------------------------
    # Solve — rearrangement → root finding → verification
    # ------------------------------------------------------------------

    def _steps_solve(self, req: StepsRequest) -> StepsResponse:
        sage = self._sage()
        var_sym = sage["var"](req.variable or "x")
        steps: List[WorkingStep] = []
        n = 1

        raw = req.expression.strip()
        if "=" in raw:
            lhs_str, rhs_str = raw.split("=", 1)
            lhs = sage["SR"](lhs_str.strip())
            rhs = sage["SR"](rhs_str.strip())
            equation = lhs == rhs
            steps.append(self._step(n, "Identify", f"Solve: {lhs_str.strip()} = {rhs_str.strip()}", lhs - rhs))
        else:
            expr = sage["SR"](raw)
            equation = expr == 0
            steps.append(self._step(n, "Identify", f"Solve: {raw} = 0", expr))
            lhs = expr
            rhs = sage["SR"](0)
        n += 1

        # Rearrange to standard form
        standard = (lhs - rhs).expand()
        if str(standard) != str(lhs):
            steps.append(self._step(
                n, "Rearrange",
                f"Move all terms to one side: {standard} = 0",
                standard,
            ))
            n += 1

        solutions = sage["solve"](equation, var_sym)

        if not solutions:
            steps.append(self._step(n, "Result", "No real solutions exist.", sage["SR"](0)))
            final_str = "No solutions"
            final_latex = "\\text{No solutions}"
        else:
            for s in solutions:
                rhs_val = s.rhs() if hasattr(s, "rhs") else s
                steps.append(self._step(
                    n, "Solve",
                    f"Solution: {req.variable or 'x'} = {rhs_val}",
                    rhs_val,
                ))
                n += 1

            # Verify by substitution
            for s in solutions[:2]:  # verify first two
                rhs_val = s.rhs() if hasattr(s, "rhs") else s
                check = standard.subs({var_sym: rhs_val}).simplify_full()
                steps.append(self._step(
                    n, "Verify",
                    f"Check: substitute {req.variable or 'x'} = {rhs_val} → {standard.subs({var_sym: rhs_val})} = {check} ✓",
                    check,
                    note="Always substitute back to verify — a habit that catches arithmetic errors.",
                ))
                n += 1

            parts = [str(s.rhs()) if hasattr(s, "rhs") else str(s) for s in solutions]
            final_str = f"{req.variable or 'x'} = {', '.join(parts)}"
            latex_parts = [self._latex(s.rhs()) if hasattr(s, "rhs") else self._latex(s) for s in solutions]
            final_latex = f"{req.variable or 'x'} = {', '.join(latex_parts)}"

        return StepsResponse(
            success=True,
            operation=req.operation,
            expression=req.expression,
            final_result=final_str,
            final_latex=final_latex,
            steps=steps,
        )

    # ------------------------------------------------------------------
    # Simplify / Expand (simpler — fewer steps)
    # ------------------------------------------------------------------

    def _steps_simplify(self, req: StepsRequest) -> StepsResponse:
        sage = self._sage()
        expr = sage["SR"](req.expression)
        result = expr.simplify_full()
        steps = [
            self._step(1, "Identify", f"Simplify: {req.expression}", expr),
            self._step(2, "Simplify", "Apply algebraic identities and cancel common factors.", result),
        ]
        return StepsResponse(
            success=True, operation=req.operation, expression=req.expression,
            final_result=str(result),
            final_latex=f"{self._latex(expr)} = {self._latex(result)}",
            steps=steps,
        )

    def _steps_expand(self, req: StepsRequest) -> StepsResponse:
        sage = self._sage()
        expr = sage["SR"](req.expression)
        result = expr.expand()
        steps = [
            self._step(1, "Identify", f"Expand: {req.expression}", expr),
            self._step(2, "Distribute", "Apply the distributive law to expand all brackets.", result),
        ]
        return StepsResponse(
            success=True, operation=req.operation, expression=req.expression,
            final_result=str(result),
            final_latex=f"{self._latex(expr)} = {self._latex(result)}",
            steps=steps,
        )

    # ------------------------------------------------------------------
    # Partial derivatives and gradient
    # ------------------------------------------------------------------

    def _steps_partial(self, req: StepsRequest, with_respect_to: str) -> StepsResponse:
        sage = self._sage()
        sage["var"]("x y")
        var_sym = sage["var"](with_respect_to)
        other = "y" if with_respect_to == "x" else "x"
        expr = sage["SR"](req.expression)
        steps: List[WorkingStep] = []
        n = 1

        steps.append(self._step(
            n, "Identify",
            f"Find ∂f/∂{with_respect_to} of f(x,y) = {req.expression}.",
            expr,
            note=f"Treat {other} as a constant. Differentiate only with respect to {with_respect_to}.",
        ))
        n += 1

        try:
            terms = expr.operands() if expr.operator().__name__ == "add" else [expr]
        except Exception:
            terms = [expr]

        if len(terms) > 1:
            steps.append(self._step(
                n, "Sum Rule",
                f"By the Sum Rule, differentiate each term with respect to {with_respect_to}.",
                expr,
            ))
            n += 1

        for term in terms:
            d_term = sage["diff"](term, var_sym)
            steps.append(self._step(
                n, "Differentiate Term",
                f"∂/∂{with_respect_to}[{term}] = {d_term}"
                + (f"  (term has no {with_respect_to}, so derivative = 0)" if str(var_sym) not in str(term) else ""),
                d_term,
            ))
            n += 1

        result = sage["diff"](expr, var_sym).simplify_full()
        steps.append(self._step(
            n, "Combine",
            f"Combine terms: ∂f/∂{with_respect_to} = {result}",
            result,
        ))

        return StepsResponse(
            success=True,
            operation=req.operation,
            expression=req.expression,
            final_result=str(result),
            final_latex=f"\\frac{{\\partial f}}{{\\partial {with_respect_to}}} = {self._latex(result)}",
            steps=steps,
            concept_note=(
                f"The partial derivative ∂f/∂{with_respect_to} gives the slope of the surface "
                f"in the {with_respect_to}-direction at any point. "
                f"Together with ∂f/∂{other}, it forms the gradient vector ∇f."
            ),
        )

    def _steps_gradient(self, req: StepsRequest) -> StepsResponse:
        sage = self._sage()
        sage["var"]("x y")
        x_sym = sage["var"]("x")
        y_sym = sage["var"]("y")
        expr = sage["SR"](req.expression)

        dfdx = sage["diff"](expr, x_sym).simplify_full()
        dfdy = sage["diff"](expr, y_sym).simplify_full()

        steps = [
            self._step(1, "Identify", f"Find ∇f for f(x,y) = {req.expression}.", expr,
                       note="The gradient vector points in the direction of steepest ascent on the surface."),
            self._step(2, "Partial ∂f/∂x", f"∂f/∂x = {dfdx}  (treat y as constant)", dfdx),
            self._step(3, "Partial ∂f/∂y", f"∂f/∂y = {dfdy}  (treat x as constant)", dfdy),
            self._step(4, "Assemble ∇f", f"∇f = [{dfdx}, {dfdy}]",
                       sage["SR"](f"({dfdx}, {dfdy})"),
                       note="The gradient vector has magnitude equal to the steepness of the slope at that point."),
        ]

        final_latex = (
            f"\\nabla f = \\left[ {self._latex(dfdx)},\\; {self._latex(dfdy)} \\right]"
        )

        return StepsResponse(
            success=True,
            operation=req.operation,
            expression=req.expression,
            final_result=f"[{dfdx}, {dfdy}]",
            final_latex=final_latex,
            steps=steps,
            concept_note=(
                "The gradient vector ∇f at a point (a,b) is perpendicular to the level curves of f "
                "and points in the direction of maximum rate of increase. "
                "Its magnitude ‖∇f‖ = √((∂f/∂x)² + (∂f/∂y)²) equals the steepness of the surface at that point."
            ),
        )
