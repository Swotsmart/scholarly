/**
 * Phonics Blending Data
 * Types, grapheme data, word datasets, and helpers for the blending activity.
 */

// =============================================================================
// TYPES
// =============================================================================

export type PhonicsWordPhase = 2 | 3 | 4;
export type GraphemeType = 'single' | 'digraph' | 'trigraph';
export type BlendingMode = 'successive' | 'connected';

export interface BlendingWord {
  word: string;
  phonemes: string[]; // Each element is a phoneme UNIT — "sh" is one element
  emoji: string;
  phase: PhonicsWordPhase;
  difficulty: 1 | 2 | 3;
}

export interface GraphemeData {
  grapheme: string;
  phoneme: string; // IPA representation
  keywords: string[];
  emoji: string;
  audioHint: string;
  mouthPosition: string;
}

// =============================================================================
// HELPERS
// =============================================================================

export function getGraphemeType(phoneme: string): GraphemeType {
  if (phoneme.length >= 3) return 'trigraph';
  if (phoneme.length === 2) return 'digraph';
  return 'single';
}

// =============================================================================
// COACH ENCOURAGEMENTS
// =============================================================================

export const COACH_ENCOURAGEMENTS = [
  "Great job! Let's try another word!",
  "You're doing amazing! Here's the next one!",
  "Wonderful! Ready for another word?",
  "Fantastic blending! Keep going!",
  "Super work! Here comes the next word!",
  "Brilliant! You're a blending star!",
  "Excellent! Let's keep practising!",
  "Well done! You're getting so good at this!",
];

// =============================================================================
// GRAPHEME DATA — Phase 2 + Phase 3 (digraphs)
// =============================================================================

export const GRAPHEME_DATA: Record<string, GraphemeData> = {
  // Phase 2 — Initial Letter Sounds
  s: { grapheme: 's', phoneme: '/s/', keywords: ['sun', 'snake', 'sock'], emoji: '🐍', audioHint: 'sssss like a snake', mouthPosition: 'teeth together' },
  a: { grapheme: 'a', phoneme: '/ae/', keywords: ['apple', 'ant', 'alligator'], emoji: '🍎', audioHint: 'a-a-a like biting an apple', mouthPosition: 'mouth open wide' },
  t: { grapheme: 't', phoneme: '/t/', keywords: ['tiger', 'tent', 'table'], emoji: '🐯', audioHint: 't-t-t tap your tongue', mouthPosition: 'tongue behind teeth' },
  p: { grapheme: 'p', phoneme: '/p/', keywords: ['pig', 'pen', 'panda'], emoji: '🐷', audioHint: 'p-p-p pop your lips', mouthPosition: 'lips together then pop' },
  i: { grapheme: 'i', phoneme: '/i/', keywords: ['igloo', 'insect', 'ink'], emoji: '🏠', audioHint: 'i-i-i it is sticky', mouthPosition: 'small smile' },
  n: { grapheme: 'n', phoneme: '/n/', keywords: ['nose', 'net', 'nut'], emoji: '👃', audioHint: 'nnnnn nose noise', mouthPosition: 'tongue on roof' },
  m: { grapheme: 'm', phoneme: '/m/', keywords: ['monkey', 'moon', 'mouse'], emoji: '🐵', audioHint: 'mmmm yummy food', mouthPosition: 'lips together' },
  d: { grapheme: 'd', phoneme: '/d/', keywords: ['dog', 'duck', 'door'], emoji: '🐕', audioHint: 'd-d-d like a drum', mouthPosition: 'tongue tap' },
  g: { grapheme: 'g', phoneme: '/g/', keywords: ['gorilla', 'gate', 'goat'], emoji: '🦍', audioHint: 'g-g-g gulping water', mouthPosition: 'back of throat' },
  o: { grapheme: 'o', phoneme: '/o/', keywords: ['orange', 'octopus', 'on'], emoji: '🍊', audioHint: 'o-o-o orange', mouthPosition: 'round mouth' },
  c: { grapheme: 'c', phoneme: '/k/', keywords: ['cat', 'cup', 'car'], emoji: '🐱', audioHint: 'c-c-c like a cat', mouthPosition: 'back of mouth' },
  k: { grapheme: 'k', phoneme: '/k/', keywords: ['kite', 'king', 'key'], emoji: '🪁', audioHint: 'k-k-k flying kite', mouthPosition: 'back of mouth' },
  ck: { grapheme: 'ck', phoneme: '/k/', keywords: ['duck', 'sock', 'clock'], emoji: '🦆', audioHint: 'ck at the end', mouthPosition: 'quick sound' },
  e: { grapheme: 'e', phoneme: '/e/', keywords: ['elephant', 'egg', 'elbow'], emoji: '🐘', audioHint: 'e-e-e elephant', mouthPosition: 'mouth slightly open' },
  u: { grapheme: 'u', phoneme: '/u/', keywords: ['umbrella', 'up', 'under'], emoji: '☂️', audioHint: 'u-u-u under umbrella', mouthPosition: 'lips rounded' },
  r: { grapheme: 'r', phoneme: '/r/', keywords: ['rabbit', 'rain', 'robot'], emoji: '🐰', audioHint: 'rrrrr like a robot', mouthPosition: 'tongue curled' },
  h: { grapheme: 'h', phoneme: '/h/', keywords: ['hat', 'house', 'horse'], emoji: '🎩', audioHint: 'h-h-h hot breath', mouthPosition: 'breathe out' },
  b: { grapheme: 'b', phoneme: '/b/', keywords: ['ball', 'bear', 'bee'], emoji: '🐻', audioHint: 'b-b-b bouncing ball', mouthPosition: 'lips together then release' },
  f: { grapheme: 'f', phoneme: '/f/', keywords: ['fish', 'fox', 'frog'], emoji: '🐟', audioHint: 'ffff like blowing', mouthPosition: 'teeth on lip' },
  l: { grapheme: 'l', phoneme: '/l/', keywords: ['ladder', 'leg', 'lion'], emoji: '🦁', audioHint: 'lllll tongue up', mouthPosition: 'tongue behind teeth tip up' },

  // Phase 3 — Remaining letters
  j: { grapheme: 'j', phoneme: '/dʒ/', keywords: ['jelly', 'jump', 'jet'], emoji: '🍬', audioHint: 'j-j-j like jumping', mouthPosition: 'lips pushed out' },
  v: { grapheme: 'v', phoneme: '/v/', keywords: ['van', 'vest', 'violin'], emoji: '🚐', audioHint: 'vvvv vibrating lips', mouthPosition: 'teeth on lip with voice' },
  w: { grapheme: 'w', phoneme: '/w/', keywords: ['water', 'worm', 'window'], emoji: '💧', audioHint: 'w-w-w like wind', mouthPosition: 'lips round then open' },
  x: { grapheme: 'x', phoneme: '/ks/', keywords: ['fox', 'box', 'six'], emoji: '📦', audioHint: 'ks at the end', mouthPosition: 'back then front' },
  y: { grapheme: 'y', phoneme: '/j/', keywords: ['yak', 'yawn', 'yellow'], emoji: '🟡', audioHint: 'y-y-y yes', mouthPosition: 'tongue up' },
  z: { grapheme: 'z', phoneme: '/z/', keywords: ['zebra', 'zip', 'zoo'], emoji: '🦓', audioHint: 'zzzzz like a bee', mouthPosition: 'teeth together with voice' },
  qu: { grapheme: 'qu', phoneme: '/kw/', keywords: ['queen', 'quick', 'quiz'], emoji: '👑', audioHint: 'qu queen says kw', mouthPosition: 'back then round' },

  // Phase 3 — Digraphs
  ch: { grapheme: 'ch', phoneme: '/tʃ/', keywords: ['cheese', 'chick', 'chair'], emoji: '🧀', audioHint: 'ch-ch-ch choo choo train', mouthPosition: 'lips pushed out' },
  sh: { grapheme: 'sh', phoneme: '/ʃ/', keywords: ['sheep', 'ship', 'shell'], emoji: '🐑', audioHint: 'shhhh be quiet', mouthPosition: 'finger on lips' },
  th: { grapheme: 'th', phoneme: '/θ/', keywords: ['thumb', 'three', 'think'], emoji: '👍', audioHint: 'th tongue out', mouthPosition: 'tongue between teeth' },
  ng: { grapheme: 'ng', phoneme: '/ŋ/', keywords: ['ring', 'king', 'sing'], emoji: '💍', audioHint: 'ng sing along', mouthPosition: 'back of throat' },

  // Phase 3 — Vowel digraphs
  ai: { grapheme: 'ai', phoneme: '/eɪ/', keywords: ['rain', 'train', 'snail'], emoji: '🌧️', audioHint: 'ai say your name', mouthPosition: 'mouth changes shape' },
  ee: { grapheme: 'ee', phoneme: '/iː/', keywords: ['tree', 'bee', 'see'], emoji: '🌳', audioHint: 'ee like a squeaky door', mouthPosition: 'big smile' },
  igh: { grapheme: 'igh', phoneme: '/aɪ/', keywords: ['light', 'night', 'high'], emoji: '💡', audioHint: 'igh fly high', mouthPosition: 'mouth opens then closes' },
  oa: { grapheme: 'oa', phoneme: '/əʊ/', keywords: ['boat', 'coat', 'goat'], emoji: '⛵', audioHint: 'oa oh no', mouthPosition: 'lips round then spread' },
  oo: { grapheme: 'oo', phoneme: '/uː/', keywords: ['moon', 'spoon', 'zoo'], emoji: '🌙', audioHint: 'oo moo like a cow', mouthPosition: 'small round mouth' },
  ar: { grapheme: 'ar', phoneme: '/ɑː/', keywords: ['car', 'star', 'park'], emoji: '⭐', audioHint: 'ar open wide like at the doctor', mouthPosition: 'mouth wide open' },
  or: { grapheme: 'or', phoneme: '/ɔː/', keywords: ['horse', 'fork', 'corn'], emoji: '🐴', audioHint: 'or like morning', mouthPosition: 'lips round' },
  ur: { grapheme: 'ur', phoneme: '/ɜː/', keywords: ['hurt', 'turn', 'nurse'], emoji: '🏥', audioHint: 'ur like a growling bear', mouthPosition: 'lips slightly rounded' },
  ow: { grapheme: 'ow', phoneme: '/aʊ/', keywords: ['cow', 'down', 'town'], emoji: '🐄', audioHint: 'ow that hurts', mouthPosition: 'mouth opens wide then rounds' },
  oi: { grapheme: 'oi', phoneme: '/ɔɪ/', keywords: ['coin', 'oil', 'soil'], emoji: '🪙', audioHint: 'oi like a noisy boy', mouthPosition: 'round then smile' },
  ear: { grapheme: 'ear', phoneme: '/ɪə/', keywords: ['ear', 'hear', 'near'], emoji: '👂', audioHint: 'ear listen carefully', mouthPosition: 'small smile then open' },
  air: { grapheme: 'air', phoneme: '/eə/', keywords: ['hair', 'chair', 'fair'], emoji: '💇', audioHint: 'air like the breeze', mouthPosition: 'mouth open then relaxed' },
  er: { grapheme: 'er', phoneme: '/ə/', keywords: ['butter', 'sister', 'letter'], emoji: '📝', audioHint: 'er like an unsure sound', mouthPosition: 'relaxed mouth' },
};

// =============================================================================
// BLENDING WORD DATASET — 60+ words across Phases 2-4
// =============================================================================

export const BLENDING_WORDS: BlendingWord[] = [
  // Phase 2 — CVC words (difficulty 1)
  { word: 'sat', phonemes: ['s', 'a', 't'], emoji: '🪑', phase: 2, difficulty: 1 },
  { word: 'pin', phonemes: ['p', 'i', 'n'], emoji: '📍', phase: 2, difficulty: 1 },
  { word: 'dog', phonemes: ['d', 'o', 'g'], emoji: '🐕', phase: 2, difficulty: 1 },
  { word: 'cat', phonemes: ['c', 'a', 't'], emoji: '🐱', phase: 2, difficulty: 1 },
  { word: 'sun', phonemes: ['s', 'u', 'n'], emoji: '☀️', phase: 2, difficulty: 1 },
  { word: 'map', phonemes: ['m', 'a', 'p'], emoji: '🗺️', phase: 2, difficulty: 1 },
  { word: 'hat', phonemes: ['h', 'a', 't'], emoji: '🎩', phase: 2, difficulty: 1 },
  { word: 'pen', phonemes: ['p', 'e', 'n'], emoji: '🖊️', phase: 2, difficulty: 1 },
  { word: 'bed', phonemes: ['b', 'e', 'd'], emoji: '🛏️', phase: 2, difficulty: 1 },
  { word: 'red', phonemes: ['r', 'e', 'd'], emoji: '🔴', phase: 2, difficulty: 1 },
  { word: 'pot', phonemes: ['p', 'o', 't'], emoji: '🍲', phase: 2, difficulty: 1 },
  { word: 'cup', phonemes: ['c', 'u', 'p'], emoji: '🥤', phase: 2, difficulty: 1 },
  { word: 'big', phonemes: ['b', 'i', 'g'], emoji: '🐘', phase: 2, difficulty: 1 },
  { word: 'run', phonemes: ['r', 'u', 'n'], emoji: '🏃', phase: 2, difficulty: 1 },
  { word: 'hop', phonemes: ['h', 'o', 'p'], emoji: '🐰', phase: 2, difficulty: 1 },
  { word: 'mud', phonemes: ['m', 'u', 'd'], emoji: '🟤', phase: 2, difficulty: 1 },
  { word: 'fig', phonemes: ['f', 'i', 'g'], emoji: '🫒', phase: 2, difficulty: 1 },
  { word: 'hug', phonemes: ['h', 'u', 'g'], emoji: '🤗', phase: 2, difficulty: 1 },
  { word: 'kid', phonemes: ['k', 'i', 'd'], emoji: '🧒', phase: 2, difficulty: 1 },
  { word: 'net', phonemes: ['n', 'e', 't'], emoji: '🥅', phase: 2, difficulty: 1 },
  { word: 'dip', phonemes: ['d', 'i', 'p'], emoji: '🫕', phase: 2, difficulty: 1 },
  { word: 'bun', phonemes: ['b', 'u', 'n'], emoji: '🍞', phase: 2, difficulty: 1 },
  { word: 'mop', phonemes: ['m', 'o', 'p'], emoji: '🧹', phase: 2, difficulty: 1 },
  { word: 'tug', phonemes: ['t', 'u', 'g'], emoji: '🚢', phase: 2, difficulty: 1 },
  { word: 'gap', phonemes: ['g', 'a', 'p'], emoji: '🕳️', phase: 2, difficulty: 1 },
  { word: 'nod', phonemes: ['n', 'o', 'd'], emoji: '😊', phase: 2, difficulty: 1 },
  { word: 'rib', phonemes: ['r', 'i', 'b'], emoji: '🦴', phase: 2, difficulty: 1 },
  { word: 'hum', phonemes: ['h', 'u', 'm'], emoji: '🎵', phase: 2, difficulty: 1 },
  { word: 'peg', phonemes: ['p', 'e', 'g'], emoji: '📎', phase: 2, difficulty: 1 },
  { word: 'dug', phonemes: ['d', 'u', 'g'], emoji: '⛏️', phase: 2, difficulty: 1 },

  // Phase 3 — Words with digraphs (difficulty 2)
  { word: 'ship', phonemes: ['sh', 'i', 'p'], emoji: '🚢', phase: 3, difficulty: 2 },
  { word: 'chat', phonemes: ['ch', 'a', 't'], emoji: '💬', phase: 3, difficulty: 2 },
  { word: 'thin', phonemes: ['th', 'i', 'n'], emoji: '📏', phase: 3, difficulty: 2 },
  { word: 'shop', phonemes: ['sh', 'o', 'p'], emoji: '🏪', phase: 3, difficulty: 2 },
  { word: 'chin', phonemes: ['ch', 'i', 'n'], emoji: '🧔', phase: 3, difficulty: 2 },
  { word: 'ring', phonemes: ['r', 'i', 'ng'], emoji: '💍', phase: 3, difficulty: 2 },
  { word: 'sing', phonemes: ['s', 'i', 'ng'], emoji: '🎤', phase: 3, difficulty: 2 },
  { word: 'rain', phonemes: ['r', 'ai', 'n'], emoji: '🌧️', phase: 3, difficulty: 2 },
  { word: 'tree', phonemes: ['t', 'r', 'ee'], emoji: '🌳', phase: 3, difficulty: 2 },
  { word: 'moon', phonemes: ['m', 'oo', 'n'], emoji: '🌙', phase: 3, difficulty: 2 },
  { word: 'boat', phonemes: ['b', 'oa', 't'], emoji: '⛵', phase: 3, difficulty: 2 },
  { word: 'coat', phonemes: ['c', 'oa', 't'], emoji: '🧥', phase: 3, difficulty: 2 },
  { word: 'goat', phonemes: ['g', 'oa', 't'], emoji: '🐐', phase: 3, difficulty: 2 },
  { word: 'feet', phonemes: ['f', 'ee', 't'], emoji: '🦶', phase: 3, difficulty: 2 },
  { word: 'jeep', phonemes: ['j', 'ee', 'p'], emoji: '🚙', phase: 3, difficulty: 2 },
  { word: 'zoom', phonemes: ['z', 'oo', 'm'], emoji: '🏎️', phase: 3, difficulty: 2 },
  { word: 'week', phonemes: ['w', 'ee', 'k'], emoji: '📅', phase: 3, difficulty: 2 },

  // Phase 4 — CVCC and CCVC words (difficulty 3)
  { word: 'best', phonemes: ['b', 'e', 's', 't'], emoji: '🏆', phase: 4, difficulty: 3 },
  { word: 'lamp', phonemes: ['l', 'a', 'm', 'p'], emoji: '💡', phase: 4, difficulty: 3 },
  { word: 'nest', phonemes: ['n', 'e', 's', 't'], emoji: '🪹', phase: 4, difficulty: 3 },
  { word: 'help', phonemes: ['h', 'e', 'l', 'p'], emoji: '🆘', phase: 4, difficulty: 3 },
  { word: 'tent', phonemes: ['t', 'e', 'n', 't'], emoji: '⛺', phase: 4, difficulty: 3 },
  { word: 'frog', phonemes: ['f', 'r', 'o', 'g'], emoji: '🐸', phase: 4, difficulty: 3 },
  { word: 'stop', phonemes: ['s', 't', 'o', 'p'], emoji: '🛑', phase: 4, difficulty: 3 },
  { word: 'clap', phonemes: ['c', 'l', 'a', 'p'], emoji: '👏', phase: 4, difficulty: 3 },
  { word: 'drum', phonemes: ['d', 'r', 'u', 'm'], emoji: '🥁', phase: 4, difficulty: 3 },
  { word: 'swim', phonemes: ['s', 'w', 'i', 'm'], emoji: '🏊', phase: 4, difficulty: 3 },
  { word: 'snap', phonemes: ['s', 'n', 'a', 'p'], emoji: '🫰', phase: 4, difficulty: 3 },
  { word: 'grin', phonemes: ['g', 'r', 'i', 'n'], emoji: '😁', phase: 4, difficulty: 3 },
  { word: 'flat', phonemes: ['f', 'l', 'a', 't'], emoji: '🏠', phase: 4, difficulty: 3 },
  { word: 'trip', phonemes: ['t', 'r', 'i', 'p'], emoji: '✈️', phase: 4, difficulty: 3 },
  { word: 'crab', phonemes: ['c', 'r', 'a', 'b'], emoji: '🦀', phase: 4, difficulty: 3 },
];

/** Get words for a specific phonics phase */
export function getWordsForPhase(phase: PhonicsWordPhase): BlendingWord[] {
  return BLENDING_WORDS.filter((w) => w.phase === phase);
}

/** Shuffle an array (Fisher-Yates) */
export function shuffleWords(words: BlendingWord[]): BlendingWord[] {
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
