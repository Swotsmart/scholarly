/**
 * AI Integration Service
 *
 * Core AI service providing unified access to LLM capabilities (OpenAI/Anthropic).
 * All AI-powered features in Scholarly route through this service.
 *
 * Features:
 * - Text generation (chat completions)
 * - Embeddings for semantic search
 * - Structured output parsing
 * - Rate limiting and retries
 * - Cost tracking
 * - Multi-provider support
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  EventBus,
  Cache,
  ScholarlyConfig
} from '@scholarly/shared/types/scholarly-types';
import { log } from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export type AIProvider = 'openai' | 'anthropic';

export interface AIConfig {
  provider: AIProvider;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  defaultModel: string;
  embeddingModel: string;
  maxTokens: number;
  temperature: number;
  rateLimitPerMinute: number;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  jsonMode?: boolean;
  stopSequences?: string[];
}

export interface CompletionResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  cost: number;
}

export interface EmbeddingRequest {
  text: string | string[];
  model?: string;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    totalTokens: number;
  };
  cost: number;
}

export interface StructuredOutputRequest<T> {
  prompt: string;
  schema: Record<string, unknown>;
  examples?: { input: string; output: T }[];
  systemContext?: string;
}

// Curriculum-specific AI types
export interface ConceptExtractionResult {
  concepts: string[];
  definitions: Record<string, string>;
  relationships: { from: string; to: string; type: string }[];
}

export interface LessonPlanAIInput {
  curriculumDescriptions: string[];
  yearLevel: string;
  subject: string;
  duration: number;
  teachingStyle: string;
  differentiationNeeds: string[];
  includeAssessment: boolean;
}

export interface LessonPlanAIOutput {
  title: string;
  learningIntentions: string[];
  successCriteria: string[];
  sections: {
    name: string;
    duration: number;
    type: string;
    teacherActions: string[];
    studentActions: string[];
    resources: string[];
    differentiation: string;
  }[];
  differentiation: {
    enabling: string[];
    extending: string[];
    esl: string[];
  };
  assessment: {
    formative: string[];
    summative: string;
  };
  crossCurricularConnections: {
    subject: string;
    connection: string;
    activity: string;
  }[];
}

export interface AIBuddyMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    curriculumCodes?: string[];
    resourcesReferenced?: string[];
    learningObjectives?: string[];
  };
}

export interface AIBuddyContext {
  userId: string;
  userRole: 'student' | 'teacher' | 'parent';
  yearLevel?: string;
  subjects?: string[];
  learningProfile?: {
    strengths: string[];
    areasForGrowth: string[];
    preferredLearningStyles: string[];
    pace: 'slower' | 'standard' | 'accelerated';
  };
  currentGoals?: string[];
  recentActivity?: string[];
}

// ============================================================================
// PROMPT TEMPLATES
// ============================================================================

const PROMPTS = {
  conceptExtraction: `You are an expert curriculum analyst. Extract key educational concepts from the following curriculum content.

For each concept:
1. Identify the core concept name
2. Provide a brief definition suitable for the target year level
3. Identify relationships to other concepts (prerequisite, builds-on, related-to)

Curriculum Content:
{content}

Year Level: {yearLevel}
Subject: {subject}

Respond in JSON format:
{
  "concepts": ["concept1", "concept2", ...],
  "definitions": {"concept1": "definition", ...},
  "relationships": [{"from": "concept1", "to": "concept2", "type": "prerequisite"}, ...]
}`,

  bloomsMapping: `You are an educational taxonomy expert. Analyze the following learning objective and map it to Bloom's Taxonomy.

Learning Objective: {objective}

Determine:
1. The primary Bloom's level (remember, understand, apply, analyze, evaluate, create)
2. Key action verbs used or implied
3. Cognitive complexity (low, medium, high)

Respond in JSON format:
{
  "level": "analyze",
  "verbs": ["compare", "contrast", "examine"],
  "complexity": "medium",
  "explanation": "This objective requires students to..."
}`,

  lessonPlanGeneration: `You are an expert curriculum designer and teacher. Create a detailed, engaging lesson plan based on the following requirements.

Curriculum Standards:
{curriculumDescriptions}

Year Level: {yearLevel}
Subject: {subject}
Duration: {duration} minutes
Teaching Style: {teachingStyle}
Differentiation Needs: {differentiationNeeds}

Create a complete lesson plan that:
1. Aligns with the curriculum standards
2. Includes clear learning intentions and success criteria
3. Uses age-appropriate language and activities
4. Incorporates differentiation for diverse learners
5. Includes formative assessment opportunities
6. Suggests cross-curricular connections where relevant

Respond with a complete JSON lesson plan structure.`,

  crossCurricularDiscovery: `You are an expert in integrated curriculum design. Identify cross-curricular connections between the following curriculum content and other subject areas.

Primary Content:
{content}

Subject: {subject}
Year Level: {yearLevel}

For each connection, provide:
1. Target subject
2. Specific connection point
3. Integrated activity idea
4. Strength of connection (1-10)

Focus on meaningful, authentic connections that enhance learning in both subjects.

Respond in JSON format with an array of connections.`,

  aiBuddyStudent: `You are an encouraging, knowledgeable AI learning buddy for students. Your role is to:
- Help students understand concepts in age-appropriate language
- Guide them through problems without giving direct answers
- Encourage growth mindset and perseverance
- Connect learning to real-world applications
- Suggest resources and next steps

Student Profile:
- Year Level: {yearLevel}
- Subjects: {subjects}
- Learning Strengths: {strengths}
- Areas for Growth: {areasForGrowth}
- Current Goals: {goals}

Remember to:
- Use encouraging, supportive language
- Ask guiding questions rather than lecturing
- Celebrate effort and progress
- Keep responses concise and engaging
- Never do homework for students

Conversation so far:
{conversationHistory}

Student: {message}`,

  aiBuddyTeacher: `You are an expert educational AI assistant for teachers. Your role is to:
- Help with lesson planning and curriculum alignment
- Suggest differentiation strategies
- Provide assessment ideas
- Offer classroom management tips
- Share evidence-based teaching practices

Teacher Context:
- Year Level: {yearLevel}
- Subjects: {subjects}
- Current Focus: {focus}

Remember to:
- Be practical and actionable
- Reference curriculum standards when relevant
- Suggest research-backed strategies
- Respect teacher expertise and autonomy

Conversation so far:
{conversationHistory}

Teacher: {message}`,

  portfolioReflection: `You are helping a student reflect on their learning journey. Guide them to create a meaningful reflection on the following work.

Work Type: {workType}
Subject: {subject}
Learning Objectives: {objectives}

Help the student reflect on:
1. What they learned
2. Challenges they overcame
3. How this connects to previous learning
4. What they want to learn next
5. How this applies to real life

Use encouraging, age-appropriate language. Ask guiding questions to deepen reflection.`,

  learningPathRecommendation: `Based on the student's learning profile and goals, recommend a personalized learning path.

Student Profile:
- Current Level: {currentLevel}
- Strengths: {strengths}
- Goals: {goals}
- Preferred Learning Styles: {learningStyles}
- Time Available: {timeAvailable}

Available Resources:
{resources}

Recommend:
1. Priority topics to focus on
2. Suggested resources in order
3. Estimated timeline
4. Milestones to track progress
5. Alternative paths if struggling

Respond in JSON format with a structured learning path.`
};

// ============================================================================
// COST TRACKING
// ============================================================================

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  // OpenAI (per 1M tokens)
  'gpt-4o': { input: 2.50, output: 10.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
  // Anthropic (per 1M tokens)
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class AIIntegrationService extends ScholarlyBaseService {
  private aiConfig: AIConfig;
  private requestQueue: Map<string, Promise<unknown>> = new Map();
  private rateLimitTokens: number;
  private lastRateLimitRefresh: number;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    aiConfig: AIConfig;
  }) {
    super('AIIntegrationService', deps);
    this.aiConfig = deps.aiConfig;
    this.rateLimitTokens = deps.aiConfig.rateLimitPerMinute;
    this.lastRateLimitRefresh = Date.now();
  }

  // ==========================================================================
  // CORE AI METHODS
  // ==========================================================================

  /**
   * Generate a chat completion
   */
  async complete(
    tenantId: string,
    request: CompletionRequest
  ): Promise<Result<CompletionResponse>> {
    try {
      await this.checkRateLimit();

      const model = request.model || this.aiConfig.defaultModel;
      const messages = [...request.messages];

      if (request.systemPrompt) {
        messages.unshift({ role: 'system', content: request.systemPrompt });
      }

      const startTime = Date.now();
      let response: CompletionResponse;

      if (this.aiConfig.provider === 'openai') {
        response = await this.openAIComplete(messages, {
          model,
          maxTokens: request.maxTokens || this.aiConfig.maxTokens,
          temperature: request.temperature ?? this.aiConfig.temperature,
          jsonMode: request.jsonMode,
          stopSequences: request.stopSequences,
        });
      } else {
        response = await this.anthropicComplete(messages, {
          model,
          maxTokens: request.maxTokens || this.aiConfig.maxTokens,
          temperature: request.temperature ?? this.aiConfig.temperature,
          stopSequences: request.stopSequences,
        });
      }

      const processingTime = Date.now() - startTime;

      await this.publishEvent('scholarly.ai.completion', tenantId, {
        model: response.model,
        promptTokens: response.usage.promptTokens,
        completionTokens: response.usage.completionTokens,
        cost: response.cost,
        processingTime,
      });

      return success(response);
    } catch (error) {
      log.error('AI completion failed', error as Error);
      return failure(new ValidationError(`AI completion failed: ${(error as Error).message}`));
    }
  }

  /**
   * Generate embeddings for text
   */
  async embed(
    tenantId: string,
    request: EmbeddingRequest
  ): Promise<Result<EmbeddingResponse>> {
    try {
      const texts = Array.isArray(request.text) ? request.text : [request.text];
      const model = request.model || this.aiConfig.embeddingModel;

      // Check cache first
      const cacheKey = `embedding:${model}:${texts.map(t => t.slice(0, 100)).join('|')}`;
      const cached = await this.getCached<EmbeddingResponse>(tenantId, cacheKey);
      if (cached) return success(cached);

      const response = await this.openAIEmbed(texts, model);

      // Cache embeddings (they don't change)
      await this.setCached(tenantId, cacheKey, response, 86400); // 24 hours

      await this.publishEvent('scholarly.ai.embedding', tenantId, {
        model: response.model,
        textCount: texts.length,
        totalTokens: response.usage.totalTokens,
        cost: response.cost,
      });

      return success(response);
    } catch (error) {
      log.error('AI embedding failed', error as Error);
      return failure(new ValidationError(`AI embedding failed: ${(error as Error).message}`));
    }
  }

  /**
   * Generate structured output with JSON schema validation
   */
  async structuredOutput<T>(
    tenantId: string,
    request: StructuredOutputRequest<T>
  ): Promise<Result<T>> {
    const systemPrompt = `${request.systemContext || ''}

You must respond with valid JSON that matches this schema:
${JSON.stringify(request.schema, null, 2)}

${request.examples ? `Examples:
${request.examples.map(e => `Input: ${e.input}\nOutput: ${JSON.stringify(e.output)}`).join('\n\n')}` : ''}`;

    const result = await this.complete(tenantId, {
      messages: [{ role: 'user', content: request.prompt }],
      systemPrompt,
      jsonMode: true,
      temperature: 0.3, // Lower temperature for structured output
    });

    if (!result.success) return result as Result<T>;

    try {
      const parsed = JSON.parse(result.data.content) as T;
      return success(parsed);
    } catch (error) {
      return failure(new ValidationError('Failed to parse AI response as JSON'));
    }
  }

  // ==========================================================================
  // CURRICULUM-SPECIFIC AI METHODS
  // ==========================================================================

  /**
   * Extract educational concepts from curriculum text
   */
  async extractConcepts(
    tenantId: string,
    content: string,
    yearLevel: string,
    subject: string
  ): Promise<Result<ConceptExtractionResult>> {
    const prompt = PROMPTS.conceptExtraction
      .replace('{content}', content)
      .replace('{yearLevel}', yearLevel)
      .replace('{subject}', subject);

    return this.structuredOutput<ConceptExtractionResult>(tenantId, {
      prompt,
      schema: {
        type: 'object',
        properties: {
          concepts: { type: 'array', items: { type: 'string' } },
          definitions: { type: 'object' },
          relationships: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                from: { type: 'string' },
                to: { type: 'string' },
                type: { type: 'string' },
              },
            },
          },
        },
        required: ['concepts', 'definitions', 'relationships'],
      },
    });
  }

  /**
   * Map content to Bloom's Taxonomy
   */
  async mapToBloomsTaxonomy(
    tenantId: string,
    objective: string
  ): Promise<Result<{
    level: string;
    verbs: string[];
    complexity: string;
    explanation: string;
  }>> {
    const prompt = PROMPTS.bloomsMapping.replace('{objective}', objective);

    return this.structuredOutput(tenantId, {
      prompt,
      schema: {
        type: 'object',
        properties: {
          level: { type: 'string', enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'] },
          verbs: { type: 'array', items: { type: 'string' } },
          complexity: { type: 'string', enum: ['low', 'medium', 'high'] },
          explanation: { type: 'string' },
        },
        required: ['level', 'verbs', 'complexity', 'explanation'],
      },
    });
  }

  /**
   * Generate a complete lesson plan
   */
  async generateLessonPlan(
    tenantId: string,
    input: LessonPlanAIInput
  ): Promise<Result<LessonPlanAIOutput>> {
    const prompt = PROMPTS.lessonPlanGeneration
      .replace('{curriculumDescriptions}', input.curriculumDescriptions.join('\n\n'))
      .replace('{yearLevel}', input.yearLevel)
      .replace('{subject}', input.subject)
      .replace('{duration}', input.duration.toString())
      .replace('{teachingStyle}', input.teachingStyle)
      .replace('{differentiationNeeds}', input.differentiationNeeds.join(', '));

    return this.structuredOutput<LessonPlanAIOutput>(tenantId, {
      prompt,
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          learningIntentions: { type: 'array', items: { type: 'string' } },
          successCriteria: { type: 'array', items: { type: 'string' } },
          sections: { type: 'array' },
          differentiation: { type: 'object' },
          assessment: { type: 'object' },
          crossCurricularConnections: { type: 'array' },
        },
        required: ['title', 'learningIntentions', 'successCriteria', 'sections'],
      },
      systemContext: 'You are an expert curriculum designer creating lesson plans aligned with Australian curriculum standards.',
    });
  }

  /**
   * Discover cross-curricular connections
   */
  async discoverCrossCurricular(
    tenantId: string,
    content: string,
    subject: string,
    yearLevel: string
  ): Promise<Result<{
    connections: {
      targetSubject: string;
      connectionPoint: string;
      activityIdea: string;
      strength: number;
    }[];
  }>> {
    const prompt = PROMPTS.crossCurricularDiscovery
      .replace('{content}', content)
      .replace('{subject}', subject)
      .replace('{yearLevel}', yearLevel);

    return this.structuredOutput(tenantId, {
      prompt,
      schema: {
        type: 'object',
        properties: {
          connections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                targetSubject: { type: 'string' },
                connectionPoint: { type: 'string' },
                activityIdea: { type: 'string' },
                strength: { type: 'number', minimum: 1, maximum: 10 },
              },
            },
          },
        },
        required: ['connections'],
      },
    });
  }

  // ==========================================================================
  // AI BUDDY METHODS
  // ==========================================================================

  /**
   * AI Buddy chat for students
   */
  async aiBuddyStudent(
    tenantId: string,
    message: string,
    context: AIBuddyContext,
    conversationHistory: AIBuddyMessage[]
  ): Promise<Result<AIBuddyMessage>> {
    const historyText = conversationHistory
      .slice(-10) // Keep last 10 messages for context
      .map(m => `${m.role === 'user' ? 'Student' : 'AI Buddy'}: ${m.content}`)
      .join('\n');

    const prompt = PROMPTS.aiBuddyStudent
      .replace('{yearLevel}', context.yearLevel || 'Not specified')
      .replace('{subjects}', context.subjects?.join(', ') || 'General')
      .replace('{strengths}', context.learningProfile?.strengths?.join(', ') || 'Not specified')
      .replace('{areasForGrowth}', context.learningProfile?.areasForGrowth?.join(', ') || 'Not specified')
      .replace('{goals}', context.currentGoals?.join(', ') || 'Not specified')
      .replace('{conversationHistory}', historyText)
      .replace('{message}', message);

    const result = await this.complete(tenantId, {
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: 'You are a friendly, encouraging AI learning buddy. Keep responses concise and engaging.',
      maxTokens: 500,
      temperature: 0.7,
    });

    if (!result.success) return result as Result<AIBuddyMessage>;

    return success({
      role: 'assistant',
      content: result.data.content,
      timestamp: new Date(),
    });
  }

  /**
   * AI Buddy chat for teachers
   */
  async aiBuddyTeacher(
    tenantId: string,
    message: string,
    context: AIBuddyContext,
    conversationHistory: AIBuddyMessage[]
  ): Promise<Result<AIBuddyMessage>> {
    const historyText = conversationHistory
      .slice(-10)
      .map(m => `${m.role === 'user' ? 'Teacher' : 'AI Assistant'}: ${m.content}`)
      .join('\n');

    const prompt = PROMPTS.aiBuddyTeacher
      .replace('{yearLevel}', context.yearLevel || 'Not specified')
      .replace('{subjects}', context.subjects?.join(', ') || 'General')
      .replace('{focus}', context.currentGoals?.join(', ') || 'General teaching support')
      .replace('{conversationHistory}', historyText)
      .replace('{message}', message);

    const result = await this.complete(tenantId, {
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: 'You are an expert educational AI assistant helping teachers. Be practical and reference curriculum standards when relevant.',
      maxTokens: 800,
      temperature: 0.5,
    });

    if (!result.success) return result as Result<AIBuddyMessage>;

    return success({
      role: 'assistant',
      content: result.data.content,
      timestamp: new Date(),
    });
  }

  // ==========================================================================
  // PORTFOLIO METHODS
  // ==========================================================================

  /**
   * Help student create portfolio reflection
   */
  async generatePortfolioReflection(
    tenantId: string,
    workType: string,
    subject: string,
    objectives: string[],
    studentInput: string
  ): Promise<Result<{
    guidingQuestions: string[];
    reflectionStarters: string[];
    connectionSuggestions: string[];
  }>> {
    const prompt = `${PROMPTS.portfolioReflection
      .replace('{workType}', workType)
      .replace('{subject}', subject)
      .replace('{objectives}', objectives.join(', '))}

Student's initial thoughts: ${studentInput}

Provide guiding questions and reflection starters to help deepen this reflection.`;

    return this.structuredOutput(tenantId, {
      prompt,
      schema: {
        type: 'object',
        properties: {
          guidingQuestions: { type: 'array', items: { type: 'string' } },
          reflectionStarters: { type: 'array', items: { type: 'string' } },
          connectionSuggestions: { type: 'array', items: { type: 'string' } },
        },
        required: ['guidingQuestions', 'reflectionStarters', 'connectionSuggestions'],
      },
    });
  }

  /**
   * Recommend personalized learning path
   */
  async recommendLearningPath(
    tenantId: string,
    studentProfile: {
      currentLevel: string;
      strengths: string[];
      goals: string[];
      learningStyles: string[];
      timeAvailable: string;
    },
    availableResources: string[]
  ): Promise<Result<{
    priorityTopics: string[];
    suggestedResources: { resource: string; reason: string }[];
    timeline: { week: number; focus: string; milestone: string }[];
    alternativePaths: string[];
  }>> {
    const prompt = PROMPTS.learningPathRecommendation
      .replace('{currentLevel}', studentProfile.currentLevel)
      .replace('{strengths}', studentProfile.strengths.join(', '))
      .replace('{goals}', studentProfile.goals.join(', '))
      .replace('{learningStyles}', studentProfile.learningStyles.join(', '))
      .replace('{timeAvailable}', studentProfile.timeAvailable)
      .replace('{resources}', availableResources.join('\n'));

    return this.structuredOutput(tenantId, {
      prompt,
      schema: {
        type: 'object',
        properties: {
          priorityTopics: { type: 'array', items: { type: 'string' } },
          suggestedResources: { type: 'array' },
          timeline: { type: 'array' },
          alternativePaths: { type: 'array', items: { type: 'string' } },
        },
        required: ['priorityTopics', 'suggestedResources', 'timeline'],
      },
    });
  }

  // ==========================================================================
  // PROVIDER-SPECIFIC IMPLEMENTATIONS
  // ==========================================================================

  private async openAIComplete(
    messages: ChatMessage[],
    options: {
      model: string;
      maxTokens: number;
      temperature: number;
      jsonMode?: boolean;
      stopSequences?: string[];
    }
  ): Promise<CompletionResponse> {
    const apiKey = this.aiConfig.openaiApiKey;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model,
        messages,
        max_tokens: options.maxTokens,
        temperature: options.temperature,
        response_format: options.jsonMode ? { type: 'json_object' } : undefined,
        stop: options.stopSequences,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    const choice = data.choices[0];
    const usage = data.usage;

    const costs = MODEL_COSTS[options.model] || { input: 0, output: 0 };
    const cost = (usage.prompt_tokens * costs.input + usage.completion_tokens * costs.output) / 1_000_000;

    return {
      content: choice.message.content,
      model: data.model,
      usage: {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      finishReason: choice.finish_reason,
      cost,
    };
  }

  private async anthropicComplete(
    messages: ChatMessage[],
    options: {
      model: string;
      maxTokens: number;
      temperature: number;
      stopSequences?: string[];
    }
  ): Promise<CompletionResponse> {
    const apiKey = this.aiConfig.anthropicApiKey;
    if (!apiKey) throw new Error('Anthropic API key not configured');

    // Extract system message if present
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }));

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: options.model,
        max_tokens: options.maxTokens,
        system: systemMessage?.content,
        messages: conversationMessages,
        temperature: options.temperature,
        stop_sequences: options.stopSequences,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`Anthropic API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    const content = data.content[0]?.text || '';
    const usage = data.usage;

    const costs = MODEL_COSTS[options.model] || { input: 0, output: 0 };
    const cost = (usage.input_tokens * costs.input + usage.output_tokens * costs.output) / 1_000_000;

    return {
      content,
      model: data.model,
      usage: {
        promptTokens: usage.input_tokens,
        completionTokens: usage.output_tokens,
        totalTokens: usage.input_tokens + usage.output_tokens,
      },
      finishReason: data.stop_reason,
      cost,
    };
  }

  private async openAIEmbed(texts: string[], model: string): Promise<EmbeddingResponse> {
    const apiKey = this.aiConfig.openaiApiKey;
    if (!apiKey) throw new Error('OpenAI API key not configured');

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: texts,
      }),
    });

    if (!response.ok) {
      const error = await response.json() as any;
      throw new Error(`OpenAI Embedding API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json() as any;
    const embeddings = data.data.map((d: { embedding: number[] }) => d.embedding);
    const usage = data.usage;

    const costs = MODEL_COSTS[model] || { input: 0, output: 0 };
    const cost = (usage.total_tokens * costs.input) / 1_000_000;

    return {
      embeddings,
      model: data.model,
      usage: {
        totalTokens: usage.total_tokens,
      },
      cost,
    };
  }

  // ==========================================================================
  // RATE LIMITING
  // ==========================================================================

  private async checkRateLimit(): Promise<void> {
    const now = Date.now();
    const minuteElapsed = now - this.lastRateLimitRefresh > 60_000;

    if (minuteElapsed) {
      this.rateLimitTokens = this.aiConfig.rateLimitPerMinute;
      this.lastRateLimitRefresh = now;
    }

    if (this.rateLimitTokens <= 0) {
      const waitTime = 60_000 - (now - this.lastRateLimitRefresh);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      this.rateLimitTokens = this.aiConfig.rateLimitPerMinute;
      this.lastRateLimitRefresh = Date.now();
    }

    this.rateLimitTokens--;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private async getCached<T>(tenantId: string, key: string): Promise<T | null> {
    // Implementation would use the cache service
    return null;
  }

  private async setCached<T>(tenantId: string, key: string, value: T, ttl: number): Promise<void> {
    // Implementation would use the cache service
  }
}

// Export singleton for easy access
let aiServiceInstance: AIIntegrationService | null = null;

export function getAIService(): AIIntegrationService {
  if (!aiServiceInstance) {
    throw new Error('AI Service not initialized. Call initializeAIService first.');
  }
  return aiServiceInstance;
}

export function initializeAIService(deps: {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
}): AIIntegrationService {
  const aiConfig: AIConfig = {
    provider: (process.env.AI_PROVIDER as AIProvider) || 'openai',
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
    embeddingModel: process.env.AI_EMBEDDING_MODEL || 'text-embedding-3-small',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
    rateLimitPerMinute: parseInt(process.env.AI_RATE_LIMIT || '60', 10),
  };

  aiServiceInstance = new AIIntegrationService({
    ...deps,
    aiConfig,
  });

  return aiServiceInstance;
}

export { AIIntegrationService as default };
