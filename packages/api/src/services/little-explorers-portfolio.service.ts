/**
 * Little Explorers - Portfolio Service
 *
 * Manages comprehensive digital portfolios for students in early years education
 * (ages 3-7). Captures learning journeys through various media, observations, and
 * AI-powered curriculum tagging.
 *
 * Features:
 * - Portfolio item management (photos, videos, drawings, writing samples)
 * - Learning activities with response tracking
 * - Teacher observations and learning stories
 * - Developmental milestone tracking
 * - AI-powered curriculum tagging (EYLF, EYFS, Common Core)
 * - Progress reports with AI-generated narratives
 * - Student QR/picture password login
 * - Parent engagement tracking
 *
 * @module LittleExplorers/Portfolio
 */

import { log } from '../lib/logger';
import {
  Result,
  success,
  failure,
  isFailure,
  ScholarlyBaseService,
  ServiceDependencies,
  ValidationError,
  NotFoundError,
  Validator,
} from './base.service';
import {
  LittleExplorersStudent,
  LittleExplorersClassroom,
  LittleExplorersTeacher,
  LittleExplorersParent,
  LittleExplorersPortfolioItem,
  LittleExplorersPortfolioItemType,
  LittleExplorersActivity,
  LittleExplorersActivityResponse,
  LittleExplorersTeacherObservation,
  LittleExplorersDevelopmentalMilestone,
  LittleExplorersStudentMilestone,
  LittleExplorersMilestoneStatus,
  LittleExplorersProgressReport,
  LittleExplorersStudentAccess,
  LittleExplorersPortfolioLoginType,
  LittleExplorersCurriculumFramework,
  LittleExplorersDevelopmentalArea,
  LittleExplorersAIContext,
  LittleExplorersAgeGroup,
  generateLittleExplorersId,
} from './little-explorers-types';
import {
  LittleExplorersAIService,
  getLittleExplorersAIService,
} from './little-explorers-ai.service';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface LittleExplorersPortfolioItemRepository {
  create(item: LittleExplorersPortfolioItem): Promise<LittleExplorersPortfolioItem>;
  findById(tenantId: string, id: string): Promise<LittleExplorersPortfolioItem | null>;
  findByStudent(
    tenantId: string,
    studentId: string,
    options?: {
      types?: LittleExplorersPortfolioItemType[];
      approvalStatus?: string;
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    }
  ): Promise<{ items: LittleExplorersPortfolioItem[]; total: number }>;
  approve(
    tenantId: string,
    itemId: string,
    approvedBy: string,
    makeVisible: boolean
  ): Promise<LittleExplorersPortfolioItem>;
  setHighlight(
    tenantId: string,
    itemId: string,
    isHighlight: boolean,
    highlightedBy: string,
    reason: string
  ): Promise<LittleExplorersPortfolioItem>;
  markParentViewed(tenantId: string, itemId: string, parentId: string): Promise<void>;
  addParentReaction(
    tenantId: string,
    itemId: string,
    reaction: LittleExplorersPortfolioItem['parentReactions'][0]
  ): Promise<void>;
}

export interface LittleExplorersActivityRepository {
  create(activity: LittleExplorersActivity): Promise<LittleExplorersActivity>;
  findById(tenantId: string, id: string): Promise<LittleExplorersActivity | null>;
  findByClassroom(
    tenantId: string,
    classroomId: string,
    options?: { status?: string; limit?: number }
  ): Promise<LittleExplorersActivity[]>;
  publish(tenantId: string, activityId: string): Promise<LittleExplorersActivity>;
  incrementResponseCount(tenantId: string, activityId: string): Promise<void>;
}

export interface LittleExplorersActivityResponseRepository {
  create(response: LittleExplorersActivityResponse): Promise<LittleExplorersActivityResponse>;
  findById(tenantId: string, id: string): Promise<LittleExplorersActivityResponse | null>;
  findByActivityAndStudent(
    tenantId: string,
    activityId: string,
    studentId: string
  ): Promise<LittleExplorersActivityResponse | null>;
  addTeacherFeedback(
    tenantId: string,
    responseId: string,
    feedback: LittleExplorersActivityResponse['teacherFeedback']
  ): Promise<LittleExplorersActivityResponse>;
  markPointsAwarded(tenantId: string, responseId: string): Promise<void>;
}

export interface LittleExplorersObservationRepository {
  create(observation: LittleExplorersTeacherObservation): Promise<LittleExplorersTeacherObservation>;
  findById(tenantId: string, id: string): Promise<LittleExplorersTeacherObservation | null>;
  findByClassroom(
    tenantId: string,
    classroomId: string,
    options?: { limit?: number }
  ): Promise<LittleExplorersTeacherObservation[]>;
  markConverted(tenantId: string, observationId: string, portfolioItemId: string): Promise<void>;
}

export interface LittleExplorersMilestoneRepository {
  findById(tenantId: string, id: string): Promise<LittleExplorersDevelopmentalMilestone | null>;
  findByAgeRange(
    tenantId: string,
    age: number,
    options?: { framework?: LittleExplorersCurriculumFramework; area?: LittleExplorersDevelopmentalArea }
  ): Promise<LittleExplorersDevelopmentalMilestone[]>;
}

export interface LittleExplorersStudentMilestoneRepository {
  findByStudentAndMilestone(
    tenantId: string,
    studentId: string,
    milestoneId: string
  ): Promise<LittleExplorersStudentMilestone | null>;
  findByStudent(tenantId: string, studentId: string): Promise<LittleExplorersStudentMilestone[]>;
  upsert(milestone: LittleExplorersStudentMilestone): Promise<LittleExplorersStudentMilestone>;
}

export interface LittleExplorersProgressReportRepository {
  create(report: LittleExplorersProgressReport): Promise<LittleExplorersProgressReport>;
  findById(tenantId: string, id: string): Promise<LittleExplorersProgressReport | null>;
  findByStudent(
    tenantId: string,
    studentId: string,
    options?: { limit?: number }
  ): Promise<LittleExplorersProgressReport[]>;
  setPdfUrl(tenantId: string, reportId: string, pdfUrl: string): Promise<void>;
}

export interface LittleExplorersStudentAccessRepository {
  create(access: LittleExplorersStudentAccess): Promise<LittleExplorersStudentAccess>;
  findByStudent(tenantId: string, studentId: string): Promise<LittleExplorersStudentAccess | null>;
  recordLogin(tenantId: string, studentId: string): Promise<void>;
}

// ============================================================================
// SERVICE INPUT/OUTPUT TYPES
// ============================================================================

export interface LittleExplorersPortfolioServiceDependencies extends ServiceDependencies {
  itemRepository: LittleExplorersPortfolioItemRepository;
  activityRepository: LittleExplorersActivityRepository;
  responseRepository: LittleExplorersActivityResponseRepository;
  observationRepository: LittleExplorersObservationRepository;
  milestoneRepository: LittleExplorersMilestoneRepository;
  studentMilestoneRepository: LittleExplorersStudentMilestoneRepository;
  reportRepository: LittleExplorersProgressReportRepository;
  accessRepository: LittleExplorersStudentAccessRepository;
  aiService?: LittleExplorersAIService;
  getStudent: (tenantId: string, studentId: string) => Promise<LittleExplorersStudent | null>;
  getClassroom: (tenantId: string, classroomId: string) => Promise<LittleExplorersClassroom | null>;
  getTeacher: (tenantId: string, teacherId: string) => Promise<LittleExplorersTeacher | null>;
  getParent: (tenantId: string, parentId: string) => Promise<LittleExplorersParent | null>;
  awardPoints: (
    tenantId: string,
    studentId: string,
    skillId: string,
    reason: string
  ) => Promise<void>;
  notifyParents: (
    studentId: string,
    notification: { type: string; title: string; body: string; data: Record<string, string> }
  ) => Promise<void>;
  uploadMedia: (file: Buffer, contentType: string, path: string) => Promise<string>;
  generatePDF: (html: string, options?: { format?: string }) => Promise<Buffer>;
  generateQRCode: (data: string) => Promise<string>;
}

export interface LittleExplorersCreatePortfolioItemInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  createdBy: string;
  type: LittleExplorersPortfolioItemType;
  title: string;
  description?: string;
  content: LittleExplorersPortfolioItem['content'];
  capturedAt?: Date;
  useAIAnalysis?: boolean;
  curriculumFrameworks?: LittleExplorersCurriculumFramework[];
  autoApprove?: boolean;
}

export interface LittleExplorersCreateActivityInput {
  tenantId: string;
  schoolId: string;
  classroomId?: string;
  createdBy: string;
  title: string;
  description: string;
  instructions?: string;
  type: LittleExplorersActivity['type'];
  responseTypes: LittleExplorersActivity['responseTypes'];
  content: LittleExplorersActivity['content'];
  targetAgeGroups?: string[];
  targetStudentIds?: string[];
  dueDate?: Date;
  estimatedMinutes?: number;
  settings?: Partial<LittleExplorersActivity['settings']>;
}

export interface LittleExplorersCreateObservationInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  observedBy: string;
  studentIds: string[];
  observation: string;
  type: LittleExplorersTeacherObservation['type'];
  context?: {
    activityType?: string;
    location?: string;
    groupSize?: number;
    duration?: number;
  };
  mediaUrls?: string[];
  useAIEnhancement?: boolean;
}

export interface LittleExplorersGenerateReportInput {
  tenantId: string;
  studentId: string;
  period: LittleExplorersProgressReport['period'];
  dateRange: { start: Date; end: Date };
  includePortfolioItems?: boolean;
  includeBehaviour?: boolean;
  includeMilestones?: boolean;
  audience: 'teacher' | 'parent' | 'formal';
  tone?: 'celebratory' | 'balanced' | 'developmental';
}

// ============================================================================
// LITTLE EXPLORERS PORTFOLIO SERVICE
// ============================================================================

export class LittleExplorersPortfolioService extends ScholarlyBaseService {
  private readonly itemRepo: LittleExplorersPortfolioItemRepository;
  private readonly activityRepo: LittleExplorersActivityRepository;
  private readonly responseRepo: LittleExplorersActivityResponseRepository;
  private readonly observationRepo: LittleExplorersObservationRepository;
  private readonly milestoneRepo: LittleExplorersMilestoneRepository;
  private readonly studentMilestoneRepo: LittleExplorersStudentMilestoneRepository;
  private readonly reportRepo: LittleExplorersProgressReportRepository;
  private readonly accessRepo: LittleExplorersStudentAccessRepository;
  private readonly aiService: LittleExplorersAIService;

  private readonly getStudent: LittleExplorersPortfolioServiceDependencies['getStudent'];
  private readonly getClassroom: LittleExplorersPortfolioServiceDependencies['getClassroom'];
  private readonly getTeacher: LittleExplorersPortfolioServiceDependencies['getTeacher'];
  private readonly getParentUser: LittleExplorersPortfolioServiceDependencies['getParent'];
  private readonly awardPoints: LittleExplorersPortfolioServiceDependencies['awardPoints'];
  private readonly notifyParents: LittleExplorersPortfolioServiceDependencies['notifyParents'];
  private readonly uploadMedia: LittleExplorersPortfolioServiceDependencies['uploadMedia'];
  private readonly generatePDF: LittleExplorersPortfolioServiceDependencies['generatePDF'];
  private readonly generateQRCode: LittleExplorersPortfolioServiceDependencies['generateQRCode'];

  constructor(deps: LittleExplorersPortfolioServiceDependencies) {
    super('LittleExplorersPortfolioService', deps);
    this.itemRepo = deps.itemRepository;
    this.activityRepo = deps.activityRepository;
    this.responseRepo = deps.responseRepository;
    this.observationRepo = deps.observationRepository;
    this.milestoneRepo = deps.milestoneRepository;
    this.studentMilestoneRepo = deps.studentMilestoneRepository;
    this.reportRepo = deps.reportRepository;
    this.accessRepo = deps.accessRepository;
    this.aiService = deps.aiService || getLittleExplorersAIService();
    this.getStudent = deps.getStudent;
    this.getClassroom = deps.getClassroom;
    this.getTeacher = deps.getTeacher;
    this.getParentUser = deps.getParent;
    this.awardPoints = deps.awardPoints;
    this.notifyParents = deps.notifyParents;
    this.uploadMedia = deps.uploadMedia;
    this.generatePDF = deps.generatePDF;
    this.generateQRCode = deps.generateQRCode;
  }

  // ===========================================================================
  // PORTFOLIO ITEMS
  // ===========================================================================

  async createPortfolioItem(
    input: LittleExplorersCreatePortfolioItemInput
  ): Promise<Result<LittleExplorersPortfolioItem>> {
    const validation = this.validateRequired(input, [
      'tenantId',
      'schoolId',
      'classroomId',
      'studentId',
      'createdBy',
      'type',
      'title',
    ]);
    if (isFailure(validation)) return failure(validation.error);

    return this.withTiming('createPortfolioItem', async () => {
      const student = await this.getStudent(input.tenantId, input.studentId);
      if (!student) {
        return failure(new NotFoundError('Student', input.studentId));
      }

      // Check photo consent if media involved
      if (input.content.mediaUrls && input.content.mediaUrls.length > 0) {
        const hasConsent = this.hasPhotoConsent(student);
        if (!hasConsent) {
          return failure(new ValidationError('Student does not have photo consent'));
        }
      }

      const teacher = await this.getTeacher(input.tenantId, input.createdBy);
      if (!teacher) {
        return failure(new NotFoundError('Teacher', input.createdBy));
      }

      // Run AI analysis if requested
      let aiAnalysis: LittleExplorersPortfolioItem['aiAnalysis'];
      let suggestedCurriculumTags: LittleExplorersPortfolioItem['curriculumTags'] = [];
      let suggestedDevelopmentalAreas: LittleExplorersDevelopmentalArea[] = [];

      if (input.useAIAnalysis) {
        const aiResult = await this.aiService.analyzePortfolioItem({
          tenantId: input.tenantId,
          studentId: input.studentId,
          itemType: input.type,
          content: {
            text: input.content.text,
            mediaUrls: input.content.mediaUrls,
          },
          context: {
            school: { id: input.schoolId, name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
            student: {
              id: student.id,
              firstName: student.firstName,
              age: this.calculateAge(student.dateOfBirth),
              grade: LittleExplorersAgeGroup.KINDERGARTEN,
            },
            timeContext: this.buildTimeContext(),
          },
          curriculumFrameworks: input.curriculumFrameworks || ['EYLF'],
          developmentalAreasToTrack: [
            'physical_fine_motor',
            'physical_gross_motor',
            'cognitive_problem_solving',
            'language_expressive',
            'social_emotional_self',
            'creative_visual_arts',
          ],
          teacherObservation: input.description,
        });

        if (aiResult.success) {
          aiAnalysis = {
            description: aiResult.data.description,
            detectedElements: aiResult.data.detectedElements,
            suggestedCurriculumTags: aiResult.data.suggestedCurriculumTags,
            curriculumConfidence: aiResult.data.curriculumConfidence,
            developmentalObservations: aiResult.data.developmentalObservations,
            suggestedDevelopmentalAreas: aiResult.data.suggestedDevelopmentalAreas,
            developmentalConfidence: aiResult.data.developmentalConfidence,
            skillsDemonstrated: aiResult.data.skillsDemonstrated,
            qualityScore: aiResult.data.qualityScore,
            qualityNotes: aiResult.data.qualityNotes,
            highlightRecommendation: aiResult.data.highlightRecommendation,
            highlightReason: aiResult.data.highlightReason,
            potentialMilestones: aiResult.data.potentialMilestones,
            recommendAsHighlight: aiResult.data.highlightRecommendation,
            analyzedAt: new Date(),
          };
          suggestedCurriculumTags = aiResult.data.suggestedCurriculumTags;
          suggestedDevelopmentalAreas = aiResult.data.suggestedDevelopmentalAreas;
        }
      }

      const item: LittleExplorersPortfolioItem = {
        id: generateLittleExplorersId('pf'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        classroomId: input.classroomId,
        studentId: input.studentId,
        type: input.type,
        title: input.title,
        description: input.description || aiAnalysis?.description,
        content: input.content,
        curriculumTags: suggestedCurriculumTags,
        developmentalAreas: suggestedDevelopmentalAreas,
        aiAnalysis,
        approvalStatus: input.autoApprove ? 'approved' : 'pending',
        approvedBy: input.autoApprove ? input.createdBy : undefined,
        approvedAt: input.autoApprove ? new Date() : undefined,
        visibleToParent: input.autoApprove || false,
        sharedToStory: false,
        isHighlight: aiAnalysis?.highlightRecommendation || false,
        highlightReason: aiAnalysis?.highlightReason,
        createdBy: input.createdBy,
        createdByRole: 'teacher',
        parentViewed: false,
        parentReactions: [],
        capturedAt: input.capturedAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.itemRepo.create(item);

      // Process potential milestones
      if (aiAnalysis?.potentialMilestones && Array.isArray(aiAnalysis.potentialMilestones)) {
        // Filter to only process objects with the expected shape
        const milestoneObjects = aiAnalysis.potentialMilestones.filter(
          (m): m is { milestoneId: string; confidence: number; evidence: string } =>
            typeof m === 'object' && m !== null && 'milestoneId' in m
        );
        if (milestoneObjects.length > 0) {
          await this.processDetectedMilestones(
            input.tenantId,
            input.studentId,
            milestoneObjects,
            saved.id
          );
        }
      }

      // Notify parents if visible
      if (saved.visibleToParent) {
        await this.notifyParentsOfNewItem(saved, student);
      }

      await this.publishEvent('portfolio.item_created', input.tenantId, {
        itemId: saved.id,
        studentId: input.studentId,
        type: input.type,
        hasAIAnalysis: !!aiAnalysis,
        isHighlight: saved.isHighlight,
      });

      return success(saved);
    });
  }

  async getStudentPortfolio(
    tenantId: string,
    studentId: string,
    viewerId: string,
    viewerRole: 'teacher' | 'parent' | 'student',
    options?: {
      types?: LittleExplorersPortfolioItemType[];
      dateRange?: { start: Date; end: Date };
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<{ items: LittleExplorersPortfolioItem[]; total: number }>> {
    return this.withTiming('getStudentPortfolio', async () => {
      const student = await this.getStudent(tenantId, studentId);
      if (!student) {
        return failure(new NotFoundError('Student', studentId));
      }

      // Filter based on viewer role
      const approvalStatus =
        viewerRole === 'teacher' ? undefined : 'approved';

      const result = await this.itemRepo.findByStudent(tenantId, studentId, {
        types: options?.types,
        approvalStatus,
        dateRange: options?.dateRange,
        limit: options?.limit || 20,
        offset: options?.offset || 0,
      });

      // Record view for parent
      if (viewerRole === 'parent') {
        for (const item of result.items) {
          if (!item.parentViewed) {
            await this.itemRepo.markParentViewed(tenantId, item.id, viewerId);
          }
        }
      }

      return success(result);
    });
  }

  async approveItem(
    tenantId: string,
    itemId: string,
    approvedBy: string,
    makeVisible: boolean = true
  ): Promise<Result<LittleExplorersPortfolioItem>> {
    return this.withTiming('approveItem', async () => {
      const item = await this.itemRepo.findById(tenantId, itemId);
      if (!item) {
        return failure(new NotFoundError('PortfolioItem', itemId));
      }

      const updated = await this.itemRepo.approve(tenantId, itemId, approvedBy, makeVisible);

      if (makeVisible) {
        const student = await this.getStudent(tenantId, item.studentId);
        if (student) {
          await this.notifyParentsOfNewItem(updated, student);
        }
      }

      return success(updated);
    });
  }

  async markAsHighlight(
    tenantId: string,
    itemId: string,
    highlightedBy: string,
    reason: string
  ): Promise<Result<LittleExplorersPortfolioItem>> {
    return this.withTiming('markAsHighlight', async () => {
      const item = await this.itemRepo.findById(tenantId, itemId);
      if (!item) {
        return failure(new NotFoundError('PortfolioItem', itemId));
      }

      return success(await this.itemRepo.setHighlight(tenantId, itemId, true, highlightedBy, reason));
    });
  }

  async addParentReaction(
    tenantId: string,
    itemId: string,
    parentId: string,
    reactionType: 'love' | 'proud' | 'amazing' | 'comment',
    comment?: string
  ): Promise<Result<void>> {
    return this.withTiming('addParentReaction', async () => {
      const item = await this.itemRepo.findById(tenantId, itemId);
      if (!item) {
        return failure(new NotFoundError('PortfolioItem', itemId));
      }

      if (!item.visibleToParent) {
        return failure(new ValidationError('Item is not visible to parents'));
      }

      const parent = await this.getParentUser(tenantId, parentId);
      if (!parent) {
        return failure(new NotFoundError('Parent', parentId));
      }

      const reaction: LittleExplorersPortfolioItem['parentReactions'][0] = {
        parentId,
        parentName: `${parent.firstName} ${parent.lastName}`,
        type: reactionType,
        comment,
        createdAt: new Date(),
      };

      await this.itemRepo.addParentReaction(tenantId, itemId, reaction);

      await this.publishEvent('portfolio.parent_engagement', tenantId, {
        itemId,
        studentId: item.studentId,
        parentId,
        reactionType,
      });

      return success(undefined);
    });
  }

  // ===========================================================================
  // ACTIVITIES
  // ===========================================================================

  async createActivity(
    input: LittleExplorersCreateActivityInput
  ): Promise<Result<LittleExplorersActivity>> {
    const validation = this.validateRequired(input, [
      'tenantId',
      'schoolId',
      'createdBy',
      'title',
      'description',
      'type',
      'responseTypes',
    ]);
    if (isFailure(validation)) return failure(validation.error);

    if (!Validator.isArray(input.responseTypes) || input.responseTypes.length === 0) {
      return failure({ code: 'VALIDATION_ERROR', message: 'responseTypes is required' });
    }

    return this.withTiming('createActivity', async () => {
      const teacher = await this.getTeacher(input.tenantId, input.createdBy);
      if (!teacher) {
        return failure(new NotFoundError('Teacher', input.createdBy));
      }

      const activity: LittleExplorersActivity = {
        id: generateLittleExplorersId('act'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        classroomId: input.classroomId,
        title: input.title,
        description: input.description,
        instructions: input.instructions,
        type: input.type,
        responseTypes: input.responseTypes,
        content: input.content,
        targetAgeGroups: input.targetAgeGroups || [],
        targetStudentIds: input.targetStudentIds,
        curriculumTags: [],
        developmentalAreas: [],
        dueDate: input.dueDate,
        estimatedMinutes: input.estimatedMinutes,
        settings: {
          allowMultipleAttempts: input.settings?.allowMultipleAttempts ?? true,
          showFeedbackImmediately: input.settings?.showFeedbackImmediately ?? true,
          requireTeacherReview: input.settings?.requireTeacherReview ?? false,
          awardPointsOnCompletion: input.settings?.awardPointsOnCompletion ?? false,
          pointsSkillId: input.settings?.pointsSkillId,
          addToPortfolio: input.settings?.addToPortfolio ?? true,
          parentCanView: input.settings?.parentCanView ?? true,
          studentCanRetry: input.settings?.studentCanRetry ?? true,
        },
        responseCount: 0,
        completedCount: 0,
        status: 'draft',
        createdBy: input.createdBy,
        createdByName: `${teacher.firstName} ${teacher.lastName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.activityRepo.create(activity);

      await this.publishEvent('portfolio.activity_created', input.tenantId, {
        activityId: saved.id,
        type: input.type,
        classroomId: input.classroomId,
        createdBy: input.createdBy,
      });

      return success(saved);
    });
  }

  async publishActivity(
    tenantId: string,
    activityId: string
  ): Promise<Result<LittleExplorersActivity>> {
    return this.withTiming('publishActivity', async () => {
      const activity = await this.activityRepo.findById(tenantId, activityId);
      if (!activity) {
        return failure(new NotFoundError('Activity', activityId));
      }

      if (activity.status !== 'draft') {
        return failure(new ValidationError('Activity is not in draft status'));
      }

      const updated = await this.activityRepo.publish(tenantId, activityId);

      // Notify targeted students/parents
      if (updated.targetStudentIds) {
        for (const studentId of updated.targetStudentIds) {
          await this.notifyParents(studentId, {
            type: 'new_activity',
            title: 'New Activity',
            body: `${updated.title} is ready for ${updated.createdByName}'s class`,
            data: { activityId: updated.id },
          });
        }
      }

      await this.publishEvent('portfolio.activity_published', tenantId, {
        activityId: updated.id,
        targetStudentCount: updated.targetStudentIds?.length || 0,
      });

      return success(updated);
    });
  }

  async getClassroomActivities(
    tenantId: string,
    classroomId: string,
    options?: { status?: string; limit?: number }
  ): Promise<Result<LittleExplorersActivity[]>> {
    return this.withTiming('getClassroomActivities', async () => {
      const activities = await this.activityRepo.findByClassroom(tenantId, classroomId, options);
      return success(activities);
    });
  }

  async submitActivityResponse(
    tenantId: string,
    activityId: string,
    studentId: string,
    responseType: LittleExplorersActivityResponse['responseType'],
    content: unknown
  ): Promise<Result<LittleExplorersActivityResponse>> {
    return this.withTiming('submitActivityResponse', async () => {
      const activity = await this.activityRepo.findById(tenantId, activityId);
      if (!activity) {
        return failure(new NotFoundError('Activity', activityId));
      }

      if (activity.status !== 'active') {
        return failure(new ValidationError('Activity is not active'));
      }

      const student = await this.getStudent(tenantId, studentId);
      if (!student) {
        return failure(new NotFoundError('Student', studentId));
      }

      // Check for existing response
      const existingResponse = await this.responseRepo.findByActivityAndStudent(
        tenantId,
        activityId,
        studentId
      );
      if (existingResponse && !activity.settings.allowMultipleAttempts) {
        return failure(new ValidationError('Multiple attempts not allowed'));
      }

      // Generate AI feedback if enabled
      let aiFeedback: LittleExplorersActivityResponse['aiFeedback'];
      if (activity.aiConfig?.enableAutoFeedback) {
        const feedbackResult = await this.aiService.generateActivityFeedback({
          tenantId,
          activityId,
          studentId,
          activity: {
            title: activity.title,
            type: activity.type,
            instructions: activity.instructions,
          },
          response: { type: responseType, content },
          context: {
            student: {
              id: student.id,
              firstName: student.firstName,
              age: this.calculateAge(student.dateOfBirth),
              grade: LittleExplorersAgeGroup.KINDERGARTEN,
            },
            timeContext: this.buildTimeContext(),
          },
          feedbackType: 'encouraging',
          audienceAge: this.calculateAge(student.dateOfBirth),
          includeNextSteps: true,
        });

        if (feedbackResult.success) {
          aiFeedback = {
            feedback: feedbackResult.data.feedback,
            strengths: feedbackResult.data.strengths,
            improvements: feedbackResult.data.improvements,
            nextSteps: feedbackResult.data.nextSteps,
            encouragement: feedbackResult.data.encouragement,
            detectedSkills: feedbackResult.data.detectedSkills,
          };
        }
      }

      const response: LittleExplorersActivityResponse = {
        id: generateLittleExplorersId('resp'),
        tenantId,
        activityId,
        studentId,
        responseType,
        content: { type: responseType, [responseType]: content },
        completionStatus: 'submitted',
        aiFeedback,
        pointsAwarded: false,
        startedAt: existingResponse?.startedAt || new Date(),
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.responseRepo.create(response);

      // Update activity counts
      await this.activityRepo.incrementResponseCount(tenantId, activityId);

      // Create portfolio item if enabled
      if (activity.settings.addToPortfolio) {
        await this.createPortfolioItemFromResponse(activity, saved, student);
      }

      // Award points if enabled
      if (activity.settings.awardPointsOnCompletion && activity.settings.pointsSkillId) {
        await this.awardPoints(
          tenantId,
          studentId,
          activity.settings.pointsSkillId,
          `Completed: ${activity.title}`
        );
        await this.responseRepo.markPointsAwarded(tenantId, saved.id);
      }

      await this.publishEvent('portfolio.activity_response', tenantId, {
        activityId,
        responseId: saved.id,
        studentId,
        responseType,
      });

      return success(saved);
    });
  }

  async addTeacherFeedback(
    tenantId: string,
    responseId: string,
    teacherId: string,
    feedback: {
      comment: string;
      rating?: number;
      stamp?: string;
      voiceNoteUrl?: string;
    }
  ): Promise<Result<LittleExplorersActivityResponse>> {
    return this.withTiming('addTeacherFeedback', async () => {
      const response = await this.responseRepo.findById(tenantId, responseId);
      if (!response) {
        return failure(new NotFoundError('ActivityResponse', responseId));
      }

      const teacher = await this.getTeacher(tenantId, teacherId);
      if (!teacher) {
        return failure(new NotFoundError('Teacher', teacherId));
      }

      const updated = await this.responseRepo.addTeacherFeedback(tenantId, responseId, {
        teacherId,
        teacherName: `${teacher.firstName} ${teacher.lastName}`,
        givenBy: teacherId,
        comment: feedback.comment,
        rating: feedback.rating,
        stamp: feedback.stamp,
        voiceNoteUrl: feedback.voiceNoteUrl,
        givenAt: new Date(),
      });

      // Notify parent
      await this.notifyParents(response.studentId, {
        type: 'activity_feedback',
        title: 'New feedback',
        body: `${teacher.firstName} left feedback on an activity`,
        data: { responseId },
      });

      return success(updated);
    });
  }

  // ===========================================================================
  // OBSERVATIONS
  // ===========================================================================

  async createObservation(
    input: LittleExplorersCreateObservationInput
  ): Promise<Result<LittleExplorersTeacherObservation>> {
    const validation = this.validateRequired(input, [
      'tenantId',
      'schoolId',
      'classroomId',
      'observedBy',
      'studentIds',
      'observation',
      'type',
    ]);
    if (isFailure(validation)) return failure(validation.error);

    if (!Validator.isArray(input.studentIds) || input.studentIds.length === 0) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentIds must be a non-empty array' });
    }

    return this.withTiming('createObservation', async () => {
      const teacher = await this.getTeacher(input.tenantId, input.observedBy);
      if (!teacher) {
        return failure(new NotFoundError('Teacher', input.observedBy));
      }

      // AI enhancement if requested
      let aiSuggestions: LittleExplorersTeacherObservation['aiSuggestions'];
      if (input.useAIEnhancement) {
        // Would call AI to enhance observation
        aiSuggestions = {
          enhancedText: input.observation,
          suggestedDevelopmentalAreas: [],
          suggestedCurriculumTags: [],
          detectedSkills: [],
          nextStepsSuggestions: [],
        };
      }

      const observation: LittleExplorersTeacherObservation = {
        id: generateLittleExplorersId('obs'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        classroomId: input.classroomId,
        studentIds: input.studentIds,
        observation: input.observation,
        context: input.context,
        type: input.type,
        developmentalAreas: aiSuggestions?.suggestedDevelopmentalAreas || [],
        curriculumTags: aiSuggestions?.suggestedCurriculumTags || [],
        aiEnhanced: input.useAIEnhancement || false,
        aiSuggestions,
        media: input.mediaUrls?.map((url) => ({ type: 'image' as const, url })) || [],
        convertedToPortfolioItem: false,
        observedBy: input.observedBy,
        observedByName: `${teacher.firstName} ${teacher.lastName}`,
        observedAt: new Date(),
        createdAt: new Date(),
      };

      const saved = await this.observationRepo.create(observation);

      await this.publishEvent('portfolio.observation_created', input.tenantId, {
        observationId: saved.id,
        studentCount: input.studentIds.length,
        type: input.type,
        aiEnhanced: input.useAIEnhancement,
      });

      return success(saved);
    });
  }

  async convertObservationToPortfolioItem(
    tenantId: string,
    observationId: string,
    studentId: string,
    title?: string
  ): Promise<Result<LittleExplorersPortfolioItem>> {
    return this.withTiming('convertObservationToPortfolioItem', async () => {
      const observation = await this.observationRepo.findById(tenantId, observationId);
      if (!observation) {
        return failure(new NotFoundError('Observation', observationId));
      }

      if (!observation.studentIds.includes(studentId)) {
        return failure(new ValidationError('Student not in observation'));
      }

      const result = await this.createPortfolioItem({
        tenantId,
        schoolId: observation.schoolId,
        classroomId: observation.classroomId,
        studentId,
        createdBy: observation.observedBy,
        type: 'observation',
        title: title || `Learning Story - ${observation.observedAt.toLocaleDateString()}`,
        description: observation.observation,
        content: {
          text: observation.observation,
          mediaUrls: observation.media.map((m) => m.url),
        },
        capturedAt: observation.observedAt,
        autoApprove: true,
      });

      if (result.success) {
        await this.observationRepo.markConverted(tenantId, observationId, result.data.id);
      }

      return result;
    });
  }

  // ===========================================================================
  // MILESTONES
  // ===========================================================================

  async recordMilestoneAchievement(
    tenantId: string,
    studentId: string,
    milestoneId: string,
    status: LittleExplorersMilestoneStatus,
    evidence?: { portfolioItemId?: string; notes?: string }
  ): Promise<Result<LittleExplorersStudentMilestone>> {
    return this.withTiming('recordMilestoneAchievement', async () => {
      const milestone = await this.milestoneRepo.findById(tenantId, milestoneId);
      if (!milestone) {
        return failure(new NotFoundError('Milestone', milestoneId));
      }

      let studentMilestone = await this.studentMilestoneRepo.findByStudentAndMilestone(
        tenantId,
        studentId,
        milestoneId
      );

      if (!studentMilestone) {
        studentMilestone = {
          id: generateLittleExplorersId('sm'),
          tenantId,
          studentId,
          milestoneId,
          status: 'not_started',
          evidenceItems: [],
          aiDetected: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      studentMilestone.status = status;
      studentMilestone.updatedAt = new Date();

      if (status === 'achieved') {
        studentMilestone.achievedAt = new Date();
      }

      if (evidence) {
        if (evidence.portfolioItemId) {
          studentMilestone.evidenceItems.push({
            portfolioItemId: evidence.portfolioItemId,
            addedAt: new Date(),
          });
        }
        if (evidence.notes) {
          studentMilestone.teacherNotes = evidence.notes;
        }
      }

      const saved = await this.studentMilestoneRepo.upsert(studentMilestone);

      await this.publishEvent('portfolio.milestone_updated', tenantId, {
        studentId,
        milestoneId,
        status,
        milestoneName: milestone.name,
      });

      return success(saved);
    });
  }

  async getStudentMilestones(
    tenantId: string,
    studentId: string,
    options?: {
      framework?: LittleExplorersCurriculumFramework;
      area?: LittleExplorersDevelopmentalArea;
    }
  ): Promise<
    Result<
      Array<{
        milestone: LittleExplorersDevelopmentalMilestone;
        studentProgress: LittleExplorersStudentMilestone | null;
      }>
    >
  > {
    return this.withTiming('getStudentMilestones', async () => {
      const student = await this.getStudent(tenantId, studentId);
      if (!student) {
        return failure(new NotFoundError('Student', studentId));
      }

      const age = this.calculateAge(student.dateOfBirth);
      const milestones = await this.milestoneRepo.findByAgeRange(tenantId, age, options);
      const studentProgress = await this.studentMilestoneRepo.findByStudent(tenantId, studentId);
      const progressMap = new Map(studentProgress.map((sp) => [sp.milestoneId, sp]));

      return success(
        milestones.map((milestone) => ({
          milestone,
          studentProgress: progressMap.get(milestone.id) || null,
        }))
      );
    });
  }

  // ===========================================================================
  // PROGRESS REPORTS
  // ===========================================================================

  async generateProgressReport(
    input: LittleExplorersGenerateReportInput
  ): Promise<Result<LittleExplorersProgressReport>> {
    const validation = this.validateRequired(input, ['tenantId', 'studentId', 'period', 'dateRange']);
    if (isFailure(validation)) return failure(validation.error);

    return this.withTiming('generateProgressReport', async () => {
      const student = await this.getStudent(input.tenantId, input.studentId);
      if (!student) {
        return failure(new NotFoundError('Student', input.studentId));
      }

      // Gather data
      const portfolioItems = input.includePortfolioItems
        ? await this.itemRepo.findByStudent(input.tenantId, input.studentId, {
            dateRange: input.dateRange,
            approvalStatus: 'approved',
            limit: 50,
          })
        : { items: [], total: 0 };

      const milestones = input.includeMilestones
        ? await this.studentMilestoneRepo.findByStudent(input.tenantId, input.studentId)
        : [];

      // Build AI context
      const aiContext: LittleExplorersAIContext = {
        school: { id: '', name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
        student: {
          id: student.id,
          firstName: student.firstName,
          age: this.calculateAge(student.dateOfBirth),
          grade: LittleExplorersAgeGroup.KINDERGARTEN,
          interests: student.learningProfile.interests,
        },
        timeContext: this.buildTimeContext(),
      };

      // Generate AI narrative
      const narrativeResult = await this.aiService.generateProgressNarrative({
        tenantId: input.tenantId,
        studentId: input.studentId,
        context: aiContext,
        portfolioItems: portfolioItems.items.map((i) => ({
          id: i.id,
          title: i.title,
          type: i.type,
          isHighlight: i.isHighlight,
          capturedAt: i.capturedAt,
        })),
        behaviourSummary: { totalPoints: 0, topSkills: [], trend: 'stable' },
        milestones: {
          achieved: milestones.filter((m) => m.status === 'achieved').map((m) => m.milestoneId),
          inProgress: milestones.filter((m) => m.status === 'developing').map((m) => m.milestoneId),
        },
        period: String(input.period),
        dateRange: input.dateRange,
        audience: input.audience,
        tone: input.tone || 'balanced',
      });

      if (isFailure(narrativeResult)) {
        return failure(narrativeResult.error);
      }

      const report: LittleExplorersProgressReport = {
        id: generateLittleExplorersId('rpt'),
        tenantId: input.tenantId,
        studentId: input.studentId,
        period: input.period,
        dateRange: input.dateRange,
        narrative: narrativeResult.data.narrative,
        highlights: portfolioItems.items
          .filter((i) => i.isHighlight)
          .map((i) => ({
            itemId: i.id,
            title: i.title,
            description: i.description,
            capturedAt: i.capturedAt,
          })),
        milestonesSummary: {
          achieved: milestones.filter((m) => m.status === 'achieved').length,
          inProgress: milestones.filter((m) => m.status === 'developing').length,
          details: milestones.map((m) => ({
            milestoneId: m.milestoneId,
            status: m.status,
            achievedAt: m.achievedAt,
          })),
        },
        generatedAt: new Date(),
        generatedBy: 'ai',
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.reportRepo.create(report);

      await this.publishEvent('portfolio.report_generated', input.tenantId, {
        reportId: saved.id,
        studentId: input.studentId,
        period: input.period,
        audience: input.audience,
      });

      return success(saved);
    });
  }

  async generateReportPDF(tenantId: string, reportId: string): Promise<Result<string>> {
    return this.withTiming('generateReportPDF', async () => {
      const report = await this.reportRepo.findById(tenantId, reportId);
      if (!report) {
        return failure(new NotFoundError('ProgressReport', reportId));
      }

      const student = await this.getStudent(tenantId, report.studentId);
      if (!student) {
        return failure(new NotFoundError('Student', report.studentId));
      }

      const html = this.generateReportHTML(report, student);
      const pdfBuffer = await this.generatePDF(html, { format: 'A4' });

      const pdfUrl = await this.uploadMedia(
        pdfBuffer,
        'application/pdf',
        `reports/${tenantId}/${report.studentId}/${reportId}.pdf`
      );

      await this.reportRepo.setPdfUrl(tenantId, reportId, pdfUrl);

      return success(pdfUrl);
    });
  }

  // ===========================================================================
  // STUDENT ACCESS
  // ===========================================================================

  async setupStudentAccess(
    tenantId: string,
    studentId: string,
    loginType: LittleExplorersPortfolioLoginType
  ): Promise<Result<LittleExplorersStudentAccess>> {
    return this.withTiming('setupStudentAccess', async () => {
      const student = await this.getStudent(tenantId, studentId);
      if (!student) {
        return failure(new NotFoundError('Student', studentId));
      }

      let loginCode: string | undefined;
      let qrCode: string | undefined;
      let pictureOptions: string[] | undefined;

      switch (loginType) {
        case 'qr_code':
          loginCode = generateLittleExplorersId('qr');
          qrCode = await this.generateQRCode(loginCode);
          break;
        case 'text_code':
          loginCode = this.generateTextCode();
          break;
        case 'picture_password':
          pictureOptions = this.generatePictureOptions();
          break;
      }

      const access: LittleExplorersStudentAccess = {
        studentId,
        loginType,
        loginCode,
        qrCodeUrl: qrCode,
        pictureOptions,
        isActive: true,
        lastLogin: undefined,
        createdAt: new Date(),
      };

      const saved = await this.accessRepo.create(access);

      await this.publishEvent('portfolio.student_access_created', tenantId, {
        studentId,
        loginType,
      });

      return success(saved);
    });
  }

  async verifyStudentLogin(
    tenantId: string,
    studentId: string,
    loginData: { code?: string; pictureSequence?: string[] }
  ): Promise<Result<boolean>> {
    return this.withTiming('verifyStudentLogin', async () => {
      const access = await this.accessRepo.findByStudent(tenantId, studentId);
      if (!access) {
        return failure(new NotFoundError('StudentAccess', studentId));
      }

      if (!access.isActive) {
        return failure(new ValidationError('Student access is disabled'));
      }

      let valid = false;

      switch (access.loginType) {
        case 'qr_code':
        case 'text_code':
          valid = access.loginCode === loginData.code;
          break;
        case 'picture_password':
          valid = this.verifyPicturePassword(
            access.pictureSequence || [],
            loginData.pictureSequence || []
          );
          break;
      }

      if (valid) {
        await this.accessRepo.recordLogin(tenantId, studentId);
      }

      return success(valid);
    });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private hasPhotoConsent(student: LittleExplorersStudent): boolean {
    const consent = student.consents?.find((c) => c.type === 'photo_consent');
    return consent?.status === 'granted';
  }

  private async processDetectedMilestones(
    tenantId: string,
    studentId: string,
    potentialMilestones: Array<{ milestoneId: string; confidence: number; evidence: string }>,
    portfolioItemId: string
  ): Promise<void> {
    for (const pm of potentialMilestones) {
      if (pm.confidence >= 0.7) {
        await this.recordMilestoneAchievement(
          tenantId,
          studentId,
          pm.milestoneId,
          pm.confidence >= 0.85 ? 'achieved' : 'developing',
          { portfolioItemId, notes: `AI detected: ${pm.evidence}` }
        );
      }
    }
  }

  private async notifyParentsOfNewItem(
    item: LittleExplorersPortfolioItem,
    student: LittleExplorersStudent
  ): Promise<void> {
    await this.notifyParents(student.id, {
      type: 'portfolio_item',
      title: `New in ${student.firstName}'s portfolio`,
      body: item.title,
      data: { itemId: item.id },
    });
  }

  private async createPortfolioItemFromResponse(
    activity: LittleExplorersActivity,
    response: LittleExplorersActivityResponse,
    student: LittleExplorersStudent
  ): Promise<void> {
    await this.createPortfolioItem({
      tenantId: activity.tenantId,
      schoolId: activity.schoolId,
      classroomId: activity.classroomId || '',
      studentId: student.id,
      createdBy: activity.createdBy,
      type: 'activity_response',
      title: `${activity.title} - Response`,
      content: response.content,
      autoApprove: activity.settings.parentCanView,
    });
  }

  private generateReportHTML(
    report: LittleExplorersProgressReport,
    student: LittleExplorersStudent
  ): string {
    const narrativeSummary = typeof report.narrative === 'string'
      ? report.narrative
      : report.narrative?.teacherSummary || '';
    const highlights = report.highlights || [];
    const milestonesSummary = report.milestonesSummary || { achieved: 0, inProgress: 0 };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Progress Report - ${student.firstName} ${student.lastName}</title>
          <style>
            body { font-family: 'Helvetica Neue', sans-serif; padding: 20px; }
            h1 { color: #6366f1; }
            .section { margin: 20px 0; }
            .highlight { background: #fef3c7; padding: 10px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Progress Report</h1>
          <h2>${student.firstName} ${student.lastName}</h2>
          <p>Period: ${report.period}</p>

          <div class="section">
            <h3>Summary</h3>
            <p>${narrativeSummary}</p>
          </div>

          <div class="section">
            <h3>Highlights</h3>
            ${highlights.map((h) => `<p>- ${h.title}</p>`).join('')}
          </div>

          <div class="section">
            <h3>Development</h3>
            <p>Milestones achieved: ${milestonesSummary.achieved}</p>
            <p>In progress: ${milestonesSummary.inProgress}</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateTextCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private generatePictureOptions(): string[] {
    const animals = ['dog', 'cat', 'rabbit', 'bear', 'lion', 'frog', 'monkey', 'panda'];
    return animals.sort(() => Math.random() - 0.5).slice(0, 4);
  }

  private verifyPicturePassword(expected: string[], actual: string[]): boolean {
    if (expected.length !== actual.length) return false;
    return expected.every((v, i) => v === actual[i]);
  }

  private buildTimeContext(): LittleExplorersAIContext['timeContext'] {
    const now = new Date();
    const hours = now.getHours();
    return {
      currentTime: now,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
        now.getDay()
      ],
      periodOfDay: hours < 12 ? 'morning' : hours < 15 ? 'midday' : 'afternoon',
    };
  }

  private calculateAge(dateOfBirth: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const monthDiff = today.getMonth() - dateOfBirth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) age--;
    return age;
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let littleExplorersPortfolioServiceInstance: LittleExplorersPortfolioService | null = null;

export function initializeLittleExplorersPortfolioService(
  deps: LittleExplorersPortfolioServiceDependencies
): LittleExplorersPortfolioService {
  littleExplorersPortfolioServiceInstance = new LittleExplorersPortfolioService(deps);
  log.info('LittleExplorersPortfolioService initialized');
  return littleExplorersPortfolioServiceInstance;
}

export function getLittleExplorersPortfolioService(): LittleExplorersPortfolioService {
  if (!littleExplorersPortfolioServiceInstance) {
    throw new Error(
      'LittleExplorersPortfolioService not initialized. Call initializeLittleExplorersPortfolioService first.'
    );
  }
  return littleExplorersPortfolioServiceInstance;
}
