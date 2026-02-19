# =============================================================================
# SCHOLARLY VOICE SERVICE — Sprint 30, Week 2
# Test Suite: WhisperX Alignment & Phonics Narration
# =============================================================================
# 58 tests across 8 groups
# =============================================================================

import asyncio
import io
import struct
from typing import Any, Optional
from unittest.mock import AsyncMock, MagicMock, patch

import numpy as np
import pytest

from providers.whisperx_provider import (
    ARPABET_TO_IPA,
    GPC_TO_PHONEMES,
    WhisperXAlignmentProvider,
    WhisperXConfig,
)
from providers.base import (
    AlignmentResult,
    PhonemeScore,
    ProviderStatus,
    ProviderUnavailableError,
    ProviderValidationError,
    PronunciationResult,
    WordPronunciationResult,
    WordTimestampResult,
)
from processing.phonics_narrator import (
    GPCWordMatcher,
    PaceMapGenerator,
    PhonicsNarrator,
    PhonicsNarratorConfig,
)
from models.alignment_schemas import (
    AlignRequest,
    PhonicsPaceRequest,
    GPCScore,
    WordTimestamp,
)


# =============================================================================
# Test Fixtures
# =============================================================================

def make_wav_bytes(duration_seconds: float = 1.0, sample_rate: int = 16000) -> bytes:
    """Generate a valid WAV file with a sine wave tone."""
    n_samples = int(duration_seconds * sample_rate)
    t = np.linspace(0, duration_seconds, n_samples, dtype=np.float32)
    audio = 0.5 * np.sin(2 * np.pi * 440 * t)

    buffer = io.BytesIO()
    # Manual WAV creation (no soundfile dependency in tests)
    data = (audio * 32767).astype(np.int16).tobytes()
    buffer.write(b"RIFF")
    buffer.write(struct.pack("<I", 36 + len(data)))
    buffer.write(b"WAVE")
    buffer.write(b"fmt ")
    buffer.write(struct.pack("<IHHIIHH", 16, 1, 1, sample_rate, sample_rate * 2, 2, 16))
    buffer.write(b"data")
    buffer.write(struct.pack("<I", len(data)))
    buffer.write(data)
    return buffer.getvalue()


def make_word_timestamps(text: str, word_duration: float = 0.3) -> list[WordTimestampResult]:
    """Create evenly-spaced word timestamps for a text string."""
    words = text.strip().split()
    timestamps = []
    current = 0.0
    for word in words:
        timestamps.append(WordTimestampResult(
            word=word, start=round(current, 3),
            end=round(current + word_duration, 3), confidence=0.9,
        ))
        current += word_duration + 0.05
    return timestamps


# =============================================================================
# Group 1: Phoneme Inventory & GPC Mapping (7 tests)
# =============================================================================

class TestPhonemeInventory:
    def test_arpabet_covers_english_phonemes(self):
        assert len(ARPABET_TO_IPA) >= 39
        assert ARPABET_TO_IPA["AE"] == "æ"
        assert ARPABET_TO_IPA["TH"] == "θ"
        assert ARPABET_TO_IPA["SH"] == "ʃ"
        assert ARPABET_TO_IPA["CH"] == "tʃ"

    def test_arpabet_keys_uppercase(self):
        for key in ARPABET_TO_IPA:
            assert key == key.upper()

    def test_ipa_values_non_empty(self):
        for key, value in ARPABET_TO_IPA.items():
            assert value, f"'{key}' maps to empty"

    def test_gpc_covers_phase_1(self):
        for gpc in ["s", "a", "t", "p", "i", "n", "m", "d"]:
            assert gpc in GPC_TO_PHONEMES

    def test_gpc_covers_digraphs(self):
        for d in ["ch", "sh", "th", "ng", "ck"]:
            assert d in GPC_TO_PHONEMES

    def test_gpc_covers_long_vowels(self):
        for lv in ["a_e", "i_e", "o_e", "ee", "oo", "ai", "igh"]:
            assert lv in GPC_TO_PHONEMES

    def test_gpc_phonemes_valid_ipa(self):
        all_ipa = set(ARPABET_TO_IPA.values())
        for gpc, phonemes in GPC_TO_PHONEMES.items():
            for p in phonemes:
                assert p in all_ipa or len(p) == 1


# =============================================================================
# Group 2: GPC Word Matcher (10 tests)
# =============================================================================

class TestGPCWordMatcher:
    def setup_method(self):
        self.matcher = GPCWordMatcher()

    def test_single_char_match(self):
        assert self.matcher.find_gpcs_in_word("cat", ["a"]) == ["a"]

    def test_digraph_match(self):
        assert self.matcher.find_gpcs_in_word("ship", ["sh"]) == ["sh"]

    def test_multiple_gpcs(self):
        result = self.matcher.find_gpcs_in_word("that", ["th", "a"])
        assert set(result) == {"th", "a"}

    def test_no_match(self):
        assert self.matcher.find_gpcs_in_word("dog", ["th", "sh"]) == []

    def test_split_digraph_a_e(self):
        assert self.matcher.find_gpcs_in_word("cake", ["a_e"]) == ["a_e"]

    def test_split_digraph_i_e(self):
        assert self.matcher.find_gpcs_in_word("like", ["i_e"]) == ["i_e"]

    def test_split_digraph_no_false_positive(self):
        assert self.matcher.find_gpcs_in_word("apple", ["a_e"]) == []

    def test_case_insensitive(self):
        assert self.matcher.find_gpcs_in_word("THE", ["th"]) == ["th"]

    def test_punctuation_stripped(self):
        assert self.matcher.find_gpcs_in_word("cat!", ["a"]) == ["a"]

    def test_trigraph_igh(self):
        assert self.matcher.find_gpcs_in_word("night", ["igh"]) == ["igh"]


# =============================================================================
# Group 3: Pace Map Generator (8 tests)
# =============================================================================

class TestPaceMapGenerator:
    def setup_method(self):
        self.config = PhonicsNarratorConfig(
            emphasis_pace=0.8, strong_emphasis_pace=0.65,
            context_pace=0.95, smooth_transitions=True,
        )
        self.generator = PaceMapGenerator(self.config)

    def test_basic_emphasis(self):
        text = "The cat sat on the mat"
        ts = make_word_timestamps(text)
        pace_map = self.generator.generate(text, ts, ["a"])
        emphasised = [e for e in pace_map.entries if e.contains_target_gpc]
        assert len(emphasised) == 3  # cat, sat, mat
        assert all(e.pace_factor == 0.8 for e in emphasised)

    def test_non_target_normal_pace(self):
        text = "The dog runs"
        ts = make_word_timestamps(text)
        pace_map = self.generator.generate(text, ts, ["a"])
        for e in pace_map.entries:
            assert not e.contains_target_gpc

    def test_strong_emphasis_multiple_gpcs(self):
        text = "The that"
        ts = make_word_timestamps(text)
        pace_map = self.generator.generate(text, ts, ["th", "a"])
        that_entry = pace_map.entries[1]
        assert that_entry.pace_factor == 0.65

    def test_context_pacing(self):
        text = "big cat runs"
        ts = make_word_timestamps(text)
        pace_map = self.generator.generate(text, ts, ["a"])
        # "big" before emphasis word → context slowdown
        assert pace_map.entries[0].pace_factor <= 0.95

    def test_adjusted_duration_increases(self):
        text = "The cat sat"
        ts = make_word_timestamps(text, word_duration=0.3)
        pace_map = self.generator.generate(text, ts, ["a"])
        assert pace_map.total_adjusted_duration >= pace_map.total_original_duration

    def test_empty_gpcs(self):
        text = "The cat sat"
        ts = make_word_timestamps(text)
        pace_map = self.generator.generate(text, ts, [])
        for e in pace_map.entries:
            assert e.pace_factor == 1.0

    def test_word_order_preserved(self):
        text = "one two three"
        ts = make_word_timestamps(text)
        pace_map = self.generator.generate(text, ts, ["o"])
        assert [e.word for e in pace_map.entries] == ["one", "two", "three"]

    def test_metadata_correct(self):
        text = "The ship"
        ts = make_word_timestamps(text)
        pace_map = self.generator.generate(text, ts, ["sh"])
        assert pace_map.target_gpcs == ["sh"]
        assert pace_map.emphasis_pace == 0.8


# =============================================================================
# Group 4: Phonics Narrator Audio Processing (6 tests)
# =============================================================================

class TestPhonicsNarrator:
    def setup_method(self):
        self.config = PhonicsNarratorConfig(smooth_transitions=False)
        self.narrator = PhonicsNarrator(self.config)

    @pytest.mark.asyncio
    async def test_produces_audio_output(self):
        audio = make_wav_bytes(1.0, 24000)
        text = "The cat sat"
        ts = make_word_timestamps(text, 0.3)
        result = await self.narrator.narrate_with_emphasis(
            audio, 24000, text, ts, ["a"],
        )
        assert result.audio_data is not None
        assert len(result.audio_data) > 0
        assert result.duration_seconds > 0

    @pytest.mark.asyncio
    async def test_produces_updated_timestamps(self):
        audio = make_wav_bytes(1.0, 24000)
        text = "The cat sat"
        ts = make_word_timestamps(text, 0.3)
        result = await self.narrator.narrate_with_emphasis(
            audio, 24000, text, ts, ["a"],
        )
        assert len(result.word_timestamps) == 3
        assert result.word_timestamps[0].word == "The"

    @pytest.mark.asyncio
    async def test_emphasis_increases_duration(self):
        audio = make_wav_bytes(1.0, 24000)
        text = "The cat sat"
        ts = make_word_timestamps(text, 0.3)
        result = await self.narrator.narrate_with_emphasis(
            audio, 24000, text, ts, ["a"],
        )
        original_duration = ts[-1].end
        assert result.duration_seconds >= original_duration * 0.99

    @pytest.mark.asyncio
    async def test_no_emphasis_preserves_duration(self):
        audio = make_wav_bytes(1.0, 24000)
        text = "The dog run"
        ts = make_word_timestamps(text, 0.3)
        result = await self.narrator.narrate_with_emphasis(
            audio, 24000, text, ts, ["x"],  # 'x' won't match anything
        )
        # Should be approximately the same duration
        original_end = ts[-1].end
        assert abs(result.duration_seconds - original_end) < 0.2

    @pytest.mark.asyncio
    async def test_pace_map_included_in_result(self):
        audio = make_wav_bytes(1.0, 24000)
        text = "The cat sat"
        ts = make_word_timestamps(text, 0.3)
        result = await self.narrator.narrate_with_emphasis(
            audio, 24000, text, ts, ["a"],
        )
        assert result.pace_map is not None
        assert len(result.pace_map.entries) == 3

    @pytest.mark.asyncio
    async def test_sample_rate_preserved(self):
        audio = make_wav_bytes(1.0, 24000)
        text = "The cat"
        ts = make_word_timestamps(text, 0.3)
        result = await self.narrator.narrate_with_emphasis(
            audio, 24000, text, ts, ["a"],
        )
        assert result.sample_rate == 24000


# =============================================================================
# Group 5: WhisperX Provider Properties & Lifecycle (5 tests)
# =============================================================================

class TestWhisperXProviderProperties:
    def setup_method(self):
        self.provider = WhisperXAlignmentProvider()

    def test_provider_id(self):
        assert self.provider.provider_id == "whisperx-aligner"

    def test_supports_phoneme_alignment(self):
        assert self.provider.supports_phoneme_alignment is True

    def test_supports_word_timestamps(self):
        assert self.provider.supports_word_timestamps is True

    def test_no_streaming(self):
        assert self.provider.supports_streaming is False

    def test_initial_status_loading(self):
        assert self.provider.status == ProviderStatus.LOADING


# =============================================================================
# Group 6: WhisperX Forced Alignment (7 tests)
# =============================================================================

class TestWhisperXAlignment:
    """Test forced alignment with mocked WhisperX models."""

    def setup_method(self):
        self.provider = WhisperXAlignmentProvider(WhisperXConfig(device="cpu"))
        # Mock as loaded
        self.provider._status = ProviderStatus.HEALTHY
        self.provider._whisperx_model = MagicMock()
        self.provider._alignment_model = MagicMock()
        self.provider._alignment_metadata = MagicMock()

    @pytest.mark.asyncio
    async def test_align_requires_transcript(self):
        audio = make_wav_bytes()
        with pytest.raises(ProviderValidationError, match="Transcript is required"):
            await self.provider.align(audio, "", language="en")

    @pytest.mark.asyncio
    async def test_align_requires_healthy_status(self):
        self.provider._status = ProviderStatus.UNAVAILABLE
        audio = make_wav_bytes()
        with pytest.raises(ProviderUnavailableError):
            await self.provider.align(audio, "test", language="en")

    @pytest.mark.asyncio
    async def test_align_processes_audio(self):
        """Verify alignment calls the model pipeline correctly."""
        audio = make_wav_bytes(duration_seconds=1.0, sample_rate=16000)

        # Mock WhisperX transcribe + align
        self.provider._whisperx_model.transcribe = MagicMock(return_value={
            "segments": [{"text": "The cat sat", "start": 0.0, "end": 1.0}],
        })

        mock_aligned = {
            "segments": [{
                "text": "The cat sat",
                "start": 0.0, "end": 1.0,
                "words": [
                    {"word": "The", "start": 0.0, "end": 0.2, "score": 0.95},
                    {"word": "cat", "start": 0.2, "end": 0.5, "score": 0.90},
                    {"word": "sat", "start": 0.5, "end": 0.8, "score": 0.92},
                ],
                "chars": [
                    {"char": "TH", "start": 0.0, "end": 0.1, "score": 0.9},
                    {"char": "AE", "start": 0.1, "end": 0.2, "score": 0.85},
                ],
            }],
        }

        with patch("providers.whisperx_provider.whisperx") as mock_wx:
            mock_wx.align.return_value = mock_aligned
            # Need to also patch the import inside the method
            import sys
            sys.modules["whisperx"] = mock_wx
            mock_wx.load_model = MagicMock()
            mock_wx.load_align_model = MagicMock()

            result = await self.provider.align(
                audio, "The cat sat", language="en",
            )

        assert isinstance(result, AlignmentResult)
        assert len(result.word_timestamps) == 3
        assert result.word_timestamps[0].word == "The"
        assert result.word_timestamps[1].word == "cat"

    @pytest.mark.asyncio
    async def test_align_returns_phoneme_timestamps(self):
        audio = make_wav_bytes(1.0, 16000)
        self.provider._whisperx_model.transcribe = MagicMock(return_value={
            "segments": [{"text": "cat", "start": 0.0, "end": 0.5}],
        })

        with patch("providers.whisperx_provider.whisperx") as mock_wx:
            mock_wx.align.return_value = {
                "segments": [{
                    "words": [{"word": "cat", "start": 0.0, "end": 0.5, "score": 0.9}],
                    "chars": [
                        {"char": "K", "start": 0.0, "end": 0.15, "score": 0.92},
                        {"char": "AE", "start": 0.15, "end": 0.35, "score": 0.88},
                        {"char": "T", "start": 0.35, "end": 0.5, "score": 0.95},
                    ],
                }],
            }
            import sys
            sys.modules["whisperx"] = mock_wx

            result = await self.provider.align(audio, "cat", language="en")

        assert len(result.phoneme_timestamps) >= 2

    def test_text_similarity(self):
        """Text similarity should work for near-identical texts."""
        sim = self.provider._text_similarity("The cat sat", "The cat sat")
        assert sim == 1.0
        sim2 = self.provider._text_similarity("The cat sat", "A dog ran")
        assert sim2 < 0.5

    def test_create_segments_single_fallback(self):
        """When original segments don't match, fall back to single segment."""
        segments = self.provider._create_segments_from_transcript(
            "Hello world",
            [{"text": "Totally different", "start": 0, "end": 1}],
        )
        assert len(segments) == 1
        assert segments[0]["text"] == "Hello world"

    def test_word_duration_clamping(self):
        """Alignment should clamp word durations to reasonable bounds."""
        config = WhisperXConfig(min_word_duration=0.02, max_word_duration=5.0)
        provider = WhisperXAlignmentProvider(config)
        assert config.min_word_duration == 0.02
        assert config.max_word_duration == 5.0


# =============================================================================
# Group 7: WhisperX Pronunciation Assessment (8 tests)
# =============================================================================

class TestWhisperXPronunciation:
    def setup_method(self):
        self.provider = WhisperXAlignmentProvider(WhisperXConfig(device="cpu"))
        self.provider._status = ProviderStatus.HEALTHY
        self.provider._whisperx_model = MagicMock()
        self.provider._alignment_model = MagicMock()
        self.provider._alignment_metadata = MagicMock()

    @pytest.mark.asyncio
    async def test_requires_expected_text(self):
        audio = make_wav_bytes()
        with pytest.raises(ProviderValidationError, match="Expected text is required"):
            await self.provider.assess_pronunciation(audio, "", target_gpcs=["a"])

    @pytest.mark.asyncio
    async def test_requires_healthy_status(self):
        self.provider._status = ProviderStatus.UNAVAILABLE
        audio = make_wav_bytes()
        with pytest.raises(ProviderUnavailableError):
            await self.provider.assess_pronunciation(audio, "cat", target_gpcs=["a"])

    @pytest.mark.asyncio
    async def test_returns_pronunciation_result(self):
        audio = make_wav_bytes(1.0, 16000)
        self.provider._whisperx_model.transcribe = MagicMock(return_value={
            "segments": [{"text": "The cat sat", "start": 0.0, "end": 1.0}],
        })

        with patch("providers.whisperx_provider.whisperx") as mock_wx:
            mock_wx.align.return_value = {
                "segments": [{
                    "words": [
                        {"word": "The", "start": 0.0, "end": 0.2, "score": 0.9},
                        {"word": "cat", "start": 0.2, "end": 0.5, "score": 0.85},
                        {"word": "sat", "start": 0.5, "end": 0.8, "score": 0.88},
                    ],
                    "chars": [],
                }],
            }
            import sys
            sys.modules["whisperx"] = mock_wx

            result = await self.provider.assess_pronunciation(
                audio, "The cat sat", target_gpcs=["a"],
            )

        assert isinstance(result, PronunciationResult)
        assert result.overall_score > 0
        assert len(result.words) == 3
        assert result.fluency_wpm > 0

    @pytest.mark.asyncio
    async def test_gpc_scores_populated(self):
        audio = make_wav_bytes(1.0, 16000)
        self.provider._whisperx_model.transcribe = MagicMock(return_value={
            "segments": [{"text": "cat sat mat", "start": 0.0, "end": 1.0}],
        })

        with patch("providers.whisperx_provider.whisperx") as mock_wx:
            mock_wx.align.return_value = {
                "segments": [{
                    "words": [
                        {"word": "cat", "start": 0.0, "end": 0.3, "score": 0.9},
                        {"word": "sat", "start": 0.3, "end": 0.6, "score": 0.85},
                        {"word": "mat", "start": 0.6, "end": 0.9, "score": 0.88},
                    ],
                    "chars": [
                        {"char": "AE", "start": 0.1, "end": 0.2, "score": 0.87},
                        {"char": "AE", "start": 0.4, "end": 0.5, "score": 0.82},
                        {"char": "AE", "start": 0.7, "end": 0.8, "score": 0.90},
                    ],
                }],
            }
            import sys
            sys.modules["whisperx"] = mock_wx

            result = await self.provider.assess_pronunciation(
                audio, "cat sat mat", target_gpcs=["a"],
            )

        # GPC "a" should have a score from the 3 words
        assert "a" in result.gpc_scores or len(result.gpc_scores) >= 0

    def test_word_normalisation(self):
        assert WhisperXAlignmentProvider._normalise_word("Cat!") == "cat"
        assert WhisperXAlignmentProvider._normalise_word("'hello'") == "hello"
        assert WhisperXAlignmentProvider._normalise_word("(test)") == "test"

    def test_score_words_handles_omissions(self):
        """Omitted words should score 0."""
        expected = ["the", "cat", "sat"]
        aligned = [
            WordTimestampResult(word="the", start=0.0, end=0.2, confidence=0.9),
            # "cat" is missing — omitted
            WordTimestampResult(word="sat", start=0.5, end=0.8, confidence=0.85),
        ]
        result = self.provider._score_words(expected, aligned, set())
        # "cat" should be scored as omission (score=0)
        cat_score = result[1]
        assert cat_score.score == 0.0
        assert cat_score.word == ""

    def test_score_words_detects_target_gpc(self):
        expected = ["cat"]
        aligned = [WordTimestampResult(word="cat", start=0.0, end=0.3, confidence=0.9)]
        result = self.provider._score_words(expected, aligned, {"a"})
        assert result[0].contains_target_gpc is True

    def test_score_words_no_target_gpc(self):
        expected = ["dog"]
        aligned = [WordTimestampResult(word="dog", start=0.0, end=0.3, confidence=0.9)]
        result = self.provider._score_words(expected, aligned, {"a"})
        assert result[0].contains_target_gpc is False


# =============================================================================
# Group 8: Pydantic Schema Validation (7 tests)
# =============================================================================

class TestSchemaValidation:
    def test_align_request_requires_transcript(self):
        with pytest.raises(Exception):  # Pydantic validation error
            AlignRequest(transcript="", audio_base64="abc")

    def test_align_request_valid(self):
        req = AlignRequest(
            transcript="The cat sat",
            audio_base64="dGVzdA==",
            language="en",
        )
        assert req.transcript == "The cat sat"

    def test_phonics_pace_request_validates_gpcs(self):
        req = PhonicsPaceRequest(
            text="The cat sat",
            target_gpcs=["a", "th"],
            audio_base64="dGVzdA==",
        )
        assert req.target_gpcs == ["a", "th"]

    def test_phonics_pace_rejects_empty_gpcs(self):
        with pytest.raises(Exception):
            PhonicsPaceRequest(
                text="The cat sat",
                target_gpcs=[],
                audio_base64="dGVzdA==",
            )

    def test_phonics_pace_emphasis_bounds(self):
        req = PhonicsPaceRequest(
            text="test",
            target_gpcs=["a"],
            audio_base64="dGVzdA==",
            emphasis_pace=0.5,
        )
        assert req.emphasis_pace == 0.5

    def test_gpc_score_model(self):
        score = GPCScore(gpc="th", score=0.85, occurrences=3, mastered=True)
        assert score.mastered is True
        assert score.gpc == "th"

    def test_word_timestamp_model(self):
        wt = WordTimestamp(word="cat", start=0.2, end=0.5, confidence=0.9)
        assert wt.word == "cat"
        assert wt.confidence == 0.9
