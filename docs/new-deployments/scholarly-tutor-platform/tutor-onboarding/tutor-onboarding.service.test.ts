/**
 * ============================================================================
 * SCHOLARLY PLATFORM — TutorOnboardingService E2E Tests (Steps 1–3)
 * ============================================================================
 *
 * These tests verify the orchestration logic of the TutorOnboardingService
 * by injecting mock dependencies and asserting that:
 *
 *   1. The state machine transitions correctly through Steps 1–3
 *   2. Each step calls the correct existing services with correct parameters
 *   3. The OnboardingSession is persisted with the right data at each step
 *   4. NATS events are published at each step completion
 *   5. Error handling records errors and allows retry
 *   6. Session resumption works correctly
 *   7. Invalid state transitions are rejected
 *
 * Test IDs map to the E2E Test Plan from handoff §3.4:
 *   TC-01: Identity Creation
 *   TC-02: Hosting Provisioning
 *   TC-03: Availability Setup
 *   TC-08: Resumability
 *
 * @module scholarly/tutor-onboarding/tests
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TutorOnboardingService } from './tutor-onboarding.service';
import type { OnboardingSessionRepository, PrismaTransaction } from './tutor-onboarding.service';
import type {
  OnboardingSession,
  AuthServiceDependency,
  HostingServiceDependency,
  TutorBookingServiceDependency,
  AIServiceDependency,
  StripeConnectDependency,
  GoDaddyDomainDependency,
  OnboardingEventBus,
  OnboardingCache,
} from './tutor-onboarding.types';
import { OnboardingStep } from './tutor-onboarding.types';

// ============================================================================
// MOCK FACTORIES
// ============================================================================

function createMockRepo(): OnboardingSessionRepository {
  const sessions = new Map<string, OnboardingSession>();

  return {
    create: vi.fn(async (session: OnboardingSession) => {
      sessions.set(session.id, { ...session });
      return { ...session };
    }),
    findById: vi.fn(async (id: string) => {
      const s = sessions.get(id);
      return s ? { ...s } : null;
    }),
    findByUserId: vi.fn(async (userId: string) => {
      for (const s of sessions.values()) {
        if (s.userId === userId && s.currentStep !== OnboardingStep.COMPLETED) {
          return { ...s };
        }
      }
      return null;
    }),
    update: vi.fn(async (id: string, data: Partial<OnboardingSession>) => {
      const existing = sessions.get(id);
      if (!existing) throw new Error(`Session not found: ${id}`);
      const updated = { ...existing, ...data };
      sessions.set(id, updated);
      return { ...updated };
    }),
    findAbandonedSessions: vi.fn(async () => []),
  };
}

function createMockPrismaTransaction(): PrismaTransaction {
  return {
    createTenantWithUser: vi.fn(async (_params: Record<string, unknown>) => ({
      tenantId: 'tenant-test-123',
      userId: 'user-test-456',
      tutorProfileId: 'profile-test-789',
    })),
  };
}

function createMockAuth(): AuthServiceDependency {
  return {
    register: vi.fn(async () => ({ userId: 'user-test-456' })),
  };
}

function createMockHosting(): HostingServiceDependency {
  return {
    createProvider: vi.fn(async (_params: Record<string, unknown>) => ({
      id: 'provider-test-abc',
      subdomain: 'jane-smith',
    })),
    addCustomDomain: vi.fn(async () => ({
      verificationToken: 'txt-verify-123',
      dnsInstructions: [],
    })),
    activateProvider: vi.fn(async () => ({
      publishedUrl: 'https://jane-smith.scholar.ly',
    })),
  };
}

function createMockTutorBooking(): TutorBookingServiceDependency {
  return {
    updateTutorAvailability: vi.fn(async (_profileId: string, slots: unknown[]) => ({
      slotsCreated: slots.length,
    })),
    upsertPricingTier: vi.fn(async () => {}),
    startProfileBuilder: vi.fn(async () => ({
      questions: [{ id: 'q1', question: 'Tell me about your teaching style', type: 'text' as const }],
    })),
  };
}

function createMockAI(): AIServiceDependency {
  return {
    generateBio: vi.fn(async () => ({ bio: 'Experienced French tutor...' })),
    generateSocialPosts: vi.fn(async () => []),
    suggestBusinessName: vi.fn(async () => ({ suggestions: ['Jane\'s French Academy'] })),
    suggestTheme: vi.fn(async () => ({
      primaryColour: '#2563EB',
      accentColour: '#F59E0B',
    })),
  };
}

function createMockStripeConnect(): StripeConnectDependency {
  return {
    createConnectedAccount: vi.fn(async () => ({ stripeAccountId: 'acct_test_123' })),
    createOnboardingLink: vi.fn(async () => ({
      url: 'https://connect.stripe.com/setup/abc',
      expiresAt: Date.now() + 300_000,
    })),
    getAccountStatus: vi.fn(async () => ({
      stripeAccountId: 'acct_test_123',
      detailsSubmitted: false,
      chargesEnabled: false,
      payoutsEnabled: false,
      status: 'not_started' as const,
    })),
  };
}

function createMockGoDaddy(): GoDaddyDomainDependency {
  return {
    checkAvailability: vi.fn(async (domain: string) => ({
      domain,
      available: true,
      priceMicros: 14990000,
      currency: 'USD',
      priceFormatted: '$14.99',
      periodYears: 1,
    })),
    suggestDomains: vi.fn(async () => []),
    purchaseDomain: vi.fn(async (domain: string) => ({
      domain,
      orderId: 'order-123',
      expiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
      autoRenew: true,
    })),
    initiateTransfer: vi.fn(async () => ({
      orderId: 'transfer-456',
      estimatedCompletionDays: 7,
    })),
    updateDnsRecords: vi.fn(async (_d: string, records: unknown[]) => ({
      updated: records.length,
    })),
  };
}

function createMockEventBus(): OnboardingEventBus {
  return {
    publish: vi.fn(async () => {}),
  };
}

function createMockCache(): OnboardingCache {
  const store = new Map<string, unknown>();
  return {
    get: vi.fn(async (key: string) => store.get(key) ?? null) as OnboardingCache['get'],
    set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    del: vi.fn(async (key: string) => { store.delete(key); }),
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('TutorOnboardingService — Steps 1–3', () => {
  let service: TutorOnboardingService;
  let repo: ReturnType<typeof createMockRepo>;
  let prismaTransaction: ReturnType<typeof createMockPrismaTransaction>;
  let hosting: ReturnType<typeof createMockHosting>;
  let tutorBooking: ReturnType<typeof createMockTutorBooking>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let cache: ReturnType<typeof createMockCache>;

  beforeEach(() => {
    repo = createMockRepo();
    prismaTransaction = createMockPrismaTransaction();
    hosting = createMockHosting();
    tutorBooking = createMockTutorBooking();
    eventBus = createMockEventBus();
    cache = createMockCache();

    service = new TutorOnboardingService(
      repo,
      prismaTransaction,
      createMockAuth(),
      hosting,
      tutorBooking,
      createMockAI(),
      createMockStripeConnect(),
      createMockGoDaddy(),
      eventBus,
      cache,
    );
  });

  // ── Session Lifecycle ─────────────────────────────────────────────

  describe('createSession', () => {
    it('creates a session in NOT_STARTED state with TUTOR_SOLO persona', async () => {
      const session = await service.createSession('TUTOR_SOLO');

      expect(session.id).toBeDefined();
      expect(session.personaType).toBe('TUTOR_SOLO');
      expect(session.currentStep).toBe(OnboardingStep.NOT_STARTED);
      expect(session.furthestStep).toBe(OnboardingStep.NOT_STARTED);
      expect(session.userId).toBeNull();
      expect(session.tenantId).toBeNull();
      expect(session.resumeCount).toBe(0);
      expect(repo.create).toHaveBeenCalledOnce();
    });

    it('caches the session after creation', async () => {
      await service.createSession('TUTOR_SOLO');
      expect(cache.set).toHaveBeenCalledOnce();
    });
  });

  describe('resumeSession', () => {
    it('returns null for non-existent session', async () => {
      const result = await service.resumeSession('non-existent-id');
      expect(result).toBeNull();
    });

    it('increments resume count and updates lastActivityAt (TC-08)', async () => {
      const session = await service.createSession('TUTOR_SOLO');

      const resumed = await service.resumeSession(session.id);
      expect(resumed).not.toBeNull();
      expect(resumed!.resumeCount).toBe(1);
      expect(repo.update).toHaveBeenCalled();
    });
  });

  // ── Step 1: Identity (TC-01) ──────────────────────────────────────

  describe('completeIdentity (TC-01)', () => {
    it('creates User + TutorProfile + Tenant in single transaction', async () => {
      const session = await service.createSession('TUTOR_SOLO');

      const result = await service.completeIdentity(session.id, {
        displayName: 'Jane Smith',
        email: 'jane@example.com',
        password: 'secure-password-123',
        subjects: ['French', 'Spanish'],
        location: 'Sydney, NSW',
      });

      expect(result.userId).toBe('user-test-456');
      expect(result.tenantId).toBe('tenant-test-123');
      expect(result.tutorProfileId).toBe('profile-test-789');
      expect(result.jurisdiction).toBe('NSW');

      // Verify Prisma transaction was called with correct params
      expect(prismaTransaction.createTenantWithUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userEmail: 'jane@example.com',
          userDisplayName: 'Jane Smith',
          userRoles: ['tutor'],
          userJurisdiction: 'NSW',
          userTrustScore: 50,
          tutorType: 'professional',
          sessionTypes: ['one_on_one'],
        }),
      );
    });

    it('advances session to BRANDING step after identity', async () => {
      const session = await service.createSession('TUTOR_SOLO');
      await service.completeIdentity(session.id, {
        displayName: 'Jane Smith',
        email: 'jane@example.com',
        password: 'secure-password-123',
        subjects: ['French'],
        location: 'Sydney, NSW',
      });

      // Verify session was updated
      const updateCall = (repo.update as any).mock.calls.find(
        (call: unknown[]) => (call[1] as any).currentStep === OnboardingStep.BRANDING,
      );
      expect(updateCall).toBeDefined();
    });

    it('publishes NATS event on identity completion', async () => {
      const session = await service.createSession('TUTOR_SOLO');
      await service.completeIdentity(session.id, {
        displayName: 'Jane Smith',
        email: 'jane@example.com',
        password: 'secure-password-123',
        subjects: ['French'],
        location: 'Melbourne, VIC',
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        'scholarly.onboarding.identity.completed',
        expect.objectContaining({
          sessionId: session.id,
          step: OnboardingStep.IDENTITY,
          personaType: 'TUTOR_SOLO',
        }),
      );
    });

    it('detects Victorian jurisdiction from Melbourne location', async () => {
      const session = await service.createSession('TUTOR_SOLO');
      const result = await service.completeIdentity(session.id, {
        displayName: 'Test Tutor',
        email: 'test@example.com',
        password: 'test-pass-123',
        subjects: ['Maths'],
        location: 'Melbourne, Victoria',
      });

      expect(result.jurisdiction).toBe('VIC');
    });

    it('generates unique tenant slug from display name', async () => {
      const session = await service.createSession('TUTOR_SOLO');
      await service.completeIdentity(session.id, {
        displayName: "Jane Smith's French Academy",
        email: 'jane@example.com',
        password: 'secure-password-123',
        subjects: ['French'],
        location: 'Sydney, NSW',
      });

      expect(prismaTransaction.createTenantWithUser).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantSlug: 'jane-smiths-french-academy',
        }),
      );
    });
  });

  // ── Step 2: Branding (TC-02) ──────────────────────────────────────

  describe('completeBranding (TC-02)', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await service.createSession('TUTOR_SOLO');
      sessionId = session.id;
      await service.completeIdentity(sessionId, {
        displayName: 'Jane Smith',
        email: 'jane@example.com',
        password: 'secure-password-123',
        subjects: ['French'],
        location: 'Sydney, NSW',
      });
    });

    it('creates HostingProvider with solo_tutor type', async () => {
      const result = await service.completeBranding(sessionId, {
        businessName: "Jane's French Academy",
        theme: { primaryColour: '#2563EB', accentColour: '#F59E0B' },
      });

      expect(result.providerId).toBe('provider-test-abc');
      expect(result.subdomain).toBe('jane-smith');
      expect(result.providerUrl).toBe('https://jane-smith.scholar.ly');

      expect(hosting.createProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-test-123',
          name: "Jane's French Academy",
          type: 'solo_tutor',
        }),
      );
    });

    it('publishes NATS event on branding completion', async () => {
      await service.completeBranding(sessionId, {
        businessName: "Jane's French Academy",
        theme: { primaryColour: '#2563EB', accentColour: '#F59E0B' },
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        'scholarly.onboarding.branding.completed',
        expect.objectContaining({
          step: OnboardingStep.BRANDING,
        }),
      );
    });

    it('rejects branding if identity not completed', async () => {
      const freshSession = await service.createSession('TUTOR_SOLO');
      await expect(
        service.completeBranding(freshSession.id, {
          businessName: 'Test',
          theme: { primaryColour: '#000', accentColour: '#FFF' },
        }),
      ).rejects.toThrow(/Invalid step transition/);
    });
  });

  // ── Step 3: Calendar (TC-03) ──────────────────────────────────────

  describe('completeCalendar (TC-03)', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await service.createSession('TUTOR_SOLO');
      sessionId = session.id;
      await service.completeIdentity(sessionId, {
        displayName: 'Jane Smith',
        email: 'jane@example.com',
        password: 'secure-password-123',
        subjects: ['French'],
        location: 'Sydney, NSW',
      });
      await service.completeBranding(sessionId, {
        businessName: "Jane's French Academy",
        theme: { primaryColour: '#2563EB', accentColour: '#F59E0B' },
      });
    });

    it('creates availability slots from provided input', async () => {
      const customSlots = [
        { dayOfWeek: 1, startTime: '10:00', endTime: '18:00' },
        { dayOfWeek: 3, startTime: '10:00', endTime: '18:00' },
        { dayOfWeek: 5, startTime: '10:00', endTime: '15:00' },
      ];

      const result = await service.completeCalendar(sessionId, {
        slots: customSlots,
        timezone: 'Australia/Sydney',
      });

      expect(result.slotsCreated).toBe(3);
      expect(result.timezone).toBe('Australia/Sydney');

      expect(tutorBooking.updateTutorAvailability).toHaveBeenCalledWith(
        'profile-test-789',
        customSlots,
        'Australia/Sydney',
      );
    });

    it('falls back to blueprint defaults when no slots provided', async () => {
      const result = await service.completeCalendar(sessionId, {
        slots: [],
        timezone: 'Australia/Sydney',
      });

      // TUTOR_SOLO default: Mon-Fri 09:00-17:00 (5 slots)
      expect(result.slotsCreated).toBe(5);

      const passedSlots = (tutorBooking.updateTutorAvailability as any).mock.calls[0][1];
      expect(passedSlots).toHaveLength(5);
      expect(passedSlots[0]).toEqual({ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' });
      expect(passedSlots[4]).toEqual({ dayOfWeek: 5, startTime: '09:00', endTime: '17:00' });
    });

    it('creates default pricing tier from blueprint', async () => {
      await service.completeCalendar(sessionId, {
        slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
        timezone: 'Australia/Sydney',
      });

      expect(tutorBooking.upsertPricingTier).toHaveBeenCalledWith(
        'profile-test-789',
        {
          sessionType: 'one_on_one',
          durationMinutes: 60,
          baseRateCents: 6000,
          currency: 'AUD',
        },
      );
    });

    it('publishes NATS event on calendar completion', async () => {
      await service.completeCalendar(sessionId, {
        slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
        timezone: 'Australia/Sydney',
      });

      expect(eventBus.publish).toHaveBeenCalledWith(
        'scholarly.onboarding.calendar.completed',
        expect.objectContaining({
          step: OnboardingStep.CALENDAR,
        }),
      );
    });
  });

  // ── State Machine Validation ──────────────────────────────────────

  describe('state machine transitions', () => {
    it('rejects skipping steps (NOT_STARTED → CALENDAR)', async () => {
      const session = await service.createSession('TUTOR_SOLO');
      await expect(
        service.completeCalendar(session.id, {
          slots: [],
          timezone: 'Australia/Sydney',
        }),
      ).rejects.toThrow(/Invalid step transition/);
    });

    it('rejects completing Steps 4-7 in Sprint 1', async () => {
      const session = await service.createSession('TUTOR_SOLO');
      await expect(
        service.completeDomain(session.id, { choice: 'subdomain_only' }),
      ).rejects.toThrow(/Sprint 2/);
    });
  });

  // ── Error Handling ────────────────────────────────────────────────

  describe('error handling', () => {
    it('records error on step failure and allows retry', async () => {
      const session = await service.createSession('TUTOR_SOLO');

      // Make the Prisma transaction fail
      (prismaTransaction.createTenantWithUser as any).mockRejectedValueOnce(
        new Error('Database connection lost'),
      );

      await expect(
        service.completeIdentity(session.id, {
          displayName: 'Jane Smith',
          email: 'jane@example.com',
          password: 'secure-password-123',
          subjects: ['French'],
          location: 'Sydney, NSW',
        }),
      ).rejects.toThrow('Database connection lost');

      // Verify error was recorded on the session
      expect(repo.update).toHaveBeenCalledWith(
        session.id,
        expect.objectContaining({
          lastError: expect.objectContaining({
            step: OnboardingStep.IDENTITY,
            code: 'UNKNOWN',
            message: 'Database connection lost',
            retryable: true,
          }),
        }),
      );

      // Now retry — should succeed
      (prismaTransaction.createTenantWithUser as any).mockResolvedValueOnce({
        tenantId: 'tenant-retry-123',
        userId: 'user-retry-456',
        tutorProfileId: 'profile-retry-789',
      });

      const result = await service.completeIdentity(session.id, {
        displayName: 'Jane Smith',
        email: 'jane@example.com',
        password: 'secure-password-123',
        subjects: ['French'],
        location: 'Sydney, NSW',
      });

      expect(result.userId).toBe('user-retry-456');
    });
  });

  // ── Abandonment ───────────────────────────────────────────────────

  describe('markAbandoned', () => {
    it('marks inactive session as abandoned and publishes event', async () => {
      const session = await service.createSession('TUTOR_SOLO');
      await service.completeIdentity(session.id, {
        displayName: 'Jane Smith',
        email: 'jane@example.com',
        password: 'secure-password-123',
        subjects: ['French'],
        location: 'Sydney, NSW',
      });

      await service.markAbandoned(session.id);

      expect(repo.update).toHaveBeenCalledWith(
        session.id,
        expect.objectContaining({
          currentStep: OnboardingStep.ABANDONED,
        }),
      );

      expect(eventBus.publish).toHaveBeenCalledWith(
        'scholarly.onboarding.abandoned',
        expect.objectContaining({
          sessionId: session.id,
        }),
      );

      // Verify cache was cleared
      expect(cache.del).toHaveBeenCalled();
    });

    it('does not abandon completed sessions', async () => {
      // Create a session and manually set it to COMPLETED
      const session = await service.createSession('TUTOR_SOLO');
      await repo.update(session.id, { currentStep: OnboardingStep.COMPLETED });

      await service.markAbandoned(session.id);

      // Should not have been updated to ABANDONED
      const updateCalls = (repo.update as any).mock.calls.filter(
        (call: unknown[]) => (call[1] as any).currentStep === OnboardingStep.ABANDONED,
      );
      expect(updateCalls).toHaveLength(0);
    });
  });

  // ── Full Flow: Steps 1–3 ──────────────────────────────────────────

  describe('full Steps 1–3 flow', () => {
    it('completes identity → branding → calendar in sequence', async () => {
      // Step 0: Create session
      const session = await service.createSession('TUTOR_SOLO');
      expect(session.currentStep).toBe(OnboardingStep.NOT_STARTED);

      // Step 1: Identity
      const identity = await service.completeIdentity(session.id, {
        displayName: 'Marie Dupont',
        email: 'marie@erudits.com.au',
        password: 'secure-password-123',
        subjects: ['French'],
        location: 'Perth, WA',
      });
      expect(identity.jurisdiction).toBe('WA');
      expect(identity.userId).toBeDefined();

      // Step 2: Branding
      const branding = await service.completeBranding(session.id, {
        businessName: 'Érudits French Education',
        theme: { primaryColour: '#1E40AF', accentColour: '#DC2626' },
      });
      expect(branding.providerUrl).toContain('scholar.ly');

      // Step 3: Calendar
      const calendar = await service.completeCalendar(session.id, {
        slots: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '15:00' },
          { dayOfWeek: 2, startTime: '09:00', endTime: '15:00' },
          { dayOfWeek: 4, startTime: '09:00', endTime: '15:00' },
        ],
        timezone: 'Australia/Perth',
      });
      expect(calendar.slotsCreated).toBe(3);

      // Verify 3 step completion events were published
      const publishCalls = (eventBus.publish as any).mock.calls.filter(
        (call: unknown[]) => (call[0] as string).includes('.completed'),
      );
      expect(publishCalls).toHaveLength(3);
    });
  });
});
