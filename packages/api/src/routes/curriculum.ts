/**
 * Curriculum Routes
 */

import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { ApiError } from '../middleware/error-handler';

export const curriculumRouter: Router = Router();

// Search curriculum standards
curriculumRouter.get('/standards', async (req, res) => {
  const { tenantId } = req;
  const {
    framework,
    learningArea,
    subject,
    yearLevel,
    search,
    page = '1',
    pageSize = '50',
  } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const where: Record<string, unknown> = { tenantId };

  if (framework) where.framework = framework;
  if (learningArea) where.learningArea = learningArea;
  if (subject) where.subject = subject;
  if (yearLevel) where.yearLevels = { has: yearLevel as string };

  if (search) {
    where.OR = [
      { code: { contains: search as string, mode: 'insensitive' } },
      { title: { contains: search as string, mode: 'insensitive' } },
      { description: { contains: search as string, mode: 'insensitive' } },
      { keywords: { has: (search as string).toLowerCase() } },
    ];
  }

  const [standards, total] = await Promise.all([
    prisma.curriculumStandard.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        framework: true,
        code: true,
        type: true,
        learningArea: true,
        subject: true,
        strand: true,
        substrand: true,
        yearLevels: true,
        title: true,
        description: true,
        generalCapabilities: true,
        crossCurriculumPriorities: true,
      },
      orderBy: [{ learningArea: 'asc' }, { subject: 'asc' }, { code: 'asc' }],
    }),
    prisma.curriculumStandard.count({ where }),
  ]);

  res.json({
    standards,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});

// Get standard by ID or code
curriculumRouter.get('/standards/:idOrCode', async (req, res) => {
  const { idOrCode } = req.params;
  const { tenantId } = req;

  const standard = await prisma.curriculumStandard.findFirst({
    where: {
      tenantId,
      OR: [{ id: idOrCode }, { code: idOrCode }],
    },
    include: {
      alignments: {
        include: {
          content: {
            select: {
              id: true,
              title: true,
              type: true,
              thumbnailUrl: true,
              averageRating: true,
              downloadCount: true,
            },
          },
        },
        take: 10,
        orderBy: { alignmentScore: 'desc' },
      },
    },
  });

  if (!standard) {
    throw ApiError.notFound('Curriculum standard', idOrCode);
  }

  // Get related standards
  const relatedStandards = standard.relatedStandards.length > 0
    ? await prisma.curriculumStandard.findMany({
        where: {
          tenantId,
          code: { in: standard.relatedStandards },
        },
        select: {
          id: true,
          code: true,
          title: true,
          subject: true,
          yearLevels: true,
        },
      })
    : [];

  res.json({
    standard,
    relatedStandards,
  });
});

// Get curriculum structure (learning areas, subjects, strands)
curriculumRouter.get('/structure', async (req, res) => {
  const { tenantId } = req;
  const { framework = 'ACARA' } = req.query;

  const standards = await prisma.curriculumStandard.findMany({
    where: { tenantId, framework: framework as string },
    select: {
      learningArea: true,
      subject: true,
      strand: true,
      substrand: true,
      yearLevels: true,
    },
    distinct: ['learningArea', 'subject', 'strand', 'substrand'],
  });

  // Build hierarchical structure
  const structure: Record<string, Record<string, Record<string, string[]>>> = {};

  for (const std of standards) {
    if (!structure[std.learningArea]) {
      structure[std.learningArea] = {};
    }
    if (!structure[std.learningArea][std.subject]) {
      structure[std.learningArea][std.subject] = {};
    }
    if (std.strand) {
      if (!structure[std.learningArea][std.subject][std.strand]) {
        structure[std.learningArea][std.subject][std.strand] = [];
      }
      if (std.substrand && !structure[std.learningArea][std.subject][std.strand].includes(std.substrand)) {
        structure[std.learningArea][std.subject][std.strand].push(std.substrand);
      }
    }
  }

  // Get all year levels
  const yearLevels = [...new Set(standards.flatMap(s => s.yearLevels))].sort((a, b) => {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  res.json({
    framework,
    structure,
    yearLevels,
    learningAreas: Object.keys(structure),
  });
});

// Get lesson plans
curriculumRouter.get('/lesson-plans', async (req, res) => {
  const { tenantId } = req;
  const { subject, yearLevel, status = 'published', page = '1', pageSize = '20' } = req.query;

  const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
  const take = parseInt(pageSize as string);

  const where: Record<string, unknown> = { tenantId };

  if (subject) where.subject = subject;
  if (yearLevel) where.yearLevel = yearLevel;
  if (status) where.status = status;

  const [lessonPlans, total] = await Promise.all([
    prisma.lessonPlan.findMany({
      where,
      skip,
      take,
      include: {
        standards: {
          include: {
            standard: {
              select: { code: true, title: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.lessonPlan.count({ where }),
  ]);

  res.json({
    lessonPlans,
    pagination: {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      total,
      totalPages: Math.ceil(total / parseInt(pageSize as string)),
    },
  });
});

// Generate lesson plan
const generateLessonSchema = z.object({
  subject: z.string(),
  yearLevel: z.string(),
  curriculumCodes: z.array(z.string()).min(1),
  duration: z.number().min(30).max(180),
  topic: z.string().optional(),
  additionalInstructions: z.string().optional(),
});

curriculumRouter.post('/lesson-plans/generate', async (req, res) => {
  const { tenantId, user } = req;
  const data = generateLessonSchema.parse(req.body);

  // Get the curriculum standards
  const standards = await prisma.curriculumStandard.findMany({
    where: {
      tenantId,
      code: { in: data.curriculumCodes },
    },
  });

  if (standards.length === 0) {
    throw ApiError.badRequest('No valid curriculum codes found');
  }

  // In production, this would call an AI service to generate the lesson plan
  // For now, create a template lesson plan
  const lessonPlan = await prisma.lessonPlan.create({
    data: {
      tenantId,
      title: `${data.subject} Lesson: ${data.topic || standards[0].title}`,
      description: `A ${data.duration}-minute lesson on ${standards.map(s => s.title).join(', ')}`,
      yearLevel: data.yearLevel,
      subject: data.subject,
      duration: data.duration,
      learningIntentions: standards.map(s => `Students will ${s.title.toLowerCase()}`),
      successCriteria: standards.map(s => `I can ${s.title.toLowerCase()}`),
      generalCapabilities: [...new Set(standards.flatMap(s => s.generalCapabilities))],
      crossCurriculumPriorities: [...new Set(standards.flatMap(s => s.crossCurriculumPriorities))],
      sections: [
        {
          type: 'introduction',
          title: 'Hook & Introduction',
          duration: Math.round(data.duration * 0.1),
          description: 'Engage students and introduce the topic',
          teacherActions: ['Present hook activity', 'Introduce learning intentions'],
          studentActions: ['Participate in hook activity', 'Review success criteria'],
          resources: [],
        },
        {
          type: 'direct_instruction',
          title: 'Direct Instruction',
          duration: Math.round(data.duration * 0.25),
          description: 'Explicit teaching of key concepts',
          teacherActions: ['Model key concepts', 'Think aloud'],
          studentActions: ['Listen actively', 'Take notes'],
          resources: [],
        },
        {
          type: 'guided_practice',
          title: 'Guided Practice',
          duration: Math.round(data.duration * 0.25),
          description: 'Supported practice with teacher guidance',
          teacherActions: ['Guide student practice', 'Provide feedback'],
          studentActions: ['Practice with support', 'Ask questions'],
          resources: [],
        },
        {
          type: 'independent_practice',
          title: 'Independent Practice',
          duration: Math.round(data.duration * 0.3),
          description: 'Students apply learning independently',
          teacherActions: ['Monitor and support', 'Assess understanding'],
          studentActions: ['Complete independent task', 'Self-assess'],
          resources: [],
        },
        {
          type: 'closure',
          title: 'Reflection & Closure',
          duration: Math.round(data.duration * 0.1),
          description: 'Review learning and summarize',
          teacherActions: ['Facilitate reflection', 'Preview next lesson'],
          studentActions: ['Reflect on learning', 'Complete exit ticket'],
          resources: [],
        },
      ],
      differentiation: {
        enabling: ['Simplified task', 'Additional scaffolding', 'Peer support'],
        extending: ['Extension task', 'Open-ended challenge', 'Leadership role'],
        eslSupport: ['Visual aids', 'Word wall', 'Sentence starters'],
        accessibilityConsiderations: ['Multiple means of representation'],
      },
      resources: [],
      assessmentOpportunities: [
        {
          type: 'formative',
          method: 'observation',
          description: 'Observe student engagement and understanding during guided practice',
          curriculumCodes: data.curriculumCodes,
        },
        {
          type: 'formative',
          method: 'exit_ticket',
          description: 'Exit ticket to assess understanding of key concepts',
          curriculumCodes: data.curriculumCodes,
        },
      ],
      crossCurricularConnections: [],
      generatedBy: 'ai',
      generationPrompt: JSON.stringify(data),
      qualityScore: 75,
      status: 'draft',
      createdBy: user!.id,
      standards: {
        create: standards.map(s => ({
          standardId: s.id,
        })),
      },
    },
    include: {
      standards: {
        include: {
          standard: {
            select: { code: true, title: true },
          },
        },
      },
    },
  });

  res.status(201).json({ lessonPlan });
});

// Align content to curriculum
curriculumRouter.post('/align', async (req, res) => {
  const { tenantId } = req;
  const { contentId, curriculumCodes } = req.body;

  const content = await prisma.content.findFirst({
    where: { id: contentId, tenantId },
  });

  if (!content) {
    throw ApiError.notFound('Content', contentId);
  }

  const standards = await prisma.curriculumStandard.findMany({
    where: {
      tenantId,
      code: { in: curriculumCodes },
    },
  });

  // Create alignments
  const alignments = await Promise.all(
    standards.map(standard =>
      prisma.contentAlignment.upsert({
        where: {
          contentId_standardId: {
            contentId,
            standardId: standard.id,
          },
        },
        update: {
          alignmentScore: 0.8,
          alignmentMethod: 'manual',
          confidence: 1.0,
        },
        create: {
          contentId,
          standardId: standard.id,
          alignmentScore: 0.8,
          alignmentMethod: 'manual',
          conceptsMatched: standard.concepts,
          skillsMatched: standard.skills,
          confidence: 1.0,
        },
      })
    )
  );

  // Update content curriculum codes
  await prisma.content.update({
    where: { id: contentId },
    data: {
      curriculumCodes: [...new Set([...content.curriculumCodes, ...curriculumCodes])],
    },
  });

  res.json({ alignments });
});
