// =============================================================================
// SCHOLARLY PLATFORM — Sprint 7: LR-002
// Seed Library Specifications — 20 Books
// =============================================================================

export type PhonicsPhase = 'PHASE_2' | 'PHASE_3' | 'PHASE_4' | 'PHASE_5' | 'PHASE_6';

export interface SeedBookSpec {
  id: string;
  title: string;
  seriesName: string;
  phase: PhonicsPhase;
  targetGpcs: string[];
  taughtGpcSet: string[];
  trickyWords: string[];
  theme: string;
  characterNames: string[];
  ageMin: number;
  ageMax: number;
  pageCount: number;
  artStyle: string;
  culturalContext: string;
  vocabularyTier: string;
  narrativeTemplate: string;
  wcpmBandMin: number;
  wcpmBandMax: number;
  comprehensionStrand: string;
  morphemeFocus: string[];
}

export interface BookGenerationResult {
  specId: string;
  success: boolean;
  storybookId: string | null;
  decodabilityScore: number;
  totalCostUsd: number;
  durationMs: number;
  retryCount: number;
  error: string | null;
  stageCosts: Record<string, number>;
}

export interface SeedLibraryConfig {
  tenantId: string;
  concurrency: number;
  budgetLimitUsd: number;
  maxRetriesPerBook: number;
  decodabilityThreshold: number;
  skipIllustration: boolean;
  skipNarration: boolean;
  aiModel: string;
  illustrationModel: string;
  narrationVoice: string;
  onProgress?: (progress: GenerationProgress) => void;
}

export interface GenerationProgress {
  totalBooks: number;
  completed: number;
  inProgress: number;
  failed: number;
  retrying: number;
  totalCostUsd: number;
  estimatedRemainingCostUsd: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  currentBooks: string[];
}

// Phase 2 taught GPC set (Letters and Sounds)
const PHASE_2_GPCS = ['s','a','t','p','i','n','m','d','g','o','c','k','ck','e','u','r','h','b','f','ff','l','ll','ss'];

// Phase 3 adds these to Phase 2
const PHASE_3_NEW = ['j','v','w','x','y','z','zz','qu','ch','sh','th','ng','ai','ee','igh','oa','oo','ar','or','ur','ow','oi','ear','air','ure','er'];
const PHASE_3_GPCS = [...PHASE_2_GPCS, ...PHASE_3_NEW];

// Phase 5 adds these
const PHASE_5_NEW = ['ay','ou','ie','ea','oy','ir','ue','aw','wh','ph','ew','oe','au','ey','a_e','i_e','o_e','u_e'];
const PHASE_5_GPCS = [...PHASE_3_GPCS, ...PHASE_5_NEW];

// =============================================================================
// 20 Seed Book Specifications
// =============================================================================

export const SEED_LIBRARY_SPECS: SeedBookSpec[] = [
  // ===== FINN THE FOX ADVENTURES (Phase 2, watercolour, ages 3-5) =====
  {
    id: 'seed-001', title: 'Finn Sits on a Log', seriesName: 'Finn the Fox Adventures',
    phase: 'PHASE_2', targetGpcs: ['s','i','t','o','g','l'], taughtGpcSet: PHASE_2_GPCS,
    trickyWords: ['the','I','a'], theme: 'Finn finds a cosy log in the forest and meets a bug',
    characterNames: ['Finn'], ageMin: 3, ageMax: 5, pageCount: 8, artStyle: 'watercolour',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_1', narrativeTemplate: 'problem_solution',
    wcpmBandMin: 10, wcpmBandMax: 30, comprehensionStrand: 'VOCABULARY', morphemeFocus: [],
  },
  {
    id: 'seed-002', title: 'Finn and the Mud Pit', seriesName: 'Finn the Fox Adventures',
    phase: 'PHASE_2', targetGpcs: ['m','u','d','p','i','t'], taughtGpcSet: PHASE_2_GPCS,
    trickyWords: ['the','is','a'], theme: 'Finn slips into a mud pit and must get out',
    characterNames: ['Finn'], ageMin: 3, ageMax: 5, pageCount: 8, artStyle: 'watercolour',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_1', narrativeTemplate: 'cumulative_tale',
    wcpmBandMin: 10, wcpmBandMax: 30, comprehensionStrand: 'VOCABULARY', morphemeFocus: [],
  },
  {
    id: 'seed-003', title: 'Finn Gets a Pet', seriesName: 'Finn the Fox Adventures',
    phase: 'PHASE_2', targetGpcs: ['g','e','t','p','ck'], taughtGpcSet: PHASE_2_GPCS,
    trickyWords: ['the','to','I','no'], theme: 'Finn finds a duck and wants to keep it as a pet',
    characterNames: ['Finn'], ageMin: 3, ageMax: 5, pageCount: 10, artStyle: 'watercolour',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_1', narrativeTemplate: 'heros_journey',
    wcpmBandMin: 15, wcpmBandMax: 35, comprehensionStrand: 'INFERENCE', morphemeFocus: [],
  },
  {
    id: 'seed-004', title: 'Finn Hops and Runs', seriesName: 'Finn the Fox Adventures',
    phase: 'PHASE_2', targetGpcs: ['h','o','r','u','n','ss'], taughtGpcSet: PHASE_2_GPCS,
    trickyWords: ['the','to','go','no'], theme: 'Finn races his friends across the hill',
    characterNames: ['Finn'], ageMin: 3, ageMax: 5, pageCount: 10, artStyle: 'watercolour',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_1', narrativeTemplate: 'problem_solution',
    wcpmBandMin: 15, wcpmBandMax: 35, comprehensionStrand: 'VOCABULARY', morphemeFocus: [],
  },

  // ===== TINY TALES (Phase 2, crayon, ages 3-4, shorter) =====
  {
    id: 'seed-005', title: 'A Cat on a Mat', seriesName: 'Tiny Tales',
    phase: 'PHASE_2', targetGpcs: ['c','a','t','m'], taughtGpcSet: PHASE_2_GPCS,
    trickyWords: ['a','the'], theme: 'A cat sits on different mats of different colours',
    characterNames: ['Dot'], ageMin: 3, ageMax: 4, pageCount: 6, artStyle: 'crayon',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_1', narrativeTemplate: 'cumulative_tale',
    wcpmBandMin: 5, wcpmBandMax: 20, comprehensionStrand: 'VOCABULARY', morphemeFocus: [],
  },
  {
    id: 'seed-006', title: 'A Big Red Bug', seriesName: 'Tiny Tales',
    phase: 'PHASE_2', targetGpcs: ['b','i','g','r','e','d'], taughtGpcSet: PHASE_2_GPCS,
    trickyWords: ['a','the','is'], theme: 'A bug explores the garden discovering big and small things',
    characterNames: ['Dot'], ageMin: 3, ageMax: 4, pageCount: 6, artStyle: 'crayon',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_1', narrativeTemplate: 'information_text',
    wcpmBandMin: 5, wcpmBandMax: 20, comprehensionStrand: 'PRIOR_KNOWLEDGE', morphemeFocus: [],
  },

  // ===== THE RHYTHM CREW (Phase 2-3, flat_vector, ages 3-7) =====
  {
    id: 'seed-007', title: 'Beats and the Drum', seriesName: 'The Rhythm Crew',
    phase: 'PHASE_2', targetGpcs: ['b','d','r','u','m','t'], taughtGpcSet: PHASE_2_GPCS,
    trickyWords: ['the','a','I'], theme: 'Beats the bear discovers rhythm by drumming on everything',
    characterNames: ['Beats'], ageMin: 3, ageMax: 5, pageCount: 8, artStyle: 'flat_vector',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_1', narrativeTemplate: 'cumulative_tale',
    wcpmBandMin: 10, wcpmBandMax: 30, comprehensionStrand: 'VOCABULARY', morphemeFocus: [],
  },
  {
    id: 'seed-008', title: 'Beats Meets the Band', seriesName: 'The Rhythm Crew',
    phase: 'PHASE_3', targetGpcs: ['ch','sh','th','ee'], taughtGpcSet: PHASE_3_GPCS,
    trickyWords: ['the','was','she','he','they'], theme: 'Beats joins a band with friends who each play a different instrument',
    characterNames: ['Beats'], ageMin: 4, ageMax: 7, pageCount: 12, artStyle: 'flat_vector',
    culturalContext: 'MULTICULTURAL', vocabularyTier: 'TIER_1', narrativeTemplate: 'heros_journey',
    wcpmBandMin: 20, wcpmBandMax: 50, comprehensionStrand: 'INFERENCE', morphemeFocus: [],
  },

  // ===== STAR SCHOOL (Phase 3-5, soft_3d, ages 4-9) =====
  {
    id: 'seed-009', title: 'Luna and the Moon Rock', seriesName: 'Star School',
    phase: 'PHASE_3', targetGpcs: ['oo','ar','ai','ee'], taughtGpcSet: PHASE_3_GPCS,
    trickyWords: ['the','was','her','said','you'], theme: 'Luna the starfish finds a glowing moon rock at the bottom of the sea',
    characterNames: ['Luna'], ageMin: 4, ageMax: 6, pageCount: 12, artStyle: 'soft_3d',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_1', narrativeTemplate: 'heros_journey',
    wcpmBandMin: 25, wcpmBandMax: 50, comprehensionStrand: 'INFERENCE', morphemeFocus: [],
  },
  {
    id: 'seed-010', title: 'Luna Sees the Stars', seriesName: 'Star School',
    phase: 'PHASE_3', targetGpcs: ['ee','igh','oa','or'], taughtGpcSet: PHASE_3_GPCS,
    trickyWords: ['the','was','her','they','all'], theme: 'Luna looks up at the night sky and learns about constellations',
    characterNames: ['Luna'], ageMin: 4, ageMax: 7, pageCount: 12, artStyle: 'soft_3d',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_2', narrativeTemplate: 'information_text',
    wcpmBandMin: 25, wcpmBandMax: 55, comprehensionStrand: 'PRIOR_KNOWLEDGE', morphemeFocus: [],
  },
  {
    id: 'seed-011', title: 'The Shooting Star Chart', seriesName: 'Star School',
    phase: 'PHASE_5', targetGpcs: ['ay','ow','ie','ea'], taughtGpcSet: PHASE_5_GPCS,
    trickyWords: ['their','people','could','would'], theme: 'Luna and her class track shooting stars for a school project',
    characterNames: ['Luna'], ageMin: 6, ageMax: 9, pageCount: 16, artStyle: 'soft_3d',
    culturalContext: 'SCHOOL_SETTING', vocabularyTier: 'TIER_2', narrativeTemplate: 'problem_solution',
    wcpmBandMin: 45, wcpmBandMax: 90, comprehensionStrand: 'GENRE', morphemeFocus: ['-ing','-ed'],
  },
  {
    id: 'seed-012', title: 'The Space Race', seriesName: 'Star School',
    phase: 'PHASE_5', targetGpcs: ['a_e','i_e','o_e','ew'], taughtGpcSet: PHASE_5_GPCS,
    trickyWords: ['their','because','different','through'], theme: 'A race between starfish teams to reach the space station',
    characterNames: ['Luna'], ageMin: 7, ageMax: 9, pageCount: 16, artStyle: 'soft_3d',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_2', narrativeTemplate: 'heros_journey',
    wcpmBandMin: 50, wcpmBandMax: 100, comprehensionStrand: 'INFERENCE', morphemeFocus: ['-tion','-ness'],
  },

  // ===== OCEAN EXPLORERS (Phase 4-5, digital_painting, ages 5-9, non-fiction) =====
  {
    id: 'seed-013', title: 'Splash and the Coral Reef', seriesName: 'Ocean Explorers',
    phase: 'PHASE_3', targetGpcs: ['sh','ch','or','ar','oo'], taughtGpcSet: PHASE_3_GPCS,
    trickyWords: ['the','was','water','many','some'], theme: 'Splash the dolphin explores a coral reef and learns about marine life',
    characterNames: ['Splash'], ageMin: 5, ageMax: 7, pageCount: 14, artStyle: 'digital_painting',
    culturalContext: 'OCEANIC', vocabularyTier: 'TIER_2', narrativeTemplate: 'information_text',
    wcpmBandMin: 30, wcpmBandMax: 60, comprehensionStrand: 'PRIOR_KNOWLEDGE', morphemeFocus: [],
  },
  {
    id: 'seed-014', title: 'Deep Sea Lights', seriesName: 'Ocean Explorers',
    phase: 'PHASE_5', targetGpcs: ['ea','ie','igh','ue'], taughtGpcSet: PHASE_5_GPCS,
    trickyWords: ['their','through','because','light'], theme: 'Splash dives deep to discover bioluminescent creatures',
    characterNames: ['Splash'], ageMin: 6, ageMax: 9, pageCount: 16, artStyle: 'digital_painting',
    culturalContext: 'OCEANIC', vocabularyTier: 'TIER_2', narrativeTemplate: 'heros_journey',
    wcpmBandMin: 45, wcpmBandMax: 85, comprehensionStrand: 'VOCABULARY', morphemeFocus: ['-ful','-less'],
  },
  {
    id: 'seed-015', title: 'The Whale Song', seriesName: 'Ocean Explorers',
    phase: 'PHASE_5', targetGpcs: ['wh','au','aw','ey'], taughtGpcSet: PHASE_5_GPCS,
    trickyWords: ['water','their','heard','through'], theme: 'Splash learns that whales communicate through song across vast oceans',
    characterNames: ['Splash'], ageMin: 6, ageMax: 9, pageCount: 16, artStyle: 'digital_painting',
    culturalContext: 'OCEANIC', vocabularyTier: 'TIER_2', narrativeTemplate: 'information_text',
    wcpmBandMin: 50, wcpmBandMax: 90, comprehensionStrand: 'INFERENCE', morphemeFocus: ['-ly','-ment'],
  },

  // ===== CROSS-SERIES (Phase 3-5, mixed styles) =====
  {
    id: 'seed-016', title: 'Finn and Luna Meet', seriesName: 'Finn the Fox Adventures',
    phase: 'PHASE_3', targetGpcs: ['ai','ee','oa','ng'], taughtGpcSet: PHASE_3_GPCS,
    trickyWords: ['the','said','they','friend'], theme: 'Finn the Fox meets Luna the Starfish in a magical forest clearing',
    characterNames: ['Finn','Luna'], ageMin: 4, ageMax: 7, pageCount: 12, artStyle: 'watercolour',
    culturalContext: 'UNIVERSAL', vocabularyTier: 'TIER_1', narrativeTemplate: 'problem_solution',
    wcpmBandMin: 20, wcpmBandMax: 50, comprehensionStrand: 'INFERENCE', morphemeFocus: [],
  },
  {
    id: 'seed-017', title: 'The Great Book Fair', seriesName: 'Star School',
    phase: 'PHASE_3', targetGpcs: ['air','ear','ure','er'], taughtGpcSet: PHASE_3_GPCS,
    trickyWords: ['the','was','there','were','said'], theme: 'Luna organises a book fair at Star School where everyone reads their favourite stories',
    characterNames: ['Luna','Finn'], ageMin: 5, ageMax: 8, pageCount: 14, artStyle: 'soft_3d',
    culturalContext: 'SCHOOL_SETTING', vocabularyTier: 'TIER_2', narrativeTemplate: 'problem_solution',
    wcpmBandMin: 30, wcpmBandMax: 60, comprehensionStrand: 'GENRE', morphemeFocus: ['-er'],
  },
  {
    id: 'seed-018', title: 'Beats at the Beach', seriesName: 'The Rhythm Crew',
    phase: 'PHASE_3', targetGpcs: ['ch','sh','oa','ar','oo'], taughtGpcSet: PHASE_3_GPCS,
    trickyWords: ['the','was','to','beach'], theme: 'Beats discovers that the ocean has its own rhythm',
    characterNames: ['Beats','Splash'], ageMin: 4, ageMax: 7, pageCount: 12, artStyle: 'flat_vector',
    culturalContext: 'AUSTRALIAN', vocabularyTier: 'TIER_1', narrativeTemplate: 'cumulative_tale',
    wcpmBandMin: 20, wcpmBandMax: 50, comprehensionStrand: 'VOCABULARY', morphemeFocus: [],
  },
  {
    id: 'seed-019', title: 'The Reading Race', seriesName: 'Star School',
    phase: 'PHASE_5', targetGpcs: ['a_e','i_e','ay','ea'], taughtGpcSet: PHASE_5_GPCS,
    trickyWords: ['their','because','everyone','together'], theme: 'Luna\'s class has a reading race — who can read the most books in a week?',
    characterNames: ['Luna'], ageMin: 6, ageMax: 9, pageCount: 16, artStyle: 'soft_3d',
    culturalContext: 'SCHOOL_SETTING', vocabularyTier: 'TIER_2', narrativeTemplate: 'problem_solution',
    wcpmBandMin: 50, wcpmBandMax: 95, comprehensionStrand: 'INFERENCE', morphemeFocus: ['-est','-er'],
  },
  {
    id: 'seed-020', title: 'Dot Counts to Ten', seriesName: 'Tiny Tales',
    phase: 'PHASE_3', targetGpcs: ['th','ng','ow','oi'], taughtGpcSet: PHASE_3_GPCS,
    trickyWords: ['the','one','two','they'], theme: 'Dot the cat counts things she sees on a walk through town',
    characterNames: ['Dot'], ageMin: 3, ageMax: 5, pageCount: 10, artStyle: 'crayon',
    culturalContext: 'URBAN', vocabularyTier: 'TIER_1', narrativeTemplate: 'cumulative_tale',
    wcpmBandMin: 15, wcpmBandMax: 35, comprehensionStrand: 'PRIOR_KNOWLEDGE', morphemeFocus: [],
  },
];
