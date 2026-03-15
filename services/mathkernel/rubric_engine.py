"""
RubricEngine — turns CAS verification results into a structured rubric response.

The rubric response is a drop-in replacement for what Claude previously returned,
with two additional fields:
  casVerified: bool   — true if ALL criteria were CAS-verified (not inferred)
  verificationMethod: str per criterion — "cas_exact", "cas_approximate",
                       "cas_symbolic", "claude_inferred", "unavailable"

This is the layer that translates the binary world of the CAS engine
(right/wrong with certainty) into the nuanced pedagogical world of a rubric
(5 criteria, narrative, grade).  Think of it as the examiner who receives the
dictionary's verdict and writes the report card.
"""

import logging
from typing import Any, Optional
from pydantic import BaseModel, Field

logger = logging.getLogger("mathkernel.rubric")


# ---------------------------------------------------------------------------
# Request / Response models (Pydantic — auto-validates from JSON body)
# ---------------------------------------------------------------------------

class VerifyRequest(BaseModel):
    type: str                              # "roots" | "derivative" | "integral" | "expression" | "geometry" | "statistics"
    expression: Optional[str] = None      # The mathematical expression (e.g. "x^2 - 3*x + 2")
    student_answer: Optional[Any] = None  # Student's claim (list for roots, string for expressions)
    expected_value: Optional[float] = None
    dataset: Optional[list[float]] = None
    stat_type: Optional[str] = None       # "mean" | "stdev" | "median"


class VerifyResponse(BaseModel):
    verified: bool
    method: str
    reason: str
    cas_result: Optional[dict] = None


class RubricCriterion(BaseModel):
    label: str
    score: int = Field(ge=0, le=100)
    comment: str
    verification_method: str = "claude_inferred"   # "cas_exact" | "cas_approximate" | "cas_symbolic" | "claude_inferred" | "unavailable"
    cas_verified: bool = False


class RubricResponse(BaseModel):
    criteria: list[RubricCriterion]
    narrative: str
    grade: str
    cas_verified: bool   # True only if ALL verifiable criteria passed CAS check
    cas_method: str      # Primary verification method used


class SubmissionScores(BaseModel):
    visualisation: int = 70
    construction: int = 70
    elegance: int = 70
    curriculum_hits: int = 1


class RubricRequest(BaseModel):
    strand: str                                     # "functions" | "geometry" | "statistics"
    intent: Optional[str] = None                    # Student's stated intent
    scores: Optional[SubmissionScores] = None       # Auto-scored dimensions from frontend
    # CAS verification hints (populated when student annotates roots, derivatives etc.)
    expression: Optional[str] = None               # Primary expression on canvas
    claimed_roots: Optional[list[float]] = None
    claimed_derivative: Optional[str] = None
    claimed_integral: Optional[str] = None
    dataset: Optional[list[float]] = None
    stat_type: Optional[str] = None
    geometry_type: Optional[str] = None            # "area" | "perimeter" | "angle"
    geometry_expected: Optional[float] = None
    student_geometry_answer: Optional[float] = None


# ---------------------------------------------------------------------------
# RubricEngine
# ---------------------------------------------------------------------------

class RubricEngine:

    def __init__(self, cas_engine):
        self.cas = cas_engine

    def evaluate(self, req: RubricRequest) -> RubricResponse:
        """
        Run CAS verification on all verifiable claims in the submission,
        then build a 5-criterion rubric response.
        """
        scores = req.scores or SubmissionScores()
        strand = req.strand or "functions"

        # --- Run all applicable CAS verifications ---------------------------
        cas_results = self._run_verifications(req, strand)

        # --- Build the 5 criteria -------------------------------------------
        criteria = self._build_criteria(strand, scores, cas_results, req)

        # --- Determine overall CAS status -----------------------------------
        verifiable = [c for c in criteria if c.verification_method != "unavailable"]
        all_cas = all(c.cas_verified for c in verifiable) and len(verifiable) > 0
        primary_method = self._primary_method(criteria)

        # --- Grade -----------------------------------------------------------
        avg_score = sum(c.score for c in criteria) / len(criteria)
        grade = "A" if avg_score >= 85 else "B" if avg_score >= 70 else "C" if avg_score >= 55 else "D"

        # --- Narrative -------------------------------------------------------
        narrative = self._build_narrative(strand, req, criteria, all_cas, avg_score)

        return RubricResponse(
            criteria=criteria,
            narrative=narrative,
            grade=grade,
            cas_verified=all_cas,
            cas_method=primary_method,
        )

    # ------------------------------------------------------------------ #
    # Private helpers
    # ------------------------------------------------------------------ #

    def _run_verifications(self, req: RubricRequest, strand: str) -> dict:
        """Run all applicable CAS checks and collect results."""
        results = {}

        if strand == "functions" and req.expression:
            if req.claimed_roots is not None:
                results["roots"] = self.cas._verify_roots(
                    _FakeReq(expression=req.expression, student_answer=req.claimed_roots)
                )
            if req.claimed_derivative:
                results["derivative"] = self.cas._verify_derivative(
                    _FakeReq(expression=req.expression, student_answer=req.claimed_derivative)
                )
            if req.claimed_integral:
                results["integral"] = self.cas._verify_integral(
                    _FakeReq(expression=req.expression, student_answer=req.claimed_integral)
                )

        elif strand == "geometry" and req.geometry_expected is not None:
            results["geometry"] = self.cas._verify_geometry(
                _FakeReq(
                    expression=req.geometry_type or "area",
                    student_answer=req.student_geometry_answer,
                    expected_value=req.geometry_expected,
                )
            )

        elif strand == "statistics" and req.dataset:
            results["statistics"] = self.cas._verify_statistics(
                _FakeReq(
                    expression="",
                    student_answer=req.scores.visualisation if req.scores else 70,  # student's claimed value
                    dataset=req.dataset,
                    stat_type=req.stat_type or "mean",
                )
            )

        return results

    def _build_criteria(self, strand, scores, cas_results, req) -> list[RubricCriterion]:
        """Build 5 rubric criteria, enriching with CAS results where available."""

        # Criterion 1: Mathematical Understanding — CAS-verified if possible
        root_result = cas_results.get("roots")
        if root_result and root_result.verified is not None:
            c1_score = 95 if root_result.verified else max(30, scores.visualisation - 30)
            c1_method = f"cas_{root_result.method.split('_')[1]}" if "_" in root_result.method else "cas_exact"
            c1_cas = root_result.verified
            c1_comment = (
                f"Roots verified by CAS: {root_result.expected}" if root_result.verified
                else f"Roots incorrect. CAS gives {root_result.expected}, student claimed {root_result.student}."
            )
        elif not self.cas.ready:
            c1_score = scores.visualisation
            c1_method = "unavailable"
            c1_cas = False
            c1_comment = "CAS unavailable — heuristic score from canvas analysis."
        else:
            c1_score = scores.visualisation
            c1_method = "claude_inferred"
            c1_cas = False
            c1_comment = "Demonstrates solid conceptual understanding of the mathematical domain."

        # Criterion 2: Visualisation Accuracy — CAS geometry if applicable
        geom_result = cas_results.get("geometry")
        if geom_result:
            c2_score = 95 if geom_result.verified else max(25, scores.construction - 35)
            c2_method = "cas_numeric"
            c2_cas = geom_result.verified
            c2_comment = (
                f"Geometric value verified: {geom_result.expected}." if geom_result.verified
                else geom_result.reason
            )
        else:
            c2_score = scores.construction
            c2_method = "claude_inferred"
            c2_cas = False
            c2_comment = "Construction is accurate and well-formed for the stated intent."

        # Criterion 3: Problem-Solving Process
        deriv_result = cas_results.get("derivative")
        integ_result = cas_results.get("integral")
        process_result = deriv_result or integ_result
        if process_result:
            c3_score = 95 if process_result.verified else max(35, scores.elegance - 25)
            c3_method = "cas_symbolic"
            c3_cas = process_result.verified
            c3_comment = (
                "Calculus work symbolically verified by CAS." if process_result.verified
                else f"CAS found discrepancy: {process_result.reason}"
            )
        else:
            c3_score = scores.elegance
            c3_method = "claude_inferred"
            c3_cas = False
            c3_comment = "Efficient approach with appropriate mathematical steps."

        # Criterion 4: Curriculum Alignment — always heuristic
        hits = scores.curriculum_hits
        c4_score = min(100, hits * 25 + 40)
        c4_method = "claude_inferred"
        c4_cas = False
        c4_comment = f"{hits} curriculum objective(s) evidenced in the construction."

        # Criterion 5: Communication of Ideas — always heuristic
        stat_result = cas_results.get("statistics")
        if stat_result:
            c5_score = 95 if stat_result.verified else max(40, (scores.visualisation + scores.elegance) // 2 - 15)
            c5_method = "cas_numeric"
            c5_cas = stat_result.verified
            c5_comment = (
                f"Statistical claim verified: {req.stat_type or 'mean'} = {stat_result.expected}." if stat_result.verified
                else f"Statistical answer differs from CAS result. {stat_result.reason}"
            )
        else:
            c5_score = (scores.visualisation + scores.elegance) // 2
            c5_method = "claude_inferred"
            c5_cas = False
            c5_comment = "Intent clearly expressed and mathematically coherent."

        return [
            RubricCriterion(label="Mathematical Understanding",  score=c1_score, comment=c1_comment, verification_method=c1_method, cas_verified=c1_cas),
            RubricCriterion(label="Visualisation Accuracy",      score=c2_score, comment=c2_comment, verification_method=c2_method, cas_verified=c2_cas),
            RubricCriterion(label="Problem-Solving Process",     score=c3_score, comment=c3_comment, verification_method=c3_method, cas_verified=c3_cas),
            RubricCriterion(label="Curriculum Alignment",        score=c4_score, comment=c4_comment, verification_method=c4_method, cas_verified=c4_cas),
            RubricCriterion(label="Communication of Ideas",      score=c5_score, comment=c5_comment, verification_method=c5_method, cas_verified=c5_cas),
        ]

    def _primary_method(self, criteria: list[RubricCriterion]) -> str:
        methods = [c.verification_method for c in criteria]
        if any("cas_exact" in m for m in methods):
            return "cas_exact"
        if any("cas_symbolic" in m for m in methods):
            return "cas_symbolic"
        if any("cas_" in m for m in methods):
            return "cas_numeric"
        if "unavailable" in methods:
            return "unavailable"
        return "claude_inferred"

    def _build_narrative(self, strand, req, criteria, all_cas, avg_score) -> str:
        intent_note = f' The stated intent "{req.intent[:60]}" is well-reflected in the construction.' if req.intent else ""
        cas_note = " All key mathematical claims were verified by the Computer Algebra System." if all_cas else ""
        next_step = {
            "functions": "Consider extending to explore domain restrictions or related transformations.",
            "geometry": "Consider verifying your work with coordinate geometry proofs.",
            "statistics": "Consider extending to explore distributions or hypothesis testing.",
        }.get(strand, "Consider extending to more complex cases as next steps.")

        tier = "excellent" if avg_score >= 85 else "solid" if avg_score >= 70 else "developing"
        return (
            f"{strand.title()} work demonstrates {tier} engagement with the mathematical concept.{intent_note}"
            f"{cas_note} {next_step}"
        )


# ---------------------------------------------------------------------------
# Small helper so internal verification methods can accept a duck-typed req
# ---------------------------------------------------------------------------
class _FakeReq:
    def __init__(self, **kwargs):
        for k, v in kwargs.items():
            setattr(self, k, v)
