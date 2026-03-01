/**
 * ============================================================================
 * Sense & Respond — Workflow Execution Engine
 * ============================================================================
 *
 * This is the railway signalling system, not the train. It doesn't know
 * what cargo the trains carry — migration data, learning analytics,
 * competition submissions, or storybook review queues. It knows how to
 * read a timetable (workflow definition), ensure trains depart in the
 * right order (topological sort), pass cargo between stations (typed
 * data ports), halt at manual signals (human-in-the-loop pause points),
 * and report the status of every train on the network (run monitoring).
 *
 * The engine operates on three core abstractions:
 *
 *   1. **WorkflowDefinition** — A directed acyclic graph of nodes and edges,
 *      serialised as JSON. This is what the visual canvas produces when a
 *      user connects nodes on screen. It's also what a "starter workflow
 *      template" ships as — a pre-built JSON file.
 *
 *   2. **NodeTypeRegistry** — A catalogue of available node implementations.
 *      Each node type declares its category (SOURCE, TRANSFORM, ACTION, MODEL),
 *      its input/output ports with data types, and an execute() function.
 *      New capabilities are added to S&R by registering new node types —
 *      the engine itself never changes.
 *
 *   3. **WorkflowRunner** — The execution runtime. Given a workflow definition
 *      and a registry of node types, it resolves the execution order,
 *      allocates a run context, executes nodes sequentially (respecting
 *      dependencies), passes output data from upstream nodes to downstream
 *      inputs via matched ports, and handles pause/resume for nodes that
 *      require human intervention.
 *
 * ## Competitive Context
 *
 * This engine is S&R's answer to:
 *   - Orange's widget execution pipeline (but server-side, not desktop)
 *   - KNIME's workflow executor (but TypeScript, not Java/Eclipse)
 *   - Alteryx's engine (but included in the platform, not $5K/user/year)
 *   - n8n's workflow runtime (but with typed data ports and quality gates)
 *
 * The key differentiator: every node can leverage S&R's existing Data Lake,
 * ETL orchestrator, and quality gates. A workflow isn't just "run these
 * steps" — it's "run these steps with Bronze→Silver→Gold data governance,
 * quality checks at each stage, and full audit trail in the ETL dashboard."
 *
 * ## How the Canvas Connects (Phase 1b)
 *
 * When the React Flow canvas is built, the user's visual graph is serialised
 * to a WorkflowDefinition JSON and POSTed to the Canvas API Gateway, which
 * hands it to this engine. The engine doesn't care whether the definition
 * came from a drag-and-drop canvas, a CLI tool, an SDK call, or a
 * pre-built template file. Execution is execution.
 *
 * @module scholarly/sr/workflow-engine
 */


// ============================================================================
// §1 — RESULT TYPE (shared with rest of platform)
// ============================================================================

export interface ServiceError {
  code: string;
  message: string;
  statusCode: number;
}

export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: ServiceError };

export function success<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function failure(error: ServiceError): Result<never> {
  return { ok: false, error } as Result<never>;
}

export const Errors = {
  validation: (msg: string): ServiceError =>
    ({ code: 'VALIDATION_ERROR', message: msg, statusCode: 400 }),
  notFound: (entity: string, id: string): ServiceError =>
    ({ code: 'NOT_FOUND', message: `${entity} '${id}' not found`, statusCode: 404 }),
  conflict: (msg: string): ServiceError =>
    ({ code: 'CONFLICT', message: msg, statusCode: 409 }),
  internal: (msg: string): ServiceError =>
    ({ code: 'INTERNAL_ERROR', message: msg, statusCode: 500 }),
  timeout: (msg: string): ServiceError =>
    ({ code: 'TIMEOUT', message: msg, statusCode: 408 }),
};


// ============================================================================
// §2 — NODE TYPE SYSTEM
// ============================================================================
//
// A node type is a blueprint. A node instance is a configured occurrence
// of that blueprint within a specific workflow. Think of node types as
// "classes" and node instances as "objects" — the type defines behaviour,
// the instance carries configuration.

/**
 * The six node categories that S&R supports. These map directly to the
 * canvas palette sections described in §5.2.2 of the competitive strategy.
 *
 *   SOURCE:    Reads data from somewhere (Data Lake, API, file, CDC stream)
 *   TRANSFORM: Processes data (filter, map, join, aggregate, ETL job, script)
 *   VISUALISE: Renders data for display (chart, table, heatmap) — frontend only
 *   MODEL:     ML operations (train, predict, feature store)
 *   ACTION:    Side effects (write to DB, send notification, webhook, human review)
 *   EDUCATION: Domain-specific (BKT, at-risk, curriculum alignment) — Phase 2
 */
export type NodeCategory =
  | 'SOURCE'
  | 'TRANSFORM'
  | 'VISUALISE'
  | 'MODEL'
  | 'ACTION'
  | 'EDUCATION';

/**
 * A port defines a typed connection point on a node.
 *
 * Ports are how nodes declare what data they accept and produce. When the
 * canvas draws an edge between two nodes, it validates that the source
 * port's dataType is compatible with the target port's dataType. The
 * execution engine uses ports to route data between nodes at runtime.
 *
 * The dataType string uses a simple type system:
 *   - 'table'    — tabular data (rows + columns), the most common
 *   - 'record'   — a single object (e.g., a migration status record)
 *   - 'scalar'   — a single value (number, string, boolean)
 *   - 'binary'   — raw bytes (images, files)
 *   - 'signal'   — no data, just a trigger (for sequencing side-effect nodes)
 *   - 'any'      — accepts any type (for passthrough nodes)
 *
 * Custom types follow a namespace convention: 'scholarly:learner_profile',
 * 'scholarly:quality_report', etc. Compatibility is checked by exact match
 * or 'any' wildcard.
 */
export interface NodePort {
  portId: string;
  label: string;
  dataType: string;
  required: boolean;
}

/**
 * A node type definition — the blueprint registered in the NodeTypeRegistry.
 *
 * This is what a developer creates when adding a new capability to S&R.
 * For example, registering a "Read from Data Lake" source node:
 *
 * ```ts
 * registry.register({
 *   typeId: 'sr:source:data-lake-read',
 *   label: 'Read from Data Lake',
 *   category: 'SOURCE',
 *   description: 'Reads rows from a Data Lake staging table',
 *   inputs: [],
 *   outputs: [{ portId: 'rows', label: 'Rows', dataType: 'table', required: true }],
 *   configSchema: { tableName: 'string', filter: 'object?' },
 *   execute: async (context) => { ... },
 * });
 * ```
 */
export interface NodeTypeDefinition {
  /** Unique identifier. Convention: 'sr:{category}:{name}' */
  typeId: string;

  /** Human-readable label shown in the canvas palette */
  label: string;

  /** Which palette section this node appears in */
  category: NodeCategory;

  /** One-line description for tooltip/docs */
  description: string;

  /** Input ports — what data this node accepts from upstream nodes */
  inputs: NodePort[];

  /** Output ports — what data this node produces for downstream nodes */
  outputs: NodePort[];

  /**
   * JSON Schema-style description of the node's configuration.
   * The canvas renders this as a configuration form when the node is selected.
   * Keys are config field names; values describe the expected type.
   */
  configSchema: Record<string, string>;

  /**
   * Whether this node pauses workflow execution and waits for external
   * input (human approval, webhook callback, manual trigger).
   * When true, the runner saves state and returns a 'paused' status.
   * Execution resumes when resumeNode() is called with the external input.
   */
  pausesWorkflow?: boolean;

  /**
   * Estimated execution duration category. Used by the canvas to show
   * appropriate progress indicators (instant vs. spinner vs. progress bar).
   */
  executionHint?: 'instant' | 'fast' | 'medium' | 'slow' | 'long_running';

  /**
   * Whether this node's execution should be tracked as a Data Lake ETL
   * job, giving it quality gates, retry policies, and ETL dashboard
   * visibility. Typically true for SOURCE and TRANSFORM nodes that move
   * significant data volumes.
   */
  dataLakeTracked?: boolean;

  /**
   * The execution function. Receives a context with the node's config,
   * input data from upstream ports, and infrastructure handles (event bus,
   * Data Lake, etc.). Returns the node's output data keyed by port ID.
   */
  execute: NodeExecutor;
}

/**
 * The function signature for node execution.
 *
 * Every node — regardless of category — implements this interface.
 * The context provides everything the node needs: its configuration,
 * the data arriving on its input ports, and handles to shared
 * infrastructure (event bus, Data Lake, logging).
 */
export type NodeExecutor = (
  context: NodeExecutionContext,
) => Promise<Result<NodeOutput>>;

/**
 * The runtime context passed to a node's execute() function.
 */
export interface NodeExecutionContext {
  /** The node instance being executed (ID, type, config) */
  node: WorkflowNode;

  /** The workflow this node belongs to */
  workflowId: string;

  /** The current execution run */
  runId: string;

  /** Tenant isolation */
  tenantId: string;

  /** User who triggered the execution */
  userId: string;

  /** Data arriving on input ports, keyed by portId */
  inputs: Record<string, unknown>;

  /** Shared infrastructure available to all nodes */
  services: WorkflowServices;

  /** Structured logging scoped to this node */
  log: (level: 'info' | 'warn' | 'error', message: string, data?: Record<string, unknown>) => void;
}

/**
 * Shared infrastructure injected into every node execution context.
 *
 * Nodes never instantiate services themselves — they receive handles
 * through this interface. This is what makes nodes testable (mock the
 * services) and portable (different deployment contexts provide different
 * implementations).
 */
export interface WorkflowServices {
  eventBus: { publish(topic: string, payload: Record<string, unknown>): Promise<void> };
  dataLake: {
    writeToStaging(table: string, rows: Array<Record<string, unknown>>): Promise<Result<{ written: number }>>;
    readFromStaging(table: string, filter?: Record<string, unknown>): Promise<Result<Array<Record<string, unknown>>>>;
    runQualityChecks(checks: Array<Record<string, unknown>>): Promise<Array<{ checkName: string; passed: boolean }>>;
  };
  cache: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  };
  /**
   * Domain service resolver. Nodes that need domain-specific services
   * (e.g., a migration import node needs CMS + Storefront + Auth)
   * request them by name. This avoids hardcoding service dependencies
   * in the engine while letting workflow templates wire in whatever
   * services they need.
   *
   * Returns null if the service isn't registered — nodes should handle
   * this gracefully with a clear error message.
   */
  getService<T = unknown>(serviceName: string): T | null;
}

/**
 * The output of a node execution, keyed by output port ID.
 *
 * For a SOURCE node that reads a table:
 *   { rows: [ { id: 1, name: 'Page 1' }, ... ] }
 *
 * For a TRANSFORM node that filters:
 *   { filtered: [ ... ], rejected: [ ... ] }
 *
 * For an ACTION node that writes:
 *   { result: { written: 42, failed: 0 } }
 *
 * For a node with pausesWorkflow=true:
 *   { __paused: true, __pauseReason: 'Awaiting human review' }
 */
export type NodeOutput = Record<string, unknown>;


// ============================================================================
// §3 — WORKFLOW DEFINITION (what the canvas serialises)
// ============================================================================

/**
 * A complete workflow definition — the JSON that represents a visual
 * workflow. This is what the canvas produces, what templates ship as,
 * and what the execution engine consumes.
 */
export interface WorkflowDefinition {
  workflowId: string;
  name: string;
  description: string;
  version: number;

  /** The nodes in the workflow, each referencing a registered node type */
  nodes: WorkflowNode[];

  /** The edges connecting output ports to input ports */
  edges: WorkflowEdge[];

  /** How this workflow is triggered */
  trigger: WorkflowTrigger;

  /** Workflow-level metadata */
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    tenantId: string;
    tags: string[];
    /** Template ID if this workflow was created from a starter template */
    templateId?: string;
  };
}

/**
 * A node instance within a workflow. References a node type from the
 * registry and carries instance-specific configuration.
 */
export interface WorkflowNode {
  nodeId: string;

  /** References NodeTypeDefinition.typeId in the registry */
  typeId: string;

  /** Display label (defaults to the node type's label if not set) */
  label?: string;

  /**
   * Instance-specific configuration. Validated against the node type's
   * configSchema before execution.
   *
   * For a "Read from Data Lake" node: { tableName: 'stg_migration_content' }
   * For a "Human Review" node: { approvalMode: 'bulk', pauseMessage: '...' }
   * For a "Quality Check" node: { checks: [...], threshold: 0.95 }
   */
  config: Record<string, unknown>;

  /** Canvas position (used by the frontend, ignored by the engine) */
  position?: { x: number; y: number };
}

/**
 * An edge connecting an output port of one node to an input port of another.
 */
export interface WorkflowEdge {
  edgeId: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

/**
 * How a workflow is triggered for execution.
 */
export interface WorkflowTrigger {
  type: 'manual' | 'cron' | 'event' | 'webhook';
  /** Cron expression for scheduled workflows */
  cron?: string;
  /** NATS event topic for event-triggered workflows */
  eventTopic?: string;
  /** Webhook path for external triggers */
  webhookPath?: string;
}


// ============================================================================
// §4 — WORKFLOW RUN (execution state)
// ============================================================================

/**
 * The state of a workflow execution run. Created when a workflow starts,
 * updated as each node executes, and finalised when the workflow completes
 * or fails.
 *
 * This is the object that the monitoring UI polls or subscribes to.
 * In the canvas, each node's border colour reflects its nodeRunStatus.
 */
export interface WorkflowRun {
  runId: string;
  workflowId: string;
  tenantId: string;
  triggeredBy: string;
  status: WorkflowRunStatus;
  startedAt: Date;
  completedAt?: Date;
  durationMs: number;

  /** Per-node execution status */
  nodeRuns: NodeRun[];

  /** Data flowing between nodes, keyed by 'nodeId:portId' */
  portData: Map<string, unknown>;

  /** If paused, which node caused the pause */
  pausedAtNodeId?: string;

  /** If failed, what went wrong */
  error?: { nodeId: string; message: string };

  /** Timeline of execution events for audit trail */
  timeline: WorkflowTimelineEvent[];
}

export type WorkflowRunStatus =
  | 'pending'
  | 'running'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';

/**
 * Per-node execution record within a run.
 */
export interface NodeRun {
  nodeId: string;
  typeId: string;
  status: NodeRunStatus;
  startedAt?: Date;
  completedAt?: Date;
  durationMs: number;
  /** Output data produced by this node */
  outputKeys: string[];
  /** Error message if this node failed */
  error?: string;
  /** For Data Lake-tracked nodes, the ETL job run ID */
  etlRunId?: string;
}

export type NodeRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'skipped'
  | 'paused'
  | 'waiting_for_input';

export interface WorkflowTimelineEvent {
  timestamp: Date;
  event: string;
  nodeId?: string;
  detail?: string;
}


// ============================================================================
// §5 — NODE TYPE REGISTRY
// ============================================================================
//
// The registry is S&R's "Extension Hub" — the place where capabilities
// are catalogued. Adding a new node to S&R is: define the type, register
// it, done. The canvas discovers available nodes by querying the registry.
// The engine looks up execution functions by typeId.

export class NodeTypeRegistry {
  private readonly types: Map<string, NodeTypeDefinition> = new Map();
  private readonly byCategory: Map<NodeCategory, NodeTypeDefinition[]> = new Map();

  /**
   * Register a new node type.
   *
   * Validates that the typeId follows the convention, that ports have
   * unique IDs within the node, and that the execute function exists.
   * Duplicate typeIds are rejected — use update() for versioning.
   */
  register(definition: NodeTypeDefinition): Result<void> {
    if (this.types.has(definition.typeId)) {
      return failure(Errors.conflict(
        `Node type '${definition.typeId}' is already registered. Use update() to replace.`,
      ));
    }

    // Validate port uniqueness
    const inputIds = definition.inputs.map(p => p.portId);
    const outputIds = definition.outputs.map(p => p.portId);
    const duplicateInputs = inputIds.filter((id, i) => inputIds.indexOf(id) !== i);
    const duplicateOutputs = outputIds.filter((id, i) => outputIds.indexOf(id) !== i);

    if (duplicateInputs.length > 0) {
      return failure(Errors.validation(
        `Duplicate input port IDs in '${definition.typeId}': ${duplicateInputs.join(', ')}`,
      ));
    }
    if (duplicateOutputs.length > 0) {
      return failure(Errors.validation(
        `Duplicate output port IDs in '${definition.typeId}': ${duplicateOutputs.join(', ')}`,
      ));
    }

    if (!definition.execute) {
      return failure(Errors.validation(
        `Node type '${definition.typeId}' must have an execute function.`,
      ));
    }

    this.types.set(definition.typeId, definition);

    const categoryList = this.byCategory.get(definition.category) || [];
    categoryList.push(definition);
    this.byCategory.set(definition.category, categoryList);

    return success(undefined as unknown as void);
  }

  /**
   * Replace an existing node type (for versioning / hot-reload).
   */
  update(definition: NodeTypeDefinition): Result<void> {
    if (!this.types.has(definition.typeId)) {
      return failure(Errors.notFound('NodeType', definition.typeId));
    }

    // Remove from category list
    const oldDef = this.types.get(definition.typeId)!;
    const categoryList = this.byCategory.get(oldDef.category) || [];
    const idx = categoryList.findIndex(d => d.typeId === definition.typeId);
    if (idx >= 0) categoryList.splice(idx, 1);

    // Re-register
    this.types.set(definition.typeId, definition);
    const newCategoryList = this.byCategory.get(definition.category) || [];
    newCategoryList.push(definition);
    this.byCategory.set(definition.category, newCategoryList);

    return success(undefined as unknown as void);
  }

  /** Look up a node type by ID */
  get(typeId: string): NodeTypeDefinition | undefined {
    return this.types.get(typeId);
  }

  /** Get all node types in a category (for canvas palette rendering) */
  getByCategory(category: NodeCategory): NodeTypeDefinition[] {
    return this.byCategory.get(category) || [];
  }

  /** Get all registered node types */
  getAll(): NodeTypeDefinition[] {
    return Array.from(this.types.values());
  }

  /** Check if a type is registered */
  has(typeId: string): boolean {
    return this.types.has(typeId);
  }

  /** How many types are registered */
  get size(): number {
    return this.types.size;
  }

  /**
   * Get a summary suitable for the canvas palette or API discovery.
   * Excludes the execute function (which isn't serialisable).
   */
  getCatalogue(): Array<{
    typeId: string;
    label: string;
    category: NodeCategory;
    description: string;
    inputs: NodePort[];
    outputs: NodePort[];
    configSchema: Record<string, string>;
    pausesWorkflow: boolean;
    executionHint: string;
  }> {
    return this.getAll().map(def => ({
      typeId: def.typeId,
      label: def.label,
      category: def.category,
      description: def.description,
      inputs: def.inputs,
      outputs: def.outputs,
      configSchema: def.configSchema,
      pausesWorkflow: def.pausesWorkflow ?? false,
      executionHint: def.executionHint ?? 'fast',
    }));
  }
}


// ============================================================================
// §6 — WORKFLOW VALIDATOR
// ============================================================================
//
// Before execution, every workflow is validated for structural correctness:
// no cycles, all node types exist, all edges connect valid ports, all
// required ports are connected, and data types are compatible.

export interface ValidationIssue {
  severity: 'error' | 'warning';
  nodeId?: string;
  edgeId?: string;
  message: string;
}

export function validateWorkflow(
  definition: WorkflowDefinition,
  registry: NodeTypeRegistry,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeMap = new Map(definition.nodes.map(n => [n.nodeId, n]));

  // 1. All node types must be registered
  for (const node of definition.nodes) {
    if (!registry.has(node.typeId)) {
      issues.push({
        severity: 'error',
        nodeId: node.nodeId,
        message: `Unknown node type '${node.typeId}'. Is the required plugin installed?`,
      });
    }
  }

  // 2. All edges must reference valid nodes and ports
  for (const edge of definition.edges) {
    const sourceNode = nodeMap.get(edge.sourceNodeId);
    const targetNode = nodeMap.get(edge.targetNodeId);

    if (!sourceNode) {
      issues.push({ severity: 'error', edgeId: edge.edgeId,
        message: `Edge references non-existent source node '${edge.sourceNodeId}'` });
      continue;
    }
    if (!targetNode) {
      issues.push({ severity: 'error', edgeId: edge.edgeId,
        message: `Edge references non-existent target node '${edge.targetNodeId}'` });
      continue;
    }

    const sourceType = registry.get(sourceNode.typeId);
    const targetType = registry.get(targetNode.typeId);
    if (!sourceType || !targetType) continue; // Already flagged above

    const sourcePort = sourceType.outputs.find(p => p.portId === edge.sourcePortId);
    const targetPort = targetType.inputs.find(p => p.portId === edge.targetPortId);

    if (!sourcePort) {
      issues.push({ severity: 'error', edgeId: edge.edgeId,
        message: `Source node '${sourceNode.typeId}' has no output port '${edge.sourcePortId}'` });
    }
    if (!targetPort) {
      issues.push({ severity: 'error', edgeId: edge.edgeId,
        message: `Target node '${targetNode.typeId}' has no input port '${edge.targetPortId}'` });
    }

    // 3. Data type compatibility
    if (sourcePort && targetPort) {
      if (sourcePort.dataType !== targetPort.dataType
          && sourcePort.dataType !== 'any'
          && targetPort.dataType !== 'any') {
        issues.push({ severity: 'error', edgeId: edge.edgeId,
          message: `Type mismatch: '${sourcePort.dataType}' → '${targetPort.dataType}' on edge ${edge.sourceNodeId}.${edge.sourcePortId} → ${edge.targetNodeId}.${edge.targetPortId}` });
      }
    }
  }

  // 4. Required input ports must be connected
  for (const node of definition.nodes) {
    const nodeType = registry.get(node.typeId);
    if (!nodeType) continue;

    for (const input of nodeType.inputs) {
      if (!input.required) continue;
      const connected = definition.edges.some(
        e => e.targetNodeId === node.nodeId && e.targetPortId === input.portId,
      );
      if (!connected) {
        issues.push({ severity: 'error', nodeId: node.nodeId,
          message: `Required input port '${input.portId}' on '${nodeType.label}' is not connected` });
      }
    }
  }

  // 5. Cycle detection (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  for (const node of definition.nodes) {
    inDegree.set(node.nodeId, 0);
    adjacency.set(node.nodeId, []);
  }
  for (const edge of definition.edges) {
    const targets = adjacency.get(edge.sourceNodeId);
    if (targets) targets.push(edge.targetNodeId);
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(nodeId);
  }

  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visited++;
    for (const neighbor of adjacency.get(current) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  if (visited < definition.nodes.length) {
    issues.push({ severity: 'error',
      message: `Workflow contains a cycle. ${definition.nodes.length - visited} node(s) are part of a circular dependency.` });
  }

  // 6. Warn on disconnected nodes (valid but suspicious)
  for (const node of definition.nodes) {
    const hasIncoming = definition.edges.some(e => e.targetNodeId === node.nodeId);
    const hasOutgoing = definition.edges.some(e => e.sourceNodeId === node.nodeId);
    if (!hasIncoming && !hasOutgoing && definition.nodes.length > 1) {
      issues.push({ severity: 'warning', nodeId: node.nodeId,
        message: `Node '${node.label || node.typeId}' is disconnected from the workflow` });
    }
  }

  return issues;
}


// ============================================================================
// §7 — TOPOLOGICAL SORT
// ============================================================================
//
// Determines the execution order. Nodes with no dependencies run first.
// Nodes whose inputs depend on other nodes' outputs run after those
// upstream nodes complete. This is a standard topological sort using
// Kahn's algorithm, but producing an ordered list of execution "layers"
// where all nodes in a layer can theoretically execute in parallel
// (important for future concurrent execution).

export interface ExecutionLayer {
  /** Layer index (0 = root nodes with no dependencies) */
  index: number;
  /** Node IDs in this layer (can execute in parallel) */
  nodeIds: string[];
}

export function topologicalSort(
  definition: WorkflowDefinition,
): Result<ExecutionLayer[]> {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  const layerOf = new Map<string, number>();

  for (const node of definition.nodes) {
    inDegree.set(node.nodeId, 0);
    adjacency.set(node.nodeId, []);
  }
  for (const edge of definition.edges) {
    const targets = adjacency.get(edge.sourceNodeId);
    if (targets) targets.push(edge.targetNodeId);
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) || 0) + 1);
  }

  // Kahn's algorithm with layer tracking
  const queue: Array<{ nodeId: string; layer: number }> = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) {
      queue.push({ nodeId, layer: 0 });
      layerOf.set(nodeId, 0);
    }
  }

  const layers = new Map<number, string[]>();
  let visited = 0;

  while (queue.length > 0) {
    const { nodeId, layer } = queue.shift()!;
    visited++;

    const layerNodes = layers.get(layer) || [];
    layerNodes.push(nodeId);
    layers.set(layer, layerNodes);

    for (const neighbor of adjacency.get(nodeId) || []) {
      const newDegree = (inDegree.get(neighbor) || 0) - 1;
      inDegree.set(neighbor, newDegree);

      // Compute candidate layer for neighbor based on this parent.
      const parentLayer = layerOf.get(nodeId) ?? layer;
      const candidateLayer = parentLayer + 1;
      const existingNeighborLayer = layerOf.get(neighbor);
      const updatedNeighborLayer =
        existingNeighborLayer === undefined
          ? candidateLayer
          : Math.max(existingNeighborLayer, candidateLayer);
      layerOf.set(neighbor, updatedNeighborLayer);

      if (newDegree === 0) {
        queue.push({ nodeId: neighbor, layer: updatedNeighborLayer });
      }
    }
  }

  if (visited < definition.nodes.length) {
    return failure(Errors.validation(
      `Workflow contains a cycle — cannot determine execution order`,
    ));
  }

  const result: ExecutionLayer[] = [];
  for (const [index, nodeIds] of Array.from(layers.entries()).sort((a, b) => a[0] - b[0])) {
    result.push({ index, nodeIds });
  }

  return success(result);
}


// ============================================================================
// §8 — WORKFLOW RUNNER
// ============================================================================
//
// The execution runtime. Given a validated workflow and its execution
// layers, the runner walks through layers sequentially, executing each
// node within a layer, passing output data downstream, and handling
// pause/resume for human-in-the-loop nodes.

export interface WorkflowRunnerDeps {
  registry: NodeTypeRegistry;
  services: WorkflowServices;
  eventBus: { publish(topic: string, payload: Record<string, unknown>): Promise<void> };
  /** Persistence for workflow runs (save, load, update) */
  runStore: WorkflowRunStore;
}

export interface WorkflowRunStore {
  save(run: WorkflowRun): Promise<void>;
  load(runId: string): Promise<WorkflowRun | null>;
  update(runId: string, updates: Partial<WorkflowRun>): Promise<void>;
  findByWorkflow(workflowId: string, limit?: number): Promise<WorkflowRun[]>;
}

export const WORKFLOW_EVENTS = {
  RUN_STARTED:     'sr.workflow.run.started',
  RUN_COMPLETED:   'sr.workflow.run.completed',
  RUN_FAILED:      'sr.workflow.run.failed',
  RUN_PAUSED:      'sr.workflow.run.paused',
  RUN_RESUMED:     'sr.workflow.run.resumed',
  RUN_CANCELLED:   'sr.workflow.run.cancelled',
  NODE_STARTED:    'sr.workflow.node.started',
  NODE_COMPLETED:  'sr.workflow.node.completed',
  NODE_FAILED:     'sr.workflow.node.failed',
  NODE_PAUSED:     'sr.workflow.node.paused',
} as const;


export class WorkflowRunner {
  private readonly serviceName = 'WorkflowRunner';

  constructor(private readonly deps: WorkflowRunnerDeps) {}

  /**
   * Execute a workflow.
   *
   * This is the main entry point. It:
   *   1. Validates the workflow against the registry
   *   2. Computes the topological execution order
   *   3. Creates a WorkflowRun record
   *   4. Walks through execution layers, running each node
   *   5. Passes output data between nodes via typed ports
   *   6. Handles pause/resume for human-in-the-loop nodes
   *   7. Returns the completed (or paused/failed) run
   */
  async execute(
    definition: WorkflowDefinition,
    tenantId: string,
    userId: string,
  ): Promise<Result<WorkflowRun>> {
    // 1. Validate
    const issues = validateWorkflow(definition, this.deps.registry);
    const errors = issues.filter(i => i.severity === 'error');
    if (errors.length > 0) {
      return failure(Errors.validation(
        `Workflow has ${errors.length} validation error(s): ${errors.map(e => e.message).join('; ')}`,
      ));
    }

    // 2. Compute execution order
    const layersResult = topologicalSort(definition);
    if (!layersResult.ok) return layersResult as unknown as Result<WorkflowRun>;

    const layers = layersResult.value;

    // 3. Create run record
    const run: WorkflowRun = {
      runId: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      workflowId: definition.workflowId,
      tenantId,
      triggeredBy: userId,
      status: 'running',
      startedAt: new Date(),
      durationMs: 0,
      nodeRuns: definition.nodes.map(n => ({
        nodeId: n.nodeId,
        typeId: n.typeId,
        status: 'pending' as NodeRunStatus,
        durationMs: 0,
        outputKeys: [],
      })),
      portData: new Map(),
      timeline: [{ timestamp: new Date(), event: 'Workflow execution started' }],
    };

    await this.deps.runStore.save(run);

    await this.deps.eventBus.publish(WORKFLOW_EVENTS.RUN_STARTED, {
      runId: run.runId, workflowId: definition.workflowId,
      tenantId, userId, nodeCount: definition.nodes.length,
    });

    // 4. Execute layers
    const nodeMap = new Map(definition.nodes.map(n => [n.nodeId, n]));

    for (const layer of layers) {
      for (const nodeId of layer.nodeIds) {
        const node = nodeMap.get(nodeId)!;
        const nodeType = this.deps.registry.get(node.typeId);
        if (!nodeType) {
          this.failNode(run, nodeId, `Node type '${node.typeId}' not found in registry`);
          run.status = 'failed';
          run.error = { nodeId, message: `Node type '${node.typeId}' not found` };
          await this.finaliseRun(run);
          return success(run);
        }

        // 5. Gather input data from upstream ports
        const inputData = this.gatherInputs(definition, run, nodeId);

        // Build execution context
        const context: NodeExecutionContext = {
          node,
          workflowId: definition.workflowId,
          runId: run.runId,
          tenantId,
          userId,
          inputs: inputData,
          services: this.deps.services,
          log: (level, message, data) => this.nodeLog(run, nodeId, level, message, data),
        };

        // Execute
        const nodeRun = run.nodeRuns.find(nr => nr.nodeId === nodeId)!;
        nodeRun.status = 'running';
        nodeRun.startedAt = new Date();

        run.timeline.push({
          timestamp: new Date(), event: 'Node execution started',
          nodeId, detail: nodeType.label,
        });

        await this.deps.eventBus.publish(WORKFLOW_EVENTS.NODE_STARTED, {
          runId: run.runId, nodeId, typeId: node.typeId,
        });

        const startTime = Date.now();
        const result = await this.safeExecute(nodeType, context);
        nodeRun.durationMs = Date.now() - startTime;

        if (!result.ok) {
          nodeRun.status = 'failed';
          nodeRun.error = result.error.message;

          run.timeline.push({
            timestamp: new Date(), event: 'Node execution failed',
            nodeId, detail: result.error.message,
          });

          await this.deps.eventBus.publish(WORKFLOW_EVENTS.NODE_FAILED, {
            runId: run.runId, nodeId, error: result.error.message,
          });

          run.status = 'failed';
          run.error = { nodeId, message: result.error.message };
          await this.finaliseRun(run);
          return success(run);
        }

        const output = result.value;

        // 6. Handle pause (human-in-the-loop)
        if (output['__paused'] === true) {
          nodeRun.status = 'paused';
          run.status = 'paused';
          run.pausedAtNodeId = nodeId;

          run.timeline.push({
            timestamp: new Date(), event: 'Workflow paused — awaiting input',
            nodeId, detail: output['__pauseReason'] as string || 'Awaiting external input',
          });

          await this.deps.eventBus.publish(WORKFLOW_EVENTS.NODE_PAUSED, {
            runId: run.runId, nodeId, reason: output['__pauseReason'],
          });
          await this.deps.eventBus.publish(WORKFLOW_EVENTS.RUN_PAUSED, {
            runId: run.runId, nodeId,
          });

          // Persist the partial run — it will be resumed later
          run.durationMs = Date.now() - run.startedAt.getTime();
          await this.deps.runStore.update(run.runId, {
            status: run.status,
            pausedAtNodeId: run.pausedAtNodeId,
            nodeRuns: run.nodeRuns,
            portData: run.portData,
            timeline: run.timeline,
            durationMs: run.durationMs,
          });

          return success(run);
        }

        // Store output data on ports for downstream nodes
        nodeRun.status = 'completed';
        nodeRun.completedAt = new Date();
        const outputKeys: string[] = [];
        for (const [portId, data] of Object.entries(output)) {
          if (!portId.startsWith('__')) {
            const portKey = `${nodeId}:${portId}`;
            run.portData.set(portKey, data);
            outputKeys.push(portKey);
          }
        }
        nodeRun.outputKeys = outputKeys;

        run.timeline.push({
          timestamp: new Date(), event: 'Node execution completed',
          nodeId, detail: `${outputKeys.length} output(s) produced in ${nodeRun.durationMs}ms`,
        });

        await this.deps.eventBus.publish(WORKFLOW_EVENTS.NODE_COMPLETED, {
          runId: run.runId, nodeId, durationMs: nodeRun.durationMs,
          outputCount: outputKeys.length,
        });

        // Persist progress after each node
        await this.deps.runStore.update(run.runId, {
          nodeRuns: run.nodeRuns,
          portData: run.portData,
          timeline: run.timeline,
        });
      }
    }

    // 7. Complete
    run.status = 'completed';
    await this.finaliseRun(run);
    return success(run);
  }

  /**
   * Resume a paused workflow.
   *
   * Called when a human-in-the-loop node receives its external input
   * (e.g., a review decision, a manual approval). The provided data
   * is placed on the paused node's output ports, and execution continues
   * from the next layer.
   */
  async resume(
    runId: string,
    nodeOutputData: NodeOutput,
    definition: WorkflowDefinition,
  ): Promise<Result<WorkflowRun>> {
    const run = await this.deps.runStore.load(runId);
    if (!run) {
      return failure(Errors.notFound('WorkflowRun', runId));
    }
    if (run.status !== 'paused') {
      return failure(Errors.validation(
        `Cannot resume run '${runId}' — status is '${run.status}', expected 'paused'`,
      ));
    }

    const pausedNodeId = run.pausedAtNodeId;
    if (!pausedNodeId) {
      return failure(Errors.internal('Run is paused but no pausedAtNodeId recorded'));
    }

    // Place the external input data on the paused node's output ports
    const pausedNodeRun = run.nodeRuns.find(nr => nr.nodeId === pausedNodeId)!;
    pausedNodeRun.status = 'completed';
    pausedNodeRun.completedAt = new Date();

    const outputKeys: string[] = [];
    for (const [portId, data] of Object.entries(nodeOutputData)) {
      if (!portId.startsWith('__')) {
        const portKey = `${pausedNodeId}:${portId}`;
        run.portData.set(portKey, data);
        outputKeys.push(portKey);
      }
    }
    pausedNodeRun.outputKeys = outputKeys;

    run.status = 'running';
    (run as { pausedAtNodeId?: string | undefined }).pausedAtNodeId = undefined;

    run.timeline.push({
      timestamp: new Date(), event: 'Workflow resumed',
      nodeId: pausedNodeId, detail: `External input received with ${outputKeys.length} output(s)`,
    });

    await this.deps.eventBus.publish(WORKFLOW_EVENTS.RUN_RESUMED, {
      runId, nodeId: pausedNodeId,
    });

    // Re-compute execution order and find where to continue
    const layersResult = topologicalSort(definition);
    if (!layersResult.ok) return layersResult as unknown as Result<WorkflowRun>;

    const layers = layersResult.value;
    const nodeMap = new Map(definition.nodes.map(n => [n.nodeId, n]));

    // Find the paused node's layer and continue from there, executing
    // any nodes in that layer that are still pending (not yet completed).
    let foundPausedLayer = false;

    for (const layer of layers) {
      if (!foundPausedLayer) {
        if (layer.nodeIds.includes(pausedNodeId)) {
          foundPausedLayer = true;
          // Fall through to execute remaining pending nodes in this layer
        } else {
          continue; // Skip layers before the paused node's layer
        }
      }

      // Execute remaining layers (including pending nodes in the paused layer)
      for (const nodeId of layer.nodeIds) {
        // Skip nodes that have already completed (or are the paused node itself,
        // which was marked completed above when we stored its output data)
        const existingNodeRun = run.nodeRuns.find(nr => nr.nodeId === nodeId);
        if (existingNodeRun && existingNodeRun.status === 'completed') {
          continue;
        }
        const node = nodeMap.get(nodeId)!;
        const nodeType = this.deps.registry.get(node.typeId);
        if (!nodeType) {
          this.failNode(run, nodeId, `Node type '${node.typeId}' not found`);
          run.status = 'failed';
          run.error = { nodeId, message: `Node type '${node.typeId}' not found` };
          await this.finaliseRun(run);
          return success(run);
        }

        const inputData = this.gatherInputs(definition, run, nodeId);
        const context: NodeExecutionContext = {
          node, workflowId: definition.workflowId, runId: run.runId,
          tenantId: run.tenantId, userId: run.triggeredBy,
          inputs: inputData, services: this.deps.services,
          log: (level, message, data) => this.nodeLog(run, nodeId, level, message, data),
        };

        const nodeRun = run.nodeRuns.find(nr => nr.nodeId === nodeId)!;
        nodeRun.status = 'running';
        nodeRun.startedAt = new Date();

        await this.deps.eventBus.publish(WORKFLOW_EVENTS.NODE_STARTED, {
          runId: run.runId, nodeId, typeId: node.typeId,
        });

        const startTime = Date.now();
        const result = await this.safeExecute(nodeType, context);
        nodeRun.durationMs = Date.now() - startTime;

        if (!result.ok) {
          nodeRun.status = 'failed';
          nodeRun.error = result.error.message;
          run.status = 'failed';
          run.error = { nodeId, message: result.error.message };

          await this.deps.eventBus.publish(WORKFLOW_EVENTS.NODE_FAILED, {
            runId: run.runId, nodeId, error: result.error.message,
          });

          await this.finaliseRun(run);
          return success(run);
        }

        const output = result.value;

        // Handle another pause point (workflow can have multiple)
        if (output['__paused'] === true) {
          nodeRun.status = 'paused';
          run.status = 'paused';
          run.pausedAtNodeId = nodeId;

          await this.deps.eventBus.publish(WORKFLOW_EVENTS.RUN_PAUSED, {
            runId: run.runId, nodeId,
          });

          run.durationMs = Date.now() - run.startedAt.getTime();
          await this.deps.runStore.update(run.runId, {
            status: run.status, pausedAtNodeId: nodeId,
            nodeRuns: run.nodeRuns, portData: run.portData, timeline: run.timeline,
            durationMs: run.durationMs,
          });
          return success(run);
        }

        nodeRun.status = 'completed';
        nodeRun.completedAt = new Date();
        const keys: string[] = [];
        for (const [portId, data] of Object.entries(output)) {
          if (!portId.startsWith('__')) {
            const portKey = `${nodeId}:${portId}`;
            run.portData.set(portKey, data);
            keys.push(portKey);
          }
        }
        nodeRun.outputKeys = keys;

        run.timeline.push({
          timestamp: new Date(), event: 'Node execution completed',
          nodeId, detail: `${keys.length} output(s) in ${nodeRun.durationMs}ms`,
        });

        await this.deps.eventBus.publish(WORKFLOW_EVENTS.NODE_COMPLETED, {
          runId: run.runId, nodeId, durationMs: nodeRun.durationMs,
        });

        await this.deps.runStore.update(run.runId, {
          nodeRuns: run.nodeRuns, portData: run.portData, timeline: run.timeline,
        });
      }
    }

    run.status = 'completed';
    await this.finaliseRun(run);
    return success(run);
  }

  /**
   * Cancel a running or paused workflow.
   */
  async cancel(runId: string, reason?: string): Promise<Result<WorkflowRun>> {
    const run = await this.deps.runStore.load(runId);
    if (!run) return failure(Errors.notFound('WorkflowRun', runId));

    if (run.status !== 'running' && run.status !== 'paused') {
      return failure(Errors.validation(
        `Cannot cancel run '${runId}' — status is '${run.status}'`,
      ));
    }

    run.status = 'cancelled';
    run.timeline.push({
      timestamp: new Date(), event: 'Workflow cancelled',
      detail: reason || 'Cancelled by user',
    });

    await this.finaliseRun(run);

    await this.deps.eventBus.publish(WORKFLOW_EVENTS.RUN_CANCELLED, {
      runId, reason,
    });

    return success(run);
  }

  /**
   * Get the current status of a workflow run.
   */
  async getRunStatus(runId: string): Promise<Result<WorkflowRun>> {
    const run = await this.deps.runStore.load(runId);
    if (!run) return failure(Errors.notFound('WorkflowRun', runId));
    return success(run);
  }

  /**
   * Get run history for a workflow.
   */
  async getRunHistory(
    workflowId: string,
    limit: number = 20,
  ): Promise<Result<WorkflowRun[]>> {
    const runs = await this.deps.runStore.findByWorkflow(workflowId, limit);
    return success(runs);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Gather input data for a node by reading upstream port data.
   *
   * Walks the edges targeting this node, finds the corresponding output
   * data from upstream nodes (stored in portData), and assembles an
   * inputs object keyed by the target port ID.
   */
  private gatherInputs(
    definition: WorkflowDefinition,
    run: WorkflowRun,
    nodeId: string,
  ): Record<string, unknown> {
    const inputs: Record<string, unknown> = {};

    const incomingEdges = definition.edges.filter(e => e.targetNodeId === nodeId);
    for (const edge of incomingEdges) {
      const portKey = `${edge.sourceNodeId}:${edge.sourcePortId}`;
      const data = run.portData.get(portKey);
      if (data !== undefined) {
        inputs[edge.targetPortId] = data;
      }
    }

    return inputs;
  }

  /**
   * Execute a node with error boundary. Catches thrown exceptions and
   * wraps them as Result failures so one bad node doesn't crash the runner.
   */
  private async safeExecute(
    nodeType: NodeTypeDefinition,
    context: NodeExecutionContext,
  ): Promise<Result<NodeOutput>> {
    try {
      return await nodeType.execute(context);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return failure(Errors.internal(`Node '${context.node.nodeId}' threw: ${message}`));
    }
  }

  private failNode(run: WorkflowRun, nodeId: string, message: string): void {
    const nodeRun = run.nodeRuns.find(nr => nr.nodeId === nodeId);
    if (nodeRun) {
      nodeRun.status = 'failed';
      nodeRun.error = message;
    }
    run.timeline.push({
      timestamp: new Date(), event: 'Node failed', nodeId, detail: message,
    });
  }

  private async finaliseRun(run: WorkflowRun): Promise<void> {
    run.completedAt = new Date();
    run.durationMs = run.completedAt.getTime() - run.startedAt.getTime();

    await this.deps.runStore.update(run.runId, {
      status: run.status,
      completedAt: run.completedAt,
      durationMs: run.durationMs,
      nodeRuns: run.nodeRuns,
      portData: run.portData,
      timeline: run.timeline,
      ...(run.error ? { error: run.error } : {}),
    });

    const eventTopic = run.status === 'completed'
      ? WORKFLOW_EVENTS.RUN_COMPLETED
      : run.status === 'failed'
        ? WORKFLOW_EVENTS.RUN_FAILED
        : WORKFLOW_EVENTS.RUN_CANCELLED;

    await this.deps.eventBus.publish(eventTopic, {
      runId: run.runId, workflowId: run.workflowId,
      status: run.status, durationMs: run.durationMs,
      nodeCount: run.nodeRuns.length,
      completedNodes: run.nodeRuns.filter(nr => nr.status === 'completed').length,
      failedNodes: run.nodeRuns.filter(nr => nr.status === 'failed').length,
    });
  }

  private nodeLog(
    run: WorkflowRun,
    nodeId: string,
    level: string,
    message: string,
    data?: Record<string, unknown>,
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      service: this.serviceName,
      runId: run.runId,
      nodeId,
      level,
      message,
      ...data,
    };
    if (level === 'error') console.error(JSON.stringify(entry));
    else console.log(JSON.stringify(entry));
  }
}
