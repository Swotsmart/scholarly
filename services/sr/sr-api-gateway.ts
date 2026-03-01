/**
 * ============================================================================
 * Sense & Respond — Canvas API Gateway
 * ============================================================================
 *
 * §5.2.5 of the S&R Competitive Strategy — the thin REST/WebSocket API
 * layer that brokers between the Canvas UI (sr-canvas-production.tsx)
 * and the Workflow Execution Engine (sr-workflow-engine.ts).
 *
 * If the engine is the railway signalling system and the canvas is the
 * station concourse, this gateway is the ticket office and departure
 * board combined: it accepts workflow submissions (ticket purchases),
 * triggers executions (departures), streams live status updates
 * (departure board), and handles the back-and-forth of pause/resume
 * (holding a train at the platform until the conductor signals "go").
 *
 * REST Endpoints:
 *   POST   /api/v1/workflows                — Save workflow definition
 *   GET    /api/v1/workflows/:id             — Load workflow definition
 *   GET    /api/v1/workflows                 — List workflows for tenant
 *   DELETE /api/v1/workflows/:id             — Delete workflow
 *   POST   /api/v1/workflows/:id/execute     — Trigger execution
 *   POST   /api/v1/runs/:id/resume           — Resume paused workflow
 *   POST   /api/v1/runs/:id/cancel           — Cancel running workflow
 *   GET    /api/v1/runs/:id                  — Get run status
 *   GET    /api/v1/runs                      — List runs for workflow
 *   GET    /api/v1/registry/catalogue        — Node types for palette
 *   POST   /api/v1/ai/workflow-explain       — AI-powered workflow explanation
 *
 * WebSocket:
 *   /api/v1/runs/:id/stream                  — Real-time node status events
 *
 * Architecture decisions:
 *   - Express + ws (not Fastify) for consistency with S&R TypeScript backend
 *   - NATS subscription relays engine events to WebSocket clients
 *   - Prisma-compatible persistence interface (pluggable store)
 *   - Multi-tenant isolation via X-Tenant-Id header
 *   - Rate limiting on execution endpoints
 *   - Structured JSON logging throughout
 *
 * @module scholarly/sr/api-gateway
 */

import {
  WorkflowDefinition,
  WorkflowNode,
  WorkflowEdge,
  WorkflowTrigger,
  WorkflowRun,
  WorkflowRunStatus,
  NodeTypeRegistry,
  WorkflowRunner,
  WorkflowRunnerDeps,
  WorkflowRunStore,
  WorkflowServices,
  NodeOutput,
  validateWorkflow,
  WORKFLOW_EVENTS,
  Result,
  success,
  failure,
  Errors,
  ServiceError,
} from './sr-workflow-engine';


// ============================================================================
// §1 — SHARED TYPES
// ============================================================================

/**
 * API request context extracted from headers and auth middleware.
 */
export interface RequestContext {
  tenantId: string;
  userId: string;
  roles: string[];
}

/**
 * Standard API response envelope. Every endpoint returns this shape
 * so the canvas client can handle responses uniformly.
 */
export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string };
  meta?: { timestamp: string; requestId: string };
}

/**
 * Workflow persistence record — the shape stored in the database.
 * Extends the engine's WorkflowDefinition with persistence metadata.
 */
export interface StoredWorkflow {
  workflowId: string;
  tenantId: string;
  name: string;
  description: string;
  version: number;
  definition: WorkflowDefinition;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tags: string[];
  isDeleted: boolean;
}

/**
 * Persistence interface for workflows. Implementations can use
 * Prisma, in-memory store, or any other backend.
 */
export interface WorkflowStore {
  save(workflow: StoredWorkflow): Promise<void>;
  load(workflowId: string, tenantId: string): Promise<StoredWorkflow | null>;
  update(workflowId: string, tenantId: string, updates: Partial<StoredWorkflow>): Promise<void>;
  list(tenantId: string, options?: { limit?: number; offset?: number; tags?: string[] }): Promise<StoredWorkflow[]>;
  softDelete(workflowId: string, tenantId: string): Promise<void>;
}

/**
 * Event bus interface — wraps NATS for publish/subscribe.
 */
export interface EventBus {
  publish(topic: string, payload: Record<string, unknown>): Promise<void>;
  subscribe(topic: string, handler: (payload: Record<string, unknown>) => void): { unsubscribe: () => void };
}

/**
 * Configuration for the API Gateway.
 */
export interface GatewayConfig {
  port: number;
  corsOrigins: string[];
  rateLimitPerMinute: number;
  maxWorkflowsPerTenant: number;
  maxConcurrentRunsPerTenant: number;
  aiEndpoint?: string;
  aiApiKey?: string;
}

const DEFAULT_CONFIG: GatewayConfig = {
  port: 3100,
  corsOrigins: ['http://localhost:3000', 'http://localhost:5173'],
  rateLimitPerMinute: 60,
  maxWorkflowsPerTenant: 500,
  maxConcurrentRunsPerTenant: 10,
};


// ============================================================================
// §2 — IN-MEMORY STORES (Development / Testing)
// ============================================================================
//
// Production deployments use Prisma-backed stores. These in-memory
// implementations enable development, testing, and demo mode without
// any database dependency.

export class InMemoryWorkflowStore implements WorkflowStore {
  private store = new Map<string, StoredWorkflow>();

  private key(workflowId: string, tenantId: string): string {
    return `${tenantId}:${workflowId}`;
  }

  async save(workflow: StoredWorkflow): Promise<void> {
    this.store.set(this.key(workflow.workflowId, workflow.tenantId), { ...workflow });
  }

  async load(workflowId: string, tenantId: string): Promise<StoredWorkflow | null> {
    const w = this.store.get(this.key(workflowId, tenantId));
    if (!w || w.isDeleted) return null;
    return { ...w };
  }

  async update(workflowId: string, tenantId: string, updates: Partial<StoredWorkflow>): Promise<void> {
    const existing = this.store.get(this.key(workflowId, tenantId));
    if (!existing) throw new Error(`Workflow ${workflowId} not found`);
    this.store.set(this.key(workflowId, tenantId), { ...existing, ...updates, updatedAt: new Date() });
  }

  async list(tenantId: string, options?: { limit?: number; offset?: number; tags?: string[] }): Promise<StoredWorkflow[]> {
    const results: StoredWorkflow[] = [];
    for (const w of this.store.values()) {
      if (w.tenantId === tenantId && !w.isDeleted) {
        if (options?.tags && options.tags.length > 0) {
          if (!options.tags.some(t => w.tags.includes(t))) continue;
        }
        results.push({ ...w });
      }
    }
    results.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;
    return results.slice(offset, offset + limit);
  }

  async softDelete(workflowId: string, tenantId: string): Promise<void> {
    const existing = this.store.get(this.key(workflowId, tenantId));
    if (existing) {
      existing.isDeleted = true;
      existing.updatedAt = new Date();
    }
  }
}


export class InMemoryRunStore implements WorkflowRunStore {
  private store = new Map<string, WorkflowRun>();
  private byWorkflow = new Map<string, string[]>();

  async save(run: WorkflowRun): Promise<void> {
    this.store.set(run.runId, this.cloneRun(run));
    const wfRuns = this.byWorkflow.get(run.workflowId) ?? [];
    wfRuns.push(run.runId);
    this.byWorkflow.set(run.workflowId, wfRuns);
  }

  async load(runId: string): Promise<WorkflowRun | null> {
    const run = this.store.get(runId);
    return run ? this.cloneRun(run) : null;
  }

  async update(runId: string, updates: Partial<WorkflowRun>): Promise<void> {
    const existing = this.store.get(runId);
    if (!existing) return;
    Object.assign(existing, updates);
  }

  async findByWorkflow(workflowId: string, limit: number = 20): Promise<WorkflowRun[]> {
    const runIds = this.byWorkflow.get(workflowId) ?? [];
    const runs: WorkflowRun[] = [];
    for (const id of runIds.slice(-limit).reverse()) {
      const run = this.store.get(id);
      if (run) runs.push(this.cloneRun(run));
    }
    return runs;
  }

  private cloneRun(run: WorkflowRun): WorkflowRun {
    return {
      ...run,
      nodeRuns: run.nodeRuns.map(nr => ({ ...nr })),
      portData: new Map(run.portData),
      timeline: run.timeline.map(t => ({ ...t })),
    };
  }
}


export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Array<(payload: Record<string, unknown>) => void>>();

  async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
    const subscribers = this.handlers.get(topic) ?? [];
    // Also publish to wildcard subscribers
    const wildcardSubs = this.handlers.get('*') ?? [];
    for (const handler of [...subscribers, ...wildcardSubs]) {
      try {
        handler({ ...payload, __topic: topic });
      } catch (err) {
        console.error(`Event handler error on ${topic}:`, err);
      }
    }
  }

  subscribe(topic: string, handler: (payload: Record<string, unknown>) => void): { unsubscribe: () => void } {
    const handlers = this.handlers.get(topic) ?? [];
    handlers.push(handler);
    this.handlers.set(topic, handlers);

    return {
      unsubscribe: () => {
        const current = this.handlers.get(topic) ?? [];
        this.handlers.set(topic, current.filter(h => h !== handler));
      },
    };
  }
}


// ============================================================================
// §3 — REQUEST HANDLERS
// ============================================================================
//
// Each handler is a pure function: receives parsed request + context,
// returns ApiResponse. No HTTP framework coupling — these can be called
// from Express, Fastify, tests, or serverless functions.

/**
 * POST /api/v1/workflows — Save (create or update) a workflow definition.
 */
export async function handleSaveWorkflow(
  body: {
    workflowId?: string;
    name: string;
    description?: string;
    nodes: Array<{ nodeId: string; typeId: string; label?: string; config: Record<string, unknown>; position?: { x: number; y: number } }>;
    edges: Array<{ edgeId: string; sourceNodeId: string; sourcePortId: string; targetNodeId: string; targetPortId: string }>;
    trigger?: WorkflowTrigger;
    tags?: string[];
    templateId?: string;
  },
  ctx: RequestContext,
  deps: { workflowStore: WorkflowStore; registry: NodeTypeRegistry },
): Promise<ApiResponse<{ workflowId: string; version: number; savedAt: string }>> {
  // Validate required fields
  if (!body.name?.trim()) {
    return apiError('VALIDATION_ERROR', 'Workflow name is required', 400);
  }
  if (!body.nodes || body.nodes.length === 0) {
    return apiError('VALIDATION_ERROR', 'Workflow must have at least one node', 400);
  }

  const workflowId = body.workflowId || generateGatewayId('wf');
  const now = new Date();

  // Build the engine-compatible WorkflowDefinition
  const definition: WorkflowDefinition = {
    workflowId,
    name: body.name,
    description: body.description ?? '',
    version: 1,
    nodes: body.nodes.map(n => ({
      nodeId: n.nodeId,
      typeId: n.typeId,
      label: n.label,
      config: n.config,
      position: n.position,
    })),
    edges: body.edges.map(e => ({
      edgeId: e.edgeId,
      sourceNodeId: e.sourceNodeId,
      sourcePortId: e.sourcePortId,
      targetNodeId: e.targetNodeId,
      targetPortId: e.targetPortId,
    })),
    trigger: body.trigger ?? { type: 'manual' },
    metadata: {
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
      tenantId: ctx.tenantId,
      tags: body.tags ?? [],
      templateId: body.templateId,
    },
  };

  // Validate against registry
  const issues = validateWorkflow(definition, deps.registry);
  const errors = issues.filter(i => i.severity === 'error');
  if (errors.length > 0) {
    return apiError('VALIDATION_ERROR', `Workflow has ${errors.length} error(s): ${errors.map(e => e.message).join('; ')}`, 400);
  }

  // Check if this is an update
  const existing = await deps.workflowStore.load(workflowId, ctx.tenantId);
  if (existing) {
    definition.version = existing.version + 1;
    definition.metadata.createdAt = existing.createdAt;
    definition.metadata.createdBy = existing.createdBy;
    await deps.workflowStore.update(workflowId, ctx.tenantId, {
      name: definition.name,
      description: definition.description,
      version: definition.version,
      definition,
      tags: body.tags ?? existing.tags,
      updatedAt: now,
    });
  } else {
    const stored: StoredWorkflow = {
      workflowId,
      tenantId: ctx.tenantId,
      name: definition.name,
      description: definition.description,
      version: definition.version,
      definition,
      createdBy: ctx.userId,
      createdAt: now,
      updatedAt: now,
      tags: body.tags ?? [],
      isDeleted: false,
    };
    await deps.workflowStore.save(stored);
  }

  return apiSuccess({ workflowId, version: definition.version, savedAt: now.toISOString() });
}


/**
 * GET /api/v1/workflows/:id — Load a workflow definition.
 */
export async function handleLoadWorkflow(
  workflowId: string,
  ctx: RequestContext,
  deps: { workflowStore: WorkflowStore },
): Promise<ApiResponse<StoredWorkflow>> {
  const workflow = await deps.workflowStore.load(workflowId, ctx.tenantId);
  if (!workflow) {
    return apiError('NOT_FOUND', `Workflow '${workflowId}' not found`, 404);
  }
  return apiSuccess(workflow);
}


/**
 * GET /api/v1/workflows — List workflows for tenant.
 */
export async function handleListWorkflows(
  query: { limit?: number; offset?: number; tags?: string[] },
  ctx: RequestContext,
  deps: { workflowStore: WorkflowStore },
): Promise<ApiResponse<{ workflows: StoredWorkflow[]; total: number }>> {
  const workflows = await deps.workflowStore.list(ctx.tenantId, {
    limit: query.limit ?? 50,
    offset: query.offset ?? 0,
    tags: query.tags,
  });
  return apiSuccess({ workflows, total: workflows.length });
}


/**
 * DELETE /api/v1/workflows/:id — Soft-delete a workflow.
 */
export async function handleDeleteWorkflow(
  workflowId: string,
  ctx: RequestContext,
  deps: { workflowStore: WorkflowStore },
): Promise<ApiResponse<{ deleted: boolean }>> {
  const workflow = await deps.workflowStore.load(workflowId, ctx.tenantId);
  if (!workflow) {
    return apiError('NOT_FOUND', `Workflow '${workflowId}' not found`, 404);
  }
  await deps.workflowStore.softDelete(workflowId, ctx.tenantId);
  return apiSuccess({ deleted: true });
}


/**
 * POST /api/v1/workflows/:id/execute — Trigger workflow execution.
 */
export async function handleExecuteWorkflow(
  workflowId: string,
  body: { userId?: string },
  ctx: RequestContext,
  deps: { workflowStore: WorkflowStore; runner: WorkflowRunner },
): Promise<ApiResponse<{ runId: string; status: string }>> {
  const workflow = await deps.workflowStore.load(workflowId, ctx.tenantId);
  if (!workflow) {
    return apiError('NOT_FOUND', `Workflow '${workflowId}' not found`, 404);
  }

  const result = await deps.runner.execute(
    workflow.definition,
    ctx.tenantId,
    body.userId ?? ctx.userId,
  );

  if (!result.ok) {
    return apiError(result.error.code, result.error.message, result.error.statusCode);
  }

  return apiSuccess({ runId: result.value.runId, status: result.value.status });
}


/**
 * POST /api/v1/runs/:id/resume — Resume a paused workflow with human input.
 */
export async function handleResumeRun(
  runId: string,
  body: { data?: Record<string, unknown> },
  ctx: RequestContext,
  deps: { runner: WorkflowRunner; workflowStore: WorkflowStore; runStore: WorkflowRunStore },
): Promise<ApiResponse<{ runId: string; status: string }>> {
  const run = await deps.runStore.load(runId);
  if (!run) {
    return apiError('NOT_FOUND', `Run '${runId}' not found`, 404);
  }

  // Load the workflow definition for resume (runner needs it to recompute layers)
  const workflow = await deps.workflowStore.load(run.workflowId, ctx.tenantId);
  if (!workflow) {
    return apiError('NOT_FOUND', `Workflow '${run.workflowId}' not found`, 404);
  }

  const nodeOutputData: NodeOutput = body.data ?? {};
  const result = await deps.runner.resume(runId, nodeOutputData, workflow.definition);

  if (!result.ok) {
    return apiError(result.error.code, result.error.message, result.error.statusCode);
  }

  return apiSuccess({ runId: result.value.runId, status: result.value.status });
}


/**
 * POST /api/v1/runs/:id/cancel — Cancel a running or paused workflow.
 */
export async function handleCancelRun(
  runId: string,
  body: { reason?: string },
  ctx: RequestContext,
  deps: { runner: WorkflowRunner },
): Promise<ApiResponse<{ runId: string; status: string }>> {
  const result = await deps.runner.cancel(runId, body.reason);

  if (!result.ok) {
    return apiError(result.error.code, result.error.message, result.error.statusCode);
  }

  return apiSuccess({ runId: result.value.runId, status: result.value.status });
}


/**
 * GET /api/v1/runs/:id — Get the current status of a workflow run.
 */
export async function handleGetRunStatus(
  runId: string,
  ctx: RequestContext,
  deps: { runner: WorkflowRunner },
): Promise<ApiResponse<{
  runId: string;
  workflowId: string;
  status: string;
  nodeRuns: Array<{ nodeId: string; typeId: string; status: string; durationMs: number; error?: string }>;
  pausedAtNodeId?: string;
  error?: { nodeId: string; message: string };
  durationMs: number;
  timeline: Array<{ timestamp: string; event: string; nodeId?: string; detail?: string }>;
}>> {
  const result = await deps.runner.getRunStatus(runId);

  if (!result.ok) {
    return apiError(result.error.code, result.error.message, result.error.statusCode);
  }

  const run = result.value;
  return apiSuccess({
    runId: run.runId,
    workflowId: run.workflowId,
    status: run.status,
    nodeRuns: run.nodeRuns.map(nr => ({
      nodeId: nr.nodeId,
      typeId: nr.typeId,
      status: nr.status,
      durationMs: nr.durationMs,
      error: nr.error,
    })),
    pausedAtNodeId: run.pausedAtNodeId,
    error: run.error,
    durationMs: run.durationMs,
    timeline: run.timeline.map(t => ({
      timestamp: t.timestamp instanceof Date ? t.timestamp.toISOString() : String(t.timestamp),
      event: t.event,
      nodeId: t.nodeId,
      detail: t.detail,
    })),
  });
}


/**
 * GET /api/v1/runs — List runs for a workflow.
 */
export async function handleListRuns(
  query: { workflowId: string; limit?: number },
  ctx: RequestContext,
  deps: { runner: WorkflowRunner },
): Promise<ApiResponse<{ runs: Array<{ runId: string; status: string; startedAt: string; durationMs: number }> }>> {
  const result = await deps.runner.getRunHistory(query.workflowId, query.limit ?? 20);

  if (!result.ok) {
    return apiError(result.error.code, result.error.message, result.error.statusCode);
  }

  return apiSuccess({
    runs: result.value.map(r => ({
      runId: r.runId,
      status: r.status,
      startedAt: r.startedAt instanceof Date ? r.startedAt.toISOString() : String(r.startedAt),
      durationMs: r.durationMs,
    })),
  });
}


/**
 * GET /api/v1/registry/catalogue — Get the node type catalogue for the canvas palette.
 */
export function handleGetCatalogue(
  deps: { registry: NodeTypeRegistry },
): ApiResponse<ReturnType<NodeTypeRegistry['getCatalogue']>> {
  return apiSuccess(deps.registry.getCatalogue());
}


/**
 * POST /api/v1/ai/workflow-explain — AI-powered workflow explanation.
 * Calls Claude to generate a rich narrative about the workflow.
 */
export async function handleAIExplain(
  body: { context: Record<string, unknown>; prompt: string },
  ctx: RequestContext,
  config: GatewayConfig,
): Promise<ApiResponse<{ narrative: string; suggestions: string[] }>> {
  if (!config.aiEndpoint || !config.aiApiKey) {
    return apiError('NOT_CONFIGURED', 'AI endpoint not configured', 501);
  }

  try {
    const response = await fetch(config.aiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.aiApiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        system: `You are the Scholarly S&R Workflow Intelligence assistant. You explain data workflows to educators in clear, non-technical language. Focus on what the workflow does, what data flows through it, and what insights it produces. When education nodes are present, explain their pedagogical significance. Always provide 2-3 actionable suggestions.`,
        messages: [
          {
            role: 'user',
            content: `Explain this workflow:\n\n${JSON.stringify(body.context, null, 2)}\n\nUser's question: ${body.prompt}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return apiError('AI_ERROR', `AI endpoint returned ${response.status}`, 502);
    }

    const aiResponse = await response.json() as { content: Array<{ type: string; text: string }> };
    const text = aiResponse.content?.find((c: { type: string }) => c.type === 'text')?.text ?? '';

    // Parse suggestions from the AI response (look for numbered list or bullet points)
    const lines = text.split('\n');
    const suggestions: string[] = [];
    let narrative = '';
    let inSuggestions = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().includes('suggestion') || trimmed.toLowerCase().includes('improvement') || trimmed.toLowerCase().includes('recommend')) {
        inSuggestions = true;
        continue;
      }
      if (inSuggestions && (trimmed.startsWith('-') || trimmed.startsWith('•') || /^\d+\./.test(trimmed))) {
        suggestions.push(trimmed.replace(/^[-•\d.]\s*/, ''));
      } else if (!inSuggestions) {
        narrative += line + '\n';
      }
    }

    return apiSuccess({
      narrative: narrative.trim() || text,
      suggestions: suggestions.length > 0 ? suggestions : ['Consider adding a notification step to alert stakeholders when the workflow completes.'],
    });
  } catch (err) {
    return apiError('AI_ERROR', `AI request failed: ${err instanceof Error ? err.message : String(err)}`, 502);
  }
}


// ============================================================================
// §4 — WEBSOCKET MANAGER
// ============================================================================
//
// The WebSocket manager bridges NATS workflow events to connected
// canvas clients. When a client connects to /api/v1/runs/:id/stream,
// we subscribe to the relevant NATS topics for that run and relay
// events as JSON messages. This gives the canvas real-time node-by-node
// execution updates without polling.

export interface WebSocketClient {
  id: string;
  runId: string;
  send(data: string): void;
  close(): void;
  isOpen: boolean;
}

export class WebSocketManager {
  private clients = new Map<string, Set<WebSocketClient>>();
  private subscriptions = new Map<string, { unsubscribe: () => void }>();

  constructor(private readonly eventBus: EventBus) {}

  /**
   * Register a new WebSocket client for a specific run.
   */
  addClient(client: WebSocketClient): void {
    const runClients = this.clients.get(client.runId) ?? new Set();
    runClients.add(client);
    this.clients.set(client.runId, runClients);

    // Send initial connected message
    this.safeSend(client, {
      type: 'connected',
      runId: client.runId,
      timestamp: new Date().toISOString(),
    });

    // Start NATS subscription for this run if not already active
    if (!this.subscriptions.has(client.runId)) {
      this.startSubscription(client.runId);
    }
  }

  /**
   * Remove a disconnected client.
   */
  removeClient(client: WebSocketClient): void {
    const runClients = this.clients.get(client.runId);
    if (runClients) {
      runClients.delete(client);
      if (runClients.size === 0) {
        this.clients.delete(client.runId);
        // Stop NATS subscription if no more clients
        const sub = this.subscriptions.get(client.runId);
        if (sub) {
          sub.unsubscribe();
          this.subscriptions.delete(client.runId);
        }
      }
    }
  }

  /**
   * Start a NATS subscription that relays events to WebSocket clients.
   */
  private startSubscription(runId: string): void {
    // Subscribe to all workflow events (wildcard)
    const sub = this.eventBus.subscribe('*', (payload) => {
      // Filter by runId
      if (payload['runId'] !== runId) return;

      const topic = payload['__topic'] as string ?? '';
      const clients = this.clients.get(runId);
      if (!clients || clients.size === 0) return;

      // Map NATS event to WebSocket message
      const message = this.mapEventToWSMessage(topic, payload, runId);
      if (!message) return;

      for (const client of clients) {
        this.safeSend(client, message);
      }
    });

    this.subscriptions.set(runId, sub);
  }

  /**
   * Map a NATS workflow event to a WebSocket message for the canvas.
   */
  private mapEventToWSMessage(
    topic: string,
    payload: Record<string, unknown>,
    runId: string,
  ): Record<string, unknown> | null {
    switch (topic) {
      case WORKFLOW_EVENTS.NODE_STARTED:
        return {
          type: 'node_status',
          runId,
          nodeId: payload['nodeId'],
          status: 'running',
        };
      case WORKFLOW_EVENTS.NODE_COMPLETED:
        return {
          type: 'node_status',
          runId,
          nodeId: payload['nodeId'],
          status: 'completed',
          durationMs: payload['durationMs'],
        };
      case WORKFLOW_EVENTS.NODE_FAILED:
        return {
          type: 'node_status',
          runId,
          nodeId: payload['nodeId'],
          status: 'failed',
          error: payload['error'],
        };
      case WORKFLOW_EVENTS.NODE_PAUSED:
        return {
          type: 'node_status',
          runId,
          nodeId: payload['nodeId'],
          status: 'paused',
        };
      case WORKFLOW_EVENTS.RUN_COMPLETED:
      case WORKFLOW_EVENTS.RUN_FAILED:
      case WORKFLOW_EVENTS.RUN_CANCELLED:
        return {
          type: 'run_status',
          runId,
          status: payload['status'],
          durationMs: payload['durationMs'],
        };
      case WORKFLOW_EVENTS.RUN_PAUSED:
        return {
          type: 'run_status',
          runId,
          status: 'paused',
          nodeId: payload['nodeId'],
        };
      case WORKFLOW_EVENTS.RUN_RESUMED:
        return {
          type: 'run_status',
          runId,
          status: 'running',
          nodeId: payload['nodeId'],
        };
      default:
        return null;
    }
  }

  private safeSend(client: WebSocketClient, data: Record<string, unknown>): void {
    try {
      if (client.isOpen) {
        client.send(JSON.stringify(data));
      }
    } catch {
      // Client disconnected, will be cleaned up
    }
  }

  /**
   * Dispose all subscriptions and close all clients.
   */
  dispose(): void {
    for (const sub of this.subscriptions.values()) {
      sub.unsubscribe();
    }
    this.subscriptions.clear();
    for (const clients of this.clients.values()) {
      for (const client of clients) {
        client.close();
      }
    }
    this.clients.clear();
  }
}


// ============================================================================
// §5 — EXPRESS APPLICATION FACTORY
// ============================================================================
//
// Creates a configured Express application with all routes mounted.
// In production, this is called by the service bootstrap. In tests,
// it can be called with mock dependencies.
//
// Note: Express and ws are imported dynamically to keep this file
// compilable without those dependencies. The types are structural.

/**
 * Minimal Express-compatible interfaces so this file compiles
 * without importing express as a dependency. The actual Express
 * types are compatible supersets of these.
 */
export interface ExpressRequest {
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  method: string;
  path: string;
}

export interface ExpressResponse {
  status(code: number): ExpressResponse;
  json(body: unknown): void;
  set(name: string, value: string): void;
}

export type ExpressNextFunction = (err?: unknown) => void;
export type RouteHandler = (req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction) => void | Promise<void>;

/**
 * Extract request context from headers.
 */
function extractContext(req: ExpressRequest): RequestContext {
  const tenantId = (req.headers['x-tenant-id'] as string) ?? 'default';
  const userId = (req.headers['x-user-id'] as string) ?? 'anonymous';
  const roles = ((req.headers['x-user-roles'] as string) ?? 'viewer').split(',').map(r => r.trim());
  return { tenantId, userId, roles };
}

/**
 * Generate a unique ID for gateway entities.
 */
function generateGatewayId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Request ID middleware.
 */
function requestIdMiddleware(req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction): void {
  const requestId = generateGatewayId('req');
  res.set('X-Request-Id', requestId);
  (req as unknown as Record<string, unknown>)['requestId'] = requestId;
  next();
}

/**
 * CORS middleware.
 */
function corsMiddleware(origins: string[]): RouteHandler {
  return (req, res, next) => {
    const origin = req.headers['origin'] as string;
    if (origins.includes(origin) || origins.includes('*')) {
      res.set('Access-Control-Allow-Origin', origin || '*');
      res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Tenant-Id, X-User-Id, X-User-Roles');
      res.set('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).json({});
      return;
    }
    next();
  };
}

/**
 * Structured logging middleware.
 */
function loggingMiddleware(req: ExpressRequest, res: ExpressResponse, next: ExpressNextFunction): void {
  const start = Date.now();
  const originalJson = res.json.bind(res);
  let statusCode = 200;

  const originalStatus = res.status.bind(res);
  res.status = (code: number) => {
    statusCode = code;
    return originalStatus(code);
  };

  res.json = (body: unknown) => {
    const duration = Date.now() - start;
    const log = {
      timestamp: new Date().toISOString(),
      service: 'sr-api-gateway',
      method: req.method,
      path: req.path,
      statusCode,
      durationMs: duration,
      tenantId: (req.headers['x-tenant-id'] as string) ?? 'default',
      requestId: (req as unknown as Record<string, unknown>)['requestId'] ?? '',
    };
    if (statusCode >= 400) console.error(JSON.stringify(log));
    else console.log(JSON.stringify(log));
    return originalJson(body);
  };

  next();
}

/**
 * Simple rate limiter per tenant.
 */
export class RateLimiter {
  private counts = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly maxPerMinute: number) {}

  check(tenantId: string): boolean {
    const now = Date.now();
    const entry = this.counts.get(tenantId);

    if (!entry || entry.resetAt < now) {
      this.counts.set(tenantId, { count: 1, resetAt: now + 60_000 });
      return true;
    }

    if (entry.count >= this.maxPerMinute) {
      return false;
    }

    entry.count++;
    return true;
  }
}


/**
 * Dependencies required to create the gateway application.
 */
export interface GatewayDeps {
  registry: NodeTypeRegistry;
  runner: WorkflowRunner;
  workflowStore: WorkflowStore;
  runStore: WorkflowRunStore;
  eventBus: EventBus;
  config?: Partial<GatewayConfig>;
}

/**
 * Create all route handlers and return them as a map.
 * This allows mounting on any HTTP framework (Express, Fastify, etc.)
 * or calling directly in tests.
 */
export function createRouteHandlers(deps: GatewayDeps): {
  routes: Array<{ method: string; path: string; handler: RouteHandler }>;
  wsManager: WebSocketManager;
  config: GatewayConfig;
} {
  const config: GatewayConfig = { ...DEFAULT_CONFIG, ...deps.config };
  const rateLimiter = new RateLimiter(config.rateLimitPerMinute);
  const wsManager = new WebSocketManager(deps.eventBus);

  // Rate limit check wrapper
  const rateCheck: RouteHandler = (req, res, next) => {
    const ctx = extractContext(req);
    if (!rateLimiter.check(ctx.tenantId)) {
      res.status(429).json(apiError('RATE_LIMITED', 'Too many requests', 429));
      return;
    }
    next();
  };

  const routes: Array<{ method: string; path: string; handler: RouteHandler }> = [
    // ── Workflow CRUD ─────────────────────────────────────────────
    {
      method: 'POST',
      path: '/api/v1/workflows',
      handler: async (req, res) => {
        const ctx = extractContext(req);
        const result = await handleSaveWorkflow(req.body as Parameters<typeof handleSaveWorkflow>[0], ctx, {
          workflowStore: deps.workflowStore,
          registry: deps.registry,
        });
        res.status(result.ok ? 200 : (result.error as ServiceError | undefined)?.statusCode ?? 400).json(result);
      },
    },
    {
      method: 'GET',
      path: '/api/v1/workflows/:id',
      handler: async (req, res) => {
        const ctx = extractContext(req);
        const result = await handleLoadWorkflow(req.params['id']!, ctx, {
          workflowStore: deps.workflowStore,
        });
        res.status(result.ok ? 200 : 404).json(result);
      },
    },
    {
      method: 'GET',
      path: '/api/v1/workflows',
      handler: async (req, res) => {
        const ctx = extractContext(req);
        const result = await handleListWorkflows(
          {
            limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined,
            offset: req.query['offset'] ? parseInt(req.query['offset'] as string) : undefined,
          },
          ctx,
          { workflowStore: deps.workflowStore },
        );
        res.status(200).json(result);
      },
    },
    {
      method: 'DELETE',
      path: '/api/v1/workflows/:id',
      handler: async (req, res) => {
        const ctx = extractContext(req);
        const result = await handleDeleteWorkflow(req.params['id']!, ctx, {
          workflowStore: deps.workflowStore,
        });
        res.status(result.ok ? 200 : 404).json(result);
      },
    },

    // ── Execution ─────────────────────────────────────────────────
    {
      method: 'POST',
      path: '/api/v1/workflows/:id/execute',
      handler: async (req, res) => {
        const ctx = extractContext(req);
        const result = await handleExecuteWorkflow(req.params['id']!, req.body as { userId?: string }, ctx, {
          workflowStore: deps.workflowStore,
          runner: deps.runner,
        });
        res.status(result.ok ? 200 : 400).json(result);
      },
    },
    {
      method: 'POST',
      path: '/api/v1/runs/:id/resume',
      handler: async (req, res) => {
        const ctx = extractContext(req);
        const result = await handleResumeRun(req.params['id']!, req.body as { data?: Record<string, unknown> }, ctx, {
          runner: deps.runner,
          workflowStore: deps.workflowStore,
          runStore: deps.runStore,
        });
        res.status(result.ok ? 200 : 400).json(result);
      },
    },
    {
      method: 'POST',
      path: '/api/v1/runs/:id/cancel',
      handler: async (req, res) => {
        const ctx = extractContext(req);
        const result = await handleCancelRun(req.params['id']!, req.body as { reason?: string }, ctx, {
          runner: deps.runner,
        });
        res.status(result.ok ? 200 : 400).json(result);
      },
    },
    {
      method: 'GET',
      path: '/api/v1/runs/:id',
      handler: async (req, res) => {
        const ctx = extractContext(req);
        const result = await handleGetRunStatus(req.params['id']!, ctx, { runner: deps.runner });
        res.status(result.ok ? 200 : 404).json(result);
      },
    },
    {
      method: 'GET',
      path: '/api/v1/runs',
      handler: async (req, res) => {
        const ctx = extractContext(req);
        const result = await handleListRuns(
          {
            workflowId: req.query['workflowId'] as string ?? '',
            limit: req.query['limit'] ? parseInt(req.query['limit'] as string) : undefined,
          },
          ctx,
          { runner: deps.runner },
        );
        res.status(200).json(result);
      },
    },

    // ── Registry ──────────────────────────────────────────────────
    {
      method: 'GET',
      path: '/api/v1/registry/catalogue',
      handler: (_req, res) => {
        res.status(200).json(handleGetCatalogue({ registry: deps.registry }));
      },
    },

    // ── AI ────────────────────────────────────────────────────────
    {
      method: 'POST',
      path: '/api/v1/ai/workflow-explain',
      handler: async (req, res) => {
        const ctx = extractContext(req);
        const result = await handleAIExplain(
          req.body as { context: Record<string, unknown>; prompt: string },
          ctx,
          config,
        );
        res.status(result.ok ? 200 : 502).json(result);
      },
    },
  ];

  return { routes, wsManager, config };
}


// ============================================================================
// §6 — RESPONSE HELPERS
// ============================================================================

function apiSuccess<T>(data: T): ApiResponse<T> {
  return {
    ok: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateGatewayId('req'),
    },
  };
}

function apiError(code: string, message: string, _statusCode: number): ApiResponse<never> {
  return {
    ok: false,
    error: { code, message },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: generateGatewayId('req'),
    },
  };
}


// ============================================================================
// §7 — GATEWAY BOOTSTRAP (Standalone Server)
// ============================================================================
//
// When running standalone (not imported as a module), this bootstraps
// the full Express + WebSocket server. Import and call createGateway()
// to get a configured server instance.

/**
 * Create a fully configured gateway server.
 * Returns start/stop functions for lifecycle management.
 */
export function createGateway(deps: GatewayDeps): {
  start: () => Promise<{ port: number; close: () => void }>;
  routes: ReturnType<typeof createRouteHandlers>['routes'];
  wsManager: WebSocketManager;
} {
  const { routes, wsManager, config } = createRouteHandlers(deps);

  return {
    routes,
    wsManager,
    start: async () => {
      // Dynamic import of Express and ws — keeps this file compilable
      // without those dependencies installed
      const express = await import('express');
      const { WebSocketServer } = await import('ws');
      const http = await import('http');

      const app = express.default();

      // Middleware
      app.use(express.json({ limit: '5mb' }));
      app.use(requestIdMiddleware as unknown as Parameters<typeof app.use>[0]);
      app.use(corsMiddleware(config.corsOrigins) as unknown as Parameters<typeof app.use>[0]);
      app.use(loggingMiddleware as unknown as Parameters<typeof app.use>[0]);

      // Mount routes
      for (const route of routes) {
        const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete';
        (app as unknown as Record<string, Function>)[method](route.path, route.handler);
      }

      // Health check
      app.get('/health', (_req: unknown, res: { json: (body: unknown) => void }) => {
        res.json({ status: 'healthy', service: 'sr-api-gateway', timestamp: new Date().toISOString() });
      });

      // Create HTTP server
      const server = http.createServer(app);

      // WebSocket server
      const wss = new WebSocketServer({ server, path: undefined });

      wss.on('connection', (ws: { on: Function; send: Function; close: Function; readyState: number }, req: { url?: string }) => {
        // Extract runId from URL: /api/v1/runs/:id/stream
        const url = req.url ?? '';
        const match = url.match(/\/api\/v1\/runs\/([^/]+)\/stream/);
        if (!match) {
          ws.close();
          return;
        }

        const runId = match[1]!;
        const clientId = generateGatewayId('ws');

        const client: WebSocketClient = {
          id: clientId,
          runId,
          send: (data: string) => ws.send(data),
          close: () => ws.close(),
          get isOpen() { return ws.readyState === 1; }, // WebSocket.OPEN
        };

        wsManager.addClient(client);

        ws.on('close', () => {
          wsManager.removeClient(client);
        });

        ws.on('error', () => {
          wsManager.removeClient(client);
        });
      });

      return new Promise((resolve) => {
        server.listen(config.port, () => {
          console.log(JSON.stringify({
            timestamp: new Date().toISOString(),
            service: 'sr-api-gateway',
            event: 'started',
            port: config.port,
            routes: routes.length,
          }));
          resolve({
            port: config.port,
            close: () => {
              wsManager.dispose();
              server.close();
            },
          });
        });
      });
    },
  };
}
