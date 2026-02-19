# =============================================================================
# SCHOLARLY VOICE SERVICE — Pitch & EQ Controls
# =============================================================================
# Pitch: Changes fundamental frequency WITHOUT affecting duration.
#   +2 semitones for warmer young children's content,
#   -2 semitones for more authoritative older learner content.
#
# EQ (Warmth/Brightness): Parametric equalisation via scipy bandpass filters.
#   Warmth boosts 200–400 Hz and attenuates 2–4 kHz.
#   Brightness does the inverse.
#   Bedtime story mode = warmth +4. Energetic phonics drill = brightness +3.
#
# Critical design property: pitch, tempo, and EQ are INDEPENDENT.
# Changing pitch does not affect duration. Changing EQ does not affect
# pitch or duration. This independence is achieved by using separate
# signal processing stages — the key property teachers need.
# =============================================================================

from __future__ import annotations

import logging
from dataclasses import dataclass

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class PitchResult:
    """Result of a pitch shift operation."""
    audio: np.ndarray
    sample_rate: int
    semitones: float


@dataclass
class EQResult:
    """Result of an EQ adjustment."""
    audio: np.ndarray
    sample_rate: int
    warmth: float


def adjust_pitch(
    audio: np.ndarray,
    sample_rate: int,
    semitones: float,
) -> PitchResult:
    """Shift pitch by the given number of semitones without changing duration.

    Uses librosa.effects.pitch_shift which internally does time-stretch +
    resample to achieve pitch change without tempo change.

    Args:
        audio: Input audio (float32, mono).
        sample_rate: Sample rate in Hz.
        semitones: Pitch shift in semitones. +2 = higher, -2 = lower. Range: ±6.

    Returns:
        PitchResult with shifted audio.
    """
    if semitones == 0.0:
        return PitchResult(audio=audio, sample_rate=sample_rate, semitones=0.0)

    semitones = max(-6.0, min(6.0, semitones))

    try:
        import librosa
        shifted = librosa.effects.pitch_shift(
            audio,
            sr=sample_rate,
            n_steps=semitones,
        )
        logger.debug("Pitch shifted by %.1f semitones", semitones)
        return PitchResult(
            audio=shifted.astype(np.float32),
            sample_rate=sample_rate,
            semitones=semitones,
        )
    except ImportError:
        logger.warning("librosa not installed, skipping pitch shift")
        return PitchResult(audio=audio, sample_rate=sample_rate, semitones=0.0)
    except Exception as e:
        logger.warning("Pitch shift failed: %s", e)
        return PitchResult(audio=audio, sample_rate=sample_rate, semitones=0.0)


def adjust_warmth(
    audio: np.ndarray,
    sample_rate: int,
    warmth: float,
) -> EQResult:
    """Apply warmth/brightness EQ curve.

    Warmth > 0: Boost 200–400 Hz (low-mids), attenuate 2–4 kHz (presence).
                Creates a softer, warmer tone for bedtime stories.
    Warmth < 0: Attenuate 200–400 Hz, boost 2–4 kHz.
                Creates a brighter, more energetic tone for phonics drills.
    Warmth = 0: No change (bypass).

    The EQ is implemented as two second-order sections (biquad filters):
    one for the low-mid band and one for the presence band. The gain of
    each is proportional to the warmth parameter.

    Args:
        audio: Input audio (float32, mono).
        sample_rate: Sample rate in Hz.
        warmth: Warmth value from -6.0 to +6.0.

    Returns:
        EQResult with EQ-adjusted audio.
    """
    if warmth == 0.0:
        return EQResult(audio=audio, sample_rate=sample_rate, warmth=0.0)

    warmth = max(-6.0, min(6.0, warmth))

    try:
        from scipy.signal import sosfilt, butter

        result = audio.copy()

        # Warmth band: 200–400 Hz
        # Positive warmth = boost this band, negative = cut
        warmth_gain_db = warmth * 1.5  # Scale: ±6 warmth → ±9 dB
        warmth_gain_linear = 10 ** (warmth_gain_db / 20.0)

        low_freq = 200.0 / (sample_rate / 2)
        high_freq = min(400.0 / (sample_rate / 2), 0.99)

        if low_freq < high_freq:
            sos_warmth = butter(2, [low_freq, high_freq], btype="band", output="sos")
            warmth_band = sosfilt(sos_warmth, audio)
            # Mix: original + (gain - 1) * band_isolated
            result = result + (warmth_gain_linear - 1.0) * warmth_band

        # Presence band: 2–4 kHz (inverse of warmth)
        presence_gain_db = -warmth * 1.0  # Opposite direction, slightly less aggressive
        presence_gain_linear = 10 ** (presence_gain_db / 20.0)

        pres_low = 2000.0 / (sample_rate / 2)
        pres_high = min(4000.0 / (sample_rate / 2), 0.99)

        if pres_low < pres_high:
            sos_presence = butter(2, [pres_low, pres_high], btype="band", output="sos")
            presence_band = sosfilt(sos_presence, audio)
            result = result + (presence_gain_linear - 1.0) * presence_band

        # Prevent clipping
        peak = np.max(np.abs(result))
        if peak > 1.0:
            result = result / peak * 0.99

        logger.debug("EQ adjusted: warmth=%.1f", warmth)
        return EQResult(
            audio=result.astype(np.float32),
            sample_rate=sample_rate,
            warmth=warmth,
        )

    except ImportError:
        logger.warning("scipy not installed, skipping EQ adjustment")
        return EQResult(audio=audio, sample_rate=sample_rate, warmth=0.0)
    except Exception as e:
        logger.warning("EQ adjustment failed: %s", e)
        return EQResult(audio=audio, sample_rate=sample_rate, warmth=0.0)
