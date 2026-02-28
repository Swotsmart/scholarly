/**
 * Scholarly UC 4.0 — Real-Time Translation Service
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE UNIVERSAL TRANSLATOR — FROM STAR TREK TO EVERY MEETING ROOM
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Picture a meeting between a Japanese sales team in Tokyo and a German
 * engineering team in Munich. Without translation, someone fumbles through
 * a second language, nuance is lost, and decisions suffer. With real-time
 * translation, each participant speaks in their native tongue and hears
 * every other participant in theirs — as naturally as if everyone shared
 * a language.
 *
 * The system has three operating modes:
 *
 *   1. TEXT TRANSLATION — The simplest mode. A message arrives in one
 *      language, is translated, and delivered in another. Used for
 *      omnichannel chat, email, SMS, WhatsApp messages.
 *
 *   2. LIVE CAPTION TRANSLATION — During a video call or meeting, the
 *      live transcription stream (from the Meeting Intelligence
 *      integration) is translated in real time and displayed as
 *      subtitles in the participant's chosen language.
 *
 *   3. SPEECH-TO-SPEECH — The full pipeline: spoken audio is transcribed
 *      (STT), the text is translated, and the translation is synthesised
 *      back to speech (TTS) in the target language. This is the "Star
 *      Trek Universal Translator" mode, used for voice calls where
 *      participants don't share a language.
 *
 * Provider abstraction:
 *   - Google Cloud Translation (v3 / Advanced)
 *   - DeepL API (highest quality for European languages)
 *   - Azure Cognitive Services Translator
 *   - Self-hosted (LibreTranslate, Argos Translate, NLLB)
 *
 * The translation service integrates with:
 *   - Meeting Intelligence Integration (live caption translation)
 *   - Omnichannel Inbox (message translation)
 *   - Telephony / Contact Centre (voice call translation)
 *   - Voice Service (self-hosted TTS for translated speech output)
 *
 * REST endpoints (mounted via enhancement router):
 *
 *   POST   /translate/text             Translate text
 *   POST   /translate/detect           Detect language
 *   POST   /translate/speech           Speech-to-speech (audio in → audio out)
 *   GET    /translate/languages        List supported languages
 *   GET    /translate/sessions         List active translation sessions
 *   POST   /translate/sessions/start   Start a live translation session
 *   POST   /translate/sessions/stop    Stop a live translation session
 *   GET    /translate/config           Get translation config
 *   PUT    /translate/config           Update translation config
 *
 * Event prefix: translation:*
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { PluginContext } from '../../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────

export interface TranslationConfig {
  /** Primary translation provider */
  provider: 'google' | 'deepl' | 'azure' | 'self-hosted';
  /** API credentials */
  apiKey: string;
  /** Base URL for self-hosted provider */
  baseUrl?: string;
  /** Azure region (for Azure Translator) */
  region?: string;
  /** Default source language ('auto' for detection) */
  defaultSourceLanguage: string;
  /** Default target language */
  defaultTargetLanguage: string;
  /** Enable real-time call translation */
  enableSpeechToSpeech: boolean;
  /** Enable omnichannel message translation */
  enableMessageTranslation: boolean;
  /** Enable live caption translation in meetings */
  enableCaptionTranslation: boolean;
  /** TTS provider for speech output (uses platform voice service) */
  ttsEndpoint?: string;
  /** Cache translations for repeated phrases (reduces API cost) */
  enableCache: boolean;
  /** Maximum text length per translation call */
  maxTextLength: number;
  /** Formality preference for DeepL: 'default' | 'more' | 'less' */
  formality: string;
}

export interface TranslationResult {
  id: string;
  sourceText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  detectedLanguage?: string;
  confidence?: number;
  provider: string;
  latencyMs: number;
  cached: boolean;
  timestamp: Date;
}

export interface LanguageDetectionResult {
  text: string;
  detectedLanguage: string;
  confidence: number;
  alternatives?: { language: string; confidence: number }[];
}

export interface SpeechTranslationResult {
  /** Transcribed source text */
  sourceText: string;
  /** Translated text */
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  /** Synthesised audio of the translation (base64) */
  audioBase64?: string;
  audioMimeType?: string;
  /** Timing */
  sttLatencyMs: number;
  translationLatencyMs: number;
  ttsLatencyMs: number;
  totalLatencyMs: number;
}

/** A live translation session for a call or meeting */
export interface TranslationSession {
  id: string;
  /** Room or call ID */
  targetId: string;
  targetType: 'room' | 'call' | 'conversation';
  /** Participant language map: userId → preferred language */
  participantLanguages: Map<string, string>;
  /** Active translation pairs: "en→ja", "ja→en", etc. */
  activePairs: Set<string>;
  /** Whether the session is active */
  isActive: boolean;
  /** Mode */
  mode: 'caption' | 'speech-to-speech' | 'text';
  /** Stats */
  translationCount: number;
  totalLatencyMs: number;
  startedAt: Date;
  tenantId: string;
}

// ─── Supported Languages (subset — providers support more) ──────────

const SUPPORTED_LANGUAGES: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German',
  it: 'Italian', pt: 'Portuguese', nl: 'Dutch', ru: 'Russian',
  zh: 'Chinese (Simplified)', 'zh-TW': 'Chinese (Traditional)',
  ja: 'Japanese', ko: 'Korean', ar: 'Arabic', hi: 'Hindi',
  th: 'Thai', vi: 'Vietnamese', id: 'Indonesian', ms: 'Malay',
  tr: 'Turkish', pl: 'Polish', sv: 'Swedish', da: 'Danish',
  no: 'Norwegian', fi: 'Finnish', el: 'Greek', cs: 'Czech',
  ro: 'Romanian', hu: 'Hungarian', uk: 'Ukrainian', he: 'Hebrew',
  bn: 'Bengali', ta: 'Tamil', te: 'Telugu', mr: 'Marathi',
};

// ─── Translation Provider Interface ─────────────────────────────────

interface TranslationProvider {
  translate(text: string, sourceLang: string, targetLang: string): Promise<{ translated: string; detectedSource?: string }>;
  detectLanguage(text: string): Promise<LanguageDetectionResult>;
  supportedLanguages(): string[];
}

// ─── Provider Implementations ───────────────────────────────────────

class GoogleTranslateProvider implements TranslationProvider {
  constructor(private apiKey: string) {}

  async translate(text: string, sourceLang: string, targetLang: string): Promise<{ translated: string; detectedSource?: string }> {
    const body = {
      q: text,
      source: sourceLang === 'auto' ? undefined : sourceLang,
      target: targetLang,
      format: 'text',
    };

    const resp = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!resp.ok) throw new Error(`Google Translate error: ${resp.status}`);
    const data = await resp.json() as any;
    const translation = data.data?.translations?.[0];
    return {
      translated: translation?.translatedText || '',
      detectedSource: translation?.detectedSourceLanguage,
    };
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    const resp = await fetch(`https://translation.googleapis.com/language/translate/v2/detect?key=${this.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    });

    if (!resp.ok) throw new Error(`Google Detect error: ${resp.status}`);
    const data = await resp.json() as any;
    const detections = data.data?.detections?.[0] || [];
    return {
      text,
      detectedLanguage: detections[0]?.language || 'en',
      confidence: detections[0]?.confidence || 0,
      alternatives: detections.slice(1).map((d: any) => ({ language: d.language, confidence: d.confidence })),
    };
  }

  supportedLanguages(): string[] { return Object.keys(SUPPORTED_LANGUAGES); }
}

class DeepLProvider implements TranslationProvider {
  constructor(private apiKey: string) {}
  private get baseUrl() { return this.apiKey.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com'; }

  async translate(text: string, sourceLang: string, targetLang: string): Promise<{ translated: string; detectedSource?: string }> {
    const params: Record<string, string> = {
      text, target_lang: targetLang.toUpperCase(),
    };
    if (sourceLang !== 'auto') params.source_lang = sourceLang.toUpperCase();

    const resp = await fetch(`${this.baseUrl}/v2/translate`, {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!resp.ok) throw new Error(`DeepL error: ${resp.status}`);
    const data = await resp.json() as any;
    const t = data.translations?.[0];
    return {
      translated: t?.text || '',
      detectedSource: t?.detected_source_language?.toLowerCase(),
    };
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    const result = await this.translate(text, 'auto', 'EN');
    return {
      text,
      detectedLanguage: result.detectedSource || 'en',
      confidence: 0.95,
    };
  }

  supportedLanguages(): string[] { return ['en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'ru', 'ja', 'zh', 'ko', 'cs', 'da', 'el', 'fi', 'hu', 'id', 'no', 'ro', 'sv', 'tr', 'uk']; }
}

class AzureTranslatorProvider implements TranslationProvider {
  constructor(private apiKey: string, private region: string = 'global') {}

  async translate(text: string, sourceLang: string, targetLang: string): Promise<{ translated: string; detectedSource?: string }> {
    const url = `https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${targetLang}${sourceLang !== 'auto' ? `&from=${sourceLang}` : ''}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Ocp-Apim-Subscription-Region': this.region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ text }]),
    });

    if (!resp.ok) throw new Error(`Azure Translator error: ${resp.status}`);
    const data = await resp.json() as any;
    const t = data[0];
    return {
      translated: t?.translations?.[0]?.text || '',
      detectedSource: t?.detectedLanguage?.language,
    };
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    const resp = await fetch('https://api.cognitive.microsofttranslator.com/detect?api-version=3.0', {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': this.apiKey,
        'Ocp-Apim-Subscription-Region': this.region,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([{ text }]),
    });

    if (!resp.ok) throw new Error(`Azure Detect error: ${resp.status}`);
    const data = await resp.json() as any;
    const d = data[0];
    return {
      text,
      detectedLanguage: d?.language || 'en',
      confidence: d?.score || 0,
      alternatives: d?.alternatives?.map((a: any) => ({ language: a.language, confidence: a.score })),
    };
  }

  supportedLanguages(): string[] { return Object.keys(SUPPORTED_LANGUAGES); }
}

class SelfHostedTranslateProvider implements TranslationProvider {
  constructor(private baseUrl: string) {}

  async translate(text: string, sourceLang: string, targetLang: string): Promise<{ translated: string; detectedSource?: string }> {
    const resp = await fetch(`${this.baseUrl}/translate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text, source: sourceLang === 'auto' ? 'auto' : sourceLang, target: targetLang }),
    });

    if (!resp.ok) throw new Error(`Self-hosted translate error: ${resp.status}`);
    const data = await resp.json() as any;
    return { translated: data.translatedText || data.translated || '', detectedSource: data.detectedLanguage?.language };
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    const resp = await fetch(`${this.baseUrl}/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: text }),
    });

    if (!resp.ok) throw new Error(`Self-hosted detect error: ${resp.status}`);
    const data = await resp.json() as any;
    const best = Array.isArray(data) ? data[0] : data;
    return { text, detectedLanguage: best?.language || 'en', confidence: best?.confidence || 0 };
  }

  supportedLanguages(): string[] { return Object.keys(SUPPORTED_LANGUAGES); }
}

// ─── Translation Service ────────────────────────────────────────────

const DEFAULT_CONFIG: TranslationConfig = {
  provider: 'self-hosted',
  apiKey: '',
  defaultSourceLanguage: 'auto',
  defaultTargetLanguage: 'en',
  enableSpeechToSpeech: true,
  enableMessageTranslation: true,
  enableCaptionTranslation: true,
  enableCache: true,
  maxTextLength: 10000,
  formality: 'default',
};

export class RealTimeTranslationService {
  private config: TranslationConfig;
  private provider!: TranslationProvider;
  /** Translation cache: "sourceText:sourceLang:targetLang" → result */
  private cache: Map<string, { translated: string; timestamp: number }> = new Map();
  private cacheTtlMs = 3600000; // 1 hour
  /** Active translation sessions */
  private sessions: Map<string, TranslationSession> = new Map();
  /** Stats */
  private stats = { totalTranslations: 0, totalCacheHits: 0, averageLatencyMs: 0, totalLatencyMs: 0 };

  constructor(private ctx: PluginContext, config?: Partial<TranslationConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initProvider();
  }

  private initProvider(): void {
    switch (this.config.provider) {
      case 'google': this.provider = new GoogleTranslateProvider(this.config.apiKey); break;
      case 'deepl': this.provider = new DeepLProvider(this.config.apiKey); break;
      case 'azure': this.provider = new AzureTranslatorProvider(this.config.apiKey, this.config.region); break;
      case 'self-hosted': this.provider = new SelfHostedTranslateProvider(this.config.baseUrl || 'http://localhost:5000'); break;
    }
  }

  // ─── Event Subscriptions ──────────────────────────────────────────

  subscribeToEvents(): void {
    // Live caption translation — intercept transcript segments
    this.ctx.bus.on('meeting-intel:segment-added', async (evt: any) => {
      if (!this.config.enableCaptionTranslation) return;
      const session = this.findSessionForTarget(evt.roomId, 'room');
      if (!session) return;
      await this.translateSegmentForSession(session, evt.segment);
    });

    // Omnichannel message translation — auto-translate inbound messages
    this.ctx.bus.on('omni:message-received', async (evt: any) => {
      if (!this.config.enableMessageTranslation) return;
      const session = this.findSessionForTarget(evt.conversationId, 'conversation');
      if (!session) return;
      // Translate will be handled by the message processing pipeline
      this.ctx.bus.emit('translation:message-translate-requested', {
        conversationId: evt.conversationId,
        messageId: evt.messageId,
        tenantId: evt.tenantId,
      } as any);
    });

    // Cache cleanup
    setInterval(() => this.cleanupCache(), 300000);

    this.ctx.logger.info('[Translation] Event subscriptions active — captions, messages, speech-to-speech');
  }

  // ─── Core Translation ─────────────────────────────────────────────

  async translateText(text: string, targetLang: string, sourceLang: string = 'auto'): Promise<TranslationResult> {
    if (!text || text.trim().length === 0) {
      return this.emptyResult(text, sourceLang, targetLang);
    }

    // Truncate if too long
    const truncated = text.slice(0, this.config.maxTextLength);

    // Check cache
    const cacheKey = `${truncated}:${sourceLang}:${targetLang}`;
    if (this.config.enableCache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.timestamp + this.cacheTtlMs > Date.now()) {
        this.stats.totalCacheHits++;
        return {
          id: uuidv4(), sourceText: truncated, translatedText: cached.translated,
          sourceLanguage: sourceLang, targetLanguage: targetLang,
          provider: this.config.provider, latencyMs: 0, cached: true, timestamp: new Date(),
        };
      }
    }

    const start = Date.now();
    const result = await this.provider.translate(truncated, sourceLang, targetLang);
    const latencyMs = Date.now() - start;

    // Update stats
    this.stats.totalTranslations++;
    this.stats.totalLatencyMs += latencyMs;
    this.stats.averageLatencyMs = this.stats.totalLatencyMs / this.stats.totalTranslations;

    // Cache
    if (this.config.enableCache) {
      this.cache.set(cacheKey, { translated: result.translated, timestamp: Date.now() });
    }

    const translationResult: TranslationResult = {
      id: uuidv4(),
      sourceText: truncated,
      translatedText: result.translated,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      detectedLanguage: result.detectedSource,
      provider: this.config.provider,
      latencyMs,
      cached: false,
      timestamp: new Date(),
    };

    this.ctx.bus.emit('translation:text-translated', {
      id: translationResult.id, sourceLang, targetLang,
      latencyMs, provider: this.config.provider,
    } as any);

    return translationResult;
  }

  async detectLanguage(text: string): Promise<LanguageDetectionResult> {
    return this.provider.detectLanguage(text);
  }

  /**
   * Speech-to-Speech translation pipeline:
   *   1. STT: Audio → source text (via platform's voice service)
   *   2. Translate: source text → translated text
   *   3. TTS: translated text → audio (via platform's voice service)
   */
  async translateSpeech(
    audioBase64: string,
    audioMimeType: string,
    targetLang: string,
    sourceLang: string = 'auto',
  ): Promise<SpeechTranslationResult> {
    const totalStart = Date.now();

    // Step 1: STT — transcribe the audio
    const sttStart = Date.now();
    let sourceText = '';
    try {
      const sttResp = await fetch(this.config.ttsEndpoint?.replace('/tts/', '/stt/') || 'http://localhost:8000/stt/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio: audioBase64, mime_type: audioMimeType, language: sourceLang === 'auto' ? undefined : sourceLang }),
      });
      if (sttResp.ok) {
        const sttData = await sttResp.json() as any;
        sourceText = sttData.text || sttData.transcript || '';
      }
    } catch (err: any) {
      this.ctx.logger.error(`[Translation] STT failed: ${err.message}`);
    }
    const sttLatencyMs = Date.now() - sttStart;

    if (!sourceText) {
      return { sourceText: '', translatedText: '', sourceLanguage: sourceLang, targetLanguage: targetLang, sttLatencyMs, translationLatencyMs: 0, ttsLatencyMs: 0, totalLatencyMs: Date.now() - totalStart };
    }

    // Step 2: Translate
    const transStart = Date.now();
    const translation = await this.translateText(sourceText, targetLang, sourceLang);
    const translationLatencyMs = Date.now() - transStart;

    // Step 3: TTS — synthesise translated text
    const ttsStart = Date.now();
    let audioOut: string | undefined;
    let audioOutMime: string | undefined;
    try {
      const ttsResp = await fetch(this.config.ttsEndpoint || 'http://localhost:8000/tts/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: translation.translatedText, language: targetLang, output_format: 'mp3' }),
      });
      if (ttsResp.ok) {
        const ttsData = await ttsResp.json() as any;
        audioOut = ttsData.audio || ttsData.audio_base64;
        audioOutMime = ttsData.mime_type || 'audio/mp3';
      }
    } catch (err: any) {
      this.ctx.logger.error(`[Translation] TTS failed: ${err.message}`);
    }
    const ttsLatencyMs = Date.now() - ttsStart;

    const result: SpeechTranslationResult = {
      sourceText,
      translatedText: translation.translatedText,
      sourceLanguage: translation.detectedLanguage || sourceLang,
      targetLanguage: targetLang,
      audioBase64: audioOut,
      audioMimeType: audioOutMime,
      sttLatencyMs,
      translationLatencyMs,
      ttsLatencyMs,
      totalLatencyMs: Date.now() - totalStart,
    };

    this.ctx.bus.emit('translation:speech-translated', {
      sourceLang: result.sourceLanguage, targetLang,
      totalLatencyMs: result.totalLatencyMs,
    } as any);

    return result;
  }

  // ─── Session Management ───────────────────────────────────────────

  startSession(targetId: string, targetType: TranslationSession['targetType'], mode: TranslationSession['mode'], participantLanguages: Record<string, string>, tenantId: string): TranslationSession {
    const session: TranslationSession = {
      id: uuidv4(),
      targetId,
      targetType,
      participantLanguages: new Map(Object.entries(participantLanguages)),
      activePairs: new Set<string>(),
      isActive: true,
      mode,
      translationCount: 0,
      totalLatencyMs: 0,
      startedAt: new Date(),
      tenantId,
    };

    // Compute translation pairs
    const langs = [...new Set(session.participantLanguages.values())];
    for (const from of langs) {
      for (const to of langs) {
        if (from !== to) session.activePairs.add(`${from}→${to}`);
      }
    }

    this.sessions.set(session.id, session);

    this.ctx.bus.emit('translation:session-started', {
      sessionId: session.id, targetId, targetType, mode,
      pairs: [...session.activePairs], tenantId,
    } as any);

    this.ctx.logger.info(`[Translation] Session started: ${session.id} (${mode}) for ${targetType}:${targetId} — pairs: ${[...session.activePairs].join(', ')}`);
    return session;
  }

  stopSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.isActive = false;

    this.ctx.bus.emit('translation:session-stopped', {
      sessionId, targetId: session.targetId,
      translationCount: session.translationCount,
      avgLatencyMs: session.translationCount > 0 ? Math.round(session.totalLatencyMs / session.translationCount) : 0,
      tenantId: session.tenantId,
    } as any);

    return true;
  }

  setParticipantLanguage(sessionId: string, userId: string, language: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.participantLanguages.set(userId, language);

    // Recompute pairs
    session.activePairs.clear();
    const langs = [...new Set(session.participantLanguages.values())];
    for (const from of langs) {
      for (const to of langs) {
        if (from !== to) session.activePairs.add(`${from}→${to}`);
      }
    }
    return true;
  }

  private findSessionForTarget(targetId: string, targetType: string): TranslationSession | undefined {
    for (const session of this.sessions.values()) {
      if (session.targetId === targetId && session.targetType === targetType && session.isActive) return session;
    }
    return undefined;
  }

  private async translateSegmentForSession(session: TranslationSession, segment: any): Promise<void> {
    const speakerLang = session.participantLanguages.get(segment.speaker);

    for (const [userId, targetLang] of session.participantLanguages) {
      if (userId === segment.speaker) continue;
      if (targetLang === speakerLang) continue;

      const start = Date.now();
      const result = await this.translateText(segment.text, targetLang, speakerLang || 'auto');
      const latency = Date.now() - start;

      session.translationCount++;
      session.totalLatencyMs += latency;

      this.ctx.bus.emit('translation:caption-translated', {
        sessionId: session.id,
        targetUserId: userId,
        originalText: segment.text,
        translatedText: result.translatedText,
        speaker: segment.speaker,
        targetLang,
        latencyMs: latency,
      } as any);
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private emptyResult(text: string, sourceLang: string, targetLang: string): TranslationResult {
    return { id: uuidv4(), sourceText: text, translatedText: text, sourceLanguage: sourceLang, targetLanguage: targetLang, provider: this.config.provider, latencyMs: 0, cached: false, timestamp: new Date() };
  }

  private cleanupCache(): void {
    const cutoff = Date.now() - this.cacheTtlMs;
    for (const [key, val] of this.cache) {
      if (val.timestamp < cutoff) this.cache.delete(key);
    }
  }

  getSupportedLanguages(): Record<string, string> { return SUPPORTED_LANGUAGES; }
  getConfig(): TranslationConfig { return { ...this.config, apiKey: '***' }; }
  updateConfig(updates: Partial<TranslationConfig>): void { Object.assign(this.config, updates); this.initProvider(); }
  getStats() { return { ...this.stats, cacheSize: this.cache.size, activeSessions: this.sessions.size }; }

  // ─── REST Router ──────────────────────────────────────────────────

  createRouter(): Router {
    const r = Router();

    r.post('/translate/text', async (req: Request, res: Response) => {
      const { text, targetLanguage, sourceLanguage } = req.body;
      if (!text || !targetLanguage) return res.status(400).json({ error: 'text and targetLanguage required' });
      try {
        const result = await this.translateText(text, targetLanguage, sourceLanguage || 'auto');
        res.json(result);
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    r.post('/translate/detect', async (req: Request, res: Response) => {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: 'text required' });
      try {
        const result = await this.detectLanguage(text);
        res.json(result);
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    r.post('/translate/speech', async (req: Request, res: Response) => {
      const { audio, mimeType, targetLanguage, sourceLanguage } = req.body;
      if (!audio || !targetLanguage) return res.status(400).json({ error: 'audio and targetLanguage required' });
      try {
        const result = await this.translateSpeech(audio, mimeType || 'audio/wav', targetLanguage, sourceLanguage || 'auto');
        res.json(result);
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    r.get('/translate/languages', (_req: Request, res: Response) => {
      res.json({ languages: SUPPORTED_LANGUAGES, provider: this.config.provider });
    });

    r.get('/translate/sessions', (_req: Request, res: Response) => {
      const sessions = [...this.sessions.values()].map(s => ({
        ...s, participantLanguages: Object.fromEntries(s.participantLanguages),
        activePairs: [...s.activePairs],
      }));
      res.json({ sessions });
    });

    r.post('/translate/sessions/start', (req: Request, res: Response) => {
      const { targetId, targetType, mode, participantLanguages, tenantId } = req.body;
      if (!targetId || !participantLanguages) return res.status(400).json({ error: 'targetId and participantLanguages required' });
      const session = this.startSession(targetId, targetType || 'room', mode || 'caption', participantLanguages, tenantId || '__default__');
      res.status(201).json({ ...session, participantLanguages: Object.fromEntries(session.participantLanguages), activePairs: [...session.activePairs] });
    });

    r.post('/translate/sessions/stop', (req: Request, res: Response) => {
      const { sessionId } = req.body;
      if (!this.stopSession(sessionId)) return res.status(404).json({ error: 'Session not found' });
      res.json({ stopped: true });
    });

    r.get('/translate/config', (_req: Request, res: Response) => { res.json(this.getConfig()); });
    r.put('/translate/config', (req: Request, res: Response) => { this.updateConfig(req.body); res.json(this.getConfig()); });
    r.get('/translate/stats', (_req: Request, res: Response) => { res.json(this.getStats()); });

    return r;
  }
}

export default RealTimeTranslationService;
