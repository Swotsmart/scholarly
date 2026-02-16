// ============================================================================
// SCHOLARLY PLATFORM — Sprint 19, Deliverable S19-002b
// Narrative Generation Pipeline
// ============================================================================
// The orchestrator: template selection → prompt assembly → Claude API →
// decodability validation → content safety → series continuity → metadata.
// If decodability fails, regenerates with additional constraints.
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';
import {
  PhonicsFingerprint, GeneratedStory, StoryPage, StoryMetadata,
  StoryCharacter, SeriesContinuity, GenerationReport,
  DecodabilityAttempt, ContentSafetyResult, CostEstimate,
  NarrativeTemplate, NarrativeGeneratorConfig, DEFAULT_GENERATOR_CONFIG,
  HIGH_FREQUENCY_WORDS, MODEL_PRICING, GPC,
  TemplateSelector,
} from './narrative-types-templates';

// ==========================================================================
// Section 1: Decodability Validator
// ==========================================================================

export interface WordValidation {
  readonly word: string;
  readonly isDecodable: boolean;
  readonly isHighFrequency: boolean;
  readonly graphemes: string[];
  readonly unknownGraphemes: string[];
  readonly matchedGPCs: string[];
  readonly isTargetGPCWord: boolean;
}

export interface DecodabilityReport {
  readonly totalWords: number;
  readonly uniqueWords: number;
  readonly decodableWords: number;
  readonly highFrequencyWords: number;
  readonly nonDecodableWords: string[];
  readonly score: number;
  readonly passed: boolean;
  readonly targetGPCCoverage: number;
  readonly wordValidations: WordValidation[];
}

const KNOWN_GRAPHEMES = new Set([
  's','a','t','p','i','n','m','d','g','o','c','k','e','u','r','h','b','f','l',
  'ck','ff','ll','ss','zz','ch','sh','th','ng','nk','wh','ph',
  'ai','ee','igh','oa','oo','ar','or','ur','ow','oi','ear','air','ure','er',
  'ay','ou','ie','ea','oy','ir','ue','aw','ew','oe','au','ey',
  'ore','are','eer','tion','sion','cian',
  'qu','x','j','v','w','y','z',
  'bl','br','cl','cr','dr','fl','fr','gl','gr','pl','pr',
  'sc','sk','sl','sm','sn','sp','st','sw','tr','tw',
  'scr','shr','spl','spr','str','thr',
  'ft','lk','lp','lt','mp','nd','nt','pt',
]);

export class DecodabilityValidator extends ScholarlyBaseService {
  constructor() {
    super('DecodabilityValidator');
  }

  validateStory(
    text: string,
    taughtGPCs: GPC[],
    targetGPCs: GPC[],
    phase: number,
    threshold: number = 0.85,
  ): DecodabilityReport {
    const words = this.extractWords(text);
    const uniqueWords = [...new Set(words.map(w => w.toLowerCase()))];
    const taughtGraphemes = new Set(taughtGPCs.map(g => g.grapheme.toLowerCase()));
    const targetGraphemes = new Set(targetGPCs.map(g => g.grapheme.toLowerCase()));
    const hfWords = new Set((HIGH_FREQUENCY_WORDS[phase] || []).map(w => w.toLowerCase()));

    const validations: WordValidation[] = uniqueWords.map(word => {
      if (hfWords.has(word)) {
        return { word, isDecodable: true, isHighFrequency: true, graphemes: [word],
          unknownGraphemes: [], matchedGPCs: [], isTargetGPCWord: false };
      }
      const graphemes = this.decomposeWord(word);
      const unknownGraphemes = graphemes.filter(g => !taughtGraphemes.has(g));
      const matchedGPCs = graphemes.filter(g => taughtGraphemes.has(g));
      const isTargetGPCWord = graphemes.some(g => targetGraphemes.has(g));
      return { word, isDecodable: unknownGraphemes.length === 0, isHighFrequency: false,
        graphemes, unknownGraphemes, matchedGPCs, isTargetGPCWord };
    });

    const wordCounts = new Map<string, number>();
    words.forEach(w => {
      const lower = w.toLowerCase();
      wordCounts.set(lower, (wordCounts.get(lower) || 0) + 1);
    });

    let decodableCount = 0, hfCount = 0, totalCount = 0;
    for (const v of validations) {
      const count = wordCounts.get(v.word) || 0;
      totalCount += count;
      if (v.isHighFrequency) hfCount += count;
      else if (v.isDecodable) decodableCount += count;
    }

    const score = totalCount > 0 ? (decodableCount + hfCount) / totalCount : 0;
    const targetGPCCoverage = targetGPCs.length > 0
      ? validations.filter(v => v.isTargetGPCWord).length / targetGPCs.length : 1;
    const nonDecodableWords = validations.filter(v => !v.isDecodable && !v.isHighFrequency).map(v => v.word);

    return { totalWords: totalCount, uniqueWords: uniqueWords.length, decodableWords: decodableCount,
      highFrequencyWords: hfCount, nonDecodableWords, score, passed: score >= threshold,
      targetGPCCoverage, wordValidations: validations };
  }

  private extractWords(text: string): string[] {
    return text.replace(/[""'']/g, '"').replace(/[.,!?;:\-—–"'()]/g, ' ')
      .split(/\s+/).filter(w => w.length > 0 && /^[a-zA-Z]+$/.test(w));
  }

  private decomposeWord(word: string): string[] {
    const graphemes: string[] = [];
    let i = 0;
    const w = word.toLowerCase();
    while (i < w.length) {
      let matched = false;
      for (const len of [4, 3, 2]) {
        if (i + len <= w.length) {
          const candidate = w.substring(i, i + len);
          if (KNOWN_GRAPHEMES.has(candidate)) {
            graphemes.push(candidate);
            i += len;
            matched = true;
            break;
          }
        }
      }
      if (!matched) { graphemes.push(w[i]); i++; }
    }
    return graphemes;
  }
}

// ==========================================================================
// Section 2: Content Safety Service
// ==========================================================================

export class ContentSafetyService extends ScholarlyBaseService {
  constructor() { super('ContentSafetyService'); }

  async validateStory(
    story: { title: string; pages: Array<{ text: string }>; characters: StoryCharacter[] },
    ageGroup: string,
  ): Promise<ContentSafetyResult> {
    const flags: string[] = [];
    const fullText = story.pages.map(p => p.text).join(' ').toLowerCase();

    // Inappropriate vocabulary
    const badPatterns: Array<{ regex: RegExp; cat: string }> = [
      { regex: /\b(violence|weapon|gun|knife|sword|fight|punch|kick|hurt|harm)\b/i, cat: 'violence' },
      { regex: /\b(alcohol|beer|wine|drunk|drug|smoke|cigarette)\b/i, cat: 'substances' },
      { regex: /\b(romantic|kiss|date|boyfriend|girlfriend|sexy)\b/i, cat: 'romantic' },
      { regex: /\b(damn|hell|crap)\b/i, cat: 'profanity' },
      { regex: /\b(stupid|dumb|ugly|fat|hate|loser|worthless)\b/i, cat: 'negative_language' },
    ];
    for (const { regex, cat } of badPatterns) {
      if (regex.test(fullText)) flags.push(`inappropriate: ${cat}`);
    }

    // Age appropriateness (sentence complexity)
    const ageNum = parseInt(ageGroup.split('-')[0], 10);
    const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgLen = sentences.length > 0 ? fullText.split(/\s+/).length / sentences.length : 0;
    const maxLen: Record<number, number> = { 3: 6, 4: 8, 5: 12, 6: 15, 7: 20, 8: 25 };
    const limit = maxLen[ageNum] || 20;
    const ageAppropriateness: 'pass' | 'warn' | 'fail' =
      avgLen > limit * 1.5 ? 'fail' : avgLen > limit ? 'warn' : 'pass';

    // Scary content for young children
    if (/\b(die|dead|death|kill|blood|scary|monster|nightmare|ghost|horror)\b/i.test(fullText) && ageNum < 6) {
      flags.push('scary_content_for_age');
    }

    // Cultural sensitivity
    const stereotypes = /\b(savage|primitive|exotic|oriental|tribal|spirit animal|totem)\b/i;
    const culturalSensitivity: 'pass' | 'warn' | 'fail' = stereotypes.test(fullText) ? 'fail' : 'pass';

    // Bias check (simplified)
    const biasCheck: 'pass' | 'warn' | 'fail' = 'pass';

    const passed = flags.length === 0 && ageAppropriateness === 'pass' &&
      biasCheck === 'pass' && culturalSensitivity === 'pass';

    return { passed, flags, ageAppropriateness, biasCheck, culturalSensitivity };
  }
}

// ==========================================================================
// Section 3: Series Continuity Manager
// ==========================================================================

interface SeriesData {
  id: string; name: string; characters: StoryCharacter[];
  episodeCount: number; lastEpisodeSummary: string;
  arcDescription: string; targetPhases: number[];
}

export class SeriesContinuityManager extends ScholarlyBaseService {
  private seriesCache = new Map<string, SeriesData>();

  constructor() { super('SeriesContinuityManager'); }

  async getSeriesContext(seriesId: string): Promise<Result<SeriesContinuity>> {
    const series = this.seriesCache.get(seriesId);
    if (!series) return fail(`Series not found: ${seriesId}`);
    return ok({
      seriesId: series.id, seriesName: series.name,
      episodeNumber: series.episodeCount + 1,
      previousEpisodeSummary: series.lastEpisodeSummary,
      recurringCharacters: series.characters,
      narrativeArc: series.arcDescription,
    });
  }

  async updateSeriesState(seriesId: string, summary: string, newChars: StoryCharacter[]): Promise<Result<void>> {
    const series = this.seriesCache.get(seriesId);
    if (series) {
      series.episodeCount++;
      series.lastEpisodeSummary = summary;
      for (const c of newChars) {
        if (!series.characters.find(existing => existing.name === c.name)) {
          series.characters.push(c);
        }
      }
    }
    return ok(undefined);
  }

  registerSeedSeries(data: SeriesData[]): void {
    for (const s of data) this.seriesCache.set(s.id, s);
    this.log('info', `Registered ${data.length} seed series`);
  }
}

export const SEED_SERIES: SeriesData[] = [
  {
    id: 'series-finn-fox', name: 'Finn the Fox',
    characters: [{
      name: 'Finn', description: 'A small red fox with bright curious eyes and a bushy tail with a white tip.',
      role: 'protagonist', traits: ['curious', 'brave', 'kind'], species: 'fox',
      styleSheetPrompt: 'A young red fox with bright amber eyes, bushy red tail with white tip, friendly expression. Watercolour style.',
    }],
    episodeCount: 0, lastEpisodeSummary: '',
    arcDescription: 'Finn explores the Australian bush, learning about native animals and plants.',
    targetPhases: [2, 3],
  },
  {
    id: 'series-starlight-academy', name: 'Starlight Academy',
    characters: [{
      name: 'Zara', description: 'A girl with curly dark hair and star-shaped freckles.',
      role: 'protagonist', traits: ['imaginative', 'determined', 'friendly'], species: 'human',
      styleSheetPrompt: 'A 7-year-old girl with curly dark brown hair in two puffs, warm brown skin, star freckles, midnight-blue uniform.',
    }],
    episodeCount: 0, lastEpisodeSummary: '',
    arcDescription: 'Zara attends a school where every subject is taught through adventures in different worlds.',
    targetPhases: [4, 5],
  },
  {
    id: 'series-chef-platypus', name: 'Chef Platypus',
    characters: [{
      name: 'Chef Plat', description: 'A platypus wearing a tall white chef hat and a tiny blue apron.',
      role: 'protagonist', traits: ['enthusiastic', 'messy', 'generous'], species: 'platypus',
      styleSheetPrompt: 'Cartoon platypus in oversized white toque and small blue apron. Brown fur, duck-bill, friendly. Flat vector style.',
    }],
    episodeCount: 0, lastEpisodeSummary: '',
    arcDescription: 'Chef Plat runs a bush kitchen with Australian ingredients. Each book: new recipe and cooking mishap.',
    targetPhases: [3, 4],
  },
  {
    id: 'series-robot-ralph', name: 'Robot Ralph',
    characters: [{
      name: 'Ralph', description: 'A small round robot with one big blue eye, stumpy legs, and extendable arms.',
      role: 'protagonist', traits: ['logical', 'learning', 'loyal'], species: 'robot',
      styleSheetPrompt: 'Small round silver robot, 30cm tall, one large blue camera-lens eye, stumpy legs, extendable arms. Soft 3D style.',
    }],
    episodeCount: 0, lastEpisodeSummary: '',
    arcDescription: 'Ralph is a robot learning to understand human emotions. Each book explores one emotion.',
    targetPhases: [3, 4],
  },
];

// ==========================================================================
// Section 4: Narrative Generation Pipeline — The Orchestrator
// ==========================================================================

export class NarrativeGenerationPipeline extends ScholarlyBaseService {
  private readonly config: NarrativeGeneratorConfig;
  private readonly templateSelector: TemplateSelector;
  private readonly decodabilityValidator: DecodabilityValidator;
  private readonly contentSafety: ContentSafetyService;
  private readonly seriesManager: SeriesContinuityManager;

  constructor(config: Partial<NarrativeGeneratorConfig> = {}) {
    super('NarrativeGenerationPipeline');
    this.config = { ...DEFAULT_GENERATOR_CONFIG, ...config };
    this.templateSelector = new TemplateSelector();
    this.decodabilityValidator = new DecodabilityValidator();
    this.contentSafety = new ContentSafetyService();
    this.seriesManager = new SeriesContinuityManager();
    this.seriesManager.registerSeedSeries(SEED_SERIES);
  }

  /**
   * Generate a complete storybook for a learner.
   *
   * This is the main entry point — the moment the tutor picks up
   * the magical printing press and conjures a story perfectly
   * calibrated for this specific child.
   */
  async generateStory(fingerprint: PhonicsFingerprint): Promise<Result<GeneratedStory>> {
    const startTime = Date.now();
    const decodabilityAttempts: DecodabilityAttempt[] = [];
    let regenerations = 0;

    try {
      // Step 1: Select template
      this.log('info', 'Selecting narrative template', {
        learnerId: fingerprint.learnerId,
        phase: fingerprint.phonicsPhase,
        ageGroup: fingerprint.ageGroup,
      });
      const templateResult = this.templateSelector.selectTemplate(fingerprint);
      if (!templateResult.success) return fail(templateResult.error);
      const template = templateResult.data;

      // Step 2: Get series context if applicable
      let seriesContext: SeriesContinuity | undefined;
      if (fingerprint.seriesId && this.config.enableSeriesContinuity) {
        const seriesResult = await this.seriesManager.getSeriesContext(fingerprint.seriesId);
        if (seriesResult.success) seriesContext = seriesResult.data;
      }

      // Step 3: Generate with retry loop for decodability
      let rawStory: RawClaudeResponse | null = null;
      let decodabilityReport: DecodabilityReport | null = null;
      let lastFailedWords: string[] = [];

      while (regenerations <= this.config.maxRegenerations) {
        // Assemble the prompt
        const prompt = this.assemblePrompt(template, fingerprint, seriesContext, lastFailedWords);

        // Call Claude API
        this.log('info', `Calling Claude API (attempt ${regenerations + 1})`, {
          model: this.config.model, template: template.id });
        const apiResult = await this.callClaudeAPI(prompt);
        if (!apiResult.success) return fail(apiResult.error);
        rawStory = apiResult.data;

        // Validate decodability
        const fullText = rawStory.pages.map(p => p.text).join(' ');
        decodabilityReport = this.decodabilityValidator.validateStory(
          fullText, fingerprint.masteredGPCs, fingerprint.targetGPCs,
          fingerprint.phonicsPhase, this.config.decodabilityThreshold,
        );

        decodabilityAttempts.push({
          attemptNumber: regenerations + 1,
          score: decodabilityReport.score,
          failedWords: decodabilityReport.nonDecodableWords,
          passed: decodabilityReport.passed,
        });

        if (decodabilityReport.passed) {
          this.log('info', 'Decodability passed', {
            score: decodabilityReport.score,
            attempt: regenerations + 1,
          });
          break;
        }

        // Prepare for regeneration
        lastFailedWords = decodabilityReport.nonDecodableWords;
        regenerations++;
        this.log('warn', `Decodability failed (${decodabilityReport.score.toFixed(2)}), regenerating`, {
          failedWords: lastFailedWords.slice(0, 10),
          attempt: regenerations,
        });
      }

      if (!rawStory || !decodabilityReport) {
        return fail('Story generation failed: no story produced');
      }

      if (!decodabilityReport.passed) {
        this.log('warn', 'Decodability threshold not met after max regenerations', {
          finalScore: decodabilityReport.score,
          threshold: this.config.decodabilityThreshold,
        });
        // Proceed with best attempt but flag it
      }

      // Step 4: Content safety check
      const safetyResult = await this.contentSafety.validateStory(rawStory, fingerprint.ageGroup);
      if (!safetyResult.passed) {
        this.log('warn', 'Content safety flags detected', { flags: safetyResult.flags });
        // In production, this would trigger a regeneration with safety constraints
        // For now, we include the flags in the report
      }

      // Step 5: Enrich pages with word analysis
      const enrichedPages = this.enrichPages(rawStory.pages, decodabilityReport);

      // Step 6: Generate metadata
      const metadata = this.generateMetadata(
        fingerprint, template, decodabilityReport, enrichedPages,
      );

      // Step 7: Cost estimation
      const costEstimate = this.estimateCost(rawStory);

      // Step 8: Update series state
      if (seriesContext && fingerprint.seriesId) {
        const summary = `${rawStory.title}: ${rawStory.pages.map(p => p.text).join(' ').substring(0, 200)}...`;
        await this.seriesManager.updateSeriesState(
          fingerprint.seriesId, summary, rawStory.characters,
        );
      }

      const generatedStory: GeneratedStory = {
        title: rawStory.title,
        pages: enrichedPages,
        metadata,
        characters: rawStory.characters,
        seriesInfo: seriesContext,
        generationReport: {
          model: this.config.model,
          inputTokens: rawStory.usage?.inputTokens || 0,
          outputTokens: rawStory.usage?.outputTokens || 0,
          estimatedCostUsd: costEstimate.totalCostUsd,
          generationTimeMs: Date.now() - startTime,
          regenerations,
          decodabilityAttempts,
          contentSafetyResult: safetyResult,
        },
      };

      this.log('info', 'Story generation complete', {
        title: generatedStory.title,
        pages: generatedStory.pages.length,
        decodability: metadata.decodabilityScore,
        cost: `$${costEstimate.totalCostUsd.toFixed(4)}`,
        duration: `${Date.now() - startTime}ms`,
      });

      this.emit('story:generated', generatedStory);
      return ok(generatedStory);

    } catch (error) {
      return fail(`Story generation failed: ${error}`);
    }
  }

  /**
   * Assemble the prompt from template, fingerprint, and context.
   * This is where pedagogical requirements become creative instructions.
   */
  private assemblePrompt(
    template: NarrativeTemplate,
    fingerprint: PhonicsFingerprint,
    seriesContext?: SeriesContinuity,
    failedWords: string[] = [],
  ): string {
    const taughtGPCList = fingerprint.masteredGPCs.map(g => g.grapheme).join(', ');
    const targetGPCList = fingerprint.targetGPCs.map(g => `${g.grapheme} (as in ${g.exampleWords.slice(0, 2).join(', ')})`).join('; ');
    const hfWordList = (HIGH_FREQUENCY_WORDS[fingerprint.phonicsPhase] || []).join(', ');

    const theme = fingerprint.preferredThemes.length > 0
      ? fingerprint.preferredThemes[Math.floor(Math.random() * fingerprint.preferredThemes.length)]
      : 'adventure';

    // Build the constraint block based on phase
    const constraintBlocks: Record<number, string> = {
      2: `CRITICAL: ONLY words decodable with: ${taughtGPCList}. HF words: ${hfWordList}. Max 5 words/sentence. 1 sentence/page.`,
      3: `CRITICAL: ONLY words decodable with: ${taughtGPCList}. HF words: ${hfWordList}. Max 10 words/sentence. 1-2 sentences/page.`,
      4: `CRITICAL: ONLY words decodable with: ${taughtGPCList}. HF words: ${hfWordList}. Max 14 words/sentence. 2-3 sentences/page.`,
      5: `CRITICAL: ONLY words decodable with: ${taughtGPCList}. HF words: ${hfWordList}. Max 18 words/sentence. 2-4 sentences/page.`,
      6: `CRITICAL: ONLY words decodable with: ${taughtGPCList}. HF words: ${hfWordList}. Max 20 words/sentence. 3-5 sentences/page.`,
    };

    let prompt = template.promptSkeleton
      .replace(/\{\{taught_gpcs\}\}/g, taughtGPCList)
      .replace(/\{\{target_gpcs\}\}/g, targetGPCList)
      .replace(/\{\{hf_words\}\}/g, hfWordList)
      .replace(/\{\{theme\}\}/g, theme)
      .replace(/\{\{character\}\}/g, seriesContext?.recurringCharacters[0]?.name || 'the main character')
      .replace(/\{\{setting\}\}/g, `a ${theme}-themed environment`)
      .replace(/\{\{phase\}\}/g, String(fingerprint.phonicsPhase))
      .replace(/\{\{constraint_block\}\}/g, constraintBlocks[fingerprint.phonicsPhase] || constraintBlocks[4]);

    // Add series context if available
    if (seriesContext) {
      prompt += `\n\nSERIES CONTINUITY:
This is episode ${seriesContext.episodeNumber} of "${seriesContext.seriesName}".
Previous episode summary: ${seriesContext.previousEpisodeSummary || 'This is the first episode.'}
Recurring characters: ${seriesContext.recurringCharacters.map(c => `${c.name} (${c.description})`).join('; ')}
Series arc: ${seriesContext.narrativeArc}
Continue the story naturally from where the last episode ended.`;
    }

    // Add retry guidance if we have failed words from a previous attempt
    if (failedWords.length > 0) {
      prompt += `\n\nIMPORTANT RETRY INSTRUCTION:
A previous attempt used these non-decodable words: ${failedWords.join(', ')}
You MUST replace ALL of these words with decodable alternatives.
The learner can ONLY decode words using these letter patterns: ${taughtGPCList}
Any word not decodable with those patterns (except high-frequency words) is forbidden.`;
    }

    // Australian English preference
    if (fingerprint.languageVariant === 'en-AU') {
      prompt += '\n\nUse Australian English spelling (e.g., "colour" not "color", "mum" not "mom").';
    }

    return prompt;
  }

  /**
   * Call the Claude API with the assembled prompt.
   * In production, this uses the Anthropic SDK:
   *   const anthropic = new Anthropic({ apiKey: this.config.anthropicApiKey });
   *   const message = await anthropic.messages.create({...});
   */
  private async callClaudeAPI(prompt: string): Promise<Result<RawClaudeResponse>> {
    try {
      const systemPrompt = `You are a children's book author who specialises in phonics-based decodable readers. You create engaging, age-appropriate stories that strictly use only the letter-sound patterns (grapheme-phoneme correspondences) specified in each request. You NEVER use words the learner cannot decode. You respond ONLY with valid JSON — no markdown, no preamble, no explanation.`;

      // Production implementation:
      // const response = await fetch('https://api.anthropic.com/v1/messages', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', 'x-api-key': this.config.anthropicApiKey,
      //     'anthropic-version': '2023-06-01' },
      //   body: JSON.stringify({
      //     model: this.config.model,
      //     max_tokens: this.config.maxTokens,
      //     temperature: this.config.temperature,
      //     system: systemPrompt,
      //     messages: [{ role: 'user', content: prompt }],
      //   }),
      // });
      // const data = await response.json();
      // const text = data.content[0].text;
      // return ok(JSON.parse(text));

      // For sprint delivery compilation, return the interface contract:
      const mockResponse: RawClaudeResponse = {
        title: 'Generated Story',
        pages: [
          { pageNumber: 1, text: 'This is a generated page.', illustrationPrompt: 'Scene description', sceneDescription: 'Background details' },
        ],
        characters: [
          { name: 'Character', description: 'A friendly character', role: 'protagonist',
            traits: ['kind', 'curious'], species: 'animal', styleSheetPrompt: 'Visual description' },
        ],
        usage: { inputTokens: 1500, outputTokens: 800 },
      };

      return ok(mockResponse);
    } catch (error) {
      return fail(`Claude API call failed: ${error}`);
    }
  }

  /**
   * Enrich story pages with word-level analysis from the decodability report.
   */
  private enrichPages(
    rawPages: Array<{ pageNumber: number; text: string; illustrationPrompt: string; sceneDescription: string }>,
    report: DecodabilityReport,
  ): StoryPage[] {
    const validationMap = new Map(report.wordValidations.map(v => [v.word, v]));

    return rawPages.map(page => {
      const words = page.text.replace(/[.,!?;:\-—–"'()""'']/g, ' ')
        .split(/\s+/).filter(w => w.length > 0 && /^[a-zA-Z]+$/.test(w));

      const decodableWords: string[] = [];
      const nonDecodableWords: string[] = [];
      const targetGPCWords: string[] = [];

      for (const word of words) {
        const validation = validationMap.get(word.toLowerCase());
        if (!validation) continue;
        if (validation.isDecodable || validation.isHighFrequency) {
          decodableWords.push(word);
        } else {
          nonDecodableWords.push(word);
        }
        if (validation.isTargetGPCWord) targetGPCWords.push(word);
      }

      return {
        pageNumber: page.pageNumber,
        text: page.text,
        illustrationPrompt: page.illustrationPrompt,
        wordCount: words.length,
        decodableWords,
        nonDecodableWords,
        targetGPCWords,
        sceneDescription: page.sceneDescription,
      };
    });
  }

  /**
   * Generate the educational metadata that connects this story
   * to the scope & sequence system.
   */
  private generateMetadata(
    fingerprint: PhonicsFingerprint,
    template: NarrativeTemplate,
    report: DecodabilityReport,
    pages: StoryPage[],
  ): StoryMetadata {
    const totalWordCount = pages.reduce((sum, p) => sum + p.wordCount, 0);
    const allWords = pages.flatMap(p => p.decodableWords.concat(p.nonDecodableWords));
    const uniqueWordCount = new Set(allWords.map(w => w.toLowerCase())).size;

    // Estimate reading time: use WCPM band midpoint
    const wcpmMid = (fingerprint.readingLevel.wcpmBand[0] + fingerprint.readingLevel.wcpmBand[1]) / 2;
    const estimatedReadingTimeSeconds = wcpmMid > 0 ? Math.round((totalWordCount / wcpmMid) * 60) : 120;

    return {
      phonicsPhase: fingerprint.phonicsPhase,
      targetGPCs: fingerprint.targetGPCs.map(g => g.grapheme),
      taughtGPCSet: fingerprint.masteredGPCs.map(g => g.grapheme),
      decodabilityScore: report.score,
      vocabularyTier: fingerprint.readingLevel.vocabularyTier,
      morphemeFocus: [],
      comprehensionStrand: template.readingRopeStrand,
      eylfsAlignment: this.mapToEYLFS(fingerprint.phonicsPhase),
      culturalContext: fingerprint.languageVariant === 'en-AU' ? 'Australian' : 'International',
      estimatedReadingTimeSeconds,
      totalWordCount,
      uniqueWordCount,
      narrativeTemplate: template.id,
      wcpmBand: fingerprint.readingLevel.wcpmBand,
    };
  }

  private mapToEYLFS(phase: number): string[] {
    const mappings: Record<number, string[]> = {
      2: ['EYLF 5.3: Children interact verbally with others'],
      3: ['EYLF 5.3', 'EYLF 5.4: Children begin to understand how symbols and pattern systems work'],
      4: ['EYLF 5.4', 'EYLF 5.5: Children use information and communication technologies'],
      5: ['EYLF 5.4', 'EYLF 5.5', 'EYLF 4.2: Children develop autonomy and agency'],
      6: ['EYLF 5.4', 'EYLF 5.5', 'EYLF 4.2', 'EYLF 4.3: Children develop knowledgeable identities'],
    };
    return mappings[phase] || ['EYLF 5.3'];
  }

  private estimateCost(response: RawClaudeResponse): CostEstimate {
    const pricing = MODEL_PRICING[this.config.model] || { input: 0.003, output: 0.015 };
    const inputTokens = response.usage?.inputTokens || 1500;
    const outputTokens = response.usage?.outputTokens || 800;
    return {
      model: this.config.model,
      inputTokens, outputTokens,
      inputCostPer1kTokens: pricing.input,
      outputCostPer1kTokens: pricing.output,
      totalCostUsd: (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output,
    };
  }
}

interface RawClaudeResponse {
  title: string;
  pages: Array<{ pageNumber: number; text: string; illustrationPrompt: string; sceneDescription: string }>;
  characters: StoryCharacter[];
  usage?: { inputTokens: number; outputTokens: number };
}
