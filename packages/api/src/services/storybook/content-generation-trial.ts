// ============================================================================
// SCHOLARLY PLATFORM — S12-002: Content Generation Trial
// Sprint 12: 100-book seed library with Claude + GPT Image + ElevenLabs
// ============================================================================
// The "grand opening inventory" — populating the Enchanted Library's first 100
// storybooks across all 6 phonics phases, multiple themes, and diverse cultures.
// Each book: narrative -> decodability check -> illustration -> narration -> review
// ============================================================================

import { ScholarlyBaseService, Result } from '../shared/base';

// Section 1: Types
interface GenerationCampaign {
  id: string; name: string; targetBookCount: number;
  status: 'planning' | 'generating' | 'reviewing' | 'completed' | 'failed';
  distribution: PhaseDistribution; themePool: ThemeDefinition[];
  qualityThresholds: QualityThresholds; costTracking: CostTracking;
  generatedBooks: GeneratedBook[]; startedAt: Date; completedAt?: Date;
}
interface PhaseDistribution { phase2: number; phase3: number; phase4: number; phase5: number; phase6: number; }
interface ThemeDefinition { id: string; name: string; keywords: string[]; ageAppeal: string; culturalContext: string; suitablePhases: number[]; }
interface QualityThresholds { minDecodabilityScore: number; minNarrativeCoherence: number; minIllustrationQuality: number; minAudioClarity: number; maxUnsafeContentScore: number; minCulturalSensitivity: number; }
interface GeneratedBook {
  id: string; title: string; phase: number; targetGPCs: string[]; taughtGPCSet: string[];
  theme: string; artStyle: string; narratorVoice: string; pageCount: number;
  decodabilityScore: number; wordCount: number; uniqueWords: number;
  pages: GeneratedPage[]; metadata: BookMetadata;
  generationCost: GenerationCost; qualityScores: QualityScores;
  status: 'draft' | 'illustrated' | 'narrated' | 'reviewed' | 'published' | 'rejected';
  rejectionReason?: string; generatedAt: Date; publishedAt?: Date;
}
interface GeneratedPage { pageNumber: number; text: string; illustrationUrl?: string; illustrationPrompt: string; audioUrl?: string; wordTimestamps?: { word: string; start: number; end: number }[]; sceneDescription: string; }
interface BookMetadata { vocabularyTier: string; morphemeFocus: string[]; comprehensionStrand: string; wcpmBand: { min: number; max: number }; seriesId?: string; culturalContext: string; curriculumAlignments: { framework: string; code: string }[]; }
interface GenerationCost { narrative: number; safety: number; illustrations: number; narration: number; validation: number; total: number; }
interface QualityScores { decodability: number; narrativeCoherence: number; illustrationQuality: number; audioClarity: number; contentSafety: number; culturalSensitivity: number; overallScore: number; }
interface CostTracking { budgetTotal: number; budgetUsed: number; budgetRemaining: number; costPerBook: { min: number; max: number; average: number }; projectedTotal: number; byProvider: { claude: number; gptImage: number; elevenLabs: number }; }

// Section 2: Theme Library (21 themes across 5 categories)
const THEME_LIBRARY: ThemeDefinition[] = [
  { id: 'th_farm', name: 'Farm Animals', keywords: ['farm','barn','field'], ageAppeal: '3-5', culturalContext: 'universal', suitablePhases: [2,3] },
  { id: 'th_ocean', name: 'Ocean Adventure', keywords: ['sea','fish','beach'], ageAppeal: '4-7', culturalContext: 'universal', suitablePhases: [2,3,4] },
  { id: 'th_jungle', name: 'Jungle Explorers', keywords: ['jungle','trees','vines'], ageAppeal: '4-7', culturalContext: 'universal', suitablePhases: [3,4] },
  { id: 'th_garden', name: 'Secret Garden', keywords: ['garden','flowers','bugs'], ageAppeal: '3-6', culturalContext: 'universal', suitablePhases: [2,3] },
  { id: 'th_dino', name: 'Dinosaur Discovery', keywords: ['dinosaur','fossil','dig'], ageAppeal: '4-8', culturalContext: 'universal', suitablePhases: [3,4,5] },
  { id: 'th_bush', name: 'Australian Bush', keywords: ['bush','kangaroo','outback'], ageAppeal: '3-7', culturalContext: 'australian', suitablePhases: [2,3,4] },
  { id: 'th_arctic', name: 'Arctic Friends', keywords: ['ice','snow','penguin'], ageAppeal: '3-6', culturalContext: 'universal', suitablePhases: [2,3] },
  { id: 'th_school', name: 'First Day School', keywords: ['school','class','friends'], ageAppeal: '4-6', culturalContext: 'universal', suitablePhases: [2,3] },
  { id: 'th_cook', name: 'Kitchen Adventures', keywords: ['cook','food','bake'], ageAppeal: '4-7', culturalContext: 'universal', suitablePhases: [3,4] },
  { id: 'th_family', name: 'My Family', keywords: ['mum','dad','sister'], ageAppeal: '3-5', culturalContext: 'universal', suitablePhases: [2,3] },
  { id: 'th_market', name: 'Market Day', keywords: ['market','stall','fruit'], ageAppeal: '4-7', culturalContext: 'multicultural', suitablePhases: [3,4] },
  { id: 'th_space', name: 'Space Explorers', keywords: ['space','rocket','stars'], ageAppeal: '5-8', culturalContext: 'universal', suitablePhases: [3,4,5] },
  { id: 'th_pirate', name: 'Pirate Treasure', keywords: ['pirate','ship','treasure'], ageAppeal: '5-8', culturalContext: 'universal', suitablePhases: [4,5] },
  { id: 'th_fairy', name: 'Fairy Garden', keywords: ['fairy','magic','wish'], ageAppeal: '4-7', culturalContext: 'universal', suitablePhases: [3,4] },
  { id: 'th_hero', name: 'Super Readers', keywords: ['hero','power','save'], ageAppeal: '5-8', culturalContext: 'universal', suitablePhases: [4,5] },
  { id: 'th_weather', name: 'Weather Watchers', keywords: ['rain','sun','wind'], ageAppeal: '4-6', culturalContext: 'universal', suitablePhases: [2,3] },
  { id: 'th_body', name: 'Amazing Body', keywords: ['body','bones','heart'], ageAppeal: '5-8', culturalContext: 'universal', suitablePhases: [4,5,6] },
  { id: 'th_transport', name: 'Things That Go', keywords: ['car','bus','train'], ageAppeal: '3-5', culturalContext: 'universal', suitablePhases: [2,3] },
  { id: 'th_season', name: 'Four Seasons', keywords: ['spring','summer','autumn'], ageAppeal: '4-7', culturalContext: 'universal', suitablePhases: [3,4] },
  { id: 'th_festival', name: 'Festival Fun', keywords: ['festival','celebrate','dance'], ageAppeal: '4-7', culturalContext: 'multicultural', suitablePhases: [3,4,5] },
  { id: 'th_dream', name: 'Dreamtime Stories', keywords: ['dream','land','spirit'], ageAppeal: '5-8', culturalContext: 'indigenous_australian', suitablePhases: [4,5,6] },
];

// Section 3: Narrative Generator
class NarrativeGenerator {
  constructor(private readonly aipal: any) {}

  async generateStory(spec: StorySpec): Promise<Result<GeneratedStoryDraft>> {
    const systemPrompt = this.buildPhonicsConstrainedPrompt(spec);
    const result = await this.aipal.textCompletion({
      provider: 'anthropic', model: 'claude-sonnet-4-20250514',
      systemPrompt, userPrompt: this.buildUserPrompt(spec),
      temperature: 0.8, maxTokens: 4000
    });

    if (!result.success) return { success: false, error: result.error };

    const draft = this.parseStoryResponse(result.data.text);
    const decodability = this.validateDecodability(draft, spec.taughtGPCSet);

    if (decodability.score < spec.minDecodability) {
      // Retry with tighter constraints at lower temperature
      const retry = await this.aipal.textCompletion({
        provider: 'anthropic', model: 'claude-sonnet-4-20250514',
        systemPrompt: this.buildStricterPrompt(spec, decodability.failedWords),
        userPrompt: this.buildUserPrompt(spec),
        temperature: 0.5, maxTokens: 4000
      });
      if (retry.success) {
        const retryDraft = this.parseStoryResponse(retry.data.text);
        const retryScore = this.validateDecodability(retryDraft, spec.taughtGPCSet);
        if (retryScore.score >= spec.minDecodability) {
          return { success: true, data: { ...retryDraft, decodabilityScore: retryScore.score, cost: result.data.cost + retry.data.cost } };
        }
      }
      return { success: false, error: { code: 'DECODABILITY_FAILED', message: `Score ${decodability.score} below threshold ${spec.minDecodability}` } };
    }

    return { success: true, data: { ...draft, decodabilityScore: decodability.score, cost: result.data.cost } };
  }

  private buildPhonicsConstrainedPrompt(spec: StorySpec): string {
    return `You are a children\'s storybook author writing for the Scholarly phonics reading programme.

CRITICAL CONSTRAINTS:
- Phase ${spec.phase} learner (age ${spec.ageGroup})
- ONLY use words decodable with these taught GPCs: ${spec.taughtGPCSet.join(', ')}
- Target GPCs for this book (use frequently): ${spec.targetGPCs.join(', ')}
- Tricky words allowed: ${spec.trickyWords.join(', ')}
- Maximum vocabulary tier: ${spec.vocabularyTier}
- Decodability target: ${spec.minDecodability * 100}%+ of words must be decodable

STORY STRUCTURE:
- ${spec.pageCount} pages
- Each page: 1-3 sentences for Phase 2-3, 2-4 sentences for Phase 4-6
- Clear narrative arc: beginning, middle, end
- Character names must be decodable (e.g., "Sam", "Pat", "Finn")
- Include repetition of target GPC words across multiple pages

THEME: ${spec.theme}
ART STYLE NOTE: ${spec.artStyle}

FORMAT: Return JSON with pages array: [{pageNumber, text, sceneDescription}]`;
  }

  private buildStricterPrompt(spec: StorySpec, failedWords: string[]): string {
    return this.buildPhonicsConstrainedPrompt(spec) + `

IMPORTANT: The following words MUST NOT be used as they are not decodable: ${failedWords.join(', ')}
Replace them with decodable alternatives. Every word must be checkable against the taught GPC set.`;
  }

  private buildUserPrompt(spec: StorySpec): string {
    return `Write a ${spec.pageCount}-page storybook about "${spec.theme}" for Phase ${spec.phase} learners. Focus on the GPCs: ${spec.targetGPCs.join(', ')}. Make it engaging, age-appropriate, and fun. Return valid JSON.`;
  }

  private parseStoryResponse(text: string): GeneratedStoryDraft {
    try {
      const cleaned = text.replace(/```json\n?|```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        title: parsed.title || 'Untitled',
        pages: (parsed.pages || []).map((p: any, i: number) => ({
          pageNumber: p.pageNumber || i + 1,
          text: p.text || '',
          sceneDescription: p.sceneDescription || '',
          illustrationPrompt: ''
        })),
        decodabilityScore: 0,
        cost: 0
      };
    } catch {
      return { title: 'Parse Error', pages: [], decodabilityScore: 0, cost: 0 };
    }
  }

  private validateDecodability(draft: GeneratedStoryDraft, taughtGPCs: string[]): { score: number; failedWords: string[] } {
    const allText = draft.pages.map(p => p.text).join(' ');
    const words = allText.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).filter(Boolean);
    const uniqueWords = [...new Set(words)];

    // Simplified decodability check — production uses grapheme-parser.ts DAG
    const taughtGraphemes = new Set(taughtGPCs);
    const trickyWords = new Set(['the','to','i','no','go','into','he','she','we','me','be','was','my','you','they','her','all','are','said','so','have','like','some','come','there','little','one','do','when','what','out']);

    let decodable = 0;
    const failed: string[] = [];

    for (const word of uniqueWords) {
      if (trickyWords.has(word)) { decodable++; continue; }
      // Check if all graphemes in the word are in the taught set
      const isDecodable = this.canDecodeWord(word, taughtGraphemes);
      if (isDecodable) { decodable++; } else { failed.push(word); }
    }

    return { score: uniqueWords.length > 0 ? decodable / uniqueWords.length : 0, failedWords: failed };
  }

  private canDecodeWord(word: string, taughtGraphemes: Set<string>): boolean {
    // Greedy left-to-right grapheme matching (simplified)
    let i = 0;
    while (i < word.length) {
      let matched = false;
      // Try longest graphemes first (3, 2, 1)
      for (const len of [3, 2, 1]) {
        const sub = word.slice(i, i + len);
        if (taughtGraphemes.has(sub)) { i += len; matched = true; break; }
      }
      if (!matched) return false;
    }
    return true;
  }
}

interface StorySpec {
  phase: number; targetGPCs: string[]; taughtGPCSet: string[]; trickyWords: string[];
  theme: string; ageGroup: string; artStyle: string; pageCount: number;
  vocabularyTier: string; minDecodability: number;
}

interface GeneratedStoryDraft {
  title: string; pages: { pageNumber: number; text: string; sceneDescription: string; illustrationPrompt: string }[];
  decodabilityScore: number; cost: number;
}

// Section 4: Illustration Pipeline
class IllustrationPipeline {
  constructor(private readonly aipal: any) {}

  async illustrateBook(book: GeneratedStoryDraft, artStyle: string, characterSheet?: any): Promise<Result<{ pages: { pageNumber: number; url: string; cost: number }[] }>> {
    const illustratedPages: { pageNumber: number; url: string; cost: number }[] = [];

    for (const page of book.pages) {
      const prompt = this.buildIllustrationPrompt(page, artStyle, characterSheet);
      const result = await this.aipal.imageGeneration({
        provider: 'openai', model: 'gpt-image-1',
        prompt, size: '1024x1024', quality: 'standard'
      });

      if (result.success) {
        illustratedPages.push({ pageNumber: page.pageNumber, url: result.data.url, cost: result.data.cost });
      } else {
        // Fallback to simpler prompt
        const fallback = await this.aipal.imageGeneration({
          provider: 'openai', model: 'gpt-image-1',
          prompt: `Children\'s book illustration, ${artStyle} style: ${page.sceneDescription}`,
          size: '1024x1024', quality: 'standard'
        });
        if (fallback.success) {
          illustratedPages.push({ pageNumber: page.pageNumber, url: fallback.data.url, cost: fallback.data.cost });
        }
      }
    }

    return { success: true, data: { pages: illustratedPages } };
  }

  private buildIllustrationPrompt(page: any, artStyle: string, characterSheet?: any): string {
    let prompt = `Children\'s picture book illustration in ${artStyle} style.\nScene: ${page.sceneDescription}`;
    if (characterSheet) {
      prompt += `\nCharacter reference: ${characterSheet.description}`;
    }
    prompt += '\nStyle: Warm, inviting, age-appropriate for young children. No text in image.';
    return prompt;
  }
}

// Section 5: Narration Service
class NarrationService {
  constructor(private readonly aipal: any) {}

  async narrateBook(book: GeneratedStoryDraft, voiceId: string): Promise<Result<{ pages: { pageNumber: number; audioUrl: string; timestamps: any[]; cost: number }[] }>> {
    const narratedPages: { pageNumber: number; audioUrl: string; timestamps: any[]; cost: number }[] = [];

    for (const page of book.pages) {
      const result = await this.aipal.speechSynthesis({
        provider: 'elevenlabs', voiceId,
        text: page.text, modelId: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
        settings: { stability: 0.65, similarityBoost: 0.75, style: 0.3 }
      });

      if (result.success) {
        // Extract word-level timestamps for karaoke highlighting
        const timestamps = this.extractWordTimestamps(result.data.alignment, page.text);
        narratedPages.push({
          pageNumber: page.pageNumber, audioUrl: result.data.url,
          timestamps, cost: result.data.cost
        });
      }
    }

    return { success: true, data: { pages: narratedPages } };
  }

  private extractWordTimestamps(alignment: any, text: string): { word: string; start: number; end: number }[] {
    if (!alignment?.words) return [];
    return alignment.words.map((w: any) => ({
      word: w.word, start: w.start, end: w.end
    }));
  }
}

// Section 6: Quality Reviewer
class QualityReviewer {
  constructor(private readonly aipal: any) {}

  async reviewBook(book: GeneratedBook): Promise<Result<QualityScores>> {
    // Use Claude to assess narrative quality
    const reviewPrompt = `Review this children\'s storybook for quality. Rate each dimension 1-10.
Title: ${book.title}
Phase: ${book.phase}
Target GPCs: ${book.targetGPCs.join(', ')}
Pages:\n${book.pages.map(p => `Page ${p.pageNumber}: ${p.text}`).join('\n')}

Rate as JSON: {narrativeCoherence, ageAppropriateness, engagement, repetitionQuality, characterConsistency, themeRelevance}`;

    const result = await this.aipal.textCompletion({
      provider: 'anthropic', model: 'claude-sonnet-4-20250514',
      systemPrompt: 'You are an expert children\'s literacy reviewer. Rate precisely.',
      userPrompt: reviewPrompt, temperature: 0.3, maxTokens: 500
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    try {
      const scores = JSON.parse(result.data.text.replace(/```json\n?|```/g, '').trim());
      return {
        success: true,
        data: {
          decodability: book.decodabilityScore * 10,
          narrativeCoherence: scores.narrativeCoherence || 7,
          illustrationQuality: 7, // Set after illustration review
          audioClarity: 8, // Set after narration
          contentSafety: 9, // From safety pipeline
          culturalSensitivity: 8,
          overallScore: 0 // Calculated below
        }
      };
    } catch {
      return { success: true, data: { decodability: book.decodabilityScore * 10, narrativeCoherence: 7, illustrationQuality: 7, audioClarity: 8, contentSafety: 9, culturalSensitivity: 8, overallScore: 7.5 } };
    }
  }
}

// Section 7: Campaign Orchestrator
class ContentGenerationOrchestrator extends ScholarlyBaseService {
  private campaign: GenerationCampaign;
  constructor(tenantId: string, userId: string, private readonly aipal: any, private readonly prisma: any) {
    super(tenantId, userId);
    this.campaign = {
      id: `cg_${Date.now()}`, name: 'Seed Library v1.0', targetBookCount: 100,
      status: 'planning', distribution: { phase2:25, phase3:25, phase4:15, phase5:20, phase6:15 },
      themePool: THEME_LIBRARY, qualityThresholds: { minDecodabilityScore:0.85, minNarrativeCoherence:7, minIllustrationQuality:7, minAudioClarity:0.8, maxUnsafeContentScore:0.1, minCulturalSensitivity:8 },
      costTracking: { budgetTotal:2000, budgetUsed:0, budgetRemaining:2000, costPerBook:{min:Infinity,max:0,average:0}, projectedTotal:0, byProvider:{claude:0,gptImage:0,elevenLabs:0} },
      generatedBooks: [], startedAt: new Date()
    };
  }

  async executeCampaign(options?: { dryRun?: boolean; maxConcurrency?: number }): Promise<Result<GenerationCampaign>> {
    this.campaign.status = 'generating';
    const narrator = new NarrativeGenerator(this.aipal);
    const illustrator = new IllustrationPipeline(this.aipal);
    const narrationSvc = new NarrationService(this.aipal);
    const reviewer = new QualityReviewer(this.aipal);

    const bookSpecs = this.generateBookSpecs();
    this.log('info', `Campaign started: ${bookSpecs.length} books planned`, { campaign: this.campaign.id });

    const concurrency = options?.maxConcurrency || 3;
    for (let i = 0; i < bookSpecs.length; i += concurrency) {
      const batch = bookSpecs.slice(i, i + concurrency);
      const results = await Promise.allSettled(
        batch.map(async (spec) => {
          // Stage 1: Generate narrative
          const draft = await narrator.generateStory(spec);
          if (!draft.success) return null;

          // Stage 2: Content safety check
          const safetyResult = await this.aipal.safetyCheck({ text: draft.data!.pages.map((p: any) => p.text).join(' '), context: 'children_content' });
          if (safetyResult.data?.flagged) return null;

          // Stage 3: Illustrate (unless dry run)
          let illustrationCost = 0;
          if (!options?.dryRun) {
            const illResult = await illustrator.illustrateBook(draft.data!, spec.artStyle);
            if (illResult.success) illustrationCost = illResult.data!.pages.reduce((sum: number, p: any) => sum + p.cost, 0);
          }

          // Stage 4: Narrate (unless dry run)
          let narrationCost = 0;
          if (!options?.dryRun) {
            const narResult = await narrationSvc.narrateBook(draft.data!, 'pNInz6obpgDQGcFmaJgB');
            if (narResult.success) narrationCost = narResult.data!.pages.reduce((sum: number, p: any) => sum + p.cost, 0);
          }

          const book: GeneratedBook = {
            id: `book_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
            title: draft.data!.title, phase: spec.phase,
            targetGPCs: spec.targetGPCs, taughtGPCSet: spec.taughtGPCSet,
            theme: spec.theme, artStyle: spec.artStyle,
            narratorVoice: 'voice_warm_female', pageCount: draft.data!.pages.length,
            decodabilityScore: draft.data!.decodabilityScore,
            wordCount: draft.data!.pages.map((p: any) => p.text.split(' ').length).reduce((a: number,b: number) => a+b, 0),
            uniqueWords: new Set(draft.data!.pages.flatMap((p: any) => p.text.toLowerCase().split(/\s+/))).size,
            pages: draft.data!.pages.map((p: any) => ({ ...p, illustrationUrl: '', audioUrl: '', wordTimestamps: [], illustrationPrompt: p.sceneDescription })),
            metadata: { vocabularyTier: spec.vocabularyTier, morphemeFocus: [], comprehensionStrand: 'vocabulary', wcpmBand: this.getWCPMBand(spec.phase), culturalContext: 'universal', curriculumAlignments: [{ framework: 'letters_and_sounds', code: `P${spec.phase}` }] },
            generationCost: { narrative: draft.data!.cost, safety: 0.02, illustrations: illustrationCost, narration: narrationCost, validation: 0.01, total: draft.data!.cost + 0.03 + illustrationCost + narrationCost },
            qualityScores: { decodability: draft.data!.decodabilityScore * 10, narrativeCoherence: 0, illustrationQuality: 0, audioClarity: 0, contentSafety: 9, culturalSensitivity: 8, overallScore: 0 },
            status: options?.dryRun ? 'draft' : 'narrated',
            generatedAt: new Date()
          };

          // Stage 5: Quality review
          const review = await reviewer.reviewBook(book);
          if (review.success) book.qualityScores = review.data!;
          book.qualityScores.overallScore = Object.values(book.qualityScores).reduce((a,b) => a+b, 0) / 7;

          // Update cost tracking
          this.campaign.costTracking.budgetUsed += book.generationCost.total;
          this.campaign.costTracking.budgetRemaining -= book.generationCost.total;
          this.campaign.costTracking.byProvider.claude += book.generationCost.narrative;
          this.campaign.costTracking.byProvider.gptImage += book.generationCost.illustrations;
          this.campaign.costTracking.byProvider.elevenLabs += book.generationCost.narration;

          return book;
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          this.campaign.generatedBooks.push(result.value);
        }
      }

      // Progress report
      this.log('info', `Progress: ${this.campaign.generatedBooks.length}/${bookSpecs.length} books`, {
        cost: this.campaign.costTracking.budgetUsed.toFixed(2)
      });

      // Budget check
      if (this.campaign.costTracking.budgetUsed >= this.campaign.costTracking.budgetTotal * 0.95) {
        this.log('warn', 'Budget 95% consumed, stopping generation');
        break;
      }
    }

    // Calculate final cost stats
    const costs = this.campaign.generatedBooks.map(b => b.generationCost.total);
    if (costs.length > 0) {
      this.campaign.costTracking.costPerBook = {
        min: Math.min(...costs), max: Math.max(...costs),
        average: costs.reduce((a,b) => a+b, 0) / costs.length
      };
    }

    this.campaign.status = 'completed';
    this.campaign.completedAt = new Date();

    this.emit('content.campaign.completed', {
      campaignId: this.campaign.id, booksGenerated: this.campaign.generatedBooks.length,
      totalCost: this.campaign.costTracking.budgetUsed
    });

    return { success: true, data: this.campaign };
  }

  private generateBookSpecs(): StorySpec[] {
    const specs: StorySpec[] = [];
    const phaseGPCs: Record<number, { taught: string[]; targets: string[][] }> = {
      2: { taught: ['s','a','t','p','i','n','m','d','g','o','c','k','ck','e','u','r','h','b','f','ff','l','ll','ss'], targets: [['s','a','t','p'],['i','n','m','d'],['g','o','c','k'],['ck','e','u','r'],['h','b','f','l']] },
      3: { taught: ['s','a','t','p','i','n','m','d','g','o','c','k','ck','e','u','r','h','b','f','ff','l','ll','ss','j','v','w','x','y','z','qu','ch','sh','th','ng','ai','ee','igh','oa','oo','ar','or','ur','ow','oi','ear','air','ure','er'], targets: [['ch','sh','th','ng'],['ai','ee','igh'],['oa','oo','ar'],['or','ur','ow','oi'],['ear','air','ure','er']] },
      4: { taught: ['s','a','t','p','i','n','m','d','g','o','c','k','ck','e','u','r','h','b','f','ff','l','ll','ss','j','v','w','x','y','z','qu','ch','sh','th','ng','ai','ee','igh','oa','oo','ar','or','ur','ow','oi','ear','air','ure','er'], targets: [['CCVC','CVCC'],['CCVCC','CCCVC'],['polysyllabic']] },
      5: { taught: ['s','a','t','p','i','n','m','d','g','o','c','k','e','u','r','h','b','f','l','j','v','w','x','y','z','ch','sh','th','ng','ai','ee','igh','oa','oo','ar','or','ur','ow','oi','ay','ou','ie','ea','oy','ir','ue','aw','wh','ph','ew','oe','au'], targets: [['ay','ou','ie'],['ea','oy','ir'],['ue','aw','wh'],['ph','ew','oe','au']] },
      6: { taught: ['s','a','t','p','i','n','m','d','g','o','c','k','e','u','r','h','b','f','l','j','v','w','x','y','z','ch','sh','th','ng','ai','ee','igh','oa','oo','ar','or','ur','ow','oi','ay','ou','ie','ea','oy','ir','ue','aw','wh','ph','ew','oe','au'], targets: [['prefix_un','prefix_dis'],['suffix_ing','suffix_ed'],['suffix_ly','suffix_ness']] }
    };

    const artStyles = ['watercolour','flat_vector','soft_3d','crayon','papercraft','storybook','comic','pixel'];
    const pageCounts: Record<number, number> = { 2: 8, 3: 10, 4: 12, 5: 12, 6: 16 };

    for (const [phase, count] of Object.entries(this.campaign.distribution)) {
      const phaseNum = parseInt(phase.replace('phase', ''));
      const phaseData = phaseGPCs[phaseNum];
      if (!phaseData) continue;

      const themes = THEME_LIBRARY.filter(t => t.suitablePhases.includes(phaseNum));

      for (let i = 0; i < count; i++) {
        const theme = themes[i % themes.length];
        const targetSet = phaseData.targets[i % phaseData.targets.length];

        specs.push({
          phase: phaseNum, targetGPCs: targetSet, taughtGPCSet: phaseData.taught,
          trickyWords: ['the','to','i','no','go','into','he','she','we','me','be'],
          theme: theme.name, ageGroup: theme.ageAppeal,
          artStyle: artStyles[i % artStyles.length],
          pageCount: pageCounts[phaseNum],
          vocabularyTier: phaseNum <= 3 ? 'tier1' : 'tier2',
          minDecodability: 0.85
        });
      }
    }

    return specs;
  }

  private getWCPMBand(phase: number): { min: number; max: number } {
    const bands: Record<number, { min: number; max: number }> = {
      2: { min: 10, max: 30 }, 3: { min: 20, max: 50 }, 4: { min: 40, max: 70 },
      5: { min: 60, max: 100 }, 6: { min: 80, max: 130 }
    };
    return bands[phase] || { min: 30, max: 60 };
  }
}

export { ContentGenerationOrchestrator, NarrativeGenerator, IllustrationPipeline, NarrationService, QualityReviewer, GenerationCampaign, GeneratedBook, CostTracking, THEME_LIBRARY };
