# =============================================================================
# SCHOLARLY VOICE SERVICE — Audio Analysis
# =============================================================================
# Measures audio quality metrics for the Educator Voice Studio. When a
# teacher uploads a recording, this tells them: "Your recording is a bit
# quiet and has some background noise — here's what we can fix."
# =============================================================================

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class AudioAnalysis:
    """Complete quality analysis of an audio recording."""
    loudness_lufs: Optional[float]
    peak_dbfs: Optional[float]
    snr_db: Optional[float]
    pace_wpm: Optional[float]
    pitch_hz_mean: Optional[float]
    pitch_hz_range: Optional[tuple[float, float]]
    silence_ratio: float
    duration_seconds: float
    sample_rate: int
    channels: int


def analyse_audio(
    audio: np.ndarray,
    sample_rate: int,
    transcript_word_count: Optional[int] = None,
) -> AudioAnalysis:
    """Analyse audio quality for the studio /analyse endpoint.

    Measures loudness, peak level, SNR, silence ratio, and optionally
    pitch and speaking pace (if word count is provided).
    """
    duration = len(audio) / sample_rate
    channels = 1 if len(audio.shape) == 1 else audio.shape[1]

    # Loudness (LUFS)
    loudness: Optional[float] = None
    try:
        import pyloudnorm as pyln
        meter = pyln.Meter(sample_rate)
        measured = meter.integrated_loudness(audio)
        if not (np.isinf(measured) or np.isnan(measured)):
            loudness = round(float(measured), 1)
    except Exception:
        pass

    # Peak (dBFS)
    peak_dbfs: Optional[float] = None
    peak_val = np.max(np.abs(audio))
    if peak_val > 0:
        peak_dbfs = round(float(20 * np.log10(peak_val)), 1)

    # SNR estimate
    snr = _estimate_snr(audio, sample_rate)

    # Silence ratio
    silence_ratio = _measure_silence_ratio(audio, sample_rate)

    # Pace (WPM) — only if transcript word count provided
    pace_wpm: Optional[float] = None
    if transcript_word_count and duration > 0:
        speaking_duration = duration * (1 - silence_ratio)
        if speaking_duration > 0:
            pace_wpm = round(transcript_word_count / (speaking_duration / 60), 1)

    # Pitch analysis
    pitch_mean, pitch_range = _analyse_pitch(audio, sample_rate)

    return AudioAnalysis(
        loudness_lufs=loudness,
        peak_dbfs=peak_dbfs,
        snr_db=snr,
        pace_wpm=pace_wpm,
        pitch_hz_mean=pitch_mean,
        pitch_hz_range=pitch_range,
        silence_ratio=round(silence_ratio, 3),
        duration_seconds=round(duration, 3),
        sample_rate=sample_rate,
        channels=channels,
    )


def _estimate_snr(audio: np.ndarray, sample_rate: int) -> Optional[float]:
    """Rough SNR: compare RMS of loudest vs quietest 100ms frames."""
    frame_size = int(sample_rate * 0.1)
    n_frames = len(audio) // frame_size
    if n_frames < 4:
        return None

    rms_values = []
    for i in range(n_frames):
        frame = audio[i * frame_size:(i + 1) * frame_size]
        rms = np.sqrt(np.mean(frame ** 2))
        if rms > 0:
            rms_values.append(rms)

    if len(rms_values) < 4:
        return None

    rms_values.sort()
    n_q = max(len(rms_values) // 4, 1)
    signal = np.mean(rms_values[-n_q:])
    noise = np.mean(rms_values[:n_q])

    if noise == 0:
        return None
    return round(float(20 * np.log10(signal / noise)), 1)


def _measure_silence_ratio(audio: np.ndarray, sample_rate: int) -> float:
    """Fraction of audio that is silence (below -40 dBFS)."""
    threshold = 10 ** (-40.0 / 20.0)
    frame_size = int(sample_rate * 0.02)  # 20ms frames
    n_frames = len(audio) // frame_size
    if n_frames == 0:
        return 0.0

    silent_frames = 0
    for i in range(n_frames):
        frame = audio[i * frame_size:(i + 1) * frame_size]
        rms = np.sqrt(np.mean(frame ** 2))
        if rms < threshold:
            silent_frames += 1

    return silent_frames / n_frames


def _analyse_pitch(
    audio: np.ndarray, sample_rate: int,
) -> tuple[Optional[float], Optional[tuple[float, float]]]:
    """Estimate fundamental frequency (F0) using librosa's pyin."""
    try:
        import librosa

        f0, voiced_flag, _ = librosa.pyin(
            audio,
            fmin=librosa.note_to_hz("C2"),  # ~65 Hz
            fmax=librosa.note_to_hz("C6"),  # ~1047 Hz
            sr=sample_rate,
        )

        # Filter to voiced frames only
        voiced_f0 = f0[voiced_flag] if voiced_flag is not None else f0[~np.isnan(f0)]
        voiced_f0 = voiced_f0[~np.isnan(voiced_f0)]

        if len(voiced_f0) == 0:
            return None, None

        mean_hz = round(float(np.mean(voiced_f0)), 1)
        range_hz = (round(float(np.min(voiced_f0)), 1), round(float(np.max(voiced_f0)), 1))
        return mean_hz, range_hz

    except Exception:
        return None, None
