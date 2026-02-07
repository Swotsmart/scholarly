// =============================================================================
// Developer Portal & API Explorer
// =============================================================================
// The Developer Portal is the front door to the Scholarly ecosystem for
// external developers, educators, and content creators. If the Content SDK
// is the engine under the hood, the Developer Portal is the showroom floor
// — it's where creators discover what's possible, experiment with the API,
// learn from tutorials, and build confidence before committing to integration.
//
// Think of it as Stripe's developer documentation meets Khan Academy's
// approachability: technically rigorous but never intimidating, with live
// examples that work on the first try and a sandbox where mistakes cost
// nothing.
//
// Architecture: Server-side service that manages API documentation rendering,
// live API exploration with sandboxed execution, the Storybook Playground
// for visual experimentation, and the Template Gallery for reusable content
// patterns. All content is version-controlled and tied to API versions.
//
// File: portal/developer-portal.ts
// Sprint: 8 (Developer Ecosystem & Platform Activation)
// Backlog: DE-004
// Lines: ~750
// =============================================================================

import { Result } from '../shared/result';

// =============================================================================
// Section 1: Type Definitions
// =============================================================================

/** API documentation endpoint definition */
export interface APIEndpoint {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  summary: string;
  description: string;
  category: EndpointCategory;
  authentication: 'required' | 'optional' | 'none';
  rateLimit: { requests: number; windowSeconds: number };
  request?: {
    headers?: Record<string, ParameterDef>;
    pathParams?: Record<string, ParameterDef>;
    queryParams?: Record<string, ParameterDef>;
    body?: SchemaDefinition;
  };
  response: {
    success: SchemaDefinition;
    errors: Array<{ status: number; description: string; schema?: SchemaDefinition }>;
  };
  examples: APIExample[];
  sdkMethod: string;
  cliCommand?: string;
  version: string;
  deprecated?: boolean;
  deprecatedMessage?: string;
}

export type EndpointCategory =
  | 'stories' | 'illustrations' | 'narration' | 'validation'
  | 'library' | 'characters' | 'analytics' | 'webhooks'
  | 'creators' | 'gpcs' | 'schemas' | 'auth';

export interface ParameterDef {
  type: string;
  description: string;
  required: boolean;
  default?: unknown;
  enum?: string[];
  example?: unknown;
}

export interface SchemaDefinition {
  type: string;
  description?: string;
  properties?: Record<string, SchemaDefinition & { required?: boolean }>;
  items?: SchemaDefinition;
  enum?: string[];
  example?: unknown;
}

export interface APIExample {
  title: string;
  description: string;
  language: 'typescript' | 'javascript' | 'python' | 'curl' | 'cli';
  code: string;
  response?: string;
}

/** Tutorial definition for guided walkthroughs */
export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  prerequisites: string[];
  steps: TutorialStep[];
  tags: string[];
  category: TutorialCategory;
}

export type TutorialCategory =
  | 'getting_started' | 'story_creation' | 'illustration'
  | 'classroom_integration' | 'advanced_pipelines' | 'marketplace';

export interface TutorialStep {
  title: string;
  content: string;
  codeExample?: { language: string; code: string };
  apiCall?: { endpoint: string; method: string; body?: unknown };
  expectedResult?: string;
  tip?: string;
}

/** Template in the gallery */
export interface StoryTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  phase: number;
  artStyle: string;
  narrativeTemplate: string;
  targetGpcsSuggested: string[];
  spec: Record<string, unknown>;
  previewImageUrl?: string;
  usageCount: number;
  rating: number;
  creatorId: string;
  tags: string[];
}

export type TemplateCategory =
  | 'phonics_phase' | 'narrative_structure' | 'art_style'
  | 'cultural_theme' | 'curriculum_aligned' | 'series_starter';

/** Playground session state */
export interface PlaygroundSession {
  id: string;
  tenantId: string;
  creatorId: string;
  currentSpec: Record<string, unknown>;
  generatedStory?: Record<string, unknown>;
  validationResult?: Record<string, unknown>;
  illustrationPreview?: string[];
  narrationPreview?: string;
  history: PlaygroundAction[];
  createdAt: string;
  expiresAt: string;
}

export interface PlaygroundAction {
  type: 'spec_update' | 'generate' | 'validate' | 'illustrate' | 'narrate' | 'reset';
  timestamp: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs: number;
  cost?: number;
}

/** Sandbox API key for playground use (limited permissions, rate-limited) */
export interface SandboxCredentials {
  apiKey: string;
  tenantId: string;
  permissions: string[];
  rateLimit: { requests: number; windowSeconds: number };
  expiresAt: string;
  usageCount: number;
  maxUsage: number;
}

// =============================================================================
// Section 2: API Documentation Registry
// =============================================================================
// This registry holds the complete API surface documentation. Each endpoint
// is defined with full request/response schemas, examples in multiple
// languages, and links to the corresponding SDK method and CLI command.
// The registry is the single source of truth — the API Explorer, the docs
// website, and the SDK type definitions all derive from these definitions.
// =============================================================================

export class APIDocumentationRegistry {
  private readonly endpoints: Map<string, APIEndpoint> = new Map();
  private readonly categories: Map<EndpointCategory, APIEndpoint[]> = new Map();

  constructor() {
    this.registerCoreEndpoints();
  }

  /** Get all registered endpoints */
  getAllEndpoints(): APIEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /** Get endpoints by category */
  getByCategory(category: EndpointCategory): APIEndpoint[] {
    return this.categories.get(category) || [];
  }

  /** Get a specific endpoint by ID */
  getEndpoint(id: string): APIEndpoint | undefined {
    return this.endpoints.get(id);
  }

  /** Search endpoints by keyword */
  searchEndpoints(query: string): APIEndpoint[] {
    const lower = query.toLowerCase();
    return this.getAllEndpoints().filter(ep =>
      ep.summary.toLowerCase().includes(lower) ||
      ep.description.toLowerCase().includes(lower) ||
      ep.path.toLowerCase().includes(lower) ||
      ep.category.includes(lower)
    );
  }

  /** Get the OpenAPI 3.1 specification */
  toOpenAPISpec(): Record<string, unknown> {
    const paths: Record<string, Record<string, unknown>> = {};

    for (const ep of this.getAllEndpoints()) {
      const pathKey = ep.path.replace(/{(\w+)}/g, '{$1}');
      if (!paths[pathKey]) paths[pathKey] = {};

      const operation: Record<string, unknown> = {
        operationId: ep.id,
        summary: ep.summary,
        description: ep.description,
        tags: [ep.category],
        security: ep.authentication === 'required' ? [{ oauth2: ['content:read', 'content:write'] }] : [],
        responses: {
          '200': {
            description: 'Successful response',
            content: { 'application/json': { schema: ep.response.success } },
          },
          ...Object.fromEntries(ep.response.errors.map(err => [
            String(err.status),
            { description: err.description, content: err.schema ? { 'application/json': { schema: err.schema } } : undefined },
          ])),
        },
      };

      if (ep.request?.body) {
        operation.requestBody = {
          required: true,
          content: { 'application/json': { schema: ep.request.body } },
        };
      }

      if (ep.request?.queryParams) {
        operation.parameters = Object.entries(ep.request.queryParams).map(([name, param]) => ({
          name, in: 'query', required: param.required, schema: { type: param.type },
          description: param.description, example: param.example,
        }));
      }

      if (ep.request?.pathParams) {
        const pathParams = Object.entries(ep.request.pathParams).map(([name, param]) => ({
          name, in: 'path', required: true, schema: { type: param.type },
          description: param.description, example: param.example,
        }));
        operation.parameters = [...(operation.parameters as any[] || []), ...pathParams];
      }

      paths[pathKey][ep.method.toLowerCase()] = operation;
    }

    return {
      openapi: '3.1.0',
      info: {
        title: 'Scholarly Storybook Engine API',
        version: '1.0.0',
        description: 'Curriculum-aligned, AI-powered storybook generation and library management.',
        contact: { name: 'Scholarly Developer Support', url: 'https://developers.scholarly.app', email: 'devs@scholarly.app' },
      },
      servers: [
        { url: 'https://api.scholarly.app/v1', description: 'Production' },
        { url: 'https://sandbox.api.scholarly.app/v1', description: 'Sandbox (rate-limited, free)' },
      ],
      paths,
      components: {
        securitySchemes: {
          oauth2: {
            type: 'oauth2',
            flows: {
              clientCredentials: {
                tokenUrl: '/oauth/token',
                scopes: {
                  'content:read': 'Read stories and library data',
                  'content:write': 'Create and modify stories',
                  'library:read': 'Search and browse the library',
                  'library:write': 'Submit and review content',
                  'analytics:read': 'Access reading analytics',
                  'webhooks:manage': 'Create and manage webhooks',
                },
              },
            },
          },
        },
      },
    };
  }

  private registerCoreEndpoints(): void {
    this.register({
      id: 'generate-story',
      method: 'POST',
      path: '/stories/generate',
      summary: 'Generate a new curriculum-aligned storybook',
      description: 'Creates a complete storybook narrative from phonics constraints. The engine uses Claude to generate age-appropriate text, validates every word against the taught GPC set, and ensures the decodability threshold is met. This is the primary creation endpoint for the entire content pipeline.',
      category: 'stories',
      authentication: 'required',
      rateLimit: { requests: 5, windowSeconds: 60 },
      request: {
        body: {
          type: 'object',
          properties: {
            phase: { type: 'integer', description: 'Target phonics phase (1-6)', required: true, example: 3 },
            targetGpcs: { type: 'array', description: 'GPCs to practise', required: true, items: { type: 'string' }, example: ['ai', 'ee', 'igh'] },
            taughtGpcSet: { type: 'array', description: 'All GPCs the learner has been taught', required: true, items: { type: 'string' } },
            theme: { type: 'string', description: 'Story theme or topic', required: true, example: 'Australian animals' },
            pageCount: { type: 'integer', description: 'Number of pages (8-24)', example: 12 },
            ageRange: { type: 'object', description: 'Target age range', properties: { min: { type: 'integer' }, max: { type: 'integer' } } },
            artStyle: { type: 'string', description: 'Illustration art style', enum: ['watercolour', 'flat_vector', 'soft_3d', 'crayon'] },
            decodabilityThreshold: { type: 'integer', description: 'Minimum decodability % (default 85)', example: 85 },
            narrativeTemplate: { type: 'string', description: 'Story structure template', example: 'heros_journey' },
          },
        },
      },
      response: {
        success: { type: 'object', description: 'Generated storybook with full metadata' },
        errors: [
          { status: 400, description: 'Invalid request — missing required fields or invalid GPC data' },
          { status: 422, description: 'Generation failed — could not meet decodability threshold after retries' },
          { status: 429, description: 'Rate limited — maximum 5 generations per minute' },
        ],
      },
      examples: [
        {
          title: 'Generate a Phase 3 storybook about space',
          description: 'Creates a 12-page storybook targeting ai, ee, and igh GPCs with a space adventure theme.',
          language: 'typescript',
          code: `const story = await sdk.generateStory({
  phase: 3,
  targetGpcs: ['ai', 'ee', 'igh'],
  taughtGpcSet: ['s','a','t','p','i','n','m','d','g','o','c','k','ck','e','u','r','h','b','f','j','v','w','x','y','z','qu','ch','sh','th','ng','ai','ee','igh'],
  theme: 'space adventure',
  pageCount: 12,
  ageRange: { min: 5, max: 7 },
  artStyle: 'watercolour',
});`,
        },
        {
          title: 'cURL example',
          description: 'Direct API call with curl.',
          language: 'curl',
          code: `curl -X POST https://api.scholarly.app/v1/stories/generate \\
  -H "Authorization: Bearer \${TOKEN}" \\
  -H "X-Tenant-ID: \${TENANT_ID}" \\
  -H "Content-Type: application/json" \\
  -d '{"phase":3,"targetGpcs":["ai","ee","igh"],"taughtGpcSet":[...],"theme":"space adventure"}'`,
        },
        {
          title: 'CLI example',
          description: 'Generate from a spec file with streaming progress.',
          language: 'cli',
          code: 'scholarly generate my-story.spec.json --stream',
        },
      ],
      sdkMethod: 'sdk.generateStory(request)',
      cliCommand: 'scholarly generate <spec-file>',
      version: '1.0.0',
    });

    this.register({
      id: 'illustrate-story',
      method: 'POST',
      path: '/stories/{id}/illustrate',
      summary: 'Generate illustrations for a storybook',
      description: 'Produces page-by-page illustrations using GPT Image with character consistency maintained via style sheets. Supports 30+ art styles and optional scene decomposition for parallax animation.',
      category: 'illustrations',
      authentication: 'required',
      rateLimit: { requests: 3, windowSeconds: 60 },
      request: {
        pathParams: { id: { type: 'string', description: 'Storybook ID', required: true, example: 'sb_abc123' } },
        body: {
          type: 'object',
          properties: {
            artStyle: { type: 'string', description: 'Illustration style', required: true },
            characterSheetIds: { type: 'array', description: 'Character sheet IDs for consistency', items: { type: 'string' } },
            sceneDecomposition: { type: 'boolean', description: 'Enable parallax layers (default true)' },
          },
        },
      },
      response: {
        success: { type: 'object', description: 'Storybook with illustration URLs on each page' },
        errors: [
          { status: 404, description: 'Storybook not found' },
          { status: 422, description: 'Illustration generation failed' },
          { status: 429, description: 'Rate limited — maximum 3 illustration jobs per minute' },
        ],
      },
      examples: [{
        title: 'Illustrate with watercolour style',
        language: 'typescript',
        description: 'Generates watercolour illustrations with scene decomposition.',
        code: `const illustrated = await sdk.illustrateStory('sb_abc123', {
  artStyle: 'watercolour',
  sceneDecomposition: true,
});`,
      }],
      sdkMethod: 'sdk.illustrateStory(id, request)',
      cliCommand: 'scholarly illustrate <story-id> --style watercolour',
      version: '1.0.0',
    });

    this.register({
      id: 'validate-story',
      method: 'POST',
      path: '/stories/{id}/validate',
      summary: 'Validate a storybook against educational standards',
      description: 'Runs comprehensive validation: decodability scoring, content safety, vocabulary analysis, metadata completeness, and curriculum alignment. Returns detailed issues with locations and suggestions.',
      category: 'validation',
      authentication: 'required',
      rateLimit: { requests: 20, windowSeconds: 60 },
      request: {
        pathParams: { id: { type: 'string', description: 'Storybook ID', required: true, example: 'sb_abc123' } },
      },
      response: {
        success: { type: 'object', description: 'Comprehensive validation report' },
        errors: [{ status: 404, description: 'Storybook not found' }],
      },
      examples: [{
        title: 'Validate before submission',
        language: 'typescript',
        description: 'Check decodability and safety before entering the review pipeline.',
        code: `const validation = await sdk.validateStory('sb_abc123');
if (validation.data?.valid) {
  await sdk.submitStory('sb_abc123');
}`,
      }],
      sdkMethod: 'sdk.validateStory(id)',
      cliCommand: 'scholarly validate <story-file>',
      version: '1.0.0',
    });

    this.register({
      id: 'search-library',
      method: 'GET',
      path: '/library/search',
      summary: 'Search the storybook library',
      description: 'Full-text and faceted search across the published storybook library. Filter by phonics phase, theme, art style, language, and curriculum framework. Returns paginated results with facet counts.',
      category: 'library',
      authentication: 'required',
      rateLimit: { requests: 60, windowSeconds: 60 },
      request: {
        queryParams: {
          phase: { type: 'integer', description: 'Phonics phase filter (1-6)', required: false, example: 3 },
          theme: { type: 'string', description: 'Theme keyword', required: false, example: 'animals' },
          artStyle: { type: 'string', description: 'Art style filter', required: false },
          language: { type: 'string', description: 'Content language', required: false, example: 'en-AU' },
          sortBy: { type: 'string', description: 'Sort order', required: false, enum: ['relevance', 'popularity', 'newest', 'rating'] },
          page: { type: 'integer', description: 'Page number', required: false, example: 1 },
          limit: { type: 'integer', description: 'Results per page (max 50)', required: false, example: 10 },
        },
      },
      response: {
        success: { type: 'object', description: 'Paginated search results with facets' },
        errors: [{ status: 400, description: 'Invalid search parameters' }],
      },
      examples: [{
        title: 'Search for Phase 3 animal stories',
        language: 'typescript',
        description: 'Find published storybooks about animals at Phase 3.',
        code: `const results = await sdk.searchLibrary({
  phase: 3,
  theme: 'animals',
  sortBy: 'popularity',
  limit: 10,
});`,
      }],
      sdkMethod: 'sdk.searchLibrary(params)',
      cliCommand: 'scholarly search animals --phase 3',
      version: '1.0.0',
    });

    this.register({
      id: 'get-recommendations',
      method: 'GET',
      path: '/library/recommend',
      summary: 'Get personalised storybook recommendations',
      description: 'Uses BKT mastery profiles and reading history to recommend books at the optimal difficulty level. Returns books categorised into four shelves: Ready for You, Adventures Waiting, Favourites, and Community Picks.',
      category: 'library',
      authentication: 'required',
      rateLimit: { requests: 30, windowSeconds: 60 },
      request: {
        queryParams: {
          learnerId: { type: 'string', description: 'Learner ID', required: true },
          count: { type: 'integer', description: 'Number of recommendations', required: false, example: 5 },
          excludeRead: { type: 'boolean', description: 'Exclude already-read books', required: false },
        },
      },
      response: {
        success: { type: 'object', description: 'Personalised recommendations with match scores' },
        errors: [{ status: 404, description: 'Learner not found' }],
      },
      examples: [{
        title: 'Get recommendations for a learner',
        language: 'typescript',
        description: 'Fetch 5 personalised book recommendations.',
        code: `const recs = await sdk.getRecommendations({
  learnerId: 'learner_xyz',
  count: 5,
  excludeRead: true,
});`,
      }],
      sdkMethod: 'sdk.getRecommendations(request)',
      version: '1.0.0',
    });

    this.register({
      id: 'narrate-story',
      method: 'POST',
      path: '/stories/{id}/narrate',
      summary: 'Generate audio narration with word-level timestamps',
      description: 'Produces professional narration using ElevenLabs voices with word-level timestamp data for karaoke-style read-along highlighting. Supports variable speed for different reading levels.',
      category: 'narration',
      authentication: 'required',
      rateLimit: { requests: 10, windowSeconds: 60 },
      request: {
        pathParams: { id: { type: 'string', description: 'Storybook ID', required: true } },
        body: {
          type: 'object',
          properties: {
            voiceId: { type: 'string', description: 'ElevenLabs voice ID' },
            speed: { type: 'string', description: 'Narration speed', enum: ['slow', 'normal', 'fast'] },
            wordLevelTimestamps: { type: 'boolean', description: 'Generate word timestamps (default true)' },
          },
        },
      },
      response: {
        success: { type: 'object', description: 'Storybook with audio URLs and timestamps' },
        errors: [
          { status: 404, description: 'Storybook not found' },
          { status: 422, description: 'Narration generation failed' },
        ],
      },
      examples: [{
        title: 'Generate slow narration for beginning readers',
        language: 'typescript',
        description: 'Creates narration at slow speed with word timestamps.',
        code: `const narrated = await sdk.narrateStory('sb_abc123', {
  speed: 'slow',
  wordLevelTimestamps: true,
});`,
      }],
      sdkMethod: 'sdk.narrateStory(id, request)',
      cliCommand: 'scholarly narrate <story-id> --speed slow',
      version: '1.0.0',
    });

    this.register({
      id: 'create-webhook',
      method: 'POST',
      path: '/webhooks',
      summary: 'Register a webhook for real-time events',
      description: 'Creates a webhook subscription for event notifications. Supports story lifecycle events, review pipeline updates, and analytics milestones. Webhook payloads are signed with HMAC-SHA256.',
      category: 'webhooks',
      authentication: 'required',
      rateLimit: { requests: 10, windowSeconds: 60 },
      request: {
        body: {
          type: 'object',
          properties: {
            url: { type: 'string', description: 'Webhook endpoint URL (HTTPS required)', required: true },
            events: { type: 'array', description: 'Event types to subscribe to', required: true, items: { type: 'string' } },
          },
        },
      },
      response: {
        success: { type: 'object', description: 'Webhook subscription with signing secret' },
        errors: [{ status: 400, description: 'Invalid URL or event types' }],
      },
      examples: [{
        title: 'Subscribe to publication events',
        language: 'typescript',
        description: 'Get notified when stories are published.',
        code: `const webhook = await sdk.createWebhook(
  'https://my-app.com/webhooks/scholarly',
  ['story.published', 'story.rejected', 'analytics.milestone']
);`,
      }],
      sdkMethod: 'sdk.createWebhook(url, events)',
      version: '1.0.0',
    });
  }

  private register(endpoint: APIEndpoint): void {
    this.endpoints.set(endpoint.id, endpoint);
    const existing = this.categories.get(endpoint.category) || [];
    existing.push(endpoint);
    this.categories.set(endpoint.category, existing);
  }
}

// =============================================================================
// Section 3: Tutorial Engine
// =============================================================================

export class TutorialEngine {
  private readonly tutorials: Map<string, Tutorial> = new Map();

  constructor() {
    this.registerCoreTutorials();
  }

  getAllTutorials(): Tutorial[] {
    return Array.from(this.tutorials.values());
  }

  getByCategory(category: TutorialCategory): Tutorial[] {
    return this.getAllTutorials().filter(t => t.category === category);
  }

  getByDifficulty(difficulty: Tutorial['difficulty']): Tutorial[] {
    return this.getAllTutorials().filter(t => t.difficulty === difficulty);
  }

  getTutorial(id: string): Tutorial | undefined {
    return this.tutorials.get(id);
  }

  private registerCoreTutorials(): void {
    this.tutorials.set('getting-started', {
      id: 'getting-started',
      title: 'Create Your First Decodable Storybook',
      description: 'A step-by-step guide to generating a curriculum-aligned storybook from scratch using the Scholarly Content SDK.',
      difficulty: 'beginner',
      estimatedMinutes: 15,
      prerequisites: ['Scholarly API credentials (sign up at developers.scholarly.app)', 'Node.js 18+ installed'],
      category: 'getting_started',
      tags: ['sdk', 'phonics', 'generation', 'first-steps'],
      steps: [
        {
          title: 'Install the SDK',
          content: 'Install the @scholarly/content-sdk package from npm. This gives you type-safe access to the entire Storybook Engine API.',
          codeExample: { language: 'bash', code: 'npm install @scholarly/content-sdk' },
          tip: 'The SDK is tree-shakeable — your bundler will only include the parts you actually use.',
        },
        {
          title: 'Configure Authentication',
          content: 'Create an SDK instance with your OAuth 2.0 credentials. The SDK handles token lifecycle automatically — you never need to manually refresh tokens.',
          codeExample: {
            language: 'typescript',
            code: `import { ScholarlyContentSDK } from '@scholarly/content-sdk';\n\nconst sdk = new ScholarlyContentSDK({\n  clientId: process.env.SCHOLARLY_CLIENT_ID!,\n  clientSecret: process.env.SCHOLARLY_CLIENT_SECRET!,\n  tenantId: process.env.SCHOLARLY_TENANT_ID!,\n});`,
          },
        },
        {
          title: 'Define Your Phonics Target',
          content: 'Every storybook starts with a "phonics fingerprint" — the GPCs your learner has been taught and the specific GPCs you want this story to practise. For a Phase 2 learner who has been taught s, a, t, p, i, n, m, d, and you want to practise the new GPC "g".',
          codeExample: {
            language: 'typescript',
            code: `const request = {\n  phase: 2,\n  targetGpcs: ['g'],\n  taughtGpcSet: ['s','a','t','p','i','n','m','d','g'],\n  theme: 'a garden adventure',\n  pageCount: 8,\n  ageRange: { min: 4, max: 5 },\n  artStyle: 'watercolour',\n  decodabilityThreshold: 85,\n};`,
          },
          tip: 'The decodabilityThreshold of 85% means at least 85% of words must be decodable with the taught GPCs. The engine will regenerate if this threshold is not met.',
        },
        {
          title: 'Generate the Story',
          content: 'Call the generate endpoint. The engine will create a narrative using only words decodable with the taught GPCs (plus tricky words for the phase), validate decodability, and return the complete storybook.',
          codeExample: {
            language: 'typescript',
            code: `const result = await sdk.generateStory(request);\n\nif (result.success) {\n  console.log(\`Generated: \${result.data.title}\`);\n  console.log(\`Decodability: \${result.data.decodabilityScore}%\`);\n  console.log(\`Pages: \${result.data.pages.length}\`);\n}`,
          },
          expectedResult: 'A complete storybook object with title, pages (each with text), phonics metadata, and decodability score.',
        },
        {
          title: 'Validate Locally (Optional)',
          content: 'Before using API credits for illustration, you can validate the story offline using the Content Validator.',
          codeExample: {
            language: 'typescript',
            code: `import { ContentValidator } from '@scholarly/content-validator';\n\nconst validator = new ContentValidator();\nconst validation = validator.validate({\n  title: result.data.title,\n  phase: 2,\n  targetGpcs: ['g'],\n  taughtGpcSet: ['s','a','t','p','i','n','m','d','g'],\n  pages: result.data.pages,\n});\n\nconsole.log(\`Valid: \${validation.data?.valid}\`);`,
          },
        },
      ],
    });

    this.tutorials.set('classroom-integration', {
      id: 'classroom-integration',
      title: 'Build a Custom Story Generator for Your Classroom',
      description: 'Create a simple web tool that generates personalised storybooks for each student based on their reading level.',
      difficulty: 'intermediate',
      estimatedMinutes: 30,
      prerequisites: ['Completed "Create Your First Decodable Storybook" tutorial', 'Basic React knowledge'],
      category: 'classroom_integration',
      tags: ['classroom', 'personalisation', 'react', 'bkt'],
      steps: [
        {
          title: 'Fetch Student Reading Levels',
          content: 'Use the GPC endpoint to get each student\'s current mastery profile. This tells you exactly which GPCs they\'ve mastered and which phase they\'re working in.',
          codeExample: {
            language: 'typescript',
            code: `const learnerData = await sdk.getLearnerGpcs('student_123');\n\nconsole.log(\`Phase: \${learnerData.data?.currentPhase}\`);\nconsole.log(\`Taught GPCs: \${learnerData.data?.taughtGpcs.length}\`);\nconsole.log(\`Mastery profile:\`, learnerData.data?.masteryProfile);`,
          },
        },
        {
          title: 'Generate Personalised Stories',
          content: 'For each student, generate a story targeting the GPCs they\'re currently learning. The BKT mastery profile tells you which GPCs need the most practice.',
          codeExample: {
            language: 'typescript',
            code: `// Find GPCs with lowest mastery for targeted practice\nconst profile = learnerData.data!.masteryProfile;\nconst weakestGpcs = Object.entries(profile)\n  .sort(([,a], [,b]) => a - b)\n  .slice(0, 3)\n  .map(([gpc]) => gpc);\n\nconst story = await sdk.generateStory({\n  phase: learnerData.data!.currentPhase,\n  targetGpcs: weakestGpcs,\n  taughtGpcSet: learnerData.data!.taughtGpcs,\n  theme: 'underwater adventure', // or use student preferences\n  pageCount: 8,\n});`,
          },
        },
        {
          title: 'Add Illustrations and Narration',
          content: 'Complete the storybook with illustrations and audio narration.',
          codeExample: {
            language: 'typescript',
            code: `const storyId = story.data!.id;\n\n// Add illustrations\nawait sdk.illustrateStory(storyId, { artStyle: 'watercolour' });\n\n// Add narration with word timestamps for read-along\nawait sdk.narrateStory(storyId, {\n  speed: 'slow',\n  wordLevelTimestamps: true,\n});`,
          },
        },
      ],
    });
  }
}

// =============================================================================
// Section 4: Template Gallery
// =============================================================================

export class TemplateGallery {
  private readonly templates: Map<string, StoryTemplate> = new Map();

  constructor() {
    this.registerCoreTemplates();
  }

  getAllTemplates(): StoryTemplate[] {
    return Array.from(this.templates.values());
  }

  getByCategory(category: TemplateCategory): StoryTemplate[] {
    return this.getAllTemplates().filter(t => t.category === category);
  }

  getByPhase(phase: number): StoryTemplate[] {
    return this.getAllTemplates().filter(t => t.phase === phase);
  }

  getTemplate(id: string): StoryTemplate | undefined {
    return this.templates.get(id);
  }

  searchTemplates(query: string): StoryTemplate[] {
    const lower = query.toLowerCase();
    return this.getAllTemplates().filter(t =>
      t.name.toLowerCase().includes(lower) ||
      t.description.toLowerCase().includes(lower) ||
      t.tags.some(tag => tag.includes(lower))
    );
  }

  private registerCoreTemplates(): void {
    const coreTemplates: StoryTemplate[] = [
      {
        id: 'phase2-adventure', name: 'Phase 2 Adventure', category: 'phonics_phase', phase: 2,
        description: 'A simple adventure story using only Phase 2 GPCs. Perfect for beginning readers taking their first steps into decodable text.',
        artStyle: 'watercolour', narrativeTemplate: 'heros_journey',
        targetGpcsSuggested: ['s', 'a', 't', 'p', 'i'],
        spec: { phase: 2, pageCount: 8, ageRange: { min: 4, max: 5 }, decodabilityThreshold: 90 },
        usageCount: 1245, rating: 4.8, creatorId: 'scholarly_team', tags: ['phase2', 'adventure', 'beginner'],
      },
      {
        id: 'phase3-animals', name: 'Phase 3 Animal Tales', category: 'phonics_phase', phase: 3,
        description: 'Animal-themed stories introducing consonant digraphs and vowel digraphs. Children meet friendly animals while practising ch, sh, th, ai, ee, and igh.',
        artStyle: 'soft_3d', narrativeTemplate: 'cumulative_tale',
        targetGpcsSuggested: ['ch', 'sh', 'th', 'ai', 'ee'],
        spec: { phase: 3, pageCount: 12, ageRange: { min: 5, max: 6 }, decodabilityThreshold: 85 },
        usageCount: 892, rating: 4.7, creatorId: 'scholarly_team', tags: ['phase3', 'animals', 'digraphs'],
      },
      {
        id: 'cumulative-tale', name: 'Cumulative Tale Structure', category: 'narrative_structure', phase: 2,
        description: 'The classic "and then, and then" structure where each page adds to a growing list. Maximises word repetition — ideal for building sight word recognition.',
        artStyle: 'flat_vector', narrativeTemplate: 'cumulative_tale',
        targetGpcsSuggested: [],
        spec: { narrativeTemplate: 'cumulative_tale', pageCount: 10 },
        usageCount: 567, rating: 4.6, creatorId: 'scholarly_team', tags: ['cumulative', 'repetition', 'structure'],
      },
      {
        id: 'australian-bush', name: 'Australian Bush Adventures', category: 'cultural_theme', phase: 3,
        description: 'Stories set in the Australian bush featuring native animals — kangaroos, koalas, wombats, and platypuses. Aligns with EYLF outcomes.',
        artStyle: 'watercolour', narrativeTemplate: 'problem_solution',
        targetGpcsSuggested: ['oo', 'ar', 'or'],
        spec: { phase: 3, pageCount: 12, culturalContext: ['australian'], curriculumFramework: 'eylf' },
        usageCount: 423, rating: 4.9, creatorId: 'scholarly_team', tags: ['australian', 'bush', 'native-animals', 'eylf'],
      },
      {
        id: 'series-starter', name: 'Series Starter Kit', category: 'series_starter', phase: 2,
        description: 'Template for launching a multi-book series with persistent characters. Includes character sheet setup and narrative arc planning across 5 books.',
        artStyle: 'crayon', narrativeTemplate: 'heros_journey',
        targetGpcsSuggested: [],
        spec: { pageCount: 8, series: { plannedBooks: 5, characterCount: 3 } },
        usageCount: 334, rating: 4.5, creatorId: 'scholarly_team', tags: ['series', 'characters', 'multi-book'],
      },
    ];

    for (const template of coreTemplates) {
      this.templates.set(template.id, template);
    }
  }
}

// =============================================================================
// Section 5: Playground Service
// =============================================================================

export class PlaygroundService {
  private readonly sessions: Map<string, PlaygroundSession> = new Map();
  private readonly sandboxCredentials: Map<string, SandboxCredentials> = new Map();

  /** Create a new playground session with sandbox credentials */
  createSession(tenantId: string, creatorId: string): Result<PlaygroundSession> {
    const sessionId = `pg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 4 * 60 * 60 * 1000); // 4 hours

    const session: PlaygroundSession = {
      id: sessionId,
      tenantId,
      creatorId,
      currentSpec: {
        phase: 2,
        targetGpcs: ['s', 'a', 't'],
        taughtGpcSet: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd'],
        theme: 'a fun adventure',
        pageCount: 8,
      },
      history: [],
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    this.sessions.set(sessionId, session);

    // Create sandbox credentials for this session
    const sandbox: SandboxCredentials = {
      apiKey: `sb_${Math.random().toString(36).substring(2, 20)}`,
      tenantId,
      permissions: ['content:read', 'content:write', 'library:read'],
      rateLimit: { requests: 20, windowSeconds: 3600 },
      expiresAt: expiresAt.toISOString(),
      usageCount: 0,
      maxUsage: 50,
    };

    this.sandboxCredentials.set(sandbox.apiKey, sandbox);

    return { success: true, data: session };
  }

  /** Get a playground session */
  getSession(sessionId: string): Result<PlaygroundSession> {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };
    if (new Date(session.expiresAt) < new Date()) return { success: false, error: 'Session expired' };
    return { success: true, data: session };
  }

  /** Record an action in the playground history */
  recordAction(sessionId: string, action: Omit<PlaygroundAction, 'timestamp'>): Result<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return { success: false, error: 'Session not found' };

    session.history.push({
      ...action,
      timestamp: new Date().toISOString(),
    });

    return { success: true, data: undefined };
  }

  /** Validate sandbox credentials */
  validateSandboxKey(apiKey: string): Result<SandboxCredentials> {
    const creds = this.sandboxCredentials.get(apiKey);
    if (!creds) return { success: false, error: 'Invalid sandbox API key' };
    if (new Date(creds.expiresAt) < new Date()) return { success: false, error: 'Sandbox credentials expired' };
    if (creds.usageCount >= creds.maxUsage) return { success: false, error: 'Sandbox usage limit exceeded' };
    return { success: true, data: creds };
  }
}

// =============================================================================
// Section 6: Developer Portal Service (Orchestrator)
// =============================================================================

export class DeveloperPortalService {
  public readonly apiDocs: APIDocumentationRegistry;
  public readonly tutorials: TutorialEngine;
  public readonly templates: TemplateGallery;
  public readonly playground: PlaygroundService;

  constructor() {
    this.apiDocs = new APIDocumentationRegistry();
    this.tutorials = new TutorialEngine();
    this.templates = new TemplateGallery();
    this.playground = new PlaygroundService();
  }

  /** Get the complete developer portal manifest */
  getPortalManifest(): Record<string, unknown> {
    return {
      apiVersion: '1.0.0',
      endpointCount: this.apiDocs.getAllEndpoints().length,
      tutorialCount: this.tutorials.getAllTutorials().length,
      templateCount: this.templates.getAllTemplates().length,
      categories: {
        endpoints: ['stories', 'illustrations', 'narration', 'validation', 'library', 'characters', 'analytics', 'webhooks', 'creators', 'gpcs', 'schemas', 'auth'],
        tutorials: ['getting_started', 'story_creation', 'illustration', 'classroom_integration', 'advanced_pipelines', 'marketplace'],
        templates: ['phonics_phase', 'narrative_structure', 'art_style', 'cultural_theme', 'curriculum_aligned', 'series_starter'],
      },
      sdkPackages: [
        { name: '@scholarly/content-sdk', description: 'Core SDK for API access', version: '1.0.0' },
        { name: '@scholarly/content-validator', description: 'Offline validation library', version: '1.0.0' },
        { name: '@scholarly/storybook-cli', description: 'Command-line tool', version: '1.0.0' },
      ],
      sandboxUrl: 'https://sandbox.api.scholarly.app/v1',
      documentationUrl: 'https://developers.scholarly.app',
    };
  }
}

export default DeveloperPortalService;
