/**
 * Homeschool Hub Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { ApiError } from '../middleware/error-handler';

export const homeschoolRouter: Router = Router();

// Get current family
homeschoolRouter.get('/family', async (req, res) => {
  const { tenantId, user } = req;

  const family = await prisma.homeschoolFamily.findFirst({
    where: {
      tenantId,
      primaryContactUserId: user?.id,
    },
    include: {
      children: true,
      coopMemberships: {
        include: {
          coop: {
            select: { id: true, name: true, status: true },
          },
        },
      },
    },
  });

  if (!family) {
    return res.json({ family: null });
  }

  res.json({ family });
});

// Create/update family
const familySchema = z.object({
  primaryContactName: z.string(),
  primaryContactEmail: z.string().email(),
  primaryContactPhone: z.string().optional(),
  location: z.object({
    jurisdiction: z.string(),
    suburb: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string(),
    travelRadiusKm: z.number().min(1).max(100),
  }),
  educationalProfile: z.object({
    primaryApproach: z.string(),
    secondaryApproaches: z.array(z.string()).optional(),
    structureLevel: z.string(),
    prioritySubjects: z.array(z.string()),
    enrichmentFocus: z.array(z.string()).optional(),
    assessmentStyle: z.string(),
  }),
  coopPreferences: z.object({
    interestedInCoops: z.boolean(),
    maxCoopsToJoin: z.number().min(0).max(5),
    willingToHost: z.boolean(),
    willingToTeach: z.boolean(),
    willingToOrganize: z.boolean(),
    availableDays: z.array(z.string()),
    preferredTimes: z.array(z.string()),
    preferredCoopSize: z.string(),
    ageRangeTolerance: z.number().min(0).max(5),
  }),
});

homeschoolRouter.post('/family', async (req, res) => {
  const { tenantId, user } = req;
  const data = familySchema.parse(req.body);

  const family = await prisma.homeschoolFamily.upsert({
    where: {
      id: `${tenantId}_${user?.id}`, // Use composite key
    },
    update: {
      ...data,
      updatedAt: new Date(),
      lastActiveAt: new Date(),
    },
    create: {
      tenant: { connect: { id: tenantId } },
      primaryContactUserId: user!.id,
      primaryContactName: data.primaryContactName,
      primaryContactEmail: data.primaryContactEmail,
      primaryContactPhone: data.primaryContactPhone,
      location: data.location,
      educationalProfile: data.educationalProfile,
      coopPreferences: data.coopPreferences,
      additionalContacts: [],
      teachingCapabilities: [],
      compliance: {
        jurisdiction: data.location.jurisdiction,
        registrationStatus: 'pending',
        documents: [],
        reportingFrequency: 'annual',
        complianceScore: 0,
        complianceAlerts: ['Registration required'],
        suggestedActions: ['Register for homeschooling in your jurisdiction'],
      },
      aiProfile: {
        compatibilityVector: [],
        predictedChallenges: [],
        predictedStrengths: [],
        engagementScore: 0,
        engagementTrend: 'stable',
        recommendedCoops: [],
        recommendedResources: [],
        recommendedConnections: [],
        supportNeedsScore: 0,
        suggestedSupport: [],
        lastAnalyzed: new Date(),
      },
      status: 'active',
    },
    include: {
      children: true,
    },
  });

  res.json({ family });
});

// Add/update child
const childSchema = z.object({
  name: z.string(),
  dateOfBirth: z.string().datetime(),
  currentYearLevel: z.string(),
  learningStyle: z.string().optional(),
  interests: z.array(z.string()).optional(),
  strengths: z.array(z.string()).optional(),
  challengeAreas: z.array(z.string()).optional(),
  specialNeeds: z.array(z.string()).optional(),
  curriculumFramework: z.string().optional(),
});

homeschoolRouter.post('/family/children', async (req, res) => {
  const { tenantId, user } = req;
  const data = childSchema.parse(req.body);

  const family = await prisma.homeschoolFamily.findFirst({
    where: { tenantId, primaryContactUserId: user?.id },
  });

  if (!family) {
    throw ApiError.notFound('Family');
  }

  const child = await prisma.homeschoolChild.create({
    data: {
      familyId: family.id,
      name: data.name,
      dateOfBirth: new Date(data.dateOfBirth),
      currentYearLevel: data.currentYearLevel,
      learningStyle: data.learningStyle,
      interests: data.interests || [],
      strengths: data.strengths || [],
      challengeAreas: data.challengeAreas || [],
      specialNeeds: data.specialNeeds || [],
      curriculumFramework: data.curriculumFramework || 'ACARA',
      subjectProgress: [],
    },
  });

  res.status(201).json({ child });
});

// Find families for matching
homeschoolRouter.get('/families/search', async (req, res) => {
  const { tenantId, user } = req;
  const { suburb, radius = '30', approach } = req.query;

  // Get current family
  const currentFamily = await prisma.homeschoolFamily.findFirst({
    where: { tenantId, primaryContactUserId: user?.id },
  });

  if (!currentFamily) {
    throw ApiError.badRequest('You must create a family profile first');
  }

  const families = await prisma.homeschoolFamily.findMany({
    where: {
      tenantId,
      id: { not: currentFamily.id },
      status: 'active',
    },
    include: {
      children: true,
    },
  });

  // Calculate match scores
  const matches = families.map(family => {
    const currentLocation = currentFamily.location as { suburb: string; postcode: string; travelRadiusKm: number };
    const familyLocation = family.location as { suburb: string; postcode: string; travelRadiusKm: number };
    const currentProfile = currentFamily.educationalProfile as { primaryApproach: string };
    const familyProfile = family.educationalProfile as { primaryApproach: string };

    let compatibilityScore = 50;
    const matchReasons: string[] = [];

    // Same suburb bonus
    if (familyLocation.suburb === currentLocation.suburb) {
      compatibilityScore += 20;
      matchReasons.push('Same suburb');
    }

    // Same approach bonus
    if (familyProfile.primaryApproach === currentProfile.primaryApproach) {
      compatibilityScore += 15;
      matchReasons.push('Same educational approach');
    }

    // Children age overlap
    const currentChildAges = (currentFamily as unknown as { children: { dateOfBirth: Date }[] }).children?.map(c => {
      const age = Math.floor((Date.now() - new Date(c.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return age;
    }) || [];

    const familyChildAges = family.children.map(c => {
      const age = Math.floor((Date.now() - new Date(c.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return age;
    });

    const hasAgeOverlap = currentChildAges.some(ca =>
      familyChildAges.some(fa => Math.abs(ca - fa) <= 2)
    );

    if (hasAgeOverlap) {
      compatibilityScore += 15;
      matchReasons.push('Children of similar ages');
    }

    return {
      familyId: family.id,
      familyName: family.primaryContactName.split(' ')[0] + "'s Family",
      location: familyLocation.suburb,
      educationalApproach: familyProfile.primaryApproach,
      childrenAges: familyChildAges,
      childrenCount: family.children.length,
      compatibilityScore: Math.min(100, compatibilityScore),
      matchReasons,
    };
  });

  // Sort by compatibility
  matches.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

  res.json({ matches: matches.slice(0, 20) });
});

// Get co-ops
homeschoolRouter.get('/coops', async (req, res) => {
  const { tenantId } = req;
  const { status = 'active', page = '1', pageSize = '20' } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const [coops, total] = await Promise.all([
    prisma.homeschoolCoop.findMany({
      where: { tenantId, status: status as string },
      skip,
      take,
      include: {
        members: {
          where: { status: 'active' },
          include: {
            family: {
              select: { primaryContactName: true },
            },
          },
        },
        _count: {
          select: { members: true },
        },
      },
    }),
    prisma.homeschoolCoop.count({ where: { tenantId, status: status as string } }),
  ]);

  res.json({
    coops,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});

// Create co-op
const coopSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(20).max(2000),
  philosophy: z.string(),
  primaryLocation: z.object({
    name: z.string(),
    address: z.string(),
  }),
  maxFamilies: z.number().min(3).max(30),
  meetingSchedule: z.object({
    frequency: z.string(),
    dayOfWeek: z.number().min(0).max(6),
    startTime: z.string(),
    endTime: z.string(),
    timezone: z.string(),
  }),
  subjects: z.array(z.string()),
  ageRange: z.object({
    min: z.number(),
    max: z.number(),
  }),
  educationalApproaches: z.array(z.string()),
});

homeschoolRouter.post('/coops', async (req, res) => {
  const { tenantId, user } = req;
  const data = coopSchema.parse(req.body);

  const family = await prisma.homeschoolFamily.findFirst({
    where: { tenantId, primaryContactUserId: user?.id },
  });

  if (!family) {
    throw ApiError.badRequest('You must create a family profile first');
  }

  const coop = await prisma.homeschoolCoop.create({
    data: {
      tenant: { connect: { id: tenantId } },
      name: data.name,
      description: data.description,
      philosophy: data.philosophy,
      primaryLocation: data.primaryLocation,
      maxFamilies: data.maxFamilies,
      meetingSchedule: data.meetingSchedule,
      subjects: data.subjects,
      ageRange: data.ageRange,
      educationalApproaches: data.educationalApproaches,
      meetingLocations: [],
      structure: {
        type: 'rotating_parent',
        description: 'Parents take turns teaching their areas of expertise',
      },
      roles: [],
      status: 'forming',
      members: {
        create: {
          family: { connect: { id: family.id } },
          role: 'organizer',
          teachingSubjects: [],
        },
      },
    },
    include: {
      members: {
        include: {
          family: {
            select: { primaryContactName: true },
          },
        },
      },
    },
  });

  res.status(201).json({ coop });
});

// Join co-op
homeschoolRouter.post('/coops/:id/join', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;
  const { teachingSubjects = [] } = req.body;

  const family = await prisma.homeschoolFamily.findFirst({
    where: { tenantId, primaryContactUserId: user?.id },
  });

  if (!family) {
    throw ApiError.badRequest('You must create a family profile first');
  }

  const coop = await prisma.homeschoolCoop.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { members: true } } },
  });

  if (!coop) {
    throw ApiError.notFound('Co-op', id);
  }

  if (coop._count.members >= coop.maxFamilies) {
    throw ApiError.conflict('This co-op is full');
  }

  // Check if already a member
  const existingMembership = await prisma.coopMember.findUnique({
    where: { coopId_familyId: { coopId: id, familyId: family.id } },
  });

  if (existingMembership) {
    throw ApiError.conflict('You are already a member of this co-op');
  }

  const membership = await prisma.coopMember.create({
    data: {
      coopId: id,
      familyId: family.id,
      role: 'member',
      teachingSubjects,
      status: 'pending',
    },
  });

  res.status(201).json({ membership });
});

// Get excursions
homeschoolRouter.get('/excursions', async (req, res) => {
  const { tenantId } = req;
  const { upcoming = 'true', page = '1', pageSize = '20' } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const where: Record<string, unknown> = { tenantId };

  if (upcoming === 'true') {
    where.date = { gte: new Date() };
    where.status = { in: ['open', 'confirmed'] };
  }

  const [excursions, total] = await Promise.all([
    prisma.excursion.findMany({
      where,
      skip,
      take,
      include: {
        coop: {
          select: { name: true },
        },
        _count: {
          select: { registrations: true },
        },
      },
      orderBy: { date: 'asc' },
    }),
    prisma.excursion.count({ where }),
  ]);

  res.json({
    excursions,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});
