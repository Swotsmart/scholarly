/**
 * Scholarly Platform — Gemini AI Adapter
 * ========================================
 *
 * AI-006: Google Gemini API adapter for the AI abstraction layer.
 *
 * Gemini joins Claude and OpenAI as the third provider in the rotation.
 * Its strengths are in multimodal understanding (vision), long-context
 * processing, and cost-effective embedding generation. The adapter
 * implements 5 capabilities from the Sprint 1 interfaces:
 *
 *   1. Text Completion (ITextCompletionProvider)
 *   2. Assessment (IAssessmentProvider)
 *   3. Vision (IVisionProvider)
 *   4. Embedding (IEmbeddingProvider)
 *   5. Structured Output (IStructuredOutputProvider)
 *
 * Gemini's API differs from Anthropic and OpenAI in several ways:
 * - Uses "generateContent" rather than "messages" or "chat/completions"
 * - System instructions are separate from the message history
 * - Structured output uses a "responseSchema" field
 * - Vision input uses inline data with base64-encoded images
 *
 * @module ai-abstraction/gemini-adapter
 * @version 1.0.0
 */

import { Logger } from 'pino';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS (matching Sprint 1 capability interfaces)
// ============================================================================

export type CostTier = 'economy' | 'standard' | 'critical';

export interface UsageMetadata {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  costUsd: number;
  latencyMs: number;
  provider: string;
  model: string;
}

export interface TextCompletionRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  stopSequences?: string[];
  costTier?: CostTier;
  metadata?: Record<string, unknown>;
}

export interface TextCompletionResponse {
  text: string;
  usage: UsageMetadata;
  finishReason: 'stop' | 'length' | 'safety' | 'error';
}

export interface AssessmentRequest {
  studentResponse: string;
  assessmentCriteria: string;
  rubric?: Record<string, { description: string; maxScore: number }>;
  context?: string;
  gradeLevel?: string;
  costTier?: CostTier;
}

export interface AssessmentResponse {
  overallScore: number;
  maxScore: number;
  criteriaScores: Record<string, { score: number; maxScore: number; feedback: string }>;
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  usage: UsageMetadata;
}

export interface VisionRequest {
  imageData: string; // base64
  imageMediaType: 'image/png' | 'image/jpeg' | 'image/gif' | 'image/webp';
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  costTier?: CostTier;
}

export interface VisionResponse {
  text: string;
  usage: UsageMetadata;
}

export interface EmbeddingRequest {
  texts: string[];
  model?: string;
  dimensions?: number;
  costTier?: CostTier;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: UsageMetadata;
}

export interface StructuredOutputRequest {
  prompt: string;
  systemPrompt?: string;
  schema: Record<string, unknown>; // JSON Schema
  maxTokens?: number;
  temperature?: number;
  costTier?: CostTier;
}

export interface StructuredOutputResponse {
  data: unknown;
  raw: string;
  usage: UsageMetadata;
}

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string; details?: unknown } };

// ============================================================================
// SECTION 2: GEMINI MODEL CONFIGURATION
// ============================================================================

/**
 * Gemini model tier mapping.
 *
 * Like the Claude adapter maps Opus/Sonnet/Haiku to cost tiers,
 * Gemini maps across its model family:
 *
 *   critical → gemini-2.0-pro (best quality, highest cost)
 *   standard → gemini-2.0-flash (good balance)
 *   economy  → gemini-2.0-flash-lite (lowest cost)
 */
interface GeminiModelConfig {
  modelId: string;
  inputPricePer1M: number;  // USD per 1M input tokens
  outputPricePer1M: number; // USD per 1M output tokens
  maxContextTokens: number;
  maxOutputTokens: number;
}

const GEMINI_MODELS: Record<CostTier, GeminiModelConfig> = {
  critical: {
    modelId: 'gemini-2.0-pro',
    inputPricePer1M: 1.25,
    outputPricePer1M: 5.00,
    maxContextTokens: 2_000_000,
    maxOutputTokens: 8192,
  },
  standard: {
    modelId: 'gemini-2.0-flash',
    inputPricePer1M: 0.10,
    outputPricePer1M: 0.40,
    maxContextTokens: 1_000_000,
    maxOutputTokens: 8192,
  },
  economy: {
    modelId: 'gemini-2.0-flash-lite',
    inputPricePer1M: 0.075,
    outputPricePer1M: 0.30,
    maxContextTokens: 1_000_000,
    maxOutputTokens: 8192,
  },
};

/** Embedding model — dedicated model for vector generation */
const EMBEDDING_MODEL = {
  modelId: 'text-embedding-004',
  dimensions: 768,
  maxInput: 2048,
  pricePer1M: 0.006, // Very cost-effective
};

// ============================================================================
// SECTION 3: GEMINI ADAPTER
// ============================================================================

export interface GeminiAdapterConfig {
  apiKey: string;
  baseUrl?: string;
  defaultTier: CostTier;
  timeoutMs?: number;
}

/**
 * GeminiAdapter: Google's AI provider for the Scholarly abstraction layer.
 *
 * Implements 5 capabilities. The adapter translates our unified request
 * format into Gemini's API format and maps responses back to our
 * standardised types. Cost tracking is calculated from token counts
 * using the pricing table above.
 */
export class GeminiAdapter {
  readonly providerId = 'gemini';
  readonly capabilities = ['textCompletion', 'assessment', 'vision', 'embedding', 'structuredOutput'] as const;

  private baseUrl: string;
  private timeoutMs: number;

  constructor(
    private config: GeminiAdapterConfig,
    private logger: Logger
  ) {
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
    this.timeoutMs = config.timeoutMs || 60000;
  }

  // --- Core API Call ---

  private async callGeminiAPI(
    modelId: string,
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<Result<Record<string, unknown>>> {
    const url = `${this.baseUrl}/models/${modelId}:${endpoint}?key=${this.config.apiKey}`;
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const errorBody = await response.text();
        this.logger.error({
          provider: 'gemini',
          model: modelId,
          status: response.status,
          error: errorBody,
        }, 'Gemini API error');

        return {
          success: false,
          error: {
            code: response.status === 429 ? 'RATE_LIMITED' : `GEMINI_${response.status}`,
            message: `Gemini API returned ${response.status}`,
            details: { status: response.status, body: errorBody, latencyMs: Date.now() - startTime },
          },
        };
      }

      const data = await response.json() as Record<string, unknown>;
      return { success: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      const isTimeout = message.includes('abort');

      this.logger.error({ err, provider: 'gemini', model: modelId }, 'Gemini API call failed');
      return {
        success: false,
        error: {
          code: isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR',
          message,
          details: { latencyMs: Date.now() - startTime },
        },
      };
    }
  }

  // --- Usage Extraction ---

  private extractUsage(data: Record<string, unknown>, modelConfig: GeminiModelConfig, startTime: number): UsageMetadata {
    const usageMetadata = data.usageMetadata as { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number } | undefined;

    const inputTokens = usageMetadata?.promptTokenCount || 0;
    const outputTokens = usageMetadata?.candidatesTokenCount || 0;
    const totalTokens = usageMetadata?.totalTokenCount || inputTokens + outputTokens;

    const inputCost = (inputTokens / 1_000_000) * modelConfig.inputPricePer1M;
    const outputCost = (outputTokens / 1_000_000) * modelConfig.outputPricePer1M;

    return {
      inputTokens,
      outputTokens,
      totalTokens,
      costUsd: inputCost + outputCost,
      latencyMs: Date.now() - startTime,
      provider: 'gemini',
      model: modelConfig.modelId,
    };
  }

  private extractText(data: Record<string, unknown>): { text: string; finishReason: string } {
    const candidates = data.candidates as Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }> | undefined;

    if (!candidates || candidates.length === 0) {
      return { text: '', finishReason: 'error' };
    }

    const candidate = candidates[0];
    const text = candidate.content?.parts?.map(p => p.text || '').join('') || '';
    const finishReason = candidate.finishReason || 'STOP';

    return {
      text,
      finishReason: finishReason === 'STOP' ? 'stop' :
                    finishReason === 'MAX_TOKENS' ? 'length' :
                    finishReason === 'SAFETY' ? 'safety' : 'stop',
    };
  }

  // --- Capability 1: Text Completion ---

  async complete(request: TextCompletionRequest): Promise<Result<TextCompletionResponse>> {
    const tier = request.costTier || this.config.defaultTier;
    const modelConfig = GEMINI_MODELS[tier];
    const startTime = Date.now();

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: {
        maxOutputTokens: Math.min(request.maxTokens || 4096, modelConfig.maxOutputTokens),
        temperature: request.temperature ?? 0.7,
        topP: request.topP ?? 0.95,
        ...(request.stopSequences ? { stopSequences: request.stopSequences } : {}),
      },
    };

    if (request.systemPrompt) {
      body.systemInstruction = { parts: [{ text: request.systemPrompt }] };
    }

    const result = await this.callGeminiAPI(modelConfig.modelId, 'generateContent', body);
    if (!result.success) return result as Result<TextCompletionResponse>;

    const { text, finishReason } = this.extractText(result.data);
    const usage = this.extractUsage(result.data, modelConfig, startTime);

    this.logger.info({
      provider: 'gemini',
      model: modelConfig.modelId,
      tier,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd: usage.costUsd,
      latencyMs: usage.latencyMs,
    }, 'Gemini text completion');

    return {
      success: true,
      data: {
        text,
        usage,
        finishReason: finishReason as TextCompletionResponse['finishReason'],
      },
    };
  }

  // --- Capability 2: Assessment ---

  async assess(request: AssessmentRequest): Promise<Result<AssessmentResponse>> {
    const tier = request.costTier || 'standard';
    const modelConfig = GEMINI_MODELS[tier];
    const startTime = Date.now();

    const rubricSection = request.rubric
      ? `\n\nRubric:\n${Object.entries(request.rubric)
          .map(([criterion, { description, maxScore }]) => `- ${criterion} (max ${maxScore}): ${description}`)
          .join('\n')}`
      : '';

    const prompt = `You are an educational assessment expert. Evaluate this student response.

Assessment Criteria: ${request.assessmentCriteria}${rubricSection}
${request.context ? `\nContext: ${request.context}` : ''}
${request.gradeLevel ? `\nGrade Level: ${request.gradeLevel}` : ''}

Student Response:
${request.studentResponse}

Respond ONLY with valid JSON in this exact format:
{
  "overallScore": <number>,
  "maxScore": <number>,
  "criteriaScores": { "<criterion>": { "score": <number>, "maxScore": <number>, "feedback": "<string>" } },
  "overallFeedback": "<string>",
  "strengths": ["<string>"],
  "areasForImprovement": ["<string>"]
}`;

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 4096,
        temperature: 0.3,
        responseMimeType: 'application/json',
      },
    };

    const result = await this.callGeminiAPI(modelConfig.modelId, 'generateContent', body);
    if (!result.success) return result as Result<AssessmentResponse>;

    const { text } = this.extractText(result.data);
    const usage = this.extractUsage(result.data, modelConfig, startTime);

    try {
      const parsed = JSON.parse(text);
      return {
        success: true,
        data: {
          overallScore: parsed.overallScore || 0,
          maxScore: parsed.maxScore || 100,
          criteriaScores: parsed.criteriaScores || {},
          overallFeedback: parsed.overallFeedback || '',
          strengths: parsed.strengths || [],
          areasForImprovement: parsed.areasForImprovement || [],
          usage,
        },
      };
    } catch (parseErr) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse assessment response as JSON',
          details: { raw: text },
        },
      };
    }
  }

  // --- Capability 3: Vision ---

  async analyzeImage(request: VisionRequest): Promise<Result<VisionResponse>> {
    const tier = request.costTier || 'standard';
    const modelConfig = GEMINI_MODELS[tier];
    const startTime = Date.now();

    const body: Record<string, unknown> = {
      contents: [{
        role: 'user',
        parts: [
          {
            inlineData: {
              mimeType: request.imageMediaType,
              data: request.imageData,
            },
          },
          { text: request.prompt },
        ],
      }],
      generationConfig: {
        maxOutputTokens: request.maxTokens || 4096,
        temperature: 0.4,
      },
    };

    if (request.systemPrompt) {
      body.systemInstruction = { parts: [{ text: request.systemPrompt }] };
    }

    const result = await this.callGeminiAPI(modelConfig.modelId, 'generateContent', body);
    if (!result.success) return result as Result<VisionResponse>;

    const { text } = this.extractText(result.data);
    const usage = this.extractUsage(result.data, modelConfig, startTime);

    this.logger.info({
      provider: 'gemini',
      model: modelConfig.modelId,
      capability: 'vision',
      latencyMs: usage.latencyMs,
    }, 'Gemini vision analysis');

    return { success: true, data: { text, usage } };
  }

  // --- Capability 4: Embedding ---

  async embed(request: EmbeddingRequest): Promise<Result<EmbeddingResponse>> {
    const startTime = Date.now();

    // Gemini embedding API uses a batch endpoint
    const body = {
      requests: request.texts.map(text => ({
        model: `models/${EMBEDDING_MODEL.modelId}`,
        content: { parts: [{ text }] },
        outputDimensionality: request.dimensions || EMBEDDING_MODEL.dimensions,
      })),
    };

    const url = `${this.baseUrl}/models/${EMBEDDING_MODEL.modelId}:batchEmbedContents?key=${this.config.apiKey}`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        return {
          success: false,
          error: {
            code: `GEMINI_EMBED_${response.status}`,
            message: `Embedding API returned ${response.status}`,
            details: { body: errorBody },
          },
        };
      }

      const data = await response.json() as {
        embeddings?: Array<{ values: number[] }>;
      };

      const embeddings = data.embeddings?.map(e => e.values) || [];

      // Estimate token count for cost calculation (~4 chars per token)
      const estimatedTokens = request.texts.reduce((sum, t) => sum + Math.ceil(t.length / 4), 0);

      const usage: UsageMetadata = {
        inputTokens: estimatedTokens,
        outputTokens: 0,
        totalTokens: estimatedTokens,
        costUsd: (estimatedTokens / 1_000_000) * EMBEDDING_MODEL.pricePer1M,
        latencyMs: Date.now() - startTime,
        provider: 'gemini',
        model: EMBEDDING_MODEL.modelId,
      };

      this.logger.info({
        provider: 'gemini',
        model: EMBEDDING_MODEL.modelId,
        textCount: request.texts.length,
        dimensions: request.dimensions || EMBEDDING_MODEL.dimensions,
        latencyMs: usage.latencyMs,
      }, 'Gemini embedding generated');

      return {
        success: true,
        data: { embeddings, model: EMBEDDING_MODEL.modelId, usage },
      };
    } catch (err) {
      return {
        success: false,
        error: {
          code: 'EMBED_ERROR',
          message: err instanceof Error ? err.message : 'Embedding error',
        },
      };
    }
  }

  // --- Capability 5: Structured Output ---

  async generateStructured(request: StructuredOutputRequest): Promise<Result<StructuredOutputResponse>> {
    const tier = request.costTier || this.config.defaultTier;
    const modelConfig = GEMINI_MODELS[tier];
    const startTime = Date.now();

    const body: Record<string, unknown> = {
      contents: [{ role: 'user', parts: [{ text: request.prompt }] }],
      generationConfig: {
        maxOutputTokens: request.maxTokens || 4096,
        temperature: request.temperature ?? 0.3,
        responseMimeType: 'application/json',
        responseSchema: request.schema,
      },
    };

    if (request.systemPrompt) {
      body.systemInstruction = { parts: [{ text: request.systemPrompt }] };
    }

    const result = await this.callGeminiAPI(modelConfig.modelId, 'generateContent', body);
    if (!result.success) return result as Result<StructuredOutputResponse>;

    const { text } = this.extractText(result.data);
    const usage = this.extractUsage(result.data, modelConfig, startTime);

    try {
      const parsed = JSON.parse(text);
      return {
        success: true,
        data: { data: parsed, raw: text, usage },
      };
    } catch {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Structured output was not valid JSON',
          details: { raw: text },
        },
      };
    }
  }

  // --- Utility: Cosine Similarity ---

  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) throw new Error('Vectors must have same dimensions');
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // --- Health Check ---

  async healthCheck(): Promise<Result<{ healthy: boolean; latencyMs: number }>> {
    const startTime = Date.now();
    try {
      const result = await this.complete({
        prompt: 'Respond with the single word: healthy',
        maxTokens: 10,
        costTier: 'economy',
      });

      return {
        success: true,
        data: {
          healthy: result.success,
          latencyMs: Date.now() - startTime,
        },
      };
    } catch (err) {
      return {
        success: true,
        data: { healthy: false, latencyMs: Date.now() - startTime },
      };
    }
  }
}
