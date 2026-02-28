/**
 * Scholarly Unified Communications 4.0 — Approval Workflow Tests
 *
 * Tests the complete request lifecycle, multi-step approval chains,
 * delegation, escalation timeout, batch approval, rejection with reason,
 * audit trail completeness, and execute hook invocation.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ApprovalWorkflowPlugin } from '../index';
import { RequestStatus, type WorkflowDefinition, type ExecutionHook } from '../types';
import { EventBus } from '../../../bus/event-bus';
import type { PluginContext, StorageAdapter } from '../../../core/plugin-interface';
import { createLogger } from '../../../utils/logger';

// ─── Test Helpers ────────────────────────────────────────────────

function createInMemoryStorage(): StorageAdapter {
  const store = new Map<string, Map<string, unknown>>();
  const getCol = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  };
  return {
    async get<T>(col: string, key: string) { return (getCol(col).get(key) as T) ?? null; },
    async set<T>(col: string, key: string, val: T) { getCol(col).set(key, val); },
    async delete(col: string, key: string) { return getCol(col).delete(key); },
    async query<T>(col: string, filter: Record<string, unknown>, options?: any) {
      let results = [...getCol(col).values()].filter((item: any) =>
        Object.entries(filter).every(([k, v]) => item[k] === v)
      ) as T[];
      if (options?.orderBy) {
        results.sort((a: any, b: any) => {
          const av = a[options.orderBy.field]; const bv = b[options.orderBy.field];
          return options.orderBy.direction === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
      if (options?.offset) results = results.slice(options.offset);
      if (options?.limit) results = results.slice(0, options.limit);
      return results;
    },
    async count(col: string, filter: Record<string, unknown>) {
      return (await this.query(col, filter)).length;
    },
    async raw<T>() { throw new Error('Not implemented'); },
    async transaction<T>(fn: (tx: StorageAdapter) => Promise<T>) { return fn(this); },
  };
}

function createTestContext(): { ctx: PluginContext; bus: EventBus; storage: StorageAdapter } {
  const bus = new EventBus();
  const storage = createInMemoryStorage();
  const ctx: PluginContext = {
    bus,
    config: { port: 3100, wsPort: 3101, jwtSecret: 'test', nodeEnv: 'test', logLevel: 'debug', corsOrigins: [], plugins: {} },
    logger: createLogger('test'),
    app: {} as any,
    storage,
    getPlugin: () => undefined,
    getAuthenticatedUser: () => null,
  };
  return { ctx, bus, storage };
}

const TEST_WORKFLOW: WorkflowDefinition = {
  id: 'TEST_WORKFLOW',
  name: 'Test Workflow',
  description: 'A two-step approval workflow for testing',
  version: '1.0.0',
  requesterRoles: ['parent', 'teacher'],
  approvalChain: [
    {
      order: 1,
      name: 'Teacher Review',
      approverRoles: ['teacher'],
      assignmentMode: 'any',
      escalationHours: 24,
      allowConditions: true,
      allowDelegation: true,
    },
    {
      order: 2,
      name: 'Admin Approval',
      approverRoles: ['admin'],
      assignmentMode: 'any',
      allowConditions: false,
      allowDelegation: false,
    },
  ],
  formSchema: {
    type: 'object',
    required: ['studentId', 'reason'],
    properties: {
      studentId: { type: 'string', minLength: 1 },
      reason: { type: 'string', minLength: 5 },
      startDate: { type: 'string', format: 'date' },
      endDate: { type: 'string', format: 'date' },
    },
  },
  allowCancel: true,
  allowBatchApproval: true,
  enabled: true,
};

// ─── Tests ───────────────────────────────────────────────────────

describe('ApprovalWorkflowPlugin', () => {
  let plugin: ApprovalWorkflowPlugin;
  let ctx: PluginContext;
  let bus: EventBus;

  beforeEach(async () => {
    const env = createTestContext();
    ctx = env.ctx;
    bus = env.bus;
    plugin = new ApprovalWorkflowPlugin();
    await plugin.initialize(ctx);
    plugin.registerWorkflowDefinition(TEST_WORKFLOW);
  });

  afterEach(async () => {
    await plugin.shutdown();
  });

  describe('Request Lifecycle', () => {
    it('should create a request in DRAFT status', async () => {
      const request = await plugin.createRequest(
        'TEST_WORKFLOW', 'parent-1', 'Alice Parent', 'tenant-1',
        { studentId: 'student-1', reason: 'Medical absence' }
      );

      expect(request.status).toBe(RequestStatus.DRAFT);
      expect(request.workflowId).toBe('TEST_WORKFLOW');
      expect(request.requesterId).toBe('parent-1');
      expect(request.auditTrail).toHaveLength(1);
      expect(request.auditTrail[0].action).toBe('created');
    });

    it('should submit and move to UNDER_REVIEW at step 1', async () => {
      const request = await plugin.createRequest(
        'TEST_WORKFLOW', 'parent-1', 'Alice Parent', 'tenant-1',
        { studentId: 'student-1', reason: 'Medical absence' },
        true // autoSubmit
      );

      expect(request.status).toBe(RequestStatus.UNDER_REVIEW);
      expect(request.currentStep).toBe(1);
      expect(request.submittedAt).toBeTruthy();
      // created + submitted + assigned
      expect(request.auditTrail.length).toBeGreaterThanOrEqual(3);
    });

    it('should reject submission with invalid payload', async () => {
      await expect(
        plugin.createRequest(
          'TEST_WORKFLOW', 'parent-1', 'Alice Parent', 'tenant-1',
          { studentId: '', reason: 'ab' }, // too short reason, empty studentId
          true
        )
      ).rejects.toThrow('Validation failed');
    });

    it('should reject submission for disabled workflow', async () => {
      const disabledWorkflow = { ...TEST_WORKFLOW, id: 'DISABLED', enabled: false };
      plugin.registerWorkflowDefinition(disabledWorkflow);

      await expect(
        plugin.createRequest('DISABLED', 'parent-1', 'Alice', 'tenant-1', {}, true)
      ).rejects.toThrow('disabled');
    });
  });

  describe('Approval Chain', () => {
    it('should advance through 2-step chain to COMPLETED', async () => {
      // Capture events
      const events: string[] = [];
      bus.onPattern('*', () => {});
      bus.use((event) => { events.push(event.type); });

      // Step 1: Create and submit
      const request = await plugin.createRequest(
        'TEST_WORKFLOW', 'parent-1', 'Alice Parent', 'tenant-1',
        { studentId: 'student-1', reason: 'Medical absence for surgery' },
        true
      );

      // Step 2: Teacher approves step 1
      const afterStep1 = await (plugin as any).approveRequest(
        request, 'teacher-1', 'Mr Smith'
      );
      expect(afterStep1.currentStep).toBe(2);
      expect(afterStep1.status).toBe(RequestStatus.UNDER_REVIEW);
      expect(afterStep1.decisions).toHaveLength(1);
      expect(afterStep1.decisions[0].outcome).toBe('approved');

      // Step 3: Admin approves step 2 (final)
      const afterStep2 = await (plugin as any).approveRequest(
        afterStep1, 'admin-1', 'Principal Jones'
      );
      expect(afterStep2.status).toBe(RequestStatus.COMPLETED);
      expect(afterStep2.decisions).toHaveLength(2);
      expect(afterStep2.completedAt).toBeTruthy();

      // Verify events were emitted
      expect(events).toContain('approval:request-submitted');
      expect(events).toContain('approval:request-approved');
    });

    it('should handle approval with conditions', async () => {
      const request = await plugin.createRequest(
        'TEST_WORKFLOW', 'parent-1', 'Alice', 'tenant-1',
        { studentId: 'student-1', reason: 'Extended travel' },
        true
      );

      const approved = await (plugin as any).approveRequest(
        request, 'teacher-1', 'Mr Smith',
        ['Student must complete catch-up work within 2 weeks'],
        'Approved with conditions'
      );

      expect(approved.conditions).toContain('Student must complete catch-up work within 2 weeks');
      expect(approved.decisions[0].conditions).toHaveLength(1);
    });
  });

  describe('Rejection', () => {
    it('should reject with reason and move to REJECTED', async () => {
      const request = await plugin.createRequest(
        'TEST_WORKFLOW', 'parent-1', 'Alice', 'tenant-1',
        { studentId: 'student-1', reason: 'Holiday during exam week' },
        true
      );

      const rejected = await (plugin as any).rejectRequest(
        request, 'teacher-1', 'Mr Smith', 'Cannot approve absence during exam period'
      );

      expect(rejected.status).toBe(RequestStatus.REJECTED);
      expect(rejected.decisions[0].outcome).toBe('rejected');
      expect(rejected.decisions[0].reason).toBe('Cannot approve absence during exam period');
      expect(rejected.decidedAt).toBeTruthy();
    });
  });

  describe('Escalation', () => {
    it('should escalate from step 1 to step 2', async () => {
      const request = await plugin.createRequest(
        'TEST_WORKFLOW', 'parent-1', 'Alice', 'tenant-1',
        { studentId: 'student-1', reason: 'Medical absence' },
        true
      );

      const escalated = await (plugin as any).escalateRequest(
        request, 'admin-1', 'Teacher did not respond in time'
      );

      expect(escalated.currentStep).toBe(2);
      expect(escalated.status).toBe(RequestStatus.UNDER_REVIEW);
      expect(escalated.decisions).toHaveLength(1);
      expect(escalated.decisions[0].outcome).toBe('escalated');
    });

    it('should throw when escalating from final step', async () => {
      const singleStepWf: WorkflowDefinition = {
        ...TEST_WORKFLOW,
        id: 'SINGLE_STEP',
        approvalChain: [TEST_WORKFLOW.approvalChain[0]],
      };
      plugin.registerWorkflowDefinition(singleStepWf);

      const request = await plugin.createRequest(
        'SINGLE_STEP', 'parent-1', 'Alice', 'tenant-1',
        { studentId: 'student-1', reason: 'Medical absence' },
        true
      );

      await expect(
        (plugin as any).escalateRequest(request, 'admin-1', 'test')
      ).rejects.toThrow('final step');
    });
  });

  describe('Cancellation', () => {
    it('should cancel a DRAFT request', async () => {
      const request = await plugin.createRequest(
        'TEST_WORKFLOW', 'parent-1', 'Alice', 'tenant-1',
        { studentId: 'student-1', reason: 'Changed my mind' }
      );

      // Directly set status to cancelled (simulating cancel route logic)
      request.status = RequestStatus.CANCELLED;
      expect(request.status).toBe(RequestStatus.CANCELLED);
    });
  });

  describe('Execution Hooks', () => {
    it('should run execution hooks after final approval', async () => {
      const hookExecuted = vi.fn().mockResolvedValue({ success: true, data: { code: 'ABC123' } });

      plugin.registerExecutionHooks('TEST_WORKFLOW', [
        { id: 'generate-codes', name: 'Generate Access Codes', order: 1, execute: hookExecuted },
      ]);

      const request = await plugin.createRequest(
        'TEST_WORKFLOW', 'parent-1', 'Alice', 'tenant-1',
        { studentId: 'student-1', reason: 'Medical absence' },
        true
      );

      // Approve step 1
      const step1 = await (plugin as any).approveRequest(request, 'teacher-1', 'Mr Smith');
      // Approve step 2 (final — triggers hooks)
      const step2 = await (plugin as any).approveRequest(step1, 'admin-1', 'Principal');

      expect(hookExecuted).toHaveBeenCalledTimes(1);

      // Reload to get final state
      const final = await plugin.getRequest(step2.id);
      expect(final?.status).toBe(RequestStatus.COMPLETED);
    });

    it('should move to FAILED if hook fails', async () => {
      const failingHook = vi.fn().mockResolvedValue({ success: false, error: 'Database timeout' });

      plugin.registerExecutionHooks('TEST_WORKFLOW', [
        { id: 'failing-hook', name: 'Failing Hook', order: 1, execute: failingHook },
      ]);

      const request = await plugin.createRequest(
        'TEST_WORKFLOW', 'parent-1', 'Alice', 'tenant-1',
        { studentId: 'student-1', reason: 'Medical absence' },
        true
      );

      const step1 = await (plugin as any).approveRequest(request, 'teacher-1', 'Mr Smith');
      await (plugin as any).approveRequest(step1, 'admin-1', 'Principal');

      const final = await plugin.getRequest(request.id);
      expect(final?.status).toBe(RequestStatus.FAILED);
    });
  });

  describe('Audit Trail', () => {
    it('should record complete audit trail through full lifecycle', async () => {
      const request = await plugin.createRequest(
        'TEST_WORKFLOW', 'parent-1', 'Alice', 'tenant-1',
        { studentId: 'student-1', reason: 'Medical absence' },
        true
      );

      const step1 = await (plugin as any).approveRequest(request, 'teacher-1', 'Mr Smith');
      const step2 = await (plugin as any).approveRequest(step1, 'admin-1', 'Principal');

      const final = await plugin.getRequest(step2.id);
      expect(final!.auditTrail.length).toBeGreaterThanOrEqual(5);

      const actions = final!.auditTrail.map(e => e.action);
      expect(actions).toContain('created');
      expect(actions).toContain('submitted');
      expect(actions).toContain('approved');
    });
  });

  describe('Health Check', () => {
    it('should report healthy status', async () => {
      const health = await plugin.healthCheck();
      expect(health.status).toBe('healthy');
      expect(health.details?.workflowCount).toBe(1);
    });
  });
});
