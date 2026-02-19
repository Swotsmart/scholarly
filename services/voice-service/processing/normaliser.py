# =============================================================================
# SCHOLARLY VOICE SERVICE — Audio Normalisation Pipeline
# =============================================================================
# Every audio recording that enters the system — whether a teacher's voice
# sample for cloning or a raw TTS output for a storybook — passes through
# this normalisation pipeline. Think of it as the audio equivalent of running
# a document through a spellchecker and formatter before publishing: it
# ensures consistent quality regardless of the recording conditions.
#
# The pipeline has 5 stages, each independently configurable and skippable:
#
# 1. Loudness Normalisation — ensures all voices sound equally loud
# 2. Noise Gate — removes low-level background noise (fan hum, room tone)
# 3. Spectral Denoise — removes persistent frequency-domain noise (HVAC)
# 4. Silence Trim — removes leading/trailing silence, adds breathing room
# 5. Peak Limiting — prevents clipping on loud passages
#
# Each stage is a pure function: audio array in, audio array out. This makes
# them independently testable and composable in any order.
# =============================================================================

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Optional

import numpy as np

logger = logging.getLogger(__name__)


@dataclass
class NormalisationConfig:
    """Configuration for each stage of the normalisation pipeline.
    Every field maps to a setting in AudioProcessingSettings (config.py)."""

    # Stage 1: Loudness
    target_lufs: float = -16.0
    loudness_enabled: bool = True

    # Stage 2: Noise Gate
    noise_gate_threshold_db: float = -40.0
    noise_gate_attack_ms: float = 5.0
    noise_gate_release_ms: float = 50.0
    noise_gate_enabled: bool = True

    # Stage 3: Spectral Denoise
    spectral_reduction_db: float = 12.0
    spectral_enabled: bool = True

    # Stage 4: Silence Trim
    trim_threshold_db: float = -40.0
    trim_pad_ms: float = 100.0
    trim_enabled: bool = True

    # Stage 5: Peak Limiting
    peak_ceiling_dbfs: float = -1.0
    peak_release_ms: float = 50.0
    peak_enabled: bool = True


@dataclass
class NormalisationResult:
    """Result of running the normalisation pipeline."""
    audio: np.ndarray
    sample_rate: int
    stages_applied: list[str] = field(default_factory=list)
    loudness_before: Optional[float] = None
    loudness_after: Optional[float] = None
    peak_before: Optional[float] = None
    peak_after: Optional[float] = None
    snr_before: Optional[float] = None
    snr_after: Optional[float] = None
    duration_before: float = 0.0
    duration_after: float = 0.0
    silence_trimmed_ms: float = 0.0


class AudioNormaliser:
    """5-stage audio normalisation pipeline.

    Usage:
        normaliser = AudioNormaliser(config)
        result = normaliser.normalise(audio_array, sample_rate)
        # result.audio is the normalised array
        # result.stages_applied lists which stages ran
    """

    def __init__(self, config: Optional[NormalisationConfig] = None):
        self.config = config or NormalisationConfig()

    def normalise(
        self,
        audio: np.ndarray,
        sample_rate: int,
    ) -> NormalisationResult:
        """Run the full normalisation pipeline.

        Each stage is applied in order. Stages can be individually
        disabled via the config. The result includes before/after
        metrics for quality reporting.
        """
        if len(audio) == 0:
            return NormalisationResult(
                audio=audio, sample_rate=sample_rate,
                duration_before=0.0, duration_after=0.0,
            )

        result = NormalisationResult(
            audio=audio,
            sample_rate=sample_rate,
            duration_before=len(audio) / sample_rate,
        )

        # Measure before metrics
        result.loudness_before = self._measure_loudness(audio, sample_rate)
        result.peak_before = self._measure_peak_dbfs(audio)
        result.snr_before = self._estimate_snr(audio, sample_rate)

        # Stage 1: Loudness Normalisation
        if self.config.loudness_enabled:
            audio = self._normalise_loudness(audio, sample_rate)
            result.stages_applied.append("loudness")

        # Stage 2: Noise Gate
        if self.config.noise_gate_enabled:
            audio = self._apply_noise_gate(audio, sample_rate)
            result.stages_applied.append("noise_gate")

        # Stage 3: Spectral Denoise
        if self.config.spectral_enabled:
            audio = self._spectral_denoise(audio, sample_rate)
            result.stages_applied.append("spectral_denoise")

        # Stage 4: Silence Trim
        if self.config.trim_enabled:
            original_len = len(audio)
            audio = self._trim_silence(audio, sample_rate)
            trimmed_samples = original_len - len(audio)
            result.silence_trimmed_ms = (trimmed_samples / sample_rate) * 1000
            result.stages_applied.append("silence_trim")

        # Stage 5: Peak Limiting
        if self.config.peak_enabled:
            audio = self._peak_limit(audio)
            result.stages_applied.append("peak_limit")

        # Measure after metrics
        result.audio = audio
        result.loudness_after = self._measure_loudness(audio, sample_rate)
        result.peak_after = self._measure_peak_dbfs(audio)
        result.snr_after = self._estimate_snr(audio, sample_rate)
        result.duration_after = len(audio) / sample_rate

        logger.info(
            "Normalised: %.1fs → %.1fs, LUFS %.1f → %.1f, peak %.1f → %.1f dBFS, %d stages",
            result.duration_before, result.duration_after,
            result.loudness_before or 0, result.loudness_after or 0,
            result.peak_before or 0, result.peak_after or 0,
            len(result.stages_applied),
        )

        return result

    # -------------------------------------------------------------------------
    # Stage 1: Loudness Normalisation (ITU-R BS.1770)
    # -------------------------------------------------------------------------

    def _normalise_loudness(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        """Adjust overall volume to target LUFS using pyloudnorm.

        LUFS (Loudness Units relative to Full Scale) is the broadcast
        standard for perceived loudness. -16 LUFS is the target for
        spoken content — loud enough to hear clearly, quiet enough
        that it doesn't clip when played through phone speakers.
        """
        try:
            import pyloudnorm as pyln

            meter = pyln.Meter(sample_rate)
            current_loudness = meter.integrated_loudness(audio)

            if np.isinf(current_loudness) or np.isnan(current_loudness):
                logger.warning("Loudness measurement failed (silence?), skipping")
                return audio

            normalised = pyln.normalize.loudness(
                audio, current_loudness, self.config.target_lufs,
            )
            return normalised.astype(np.float32)

        except ImportError:
            logger.warning("pyloudnorm not installed, skipping loudness normalisation")
            return audio
        except Exception as e:
            logger.warning("Loudness normalisation failed: %s", e)
            return audio

    # -------------------------------------------------------------------------
    # Stage 2: Noise Gate
    # -------------------------------------------------------------------------

    def _apply_noise_gate(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        """Simple noise gate: silence samples below the threshold.

        The gate opens when signal exceeds the threshold and closes when
        it drops below. Attack and release times smooth the transitions
        to avoid audible clicks.
        """
        threshold_linear = 10 ** (self.config.noise_gate_threshold_db / 20.0)
        attack_samples = int(self.config.noise_gate_attack_ms * sample_rate / 1000)
        release_samples = int(self.config.noise_gate_release_ms * sample_rate / 1000)

        envelope = np.abs(audio)
        gate = np.zeros_like(audio)
        gate_open = False
        hold_counter = 0

        for i in range(len(audio)):
            if envelope[i] > threshold_linear:
                gate_open = True
                hold_counter = release_samples
            elif gate_open:
                hold_counter -= 1
                if hold_counter <= 0:
                    gate_open = False

            gate[i] = 1.0 if gate_open else 0.0

        # Smooth transitions
        if attack_samples > 0:
            kernel_size = max(attack_samples, 1)
            kernel = np.ones(kernel_size) / kernel_size
            gate = np.convolve(gate, kernel, mode="same")
            gate = np.clip(gate, 0.0, 1.0)

        return (audio * gate).astype(np.float32)

    # -------------------------------------------------------------------------
    # Stage 3: Spectral Denoise
    # -------------------------------------------------------------------------

    def _spectral_denoise(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        """Remove persistent frequency-domain noise using noisereduce.

        Learns the noise profile from the first 0.5s of the recording
        (assumed to be room tone / silence before speech begins) and
        subtracts it from the full signal.
        """
        try:
            import noisereduce as nr

            # Use stationary noise reduction — learns noise from the signal
            reduced = nr.reduce_noise(
                y=audio,
                sr=sample_rate,
                stationary=True,
                prop_decrease=min(self.config.spectral_reduction_db / 20.0, 1.0),
                n_fft=2048,
                hop_length=512,
            )
            return reduced.astype(np.float32)

        except ImportError:
            logger.warning("noisereduce not installed, skipping spectral denoise")
            return audio
        except Exception as e:
            logger.warning("Spectral denoise failed: %s", e)
            return audio

    # -------------------------------------------------------------------------
    # Stage 4: Silence Trim
    # -------------------------------------------------------------------------

    def _trim_silence(self, audio: np.ndarray, sample_rate: int) -> np.ndarray:
        """Remove leading and trailing silence, add configurable padding.

        Uses librosa's trim function which detects silence based on
        the signal's energy relative to a threshold.
        """
        try:
            import librosa

            trimmed, _ = librosa.effects.trim(
                audio,
                top_db=abs(self.config.trim_threshold_db),
            )

            # Add padding for natural breathing room
            pad_samples = int(self.config.trim_pad_ms * sample_rate / 1000)
            if pad_samples > 0:
                padding = np.zeros(pad_samples, dtype=np.float32)
                trimmed = np.concatenate([padding, trimmed, padding])

            return trimmed

        except ImportError:
            logger.warning("librosa not installed, skipping silence trim")
            return audio
        except Exception as e:
            logger.warning("Silence trim failed: %s", e)
            return audio

    # -------------------------------------------------------------------------
    # Stage 5: Peak Limiting
    # -------------------------------------------------------------------------

    def _peak_limit(self, audio: np.ndarray) -> np.ndarray:
        """Soft peak limiter to prevent clipping.

        Applies a simple soft-knee limiter: signals above the ceiling
        are compressed. This is a basic implementation; for production
        mastering-grade limiting, scipy.signal would be used.
        """
        ceiling_linear = 10 ** (self.config.peak_ceiling_dbfs / 20.0)

        peak = np.max(np.abs(audio))
        if peak <= ceiling_linear or peak == 0:
            return audio

        # Simple gain reduction to bring peak to ceiling
        gain = ceiling_linear / peak
        return (audio * gain).astype(np.float32)

    # -------------------------------------------------------------------------
    # Measurement utilities
    # -------------------------------------------------------------------------

    @staticmethod
    def _measure_loudness(audio: np.ndarray, sample_rate: int) -> Optional[float]:
        """Measure integrated loudness in LUFS."""
        try:
            import pyloudnorm as pyln
            meter = pyln.Meter(sample_rate)
            loudness = meter.integrated_loudness(audio)
            if np.isinf(loudness) or np.isnan(loudness):
                return None
            return round(float(loudness), 1)
        except Exception:
            return None

    @staticmethod
    def _measure_peak_dbfs(audio: np.ndarray) -> Optional[float]:
        """Measure peak level in dBFS."""
        peak = np.max(np.abs(audio))
        if peak == 0:
            return None
        return round(float(20 * np.log10(peak)), 1)

    @staticmethod
    def _estimate_snr(audio: np.ndarray, sample_rate: int) -> Optional[float]:
        """Rough SNR estimate: compare RMS of loudest vs quietest segments."""
        if len(audio) < sample_rate:
            return None

        # Split into 100ms frames
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
        # Signal = top 25% RMS, Noise = bottom 25% RMS
        n_quarter = max(len(rms_values) // 4, 1)
        signal_rms = np.mean(rms_values[-n_quarter:])
        noise_rms = np.mean(rms_values[:n_quarter])

        if noise_rms == 0:
            return None

        snr = 20 * np.log10(signal_rms / noise_rms)
        return round(float(snr), 1)
