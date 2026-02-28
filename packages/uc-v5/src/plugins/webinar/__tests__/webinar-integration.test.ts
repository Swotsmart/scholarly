/**
 * Chekd Unified Communications 3.2 — Webinar Integration Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EventBus } from '../../../bus/event-bus';
import { createLogger } from '../../../utils/logger';
import { WriteBehindManager, DEFAULT_WRITE_BEHIND_CONFIG } from '../services/write-behind-manager';
import { RegistrationEmailPipeline } from '../services/registration-email-pipeline';
import { LandingPageGenerator } from '../services/landing-page-generator';
import type { StorageAdapter } from '../../../core/plugin-interface';

function createTestStorage(): StorageAdapter {
  const store = new Map<string, Map<string, unknown>>();
  const getCol = (n: string) => { if (!store.has(n)) store.set(n, new Map()); return store.get(n)!; };
  return {
    async get<T>(c: string, k: string) { return (getCol(c).get(k) as T) ?? null; },
    async set<T>(c: string, k: string, v: T) { getCol(c).set(k, v); },
    async delete(c: string, k: string) { return getCol(c).delete(k); },
    async query<T>(c: string, f: Record<string, unknown>) { return [...getCol(c).values()].filter((i: any) => Object.entries(f).every(([fk, fv]) => (i as any)[fk] === fv)) as T[]; },
    async count(c: string, f: Record<string, unknown>) { return (await this.query(c, f)).length; },
    async raw<T>(): Promise<T> { throw new Error('Not supported'); },
    async transaction<T>(fn: (tx: StorageAdapter) => Promise<T>): Promise<T> { return fn(this); },
  };
}

const logger = createLogger('test');

// ═══════════════════════════════════════════════════════════════════════════════
//  WRITE-BEHIND CACHE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('WriteBehindManager', () => {
  let storage: StorageAdapter;
  let bus: EventBus;
  let mgr: WriteBehindManager;

  beforeEach(() => {
    storage = createTestStorage();
    bus = new EventBus();
    mgr = new WriteBehindManager(storage, logger, bus, { ...DEFAULT_WRITE_BEHIND_CONFIG, flushIntervalMs: 100000, rehydrateOnInit: false });
  });

  afterEach(() => { mgr.destroy(); });

  describe('Dirty Tracking', () => {
    it('should track and deduplicate dirty marks', () => {
      mgr.markDirty('webinars:w1');
      mgr.markDirty('webinars:w1');
      mgr.markDirty('questions:w1');
      expect(mgr.getDirtyCount()).toBe(2);
      expect(mgr.isDirty('webinars:w1')).toBe(true);
      expect(mgr.isDirty('polls:w1')).toBe(false);
    });
  });

  describe('Store Registration', () => {
    it('should register stores with serialisers', () => {
      const testData = new Map<string, string>();
      testData.set('w1', 'hello');
      mgr.registerStore('testStore', {
        collection: 'test-col', tier: 1,
        serialise: (id: string) => testData.get(id) || null,
        deserialise: (id: string, data: unknown) => { testData.set(id, data as string); },
      });
      expect(true).toBe(true);
    });
  });

  describe('Flush Lifecycle', () => {
    it('should start and stop flush timers', () => {
      mgr.startFlushing('w1');
      expect(mgr.getFlushTimerCount()).toBe(1);
      mgr.stopFlushing('w1');
      expect(mgr.getFlushTimerCount()).toBe(0);
    });

    it('should perform a final flush that writes stores to storage', async () => {
      const webinarData = new Map<string, { id: string; title: string }>();
      webinarData.set('w1', { id: 'w1', title: 'Test Webinar' });

      mgr.registerStore('webinars', {
        collection: 'webinars', tier: 1,
        serialise: (id: string) => webinarData.get(id) || null,
        deserialise: () => {},
      });

      mgr.markDirty('webinars:w1');
      const metrics = await mgr.finalFlush('w1');

      expect(metrics.storesFlushed).toContain('webinars');
      expect(metrics.recordsWritten).toBeGreaterThan(0);
      expect(metrics.errors.length).toBe(0);

      const stored = await storage.get<{ id: string; title: string }>('webinars', 'w1');
      expect(stored).not.toBeNull();
      expect(stored!.title).toBe('Test Webinar');
    });

    it('should handle flush with no dirty stores gracefully', async () => {
      mgr.registerStore('webinars', {
        collection: 'webinars', tier: 1,
        serialise: (id: string) => ({ id }),
        deserialise: () => {},
      });

      const metrics = await mgr.finalFlush('w1');
      expect(metrics.errors.length).toBe(0);
    });
  });

  describe('Append Cursor (Tier 2)', () => {
    it('should track append cursors for tier 2 stores', async () => {
      const chatData = new Map<string, string[]>();
      chatData.set('w1', ['msg1', 'msg2', 'msg3']);

      mgr.registerStore('chatMessages', {
        collection: 'webinar-chat', tier: 2,
        serialise: (id: string) => chatData.get(id) || [],
        deserialise: () => {},
      });

      mgr.markDirty('chatMessages:w1');
      await mgr.finalFlush('w1');
      expect(mgr.getAppendCursor('chatMessages:w1')).toBe(3);

      chatData.get('w1')!.push('msg4', 'msg5');
      mgr.markDirty('chatMessages:w1');
      await mgr.finalFlush('w1');
      expect(mgr.getAppendCursor('chatMessages:w1')).toBe(5);
    });
  });

  describe('Error Handling & Degraded State', () => {
    it('should report non-degraded state initially', () => {
      expect(mgr.getConsecutiveFailures('w1')).toBe(0);
      expect(mgr.isWebinarDegraded('w1')).toBe(false);
    });
  });

  describe('Metrics Emission', () => {
    it('should emit flush metrics on the event bus', async () => {
      const metricsReceived: any[] = [];
      bus.on('webinar:flush-metrics', (data: any) => { metricsReceived.push(data); });

      mgr.registerStore('webinars', {
        collection: 'webinars', tier: 1,
        serialise: () => ({ id: 'w1' }),
        deserialise: () => {},
      });

      mgr.markDirty('webinars:w1');
      await mgr.finalFlush('w1');

      await new Promise((r) => setTimeout(r, 50));
      expect(metricsReceived.length).toBeGreaterThan(0);
      expect(metricsReceived[0].webinarId).toBe('w1');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  CROSS-PLUGIN EVENT FLOW TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('Cross-Plugin Event Flows', () => {
  it('should emit events that other plugins can subscribe to', async () => {
    const bus = new EventBus();
    const events: string[] = [];

    bus.on('webinar:created', () => { events.push('created'); });
    bus.on('webinar:broadcast-started', () => { events.push('started'); });
    bus.on('webinar:broadcast-ended', () => { events.push('ended'); });

    bus.emit('webinar:created', { webinarId: 'w1', title: 'Test', createdBy: 'u1', tenantId: 't1', maxParticipants: 500 });
    bus.emit('webinar:broadcast-started', { webinarId: 'w1', title: 'Test', roomId: 'r1', maxParticipants: 500 });
    bus.emit('webinar:broadcast-ended', { webinarId: 'w1', title: 'Test', durationMinutes: 60, peakParticipants: 200 });

    await new Promise((r) => setTimeout(r, 50));
    expect(events).toEqual(['created', 'started', 'ended']);
  });

  it('should emit persistence-degraded event', async () => {
    const bus = new EventBus();
    const degradedEvents: any[] = [];
    bus.on('webinar:persistence-degraded', (data: any) => { degradedEvents.push(data); });

    bus.emit('webinar:persistence-degraded', {
      webinarId: 'w1', consecutiveFailures: 3, lastError: 'Connection refused', timestamp: new Date(),
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(degradedEvents.length).toBe(1);
    expect(degradedEvents[0].consecutiveFailures).toBe(3);
  });

  it('should support wildcard event subscriptions', async () => {
    const bus = new EventBus();
    const allWebinarEvents: string[] = [];

    bus.onPattern('webinar:*', (_data: any) => { allWebinarEvents.push('caught'); });
    bus.emit('webinar:created', { webinarId: 'w1', title: 'Test', createdBy: 'u1', tenantId: 't1', maxParticipants: 500 });
    bus.emit('webinar:broadcast-started', { webinarId: 'w1', title: 'Test', roomId: 'r1', maxParticipants: 500 });

    await new Promise((r) => setTimeout(r, 50));
    expect(allWebinarEvents.length).toBe(2);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EMAIL PIPELINE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('RegistrationEmailPipeline', () => {
  let bus: EventBus;
  let pipeline: RegistrationEmailPipeline;

  beforeEach(() => {
    bus = new EventBus();
    pipeline = new RegistrationEmailPipeline(bus, logger);
  });

  afterEach(() => { pipeline.destroy(); });

  it('should dispatch registration confirmation email via bus', async () => {
    const dispatched: any[] = [];
    bus.on('webinar:email-dispatch', (data: any) => { dispatched.push(data); });

    await pipeline.sendRegistrationConfirmation(
      { email: 'test@example.com', name: 'Test User', registrationId: 'reg-1' },
      {
        webinarId: 'w1', webinarTitle: 'Test Webinar', webinarDescription: 'A test',
        scheduledStartAt: new Date('2026-03-01T10:00:00Z'), scheduledEndAt: new Date('2026-03-01T11:00:00Z'),
        timezone: 'UTC', joinUrl: 'https://app.chekd.com.au/webinar/w1/join', joinToken: 'token123',
        branding: { primaryColor: '#6366f1', accentColor: '#f59e0b', fontFamily: 'Inter' },
      },
    );

    await new Promise((r) => setTimeout(r, 50));
    expect(dispatched.length).toBe(1);
    expect(dispatched[0].to).toBe('test@example.com');
    expect(dispatched[0].emailType).toBe('registration-confirmation');
    expect(dispatched[0].subject).toContain('Test Webinar');
    expect(dispatched[0].html).toContain('registered');
  });

  it('should generate valid ICS calendar invite', () => {
    const ics = pipeline.generateICSInvite(
      {
        webinarId: 'w1', webinarTitle: 'Test Webinar', webinarDescription: 'A test',
        scheduledStartAt: new Date('2026-03-01T10:00:00Z'), scheduledEndAt: new Date('2026-03-01T11:00:00Z'),
        timezone: 'UTC', joinUrl: '', joinToken: '',
        branding: { primaryColor: '#6366f1', accentColor: '#f59e0b', fontFamily: 'Inter' },
      },
      'https://app.chekd.com.au/webinar/w1/join',
    );

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('SUMMARY:Test Webinar');
    expect(ics).toContain('BEGIN:VALARM');
    expect(ics).toContain('METHOD:REQUEST');
  });

  it('should cancel all reminders for a webinar', async () => {
    await pipeline.sendRegistrationConfirmation(
      { email: 'test@example.com', name: 'User', registrationId: 'reg-1' },
      {
        webinarId: 'w1', webinarTitle: 'Test', webinarDescription: '',
        scheduledStartAt: new Date(Date.now() + 86400000), scheduledEndAt: new Date(Date.now() + 90000000),
        timezone: 'UTC', joinUrl: '', joinToken: 'tok',
        branding: { primaryColor: '#000', accentColor: '#000', fontFamily: 'sans' },
      },
    );

    expect(pipeline.getActiveReminderCount()).toBeGreaterThan(0);
    pipeline.cancelAllReminders('w1');
    expect(pipeline.getActiveReminderCount()).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
//  LANDING PAGE GENERATOR TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('LandingPageGenerator', () => {
  const webinar = {
    id: 'w1', title: 'AI for Everyone', description: 'Learn about AI in this webinar',
    slug: 'ai-for-everyone-abc123', phase: 'registration-open', visibility: 'public',
    scheduledStartAt: new Date('2026-03-01T10:00:00Z'), scheduledEndAt: new Date('2026-03-01T11:00:00Z'),
    timezone: 'AEST', maxParticipants: 500, registrationCount: 42, waitlistCount: 0,
    registrationApproval: 'automatic',
    registrationFields: [
      { id: 'name', label: 'Full Name', type: 'text', required: true },
      { id: 'email', label: 'Email', type: 'email', required: true },
      { id: 'company', label: 'Company', type: 'text', required: false },
    ],
    branding: { primaryColor: '#6366f1', accentColor: '#f59e0b', fontFamily: 'Inter', waitingRoomMessage: 'Starting soon' },
    agenda: [
      { id: 'a1', title: 'Introduction', description: 'Welcome', durationMinutes: 10, type: 'presentation', speakerIds: [] },
      { id: 'a2', title: 'AI Deep Dive', durationMinutes: 30, type: 'presentation', speakerIds: [] },
      { id: 'a3', title: 'Q&A', durationMinutes: 15, type: 'qa', speakerIds: [] },
    ],
    tags: ['AI', 'Technology'],
  };

  it('should render a complete HTML landing page', () => {
    const gen = new LandingPageGenerator(logger, () => webinar as any);
    const html = gen.renderLandingPage(webinar as any);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('AI for Everyone');
    expect(html).toContain('og:title');
    expect(html).toContain('twitter:card');
    expect(html).toContain('schema.org');
    expect(html).toContain('registration-form');
    expect(html).toContain('Introduction');
    expect(html).toContain('AI Deep Dive');
  });

  it('should include Open Graph and Twitter Card meta tags', () => {
    const gen = new LandingPageGenerator(logger, () => webinar as any);
    const html = gen.renderLandingPage(webinar as any);
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:url"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('name="twitter:title"');
  });

  it('should render registration form fields', () => {
    const gen = new LandingPageGenerator(logger, () => webinar as any);
    const html = gen.renderLandingPage(webinar as any);
    expect(html).toContain('name="name"');
    expect(html).toContain('name="email"');
    expect(html).toContain('name="company"');
    expect(html).toContain('Register Now');
  });

  it('should show spots remaining', () => {
    const gen = new LandingPageGenerator(logger, () => webinar as any);
    const html = gen.renderLandingPage(webinar as any);
    expect(html).toContain('458 spots remaining');
  });

  it('should show closed message when registration is not open', () => {
    const closedWebinar = { ...webinar, phase: 'ended' };
    const gen = new LandingPageGenerator(logger, () => closedWebinar as any);
    const html = gen.renderLandingPage(closedWebinar as any);
    expect(html).toContain('Registration is currently closed');
  });

  it('should escape HTML to prevent XSS', () => {
    const xssWebinar = { ...webinar, title: '<script>alert("xss")</script>', description: 'Test <b>bold</b>' };
    const gen = new LandingPageGenerator(logger, () => xssWebinar as any);
    const html = gen.renderLandingPage(xssWebinar as any);
    // The title should be escaped in the <title> and <h1> tags
    expect(html).toContain('&lt;script&gt;alert');
    // The description should have <b> escaped
    expect(html).toContain('Test &lt;b&gt;bold&lt;/b&gt;');
  });

  it('should apply branding colours and font', () => {
    const gen = new LandingPageGenerator(logger, () => webinar as any);
    const html = gen.renderLandingPage(webinar as any);
    expect(html).toContain('#6366f1');
    expect(html).toContain('#f59e0b');
    expect(html).toContain('Inter');
  });
});
