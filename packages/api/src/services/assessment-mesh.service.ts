/**
 * Assessment Service
 *
 * Manages the complete assessment lifecycle from definition through marking
 * and analytics. Implements the "dual-mode" assessment engine supporting
 * both formative and summative evaluation with AI-enhanced marking.
 *
 * ## The Granny Explanation
 *
 * Think of this as a smart exam paper that knows:
 * - Which questions each student got right and wrong
 * - How long they spent thinking about each question
 * - Whether they're guessing or really understanding
 * - What to teach them next based on their mistakes
 *
 * For teachers, it's like having a teaching assistant who:
 * - Marks all the multiple choice instantly
 * - Gives a first draft score on essays
 * - Spots the kids who are struggling before the test even ends
 * - Creates a class report showing exactly what needs re-teaching
 *
 * @module IntelligenceMesh/Assessment
 * @version 1.5.0
 */

import { log } from '../lib/logger';
import {
  ScholarlyBaseService, Result, success, failure,
  Validator, ScholarlyError, ValidationError, NotFoundError
} from './base.service';

import {
  AssessmentDefinition, AssessmentAttempt, AssessmentQuestion, QuestionResponse,
  AssessmentAnalytics, StudentAssessmentProfile, PeerReviewAssignment,
  RubricDefinition, AttemptStatus, AssessmentPurpose, AIPolicy, QuestionType,
  AccommodationType, IntegrityFlag, RubricScore, ParticipationStats,
  ScoreDistribution, QuestionAnalysisItem, AnalyticsConcern, AnalyticsRecommendation
} from './assessment-mesh-types';

import { ASSESSMENT_EVENTS, createMeshEvent } from './mesh-events';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface AssessmentRepository {
  findById(tenantId: string, id: string): Promise<AssessmentDefinition | null>;
  findBySchool(tenantId: string, schoolId: string, filters?: AssessmentSearchFilters): Promise<AssessmentDefinition[]>;
  findByClass(tenantId: string, classId: string): Promise<AssessmentDefinition[]>;
  findByCurriculumCode(tenantId: string, curriculumCode: string): Promise<AssessmentDefinition[]>;
  search(tenantId: string, query: AssessmentSearchQuery): Promise<AssessmentSearchResult>;
  save(tenantId: string, assessment: AssessmentDefinition): Promise<AssessmentDefinition>;
  update(tenantId: string, id: string, updates: Partial<AssessmentDefinition>): Promise<AssessmentDefinition>;
  delete(tenantId: string, id: string, deletedBy: string): Promise<void>;
}

export interface AssessmentSearchFilters {
  status?: ('draft' | 'published' | 'archived')[];
  purpose?: AssessmentPurpose[];
  format?: string[];
  subjects?: string[];
  yearLevels?: string[];
  teacherId?: string;
  fromDate?: Date;
  toDate?: Date;
}

export interface AssessmentSearchQuery extends AssessmentSearchFilters {
  searchText?: string;
  sortBy?: 'title' | 'createdAt' | 'publishedAt' | 'purpose';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface AssessmentSearchResult {
  assessments: AssessmentDefinition[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AttemptRepository {
  findById(tenantId: string, id: string): Promise<AssessmentAttempt | null>;
  findByAssessment(tenantId: string, assessmentId: string): Promise<AssessmentAttempt[]>;
  findByStudent(tenantId: string, studentId: string, filters?: AttemptFilters): Promise<AssessmentAttempt[]>;
  findByStudentAndAssessment(tenantId: string, studentId: string, assessmentId: string): Promise<AssessmentAttempt[]>;
  findByStatus(tenantId: string, status: AttemptStatus[]): Promise<AssessmentAttempt[]>;
  findRequiringMarking(tenantId: string): Promise<AssessmentAttempt[]>;
  save(tenantId: string, attempt: AssessmentAttempt): Promise<AssessmentAttempt>;
  update(tenantId: string, id: string, updates: Partial<AssessmentAttempt>): Promise<AssessmentAttempt>;
  saveResponse(tenantId: string, attemptId: string, response: QuestionResponse): Promise<void>;
  bulkSave(tenantId: string, attempts: AssessmentAttempt[]): Promise<AssessmentAttempt[]>;
}

export interface AttemptFilters {
  assessmentId?: string;
  status?: AttemptStatus[];
  fromDate?: Date;
  toDate?: Date;
  minScore?: number;
  maxScore?: number;
}

export interface RubricRepository {
  findById(tenantId: string, id: string): Promise<RubricDefinition | null>;
  findBySchool(tenantId: string, schoolId: string): Promise<RubricDefinition[]>;
  findShared(tenantId: string): Promise<RubricDefinition[]>;
  save(tenantId: string, rubric: RubricDefinition): Promise<RubricDefinition>;
  update(tenantId: string, id: string, updates: Partial<RubricDefinition>): Promise<RubricDefinition>;
  delete(tenantId: string, id: string, deletedBy: string): Promise<void>;
}

export interface PeerReviewRepository {
  findById(tenantId: string, id: string): Promise<PeerReviewAssignment | null>;
  findByAttempt(tenantId: string, attemptId: string): Promise<PeerReviewAssignment[]>;
  findByReviewer(tenantId: string, reviewerId: string, filters?: PeerReviewFilters): Promise<PeerReviewAssignment[]>;
  findByAssessment(tenantId: string, assessmentId: string): Promise<PeerReviewAssignment[]>;
  findPending(tenantId: string): Promise<PeerReviewAssignment[]>;
  save(tenantId: string, assignment: PeerReviewAssignment): Promise<PeerReviewAssignment>;
  update(tenantId: string, id: string, updates: Partial<PeerReviewAssignment>): Promise<PeerReviewAssignment>;
  bulkSave(tenantId: string, assignments: PeerReviewAssignment[]): Promise<PeerReviewAssignment[]>;
}

export interface PeerReviewFilters {
  status?: string[];
  assessmentId?: string;
  dueWithinDays?: number;
}

export interface AnalyticsRepository {
  saveAssessmentAnalytics(tenantId: string, analytics: AssessmentAnalytics): Promise<void>;
  getAssessmentAnalytics(tenantId: string, assessmentId: string, classId?: string): Promise<AssessmentAnalytics | null>;
  saveStudentProfile(tenantId: string, profile: StudentAssessmentProfile): Promise<void>;
  getStudentProfile(tenantId: string, studentId: string): Promise<StudentAssessmentProfile | null>;
  getClassProfiles(tenantId: string, classId: string): Promise<StudentAssessmentProfile[]>;
}

export interface StudentRepository {
  findById(tenantId: string, id: string): Promise<{ id: string; name: string; classGroup?: string } | null>;
  findByClassGroup(tenantId: string, classGroup: string): Promise<{ id: string; name: string }[]>;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface AIMarkingService {
  markObjectiveQuestion(
    question: AssessmentQuestion,
    response: any
  ): Promise<{ score: number; confidence: number; feedback?: string }>;

  markConstructedResponse(
    question: AssessmentQuestion,
    response: string,
    rubric?: RubricDefinition
  ): Promise<{
    score: number;
    confidence: number;
    feedback: string;
    rubricScores?: { criterionId: string; levelId: string; score: number; comment: string }[];
  }>;

  detectAIContent(text: string): Promise<{
    isLikelyAI: boolean;
    confidence: number;
    indicators: string[];
  }>;

  checkPlagiarism(text: string, studentId: string, tenantId: string): Promise<{
    similarityScore: number;
    matches: { source: string; similarity: number; excerpt: string }[];
  }>;

  generateHint(question: AssessmentQuestion, currentResponse: any): Promise<string>;

  evaluateFeedbackQuality(feedback: string): Promise<{
    specificity: number;
    constructiveness: number;
    completeness: number;
    overallQuality: number;
  }>;
}

export interface NotificationService {
  notifyStudent(tenantId: string, studentId: string, title: string, message: string, data?: any): Promise<void>;
  notifyTeacher(tenantId: string, teacherId: string, title: string, message: string, data?: any): Promise<void>;
  notifyParent(tenantId: string, parentId: string, title: string, message: string, data?: any): Promise<void>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AssessmentConfig {
  defaultAIPolicy: AIPolicy;
  aiMarkingConfidenceThreshold: number;
  autoSubmitGracePeriodMinutes: number;
  maxAttemptsDefault: number;
  defaultExtendedTimeMultiplier: number;
  plagiarismThreshold: number;
  aiDetectionThreshold: number;
  peerReviewCalibrationTolerance: number;
  analyticsMinSampleSize: number;
}

const DEFAULT_CONFIG: AssessmentConfig = {
  defaultAIPolicy: AIPolicy.PROHIBITED,
  aiMarkingConfidenceThreshold: 0.85,
  autoSubmitGracePeriodMinutes: 5,
  maxAttemptsDefault: 1,
  defaultExtendedTimeMultiplier: 1.5,
  plagiarismThreshold: 0.3,
  aiDetectionThreshold: 0.7,
  peerReviewCalibrationTolerance: 0.2,
  analyticsMinSampleSize: 5
};

// ============================================================================
// ASSESSMENT SERVICE
// ============================================================================

export class AssessmentMeshService extends ScholarlyBaseService {
  private assessmentConfig: AssessmentConfig;

  constructor(
    private assessmentRepo: AssessmentRepository,
    private attemptRepo: AttemptRepository,
    private rubricRepo: RubricRepository,
    private peerReviewRepo: PeerReviewRepository,
    private analyticsRepo: AnalyticsRepository,
    private studentRepo: StudentRepository,
    private aiMarking: AIMarkingService,
    private notifications: NotificationService,
    assessmentConfig: Partial<AssessmentConfig> = {}
  ) {
    super('AssessmentMeshService');
    this.assessmentConfig = { ...DEFAULT_CONFIG, ...assessmentConfig };
  }

  // ==========================================================================
  // ASSESSMENT DEFINITION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new assessment definition
   */
  async createAssessment(
    tenantId: string,
    data: {
      schoolId: string;
      title: string;
      description: string;
      purpose: AssessmentPurpose;
      format: string;
      yearLevels: string[];
      subjects: string[];
      curriculumCodes: string[];
      totalMarks: number;
      duration?: number;
      aiPolicy?: AIPolicy;
      createdBy: string;
    }
  ): Promise<Result<AssessmentDefinition>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.schoolId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'schoolId is required' });
    }
    if (!data.title) {
      return failure({ code: 'VALIDATION_ERROR', message: 'title is required' });
    }
    if (!data.purpose) {
      return failure({ code: 'VALIDATION_ERROR', message: 'purpose is required' });
    }
    if (!Validator.isPositiveNumber(data.totalMarks)) {
      return failure({ code: 'VALIDATION_ERROR', message: 'totalMarks must be a positive number' });
    }

    return this.withTiming('createAssessment', async () => {
      const now = new Date();

      const assessment: AssessmentDefinition = {
        id: this.generateId('asmt'),
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
        schoolId: data.schoolId,
        code: this.generateAssessmentCode(data.title),
        title: data.title,
        description: data.description,
        purpose: data.purpose,
        format: data.format as any,
        yearLevels: data.yearLevels,
        subjects: data.subjects,
        curriculumCodes: data.curriculumCodes,
        learningObjectives: [],
        totalMarks: data.totalMarks,
        duration: data.duration,
        aiPolicy: data.aiPolicy || this.assessmentConfig.defaultAIPolicy,
        integritySettings: this.getDefaultIntegritySettings(data.purpose),
        allowedAccommodations: Object.values(AccommodationType),
        moderationRequired: data.purpose === AssessmentPurpose.SUMMATIVE,
        status: 'draft',
        version: 1
      };

      const saved = await this.assessmentRepo.save(tenantId, assessment);

      await this.publishEvent(ASSESSMENT_EVENTS.ASSESSMENT_CREATED, tenantId, {
        assessmentId: saved.id,
        schoolId: data.schoolId,
        title: saved.title,
        purpose: saved.purpose,
        curriculumCodes: saved.curriculumCodes
      });

      return success(saved);
    });
  }

  /**
   * Get assessment by ID
   */
  async getAssessment(tenantId: string, assessmentId: string): Promise<Result<AssessmentDefinition>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!assessmentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'assessmentId is required' });
    }

    return this.withTiming('getAssessment', async () => {
      const assessment = await this.assessmentRepo.findById(tenantId, assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment', assessmentId);
      }

      return success(assessment);
    });
  }

  /**
   * Search assessments
   */
  async searchAssessments(
    tenantId: string,
    query: AssessmentSearchQuery
  ): Promise<Result<AssessmentSearchResult>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }

    return this.withTiming('searchAssessments', async () => {
      const result = await this.assessmentRepo.search(tenantId, query);
      return success(result);
    });
  }

  /**
   * Add a section to an assessment
   */
  async addSection(
    tenantId: string,
    assessmentId: string,
    data: {
      title: string;
      instructions?: string;
      timeLimit?: number;
      shuffleQuestions?: boolean;
      addedBy: string;
    }
  ): Promise<Result<AssessmentDefinition>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!assessmentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'assessmentId is required' });
    }
    if (!data.title) {
      return failure({ code: 'VALIDATION_ERROR', message: 'title is required' });
    }

    return this.withTiming('addSection', async () => {
      const assessment = await this.assessmentRepo.findById(tenantId, assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment', assessmentId);
      }

      if (assessment.status !== 'draft') {
        throw new ValidationError('Cannot modify published assessment');
      }

      const sections = assessment.sections || [];
      const newSection = {
        id: this.generateId('sect'),
        title: data.title,
        instructions: data.instructions,
        order: sections.length + 1,
        questions: [],
        marks: 0,
        timeLimit: data.timeLimit,
        shuffleQuestions: data.shuffleQuestions ?? true
      };

      sections.push(newSection);

      const updated = await this.assessmentRepo.update(tenantId, assessmentId, {
        sections,
        updatedBy: data.addedBy,
        updatedAt: new Date()
      });

      return success(updated);
    });
  }

  /**
   * Add a question to a section
   */
  async addQuestion(
    tenantId: string,
    assessmentId: string,
    sectionId: string,
    data: {
      type: QuestionType;
      stem: string;
      marks: number;
      options?: any[];
      correctAnswer?: any;
      aiMarkingEnabled?: boolean;
      curriculumCodes?: string[];
      difficulty?: 'easy' | 'medium' | 'hard';
      addedBy: string;
    }
  ): Promise<Result<AssessmentDefinition>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!assessmentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'assessmentId is required' });
    }
    if (!sectionId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'sectionId is required' });
    }
    if (!data.stem) {
      return failure({ code: 'VALIDATION_ERROR', message: 'stem is required' });
    }
    if (!Validator.isPositiveNumber(data.marks)) {
      return failure({ code: 'VALIDATION_ERROR', message: 'marks must be a positive number' });
    }

    return this.withTiming('addQuestion', async () => {
      const assessment = await this.assessmentRepo.findById(tenantId, assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment', assessmentId);
      }

      if (assessment.status !== 'draft') {
        throw new ValidationError('Cannot modify published assessment');
      }

      const section = assessment.sections?.find(s => s.id === sectionId);
      if (!section) {
        throw new NotFoundError('Section', sectionId);
      }

      const newQuestion: AssessmentQuestion = {
        id: this.generateId('q'),
        sectionId,
        order: section.questions.length + 1,
        type: data.type,
        stem: data.stem,
        marks: data.marks,
        partialCredit: !this.isObjectiveQuestion(data.type),
        options: data.options,
        correctAnswer: data.correctAnswer,
        aiMarkingEnabled: data.aiMarkingEnabled ?? !this.isObjectiveQuestion(data.type),
        curriculumCodes: data.curriculumCodes,
        difficulty: data.difficulty
      };

      section.questions.push(newQuestion);
      section.marks = section.questions.reduce((sum, q) => sum + q.marks, 0);

      const updated = await this.assessmentRepo.update(tenantId, assessmentId, {
        sections: assessment.sections,
        updatedBy: data.addedBy,
        updatedAt: new Date()
      });

      return success(updated);
    });
  }

  /**
   * Publish an assessment
   */
  async publishAssessment(
    tenantId: string,
    assessmentId: string,
    data: {
      availableFrom?: Date;
      availableTo?: Date;
      publishedBy: string;
    }
  ): Promise<Result<AssessmentDefinition>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!assessmentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'assessmentId is required' });
    }

    return this.withTiming('publishAssessment', async () => {
      const assessment = await this.assessmentRepo.findById(tenantId, assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment', assessmentId);
      }

      if (assessment.status !== 'draft') {
        throw new ValidationError('Only draft assessments can be published');
      }

      // Validate completeness
      if (!assessment.sections || assessment.sections.length === 0) {
        throw new ValidationError('Assessment must have at least one section');
      }

      const totalQuestionMarks = assessment.sections.reduce((sum, section) =>
        sum + section.questions.reduce((qSum, q) => qSum + q.marks, 0), 0);

      if (totalQuestionMarks !== assessment.totalMarks) {
        throw new ValidationError(
          `Question marks (${totalQuestionMarks}) don't match total marks (${assessment.totalMarks})`
        );
      }

      const now = new Date();
      const updated = await this.assessmentRepo.update(tenantId, assessmentId, {
        status: 'published',
        publishedAt: now,
        publishedBy: data.publishedBy,
        availableFrom: data.availableFrom,
        availableTo: data.availableTo,
        updatedBy: data.publishedBy,
        updatedAt: now
      });

      await this.publishEvent(ASSESSMENT_EVENTS.ASSESSMENT_PUBLISHED, tenantId, {
        assessmentId,
        title: assessment.title,
        purpose: assessment.purpose,
        availableFrom: data.availableFrom?.toISOString(),
        availableTo: data.availableTo?.toISOString()
      });

      return success(updated);
    });
  }

  // ==========================================================================
  // ATTEMPT MANAGEMENT
  // ==========================================================================

  /**
   * Start an assessment attempt
   */
  async startAttempt(
    tenantId: string,
    data: {
      assessmentId: string;
      studentId: string;
      accommodations?: AccommodationType[];
    }
  ): Promise<Result<AssessmentAttempt>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.assessmentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'assessmentId is required' });
    }
    if (!data.studentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentId is required' });
    }

    return this.withTiming('startAttempt', async () => {
      // Get assessment
      const assessment = await this.assessmentRepo.findById(tenantId, data.assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment', data.assessmentId);
      }

      if (assessment.status !== 'published') {
        throw new ValidationError('Assessment is not available');
      }

      // Check availability window
      const now = new Date();
      if (assessment.availableFrom && now < assessment.availableFrom) {
        throw new ValidationError('Assessment is not yet available');
      }
      if (assessment.availableTo && now > assessment.availableTo) {
        throw new ValidationError('Assessment submission window has closed');
      }

      // Get student
      const student = await this.studentRepo.findById(tenantId, data.studentId);
      if (!student) {
        throw new NotFoundError('Student', data.studentId);
      }

      // Check for existing attempts
      const existingAttempts = await this.attemptRepo.findByStudentAndAssessment(
        tenantId, data.studentId, data.assessmentId
      );

      // Resume if there's an active attempt
      const activeAttempt = existingAttempts.find(a =>
        a.status === AttemptStatus.IN_PROGRESS || a.status === AttemptStatus.PAUSED
      );

      if (activeAttempt) {
        const resumed = await this.attemptRepo.update(tenantId, activeAttempt.id, {
          status: AttemptStatus.IN_PROGRESS,
          lastActivityAt: now
        });
        return success(resumed);
      }

      // Calculate adjusted duration for accommodations
      let adjustedDuration = assessment.duration;
      const accommodations = data.accommodations || [];

      if (adjustedDuration && accommodations.includes(AccommodationType.EXTENDED_TIME)) {
        adjustedDuration = Math.ceil(adjustedDuration * this.assessmentConfig.defaultExtendedTimeMultiplier);
      }

      // Calculate total questions
      const totalQuestions = assessment.sections?.reduce((sum, s) => sum + s.questions.length, 0) || 0;

      // Create new attempt
      const attempt: AssessmentAttempt = {
        id: this.generateId('atpt'),
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.studentId,
        updatedBy: data.studentId,
        assessmentId: data.assessmentId,
        studentId: data.studentId,
        studentName: student.name,
        status: AttemptStatus.IN_PROGRESS,
        attemptNumber: existingAttempts.length + 1,
        startedAt: now,
        lastActivityAt: now,
        accommodations,
        adjustedDuration,
        responses: [],
        lateSubmission: false,
        questionsAnswered: 0,
        totalQuestions,
        sectionsComplete: []
      };

      const saved = await this.attemptRepo.save(tenantId, attempt);

      await this.publishEvent(ASSESSMENT_EVENTS.ATTEMPT_STARTED, tenantId, {
        attemptId: saved.id,
        assessmentId: data.assessmentId,
        studentId: data.studentId,
        attemptNumber: saved.attemptNumber
      });

      return success(saved);
    });
  }

  /**
   * Save a response to a question
   */
  async saveResponse(
    tenantId: string,
    data: {
      attemptId: string;
      questionId: string;
      response: any;
      studentId: string;
    }
  ): Promise<Result<QuestionResponse>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.attemptId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'attemptId is required' });
    }
    if (!data.questionId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'questionId is required' });
    }
    if (!data.studentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentId is required' });
    }

    return this.withTiming('saveResponse', async () => {
      const attempt = await this.attemptRepo.findById(tenantId, data.attemptId);
      if (!attempt) {
        throw new NotFoundError('Attempt', data.attemptId);
      }

      if (attempt.studentId !== data.studentId) {
        throw new ValidationError('Not authorized to modify this attempt');
      }

      if (attempt.status !== AttemptStatus.IN_PROGRESS) {
        throw new ValidationError('Attempt is not active');
      }

      // Get assessment to find question details
      const assessment = await this.assessmentRepo.findById(tenantId, attempt.assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment', attempt.assessmentId);
      }

      // Find the question
      let question: AssessmentQuestion | undefined;
      let sectionId = '';
      for (const section of assessment.sections || []) {
        const found = section.questions.find(q => q.id === data.questionId);
        if (found) {
          question = found;
          sectionId = section.id;
          break;
        }
      }

      if (!question) {
        throw new NotFoundError('Question', data.questionId);
      }

      const now = new Date();
      const existingResponse = attempt.responses.find(r => r.questionId === data.questionId);

      const questionResponse: QuestionResponse = {
        questionId: data.questionId,
        sectionId,
        response: data.response,
        responseText: typeof data.response === 'string' ? data.response : undefined,
        startedAt: existingResponse?.startedAt || now,
        answeredAt: now,
        timeSpent: existingResponse?.startedAt
          ? Math.floor((now.getTime() - existingResponse.startedAt.getTime()) / 1000)
          : 0,
        flaggedForReview: false,
        skipped: false,
        maxScore: question.marks
      };

      await this.attemptRepo.saveResponse(tenantId, data.attemptId, questionResponse);

      // Update attempt progress
      const existingIndex = attempt.responses.findIndex(r => r.questionId === data.questionId);
      if (existingIndex >= 0) {
        attempt.responses[existingIndex] = questionResponse;
      } else {
        attempt.responses.push(questionResponse);
      }

      await this.attemptRepo.update(tenantId, data.attemptId, {
        questionsAnswered: attempt.responses.filter(r => !r.skipped).length,
        lastActivityAt: now,
        responses: attempt.responses
      });

      return success(questionResponse);
    });
  }

  /**
   * Submit an attempt
   */
  async submitAttempt(
    tenantId: string,
    attemptId: string,
    studentId: string
  ): Promise<Result<AssessmentAttempt>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!attemptId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'attemptId is required' });
    }
    if (!studentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentId is required' });
    }

    return this.withTiming('submitAttempt', async () => {
      const attempt = await this.attemptRepo.findById(tenantId, attemptId);
      if (!attempt) {
        throw new NotFoundError('Attempt', attemptId);
      }

      if (attempt.studentId !== studentId) {
        throw new ValidationError('Not authorized to submit this attempt');
      }

      if (attempt.status !== AttemptStatus.IN_PROGRESS && attempt.status !== AttemptStatus.PAUSED) {
        throw new ValidationError('Attempt cannot be submitted');
      }

      const assessment = await this.assessmentRepo.findById(tenantId, attempt.assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment', attempt.assessmentId);
      }

      const now = new Date();
      let lateSubmission = false;
      let latePenalty = 0;

      // Check for late submission
      if (assessment.availableTo && now > assessment.availableTo) {
        lateSubmission = true;
        if (assessment.lateSubmissionPolicy?.allowed) {
          const daysLate = Math.ceil(
            (now.getTime() - assessment.availableTo.getTime()) / (1000 * 60 * 60 * 24)
          );
          if (assessment.lateSubmissionPolicy.maxLateDays &&
              daysLate > assessment.lateSubmissionPolicy.maxLateDays) {
            throw new ValidationError('Submission is beyond the late submission window');
          }
          latePenalty = Math.min(
            (assessment.lateSubmissionPolicy.penaltyPerDay || 0) * daysLate,
            100
          );
        }
      }

      const updated = await this.attemptRepo.update(tenantId, attemptId, {
        status: AttemptStatus.SUBMITTED,
        submittedAt: now,
        submissionMethod: 'manual',
        lateSubmission,
        latePenalty,
        updatedBy: studentId,
        updatedAt: now
      });

      await this.publishEvent(ASSESSMENT_EVENTS.ATTEMPT_SUBMITTED, tenantId, {
        attemptId,
        assessmentId: attempt.assessmentId,
        studentId,
        lateSubmission,
        latePenalty
      });

      // Trigger async AI marking
      this.triggerAIMarkingAsync(tenantId, attemptId, assessment);

      return success(updated);
    });
  }

  // ==========================================================================
  // MARKING
  // ==========================================================================

  private async triggerAIMarkingAsync(
    tenantId: string,
    attemptId: string,
    assessment: AssessmentDefinition
  ): Promise<void> {
    try {
      const attempt = await this.attemptRepo.findById(tenantId, attemptId);
      if (!attempt) return;

      let totalScore = 0;
      let aiMarkedCount = 0;
      let requiresTeacherReview = false;

      for (const response of attempt.responses) {
        // Find the question
        let question: AssessmentQuestion | undefined;
        for (const section of assessment.sections || []) {
          const found = section.questions.find(q => q.id === response.questionId);
          if (found) {
            question = found;
            break;
          }
        }

        if (!question) continue;

        // Auto-mark objective questions
        if (this.isObjectiveQuestion(question.type)) {
          const markingResult = await this.aiMarking.markObjectiveQuestion(question, response.response);
          response.aiScore = markingResult.score;
          response.aiConfidence = markingResult.confidence;
          response.aiFeedback = markingResult.feedback;
          response.score = markingResult.score;
          totalScore += markingResult.score;
          aiMarkedCount++;
        }
        // AI first-pass for constructed responses if enabled
        else if (question.aiMarkingEnabled && response.responseText) {
          const rubric = assessment.rubricId
            ? await this.rubricRepo.findById(tenantId, assessment.rubricId)
            : undefined;

          const markingResult = await this.aiMarking.markConstructedResponse(
            question,
            response.responseText,
            rubric || undefined
          );

          response.aiScore = markingResult.score;
          response.aiConfidence = markingResult.confidence;
          response.aiFeedback = markingResult.feedback;

          if (markingResult.rubricScores) {
            response.rubricScores = markingResult.rubricScores.map(rs => ({
              criterionId: rs.criterionId,
              levelId: rs.levelId,
              score: rs.score,
              comment: rs.comment
            }));
          }

          // Only auto-assign score if confidence is high enough
          if (markingResult.confidence >= this.assessmentConfig.aiMarkingConfidenceThreshold) {
            response.score = markingResult.score;
            totalScore += markingResult.score;
          } else {
            requiresTeacherReview = true;
          }

          aiMarkedCount++;
        } else {
          requiresTeacherReview = true;
        }

        // Check for integrity issues on constructed responses
        if (response.responseText && assessment.integritySettings.aiDetectionEnabled) {
          const aiDetection = await this.aiMarking.detectAIContent(response.responseText);
          if (aiDetection.isLikelyAI && aiDetection.confidence >= this.assessmentConfig.aiDetectionThreshold) {
            const flag: IntegrityFlag = {
              type: 'ai_detected',
              timestamp: new Date(),
              details: `AI content detected with ${Math.round(aiDetection.confidence * 100)}% confidence`,
              severity: 'warning'
            };
            attempt.integrityFlags = attempt.integrityFlags || [];
            attempt.integrityFlags.push(flag);
          }
        }
      }

      // Determine final status
      const allMarked = attempt.responses.every(r => r.score !== undefined);

      await this.attemptRepo.update(tenantId, attemptId, {
        status: allMarked && !requiresTeacherReview ? AttemptStatus.AI_MARKED : AttemptStatus.MARKING,
        responses: attempt.responses,
        score: allMarked ? totalScore : undefined,
        integrityFlags: attempt.integrityFlags
      });

      await this.publishEvent(ASSESSMENT_EVENTS.ATTEMPT_AI_MARKED, tenantId, {
        attemptId,
        aiMarkedCount,
        requiresTeacherReview,
        integrityFlagsCount: attempt.integrityFlags?.length || 0
      });
    } catch (error) {
      log.error('AI marking failed', error as Error, { attemptId });
    }
  }

  /**
   * Teacher marks an attempt
   */
  async markAttempt(
    tenantId: string,
    data: {
      attemptId: string;
      markerId: string;
      responses: {
        questionId: string;
        score: number;
        feedback?: string;
        rubricScores?: RubricScore[];
      }[];
      overallFeedback?: string;
    }
  ): Promise<Result<AssessmentAttempt>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.attemptId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'attemptId is required' });
    }
    if (!data.markerId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'markerId is required' });
    }
    if (!data.responses) {
      return failure({ code: 'VALIDATION_ERROR', message: 'responses is required' });
    }

    return this.withTiming('markAttempt', async () => {
      const attempt = await this.attemptRepo.findById(tenantId, data.attemptId);
      if (!attempt) {
        throw new NotFoundError('Attempt', data.attemptId);
      }

      if (attempt.status !== AttemptStatus.MARKING && attempt.status !== AttemptStatus.AI_MARKED) {
        throw new ValidationError('Attempt is not ready for marking');
      }

      let totalScore = 0;

      for (const mark of data.responses) {
        const response = attempt.responses.find(r => r.questionId === mark.questionId);
        if (response) {
          response.teacherScore = mark.score;
          response.teacherFeedback = mark.feedback;
          response.score = mark.score;
          response.aiMarkingOverridden = response.aiScore !== undefined && response.aiScore !== mark.score;

          if (mark.rubricScores) {
            response.rubricScores = mark.rubricScores;
          }

          totalScore += mark.score;
        }
      }

      const assessment = await this.assessmentRepo.findById(tenantId, attempt.assessmentId);
      const percentageScore = assessment ? (totalScore / assessment.totalMarks) * 100 : 0;
      const adjustedScore = attempt.latePenalty
        ? totalScore * (1 - attempt.latePenalty / 100)
        : totalScore;

      const masteryEstimate = Math.min(100, percentageScore * 1.1);

      const now = new Date();
      const updated = await this.attemptRepo.update(tenantId, data.attemptId, {
        status: AttemptStatus.TEACHER_REVIEWED,
        responses: attempt.responses,
        score: totalScore,
        percentageScore,
        adjustedScore,
        masteryEstimate,
        overallFeedback: data.overallFeedback,
        markedAt: now,
        markedBy: data.markerId,
        updatedBy: data.markerId,
        updatedAt: now
      });

      await this.publishEvent(ASSESSMENT_EVENTS.ATTEMPT_MARKED, tenantId, {
        attemptId: data.attemptId,
        studentId: attempt.studentId,
        score: totalScore,
        percentageScore,
        masteryEstimate,
        markerId: data.markerId
      });

      // Publish mastery update for LIS integration
      await this.publishEvent(ASSESSMENT_EVENTS.MASTERY_UPDATED, tenantId, {
        studentId: attempt.studentId,
        assessmentId: attempt.assessmentId,
        curriculumCodes: assessment?.curriculumCodes || [],
        masteryEstimate,
        source: 'assessment'
      });

      return success(updated);
    });
  }

  /**
   * Return attempt to student with feedback
   */
  async returnAttempt(
    tenantId: string,
    attemptId: string,
    data: {
      teacherId: string;
      teacherComments?: string;
    }
  ): Promise<Result<AssessmentAttempt>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!attemptId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'attemptId is required' });
    }
    if (!data.teacherId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'teacherId is required' });
    }

    return this.withTiming('returnAttempt', async () => {
      const attempt = await this.attemptRepo.findById(tenantId, attemptId);
      if (!attempt) {
        throw new NotFoundError('Attempt', attemptId);
      }

      if (attempt.status !== AttemptStatus.TEACHER_REVIEWED) {
        throw new ValidationError('Attempt must be reviewed before returning');
      }

      const now = new Date();
      const updated = await this.attemptRepo.update(tenantId, attemptId, {
        status: AttemptStatus.RETURNED,
        teacherComments: data.teacherComments,
        reviewedAt: now,
        reviewedBy: data.teacherId,
        updatedBy: data.teacherId,
        updatedAt: now
      });

      await this.publishEvent(ASSESSMENT_EVENTS.ATTEMPT_RETURNED, tenantId, {
        attemptId,
        studentId: attempt.studentId,
        percentageScore: attempt.percentageScore
      });

      // Notify student
      await this.notifications.notifyStudent(
        tenantId,
        attempt.studentId,
        'Assessment Results Available',
        `Your results are now available. Score: ${updated.percentageScore?.toFixed(1)}%`,
        { attemptId, assessmentId: attempt.assessmentId }
      );

      return success(updated);
    });
  }

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  /**
   * Generate analytics for an assessment
   */
  async generateAnalytics(
    tenantId: string,
    assessmentId: string,
    classId?: string
  ): Promise<Result<AssessmentAnalytics>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!assessmentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'assessmentId is required' });
    }

    return this.withTiming('generateAnalytics', async () => {
      const assessment = await this.assessmentRepo.findById(tenantId, assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment', assessmentId);
      }

      const attempts = await this.attemptRepo.findByAssessment(tenantId, assessmentId);
      const completedAttempts = attempts.filter(a =>
        a.status === AttemptStatus.RETURNED || a.status === AttemptStatus.TEACHER_REVIEWED
      );

      if (completedAttempts.length < this.assessmentConfig.analyticsMinSampleSize) {
        throw new ValidationError(
          `Need at least ${this.assessmentConfig.analyticsMinSampleSize} completed attempts for analytics`
        );
      }

      const scores = completedAttempts.map(a => a.percentageScore || 0);

      // Calculate statistics
      const participation = this.calculateParticipation(attempts);
      const scoreDistribution = this.calculateScoreDistribution(scores);
      const gradeDistribution = this.calculateGradeDistribution(scores);
      const questionAnalysis = this.analyzeQuestions(assessment, completedAttempts);
      const concerns = this.identifyConcerns(scores, attempts);
      const recommendations = this.generateRecommendations(scoreDistribution.mean, scoreDistribution.standardDeviation, questionAnalysis);

      const now = new Date();
      const analytics: AssessmentAnalytics = {
        id: this.generateId('anlyt'),
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
        assessmentId,
        classId,
        generatedAt: now,
        participation,
        scoreDistribution,
        gradeDistribution,
        questionAnalysis,
        curriculumInsights: assessment.curriculumCodes.map(code => ({
          curriculumCode: code,
          masteryRate: scoreDistribution.mean,
          commonMisconceptions: [],
          recommendedRemediation: scoreDistribution.mean < 60
            ? ['Review fundamental concepts', 'Additional practice exercises']
            : []
        })),
        concerns,
        recommendations
      };

      await this.analyticsRepo.saveAssessmentAnalytics(tenantId, analytics);

      await this.publishEvent(ASSESSMENT_EVENTS.ANALYTICS_GENERATED, tenantId, {
        assessmentId,
        mean: scoreDistribution.mean,
        participationRate: (participation.submitted / participation.totalStudents) * 100
      });

      return success(analytics);
    });
  }

  // ==========================================================================
  // PEER REVIEW
  // ==========================================================================

  /**
   * Assign peer reviews for an assessment
   */
  async assignPeerReviews(
    tenantId: string,
    assessmentId: string,
    assignedBy: string
  ): Promise<Result<PeerReviewAssignment[]>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!assessmentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'assessmentId is required' });
    }

    return this.withTiming('assignPeerReviews', async () => {
      const assessment = await this.assessmentRepo.findById(tenantId, assessmentId);
      if (!assessment || !assessment.peerReviewSettings?.enabled) {
        throw new ValidationError('Peer review not enabled for this assessment');
      }

      const attempts = await this.attemptRepo.findByAssessment(tenantId, assessmentId);
      const submittedAttempts = attempts.filter(a =>
        a.status === AttemptStatus.SUBMITTED || a.status === AttemptStatus.AI_MARKED
      );

      if (submittedAttempts.length < 2) {
        throw new ValidationError('Need at least 2 submissions for peer review');
      }

      const assignments: PeerReviewAssignment[] = [];
      const reviewsPerStudent = assessment.peerReviewSettings.reviewsRequired;
      const now = new Date();
      const dueDate = assessment.peerReviewSettings.dueDate ||
        new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      // Round-robin assignment
      for (let i = 0; i < submittedAttempts.length; i++) {
        const attempt = submittedAttempts[i];
        for (let r = 1; r <= reviewsPerStudent; r++) {
          const reviewerIndex = (i + r) % submittedAttempts.length;
          const reviewerAttempt = submittedAttempts[reviewerIndex];

          const assignment: PeerReviewAssignment = {
            id: this.generateId('pr'),
            tenantId,
            createdAt: now,
            updatedAt: now,
            createdBy: assignedBy,
            updatedBy: assignedBy,
            assessmentId,
            attemptId: attempt.id,
            reviewerId: reviewerAttempt.studentId,
            reviewerName: reviewerAttempt.studentName,
            authorId: assessment.peerReviewSettings.anonymous ? '' : attempt.studentId,
            status: 'assigned' as any,
            assignedAt: now,
            dueAt: dueDate,
            aiUsedForFeedback: false
          };

          assignments.push(assignment);
        }
      }

      const saved = await this.peerReviewRepo.bulkSave(tenantId, assignments);

      // Notify reviewers
      for (const assignment of saved) {
        await this.publishEvent(ASSESSMENT_EVENTS.PEER_REVIEW_ASSIGNED, tenantId, {
          assignmentId: assignment.id,
          reviewerId: assignment.reviewerId,
          assessmentId,
          dueAt: dueDate.toISOString()
        });

        await this.notifications.notifyStudent(
          tenantId,
          assignment.reviewerId,
          'Peer Review Assignment',
          'You have been assigned a peer review. Please complete it by the due date.',
          { assignmentId: assignment.id }
        );
      }

      return success(saved);
    });
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private generateAssessmentCode(title: string): string {
    const prefix = title.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
    const timestamp = Date.now().toString(36).slice(-4);
    return `${prefix}-${timestamp}`;
  }

  private getDefaultIntegritySettings(purpose: AssessmentPurpose): AssessmentDefinition['integritySettings'] {
    const isSummative = purpose === AssessmentPurpose.SUMMATIVE || purpose === AssessmentPurpose.BENCHMARK;
    return {
      plagiarismCheckEnabled: isSummative,
      aiDetectionEnabled: isSummative,
      processReplayEnabled: isSummative,
      lockdownBrowserRequired: false,
      webcamProctoring: false,
      shuffleQuestions: true,
      shuffleAnswers: true,
      oneQuestionAtATime: false,
      preventBackNavigation: false
    };
  }

  private isObjectiveQuestion(type: QuestionType): boolean {
    return [
      QuestionType.MULTIPLE_CHOICE,
      QuestionType.MULTIPLE_SELECT,
      QuestionType.TRUE_FALSE,
      QuestionType.MATCHING,
      QuestionType.ORDERING,
      QuestionType.NUMERIC
    ].includes(type);
  }

  private calculateParticipation(attempts: AssessmentAttempt[]): ParticipationStats {
    return {
      totalStudents: attempts.length,
      started: attempts.filter(a => a.status !== AttemptStatus.NOT_STARTED).length,
      submitted: attempts.filter(a => [
        AttemptStatus.SUBMITTED,
        AttemptStatus.AI_MARKED,
        AttemptStatus.TEACHER_REVIEWED,
        AttemptStatus.RETURNED
      ].includes(a.status)).length,
      notStarted: attempts.filter(a => a.status === AttemptStatus.NOT_STARTED).length,
      inProgress: attempts.filter(a => a.status === AttemptStatus.IN_PROGRESS).length
    };
  }

  private calculateScoreDistribution(scores: number[]): ScoreDistribution {
    const sorted = [...scores].sort((a, b) => a - b);
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    return {
      mean,
      median,
      standardDeviation,
      min: Math.min(...scores),
      max: Math.max(...scores),
      quartiles: {
        q1: sorted[Math.floor(sorted.length * 0.25)] || 0,
        q2: median,
        q3: sorted[Math.floor(sorted.length * 0.75)] || 0
      },
      histogram: this.generateHistogram(scores)
    };
  }

  private generateHistogram(scores: number[]): { range: string; count: number }[] {
    const ranges = ['0-10', '11-20', '21-30', '31-40', '41-50', '51-60', '61-70', '71-80', '81-90', '91-100'];
    return ranges.map((range, i) => {
      const min = i * 10;
      const max = (i + 1) * 10;
      const count = scores.filter(s => s >= min && s < max).length;
      return { range, count };
    });
  }

  private calculateGradeDistribution(scores: number[]): { grade: string; count: number; percentage: number }[] {
    const grades = [
      { grade: 'A', min: 90 },
      { grade: 'B', min: 80 },
      { grade: 'C', min: 70 },
      { grade: 'D', min: 60 },
      { grade: 'F', min: 0 }
    ];

    return grades.map((g, i) => {
      const max = i === 0 ? 101 : grades[i - 1].min;
      const count = scores.filter(s => s >= g.min && s < max).length;
      return {
        grade: g.grade,
        count,
        percentage: scores.length > 0 ? (count / scores.length) * 100 : 0
      };
    });
  }

  private analyzeQuestions(
    assessment: AssessmentDefinition,
    attempts: AssessmentAttempt[]
  ): QuestionAnalysisItem[] {
    const analysis: QuestionAnalysisItem[] = [];

    for (const section of assessment.sections || []) {
      for (const question of section.questions) {
        const responses = attempts.flatMap(a =>
          a.responses.filter(r => r.questionId === question.id)
        );

        if (responses.length === 0) continue;

        const correctCount = responses.filter(r => r.score === r.maxScore).length;
        const partialCount = responses.filter(r =>
          r.score !== undefined && r.score > 0 && r.score < r.maxScore
        ).length;
        const avgScore = responses.reduce((sum, r) => sum + (r.score || 0), 0) / responses.length;
        const avgTime = responses.reduce((sum, r) => sum + (r.timeSpent || 0), 0) / responses.length;

        analysis.push({
          questionId: question.id,
          questionText: question.stem.substring(0, 100),
          correctRate: (correctCount / responses.length) * 100,
          partialRate: (partialCount / responses.length) * 100,
          averageScore: avgScore,
          discriminationIndex: this.calculateDiscrimination(attempts, question.id),
          averageTime: avgTime
        });
      }
    }

    return analysis;
  }

  private calculateDiscrimination(attempts: AssessmentAttempt[], questionId: string): number {
    const sortedByTotal = [...attempts].sort((a, b) =>
      (b.percentageScore || 0) - (a.percentageScore || 0)
    );

    const groupSize = Math.ceil(sortedByTotal.length * 0.27);
    const topGroup = sortedByTotal.slice(0, groupSize);
    const bottomGroup = sortedByTotal.slice(-groupSize);

    const topCorrect = topGroup.filter(a => {
      const r = a.responses.find(r => r.questionId === questionId);
      return r && r.score === r.maxScore;
    }).length / (topGroup.length || 1);

    const bottomCorrect = bottomGroup.filter(a => {
      const r = a.responses.find(r => r.questionId === questionId);
      return r && r.score === r.maxScore;
    }).length / (bottomGroup.length || 1);

    return topCorrect - bottomCorrect;
  }

  private identifyConcerns(scores: number[], attempts: AssessmentAttempt[]): AnalyticsConcern[] {
    const concerns: AnalyticsConcern[] = [];
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const submissionRate = attempts.filter(a => a.status !== AttemptStatus.NOT_STARTED).length / attempts.length;

    if (mean < 60) {
      concerns.push({
        type: 'low_scores',
        description: `Class average (${mean.toFixed(1)}%) is below passing threshold`,
        severity: mean < 50 ? 'critical' : 'warning'
      });
    }

    if (submissionRate < 0.8) {
      concerns.push({
        type: 'low_participation',
        description: `Only ${(submissionRate * 100).toFixed(0)}% of students have submitted`,
        severity: submissionRate < 0.5 ? 'critical' : 'warning'
      });
    }

    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length;
    if (Math.sqrt(variance) > 25) {
      concerns.push({
        type: 'high_variance',
        description: 'High score variance indicates inconsistent understanding',
        severity: 'warning'
      });
    }

    const integrityFlags = attempts.filter(a => a.integrityFlags && a.integrityFlags.length > 0).length;
    if (integrityFlags > 0) {
      concerns.push({
        type: 'integrity_issues',
        description: `${integrityFlags} attempt(s) flagged for potential integrity issues`,
        severity: 'warning',
        affectedStudents: integrityFlags
      });
    }

    return concerns;
  }

  private generateRecommendations(
    mean: number,
    stdDev: number,
    questionAnalysis: QuestionAnalysisItem[]
  ): AnalyticsRecommendation[] {
    const recommendations: AnalyticsRecommendation[] = [];

    if (mean < 70) {
      recommendations.push({
        target: 'class',
        recommendation: 'Consider revisiting core concepts before moving forward',
        priority: mean < 50 ? 'high' : 'medium'
      });
    }

    const hardQuestions = questionAnalysis.filter(q => q.correctRate < 30);
    if (hardQuestions.length > 0) {
      recommendations.push({
        target: 'assessment',
        recommendation: `Review ${hardQuestions.length} questions with <30% correct rate for clarity or difficulty`,
        priority: 'medium'
      });
    }

    const poorDiscrimination = questionAnalysis.filter(q => q.discriminationIndex < 0.2);
    if (poorDiscrimination.length > 0) {
      recommendations.push({
        target: 'assessment',
        recommendation: `${poorDiscrimination.length} questions have low discrimination - consider revising`,
        priority: 'low'
      });
    }

    if (stdDev > 20) {
      recommendations.push({
        target: 'individuals',
        recommendation: 'Wide score range suggests need for differentiated support',
        priority: 'high'
      });
    }

    return recommendations;
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let assessmentMeshServiceInstance: AssessmentMeshService | null = null;

export function initializeAssessmentMeshService(deps: {
  assessmentRepo: AssessmentRepository;
  attemptRepo: AttemptRepository;
  rubricRepo: RubricRepository;
  peerReviewRepo: PeerReviewRepository;
  analyticsRepo: AnalyticsRepository;
  studentRepo: StudentRepository;
  aiMarking: AIMarkingService;
  notifications: NotificationService;
  config?: Partial<AssessmentConfig>;
}): AssessmentMeshService {
  assessmentMeshServiceInstance = new AssessmentMeshService(
    deps.assessmentRepo,
    deps.attemptRepo,
    deps.rubricRepo,
    deps.peerReviewRepo,
    deps.analyticsRepo,
    deps.studentRepo,
    deps.aiMarking,
    deps.notifications,
    deps.config
  );
  return assessmentMeshServiceInstance;
}

export function getAssessmentMeshService(): AssessmentMeshService {
  if (!assessmentMeshServiceInstance) {
    throw new Error('AssessmentMeshService has not been initialized. Call initializeAssessmentMeshService first.');
  }
  return assessmentMeshServiceInstance;
}
