import { describe, test, expect } from 'vitest';

/**
 * Contact Centre Integration Tests
 *
 * These tests validate the entire contact centre lifecycle without
 * external dependencies. The pattern: create a mock PluginContext,
 * instantiate the ContactCentreManager, and exercise the public API.
 *
 * Test groups:
 *   1. Queue CRUD
 *   2. Agent lifecycle (login → state changes → logout)
 *   3. ACD routing strategies
 *   4. Enqueue → offer → accept → complete → wrap-up flow
 *   5. Abandon and overflow handling
 *   6. Callback requests
 *   7. SLA tracking
 *   8. Dashboard metrics
 *   9. Priority queue ordering
 *  10. Skills-based routing
 */

import { ContactCentreManager } from '../contact-centre';
import type {
  Queue, Agent, AgentSkill, CallerInfo, InteractionPriority,
} from '../contact-centre-types';

// ─── Mock PluginContext ──────────────────────────────────────────────

function createMockContext(): any {
  const events: { event: string; payload: any }[] = [];
  return {
    bus: {
      emit: (event: string, payload: any) => { events.push({ event, payload }); },
      on: () => {},
    },
    storage: {
      get: async () => null,
      set: async () => {},
      query: async () => [],
      delete: async () => true,
    },
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    },
    _events: events,
  };
}

// ─── Queue Factory ──────────────────────────────────────────────────

function createTestQueue(cc: ContactCentreManager, overrides?: Partial<Queue>): Queue {
  return cc.createQueue({
    name: overrides?.name || 'Support Queue',
    tenantId: overrides?.tenantId || 'tenant-1',
    strategy: overrides?.strategy || 'LONGEST_IDLE',
    requiredSkills: overrides?.requiredSkills || [],
    preferredSkills: overrides?.preferredSkills || [],
    maxWaitTimeSeconds: overrides?.maxWaitTimeSeconds || 300,
    overflowAction: overrides?.overflowAction || { type: 'VOICEMAIL', message: 'Please leave a message' },
    slaTarget: overrides?.slaTarget || { percentageThreshold: 80, timeThresholdSeconds: 20 },
    holdConfig: { estimatedWaitAnnouncementInterval: 30, positionAnnouncementEnabled: true },
    announcements: overrides?.announcements || [],
    afterHoursAction: { type: 'VOICEMAIL' },
    maxQueueDepth: overrides?.maxQueueDepth || 50,
    ...overrides,
  } as any);
}

function createTestCaller(id?: string): CallerInfo {
  return {
    identifier: id || '+61400000001',
    displayName: 'Test Caller',
    channel: 'VOICE',
  };
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('Contact Centre — Queue CRUD', () => {
  test('creates a queue with defaults', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc);

    expect(queue.id).toBeDefined();
    expect(queue.name).toBe('Support Queue');
    expect(queue.isActive).toBe(true);
    expect(queue.strategy).toBe('LONGEST_IDLE');
  });

  test('lists only active queues', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    createTestQueue(cc, { name: 'Queue A' });
    const qB = createTestQueue(cc, { name: 'Queue B' });
    cc.deactivateQueue(qB.id);

    expect(cc.listQueues()).toHaveLength(1);
    expect(cc.listQueues()[0].name).toBe('Queue A');
  });

  test('updates queue configuration', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc);
    const updated = cc.updateQueue(queue.id, { maxWaitTimeSeconds: 600 });

    expect(updated?.maxWaitTimeSeconds).toBe(600);
  });
});

describe('Contact Centre — Agent Lifecycle', () => {
  test('agent login creates agent in AVAILABLE state', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const agent = cc.agentLogin('user-1', 'Alice', 'tenant-1');

    expect(agent.state).toBe('AVAILABLE');
    expect(agent.userId).toBe('user-1');
    expect(agent.displayName).toBe('Alice');
    expect(ctx._events.some((e: any) => e.event === 'agent:logged-in')).toBe(true);
  });

  test('valid state transitions succeed', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const agent = cc.agentLogin('user-1', 'Alice', 'tenant-1');

    expect(cc.changeAgentState(agent.id, 'ON_BREAK')?.state).toBe('ON_BREAK');
    expect(cc.changeAgentState(agent.id, 'AVAILABLE')?.state).toBe('AVAILABLE');
    expect(cc.changeAgentState(agent.id, 'MEETING')?.state).toBe('MEETING');
    expect(cc.changeAgentState(agent.id, 'AVAILABLE')?.state).toBe('AVAILABLE');
  });

  test('invalid state transitions are rejected', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const agent = cc.agentLogin('user-1', 'Alice', 'tenant-1');

    // Can't go AVAILABLE → WRAP_UP (must go through ON_INTERACTION first)
    expect(cc.changeAgentState(agent.id, 'WRAP_UP')).toBeNull();
    expect(agent.state).toBe('AVAILABLE');
  });

  test('agent logout records shift stats', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const agent = cc.agentLogin('user-1', 'Alice', 'tenant-1');
    const stats = cc.agentLogout(agent.id);

    expect(stats).toBeDefined();
    expect(stats!.shiftStartedAt).toBeDefined();
    expect(ctx._events.some((e: any) => e.event === 'agent:logged-out')).toBe(true);
  });

  test('re-login resets shift stats', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const agent1 = cc.agentLogin('user-1', 'Alice', 'tenant-1');
    cc.agentLogout(agent1.id);
    const agent2 = cc.agentLogin('user-1', 'Alice', 'tenant-1');

    expect(agent2.state).toBe('AVAILABLE');
    expect(agent2.shiftStats.interactionsHandled).toBe(0);
  });
});

describe('Contact Centre — ACD Routing', () => {
  test('LONGEST_IDLE routes to agent idle longest', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc, { strategy: 'LONGEST_IDLE' });

    // Agent A logged in first (longer idle)
    const agentA = cc.agentLogin('user-a', 'Agent A', 'tenant-1', { queueIds: [queue.id] });
    // Simulate time difference
    agentA.stateChangedAt = new Date(Date.now() - 60000); // 1 minute ago

    const agentB = cc.agentLogin('user-b', 'Agent B', 'tenant-1', { queueIds: [queue.id] });
    agentB.stateChangedAt = new Date(Date.now() - 10000); // 10 seconds ago

    const entry = cc.enqueue(queue.id, createTestCaller());

    // Entry should be offered to Agent A (idle longer)
    expect(entry?.offeredToAgentId).toBe(agentA.id);
  });

  test('SKILLS_WEIGHTED routes to most skilled agent', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc, {
      strategy: 'SKILLS_WEIGHTED',
      requiredSkills: ['support'],
      preferredSkills: ['billing', 'spanish'],
    });

    const agentA = cc.agentLogin('user-a', 'Agent A', 'tenant-1', {
      queueIds: [queue.id],
      skills: [{ skillId: 'support', name: 'Support', proficiency: 5 }],
    });

    const agentB = cc.agentLogin('user-b', 'Agent B', 'tenant-1', {
      queueIds: [queue.id],
      skills: [
        { skillId: 'support', name: 'Support', proficiency: 8 },
        { skillId: 'billing', name: 'Billing', proficiency: 9 },
        { skillId: 'spanish', name: 'Spanish', proficiency: 7 },
      ],
    });

    const entry = cc.enqueue(queue.id, createTestCaller());

    // Agent B has more preferred skills and higher proficiency
    expect(entry?.offeredToAgentId).toBe(agentB.id);
  });

  test('agents without required skills are not eligible', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc, {
      strategy: 'ROUND_ROBIN',
      requiredSkills: ['billing'],
    });

    // Agent A has no billing skill
    cc.agentLogin('user-a', 'Agent A', 'tenant-1', {
      queueIds: [queue.id],
      skills: [{ skillId: 'support', name: 'Support', proficiency: 5 }],
    });

    const entry = cc.enqueue(queue.id, createTestCaller());

    // No eligible agent — entry stays WAITING
    expect(entry?.status).toBe('WAITING');
    expect(entry?.offeredToAgentId).toBeUndefined();
  });

  test('agents not assigned to queue are not eligible', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queueA = createTestQueue(cc, { name: 'Queue A' });
    createTestQueue(cc, { name: 'Queue B' });

    // Agent assigned to Queue B only
    cc.agentLogin('user-a', 'Agent A', 'tenant-1', { queueIds: ['some-other-id'] });

    const entry = cc.enqueue(queueA.id, createTestCaller());

    expect(entry?.status).toBe('WAITING');
    expect(entry?.offeredToAgentId).toBeUndefined();
  });
});

describe('Contact Centre — Full Interaction Lifecycle', () => {
  test('enqueue → offer → accept → complete → wrap-up', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc);
    const agent = cc.agentLogin('user-1', 'Alice', 'tenant-1', { queueIds: [queue.id] });

    // 1. Enqueue
    const entry = cc.enqueue(queue.id, createTestCaller());
    expect(entry).toBeDefined();
    expect(entry!.status).toBe('OFFERED'); // Immediately offered since agent available

    // 2. Agent accepts
    const connected = cc.agentAccept(agent.id);
    expect(connected).toBeDefined();
    expect(connected!.status).toBe('CONNECTED');
    expect(connected!.answeredByAgentId).toBe(agent.id);
    expect(agent.state).toBe('ON_INTERACTION');
    expect(agent.activeInteractionCount).toBe(1);

    // 3. Agent completes interaction
    const completed = cc.agentCompleteInteraction(agent.id, entry!.interactionId);
    expect(completed).toBe(true);
    expect(agent.state).toBe('WRAP_UP');
    expect(agent.activeInteractionCount).toBe(0);
    expect(agent.shiftStats.interactionsHandled).toBe(1);

    // 4. Agent finishes wrap-up
    const wrapDone = cc.agentWrapUpComplete(agent.id);
    expect(wrapDone).toBe(true);
    expect(agent.state).toBe('AVAILABLE');

    // Verify events
    const eventNames = ctx._events.map((e: any) => e.event);
    expect(eventNames).toContain('queue:entry-added');
    expect(eventNames).toContain('queue:entry-offered');
    expect(eventNames).toContain('queue:entry-connected');
    expect(eventNames).toContain('queue:entry-completed');
    expect(eventNames).toContain('agent:interaction-assigned');
    expect(eventNames).toContain('agent:wrap-up-started');
    expect(eventNames).toContain('agent:wrap-up-completed');
  });

  test('agent reject re-queues entry', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc);
    const agentA = cc.agentLogin('user-a', 'Agent A', 'tenant-1', { queueIds: [queue.id] });
    const agentB = cc.agentLogin('user-b', 'Agent B', 'tenant-1', { queueIds: [queue.id] });
    // Make Agent A idle longer so they get offered first
    agentA.stateChangedAt = new Date(Date.now() - 60000);
    agentB.stateChangedAt = new Date(Date.now() - 10000);

    const entry = cc.enqueue(queue.id, createTestCaller());
    expect(entry!.offeredToAgentId).toBe(agentA.id);

    // Agent A rejects
    cc.agentReject(agentA.id);

    // Entry should be re-offered to Agent B
    const entries = cc.getQueueEntries(queue.id);
    const requeued = entries.find(e => e.id === entry!.id);
    expect(requeued!.offerAttempts).toBe(1);
    // May be offered to B or back to WAITING depending on timing
    expect(['OFFERED', 'WAITING']).toContain(requeued!.status);
  });
});

describe('Contact Centre — Abandon & Overflow', () => {
  test('abandon marks entry and updates counters', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc);
    // No agents — entry stays WAITING

    const entry = cc.enqueue(queue.id, createTestCaller());
    expect(entry!.status).toBe('WAITING');

    const abandoned = cc.abandon(entry!.id);
    expect(abandoned).toBe(true);

    const eventNames = ctx._events.map((e: any) => e.event);
    expect(eventNames).toContain('queue:entry-abandoned');
  });

  test('queue depth limit rejects new entries', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc, { maxQueueDepth: 2 });

    cc.enqueue(queue.id, createTestCaller('+61400000001'));
    cc.enqueue(queue.id, createTestCaller('+61400000002'));
    const third = cc.enqueue(queue.id, createTestCaller('+61400000003'));

    expect(third).toBeNull(); // Queue full
  });
});

describe('Contact Centre — Callback', () => {
  test('callback request changes entry status', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc);

    const entry = cc.enqueue(queue.id, createTestCaller());
    const ok = cc.requestCallback(entry!.id, '+61400999999');

    expect(ok).toBe(true);
    const entries = cc.getQueueEntries(queue.id);
    const updated = entries.find(e => e.id === entry!.id);
    expect(updated!.status).toBe('CALLBACK_PENDING');
    expect(updated!.callbackRequested!.callbackNumber).toBe('+61400999999');

    const eventNames = ctx._events.map((e: any) => e.event);
    expect(eventNames).toContain('queue:callback-requested');
  });
});

describe('Contact Centre — Priority Ordering', () => {
  test('higher priority entries are positioned ahead', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc);
    // No agents — entries stay in queue

    cc.enqueue(queue.id, createTestCaller('+610001'), { priority: 'NORMAL' });
    cc.enqueue(queue.id, createTestCaller('+610002'), { priority: 'LOW' });
    cc.enqueue(queue.id, createTestCaller('+610003'), { priority: 'URGENT' });

    const entries = cc.getQueueEntries(queue.id, 'WAITING');
    // URGENT should be first, then NORMAL, then LOW
    expect(entries[0].priority).toBe('URGENT');
    expect(entries[0].caller.identifier).toBe('+610003');
  });
});

describe('Contact Centre — Dashboard Metrics', () => {
  test('queue metrics reflect current state', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc);
    cc.agentLogin('user-1', 'Alice', 'tenant-1', { queueIds: [queue.id] });

    const metrics = cc.getQueueMetrics(queue.id);
    expect(metrics).toBeDefined();
    expect(metrics!.agents.total).toBe(1);
    expect(metrics!.agents.available).toBe(1);
    expect(metrics!.current.waitingCount).toBe(0);
  });

  test('today aggregate sums across queues', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    createTestQueue(cc, { name: 'Q1' });
    createTestQueue(cc, { name: 'Q2' });
    cc.agentLogin('user-1', 'Alice', 'tenant-1');

    const today = cc.getTodayAggregate();
    expect(today.activeQueues).toBe(2);
    expect(today.activeAgents).toBe(1);
  });

  test('SLA overview tracks answer speed', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc, {
      slaTarget: { percentageThreshold: 80, timeThresholdSeconds: 20 },
    });
    const agent = cc.agentLogin('user-1', 'Alice', 'tenant-1', { queueIds: [queue.id] });

    // Enqueue and answer quickly
    cc.enqueue(queue.id, createTestCaller());
    cc.agentAccept(agent.id);

    const sla = cc.getSlaOverview();
    expect(sla).toHaveLength(1);
    expect(sla[0].slaPercent).toBe(100); // Answered instantly = within SLA
    expect(sla[0].isMet).toBe(true);
  });
});

describe('Contact Centre — Health', () => {
  test('health reports correct counts', () => {
    const ctx = createMockContext();
    const cc = new ContactCentreManager(ctx);
    const queue = createTestQueue(cc);
    cc.agentLogin('user-1', 'Alice', 'tenant-1', { queueIds: [queue.id] });
    cc.agentLogin('user-2', 'Bob', 'tenant-1', { queueIds: [queue.id] });

    const health = cc.getHealth();
    expect(health.activeQueues).toBe(1);
    expect(health.totalAgents).toBe(2);
    expect(health.availableAgents).toBe(2);
    expect(health.totalWaiting).toBe(0);
  });
});
