/**
 * Scholarly Unified Communications 4.0 — AI Transcription Enhancement
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE MULTILINGUAL STENOGRAPHER WITH A PHOTOGRAPHIC MEMORY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The base AI Transcription plugin is a capable stenographer — it hears
 * the recording, identifies speakers, and produces a written transcript.
 * But a great stenographer doesn't just transcribe; they also produce
 * meeting minutes: structured summaries, extracted action items, topic
 * chapters, and key decisions.
 *
 * This enhancement adds two capabilities:
 *
 * 1. Self-Hosted STT Provider (Whisper)
 *    The base plugin supports OpenAI Whisper (cloud API), Azure, and
 *    Deepgram. This adds a self-hosted Whisper adapter that connects to
 *    a locally-deployed Whisper STT service (like Scholarly's FastAPI
 *    voice service). This means: zero per-minute API costs, full data
 *    sovereignty, and no audio leaving the customer's infrastructure.
 *    For a Chekd-ID deployment handling identity verification calls,
 *    keeping audio on-premises isn't just nice — it's often a regulatory
 *    requirement.
 *
 * 2. Meeting Intelligence Pipeline
 *    After transcription completes, the intelligence pipeline produces:
 *    - Structured summary (executive brief + detailed notes)
 *    - Action items with assignees (extracted from conversation context)
 *    - Topic chapters (transcript segmented by discussion topic)
 *    - Key decisions identified in the conversation
 *    - Sentiment overview per speaker
 *    - Follow-up email draft
 *
 *    The intelligence pipeline uses Claude (Anthropic API) by default,
 *    with a configurable provider abstraction so deployments can use
 *    OpenAI, Azure OpenAI, or a self-hosted LLM.
 *
 * REST endpoints added to /api/ai-transcription:
 *   POST /transcriptions/:id/intelligence    — Run intelligence pipeline
 *   GET  /transcriptions/:id/summary         — Get structured summary
 *   GET  /transcriptions/:id/action-items    — Get extracted action items
 *   GET  /transcriptions/:id/chapters        — Get topic chapters
 *   GET  /transcriptions/:id/decisions       — Get key decisions
 *   POST /transcriptions/:id/follow-up-email — Generate follow-up email
 *   GET  /providers                           — List available STT providers
 *   POST /providers/test                      — Test provider connectivity
 *
 * Bus events emitted:
 *   transcription:intelligence-started, transcription:intelligence-completed,
 *   transcription:intelligence-failed, transcription:action-items-extracted,
 *   transcription:summary-generated, transcription:chapters-generated
 */

import { Router } from 'express';
import type { PluginContext } from '../../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────

export interface SelfHostedWhisperConfig {
  /** Base URL of the self-hosted Whisper service (e.g., http://voice-service:8000) */
  baseUrl: string;
  /** API key for the self-hosted service (optional if running in trusted network) */
  apiKey?: string;
  /** Model size to use: tiny, base, small, medium, large-v3 */
  modelSize: 'tiny' | 'base' | 'small' | 'medium' | 'large-v3';
  /** Whether to enable speaker diarization */
  diarizationEnabled: boolean;
  /** Language hint (ISO 639-1 code) or 'auto' for detection */
  language: string;
  /** Connection timeout in milliseconds */
  timeoutMs: number;
  /** Maximum concurrent transcription jobs */
  maxConcurrentJobs: number;
}

export interface IntelligenceConfig {
  /** LLM provider for intelligence pipeline */
  provider: 'anthropic' | 'openai' | 'azure-openai' | 'self-hosted';
  /** API key for the provider */
  apiKey?: string;
  /** Base URL for self-hosted LLM */
  baseUrl?: string;
  /** Model identifier */
  model: string;
  /** Maximum tokens for summary generation */
  maxTokens: number;
  /** Whether to auto-run intelligence after transcription completes */
  autoRunAfterTranscription: boolean;
  /** Which intelligence modules to run */
  enabledModules: IntelligenceModule[];
}

export type IntelligenceModule = 'summary' | 'action-items' | 'chapters' | 'decisions' | 'sentiment' | 'follow-up';

export interface MeetingSummary {
  transcriptionId: string;
  executiveBrief: string;
  detailedNotes: string;
  duration: string;
  participantCount: number;
  speakers: string[];
  generatedAt: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  assignee?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  source: { speakerName: string; timestamp: string; quote: string };
  status: 'pending' | 'acknowledged';
}

export interface TopicChapter {
  id: string;
  title: string;
  summary: string;
  startTimestamp: string;
  endTimestamp: string;
  speakers: string[];
  keyPoints: string[];
}

export interface KeyDecision {
  id: string;
  decision: string;
  context: string;
  madeBy: string;
  timestamp: string;
  relatedActionItems: string[];
}

export interface SpeakerSentiment {
  speakerName: string;
  overallSentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  sentimentScore: number; // -1 to 1
  talkTimePercent: number;
  wordCount: number;
}

export interface IntelligenceResult {
  transcriptionId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  summary?: MeetingSummary;
  actionItems?: ActionItem[];
  chapters?: TopicChapter[];
  decisions?: KeyDecision[];
  speakerSentiment?: SpeakerSentiment[];
  followUpEmail?: string;
  generatedAt?: Date;
  error?: string;
  processingTimeMs?: number;
}

// ─── Self-Hosted Whisper Provider ───────────────────────────────────

/**
 * STT provider adapter for a self-hosted Whisper instance.
 * Connects to any HTTP service that implements the transcription endpoint
 * contract: POST /stt/transcribe with audio file, returns JSON with segments.
 *
 * This is the bridge between UC's transcription pipeline and Scholarly's
 * FastAPI voice service — but it's generic enough to connect to any
 * Whisper deployment (HuggingFace Inference Endpoints, custom Docker, etc.)
 */
export class SelfHostedWhisperProvider {
  readonly name = 'self-hosted-whisper';
  private activeJobs = 0;

  constructor(private config: SelfHostedWhisperConfig) {}

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<TranscriptionSegment[]> {
    if (this.activeJobs >= this.config.maxConcurrentJobs) {
      throw new Error(`Max concurrent jobs (${this.config.maxConcurrentJobs}) reached. Try again later.`);
    }

    this.activeJobs++;
    try {
      const formData = new FormData();
      formData.append('audio', new Blob([audioBuffer], { type: mimeType }), 'audio.wav');
      formData.append('model', this.config.modelSize);
      formData.append('language', this.config.language);
      formData.append('diarize', String(this.config.diarizationEnabled));

      const headers: Record<string, string> = {};
      if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

      try {
        const response = await fetch(`${this.config.baseUrl}/stt/transcribe`, {
          method: 'POST',
          headers,
          body: formData,
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`Self-hosted Whisper returned ${response.status}: ${errorText}`);
        }

        const result = await response.json() as any;

        // Normalise the response into UC's TranscriptionSegment format
        return this.normaliseSegments(result);
      } finally {
        clearTimeout(timeout);
      }
    } finally {
      this.activeJobs--;
    }
  }

  private normaliseSegments(result: any): TranscriptionSegment[] {
    // Handle multiple response formats from different Whisper deployments
    const segments = result.segments || result.results || result.transcription?.segments || [];

    return segments.map((seg: any, index: number) => ({
      id: `seg-${index}`,
      text: seg.text || seg.transcript || '',
      startTime: seg.start ?? seg.startTime ?? seg.start_time ?? 0,
      endTime: seg.end ?? seg.endTime ?? seg.end_time ?? 0,
      speakerName: seg.speaker ?? seg.speakerName ?? seg.speaker_label ?? undefined,
      confidence: seg.confidence ?? seg.avg_logprob ? Math.exp(seg.avg_logprob) : undefined,
      language: seg.language ?? this.config.language,
      words: (seg.words || []).map((w: any) => ({
        word: w.word || w.text,
        start: w.start ?? w.startTime,
        end: w.end ?? w.endTime,
        confidence: w.probability ?? w.confidence,
      })),
    }));
  }

  async healthCheck(): Promise<{ healthy: boolean; message: string; latencyMs?: number }> {
    const start = Date.now();
    try {
      const headers: Record<string, string> = {};
      if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(5000),
      });
      const latencyMs = Date.now() - start;
      if (response.ok) {
        return { healthy: true, message: `Self-hosted Whisper responding (${latencyMs}ms)`, latencyMs };
      }
      return { healthy: false, message: `Health check returned ${response.status}`, latencyMs };
    } catch (err: any) {
      return { healthy: false, message: `Health check failed: ${err.message}` };
    }
  }

  getActiveJobs(): number { return this.activeJobs; }
}

export interface TranscriptionSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speakerName?: string;
  confidence?: number;
  language?: string;
  words?: { word: string; start: number; end: number; confidence?: number }[];
}

// ─── Meeting Intelligence Engine ────────────────────────────────────

/**
 * The Intelligence Engine takes a completed transcript and produces
 * structured meeting intelligence: summaries, action items, topic
 * chapters, decisions, and sentiment analysis.
 *
 * Think of it as the difference between a raw court transcript and
 * a case brief prepared by a legal associate. The transcript captures
 * every word; the intelligence engine extracts meaning and structure.
 */
export class MeetingIntelligenceEngine {
  private results: Map<string, IntelligenceResult> = new Map();

  constructor(
    private config: IntelligenceConfig,
    private ctx: PluginContext,
  ) {}

  async processTranscript(
    transcriptionId: string,
    fullTranscript: string,
    speakers: string[],
    metadata: { title?: string; duration?: string; participantCount?: number },
  ): Promise<IntelligenceResult> {
    const result: IntelligenceResult = {
      transcriptionId,
      status: 'processing',
    };
    this.results.set(transcriptionId, result);

    this.ctx.bus.emit('transcription:intelligence-started', { transcriptionId });

    const start = Date.now();
    try {
      const modules = this.config.enabledModules;

      // Run modules in parallel where possible
      const promises: Promise<void>[] = [];

      if (modules.includes('summary')) {
        promises.push(this.generateSummary(transcriptionId, fullTranscript, speakers, metadata)
          .then(s => { result.summary = s; }));
      }

      if (modules.includes('action-items')) {
        promises.push(this.extractActionItems(transcriptionId, fullTranscript)
          .then(items => { result.actionItems = items; }));
      }

      if (modules.includes('chapters')) {
        promises.push(this.generateChapters(transcriptionId, fullTranscript)
          .then(ch => { result.chapters = ch; }));
      }

      if (modules.includes('decisions')) {
        promises.push(this.extractDecisions(transcriptionId, fullTranscript)
          .then(d => { result.decisions = d; }));
      }

      if (modules.includes('sentiment')) {
        promises.push(this.analyseSentiment(transcriptionId, fullTranscript, speakers)
          .then(s => { result.speakerSentiment = s; }));
      }

      await Promise.all(promises);

      result.status = 'completed';
      result.generatedAt = new Date();
      result.processingTimeMs = Date.now() - start;

      this.ctx.bus.emit('transcription:intelligence-completed', {
        transcriptionId, processingTimeMs: result.processingTimeMs,
        modulesCompleted: modules,
      });

      if (result.actionItems?.length) {
        this.ctx.bus.emit('transcription:action-items-extracted', {
          transcriptionId, count: result.actionItems.length,
          items: result.actionItems,
        });
      }

      return result;
    } catch (err: any) {
      result.status = 'failed';
      result.error = err.message;
      result.processingTimeMs = Date.now() - start;

      this.ctx.bus.emit('transcription:intelligence-failed', {
        transcriptionId, error: err.message,
      });

      return result;
    }
  }

  private async callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
    // Provider-agnostic LLM call — abstracted to support multiple backends
    const baseUrl = this.config.provider === 'anthropic'
      ? 'https://api.anthropic.com/v1/messages'
      : this.config.provider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : this.config.baseUrl || '';

    if (this.config.provider === 'anthropic') {
      const response = await fetch(baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-sonnet-4-20250514',
          max_tokens: this.config.maxTokens,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });
      const data = await response.json() as any;
      return data.content?.[0]?.text || '';
    }

    // OpenAI-compatible endpoint (works for OpenAI, Azure OpenAI, self-hosted)
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });
    const data = await response.json() as any;
    return data.choices?.[0]?.message?.content || '';
  }

  private async generateSummary(
    transcriptionId: string,
    transcript: string,
    speakers: string[],
    metadata: { title?: string; duration?: string; participantCount?: number },
  ): Promise<MeetingSummary> {
    const systemPrompt = `You are a meeting intelligence assistant. Generate a structured meeting summary. Return valid JSON only with this structure:
{
  "executiveBrief": "2-3 sentence executive summary",
  "detailedNotes": "Comprehensive meeting notes in markdown format with headers for each major topic discussed"
}`;

    const userPrompt = `Meeting: ${metadata.title || 'Untitled'}
Duration: ${metadata.duration || 'Unknown'}
Participants: ${speakers.join(', ')}

Transcript:
${transcript.slice(0, 15000)}`;

    const result = await this.callLLM(systemPrompt, userPrompt);
    const parsed = this.safeParseJSON(result, { executiveBrief: 'Summary unavailable', detailedNotes: '' });

    this.ctx.bus.emit('transcription:summary-generated', { transcriptionId });

    return {
      transcriptionId,
      executiveBrief: parsed.executiveBrief,
      detailedNotes: parsed.detailedNotes,
      duration: metadata.duration || 'Unknown',
      participantCount: metadata.participantCount || speakers.length,
      speakers,
      generatedAt: new Date(),
    };
  }

  private async extractActionItems(transcriptionId: string, transcript: string): Promise<ActionItem[]> {
    const systemPrompt = `You are a meeting intelligence assistant. Extract action items from the transcript. Return valid JSON array only:
[{
  "description": "What needs to be done",
  "assignee": "Person responsible (or null)",
  "dueDate": "Due date if mentioned (or null)",
  "priority": "low|medium|high",
  "speakerName": "Who mentioned it",
  "timestamp": "Approximate timestamp",
  "quote": "Brief relevant quote"
}]`;

    const result = await this.callLLM(systemPrompt, `Extract action items:\n\n${transcript.slice(0, 15000)}`);
    const items = this.safeParseJSON(result, []) as any[];

    return items.map((item: any, i: number) => ({
      id: `action-${transcriptionId}-${i}`,
      description: item.description || '',
      assignee: item.assignee || undefined,
      dueDate: item.dueDate || undefined,
      priority: item.priority || 'medium',
      source: {
        speakerName: item.speakerName || 'Unknown',
        timestamp: item.timestamp || '',
        quote: item.quote || '',
      },
      status: 'pending' as const,
    }));
  }

  private async generateChapters(transcriptionId: string, transcript: string): Promise<TopicChapter[]> {
    const systemPrompt = `You are a meeting intelligence assistant. Segment this transcript into topic chapters. Return valid JSON array only:
[{
  "title": "Chapter title",
  "summary": "Brief summary of what was discussed",
  "startTimestamp": "HH:MM:SS",
  "endTimestamp": "HH:MM:SS",
  "speakers": ["speaker names"],
  "keyPoints": ["bullet points"]
}]`;

    const result = await this.callLLM(systemPrompt, `Segment into chapters:\n\n${transcript.slice(0, 15000)}`);
    const chapters = this.safeParseJSON(result, []) as any[];

    this.ctx.bus.emit('transcription:chapters-generated', { transcriptionId, count: chapters.length });

    return chapters.map((ch: any, i: number) => ({
      id: `chapter-${transcriptionId}-${i}`,
      title: ch.title || `Chapter ${i + 1}`,
      summary: ch.summary || '',
      startTimestamp: ch.startTimestamp || '00:00:00',
      endTimestamp: ch.endTimestamp || '00:00:00',
      speakers: ch.speakers || [],
      keyPoints: ch.keyPoints || [],
    }));
  }

  private async extractDecisions(transcriptionId: string, transcript: string): Promise<KeyDecision[]> {
    const systemPrompt = `You are a meeting intelligence assistant. Extract key decisions made during the meeting. Return valid JSON array only:
[{
  "decision": "What was decided",
  "context": "Why/how it was decided",
  "madeBy": "Who made or proposed the decision",
  "timestamp": "Approximate timestamp"
}]`;

    const result = await this.callLLM(systemPrompt, `Extract decisions:\n\n${transcript.slice(0, 15000)}`);
    const decisions = this.safeParseJSON(result, []) as any[];

    return decisions.map((d: any, i: number) => ({
      id: `decision-${transcriptionId}-${i}`,
      decision: d.decision || '',
      context: d.context || '',
      madeBy: d.madeBy || 'Unknown',
      timestamp: d.timestamp || '',
      relatedActionItems: [],
    }));
  }

  private async analyseSentiment(
    transcriptionId: string,
    transcript: string,
    speakers: string[],
  ): Promise<SpeakerSentiment[]> {
    const systemPrompt = `You are a meeting intelligence assistant. Analyse sentiment per speaker. Return valid JSON array only:
[{
  "speakerName": "Name",
  "overallSentiment": "positive|neutral|negative|mixed",
  "sentimentScore": 0.5,
  "talkTimePercent": 35,
  "wordCount": 1200
}]`;

    const result = await this.callLLM(systemPrompt, `Analyse speaker sentiment for ${speakers.join(', ')}:\n\n${transcript.slice(0, 15000)}`);
    return this.safeParseJSON(result, []) as SpeakerSentiment[];
  }

  async generateFollowUpEmail(transcriptionId: string): Promise<string> {
    const result = this.results.get(transcriptionId);
    if (!result?.summary) throw new Error('Summary must be generated first');

    const systemPrompt = `You are a professional communication assistant. Generate a concise follow-up email summarising the meeting with action items.`;
    const userPrompt = `Meeting summary: ${result.summary.executiveBrief}\n\nAction items:\n${(result.actionItems || []).map(a => `- ${a.description} (${a.assignee || 'Unassigned'})`).join('\n')}`;

    const email = await this.callLLM(systemPrompt, userPrompt);
    result.followUpEmail = email;
    return email;
  }

  getResult(transcriptionId: string): IntelligenceResult | undefined {
    return this.results.get(transcriptionId);
  }

  private safeParseJSON(text: string, fallback: any): any {
    try {
      // Strip markdown code fences if present
      const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleaned);
    } catch {
      return fallback;
    }
  }

  // ─── REST Router ──────────────────────────────────────────────────

  createRouter(): Router {
    const router = Router();

    // Run intelligence pipeline on a transcription
    router.post('/transcriptions/:id/intelligence', async (req, res) => {
      const { transcript, speakers, metadata } = req.body;
      if (!transcript) return res.status(400).json({ error: 'transcript is required' });
      try {
        const result = await this.processTranscript(
          req.params.id, transcript, speakers || [], metadata || {},
        );
        res.json(result);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // Get summary
    router.get('/transcriptions/:id/summary', (req, res) => {
      const result = this.results.get(req.params.id);
      if (!result?.summary) return res.status(404).json({ error: 'Summary not available' });
      res.json(result.summary);
    });

    // Get action items
    router.get('/transcriptions/:id/action-items', (req, res) => {
      const result = this.results.get(req.params.id);
      if (!result?.actionItems) return res.status(404).json({ error: 'Action items not available' });
      res.json({ transcriptionId: req.params.id, items: result.actionItems });
    });

    // Get chapters
    router.get('/transcriptions/:id/chapters', (req, res) => {
      const result = this.results.get(req.params.id);
      if (!result?.chapters) return res.status(404).json({ error: 'Chapters not available' });
      res.json({ transcriptionId: req.params.id, chapters: result.chapters });
    });

    // Get decisions
    router.get('/transcriptions/:id/decisions', (req, res) => {
      const result = this.results.get(req.params.id);
      if (!result?.decisions) return res.status(404).json({ error: 'Decisions not available' });
      res.json({ transcriptionId: req.params.id, decisions: result.decisions });
    });

    // Generate follow-up email
    router.post('/transcriptions/:id/follow-up-email', async (req, res) => {
      try {
        const email = await this.generateFollowUpEmail(req.params.id);
        res.json({ transcriptionId: req.params.id, email });
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    // List available providers
    router.get('/providers', (_req, res) => {
      res.json({
        providers: [
          { id: 'openai-whisper', name: 'OpenAI Whisper (Cloud)', type: 'cloud' },
          { id: 'azure-speech', name: 'Azure Cognitive Speech', type: 'cloud' },
          { id: 'deepgram', name: 'Deepgram', type: 'cloud' },
          { id: 'self-hosted-whisper', name: 'Self-Hosted Whisper', type: 'self-hosted' },
          { id: 'mock', name: 'Mock (Testing)', type: 'mock' },
        ],
      });
    });

    return router;
  }
}

export default { SelfHostedWhisperProvider, MeetingIntelligenceEngine };
