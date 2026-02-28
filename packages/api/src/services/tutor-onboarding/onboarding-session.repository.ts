/**
 * ============================================================================
 * SCHOLARLY PLATFORM — OnboardingSession Repository (Prisma)
 * ============================================================================
 *
 * The persistence layer for onboarding sessions, backed by Prisma and the
 * OnboardingSession model defined in the schema additions. Think of this as
 * the filing cabinet where every tutor's onboarding boarding pass is stored:
 * the TutorOnboardingService is the concierge who reads and stamps the passes,
 * and this repository is the cabinet that keeps them safe between visits.
 *
 * This follows the repository pattern used throughout Scholarly: services
 * never call Prisma directly, they interact through typed repository
 * interfaces. This makes services testable (inject a mock repository) and
 * isolates database concerns from business logic.
 *
 * @module scholarly/tutor-onboarding/repository
 * @version 1.0.0
 */

import type { OnboardingSession } from './tutor-onboarding.types';
import type { OnboardingSessionRepository } from './tutor-onboarding.service';

// ============================================================================
// PRISMA CLIENT TYPE STUB
// ============================================================================

/**
 * Minimal Prisma Client interface for the OnboardingSession model.
 * In production, this is the actual PrismaClient generated from the schema.
 * We type it at the boundary to avoid importing the full Prisma Client
 * (which is 50,000+ generated types) into the repository module.
 */
interface PrismaClientWithOnboarding {
  onboardingSession: {
    create(args: { data: Record<string, unknown> }): Promise<Record<string, unknown>>;
    findUnique(args: { where: { id: string } }): Promise<Record<string, unknown> | null>;
    findFirst(args: { where: Record<string, unknown> }): Promise<Record<string, unknown> | null>;
    findMany(args: { where: Record<string, unknown>; orderBy?: Record<string, string> }): Promise<Record<string, unknown>[]>;
    update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<Record<string, unknown>>;
  };
}

// ============================================================================
// REPOSITORY IMPLEMENTATION
// ============================================================================

export class PrismaOnboardingSessionRepository implements OnboardingSessionRepository {
  constructor(private readonly prisma: PrismaClientWithOnboarding) {}

  /**
   * Create a new onboarding session.
   */
  async create(session: OnboardingSession): Promise<OnboardingSession> {
    const data = this.toDatabase(session);
    const created = await this.prisma.onboardingSession.create({ data });
    return this.fromDatabase(created);
  }

  /**
   * Find a session by its unique ID.
   */
  async findById(id: string): Promise<OnboardingSession | null> {
    const record = await this.prisma.onboardingSession.findUnique({ where: { id } });
    return record ? this.fromDatabase(record) : null;
  }

  /**
   * Find the most recent active session for a user.
   * Returns the latest non-completed, non-abandoned session.
   */
  async findByUserId(userId: string): Promise<OnboardingSession | null> {
    const record = await this.prisma.onboardingSession.findFirst({
      where: {
        userId,
        currentStep: { notIn: ['COMPLETED', 'ABANDONED'] },
      },
    });
    return record ? this.fromDatabase(record) : null;
  }

  /**
   * Update a session with partial data.
   */
  async update(id: string, data: Partial<OnboardingSession>): Promise<OnboardingSession> {
    const updateData = this.partialToDatabase(data);
    const updated = await this.prisma.onboardingSession.update({
      where: { id },
      data: updateData,
    });
    return this.fromDatabase(updated);
  }

  /**
   * Find sessions that have been inactive beyond the threshold.
   * Used by the cleanup job to mark sessions as abandoned.
   */
  async findAbandonedSessions(olderThanMs: number): Promise<OnboardingSession[]> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const records = await this.prisma.onboardingSession.findMany({
      where: {
        currentStep: {
          notIn: ['COMPLETED', 'ABANDONED'],
        },
        lastActivityAt: { lt: cutoff.toISOString() },
      },
      orderBy: { lastActivityAt: 'asc' },
    });
    return records.map((r) => this.fromDatabase(r));
  }

  // ═══════════════════════════════════════════════════════════════════
  // DATABASE ↔ DOMAIN MAPPING
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Convert a domain OnboardingSession to a Prisma-compatible data object.
   * JSON fields (theme, availabilitySlots, socialPosts, lastError) are
   * stored as JSONB columns.
   */
  private toDatabase(session: OnboardingSession): Record<string, unknown> {
    return {
      id: session.id,
      personaType: session.personaType,
      currentStep: session.currentStep,
      furthestStep: session.furthestStep,
      createdAt: session.createdAt,
      lastActivityAt: session.lastActivityAt,
      completedAt: session.completedAt,
      userId: session.userId,
      tenantId: session.tenantId,
      tutorProfileId: session.tutorProfileId,
      providerId: session.providerId,
      subdomain: session.subdomain,
      businessName: session.businessName,
      theme: session.theme ?? undefined,
      availabilitySlots: session.availabilitySlots,
      timezone: session.timezone,
      domainType: session.domainType,
      domainName: session.domainName,
      domainStatus: session.domainStatus,
      stripeAccountId: session.stripeAccountId,
      stripeStatus: session.stripeStatus,
      suggestedBio: session.suggestedBio,
      bio: session.bio,
      socialPosts: session.socialPosts,
      profilePhotoUrl: session.profilePhotoUrl,
      publishedUrl: session.publishedUrl,
      lastError: session.lastError ?? undefined,
      resumeCount: session.resumeCount,
    };
  }

  /**
   * Convert partial domain data to a Prisma-compatible update object.
   * Only includes fields that are present in the partial (not undefined).
   */
  private partialToDatabase(data: Partial<OnboardingSession>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (data.personaType !== undefined) result.personaType = data.personaType;
    if (data.currentStep !== undefined) result.currentStep = data.currentStep;
    if (data.furthestStep !== undefined) result.furthestStep = data.furthestStep;
    if (data.lastActivityAt !== undefined) result.lastActivityAt = data.lastActivityAt;
    if (data.completedAt !== undefined) result.completedAt = data.completedAt;
    if (data.userId !== undefined) result.userId = data.userId;
    if (data.tenantId !== undefined) result.tenantId = data.tenantId;
    if (data.tutorProfileId !== undefined) result.tutorProfileId = data.tutorProfileId;
    if (data.providerId !== undefined) result.providerId = data.providerId;
    if (data.subdomain !== undefined) result.subdomain = data.subdomain;
    if (data.businessName !== undefined) result.businessName = data.businessName;
    if (data.theme !== undefined) result.theme = data.theme;
    if (data.availabilitySlots !== undefined) result.availabilitySlots = data.availabilitySlots;
    if (data.timezone !== undefined) result.timezone = data.timezone;
    if (data.domainType !== undefined) result.domainType = data.domainType;
    if (data.domainName !== undefined) result.domainName = data.domainName;
    if (data.domainStatus !== undefined) result.domainStatus = data.domainStatus;
    if (data.stripeAccountId !== undefined) result.stripeAccountId = data.stripeAccountId;
    if (data.stripeStatus !== undefined) result.stripeStatus = data.stripeStatus;
    if (data.suggestedBio !== undefined) result.suggestedBio = data.suggestedBio;
    if (data.bio !== undefined) result.bio = data.bio;
    if (data.socialPosts !== undefined) result.socialPosts = data.socialPosts;
    if (data.profilePhotoUrl !== undefined) result.profilePhotoUrl = data.profilePhotoUrl;
    if (data.publishedUrl !== undefined) result.publishedUrl = data.publishedUrl;
    if (data.lastError !== undefined) result.lastError = data.lastError;
    if (data.resumeCount !== undefined) result.resumeCount = data.resumeCount;

    return result;
  }

  /**
   * Convert a Prisma database record back to a domain OnboardingSession.
   * Handles JSON parsing for JSONB columns and date conversion.
   */
  private fromDatabase(record: Record<string, unknown>): OnboardingSession {
    return {
      id: record.id as string,
      personaType: record.personaType as OnboardingSession['personaType'],
      currentStep: record.currentStep as OnboardingSession['currentStep'],
      furthestStep: record.furthestStep as OnboardingSession['furthestStep'],
      createdAt: new Date(record.createdAt as string),
      lastActivityAt: new Date(record.lastActivityAt as string),
      completedAt: record.completedAt ? new Date(record.completedAt as string) : null,
      userId: (record.userId as string) || null,
      tenantId: (record.tenantId as string) || null,
      tutorProfileId: (record.tutorProfileId as string) || null,
      providerId: (record.providerId as string) || null,
      subdomain: (record.subdomain as string) || null,
      businessName: (record.businessName as string) || null,
      theme: (record.theme as OnboardingSession['theme']) || null,
      availabilitySlots: (record.availabilitySlots as OnboardingSession['availabilitySlots']) || [],
      timezone: (record.timezone as string) || null,
      domainType: (record.domainType as OnboardingSession['domainType']) || null,
      domainName: (record.domainName as string) || null,
      domainStatus: (record.domainStatus as OnboardingSession['domainStatus']) || null,
      stripeAccountId: (record.stripeAccountId as string) || null,
      stripeStatus: (record.stripeStatus as OnboardingSession['stripeStatus']) || null,
      suggestedBio: (record.suggestedBio as string) || null,
      bio: (record.bio as string) || null,
      socialPosts: (record.socialPosts as OnboardingSession['socialPosts']) || [],
      profilePhotoUrl: (record.profilePhotoUrl as string) || null,
      publishedUrl: (record.publishedUrl as string) || null,
      lastError: (record.lastError as OnboardingSession['lastError']) || null,
      resumeCount: (record.resumeCount as number) || 0,
      // Denormalised context (populated during Step 1 for Steps 4–7)
      userEmail: (record.userEmail as string) || null,
      displayName: (record.displayName as string) || null,
      subjects: (record.subjects as string[]) || [],
      location: (record.location as string) || null,
      jurisdiction: (record.jurisdiction as string) || null,
      profileCompleteness: (record.profileCompleteness as number) || 0,
      stripeOnboardingStatus: (record.stripeOnboardingStatus as string) || null,
    };
  }
}

export default PrismaOnboardingSessionRepository;
