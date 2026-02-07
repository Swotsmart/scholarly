// =============================================================================
// @scholarly/content-validator — Standalone Content Validation Library
// =============================================================================
// The Content Validator is the quality gatekeeper that stands between a
// creator's storybook and the children who will read it. Unlike the SDK's
// validate endpoint (which requires API access and server-side computation),
// this library runs entirely locally — in a browser, in a CI pipeline, or
// in a terminal. It's the spell-checker for phonics: it catches decodability
// issues, vocabulary problems, safety concerns, and metadata gaps before the
// story ever reaches the review pipeline.
//
// Architecture: Pure TypeScript with zero external dependencies (no API calls,
// no database, no network). Bundles the grapheme-phoneme mapping data and
// GPC reference tables needed for offline decodability analysis. Can be used
// independently or as part of the Content SDK workflow.
//
// File: sdk/content-validator.ts
// Sprint: 8 (Developer Ecosystem & Platform Activation)
// Backlog: DE-002
// Lines: ~680
// =============================================================================

import { Result } from '../shared/result';

// =============================================================================
// Section 1: GPC Reference Data
// =============================================================================
// This is the embedded phonics reference — the same GPC data that lives in
// the database (Sprint 7 LR-001) but bundled for offline use. Each phase
// defines the grapheme-phoneme correspondences that a learner at that level
// has been taught, enabling decodability scoring without network access.
//
// Think of this as the dictionary that the spell-checker consults: without
// it, we can't know whether a word is "decodable" for a given learner.
// =============================================================================

export interface GPCMapping {
  grapheme: string;
  phoneme: string;
  phase: number;
  exampleWords: string[];
  introductionOrder: number;
}

export interface PhaseDefinition {
  phase: number;
  name: string;
  description: string;
  gpcs: GPCMapping[];
  trickyWords: string[];
}

/** Embedded Letters and Sounds GPC reference data (Phases 1-6) */
const PHASE_DEFINITIONS: PhaseDefinition[] = [
  {
    phase: 1,
    name: 'Phase 1: Listening & Speaking',
    description: 'Environmental sounds, instrumental sounds, body percussion, rhythm, rhyme, alliteration, voice sounds, oral blending and segmenting.',
    gpcs: [],
    trickyWords: [],
  },
  {
    phase: 2,
    name: 'Phase 2: Letter-Sound Introduction',
    description: 'Introduction of 19 grapheme-phoneme correspondences and blending for reading.',
    gpcs: [
      { grapheme: 's', phoneme: '/s/', phase: 2, exampleWords: ['sat', 'sun', 'see'], introductionOrder: 1 },
      { grapheme: 'a', phoneme: '/æ/', phase: 2, exampleWords: ['ant', 'at', 'and'], introductionOrder: 2 },
      { grapheme: 't', phoneme: '/t/', phase: 2, exampleWords: ['tap', 'ten', 'tin'], introductionOrder: 3 },
      { grapheme: 'p', phoneme: '/p/', phase: 2, exampleWords: ['pat', 'pin', 'pan'], introductionOrder: 4 },
      { grapheme: 'i', phoneme: '/ɪ/', phase: 2, exampleWords: ['it', 'in', 'is'], introductionOrder: 5 },
      { grapheme: 'n', phoneme: '/n/', phase: 2, exampleWords: ['nap', 'net', 'nip'], introductionOrder: 6 },
      { grapheme: 'm', phoneme: '/m/', phase: 2, exampleWords: ['man', 'mat', 'map'], introductionOrder: 7 },
      { grapheme: 'd', phoneme: '/d/', phase: 2, exampleWords: ['dad', 'dip', 'din'], introductionOrder: 8 },
      { grapheme: 'g', phoneme: '/ɡ/', phase: 2, exampleWords: ['got', 'gap', 'gig'], introductionOrder: 9 },
      { grapheme: 'o', phoneme: '/ɒ/', phase: 2, exampleWords: ['on', 'off', 'odd'], introductionOrder: 10 },
      { grapheme: 'c', phoneme: '/k/', phase: 2, exampleWords: ['cat', 'cap', 'cot'], introductionOrder: 11 },
      { grapheme: 'k', phoneme: '/k/', phase: 2, exampleWords: ['kit', 'kid', 'keg'], introductionOrder: 12 },
      { grapheme: 'ck', phoneme: '/k/', phase: 2, exampleWords: ['kick', 'sock', 'duck'], introductionOrder: 13 },
      { grapheme: 'e', phoneme: '/ɛ/', phase: 2, exampleWords: ['egg', 'end', 'elf'], introductionOrder: 14 },
      { grapheme: 'u', phoneme: '/ʌ/', phase: 2, exampleWords: ['up', 'us', 'urn'], introductionOrder: 15 },
      { grapheme: 'r', phoneme: '/r/', phase: 2, exampleWords: ['run', 'red', 'rip'], introductionOrder: 16 },
      { grapheme: 'h', phoneme: '/h/', phase: 2, exampleWords: ['hat', 'him', 'hot'], introductionOrder: 17 },
      { grapheme: 'b', phoneme: '/b/', phase: 2, exampleWords: ['bat', 'big', 'bad'], introductionOrder: 18 },
      { grapheme: 'f', phoneme: '/f/', phase: 2, exampleWords: ['fun', 'fit', 'fan'], introductionOrder: 19 },
    ],
    trickyWords: ['the', 'to', 'I', 'no', 'go', 'into'],
  },
  {
    phase: 3,
    name: 'Phase 3: Remaining Phonemes',
    description: 'Completes the basic code with consonant digraphs, vowel digraphs, and trigraphs.',
    gpcs: [
      { grapheme: 'j', phoneme: '/dʒ/', phase: 3, exampleWords: ['jog', 'jam', 'jet'], introductionOrder: 1 },
      { grapheme: 'v', phoneme: '/v/', phase: 3, exampleWords: ['van', 'vet', 'vim'], introductionOrder: 2 },
      { grapheme: 'w', phoneme: '/w/', phase: 3, exampleWords: ['win', 'wet', 'wag'], introductionOrder: 3 },
      { grapheme: 'x', phoneme: '/ks/', phase: 3, exampleWords: ['box', 'fix', 'six'], introductionOrder: 4 },
      { grapheme: 'y', phoneme: '/j/', phase: 3, exampleWords: ['yes', 'yet', 'yap'], introductionOrder: 5 },
      { grapheme: 'z', phoneme: '/z/', phase: 3, exampleWords: ['zip', 'zoo', 'zap'], introductionOrder: 6 },
      { grapheme: 'zz', phoneme: '/z/', phase: 3, exampleWords: ['buzz', 'fizz', 'jazz'], introductionOrder: 7 },
      { grapheme: 'qu', phoneme: '/kw/', phase: 3, exampleWords: ['quit', 'quiz', 'queen'], introductionOrder: 8 },
      { grapheme: 'ch', phoneme: '/tʃ/', phase: 3, exampleWords: ['chip', 'chat', 'chin'], introductionOrder: 9 },
      { grapheme: 'sh', phoneme: '/ʃ/', phase: 3, exampleWords: ['ship', 'shop', 'shed'], introductionOrder: 10 },
      { grapheme: 'th', phoneme: '/θ/', phase: 3, exampleWords: ['thin', 'this', 'that'], introductionOrder: 11 },
      { grapheme: 'ng', phoneme: '/ŋ/', phase: 3, exampleWords: ['ring', 'sing', 'song'], introductionOrder: 12 },
      { grapheme: 'ai', phoneme: '/eɪ/', phase: 3, exampleWords: ['rain', 'tail', 'paid'], introductionOrder: 13 },
      { grapheme: 'ee', phoneme: '/iː/', phase: 3, exampleWords: ['see', 'tree', 'feet'], introductionOrder: 14 },
      { grapheme: 'igh', phoneme: '/aɪ/', phase: 3, exampleWords: ['high', 'night', 'light'], introductionOrder: 15 },
      { grapheme: 'oa', phoneme: '/əʊ/', phase: 3, exampleWords: ['boat', 'coat', 'goat'], introductionOrder: 16 },
      { grapheme: 'oo', phoneme: '/uː/', phase: 3, exampleWords: ['moon', 'food', 'boot'], introductionOrder: 17 },
      { grapheme: 'oo', phoneme: '/ʊ/', phase: 3, exampleWords: ['book', 'look', 'cook'], introductionOrder: 18 },
      { grapheme: 'ar', phoneme: '/ɑː/', phase: 3, exampleWords: ['car', 'star', 'park'], introductionOrder: 19 },
      { grapheme: 'or', phoneme: '/ɔː/', phase: 3, exampleWords: ['for', 'sort', 'cork'], introductionOrder: 20 },
      { grapheme: 'ur', phoneme: '/ɜː/', phase: 3, exampleWords: ['fur', 'burn', 'hurt'], introductionOrder: 21 },
      { grapheme: 'ow', phoneme: '/aʊ/', phase: 3, exampleWords: ['cow', 'now', 'how'], introductionOrder: 22 },
      { grapheme: 'oi', phoneme: '/ɔɪ/', phase: 3, exampleWords: ['oil', 'coin', 'join'], introductionOrder: 23 },
      { grapheme: 'ear', phoneme: '/ɪə/', phase: 3, exampleWords: ['ear', 'near', 'fear'], introductionOrder: 24 },
      { grapheme: 'air', phoneme: '/eə/', phase: 3, exampleWords: ['air', 'fair', 'hair'], introductionOrder: 25 },
      { grapheme: 'ure', phoneme: '/ʊə/', phase: 3, exampleWords: ['sure', 'pure', 'cure'], introductionOrder: 26 },
      { grapheme: 'er', phoneme: '/ə/', phase: 3, exampleWords: ['her', 'fern', 'term'], introductionOrder: 27 },
      { grapheme: 'll', phoneme: '/l/', phase: 3, exampleWords: ['ball', 'bell', 'full'], introductionOrder: 28 },
    ],
    trickyWords: ['he', 'she', 'we', 'me', 'be', 'was', 'my', 'you', 'her', 'they', 'all', 'are'],
  },
  {
    phase: 4,
    name: 'Phase 4: Consonant Clusters & Polysyllabic Words',
    description: 'Adjacent consonants (CCVC, CVCC, CCVCC) and two-syllable words. No new GPCs introduced.',
    gpcs: [],
    trickyWords: ['said', 'have', 'like', 'so', 'do', 'some', 'come', 'were', 'there', 'little', 'one', 'when', 'out', 'what'],
  },
  {
    phase: 5,
    name: 'Phase 5: Alternative Spellings & Pronunciations',
    description: 'Alternative graphemes for known phonemes and alternative pronunciations for known graphemes.',
    gpcs: [
      { grapheme: 'ay', phoneme: '/eɪ/', phase: 5, exampleWords: ['day', 'play', 'say'], introductionOrder: 1 },
      { grapheme: 'ou', phoneme: '/aʊ/', phase: 5, exampleWords: ['out', 'cloud', 'shout'], introductionOrder: 2 },
      { grapheme: 'ie', phoneme: '/aɪ/', phase: 5, exampleWords: ['tie', 'lie', 'pie'], introductionOrder: 3 },
      { grapheme: 'ea', phoneme: '/iː/', phase: 5, exampleWords: ['sea', 'read', 'bead'], introductionOrder: 4 },
      { grapheme: 'oy', phoneme: '/ɔɪ/', phase: 5, exampleWords: ['toy', 'boy', 'joy'], introductionOrder: 5 },
      { grapheme: 'ir', phoneme: '/ɜː/', phase: 5, exampleWords: ['girl', 'bird', 'first'], introductionOrder: 6 },
      { grapheme: 'ue', phoneme: '/uː/', phase: 5, exampleWords: ['blue', 'glue', 'true'], introductionOrder: 7 },
      { grapheme: 'aw', phoneme: '/ɔː/', phase: 5, exampleWords: ['saw', 'paw', 'law'], introductionOrder: 8 },
      { grapheme: 'wh', phoneme: '/w/', phase: 5, exampleWords: ['when', 'what', 'which'], introductionOrder: 9 },
      { grapheme: 'ph', phoneme: '/f/', phase: 5, exampleWords: ['phone', 'photo', 'graph'], introductionOrder: 10 },
      { grapheme: 'ew', phoneme: '/uː/', phase: 5, exampleWords: ['new', 'blew', 'flew'], introductionOrder: 11 },
      { grapheme: 'oe', phoneme: '/əʊ/', phase: 5, exampleWords: ['toe', 'doe', 'goes'], introductionOrder: 12 },
      { grapheme: 'au', phoneme: '/ɔː/', phase: 5, exampleWords: ['haul', 'Paul', 'launch'], introductionOrder: 13 },
      { grapheme: 'a_e', phoneme: '/eɪ/', phase: 5, exampleWords: ['make', 'came', 'lake'], introductionOrder: 14 },
      { grapheme: 'e_e', phoneme: '/iː/', phase: 5, exampleWords: ['these', 'theme', 'Eve'], introductionOrder: 15 },
      { grapheme: 'i_e', phoneme: '/aɪ/', phase: 5, exampleWords: ['like', 'time', 'ride'], introductionOrder: 16 },
      { grapheme: 'o_e', phoneme: '/əʊ/', phase: 5, exampleWords: ['home', 'bone', 'note'], introductionOrder: 17 },
      { grapheme: 'u_e', phoneme: '/uː/', phase: 5, exampleWords: ['cute', 'tune', 'June'], introductionOrder: 18 },
    ],
    trickyWords: ['oh', 'their', 'people', 'Mr', 'Mrs', 'looked', 'called', 'asked', 'could', 'should', 'would'],
  },
  {
    phase: 6,
    name: 'Phase 6: Fluency & Spelling',
    description: 'Suffixes, prefixes, spelling rules, and increasing fluency. Focus on morphology and spelling patterns.',
    gpcs: [],
    trickyWords: ['through', 'thought', 'although', 'enough', 'because', 'different', 'beautiful', 'before', 'after', 'everyone'],
  },
];

// =============================================================================
// Section 2: Validation Types
// =============================================================================

export type IssueSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  location?: {
    page?: number;
    word?: string;
    field?: string;
    lineNumber?: number;
  };
}

export interface DecodabilityReport {
  score: number;
  totalWords: number;
  decodableWords: number;
  trickyWordsUsed: string[];
  undecodableWords: Array<{
    word: string;
    page: number;
    missingGpcs: string[];
  }>;
  gpcCoverage: Record<string, number>;
}

export interface SafetyReport {
  safe: boolean;
  flaggedContent: Array<{
    page: number;
    text: string;
    reason: string;
    severity: IssueSeverity;
  }>;
}

export interface MetadataReport {
  complete: boolean;
  missingFields: string[];
  warnings: string[];
}

export interface VocabularyReport {
  totalUniqueWords: number;
  tier1Words: string[];
  tier2Words: string[];
  tier3Words: string[];
  averageSentenceLength: number;
  longestSentence: { text: string; wordCount: number; page: number };
  wordFrequencyDistribution: Record<string, number>;
}

export interface ComprehensiveValidationResult {
  valid: boolean;
  decodability: DecodabilityReport;
  safety: SafetyReport;
  metadata: MetadataReport;
  vocabulary: VocabularyReport;
  curriculumAlignmentScore: number;
  issues: ValidationIssue[];
  suggestions: string[];
  validatedAt: string;
}

// =============================================================================
// Section 3: Storybook Input Schema
// =============================================================================
// This is the shape that creators must provide when submitting a storybook
// for validation. It mirrors the Storybook type in the Content SDK but
// without server-generated fields (id, createdAt, analytics, etc.).
// =============================================================================

export interface StorybookInput {
  title: string;
  phase: number;
  targetGpcs: string[];
  taughtGpcSet: string[];
  pages: Array<{
    pageNumber: number;
    text: string;
  }>;
  ageRange?: { min: number; max: number };
  vocabularyTier?: string;
  decodabilityThreshold?: number;
  narrativeTemplate?: string;
  seriesId?: string;
  language?: string;
  curriculumFramework?: string;
  comprehensionStrand?: string;
  morphemeFocus?: string[];
  culturalContext?: string[];
}

// =============================================================================
// Section 4: Grapheme Parser (Offline DAG Engine)
// =============================================================================
// This is a lightweight version of the grapheme-parser.ts DAG decomposition
// engine from Sprint 1, optimised for offline use. It takes a word and a set
// of taught GPCs, and determines whether the word is decodable by finding a
// valid path through the word using only the taught graphemes.
//
// The algorithm uses a greedy longest-match approach: for each position in
// the word, it tries the longest possible grapheme first (e.g., "igh" before
// "i"), then falls back to shorter matches. This mirrors how SSP teaches
// children to decode — look for the biggest pattern first.
// =============================================================================

class GraphemeParser {
  private readonly gpcMap: Map<string, Set<string>>;
  private readonly maxGraphemeLength: number;

  constructor(taughtGpcs: string[]) {
    this.gpcMap = new Map();
    let maxLen = 1;

    for (const gpc of taughtGpcs) {
      // Handle split digraphs (e.g., "a_e") — stored as-is
      const grapheme = gpc.toLowerCase();
      if (!this.gpcMap.has(grapheme)) {
        this.gpcMap.set(grapheme, new Set());
      }
      maxLen = Math.max(maxLen, grapheme.replace('_', '').length);
    }

    this.maxGraphemeLength = maxLen;
  }

  /**
   * Attempt to decompose a word into taught graphemes.
   * Returns the grapheme sequence if decodable, or null if not.
   */
  parse(word: string): string[] | null {
    const normalised = word.toLowerCase().replace(/[^a-z]/g, '');
    if (normalised.length === 0) return [];

    // Check for split digraphs first (e.g., "make" → m + a_e + k)
    const splitResult = this.trySplitDigraphs(normalised);
    if (splitResult) return splitResult;

    // Greedy longest-match traversal
    return this.greedyParse(normalised, 0, []);
  }

  private greedyParse(word: string, pos: number, path: string[]): string[] | null {
    if (pos >= word.length) return path;

    // Try longest graphemes first
    for (let len = Math.min(this.maxGraphemeLength, word.length - pos); len >= 1; len--) {
      const candidate = word.substring(pos, pos + len);
      if (this.gpcMap.has(candidate)) {
        const result = this.greedyParse(word, pos + len, [...path, candidate]);
        if (result) return result;
      }
    }

    return null; // No valid decomposition found
  }

  private trySplitDigraphs(word: string): string[] | null {
    // Split digraphs: a_e, e_e, i_e, o_e, u_e
    const splitDigraphs = ['a_e', 'e_e', 'i_e', 'o_e', 'u_e'];
    const vowels = ['a', 'e', 'i', 'o', 'u'];

    for (const sd of splitDigraphs) {
      if (!this.gpcMap.has(sd)) continue;
      const vowel = sd[0];

      // Find pattern: vowel + consonant(s) + 'e' at end
      for (let i = 0; i < word.length - 2; i++) {
        if (word[i] === vowel && word[word.length - 1] === 'e' && !vowels.includes(word[i + 1])) {
          // Try to parse: prefix + split_digraph(vowel...e) + middle consonants
          const prefix = word.substring(0, i);
          const middle = word.substring(i + 1, word.length - 1);

          const prefixParsed = prefix.length === 0 ? [] : this.greedyParse(prefix, 0, []);
          const middleParsed = middle.length === 0 ? [] : this.greedyParse(middle, 0, []);

          if (prefixParsed !== null && middleParsed !== null) {
            return [...prefixParsed, sd, ...middleParsed];
          }
        }
      }
    }

    return null;
  }

  /** Check if a single word is decodable with the taught GPC set */
  isDecodable(word: string): boolean {
    return this.parse(word) !== null;
  }
}

// =============================================================================
// Section 5: Safety Checker (Offline Heuristic)
// =============================================================================
// A lightweight content safety scanner that checks for inappropriate content
// without requiring an API call. This isn't a replacement for the full
// content-safety.ts pipeline (which uses Claude for nuanced analysis), but
// it catches obvious issues before submission.
// =============================================================================

class SafetyChecker {
  // Patterns that should never appear in children's content
  private static readonly BLOCKED_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /\b(kill|murder|death|dead|die|dying)\b/gi, reason: 'Violence-related language inappropriate for target age group' },
    { pattern: /\b(hate|stupid|dumb|ugly|fat|loser)\b/gi, reason: 'Potentially hurtful or derogatory language' },
    { pattern: /\b(gun|knife|weapon|sword|blood)\b/gi, reason: 'Weapon or violence imagery' },
    { pattern: /\b(scary|terrified|horror|nightmare|monster)\b/gi, reason: 'Fear-inducing content (review for age-appropriateness)' },
    { pattern: /\b(beer|wine|alcohol|drunk|cigarette|smoke|drug)\b/gi, reason: 'Substance references inappropriate for children' },
  ];

  // Warning patterns — not blocked, but flagged for review
  private static readonly WARNING_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
    { pattern: /\b(alone|lost|abandoned|scared)\b/gi, reason: 'Themes of isolation or fear — verify age-appropriate handling' },
    { pattern: /\b(stranger|secret|hide|don't tell)\b/gi, reason: 'Safeguarding-sensitive language — verify context' },
  ];

  static check(pages: Array<{ pageNumber: number; text: string }>): SafetyReport {
    const flagged: SafetyReport['flaggedContent'] = [];

    for (const page of pages) {
      for (const { pattern, reason } of this.BLOCKED_PATTERNS) {
        const matches = page.text.match(pattern);
        if (matches) {
          for (const match of matches) {
            flagged.push({
              page: page.pageNumber,
              text: match,
              reason,
              severity: 'error',
            });
          }
        }
      }

      for (const { pattern, reason } of this.WARNING_PATTERNS) {
        const matches = page.text.match(pattern);
        if (matches) {
          for (const match of matches) {
            flagged.push({
              page: page.pageNumber,
              text: match,
              reason,
              severity: 'warning',
            });
          }
        }
      }
    }

    return {
      safe: flagged.filter(f => f.severity === 'error').length === 0,
      flaggedContent: flagged,
    };
  }
}

// =============================================================================
// Section 6: The Content Validator
// =============================================================================
// The main validator class that orchestrates all checks: decodability,
// safety, vocabulary analysis, metadata completeness, and curriculum
// alignment. Each check runs independently and contributes to the final
// comprehensive validation result.
// =============================================================================

export class ContentValidator {
  private readonly phaseDefinitions: PhaseDefinition[];

  constructor() {
    this.phaseDefinitions = PHASE_DEFINITIONS;
  }

  /**
   * Run comprehensive validation on a storybook input.
   * This is the primary method — it runs all checks and returns a
   * detailed report suitable for display in the Storybook Studio UI
   * or for automated CI/CD pipeline checks.
   */
  validate(input: StorybookInput): Result<ComprehensiveValidationResult> {
    try {
      const issues: ValidationIssue[] = [];
      const suggestions: string[] = [];

      // 1. Validate metadata completeness
      const metadata = this.validateMetadata(input, issues);

      // 2. Validate decodability
      const decodability = this.validateDecodability(input, issues, suggestions);

      // 3. Validate safety
      const safety = SafetyChecker.check(input.pages);
      for (const flag of safety.flaggedContent) {
        issues.push({
          severity: flag.severity,
          code: flag.severity === 'error' ? 'SAFETY_BLOCKED' : 'SAFETY_WARNING',
          message: flag.reason,
          location: { page: flag.page, word: flag.text },
        });
      }

      // 4. Analyse vocabulary
      const vocabulary = this.analyseVocabulary(input);

      // 5. Calculate curriculum alignment score
      const curriculumAlignmentScore = this.calculateCurriculumAlignment(input, decodability);

      // 6. Add contextual suggestions
      this.addSuggestions(input, decodability, vocabulary, suggestions);

      const threshold = input.decodabilityThreshold || 85;
      const valid =
        decodability.score >= threshold &&
        safety.safe &&
        metadata.complete &&
        issues.filter(i => i.severity === 'error').length === 0;

      return {
        success: true,
        data: {
          valid,
          decodability,
          safety,
          metadata,
          vocabulary,
          curriculumAlignmentScore,
          issues,
          suggestions,
          validatedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Quick decodability check — returns just the score and undecodable words.
   * Useful for real-time validation in the story editor as the creator types.
   */
  quickDecodabilityCheck(text: string, taughtGpcs: string[], phase: number): { score: number; undecodableWords: string[] } {
    const parser = new GraphemeParser(taughtGpcs);
    const phaseData = this.getPhaseData(phase);
    const trickyWords = new Set(phaseData.flatMap(p => p.trickyWords.map(w => w.toLowerCase())));

    const words = this.extractWords(text);
    let decodable = 0;
    const undecodableWords: string[] = [];

    for (const word of words) {
      const normalised = word.toLowerCase();
      if (trickyWords.has(normalised) || parser.isDecodable(normalised)) {
        decodable++;
      } else {
        undecodableWords.push(word);
      }
    }

    return {
      score: words.length > 0 ? Math.round((decodable / words.length) * 100) : 100,
      undecodableWords: [...new Set(undecodableWords)],
    };
  }

  /**
   * Get the GPC reference data for a specific phase (includes all prior phases).
   */
  getPhaseData(upToPhase: number): PhaseDefinition[] {
    return this.phaseDefinitions.filter(p => p.phase <= upToPhase);
  }

  /**
   * Get all GPCs taught up to and including a given phase.
   */
  getGpcsForPhase(phase: number): string[] {
    return this.getPhaseData(phase).flatMap(p => p.gpcs.map(g => g.grapheme));
  }

  /**
   * Get all tricky words up to and including a given phase.
   */
  getTrickyWordsForPhase(phase: number): string[] {
    return this.getPhaseData(phase).flatMap(p => p.trickyWords);
  }

  // -------------------------------------------------------------------------
  // Private Validation Methods
  // -------------------------------------------------------------------------

  private validateMetadata(input: StorybookInput, issues: ValidationIssue[]): MetadataReport {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    if (!input.title || input.title.trim().length === 0) missingFields.push('title');
    if (!input.phase || input.phase < 1 || input.phase > 6) missingFields.push('phase (must be 1-6)');
    if (!input.targetGpcs || input.targetGpcs.length === 0) missingFields.push('targetGpcs');
    if (!input.taughtGpcSet || input.taughtGpcSet.length === 0) missingFields.push('taughtGpcSet');
    if (!input.pages || input.pages.length === 0) missingFields.push('pages');

    if (input.pages) {
      if (input.pages.length < 4) warnings.push('Story has fewer than 4 pages — consider expanding for better engagement.');
      if (input.pages.length > 32) warnings.push('Story exceeds 32 pages — consider splitting into a series.');

      for (const page of input.pages) {
        if (!page.text || page.text.trim().length === 0) {
          issues.push({
            severity: 'error',
            code: 'EMPTY_PAGE',
            message: `Page ${page.pageNumber} has no text content.`,
            location: { page: page.pageNumber },
          });
        }
      }
    }

    // Check that target GPCs are a subset of taught GPCs
    if (input.targetGpcs && input.taughtGpcSet) {
      const taughtSet = new Set(input.taughtGpcSet.map(g => g.toLowerCase()));
      for (const gpc of input.targetGpcs) {
        if (!taughtSet.has(gpc.toLowerCase())) {
          issues.push({
            severity: 'error',
            code: 'TARGET_NOT_TAUGHT',
            message: `Target GPC "${gpc}" is not in the taught GPC set. A child cannot practise what they haven't been taught.`,
            location: { field: 'targetGpcs' },
          });
        }
      }
    }

    // Validate phase consistency
    if (input.phase && input.taughtGpcSet) {
      const expectedGpcs = this.getGpcsForPhase(input.phase);
      const missingPhaseGpcs = expectedGpcs.filter(g => !input.taughtGpcSet.includes(g));
      if (missingPhaseGpcs.length > 5) {
        warnings.push(
          `Taught GPC set is missing ${missingPhaseGpcs.length} GPCs expected by Phase ${input.phase}. ` +
          `This may indicate the learner hasn't completed the phase yet — which is fine, but verify the targeting is intentional.`
        );
      }
    }

    for (const field of missingFields) {
      issues.push({
        severity: 'error',
        code: 'MISSING_METADATA',
        message: `Required field missing: ${field}`,
        location: { field },
      });
    }

    return {
      complete: missingFields.length === 0,
      missingFields,
      warnings,
    };
  }

  private validateDecodability(
    input: StorybookInput,
    issues: ValidationIssue[],
    suggestions: string[]
  ): DecodabilityReport {
    if (!input.taughtGpcSet || !input.pages) {
      return { score: 0, totalWords: 0, decodableWords: 0, trickyWordsUsed: [], undecodableWords: [], gpcCoverage: {} };
    }

    const parser = new GraphemeParser(input.taughtGpcSet);
    const phaseData = this.getPhaseData(input.phase || 2);
    const trickyWords = new Set(phaseData.flatMap(p => p.trickyWords.map(w => w.toLowerCase())));

    let totalWords = 0;
    let decodableCount = 0;
    const trickyWordsUsed: Set<string> = new Set();
    const undecodableWords: DecodabilityReport['undecodableWords'] = [];
    const gpcCoverage: Record<string, number> = {};

    // Track target GPC usage
    for (const gpc of (input.targetGpcs || [])) {
      gpcCoverage[gpc] = 0;
    }

    for (const page of input.pages) {
      const words = this.extractWords(page.text);
      for (const word of words) {
        totalWords++;
        const normalised = word.toLowerCase();

        if (trickyWords.has(normalised)) {
          decodableCount++;
          trickyWordsUsed.add(normalised);
          continue;
        }

        const parsed = parser.parse(normalised);
        if (parsed) {
          decodableCount++;
          // Track target GPC occurrences
          for (const grapheme of parsed) {
            if (gpcCoverage[grapheme] !== undefined) {
              gpcCoverage[grapheme]++;
            }
          }
        } else {
          undecodableWords.push({
            word,
            page: page.pageNumber,
            missingGpcs: this.identifyMissingGpcs(normalised, input.taughtGpcSet),
          });
        }
      }
    }

    const score = totalWords > 0 ? Math.round((decodableCount / totalWords) * 100) : 100;
    const threshold = input.decodabilityThreshold || 85;

    if (score < threshold) {
      issues.push({
        severity: 'error',
        code: 'LOW_DECODABILITY',
        message: `Decodability score ${score}% is below the ${threshold}% threshold. ${undecodableWords.length} words cannot be decoded with the taught GPC set.`,
      });
    }

    // Check target GPC coverage
    for (const [gpc, count] of Object.entries(gpcCoverage)) {
      if (count === 0) {
        issues.push({
          severity: 'warning',
          code: 'TARGET_GPC_UNUSED',
          message: `Target GPC "${gpc}" does not appear in any word in the story. Consider adding words containing this grapheme.`,
        });
      } else if (count < 3) {
        suggestions.push(`Target GPC "${gpc}" appears only ${count} time(s). Best practice is 3+ occurrences for effective practice.`);
      }
    }

    return {
      score,
      totalWords,
      decodableWords: decodableCount,
      trickyWordsUsed: [...trickyWordsUsed],
      undecodableWords,
      gpcCoverage,
    };
  }

  private analyseVocabulary(input: StorybookInput): VocabularyReport {
    if (!input.pages) {
      return {
        totalUniqueWords: 0, tier1Words: [], tier2Words: [], tier3Words: [],
        averageSentenceLength: 0, longestSentence: { text: '', wordCount: 0, page: 0 },
        wordFrequencyDistribution: {},
      };
    }

    const allWords: string[] = [];
    const wordFreq: Record<string, number> = {};
    let longestSentence = { text: '', wordCount: 0, page: 0 };
    let totalSentences = 0;
    let totalSentenceWords = 0;

    for (const page of input.pages) {
      const words = this.extractWords(page.text);
      allWords.push(...words);

      for (const word of words) {
        const lower = word.toLowerCase();
        wordFreq[lower] = (wordFreq[lower] || 0) + 1;
      }

      // Sentence analysis
      const sentences = page.text.split(/[.!?]+/).filter(s => s.trim().length > 0);
      for (const sentence of sentences) {
        totalSentences++;
        const sentenceWords = this.extractWords(sentence);
        totalSentenceWords += sentenceWords.length;
        if (sentenceWords.length > longestSentence.wordCount) {
          longestSentence = { text: sentence.trim(), wordCount: sentenceWords.length, page: page.pageNumber };
        }
      }
    }

    const uniqueWords = [...new Set(allWords.map(w => w.toLowerCase()))];

    // Simple tier classification based on word frequency and length
    // (In production, this would use a proper frequency corpus)
    const tier1Words = uniqueWords.filter(w => w.length <= 4 && (wordFreq[w] || 0) >= 2);
    const tier2Words = uniqueWords.filter(w => w.length > 4 && w.length <= 7);
    const tier3Words = uniqueWords.filter(w => w.length > 7);

    return {
      totalUniqueWords: uniqueWords.length,
      tier1Words,
      tier2Words,
      tier3Words,
      averageSentenceLength: totalSentences > 0 ? Math.round(totalSentenceWords / totalSentences) : 0,
      longestSentence,
      wordFrequencyDistribution: wordFreq,
    };
  }

  private calculateCurriculumAlignment(input: StorybookInput, decodability: DecodabilityReport): number {
    let score = 0;
    const maxScore = 100;

    // Decodability contributes 40% of alignment score
    score += (decodability.score / 100) * 40;

    // Target GPC coverage contributes 30%
    const targetGpcs = input.targetGpcs || [];
    if (targetGpcs.length > 0) {
      const coveredGpcs = targetGpcs.filter(g => (decodability.gpcCoverage[g] || 0) >= 3);
      score += (coveredGpcs.length / targetGpcs.length) * 30;
    } else {
      score += 15; // Partial credit for no targeting
    }

    // Metadata completeness contributes 15%
    const hasPhase = !!input.phase;
    const hasTargets = targetGpcs.length > 0;
    const hasTaughtSet = (input.taughtGpcSet || []).length > 0;
    const hasPages = (input.pages || []).length > 0;
    const metadataItems = [hasPhase, hasTargets, hasTaughtSet, hasPages].filter(Boolean).length;
    score += (metadataItems / 4) * 15;

    // Page count appropriateness contributes 15%
    const pageCount = (input.pages || []).length;
    if (pageCount >= 8 && pageCount <= 24) {
      score += 15;
    } else if (pageCount >= 4 && pageCount <= 32) {
      score += 10;
    } else {
      score += 5;
    }

    return Math.min(Math.round(score), maxScore);
  }

  private addSuggestions(
    input: StorybookInput,
    decodability: DecodabilityReport,
    vocabulary: VocabularyReport,
    suggestions: string[]
  ): void {
    // Vocabulary suggestions
    if (vocabulary.averageSentenceLength > 12) {
      suggestions.push('Average sentence length exceeds 12 words. For beginning readers, aim for 5-8 words per sentence.');
    }

    if (vocabulary.tier3Words.length > vocabulary.totalUniqueWords * 0.1) {
      suggestions.push('More than 10% of words are Tier 3 (domain-specific). Consider simplifying vocabulary for the target age group.');
    }

    // Tricky word usage
    if (decodability.trickyWordsUsed.length > 5) {
      suggestions.push(`Story uses ${decodability.trickyWordsUsed.length} tricky words. While these are taught, high density can challenge beginning readers.`);
    }

    // Page count suggestions
    const pageCount = (input.pages || []).length;
    if (input.phase && input.phase <= 2 && pageCount > 12) {
      suggestions.push('For Phase 2 readers, stories of 8-12 pages are optimal. Consider splitting longer stories into a series.');
    }

    // Repetition suggestions (beneficial for beginning readers)
    const highFreqWords = Object.entries(vocabulary.wordFrequencyDistribution)
      .filter(([_, count]) => count >= 4)
      .map(([word]) => word);
    if (highFreqWords.length < 3 && input.phase && input.phase <= 3) {
      suggestions.push('Beginning readers benefit from word repetition. Consider using key words 3-4 times across the story.');
    }
  }

  private extractWords(text: string): string[] {
    return text
      .replace(/[^a-zA-Z'\s-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 0 && w !== '-' && w !== "'");
  }

  private identifyMissingGpcs(word: string, taughtGpcs: string[]): string[] {
    // Simplified: identify which grapheme segments aren't in the taught set
    const missing: string[] = [];
    const taughtSet = new Set(taughtGpcs.map(g => g.toLowerCase()));
    const letters = word.split('');

    for (let i = 0; i < letters.length; i++) {
      let found = false;
      for (let len = Math.min(3, letters.length - i); len >= 1; len--) {
        const segment = letters.slice(i, i + len).join('');
        if (taughtSet.has(segment)) {
          found = true;
          i += len - 1;
          break;
        }
      }
      if (!found) {
        missing.push(letters[i]);
      }
    }

    return [...new Set(missing)];
  }
}

// =============================================================================
// Section 7: Exports
// =============================================================================

export default ContentValidator;
export { GraphemeParser, SafetyChecker, PHASE_DEFINITIONS };
