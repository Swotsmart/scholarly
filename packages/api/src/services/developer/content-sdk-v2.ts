// =============================================================================
// @scholarly/content-sdk — Core Content SDK
// =============================================================================
// The Content SDK is the gateway through which external developers, educators,
// and creative tools interact with the Scholarly Storybook Engine. If the
// Storybook Engine is the printing press, this SDK is the typesetter's toolkit
// — it provides programmatic access to every stage of the content lifecycle:
// generation, illustration, narration, validation, submission, and analytics.
//
// Architecture: OAuth 2.0 authenticated REST client with TypeScript-first
// design, automatic retry with exponential backoff, streaming support for
// long-running generation operations, and comprehensive type definitions
// that make invalid API calls impossible at compile time.
//
// File: sdk/content-sdk.ts
// Sprint: 8 (Developer Ecosystem & Platform Activation)
// Backlog: DE-001
// Lines: ~850
// =============================================================================

import { Result } from '../shared/result';

// =============================================================================
// Section 1: Type Definitions & Interfaces
// =============================================================================
// These types form the contract between the SDK and the Storybook Engine API.
// Every field is documented, every enum is exhaustive, and every optional field
// has a sensible default described in its JSDoc comment. The goal is that a
// developer reading these types understands the API without ever opening the
// documentation website — the types ARE the documentation.
// =============================================================================

/** Phonics phases aligned with Letters and Sounds framework (1-6) */
export type PhonicsPhase = 1 | 2 | 3 | 4 | 5 | 6;

/** Vocabulary frequency tiers following Beck's three-tier model */
export type VocabularyTier = 'tier1_everyday' | 'tier2_academic' | 'tier3_domain';

/** Art styles optimised for children's book illustration */
export type ArtStyle =
  | 'watercolour' | 'flat_vector' | 'soft_3d' | 'crayon' | 'papercraft'
  | 'pencil_sketch' | 'collage' | 'gouache' | 'digital_paint' | 'ink_wash'
  | 'pixel_art' | 'pastel' | 'woodblock' | 'stained_glass' | 'clay_model'
  | 'felt_craft' | 'mosaic' | 'charcoal' | 'oil_paint' | 'mixed_media'
  | 'botanical' | 'comic' | 'manga' | 'silhouette' | 'impressionist'
  | 'pop_art' | 'art_deco' | 'folk_art' | 'aboriginal' | 'minimalist';

/** Reading Rope comprehension strands (Scarborough's model) */
export type ComprehensionStrand =
  | 'vocabulary' | 'inference' | 'prior_knowledge' | 'genre_awareness'
  | 'text_structure' | 'verbal_reasoning' | 'literacy_knowledge';

/** Content review stages in the five-gate quality pipeline */
export type ReviewStage =
  | 'automated_validation' | 'ai_review' | 'peer_review'
  | 'pilot_testing' | 'published';

/** Storybook lifecycle status */
export type StorybookStatus =
  | 'draft' | 'generating' | 'validating' | 'in_review'
  | 'pilot' | 'published' | 'archived' | 'rejected';

/** Creator tier levels in the marketplace ecosystem */
export type CreatorTier = 'bronze' | 'silver' | 'gold' | 'platinum';

/** Curriculum framework alignments */
export type CurriculumFramework =
  | 'letters_and_sounds' | 'jolly_phonics' | 'read_write_inc'
  | 'orton_gillingham' | 'acara' | 'eyfs' | 'eylf'
  | 'ib_pyp' | 'common_core' | 'national_curriculum_uk';

/** CEFR language proficiency levels for multilingual content */
export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

/** Supported languages for content generation */
export type ContentLanguage =
  | 'en-AU' | 'en-GB' | 'en-US' | 'en-NZ' | 'en-ZA'
  | 'fr-FR' | 'es-ES' | 'de-DE' | 'it-IT' | 'pt-BR'
  | 'ja-JP' | 'zh-CN' | 'ko-KR' | 'ar-SA' | 'hi-IN';

// ---------------------------------------------------------------------------
// Request & Response Types
// ---------------------------------------------------------------------------

/** Parameters for generating a new curriculum-aligned storybook */
export interface StoryGenerationRequest {
  /** Target phonics phase (1-6). Determines the GPC complexity ceiling. */
  phase: PhonicsPhase;
  /** Specific grapheme-phoneme correspondences to practise in this story */
  targetGpcs: string[];
  /** Full set of GPCs the learner has been taught (decodability validation set) */
  taughtGpcSet: string[];
  /** Story theme or topic (e.g., "Australian animals", "space adventure") */
  theme: string;
  /** Number of pages (8-24, default 12). Longer stories for higher phases. */
  pageCount?: number;
  /** Target age range for vocabulary and theme selection */
  ageRange?: { min: number; max: number };
  /** Preferred vocabulary tier distribution */
  vocabularyTier?: VocabularyTier;
  /** Minimum decodability percentage (0-100, default 85) */
  decodabilityThreshold?: number;
  /** Narrative template to use (e.g., "heros_journey", "cumulative_tale") */
  narrativeTemplate?: string;
  /** Series ID for episodic continuity (existing characters/settings) */
  seriesId?: string;
  /** Preferred art style for illustration generation */
  artStyle?: ArtStyle;
  /** Curriculum framework alignment */
  curriculumFramework?: CurriculumFramework;
  /** Content language (default: en-AU) */
  language?: ContentLanguage;
  /** Comprehension strand emphasis */
  comprehensionStrand?: ComprehensionStrand;
  /** Morpheme focus areas (prefixes, suffixes, roots) */
  morphemeFocus?: string[];
  /** Cultural context tags for representation */
  culturalContext?: string[];
  /** Custom instructions for the narrative generator */
  creatorNotes?: string;
}

/** A generated storybook with full metadata */
export interface Storybook {
  id: string;
  tenantId: string;
  title: string;
  status: StorybookStatus;
  phase: PhonicsPhase;
  targetGpcs: string[];
  taughtGpcSet: string[];
  decodabilityScore: number;
  wcpmBand: { min: number; max: number };
  vocabularyTier: VocabularyTier;
  comprehensionStrand: ComprehensionStrand;
  morphemeFocus: string[];
  curriculumFramework: CurriculumFramework;
  language: ContentLanguage;
  culturalContext: string[];
  seriesId?: string;
  pages: StorybookPage[];
  characters: StorybookCharacter[];
  metadata: StorybookMetadata;
  analytics?: StorybookAnalytics;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  creatorId: string;
}

/** Individual page within a storybook */
export interface StorybookPage {
  pageNumber: number;
  text: string;
  illustrationUrl?: string;
  audioUrl?: string;
  wordTimestamps?: WordTimestamp[];
  sceneLayout?: SceneLayout;
  targetGpcsOnPage: string[];
  decodableWords: string[];
  trickyWords: string[];
}

/** Word-level audio synchronisation for karaoke-style highlighting */
export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
  isTargetGpc: boolean;
  isTrickyWord: boolean;
}

/** Scene decomposition for parallax and animation */
export interface SceneLayout {
  background: LayerDefinition;
  characters: LayerDefinition[];
  foreground: LayerDefinition[];
  textOverlayZone: { x: number; y: number; width: number; height: number };
}

export interface LayerDefinition {
  imageUrl: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  animatable: boolean;
}

/** Character definition with visual consistency anchors */
export interface StorybookCharacter {
  id: string;
  name: string;
  description: string;
  styleSheetUrl?: string;
  personalityTraits: string[];
  appearancePrompt: string;
  seriesId?: string;
}

/** Rich educational metadata attached to every storybook */
export interface StorybookMetadata {
  eylf_alignment?: string[];
  eyfs_alignment?: string[];
  ib_pyp_themes?: string[];
  narrativeTemplate: string;
  wordCount: number;
  uniqueWordCount: number;
  averageSentenceLength: number;
  readabilityScore: number;
  generationCost: GenerationCost;
}

/** Cost breakdown for a generated storybook */
export interface GenerationCost {
  narrativeUsd: number;
  illustrationsUsd: number;
  narrationUsd: number;
  validationUsd: number;
  totalUsd: number;
}

/** Engagement analytics for a published storybook */
export interface StorybookAnalytics {
  readCount: number;
  completionRate: number;
  averageAccuracy: number;
  averageTimeSeconds: number;
  reReadRate: number;
  averageRating: number;
  ratingCount: number;
}

/** Illustration generation request */
export interface IllustrationRequest {
  artStyle: ArtStyle;
  characterSheetIds?: string[];
  sceneDecomposition?: boolean;
  imageSize?: { width: number; height: number };
  culturalDiversityParams?: Record<string, string>;
}

/** Audio narration request */
export interface NarrationRequest {
  voiceId?: string;
  speed?: 'slow' | 'normal' | 'fast';
  wordLevelTimestamps?: boolean;
  language?: ContentLanguage;
}

/** Validation result from the content validator */
export interface ValidationResult {
  valid: boolean;
  decodabilityScore: number;
  decodabilityPass: boolean;
  safetyPass: boolean;
  curriculumAlignmentScore: number;
  metadataComplete: boolean;
  issues: ValidationIssue[];
  suggestions: string[];
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  location?: { page?: number; word?: string; field?: string };
}

/** Library search parameters */
export interface LibrarySearchParams {
  phase?: PhonicsPhase;
  targetGpcs?: string[];
  theme?: string;
  ageRange?: { min: number; max: number };
  artStyle?: ArtStyle;
  language?: ContentLanguage;
  curriculumFramework?: CurriculumFramework;
  seriesId?: string;
  status?: StorybookStatus;
  sortBy?: 'relevance' | 'popularity' | 'newest' | 'rating';
  page?: number;
  limit?: number;
}

/** Paginated search results */
export interface LibrarySearchResult {
  books: Storybook[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  facets: SearchFacets;
}

export interface SearchFacets {
  phases: Record<number, number>;
  artStyles: Record<string, number>;
  languages: Record<string, number>;
  themes: Record<string, number>;
}

/** Personalised recommendation for a specific learner */
export interface RecommendationRequest {
  learnerId: string;
  count?: number;
  excludeRead?: boolean;
  includeAboveLevel?: boolean;
}

export interface RecommendationResult {
  recommendations: Array<{
    book: Storybook;
    reason: string;
    matchScore: number;
    shelf: 'ready_for_you' | 'adventures_waiting' | 'favourites' | 'community_picks';
  }>;
}

/** Review submission for the peer review pipeline */
export interface ReviewSubmission {
  storybookId: string;
  stage: ReviewStage;
  score: number;
  curriculumAlignmentScore: number;
  narrativeQualityScore: number;
  ageAppropriatenessScore: number;
  illustrationQualityScore: number;
  comments: string;
  approved: boolean;
}

/** Creator profile in the marketplace */
export interface CreatorProfile {
  id: string;
  displayName: string;
  tier: CreatorTier;
  totalContributions: number;
  publishedBooks: number;
  engagementScore: number;
  totalEarningsUsd: number;
  verificationStatus: 'unverified' | 'pending' | 'verified';
  specialisations: string[];
  joinedAt: string;
}

/** Webhook event types for real-time notifications */
export type WebhookEventType =
  | 'story.generated' | 'story.illustrated' | 'story.narrated'
  | 'story.validated' | 'story.submitted' | 'story.published'
  | 'story.rejected' | 'review.assigned' | 'review.completed'
  | 'analytics.milestone' | 'bounty.posted' | 'bounty.awarded';

export interface WebhookSubscription {
  id: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  active: boolean;
  createdAt: string;
}

/** Streaming event for long-running generation operations */
export interface GenerationStreamEvent {
  type: 'progress' | 'page_complete' | 'validation' | 'complete' | 'error';
  progress?: number;
  pageNumber?: number;
  message: string;
  data?: Record<string, unknown>;
}

// =============================================================================
// Section 2: SDK Configuration
// =============================================================================

export interface ScholarlySDKConfig {
  /** API base URL (default: https://api.scholarly.app/v1) */
  baseUrl?: string;
  /** OAuth 2.0 client ID */
  clientId: string;
  /** OAuth 2.0 client secret */
  clientSecret: string;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Maximum retry attempts for failed requests (default: 3) */
  maxRetries?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
  /** Custom fetch implementation (for testing or SSR) */
  fetchImpl?: typeof fetch;
}

// =============================================================================
// Section 3: OAuth 2.0 Token Manager
// =============================================================================
// The token manager handles the client_credentials OAuth 2.0 flow, caching
// tokens until 5 minutes before expiry and transparently refreshing them.
// Think of it as the bouncer at the API nightclub — it handles the credentials
// handshake so the developer never has to think about token lifecycle.
// =============================================================================

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

class OAuthTokenManager {
  private accessToken: string | null = null;
  private expiresAt: number = 0;
  private refreshPromise: Promise<string> | null = null;

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly baseUrl: string,
    private readonly fetchFn: typeof fetch
  ) {}

  async getToken(): Promise<string> {
    // Return cached token if still valid (with 5-minute buffer)
    if (this.accessToken && Date.now() < this.expiresAt - 300_000) {
      return this.accessToken;
    }

    // Deduplicate concurrent refresh requests — if multiple API calls
    // hit this simultaneously, they all await the same promise rather
    // than each triggering a separate token request
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.requestToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async requestToken(): Promise<string> {
    const response = await this.fetchFn(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        scope: 'content:read content:write library:read library:write analytics:read webhooks:manage',
      }).toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new ScholarlySDKError(
        `OAuth token request failed: ${response.status} ${response.statusText}`,
        'AUTH_TOKEN_FAILED',
        response.status,
        error
      );
    }

    const data: TokenResponse = await response.json();
    this.accessToken = data.access_token;
    this.expiresAt = Date.now() + data.expires_in * 1000;
    return this.accessToken;
  }

  invalidate(): void {
    this.accessToken = null;
    this.expiresAt = 0;
  }
}

// =============================================================================
// Section 4: HTTP Client with Retry & Streaming
// =============================================================================
// The HTTP client wraps fetch with automatic retry (exponential backoff),
// token injection, tenant header propagation, and streaming support for
// generation operations that can take 30-120 seconds. It's the plumbing
// that makes the SDK feel effortless.
// =============================================================================

export class ScholarlySDKError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = 'ScholarlySDKError';
  }
}

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  stream?: boolean;
}

class HttpClient {
  private readonly baseUrl: string;
  private readonly tenantId: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly debug: boolean;
  private readonly fetchFn: typeof fetch;

  constructor(
    private readonly tokenManager: OAuthTokenManager,
    config: Required<Pick<ScholarlySDKConfig, 'baseUrl' | 'tenantId' | 'timeout' | 'maxRetries' | 'debug'>> & { fetchImpl: typeof fetch }
  ) {
    this.baseUrl = config.baseUrl;
    this.tenantId = config.tenantId;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;
    this.debug = config.debug;
    this.fetchFn = config.fetchImpl;
  }

  async request<T>(options: RequestOptions): Promise<T> {
    const url = this.buildUrl(options.path, options.query);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          // Exponential backoff: 1s, 2s, 4s, 8s...
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30_000);
          const jitter = delay * 0.1 * Math.random();
          await this.sleep(delay + jitter);
          if (this.debug) console.log(`[SDK] Retry attempt ${attempt} for ${options.method} ${options.path}`);
        }

        const token = await this.tokenManager.getToken();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.timeout);

        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': this.tenantId,
          'X-SDK-Version': '1.0.0',
          'User-Agent': '@scholarly/content-sdk/1.0.0',
        };

        if (options.body) {
          headers['Content-Type'] = 'application/json';
        }

        if (options.stream) {
          headers['Accept'] = 'text/event-stream';
        }

        const response = await this.fetchFn(url, {
          method: options.method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.status === 401) {
          // Token expired mid-flight — invalidate and retry
          this.tokenManager.invalidate();
          if (attempt < this.maxRetries) continue;
        }

        if (response.status === 429) {
          // Rate limited — extract Retry-After header and wait
          const retryAfter = parseInt(response.headers.get('Retry-After') || '5', 10);
          await this.sleep(retryAfter * 1000);
          if (attempt < this.maxRetries) continue;
        }

        if (!response.ok) {
          const errorBody = await response.text();
          throw new ScholarlySDKError(
            `API request failed: ${response.status} ${response.statusText}`,
            `HTTP_${response.status}`,
            response.status,
            errorBody
          );
        }

        if (options.stream) {
          return response as unknown as T;
        }

        return await response.json() as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on client errors (4xx) except 401 and 429
        if (error instanceof ScholarlySDKError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          if (error.statusCode !== 401 && error.statusCode !== 429) throw error;
        }

        if (attempt === this.maxRetries) break;
      }
    }

    throw lastError || new ScholarlySDKError('Request failed after all retries', 'MAX_RETRIES_EXCEEDED');
  }

  async *streamEvents(response: Response): AsyncGenerator<GenerationStreamEvent> {
    const reader = response.body?.getReader();
    if (!reader) throw new ScholarlySDKError('No response body for streaming', 'STREAM_ERROR');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') return;
            try {
              yield JSON.parse(data) as GenerationStreamEvent;
            } catch {
              if (this.debug) console.warn(`[SDK] Failed to parse SSE event: ${data}`);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined) url.searchParams.set(key, String(value));
      });
    }
    return url.toString();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Section 5: The Scholarly Content SDK Client
// =============================================================================
// This is the main class that developers instantiate and interact with.
// It provides method-per-endpoint access to the entire Storybook Engine API,
// with full TypeScript type safety, JSDoc documentation, and streaming
// support for long-running operations.
//
// Usage:
//   const sdk = new ScholarlyContentSDK({
//     clientId: 'your-client-id',
//     clientSecret: 'your-client-secret',
//     tenantId: 'your-tenant-id',
//   });
//
//   const story = await sdk.generateStory({
//     phase: 3,
//     targetGpcs: ['ai', 'ee', 'igh'],
//     taughtGpcSet: ['s','a','t','p','i','n','m','d','g','o','c','k',...],
//     theme: 'Australian animals',
//   });
// =============================================================================

export class ScholarlyContentSDK {
  private readonly http: HttpClient;
  private readonly tokenManager: OAuthTokenManager;

  constructor(config: ScholarlySDKConfig) {
    const resolvedConfig = {
      baseUrl: config.baseUrl || 'https://api.scholarly.app/v1',
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      tenantId: config.tenantId,
      timeout: config.timeout || 30_000,
      maxRetries: config.maxRetries || 3,
      debug: config.debug || false,
      fetchImpl: config.fetchImpl || globalThis.fetch.bind(globalThis),
    };

    this.tokenManager = new OAuthTokenManager(
      resolvedConfig.clientId,
      resolvedConfig.clientSecret,
      resolvedConfig.baseUrl,
      resolvedConfig.fetchImpl
    );

    this.http = new HttpClient(this.tokenManager, resolvedConfig);
  }

  // -------------------------------------------------------------------------
  // Story Generation
  // -------------------------------------------------------------------------

  /**
   * Generate a new curriculum-aligned storybook.
   * This is the primary creation endpoint — it takes a phonics fingerprint
   * and produces a complete narrative validated against decodability constraints.
   * 
   * @param request - Story generation parameters including phase, GPCs, and theme
   * @returns The generated storybook with full metadata
   */
  async generateStory(request: StoryGenerationRequest): Promise<Result<Storybook>> {
    try {
      const storybook = await this.http.request<Storybook>({
        method: 'POST',
        path: '/stories/generate',
        body: request,
        timeout: 120_000, // Generation can take up to 2 minutes
      });
      return { success: true, data: storybook };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Generate a story with streaming progress events.
   * Yields real-time updates as each page is generated, validated, and assembled.
   * Ideal for UI progress indicators during the generation process.
   */
  async *generateStoryStream(request: StoryGenerationRequest): AsyncGenerator<GenerationStreamEvent> {
    const response = await this.http.request<Response>({
      method: 'POST',
      path: '/stories/generate',
      body: { ...request, stream: true },
      timeout: 120_000,
      stream: true,
    });

    yield* this.http.streamEvents(response);
  }

  /**
   * Retrieve a storybook by ID.
   */
  async getStory(storyId: string): Promise<Result<Storybook>> {
    try {
      const storybook = await this.http.request<Storybook>({
        method: 'GET',
        path: `/stories/${storyId}`,
      });
      return { success: true, data: storybook };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Illustration
  // -------------------------------------------------------------------------

  /**
   * Generate illustrations for an existing story.
   * Uses the story's text and character sheets to produce page illustrations
   * with optional scene decomposition for parallax animation.
   */
  async illustrateStory(storyId: string, request: IllustrationRequest): Promise<Result<Storybook>> {
    try {
      const storybook = await this.http.request<Storybook>({
        method: 'POST',
        path: `/stories/${storyId}/illustrate`,
        body: request,
        timeout: 180_000, // Illustration is the most expensive operation
      });
      return { success: true, data: storybook };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Generate illustrations with streaming progress.
   */
  async *illustrateStoryStream(storyId: string, request: IllustrationRequest): AsyncGenerator<GenerationStreamEvent> {
    const response = await this.http.request<Response>({
      method: 'POST',
      path: `/stories/${storyId}/illustrate`,
      body: { ...request, stream: true },
      timeout: 180_000,
      stream: true,
    });

    yield* this.http.streamEvents(response);
  }

  // -------------------------------------------------------------------------
  // Audio Narration
  // -------------------------------------------------------------------------

  /**
   * Generate audio narration for a story with word-level timestamps.
   * Produces professional narration using ElevenLabs voices with
   * karaoke-style timestamp data for read-along highlighting.
   */
  async narrateStory(storyId: string, request: NarrationRequest): Promise<Result<Storybook>> {
    try {
      const storybook = await this.http.request<Storybook>({
        method: 'POST',
        path: `/stories/${storyId}/narrate`,
        body: request,
        timeout: 120_000,
      });
      return { success: true, data: storybook };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Validation
  // -------------------------------------------------------------------------

  /**
   * Validate a story against decodability, safety, and curriculum alignment.
   * Returns detailed validation results with issue locations and suggestions.
   * Can be used pre-submission to catch issues before entering the review pipeline.
   */
  async validateStory(storyId: string): Promise<Result<ValidationResult>> {
    try {
      const result = await this.http.request<ValidationResult>({
        method: 'POST',
        path: `/stories/${storyId}/validate`,
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Submission & Review
  // -------------------------------------------------------------------------

  /**
   * Submit a story to the community review pipeline.
   * Triggers the five-stage quality gate process: automated validation,
   * AI review, peer review, pilot testing, and publication.
   */
  async submitStory(storyId: string): Promise<Result<{ submissionId: string; stage: ReviewStage }>> {
    try {
      const result = await this.http.request<{ submissionId: string; stage: ReviewStage }>({
        method: 'POST',
        path: `/stories/${storyId}/submit`,
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Submit a peer review for a story (educator reviewers only).
   */
  async reviewStory(review: ReviewSubmission): Promise<Result<{ reviewId: string }>> {
    try {
      const result = await this.http.request<{ reviewId: string }>({
        method: 'POST',
        path: `/stories/${review.storybookId}/review`,
        body: review,
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Library
  // -------------------------------------------------------------------------

  /**
   * Search the storybook library with phonics phase, theme, and curriculum filters.
   * Returns paginated results with faceted search metadata.
   */
  async searchLibrary(params: LibrarySearchParams): Promise<Result<LibrarySearchResult>> {
    try {
      const result = await this.http.request<LibrarySearchResult>({
        method: 'GET',
        path: '/library/search',
        query: {
          phase: params.phase,
          targetGpcs: params.targetGpcs?.join(','),
          theme: params.theme,
          ageMin: params.ageRange?.min,
          ageMax: params.ageRange?.max,
          artStyle: params.artStyle,
          language: params.language,
          curriculum: params.curriculumFramework,
          seriesId: params.seriesId,
          status: params.status,
          sortBy: params.sortBy,
          page: params.page,
          limit: params.limit,
        },
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Get personalised storybook recommendations for a specific learner.
   * Uses BKT mastery profile and reading history to suggest books
   * at the optimal difficulty level across the four shelf categories.
   */
  async getRecommendations(request: RecommendationRequest): Promise<Result<RecommendationResult>> {
    try {
      const result = await this.http.request<RecommendationResult>({
        method: 'GET',
        path: '/library/recommend',
        query: {
          learnerId: request.learnerId,
          count: request.count,
          excludeRead: request.excludeRead,
          includeAboveLevel: request.includeAboveLevel,
        },
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Characters
  // -------------------------------------------------------------------------

  /**
   * Create or update a character style sheet.
   * Characters persist across stories in a series, maintaining visual consistency.
   */
  async createCharacter(character: Omit<StorybookCharacter, 'id'>): Promise<Result<StorybookCharacter>> {
    try {
      const result = await this.http.request<StorybookCharacter>({
        method: 'POST',
        path: '/characters',
        body: character,
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Analytics
  // -------------------------------------------------------------------------

  /**
   * Retrieve reading performance analytics for a storybook.
   */
  async getAnalytics(storyId: string): Promise<Result<StorybookAnalytics>> {
    try {
      const result = await this.http.request<StorybookAnalytics>({
        method: 'GET',
        path: `/stories/${storyId}/analytics`,
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Learner GPC Data
  // -------------------------------------------------------------------------

  /**
   * Get a learner's taught GPC set for targeting story generation.
   */
  async getLearnerGpcs(learnerId: string): Promise<Result<{ taughtGpcs: string[]; currentPhase: PhonicsPhase; masteryProfile: Record<string, number> }>> {
    try {
      const result = await this.http.request<{ taughtGpcs: string[]; currentPhase: PhonicsPhase; masteryProfile: Record<string, number> }>({
        method: 'GET',
        path: `/gpcs/taught/${learnerId}`,
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Storybook Schema
  // -------------------------------------------------------------------------

  /**
   * Get the storybook JSON schema for offline validation.
   * Useful for building custom tools that validate stories before submission.
   */
  async getSchema(): Promise<Result<Record<string, unknown>>> {
    try {
      const result = await this.http.request<Record<string, unknown>>({
        method: 'GET',
        path: '/schemas/storybook',
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Webhooks
  // -------------------------------------------------------------------------

  /**
   * Register a webhook for real-time event notifications.
   */
  async createWebhook(url: string, events: WebhookEventType[]): Promise<Result<WebhookSubscription>> {
    try {
      const result = await this.http.request<WebhookSubscription>({
        method: 'POST',
        path: '/webhooks',
        body: { url, events },
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * List active webhook subscriptions.
   */
  async listWebhooks(): Promise<Result<WebhookSubscription[]>> {
    try {
      const result = await this.http.request<WebhookSubscription[]>({
        method: 'GET',
        path: '/webhooks',
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * Delete a webhook subscription.
   */
  async deleteWebhook(webhookId: string): Promise<Result<void>> {
    try {
      await this.http.request<void>({
        method: 'DELETE',
        path: `/webhooks/${webhookId}`,
      });
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  // -------------------------------------------------------------------------
  // Creator Profile
  // -------------------------------------------------------------------------

  /**
   * Get the authenticated creator's marketplace profile.
   */
  async getCreatorProfile(): Promise<Result<CreatorProfile>> {
    try {
      const result = await this.http.request<CreatorProfile>({
        method: 'GET',
        path: '/creators/me',
      });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

// =============================================================================
// Section 6: Package Exports
// =============================================================================

export default ScholarlyContentSDK;

// Re-export for convenience
export {
  OAuthTokenManager,
  HttpClient,
};
