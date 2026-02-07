/**
 * =============================================================================
 * SCHOLARLY PLATFORM — AI Provider Integration for Storybook Engine
 * =============================================================================
 *
 * Sprint 5, PW-005: The bridge between the Storybook Engine's business logic
 * and real AI provider API calls. Sprint 1 built the abstraction layer with
 * capability interfaces and provider adapters. Sprint 2 built the narrative
 * generator and decodability engine. Sprint 3 built the illustration and
 * narration pipelines. This file wires them all together into a single
 * orchestration service that takes a "generate this book" request and
 * produces a complete storybook with narrative, illustrations, audio, and
 * validated curriculum metadata.
 *
 * Like a film production coordinator who brings together the screenwriter,
 * the cinematographer, and the sound engineer — this service sequences the
 * AI calls, handles failures at each stage, tracks costs, and emits events
 * for every milestone.
 *
 * Total: ~1,050 lines
 * =============================================================================
 */

import { randomUUID } from 'crypto';

// =============================================================================
// AI CAPABILITY INTERFACES (from Sprint 1 abstraction layer)
// =============================================================================

interface ITextCompletionProvider {
  complete(params: {
    systemPrompt: string;
    userPrompt: string;
    maxTokens: number;
    temperature: number;
    costTier: 'critical' | 'standard' | 'economy';
  }): Promise<{
    text: string;
    usage: { inputTokens: number; outputTokens: number; costUsd: number };
    model: string;
    latencyMs: number;
  }>;
}

interface IImageGenerationProvider {
  generate(params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    style?: string;
    seed?: number;
  }): Promise<{
    imageUrl: string;
    revisedPrompt?: string;
    costUsd: number;
    latencyMs: number;
    model: string;
  }>;
}

interface ISpeechProvider {
  synthesize(params: {
    text: string;
    voiceId: string;
    speed?: number;
    outputFormat?: string;
  }): Promise<{
    audioUrl: string;
    durationSeconds: number;
    costUsd: number;
    latencyMs: number;
  }>;
  getWordTimestamps(params: {
    text: string;
    audioUrl: string;
  }): Promise<Array<{ word: string; startMs: number; endMs: number }>>;
}

interface IContentSafetyProvider {
  check(params: {
    text: string;
    context: 'children' | 'general';
  }): Promise<{
    safe: boolean;
    categories: Record<string, { flagged: boolean; score: number }>;
    reasoning?: string;
  }>;
  checkImage(params: {
    imageUrl: string;
    context: 'children' | 'general';
  }): Promise<{
    safe: boolean;
    categories: Record<string, { flagged: boolean; score: number }>;
  }>;
}

// =============================================================================
// STORYBOOK GENERATION REQUEST & RESULT
// =============================================================================

interface StorybookGenerationRequest {
  tenantId: string;
  creatorId: string;

  // Phonics fingerprint
  phonicsPhase: string;           // e.g. 'PHASE_3'
  targetGpcs: string[];           // GPCs this book should practise
  taughtGpcSet: string[];         // All GPCs the learner knows
  trickyWords?: string[];         // High-frequency irregular words to include

  // Reader profile
  ageGroupMin: number;
  ageGroupMax: number;
  wcpmTarget?: number;            // Target words-correct-per-minute

  // Creative parameters
  themes: string[];               // e.g. ['space', 'friendship']
  artStyle: string;               // e.g. 'WATERCOLOUR'
  narrativeTemplate: string;      // e.g. 'ADVENTURE_QUEST'
  culturalContext: string;        // e.g. 'AUSTRALIAN'
  pageCount: number;              // Typically 8–24

  // Character continuity
  characters?: Array<{
    name: string;
    description: string;
    personalityTraits: string[];
    role: string;
    styleSheetPrompt?: string;
    voiceId?: string;
  }>;

  // Series
  seriesId?: string;
  seriesOrder?: number;
  previousStoryContext?: string;  // Summary of previous book for continuity

  // Configuration
  decodabilityThreshold?: number; // Default 0.85
  maxRegenerationAttempts?: number; // Default 3
  voiceId?: string;               // ElevenLabs voice for narration
  narrationSpeed?: number;        // 0.5–2.0
}

interface StorybookGenerationResult {
  storybookId: string;
  title: string;
  synopsis: string;
  pages: Array<{
    pageNumber: number;
    text: string;
    illustrationUrl: string | null;
    audioUrl: string | null;
    wordTimestamps: Array<{ word: string; startMs: number; endMs: number }> | null;
    pageGpcs: string[];
    decodableWords: string[];
    nonDecodableWords: string[];
  }>;
  metadata: {
    decodabilityScore: number;
    wordCount: number;
    sentenceCount: number;
    vocabularyTier: string;
    morphemeFocus: string[];
    comprehensionStrand: string;
  };
  costs: {
    narrative: number;
    illustrations: number;
    narration: number;
    safety: number;
    total: number;
  };
  timing: {
    narrativeMs: number;
    illustrationsMs: number;
    narrationMs: number;
    totalMs: number;
  };
  generationModel: string;
  status: 'complete' | 'partial' | 'failed';
  errors: string[];
}

// =============================================================================
// STORYBOOK GENERATION ORCHESTRATOR
// =============================================================================

export class StorybookGenerationOrchestrator {
  constructor(
    private readonly textProvider: ITextCompletionProvider,
    private readonly imageProvider: IImageGenerationProvider,
    private readonly speechProvider: ISpeechProvider,
    private readonly safetyProvider: IContentSafetyProvider,
    private readonly config: {
      maxConcurrentIllustrations: number;
      maxConcurrentNarrations: number;
      illustrationWidth: number;
      illustrationHeight: number;
      defaultVoiceId: string;
      defaultNarrationSpeed: number;
    }
  ) {}

  /**
   * Generate a complete storybook: narrative → safety check → illustrations →
   * narration → word timestamps. Each stage can fail independently; the
   * orchestrator continues with partial results and reports what succeeded.
   */
  async generate(request: StorybookGenerationRequest): Promise<StorybookGenerationResult> {
    const storybookId = randomUUID();
    const startTime = Date.now();
    const costs = { narrative: 0, illustrations: 0, narration: 0, safety: 0, total: 0 };
    const timing = { narrativeMs: 0, illustrationsMs: 0, narrationMs: 0, totalMs: 0 };
    const errors: string[] = [];
    const decodabilityThreshold = request.decodabilityThreshold ?? 0.85;
    const maxRetries = request.maxRegenerationAttempts ?? 3;

    // -----------------------------------------------------------------------
    // STAGE 1: Generate Narrative
    // -----------------------------------------------------------------------
    let narrativeResult: NarrativeResult | null = null;
    const narrativeStart = Date.now();

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        narrativeResult = await this.generateNarrative(request, attempt);
        costs.narrative += narrativeResult.costUsd;

        // Validate decodability
        if (narrativeResult.decodabilityScore >= decodabilityThreshold) {
          break; // Passes threshold
        }

        if (attempt < maxRetries - 1) {
          // Regenerate with stricter constraints
          errors.push(
            `Narrative attempt ${attempt + 1}: decodability ${(narrativeResult.decodabilityScore * 100).toFixed(1)}% ` +
            `below threshold ${(decodabilityThreshold * 100).toFixed(1)}%, regenerating`
          );
          narrativeResult = null;
        } else {
          errors.push(
            `Narrative reached max attempts. Best decodability: ${(narrativeResult.decodabilityScore * 100).toFixed(1)}%`
          );
        }
      } catch (error: any) {
        errors.push(`Narrative generation attempt ${attempt + 1} failed: ${error.message}`);
      }
    }

    timing.narrativeMs = Date.now() - narrativeStart;

    if (!narrativeResult) {
      return {
        storybookId,
        title: '',
        synopsis: '',
        pages: [],
        metadata: {
          decodabilityScore: 0,
          wordCount: 0,
          sentenceCount: 0,
          vocabularyTier: 'TIER_1_EVERYDAY',
          morphemeFocus: [],
          comprehensionStrand: 'VOCABULARY',
        },
        costs: { ...costs, total: costs.narrative },
        timing: { ...timing, totalMs: Date.now() - startTime },
        generationModel: 'unknown',
        status: 'failed',
        errors,
      };
    }

    // -----------------------------------------------------------------------
    // STAGE 2: Content Safety Check
    // -----------------------------------------------------------------------
    try {
      const safetyResult = await this.safetyProvider.check({
        text: narrativeResult.fullText,
        context: 'children',
      });
      costs.safety += 0.02; // Approximate safety check cost

      if (!safetyResult.safe) {
        errors.push(`Content safety check failed: ${safetyResult.reasoning || 'Flagged content'}`);
        return {
          storybookId,
          title: narrativeResult.title,
          synopsis: narrativeResult.synopsis,
          pages: [],
          metadata: narrativeResult.metadata,
          costs: { ...costs, total: Object.values(costs).reduce((a, b) => a + b, 0) },
          timing: { ...timing, totalMs: Date.now() - startTime },
          generationModel: narrativeResult.model,
          status: 'failed',
          errors,
        };
      }
    } catch (error: any) {
      errors.push(`Safety check error (proceeding with caution): ${error.message}`);
    }

    // -----------------------------------------------------------------------
    // STAGE 3: Generate Illustrations (concurrent, with controlled parallelism)
    // -----------------------------------------------------------------------
    const illustrationStart = Date.now();
    const illustratedPages = await this.generateIllustrations(
      narrativeResult.pages,
      request,
      errors
    );
    costs.illustrations = illustratedPages.reduce((sum, p) => sum + (p.illustrationCostUsd || 0), 0);
    timing.illustrationsMs = Date.now() - illustrationStart;

    // Verify illustration safety
    for (const page of illustratedPages) {
      if (page.illustrationUrl) {
        try {
          const imgSafety = await this.safetyProvider.checkImage({
            imageUrl: page.illustrationUrl,
            context: 'children',
          });
          if (!imgSafety.safe) {
            errors.push(`Illustration on page ${page.pageNumber} flagged by safety check, removed`);
            page.illustrationUrl = null;
          }
        } catch (error: any) {
          errors.push(`Image safety check failed for page ${page.pageNumber}: ${error.message}`);
        }
      }
    }

    // -----------------------------------------------------------------------
    // STAGE 4: Generate Narration (concurrent per page)
    // -----------------------------------------------------------------------
    const narrationStart = Date.now();
    const voiceId = request.voiceId || this.config.defaultVoiceId;
    const speed = request.narrationSpeed || this.config.defaultNarrationSpeed;
    const narratedPages = await this.generateNarration(
      illustratedPages,
      voiceId,
      speed,
      errors
    );
    costs.narration = narratedPages.reduce((sum, p) => sum + (p.narrationCostUsd || 0), 0);
    timing.narrationMs = Date.now() - narrationStart;

    // -----------------------------------------------------------------------
    // ASSEMBLE RESULT
    // -----------------------------------------------------------------------
    costs.total = costs.narrative + costs.illustrations + costs.narration + costs.safety;
    timing.totalMs = Date.now() - startTime;

    const hasAllIllustrations = narratedPages.every((p) => p.illustrationUrl !== null);
    const hasAllNarration = narratedPages.every((p) => p.audioUrl !== null);
    const status = hasAllIllustrations && hasAllNarration && errors.length === 0
      ? 'complete'
      : errors.some((e) => e.includes('failed'))
        ? 'partial'
        : 'complete';

    return {
      storybookId,
      title: narrativeResult.title,
      synopsis: narrativeResult.synopsis,
      pages: narratedPages.map((p) => ({
        pageNumber: p.pageNumber,
        text: p.text,
        illustrationUrl: p.illustrationUrl,
        audioUrl: p.audioUrl,
        wordTimestamps: p.wordTimestamps,
        pageGpcs: p.pageGpcs,
        decodableWords: p.decodableWords,
        nonDecodableWords: p.nonDecodableWords,
      })),
      metadata: narrativeResult.metadata,
      costs,
      timing,
      generationModel: narrativeResult.model,
      status,
      errors,
    };
  }

  // =========================================================================
  // STAGE 1: NARRATIVE GENERATION
  // =========================================================================

  private async generateNarrative(
    request: StorybookGenerationRequest,
    attempt: number
  ): Promise<NarrativeResult> {
    const systemPrompt = this.buildNarrativeSystemPrompt(request, attempt);
    const userPrompt = this.buildNarrativeUserPrompt(request);

    const result = await this.textProvider.complete({
      systemPrompt,
      userPrompt,
      maxTokens: 4000,
      temperature: attempt === 0 ? 0.8 : 0.6, // More constrained on retries
      costTier: 'standard',
    });

    // Parse the structured response
    const parsed = this.parseNarrativeResponse(result.text, request);

    return {
      title: parsed.title,
      synopsis: parsed.synopsis,
      fullText: parsed.pages.map((p) => p.text).join(' '),
      pages: parsed.pages,
      decodabilityScore: parsed.decodabilityScore,
      metadata: parsed.metadata,
      costUsd: result.usage.costUsd,
      model: result.model,
    };
  }

  private buildNarrativeSystemPrompt(request: StorybookGenerationRequest, attempt: number): string {
    const strictnessNote = attempt > 0
      ? `\n\nIMPORTANT: Previous attempt failed decodability validation. Be MORE strict about using only taught GPCs. Prefer shorter, simpler words. Every word must be decodable using ONLY these grapheme-phoneme correspondences: ${request.taughtGpcSet.join(', ')}`
      : '';

    return `You are the Scholarly Storybook Engine, an expert children's story writer who creates 
phonics-aligned, decodable storybooks. Your stories are curriculum-linked, age-appropriate, and 
designed to help children practise specific grapheme-phoneme correspondences (GPCs).

CRITICAL CONSTRAINTS:
- Target GPCs for practice: ${request.targetGpcs.join(', ')}
- Full taught GPC set (learner knows these): ${request.taughtGpcSet.join(', ')}
- Tricky words allowed: ${(request.trickyWords || ['the', 'I', 'to', 'no', 'go', 'into', 'he', 'she', 'we', 'me', 'be', 'was', 'my', 'you', 'they', 'her', 'all', 'are', 'said', 'so', 'have', 'like', 'some', 'come', 'were', 'there', 'little', 'one', 'do', 'when', 'what', 'out']).join(', ')}
- Age group: ${request.ageGroupMin}–${request.ageGroupMax} years
- Page count: ${request.pageCount} pages
- Narrative template: ${request.narrativeTemplate}
- Cultural context: ${request.culturalContext}

DECODABILITY RULES:
- Every word MUST be decodable using only the taught GPC set, OR be in the tricky words list.
- Target at least 85% decodability score.
- Feature the target GPCs prominently — they should appear multiple times per page.
- Use simple sentence structures appropriate for the age group.
- Include repetitive patterns that reinforce target GPCs.
${strictnessNote}

${request.characters?.length ? `CHARACTERS:\n${request.characters.map((c) => `- ${c.name}: ${c.description} (${c.personalityTraits.join(', ')}). Role: ${c.role}`).join('\n')}` : ''}

${request.previousStoryContext ? `SERIES CONTINUITY:\n${request.previousStoryContext}` : ''}

OUTPUT FORMAT:
Respond with valid JSON only:
{
  "title": "Story Title",
  "synopsis": "One-sentence summary",
  "pages": [
    {
      "pageNumber": 1,
      "text": "Page text here",
      "illustrationPrompt": "Detailed illustration description for this page"
    }
  ],
  "vocabularyTier": "TIER_1_EVERYDAY",
  "morphemeFocus": ["prefixes or suffixes featured"],
  "comprehensionStrand": "VOCABULARY"
}`;
  }

  private buildNarrativeUserPrompt(request: StorybookGenerationRequest): string {
    return `Create a ${request.pageCount}-page storybook about ${request.themes.join(' and ')} ` +
      `for children aged ${request.ageGroupMin}–${request.ageGroupMax}. ` +
      `The story should be in the style of a ${request.narrativeTemplate.toLowerCase().replace(/_/g, ' ')} ` +
      `set in a ${request.culturalContext.toLowerCase().replace(/_/g, ' ')} context. ` +
      `Focus heavily on these GPCs: ${request.targetGpcs.join(', ')}. ` +
      `Use the ${request.artStyle.toLowerCase().replace(/_/g, ' ')} art style for illustration prompts.`;
  }

  private parseNarrativeResponse(
    responseText: string,
    request: StorybookGenerationRequest
  ): ParsedNarrative {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/) ||
      [null, responseText];
    const jsonStr = (jsonMatch[1] || responseText).trim();

    let parsed: any;
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Attempt to fix common JSON issues
      const fixed = jsonStr
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/'/g, '"');
      parsed = JSON.parse(fixed);
    }

    // Validate and compute decodability
    const pages: PageResult[] = parsed.pages.map((p: any) => {
      const words = p.text.split(/\s+/).filter(Boolean);
      const { decodable, nonDecodable, gpcsFound } = this.analyseDecodability(
        words,
        request.taughtGpcSet,
        request.trickyWords || []
      );

      return {
        pageNumber: p.pageNumber,
        text: p.text,
        illustrationPrompt: p.illustrationPrompt,
        wordCount: words.length,
        sentenceCount: p.text.split(/[.!?]+/).filter(Boolean).length,
        pageGpcs: gpcsFound,
        decodableWords: decodable,
        nonDecodableWords: nonDecodable,
        illustrationUrl: null,
        illustrationCostUsd: 0,
        audioUrl: null,
        narrationCostUsd: 0,
        wordTimestamps: null,
      };
    });

    const totalWords = pages.reduce((sum, p) => sum + p.wordCount, 0);
    const totalDecodable = pages.reduce((sum, p) => sum + p.decodableWords.length, 0);
    const decodabilityScore = totalWords > 0 ? totalDecodable / totalWords : 0;

    return {
      title: parsed.title || 'Untitled Story',
      synopsis: parsed.synopsis || '',
      pages,
      decodabilityScore,
      metadata: {
        decodabilityScore,
        wordCount: totalWords,
        sentenceCount: pages.reduce((sum, p) => sum + p.sentenceCount, 0),
        vocabularyTier: parsed.vocabularyTier || 'TIER_1_EVERYDAY',
        morphemeFocus: parsed.morphemeFocus || [],
        comprehensionStrand: parsed.comprehensionStrand || 'VOCABULARY',
      },
    };
  }

  /**
   * Simplified decodability analysis. In production, this delegates to the
   * full grapheme-parser DAG decomposition engine from Sprint 2. Here we
   * implement the greedy longest-match algorithm for self-contained validation.
   */
  private analyseDecodability(
    words: string[],
    taughtGpcs: string[],
    trickyWords: string[]
  ): { decodable: string[]; nonDecodable: string[]; gpcsFound: string[] } {
    const trickySet = new Set(trickyWords.map((w) => w.toLowerCase()));
    const gpcSet = new Set(taughtGpcs.map((g) => g.toLowerCase()));
    const decodable: string[] = [];
    const nonDecodable: string[] = [];
    const gpcsFound = new Set<string>();

    // Sort GPCs by length (longest first) for greedy matching
    const sortedGpcs = [...gpcSet].sort((a, b) => b.length - a.length);

    for (const word of words) {
      const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
      if (!cleaned) continue;

      if (trickySet.has(cleaned)) {
        decodable.push(cleaned);
        continue;
      }

      // Greedy longest-match decomposition
      let pos = 0;
      let isDecodable = true;
      const wordGpcs: string[] = [];

      while (pos < cleaned.length) {
        let matched = false;
        for (const gpc of sortedGpcs) {
          if (cleaned.substring(pos).startsWith(gpc)) {
            wordGpcs.push(gpc);
            gpcsFound.add(gpc);
            pos += gpc.length;
            matched = true;
            break;
          }
        }
        if (!matched) {
          isDecodable = false;
          break;
        }
      }

      if (isDecodable) {
        decodable.push(cleaned);
      } else {
        nonDecodable.push(cleaned);
      }
    }

    return { decodable, nonDecodable, gpcsFound: [...gpcsFound] };
  }

  // =========================================================================
  // STAGE 3: ILLUSTRATION GENERATION
  // =========================================================================

  private async generateIllustrations(
    pages: PageResult[],
    request: StorybookGenerationRequest,
    errors: string[]
  ): Promise<PageResult[]> {
    // Process in batches to control concurrency
    const batchSize = this.config.maxConcurrentIllustrations;

    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      const promises = batch.map(async (page) => {
        try {
          const prompt = this.buildIllustrationPrompt(page, request);
          const result = await this.imageProvider.generate({
            prompt,
            width: this.config.illustrationWidth,
            height: this.config.illustrationHeight,
            style: request.artStyle.toLowerCase().replace(/_/g, ' '),
          });
          page.illustrationUrl = result.imageUrl;
          page.illustrationCostUsd = result.costUsd;
        } catch (error: any) {
          errors.push(`Illustration failed for page ${page.pageNumber}: ${error.message}`);
          page.illustrationUrl = null;
        }
      });
      await Promise.allSettled(promises);
    }

    return pages;
  }

  private buildIllustrationPrompt(page: PageResult, request: StorybookGenerationRequest): string {
    const styleDescription = request.artStyle.toLowerCase().replace(/_/g, ' ');
    const characterDescriptions = request.characters?.length
      ? request.characters
          .map((c) => `${c.name}: ${c.styleSheetPrompt || c.description}`)
          .join('. ')
      : '';

    return `Children's book illustration in ${styleDescription} style. ` +
      `Scene: ${page.illustrationPrompt || page.text}. ` +
      `${characterDescriptions ? `Characters: ${characterDescriptions}. ` : ''}` +
      `Age-appropriate for ${request.ageGroupMin}–${request.ageGroupMax} year olds. ` +
      `${request.culturalContext.replace(/_/g, ' ')} cultural setting. ` +
      `Warm, inviting, child-friendly. No text in the image.`;
  }

  // =========================================================================
  // STAGE 4: NARRATION GENERATION
  // =========================================================================

  private async generateNarration(
    pages: PageResult[],
    voiceId: string,
    speed: number,
    errors: string[]
  ): Promise<PageResult[]> {
    const batchSize = this.config.maxConcurrentNarrations;

    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);
      const promises = batch.map(async (page) => {
        try {
          // Generate speech
          const speechResult = await this.speechProvider.synthesize({
            text: page.text,
            voiceId,
            speed,
            outputFormat: 'mp3',
          });
          page.audioUrl = speechResult.audioUrl;
          page.narrationCostUsd = speechResult.costUsd;

          // Get word-level timestamps for karaoke highlighting
          try {
            page.wordTimestamps = await this.speechProvider.getWordTimestamps({
              text: page.text,
              audioUrl: speechResult.audioUrl,
            });
          } catch (tsError: any) {
            errors.push(`Word timestamps failed for page ${page.pageNumber}: ${tsError.message}`);
            // Fall back to estimated timestamps based on even distribution
            const words = page.text.split(/\s+/).filter(Boolean);
            const msPerWord = (speechResult.durationSeconds * 1000) / words.length;
            page.wordTimestamps = words.map((word, idx) => ({
              word,
              startMs: Math.round(idx * msPerWord),
              endMs: Math.round((idx + 1) * msPerWord),
            }));
          }
        } catch (error: any) {
          errors.push(`Narration failed for page ${page.pageNumber}: ${error.message}`);
          page.audioUrl = null;
          page.wordTimestamps = null;
        }
      });
      await Promise.allSettled(promises);
    }

    return pages;
  }
}

// =============================================================================
// INTERNAL TYPES
// =============================================================================

interface NarrativeResult {
  title: string;
  synopsis: string;
  fullText: string;
  pages: PageResult[];
  decodabilityScore: number;
  metadata: {
    decodabilityScore: number;
    wordCount: number;
    sentenceCount: number;
    vocabularyTier: string;
    morphemeFocus: string[];
    comprehensionStrand: string;
  };
  costUsd: number;
  model: string;
}

interface ParsedNarrative {
  title: string;
  synopsis: string;
  pages: PageResult[];
  decodabilityScore: number;
  metadata: {
    decodabilityScore: number;
    wordCount: number;
    sentenceCount: number;
    vocabularyTier: string;
    morphemeFocus: string[];
    comprehensionStrand: string;
  };
}

interface PageResult {
  pageNumber: number;
  text: string;
  illustrationPrompt: string;
  wordCount: number;
  sentenceCount: number;
  pageGpcs: string[];
  decodableWords: string[];
  nonDecodableWords: string[];
  illustrationUrl: string | null;
  illustrationCostUsd: number;
  audioUrl: string | null;
  narrationCostUsd: number;
  wordTimestamps: Array<{ word: string; startMs: number; endMs: number }> | null;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  type StorybookGenerationRequest,
  type StorybookGenerationResult,
  type ITextCompletionProvider,
  type IImageGenerationProvider,
  type ISpeechProvider,
  type IContentSafetyProvider,
};
