# =============================================================================
# SCHOLARLY VOICE SERVICE — Sprint 30, Week 2
# Alignment & Phonics Narration Schemas
# =============================================================================
# Pydantic models for the new REST endpoints:
#   POST /api/v1/stt/align
#   POST /api/v1/studio/phonics-pace
#   POST /api/v1/studio/phonics-pace/preview
#
# These extend the existing models/schemas.py (Sprint 29, 605 lines).
# In production, these classes are added to that file. For self-containment
# in the sprint delivery, they're in a separate module.
#
# Follows the same conventions:
#   - Field descriptions for OpenAPI documentation
#   - Explicit validation constraints
#   - CostEstimate on every response for billing attribution
# =============================================================================

from __future__ import annotations

from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Section 1: Shared Types (re-exported from schemas.py)
# =============================================================================

class CostEstimate(BaseModel):
    """Cost estimate for billing attribution."""
    provider_id: str = Field(description="Provider that handled the request")
    compute_seconds: float = Field(description="GPU/CPU time consumed")
    estimated_cost_usd: float = Field(description="Estimated infrastructure cost")


class WordTimestamp(BaseModel):
    """A word with its precise time boundaries in the audio stream."""
    word: str = Field(description="The word text")
    start: float = Field(description="Start time in seconds")
    end: float = Field(description="End time in seconds")
    confidence: Optional[float] = Field(
        default=None,
        description="Alignment confidence (0.0–1.0). Higher = more certain.",
    )


class PhonemeTimestamp(BaseModel):
    """A phoneme with its time boundaries and alignment score."""
    phoneme: str = Field(description="IPA phoneme symbol")
    expected: str = Field(description="Expected phoneme (from GPC mapping)")
    score: float = Field(
        ge=0.0, le=1.0,
        description="Alignment/pronunciation score (0.0–1.0)",
    )
    start: float = Field(description="Start time in seconds")
    end: float = Field(description="End time in seconds")


# =============================================================================
# Section 2: Forced Alignment Models
# =============================================================================

class AlignRequest(BaseModel):
    """Request body for POST /api/v1/stt/align.

    Forced alignment takes pre-existing audio and a known transcript,
    and produces precise word-level and phoneme-level timestamps. This
    is used post-TTS synthesis to generate karaoke-style highlighting
    data for the storybook reader.

    Audio is sent either as base64-encoded data or a URL to fetch.
    """
    transcript: str = Field(
        min_length=1,
        max_length=10000,
        description="The text that was spoken (ground truth transcript).",
    )
    audio_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded audio data (WAV or MP3).",
    )
    audio_url: Optional[str] = Field(
        default=None,
        description="URL of audio to align (fetched server-side).",
    )
    language: str = Field(
        default="en",
        description="Language code (BCP-47). Default: English.",
    )
    include_phonemes: bool = Field(
        default=True,
        description="Include phoneme-level timestamps in the response.",
    )

    @field_validator("transcript")
    @classmethod
    def validate_transcript(cls, v: str) -> str:
        """Ensure transcript has actual content."""
        stripped = v.strip()
        if not stripped:
            raise ValueError("Transcript must contain text")
        return stripped

    @field_validator("audio_base64", "audio_url")
    @classmethod
    def validate_audio_source(cls, v: Optional[str], info: Any) -> Optional[str]:
        """At least one audio source must be provided (validated at route level)."""
        return v


class AlignResponse(BaseModel):
    """Response body for POST /api/v1/stt/align.

    Contains precise word-level timestamps and optional phoneme-level
    timestamps produced by WhisperX forced alignment.
    """
    word_timestamps: list[WordTimestamp] = Field(
        description="Word-level timestamps with alignment confidence",
    )
    phoneme_timestamps: list[PhonemeTimestamp] = Field(
        default_factory=list,
        description="Phoneme-level timestamps (when include_phonemes=true)",
    )
    duration_seconds: float = Field(
        description="Total audio duration in seconds",
    )
    word_count: int = Field(
        description="Number of aligned words",
    )
    average_confidence: float = Field(
        description="Average alignment confidence across all words",
    )
    cost: CostEstimate


# =============================================================================
# Section 3: Phonics-Aware Narration Models
# =============================================================================

class PaceMapEntry(BaseModel):
    """A single word's pace instruction in the narration pace map."""
    word: str = Field(description="The word text")
    original_start: float = Field(description="Original start time in seconds")
    original_end: float = Field(description="Original end time in seconds")
    adjusted_start: float = Field(description="Adjusted start time after pace changes")
    adjusted_end: float = Field(description="Adjusted end time after pace changes")
    pace_factor: float = Field(
        description="Pace multiplier (1.0=normal, 0.8=emphasis, 0.65=strong emphasis)",
    )
    contains_target_gpc: bool = Field(
        description="Whether this word contains a target GPC",
    )
    matched_gpcs: list[str] = Field(
        default_factory=list,
        description="Which target GPCs were found in this word",
    )


class PhonicsPaceRequest(BaseModel):
    """Request body for POST /api/v1/studio/phonics-pace.

    Takes pre-synthesised narration audio and applies curriculum-aware
    pace adjustments, slowing words that contain target GPCs to
    emphasise the phonics patterns the learner is practising.

    The audio is typically the output of POST /api/v1/tts/synthesize —
    the caller synthesises narration normally, then passes it here for
    phonics emphasis.
    """
    text: str = Field(
        min_length=1,
        max_length=10000,
        description="The narrated text (must match the audio content).",
    )
    target_gpcs: list[str] = Field(
        min_length=1,
        max_length=50,
        description=(
            "GPCs to emphasise. Examples: ['th', 'a', 'igh']. "
            "Words containing these patterns will be slowed for emphasis."
        ),
    )
    audio_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded narration audio (WAV).",
    )
    audio_url: Optional[str] = Field(
        default=None,
        description="URL of narration audio to process.",
    )
    word_timestamps: Optional[list[WordTimestamp]] = Field(
        default=None,
        description=(
            "Pre-computed word timestamps from TTS synthesis. "
            "If not provided, WhisperX alignment is used (slower but automatic)."
        ),
    )
    emphasis_pace: float = Field(
        default=0.8,
        ge=0.5,
        le=1.0,
        description=(
            "Pace factor for emphasised words (0.5=very slow, 0.8=gentle emphasis, 1.0=no emphasis). "
            "Default 0.8 provides a natural 20% slowdown on target GPC words."
        ),
    )
    strong_emphasis_pace: float = Field(
        default=0.65,
        ge=0.5,
        le=1.0,
        description="Pace for words containing multiple target GPCs.",
    )
    smooth_transitions: bool = Field(
        default=True,
        description="Apply gradual pace transitions between words for natural rhythm.",
    )
    language: str = Field(
        default="en",
        description="Language code for alignment (if word_timestamps not provided).",
    )

    @field_validator("target_gpcs")
    @classmethod
    def validate_gpcs(cls, v: list[str]) -> list[str]:
        """Validate GPC format — should be lowercase grapheme patterns."""
        validated = []
        for gpc in v:
            clean = gpc.strip().lower()
            if not clean:
                continue
            if len(clean) > 10:
                raise ValueError(f"GPC pattern too long: '{clean}' (max 10 chars)")
            validated.append(clean)
        if not validated:
            raise ValueError("At least one valid GPC pattern is required")
        return validated


class PhonicsPaceResponse(BaseModel):
    """Response body for POST /api/v1/studio/phonics-pace.

    Contains the adjusted audio, updated word timestamps, and the
    pace map showing exactly how each word was modified.
    """
    audio_base64: Optional[str] = Field(
        default=None,
        description="Base64-encoded adjusted audio (WAV).",
    )
    audio_url: Optional[str] = Field(
        default=None,
        description="URL of adjusted audio (when stored to blob storage).",
    )
    duration_seconds: float = Field(
        description="Duration of adjusted audio.",
    )
    original_duration_seconds: float = Field(
        description="Duration of original audio (before adjustment).",
    )
    word_timestamps: list[WordTimestamp] = Field(
        description="Updated word timestamps after pace adjustment.",
    )
    pace_map: list[PaceMapEntry] = Field(
        description="Per-word pace map showing adjustments applied.",
    )
    emphasis_summary: PhonicsPaceEmphasisSummary = Field(
        description="Summary statistics about the emphasis applied.",
    )
    cost: CostEstimate


class PhonicsPaceEmphasisSummary(BaseModel):
    """Summary of phonics emphasis applied to a narration."""
    total_words: int = Field(description="Total words in the narration")
    emphasised_words: int = Field(description="Words that received emphasis")
    target_gpcs: list[str] = Field(description="GPCs targeted for emphasis")
    matched_gpcs: dict[str, int] = Field(
        description="Count of words matched per GPC",
    )
    duration_increase_percent: float = Field(
        description="How much longer the adjusted audio is vs. original (%)",
    )


# Update PhonicsPaceResponse to reference the summary correctly
PhonicsPaceResponse.model_rebuild()


# =============================================================================
# Section 4: Pronunciation Assessment Extension Models
# =============================================================================
# These extend the existing PronunciationAssessmentResponse with
# GPC-level scoring. In production, these fields are added to the
# existing response model.

class GPCScore(BaseModel):
    """Pronunciation score for a specific grapheme-phoneme correspondence."""
    gpc: str = Field(description="The GPC pattern (e.g., 'th', 'a', 'igh')")
    score: float = Field(
        ge=0.0, le=1.0,
        description="Average accuracy score for this GPC across all occurrences",
    )
    occurrences: int = Field(
        description="Number of times this GPC appeared in the text",
    )
    mastered: bool = Field(
        description="Whether this GPC meets the mastery threshold (default ≥0.75)",
    )


class EnhancedPronunciationResponse(BaseModel):
    """Extended pronunciation assessment with GPC-level scoring.

    This is the response that feeds directly into the BKT engine.
    The per-GPC scores tell BKT exactly which sound patterns the child
    has mastered and which need more practice, enabling precise
    difficulty selection for the next storybook or lesson.
    """
    overall_score: float = Field(
        ge=0.0, le=1.0,
        description="Overall pronunciation accuracy",
    )
    accuracy_score: float = Field(
        ge=0.0, le=1.0,
        description="Word-level accuracy (correct words / total words)",
    )
    fluency_score: float = Field(
        ge=0.0, le=1.0,
        description="Fluency score based on WCPM relative to age band",
    )
    completeness_score: float = Field(
        ge=0.0, le=1.0,
        description="Proportion of expected words that were spoken",
    )
    fluency_wpm: float = Field(
        description="Words correct per minute",
    )
    words: list[WordPronunciationScore] = Field(
        description="Per-word pronunciation scores",
    )
    gpc_scores: list[GPCScore] = Field(
        default_factory=list,
        description="Per-GPC accuracy scores for BKT mastery updates",
    )
    duration_seconds: float
    cost: CostEstimate


class WordPronunciationScore(BaseModel):
    """Per-word pronunciation assessment score."""
    word: str = Field(description="The word as spoken (or empty for omissions)")
    expected: str = Field(description="The expected word from the text")
    score: float = Field(
        ge=0.0, le=1.0,
        description="Pronunciation accuracy for this word",
    )
    error_type: str = Field(
        default="none",
        description="Error type: 'none', 'omission', 'insertion', 'mispronunciation'",
    )
    phonemes: list[PhonemeTimestamp] = Field(
        default_factory=list,
        description="Per-phoneme scores (when available)",
    )
    contains_target_gpc: bool = Field(
        default=False,
        description="Whether this word contains a target GPC",
    )
    matched_gpcs: list[str] = Field(
        default_factory=list,
        description="Which target GPCs appear in this word",
    )


# Rebuild to resolve forward references
EnhancedPronunciationResponse.model_rebuild()
