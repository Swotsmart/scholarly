# =============================================================================
# SCHOLARLY VOICE SERVICE — Processing Pipeline Tests
# =============================================================================
# Tests for the audio processing modules. Uses synthetic audio signals
# (sine waves, silence) to verify each processing stage in isolation.
# =============================================================================

from __future__ import annotations

import numpy as np
import pytest

from providers.base import WordTimestampResult


# =============================================================================
# Helpers
# =============================================================================

def _sine_wave(freq: float = 440.0, duration: float = 1.0, sr: int = 24000) -> np.ndarray:
    """Generate a pure sine wave for testing."""
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    return (0.5 * np.sin(2 * np.pi * freq * t)).astype(np.float32)


def _silence(duration: float = 0.5, sr: int = 24000) -> np.ndarray:
    """Generate silence."""
    return np.zeros(int(sr * duration), dtype=np.float32)


def _noisy_signal(
    freq: float = 440.0, duration: float = 2.0, sr: int = 24000, noise_level: float = 0.05,
) -> np.ndarray:
    """Generate a sine wave with additive noise."""
    signal = _sine_wave(freq, duration, sr)
    noise = noise_level * np.random.randn(len(signal)).astype(np.float32)
    return signal + noise


# =============================================================================
# Normaliser Tests
# =============================================================================

class TestNormaliser:
    def test_normalise_returns_result(self) -> None:
        from processing.normaliser import AudioNormaliser, NormalisationConfig
        config = NormalisationConfig(
            loudness_enabled=False,  # Skip LUFS (needs pyloudnorm)
            noise_gate_enabled=False,
            spectral_enabled=False,
            trim_enabled=False,
            peak_enabled=True,
        )
        normaliser = AudioNormaliser(config)
        audio = _sine_wave(duration=0.5)
        result = normaliser.normalise(audio, 24000)
        assert result.audio is not None
        assert len(result.stages_applied) == 1
        assert "peak_limit" in result.stages_applied

    def test_empty_audio_passthrough(self) -> None:
        from processing.normaliser import AudioNormaliser
        normaliser = AudioNormaliser()
        result = normaliser.normalise(np.array([], dtype=np.float32), 24000)
        assert len(result.audio) == 0
        assert result.duration_before == 0.0

    def test_peak_limiter_reduces_clipping(self) -> None:
        from processing.normaliser import AudioNormaliser, NormalisationConfig
        config = NormalisationConfig(
            loudness_enabled=False, noise_gate_enabled=False,
            spectral_enabled=False, trim_enabled=False,
            peak_enabled=True, peak_ceiling_dbfs=-3.0,
        )
        normaliser = AudioNormaliser(config)
        loud = np.array([1.0, -1.0, 0.9, -0.9], dtype=np.float32)
        result = normaliser.normalise(loud, 24000)
        ceiling_linear = 10 ** (-3.0 / 20.0)
        assert np.max(np.abs(result.audio)) <= ceiling_linear + 0.001

    def test_noise_gate_silences_quiet(self) -> None:
        from processing.normaliser import AudioNormaliser, NormalisationConfig
        config = NormalisationConfig(
            loudness_enabled=False, spectral_enabled=False,
            trim_enabled=False, peak_enabled=False,
            noise_gate_enabled=True, noise_gate_threshold_db=-20.0,
        )
        normaliser = AudioNormaliser(config)
        # Very quiet signal — should be gated
        quiet = np.full(24000, 0.001, dtype=np.float32)
        result = normaliser.normalise(quiet, 24000)
        assert np.max(np.abs(result.audio)) < 0.01

    def test_all_stages_disabled_passthrough(self) -> None:
        from processing.normaliser import AudioNormaliser, NormalisationConfig
        config = NormalisationConfig(
            loudness_enabled=False, noise_gate_enabled=False,
            spectral_enabled=False, trim_enabled=False, peak_enabled=False,
        )
        normaliser = AudioNormaliser(config)
        audio = _sine_wave()
        result = normaliser.normalise(audio, 24000)
        assert result.stages_applied == []
        np.testing.assert_array_equal(result.audio, audio)


# =============================================================================
# Tempo Tests
# =============================================================================

class TestTempo:
    def test_unity_pace_passthrough(self) -> None:
        from processing.tempo import adjust_tempo
        audio = _sine_wave(duration=1.0)
        result = adjust_tempo(audio, 24000, 1.0)
        assert result.pace == 1.0
        np.testing.assert_array_equal(result.audio, audio)

    def test_slow_pace_increases_duration(self) -> None:
        from processing.tempo import adjust_tempo
        audio = _sine_wave(duration=1.0, sr=24000)
        result = adjust_tempo(audio, 24000, 0.7)
        assert result.duration_after > result.duration_before
        assert result.duration_after == pytest.approx(1.0 / 0.7, abs=0.2)

    def test_fast_pace_decreases_duration(self) -> None:
        from processing.tempo import adjust_tempo
        audio = _sine_wave(duration=1.0, sr=24000)
        result = adjust_tempo(audio, 24000, 1.5)
        assert result.duration_after < result.duration_before

    def test_timestamp_recalculation(self) -> None:
        from processing.tempo import recalculate_timestamps
        ts = [
            WordTimestampResult(word="hello", start=0.0, end=0.5),
            WordTimestampResult(word="world", start=0.5, end=1.0),
        ]
        new_ts = recalculate_timestamps(ts, 0.5)  # Half speed = double time
        assert new_ts[0].start == 0.0
        assert new_ts[0].end == 1.0  # 0.5 / 0.5 = 1.0
        assert new_ts[1].start == 1.0
        assert new_ts[1].end == 2.0

    def test_timestamp_recalculation_fast(self) -> None:
        from processing.tempo import recalculate_timestamps
        ts = [WordTimestampResult(word="quick", start=0.0, end=1.0)]
        new_ts = recalculate_timestamps(ts, 2.0)  # Double speed = half time
        assert new_ts[0].end == 0.5

    def test_timestamp_unity_passthrough(self) -> None:
        from processing.tempo import recalculate_timestamps
        ts = [WordTimestampResult(word="same", start=1.0, end=2.0)]
        new_ts = recalculate_timestamps(ts, 1.0)
        assert new_ts[0].start == 1.0
        assert new_ts[0].end == 2.0


# =============================================================================
# Emphasis (Per-Word Pace) Tests
# =============================================================================

class TestEmphasis:
    def test_emphasis_slows_target_words(self) -> None:
        from processing.tempo import adjust_emphasis
        sr = 24000
        audio = _sine_wave(duration=2.0, sr=sr)
        ts = [
            WordTimestampResult(word="the", start=0.0, end=0.5),
            WordTimestampResult(word="ship", start=0.5, end=1.0),
            WordTimestampResult(word="sat", start=1.0, end=1.5),
        ]
        targets = {"ship"}
        result_audio, result_ts = adjust_emphasis(audio, sr, ts, targets, 0.7)

        # "ship" should be longer after emphasis
        ship_ts = [t for t in result_ts if t.word == "ship"][0]
        original_ship_dur = 0.5
        new_ship_dur = ship_ts.end - ship_ts.start
        assert new_ship_dur > original_ship_dur

    def test_emphasis_no_targets_passthrough(self) -> None:
        from processing.tempo import adjust_emphasis
        audio = _sine_wave(duration=1.0)
        ts = [WordTimestampResult(word="cat", start=0.0, end=0.5)]
        result_audio, result_ts = adjust_emphasis(audio, 24000, ts, set(), 0.8)
        np.testing.assert_array_equal(result_audio, audio)

    def test_emphasis_empty_timestamps(self) -> None:
        from processing.tempo import adjust_emphasis
        audio = _sine_wave()
        result_audio, result_ts = adjust_emphasis(audio, 24000, [], {"ship"}, 0.8)
        np.testing.assert_array_equal(result_audio, audio)
        assert result_ts == []


# =============================================================================
# Pitch Tests
# =============================================================================

class TestPitch:
    def test_zero_semitones_passthrough(self) -> None:
        from processing.pitch import adjust_pitch
        audio = _sine_wave()
        result = adjust_pitch(audio, 24000, 0.0)
        assert result.semitones == 0.0
        np.testing.assert_array_equal(result.audio, audio)

    def test_pitch_shift_changes_audio(self) -> None:
        from processing.pitch import adjust_pitch
        audio = _sine_wave(freq=440, duration=0.5, sr=24000)
        result = adjust_pitch(audio, 24000, 2.0)
        assert result.semitones == 2.0
        # Audio should be different (higher pitch)
        assert not np.array_equal(result.audio, audio)

    def test_pitch_clamps_to_range(self) -> None:
        from processing.pitch import adjust_pitch
        audio = _sine_wave(duration=0.2)
        result = adjust_pitch(audio, 24000, 10.0)  # Exceeds ±6 range
        assert result.semitones == 6.0

    def test_pitch_preserves_duration(self) -> None:
        from processing.pitch import adjust_pitch
        sr = 24000
        audio = _sine_wave(duration=1.0, sr=sr)
        result = adjust_pitch(audio, sr, 3.0)
        # Duration should be approximately the same
        original_dur = len(audio) / sr
        new_dur = len(result.audio) / sr
        assert new_dur == pytest.approx(original_dur, abs=0.1)


# =============================================================================
# EQ (Warmth/Brightness) Tests
# =============================================================================

class TestEQ:
    def test_zero_warmth_passthrough(self) -> None:
        from processing.pitch import adjust_warmth
        audio = _sine_wave()
        result = adjust_warmth(audio, 24000, 0.0)
        assert result.warmth == 0.0
        np.testing.assert_array_equal(result.audio, audio)

    def test_warmth_changes_audio(self) -> None:
        from processing.pitch import adjust_warmth
        audio = _noisy_signal(duration=0.5)
        result = adjust_warmth(audio, 24000, 4.0)
        assert result.warmth == 4.0
        assert not np.array_equal(result.audio, audio)

    def test_warmth_clamps(self) -> None:
        from processing.pitch import adjust_warmth
        audio = _sine_wave(duration=0.2)
        result = adjust_warmth(audio, 24000, 10.0)
        assert result.warmth == 6.0

    def test_warmth_no_clipping(self) -> None:
        from processing.pitch import adjust_warmth
        audio = _sine_wave(duration=0.5)
        result = adjust_warmth(audio, 24000, 6.0)
        assert np.max(np.abs(result.audio)) <= 1.0


# =============================================================================
# Analysis Tests
# =============================================================================

class TestAnalysis:
    def test_analyse_sine_wave(self) -> None:
        from processing.analysis import analyse_audio
        audio = _sine_wave(freq=440, duration=2.0, sr=24000)
        result = analyse_audio(audio, 24000)
        assert result.duration_seconds == pytest.approx(2.0, abs=0.01)
        assert result.sample_rate == 24000
        assert result.channels == 1
        assert result.silence_ratio < 0.5  # Not mostly silence

    def test_analyse_silence(self) -> None:
        from processing.analysis import analyse_audio
        audio = _silence(duration=1.0, sr=24000)
        result = analyse_audio(audio, 24000)
        assert result.silence_ratio > 0.9

    def test_analyse_with_word_count(self) -> None:
        from processing.analysis import analyse_audio
        audio = _sine_wave(duration=2.0)
        result = analyse_audio(audio, 24000, transcript_word_count=10)
        # Should calculate pace
        assert result.pace_wpm is not None
        assert result.pace_wpm > 0

    def test_analyse_empty_audio(self) -> None:
        from processing.analysis import analyse_audio
        audio = np.array([], dtype=np.float32)
        result = analyse_audio(audio, 24000)
        assert result.duration_seconds == 0.0
