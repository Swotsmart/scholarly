/**
 * ============================================================================
 * SCHOLARLY PLATFORM — TutorOnboardingService Tests (Steps 4–7)
 * ============================================================================
 *
 * These tests extend the existing Steps 1–3 suite to cover the full onboarding
 * pipeline. Each step is tested in isolation (using a beforeEach that runs
 * Steps 1–3 to reach the right state) and then as a complete flow.
 *
 * Test IDs map to the E2E Test Plan:
 *   TC-04: Domain Configuration (4 paths)
 *   TC-05: Stripe Connect Payments
 *   TC-06: AI Profile Generation
 *   TC-07: Go Live Activation
 *   TC-09: Full Steps 1–7 Flow
 *   TC-10: State Machine Enforcement for Steps 4–7
 *
 * @module scholarly/tutor-onboarding/tests-steps-4-7
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
// MOCK FACTORIES (same as Steps 1–3, duplicated for standalone execution)
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
    findByUserId: vi.fn(async () => null),
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
    generateBio: vi.fn(async () => ({ bio: 'Experienced French tutor with 10 years of classroom and private instruction.' })),
    generateSocialPosts: vi.fn(async () => [
      { platform: 'linkedin' as const, content: 'Excited to launch my tutoring practice!', hashtags: ['#tutoring', '#french'] },
      { platform: 'facebook' as const, content: 'Now booking French lessons!', hashtags: ['#learnfrench'] },
    ]),
    suggestBusinessName: vi.fn(async () => ({ suggestions: ["Jane's French Academy"] })),
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
      detailsSubmitted: true,
      chargesEnabled: true,
      payoutsEnabled: true,
      status: 'active' as const,
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
// HELPER: Run Steps 1–3 to reach a given step
// ============================================================================

/**
 * Runs Steps 1–3 on the given service and returns the session ID.
 * This gets the session to the DOMAIN step so Steps 4–7 tests can begin.
 */
async function runSteps1To3(service: TutorOnboardingService): Promise<string> {
  const session = await service.createSession('TUTOR_SOLO');
  await service.completeIdentity(session.id, {
    displayName: 'Jane Smith',
    email: 'jane@example.com',
    password: 'secure-password-123',
    subjects: ['French', 'Spanish'],
    location: 'Sydney, NSW',
  });
  await service.completeBranding(session.id, {
    businessName: "Jane's French Academy",
    theme: { primaryColour: '#2563EB', accentColour: '#F59E0B' },
  });
  await service.completeCalendar(session.id, {
    slots: [
      { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
      { dayOfWeek: 3, startTime: '09:00', endTime: '17:00' },
    ],
    timezone: 'Australia/Sydney',
  });
  return session.id;
}

/**
 * Runs Steps 1–4 (using subdomain_only) so payment tests can begin.
 */
async function runSteps1To4(service: TutorOnboardingService): Promise<string> {
  const sessionId = await runSteps1To3(service);
  await service.completeDomain(sessionId, { choice: 'subdomain_only' });
  return sessionId;
}

/**
 * Runs Steps 1–5 (skipping payments) so profile tests can begin.
 */
async function runSteps1To5(service: TutorOnboardingService): Promise<string> {
  const sessionId = await runSteps1To4(service);
  await service.completePayments(sessionId, { skip: true });
  return sessionId;
}

/**
 * Runs Steps 1–6 so go-live tests can begin.
 */
async function runSteps1To6(service: TutorOnboardingService): Promise<string> {
  const sessionId = await runSteps1To5(service);
  await service.completeProfile(sessionId, {
    answers: { style: 'Patient and structured' },
  });
  return sessionId;
}

// ============================================================================
// TESTS
// ============================================================================

describe('TutorOnboardingService — Steps 4–7', () => {
  let service: TutorOnboardingService;
  let repo: ReturnType<typeof createMockRepo>;
  let hosting: ReturnType<typeof createMockHosting>;
  let godaddy: ReturnType<typeof createMockGoDaddy>;
  let stripeConnect: ReturnType<typeof createMockStripeConnect>;
  let ai: ReturnType<typeof createMockAI>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let cache: ReturnType<typeof createMockCache>;

  beforeEach(() => {
    repo = createMockRepo();
    hosting = createMockHosting();
    godaddy = createMockGoDaddy();
    stripeConnect = createMockStripeConnect();
    ai = createMockAI();
    eventBus = createMockEventBus();
    cache = createMockCache();

    service = new TutorOnboardingService(
      repo,
      createMockPrismaTransaction(),
      createMockAuth(),
      hosting,
      createMockTutorBooking(),
      ai,
      stripeConnect,
      godaddy,
      eventBus,
      cache,
    );
  });

  // ══════════════════════════════════════════════════════════════════════
  // STEP 4: DOMAIN CONFIGURATION (TC-04)
  // ══════════════════════════════════════════════════════════════════════

  describe('completeDomain (TC-04)', () => {

    // ── Path A: Subdomain Only ──

    describe('subdomain_only', () => {
      it('accepts subdomain-only and advances to PAYMENTS', async () => {
        const sessionId = await runSteps1To3(service);

        const result = await service.completeDomain(sessionId, {
          choice: 'subdomain_only',
        });

        expect(result.domainType).toBe('subdomain_only');
        expect(result.domainName).toBeNull();
        expect(result.domainStatus).toBe('active');
        expect(result.dnsInstructions).toBeUndefined();
      });

      it('publishes NATS event on subdomain_only completion', async () => {
        const sessionId = await runSteps1To3(service);
        await service.completeDomain(sessionId, { choice: 'subdomain_only' });

        expect(eventBus.publish).toHaveBeenCalledWith(
          'scholarly.onboarding.domain.completed',
          expect.objectContaining({
            domainChoice: 'subdomain_only',
            domainStatus: 'active',
          }),
        );
      });
    });

    // ── Path B: Purchase New Domain ──

    describe('purchase_new', () => {
      it('checks availability, purchases, and configures DNS', async () => {
        const sessionId = await runSteps1To3(service);

        const result = await service.completeDomain(sessionId, {
          choice: 'purchase_new',
          domainName: 'janes-french.com',
        });

        expect(result.domainType).toBe('purchase_new');
        expect(result.domainName).toBe('janes-french.com');
        expect(result.domainStatus).toBe('purchase_pending');

        // Verify GoDaddy calls
        expect(godaddy.checkAvailability).toHaveBeenCalledWith('janes-french.com');
        expect(godaddy.purchaseDomain).toHaveBeenCalledWith(
          'janes-french.com',
          expect.objectContaining({
            nameFirst: 'Jane',
            nameLast: 'Smith',
          }),
        );
        expect(godaddy.updateDnsRecords).toHaveBeenCalledWith(
          'janes-french.com',
          expect.arrayContaining([
            expect.objectContaining({ type: 'CNAME' }),
            expect.objectContaining({ type: 'TXT', name: '_scholarly-verify' }),
          ]),
        );

        // Verify hosting was told about the custom domain
        expect(hosting.addCustomDomain).toHaveBeenCalledWith(
          'provider-test-abc',
          'janes-french.com',
        );
      });

      it('rejects purchase when domain is unavailable', async () => {
        const sessionId = await runSteps1To3(service);
        (godaddy.checkAvailability as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          domain: 'taken-domain.com',
          available: false,
          priceMicros: 0,
          currency: 'USD',
          priceFormatted: '$0',
          periodYears: 1,
        });

        await expect(
          service.completeDomain(sessionId, {
            choice: 'purchase_new',
            domainName: 'taken-domain.com',
          }),
        ).rejects.toThrow(/not available/);
      });

      it('throws when domainName is missing for purchase_new', async () => {
        const sessionId = await runSteps1To3(service);

        await expect(
          service.completeDomain(sessionId, { choice: 'purchase_new' }),
        ).rejects.toThrow(/domainName is required/);
      });
    });

    // ── Path C: Transfer Existing Domain ──

    describe('transfer_existing', () => {
      it('initiates ICANN transfer with auth code', async () => {
        const sessionId = await runSteps1To3(service);

        const result = await service.completeDomain(sessionId, {
          choice: 'transfer_existing',
          domainName: 'existing-domain.com.au',
          authCode: 'AUTH-CODE-12345',
        });

        expect(result.domainType).toBe('transfer_existing');
        expect(result.domainStatus).toBe('transfer_pending');

        expect(godaddy.initiateTransfer).toHaveBeenCalledWith(
          'existing-domain.com.au',
          'AUTH-CODE-12345',
          expect.objectContaining({ nameFirst: 'Jane' }),
        );
      });

      it('throws when authCode is missing for transfer', async () => {
        const sessionId = await runSteps1To3(service);

        await expect(
          service.completeDomain(sessionId, {
            choice: 'transfer_existing',
            domainName: 'existing-domain.com.au',
          }),
        ).rejects.toThrow(/authCode/);
      });
    });

    // ── Path D: Point Existing Domain ──

    describe('point_existing', () => {
      it('returns DNS instructions for manual configuration', async () => {
        const sessionId = await runSteps1To3(service);

        const result = await service.completeDomain(sessionId, {
          choice: 'point_existing',
          domainName: 'my-tutoring.com',
        });

        expect(result.domainType).toBe('point_existing');
        expect(result.domainStatus).toBe('dns_verification_pending');
        expect(result.dnsInstructions).toBeDefined();
        expect(result.dnsInstructions!.length).toBeGreaterThan(0);
        expect(result.dnsInstructions![0]).toEqual(
          expect.objectContaining({ type: 'CNAME' }),
        );
        expect(result.dnsInstructions![1]).toEqual(
          expect.objectContaining({ type: 'TXT', host: '_scholarly-verify' }),
        );

        // GoDaddy NOT called (tutor manages their own DNS)
        expect(godaddy.purchaseDomain).not.toHaveBeenCalled();
        expect(godaddy.updateDnsRecords).not.toHaveBeenCalled();
      });
    });

    // ── State Machine ──

    it('rejects domain step if calendar not completed (TC-10)', async () => {
      const session = await service.createSession('TUTOR_SOLO');
      await service.completeIdentity(session.id, {
        displayName: 'Test', email: 'test@test.com',
        password: 'pass123', subjects: ['Maths'], location: 'Sydney, NSW',
      });

      await expect(
        service.completeDomain(session.id, { choice: 'subdomain_only' }),
      ).rejects.toThrow(/Invalid step transition/);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // STEP 5: STRIPE CONNECT PAYMENTS (TC-05)
  // ══════════════════════════════════════════════════════════════════════

  describe('completePayments (TC-05)', () => {

    describe('skip payments', () => {
      it('advances to PROFILE when skipped', async () => {
        const sessionId = await runSteps1To4(service);

        const result = await service.completePayments(sessionId, { skip: true });

        expect(result.stripeAccountId).toBeNull();
        expect(result.stripeStatus).toBe('skipped');
        expect(result.onboardingUrl).toBeNull();
        expect(result.expiresAt).toBeNull();
      });

      it('publishes skipped event', async () => {
        const sessionId = await runSteps1To4(service);
        await service.completePayments(sessionId, { skip: true });

        expect(eventBus.publish).toHaveBeenCalledWith(
          'scholarly.onboarding.payments.completed',
          expect.objectContaining({ skipped: true }),
        );
      });
    });

    describe('complete payments', () => {
      it('creates Stripe Connect account and returns onboarding URL', async () => {
        const sessionId = await runSteps1To4(service);

        const result = await service.completePayments(sessionId, {
          returnUrl: 'https://scholar.ly/onboarding/done',
          refreshUrl: 'https://scholar.ly/onboarding/refresh',
        });

        expect(result.stripeAccountId).toBe('acct_test_123');
        expect(result.stripeStatus).toBe('link_generated');
        expect(result.onboardingUrl).toBe('https://connect.stripe.com/setup/abc');
        expect(result.expiresAt).toBeGreaterThan(Date.now());
      });

      it('passes correct country and business type to Stripe', async () => {
        const sessionId = await runSteps1To4(service);
        await service.completePayments(sessionId, {});

        expect(stripeConnect.createConnectedAccount).toHaveBeenCalledWith(
          expect.objectContaining({
            authorId: 'profile-test-789',
            email: 'jane@example.com',
            country: 'AU',
            businessType: 'individual',
          }),
        );
      });

      it('passes custom return/refresh URLs to Stripe', async () => {
        const sessionId = await runSteps1To4(service);
        await service.completePayments(sessionId, {
          returnUrl: 'https://custom.com/return',
          refreshUrl: 'https://custom.com/refresh',
        });

        expect(stripeConnect.createOnboardingLink).toHaveBeenCalledWith(
          expect.objectContaining({
            returnUrl: 'https://custom.com/return',
            refreshUrl: 'https://custom.com/refresh',
          }),
        );
      });

      it('publishes NATS event with stripe account ID', async () => {
        const sessionId = await runSteps1To4(service);
        await service.completePayments(sessionId, {});

        expect(eventBus.publish).toHaveBeenCalledWith(
          'scholarly.onboarding.payments.completed',
          expect.objectContaining({
            stripeAccountId: 'acct_test_123',
            stripeStatus: 'link_generated',
          }),
        );
      });
    });

    it('rejects payments if domain not completed (TC-10)', async () => {
      const session = await service.createSession('TUTOR_SOLO');
      await service.completeIdentity(session.id, {
        displayName: 'Test', email: 'test@test.com',
        password: 'pass123', subjects: ['Maths'], location: 'Sydney, NSW',
      });
      await service.completeBranding(session.id, {
        businessName: 'Test Academy',
        theme: { primaryColour: '#000', accentColour: '#FFF' },
      });
      // currentStep = CALENDAR — skipping domain means payments transition is invalid

      await expect(
        service.completePayments(session.id, { skip: true }),
      ).rejects.toThrow(/Invalid step transition/);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // STEP 6: AI PROFILE GENERATION (TC-06)
  // ══════════════════════════════════════════════════════════════════════

  describe('completeProfile (TC-06)', () => {

    describe('AI-generated bio', () => {
      it('generates bio from questionnaire answers', async () => {
        const sessionId = await runSteps1To5(service);

        const result = await service.completeProfile(sessionId, {
          answers: { style: 'Patient and structured', experience: '10 years' },
        });

        expect(result.suggestedBio).toContain('Experienced French tutor');
        expect(result.bio).toBe(result.suggestedBio);
        expect(result.profileCompleteness).toBeGreaterThan(0);

        expect(ai.generateBio).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Jane Smith',
            subjects: ['French', 'Spanish'],
            answers: { style: 'Patient and structured', experience: '10 years' },
          }),
        );
      });

      it('generates social media posts by default', async () => {
        const sessionId = await runSteps1To5(service);

        const result = await service.completeProfile(sessionId, {
          answers: { style: 'Fun and engaging' },
        });

        expect(result.socialPosts).toHaveLength(2);
        expect(result.socialPosts[0].platform).toBe('linkedin');
        expect(result.socialPosts[1].platform).toBe('facebook');

        expect(ai.generateSocialPosts).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Jane Smith',
            businessName: "Jane's French Academy",
          }),
        );
      });

      it('skips social posts when generateSocialPosts is false', async () => {
        const sessionId = await runSteps1To5(service);

        const result = await service.completeProfile(sessionId, {
          answers: { style: 'Traditional' },
          generateSocialPosts: false,
        });

        expect(ai.generateSocialPosts).not.toHaveBeenCalled();
        expect(result.socialPosts).toHaveLength(0);
      });
    });

    describe('manual bio', () => {
      it('accepts tutor-written bio without calling AI', async () => {
        const sessionId = await runSteps1To5(service);

        const result = await service.completeProfile(sessionId, {
          bio: 'I am a passionate French teacher from Paris.',
        });

        expect(result.bio).toBe('I am a passionate French teacher from Paris.');
        expect(result.suggestedBio).toBe('I am a passionate French teacher from Paris.');
        expect(ai.generateBio).not.toHaveBeenCalled();
      });
    });

    describe('profile completeness', () => {
      it('calculates completeness from bio + photo + business + subjects + social', async () => {
        const sessionId = await runSteps1To5(service);

        const result = await service.completeProfile(sessionId, {
          bio: 'A great tutor.',
          profilePhotoUrl: 'https://cdn.scholar.ly/photos/jane.jpg',
        });

        // bio (30) + photo (25) + businessName (15) + subjects (15) + social posts (15) = 100
        expect(result.profileCompleteness).toBe(100);
      });

      it('reflects missing photo in completeness score', async () => {
        const sessionId = await runSteps1To5(service);

        const result = await service.completeProfile(sessionId, {
          bio: 'A great tutor.',
        });

        // bio (30) + no photo (0) + businessName (15) + subjects (15) + social posts (15) = 75
        expect(result.profileCompleteness).toBe(75);
      });
    });

    it('publishes NATS event with completeness score', async () => {
      const sessionId = await runSteps1To5(service);
      await service.completeProfile(sessionId, { bio: 'My bio.' });

      expect(eventBus.publish).toHaveBeenCalledWith(
        'scholarly.onboarding.profile.completed',
        expect.objectContaining({
          profileCompleteness: expect.any(Number),
        }),
      );
    });

    it('rejects profile if payments not completed (TC-10)', async () => {
      const sessionId = await runSteps1To3(service);

      await expect(
        service.completeProfile(sessionId, { bio: 'My bio.' }),
      ).rejects.toThrow(/Invalid step transition/);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // STEP 7: GO LIVE (TC-07)
  // ══════════════════════════════════════════════════════════════════════

  describe('completeGoLive (TC-07)', () => {

    it('activates provider and returns published URL', async () => {
      const sessionId = await runSteps1To6(service);

      const result = await service.completeGoLive(sessionId, { confirmed: true });

      expect(result.publishedUrl).toBe('https://jane-smith.scholar.ly');
      expect(result.providerStatus).toBe('active');

      expect(hosting.activateProvider).toHaveBeenCalledWith('provider-test-abc');
    });

    it('returns summary of everything provisioned', async () => {
      const sessionId = await runSteps1To6(service);

      const result = await service.completeGoLive(sessionId, { confirmed: true });

      expect(result.summary).toEqual(expect.objectContaining({
        businessName: "Jane's French Academy",
        subdomain: 'jane-smith',
        subjects: ['French', 'Spanish'],
        availabilitySlots: 2,
        profileCompleteness: expect.any(Number),
      }));
    });

    it('checks Stripe account status during go-live', async () => {
      // Run through with payments NOT skipped
      const session = await service.createSession('TUTOR_SOLO');
      await service.completeIdentity(session.id, {
        displayName: 'Jane Smith', email: 'jane@example.com',
        password: 'pass123', subjects: ['French'], location: 'Sydney, NSW',
      });
      await service.completeBranding(session.id, {
        businessName: "Jane's Academy",
        theme: { primaryColour: '#000', accentColour: '#FFF' },
      });
      await service.completeCalendar(session.id, {
        slots: [{ dayOfWeek: 1, startTime: '09:00', endTime: '17:00' }],
        timezone: 'Australia/Sydney',
      });
      await service.completeDomain(session.id, { choice: 'subdomain_only' });
      await service.completePayments(session.id, {}); // NOT skipped
      await service.completeProfile(session.id, { bio: 'My bio.' });

      const result = await service.completeGoLive(session.id, { confirmed: true });

      expect(stripeConnect.getAccountStatus).toHaveBeenCalledWith('acct_test_123');
      expect(result.summary.hasStripeConnect).toBe(true);
    });

    it('marks session as COMPLETED', async () => {
      const sessionId = await runSteps1To6(service);
      await service.completeGoLive(sessionId, { confirmed: true });

      expect(repo.update).toHaveBeenCalledWith(
        sessionId,
        expect.objectContaining({
          currentStep: OnboardingStep.COMPLETED,
          furthestStep: OnboardingStep.COMPLETED,
          completedAt: expect.any(Date),
        }),
      );
    });

    it('publishes onboarding.completed event (not step event)', async () => {
      const sessionId = await runSteps1To6(service);
      await service.completeGoLive(sessionId, { confirmed: true });

      expect(eventBus.publish).toHaveBeenCalledWith(
        'scholarly.onboarding.completed',
        expect.objectContaining({
          sessionId,
          tenantId: 'tenant-test-123',
          userId: 'user-test-456',
          publishedUrl: 'https://jane-smith.scholar.ly',
        }),
      );
    });

    it('clears session from cache after completion', async () => {
      const sessionId = await runSteps1To6(service);
      await service.completeGoLive(sessionId, { confirmed: true });

      expect(cache.del).toHaveBeenCalled();
    });

    it('rejects go-live without confirmation', async () => {
      const sessionId = await runSteps1To6(service);

      await expect(
        service.completeGoLive(sessionId, { confirmed: false }),
      ).rejects.toThrow(/must confirm/);
    });

    it('rejects go-live if profile not completed (TC-10)', async () => {
      const sessionId = await runSteps1To4(service);
      // currentStep = PAYMENTS — skipping profile means go-live transition is invalid

      await expect(
        service.completeGoLive(sessionId, { confirmed: true }),
      ).rejects.toThrow(/Invalid step transition/);
    });
  });

  // ══════════════════════════════════════════════════════════════════════
  // FULL FLOW: STEPS 1–7 (TC-09)
  // ══════════════════════════════════════════════════════════════════════

  describe('full Steps 1–7 flow (TC-09)', () => {
    it('completes the entire onboarding pipeline in sequence', async () => {
      // Step 1: Identity
      const session = await service.createSession('TUTOR_SOLO');
      const identity = await service.completeIdentity(session.id, {
        displayName: 'Marie Dupont',
        email: 'marie@erudits.com.au',
        password: 'érudits-secure-2026',
        subjects: ['French', 'VCE French', 'DELF Prep'],
        location: 'Melbourne, VIC',
      });
      expect(identity.jurisdiction).toBe('VIC');

      // Step 2: Branding
      const branding = await service.completeBranding(session.id, {
        businessName: 'Érudits French Education',
        theme: { primaryColour: '#1E3A5F', accentColour: '#C41E3A' },
      });
      expect(branding.providerUrl).toContain('scholar.ly');

      // Step 3: Calendar
      const calendar = await service.completeCalendar(session.id, {
        slots: [
          { dayOfWeek: 1, startTime: '09:00', endTime: '20:00' },
          { dayOfWeek: 2, startTime: '09:00', endTime: '20:00' },
          { dayOfWeek: 3, startTime: '09:00', endTime: '20:00' },
          { dayOfWeek: 4, startTime: '09:00', endTime: '20:00' },
          { dayOfWeek: 5, startTime: '09:00', endTime: '17:00' },
          { dayOfWeek: 6, startTime: '09:00', endTime: '14:00' },
        ],
        timezone: 'Australia/Melbourne',
      });
      expect(calendar.slotsCreated).toBe(6);

      // Step 4: Domain (purchase new)
      const domain = await service.completeDomain(session.id, {
        choice: 'purchase_new',
        domainName: 'erudits.com.au',
      });
      expect(domain.domainStatus).toBe('purchase_pending');

      // Step 5: Payments (Stripe Connect)
      const payments = await service.completePayments(session.id, {});
      expect(payments.stripeAccountId).toBe('acct_test_123');
      expect(payments.onboardingUrl).toContain('stripe.com');

      // Step 6: Profile (AI-generated)
      const profile = await service.completeProfile(session.id, {
        answers: {
          style: 'Structured and immersive',
          experience: 'Native French speaker, 15 years teaching',
        },
        profilePhotoUrl: 'https://cdn.scholar.ly/photos/marie.jpg',
      });
      expect(profile.profileCompleteness).toBe(100);

      // Step 7: Go Live
      const goLive = await service.completeGoLive(session.id, { confirmed: true });
      expect(goLive.publishedUrl).toContain('scholar.ly');
      expect(goLive.providerStatus).toBe('active');
      expect(goLive.summary.businessName).toBe('Érudits French Education');
      expect(goLive.summary.subjects).toContain('French');
      expect(goLive.summary.subjects).toContain('VCE French');
      expect(goLive.summary.hasStripeConnect).toBe(true);

      // Verify 7 step events + 1 completion event were published
      const allPublishCalls = (eventBus.publish as ReturnType<typeof vi.fn>).mock.calls;
      const stepEvents = allPublishCalls.filter(
        (call: unknown[]) => (call[0] as string).includes('.completed'),
      );
      expect(stepEvents.length).toBeGreaterThanOrEqual(7);
    });
  });
});
