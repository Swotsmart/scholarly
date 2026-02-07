// =============================================================================
// SCHOLARLY PLATFORM — Content SDK
// Sprint 3 | DT-001 | content-sdk.ts
// =============================================================================
// @scholarly/content-sdk — TypeScript SDK for programmatic storybook
// creation, validation, and publication via the Scholarly API.
// =============================================================================

// ---------------------------------------------------------------------------
// Section 1: SDK Configuration & Client
// ---------------------------------------------------------------------------

export interface ScholarlySDKConfig {
  apiKey: string;
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  requestInterceptor?: (headers: Record<string, string>) => Record<string, string>;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
  metadata?: { requestId: string; latencyMs: number };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

const SDK_VERSION = '1.0.0';

export class ScholarlyAPIError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ScholarlyAPIError';
  }
}

class BaseAPI {
  protected readonly config: Required<ScholarlySDKConfig>;

  constructor(config: Required<ScholarlySDKConfig>) {
    this.config = config;
  }

  protected async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string | number | boolean | undefined>
  ): Promise<APIResponse<T>> {
    let url = `${this.config.baseUrl}${path}`;

    if (queryParams) {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(queryParams)) {
        if (value !== undefined) params.set(key, String(value));
      }
      const qs = params.toString();
      if (qs) url += `?${qs}`;
    }

    let headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-SDK-Version': SDK_VERSION,
    };
    headers = this.config.requestInterceptor(headers);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(url, {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const data = await response.json() as APIResponse<T>;

        if (!response.ok) {
          throw new ScholarlyAPIError(
            data.error?.message ?? `API error: ${response.status}`,
            data.error?.code ?? 'API_ERROR',
            response.status,
            data.error?.details
          );
        }

        return data;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (error instanceof ScholarlyAPIError && error.statusCode < 500) throw error;
        if (attempt < this.config.retries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError ?? new Error('Request failed after retries');
  }
}

// ---------------------------------------------------------------------------
// Section 2: Story Types
// ---------------------------------------------------------------------------

export interface GenerateStoryRequest {
  phonicsPhase: number;
  targetGPCs: string[];
  taughtGPCSet: string[];
  theme?: string;
  ageGroup?: string;
  pageCount?: number;
  characterId?: string;
  seriesId?: string;
  previousStoryId?: string;
  narrativeTemplate?: string;
  tone?: 'playful' | 'adventurous' | 'calming' | 'educational';
  setting?: string;
  decodabilityThreshold?: number;
}

export interface GeneratedStory {
  storyId: string;
  title: string;
  pages: Array<{ pageNumber: number; text: string; sceneDescription: string }>;
  metadata: {
    phonicsPhase: number;
    targetGPCs: string[];
    decodabilityScore: number;
    vocabularyTier: string;
    wordCount: number;
    estimatedReadingTimeMinutes: number;
  };
  status: 'draft' | 'validated' | 'illustrated' | 'narrated' | 'review' | 'published';
}

// ---------------------------------------------------------------------------
// Section 3: API Endpoint Classes
// ---------------------------------------------------------------------------

class StoriesAPI extends BaseAPI {
  async generate(request: GenerateStoryRequest): Promise<APIResponse<GeneratedStory>> {
    return this.request<GeneratedStory>('POST', '/api/v1/stories/generate', request);
  }

  async get(storyId: string): Promise<APIResponse<GeneratedStory>> {
    return this.request<GeneratedStory>('GET', `/api/v1/stories/${storyId}`);
  }

  async illustrate(storyId: string, options?: {
    artStyle?: string;
    aspectRatio?: '4:3' | '16:9' | '3:4' | '1:1';
    resolution?: 'standard' | 'high';
  }): Promise<APIResponse<{ storyId: string; illustrations: Array<{ pageNumber: number; imageUrl: string; thumbnailUrl: string }>; totalCostUsd: number }>> {
    return this.request('POST', `/api/v1/stories/${storyId}/illustrate`, options);
  }

  async narrate(storyId: string, options?: {
    voicePersonaId?: string;
    model?: string;
  }): Promise<APIResponse<{ storyId: string; narration: { totalDurationMs: number; pages: Array<{ pageNumber: number; audioUrl: string; durationMs: number }> }; totalCostUsd: number }>> {
    return this.request('POST', `/api/v1/stories/${storyId}/narrate`, options);
  }

  async validate(storyId: string): Promise<APIResponse<ValidationReport>> {
    return this.request<ValidationReport>('POST', `/api/v1/stories/${storyId}/validate`);
  }

  async submit(storyId: string): Promise<APIResponse<{ storyId: string; reviewStatus: string; estimatedReviewTimeHours: number }>> {
    return this.request('POST', `/api/v1/stories/${storyId}/submit`);
  }

  async analytics(storyId: string): Promise<APIResponse<{ storyId: string; readCount: number; completionRate: number; averageAccuracy: number; averageTimeMinutes: number; reReadRate: number; rating: number; ratingCount: number }>> {
    return this.request('GET', `/api/v1/stories/${storyId}/analytics`);
  }
}

class LibraryAPI extends BaseAPI {
  async search(filters: { query?: string; phonicsPhase?: number; themes?: string[]; ageGroup?: string; source?: string; artStyle?: string } & PaginationParams): Promise<APIResponse<PaginatedResponse<GeneratedStory>>> {
    return this.request('GET', '/api/v1/library/search', undefined, filters as Record<string, string>);
  }

  async recommend(learnerId: string, options?: { count?: number; includeChallenge?: boolean }): Promise<APIResponse<{ recommendations: GeneratedStory[]; reason: string[] }>> {
    return this.request('GET', '/api/v1/library/recommend', undefined, { learnerId, ...options });
  }

  async schema(): Promise<APIResponse<Record<string, unknown>>> {
    return this.request('GET', '/api/v1/schemas/storybook');
  }
}

class CharactersAPI extends BaseAPI {
  async create(character: { name: string; description: string; physicalTraits: Record<string, unknown>; clothing: Record<string, unknown>; personality: Record<string, unknown>; referenceImageBase64?: string }): Promise<APIResponse<{ characterId: string }>> {
    return this.request('POST', '/api/v1/characters', character);
  }

  async get(characterId: string): Promise<APIResponse<Record<string, unknown>>> {
    return this.request('GET', `/api/v1/characters/${characterId}`);
  }

  async list(): Promise<APIResponse<PaginatedResponse<Record<string, unknown>>>> {
    return this.request('GET', '/api/v1/characters');
  }
}

class GPCsAPI extends BaseAPI {
  async getTaught(learnerId: string): Promise<APIResponse<{ learnerId: string; taughtGPCs: string[]; currentPhase: number; masteryMap: Record<string, number> }>> {
    return this.request('GET', `/api/v1/gpcs/taught/${learnerId}`);
  }

  async inventory(): Promise<APIResponse<{ phases: Record<number, { gpcs: string[]; name: string }>; totalGPCs: number }>> {
    return this.request('GET', '/api/v1/gpcs/inventory');
  }
}

class ReviewsAPI extends BaseAPI {
  async submit(storyId: string, review: { score: number; curriculumAlignment: number; narrativeQuality: number; ageAppropriateness: number; comments: string }): Promise<APIResponse<{ reviewId: string }>> {
    return this.request('POST', `/api/v1/stories/${storyId}/review`, review);
  }

  async status(storyId: string): Promise<APIResponse<{ storyId: string; stage: string; reviews: Array<{ reviewerId: string; score: number; comments: string; reviewedAt: string }>; automatedReport?: ValidationReport }>> {
    return this.request('GET', `/api/v1/stories/${storyId}/review`);
  }
}

// ---------------------------------------------------------------------------
// Section 4: Main Client
// ---------------------------------------------------------------------------

export class ScholarlyClient {
  private readonly cfg: Required<ScholarlySDKConfig>;
  private readonly _stories: StoriesAPI;
  private readonly _library: LibraryAPI;
  private readonly _characters: CharactersAPI;
  private readonly _gpcs: GPCsAPI;
  private readonly _reviews: ReviewsAPI;

  constructor(config: ScholarlySDKConfig) {
    if (!config.apiKey) {
      throw new Error('ScholarlyClient: API key is required. Get one at https://developer.scholarly.app');
    }
    this.cfg = {
      apiKey: config.apiKey,
      baseUrl: config.baseUrl ?? 'https://api.scholarly.app',
      timeout: config.timeout ?? 30000,
      retries: config.retries ?? 2,
      requestInterceptor: config.requestInterceptor ?? (h => h),
    };

    this._stories = new StoriesAPI(this.cfg);
    this._library = new LibraryAPI(this.cfg);
    this._characters = new CharactersAPI(this.cfg);
    this._gpcs = new GPCsAPI(this.cfg);
    this._reviews = new ReviewsAPI(this.cfg);
  }

  get story(): StoriesAPI { return this._stories; }
  get lib(): LibraryAPI { return this._library; }
  get character(): CharactersAPI { return this._characters; }
  get gpc(): GPCsAPI { return this._gpcs; }
  get review(): ReviewsAPI { return this._reviews; }
}

// Validation report types (shared with DT-002)
export interface ValidationReport {
  valid: boolean;
  overallScore: number;
  decodability: DecodabilityReport;
  vocabulary: VocabularyReport;
  safety: SafetyReport;
  curriculum: CurriculumReport;
  warnings: string[];
  errors: string[];
}

export interface DecodabilityReport {
  score: number;
  threshold: number;
  passed: boolean;
  totalWords: number;
  decodableWords: number;
  undecodableWords: string[];
  trickyWordsUsed: string[];
  perPageScores: Array<{ page: number; score: number }>;
}

export interface VocabularyReport {
  tier1Percentage: number;
  tier2Percentage: number;
  tier3Percentage: number;
  averageSentenceLength: number;
  maxSentenceLength: number;
  uniqueWordCount: number;
  totalWordCount: number;
  readabilityLevel: string;
}

export interface SafetyReport {
  safe: boolean;
  issues: Array<{ type: string; severity: 'low' | 'medium' | 'high'; description: string; pageNumber?: number }>;
}

export interface CurriculumReport {
  targetGPCsCovered: boolean;
  targetGPCHitRate: Record<string, number>;
  phonicsPhaseAppropriate: boolean;
  morphemeFocusPresent: boolean;
  comprehensionStrandsAddressed: string[];
}
