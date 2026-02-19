// =============================================================================
// VOICE STUDIO — STATIC DATA
// =============================================================================
// Voice personas, SSP phonics phase config, and adjust presets.
// Sourced from packages/api/src/services/voice/narration-service.ts

export interface VoicePersona {
  id: string;
  name: string;
  voiceId: string;
  description: string;
  gender: 'female' | 'male';
  style: 'warm' | 'bright' | 'neutral' | 'calm' | 'energetic';
  language: string;
  ageGroups: string[];
  themes: string[];
  defaults: { pace: number; pitch: number; warmth: number };
  suitablePhases: number[];
  wcpmBand: [number, number];
  emphasisFactor: number;
}

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'vp-warm-storyteller',
    name: 'Warm Storyteller',
    voiceId: 'af_bella',
    description: 'Gentle, warm narrator for bedtime stories and early readers',
    gender: 'female',
    style: 'warm',
    language: 'en-us',
    ageGroups: ['3-5', '5-7'],
    themes: ['bedtime', 'family', 'nature', 'feelings'],
    defaults: { pace: 1.0, pitch: 0, warmth: 2.0 },
    suitablePhases: [1, 2],
    wcpmBand: [20, 50],
    emphasisFactor: 1.3,
  },
  {
    id: 'vp-wonder-guide',
    name: 'Wonder Guide',
    voiceId: 'am_adam',
    description: 'Clear, measured narrator for science and exploration stories',
    gender: 'male',
    style: 'neutral',
    language: 'en-us',
    ageGroups: ['5-7', '7-9'],
    themes: ['science', 'space', 'nature', 'discovery'],
    defaults: { pace: 1.0, pitch: 0, warmth: 0 },
    suitablePhases: [3, 4],
    wcpmBand: [50, 90],
    emphasisFactor: 1.2,
  },
  {
    id: 'vp-cheerful-chef',
    name: 'Cheerful Chef',
    voiceId: 'am_puck',
    description: 'Bright, playful narrator for cumulative tales and food stories',
    gender: 'male',
    style: 'bright',
    language: 'en-us',
    ageGroups: ['3-5', '5-7', '7-9'],
    themes: ['food', 'cooking', 'cumulative', 'rhyming'],
    defaults: { pace: 1.05, pitch: 0.5, warmth: 1.0 },
    suitablePhases: [2, 3, 4],
    wcpmBand: [40, 100],
    emphasisFactor: 1.25,
  },
  {
    id: 'vp-adventure-narrator',
    name: 'Adventure Narrator',
    voiceId: 'am_fenrir',
    description: 'Energetic, dramatic narrator for adventure and mystery',
    gender: 'male',
    style: 'energetic',
    language: 'en-us',
    ageGroups: ['5-7', '7-9'],
    themes: ['adventure', 'mystery', 'robots', 'pirates', 'dragons'],
    defaults: { pace: 1.1, pitch: 0, warmth: -1.0 },
    suitablePhases: [4, 5, 6],
    wcpmBand: [80, 140],
    emphasisFactor: 1.15,
  },
  {
    id: 'vp-aussie-mate',
    name: 'Aussie Mate',
    voiceId: 'bf_alice',
    description: 'Warm British English narrator for Australian-themed content',
    gender: 'female',
    style: 'warm',
    language: 'en-gb',
    ageGroups: ['3-5', '5-7', '7-9'],
    themes: ['australian-animals', 'outback', 'beach', 'bush'],
    defaults: { pace: 1.0, pitch: 0, warmth: 1.5 },
    suitablePhases: [2, 3, 4, 5],
    wcpmBand: [40, 110],
    emphasisFactor: 1.25,
  },
  {
    id: 'vp-calm-teacher',
    name: 'Calm Teacher',
    voiceId: 'af_sarah',
    description: 'Patient, clear narrator for phonics-heavy content',
    gender: 'female',
    style: 'neutral',
    language: 'en-us',
    ageGroups: ['3-5', '5-7'],
    themes: ['phonics', 'letters', 'sounds', 'learning'],
    defaults: { pace: 0.9, pitch: 0, warmth: 1.0 },
    suitablePhases: [1, 2, 3],
    wcpmBand: [15, 50],
    emphasisFactor: 1.4,
  },
];

// SSP Phonics Phase pace configuration
export const PACE_CONFIG: Record<number, { wpm: number; label: string }> = {
  1: { wpm: 60, label: 'Phase 1 \u2014 Listening & Speaking' },
  2: { wpm: 75, label: 'Phase 2 \u2014 Simple GPCs' },
  3: { wpm: 90, label: 'Phase 3 \u2014 Remaining GPCs' },
  4: { wpm: 110, label: 'Phase 4 \u2014 Adjacent Consonants' },
  5: { wpm: 130, label: 'Phase 5 \u2014 Alternative Spellings' },
  6: { wpm: 150, label: 'Phase 6 \u2014 Fluent Reading' },
};

export const KOKORO_NATURAL_WPM = 130;

export function phaseToMultiplier(phase: number): number {
  return (PACE_CONFIG[phase]?.wpm ?? KOKORO_NATURAL_WPM) / KOKORO_NATURAL_WPM;
}

// Adjust presets
export interface AdjustPreset {
  name: string;
  icon: string;
  pace: number;
  pitch: number;
  warmth: number;
  loudness: number;
  description: string;
}

export const ADJUST_PRESETS: AdjustPreset[] = [
  { name: 'Bedtime Mode', icon: 'Moon', pace: 0.8, pitch: -1, warmth: 3, loudness: -18, description: 'Slow, warm, and quiet' },
  { name: 'Phonics Drill', icon: 'BookOpen', pace: 0.7, pitch: 0, warmth: 1, loudness: -14, description: 'Clear and deliberate' },
  { name: 'Fluent Reader', icon: 'Zap', pace: 1.2, pitch: 0, warmth: 0, loudness: -16, description: 'Natural, flowing pace' },
  { name: 'Extra Cosy', icon: 'Heart', pace: 0.85, pitch: -0.5, warmth: 4, loudness: -20, description: 'Very warm and gentle' },
];

// Sample sentence for voice preview
export const PREVIEW_SENTENCE = 'The cat sat on the mat. She looked at the big ship sailing on the bright blue sea.';
