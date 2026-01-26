/**
 * Advanced Learning Routes
 *
 * Phase 3: Advanced Learning Features
 *
 * API endpoints for:
 * - Video Coaching (Edthena-style lesson review)
 * - Peer Review (AI-enhanced comparative feedback)
 * - Industry Experience (WBL, apprenticeships, externships)
 * - Professional Development Hub (on-demand PD courses)
 * - Project-Based Learning Framework (Gold Standard PBL)
 */

import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { log } from '../lib/logger';
import { isFailure } from '../services/base.service';

import { getVideoCoachingService } from '../services/video-coaching.service';
import { getPeerReviewService } from '../services/peer-review.service';
import { getIndustryExperienceService } from '../services/industry-experience.service';
import { getPDHubService } from '../services/pd-hub.service';
import { getPBLFrameworkService } from '../services/pbl-framework.service';

export const advancedLearningRouter: Router = Router();
advancedLearningRouter.use(authMiddleware);

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

// Video Coaching Schemas
const uploadRecordingSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  subjectArea: z.string().min(1),
  gradeLevel: z.string().min(1),
  lessonTopic: z.string().min(1),
  learningObjectives: z.array(z.string()).min(1),
  standardsAddressed: z.array(z.object({
    frameworkId: z.string(),
    standardCode: z.string(),
    standardTitle: z.string(),
    domain: z.string().optional()
  })).optional()
});

const shareRecordingSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  role: z.enum(['mentor', 'peer', 'supervisor', 'viewer']),
  canComment: z.boolean(),
  canRate: z.boolean()
});

const startReviewSchema = z.object({
  reviewerName: z.string().min(1),
  reviewerRole: z.enum(['mentor', 'peer', 'supervisor', 'self'])
});

const addCommentSchema = z.object({
  startTime: z.number().min(0),
  endTime: z.number().optional(),
  content: z.string().min(1),
  commentType: z.enum(['praise', 'suggestion', 'question', 'observation', 'standard_link', 'resource', 'reflection_prompt']),
  taggedStandards: z.array(z.object({
    frameworkId: z.string(),
    standardCode: z.string(),
    standardTitle: z.string(),
    domain: z.string().optional()
  })).optional(),
  sentiment: z.enum(['positive', 'constructive', 'neutral', 'question']),
  parentCommentId: z.string().optional()
});

const completeReviewSchema = z.object({
  summary: z.string().min(1),
  strengths: z.array(z.string()),
  areasForGrowth: z.array(z.string()),
  actionItems: z.array(z.object({
    id: z.string(),
    description: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
    targetDate: z.string().datetime().optional(),
    completed: z.boolean()
  })),
  overallRating: z.number().min(1).max(5).optional()
});

// Peer Review Schemas
const createSessionSchema = z.object({
  assignmentId: z.string().min(1),
  assignmentTitle: z.string().min(1),
  courseId: z.string().optional(),
  courseName: z.string().optional(),
  submissionDeadline: z.string().datetime(),
  reviewDeadline: z.string().datetime(),
  rubric: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    criteria: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      weight: z.number(),
      maxPoints: z.number(),
      levels: z.array(z.object({
        score: z.number(),
        label: z.string(),
        description: z.string()
      }))
    })),
    totalPoints: z.number(),
    reviewerPrompts: z.array(z.string())
  }),
  config: z.object({
    anonymousSubmissions: z.boolean().optional(),
    anonymousReviews: z.boolean().optional(),
    reviewsPerSubmission: z.number().optional(),
    submissionsPerReviewer: z.number().optional(),
    enableComparativeReview: z.boolean().optional(),
    enableAIGuidance: z.boolean().optional(),
    enableAIQualityCheck: z.boolean().optional(),
    enableCalibration: z.boolean().optional(),
    requireSelfReview: z.boolean().optional(),
    minimumFeedbackWords: z.number().optional()
  }).optional()
});

const submitWorkSchema = z.object({
  content: z.object({
    type: z.enum(['text', 'file', 'url', 'multimedia']),
    text: z.string().optional(),
    files: z.array(z.object({
      name: z.string(),
      url: z.string(),
      type: z.string(),
      size: z.number()
    })).optional(),
    url: z.string().optional(),
    mediaUrls: z.array(z.string()).optional()
  })
});

const submitReviewSchema = z.object({
  submissionId: z.string().min(1),
  criteriaScores: z.array(z.object({
    criterionId: z.string(),
    score: z.number(),
    comment: z.string().optional()
  })),
  overallFeedback: z.string().min(1),
  strengthsIdentified: z.array(z.string()),
  suggestionsForImprovement: z.array(z.string())
});

// Industry Experience Schemas
const registerPartnerSchema = z.object({
  name: z.string().min(1),
  description: z.string(),
  industry: z.string().min(1),
  sector: z.string(),
  size: z.enum(['startup', 'small', 'medium', 'large', 'enterprise']),
  primaryContact: z.object({
    name: z.string(),
    role: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    preferredContactMethod: z.enum(['email', 'phone', 'platform'])
  }),
  locations: z.array(z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string(),
    coordinates: z.object({ lat: z.number(), lng: z.number() }).optional(),
    isRemoteAvailable: z.boolean()
  })),
  offeredExperienceTypes: z.array(z.enum([
    'apprenticeship', 'traineeship', 'internship_paid', 'internship_unpaid',
    'work_placement', 'industry_project', 'job_shadow', 'mentorship',
    'site_visit', 'guest_lecture', 'teacher_externship'
  ])),
  skillsOffered: z.array(z.string())
});

const createOpportunitySchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  experienceType: z.enum([
    'apprenticeship', 'traineeship', 'internship_paid', 'internship_unpaid',
    'work_placement', 'industry_project', 'job_shadow', 'mentorship',
    'site_visit', 'guest_lecture', 'teacher_externship'
  ]),
  skillsRequired: z.array(z.string()),
  qualificationsRequired: z.array(z.string()),
  duration: z.object({ value: z.number(), unit: z.enum(['hours', 'days', 'weeks', 'months']) }),
  schedule: z.object({
    type: z.enum(['full_time', 'part_time', 'flexible', 'block']),
    hoursPerWeek: z.number().optional(),
    daysOfWeek: z.array(z.string()).optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional()
  }),
  location: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    country: z.string(),
    postalCode: z.string(),
    isRemoteAvailable: z.boolean()
  }),
  isRemote: z.boolean(),
  compensation: z.object({
    type: z.enum(['paid', 'unpaid', 'stipend', 'school_credit']),
    amount: z.number().optional(),
    currency: z.string().optional(),
    creditValue: z.number().optional()
  }),
  totalPositions: z.number().min(1),
  learningOutcomes: z.array(z.string()),
  applicationRequirements: z.array(z.string()).optional(),
  mentorId: z.string().optional(),
  mentorName: z.string().optional()
});

const submitApplicationSchema = z.object({
  applicantType: z.enum(['student', 'educator']),
  applicantName: z.string().min(1),
  applicantEmail: z.string().email(),
  coverLetter: z.string().optional(),
  resumeUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  responses: z.array(z.object({
    questionId: z.string(),
    response: z.string()
  }))
});

const logProgressSchema = z.object({
  hoursLogged: z.number().positive(),
  activitiesCompleted: z.array(z.string()),
  skillsDeveloped: z.array(z.string()),
  reflections: z.string().min(1)
});

// PD Hub Schemas
const createCourseSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  shortDescription: z.string(),
  thumbnailUrl: z.string().optional(),
  category: z.enum([
    'ai_literacy', 'data_literacy', 'pedagogical_strategies', 'assessment',
    'differentiation', 'classroom_management', 'technology_integration',
    'social_emotional_learning', 'curriculum_design', 'leadership',
    'compliance', 'wellbeing', 'subject_specific'
  ]),
  topics: z.array(z.string()),
  targetAudience: z.array(z.enum(['teacher', 'administrator', 'counselor', 'support_staff'])),
  experienceLevel: z.enum(['beginner', 'intermediate', 'advanced', 'all_levels']),
  format: z.enum(['self_paced', 'instructor_led', 'cohort_based', 'blended']),
  modules: z.array(z.any()).min(1),
  estimatedHours: z.number().positive(),
  prerequisites: z.array(z.string()).optional(),
  alignedStandards: z.array(z.any()).optional(),
  instructors: z.array(z.any()),
  pricing: z.object({
    type: z.enum(['free', 'paid', 'subscription']),
    amount: z.number().optional(),
    currency: z.string().optional()
  }),
  credentialOffered: z.boolean(),
  credentialType: z.string().optional()
});

const enrollSchema = z.object({
  educatorName: z.string().min(1)
});

const completeContentSchema = z.object({
  moduleId: z.string().min(1),
  contentId: z.string().min(1)
});

// PBL Schemas
const createProjectSchema = z.object({
  title: z.string().min(1),
  drivingQuestion: z.string().min(10),
  description: z.string(),
  challengingProblem: z.string(),
  sustainedInquiry: z.any(),
  authenticity: z.any(),
  studentVoiceAndChoice: z.any(),
  reflection: z.any(),
  critiqueAndRevision: z.any(),
  publicProduct: z.any(),
  alignedStandards: z.array(z.any()),
  subjectAreas: z.array(z.string()),
  gradeLevel: z.array(z.string()),
  estimatedDuration: z.object({ value: z.number(), unit: z.enum(['days', 'weeks', 'months']) }),
  teamSize: z.object({ min: z.number(), max: z.number() }),
  allowIndividual: z.boolean(),
  milestones: z.array(z.any()).min(3),
  resources: z.array(z.any()),
  assessmentPlan: z.any()
});

const startInstanceSchema = z.object({
  facilitatorName: z.string().min(1),
  participants: z.array(z.object({ id: z.string(), name: z.string() })).min(1),
  teamId: z.string().optional(),
  customDrivingQuestion: z.string().optional(),
  startDate: z.string().datetime().optional(),
  targetEndDate: z.string().datetime().optional()
});

const createPitchSchema = z.object({
  presentationType: z.enum(['live', 'recorded']),
  scheduledTime: z.string().datetime().optional(),
  duration: z.number().positive(),
  audienceType: z.enum(['class', 'panel', 'public', 'industry']),
  panelMembers: z.array(z.object({ name: z.string(), role: z.string() })).optional()
});

// ============================================================================
// VIDEO COACHING ROUTES
// ============================================================================

/**
 * POST /video-coaching/recordings
 * Upload a new video recording
 */
advancedLearningRouter.post('/video-coaching/recordings', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = uploadRecordingSchema.parse(req.body);
    const service = getVideoCoachingService();

    const result = await service.uploadRecording(
      tenantId,
      userId,
      req.user!.email, // educator name fallback
      Buffer.from(''), // In practice, file would come from multipart upload
      {
        filename: 'upload.mp4',
        contentType: 'video/mp4',
        ...data
      } as any
    );

    if (isFailure(result)) {
      return res.status(400).json({ success: false, error: result.error, requestId });
    }

    log.info('Video recording uploaded', { userId, recordingId: result.data.id });
    res.status(201).json({ success: true, data: { recording: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * GET /video-coaching/recordings
 * List recordings for the authenticated educator
 */
advancedLearningRouter.get('/video-coaching/recordings', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const service = getVideoCoachingService();
  const result = await service.getEducatorRecordings(tenantId, userId);

  if (isFailure(result)) {
    return res.status(400).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: { recordings: result.data } });
});

/**
 * GET /video-coaching/recordings/:id
 * Get a specific recording
 */
advancedLearningRouter.get('/video-coaching/recordings/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const service = getVideoCoachingService();
  const result = await service.getRecording(tenantId, userId, req.params.id);

  if (isFailure(result)) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : result.error.code === 'AUTHORIZATION_ERROR' ? 403 : 400;
    return res.status(status).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: { recording: result.data } });
});

/**
 * POST /video-coaching/recordings/:id/share
 * Share a recording with a mentor or peer
 */
advancedLearningRouter.post('/video-coaching/recordings/:id/share', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = shareRecordingSchema.parse(req.body);
    const service = getVideoCoachingService();

    const result = await service.shareRecording(tenantId, userId, req.params.id, data as any);

    if (isFailure(result)) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : result.error.code === 'AUTHORIZATION_ERROR' ? 403 : 400;
      return res.status(status).json({ success: false, error: result.error, requestId });
    }

    res.json({ success: true, data: { recording: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * POST /video-coaching/recordings/:id/review
 * Start a review cycle for a recording
 */
advancedLearningRouter.post('/video-coaching/recordings/:id/review', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = startReviewSchema.parse(req.body);
    const service = getVideoCoachingService();

    const result = await service.startReviewCycle(
      tenantId,
      req.params.id,
      userId,
      data.reviewerName,
      data.reviewerRole
    );

    if (isFailure(result)) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : result.error.code === 'AUTHORIZATION_ERROR' ? 403 : 400;
      return res.status(status).json({ success: false, error: result.error, requestId });
    }

    res.status(201).json({ success: true, data: { reviewCycle: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

// ============================================================================
// PEER REVIEW ROUTES
// ============================================================================

/**
 * POST /peer-review/sessions
 * Create a new peer review session
 */
advancedLearningRouter.post('/peer-review/sessions', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = createSessionSchema.parse(req.body);
    const service = getPeerReviewService();

    const result = await service.createSession(tenantId, userId, {
      ...data,
      submissionDeadline: new Date(data.submissionDeadline),
      reviewDeadline: new Date(data.reviewDeadline)
    } as any);

    if (isFailure(result)) {
      return res.status(400).json({ success: false, error: result.error, requestId });
    }

    log.info('Peer review session created', { userId, sessionId: result.data.id });
    res.status(201).json({ success: true, data: { session: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * GET /peer-review/sessions/:id
 * Get a peer review session
 */
advancedLearningRouter.get('/peer-review/sessions/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;

  const service = getPeerReviewService();
  const result = await service.getSession(tenantId, req.params.id);

  if (isFailure(result)) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: { session: result.data } });
});

/**
 * POST /peer-review/sessions/:id/submit
 * Submit work to a peer review session
 */
advancedLearningRouter.post('/peer-review/sessions/:id/submit', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = submitWorkSchema.parse(req.body);
    const service = getPeerReviewService();

    const result = await service.submitWork(
      tenantId,
      req.params.id,
      userId,
      req.user!.email,
      data.content as any
    );

    if (isFailure(result)) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: result.error, requestId });
    }

    res.status(201).json({ success: true, data: { submission: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * POST /peer-review/sessions/:id/reviews
 * Submit a peer review
 */
advancedLearningRouter.post('/peer-review/sessions/:id/reviews', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = submitReviewSchema.parse(req.body);
    const service = getPeerReviewService();

    const result = await service.submitReview(
      tenantId,
      req.params.id,
      userId,
      data.submissionId,
      {
        criteriaScores: data.criteriaScores as any,
        overallFeedback: data.overallFeedback,
        strengthsIdentified: data.strengthsIdentified,
        suggestionsForImprovement: data.suggestionsForImprovement
      }
    );

    if (isFailure(result)) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : result.error.code === 'AUTHORIZATION_ERROR' ? 403 : 400;
      return res.status(status).json({ success: false, error: result.error, requestId });
    }

    res.status(201).json({ success: true, data: { review: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * GET /peer-review/sessions/:id/feedback
 * Get aggregated feedback for a session
 */
advancedLearningRouter.get('/peer-review/sessions/:id/feedback', async (req, res) => {
  const tenantId = req.user!.tenantId;

  const service = getPeerReviewService();
  const result = await service.getSessionStatistics(tenantId, req.params.id);

  if (isFailure(result)) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: { statistics: result.data } });
});

// ============================================================================
// INDUSTRY EXPERIENCE ROUTES
// ============================================================================

/**
 * POST /industry-experience/partners
 * Register a new industry partner
 */
advancedLearningRouter.post('/industry-experience/partners', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = registerPartnerSchema.parse(req.body);
    const service = getIndustryExperienceService();

    const result = await service.registerPartner(tenantId, data as any);

    if (isFailure(result)) {
      return res.status(400).json({ success: false, error: result.error, requestId });
    }

    log.info('Industry partner registered', { tenantId, partnerId: result.data.id });
    res.status(201).json({ success: true, data: { partner: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * POST /industry-experience/opportunities
 * Create a new industry experience opportunity
 */
advancedLearningRouter.post('/industry-experience/opportunities', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { partnerId, ...opportunityData } = req.body;

  try {
    const data = createOpportunitySchema.parse(opportunityData);
    if (!partnerId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'partnerId is required' }, requestId });
    }

    const service = getIndustryExperienceService();
    const result = await service.createOpportunity(tenantId, partnerId, data as any);

    if (isFailure(result)) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: result.error, requestId });
    }

    res.status(201).json({ success: true, data: { opportunity: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * GET /industry-experience/opportunities
 * Search for opportunities
 */
advancedLearningRouter.get('/industry-experience/opportunities', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { experienceType, industry, location, isRemote, gradeLevel } = req.query;

  const service = getIndustryExperienceService();
  const result = await service.searchOpportunities(tenantId, {
    experienceType: experienceType as any,
    industry: industry as string,
    location: location as string,
    isRemote: isRemote === 'true',
    gradeLevel: gradeLevel as string
  });

  if (isFailure(result)) {
    return res.status(400).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: { opportunities: result.data } });
});

/**
 * POST /industry-experience/applications
 * Submit an application
 */
advancedLearningRouter.post('/industry-experience/applications', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { opportunityId, ...applicationData } = req.body;

  try {
    const data = submitApplicationSchema.parse(applicationData);
    if (!opportunityId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'opportunityId is required' }, requestId });
    }

    const service = getIndustryExperienceService();
    const result = await service.submitApplication(
      tenantId,
      opportunityId,
      {
        id: userId,
        type: data.applicantType,
        name: data.applicantName,
        email: data.applicantEmail
      },
      {
        coverLetter: data.coverLetter,
        resumeUrl: data.resumeUrl,
        portfolioUrl: data.portfolioUrl,
        responses: data.responses as any
      }
    );

    if (isFailure(result)) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: result.error, requestId });
    }

    res.status(201).json({ success: true, data: { application: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * POST /industry-experience/placements/:id/log
 * Log progress for a placement
 */
advancedLearningRouter.post('/industry-experience/placements/:id/log', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = logProgressSchema.parse(req.body);
    const service = getIndustryExperienceService();

    const result = await service.logProgress(tenantId, req.params.id, data as any);

    if (isFailure(result)) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: result.error, requestId });
    }

    res.json({ success: true, data: { placement: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

// ============================================================================
// PROFESSIONAL DEVELOPMENT HUB ROUTES
// ============================================================================

/**
 * POST /pd-hub/courses
 * Create a new PD course
 */
advancedLearningRouter.post('/pd-hub/courses', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = createCourseSchema.parse(req.body);
    const service = getPDHubService();

    const result = await service.createCourse(tenantId, data as any);

    if (isFailure(result)) {
      return res.status(400).json({ success: false, error: result.error, requestId });
    }

    log.info('PD course created', { tenantId, courseId: result.data.id });
    res.status(201).json({ success: true, data: { course: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * GET /pd-hub/courses
 * Search for PD courses
 */
advancedLearningRouter.get('/pd-hub/courses', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { category, topic, level } = req.query;

  const service = getPDHubService();
  const result = await service.searchCourses(tenantId, {
    category: category as any,
    topic: topic as string,
    level: level as string
  });

  if (isFailure(result)) {
    return res.status(400).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: { courses: result.data } });
});

/**
 * POST /pd-hub/courses/:id/enroll
 * Enroll in a PD course
 */
advancedLearningRouter.post('/pd-hub/courses/:id/enroll', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = enrollSchema.parse(req.body);
    const service = getPDHubService();

    const result = await service.enrollInCourse(tenantId, userId, data.educatorName, req.params.id);

    if (isFailure(result)) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: result.error, requestId });
    }

    res.status(201).json({ success: true, data: { enrollment: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * POST /pd-hub/courses/:id/complete
 * Complete a PD course
 */
advancedLearningRouter.post('/pd-hub/courses/:id/complete', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const { enrollmentId, educatorDid } = req.body;

  if (!enrollmentId) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'enrollmentId is required' }, requestId });
  }

  const service = getPDHubService();
  const result = await service.completeCourse(tenantId, enrollmentId, educatorDid);

  if (isFailure(result)) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
    return res.status(status).json({ success: false, error: result.error, requestId });
  }

  res.json({ success: true, data: result.data });
});

// ============================================================================
// PROJECT-BASED LEARNING ROUTES
// ============================================================================

/**
 * POST /pbl/projects
 * Create a new PBL project
 */
advancedLearningRouter.post('/pbl/projects', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = createProjectSchema.parse(req.body);
    const service = getPBLFrameworkService();

    const result = await service.createProject(tenantId, userId, data as any);

    if (isFailure(result)) {
      return res.status(400).json({ success: false, error: result.error, requestId });
    }

    log.info('PBL project created', { tenantId, projectId: result.data.id });
    res.status(201).json({ success: true, data: { project: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * GET /pbl/projects
 * Search for PBL projects
 */
advancedLearningRouter.get('/pbl/projects', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { subjectArea, gradeLevel, keywords } = req.query;

  const service = getPBLFrameworkService();
  const result = await service.searchProjects(tenantId, {
    subjectArea: subjectArea as string,
    gradeLevel: gradeLevel as string,
    keywords: keywords as string
  });

  if (isFailure(result)) {
    return res.status(400).json({ success: false, error: result.error });
  }

  res.json({ success: true, data: { projects: result.data } });
});

/**
 * POST /pbl/projects/:id/instances
 * Start a new project instance
 */
advancedLearningRouter.post('/pbl/projects/:id/instances', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = startInstanceSchema.parse(req.body);
    const service = getPBLFrameworkService();

    const result = await service.startProjectInstance(
      tenantId,
      req.params.id,
      userId,
      data.facilitatorName,
      data.participants as any,
      {
        teamId: data.teamId,
        customDrivingQuestion: data.customDrivingQuestion,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        targetEndDate: data.targetEndDate ? new Date(data.targetEndDate) : undefined
      }
    );

    if (isFailure(result)) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: result.error, requestId });
    }

    res.status(201).json({ success: true, data: { instance: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});

/**
 * POST /pbl/projects/:id/pitch
 * Create a pitch submission for a project instance
 */
advancedLearningRouter.post('/pbl/projects/:id/pitch', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const tenantId = req.user!.tenantId;

  try {
    const data = createPitchSchema.parse(req.body);
    const service = getPBLFrameworkService();

    const result = await service.createPitchSubmission(tenantId, req.params.id, {
      ...data,
      scheduledTime: data.scheduledTime ? new Date(data.scheduledTime) : undefined
    } as any);

    if (isFailure(result)) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      return res.status(status).json({ success: false, error: result.error, requestId });
    }

    res.status(201).json({ success: true, data: { pitch: result.data } });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: error.errors }, requestId });
    }
    throw error;
  }
});
