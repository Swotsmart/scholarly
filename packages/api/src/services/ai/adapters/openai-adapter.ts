/**
 * Scholarly Platform — OpenAI Provider Adapter
 * =============================================
 *
 * AI-005: The OpenAI adapter serves as the primary fallback for text
 * generation and assessment, plus the primary provider for vision,
 * embeddings, and image generation (GPT Image for storybook illustrations).
 *
 * ## Pricing (as of early 2026)
 *
 * - GPT-4o:      $2.50/$10 per 1M tokens (input/output)
 * - GPT-4o-mini: $0.15/$0.60 per 1M tokens
 * - GPT Image:   ~$0.04 per standard image, ~$0.08 per HD
 * - Embeddings:  $0.02 per 1M tokens (text-embedding-3-small)
 *
 * @module ai-abstraction/adapters/openai-adapter
 * @version 1.0.0
 */

import OpenAI from 'openai';
import { Logger } from 'pino';
import {
  ProviderId,
  AIResult,
  AIUsageMetadata,
  CostTier,
  ITextCompletionProvider,
  IAssessmentProvider,
  IVisionProvider,
  IEmbeddingProvider,
  IStructuredOutputProvider,
  IImageGenerationProvider,
  TextCompletionRequest,
  TextCompletionResponse,
  AssessmentRequest,
  AssessmentResponse,
  VisionRequest,
  VisionResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  SimilarityRequest,
  SimilarityResponse,
  StructuredOutputRequest,
  StructuredOutputResponse,
  ImageGenerationRequest,
  ImageGenerationResponse,
} from '../capability-interfaces';

// ============================================================================
// SECTION 1: CONFIGURATION & COST MODEL
// ============================================================================

export interface OpenAIAdapterConfig {
  apiKey: string;
  defaultModel: string;
  organizationId?: string;
  maxRetries: number;
  timeoutMs: number;
  logger: Logger;
}

const OPENAI_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10.0 },
  'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
  'gpt-4.1': { inputPer1M: 2.0, outputPer1M: 8.0 },
  'gpt-4.1-mini': { inputPer1M: 0.4, outputPer1M: 1.6 },
  'text-embedding-3-small': { inputPer1M: 0.02, outputPer1M: 0 },
  'text-embedding-3-large': { inputPer1M: 0.13, outputPer1M: 0 },
};

const TIER_TO_MODEL: Record<CostTier, string> = {
  critical: 'gpt-4o',
  standard: 'gpt-4o',
  economy: 'gpt-4o-mini',
};

const IMAGE_PRICING: Record<string, number> = {
  'gpt-image-1': 0.04,
  'dall-e-3-standard': 0.04,
  'dall-e-3-hd': 0.08,
};

// ============================================================================
// SECTION 2: OPENAI ADAPTER
// ============================================================================

export class OpenAIAdapter
  implements
    ITextCompletionProvider,
    IAssessmentProvider,
    IVisionProvider,
    IEmbeddingProvider,
    IStructuredOutputProvider,
    IImageGenerationProvider
{
  readonly providerId: ProviderId = 'openai';
  readonly capabilities = [
    'text-completion', 'assessment', 'vision', 'embedding', 'structured-output', 'image-generation',
  ] as const;

  private readonly client: OpenAI;
  private readonly config: OpenAIAdapterConfig;
  private readonly logger: Logger;

  constructor(config: OpenAIAdapterConfig) {
    this.config = config;
    this.logger = config.logger.child({ module: 'OpenAIAdapter' });
    this.client = new OpenAI({
      apiKey: config.apiKey,
      organization: config.organizationId,
      maxRetries: config.maxRetries,
      timeout: config.timeoutMs,
    });
  }

  // --------------------------------------------------------------------------
  // Text Completion
  // --------------------------------------------------------------------------

  async complete(request: TextCompletionRequest): Promise<AIResult<TextCompletionResponse>> {
    const model = this.resolveModel(request.tier);
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP,
        stop: request.stopSequences,
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
      });

      const choice = response.choices[0];
      const usage = this.buildUsage(model, response.usage, startTime, request.tier);

      return {
        success: true,
        data: {
          text: choice?.message?.content ?? '',
          finishReason: choice?.finish_reason === 'length' ? 'max_tokens'
            : choice?.finish_reason === 'content_filter' ? 'content_filter' : 'stop',
        },
        usage,
      };
    } catch (err) {
      return this.handleError<TextCompletionResponse>(err as Error, model, startTime, request.tier);
    }
  }

  // --------------------------------------------------------------------------
  // Assessment
  // --------------------------------------------------------------------------

  async assess(request: AssessmentRequest): Promise<AIResult<AssessmentResponse>> {
    const model = this.resolveModel(request.tier ?? 'standard');
    const startTime = Date.now();

    const systemPrompt = `You are an expert educational assessor for the Scholarly platform.
Assess the student submission against the provided rubric criteria.
The student is in Year ${request.yearLevel}, studying ${request.subject}.
Return your assessment as a valid JSON object with this structure:
{"scores":[{"criterionName":"...","score":N,"maxScore":N,"justification":"..."}],"totalScore":N,"maxTotalScore":N,"overallFeedback":"...","strengths":["..."],"areasForImprovement":["..."],"gradeDescriptor":"..."}`;

    const userPrompt = `Task: ${request.taskDescription}\n\nCriteria:\n${request.criteria.map((c) =>
      `${c.name} (max ${c.maxScore}): ${c.description}`).join('\n')}\n\nSubmission:\n${request.submission}`;

    try {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: 4096,
        temperature: 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      });

      const text = response.choices[0]?.message?.content ?? '';
      const usage = this.buildUsage(model, response.usage, startTime, request.tier);

      try {
        const parsed = JSON.parse(text) as AssessmentResponse;
        return { success: true, data: parsed, usage };
      } catch {
        return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid JSON', provider: this.providerId, retryable: true }, usage };
      }
    } catch (err) {
      return this.handleError<AssessmentResponse>(err as Error, model, startTime, request.tier);
    }
  }

  // --------------------------------------------------------------------------
  // Vision
  // --------------------------------------------------------------------------

  async analyzeImage(request: VisionRequest): Promise<AIResult<VisionResponse>> {
    const model = 'gpt-4o';
    const startTime = Date.now();

    const imageContent: OpenAI.Chat.Completions.ChatCompletionContentPartImage = {
      type: 'image_url',
      image_url: {
        url: request.imageUrl ?? `data:${request.imageMimeType ?? 'image/png'};base64,${request.imageBase64}`,
        detail: 'high',
      },
    };

    try {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: request.maxTokens ?? 2048,
        messages: [{
          role: 'user',
          content: [
            imageContent,
            { type: 'text', text: request.prompt },
          ],
        }],
      });

      const text = response.choices[0]?.message?.content ?? '';
      const usage = this.buildUsage(model, response.usage, startTime, request.tier);

      return { success: true, data: { text }, usage };
    } catch (err) {
      return this.handleError<VisionResponse>(err as Error, model, startTime, request.tier);
    }
  }

  // --------------------------------------------------------------------------
  // Embedding
  // --------------------------------------------------------------------------

  async embed(request: EmbeddingRequest): Promise<AIResult<EmbeddingResponse>> {
    const model = request.model ?? 'text-embedding-3-small';
    const startTime = Date.now();

    try {
      const response = await this.client.embeddings.create({
        model,
        input: request.texts,
        dimensions: request.dimensions,
      });

      const embeddings = response.data.map((d) => d.embedding);
      const totalTokens = response.usage?.total_tokens ?? 0;

      const pricing = OPENAI_PRICING[model] ?? { inputPer1M: 0.02, outputPer1M: 0 };
      const costUsd = (totalTokens / 1_000_000) * pricing.inputPer1M;

      return {
        success: true,
        data: {
          embeddings,
          model,
          dimensions: embeddings[0]?.length ?? 0,
        },
        usage: {
          provider: this.providerId,
          model,
          inputTokens: totalTokens,
          outputTokens: 0,
          totalTokens,
          costUsd,
          durationMs: Date.now() - startTime,
          cached: false,
          tier: request.tier ?? 'standard',
        },
      };
    } catch (err) {
      return this.handleError<EmbeddingResponse>(err as Error, model, startTime, request.tier);
    }
  }

  async similarity(request: SimilarityRequest): Promise<AIResult<SimilarityResponse>> {
    const scores = request.candidateEmbeddings.map((candidate, index) => ({
      index,
      score: this.cosineSimilarity(request.queryEmbedding, candidate),
    }));

    scores.sort((a, b) => b.score - a.score);
    const topK = request.topK ?? scores.length;

    return {
      success: true,
      data: { scores: scores.slice(0, topK) },
      usage: {
        provider: this.providerId,
        model: 'local-computation',
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        durationMs: 0,
        cached: false,
        tier: request.tier ?? 'economy',
      },
    };
  }

  private cosineSimilarity(a: number[], b: number[]): number {
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

  // --------------------------------------------------------------------------
  // Structured Output
  // --------------------------------------------------------------------------

  async generate(request: StructuredOutputRequest): Promise<AIResult<StructuredOutputResponse>> {
    const model = this.resolveModel(request.tier);
    const startTime = Date.now();

    try {
      const response = await this.client.chat.completions.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.3,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${request.systemPrompt}\n\nRespond with a JSON object conforming to this schema:\n${JSON.stringify(request.schema)}` },
          { role: 'user', content: request.userPrompt },
        ],
      });

      const text = response.choices[0]?.message?.content ?? '';
      const usage = this.buildUsage(model, response.usage, startTime, request.tier);

      try {
        const data = JSON.parse(text);
        return { success: true, data: { data, raw: text, schemaValid: true }, usage };
      } catch {
        return { success: false, error: { code: 'PARSE_ERROR', message: 'Invalid JSON', provider: this.providerId, retryable: true }, usage };
      }
    } catch (err) {
      return this.handleError<StructuredOutputResponse>(err as Error, model, startTime, request.tier);
    }
  }

  // --------------------------------------------------------------------------
  // Image Generation
  // --------------------------------------------------------------------------

  async generateImage(request: ImageGenerationRequest): Promise<AIResult<ImageGenerationResponse>> {
    const model = 'gpt-image-1';
    const startTime = Date.now();

    try {
      const response = await this.client.images.generate({
        model,
        prompt: request.prompt,
        n: request.count ?? 1,
        size: `${request.width ?? 1024}x${request.height ?? 1024}` as '1024x1024',
        response_format: 'b64_json',
      });

      const images = response.data.map((img) => ({
        base64: img.b64_json ?? '',
        mimeType: 'image/png',
        revisedPrompt: img.revised_prompt,
      }));

      const costPerImage = IMAGE_PRICING[model] ?? 0.04;
      const totalCost = costPerImage * images.length;

      return {
        success: true,
        data: { images },
        usage: {
          provider: this.providerId,
          model,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          costUsd: totalCost,
          durationMs: Date.now() - startTime,
          cached: false,
          tier: request.tier ?? 'standard',
        },
      };
    } catch (err) {
      return this.handleError<ImageGenerationResponse>(err as Error, model, startTime, request.tier);
    }
  }

  // Alias for the IImageGenerationProvider interface
  async generate_image(request: ImageGenerationRequest): Promise<AIResult<ImageGenerationResponse>> {
    return this.generateImage(request);
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private resolveModel(tier?: CostTier): string {
    if (tier && TIER_TO_MODEL[tier]) return TIER_TO_MODEL[tier];
    return this.config.defaultModel;
  }

  private buildUsage(
    model: string,
    apiUsage: OpenAI.Completions.CompletionUsage | undefined,
    startTime: number,
    tier?: CostTier,
  ): AIUsageMetadata {
    const inputTokens = apiUsage?.prompt_tokens ?? 0;
    const outputTokens = apiUsage?.completion_tokens ?? 0;
    const pricing = OPENAI_PRICING[model] ?? { inputPer1M: 2.5, outputPer1M: 10.0 };
    const costUsd =
      (inputTokens / 1_000_000) * pricing.inputPer1M +
      (outputTokens / 1_000_000) * pricing.outputPer1M;

    return {
      provider: this.providerId,
      model,
      inputTokens,
      outputTokens,
      totalTokens: inputTokens + outputTokens,
      costUsd,
      durationMs: Date.now() - startTime,
      cached: false,
      tier: tier ?? 'standard',
    };
  }

  private handleError<T>(error: Error, model: string, startTime: number, tier?: CostTier): AIResult<T> {
    const durationMs = Date.now() - startTime;
    const isRetryable =
      error.message.includes('rate_limit') ||
      error.message.includes('429') ||
      error.message.includes('500') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED');

    this.logger.error({ err: error, model, durationMs }, 'OpenAI API error');

    return {
      success: false,
      error: { code: 'PROVIDER_ERROR', message: error.message, provider: this.providerId, retryable: isRetryable },
      usage: {
        provider: this.providerId, model, inputTokens: 0, outputTokens: 0, totalTokens: 0,
        costUsd: 0, durationMs, cached: false, tier: tier ?? 'standard',
      },
    };
  }
}
