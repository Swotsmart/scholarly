# =============================================================================
# SCHOLARLY VOICE SERVICE — Tempo (Pace Control)
# =============================================================================
# Changes audio duration WITHOUT affecting pitch. A child's bedtime story
# at 0.7x pace sounds like the same narrator speaking slowly, not like
# a record played at the wrong speed.
#
# Uses librosa.effects.time_stretch (phase vocoder) for moderate adjustments
# and pyrubberband (RubberBand library) for extreme settings where the
# phase vocoder introduces audible artifacts.
#
# Critical property: timestamps must be recalculated after tempo changes.
# If a word originally started at 1.2s and pace is 0.7x, it now starts at
# 1.2 / 0.7 = 1.71s. This is a simple arithmetic pass — zero latency.
# =============================================================================

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

from providers.base import WordTimestampResult

logger = logging.getLogger(__name__)


@dataclass
class TempoResult:
    """Result of a tempo adjustment."""
    audio: np.ndarray
    sample_rate: int
    pace: float
    duration_before: float
    duration_after: float
    timestamps: list[WordTimestampResult]


def adjust_tempo(
    audio: np.ndarray,
    sample_rate: int,
    pace: float,
    timestamps: list[WordTimestampResult] | None = None,
    *,
    use_rubberband: bool = False,
) -> TempoResult:
    """Change audio pace without affecting pitch.

    Args:
        audio: Input audio array (float32, mono).
        sample_rate: Sample rate in Hz.
        pace: Pace multiplier. 0.5 = half speed (longer), 2.0 = double speed (shorter).
        timestamps: Word timestamps to recalculate.
        use_rubberband: Force pyrubberband for higher quality at extreme settings.

    Returns:
        TempoResult with adjusted audio and recalculated timestamps.
    """
    if pace == 1.0:
        return TempoResult(
            audio=audio, sample_rate=sample_rate, pace=pace,
            duration_before=len(audio) / sample_rate,
            duration_after=len(audio) / sample_rate,
            timestamps=timestamps or [],
        )

    duration_before = len(audio) / sample_rate

    if use_rubberband or pace < 0.6 or pace > 1.8:
        # pyrubberband for extreme settings — better quality
        stretched = _stretch_rubberband(audio, sample_rate, pace)
    else:
        # librosa phase vocoder for moderate settings — faster
        stretched = _stretch_librosa(audio, pace)

    duration_after = len(stretched) / sample_rate
    new_timestamps = recalculate_timestamps(timestamps or [], pace)

    logger.debug(
        "Tempo adjusted: %.1fs → %.1fs (pace=%.2fx)",
        duration_before, duration_after, pace,
    )

    return TempoResult(
        audio=stretched.astype(np.float32),
        sample_rate=sample_rate,
        pace=pace,
        duration_before=duration_before,
        duration_after=duration_after,
        timestamps=new_timestamps,
    )


def adjust_emphasis(
    audio: np.ndarray,
    sample_rate: int,
    timestamps: list[WordTimestampResult],
    target_words: set[str],
    emphasis_pace: float = 0.8,
) -> tuple[np.ndarray, list[WordTimestampResult]]:
    """Per-word tempo adjustment for phonics-aware narration.

    Slows down only the target words while leaving surrounding text
    at normal speed. The result is subtle but pedagogically powerful:
    "The cat sat on the mat" with target GPC /a/ produces a narration
    where "cat", "sat", "mat" are each held slightly longer.

    This works by splitting the audio at word boundaries, time-stretching
    the target segments, and reassembling.
    """
    if not timestamps or not target_words:
        return audio, timestamps

    target_words_lower = {w.lower() for w in target_words}
    segments: list[np.ndarray] = []
    new_timestamps: list[WordTimestampResult] = []
    current_time = 0.0

    for i, ts in enumerate(timestamps):
        start_sample = int(ts.start * sample_rate)
        end_sample = int(ts.end * sample_rate)

        # Clamp to audio bounds
        start_sample = max(0, min(start_sample, len(audio)))
        end_sample = max(start_sample, min(end_sample, len(audio)))

        # Add any gap before this word
        if i == 0 and start_sample > 0:
            segments.append(audio[:start_sample])
            current_time = start_sample / sample_rate
        elif i > 0:
            prev_end = int(timestamps[i - 1].end * sample_rate)
            prev_end = max(0, min(prev_end, len(audio)))
            if start_sample > prev_end:
                gap = audio[prev_end:start_sample]
                segments.append(gap)
                current_time += len(gap) / sample_rate

        word_audio = audio[start_sample:end_sample]
        word_lower = ts.word.strip().lower()

        if word_lower in target_words_lower and len(word_audio) > 0:
            # Slow this word down
            stretched = _stretch_librosa(word_audio, emphasis_pace)
            segments.append(stretched.astype(np.float32))
            word_duration = len(stretched) / sample_rate
        else:
            segments.append(word_audio)
            word_duration = len(word_audio) / sample_rate

        new_timestamps.append(WordTimestampResult(
            word=ts.word,
            start=round(current_time, 3),
            end=round(current_time + word_duration, 3),
            confidence=ts.confidence,
        ))
        current_time += word_duration

    # Add any remaining audio after the last word
    if timestamps:
        last_end = int(timestamps[-1].end * sample_rate)
        last_end = max(0, min(last_end, len(audio)))
        if last_end < len(audio):
            segments.append(audio[last_end:])

    if segments:
        result = np.concatenate(segments)
    else:
        result = audio

    return result.astype(np.float32), new_timestamps


def recalculate_timestamps(
    timestamps: list[WordTimestampResult],
    pace: float,
) -> list[WordTimestampResult]:
    """Recalculate word timestamps after a uniform tempo change.

    The arithmetic is simple: new_time = old_time / pace.
    At 0.7x pace, everything takes longer (divide by 0.7 = multiply by 1.43).
    At 1.5x pace, everything takes less time (divide by 1.5 = multiply by 0.67).

    This is deterministic and adds zero latency — it's a single pass
    over the timestamp array.
    """
    if pace == 1.0 or not timestamps:
        return timestamps

    return [
        WordTimestampResult(
            word=ts.word,
            start=round(ts.start / pace, 3),
            end=round(ts.end / pace, 3),
            confidence=ts.confidence,
        )
        for ts in timestamps
    ]


# =============================================================================
# Internal stretching implementations
# =============================================================================

def _stretch_librosa(audio: np.ndarray, pace: float) -> np.ndarray:
    """Time stretch using librosa's phase vocoder."""
    import librosa
    return librosa.effects.time_stretch(audio, rate=pace)


def _stretch_rubberband(audio: np.ndarray, sample_rate: int, pace: float) -> np.ndarray:
    """Time stretch using pyrubberband (RubberBand library).
    Higher quality than phase vocoder at extreme settings."""
    try:
        import pyrubberband as pyrb
        return pyrb.time_stretch(audio, sample_rate, pace)
    except ImportError:
        logger.warning("pyrubberband not installed, falling back to librosa")
        return _stretch_librosa(audio, pace)
