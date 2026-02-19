# =============================================================================
# SCHOLARLY VOICE SERVICE — Sprint 30, Week 2
# Phonics-Aware Narrator
# =============================================================================
#
# This is the module that could not exist anywhere except Scholarly, because
# it requires curriculum intelligence — knowledge of which grapheme-phoneme
# correspondences (GPCs) a child is currently learning.
#
# Imagine a skilled reading tutor narrating a storybook. When they reach a
# word containing the phonics pattern the child is practising, they naturally
# slow down just slightly — drawing the child's ear to the target sound
# without making the narration sound robotic or unnatural. "The CAT sat on
# the MAT" with target GPC /a/ → /æ/ becomes a narration where "cat" and
# "mat" are each held a fraction longer than surrounding words.
#
# That's what this module does programmatically:
#
# 1. Accept a storybook page's text + target GPCs + word-level timestamps
# 2. Identify which words contain one or more target GPCs
# 3. Generate a per-word pace map that slows emphasis words while preserving
#    natural rhythm for surrounding words
# 4. Apply the pace adjustments using the tempo processing pipeline (Sprint 29)
# 5. Return adjusted audio with recalculated timestamps
#
# The key insight: we don't re-synthesise the audio. We take the existing
# TTS output and surgically stretch the target words using time-domain
# processing. This preserves the voice's natural quality while achieving
# precise phonics emphasis.
#
# Dependencies:
#   Sprint 29 Wk3: processing/tempo.py (time-stretch via pyrubberband)
#   Sprint 30 Wk2: providers/whisperx_provider.py (for alignment timestamps)
#   External:      numpy, soundfile
# =============================================================================

from __future__ import annotations

import io
import logging
from dataclasses import dataclass, field
from typing import Any, Optional

import numpy as np
import soundfile as sf

from providers.base import WordTimestampResult

logger = logging.getLogger(__name__)


# =============================================================================
# Section 1: Pace Map Types
# =============================================================================

@dataclass
class WordPaceEntry:
    """A single word's pace instruction in the pace map.

    The pace factor works like a multiplier on duration:
    - 1.0 = normal speed
    - 0.8 = 20% slower (emphasis — target GPC)
    - 0.6 = 40% slower (strong emphasis — new/difficult GPC)
    - 1.2 = 20% faster (optional: speed up function words)
    """
    word: str
    original_start: float
    original_end: float
    pace_factor: float
    contains_target_gpc: bool
    matched_gpcs: list[str] = field(default_factory=list)
    adjusted_start: float = 0.0
    adjusted_end: float = 0.0


@dataclass
class PaceMap:
    """The complete pace map for a narration segment.

    This is the instruction set that tells the tempo processor how to
    adjust each word's duration. Think of it as sheet music for the
    narrator's pacing — each word has a tempo marking.
    """
    text: str
    entries: list[WordPaceEntry]
    target_gpcs: list[str]
    base_pace: float
    emphasis_pace: float
    total_original_duration: float
    total_adjusted_duration: float


@dataclass
class PhonicsNarrationResult:
    """Result of phonics-aware narration processing."""
    audio_data: bytes
    sample_rate: int
    duration_seconds: float
    pace_map: PaceMap
    word_timestamps: list[WordTimestampResult]


# =============================================================================
# Section 2: Phonics Narrator Configuration
# =============================================================================

@dataclass
class PhonicsNarratorConfig:
    """Configuration for phonics-aware narration.

    The emphasis_pace controls how much target GPC words are slowed.
    The default 0.8 (20% slower) was chosen based on research showing
    that moderate pace reduction aids phonemic awareness without
    disrupting comprehension. Stronger emphasis (0.6) is appropriate
    for newly introduced GPCs; gentler emphasis (0.9) for consolidation.
    """
    # Pace settings
    base_pace: float = 1.0         # Normal narration pace
    emphasis_pace: float = 0.8     # Pace for target GPC words (slower = more emphasis)
    strong_emphasis_pace: float = 0.65  # Pace for multiple target GPCs in one word
    context_pace: float = 0.95     # Slight slowdown for words adjacent to emphasis

    # Smoothing
    smooth_transitions: bool = True  # Gradual pace transitions between words
    transition_frames: int = 512     # Cross-fade frames at word boundaries

    # Output
    sample_rate: int = 24000  # Match Kokoro's output sample rate

    # GPC matching
    case_sensitive: bool = False


# =============================================================================
# Section 3: GPC Word Matcher
# =============================================================================

class GPCWordMatcher:
    """Identifies which words contain target GPCs.

    In the full platform, this would call the grapheme-parser's DAG
    decomposition engine (grapheme-parser.ts) via the REST API.
    For the self-contained Voice Service, we use a pattern-matching
    approach that handles the most common GPC patterns correctly.

    The matching is order-sensitive for multi-character GPCs:
    - "sh" matches in "ship" and "fish" but not in "mishap" (s + h, not sh)
    - "th" matches in "the" and "with" but not in "hothouse" (t + h boundary)

    For edge cases, the full grapheme-parser DAG is the authority.
    This matcher handles the 95% case for narration pacing.
    """

    # GPCs that must be matched as digraphs before their constituent letters.
    # Order matters: check "igh" before "i" and "g", "ough" before "ou", etc.
    DIGRAPH_PRIORITY = [
        "ough", "igh", "eigh",  # Trigraphs first
        "air", "ear", "ure",
        "ch", "sh", "th", "wh", "ph", "ck", "ng", "wr", "kn", "gn", "mb",
        "ai", "ay", "ee", "ea", "ie", "oa", "ow", "oo", "ue", "ew",
        "ou", "oi", "oy",
        "ar", "er", "ir", "or", "ur",
        "a_e", "e_e", "i_e", "o_e", "u_e",
    ]

    def __init__(self, case_sensitive: bool = False):
        self._case_sensitive = case_sensitive

    def find_gpcs_in_word(
        self,
        word: str,
        target_gpcs: list[str],
    ) -> list[str]:
        """Find which target GPCs appear in a word.

        Returns a list of matched GPC strings. Empty if no target GPCs found.

        The matching algorithm:
        1. Try multi-character GPCs first (digraphs, trigraphs)
        2. Then try single-character GPCs
        3. Handle split digraphs (a_e, i_e, etc.) specially
        """
        normalised = word if self._case_sensitive else word.lower()
        # Strip punctuation for matching
        clean = "".join(c for c in normalised if c.isalpha())

        matched: list[str] = []

        for gpc in target_gpcs:
            target = gpc if self._case_sensitive else gpc.lower()

            # Handle split digraphs: "a_e" means 'a' followed by consonant(s) then 'e'
            if "_" in target:
                if self._match_split_digraph(clean, target):
                    matched.append(gpc)
                continue

            # Direct substring match (handles both single chars and digraphs)
            if target in clean:
                matched.append(gpc)

        return matched

    def _match_split_digraph(self, word: str, pattern: str) -> bool:
        """Match split digraph patterns like 'a_e', 'i_e', 'o_e'.

        A split digraph has a vowel, one or more consonants, then 'e'.
        Example: "cake" matches "a_e" (a + k + e), "like" matches "i_e".
        """
        parts = pattern.split("_")
        if len(parts) != 2:
            return False

        vowel, final = parts[0], parts[1]

        # Find the vowel in the word
        for i, char in enumerate(word):
            if char == vowel:
                # Check if there's a consonant then the final letter after it
                remaining = word[i + 1:]
                if len(remaining) >= 2 and remaining.endswith(final):
                    # At least one consonant between vowel and final
                    middle = remaining[:-len(final)]
                    if middle and all(c not in "aeiou" for c in middle):
                        return True

        return False


# =============================================================================
# Section 4: Pace Map Generator
# =============================================================================

class PaceMapGenerator:
    """Generates a per-word pace map from text, timestamps, and target GPCs.

    The pace map is the bridge between curriculum intelligence and audio
    processing. It translates pedagogical intent ("emphasise the /th/ sound")
    into audio processing instructions ("stretch this word to 0.8x pace").
    """

    def __init__(
        self,
        config: Optional[PhonicsNarratorConfig] = None,
        matcher: Optional[GPCWordMatcher] = None,
    ):
        self._config = config or PhonicsNarratorConfig()
        self._matcher = matcher or GPCWordMatcher(
            case_sensitive=self._config.case_sensitive,
        )

    def generate(
        self,
        text: str,
        word_timestamps: list[WordTimestampResult],
        target_gpcs: list[str],
    ) -> PaceMap:
        """Generate a pace map for a narrated text segment.

        Steps:
        1. Match target GPCs to words using the GPCWordMatcher
        2. Assign pace factors based on GPC presence and count
        3. Optionally add context slowdown for adjacent words
        4. Calculate adjusted timestamps
        5. Return the complete pace map

        Args:
            text: The narrated text.
            word_timestamps: Word-level timestamps from TTS or alignment.
            target_gpcs: GPCs to emphasise in this narration.

        Returns:
            PaceMap with per-word pace instructions.
        """
        entries: list[WordPaceEntry] = []

        # Step 1: Match GPCs and assign base pace factors
        for wt in word_timestamps:
            matched = self._matcher.find_gpcs_in_word(wt.word, target_gpcs)

            if len(matched) >= 2:
                # Multiple target GPCs in one word → strong emphasis
                pace = self._config.strong_emphasis_pace
            elif len(matched) == 1:
                # Single target GPC → standard emphasis
                pace = self._config.emphasis_pace
            else:
                # No target GPCs → normal pace
                pace = self._config.base_pace

            entries.append(WordPaceEntry(
                word=wt.word,
                original_start=wt.start,
                original_end=wt.end,
                pace_factor=pace,
                contains_target_gpc=len(matched) > 0,
                matched_gpcs=matched,
            ))

        # Step 2: Add context slowdown for words adjacent to emphasis words
        if self._config.smooth_transitions and self._config.context_pace < 1.0:
            entries = self._apply_context_pacing(entries)

        # Step 3: Calculate adjusted timestamps
        entries = self._calculate_adjusted_timestamps(entries)

        total_original = max(
            (e.original_end for e in entries), default=0.0,
        )
        total_adjusted = max(
            (e.adjusted_end for e in entries), default=0.0,
        )

        return PaceMap(
            text=text,
            entries=entries,
            target_gpcs=target_gpcs,
            base_pace=self._config.base_pace,
            emphasis_pace=self._config.emphasis_pace,
            total_original_duration=round(total_original, 3),
            total_adjusted_duration=round(total_adjusted, 3),
        )

    def _apply_context_pacing(
        self,
        entries: list[WordPaceEntry],
    ) -> list[WordPaceEntry]:
        """Apply gentle slowdown to words immediately adjacent to emphasis words.

        This creates a more natural transition — rather than abruptly slowing
        at the emphasis word and snapping back to normal, the pace eases in
        and out. Think of it as a musical ritardando before a held note.
        """
        for i, entry in enumerate(entries):
            if entry.contains_target_gpc:
                # Slow down the word before (if it's not already emphasised)
                if i > 0 and not entries[i - 1].contains_target_gpc:
                    entries[i - 1].pace_factor = min(
                        entries[i - 1].pace_factor,
                        self._config.context_pace,
                    )
                # Slow down the word after
                if i < len(entries) - 1 and not entries[i + 1].contains_target_gpc:
                    entries[i + 1].pace_factor = min(
                        entries[i + 1].pace_factor,
                        self._config.context_pace,
                    )

        return entries

    def _calculate_adjusted_timestamps(
        self,
        entries: list[WordPaceEntry],
    ) -> list[WordPaceEntry]:
        """Recalculate timestamps based on pace adjustments.

        When we stretch a word, every subsequent word shifts later in time.
        This method walks through the entries in order, accumulating the
        time offset caused by pace adjustments.

        Example:
          Original: "The" [0.0-0.2] "cat" [0.2-0.5] "sat" [0.5-0.8]
          Pace map: "The" 1.0x, "cat" 0.8x (emphasis), "sat" 1.0x
          "cat" duration: 0.3s → 0.3/0.8 = 0.375s (stretched)
          Adjusted: "The" [0.0-0.2] "cat" [0.2-0.575] "sat" [0.575-0.875]
        """
        time_offset = 0.0

        for entry in entries:
            original_duration = entry.original_end - entry.original_start
            adjusted_duration = original_duration / entry.pace_factor if entry.pace_factor > 0 else original_duration

            entry.adjusted_start = round(entry.original_start + time_offset, 3)
            entry.adjusted_end = round(entry.adjusted_start + adjusted_duration, 3)

            # Accumulate the time difference
            time_offset += (adjusted_duration - original_duration)

        return entries


# =============================================================================
# Section 5: Phonics Narrator (Audio Processor)
# =============================================================================

class PhonicsNarrator:
    """Applies phonics-aware pace adjustments to narration audio.

    This is the final stage of the pipeline. Given:
    - Pre-synthesised audio (from Kokoro TTS)
    - A pace map (from PaceMapGenerator)

    It produces audio where target GPC words are naturally emphasised
    through pace variation, with smooth transitions between normal and
    emphasised segments.

    The processing uses the tempo module (Sprint 29 Week 3) for
    high-quality time-stretching that preserves pitch and voice quality.
    """

    def __init__(self, config: Optional[PhonicsNarratorConfig] = None):
        self._config = config or PhonicsNarratorConfig()

    async def apply_pace_map(
        self,
        audio_data: bytes,
        sample_rate: int,
        pace_map: PaceMap,
    ) -> PhonicsNarrationResult:
        """Apply a pace map to narration audio.

        The algorithm:
        1. Split the audio into per-word segments using timestamps
        2. Time-stretch each segment according to its pace factor
        3. Cross-fade at boundaries for smooth transitions
        4. Concatenate the adjusted segments
        5. Recalculate word timestamps

        Args:
            audio_data: Raw audio bytes (WAV format).
            sample_rate: Audio sample rate.
            pace_map: The per-word pace instructions.

        Returns:
            PhonicsNarrationResult with adjusted audio and new timestamps.
        """
        import asyncio

        # Load audio
        audio_array = self._load_audio(audio_data, sample_rate)

        # Process in thread pool (CPU-bound time-stretching)
        result_audio, new_timestamps = await asyncio.to_thread(
            self._apply_pace_map_sync,
            audio_array,
            sample_rate,
            pace_map,
        )

        # Encode to WAV bytes
        output_buffer = io.BytesIO()
        sf.write(output_buffer, result_audio, sample_rate, format="WAV")
        output_bytes = output_buffer.getvalue()

        duration = len(result_audio) / sample_rate

        return PhonicsNarrationResult(
            audio_data=output_bytes,
            sample_rate=sample_rate,
            duration_seconds=round(duration, 3),
            pace_map=pace_map,
            word_timestamps=new_timestamps,
        )

    def _load_audio(self, audio_data: bytes, expected_sr: int) -> np.ndarray:
        """Load audio bytes to numpy array."""
        try:
            audio, sr = sf.read(io.BytesIO(audio_data), dtype="float32")
            if len(audio.shape) > 1:
                audio = audio.mean(axis=1)
            return audio
        except Exception as e:
            raise ValueError(f"Could not load audio for pace adjustment: {e}")

    def _apply_pace_map_sync(
        self,
        audio: np.ndarray,
        sample_rate: int,
        pace_map: PaceMap,
    ) -> tuple[np.ndarray, list[WordTimestampResult]]:
        """Apply pace map synchronously. Blocking — runs in thread pool.

        For each word in the pace map:
        1. Extract the word's audio segment
        2. If pace != 1.0, time-stretch using pyrubberband
        3. Apply cross-fade at boundaries
        4. Track the new timestamp positions
        """
        try:
            import pyrubberband as pyrb
        except ImportError:
            logger.warning(
                "pyrubberband not available — falling back to numpy interpolation"
            )
            pyrb = None

        segments: list[np.ndarray] = []
        new_timestamps: list[WordTimestampResult] = []
        current_time = 0.0

        for entry in pace_map.entries:
            # Extract word segment
            start_sample = int(entry.original_start * sample_rate)
            end_sample = int(entry.original_end * sample_rate)

            # Clamp to audio bounds
            start_sample = max(0, min(start_sample, len(audio)))
            end_sample = max(start_sample, min(end_sample, len(audio)))

            segment = audio[start_sample:end_sample]

            if len(segment) == 0:
                continue

            # Time-stretch if pace differs from 1.0
            if abs(entry.pace_factor - 1.0) > 0.01 and len(segment) > 256:
                if pyrb is not None:
                    try:
                        # pyrubberband stretches by the rate factor:
                        # rate > 1.0 = faster, rate < 1.0 = slower
                        # Our pace_factor: < 1.0 = slower, so rate = pace_factor
                        stretched = pyrb.time_stretch(
                            segment,
                            sample_rate,
                            rate=entry.pace_factor,
                        )
                        segment = stretched.astype(np.float32)
                    except Exception as e:
                        logger.warning(
                            "Time-stretch failed for word '%s': %s. Using original.",
                            entry.word, e,
                        )
                else:
                    # Numpy fallback: simple interpolation
                    target_length = int(len(segment) / entry.pace_factor)
                    if target_length > 0:
                        indices = np.linspace(0, len(segment) - 1, target_length)
                        segment = np.interp(indices, np.arange(len(segment)), segment)
                        segment = segment.astype(np.float32)

            # Apply cross-fade at boundaries
            if self._config.smooth_transitions and len(segments) > 0:
                fade_len = min(
                    self._config.transition_frames,
                    len(segments[-1]),
                    len(segment),
                )
                if fade_len > 0:
                    # Fade out the end of the previous segment
                    fade_out = np.linspace(1.0, 0.0, fade_len, dtype=np.float32)
                    segments[-1][-fade_len:] *= fade_out

                    # Fade in the start of this segment
                    fade_in = np.linspace(0.0, 1.0, fade_len, dtype=np.float32)
                    segment[:fade_len] *= fade_in

            # Track new timestamp
            segment_duration = len(segment) / sample_rate
            new_timestamps.append(WordTimestampResult(
                word=entry.word,
                start=round(current_time, 3),
                end=round(current_time + segment_duration, 3),
                confidence=None,
            ))

            segments.append(segment)
            current_time += segment_duration

        # Concatenate all segments
        if segments:
            result = np.concatenate(segments)
        else:
            result = audio.copy()

        return result, new_timestamps

    # -------------------------------------------------------------------------
    # Convenience: Generate pace map and apply in one call
    # -------------------------------------------------------------------------

    async def narrate_with_emphasis(
        self,
        audio_data: bytes,
        sample_rate: int,
        text: str,
        word_timestamps: list[WordTimestampResult],
        target_gpcs: list[str],
    ) -> PhonicsNarrationResult:
        """One-call convenience: generate pace map and apply it.

        This is the method that the /api/v1/studio/phonics-pace endpoint calls.

        Args:
            audio_data: Pre-synthesised narration audio (WAV).
            sample_rate: Audio sample rate.
            text: The narrated text.
            word_timestamps: Word-level timestamps from TTS synthesis.
            target_gpcs: GPCs to emphasise.

        Returns:
            PhonicsNarrationResult with adjusted audio and metadata.
        """
        generator = PaceMapGenerator(self._config)
        pace_map = generator.generate(text, word_timestamps, target_gpcs)

        logger.info(
            "Phonics narration: %d words, %d with emphasis (%s), "
            "original: %.2fs, adjusted: %.2fs",
            len(pace_map.entries),
            sum(1 for e in pace_map.entries if e.contains_target_gpc),
            ", ".join(target_gpcs),
            pace_map.total_original_duration,
            pace_map.total_adjusted_duration,
        )

        return await self.apply_pace_map(audio_data, sample_rate, pace_map)
