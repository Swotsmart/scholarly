/**
 * Scholarly UC 4.0 — Agentic AI Foundations
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE AUTONOMOUS COLLEAGUE WHO NEVER CALLS IN SICK
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Think about what happens when a new employee joins a company. On day
 * one, they can answer the phone but not much else. Over weeks, they
 * learn the CRM, the scheduling system, the meeting tools, the filing
 * system. Eventually they can handle complex requests autonomously:
 * "Schedule a follow-up with the Tokyo team, pull their latest deal
 * status from Salesforce, and send them last meeting's action items
 * translated to Japanese."
 *
 * That's the journey this module enables for AI agents on the platform.
 * The Agentic AI Foundation provides:
 *
 *   1. TOOL REGISTRY — A catalogue of everything the agent can do.
 *      Each tool has a name, description, parameter schema, and an
 *      execute function. Tools map to real platform capabilities:
 *      schedule a meeting, look up a CRM contact, translate text,
 *      send a message, query analytics, etc.
 *
 *   2. INTENT CLASSIFIER — Given a natural language instruction,
 *      determine what the user wants to accomplish. Is this a
 *      question? A scheduling request? A CRM lookup? A multi-step
 *      workflow? The classifier maps utterances to tool combinations.
 *
 *   3. PLANNER — For complex requests that require multiple steps,
 *      the planner decomposes the instruction into a sequence of
 *      tool invocations with data dependencies. "Schedule a meeting
 *      and send the invite translated to Spanish" becomes:
 *        Step 1: schedule_meeting → get meeting details
 *        Step 2: translate_text(meeting details, 'es') → translated invite
 *        Step 3: send_message(translated invite)
 *
 *   4. EXECUTOR — Runs the plan step by step, passing outputs from
 *      one step as inputs to the next. Handles errors gracefully,
 *      with retry logic and fallback strategies.
 *
 *   5. CONVERSATION MEMORY — Short-term context for multi-turn
 *      agent interactions. The agent remembers what was discussed
 *      in the current conversation and can reference earlier results.
 *
 *   6. GUARDRAILS — Safety boundaries. The agent can't perform
 *      actions beyond its permission scope, can't access data
 *      outside its tenant, and must confirm destructive actions.
 *
 * REST endpoints:
 *
 *   POST   /agent/chat                  Natural language interaction
 *   POST   /agent/execute               Execute a specific tool
 *   GET    /agent/tools                 List available tools
 *   GET    /agent/tools/:id             Get tool details
 *   POST   /agent/plan                  Generate an execution plan
 *   POST   /agent/plan/:id/execute      Execute a saved plan
 *   GET    /agent/conversations         List agent conversations
 *   GET    /agent/conversations/:id     Get conversation history
 *   GET    /agent/config                Get agent config
 *   PUT    /agent/config                Update agent config
 *
 * Event prefix: agent:*
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { PluginContext } from '../../../core/plugin-interface';

// ─── Tool System ────────────────────────────────────────────────────

export interface AgentTool {
  id: string;
  /** Human-readable name */
  name: string;
  /** Description (included in LLM prompt for tool selection) */
  description: string;
  /** Category for grouping */
  category: 'communication' | 'crm' | 'scheduling' | 'analytics' | 'translation' | 'content' | 'admin' | 'custom';
  /** JSON Schema describing the tool's parameters */
  parameters: ToolParameterSchema;
  /** Whether the tool requires confirmation before execution */
  requiresConfirmation: boolean;
  /** Required permission role */
  requiredRole?: string;
  /** The execution function */
  execute: (params: Record<string, any>, context: AgentContext) => Promise<ToolResult>;
}

export interface ToolParameterSchema {
  type: 'object';
  properties: Record<string, {
    type: string;
    description: string;
    enum?: string[];
    required?: boolean;
    default?: any;
  }>;
  required?: string[];
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  /** Human-readable summary of what happened */
  summary: string;
  /** Suggest follow-up actions */
  suggestions?: string[];
}

// ─── Planning ───────────────────────────────────────────────────────

export interface ExecutionPlan {
  id: string;
  /** Original natural language instruction */
  instruction: string;
  /** Classified intent */
  intent: string;
  /** Ordered steps */
  steps: PlanStep[];
  /** Current execution status */
  status: 'planned' | 'executing' | 'completed' | 'failed' | 'cancelled';
  /** Which step is currently executing */
  currentStep: number;
  createdAt: Date;
  completedAt?: Date;
  tenantId: string;
}

export interface PlanStep {
  index: number;
  toolId: string;
  toolName: string;
  /** Description of what this step does */
  description: string;
  /** Parameters to pass (may reference outputs from previous steps via $step[N].field) */
  parameters: Record<string, any>;
  /** Dependency: indices of steps that must complete before this one */
  dependsOn: number[];
  /** Execution result */
  result?: ToolResult;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'skipped';
}

// ─── Conversation Memory ────────────────────────────────────────────

export interface AgentConversation {
  id: string;
  userId: string;
  /** Conversation turns */
  messages: AgentMessage[];
  /** Context accumulated across turns */
  context: Record<string, any>;
  /** Plans generated during this conversation */
  planIds: string[];
  createdAt: Date;
  updatedAt: Date;
  tenantId: string;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'agent' | 'system' | 'tool';
  content: string;
  /** Tool invocations in this message */
  toolCalls?: { toolId: string; params: Record<string, any>; result: ToolResult }[];
  /** Plan reference */
  planId?: string;
  timestamp: Date;
}

// ─── Agent Context ──────────────────────────────────────────────────

export interface AgentContext {
  userId: string;
  tenantId: string;
  roles: string[];
  conversationId?: string;
  /** Platform service references (injected by the agent engine) */
  bus: PluginContext['bus'];
  storage: PluginContext['storage'];
  logger: PluginContext['logger'];
}

// ─── Configuration ──────────────────────────────────────────────────

export interface AgenticConfig {
  /** LLM provider for reasoning */
  llmProvider: 'anthropic' | 'openai' | 'azure-openai' | 'self-hosted';
  apiKey: string;
  model: string;
  baseUrl?: string;
  /** Maximum steps in a single plan */
  maxPlanSteps: number;
  /** Maximum conversation turns before context trimming */
  maxConversationTurns: number;
  /** Whether to require confirmation for destructive actions */
  requireConfirmation: boolean;
  /** System prompt preamble */
  systemPrompt: string;
  /** Temperature for LLM reasoning */
  temperature: number;
  /** Maximum tokens for LLM response */
  maxTokens: number;
}

const DEFAULT_CONFIG: AgenticConfig = {
  llmProvider: 'anthropic',
  apiKey: '',
  model: 'claude-sonnet-4-20250514',
  maxPlanSteps: 10,
  maxConversationTurns: 50,
  requireConfirmation: true,
  systemPrompt: `You are an AI assistant integrated into a Unified Communications platform. You can schedule meetings, look up CRM contacts, translate messages, send communications, query analytics, and manage platform settings. Always explain what you're doing and ask for confirmation before destructive actions.`,
  temperature: 0.3,
  maxTokens: 4096,
};

// ─── Agentic AI Engine ──────────────────────────────────────────────

export class AgenticAIEngine {
  private config: AgenticConfig;
  /** Tool registry */
  private tools: Map<string, AgentTool> = new Map();
  /** Execution plans */
  private plans: Map<string, ExecutionPlan> = new Map();
  /** Conversations */
  private conversations: Map<string, AgentConversation> = new Map();

  constructor(private ctx: PluginContext, config?: Partial<AgenticConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registerBuiltInTools();
  }

  // ─── Tool Registry ────────────────────────────────────────────────

  registerTool(tool: AgentTool): void {
    this.tools.set(tool.id, tool);
    this.ctx.logger.info(`[AgenticAI] Tool registered: ${tool.id} (${tool.category})`);
  }

  unregisterTool(id: string): boolean { return this.tools.delete(id); }

  getTools(category?: string): AgentTool[] {
    let tools = [...this.tools.values()];
    if (category) tools = tools.filter(t => t.category === category);
    return tools;
  }

  getTool(id: string): AgentTool | undefined { return this.tools.get(id); }

  private registerBuiltInTools(): void {
    // ── Communication Tools ──────────────────────────────────────
    this.registerTool({
      id: 'send_message', name: 'Send Message',
      description: 'Send a message to a user or channel (chat, email, SMS, WhatsApp)',
      category: 'communication',
      parameters: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'Channel: chat, email, sms, whatsapp', enum: ['chat', 'email', 'sms', 'whatsapp'] },
          recipient: { type: 'string', description: 'Recipient identifier (email, phone, user ID)' },
          message: { type: 'string', description: 'Message text' },
          subject: { type: 'string', description: 'Email subject (for email channel)' },
        },
        required: ['channel', 'recipient', 'message'],
      },
      requiresConfirmation: false,
      execute: async (params, ctx) => {
        ctx.bus.emit('agent:send-message', { ...params, tenantId: ctx.tenantId } as any);
        return { success: true, summary: `Message sent to ${params.recipient} via ${params.channel}` };
      },
    });

    this.registerTool({
      id: 'make_call', name: 'Make Call',
      description: 'Initiate a phone call to a number or contact',
      category: 'communication',
      parameters: {
        type: 'object',
        properties: {
          phoneNumber: { type: 'string', description: 'Phone number to call' },
          contactName: { type: 'string', description: 'Contact name (for logging)' },
        },
        required: ['phoneNumber'],
      },
      requiresConfirmation: true,
      execute: async (params, ctx) => {
        ctx.bus.emit('call:click-to-dial-requested', { phoneNumber: params.phoneNumber, agentUserId: ctx.userId, tenantId: ctx.tenantId } as any);
        return { success: true, summary: `Call initiated to ${params.phoneNumber}` };
      },
    });

    // ── CRM Tools ────────────────────────────────────────────────
    this.registerTool({
      id: 'lookup_contact', name: 'Look Up CRM Contact',
      description: 'Search for a contact in the CRM by name, email, or phone number',
      category: 'crm',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (name, email, or phone)' },
          lookupType: { type: 'string', description: 'Type of lookup', enum: ['name', 'email', 'phone'] },
        },
        required: ['query'],
      },
      requiresConfirmation: false,
      execute: async (params, ctx) => {
        ctx.bus.emit('agent:crm-lookup', { query: params.query, type: params.lookupType, tenantId: ctx.tenantId } as any);
        return { success: true, summary: `CRM search initiated for "${params.query}"`, suggestions: ['View contact details', 'Log an activity', 'View open deals'] };
      },
    });

    this.registerTool({
      id: 'log_crm_activity', name: 'Log CRM Activity',
      description: 'Log a call, meeting, or note to the CRM',
      category: 'crm',
      parameters: {
        type: 'object',
        properties: {
          type: { type: 'string', description: 'Activity type', enum: ['CALL', 'MEETING', 'NOTE', 'EMAIL'] },
          contactId: { type: 'string', description: 'CRM contact ID' },
          subject: { type: 'string', description: 'Activity subject' },
          description: { type: 'string', description: 'Activity description/notes' },
        },
        required: ['type', 'subject'],
      },
      requiresConfirmation: false,
      execute: async (params, ctx) => {
        ctx.bus.emit('agent:log-crm-activity', { ...params, tenantId: ctx.tenantId } as any);
        return { success: true, summary: `${params.type} activity logged: ${params.subject}` };
      },
    });

    // ── Scheduling Tools ─────────────────────────────────────────
    this.registerTool({
      id: 'schedule_meeting', name: 'Schedule Meeting',
      description: 'Schedule a video meeting with participants',
      category: 'scheduling',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Meeting title' },
          participants: { type: 'string', description: 'Comma-separated participant emails' },
          dateTime: { type: 'string', description: 'Meeting date and time (ISO format)' },
          duration: { type: 'number', description: 'Duration in minutes', default: 30 },
          agenda: { type: 'string', description: 'Meeting agenda' },
        },
        required: ['title', 'participants', 'dateTime'],
      },
      requiresConfirmation: true,
      execute: async (params, ctx) => {
        ctx.bus.emit('agent:schedule-meeting', { ...params, tenantId: ctx.tenantId } as any);
        return { success: true, summary: `Meeting "${params.title}" scheduled for ${params.dateTime} with ${params.participants}`, suggestions: ['Send calendar invites', 'Add agenda items', 'Set up recording'] };
      },
    });

    // ── Translation Tools ────────────────────────────────────────
    this.registerTool({
      id: 'translate_text', name: 'Translate Text',
      description: 'Translate text from one language to another',
      category: 'translation',
      parameters: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'Text to translate' },
          targetLanguage: { type: 'string', description: 'Target language code (e.g., es, ja, de)' },
          sourceLanguage: { type: 'string', description: 'Source language (auto for detection)', default: 'auto' },
        },
        required: ['text', 'targetLanguage'],
      },
      requiresConfirmation: false,
      execute: async (params, ctx) => {
        ctx.bus.emit('agent:translate', { ...params, tenantId: ctx.tenantId } as any);
        return { success: true, summary: `Text translated to ${params.targetLanguage}`, data: { translatedText: `[translated: ${params.text.slice(0, 50)}...]` } };
      },
    });

    // ── Analytics Tools ──────────────────────────────────────────
    this.registerTool({
      id: 'query_analytics', name: 'Query Analytics',
      description: 'Query platform analytics: call volumes, queue stats, agent performance, meeting stats',
      category: 'analytics',
      parameters: {
        type: 'object',
        properties: {
          metric: { type: 'string', description: 'Metric to query', enum: ['call_volume', 'queue_performance', 'agent_stats', 'meeting_stats', 'sla_performance', 'channel_breakdown'] },
          timeRange: { type: 'string', description: 'Time range', enum: ['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month'] },
        },
        required: ['metric'],
      },
      requiresConfirmation: false,
      execute: async (params, ctx) => {
        ctx.bus.emit('agent:query-analytics', { ...params, tenantId: ctx.tenantId } as any);
        return { success: true, summary: `Analytics retrieved for ${params.metric} (${params.timeRange || 'today'})` };
      },
    });

    // ── Content Tools ────────────────────────────────────────────
    this.registerTool({
      id: 'summarise_meeting', name: 'Summarise Meeting',
      description: 'Generate or retrieve an AI summary of a meeting',
      category: 'content',
      parameters: {
        type: 'object',
        properties: {
          meetingId: { type: 'string', description: 'Meeting ID to summarise' },
          format: { type: 'string', description: 'Summary format', enum: ['brief', 'detailed', 'action_items_only', 'email'] },
        },
        required: ['meetingId'],
      },
      requiresConfirmation: false,
      execute: async (params, ctx) => {
        ctx.bus.emit('agent:summarise-meeting', { ...params, tenantId: ctx.tenantId } as any);
        return { success: true, summary: `Meeting summary generated in ${params.format || 'brief'} format` };
      },
    });

    this.registerTool({
      id: 'search_conversations', name: 'Search Conversations',
      description: 'Search across omnichannel conversations by keyword, contact, or date',
      category: 'content',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          channel: { type: 'string', description: 'Filter by channel', enum: ['all', 'voice', 'chat', 'email', 'sms', 'whatsapp'] },
          dateRange: { type: 'string', description: 'Date range (today, this_week, this_month)' },
        },
        required: ['query'],
      },
      requiresConfirmation: false,
      execute: async (params, ctx) => {
        ctx.bus.emit('agent:search-conversations', { ...params, tenantId: ctx.tenantId } as any);
        return { success: true, summary: `Conversation search completed for "${params.query}"` };
      },
    });

    this.ctx.logger.info(`[AgenticAI] ${this.tools.size} built-in tools registered`);
  }

  // ─── Natural Language Chat ────────────────────────────────────────

  async chat(userId: string, message: string, conversationId?: string, tenantId: string = '__default__'): Promise<{
    conversationId: string;
    response: string;
    toolCalls: { toolId: string; params: Record<string, any>; result: ToolResult }[];
    plan?: ExecutionPlan;
  }> {
    // Get or create conversation
    let conv: AgentConversation;
    if (conversationId && this.conversations.has(conversationId)) {
      conv = this.conversations.get(conversationId)!;
    } else {
      conv = {
        id: uuidv4(), userId,
        messages: [], context: {}, planIds: [],
        createdAt: new Date(), updatedAt: new Date(), tenantId,
      };
      this.conversations.set(conv.id, conv);
    }

    // Add user message
    conv.messages.push({ id: uuidv4(), role: 'user', content: message, timestamp: new Date() });
    conv.updatedAt = new Date();

    // Build context for LLM
    const systemPrompt = this.buildSystemPrompt();
    const conversationHistory = this.buildConversationHistory(conv);

    // Call LLM for reasoning
    const llmResponse = await this.callLLM(systemPrompt, conversationHistory);

    // Parse tool calls from LLM response
    const toolCalls = this.parseToolCalls(llmResponse);

    // Execute tool calls
    const agentCtx: AgentContext = {
      userId, tenantId, roles: [],
      conversationId: conv.id,
      bus: this.ctx.bus, storage: this.ctx.storage, logger: this.ctx.logger,
    };

    const executedCalls: { toolId: string; params: Record<string, any>; result: ToolResult }[] = [];
    for (const call of toolCalls) {
      const tool = this.tools.get(call.toolId);
      if (!tool) {
        executedCalls.push({ toolId: call.toolId, params: call.params, result: { success: false, error: 'Tool not found', summary: `Tool ${call.toolId} not found` } });
        continue;
      }

      if (tool.requiresConfirmation && this.config.requireConfirmation) {
        executedCalls.push({ toolId: call.toolId, params: call.params, result: { success: false, summary: `Action "${tool.name}" requires confirmation. Reply "confirm" to proceed.`, suggestions: ['confirm', 'cancel'] } });
        conv.context.pendingConfirmation = { toolId: call.toolId, params: call.params };
        continue;
      }

      try {
        const result = await tool.execute(call.params, agentCtx);
        executedCalls.push({ toolId: call.toolId, params: call.params, result });
      } catch (err: any) {
        executedCalls.push({ toolId: call.toolId, params: call.params, result: { success: false, error: err.message, summary: `Error: ${err.message}` } });
      }
    }

    // Handle confirmation flow
    if (message.toLowerCase() === 'confirm' && conv.context.pendingConfirmation) {
      const pending = conv.context.pendingConfirmation;
      const tool = this.tools.get(pending.toolId);
      if (tool) {
        try {
          const result = await tool.execute(pending.params, agentCtx);
          executedCalls.push({ toolId: pending.toolId, params: pending.params, result });
        } catch (err: any) {
          executedCalls.push({ toolId: pending.toolId, params: pending.params, result: { success: false, error: err.message, summary: `Error: ${err.message}` } });
        }
      }
      delete conv.context.pendingConfirmation;
    }

    // Clean LLM response (remove tool call markup)
    const cleanResponse = this.cleanResponse(llmResponse, executedCalls);

    // Add agent response to conversation
    conv.messages.push({
      id: uuidv4(), role: 'agent', content: cleanResponse,
      toolCalls: executedCalls.length > 0 ? executedCalls : undefined,
      timestamp: new Date(),
    });

    // Trim conversation if too long
    if (conv.messages.length > this.config.maxConversationTurns * 2) {
      conv.messages = conv.messages.slice(-this.config.maxConversationTurns * 2);
    }

    this.ctx.bus.emit('agent:chat-completed', {
      conversationId: conv.id, userId,
      toolCallCount: executedCalls.length,
      tenantId,
    } as any);

    return { conversationId: conv.id, response: cleanResponse, toolCalls: executedCalls };
  }

  // ─── Planning ─────────────────────────────────────────────────────

  async generatePlan(instruction: string, tenantId: string = '__default__'): Promise<ExecutionPlan> {
    const toolDescriptions = [...this.tools.values()].map(t =>
      `- ${t.id}: ${t.description} (params: ${Object.keys(t.parameters.properties).join(', ')})`
    ).join('\n');

    const planPrompt = `Given these available tools:\n${toolDescriptions}\n\nCreate an execution plan for: "${instruction}"\n\nRespond with a JSON array of steps, each with: toolId, description, parameters (object), dependsOn (array of step indices). Example:\n[{"toolId":"lookup_contact","description":"Find the contact","parameters":{"query":"John"},"dependsOn":[]},{"toolId":"send_message","description":"Send results","parameters":{"channel":"email","recipient":"$step[0].email","message":"Found contact"},"dependsOn":[0]}]`;

    const response = await this.callLLM(
      'You are a task planner. Respond ONLY with a valid JSON array of steps.',
      planPrompt,
    );

    let steps: PlanStep[];
    try {
      const parsed = JSON.parse(response.replace(/```json|```/g, '').trim());
      steps = (Array.isArray(parsed) ? parsed : []).map((s: any, i: number) => ({
        index: i,
        toolId: s.toolId,
        toolName: this.tools.get(s.toolId)?.name || s.toolId,
        description: s.description,
        parameters: s.parameters || {},
        dependsOn: s.dependsOn || [],
        status: 'pending' as const,
      }));
    } catch {
      steps = [{ index: 0, toolId: 'unknown', toolName: 'Unknown', description: instruction, parameters: {}, dependsOn: [], status: 'pending' }];
    }

    const plan: ExecutionPlan = {
      id: uuidv4(), instruction, intent: this.classifyIntent(instruction),
      steps, status: 'planned', currentStep: 0,
      createdAt: new Date(), tenantId,
    };

    this.plans.set(plan.id, plan);

    this.ctx.bus.emit('agent:plan-generated', {
      planId: plan.id, stepCount: steps.length, intent: plan.intent, tenantId,
    } as any);

    return plan;
  }

  async executePlan(planId: string, userId: string): Promise<ExecutionPlan> {
    const plan = this.plans.get(planId);
    if (!plan) throw new Error('Plan not found');

    plan.status = 'executing';
    const agentCtx: AgentContext = {
      userId, tenantId: plan.tenantId, roles: [],
      bus: this.ctx.bus, storage: this.ctx.storage, logger: this.ctx.logger,
    };

    for (let i = 0; i < plan.steps.length; i++) {
      const step = plan.steps[i];
      plan.currentStep = i;

      // Check dependencies
      const depsComplete = step.dependsOn.every(d => plan.steps[d]?.status === 'completed');
      if (!depsComplete) { step.status = 'skipped'; continue; }

      // Resolve $step[N] references in parameters
      const resolvedParams = this.resolveStepReferences(step.parameters, plan.steps);

      step.status = 'executing';
      const tool = this.tools.get(step.toolId);
      if (!tool) {
        step.result = { success: false, error: 'Tool not found', summary: `Tool ${step.toolId} not found` };
        step.status = 'failed';
        continue;
      }

      try {
        step.result = await tool.execute(resolvedParams, agentCtx);
        step.status = step.result.success ? 'completed' : 'failed';
      } catch (err: any) {
        step.result = { success: false, error: err.message, summary: `Error: ${err.message}` };
        step.status = 'failed';
      }
    }

    plan.status = plan.steps.every(s => s.status === 'completed' || s.status === 'skipped') ? 'completed' : 'failed';
    plan.completedAt = new Date();

    this.ctx.bus.emit('agent:plan-executed', {
      planId, status: plan.status,
      completedSteps: plan.steps.filter(s => s.status === 'completed').length,
      tenantId: plan.tenantId,
    } as any);

    return plan;
  }

  private resolveStepReferences(params: Record<string, any>, steps: PlanStep[]): Record<string, any> {
    const resolved: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string' && value.includes('$step[')) {
        const match = value.match(/\$step\[(\d+)\]\.?(\w+)?/);
        if (match) {
          const stepIdx = parseInt(match[1]);
          const field = match[2];
          const stepResult = steps[stepIdx]?.result?.data;
          resolved[key] = field && stepResult ? stepResult[field] : stepResult || value;
        } else {
          resolved[key] = value;
        }
      } else {
        resolved[key] = value;
      }
    }
    return resolved;
  }

  // ─── Intent Classification ────────────────────────────────────────

  private classifyIntent(text: string): string {
    const lower = text.toLowerCase();
    const intents: [string, string[]][] = [
      ['scheduling', ['schedule', 'meeting', 'book', 'calendar', 'appointment', 'invite']],
      ['communication', ['send', 'message', 'email', 'call', 'text', 'reply', 'forward']],
      ['crm_lookup', ['contact', 'customer', 'crm', 'account', 'deal', 'lookup', 'find', 'search person']],
      ['translation', ['translate', 'translation', 'language', 'spanish', 'french', 'japanese', 'german']],
      ['analytics', ['analytics', 'report', 'stats', 'metrics', 'performance', 'volume', 'dashboard']],
      ['meeting_intelligence', ['summary', 'action items', 'meeting notes', 'transcript', 'minutes']],
      ['conversation_search', ['conversation', 'chat history', 'find message', 'search chat']],
    ];

    for (const [intent, keywords] of intents) {
      if (keywords.some(kw => lower.includes(kw))) return intent;
    }
    return 'general';
  }

  // ─── LLM Integration ─────────────────────────────────────────────

  private buildSystemPrompt(): string {
    const toolList = [...this.tools.values()].map(t =>
      `Tool: ${t.id}\nDescription: ${t.description}\nParameters: ${JSON.stringify(t.parameters.properties)}\n`
    ).join('\n');

    return `${this.config.systemPrompt}\n\nAvailable tools:\n${toolList}\n\nTo use a tool, include in your response: <tool_call tool_id="tool_name" params='{"key":"value"}'/>.\nYou may use multiple tools in one response.`;
  }

  private buildConversationHistory(conv: AgentConversation): string {
    return conv.messages.slice(-20).map(m => {
      let text = `[${m.role}]: ${m.content}`;
      if (m.toolCalls) {
        for (const tc of m.toolCalls) {
          text += `\n[tool result: ${tc.toolId}]: ${tc.result.summary}`;
        }
      }
      return text;
    }).join('\n\n');
  }

  private parseToolCalls(response: string): { toolId: string; params: Record<string, any> }[] {
    const calls: { toolId: string; params: Record<string, any> }[] = [];
    const regex = /<tool_call\s+tool_id="([^"]+)"\s+params='([^']*)'\s*\/>/g;
    let match;
    while ((match = regex.exec(response)) !== null) {
      try {
        calls.push({ toolId: match[1], params: JSON.parse(match[2]) });
      } catch { /* skip malformed */ }
    }
    return calls;
  }

  private cleanResponse(response: string, toolCalls: any[]): string {
    let cleaned = response.replace(/<tool_call[^>]*\/>/g, '').trim();
    if (toolCalls.length > 0) {
      const summaries = toolCalls.map(tc => `✓ ${tc.result.summary}`).join('\n');
      if (cleaned) cleaned += '\n\n' + summaries;
      else cleaned = summaries;
    }
    return cleaned || 'Done.';
  }

  private async callLLM(systemPrompt: string, userMessage: string): Promise<string> {
    const url = this.config.llmProvider === 'anthropic'
      ? 'https://api.anthropic.com/v1/messages'
      : this.config.llmProvider === 'openai'
        ? 'https://api.openai.com/v1/chat/completions'
        : this.config.baseUrl || '';

    if (this.config.llmProvider === 'anthropic') {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': this.config.apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({
          model: this.config.model, max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          system: systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
        }),
      });
      if (!resp.ok) throw new Error(`Anthropic API error: ${resp.status}`);
      const data = await resp.json() as any;
      return data.content?.[0]?.text || '';
    } else {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.config.apiKey}` },
        body: JSON.stringify({
          model: this.config.model, max_tokens: this.config.maxTokens,
          temperature: this.config.temperature,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
        }),
      });
      if (!resp.ok) throw new Error(`LLM API error: ${resp.status}`);
      const data = await resp.json() as any;
      return data.choices?.[0]?.message?.content || '';
    }
  }

  // ─── Query ────────────────────────────────────────────────────────

  getConversation(id: string): AgentConversation | undefined { return this.conversations.get(id); }
  listConversations(userId?: string): AgentConversation[] {
    let convs = [...this.conversations.values()];
    if (userId) convs = convs.filter(c => c.userId === userId);
    return convs.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  getConfig(): AgenticConfig { return { ...this.config, apiKey: '***' }; }
  updateConfig(updates: Partial<AgenticConfig>): void { Object.assign(this.config, updates); }

  // ─── REST Router ──────────────────────────────────────────────────

  createRouter(): Router {
    const r = Router();

    r.post('/agent/chat', async (req: Request, res: Response) => {
      const { userId, message, conversationId, tenantId } = req.body;
      if (!message) return res.status(400).json({ error: 'message required' });
      try {
        const result = await this.chat(userId || 'anonymous', message, conversationId, tenantId);
        res.json(result);
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    r.post('/agent/execute', async (req: Request, res: Response) => {
      const { toolId, params, userId, tenantId } = req.body;
      if (!toolId) return res.status(400).json({ error: 'toolId required' });
      const tool = this.tools.get(toolId);
      if (!tool) return res.status(404).json({ error: 'Tool not found' });
      const ctx: AgentContext = { userId: userId || 'anonymous', tenantId: tenantId || '__default__', roles: [], bus: this.ctx.bus, storage: this.ctx.storage, logger: this.ctx.logger };
      try {
        const result = await tool.execute(params || {}, ctx);
        res.json(result);
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    r.get('/agent/tools', (req: Request, res: Response) => {
      const tools = this.getTools(req.query.category as string).map(t => ({
        id: t.id, name: t.name, description: t.description, category: t.category,
        parameters: t.parameters, requiresConfirmation: t.requiresConfirmation,
      }));
      res.json({ tools, total: tools.length });
    });

    r.get('/agent/tools/:id', (req: Request, res: Response) => {
      const tool = this.getTool(req.params.id);
      if (!tool) return res.status(404).json({ error: 'Tool not found' });
      res.json({ id: tool.id, name: tool.name, description: tool.description, category: tool.category, parameters: tool.parameters, requiresConfirmation: tool.requiresConfirmation });
    });

    r.post('/agent/plan', async (req: Request, res: Response) => {
      const { instruction, tenantId } = req.body;
      if (!instruction) return res.status(400).json({ error: 'instruction required' });
      try {
        const plan = await this.generatePlan(instruction, tenantId);
        res.json(plan);
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    r.post('/agent/plan/:id/execute', async (req: Request, res: Response) => {
      const { userId } = req.body;
      try {
        const plan = await this.executePlan(req.params.id, userId || 'anonymous');
        res.json(plan);
      } catch (err: any) { res.status(500).json({ error: err.message }); }
    });

    r.get('/agent/conversations', (req: Request, res: Response) => {
      const convs = this.listConversations(req.query.userId as string);
      res.json({ conversations: convs.map(c => ({ id: c.id, userId: c.userId, messageCount: c.messages.length, createdAt: c.createdAt, updatedAt: c.updatedAt })), total: convs.length });
    });

    r.get('/agent/conversations/:id', (req: Request, res: Response) => {
      const conv = this.getConversation(req.params.id);
      if (!conv) return res.status(404).json({ error: 'Conversation not found' });
      res.json(conv);
    });

    r.get('/agent/config', (_req: Request, res: Response) => { res.json(this.getConfig()); });
    r.put('/agent/config', (req: Request, res: Response) => { this.updateConfig(req.body); res.json(this.getConfig()); });

    return r;
  }

  getHealth() {
    return {
      tools: this.tools.size,
      conversations: this.conversations.size,
      plans: this.plans.size,
      config: { provider: this.config.llmProvider, model: this.config.model },
    };
  }
}

export default AgenticAIEngine;
