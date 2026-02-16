// ============================================================================
// SCHOLARLY PLATFORM — Sprint 20, Deliverable S20-002a
// Art Style Library + Character Consistency + Scene Decomposition
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ==========================================================================
// Section 1: Art Style Types & Library (30 styles)
// ==========================================================================

export interface ArtStyle {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly promptModifier: string;
  readonly suitableAgeGroups: string[];
  readonly mood: 'warm' | 'playful' | 'adventurous' | 'calm' | 'whimsical' | 'dramatic';
  readonly colourPalette: string;
  readonly suitableThemes: string[];
  readonly technicalNotes: string;
}

export const ART_STYLE_LIBRARY: ArtStyle[] = [
  // === WARM & SOFT (Ages 3-5) — 5 styles ===
  { id: 'watercolour-classic', name: 'Classic Watercolour',
    description: 'Soft flowing watercolour washes with gentle colour bleeding.',
    promptModifier: 'Soft watercolour painting style, gentle colour washes with visible paper texture, warm pastel palette, hand-painted feel, loose brushstrokes, children\'s picture book illustration.',
    suitableAgeGroups: ['3-4', '4-5', '5-6'], mood: 'warm',
    colourPalette: 'Dusty rose, sage green, soft gold, sky blue',
    suitableThemes: ['animals', 'family', 'garden', 'seasons', 'friendship'],
    technicalNotes: 'Request white/cream background bleeding through. Avoid hard edges.' },
  { id: 'crayon-scribble', name: 'Crayon Scribble',
    description: 'Bold childlike crayon strokes with visible waxy texture.',
    promptModifier: 'Thick crayon drawing style, bold waxy textures, bright primary colours, childlike charm, white paper showing through, children\'s book illustration.',
    suitableAgeGroups: ['3-4', '4-5'], mood: 'playful',
    colourPalette: 'Bold primary — red, blue, yellow, green',
    suitableThemes: ['animals', 'family', 'food', 'transport', 'bugs'],
    technicalNotes: 'Keep shapes simple and slightly imperfect.' },
  { id: 'soft-pastel', name: 'Soft Pastel Dream',
    description: 'Chalky pastel colours with dreamy soft-focus quality.',
    promptModifier: 'Soft pastel chalk illustration, dreamy and ethereal, gentle gradients, muted colours, rounded shapes, cosy atmosphere, children\'s storybook.',
    suitableAgeGroups: ['3-4', '4-5', '5-6'], mood: 'calm',
    colourPalette: 'Muted lavender, soft pink, powder blue, cream',
    suitableThemes: ['family', 'friendship', 'weather', 'seasons', 'camping'],
    technicalNotes: 'Low contrast, soft focus. Good for bedtime stories.' },
  { id: 'collage-cutout', name: 'Paper Collage',
    description: 'Torn paper collage inspired by Eric Carle.',
    promptModifier: 'Paper collage illustration, torn textured paper pieces, layered composition, hand-crafted look, bold shapes, visible paper edges, children\'s picture book.',
    suitableAgeGroups: ['3-4', '4-5', '5-6'], mood: 'playful',
    colourPalette: 'Rich saturated colours from painted tissue paper',
    suitableThemes: ['animals', 'bugs', 'garden', 'ocean', 'food'],
    technicalNotes: 'Each element should look like a separate piece of paper.' },
  { id: 'finger-paint', name: 'Finger Paint Fun',
    description: 'Thick bold finger paint strokes with tactile texture.',
    promptModifier: 'Finger paint illustration, thick bold paint strokes, bright colours, tactile texture, playful and energetic, children\'s art style.',
    suitableAgeGroups: ['3-4', '4-5'], mood: 'playful',
    colourPalette: 'Bright primary and secondary, thick and opaque',
    suitableThemes: ['animals', 'food', 'music', 'circus', 'sports'],
    technicalNotes: 'Very simple shapes. Maximum energy, minimum precision.' },

  // === VIBRANT & DETAILED (Ages 5-7) — 8 styles ===
  { id: 'flat-vector', name: 'Modern Flat Vector',
    description: 'Clean contemporary flat illustration with geometric shapes.',
    promptModifier: 'Modern flat vector illustration, clean geometric shapes, bold flat colours, minimal shadows, contemporary children\'s book style, crisp edges.',
    suitableAgeGroups: ['4-5', '5-6', '6-7'], mood: 'playful',
    colourPalette: 'Teal, coral, mustard, navy, mint',
    suitableThemes: ['robots', 'transport', 'space', 'sports', 'superheroes'],
    technicalNotes: 'Consistent colour palette. Avoid texture and grain.' },
  { id: 'papercraft-3d', name: 'Papercraft 3D',
    description: 'Layered cut paper dioramas with subtle drop shadows.',
    promptModifier: 'Paper craft diorama illustration, layered cut paper with drop shadows, 3D depth, clean edges, bright colours, handcrafted look, children\'s book.',
    suitableAgeGroups: ['5-6', '6-7'], mood: 'whimsical',
    colourPalette: 'Bright with white edges showing paper layers',
    suitableThemes: ['adventure', 'fairy-tales', 'ocean', 'space', 'garden'],
    technicalNotes: 'Emphasise layered depth. Each element a separate cutout.' },
  { id: 'storybook-classic', name: 'Classic Storybook',
    description: 'Traditional children\'s book illustration with detailed backgrounds.',
    promptModifier: 'Classic children\'s storybook illustration, detailed and expressive, warm lighting, rich palette, atmospheric depth, charming expressions, professional picture book quality.',
    suitableAgeGroups: ['5-6', '6-7', '7-8'], mood: 'warm',
    colourPalette: 'Forest green, burgundy, golden yellow, sky blue',
    suitableThemes: ['fairy-tales', 'adventure', 'animals', 'garden', 'friendship'],
    technicalNotes: 'High detail. Include environmental storytelling in backgrounds.' },
  { id: 'gouache-bold', name: 'Bold Gouache',
    description: 'Opaque gouache with bold shapes and saturated colours.',
    promptModifier: 'Bold gouache painting, opaque colours, strong shapes, saturated palette, graphic quality, confident brushstrokes, children\'s picture book.',
    suitableAgeGroups: ['5-6', '6-7', '7-8'], mood: 'adventurous',
    colourPalette: 'Deep blue, bright red, rich green, sunny yellow',
    suitableThemes: ['adventure', 'pirates', 'dinosaurs', 'superheroes', 'australian-outback'],
    technicalNotes: 'Bold and graphic. Good for action scenes.' },
  { id: 'digital-cute', name: 'Digital Kawaii',
    description: 'Round adorable characters with big eyes. Kawaii aesthetic.',
    promptModifier: 'Cute kawaii illustration, round adorable characters, big expressive eyes, clean lines, pastel background, cheerful, digital children\'s book.',
    suitableAgeGroups: ['4-5', '5-6', '6-7'], mood: 'playful',
    colourPalette: 'Soft pastels — pink, mint, lilac, peach',
    suitableThemes: ['food', 'animals', 'friendship', 'music', 'garden'],
    technicalNotes: 'Extremely rounded shapes. Everything should look huggable.' },
  { id: 'ink-watercolour', name: 'Ink & Watercolour',
    description: 'Black ink outlines filled with loose watercolour washes.',
    promptModifier: 'Black ink outline with loose watercolour washes, hand-drawn quality, expressive linework, translucent colour, children\'s book illustration.',
    suitableAgeGroups: ['5-6', '6-7', '7-8'], mood: 'whimsical',
    colourPalette: 'Limited 4-5 colours per spread, with ink black',
    suitableThemes: ['adventure', 'mystery', 'animals', 'australian-animals', 'pirates'],
    technicalNotes: 'Ink lines do heavy lifting. Watercolour should be loose.' },
  { id: 'woodblock-print', name: 'Woodblock Print',
    description: 'Bold graphic style with carved textures and strong contrast.',
    promptModifier: 'Woodblock print illustration, bold shapes, limited palette, strong outlines, flat colour, printmaking texture, children\'s book.',
    suitableAgeGroups: ['6-7', '7-8', '8-9'], mood: 'dramatic',
    colourPalette: '3-4 colours plus black — bold and graphic',
    suitableThemes: ['australian-animals', 'rainforest', 'ocean', 'seasons', 'camping'],
    technicalNotes: 'Limited colour. Strong light/dark contrast.' },
  { id: 'soft-3d', name: 'Soft 3D Render',
    description: 'Gentle 3D rendered characters with soft lighting. Pixar-like.',
    promptModifier: 'Soft 3D rendered illustration, rounded friendly characters, warm studio lighting, shallow depth of field, pastel palette, children\'s animation style.',
    suitableAgeGroups: ['4-5', '5-6', '6-7'], mood: 'warm',
    colourPalette: 'Warm, saturated — studio lighting',
    suitableThemes: ['robots', 'space', 'food', 'friendship', 'animals'],
    technicalNotes: 'Shallow DOF to focus attention. Warm rim lighting.' },

  // === DYNAMIC & EXPRESSIVE (Ages 7-9) — 7 styles ===
  { id: 'comic-panel', name: 'Comic Book',
    description: 'Dynamic comic style with action lines and dramatic angles.',
    promptModifier: 'Comic book illustration, dynamic angles, bold outlines, action lines, vibrant colours, expressive characters, energetic composition, children\'s comic.',
    suitableAgeGroups: ['6-7', '7-8', '8-9'], mood: 'adventurous',
    colourPalette: 'Vibrant and saturated — classic comic palette',
    suitableThemes: ['superheroes', 'adventure', 'robots', 'sports', 'mystery'],
    technicalNotes: 'Dynamic camera angles. Exaggerate perspective and motion.' },
  { id: 'mixed-media', name: 'Mixed Media Collage',
    description: 'Combines painted elements with textured backgrounds.',
    promptModifier: 'Mixed media collage, painted elements with textured backgrounds, layered, artistic and eclectic, children\'s book art with depth.',
    suitableAgeGroups: ['7-8', '8-9'], mood: 'whimsical',
    colourPalette: 'Eclectic — warm natural tones with bold accents',
    suitableThemes: ['music', 'circus', 'adventure', 'mystery', 'camping'],
    technicalNotes: 'Layer different media visibly.' },
  { id: 'ink-wash', name: 'Ink Wash (Sumi-e)',
    description: 'Atmospheric ink wash with minimal colour. Meditative.',
    promptModifier: 'Ink wash painting, atmospheric, sumi-e inspired, monochrome with selective colour accents, fluid strokes, zen simplicity, children\'s book.',
    suitableAgeGroups: ['7-8', '8-9'], mood: 'calm',
    colourPalette: 'Black/grey ink with 1-2 accent colours',
    suitableThemes: ['seasons', 'garden', 'ocean', 'animals', 'friendship'],
    technicalNotes: 'Less is more. Generous white space.' },
  { id: 'retro-midcentury', name: 'Retro Mid-Century',
    description: '1950s-60s illustration with screen-print texture.',
    promptModifier: 'Mid-century modern illustration, limited palette, geometric shapes, screen-print texture, retro vintage, children\'s book from the 1960s.',
    suitableAgeGroups: ['6-7', '7-8', '8-9'], mood: 'playful',
    colourPalette: 'Olive, orange, teal, burgundy, cream',
    suitableThemes: ['space', 'robots', 'transport', 'music', 'food'],
    technicalNotes: 'Limited to 4-5 colours. Include print texture.' },
  { id: 'pixel-art', name: 'Pixel Art',
    description: 'Chunky pixel art with retro video game aesthetic.',
    promptModifier: 'Pixel art illustration, chunky pixels, retro 16-bit style, limited palette, children\'s book pixel art.',
    suitableAgeGroups: ['6-7', '7-8', '8-9'], mood: 'playful',
    colourPalette: 'Limited retro palette — 16-32 colours',
    suitableThemes: ['robots', 'space', 'adventure', 'superheroes', 'mystery'],
    technicalNotes: 'Keep resolution low enough to see individual pixels.' },
  { id: 'botanical', name: 'Botanical Illustration',
    description: 'Detailed scientific illustration style. Beautiful and educational.',
    promptModifier: 'Botanical illustration, detailed scientific drawing, fine linework, natural colours, educational, children\'s book.',
    suitableAgeGroups: ['7-8', '8-9'], mood: 'calm',
    colourPalette: 'Natural greens, earth tones, delicate flower colours',
    suitableThemes: ['garden', 'rainforest', 'bugs', 'seasons', 'australian-animals'],
    technicalNotes: 'High detail on natural subjects.' },
  { id: 'silhouette', name: 'Shadow Silhouette',
    description: 'Black silhouettes against colourful backgrounds.',
    promptModifier: 'Silhouette illustration, black character silhouettes against colourful painted backgrounds, dramatic atmospheric lighting, children\'s shadow art.',
    suitableAgeGroups: ['5-6', '6-7', '7-8'], mood: 'dramatic',
    colourPalette: 'Black silhouettes against sunset, night, dawn colours',
    suitableThemes: ['adventure', 'fairy-tales', 'camping', 'mystery', 'pirates'],
    technicalNotes: 'Characters solid black silhouettes. All detail in backgrounds.' },

  // === AUSTRALIAN-SPECIFIC — 2 styles ===
  { id: 'bush-watercolour', name: 'Australian Bush Watercolour',
    description: 'Warm golden watercolours capturing Australian landscape.',
    promptModifier: 'Australian bush watercolour, warm golden light, eucalyptus greens, ochre earth tones, vast blue sky, gum trees and red earth, children\'s picture book.',
    suitableAgeGroups: ['4-5', '5-6', '6-7', '7-8'], mood: 'warm',
    colourPalette: 'Ochre, eucalyptus green, dusty blue, terracotta, golden',
    suitableThemes: ['australian-animals', 'australian-outback', 'camping', 'adventure'],
    technicalNotes: 'Capture Australian light — warm, golden, expansive.' },
  { id: 'dot-pattern-contemporary', name: 'Contemporary Dot Pattern',
    description: 'Modern illustration incorporating dot pattern elements.',
    promptModifier: 'Contemporary illustration with decorative dot pattern elements, earthy palette, modern children\'s book, dot patterns as background texture, Australian-themed.',
    suitableAgeGroups: ['5-6', '6-7', '7-8', '8-9'], mood: 'warm',
    colourPalette: 'Ochre, terracotta, deep brown, white dots on dark',
    suitableThemes: ['australian-animals', 'australian-outback', 'rainforest', 'seasons'],
    technicalNotes: 'Dot patterns as DECORATIVE only. Characters in contemporary style.' },

  // === TACTILE & CRAFT — 5 styles ===
  { id: 'felt-craft', name: 'Felt Craft',
    description: 'Coloured felt pieces with stitched edges, like a felt board.',
    promptModifier: 'Felt craft illustration, coloured felt on fabric background, stitched edges, tactile handmade quality, children\'s felt board style.',
    suitableAgeGroups: ['3-4', '4-5', '5-6'], mood: 'warm',
    colourPalette: 'Bright felt — red, blue, green, yellow on neutral',
    suitableThemes: ['animals', 'family', 'food', 'weather', 'friendship'],
    technicalNotes: 'Everything should look makeable from felt sheets.' },
  { id: 'embroidery', name: 'Embroidery Stitch',
    description: 'Visible stitches on fabric background. Handcrafted cosy feeling.',
    promptModifier: 'Embroidery illustration, visible stitches on fabric, cross-stitch and satin stitch, textile art, handcrafted, children\'s book.',
    suitableAgeGroups: ['5-6', '6-7', '7-8'], mood: 'warm',
    colourPalette: 'Rich thread colours on natural linen',
    suitableThemes: ['family', 'garden', 'animals', 'seasons', 'food'],
    technicalNotes: 'Visible individual stitches. Fabric weave background.' },
  { id: 'chalk-blackboard', name: 'Chalk on Blackboard',
    description: 'Chalk drawings on dark backgrounds. Cosy classroom feeling.',
    promptModifier: 'Chalk drawing on blackboard, white and coloured chalk, hand-drawn, smudged edges, classroom feeling, children\'s book.',
    suitableAgeGroups: ['5-6', '6-7', '7-8'], mood: 'calm',
    colourPalette: 'White, yellow, blue, pink chalk on dark board',
    suitableThemes: ['space', 'weather', 'music', 'friendship', 'mystery'],
    technicalNotes: 'Dark background is key. Chalk should look imperfect.' },
  { id: 'oil-pastel', name: 'Oil Pastel Rich',
    description: 'Rich buttery oil pastel with vibrant layered colours.',
    promptModifier: 'Oil pastel illustration, rich buttery colours, visible strokes, layered and blended, vibrant, children\'s picture book.',
    suitableAgeGroups: ['5-6', '6-7', '7-8'], mood: 'warm',
    colourPalette: 'Deep blues, warm reds, bright greens, sunny yellows',
    suitableThemes: ['animals', 'australian-outback', 'food', 'circus', 'garden'],
    technicalNotes: 'Thick visible strokes. Richly layered colours.' },
  { id: 'pencil-sketch', name: 'Pencil Sketch',
    description: 'Gentle pencil drawing with selective colour wash accents.',
    promptModifier: 'Pencil sketch illustration, soft graphite shading, delicate linework, white paper background, selective watercolour accent, children\'s book.',
    suitableAgeGroups: ['6-7', '7-8', '8-9'], mood: 'calm',
    colourPalette: 'Graphite grey with 1-2 watercolour accents',
    suitableThemes: ['mystery', 'friendship', 'animals', 'adventure', 'seasons'],
    technicalNotes: 'Mostly monochrome with colour accents. Delicate touch.' },
  { id: 'watercolour-animals', name: 'Naturalistic Animal Watercolour',
    description: 'Detailed, naturalistic animal watercolours with scientific accuracy.',
    promptModifier: 'Naturalistic animal watercolour, scientifically accurate proportions, soft background wash, detailed fur and feather rendering, field guide quality, children\'s book.',
    suitableAgeGroups: ['6-7', '7-8', '8-9'], mood: 'calm',
    colourPalette: 'Natural animal colours against soft green/blue washes',
    suitableThemes: ['animals', 'australian-animals', 'rainforest', 'ocean', 'bugs'],
    technicalNotes: 'Accurate animal anatomy. Soft background, detailed subject.' },
  { id: 'stained-glass', name: 'Stained Glass',
    description: 'Bold colour panels separated by dark outlines, like stained glass windows.',
    promptModifier: 'Stained glass illustration, bold colour panels with dark leading outlines, luminous saturated colours, geometric simplification, decorative, children\'s book.',
    suitableAgeGroups: ['6-7', '7-8', '8-9'], mood: 'dramatic',
    colourPalette: 'Jewel tones — ruby, sapphire, emerald, amber — with black outlines',
    suitableThemes: ['fairy-tales', 'adventure', 'seasons', 'ocean', 'space'],
    technicalNotes: 'Bold black outlines separating colour areas. Luminous quality.' },
  { id: 'lino-print', name: 'Linocut Print',
    description: 'Bold linocut style with carved textures and strong contrast.',
    promptModifier: 'Linocut print illustration, bold carved lines, strong contrast, limited colour, printmaking texture, children\'s book.',
    suitableAgeGroups: ['7-8', '8-9'], mood: 'dramatic',
    colourPalette: 'Strong black with 2-3 print colours',
    suitableThemes: ['australian-animals', 'ocean', 'rainforest', 'dinosaurs'],
    technicalNotes: 'Deliberately imperfect printing. Bold shapes.' },
];

// ==========================================================================
// Section 2: Art Style Selector
// ==========================================================================

export class ArtStyleSelector extends ScholarlyBaseService {
  constructor() { super('ArtStyleSelector'); }

  selectStyle(ageGroup: string, theme: string, mood?: string): ArtStyle {
    let candidates = ART_STYLE_LIBRARY.filter(s => s.suitableAgeGroups.includes(ageGroup));
    if (candidates.length === 0) candidates = ART_STYLE_LIBRARY;

    const themeMatches = candidates.filter(s => s.suitableThemes.includes(theme));
    if (themeMatches.length > 0) candidates = themeMatches;

    if (mood) {
      const moodMatches = candidates.filter(s => s.mood === mood);
      if (moodMatches.length > 0) candidates = moodMatches;
    }

    const selected = candidates[Math.floor(Math.random() * candidates.length)];
    this.log('info', 'Art style selected', { id: selected.id, name: selected.name, ageGroup, theme });
    return selected;
  }

  getStyleById(id: string): ArtStyle | undefined {
    return ART_STYLE_LIBRARY.find(s => s.id === id);
  }
}

// ==========================================================================
// Section 3: Character Consistency System
// ==========================================================================

export interface CharacterStyleSheet {
  readonly characterId: string;
  readonly name: string;
  readonly baseDescription: string;
  readonly referenceImageUrl?: string;
  readonly consistencyAnchors: Array<{ feature: string; description: string; importance: 'critical' | 'important' }>;
  readonly expressionVariants: Array<{ emotion: string; description: string }>;
  readonly poseLibrary: Array<{ action: string; description: string }>;
}

export class CharacterConsistencyService extends ScholarlyBaseService {
  private styleSheets = new Map<string, CharacterStyleSheet>();

  constructor() { super('CharacterConsistencyService'); }

  buildStyleSheet(character: { name: string; description: string; styleSheetPrompt: string; traits: string[] }): CharacterStyleSheet {
    const sheet: CharacterStyleSheet = {
      characterId: `char-${character.name.toLowerCase().replace(/\s+/g, '-')}`,
      name: character.name,
      baseDescription: character.styleSheetPrompt,
      consistencyAnchors: this.extractAnchors(character.description, character.styleSheetPrompt),
      expressionVariants: [
        { emotion: 'happy', description: `${character.name} smiling broadly with bright eyes` },
        { emotion: 'surprised', description: `${character.name} with wide eyes and open mouth` },
        { emotion: 'worried', description: `${character.name} with furrowed brows and slight frown` },
        { emotion: 'determined', description: `${character.name} with focused expression and set jaw` },
        { emotion: 'excited', description: `${character.name} bouncing with sparkling eyes and huge grin` },
        { emotion: 'thoughtful', description: `${character.name} with tilted head, pondering` },
        { emotion: 'sad', description: `${character.name} with downcast eyes and gentle frown` },
        { emotion: 'proud', description: `${character.name} standing tall with satisfied smile` },
      ],
      poseLibrary: [
        { action: 'standing', description: `${character.name} standing upright, slightly left of centre` },
        { action: 'running', description: `${character.name} mid-stride, arms pumping` },
        { action: 'sitting', description: `${character.name} sitting cross-legged on the ground` },
        { action: 'looking_up', description: `${character.name} tilting head back, looking up` },
        { action: 'pointing', description: `${character.name} extending one arm to point` },
        { action: 'hiding', description: `${character.name} peeking from behind an object` },
        { action: 'jumping', description: `${character.name} mid-jump, arms outstretched` },
        { action: 'sleeping', description: `${character.name} curled up peacefully, eyes closed` },
      ],
    };
    this.styleSheets.set(sheet.characterId, sheet);
    return sheet;
  }

  buildCharacterPrompt(characterId: string, emotion: string, action: string): string {
    const sheet = this.styleSheets.get(characterId);
    if (!sheet) return '';

    const anchors = sheet.consistencyAnchors.filter(a => a.importance === 'critical').map(a => a.description).join(', ');
    const expression = sheet.expressionVariants.find(e => e.emotion === emotion);
    const pose = sheet.poseLibrary.find(p => p.action === action);

    return [
      `CHARACTER: ${sheet.name} — ${sheet.baseDescription}`,
      `MUST MATCH: ${anchors}`,
      expression ? `EXPRESSION: ${expression.description}` : '',
      pose ? `POSE: ${pose.description}` : '',
    ].filter(Boolean).join('\n');
  }

  getStyleSheet(characterId: string): CharacterStyleSheet | undefined {
    return this.styleSheets.get(characterId);
  }

  private extractAnchors(description: string, stylePrompt: string): CharacterStyleSheet['consistencyAnchors'] {
    const combined = `${description} ${stylePrompt}`.toLowerCase();
    const anchors: CharacterStyleSheet['consistencyAnchors'] = [];

    const colourMatches = combined.matchAll(/\b(red|blue|green|brown|black|white|silver|golden|amber|pink|purple|dark|curly)\s+(fur|hair|eyes|skin|tail|hat|apron|uniform)\b/gi);
    for (const match of colourMatches) {
      anchors.push({ feature: 'colouring', description: match[0].trim(), importance: 'critical' });
    }

    const clothingMatch = combined.match(/wearing\s+([^,.]+)/i) || combined.match(/(hat|apron|uniform|dress|shirt|coat)/i);
    if (clothingMatch) {
      anchors.push({ feature: 'clothing', description: clothingMatch[0].trim(), importance: 'critical' });
    }

    if (anchors.length === 0) {
      anchors.push({ feature: 'general', description: stylePrompt, importance: 'critical' });
    }
    return anchors;
  }
}

// ==========================================================================
// Section 4: Scene Decomposition
// ==========================================================================

export interface SceneComposition {
  readonly background: { description: string; depth: number; parallaxMultiplier: number };
  readonly midground: { description: string; depth: number; parallaxMultiplier: number };
  readonly characters: CharacterPlacement[];
  readonly foreground: { description: string; depth: number; parallaxMultiplier: number };
  readonly textOverlayZone: { position: string; backgroundOpacity: number };
  readonly timeOfDay: string;
  readonly weather: string;
}

export interface CharacterPlacement {
  readonly characterId: string;
  readonly position: { x: number; y: number };
  readonly scale: number;
  readonly facing: 'left' | 'right' | 'camera';
  readonly emotion: string;
  readonly action: string;
}

export class SceneDecomposer extends ScholarlyBaseService {
  constructor() { super('SceneDecomposer'); }

  decompose(sceneDescription: string, pageNumber: number, totalPages: number): SceneComposition {
    const timeOfDay = this.inferTimeOfDay(sceneDescription);
    const weather = this.inferWeather(sceneDescription);
    const textPos = pageNumber % 2 === 0 ? 'bottom' : 'top';

    return {
      background: { description: this.extractBackground(sceneDescription), depth: 0, parallaxMultiplier: 0.3 },
      midground: { description: this.extractMidground(sceneDescription), depth: 0.5, parallaxMultiplier: 0.6 },
      characters: [], // Populated by the orchestrator with CharacterPlacement data
      foreground: { description: this.extractForeground(sceneDescription), depth: 1.0, parallaxMultiplier: 1.0 },
      textOverlayZone: { position: textPos, backgroundOpacity: 0.7 },
      timeOfDay, weather,
    };
  }

  private inferTimeOfDay(desc: string): string {
    const lower = desc.toLowerCase();
    if (/\b(dawn|sunrise|morning|breakfast)\b/.test(lower)) return 'morning';
    if (/\b(noon|midday|lunch)\b/.test(lower)) return 'midday';
    if (/\b(afternoon|evening)\b/.test(lower)) return 'afternoon';
    if (/\b(sunset|dusk|twilight)\b/.test(lower)) return 'evening';
    if (/\b(night|dark|moon|stars|bedtime)\b/.test(lower)) return 'night';
    return 'midday';
  }

  private inferWeather(desc: string): string {
    const lower = desc.toLowerCase();
    if (/\b(rain|rainy|storm|thunder)\b/.test(lower)) return 'rainy';
    if (/\b(snow|snowy|winter|frost)\b/.test(lower)) return 'snowy';
    if (/\b(wind|windy|breezy)\b/.test(lower)) return 'windy';
    if (/\b(cloud|cloudy|overcast)\b/.test(lower)) return 'cloudy';
    return 'clear';
  }

  private extractBackground(desc: string): string {
    const bgKeywords = /\b(sky|mountains|hills|forest|ocean|field|city|village|room|house|school)\b/gi;
    const matches = desc.match(bgKeywords);
    return matches ? `Background: ${matches.join(', ')} scene` : 'Background: natural setting';
  }

  private extractMidground(desc: string): string {
    const mgKeywords = /\b(tree|bush|rock|fence|path|river|bridge|building|desk|chair)\b/gi;
    const matches = desc.match(mgKeywords);
    return matches ? `Midground: ${matches.join(', ')}` : 'Midground: environmental elements';
  }

  private extractForeground(desc: string): string {
    const fgKeywords = /\b(grass|flowers|leaves|stones|puddle|footprints)\b/gi;
    const matches = desc.match(fgKeywords);
    return matches ? `Foreground: ${matches.join(', ')}` : 'Foreground: ground-level detail';
  }
}
