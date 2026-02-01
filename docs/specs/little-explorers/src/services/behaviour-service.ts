/**
 * Little Explorers - Behaviour Service
 * 
 * The Behaviour Service manages the Explorer Points system, which is the
 * heart of Little Explorers' engagement model. It provides:
 * 
 * - Real-time positive reinforcement through point awards
 * - AI-powered behaviour suggestions to reduce teacher cognitive load
 * - Comprehensive analytics and insights
 * - Celebration and milestone tracking
 * - Integration with parent notifications
 * 
 * ## AI Integration
 * 
 * This service is deeply integrated with the AI Engine to:
 * 
 * 1. **Suggest points automatically** based on teacher observations
 * 2. **Detect behaviour patterns** across students and time
 * 3. **Generate insights** for teachers and parents
 * 4. **Predict students** who may need additional support
 * 5. **Create personalized** celebration messages
 * 
 * ## Design Philosophy
 * 
 * The service follows a "positive by default" approach:
 * - Focus on recognizing positive behaviours
 * - Constructive points (negative) are optional and teacher-controlled
 * - Every student should receive recognition regularly
 * - AI helps ensure equitable distribution of attention
 * 
 * @module LittleExplorers/Services/Behaviour
 * @version 1.0.0
 */

import {
  Result, success, failure,
  ValidationError, NotFoundError, LittleExplorersError,
  Student, Classroom, Teacher,
  generateId, Validator, DateRange,
  Paginated, PaginationOptions
} from '../types';

import {
  ExplorerPoint, GroupAward,
  BehaviourSkill, SkillCategory, DEFAULT_BEHAVIOUR_SKILLS,
  AIPointSuggestion,
  StudentBehaviourAnalytics, ClassroomBehaviourAnalytics,
  StudentBehaviourInsights, ClassroomBehaviourInsights,
  Celebration, BehaviourStreak,
  ExplorerPointRepository, BehaviourSkillRepository,
  AIPointSuggestionRepository, CelebrationRepository, BehaviourStreakRepository,
  AwardPointInput, AwardPointOutput,
  GetPointsInput, GenerateAISuggestionsInput,
  PointContext, PointReaction
} from '../types/behaviour.types';

import {
  LittleExplorersBaseService,
  ServiceDependencies,
  EventBus
} from '../infrastructure';

import {
  LittleExplorersAIService,
  createAIService
} from '../ai/ai-service';

import {
  AIContext,
  BehaviourSuggestionInput,
  StudentInsightInput,
  ClassroomInsightInput
} from '../types/ai.types';

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface BehaviourServiceDependencies extends ServiceDependencies {
  pointRepository: ExplorerPointRepository;
  skillRepository: BehaviourSkillRepository;
  suggestionRepository: AIPointSuggestionRepository;
  celebrationRepository: CelebrationRepository;
  streakRepository: BehaviourStreakRepository;
  aiService: LittleExplorersAIService;
  
  // Cross-service integrations
  getStudent: (tenantId: string, studentId: string) => Promise<Student | null>;
  getClassroom: (tenantId: string, classroomId: string) => Promise<Classroom | null>;
  getTeacher: (tenantId: string, teacherId: string) => Promise<Teacher | null>;
  notifyParents: (studentId: string, notification: ParentNotification) => Promise<void>;
}

export interface ParentNotification {
  type: 'point_awarded' | 'celebration' | 'weekly_summary';
  title: string;
  body: string;
  data: Record<string, string>;
}

// ============================================================================
// BEHAVIOUR SERVICE
// ============================================================================

export class BehaviourService extends LittleExplorersBaseService {
  private readonly pointRepo: ExplorerPointRepository;
  private readonly skillRepo: BehaviourSkillRepository;
  private readonly suggestionRepo: AIPointSuggestionRepository;
  private readonly celebrationRepo: CelebrationRepository;
  private readonly streakRepo: BehaviourStreakRepository;
  private readonly aiService: LittleExplorersAIService;
  
  private readonly getStudent: BehaviourServiceDependencies['getStudent'];
  private readonly getClassroom: BehaviourServiceDependencies['getClassroom'];
  private readonly getTeacher: BehaviourServiceDependencies['getTeacher'];
  private readonly notifyParents: BehaviourServiceDependencies['notifyParents'];

  constructor(deps: BehaviourServiceDependencies) {
    super('BehaviourService', deps);
    this.pointRepo = deps.pointRepository;
    this.skillRepo = deps.skillRepository;
    this.suggestionRepo = deps.suggestionRepository;
    this.celebrationRepo = deps.celebrationRepository;
    this.streakRepo = deps.streakRepository;
    this.aiService = deps.aiService;
    
    this.getStudent = deps.getStudent;
    this.getClassroom = deps.getClassroom;
    this.getTeacher = deps.getTeacher;
    this.notifyParents = deps.notifyParents;
  }

  // ===========================================================================
  // POINT AWARDING
  // ===========================================================================

  /**
   * Award points to one or more students
   */
  async awardPoints(input: AwardPointInput): Promise<Result<AwardPointOutput>> {
    try {
      this.validateTenantId(input.tenantId);
      this.validateEntityId(input.classroomId, 'classroom');
      this.validateEntityId(input.awardedBy, 'teacher');
      Validator.arrayNotEmpty(input.studentIds, 'studentIds');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('awardPoints', input.tenantId, async () => {
      const skill = await this.skillRepo.findById(input.tenantId, input.skillId);
      if (!skill) throw new NotFoundError('BehaviourSkill', input.skillId);

      const teacher = await this.getTeacher(input.tenantId, input.awardedBy);
      if (!teacher) throw new NotFoundError('Teacher', input.awardedBy);

      const pointsToAward = input.points ?? skill.defaultPoints;
      
      if (pointsToAward < skill.minPoints || pointsToAward > skill.maxPoints) {
        throw new ValidationError(`Points must be between ${skill.minPoints} and ${skill.maxPoints}`);
      }

      const points: ExplorerPoint[] = [];
      const celebrationsTriggered: Celebration[] = [];
      const streaksUpdated: { studentId: string; newStreak: number }[] = [];
      const parentNotifications: { studentId: string; parentIds: string[] }[] = [];

      for (const studentId of input.studentIds) {
        const student = await this.getStudent(input.tenantId, studentId);
        if (!student) {
          this.logger.warn(`Student not found: ${studentId}`);
          continue;
        }

        const point: ExplorerPoint = {
          id: this.generateId('pt'),
          tenantId: input.tenantId,
          schoolId: input.schoolId,
          classroomId: input.classroomId,
          studentId,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          skillId: skill.id,
          skillName: skill.name,
          skillEmoji: skill.emoji,
          points: pointsToAward,
          isPositive: skill.isPositive,
          context: input.description || input.tags ? {
            description: input.description,
            linkedActivityId: input.linkedActivityId,
            linkedPortfolioItemId: input.linkedPortfolioItemId,
            tags: input.tags || []
          } : undefined,
          aiGenerated: !!input.fromAISuggestion,
          aiSuggestionId: input.fromAISuggestion,
          awardedBy: input.awardedBy,
          awardedByName: `${teacher.firstName} ${teacher.lastName}`.trim(),
          awardedByRole: 'teacher',
          location: input.location,
          customLocation: input.customLocation,
          parentNotified: false,
          parentViewed: false,
          reactions: [],
          awardedAt: new Date(),
          createdAt: new Date()
        };

        const savedPoint = await this.pointRepo.create(point);
        points.push(savedPoint);

        await this.skillRepo.incrementUsage(input.tenantId, skill.id);

        const celebrations = await this.checkCelebrations(
          input.tenantId, studentId, student.firstName, input.schoolId, input.classroomId, pointsToAward
        );
        celebrationsTriggered.push(...celebrations);

        const streakUpdate = await this.updateStreak(input.tenantId, studentId, input.classroomId, skill.isPositive);
        if (streakUpdate) {
          streaksUpdated.push({ studentId, newStreak: streakUpdate.currentStreak });
        }

        if (skill.isPositive) {
          await this.queueParentNotification(savedPoint, student, skill);
          parentNotifications.push({ studentId, parentIds: student.familyConnections.map(fc => fc.userId) });
        }
      }

      let groupAward: GroupAward | undefined;
      if (input.studentIds.length > 1) {
        groupAward = this.createGroupAwardRecord(input, points, skill, teacher);
      }

      if (input.fromAISuggestion) {
        await this.suggestionRepo.updateStatus(input.tenantId, input.fromAISuggestion, 'accepted', {
          acceptedBy: input.awardedBy
        });
      }

      await this.publishEvent('behaviour.points_awarded', input.tenantId, {
        pointIds: points.map(p => p.id),
        studentIds: input.studentIds,
        skillId: skill.id,
        totalPoints: points.reduce((sum, p) => sum + p.points, 0),
        awardedBy: input.awardedBy,
        fromAISuggestion: !!input.fromAISuggestion
      });

      await this.invalidateCache(input.tenantId, `classroom:${input.classroomId}:stats`);
      for (const studentId of input.studentIds) {
        await this.invalidateCache(input.tenantId, `student:${studentId}:behaviour`);
      }

      return { points, groupAward, celebrationsTriggered, streaksUpdated, parentNotifications };
    }, { studentCount: input.studentIds.length, skillId: input.skillId });
  }

  /**
   * Quick award - simplified single point for rapid teacher use
   */
  async quickAward(
    tenantId: string, classroomId: string, studentId: string, skillId: string, awardedBy: string
  ): Promise<Result<ExplorerPoint>> {
    const classroom = await this.getClassroom(tenantId, classroomId);
    const result = await this.awardPoints({
      tenantId,
      schoolId: classroom?.schoolId || '',
      classroomId,
      awardedBy,
      studentIds: [studentId],
      skillId
    });

    if (!result.success) return failure(result.error);
    return success(result.data.points[0]);
  }

  /**
   * Award points to a table group
   */
  async awardGroupPoints(
    tenantId: string, classroomId: string, groupId: string, skillId: string, awardedBy: string, reason?: string
  ): Promise<Result<AwardPointOutput>> {
    const classroom = await this.getClassroom(tenantId, classroomId);
    if (!classroom) return failure(new NotFoundError('Classroom', classroomId));

    const group = classroom.settings.tableGroups.find(g => g.id === groupId);
    if (!group) return failure(new NotFoundError('TableGroup', groupId));

    return this.awardPoints({
      tenantId,
      schoolId: classroom.schoolId,
      classroomId,
      awardedBy,
      studentIds: group.memberIds,
      skillId,
      description: reason || `${group.name} group award`
    });
  }

  /**
   * Award points to whole class
   */
  async awardWholeClass(
    tenantId: string, classroomId: string, skillId: string, awardedBy: string, reason?: string
  ): Promise<Result<AwardPointOutput>> {
    const classroom = await this.getClassroom(tenantId, classroomId);
    if (!classroom) return failure(new NotFoundError('Classroom', classroomId));

    const studentIds = classroom.students.filter(s => s.status === 'enrolled').map(s => s.studentId);

    return this.awardPoints({
      tenantId,
      schoolId: classroom.schoolId,
      classroomId,
      awardedBy,
      studentIds,
      skillId,
      description: reason || 'Whole class award'
    });
  }

  // ===========================================================================
  // AI SUGGESTIONS
  // ===========================================================================

  /**
   * Generate AI suggestions for point awards
   */
  async generateAISuggestions(input: GenerateAISuggestionsInput): Promise<Result<AIPointSuggestion[]>> {
    try {
      this.validateTenantId(input.tenantId);
      this.validateEntityId(input.classroomId, 'classroom');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateAISuggestions', input.tenantId, async () => {
      const classroom = await this.getClassroom(input.tenantId, input.classroomId);
      if (!classroom) throw new NotFoundError('Classroom', input.classroomId);

      const skills = await this.skillRepo.findByClassroom(input.tenantId, input.classroomId, true);

      const recentPoints = await this.pointRepo.findByClassroom(input.tenantId, input.classroomId, {
        dateRange: { start: this.addDays(new Date(), -7), end: new Date() },
        limit: 100
      });

      const aiContext: AIContext = {
        school: {
          id: classroom.schoolId,
          name: classroom.name,
          type: 'primary_school',
          jurisdiction: 'AU_NSW'
        },
        classroom: {
          id: classroom.id,
          name: classroom.name,
          grade: classroom.grade,
          studentCount: classroom.students.filter(s => s.status === 'enrolled').length,
          teacherNames: [],
          currentTheme: classroom.theme.name
        },
        timeContext: this.buildTimeContext()
      };

      const aiInput: BehaviourSuggestionInput = {
        tenantId: input.tenantId,
        classroomId: input.classroomId,
        trigger: input.trigger === 'manual' ? 'manual_request' : input.trigger,
        context: aiContext,
        observation: input.observationText ? {
          text: input.observationText,
          studentIds: input.studentIds
        } : undefined,
        recentPoints: recentPoints.map(p => ({
          studentId: p.studentId,
          skillId: p.skillId,
          timestamp: p.awardedAt
        })),
        availableSkills: skills
      };

      const aiOutput = await this.aiService.generateBehaviourSuggestions(aiInput);

      const savedSuggestions: AIPointSuggestion[] = [];
      for (const suggestion of aiOutput.suggestions) {
        const saved = await this.suggestionRepo.create(suggestion);
        savedSuggestions.push(saved);
      }

      if (aiOutput.patterns?.length) {
        this.logger.info('AI detected behaviour patterns', {
          tenantId: input.tenantId,
          classroomId: input.classroomId,
          patterns: aiOutput.patterns
        });
      }

      await this.publishEvent('behaviour.ai_suggestions_generated', input.tenantId, {
        classroomId: input.classroomId,
        trigger: input.trigger,
        suggestionCount: savedSuggestions.length
      });

      return savedSuggestions;
    }, { trigger: input.trigger, classroomId: input.classroomId });
  }

  /**
   * Get pending AI suggestions
   */
  async getPendingSuggestions(tenantId: string, classroomId: string): Promise<Result<AIPointSuggestion[]>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(classroomId, 'classroom');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getPendingSuggestions', tenantId, async () => {
      await this.suggestionRepo.expireOld(tenantId, new Date(Date.now() - 60 * 60 * 1000));
      return this.suggestionRepo.findPendingByClassroom(tenantId, classroomId);
    }, { classroomId });
  }

  /**
   * Accept an AI suggestion
   */
  async acceptSuggestion(
    tenantId: string, suggestionId: string, acceptedBy: string,
    modifications?: { studentIds?: string[]; skillId?: string; points?: number }
  ): Promise<Result<AwardPointOutput>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(suggestionId, 'suggestion');
      this.validateEntityId(acceptedBy, 'teacher');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('acceptSuggestion', tenantId, async () => {
      const suggestion = await this.suggestionRepo.findById(tenantId, suggestionId);
      if (!suggestion) throw new NotFoundError('AIPointSuggestion', suggestionId);
      if (suggestion.status !== 'pending') throw new ValidationError('Suggestion is no longer pending');

      const studentIds = modifications?.studentIds || suggestion.suggestedStudentIds;
      const skillId = modifications?.skillId || suggestion.suggestedSkillId;

      const result = await this.awardPoints({
        tenantId,
        schoolId: suggestion.schoolId,
        classroomId: suggestion.classroomId,
        awardedBy: acceptedBy,
        studentIds,
        skillId,
        points: modifications?.points,
        fromAISuggestion: suggestionId,
        description: `AI suggested: ${suggestion.reasoning}`
      });

      if (!result.success) throw result.error;

      const hasModifications = modifications && (modifications.studentIds || modifications.skillId || modifications.points);
      await this.suggestionRepo.updateStatus(tenantId, suggestionId, hasModifications ? 'modified' : 'accepted', {
        acceptedBy,
        modifiedAward: hasModifications ? { studentIds, skillId, points: modifications?.points || suggestion.suggestedPoints } : undefined
      });

      return result.data;
    }, { suggestionId });
  }

  /**
   * Reject an AI suggestion
   */
  async rejectSuggestion(tenantId: string, suggestionId: string, rejectedBy: string, reason?: string): Promise<Result<void>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(suggestionId, 'suggestion');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('rejectSuggestion', tenantId, async () => {
      const suggestion = await this.suggestionRepo.findById(tenantId, suggestionId);
      if (!suggestion) throw new NotFoundError('AIPointSuggestion', suggestionId);

      await this.suggestionRepo.updateStatus(tenantId, suggestionId, 'rejected', { rejectionReason: reason });

      await this.publishEvent('behaviour.ai_suggestion_rejected', tenantId, {
        suggestionId,
        skillId: suggestion.suggestedSkillId,
        reason,
        rejectedBy
      });
    }, { suggestionId });
  }

  // ===========================================================================
  // ANALYTICS & INSIGHTS
  // ===========================================================================

  /**
   * Get student analytics
   */
  async getStudentAnalytics(tenantId: string, studentId: string, dateRange: DateRange): Promise<Result<StudentBehaviourAnalytics>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(studentId, 'student');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getStudentAnalytics', tenantId, async () => {
      const cacheKey = this.cacheKey(tenantId, 'student', studentId, 'analytics');
      return this.withCache(cacheKey, () => this.pointRepo.getStudentAnalytics(tenantId, studentId, dateRange), 300);
    }, { studentId });
  }

  /**
   * Get classroom analytics
   */
  async getClassroomAnalytics(tenantId: string, classroomId: string, dateRange: DateRange): Promise<Result<ClassroomBehaviourAnalytics>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(classroomId, 'classroom');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getClassroomAnalytics', tenantId, async () => {
      const cacheKey = this.cacheKey(tenantId, 'classroom', classroomId, 'analytics');
      return this.withCache(cacheKey, () => this.pointRepo.getClassroomAnalytics(tenantId, classroomId, dateRange), 300);
    }, { classroomId });
  }

  /**
   * Generate AI insights for a student
   */
  async getStudentInsights(tenantId: string, studentId: string, periodDays: number = 30): Promise<Result<StudentBehaviourInsights>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(studentId, 'student');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getStudentInsights', tenantId, async () => {
      const student = await this.getStudent(tenantId, studentId);
      if (!student) throw new NotFoundError('Student', studentId);
      if (!student.currentClassroomId) throw new ValidationError('Student is not enrolled in a classroom');

      const dateRange: DateRange = { start: this.addDays(new Date(), -periodDays), end: new Date() };
      const points = await this.pointRepo.findByStudent(tenantId, studentId, { dateRange });
      const classroomAnalytics = await this.pointRepo.getClassroomAnalytics(tenantId, student.currentClassroomId, dateRange);

      const aiContext: AIContext = {
        school: { id: '', name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
        student: {
          id: studentId,
          firstName: student.firstName,
          age: this.calculateAge(student.dateOfBirth),
          grade: 'kindergarten' as any,
          learningStyle: student.learningProfile.learningStyle,
          interests: student.learningProfile.interests,
          supportNeeds: student.learningProfile.supportNeeds?.map(n => n.type)
        },
        timeContext: this.buildTimeContext()
      };

      const aiInput: StudentInsightInput = {
        tenantId,
        studentId,
        context: aiContext,
        behaviourHistory: points,
        classAverages: { totalPoints: classroomAnalytics.averagePointsPerStudent, skillBreakdown: {} },
        periodDays
      };

      const aiOutput = await this.aiService.generateStudentInsights(aiInput);
      return aiOutput.insights;
    }, { studentId, periodDays });
  }

  /**
   * Generate AI insights for a classroom
   */
  async getClassroomInsights(tenantId: string, classroomId: string, periodDays: number = 7): Promise<Result<ClassroomBehaviourInsights>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(classroomId, 'classroom');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getClassroomInsights', tenantId, async () => {
      const classroom = await this.getClassroom(tenantId, classroomId);
      if (!classroom) throw new NotFoundError('Classroom', classroomId);

      const dateRange: DateRange = { start: this.addDays(new Date(), -periodDays), end: new Date() };

      const allStudentPoints = new Map<string, ExplorerPoint[]>();
      for (const enrollment of classroom.students.filter(s => s.status === 'enrolled')) {
        const points = await this.pointRepo.findByStudent(tenantId, enrollment.studentId, { dateRange });
        allStudentPoints.set(enrollment.studentId, points);
      }

      const groupData = classroom.settings.tableGroups.map(group => ({
        groupId: group.id,
        groupName: group.name,
        memberIds: group.memberIds,
        totalPoints: group.memberIds.reduce((sum, id) => {
          const pts = allStudentPoints.get(id) || [];
          return sum + pts.reduce((s, p) => s + p.points, 0);
        }, 0)
      }));

      const aiContext: AIContext = {
        school: { id: classroom.schoolId, name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
        classroom: {
          id: classroom.id,
          name: classroom.name,
          grade: classroom.grade,
          studentCount: classroom.students.filter(s => s.status === 'enrolled').length,
          teacherNames: [],
          currentTheme: classroom.theme.name
        },
        timeContext: this.buildTimeContext()
      };

      const aiInput: ClassroomInsightInput = {
        tenantId,
        classroomId,
        context: aiContext,
        allStudentPoints,
        groupData,
        periodDays
      };

      const aiOutput = await this.aiService.generateClassroomInsights(aiInput);
      return aiOutput.insights;
    }, { classroomId, periodDays });
  }

  // ===========================================================================
  // SKILL MANAGEMENT
  // ===========================================================================

  /**
   * Get classroom skills
   */
  async getClassroomSkills(tenantId: string, classroomId: string, activeOnly: boolean = true): Promise<Result<BehaviourSkill[]>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(classroomId, 'classroom');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getClassroomSkills', tenantId, async () => {
      return this.skillRepo.findByClassroom(tenantId, classroomId, activeOnly);
    }, { classroomId });
  }

  /**
   * Create custom skill
   */
  async createCustomSkill(
    tenantId: string, schoolId: string, classroomId: string, createdBy: string,
    input: { name: string; emoji: string; description: string; category: SkillCategory; defaultPoints: number; isPositive?: boolean }
  ): Promise<Result<BehaviourSkill>> {
    try {
      this.validateTenantId(tenantId);
      Validator.required(input.name, 'name');
      Validator.positiveNumber(input.defaultPoints, 'defaultPoints');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createCustomSkill', tenantId, async () => {
      const existingCustom = (await this.skillRepo.findByClassroom(tenantId, classroomId)).filter(s => s.isCustom);
      if (existingCustom.length >= 10) throw new ValidationError('Maximum custom skills limit reached');

      const skill: Omit<BehaviourSkill, 'id' | 'createdAt' | 'updatedAt'> = {
        tenantId,
        schoolId,
        classroomId,
        name: input.name,
        emoji: input.emoji,
        description: input.description,
        category: input.category,
        isPositive: input.isPositive ?? true,
        defaultPoints: input.defaultPoints,
        minPoints: 1,
        maxPoints: input.defaultPoints * 3,
        ageGroups: [],
        aiConfig: {
          triggerKeywords: input.name.toLowerCase().split(' '),
          observationPhrases: [],
          contextIndicators: [],
          expectedFrequency: 'occasional',
          relatedSkillIds: [],
          autoSuggestConfidence: 0.7
        },
        isActive: true,
        sortOrder: 100 + existingCustom.length,
        usageCount: 0,
        isSystem: false,
        isCustom: true,
        createdBy
      };

      const saved = await this.skillRepo.create(skill);

      await this.publishEvent('behaviour.skill_created', tenantId, {
        skillId: saved.id,
        skillName: saved.name,
        classroomId,
        createdBy
      });

      return saved;
    }, { classroomId, skillName: input.name });
  }

  /**
   * Initialize default skills for school
   */
  async initializeSchoolSkills(tenantId: string, schoolId: string): Promise<Result<BehaviourSkill[]>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(schoolId, 'school');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('initializeSchoolSkills', tenantId, async () => {
      const existing = await this.skillRepo.findBySchool(tenantId, schoolId);
      if (existing.length > 0) {
        this.logger.info('School already has skills', { schoolId, count: existing.length });
        return existing;
      }

      const skills: BehaviourSkill[] = [];
      for (const defaultSkill of DEFAULT_BEHAVIOUR_SKILLS) {
        const skill = await this.skillRepo.create({ ...defaultSkill, tenantId, schoolId, classroomId: undefined });
        skills.push(skill);
      }

      this.logger.info('Initialized default skills', { schoolId, count: skills.length });
      await this.publishEvent('behaviour.skills_initialized', tenantId, { schoolId, skillCount: skills.length });

      return skills;
    }, { schoolId });
  }

  // ===========================================================================
  // CELEBRATIONS & STREAKS
  // ===========================================================================

  async getStudentCelebrations(tenantId: string, studentId: string): Promise<Result<Celebration[]>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(studentId, 'student');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getStudentCelebrations', tenantId, async () => {
      return this.celebrationRepo.findByStudent(tenantId, studentId);
    }, { studentId });
  }

  async getStudentStreak(tenantId: string, studentId: string): Promise<Result<BehaviourStreak | null>> {
    try {
      this.validateTenantId(tenantId);
      this.validateEntityId(studentId, 'student');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getStudentStreak', tenantId, async () => {
      return this.streakRepo.findByStudent(tenantId, studentId);
    }, { studentId });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private createGroupAwardRecord(input: AwardPointInput, points: ExplorerPoint[], skill: BehaviourSkill, teacher: Teacher): GroupAward {
    return {
      id: this.generateId('ga'),
      tenantId: input.tenantId,
      schoolId: input.schoolId,
      classroomId: input.classroomId,
      groupType: 'selected_students',
      groupName: `Selected students (${points.length})`,
      studentIds: input.studentIds,
      skillId: skill.id,
      skillName: skill.name,
      skillEmoji: skill.emoji,
      pointsPerStudent: points[0]?.points || skill.defaultPoints,
      totalPoints: points.reduce((sum, p) => sum + p.points, 0),
      isPositive: skill.isPositive,
      reason: input.description,
      context: input.description || input.tags ? { description: input.description, tags: input.tags || [] } : undefined,
      aiGenerated: !!input.fromAISuggestion,
      aiSuggestionId: input.fromAISuggestion,
      awardedBy: input.awardedBy,
      awardedByName: `${teacher.firstName} ${teacher.lastName}`,
      awardedAt: new Date(),
      createdAt: new Date()
    };
  }

  private async checkCelebrations(
    tenantId: string, studentId: string, studentName: string, schoolId: string, classroomId: string, newPoints: number
  ): Promise<Celebration[]> {
    const celebrations: Celebration[] = [];
    const totalPoints = await this.pointRepo.sumByStudent(tenantId, studentId);
    const previousTotal = totalPoints - newPoints;

    const milestones = [10, 25, 50, 100, 150, 200, 250, 500, 1000];
    
    for (const milestone of milestones) {
      if (previousTotal < milestone && totalPoints >= milestone) {
        const celebration: Celebration = {
          id: this.generateId('cel'),
          tenantId, schoolId, classroomId, studentId,
          milestoneType: 'points_threshold',
          milestoneValue: milestone,
          milestoneName: `${milestone} Points Champion`,
          title: `🎉 ${milestone} Points!`,
          message: `Amazing ${studentName}! You've earned ${milestone} Explorer Points!`,
          emoji: '🏆',
          animationType: milestone >= 100 ? 'fireworks' : 'confetti',
          certificateGenerated: milestone >= 50,
          parentNotified: false,
          classAnnounced: false,
          achievedAt: new Date(),
          createdAt: new Date()
        };

        const saved = await this.celebrationRepo.create(celebration);
        celebrations.push(saved);
      }
    }

    return celebrations;
  }

  private async updateStreak(tenantId: string, studentId: string, classroomId: string, isPositive: boolean): Promise<BehaviourStreak | null> {
    if (!isPositive) return null;

    let streak = await this.streakRepo.findByStudent(tenantId, studentId);
    const today = this.startOfDay(new Date());
    
    if (!streak) {
      streak = {
        studentId,
        classroomId,
        currentStreak: 1,
        currentStreakStart: today,
        longestStreak: 1,
        longestStreakStart: today,
        longestStreakEnd: today,
        streakType: 'daily_positive',
        lastPointDate: new Date(),
        milestonesAchieved: []
      };
    } else {
      const lastPointDay = this.startOfDay(streak.lastPointDate);
      const daysDiff = Math.floor((today.getTime() - lastPointDay.getTime()) / (24 * 60 * 60 * 1000));

      if (daysDiff === 0) {
        streak.lastPointDate = new Date();
      } else if (daysDiff === 1) {
        streak.currentStreak++;
        streak.lastPointDate = new Date();
        if (streak.currentStreak > streak.longestStreak) {
          streak.longestStreak = streak.currentStreak;
          streak.longestStreakEnd = today;
        }
      } else {
        streak.currentStreak = 1;
        streak.currentStreakStart = today;
        streak.lastPointDate = new Date();
      }
    }

    return this.streakRepo.upsert(streak);
  }

  private async queueParentNotification(point: ExplorerPoint, student: Student, skill: BehaviourSkill): Promise<void> {
    const notification: ParentNotification = {
      type: 'point_awarded',
      title: `${skill.emoji} ${student.firstName} earned a point!`,
      body: `${skill.name}: ${point.context?.description || skill.description}`,
      data: { pointId: point.id, studentId: student.id, skillId: skill.id }
    };

    try {
      await this.notifyParents(student.id, notification);
      await this.pointRepo.markParentNotified(point.tenantId, point.id);
    } catch (error) {
      this.logger.error('Failed to notify parents', error as Error, { pointId: point.id, studentId: student.id });
    }
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

export function createBehaviourService(deps: BehaviourServiceDependencies): BehaviourService {
  return new BehaviourService(deps);
}
