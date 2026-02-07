// =============================================================================
// SCHOLARLY PLATFORM — Seed Library Generation
// Sprint 4 | SB-007 | seed-library.ts
// =============================================================================
// Generates 20 seed storybooks across Phases 2-5 to populate the initial
// Enchanted Library. Think of this as curating the opening-day collection
// for a new children's library.
//
// Consumes: Narrative Generator (Sprint 2), Illustration Pipeline (Sprint 3),
//           Audio Narration (Sprint 3), ContentValidator (Sprint 3),
//           Review Pipeline (Sprint 4)
// =============================================================================

import { ScholarlyBaseService, Result } from '../base-service';

// =============================================================================
// Section 1: Types
// =============================================================================

export interface SeedBookSpec {
  id: string;
  title: string;
  phonicsPhase: number;
  targetGPCs: string[];
  taughtGPCSet: string[];
  theme: string;
  narrativeTemplate: NarrativeTemplate;
  ageRange: { min: number; max: number };
  targetPageCount: number;
  artStyle: string;
  voicePersona: string;
  seriesId?: string;
  comprehensionStrand: string;
  vocabularyTier: 'Tier1' | 'Tier2' | 'Mixed';
  culturalContext: string;
  characterSpecs: CharacterSpec[];
  storyPrompt: string;
}

export enum NarrativeTemplate {
  CUMULATIVE_TALE = 'CUMULATIVE_TALE',
  PROBLEM_SOLUTION = 'PROBLEM_SOLUTION',
  HEROS_JOURNEY = 'HEROS_JOURNEY',
  REPETITIVE_PHRASE = 'REPETITIVE_PHRASE',
  INFORMATION_TEXT = 'INFORMATION_TEXT',
  DIARY_FORMAT = 'DIARY_FORMAT',
  QUESTION_ANSWER = 'QUESTION_ANSWER',
  JOURNEY_STORY = 'JOURNEY_STORY',
  FRIENDSHIP_STORY = 'FRIENDSHIP_STORY',
  DISCOVERY_STORY = 'DISCOVERY_STORY',
}

export interface CharacterSpec {
  name: string;
  species: string;
  description: string;
  personalityTraits: string[];
  visualDetails: string;
  role: 'protagonist' | 'supporting' | 'antagonist';
}

export interface SeedBookResult {
  spec: SeedBookSpec;
  narrative: {
    pages: Array<{ pageNumber: number; text: string; sentences: string[] }>;
    totalWords: number;
    decodabilityScore: number;
    generationCostUSD: number;
  };
  illustrations: {
    pages: Array<{ pageNumber: number; imageUrl: string; altText: string }>;
    artStyle: string;
    generationCostUSD: number;
  };
  narration: {
    totalDurationMs: number;
    wordTimestamps: Array<{ word: string; startMs: number; endMs: number }>;
    voicePersona: string;
    generationCostUSD: number;
  };
  validation: {
    passed: boolean;
    decodabilityScore: number;
    safetyPassed: boolean;
    metadataComplete: boolean;
  };
  totalCostUSD: number;
  generatedAt: Date;
}

export interface SeedLibraryReport {
  totalBooks: number;
  successfulBooks: number;
  failedBooks: number;
  totalCostUSD: number;
  averageCostPerBook: number;
  phaseDistribution: Record<number, number>;
  averageDecodabilityScore: number;
  generationTimeMs: number;
  results: SeedBookResult[];
  failures: Array<{ specId: string; error: string }>;
}

// =============================================================================
// Section 2: GPC Progression (Letters and Sounds UK)
// =============================================================================

export const PHASE_GPC_SETS: Record<number, { newGPCs: string[]; cumulativeGPCs: string[] }> = {
  2: {
    newGPCs: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f', 'ff', 'l', 'll', 'ss'],
    cumulativeGPCs: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f', 'ff', 'l', 'll', 'ss'],
  },
  3: {
    newGPCs: ['j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'ure', 'er'],
    cumulativeGPCs: [
      's', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f', 'ff', 'l', 'll', 'ss',
      'j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'ure', 'er',
    ],
  },
  4: {
    newGPCs: [], // Phase 4 consolidates — focuses on consonant clusters, no new GPCs
    cumulativeGPCs: [
      's', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f', 'ff', 'l', 'll', 'ss',
      'j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'ure', 'er',
    ],
  },
  5: {
    newGPCs: ['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew', 'oe', 'au', 'a_e', 'e_e', 'i_e', 'o_e', 'u_e'],
    cumulativeGPCs: [
      's', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f', 'ff', 'l', 'll', 'ss',
      'j', 'v', 'w', 'x', 'y', 'z', 'zz', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'ure', 'er',
      'ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew', 'oe', 'au', 'a_e', 'e_e', 'i_e', 'o_e', 'u_e',
    ],
  },
};

// =============================================================================
// Section 3: The 20 Seed Book Specifications
// =============================================================================

export const SEED_BOOK_SPECS: SeedBookSpec[] = [
  // ── Phase 2: Foundation (5 books) ────────────────────────────────
  {
    id: 'seed-p2-01', title: 'Sam and the Big Dog', phonicsPhase: 2,
    targetGPCs: ['s', 'a', 'm', 'd', 'g', 'o', 'b', 'i'],
    taughtGPCSet: PHASE_GPC_SETS[2].cumulativeGPCs,
    theme: 'Pets and friendship', narrativeTemplate: NarrativeTemplate.FRIENDSHIP_STORY,
    ageRange: { min: 4, max: 5 }, targetPageCount: 8,
    artStyle: 'soft_watercolour', voicePersona: 'storytime_sarah',
    comprehensionStrand: 'vocabulary', vocabularyTier: 'Tier1',
    culturalContext: 'urban_multicultural',
    characterSpecs: [
      { name: 'Sam', species: 'human_child', description: 'A curious 4-year-old with dark curly hair', personalityTraits: ['kind', 'gentle'], visualDetails: 'Brown skin, curly black hair, yellow raincoat', role: 'protagonist' },
      { name: 'Pip', species: 'dog', description: 'A big friendly golden retriever', personalityTraits: ['loyal', 'playful'], visualDetails: 'Golden retriever with red collar', role: 'supporting' },
    ],
    storyPrompt: 'Sam meets a big dog called Pip at the park. Sam is a bit sad, but Pip sits with Sam. Simple CVC words, 1-2 sentences per page.',
  },
  {
    id: 'seed-p2-02', title: 'The Red Hen', phonicsPhase: 2,
    targetGPCs: ['r', 'e', 'h', 'n', 'ck', 'p', 'l'],
    taughtGPCSet: PHASE_GPC_SETS[2].cumulativeGPCs,
    theme: 'Farm and cooperation', narrativeTemplate: NarrativeTemplate.CUMULATIVE_TALE,
    ageRange: { min: 4, max: 5 }, targetPageCount: 10,
    artStyle: 'soft_watercolour', voicePersona: 'storytime_sarah',
    comprehensionStrand: 'inference', vocabularyTier: 'Tier1',
    culturalContext: 'rural',
    characterSpecs: [
      { name: 'Hen', species: 'chicken', description: 'A hardworking red hen', personalityTraits: ['determined', 'patient'], visualDetails: 'Red feathers, small spectacles, white apron', role: 'protagonist' },
      { name: 'Duck', species: 'duck', description: 'A lazy but lovable duck', personalityTraits: ['lazy', 'funny'], visualDetails: 'Yellow duck with green scarf', role: 'supporting' },
    ],
    storyPrompt: 'A red hen asks friends to help pick apples — they all say no. Repetitive "Not I" pattern. Phase 2 GPCs only.',
  },
  {
    id: 'seed-p2-03', title: 'Mud Fun', phonicsPhase: 2,
    targetGPCs: ['m', 'u', 'd', 'f', 'n', 'g', 'ss'],
    taughtGPCSet: PHASE_GPC_SETS[2].cumulativeGPCs,
    theme: 'Outdoor play', narrativeTemplate: NarrativeTemplate.REPETITIVE_PHRASE,
    ageRange: { min: 3, max: 5 }, targetPageCount: 8,
    artStyle: 'crayon_texture', voicePersona: 'playful_pip',
    comprehensionStrand: 'vocabulary', vocabularyTier: 'Tier1',
    culturalContext: 'universal',
    characterSpecs: [
      { name: 'Gus', species: 'human_child', description: 'An energetic toddler', personalityTraits: ['energetic', 'joyful'], visualDetails: 'Ginger hair, green wellies, mud-splattered', role: 'protagonist' },
    ],
    storyPrompt: 'Gus runs in the mud, digs in the mud, sits in the mud. Repetitive "in the mud" phrase. Very simple CVC words.',
  },
  {
    id: 'seed-p2-04', title: 'Get Up, Cat!', phonicsPhase: 2,
    targetGPCs: ['g', 'e', 't', 'u', 'p', 'c', 'a'],
    taughtGPCSet: PHASE_GPC_SETS[2].cumulativeGPCs,
    theme: 'Morning routines', narrativeTemplate: NarrativeTemplate.REPETITIVE_PHRASE,
    ageRange: { min: 3, max: 5 }, targetPageCount: 8,
    artStyle: 'flat_vector', voicePersona: 'playful_pip',
    comprehensionStrand: 'prior_knowledge', vocabularyTier: 'Tier1',
    culturalContext: 'universal',
    characterSpecs: [
      { name: 'Cat', species: 'cat', description: 'A very sleepy tabby cat', personalityTraits: ['sleepy', 'grumpy'], visualDetails: 'Orange tabby on a cushion', role: 'protagonist' },
    ],
    storyPrompt: 'A cat who will not get up. Each page tries a different way. "Get up, Cat!" repeated. Phase 2 GPCs only.',
  },
  {
    id: 'seed-p2-05', title: 'Can I Sit?', phonicsPhase: 2,
    targetGPCs: ['c', 'a', 'n', 'i', 's', 't', 'ff', 'll'],
    taughtGPCSet: PHASE_GPC_SETS[2].cumulativeGPCs,
    theme: 'Sharing and manners', narrativeTemplate: NarrativeTemplate.QUESTION_ANSWER,
    ageRange: { min: 4, max: 5 }, targetPageCount: 8,
    artStyle: 'soft_watercolour', voicePersona: 'storytime_sarah',
    comprehensionStrand: 'inference', vocabularyTier: 'Tier1',
    culturalContext: 'urban_multicultural',
    characterSpecs: [
      { name: 'Tiff', species: 'human_child', description: 'A shy girl looking for a seat', personalityTraits: ['shy', 'polite'], visualDetails: 'Straight black hair, pink dress', role: 'protagonist' },
    ],
    storyPrompt: 'Tiff asks different animals "Can I sit?" Each says no until she finds a friend. Phase 2 GPCs only.',
  },

  // ── Phase 3: Digraphs and Long Vowels (6 books) ─────────────────
  {
    id: 'seed-p3-01', title: 'The Ship in the Night', phonicsPhase: 3,
    targetGPCs: ['sh', 'igh', 'th', 'ng', 'ee'],
    taughtGPCSet: PHASE_GPC_SETS[3].cumulativeGPCs,
    theme: 'Ocean adventure', narrativeTemplate: NarrativeTemplate.JOURNEY_STORY,
    ageRange: { min: 4, max: 6 }, targetPageCount: 12,
    artStyle: 'watercolour_dreamlike', voicePersona: 'adventure_alex',
    comprehensionStrand: 'vocabulary', vocabularyTier: 'Tier1',
    culturalContext: 'coastal',
    characterSpecs: [
      { name: 'Captain Ling', species: 'human_adult', description: 'A kind ship captain', personalityTraits: ['brave', 'wise'], visualDetails: 'East Asian woman, blue captain coat', role: 'protagonist' },
      { name: 'Reef', species: 'parrot', description: 'A chatty green parrot', personalityTraits: ['talkative', 'loyal'], visualDetails: 'Bright green parrot, yellow beak', role: 'supporting' },
    ],
    storyPrompt: 'Captain Ling sails through the night, seeing things in the moonlight. Targets sh/igh/th/ng/ee. Phase 3 GPCs.',
  },
  {
    id: 'seed-p3-02', title: 'Rain on the Farm', phonicsPhase: 3,
    targetGPCs: ['ai', 'ar', 'or', 'oa', 'er'],
    taughtGPCSet: PHASE_GPC_SETS[3].cumulativeGPCs,
    theme: 'Weather and nature', narrativeTemplate: NarrativeTemplate.DISCOVERY_STORY,
    ageRange: { min: 4, max: 6 }, targetPageCount: 10,
    artStyle: 'soft_watercolour', voicePersona: 'wise_willow',
    comprehensionStrand: 'prior_knowledge', vocabularyTier: 'Tier1',
    culturalContext: 'rural',
    characterSpecs: [
      { name: 'Farmer Bart', species: 'human_adult', description: 'An old farmer', personalityTraits: ['patient', 'observant'], visualDetails: 'Dark-skinned man, straw hat, blue overalls', role: 'protagonist' },
    ],
    storyPrompt: 'Farmer Bart sees rain coming and discovers how rain helps things grow. Targets ai/ar/or/oa/er digraphs.',
  },
  {
    id: 'seed-p3-03', title: 'The Moon and the Owl', phonicsPhase: 3,
    targetGPCs: ['oo', 'ow', 'ch', 'igh', 'ur'],
    taughtGPCSet: PHASE_GPC_SETS[3].cumulativeGPCs,
    theme: 'Nocturnal animals', narrativeTemplate: NarrativeTemplate.INFORMATION_TEXT,
    ageRange: { min: 5, max: 6 }, targetPageCount: 12,
    artStyle: 'watercolour_dreamlike', voicePersona: 'wise_willow',
    comprehensionStrand: 'genre', vocabularyTier: 'Mixed',
    culturalContext: 'woodland',
    characterSpecs: [
      { name: 'Hoot', species: 'owl', description: 'A curious barn owl', personalityTraits: ['curious', 'quiet'], visualDetails: 'White barn owl with brown speckles', role: 'protagonist' },
    ],
    storyPrompt: 'A barn owl named Hoot flies through the night. Information text about nocturnal animals. Targets oo/ow/ch/igh/ur.',
  },
  {
    id: 'seed-p3-04', title: 'Cooking with Grandma', phonicsPhase: 3,
    targetGPCs: ['oo', 'ee', 'ai', 'ch', 'oi'],
    taughtGPCSet: PHASE_GPC_SETS[3].cumulativeGPCs,
    theme: 'Family and food', narrativeTemplate: NarrativeTemplate.PROBLEM_SOLUTION,
    ageRange: { min: 4, max: 6 }, targetPageCount: 12,
    artStyle: 'soft_3d', voicePersona: 'storytime_sarah',
    comprehensionStrand: 'inference', vocabularyTier: 'Tier1',
    culturalContext: 'south_asian',
    characterSpecs: [
      { name: 'Aisha', species: 'human_child', description: 'A girl who loves cooking', personalityTraits: ['creative', 'determined'], visualDetails: 'South Asian girl, purple hijab, flour on cheeks', role: 'protagonist' },
      { name: 'Nani', species: 'human_adult', description: 'Aisha grandmother', personalityTraits: ['warm', 'patient'], visualDetails: 'Elderly South Asian woman, colourful sari', role: 'supporting' },
    ],
    storyPrompt: 'Aisha and her grandma try to bake a cake but things go wrong. They solve it together. Targets oo/ee/ai/ch/oi.',
  },
  {
    id: 'seed-p3-05', title: 'The Quick Fox', phonicsPhase: 3,
    targetGPCs: ['qu', 'x', 'ng', 'oi', 'ear'],
    taughtGPCSet: PHASE_GPC_SETS[3].cumulativeGPCs,
    theme: 'Woodland adventure', narrativeTemplate: NarrativeTemplate.HEROS_JOURNEY,
    ageRange: { min: 5, max: 7 }, targetPageCount: 12,
    artStyle: 'detailed_storybook', voicePersona: 'adventure_alex',
    comprehensionStrand: 'vocabulary', vocabularyTier: 'Tier1',
    culturalContext: 'woodland',
    characterSpecs: [
      { name: 'Quinn', species: 'fox', description: 'A quick and clever fox', personalityTraits: ['clever', 'kind'], visualDetails: 'Red fox with white chest, bright eyes', role: 'protagonist' },
    ],
    storyPrompt: 'Quinn the fox must cross the wood to bring food to her cubs. A hero journey. Targets qu/x/ng/oi/ear.',
  },
  {
    id: 'seed-p3-06', title: 'Up in the Air', phonicsPhase: 3,
    targetGPCs: ['air', 'ure', 'igh', 'oa', 'ee'],
    taughtGPCSet: PHASE_GPC_SETS[3].cumulativeGPCs,
    theme: 'Flying and dreams', narrativeTemplate: NarrativeTemplate.DIARY_FORMAT,
    ageRange: { min: 5, max: 7 }, targetPageCount: 10,
    artStyle: 'watercolour_dreamlike', voicePersona: 'adventure_alex',
    comprehensionStrand: 'inference', vocabularyTier: 'Tier1',
    culturalContext: 'universal',
    characterSpecs: [
      { name: 'Jeet', species: 'human_child', description: 'A boy who dreams of flying', personalityTraits: ['imaginative', 'brave'], visualDetails: 'Indian boy, aviator goggles, paper wings', role: 'protagonist' },
    ],
    storyPrompt: 'Jeet writes a diary about learning to fly a kite. Targets air/ure/igh/oa/ee. Diary format entries.',
  },

  // ── Phase 4: Consonant Clusters (4 books) ───────────────────────
  {
    id: 'seed-p4-01', title: 'The Best Camp Trip', phonicsPhase: 4,
    targetGPCs: ['ch', 'sh', 'th', 'ng'],
    taughtGPCSet: PHASE_GPC_SETS[4].cumulativeGPCs,
    theme: 'Camping and nature', narrativeTemplate: NarrativeTemplate.JOURNEY_STORY,
    ageRange: { min: 5, max: 7 }, targetPageCount: 14,
    artStyle: 'detailed_storybook', voicePersona: 'adventure_alex',
    comprehensionStrand: 'prior_knowledge', vocabularyTier: 'Mixed',
    culturalContext: 'australian_bush',
    characterSpecs: [
      { name: 'Brent', species: 'human_child', description: 'An adventurous boy', personalityTraits: ['adventurous', 'brave'], visualDetails: 'Aboriginal Australian boy, khaki shorts, wide hat', role: 'protagonist' },
      { name: 'Gram', species: 'human_adult', description: 'Brent grandfather', personalityTraits: ['wise', 'storyteller'], visualDetails: 'Elder Aboriginal man, grey beard, warm smile', role: 'supporting' },
    ],
    storyPrompt: 'Brent and his grandpa camp in the bush. CCVC/CVCC words with consonant clusters: stamp, crisp, trunk, grand. Phase 4.',
  },
  {
    id: 'seed-p4-02', title: 'Sprint to the Finish', phonicsPhase: 4,
    targetGPCs: ['ch', 'sh', 'th', 'ng'],
    taughtGPCSet: PHASE_GPC_SETS[4].cumulativeGPCs,
    theme: 'Sports and perseverance', narrativeTemplate: NarrativeTemplate.PROBLEM_SOLUTION,
    ageRange: { min: 5, max: 7 }, targetPageCount: 12,
    artStyle: 'vibrant_cartoon', voicePersona: 'adventure_alex',
    comprehensionStrand: 'vocabulary', vocabularyTier: 'Tier1',
    culturalContext: 'urban_multicultural',
    characterSpecs: [
      { name: 'Preet', species: 'human_child', description: 'A girl who loves running', personalityTraits: ['determined', 'fast'], visualDetails: 'South Asian girl, running shoes, braided hair', role: 'protagonist' },
    ],
    storyPrompt: 'Preet trains for a sprint race and almost gives up. Consonant cluster words: sprint, strong, track, clap. Phase 4.',
  },
  {
    id: 'seed-p4-03', title: 'Crunch and Munch', phonicsPhase: 4,
    targetGPCs: ['ch', 'sh', 'ng'],
    taughtGPCSet: PHASE_GPC_SETS[4].cumulativeGPCs,
    theme: 'Healthy eating', narrativeTemplate: NarrativeTemplate.INFORMATION_TEXT,
    ageRange: { min: 5, max: 7 }, targetPageCount: 10,
    artStyle: 'flat_vector', voicePersona: 'playful_pip',
    comprehensionStrand: 'genre', vocabularyTier: 'Mixed',
    culturalContext: 'universal',
    characterSpecs: [
      { name: 'Chef Plum', species: 'human_adult', description: 'A cheerful chef', personalityTraits: ['cheerful', 'creative'], visualDetails: 'Round chef with tall white hat, red apron', role: 'protagonist' },
    ],
    storyPrompt: 'Chef Plum shows how crunchy foods are made. CCVC words: crunch, munch, fresh, crisp, blend. Information text.',
  },
  {
    id: 'seed-p4-04', title: 'The Lost Drum', phonicsPhase: 4,
    targetGPCs: ['ch', 'sh', 'th', 'ng'],
    taughtGPCSet: PHASE_GPC_SETS[4].cumulativeGPCs,
    theme: 'Music and community', narrativeTemplate: NarrativeTemplate.PROBLEM_SOLUTION,
    ageRange: { min: 5, max: 7 }, targetPageCount: 12,
    artStyle: 'soft_3d', voicePersona: 'storytime_sarah',
    comprehensionStrand: 'inference', vocabularyTier: 'Tier1',
    culturalContext: 'west_african',
    characterSpecs: [
      { name: 'Kwame', species: 'human_child', description: 'A boy who loves drumming', personalityTraits: ['musical', 'persistent'], visualDetails: 'West African boy, bright dashiki, wooden drum', role: 'protagonist' },
    ],
    storyPrompt: 'Kwame loses his drum before the festival and must find it. Cluster words: drum, lost, stomp, clap, grand. Phase 4.',
  },

  // ── Phase 5: Alternative Spellings (5 books) ────────────────────
  {
    id: 'seed-p5-01', title: 'The Brave Whale', phonicsPhase: 5,
    targetGPCs: ['a_e', 'wh', 'ay', 'ea'],
    taughtGPCSet: PHASE_GPC_SETS[5].cumulativeGPCs,
    theme: 'Ocean conservation', narrativeTemplate: NarrativeTemplate.HEROS_JOURNEY,
    ageRange: { min: 6, max: 8 }, targetPageCount: 16,
    artStyle: 'detailed_storybook', voicePersona: 'adventure_alex',
    comprehensionStrand: 'vocabulary', vocabularyTier: 'Mixed',
    culturalContext: 'coastal',
    characterSpecs: [
      { name: 'Wave', species: 'whale', description: 'A young humpback whale', personalityTraits: ['brave', 'curious'], visualDetails: 'Young grey-blue humpback whale with white markings', role: 'protagonist' },
    ],
    storyPrompt: 'Wave the whale travels to clean seas. Split digraphs (a_e: brave, whale, safe) and wh/ay/ea words. Phase 5.',
  },
  {
    id: 'seed-p5-02', title: 'The Phonics Detectives', phonicsPhase: 5,
    targetGPCs: ['ph', 'i_e', 'ew', 'ue'],
    taughtGPCSet: PHASE_GPC_SETS[5].cumulativeGPCs,
    theme: 'Mystery and problem-solving', narrativeTemplate: NarrativeTemplate.PROBLEM_SOLUTION,
    ageRange: { min: 6, max: 8 }, targetPageCount: 16,
    artStyle: 'vibrant_cartoon', voicePersona: 'adventure_alex',
    comprehensionStrand: 'inference', vocabularyTier: 'Mixed',
    culturalContext: 'urban_multicultural',
    characterSpecs: [
      { name: 'Phoebe', species: 'human_child', description: 'A detective who loves puzzles', personalityTraits: ['clever', 'observant'], visualDetails: 'Girl with magnifying glass, deerstalker hat', role: 'protagonist' },
      { name: 'Drew', species: 'human_child', description: 'Phoebe partner', personalityTraits: ['creative', 'brave'], visualDetails: 'Boy with notebook, red scarf', role: 'supporting' },
    ],
    storyPrompt: 'Phoebe and Drew solve a mystery using phonics clues. ph words (phone, photo), i_e (clue, time), ew (new, drew). Phase 5.',
  },
  {
    id: 'seed-p5-03', title: 'A Day at the Fair', phonicsPhase: 5,
    targetGPCs: ['ay', 'oy', 'aw', 'ou'],
    taughtGPCSet: PHASE_GPC_SETS[5].cumulativeGPCs,
    theme: 'Fun and celebration', narrativeTemplate: NarrativeTemplate.JOURNEY_STORY,
    ageRange: { min: 5, max: 7 }, targetPageCount: 12,
    artStyle: 'vibrant_cartoon', voicePersona: 'playful_pip',
    comprehensionStrand: 'prior_knowledge', vocabularyTier: 'Tier1',
    culturalContext: 'universal',
    characterSpecs: [
      { name: 'Joy', species: 'human_child', description: 'A girl at the fair', personalityTraits: ['excited', 'adventurous'], visualDetails: 'Curly red hair, striped shirt, candy floss', role: 'protagonist' },
    ],
    storyPrompt: 'Joy visits the fair: rides, games, and treats. ay (day, play), oy (joy, toy), aw (saw, straw), ou (loud, round). Phase 5.',
  },
  {
    id: 'seed-p5-04', title: 'Space Rescue', phonicsPhase: 5,
    targetGPCs: ['u_e', 'o_e', 'ie', 'oe'],
    taughtGPCSet: PHASE_GPC_SETS[5].cumulativeGPCs,
    theme: 'Space exploration', narrativeTemplate: NarrativeTemplate.HEROS_JOURNEY,
    ageRange: { min: 6, max: 8 }, targetPageCount: 16,
    artStyle: 'sci_fi_illustration', voicePersona: 'adventure_alex',
    comprehensionStrand: 'vocabulary', vocabularyTier: 'Mixed',
    culturalContext: 'universal',
    characterSpecs: [
      { name: 'June', species: 'human_child', description: 'A girl astronaut', personalityTraits: ['brave', 'clever'], visualDetails: 'Girl in small spacesuit, helmet under arm', role: 'protagonist' },
      { name: 'Blip', species: 'robot', description: 'A small helper robot', personalityTraits: ['loyal', 'funny'], visualDetails: 'Round silver robot with blue lights', role: 'supporting' },
    ],
    storyPrompt: 'June and her robot Blip rescue a lost satellite. u_e (June, huge, tube), o_e (home, stone), ie/oe words. Phase 5.',
  },
  {
    id: 'seed-p5-05', title: 'The Garden of Wonders', phonicsPhase: 5,
    targetGPCs: ['e_e', 'ea', 'ir', 'au'],
    taughtGPCSet: PHASE_GPC_SETS[5].cumulativeGPCs,
    theme: 'Nature and growth', narrativeTemplate: NarrativeTemplate.DISCOVERY_STORY,
    ageRange: { min: 6, max: 8 }, targetPageCount: 14,
    artStyle: 'watercolour_dreamlike', voicePersona: 'wise_willow',
    comprehensionStrand: 'genre', vocabularyTier: 'Mixed',
    culturalContext: 'universal',
    characterSpecs: [
      { name: 'Eve', species: 'human_child', description: 'A girl who discovers a hidden garden', personalityTraits: ['gentle', 'observant'], visualDetails: 'Girl with braids, green overalls, watering can', role: 'protagonist' },
    ],
    storyPrompt: 'Eve finds a hidden garden where plants grow when you read to them. e_e (Eve, these), ea (leaf, dream), ir (bird, first), au (because, autumn). Phase 5.',
  },
];

// =============================================================================
// Section 4: Generation Orchestrator
// =============================================================================

/** Cost estimation constants (per the Strategy document Section 4.2) */
export const GENERATION_COSTS = {
  narrative: { minPerBook: 0.15, maxPerBook: 0.30 },
  illustration: { perPage: 0.04, perPageMax: 0.08 },
  narration: { minPerBook: 0.10, maxPerBook: 0.25 },
  safety: { perBook: 0.02 },
};

/**
 * SeedLibraryGenerator — The Curator
 *
 * Orchestrates the generation of all 20 seed storybooks using the full
 * pipeline: narrative generation -> illustration -> narration -> validation.
 * Like a museum curator preparing an opening exhibition, it ensures every
 * piece is high quality, correctly categorised, and ready for display.
 */
export class SeedLibraryGenerator extends ScholarlyBaseService {
  private specs: SeedBookSpec[];
  private concurrency: number;
  private maxRetries: number;
  private eventHandlers: Array<(event: SeedGenerationEvent) => void>;

  constructor(config?: {
    specs?: SeedBookSpec[];
    concurrency?: number;
    maxRetries?: number;
  }) {
    super();
    this.specs = config?.specs ?? SEED_BOOK_SPECS;
    this.concurrency = config?.concurrency ?? 3;
    this.maxRetries = config?.maxRetries ?? 2;
    this.eventHandlers = [];
  }

  onEvent(handler: (event: SeedGenerationEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  private emit(event: SeedGenerationEvent): void {
    for (const handler of this.eventHandlers) {
      try { handler(event); } catch (err) { console.error('Seed gen event error:', err); }
    }
  }

  /**
   * Generate the complete seed library.
   * Processes books in batches to respect API rate limits and cost budgets.
   */
  async generateAll(): Promise<Result<SeedLibraryReport>> {
    const startTime = Date.now();
    const results: SeedBookResult[] = [];
    const failures: Array<{ specId: string; error: string }> = [];

    this.emit({ type: 'GENERATION_STARTED', totalBooks: this.specs.length });

    // Process in batches respecting concurrency limit
    for (let i = 0; i < this.specs.length; i += this.concurrency) {
      const batch = this.specs.slice(i, i + this.concurrency);
      const batchResults = await Promise.allSettled(
        batch.map(spec => this.generateSingleBook(spec))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const result = batchResults[j];
        const spec = batch[j];

        if (result.status === 'fulfilled' && result.value.success) {
          results.push(result.value.data!);
          this.emit({
            type: 'BOOK_COMPLETED',
            specId: spec.id,
            title: spec.title,
            costUSD: result.value.data!.totalCostUSD,
          });
        } else {
          const error = result.status === 'rejected'
            ? result.reason?.message || 'Unknown error'
            : result.value.error || 'Generation failed';
          failures.push({ specId: spec.id, error });
          this.emit({ type: 'BOOK_FAILED', specId: spec.id, title: spec.title, error });
        }
      }

      this.emit({
        type: 'BATCH_COMPLETED',
        batchIndex: Math.floor(i / this.concurrency),
        completed: results.length,
        failed: failures.length,
        remaining: this.specs.length - results.length - failures.length,
      });
    }

    const totalCost = results.reduce((sum, r) => sum + r.totalCostUSD, 0);
    const avgDecodability = results.length > 0
      ? results.reduce((sum, r) => sum + r.narrative.decodabilityScore, 0) / results.length
      : 0;

    const phaseDistribution: Record<number, number> = {};
    for (const r of results) {
      phaseDistribution[r.spec.phonicsPhase] = (phaseDistribution[r.spec.phonicsPhase] || 0) + 1;
    }

    const report: SeedLibraryReport = {
      totalBooks: this.specs.length,
      successfulBooks: results.length,
      failedBooks: failures.length,
      totalCostUSD: totalCost,
      averageCostPerBook: results.length > 0 ? totalCost / results.length : 0,
      phaseDistribution,
      averageDecodabilityScore: avgDecodability,
      generationTimeMs: Date.now() - startTime,
      results,
      failures,
    };

    this.emit({ type: 'GENERATION_COMPLETED', report });

    return { success: true, data: report };
  }

  /**
   * Generate a single seed book through the full pipeline.
   * Retries on failure up to maxRetries.
   */
  async generateSingleBook(spec: SeedBookSpec): Promise<Result<SeedBookResult>> {
    let lastError = '';

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        this.emit({ type: 'BOOK_STARTED', specId: spec.id, title: spec.title, attempt });

        // Step 1: Generate narrative
        const narrative = await this.generateNarrative(spec);

        // Step 2: Generate illustrations
        const illustrations = await this.generateIllustrations(spec, narrative);

        // Step 3: Generate narration
        const narration = await this.generateNarration(spec, narrative);

        // Step 4: Validate
        const validation = await this.validateBook(spec, narrative);

        if (!validation.passed && attempt < this.maxRetries) {
          lastError = 'Validation failed: decodability or safety check failed';
          continue; // Retry with regeneration
        }

        const totalCost =
          narrative.generationCostUSD +
          illustrations.generationCostUSD +
          narration.generationCostUSD +
          GENERATION_COSTS.safety.perBook;

        return {
          success: true,
          data: {
            spec,
            narrative,
            illustrations,
            narration,
            validation,
            totalCostUSD: totalCost,
            generatedAt: new Date(),
          },
        };
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    return { success: false, error: `Failed after ${this.maxRetries + 1} attempts: ${lastError}` };
  }

  // ── Pipeline Stage Implementations ──────────────────────────────

  /**
   * Generate narrative text using the Story Narrative Generator.
   * In production, delegates to the NarrativeGenerator from Sprint 2.
   */
  private async generateNarrative(spec: SeedBookSpec): Promise<SeedBookResult['narrative']> {
    // In production: calls NarrativeGenerator.generate() with phonics constraints
    // const result = await this.narrativeGenerator.generate({
    //   phonicsFingerprint: {
    //     taughtGPCs: spec.taughtGPCSet,
    //     targetGPCs: spec.targetGPCs,
    //     phonicsPhase: spec.phonicsPhase,
    //   },
    //   theme: spec.theme,
    //   narrativeTemplate: spec.narrativeTemplate,
    //   targetPageCount: spec.targetPageCount,
    //   ageRange: spec.ageRange,
    //   characterSpecs: spec.characterSpecs,
    //   storyPrompt: spec.storyPrompt,
    // });

    // Build prompt context for the narrative generator
    const promptContext = this.buildNarrativePrompt(spec);

    // Simulate narrative generation — production uses real Claude API
    const pages: Array<{ pageNumber: number; text: string; sentences: string[] }> = [];
    for (let i = 1; i <= spec.targetPageCount; i++) {
      const text = `[Generated narrative for page ${i} of "${spec.title}" targeting GPCs: ${spec.targetGPCs.join(', ')}]`;
      pages.push({ pageNumber: i, text, sentences: [text] });
    }

    const totalWords = pages.reduce((sum, p) =>
      sum + p.text.split(/\s+/).filter(w => w.length > 0).length, 0
    );

    const costEstimate = GENERATION_COSTS.narrative.minPerBook +
      (GENERATION_COSTS.narrative.maxPerBook - GENERATION_COSTS.narrative.minPerBook) *
      (spec.targetPageCount / 24);

    return {
      pages,
      totalWords,
      decodabilityScore: 0.90, // Simulated — production calculates real score
      generationCostUSD: costEstimate,
    };
  }

  /**
   * Build the narrative generation prompt with phonics constraints.
   * This is the "phonics fingerprint" that makes our generator unique.
   */
  private buildNarrativePrompt(spec: SeedBookSpec): string {
    return `Generate a ${spec.targetPageCount}-page children's storybook.

TITLE: ${spec.title}
THEME: ${spec.theme}
NARRATIVE TEMPLATE: ${spec.narrativeTemplate}
AGE RANGE: ${spec.ageRange.min}-${spec.ageRange.max}

PHONICS CONSTRAINTS:
- Phase: ${spec.phonicsPhase}
- Target GPCs (practice these): ${spec.targetGPCs.join(', ')}
- Taught GPC set (only use words decodable with these): ${spec.taughtGPCSet.join(', ')}
- Minimum decodability: 85%

CHARACTERS:
${spec.characterSpecs.map(c => `- ${c.name} (${c.species}): ${c.description}. Traits: ${c.personalityTraits.join(', ')}`).join('\n')}

VOCABULARY:
- Tier: ${spec.vocabularyTier}
- Comprehension strand: ${spec.comprehensionStrand}
- Max sentence length: ${spec.phonicsPhase <= 2 ? '8' : spec.phonicsPhase <= 4 ? '15' : '20'} words

STORY DIRECTION: ${spec.storyPrompt}

Generate exactly ${spec.targetPageCount} pages. Each page should have 1-3 sentences.
Every word must be decodable using the taught GPC set or be a high-frequency tricky word.`;
  }

  /**
   * Generate illustrations using the Illustration Pipeline.
   * In production, delegates to the IllustrationPipeline from Sprint 3.
   */
  private async generateIllustrations(
    spec: SeedBookSpec,
    narrative: SeedBookResult['narrative']
  ): Promise<SeedBookResult['illustrations']> {
    // In production: calls IllustrationPipeline.generateBatch() with character sheets
    const pages = narrative.pages.map(p => ({
      pageNumber: p.pageNumber,
      imageUrl: `/illustrations/${spec.id}/page-${p.pageNumber}.png`,
      altText: `Illustration for page ${p.pageNumber} of "${spec.title}"`,
    }));

    const costEstimate = narrative.pages.length * GENERATION_COSTS.illustration.perPage;

    return {
      pages,
      artStyle: spec.artStyle,
      generationCostUSD: costEstimate,
    };
  }

  /**
   * Generate audio narration using the Audio Narration Service.
   * In production, delegates to the NarrationService from Sprint 3.
   */
  private async generateNarration(
    spec: SeedBookSpec,
    narrative: SeedBookResult['narrative']
  ): Promise<SeedBookResult['narration']> {
    // In production: calls NarrationService.narrateBook() with voice persona
    const allWords = narrative.pages.flatMap(p =>
      p.text.split(/\s+/).filter(w => w.length > 0)
    );

    // Simulate word timestamps
    let currentMs = 0;
    const paceMs = spec.phonicsPhase <= 2 ? 1000 : spec.phonicsPhase <= 4 ? 600 : 400;
    const wordTimestamps = allWords.map(word => {
      const start = currentMs;
      const duration = Math.max(200, paceMs * (word.length / 5));
      currentMs += duration + 100; // 100ms gap between words
      return { word, startMs: start, endMs: start + duration };
    });

    const costEstimate = GENERATION_COSTS.narration.minPerBook +
      (GENERATION_COSTS.narration.maxPerBook - GENERATION_COSTS.narration.minPerBook) *
      (allWords.length / 500);

    return {
      totalDurationMs: currentMs,
      wordTimestamps,
      voicePersona: spec.voicePersona,
      generationCostUSD: costEstimate,
    };
  }

  /**
   * Validate the generated book using the ContentValidator.
   * In production, delegates to ContentValidator from Sprint 3.
   */
  private async validateBook(
    spec: SeedBookSpec,
    narrative: SeedBookResult['narrative']
  ): Promise<SeedBookResult['validation']> {
    // In production: calls ContentValidator.validateComprehensive()
    return {
      passed: narrative.decodabilityScore >= 0.85,
      decodabilityScore: narrative.decodabilityScore,
      safetyPassed: true,
      metadataComplete: true,
    };
  }

  // ── Utility Methods ─────────────────────────────────────────────

  /** Get generation cost estimate for the full seed library */
  estimateTotalCost(): { min: number; max: number; perPhase: Record<number, { min: number; max: number }> } {
    let totalMin = 0;
    let totalMax = 0;
    const perPhase: Record<number, { min: number; max: number }> = {};

    for (const spec of this.specs) {
      const narrativeMin = GENERATION_COSTS.narrative.minPerBook;
      const narrativeMax = GENERATION_COSTS.narrative.maxPerBook;
      const illustrationMin = spec.targetPageCount * GENERATION_COSTS.illustration.perPage;
      const illustrationMax = spec.targetPageCount * GENERATION_COSTS.illustration.perPageMax;
      const narrationMin = GENERATION_COSTS.narration.minPerBook;
      const narrationMax = GENERATION_COSTS.narration.maxPerBook;
      const safety = GENERATION_COSTS.safety.perBook;

      const bookMin = narrativeMin + illustrationMin + narrationMin + safety;
      const bookMax = narrativeMax + illustrationMax + narrationMax + safety;

      totalMin += bookMin;
      totalMax += bookMax;

      if (!perPhase[spec.phonicsPhase]) {
        perPhase[spec.phonicsPhase] = { min: 0, max: 0 };
      }
      perPhase[spec.phonicsPhase].min += bookMin;
      perPhase[spec.phonicsPhase].max += bookMax;
    }

    return { min: totalMin, max: totalMax, perPhase };
  }

  /** Get a summary of the seed library specifications */
  getSpecSummary(): {
    totalBooks: number;
    phaseDistribution: Record<number, number>;
    themes: string[];
    templates: Record<string, number>;
    artStyles: string[];
    culturalContexts: string[];
  } {
    const phaseDistribution: Record<number, number> = {};
    const templates: Record<string, number> = {};
    const themes: string[] = [];
    const artStyles = new Set<string>();
    const culturalContexts = new Set<string>();

    for (const spec of this.specs) {
      phaseDistribution[spec.phonicsPhase] = (phaseDistribution[spec.phonicsPhase] || 0) + 1;
      templates[spec.narrativeTemplate] = (templates[spec.narrativeTemplate] || 0) + 1;
      themes.push(spec.theme);
      artStyles.add(spec.artStyle);
      culturalContexts.add(spec.culturalContext);
    }

    return {
      totalBooks: this.specs.length,
      phaseDistribution,
      themes,
      templates,
      artStyles: [...artStyles],
      culturalContexts: [...culturalContexts],
    };
  }
}

// =============================================================================
// Section 5: Events
// =============================================================================

export type SeedGenerationEvent =
  | { type: 'GENERATION_STARTED'; totalBooks: number }
  | { type: 'BOOK_STARTED'; specId: string; title: string; attempt: number }
  | { type: 'BOOK_COMPLETED'; specId: string; title: string; costUSD: number }
  | { type: 'BOOK_FAILED'; specId: string; title: string; error: string }
  | { type: 'BATCH_COMPLETED'; batchIndex: number; completed: number; failed: number; remaining: number }
  | { type: 'GENERATION_COMPLETED'; report: SeedLibraryReport };

// =============================================================================
// Section 6: Factory
// =============================================================================

export function createSeedLibraryGenerator(overrides?: {
  specs?: SeedBookSpec[];
  concurrency?: number;
  maxRetries?: number;
}): SeedLibraryGenerator {
  return new SeedLibraryGenerator(overrides);
}

// =============================================================================
// End of seed-library.ts
// =============================================================================
