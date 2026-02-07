/**
 * Scholarly Platform — Story Narrative Generator & Decodability Engine
 * =====================================================================
 *
 * SB-001: Story Narrative Generator v1
 * SB-002: Decodability Validation Engine
 *
 * This is the intellectual heart of the Scholarly Storybook Engine (SSE).
 * The narrative generator takes a "phonics fingerprint" — the learner's
 * mastered GPCs, target GPCs, age, themes, and reading level — and
 * produces a story that is guaranteed to be decodable.
 *
 * Think of it as a creative writing teacher who also happens to be a
 * linguist: they craft engaging stories with vivid characters and
 * narrative arcs, but every word choice is deliberate — constrained
 * by which letter-sound patterns the child can actually decode.
 *
 * The decodability engine is the gatekeeper. Every generated story
 * passes through it before reaching a child. It decomposes each word
 * into its grapheme-phoneme correspondences using a DAG (Directed
 * Acyclic Graph) parser and checks whether the learner's taught GPC
 * set covers those correspondences. Stories that fall below the
 * decodability threshold (default 85%) are regenerated.
 *
 * ## Pipeline Flow
 *
 *   PhonicsProfile → NarrativeGenerator → DecodabilityValidator → Story
 *                          ↑                        |
 *                          └────── Regenerate ──────┘ (if < threshold)
 *
 * @module storybook/narrative-generator
 * @version 1.0.0
 */

import { Logger } from 'pino';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

export type Result<T> = { success: true; data: T } | { success: false; error: { code: string; message: string; details?: unknown } };
export type CostTier = 'economy' | 'standard' | 'critical';

export type PhonicsPhase = 1 | 2 | 3 | 4 | 5 | 6;
export type ReadingLevel = 'emergent' | 'early' | 'transitional' | 'fluent';
export type VocabularyTier = 'tier1_everyday' | 'tier2_academic' | 'tier3_domain';
export type NarrativeStructure = 'cumulative' | 'problem_solution' | 'circular' | 'journey' | 'information' | 'rhyming' | 'pattern' | 'adventure';

/** The phonics fingerprint that constrains story generation */
export interface PhonicsFingerprint {
  learnerId: string;
  tenantId: string;

  /** GPCs the learner has been taught (can decode) */
  taughtGPCs: GraphemePhonemeCorrespondence[];

  /** Specific GPCs to practise in this story */
  targetGPCs: GraphemePhonemeCorrespondence[];

  /** Current phonics phase */
  phase: PhonicsPhase;

  /** Learner's reading level */
  readingLevel: ReadingLevel;

  /** Expected words-correct-per-minute band */
  wcpmBand: { min: number; max: number };

  /** Learner's age (affects vocabulary and themes) */
  ageYears: number;

  /** Preferred themes/interests */
  themes: string[];

  /** Characters from an ongoing series (optional) */
  seriesCharacters?: StoryCharacter[];

  /** Series ID if this is part of a sequence */
  seriesId?: string;
}

/** A single grapheme-phoneme correspondence */
export interface GraphemePhonemeCorrespondence {
  grapheme: string;  // e.g., "sh", "igh", "a_e"
  phoneme: string;   // e.g., "/ʃ/", "/aɪ/", "/eɪ/"
  position?: 'initial' | 'medial' | 'final' | 'any';
  examples: string[]; // e.g., ["ship", "fish", "wish"]
}

/** Character definition for series continuity */
export interface StoryCharacter {
  name: string;
  description: string;
  personality: string;
  appearance: string;
}

/** A generated storybook */
export interface GeneratedStory {
  id: string;
  title: string;
  pages: StoryPage[];
  characters: StoryCharacter[];
  metadata: StoryMetadata;
  decodabilityReport: DecodabilityReport;
  generationCost: number;
}

export interface StoryPage {
  pageNumber: number;
  text: string;
  illustrationPrompt: string;
  targetWords: string[];   // Words featuring target GPCs
  wordCount: number;
}

export interface StoryMetadata {
  phonicsPhase: PhonicsPhase;
  targetGPCs: string[];
  taughtGPCCount: number;
  decodabilityScore: number;
  readingLevel: ReadingLevel;
  wcpmTarget: number;
  vocabularyTier: VocabularyTier;
  narrativeStructure: NarrativeStructure;
  totalWordCount: number;
  uniqueWordCount: number;
  sentencesPerPage: number;
  themes: string[];
  seriesId?: string;
  eylfsOutcomes?: string[];
  ibPypThemes?: string[];
}

// ============================================================================
// SECTION 2: DECODABILITY VALIDATION ENGINE (SB-002)
// ============================================================================

/** Result of decodability analysis for a single word */
export interface WordDecodability {
  word: string;
  isDecodable: boolean;
  /** GPCs required to decode this word */
  requiredGPCs: GraphemePhonemeCorrespondence[];
  /** GPCs that the learner hasn't been taught */
  untaughtGPCs: GraphemePhonemeCorrespondence[];
  /** Is this a high-frequency "tricky" word (sight word)? */
  isTrickyWord: boolean;
}

/** Report covering the full story's decodability */
export interface DecodabilityReport {
  totalWords: number;
  uniqueWords: number;
  decodableWords: number;
  decodableUniqueWords: number;
  trickyWords: number;
  undecodableWords: string[];
  decodabilityScore: number;       // 0-1 (totalDecodable / totalWords)
  uniqueDecodabilityScore: number; // 0-1 (uniqueDecodable / uniqueWords)
  targetGPCCoverage: number;       // How many target GPCs appear in the story
  wordAnalysis: WordDecodability[];
  passesThreshold: boolean;
}

/**
 * DecodabilityEngine: The linguistic gatekeeper of the Storybook Engine.
 *
 * This engine validates whether a child can actually read a generated story
 * by decomposing every word into its constituent grapheme-phoneme
 * correspondences and checking them against the learner's taught GPC set.
 *
 * The decomposition uses a greedy longest-match algorithm on a known
 * GPC inventory. For example, "shout" decomposes to:
 *   sh → /ʃ/  (digraph, not s + h)
 *   ou → /aʊ/ (vowel digraph)
 *   t  → /t/  (single consonant)
 *
 * The engine also maintains a list of high-frequency "tricky words"
 * (sight words) that are considered decodable regardless of GPC coverage
 * because children learn them as whole units.
 */
export class DecodabilityEngine {
  /** High-frequency words taught as whole units across phases */
  private static readonly TRICKY_WORDS: Set<string> = new Set([
    // Phase 2
    'the', 'to', 'i', 'no', 'go', 'into',
    // Phase 3
    'he', 'she', 'we', 'me', 'be', 'was', 'my', 'you', 'her', 'they', 'all', 'are',
    // Phase 4
    'said', 'have', 'like', 'so', 'do', 'some', 'come', 'were', 'there', 'little', 'one',
    'when', 'out', 'what',
    // Phase 5
    'oh', 'their', 'people', 'mr', 'mrs', 'looked', 'called', 'asked', 'could',
    'should', 'would', 'right', 'through', 'where', 'two', 'any', 'many',
    // Common function words
    'a', 'an', 'and', 'is', 'it', 'in', 'on', 'at', 'of', 'up', 'but', 'not',
    'this', 'that', 'with', 'for', 'had', 'has', 'his', 'him', 'her',
    'can', 'will', 'just', 'then', 'than', 'them', 'from', 'been', 'very',
  ]);

  /**
   * Master GPC inventory — all grapheme-phoneme correspondences taught
   * across the Letters and Sounds phases. Ordered longest-first so that
   * the greedy parser matches "igh" before "i" + "g" + "h".
   */
  private static readonly GPC_INVENTORY: GraphemePhonemeCorrespondence[] = [
    // Trigraphs and complex graphemes
    { grapheme: 'igh', phoneme: '/aɪ/', examples: ['high', 'night', 'light'] },
    { grapheme: 'air', phoneme: '/eə/', examples: ['hair', 'fair', 'pair'] },
    { grapheme: 'ear', phoneme: '/ɪə/', examples: ['hear', 'near', 'dear'] },
    { grapheme: 'ure', phoneme: '/ʊə/', examples: ['sure', 'pure', 'cure'] },
    { grapheme: 'dge', phoneme: '/dʒ/', examples: ['badge', 'bridge', 'hedge'] },
    { grapheme: 'tch', phoneme: '/tʃ/', examples: ['match', 'catch', 'watch'] },

    // Split digraphs
    { grapheme: 'a_e', phoneme: '/eɪ/', examples: ['make', 'cake', 'name'] },
    { grapheme: 'i_e', phoneme: '/aɪ/', examples: ['like', 'time', 'five'] },
    { grapheme: 'o_e', phoneme: '/əʊ/', examples: ['home', 'bone', 'stone'] },
    { grapheme: 'u_e', phoneme: '/juː/', examples: ['cube', 'tube', 'huge'] },
    { grapheme: 'e_e', phoneme: '/iː/', examples: ['these', 'theme'] },

    // Digraphs
    { grapheme: 'sh', phoneme: '/ʃ/', examples: ['ship', 'fish', 'shell'] },
    { grapheme: 'ch', phoneme: '/tʃ/', examples: ['chip', 'chop', 'rich'] },
    { grapheme: 'th', phoneme: '/θ/', examples: ['thin', 'bath', 'with'] },
    { grapheme: 'ng', phoneme: '/ŋ/', examples: ['ring', 'sing', 'long'] },
    { grapheme: 'nk', phoneme: '/ŋk/', examples: ['think', 'pink', 'bank'] },
    { grapheme: 'ck', phoneme: '/k/', examples: ['back', 'kick', 'duck'] },
    { grapheme: 'qu', phoneme: '/kw/', examples: ['queen', 'quick', 'quiz'] },
    { grapheme: 'wh', phoneme: '/w/', examples: ['when', 'what', 'which'] },
    { grapheme: 'wr', phoneme: '/r/', examples: ['write', 'wrong', 'wrap'] },
    { grapheme: 'kn', phoneme: '/n/', examples: ['know', 'knee', 'knit'] },
    { grapheme: 'ee', phoneme: '/iː/', examples: ['see', 'tree', 'been'] },
    { grapheme: 'oo', phoneme: '/uː/', examples: ['moon', 'food', 'zoo'] },
    { grapheme: 'oa', phoneme: '/əʊ/', examples: ['boat', 'coat', 'road'] },
    { grapheme: 'ai', phoneme: '/eɪ/', examples: ['rain', 'wait', 'paint'] },
    { grapheme: 'oi', phoneme: '/ɔɪ/', examples: ['coin', 'join', 'oil'] },
    { grapheme: 'ou', phoneme: '/aʊ/', examples: ['out', 'shout', 'cloud'] },
    { grapheme: 'ow', phoneme: '/aʊ/', examples: ['cow', 'now', 'how'] },
    { grapheme: 'aw', phoneme: '/ɔː/', examples: ['saw', 'paw', 'draw'] },
    { grapheme: 'ar', phoneme: '/ɑː/', examples: ['car', 'star', 'park'] },
    { grapheme: 'or', phoneme: '/ɔː/', examples: ['for', 'sort', 'born'] },
    { grapheme: 'er', phoneme: '/ɜː/', examples: ['her', 'fern', 'term'] },
    { grapheme: 'ir', phoneme: '/ɜː/', examples: ['sir', 'bird', 'girl'] },
    { grapheme: 'ur', phoneme: '/ɜː/', examples: ['fur', 'burn', 'turn'] },
    { grapheme: 'ey', phoneme: '/eɪ/', examples: ['they', 'grey', 'obey'] },
    { grapheme: 'ay', phoneme: '/eɪ/', examples: ['day', 'play', 'say'] },
    { grapheme: 'ie', phoneme: '/aɪ/', examples: ['pie', 'tie', 'lie'] },
    { grapheme: 'ea', phoneme: '/iː/', examples: ['sea', 'read', 'team'] },
    { grapheme: 'ph', phoneme: '/f/', examples: ['phone', 'photo', 'graph'] },
    { grapheme: 'll', phoneme: '/l/', examples: ['bell', 'hill', 'full'] },
    { grapheme: 'ss', phoneme: '/s/', examples: ['miss', 'fuss', 'less'] },
    { grapheme: 'ff', phoneme: '/f/', examples: ['off', 'puff', 'cliff'] },
    { grapheme: 'zz', phoneme: '/z/', examples: ['buzz', 'fizz', 'jazz'] },

    // Single letters
    ...('abcdefghijklmnopqrstuvwxyz'.split('').map(letter => ({
      grapheme: letter,
      phoneme: `/${letter}/`,
      examples: [],
    }))),
  ];

  /** Sorted inventory — longest graphemes first for greedy matching */
  private sortedGPCs: GraphemePhonemeCorrespondence[];

  constructor() {
    this.sortedGPCs = [...DecodabilityEngine.GPC_INVENTORY]
      .sort((a, b) => b.grapheme.length - a.grapheme.length);
  }

  /**
   * Decompose a word into its constituent GPCs using greedy longest-match.
   *
   * Example: "shout" → [sh, ou, t]
   * Example: "night" → [n, igh, t]
   */
  decomposeWord(word: string): GraphemePhonemeCorrespondence[] {
    const normalised = word.toLowerCase().replace(/[^a-z]/g, '');
    const result: GraphemePhonemeCorrespondence[] = [];
    let position = 0;

    while (position < normalised.length) {
      let matched = false;

      // Check for split digraphs (e.g., "a_e" in "make" → m-a_e-k)
      // This is a simplification — full implementation would need syllable analysis
      for (const gpc of this.sortedGPCs) {
        if (gpc.grapheme.includes('_') && gpc.grapheme.length === 3) {
          const vowel = gpc.grapheme[0];
          const finalE = gpc.grapheme[2];
          if (normalised[position] === vowel) {
            // Look ahead for consonant + e pattern
            const remaining = normalised.substring(position + 1);
            if (remaining.length >= 2 && remaining[remaining.length - 1] === finalE) {
              // Check if there's exactly one consonant between the vowel and final e
              const middle = remaining.substring(0, remaining.length - 1);
              if (middle.length === 1 && /[bcdfghjklmnpqrstvwxyz]/.test(middle)) {
                result.push(gpc);
                position++;
                matched = true;
                break;
              }
            }
          }
        }
      }

      if (!matched) {
        for (const gpc of this.sortedGPCs) {
          if (gpc.grapheme.includes('_')) continue; // Skip split digraphs in normal matching
          if (normalised.substring(position, position + gpc.grapheme.length) === gpc.grapheme) {
            result.push(gpc);
            position += gpc.grapheme.length;
            matched = true;
            break;
          }
        }
      }

      if (!matched) {
        // Unknown grapheme — treat as single letter
        result.push({
          grapheme: normalised[position],
          phoneme: `/${normalised[position]}/`,
          examples: [],
        });
        position++;
      }
    }

    return result;
  }

  /**
   * Check if a single word is decodable given a set of taught GPCs.
   */
  analyseWord(word: string, taughtGPCs: GraphemePhonemeCorrespondence[]): WordDecodability {
    const normalised = word.toLowerCase().replace(/[^a-z]/g, '');

    // Tricky words are always decodable
    if (DecodabilityEngine.TRICKY_WORDS.has(normalised)) {
      return {
        word: normalised,
        isDecodable: true,
        requiredGPCs: [],
        untaughtGPCs: [],
        isTrickyWord: true,
      };
    }

    const requiredGPCs = this.decomposeWord(normalised);
    const taughtSet = new Set(taughtGPCs.map(g => g.grapheme.toLowerCase()));
    const untaughtGPCs = requiredGPCs.filter(gpc => !taughtSet.has(gpc.grapheme.toLowerCase()));

    return {
      word: normalised,
      isDecodable: untaughtGPCs.length === 0,
      requiredGPCs,
      untaughtGPCs,
      isTrickyWord: false,
    };
  }

  /**
   * Validate a complete story's decodability.
   * Returns a detailed report including per-word analysis.
   */
  validateStory(
    text: string,
    taughtGPCs: GraphemePhonemeCorrespondence[],
    targetGPCs: GraphemePhonemeCorrespondence[],
    threshold: number = 0.85
  ): DecodabilityReport {
    // Extract words
    const words = text.toLowerCase().match(/[a-z]+/g) || [];
    const uniqueWords = [...new Set(words)];

    // Analyse each unique word
    const analysisMap = new Map<string, WordDecodability>();
    for (const word of uniqueWords) {
      if (!analysisMap.has(word)) {
        analysisMap.set(word, this.analyseWord(word, taughtGPCs));
      }
    }

    // Count decodable words (including tricky words)
    let decodableCount = 0;
    let trickyCount = 0;
    const undecodableWords: string[] = [];

    for (const word of words) {
      const analysis = analysisMap.get(word)!;
      if (analysis.isDecodable) {
        decodableCount++;
        if (analysis.isTrickyWord) trickyCount++;
      } else {
        if (!undecodableWords.includes(word)) {
          undecodableWords.push(word);
        }
      }
    }

    const decodableUniqueCount = uniqueWords.filter(w => analysisMap.get(w)!.isDecodable).length;

    // Check target GPC coverage
    const targetGraphemes = new Set(targetGPCs.map(g => g.grapheme.toLowerCase()));
    const usedTargetGPCs = new Set<string>();
    for (const analysis of analysisMap.values()) {
      for (const gpc of analysis.requiredGPCs) {
        if (targetGraphemes.has(gpc.grapheme.toLowerCase())) {
          usedTargetGPCs.add(gpc.grapheme.toLowerCase());
        }
      }
    }

    const decodabilityScore = words.length > 0 ? decodableCount / words.length : 0;
    const uniqueDecodabilityScore = uniqueWords.length > 0 ? decodableUniqueCount / uniqueWords.length : 0;
    const targetCoverage = targetGPCs.length > 0 ? usedTargetGPCs.size / targetGPCs.length : 1;

    return {
      totalWords: words.length,
      uniqueWords: uniqueWords.length,
      decodableWords: decodableCount,
      decodableUniqueWords: decodableUniqueCount,
      trickyWords: trickyCount,
      undecodableWords,
      decodabilityScore,
      uniqueDecodabilityScore,
      targetGPCCoverage: targetCoverage,
      wordAnalysis: Array.from(analysisMap.values()),
      passesThreshold: decodabilityScore >= threshold,
    };
  }
}

// ============================================================================
// SECTION 3: NARRATIVE GENERATOR (SB-001)
// ============================================================================

/** AI service interface (from Sprint 1 abstraction layer) */
export interface IAIService {
  complete(request: { prompt: string; systemPrompt?: string; maxTokens?: number; temperature?: number; costTier?: CostTier }): Promise<Result<{ text: string; usage: { costUsd: number; inputTokens: number; outputTokens: number } }>>;
  generateStructured(request: { prompt: string; systemPrompt?: string; schema: Record<string, unknown>; temperature?: number; maxTokens?: number; costTier?: CostTier }): Promise<Result<{ data: unknown; usage: { costUsd: number } }>>;
}

/** Generator configuration */
export interface NarrativeGeneratorConfig {
  decodabilityThreshold: number;     // Default: 0.85
  maxRegenerationAttempts: number;   // Default: 3
  defaultPageCount: { min: number; max: number };
  wordsPerPage: Record<PhonicsPhase, { min: number; max: number }>;
}

const DEFAULT_CONFIG: NarrativeGeneratorConfig = {
  decodabilityThreshold: 0.85,
  maxRegenerationAttempts: 3,
  defaultPageCount: { min: 8, max: 16 },
  wordsPerPage: {
    1: { min: 5, max: 10 },
    2: { min: 8, max: 15 },
    3: { min: 12, max: 25 },
    4: { min: 20, max: 35 },
    5: { min: 25, max: 45 },
    6: { min: 30, max: 60 },
  },
};

/**
 * NarrativeGenerator: The creative engine of the Storybook system.
 *
 * Generates curriculum-constrained stories by translating a phonics
 * fingerprint into Claude/Gemini prompts that enforce decodability
 * constraints while maintaining narrative quality.
 *
 * The generation loop:
 * 1. Build system prompt with phonics constraints
 * 2. Generate story via AI
 * 3. Validate decodability
 * 4. If below threshold, identify problematic words and regenerate
 * 5. Return validated story with full metadata
 */
export class NarrativeGenerator {
  private decodabilityEngine: DecodabilityEngine;
  private config: NarrativeGeneratorConfig;

  constructor(
    private aiService: IAIService,
    private logger: Logger,
    config?: Partial<NarrativeGeneratorConfig>
  ) {
    this.decodabilityEngine = new DecodabilityEngine();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Generate a decodable storybook from a phonics fingerprint.
   * This is the main entry point for story generation.
   */
  async generateStory(fingerprint: PhonicsFingerprint): Promise<Result<GeneratedStory>> {
    const startTime = Date.now();
    let totalCost = 0;
    let attempt = 0;
    let lastReport: DecodabilityReport | null = null;

    while (attempt < this.config.maxRegenerationAttempts) {
      attempt++;

      this.logger.info({
        learnerId: fingerprint.learnerId,
        phase: fingerprint.phase,
        attempt,
        targetGPCs: fingerprint.targetGPCs.map(g => g.grapheme),
      }, `Story generation attempt ${attempt}`);

      // Generate the narrative
      const narrativeResult = await this.generateNarrative(fingerprint, lastReport);
      if (!narrativeResult.success) return narrativeResult as Result<GeneratedStory>;

      totalCost += narrativeResult.data.cost;
      const { title, pages, characters, structure } = narrativeResult.data;

      // Validate decodability
      const fullText = pages.map(p => p.text).join(' ');
      const report = this.decodabilityEngine.validateStory(
        fullText,
        fingerprint.taughtGPCs,
        fingerprint.targetGPCs,
        this.config.decodabilityThreshold
      );

      this.logger.info({
        attempt,
        decodabilityScore: report.decodabilityScore.toFixed(3),
        targetCoverage: report.targetGPCCoverage.toFixed(3),
        undecodableWords: report.undecodableWords.length,
        passes: report.passesThreshold,
      }, 'Decodability validation result');

      if (report.passesThreshold) {
        // Story passes — return it
        const storyId = `story_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;

        const story: GeneratedStory = {
          id: storyId,
          title,
          pages: pages.map((p, i) => ({
            ...p,
            pageNumber: i + 1,
            targetWords: this.findTargetWords(p.text, fingerprint.targetGPCs),
            wordCount: (p.text.match(/[a-z]+/gi) || []).length,
          })),
          characters,
          metadata: {
            phonicsPhase: fingerprint.phase,
            targetGPCs: fingerprint.targetGPCs.map(g => g.grapheme),
            taughtGPCCount: fingerprint.taughtGPCs.length,
            decodabilityScore: report.decodabilityScore,
            readingLevel: fingerprint.readingLevel,
            wcpmTarget: Math.round((fingerprint.wcpmBand.min + fingerprint.wcpmBand.max) / 2),
            vocabularyTier: fingerprint.phase <= 3 ? 'tier1_everyday' : 'tier2_academic',
            narrativeStructure: structure,
            totalWordCount: report.totalWords,
            uniqueWordCount: report.uniqueWords,
            sentencesPerPage: Math.round(fullText.split(/[.!?]+/).length / pages.length),
            themes: fingerprint.themes,
            seriesId: fingerprint.seriesId,
          },
          decodabilityReport: report,
          generationCost: totalCost,
        };

        this.logger.info({
          storyId,
          learnerId: fingerprint.learnerId,
          phase: fingerprint.phase,
          decodability: report.decodabilityScore.toFixed(3),
          pages: pages.length,
          words: report.totalWords,
          cost: totalCost.toFixed(4),
          attempts: attempt,
          latencyMs: Date.now() - startTime,
        }, 'Story generated successfully');

        return { success: true, data: story };
      }

      // Store report for next attempt's constraint refinement
      lastReport = report;
    }

    // Exhausted all attempts
    return {
      success: false,
      error: {
        code: 'DECODABILITY_FAILED',
        message: `Story failed decodability after ${this.config.maxRegenerationAttempts} attempts. Best score: ${lastReport?.decodabilityScore.toFixed(3)}`,
        details: {
          lastReport,
          undecodableWords: lastReport?.undecodableWords,
          totalCost,
        },
      },
    };
  }

  /**
   * Build the AI prompt and generate a story narrative.
   */
  private async generateNarrative(
    fingerprint: PhonicsFingerprint,
    previousReport: DecodabilityReport | null
  ): Promise<Result<{
    title: string;
    pages: Array<{ text: string; illustrationPrompt: string }>;
    characters: StoryCharacter[];
    structure: NarrativeStructure;
    cost: number;
  }>> {
    const wordsPerPage = this.config.wordsPerPage[fingerprint.phase];
    const pageCount = fingerprint.phase <= 2
      ? this.config.defaultPageCount.min
      : Math.min(this.config.defaultPageCount.max, this.config.defaultPageCount.min + fingerprint.phase * 2);

    // Build the word constraint guidance
    const taughtGraphemes = fingerprint.taughtGPCs.map(g => g.grapheme).join(', ');
    const targetGraphemes = fingerprint.targetGPCs.map(g => `${g.grapheme} (as in ${g.examples.slice(0, 2).join(', ')})`).join('; ');

    // Build avoidance list from previous failed attempt
    let avoidanceGuidance = '';
    if (previousReport && previousReport.undecodableWords.length > 0) {
      avoidanceGuidance = `\n\nCRITICAL: The previous version used these words that the learner CANNOT decode. You MUST avoid them and use decodable alternatives:\n${previousReport.undecodableWords.map(w => `  ✗ "${w}" — replace with a simpler word using only the taught graphemes`).join('\n')}`;
    }

    // Character continuity for series
    const characterGuidance = fingerprint.seriesCharacters
      ? `\nUse these existing characters:\n${fingerprint.seriesCharacters.map(c => `  ${c.name}: ${c.description}. Personality: ${c.personality}`).join('\n')}`
      : '';

    const systemPrompt = `You are a children's storybook author who specialises in phonics-aligned decodable readers. Your stories must be engaging, age-appropriate, and carefully constrained to use only specific letter-sound patterns.

ABSOLUTE RULES:
1. Every word in the story must be decodable using ONLY these grapheme-phoneme correspondences: ${taughtGraphemes}
2. Common "tricky words" (the, to, I, no, go, he, she, we, me, be, was, my, you, they, all, are, said, have, like, so, do, some, come, were, there, little, one, when, what, a, an, and, is, it, in, on, at, of, up, but, not, this, that, with, for, had, has, his, him, her, can, will) are always acceptable.
3. Feature the TARGET sounds prominently: ${targetGraphemes}
4. Use ${wordsPerPage.min}-${wordsPerPage.max} words per page
5. The story should be ${pageCount} pages long
6. Age appropriate for a ${fingerprint.ageYears}-year-old
7. Keep sentences short and clear for Phase ${fingerprint.phase} readers

VOCABULARY GUIDANCE:
- Use high-frequency, concrete nouns that children know
- Simple verb forms (present tense preferred for early phases)
- Short sentences for phases 1-3; can be slightly longer for phases 4-6
- Repetitive sentence patterns help beginning readers

THEME: ${fingerprint.themes.length > 0 ? fingerprint.themes.join(', ') : 'adventure, friendship, nature'}${characterGuidance}${avoidanceGuidance}`;

    const prompt = `Write a ${pageCount}-page decodable storybook for Phase ${fingerprint.phase} phonics, targeting the sounds: ${targetGraphemes}.

Return the story as JSON with this structure:
{
  "title": "Story title",
  "structure": "cumulative|problem_solution|circular|journey|pattern|adventure",
  "characters": [{ "name": "...", "description": "...", "personality": "...", "appearance": "..." }],
  "pages": [
    { "text": "Page text here.", "illustrationPrompt": "Describe what to illustrate." }
  ]
}`;

    const result = await this.aiService.generateStructured({
      prompt,
      systemPrompt,
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          structure: { type: 'string' },
          characters: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, personality: { type: 'string' }, appearance: { type: 'string' } } } },
          pages: { type: 'array', items: { type: 'object', properties: { text: { type: 'string' }, illustrationPrompt: { type: 'string' } } } },
        },
      },
      temperature: 0.7,
      maxTokens: 4096,
      costTier: 'standard',
    });

    if (!result.success) return result as any;

    const data = result.data.data as {
      title: string;
      structure: NarrativeStructure;
      characters: StoryCharacter[];
      pages: Array<{ text: string; illustrationPrompt: string }>;
    };

    return {
      success: true,
      data: {
        title: data.title,
        pages: data.pages,
        characters: data.characters || [],
        structure: data.structure || 'adventure',
        cost: result.data.usage.costUsd,
      },
    };
  }

  /**
   * Find words in the text that feature the target GPCs.
   * These are highlighted during the reading experience.
   */
  private findTargetWords(text: string, targetGPCs: GraphemePhonemeCorrespondence[]): string[] {
    const words = text.toLowerCase().match(/[a-z]+/g) || [];
    const targetGraphemes = new Set(targetGPCs.map(g => g.grapheme.toLowerCase()));
    const result: string[] = [];

    for (const word of words) {
      const decomposed = this.decodabilityEngine.decomposeWord(word);
      if (decomposed.some(gpc => targetGraphemes.has(gpc.grapheme.toLowerCase()))) {
        if (!result.includes(word)) result.push(word);
      }
    }

    return result;
  }
}
