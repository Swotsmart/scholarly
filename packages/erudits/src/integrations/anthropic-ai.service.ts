/**
 * ============================================================================
 * Anthropic AI Service — Production Integration
 * ============================================================================
 *
 * Implements the AIService interface using Claude for text completions and
 * GPT Image (via OpenAI SDK) for image generation. Think of this as the
 * brain of the platform: when a book club needs discussion questions, when
 * the publishing engine needs curriculum-aligned content, or when a cover
 * needs generating — this is the module that makes it happen.
 *
 * The dual-provider design reflects Scholarly's architectural principle of
 * using the best tool for each job: Claude for reasoning and text quality,
 * GPT Image for visual generation. Both are wrapped behind the same
 * AIService interface so the consuming services don't know or care which
 * model is handling their request.
 *
 * ## Environment Variables
 *   ANTHROPIC_API_KEY     — Anthropic API key for Claude
 *   OPENAI_API_KEY        — OpenAI API key for GPT Image
 *   AI_DEFAULT_MODEL      — Default Claude model (e.g., 'claude-sonnet-4-5-20250929')
 *   AI_IMAGE_MODEL        — Default image model (e.g., 'gpt-image-1')
 *
 * ## Cost Tracking
 *   Every call returns { cost } in USD, calculated from token counts and
 *   current pricing. The consuming service stores this for analytics and
 *   billing — essential for understanding per-book and per-resource costs.
 *
 * @module erudits/integrations/anthropic-ai
 * @version 1.0.0
 */

import type { AIService } from '../types/erudits.types';
import { Errors } from '../types/erudits.types';

// ============================================================================
// SDK TYPE STUBS
// ============================================================================

/**
 * Minimal Anthropic SDK interface. We type at the boundary to avoid
 * importing the full SDK types into the compilation.
 */
interface AnthropicSDK {
  messages: {
    create(params: {
      model: string;
      max_tokens: number;
      temperature: number;
      system: string;
      messages: Array<{ role: 'user' | 'assistant'; content: string }>;
    }): Promise<AnthropicResponse>;
  };
}

interface AnthropicResponse {
  id: string;
  content: Array<{ type: string; text?: string }>;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
  model: string;
  stop_reason: string;
}

/**
 * Minimal OpenAI SDK interface for image generation only.
 */
interface OpenAISDK {
  images: {
    generate(params: {
      model: string;
      prompt: string;
      size: string;
      quality?: string | undefined;
      n?: number | undefined;
      response_format?: string | undefined;
    }): Promise<{
      data: Array<{ url?: string; b64_json?: string }>;
    }>;
  };
}

// ============================================================================
// PRICING TABLES
// ============================================================================

/**
 * Token pricing per million tokens (USD). Updated for current models.
 * These are used to calculate the cost field returned with every response,
 * which feeds into the platform's usage analytics and billing calculations.
 */
const CLAUDE_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250929': { input: 3.00, output: 15.00 },
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-opus-4-5-20250929': { input: 15.00, output: 75.00 },
};

const IMAGE_PRICING: Record<string, Record<string, number>> = {
  'gpt-image-1': {
    '1024x1024': 0.04,
    '1024x1536': 0.06,
    '1536x1024': 0.06,
    'auto': 0.04,
  },
  'dall-e-3': {
    '1024x1024': 0.04,
    '1024x1792': 0.08,
    '1792x1024': 0.08,
  },
};

// ============================================================================
// IMPLEMENTATION
// ============================================================================

export class AnthropicAIServiceImpl implements AIService {
  constructor(
    private readonly anthropic: AnthropicSDK,
    private readonly openai: OpenAISDK,
    private readonly defaultModel: string = 'claude-sonnet-4-5-20250929',
    private readonly defaultImageModel: string = 'gpt-image-1',
  ) {}

  // ── Text Completion ──

  async complete(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
    temperature: number;
    responseFormat?: 'json' | 'text' | undefined;
  }): Promise<{ text: string; tokensUsed: number; cost: number }> {
    try {
      // If JSON format requested, append instruction to system prompt
      const systemPrompt = params.responseFormat === 'json'
        ? `${params.systemPrompt}\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no commentary, no code fences.`
        : params.systemPrompt;

      const response = await this.anthropic.messages.create({
        model: this.defaultModel,
        max_tokens: params.maxTokens,
        temperature: params.temperature,
        system: systemPrompt,
        messages: [{ role: 'user', content: params.userPrompt }],
      });

      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text ?? '')
        .join('');

      const totalTokens = response.usage.input_tokens + response.usage.output_tokens;
      const cost = this.calculateTextCost(
        response.usage.input_tokens,
        response.usage.output_tokens,
        this.defaultModel,
      );

      return { text, tokensUsed: totalTokens, cost };
    } catch (err) {
      const error = err as Error & { status?: number };
      if (error.status === 429) {
        throw Errors.rateLimited('Anthropic API rate limit exceeded');
      }
      throw Errors.external('Anthropic', error.message);
    }
  }

  // ── Image Generation ──

  async generateImage(params: {
    prompt: string;
    size: string;
    model: string;
    quality?: string | undefined;
  }): Promise<{ imageUrl: string; cost: number }> {
    try {
      const model = params.model || this.defaultImageModel;

      const response = await this.openai.images.generate({
        model,
        prompt: params.prompt,
        size: params.size as '1024x1024' | '1024x1536' | '1536x1024',
        quality: params.quality as 'low' | 'medium' | 'high' | undefined,
        n: 1,
        response_format: 'url',
      });

      const imageUrl = response.data[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL in response');
      }

      const cost = this.calculateImageCost(model, params.size);

      return { imageUrl, cost };
    } catch (err) {
      const error = err as Error & { status?: number };
      if (error.status === 429) {
        throw Errors.rateLimited('OpenAI API rate limit exceeded');
      }
      throw Errors.external('OpenAI Image', error.message);
    }
  }

  // ── Cost Calculation ──

  private calculateTextCost(
    inputTokens: number,
    outputTokens: number,
    model: string,
  ): number {
    const pricing = CLAUDE_PRICING[model] ?? CLAUDE_PRICING['claude-sonnet-4-5-20250929']!;
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000; // 6 decimal places
  }

  private calculateImageCost(model: string, size: string): number {
    const modelPricing = IMAGE_PRICING[model];
    if (!modelPricing) return 0.04; // Fallback to standard pricing
    return modelPricing[size] ?? modelPricing['1024x1024'] ?? 0.04;
  }
}

// ============================================================================
// FACTORY
// ============================================================================

/**
 * Create a production AI service.
 *
 * Usage:
 *   import Anthropic from '@anthropic-ai/sdk';
 *   import OpenAI from 'openai';
 *   const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
 *   const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
 *   const ai = createAnthropicAIService(anthropic, openai);
 */
export function createAnthropicAIService(
  anthropic: AnthropicSDK,
  openai: OpenAISDK,
  options?: {
    defaultModel?: string | undefined;
    defaultImageModel?: string | undefined;
  },
): AnthropicAIServiceImpl {
  return new AnthropicAIServiceImpl(
    anthropic,
    openai,
    options?.defaultModel,
    options?.defaultImageModel,
  );
}
