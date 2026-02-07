// =============================================================================
// SCHOLARLY PLATFORM — Illustration Generation Pipeline
// Sprint 3 | SB-003 | illustration-pipeline.ts
// =============================================================================
// Generates curriculum-aware storybook illustrations using GPT Image as the
// primary backend with Stable Diffusion 3.5 as a self-hosted fallback.
// Character style sheets ensure visual consistency across pages; scene
// decomposition enables parallax scrolling in the interactive reader.
// =============================================================================

import { EventEmitter } from 'events';

// ---------------------------------------------------------------------------
// Section 1: Type Definitions & Interfaces
// ---------------------------------------------------------------------------

/** Art styles optimised for children's book illustration, grouped by age band */
export enum ArtStyle {
  // Warm & soft — ages 3–5
  WATERCOLOUR_SOFT = 'watercolour_soft',
  CRAYON_PASTEL = 'crayon_pastel',
  PAPERCRAFT = 'papercraft',
  FELT_COLLAGE = 'felt_collage',
  SOFT_3D = 'soft_3d',
  GOUACHE_NURSERY = 'gouache_nursery',
  CHALK_PASTEL = 'chalk_pastel',
  FINGER_PAINT = 'finger_paint',
  FABRIC_TEXTURE = 'fabric_texture',
  ROUNDED_VECTOR = 'rounded_vector',

  // Vibrant & playful — ages 5–7
  FLAT_VECTOR = 'flat_vector',
  CARTOON_CLASSIC = 'cartoon_classic',
  STORYBOOK_CLASSIC = 'storybook_classic',
  COMIC_PANEL = 'comic_panel',
  POP_ART_KIDS = 'pop_art_kids',
  ANIME_CHIBI = 'anime_chibi',
  PIXEL_ART = 'pixel_art',
  WATERCOLOUR_VIVID = 'watercolour_vivid',
  BLOCK_PRINT = 'block_print',
  INK_WASH = 'ink_wash',

  // Detailed & adventurous — ages 7–9
  DIGITAL_PAINT = 'digital_paint',
  OIL_PAINT_STORYBOOK = 'oil_paint_storybook',
  GRAPHIC_NOVEL = 'graphic_novel',
  ISOMETRIC = 'isometric',
  BOTANICAL_ILLUSTRATION = 'botanical_illustration',
  FANTASY_WATERCOLOUR = 'fantasy_watercolour',
  RETRO_MIDCENTURY = 'retro_midcentury',
  LINOCUT = 'linocut',
  PENCIL_DETAILED = 'pencil_detailed',
  MIXED_MEDIA = 'mixed_media',

  // Custom / user-supplied
  CUSTOM = 'custom',
}

/** Maps age ranges to appropriate style pools */
export const AGE_STYLE_MAP: Record<string, ArtStyle[]> = {
  '3-5': [
    ArtStyle.WATERCOLOUR_SOFT, ArtStyle.CRAYON_PASTEL, ArtStyle.PAPERCRAFT,
    ArtStyle.FELT_COLLAGE, ArtStyle.SOFT_3D, ArtStyle.GOUACHE_NURSERY,
    ArtStyle.CHALK_PASTEL, ArtStyle.FINGER_PAINT, ArtStyle.FABRIC_TEXTURE,
    ArtStyle.ROUNDED_VECTOR,
  ],
  '5-7': [
    ArtStyle.FLAT_VECTOR, ArtStyle.CARTOON_CLASSIC, ArtStyle.STORYBOOK_CLASSIC,
    ArtStyle.COMIC_PANEL, ArtStyle.POP_ART_KIDS, ArtStyle.ANIME_CHIBI,
    ArtStyle.PIXEL_ART, ArtStyle.WATERCOLOUR_VIVID, ArtStyle.BLOCK_PRINT,
    ArtStyle.INK_WASH,
  ],
  '7-9': [
    ArtStyle.DIGITAL_PAINT, ArtStyle.OIL_PAINT_STORYBOOK, ArtStyle.GRAPHIC_NOVEL,
    ArtStyle.ISOMETRIC, ArtStyle.BOTANICAL_ILLUSTRATION, ArtStyle.FANTASY_WATERCOLOUR,
    ArtStyle.RETRO_MIDCENTURY, ArtStyle.LINOCUT, ArtStyle.PENCIL_DETAILED,
    ArtStyle.MIXED_MEDIA,
  ],
};

/** Style rendering descriptors — fed into image generation prompts */
export const STYLE_DESCRIPTORS: Record<ArtStyle, string> = {
  [ArtStyle.WATERCOLOUR_SOFT]: 'Soft watercolour illustration with gentle washes, muted pastel palette, organic edges that bleed softly, warm and comforting atmosphere suitable for very young children',
  [ArtStyle.CRAYON_PASTEL]: 'Crayon and pastel illustration with visible texture strokes, warm earthy colours, childlike charm with professional composition, rounded friendly shapes',
  [ArtStyle.PAPERCRAFT]: 'Paper cut-out collage style with layered paper textures, subtle shadows between layers, bright solid colours, tactile dimensional feel',
  [ArtStyle.FELT_COLLAGE]: 'Felt and fabric collage illustration with soft fuzzy textures, stitching details, warm muted colours, cosy handcrafted aesthetic',
  [ArtStyle.SOFT_3D]: 'Soft 3D rendered illustration with rounded forms, gentle ambient lighting, clay-like surfaces, warm colour palette, Pixar-inspired approachability',
  [ArtStyle.GOUACHE_NURSERY]: 'Gouache painting in nursery style with opaque flat colours, gentle brushstrokes visible, sweet whimsical compositions, muted warm palette',
  [ArtStyle.CHALK_PASTEL]: 'Chalk pastel illustration with powdery soft edges, dreamy blended colours, gentle luminous quality, suitable for bedtime stories',
  [ArtStyle.FINGER_PAINT]: 'Finger paint style with bold impasto textures, bright primary colours, joyful energetic marks, playful and approachable',
  [ArtStyle.FABRIC_TEXTURE]: 'Fabric and textile inspired illustration with woven patterns, quilt-like composition, warm earth tones, comforting handmade feel',
  [ArtStyle.ROUNDED_VECTOR]: 'Clean rounded vector illustration with soft gradients, friendly proportions, pastel colour scheme, modern children\'s app aesthetic',
  [ArtStyle.FLAT_VECTOR]: 'Clean flat vector illustration with bold colours, geometric shapes, strong outlines, modern children\'s book style with clear visual hierarchy',
  [ArtStyle.CARTOON_CLASSIC]: 'Classic cartoon illustration with expressive characters, dynamic poses, bright saturated colours, clean outlines, energetic composition',
  [ArtStyle.STORYBOOK_CLASSIC]: 'Traditional storybook illustration with rich detail, painterly technique, warm golden lighting, timeless fairy tale aesthetic',
  [ArtStyle.COMIC_PANEL]: 'Comic book panel style with bold ink outlines, halftone dots, speech bubbles, dynamic action poses, primary colour palette',
  [ArtStyle.POP_ART_KIDS]: 'Pop art inspired with bold outlines, bright contrasting colours, Ben-Day dots, playful exaggerated proportions, energetic composition',
  [ArtStyle.ANIME_CHIBI]: 'Chibi anime style with large expressive eyes, small bodies, cute proportions, pastel colours with bright accents, kawaii aesthetic',
  [ArtStyle.PIXEL_ART]: 'Pixel art style with chunky pixels, retro colour palette, 16-bit game aesthetic, charming blocky characters, nostalgic warmth',
  [ArtStyle.WATERCOLOUR_VIVID]: 'Vivid watercolour with bold saturated washes, dynamic colour blending, expressive brushwork, adventurous atmosphere',
  [ArtStyle.BLOCK_PRINT]: 'Block print style with bold carved lines, limited colour palette, strong graphic impact, folk art influence, textured paper background',
  [ArtStyle.INK_WASH]: 'East Asian ink wash painting style with flowing brushstrokes, subtle gradations, elegant simplicity, contemplative atmosphere',
  [ArtStyle.DIGITAL_PAINT]: 'Polished digital painting with detailed rendering, atmospheric lighting, cinematic composition, rich colour palette, epic adventure feel',
  [ArtStyle.OIL_PAINT_STORYBOOK]: 'Oil painting style storybook illustration with rich impasto texture, dramatic lighting, deep saturated colours, museum quality detail',
  [ArtStyle.GRAPHIC_NOVEL]: 'Graphic novel illustration with sophisticated linework, dramatic angles, atmospheric shading, mature visual storytelling, sequential art influence',
  [ArtStyle.ISOMETRIC]: 'Isometric illustration with precise geometric perspective, detailed miniature worlds, vibrant colours, video game inspired, explorable environments',
  [ArtStyle.BOTANICAL_ILLUSTRATION]: 'Botanical illustration style with scientific accuracy, delicate linework, natural colour palette, educational elegance, nature-focused detail',
  [ArtStyle.FANTASY_WATERCOLOUR]: 'Fantasy watercolour with magical luminous effects, rich jewel-tone palette, ethereal atmosphere, detailed enchanted worlds',
  [ArtStyle.RETRO_MIDCENTURY]: 'Mid-century modern illustration with limited palette, textured grain, geometric stylisation, vintage children\'s book charm, Charley Harper influence',
  [ArtStyle.LINOCUT]: 'Linocut print style with bold carved lines, high contrast, limited colours, folk art character, handcrafted woodblock aesthetic',
  [ArtStyle.PENCIL_DETAILED]: 'Detailed pencil illustration with fine crosshatching, subtle shading, intricate detail, elegant line quality, classic illustration mastery',
  [ArtStyle.MIXED_MEDIA]: 'Mixed media collage combining photography, painting, and digital elements, textured layered composition, experimental creative energy',
  [ArtStyle.CUSTOM]: '',
};

/** Character style sheet — the visual anchor for consistency across pages */
export interface CharacterStyleSheet {
  characterId: string;
  name: string;
  description: string;
  physicalTraits: {
    species: 'human' | 'animal' | 'fantasy' | 'robot' | 'other';
    bodyType: string;
    height: 'small' | 'medium' | 'tall';
    hairColour?: string;
    hairStyle?: string;
    eyeColour?: string;
    skinTone?: string;
    furColour?: string;
    distinguishingFeatures: string[];
  };
  clothing: {
    primaryOutfit: string;
    colours: string[];
    accessories: string[];
  };
  personality: {
    traits: string[];
    defaultExpression: string;
    posture: string;
  };
  referenceImageUrl?: string;
  referenceImageBase64?: string;
  consistencyPrompt: string; // Auto-generated or manually refined
}

/** Scene layer for parallax decomposition */
export interface SceneLayer {
  layerId: string;
  type: 'far_background' | 'mid_background' | 'foreground' | 'character' | 'overlay' | 'text_zone';
  description: string;
  depthOrder: number; // 0 = furthest back, higher = closer
  parallaxFactor: number; // 0.0 = no movement, 1.0 = full movement
  opacity: number; // 0.0–1.0
  position: {
    x: number; // percentage 0–100
    y: number; // percentage 0–100
    width: number; // percentage of canvas
    height: number; // percentage of canvas
  };
}

/** Scene composition — how a page's illustration is structured */
export interface SceneComposition {
  pageNumber: number;
  sceneDescription: string;
  mood: string;
  timeOfDay: 'dawn' | 'morning' | 'afternoon' | 'dusk' | 'night' | 'timeless';
  setting: string;
  layers: SceneLayer[];
  characterPlacements: Array<{
    characterId: string;
    expression: string;
    pose: string;
    position: { x: number; y: number; scale: number };
    layerId: string;
  }>;
  textZone: {
    position: 'top' | 'bottom' | 'left' | 'right' | 'overlay';
    backgroundTint: string; // e.g. 'rgba(255,255,255,0.7)'
    textColour: string;
  };
}

/** Illustration request — what the pipeline needs to generate one page */
export interface IllustrationRequest {
  storybookId: string;
  pageNumber: number;
  storyText: string;
  sceneComposition: SceneComposition;
  characters: CharacterStyleSheet[];
  artStyle: ArtStyle;
  customStyleDescriptor?: string; // Used when artStyle === CUSTOM
  aspectRatio: '4:3' | '16:9' | '3:4' | '1:1';
  resolution: 'standard' | 'high'; // standard = 1024x1024, high = 2048x2048
  culturalContext?: {
    setting: string;
    diversityTags: string[];
    avoidances: string[];
  };
  tenantId: string;
}

/** Illustration result — what comes back from generation */
export interface IllustrationResult {
  success: boolean;
  illustrationId: string;
  storybookId: string;
  pageNumber: number;
  imageUrl: string;
  thumbnailUrl: string;
  layers: Array<{
    layerId: string;
    imageUrl: string;
  }>;
  metadata: {
    model: string;
    artStyle: ArtStyle;
    promptUsed: string;
    generationTimeMs: number;
    costUsd: number;
    moderationResult: ModerationResult;
    seed?: number;
  };
  error?: string;
}

/** Moderation result for generated illustrations */
export interface ModerationResult {
  safe: boolean;
  categories: Record<string, { flagged: boolean; score: number }>;
  overallScore: number;
  reviewRequired: boolean;
  reason?: string;
}

/** Image generation provider interface — supports multiple backends */
export interface IImageGenerationProvider {
  readonly providerName: string;
  generateImage(prompt: string, options: ImageGenOptions): Promise<ImageGenResult>;
  estimateCost(options: ImageGenOptions): number;
  healthCheck(): Promise<boolean>;
}

export interface ImageGenOptions {
  size: string; // e.g. '1024x1024'
  quality: 'standard' | 'high';
  style?: 'natural' | 'vivid';
  responseFormat: 'url' | 'b64_json';
  referenceImages?: Array<{ base64: string; purpose: 'style' | 'character' | 'scene' }>;
  model?: string;
}

export interface ImageGenResult {
  imageUrl?: string;
  imageBase64?: string;
  revisedPrompt?: string;
  model: string;
  costUsd: number;
  seed?: number;
}

/** Pipeline configuration */
export interface IllustrationPipelineConfig {
  primaryProvider: 'gpt_image' | 'stable_diffusion';
  fallbackProvider?: 'gpt_image' | 'stable_diffusion';
  maxRetriesPerPage: number;
  moderationThreshold: number; // 0.0–1.0, below this = safe
  enableLayerDecomposition: boolean;
  maxConcurrentGenerations: number;
  costBudgetPerBook: number; // USD
  storageProvider: IStorageProvider;
  cacheProvider?: ICacheProvider;
  eventPublisher?: IEventPublisher;
  logger: ILogger;
}

// Minimal interfaces for dependencies — implemented by Sprint 1 services
export interface IStorageProvider {
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

export interface IEventPublisher {
  publish(subject: string, data: unknown): Promise<void>;
}

export interface ILogger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// Section 2: GPT Image Provider
// ---------------------------------------------------------------------------

/**
 * GPT Image provider — primary illustration backend.
 * Uses OpenAI's gpt-image-1 (or gpt-image-1.5 when available) for
 * high-quality children's book illustration generation.
 */
export class GPTImageProvider implements IImageGenerationProvider {
  readonly providerName = 'gpt_image';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly logger: ILogger;

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    defaultModel?: string;
    logger: ILogger;
  }) {
    if (!config.apiKey) {
      throw new Error('GPTImageProvider: API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.defaultModel = config.defaultModel ?? 'gpt-image-1';
    this.logger = config.logger;
  }

  async generateImage(prompt: string, options: ImageGenOptions): Promise<ImageGenResult> {
    const model = options.model ?? this.defaultModel;
    const startTime = Date.now();

    const requestBody: Record<string, unknown> = {
      model,
      prompt,
      size: options.size,
      quality: options.quality,
      n: 1,
      response_format: options.responseFormat,
    };

    // GPT Image supports reference images for style/character consistency
    if (options.referenceImages?.length) {
      requestBody.reference_images = options.referenceImages.map(ref => ({
        type: 'base64',
        base64: ref.base64,
        purpose: ref.purpose,
      }));
    }

    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`GPT Image API error ${response.status}: ${errorBody}`);
      }

      const data = await response.json() as {
        data: Array<{ url?: string; b64_json?: string; revised_prompt?: string }>;
      };

      const result = data.data[0];
      const durationMs = Date.now() - startTime;
      const costUsd = this.estimateCost(options);

      this.logger.info('GPT Image generation complete', {
        model,
        size: options.size,
        quality: options.quality,
        durationMs,
        costUsd,
      });

      return {
        imageUrl: result.url,
        imageBase64: result.b64_json,
        revisedPrompt: result.revised_prompt,
        model,
        costUsd,
      };
    } catch (error) {
      this.logger.error('GPT Image generation failed', {
        model,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  estimateCost(options: ImageGenOptions): number {
    // GPT Image pricing (as of early 2026):
    // gpt-image-1: standard 1024x1024 = $0.04, high = $0.08
    // gpt-image-1: standard 1792x1024 = $0.08, high = $0.12
    const sizeMap: Record<string, Record<string, number>> = {
      '1024x1024': { standard: 0.04, high: 0.08 },
      '1024x1792': { standard: 0.08, high: 0.12 },
      '1792x1024': { standard: 0.08, high: 0.12 },
      '2048x2048': { standard: 0.12, high: 0.16 },
    };
    const sizeKey = options.size in sizeMap ? options.size : '1024x1024';
    return sizeMap[sizeKey][options.quality] ?? 0.08;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        headers: { 'Authorization': `Bearer ${this.apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Section 3: Stable Diffusion Provider (self-hosted fallback)
// ---------------------------------------------------------------------------

/**
 * Stable Diffusion 3.5 provider — self-hosted fallback for cost control
 * at scale. Assumes a running ComfyUI or A1111 API endpoint.
 */
export class StableDiffusionProvider implements IImageGenerationProvider {
  readonly providerName = 'stable_diffusion';
  private readonly apiUrl: string;
  private readonly logger: ILogger;
  private readonly costPerImage: number;

  constructor(config: {
    apiUrl: string;
    logger: ILogger;
    costPerImage?: number; // Compute cost estimate
  }) {
    if (!config.apiUrl) {
      throw new Error('StableDiffusionProvider: API URL is required');
    }
    this.apiUrl = config.apiUrl;
    this.logger = config.logger;
    this.costPerImage = config.costPerImage ?? 0.005; // ~$0.005 on GPU cloud
  }

  async generateImage(prompt: string, options: ImageGenOptions): Promise<ImageGenResult> {
    const startTime = Date.now();

    const [width, height] = options.size.split('x').map(Number);
    const requestBody = {
      prompt,
      negative_prompt: 'blurry, low quality, deformed, scary, violent, nsfw, text, watermark, signature, ugly, distorted face, extra limbs, bad anatomy',
      width,
      height,
      steps: options.quality === 'high' ? 30 : 20,
      cfg_scale: 7.5,
      sampler_name: 'DPM++ 2M Karras',
      seed: -1, // Random seed
    };

    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/txt2img`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Stable Diffusion API error ${response.status}`);
      }

      const data = await response.json() as {
        images: string[];
        parameters: { seed: number };
      };

      const durationMs = Date.now() - startTime;

      this.logger.info('Stable Diffusion generation complete', {
        size: options.size,
        steps: requestBody.steps,
        durationMs,
      });

      return {
        imageBase64: data.images[0],
        model: 'stable-diffusion-3.5',
        costUsd: this.costPerImage,
        seed: data.parameters.seed,
      };
    } catch (error) {
      this.logger.error('Stable Diffusion generation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  estimateCost(_options: ImageGenOptions): number {
    return this.costPerImage;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl}/sdapi/v1/sd-models`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// ---------------------------------------------------------------------------
// Section 4: Character Consistency Engine
// ---------------------------------------------------------------------------

/**
 * Ensures visual consistency of characters across all pages of a storybook.
 * Builds detailed consistency prompts from style sheets and manages
 * reference image selection for image generation APIs that support it.
 */
export class CharacterConsistencyEngine {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Generates a detailed text prompt fragment that describes a character
   * consistently, derived from their style sheet. This is appended to
   * every page's illustration prompt to anchor the visual identity.
   */
  buildConsistencyPrompt(character: CharacterStyleSheet): string {
    const parts: string[] = [];

    // Physical description
    const { physicalTraits } = character;
    parts.push(`Character "${character.name}": ${physicalTraits.species}`);

    if (physicalTraits.species === 'human') {
      const humanParts: string[] = [];
      if (physicalTraits.skinTone) humanParts.push(`${physicalTraits.skinTone} skin`);
      if (physicalTraits.hairColour && physicalTraits.hairStyle) {
        humanParts.push(`${physicalTraits.hairColour} ${physicalTraits.hairStyle} hair`);
      }
      if (physicalTraits.eyeColour) humanParts.push(`${physicalTraits.eyeColour} eyes`);
      humanParts.push(`${physicalTraits.height} ${physicalTraits.bodyType} build`);
      parts.push(humanParts.join(', '));
    } else if (physicalTraits.species === 'animal') {
      const animalParts: string[] = [];
      if (physicalTraits.furColour) animalParts.push(`${physicalTraits.furColour} fur/feathers`);
      animalParts.push(`${physicalTraits.height} ${physicalTraits.bodyType}`);
      parts.push(animalParts.join(', '));
    }

    // Distinguishing features
    if (physicalTraits.distinguishingFeatures.length > 0) {
      parts.push(`Distinguishing features: ${physicalTraits.distinguishingFeatures.join(', ')}`);
    }

    // Clothing
    const { clothing } = character;
    parts.push(`Wearing: ${clothing.primaryOutfit} in ${clothing.colours.join(' and ')}`);
    if (clothing.accessories.length > 0) {
      parts.push(`Accessories: ${clothing.accessories.join(', ')}`);
    }

    // Personality expression
    const { personality } = character;
    parts.push(`Default expression: ${personality.defaultExpression}, posture: ${personality.posture}`);

    return parts.join('. ') + '.';
  }

  /**
   * Builds a multi-character consistency block for scenes with
   * multiple characters, ensuring each is distinctly described.
   */
  buildMultiCharacterPrompt(
    characters: CharacterStyleSheet[],
    placements: SceneComposition['characterPlacements']
  ): string {
    const fragments: string[] = [];

    for (const placement of placements) {
      const character = characters.find(c => c.characterId === placement.characterId);
      if (!character) {
        this.logger.warn('Character not found in style sheets', {
          characterId: placement.characterId,
        });
        continue;
      }

      const basePrompt = character.consistencyPrompt || this.buildConsistencyPrompt(character);
      const sceneOverride = `${character.name} is ${placement.pose}, expression: ${placement.expression}`;
      fragments.push(`[${basePrompt} In this scene: ${sceneOverride}]`);
    }

    return fragments.join(' ');
  }

  /**
   * Selects reference images for providers that support image-guided
   * generation (e.g., GPT Image with reference_images parameter).
   */
  selectReferenceImages(
    characters: CharacterStyleSheet[],
    placements: SceneComposition['characterPlacements']
  ): Array<{ base64: string; purpose: 'character' | 'style' }> {
    const refs: Array<{ base64: string; purpose: 'character' | 'style' }> = [];

    for (const placement of placements) {
      const character = characters.find(c => c.characterId === placement.characterId);
      if (character?.referenceImageBase64) {
        refs.push({
          base64: character.referenceImageBase64,
          purpose: 'character',
        });
      }
    }

    // Limit to 4 reference images (API constraint)
    return refs.slice(0, 4);
  }
}

// ---------------------------------------------------------------------------
// Section 5: Scene Decomposition Engine
// ---------------------------------------------------------------------------

/**
 * Decomposes a page's scene into layers suitable for parallax scrolling
 * in the interactive reader. Think of it like a theatrical stage set:
 * a painted backdrop, mid-ground scenery on wheeled flats, and actors
 * in the foreground — each moving at different speeds as the reader
 * scrolls, creating depth.
 */
export class SceneDecompositionEngine {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Generates layer decomposition prompts. Instead of generating one
   * flat illustration, we generate multiple layers that the reader
   * composites with depth-based parallax.
   *
   * For providers that don't support layer-aware generation, we fall
   * back to a single flat image with the scene composition used only
   * for text zone placement.
   */
  buildLayerPrompts(
    scene: SceneComposition,
    baseStylePrompt: string,
    characterPrompt: string
  ): Array<{ layerId: string; prompt: string; priority: number }> {
    const layerPrompts: Array<{ layerId: string; prompt: string; priority: number }> = [];

    // Sort layers by depth order (furthest first)
    const sortedLayers = [...scene.layers].sort((a, b) => a.depthOrder - b.depthOrder);

    for (const layer of sortedLayers) {
      let prompt: string;

      switch (layer.type) {
        case 'far_background':
          prompt = `${baseStylePrompt}. Background scene: ${layer.description}. ` +
            `Time of day: ${scene.timeOfDay}. Mood: ${scene.mood}. ` +
            `Setting: ${scene.setting}. No characters, no text. Atmospheric, painterly.`;
          break;

        case 'mid_background':
          prompt = `${baseStylePrompt}. Mid-ground scene element: ${layer.description}. ` +
            `Consistent with ${scene.setting} at ${scene.timeOfDay}. ` +
            `No characters, no text. Transparent/alpha background.`;
          break;

        case 'foreground':
          prompt = `${baseStylePrompt}. Foreground element: ${layer.description}. ` +
            `Transparent background, element only. ` +
            `Consistent with ${scene.setting}.`;
          break;

        case 'character':
          prompt = `${baseStylePrompt}. ${characterPrompt}. ` +
            `Transparent background, character(s) only. ` +
            `Scene context: ${scene.sceneDescription}.`;
          break;

        case 'overlay':
          prompt = `${baseStylePrompt}. Decorative overlay: ${layer.description}. ` +
            `Semi-transparent, decorative frame or border element.`;
          break;

        case 'text_zone':
          // Text zones don't need illustration generation
          continue;

        default:
          this.logger.warn('Unknown layer type', { type: layer.type, layerId: layer.layerId });
          continue;
      }

      layerPrompts.push({
        layerId: layer.layerId,
        prompt,
        priority: layer.type === 'character' ? 0 : layer.depthOrder + 1,
      });
    }

    // Sort by priority (characters first, then depth order)
    layerPrompts.sort((a, b) => a.priority - b.priority);

    return layerPrompts;
  }

  /**
   * For flat (non-decomposed) generation, builds a single composite
   * prompt that includes all scene elements and text zone awareness.
   */
  buildFlatPrompt(
    scene: SceneComposition,
    baseStylePrompt: string,
    characterPrompt: string
  ): string {
    const textZoneInstruction = this.getTextZoneInstruction(scene.textZone);

    return [
      baseStylePrompt,
      `Scene: ${scene.sceneDescription}`,
      `Setting: ${scene.setting}, ${scene.timeOfDay}`,
      `Mood: ${scene.mood}`,
      characterPrompt,
      textZoneInstruction,
      'No text, letters, words, or writing in the illustration.',
      'Children\'s book illustration, safe for young children.',
    ].filter(Boolean).join('. ');
  }

  private getTextZoneInstruction(textZone: SceneComposition['textZone']): string {
    const positionMap: Record<string, string> = {
      top: 'Leave clear space at the top 25% of the image for text overlay',
      bottom: 'Leave clear space at the bottom 25% of the image for text overlay',
      left: 'Leave clear space on the left 30% of the image for text overlay',
      right: 'Leave clear space on the right 30% of the image for text overlay',
      overlay: 'Ensure the central area has enough contrast for overlaid text',
    };
    return positionMap[textZone.position] ?? '';
  }
}

// ---------------------------------------------------------------------------
// Section 6: Content Moderation for Illustrations
// ---------------------------------------------------------------------------

/**
 * Validates generated illustrations for age-appropriateness.
 * Uses OpenAI's moderation endpoint as primary, with configurable
 * thresholds stricter than the defaults for children's content.
 */
export class IllustrationModerator {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly threshold: number;
  private readonly logger: ILogger;

  // Children's content thresholds — significantly stricter than defaults
  private readonly CATEGORY_THRESHOLDS: Record<string, number> = {
    'sexual': 0.01,
    'sexual/minors': 0.001,
    'violence': 0.05,
    'violence/graphic': 0.01,
    'hate': 0.02,
    'hate/threatening': 0.01,
    'self-harm': 0.01,
    'harassment': 0.03,
    'harassment/threatening': 0.01,
  };

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    threshold?: number;
    logger: ILogger;
  }) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
    this.threshold = config.threshold ?? 0.05;
    this.logger = config.logger;
  }

  async moderateImage(imageBase64: string): Promise<ModerationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/moderations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'omni-moderation-latest',
          input: [{ type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }],
        }),
      });

      if (!response.ok) {
        throw new Error(`Moderation API error: ${response.status}`);
      }

      const data = await response.json() as {
        results: Array<{
          flagged: boolean;
          categories: Record<string, boolean>;
          category_scores: Record<string, number>;
        }>;
      };

      const result = data.results[0];
      const categories: ModerationResult['categories'] = {};
      let maxScore = 0;
      let reviewRequired = false;
      let flagReason: string | undefined;

      for (const [category, score] of Object.entries(result.category_scores)) {
        const threshold = this.CATEGORY_THRESHOLDS[category] ?? this.threshold;
        const flagged = score > threshold;

        categories[category] = { flagged, score };

        if (score > maxScore) maxScore = score;
        if (flagged) {
          reviewRequired = true;
          flagReason = flagReason
            ? `${flagReason}, ${category}`
            : `Flagged: ${category}`;
        }
      }

      const safe = !reviewRequired;

      this.logger.info('Illustration moderation complete', {
        safe,
        maxScore: maxScore.toFixed(4),
        reviewRequired,
      });

      return {
        safe,
        categories,
        overallScore: maxScore,
        reviewRequired,
        reason: flagReason,
      };
    } catch (error) {
      this.logger.error('Illustration moderation failed', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Fail closed — if moderation fails, require manual review
      return {
        safe: false,
        categories: {},
        overallScore: 1.0,
        reviewRequired: true,
        reason: 'Moderation service unavailable — manual review required',
      };
    }
  }

  async moderatePrompt(prompt: string): Promise<ModerationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/moderations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: 'omni-moderation-latest',
          input: prompt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Moderation API error: ${response.status}`);
      }

      const data = await response.json() as {
        results: Array<{
          flagged: boolean;
          category_scores: Record<string, number>;
        }>;
      };

      const result = data.results[0];
      const categories: ModerationResult['categories'] = {};
      let maxScore = 0;
      let flagged = false;

      for (const [category, score] of Object.entries(result.category_scores)) {
        const threshold = this.CATEGORY_THRESHOLDS[category] ?? this.threshold;
        const isFlagged = score > threshold;
        categories[category] = { flagged: isFlagged, score };
        if (score > maxScore) maxScore = score;
        if (isFlagged) flagged = true;
      }

      return {
        safe: !flagged,
        categories,
        overallScore: maxScore,
        reviewRequired: flagged,
        reason: flagged ? 'Prompt contains potentially inappropriate content' : undefined,
      };
    } catch (error) {
      this.logger.error('Prompt moderation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        safe: false,
        categories: {},
        overallScore: 1.0,
        reviewRequired: true,
        reason: 'Moderation service unavailable',
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Section 7: Illustration Pipeline Orchestrator
// ---------------------------------------------------------------------------

/**
 * The main orchestrator that ties everything together. Think of it as
 * the art director on a film set: it takes the script (narrative), consults
 * the character designs (style sheets), plans each shot (scene composition),
 * directs the camera operators (image generation providers), reviews the
 * dailies (moderation), and delivers the final frames (illustration results).
 */
export class IllustrationPipeline extends EventEmitter {
  private readonly primaryProvider: IImageGenerationProvider;
  private readonly fallbackProvider?: IImageGenerationProvider;
  private readonly characterEngine: CharacterConsistencyEngine;
  private readonly sceneEngine: SceneDecompositionEngine;
  private readonly moderator: IllustrationModerator;
  private readonly config: IllustrationPipelineConfig;
  private readonly logger: ILogger;

  // Cost tracking per book
  private bookCosts: Map<string, number> = new Map();

  constructor(
    config: IllustrationPipelineConfig,
    providers: {
      gptImage?: GPTImageProvider;
      stableDiffusion?: StableDiffusionProvider;
    },
    moderator: IllustrationModerator
  ) {
    super();
    this.config = config;
    this.logger = config.logger;
    this.moderator = moderator;

    // Wire up providers based on config
    if (config.primaryProvider === 'gpt_image') {
      if (!providers.gptImage) throw new Error('GPT Image provider required but not supplied');
      this.primaryProvider = providers.gptImage;
      this.fallbackProvider = providers.stableDiffusion;
    } else {
      if (!providers.stableDiffusion) throw new Error('Stable Diffusion provider required but not supplied');
      this.primaryProvider = providers.stableDiffusion;
      this.fallbackProvider = providers.gptImage;
    }

    this.characterEngine = new CharacterConsistencyEngine(config.logger);
    this.sceneEngine = new SceneDecompositionEngine(config.logger);
  }

  /**
   * Generate illustrations for an entire storybook.
   * Processes pages with controlled concurrency to balance speed with
   * API rate limits and cost budgets.
   */
  async illustrateBook(
    storybookId: string,
    pages: Array<{
      pageNumber: number;
      text: string;
      scene: SceneComposition;
    }>,
    characters: CharacterStyleSheet[],
    artStyle: ArtStyle,
    options: {
      aspectRatio?: IllustrationRequest['aspectRatio'];
      resolution?: IllustrationRequest['resolution'];
      culturalContext?: IllustrationRequest['culturalContext'];
      tenantId: string;
      customStyleDescriptor?: string;
    }
  ): Promise<IllustrationResult[]> {
    this.bookCosts.set(storybookId, 0);
    const results: IllustrationResult[] = [];

    this.logger.info('Starting book illustration', {
      storybookId,
      pageCount: pages.length,
      artStyle,
      provider: this.primaryProvider.providerName,
    });

    this.emit('book:start', { storybookId, pageCount: pages.length });

    // Process pages in batches to respect concurrency limits
    const batchSize = this.config.maxConcurrentGenerations;
    for (let i = 0; i < pages.length; i += batchSize) {
      const batch = pages.slice(i, i + batchSize);

      // Check cost budget before each batch
      const currentCost = this.bookCosts.get(storybookId) ?? 0;
      if (currentCost >= this.config.costBudgetPerBook) {
        this.logger.warn('Cost budget exceeded for book', {
          storybookId,
          currentCost,
          budget: this.config.costBudgetPerBook,
        });
        this.emit('book:budget_exceeded', { storybookId, currentCost });
        break;
      }

      const batchResults = await Promise.allSettled(
        batch.map(page => this.illustratePage({
          storybookId,
          pageNumber: page.pageNumber,
          storyText: page.text,
          sceneComposition: page.scene,
          characters,
          artStyle,
          customStyleDescriptor: options.customStyleDescriptor,
          aspectRatio: options.aspectRatio ?? '4:3',
          resolution: options.resolution ?? 'standard',
          culturalContext: options.culturalContext,
          tenantId: options.tenantId,
        }))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          this.logger.error('Page illustration failed', {
            storybookId,
            error: result.reason instanceof Error ? result.reason.message : String(result.reason),
          });
          results.push({
            success: false,
            illustrationId: '',
            storybookId,
            pageNumber: -1,
            imageUrl: '',
            thumbnailUrl: '',
            layers: [],
            metadata: {
              model: '',
              artStyle,
              promptUsed: '',
              generationTimeMs: 0,
              costUsd: 0,
              moderationResult: {
                safe: false,
                categories: {},
                overallScore: 1,
                reviewRequired: true,
                reason: result.reason instanceof Error ? result.reason.message : 'Unknown error',
              },
            },
            error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
          });
        }
      }

      this.emit('book:batch_complete', {
        storybookId,
        batchIndex: Math.floor(i / batchSize),
        totalBatches: Math.ceil(pages.length / batchSize),
        completedPages: results.filter(r => r.success).length,
      });
    }

    const totalCost = this.bookCosts.get(storybookId) ?? 0;
    this.logger.info('Book illustration complete', {
      storybookId,
      totalPages: pages.length,
      successfulPages: results.filter(r => r.success).length,
      totalCost: totalCost.toFixed(4),
    });

    this.emit('book:complete', {
      storybookId,
      results,
      totalCost,
    });

    // Publish event for analytics
    if (this.config.eventPublisher) {
      await this.config.eventPublisher.publish('storybook.illustrated', {
        storybookId,
        pageCount: pages.length,
        successCount: results.filter(r => r.success).length,
        totalCost,
        artStyle,
        provider: this.primaryProvider.providerName,
      });
    }

    return results;
  }

  /**
   * Generate illustration for a single page. Handles prompt construction,
   * moderation, generation, retry with fallback, and storage.
   */
  async illustratePage(request: IllustrationRequest): Promise<IllustrationResult> {
    const startTime = Date.now();
    const illustrationId = this.generateId();

    this.logger.debug('Illustrating page', {
      storybookId: request.storybookId,
      pageNumber: request.pageNumber,
    });

    // Step 1: Build the style descriptor
    const styleDescriptor = request.artStyle === ArtStyle.CUSTOM
      ? (request.customStyleDescriptor ?? '')
      : STYLE_DESCRIPTORS[request.artStyle];

    // Step 2: Build character consistency prompt
    const characterPrompt = this.characterEngine.buildMultiCharacterPrompt(
      request.characters,
      request.sceneComposition.characterPlacements
    );

    // Step 3: Build illustration prompt (flat or layered)
    let prompt: string;
    if (this.config.enableLayerDecomposition && request.sceneComposition.layers.length > 1) {
      // For now, generate flat composite — layer decomposition is a future enhancement
      // that requires the reader component to composite layers
      prompt = this.sceneEngine.buildFlatPrompt(
        request.sceneComposition,
        styleDescriptor,
        characterPrompt
      );
    } else {
      prompt = this.sceneEngine.buildFlatPrompt(
        request.sceneComposition,
        styleDescriptor,
        characterPrompt
      );
    }

    // Step 4: Moderate the prompt before sending to image generation
    const promptModeration = await this.moderator.moderatePrompt(prompt);
    if (!promptModeration.safe) {
      this.logger.warn('Illustration prompt flagged by moderation', {
        storybookId: request.storybookId,
        pageNumber: request.pageNumber,
        reason: promptModeration.reason,
      });
      return {
        success: false,
        illustrationId,
        storybookId: request.storybookId,
        pageNumber: request.pageNumber,
        imageUrl: '',
        thumbnailUrl: '',
        layers: [],
        metadata: {
          model: '',
          artStyle: request.artStyle,
          promptUsed: prompt,
          generationTimeMs: Date.now() - startTime,
          costUsd: 0,
          moderationResult: promptModeration,
        },
        error: `Prompt moderation failed: ${promptModeration.reason}`,
      };
    }

    // Step 5: Determine image size from aspect ratio
    const sizeMap: Record<string, string> = {
      '4:3': request.resolution === 'high' ? '2048x2048' : '1024x1024',
      '16:9': request.resolution === 'high' ? '2048x2048' : '1792x1024',
      '3:4': request.resolution === 'high' ? '2048x2048' : '1024x1792',
      '1:1': request.resolution === 'high' ? '2048x2048' : '1024x1024',
    };

    const genOptions: ImageGenOptions = {
      size: sizeMap[request.aspectRatio] ?? '1024x1024',
      quality: request.resolution === 'high' ? 'high' : 'standard',
      responseFormat: 'b64_json',
      referenceImages: this.characterEngine.selectReferenceImages(
        request.characters,
        request.sceneComposition.characterPlacements
      ),
    };

    // Step 6: Generate with retry and fallback
    let genResult: ImageGenResult | null = null;
    let lastError: Error | null = null;
    let usedProvider = this.primaryProvider;

    for (let attempt = 0; attempt < this.config.maxRetriesPerPage; attempt++) {
      try {
        genResult = await usedProvider.generateImage(prompt, genOptions);
        break;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.logger.warn('Illustration generation attempt failed', {
          attempt: attempt + 1,
          provider: usedProvider.providerName,
          error: lastError.message,
        });

        // Try fallback provider on second attempt
        if (attempt === 1 && this.fallbackProvider) {
          this.logger.info('Switching to fallback provider', {
            from: usedProvider.providerName,
            to: this.fallbackProvider.providerName,
          });
          usedProvider = this.fallbackProvider;
        }

        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }

    if (!genResult) {
      return {
        success: false,
        illustrationId,
        storybookId: request.storybookId,
        pageNumber: request.pageNumber,
        imageUrl: '',
        thumbnailUrl: '',
        layers: [],
        metadata: {
          model: '',
          artStyle: request.artStyle,
          promptUsed: prompt,
          generationTimeMs: Date.now() - startTime,
          costUsd: 0,
          moderationResult: { safe: false, categories: {}, overallScore: 1, reviewRequired: true },
        },
        error: `All generation attempts failed: ${lastError?.message}`,
      };
    }

    // Step 7: Moderate the generated image
    const imageData = genResult.imageBase64 ?? '';
    const imageModeration = imageData
      ? await this.moderator.moderateImage(imageData)
      : { safe: true, categories: {}, overallScore: 0, reviewRequired: false } as ModerationResult;

    if (!imageModeration.safe) {
      this.logger.warn('Generated illustration flagged by moderation', {
        storybookId: request.storybookId,
        pageNumber: request.pageNumber,
        reason: imageModeration.reason,
      });

      // Track cost even for rejected images
      this.trackCost(request.storybookId, genResult.costUsd);

      return {
        success: false,
        illustrationId,
        storybookId: request.storybookId,
        pageNumber: request.pageNumber,
        imageUrl: '',
        thumbnailUrl: '',
        layers: [],
        metadata: {
          model: genResult.model,
          artStyle: request.artStyle,
          promptUsed: prompt,
          generationTimeMs: Date.now() - startTime,
          costUsd: genResult.costUsd,
          moderationResult: imageModeration,
          seed: genResult.seed,
        },
        error: `Image moderation failed: ${imageModeration.reason}`,
      };
    }

    // Step 8: Upload to storage
    let imageUrl = '';
    let thumbnailUrl = '';

    if (imageData) {
      const buffer = Buffer.from(imageData, 'base64');
      const key = `storybooks/${request.storybookId}/pages/${request.pageNumber}/${illustrationId}.png`;
      const thumbKey = `storybooks/${request.storybookId}/pages/${request.pageNumber}/${illustrationId}_thumb.png`;

      try {
        imageUrl = await this.config.storageProvider.upload(key, buffer, 'image/png');
        // Thumbnail generation would use sharp or similar — for now, store same image
        thumbnailUrl = await this.config.storageProvider.upload(thumbKey, buffer, 'image/png');
      } catch (error) {
        this.logger.error('Failed to upload illustration', {
          storybookId: request.storybookId,
          pageNumber: request.pageNumber,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } else if (genResult.imageUrl) {
      imageUrl = genResult.imageUrl;
      thumbnailUrl = genResult.imageUrl;
    }

    // Track cost
    this.trackCost(request.storybookId, genResult.costUsd);

    const result: IllustrationResult = {
      success: true,
      illustrationId,
      storybookId: request.storybookId,
      pageNumber: request.pageNumber,
      imageUrl,
      thumbnailUrl,
      layers: [], // Populated when layer decomposition is enabled
      metadata: {
        model: genResult.model,
        artStyle: request.artStyle,
        promptUsed: prompt,
        generationTimeMs: Date.now() - startTime,
        costUsd: genResult.costUsd,
        moderationResult: imageModeration,
        seed: genResult.seed,
      },
    };

    this.emit('page:complete', {
      storybookId: request.storybookId,
      pageNumber: request.pageNumber,
      illustrationId,
      costUsd: genResult.costUsd,
    });

    return result;
  }

  /**
   * Validates that art style is appropriate for the target age group.
   * Returns the style if valid, or a recommended alternative if not.
   */
  validateStyleForAge(style: ArtStyle, ageGroup: string): {
    valid: boolean;
    style: ArtStyle;
    reason?: string;
  } {
    if (style === ArtStyle.CUSTOM) {
      return { valid: true, style };
    }

    const appropriateStyles = AGE_STYLE_MAP[ageGroup];
    if (!appropriateStyles) {
      return { valid: true, style }; // Unknown age group — allow any style
    }

    if (appropriateStyles.includes(style)) {
      return { valid: true, style };
    }

    // Suggest the closest match from the age-appropriate pool
    const suggested = appropriateStyles[0];
    return {
      valid: false,
      style: suggested,
      reason: `Style "${style}" is not optimal for age group ${ageGroup}. Suggested: "${suggested}"`,
    };
  }

  /**
   * Estimates total illustration cost for a book before generation.
   */
  estimateBookCost(pageCount: number, options: {
    resolution: IllustrationRequest['resolution'];
    aspectRatio: IllustrationRequest['aspectRatio'];
    enableLayers: boolean;
  }): { estimatedCostUsd: number; perPageCostUsd: number } {
    const sizeMap: Record<string, string> = {
      '4:3': options.resolution === 'high' ? '2048x2048' : '1024x1024',
      '16:9': options.resolution === 'high' ? '2048x2048' : '1792x1024',
      '3:4': options.resolution === 'high' ? '2048x2048' : '1024x1792',
      '1:1': options.resolution === 'high' ? '2048x2048' : '1024x1024',
    };

    const genOptions: ImageGenOptions = {
      size: sizeMap[options.aspectRatio] ?? '1024x1024',
      quality: options.resolution === 'high' ? 'high' : 'standard',
      responseFormat: 'b64_json',
    };

    const perPageCost = this.primaryProvider.estimateCost(genOptions);
    // Add ~10% for moderation costs
    const perPageTotal = perPageCost * 1.1;

    return {
      estimatedCostUsd: perPageTotal * pageCount,
      perPageCostUsd: perPageTotal,
    };
  }

  // --- Private helpers ---

  private trackCost(storybookId: string, costUsd: number): void {
    const current = this.bookCosts.get(storybookId) ?? 0;
    this.bookCosts.set(storybookId, current + costUsd);
  }

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `ill_${timestamp}_${random}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ---------------------------------------------------------------------------
// Section 8: Cultural Sensitivity Configuration
// ---------------------------------------------------------------------------

/**
 * Configurable per-tenant cultural sensitivity parameters that are
 * injected into illustration prompts to ensure diverse representation.
 */
export interface CulturalSensitivityConfig {
  tenantId: string;
  region: string;
  diversityParameters: {
    representEthnicities: string[];
    includeDisabilityRepresentation: boolean;
    includeDiverseFamilyStructures: boolean;
    culturalSettings: string[];
    avoidStereotypes: string[];
  };
  religiousSensitivity: {
    avoidReligiousSymbols: boolean;
    specificAvoidances: string[];
  };
  customPromptAdditions: string[];
}

/**
 * Builds cultural context prompt fragments from tenant configuration.
 */
export function buildCulturalPromptFragment(config: CulturalSensitivityConfig): string {
  const parts: string[] = [];

  if (config.diversityParameters.representEthnicities.length > 0) {
    parts.push(`Represent diverse characters including ${config.diversityParameters.representEthnicities.join(', ')} backgrounds`);
  }

  if (config.diversityParameters.includeDisabilityRepresentation) {
    parts.push('Include positive representation of children with disabilities where natural');
  }

  if (config.diversityParameters.includeDiverseFamilyStructures) {
    parts.push('Depict diverse family structures (single parents, grandparent carers, same-sex parents) naturally');
  }

  if (config.diversityParameters.avoidStereotypes.length > 0) {
    parts.push(`Avoid stereotypical depictions of: ${config.diversityParameters.avoidStereotypes.join(', ')}`);
  }

  if (config.religiousSensitivity.avoidReligiousSymbols) {
    parts.push('Do not include religious symbols or iconography');
  }

  if (config.customPromptAdditions.length > 0) {
    parts.push(...config.customPromptAdditions);
  }

  return parts.join('. ');
}

// ---------------------------------------------------------------------------
// Section 9: Factory & Convenience
// ---------------------------------------------------------------------------

/**
 * Creates a fully configured IllustrationPipeline from environment
 * configuration, following the fail-fast pattern from Sprint 1.
 */
export function createIllustrationPipeline(config: {
  openaiApiKey: string;
  stableDiffusionUrl?: string;
  primaryProvider?: 'gpt_image' | 'stable_diffusion';
  storageProvider: IStorageProvider;
  cacheProvider?: ICacheProvider;
  eventPublisher?: IEventPublisher;
  logger: ILogger;
  maxConcurrentGenerations?: number;
  costBudgetPerBook?: number;
}): IllustrationPipeline {
  const gptImage = new GPTImageProvider({
    apiKey: config.openaiApiKey,
    logger: config.logger,
  });

  const stableDiffusion = config.stableDiffusionUrl
    ? new StableDiffusionProvider({
        apiUrl: config.stableDiffusionUrl,
        logger: config.logger,
      })
    : undefined;

  const moderator = new IllustrationModerator({
    apiKey: config.openaiApiKey,
    logger: config.logger,
  });

  return new IllustrationPipeline(
    {
      primaryProvider: config.primaryProvider ?? 'gpt_image',
      fallbackProvider: config.stableDiffusionUrl ? 'stable_diffusion' : undefined,
      maxRetriesPerPage: 3,
      moderationThreshold: 0.05,
      enableLayerDecomposition: false, // Phase 1: flat generation
      maxConcurrentGenerations: config.maxConcurrentGenerations ?? 3,
      costBudgetPerBook: config.costBudgetPerBook ?? 2.0,
      storageProvider: config.storageProvider,
      cacheProvider: config.cacheProvider,
      eventPublisher: config.eventPublisher,
      logger: config.logger,
    },
    { gptImage, stableDiffusion },
    moderator
  );
}
