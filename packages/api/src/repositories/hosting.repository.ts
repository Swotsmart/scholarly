/**
 * Hosting Repositories - Prisma Implementation
 *
 * Database-backed repositories for the hosting services.
 */

import { prisma } from '@scholarly/database';
import {
  HostingProviderRepository,
  HostingProviderFilters,
  HostingEnquiryRepository,
  HostingTourBookingRepository,
  HostingReviewRepository,
  HostingQualityProfileRepository,
  HostingAgentProviderRepository,
  HostingAgentQualityRepository,
  HostingAgentOfferingRepository,
  HostingEducationalProvider,
  HostingProviderDomain,
  HostingEnquiry,
  HostingTourBooking,
  HostingProviderReview,
  HostingEducationalQualityProfile,
  HostingEducationalOffering,
  HostingVerifiedOutcome,
  HostingAccreditation,
  HostingComplianceRecord,
  HostingProviderType,
} from '../services';

// ============================================================================
// TYPE CONVERTERS
// ============================================================================

function toHostingProvider(dbRecord: any): HostingEducationalProvider {
  return {
    id: dbRecord.id,
    tenantId: dbRecord.tenantId,
    type: dbRecord.type as HostingProviderType,
    displayName: dbRecord.displayName,
    legalName: dbRecord.legalName,
    description: dbRecord.description,
    tagline: dbRecord.tagline,
    logoUrl: dbRecord.logoUrl,
    faviconUrl: dbRecord.faviconUrl,
    theme: dbRecord.theme || {},
    locations: dbRecord.locations || [],
    serviceArea: dbRecord.serviceArea,
    primaryContact: dbRecord.primaryContact || {},
    domains: (dbRecord.domains || []).map(toHostingDomain),
    primaryDomain: dbRecord.primaryDomain,
    qualityProfile: dbRecord.qualityProfile || {},
    features: dbRecord.features || {},
    seoConfig: dbRecord.seoConfig || {},
    agentConfig: dbRecord.agentConfig || {},
    lisIdentifiers: dbRecord.lisIdentifiers,
    scholarlyTenantId: dbRecord.scholarlyTenantId,
    status: dbRecord.status,
    createdAt: dbRecord.createdAt,
    updatedAt: dbRecord.updatedAt,
  };
}

function toHostingDomain(dbRecord: any): HostingProviderDomain {
  return {
    id: dbRecord.id,
    providerId: dbRecord.providerId,
    domain: dbRecord.domain,
    type: dbRecord.type,
    status: dbRecord.status,
    sslStatus: dbRecord.sslStatus,
    sslExpiresAt: dbRecord.sslExpiresAt,
    verificationToken: dbRecord.verificationToken,
    verifiedAt: dbRecord.verifiedAt,
    createdAt: dbRecord.createdAt,
    updatedAt: dbRecord.updatedAt,
  };
}

function toHostingEnquiry(dbRecord: any): HostingEnquiry {
  return {
    id: dbRecord.id,
    providerId: dbRecord.providerId,
    offeringId: dbRecord.offeringId,
    contactName: dbRecord.contactName,
    contactEmail: dbRecord.contactEmail,
    contactPhone: dbRecord.contactPhone,
    preferredContact: dbRecord.preferredContact,
    studentName: dbRecord.studentName,
    studentAge: dbRecord.studentAge,
    studentYearLevel: dbRecord.studentYearLevel,
    enquiryType: dbRecord.enquiryType,
    message: dbRecord.message,
    source: dbRecord.source,
    agentId: dbRecord.agentId,
    status: dbRecord.status,
    respondedAt: dbRecord.respondedAt,
    respondedBy: dbRecord.respondedBy,
    createdAt: dbRecord.createdAt,
    updatedAt: dbRecord.updatedAt,
  } as unknown as HostingEnquiry;
}

function toHostingTourBooking(dbRecord: any): HostingTourBooking {
  return {
    id: dbRecord.id,
    providerId: dbRecord.providerId,
    locationId: dbRecord.locationId,
    contactName: dbRecord.contactName,
    contactEmail: dbRecord.contactEmail,
    contactPhone: dbRecord.contactPhone,
    scheduledAt: dbRecord.scheduledAt,
    duration: dbRecord.duration,
    tourType: dbRecord.tourType,
    attendeeCount: dbRecord.attendeeCount,
    studentNames: dbRecord.studentNames || [],
    specialRequests: dbRecord.specialRequests,
    status: dbRecord.status,
    confirmedAt: dbRecord.confirmedAt,
    cancellationReason: dbRecord.cancellationReason,
    providerNotes: dbRecord.providerNotes,
    createdAt: dbRecord.createdAt,
    updatedAt: dbRecord.updatedAt,
  } as HostingTourBooking;
}

function toHostingReview(dbRecord: any): HostingProviderReview {
  return {
    id: dbRecord.id,
    providerId: dbRecord.providerId,
    authorType: dbRecord.authorType,
    authorName: dbRecord.authorName,
    overallRating: dbRecord.overallRating,
    categoryRatings: dbRecord.categoryRatings || [],
    title: dbRecord.title,
    content: dbRecord.content,
    wouldRecommend: dbRecord.wouldRecommend,
    isVerified: dbRecord.isVerified,
    verificationMethod: dbRecord.verificationMethod,
    verifiedAt: dbRecord.verifiedAt,
    providerResponse: dbRecord.providerResponse,
    providerRespondedAt: dbRecord.providerRespondedAt,
    helpfulCount: dbRecord.helpfulCount,
    status: dbRecord.status,
    moderatedAt: dbRecord.moderatedAt,
    moderationNote: dbRecord.moderationNote,
    createdAt: dbRecord.createdAt,
    updatedAt: dbRecord.updatedAt,
  } as HostingProviderReview;
}

function toHostingOffering(dbRecord: any): HostingEducationalOffering {
  return {
    id: dbRecord.id,
    providerId: dbRecord.providerId,
    type: dbRecord.type,
    name: dbRecord.name,
    shortDescription: dbRecord.shortDescription,
    description: dbRecord.description,
    yearLevels: dbRecord.yearLevels || [],
    subjectAreas: dbRecord.subjectAreas || [],
    prerequisites: dbRecord.prerequisites,
    deliveryModes: dbRecord.deliveryModes || [],
    duration: dbRecord.duration,
    schedule: dbRecord.schedule,
    pricing: dbRecord.pricing || {},
    capacity: dbRecord.capacity,
    curriculum: dbRecord.curriculum,
    learningOutcomes: dbRecord.learningOutcomes || [],
    materials: dbRecord.materials,
    featuredImage: dbRecord.featuredImage,
    gallery: dbRecord.gallery || [],
    videoUrl: dbRecord.videoUrl,
    status: dbRecord.status,
    publishedAt: dbRecord.publishedAt,
    createdAt: dbRecord.createdAt,
    updatedAt: dbRecord.updatedAt,
  } as unknown as HostingEducationalOffering;
}

// ============================================================================
// PROVIDER REPOSITORY
// ============================================================================

export function createPrismaProviderRepository(): HostingProviderRepository {
  return {
    async findById(providerId: string) {
      const record = await prisma.hostingProvider.findUnique({
        where: { id: providerId },
        include: { domains: true },
      });
      return record ? toHostingProvider(record) : null;
    },

    async findByTenantId(tenantId: string) {
      const record = await prisma.hostingProvider.findFirst({
        where: { tenantId, deletedAt: null },
        include: { domains: true },
      });
      return record ? toHostingProvider(record) : null;
    },

    async findByDomain(domain: string) {
      const domainRecord = await prisma.hostingDomain.findUnique({
        where: { domain: domain.toLowerCase() },
        include: {
          provider: {
            include: { domains: true },
          },
        },
      });
      return domainRecord?.provider ? toHostingProvider(domainRecord.provider) : null;
    },

    async findAll(filters: HostingProviderFilters) {
      const where: any = { deletedAt: null };

      if (filters.types?.length) {
        where.type = { in: filters.types };
      }
      if (filters.status?.length) {
        where.status = { in: filters.status };
      }

      const [records, total] = await Promise.all([
        prisma.hostingProvider.findMany({
          where,
          include: { domains: true },
          skip: filters.offset || 0,
          take: filters.limit || 20,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.hostingProvider.count({ where }),
      ]);

      return {
        providers: records.map(toHostingProvider),
        total,
      };
    },

    async create(provider) {
      // Extract domains from provider data
      const { domains: domainData, ...providerData } = provider as any;

      const record = await prisma.hostingProvider.create({
        data: {
          tenantId: providerData.tenantId,
          type: providerData.type,
          displayName: providerData.displayName,
          legalName: providerData.legalName,
          description: providerData.description,
          tagline: providerData.tagline,
          logoUrl: providerData.logoUrl,
          faviconUrl: providerData.faviconUrl,
          theme: providerData.theme || {},
          locations: providerData.locations || [],
          serviceArea: providerData.serviceArea,
          primaryContact: providerData.primaryContact || {},
          primaryDomain: providerData.primaryDomain,
          qualityProfile: providerData.qualityProfile || {},
          features: providerData.features || {},
          seoConfig: providerData.seoConfig || {},
          agentConfig: providerData.agentConfig || {},
          lisIdentifiers: providerData.lisIdentifiers,
          scholarlyTenantId: providerData.scholarlyTenantId,
          status: providerData.status || 'pending_setup',
          domains: domainData?.length ? {
            create: domainData.map((d: any) => ({
              domain: d.domain.toLowerCase(),
              type: d.type,
              status: d.status,
              sslStatus: d.sslStatus || 'pending',
              verificationToken: d.verificationToken,
              verifiedAt: d.verifiedAt,
            })),
          } : undefined,
        },
        include: { domains: true },
      });

      return toHostingProvider(record);
    },

    async update(providerId: string, updates) {
      // Extract domains from updates as they need special handling
      const { domains, ...updateData } = updates as any;
      const record = await prisma.hostingProvider.update({
        where: { id: providerId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
        include: { domains: true },
      });
      return toHostingProvider(record);
    },

    async delete(providerId: string) {
      await prisma.hostingProvider.update({
        where: { id: providerId },
        data: { deletedAt: new Date() },
      });
    },

    async addDomain(providerId: string, domain) {
      const record = await prisma.hostingDomain.create({
        data: {
          providerId,
          domain: domain.domain.toLowerCase(),
          type: domain.type,
          status: domain.status,
          sslStatus: domain.sslStatus || 'pending',
          verificationToken: domain.verificationToken,
          verifiedAt: domain.verifiedAt,
        },
      });
      return toHostingDomain(record);
    },

    async updateDomain(providerId: string, domainId: string, updates) {
      const record = await prisma.hostingDomain.update({
        where: { id: domainId, providerId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
      return toHostingDomain(record);
    },

    async deleteDomain(providerId: string, domainId: string) {
      await prisma.hostingDomain.delete({
        where: { id: domainId, providerId },
      });
    },

    async findDomainByName(domain: string) {
      const record = await prisma.hostingDomain.findUnique({
        where: { domain: domain.toLowerCase() },
      });
      return record ? { ...toHostingDomain(record), providerId: record.providerId } : null;
    },
  };
}

// ============================================================================
// ENQUIRY REPOSITORY
// ============================================================================

export function createPrismaEnquiryRepository(): HostingEnquiryRepository {
  return {
    async findById(enquiryId: string) {
      const record = await prisma.hostingEnquiry.findUnique({
        where: { id: enquiryId },
      });
      return record ? toHostingEnquiry(record) : null;
    },

    async findByProviderId(providerId: string, status?: string[]) {
      const where: any = { providerId };
      if (status?.length) {
        where.status = { in: status };
      }

      const records = await prisma.hostingEnquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return records.map(toHostingEnquiry);
    },

    async create(enquiry) {
      const record = await prisma.hostingEnquiry.create({
        data: {
          providerId: enquiry.providerId,
          offeringId: enquiry.offeringId,
          contactName: enquiry.contactName,
          contactEmail: enquiry.contactEmail,
          contactPhone: enquiry.contactPhone,
          preferredContact: enquiry.preferredContact || 'email',
          studentName: enquiry.studentName,
          studentAge: enquiry.studentAge,
          studentYearLevel: enquiry.studentYearLevel,
          enquiryType: enquiry.enquiryType,
          message: enquiry.message,
          source: enquiry.source || 'website',
          agentId: enquiry.agentId,
          status: 'new',
        },
      });
      return toHostingEnquiry(record);
    },

    async update(enquiryId: string, updates) {
      const record = await prisma.hostingEnquiry.update({
        where: { id: enquiryId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
      return toHostingEnquiry(record);
    },

    async delete(enquiryId: string) {
      await prisma.hostingEnquiry.delete({
        where: { id: enquiryId },
      });
    },
  };
}

// ============================================================================
// TOUR BOOKING REPOSITORY
// ============================================================================

export function createPrismaTourBookingRepository(): HostingTourBookingRepository {
  return {
    async findById(bookingId: string) {
      const record = await prisma.hostingTourBooking.findUnique({
        where: { id: bookingId },
      });
      return record ? toHostingTourBooking(record) : null;
    },

    async findByProviderId(providerId: string, status?: string[]) {
      const where: any = { providerId };
      if (status?.length) {
        where.status = { in: status };
      }

      const records = await prisma.hostingTourBooking.findMany({
        where,
        orderBy: { scheduledAt: 'asc' },
      });

      return records.map(toHostingTourBooking);
    },

    async findUpcoming(providerId: string) {
      const records = await prisma.hostingTourBooking.findMany({
        where: {
          providerId,
          scheduledAt: { gt: new Date() },
          status: { in: ['pending', 'confirmed'] },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      return records.map(toHostingTourBooking);
    },

    async create(booking) {
      const record = await prisma.hostingTourBooking.create({
        data: {
          providerId: booking.providerId,
          locationId: booking.locationId,
          contactName: booking.contactName,
          contactEmail: booking.contactEmail,
          contactPhone: booking.contactPhone,
          scheduledAt: booking.scheduledAt,
          duration: booking.duration || 60,
          tourType: booking.tourType,
          attendeeCount: booking.attendeeCount,
          studentNames: booking.studentNames || [],
          specialRequests: booking.specialRequests,
          status: 'pending',
        },
      });
      return toHostingTourBooking(record);
    },

    async update(bookingId: string, updates) {
      const record = await prisma.hostingTourBooking.update({
        where: { id: bookingId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
      return toHostingTourBooking(record);
    },

    async delete(bookingId: string) {
      await prisma.hostingTourBooking.delete({
        where: { id: bookingId },
      });
    },
  };
}

// ============================================================================
// REVIEW REPOSITORY
// ============================================================================

export function createPrismaReviewRepository(): HostingReviewRepository {
  return {
    async findById(reviewId: string) {
      const record = await prisma.hostingReview.findUnique({
        where: { id: reviewId },
      });
      return record ? toHostingReview(record) : null;
    },

    async findByProviderId(providerId: string, status?: string[]) {
      const where: any = { providerId };
      if (status?.length) {
        where.status = { in: status };
      }

      const records = await prisma.hostingReview.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      return records.map(toHostingReview);
    },

    async getAggregateRating(providerId: string) {
      const reviews = await prisma.hostingReview.findMany({
        where: { providerId, status: 'published' },
        select: { overallRating: true },
      });

      if (reviews.length === 0) return null;

      const ratings = reviews.map((r) => r.overallRating);
      const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      const distribution: Record<string, number> = {};
      for (const rating of ratings) {
        const key = Math.round(rating).toString();
        distribution[key] = (distribution[key] || 0) + 1;
      }

      return {
        average,
        count: reviews.length,
        distribution,
      };
    },

    async create(review) {
      const record = await prisma.hostingReview.create({
        data: {
          providerId: review.providerId,
          authorType: review.authorType,
          authorName: review.authorName,
          overallRating: review.overallRating,
          categoryRatings: review.categoryRatings || [],
          title: review.title,
          content: review.content,
          wouldRecommend: review.wouldRecommend,
          status: 'pending',
        },
      });
      return toHostingReview(record);
    },

    async update(reviewId: string, updates) {
      const record = await prisma.hostingReview.update({
        where: { id: reviewId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
      return toHostingReview(record);
    },

    async delete(reviewId: string) {
      await prisma.hostingReview.delete({
        where: { id: reviewId },
      });
    },
  };
}

// ============================================================================
// QUALITY PROFILE REPOSITORY
// ============================================================================

export function createPrismaQualityProfileRepository(): HostingQualityProfileRepository {
  return {
    async findByProviderId(providerId: string) {
      const provider = await prisma.hostingProvider.findUnique({
        where: { id: providerId },
        select: { qualityProfile: true },
      });
      return provider?.qualityProfile as unknown as HostingEducationalQualityProfile | null;
    },

    async update(providerId: string, updates) {
      const current = await prisma.hostingProvider.findUnique({
        where: { id: providerId },
        select: { qualityProfile: true },
      });

      const updatedProfile = {
        ...(current?.qualityProfile as object || {}),
        ...updates,
      };

      await prisma.hostingProvider.update({
        where: { id: providerId },
        data: { qualityProfile: updatedProfile },
      });

      return updatedProfile as HostingEducationalQualityProfile;
    },

    async addOutcome(providerId: string, outcome) {
      const id = `out_${Date.now().toString(36)}`;
      const newOutcome: HostingVerifiedOutcome = { ...outcome, id };

      await prisma.hostingQualityEvent.create({
        data: {
          providerId,
          eventType: 'outcome',
          data: newOutcome as any,
          isVerified: false,
        },
      });

      // Also update the provider's quality profile
      const provider = await prisma.hostingProvider.findUnique({
        where: { id: providerId },
        select: { qualityProfile: true },
      });

      const profile = provider?.qualityProfile as any || {};
      const verifiedOutcomes = profile.verifiedOutcomes || [];
      verifiedOutcomes.push(newOutcome);

      await prisma.hostingProvider.update({
        where: { id: providerId },
        data: {
          qualityProfile: { ...profile, verifiedOutcomes },
        },
      });

      return newOutcome;
    },

    async addAccreditation(providerId: string, accreditation) {
      const id = `acc_${Date.now().toString(36)}`;
      const newAccreditation: HostingAccreditation = { ...accreditation, id };

      await prisma.hostingQualityEvent.create({
        data: {
          providerId,
          eventType: 'accreditation',
          data: newAccreditation as any,
          isVerified: false,
          validFrom: accreditation.issuedAt,
          validUntil: accreditation.expiresAt,
        },
      });

      // Also update the provider's quality profile
      const provider = await prisma.hostingProvider.findUnique({
        where: { id: providerId },
        select: { qualityProfile: true },
      });

      const profile = provider?.qualityProfile as any || {};
      const accreditations = profile.accreditations || [];
      accreditations.push(newAccreditation);

      await prisma.hostingProvider.update({
        where: { id: providerId },
        data: {
          qualityProfile: { ...profile, accreditations },
        },
      });

      return newAccreditation;
    },

    async updateAccreditation(providerId: string, accreditationId: string, updates) {
      const provider = await prisma.hostingProvider.findUnique({
        where: { id: providerId },
        select: { qualityProfile: true },
      });

      const profile = provider?.qualityProfile as any || {};
      const accreditations = profile.accreditations || [];
      const index = accreditations.findIndex((a: any) => a.id === accreditationId);

      if (index === -1) {
        throw new Error(`Accreditation not found: ${accreditationId}`);
      }

      const updated = { ...accreditations[index], ...updates };
      accreditations[index] = updated;

      await prisma.hostingProvider.update({
        where: { id: providerId },
        data: {
          qualityProfile: { ...profile, accreditations },
        },
      });

      return updated as HostingAccreditation;
    },

    async addComplianceRecord(providerId: string, record) {
      const id = `comp_${Date.now().toString(36)}`;
      const newRecord: HostingComplianceRecord = { ...record, id };

      await prisma.hostingQualityEvent.create({
        data: {
          providerId,
          eventType: 'compliance',
          data: newRecord as any,
          isVerified: false,
        },
      });

      // Also update the provider's quality profile
      const provider = await prisma.hostingProvider.findUnique({
        where: { id: providerId },
        select: { qualityProfile: true },
      });

      const profile = provider?.qualityProfile as any || {};
      const complianceRecords = profile.complianceRecords || [];
      complianceRecords.push(newRecord);

      await prisma.hostingProvider.update({
        where: { id: providerId },
        data: {
          qualityProfile: { ...profile, complianceRecords },
        },
      });

      return newRecord;
    },
  };
}

// ============================================================================
// AGENT API REPOSITORIES
// ============================================================================

export function createPrismaAgentProviderRepository(): HostingAgentProviderRepository {
  return {
    async findById(providerId: string) {
      const record = await prisma.hostingProvider.findUnique({
        where: { id: providerId, deletedAt: null },
        include: { domains: true },
      });
      return record ? toHostingProvider(record) : null;
    },
    async findAll(filters: Record<string, unknown>) {
      const where: any = { deletedAt: null };
      if (filters.types) where.type = { in: filters.types };
      if (filters.location) where.location = filters.location;
      const records = await prisma.hostingProvider.findMany({
        where,
        include: { domains: true },
        orderBy: { createdAt: 'desc' },
      });
      return {
        providers: records.map(toHostingProvider),
        total: records.length,
      };
    },
  };
}

export function createPrismaAgentQualityRepository(): HostingAgentQualityRepository {
  return {
    async findByProviderId(providerId: string) {
      const provider = await prisma.hostingProvider.findUnique({
        where: { id: providerId },
        select: { qualityProfile: true },
      });
      return provider?.qualityProfile as unknown as HostingEducationalQualityProfile | null;
    },
  };
}

export function createPrismaAgentOfferingRepository(): HostingAgentOfferingRepository {
  return {
    async findById(offeringId: string) {
      const record = await prisma.hostingOffering.findUnique({
        where: { id: offeringId },
      });
      return record ? toHostingOffering(record) : null;
    },

    async findByProviderId(providerId: string) {
      const records = await prisma.hostingOffering.findMany({
        where: { providerId, status: 'published' },
        orderBy: { createdAt: 'desc' },
      });
      return records.map(toHostingOffering);
    },

    async search(filters: Record<string, unknown>) {
      const where: any = { status: 'published' };

      if ((filters as any).providerId) {
        where.providerId = (filters as any).providerId;
      }

      if ((filters as any).query) {
        where.OR = [
          { name: { contains: (filters as any).query, mode: 'insensitive' } },
          { description: { contains: (filters as any).query, mode: 'insensitive' } },
        ];
      }

      const [records, total] = await Promise.all([
        prisma.hostingOffering.findMany({
          where,
          skip: (filters as any).offset || 0,
          take: (filters as any).limit || 20,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.hostingOffering.count({ where }),
      ]);

      return {
        offerings: records.map(toHostingOffering),
        total,
      };
    },
  };
}
