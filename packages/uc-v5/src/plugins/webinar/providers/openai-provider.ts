/**
 * Chekd Unified Communications 3.2 — Production OpenAI Provider
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE PRODUCTION AI ENGINE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * If the MockAIProvider is the understudy who reads cue cards, this is the
 * principal performer who has studied the script, understands the audience,
 * and can improvise brilliantly when things go off-script.
 *
 * This provider makes real HTTP calls to OpenAI's API endpoints:
 *
 *   • /v1/chat/completions  — GPT-4o for clustering, summaries, email drafts
 *   • /v1/embeddings        — text-embedding-3-small for semantic similarity
 *   • /v1/moderations       — Content screening for Q&A and chat
 *
 * Every method in this file produces real, non-mocked results. The adapter
 * pattern means the WebinarPlugin never knows or cares which provider is
 * behind the curtain — it just calls the interface and gets results.
 *
 * Error handling philosophy: Every external call is wrapped in a try/catch
 * with a graceful degradation path. If GPT-4o is down, we still produce
 * a reasonable (if less intelligent) result rather than crashing the
 * live broadcast. Think of it as a backup generator — it won't power the
 * full light show, but the audience won't be left in the dark.
 */

import type { Logger } from '../../../utils/logger';

// ─── Re-declare the types we need (avoiding circular imports) ────────────────

interface WebinarQuestion {
  id: string; webinarId: string; submittedBy: string; submitterName: string;
  submitterRole: string; content: string; status: string;
  priority: string; submittedAt: Date; answeredAt?: Date;
  answeredBy?: string; answer?: string;
  aiClusterId?: string; aiClusterLabel?: string; aiSimilarQuestionIds: string[];
  aiSuggestedAnswer?: string; aiRelevanceScore: number; aiTopicTags: string[];
  upvotes: number; upvoterIds: string[]; isAnonymous: boolean; isFromVip: boolean;
  isFlagged: boolean; flagReason?: string; moderatedBy?: string;
}

interface WebinarChatMessage {
  id: string; webinarId: string; senderId: string; senderName: string; senderRole: string;
  content: string; scope: string; isPinned: boolean; isAnnouncement: boolean; timestamp: Date;
  isHidden: boolean; hiddenBy?: string; hiddenReason?: string;
}

interface WebinarReaction {
  id: string; webinarId: string; userId: string; type: string; timestamp: Date;
}

interface AgendaSegment {
  id: string; title: string; description?: string; speakerIds: string[];
  durationMinutes: number; order: number; type: string; notes?: string; resources?: string[];
}

interface SentimentSnapshot {
  timestamp: Date; overall: number; positive: number; neutral: number; negative: number;
  trending: 'improving' | 'stable' | 'declining'; dominantEmotion: string; sampleSize: number;
}

interface EngagementSnapshot {
  timestamp: Date; activeParticipants: number; totalParticipants: number;
  engagementRate: number; chatVelocity: number; reactionVelocity: number;
  questionVelocity: number; attentionScore: number; trending: 'rising' | 'stable' | 'declining';
}

interface QuestionTriageResult {
  clusters: { id: string; label: string; questionIds: string[]; summary: string; suggestedAnswer: string; priority: 'low' | 'medium' | 'high' | 'urgent' }[];
  duplicateGroups: { canonicalId: string; duplicateIds: string[] }[];
  flagged: { questionId: string; reason: string }[];
  topPriority: string[];
}

interface AIProviderAdapter {
  readonly name: string;
  triageQuestions(questions: WebinarQuestion[], context: { webinarTitle: string; currentSegment?: string; priorClusters: string[] }): Promise<QuestionTriageResult>;
  analyseSentiment(messages: WebinarChatMessage[], reactions: WebinarReaction[]): Promise<SentimentSnapshot>;
  generateSummary(transcript: string, agenda: AgendaSegment[], questionsAnswered: WebinarQuestion[]): Promise<{ summary: string; keyTakeaways: string[]; actionItems: string[] }>;
  suggestAction(engagement: EngagementSnapshot, sentiment: SentimentSnapshot, context: { phase: string; currentSegment?: string; remainingMinutes: number }): Promise<{ action: string; reason: string; urgency: 'low' | 'medium' | 'high' }>;
  moderateContent(content: string): Promise<{ safe: boolean; reason?: string; severity?: string }>;
  generateFollowUpEmail(webinar: { title: string; description: string }, analytics: { attendanceRate: number; topQuestions: string[]; keyTakeaways: string[] }, audience: 'attended' | 'registered-not-attended' | 'all'): Promise<{ subject: string; body: string }>;
  healthCheck(): Promise<{ healthy: boolean; latencyMs?: number }>;
}

// ─── HTTP Utility ────────────────────────────────────────────────────────────

interface OpenAIRequestOptions {
  endpoint: string;
  body: Record<string, unknown>;
  timeoutMs?: number;
}

interface OpenAIConfig {
  apiKey: string;
  model?: string;
  embeddingModel?: string;
  baseUrl?: string;
  maxRetries?: number;
  requestTimeoutMs?: number;
  logger?: Logger;
}

/**
 * Lean HTTP client for OpenAI. We deliberately avoid importing a heavyweight
 * SDK — this keeps the dependency tree clean and gives us full control over
 * retries, timeouts, and error classification.
 */
async function openAIRequest<T>(
  config: { apiKey: string; baseUrl: string; maxRetries: number; requestTimeoutMs: number; logger?: Logger },
  options: OpenAIRequestOptions,
): Promise<T> {
  const url = `${config.baseUrl}${options.endpoint}`;
  const timeout = options.timeoutMs ?? config.requestTimeoutMs;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 500ms, 1s, 2s
      const delay = Math.min(500 * Math.pow(2, attempt - 1), 4000);
      await new Promise((r) => setTimeout(r, delay));
      config.logger?.warn(`OpenAI retry ${attempt}/${config.maxRetries} for ${options.endpoint}`);
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(options.body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown error');

        // Rate limit — retryable
        if (response.status === 429) {
          lastError = new Error(`Rate limited: ${response.status} ${errorBody}`);
          continue;
        }
        // Server error — retryable
        if (response.status >= 500) {
          lastError = new Error(`Server error: ${response.status} ${errorBody}`);
          continue;
        }
        // Client error — not retryable
        throw new Error(`OpenAI API error ${response.status}: ${errorBody}`);
      }

      return await response.json() as T;
    } catch (err: unknown) {
      clearTimeout(timer);
      const error = err instanceof Error ? err : new Error(String(err));

      if (error.name === 'AbortError') {
        lastError = new Error(`Request timeout after ${timeout}ms for ${options.endpoint}`);
        continue;
      }
      // Network errors are retryable
      if (error.message.includes('fetch') || error.message.includes('ECONNREFUSED')) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error(`OpenAI request failed after ${config.maxRetries + 1} attempts`);
}

// ─── Response Types ──────────────────────────────────────────────────────────

interface ChatCompletionResponse {
  choices: { message: { content: string; role: string }; finish_reason: string }[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
}

interface EmbeddingResponse {
  data: { embedding: number[]; index: number }[];
  usage?: { prompt_tokens: number; total_tokens: number };
}

interface ModerationResponse {
  results: {
    flagged: boolean;
    categories: Record<string, boolean>;
    category_scores: Record<string, number>;
  }[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PRODUCTION OPENAI PROVIDER
// ═══════════════════════════════════════════════════════════════════════════════

export class ProductionOpenAIProvider implements AIProviderAdapter {
  readonly name = 'openai';

  private apiKey: string;
  private model: string;
  private embeddingModel: string;
  private baseUrl: string;
  private maxRetries: number;
  private requestTimeoutMs: number;
  private logger?: Logger;

  constructor(config: OpenAIConfig) {
    if (!config.apiKey) {
      throw new Error('OpenAI API key is required for production provider');
    }
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o';
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-small';
    this.baseUrl = config.baseUrl || 'https://api.openai.com';
    this.maxRetries = config.maxRetries ?? 2;
    this.requestTimeoutMs = config.requestTimeoutMs ?? 15000;
    this.logger = config.logger;
  }

  private get httpConfig() {
    return {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      maxRetries: this.maxRetries,
      requestTimeoutMs: this.requestTimeoutMs,
      logger: this.logger,
    };
  }

  // ─── Question Triage (GPT-4o + Embeddings) ─────────────────────────────

  async triageQuestions(
    questions: WebinarQuestion[],
    context: { webinarTitle: string; currentSegment?: string; priorClusters: string[] },
  ): Promise<QuestionTriageResult> {
    if (questions.length === 0) {
      return { clusters: [], duplicateGroups: [], flagged: [], topPriority: [] };
    }

    try {
      // Step 1: Use embeddings to compute pairwise similarity for duplicate detection
      const duplicateGroups = await this.findDuplicatesViaEmbeddings(questions);

      // Step 2: Use GPT-4o with structured output for clustering and triage
      const questionList = questions.map((q, i) => (
        `[${i}] id="${q.id}" from=${q.isFromVip ? 'VIP' : q.submitterRole} upvotes=${q.upvotes} content="${q.content}"`
      )).join('\n');

      const response = await openAIRequest<ChatCompletionResponse>(this.httpConfig, {
        endpoint: '/v1/chat/completions',
        body: {
          model: this.model,
          temperature: 0.3,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are an expert webinar Q&A triage system. Analyse the submitted questions and produce a JSON response with this exact structure:
{
  "clusters": [
    {
      "id": "cluster-N",
      "label": "Short topic label",
      "questionIds": ["q-id-1", "q-id-2"],
      "summary": "Brief summary of what this cluster is about",
      "suggestedAnswer": "A helpful answer the host could give",
      "priority": "low|medium|high|urgent"
    }
  ],
  "flagged": [
    { "questionId": "q-id", "reason": "Why this was flagged" }
  ],
  "topPriority": ["q-id-1", "q-id-2"]
}

Priority rules:
- VIP questions start at "high"
- Questions with 3+ upvotes are "high"
- Questions with 5+ upvotes are "urgent"
- Group similar questions into the same cluster
- Flag any off-topic, spam, or inappropriate questions
- topPriority should list the 5 most important question IDs`,
            },
            {
              role: 'user',
              content: `Webinar: "${context.webinarTitle}"${context.currentSegment ? `\nCurrent segment: "${context.currentSegment}"` : ''}\n${context.priorClusters.length > 0 ? `Prior clusters: ${context.priorClusters.join(', ')}\n` : ''}\nQuestions:\n${questionList}`,
            },
          ],
        },
        timeoutMs: 20000,
      });

      const parsed = JSON.parse(response.choices[0].message.content) as {
        clusters: QuestionTriageResult['clusters'];
        flagged: QuestionTriageResult['flagged'];
        topPriority: string[];
      };

      return {
        clusters: parsed.clusters || [],
        duplicateGroups,
        flagged: parsed.flagged || [],
        topPriority: (parsed.topPriority || []).slice(0, 5),
      };
    } catch (err) {
      this.logger?.error(`Question triage failed, using keyword fallback: ${err}`);
      return this.fallbackTriage(questions, context);
    }
  }

  private async findDuplicatesViaEmbeddings(
    questions: WebinarQuestion[],
  ): Promise<{ canonicalId: string; duplicateIds: string[] }[]> {
    if (questions.length < 2) return [];

    try {
      const embeddings = await openAIRequest<EmbeddingResponse>(this.httpConfig, {
        endpoint: '/v1/embeddings',
        body: {
          model: this.embeddingModel,
          input: questions.map((q) => q.content),
        },
        timeoutMs: 10000,
      });

      const vectors = embeddings.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
      const groups: { canonicalId: string; duplicateIds: string[] }[] = [];
      const assigned = new Set<number>();

      for (let i = 0; i < questions.length; i++) {
        if (assigned.has(i)) continue;
        const duplicates: string[] = [];

        for (let j = i + 1; j < questions.length; j++) {
          if (assigned.has(j)) continue;
          const sim = this.cosineSimilarity(vectors[i], vectors[j]);
          if (sim > 0.90) {
            duplicates.push(questions[j].id);
            assigned.add(j);
          }
        }

        if (duplicates.length > 0) {
          assigned.add(i);
          groups.push({ canonicalId: questions[i].id, duplicateIds: duplicates });
        }
      }

      return groups;
    } catch (err) {
      this.logger?.warn(`Embedding-based duplicate detection failed: ${err}`);
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }

  // ─── Sentiment Analysis ────────────────────────────────────────────────

  async analyseSentiment(
    messages: WebinarChatMessage[],
    reactions: WebinarReaction[],
  ): Promise<SentimentSnapshot> {
    const sampleSize = messages.length + reactions.length;
    if (sampleSize === 0) {
      return { timestamp: new Date(), overall: 65, positive: 40, neutral: 50, negative: 10, trending: 'stable', dominantEmotion: 'neutral', sampleSize: 0 };
    }

    // Build a compact representation for the model
    const reactionSummary: Record<string, number> = {};
    for (const r of reactions) {
      reactionSummary[r.type] = (reactionSummary[r.type] || 0) + 1;
    }

    const recentMessages = messages.slice(-30).map((m) => m.content).join('\n');

    try {
      const response = await openAIRequest<ChatCompletionResponse>(this.httpConfig, {
        endpoint: '/v1/chat/completions',
        body: {
          model: this.model,
          temperature: 0.2,
          max_tokens: 300,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `Analyse the audience sentiment from chat messages and reactions during a live webinar. Return JSON:
{
  "overall": <0-100, where 0=very negative, 50=neutral, 100=very positive>,
  "positive": <0-100 percentage>,
  "neutral": <0-100 percentage>,
  "negative": <0-100 percentage>,
  "trending": "improving"|"stable"|"declining",
  "dominantEmotion": "<one word: excited, engaged, confused, bored, frustrated, neutral, enthusiastic, skeptical>"
}
Percentages must sum to 100. Be precise — don't default to neutral if there are clear signals.`,
            },
            {
              role: 'user',
              content: `Reactions (last 2 min): ${JSON.stringify(reactionSummary)}\n\nRecent chat messages:\n${recentMessages}`,
            },
          ],
        },
        timeoutMs: 10000,
      });

      const parsed = JSON.parse(response.choices[0].message.content) as {
        overall: number; positive: number; neutral: number; negative: number;
        trending: 'improving' | 'stable' | 'declining'; dominantEmotion: string;
      };

      return {
        timestamp: new Date(),
        overall: Math.max(0, Math.min(100, Math.round(parsed.overall))),
        positive: Math.round(parsed.positive),
        neutral: Math.round(parsed.neutral),
        negative: Math.round(parsed.negative),
        trending: parsed.trending,
        dominantEmotion: parsed.dominantEmotion,
        sampleSize,
      };
    } catch (err) {
      this.logger?.warn(`Sentiment analysis failed, using heuristic: ${err}`);
      return this.fallbackSentiment(messages, reactions);
    }
  }

  // ─── Summary Generation ────────────────────────────────────────────────

  async generateSummary(
    transcript: string,
    agenda: AgendaSegment[],
    questionsAnswered: WebinarQuestion[],
  ): Promise<{ summary: string; keyTakeaways: string[]; actionItems: string[] }> {
    const agendaText = agenda.map((s) => `- ${s.title} (${s.durationMinutes}min, ${s.type})`).join('\n');
    const qaText = questionsAnswered.slice(0, 15).map((q) => `Q: ${q.content}\nA: ${q.answer || 'Addressed live'}`).join('\n\n');

    try {
      const response = await openAIRequest<ChatCompletionResponse>(this.httpConfig, {
        endpoint: '/v1/chat/completions',
        body: {
          model: this.model,
          temperature: 0.4,
          max_tokens: 1500,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `Generate a comprehensive webinar post-event summary. Return JSON:
{
  "summary": "2-3 paragraph executive summary of the webinar",
  "keyTakeaways": ["takeaway 1", "takeaway 2", ...],
  "actionItems": ["action 1", "action 2", ...]
}
Key takeaways should be 3-7 concrete, specific insights. Action items should be practical next steps for attendees.`,
            },
            {
              role: 'user',
              content: `Agenda:\n${agendaText}\n\n${transcript ? `Transcript excerpt:\n${transcript.substring(0, 3000)}\n\n` : ''}Q&A Highlights:\n${qaText || 'No Q&A recorded'}`,
            },
          ],
        },
        timeoutMs: 25000,
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      return {
        summary: parsed.summary || 'Summary generation completed.',
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : [],
        actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      };
    } catch (err) {
      this.logger?.error(`Summary generation failed: ${err}`);
      return {
        summary: `This webinar covered ${agenda.length} segments: ${agenda.map((s) => s.title).join(', ')}. ${questionsAnswered.length} audience questions were addressed.`,
        keyTakeaways: agenda.map((s) => `${s.title}: Key insights shared on this topic`),
        actionItems: questionsAnswered.filter((q) => q.content.toLowerCase().includes('how')).slice(0, 5).map((q) => `Follow up: "${q.content.substring(0, 80)}"`),
      };
    }
  }

  // ─── Action Suggestion ─────────────────────────────────────────────────

  async suggestAction(
    engagement: EngagementSnapshot,
    sentiment: SentimentSnapshot,
    context: { phase: string; currentSegment?: string; remainingMinutes: number },
  ): Promise<{ action: string; reason: string; urgency: 'low' | 'medium' | 'high' }> {
    try {
      const response = await openAIRequest<ChatCompletionResponse>(this.httpConfig, {
        endpoint: '/v1/chat/completions',
        body: {
          model: this.model,
          temperature: 0.5,
          max_tokens: 300,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `You are a live webinar coach. Based on real-time engagement and sentiment data, suggest ONE specific action for the host. Return JSON:
{
  "action": "Specific, actionable suggestion",
  "reason": "Brief explanation",
  "urgency": "low"|"medium"|"high"
}
Be specific. Not "consider a poll" but "Launch a quick poll asking attendees which topic they want to dive deeper into."`,
            },
            {
              role: 'user',
              content: `Phase: ${context.phase}\nSegment: ${context.currentSegment || 'N/A'}\nTime left: ${Math.round(context.remainingMinutes)} min\n\nEngagement: attention=${engagement.attentionScore}/100, active=${engagement.activeParticipants}/${engagement.totalParticipants}, chat=${engagement.chatVelocity}/min, reactions=${engagement.reactionVelocity}/min, questions=${engagement.questionVelocity}/min, trend=${engagement.trending}\n\nSentiment: overall=${sentiment.overall}/100, positive=${sentiment.positive}%, negative=${sentiment.negative}%, trend=${sentiment.trending}, emotion=${sentiment.dominantEmotion}`,
            },
          ],
        },
        timeoutMs: 8000,
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      return {
        action: parsed.action || 'Continue current pace',
        reason: parsed.reason || 'Engagement metrics are within normal range',
        urgency: (['low', 'medium', 'high'].includes(parsed.urgency) ? parsed.urgency : 'low') as 'low' | 'medium' | 'high',
      };
    } catch (err) {
      this.logger?.warn(`Action suggestion failed: ${err}`);
      // Deterministic fallback logic
      if (engagement.engagementRate < 0.3) return { action: 'Launch an interactive poll to re-engage the audience', reason: `Engagement at ${Math.round(engagement.engagementRate * 100)}%`, urgency: 'high' };
      if (sentiment.trending === 'declining') return { action: 'Address the most upvoted question', reason: 'Sentiment trending downward', urgency: 'medium' };
      return { action: 'Continue current pace — engagement and sentiment are healthy', reason: `Engagement ${Math.round(engagement.engagementRate * 100)}%, sentiment ${sentiment.overall}/100`, urgency: 'low' };
    }
  }

  // ─── Content Moderation (OpenAI Moderation API) ────────────────────────

  async moderateContent(content: string): Promise<{ safe: boolean; reason?: string; severity?: string }> {
    try {
      const response = await openAIRequest<ModerationResponse>(this.httpConfig, {
        endpoint: '/v1/moderations',
        body: { input: content },
        timeoutMs: 5000,
      });

      const result = response.results[0];
      if (!result.flagged) return { safe: true };

      // Find the highest-scoring flagged category
      const flaggedCategories = Object.entries(result.categories)
        .filter(([, flagged]) => flagged)
        .map(([category]) => category);

      const highestScore = Math.max(
        ...Object.entries(result.category_scores)
          .filter(([cat]) => flaggedCategories.includes(cat))
          .map(([, score]) => score),
      );

      const severity = highestScore > 0.8 ? 'high' : highestScore > 0.5 ? 'medium' : 'low';

      return {
        safe: false,
        reason: `Flagged categories: ${flaggedCategories.join(', ')}`,
        severity,
      };
    } catch (err) {
      this.logger?.warn(`Moderation API failed, using regex fallback: ${err}`);
      // Fail-open with basic regex screening so the broadcast isn't disrupted
      const flagged = [/spam/i, /buy now/i, /click here/i, /\b(hate|kill|threat)\b/i];
      for (const p of flagged) if (p.test(content)) return { safe: false, reason: `Pattern match: ${p.source}`, severity: 'medium' };
      return { safe: true };
    }
  }

  // ─── Follow-Up Email Generation ────────────────────────────────────────

  async generateFollowUpEmail(
    webinar: { title: string; description: string },
    analytics: { attendanceRate: number; topQuestions: string[]; keyTakeaways: string[] },
    audience: 'attended' | 'registered-not-attended' | 'all',
  ): Promise<{ subject: string; body: string }> {
    const audienceLabel = audience === 'registered-not-attended' ? 'people who registered but did not attend' : audience === 'attended' ? 'people who attended' : 'all registrants';

    try {
      const response = await openAIRequest<ChatCompletionResponse>(this.httpConfig, {
        endpoint: '/v1/chat/completions',
        body: {
          model: this.model,
          temperature: 0.6,
          max_tokens: 800,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content: `Write a professional follow-up email for a webinar. Return JSON:
{
  "subject": "Email subject line",
  "body": "Full email body in plain text with line breaks"
}
The email should be warm but professional, include key takeaways, and have a clear call to action. For attendees: thank them and summarise. For no-shows: express that they were missed and offer the recording.`,
            },
            {
              role: 'user',
              content: `Webinar: "${webinar.title}"\nDescription: ${webinar.description}\nAudience: ${audienceLabel}\nAttendance rate: ${Math.round(analytics.attendanceRate * 100)}%\n\nKey takeaways:\n${analytics.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nTop questions asked:\n${analytics.topQuestions.slice(0, 5).map((q, i) => `${i + 1}. ${q}`).join('\n')}`,
            },
          ],
        },
        timeoutMs: 12000,
      });

      const parsed = JSON.parse(response.choices[0].message.content);
      return { subject: parsed.subject, body: parsed.body };
    } catch (err) {
      this.logger?.error(`Follow-up email generation failed: ${err}`);
      if (audience === 'registered-not-attended') {
        return { subject: `We missed you at "${webinar.title}"`, body: `Hi,\n\nSorry you couldn't join "${webinar.title}". Key takeaways:\n\n${analytics.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nA recording is available.\n\nBest regards` };
      }
      return { subject: `Thank you for attending "${webinar.title}"`, body: `Hi,\n\nThank you for joining "${webinar.title}". Key takeaways:\n\n${analytics.keyTakeaways.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\nTop questions:\n${analytics.topQuestions.slice(0, 3).map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\nBest regards` };
    }
  }

  // ─── Health Check ──────────────────────────────────────────────────────

  async healthCheck(): Promise<{ healthy: boolean; latencyMs?: number }> {
    const start = Date.now();
    try {
      await openAIRequest<ChatCompletionResponse>(this.httpConfig, {
        endpoint: '/v1/chat/completions',
        body: {
          model: this.model,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'ping' }],
        },
        timeoutMs: 5000,
      });
      return { healthy: true, latencyMs: Date.now() - start };
    } catch {
      return { healthy: false, latencyMs: Date.now() - start };
    }
  }

  // ─── Fallback Methods ──────────────────────────────────────────────────
  //
  // These fire only when the OpenAI API is unreachable. They use simple
  // heuristics to keep the webinar running — like a backup generator that
  // provides enough power for the essentials, if not the full light show.

  private fallbackTriage(
    questions: WebinarQuestion[],
    context: { webinarTitle: string; currentSegment?: string; priorClusters: string[] },
  ): QuestionTriageResult {
    const clusters: QuestionTriageResult['clusters'] = [];
    const assigned = new Set<string>();

    for (const q of questions) {
      if (assigned.has(q.id)) continue;
      const similar = questions.filter((o) => o.id !== q.id && !assigned.has(o.id) && this.keywordOverlap(q.content, o.content) > 0.3);
      const ids = [q.id, ...similar.map((s) => s.id)];
      ids.forEach((id) => assigned.add(id));
      const kw = this.extractKeywords(q.content);
      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        label: kw.slice(0, 3).join(', ') || 'General',
        questionIds: ids,
        summary: `${ids.length} question(s) about ${kw[0] || context.currentSegment || context.webinarTitle}`,
        suggestedAnswer: `Great question about ${kw[0] || 'this topic'}.${context.currentSegment ? ` This relates to "${context.currentSegment}".` : ''}`,
        priority: q.isFromVip ? 'high' : ids.length > 2 ? 'high' : 'medium',
      });
    }

    return {
      clusters,
      topPriority: clusters.filter((c) => c.priority === 'high').flatMap((c) => c.questionIds).slice(0, 5),
      duplicateGroups: clusters.filter((c) => c.questionIds.length > 1).map((c) => ({ canonicalId: c.questionIds[0], duplicateIds: c.questionIds.slice(1) })),
      flagged: [],
    };
  }

  private fallbackSentiment(messages: WebinarChatMessage[], reactions: WebinarReaction[]): SentimentSnapshot {
    const posRx = reactions.filter((r) => ['applause', 'thumbs-up', 'heart', 'laugh'].includes(r.type)).length;
    const negKw = ['confused', 'unclear', 'disagree', 'wrong', 'bad', 'boring'];
    const posKw = ['great', 'amazing', 'excellent', 'agree', 'love', 'fantastic', 'awesome'];
    let pos = posRx * 2, neg = 0;
    for (const m of messages) { const l = m.content.toLowerCase(); pos += posKw.filter((k) => l.includes(k)).length; neg += negKw.filter((k) => l.includes(k)).length; }
    const total = Math.max(pos + neg, 1); const pp = pos / total; const np = neg / total;
    const overall = Math.max(0, Math.min(100, Math.round((pp - np + 1) * 50)));
    return { timestamp: new Date(), overall, positive: Math.round(pp * 100), neutral: Math.round(Math.max(0, 1 - pp - np) * 100), negative: Math.round(np * 100), trending: pp > 0.6 ? 'improving' : np > 0.3 ? 'declining' : 'stable', dominantEmotion: pp > np ? 'positive' : 'neutral', sampleSize: messages.length + reactions.length };
  }

  private keywordOverlap(a: string, b: string): number {
    const wa = new Set(this.extractKeywords(a)); const wb = new Set(this.extractKeywords(b));
    if (!wa.size || !wb.size) return 0; let n = 0; for (const w of wa) if (wb.has(w)) n++;
    return n / Math.max(wa.size, wb.size);
  }

  private extractKeywords(text: string): string[] {
    const stop = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'this', 'that', 'these', 'those', 'it', 'its', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'how', 'when', 'where', 'why', 'and', 'or', 'but', 'if', 'not', 'no', 'so', 'about', 'up', 'out', 'just', 'than', 'very', 'also', 'some', 'any']);
    return text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter((w) => w.length > 2 && !stop.has(w));
  }
}

export default ProductionOpenAIProvider;
