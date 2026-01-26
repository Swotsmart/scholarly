/**
 * Peer Review Service
 * 
 * Phase 3: Advanced Learning Features
 * 
 * ## The Granny Explanation
 * 
 * Remember in school when you'd swap papers with a classmate to check each
 * other's work? Peer review is like that, but much more powerful!
 * 
 * Students give each other detailed feedback using a rubric. We use "comparative
 * reviewing" where you look at TWO submissions side-by-side to notice subtle
 * differences. AI helps by suggesting feedback and checking quality.
 * 
 * @module PeerReviewService
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  EventBus,
  Cache,
  ScholarlyConfig,
  Validator
} from './types';

import {
  PeerReviewSession,
  PeerReviewConfig,
  ReviewRubric,
  RubricCriterion,
  PeerSubmission,
  SubmissionContent,
  ReviewAssignment,
  PeerReview,
  AggregatedFeedback,
  PeerReviewStats
} from './phase3-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface PeerReviewSessionRepository {
  findById(tenantId: string, id: string): Promise<PeerReviewSession | null>;
  findByAssignment(tenantId: string, assignmentId: string): Promise<PeerReviewSession | null>;
  save(tenantId: string, session: PeerReviewSession): Promise<PeerReviewSession>;
  update(tenantId: string, id: string, updates: Partial<PeerReviewSession>): Promise<PeerReviewSession>;
}

export interface PeerSubmissionRepository {
  findById(tenantId: string, id: string): Promise<PeerSubmission | null>;
  findBySession(tenantId: string, sessionId: string): Promise<PeerSubmission[]>;
  findByAuthor(tenantId: string, sessionId: string, authorId: string): Promise<PeerSubmission | null>;
  save(tenantId: string, submission: PeerSubmission): Promise<PeerSubmission>;
  update(tenantId: string, id: string, updates: Partial<PeerSubmission>): Promise<PeerSubmission>;
}

export interface ReviewAssignmentRepository {
  findById(tenantId: string, id: string): Promise<ReviewAssignment | null>;
  findBySession(tenantId: string, sessionId: string): Promise<ReviewAssignment[]>;
  findByReviewer(tenantId: string, sessionId: string, reviewerId: string): Promise<ReviewAssignment | null>;
  save(tenantId: string, assignment: ReviewAssignment): Promise<ReviewAssignment>;
  update(tenantId: string, id: string, updates: Partial<ReviewAssignment>): Promise<ReviewAssignment>;
}

export interface PeerReviewRepository {
  findById(tenantId: string, id: string): Promise<PeerReview | null>;
  findBySubmission(tenantId: string, submissionId: string): Promise<PeerReview[]>;
  save(tenantId: string, review: PeerReview): Promise<PeerReview>;
  update(tenantId: string, id: string, updates: Partial<PeerReview>): Promise<PeerReview>;
}

export interface PeerReviewAIProvider {
  generateFeedbackSuggestions(rubric: ReviewRubric, content: string, criterion: RubricCriterion): Promise<string[]>;
  assessFeedbackQuality(feedback: string): Promise<{ score: number; issues: string[]; suggestions: string[] }>;
  synthesizeFeedback(reviews: PeerReview[], rubric: ReviewRubric): Promise<AggregatedFeedback>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface PeerReviewServiceConfig {
  defaultReviewsPerSubmission: number;
  defaultSubmissionsPerReviewer: number;
  minimumFeedbackWords: number;
  enableAIByDefault: boolean;
  calibrationThreshold: number;
  anonymousDefault: boolean;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class PeerReviewService extends ScholarlyBaseService {
  private readonly sessionRepo: PeerReviewSessionRepository;
  private readonly submissionRepo: PeerSubmissionRepository;
  private readonly assignmentRepo: ReviewAssignmentRepository;
  private readonly reviewRepo: PeerReviewRepository;
  private readonly ai: PeerReviewAIProvider;
  private readonly serviceConfig: PeerReviewServiceConfig;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    sessionRepo: PeerReviewSessionRepository;
    submissionRepo: PeerSubmissionRepository;
    assignmentRepo: ReviewAssignmentRepository;
    reviewRepo: PeerReviewRepository;
    ai: PeerReviewAIProvider;
    serviceConfig: PeerReviewServiceConfig;
  }) {
    super('PeerReviewService', deps);
    this.sessionRepo = deps.sessionRepo;
    this.submissionRepo = deps.submissionRepo;
    this.assignmentRepo = deps.assignmentRepo;
    this.reviewRepo = deps.reviewRepo;
    this.ai = deps.ai;
    this.serviceConfig = deps.serviceConfig;
  }

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  async createSession(
    tenantId: string,
    createdBy: string,
    params: {
      assignmentId: string;
      assignmentTitle: string;
      courseId?: string;
      courseName?: string;
      submissionDeadline: Date;
      reviewDeadline: Date;
      rubric: ReviewRubric;
      config?: Partial<PeerReviewConfig>;
    }
  ): Promise<Result<PeerReviewSession>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(createdBy);
      Validator.required(params.assignmentId, 'assignmentId');
      Validator.required(params.rubric, 'rubric');

      if (params.submissionDeadline >= params.reviewDeadline) {
        throw new ValidationError('Review deadline must be after submission deadline');
      }
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createSession', tenantId, async () => {
      const existing = await this.sessionRepo.findByAssignment(tenantId, params.assignmentId);
      if (existing) {
        throw new ValidationError('Session already exists for this assignment');
      }

      const config: PeerReviewConfig = {
        anonymousSubmissions: params.config?.anonymousSubmissions ?? this.serviceConfig.anonymousDefault,
        anonymousReviews: params.config?.anonymousReviews ?? this.serviceConfig.anonymousDefault,
        reviewsPerSubmission: params.config?.reviewsPerSubmission ?? this.serviceConfig.defaultReviewsPerSubmission,
        submissionsPerReviewer: params.config?.submissionsPerReviewer ?? this.serviceConfig.defaultSubmissionsPerReviewer,
        rubric: params.rubric,
        enableComparativeReview: params.config?.enableComparativeReview ?? false,
        enableAIGuidance: params.config?.enableAIGuidance ?? this.serviceConfig.enableAIByDefault,
        enableAIQualityCheck: params.config?.enableAIQualityCheck ?? this.serviceConfig.enableAIByDefault,
        enableCalibration: params.config?.enableCalibration ?? false,
        requireSelfReview: params.config?.requireSelfReview ?? false,
        minimumFeedbackWords: params.config?.minimumFeedbackWords ?? this.serviceConfig.minimumFeedbackWords
      };

      const session: PeerReviewSession = {
        id: this.generateId('prsession'),
        tenantId,
        assignmentId: params.assignmentId,
        assignmentTitle: params.assignmentTitle,
        courseId: params.courseId,
        courseName: params.courseName,
        config,
        submissionDeadline: params.submissionDeadline,
        reviewDeadline: params.reviewDeadline,
        status: 'draft',
        submissions: [],
        reviewAssignments: [],
        stats: {
          totalSubmissions: 0,
          totalReviews: 0,
          completedReviews: 0,
          averageReviewQuality: 0,
          averageSubmissionScore: 0,
          reviewerParticipationRate: 0
        },
        createdAt: new Date(),
        createdBy,
        updatedAt: new Date()
      };

      const saved = await this.sessionRepo.save(tenantId, session);

      await this.publishEvent('scholarly.peer_review.session_created', tenantId, {
        sessionId: saved.id,
        assignmentId: params.assignmentId
      });

      return saved;
    }, { assignmentId: params.assignmentId });
  }

  async openForSubmissions(tenantId: string, sessionId: string): Promise<Result<PeerReviewSession>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('openForSubmissions', tenantId, async () => {
      const session = await this.sessionRepo.findById(tenantId, sessionId);
      if (!session) throw new NotFoundError('PeerReviewSession', sessionId);
      if (session.status !== 'draft') throw new ValidationError('Session must be in draft status');

      return this.sessionRepo.update(tenantId, sessionId, {
        status: 'collecting_submissions',
        updatedAt: new Date()
      });
    }, { sessionId });
  }

  // --------------------------------------------------------------------------
  // SUBMISSIONS
  // --------------------------------------------------------------------------

  async submitWork(
    tenantId: string,
    sessionId: string,
    authorId: string,
    authorName: string,
    content: SubmissionContent
  ): Promise<Result<PeerSubmission>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
      Validator.userId(authorId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('submitWork', tenantId, async () => {
      const session = await this.sessionRepo.findById(tenantId, sessionId);
      if (!session) throw new NotFoundError('PeerReviewSession', sessionId);
      if (session.status !== 'collecting_submissions') throw new ValidationError('Not accepting submissions');
      if (new Date() > session.submissionDeadline) throw new ValidationError('Deadline passed');

      const existing = await this.submissionRepo.findByAuthor(tenantId, sessionId, authorId);
      if (existing) throw new ValidationError('Already submitted');

      const submission: PeerSubmission = {
        id: this.generateId('submission'),
        sessionId,
        authorId,
        authorName: session.config.anonymousSubmissions ? undefined : authorName,
        content,
        receivedReviews: [],
        submittedAt: new Date(),
        status: 'submitted'
      };

      const saved = await this.submissionRepo.save(tenantId, submission);

      session.stats.totalSubmissions++;
      await this.sessionRepo.update(tenantId, sessionId, {
        stats: session.stats,
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.peer_review.submitted', tenantId, {
        sessionId,
        submissionId: saved.id
      });

      return saved;
    }, { sessionId, authorId });
  }

  // --------------------------------------------------------------------------
  // REVIEWER ASSIGNMENT
  // --------------------------------------------------------------------------

  async assignReviewers(
    tenantId: string,
    sessionId: string,
    participantIds: string[]
  ): Promise<Result<{ assignments: ReviewAssignment[]; unassigned: string[] }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
      if (!participantIds || participantIds.length < 2) {
        throw new ValidationError('At least 2 participants required');
      }
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('assignReviewers', tenantId, async () => {
      const session = await this.sessionRepo.findById(tenantId, sessionId);
      if (!session) throw new NotFoundError('PeerReviewSession', sessionId);

      const submissions = await this.submissionRepo.findBySession(tenantId, sessionId);
      if (submissions.length === 0) throw new ValidationError('No submissions');

      const assignments: ReviewAssignment[] = [];
      const unassigned: string[] = [];

      const matrix = this.createAssignmentMatrix(
        submissions,
        participantIds,
        session.config.reviewsPerSubmission,
        session.config.submissionsPerReviewer,
        session.config.enableComparativeReview
      );

      for (const [reviewerId, assigned] of matrix.entries()) {
        if (assigned.length === 0) {
          unassigned.push(reviewerId);
          continue;
        }

        const assignment: ReviewAssignment = {
          id: this.generateId('assign'),
          sessionId,
          reviewerId,
          assignedSubmissions: assigned.map(s => ({
            submissionId: s.submissionId,
            comparisonSubmissionIds: s.comparisonIds,
            status: 'pending' as const,
            dueDate: session.reviewDeadline
          })),
          completedCount: 0,
          totalAssigned: assigned.length
        };

        const saved = await this.assignmentRepo.save(tenantId, assignment);
        assignments.push(saved);
      }

      await this.sessionRepo.update(tenantId, sessionId, {
        status: 'review_in_progress',
        reviewAssignments: assignments,
        updatedAt: new Date()
      });

      return { assignments, unassigned };
    }, { sessionId });
  }

  private createAssignmentMatrix(
    submissions: PeerSubmission[],
    reviewerIds: string[],
    reviewsPerSubmission: number,
    submissionsPerReviewer: number,
    enableComparative: boolean
  ): Map<string, { submissionId: string; comparisonIds?: string[] }[]> {
    const matrix = new Map<string, { submissionId: string; comparisonIds?: string[] }[]>();
    const subReviewCounts = new Map<string, number>();
    const reviewerCounts = new Map<string, number>();

    reviewerIds.forEach(id => {
      matrix.set(id, []);
      reviewerCounts.set(id, 0);
    });
    submissions.forEach(s => subReviewCounts.set(s.id, 0));

    const shuffledSubs = [...submissions].sort(() => Math.random() - 0.5);
    const shuffledRevs = [...reviewerIds].sort(() => Math.random() - 0.5);

    for (const sub of shuffledSubs) {
      const needed = reviewsPerSubmission - (subReviewCounts.get(sub.id) || 0);

      for (let i = 0; i < needed; i++) {
        const reviewer = shuffledRevs.find(rid => {
          if (rid === sub.authorId) return false;
          if ((reviewerCounts.get(rid) || 0) >= submissionsPerReviewer) return false;
          if (matrix.get(rid)?.some(a => a.submissionId === sub.id)) return false;
          return true;
        });

        if (reviewer) {
          const assigns = matrix.get(reviewer)!;
          let comparisonIds: string[] | undefined;
          
          if (enableComparative) {
            comparisonIds = shuffledSubs
              .filter(s => s.id !== sub.id && s.authorId !== sub.authorId)
              .slice(0, 2)
              .map(s => s.id);
          }

          assigns.push({ submissionId: sub.id, comparisonIds });
          reviewerCounts.set(reviewer, (reviewerCounts.get(reviewer) || 0) + 1);
          subReviewCounts.set(sub.id, (subReviewCounts.get(sub.id) || 0) + 1);
        }
      }
    }

    return matrix;
  }

  // --------------------------------------------------------------------------
  // REVIEWS
  // --------------------------------------------------------------------------

  async getReviewerAssignments(
    tenantId: string,
    sessionId: string,
    reviewerId: string
  ): Promise<Result<{
    assignment: ReviewAssignment;
    submissions: PeerSubmission[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
      Validator.userId(reviewerId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getReviewerAssignments', tenantId, async () => {
      const assignment = await this.assignmentRepo.findByReviewer(tenantId, sessionId, reviewerId);
      if (!assignment) throw new NotFoundError('ReviewAssignment', `${sessionId}:${reviewerId}`);

      const submissions: PeerSubmission[] = [];
      for (const assigned of assignment.assignedSubmissions) {
        const sub = await this.submissionRepo.findById(tenantId, assigned.submissionId);
        if (sub) submissions.push(sub);
      }

      return { assignment, submissions };
    }, { sessionId, reviewerId });
  }

  async submitReview(
    tenantId: string,
    sessionId: string,
    reviewerId: string,
    submissionId: string,
    review: {
      criteriaScores: { criterionId: string; score: number; comment?: string }[];
      overallFeedback: string;
      strengthsIdentified: string[];
      suggestionsForImprovement: string[];
    }
  ): Promise<Result<PeerReview>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
      Validator.userId(reviewerId);
      Validator.required(submissionId, 'submissionId');
      Validator.required(review.overallFeedback, 'overallFeedback');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('submitReview', tenantId, async () => {
      const session = await this.sessionRepo.findById(tenantId, sessionId);
      if (!session) throw new NotFoundError('PeerReviewSession', sessionId);

      const submission = await this.submissionRepo.findById(tenantId, submissionId);
      if (!submission) throw new NotFoundError('PeerSubmission', submissionId);

      const assignment = await this.assignmentRepo.findByReviewer(tenantId, sessionId, reviewerId);
      if (!assignment) throw new AuthorizationError('Not assigned to review');

      const assigned = assignment.assignedSubmissions.find(a => a.submissionId === submissionId);
      if (!assigned) throw new AuthorizationError('Not assigned this submission');

      const wordCount = review.overallFeedback.split(/\s+/).length;
      if (wordCount < session.config.minimumFeedbackWords) {
        throw new ValidationError(`Feedback must be at least ${session.config.minimumFeedbackWords} words`);
      }

      let qualityScore: number | undefined;
      if (session.config.enableAIQualityCheck) {
        const quality = await this.ai.assessFeedbackQuality(review.overallFeedback);
        qualityScore = quality.score;
      }

      const peerReview: PeerReview = {
        id: this.generateId('review'),
        submissionId,
        reviewerId,
        isSelfReview: submission.authorId === reviewerId,
        criteriaScores: review.criteriaScores,
        overallFeedback: review.overallFeedback,
        strengthsIdentified: review.strengthsIdentified,
        suggestionsForImprovement: review.suggestionsForImprovement,
        aiGuidanceUsed: session.config.enableAIGuidance,
        qualityScore,
        wordCount,
        startedAt: new Date(),
        completedAt: new Date()
      };

      const saved = await this.reviewRepo.save(tenantId, peerReview);

      submission.receivedReviews.push(saved);
      submission.status = 'under_review';
      await this.submissionRepo.update(tenantId, submissionId, {
        receivedReviews: submission.receivedReviews,
        status: submission.status
      });

      assigned.status = 'completed';
      assignment.completedCount++;
      await this.assignmentRepo.update(tenantId, assignment.id, {
        assignedSubmissions: assignment.assignedSubmissions,
        completedCount: assignment.completedCount
      });

      session.stats.totalReviews++;
      session.stats.completedReviews++;
      await this.sessionRepo.update(tenantId, sessionId, {
        stats: session.stats,
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.peer_review.review_submitted', tenantId, {
        sessionId,
        reviewId: saved.id,
        submissionId
      });

      return saved;
    }, { sessionId, submissionId });
  }

  async getAIFeedbackSuggestions(
    tenantId: string,
    sessionId: string,
    submissionId: string,
    criterionId: string
  ): Promise<Result<string[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
      Validator.required(submissionId, 'submissionId');
      Validator.required(criterionId, 'criterionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getAIFeedbackSuggestions', tenantId, async () => {
      const session = await this.sessionRepo.findById(tenantId, sessionId);
      if (!session) throw new NotFoundError('PeerReviewSession', sessionId);
      if (!session.config.enableAIGuidance) return [];

      const submission = await this.submissionRepo.findById(tenantId, submissionId);
      if (!submission) throw new NotFoundError('PeerSubmission', submissionId);

      const criterion = session.config.rubric.criteria.find(c => c.id === criterionId);
      if (!criterion) throw new NotFoundError('RubricCriterion', criterionId);

      const contentText = submission.content.text || '[File submission]';
      return this.ai.generateFeedbackSuggestions(session.config.rubric, contentText, criterion);
    }, { sessionId, submissionId });
  }

  // --------------------------------------------------------------------------
  // FEEDBACK AGGREGATION
  // --------------------------------------------------------------------------

  async aggregateFeedback(tenantId: string, sessionId: string, submissionId: string): Promise<Result<AggregatedFeedback>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
      Validator.required(submissionId, 'submissionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('aggregateFeedback', tenantId, async () => {
      const session = await this.sessionRepo.findById(tenantId, sessionId);
      if (!session) throw new NotFoundError('PeerReviewSession', sessionId);

      const submission = await this.submissionRepo.findById(tenantId, submissionId);
      if (!submission) throw new NotFoundError('PeerSubmission', submissionId);
      if (submission.receivedReviews.length === 0) throw new ValidationError('No reviews');

      const aggregated = await this.ai.synthesizeFeedback(submission.receivedReviews, session.config.rubric);

      const scores = submission.receivedReviews.map(r => {
        const totalWeight = session.config.rubric.criteria.reduce((sum, c) => sum + c.weight, 0);
        let weightedScore = 0;
        for (const cs of r.criteriaScores) {
          const criterion = session.config.rubric.criteria.find(c => c.id === cs.criterionId);
          if (criterion) weightedScore += (cs.score / criterion.maxPoints) * criterion.weight;
        }
        return (weightedScore / totalWeight) * 100;
      });

      aggregated.averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      aggregated.scoreDistribution = scores;

      await this.submissionRepo.update(tenantId, submissionId, {
        aggregatedScore: aggregated.averageScore,
        aggregatedFeedback: aggregated,
        status: 'reviewed'
      });

      return aggregated;
    }, { sessionId, submissionId });
  }

  async releaseFeedback(tenantId: string, sessionId: string): Promise<Result<PeerReviewSession>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('releaseFeedback', tenantId, async () => {
      const session = await this.sessionRepo.findById(tenantId, sessionId);
      if (!session) throw new NotFoundError('PeerReviewSession', sessionId);

      const submissions = await this.submissionRepo.findBySession(tenantId, sessionId);

      for (const sub of submissions) {
        if (sub.receivedReviews.length > 0 && !sub.aggregatedFeedback) {
          await this.aggregateFeedback(tenantId, sessionId, sub.id);
        }
        await this.submissionRepo.update(tenantId, sub.id, { status: 'feedback_released' });
      }

      session.stats.averageSubmissionScore = submissions
        .filter(s => s.aggregatedScore)
        .reduce((sum, s) => sum + (s.aggregatedScore || 0), 0) / submissions.length;

      const updated = await this.sessionRepo.update(tenantId, sessionId, {
        status: 'feedback_released',
        feedbackReleaseDate: new Date(),
        stats: session.stats,
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.peer_review.feedback_released', tenantId, { sessionId });

      return updated;
    }, { sessionId });
  }

  async getSessionStatistics(tenantId: string, sessionId: string): Promise<Result<PeerReviewStats>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getSessionStatistics', tenantId, async () => {
      const session = await this.sessionRepo.findById(tenantId, sessionId);
      if (!session) throw new NotFoundError('PeerReviewSession', sessionId);

      const assignments = await this.assignmentRepo.findBySession(tenantId, sessionId);
      const participationRate = assignments.length > 0
        ? assignments.filter(a => a.completedCount > 0).length / assignments.length
        : 0;

      return { ...session.stats, reviewerParticipationRate: participationRate };
    }, { sessionId });
  }
}

export const PEER_REVIEW_SERVICE_VERSION = '1.0.0';
