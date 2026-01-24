/**
 * Micro-School Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { ApiError } from '../middleware/error-handler';

export const microSchoolRouter: Router = Router();

// Get micro-schools
microSchoolRouter.get('/', async (req, res) => {
  const { tenantId } = req;
  const { status, page = '1', pageSize = '20' } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const where: Record<string, unknown> = { tenantId };
  if (status) where.status = status;

  const [schools, total] = await Promise.all([
    prisma.microSchool.findMany({
      where,
      skip,
      take,
      include: {
        _count: {
          select: { students: true, staff: true },
        },
      },
    }),
    prisma.microSchool.count({ where }),
  ]);

  res.json({
    schools,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});

// Get school by ID
microSchoolRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req;

  const school = await prisma.microSchool.findFirst({
    where: { id, tenantId },
    include: {
      staff: true,
      students: true,
      applications: {
        where: { status: { in: ['submitted', 'under_review'] } },
      },
    },
  });

  if (!school) {
    throw ApiError.notFound('Micro-school', id);
  }

  res.json({ school });
});

// Create micro-school
const createSchoolSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().min(20).max(2000),
  philosophy: z.string(),
  educationalModel: z.string(),
  location: z.object({
    name: z.string(),
    type: z.string(),
    address: z.string(),
    suburb: z.string(),
    state: z.string(),
    postcode: z.string(),
    jurisdiction: z.string(),
  }),
  enrollmentCapacity: z.number().min(5).max(50),
  curriculumFramework: z.string(),
  subjects: z.array(z.string()),
  yearLevelsOffered: z.array(z.string()),
  schedule: z.object({
    timezone: z.string(),
    daysOfOperation: z.array(z.number()),
    startTime: z.string(),
    endTime: z.string(),
    periods: z.array(z.object({
      name: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      type: z.string(),
    })),
  }),
  tuitionFees: z.object({
    currency: z.string(),
    termFee: z.number().optional(),
    paymentSchedule: z.string(),
    includes: z.array(z.string()).optional(),
    excludes: z.array(z.string()).optional(),
  }),
});

microSchoolRouter.post('/', async (req, res) => {
  const { tenantId, user } = req;
  const data = createSchoolSchema.parse(req.body);

  const school = await prisma.microSchool.create({
    data: {
      tenantId,
      founderId: user!.id,
      name: data.name,
      description: data.description,
      philosophy: data.philosophy,
      educationalModel: data.educationalModel,
      location: {
        create: {
          tenantId,
          label: data.location.name,
          streetAddress: data.location.address,
          suburb: data.location.suburb,
          state: data.location.state,
          postcode: data.location.postcode,
          type: data.location.type,
        },
      },
      enrollmentCapacity: data.enrollmentCapacity,
      curriculumFramework: data.curriculumFramework,
      subjects: data.subjects,
      yearLevelsOffered: data.yearLevelsOffered,
      schedule: data.schedule,
      tuitionFees: data.tuitionFees,
      facilities: [],
      compliance: {
        jurisdiction: data.location.jurisdiction,
        registrationStatus: 'pending',
        registrationAuthority: 'State Education Authority',
        documents: [],
        policies: [],
        complianceScore: 0,
        complianceAlerts: ['Registration required'],
        recommendedActions: ['Complete registration application'],
      },
      termDates: [],
      status: 'forming',
    },
    include: {
      location: true,
    },
  });

  res.status(201).json({ school });
});

// Update school
microSchoolRouter.patch('/:id', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;

  const school = await prisma.microSchool.findFirst({
    where: { id, tenantId },
  });

  if (!school) {
    throw ApiError.notFound('Micro-school', id);
  }

  if (school.founderId !== user?.id && !user?.roles.includes('platform_admin')) {
    throw ApiError.forbidden();
  }

  const updated = await prisma.microSchool.update({
    where: { id },
    data: {
      ...req.body,
      updatedAt: new Date(),
    },
  });

  res.json({ school: updated });
});

// Add staff
const addStaffSchema = z.object({
  userId: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.string(),
  employmentType: z.string(),
  teachingSubjects: z.array(z.string()).optional(),
  yearLevelCapabilities: z.array(z.string()).optional(),
  startDate: z.string().datetime(),
});

microSchoolRouter.post('/:id/staff', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;
  const data = addStaffSchema.parse(req.body);

  const school = await prisma.microSchool.findFirst({
    where: { id, tenantId },
  });

  if (!school) {
    throw ApiError.notFound('Micro-school', id);
  }

  if (school.founderId !== user?.id && !user?.roles.includes('platform_admin')) {
    throw ApiError.forbidden();
  }

  const staff = await prisma.microSchoolStaff.create({
    data: {
      school: { connect: { id } },
      userId: data.userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      role: data.role,
      employmentType: data.employmentType,
      teachingSubjects: data.teachingSubjects || [],
      yearLevelCapabilities: data.yearLevelCapabilities || [],
      qualifications: [],
      startDate: new Date(data.startDate),
      status: 'pending_verification',
    },
  });

  res.status(201).json({ staff });
});

// Enroll student
const enrollSchema = z.object({
  familyId: z.string(),
  studentName: z.string(),
  studentDob: z.string().datetime(),
  requestedYearLevel: z.string(),
  requestedStartDate: z.string().datetime(),
  reasonForEnrolling: z.string(),
  previousSchooling: z.string(),
  learningNeeds: z.string().optional(),
});

microSchoolRouter.post('/:id/enroll', async (req, res) => {
  const { id } = req.params;
  const { tenantId } = req;
  const data = enrollSchema.parse(req.body);

  const school = await prisma.microSchool.findFirst({
    where: { id, tenantId },
    include: { _count: { select: { students: true } } },
  });

  if (!school) {
    throw ApiError.notFound('Micro-school', id);
  }

  if (school._count.students >= school.enrollmentCapacity) {
    throw ApiError.conflict('School is at capacity');
  }

  const application = await prisma.enrollmentApplication.create({
    data: {
      school: { connect: { id } },
      familyId: data.familyId,
      studentName: data.studentName,
      studentDob: new Date(data.studentDob),
      requestedYearLevel: data.requestedYearLevel,
      requestedStartDate: new Date(data.requestedStartDate),
      reasonForEnrolling: data.reasonForEnrolling,
      previousSchooling: data.previousSchooling,
      learningNeeds: data.learningNeeds,
      status: 'submitted',
    },
  });

  res.status(201).json({ application });
});

// Get applications
microSchoolRouter.get('/:id/applications', async (req, res) => {
  const { id } = req.params;
  const { tenantId, user } = req;
  const { status } = req.query;

  const school = await prisma.microSchool.findFirst({
    where: { id, tenantId },
  });

  if (!school) {
    throw ApiError.notFound('Micro-school', id);
  }

  // Check permissions
  const isStaff = await prisma.microSchoolStaff.findFirst({
    where: { schoolId: id, userId: user?.id },
  });

  if (school.founderId !== user?.id && !isStaff && !user?.roles.includes('platform_admin')) {
    throw ApiError.forbidden();
  }

  const where: Record<string, unknown> = { schoolId: id };
  if (status) where.status = status;

  const applications = await prisma.enrollmentApplication.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  res.json({ applications });
});

// Get setup guidance
microSchoolRouter.get('/setup-guidance/:jurisdiction', async (req, res) => {
  const { jurisdiction } = req.params;

  // Return setup guidance for jurisdiction
  const guidance = {
    jurisdiction,
    estimatedTimeline: '3-6 months',
    steps: [
      {
        order: 1,
        category: 'Legal',
        title: 'Choose legal structure',
        description: 'Decide on business structure (sole trader, company, association)',
        requirements: ['Research options', 'Consult accountant/lawyer'],
        estimatedDuration: '1-2 weeks',
        resources: [],
        status: 'not_started',
      },
      {
        order: 2,
        category: 'Registration',
        title: 'Register with education authority',
        description: 'Submit application to state education department',
        requirements: ['Curriculum plan', 'Staff qualifications', 'Location details'],
        estimatedDuration: '4-8 weeks',
        resources: [],
        status: 'not_started',
      },
      {
        order: 3,
        category: 'Compliance',
        title: 'Obtain required checks',
        description: 'Working with children checks for all staff',
        requirements: ['WWCC for all staff', 'First aid certification'],
        estimatedDuration: '2-4 weeks',
        resources: [],
        status: 'not_started',
      },
      {
        order: 4,
        category: 'Insurance',
        title: 'Obtain insurance',
        description: 'Public liability and professional indemnity insurance',
        requirements: ['Minimum $10M public liability'],
        estimatedDuration: '1-2 weeks',
        resources: [],
        status: 'not_started',
      },
      {
        order: 5,
        category: 'Policies',
        title: 'Develop policies',
        description: 'Create required policies and procedures',
        requirements: ['Child protection', 'Health & safety', 'Behavior management'],
        estimatedDuration: '2-4 weeks',
        resources: [],
        status: 'not_started',
      },
    ],
    estimatedCosts: [
      { category: 'Legal', item: 'Business registration', estimatedAmount: 500, currency: 'AUD', frequency: 'one_time', required: true },
      { category: 'Registration', item: 'School registration fee', estimatedAmount: 2000, currency: 'AUD', frequency: 'one_time', required: true },
      { category: 'Insurance', item: 'Public liability', estimatedAmount: 3000, currency: 'AUD', frequency: 'annual', required: true },
      { category: 'Compliance', item: 'WWCC per staff member', estimatedAmount: 100, currency: 'AUD', frequency: 'one_time', required: true },
    ],
    requiredPolicies: [
      'Child protection policy',
      'Health and safety policy',
      'Behavior management policy',
      'Emergency procedures',
      'Privacy policy',
      'Complaints handling',
      'Enrollment policy',
      'Fee policy',
    ],
    requiredDocuments: [
      'Curriculum plan',
      'Floor plan',
      'Insurance certificates',
      'Staff qualifications',
      'Staff WWCC clearances',
    ],
    warnings: [
      'Registration requirements vary by state - verify with your local authority',
      'Timeline can vary significantly based on application completeness',
    ],
  };

  res.json({ guidance });
});
