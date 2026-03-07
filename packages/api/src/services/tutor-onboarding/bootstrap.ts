/**
 * Tutor Onboarding Service — Bootstrap & Dependency Wiring
 *
 * Creates and initializes the TutorOnboardingService with all required
 * dependencies. Follows the singleton-with-getter pattern used by
 * hosting services (see lib/hosting-init.ts).
 *
 * Usage:
 *   import { initializeTutorOnboarding, getTutorOnboardingService } from './services/tutor-onboarding/bootstrap';
 *   initializeTutorOnboarding();
 *   const service = getTutorOnboardingService();
 */

import Stripe from 'stripe';
import { prisma } from '@scholarly/database';
import { logger } from '../../lib/logger';

import { TutorOnboardingService, type PrismaTransaction } from './tutor-onboarding.service';
import { PrismaOnboardingSessionRepository } from './onboarding-session.repository';
import { createStripeConnectClient, PrismaConnectedAccountRegistry } from '../../integrations/stripe-connect.client';
import { createGoDaddyDomainClient } from '../../integrations/godaddy-domain.client';
import type {
  AuthServiceDependency,
  HostingServiceDependency,
  TutorBookingServiceDependency,
  AIServiceDependency,
  StripeConnectDependency,
  GoDaddyDomainDependency,
  OnboardingEventBus,
  OnboardingCache,
  DnsInstruction,
} from './tutor-onboarding.types';

// ============================================================================
// PRISMA TRANSACTION WRAPPER
// ============================================================================

function createPrismaTransaction(): PrismaTransaction {
  return {
    async createTenantWithUser(params) {
      return prisma.$transaction(async (tx) => {
        const tenant = await tx.tenant.create({
          data: {
            name: params.tenantName,
            slug: params.tenantSlug,
            status: 'active',
            settings: {},
          },
        });

        const user = await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: params.userEmail,
            displayName: params.userDisplayName,
            firstName: params.userDisplayName.split(' ')[0] || params.userDisplayName,
            lastName: params.userDisplayName.split(' ').slice(1).join(' ') || '',
            roles: params.userRoles,
            jurisdiction: params.userJurisdiction,
            trustScore: params.userTrustScore,
          },
        });

        const tutorProfile = await tx.tutorProfile.create({
          data: {
            userId: user.id,
            tutorType: params.tutorType,
            sessionTypes: params.sessionTypes,
            verificationStatus: 'pending',
          },
        });

        return {
          tenantId: tenant.id,
          userId: user.id,
          tutorProfileId: tutorProfile.id,
        };
      });
    },
  };
}

// ============================================================================
// DEPENDENCY ADAPTERS
// ============================================================================

function createAuthAdapter(): AuthServiceDependency {
  return {
    async register(params) {
      const user = await prisma.user.create({
        data: {
          tenantId: params.tenantId,
          email: params.email,
          passwordHash: params.password,
          displayName: params.displayName,
          firstName: params.displayName.split(' ')[0] || params.displayName,
          lastName: params.displayName.split(' ').slice(1).join(' ') || '',
          roles: params.roles,
          jurisdiction: params.jurisdiction || 'AU_VIC',
        },
      });
      return { userId: user.id };
    },
  };
}

function createHostingAdapter(): HostingServiceDependency {
  return {
    async createProvider(params) {
      const subdomain = params.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const provider = await prisma.hostingProvider.create({
        data: {
          tenantId: params.tenantId,
          displayName: params.name,
          description: `${params.name} tutoring platform`,
          type: params.type,
          primaryContact: {},
          features: params.settings || {},
          status: 'pending_setup',
        },
      });
      return { id: provider.id, subdomain };
    },

    async addCustomDomain(providerId, domain) {
      await prisma.hostingProvider.update({
        where: { id: providerId },
        data: { primaryDomain: domain },
      });
      const verificationToken = `scholarly-verify-${providerId.slice(0, 8)}`;
      const dnsInstructions: DnsInstruction[] = [
        { type: 'TXT', host: '_scholarly-verify', value: verificationToken, ttl: 3600 },
        { type: 'CNAME', host: domain, value: 'proxy.scholarly.au', ttl: 3600 },
      ];
      return { verificationToken, dnsInstructions };
    },

    async activateProvider(providerId) {
      const provider = await prisma.hostingProvider.update({
        where: { id: providerId },
        data: { status: 'active' },
      });
      const publishedUrl = provider.primaryDomain
        ? `https://${provider.primaryDomain}`
        : `https://${provider.displayName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.scholar.ly`;
      return { publishedUrl };
    },
  };
}

function createTutorBookingAdapter(): TutorBookingServiceDependency {
  return {
    async updateTutorAvailability(profileId, slots, timezone) {
      await prisma.tutorAvailabilitySlot.deleteMany({ where: { profileId } });
      await prisma.tutorAvailabilitySlot.createMany({
        data: slots.map((s) => ({
          profileId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          timezone,
        })),
      });
      return { slotsCreated: slots.length };
    },

    async upsertPricingTier(profileId, params) {
      await prisma.tutorPricingTier.upsert({
        where: {
          profileId_sessionType_duration: {
            profileId,
            sessionType: params.sessionType,
            duration: params.durationMinutes,
          },
        },
        create: {
          profileId,
          sessionType: params.sessionType,
          duration: params.durationMinutes,
          baseRate: params.baseRateCents / 100,
          currency: params.currency,
        },
        update: {
          baseRate: params.baseRateCents / 100,
          currency: params.currency,
        },
      });
    },

    async startProfileBuilder(_profileId) {
      return {
        questions: [
          { id: 'teaching_style', question: 'How would you describe your teaching style?', type: 'select' as const, options: ['Structured', 'Conversational', 'Immersive', 'Exam-focused'] },
          { id: 'experience', question: 'How many years of tutoring experience do you have?', type: 'select' as const, options: ['0-1', '2-5', '5-10', '10+'] },
          { id: 'unique_approach', question: 'What makes your approach unique?', type: 'text' as const },
        ],
      };
    },
  };
}

function createAIAdapter(): AIServiceDependency {
  return {
    async generateBio(params) {
      return { bio: `${params.name} is a dedicated tutor specialising in ${params.subjects.join(', ')}.` };
    },
    async generateSocialPosts(params) {
      return [
        { platform: 'twitter' as const, content: `Introducing ${params.businessName}! Professional tutoring by ${params.name}.`, hashtags: ['#tutoring', '#education'] },
        { platform: 'linkedin' as const, content: `${params.bio} Now accepting students through ${params.businessName}.`, hashtags: ['#education', '#tutoring'] },
      ];
    },
    async suggestBusinessName(params) {
      return { suggestions: [`${params.name} Tutoring`, `${params.subjects[0]} Academy ${params.location}`, `${params.name}'s Learning Studio`] };
    },
    async suggestTheme(_params) {
      return { primaryColour: '#8839ef', accentColour: '#cba6f7' };
    },
  };
}

// ============================================================================
// STRIPE + GODADDY ADAPTERS
// ============================================================================

function createStripeAdapter(): StripeConnectDependency {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  const accountRegistry = new PrismaConnectedAccountRegistry(prisma as never);
  const client = createStripeConnectClient(
    stripe as never,
    accountRegistry,
    process.env.STRIPE_WEBHOOK_SECRET || '',
  );
  return client as unknown as StripeConnectDependency;
}

function createGoDaddyAdapter(): GoDaddyDomainDependency {
  const client = createGoDaddyDomainClient({
    apiKey: process.env.GODADDY_API_KEY || '',
    apiSecret: process.env.GODADDY_API_SECRET || '',
    environment: (process.env.GODADDY_ENVIRONMENT as 'ote' | 'production') || 'ote',
  });
  return client as unknown as GoDaddyDomainDependency;
}

// ============================================================================
// EVENT BUS + CACHE
// ============================================================================

function createEventBusAdapter(): OnboardingEventBus {
  return {
    async publish(topic: string, payload: Record<string, unknown>) {
      logger.debug({ topic, payload }, 'Onboarding event published');
    },
  };
}

function createCacheAdapter(): OnboardingCache {
  const store = new Map<string, { value: unknown; expiresAt: number }>();
  return {
    async get<T>(key: string): Promise<T | null> {
      const entry = store.get(key);
      if (!entry || entry.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    },
    async set(key: string, value: unknown, ttlSeconds = 86400) {
      store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    },
    async del(key: string) {
      store.delete(key);
    },
  };
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: TutorOnboardingService | null = null;

export function initializeTutorOnboarding(): void {
  if (instance) return;

  try {
    instance = new TutorOnboardingService(
      new PrismaOnboardingSessionRepository(prisma as never),
      createPrismaTransaction(),
      createAuthAdapter(),
      createHostingAdapter(),
      createTutorBookingAdapter(),
      createAIAdapter(),
      createStripeAdapter(),
      createGoDaddyAdapter(),
      createEventBusAdapter(),
      createCacheAdapter(),
    );

    logger.info('Tutor onboarding service initialized');
  } catch (error) {
    logger.warn('Tutor onboarding service initialization failed (missing env vars?) — feature unavailable');
  }
}

export function getTutorOnboardingService(): TutorOnboardingService {
  if (!instance) throw new Error('TutorOnboardingService not initialized — call initializeTutorOnboarding() first');
  return instance;
}
