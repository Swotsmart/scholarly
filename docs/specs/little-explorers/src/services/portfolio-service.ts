/**
 * Little Explorers - Portfolio Service
 * 
 * The Portfolio Service manages comprehensive digital portfolios for each student,
 * capturing their learning journey through various media and observations. It provides:
 * 
 * - **Media Capture** - Photos, videos, audio recordings, and digital drawings
 * - **Learning Activities** - Assigned tasks with response tracking
 * - **Teacher Observations** - Anecdotal notes and learning stories
 * - **Milestone Tracking** - Developmental milestone achievement
 * - **Progress Reports** - AI-generated narratives for parents and formal reports
 * - **Curriculum Alignment** - EYLF, EYFS, Common Core tagging
 * 
 * ## AI Integration
 * 
 * The service leverages AI to:
 * 
 * 1. **Tag curriculum outcomes** from portfolio content
 * 2. **Detect milestones** from observations and activities
 * 3. **Generate progress narratives** in appropriate tone
 * 4. **Provide personalized feedback** on student activities
 * 5. **Identify learning patterns** across portfolio items
 * 6. **Suggest follow-up activities** based on student interests
 * 
 * ## Design Philosophy
 * 
 * Portfolios celebrate student achievement while maintaining privacy:
 * - Approval workflows before parent visibility
 * - Consent tracking for media sharing
 * - Highlights feature for exceptional work
 * - Parent engagement tracking
 * 
 * @module LittleExplorers/Services/Portfolio
 * @version 1.0.0
 */

import {
  Result, success, failure,
  ValidationError, NotFoundError, ConsentRequiredError, LittleExplorersError,
  Student, Classroom, Teacher, Parent,
  generateId, Validator, DateRange,
  Paginated, PaginationOptions
} from '../types';

import {
  PortfolioItem, PortfolioItemType, PortfolioContent,
  PortfolioItemAIAnalysis, CurriculumTag, CurriculumFramework,
  DevelopmentalArea, ApprovalStatus,
  PortfolioActivity, ActivityType, ActivityResponseType,
  ActivityResponse, ActivityContent, ActivitySettings,
  TeacherObservation, ObservationType,
  DevelopmentalMilestone, StudentMilestone, MilestoneStatus,
  ProgressNarrative, PortfolioReport, ReportPeriod,
  StudentPortfolioAccess, PortfolioLoginType,
  PortfolioItemRepository, PortfolioActivityRepository,
  ActivityResponseRepository, TeacherObservationRepository,
  DevelopmentalMilestoneRepository, StudentMilestoneRepository,
  ProgressReportRepository, StudentAccessRepository,
  ParentReaction
} from '../types/portfolio.types';

import {
  LittleExplorersBaseService,
  ServiceDependencies
} from '../infrastructure';

import { LittleExplorersAIService } from '../ai/ai-service';

import {
  AIContext,
  PortfolioAnalysisInput,
  ProgressNarrativeInput,
  ActivityFeedbackInput,
  LearningRecommendationInput
} from '../types/ai.types';

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface PortfolioServiceDependencies extends ServiceDependencies {
  itemRepository: PortfolioItemRepository;
  activityRepository: PortfolioActivityRepository;
  responseRepository: ActivityResponseRepository;
  observationRepository: TeacherObservationRepository;
  milestoneRepository: DevelopmentalMilestoneRepository;
  studentMilestoneRepository: StudentMilestoneRepository;
  reportRepository: ProgressReportRepository;
  accessRepository: StudentAccessRepository;
  aiService: LittleExplorersAIService;
  
  // Cross-service integrations
  getStudent: (tenantId: string, studentId: string) => Promise<Student | null>;
  getClassroom: (tenantId: string, classroomId: string) => Promise<Classroom | null>;
  getTeacher: (tenantId: string, teacherId: string) => Promise<Teacher | null>;
  getParentsForStudent: (tenantId: string, studentId: string) => Promise<Parent[]>;
  awardPoints: (tenantId: string, studentId: string, skillId: string, reason: string) => Promise<void>;
  notifyParents: (studentId: string, notification: any) => Promise<void>;
  
  // External services
  uploadMedia: (file: Buffer, contentType: string, path: string) => Promise<string>;
  generatePDF: (html: string, options?: any) => Promise<Buffer>;
  generateQRCode: (data: string) => Promise<string>;
}

export interface CreatePortfolioItemInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  createdBy: string;
  type: PortfolioItemType;
  title: string;
  description?: string;
  content: PortfolioContent;
  capturedAt?: Date;
  useAIAnalysis?: boolean;
  curriculumFrameworks?: CurriculumFramework[];
  autoApprove?: boolean;
}

export interface CreateActivityInput {
  tenantId: string;
  schoolId: string;
  classroomId?: string;
  createdBy: string;
  title: string;
  description: string;
  instructions?: string;
  type: ActivityType;
  responseTypes: ActivityResponseType[];
  content: ActivityContent;
  targetAgeGroups?: string[];
  targetStudentIds?: string[];
  dueDate?: Date;
  estimatedMinutes?: number;
  settings?: Partial<ActivitySettings>;
  curriculumFrameworks?: CurriculumFramework[];
}

export interface CreateObservationInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  observedBy: string;
  studentIds: string[];
  observation: string;
  type: ObservationType;
  context?: {
    activityType?: string;
    location?: string;
    groupSize?: number;
    duration?: number;
  };
  mediaUrls?: string[];
  useAIEnhancement?: boolean;
}

export interface GenerateReportInput {
  tenantId: string;
  studentId: string;
  period: ReportPeriod;
  dateRange: DateRange;
  includePortfolioItems?: boolean;
  includeBehaviour?: boolean;
  includeMilestones?: boolean;
  audience: 'teacher' | 'parent' | 'formal';
  tone?: 'celebratory' | 'balanced' | 'developmental';
}

// ============================================================================
// PORTFOLIO SERVICE
// ============================================================================

export class PortfolioService extends LittleExplorersBaseService {
  private readonly itemRepo: PortfolioItemRepository;
  private readonly activityRepo: PortfolioActivityRepository;
  private readonly responseRepo: ActivityResponseRepository;
  private readonly observationRepo: TeacherObservationRepository;
  private readonly milestoneRepo: DevelopmentalMilestoneRepository;
  private readonly studentMilestoneRepo: StudentMilestoneRepository;
  private readonly reportRepo: ProgressReportRepository;
  private readonly accessRepo: StudentAccessRepository;
  private readonly aiService: LittleExplorersAIService;
  
  private readonly getStudent: PortfolioServiceDependencies['getStudent'];
  private readonly getClassroom: PortfolioServiceDependencies['getClassroom'];
  private readonly getTeacher: PortfolioServiceDependencies['getTeacher'];
  private readonly getParentsForStudent: PortfolioServiceDependencies['getParentsForStudent'];
  private readonly awardPoints: PortfolioServiceDependencies['awardPoints'];
  private readonly notifyParents: PortfolioServiceDependencies['notifyParents'];
  private readonly uploadMedia: PortfolioServiceDependencies['uploadMedia'];
  private readonly generatePDF: PortfolioServiceDependencies['generatePDF'];
  private readonly generateQRCode: PortfolioServiceDependencies['generateQRCode'];

  constructor(deps: PortfolioServiceDependencies) {
    super('PortfolioService', deps);
    this.itemRepo = deps.itemRepository;
    this.activityRepo = deps.activityRepository;
    this.responseRepo = deps.responseRepository;
    this.observationRepo = deps.observationRepository;
    this.milestoneRepo = deps.milestoneRepository;
    this.studentMilestoneRepo = deps.studentMilestoneRepository;
    this.reportRepo = deps.reportRepository;
    this.accessRepo = deps.accessRepository;
    this.aiService = deps.aiService;
    
    this.getStudent = deps.getStudent;
    this.getClassroom = deps.getClassroom;
    this.getTeacher = deps.getTeacher;
    this.getParentsForStudent = deps.getParentsForStudent;
    this.awardPoints = deps.awardPoints;
    this.notifyParents = deps.notifyParents;
    this.uploadMedia = deps.uploadMedia;
    this.generatePDF = deps.generatePDF;
    this.generateQRCode = deps.generateQRCode;
  }

  // ===========================================================================
  // PORTFOLIO ITEMS
  // ===========================================================================

  /**
   * Create a new portfolio item
   * 
   * Portfolio items capture student learning moments through photos, videos,
   * audio, drawings, writing samples, and more. AI can automatically tag
   * curriculum outcomes and detect developmental milestones.
   */
  async createPortfolioItem(input: CreatePortfolioItemInput): Promise<Result<PortfolioItem>> {
    try {
      this.validateTenantId(input.tenantId);
      this.validateEntityId(input.studentId, 'student');
      this.validateEntityId(input.classroomId, 'classroom');
      Validator.required(input.title, 'title');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createPortfolioItem', input.tenantId, async () => {
      // Validate student exists
      const student = await this.getStudent(input.tenantId, input.studentId);
      if (!student) {
        throw new NotFoundError('Student', input.studentId);
      }

      // Check photo consent if media involved
      if (input.content.mediaUrls && input.content.mediaUrls.length > 0) {
        const hasConsent = this.hasPhotoConsent(student);
        if (!hasConsent) {
          throw new ConsentRequiredError('photo_consent', input.studentId);
        }
      }

      // Get teacher info
      const teacher = await this.getTeacher(input.tenantId, input.createdBy);
      if (!teacher) {
        throw new NotFoundError('Teacher', input.createdBy);
      }

      // Run AI analysis if requested
      let aiAnalysis: PortfolioItemAIAnalysis | undefined;
      if (input.useAIAnalysis) {
        aiAnalysis = await this.analyzePortfolioContent(input, student);
      }

      // Create the portfolio item
      const item: PortfolioItem = {
        id: this.generateId('pf'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        classroomId: input.classroomId,
        studentId: input.studentId,
        
        type: input.type,
        title: input.title,
        description: input.description || aiAnalysis?.description,
        
        content: input.content,
        
        context: {
          activityType: undefined,
          location: undefined,
          groupSize: undefined,
          involvedPeers: undefined
        },
        
        curriculumTags: aiAnalysis?.suggestedCurriculumTags || [],
        developmentalAreas: aiAnalysis?.suggestedDevelopmentalAreas || [],
        
        aiAnalysis: aiAnalysis ? {
          description: aiAnalysis.description,
          detectedElements: aiAnalysis.detectedElements,
          suggestedCurriculumTags: aiAnalysis.suggestedCurriculumTags,
          curriculumConfidence: aiAnalysis.curriculumConfidence,
          developmentalObservations: aiAnalysis.developmentalObservations,
          suggestedDevelopmentalAreas: aiAnalysis.suggestedDevelopmentalAreas,
          developmentalConfidence: aiAnalysis.developmentalConfidence,
          skillsDemonstrated: aiAnalysis.skillsDemonstrated,
          qualityScore: aiAnalysis.qualityScore,
          qualityNotes: aiAnalysis.qualityNotes,
          highlightRecommendation: aiAnalysis.highlightRecommendation,
          highlightReason: aiAnalysis.highlightReason,
          potentialMilestones: aiAnalysis.potentialMilestones
        } : undefined,
        
        approvalStatus: input.autoApprove ? 'approved' : 'pending',
        approvedBy: input.autoApprove ? input.createdBy : undefined,
        approvedAt: input.autoApprove ? new Date() : undefined,
        
        visibleToParent: input.autoApprove || false,
        sharedToStory: false,
        
        isHighlight: aiAnalysis?.highlightRecommendation || false,
        highlightReason: aiAnalysis?.highlightReason,
        
        createdBy: input.createdBy,
        createdByRole: teacher.role,
        
        capturedAt: input.capturedAt || new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.itemRepo.create(item);

      // Process potential milestones
      if (aiAnalysis?.potentialMilestones) {
        await this.processDetectedMilestones(input.tenantId, input.studentId, aiAnalysis.potentialMilestones, saved.id);
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
        isHighlight: saved.isHighlight
      });

      return saved;
    }, { studentId: input.studentId, type: input.type });
  }

  /**
   * Get student's portfolio
   */
  async getStudentPortfolio(
    tenantId: string,
    studentId: string,
    options: PaginationOptions & {
      types?: PortfolioItemType[];
      approvalStatus?: ApprovalStatus;
      dateRange?: DateRange;
      viewerId?: string;
      viewerRole?: 'teacher' | 'parent' | 'student';
    }
  ): Promise<Result<Paginated<PortfolioItem>>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(studentId, 'student');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getStudentPortfolio', tenantId, async () => {
      // Filter based on viewer role
      const filters = { ...options };
      
      if (options.viewerRole === 'parent') {
        filters.approvalStatus = 'approved';
      } else if (options.viewerRole === 'student') {
        filters.approvalStatus = 'approved';
      }

      const items = await this.itemRepo.findByStudent(tenantId, studentId, filters);

      // Record view for parent
      if (options.viewerId && options.viewerRole === 'parent') {
        for (const item of items.items) {
          if (!item.parentViewed) {
            await this.itemRepo.markParentViewed(tenantId, item.id, options.viewerId);
          }
        }
      }

      return items;
    }, { studentId });
  }

  /**
   * Approve a portfolio item for parent viewing
   */
  async approveItem(
    tenantId: string,
    itemId: string,
    approvedBy: string,
    makeVisible: boolean = true
  ): Promise<Result<PortfolioItem>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(itemId, 'item');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('approveItem', tenantId, async () => {
      const item = await this.itemRepo.findById(tenantId, itemId);
      if (!item) {
        throw new NotFoundError('PortfolioItem', itemId);
      }

      const updated = await this.itemRepo.approve(tenantId, itemId, approvedBy, makeVisible);

      if (makeVisible) {
        const student = await this.getStudent(tenantId, item.studentId);
        if (student) {
          await this.notifyParentsOfNewItem(updated, student);
        }
      }

      return updated;
    }, { itemId });
  }

  /**
   * Mark item as highlight
   */
  async markAsHighlight(
    tenantId: string,
    itemId: string,
    highlightedBy: string,
    reason: string
  ): Promise<Result<PortfolioItem>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(itemId, 'item');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('markAsHighlight', tenantId, async () => {
      const item = await this.itemRepo.findById(tenantId, itemId);
      if (!item) {
        throw new NotFoundError('PortfolioItem', itemId);
      }

      return this.itemRepo.setHighlight(tenantId, itemId, true, highlightedBy, reason);
    }, { itemId });
  }

  /**
   * Add parent reaction to item
   */
  async addParentReaction(
    tenantId: string,
    itemId: string,
    parentId: string,
    reaction: ParentReaction
  ): Promise<Result<void>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(itemId, 'item');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('addParentReaction', tenantId, async () => {
      const item = await this.itemRepo.findById(tenantId, itemId);
      if (!item) {
        throw new NotFoundError('PortfolioItem', itemId);
      }

      if (!item.visibleToParent) {
        throw new ValidationError('Item is not visible to parents');
      }

      await this.itemRepo.addParentReaction(tenantId, itemId, reaction);

      await this.publishEvent('portfolio.parent_engagement', tenantId, {
        itemId,
        studentId: item.studentId,
        parentId,
        reactionType: reaction.type
      });
    }, { itemId });
  }

  // ===========================================================================
  // ACTIVITIES
  // ===========================================================================

  /**
   * Create a learning activity
   */
  async createActivity(input: CreateActivityInput): Promise<Result<PortfolioActivity>> {
    try {
      this.validateTenantId(input.tenantId);
      Validator.required(input.title, 'title');
      Validator.required(input.description, 'description');
      Validator.arrayNotEmpty(input.responseTypes, 'responseTypes');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createActivity', input.tenantId, async () => {
      const teacher = await this.getTeacher(input.tenantId, input.createdBy);
      if (!teacher) {
        throw new NotFoundError('Teacher', input.createdBy);
      }

      const activity: PortfolioActivity = {
        id: this.generateId('act'),
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
          studentCanRetry: input.settings?.studentCanRetry ?? true
        },
        
        responseCount: 0,
        completedCount: 0,
        
        status: 'draft',
        
        createdBy: input.createdBy,
        createdByName: teacher.displayName,
        
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.activityRepo.create(activity);

      await this.publishEvent('portfolio.activity_created', input.tenantId, {
        activityId: saved.id,
        type: input.type,
        classroomId: input.classroomId,
        createdBy: input.createdBy
      });

      return saved;
    }, { type: input.type });
  }

  /**
   * Publish an activity
   */
  async publishActivity(tenantId: string, activityId: string): Promise<Result<PortfolioActivity>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(activityId, 'activity');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('publishActivity', tenantId, async () => {
      const activity = await this.activityRepo.findById(tenantId, activityId);
      if (!activity) {
        throw new NotFoundError('PortfolioActivity', activityId);
      }

      if (activity.status !== 'draft') {
        throw new ValidationError('Activity is not in draft status');
      }

      const updated = await this.activityRepo.publish(tenantId, activityId);

      // Notify targeted students/parents
      if (updated.targetStudentIds) {
        for (const studentId of updated.targetStudentIds) {
          await this.notifyParents(studentId, {
            type: 'new_activity',
            title: '📝 New Activity',
            body: `${updated.title} is ready for ${updated.createdByName}'s class`,
            data: { activityId: updated.id }
          });
        }
      }

      await this.publishEvent('portfolio.activity_published', tenantId, {
        activityId: updated.id,
        targetStudentCount: updated.targetStudentIds?.length || 0
      });

      return updated;
    }, { activityId });
  }

  /**
   * Submit activity response
   */
  async submitActivityResponse(
    tenantId: string,
    activityId: string,
    studentId: string,
    responseType: ActivityResponseType,
    content: any
  ): Promise<Result<ActivityResponse>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(activityId, 'activity');
      this.validateEntityId(studentId, 'student');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('submitActivityResponse', tenantId, async () => {
      const activity = await this.activityRepo.findById(tenantId, activityId);
      if (!activity) {
        throw new NotFoundError('PortfolioActivity', activityId);
      }

      if (activity.status !== 'active') {
        throw new ValidationError('Activity is not active');
      }

      const student = await this.getStudent(tenantId, studentId);
      if (!student) {
        throw new NotFoundError('Student', studentId);
      }

      // Check for existing response
      const existingResponse = await this.responseRepo.findByActivityAndStudent(tenantId, activityId, studentId);
      if (existingResponse && !activity.settings.allowMultipleAttempts) {
        throw new ValidationError('Multiple attempts not allowed');
      }

      // Generate AI feedback if enabled
      let aiFeedback: any;
      if (activity.aiConfig?.enableAutoFeedback) {
        aiFeedback = await this.generateActivityFeedback(activity, { type: responseType, content }, student);
      }

      const response: ActivityResponse = {
        id: this.generateId('resp'),
        tenantId,
        activityId,
        studentId,
        
        responseType,
        content: { type: responseType, [responseType]: content },
        
        completionStatus: 'submitted',
        
        aiFeedback: aiFeedback ? {
          feedback: aiFeedback.feedback,
          strengths: aiFeedback.strengths,
          improvements: aiFeedback.improvements,
          nextSteps: aiFeedback.nextSteps,
          encouragement: aiFeedback.encouragement,
          detectedSkills: aiFeedback.detectedSkills
        } : undefined,
        
        pointsAwarded: false,
        
        startedAt: existingResponse?.startedAt || new Date(),
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
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
        await this.awardPoints(tenantId, studentId, activity.settings.pointsSkillId, `Completed: ${activity.title}`);
        await this.responseRepo.markPointsAwarded(tenantId, saved.id);
      }

      await this.publishEvent('portfolio.activity_response', tenantId, {
        activityId,
        responseId: saved.id,
        studentId,
        responseType
      });

      return saved;
    }, { activityId, studentId });
  }

  /**
   * Add teacher feedback to response
   */
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
  ): Promise<Result<ActivityResponse>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(responseId, 'response');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('addTeacherFeedback', tenantId, async () => {
      const response = await this.responseRepo.findById(tenantId, responseId);
      if (!response) {
        throw new NotFoundError('ActivityResponse', responseId);
      }

      const teacher = await this.getTeacher(tenantId, teacherId);
      if (!teacher) {
        throw new NotFoundError('Teacher', teacherId);
      }

      const updated = await this.responseRepo.addTeacherFeedback(tenantId, responseId, {
        teacherId,
        teacherName: teacher.displayName,
        comment: feedback.comment,
        rating: feedback.rating,
        stamp: feedback.stamp,
        voiceNoteUrl: feedback.voiceNoteUrl,
        givenAt: new Date()
      });

      // Notify parent of feedback
      await this.notifyParents(response.studentId, {
        type: 'activity_feedback',
        title: '⭐ New feedback',
        body: `${teacher.displayName} left feedback on an activity`,
        data: { responseId }
      });

      return updated;
    }, { responseId });
  }

  // ===========================================================================
  // OBSERVATIONS
  // ===========================================================================

  /**
   * Create a teacher observation
   */
  async createObservation(input: CreateObservationInput): Promise<Result<TeacherObservation>> {
    try {
      this.validateTenantId(input.tenantId);
      this.validateEntityId(input.classroomId, 'classroom');
      Validator.required(input.observation, 'observation');
      Validator.arrayNotEmpty(input.studentIds, 'studentIds');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createObservation', input.tenantId, async () => {
      const teacher = await this.getTeacher(input.tenantId, input.observedBy);
      if (!teacher) {
        throw new NotFoundError('Teacher', input.observedBy);
      }

      // AI enhancement if requested
      let aiSuggestions: any;
      if (input.useAIEnhancement) {
        aiSuggestions = await this.enhanceObservation(input);
      }

      const observation: TeacherObservation = {
        id: this.generateId('obs'),
        tenantId: input.tenantId,
        schoolId: input.schoolId,
        classroomId: input.classroomId,
        
        studentIds: input.studentIds,
        
        observation: input.observation,
        
        context: input.context,
        
        type: input.type,
        developmentalAreas: aiSuggestions?.developmentalAreas || [],
        curriculumTags: aiSuggestions?.curriculumTags || [],
        
        aiEnhanced: input.useAIEnhancement || false,
        aiSuggestions: aiSuggestions ? {
          enhancedText: aiSuggestions.enhancedText,
          suggestedDevelopmentalAreas: aiSuggestions.developmentalAreas,
          suggestedCurriculumTags: aiSuggestions.curriculumTags,
          detectedSkills: aiSuggestions.detectedSkills,
          nextStepsSuggestions: aiSuggestions.nextSteps
        } : undefined,
        
        media: input.mediaUrls?.map(url => ({ type: 'image' as const, url })) || [],
        
        convertedToPortfolioItem: false,
        
        observedBy: input.observedBy,
        observedByName: teacher.displayName,
        
        observedAt: new Date(),
        createdAt: new Date()
      };

      const saved = await this.observationRepo.create(observation);

      await this.publishEvent('portfolio.observation_created', input.tenantId, {
        observationId: saved.id,
        studentCount: input.studentIds.length,
        type: input.type,
        aiEnhanced: input.useAIEnhancement
      });

      return saved;
    }, { type: input.type });
  }

  /**
   * Convert observation to portfolio item
   */
  async convertObservationToPortfolioItem(
    tenantId: string,
    observationId: string,
    studentId: string,
    title?: string
  ): Promise<Result<PortfolioItem>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(observationId, 'observation');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('convertObservationToPortfolioItem', tenantId, async () => {
      const observation = await this.observationRepo.findById(tenantId, observationId);
      if (!observation) {
        throw new NotFoundError('TeacherObservation', observationId);
      }

      if (!observation.studentIds.includes(studentId)) {
        throw new ValidationError('Student not in observation');
      }

      const item = await this.createPortfolioItem({
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
          mediaUrls: observation.media.map(m => m.url)
        },
        capturedAt: observation.observedAt,
        autoApprove: true
      });

      if (item.success) {
        await this.observationRepo.markConverted(tenantId, observationId, item.data.id);
      }

      return item;
    }, { observationId, studentId });
  }

  // ===========================================================================
  // MILESTONES
  // ===========================================================================

  /**
   * Record milestone achievement
   */
  async recordMilestoneAchievement(
    tenantId: string,
    studentId: string,
    milestoneId: string,
    status: MilestoneStatus,
    evidence?: { portfolioItemId?: string; notes?: string }
  ): Promise<Result<StudentMilestone>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(studentId, 'student');
      this.validateEntityId(milestoneId, 'milestone');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('recordMilestoneAchievement', tenantId, async () => {
      const milestone = await this.milestoneRepo.findById(tenantId, milestoneId);
      if (!milestone) {
        throw new NotFoundError('DevelopmentalMilestone', milestoneId);
      }

      // Get or create student milestone record
      let studentMilestone = await this.studentMilestoneRepo.findByStudentAndMilestone(tenantId, studentId, milestoneId);

      if (!studentMilestone) {
        studentMilestone = {
          id: this.generateId('sm'),
          tenantId,
          studentId,
          milestoneId,
          status: 'not_started',
          evidenceItems: [],
          aiDetected: false,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }

      // Update status
      studentMilestone.status = status;
      studentMilestone.updatedAt = new Date();

      if (status === 'achieved') {
        studentMilestone.achievedAt = new Date();
      }

      // Add evidence
      if (evidence) {
        if (evidence.portfolioItemId) {
          studentMilestone.evidenceItems.push({
            portfolioItemId: evidence.portfolioItemId,
            addedAt: new Date()
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
        milestoneName: milestone.name
      });

      return saved;
    }, { studentId, milestoneId, status });
  }

  /**
   * Get student's milestone progress
   */
  async getStudentMilestones(
    tenantId: string,
    studentId: string,
    options?: { framework?: CurriculumFramework; area?: DevelopmentalArea }
  ): Promise<Result<Array<{ milestone: DevelopmentalMilestone; studentProgress: StudentMilestone | null }>>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(studentId, 'student');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getStudentMilestones', tenantId, async () => {
      const student = await this.getStudent(tenantId, studentId);
      if (!student) {
        throw new NotFoundError('Student', studentId);
      }

      // Get age-appropriate milestones
      const age = this.calculateAge(student.dateOfBirth);
      const milestones = await this.milestoneRepo.findByAgeRange(tenantId, age, options);

      // Get student's progress
      const studentProgress = await this.studentMilestoneRepo.findByStudent(tenantId, studentId);
      const progressMap = new Map(studentProgress.map(sp => [sp.milestoneId, sp]));

      return milestones.map(milestone => ({
        milestone,
        studentProgress: progressMap.get(milestone.id) || null
      }));
    }, { studentId });
  }

  // ===========================================================================
  // PROGRESS REPORTS
  // ===========================================================================

  /**
   * Generate a progress report
   */
  async generateProgressReport(input: GenerateReportInput): Promise<Result<PortfolioReport>> {
    try {
      this.validateTenantId(input.tenantId);
      this.validateEntityId(input.studentId, 'student');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateProgressReport', input.tenantId, async () => {
      const student = await this.getStudent(input.tenantId, input.studentId);
      if (!student) {
        throw new NotFoundError('Student', input.studentId);
      }

      // Gather data for report
      const portfolioItems = input.includePortfolioItems
        ? await this.itemRepo.findByStudent(input.tenantId, input.studentId, {
            dateRange: input.dateRange,
            approvalStatus: 'approved',
            limit: 50
          })
        : { items: [], total: 0 };

      const milestones = input.includeMilestones
        ? await this.studentMilestoneRepo.findByStudent(input.tenantId, input.studentId)
        : [];

      // Build AI context
      const aiContext: AIContext = {
        school: { id: '', name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
        student: {
          id: student.id,
          firstName: student.firstName,
          age: this.calculateAge(student.dateOfBirth),
          grade: 'kindergarten' as any,
          interests: student.learningProfile.interests
        },
        timeContext: this.buildTimeContext()
      };

      // Generate AI narrative
      const narrativeInput: ProgressNarrativeInput = {
        tenantId: input.tenantId,
        studentId: input.studentId,
        context: aiContext,
        portfolioItems: portfolioItems.items,
        behaviourSummary: {
          totalPoints: 0, // Would fetch from behaviour service
          topSkills: [],
          trend: 'stable'
        },
        milestones: {
          achieved: milestones.filter(m => m.status === 'achieved').map(m => m.milestoneId),
          inProgress: milestones.filter(m => m.status === 'developing').map(m => m.milestoneId)
        },
        period: input.period,
        dateRange: input.dateRange,
        audience: input.audience,
        tone: input.tone || 'balanced'
      };

      const narrativeResult = await this.aiService.generateProgressNarrative(narrativeInput);

      // Create report
      const report: PortfolioReport = {
        id: this.generateId('rpt'),
        tenantId: input.tenantId,
        studentId: input.studentId,
        
        period: input.period,
        dateRange: input.dateRange,
        
        narrative: narrativeResult.narrative,
        
        highlights: portfolioItems.items.filter(i => i.isHighlight).map(i => ({
          itemId: i.id,
          title: i.title,
          description: i.description,
          capturedAt: i.capturedAt
        })),
        
        milestonesSummary: {
          achieved: milestones.filter(m => m.status === 'achieved').length,
          inProgress: milestones.filter(m => m.status === 'developing').length,
          details: milestones.map(m => ({
            milestoneId: m.milestoneId,
            status: m.status,
            achievedAt: m.achievedAt
          }))
        },
        
        generatedAt: new Date(),
        generatedBy: 'ai',
        
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.reportRepo.create(report);

      await this.publishEvent('portfolio.report_generated', input.tenantId, {
        reportId: saved.id,
        studentId: input.studentId,
        period: input.period,
        audience: input.audience
      });

      return saved;
    }, { studentId: input.studentId, period: input.period });
  }

  /**
   * Generate PDF version of report
   */
  async generateReportPDF(
    tenantId: string,
    reportId: string
  ): Promise<Result<string>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(reportId, 'report');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateReportPDF', tenantId, async () => {
      const report = await this.reportRepo.findById(tenantId, reportId);
      if (!report) {
        throw new NotFoundError('PortfolioReport', reportId);
      }

      const student = await this.getStudent(tenantId, report.studentId);
      if (!student) {
        throw new NotFoundError('Student', report.studentId);
      }

      // Generate HTML for PDF
      const html = this.generateReportHTML(report, student);
      
      // Generate PDF
      const pdfBuffer = await this.generatePDF(html, {
        format: 'A4',
        margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' }
      });

      // Upload PDF
      const pdfUrl = await this.uploadMedia(
        pdfBuffer,
        'application/pdf',
        `reports/${tenantId}/${report.studentId}/${reportId}.pdf`
      );

      // Update report with PDF URL
      await this.reportRepo.setPdfUrl(tenantId, reportId, pdfUrl);

      return pdfUrl;
    }, { reportId });
  }

  // ===========================================================================
  // STUDENT ACCESS
  // ===========================================================================

  /**
   * Set up student portfolio access
   */
  async setupStudentAccess(
    tenantId: string,
    studentId: string,
    loginType: PortfolioLoginType
  ): Promise<Result<StudentPortfolioAccess>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(studentId, 'student');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('setupStudentAccess', tenantId, async () => {
      const student = await this.getStudent(tenantId, studentId);
      if (!student) {
        throw new NotFoundError('Student', studentId);
      }

      let loginCode: string | undefined;
      let qrCode: string | undefined;
      let pictureOptions: string[] | undefined;

      switch (loginType) {
        case 'qr_code':
          loginCode = this.generateId('qr');
          qrCode = await this.generateQRCode(loginCode);
          break;
        case 'text_code':
          loginCode = this.generateTextCode();
          break;
        case 'picture_password':
          pictureOptions = this.generatePictureOptions();
          break;
      }

      const access: StudentPortfolioAccess = {
        studentId,
        loginType,
        loginCode,
        qrCodeUrl: qrCode,
        pictureOptions,
        isActive: true,
        lastLogin: undefined,
        createdAt: new Date()
      };

      const saved = await this.accessRepo.create(access);

      await this.publishEvent('portfolio.student_access_created', tenantId, {
        studentId,
        loginType
      });

      return saved;
    }, { studentId, loginType });
  }

  /**
   * Verify student login
   */
  async verifyStudentLogin(
    tenantId: string,
    studentId: string,
    loginData: { code?: string; pictureSequence?: string[] }
  ): Promise<Result<boolean>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(studentId, 'student');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('verifyStudentLogin', tenantId, async () => {
      const access = await this.accessRepo.findByStudent(tenantId, studentId);
      if (!access) {
        throw new NotFoundError('StudentPortfolioAccess', studentId);
      }

      if (!access.isActive) {
        throw new ValidationError('Student access is disabled');
      }

      let valid = false;

      switch (access.loginType) {
        case 'qr_code':
        case 'text_code':
          valid = access.loginCode === loginData.code;
          break;
        case 'picture_password':
          valid = this.verifyPicturePassword(access.pictureSequence || [], loginData.pictureSequence || []);
          break;
      }

      if (valid) {
        await this.accessRepo.recordLogin(tenantId, studentId);
      }

      return valid;
    }, { studentId });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async analyzePortfolioContent(
    input: CreatePortfolioItemInput,
    student: Student
  ): Promise<PortfolioItemAIAnalysis> {
    const aiContext: AIContext = {
      school: { id: input.schoolId, name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
      student: {
        id: student.id,
        firstName: student.firstName,
        age: this.calculateAge(student.dateOfBirth),
        grade: 'kindergarten' as any
      },
      timeContext: this.buildTimeContext()
    };

    const analysisInput: PortfolioAnalysisInput = {
      tenantId: input.tenantId,
      studentId: input.studentId,
      itemType: input.type,
      content: {
        text: input.content.text,
        mediaUrls: input.content.mediaUrls
      },
      context: aiContext,
      curriculumFrameworks: input.curriculumFrameworks || ['EYLF'],
      developmentalAreasToTrack: [
        'physical_fine_motor',
        'physical_gross_motor',
        'cognitive_problem_solving',
        'language_expressive',
        'social_emotional_self',
        'creative_visual_arts'
      ],
      teacherObservation: input.description
    };

    const result = await this.aiService.analyzePortfolioItem(analysisInput);
    return result;
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

  private async notifyParentsOfNewItem(item: PortfolioItem, student: Student): Promise<void> {
    await this.notifyParents(student.id, {
      type: 'portfolio_item',
      title: `📷 New in ${student.firstName}'s portfolio`,
      body: item.title,
      data: { itemId: item.id }
    });
  }

  private async generateActivityFeedback(
    activity: PortfolioActivity,
    response: { type: string; content: any },
    student: Student
  ): Promise<any> {
    const feedbackInput: ActivityFeedbackInput = {
      tenantId: activity.tenantId,
      activityId: activity.id,
      studentId: student.id,
      activity: {
        title: activity.title,
        type: activity.type,
        instructions: activity.instructions
      },
      response: {
        type: response.type as any,
        content: response.content
      },
      context: {
        student: {
          id: student.id,
          firstName: student.firstName,
          age: this.calculateAge(student.dateOfBirth),
          grade: 'kindergarten' as any
        },
        timeContext: this.buildTimeContext()
      },
      feedbackType: 'encouraging',
      audienceAge: this.calculateAge(student.dateOfBirth),
      includeNextSteps: true
    };

    return this.aiService.generateActivityFeedback(feedbackInput);
  }

  private async createPortfolioItemFromResponse(
    activity: PortfolioActivity,
    response: ActivityResponse,
    student: Student
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
      autoApprove: activity.settings.parentCanView
    });
  }

  private async enhanceObservation(input: CreateObservationInput): Promise<any> {
    // Would call AI service to enhance observation
    return {
      enhancedText: input.observation,
      developmentalAreas: [],
      curriculumTags: [],
      detectedSkills: [],
      nextSteps: []
    };
  }

  private generateReportHTML(report: PortfolioReport, student: Student): string {
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
            <p>${report.narrative.teacherSummary}</p>
          </div>
          
          <div class="section">
            <h3>Highlights</h3>
            ${report.highlights.map(h => `<p>• ${h.title}</p>`).join('')}
          </div>
          
          <div class="section">
            <h3>Development</h3>
            <p>Milestones achieved: ${report.milestonesSummary.achieved}</p>
            <p>In progress: ${report.milestonesSummary.inProgress}</p>
          </div>
        </body>
      </html>
    `;
  }

  private hasPhotoConsent(student: Student): boolean {
    const consent = student.consents?.find(c => c.type === 'photo_consent');
    return consent?.status === 'granted';
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
    const animals = ['🐶', '🐱', '🐰', '🐻', '🦁', '🐸', '🐵', '🐼'];
    return animals.sort(() => Math.random() - 0.5).slice(0, 4);
  }

  private verifyPicturePassword(expected: string[], actual: string[]): boolean {
    if (expected.length !== actual.length) return false;
    return expected.every((v, i) => v === actual[i]);
  }

  private buildTimeContext(): AIContext['timeContext'] {
    const now = new Date();
    const hours = now.getHours();
    return {
      currentTime: now,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()],
      periodOfDay: hours < 12 ? 'morning' : hours < 15 ? 'midday' : 'afternoon'
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
// FACTORY
// ============================================================================

export function createPortfolioService(deps: PortfolioServiceDependencies): PortfolioService {
  return new PortfolioService(deps);
}
