/**
 * Scholarly Platform — Claude Provider Adapter
 * =============================================
 *
 * AI-004: The Claude adapter translates Scholarly's capability interfaces
 * into Anthropic API calls. Claude serves as the primary provider for
 * text generation, assessment, content safety, and structured output.
 *
 * ## Pricing (as of early 2026)
 *
 * - Claude Opus 4.5:   $15/$75 per 1M tokens (input/output)
 * - Claude Sonnet 4.5:  $3/$15 per 1M tokens (input/output)
 * - Claude Haiku 4.5:  $0.80/$4 per 1M tokens (input/output)
 *
 * The adapter tracks token usage and computes costs per request for
 * the cost attribution system.
 *
 * @module ai-abstraction/adapters/claude-adapter
 * @version 1.0.0
 */

import Anthropic from '@anthropic-ai/sdk';
import { Logger } from 'pino';
import {
  ProviderId,
  AIResult,
  AIUsageMetadata,
  CostTier,
  ITextCompletionProvider,
  IAssessmentProvider,
  IContentSafetyProvider,
  IStructuredOutputProvider,
  TextCompletionRequest,
  TextCompletionResponse,
  AssessmentRequest,
  AssessmentResponse,
  ContentSafetyRequest,
  ContentSafetyResponse,
  StructuredOutputRequest,
  StructuredOutputResponse,
} from '../capability-interfaces';

// ============================================================================
// SECTION 1: CONFIGURATION & COST MODEL
// ============================================================================

export interface ClaudeAdapterConfig {
  apiKey: string;
  defaultModel: string;
  maxRetries: number;
  timeoutMs: number;
  logger: Logger;
}

/** Cost per 1M tokens for each Claude model. */
const CLAUDE_PRICING: Record<string, { inputPer1M: number; outputPer1M: number }> = {
  'claude-opus-4-5-20250514': { inputPer1M: 15.0, outputPer1M: 75.0 },
  'claude-sonnet-4-5-20250514': { inputPer1M: 3.0, outputPer1M: 15.0 },
  'claude-haiku-4-5-20251001': { inputPer1M: 0.8, outputPer1M: 4.0 },
};

/** Maps cost tiers to Claude models. */
const TIER_TO_MODEL: Record<CostTier, string> = {
  critical: 'claude-opus-4-5-20250514',
  standard: 'claude-sonnet-4-5-20250514',
  economy: 'claude-haiku-4-5-20251001',
};

// ============================================================================
// SECTION 2: CLAUDE ADAPTER
// ============================================================================

export class ClaudeAdapter
  implements ITextCompletionProvider, IAssessmentProvider, IContentSafetyProvider, IStructuredOutputProvider
{
  readonly providerId: ProviderId = 'anthropic';
  readonly capabilities = ['text-completion', 'assessment', 'content-safety', 'structured-output'] as const;

  private readonly client: Anthropic;
  private readonly config: ClaudeAdapterConfig;
  private readonly logger: Logger;

  constructor(config: ClaudeAdapterConfig) {
    this.config = config;
    this.logger = config.logger.child({ module: 'ClaudeAdapter' });
    this.client = new Anthropic({
      apiKey: config.apiKey,
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
      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.7,
        top_p: request.topP,
        stop_sequences: request.stopSequences,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const usage = this.buildUsage(model, response.usage, startTime, request.tier);

      return {
        success: true,
        data: {
          text,
          finishReason: response.stop_reason === 'max_tokens' ? 'max_tokens' : 'stop',
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
Return your assessment as a JSON object with this exact structure:
{
  "scores": [{"criterionName": "...", "score": N, "maxScore": N, "justification": "..."}],
  "totalScore": N,
  "maxTotalScore": N,
  "overallFeedback": "...",
  "strengths": ["..."],
  "areasForImprovement": ["..."],
  ${request.includeExemplar ? '"exemplarExcerpt": "...",' : ''}
  "gradeDescriptor": "..."
}
Be encouraging, specific, and constructive. Use language appropriate for the year level.`;

    const userPrompt = `## Task Description
${request.taskDescription}

## Assessment Criteria
${request.criteria.map((c) => `### ${c.name} (max ${c.maxScore} marks)
${c.description}
Rubric levels:
${c.rubricLevels.map((l) => `- ${l.score}/${c.maxScore}: ${l.descriptor}`).join('\n')}`).join('\n\n')}

## Student Submission
${request.submission}

Please assess this submission against ALL criteria above and return the JSON response.`;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        temperature: 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const usage = this.buildUsage(model, response.usage, startTime, request.tier);

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found in response');
        const parsed = JSON.parse(jsonMatch[0]) as AssessmentResponse;

        return { success: true, data: parsed, usage };
      } catch (parseErr) {
        this.logger.warn({ parseErr, responseText: text.slice(0, 500) }, 'Failed to parse assessment response');
        return {
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: 'Failed to parse assessment response as JSON',
            provider: this.providerId,
            retryable: true,
          },
          usage,
        };
      }
    } catch (err) {
      return this.handleError<AssessmentResponse>(err as Error, model, startTime, request.tier);
    }
  }

  // --------------------------------------------------------------------------
  // Content Safety
  // --------------------------------------------------------------------------

  async checkSafety(request: ContentSafetyRequest): Promise<AIResult<ContentSafetyResponse>> {
    const model = this.resolveModel('standard');
    const startTime = Date.now();

    const systemPrompt = `You are a content safety reviewer for the Scholarly educational platform.
Your audience is children aged ${request.ageRange.min} to ${request.ageRange.max}.
Review the content for safety issues and return a JSON object:
{
  "safe": boolean,
  "overallSeverity": "none"|"low"|"medium"|"high",
  "categories": [{"category": "...", "severity": "none"|"low"|"medium"|"high", "confidence": 0.0-1.0, "explanation": "..."}],
  "ageAppropriate": boolean,
  "suggestedModifications": "..." or null,
  "flaggedPhrases": [{"phrase": "...", "reason": "..."}]
}

Categories to check: violence, sexual_content, hate_speech, self_harm, bullying, substance_use, fear_inducing, culturally_insensitive, age_inappropriate_concepts, bias.
Be strict — when in doubt, flag. These are children.`;

    const userPrompt = `Content type: ${request.contentType}
${request.context ? `Context: ${request.context}` : ''}

Content to review:
${request.content}`;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 2048,
        temperature: 0.1,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const usage = this.buildUsage(model, response.usage, startTime, 'standard');

      try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found');
        const parsed = JSON.parse(jsonMatch[0]) as ContentSafetyResponse;
        return { success: true, data: parsed, usage };
      } catch (parseErr) {
        return {
          success: false,
          error: { code: 'PARSE_ERROR', message: 'Failed to parse safety response', provider: this.providerId, retryable: true },
          usage,
        };
      }
    } catch (err) {
      return this.handleError<ContentSafetyResponse>(err as Error, model, startTime, 'standard');
    }
  }

  // --------------------------------------------------------------------------
  // Structured Output
  // --------------------------------------------------------------------------

  async generate(request: StructuredOutputRequest): Promise<AIResult<StructuredOutputResponse>> {
    const model = this.resolveModel(request.tier);
    const startTime = Date.now();

    const systemPrompt = `${request.systemPrompt}

IMPORTANT: You MUST respond with ONLY a valid JSON object that conforms to the following JSON schema. Do not include any other text, markdown formatting, or explanation.

JSON Schema:
${JSON.stringify(request.schema, null, 2)}`;

    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.3,
        system: systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      });

      const text = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('');

      const usage = this.buildUsage(model, response.usage, startTime, request.tier);

      try {
        const cleaned = text.replace(/```json\s*|```\s*/g, '').trim();
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No JSON object found');
        const data = JSON.parse(jsonMatch[0]);

        return {
          success: true,
          data: { data, raw: text, schemaValid: true },
          usage,
        };
      } catch (parseErr) {
        return {
          success: false,
          error: { code: 'PARSE_ERROR', message: 'Response is not valid JSON', provider: this.providerId, retryable: true },
          usage,
        };
      }
    } catch (err) {
      return this.handleError<StructuredOutputResponse>(err as Error, model, startTime, request.tier);
    }
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
    apiUsage: { input_tokens: number; output_tokens: number },
    startTime: number,
    tier?: CostTier,
  ): AIUsageMetadata {
    const pricing = CLAUDE_PRICING[model] ?? { inputPer1M: 3.0, outputPer1M: 15.0 };
    const costUsd =
      (apiUsage.input_tokens / 1_000_000) * pricing.inputPer1M +
      (apiUsage.output_tokens / 1_000_000) * pricing.outputPer1M;

    return {
      provider: this.providerId,
      model,
      inputTokens: apiUsage.input_tokens,
      outputTokens: apiUsage.output_tokens,
      totalTokens: apiUsage.input_tokens + apiUsage.output_tokens,
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
      error.message.includes('overloaded') ||
      error.message.includes('timeout') ||
      error.message.includes('ECONNREFUSED');

    this.logger.error({ err: error, model, durationMs }, 'Claude API error');

    return {
      success: false,
      error: {
        code: 'PROVIDER_ERROR',
        message: error.message,
        provider: this.providerId,
        retryable: isRetryable,
      },
      usage: {
        provider: this.providerId,
        model,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costUsd: 0,
        durationMs,
        cached: false,
        tier: tier ?? 'standard',
      },
    };
  }
}
