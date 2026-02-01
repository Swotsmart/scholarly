/**
 * Little Explorers - Behaviour Service
 *
 * Manages the Explorer Points system for early years education (ages 3-7).
 * Provides real-time positive reinforcement, AI-powered behaviour suggestions,
 * comprehensive analytics, and celebration/milestone tracking.
 *
 * Features:
 * - Point awarding (individual, group, whole class)
 * - AI-powered behaviour suggestions
 * - Student and classroom analytics/insights
 * - Skill management (default + custom)
 * - Celebration and streak tracking
 * - Parent notifications
 *
 * @module LittleExplorers/Behaviour
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
  LittleExplorersExplorerPoint,
  LittleExplorersGroupAward,
  LittleExplorersBehaviourSkill,
  LittleExplorersSkillCategory,
  LittleExplorersAIPointSuggestion,
  LittleExplorersStudentBehaviourAnalytics,
  LittleExplorersClassroomBehaviourAnalytics,
  LittleExplorersStudentBehaviourInsights,
  LittleExplorersClassroomBehaviourInsights,
  LittleExplorersCelebration,
  LittleExplorersBehaviourStreak,
  LittleExplorersAIContext,
  LittleExplorersAgeGroup,
  LITTLE_EXPLORERS_DEFAULT_SKILLS,
  generateLittleExplorersId,
} from './little-explorers-types';
import {
  LittleExplorersAIService,
  getLittleExplorersAIService,
} from './little-explorers-ai.service';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface LittleExplorersExplorerPointRepository {
  create(point: LittleExplorersExplorerPoint): Promise<LittleExplorersExplorerPoint>;
  findById(tenantId: string, id: string): Promise<LittleExplorersExplorerPoint | null>;
  findByStudent(
    tenantId: string,
    studentId: string,
    options?: { dateRange?: { start: Date; end: Date }; limit?: number }
  ): Promise<LittleExplorersExplorerPoint[]>;
  findByClassroom(
    tenantId: string,
    classroomId: string,
    options?: { dateRange?: { start: Date; end: Date }; limit?: number }
  ): Promise<LittleExplorersExplorerPoint[]>;
  sumByStudent(tenantId: string, studentId: string): Promise<number>;
  getStudentAnalytics(
    tenantId: string,
    studentId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<LittleExplorersStudentBehaviourAnalytics>;
  getClassroomAnalytics(
    tenantId: string,
    classroomId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<LittleExplorersClassroomBehaviourAnalytics>;
  markParentNotified(tenantId: string, pointId: string): Promise<void>;
}

export interface LittleExplorersBehaviourSkillRepository {
  create(
    skill: Omit<LittleExplorersBehaviourSkill, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LittleExplorersBehaviourSkill>;
  findById(tenantId: string, id: string): Promise<LittleExplorersBehaviourSkill | null>;
  findByClassroom(
    tenantId: string,
    classroomId: string,
    activeOnly?: boolean
  ): Promise<LittleExplorersBehaviourSkill[]>;
  findBySchool(tenantId: string, schoolId: string): Promise<LittleExplorersBehaviourSkill[]>;
  incrementUsage(tenantId: string, skillId: string): Promise<void>;
}

export interface LittleExplorersAIPointSuggestionRepository {
  create(suggestion: LittleExplorersAIPointSuggestion): Promise<LittleExplorersAIPointSuggestion>;
  findById(tenantId: string, id: string): Promise<LittleExplorersAIPointSuggestion | null>;
  findPendingByClassroom(
    tenantId: string,
    classroomId: string
  ): Promise<LittleExplorersAIPointSuggestion[]>;
  updateStatus(
    tenantId: string,
    id: string,
    status: LittleExplorersAIPointSuggestion['status'],
    details?: Partial<LittleExplorersAIPointSuggestion>
  ): Promise<void>;
  expireOld(tenantId: string, before: Date): Promise<number>;
}

export interface LittleExplorersCelebrationRepository {
  create(celebration: LittleExplorersCelebration): Promise<LittleExplorersCelebration>;
  findByStudent(tenantId: string, studentId: string): Promise<LittleExplorersCelebration[]>;
}

export interface LittleExplorersBehaviourStreakRepository {
  findByStudent(tenantId: string, studentId: string): Promise<LittleExplorersBehaviourStreak | null>;
  upsert(streak: LittleExplorersBehaviourStreak): Promise<LittleExplorersBehaviourStreak>;
}

// ============================================================================
// SERVICE INPUT/OUTPUT TYPES
// ============================================================================

export interface LittleExplorersBehaviourServiceDependencies extends ServiceDependencies {
  pointRepository: LittleExplorersExplorerPointRepository;
  skillRepository: LittleExplorersBehaviourSkillRepository;
  suggestionRepository: LittleExplorersAIPointSuggestionRepository;
  celebrationRepository: LittleExplorersCelebrationRepository;
  streakRepository: LittleExplorersBehaviourStreakRepository;
  aiService?: LittleExplorersAIService;
  getStudent: (tenantId: string, studentId: string) => Promise<LittleExplorersStudent | null>;
  getClassroom: (tenantId: string, classroomId: string) => Promise<LittleExplorersClassroom | null>;
  getTeacher: (tenantId: string, teacherId: string) => Promise<LittleExplorersTeacher | null>;
  notifyParents: (studentId: string, notification: LittleExplorersParentNotification) => Promise<void>;
}

export interface LittleExplorersParentNotification {
  type: 'point_awarded' | 'celebration' | 'weekly_summary';
  title: string;
  body: string;
  data: Record<string, string>;
}

export interface LittleExplorersAwardPointInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  awardedBy: string;
  studentIds: string[];
  skillId: string;
  points?: number;
  description?: string;
  tags?: string[];
  linkedActivityId?: string;
  linkedPortfolioItemId?: string;
  location?: LittleExplorersExplorerPoint['location'];
  customLocation?: string;
  fromAISuggestion?: string;
}

export interface LittleExplorersAwardPointOutput {
  points: LittleExplorersExplorerPoint[];
  groupAward?: LittleExplorersGroupAward;
  celebrationsTriggered: LittleExplorersCelebration[];
  streaksUpdated: { studentId: string; newStreak: number }[];
  parentNotifications: { studentId: string; parentIds: string[] }[];
}

export interface LittleExplorersGenerateAISuggestionsInput {
  tenantId: string;
  classroomId: string;
  trigger: 'teacher_observation' | 'pattern_detection' | 'manual';
  observationText?: string;
  studentIds?: string[];
}

// ============================================================================
// LITTLE EXPLORERS BEHAVIOUR SERVICE
// ============================================================================

export class LittleExplorersBehaviourService extends ScholarlyBaseService {
  private readonly pointRepo: LittleExplorersExplorerPointRepository;
  private readonly skillRepo: LittleExplorersBehaviourSkillRepository;
  private readonly suggestionRepo: LittleExplorersAIPointSuggestionRepository;
  private readonly celebrationRepo: LittleExplorersCelebrationRepository;
  private readonly streakRepo: LittleExplorersBehaviourStreakRepository;
  private readonly aiService: LittleExplorersAIService;
  private readonly getStudent: LittleExplorersBehaviourServiceDependencies['getStudent'];
  private readonly getClassroom: LittleExplorersBehaviourServiceDependencies['getClassroom'];
  private readonly getTeacher: LittleExplorersBehaviourServiceDependencies['getTeacher'];
  private readonly notifyParents: LittleExplorersBehaviourServiceDependencies['notifyParents'];

  constructor(deps: LittleExplorersBehaviourServiceDependencies) {
    super('LittleExplorersBehaviourService', deps);
    this.pointRepo = deps.pointRepository;
    this.skillRepo = deps.skillRepository;
    this.suggestionRepo = deps.suggestionRepository;
    this.celebrationRepo = deps.celebrationRepository;
    this.streakRepo = deps.streakRepository;
    this.aiService = deps.aiService || getLittleExplorersAIService();
    this.getStudent = deps.getStudent;
    this.getClassroom = deps.getClassroom;
    this.getTeacher = deps.getTeacher;
    this.notifyParents = deps.notifyParents;
  }

  // ===========================================================================
  // POINT AWARDING
  // ===========================================================================

  async awardPoints(input: LittleExplorersAwardPointInput): Promise<Result<LittleExplorersAwardPointOutput>> {
    const validation = this.validateRequired(input, [
      'tenantId',
      'schoolId',
      'classroomId',
      'awardedBy',
      'studentIds',
      'skillId',
    ]);
    if (isFailure(validation)) return failure(validation.error);

    if (!Validator.isArray(input.studentIds) || input.studentIds.length === 0) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentIds must be a non-empty array' });
    }

    return this.withTiming('awardPoints', async () => {
      const skill = await this.skillRepo.findById(input.tenantId, input.skillId);
      if (!skill) {
        return failure(new NotFoundError('BehaviourSkill', input.skillId));
      }

      const teacher = await this.getTeacher(input.tenantId, input.awardedBy);
      if (!teacher) {
        return failure(new NotFoundError('Teacher', input.awardedBy));
      }

      const pointsToAward = input.points ?? skill.defaultPoints;

      if (pointsToAward < skill.minPoints || pointsToAward > skill.maxPoints) {
        return failure(
          new ValidationError(`Points must be between ${skill.minPoints} and ${skill.maxPoints}`)
        );
      }

      const points: LittleExplorersExplorerPoint[] = [];
      const celebrationsTriggered: LittleExplorersCelebration[] = [];
      const streaksUpdated: { studentId: string; newStreak: number }[] = [];
      const parentNotifications: { studentId: string; parentIds: string[] }[] = [];

      for (const studentId of input.studentIds) {
        const student = await this.getStudent(input.tenantId, studentId);
        if (!student) {
          log.warn('Student not found during point award', { studentId });
          continue;
        }

        const point: LittleExplorersExplorerPoint = {
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
          context:
            input.description || input.tags
              ? {
                  description: input.description,
                  linkedActivityId: input.linkedActivityId,
                  linkedPortfolioItemId: input.linkedPortfolioItemId,
                  tags: input.tags || [],
                }
              : undefined,
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
          createdAt: new Date(),
        };

        const savedPoint = await this.pointRepo.create(point);
        points.push(savedPoint);

        await this.skillRepo.incrementUsage(input.tenantId, skill.id);

        const celebrations = await this.checkCelebrations(
          input.tenantId,
          studentId,
          student.firstName,
          input.schoolId,
          input.classroomId,
          pointsToAward
        );
        celebrationsTriggered.push(...celebrations);

        const streakUpdate = await this.updateStreak(
          input.tenantId,
          studentId,
          input.classroomId,
          skill.isPositive
        );
        if (streakUpdate) {
          streaksUpdated.push({ studentId, newStreak: streakUpdate.currentStreak });
        }

        if (skill.isPositive) {
          await this.queueParentNotification(savedPoint, student, skill);
          parentNotifications.push({
            studentId,
            parentIds: student.familyConnections.map((fc) => fc.userId),
          });
        }
      }

      let groupAward: LittleExplorersGroupAward | undefined;
      if (input.studentIds.length > 1) {
        groupAward = this.createGroupAwardRecord(input, points, skill, teacher);
      }

      if (input.fromAISuggestion) {
        await this.suggestionRepo.updateStatus(input.tenantId, input.fromAISuggestion, 'accepted', {
          acceptedBy: input.awardedBy,
        });
      }

      await this.publishEvent('behaviour.points_awarded', input.tenantId, {
        pointIds: points.map((p) => p.id),
        studentIds: input.studentIds,
        skillId: skill.id,
        totalPoints: points.reduce((sum, p) => sum + p.points, 0),
        awardedBy: input.awardedBy,
        fromAISuggestion: !!input.fromAISuggestion,
      });

      return success({ points, groupAward, celebrationsTriggered, streaksUpdated, parentNotifications });
    });
  }

  /**
   * Quick award - simplified single point for rapid teacher use
   */
  async quickAward(
    tenantId: string,
    classroomId: string,
    studentId: string,
    skillId: string,
    awardedBy: string
  ): Promise<Result<LittleExplorersExplorerPoint>> {
    const classroom = await this.getClassroom(tenantId, classroomId);
    const result = await this.awardPoints({
      tenantId,
      schoolId: classroom?.schoolId || '',
      classroomId,
      awardedBy,
      studentIds: [studentId],
      skillId,
    });

    if (isFailure(result)) return failure(result.error);
    return success(result.data.points[0]);
  }

  /**
   * Award points to a table group
   */
  async awardGroupPoints(
    tenantId: string,
    classroomId: string,
    groupId: string,
    skillId: string,
    awardedBy: string,
    reason?: string
  ): Promise<Result<LittleExplorersAwardPointOutput>> {
    const classroom = await this.getClassroom(tenantId, classroomId);
    if (!classroom) {
      return failure(new NotFoundError('Classroom', classroomId));
    }

    const group = classroom.settings.tableGroups.find((g) => g.id === groupId);
    if (!group) {
      return failure(new NotFoundError('TableGroup', groupId));
    }

    return this.awardPoints({
      tenantId,
      schoolId: classroom.schoolId,
      classroomId,
      awardedBy,
      studentIds: group.memberIds,
      skillId,
      description: reason || `${group.name} group award`,
    });
  }

  /**
   * Award points to whole class
   */
  async awardWholeClass(
    tenantId: string,
    classroomId: string,
    skillId: string,
    awardedBy: string,
    reason?: string
  ): Promise<Result<LittleExplorersAwardPointOutput>> {
    const classroom = await this.getClassroom(tenantId, classroomId);
    if (!classroom) {
      return failure(new NotFoundError('Classroom', classroomId));
    }

    const studentIds = classroom.students.filter((s) => s.status === 'enrolled').map((s) => s.studentId);

    return this.awardPoints({
      tenantId,
      schoolId: classroom.schoolId,
      classroomId,
      awardedBy,
      studentIds,
      skillId,
      description: reason || 'Whole class award',
    });
  }

  // ===========================================================================
  // AI SUGGESTIONS
  // ===========================================================================

  async generateAISuggestions(
    input: LittleExplorersGenerateAISuggestionsInput
  ): Promise<Result<LittleExplorersAIPointSuggestion[]>> {
    const validation = this.validateRequired(input, ['tenantId', 'classroomId', 'trigger']);
    if (isFailure(validation)) return failure(validation.error);

    return this.withTiming('generateAISuggestions', async () => {
      const classroom = await this.getClassroom(input.tenantId, input.classroomId);
      if (!classroom) {
        return failure(new NotFoundError('Classroom', input.classroomId));
      }

      const skills = await this.skillRepo.findByClassroom(input.tenantId, input.classroomId, true);

      const recentPoints = await this.pointRepo.findByClassroom(input.tenantId, input.classroomId, {
        dateRange: { start: this.addDays(new Date(), -7), end: new Date() },
        limit: 100,
      });

      const aiContext: LittleExplorersAIContext = {
        school: {
          id: classroom.schoolId,
          name: classroom.name,
          type: 'primary_school',
          jurisdiction: 'AU_NSW',
        },
        classroom: {
          id: classroom.id,
          name: classroom.name,
          grade: classroom.grade,
          studentCount: classroom.students.filter((s) => s.status === 'enrolled').length,
          teacherNames: [],
          currentTheme: classroom.theme.name,
        },
        timeContext: this.buildTimeContext(),
      };

      const aiResult = await this.aiService.generateBehaviourSuggestions({
        tenantId: input.tenantId,
        classroomId: input.classroomId,
        trigger: input.trigger === 'manual' ? 'manual_request' : input.trigger,
        context: aiContext,
        observation: input.observationText
          ? {
              text: input.observationText,
              studentIds: input.studentIds,
            }
          : undefined,
        recentPoints: recentPoints.map((p) => ({
          studentId: p.studentId,
          skillId: p.skillId,
          timestamp: p.awardedAt,
        })),
        availableSkills: skills,
      });

      if (isFailure(aiResult)) return failure(aiResult.error);

      const savedSuggestions: LittleExplorersAIPointSuggestion[] = [];
      for (const suggestion of aiResult.data.suggestions) {
        const saved = await this.suggestionRepo.create(suggestion);
        savedSuggestions.push(saved);
      }

      if (aiResult.data.patterns && aiResult.data.patterns.length > 0) {
        log.info('AI detected behaviour patterns', {
          tenantId: input.tenantId,
          classroomId: input.classroomId,
          patterns: aiResult.data.patterns,
        });
      }

      await this.publishEvent('behaviour.ai_suggestions_generated', input.tenantId, {
        classroomId: input.classroomId,
        trigger: input.trigger,
        suggestionCount: savedSuggestions.length,
      });

      return success(savedSuggestions);
    });
  }

  async getPendingSuggestions(
    tenantId: string,
    classroomId: string
  ): Promise<Result<LittleExplorersAIPointSuggestion[]>> {
    return this.withTiming('getPendingSuggestions', async () => {
      await this.suggestionRepo.expireOld(tenantId, new Date(Date.now() - 60 * 60 * 1000));
      const suggestions = await this.suggestionRepo.findPendingByClassroom(tenantId, classroomId);
      return success(suggestions);
    });
  }

  async acceptSuggestion(
    tenantId: string,
    suggestionId: string,
    acceptedBy: string,
    modifications?: { studentIds?: string[]; skillId?: string; points?: number }
  ): Promise<Result<LittleExplorersAwardPointOutput>> {
    return this.withTiming('acceptSuggestion', async () => {
      const suggestion = await this.suggestionRepo.findById(tenantId, suggestionId);
      if (!suggestion) {
        return failure(new NotFoundError('AIPointSuggestion', suggestionId));
      }
      if (suggestion.status !== 'pending') {
        return failure(new ValidationError('Suggestion is no longer pending'));
      }

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
        description: `AI suggested: ${suggestion.reasoning}`,
      });

      if (isFailure(result)) return failure(result.error);

      const hasModifications =
        modifications && (modifications.studentIds || modifications.skillId || modifications.points);
      await this.suggestionRepo.updateStatus(
        tenantId,
        suggestionId,
        hasModifications ? 'modified' : 'accepted',
        {
          acceptedBy,
          modifiedAward: hasModifications
            ? { studentIds, skillId, points: modifications?.points || suggestion.suggestedPoints }
            : undefined,
        }
      );

      return success(result.data);
    });
  }

  async rejectSuggestion(
    tenantId: string,
    suggestionId: string,
    rejectedBy: string,
    reason?: string
  ): Promise<Result<void>> {
    return this.withTiming('rejectSuggestion', async () => {
      const suggestion = await this.suggestionRepo.findById(tenantId, suggestionId);
      if (!suggestion) {
        return failure(new NotFoundError('AIPointSuggestion', suggestionId));
      }

      await this.suggestionRepo.updateStatus(tenantId, suggestionId, 'rejected', {
        rejectionReason: reason,
      });

      await this.publishEvent('behaviour.ai_suggestion_rejected', tenantId, {
        suggestionId,
        skillId: suggestion.suggestedSkillId,
        reason,
        rejectedBy,
      });

      return success(undefined);
    });
  }

  // ===========================================================================
  // ANALYTICS & INSIGHTS
  // ===========================================================================

  async getStudentAnalytics(
    tenantId: string,
    studentId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Result<LittleExplorersStudentBehaviourAnalytics>> {
    return this.withTiming('getStudentAnalytics', async () => {
      const analytics = await this.pointRepo.getStudentAnalytics(tenantId, studentId, dateRange);
      return success(analytics);
    });
  }

  async getClassroomAnalytics(
    tenantId: string,
    classroomId: string,
    dateRange: { start: Date; end: Date }
  ): Promise<Result<LittleExplorersClassroomBehaviourAnalytics>> {
    return this.withTiming('getClassroomAnalytics', async () => {
      const analytics = await this.pointRepo.getClassroomAnalytics(tenantId, classroomId, dateRange);
      return success(analytics);
    });
  }

  async getStudentInsights(
    tenantId: string,
    studentId: string,
    periodDays: number = 30
  ): Promise<Result<LittleExplorersStudentBehaviourInsights>> {
    return this.withTiming('getStudentInsights', async () => {
      const student = await this.getStudent(tenantId, studentId);
      if (!student) {
        return failure(new NotFoundError('Student', studentId));
      }
      if (!student.currentClassroomId) {
        return failure(new ValidationError('Student is not enrolled in a classroom'));
      }

      const dateRange = { start: this.addDays(new Date(), -periodDays), end: new Date() };
      const points = await this.pointRepo.findByStudent(tenantId, studentId, { dateRange });
      const classroomAnalytics = await this.pointRepo.getClassroomAnalytics(
        tenantId,
        student.currentClassroomId,
        dateRange
      );

      const aiContext: LittleExplorersAIContext = {
        school: { id: '', name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
        student: {
          id: studentId,
          firstName: student.firstName,
          age: this.calculateAge(student.dateOfBirth),
          grade: LittleExplorersAgeGroup.KINDERGARTEN,
          learningStyle: student.learningProfile.learningStyle,
          interests: student.learningProfile.interests,
          supportNeeds: student.learningProfile.supportNeeds?.map((n) => n.type),
        },
        timeContext: this.buildTimeContext(),
      };

      const aiResult = await this.aiService.generateStudentInsights({
        tenantId,
        studentId,
        context: aiContext,
        behaviourHistory: points.map((p) => ({
          skillName: p.skillName,
          points: p.points,
          awardedAt: p.awardedAt,
        })),
        classAverages: { totalPoints: classroomAnalytics.averagePointsPerStudent, skillBreakdown: {} },
        periodDays,
      });

      if (isFailure(aiResult)) return failure(aiResult.error);
      return success(aiResult.data.insights);
    });
  }

  async getClassroomInsights(
    tenantId: string,
    classroomId: string,
    periodDays: number = 7
  ): Promise<Result<LittleExplorersClassroomBehaviourInsights>> {
    return this.withTiming('getClassroomInsights', async () => {
      const classroom = await this.getClassroom(tenantId, classroomId);
      if (!classroom) {
        return failure(new NotFoundError('Classroom', classroomId));
      }

      const dateRange = { start: this.addDays(new Date(), -periodDays), end: new Date() };

      const allStudentPoints = new Map<
        string,
        { skillName: string; points: number; awardedAt: Date }[]
      >();
      for (const enrollment of classroom.students.filter((s) => s.status === 'enrolled')) {
        const points = await this.pointRepo.findByStudent(tenantId, enrollment.studentId, { dateRange });
        allStudentPoints.set(
          enrollment.studentId,
          points.map((p) => ({ skillName: p.skillName, points: p.points, awardedAt: p.awardedAt }))
        );
      }

      const groupData = classroom.settings.tableGroups.map((group) => ({
        groupId: group.id,
        groupName: group.name,
        memberIds: group.memberIds,
        totalPoints: group.memberIds.reduce((sum, id) => {
          const pts = allStudentPoints.get(id) || [];
          return sum + pts.reduce((s, p) => s + p.points, 0);
        }, 0),
      }));

      const aiContext: LittleExplorersAIContext = {
        school: { id: classroom.schoolId, name: '', type: 'primary_school', jurisdiction: 'AU_NSW' },
        classroom: {
          id: classroom.id,
          name: classroom.name,
          grade: classroom.grade,
          studentCount: classroom.students.filter((s) => s.status === 'enrolled').length,
          teacherNames: [],
          currentTheme: classroom.theme.name,
        },
        timeContext: this.buildTimeContext(),
      };

      const aiResult = await this.aiService.generateClassroomInsights({
        tenantId,
        classroomId,
        context: aiContext,
        allStudentPoints,
        groupData,
        periodDays,
      });

      if (isFailure(aiResult)) return failure(aiResult.error);
      return success(aiResult.data.insights);
    });
  }

  // ===========================================================================
  // SKILL MANAGEMENT
  // ===========================================================================

  async getClassroomSkills(
    tenantId: string,
    classroomId: string,
    activeOnly: boolean = true
  ): Promise<Result<LittleExplorersBehaviourSkill[]>> {
    return this.withTiming('getClassroomSkills', async () => {
      const skills = await this.skillRepo.findByClassroom(tenantId, classroomId, activeOnly);
      return success(skills);
    });
  }

  async createCustomSkill(
    tenantId: string,
    schoolId: string,
    classroomId: string,
    createdBy: string,
    input: {
      name: string;
      emoji: string;
      description: string;
      category: LittleExplorersSkillCategory;
      defaultPoints: number;
      isPositive?: boolean;
    }
  ): Promise<Result<LittleExplorersBehaviourSkill>> {
    if (!Validator.isNonEmptyString(input.name)) {
      return failure({ code: 'VALIDATION_ERROR', message: 'name is required' });
    }
    if (!Validator.isPositiveNumber(input.defaultPoints)) {
      return failure({ code: 'VALIDATION_ERROR', message: 'defaultPoints must be positive' });
    }

    return this.withTiming('createCustomSkill', async () => {
      const existingCustom = (await this.skillRepo.findByClassroom(tenantId, classroomId)).filter(
        (s) => s.isCustom
      );
      if (existingCustom.length >= 10) {
        return failure(new ValidationError('Maximum custom skills limit reached'));
      }

      const skill = await this.skillRepo.create({
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
          autoSuggestConfidence: 0.7,
        },
        isActive: true,
        sortOrder: 100 + existingCustom.length,
        usageCount: 0,
        isSystem: false,
        isCustom: true,
        createdBy,
      });

      await this.publishEvent('behaviour.skill_created', tenantId, {
        skillId: skill.id,
        skillName: skill.name,
        classroomId,
        createdBy,
      });

      return success(skill);
    });
  }

  async initializeSchoolSkills(
    tenantId: string,
    schoolId: string
  ): Promise<Result<LittleExplorersBehaviourSkill[]>> {
    return this.withTiming('initializeSchoolSkills', async () => {
      const existing = await this.skillRepo.findBySchool(tenantId, schoolId);
      if (existing.length > 0) {
        log.info('School already has skills', { schoolId, count: existing.length });
        return success(existing);
      }

      const skills: LittleExplorersBehaviourSkill[] = [];
      for (const defaultSkill of LITTLE_EXPLORERS_DEFAULT_SKILLS) {
        const skill = await this.skillRepo.create({
          ...defaultSkill,
          tenantId,
          schoolId,
          classroomId: undefined,
        });
        skills.push(skill);
      }

      log.info('Initialized default skills', { schoolId, count: skills.length });
      await this.publishEvent('behaviour.skills_initialized', tenantId, {
        schoolId,
        skillCount: skills.length,
      });

      return success(skills);
    });
  }

  // ===========================================================================
  // CELEBRATIONS & STREAKS
  // ===========================================================================

  async getStudentCelebrations(
    tenantId: string,
    studentId: string
  ): Promise<Result<LittleExplorersCelebration[]>> {
    return this.withTiming('getStudentCelebrations', async () => {
      const celebrations = await this.celebrationRepo.findByStudent(tenantId, studentId);
      return success(celebrations);
    });
  }

  async getStudentStreak(
    tenantId: string,
    studentId: string
  ): Promise<Result<LittleExplorersBehaviourStreak | null>> {
    return this.withTiming('getStudentStreak', async () => {
      const streak = await this.streakRepo.findByStudent(tenantId, studentId);
      return success(streak);
    });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private createGroupAwardRecord(
    input: LittleExplorersAwardPointInput,
    points: LittleExplorersExplorerPoint[],
    skill: LittleExplorersBehaviourSkill,
    teacher: LittleExplorersTeacher
  ): LittleExplorersGroupAward {
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
      context:
        input.description || input.tags
          ? { description: input.description, tags: input.tags || [] }
          : undefined,
      aiGenerated: !!input.fromAISuggestion,
      aiSuggestionId: input.fromAISuggestion,
      awardedBy: input.awardedBy,
      awardedByName: `${teacher.firstName} ${teacher.lastName}`,
      awardedAt: new Date(),
      createdAt: new Date(),
    };
  }

  private async checkCelebrations(
    tenantId: string,
    studentId: string,
    studentName: string,
    schoolId: string,
    classroomId: string,
    newPoints: number
  ): Promise<LittleExplorersCelebration[]> {
    const celebrations: LittleExplorersCelebration[] = [];
    const totalPoints = await this.pointRepo.sumByStudent(tenantId, studentId);
    const previousTotal = totalPoints - newPoints;

    const milestones = [10, 25, 50, 100, 150, 200, 250, 500, 1000];

    for (const milestone of milestones) {
      if (previousTotal < milestone && totalPoints >= milestone) {
        const celebration: LittleExplorersCelebration = {
          id: this.generateId('cel'),
          tenantId,
          schoolId,
          classroomId,
          studentId,
          milestoneType: 'points_threshold',
          milestoneValue: milestone,
          milestoneName: `${milestone} Points Champion`,
          title: `${milestone} Points!`,
          message: `Amazing ${studentName}! You've earned ${milestone} Explorer Points!`,
          emoji: 'trophy',
          animationType: milestone >= 100 ? 'fireworks' : 'confetti',
          certificateGenerated: milestone >= 50,
          parentNotified: false,
          classAnnounced: false,
          achievedAt: new Date(),
          createdAt: new Date(),
        };

        const saved = await this.celebrationRepo.create(celebration);
        celebrations.push(saved);
      }
    }

    return celebrations;
  }

  private async updateStreak(
    tenantId: string,
    studentId: string,
    classroomId: string,
    isPositive: boolean
  ): Promise<LittleExplorersBehaviourStreak | null> {
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
        milestonesAchieved: [],
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

  private async queueParentNotification(
    point: LittleExplorersExplorerPoint,
    student: LittleExplorersStudent,
    skill: LittleExplorersBehaviourSkill
  ): Promise<void> {
    const notification: LittleExplorersParentNotification = {
      type: 'point_awarded',
      title: `${skill.emoji} ${student.firstName} earned a point!`,
      body: `${skill.name}: ${point.context?.description || skill.description}`,
      data: { pointId: point.id, studentId: student.id, skillId: skill.id },
    };

    try {
      await this.notifyParents(student.id, notification);
      await this.pointRepo.markParentNotified(point.tenantId, point.id);
    } catch (error) {
      log.error('Failed to notify parents', error as Error, {
        pointId: point.id,
        studentId: student.id,
      });
    }
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

  private addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  private startOfDay(date: Date): Date {
    const result = new Date(date);
    result.setHours(0, 0, 0, 0);
    return result;
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let littleExplorersBehaviourServiceInstance: LittleExplorersBehaviourService | null = null;

export function initializeLittleExplorersBehaviourService(
  deps: LittleExplorersBehaviourServiceDependencies
): LittleExplorersBehaviourService {
  littleExplorersBehaviourServiceInstance = new LittleExplorersBehaviourService(deps);
  log.info('LittleExplorersBehaviourService initialized');
  return littleExplorersBehaviourServiceInstance;
}

export function getLittleExplorersBehaviourService(): LittleExplorersBehaviourService {
  if (!littleExplorersBehaviourServiceInstance) {
    throw new Error(
      'LittleExplorersBehaviourService not initialized. Call initializeLittleExplorersBehaviourService first.'
    );
  }
  return littleExplorersBehaviourServiceInstance;
}
