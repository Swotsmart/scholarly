/**
 * Chekd Unified Communications 3.2 — Webinar Plugin Lifecycle Tests
 *
 * Tests the core webinar lifecycle through the REST API: creation,
 * phase transitions, registration, Q&A, polls, reactions, chat,
 * participants, analytics, and event emissions.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import express, { Router } from 'express';
import request from 'supertest';
import { EventBus } from '../../../bus/event-bus';
import { createLogger } from '../../../utils/logger';
import type { PluginContext, StorageAdapter } from '../../../core/plugin-interface';
import { WebinarPlugin } from '../index';

// ─── Test Helpers ────────────────────────────────────────────────────────────

function createTestStorage(): StorageAdapter {
  const store = new Map<string, Map<string, unknown>>();
  const getCol = (n: string) => { if (!store.has(n)) store.set(n, new Map()); return store.get(n)!; };
  return {
    async get<T>(c: string, k: string) { return (getCol(c).get(k) as T) ?? null; },
    async set<T>(c: string, k: string, v: T) { getCol(c).set(k, v); },
    async delete(c: string, k: string) { return getCol(c).delete(k); },
    async query<T>(c: string, f: Record<string, unknown>) { return [...getCol(c).values()].filter((i: any) => Object.entries(f).every(([k, v]) => (i as any)[k] === v)) as T[]; },
    async count(c: string, f: Record<string, unknown>) { return (await this.query(c, f)).length; },
    async raw<T>(): Promise<T> { throw new Error('Not supported'); },
    async transaction<T>(fn: (tx: StorageAdapter) => Promise<T>) { return fn(this); },
  };
}

function createTestContext(bus?: EventBus): PluginContext {
  const b = bus || new EventBus();
  return {
    bus: b,
    config: {
      port: 3100, wsPort: 3101, jwtSecret: 'test', nodeEnv: 'test', logLevel: 'error', corsOrigins: [],
      plugins: { webinar: { aiProvider: 'mock', persistence: { flushIntervalMs: 100000, rehydrateOnInit: false } } },
    },
    logger: createLogger('test'),
    app: express(),
    getPlugin: () => undefined,
    storage: createTestStorage(),
    getAuthenticatedUser: () => null,
  };
}

function mountPlugin(plugin: WebinarPlugin): express.Application {
  const app = express();
  app.use(express.json());
  const routes = plugin.getRoutes();
  if (routes) app.use('/api/webinar', routes);
  return app;
}

// ═══════════════════════════════════════════════════════════════════════════════

describe('WebinarPlugin — Lifecycle', () => {
  let plugin: WebinarPlugin;
  let bus: EventBus;
  let app: express.Application;

  beforeEach(async () => {
    bus = new EventBus();
    const ctx = createTestContext(bus);
    plugin = new WebinarPlugin();
    await plugin.initialize(ctx);
    app = mountPlugin(plugin);
  });

  afterEach(async () => { await plugin.shutdown(); });

  // ─── Plugin Meta ───────────────────────────────────────────────────

  it('should expose correct metadata', () => {
    expect(plugin.id).toBe('webinar');
    expect(plugin.version).toBe('1.0.0');
    expect(plugin.dependencies).toContain('video');
  });

  it('should report healthy status', async () => {
    const h = await plugin.healthCheck();
    expect(h.status).toBe('healthy');
    expect(h.details?.aiProvider).toBe('mock');
  });

  // ─── CRUD ──────────────────────────────────────────────────────────

  it('should create a webinar in draft phase', async () => {
    const res = await request(app).post('/api/webinar/webinars').send({ title: 'Test Webinar', tenantId: 't1', createdBy: 'u1' });
    expect(res.status).toBe(201);
    expect(res.body.phase).toBe('draft');
    expect(res.body.title).toBe('Test Webinar');
  });

  it('should cap maxParticipants at 2000', async () => {
    const res = await request(app).post('/api/webinar/webinars').send({ title: 'Big', maxParticipants: 9999 });
    expect(res.body.maxParticipants).toBe(2000);
  });

  it('should cap maxPanelists at 25', async () => {
    const res = await request(app).post('/api/webinar/webinars').send({ title: 'Panel', maxPanelists: 100 });
    expect(res.body.maxPanelists).toBe(25);
  });

  it('should list webinars', async () => {
    await request(app).post('/api/webinar/webinars').send({ title: 'W1' });
    await request(app).post('/api/webinar/webinars').send({ title: 'W2' });
    const res = await request(app).get('/api/webinar/webinars');
    expect(res.body.length).toBe(2);
  });

  it('should get webinar by ID', async () => {
    const c = await request(app).post('/api/webinar/webinars').send({ title: 'Fetch Me' });
    const res = await request(app).get(`/api/webinar/webinars/${c.body.id}`);
    expect(res.body.title).toBe('Fetch Me');
  });

  it('should update a webinar', async () => {
    const c = await request(app).post('/api/webinar/webinars').send({ title: 'Old Title' });
    const res = await request(app).patch(`/api/webinar/webinars/${c.body.id}`).send({ title: 'New Title' });
    expect(res.body.title).toBe('New Title');
  });

  it('should emit webinar:created event', async () => {
    const events: any[] = [];
    bus.on('webinar:created', (d: any) => { events.push(d); });
    await request(app).post('/api/webinar/webinars').send({ title: 'EventTest', tenantId: 't1', createdBy: 'u1' });
    await new Promise((r) => setTimeout(r, 50));
    expect(events.length).toBe(1);
    expect(events[0].title).toBe('EventTest');
  });

  // ─── Phase Transitions ─────────────────────────────────────────────

  describe('Phase Transitions', () => {
    let webinarId: string;

    beforeEach(async () => {
      const c = await request(app).post('/api/webinar/webinars').send({ title: 'Phase Test' });
      webinarId = c.body.id;
    });

    it('draft → registration-open', async () => {
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/registration/open`);
      expect(res.status).toBe(200);
    });

    it('draft → rehearsal', async () => {
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/rehearsal/start`);
      expect(res.body.phase).toBe('rehearsal');
    });

    it('draft → live is rejected (must transition through scheduled first)', async () => {
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/start`);
      expect(res.status).toBe(400);
    });

    it('registration-open → live', async () => {
      await request(app).post(`/api/webinar/webinars/${webinarId}/registration/open`);
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/start`);
      expect(res.body.phase).toBe('live');
    });

    it('live → ended', async () => {
      await request(app).post(`/api/webinar/webinars/${webinarId}/registration/open`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/start`);
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/end`);
      expect(res.body.phase).toBe('ended');
    });

    it('ended → live is rejected', async () => {
      await request(app).post(`/api/webinar/webinars/${webinarId}/registration/open`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/start`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/end`);
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/start`);
      expect(res.status).toBe(400);
    });

    it('cancellation from any non-ended phase', async () => {
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/cancel`).send({ cancelledBy: 'u1' });
      expect(res.body.cancelled).toBe(true);
    });

    it('delete only draft or cancelled', async () => {
      await request(app).post(`/api/webinar/webinars/${webinarId}/registration/open`);
      const res = await request(app).delete(`/api/webinar/webinars/${webinarId}`);
      expect(res.status).toBe(400);
    });
  });

  // ─── Registration ──────────────────────────────────────────────────

  describe('Registration', () => {
    let webinarId: string;

    beforeEach(async () => {
      const c = await request(app).post('/api/webinar/webinars').send({ title: 'Reg Test', maxParticipants: 3, waitlistEnabled: true });
      webinarId = c.body.id;
      await request(app).post(`/api/webinar/webinars/${webinarId}/registration/open`);
    });

    it('should register with auto-approval', async () => {
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/register`).send({ email: 'a@b.com', name: 'A' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('approved');
    });

    it('should reject duplicate emails', async () => {
      await request(app).post(`/api/webinar/webinars/${webinarId}/register`).send({ email: 'd@b.com', name: 'D' });
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/register`).send({ email: 'd@b.com', name: 'D' });
      expect(res.status).toBe(409);
    });

    it('should waitlist when full', async () => {
      for (let i = 0; i < 3; i++) await request(app).post(`/api/webinar/webinars/${webinarId}/register`).send({ email: `u${i}@b.com`, name: `U${i}` });
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/register`).send({ email: 'over@b.com', name: 'Over' });
      expect(res.body.status).toBe('waitlisted');
    });

    it('should list registrations', async () => {
      await request(app).post(`/api/webinar/webinars/${webinarId}/register`).send({ email: 'x@b.com', name: 'X' });
      const res = await request(app).get(`/api/webinar/webinars/${webinarId}/registrations`);
      expect(res.body.registrations.length).toBe(1);
    });
  });

  // ─── Q&A ───────────────────────────────────────────────────────────

  describe('Q&A', () => {
    let webinarId: string;

    beforeEach(async () => {
      const c = await request(app).post('/api/webinar/webinars').send({ title: 'QA Test' });
      webinarId = c.body.id;
      await request(app).post(`/api/webinar/webinars/${webinarId}/registration/open`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/start`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/join`).send({ userId: 'u1', userName: 'U1' });
    });

    it('should submit a question', async () => {
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/questions`).send({ userId: 'u1', content: 'How does it work?' });
      expect(res.status).toBe(201);
      expect(res.body.status).toBe('pending');
    });

    it('should upvote a question', async () => {
      const q = await request(app).post(`/api/webinar/webinars/${webinarId}/questions`).send({ userId: 'u1', content: 'Pricing?' });
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/questions/${q.body.id}/upvote`).send({ userId: 'u2' });
      expect(res.body.upvotes).toBe(1);
    });

    it('should triage questions via AI', async () => {
      await request(app).post(`/api/webinar/webinars/${webinarId}/questions`).send({ userId: 'u1', content: 'What about pricing?' });
      await request(app).post(`/api/webinar/webinars/${webinarId}/questions`).send({ userId: 'u1', content: 'How much does it cost?' });
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/questions/triage`);
      expect(res.body.clusters).toBeDefined();
    });
  });

  // ─── Polls ─────────────────────────────────────────────────────────

  describe('Polls', () => {
    let webinarId: string;

    beforeEach(async () => {
      const c = await request(app).post('/api/webinar/webinars').send({ title: 'Poll Test' });
      webinarId = c.body.id;
      await request(app).post(`/api/webinar/webinars/${webinarId}/registration/open`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/start`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/join`).send({ userId: 'u1', userName: 'U1' });
    });

    it('should create and launch a poll', async () => {
      const p = await request(app).post(`/api/webinar/webinars/${webinarId}/polls`).send({ createdBy: 'host', question: 'Yes or No?', options: ['Yes', 'No'] });
      expect(p.body.status).toBe('draft');
      const l = await request(app).post(`/api/webinar/webinars/${webinarId}/polls/${p.body.id}/launch`);
      expect(l.body.status).toBe('active');
    });

    it('should accept votes', async () => {
      const p = await request(app).post(`/api/webinar/webinars/${webinarId}/polls`).send({ createdBy: 'host', question: 'Pick', options: ['A', 'B'] });
      await request(app).post(`/api/webinar/webinars/${webinarId}/polls/${p.body.id}/launch`);
      const v = await request(app).post(`/api/webinar/webinars/${webinarId}/polls/${p.body.id}/vote`).send({ userId: 'u1', optionIds: 'opt-0' });
      expect(v.body.totalVotes).toBe(1);
    });

    it('should prevent double-voting', async () => {
      const p = await request(app).post(`/api/webinar/webinars/${webinarId}/polls`).send({ createdBy: 'host', question: 'Pick', options: ['A', 'B'] });
      await request(app).post(`/api/webinar/webinars/${webinarId}/polls/${p.body.id}/launch`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/polls/${p.body.id}/vote`).send({ userId: 'u1', optionIds: 'opt-0' });
      const dupe = await request(app).post(`/api/webinar/webinars/${webinarId}/polls/${p.body.id}/vote`).send({ userId: 'u1', optionIds: 'opt-1' });
      expect(dupe.status).toBe(409);
    });
  });

  // ─── Chat & Reactions ──────────────────────────────────────────────

  describe('Chat & Reactions', () => {
    let webinarId: string;

    beforeEach(async () => {
      const c = await request(app).post('/api/webinar/webinars').send({ title: 'Chat Test' });
      webinarId = c.body.id;
      await request(app).post(`/api/webinar/webinars/${webinarId}/registration/open`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/start`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/join`).send({ userId: 'u1', userName: 'U1' });
    });

    it('should send a chat message', async () => {
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/chat`).send({ userId: 'u1', content: 'Hello!', scope: 'everyone' });
      expect(res.status).toBe(201);
    });

    it('should send a reaction', async () => {
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/reactions`).send({ userId: 'u1', type: 'applause' });
      expect(res.body.type).toBe('applause');
    });

    it('should aggregate reaction summary', async () => {
      await request(app).post(`/api/webinar/webinars/${webinarId}/reactions`).send({ userId: 'u1', type: 'applause' });
      await request(app).post(`/api/webinar/webinars/${webinarId}/reactions`).send({ userId: 'u2', type: 'heart' });
      const res = await request(app).get(`/api/webinar/webinars/${webinarId}/reactions/summary`);
      expect(res.body.total).toBe(2);
    });
  });

  // ─── Participants ──────────────────────────────────────────────────

  describe('Participants', () => {
    let webinarId: string;

    beforeEach(async () => {
      const c = await request(app).post('/api/webinar/webinars').send({ title: 'Join Test', maxParticipants: 5, hlsFallbackEnabled: true });
      webinarId = c.body.id;
      await request(app).post(`/api/webinar/webinars/${webinarId}/registration/open`);
      await request(app).post(`/api/webinar/webinars/${webinarId}/broadcast/start`);
    });

    it('attendee gets HLS media mode', async () => {
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/join`).send({ userId: 'u1', userName: 'A', role: 'attendee' });
      expect(res.status).toBe(200);
      expect(res.body.participantId).toBeTruthy();
      expect(res.body.role).toBe('attendee');
      expect(res.body.mediaMode).toBe('hls');
    });

    it('panelist gets WebRTC media mode', async () => {
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/join`).send({ userId: 'u2', userName: 'P', role: 'panelist' });
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('panelist');
      expect(res.body.mediaMode).toBe('webrtc');
    });

    it('should enforce capacity limit', async () => {
      for (let i = 0; i < 5; i++) {
        const r = await request(app).post(`/api/webinar/webinars/${webinarId}/join`).send({ userId: `u${i}`, userName: `U${i}` });
        expect(r.status).toBe(200);
      }
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/join`).send({ userId: 'over', userName: 'Over' });
      expect(res.status).toBe(503);
    });

    it('should promote attendee to panelist', async () => {
      const j = await request(app).post(`/api/webinar/webinars/${webinarId}/join`).send({ userId: 'u1', userName: 'A', role: 'attendee' });
      expect(j.body.participantId).toBeTruthy();
      const res = await request(app).post(`/api/webinar/webinars/${webinarId}/participants/${j.body.participantId}/promote`).send({ newRole: 'panelist' });
      expect(res.status).toBe(200);
      expect(res.body.role).toBe('panelist');
      expect(res.body.mediaMode).toBe('webrtc');
    });
  });

  // ─── Analytics ─────────────────────────────────────────────────────

  describe('Analytics', () => {
    it('should return analytics for a webinar', async () => {
      const c = await request(app).post('/api/webinar/webinars').send({ title: 'Analytics Test' });
      const res = await request(app).get(`/api/webinar/webinars/${c.body.id}/analytics`);
      expect(res.status).toBe(200);
      expect(res.body.registrationAnalytics).toBeDefined();
    });

    it('should generate a post-event report', async () => {
      const c = await request(app).post('/api/webinar/webinars').send({ title: 'Report Test' });
      const res = await request(app).post(`/api/webinar/webinars/${c.body.id}/report`);
      expect(res.body.aiSummary).toBeDefined();
    });
  });

  // ─── WebSocket Handlers ────────────────────────────────────────────

  describe('WebSocket Handlers', () => {
    it('should handle webinar-reaction message', async () => {
      const c = await request(app).post('/api/webinar/webinars').send({ title: 'WS Test' });
      await request(app).post(`/api/webinar/webinars/${c.body.id}/registration/open`);
      await request(app).post(`/api/webinar/webinars/${c.body.id}/broadcast/start`);

      let reply: any = null;
      const handled = await plugin.handleWebSocketMessage!(
        's1', 'u1', `webinar-room-${c.body.id}`, 'webinar-reaction',
        { webinarId: c.body.id, type: 'thumbs-up' },
        (msg: any) => { reply = msg; }, () => {},
      );
      expect(handled).toBe(true);
      expect(reply?.type).toBe('reaction-ack');
    });

    it('should ignore unknown message types', async () => {
      const handled = await plugin.handleWebSocketMessage!('s1', 'u1', 'r1', 'unknown', {}, () => {}, () => {});
      expect(handled).toBe(false);
    });
  });
});
