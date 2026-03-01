/**
 * ============================================================================
 * Sense & Respond — Node Canvas UI (Production)
 * ============================================================================
 *
 * §5.2.1 of the S&R Competitive Strategy — the visual workflow editor that
 * transforms S&R from a powerful-but-invisible analytical backend into an
 * interactive data intelligence canvas.
 *
 * If the Workflow Engine (sr-workflow-engine.ts) is the railway signalling
 * system, this canvas is the station concourse — the place where passengers
 * (users) see the trains (workflows) being assembled, watch them depart
 * (execute), and interact with the stops along the way (pause/resume).
 * The Chunk 1 prototype proved the UX loop works: drag nodes, connect ports,
 * watch execution flow. This production version adds the luggage handling
 * (undo/redo), the station map (minimap + zoom), the timetable kiosk
 * (config forms), the saved journeys (recipes), and the ticket office
 * (API Gateway integration for real execution).
 *
 * Architecture:
 *
 *   §1  Type definitions — canvas-specific types that extend engine types
 *   §2  Constants — node registry, port colours, category metadata
 *   §3  Command pattern — undo/redo with concrete command classes
 *   §4  Zoom & viewport — scale transforms, minimap, wheel/pinch handlers
 *   §5  Recipe system — save/load reusable sub-graphs
 *   §6  Workflow serialisation — canvas ↔ WorkflowDefinition JSON
 *   §7  API integration — Gateway client with WebSocket streaming
 *   §8  Node config forms — dynamic form renderer per configSchema
 *   §9  React component — the main canvas with all features integrated
 *
 * Competitive targets: Orange DM (canvas UX), KNIME (node breadth),
 * Alteryx (enterprise workflow builder), n8n (modern web workflow editor).
 *
 * @module scholarly/sr/canvas-production
 */

// ============================================================================
// §1 — TYPE DEFINITIONS
// ============================================================================
//
// The canvas operates on its own representation of nodes and edges that
// carries visual metadata (position, selection, expansion state) alongside
// the engine's semantic data (typeId, config, ports). These types are
// the "station platform" — they hold the trains while passengers board,
// but convert to engine-format WorkflowDefinition when it's time to depart.

/**
 * The six node categories — mirrors NodeCategory from the engine but
 * enriched with visual metadata for the canvas palette and node rendering.
 */
export type NodeCategory =
  | 'SOURCE'
  | 'TRANSFORM'
  | 'VISUALISE'
  | 'MODEL'
  | 'ACTION'
  | 'EDUCATION';

/**
 * A port definition on a node type. Matches the engine's NodePort
 * structure so we can round-trip without translation.
 */
export interface PortDef {
  portId: string;
  label: string;
  dataType: string;
  required?: boolean;
}

/**
 * A node type entry in the canvas palette. This is the "timetable entry"
 * — it tells the user what the node does, what it accepts, and what it
 * produces, before they've placed it on the canvas.
 */
export interface CanvasNodeType {
  typeId: string;
  label: string;
  category: NodeCategory;
  description: string;
  inputs: PortDef[];
  outputs: PortDef[];
  pauses?: boolean;
  executionHint?: 'instant' | 'fast' | 'medium' | 'slow' | 'long_running';
  configSchema: Record<string, ConfigFieldDef>;
}

/**
 * A config field definition — describes one configurable parameter on a
 * node. The canvas renders these as form fields in the right panel.
 */
export interface ConfigFieldDef {
  type: 'string' | 'number' | 'boolean' | 'select' | 'text' | 'json';
  label: string;
  placeholder?: string;
  defaultValue?: unknown;
  options?: Array<{ value: string; label: string }>;  // for 'select' type
  required?: boolean;
  helpText?: string;
}

/**
 * A node instance on the canvas — the "train at the platform". It has
 * an engine-compatible core (typeId, config) plus visual state (position,
 * selection, group membership).
 */
export interface CanvasNode {
  id: string;
  typeId: string;
  x: number;
  y: number;
  config: Record<string, unknown>;
  label?: string;
  /** If this node belongs to a recipe group */
  recipeGroupId?: string;
}

/**
 * An edge on the canvas — a connection between two ports.
 */
export interface CanvasEdge {
  id: string;
  sourceNodeId: string;
  sourcePortId: string;
  targetNodeId: string;
  targetPortId: string;
}

/**
 * The status of a node during workflow execution, as reported by
 * the API Gateway's WebSocket stream.
 */
export type NodeRunStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'skipped';

/**
 * Live execution state — the canvas overlays this on top of the
 * static graph to show progress, pauses, and failures.
 */
export interface RunState {
  runId: string;
  status: 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
  nodeStates: Record<string, NodeRunStatus>;
  pausedAtNodeId?: string;
  error?: { nodeId: string; message: string };
  startedAt: number;
  durationMs: number;
}

/**
 * Zoom and viewport state. The canvas uses an affine transform
 * (translate + scale) to implement infinite pan/zoom.
 */
export interface ViewportState {
  /** Horizontal offset in screen pixels */
  offsetX: number;
  /** Vertical offset in screen pixels */
  offsetY: number;
  /** Zoom scale factor (1.0 = 100%) */
  scale: number;
}

/**
 * A recipe — a saved sub-graph that can be instantiated on the canvas.
 * Think of it as a "pre-built train" that arrives with carriages already
 * coupled. Users save frequently-used node combinations as recipes and
 * load them with a single click.
 */
export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  /** Nodes with positions relative to the recipe's origin (0,0) */
  nodes: Array<{ relativeId: string; typeId: string; dx: number; dy: number; config: Record<string, unknown> }>;
  /** Edges using the relative IDs */
  edges: Array<{ sourceRelId: string; sourcePortId: string; targetRelId: string; targetPortId: string }>;
  /** When this recipe was saved */
  createdAt: number;
}

/**
 * Validation issue — mirrors the engine's ValidationIssue for
 * displaying problems in the canvas UI.
 */
export interface CanvasValidationIssue {
  severity: 'error' | 'warning';
  nodeId?: string;
  edgeId?: string;
  message: string;
}


// ============================================================================
// §2 — CONSTANTS & NODE TYPE REGISTRY
// ============================================================================
//
// The canonical palette of available node types. In production, this would
// be fetched from the API Gateway's GET /api/v1/registry/catalogue endpoint.
// For the canvas component itself, we ship a static copy that can be
// replaced/merged with the API response at runtime.

export const NODE_CATEGORIES_META: Record<NodeCategory, {
  label: string;
  color: string;
  bg: string;
  iconName: string;
}> = {
  SOURCE:    { label: 'Source',    color: '#1e9df1', bg: '#E3ECF6', iconName: 'Database' },
  TRANSFORM: { label: 'Transform', color: '#f7b928', bg: '#FFF8E1', iconName: 'Filter' },
  VISUALISE: { label: 'Visualise', color: '#7c3aed', bg: '#F3E8FD', iconName: 'BarChart3' },
  MODEL:     { label: 'Model',    color: '#e0245e', bg: '#FDE8EF', iconName: 'Brain' },
  ACTION:    { label: 'Action',   color: '#00b87a', bg: '#E0F7EF', iconName: 'Zap' },
  EDUCATION: { label: 'Education', color: '#17bf63', bg: '#E0F7F4', iconName: 'GraduationCap' },
};

export const PORT_COLORS: Record<string, string> = {
  table:  '#1e9df1',
  record: '#00b87a',
  scalar: '#D4790E',
  signal: '#9B59B6',
  binary: '#f4212e',
  any:    '#888888',
};

/**
 * The full node type palette. Each entry includes a configSchema that
 * the canvas renders as form fields when the node is selected.
 *
 * Convention: general-purpose nodes use 'sr:' prefix.
 * Domain-specific nodes add a domain segment: 'sr:edu:', 'sr:comp:'.
 */
export const NODE_TYPES: CanvasNodeType[] = [
  // ── SOURCE ──────────────────────────────────────────────────────────
  {
    typeId: 'sr:source:platform-export',
    label: 'Platform Source',
    category: 'SOURCE',
    description: 'Extract content from an external platform (CMS, LMS, marketplace)',
    inputs: [],
    outputs: [
      { portId: 'content', label: 'Content', dataType: 'table' },
      { portId: 'inventory', label: 'Inventory', dataType: 'record' },
    ],
    configSchema: {
      platform: { type: 'select', label: 'Platform', options: [
        { value: 'squarespace', label: 'Squarespace' },
        { value: 'wordpress', label: 'WordPress' },
        { value: 'shopify', label: 'Shopify' },
        { value: 'custom', label: 'Custom API' },
      ], required: true },
      apiEndpoint: { type: 'string', label: 'API Endpoint', placeholder: 'https://api.example.com', helpText: 'Base URL for the platform API' },
      apiKey: { type: 'string', label: 'API Key', placeholder: 'sk-...', helpText: 'Authentication credential (stored encrypted)' },
    },
  },
  {
    typeId: 'sr:source:cdc-extract',
    label: 'CDC Extract',
    category: 'SOURCE',
    description: 'Write items to Data Lake Bronze zone via Change Data Capture',
    inputs: [
      { portId: 'items', label: 'Items', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'etlRun', label: 'ETL Run', dataType: 'record' },
    ],
    configSchema: {
      targetTable: { type: 'string', label: 'Target Table', placeholder: 'stg_migration_content', required: true },
      batchSize: { type: 'number', label: 'Batch Size', defaultValue: 500, helpText: 'Rows per batch write' },
      deduplicateBy: { type: 'string', label: 'Deduplicate Key', placeholder: 'externalId', helpText: 'Column for upsert deduplication' },
    },
  },
  {
    typeId: 'sr:source:health-monitor',
    label: 'Health Monitor',
    category: 'SOURCE',
    description: 'Run endpoint health checks against configured services',
    inputs: [
      { portId: 'trigger', label: 'Trigger', dataType: 'any' },
    ],
    outputs: [
      { portId: 'healthResult', label: 'Health', dataType: 'record' },
    ],
    configSchema: {
      endpoints: { type: 'json', label: 'Endpoints', defaultValue: [], helpText: 'Array of { url, method, expectedStatus } objects' },
      timeoutMs: { type: 'number', label: 'Timeout (ms)', defaultValue: 5000 },
      retries: { type: 'number', label: 'Retries', defaultValue: 2 },
    },
  },
  {
    typeId: 'sr:source:data-lake-read',
    label: 'Data Lake Read',
    category: 'SOURCE',
    description: 'Read rows from a Data Lake staging table (Bronze/Silver/Gold)',
    inputs: [],
    outputs: [
      { portId: 'rows', label: 'Rows', dataType: 'table' },
    ],
    configSchema: {
      tableName: { type: 'string', label: 'Table Name', placeholder: 'gold_fact_reading_session', required: true },
      zone: { type: 'select', label: 'Zone', options: [
        { value: 'bronze', label: 'Bronze (raw)' },
        { value: 'silver', label: 'Silver (cleaned)' },
        { value: 'gold', label: 'Gold (modelled)' },
      ], defaultValue: 'gold' },
      filter: { type: 'json', label: 'Filter', defaultValue: {}, helpText: 'Prisma-style where clause' },
      limit: { type: 'number', label: 'Row Limit', defaultValue: 10000 },
    },
  },
  {
    typeId: 'sr:source:api-read',
    label: 'API Source',
    category: 'SOURCE',
    description: 'Read data from an external REST API endpoint',
    inputs: [],
    outputs: [
      { portId: 'response', label: 'Response', dataType: 'table' },
    ],
    configSchema: {
      url: { type: 'string', label: 'URL', placeholder: 'https://api.example.com/data', required: true },
      method: { type: 'select', label: 'Method', options: [
        { value: 'GET', label: 'GET' }, { value: 'POST', label: 'POST' },
      ], defaultValue: 'GET' },
      headers: { type: 'json', label: 'Headers', defaultValue: {} },
      body: { type: 'json', label: 'Request Body', defaultValue: null },
    },
  },
  {
    typeId: 'sr:source:nats-subscribe',
    label: 'NATS Stream',
    category: 'SOURCE',
    description: 'Subscribe to a NATS event stream for real-time data ingestion',
    inputs: [],
    outputs: [
      { portId: 'events', label: 'Events', dataType: 'table' },
    ],
    configSchema: {
      subject: { type: 'string', label: 'Subject', placeholder: 'scholarly.phonics.session.*', required: true },
      maxMessages: { type: 'number', label: 'Max Messages', defaultValue: 1000 },
      durationMs: { type: 'number', label: 'Window (ms)', defaultValue: 60000, helpText: 'Collection window duration' },
    },
  },

  // ── TRANSFORM ───────────────────────────────────────────────────────
  {
    typeId: 'sr:transform:content-transform',
    label: 'Content Transform',
    category: 'TRANSFORM',
    description: 'Transform external content to Scholarly internal format',
    inputs: [
      { portId: 'etlRun', label: 'ETL Run', dataType: 'record', required: true },
    ],
    outputs: [
      { portId: 'summary', label: 'Summary', dataType: 'record' },
      { portId: 'etlRun', label: 'ETL Run', dataType: 'record' },
    ],
    configSchema: {
      mappingProfile: { type: 'select', label: 'Mapping Profile', options: [
        { value: 'squarespace-to-storefront', label: 'Squarespace → Storefront' },
        { value: 'wordpress-to-cms', label: 'WordPress → CMS' },
        { value: 'custom', label: 'Custom Mapping' },
      ], required: true },
      preserveMetadata: { type: 'boolean', label: 'Preserve Source Metadata', defaultValue: true },
    },
  },
  {
    typeId: 'sr:transform:quality-audit',
    label: 'Quality Audit',
    category: 'TRANSFORM',
    description: 'Run Data Lake quality checks (null rates, schema drift, outliers)',
    inputs: [
      { portId: 'trigger', label: 'Trigger', dataType: 'any', required: true },
    ],
    outputs: [
      { portId: 'qualityReport', label: 'Report', dataType: 'record' },
    ],
    configSchema: {
      checks: { type: 'json', label: 'Quality Checks', defaultValue: [], helpText: 'Array of { checkName, column, rule, threshold }' },
      failOnError: { type: 'boolean', label: 'Fail on Quality Error', defaultValue: false },
      threshold: { type: 'number', label: 'Pass Threshold', defaultValue: 0.95, helpText: 'Minimum pass rate (0-1)' },
    },
  },
  {
    typeId: 'sr:transform:filter',
    label: 'Filter',
    category: 'TRANSFORM',
    description: 'Filter rows by expression — passed rows continue, rejected are available separately',
    inputs: [
      { portId: 'input', label: 'Input', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'passed', label: 'Passed', dataType: 'table' },
      { portId: 'rejected', label: 'Rejected', dataType: 'table' },
    ],
    configSchema: {
      expression: { type: 'string', label: 'Filter Expression', placeholder: 'row.score >= 0.8', required: true, helpText: 'JavaScript expression evaluated per row' },
    },
  },
  {
    typeId: 'sr:transform:aggregate',
    label: 'Aggregate',
    category: 'TRANSFORM',
    description: 'Group by columns and aggregate with sum, avg, count, min, max',
    inputs: [
      { portId: 'input', label: 'Input', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'result', label: 'Result', dataType: 'table' },
    ],
    configSchema: {
      groupBy: { type: 'json', label: 'Group By', defaultValue: [], helpText: 'Array of column names' },
      aggregations: { type: 'json', label: 'Aggregations', defaultValue: [], helpText: 'Array of { column, function, alias }' },
    },
  },
  {
    typeId: 'sr:transform:join',
    label: 'Join',
    category: 'TRANSFORM',
    description: 'Join two tables on matching keys (inner, left, right, full)',
    inputs: [
      { portId: 'left', label: 'Left', dataType: 'table', required: true },
      { portId: 'right', label: 'Right', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'joined', label: 'Joined', dataType: 'table' },
    ],
    configSchema: {
      joinType: { type: 'select', label: 'Join Type', options: [
        { value: 'inner', label: 'Inner' }, { value: 'left', label: 'Left' },
        { value: 'right', label: 'Right' }, { value: 'full', label: 'Full Outer' },
      ], defaultValue: 'inner' },
      leftKey: { type: 'string', label: 'Left Key', placeholder: 'id', required: true },
      rightKey: { type: 'string', label: 'Right Key', placeholder: 'foreignId', required: true },
    },
  },
  {
    typeId: 'sr:transform:formula',
    label: 'Formula',
    category: 'TRANSFORM',
    description: 'Add calculated columns using JavaScript expressions',
    inputs: [
      { portId: 'input', label: 'Input', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'result', label: 'Result', dataType: 'table' },
    ],
    configSchema: {
      columns: { type: 'json', label: 'New Columns', defaultValue: [], helpText: 'Array of { name, expression } — e.g. { name: "pct", expression: "row.correct / row.total" }' },
    },
  },

  // ── VISUALISE ───────────────────────────────────────────────────────
  {
    typeId: 'sr:vis:chart',
    label: 'Chart',
    category: 'VISUALISE',
    description: 'Interactive chart visualisation (line, bar, scatter, area)',
    inputs: [
      { portId: 'data', label: 'Data', dataType: 'table', required: true },
    ],
    outputs: [],
    configSchema: {
      chartType: { type: 'select', label: 'Chart Type', options: [
        { value: 'line', label: 'Line' }, { value: 'bar', label: 'Bar' },
        { value: 'scatter', label: 'Scatter' }, { value: 'area', label: 'Area' },
      ], defaultValue: 'line' },
      xColumn: { type: 'string', label: 'X Axis Column', required: true },
      yColumns: { type: 'json', label: 'Y Axis Columns', defaultValue: [], helpText: 'Array of column names to plot' },
      title: { type: 'string', label: 'Chart Title', placeholder: 'My Chart' },
    },
  },
  {
    typeId: 'sr:vis:table',
    label: 'Data Table',
    category: 'VISUALISE',
    description: 'Interactive data table with sorting, filtering, and pagination',
    inputs: [
      { portId: 'data', label: 'Data', dataType: 'table', required: true },
    ],
    outputs: [],
    configSchema: {
      pageSize: { type: 'number', label: 'Rows Per Page', defaultValue: 25 },
      sortableColumns: { type: 'json', label: 'Sortable Columns', defaultValue: [], helpText: 'Leave empty for all columns' },
    },
  },
  {
    typeId: 'sr:vis:heatmap',
    label: 'Mastery Heatmap',
    category: 'VISUALISE',
    description: 'BKT mastery heatmap — learners vs GPCs with colour-coded mastery',
    inputs: [
      { portId: 'data', label: 'Data', dataType: 'table', required: true },
    ],
    outputs: [],
    configSchema: {
      rowColumn: { type: 'string', label: 'Row Column', placeholder: 'learnerId', required: true },
      colColumn: { type: 'string', label: 'Column Column', placeholder: 'gpcCode', required: true },
      valueColumn: { type: 'string', label: 'Value Column', placeholder: 'mastery', required: true },
      colorScale: { type: 'select', label: 'Colour Scale', options: [
        { value: 'green-red', label: 'Green → Red' },
        { value: 'blue-orange', label: 'Blue → Orange' },
        { value: 'viridis', label: 'Viridis' },
      ], defaultValue: 'green-red' },
    },
  },

  // ── MODEL ───────────────────────────────────────────────────────────
  {
    typeId: 'sr:model:train',
    label: 'Train Classifier',
    category: 'MODEL',
    description: 'Train an ML model via the Auto-ML pipeline with feature store',
    inputs: [
      { portId: 'training', label: 'Training Data', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'model', label: 'Model', dataType: 'record' },
    ],
    executionHint: 'long_running',
    configSchema: {
      algorithm: { type: 'select', label: 'Algorithm', options: [
        { value: 'auto', label: 'Auto-Select' }, { value: 'random_forest', label: 'Random Forest' },
        { value: 'gradient_boost', label: 'Gradient Boost' }, { value: 'logistic', label: 'Logistic Regression' },
      ], defaultValue: 'auto' },
      targetColumn: { type: 'string', label: 'Target Column', required: true },
      testSplit: { type: 'number', label: 'Test Split', defaultValue: 0.2, helpText: 'Fraction held out for evaluation (0-1)' },
    },
  },
  {
    typeId: 'sr:model:predict',
    label: 'Predict',
    category: 'MODEL',
    description: 'Run predictions using a trained model',
    inputs: [
      { portId: 'data', label: 'Data', dataType: 'table', required: true },
      { portId: 'model', label: 'Model', dataType: 'record', required: true },
    ],
    outputs: [
      { portId: 'predictions', label: 'Predictions', dataType: 'table' },
    ],
    configSchema: {
      outputColumn: { type: 'string', label: 'Output Column', defaultValue: 'prediction' },
      includeConfidence: { type: 'boolean', label: 'Include Confidence', defaultValue: true },
    },
  },

  // ── ACTION ──────────────────────────────────────────────────────────
  {
    typeId: 'sr:action:human-review',
    label: 'Human Review',
    category: 'ACTION',
    description: 'Pause workflow for human approval — bulk or item-by-item review',
    pauses: true,
    inputs: [
      { portId: 'items', label: 'Items', dataType: 'any', required: true },
    ],
    outputs: [
      { portId: 'approved', label: 'Approved', dataType: 'table' },
      { portId: 'reviewStats', label: 'Stats', dataType: 'record' },
    ],
    configSchema: {
      approvalMode: { type: 'select', label: 'Approval Mode', options: [
        { value: 'bulk', label: 'Bulk (approve/reject all)' },
        { value: 'item', label: 'Item-by-Item' },
      ], defaultValue: 'bulk' },
      reviewerRoles: { type: 'json', label: 'Reviewer Roles', defaultValue: ['admin', 'editor'], helpText: 'Roles allowed to review' },
      pauseMessage: { type: 'text', label: 'Pause Message', placeholder: 'Please review the imported content before proceeding...', helpText: 'Message shown to reviewer when workflow pauses' },
    },
  },
  {
    typeId: 'sr:action:service-import',
    label: 'Service Import',
    category: 'ACTION',
    description: 'Import approved items into Scholarly platform services (CMS, Storefront, Auth)',
    inputs: [
      { portId: 'approved', label: 'Approved', dataType: 'table', required: true },
      { portId: 'reviewStats', label: 'Stats', dataType: 'record' },
    ],
    outputs: [
      { portId: 'importResult', label: 'Result', dataType: 'record' },
      { portId: 'etlRun', label: 'ETL Run', dataType: 'record' },
    ],
    executionHint: 'slow',
    configSchema: {
      targetServices: { type: 'json', label: 'Target Services', defaultValue: ['cms', 'storefront', 'auth'], helpText: 'Which services to import into' },
      dryRun: { type: 'boolean', label: 'Dry Run', defaultValue: false, helpText: 'Validate without writing' },
    },
  },
  {
    typeId: 'sr:action:infrastructure-cutover',
    label: 'Cutover',
    category: 'ACTION',
    description: 'DNS/SSL infrastructure cutover — pauses for manual confirmation',
    pauses: true,
    inputs: [
      { portId: 'importResult', label: 'Import Result', dataType: 'record', required: true },
    ],
    outputs: [
      { portId: 'cutoverResult', label: 'Result', dataType: 'record' },
    ],
    configSchema: {
      domain: { type: 'string', label: 'Domain', placeholder: 'example.com', required: true },
      sslProvider: { type: 'select', label: 'SSL Provider', options: [
        { value: 'letsencrypt', label: "Let's Encrypt" }, { value: 'cloudflare', label: 'Cloudflare' },
      ], defaultValue: 'letsencrypt' },
      rollbackWindow: { type: 'number', label: 'Rollback Window (min)', defaultValue: 60 },
    },
  },
  {
    typeId: 'sr:action:webhook',
    label: 'Webhook',
    category: 'ACTION',
    description: 'Send webhook notification to external service',
    inputs: [
      { portId: 'data', label: 'Data', dataType: 'any', required: true },
    ],
    outputs: [
      { portId: 'response', label: 'Response', dataType: 'record' },
    ],
    configSchema: {
      url: { type: 'string', label: 'Webhook URL', required: true, placeholder: 'https://hooks.example.com/notify' },
      method: { type: 'select', label: 'Method', options: [
        { value: 'POST', label: 'POST' }, { value: 'PUT', label: 'PUT' },
      ], defaultValue: 'POST' },
      headers: { type: 'json', label: 'Headers', defaultValue: {} },
    },
  },
  {
    typeId: 'sr:action:notification',
    label: 'Notification',
    category: 'ACTION',
    description: 'Send platform notification (email, push, in-app) to specified recipients',
    inputs: [
      { portId: 'data', label: 'Data', dataType: 'any', required: true },
    ],
    outputs: [
      { portId: 'result', label: 'Result', dataType: 'record' },
    ],
    configSchema: {
      channel: { type: 'select', label: 'Channel', options: [
        { value: 'email', label: 'Email' }, { value: 'push', label: 'Push' },
        { value: 'in_app', label: 'In-App' }, { value: 'all', label: 'All Channels' },
      ], defaultValue: 'email' },
      template: { type: 'string', label: 'Template ID', placeholder: 'workflow-complete', required: true },
      recipients: { type: 'json', label: 'Recipients', defaultValue: [], helpText: 'Array of user IDs or "triggeredBy" for workflow owner' },
    },
  },

  // ── EDUCATION ───────────────────────────────────────────────────────
  {
    typeId: 'sr:edu:bkt-update',
    label: 'BKT Update',
    category: 'EDUCATION',
    description: 'Update Bayesian Knowledge Tracing mastery estimates from assessment responses',
    inputs: [
      { portId: 'responses', label: 'Responses', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'mastery', label: 'Mastery', dataType: 'table' },
    ],
    configSchema: {
      model: { type: 'select', label: 'BKT Model', options: [
        { value: 'standard', label: 'Standard BKT' }, { value: 'federated', label: 'Federated BKT' },
      ], defaultValue: 'federated' },
      priorMastery: { type: 'number', label: 'Prior Mastery', defaultValue: 0.1, helpText: 'Initial mastery probability for unseen GPCs' },
    },
  },
  {
    typeId: 'sr:edu:at-risk',
    label: 'At-Risk Detection',
    category: 'EDUCATION',
    description: 'Identify at-risk learners using mastery decay, engagement, and WCPM trends',
    inputs: [
      { portId: 'mastery', label: 'Mastery', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'alerts', label: 'Alerts', dataType: 'table' },
    ],
    configSchema: {
      riskThreshold: { type: 'number', label: 'Risk Threshold', defaultValue: 0.3, helpText: 'Combined risk score threshold (0-1)' },
      lookbackDays: { type: 'number', label: 'Lookback (days)', defaultValue: 14 },
      includeFactors: { type: 'boolean', label: 'Include Contributing Factors', defaultValue: true },
    },
  },
  {
    typeId: 'sr:edu:phonics-progression',
    label: 'Phonics Progression',
    category: 'EDUCATION',
    description: 'Analyse learner progression through Letters and Sounds phases',
    inputs: [
      { portId: 'mastery', label: 'Mastery', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'progression', label: 'Progression', dataType: 'table' },
      { portId: 'recommendations', label: 'Recommendations', dataType: 'table' },
    ],
    configSchema: {
      framework: { type: 'select', label: 'Framework', options: [
        { value: 'letters-and-sounds', label: 'Letters and Sounds' },
        { value: 'ssp', label: 'Systematic Synthetic Phonics' },
      ], defaultValue: 'letters-and-sounds' },
      targetPhase: { type: 'number', label: 'Target Phase', defaultValue: 6 },
    },
  },
  {
    typeId: 'sr:edu:curriculum-check',
    label: 'Curriculum Check',
    category: 'EDUCATION',
    description: 'Validate data alignment against curriculum standards (ACARA, IB PYP, EYFS)',
    inputs: [
      { portId: 'data', label: 'Data', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'alignmentReport', label: 'Alignment', dataType: 'record' },
    ],
    configSchema: {
      curriculum: { type: 'select', label: 'Curriculum', options: [
        { value: 'acara', label: 'ACARA (Australia)' },
        { value: 'ib_pyp', label: 'IB PYP' },
        { value: 'eyfs', label: 'EYFS (UK)' },
        { value: 'eylf', label: 'EYLF (Australia)' },
      ], required: true },
      yearLevel: { type: 'string', label: 'Year Level', placeholder: 'Foundation' },
    },
  },
];


// ── Geometry Constants ──────────────────────────────────────────────────
export const NODE_WIDTH = 200;
export const NODE_HEADER_HEIGHT = 36;
export const PORT_ROW_HEIGHT = 22;
export const PORT_RADIUS = 6;
export const MIN_ZOOM = 0.15;
export const MAX_ZOOM = 3.0;
export const ZOOM_STEP = 0.08;


// ============================================================================
// §3 — COMMAND PATTERN (Undo/Redo)
// ============================================================================
//
// Every user action that modifies the canvas graph is wrapped in a Command
// object. Commands know how to execute() themselves and undo() themselves.
// The CommandHistory maintains two stacks (undo and redo) and provides
// Ctrl+Z / Ctrl+Shift+Z navigation.
//
// This is the luggage handling system — every bag (edit) gets a tag (command)
// so we can find it and return it if the passenger (user) changes their mind.

/**
 * A reversible command on the canvas state.
 */
export interface CanvasCommand {
  /** Human-readable description for debug/UI */
  readonly description: string;
  /** Apply the command */
  execute(state: CanvasGraphState): CanvasGraphState;
  /** Reverse the command */
  undo(state: CanvasGraphState): CanvasGraphState;
}

/**
 * The subset of canvas state that commands operate on.
 * Commands receive and return this, keeping them decoupled from React state.
 */
export interface CanvasGraphState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

/**
 * Command history with undo/redo stacks.
 */
export class CommandHistory {
  private undoStack: CanvasCommand[] = [];
  private redoStack: CanvasCommand[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  /**
   * Execute a command and push it onto the undo stack.
   * Clears the redo stack (new action invalidates redo history).
   */
  execute(command: CanvasCommand, state: CanvasGraphState): CanvasGraphState {
    const newState = command.execute(state);
    this.undoStack.push(command);
    this.redoStack = [];

    // Trim if over limit
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }

    return newState;
  }

  /**
   * Undo the most recent command.
   */
  undo(state: CanvasGraphState): CanvasGraphState | null {
    const command = this.undoStack.pop();
    if (!command) return null;

    const newState = command.undo(state);
    this.redoStack.push(command);
    return newState;
  }

  /**
   * Redo the most recently undone command.
   */
  redo(state: CanvasGraphState): CanvasGraphState | null {
    const command = this.redoStack.pop();
    if (!command) return null;

    const newState = command.execute(state);
    this.undoStack.push(command);
    return newState;
  }

  get canUndo(): boolean { return this.undoStack.length > 0; }
  get canRedo(): boolean { return this.redoStack.length > 0; }
  get undoDescription(): string | null {
    return this.undoStack.length > 0 ? this.undoStack[this.undoStack.length - 1]!.description : null;
  }
  get redoDescription(): string | null {
    return this.redoStack.length > 0 ? this.redoStack[this.redoStack.length - 1]!.description : null;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }
}


// ── Concrete Commands ───────────────────────────────────────────────────

export class AddNodeCommand implements CanvasCommand {
  readonly description: string;
  constructor(private readonly node: CanvasNode) {
    const type = NODE_TYPES.find(t => t.typeId === node.typeId);
    this.description = `Add ${type?.label ?? node.typeId}`;
  }
  execute(state: CanvasGraphState): CanvasGraphState {
    return { ...state, nodes: [...state.nodes, this.node] };
  }
  undo(state: CanvasGraphState): CanvasGraphState {
    return { ...state, nodes: state.nodes.filter(n => n.id !== this.node.id) };
  }
}

export class RemoveNodeCommand implements CanvasCommand {
  readonly description: string;
  private removedEdges: CanvasEdge[] = [];

  constructor(
    private readonly nodeId: string,
    private readonly removedNode: CanvasNode,
    currentEdges: CanvasEdge[],
  ) {
    const type = NODE_TYPES.find(t => t.typeId === removedNode.typeId);
    this.description = `Remove ${type?.label ?? removedNode.typeId}`;
    // Capture edges that will be severed
    this.removedEdges = currentEdges.filter(
      e => e.sourceNodeId === nodeId || e.targetNodeId === nodeId,
    );
  }
  execute(state: CanvasGraphState): CanvasGraphState {
    return {
      nodes: state.nodes.filter(n => n.id !== this.nodeId),
      edges: state.edges.filter(
        e => e.sourceNodeId !== this.nodeId && e.targetNodeId !== this.nodeId,
      ),
    };
  }
  undo(state: CanvasGraphState): CanvasGraphState {
    return {
      nodes: [...state.nodes, this.removedNode],
      edges: [...state.edges, ...this.removedEdges],
    };
  }
}

export class MoveNodeCommand implements CanvasCommand {
  readonly description = 'Move node';
  constructor(
    private readonly nodeId: string,
    private readonly fromX: number,
    private readonly fromY: number,
    private readonly toX: number,
    private readonly toY: number,
  ) {}
  execute(state: CanvasGraphState): CanvasGraphState {
    return {
      ...state,
      nodes: state.nodes.map(n =>
        n.id === this.nodeId ? { ...n, x: this.toX, y: this.toY } : n,
      ),
    };
  }
  undo(state: CanvasGraphState): CanvasGraphState {
    return {
      ...state,
      nodes: state.nodes.map(n =>
        n.id === this.nodeId ? { ...n, x: this.fromX, y: this.fromY } : n,
      ),
    };
  }
}

export class AddEdgeCommand implements CanvasCommand {
  readonly description: string;
  constructor(private readonly edge: CanvasEdge) {
    this.description = `Connect ${edge.sourceNodeId} → ${edge.targetNodeId}`;
  }
  execute(state: CanvasGraphState): CanvasGraphState {
    return { ...state, edges: [...state.edges, this.edge] };
  }
  undo(state: CanvasGraphState): CanvasGraphState {
    return { ...state, edges: state.edges.filter(e => e.id !== this.edge.id) };
  }
}

export class RemoveEdgeCommand implements CanvasCommand {
  readonly description = 'Remove connection';
  constructor(private readonly edge: CanvasEdge) {}
  execute(state: CanvasGraphState): CanvasGraphState {
    return { ...state, edges: state.edges.filter(e => e.id !== this.edge.id) };
  }
  undo(state: CanvasGraphState): CanvasGraphState {
    return { ...state, edges: [...state.edges, this.edge] };
  }
}

export class UpdateConfigCommand implements CanvasCommand {
  readonly description: string;
  constructor(
    private readonly nodeId: string,
    private readonly field: string,
    private readonly oldValue: unknown,
    private readonly newValue: unknown,
  ) {
    this.description = `Update ${field}`;
  }
  execute(state: CanvasGraphState): CanvasGraphState {
    return {
      ...state,
      nodes: state.nodes.map(n =>
        n.id === this.nodeId
          ? { ...n, config: { ...n.config, [this.field]: this.newValue } }
          : n,
      ),
    };
  }
  undo(state: CanvasGraphState): CanvasGraphState {
    return {
      ...state,
      nodes: state.nodes.map(n =>
        n.id === this.nodeId
          ? { ...n, config: { ...n.config, [this.field]: this.oldValue } }
          : n,
      ),
    };
  }
}

export class LoadRecipeCommand implements CanvasCommand {
  readonly description: string;
  constructor(
    private readonly newNodes: CanvasNode[],
    private readonly newEdges: CanvasEdge[],
    recipeName: string,
  ) {
    this.description = `Load recipe: ${recipeName}`;
  }
  execute(state: CanvasGraphState): CanvasGraphState {
    return {
      nodes: [...state.nodes, ...this.newNodes],
      edges: [...state.edges, ...this.newEdges],
    };
  }
  undo(state: CanvasGraphState): CanvasGraphState {
    const nodeIds = new Set(this.newNodes.map(n => n.id));
    const edgeIds = new Set(this.newEdges.map(e => e.id));
    return {
      nodes: state.nodes.filter(n => !nodeIds.has(n.id)),
      edges: state.edges.filter(e => !edgeIds.has(e.id)),
    };
  }
}

export class BulkDeleteCommand implements CanvasCommand {
  readonly description: string;
  constructor(
    private readonly removedNodes: CanvasNode[],
    private readonly removedEdges: CanvasEdge[],
  ) {
    this.description = `Delete ${removedNodes.length} node(s)`;
  }
  execute(state: CanvasGraphState): CanvasGraphState {
    const nodeIds = new Set(this.removedNodes.map(n => n.id));
    const edgeIds = new Set(this.removedEdges.map(e => e.id));
    return {
      nodes: state.nodes.filter(n => !nodeIds.has(n.id)),
      edges: state.edges.filter(e => !edgeIds.has(e.id)),
    };
  }
  undo(state: CanvasGraphState): CanvasGraphState {
    return {
      nodes: [...state.nodes, ...this.removedNodes],
      edges: [...state.edges, ...this.removedEdges],
    };
  }
}


// ============================================================================
// §4 — ZOOM & VIEWPORT
// ============================================================================
//
// The canvas uses an affine transform (translate + uniform scale) to
// implement infinite pan/zoom. Think of it like a camera hovering over an
// infinite workbench: zoom changes the camera altitude, pan slides it
// laterally, and the minimap is the bird's-eye monitor on the wall.
//
// All coordinate transforms go through two functions:
//   screenToCanvas: mouse event coords → canvas world coords
//   canvasToScreen: canvas world coords → SVG rendering coords
//
// Zoom is always centered on the cursor position (or pinch midpoint),
// so the point under the cursor stays fixed — the behaviour users expect
// from maps, Figma, and every modern canvas tool.

/**
 * Convert screen coordinates (mouse event) to canvas world coordinates.
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  viewport: ViewportState,
): { x: number; y: number } {
  return {
    x: (screenX - viewport.offsetX) / viewport.scale,
    y: (screenY - viewport.offsetY) / viewport.scale,
  };
}

/**
 * Convert canvas world coordinates to screen coordinates.
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  viewport: ViewportState,
): { x: number; y: number } {
  return {
    x: canvasX * viewport.scale + viewport.offsetX,
    y: canvasY * viewport.scale + viewport.offsetY,
  };
}

/**
 * Compute a new viewport after zooming by `delta` scale units,
 * keeping the point at (focusX, focusY) in screen coords fixed.
 *
 * The math: we want the canvas-world point under the cursor to stay
 * in the same screen position after the zoom. Given:
 *   canvasPoint = (focusX - offsetX) / oldScale
 *   newFocusX = canvasPoint * newScale + newOffsetX = focusX
 * Solving for newOffsetX:
 *   newOffsetX = focusX - canvasPoint * newScale
 */
export function zoomAtPoint(
  viewport: ViewportState,
  delta: number,
  focusX: number,
  focusY: number,
): ViewportState {
  const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, viewport.scale + delta));
  if (newScale === viewport.scale) return viewport;

  const canvasX = (focusX - viewport.offsetX) / viewport.scale;
  const canvasY = (focusY - viewport.offsetY) / viewport.scale;

  return {
    scale: newScale,
    offsetX: focusX - canvasX * newScale,
    offsetY: focusY - canvasY * newScale,
  };
}

/**
 * Fit the viewport to show all nodes with padding.
 * Used for "zoom to fit" and initial layout of loaded workflows.
 */
export function fitToContent(
  nodes: CanvasNode[],
  containerWidth: number,
  containerHeight: number,
  padding: number = 60,
): ViewportState {
  if (nodes.length === 0) {
    return { offsetX: 0, offsetY: 0, scale: 1 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const node of nodes) {
    const h = getNodeHeight(node.typeId);
    if (node.x < minX) minX = node.x;
    if (node.y < minY) minY = node.y;
    if (node.x + NODE_WIDTH > maxX) maxX = node.x + NODE_WIDTH;
    if (node.y + h > maxY) maxY = node.y + h;
  }

  const contentW = maxX - minX + padding * 2;
  const contentH = maxY - minY + padding * 2;
  const scale = Math.min(
    containerWidth / contentW,
    containerHeight / contentH,
    1.5, // Don't zoom in too much
  );
  const clampedScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale));

  return {
    scale: clampedScale,
    offsetX: (containerWidth - (maxX - minX) * clampedScale) / 2 - minX * clampedScale,
    offsetY: (containerHeight - (maxY - minY) * clampedScale) / 2 - minY * clampedScale,
  };
}


// ── Geometry Helpers ────────────────────────────────────────────────────

/**
 * Calculate the pixel height of a node based on its port count.
 */
export function getNodeHeight(typeId: string): number {
  const type = NODE_TYPES.find(t => t.typeId === typeId);
  if (!type) return 60;
  const ports = Math.max(type.inputs.length, type.outputs.length);
  return NODE_HEADER_HEIGHT + Math.max(ports, 1) * PORT_ROW_HEIGHT + 12;
}

/**
 * Get the screen position of a port on a node.
 */
export function getPortPosition(
  node: CanvasNode,
  portId: string,
  side: 'input' | 'output',
): { x: number; y: number } {
  const type = NODE_TYPES.find(t => t.typeId === node.typeId);
  if (!type) return { x: node.x, y: node.y };
  const ports = side === 'output' ? type.outputs : type.inputs;
  const idx = ports.findIndex(p => p.portId === portId);
  return {
    x: side === 'output' ? node.x + NODE_WIDTH : node.x,
    y: node.y + NODE_HEADER_HEIGHT + (idx + 0.5) * PORT_ROW_HEIGHT,
  };
}

/**
 * Check if two port data types are compatible for connection.
 */
export function areTypesCompatible(sourceType: string, targetType: string): boolean {
  return sourceType === targetType || sourceType === 'any' || targetType === 'any';
}

/**
 * Generate a cubic bezier path between two points for edge rendering.
 * The control points create a smooth horizontal S-curve.
 */
export function makeEdgePath(x1: number, y1: number, x2: number, y2: number): string {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

/**
 * Generate a unique ID for nodes/edges.
 */
export function generateId(prefix: string = 'n'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}


// ============================================================================
// §5 — RECIPE SYSTEM
// ============================================================================
//
// Recipes are reusable sub-graphs — the "pre-coupled train" that a user
// can place on the canvas with a single action. They're the S&R equivalent
// of KNIME's "metanodes" or Alteryx's "macro workflows", but simpler:
// a recipe is just a snapshot of nodes + edges with relative positions.
//
// When a user selects several connected nodes and clicks "Save as Recipe,"
// the system captures:
//   1. The selected nodes with positions normalised to (0,0) origin
//   2. All edges between the selected nodes
//   3. A name and description
//
// When a recipe is loaded, new IDs are generated for all nodes and edges,
// and the recipe is placed at the cursor position (or a default offset).

/**
 * Create a recipe from a set of selected nodes and their connecting edges.
 */
export function createRecipeFromSelection(
  selectedNodeIds: Set<string>,
  allNodes: CanvasNode[],
  allEdges: CanvasEdge[],
  name: string,
  description: string,
  category: string = 'Custom',
): Recipe {
  const selectedNodes = allNodes.filter(n => selectedNodeIds.has(n.id));
  if (selectedNodes.length === 0) {
    throw new Error('No nodes selected for recipe');
  }

  // Find the origin (top-left corner of bounding box)
  const originX = Math.min(...selectedNodes.map(n => n.x));
  const originY = Math.min(...selectedNodes.map(n => n.y));

  // Build relative nodes
  const relativeNodes = selectedNodes.map(n => ({
    relativeId: n.id, // Will be replaced with new IDs on instantiation
    typeId: n.typeId,
    dx: n.x - originX,
    dy: n.y - originY,
    config: { ...n.config },
  }));

  // Capture internal edges (both ends within selection)
  const internalEdges = allEdges
    .filter(e => selectedNodeIds.has(e.sourceNodeId) && selectedNodeIds.has(e.targetNodeId))
    .map(e => ({
      sourceRelId: e.sourceNodeId,
      sourcePortId: e.sourcePortId,
      targetRelId: e.targetNodeId,
      targetPortId: e.targetPortId,
    }));

  return {
    id: generateId('recipe'),
    name,
    description,
    category,
    nodes: relativeNodes,
    edges: internalEdges,
    createdAt: Date.now(),
  };
}

/**
 * Instantiate a recipe onto the canvas at a given position.
 * Generates new unique IDs for all nodes and edges.
 */
export function instantiateRecipe(
  recipe: Recipe,
  placeX: number,
  placeY: number,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  // Map old relative IDs to new unique IDs
  const idMap = new Map<string, string>();
  for (const rn of recipe.nodes) {
    idMap.set(rn.relativeId, generateId('n'));
  }

  const recipeGroupId = generateId('rg');

  const nodes: CanvasNode[] = recipe.nodes.map(rn => ({
    id: idMap.get(rn.relativeId)!,
    typeId: rn.typeId,
    x: placeX + rn.dx,
    y: placeY + rn.dy,
    config: { ...rn.config },
    recipeGroupId,
  }));

  const edges: CanvasEdge[] = recipe.edges.map(re => ({
    id: generateId('e'),
    sourceNodeId: idMap.get(re.sourceRelId)!,
    sourcePortId: re.sourcePortId,
    targetNodeId: idMap.get(re.targetRelId)!,
    targetPortId: re.targetPortId,
  }));

  return { nodes, edges };
}


// ── Built-in Recipes ────────────────────────────────────────────────────

export const BUILT_IN_RECIPES: Recipe[] = [
  {
    id: 'recipe_migration_pipeline',
    name: 'Platform Migration',
    description: 'Complete 7-node pipeline: Source → Extract → Transform → Review → Import → Cutover → Health',
    category: 'Migration',
    nodes: [
      { relativeId: 'source', typeId: 'sr:source:platform-export', dx: 0, dy: 0, config: {} },
      { relativeId: 'cdc', typeId: 'sr:source:cdc-extract', dx: 240, dy: 0, config: {} },
      { relativeId: 'transform', typeId: 'sr:transform:content-transform', dx: 480, dy: 0, config: {} },
      { relativeId: 'review', typeId: 'sr:action:human-review', dx: 720, dy: 0, config: { approvalMode: 'bulk' } },
      { relativeId: 'import', typeId: 'sr:action:service-import', dx: 960, dy: 0, config: {} },
      { relativeId: 'cutover', typeId: 'sr:action:infrastructure-cutover', dx: 1200, dy: 0, config: {} },
      { relativeId: 'health', typeId: 'sr:source:health-monitor', dx: 1440, dy: 0, config: {} },
    ],
    edges: [
      { sourceRelId: 'source', sourcePortId: 'content', targetRelId: 'cdc', targetPortId: 'items' },
      { sourceRelId: 'cdc', sourcePortId: 'etlRun', targetRelId: 'transform', targetPortId: 'etlRun' },
      { sourceRelId: 'transform', sourcePortId: 'summary', targetRelId: 'review', targetPortId: 'items' },
      { sourceRelId: 'review', sourcePortId: 'approved', targetRelId: 'import', targetPortId: 'approved' },
      { sourceRelId: 'review', sourcePortId: 'reviewStats', targetRelId: 'import', targetPortId: 'reviewStats' },
      { sourceRelId: 'import', sourcePortId: 'importResult', targetRelId: 'cutover', targetPortId: 'importResult' },
      { sourceRelId: 'cutover', sourcePortId: 'cutoverResult', targetRelId: 'health', targetPortId: 'trigger' },
    ],
    createdAt: Date.now(),
  },
  {
    id: 'recipe_learner_analytics',
    name: 'Learner Analytics',
    description: 'Read mastery data → At-Risk Detection → Heatmap visualisation',
    category: 'Education',
    nodes: [
      { relativeId: 'read', typeId: 'sr:source:data-lake-read', dx: 0, dy: 0, config: { tableName: 'gold_fact_mastery', zone: 'gold' } },
      { relativeId: 'atrisk', typeId: 'sr:edu:at-risk', dx: 240, dy: 0, config: {} },
      { relativeId: 'heatmap', typeId: 'sr:vis:heatmap', dx: 480, dy: 0, config: { rowColumn: 'learnerId', colColumn: 'gpcCode', valueColumn: 'mastery' } },
    ],
    edges: [
      { sourceRelId: 'read', sourcePortId: 'rows', targetRelId: 'atrisk', targetPortId: 'mastery' },
      { sourceRelId: 'atrisk', sourcePortId: 'alerts', targetRelId: 'heatmap', targetPortId: 'data' },
    ],
    createdAt: Date.now(),
  },
  {
    id: 'recipe_etl_quality',
    name: 'ETL + Quality Gate',
    description: 'Data Lake Read → Quality Audit → Filter pass/fail → Chart',
    category: 'Data Quality',
    nodes: [
      { relativeId: 'read', typeId: 'sr:source:data-lake-read', dx: 0, dy: 0, config: {} },
      { relativeId: 'quality', typeId: 'sr:transform:quality-audit', dx: 240, dy: 0, config: {} },
      { relativeId: 'filter', typeId: 'sr:transform:filter', dx: 480, dy: 80, config: { expression: 'row.passed === true' } },
      { relativeId: 'chart', typeId: 'sr:vis:chart', dx: 720, dy: 80, config: { chartType: 'bar' } },
    ],
    edges: [
      { sourceRelId: 'read', sourcePortId: 'rows', targetRelId: 'quality', targetPortId: 'trigger' },
      { sourceRelId: 'quality', sourcePortId: 'qualityReport', targetRelId: 'filter', targetPortId: 'input' },
      { sourceRelId: 'filter', sourcePortId: 'passed', targetRelId: 'chart', targetPortId: 'data' },
    ],
    createdAt: Date.now(),
  },
];


// ============================================================================
// §6 — WORKFLOW SERIALISATION
// ============================================================================
//
// This is the translator between the canvas's visual representation and
// the engine's WorkflowDefinition JSON. When the user clicks "Execute,"
// the canvas serialises its nodes and edges into the exact format that
// sr-workflow-engine.ts expects. When a saved workflow is loaded, the
// reverse translation places nodes on the canvas with positions.
//
// The analogy: the canvas is the timetable display (visual, spatial,
// interactive), and the WorkflowDefinition is the actual timetable data
// (structured, machine-readable, executable). This function converts
// between the two representations.

/**
 * The WorkflowDefinition shape — mirrors the engine's type exactly.
 * Duplicated here to avoid import dependency in frontend builds.
 */
export interface WorkflowDefinitionJSON {
  workflowId: string;
  name: string;
  description: string;
  version: number;
  nodes: Array<{
    nodeId: string;
    typeId: string;
    label?: string;
    config: Record<string, unknown>;
    position?: { x: number; y: number };
  }>;
  edges: Array<{
    edgeId: string;
    sourceNodeId: string;
    sourcePortId: string;
    targetNodeId: string;
    targetPortId: string;
  }>;
  trigger: {
    type: 'manual' | 'cron' | 'event' | 'webhook';
    cron?: string;
    eventTopic?: string;
    webhookPath?: string;
  };
  metadata: {
    createdBy: string;
    createdAt: string;
    updatedAt: string;
    tenantId: string;
    tags: string[];
    templateId?: string;
  };
}

/**
 * Serialise the canvas state to a WorkflowDefinition JSON.
 */
export function canvasToWorkflowDefinition(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
  options: {
    workflowId?: string;
    name?: string;
    description?: string;
    version?: number;
    tenantId?: string;
    userId?: string;
    tags?: string[];
    trigger?: WorkflowDefinitionJSON['trigger'];
    templateId?: string;
  } = {},
): WorkflowDefinitionJSON {
  return {
    workflowId: options.workflowId ?? generateId('wf'),
    name: options.name ?? 'Untitled Workflow',
    description: options.description ?? '',
    version: options.version ?? 1,
    nodes: nodes.map(n => ({
      nodeId: n.id,
      typeId: n.typeId,
      label: n.label,
      config: n.config,
      position: { x: n.x, y: n.y },
    })),
    edges: edges.map(e => ({
      edgeId: e.id,
      sourceNodeId: e.sourceNodeId,
      sourcePortId: e.sourcePortId,
      targetNodeId: e.targetNodeId,
      targetPortId: e.targetPortId,
    })),
    trigger: options.trigger ?? { type: 'manual' },
    metadata: {
      createdBy: options.userId ?? 'canvas-user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId: options.tenantId ?? 'default',
      tags: options.tags ?? [],
      templateId: options.templateId,
    },
  };
}

/**
 * Deserialise a WorkflowDefinition JSON into canvas state.
 */
export function workflowDefinitionToCanvas(
  definition: WorkflowDefinitionJSON,
): { nodes: CanvasNode[]; edges: CanvasEdge[] } {
  const nodes: CanvasNode[] = definition.nodes.map((n, i) => ({
    id: n.nodeId,
    typeId: n.typeId,
    label: n.label,
    x: n.position?.x ?? i * 240,
    y: n.position?.y ?? 100,
    config: n.config,
  }));

  const edges: CanvasEdge[] = definition.edges.map(e => ({
    id: e.edgeId,
    sourceNodeId: e.sourceNodeId,
    sourcePortId: e.sourcePortId,
    targetNodeId: e.targetNodeId,
    targetPortId: e.targetPortId,
  }));

  return { nodes, edges };
}


/**
 * Validate the canvas graph against the node type registry.
 * This is a client-side validation that mirrors the engine's validateWorkflow()
 * to provide instant feedback in the canvas without an API round-trip.
 */
export function validateCanvasGraph(
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): CanvasValidationIssue[] {
  const issues: CanvasValidationIssue[] = [];
  const nodeMap = new Map(nodes.map(n => [n.id, n]));

  // 1. All node types must exist in the palette
  for (const node of nodes) {
    if (!NODE_TYPES.find(t => t.typeId === node.typeId)) {
      issues.push({
        severity: 'error',
        nodeId: node.id,
        message: `Unknown node type '${node.typeId}'`,
      });
    }
  }

  // 2. Edge validity — nodes/ports exist, types compatible
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.sourceNodeId);
    const targetNode = nodeMap.get(edge.targetNodeId);

    if (!sourceNode) {
      issues.push({ severity: 'error', edgeId: edge.id,
        message: `Edge references missing source node '${edge.sourceNodeId}'` });
      continue;
    }
    if (!targetNode) {
      issues.push({ severity: 'error', edgeId: edge.id,
        message: `Edge references missing target node '${edge.targetNodeId}'` });
      continue;
    }

    const sourceType = NODE_TYPES.find(t => t.typeId === sourceNode.typeId);
    const targetType = NODE_TYPES.find(t => t.typeId === targetNode.typeId);
    if (!sourceType || !targetType) continue;

    const sourcePort = sourceType.outputs.find(p => p.portId === edge.sourcePortId);
    const targetPort = targetType.inputs.find(p => p.portId === edge.targetPortId);

    if (!sourcePort) {
      issues.push({ severity: 'error', edgeId: edge.id,
        message: `No output port '${edge.sourcePortId}' on '${sourceType.label}'` });
    }
    if (!targetPort) {
      issues.push({ severity: 'error', edgeId: edge.id,
        message: `No input port '${edge.targetPortId}' on '${targetType.label}'` });
    }

    if (sourcePort && targetPort && !areTypesCompatible(sourcePort.dataType, targetPort.dataType)) {
      issues.push({ severity: 'error', edgeId: edge.id,
        message: `Type mismatch: ${sourcePort.dataType} → ${targetPort.dataType}` });
    }
  }

  // 3. Required input ports connected
  for (const node of nodes) {
    const type = NODE_TYPES.find(t => t.typeId === node.typeId);
    if (!type) continue;
    for (const input of type.inputs) {
      if (input.required !== false) {
        const connected = edges.some(
          e => e.targetNodeId === node.id && e.targetPortId === input.portId,
        );
        if (!connected) {
          issues.push({ severity: 'error', nodeId: node.id,
            message: `Required input '${input.label}' is not connected` });
        }
      }
    }
  }

  // 4. Cycle detection (Kahn's algorithm)
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    const targets = adjacency.get(edge.sourceNodeId);
    if (targets) targets.push(edge.targetNodeId);
    inDegree.set(edge.targetNodeId, (inDegree.get(edge.targetNodeId) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree.entries()) {
    if (degree === 0) queue.push(nodeId);
  }
  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visited++;
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }
  if (visited < nodes.length) {
    issues.push({ severity: 'error',
      message: `Workflow contains a cycle (${nodes.length - visited} node(s) in loop)` });
  }

  // 5. Warn on disconnected nodes
  for (const node of nodes) {
    const hasIn = edges.some(e => e.targetNodeId === node.id);
    const hasOut = edges.some(e => e.sourceNodeId === node.id);
    if (!hasIn && !hasOut && nodes.length > 1) {
      issues.push({ severity: 'warning', nodeId: node.id,
        message: `Node '${node.label ?? node.typeId}' is disconnected` });
    }
  }

  return issues;
}


// ============================================================================
// §7 — API INTEGRATION LAYER
// ============================================================================
//
// The Canvas API Gateway (§5.2.5, built separately as sr-api-gateway.ts)
// exposes REST endpoints for workflow CRUD and execution, plus a WebSocket
// endpoint for real-time node status streaming. This client class wraps
// those endpoints so the React component can call them cleanly.
//
// The pattern: the canvas calls WorkflowAPI methods. The API client sends
// HTTP requests to the Gateway. The Gateway calls the WorkflowRunner.
// The Runner publishes NATS events. The Gateway relays them over WebSocket.
// The canvas receives status updates and paints node glows accordingly.
//
// For initial development / offline use, the client includes a mock mode
// that simulates execution locally using topological sort and timers
// (essentially what the Chunk 1 prototype did).

export interface WorkflowAPIConfig {
  /** Base URL of the Canvas API Gateway */
  baseUrl: string;
  /** WebSocket URL for real-time streaming */
  wsUrl: string;
  /** Auth token for API calls */
  authToken?: string;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** User ID for audit trail */
  userId: string;
}

export interface SaveWorkflowResponse {
  workflowId: string;
  version: number;
  savedAt: string;
}

export interface ExecuteWorkflowResponse {
  runId: string;
  status: string;
}

export interface RunStatusResponse {
  runId: string;
  workflowId: string;
  status: string;
  nodeRuns: Array<{
    nodeId: string;
    typeId: string;
    status: string;
    durationMs: number;
    error?: string;
  }>;
  pausedAtNodeId?: string;
  error?: { nodeId: string; message: string };
  durationMs: number;
  timeline: Array<{ timestamp: string; event: string; nodeId?: string; detail?: string }>;
}

export interface CatalogueEntry {
  typeId: string;
  label: string;
  category: string;
  description: string;
  inputs: PortDef[];
  outputs: PortDef[];
  configSchema: Record<string, string>;
  pausesWorkflow: boolean;
  executionHint: string;
}

/**
 * WebSocket message from the API Gateway during workflow execution.
 */
export interface WSNodeStatusMessage {
  type: 'node_status' | 'run_status' | 'error' | 'connected';
  runId: string;
  nodeId?: string;
  status?: string;
  durationMs?: number;
  error?: string;
  detail?: string;
}

/**
 * Client for the Canvas API Gateway.
 */
export class WorkflowAPIClient {
  private ws: WebSocket | null = null;
  private statusListeners: Array<(msg: WSNodeStatusMessage) => void> = [];

  constructor(private readonly config: WorkflowAPIConfig) {}

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': this.config.tenantId,
    };
    if (this.config.authToken) {
      h['Authorization'] = `Bearer ${this.config.authToken}`;
    }
    return h;
  }

  /**
   * Save a workflow definition to the backend.
   */
  async saveWorkflow(definition: WorkflowDefinitionJSON): Promise<SaveWorkflowResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/workflows`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(definition),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Save failed: ${err.message ?? response.statusText}`);
    }
    return response.json();
  }

  /**
   * Execute a workflow, returning the run ID for status tracking.
   */
  async executeWorkflow(workflowId: string): Promise<ExecuteWorkflowResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/workflows/${workflowId}/execute`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ userId: this.config.userId }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Execute failed: ${err.message ?? response.statusText}`);
    }
    return response.json();
  }

  /**
   * Resume a paused workflow with external input data.
   */
  async resumeRun(runId: string, nodeOutputData: Record<string, unknown>): Promise<RunStatusResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/runs/${runId}/resume`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ data: nodeOutputData }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Resume failed: ${err.message ?? response.statusText}`);
    }
    return response.json();
  }

  /**
   * Cancel a running or paused workflow.
   */
  async cancelRun(runId: string, reason?: string): Promise<RunStatusResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/runs/${runId}/cancel`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Cancel failed: ${err.message ?? response.statusText}`);
    }
    return response.json();
  }

  /**
   * Poll the current status of a workflow run.
   */
  async getRunStatus(runId: string): Promise<RunStatusResponse> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/runs/${runId}`, {
      headers: this.headers,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Status fetch failed: ${err.message ?? response.statusText}`);
    }
    return response.json();
  }

  /**
   * Get the node type catalogue from the backend registry.
   */
  async getCatalogue(): Promise<CatalogueEntry[]> {
    const response = await fetch(`${this.config.baseUrl}/api/v1/registry/catalogue`, {
      headers: this.headers,
    });
    if (!response.ok) return []; // Fall back to built-in catalogue
    return response.json();
  }

  /**
   * Subscribe to real-time execution status via WebSocket.
   */
  connectWebSocket(runId: string): void {
    if (this.ws) {
      this.ws.close();
    }

    const wsUrl = `${this.config.wsUrl}/api/v1/runs/${runId}/stream`;
    this.ws = new WebSocket(wsUrl);

    this.ws.onmessage = (event) => {
      try {
        const msg: WSNodeStatusMessage = JSON.parse(event.data);
        for (const listener of this.statusListeners) {
          listener(msg);
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onerror = () => {
      // Fall back to polling if WS fails
      console.warn('WebSocket connection failed, falling back to polling');
    };

    this.ws.onclose = () => {
      this.ws = null;
    };
  }

  /**
   * Register a listener for real-time status updates.
   */
  onStatusUpdate(listener: (msg: WSNodeStatusMessage) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  /**
   * Disconnect the WebSocket.
   */
  disconnectWebSocket(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Dispose all connections.
   */
  dispose(): void {
    this.disconnectWebSocket();
    this.statusListeners = [];
  }
}


// ── Mock Execution (for development/offline) ────────────────────────────

/**
 * Simulate workflow execution locally using topological sort and timers.
 * Used when no API Gateway is available (development, demo, offline).
 */
export function createMockExecutor(): {
  execute: (
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    onStatusChange: (nodeId: string, status: NodeRunStatus) => void,
    onRunStatus: (status: RunState['status']) => void,
  ) => { cancel: () => void; resume: (nodeId: string) => void };
} {
  return {
    execute(nodes, edges, onStatusChange, onRunStatus) {
      let cancelled = false;
      const pauseResolvers = new Map<string, () => void>();

      // Topological sort
      const inDeg = new Map<string, number>();
      const adj = new Map<string, string[]>();
      for (const n of nodes) { inDeg.set(n.id, 0); adj.set(n.id, []); }
      for (const e of edges) {
        adj.get(e.sourceNodeId)?.push(e.targetNodeId);
        inDeg.set(e.targetNodeId, (inDeg.get(e.targetNodeId) ?? 0) + 1);
      }
      const queue: string[] = [];
      for (const [id, deg] of inDeg.entries()) { if (deg === 0) queue.push(id); }
      const order: string[] = [];
      while (queue.length > 0) {
        const cur = queue.shift()!;
        order.push(cur);
        for (const nb of adj.get(cur) ?? []) {
          const nd = (inDeg.get(nb) ?? 0) - 1;
          inDeg.set(nb, nd);
          if (nd === 0) queue.push(nb);
        }
      }

      // Run sequentially with timers
      const run = async () => {
        onRunStatus('running');
        for (const nodeId of order) {
          if (cancelled) { onRunStatus('cancelled'); return; }

          const node = nodes.find(n => n.id === nodeId);
          const type = node ? NODE_TYPES.find(t => t.typeId === node.typeId) : undefined;

          onStatusChange(nodeId, 'running');
          await delay(400 + Math.random() * 400);

          if (cancelled) { onRunStatus('cancelled'); return; }

          if (type?.pauses) {
            onStatusChange(nodeId, 'paused');
            onRunStatus('paused');
            // Wait for resume signal
            await new Promise<void>((resolve) => {
              pauseResolvers.set(nodeId, resolve);
            });
            if (cancelled) { onRunStatus('cancelled'); return; }
            onRunStatus('running');
          }

          onStatusChange(nodeId, 'completed');
        }
        onRunStatus('completed');
      };

      run();

      return {
        cancel() {
          cancelled = true;
          // Resolve any waiting pauses
          for (const resolve of pauseResolvers.values()) resolve();
        },
        resume(nodeId: string) {
          const resolve = pauseResolvers.get(nodeId);
          if (resolve) {
            pauseResolvers.delete(nodeId);
            onStatusChange(nodeId, 'completed');
            resolve();
          }
        },
      };
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}



// ============================================================================
// §7b — WORKFLOW INTELLIGENCE LAYER
// ============================================================================
//
// This is the "resident expert" sitting beside the user at the canvas.
// Every visual workflow tool — Orange, KNIME, Alteryx, n8n — treats its
// canvas as a dumb drawing surface: you place nodes, connect wires, and
// you're on your own to understand what's happening. S&R's canvas is
// different because Scholarly is an *education platform*. The canvas
// doesn't just let you build workflows — it teaches you what you're
// building, explains what each node does in context, narrates the data
// flow in plain English, and proactively suggests improvements.
//
// Think of it as the difference between a cockpit with unlabelled
// switches and one with an intelligent co-pilot who says: "That switch
// controls the landing gear. Given our current altitude and speed,
// you'll want to activate it in about 3 minutes. Also, I notice
// you haven't set the flap angle — shall I suggest 15 degrees?"
//
// The intelligence operates at four levels:
//
//   Level 1 — NODE CONTEXT:  What is THIS node doing in THIS workflow?
//   Level 2 — FLOW NARRATIVE: What story does the whole pipeline tell?
//   Level 3 — SUGGESTIONS:    What could be improved or added?
//   Level 4 — EXECUTION:      What's happening right now during a run?
//
// Architecture:
//   WorkflowIntelligence analyses the graph and produces InsightBundles.
//   These bundles are consumed by the UI layer (AI sidebar, node tooltips,
//   suggestion badges). The analysis can run locally (rule-based, instant)
//   or via the Claude API (richer, async). The local engine handles 90%
//   of cases; the API is called for deep explanations and natural language
//   narration.
//
// Competitive edge: No competitor has this. Orange's widgets have static
// help text. KNIME's K-AI builds workflows but doesn't explain them
// contextually. Alteryx has no AI explanation layer at all. S&R's
// intelligence layer is the "unfair advantage" of being education-native.

/**
 * A contextual explanation of a single node within the current workflow.
 * Not a static description of the node type — a dynamic explanation
 * that considers the node's position, connections, configuration,
 * and the overall workflow purpose.
 */
export interface NodeInsight {
  nodeId: string;
  /** What this node is doing in context (1-2 sentences) */
  contextualRole: string;
  /** What data this node receives and from where */
  inputNarrative: string;
  /** What data this node produces and where it goes */
  outputNarrative: string;
  /** Config observations — implications of current settings */
  configNotes: string[];
  /** Pedagogical significance (for Education nodes) */
  pedagogicalContext?: string;
  /** Execution-time commentary */
  executionNote?: string;
}

/**
 * A proactive suggestion for improving the workflow.
 */
export interface WorkflowSuggestion {
  id: string;
  /** Priority: 'info' for nice-to-have, 'tip' for improvements, 'warning' for potential issues */
  level: 'info' | 'tip' | 'warning';
  /** The suggestion message */
  message: string;
  /** Which node(s) this relates to (empty for workflow-level) */
  nodeIds: string[];
  /** If the suggestion can be auto-applied */
  action?: {
    label: string;
    /** Node type to add, or config to change */
    type: 'add_node' | 'change_config' | 'add_edge' | 'remove_edge';
    payload: Record<string, unknown>;
  };
}

/**
 * The complete intelligence output for the current canvas state.
 */
export interface WorkflowInsightBundle {
  /** Plain-English narrative of what the entire workflow does */
  workflowNarrative: string;
  /** Detected purpose/category of the workflow */
  workflowPurpose: string;
  /** Per-node contextual insights */
  nodeInsights: Map<string, NodeInsight>;
  /** Proactive suggestions */
  suggestions: WorkflowSuggestion[];
  /** Timestamp of analysis */
  analysedAt: number;
}

/**
 * Deep knowledge about each node type — the "expert knowledge" that the
 * intelligence layer draws on. This goes far beyond the configSchema
 * descriptions. It contains the kind of understanding a senior data
 * engineer or education specialist would have about each component.
 */
const NODE_DEEP_KNOWLEDGE: Record<string, {
  /** What this node fundamentally does, explained to a learner */
  explanation: string;
  /** Pedagogical significance (for education-relevant nodes) */
  pedagogical?: string;
  /** Common configuration pitfalls */
  pitfalls: string[];
  /** What typically comes before this node */
  typicalUpstream: string[];
  /** What typically comes after this node */
  typicalDownstream: string[];
  /** Analogies that help explain the concept */
  analogy?: string;
}> = {
  'sr:source:platform-export': {
    explanation: 'Connects to an external platform (like Squarespace or WordPress) and extracts all content — pages, products, media, metadata. This is the starting point for bringing external content into Scholarly.',
    pitfalls: [
      'API rate limits may throttle extraction for large sites (>10,000 items)',
      'Without an API key configured, only public content is accessible',
      'Media files (images, videos) are referenced by URL but not downloaded unless explicitly configured',
    ],
    typicalUpstream: [],
    typicalDownstream: ['sr:source:cdc-extract', 'sr:transform:filter'],
    analogy: 'Think of this as a moving truck arriving at the old house — it packs up everything and loads it for transport.',
  },
  'sr:source:cdc-extract': {
    explanation: 'Writes incoming data into the Data Lake\'s Bronze zone using Change Data Capture. The Bronze zone stores raw, unmodified data — a faithful copy of the source. CDC means only changed items are written on subsequent runs, making re-runs efficient.',
    pitfalls: [
      'Without a deduplicate key, repeated runs create duplicate records',
      'Large batch sizes (>5000) increase memory usage but reduce API calls',
      'The target table is created automatically if it doesn\'t exist',
    ],
    typicalUpstream: ['sr:source:platform-export', 'sr:source:api-read'],
    typicalDownstream: ['sr:transform:content-transform', 'sr:transform:quality-audit'],
    analogy: 'The warehouse receiving dock — everything that arrives gets logged and stored exactly as it came, with a timestamp and tracking number.',
  },
  'sr:source:health-monitor': {
    explanation: 'Probes a list of HTTP endpoints to verify they\'re responding correctly. Returns a health report with response times, status codes, and pass/fail for each endpoint. Typically used after deployments or infrastructure changes to confirm everything is working.',
    pitfalls: [
      'Default timeout of 5000ms may be too short for cold-start services',
      'Checking too many endpoints sequentially can make the node slow — consider parallel checks',
    ],
    typicalUpstream: ['sr:action:infrastructure-cutover', 'sr:action:service-import'],
    typicalDownstream: ['sr:action:notification', 'sr:action:webhook'],
    analogy: 'The post-surgery vital signs check — systematically verifying every system is functioning after a procedure.',
  },
  'sr:source:data-lake-read': {
    explanation: 'Reads data from the Data Lake, which is organised in three zones: Bronze (raw data), Silver (cleaned and validated), and Gold (business-ready, modelled for analysis). The Gold zone contains fact and dimension tables optimised for analytics queries.',
    pedagogical: 'When reading learner data from the Gold zone, you\'re accessing pre-computed metrics like mastery scores, reading fluency rates, and engagement indices — these have already been through quality checks and are reliable for educational analysis.',
    pitfalls: [
      'Reading from Bronze gives raw data that hasn\'t been quality-checked yet',
      'A row limit of 10,000 may miss data in large tenants — increase for comprehensive analysis',
      'Complex filters in JSON format can be error-prone — test with a small limit first',
    ],
    typicalUpstream: [],
    typicalDownstream: ['sr:transform:filter', 'sr:transform:aggregate', 'sr:edu:at-risk', 'sr:vis:chart'],
    analogy: 'Selecting books from a well-organised library: Bronze is the unsorted donation pile, Silver is the catalogued shelf, Gold is the curated reading list.',
  },
  'sr:source:api-read': {
    explanation: 'Makes an HTTP request to any external REST API and captures the response as tabular data. Useful for pulling in data from services that aren\'t directly integrated with the Scholarly Data Lake.',
    pitfalls: [
      'Authentication headers must be configured manually',
      'Non-JSON responses will fail parsing — ensure the API returns JSON',
      'No automatic pagination — large datasets may require multiple nodes with offset parameters',
    ],
    typicalUpstream: [],
    typicalDownstream: ['sr:source:cdc-extract', 'sr:transform:filter'],
  },
  'sr:source:nats-subscribe': {
    explanation: 'Subscribes to a NATS message stream and collects events within a time window. NATS is the platform\'s real-time event backbone — every phonics session, every assessment, every login generates NATS events. This node captures them for analysis.',
    pedagogical: 'Subscribing to "scholarly.phonics.session.*" captures every phonics reading session in real time. This enables live dashboards showing which students are practising right now, and what GPCs they\'re working on.',
    pitfalls: [
      'A 60-second window captures a snapshot — for comprehensive analysis, use Data Lake Read instead',
      'High-volume subjects (like session events) can produce thousands of messages per minute',
    ],
    typicalUpstream: [],
    typicalDownstream: ['sr:transform:aggregate', 'sr:vis:chart', 'sr:edu:bkt-update'],
  },
  'sr:transform:content-transform': {
    explanation: 'Converts content from an external platform\'s format into Scholarly\'s internal data model. This handles field mapping, data type conversion, rich text normalisation, and media URL resolution. The output is ready for import into Scholarly services.',
    pitfalls: [
      'Custom mappings require familiarity with both source and target schemas',
      'Metadata preservation increases storage but enables audit trails',
    ],
    typicalUpstream: ['sr:source:cdc-extract'],
    typicalDownstream: ['sr:action:human-review', 'sr:transform:quality-audit'],
    analogy: 'The translation service at an international conference — converting content from one language (platform format) to another (Scholarly format) while preserving meaning.',
  },
  'sr:transform:quality-audit': {
    explanation: 'Runs a battery of data quality checks: null rate analysis, schema drift detection, outlier identification, range validation, and referential integrity. Produces a quality report with pass/fail status for each check and an overall quality score.',
    pedagogical: 'For educational data, quality checks include pedagogically meaningful validations: mastery probabilities must be between 0 and 1, reading accuracy can\'t exceed 100%, WCPM scores should be age-appropriate (a 5-year-old reading at 200 WCPM would flag as suspicious).',
    pitfalls: [
      'A threshold of 0.95 means 95% of checks must pass — this is strict and may reject data with minor issues',
      'Setting failOnError=true will halt the workflow if quality fails — useful for production, restrictive for exploration',
    ],
    typicalUpstream: ['sr:source:cdc-extract', 'sr:source:data-lake-read'],
    typicalDownstream: ['sr:transform:filter', 'sr:action:human-review', 'sr:action:notification'],
    analogy: 'The quality inspector on a production line — checking every item against specifications before it moves to the next station.',
  },
  'sr:transform:filter': {
    explanation: 'Evaluates a JavaScript expression against each row and splits the data into two streams: rows that pass the expression go to the "Passed" output, rows that fail go to the "Rejected" output. Both outputs are available for downstream processing.',
    pitfalls: [
      'Complex expressions can be hard to debug — test with a small dataset first',
      'The rejected output is often overlooked but valuable for understanding what was excluded',
    ],
    typicalUpstream: ['sr:source:data-lake-read', 'sr:transform:quality-audit'],
    typicalDownstream: ['sr:vis:chart', 'sr:vis:table', 'sr:transform:aggregate'],
    analogy: 'A sorting machine on a conveyor belt — items that meet the criteria go right, items that don\'t go left. Nothing is discarded; everything is available.',
  },
  'sr:transform:aggregate': {
    explanation: 'Groups rows by one or more columns and applies aggregate functions (sum, average, count, min, max) to produce summary statistics. The output has one row per unique combination of group-by values.',
    pedagogical: 'Aggregating by learnerId and phonicsPhase with average mastery shows each student\'s overall progress per phase — a common starting point for identifying who needs support and where.',
    pitfalls: [
      'Grouping by too many columns produces results nearly as large as the input',
      'Averages can hide bimodal distributions — consider using both average and count',
    ],
    typicalUpstream: ['sr:source:data-lake-read', 'sr:transform:filter'],
    typicalDownstream: ['sr:vis:chart', 'sr:vis:heatmap', 'sr:edu:at-risk'],
  },
  'sr:transform:join': {
    explanation: 'Combines two tables by matching rows on a key column. Inner join keeps only matching rows. Left join keeps all rows from the left table (with nulls for non-matches). Full outer join keeps everything from both sides.',
    pitfalls: [
      'Joining on non-unique keys produces row multiplication (cartesian product risk)',
      'Mismatched key types (string vs number) will produce zero matches',
    ],
    typicalUpstream: ['sr:source:data-lake-read'],
    typicalDownstream: ['sr:transform:aggregate', 'sr:vis:table'],
    analogy: 'Matching guest lists from two events — inner join finds people who attended both, left join finds everyone from the first event (noting who also went to the second).',
  },
  'sr:transform:formula': {
    explanation: 'Adds new calculated columns to each row using JavaScript expressions. The original columns are preserved; new columns are appended. Useful for computing derived metrics, normalising values, or creating labels.',
    pedagogical: 'Common education formulas: mastery percentage (row.correct / row.total * 100), words per minute (row.wordsRead / row.durationMinutes), engagement score composites.',
    pitfalls: [
      'Division by zero will produce NaN or Infinity — add checks like (row.total > 0 ? row.correct/row.total : 0)',
      'String concatenation expressions must handle null values',
    ],
    typicalUpstream: ['sr:source:data-lake-read', 'sr:transform:filter'],
    typicalDownstream: ['sr:vis:chart', 'sr:transform:aggregate', 'sr:edu:at-risk'],
  },
  'sr:vis:chart': {
    explanation: 'Renders an interactive chart (line, bar, scatter, or area) from tabular data. Users can hover for tooltips, click to select data points, and zoom into regions. Charts participate in brushable linking — selecting points in one chart highlights corresponding data across all connected visualisations.',
    pedagogical: 'Line charts excel at showing mastery progression over time. Scatter plots reveal correlations (e.g., practice frequency vs. accuracy). Bar charts compare groups (e.g., average mastery by phonics phase).',
    pitfalls: [
      'More than 5 Y-axis columns creates a cluttered chart — consider multiple charts instead',
      'Time-series data should have X-axis sorted chronologically',
    ],
    typicalUpstream: ['sr:transform:aggregate', 'sr:transform:filter', 'sr:source:data-lake-read'],
    typicalDownstream: [],
  },
  'sr:vis:table': {
    explanation: 'Displays data in a sortable, filterable, paginated table. Users can click column headers to sort, use the search bar to filter, and navigate pages. Tables are the "microscope" of the canvas — they show the actual data rows that charts summarise.',
    pitfalls: [
      'Very wide tables (>20 columns) become hard to read — consider filtering columns',
    ],
    typicalUpstream: ['sr:source:data-lake-read', 'sr:transform:filter'],
    typicalDownstream: [],
  },
  'sr:vis:heatmap': {
    explanation: 'Renders a colour-coded matrix where rows and columns represent two dimensions (e.g., learners and skills) and colour intensity represents a value (e.g., mastery level). Green typically means mastered; red means struggling.',
    pedagogical: 'A mastery heatmap with learners on rows and GPCs on columns is the single most powerful view for a teacher — at a glance, you can see which students need help and with which specific phonics skills. Dark red cells are intervention targets.',
    pitfalls: [
      'Large heatmaps (>100 learners × >50 GPCs) need aggregation or filtering first',
      'Ensure the value column is normalised (0-1) for consistent colour mapping',
    ],
    typicalUpstream: ['sr:edu:bkt-update', 'sr:transform:aggregate', 'sr:source:data-lake-read'],
    typicalDownstream: [],
    analogy: 'A thermal camera image of the classroom — hot spots (green) show where learning is happening; cold spots (red) show where it isn\'t.',
  },
  'sr:model:train': {
    explanation: 'Trains a machine learning classification model on labelled data. Auto-Select mode tries multiple algorithms and picks the best performer. The output is a trained model object that can be used by Predict nodes. A portion of data is held out for evaluation to prevent overfitting.',
    pedagogical: 'In education contexts, common classification targets include: at-risk status (binary), engagement level (low/medium/high), recommended intervention type, or predicted phonics phase progression rate.',
    pitfalls: [
      'Training on fewer than 100 rows typically produces unreliable models',
      'A test split of 0.2 means 20% of data is held out — with small datasets this may be too much',
      'Auto-Select is slower but usually finds a better model than manual selection',
    ],
    typicalUpstream: ['sr:source:data-lake-read', 'sr:transform:formula'],
    typicalDownstream: ['sr:model:predict'],
  },
  'sr:model:predict': {
    explanation: 'Applies a trained model to new data to generate predictions. Each row gets a predicted label and (optionally) a confidence score. The confidence score indicates how certain the model is — values below 0.6 should be treated with caution.',
    pitfalls: [
      'Predictions on data with different feature distributions than training data will be unreliable',
      'Always check confidence scores before acting on predictions',
    ],
    typicalUpstream: ['sr:model:train'],
    typicalDownstream: ['sr:transform:filter', 'sr:vis:table', 'sr:action:notification'],
  },
  'sr:action:human-review': {
    explanation: 'Pauses the workflow and presents items to a human reviewer for approval. This is the "human-in-the-loop" checkpoint — the workflow will not proceed past this point until a person with the right role has reviewed and approved the data. Items can be approved, rejected, or modified.',
    pitfalls: [
      'Forgetting to configure reviewer roles means only admins can approve',
      'Bulk mode is faster but item-by-item gives more control over individual decisions',
      'A clear pause message helps the reviewer understand what they\'re reviewing and why',
    ],
    typicalUpstream: ['sr:transform:content-transform', 'sr:transform:quality-audit', 'sr:model:predict'],
    typicalDownstream: ['sr:action:service-import', 'sr:action:notification'],
    analogy: 'The editorial desk at a newspaper — stories (data) arrive from reporters (upstream nodes), editors review and approve them, then they go to print (downstream nodes). The press doesn\'t run until the editor says "go."',
  },
  'sr:action:service-import': {
    explanation: 'Takes approved data and writes it into Scholarly\'s production services — the CMS for content, the Storefront for products, the Auth service for user accounts. This is the final "commit" step that makes data live in the platform.',
    pitfalls: [
      'Dry run mode validates everything without writing — always test this first',
      'Import to multiple services happens sequentially; failure in one stops the rest',
      'Large imports (>1000 items) should use smaller batch sizes to avoid timeouts',
    ],
    typicalUpstream: ['sr:action:human-review'],
    typicalDownstream: ['sr:action:infrastructure-cutover', 'sr:action:notification'],
  },
  'sr:action:infrastructure-cutover': {
    explanation: 'Handles DNS and SSL certificate changes to point a domain to Scholarly\'s infrastructure. This is a critical, irreversible-ish operation: once DNS propagates, users will see the new site. The rollback window defines how long the old configuration is preserved for emergency revert.',
    pitfalls: [
      'DNS propagation takes 15 minutes to 48 hours — the cutover isn\'t instant',
      'Ensure SSL certificates are provisioned before cutover to avoid downtime',
      'A 60-minute rollback window is minimum recommended; 24 hours is safer for production',
    ],
    typicalUpstream: ['sr:action:service-import'],
    typicalDownstream: ['sr:source:health-monitor'],
    analogy: 'Changing the postal address on a building — mail (traffic) gradually redirects to the new address, and you keep a forwarding arrangement (rollback) for a while just in case.',
  },
  'sr:action:webhook': {
    explanation: 'Sends an HTTP request to an external URL with workflow data as the payload. Used to notify external systems when something happens in the workflow — for example, alerting a Slack channel when a migration completes, or triggering a CI/CD pipeline after data import.',
    pitfalls: [
      'Webhook endpoints must be HTTPS for security',
      'If the endpoint is down, the webhook will fail — consider adding retry logic upstream',
    ],
    typicalUpstream: ['sr:action:service-import', 'sr:source:health-monitor'],
    typicalDownstream: [],
  },
  'sr:action:notification': {
    explanation: 'Sends a notification through Scholarly\'s messaging infrastructure — email, push notification, or in-app alert. Uses pre-defined templates with dynamic data substitution.',
    pedagogical: 'In education workflows, notifications are often the final step: alerting a teacher when at-risk students are identified, notifying parents about reading milestones, or informing administrators about data quality issues.',
    pitfalls: [
      'The "all channels" option sends via every channel — use sparingly to avoid notification fatigue',
      'Template IDs must match existing templates in the Notification Service',
    ],
    typicalUpstream: ['sr:edu:at-risk', 'sr:action:service-import', 'sr:source:health-monitor'],
    typicalDownstream: [],
  },
  'sr:edu:bkt-update': {
    explanation: 'Updates Bayesian Knowledge Tracing mastery estimates based on new assessment responses. BKT is a probabilistic model that estimates the probability a student has truly "mastered" a skill based on their pattern of correct and incorrect responses. Each correct response increases the mastery estimate; each incorrect response decreases it — but the magnitude depends on the model\'s parameters (guess rate, slip rate, learning rate).',
    pedagogical: 'BKT is the mathematical backbone of adaptive learning. A mastery probability of 0.95 means we\'re 95% confident the student has learned the skill. The federated variant shares anonymised learning patterns across students, so a new student benefits from what the system has learned about how other students acquire the same skill. The prior mastery of 0.1 (10%) assumes students start with minimal knowledge of a new GPC — this is conservative and appropriate for phonics where each grapheme-phoneme correspondence is genuinely new.',
    pitfalls: [
      'Federated BKT requires sufficient data across students to be accurate — fewer than 20 learners may produce noisy estimates',
      'A prior mastery of 0.5 would assume students already know half the material — rarely appropriate for new GPCs',
      'BKT assumes binary mastery (known/unknown) — it doesn\'t model partial knowledge well',
    ],
    typicalUpstream: ['sr:source:data-lake-read', 'sr:source:nats-subscribe'],
    typicalDownstream: ['sr:edu:at-risk', 'sr:vis:heatmap', 'sr:edu:phonics-progression'],
    analogy: 'A tutor\'s evolving mental model of a student: "She got the last three \'sh\' words right — I\'m now quite confident she knows the \'sh\' sound. But she stumbled on \'ch\' twice — I think she needs more practice there."',
  },
  'sr:edu:at-risk': {
    explanation: 'Identifies learners who may be falling behind by combining multiple signals: mastery decay (skills being forgotten over time), engagement decline (fewer sessions, shorter duration), WCPM regression (reading speed decreasing), and assessment accuracy drops. Each signal contributes to a composite risk score. Students above the risk threshold are flagged with specific contributing factors.',
    pedagogical: 'Early intervention is the most impactful thing a teacher can do. Research consistently shows that catching a struggling reader at age 5-6 and providing targeted support has a much higher success rate than intervention at age 8-9. This node operationalises that research by automatically monitoring every student continuously — something no teacher could do manually for a class of 25+ children. The contributing factors tell the teacher not just WHO needs help but WHAT KIND of help they need.',
    pitfalls: [
      'A 14-day lookback captures gradual decline but misses sudden drops — use 7 days for sensitive detection',
      'A risk threshold of 0.3 catches about 15-20% of a typical class — lower it to cast a wider net, raise it to focus on critical cases',
      'Including contributing factors adds processing time but makes the output actionable',
    ],
    typicalUpstream: ['sr:edu:bkt-update', 'sr:source:data-lake-read'],
    typicalDownstream: ['sr:vis:heatmap', 'sr:action:notification', 'sr:transform:filter'],
    analogy: 'An early warning system in a hospital — monitoring vital signs (mastery, engagement, fluency) across all patients (students), sounding an alarm when any indicator drops below safe levels, and telling the doctor exactly which vital signs are concerning.',
  },
  'sr:edu:phonics-progression': {
    explanation: 'Analyses where each learner sits on the phonics progression pathway (Letters and Sounds Phases 1-6 or equivalent SSP framework). Produces a progression report showing which phase each learner is working in, which GPCs are mastered within that phase, and recommendations for when to advance to the next phase. Also identifies GPCs that are blocking progression.',
    pedagogical: 'Phonics progression is not linear — children often have isolated gaps in earlier phases while excelling in current-phase skills. This node identifies those gaps precisely. For example, a child in Phase 4 might still struggle with the Phase 2 "ck" grapheme. The recommendation would be to consolidate "ck" through targeted practice before advancing Phase 4 blends, rather than going back to the start of Phase 2.',
    pitfalls: [
      'The Letters and Sounds framework has a different GPC sequence than SSP programmes — ensure the right framework is selected for your curriculum',
      'Target phase should match the expected end-of-year outcome for the age group',
    ],
    typicalUpstream: ['sr:edu:bkt-update'],
    typicalDownstream: ['sr:vis:chart', 'sr:vis:heatmap', 'sr:action:notification'],
  },
  'sr:edu:curriculum-check': {
    explanation: 'Validates that learning data, assessment items, or content is aligned with a specific curriculum standard. Checks scope coverage (are all required outcomes addressed?), sequence adherence (is content ordered appropriately for developmental level?), and age-appropriateness (does the difficulty match the year level?).',
    pedagogical: 'Curriculum alignment is a regulatory requirement for most education jurisdictions. ACARA (Australia), the National Curriculum (UK via EYFS), and IB PYP each define specific learning outcomes by age/year. This node ensures that the platform\'s assessments and content actually teach what they claim to teach — an audit function that gives schools confidence in the platform.',
    pitfalls: [
      'Mixing curricula in a single check produces meaningless results — check one at a time',
      'Year level naming varies by jurisdiction (Foundation, Reception, Kindergarten all mean ages 4-5)',
    ],
    typicalUpstream: ['sr:source:data-lake-read'],
    typicalDownstream: ['sr:vis:table', 'sr:action:notification'],
  },
};


// ── Workflow Intelligence Engine ─────────────────────────────────────────

/**
 * The WorkflowIntelligence engine analyses the canvas graph and produces
 * contextual insights, narratives, and suggestions. This is the "brain"
 * of the AI-aware canvas.
 *
 * The engine operates in two modes:
 *   - LOCAL: Rule-based analysis using NODE_DEEP_KNOWLEDGE. Instant,
 *     works offline, handles 90% of cases.
 *   - API:   Calls Claude for rich natural language narration and
 *     deeper contextual understanding. Async, requires connectivity.
 */
export class WorkflowIntelligence {
  private lastAnalysis: WorkflowInsightBundle | null = null;
  private apiBaseUrl: string | null;
  private apiHeaders: Record<string, string>;

  constructor(apiConfig?: { baseUrl: string; authToken?: string }) {
    this.apiBaseUrl = apiConfig?.baseUrl ?? null;
    this.apiHeaders = {
      'Content-Type': 'application/json',
      ...(apiConfig?.authToken ? { Authorization: `Bearer ${apiConfig.authToken}` } : {}),
    };
  }

  /**
   * Analyse the current canvas state and produce an insight bundle.
   * This is the main entry point called whenever the graph changes.
   */
  analyse(nodes: CanvasNode[], edges: CanvasEdge[], runState?: RunState | null): WorkflowInsightBundle {
    const nodeInsights = new Map<string, NodeInsight>();
    const suggestions: WorkflowSuggestion[] = [];

    // Build adjacency for flow analysis
    const upstream = new Map<string, Array<{ nodeId: string; portId: string; sourcePortId: string }>>();
    const downstream = new Map<string, Array<{ nodeId: string; portId: string; sourcePortId: string }>>();
    for (const node of nodes) {
      upstream.set(node.id, []);
      downstream.set(node.id, []);
    }
    for (const edge of edges) {
      upstream.get(edge.targetNodeId)?.push({
        nodeId: edge.sourceNodeId,
        portId: edge.targetPortId,
        sourcePortId: edge.sourcePortId,
      });
      downstream.get(edge.sourceNodeId)?.push({
        nodeId: edge.targetNodeId,
        portId: edge.sourcePortId,
        sourcePortId: edge.targetPortId,
      });
    }

    // ── Per-Node Analysis ─────────────────────────────────────────────
    for (const node of nodes) {
      const type = NODE_TYPES.find(t => t.typeId === node.typeId);
      const knowledge = NODE_DEEP_KNOWLEDGE[node.typeId];
      if (!type) continue;

      const upNodes = upstream.get(node.id) ?? [];
      const downNodes = downstream.get(node.id) ?? [];

      // Build input narrative
      let inputNarrative = '';
      if (upNodes.length === 0) {
        inputNarrative = type.inputs.length === 0
          ? 'This is a source node — it generates data rather than receiving it.'
          : 'No inputs connected yet. Connect upstream nodes to provide data.';
      } else {
        const sources = upNodes.map(u => {
          const srcNode = nodes.find(n => n.id === u.nodeId);
          const srcType = srcNode ? NODE_TYPES.find(t => t.typeId === srcNode.typeId) : null;
          return srcType?.label ?? 'Unknown';
        });
        inputNarrative = `Receives data from ${sources.join(' and ')}.`;
      }

      // Build output narrative
      let outputNarrative = '';
      if (downNodes.length === 0 && type.outputs.length > 0) {
        outputNarrative = 'Outputs are not connected to any downstream nodes yet.';
      } else if (type.outputs.length === 0) {
        outputNarrative = 'This is a terminal node — it consumes data without producing output (visualisation or side-effect).';
      } else {
        const targets = downNodes.map(d => {
          const tgtNode = nodes.find(n => n.id === d.nodeId);
          const tgtType = tgtNode ? NODE_TYPES.find(t => t.typeId === tgtNode.typeId) : null;
          return tgtType?.label ?? 'Unknown';
        });
        outputNarrative = `Sends output to ${targets.join(' and ')}.`;
      }

      // Build contextual role
      const contextualRole = this.buildContextualRole(node, type, knowledge, upNodes, downNodes, nodes);

      // Config analysis
      const configNotes = this.analyseConfig(node, type, knowledge);

      // Execution note
      let executionNote: string | undefined;
      if (runState) {
        const nodeStatus = runState.nodeStates[node.id];
        executionNote = this.getExecutionNote(node, type, nodeStatus, knowledge);
      }

      nodeInsights.set(node.id, {
        nodeId: node.id,
        contextualRole,
        inputNarrative,
        outputNarrative,
        configNotes,
        pedagogicalContext: knowledge?.pedagogical,
        executionNote,
      });
    }

    // ── Workflow-Level Suggestions ─────────────────────────────────────
    this.generateSuggestions(nodes, edges, upstream, downstream, suggestions);

    // ── Workflow Narrative ─────────────────────────────────────────────
    const workflowPurpose = this.detectWorkflowPurpose(nodes);
    const workflowNarrative = this.buildWorkflowNarrative(nodes, edges, upstream, workflowPurpose);

    this.lastAnalysis = {
      workflowNarrative,
      workflowPurpose,
      nodeInsights,
      suggestions,
      analysedAt: Date.now(),
    };

    return this.lastAnalysis;
  }

  /**
   * Request a richer AI-generated narrative via the Claude API.
   * Falls back to local analysis if the API is unavailable.
   */
  async analyseWithAI(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
  ): Promise<{ narrative: string; suggestions: string[] }> {
    if (!this.apiBaseUrl) {
      const local = this.analyse(nodes, edges);
      return { narrative: local.workflowNarrative, suggestions: local.suggestions.map(s => s.message) };
    }

    // Build a structured context for Claude
    const context = this.buildAIContext(nodes, edges);

    try {
      const response = await fetch(`${this.apiBaseUrl}/api/v1/ai/workflow-explain`, {
        method: 'POST',
        headers: this.apiHeaders,
        body: JSON.stringify({
          context,
          prompt: 'Explain this workflow in plain English suitable for an educator. Describe what the workflow does, what data flows through it, and what insights it produces. Also suggest any improvements.',
        }),
      });

      if (!response.ok) {
        // Fall back to local
        const local = this.analyse(nodes, edges);
        return { narrative: local.workflowNarrative, suggestions: local.suggestions.map(s => s.message) };
      }

      return response.json();
    } catch {
      const local = this.analyse(nodes, edges);
      return { narrative: local.workflowNarrative, suggestions: local.suggestions.map(s => s.message) };
    }
  }

  // ── Private Analysis Methods ────────────────────────────────────────

  private buildContextualRole(
    node: CanvasNode,
    type: CanvasNodeType,
    knowledge: (typeof NODE_DEEP_KNOWLEDGE)[string] | undefined,
    upNodes: Array<{ nodeId: string }>,
    downNodes: Array<{ nodeId: string }>,
    allNodes: CanvasNode[],
  ): string {
    if (!knowledge) return type.description;

    // Determine position in pipeline
    const isFirst = upNodes.length === 0 && type.inputs.length === 0;
    const isLast = downNodes.length === 0;
    const position = isFirst ? 'starting point' : isLast ? 'final step' : 'intermediate step';

    // Get upstream/downstream labels for context
    const upLabels = upNodes.map(u => {
      const n = allNodes.find(a => a.id === u.nodeId);
      return n ? NODE_TYPES.find(t => t.typeId === n.typeId)?.label ?? '' : '';
    }).filter(Boolean);

    const downLabels = downNodes.map(d => {
      const n = allNodes.find(a => a.id === d.nodeId);
      return n ? NODE_TYPES.find(t => t.typeId === n.typeId)?.label ?? '' : '';
    }).filter(Boolean);

    let role = `As the ${position} in this workflow, ${type.label}`;

    if (isFirst) {
      role += ` initiates the pipeline by ${knowledge.explanation.split('.')[0]?.toLowerCase() ?? 'providing data'}.`;
    } else if (isLast) {
      role += ` concludes the pipeline${upLabels.length > 0 ? ` after receiving data from ${upLabels.join(' and ')}` : ''}.`;
    } else {
      role += ` processes data${upLabels.length > 0 ? ` from ${upLabels.join(' and ')}` : ''}${downLabels.length > 0 ? ` and passes results to ${downLabels.join(' and ')}` : ''}.`;
    }

    return role;
  }

  private analyseConfig(
    node: CanvasNode,
    type: CanvasNodeType,
    knowledge: (typeof NODE_DEEP_KNOWLEDGE)[string] | undefined,
  ): string[] {
    const notes: string[] = [];

    // Check for empty required fields
    for (const [key, def] of Object.entries(type.configSchema)) {
      if (def.required && (node.config[key] === undefined || node.config[key] === '')) {
        notes.push(`⚠ Required field "${def.label}" is not configured.`);
      }
    }

    // Config-specific intelligence
    if (node.typeId === 'sr:transform:quality-audit') {
      const threshold = node.config['threshold'] as number | undefined;
      if (threshold !== undefined && threshold < 0.8) {
        notes.push('Threshold below 0.8 is lenient — some data quality issues may pass uncaught.');
      }
      if (threshold !== undefined && threshold > 0.98) {
        notes.push('Threshold above 0.98 is very strict — even minor data variations will fail the audit.');
      }
    }

    if (node.typeId === 'sr:source:cdc-extract') {
      const batchSize = node.config['batchSize'] as number | undefined;
      if (batchSize !== undefined && batchSize > 5000) {
        notes.push(`Batch size of ${batchSize} is large — memory usage will be high. Consider 500-2000 for most workloads.`);
      }
      if (!node.config['deduplicateBy']) {
        notes.push('No deduplication key set — repeated runs will create duplicate records in the Data Lake.');
      }
    }

    if (node.typeId === 'sr:edu:at-risk') {
      const lookback = node.config['lookbackDays'] as number | undefined;
      if (lookback !== undefined && lookback > 30) {
        notes.push('A lookback period over 30 days may dilute recent trends — struggling students could be missed if their decline is recent.');
      }
      const threshold = node.config['riskThreshold'] as number | undefined;
      if (threshold !== undefined) {
        if (threshold < 0.2) notes.push('Very low risk threshold will flag many students — could cause alert fatigue.');
        if (threshold > 0.5) notes.push('High risk threshold — only severely struggling students will be flagged. Consider lowering for earlier intervention.');
      }
    }

    if (node.typeId === 'sr:edu:bkt-update') {
      const prior = node.config['priorMastery'] as number | undefined;
      if (prior !== undefined && prior > 0.3) {
        notes.push(`Prior mastery of ${prior} assumes students already know ${Math.round(prior * 100)}% of the material before instruction — this is unusually high for new GPCs.`);
      }
    }

    if (node.typeId === 'sr:model:train') {
      const split = node.config['testSplit'] as number | undefined;
      if (split !== undefined && split > 0.4) {
        notes.push('Test split above 40% leaves limited training data — model quality may suffer.');
      }
    }

    if (node.typeId === 'sr:action:infrastructure-cutover') {
      const window = node.config['rollbackWindow'] as number | undefined;
      if (window !== undefined && window < 30) {
        notes.push('Rollback window under 30 minutes is risky — DNS issues may not surface immediately.');
      }
    }

    // Add relevant pitfalls from deep knowledge
    if (knowledge && notes.length === 0) {
      // Only add a general pitfall if no specific config issues found
      if (knowledge.pitfalls.length > 0) {
        notes.push(`💡 ${knowledge.pitfalls[0]}`);
      }
    }

    return notes;
  }

  private getExecutionNote(
    node: CanvasNode,
    type: CanvasNodeType,
    status: NodeRunStatus | undefined,
    knowledge: (typeof NODE_DEEP_KNOWLEDGE)[string] | undefined,
  ): string {
    if (!status) return '';

    switch (status) {
      case 'pending':
        return `Waiting — ${type.label} will execute when upstream nodes complete.`;
      case 'running': {
        const hint = type.executionHint;
        const duration = hint === 'long_running' ? 'This may take several minutes.'
          : hint === 'slow' ? 'This typically takes 10-60 seconds.'
          : 'Processing...';
        return `${type.label} is executing. ${duration}`;
      }
      case 'completed':
        return `${type.label} completed successfully.`;
      case 'failed':
        return `${type.label} encountered an error. Check the execution log for details.`;
      case 'paused':
        if (type.pauses) {
          const msg = node.config['pauseMessage'] as string;
          return msg
            ? `Workflow paused: ${msg}`
            : `${type.label} requires human input before the workflow can continue. Open the review interface to approve or reject items.`;
        }
        return 'Paused — awaiting external input.';
      case 'skipped':
        return `${type.label} was skipped because a dependency was not met.`;
      default:
        return '';
    }
  }

  private detectWorkflowPurpose(nodes: CanvasNode[]): string {
    const typeIds = new Set(nodes.map(n => n.typeId));

    // Migration pattern
    if (typeIds.has('sr:source:platform-export') && typeIds.has('sr:action:service-import')) {
      return 'Platform Migration';
    }

    // Competition pattern
    if (typeIds.has('sr:comp:submission-intake') || typeIds.has('sr:comp:scoring')) {
      return 'Competition Workflow';
    }

    // Education analytics
    if (typeIds.has('sr:edu:bkt-update') || typeIds.has('sr:edu:at-risk') || typeIds.has('sr:edu:phonics-progression')) {
      return 'Education Analytics';
    }

    // ETL / Data Quality
    if (typeIds.has('sr:transform:quality-audit') && typeIds.has('sr:source:data-lake-read')) {
      return 'Data Quality Pipeline';
    }

    // ML pipeline
    if (typeIds.has('sr:model:train') || typeIds.has('sr:model:predict')) {
      return 'Machine Learning Pipeline';
    }

    // Generic analytics
    if (typeIds.has('sr:vis:chart') || typeIds.has('sr:vis:heatmap') || typeIds.has('sr:vis:table')) {
      return 'Data Analytics';
    }

    return 'Custom Workflow';
  }

  private buildWorkflowNarrative(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    upstream: Map<string, Array<{ nodeId: string }>>,
    purpose: string,
  ): string {
    if (nodes.length === 0) {
      return 'Empty canvas. Add nodes from the palette to start building a workflow, or load a recipe for a pre-built pipeline.';
    }

    if (nodes.length === 1) {
      const type = NODE_TYPES.find(t => t.typeId === nodes[0]!.typeId);
      const knowledge = NODE_DEEP_KNOWLEDGE[nodes[0]!.typeId];
      return `This workflow contains a single ${type?.label ?? 'node'}. ${knowledge?.explanation ?? type?.description ?? ''} Connect more nodes to build a pipeline.`;
    }

    // Find root nodes (no incoming edges)
    const roots = nodes.filter(n => (upstream.get(n.id) ?? []).length === 0);
    // Find leaf nodes (no outgoing edges)
    const leaves = nodes.filter(n => {
      return !edges.some(e => e.sourceNodeId === n.id);
    });

    const rootLabels = roots.map(r => NODE_TYPES.find(t => t.typeId === r.typeId)?.label ?? 'Unknown');
    const leafLabels = leaves.map(l => NODE_TYPES.find(t => t.typeId === l.typeId)?.label ?? 'Unknown');

    const hasPause = nodes.some(n => NODE_TYPES.find(t => t.typeId === n.typeId)?.pauses);
    const hasEdu = nodes.some(n => n.typeId.startsWith('sr:edu:'));
    const hasVis = nodes.some(n => n.typeId.startsWith('sr:vis:'));

    let narrative = `This is a ${purpose} workflow with ${nodes.length} steps. `;
    narrative += `It starts at ${rootLabels.join(' and ')} and `;
    narrative += `concludes at ${leafLabels.join(' and ')}. `;

    if (hasPause) {
      const pauseNodes = nodes.filter(n => NODE_TYPES.find(t => t.typeId === n.typeId)?.pauses);
      const pauseLabels = pauseNodes.map(p => NODE_TYPES.find(t => t.typeId === p.typeId)?.label);
      narrative += `The workflow includes ${pauseNodes.length} human checkpoint${pauseNodes.length > 1 ? 's' : ''} at ${pauseLabels.join(' and ')} — execution will pause for manual review at ${pauseNodes.length > 1 ? 'these points' : 'this point'}. `;
    }

    if (hasEdu) {
      narrative += 'Education intelligence nodes are present, providing pedagogically-aware analysis of learner data. ';
    }

    if (hasVis) {
      narrative += 'Visualisation nodes will render interactive charts or tables for data exploration. ';
    }

    return narrative;
  }

  private generateSuggestions(
    nodes: CanvasNode[],
    edges: CanvasEdge[],
    upstream: Map<string, Array<{ nodeId: string }>>,
    downstream: Map<string, Array<{ nodeId: string }>>,
    suggestions: WorkflowSuggestion[],
  ): void {
    // Unconnected output ports that could be useful
    for (const node of nodes) {
      const type = NODE_TYPES.find(t => t.typeId === node.typeId);
      if (!type) continue;

      for (const output of type.outputs) {
        const connected = edges.some(
          e => e.sourceNodeId === node.id && e.sourcePortId === output.portId,
        );
        if (!connected) {
          // Suggest connections for commonly-useful unconnected ports
          if (node.typeId === 'sr:transform:filter' && output.portId === 'rejected') {
            suggestions.push({
              id: generateId('sug'),
              level: 'tip',
              message: `The "Rejected" output of ${type.label} is unconnected. Consider adding a Data Table node to inspect which rows were filtered out — this helps verify your filter expression is working as intended.`,
              nodeIds: [node.id],
              action: { label: 'Add Data Table', type: 'add_node', payload: { typeId: 'sr:vis:table', connectFrom: { nodeId: node.id, portId: 'rejected' } } },
            });
          }
        }
      }
    }

    // Workflow doesn't end with a notification
    const hasNotification = nodes.some(n => n.typeId === 'sr:action:notification' || n.typeId === 'sr:action:webhook');
    if (nodes.length >= 3 && !hasNotification) {
      suggestions.push({
        id: generateId('sug'),
        level: 'info',
        message: 'This workflow has no notification step. Consider adding a Notification or Webhook node so stakeholders are alerted when execution completes.',
        nodeIds: [],
      });
    }

    // Education nodes without visualisation
    const hasEduNode = nodes.some(n => n.typeId.startsWith('sr:edu:'));
    const hasVisNode = nodes.some(n => n.typeId.startsWith('sr:vis:'));
    if (hasEduNode && !hasVisNode) {
      suggestions.push({
        id: generateId('sug'),
        level: 'tip',
        message: 'Your workflow analyses education data but has no visualisation. Consider adding a Mastery Heatmap or Chart to make the analysis results visible and actionable for teachers.',
        nodeIds: [],
      });
    }

    // Data Lake Read without quality check
    const hasDataRead = nodes.some(n => n.typeId === 'sr:source:data-lake-read');
    const hasQualityCheck = nodes.some(n => n.typeId === 'sr:transform:quality-audit');
    if (hasDataRead && !hasQualityCheck && nodes.length >= 3) {
      suggestions.push({
        id: generateId('sug'),
        level: 'info',
        message: 'Reading from the Data Lake without a Quality Audit step. For production workflows, adding a quality gate ensures data meets expected standards before downstream processing.',
        nodeIds: [],
      });
    }

    // Model training without sufficient data awareness
    const trainNode = nodes.find(n => n.typeId === 'sr:model:train');
    if (trainNode) {
      const hasFilter = nodes.some(n => n.typeId === 'sr:transform:filter');
      if (!hasFilter) {
        suggestions.push({
          id: generateId('sug'),
          level: 'tip',
          message: 'Training a model directly on raw data. Consider adding a Filter node upstream to remove incomplete records or outliers — this typically improves model accuracy.',
          nodeIds: [trainNode.id],
        });
      }
    }

    // At-Risk without downstream action
    const atRiskNode = nodes.find(n => n.typeId === 'sr:edu:at-risk');
    if (atRiskNode) {
      const atRiskDown = downstream.get(atRiskNode.id) ?? [];
      const hasActionDown = atRiskDown.some(d => {
        const n = nodes.find(nn => nn.id === d.nodeId);
        return n && (n.typeId === 'sr:action:notification' || n.typeId === 'sr:action:human-review');
      });
      if (!hasActionDown) {
        suggestions.push({
          id: generateId('sug'),
          level: 'tip',
          message: 'At-Risk Detection identifies struggling students, but no action node follows it. Consider adding a Notification to alert teachers, or a Human Review for a guided triage process.',
          nodeIds: [atRiskNode.id],
        });
      }
    }
  }

  /**
   * Build a structured context object for AI API calls.
   * This describes the workflow in a format Claude can reason about.
   */
  private buildAIContext(nodes: CanvasNode[], edges: CanvasEdge[]): Record<string, unknown> {
    return {
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes: nodes.map(n => {
        const type = NODE_TYPES.find(t => t.typeId === n.typeId);
        return {
          id: n.id,
          typeId: n.typeId,
          label: type?.label ?? n.typeId,
          category: type?.category ?? 'UNKNOWN',
          description: type?.description ?? '',
          config: n.config,
          pauses: type?.pauses ?? false,
        };
      }),
      edges: edges.map(e => ({
        from: e.sourceNodeId,
        fromPort: e.sourcePortId,
        to: e.targetNodeId,
        toPort: e.targetPortId,
      })),
      detectedPurpose: this.detectWorkflowPurpose(nodes),
    };
  }

  /**
   * Get the deep knowledge entry for a node type.
   * Used by the UI to show expanded explanations.
   */
  getDeepKnowledge(typeId: string): (typeof NODE_DEEP_KNOWLEDGE)[string] | undefined {
    return NODE_DEEP_KNOWLEDGE[typeId];
  }

  /**
   * Get the cached analysis (avoids re-computation on every render).
   */
  get cachedAnalysis(): WorkflowInsightBundle | null {
    return this.lastAnalysis;
  }
}


// ============================================================================
// §8 — NODE CONFIG FORMS
// ============================================================================
//
// Dynamic form renderer — reads configSchema at runtime and generates
// appropriate input widgets. Adding a new node type with new config
// fields requires zero UI code changes.

/**
 * Build default config values from a node type's configSchema.
 */
export function buildDefaultConfig(type: CanvasNodeType): Record<string, unknown> {
  const config: Record<string, unknown> = {};
  for (const [key, def] of Object.entries(type.configSchema)) {
    if (def.defaultValue !== undefined) {
      config[key] = def.defaultValue;
    }
  }
  return config;
}


// ============================================================================
// §9 — MAIN REACT COMPONENT
// ============================================================================
//
// Layout:
//   ┌──────────┬──────────────────────────────────┬─────────────┐
//   │ Palette   │         Toolbar                   │             │
//   │ (nodes)   ├──────────────────────────────────┤  Inspector  │
//   │           │                                   │  + AI Ctxt  │
//   │           │       SVG Canvas                  │             │
//   │           │  (infinite pan/zoom workspace)    │             │
//   │           │                                   │             │
//   │           ├──────────┬───────────────────────┤             │
//   │           │ Minimap  │ AI Narration bar       │             │
//   │           └──────────┴───────────────────────┘             │
//   └──────────┴──────────────────────────────────┴─────────────┘
//
// The AI Intelligence Layer surfaces in three places:
//   1. Right panel: contextual explanation of selected node
//   2. Bottom bar: workflow narrative + suggestions
//   3. Node tooltips: hover for AI-generated context

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
  Database, Shuffle, BarChart3, Brain, Zap, GraduationCap,
  Loader, CheckCircle, XCircle, Pause, Circle, Ban,
  Undo2, Redo2, Save, Trash2, X, Maximize2, Minimize2,
  Play, Square, LayoutGrid, ClipboardList, ChevronDown,
  ChevronRight, ChevronLeft, Maximize, Search as SearchIcon,
  type LucideIcon,
} from 'lucide-react';

// ── Brand design tokens (from scholarly-ui.css) ─────────────────────────
const BRAND = {
  primary:    '#1e9df1',
  background: '#ffffff',
  foreground: '#0f1419',
  card:       '#f7f8f8',
  border:     '#e1eaef',
  input:      '#f7f9fa',
  muted:      '#E5E5E6',
  mutedFg:    '#6b7280',
  accent:     '#E3ECF6',
  accentFg:   '#1e9df1',
  ring:       '#1da1f2',
  destructive:'#f4212e',
  sidebar:    '#f7f8f8',
  sidebarBdr: '#e1e8ed',
  font:       "'Open Sans', sans-serif",
} as const;

// ── Category icon map ───────────────────────────────────────────────────
const CATEGORY_ICONS: Record<NodeCategory, LucideIcon> = {
  SOURCE: Database, TRANSFORM: Shuffle, VISUALISE: BarChart3,
  MODEL: Brain, ACTION: Zap, EDUCATION: GraduationCap,
};

const STATUS_ICONS: Record<string, LucideIcon> = {
  running: Loader, completed: CheckCircle, failed: XCircle,
  paused: Pause, pending: Circle, cancelled: Ban,
};

const STATUS_COLORS: Record<string, string> = {
  running: '#D4790E', completed: '#00b87a', failed: '#f4212e',
  paused: '#9B59B6', pending: '#9ca3af', cancelled: '#9ca3af',
};

// ── Toolbar Button ──────────────────────────────────────────────────────
function ToolBtn({ label, onClick, accent, disabled, icon: Icon, title }: {
  label: string; onClick: () => void; accent?: string;
  disabled?: boolean; icon?: LucideIcon; title?: string;
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title ?? label}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: accent ? accent + '12' : BRAND.card,
        border: `1px solid ${accent ? accent + '30' : BRAND.border}`, borderRadius: 8,
        padding: '5px 10px', cursor: disabled ? 'not-allowed' : 'pointer',
        color: disabled ? BRAND.mutedFg : (accent ?? BRAND.foreground),
        fontSize: 12, fontWeight: 500, opacity: disabled ? 0.5 : 1,
        transition: 'background 0.15s', whiteSpace: 'nowrap' as const,
      }}>
      {Icon && <Icon size={14} />} {label}
    </button>
  );
}

// ── Config Field Renderer ───────────────────────────────────────────────
function ConfigField({ fieldKey, fieldDef, value, onChange }: {
  fieldKey: string; fieldDef: ConfigFieldDef; value: unknown;
  onChange: (key: string, val: unknown) => void;
}) {
  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#f7f9fa', border: '1px solid #e1eaef',
    borderRadius: 6, padding: '6px 10px', color: '#0f1419',
    fontSize: 12, fontFamily: "'Open Sans', sans-serif", outline: 'none',
  };

  switch (fieldDef.type) {
    case 'string': return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
          {fieldDef.label}{fieldDef.required ? ' *' : ''}
        </label>
        <input type="text" value={(value as string) ?? fieldDef.defaultValue ?? ''}
          placeholder={fieldDef.placeholder} onChange={e => onChange(fieldKey, e.target.value)}
          style={inputStyle} />
        {fieldDef.helpText && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{fieldDef.helpText}</div>}
      </div>
    );
    case 'number': return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
          {fieldDef.label}
        </label>
        <input type="number" value={(value as number) ?? fieldDef.defaultValue ?? 0}
          onChange={e => onChange(fieldKey, parseFloat(e.target.value) || 0)}
          style={inputStyle} step="any" />
        {fieldDef.helpText && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{fieldDef.helpText}</div>}
      </div>
    );
    case 'boolean': return (
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={(value as boolean) ?? (fieldDef.defaultValue as boolean) ?? false}
          onChange={e => onChange(fieldKey, e.target.checked)} style={{ accentColor: '#1e9df1' }} />
        <label style={{ fontSize: 12, color: '#6b7280' }}>{fieldDef.label}</label>
      </div>
    );
    case 'select': return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
          {fieldDef.label}
        </label>
        <select value={(value as string) ?? (fieldDef.defaultValue as string) ?? ''}
          onChange={e => onChange(fieldKey, e.target.value)}
          style={{ ...inputStyle, cursor: 'pointer' }}>
          {!value && !fieldDef.defaultValue && <option value="">Select...</option>}
          {fieldDef.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {fieldDef.helpText && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{fieldDef.helpText}</div>}
      </div>
    );
    case 'text': return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
          {fieldDef.label}
        </label>
        <textarea value={(value as string) ?? fieldDef.defaultValue ?? ''}
          placeholder={fieldDef.placeholder} onChange={e => onChange(fieldKey, e.target.value)}
          rows={3} style={{ ...inputStyle, resize: 'vertical' as const }} />
        {fieldDef.helpText && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{fieldDef.helpText}</div>}
      </div>
    );
    case 'json': return (
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', display: 'block', marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
          {fieldDef.label}
        </label>
        <textarea value={typeof value === 'string' ? value : JSON.stringify(value ?? fieldDef.defaultValue ?? {}, null, 2)}
          onChange={e => { try { onChange(fieldKey, JSON.parse(e.target.value)); } catch { onChange(fieldKey, e.target.value); } }}
          rows={4} style={{ ...inputStyle, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, resize: 'vertical' as const }} />
        {fieldDef.helpText && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>{fieldDef.helpText}</div>}
      </div>
    );
    default: return <div style={{ fontSize: 11, color: '#9ca3af' }}>Unsupported: {fieldDef.type}</div>;
  }
}


// ── AI Insight Panel Component ──────────────────────────────────────────
function AIInsightPanel({ insight, knowledge, isExpanded, onToggle }: {
  insight: NodeInsight | undefined;
  knowledge: (typeof NODE_DEEP_KNOWLEDGE)[string] | undefined;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  if (!insight) return null;

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0D2137 0%, #132B3F 100%)',
      border: '1px solid #1B4B6B', borderRadius: 8, padding: 12, marginBottom: 12,
    }}>
      <button onClick={onToggle} style={{
        background: 'none', border: 'none', color: '#5BA3D9', cursor: 'pointer',
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1,
        display: 'flex', alignItems: 'center', gap: 6, padding: 0, marginBottom: 8,
        width: '100%',
      }}>
        <Brain size={14} /> AI Context
        <span style={{ marginLeft: 'auto' }}>{isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}</span>
      </button>

      {/* Always show contextual role */}
      <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.5, marginBottom: 8 }}>
        {insight.contextualRole}
      </div>

      {isExpanded && (
        <>
          {/* Data flow narrative */}
          <div style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5563', marginBottom: 3, textTransform: 'uppercase' as const }}>Data Flow</div>
            <div style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>
              {insight.inputNarrative}<br />{insight.outputNarrative}
            </div>
          </div>

          {/* Pedagogical context */}
          {insight.pedagogicalContext && (
            <div style={{
              background: '#0A2A1A', border: '1px solid #1B6B3A', borderRadius: 6,
              padding: '8px 10px', marginBottom: 8,
            }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#3DB86A', marginBottom: 3 }}>EDUCATIONAL SIGNIFICANCE</div>
              <div style={{ fontSize: 11, color: '#8BC8A0', lineHeight: 1.5 }}>
                {insight.pedagogicalContext}
              </div>
            </div>
          )}

          {/* Config notes */}
          {insight.configNotes.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5563', marginBottom: 3, textTransform: 'uppercase' as const }}>Configuration Notes</div>
              {insight.configNotes.map((note, i) => (
                <div key={i} style={{ fontSize: 11, color: '#B0A870', lineHeight: 1.4, marginBottom: 3, paddingLeft: 8, borderLeft: '2px solid #4A6235' }}>
                  {note}
                </div>
              ))}
            </div>
          )}

          {/* Deep knowledge — analogy */}
          {knowledge?.analogy && (
            <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 8,
              paddingLeft: 10, borderLeft: '2px solid #2A4A5A' }}>
              💡 {knowledge.analogy}
            </div>
          )}

          {/* Execution note */}
          {insight.executionNote && (
            <div style={{
              background: '#1A2510', border: '1px solid #3A5530', borderRadius: 6,
              padding: '6px 10px', fontSize: 11, color: '#A0C890',
            }}>
              → {insight.executionNote}
            </div>
          )}
        </>
      )}
    </div>
  );
}


// ── Suggestion Banner Component ─────────────────────────────────────────
function SuggestionBanner({ suggestions, onDismiss }: {
  suggestions: WorkflowSuggestion[];
  onDismiss: (id: string) => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = suggestions.filter(s => !dismissed.has(s.id));
  if (visible.length === 0) return null;

  const levelColors = { info: '#1e9df1', tip: '#D4790E', warning: '#f4212e' };
  const levelGlyphs = { info: 'ℹ', tip: '💡', warning: '⚠' };

  return (
    <div style={{ padding: '0 12px 8px 12px' }}>
      {visible.slice(0, 3).map(s => (
        <div key={s.id} style={{
          background: `${levelColors[s.level]}11`, border: `1px solid ${levelColors[s.level]}33`,
          borderRadius: 6, padding: '6px 10px', marginBottom: 4,
          display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 11,
        }}>
          <span style={{ color: levelColors[s.level], flexShrink: 0, marginTop: 1 }}>
            {levelGlyphs[s.level]}
          </span>
          <div style={{ color: '#374151', lineHeight: 1.4, flex: 1 }}>{s.message}</div>
          <button onClick={() => { setDismissed(prev => new Set([...prev, s.id])); onDismiss(s.id); }}
            style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 12, padding: 0, flexShrink: 0 }}>
            ✕
          </button>
        </div>
      ))}
      {visible.length > 3 && (
        <div style={{ fontSize: 10, color: '#9ca3af', textAlign: 'center' as const }}>
          +{visible.length - 3} more suggestion{visible.length - 3 > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}


// ── Main Canvas Component ───────────────────────────────────────────────

export interface SRCanvasProps {
  apiConfig?: WorkflowAPIConfig;
  initialWorkflow?: WorkflowDefinitionJSON;
  onSave?: (definition: WorkflowDefinitionJSON) => void;
  additionalRecipes?: Recipe[];
}

export default function SRCanvasProduction({
  apiConfig, initialWorkflow, onSave, additionalRecipes = [],
}: SRCanvasProps) {
  // ── Core Graph State ────────────────────────────────────────────────
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [edges, setEdges] = useState<CanvasEdge[]>([]);
  const [selectedNodes, setSelectedNodes] = useState<Set<string>>(new Set());
  const [viewport, setViewport] = useState<ViewportState>({ offsetX: 0, offsetY: 0, scale: 1 });
  const [workflowMeta, setWorkflowMeta] = useState({ workflowId: '', name: 'Untitled Workflow', description: '', version: 1 });

  // ── Interaction State ───────────────────────────────────────────────
  const [dragging, setDragging] = useState<{ nodeId: string; ox: number; oy: number; sx: number; sy: number } | null>(null);
  const [connecting, setConnecting] = useState<{ srcId: string; srcPort: string; srcType: string; x0: number; y0: number } | null>(null);
  const [mouseCanvas, setMouseCanvas] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ mx: number; my: number; ox: number; oy: number } | null>(null);

  // ── UI State ────────────────────────────────────────────────────────
  const [paletteOpen, setPaletteOpen] = useState(true);
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({ SOURCE: true, TRANSFORM: true, ACTION: true });
  const [showRecipes, setShowRecipes] = useState(false);
  const [aiExpanded, setAiExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Execution State ─────────────────────────────────────────────────
  const [runState, setRunState] = useState<RunState | null>(null);

  // ── Refs ────────────────────────────────────────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);
  const cmdHistory = useRef(new CommandHistory());
  const intelligence = useRef(new WorkflowIntelligence(apiConfig ? { baseUrl: apiConfig.baseUrl, authToken: apiConfig.authToken } : undefined));
  const mockExec = useRef(createMockExecutor());
  const execCtrl = useRef<{ cancel: () => void; resume: (id: string) => void } | null>(null);
  const apiClient = useRef<WorkflowAPIClient | null>(apiConfig ? new WorkflowAPIClient(apiConfig) : null);

  // Load initial workflow
  useEffect(() => {
    if (initialWorkflow) {
      const { nodes: n, edges: e } = workflowDefinitionToCanvas(initialWorkflow);
      setNodes(n); setEdges(e);
      setWorkflowMeta({ workflowId: initialWorkflow.workflowId, name: initialWorkflow.name, description: initialWorkflow.description, version: initialWorkflow.version });
      cmdHistory.current.clear();
    }
  }, [initialWorkflow]);

  // ── AI Analysis (recompute when graph changes) ──────────────────────
  const insights = useMemo(
    () => intelligence.current.analyse(nodes, edges, runState),
    [nodes, edges, runState],
  );

  // ── Command Helper ──────────────────────────────────────────────────
  const exec = useCallback((cmd: CanvasCommand) => {
    const s = cmdHistory.current.execute(cmd, { nodes, edges });
    setNodes(s.nodes); setEdges(s.edges);
  }, [nodes, edges]);

  const undo = useCallback(() => {
    const s = cmdHistory.current.undo({ nodes, edges });
    if (s) { setNodes(s.nodes); setEdges(s.edges); }
  }, [nodes, edges]);

  const redo = useCallback(() => {
    const s = cmdHistory.current.redo({ nodes, edges });
    if (s) { setNodes(s.nodes); setEdges(s.edges); }
  }, [nodes, edges]);

  // ── Recipes ─────────────────────────────────────────────────────────
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const allRecipes = useMemo(() => [...BUILT_IN_RECIPES, ...additionalRecipes, ...userRecipes], [additionalRecipes, userRecipes]);

  const loadRecipe = useCallback((recipe: Recipe) => {
    const cx = (-viewport.offsetX / viewport.scale) + 200;
    const cy = (-viewport.offsetY / viewport.scale) + 100;
    const { nodes: rn, edges: re } = instantiateRecipe(recipe, cx, cy);
    exec(new LoadRecipeCommand(rn, re, recipe.name));
    setShowRecipes(false);
  }, [exec, viewport]);

  // ── Node Operations ─────────────────────────────────────────────────
  const addNode = useCallback((typeId: string) => {
    const type = NODE_TYPES.find(t => t.typeId === typeId);
    if (!type) return;
    const n: CanvasNode = {
      id: generateId('n'), typeId,
      x: (-viewport.offsetX / viewport.scale) + 300 + Math.random() * 200,
      y: (-viewport.offsetY / viewport.scale) + 150 + Math.random() * 100,
      config: buildDefaultConfig(type),
    };
    exec(new AddNodeCommand(n));
    setSelectedNodes(new Set([n.id]));
  }, [exec, viewport]);

  const deleteSelected = useCallback(() => {
    if (selectedNodes.size === 0) return;
    const rn = nodes.filter(n => selectedNodes.has(n.id));
    const re = edges.filter(e => selectedNodes.has(e.sourceNodeId) || selectedNodes.has(e.targetNodeId));
    exec(new BulkDeleteCommand(rn, re));
    setSelectedNodes(new Set());
  }, [selectedNodes, nodes, edges, exec]);

  const updateConfig = useCallback((nodeId: string, field: string, value: unknown) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    exec(new UpdateConfigCommand(nodeId, field, node.config[field], value));
  }, [nodes, exec]);

  // ── Serialise & Save ────────────────────────────────────────────────
  const serialise = useCallback(() => canvasToWorkflowDefinition(nodes, edges, {
    workflowId: workflowMeta.workflowId || undefined,
    name: workflowMeta.name, description: workflowMeta.description,
    version: workflowMeta.version, tenantId: apiConfig?.tenantId, userId: apiConfig?.userId,
  }), [nodes, edges, workflowMeta, apiConfig]);

  const handleSave = useCallback(async () => {
    const def = serialise();
    if (apiClient.current) {
      try {
        const r = await apiClient.current.saveWorkflow(def);
        setWorkflowMeta(p => ({ ...p, workflowId: r.workflowId, version: r.version }));
      } catch (e) { console.error('Save failed:', e); }
    }
    onSave?.(def);
  }, [serialise, onSave]);

  // ── Validation ──────────────────────────────────────────────────────
  const validationIssues = useMemo(() => validateCanvasGraph(nodes, edges), [nodes, edges]);
  const hasErrors = validationIssues.some(i => i.severity === 'error');

  // ── Execution ───────────────────────────────────────────────────────
  const handleExecute = useCallback(() => {
    if (nodes.length === 0 || hasErrors) return;
    const rs: RunState = {
      runId: generateId('run'), status: 'running',
      nodeStates: Object.fromEntries(nodes.map(n => [n.id, 'pending' as NodeRunStatus])),
      startedAt: Date.now(), durationMs: 0,
    };
    setRunState(rs);
    const ctrl = mockExec.current.execute(nodes, edges,
      (id, st) => setRunState(p => p ? { ...p, nodeStates: { ...p.nodeStates, [id]: st }, pausedAtNodeId: st === 'paused' ? id : p.pausedAtNodeId, durationMs: Date.now() - p.startedAt } : p),
      (st) => setRunState(p => p ? { ...p, status: st, durationMs: Date.now() - p.startedAt } : p),
    );
    execCtrl.current = ctrl;
  }, [nodes, edges, hasErrors]);

  const handleCancel = useCallback(() => { execCtrl.current?.cancel(); setRunState(p => p ? { ...p, status: 'cancelled' } : null); }, []);
  const handleResume = useCallback(() => { if (runState?.pausedAtNodeId) execCtrl.current?.resume(runState.pausedAtNodeId); }, [runState]);
  const clearCanvas = useCallback(() => { setNodes([]); setEdges([]); setSelectedNodes(new Set()); setRunState(null); cmdHistory.current.clear(); }, []);

  // ── Mouse Handlers ──────────────────────────────────────────────────
  const svgCoords = useCallback((e: React.MouseEvent) => {
    const r = svgRef.current?.getBoundingClientRect();
    if (!r) return { sx: 0, sy: 0, cx: 0, cy: 0 };
    const sx = e.clientX - r.left, sy = e.clientY - r.top;
    const c = screenToCanvas(sx, sy, viewport);
    return { sx, sy, cx: c.x, cy: c.y };
  }, [viewport]);

  const onNodeDown = useCallback((e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!e.shiftKey) setSelectedNodes(new Set([id]));
    else setSelectedNodes(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const node = nodes.find(n => n.id === id);
    if (!node) return;
    const { cx, cy } = svgCoords(e);
    setDragging({ nodeId: id, ox: cx - node.x, oy: cy - node.y, sx: node.x, sy: node.y });
  }, [nodes, svgCoords]);

  const onOutPortDown = useCallback((e: React.MouseEvent, nodeId: string, portId: string, dataType: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const pos = getPortPosition(node, portId, 'output');
    setConnecting({ srcId: nodeId, srcPort: portId, srcType: dataType, x0: pos.x, y0: pos.y });
  }, [nodes]);

  const onInPortUp = useCallback((e: React.MouseEvent, nodeId: string, portId: string, dataType: string) => {
    e.stopPropagation();
    if (connecting && nodeId !== connecting.srcId && areTypesCompatible(connecting.srcType, dataType)) {
      const exists = edges.some(ed => ed.sourceNodeId === connecting.srcId && ed.sourcePortId === connecting.srcPort && ed.targetNodeId === nodeId && ed.targetPortId === portId);
      if (!exists) exec(new AddEdgeCommand({ id: generateId('e'), sourceNodeId: connecting.srcId, sourcePortId: connecting.srcPort, targetNodeId: nodeId, targetPortId: portId }));
    }
    setConnecting(null);
  }, [connecting, edges, exec]);

  const onSvgMove = useCallback((e: React.MouseEvent) => {
    const { sx, sy, cx, cy } = svgCoords(e);
    setMouseCanvas({ x: cx, y: cy });
    if (dragging) setNodes(p => p.map(n => n.id === dragging.nodeId ? { ...n, x: cx - dragging.ox, y: cy - dragging.oy } : n));
    if (isPanning && panStart) setViewport(p => ({ ...p, offsetX: sx - panStart.mx + panStart.ox, offsetY: sy - panStart.my + panStart.oy }));
  }, [dragging, isPanning, panStart, svgCoords]);

  const onSvgUp = useCallback(() => {
    if (dragging) {
      const node = nodes.find(n => n.id === dragging.nodeId);
      if (node && (Math.abs(node.x - dragging.sx) > 2 || Math.abs(node.y - dragging.sy) > 2)) {
        // Already moved via setNodes — just record command for undo
        cmdHistory.current.execute(new MoveNodeCommand(dragging.nodeId, dragging.sx, dragging.sy, node.x, node.y), { nodes, edges });
      }
    }
    setDragging(null); setConnecting(null); setIsPanning(false); setPanStart(null);
  }, [dragging, nodes, edges]);

  const onSvgDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current || (e.target as SVGElement).dataset?.bg) {
      setSelectedNodes(new Set());
      const { sx, sy } = svgCoords(e);
      setIsPanning(true);
      setPanStart({ mx: sx, my: sy, ox: viewport.offsetX, oy: viewport.offsetY });
    }
  }, [viewport, svgCoords]);

  // Zoom (wheel)
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const { sx, sy } = svgCoords(e as unknown as React.MouseEvent);
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setViewport(v => zoomAtPoint(v, delta, sx, sy));
  }, [svgCoords]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') { if (selectedNodes.size > 0) deleteSelected(); }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) { e.preventDefault(); undo(); }
      if (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey) { e.preventDefault(); redo(); }
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSave(); }
      if (e.key === 'Escape') setSelectedNodes(new Set());
      if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const container = svgRef.current?.parentElement;
        if (container) setViewport(fitToContent(nodes, container.clientWidth, container.clientHeight));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedNodes, deleteSelected, undo, redo, handleSave, nodes]);

  // ── Derived State ───────────────────────────────────────────────────
  const selectedNodeId = selectedNodes.size === 1 ? Array.from(selectedNodes)[0] : undefined;
  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : undefined;
  const selectedType = selectedNode ? NODE_TYPES.find(t => t.typeId === selectedNode.typeId) : undefined;
  const selectedCat = selectedType ? NODE_CATEGORIES_META[selectedType.category] : undefined;
  const selectedInsight = selectedNodeId ? insights.nodeInsights.get(selectedNodeId) : undefined;
  const selectedKnowledge = selectedType ? intelligence.current.getDeepKnowledge(selectedType.typeId) : undefined;

  const filteredNodeTypes = searchQuery.trim()
    ? NODE_TYPES.filter(t => t.label.toLowerCase().includes(searchQuery.toLowerCase()) || t.description.toLowerCase().includes(searchQuery.toLowerCase()))
    : NODE_TYPES;

  const nodeState = (id: string) => runState?.nodeStates[id];

  // ── Render ──────────────────────────────────────────────────────────
  // Fullscreen support
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);
  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  return (
    <div ref={containerRef} style={{ display: 'flex', height: '100vh', fontFamily: BRAND.font, background: BRAND.background, color: BRAND.foreground, overflow: 'hidden' }}>

      {/* ── Left Palette ──────────────────────────────────────────── */}
      <div style={{ width: paletteOpen ? 260 : 44, transition: 'width 0.2s', background: BRAND.sidebar, borderRight: `1px solid ${BRAND.sidebarBdr}`, display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden' }}>
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${BRAND.sidebarBdr}` }}>
          {paletteOpen && <span style={{ fontWeight: 600, fontSize: 13, color: BRAND.foreground, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Nodes</span>}
          <button onClick={() => setPaletteOpen(p => !p)} style={{ background: 'none', border: 'none', color: BRAND.mutedFg, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center' }}>
            {paletteOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
          </button>
        </div>

        {paletteOpen && (
          <>
            <div style={{ padding: '8px 8px 4px' }}>
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search nodes..."
                style={{ width: '100%', background: BRAND.input, border: `1px solid ${BRAND.border}`, borderRadius: 8, padding: '6px 10px', color: BRAND.foreground, fontSize: 12, outline: 'none' }} />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
              {Object.entries(NODE_CATEGORIES_META).map(([catKey, cat]) => {
                const catNodes = filteredNodeTypes.filter(n => n.category === catKey);
                if (catNodes.length === 0) return null;
                const isOpen = expandedCats[catKey];
                const CatIcon = CATEGORY_ICONS[catKey as NodeCategory];
                return (
                  <div key={catKey} style={{ marginBottom: 4 }}>
                    <button onClick={() => setExpandedCats(p => ({ ...p, [catKey]: !p[catKey] }))}
                      style={{ background: 'none', border: 'none', color: cat.color, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 4px', width: '100%', fontSize: 12, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
                      {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />} <CatIcon size={14} /> {cat.label} ({catNodes.length})
                    </button>
                    {isOpen && catNodes.map(nt => (
                      <button key={nt.typeId} onClick={() => addNode(nt.typeId)}
                        style={{ display: 'block', width: '100%', textAlign: 'left' as const, background: BRAND.background, border: `1px solid ${BRAND.border}`, borderRadius: 8, padding: '8px 10px', marginBottom: 3, cursor: 'pointer', color: BRAND.foreground, fontSize: 12, transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = BRAND.accent)} onMouseLeave={e => (e.currentTarget.style.background = BRAND.background)}>
                        <div style={{ fontWeight: 600, marginBottom: 2 }}>{nt.label}</div>
                        <div style={{ fontSize: 10, color: BRAND.mutedFg }}>{nt.description}</div>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
            {/* Recipes button */}
            <div style={{ padding: 8, borderTop: `1px solid ${BRAND.sidebarBdr}` }}>
              <button onClick={() => setShowRecipes(p => !p)}
                style={{ width: '100%', background: BRAND.background, border: `1px solid ${BRAND.border}`, borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: BRAND.foreground, fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <ClipboardList size={14} /> Recipes ({allRecipes.length})
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Main Area ─────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <div style={{ height: 48, background: BRAND.card, borderBottom: `1px solid ${BRAND.border}`, display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: BRAND.primary, marginRight: 8 }}>Visual Workflow Designer</span>
          <div style={{ width: 1, height: 24, background: BRAND.border }} />
          <ToolBtn label="Undo" icon={Undo2} onClick={undo} disabled={!cmdHistory.current.canUndo} title={cmdHistory.current.undoDescription ? `Undo: ${cmdHistory.current.undoDescription}` : 'Undo (Ctrl+Z)'} />
          <ToolBtn label="Redo" icon={Redo2} onClick={redo} disabled={!cmdHistory.current.canRedo} title={cmdHistory.current.redoDescription ? `Redo: ${cmdHistory.current.redoDescription}` : 'Redo (Ctrl+Shift+Z)'} />
          <div style={{ width: 1, height: 24, background: BRAND.border }} />
          <ToolBtn label="Save" icon={Save} onClick={handleSave} accent={BRAND.primary} title="Save (Ctrl+S)" />
          <ToolBtn label="Clear" icon={Trash2} onClick={clearCanvas} />
          {selectedNodes.size > 0 && <ToolBtn label={`Delete (${selectedNodes.size})`} icon={X} onClick={deleteSelected} accent={BRAND.destructive} />}
          <ToolBtn label="Fit" icon={Maximize} onClick={() => { const c = svgRef.current?.parentElement; if (c) setViewport(fitToContent(nodes, c.clientWidth, c.clientHeight)); }} />
          <ToolBtn label={isFullscreen ? 'Exit' : 'Fullscreen'} icon={isFullscreen ? Minimize2 : Maximize2} onClick={toggleFullscreen} />
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: BRAND.mutedFg, marginRight: 8 }}>{Math.round(viewport.scale * 100)}%</span>
          {/* Execution controls */}
          {runState && (
            <span style={{ fontSize: 12, fontWeight: 600, color: STATUS_COLORS[runState.status] ?? '#ccc', display: 'flex', alignItems: 'center', gap: 4, marginRight: 8 }}>
              {(() => { const SI = STATUS_ICONS[runState.status]; return SI ? <SI size={14} /> : null; })()} {runState.status.toUpperCase()} ({Math.round(runState.durationMs / 1000)}s)
            </span>
          )}
          {runState?.status === 'paused' && <ToolBtn label="Resume" icon={Play} onClick={handleResume} accent="#9B59B6" />}
          {(runState?.status === 'running' || runState?.status === 'paused') && <ToolBtn label="Cancel" icon={Square} onClick={handleCancel} accent={BRAND.destructive} />}
          <ToolBtn label="Execute" icon={Play} onClick={handleExecute} accent="#00b87a"
            disabled={nodes.length === 0 || hasErrors || runState?.status === 'running'} />
        </div>

        {/* Recipes dropdown */}
        {showRecipes && (
          <div style={{ background: BRAND.card, borderBottom: `1px solid ${BRAND.border}`, padding: '8px 12px', display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {allRecipes.map(r => (
              <button key={r.id} onClick={() => loadRecipe(r)}
                style={{ background: BRAND.background, border: `1px solid ${BRAND.border}`, borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: BRAND.foreground, fontSize: 12, textAlign: 'left' as const }}>
                <div style={{ fontWeight: 600 }}>{r.name}</div>
                <div style={{ fontSize: 10, color: BRAND.mutedFg }}>{r.description}</div>
              </button>
            ))}
          </div>
        )}

        {/* Canvas */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <svg ref={svgRef} width="100%" height="100%"
            onMouseMove={onSvgMove} onMouseUp={onSvgUp} onMouseDown={onSvgDown}
            onMouseLeave={onSvgUp} onWheel={onWheel}
            style={{ cursor: isPanning ? 'grabbing' : dragging ? 'move' : 'default' }}>
            {/* Grid */}
            <defs>
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse"
                patternTransform={`translate(${viewport.offsetX % (24 * viewport.scale)},${viewport.offsetY % (24 * viewport.scale)}) scale(${viewport.scale})`}>
                <circle cx="12" cy="12" r="0.8" fill="#1E3040" />
              </pattern>
            </defs>
            <rect data-bg="1" width="100%" height="100%" fill="url(#grid)" />

            <g transform={`translate(${viewport.offsetX},${viewport.offsetY}) scale(${viewport.scale})`}>
              {/* Edges */}
              {edges.map(edge => {
                const sn = nodes.find(n => n.id === edge.sourceNodeId);
                const tn = nodes.find(n => n.id === edge.targetNodeId);
                if (!sn || !tn) return null;
                const p1 = getPortPosition(sn, edge.sourcePortId, 'output');
                const p2 = getPortPosition(tn, edge.targetPortId, 'input');
                const st = NODE_TYPES.find(t => t.typeId === sn.typeId)?.outputs.find(p => p.portId === edge.sourcePortId);
                const color = PORT_COLORS[st?.dataType ?? ''] ?? '#555';
                const animated = nodeState(edge.sourceNodeId) === 'completed';
                return (
                  <g key={edge.id}>
                    <path d={makeEdgePath(p1.x, p1.y, p2.x, p2.y)} stroke={color} strokeWidth={2} fill="none" opacity={0.3} />
                    {animated ? (
                      <path d={makeEdgePath(p1.x, p1.y, p2.x, p2.y)} stroke={color} strokeWidth={2.5} fill="none" strokeDasharray="6 4" opacity={0.8}>
                        <animate attributeName="stroke-dashoffset" from="10" to="0" dur="0.6s" repeatCount="indefinite" />
                      </path>
                    ) : (
                      <path d={makeEdgePath(p1.x, p1.y, p2.x, p2.y)} stroke={color} strokeWidth={2} fill="none" opacity={0.7} />
                    )}
                  </g>
                );
              })}

              {/* Connection in progress */}
              {connecting && (
                <path d={makeEdgePath(connecting.x0, connecting.y0, mouseCanvas.x, mouseCanvas.y)}
                  stroke={PORT_COLORS[connecting.srcType] ?? '#888'} strokeWidth={2} fill="none" strokeDasharray="4 3" opacity={0.6} />
              )}

              {/* Nodes */}
              {nodes.map(node => {
                const type = NODE_TYPES.find(t => t.typeId === node.typeId);
                if (!type) return null;
                const cat = NODE_CATEGORIES_META[type.category];
                const h = getNodeHeight(node.typeId);
                const isSelected = selectedNodes.has(node.id);
                const ns = nodeState(node.id);

                return (
                  <g key={node.id} onMouseDown={e => onNodeDown(e, node.id)}>
                    {/* Execution glow */}
                    {ns === 'running' && (
                      <rect x={node.x - 4} y={node.y - 4} width={NODE_WIDTH + 8} height={h + 8} rx={10} fill="none" stroke="#D4790E" strokeWidth={2} opacity={0.5}>
                        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.2s" repeatCount="indefinite" />
                      </rect>
                    )}
                    {ns === 'paused' && (
                      <rect x={node.x - 4} y={node.y - 4} width={NODE_WIDTH + 8} height={h + 8} rx={10} fill="none" stroke="#9B59B6" strokeWidth={2} opacity={0.5}>
                        <animate attributeName="opacity" values="0.3;0.7;0.3" dur="1.5s" repeatCount="indefinite" />
                      </rect>
                    )}
                    {/* Body */}
                    <rect x={node.x} y={node.y} width={NODE_WIDTH} height={h} rx={8} fill="#ffffff"
                      stroke={isSelected ? '#5BA3D9' : ns ? (STATUS_COLORS[ns] ?? '#2A3F52') : '#2A3F52'} strokeWidth={isSelected ? 2 : 1.5} />
                    {/* Header */}
                    <rect x={node.x} y={node.y} width={NODE_WIDTH} height={NODE_HEADER_HEIGHT} rx={8} fill={cat.color} />
                    <rect x={node.x} y={node.y + NODE_HEADER_HEIGHT - 8} width={NODE_WIDTH} height={8} fill={cat.color} />
                    <text x={node.x + 10} y={node.y + 23} fontSize={12} fontWeight={600} fill="white" fontFamily="'Open Sans', sans-serif">{type.label}</text>
                    {/* Status / pause indicators */}
                    {ns && <circle cx={node.x + NODE_WIDTH - 14} cy={node.y + 18} r={5} fill={STATUS_COLORS[ns] ?? '#ccc'} />}
                    {type.pauses && !ns && <text x={node.x + NODE_WIDTH - 18} y={node.y + 22} fontSize={10} fill="rgba(255,255,255,0.5)">⏸</text>}
                    {/* Validation error badge */}
                    {validationIssues.some(v => v.nodeId === node.id && v.severity === 'error') && !ns && (
                      <circle cx={node.x + NODE_WIDTH - 4} cy={node.y - 4} r={6} fill="#f4212e" stroke="#f7f9fa" strokeWidth={2} />
                    )}
                    {/* Input ports */}
                    {type.inputs.map((port, pi) => {
                      const py = node.y + NODE_HEADER_HEIGHT + (pi + 0.5) * PORT_ROW_HEIGHT;
                      return (
                        <g key={`in-${port.portId}`} onMouseUp={e => onInPortUp(e, node.id, port.portId, port.dataType)} style={{ cursor: 'crosshair' }}>
                          <circle cx={node.x} cy={py} r={PORT_RADIUS} fill="#ffffff" stroke={PORT_COLORS[port.dataType] ?? '#888'} strokeWidth={2} />
                          <text x={node.x + 14} y={py + 4} fontSize={10} fill="#6b7280" fontFamily="'Open Sans', sans-serif">{port.label}</text>
                        </g>
                      );
                    })}
                    {/* Output ports */}
                    {type.outputs.map((port, pi) => {
                      const py = node.y + NODE_HEADER_HEIGHT + (pi + 0.5) * PORT_ROW_HEIGHT;
                      return (
                        <g key={`out-${port.portId}`} onMouseDown={e => onOutPortDown(e, node.id, port.portId, port.dataType)} style={{ cursor: 'crosshair' }}>
                          <circle cx={node.x + NODE_WIDTH} cy={py} r={PORT_RADIUS} fill={PORT_COLORS[port.dataType] ?? '#888'} stroke="#ffffff" strokeWidth={2} />
                          <text x={node.x + NODE_WIDTH - 14} y={py + 4} fontSize={10} fill="#6b7280" textAnchor="end" fontFamily="'Open Sans', sans-serif">{port.label}</text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' as const, color: '#9ca3af', pointerEvents: 'none' }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.4 }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></svg>
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No workflow loaded</div>
              <div style={{ fontSize: 13 }}>Add nodes from the palette, or load a <b>Recipe</b> for a pre-built pipeline</div>
            </div>
          )}

          {/* Bottom bar: AI narrative + minimap info */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(22,34,48,0.92)', backdropFilter: 'blur(8px)', borderTop: '1px solid #e1eaef' }}>
            {/* AI Workflow Narrative */}
            {nodes.length > 0 && (
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #1B3045' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Brain size={12} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#5BA3D9', textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{insights.workflowPurpose}</span>
                </div>
                <div style={{ fontSize: 12, color: '#A0B8CA', lineHeight: 1.5 }}>
                  {insights.workflowNarrative}
                </div>
              </div>
            )}
            {/* Suggestions */}
            <SuggestionBanner suggestions={insights.suggestions} onDismiss={() => {}} />
            {/* Status bar */}
            <div style={{ padding: '6px 12px', fontSize: 11, color: '#9ca3af', display: 'flex', gap: 12 }}>
              <span>{nodes.length} nodes</span>
              <span>{edges.length} edges</span>
              <span>Zoom: {Math.round(viewport.scale * 100)}%</span>
              {validationIssues.length > 0 && (
                <span style={{ color: hasErrors ? '#f4212e' : '#D4790E' }}>
                  {validationIssues.filter(i => i.severity === 'error').length} error(s), {validationIssues.filter(i => i.severity === 'warning').length} warning(s)
                </span>
              )}
              <span style={{ marginLeft: 'auto', color: '#3A5565' }}>Pan: drag bg · Connect: drag output→input · Zoom: scroll · Undo: Ctrl+Z</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel (Inspector + AI Context) ──────────────────── */}
      {selectedNode && selectedType && selectedCat && (
        <div style={{ width: 300, background: '#f7f8f8', borderLeft: '1px solid #e1eaef', display: 'flex', flexDirection: 'column', flexShrink: 0, overflowY: 'auto' }}>
          {/* Header */}
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e1eaef', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 600, fontSize: 13, color: selectedCat.color }}>
              {(() => { const CI = CATEGORY_ICONS[selectedType.category]; return CI ? <CI size={16} style={{ display: 'inline' }} /> : null; })()} {selectedType.label}
            </span>
            <button onClick={() => setSelectedNodes(new Set())} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>

          <div style={{ padding: 16, flex: 1 }}>
            {/* AI Contextual Insight */}
            <AIInsightPanel insight={selectedInsight} knowledge={selectedKnowledge}
              isExpanded={aiExpanded} onToggle={() => setAiExpanded(p => !p)} />

            {/* Deep knowledge — full explanation */}
            {selectedKnowledge && (
              <div style={{ marginBottom: 16, padding: '10px 12px', background: '#f7f9fa', borderRadius: 8, border: '1px solid #e1eaef' }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>What This Node Does</div>
                <div style={{ fontSize: 12, color: '#A0B8CA', lineHeight: 1.5 }}>
                  {selectedKnowledge.explanation}
                </div>
              </div>
            )}

            {/* Execution status */}
            {nodeState(selectedNode.id) && (
              <div style={{
                marginBottom: 12, padding: '8px 12px', borderRadius: 8,
                background: (STATUS_COLORS[nodeState(selectedNode.id)!] ?? '#333') + '15',
                border: `1px solid ${(STATUS_COLORS[nodeState(selectedNode.id)!] ?? '#333')}44`,
                fontSize: 12, color: STATUS_COLORS[nodeState(selectedNode.id)!] ?? '#ccc',
                display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
              }}>
                {(() => { const SI = STATUS_ICONS[nodeState(selectedNode.id)!]; return SI ? <SI size={12} style={{ display: 'inline' }} /> : null; })()} {nodeState(selectedNode.id)}
              </div>
            )}

            {/* Ports */}
            {selectedType.inputs.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase' as const }}>Inputs</div>
                {selectedType.inputs.map(p => (
                  <div key={p.portId} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12, color: '#6b7280' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PORT_COLORS[p.dataType] ?? '#888' }} />
                    {p.label} <span style={{ fontSize: 10, color: '#4b5563' }}>({p.dataType})</span>
                  </div>
                ))}
              </div>
            )}
            {selectedType.outputs.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 6, textTransform: 'uppercase' as const }}>Outputs</div>
                {selectedType.outputs.map(p => (
                  <div key={p.portId} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, fontSize: 12, color: '#6b7280' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: PORT_COLORS[p.dataType] ?? '#888' }} />
                    {p.label} <span style={{ fontSize: 10, color: '#4b5563' }}>({p.dataType})</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pause indicator */}
            {selectedType.pauses && (
              <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(155,89,182,0.1)', border: '1px solid rgba(155,89,182,0.3)', fontSize: 12, color: '#BB86D6' }}>
                This node pauses the workflow for human input
              </div>
            )}

            {/* Config Form */}
            <div style={{ borderTop: '1px solid #e1eaef', paddingTop: 12, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>Configuration</div>
              {Object.entries(selectedType.configSchema).map(([key, def]) => (
                <ConfigField key={key} fieldKey={key} fieldDef={def}
                  value={selectedNode.config[key]} onChange={(k, v) => updateConfig(selectedNode.id, k, v)} />
              ))}
            </div>

            {/* Type ID */}
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#4b5563', marginBottom: 4, textTransform: 'uppercase' as const }}>Type ID</div>
              <div style={{ fontSize: 11, fontFamily: "'IBM Plex Mono', monospace", color: '#9ca3af', background: '#f7f9fa', padding: '6px 10px', borderRadius: 6 }}>
                {selectedType.typeId}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
