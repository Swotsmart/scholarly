/**
 * S&R Workflow Engine + Migration Template — Test Suite
 * 37 tests: 7 registry, 8 validator, 5 topo sort, 10 runner, 7 migration template + E2E
 */

import {
  success, failure, Errors, Result, NodeOutput,
  NodeTypeDefinition, NodeTypeRegistry, NodeExecutionContext,
  WorkflowDefinition, WorkflowRun, WorkflowRunStore,
  WorkflowRunner, WorkflowServices,
  validateWorkflow, topologicalSort, WORKFLOW_EVENTS,
} from './sr-workflow-engine';

import {
  registerMigrationNodes, createMigrationWorkflowTemplate,
  createHumanReviewNode, createInfrastructureCutoverNode, createQualityAuditNode,
  PlatformSourceClient, DataLakeAdapter, TransformService, CutoverService,
  MigrationRepo, ContentRepo, FileStorageService,
} from './sr-migration-workflow-template';

// ── Helpers ─────────────────────────────────────────────────────────────

function assert(cond: boolean, msg: string): asserts cond { if (!cond) throw new Error(`FAIL: ${msg}`); }

/** Narrow a Result to success, throwing on failure */
function unwrap<T>(r: Result<T>, label: string): T {
  if (!r.ok) throw new Error(`${label}: expected success, got error: ${r.error.message}`);
  return r.value;
}

/** Narrow a Result to failure, throwing on success */
function unwrapErr<T>(r: Result<T>, label: string): { code: string; message: string } {
  if (r.ok) throw new Error(`${label}: expected failure, got success`);
  return r.error;
}

function mockEventBus() {
  const log: Array<{ topic: string; payload: Record<string, unknown> }> = [];
  return { publish: async (t: string, p: Record<string, unknown>) => { log.push({ topic: t, payload: p }); }, log };
}

function mockRunStore(): WorkflowRunStore & { runs: Map<string, WorkflowRun> } {
  const runs = new Map<string, WorkflowRun>();
  return {
    runs,
    save: async (r: WorkflowRun) => { runs.set(r.runId, { ...r, portData: new Map(r.portData) }); },
    load: async (id: string) => { const r = runs.get(id); return r ? { ...r, portData: new Map(r.portData) } : null; },
    update: async (id: string, u: Partial<WorkflowRun>) => { const e = runs.get(id); if (e) runs.set(id, { ...e, ...u } as WorkflowRun); },
    findByWorkflow: async (wid: string, n?: number) => Array.from(runs.values()).filter(r => r.workflowId === wid).slice(0, n ?? 20),
  };
}

function mockServices(overrides?: Record<string, unknown>): WorkflowServices {
  const m = new Map<string, unknown>(Object.entries(overrides ?? {}));
  return {
    eventBus: { publish: async () => {} },
    dataLake: { writeToStaging: async () => success({ written: 0 }), readFromStaging: async () => success([]), runQualityChecks: async () => [] },
    cache: { get: async () => null, set: async () => {} },
    getService: <T>(name: string): T | null => (m.get(name) as T) ?? null,
  };
}

function tn(typeId: string, cat: 'SOURCE' | 'TRANSFORM' | 'ACTION', opts?: {
  inputs?: Array<{ portId: string; dataType: string; required: boolean }>;
  outputs?: Array<{ portId: string; dataType: string; required: boolean }>;
  pauses?: boolean;
  fn?: (ctx: NodeExecutionContext) => Promise<Result<NodeOutput>>;
}): NodeTypeDefinition {
  return {
    typeId, label: typeId, category: cat, description: typeId,
    inputs: (opts?.inputs ?? []).map(p => ({ ...p, label: p.portId })),
    outputs: (opts?.outputs ?? []).map(p => ({ ...p, label: p.portId })),
    configSchema: {},
    ...(opts?.pauses !== undefined ? { pausesWorkflow: opts.pauses } : {}),
    execute: opts?.fn ?? (async () => success({ result: 'ok' })),
  };
}

function w(
  nodes: Array<{ nodeId: string; typeId: string; config?: Record<string, unknown> }>,
  edges: Array<{ s: string; sp: string; t: string; tp: string }>,
): WorkflowDefinition {
  return {
    workflowId: 'wf_test', name: 'Test', description: '', version: 1,
    nodes: nodes.map(n => ({ nodeId: n.nodeId, typeId: n.typeId, config: n.config ?? {} })),
    edges: edges.map((e, i) => ({ edgeId: `e${i}`, sourceNodeId: e.s, sourcePortId: e.sp, targetNodeId: e.t, targetPortId: e.tp })),
    trigger: { type: 'manual' },
    metadata: { createdBy: 'u1', createdAt: new Date(), updatedAt: new Date(), tenantId: 't1', tags: [] },
  };
}

function makeRunner(registry: NodeTypeRegistry, svcOverrides?: Record<string, unknown>) {
  const eb = mockEventBus();
  const rs = mockRunStore();
  const runner = new WorkflowRunner({ registry, services: mockServices(svcOverrides), eventBus: eb, runStore: rs });
  return { runner, eb, rs };
}

// ── §1 Registry ─────────────────────────────────────────────────────────

function test_reg_register() {
  const r = new NodeTypeRegistry();
  unwrap(r.register(tn('sr:source:a', 'SOURCE')), 'register');
  assert(r.size === 1, 'size=1');
  assert(r.has('sr:source:a'), 'has');
}

function test_reg_dup() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:a', 'SOURCE'));
  const err = unwrapErr(r.register(tn('sr:source:a', 'SOURCE')), 'dup');
  assert(err.code === 'CONFLICT', 'CONFLICT');
}

function test_reg_dup_port() {
  const r = new NodeTypeRegistry();
  const res = r.register(tn('sr:source:a', 'SOURCE', {
    outputs: [{ portId: 'o', dataType: 'table', required: true }, { portId: 'o', dataType: 'table', required: true }],
  }));
  assert(!res.ok, 'dup port fails');
}

function test_reg_category() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:a', 'SOURCE'));
  r.register(tn('sr:source:b', 'SOURCE'));
  r.register(tn('sr:transform:c', 'TRANSFORM'));
  assert(r.getByCategory('SOURCE').length === 2, '2 SOURCE');
  assert(r.getByCategory('TRANSFORM').length === 1, '1 TRANSFORM');
  assert(r.getByCategory('ACTION').length === 0, '0 ACTION');
}

function test_reg_update() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:a', 'SOURCE'));
  unwrap(r.update({ ...tn('sr:source:a', 'SOURCE'), description: 'New' }), 'update');
  assert(r.get('sr:source:a')?.description === 'New', 'updated');
}

function test_reg_update_missing() {
  const r = new NodeTypeRegistry();
  const err = unwrapErr(r.update(tn('sr:source:x', 'SOURCE')), 'update missing');
  assert(err.code === 'NOT_FOUND', 'NOT_FOUND');
}

function test_reg_catalogue() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:a', 'SOURCE', { outputs: [{ portId: 'o', dataType: 'table', required: true }] }));
  const cat = r.getCatalogue();
  assert(cat.length === 1 && cat[0]!.typeId === 'sr:source:a', 'catalogue entry');
}

// ── §2 Validator ────────────────────────────────────────────────────────

function test_val_unknown() {
  const issues = validateWorkflow(w([{ nodeId: 'n1', typeId: 'sr:ghost' }], []), new NodeTypeRegistry());
  assert(issues.some(i => i.severity === 'error' && i.message.includes('Unknown')), 'unknown type');
}

function test_val_bad_edge() {
  const r = new NodeTypeRegistry(); r.register(tn('sr:source:a', 'SOURCE'));
  const issues = validateWorkflow(w([{ nodeId: 'n1', typeId: 'sr:source:a' }], [{ s: 'ghost', sp: 'o', t: 'n1', tp: 'i' }]), r);
  assert(issues.some(i => i.severity === 'error' && i.message.includes('non-existent source')), 'bad edge');
}

function test_val_type_mismatch() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:a', 'SOURCE', { outputs: [{ portId: 'o', dataType: 'table', required: true }] }));
  r.register(tn('sr:transform:b', 'TRANSFORM', { inputs: [{ portId: 'i', dataType: 'scalar', required: true }] }));
  const issues = validateWorkflow(w(
    [{ nodeId: 'n1', typeId: 'sr:source:a' }, { nodeId: 'n2', typeId: 'sr:transform:b' }],
    [{ s: 'n1', sp: 'o', t: 'n2', tp: 'i' }],
  ), r);
  assert(issues.some(i => i.message.includes('Type mismatch')), 'mismatch');
}

function test_val_any() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:a', 'SOURCE', { outputs: [{ portId: 'o', dataType: 'table', required: true }] }));
  r.register(tn('sr:action:b', 'ACTION', { inputs: [{ portId: 'i', dataType: 'any', required: true }] }));
  const issues = validateWorkflow(w(
    [{ nodeId: 'n1', typeId: 'sr:source:a' }, { nodeId: 'n2', typeId: 'sr:action:b' }],
    [{ s: 'n1', sp: 'o', t: 'n2', tp: 'i' }],
  ), r);
  assert(issues.filter(i => i.severity === 'error').length === 0, 'any accepts table');
}

function test_val_cycle() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:t:a', 'TRANSFORM', { inputs: [{ portId: 'i', dataType: 'any', required: false }], outputs: [{ portId: 'o', dataType: 'any', required: true }] }));
  const issues = validateWorkflow(w(
    [{ nodeId: 'n1', typeId: 'sr:t:a' }, { nodeId: 'n2', typeId: 'sr:t:a' }],
    [{ s: 'n1', sp: 'o', t: 'n2', tp: 'i' }, { s: 'n2', sp: 'o', t: 'n1', tp: 'i' }],
  ), r);
  assert(issues.some(i => i.message.includes('cycle')), 'cycle');
}

function test_val_required() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:t:f', 'TRANSFORM', { inputs: [{ portId: 'data', dataType: 'table', required: true }] }));
  const issues = validateWorkflow(w([{ nodeId: 'n1', typeId: 'sr:t:f' }], []), r);
  assert(issues.some(i => i.message.includes("Required input port 'data'")), 'required');
}

function test_val_disconnected() {
  const r = new NodeTypeRegistry(); r.register(tn('sr:source:a', 'SOURCE')); r.register(tn('sr:source:b', 'SOURCE'));
  const issues = validateWorkflow(w([{ nodeId: 'n1', typeId: 'sr:source:a' }, { nodeId: 'n2', typeId: 'sr:source:b' }], []), r);
  assert(issues.some(i => i.severity === 'warning' && i.message.includes('disconnected')), 'disconnected');
}

function test_val_valid() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:a', 'SOURCE', { outputs: [{ portId: 'rows', dataType: 'table', required: true }] }));
  r.register(tn('sr:t:b', 'TRANSFORM', { inputs: [{ portId: 'data', dataType: 'table', required: true }] }));
  const issues = validateWorkflow(w(
    [{ nodeId: 'n1', typeId: 'sr:source:a' }, { nodeId: 'n2', typeId: 'sr:t:b' }],
    [{ s: 'n1', sp: 'rows', t: 'n2', tp: 'data' }],
  ), r);
  assert(issues.filter(i => i.severity === 'error').length === 0, 'valid');
}

// ── §3 Topological Sort ─────────────────────────────────────────────────

function test_topo_linear() {
  const layers = unwrap(topologicalSort(w(
    [{ nodeId: 'a', typeId: 'x' }, { nodeId: 'b', typeId: 'x' }, { nodeId: 'c', typeId: 'x' }],
    [{ s: 'a', sp: 'o', t: 'b', tp: 'i' }, { s: 'b', sp: 'o', t: 'c', tp: 'i' }],
  )), 'topo linear');
  assert(layers.length === 3, '3 layers');
  assert(layers[0]!.nodeIds[0] === 'a', 'layer0=a');
  assert(layers[2]!.nodeIds[0] === 'c', 'layer2=c');
}

function test_topo_parallel() {
  const layers = unwrap(topologicalSort(w(
    [{ nodeId: 'a', typeId: 'x' }, { nodeId: 'b', typeId: 'x' }, { nodeId: 'c', typeId: 'x' }],
    [{ s: 'a', sp: 'o', t: 'c', tp: 'i1' }, { s: 'b', sp: 'o', t: 'c', tp: 'i2' }],
  )), 'topo parallel');
  assert(layers[0]!.nodeIds.length === 2, '2 parallel roots');
  assert(layers[1]!.nodeIds[0] === 'c', 'merge=c');
}

function test_topo_cycle() {
  const res = topologicalSort(w(
    [{ nodeId: 'a', typeId: 'x' }, { nodeId: 'b', typeId: 'x' }],
    [{ s: 'a', sp: 'o', t: 'b', tp: 'i' }, { s: 'b', sp: 'o', t: 'a', tp: 'i' }],
  ));
  assert(!res.ok, 'cycle fails');
}

function test_topo_single() {
  const layers = unwrap(topologicalSort(w([{ nodeId: 'solo', typeId: 'x' }], [])), 'single');
  assert(layers.length === 1, '1 layer');
}

function test_topo_diamond() {
  const layers = unwrap(topologicalSort(w(
    [{ nodeId: 'a', typeId: 'x' }, { nodeId: 'b', typeId: 'x' }, { nodeId: 'c', typeId: 'x' }, { nodeId: 'd', typeId: 'x' }],
    [{ s: 'a', sp: 'o', t: 'b', tp: 'i' }, { s: 'a', sp: 'o', t: 'c', tp: 'i' }, { s: 'b', sp: 'o', t: 'd', tp: 'i' }, { s: 'c', sp: 'o', t: 'd', tp: 'i' }],
  )), 'diamond');
  assert(layers.length === 3, '3 layers');
  assert(layers[1]!.nodeIds.length === 2, 'middle=2');
}

// ── §4 Runner ───────────────────────────────────────────────────────────

async function test_run_simple() {
  const r = new NodeTypeRegistry();
  let received: unknown = null;
  r.register(tn('sr:source:a', 'SOURCE', { outputs: [{ portId: 'data', dataType: 'table', required: true }], fn: async () => success({ data: [1, 2] }) }));
  r.register(tn('sr:action:b', 'ACTION', { inputs: [{ portId: 'in', dataType: 'table', required: true }], fn: async (ctx) => { received = ctx.inputs['in']; return success({ ok: 1 }); } }));
  const { runner } = makeRunner(r);
  const run = unwrap(await runner.execute(w([{ nodeId: 'n1', typeId: 'sr:source:a' }, { nodeId: 'n2', typeId: 'sr:action:b' }], [{ s: 'n1', sp: 'data', t: 'n2', tp: 'in' }]), 't1', 'u1'), 'exec');
  assert(run.status === 'completed', 'completed');
  assert(Array.isArray(received) && (received as unknown[]).length === 2, 'data passed');
}

async function test_run_pause_resume() {
  const r = new NodeTypeRegistry();
  let writeRan = false;
  r.register(tn('sr:source:a', 'SOURCE', { outputs: [{ portId: 'out', dataType: 'any', required: true }], fn: async () => success({ out: 'hi' }) }));
  r.register(tn('sr:action:rev', 'ACTION', { inputs: [{ portId: 'in', dataType: 'any', required: true }], outputs: [{ portId: 'out', dataType: 'any', required: true }], pauses: true, fn: async () => success({ __paused: true, __pauseReason: 'review' }) }));
  r.register(tn('sr:action:wr', 'ACTION', { inputs: [{ portId: 'in', dataType: 'any', required: true }], fn: async () => { writeRan = true; return success({ done: 1 }); } }));
  const { runner } = makeRunner(r);
  const workflow = w(
    [{ nodeId: 'src', typeId: 'sr:source:a' }, { nodeId: 'rev', typeId: 'sr:action:rev' }, { nodeId: 'wr', typeId: 'sr:action:wr' }],
    [{ s: 'src', sp: 'out', t: 'rev', tp: 'in' }, { s: 'rev', sp: 'out', t: 'wr', tp: 'in' }],
  );
  const exec = unwrap(await runner.execute(workflow, 't1', 'u1'), 'exec');
  assert(exec.status === 'paused' && exec.pausedAtNodeId === 'rev', 'paused at rev');
  assert(!writeRan, 'write not yet');
  const resumed = unwrap(await runner.resume(exec.runId, { out: 'approved' }, workflow), 'resume');
  assert(resumed.status === 'completed', 'completed');
  assert(writeRan, 'write ran');
}

async function test_run_fail() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:bad', 'SOURCE', { fn: async () => failure(Errors.internal('Boom')) }));
  const { runner } = makeRunner(r);
  const run = unwrap(await runner.execute(w([{ nodeId: 'n1', typeId: 'sr:source:bad' }], []), 't1', 'u1'), 'exec');
  assert(run.status === 'failed', 'failed');
  assert(run.error?.nodeId === 'n1', 'error at n1');
}

async function test_run_throw() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:x', 'SOURCE', { fn: async () => { throw new Error('Kaboom'); } }));
  const { runner } = makeRunner(r);
  const run = unwrap(await runner.execute(w([{ nodeId: 'n1', typeId: 'sr:source:x' }], []), 't1', 'u1'), 'exec');
  assert(run.status === 'failed' && (run.error?.message ?? '').includes('Kaboom'), 'throw caught');
}

async function test_run_cancel() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:action:p', 'ACTION', { pauses: true, fn: async () => success({ __paused: true, __pauseReason: 'wait' }) }));
  const { runner } = makeRunner(r);
  const exec = unwrap(await runner.execute(w([{ nodeId: 'n1', typeId: 'sr:action:p' }], []), 't1', 'u1'), 'exec');
  const cancelled = unwrap(await runner.cancel(exec.runId, 'bye'), 'cancel');
  assert(cancelled.status === 'cancelled', 'cancelled');
}

async function test_run_validation_fail() {
  const { runner } = makeRunner(new NodeTypeRegistry());
  const res = await runner.execute(w([{ nodeId: 'n1', typeId: 'sr:ghost' }], []), 't1', 'u1');
  assert(!res.ok && res.error.message.includes('validation error'), 'validation fail');
}

async function test_run_events() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:a', 'SOURCE', { fn: async () => success({ x: 1 }) }));
  const { runner, eb } = makeRunner(r);
  await runner.execute(w([{ nodeId: 'n1', typeId: 'sr:source:a' }], []), 't1', 'u1');
  const topics = eb.log.map(e => e.topic);
  assert(topics.includes(WORKFLOW_EVENTS.RUN_STARTED), 'RUN_STARTED');
  assert(topics.includes(WORKFLOW_EVENTS.NODE_COMPLETED), 'NODE_COMPLETED');
  assert(topics.includes(WORKFLOW_EVENTS.RUN_COMPLETED), 'RUN_COMPLETED');
}

async function test_run_history() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:a', 'SOURCE', { fn: async () => success({}) }));
  const { runner } = makeRunner(r);
  const workflow = w([{ nodeId: 'n1', typeId: 'sr:source:a' }], []);
  await runner.execute(workflow, 't1', 'u1');
  await runner.execute(workflow, 't1', 'u1');
  const hist = unwrap(await runner.getRunHistory('wf_test', 10), 'history');
  assert(hist.length === 2, '2 runs');
}

async function test_run_multi_pause() {
  const r = new NodeTypeRegistry();
  r.register(tn('sr:source:a', 'SOURCE', { outputs: [{ portId: 'o', dataType: 'any', required: true }], fn: async () => success({ o: 'd' }) }));
  r.register(tn('sr:action:p1', 'ACTION', { inputs: [{ portId: 'i', dataType: 'any', required: true }], outputs: [{ portId: 'o', dataType: 'any', required: true }], pauses: true, fn: async () => success({ __paused: true, __pauseReason: '1' }) }));
  r.register(tn('sr:action:p2', 'ACTION', { inputs: [{ portId: 'i', dataType: 'any', required: true }], outputs: [{ portId: 'o', dataType: 'any', required: true }], pauses: true, fn: async () => success({ __paused: true, __pauseReason: '2' }) }));
  r.register(tn('sr:action:end', 'ACTION', { inputs: [{ portId: 'i', dataType: 'any', required: true }], fn: async () => success({ done: 1 }) }));
  const { runner } = makeRunner(r);
  const workflow = w(
    [{ nodeId: 'src', typeId: 'sr:source:a' }, { nodeId: 'p1', typeId: 'sr:action:p1' }, { nodeId: 'p2', typeId: 'sr:action:p2' }, { nodeId: 'end', typeId: 'sr:action:end' }],
    [{ s: 'src', sp: 'o', t: 'p1', tp: 'i' }, { s: 'p1', sp: 'o', t: 'p2', tp: 'i' }, { s: 'p2', sp: 'o', t: 'end', tp: 'i' }],
  );
  const e1 = unwrap(await runner.execute(workflow, 't1', 'u1'), 'e1');
  assert(e1.status === 'paused' && e1.pausedAtNodeId === 'p1', 'pause1');
  const e2 = unwrap(await runner.resume(e1.runId, { o: 'r1' }, workflow), 'e2');
  assert(e2.status === 'paused' && e2.pausedAtNodeId === 'p2', 'pause2');
  const e3 = unwrap(await runner.resume(e2.runId, { o: 'r2' }, workflow), 'e3');
  assert(e3.status === 'completed', 'completed after 2 resumes');
}

// ── §5 Migration Template ───────────────────────────────────────────────

function test_mig_register() {
  const r = new NodeTypeRegistry(); registerMigrationNodes(r);
  assert(r.size === 8, `8 nodes, got ${r.size}`);
  for (const id of ['sr:source:platform-export', 'sr:source:cdc-extract', 'sr:transform:content-transform', 'sr:action:human-review', 'sr:action:service-import', 'sr:action:infrastructure-cutover', 'sr:source:health-monitor', 'sr:transform:quality-audit']) {
    assert(r.has(id), `has ${id}`);
  }
}

function test_mig_categories() {
  const r = new NodeTypeRegistry(); registerMigrationNodes(r);
  assert(r.getByCategory('SOURCE').length === 3, '3 SOURCE');
  assert(r.getByCategory('TRANSFORM').length === 2, '2 TRANSFORM');
  assert(r.getByCategory('ACTION').length === 3, '3 ACTION');
}

function test_mig_template() {
  const t = createMigrationWorkflowTemplate({ migrationId: 'mig_001', tenantId: 't1', userId: 'u1', userEmail: 'u@t.com', platform: 'squarespace', sourceUrl: 'https://t.com' });
  assert(t.nodes.length === 7, '7 nodes');
  assert(t.edges.length === 7, '7 edges');
  assert(t.metadata.templateId === 'tpl_platform_migration_v1', 'template id');
}

function test_mig_validates() {
  const r = new NodeTypeRegistry(); registerMigrationNodes(r);
  const t = createMigrationWorkflowTemplate({ migrationId: 'mig_001', tenantId: 't1', userId: 'u1', userEmail: 'u@t.com', platform: 'squarespace', sourceUrl: 'https://t.com' });
  const errs = validateWorkflow(t, r).filter(i => i.severity === 'error');
  assert(errs.length === 0, `no errors: ${errs.map(e => e.message).join('; ')}`);
}

function test_mig_review_pauses() { assert(createHumanReviewNode().pausesWorkflow === true, 'review pauses'); }
function test_mig_cutover_pauses() { assert(createInfrastructureCutoverNode().pausesWorkflow === true, 'cutover pauses'); }
function test_mig_quality_tracked() { assert(createQualityAuditNode().dataLakeTracked === true, 'quality tracked'); }

// ── §6 E2E ──────────────────────────────────────────────────────────────

async function test_e2e() {
  const r = new NodeTypeRegistry(); registerMigrationNodes(r);

  const svc: Record<string, unknown> = {
    'migration:sourceClient': {
      exportSite: async () => success({ pages: [{ id: 'p1', url: '/about', title: 'About', html: '<h1>Hi</h1>' }], products: [{ id: 'pr1', slug: 'v', title: 'V', description: 'd', price: 100, currency: 'AUD', images: [], variants: [] }], posts: [{ id: 'b1', slug: 'w', title: 'W', html: '<p>X</p>', publishedAt: '2025-01-01', author: 'M', tags: [] }], members: [{ email: 's@t.com', firstName: 'J', lastName: 'D', subscriptionStatus: 'active' }], navigation: [], siteSettings: {} }),
      downloadAsset: async () => success(new Uint8Array([1])),
    } as PlatformSourceClient,
    'migration:dataLakeAdapter': {
      registerMigration: () => ({ extract: {}, transform: {}, import: {} }),
      runExtraction: async () => success({ runId: 'e1', jobId: 'j1', status: 'completed', rowsExtracted: 4, rowsTransformed: 0, rowsLoaded: 0, rowsRejected: 0, durationMs: 10 }),
      runTransform: async () => success({ runId: 'e2', jobId: 'j2', status: 'completed', rowsExtracted: 4, rowsTransformed: 4, rowsLoaded: 0, rowsRejected: 0, durationMs: 10 }),
      runImport: async () => success({ runId: 'e3', jobId: 'j3', status: 'completed', rowsExtracted: 3, rowsTransformed: 3, rowsLoaded: 3, rowsRejected: 0, durationMs: 10, importDetails: { pages: 1, products: 1, members: 1, posts: 1, images: 0, totalImported: 4, totalFailed: 0, errors: [] } }),
      runQualityAudit: async () => success({ auditId: 'a1', qualityScore: 0.98, passed: 5, failed: 0, totalChecks: 5, meetsThreshold: true, results: [] }),
      getMigrationETLStatus: () => ({ registered: true, jobs: [] }),
    } as DataLakeAdapter,
    'migration:transformService': { runTransformation: async () => success({ totalItems: 4, transformed: 4, flaggedForReview: 1, byType: {} }) } as TransformService,
    'migration:cutoverService': {
      runPreflightChecks: async () => success({ ready: true, checks: [] }),
      provisionSsl: async () => success({}),
      executeCutover: async () => success({ success: true, domain: 't.com', dnsVerified: true, sslActive: true, proxyActive: true }),
      rollback: async () => success({}),
      runHealthCheck: async () => success({ status: 'healthy' as const, checks: [{ name: 'dns', status: 'pass', responseTimeMs: 5, detail: 'OK' }], checkedAt: new Date() }),
    } as CutoverService,
    'migration:fileStorage': { upload: async () => success({ url: 'https://cdn/img.jpg' }) } as FileStorageService,
    'migration:migrationRepo': { findById: async () => ({ id: 'mig_001', tenantId: 't1', source: 'squarespace', sourceUrl: 'https://t.com', ownerId: 'u1', ownerEmail: 'u@t.com', status: 'created' }), findByOwner: async () => [], save: async (_t: string, m: unknown) => m, update: async () => {} } as MigrationRepo,
    'migration:contentRepo': { saveBatch: async () => {}, findByMigration: async () => [] } as ContentRepo,
  };

  const { runner } = makeRunner(r, svc);
  const template = createMigrationWorkflowTemplate({ migrationId: 'mig_001', tenantId: 't1', userId: 'u1', userEmail: 'u@t.com', platform: 'squarespace', sourceUrl: 'https://t.com' });

  // Run → pause at Review
  const e1 = unwrap(await runner.execute(template, 't1', 'u1'), 'e2e exec');
  assert(e1.status === 'paused', `paused, got ${e1.status}`);
  assert(e1.pausedAtNodeId === 'review', `at review, got ${e1.pausedAtNodeId}`);
  assert(e1.nodeRuns.find(n => n.nodeId === 'source')?.status === 'completed', 'source done');
  assert(e1.nodeRuns.find(n => n.nodeId === 'cdc')?.status === 'completed', 'cdc done');
  assert(e1.nodeRuns.find(n => n.nodeId === 'transform')?.status === 'completed', 'transform done');

  // Resume → pause at Cutover
  const e2 = unwrap(await runner.resume(e1.runId, { approved: [{ id: 'ci_1' }], reviewStats: { total: 4, approved: 3 } }, template), 'e2e resume1');
  assert(e2.status === 'paused' && e2.pausedAtNodeId === 'cutover', 'paused at cutover');
  assert(e2.nodeRuns.find(n => n.nodeId === 'import')?.status === 'completed', 'import done');

  // Resume → complete with health check
  const e3 = unwrap(await runner.resume(e2.runId, { cutoverResult: { success: true, domain: 't.com' } }, template), 'e2e resume2');
  assert(e3.status === 'completed', `completed, got ${e3.status}`);
  assert(e3.nodeRuns.find(n => n.nodeId === 'health')?.status === 'completed', 'health done');
  assert(e3.nodeRuns.every(n => n.status === 'completed'), `all completed: ${e3.nodeRuns.map(n => `${n.nodeId}=${n.status}`).join(', ')}`);
}

// ── Runner ──────────────────────────────────────────────────────────────

const tests: Array<{ name: string; fn: () => void | Promise<void> }> = [
  { name: 'Registry: register', fn: test_reg_register },
  { name: 'Registry: duplicate', fn: test_reg_dup },
  { name: 'Registry: dup port', fn: test_reg_dup_port },
  { name: 'Registry: category', fn: test_reg_category },
  { name: 'Registry: update', fn: test_reg_update },
  { name: 'Registry: update missing', fn: test_reg_update_missing },
  { name: 'Registry: catalogue', fn: test_reg_catalogue },
  { name: 'Validator: unknown type', fn: test_val_unknown },
  { name: 'Validator: bad edge', fn: test_val_bad_edge },
  { name: 'Validator: type mismatch', fn: test_val_type_mismatch },
  { name: 'Validator: any type', fn: test_val_any },
  { name: 'Validator: cycle', fn: test_val_cycle },
  { name: 'Validator: required port', fn: test_val_required },
  { name: 'Validator: disconnected', fn: test_val_disconnected },
  { name: 'Validator: valid workflow', fn: test_val_valid },
  { name: 'TopoSort: linear', fn: test_topo_linear },
  { name: 'TopoSort: parallel', fn: test_topo_parallel },
  { name: 'TopoSort: cycle', fn: test_topo_cycle },
  { name: 'TopoSort: single', fn: test_topo_single },
  { name: 'TopoSort: diamond', fn: test_topo_diamond },
  { name: 'Runner: simple', fn: test_run_simple },
  { name: 'Runner: pause+resume', fn: test_run_pause_resume },
  { name: 'Runner: fail', fn: test_run_fail },
  { name: 'Runner: throw', fn: test_run_throw },
  { name: 'Runner: cancel', fn: test_run_cancel },
  { name: 'Runner: validation fail', fn: test_run_validation_fail },
  { name: 'Runner: events', fn: test_run_events },
  { name: 'Runner: history', fn: test_run_history },
  { name: 'Runner: multi pause', fn: test_run_multi_pause },
  { name: 'Migration: registration', fn: test_mig_register },
  { name: 'Migration: categories', fn: test_mig_categories },
  { name: 'Migration: template', fn: test_mig_template },
  { name: 'Migration: validates', fn: test_mig_validates },
  { name: 'Migration: review pauses', fn: test_mig_review_pauses },
  { name: 'Migration: cutover pauses', fn: test_mig_cutover_pauses },
  { name: 'Migration: quality tracked', fn: test_mig_quality_tracked },
  { name: 'E2E: migration workflow', fn: test_e2e },
];

async function run() {
  let pass = 0, fail = 0; const errs: string[] = [];
  for (const t of tests) {
    try { await t.fn(); pass++; console.log(`  ✓ ${t.name}`); }
    catch (e) { fail++; const m = e instanceof Error ? e.message : String(e); errs.push(`${t.name}: ${m}`); console.log(`  ✗ ${t.name}: ${m}`); }
  }
  console.log(`\n${'='.repeat(60)}\n  ${pass + fail} tests: ${pass} passed, ${fail} failed\n${'='.repeat(60)}`);
  if (errs.length > 0) { console.log('\nFAILURES:'); for (const e of errs) console.log(`  - ${e}`); process.exit(1); }
}

run().catch(e => { console.error('Crash:', e); process.exit(1); });
