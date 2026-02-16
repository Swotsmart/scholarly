// ============================================================================
// SCHOLARLY PLATFORM — Sprint 19, Deliverable S19-002a
// Narrative Generator: Types & Template Library
// ============================================================================
// This file defines the complete type vocabulary for the narrative generation
// pipeline and houses the 50+ narrative templates that parameterise story
// creation. Think of this as the recipe book the baker (narrative generator)
// consults: each recipe defines a story structure, ingredient constraints
// (phonics GPCs), serving size (page count), and dietary requirements
// (age-appropriateness, decodability thresholds).
//
// The templates are organised by phonics phase, reflecting the progression
// from simple CVC words in Phase 2 to complex polysyllabic words in Phase 5.
// Each phase introduces new letter-sound patterns (GPCs), which opens up
// a broader vocabulary and enables more sophisticated story structures.
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ==========================================================================
// Section 1: Core Type Definitions
// ==========================================================================

export interface PhonicsFingerprint {
  readonly learnerId: string;
  readonly tenantId: string;
  readonly masteredGPCs: GPC[];
  readonly targetGPCs: GPC[];
  readonly phonicsPhase: 1 | 2 | 3 | 4 | 5 | 6;
  readonly readingLevel: ReadingLevel;
  readonly ageGroup: AgeGroup;
  readonly preferredThemes: StoryTheme[];
  readonly avoidThemes: StoryTheme[];
  readonly seriesId?: string;
  readonly languageVariant: 'en-AU' | 'en-GB' | 'en-US';
}

export interface GPC {
  readonly grapheme: string;
  readonly phoneme: string;
  readonly phase: number;
  readonly position: 'initial' | 'medial' | 'final' | 'any';
  readonly exampleWords: string[];
}

export interface ReadingLevel {
  readonly wcpmBand: [number, number];
  readonly maxSentenceLength: number;
  readonly maxParagraphLength: number;
  readonly vocabularyTier: 1 | 2 | 3;
}

export type AgeGroup = '3-4' | '4-5' | '5-6' | '6-7' | '7-8' | '8-9';

export type StoryTheme =
  | 'animals' | 'space' | 'ocean' | 'dinosaurs' | 'robots'
  | 'fairy-tales' | 'sports' | 'music' | 'food' | 'weather'
  | 'family' | 'friendship' | 'adventure' | 'mystery'
  | 'australian-animals' | 'australian-outback' | 'rainforest'
  | 'seasons' | 'bugs' | 'transport' | 'superheroes'
  | 'pirates' | 'garden' | 'circus' | 'camping';

export interface GeneratedStory {
  readonly title: string;
  readonly pages: StoryPage[];
  readonly metadata: StoryMetadata;
  readonly characters: StoryCharacter[];
  readonly seriesInfo?: SeriesContinuity;
  readonly generationReport: GenerationReport;
}

export interface StoryPage {
  readonly pageNumber: number;
  readonly text: string;
  readonly illustrationPrompt: string;
  readonly wordCount: number;
  readonly decodableWords: string[];
  readonly nonDecodableWords: string[];
  readonly targetGPCWords: string[];
  readonly sceneDescription: string;
}

export interface StoryMetadata {
  readonly phonicsPhase: number;
  readonly targetGPCs: string[];
  readonly taughtGPCSet: string[];
  readonly decodabilityScore: number;
  readonly vocabularyTier: number;
  readonly morphemeFocus: string[];
  readonly comprehensionStrand: string;
  readonly eylfsAlignment: string[];
  readonly culturalContext: string;
  readonly estimatedReadingTimeSeconds: number;
  readonly totalWordCount: number;
  readonly uniqueWordCount: number;
  readonly narrativeTemplate: string;
  readonly wcpmBand: [number, number];
}

export interface StoryCharacter {
  readonly name: string;
  readonly description: string;
  readonly role: 'protagonist' | 'sidekick' | 'antagonist' | 'mentor' | 'supporting';
  readonly traits: string[];
  readonly species: string;
  readonly styleSheetPrompt: string;
}

export interface SeriesContinuity {
  readonly seriesId: string;
  readonly seriesName: string;
  readonly episodeNumber: number;
  readonly previousEpisodeSummary: string;
  readonly recurringCharacters: StoryCharacter[];
  readonly narrativeArc: string;
}

export interface GenerationReport {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly estimatedCostUsd: number;
  readonly generationTimeMs: number;
  readonly regenerations: number;
  readonly decodabilityAttempts: DecodabilityAttempt[];
  readonly contentSafetyResult: ContentSafetyResult;
}

export interface DecodabilityAttempt {
  readonly attemptNumber: number;
  readonly score: number;
  readonly failedWords: string[];
  readonly passed: boolean;
}

export interface ContentSafetyResult {
  readonly passed: boolean;
  readonly flags: string[];
  readonly ageAppropriateness: 'pass' | 'warn' | 'fail';
  readonly biasCheck: 'pass' | 'warn' | 'fail';
  readonly culturalSensitivity: 'pass' | 'warn' | 'fail';
}

// ==========================================================================
// Section 2: Narrative Template Types
// ==========================================================================

export interface NarrativeTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly structure: TemplateStructure;
  readonly suitablePhases: number[];
  readonly suitableAgeGroups: AgeGroup[];
  readonly pageRange: [number, number];
  readonly wordCountRange: [number, number];
  readonly narrativeType: 'fiction' | 'information' | 'procedural' | 'recount';
  readonly readingRopeStrand: string;
  readonly promptSkeleton: string;
}

export interface TemplateStructure {
  readonly type: 'linear' | 'cumulative' | 'circular' | 'problem-solution' | 'journey' | 'parallel';
  readonly acts: TemplateAct[];
  readonly requiresResolution: boolean;
  readonly supportsSeriesContinuity: boolean;
}

export interface TemplateAct {
  readonly name: string;
  readonly pagePercentage: number;
  readonly tension: 'low' | 'medium' | 'high';
  readonly purpose: string;
}

// ==========================================================================
// Section 3: Generation Configuration
// ==========================================================================

export interface NarrativeGeneratorConfig {
  readonly anthropicApiKey: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly maxRegenerations: number;
  readonly decodabilityThreshold: number;
  readonly contentSafetyEnabled: boolean;
  readonly enableSeriesContinuity: boolean;
  readonly costTrackingEnabled: boolean;
}

export const DEFAULT_GENERATOR_CONFIG: NarrativeGeneratorConfig = {
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || '',
  model: 'claude-sonnet-4-5-20250929',
  maxTokens: 4096,
  temperature: 0.7,
  maxRegenerations: 3,
  decodabilityThreshold: 0.85,
  contentSafetyEnabled: true,
  enableSeriesContinuity: true,
  costTrackingEnabled: true,
};

/**
 * Cost tracking for AI provider usage. At $0.15-$0.30 per story
 * (per the Storybook Strategy document), we need precise tracking
 * to project seed library costs and set subscription pricing.
 */
export interface CostEstimate {
  readonly model: string;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly inputCostPer1kTokens: number;
  readonly outputCostPer1kTokens: number;
  readonly totalCostUsd: number;
}

// Claude Sonnet 4.5 pricing (as of Feb 2026)
export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'claude-sonnet-4-5-20250929': { input: 0.003, output: 0.015 },
  'claude-haiku-4-5-20251001': { input: 0.0008, output: 0.004 },
};

// ==========================================================================
// Section 4: High-Frequency Word Lists
// ==========================================================================
// These are words that children encounter so frequently in text that they
// need to recognise them on sight, even before they've learned all the
// GPCs required to decode them phonically. Different phases permit
// different sets of high-frequency words. The narrative generator uses
// these lists when constructing prompts — they're the "exception" words
// that don't need to be decodable.

export const HIGH_FREQUENCY_WORDS: Record<number, string[]> = {
  2: [
    'the', 'I', 'is', 'a', 'to', 'and', 'he', 'she', 'it', 'in',
    'at', 'on', 'no', 'go', 'has', 'my', 'his', 'her',
  ],
  3: [
    'the', 'I', 'is', 'a', 'to', 'and', 'he', 'she', 'it', 'we',
    'they', 'can', 'see', 'in', 'at', 'on', 'up', 'no', 'not', 'go',
    'has', 'his', 'her', 'said', 'my', 'for', 'you', 'was', 'are',
    'of', 'look', 'with', 'do', 'all', 'but', 'had', 'what', 'been',
    'one', 'have', 'there', 'out', 'them', 'then', 'so', 'will',
  ],
  4: [
    'the', 'I', 'is', 'a', 'to', 'and', 'he', 'she', 'it', 'we',
    'they', 'can', 'see', 'in', 'at', 'on', 'up', 'no', 'not', 'go',
    'has', 'his', 'her', 'said', 'my', 'for', 'you', 'was', 'are',
    'of', 'look', 'with', 'do', 'all', 'but', 'had', 'what', 'been',
    'one', 'have', 'there', 'out', 'them', 'then', 'so', 'will',
    'could', 'would', 'should', 'their', 'people', 'water', 'about',
    'other', 'many', 'some', 'come', 'made', 'after', 'only', 'also',
    'know', 'because', 'through', 'very', 'before', 'little', 'where',
  ],
  5: [
    // Phase 5 learners can decode most words; only truly irregular words
    // need to be listed as exceptions
    'the', 'said', 'was', 'of', 'one', 'their', 'people', 'could',
    'would', 'should', 'through', 'enough', 'although', 'thought',
    'because', 'different', 'beautiful', 'friend', 'special', 'once',
    'eye', 'busy', 'does', 'clothes', 'water', 'again', 'every',
  ],
  6: [
    // Phase 6: only the most irregular English words
    'the', 'said', 'was', 'of', 'one', 'their', 'people', 'could',
    'would', 'should', 'through', 'enough', 'although', 'thought',
    'because', 'different', 'beautiful', 'friend', 'once', 'eye',
  ],
};

// ==========================================================================
// Section 5: Narrative Template Library (50+ Templates)
// ==========================================================================
// Templates are organised by phonics phase. Each phase broadens the
// available vocabulary, which enables more complex story structures.
//
// The naming convention: P{phase}-{number}
//   P2-001 through P2-010: Phase 2 (simplest)
//   P3-001 through P3-012: Phase 3 (introducing digraphs)
//   P4-001 through P4-010: Phase 4 (consonant clusters)
//   P5-001 through P5-012: Phase 5 (alternative spellings)
//   PX-001 through PX-008: Cross-phase (adaptable structures)

const PHASE_2_CONSTRAINT_BLOCK = `CRITICAL CONSTRAINTS:
- Use ONLY words that can be decoded with these letter-sound patterns: {{taught_gpcs}}
- High-frequency exception words permitted: {{hf_words}}
- Maximum 5 words per sentence
- One sentence per page
- Do NOT use any words containing letter patterns not in the taught set`;

const PHASE_3_CONSTRAINT_BLOCK = `CRITICAL CONSTRAINTS:
- Use ONLY words decodable with: {{taught_gpcs}}
- High-frequency exception words permitted: {{hf_words}}
- Maximum 10 words per sentence
- 1-2 sentences per page
- Include dialogue using "said"
- Each page should contain at least one word with a target GPC`;

const PHASE_4_CONSTRAINT_BLOCK = `CRITICAL CONSTRAINTS:
- Use ONLY words decodable with: {{taught_gpcs}}
- High-frequency exception words permitted: {{hf_words}}
- Maximum 14 words per sentence
- 2-3 sentences per page
- Include dialogue and varied sentence structure
- Introduce words with consonant clusters: bl, br, cl, cr, dr, fl, fr, gl, gr, pl, pr, sc, sk, sl, sm, sn, sp, st, sw, tr, tw`;

const PHASE_5_CONSTRAINT_BLOCK = `CRITICAL CONSTRAINTS:
- Use ONLY words decodable with: {{taught_gpcs}}
- High-frequency exception words: {{hf_words}}
- Maximum 18 words per sentence
- 2-4 sentences per page
- Varied sentence structures including complex sentences
- Include alternative spellings for same sounds (e.g., 'ai'/'ay'/'a_e' for /eɪ/)`;

const JSON_RESPONSE_FORMAT = `Respond ONLY with valid JSON (no markdown, no preamble):
{
  "title": "string",
  "pages": [{"pageNumber": 1, "text": "string", "illustrationPrompt": "string", "sceneDescription": "string"}],
  "characters": [{"name": "string", "description": "string", "role": "protagonist|sidekick|antagonist|mentor|supporting", "traits": ["string"], "species": "string", "styleSheetPrompt": "detailed visual description for an illustrator"}]
}`;

export const NARRATIVE_TEMPLATE_LIBRARY: NarrativeTemplate[] = [
  // =================================================================
  // PHASE 2 (10 templates): ages 4-5, CVC words
  // =================================================================
  {
    id: 'P2-001', name: 'Here Is My...', description: 'Show-and-tell structure. Character introduces items.',
    structure: { type: 'linear', acts: [
      { name: 'Introduction', pagePercentage: 0.125, tension: 'low', purpose: 'Introduce character' },
      { name: 'Showing', pagePercentage: 0.75, tension: 'low', purpose: 'Show items one by one' },
      { name: 'Closing', pagePercentage: 0.125, tension: 'low', purpose: 'Simple wrap-up' },
    ], requiresResolution: false, supportsSeriesContinuity: true },
    suitablePhases: [2], suitableAgeGroups: ['4-5', '5-6'], pageRange: [8, 10], wordCountRange: [20, 50],
    narrativeType: 'fiction', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write a simple picture book.\n\nStructure: {{character}} introduces favourite things, one per page. Pattern: "[Name] has a [item]."\nTheme: {{theme}} | Target GPCs: {{target_gpcs}}\n\n${PHASE_2_CONSTRAINT_BLOCK}\n8-10 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P2-002', name: 'I Can See...', description: 'Observation structure. Character explores and names.',
    structure: { type: 'linear', acts: [
      { name: 'Setting', pagePercentage: 0.1, tension: 'low', purpose: 'Where are we?' },
      { name: 'Exploration', pagePercentage: 0.8, tension: 'low', purpose: 'Notice things' },
      { name: 'Favourite', pagePercentage: 0.1, tension: 'low', purpose: 'Pick a favourite' },
    ], requiresResolution: false, supportsSeriesContinuity: true },
    suitablePhases: [2], suitableAgeGroups: ['4-5', '5-6'], pageRange: [8, 10], wordCountRange: [20, 60],
    narrativeType: 'fiction', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write a picture book. {{character}} explores {{setting}} and names what they see.\nPattern: "I can see a [item]."\nTheme: {{theme}} | Target GPCs: {{target_gpcs}}\n\n${PHASE_2_CONSTRAINT_BLOCK}\n8-10 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P2-003', name: 'A Busy Day', description: 'Daily routine sequence. Morning to evening.',
    structure: { type: 'linear', acts: [
      { name: 'Morning', pagePercentage: 0.33, tension: 'low', purpose: 'Wake up' },
      { name: 'Midday', pagePercentage: 0.34, tension: 'low', purpose: 'Activities' },
      { name: 'Evening', pagePercentage: 0.33, tension: 'low', purpose: 'Bedtime' },
    ], requiresResolution: false, supportsSeriesContinuity: true },
    suitablePhases: [2], suitableAgeGroups: ['4-5', '5-6'], pageRange: [8, 12], wordCountRange: [30, 80],
    narrativeType: 'recount', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write a picture book following {{character}} from morning to evening.\nEach page: one activity. Theme: {{theme}} | Target GPCs: {{target_gpcs}}\n\n${PHASE_2_CONSTRAINT_BLOCK}\n8-12 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P2-004', name: 'Big and Small', description: 'Comparison structure. Pairs of opposites.',
    structure: { type: 'parallel', acts: [
      { name: 'Pairs', pagePercentage: 0.85, tension: 'low', purpose: 'Compare pairs' },
      { name: 'Twist', pagePercentage: 0.15, tension: 'low', purpose: 'Unexpected final pair' },
    ], requiresResolution: false, supportsSeriesContinuity: false },
    suitablePhases: [2], suitableAgeGroups: ['3-4', '4-5'], pageRange: [8, 10], wordCountRange: [20, 50],
    narrativeType: 'information', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write a picture book exploring opposites (big/small, hot/cold, etc.).\nEach spread: one comparison. Theme: {{theme}} | Target GPCs: {{target_gpcs}}\n\n${PHASE_2_CONSTRAINT_BLOCK}\n8-10 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P2-005', name: 'Where Is It?', description: 'Positional language. Hide and seek structure.',
    structure: { type: 'linear', acts: [
      { name: 'Loss', pagePercentage: 0.1, tension: 'medium', purpose: 'Something is missing' },
      { name: 'Search', pagePercentage: 0.8, tension: 'medium', purpose: 'Look in/on/under places' },
      { name: 'Found', pagePercentage: 0.1, tension: 'low', purpose: 'Found it!' },
    ], requiresResolution: true, supportsSeriesContinuity: false },
    suitablePhases: [2], suitableAgeGroups: ['4-5', '5-6'], pageRange: [8, 10], wordCountRange: [24, 60],
    narrativeType: 'fiction', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write a picture book. {{character}} looks for a hidden {{theme}}-related item.\nPattern: "Is it in the [place]? No!" until found.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_2_CONSTRAINT_BLOCK}\n8-10 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P2-006', name: 'Counting Fun', description: 'Counting structure 1-10 with themed items.',
    structure: { type: 'linear', acts: [
      { name: 'Counting Up', pagePercentage: 0.8, tension: 'low', purpose: 'Count items' },
      { name: 'Celebration', pagePercentage: 0.2, tension: 'low', purpose: 'All together' },
    ], requiresResolution: false, supportsSeriesContinuity: false },
    suitablePhases: [2], suitableAgeGroups: ['3-4', '4-5'], pageRange: [10, 12], wordCountRange: [30, 60],
    narrativeType: 'information', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write a counting book (1-10) with {{theme}} items.\nPattern: "[Number] [items]." Theme: {{theme}} | Target GPCs: {{target_gpcs}}\n\n${PHASE_2_CONSTRAINT_BLOCK}\n10-12 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P2-007', name: 'Colour Walk', description: 'Colour identification in a setting.',
    structure: { type: 'linear', acts: [
      { name: 'Walk', pagePercentage: 0.9, tension: 'low', purpose: 'Find coloured items' },
      { name: 'Rainbow', pagePercentage: 0.1, tension: 'low', purpose: 'All colours together' },
    ], requiresResolution: false, supportsSeriesContinuity: false },
    suitablePhases: [2], suitableAgeGroups: ['3-4', '4-5'], pageRange: [8, 10], wordCountRange: [24, 50],
    narrativeType: 'fiction', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write a picture book. {{character}} goes on a walk and spots colours.\nPattern: "A [colour] [item]." Theme: {{theme}} | Target GPCs: {{target_gpcs}}\n\n${PHASE_2_CONSTRAINT_BLOCK}\n8-10 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P2-008', name: 'Animal Sounds', description: 'Each animal makes its sound.',
    structure: { type: 'linear', acts: [
      { name: 'Animals', pagePercentage: 0.85, tension: 'low', purpose: 'Each animal speaks' },
      { name: 'Chorus', pagePercentage: 0.15, tension: 'low', purpose: 'All together' },
    ], requiresResolution: false, supportsSeriesContinuity: false },
    suitablePhases: [2], suitableAgeGroups: ['3-4', '4-5'], pageRange: [8, 10], wordCountRange: [24, 60],
    narrativeType: 'fiction', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write a picture book about animals and their sounds.\nPattern: "The [animal] can [sound]." Theme: {{theme}} | Target GPCs: {{target_gpcs}}\n\n${PHASE_2_CONSTRAINT_BLOCK}\n8-10 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P2-009', name: 'Getting Dressed', description: 'Sequence of putting on clothes.',
    structure: { type: 'linear', acts: [
      { name: 'Start', pagePercentage: 0.1, tension: 'low', purpose: 'Time to get dressed' },
      { name: 'Dressing', pagePercentage: 0.8, tension: 'low', purpose: 'Put on each item' },
      { name: 'Ready', pagePercentage: 0.1, tension: 'low', purpose: 'All dressed, let us go!' },
    ], requiresResolution: false, supportsSeriesContinuity: true },
    suitablePhases: [2], suitableAgeGroups: ['3-4', '4-5'], pageRange: [8, 10], wordCountRange: [24, 50],
    narrativeType: 'procedural', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write a picture book about getting dressed. {{character}} puts on clothing items.\nPattern: "On go the [item]." or "[Name] puts on [item]."\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_2_CONSTRAINT_BLOCK}\n8-10 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P2-010', name: 'At the Park', description: 'Activities at the playground.',
    structure: { type: 'linear', acts: [
      { name: 'Arrive', pagePercentage: 0.1, tension: 'low', purpose: 'Get to the park' },
      { name: 'Play', pagePercentage: 0.75, tension: 'low', purpose: 'Play on each thing' },
      { name: 'Home', pagePercentage: 0.15, tension: 'low', purpose: 'Time to go home' },
    ], requiresResolution: false, supportsSeriesContinuity: true },
    suitablePhases: [2], suitableAgeGroups: ['4-5', '5-6'], pageRange: [8, 10], wordCountRange: [30, 60],
    narrativeType: 'recount', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write a picture book about a trip to the park. {{character}} plays on different equipment.\nTheme: {{theme}} | Target GPCs: {{target_gpcs}}\n\n${PHASE_2_CONSTRAINT_BLOCK}\n8-10 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },

  // =================================================================
  // PHASE 3 (12 templates): ages 5-6, digraphs + vowel teams
  // =================================================================
  {
    id: 'P3-001', name: 'The Lost [Item]', description: 'Problem-solution: character loses something, searches, finds it.',
    structure: { type: 'problem-solution', acts: [
      { name: 'Problem', pagePercentage: 0.2, tension: 'medium', purpose: 'Something is lost' },
      { name: 'Search', pagePercentage: 0.5, tension: 'medium', purpose: 'Look in places' },
      { name: 'Solution', pagePercentage: 0.2, tension: 'high', purpose: 'Found it!' },
      { name: 'Resolution', pagePercentage: 0.1, tension: 'low', purpose: 'Happy ending' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3], suitableAgeGroups: ['5-6', '6-7'], pageRange: [10, 14], wordCountRange: [60, 140],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write a picture book. {{character}} loses something special ({{theme}}-related). Searches 3-4 places asking friends. Found unexpectedly.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n10-14 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-002', name: 'Cumulative Tale', description: 'Each page adds to a growing chain. Builds fluency through repetition.',
    structure: { type: 'cumulative', acts: [
      { name: 'Seed', pagePercentage: 0.1, tension: 'low', purpose: 'First element' },
      { name: 'Accumulation', pagePercentage: 0.7, tension: 'medium', purpose: 'Each page adds and repeats' },
      { name: 'Peak', pagePercentage: 0.1, tension: 'high', purpose: 'Fullest chain' },
      { name: 'Release', pagePercentage: 0.1, tension: 'low', purpose: 'Reversal or conclusion' },
    ], requiresResolution: true, supportsSeriesContinuity: false },
    suitablePhases: [3], suitableAgeGroups: ['5-6', '6-7'], pageRange: [10, 12], wordCountRange: [80, 200],
    narrativeType: 'fiction', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write a cumulative tale. Each page adds one element and repeats the chain.\nP1: "[A]." P2: "[B] and [A]." P3: "[C], [B] and [A]." etc.\nTheme: {{theme}} | Target GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n10-12 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-003', name: 'The Helping Hand', description: 'Character helps others, then needs help themselves. Reciprocity theme.',
    structure: { type: 'parallel', acts: [
      { name: 'Introduction', pagePercentage: 0.15, tension: 'low', purpose: 'Kind character' },
      { name: 'Helping Others', pagePercentage: 0.4, tension: 'low', purpose: 'Help 2-3 friends' },
      { name: 'Own Challenge', pagePercentage: 0.2, tension: 'high', purpose: 'Own problem' },
      { name: 'Help Received', pagePercentage: 0.15, tension: 'medium', purpose: 'Friends help back' },
      { name: 'Resolution', pagePercentage: 0.1, tension: 'low', purpose: 'Friendship lesson' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3, 4], suitableAgeGroups: ['5-6', '6-7'], pageRange: [12, 16], wordCountRange: [100, 200],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write a friendship story. {{character}} helps 2-3 friends, then faces own challenge related to {{theme}}. Friends return the favour.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n12-16 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-004', name: 'What Am I?', description: 'Riddle book. Each page gives clues, next page reveals.',
    structure: { type: 'linear', acts: [
      { name: 'Riddles', pagePercentage: 0.9, tension: 'medium', purpose: 'Clue-reveal pairs' },
      { name: 'Final Riddle', pagePercentage: 0.1, tension: 'high', purpose: 'Hardest riddle' },
    ], requiresResolution: true, supportsSeriesContinuity: false },
    suitablePhases: [3], suitableAgeGroups: ['5-6', '6-7'], pageRange: [10, 14], wordCountRange: [60, 120],
    narrativeType: 'information', readingRopeStrand: 'inference',
    promptSkeleton: `Write a riddle book. Each pair of pages: clue page ("I have [feature]. I can [action].") then reveal page ("I am a [thing]!").\nTheme: {{theme}} | Target GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n10-14 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-005', name: 'The Race', description: 'Competition between characters. Who will win?',
    structure: { type: 'linear', acts: [
      { name: 'Start', pagePercentage: 0.15, tension: 'medium', purpose: 'Introduce racers' },
      { name: 'Racing', pagePercentage: 0.55, tension: 'high', purpose: 'Lead changes, obstacles' },
      { name: 'Finish', pagePercentage: 0.15, tension: 'high', purpose: 'Photo finish' },
      { name: 'Celebration', pagePercentage: 0.15, tension: 'low', purpose: 'Sportsmanship' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3], suitableAgeGroups: ['5-6', '6-7'], pageRange: [10, 14], wordCountRange: [70, 150],
    narrativeType: 'fiction', readingRopeStrand: 'genre',
    promptSkeleton: `Write a race story. {{character}} and friends compete in a {{theme}}-themed race. Obstacles and lead changes. Emphasise sportsmanship.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n10-14 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-006', name: 'The Surprise Party', description: 'Characters secretly prepare a surprise.',
    structure: { type: 'parallel', acts: [
      { name: 'Plan', pagePercentage: 0.2, tension: 'medium', purpose: 'Secret plan' },
      { name: 'Preparation', pagePercentage: 0.4, tension: 'medium', purpose: 'Each friend contributes' },
      { name: 'Close Call', pagePercentage: 0.15, tension: 'high', purpose: 'Almost discovered' },
      { name: 'Surprise!', pagePercentage: 0.15, tension: 'high', purpose: 'The big reveal' },
      { name: 'Celebration', pagePercentage: 0.1, tension: 'low', purpose: 'Happy together' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3], suitableAgeGroups: ['5-6', '6-7'], pageRange: [12, 16], wordCountRange: [80, 180],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write a surprise party story. Friends plan a surprise for {{character}} related to {{theme}}. Almost get caught. Big reveal.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n12-16 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-007', name: 'Night Sounds', description: 'Bedtime exploration of nighttime sounds.',
    structure: { type: 'linear', acts: [
      { name: 'Bedtime', pagePercentage: 0.15, tension: 'low', purpose: 'Getting ready for bed' },
      { name: 'Listening', pagePercentage: 0.6, tension: 'medium', purpose: 'Hearing sounds' },
      { name: 'Discovery', pagePercentage: 0.15, tension: 'low', purpose: 'Source revealed' },
      { name: 'Sleep', pagePercentage: 0.1, tension: 'low', purpose: 'Peaceful sleep' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3], suitableAgeGroups: ['5-6', '6-7'], pageRange: [10, 12], wordCountRange: [60, 130],
    narrativeType: 'fiction', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write a bedtime story. {{character}} hears sounds at night and wonders what they are. Each sound is a friendly {{theme}} creature.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n10-12 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-008', name: 'The Weather Day', description: 'Weather changes through the day, character adapts.',
    structure: { type: 'linear', acts: [
      { name: 'Sun', pagePercentage: 0.3, tension: 'low', purpose: 'Sunny start' },
      { name: 'Change', pagePercentage: 0.4, tension: 'medium', purpose: 'Weather shifts' },
      { name: 'Storm', pagePercentage: 0.15, tension: 'high', purpose: 'Big weather event' },
      { name: 'Rainbow', pagePercentage: 0.15, tension: 'low', purpose: 'Beautiful ending' },
    ], requiresResolution: true, supportsSeriesContinuity: false },
    suitablePhases: [3], suitableAgeGroups: ['5-6', '6-7'], pageRange: [10, 14], wordCountRange: [70, 150],
    narrativeType: 'fiction', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write about a day of changing weather. {{character}} experiences sun, clouds, rain, wind, rainbow. Theme: {{theme}}\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n10-14 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-009', name: 'The Map', description: 'Follow a map to find treasure. Spatial language.',
    structure: { type: 'journey', acts: [
      { name: 'Discovery', pagePercentage: 0.15, tension: 'medium', purpose: 'Find the map' },
      { name: 'Journey', pagePercentage: 0.55, tension: 'medium', purpose: 'Follow directions' },
      { name: 'Treasure', pagePercentage: 0.2, tension: 'high', purpose: 'Find the treasure' },
      { name: 'Sharing', pagePercentage: 0.1, tension: 'low', purpose: 'Share with friends' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3, 4], suitableAgeGroups: ['5-6', '6-7'], pageRange: [12, 16], wordCountRange: [80, 180],
    narrativeType: 'fiction', readingRopeStrand: 'genre',
    promptSkeleton: `Write a treasure hunt story. {{character}} finds a map leading through {{theme}}-themed locations. Follow the path, find the treasure, share it.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n12-16 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-010', name: 'All About [Topic]', description: 'Simple information text about a topic.',
    structure: { type: 'linear', acts: [
      { name: 'Introduction', pagePercentage: 0.15, tension: 'low', purpose: 'What is it?' },
      { name: 'Facts', pagePercentage: 0.7, tension: 'low', purpose: 'Key facts' },
      { name: 'Summary', pagePercentage: 0.15, tension: 'low', purpose: 'Wrap up' },
    ], requiresResolution: false, supportsSeriesContinuity: false },
    suitablePhases: [3], suitableAgeGroups: ['5-6', '6-7'], pageRange: [10, 14], wordCountRange: [60, 150],
    narrativeType: 'information', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write a simple information book about {{theme}}. Each page: one fact with an illustration.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n10-14 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-011', name: 'The New Friend', description: 'Making a new friend who is different.',
    structure: { type: 'linear', acts: [
      { name: 'Alone', pagePercentage: 0.15, tension: 'low', purpose: 'Character alone' },
      { name: 'Meeting', pagePercentage: 0.2, tension: 'medium', purpose: 'Meet someone different' },
      { name: 'Misunderstanding', pagePercentage: 0.25, tension: 'high', purpose: 'A small conflict' },
      { name: 'Understanding', pagePercentage: 0.25, tension: 'medium', purpose: 'Learn about each other' },
      { name: 'Friendship', pagePercentage: 0.15, tension: 'low', purpose: 'Become friends' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3, 4], suitableAgeGroups: ['5-6', '6-7'], pageRange: [12, 16], wordCountRange: [80, 180],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write about making a new friend. {{character}} meets someone different in a {{theme}} setting. Initial misunderstanding, then understanding and friendship.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n12-16 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P3-012', name: 'How to Make...', description: 'Procedural text: how to make or do something.',
    structure: { type: 'linear', acts: [
      { name: 'Materials', pagePercentage: 0.15, tension: 'low', purpose: 'What you need' },
      { name: 'Steps', pagePercentage: 0.7, tension: 'low', purpose: 'Step by step' },
      { name: 'Result', pagePercentage: 0.15, tension: 'low', purpose: 'The finished thing' },
    ], requiresResolution: false, supportsSeriesContinuity: false },
    suitablePhases: [3], suitableAgeGroups: ['5-6', '6-7'], pageRange: [10, 12], wordCountRange: [60, 130],
    narrativeType: 'procedural', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write a procedural book: "How to Make a {{theme}}-related thing." List materials, then steps, then the result.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_3_CONSTRAINT_BLOCK}\n10-12 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },

  // =================================================================
  // PHASE 4 (10 templates): ages 6-7, consonant clusters
  // =================================================================
  {
    id: 'P4-001', name: 'The Great Adventure', description: 'Mini hero\'s journey. Leave home, face challenge, return changed.',
    structure: { type: 'journey', acts: [
      { name: 'Ordinary World', pagePercentage: 0.15, tension: 'low', purpose: 'Home life' },
      { name: 'Call', pagePercentage: 0.1, tension: 'medium', purpose: 'Disruption' },
      { name: 'Journey', pagePercentage: 0.25, tension: 'medium', purpose: 'Travel and encounters' },
      { name: 'Challenge', pagePercentage: 0.2, tension: 'high', purpose: 'Main obstacle' },
      { name: 'Victory', pagePercentage: 0.15, tension: 'high', purpose: 'Overcome it' },
      { name: 'Return', pagePercentage: 0.15, tension: 'low', purpose: 'Home, changed' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [4, 5], suitableAgeGroups: ['6-7', '7-8'], pageRange: [14, 20], wordCountRange: [150, 350],
    narrativeType: 'fiction', readingRopeStrand: 'genre',
    promptSkeleton: `Write an adventure story. {{character}} lives peacefully, then something happens related to {{theme}}. They journey out, face obstacles, overcome the challenge through cleverness/courage, return home changed.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_4_CONSTRAINT_BLOCK}\n14-20 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P4-002', name: 'The Mystery', description: 'Something strange happens and must be investigated.',
    structure: { type: 'problem-solution', acts: [
      { name: 'Discovery', pagePercentage: 0.15, tension: 'medium', purpose: 'Strange clue' },
      { name: 'Investigation', pagePercentage: 0.45, tension: 'medium', purpose: 'Gather clues' },
      { name: 'Red Herring', pagePercentage: 0.15, tension: 'high', purpose: 'Wrong conclusion' },
      { name: 'Solution', pagePercentage: 0.15, tension: 'high', purpose: 'Real answer' },
      { name: 'Wrap-up', pagePercentage: 0.1, tension: 'low', purpose: 'All explained' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [4, 5], suitableAgeGroups: ['6-7', '7-8'], pageRange: [14, 18], wordCountRange: [150, 300],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write a mystery story. Something strange happens in a {{theme}} setting. {{character}} investigates, follows clues, hits a red herring, then discovers the surprising truth.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_4_CONSTRAINT_BLOCK}\n14-18 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P4-003', name: 'The Big Game', description: 'Sports/competition story with teamwork theme.',
    structure: { type: 'linear', acts: [
      { name: 'Practice', pagePercentage: 0.2, tension: 'low', purpose: 'Training' },
      { name: 'Game Start', pagePercentage: 0.2, tension: 'medium', purpose: 'Competition begins' },
      { name: 'Setback', pagePercentage: 0.2, tension: 'high', purpose: 'Things go wrong' },
      { name: 'Comeback', pagePercentage: 0.25, tension: 'high', purpose: 'Teamwork saves the day' },
      { name: 'Celebration', pagePercentage: 0.15, tension: 'low', purpose: 'Win or learn' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [4], suitableAgeGroups: ['6-7', '7-8'], pageRange: [14, 18], wordCountRange: [150, 300],
    narrativeType: 'fiction', readingRopeStrand: 'genre',
    promptSkeleton: `Write a sports/competition story. {{character}} and team practice, face a setback in the {{theme}}-themed competition, use teamwork to overcome it. Emphasise effort over winning.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_4_CONSTRAINT_BLOCK}\n14-18 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P4-004', name: 'The Inventor', description: 'Character builds something creative to solve a problem.',
    structure: { type: 'problem-solution', acts: [
      { name: 'Problem', pagePercentage: 0.15, tension: 'medium', purpose: 'A problem needs solving' },
      { name: 'Idea', pagePercentage: 0.15, tension: 'medium', purpose: 'Inspiration strikes' },
      { name: 'Building', pagePercentage: 0.3, tension: 'medium', purpose: 'Construct the invention' },
      { name: 'Testing', pagePercentage: 0.2, tension: 'high', purpose: 'First attempt (fails!)' },
      { name: 'Improvement', pagePercentage: 0.1, tension: 'medium', purpose: 'Iterate and fix' },
      { name: 'Success', pagePercentage: 0.1, tension: 'low', purpose: 'It works!' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [4, 5], suitableAgeGroups: ['6-7', '7-8'], pageRange: [14, 18], wordCountRange: [150, 300],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write about an inventor. {{character}} sees a {{theme}}-related problem. Has an idea, builds something, tests it (fails), iterates, succeeds. Growth mindset.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_4_CONSTRAINT_BLOCK}\n14-18 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P4-005', name: 'The Swap', description: 'Characters swap roles/lives and learn appreciation.',
    structure: { type: 'circular', acts: [
      { name: 'Normal', pagePercentage: 0.15, tension: 'low', purpose: 'Each character\'s life' },
      { name: 'Swap', pagePercentage: 0.1, tension: 'medium', purpose: 'They switch' },
      { name: 'Struggles', pagePercentage: 0.4, tension: 'high', purpose: 'Discover it\'s hard' },
      { name: 'Appreciation', pagePercentage: 0.2, tension: 'medium', purpose: 'Gain respect' },
      { name: 'Return', pagePercentage: 0.15, tension: 'low', purpose: 'Swap back, grateful' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [4, 5], suitableAgeGroups: ['6-7', '7-8'], pageRange: [14, 18], wordCountRange: [150, 300],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write a swap story. {{character}} and a friend swap roles in a {{theme}} setting. Both struggle. Learn to appreciate each other. Swap back, better friends.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_4_CONSTRAINT_BLOCK}\n14-18 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P4-006', name: 'The Seasons', description: 'Same setting through four seasons. Change and cycles.',
    structure: { type: 'circular', acts: [
      { name: 'Spring', pagePercentage: 0.25, tension: 'low', purpose: 'New beginnings' },
      { name: 'Summer', pagePercentage: 0.25, tension: 'low', purpose: 'Growth and warmth' },
      { name: 'Autumn', pagePercentage: 0.25, tension: 'low', purpose: 'Change and harvest' },
      { name: 'Winter', pagePercentage: 0.25, tension: 'low', purpose: 'Rest and anticipation' },
    ], requiresResolution: false, supportsSeriesContinuity: false },
    suitablePhases: [4], suitableAgeGroups: ['6-7', '7-8'], pageRange: [12, 16], wordCountRange: [120, 250],
    narrativeType: 'information', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write about the same {{theme}} setting through four seasons. Show how {{character}} and the environment change with each season. Celebrate cycles.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_4_CONSTRAINT_BLOCK}\n12-16 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P4-007', name: 'The Letter', description: 'A letter arrives, prompting a journey to find the sender.',
    structure: { type: 'journey', acts: [
      { name: 'The Letter', pagePercentage: 0.15, tension: 'medium', purpose: 'Mysterious letter arrives' },
      { name: 'Journey', pagePercentage: 0.5, tension: 'medium', purpose: 'Follow clues to sender' },
      { name: 'Discovery', pagePercentage: 0.2, tension: 'high', purpose: 'Find the sender' },
      { name: 'Connection', pagePercentage: 0.15, tension: 'low', purpose: 'New relationship formed' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [4], suitableAgeGroups: ['6-7', '7-8'], pageRange: [14, 18], wordCountRange: [150, 280],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write a story about a mysterious letter. {{character}} receives a letter and follows clues through {{theme}}-themed locations to find who sent it. Surprise connection at the end.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_4_CONSTRAINT_BLOCK}\n14-18 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P4-008', name: 'The Storm', description: 'Characters shelter together during a storm. Bonding under pressure.',
    structure: { type: 'linear', acts: [
      { name: 'Warning', pagePercentage: 0.15, tension: 'medium', purpose: 'Storm approaching' },
      { name: 'Preparation', pagePercentage: 0.2, tension: 'medium', purpose: 'Get ready' },
      { name: 'Storm', pagePercentage: 0.3, tension: 'high', purpose: 'Sheltering together' },
      { name: 'Calm', pagePercentage: 0.2, tension: 'low', purpose: 'Storm passes' },
      { name: 'Aftermath', pagePercentage: 0.15, tension: 'low', purpose: 'Stronger together' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [4], suitableAgeGroups: ['6-7', '7-8'], pageRange: [14, 18], wordCountRange: [150, 300],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write about a storm. {{character}} and friends must shelter together during a {{theme}}-themed storm. They help each other, share stories, and emerge closer.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_4_CONSTRAINT_BLOCK}\n14-18 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P4-009', name: 'The Garden', description: 'Growing something from seed to harvest. Patience theme.',
    structure: { type: 'linear', acts: [
      { name: 'Planting', pagePercentage: 0.2, tension: 'low', purpose: 'Plant the seed' },
      { name: 'Waiting', pagePercentage: 0.3, tension: 'medium', purpose: 'Impatient waiting' },
      { name: 'Growing', pagePercentage: 0.25, tension: 'medium', purpose: 'Signs of growth' },
      { name: 'Bloom', pagePercentage: 0.15, tension: 'low', purpose: 'Full growth' },
      { name: 'Sharing', pagePercentage: 0.1, tension: 'low', purpose: 'Share the harvest' },
    ], requiresResolution: true, supportsSeriesContinuity: false },
    suitablePhases: [4], suitableAgeGroups: ['6-7', '7-8'], pageRange: [12, 16], wordCountRange: [120, 250],
    narrativeType: 'fiction', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write about growing a garden. {{character}} plants a {{theme}}-related seed, waits impatiently, tends it, watches it grow, shares the result. Patience and care.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_4_CONSTRAINT_BLOCK}\n12-16 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P4-010', name: 'The Concert', description: 'Preparing for and performing in a show. Overcoming stage fright.',
    structure: { type: 'linear', acts: [
      { name: 'Announcement', pagePercentage: 0.1, tension: 'medium', purpose: 'Show announced' },
      { name: 'Practice', pagePercentage: 0.25, tension: 'low', purpose: 'Rehearsals' },
      { name: 'Nerves', pagePercentage: 0.2, tension: 'high', purpose: 'Stage fright' },
      { name: 'Performance', pagePercentage: 0.3, tension: 'high', purpose: 'The show' },
      { name: 'Applause', pagePercentage: 0.15, tension: 'low', purpose: 'Pride and celebration' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [4, 5], suitableAgeGroups: ['6-7', '7-8'], pageRange: [14, 18], wordCountRange: [150, 300],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write about performing. {{character}} prepares for a {{theme}}-themed concert/show. Gets nervous but pushes through. The performance is a success.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_4_CONSTRAINT_BLOCK}\n14-18 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },

  // =================================================================
  // PHASE 5 (12 templates): ages 7-8, alternative spellings
  // =================================================================
  {
    id: 'P5-001', name: 'The Time Capsule', description: 'Characters discover and create time capsules. Past and future.',
    structure: { type: 'parallel', acts: [
      { name: 'Discovery', pagePercentage: 0.2, tension: 'medium', purpose: 'Find old capsule' },
      { name: 'Contents', pagePercentage: 0.2, tension: 'medium', purpose: 'Explore old items' },
      { name: 'Reflection', pagePercentage: 0.2, tension: 'low', purpose: 'Think about change' },
      { name: 'Creating', pagePercentage: 0.25, tension: 'low', purpose: 'Make their own capsule' },
      { name: 'Future', pagePercentage: 0.15, tension: 'low', purpose: 'Hopes and dreams' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [5], suitableAgeGroups: ['7-8', '8-9'], pageRange: [16, 22], wordCountRange: [200, 450],
    narrativeType: 'fiction', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write about a time capsule. {{character}} finds an old one from the {{theme}} era, explores its contents, reflects on change, creates their own for the future.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n16-22 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-002', name: 'The Expedition', description: 'Scientific exploration of a natural environment.',
    structure: { type: 'journey', acts: [
      { name: 'Preparation', pagePercentage: 0.15, tension: 'low', purpose: 'Equip for the journey' },
      { name: 'Setting Out', pagePercentage: 0.15, tension: 'medium', purpose: 'Begin the expedition' },
      { name: 'Discoveries', pagePercentage: 0.35, tension: 'medium', purpose: 'Find amazing things' },
      { name: 'Challenge', pagePercentage: 0.15, tension: 'high', purpose: 'Overcome an obstacle' },
      { name: 'Grand Discovery', pagePercentage: 0.1, tension: 'high', purpose: 'The big find' },
      { name: 'Return', pagePercentage: 0.1, tension: 'low', purpose: 'Share knowledge' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [5], suitableAgeGroups: ['7-8', '8-9'], pageRange: [16, 22], wordCountRange: [200, 450],
    narrativeType: 'fiction', readingRopeStrand: 'genre',
    promptSkeleton: `Write an expedition story. {{character}} explores a {{theme}} environment as a junior scientist. Equipment, discoveries, obstacle, grand find, sharing knowledge.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n16-22 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-003', name: 'The Election', description: 'School/community election. Civic engagement.',
    structure: { type: 'linear', acts: [
      { name: 'Announcement', pagePercentage: 0.1, tension: 'medium', purpose: 'Election announced' },
      { name: 'Decision', pagePercentage: 0.15, tension: 'medium', purpose: 'Decide to run' },
      { name: 'Campaign', pagePercentage: 0.35, tension: 'medium', purpose: 'Make promises, face rival' },
      { name: 'Election Day', pagePercentage: 0.2, tension: 'high', purpose: 'The vote' },
      { name: 'Result', pagePercentage: 0.2, tension: 'medium', purpose: 'Win or lose gracefully' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [5], suitableAgeGroups: ['7-8', '8-9'], pageRange: [16, 20], wordCountRange: [200, 400],
    narrativeType: 'fiction', readingRopeStrand: 'genre',
    promptSkeleton: `Write a school election story. {{character}} runs for class representative in a {{theme}}-focused platform. Campaigning, nervousness, the vote, graceful outcome either way.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n16-20 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-004', name: 'The Pen Pal', description: 'Letters between characters in different places.',
    structure: { type: 'parallel', acts: [
      { name: 'First Letter', pagePercentage: 0.15, tension: 'low', purpose: 'Introduction letters' },
      { name: 'Exchange', pagePercentage: 0.45, tension: 'medium', purpose: 'Share lives and cultures' },
      { name: 'Challenge', pagePercentage: 0.15, tension: 'high', purpose: 'A misunderstanding' },
      { name: 'Resolution', pagePercentage: 0.15, tension: 'medium', purpose: 'Understand each other' },
      { name: 'Meeting', pagePercentage: 0.1, tension: 'low', purpose: 'Finally meet' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [5], suitableAgeGroups: ['7-8', '8-9'], pageRange: [16, 22], wordCountRange: [200, 450],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write a pen pal story. {{character}} writes to someone in a different {{theme}}-related place. They share, misunderstand, resolve, eventually meet.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n16-22 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-005', name: 'The Documentary', description: 'Character makes a documentary about their community.',
    structure: { type: 'linear', acts: [
      { name: 'Idea', pagePercentage: 0.1, tension: 'medium', purpose: 'Decision to document' },
      { name: 'Interviews', pagePercentage: 0.4, tension: 'low', purpose: 'Talk to community members' },
      { name: 'Discovery', pagePercentage: 0.2, tension: 'medium', purpose: 'Unexpected finding' },
      { name: 'Screening', pagePercentage: 0.2, tension: 'high', purpose: 'Show the documentary' },
      { name: 'Impact', pagePercentage: 0.1, tension: 'low', purpose: 'Community responds' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [5, 6], suitableAgeGroups: ['7-8', '8-9'], pageRange: [16, 22], wordCountRange: [200, 450],
    narrativeType: 'fiction', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write about making a documentary. {{character}} documents their {{theme}}-related community. Interviews, unexpected discovery, screening, positive impact.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n16-22 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-006', name: 'The Debate', description: 'Two sides of an issue. Critical thinking.',
    structure: { type: 'parallel', acts: [
      { name: 'Issue', pagePercentage: 0.15, tension: 'medium', purpose: 'Present the issue' },
      { name: 'Side A', pagePercentage: 0.25, tension: 'medium', purpose: 'One perspective' },
      { name: 'Side B', pagePercentage: 0.25, tension: 'medium', purpose: 'Other perspective' },
      { name: 'Debate', pagePercentage: 0.2, tension: 'high', purpose: 'Characters discuss' },
      { name: 'Compromise', pagePercentage: 0.15, tension: 'low', purpose: 'Find middle ground' },
    ], requiresResolution: true, supportsSeriesContinuity: false },
    suitablePhases: [5, 6], suitableAgeGroups: ['7-8', '8-9'], pageRange: [16, 20], wordCountRange: [200, 400],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write a debate story. Characters disagree about a {{theme}}-related issue. Both sides presented fairly. Respectful discussion leads to compromise.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n16-20 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-007', name: 'The Reporter', description: 'Investigative journalism for kids.',
    structure: { type: 'problem-solution', acts: [
      { name: 'Assignment', pagePercentage: 0.1, tension: 'medium', purpose: 'Get the story' },
      { name: 'Research', pagePercentage: 0.3, tension: 'medium', purpose: 'Investigate' },
      { name: 'Obstacle', pagePercentage: 0.2, tension: 'high', purpose: 'Missing piece' },
      { name: 'Breakthrough', pagePercentage: 0.2, tension: 'high', purpose: 'Key discovery' },
      { name: 'Publication', pagePercentage: 0.2, tension: 'low', purpose: 'Share the truth' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [5], suitableAgeGroups: ['7-8', '8-9'], pageRange: [16, 22], wordCountRange: [200, 450],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write a reporter story. {{character}} investigates a {{theme}}-related story for the school newspaper. Research, obstacle, breakthrough, publication.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n16-22 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-008', name: 'The Experiment', description: 'Scientific method in action.',
    structure: { type: 'linear', acts: [
      { name: 'Question', pagePercentage: 0.1, tension: 'medium', purpose: 'Wonder about something' },
      { name: 'Hypothesis', pagePercentage: 0.1, tension: 'low', purpose: 'Make a prediction' },
      { name: 'Experiment', pagePercentage: 0.35, tension: 'medium', purpose: 'Test it' },
      { name: 'Unexpected Result', pagePercentage: 0.2, tension: 'high', purpose: 'Surprise finding' },
      { name: 'Conclusion', pagePercentage: 0.15, tension: 'low', purpose: 'What was learned' },
      { name: 'New Question', pagePercentage: 0.1, tension: 'medium', purpose: 'Science continues' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [5], suitableAgeGroups: ['7-8', '8-9'], pageRange: [14, 20], wordCountRange: [180, 400],
    narrativeType: 'fiction', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write a science experiment story. {{character}} questions something about {{theme}}, hypothesises, experiments, gets a surprising result, draws conclusions, asks a new question.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n14-20 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-009', name: 'The Festival', description: 'Cultural celebration bringing community together.',
    structure: { type: 'linear', acts: [
      { name: 'Anticipation', pagePercentage: 0.15, tension: 'medium', purpose: 'Festival approaches' },
      { name: 'Preparation', pagePercentage: 0.25, tension: 'low', purpose: 'Everyone contributes' },
      { name: 'Festival Day', pagePercentage: 0.35, tension: 'medium', purpose: 'Activities and food' },
      { name: 'Highlight', pagePercentage: 0.15, tension: 'high', purpose: 'Main event' },
      { name: 'Reflection', pagePercentage: 0.1, tension: 'low', purpose: 'Community pride' },
    ], requiresResolution: true, supportsSeriesContinuity: false },
    suitablePhases: [5], suitableAgeGroups: ['7-8', '8-9'], pageRange: [14, 20], wordCountRange: [180, 400],
    narrativeType: 'fiction', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write about a cultural festival. The community prepares and celebrates a {{theme}}-themed festival. Food, music, activities, togetherness.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n14-20 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-010', name: 'The Rescue', description: 'Animal rescue and rehabilitation.',
    structure: { type: 'linear', acts: [
      { name: 'Discovery', pagePercentage: 0.15, tension: 'medium', purpose: 'Find injured animal' },
      { name: 'Care', pagePercentage: 0.3, tension: 'medium', purpose: 'Nurse back to health' },
      { name: 'Bond', pagePercentage: 0.2, tension: 'low', purpose: 'Connection forms' },
      { name: 'Release', pagePercentage: 0.2, tension: 'high', purpose: 'Letting go' },
      { name: 'Reward', pagePercentage: 0.15, tension: 'low', purpose: 'See it thriving' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [5], suitableAgeGroups: ['7-8', '8-9'], pageRange: [16, 22], wordCountRange: [200, 450],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write an animal rescue story. {{character}} finds and cares for a {{theme}}-related animal. Nursing, bonding, and the bittersweet release.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n16-22 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-011', name: 'The Time Machine', description: 'Travel to the past or future of a familiar place.',
    structure: { type: 'circular', acts: [
      { name: 'Present', pagePercentage: 0.1, tension: 'low', purpose: 'Normal day' },
      { name: 'Travel', pagePercentage: 0.1, tension: 'high', purpose: 'Accidental time travel' },
      { name: 'Exploration', pagePercentage: 0.35, tension: 'medium', purpose: 'Explore the other time' },
      { name: 'Lesson', pagePercentage: 0.2, tension: 'medium', purpose: 'Learn something important' },
      { name: 'Return', pagePercentage: 0.15, tension: 'high', purpose: 'Get back home' },
      { name: 'Application', pagePercentage: 0.1, tension: 'low', purpose: 'Apply what was learned' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [5], suitableAgeGroups: ['7-8', '8-9'], pageRange: [18, 24], wordCountRange: [250, 500],
    narrativeType: 'fiction', readingRopeStrand: 'genre',
    promptSkeleton: `Write a time travel story. {{character}} accidentally travels to the past/future of a {{theme}}-related place. Explores, learns something important, returns to apply the lesson.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n18-24 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'P5-012', name: 'Diary of a...', description: 'First-person diary entries from an unusual perspective.',
    structure: { type: 'linear', acts: [
      { name: 'Day 1', pagePercentage: 0.2, tension: 'low', purpose: 'Introduction' },
      { name: 'Days 2-4', pagePercentage: 0.4, tension: 'medium', purpose: 'Daily experiences' },
      { name: 'Big Event', pagePercentage: 0.2, tension: 'high', purpose: 'Something significant' },
      { name: 'Reflection', pagePercentage: 0.2, tension: 'low', purpose: 'Growth and change' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [5, 6], suitableAgeGroups: ['7-8', '8-9'], pageRange: [14, 20], wordCountRange: [200, 450],
    narrativeType: 'fiction', readingRopeStrand: 'genre',
    promptSkeleton: `Write a diary-format story from the perspective of a {{theme}}-related character. Daily entries showing personality, challenges, growth, and a significant event.\nTarget GPCs: {{target_gpcs}}\n\n${PHASE_5_CONSTRAINT_BLOCK}\n14-20 pages.\n\n${JSON_RESPONSE_FORMAT}`,
  },

  // =================================================================
  // CROSS-PHASE (8 templates): adaptable structures
  // =================================================================
  {
    id: 'PX-001', name: 'The Journey Home', description: 'Character must find their way home. Adaptable to any phase.',
    structure: { type: 'journey', acts: [
      { name: 'Separated', pagePercentage: 0.15, tension: 'high', purpose: 'Away from home' },
      { name: 'Encounters', pagePercentage: 0.5, tension: 'medium', purpose: 'Meet helpers along the way' },
      { name: 'Final Obstacle', pagePercentage: 0.2, tension: 'high', purpose: 'Last challenge' },
      { name: 'Home', pagePercentage: 0.15, tension: 'low', purpose: 'Safe return' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [2, 3, 4, 5], suitableAgeGroups: ['4-5', '5-6', '6-7', '7-8'], pageRange: [8, 20], wordCountRange: [30, 400],
    narrativeType: 'fiction', readingRopeStrand: 'genre',
    promptSkeleton: `Write a journey home story adapted for phonics phase {{phase}}. {{character}} is separated from home in a {{theme}} setting. Meets helpers, overcomes obstacles, returns. Complexity should match the phase.\nTarget GPCs: {{target_gpcs}}\n\n{{constraint_block}}\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'PX-002', name: 'The Seasons of [Character]', description: 'Character adapts and grows through seasons or changes.',
    structure: { type: 'circular', acts: [
      { name: 'Beginning', pagePercentage: 0.2, tension: 'low', purpose: 'Starting point' },
      { name: 'Change', pagePercentage: 0.3, tension: 'medium', purpose: 'Something shifts' },
      { name: 'Adaptation', pagePercentage: 0.3, tension: 'medium', purpose: 'Character adjusts' },
      { name: 'New Normal', pagePercentage: 0.2, tension: 'low', purpose: 'Growth achieved' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3, 4, 5], suitableAgeGroups: ['5-6', '6-7', '7-8', '8-9'], pageRange: [10, 22], wordCountRange: [60, 450],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write about change and growth. {{character}} faces a change in their {{theme}} world. Adapts over time and grows. Phase: {{phase}}.\nTarget GPCs: {{target_gpcs}}\n\n{{constraint_block}}\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'PX-003', name: 'If I Were...', description: 'Imagination story. What if I were a [thing]?',
    structure: { type: 'parallel', acts: [
      { name: 'Imagining', pagePercentage: 0.8, tension: 'low', purpose: 'Different imagined scenarios' },
      { name: 'Reality', pagePercentage: 0.2, tension: 'low', purpose: 'Happy being myself' },
    ], requiresResolution: false, supportsSeriesContinuity: false },
    suitablePhases: [2, 3, 4, 5], suitableAgeGroups: ['3-4', '4-5', '5-6', '6-7', '7-8'], pageRange: [8, 18], wordCountRange: [24, 300],
    narrativeType: 'fiction', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write an imagination story. "If I were a [{{theme}}-thing], I would [action]." Each page imagines being something different. Phase: {{phase}}.\nTarget GPCs: {{target_gpcs}}\n\n{{constraint_block}}\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'PX-004', name: 'Then and Now', description: 'Compare how something was in the past vs present.',
    structure: { type: 'parallel', acts: [
      { name: 'Then', pagePercentage: 0.4, tension: 'low', purpose: 'How things were' },
      { name: 'Now', pagePercentage: 0.4, tension: 'low', purpose: 'How things are' },
      { name: 'Future', pagePercentage: 0.2, tension: 'low', purpose: 'What might come' },
    ], requiresResolution: false, supportsSeriesContinuity: false },
    suitablePhases: [3, 4, 5], suitableAgeGroups: ['5-6', '6-7', '7-8', '8-9'], pageRange: [10, 18], wordCountRange: [60, 350],
    narrativeType: 'information', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write a "then and now" comparison book about {{theme}}. Show how things have changed. Phase: {{phase}}.\nTarget GPCs: {{target_gpcs}}\n\n{{constraint_block}}\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'PX-005', name: 'A Day in the Life', description: 'Follow a worker/animal through their day.',
    structure: { type: 'linear', acts: [
      { name: 'Morning', pagePercentage: 0.3, tension: 'low', purpose: 'Start of day' },
      { name: 'Work/Activity', pagePercentage: 0.4, tension: 'medium', purpose: 'Main activities' },
      { name: 'Challenge', pagePercentage: 0.15, tension: 'high', purpose: 'Something unexpected' },
      { name: 'Evening', pagePercentage: 0.15, tension: 'low', purpose: 'End of day' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3, 4, 5], suitableAgeGroups: ['5-6', '6-7', '7-8'], pageRange: [10, 18], wordCountRange: [60, 350],
    narrativeType: 'recount', readingRopeStrand: 'prior-knowledge',
    promptSkeleton: `Write a "day in the life" of a {{theme}}-related character or worker. Morning to evening, including an unexpected moment. Phase: {{phase}}.\nTarget GPCs: {{target_gpcs}}\n\n{{constraint_block}}\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'PX-006', name: 'The Collection', description: 'Character builds a collection, each item has a story.',
    structure: { type: 'linear', acts: [
      { name: 'Start', pagePercentage: 0.1, tension: 'low', purpose: 'Begin collecting' },
      { name: 'Items', pagePercentage: 0.7, tension: 'low', purpose: 'Each item and its story' },
      { name: 'Sharing', pagePercentage: 0.2, tension: 'low', purpose: 'Show the collection' },
    ], requiresResolution: false, supportsSeriesContinuity: true },
    suitablePhases: [2, 3, 4, 5], suitableAgeGroups: ['4-5', '5-6', '6-7', '7-8'], pageRange: [8, 18], wordCountRange: [30, 350],
    narrativeType: 'fiction', readingRopeStrand: 'vocabulary',
    promptSkeleton: `Write about building a collection. {{character}} collects {{theme}}-related items. Each item has a small story. Phase: {{phase}}.\nTarget GPCs: {{target_gpcs}}\n\n{{constraint_block}}\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'PX-007', name: 'The Mistake', description: 'Character makes a mistake and learns from it. Growth mindset.',
    structure: { type: 'problem-solution', acts: [
      { name: 'Good Intentions', pagePercentage: 0.15, tension: 'low', purpose: 'Trying to help' },
      { name: 'The Mistake', pagePercentage: 0.2, tension: 'high', purpose: 'Something goes wrong' },
      { name: 'Consequences', pagePercentage: 0.2, tension: 'high', purpose: 'Deal with aftermath' },
      { name: 'Making Amends', pagePercentage: 0.25, tension: 'medium', purpose: 'Fix what they can' },
      { name: 'Lesson', pagePercentage: 0.2, tension: 'low', purpose: 'Growth and forgiveness' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3, 4, 5], suitableAgeGroups: ['5-6', '6-7', '7-8', '8-9'], pageRange: [10, 20], wordCountRange: [60, 400],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write about making a mistake. {{character}} accidentally causes a problem in a {{theme}} context. Takes responsibility, makes amends, grows. Phase: {{phase}}.\nTarget GPCs: {{target_gpcs}}\n\n{{constraint_block}}\n\n${JSON_RESPONSE_FORMAT}`,
  },
  {
    id: 'PX-008', name: 'The Promise', description: 'Character makes and keeps a difficult promise.',
    structure: { type: 'linear', acts: [
      { name: 'The Promise', pagePercentage: 0.15, tension: 'low', purpose: 'Make the commitment' },
      { name: 'Temptation', pagePercentage: 0.3, tension: 'medium', purpose: 'Easier path beckons' },
      { name: 'Struggle', pagePercentage: 0.25, tension: 'high', purpose: 'Hard to keep it' },
      { name: 'Keeping It', pagePercentage: 0.15, tension: 'high', purpose: 'Follow through' },
      { name: 'Reward', pagePercentage: 0.15, tension: 'low', purpose: 'Trust and pride' },
    ], requiresResolution: true, supportsSeriesContinuity: true },
    suitablePhases: [3, 4, 5], suitableAgeGroups: ['5-6', '6-7', '7-8', '8-9'], pageRange: [10, 20], wordCountRange: [60, 400],
    narrativeType: 'fiction', readingRopeStrand: 'inference',
    promptSkeleton: `Write about keeping a promise. {{character}} promises something related to {{theme}}. Faces temptation, struggles, keeps the promise, earns trust. Phase: {{phase}}.\nTarget GPCs: {{target_gpcs}}\n\n{{constraint_block}}\n\n${JSON_RESPONSE_FORMAT}`,
  },
];

// ==========================================================================
// Section 6: Template Selection Service
// ==========================================================================

export class TemplateSelector extends ScholarlyBaseService {
  constructor() {
    super('TemplateSelector');
  }

  /**
   * Select the best narrative template for a learner's phonics fingerprint.
   * This is matchmaking: finding the template that fits the learner's phase,
   * age, preferred themes, and history of previously generated stories
   * (to avoid repetition).
   */
  selectTemplate(
    fingerprint: PhonicsFingerprint,
    previousTemplateIds: string[] = [],
  ): Result<NarrativeTemplate> {
    // Step 1: Filter by phonics phase
    const phaseMatches = NARRATIVE_TEMPLATE_LIBRARY.filter(
      t => t.suitablePhases.includes(fingerprint.phonicsPhase)
    );

    if (phaseMatches.length === 0) {
      return fail(`No templates available for phase ${fingerprint.phonicsPhase}`);
    }

    // Step 2: Filter by age group
    const ageMatches = phaseMatches.filter(
      t => t.suitableAgeGroups.includes(fingerprint.ageGroup)
    );
    const candidates = ageMatches.length > 0 ? ageMatches : phaseMatches;

    // Step 3: Deprioritise previously used templates
    const fresh = candidates.filter(t => !previousTemplateIds.includes(t.id));
    const pool = fresh.length > 0 ? fresh : candidates;

    // Step 4: Score by theme affinity
    const scored = pool.map(template => {
      let score = 0;

      // Narrative type variety bonus
      const narrativeTypes = new Set(previousTemplateIds.map(id => {
        const t = NARRATIVE_TEMPLATE_LIBRARY.find(tpl => tpl.id === id);
        return t?.narrativeType;
      }));
      if (!narrativeTypes.has(template.narrativeType)) score += 2;

      // Reading Rope strand variety bonus
      const strands = new Set(previousTemplateIds.map(id => {
        const t = NARRATIVE_TEMPLATE_LIBRARY.find(tpl => tpl.id === id);
        return t?.readingRopeStrand;
      }));
      if (!strands.has(template.readingRopeStrand)) score += 1;

      // Series continuity bonus if learner has an active series
      if (fingerprint.seriesId && template.structure.supportsSeriesContinuity) {
        score += 3;
      }

      return { template, score };
    });

    // Sort by score descending, then add randomness within top tier
    scored.sort((a, b) => b.score - a.score);

    // Pick randomly from top-scored tier
    const topScore = scored[0].score;
    const topTier = scored.filter(s => s.score === topScore);
    const selected = topTier[Math.floor(Math.random() * topTier.length)];

    this.log('info', 'Template selected', {
      templateId: selected.template.id,
      name: selected.template.name,
      phase: fingerprint.phonicsPhase,
      ageGroup: fingerprint.ageGroup,
      score: selected.score,
      candidateCount: pool.length,
    });

    return ok(selected.template);
  }

  /**
   * Get all templates suitable for a given phase.
   */
  getTemplatesForPhase(phase: number): NarrativeTemplate[] {
    return NARRATIVE_TEMPLATE_LIBRARY.filter(t => t.suitablePhases.includes(phase));
  }

  /**
   * Get template by ID.
   */
  getTemplate(id: string): NarrativeTemplate | undefined {
    return NARRATIVE_TEMPLATE_LIBRARY.find(t => t.id === id);
  }
}
