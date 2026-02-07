// =============================================================================
// SCHOLARLY PLATFORM — Content Validator
// Sprint 3 | DT-002 | content-validator.ts
// =============================================================================
// @scholarly/content-validator — Standalone validation library for
// decodability, vocabulary tier analysis, safety screening, and
// curriculum alignment checking. Works without API access.
// Zero external dependencies.
// =============================================================================

import type { ValidationReport, DecodabilityReport, VocabularyReport, SafetyReport, CurriculumReport } from './content-sdk';

// ---------------------------------------------------------------------------
// Section 1: GPC Inventory
// ---------------------------------------------------------------------------

export interface GPCEntry {
  grapheme: string;
  phoneme: string;
  phase: number;
}

/** Master GPC inventory sorted longest-first for greedy matching */
export const GPC_INVENTORY: GPCEntry[] = [
  // Trigraphs and long graphemes first
  { grapheme: 'igh', phoneme: '/ai/', phase: 3 },
  { grapheme: 'ear', phoneme: '/ia/', phase: 3 },
  { grapheme: 'air', phoneme: '/ea/', phase: 3 },
  { grapheme: 'ure', phoneme: '/ua/', phase: 3 },
  { grapheme: 'tch', phoneme: '/ch/', phase: 4 },
  // Split digraphs
  { grapheme: 'a_e', phoneme: '/ei/', phase: 5 },
  { grapheme: 'e_e', phoneme: '/ii/', phase: 5 },
  { grapheme: 'i_e', phoneme: '/ai/', phase: 5 },
  { grapheme: 'o_e', phoneme: '/ou/', phase: 5 },
  { grapheme: 'u_e', phoneme: '/uu/', phase: 5 },
  // Digraphs
  { grapheme: 'ck', phoneme: '/k/', phase: 2 },
  { grapheme: 'ff', phoneme: '/f/', phase: 2 },
  { grapheme: 'll', phoneme: '/l/', phase: 2 },
  { grapheme: 'ss', phoneme: '/s/', phase: 2 },
  { grapheme: 'zz', phoneme: '/z/', phase: 3 },
  { grapheme: 'qu', phoneme: '/kw/', phase: 3 },
  { grapheme: 'ch', phoneme: '/ch/', phase: 3 },
  { grapheme: 'sh', phoneme: '/sh/', phase: 3 },
  { grapheme: 'th', phoneme: '/th/', phase: 3 },
  { grapheme: 'ng', phoneme: '/ng/', phase: 3 },
  { grapheme: 'nk', phoneme: '/nk/', phase: 3 },
  { grapheme: 'ai', phoneme: '/ei/', phase: 3 },
  { grapheme: 'ee', phoneme: '/ii/', phase: 3 },
  { grapheme: 'oa', phoneme: '/ou/', phase: 3 },
  { grapheme: 'oo', phoneme: '/uu/', phase: 3 },
  { grapheme: 'ar', phoneme: '/ar/', phase: 3 },
  { grapheme: 'or', phoneme: '/or/', phase: 3 },
  { grapheme: 'ur', phoneme: '/ur/', phase: 3 },
  { grapheme: 'ow', phoneme: '/ou/', phase: 3 },
  { grapheme: 'oi', phoneme: '/oi/', phase: 3 },
  { grapheme: 'er', phoneme: '/er/', phase: 3 },
  { grapheme: 'ay', phoneme: '/ei/', phase: 5 },
  { grapheme: 'ou', phoneme: '/ou/', phase: 5 },
  { grapheme: 'ie', phoneme: '/ai/', phase: 5 },
  { grapheme: 'ea', phoneme: '/ii/', phase: 5 },
  { grapheme: 'oy', phoneme: '/oi/', phase: 5 },
  { grapheme: 'ir', phoneme: '/ur/', phase: 5 },
  { grapheme: 'ue', phoneme: '/uu/', phase: 5 },
  { grapheme: 'aw', phoneme: '/or/', phase: 5 },
  { grapheme: 'wh', phoneme: '/w/', phase: 5 },
  { grapheme: 'ph', phoneme: '/f/', phase: 5 },
  { grapheme: 'ew', phoneme: '/uu/', phase: 5 },
  { grapheme: 'oe', phoneme: '/ou/', phase: 5 },
  { grapheme: 'au', phoneme: '/or/', phase: 5 },
  // Singles
  { grapheme: 's', phoneme: '/s/', phase: 2 },
  { grapheme: 'a', phoneme: '/a/', phase: 2 },
  { grapheme: 't', phoneme: '/t/', phase: 2 },
  { grapheme: 'p', phoneme: '/p/', phase: 2 },
  { grapheme: 'i', phoneme: '/i/', phase: 2 },
  { grapheme: 'n', phoneme: '/n/', phase: 2 },
  { grapheme: 'm', phoneme: '/m/', phase: 2 },
  { grapheme: 'd', phoneme: '/d/', phase: 2 },
  { grapheme: 'g', phoneme: '/g/', phase: 2 },
  { grapheme: 'o', phoneme: '/o/', phase: 2 },
  { grapheme: 'c', phoneme: '/k/', phase: 2 },
  { grapheme: 'k', phoneme: '/k/', phase: 2 },
  { grapheme: 'e', phoneme: '/e/', phase: 2 },
  { grapheme: 'u', phoneme: '/u/', phase: 2 },
  { grapheme: 'r', phoneme: '/r/', phase: 2 },
  { grapheme: 'h', phoneme: '/h/', phase: 2 },
  { grapheme: 'b', phoneme: '/b/', phase: 2 },
  { grapheme: 'f', phoneme: '/f/', phase: 2 },
  { grapheme: 'l', phoneme: '/l/', phase: 2 },
  { grapheme: 'j', phoneme: '/j/', phase: 3 },
  { grapheme: 'v', phoneme: '/v/', phase: 3 },
  { grapheme: 'w', phoneme: '/w/', phase: 3 },
  { grapheme: 'x', phoneme: '/ks/', phase: 3 },
  { grapheme: 'y', phoneme: '/y/', phase: 3 },
  { grapheme: 'z', phoneme: '/z/', phase: 3 },
];

/** High-frequency tricky words considered decodable regardless of GPC coverage */
export const TRICKY_WORDS: Set<string> = new Set([
  'the', 'a', 'an', 'i', 'is', 'it', 'in', 'at', 'and', 'to', 'no', 'go', 'into',
  'he', 'she', 'we', 'me', 'be', 'was', 'my', 'you', 'they', 'her', 'all', 'are',
  'said', 'so', 'have', 'like', 'some', 'come', 'were', 'there', 'little', 'one',
  'do', 'when', 'what', 'out', 'this', 'of', 'for', 'with', 'that', 'not', 'but',
  'had', 'his', 'him', 'has', 'can', 'will', 'just', 'them', 'than', 'been', 'its',
  'who', 'would', 'could', 'should', 'their', 'from', 'or', 'an', 'if', 'about',
  'how', 'up', 'down', 'big', 'very', 'after', 'did', 'get', 'got', 'put',
  'because', 'oh', 'by', 'day', 'away', 'old', 'made', 'before', 'want', 'saw',
]);

// ---------------------------------------------------------------------------
// Section 2: Decodability Validator
// ---------------------------------------------------------------------------

/**
 * Validates whether words are decodable using a given set of taught GPCs.
 * Uses greedy longest-match decomposition — the same algorithm as the
 * Sprint 2 DecodabilityEngine but packaged for standalone use.
 */
export class DecodabilityValidator {
  private readonly sortedGPCs: GPCEntry[];

  constructor() {
    // Sort by grapheme length descending for greedy matching
    this.sortedGPCs = [...GPC_INVENTORY].sort(
      (a, b) => b.grapheme.length - a.grapheme.length
    );
  }

  /**
   * Decompose a word into its grapheme components using greedy
   * longest-match against the taught GPC set.
   */
  decomposeWord(
    word: string,
    taughtGPCs: Set<string>
  ): { graphemes: string[]; fullyDecodable: boolean; unmatchedChars: string[] } {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    const graphemes: string[] = [];
    const unmatchedChars: string[] = [];
    let position = 0;

    // Handle split digraphs (e.g., "make" = m + a_e + k)
    const splitDigraphResult = this.trySplitDigraph(cleanWord, taughtGPCs);
    if (splitDigraphResult) return splitDigraphResult;

    while (position < cleanWord.length) {
      let matched = false;

      for (const gpc of this.sortedGPCs) {
        if (!taughtGPCs.has(gpc.grapheme)) continue;

        const remaining = cleanWord.substring(position);
        if (remaining.startsWith(gpc.grapheme)) {
          graphemes.push(gpc.grapheme);
          position += gpc.grapheme.length;
          matched = true;
          break;
        }
      }

      if (!matched) {
        unmatchedChars.push(cleanWord[position]);
        position++;
      }
    }

    return {
      graphemes,
      fullyDecodable: unmatchedChars.length === 0,
      unmatchedChars,
    };
  }

  /**
   * Check if a word is decodable using the taught GPC set.
   */
  isDecodable(word: string, taughtGPCs: Set<string>): boolean {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    if (cleanWord.length === 0) return true;

    // Tricky words are always decodable
    if (TRICKY_WORDS.has(cleanWord)) return true;

    const result = this.decomposeWord(cleanWord, taughtGPCs);
    return result.fullyDecodable;
  }

  /**
   * Validate an entire story's decodability.
   */
  validateStory(
    pages: Array<{ pageNumber: number; text: string }>,
    taughtGPCs: Set<string>,
    threshold: number = 0.85
  ): DecodabilityReport {
    let totalWords = 0;
    let decodableWords = 0;
    const undecodableSet: Set<string> = new Set();
    const trickyWordsUsed: Set<string> = new Set();
    const perPageScores: DecodabilityReport['perPageScores'] = [];

    for (const page of pages) {
      const words = this.tokenize(page.text);
      let pageDecodable = 0;

      for (const word of words) {
        const clean = word.toLowerCase().replace(/[^a-z]/g, '');
        if (clean.length === 0) continue;

        totalWords++;

        if (TRICKY_WORDS.has(clean)) {
          trickyWordsUsed.add(clean);
          decodableWords++;
          pageDecodable++;
        } else if (this.isDecodable(word, taughtGPCs)) {
          decodableWords++;
          pageDecodable++;
        } else {
          undecodableSet.add(clean);
        }
      }

      const pageWordCount = words.filter(w => w.replace(/[^a-z]/gi, '').length > 0).length;
      perPageScores.push({
        page: page.pageNumber,
        score: pageWordCount > 0 ? pageDecodable / pageWordCount : 1,
      });
    }

    const score = totalWords > 0 ? decodableWords / totalWords : 1;

    return {
      score,
      threshold,
      passed: score >= threshold,
      totalWords,
      decodableWords,
      undecodableWords: Array.from(undecodableSet),
      trickyWordsUsed: Array.from(trickyWordsUsed),
      perPageScores,
    };
  }

  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(w => w.length > 0);
  }

  private trySplitDigraph(
    word: string,
    taughtGPCs: Set<string>
  ): { graphemes: string[]; fullyDecodable: boolean; unmatchedChars: string[] } | null {
    // Check for split digraph patterns: XCe where X_e is a taught GPC
    const splitPatterns = ['a_e', 'e_e', 'i_e', 'o_e', 'u_e'];

    for (const pattern of splitPatterns) {
      if (!taughtGPCs.has(pattern)) continue;

      const vowel = pattern[0];
      const vowelIndex = word.indexOf(vowel);
      if (vowelIndex === -1) continue;

      // Check if word ends with 'e' and has consonant(s) between vowel and final 'e'
      if (word.endsWith('e') && word.length >= 3) {
        const beforeVowel = word.substring(0, vowelIndex);
        const afterVowel = word.substring(vowelIndex + 1, word.length - 1);
        const middleConsonants = afterVowel.replace(/[aeiou]/g, '');

        if (middleConsonants.length > 0 && afterVowel === middleConsonants) {
          // This looks like a split digraph pattern
          const graphemes: string[] = [];
          const unmatchedChars: string[] = [];

          // Decompose the parts around the split digraph
          for (const char of beforeVowel) {
            if (taughtGPCs.has(char)) {
              graphemes.push(char);
            } else {
              unmatchedChars.push(char);
            }
          }

          graphemes.push(pattern); // The split digraph

          for (const char of middleConsonants) {
            if (taughtGPCs.has(char)) {
              graphemes.push(char);
            } else {
              unmatchedChars.push(char);
            }
          }

          return { graphemes, fullyDecodable: unmatchedChars.length === 0, unmatchedChars };
        }
      }
    }

    return null;
  }
}

// ---------------------------------------------------------------------------
// Section 3: Vocabulary Analyser
// ---------------------------------------------------------------------------

/** Common Tier 1 words (everyday vocabulary) — top 500 */
const TIER1_WORDS: Set<string> = new Set([
  'the', 'a', 'an', 'is', 'it', 'in', 'at', 'on', 'to', 'and', 'but', 'or', 'not',
  'he', 'she', 'we', 'they', 'you', 'i', 'my', 'his', 'her', 'our', 'your', 'their',
  'this', 'that', 'with', 'for', 'from', 'by', 'of', 'was', 'were', 'are', 'am',
  'has', 'had', 'have', 'do', 'did', 'does', 'will', 'would', 'can', 'could',
  'big', 'small', 'good', 'bad', 'happy', 'sad', 'hot', 'cold', 'old', 'new',
  'run', 'walk', 'jump', 'sit', 'stand', 'eat', 'drink', 'sleep', 'play', 'go',
  'come', 'see', 'look', 'say', 'tell', 'ask', 'give', 'take', 'make', 'get',
  'put', 'want', 'need', 'like', 'love', 'help', 'know', 'think', 'feel', 'find',
  'cat', 'dog', 'fish', 'bird', 'tree', 'flower', 'sun', 'moon', 'star', 'water',
  'house', 'home', 'school', 'book', 'pen', 'day', 'night', 'time', 'year', 'man',
  'woman', 'boy', 'girl', 'child', 'baby', 'friend', 'family', 'mother', 'father',
  'food', 'bed', 'door', 'window', 'hand', 'head', 'eye', 'ear', 'nose', 'mouth',
  'red', 'blue', 'green', 'yellow', 'black', 'white', 'one', 'two', 'three', 'four',
  'five', 'up', 'down', 'in', 'out', 'over', 'under', 'here', 'there', 'now', 'then',
]);

export class VocabularyAnalyser {
  /**
   * Analyse vocabulary composition of story text.
   */
  analyse(pages: Array<{ text: string }>): VocabularyReport {
    const allText = pages.map(p => p.text).join(' ');
    const words = allText.split(/\s+/).filter(w => w.replace(/[^a-z]/gi, '').length > 0);
    const cleanWords = words.map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
    const uniqueWords = new Set(cleanWords);
    const sentences = allText.split(/[.!?]+/).filter(s => s.trim().length > 0);

    let tier1Count = 0;
    let tier2Count = 0;
    let tier3Count = 0;

    for (const word of cleanWords) {
      if (TIER1_WORDS.has(word)) {
        tier1Count++;
      } else if (word.length <= 8) {
        tier2Count++; // Simplified heuristic: shorter non-tier1 = tier 2
      } else {
        tier3Count++;
      }
    }

    const total = cleanWords.length || 1;
    const sentenceLengths = sentences.map(s =>
      s.trim().split(/\s+/).filter(w => w.length > 0).length
    );

    const avgSentenceLength = sentenceLengths.length > 0
      ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length
      : 0;

    // Simple readability estimate based on avg sentence length and word length
    const avgWordLength = cleanWords.reduce((s, w) => s + w.length, 0) / total;
    let readabilityLevel = 'Phase 2';
    if (avgSentenceLength > 12 || avgWordLength > 5) readabilityLevel = 'Phase 5-6';
    else if (avgSentenceLength > 8 || avgWordLength > 4.5) readabilityLevel = 'Phase 4-5';
    else if (avgSentenceLength > 5 || avgWordLength > 4) readabilityLevel = 'Phase 3-4';
    else if (avgSentenceLength > 3) readabilityLevel = 'Phase 2-3';

    return {
      tier1Percentage: (tier1Count / total) * 100,
      tier2Percentage: (tier2Count / total) * 100,
      tier3Percentage: (tier3Count / total) * 100,
      averageSentenceLength: Math.round(avgSentenceLength * 10) / 10,
      maxSentenceLength: sentenceLengths.length > 0 ? Math.max(...sentenceLengths) : 0,
      uniqueWordCount: uniqueWords.size,
      totalWordCount: cleanWords.length,
      readabilityLevel,
    };
  }
}

// ---------------------------------------------------------------------------
// Section 4: Safety Screener
// ---------------------------------------------------------------------------

/** Words/patterns that are inappropriate for children's content */
const SAFETY_PATTERNS: Array<{ pattern: RegExp; type: string; severity: 'low' | 'medium' | 'high'; description: string }> = [
  { pattern: /\b(kill|murder|die|dead|death)\b/gi, type: 'violence', severity: 'high', description: 'Contains violent or death-related language' },
  { pattern: /\b(hate|stupid|idiot|ugly|dumb|fat)\b/gi, type: 'negative_language', severity: 'medium', description: 'Contains negative or insulting language' },
  { pattern: /\b(gun|knife|sword|weapon|bomb)\b/gi, type: 'weapons', severity: 'high', description: 'References weapons' },
  { pattern: /\b(beer|wine|alcohol|drunk|drugs)\b/gi, type: 'substances', severity: 'high', description: 'References alcohol or drugs' },
  { pattern: /\b(scary|terrifying|nightmare|monster)\b/gi, type: 'fear', severity: 'low', description: 'Contains potentially scary language (review in context)' },
  { pattern: /\b(blood|bleeding|wound)\b/gi, type: 'graphic', severity: 'medium', description: 'Contains graphic physical descriptions' },
];

export class SafetyScreener {
  /**
   * Screen story text for age-inappropriate content.
   * This is a first-pass filter — the AI review stage provides deeper analysis.
   */
  screen(pages: Array<{ pageNumber: number; text: string }>): SafetyReport {
    const issues: SafetyReport['issues'] = [];

    for (const page of pages) {
      for (const rule of SAFETY_PATTERNS) {
        const matches = page.text.match(rule.pattern);
        if (matches) {
          issues.push({
            type: rule.type,
            severity: rule.severity,
            description: `${rule.description} (found: "${matches[0]}")`,
            pageNumber: page.pageNumber,
          });
        }
      }
    }

    return {
      safe: issues.filter(i => i.severity === 'high').length === 0,
      issues,
    };
  }
}

// ---------------------------------------------------------------------------
// Section 5: Curriculum Alignment Checker
// ---------------------------------------------------------------------------

export class CurriculumChecker {
  private readonly decodabilityValidator: DecodabilityValidator;

  constructor() {
    this.decodabilityValidator = new DecodabilityValidator();
  }

  /**
   * Check if a story aligns with its stated curriculum targets.
   */
  check(
    pages: Array<{ text: string }>,
    targetGPCs: string[],
    phonicsPhase: number,
    taughtGPCSet: string[]
  ): CurriculumReport {
    const allText = pages.map(p => p.text).join(' ');
    const words = allText.split(/\s+/).map(w => w.toLowerCase().replace(/[^a-z]/g, ''));

    // Check target GPC hit rate — how many times each target GPC appears
    const taughtSet = new Set(taughtGPCSet);
    const targetHitRate: Record<string, number> = {};
    for (const targetGPC of targetGPCs) {
      targetHitRate[targetGPC] = 0;
    }

    for (const word of words) {
      const decomposition = this.decodabilityValidator.decomposeWord(word, taughtSet);
      for (const grapheme of decomposition.graphemes) {
        if (targetGPCs.includes(grapheme)) {
          targetHitRate[grapheme] = (targetHitRate[grapheme] ?? 0) + 1;
        }
      }
    }

    const targetGPCsCovered = Object.values(targetHitRate).every(count => count >= 2);

    // Check phase appropriateness
    const phaseGPCs = GPC_INVENTORY.filter(g => g.phase <= phonicsPhase);
    const phaseGPCSet = new Set(phaseGPCs.map(g => g.grapheme));
    const usesOnlyPhaseGPCs = words.every(w => {
      if (TRICKY_WORDS.has(w)) return true;
      const decomp = this.decodabilityValidator.decomposeWord(w, phaseGPCSet);
      return decomp.fullyDecodable;
    });

    // Check for morpheme patterns
    const morphemePatterns = ['-ing', '-ed', '-s', '-es', '-er', '-est', 'un-', 're-', '-ful', '-less'];
    const morphemeFocusPresent = morphemePatterns.some(m => allText.toLowerCase().includes(m.replace('-', '')));

    // Comprehension strands — simple keyword detection
    const strands: string[] = [];
    if (allText.includes('?')) strands.push('inference');
    if (new Set(words).size / words.length < 0.6) strands.push('vocabulary_repetition');
    if (allText.length > 500) strands.push('extended_narrative');

    return {
      targetGPCsCovered,
      targetGPCHitRate: targetHitRate,
      phonicsPhaseAppropriate: usesOnlyPhaseGPCs,
      morphemeFocusPresent,
      comprehensionStrandsAddressed: strands,
    };
  }
}

// ---------------------------------------------------------------------------
// Section 6: Unified Validator
// ---------------------------------------------------------------------------

/**
 * Combines all validation checks into a single comprehensive report.
 * This is the main entry point for @scholarly/content-validator.
 */
export class ContentValidator {
  private readonly decodabilityValidator: DecodabilityValidator;
  private readonly vocabularyAnalyser: VocabularyAnalyser;
  private readonly safetyScreener: SafetyScreener;
  private readonly curriculumChecker: CurriculumChecker;

  constructor() {
    this.decodabilityValidator = new DecodabilityValidator();
    this.vocabularyAnalyser = new VocabularyAnalyser();
    this.safetyScreener = new SafetyScreener();
    this.curriculumChecker = new CurriculumChecker();
  }

  /**
   * Run all validation checks and produce a comprehensive report.
   */
  validate(
    pages: Array<{ pageNumber: number; text: string }>,
    options: {
      taughtGPCSet: string[];
      targetGPCs: string[];
      phonicsPhase: number;
      decodabilityThreshold?: number;
    }
  ): ValidationReport {
    const taughtSet = new Set(options.taughtGPCSet);
    const threshold = options.decodabilityThreshold ?? 0.85;

    const decodability = this.decodabilityValidator.validateStory(pages, taughtSet, threshold);
    const vocabulary = this.vocabularyAnalyser.analyse(pages);
    const safety = this.safetyScreener.screen(pages);
    const curriculum = this.curriculumChecker.check(
      pages, options.targetGPCs, options.phonicsPhase, options.taughtGPCSet
    );

    const warnings: string[] = [];
    const errors: string[] = [];

    if (!decodability.passed) {
      errors.push(`Decodability score ${(decodability.score * 100).toFixed(1)}% is below threshold ${threshold * 100}%`);
    }
    if (decodability.undecodableWords.length > 0) {
      warnings.push(`${decodability.undecodableWords.length} undecodable words: ${decodability.undecodableWords.slice(0, 10).join(', ')}`);
    }
    if (!safety.safe) {
      errors.push(`Safety issues detected: ${safety.issues.filter(i => i.severity === 'high').length} high severity`);
    }
    if (safety.issues.length > 0) {
      warnings.push(`${safety.issues.length} safety warnings to review`);
    }
    if (!curriculum.targetGPCsCovered) {
      warnings.push('Not all target GPCs appear at least twice in the story');
    }
    if (!curriculum.phonicsPhaseAppropriate) {
      warnings.push('Story contains GPCs beyond the stated phonics phase');
    }
    if (vocabulary.tier3Percentage > 10) {
      warnings.push(`High percentage of Tier 3 vocabulary (${vocabulary.tier3Percentage.toFixed(1)}%)`);
    }

    const overallScore = (
      (decodability.passed ? 0.3 : 0) +
      (safety.safe ? 0.3 : 0) +
      (curriculum.targetGPCsCovered ? 0.2 : 0) +
      (curriculum.phonicsPhaseAppropriate ? 0.1 : 0) +
      (vocabulary.tier3Percentage < 10 ? 0.1 : 0)
    );

    return {
      valid: errors.length === 0,
      overallScore,
      decodability,
      vocabulary,
      safety,
      curriculum,
      warnings,
      errors,
    };
  }
}
