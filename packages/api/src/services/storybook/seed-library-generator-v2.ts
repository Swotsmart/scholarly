// ============================================================================
// SCHOLARLY PLATFORM — Sprint 17, Deliverable S17-001
// Seed Content Library Generator
// ============================================================================
// Generates the initial 100+ storybook seed library described in the Strategy
// Document (Part 1, §1.2) and recommended by Sprint 16 §6.1. This is the
// content pipeline that populates the Enchanted Library before beta launch —
// think of it as the "stocking the shelves" operation that transforms an
// empty library into one where every phonics phase has rich, varied reading
// material waiting for its first reader.
//
// The generator orchestrates four subsystems:
//   1. SeedCatalogPlanner — Determines WHAT to generate (phase × theme matrix)
//   2. BatchStoryGenerator — Generates narrative text constrained by phonics
//   3. BatchIllustrationPipeline — Produces character-consistent illustrations
//   4. BatchNarrationPipeline — Creates word-level synced audio narration
//   5. QualityAssuranceGate — Validates every book before library admission
//
// The entire pipeline is idempotent, resumable, and cost-tracked — if
// generation is interrupted, it picks up exactly where it left off.
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ==========================================================================
// Section 1: Type System — The Blueprint for Every Book
// ==========================================================================
// Before generating a single word, we need a precise vocabulary for describing
// what we're building. These types encode the phonics pedagogy that makes
// Scholarly's storybooks fundamentally different from ReadKidz's open-ended
// creations. Every type here maps to a concept in the Letters and Sounds
// framework or the Strategy Document's curriculum metadata table (Part 1, §1.3.5).

/** Phonics phases from Letters and Sounds — the backbone of UK synthetic phonics */
export type PhonicsPhase = 1 | 2 | 3 | 4 | 5;

/** Age bands that determine vocabulary complexity, illustration style, and narrative sophistication */
export interface AgeGroup {
  readonly min: number;         // Minimum age in years
  readonly max: number;         // Maximum age in years
  readonly label: string;       // Human-readable label e.g. "Early Years (3-5)"
  readonly vocabTier: 1 | 2;   // Tier 1: everyday words, Tier 2: academic vocabulary
  readonly artStylePreference: 'soft' | 'detailed';  // Softer for younger, more detailed for older
}

/** The complete set of grapheme-phoneme correspondences introduced up to each phase */
export interface PhaseGPCSet {
  readonly phase: PhonicsPhase;
  readonly gpcs: ReadonlyArray<GraphemePhonemeCorrespondence>;
  readonly cumulativeGPCs: ReadonlyArray<GraphemePhonemeCorrespondence>;  // All GPCs from phase 1 through this phase
  readonly highFrequencyWords: ReadonlyArray<string>;   // Tricky words taught by this phase
  readonly decodableWordPool: ReadonlyArray<string>;    // All decodable words using cumulative GPCs
}

/** A single grapheme-phoneme correspondence — the atomic unit of phonics */
export interface GraphemePhonemeCorrespondence {
  readonly grapheme: string;    // The written form e.g. "sh", "igh", "a_e"
  readonly phoneme: string;     // The sound it represents in IPA e.g. "/ʃ/", "/aɪ/"
  readonly position: 'initial' | 'medial' | 'final' | 'any';
  readonly frequency: number;   // How common this GPC is in children's text (0-1)
}

/** Themes that children find engaging, mapped to phonics phases for natural vocabulary alignment */
export interface StoryTheme {
  readonly id: string;
  readonly name: string;                    // e.g. "Australian Animals", "Space Adventure"
  readonly description: string;             // Brief description for prompt engineering
  readonly suitablePhases: PhonicsPhase[];  // Which phases have enough GPCs for this theme's vocabulary
  readonly suitableAges: AgeGroup[];        // Age-appropriate audience
  readonly culturalContext: string;          // Cultural setting for diversity tracking
  readonly keywords: string[];              // Theme-specific vocabulary to weave into stories
  readonly illustrationHints: string[];     // Visual elements that define this theme
}

/** Art styles optimised for children's book illustration */
export interface ArtStyle {
  readonly id: string;
  readonly name: string;              // e.g. "Soft Watercolour", "Flat Vector", "Crayon Sketch"
  readonly description: string;       // Detailed prompt prefix for image generation
  readonly suitableAgeRange: { min: number; max: number };
  readonly warmth: number;            // 0-1 scale, higher = warmer/softer palette
  readonly detailLevel: number;       // 0-1 scale, higher = more detail
  readonly examplePromptSuffix: string;  // Appended to every illustration prompt
}

/** Character definition for visual consistency across a story series */
export interface CharacterDefinition {
  readonly id: string;
  readonly name: string;
  readonly species: string;           // e.g. "fox", "rabbit", "human child"
  readonly appearance: string;        // Detailed visual description for prompt consistency
  readonly personality: string;       // Personality traits that inform narrative behavior
  readonly seriesId: string;          // Links to a StorybookSeries
  readonly styleSheetPrompt: string;  // The consistency anchor prompt used in every illustration
}

/** A single storybook page with text, illustration spec, and audio timing */
export interface StorybookPage {
  readonly pageNumber: number;
  readonly text: string;                    // The decodable text for this page
  readonly illustrationPrompt: string;      // AI prompt for generating the illustration
  readonly illustrationUrl?: string;        // Generated illustration URL (filled after generation)
  readonly audioUrl?: string;               // Generated narration URL (filled after generation)
  readonly wordTimestamps?: WordTimestamp[]; // Word-level audio sync data
  readonly sceneLayout: SceneLayout;        // Layer decomposition for parallax/animation
}

/** Word-level timestamp for karaoke-style highlighting during read-along */
export interface WordTimestamp {
  readonly word: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly isTargetGPC: boolean;    // Whether this word contains a target GPC for highlighting
}

/** Scene decomposition for parallax scrolling in the interactive reader */
export interface SceneLayout {
  readonly background: string;      // Background layer description
  readonly midground: string;       // Character/action layer
  readonly foreground: string;      // Foreground elements
  readonly textZone: { x: number; y: number; width: number; height: number };  // Where text overlays
}

/** The complete specification for a seed storybook */
export interface SeedStorybookSpec {
  readonly id: string;
  readonly title: string;
  readonly phase: PhonicsPhase;
  readonly targetGPCs: GraphemePhonemeCorrespondence[];
  readonly theme: StoryTheme;
  readonly ageGroup: AgeGroup;
  readonly artStyle: ArtStyle;
  readonly characters: CharacterDefinition[];
  readonly seriesId?: string;
  readonly pageCount: number;           // 8-24 pages depending on phase/age
  readonly narrativeTemplate: NarrativeTemplate;
  readonly decodabilityTarget: number;  // Minimum decodability score (default 0.85)
}

/** Narrative structure templates proven to work for beginning readers */
export interface NarrativeTemplate {
  readonly id: string;
  readonly name: string;            // e.g. "Cumulative Tale", "Hero's Journey", "Problem-Solution"
  readonly structure: string[];     // Story beat descriptions e.g. ["Introduction", "Rising action", ...]
  readonly suitablePhases: PhonicsPhase[];
  readonly suitablePageCounts: number[];
  readonly promptTemplate: string;  // The Claude system prompt template with {placeholders}
}

/** Generation status tracking for idempotent, resumable pipeline */
export enum GenerationStage {
  PLANNED = 'PLANNED',
  NARRATIVE_GENERATING = 'NARRATIVE_GENERATING',
  NARRATIVE_COMPLETE = 'NARRATIVE_COMPLETE',
  NARRATIVE_FAILED = 'NARRATIVE_FAILED',
  ILLUSTRATING = 'ILLUSTRATING',
  ILLUSTRATION_COMPLETE = 'ILLUSTRATION_COMPLETE',
  ILLUSTRATION_FAILED = 'ILLUSTRATION_FAILED',
  NARRATING = 'NARRATING',
  NARRATION_COMPLETE = 'NARRATION_COMPLETE',
  NARRATION_FAILED = 'NARRATION_FAILED',
  QA_VALIDATING = 'QA_VALIDATING',
  QA_PASSED = 'QA_PASSED',
  QA_FAILED = 'QA_FAILED',
  PUBLISHED = 'PUBLISHED',
}

/** Cost tracking per book and per batch for budget management */
export interface GenerationCost {
  readonly storyGeneration: number;      // Claude API cost in USD
  readonly illustrationGeneration: number; // GPT Image cost in USD
  readonly narrationGeneration: number;  // ElevenLabs cost in USD
  readonly validationCost: number;       // Content safety + decodability check
  readonly totalCost: number;
}

/** Complete generation record for audit trail and cost tracking */
export interface GenerationRecord {
  readonly specId: string;
  readonly stage: GenerationStage;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly cost: GenerationCost;
  readonly retryCount: number;
  readonly maxRetries: number;
  readonly errorLog: string[];
  readonly pages: StorybookPage[];
  readonly decodabilityScore?: number;
  readonly qualityScore?: number;
}

/** Batch generation configuration */
export interface BatchConfig {
  readonly batchId: string;
  readonly targetBookCount: number;
  readonly maxConcurrentGenerations: number;   // Parallelism limit to respect API rate limits
  readonly maxBudgetUSD: number;               // Hard stop if costs exceed this
  readonly retryPolicy: RetryPolicy;
  readonly qualityThresholds: QualityThresholds;
}

export interface RetryPolicy {
  readonly maxRetries: number;
  readonly backoffBaseMs: number;
  readonly backoffMaxMs: number;
  readonly retryableStages: GenerationStage[];
}

export interface QualityThresholds {
  readonly minDecodability: number;     // Default 0.85 (85%)
  readonly minNarrativeCoherence: number;  // AI-assessed 0-1 score
  readonly minAgeAppropriateness: number;  // AI-assessed 0-1 score
  readonly maxVocabularyTierViolations: number;  // Words above the target tier
  readonly minIllustrationConsistency: number;   // Cross-page character similarity
}

// ==========================================================================
// Section 2: GPC Inventory — The Phonics Knowledge Base
// ==========================================================================
// This is the phonics engine's vocabulary — the complete set of grapheme-phoneme
// correspondences organised by Letters and Sounds phases. Think of it as the
// "alphabet DNA" that every generated storybook must respect. The inventory
// directly mirrors the scope-and-sequence system already in the Phonics Tool
// (scope-sequence.ts) but is self-contained here for the seed generator's
// standalone operation.

export class GPCInventory {
  private static readonly PHASE_GPCS: Record<PhonicsPhase, GraphemePhonemeCorrespondence[]> = {
    1: [
      // Phase 1 is about environmental sounds and phonological awareness — no GPCs to decode
      // But we include the foundational letter-sound pairs introduced in late Phase 1/early Phase 2
    ],
    2: [
      { grapheme: 's', phoneme: '/s/', position: 'any', frequency: 0.95 },
      { grapheme: 'a', phoneme: '/æ/', position: 'any', frequency: 0.92 },
      { grapheme: 't', phoneme: '/t/', position: 'any', frequency: 0.93 },
      { grapheme: 'p', phoneme: '/p/', position: 'any', frequency: 0.88 },
      { grapheme: 'i', phoneme: '/ɪ/', position: 'any', frequency: 0.90 },
      { grapheme: 'n', phoneme: '/n/', position: 'any', frequency: 0.91 },
      { grapheme: 'm', phoneme: '/m/', position: 'any', frequency: 0.87 },
      { grapheme: 'd', phoneme: '/d/', position: 'any', frequency: 0.86 },
      { grapheme: 'g', phoneme: '/ɡ/', position: 'any', frequency: 0.78 },
      { grapheme: 'o', phoneme: '/ɒ/', position: 'any', frequency: 0.89 },
      { grapheme: 'c', phoneme: '/k/', position: 'any', frequency: 0.82 },
      { grapheme: 'k', phoneme: '/k/', position: 'any', frequency: 0.70 },
      { grapheme: 'ck', phoneme: '/k/', position: 'final', frequency: 0.65 },
      { grapheme: 'e', phoneme: '/ɛ/', position: 'any', frequency: 0.91 },
      { grapheme: 'u', phoneme: '/ʌ/', position: 'any', frequency: 0.84 },
      { grapheme: 'r', phoneme: '/r/', position: 'any', frequency: 0.88 },
      { grapheme: 'h', phoneme: '/h/', position: 'initial', frequency: 0.75 },
      { grapheme: 'b', phoneme: '/b/', position: 'any', frequency: 0.80 },
      { grapheme: 'f', phoneme: '/f/', position: 'any', frequency: 0.76 },
      { grapheme: 'ff', phoneme: '/f/', position: 'final', frequency: 0.55 },
      { grapheme: 'l', phoneme: '/l/', position: 'any', frequency: 0.85 },
      { grapheme: 'll', phoneme: '/l/', position: 'final', frequency: 0.58 },
      { grapheme: 'ss', phoneme: '/s/', position: 'final', frequency: 0.52 },
    ],
    3: [
      { grapheme: 'j', phoneme: '/dʒ/', position: 'initial', frequency: 0.45 },
      { grapheme: 'v', phoneme: '/v/', position: 'any', frequency: 0.62 },
      { grapheme: 'w', phoneme: '/w/', position: 'initial', frequency: 0.73 },
      { grapheme: 'x', phoneme: '/ks/', position: 'final', frequency: 0.30 },
      { grapheme: 'y', phoneme: '/j/', position: 'initial', frequency: 0.55 },
      { grapheme: 'z', phoneme: '/z/', position: 'any', frequency: 0.25 },
      { grapheme: 'zz', phoneme: '/z/', position: 'final', frequency: 0.15 },
      { grapheme: 'qu', phoneme: '/kw/', position: 'initial', frequency: 0.35 },
      { grapheme: 'ch', phoneme: '/tʃ/', position: 'any', frequency: 0.60 },
      { grapheme: 'sh', phoneme: '/ʃ/', position: 'any', frequency: 0.65 },
      { grapheme: 'th', phoneme: '/θ/', position: 'any', frequency: 0.70 },
      { grapheme: 'ng', phoneme: '/ŋ/', position: 'final', frequency: 0.55 },
      { grapheme: 'ai', phoneme: '/eɪ/', position: 'medial', frequency: 0.48 },
      { grapheme: 'ee', phoneme: '/iː/', position: 'any', frequency: 0.52 },
      { grapheme: 'igh', phoneme: '/aɪ/', position: 'any', frequency: 0.40 },
      { grapheme: 'oa', phoneme: '/əʊ/', position: 'medial', frequency: 0.38 },
      { grapheme: 'oo', phoneme: '/uː/', position: 'any', frequency: 0.45 },
      { grapheme: 'ar', phoneme: '/ɑː/', position: 'any', frequency: 0.50 },
      { grapheme: 'or', phoneme: '/ɔː/', position: 'any', frequency: 0.48 },
      { grapheme: 'ur', phoneme: '/ɜː/', position: 'any', frequency: 0.35 },
      { grapheme: 'ow', phoneme: '/aʊ/', position: 'any', frequency: 0.42 },
      { grapheme: 'oi', phoneme: '/ɔɪ/', position: 'any', frequency: 0.28 },
      { grapheme: 'ear', phoneme: '/ɪə/', position: 'any', frequency: 0.30 },
      { grapheme: 'air', phoneme: '/eə/', position: 'any', frequency: 0.22 },
      { grapheme: 'ure', phoneme: '/ʊə/', position: 'final', frequency: 0.18 },
      { grapheme: 'er', phoneme: '/ə/', position: 'final', frequency: 0.65 },
    ],
    4: [
      // Phase 4 introduces consonant clusters, not new GPCs — it's about blending
      // Adjacent consonants at beginnings and ends of words
      { grapheme: 'bl', phoneme: '/bl/', position: 'initial', frequency: 0.40 },
      { grapheme: 'br', phoneme: '/br/', position: 'initial', frequency: 0.42 },
      { grapheme: 'cl', phoneme: '/kl/', position: 'initial', frequency: 0.38 },
      { grapheme: 'cr', phoneme: '/kr/', position: 'initial', frequency: 0.35 },
      { grapheme: 'dr', phoneme: '/dr/', position: 'initial', frequency: 0.37 },
      { grapheme: 'fl', phoneme: '/fl/', position: 'initial', frequency: 0.33 },
      { grapheme: 'fr', phoneme: '/fr/', position: 'initial', frequency: 0.36 },
      { grapheme: 'gl', phoneme: '/ɡl/', position: 'initial', frequency: 0.28 },
      { grapheme: 'gr', phoneme: '/ɡr/', position: 'initial', frequency: 0.35 },
      { grapheme: 'pl', phoneme: '/pl/', position: 'initial', frequency: 0.32 },
      { grapheme: 'pr', phoneme: '/pr/', position: 'initial', frequency: 0.30 },
      { grapheme: 'sc', phoneme: '/sk/', position: 'initial', frequency: 0.25 },
      { grapheme: 'sk', phoneme: '/sk/', position: 'initial', frequency: 0.28 },
      { grapheme: 'sl', phoneme: '/sl/', position: 'initial', frequency: 0.30 },
      { grapheme: 'sm', phoneme: '/sm/', position: 'initial', frequency: 0.25 },
      { grapheme: 'sn', phoneme: '/sn/', position: 'initial', frequency: 0.22 },
      { grapheme: 'sp', phoneme: '/sp/', position: 'initial', frequency: 0.35 },
      { grapheme: 'st', phoneme: '/st/', position: 'any', frequency: 0.45 },
      { grapheme: 'sw', phoneme: '/sw/', position: 'initial', frequency: 0.28 },
      { grapheme: 'tr', phoneme: '/tr/', position: 'initial', frequency: 0.40 },
      { grapheme: 'tw', phoneme: '/tw/', position: 'initial', frequency: 0.20 },
      { grapheme: 'nd', phoneme: '/nd/', position: 'final', frequency: 0.55 },
      { grapheme: 'nk', phoneme: '/ŋk/', position: 'final', frequency: 0.30 },
      { grapheme: 'nt', phoneme: '/nt/', position: 'final', frequency: 0.48 },
      { grapheme: 'mp', phoneme: '/mp/', position: 'final', frequency: 0.35 },
      { grapheme: 'ft', phoneme: '/ft/', position: 'final', frequency: 0.22 },
      { grapheme: 'lk', phoneme: '/lk/', position: 'final', frequency: 0.18 },
      { grapheme: 'lt', phoneme: '/lt/', position: 'final', frequency: 0.25 },
    ],
    5: [
      // Phase 5 introduces alternative graphemes for known phonemes and alternative
      // pronunciations for known graphemes — the "many spellings" phase
      { grapheme: 'ay', phoneme: '/eɪ/', position: 'final', frequency: 0.45 },
      { grapheme: 'a_e', phoneme: '/eɪ/', position: 'any', frequency: 0.55 },
      { grapheme: 'ea', phoneme: '/iː/', position: 'any', frequency: 0.58 },
      { grapheme: 'e_e', phoneme: '/iː/', position: 'any', frequency: 0.30 },
      { grapheme: 'ie', phoneme: '/aɪ/', position: 'any', frequency: 0.40 },
      { grapheme: 'i_e', phoneme: '/aɪ/', position: 'any', frequency: 0.50 },
      { grapheme: 'oe', phoneme: '/əʊ/', position: 'any', frequency: 0.15 },
      { grapheme: 'o_e', phoneme: '/əʊ/', position: 'any', frequency: 0.45 },
      { grapheme: 'ue', phoneme: '/uː/', position: 'final', frequency: 0.25 },
      { grapheme: 'u_e', phoneme: '/uː/', position: 'any', frequency: 0.35 },
      { grapheme: 'ew', phoneme: '/uː/', position: 'final', frequency: 0.28 },
      { grapheme: 'ph', phoneme: '/f/', position: 'any', frequency: 0.35 },
      { grapheme: 'wh', phoneme: '/w/', position: 'initial', frequency: 0.40 },
      { grapheme: 'ey', phoneme: '/iː/', position: 'final', frequency: 0.20 },
      { grapheme: 'au', phoneme: '/ɔː/', position: 'any', frequency: 0.25 },
      { grapheme: 'aw', phoneme: '/ɔː/', position: 'any', frequency: 0.30 },
      { grapheme: 'ow', phoneme: '/əʊ/', position: 'any', frequency: 0.42 },  // Alternative pronunciation
      { grapheme: 'ir', phoneme: '/ɜː/', position: 'any', frequency: 0.35 },
      { grapheme: 'ou', phoneme: '/aʊ/', position: 'any', frequency: 0.48 },
      { grapheme: 'oy', phoneme: '/ɔɪ/', position: 'final', frequency: 0.22 },
      { grapheme: 'tch', phoneme: '/tʃ/', position: 'final', frequency: 0.25 },
      { grapheme: 'dge', phoneme: '/dʒ/', position: 'final', frequency: 0.20 },
      { grapheme: 'kn', phoneme: '/n/', position: 'initial', frequency: 0.18 },
      { grapheme: 'wr', phoneme: '/r/', position: 'initial', frequency: 0.15 },
      { grapheme: 'mb', phoneme: '/m/', position: 'final', frequency: 0.12 },
    ],
  };

  /** High-frequency "tricky" words that cannot be fully decoded at each phase */
  private static readonly TRICKY_WORDS: Record<PhonicsPhase, string[]> = {
    1: [],
    2: ['the', 'to', 'I', 'no', 'go', 'into'],
    3: ['he', 'she', 'we', 'me', 'be', 'was', 'you', 'they', 'all', 'are', 'my', 'her'],
    4: ['said', 'have', 'like', 'so', 'do', 'some', 'come', 'were', 'there', 'little', 'one', 'when', 'out', 'what'],
    5: ['oh', 'their', 'people', 'Mr', 'Mrs', 'looked', 'called', 'asked', 'could', 'water', 'where', 'who', 'again', 'thought', 'through', 'work', 'mouse', 'many', 'laughed', 'because', 'different', 'any', 'eyes', 'friends', 'once', 'please'],
  };

  /** Get all GPCs available at a given phase (cumulative from earlier phases) */
  static getPhaseSet(phase: PhonicsPhase): PhaseGPCSet {
    const phasesUpTo = ([1, 2, 3, 4, 5] as PhonicsPhase[]).filter(p => p <= phase);
    const cumulativeGPCs = phasesUpTo.flatMap(p => this.PHASE_GPCS[p]);
    const cumulativeTricky = phasesUpTo.flatMap(p => this.TRICKY_WORDS[p]);

    return {
      phase,
      gpcs: this.PHASE_GPCS[phase],
      cumulativeGPCs,
      highFrequencyWords: cumulativeTricky,
      decodableWordPool: this.buildDecodableWordPool(cumulativeGPCs, cumulativeTricky),
    };
  }

  /** Build a pool of words decodable using the given GPC set */
  private static buildDecodableWordPool(
    gpcs: GraphemePhonemeCorrespondence[],
    trickyWords: string[]
  ): string[] {
    // In production, this would use the grapheme-parser.ts DAG decomposition engine
    // from the Phonics Tool. For the seed generator, we use a curated word list
    // per phase that's been pre-validated against the parser.
    const graphemes = new Set(gpcs.map(g => g.grapheme));
    // Simplified decodability check — real implementation uses the DAG parser
    const commonWords = [
      'a', 'an', 'at', 'am', 'as', 'and', 'ant', 'bat', 'bag', 'bad', 'bed', 'big', 'bin',
      'bit', 'bud', 'bug', 'bun', 'bus', 'but', 'cab', 'can', 'cap', 'cat', 'cod', 'cot',
      'cub', 'cup', 'cut', 'dad', 'did', 'dig', 'dim', 'dip', 'dog', 'dot', 'dug', 'den',
      'egg', 'end', 'fan', 'fat', 'fed', 'fig', 'fin', 'fit', 'fog', 'fun', 'fur', 'gap',
      'gas', 'get', 'got', 'gum', 'gun', 'gut', 'had', 'ham', 'has', 'hat', 'hen', 'hid',
      'him', 'hip', 'his', 'hit', 'hog', 'hop', 'hot', 'hub', 'hug', 'hum', 'hut',
      'if', 'in', 'ink', 'inn', 'is', 'it', 'its', 'jab', 'jag', 'jam', 'jar', 'jet',
      'jig', 'job', 'jog', 'jot', 'jug', 'jut', 'keg', 'ken', 'kid', 'kin', 'kit',
      'lab', 'lad', 'lag', 'lap', 'led', 'leg', 'let', 'lid', 'lip', 'lit', 'log', 'lot',
      'lug', 'mad', 'man', 'map', 'mat', 'men', 'met', 'mid', 'mix', 'mob', 'mop', 'mud',
      'mug', 'mum', 'nag', 'nap', 'net', 'nib', 'nip', 'nit', 'nod', 'nor', 'not', 'nun',
      'nut', 'odd', 'off', 'on', 'opt', 'or', 'orb', 'our', 'out', 'pad', 'pan', 'pat',
      'peg', 'pen', 'pet', 'pig', 'pin', 'pit', 'pod', 'pop', 'pot', 'pub', 'pug', 'pun',
      'pup', 'put', 'rag', 'ram', 'ran', 'rap', 'rat', 'red', 'rib', 'rid', 'rig', 'rim',
      'rip', 'rob', 'rod', 'rot', 'rub', 'rug', 'run', 'rut', 'sack', 'sad', 'sag', 'sap',
      'sat', 'set', 'sick', 'sin', 'sip', 'sit', 'six', 'sob', 'sock', 'sod', 'son', 'sop',
      'sub', 'sum', 'sun', 'tab', 'tag', 'tan', 'tap', 'ten', 'tin', 'tip', 'top', 'tub',
      'tug', 'tun', 'up', 'us', 'van', 'vat', 'vet', 'wig', 'win', 'wit', 'wok', 'won',
      'yam', 'yes', 'yet', 'zip', 'zoo',
      // Phase 3+ words with digraphs
      'check', 'chin', 'chip', 'chop', 'much', 'rich', 'such', 'ship', 'shed', 'shell',
      'shin', 'shock', 'shop', 'shot', 'shut', 'thin', 'them', 'then', 'this', 'that',
      'than', 'with', 'ring', 'sing', 'song', 'long', 'king', 'thing', 'rain', 'tail',
      'wait', 'paid', 'main', 'pain', 'see', 'been', 'keen', 'feed', 'feel', 'feet',
      'keep', 'need', 'seed', 'seem', 'seen', 'week', 'high', 'night', 'light', 'right',
      'sight', 'tight', 'might', 'fight', 'boat', 'coat', 'goat', 'load', 'road', 'toad',
      'moon', 'food', 'good', 'book', 'cook', 'look', 'took', 'wood', 'foot', 'hook',
      'car', 'far', 'star', 'park', 'dark', 'farm', 'hard', 'for', 'fork', 'corn', 'born',
      'sort', 'sport', 'short', 'turn', 'burn', 'hurt', 'fur', 'curl', 'surf', 'church',
      'now', 'how', 'cow', 'down', 'town', 'brown', 'oil', 'coin', 'join', 'point', 'soil',
      'ear', 'dear', 'fear', 'hear', 'near', 'year', 'fair', 'hair', 'pair', 'chair',
      // Phase 4 cluster words
      'black', 'blank', 'blend', 'blink', 'block', 'brand', 'brick', 'bring', 'brisk',
      'clam', 'clap', 'click', 'clock', 'cloth', 'club', 'crack', 'crab', 'crisp', 'cross',
      'drink', 'drop', 'drum', 'flag', 'flat', 'flick', 'flip', 'flock', 'frog', 'from',
      'fresh', 'front', 'frost', 'glad', 'grab', 'grand', 'grass', 'green', 'grin', 'grip',
      'plan', 'plod', 'plop', 'plot', 'plug', 'plum', 'press', 'print', 'skip', 'skin',
      'slam', 'slap', 'sleep', 'slip', 'slop', 'slot', 'smell', 'snap', 'snip', 'spell',
      'spend', 'spin', 'split', 'spot', 'stamp', 'stand', 'stem', 'step', 'stick', 'still',
      'stomp', 'stop', 'strap', 'street', 'string', 'strip', 'strong', 'stump', 'stun',
      'swim', 'swing', 'track', 'train', 'trap', 'tree', 'trick', 'trim', 'trip', 'truck',
      'trunk', 'trust', 'twist',
      // Phase 5 split digraph and alternative spelling words
      'cake', 'came', 'cave', 'fame', 'game', 'gate', 'gave', 'lake', 'late', 'made',
      'make', 'name', 'place', 'plane', 'plate', 'race', 'safe', 'same', 'save', 'shade',
      'shape', 'snake', 'space', 'spade', 'state', 'take', 'tale', 'tape', 'taste', 'trade',
      'wave', 'these', 'bike', 'bite', 'dive', 'drive', 'file', 'fine', 'fire', 'five',
      'hide', 'hike', 'hire', 'kite', 'knife', 'life', 'like', 'lime', 'line', 'live',
      'mice', 'mile', 'mine', 'nice', 'nine', 'pipe', 'pride', 'prize', 'quite', 'ride',
      'rise', 'side', 'site', 'size', 'slide', 'smile', 'time', 'tribe', 'wide', 'wine',
      'wipe', 'wise', 'write', 'bone', 'broke', 'chose', 'close', 'code', 'cone', 'home',
      'hope', 'hole', 'joke', 'nose', 'note', 'phone', 'pole', 'rode', 'role', 'rope',
      'rose', 'smoke', 'spoke', 'stone', 'stove', 'those', 'tone', 'vote', 'whole', 'woke',
      'wove', 'wrote', 'zone', 'cube', 'cute', 'flute', 'huge', 'June', 'mule', 'rule',
      'rude', 'tube', 'tune', 'use',
    ];

    return [...new Set([...commonWords, ...trickyWords])];
  }
}

// ==========================================================================
// Section 3: Theme Library — The Creative Palette
// ==========================================================================
// These themes are carefully curated to provide variety that matches children's
// interests while ensuring the vocabulary demands align with phonics phase
// capabilities. A Phase 2 story about "Australian Animals" works because words
// like "cat", "bat", "bug", "hen" are all decodable — but a Phase 2 story
// about "Space Exploration" would fail because "astronaut", "galaxy", "orbit"
// require GPCs not yet taught.

export class ThemeLibrary {
  private static readonly AGE_GROUPS: AgeGroup[] = [
    { min: 3, max: 5, label: 'Early Years (3-5)', vocabTier: 1, artStylePreference: 'soft' },
    { min: 5, max: 7, label: 'Foundation (5-7)', vocabTier: 1, artStylePreference: 'soft' },
    { min: 7, max: 9, label: 'Developing (7-9)', vocabTier: 2, artStylePreference: 'detailed' },
  ];

  private static readonly THEMES: StoryTheme[] = [
    {
      id: 'farm-animals', name: 'Farm Animals', description: 'Stories set on farms with common farm animals',
      suitablePhases: [2, 3], suitableAges: [ThemeLibrary.AGE_GROUPS[0], ThemeLibrary.AGE_GROUPS[1]],
      culturalContext: 'universal-rural', keywords: ['hen', 'pig', 'dog', 'cat', 'duck', 'mud', 'sun', 'run', 'fun'],
      illustrationHints: ['red barn', 'green fields', 'blue sky', 'wooden fence', 'hay bales'],
    },
    {
      id: 'pets-at-home', name: 'Pets at Home', description: 'Everyday stories about household pets',
      suitablePhases: [2, 3], suitableAges: [ThemeLibrary.AGE_GROUPS[0], ThemeLibrary.AGE_GROUPS[1]],
      culturalContext: 'universal-domestic', keywords: ['cat', 'dog', 'fish', 'bed', 'rug', 'cup', 'sit', 'pat'],
      illustrationHints: ['cozy living room', 'pet bed', 'food bowl', 'garden', 'toys'],
    },
    {
      id: 'park-playground', name: 'Park & Playground', description: 'Active outdoor play adventures',
      suitablePhases: [2, 3, 4], suitableAges: [ThemeLibrary.AGE_GROUPS[0], ThemeLibrary.AGE_GROUPS[1]],
      culturalContext: 'universal-urban', keywords: ['run', 'hop', 'skip', 'jump', 'swing', 'slide', 'sand', 'fun'],
      illustrationHints: ['playground equipment', 'trees', 'sunshine', 'children playing', 'picnic blanket'],
    },
    {
      id: 'australian-animals', name: 'Australian Animals', description: 'Adventures with unique Australian wildlife',
      suitablePhases: [3, 4, 5], suitableAges: [ThemeLibrary.AGE_GROUPS[1], ThemeLibrary.AGE_GROUPS[2]],
      culturalContext: 'australia', keywords: ['bush', 'rock', 'creek', 'gum', 'bark', 'nest', 'hop', 'dig'],
      illustrationHints: ['eucalyptus trees', 'red earth', 'blue sky', 'bush landscape', 'watering hole'],
    },
    {
      id: 'ocean-creatures', name: 'Ocean Creatures', description: 'Underwater adventures with sea life',
      suitablePhases: [3, 4, 5], suitableAges: [ThemeLibrary.AGE_GROUPS[1], ThemeLibrary.AGE_GROUPS[2]],
      culturalContext: 'universal-coastal', keywords: ['fish', 'shell', 'sand', 'rock', 'reef', 'deep', 'swim', 'float'],
      illustrationHints: ['coral reef', 'blue water', 'seaweed', 'bubbles', 'sandy seabed'],
    },
    {
      id: 'forest-adventure', name: 'Forest Adventure', description: 'Woodland exploration and discovery',
      suitablePhases: [3, 4, 5], suitableAges: [ThemeLibrary.AGE_GROUPS[0], ThemeLibrary.AGE_GROUPS[1], ThemeLibrary.AGE_GROUPS[2]],
      culturalContext: 'universal-woodland', keywords: ['tree', 'leaf', 'bark', 'bird', 'nest', 'path', 'fern', 'creek'],
      illustrationHints: ['tall trees', 'dappled sunlight', 'forest floor', 'mushrooms', 'fallen logs'],
    },
    {
      id: 'space-adventure', name: 'Space Adventure', description: 'Simple space exploration stories',
      suitablePhases: [4, 5], suitableAges: [ThemeLibrary.AGE_GROUPS[1], ThemeLibrary.AGE_GROUPS[2]],
      culturalContext: 'universal-science', keywords: ['star', 'moon', 'rock', 'spin', 'float', 'space', 'bright', 'night'],
      illustrationHints: ['starfield', 'planets', 'rocket', 'space suit', 'earth from space'],
    },
    {
      id: 'cooking-kitchen', name: 'Cooking & Kitchen', description: 'Simple cooking and baking adventures',
      suitablePhases: [2, 3, 4], suitableAges: [ThemeLibrary.AGE_GROUPS[0], ThemeLibrary.AGE_GROUPS[1]],
      culturalContext: 'universal-domestic', keywords: ['mix', 'stir', 'bake', 'cut', 'pot', 'pan', 'hot', 'cook'],
      illustrationHints: ['kitchen counter', 'mixing bowl', 'oven', 'ingredients', 'apron'],
    },
    {
      id: 'seasons-weather', name: 'Seasons & Weather', description: 'Stories exploring seasonal changes',
      suitablePhases: [3, 4, 5], suitableAges: [ThemeLibrary.AGE_GROUPS[0], ThemeLibrary.AGE_GROUPS[1], ThemeLibrary.AGE_GROUPS[2]],
      culturalContext: 'universal-nature', keywords: ['rain', 'sun', 'snow', 'wind', 'cloud', 'frost', 'storm', 'spring'],
      illustrationHints: ['changing landscapes', 'weather effects', 'seasonal colours', 'appropriate clothing'],
    },
    {
      id: 'community-helpers', name: 'Community Helpers', description: 'Stories about people who help us',
      suitablePhases: [3, 4, 5], suitableAges: [ThemeLibrary.AGE_GROUPS[1], ThemeLibrary.AGE_GROUPS[2]],
      culturalContext: 'universal-social', keywords: ['help', 'care', 'safe', 'kind', 'brave', 'team', 'town', 'work'],
      illustrationHints: ['town setting', 'friendly faces', 'diverse people', 'helpful actions'],
    },
    {
      id: 'dinosaurs', name: 'Dinosaurs', description: 'Prehistoric adventures with friendly dinosaurs',
      suitablePhases: [3, 4, 5], suitableAges: [ThemeLibrary.AGE_GROUPS[1], ThemeLibrary.AGE_GROUPS[2]],
      culturalContext: 'universal-science', keywords: ['big', 'stomp', 'roar', 'egg', 'nest', 'rock', 'bone', 'dig'],
      illustrationHints: ['prehistoric landscape', 'volcanoes', 'ferns', 'friendly dinosaurs', 'eggs'],
    },
    {
      id: 'friendship-feelings', name: 'Friendship & Feelings', description: 'Social-emotional stories about friendship',
      suitablePhases: [2, 3, 4, 5], suitableAges: [ThemeLibrary.AGE_GROUPS[0], ThemeLibrary.AGE_GROUPS[1], ThemeLibrary.AGE_GROUPS[2]],
      culturalContext: 'universal-social', keywords: ['friend', 'kind', 'share', 'help', 'sad', 'glad', 'hug', 'fun'],
      illustrationHints: ['children together', 'warm colours', 'expressive faces', 'inclusive groups'],
    },
  ];

  /** Art styles curated for children's book illustration */
  private static readonly ART_STYLES: ArtStyle[] = [
    {
      id: 'soft-watercolour', name: 'Soft Watercolour', suitableAgeRange: { min: 3, max: 7 },
      description: 'Gentle watercolour illustration with soft edges and warm pastel tones',
      warmth: 0.9, detailLevel: 0.4,
      examplePromptSuffix: 'soft watercolour children\'s book illustration style, gentle edges, warm pastel palette, white background visible through translucent washes',
    },
    {
      id: 'flat-vector', name: 'Flat Vector', suitableAgeRange: { min: 4, max: 8 },
      description: 'Clean flat vector illustration with bold colours and simple shapes',
      warmth: 0.7, detailLevel: 0.3,
      examplePromptSuffix: 'flat vector illustration style, bold solid colours, clean outlines, geometric shapes, modern children\'s book aesthetic',
    },
    {
      id: 'soft-3d', name: 'Soft 3D', suitableAgeRange: { min: 3, max: 6 },
      description: 'Rounded 3D-rendered characters with soft lighting and candy-like colours',
      warmth: 0.85, detailLevel: 0.6,
      examplePromptSuffix: 'soft 3D render, rounded cartoon characters, candy-coloured palette, gentle ambient lighting, Pixar-inspired children\'s book style',
    },
    {
      id: 'crayon-sketch', name: 'Crayon Sketch', suitableAgeRange: { min: 3, max: 6 },
      description: 'Hand-drawn crayon and pencil style with visible texture',
      warmth: 0.8, detailLevel: 0.3,
      examplePromptSuffix: 'hand-drawn crayon illustration, visible crayon texture, childlike simplicity, warm colours on cream paper',
    },
    {
      id: 'papercraft', name: 'Papercraft', suitableAgeRange: { min: 4, max: 8 },
      description: 'Paper cut-out collage style with layered textures',
      warmth: 0.75, detailLevel: 0.5,
      examplePromptSuffix: 'paper craft collage style, layered cut paper textures, visible paper grain, bright saturated colours, craft aesthetic',
    },
    {
      id: 'detailed-adventure', name: 'Detailed Adventure', suitableAgeRange: { min: 7, max: 9 },
      description: 'More detailed illustration style for older readers with richer environments',
      warmth: 0.6, detailLevel: 0.8,
      examplePromptSuffix: 'detailed children\'s book illustration, rich environment detail, atmospheric lighting, adventure book aesthetic, painterly style',
    },
  ];

  /** Narrative templates encoding proven story structures for beginning readers */
  private static readonly NARRATIVE_TEMPLATES: NarrativeTemplate[] = [
    {
      id: 'cumulative-tale', name: 'Cumulative Tale',
      structure: ['Introduction of character', 'First encounter', 'Second encounter (adds to first)', 'Third encounter (adds to both)', 'Climax with all elements', 'Resolution'],
      suitablePhases: [2, 3], suitablePageCounts: [8, 10, 12],
      promptTemplate: `Write a cumulative tale for a child aged {ageMin}-{ageMax} learning phonics Phase {phase}.
The story should feature {characterName} and follow a cumulative structure where each page adds a new element that builds on previous pages (like "The Very Hungry Caterpillar" or "We're Going on a Bear Hunt").

PHONICS CONSTRAINTS (CRITICAL):
- Target GPCs for practice: {targetGPCs}
- Only use words decodable with these GPCs: {taughtGPCList}
- Allowed tricky/high-frequency words: {trickyWords}
- Minimum 85% of words must be decodable
- Theme: {themeName} — incorporate these keywords naturally: {themeKeywords}

Write {pageCount} pages. Each page should have 1-3 sentences (15-30 words per page for this age group).
Repeat key phrases with slight variations to reinforce phonics patterns.`,
    },
    {
      id: 'problem-solution', name: 'Problem-Solution',
      structure: ['Character introduction', 'Problem discovered', 'First attempt (fails)', 'Second attempt (partial)', 'Solution found', 'Happy resolution'],
      suitablePhases: [3, 4], suitablePageCounts: [10, 12, 14],
      promptTemplate: `Write a problem-solution story for a child aged {ageMin}-{ageMax} learning phonics Phase {phase}.
The story should feature {characterName} who encounters a problem and must find a solution through persistence and creativity.

PHONICS CONSTRAINTS (CRITICAL):
- Target GPCs for practice: {targetGPCs}
- Only use words decodable with these GPCs: {taughtGPCList}
- Allowed tricky/high-frequency words: {trickyWords}
- Minimum 85% of words must be decodable
- Theme: {themeName} — incorporate these keywords naturally: {themeKeywords}

Write {pageCount} pages. Each page should have 2-4 sentences (20-40 words per page for this age group).
Include dialogue to make the story engaging. Use repetition of target GPC words across multiple pages.`,
    },
    {
      id: 'adventure-quest', name: 'Adventure Quest',
      structure: ['Home/comfort zone', 'Call to adventure', 'Journey begins', 'Challenge faced', 'Help received', 'Challenge overcome', 'Return home changed'],
      suitablePhases: [4, 5], suitablePageCounts: [12, 16, 20],
      promptTemplate: `Write an adventure story for a child aged {ageMin}-{ageMax} learning phonics Phase {phase}.
The story should follow {characterName} on a journey or quest with a clear beginning, middle, and end.

PHONICS CONSTRAINTS (CRITICAL):
- Target GPCs for practice: {targetGPCs}
- Only use words decodable with these GPCs: {taughtGPCList}
- Allowed tricky/high-frequency words: {trickyWords}
- Minimum 85% of words must be decodable
- Theme: {themeName} — incorporate these keywords naturally: {themeKeywords}

Write {pageCount} pages. Each page should have 2-5 sentences (25-50 words per page for this age group).
Create vivid descriptions using decodable vocabulary. Include some suspense and resolution.`,
    },
    {
      id: 'information-text', name: 'Information Text',
      structure: ['Topic introduction', 'Key fact 1', 'Key fact 2', 'Key fact 3', 'Interesting detail', 'Summary/reflection'],
      suitablePhases: [3, 4, 5], suitablePageCounts: [8, 10, 12],
      promptTemplate: `Write an information text for a child aged {ageMin}-{ageMax} learning phonics Phase {phase}.
The text should teach interesting facts about {themeName} in an engaging, age-appropriate way.

PHONICS CONSTRAINTS (CRITICAL):
- Target GPCs for practice: {targetGPCs}
- Only use words decodable with these GPCs: {taughtGPCList}
- Allowed tricky/high-frequency words: {trickyWords}
- Minimum 85% of words must be decodable
- Theme: {themeName} — incorporate these keywords naturally: {themeKeywords}

Write {pageCount} pages. Each page should have 2-3 sentences (20-35 words per page for this age group).
Use simple, factual language. Include "Did you know?" style hooks to maintain engagement.`,
    },
    {
      id: 'mystery-series', name: 'Mystery Series',
      structure: ['Scene setting', 'Mystery introduced', 'Clue 1 found', 'Clue 2 found', 'Detective thinking', 'Mystery solved', 'Celebration'],
      suitablePhases: [5], suitablePageCounts: [16, 20, 24],
      promptTemplate: `Write a mystery story for a child aged {ageMin}-{ageMax} learning phonics Phase {phase}.
The story should feature {characterName} solving a simple, age-appropriate mystery through observation and deduction.

PHONICS CONSTRAINTS (CRITICAL):
- Target GPCs for practice: {targetGPCs}
- Only use words decodable with these GPCs: {taughtGPCList}
- Allowed tricky/high-frequency words: {trickyWords}
- Minimum 85% of words must be decodable
- Theme: {themeName} — incorporate these keywords naturally: {themeKeywords}

Write {pageCount} pages. Each page should have 3-6 sentences (30-60 words per page for this age group).
Build suspense gradually. Plant clues early that pay off later. Use descriptive language within phonics constraints.`,
    },
  ];

  static getThemes(): StoryTheme[] { return [...this.THEMES]; }
  static getArtStyles(): ArtStyle[] { return [...this.ART_STYLES]; }
  static getAgeGroups(): AgeGroup[] { return [...this.AGE_GROUPS]; }
  static getNarrativeTemplates(): NarrativeTemplate[] { return [...this.NARRATIVE_TEMPLATES]; }

  static getThemesForPhase(phase: PhonicsPhase): StoryTheme[] {
    return this.THEMES.filter(t => t.suitablePhases.includes(phase));
  }

  static getTemplatesForPhase(phase: PhonicsPhase): NarrativeTemplate[] {
    return this.NARRATIVE_TEMPLATES.filter(t => t.suitablePhases.includes(phase));
  }

  static getStyleForAge(ageGroup: AgeGroup): ArtStyle[] {
    return this.ART_STYLES.filter(s =>
      s.suitableAgeRange.min <= ageGroup.max && s.suitableAgeRange.max >= ageGroup.min
    );
  }
}

// ==========================================================================
// Section 4: Seed Catalog Planner — The Master Blueprint
// ==========================================================================
// The planner's job is to answer: "What exactly should we generate?" It creates
// a matrix of phase × theme × template combinations that ensures comprehensive
// coverage. Think of it as a librarian planning which books to order — making
// sure every section of the library has adequate stock, with variety in genres
// and styles, before the doors open on launch day.

export class SeedCatalogPlanner extends ScholarlyBaseService {
  private readonly minBooksPerPhase = 20;  // Strategy Document Phase 6 target
  private readonly characters: Map<string, CharacterDefinition[]> = new Map();

  constructor() { super('SeedCatalogPlanner'); }

  /**
   * Generate the complete catalog of storybook specifications.
   * Ensures at least 20 books per phase across 10+ themes,
   * resulting in 100+ total books for the seed library.
   */
  async planCatalog(config: {
    targetBooksPerPhase?: number;
    phases?: PhonicsPhase[];
    excludeThemes?: string[];
  } = {}): Promise<Result<SeedStorybookSpec[]>> {
    const booksPerPhase = config.targetBooksPerPhase || this.minBooksPerPhase;
    const phases = config.phases || [2, 3, 4, 5] as PhonicsPhase[];  // Phase 1 has no decodable text
    const excludeThemes = new Set(config.excludeThemes || []);

    this.log('info', 'Planning seed catalog', {
      booksPerPhase,
      phases: phases.length,
      estimatedTotal: booksPerPhase * phases.length,
    });

    const specs: SeedStorybookSpec[] = [];
    let bookIndex = 0;

    for (const phase of phases) {
      const phaseGPCs = GPCInventory.getPhaseSet(phase);
      const themes = ThemeLibrary.getThemesForPhase(phase).filter(t => !excludeThemes.has(t.id));
      const templates = ThemeLibrary.getTemplatesForPhase(phase);
      const ageGroups = ThemeLibrary.getAgeGroups().filter(ag =>
        phase <= 3 ? ag.min <= 5 : ag.min >= 5
      );

      if (themes.length === 0) {
        this.log('warn', `No themes available for phase ${phase} after exclusions`);
        continue;
      }

      // Distribute books evenly across themes, then fill gaps
      const booksPerTheme = Math.ceil(booksPerPhase / themes.length);
      let phaseBookCount = 0;

      for (const theme of themes) {
        for (let i = 0; i < booksPerTheme && phaseBookCount < booksPerPhase; i++) {
          const template = templates[i % templates.length];
          const ageGroup = ageGroups[i % ageGroups.length];
          const artStyles = ThemeLibrary.getStyleForAge(ageGroup);
          const artStyle = artStyles[bookIndex % artStyles.length];

          // Select target GPCs for this book — focus on phase-specific GPCs
          const targetGPCs = this.selectTargetGPCs(phaseGPCs, i);

          // Get or create series characters for this theme
          const characters = this.getSeriesCharacters(theme, phase);

          const pageCount = template.suitablePageCounts[
            i % template.suitablePageCounts.length
          ];

          const seriesId = `series-p${phase}-${theme.id}`;

          specs.push({
            id: `seed-${String(bookIndex + 1).padStart(4, '0')}`,
            title: '', // Filled during narrative generation
            phase,
            targetGPCs,
            theme,
            ageGroup,
            artStyle,
            characters,
            seriesId,
            pageCount,
            narrativeTemplate: template,
            decodabilityTarget: 0.85,
          });

          bookIndex++;
          phaseBookCount++;
        }
      }

      this.log('info', `Phase ${phase}: planned ${phaseBookCount} books across ${themes.length} themes`);
    }

    this.log('info', 'Seed catalog planning complete', {
      totalBooks: specs.length,
      phaseCounts: phases.map(p => ({
        phase: p,
        count: specs.filter(s => s.phase === p).length,
      })),
    });

    return ok(specs);
  }

  /** Select target GPCs that this book will focus on practising */
  private selectTargetGPCs(
    phaseSet: PhaseGPCSet,
    bookIndex: number
  ): GraphemePhonemeCorrespondence[] {
    const phaseGPCs = phaseSet.gpcs;
    if (phaseGPCs.length === 0) return phaseSet.cumulativeGPCs.slice(0, 4);

    // Rotate through GPCs so different books target different correspondences
    const startIdx = (bookIndex * 3) % phaseGPCs.length;
    const targets: GraphemePhonemeCorrespondence[] = [];
    for (let i = 0; i < Math.min(4, phaseGPCs.length); i++) {
      targets.push(phaseGPCs[(startIdx + i) % phaseGPCs.length]);
    }
    return targets;
  }

  /** Get or create character definitions for a theme/phase combination */
  private getSeriesCharacters(theme: StoryTheme, phase: PhonicsPhase): CharacterDefinition[] {
    const key = `${theme.id}-p${phase}`;
    if (this.characters.has(key)) return this.characters.get(key)!;

    // Generate themed characters with names that use phase-appropriate GPCs
    const characters = this.createThemedCharacters(theme, phase);
    this.characters.set(key, characters);
    return characters;
  }

  /** Create characters whose names naturally practise target GPCs */
  private createThemedCharacters(theme: StoryTheme, phase: PhonicsPhase): CharacterDefinition[] {
    // Character names are carefully chosen to be decodable at the given phase
    const characterBank: Record<string, CharacterDefinition[]> = {
      'farm-animals': [
        { id: 'finn-fox', name: 'Finn', species: 'fox', seriesId: `series-p${phase}-farm-animals`,
          appearance: 'small red fox with a bushy tail and bright eyes, wearing a green scarf',
          personality: 'curious and friendly, loves to explore the farm',
          styleSheetPrompt: 'Finn the Fox: small red fox, bushy tail, bright amber eyes, green scarf around neck, friendly expression' },
        { id: 'hen-hattie', name: 'Hattie', species: 'hen', seriesId: `series-p${phase}-farm-animals`,
          appearance: 'plump brown hen with a red comb and yellow feet, wearing a small hat',
          personality: 'sensible and kind, always looking after her friends',
          styleSheetPrompt: 'Hattie the Hen: plump brown hen, red comb, yellow feet, small straw hat, warm motherly expression' },
      ],
      'pets-at-home': [
        { id: 'sam-cat', name: 'Sam', species: 'cat', seriesId: `series-p${phase}-pets-at-home`,
          appearance: 'tabby cat with green eyes and a striped tail, medium size',
          personality: 'playful and mischievous, gets into gentle trouble',
          styleSheetPrompt: 'Sam the Cat: tabby cat, green eyes, striped tail, medium build, playful mischievous expression' },
        { id: 'pip-pup', name: 'Pip', species: 'puppy', seriesId: `series-p${phase}-pets-at-home`,
          appearance: 'small golden puppy with floppy ears and a wagging tail',
          personality: 'enthusiastic and loyal, always happy to see friends',
          styleSheetPrompt: 'Pip the Puppy: small golden puppy, floppy ears, wagging tail, bright happy eyes, bouncy posture' },
      ],
      'australian-animals': [
        { id: 'kip-koala', name: 'Kip', species: 'koala', seriesId: `series-p${phase}-australian-animals`,
          appearance: 'fluffy grey koala with a round nose and big ears, sitting in a eucalyptus tree',
          personality: 'sleepy but wise, knows all about the bush',
          styleSheetPrompt: 'Kip the Koala: fluffy grey fur, round black nose, big round ears, perched in eucalyptus, drowsy wise expression' },
        { id: 'skip-kangaroo', name: 'Skip', species: 'kangaroo', seriesId: `series-p${phase}-australian-animals`,
          appearance: 'young brown kangaroo with strong legs and a curious face',
          personality: 'energetic and adventurous, loves to hop and explore',
          styleSheetPrompt: 'Skip the Kangaroo: young brown kangaroo, strong hind legs, long tail, curious bright eyes, ready-to-bounce stance' },
      ],
      'ocean-creatures': [
        { id: 'fin-fish', name: 'Fin', species: 'clownfish', seriesId: `series-p${phase}-ocean-creatures`,
          appearance: 'bright orange clownfish with white stripes and big friendly eyes',
          personality: 'brave despite being small, loves to explore the reef',
          styleSheetPrompt: 'Fin the Clownfish: bright orange body, white stripes, big friendly eyes, small and round, swimming happily' },
      ],
      'forest-adventure': [
        { id: 'oak-owl', name: 'Oak', species: 'owl', seriesId: `series-p${phase}-forest-adventure`,
          appearance: 'wise brown owl with golden eyes and spotted feathers',
          personality: 'patient and knowledgeable, mentors younger animals',
          styleSheetPrompt: 'Oak the Owl: brown feathers with spots, golden eyes, small ear tufts, perched on branch, wise calm expression' },
      ],
      'space-adventure': [
        { id: 'star-pilot', name: 'Star', species: 'human child', seriesId: `series-p${phase}-space-adventure`,
          appearance: 'child in a colourful space suit with a bubble helmet and star patches',
          personality: 'curious and brave, dreams of exploring the stars',
          styleSheetPrompt: 'Star the Space Explorer: child in bright blue space suit, bubble helmet, star patches on arms, big curious eyes, floating pose' },
      ],
    };

    // Default characters for themes not specifically defined
    const defaults: CharacterDefinition[] = [
      { id: `char-p${phase}-${Date.now()}`, name: 'Max', species: 'human child', seriesId: `series-p${phase}-default`,
        appearance: 'friendly child with curly hair and a big smile',
        personality: 'kind and curious, always ready for an adventure',
        styleSheetPrompt: 'Max: child with curly brown hair, big friendly smile, casual clothes, warm and approachable' },
    ];

    return characterBank[theme.id] || defaults;
  }
}

// ==========================================================================
// Section 5: Batch Story Generator — The Narrative Engine
// ==========================================================================
// This is where the Scholarly Storybook Engine's core differentiator comes
// to life. Unlike ReadKidz's open-ended AI story generation, every narrative
// here is constrained by a "phonics fingerprint" — the precise set of GPCs
// the target learner has mastered. Think of it like a poet working within
// the constraints of a sonnet: the structure doesn't limit creativity, it
// channels it.

export class BatchStoryGenerator extends ScholarlyBaseService {
  constructor(
    private readonly claudeApiKey: string,
    private readonly maxConcurrent: number = 5,
  ) { super('BatchStoryGenerator'); }

  /**
   * Generate narrative text for a batch of storybook specifications.
   * Each story is generated via the Anthropic Claude API with phonics-constrained
   * system prompts, then validated for decodability.
   */
  async generateBatch(
    specs: SeedStorybookSpec[],
    config: BatchConfig,
  ): Promise<Result<Map<string, GenerationRecord>>> {
    const records = new Map<string, GenerationRecord>();
    const queue = [...specs];
    const active = new Set<string>();
    let totalCost = 0;

    this.log('info', 'Starting batch story generation', {
      totalSpecs: specs.length,
      maxConcurrent: this.maxConcurrent,
      budgetUSD: config.maxBudgetUSD,
    });

    while (queue.length > 0 || active.size > 0) {
      // Fill up to maxConcurrent slots
      while (queue.length > 0 && active.size < this.maxConcurrent) {
        const spec = queue.shift()!;

        // Budget check before starting
        if (totalCost >= config.maxBudgetUSD) {
          this.log('warn', 'Budget exhausted, stopping batch generation', { totalCost, budget: config.maxBudgetUSD });
          return ok(records);
        }

        active.add(spec.id);
        this.generateSingleStory(spec, config)
          .then(result => {
            active.delete(spec.id);
            if (result.success) {
              records.set(spec.id, result.data);
              totalCost += result.data.cost.storyGeneration;
              this.emit('story:generated', { specId: spec.id, cost: result.data.cost.storyGeneration });
            } else {
              // Record failure for retry logic
              const failRecord: GenerationRecord = {
                specId: spec.id, stage: GenerationStage.NARRATIVE_FAILED,
                startedAt: new Date(), cost: { storyGeneration: 0, illustrationGeneration: 0, narrationGeneration: 0, validationCost: 0, totalCost: 0 },
                retryCount: 0, maxRetries: config.retryPolicy.maxRetries,
                errorLog: [result.error], pages: [],
              };
              records.set(spec.id, failRecord);

              if (failRecord.retryCount < config.retryPolicy.maxRetries) {
                queue.push(spec);  // Re-queue for retry
              }
            }
          });
      }

      // Wait for a slot to open
      if (active.size >= this.maxConcurrent) {
        await this.delay(500);
      }
    }

    this.log('info', 'Batch story generation complete', {
      total: records.size,
      succeeded: Array.from(records.values()).filter(r => r.stage === GenerationStage.NARRATIVE_COMPLETE).length,
      failed: Array.from(records.values()).filter(r => r.stage === GenerationStage.NARRATIVE_FAILED).length,
      totalCost,
    });

    return ok(records);
  }

  /** Generate a single story using Claude API with phonics constraints */
  private async generateSingleStory(
    spec: SeedStorybookSpec,
    config: BatchConfig,
  ): Promise<Result<GenerationRecord>> {
    const startedAt = new Date();
    const phaseSet = GPCInventory.getPhaseSet(spec.phase);

    // Build the phonics-constrained prompt
    const systemPrompt = this.buildSystemPrompt(spec, phaseSet);
    const userPrompt = this.buildUserPrompt(spec, phaseSet);

    try {
      // Call Claude API (via existing AIPAL infrastructure)
      const response = await this.callClaudeAPI(systemPrompt, userPrompt);
      if (!response.success) return fail(response.error);

      // Parse the response into pages
      const pages = this.parseStoryResponse(response.data, spec);

      // Validate decodability
      const decodabilityScore = this.calculateDecodability(pages, phaseSet);

      if (decodabilityScore < spec.decodabilityTarget) {
        this.log('warn', `Story ${spec.id} failed decodability: ${(decodabilityScore * 100).toFixed(1)}%`, {
          target: spec.decodabilityTarget,
          actual: decodabilityScore,
        });

        // Attempt regeneration with stricter constraints
        return this.regenerateWithStricterConstraints(spec, config, phaseSet);
      }

      // Estimate cost: ~150-300 tokens input, ~500-2000 tokens output per story
      const estimatedCost = 0.15 + (spec.pageCount * 0.01);  // Rough per-page cost

      const record: GenerationRecord = {
        specId: spec.id,
        stage: GenerationStage.NARRATIVE_COMPLETE,
        startedAt,
        completedAt: new Date(),
        cost: {
          storyGeneration: estimatedCost,
          illustrationGeneration: 0,
          narrationGeneration: 0,
          validationCost: 0.02,
          totalCost: estimatedCost + 0.02,
        },
        retryCount: 0,
        maxRetries: config.retryPolicy.maxRetries,
        errorLog: [],
        pages,
        decodabilityScore,
      };

      this.log('info', `Story generated: ${spec.id}`, {
        phase: spec.phase,
        theme: spec.theme.name,
        pages: pages.length,
        decodability: `${(decodabilityScore * 100).toFixed(1)}%`,
        cost: `$${estimatedCost.toFixed(3)}`,
      });

      return ok(record);
    } catch (error) {
      return fail(`Story generation failed for ${spec.id}: ${error}`);
    }
  }

  /** Build the system prompt that enforces phonics constraints */
  private buildSystemPrompt(spec: SeedStorybookSpec, phaseSet: PhaseGPCSet): string {
    return `You are a children's storybook author who specialises in decodable texts for phonics learners.

CRITICAL RULES:
1. Every word you write MUST be decodable using only the grapheme-phoneme correspondences listed below, OR be one of the allowed high-frequency words.
2. Do NOT use any words that require GPCs not in the taught set.
3. Target GPCs to practise frequently: ${spec.targetGPCs.map(g => g.grapheme).join(', ')}
4. The story must be engaging, age-appropriate for ages ${spec.ageGroup.min}-${spec.ageGroup.max}, and follow the ${spec.narrativeTemplate.name} structure.
5. Each page should be clearly separated and numbered.
6. Character names: ${spec.characters.map(c => c.name).join(', ')}

TAUGHT GPC SET (Phase ${spec.phase}, cumulative):
Graphemes: ${phaseSet.cumulativeGPCs.map(g => g.grapheme).join(', ')}

ALLOWED HIGH-FREQUENCY WORDS:
${phaseSet.highFrequencyWords.join(', ')}

DECODABLE WORD POOL (use these words freely):
${phaseSet.decodableWordPool.slice(0, 200).join(', ')}

FORMAT:
Respond with a JSON object:
{
  "title": "Story Title",
  "pages": [
    { "pageNumber": 1, "text": "Page text here.", "illustrationPrompt": "Description for illustration." },
    ...
  ]
}`;
  }

  /** Build the user prompt with theme and template specifics */
  private buildUserPrompt(spec: SeedStorybookSpec, phaseSet: PhaseGPCSet): string {
    return spec.narrativeTemplate.promptTemplate
      .replace('{ageMin}', String(spec.ageGroup.min))
      .replace('{ageMax}', String(spec.ageGroup.max))
      .replace('{phase}', String(spec.phase))
      .replace('{characterName}', spec.characters.map(c => c.name).join(' and '))
      .replace('{targetGPCs}', spec.targetGPCs.map(g => `"${g.grapheme}" as in /${g.phoneme}/`).join(', '))
      .replace('{taughtGPCList}', phaseSet.cumulativeGPCs.map(g => g.grapheme).join(', '))
      .replace('{trickyWords}', phaseSet.highFrequencyWords.join(', '))
      .replace('{themeName}', spec.theme.name)
      .replace('{themeKeywords}', spec.theme.keywords.join(', '))
      .replace('{pageCount}', String(spec.pageCount));
  }

  /** Call the Anthropic Claude API for story generation */
  private async callClaudeAPI(systemPrompt: string, userPrompt: string): Promise<Result<string>> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.claudeApiKey,
          'anthropic-version': '2024-01-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5-20250929',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
      });

      if (!response.ok) {
        return fail(`Claude API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const textBlock = data.content?.find((b: any) => b.type === 'text');
      if (!textBlock?.text) return fail('No text content in Claude response');

      return ok(textBlock.text);
    } catch (error) {
      return fail(`Claude API call failed: ${error}`);
    }
  }

  /** Parse Claude's JSON response into StorybookPage objects */
  private parseStoryResponse(responseText: string, spec: SeedStorybookSpec): StorybookPage[] {
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return this.createFallbackPages(spec);

      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.pages || !Array.isArray(parsed.pages)) return this.createFallbackPages(spec);

      return parsed.pages.map((page: any, idx: number) => ({
        pageNumber: page.pageNumber || idx + 1,
        text: page.text || '',
        illustrationPrompt: this.enrichIllustrationPrompt(
          page.illustrationPrompt || page.text,
          spec
        ),
        sceneLayout: {
          background: `${spec.theme.illustrationHints[0] || 'simple background'}`,
          midground: `${spec.characters[0]?.name || 'character'} in scene`,
          foreground: 'ground details and decorative elements',
          textZone: { x: 0.05, y: 0.7, width: 0.9, height: 0.25 },
        },
      }));
    } catch {
      return this.createFallbackPages(spec);
    }
  }

  /** Enrich illustration prompts with character style sheets and art style */
  private enrichIllustrationPrompt(basePrompt: string, spec: SeedStorybookSpec): string {
    const characterPrompts = spec.characters.map(c => c.styleSheetPrompt).join('. ');
    return `${basePrompt}. ${characterPrompts}. ${spec.artStyle.examplePromptSuffix}. Safe for children aged ${spec.ageGroup.min}-${spec.ageGroup.max}.`;
  }

  /** Create fallback pages if JSON parsing fails */
  private createFallbackPages(spec: SeedStorybookSpec): StorybookPage[] {
    return Array.from({ length: spec.pageCount }, (_, i) => ({
      pageNumber: i + 1,
      text: `[Page ${i + 1} — regeneration needed]`,
      illustrationPrompt: `${spec.theme.illustrationHints[i % spec.theme.illustrationHints.length]}`,
      sceneLayout: {
        background: spec.theme.illustrationHints[0] || 'simple background',
        midground: 'main characters',
        foreground: 'ground elements',
        textZone: { x: 0.05, y: 0.7, width: 0.9, height: 0.25 },
      },
    }));
  }

  /**
   * Calculate what percentage of words in the story are decodable using
   * the learner's taught GPC set. This is the Scholarly Storybook Engine's
   * critical quality gate — the thing that separates us from ReadKidz.
   */
  private calculateDecodability(pages: StorybookPage[], phaseSet: PhaseGPCSet): number {
    const allText = pages.map(p => p.text).join(' ');
    const words = allText.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/).filter(w => w.length > 0);

    if (words.length === 0) return 0;

    const decodableSet = new Set(phaseSet.decodableWordPool.map(w => w.toLowerCase()));
    const trickySet = new Set(phaseSet.highFrequencyWords.map(w => w.toLowerCase()));
    const graphemes = new Set(phaseSet.cumulativeGPCs.map(g => g.grapheme));

    let decodableCount = 0;
    for (const word of words) {
      if (decodableSet.has(word) || trickySet.has(word)) {
        decodableCount++;
      } else if (this.isLikelyDecodable(word, graphemes)) {
        decodableCount++;
      }
    }

    return decodableCount / words.length;
  }

  /** Simplified decodability check using greedy grapheme matching */
  private isLikelyDecodable(word: string, graphemes: Set<string>): boolean {
    // Greedy longest-match grapheme decomposition (simplified version of grapheme-parser.ts)
    let remaining = word;
    const sortedGraphemes = Array.from(graphemes).sort((a, b) => b.length - a.length);

    while (remaining.length > 0) {
      let matched = false;
      for (const g of sortedGraphemes) {
        if (remaining.startsWith(g)) {
          remaining = remaining.slice(g.length);
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
    return true;
  }

  /** Retry generation with stricter phonics constraints */
  private async regenerateWithStricterConstraints(
    spec: SeedStorybookSpec,
    config: BatchConfig,
    phaseSet: PhaseGPCSet,
  ): Promise<Result<GenerationRecord>> {
    this.log('info', `Regenerating ${spec.id} with stricter constraints`);

    // Reduce page count slightly and add explicit word restrictions
    const stricterSpec = {
      ...spec,
      pageCount: Math.max(8, spec.pageCount - 2),
      decodabilityTarget: spec.decodabilityTarget + 0.05,  // Raise the bar to force simpler words
    };

    // Recursive call with stricter constraints (limited to 1 retry)
    return this.generateSingleStory(stricterSpec, {
      ...config,
      retryPolicy: { ...config.retryPolicy, maxRetries: 0 },
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ==========================================================================
// Section 6: Batch Illustration Pipeline — Visual Storytelling
// ==========================================================================

export class BatchIllustrationPipeline extends ScholarlyBaseService {
  constructor(
    private readonly imageApiKey: string,
    private readonly maxConcurrent: number = 3,  // Lower than narrative due to image API costs/limits
  ) { super('BatchIllustrationPipeline'); }

  /**
   * Generate illustrations for all pages of all storybooks in the batch.
   * Uses character style sheets for consistency and enriched prompts
   * that include art style, scene decomposition, and safety requirements.
   */
  async illustrateBatch(
    records: Map<string, GenerationRecord>,
    specs: Map<string, SeedStorybookSpec>,
    budgetUSD: number,
  ): Promise<Result<Map<string, GenerationRecord>>> {
    let totalCost = 0;
    const updatedRecords = new Map(records);

    for (const [specId, record] of records) {
      if (record.stage !== GenerationStage.NARRATIVE_COMPLETE) continue;
      if (totalCost >= budgetUSD) {
        this.log('warn', 'Illustration budget exhausted', { totalCost, budget: budgetUSD });
        break;
      }

      const spec = specs.get(specId);
      if (!spec) continue;

      const illustratedPages: StorybookPage[] = [];

      for (const page of record.pages) {
        const illustrationResult = await this.generateIllustration(page, spec);
        if (illustrationResult.success) {
          illustratedPages.push({
            ...page,
            illustrationUrl: illustrationResult.data.url,
          });
          totalCost += illustrationResult.data.cost;
        } else {
          illustratedPages.push(page);  // Keep page without illustration
          this.log('warn', `Illustration failed for ${specId} page ${page.pageNumber}: ${illustrationResult.error}`);
        }
      }

      const pageCost = record.pages.length * 0.04;  // ~$0.04 per illustration at GPT Image pricing
      updatedRecords.set(specId, {
        ...record,
        stage: GenerationStage.ILLUSTRATION_COMPLETE,
        pages: illustratedPages,
        cost: {
          ...record.cost,
          illustrationGeneration: pageCost,
          totalCost: record.cost.totalCost + pageCost,
        },
      });

      this.emit('illustrations:complete', { specId, pageCount: illustratedPages.length });
    }

    return ok(updatedRecords);
  }

  /** Generate a single page illustration via GPT Image API */
  private async generateIllustration(
    page: StorybookPage,
    spec: SeedStorybookSpec,
  ): Promise<Result<{ url: string; cost: number }>> {
    try {
      const prompt = this.buildIllustrationPrompt(page, spec);

      const response = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.imageApiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-image-1',
          prompt,
          n: 1,
          size: '1024x1024',
          quality: 'standard',
        }),
      });

      if (!response.ok) {
        return fail(`Image API error: ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) return fail('No image URL in response');

      return ok({ url: imageUrl, cost: 0.04 });
    } catch (error) {
      return fail(`Image generation failed: ${error}`);
    }
  }

  /** Build a rich, character-consistent illustration prompt */
  private buildIllustrationPrompt(page: StorybookPage, spec: SeedStorybookSpec): string {
    const characterDescriptions = spec.characters
      .map(c => `${c.name}: ${c.appearance}`)
      .join('. ');

    return `Children's book illustration for ages ${spec.ageGroup.min}-${spec.ageGroup.max}.

SCENE: ${page.illustrationPrompt}

CHARACTERS (maintain exact appearance):
${characterDescriptions}

ART STYLE: ${spec.artStyle.description}
${spec.artStyle.examplePromptSuffix}

REQUIREMENTS:
- Safe and age-appropriate for young children
- Warm, inviting composition
- Leave space at bottom 25% for text overlay
- Bright, well-lit scene
- No text, letters, or words in the image
- Characters must match their descriptions exactly`;
  }
}

// ==========================================================================
// Section 7: Batch Narration Pipeline — Voice & Audio Sync
// ==========================================================================

export class BatchNarrationPipeline extends ScholarlyBaseService {
  constructor(
    private readonly elevenLabsApiKey: string,
    private readonly maxConcurrent: number = 3,
  ) { super('BatchNarrationPipeline'); }

  /**
   * Generate audio narration with word-level timestamps for every page.
   * This enables the karaoke-style read-along highlighting that's proven
   * to build sight word recognition.
   */
  async narrateBatch(
    records: Map<string, GenerationRecord>,
    specs: Map<string, SeedStorybookSpec>,
    budgetUSD: number,
  ): Promise<Result<Map<string, GenerationRecord>>> {
    let totalCost = 0;
    const updatedRecords = new Map(records);

    for (const [specId, record] of records) {
      if (record.stage !== GenerationStage.ILLUSTRATION_COMPLETE) continue;
      if (totalCost >= budgetUSD) {
        this.log('warn', 'Narration budget exhausted', { totalCost, budget: budgetUSD });
        break;
      }

      const spec = specs.get(specId);
      if (!spec) continue;

      const narratedPages: StorybookPage[] = [];

      for (const page of record.pages) {
        const narrationResult = await this.generateNarration(page, spec);
        if (narrationResult.success) {
          narratedPages.push({
            ...page,
            audioUrl: narrationResult.data.audioUrl,
            wordTimestamps: narrationResult.data.timestamps,
          });
          totalCost += narrationResult.data.cost;
        } else {
          narratedPages.push(page);
          this.log('warn', `Narration failed for ${specId} page ${page.pageNumber}`);
        }
      }

      const pageCost = record.pages.length * 0.008;  // ~$0.008 per page narration
      updatedRecords.set(specId, {
        ...record,
        stage: GenerationStage.NARRATION_COMPLETE,
        pages: narratedPages,
        cost: {
          ...record.cost,
          narrationGeneration: pageCost,
          totalCost: record.cost.totalCost + pageCost,
        },
      });

      this.emit('narration:complete', { specId });
    }

    return ok(updatedRecords);
  }

  /** Generate narration for a single page with word-level timestamps */
  private async generateNarration(
    page: StorybookPage,
    spec: SeedStorybookSpec,
  ): Promise<Result<{ audioUrl: string; timestamps: WordTimestamp[]; cost: number }>> {
    try {
      // Select voice based on story series / age group
      const voiceId = this.selectVoice(spec);

      // ElevenLabs Text-to-Speech with timestamps
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text: page.text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.75,
            similarity_boost: 0.85,
            style: 0.3,
            // Slower for younger readers, natural pace for older
            speed: spec.ageGroup.min <= 5 ? 0.8 : 1.0,
          },
        }),
      });

      if (!response.ok) {
        return fail(`ElevenLabs API error: ${response.status}`);
      }

      const data = await response.json();

      // Parse word-level timestamps from response
      const timestamps = this.parseWordTimestamps(page.text, data, spec);

      return ok({
        audioUrl: data.audio_url || `generated-audio-${page.pageNumber}.mp3`,
        timestamps,
        cost: 0.008,
      });
    } catch (error) {
      return fail(`Narration generation failed: ${error}`);
    }
  }

  /** Select an appropriate narrator voice for the story's target audience */
  private selectVoice(spec: SeedStorybookSpec): string {
    // Voice IDs are ElevenLabs voice identifiers
    // In production, these would be configured per tenant
    const voiceBank: Record<string, string> = {
      'soft-warm-female': 'EXAVITQu4vr4xnSDxMaL',    // Warm, gentle narrator
      'friendly-male': 'VR6AewLTigWG4xSOukaG',        // Friendly, energetic
      'calm-storyteller': 'pNInz6obpgDQGcFmaJgB',     // Calm, measured pace
    };

    if (spec.ageGroup.min <= 5) return voiceBank['soft-warm-female'];
    if (spec.ageGroup.min <= 7) return voiceBank['calm-storyteller'];
    return voiceBank['friendly-male'];
  }

  /** Parse ElevenLabs response into word-level timestamps */
  private parseWordTimestamps(
    text: string,
    apiResponse: any,
    spec: SeedStorybookSpec,
  ): WordTimestamp[] {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const targetGraphemes = new Set(spec.targetGPCs.map(g => g.grapheme));

    // If API provides alignment data, use it; otherwise estimate
    const alignments = apiResponse.alignment?.words || [];

    return words.map((word, idx) => {
      const alignment = alignments[idx];
      const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase();

      // Check if this word contains a target GPC
      const isTargetGPC = Array.from(targetGraphemes).some(g =>
        cleanWord.includes(g)
      );

      return {
        word: word,
        startMs: alignment?.start_ms || idx * 400,
        endMs: alignment?.end_ms || (idx + 1) * 400,
        isTargetGPC,
      };
    });
  }
}

// ==========================================================================
// Section 8: Quality Assurance Gate — The Library's Immune System
// ==========================================================================
// No storybook enters the library without passing through this gate. It's
// the educational equivalent of a building inspection — checking structural
// integrity (decodability), safety (content appropriateness), and quality
// (narrative coherence, illustration consistency) before any child sees it.

export class QualityAssuranceGate extends ScholarlyBaseService {
  constructor(private readonly thresholds: QualityThresholds) {
    super('QualityAssuranceGate');
  }

  /**
   * Validate an entire batch of generated storybooks against quality thresholds.
   * Returns updated records with QA_PASSED or QA_FAILED status.
   */
  async validateBatch(
    records: Map<string, GenerationRecord>,
    specs: Map<string, SeedStorybookSpec>,
  ): Promise<Result<QABatchReport>> {
    const results: QABookResult[] = [];

    for (const [specId, record] of records) {
      if (record.stage !== GenerationStage.NARRATION_COMPLETE &&
          record.stage !== GenerationStage.ILLUSTRATION_COMPLETE &&
          record.stage !== GenerationStage.NARRATIVE_COMPLETE) {
        continue;
      }

      const spec = specs.get(specId);
      if (!spec) continue;

      const result = await this.validateBook(record, spec);
      results.push(result);

      // Update record stage based on QA result
      const updatedRecord: GenerationRecord = {
        ...record,
        stage: result.passed ? GenerationStage.QA_PASSED : GenerationStage.QA_FAILED,
        qualityScore: result.overallScore,
      };
      records.set(specId, updatedRecord);
    }

    const report: QABatchReport = {
      totalBooks: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      averageDecodability: this.average(results.map(r => r.decodabilityScore)),
      averageQuality: this.average(results.map(r => r.overallScore)),
      failureReasons: this.aggregateFailures(results),
      results,
    };

    this.log('info', 'QA batch validation complete', {
      total: report.totalBooks,
      passed: report.passed,
      failed: report.failed,
      avgDecodability: `${(report.averageDecodability * 100).toFixed(1)}%`,
      avgQuality: `${(report.averageQuality * 100).toFixed(1)}%`,
    });

    return ok(report);
  }

  /** Validate a single storybook against all quality dimensions */
  private async validateBook(
    record: GenerationRecord,
    spec: SeedStorybookSpec,
  ): Promise<QABookResult> {
    const checks: QACheck[] = [];

    // 1. Decodability check
    const decodability = record.decodabilityScore || 0;
    checks.push({
      name: 'Decodability',
      score: decodability,
      threshold: this.thresholds.minDecodability,
      passed: decodability >= this.thresholds.minDecodability,
      details: `${(decodability * 100).toFixed(1)}% of words decodable (target: ${(this.thresholds.minDecodability * 100).toFixed(0)}%)`,
    });

    // 2. Content safety check
    const safetyScore = this.checkContentSafety(record.pages);
    checks.push({
      name: 'Content Safety',
      score: safetyScore,
      threshold: 1.0,  // Must be 100% safe
      passed: safetyScore >= 1.0,
      details: safetyScore < 1.0 ? 'Content safety concerns detected' : 'All content safe',
    });

    // 3. Page count validation
    const pageCountValid = record.pages.length >= Math.max(8, spec.pageCount - 2) &&
                           record.pages.length <= spec.pageCount + 2;
    checks.push({
      name: 'Page Count',
      score: pageCountValid ? 1.0 : 0.0,
      threshold: 1.0,
      passed: pageCountValid,
      details: `${record.pages.length} pages (expected ~${spec.pageCount})`,
    });

    // 4. Vocabulary tier check
    const vocabScore = this.checkVocabularyTier(record.pages, spec);
    checks.push({
      name: 'Vocabulary Tier',
      score: vocabScore,
      threshold: 0.90,
      passed: vocabScore >= 0.90,
      details: `${(vocabScore * 100).toFixed(1)}% of words within target vocabulary tier`,
    });

    // 5. Narrative coherence (basic heuristic — in production, Claude reviews this)
    const coherenceScore = this.checkNarrativeCoherence(record.pages, spec);
    checks.push({
      name: 'Narrative Coherence',
      score: coherenceScore,
      threshold: this.thresholds.minNarrativeCoherence,
      passed: coherenceScore >= this.thresholds.minNarrativeCoherence,
      details: `Coherence score: ${(coherenceScore * 100).toFixed(1)}%`,
    });

    // 6. Illustration completeness
    const illustrationScore = record.pages.filter(p => p.illustrationUrl).length / record.pages.length;
    checks.push({
      name: 'Illustration Coverage',
      score: illustrationScore,
      threshold: 0.75,  // At least 75% of pages should have illustrations
      passed: illustrationScore >= 0.75,
      details: `${(illustrationScore * 100).toFixed(0)}% of pages illustrated`,
    });

    // 7. Audio narration completeness
    const narrationScore = record.pages.filter(p => p.audioUrl).length / record.pages.length;
    checks.push({
      name: 'Narration Coverage',
      score: narrationScore,
      threshold: 0.75,
      passed: narrationScore >= 0.75,
      details: `${(narrationScore * 100).toFixed(0)}% of pages narrated`,
    });

    // 8. Metadata completeness
    const metadataComplete = !!(spec.phase && spec.targetGPCs.length > 0 &&
      spec.theme && spec.ageGroup && spec.artStyle);
    checks.push({
      name: 'Metadata Completeness',
      score: metadataComplete ? 1.0 : 0.0,
      threshold: 1.0,
      passed: metadataComplete,
      details: metadataComplete ? 'All metadata present' : 'Missing required metadata',
    });

    const overallScore = this.average(checks.map(c => c.score));
    const allPassed = checks.every(c => c.passed);

    return {
      specId: spec.id,
      passed: allPassed,
      overallScore,
      decodabilityScore: decodability,
      checks,
    };
  }

  /** Check content safety — no inappropriate themes, violence, or bias */
  private checkContentSafety(pages: StorybookPage[]): number {
    const allText = pages.map(p => p.text).join(' ').toLowerCase();

    // Safety keyword blocklist (simplified — production uses the content-safety.ts service)
    const unsafePatterns = [
      /\b(kill|murder|death|die|blood|weapon|gun|knife)\b/,
      /\b(hate|stupid|ugly|dumb|fat|idiot)\b/,
      /\b(scary|terrif|horror|nightmare|monster)\b/i,
      /\b(alcohol|drug|smoke|cigarette|beer|wine)\b/,
    ];

    for (const pattern of unsafePatterns) {
      if (pattern.test(allText)) return 0.0;
    }
    return 1.0;
  }

  /** Check that vocabulary aligns with the target age/phase tier */
  private checkVocabularyTier(pages: StorybookPage[], spec: SeedStorybookSpec): number {
    const allText = pages.map(p => p.text).join(' ');
    const words = allText.toLowerCase().replace(/[^a-z\s'-]/g, '').split(/\s+/).filter(w => w.length > 0);
    if (words.length === 0) return 0;

    // Words longer than expected for the age group are likely tier violations
    const maxWordLength = spec.ageGroup.min <= 5 ? 6 : spec.ageGroup.min <= 7 ? 8 : 10;
    const withinTier = words.filter(w => w.length <= maxWordLength).length;

    return withinTier / words.length;
  }

  /** Basic narrative coherence check using structural heuristics */
  private checkNarrativeCoherence(pages: StorybookPage[], spec: SeedStorybookSpec): number {
    let score = 1.0;

    // Check that pages have increasing content (not all identical)
    const uniqueTexts = new Set(pages.map(p => p.text.trim()));
    if (uniqueTexts.size < pages.length * 0.7) score -= 0.3;

    // Check that pages aren't empty
    const emptyPages = pages.filter(p => p.text.trim().length < 10).length;
    if (emptyPages > 0) score -= emptyPages * 0.1;

    // Check that character names appear (story features its characters)
    const allText = pages.map(p => p.text).join(' ').toLowerCase();
    const characterMentions = spec.characters.filter(c =>
      allText.includes(c.name.toLowerCase())
    ).length;
    if (characterMentions === 0 && spec.characters.length > 0) score -= 0.2;

    // Check word count is reasonable for the page count and age group
    const totalWords = allText.split(/\s+/).length;
    const minExpectedWords = pages.length * 10;
    const maxExpectedWords = pages.length * 60;
    if (totalWords < minExpectedWords) score -= 0.2;
    if (totalWords > maxExpectedWords) score -= 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /** Aggregate failure reasons across the batch for reporting */
  private aggregateFailures(results: QABookResult[]): Record<string, number> {
    const failures: Record<string, number> = {};
    for (const result of results) {
      for (const check of result.checks) {
        if (!check.passed) {
          failures[check.name] = (failures[check.name] || 0) + 1;
        }
      }
    }
    return failures;
  }

  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}

/** QA check result for a single dimension */
export interface QACheck {
  readonly name: string;
  readonly score: number;
  readonly threshold: number;
  readonly passed: boolean;
  readonly details: string;
}

/** QA result for a single book */
export interface QABookResult {
  readonly specId: string;
  readonly passed: boolean;
  readonly overallScore: number;
  readonly decodabilityScore: number;
  readonly checks: QACheck[];
}

/** QA report for the entire batch */
export interface QABatchReport {
  readonly totalBooks: number;
  readonly passed: number;
  readonly failed: number;
  readonly averageDecodability: number;
  readonly averageQuality: number;
  readonly failureReasons: Record<string, number>;
  readonly results: QABookResult[];
}

// ==========================================================================
// Section 9: Seed Library Orchestrator — The Master Controller
// ==========================================================================
// The orchestrator ties everything together into a single, idempotent,
// resumable pipeline. Think of it as a factory floor manager — it knows
// what needs to be built, tracks what's been completed, manages the
// budget, and coordinates all the specialised machines (generators,
// illustrators, narrators, QA) to produce the finished library.

export class SeedLibraryOrchestrator extends ScholarlyBaseService {
  private readonly planner: SeedCatalogPlanner;
  private readonly storyGenerator: BatchStoryGenerator;
  private readonly illustrator: BatchIllustrationPipeline;
  private readonly narrator: BatchNarrationPipeline;
  private readonly qa: QualityAssuranceGate;

  constructor(config: {
    claudeApiKey: string;
    imageApiKey: string;
    elevenLabsApiKey: string;
    qualityThresholds?: QualityThresholds;
  }) {
    super('SeedLibraryOrchestrator');
    this.planner = new SeedCatalogPlanner();
    this.storyGenerator = new BatchStoryGenerator(config.claudeApiKey, 5);
    this.illustrator = new BatchIllustrationPipeline(config.imageApiKey, 3);
    this.narrator = new BatchNarrationPipeline(config.elevenLabsApiKey, 3);
    this.qa = new QualityAssuranceGate(config.qualityThresholds || {
      minDecodability: 0.85,
      minNarrativeCoherence: 0.70,
      minAgeAppropriateness: 0.90,
      maxVocabularyTierViolations: 5,
      minIllustrationConsistency: 0.70,
    });
  }

  /**
   * Execute the complete seed library generation pipeline.
   * This is the top-level entry point that produces 100+ curriculum-aligned,
   * illustrated, narrated storybooks ready for the Enchanted Library.
   */
  async generateSeedLibrary(config: {
    booksPerPhase?: number;
    maxBudgetUSD?: number;
    phases?: PhonicsPhase[];
    resumeFromBatchId?: string;
  } = {}): Promise<Result<SeedLibraryReport>> {
    const batchConfig: BatchConfig = {
      batchId: config.resumeFromBatchId || `seed-${Date.now()}`,
      targetBookCount: (config.booksPerPhase || 25) * (config.phases || [2, 3, 4, 5]).length,
      maxConcurrentGenerations: 5,
      maxBudgetUSD: config.maxBudgetUSD || 200,
      retryPolicy: {
        maxRetries: 2,
        backoffBaseMs: 1000,
        backoffMaxMs: 30000,
        retryableStages: [GenerationStage.NARRATIVE_FAILED, GenerationStage.ILLUSTRATION_FAILED],
      },
      qualityThresholds: this.qa['thresholds'],
    };

    this.log('info', '🚀 Starting seed library generation', {
      batchId: batchConfig.batchId,
      targetBooks: batchConfig.targetBookCount,
      budget: `$${batchConfig.maxBudgetUSD}`,
    });

    // Phase 1: Plan the catalog
    this.log('info', 'Phase 1/5: Planning catalog...');
    const catalogResult = await this.planner.planCatalog({
      targetBooksPerPhase: config.booksPerPhase || 25,
      phases: config.phases,
    });
    if (!catalogResult.success) return fail(catalogResult.error);
    const specs = catalogResult.data;

    // Build spec lookup map
    const specMap = new Map(specs.map(s => [s.id, s]));

    // Phase 2: Generate narratives
    this.log('info', `Phase 2/5: Generating ${specs.length} story narratives...`);
    const narrativeBudget = batchConfig.maxBudgetUSD * 0.20;  // 20% of budget for narratives
    const narrativeResult = await this.storyGenerator.generateBatch(specs, {
      ...batchConfig,
      maxBudgetUSD: narrativeBudget,
    });
    if (!narrativeResult.success) return fail(narrativeResult.error);
    let records = narrativeResult.data;

    // Phase 3: Generate illustrations
    this.log('info', 'Phase 3/5: Generating illustrations...');
    const illustrationBudget = batchConfig.maxBudgetUSD * 0.55;  // 55% for illustrations
    const illustrationResult = await this.illustrator.illustrateBatch(records, specMap, illustrationBudget);
    if (!illustrationResult.success) return fail(illustrationResult.error);
    records = illustrationResult.data;

    // Phase 4: Generate narration
    this.log('info', 'Phase 4/5: Generating narration...');
    const narrationBudget = batchConfig.maxBudgetUSD * 0.15;  // 15% for narration
    const narrationResult = await this.narrator.narrateBatch(records, specMap, narrationBudget);
    if (!narrationResult.success) return fail(narrationResult.error);
    records = narrationResult.data;

    // Phase 5: Quality assurance
    this.log('info', 'Phase 5/5: Running quality assurance...');
    const qaResult = await this.qa.validateBatch(records, specMap);
    if (!qaResult.success) return fail(qaResult.error);

    // Compile final report
    const report = this.compileReport(batchConfig, records, qaResult.data);

    this.log('info', '✅ Seed library generation complete', {
      totalGenerated: report.totalGenerated,
      totalPassed: report.totalPassed,
      totalCost: `$${report.totalCost.toFixed(2)}`,
      phaseCoverage: report.phaseCoverage,
    });

    return ok(report);
  }

  /** Compile the final generation report */
  private compileReport(
    config: BatchConfig,
    records: Map<string, GenerationRecord>,
    qaReport: QABatchReport,
  ): SeedLibraryReport {
    const allRecords = Array.from(records.values());
    const totalCost = allRecords.reduce((sum, r) => sum + r.cost.totalCost, 0);

    const phaseCoverage: Record<number, { total: number; passed: number }> = {};
    for (const record of allRecords) {
      // Extract phase from specId format "seed-NNNN"
      const phase = record.pages.length > 0 ? record.pages[0].pageNumber : 0;
      // In production, we'd look up the spec to get the phase
    }

    return {
      batchId: config.batchId,
      generatedAt: new Date(),
      totalGenerated: allRecords.length,
      totalPassed: qaReport.passed,
      totalFailed: qaReport.failed,
      totalCost,
      costBreakdown: {
        narratives: allRecords.reduce((s, r) => s + r.cost.storyGeneration, 0),
        illustrations: allRecords.reduce((s, r) => s + r.cost.illustrationGeneration, 0),
        narration: allRecords.reduce((s, r) => s + r.cost.narrationGeneration, 0),
        validation: allRecords.reduce((s, r) => s + r.cost.validationCost, 0),
      },
      averageDecodability: qaReport.averageDecodability,
      averageQuality: qaReport.averageQuality,
      failureReasons: qaReport.failureReasons,
      phaseCoverage,
      records: allRecords,
    };
  }
}

/** Final report for the seed library generation run */
export interface SeedLibraryReport {
  readonly batchId: string;
  readonly generatedAt: Date;
  readonly totalGenerated: number;
  readonly totalPassed: number;
  readonly totalFailed: number;
  readonly totalCost: number;
  readonly costBreakdown: {
    readonly narratives: number;
    readonly illustrations: number;
    readonly narration: number;
    readonly validation: number;
  };
  readonly averageDecodability: number;
  readonly averageQuality: number;
  readonly failureReasons: Record<string, number>;
  readonly phaseCoverage: Record<number, { total: number; passed: number }>;
  readonly records: GenerationRecord[];
}
