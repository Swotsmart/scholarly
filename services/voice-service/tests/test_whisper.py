# =============================================================================
# SCHOLARLY VOICE SERVICE — Whisper STT Provider Tests
# =============================================================================
# Tests for scoring/alignment logic without requiring model inference.
# =============================================================================

from __future__ import annotations

import pytest

from providers.base import (
    NoProviderAvailableError,
    ProviderStatus,
    TranscriptionResult,
    TranscriptionSegmentResult,
    TranscriptionWordResult,
    WordPronunciationResult,
)
from providers.whisper_provider import (
    BCP47_TO_WHISPER,
    WHISPER_PRIMARY_LANGUAGES,
    WhisperSTTProvider,
)
from providers.registry import ProviderRegistry, RoutingFilters


# =============================================================================
# Language Mapping
# =============================================================================

class TestLanguageMapping:
    def test_english_variants(self) -> None:
        assert BCP47_TO_WHISPER["en-us"] == "en"
        assert BCP47_TO_WHISPER["en-gb"] == "en"

    def test_cjk_languages(self) -> None:
        assert BCP47_TO_WHISPER["ja-jp"] == "ja"
        assert BCP47_TO_WHISPER["zh-cn"] == "zh"
        assert BCP47_TO_WHISPER["ko-kr"] == "ko"

    def test_european_languages(self) -> None:
        assert BCP47_TO_WHISPER["fr-fr"] == "fr"
        assert BCP47_TO_WHISPER["it-it"] == "it"
        assert BCP47_TO_WHISPER["es-es"] == "es"

    def test_map_language_none(self) -> None:
        p = WhisperSTTProvider.__new__(WhisperSTTProvider)
        assert p._map_language(None) is None

    def test_map_language_fallback_to_prefix(self) -> None:
        p = WhisperSTTProvider.__new__(WhisperSTTProvider)
        assert p._map_language("en-nz") == "en"  # Not in map, falls back to prefix

    def test_supported_languages_count(self) -> None:
        assert len(WHISPER_PRIMARY_LANGUAGES) >= 20


# =============================================================================
# Text Normalisation
# =============================================================================

class TestTextNormalisation:
    def test_lowercase_and_split(self) -> None:
        assert WhisperSTTProvider._normalise_text("Hello World") == ["hello", "world"]

    def test_strip_punctuation(self) -> None:
        assert WhisperSTTProvider._normalise_text("Hello, world!") == ["hello", "world"]

    def test_empty_string(self) -> None:
        assert WhisperSTTProvider._normalise_text("") == []

    def test_multiple_spaces(self) -> None:
        assert WhisperSTTProvider._normalise_text("hello   world") == ["hello", "world"]

    def test_normalise_word(self) -> None:
        assert WhisperSTTProvider._normalise_word("hello!") == "hello"
        assert WhisperSTTProvider._normalise_word("it's") == "its"


# =============================================================================
# GPC Detection
# =============================================================================

class TestGPCDetection:
    def test_contains_gpc(self) -> None:
        assert WhisperSTTProvider._word_contains_gpc("ship", ["sh"]) is True
        assert WhisperSTTProvider._word_contains_gpc("cat", ["sh"]) is False

    def test_case_insensitive(self) -> None:
        assert WhisperSTTProvider._word_contains_gpc("SHIP", ["sh"]) is True

    def test_empty_gpc_list(self) -> None:
        assert WhisperSTTProvider._word_contains_gpc("ship", []) is False

    def test_multiple_targets(self) -> None:
        assert WhisperSTTProvider._word_contains_gpc("the", ["th", "sh"]) is True
        assert WhisperSTTProvider._word_contains_gpc("cat", ["th", "sh"]) is False


# =============================================================================
# Alignment and Scoring
# =============================================================================

class TestAlignmentAndScoring:
    def _provider(self) -> WhisperSTTProvider:
        p = WhisperSTTProvider.__new__(WhisperSTTProvider)
        p._model_size = "test"
        return p

    def _transcription(self, words: list[str]) -> TranscriptionResult:
        word_results = [
            TranscriptionWordResult(word=w, start=i * 0.5, end=(i + 1) * 0.5, confidence=0.9)
            for i, w in enumerate(words)
        ]
        return TranscriptionResult(
            text=" ".join(words), language="en",
            segments=[TranscriptionSegmentResult(
                text=" ".join(words), start=0.0, end=len(words) * 0.5, words=word_results,
            )],
            duration_seconds=len(words) * 0.5,
        )

    def test_perfect_match(self) -> None:
        p = self._provider()
        t = self._transcription(["the", "cat", "sat"])
        results = p._align_and_score(["the", "cat", "sat"], ["the", "cat", "sat"], t, [])
        assert len(results) == 3
        assert all(r.score == 1.0 for r in results)

    def test_substitution_partial_credit(self) -> None:
        p = self._provider()
        t = self._transcription(["cot"])
        results = p._align_and_score(["cat"], ["cot"], t, [])
        assert len(results) == 1
        assert 0.0 < results[0].score < 1.0

    def test_missing_word_zero(self) -> None:
        p = self._provider()
        t = self._transcription(["the", "sat"])
        results = p._align_and_score(["the", "cat", "sat"], ["the", "sat"], t, [])
        missing = [r for r in results if r.expected == "cat"]
        assert len(missing) == 1
        assert missing[0].score == 0.0

    def test_extra_words_not_penalised(self) -> None:
        p = self._provider()
        t = self._transcription(["the", "big", "cat"])
        results = p._align_and_score(["the", "cat"], ["the", "big", "cat"], t, [])
        scored = [r.expected for r in results]
        assert "the" in scored
        assert "cat" in scored

    def test_gpc_marking(self) -> None:
        p = self._provider()
        t = self._transcription(["the", "ship", "cat"])
        results = p._align_and_score(
            ["the", "ship", "cat"], ["the", "ship", "cat"], t, ["sh"],
        )
        ship = [r for r in results if r.expected == "ship"][0]
        cat = [r for r in results if r.expected == "cat"][0]
        assert ship.contains_target_gpc is True
        assert cat.contains_target_gpc is False

    def test_empty_expected(self) -> None:
        p = self._provider()
        t = self._transcription(["hello"])
        assert p._align_and_score([], [], t, []) == []


# =============================================================================
# GPC Score Calculation
# =============================================================================

class TestGPCScoreCalculation:
    def _provider(self) -> WhisperSTTProvider:
        return WhisperSTTProvider.__new__(WhisperSTTProvider)

    def test_average_correctly(self) -> None:
        p = self._provider()
        words = [
            WordPronunciationResult(word="ship", expected="ship", score=1.0, contains_target_gpc=True),
            WordPronunciationResult(word="shop", expected="shop", score=0.8, contains_target_gpc=True),
        ]
        scores = p._calculate_gpc_scores(words, ["sh"])
        assert scores["sh"] == pytest.approx(0.9, abs=0.001)

    def test_empty_targets(self) -> None:
        assert self._provider()._calculate_gpc_scores([], []) == {}

    def test_no_matching_words(self) -> None:
        p = self._provider()
        words = [WordPronunciationResult(word="cat", expected="cat", score=1.0, contains_target_gpc=False)]
        assert p._calculate_gpc_scores(words, ["sh"])["sh"] == 0.0

    def test_multiple_gpcs(self) -> None:
        p = self._provider()
        words = [
            WordPronunciationResult(word="ship", expected="ship", score=1.0, contains_target_gpc=True),
            WordPronunciationResult(word="the", expected="the", score=0.6, contains_target_gpc=True),
        ]
        scores = p._calculate_gpc_scores(words, ["sh", "th"])
        assert scores["sh"] == 1.0
        assert scores["th"] == 0.6


# =============================================================================
# Provider Properties
# =============================================================================

class TestWhisperProperties:
    def test_provider_id(self) -> None:
        assert WhisperSTTProvider().provider_id == "whisper"

    def test_supports_word_timestamps(self) -> None:
        assert WhisperSTTProvider().supports_word_timestamps is True

    def test_priority(self) -> None:
        assert WhisperSTTProvider().priority == 1

    def test_initial_status_loading(self) -> None:
        assert WhisperSTTProvider().status == ProviderStatus.LOADING

    def test_default_model_size(self) -> None:
        assert WhisperSTTProvider()._model_size == "large-v3-turbo"

    def test_custom_model_size(self) -> None:
        assert WhisperSTTProvider(model_size="base")._model_size == "base"

    def test_model_info(self) -> None:
        info = WhisperSTTProvider().get_model_info()
        assert info["name"] == "whisper-large-v3-turbo"
        assert info["provider"] == "whisper"

    @pytest.mark.asyncio
    async def test_health_fails_without_model(self) -> None:
        p = WhisperSTTProvider()
        assert await p.health_check() is False
        assert p.status == ProviderStatus.UNAVAILABLE


# =============================================================================
# Registry Integration
# =============================================================================

class TestSTTRegistration:
    def test_register_in_registry(self) -> None:
        registry = ProviderRegistry()
        registry.register_stt(WhisperSTTProvider())
        assert registry.stt_provider_count == 1

    def test_routing_finds_healthy_whisper(self) -> None:
        p = WhisperSTTProvider()
        p._status = ProviderStatus.HEALTHY
        p._model = "mock"

        registry = ProviderRegistry()
        registry.register_stt(p)
        assert registry.get_stt(RoutingFilters(language="en")).provider_id == "whisper"

    def test_routing_skips_unhealthy(self) -> None:
        registry = ProviderRegistry()
        registry.register_stt(WhisperSTTProvider())  # Status = LOADING
        with pytest.raises(NoProviderAvailableError):
            registry.get_stt()
