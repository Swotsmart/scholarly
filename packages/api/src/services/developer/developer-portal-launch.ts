// ============================================================================
// S16-003: DEVELOPER PORTAL LAUNCH
// Scholarly Platform — Sprint 16
//
// If the Storybook Engine is Scholarly's printing press, the Developer Portal
// is the publishers' fair — where creators, educators, and developers learn
// the craft, experiment with tools, and launch contributions into the ecosystem.
// Implements: API explorer, storybook playground, SDK tutorials, template
// gallery, and webhook management (Cross-Platform Strategy, Part 2, §2.5).
// ============================================================================

import { ScholarlyBaseService, Result, EventEmitter } from '../shared/base';

// ============================================================================
// SECTION 1: TYPE SYSTEM
// ============================================================================

export enum DeveloperTier {
  EXPLORER = 'EXPLORER',
  BUILDER = 'BUILDER',
  PROFESSIONAL = 'PROFESSIONAL',
  ENTERPRISE = 'ENTERPRISE',
}

export enum TutorialCategory {
  GETTING_STARTED = 'GETTING_STARTED',
  STORY_GENERATION = 'STORY_GENERATION',
  ILLUSTRATION = 'ILLUSTRATION',
  AUDIO_NARRATION = 'AUDIO_NARRATION',
  PHONICS_INTEGRATION = 'PHONICS_INTEGRATION',
  MARKETPLACE_PUBLISHING = 'MARKETPLACE_PUBLISHING',
  ADVANCED_CUSTOMISATION = 'ADVANCED_CUSTOMISATION',
  CLASSROOM_INTEGRATION = 'CLASSROOM_INTEGRATION',
}

export enum WebhookEvent {
  STORY_CREATED = 'story.created',
  STORY_ILLUSTRATED = 'story.illustrated',
  STORY_NARRATED = 'story.narrated',
  STORY_VALIDATED = 'story.validated',
  STORY_PUBLISHED = 'story.published',
  STORY_REJECTED = 'story.rejected',
  REVIEW_REQUESTED = 'review.requested',
  REVIEW_COMPLETED = 'review.completed',
  REVIEW_APPROVED = 'review.approved',
  REVIEW_REJECTED = 'review.rejected',
  ANALYTICS_READS_100 = 'analytics.reads.100',
  ANALYTICS_READS_1000 = 'analytics.reads.1000',
  ANALYTICS_READS_10000 = 'analytics.reads.10000',
  MARKETPLACE_SALE = 'marketplace.sale',
  MARKETPLACE_PAYOUT = 'marketplace.payout',
  BOUNTY_POSTED = 'bounty.posted',
  BOUNTY_AWARDED = 'bounty.awarded',
}

export interface DeveloperAccount {
  id: string;
  tenantId: string;
  userId: string;
  displayName: string;
  email: string;
  tier: DeveloperTier;
  apiKey: string;
  apiKeyCreatedAt: Date;
  webhooks: WebhookRegistration[];
  rateLimits: RateLimitConfig;
  createdAt: Date;
  lastActiveAt: Date;
  stats: DeveloperStats;
}

export interface DeveloperStats {
  totalApiCalls: number;
  totalStoriesCreated: number;
  totalStoriesPublished: number;
  totalReadsGenerated: number;
  totalEarnings: number;
  tierProgressPercent: number;
}

export interface RateLimitConfig {
  requestsPerDay: number;
  requestsPerMinute: number;
  concurrentRequests: number;
  storiesPerDay: number;
  illustrationsPerDay: number;
}

export interface WebhookRegistration {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  active: boolean;
  createdAt: Date;
  lastDeliveredAt?: Date;
  failureCount: number;
  maxRetries: number;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: Record<string, any>;
  statusCode?: number;
  responseBody?: string;
  deliveredAt?: Date;
  attempt: number;
  success: boolean;
  error?: string;
}

export interface APIEndpointDoc {
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  summary: string;
  description: string;
  category: string;
  authentication: 'api_key' | 'oauth2' | 'none';
  parameters: APIParameter[];
  requestBody?: APIRequestBody;
  responses: Record<string, APIResponse>;
  examples: APIExample[];
  rateLimit: string;
  sinceVersion: string;
}

export interface APIParameter {
  name: string;
  in: 'query' | 'path' | 'header' | 'cookie';
  required: boolean;
  type: string;
  description: string;
  example: any;
  enum?: string[];
}

export interface APIRequestBody {
  contentType: string;
  schema: Record<string, any>;
  example: Record<string, any>;
  required: boolean;
}

export interface APIResponse {
  description: string;
  contentType: string;
  schema: Record<string, any>;
  example: Record<string, any>;
}

export interface APIExample {
  title: string;
  description: string;
  request: { headers: Record<string, string>; body?: Record<string, any>; queryParams?: Record<string, string> };
  response: { status: number; headers: Record<string, string>; body: Record<string, any> };
}

export interface PlaygroundSession {
  id: string;
  developerId: string;
  createdAt: Date;
  expiresAt: Date;
  state: PlaygroundState;
  history: PlaygroundAction[];
}

export interface PlaygroundState {
  currentStory?: PlaygroundStory;
  phonicsConfig: PlaygroundPhonicsConfig;
  illustrationConfig: PlaygroundIllustrationConfig;
  narrationConfig: PlaygroundNarrationConfig;
}

export interface PlaygroundStory {
  id: string;
  title: string;
  pages: PlaygroundPage[];
  metadata: Record<string, any>;
  decodabilityScore: number;
  validationResult?: ValidationResult;
}

export interface PlaygroundPage {
  pageNumber: number;
  text: string;
  illustrationUrl?: string;
  audioUrl?: string;
  wordTimestamps?: { word: string; startMs: number; endMs: number }[];
}

export interface PlaygroundPhonicsConfig {
  phase: number;
  targetGPCs: string[];
  taughtGPCSet: string[];
  decodabilityThreshold: number;
  ageGroup: '3-5' | '5-7' | '7-9';
  vocabularyTier: 'tier1' | 'tier2' | 'tier3';
}

export interface PlaygroundIllustrationConfig {
  artStyle: string;
  characterConsistency: boolean;
  sceneDecomposition: boolean;
  culturalDiversity: boolean;
}

export interface PlaygroundNarrationConfig {
  voiceId: string;
  speed: number;
  wordLevelSync: boolean;
}

export interface ValidationResult {
  valid: boolean;
  decodabilityScore: number;
  safetyPassed: boolean;
  curriculumAligned: boolean;
  issues: ValidationIssue[];
}

export interface ValidationIssue {
  type: 'decodability' | 'safety' | 'curriculum' | 'vocabulary' | 'metadata';
  severity: 'error' | 'warning' | 'info';
  message: string;
  location?: { page: number; word?: string };
  suggestion: string;
}

export interface PlaygroundAction {
  type: string;
  timestamp: Date;
  input: Record<string, any>;
  output: Record<string, any>;
  durationMs: number;
  apiCallsUsed: number;
}

export interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  narrativeStructure: string;
  phonicsPhase: number;
  targetGPCs: string[];
  ageGroup: string;
  pageCount: number;
  artStylePreset: string;
  characterPresets: CharacterPreset[];
  usageCount: number;
  rating: number;
  createdBy: string;
  tags: string[];
}

export interface CharacterPreset {
  name: string;
  description: string;
  traits: string[];
  referenceImageUrl: string;
  styleNotes: string;
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  category: TutorialCategory;
  difficulty: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  estimatedMinutes: number;
  steps: TutorialStep[];
  prerequisites: string[];
  completionCriteria: string;
  tags: string[];
}

export interface TutorialStep {
  stepNumber: number;
  title: string;
  explanation: string;
  codeExample?: { language: string; code: string; explanation: string; runnable: boolean };
  expectedResult?: string;
  tips: string[];
}

// ============================================================================
// SECTION 2: DEVELOPER ACCOUNT MANAGEMENT
// ============================================================================

export class DeveloperAccountService extends ScholarlyBaseService {
  private accounts: Map<string, DeveloperAccount> = new Map();
  private apiKeyIndex: Map<string, string> = new Map();

  constructor(private events: EventEmitter) {
    super('developer-account-service');
  }

  async createAccount(
    tenantId: string, userId: string, displayName: string, email: string,
    tier: DeveloperTier = DeveloperTier.EXPLORER
  ): Promise<Result<DeveloperAccount>> {
    const id = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const apiKey = this.generateApiKey(tier);
    const rateLimits = this.getRateLimitsForTier(tier);

    const account: DeveloperAccount = {
      id, tenantId, userId, displayName, email, tier, apiKey,
      apiKeyCreatedAt: new Date(), webhooks: [], rateLimits,
      createdAt: new Date(), lastActiveAt: new Date(),
      stats: { totalApiCalls: 0, totalStoriesCreated: 0, totalStoriesPublished: 0,
               totalReadsGenerated: 0, totalEarnings: 0, tierProgressPercent: 0 },
    };

    this.accounts.set(id, account);
    this.apiKeyIndex.set(apiKey, id);
    this.events.emit('developer:account:created', { id, tier });
    return Result.ok(account);
  }

  async authenticateByApiKey(apiKey: string): Promise<Result<DeveloperAccount>> {
    const accountId = this.apiKeyIndex.get(apiKey);
    if (!accountId) return Result.fail('Invalid API key');
    const account = this.accounts.get(accountId);
    if (!account) return Result.fail('Account not found');
    account.lastActiveAt = new Date();
    account.stats.totalApiCalls++;
    return Result.ok(account);
  }

  async rotateApiKey(accountId: string): Promise<Result<{ newApiKey: string; expiresOldKeyAt: Date }>> {
    const account = this.accounts.get(accountId);
    if (!account) return Result.fail('Account not found');
    const oldKey = account.apiKey;
    const newKey = this.generateApiKey(account.tier);
    account.apiKey = newKey;
    account.apiKeyCreatedAt = new Date();
    this.apiKeyIndex.set(newKey, accountId);
    // Old key valid 24h for graceful rotation
    const expiresOldKeyAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    setTimeout(() => this.apiKeyIndex.delete(oldKey), 24 * 60 * 60 * 1000);
    this.events.emit('developer:apikey:rotated', { accountId });
    return Result.ok({ newApiKey: newKey, expiresOldKeyAt });
  }

  async upgradeTier(accountId: string, newTier: DeveloperTier): Promise<Result<DeveloperAccount>> {
    const account = this.accounts.get(accountId);
    if (!account) return Result.fail('Account not found');
    const tierOrder = [DeveloperTier.EXPLORER, DeveloperTier.BUILDER, DeveloperTier.PROFESSIONAL, DeveloperTier.ENTERPRISE];
    if (tierOrder.indexOf(newTier) <= tierOrder.indexOf(account.tier)) {
      return Result.fail('Can only upgrade to a higher tier');
    }
    account.tier = newTier;
    account.rateLimits = this.getRateLimitsForTier(newTier);
    this.events.emit('developer:tier:upgraded', { accountId, newTier });
    return Result.ok(account);
  }

  async getAccountStats(accountId: string): Promise<Result<DeveloperStats>> {
    const account = this.accounts.get(accountId);
    if (!account) return Result.fail('Account not found');
    return Result.ok(account.stats);
  }

  private generateApiKey(tier: DeveloperTier): string {
    const prefix = tier === DeveloperTier.ENTERPRISE ? 'sk_ent' :
                   tier === DeveloperTier.PROFESSIONAL ? 'sk_pro' :
                   tier === DeveloperTier.BUILDER ? 'sk_bld' : 'sk_exp';
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const randomPart = Array.from({ length: 32 }, () => chars[Math.floor(Math.random() * 62)]).join('');
    return `${prefix}_${randomPart}`;
  }

  private getRateLimitsForTier(tier: DeveloperTier): RateLimitConfig {
    const limits: Record<DeveloperTier, RateLimitConfig> = {
      [DeveloperTier.EXPLORER]: { requestsPerDay: 100, requestsPerMinute: 10, concurrentRequests: 2, storiesPerDay: 5, illustrationsPerDay: 10 },
      [DeveloperTier.BUILDER]: { requestsPerDay: 1000, requestsPerMinute: 30, concurrentRequests: 5, storiesPerDay: 50, illustrationsPerDay: 100 },
      [DeveloperTier.PROFESSIONAL]: { requestsPerDay: 10000, requestsPerMinute: 100, concurrentRequests: 20, storiesPerDay: 500, illustrationsPerDay: 1000 },
      [DeveloperTier.ENTERPRISE]: { requestsPerDay: 100000, requestsPerMinute: 500, concurrentRequests: 50, storiesPerDay: 5000, illustrationsPerDay: 10000 },
    };
    return limits[tier];
  }
}

// ============================================================================
// SECTION 3: INTERACTIVE API EXPLORER
// ============================================================================

export class APIExplorerService extends ScholarlyBaseService {
  private endpointDocs: Map<string, APIEndpointDoc> = new Map();

  constructor(private events: EventEmitter) {
    super('api-explorer-service');
    this.registerEndpoints();
  }

  private registerEndpoints(): void {
    const endpoints: APIEndpointDoc[] = [
      {
        path: '/api/v1/stories/generate', method: 'POST',
        summary: 'Generate a new decodable storybook',
        description: 'Creates a story constrained by phonics parameters. Every word is validated against the taught GPC set.',
        category: 'Story Generation', authentication: 'api_key', parameters: [],
        requestBody: {
          contentType: 'application/json', required: true,
          schema: {
            type: 'object',
            properties: {
              phonicsPhase: { type: 'integer', minimum: 1, maximum: 6 },
              targetGPCs: { type: 'array', items: { type: 'string' } },
              taughtGPCSet: { type: 'array', items: { type: 'string' } },
              theme: { type: 'string' },
              ageGroup: { type: 'string', enum: ['3-5', '5-7', '7-9'] },
              pageCount: { type: 'integer', minimum: 8, maximum: 24 },
              narrativeTemplate: { type: 'string' },
              decodabilityThreshold: { type: 'number', minimum: 0.5, maximum: 1.0 },
            },
            required: ['phonicsPhase', 'targetGPCs', 'taughtGPCSet', 'ageGroup'],
          },
          example: {
            phonicsPhase: 3, targetGPCs: ['sh', 'ch', 'th'],
            taughtGPCSet: ['s','a','t','p','i','n','m','d','g','o','c','k','ck','e','u','r','h','b','f','l','sh','ch','th'],
            theme: 'A day at the beach', ageGroup: '5-7', pageCount: 12,
            narrativeTemplate: 'adventure', decodabilityThreshold: 0.85,
          },
        },
        responses: {
          '200': {
            description: 'Story generated successfully',
            contentType: 'application/json',
            schema: { type: 'object', properties: { id: { type: 'string' }, title: { type: 'string' }, pages: { type: 'array' }, decodabilityScore: { type: 'number' }, metadata: { type: 'object' } } },
            example: { id: 'story_abc123', title: 'The Shell on the Shore', pages: [{ pageNumber: 1, text: 'Sam and Chip dash to the shore.' }], decodabilityScore: 0.92, metadata: { phonicsPhase: 3, targetGPCs: ['sh', 'ch'] } },
          },
          '400': { description: 'Invalid parameters', contentType: 'application/json', schema: {}, example: { error: 'targetGPCs must contain at least one GPC' } },
          '429': { description: 'Rate limit exceeded', contentType: 'application/json', schema: {}, example: { error: 'Daily story generation limit reached', retryAfter: 3600 } },
        },
        examples: [
          {
            title: 'Phase 3 beach story',
            description: 'Generate a 12-page story targeting digraphs sh, ch, th for ages 5-7',
            request: { headers: { 'Authorization': 'Bearer sk_exp_...', 'Content-Type': 'application/json' }, body: { phonicsPhase: 3, targetGPCs: ['sh', 'ch', 'th'], taughtGPCSet: ['s','a','t','p','i','n','m','d','g','o','c','k','ck','e','u','r','h','b','f','l','sh','ch','th'], theme: 'A day at the beach', ageGroup: '5-7', pageCount: 12 } },
            response: { status: 200, headers: { 'X-RateLimit-Remaining': '4' }, body: { id: 'story_abc123', title: 'The Shell on the Shore', decodabilityScore: 0.92 } },
          },
        ],
        rateLimit: '5 stories/day (Explorer), 50/day (Builder), 500/day (Professional)',
        sinceVersion: 'v1.0',
      },
      {
        path: '/api/v1/stories/{id}/illustrate', method: 'POST',
        summary: 'Generate illustrations for a story',
        description: 'Generates page illustrations using the configured art style and character consistency system.',
        category: 'Illustration', authentication: 'api_key', parameters: [
          { name: 'id', in: 'path', required: true, type: 'string', description: 'Story ID', example: 'story_abc123' },
        ],
        requestBody: {
          contentType: 'application/json', required: true,
          schema: { type: 'object', properties: { artStyle: { type: 'string' }, characterSheetId: { type: 'string' }, sceneDecomposition: { type: 'boolean' } } },
          example: { artStyle: 'watercolour', characterSheetId: 'char_fox1', sceneDecomposition: true },
        },
        responses: {
          '200': { description: 'Illustrations generated', contentType: 'application/json', schema: {}, example: { pages: [{ pageNumber: 1, illustrationUrl: 'https://cdn.scholarly.app/illustrations/abc123_p1.png' }] } },
        },
        examples: [],
        rateLimit: '10 illustrations/day (Explorer)', sinceVersion: 'v1.0',
      },
      {
        path: '/api/v1/stories/{id}/narrate', method: 'POST',
        summary: 'Generate audio narration with word-level timestamps',
        description: 'Produces ElevenLabs narration with per-word timing for karaoke-style read-along highlighting.',
        category: 'Audio', authentication: 'api_key', parameters: [
          { name: 'id', in: 'path', required: true, type: 'string', description: 'Story ID', example: 'story_abc123' },
        ],
        requestBody: {
          contentType: 'application/json', required: true,
          schema: { type: 'object', properties: { voiceId: { type: 'string' }, speed: { type: 'number' }, wordLevelSync: { type: 'boolean' } } },
          example: { voiceId: 'narrator_warm_female', speed: 0.85, wordLevelSync: true },
        },
        responses: {
          '200': { description: 'Narration generated', contentType: 'application/json', schema: {}, example: { pages: [{ pageNumber: 1, audioUrl: 'https://cdn.scholarly.app/audio/abc123_p1.mp3', wordTimestamps: [{ word: 'Sam', startMs: 0, endMs: 320 }] }] } },
        },
        examples: [], rateLimit: 'Included with illustration', sinceVersion: 'v1.0',
      },
      {
        path: '/api/v1/stories/{id}/validate', method: 'POST',
        summary: 'Validate decodability, safety, and curriculum alignment',
        description: 'Runs the full validation pipeline: grapheme-parser decodability check, content safety scan, vocabulary tier verification, and curriculum metadata validation.',
        category: 'Validation', authentication: 'api_key', parameters: [
          { name: 'id', in: 'path', required: true, type: 'string', description: 'Story ID', example: 'story_abc123' },
        ],
        responses: {
          '200': { description: 'Validation results', contentType: 'application/json', schema: {},
            example: { valid: true, decodabilityScore: 0.92, safetyPassed: true, curriculumAligned: true, issues: [] } },
        },
        requestBody: undefined, examples: [], rateLimit: 'Unlimited', sinceVersion: 'v1.0',
      },
      {
        path: '/api/v1/stories/{id}/submit', method: 'POST',
        summary: 'Submit story to community review pipeline',
        description: 'Enters the five-stage quality gate: automated validation, AI review, peer review, pilot testing, and library publication.',
        category: 'Publishing', authentication: 'api_key', parameters: [
          { name: 'id', in: 'path', required: true, type: 'string', description: 'Story ID', example: 'story_abc123' },
        ],
        responses: {
          '202': { description: 'Submission accepted', contentType: 'application/json', schema: {},
            example: { submissionId: 'sub_xyz789', status: 'AUTOMATED_VALIDATION', estimatedReviewTime: '48 hours' } },
        },
        requestBody: undefined, examples: [], rateLimit: '10 submissions/day', sinceVersion: 'v1.0',
      },
      {
        path: '/api/v1/library/search', method: 'GET',
        summary: 'Search the storybook library',
        description: 'Search by phonics phase, theme, age group, art style, and more. Returns curriculum-tagged results.',
        category: 'Library', authentication: 'api_key',
        parameters: [
          { name: 'phase', in: 'query', required: false, type: 'integer', description: 'Phonics phase (1-6)', example: 3 },
          { name: 'theme', in: 'query', required: false, type: 'string', description: 'Theme keyword', example: 'animals' },
          { name: 'ageGroup', in: 'query', required: false, type: 'string', description: 'Age group', example: '5-7', enum: ['3-5', '5-7', '7-9'] },
          { name: 'minDecodability', in: 'query', required: false, type: 'number', description: 'Minimum decodability score', example: 0.85 },
          { name: 'limit', in: 'query', required: false, type: 'integer', description: 'Results per page', example: 20 },
          { name: 'offset', in: 'query', required: false, type: 'integer', description: 'Pagination offset', example: 0 },
        ],
        responses: {
          '200': { description: 'Search results', contentType: 'application/json', schema: {},
            example: { results: [{ id: 'story_abc123', title: 'The Shell on the Shore', phase: 3, decodabilityScore: 0.92, rating: 4.7 }], total: 142, limit: 20, offset: 0 } },
        },
        requestBody: undefined, examples: [], rateLimit: '100 requests/minute', sinceVersion: 'v1.0',
      },
      {
        path: '/api/v1/library/recommend', method: 'GET',
        summary: 'Get personalised storybook recommendations',
        description: 'Returns stories matched to a learner\'s BKT mastery profile, preferred themes, and reading level.',
        category: 'Library', authentication: 'api_key',
        parameters: [
          { name: 'learnerId', in: 'query', required: true, type: 'string', description: 'Learner ID', example: 'learner_123' },
          { name: 'count', in: 'query', required: false, type: 'integer', description: 'Number of recommendations', example: 5 },
        ],
        responses: {
          '200': { description: 'Recommendations', contentType: 'application/json', schema: {},
            example: { recommendations: [{ storyId: 'story_abc123', title: 'The Shell on the Shore', matchScore: 0.94, reason: 'Targets sh/ch at learner\'s current mastery boundary' }] } },
        },
        requestBody: undefined, examples: [], rateLimit: '100 requests/minute', sinceVersion: 'v1.0',
      },
      {
        path: '/api/v1/characters', method: 'POST',
        summary: 'Create or update a character style sheet',
        description: 'Defines a character\'s visual identity for consistent illustration across story pages and series.',
        category: 'Characters', authentication: 'api_key', parameters: [],
        requestBody: {
          contentType: 'application/json', required: true,
          schema: { type: 'object', properties: { name: { type: 'string' }, description: { type: 'string' }, referenceImageUrl: { type: 'string' }, traits: { type: 'array' }, artStyleHints: { type: 'string' } } },
          example: { name: 'Finn the Fox', description: 'A curious red fox with bright green eyes, wearing a small blue scarf', traits: ['curious', 'adventurous', 'kind'], artStyleHints: 'Watercolour with soft edges, warm tones' },
        },
        responses: {
          '201': { description: 'Character created', contentType: 'application/json', schema: {},
            example: { id: 'char_fox1', name: 'Finn the Fox', styleSheetUrl: 'https://cdn.scholarly.app/characters/fox1_sheet.png' } },
        },
        examples: [], rateLimit: '20 characters/day', sinceVersion: 'v1.0',
      },
      {
        path: '/api/v1/gpcs/taught/{learnerId}', method: 'GET',
        summary: 'Get a learner\'s taught GPC set',
        description: 'Returns the full set of GPCs the learner has been introduced to, essential for targeting story generation.',
        category: 'Phonics', authentication: 'api_key',
        parameters: [
          { name: 'learnerId', in: 'path', required: true, type: 'string', description: 'Learner ID', example: 'learner_123' },
        ],
        responses: {
          '200': { description: 'Taught GPC set', contentType: 'application/json', schema: {},
            example: { learnerId: 'learner_123', phase: 3, taughtGPCs: ['s','a','t','p','i','n','m','d','g','o','c','k','ck','e','u','r','h','b','f','l','sh','ch','th'], lastUpdated: '2026-02-07T00:00:00Z' } },
        },
        requestBody: undefined, examples: [], rateLimit: '100 requests/minute', sinceVersion: 'v1.0',
      },
    ];

    for (const ep of endpoints) {
      this.endpointDocs.set(`${ep.method}:${ep.path}`, ep);
    }
  }

  async getEndpointDoc(method: string, path: string): Promise<Result<APIEndpointDoc>> {
    const doc = this.endpointDocs.get(`${method}:${path}`);
    if (!doc) return Result.fail(`Endpoint ${method} ${path} not found`);
    return Result.ok(doc);
  }

  async listEndpoints(category?: string): Promise<Result<APIEndpointDoc[]>> {
    let endpoints = Array.from(this.endpointDocs.values());
    if (category) {
      endpoints = endpoints.filter(e => e.category === category);
    }
    return Result.ok(endpoints);
  }

  async getCategories(): Promise<Result<string[]>> {
    const categories = new Set(Array.from(this.endpointDocs.values()).map(e => e.category));
    return Result.ok(Array.from(categories));
  }

  /** Execute a live API call from the explorer with sandboxed credentials */
  async executeExplorerCall(
    developerId: string, method: string, path: string,
    params: Record<string, any>, body?: Record<string, any>
  ): Promise<Result<{ status: number; headers: Record<string, string>; body: Record<string, any>; latencyMs: number }>> {
    const startTime = Date.now();

    // Validate endpoint exists
    const doc = this.endpointDocs.get(`${method}:${path}`);
    if (!doc) return Result.fail(`Unknown endpoint: ${method} ${path}`);

    // Validate required parameters
    for (const param of doc.parameters.filter(p => p.required)) {
      if (!(param.name in params)) {
        return Result.fail(`Missing required parameter: ${param.name}`);
      }
    }

    // In production, this proxies to the actual API with sandboxed credentials
    // For the explorer, we return the example response
    const exampleResponse = doc.responses['200'] || doc.responses['201'] || doc.responses['202'];
    if (!exampleResponse) return Result.fail('No example response available');

    const latencyMs = Date.now() - startTime;
    this.events.emit('explorer:call:executed', { developerId, method, path, latencyMs });

    return Result.ok({
      status: 200,
      headers: { 'Content-Type': 'application/json', 'X-Request-Id': `req_${Date.now()}` },
      body: exampleResponse.example,
      latencyMs,
    });
  }

  /** Generate code snippets for an endpoint */
  async generateCodeSnippet(
    method: string, path: string, language: 'typescript' | 'javascript' | 'curl' | 'python'
  ): Promise<Result<string>> {
    const doc = this.endpointDocs.get(`${method}:${path}`);
    if (!doc) return Result.fail(`Endpoint ${method} ${path} not found`);

    const generators: Record<string, () => string> = {
      curl: () => this.generateCurlSnippet(doc),
      javascript: () => this.generateJSSnippet(doc),
      typescript: () => this.generateTSSnippet(doc),
      python: () => this.generatePythonSnippet(doc),
    };

    const generator = generators[language];
    if (!generator) return Result.fail(`Unsupported language: ${language}`);
    return Result.ok(generator());
  }

  private generateCurlSnippet(doc: APIEndpointDoc): string {
    const lines = [`curl -X ${doc.method} 'https://api.scholarly.app${doc.path}'`];
    lines.push(`  -H 'Authorization: Bearer YOUR_API_KEY'`);
    if (doc.requestBody) {
      lines.push(`  -H 'Content-Type: ${doc.requestBody.contentType}'`);
      lines.push(`  -d '${JSON.stringify(doc.requestBody.example, null, 2)}'`);
    }
    return lines.join(' \\\n');
  }

  private generateJSSnippet(doc: APIEndpointDoc): string {
    return `const response = await fetch('https://api.scholarly.app${doc.path}', {
  method: '${doc.method}',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json',
  },${doc.requestBody ? `\n  body: JSON.stringify(${JSON.stringify(doc.requestBody.example, null, 4)}),` : ''}
});
const data = await response.json();
console.log(data);`;
  }

  private generateTSSnippet(doc: APIEndpointDoc): string {
    return `import { ScholarlyClient } from '@scholarly/content-sdk';

const client = new ScholarlyClient({ apiKey: 'YOUR_API_KEY' });
${doc.requestBody ? `\nconst result = await client.${this.methodToFunction(doc)}(${JSON.stringify(doc.requestBody.example, null, 2)});` : `\nconst result = await client.${this.methodToFunction(doc)}();`}
console.log(result);`;
  }

  private generatePythonSnippet(doc: APIEndpointDoc): string {
    return `import requests

response = requests.${doc.method.toLowerCase()}(
    'https://api.scholarly.app${doc.path}',
    headers={'Authorization': 'Bearer YOUR_API_KEY'},${doc.requestBody ? `\n    json=${JSON.stringify(doc.requestBody.example, null, 4)},` : ''}
)
print(response.json())`;
  }

  private methodToFunction(doc: APIEndpointDoc): string {
    const parts = doc.path.split('/').filter(p => p && !p.startsWith('{') && p !== 'api' && p !== 'v1');
    return parts.join('.');
  }
}

// ============================================================================
// SECTION 4: STORYBOOK PLAYGROUND
// The playground is where the developer experience comes alive — a sandbox
// where creators can experiment with every parameter of story generation,
// see results in real-time, and understand how phonics constraints shape
// the creative output. Like a musical instrument showroom where you can
// play every instrument before buying — except here, the instruments are
// AI-powered content creation tools.
// ============================================================================

export class StorybookPlaygroundService extends ScholarlyBaseService {
  private sessions: Map<string, PlaygroundSession> = new Map();
  private readonly SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

  constructor(private events: EventEmitter) {
    super('storybook-playground');
  }

  async createSession(developerId: string): Promise<Result<PlaygroundSession>> {
    const session: PlaygroundSession = {
      id: `pg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      developerId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.SESSION_TTL_MS),
      state: {
        phonicsConfig: {
          phase: 2, targetGPCs: ['ck', 'ff', 'll', 'ss'],
          taughtGPCSet: ['s','a','t','p','i','n','m','d','g','o','c','k','ck','e','u','r','h','b','f','l'],
          decodabilityThreshold: 0.85, ageGroup: '5-7', vocabularyTier: 'tier1',
        },
        illustrationConfig: {
          artStyle: 'watercolour', characterConsistency: true,
          sceneDecomposition: false, culturalDiversity: true,
        },
        narrationConfig: { voiceId: 'narrator_warm_female', speed: 0.85, wordLevelSync: true },
      },
      history: [],
    };

    this.sessions.set(session.id, session);
    this.events.emit('playground:session:created', { sessionId: session.id, developerId });
    return Result.ok(session);
  }

  async generateStory(sessionId: string, config?: Partial<PlaygroundPhonicsConfig>): Promise<Result<PlaygroundStory>> {
    const session = this.sessions.get(sessionId);
    if (!session) return Result.fail('Session not found or expired');
    if (new Date() > session.expiresAt) return Result.fail('Session expired');

    if (config) {
      Object.assign(session.state.phonicsConfig, config);
    }

    const startTime = Date.now();
    const pc = session.state.phonicsConfig;

    // Simulate story generation using configured phonics constraints
    const story: PlaygroundStory = {
      id: `story_pg_${Date.now()}`,
      title: this.generateTitle(pc),
      pages: this.generatePages(pc),
      metadata: {
        phonicsPhase: pc.phase,
        targetGPCs: pc.targetGPCs,
        ageGroup: pc.ageGroup,
        vocabularyTier: pc.vocabularyTier,
        narrativeStructure: 'adventure',
        generatedAt: new Date().toISOString(),
      },
      decodabilityScore: 0.88 + Math.random() * 0.10, // 88-98% range
    };

    // Run validation
    story.validationResult = await this.validateStory(story, pc);

    session.state.currentStory = story;
    session.history.push({
      type: 'generate_story', timestamp: new Date(),
      input: { phonicsConfig: pc },
      output: { storyId: story.id, title: story.title, decodabilityScore: story.decodabilityScore },
      durationMs: Date.now() - startTime, apiCallsUsed: 1,
    });

    this.events.emit('playground:story:generated', { sessionId, storyId: story.id });
    return Result.ok(story);
  }

  async illustrateStory(sessionId: string, config?: Partial<PlaygroundIllustrationConfig>): Promise<Result<PlaygroundStory>> {
    const session = this.sessions.get(sessionId);
    if (!session) return Result.fail('Session not found');
    if (!session.state.currentStory) return Result.fail('No story to illustrate — generate one first');

    if (config) Object.assign(session.state.illustrationConfig, config);

    const startTime = Date.now();
    const ic = session.state.illustrationConfig;

    // Simulate illustration generation
    for (const page of session.state.currentStory.pages) {
      page.illustrationUrl = `https://cdn.scholarly.app/playground/${session.id}/p${page.pageNumber}_${ic.artStyle}.png`;
    }

    session.history.push({
      type: 'illustrate_story', timestamp: new Date(),
      input: { illustrationConfig: ic },
      output: { pagesIllustrated: session.state.currentStory.pages.length },
      durationMs: Date.now() - startTime, apiCallsUsed: session.state.currentStory.pages.length,
    });

    return Result.ok(session.state.currentStory);
  }

  async narrateStory(sessionId: string, config?: Partial<PlaygroundNarrationConfig>): Promise<Result<PlaygroundStory>> {
    const session = this.sessions.get(sessionId);
    if (!session) return Result.fail('Session not found');
    if (!session.state.currentStory) return Result.fail('No story to narrate');

    if (config) Object.assign(session.state.narrationConfig, config);

    const startTime = Date.now();
    const nc = session.state.narrationConfig;

    // Simulate narration with word-level timestamps
    for (const page of session.state.currentStory.pages) {
      page.audioUrl = `https://cdn.scholarly.app/playground/${session.id}/p${page.pageNumber}_audio.mp3`;
      if (nc.wordLevelSync) {
        const words = page.text.split(/\s+/);
        let currentMs = 0;
        page.wordTimestamps = words.map(word => {
          const duration = Math.floor(200 + word.length * 60 * (1 / nc.speed));
          const ts = { word, startMs: currentMs, endMs: currentMs + duration };
          currentMs += duration + 50; // 50ms gap between words
          return ts;
        });
      }
    }

    session.history.push({
      type: 'narrate_story', timestamp: new Date(),
      input: { narrationConfig: nc },
      output: { pagesNarrated: session.state.currentStory.pages.length, wordLevelSync: nc.wordLevelSync },
      durationMs: Date.now() - startTime, apiCallsUsed: 1,
    });

    return Result.ok(session.state.currentStory);
  }

  async updatePhonicsConfig(sessionId: string, config: Partial<PlaygroundPhonicsConfig>): Promise<Result<PlaygroundPhonicsConfig>> {
    const session = this.sessions.get(sessionId);
    if (!session) return Result.fail('Session not found');
    Object.assign(session.state.phonicsConfig, config);
    return Result.ok(session.state.phonicsConfig);
  }

  async getSessionHistory(sessionId: string): Promise<Result<PlaygroundAction[]>> {
    const session = this.sessions.get(sessionId);
    if (!session) return Result.fail('Session not found');
    return Result.ok(session.history);
  }

  private async validateStory(story: PlaygroundStory, config: PlaygroundPhonicsConfig): Promise<ValidationResult> {
    const issues: ValidationIssue[] = [];

    // Decodability check
    if (story.decodabilityScore < config.decodabilityThreshold) {
      issues.push({
        type: 'decodability', severity: 'error',
        message: `Decodability score ${(story.decodabilityScore * 100).toFixed(1)}% below threshold ${(config.decodabilityThreshold * 100).toFixed(0)}%`,
        suggestion: 'Reduce vocabulary complexity or add more taught GPCs',
      });
    }

    // Check each page for non-decodable words
    for (const page of story.pages) {
      const words = page.text.toLowerCase().replace(/[^a-z\s']/g, '').split(/\s+/);
      for (const word of words) {
        if (this.isHighFrequencyException(word)) continue;
        // Simplified decodability check — real implementation uses grapheme-parser DAG
        if (word.length > 6 && Math.random() > 0.9) {
          issues.push({
            type: 'decodability', severity: 'warning',
            message: `Word "${word}" may be challenging for Phase ${config.phase} readers`,
            location: { page: page.pageNumber, word },
            suggestion: `Consider replacing with a simpler synonym`,
          });
        }
      }
    }

    return {
      valid: issues.filter(i => i.severity === 'error').length === 0,
      decodabilityScore: story.decodabilityScore,
      safetyPassed: true,
      curriculumAligned: true,
      issues,
    };
  }

  private isHighFrequencyException(word: string): boolean {
    const exceptions = new Set(['the', 'to', 'i', 'no', 'go', 'into', 'he', 'she', 'we', 'me', 'be', 'was', 'you', 'they', 'all', 'are', 'my', 'her', 'said', 'have', 'like', 'so', 'do', 'some', 'come', 'were', 'there', 'little', 'one', 'when', 'out', 'what']);
    return exceptions.has(word);
  }

  private generateTitle(config: PlaygroundPhonicsConfig): string {
    const templates: Record<string, string[]> = {
      '3-5': ['The Big Red Bus', 'Pip and the Pot', 'Sam Sat on a Mat'],
      '5-7': ['The Ship on the Shore', 'Chip and the Chest', 'A Trip to the Farm'],
      '7-9': ['The Knight\'s Quest', 'Through the Forest Path', 'The Lighthouse Secret'],
    };
    const titles = templates[config.ageGroup] || templates['5-7'];
    return titles[Math.floor(Math.random() * titles.length)];
  }

  private generatePages(config: PlaygroundPhonicsConfig): PlaygroundPage[] {
    const pageTexts: Record<string, string[]> = {
      '3-5': [
        'Sam sat on a mat.', 'The cat sat on Sam.', 'Sam and the cat nap.',
        'Tap, tap, tap! Sam got up.', 'Sam and the cat ran.', 'The cat sat back on the mat.',
      ],
      '5-7': [
        'Chip and Sham dash to the shop.', 'The ship rests on the thin rocks.',
        'Rich fish swim in the pond.', 'Chip has a shell from the shore.',
        'Sham checks the path for shells.', 'Chip and Sham chat at the bench.',
        'The sun sets on the big ship.', 'Chip and Sham rush back to the hut.',
      ],
      '7-9': [
        'The knight stood at the edge of the forest.', 'Through the thick mist, she could see a light.',
        'The bridge stretched across the rushing stream.', 'Each step brought her closer to the tower.',
        'She reached the door and knocked three times.', 'Inside, shelves held hundreds of ancient scrolls.',
        'The answers she sought were written right here.', 'She smiled and began to read the first page.',
      ],
    };
    const texts = pageTexts[config.ageGroup] || pageTexts['5-7'];
    return texts.map((text, i) => ({ pageNumber: i + 1, text }));
  }
}

// ============================================================================
// SECTION 5: TEMPLATE GALLERY
// ============================================================================

export class TemplateGalleryService extends ScholarlyBaseService {
  private templates: Map<string, StoryTemplate> = new Map();

  constructor(private events: EventEmitter) {
    super('template-gallery');
    this.seedTemplates();
  }

  private seedTemplates(): void {
    const seeds: StoryTemplate[] = [
      {
        id: 'tmpl_adventure_p2', name: 'Phase 2 Adventure Quest',
        description: 'A hero\'s journey template for Phase 2 readers, featuring CVC words and simple digraphs.',
        category: 'adventure', narrativeStructure: 'hero_journey',
        phonicsPhase: 2, targetGPCs: ['ck', 'ff', 'll', 'ss'], ageGroup: '5-7',
        pageCount: 8, artStylePreset: 'watercolour',
        characterPresets: [
          { name: 'Kit the Cat', description: 'A small tabby cat with curious eyes', traits: ['brave', 'curious'], referenceImageUrl: '', styleNotes: 'Round shapes, warm colours' },
        ],
        usageCount: 1247, rating: 4.8, createdBy: 'Scholarly', tags: ['adventure', 'animals', 'phase2'],
      },
      {
        id: 'tmpl_cumulative_p1', name: 'Phase 1 Cumulative Tale',
        description: 'A "The House that Jack Built" style cumulative story using only Phase 1 GPCs (s,a,t,p,i,n).',
        category: 'cumulative', narrativeStructure: 'cumulative',
        phonicsPhase: 1, targetGPCs: ['s', 'a', 't', 'p', 'i', 'n'], ageGroup: '3-5',
        pageCount: 6, artStylePreset: 'flat_vector',
        characterPresets: [
          { name: 'Pat', description: 'A friendly child with a big smile', traits: ['happy', 'helpful'], referenceImageUrl: '', styleNotes: 'Simple shapes, bright primary colours' },
        ],
        usageCount: 2890, rating: 4.9, createdBy: 'Scholarly', tags: ['cumulative', 'simple', 'phase1'],
      },
      {
        id: 'tmpl_information_p3', name: 'Phase 3 Information Text',
        description: 'Non-fiction template for Phase 3, teaching about real-world topics while practising digraphs.',
        category: 'information', narrativeStructure: 'information',
        phonicsPhase: 3, targetGPCs: ['sh', 'ch', 'th', 'ng'], ageGroup: '5-7',
        pageCount: 12, artStylePreset: 'soft_3d',
        characterPresets: [],
        usageCount: 856, rating: 4.6, createdBy: 'Scholarly', tags: ['non-fiction', 'educational', 'phase3'],
      },
      {
        id: 'tmpl_problem_p4', name: 'Phase 4 Problem-Solution',
        description: 'A problem-solution narrative template targeting adjacent consonant clusters.',
        category: 'problem_solution', narrativeStructure: 'problem_solution',
        phonicsPhase: 4, targetGPCs: ['bl', 'br', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gr'], ageGroup: '7-9',
        pageCount: 16, artStylePreset: 'crayon',
        characterPresets: [
          { name: 'Grace', description: 'A determined girl who loves solving puzzles', traits: ['determined', 'clever'], referenceImageUrl: '', styleNotes: 'Detailed illustrations with warm lighting' },
        ],
        usageCount: 623, rating: 4.7, createdBy: 'Scholarly', tags: ['problem-solving', 'clusters', 'phase4'],
      },
      {
        id: 'tmpl_series_p5', name: 'Phase 5 Mystery Series',
        description: 'Multi-book mystery series template for Phase 5, featuring alternative spellings and split digraphs.',
        category: 'mystery', narrativeStructure: 'mystery',
        phonicsPhase: 5, targetGPCs: ['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'ew', 'oe', 'a_e', 'e_e', 'i_e', 'o_e', 'u_e'], ageGroup: '7-9',
        pageCount: 24, artStylePreset: 'papercraft',
        characterPresets: [
          { name: 'Detective Ray', description: 'A boy detective with a magnifying glass and a keen eye', traits: ['observant', 'logical', 'persistent'], referenceImageUrl: '', styleNotes: 'Slightly moody atmosphere, warm indoor lighting' },
        ],
        usageCount: 412, rating: 4.5, createdBy: 'Scholarly', tags: ['mystery', 'series', 'split-digraphs', 'phase5'],
      },
    ];

    for (const template of seeds) {
      this.templates.set(template.id, template);
    }
  }

  async listTemplates(filters?: { phase?: number; category?: string; ageGroup?: string }): Promise<Result<StoryTemplate[]>> {
    let results = Array.from(this.templates.values());
    if (filters?.phase) results = results.filter(t => t.phonicsPhase === filters.phase);
    if (filters?.category) results = results.filter(t => t.category === filters.category);
    if (filters?.ageGroup) results = results.filter(t => t.ageGroup === filters.ageGroup);
    results.sort((a, b) => b.usageCount - a.usageCount);
    return Result.ok(results);
  }

  async getTemplate(id: string): Promise<Result<StoryTemplate>> {
    const template = this.templates.get(id);
    if (!template) return Result.fail(`Template ${id} not found`);
    return Result.ok(template);
  }

  async forkTemplate(id: string, developerId: string, modifications: Partial<StoryTemplate>): Promise<Result<StoryTemplate>> {
    const original = this.templates.get(id);
    if (!original) return Result.fail(`Template ${id} not found`);

    const forked: StoryTemplate = {
      ...original,
      ...modifications,
      id: `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdBy: developerId,
      usageCount: 0,
      rating: 0,
      tags: [...(original.tags || []), 'forked'],
    };

    this.templates.set(forked.id, forked);
    this.events.emit('template:forked', { originalId: id, forkedId: forked.id, developerId });
    return Result.ok(forked);
  }

  async rateTemplate(id: string, rating: number): Promise<Result<StoryTemplate>> {
    const template = this.templates.get(id);
    if (!template) return Result.fail(`Template ${id} not found`);
    if (rating < 1 || rating > 5) return Result.fail('Rating must be between 1 and 5');
    // Simple moving average for demonstration
    template.rating = (template.rating * template.usageCount + rating) / (template.usageCount + 1);
    return Result.ok(template);
  }
}

// ============================================================================
// SECTION 6: SDK TUTORIAL ENGINE
// ============================================================================

export class TutorialService extends ScholarlyBaseService {
  private tutorials: Map<string, Tutorial> = new Map();

  constructor(private events: EventEmitter) {
    super('tutorial-service');
    this.seedTutorials();
  }

  private seedTutorials(): void {
    const tutorials: Tutorial[] = [
      {
        id: 'tut_001', title: 'Create Your First Decodable Storybook',
        description: 'A step-by-step guide to generating your first phonics-aligned storybook using the Scholarly Content SDK.',
        category: TutorialCategory.GETTING_STARTED, difficulty: 'BEGINNER',
        estimatedMinutes: 15, prerequisites: [], completionCriteria: 'Successfully generate and validate a Phase 2 storybook',
        tags: ['getting-started', 'sdk', 'first-story'],
        steps: [
          {
            stepNumber: 1, title: 'Install the SDK',
            explanation: 'The Scholarly Content SDK is available as an npm package. Install it alongside TypeScript for the best development experience.',
            codeExample: { language: 'typescript', code: 'npm install @scholarly/content-sdk', explanation: 'Installs the SDK and all required dependencies', runnable: false },
            tips: ['The SDK requires Node.js 18+', 'TypeScript is recommended but not required'],
          },
          {
            stepNumber: 2, title: 'Configure your API key',
            explanation: 'Every API call requires authentication. Create a client instance with your API key from the Developer Portal.',
            codeExample: { language: 'typescript', code: `import { ScholarlyClient } from '@scholarly/content-sdk';\n\nconst client = new ScholarlyClient({\n  apiKey: process.env.SCHOLARLY_API_KEY!,\n});`, explanation: 'The client handles authentication, rate limiting, and retries automatically', runnable: true },
            tips: ['Store your API key in environment variables, never in code', 'The Explorer tier gives you 5 free stories per day'],
          },
          {
            stepNumber: 3, title: 'Define your phonics target',
            explanation: 'The most important step: telling the engine what this child has been taught. The taughtGPCSet is the full set of grapheme-phoneme correspondences the learner knows. The targetGPCs are the ones you want this story to especially practise.',
            codeExample: { language: 'typescript', code: `const phonicsConfig = {\n  phonicsPhase: 2,\n  targetGPCs: ['ck', 'ff', 'll', 'ss'],\n  taughtGPCSet: [\n    's','a','t','p','i','n','m','d','g','o','c','k','ck',\n    'e','u','r','h','b','f','ff','l','ll','ss'\n  ],\n  ageGroup: '5-7' as const,\n  decodabilityThreshold: 0.85,\n};`, explanation: 'Phase 2 targets: ck, ff, ll, ss double consonants', runnable: false },
            tips: ['The decodability threshold of 85% means 85% of words must use only taught GPCs', 'High-frequency exception words (the, to, I) don\'t count against decodability'],
          },
          {
            stepNumber: 4, title: 'Generate your story',
            explanation: 'Now the magic happens. The engine uses Claude to generate a narrative that is both engaging and phonically constrained — every word is checked against the taught GPC set.',
            codeExample: { language: 'typescript', code: `const story = await client.stories.generate({\n  ...phonicsConfig,\n  theme: 'A trip to the park',\n  pageCount: 8,\n  narrativeTemplate: 'adventure',\n});\n\nconsole.log(story.title); // e.g., "Packing for the Park"\nconsole.log(story.decodabilityScore); // e.g., 0.92\nconsole.log(story.pages[0].text); // "Pat and Russ pack a big bag."`, explanation: 'The engine generates, validates, and returns a complete storybook', runnable: true },
            tips: ['Generation typically takes 3-5 seconds', 'If the decodability score is below your threshold, the engine automatically regenerates'],
          },
          {
            stepNumber: 5, title: 'Validate the result',
            explanation: 'Always validate before publishing. The validator checks decodability, content safety, vocabulary tier, and curriculum alignment independently.',
            codeExample: { language: 'typescript', code: `const validation = await client.stories.validate(story.id);\n\nif (validation.valid) {\n  console.log('Story is ready for readers!');\n} else {\n  console.log('Issues found:', validation.issues);\n}`, explanation: 'Validation is separate from generation so you can also validate manually-written stories', runnable: true },
            tips: ['Validation is free and unlimited — validate as often as you like', 'The validator uses the same grapheme-parser DAG engine that powers the BKT system'],
          },
        ],
      },
      {
        id: 'tut_002', title: 'Add Illustrations to Your Storybook',
        description: 'Learn how to generate consistent, age-appropriate illustrations using character style sheets and art style presets.',
        category: TutorialCategory.ILLUSTRATION, difficulty: 'INTERMEDIATE',
        estimatedMinutes: 20, prerequisites: ['tut_001'],
        completionCriteria: 'Generate illustrations with character consistency across all pages',
        tags: ['illustration', 'character-sheets', 'art-styles'],
        steps: [
          {
            stepNumber: 1, title: 'Choose an art style',
            explanation: 'The illustration engine supports 30+ curated art styles. Each style is optimised for children\'s book illustration and has been tested across thousands of pages for consistency.',
            codeExample: { language: 'typescript', code: `const styles = await client.illustrations.listStyles();\n// Available: watercolour, flat_vector, soft_3d, crayon,\n// papercraft, storybook_classic, manga_kids, ...`, explanation: 'Each style defines colour palettes, line weights, and rendering parameters', runnable: true },
            tips: ['Softer styles (watercolour, crayon) work best for ages 3-5', 'More detailed styles (storybook_classic, soft_3d) suit ages 7-9'],
          },
          {
            stepNumber: 2, title: 'Create a character style sheet',
            explanation: 'Character consistency is the holy grail of AI-generated storybooks. A style sheet anchors the character\'s appearance across all pages.',
            codeExample: { language: 'typescript', code: `const character = await client.characters.create({\n  name: 'Finn the Fox',\n  description: 'A small, curious red fox with bright green eyes and a tiny blue scarf',\n  traits: ['curious', 'adventurous', 'kind'],\n  artStyleHints: 'Warm watercolour with soft edges',\n});`, explanation: 'The engine generates a reference sheet that guides all subsequent illustrations', runnable: true },
            tips: ['Be specific about colours and distinguishing features', 'Characters persist across stories in a series'],
          },
          {
            stepNumber: 3, title: 'Generate illustrations',
            explanation: 'With your style and characters defined, generate illustrations for every page of the story.',
            codeExample: { language: 'typescript', code: `const illustrated = await client.stories.illustrate(story.id, {\n  artStyle: 'watercolour',\n  characterSheetId: character.id,\n  sceneDecomposition: true, // Enables parallax layers\n});`, explanation: 'Scene decomposition creates separate background, character, and foreground layers', runnable: true },
            tips: ['Illustration takes 10-30 seconds per page', 'Scene decomposition adds ~50% to generation time but enables beautiful parallax effects'],
          },
        ],
      },
      {
        id: 'tut_003', title: 'Build a Custom Story Generator for Your Classroom',
        description: 'Create a classroom tool that generates phonics-targeted storybooks based on your specific scope & sequence.',
        category: TutorialCategory.CLASSROOM_INTEGRATION, difficulty: 'ADVANCED',
        estimatedMinutes: 45, prerequisites: ['tut_001', 'tut_002'],
        completionCriteria: 'Deploy a classroom story generator that pulls learner data and generates targeted stories',
        tags: ['classroom', 'integration', 'custom-generator', 'advanced'],
        steps: [
          {
            stepNumber: 1, title: 'Fetch learner mastery data',
            explanation: 'The first step is understanding where each learner is in their phonics journey. The BKT API provides real-time mastery estimates.',
            codeExample: { language: 'typescript', code: `const learnerData = await client.gpcs.getTaughtSet('learner_123');\n// Returns: { phase: 3, taughtGPCs: [...], masteryByGPC: { 'sh': 0.82, 'ch': 0.67, ... } }`, explanation: 'masteryByGPC gives P(mastered) for each GPC — use this to target weak areas', runnable: true },
            tips: ['Mastery below 0.8 suggests the learner needs more practice', 'The BKT engine updates after every reading session'],
          },
          {
            stepNumber: 2, title: 'Identify target GPCs',
            explanation: 'Choose GPCs that the learner has been introduced to but hasn\'t yet mastered — the "zone of proximal development" for phonics.',
            codeExample: { language: 'typescript', code: `function identifyTargets(mastery: Record<string, number>): string[] {\n  return Object.entries(mastery)\n    .filter(([_, m]) => m >= 0.3 && m < 0.8)\n    .sort(([,a], [,b]) => a - b)\n    .slice(0, 4)\n    .map(([gpc]) => gpc);\n}`, explanation: 'Targets GPCs in the 30-80% mastery range — introduced but not yet mastered', runnable: false },
            tips: ['Avoid targeting GPCs below 30% — these need direct instruction first', 'Three to four target GPCs per story is optimal'],
          },
          {
            stepNumber: 3, title: 'Generate and assign',
            explanation: 'Generate a personalised storybook and add it to the learner\'s reading queue.',
            codeExample: { language: 'typescript', code: `const targetGPCs = identifyTargets(learnerData.masteryByGPC);\nconst story = await client.stories.generate({\n  phonicsPhase: learnerData.phase,\n  targetGPCs,\n  taughtGPCSet: learnerData.taughtGPCs,\n  ageGroup: '5-7',\n  theme: learnerData.preferredTheme || 'animals',\n});\nawait client.library.assignToLearner(story.id, 'learner_123');`, explanation: 'The learner sees this book in their "Ready for You" shelf', runnable: true },
            tips: ['Generate stories during off-peak hours to save rate limits', 'Use webhooks to get notified when the learner finishes reading'],
          },
        ],
      },
    ];

    for (const tutorial of tutorials) {
      this.tutorials.set(tutorial.id, tutorial);
    }
  }

  async listTutorials(filters?: { category?: TutorialCategory; difficulty?: string }): Promise<Result<Tutorial[]>> {
    let results = Array.from(this.tutorials.values());
    if (filters?.category) results = results.filter(t => t.category === filters.category);
    if (filters?.difficulty) results = results.filter(t => t.difficulty === filters.difficulty);
    return Result.ok(results);
  }

  async getTutorial(id: string): Promise<Result<Tutorial>> {
    const tutorial = this.tutorials.get(id);
    if (!tutorial) return Result.fail(`Tutorial ${id} not found`);
    return Result.ok(tutorial);
  }

  async trackProgress(developerId: string, tutorialId: string, completedStep: number): Promise<Result<{ completed: boolean; nextStep?: number }>> {
    const tutorial = this.tutorials.get(tutorialId);
    if (!tutorial) return Result.fail(`Tutorial ${tutorialId} not found`);

    const completed = completedStep >= tutorial.steps.length;
    this.events.emit('tutorial:step:completed', { developerId, tutorialId, step: completedStep, completed });

    return Result.ok({
      completed,
      nextStep: completed ? undefined : completedStep + 1,
    });
  }
}

// ============================================================================
// SECTION 7: WEBHOOK MANAGEMENT
// Webhooks are the nervous system that connects the Scholarly platform to
// developers' own systems. When a story is published, when a review completes,
// when a storybook hits 1,000 reads — the developer gets notified in real time.
// ============================================================================

export class WebhookService extends ScholarlyBaseService {
  private webhooks: Map<string, WebhookRegistration> = new Map();
  private deliveryLog: WebhookDelivery[] = [];
  private readonly MAX_RETRIES = 5;
  private readonly RETRY_DELAYS_MS = [1000, 5000, 30000, 300000, 3600000]; // 1s, 5s, 30s, 5m, 1h

  constructor(private events: EventEmitter) {
    super('webhook-service');
  }

  async register(
    developerId: string, url: string, events: WebhookEvent[]
  ): Promise<Result<WebhookRegistration>> {
    // Validate URL
    try { new URL(url); } catch { return Result.fail('Invalid webhook URL'); }
    if (!url.startsWith('https://')) return Result.fail('Webhook URL must use HTTPS');

    // Validate events
    const validEvents = Object.values(WebhookEvent);
    for (const event of events) {
      if (!validEvents.includes(event)) return Result.fail(`Invalid event: ${event}`);
    }

    // Generate HMAC secret for payload verification
    const secret = `whsec_${Array.from({ length: 32 }, () =>
      'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]
    ).join('')}`;

    const webhook: WebhookRegistration = {
      id: `wh_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url, events, secret, active: true,
      createdAt: new Date(), failureCount: 0, maxRetries: this.MAX_RETRIES,
    };

    this.webhooks.set(webhook.id, webhook);
    this.events.emit('webhook:registered', { webhookId: webhook.id, developerId, events });

    return Result.ok(webhook);
  }

  async unregister(webhookId: string): Promise<Result<void>> {
    if (!this.webhooks.has(webhookId)) return Result.fail('Webhook not found');
    this.webhooks.delete(webhookId);
    this.events.emit('webhook:unregistered', { webhookId });
    return Result.ok(undefined);
  }

  async deliver(event: WebhookEvent, payload: Record<string, any>): Promise<Result<WebhookDelivery[]>> {
    const matchingWebhooks = Array.from(this.webhooks.values())
      .filter(wh => wh.active && wh.events.includes(event));

    const deliveries: WebhookDelivery[] = [];

    for (const webhook of matchingWebhooks) {
      const delivery = await this.deliverToWebhook(webhook, event, payload);
      deliveries.push(delivery);

      if (!delivery.success) {
        webhook.failureCount++;
        // Disable webhook after too many consecutive failures
        if (webhook.failureCount >= 10) {
          webhook.active = false;
          this.events.emit('webhook:disabled', {
            webhookId: webhook.id,
            reason: 'Too many consecutive failures',
          });
        }
        // Schedule retry
        this.scheduleRetry(webhook, event, payload, 1);
      } else {
        webhook.failureCount = 0; // Reset on success
        webhook.lastDeliveredAt = new Date();
      }
    }

    return Result.ok(deliveries);
  }

  private async deliverToWebhook(
    webhook: WebhookRegistration, event: WebhookEvent, payload: Record<string, any>
  ): Promise<WebhookDelivery> {
    const delivery: WebhookDelivery = {
      id: `del_${Date.now()}`,
      webhookId: webhook.id,
      event,
      payload,
      attempt: 1,
      success: false,
    };

    try {
      // In production: HMAC-SHA256 signature, POST to webhook.url
      // const signature = crypto.createHmac('sha256', webhook.secret)
      //   .update(JSON.stringify(payload)).digest('hex');
      // const response = await fetch(webhook.url, { ... });

      // Simulate successful delivery
      delivery.statusCode = 200;
      delivery.success = true;
      delivery.deliveredAt = new Date();
    } catch (error) {
      delivery.error = error instanceof Error ? error.message : 'Unknown error';
      delivery.success = false;
    }

    this.deliveryLog.push(delivery);
    return delivery;
  }

  private scheduleRetry(
    webhook: WebhookRegistration, event: WebhookEvent, payload: Record<string, any>, attempt: number
  ): void {
    if (attempt > this.MAX_RETRIES) return;

    const delayMs = this.RETRY_DELAYS_MS[attempt - 1] || this.RETRY_DELAYS_MS[this.RETRY_DELAYS_MS.length - 1];

    setTimeout(async () => {
      const delivery = await this.deliverToWebhook(webhook, event, payload);
      delivery.attempt = attempt + 1;

      if (!delivery.success && attempt < this.MAX_RETRIES) {
        this.scheduleRetry(webhook, event, payload, attempt + 1);
      }
    }, delayMs);
  }

  async getDeliveryLog(webhookId: string, limit: number = 50): Promise<Result<WebhookDelivery[]>> {
    const deliveries = this.deliveryLog
      .filter(d => d.webhookId === webhookId)
      .slice(-limit);
    return Result.ok(deliveries);
  }

  async testWebhook(webhookId: string): Promise<Result<WebhookDelivery>> {
    const webhook = this.webhooks.get(webhookId);
    if (!webhook) return Result.fail('Webhook not found');

    const testPayload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      message: 'This is a test delivery from the Scholarly Developer Portal',
    };

    const delivery = await this.deliverToWebhook(webhook, WebhookEvent.STORY_CREATED, testPayload);
    return Result.ok(delivery);
  }
}

// ============================================================================
// SECTION 8: DEVELOPER PORTAL ORCHESTRATOR
// ============================================================================

export class DeveloperPortalOrchestrator extends ScholarlyBaseService {
  public readonly accounts: DeveloperAccountService;
  public readonly explorer: APIExplorerService;
  public readonly playground: StorybookPlaygroundService;
  public readonly templates: TemplateGalleryService;
  public readonly tutorials: TutorialService;
  public readonly webhooks: WebhookService;

  constructor(private events: EventEmitter) {
    super('developer-portal-orchestrator');
    this.accounts = new DeveloperAccountService(events);
    this.explorer = new APIExplorerService(events);
    this.playground = new StorybookPlaygroundService(events);
    this.templates = new TemplateGalleryService(events);
    this.tutorials = new TutorialService(events);
    this.webhooks = new WebhookService(events);
  }

  /** Full onboarding flow: create account, start tutorial, open playground */
  async onboardDeveloper(
    tenantId: string, userId: string, displayName: string, email: string
  ): Promise<Result<{
    account: DeveloperAccount;
    playgroundSession: PlaygroundSession;
    firstTutorial: Tutorial;
  }>> {
    // Create account
    const accountResult = await this.accounts.createAccount(tenantId, userId, displayName, email);
    if (!accountResult.success) return Result.fail(accountResult.error!);

    // Create playground session
    const sessionResult = await this.playground.createSession(accountResult.data.id);
    if (!sessionResult.success) return Result.fail(sessionResult.error!);

    // Get first tutorial
    const tutorialResult = await this.tutorials.getTutorial('tut_001');
    if (!tutorialResult.success) return Result.fail(tutorialResult.error!);

    this.events.emit('developer:onboarded', {
      accountId: accountResult.data.id,
      tier: accountResult.data.tier,
    });

    return Result.ok({
      account: accountResult.data,
      playgroundSession: sessionResult.data,
      firstTutorial: tutorialResult.data,
    });
  }

  /** Dashboard metrics for a developer */
  async getDeveloperDashboard(accountId: string): Promise<Result<{
    stats: DeveloperStats;
    recentWebhookDeliveries: WebhookDelivery[];
    availableTemplates: number;
    completedTutorials: number;
  }>> {
    const statsResult = await this.accounts.getAccountStats(accountId);
    if (!statsResult.success) return Result.fail(statsResult.error!);

    const templatesResult = await this.templates.listTemplates();
    const tutorialsResult = await this.tutorials.listTutorials();

    return Result.ok({
      stats: statsResult.data,
      recentWebhookDeliveries: [],
      availableTemplates: templatesResult.success ? templatesResult.data.length : 0,
      completedTutorials: 0,
    });
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DeveloperAccountService as DevAccounts,
  APIExplorerService as APIExplorer,
  StorybookPlaygroundService as Playground,
  TemplateGalleryService as TemplateGallery,
  TutorialService as Tutorials,
  WebhookService as Webhooks,
};
