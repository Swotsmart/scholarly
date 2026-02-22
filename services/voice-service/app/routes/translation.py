# =============================================================================
# SCHOLARLY VOICE SERVICE — Translate & Speak Endpoint
# POST /api/v1/tts/translate-and-speak
# =============================================================================
#
# Pipeline:
#
#   English text ──► Claude translates ──► Target language text ──► Kokoro TTS
#                                                                      │
#                    ◄── { translated_text, audio_base64, timestamps } ◄┘
#
# This endpoint chains two AI capabilities:
#   1. Translation via the Anthropic Claude API (text → text)
#   2. Synthesis via Kokoro TTS (text → audio)
#
# The translation step is handled server-side because:
#   - It ensures the translated text is phonetically clean for TTS
#   - It can apply age-appropriate vocabulary constraints
#   - It returns the translated text alongside audio (for subtitles/karaoke)
#   - The learner sees both the source and target text
#
# Supported languages (Kokoro v1.0):
#   en-us, en-gb, fr-fr, es-es, ja-jp, zh-cn, hi-in, it-it, pt-br, ko-kr
#
# Dependencies:
#   - httpx (async HTTP client for Claude API)
#   - Existing Kokoro TTS provider (providers/kokoro_provider.py)
#   - ANTHROPIC_API_KEY environment variable
# =============================================================================

from __future__ import annotations

import json
import logging
import time
from enum import Enum
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.config import Settings
from app.dependencies import get_registry, get_settings
from app.routes.health import REQUEST_COUNT, REQUEST_LATENCY
from providers.base import ProviderError
from providers.registry import ProviderRegistry, RoutingFilters

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/tts", tags=["tts", "translation"])


# =============================================================================
# Section 1: Language & Voice Mapping
# =============================================================================
# Kokoro uses a language-code prefix on voice IDs:
#   a = American English, b = British English, e = Spanish,
#   f = French, h = Hindi, i = Italian, j = Japanese,
#   k = Korean, p = Portuguese, z = Chinese (Mandarin)
#
# Each language has a default voice selected for clarity and warmth —
# qualities that matter for educational narration.
# =============================================================================

class TargetLanguage(str, Enum):
    """All languages supported by Kokoro TTS v1.0."""
    ENGLISH_US = "en-us"
    ENGLISH_GB = "en-gb"
    FRENCH = "fr-fr"
    SPANISH = "es-es"
    JAPANESE = "ja-jp"
    CHINESE = "zh-cn"
    HINDI = "hi-in"
    ITALIAN = "it-it"
    PORTUGUESE = "pt-br"
    KOREAN = "ko-kr"


# Maps target language → Kokoro voice ID prefix + default voice + all voices
LANGUAGE_VOICE_MAP: dict[str, dict[str, Any]] = {
    "en-us": {
        "prefix": "a",
        "default_voice": "af_bella",
        "display_name": "English (US)",
        "voices": [
            {"id": "af_alloy", "name": "Alloy", "gender": "female"},
            {"id": "af_aoede", "name": "Aoede", "gender": "female"},
            {"id": "af_bella", "name": "Bella", "gender": "female"},
            {"id": "af_heart", "name": "Heart", "gender": "female"},
            {"id": "af_jessica", "name": "Jessica", "gender": "female"},
            {"id": "af_kore", "name": "Kore", "gender": "female"},
            {"id": "af_nicole", "name": "Nicole", "gender": "female"},
            {"id": "af_nova", "name": "Nova", "gender": "female"},
            {"id": "af_river", "name": "River", "gender": "female"},
            {"id": "af_sarah", "name": "Sarah", "gender": "female"},
            {"id": "af_sky", "name": "Sky", "gender": "female"},
            {"id": "am_adam", "name": "Adam", "gender": "male"},
            {"id": "am_echo", "name": "Echo", "gender": "male"},
            {"id": "am_eric", "name": "Eric", "gender": "male"},
            {"id": "am_fenrir", "name": "Fenrir", "gender": "male"},
            {"id": "am_liam", "name": "Liam", "gender": "male"},
            {"id": "am_michael", "name": "Michael", "gender": "male"},
            {"id": "am_onyx", "name": "Onyx", "gender": "male"},
            {"id": "am_puck", "name": "Puck", "gender": "male"},
        ],
    },
    "en-gb": {
        "prefix": "b",
        "default_voice": "bf_alice",
        "display_name": "English (UK)",
        "voices": [
            {"id": "bf_alice", "name": "Alice", "gender": "female"},
            {"id": "bf_emma", "name": "Emma", "gender": "female"},
            {"id": "bf_isabella", "name": "Isabella", "gender": "female"},
            {"id": "bf_lily", "name": "Lily", "gender": "female"},
            {"id": "bm_daniel", "name": "Daniel", "gender": "male"},
            {"id": "bm_fable", "name": "Fable", "gender": "male"},
            {"id": "bm_george", "name": "George", "gender": "male"},
            {"id": "bm_lewis", "name": "Lewis", "gender": "male"},
        ],
    },
    "fr-fr": {
        "prefix": "f",
        "default_voice": "ff_siwis",
        "display_name": "French",
        "voices": [
            {"id": "ff_siwis", "name": "Siwis", "gender": "female"},
        ],
    },
    "es-es": {
        "prefix": "e",
        "default_voice": "ef_dora",
        "display_name": "Spanish",
        "voices": [
            {"id": "ef_dora", "name": "Dora", "gender": "female"},
            {"id": "em_alex", "name": "Alex", "gender": "male"},
            {"id": "em_santa", "name": "Santa", "gender": "male"},
        ],
    },
    "ja-jp": {
        "prefix": "j",
        "default_voice": "jf_alpha",
        "display_name": "Japanese",
        "voices": [
            {"id": "jf_alpha", "name": "Alpha", "gender": "female"},
            {"id": "jf_gongitsune", "name": "Gongitsune", "gender": "female"},
            {"id": "jf_nezumi", "name": "Nezumi", "gender": "female"},
            {"id": "jf_tebukuro", "name": "Tebukuro", "gender": "female"},
            {"id": "jm_beta", "name": "Beta", "gender": "male"},
            {"id": "jm_kumo", "name": "Kumo", "gender": "male"},
        ],
    },
    "zh-cn": {
        "prefix": "z",
        "default_voice": "zf_xiaobei",
        "display_name": "Chinese (Mandarin)",
        "voices": [
            {"id": "zf_xiaobei", "name": "Xiaobei", "gender": "female"},
            {"id": "zf_xiaoni", "name": "Xiaoni", "gender": "female"},
            {"id": "zf_xiaoxiao", "name": "Xiaoxiao", "gender": "female"},
            {"id": "zf_xiaoyi", "name": "Xiaoyi", "gender": "female"},
            {"id": "zm_yunjian", "name": "Yunjian", "gender": "male"},
            {"id": "zm_yunxi", "name": "Yunxi", "gender": "male"},
            {"id": "zm_yunxia", "name": "Yunxia", "gender": "male"},
            {"id": "zm_yunyang", "name": "Yunyang", "gender": "male"},
        ],
    },
    "hi-in": {
        "prefix": "h",
        "default_voice": "hf_alpha",
        "display_name": "Hindi",
        "voices": [
            {"id": "hf_alpha", "name": "Alpha", "gender": "female"},
            {"id": "hf_beta", "name": "Beta", "gender": "female"},
            {"id": "hm_omega", "name": "Omega", "gender": "male"},
            {"id": "hm_psi", "name": "Psi", "gender": "male"},
        ],
    },
    "it-it": {
        "prefix": "i",
        "default_voice": "if_sara",
        "display_name": "Italian",
        "voices": [
            {"id": "if_sara", "name": "Sara", "gender": "female"},
            {"id": "im_nicola", "name": "Nicola", "gender": "male"},
        ],
    },
    "pt-br": {
        "prefix": "p",
        "default_voice": "pf_dora",
        "display_name": "Portuguese (BR)",
        "voices": [
            {"id": "pf_dora", "name": "Dora", "gender": "female"},
            {"id": "pm_alex", "name": "Alex", "gender": "male"},
        ],
    },
    "ko-kr": {
        "prefix": "k",
        "default_voice": "kf_alpha",
        "display_name": "Korean",
        "voices": [
            {"id": "kf_alpha", "name": "Alpha", "gender": "female"},
            {"id": "km_beta", "name": "Beta", "gender": "male"},
        ],
    },
}

# Human-readable names for translation prompts
LANGUAGE_NAMES: dict[str, str] = {
    "en-us": "American English",
    "en-gb": "British English",
    "fr-fr": "French",
    "es-es": "Spanish",
    "ja-jp": "Japanese",
    "zh-cn": "Mandarin Chinese",
    "hi-in": "Hindi",
    "it-it": "Italian",
    "pt-br": "Brazilian Portuguese",
    "ko-kr": "Korean",
}


# =============================================================================
# Section 2: Pydantic Schemas
# =============================================================================

class TranslateAndSpeakRequest(BaseModel):
    """Request to translate text and synthesise as speech."""

    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Source text to translate and speak.",
        examples=["The cat sat on the mat."],
    )
    source_language: str = Field(
        default="auto",
        description=(
            "Source language code (e.g., 'en-us'). "
            "Set to 'auto' for automatic detection via Claude."
        ),
    )
    target_language: TargetLanguage = Field(
        ...,
        description="Target language to translate into and synthesise.",
        examples=["fr-fr"],
    )
    voice_id: Optional[str] = Field(
        default=None,
        description=(
            "Kokoro voice ID for the target language. "
            "If omitted, the default voice for the target language is used."
        ),
    )
    speed: float = Field(
        default=1.0,
        ge=0.5,
        le=2.0,
        description="Playback speed multiplier (0.5–2.0).",
    )
    word_timestamps: bool = Field(
        default=True,
        description="Include per-word timestamps for karaoke sync.",
    )
    age_group: Optional[str] = Field(
        default=None,
        description=(
            "Learner age group ('3-5', '5-7', '7-9', '9-12', 'adult'). "
            "When set, Claude uses age-appropriate vocabulary in the translation."
        ),
    )
    output_format: str = Field(
        default="wav",
        description="Audio output format: 'wav', 'mp3', 'opus'.",
    )


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    confidence: Optional[float] = None


class CostBreakdown(BaseModel):
    translation_cost_usd: float = Field(description="Claude API cost for translation.")
    synthesis_cost_usd: float = Field(description="Kokoro TTS cost (self-hosted).")
    total_cost_usd: float = Field(description="Total cost.")


class TranslateAndSpeakResponse(BaseModel):
    """Response containing translation + synthesised audio."""

    source_text: str = Field(description="Original input text.")
    source_language: str = Field(description="Detected or specified source language.")
    translated_text: str = Field(description="Text translated into the target language.")
    target_language: str = Field(description="Target language code.")
    transliteration: Optional[str] = Field(
        default=None,
        description=(
            "Romanised transliteration for non-Latin scripts "
            "(Japanese, Chinese, Korean, Hindi)."
        ),
    )
    audio_base64: str = Field(description="Base64-encoded audio in the requested format.")
    audio_format: str = Field(description="Audio format: wav, mp3, opus.")
    duration_seconds: float = Field(description="Audio duration in seconds.")
    voice_id: str = Field(description="Kokoro voice ID used for synthesis.")
    word_timestamps: Optional[list[WordTimestamp]] = Field(
        default=None,
        description="Per-word timestamps for karaoke sync.",
    )
    cost: CostBreakdown = Field(description="Cost breakdown for the request.")


class SupportedLanguagesResponse(BaseModel):
    languages: list[LanguageInfo]


class LanguageInfo(BaseModel):
    code: str
    display_name: str
    voice_count: int
    default_voice: str
    voices: list[dict[str, str]]


# =============================================================================
# Section 3: Translation via Claude
# =============================================================================

TRANSLATION_SYSTEM_PROMPT = """You are a professional translator for an educational platform used by children learning to read. Your translations must be:

1. ACCURATE — faithful to the meaning of the source text
2. NATURAL — reads like native-speaker text, not machine translation
3. AGE-APPROPRIATE — vocabulary and sentence structure suitable for the specified age group
4. TTS-FRIENDLY — avoid abbreviations, symbols, or formatting that would confuse a text-to-speech engine

Respond ONLY with a JSON object in this exact format:
{
  "translated_text": "the translation",
  "source_language": "detected source language code",
  "transliteration": "romanised version (only for non-Latin scripts, otherwise null)"
}

Do not include any explanation, preamble, or markdown formatting. Just the JSON object."""


async def translate_text(
    text: str,
    source_language: str,
    target_language: str,
    age_group: Optional[str],
    settings: Settings,
) -> dict[str, Any]:
    """Translate text using Claude API.

    Returns dict with keys: translated_text, source_language, transliteration
    """
    target_name = LANGUAGE_NAMES.get(target_language, target_language)
    source_hint = (
        f"The source language is {LANGUAGE_NAMES.get(source_language, source_language)}."
        if source_language != "auto"
        else "Detect the source language automatically."
    )
    age_hint = (
        f"The learner is aged {age_group}. Use simple, age-appropriate vocabulary."
        if age_group
        else ""
    )

    user_prompt = f"""Translate the following text into {target_name}.
{source_hint}
{age_hint}

Text to translate:
{text}"""

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": settings.anthropic_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": "claude-sonnet-4-5-20250929",
                "max_tokens": 2000,
                "system": TRANSLATION_SYSTEM_PROMPT,
                "messages": [{"role": "user", "content": user_prompt}],
            },
        )

    if response.status_code != 200:
        logger.error(f"Claude API error: {response.status_code} {response.text}")
        raise HTTPException(
            status_code=502,
            detail=f"Translation service returned {response.status_code}",
        )

    data = response.json()
    content = data["content"][0]["text"]

    # Parse JSON response from Claude
    try:
        # Strip potential markdown fences
        clean = content.strip()
        if clean.startswith("```"):
            clean = clean.split("\n", 1)[1].rsplit("```", 1)[0]
        result = json.loads(clean)
    except json.JSONDecodeError:
        logger.error(f"Failed to parse Claude translation response: {content}")
        raise HTTPException(
            status_code=502,
            detail="Translation service returned invalid response",
        )

    return {
        "translated_text": result["translated_text"],
        "source_language": result.get("source_language", source_language),
        "transliteration": result.get("transliteration"),
    }


# =============================================================================
# Section 4: TTS Synthesis Helper
# =============================================================================

async def synthesise_translated_text(
    text: str,
    language: str,
    voice_id: str,
    speed: float,
    registry: ProviderRegistry,
) -> dict[str, Any]:
    """Synthesise text via the Kokoro TTS provider directly.

    Calls the provider through dependency injection rather than looping
    back through HTTP. This avoids three production issues:

    1. Worker pool deadlock: HTTP loopback consumes a Uvicorn worker to
       serve its own internal request. Under load, all workers can block
       waiting on themselves.
    2. Circuit breaker cascade: the HTTP path goes through the registry's
       circuit breaker. Synthesis failures trip the breaker and take down
       ALL TTS endpoints, not just translation.
    3. Unnecessary overhead: JSON serialisation, TCP roundtrip, and HTTP
       parsing for what is fundamentally a function call.
    """
    try:
        # Route to the best available TTS provider (same logic as /synthesize)
        filters = RoutingFilters(language=language)
        provider = registry.get_tts(filters)

        result = await provider.synthesize(
            text=text,
            voice_id=voice_id,
            language=language,
            pace=speed,
        )

        # Encode audio to base64 (matching what /synthesize returns)
        import base64
        audio_b64 = base64.b64encode(result.audio_data).decode("ascii")

        # Build word timestamps as dicts
        timestamps = [
            {
                "word": wt.word,
                "start": wt.start,
                "end": wt.end,
                "confidence": wt.confidence,
            }
            for wt in result.word_timestamps
        ]

        return {
            "audio_base64": audio_b64,
            "duration_seconds": result.duration_seconds,
            "word_timestamps": timestamps,
        }

    except ProviderError as e:
        # Log but do NOT call registry.record_failure() — translation
        # failures should not trip the circuit breaker for all TTS
        logger.error(f"TTS synthesis failed for translation: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"TTS synthesis failed: {e}",
        )
    except Exception as e:
        logger.error(f"Unexpected TTS error during translation: {e}")
        raise HTTPException(
            status_code=502,
            detail=f"TTS synthesis failed: {str(e)}",
        )


# =============================================================================
# Section 5: Route Handlers
# =============================================================================

@router.post(
    "/translate-and-speak",
    response_model=TranslateAndSpeakResponse,
    summary="Translate text and synthesise as speech",
    description=(
        "Translates input text to the target language using Claude, then "
        "synthesises the translated text as audio using Kokoro TTS with a "
        "native voice for that language. Returns both the translated text "
        "and the audio, enabling subtitle/karaoke display alongside playback."
    ),
)
async def translate_and_speak(
    request: TranslateAndSpeakRequest,
    settings: Settings = Depends(get_settings),
    registry: ProviderRegistry = Depends(get_registry),
) -> TranslateAndSpeakResponse:
    """The full translate → synthesise pipeline."""

    start = time.monotonic()
    endpoint = "/tts/translate-and-speak"
    REQUEST_COUNT.labels(endpoint=endpoint, method="POST", status="200").inc()

    target_lang = request.target_language.value

    # Validate voice ID matches target language
    lang_config = LANGUAGE_VOICE_MAP.get(target_lang)
    if not lang_config:
        raise HTTPException(status_code=400, detail=f"Unsupported target language: {target_lang}")

    voice_id = request.voice_id or lang_config["default_voice"]

    # Validate the voice belongs to the target language
    valid_voice_ids = {v["id"] for v in lang_config["voices"]}
    if voice_id not in valid_voice_ids:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Voice '{voice_id}' is not available for {lang_config['display_name']}. "
                f"Available voices: {', '.join(sorted(valid_voice_ids))}"
            ),
        )

    # ── Step 1: Translate ──
    logger.info(f"Translating to {target_lang}: {request.text[:80]}...")

    translation = await translate_text(
        text=request.text,
        source_language=request.source_language,
        target_language=target_lang,
        age_group=request.age_group,
        settings=settings,
    )

    translated_text = translation["translated_text"]
    source_language = translation["source_language"]
    transliteration = translation.get("transliteration")

    logger.info(f"Translation complete: {translated_text[:80]}...")

    # ── Step 2: Synthesise ──
    logger.info(f"Synthesising with voice {voice_id}...")

    tts_result = await synthesise_translated_text(
        text=translated_text,
        language=target_lang,
        voice_id=voice_id,
        speed=request.speed,
        registry=registry,
    )

    # ── Step 3: Build response ──
    # Cost calculation
    # Claude: ~$0.003/1K input tokens + $0.015/1K output tokens (Sonnet)
    # Rough estimate: 1 char ≈ 0.3 tokens
    input_tokens = (len(request.text) + 200) * 0.3  # text + system prompt overhead
    output_tokens = len(translated_text) * 0.3
    translation_cost = (input_tokens / 1000) * 0.003 + (output_tokens / 1000) * 0.015
    synthesis_cost = (len(translated_text) / 1000) * 0.002  # Self-hosted rate

    # Parse word timestamps from TTS result
    timestamps = None
    if request.word_timestamps and tts_result.get("word_timestamps"):
        timestamps = [
            WordTimestamp(
                word=wt.get("word", ""),
                start=wt.get("start", 0.0),
                end=wt.get("end", 0.0),
                confidence=wt.get("confidence"),
            )
            for wt in tts_result["word_timestamps"]
        ]

    duration = time.monotonic() - start
    REQUEST_LATENCY.labels(endpoint=endpoint, method="POST").observe(duration)

    logger.info(
        f"Translate-and-speak complete: {source_language} → {target_lang}, "
        f"{len(translated_text)} chars, {tts_result.get('duration_seconds', 0):.1f}s audio, "
        f"total latency {duration:.2f}s"
    )

    return TranslateAndSpeakResponse(
        source_text=request.text,
        source_language=source_language,
        translated_text=translated_text,
        target_language=target_lang,
        transliteration=transliteration,
        audio_base64=tts_result["audio_base64"],
        audio_format=request.output_format,
        duration_seconds=tts_result.get("duration_seconds", 0.0),
        voice_id=voice_id,
        word_timestamps=timestamps,
        cost=CostBreakdown(
            translation_cost_usd=round(translation_cost, 6),
            synthesis_cost_usd=round(synthesis_cost, 6),
            total_cost_usd=round(translation_cost + synthesis_cost, 6),
        ),
    )


# =============================================================================
# GET /api/v1/tts/languages — List supported languages and voices
# =============================================================================

@router.get(
    "/languages",
    response_model=SupportedLanguagesResponse,
    summary="List supported languages and voices",
    description="Returns all languages supported by the translate-and-speak endpoint with their available voices.",
)
async def list_languages() -> SupportedLanguagesResponse:
    """Return all supported languages with their voice options."""
    languages = []
    for code, config in LANGUAGE_VOICE_MAP.items():
        languages.append(
            LanguageInfo(
                code=code,
                display_name=config["display_name"],
                voice_count=len(config["voices"]),
                default_voice=config["default_voice"],
                voices=config["voices"],
            )
        )
    return SupportedLanguagesResponse(languages=languages)


# =============================================================================
# Section 6: Integration Notes
# =============================================================================
#
# To add this to the deployed Voice Service:
#
# 1. Add ANTHROPIC_API_KEY to app/config.py Settings:
#      anthropic_api_key: str = ""
#
# 2. Add to .env / Azure environment:
#      ANTHROPIC_API_KEY=sk-ant-...
#
# 3. Mount the router in app/main.py:
#      from app.routes.translation import router as translation_router
#      app.include_router(translation_router)
#
# 4. Add httpx to pyproject.toml dependencies (already present)
#
# 5. Test:
#      curl -X POST http://localhost:8100/api/v1/tts/translate-and-speak \
#        -H "Content-Type: application/json" \
#        -d '{
#          "text": "The cat sat on the mat.",
#          "target_language": "fr-fr",
#          "age_group": "5-7"
#        }'
#
# Expected response:
#   {
#     "source_text": "The cat sat on the mat.",
#     "source_language": "en-us",
#     "translated_text": "Le chat s'est assis sur le tapis.",
#     "target_language": "fr-fr",
#     "transliteration": null,
#     "audio_base64": "UklGRi...",
#     "duration_seconds": 2.4,
#     "voice_id": "ff_siwis",
#     "word_timestamps": [...],
#     "cost": {
#       "translation_cost_usd": 0.000450,
#       "synthesis_cost_usd": 0.000066,
#       "total_cost_usd": 0.000516
#     }
#   }
# =============================================================================
