/**
 * Little Explorers - Behaviour Service Tests
 * 
 * Comprehensive test suite for the Behaviour Service, covering:
 * - Point awarding (individual, group, whole class)
 * - Skill management
 * - AI suggestions
 * - Celebrations and milestones
 * - Streaks
 * - Analytics
 * 
 * @module LittleExplorers/Tests/BehaviourService
 */

import {
  BehaviourService,
  createBehaviourService
} from '../src/services/behaviour-service';

import {
  LittleExplorersAIService,
  createAIService
} from '../src/ai/ai-service';

import {
  initializeInfrastructure,
  InMemoryEventBus,
  InMemoryCache
} from '../src/infrastructure';

import {
  ExplorerPoint,
  BehaviourSkill,
  AIPointSuggestion,
  Celebration,
  BehaviourStreak,
  ExplorerPointRepository,
  BehaviourSkillRepository,
  AIPointSuggestionRepository,
  CelebrationRepository,
  BehaviourStreakRepository,
  StudentBehaviourAnalytics,
  ClassroomBehaviourAnalytics,
  SkillCategory,
  AgeGroup,
  DEFAULT_BEHAVIOUR_SKILLS
} from '../src/types/behaviour.types';

import { DateRange, generateId } from '../src/types/core.types';

// ============================================================================
// MOCK REPOSITORIES
// ============================================================================

class MockExplorerPointRepository implements ExplorerPointRepository {
  private points: Map<string, ExplorerPoint> = new Map();

  async findById(tenantId: string, id: string): Promise<ExplorerPoint | null> {
    return this.points.get(id) || null;
  }

  async findByStudent(tenantId: string, studentId: string, options?: any): Promise<ExplorerPoint[]> {
    return Array.from(this.points.values())
      .filter(p => p.tenantId === tenantId && p.studentId === studentId);
  }

  async findByClassroom(tenantId: string, classroomId: string, options?: any): Promise<ExplorerPoint[]> {
    return Array.from(this.points.values())
      .filter(p => p.tenantId === tenantId && p.classroomId === classroomId);
  }

  async create(point: Omit<ExplorerPoint, 'id' | 'createdAt'>): Promise<ExplorerPoint> {
    const id = generateId('pt');
    const newPoint: ExplorerPoint = {
      ...point,
      id,
      createdAt: new Date()
    };
    this.points.set(id, newPoint);
    return newPoint;
  }

  async createBatch(points: Omit<ExplorerPoint, 'id' | 'createdAt'>[]): Promise<ExplorerPoint[]> {
    return Promise.all(points.map(p => this.create(p)));
  }

  async addReaction(tenantId: string, pointId: string, reaction: any): Promise<ExplorerPoint> {
    const point = this.points.get(pointId);
    if (!point) throw new Error('Point not found');
    point.reactions.push(reaction);
    return point;
  }

  async markParentNotified(tenantId: string, pointId: string): Promise<void> {
    const point = this.points.get(pointId);
    if (point) {
      point.parentNotified = true;
      point.parentNotifiedAt = new Date();
    }
  }

  async markParentViewed(tenantId: string, pointId: string): Promise<void> {
    const point = this.points.get(pointId);
    if (point) {
      point.parentViewed = true;
      point.parentViewedAt = new Date();
    }
  }

  async sumByStudent(tenantId: string, studentId: string, dateRange?: DateRange): Promise<number> {
    return Array.from(this.points.values())
      .filter(p => p.tenantId === tenantId && p.studentId === studentId)
      .reduce((sum, p) => sum + p.points, 0);
  }

  async sumByClassroom(tenantId: string, classroomId: string, dateRange?: DateRange): Promise<number> {
    return Array.from(this.points.values())
      .filter(p => p.tenantId === tenantId && p.classroomId === classroomId)
      .reduce((sum, p) => sum + p.points, 0);
  }

  async countBySkill(tenantId: string, classroomId: string, dateRange?: DateRange): Promise<Map<string, number>> {
    const counts = new Map<string, number>();
    for (const point of this.points.values()) {
      if (point.tenantId === tenantId && point.classroomId === classroomId) {
        counts.set(point.skillId, (counts.get(point.skillId) || 0) + 1);
      }
    }
    return counts;
  }

  async getStudentAnalytics(tenantId: string, studentId: string, dateRange: DateRange): Promise<StudentBehaviourAnalytics> {
    const points = await this.findByStudent(tenantId, studentId);
    const total = points.reduce((sum, p) => sum + p.points, 0);
    
    return {
      studentId,
      studentName: 'Test Student',
      period: dateRange,
      totalPoints: total,
      positivePoints: total,
      constructivePoints: 0,
      pointsChange: 0,
      skillBreakdown: [],
      timePatterns: { dayOfWeek: {}, timeOfDay: {}, peakTime: '' },
      dailyTrend: [],
      weeklyTrend: [],
      classAverage: total,
      percentile: 50,
      aiInsights: {
        summary: 'Test summary',
        strengths: [],
        growthAreas: [],
        patterns: [],
        recommendations: [],
        teacherTips: [],
        parentMessage: '',
        celebrationSuggestions: [],
        trend: 'stable',
        confidenceLevel: 0.8,
        generatedAt: new Date()
      },
      generatedAt: new Date()
    };
  }

  async getClassroomAnalytics(tenantId: string, classroomId: string, dateRange: DateRange): Promise<ClassroomBehaviourAnalytics> {
    const points = await this.findByClassroom(tenantId, classroomId);
    const total = points.reduce((sum, p) => sum + p.points, 0);
    
    return {
      classroomId,
      classroomName: 'Test Classroom',
      period: dateRange,
      totalPoints: total,
      averagePointsPerStudent: total / 10,
      totalAwards: points.length,
      skillUsage: [],
      studentDistribution: [],
      peakAwardingTimes: [],
      quietPeriods: [],
      aiInsights: {
        overallSummary: 'Test summary',
        classStrengths: [],
        focusAreas: [],
        dynamicsObservations: [],
        topPerformers: [],
        needingSupport: [],
        immediateActions: [],
        weeklyGoals: [],
        positivePatterns: [],
        concerningPatterns: [],
        predictedChallenges: [],
        generatedAt: new Date()
      },
      generatedAt: new Date()
    };
  }

  // Test helpers
  clear() {
    this.points.clear();
  }

  getAll(): ExplorerPoint[] {
    return Array.from(this.points.values());
  }
}

class MockBehaviourSkillRepository implements BehaviourSkillRepository {
  private skills: Map<string, BehaviourSkill> = new Map();

  constructor() {
    // Initialize with default skills
    for (const template of DEFAULT_BEHAVIOUR_SKILLS) {
      const skill: BehaviourSkill = {
        ...template,
        id: generateId('skill'),
        tenantId: 'test_tenant',
        schoolId: 'test_school',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.skills.set(skill.id, skill);
    }
  }

  async findById(tenantId: string, id: string): Promise<BehaviourSkill | null> {
    return this.skills.get(id) || null;
  }

  async findBySchool(tenantId: string, schoolId: string, activeOnly?: boolean): Promise<BehaviourSkill[]> {
    return Array.from(this.skills.values())
      .filter(s => s.tenantId === tenantId && s.schoolId === schoolId)
      .filter(s => !activeOnly || s.isActive);
  }

  async findByClassroom(tenantId: string, classroomId: string, activeOnly?: boolean): Promise<BehaviourSkill[]> {
    return Array.from(this.skills.values())
      .filter(s => s.tenantId === tenantId && (!s.classroomId || s.classroomId === classroomId))
      .filter(s => !activeOnly || s.isActive);
  }

  async create(skill: Omit<BehaviourSkill, 'id' | 'createdAt' | 'updatedAt'>): Promise<BehaviourSkill> {
    const id = generateId('skill');
    const newSkill: BehaviourSkill = {
      ...skill,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.skills.set(id, newSkill);
    return newSkill;
  }

  async update(tenantId: string, id: string, updates: Partial<BehaviourSkill>): Promise<BehaviourSkill> {
    const skill = this.skills.get(id);
    if (!skill) throw new Error('Skill not found');
    Object.assign(skill, updates, { updatedAt: new Date() });
    return skill;
  }

  async incrementUsage(tenantId: string, id: string): Promise<void> {
    const skill = this.skills.get(id);
    if (skill) {
      skill.usageCount++;
      skill.lastUsed = new Date();
    }
  }

  async delete(tenantId: string, id: string): Promise<void> {
    this.skills.delete(id);
  }

  // Test helper
  getFirstSkill(): BehaviourSkill {
    return Array.from(this.skills.values())[0];
  }
}

class MockAIPointSuggestionRepository implements AIPointSuggestionRepository {
  private suggestions: Map<string, AIPointSuggestion> = new Map();

  async findById(tenantId: string, id: string): Promise<AIPointSuggestion | null> {
    return this.suggestions.get(id) || null;
  }

  async findPendingByClassroom(tenantId: string, classroomId: string): Promise<AIPointSuggestion[]> {
    return Array.from(this.suggestions.values())
      .filter(s => s.tenantId === tenantId && s.classroomId === classroomId && s.status === 'pending');
  }

  async create(suggestion: Omit<AIPointSuggestion, 'id'>): Promise<AIPointSuggestion> {
    const id = generateId('sug');
    const newSuggestion: AIPointSuggestion = { ...suggestion, id };
    this.suggestions.set(id, newSuggestion);
    return newSuggestion;
  }

  async updateStatus(tenantId: string, id: string, status: AIPointSuggestion['status'], details?: any): Promise<AIPointSuggestion> {
    const suggestion = this.suggestions.get(id);
    if (!suggestion) throw new Error('Suggestion not found');
    suggestion.status = status;
    if (details) {
      if (details.acceptedBy) suggestion.acceptedBy = details.acceptedBy;
      if (details.modifiedAward) suggestion.modifiedAward = details.modifiedAward;
      if (details.rejectionReason) suggestion.rejectionReason = details.rejectionReason;
    }
    return suggestion;
  }

  async expireOld(tenantId: string, before: Date): Promise<number> {
    let count = 0;
    for (const [id, suggestion] of this.suggestions) {
      if (suggestion.tenantId === tenantId && suggestion.expiresAt < before && suggestion.status === 'pending') {
        suggestion.status = 'expired';
        count++;
      }
    }
    return count;
  }
}

class MockCelebrationRepository implements CelebrationRepository {
  private celebrations: Map<string, Celebration> = new Map();

  async findById(tenantId: string, id: string): Promise<Celebration | null> {
    return this.celebrations.get(id) || null;
  }

  async findByStudent(tenantId: string, studentId: string): Promise<Celebration[]> {
    return Array.from(this.celebrations.values())
      .filter(c => c.tenantId === tenantId && c.studentId === studentId);
  }

  async findByClassroom(tenantId: string, classroomId: string, dateRange?: DateRange): Promise<Celebration[]> {
    return Array.from(this.celebrations.values())
      .filter(c => c.tenantId === tenantId && c.classroomId === classroomId);
  }

  async create(celebration: Omit<Celebration, 'id' | 'createdAt'>): Promise<Celebration> {
    const id = generateId('cel');
    const newCelebration: Celebration = { ...celebration, id, createdAt: new Date() };
    this.celebrations.set(id, newCelebration);
    return newCelebration;
  }

  async markParentNotified(tenantId: string, id: string): Promise<void> {
    const celebration = this.celebrations.get(id);
    if (celebration) celebration.parentNotified = true;
  }

  async markClassAnnounced(tenantId: string, id: string): Promise<void> {
    const celebration = this.celebrations.get(id);
    if (celebration) celebration.classAnnounced = true;
  }
}

class MockBehaviourStreakRepository implements BehaviourStreakRepository {
  private streaks: Map<string, BehaviourStreak> = new Map();

  async findByStudent(tenantId: string, studentId: string): Promise<BehaviourStreak | null> {
    return this.streaks.get(studentId) || null;
  }

  async upsert(streak: BehaviourStreak): Promise<BehaviourStreak> {
    this.streaks.set(streak.studentId, streak);
    return streak;
  }

  async getClassroomStreaks(tenantId: string, classroomId: string): Promise<BehaviourStreak[]> {
    return Array.from(this.streaks.values())
      .filter(s => s.classroomId === classroomId);
  }
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe('BehaviourService', () => {
  let service: BehaviourService;
  let aiService: LittleExplorersAIService;
  let pointRepo: MockExplorerPointRepository;
  let skillRepo: MockBehaviourSkillRepository;
  let suggestionRepo: MockAIPointSuggestionRepository;
  let celebrationRepo: MockCelebrationRepository;
  let streakRepo: MockBehaviourStreakRepository;
  let eventBus: InMemoryEventBus;

  const testTenantId = 'test_tenant';
  const testSchoolId = 'test_school';
  const testClassroomId = 'test_classroom';
  const testTeacherId = 'test_teacher';
  const testStudentId = 'test_student';

  beforeEach(() => {
    // Initialize infrastructure
    const { eventBus: eb, cache, config } = initializeInfrastructure();
    eventBus = eb as InMemoryEventBus;

    // Initialize repositories
    pointRepo = new MockExplorerPointRepository();
    skillRepo = new MockBehaviourSkillRepository();
    suggestionRepo = new MockAIPointSuggestionRepository();
    celebrationRepo = new MockCelebrationRepository();
    streakRepo = new MockBehaviourStreakRepository();

    // Initialize AI service
    aiService = createAIService({ eventBus, cache, config });

    // Initialize Behaviour service
    service = createBehaviourService(
      { eventBus, cache, config },
      {
        pointRepo,
        skillRepo,
        suggestionRepo,
        celebrationRepo,
        streakRepo
      },
      aiService
    );

    // Clear event log
    eventBus.clearEventLog();
  });

  describe('Point Awarding', () => {
    it('should award points to a single student', async () => {
      const skill = skillRepo.getFirstSkill();
      
      const result = await service.awardPoints({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        awardedBy: testTeacherId,
        studentIds: [testStudentId],
        skillId: skill.id,
        description: 'Helped a friend'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.points).toHaveLength(1);
        expect(result.data.points[0].studentId).toBe(testStudentId);
        expect(result.data.points[0].skillId).toBe(skill.id);
        expect(result.data.points[0].points).toBe(skill.defaultPoints);
      }
    });

    it('should award points to multiple students', async () => {
      const skill = skillRepo.getFirstSkill();
      const studentIds = ['student_1', 'student_2', 'student_3'];
      
      const result = await service.awardPoints({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        awardedBy: testTeacherId,
        studentIds,
        skillId: skill.id
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.points).toHaveLength(3);
        expect(result.data.groupAward).toBeDefined();
        expect(result.data.groupAward?.totalPoints).toBe(skill.defaultPoints * 3);
      }
    });

    it('should award custom point amounts within bounds', async () => {
      const skill = skillRepo.getFirstSkill();
      const customPoints = skill.maxPoints;
      
      const result = await service.awardPoints({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        awardedBy: testTeacherId,
        studentIds: [testStudentId],
        skillId: skill.id,
        points: customPoints
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.points[0].points).toBe(customPoints);
      }
    });

    it('should reject points outside skill bounds', async () => {
      const skill = skillRepo.getFirstSkill();
      
      const result = await service.awardPoints({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        awardedBy: testTeacherId,
        studentIds: [testStudentId],
        skillId: skill.id,
        points: skill.maxPoints + 10 // Over max
      });

      expect(result.success).toBe(false);
    });

    it('should publish event when points are awarded', async () => {
      const skill = skillRepo.getFirstSkill();
      
      await service.awardPoints({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        awardedBy: testTeacherId,
        studentIds: [testStudentId],
        skillId: skill.id
      });

      const events = eventBus.getEventLog();
      const pointEvent = events.find(e => e.type === 'little-explorers.behaviour.points_awarded');
      
      expect(pointEvent).toBeDefined();
      expect(pointEvent?.payload.skillId).toBe(skill.id);
    });

    it('should validate required fields', async () => {
      const result = await service.awardPoints({
        tenantId: '',
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        awardedBy: testTeacherId,
        studentIds: [testStudentId],
        skillId: 'skill_123'
      });

      expect(result.success).toBe(false);
    });

    it('should reject inactive skills', async () => {
      // Create an inactive skill
      const inactiveSkill = await skillRepo.create({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        name: 'Inactive Skill',
        emoji: '❌',
        description: 'Test',
        category: SkillCategory.CUSTOM,
        isPositive: true,
        defaultPoints: 1,
        minPoints: 1,
        maxPoints: 5,
        ageGroups: [],
        aiConfig: {
          triggerKeywords: [],
          observationPhrases: [],
          contextIndicators: [],
          expectedFrequency: 'regular',
          relatedSkillIds: [],
          autoSuggestConfidence: 0.7
        },
        isActive: false,
        sortOrder: 100,
        usageCount: 0,
        isSystem: false,
        isCustom: true
      });

      const result = await service.awardPoints({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        awardedBy: testTeacherId,
        studentIds: [testStudentId],
        skillId: inactiveSkill.id
      });

      expect(result.success).toBe(false);
    });
  });

  describe('Point Retrieval', () => {
    beforeEach(async () => {
      const skill = skillRepo.getFirstSkill();
      
      // Award some points
      await service.awardPoints({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        awardedBy: testTeacherId,
        studentIds: [testStudentId],
        skillId: skill.id
      });
      
      await service.awardPoints({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        awardedBy: testTeacherId,
        studentIds: [testStudentId],
        skillId: skill.id
      });
    });

    it('should get points for a student', async () => {
      const result = await service.getStudentPoints(testTenantId, testStudentId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeGreaterThanOrEqual(2);
      }
    });

    it('should get point total for a student', async () => {
      const result = await service.getStudentPointTotal(testTenantId, testStudentId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeGreaterThanOrEqual(2);
      }
    });

    it('should get points for a classroom', async () => {
      const result = await service.getClassroomPoints(testTenantId, testClassroomId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe('Skill Management', () => {
    it('should get skills for a school', async () => {
      const result = await service.getSchoolSkills(testTenantId, testSchoolId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBeGreaterThan(0);
      }
    });

    it('should create a custom skill', async () => {
      const result = await service.createCustomSkill(
        testTenantId,
        testSchoolId,
        testClassroomId,
        testTeacherId,
        {
          name: 'Super Helper',
          emoji: '🦸',
          description: 'Goes above and beyond to help',
          category: SkillCategory.CUSTOM,
          defaultPoints: 2
        }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Super Helper');
        expect(result.data.isCustom).toBe(true);
        expect(result.data.classroomId).toBe(testClassroomId);
      }
    });

    it('should initialize default skills for a school', async () => {
      const result = await service.initializeSchoolSkills(testTenantId, 'new_school');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.length).toBe(DEFAULT_BEHAVIOUR_SKILLS.length);
      }
    });
  });

  describe('AI Suggestions', () => {
    it('should generate point suggestions from observation', async () => {
      const result = await service.generatePointSuggestions(
        testTenantId,
        testClassroomId,
        'teacher_observation',
        {
          observationText: 'Emma was so kind today, she helped her friend tie their shoes',
          studentIds: [testStudentId]
        }
      );

      expect(result.success).toBe(true);
      // Suggestions may or may not be generated depending on AI analysis
    });

    it('should accept an AI suggestion', async () => {
      // First create a suggestion manually
      const skill = skillRepo.getFirstSkill();
      const suggestion = await suggestionRepo.create({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        observationSource: 'teacher_note',
        observationText: 'Test observation',
        suggestedStudentIds: [testStudentId],
        suggestedSkillId: skill.id,
        suggestedSkillName: skill.name,
        suggestedPoints: skill.defaultPoints,
        reasoning: 'Test reasoning',
        confidence: 0.85,
        detectedBehaviours: ['kind'],
        alternatives: [],
        status: 'pending',
        suggestedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      const result = await service.acceptSuggestion(
        testTenantId,
        suggestion.id,
        testTeacherId
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.points.length).toBeGreaterThan(0);
        expect(result.data.points[0].aiGenerated).toBe(true);
      }
    });

    it('should reject an AI suggestion', async () => {
      const skill = skillRepo.getFirstSkill();
      const suggestion = await suggestionRepo.create({
        tenantId: testTenantId,
        schoolId: testSchoolId,
        classroomId: testClassroomId,
        observationSource: 'teacher_note',
        suggestedStudentIds: [testStudentId],
        suggestedSkillId: skill.id,
        suggestedSkillName: skill.name,
        suggestedPoints: 1,
        reasoning: 'Test',
        confidence: 0.5,
        detectedBehaviours: [],
        alternatives: [],
        status: 'pending',
        suggestedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      });

      const result = await service.rejectSuggestion(
        testTenantId,
        suggestion.id,
        testTeacherId,
        'Not accurate'
      );

      expect(result.success).toBe(true);
    });
  });

  describe('Celebrations & Milestones', () => {
    it('should get celebrations for a student', async () => {
      const result = await service.getStudentCelebrations(testTenantId, testStudentId);

      expect(result.success).toBe(true);
    });

    it('should get streak for a student', async () => {
      const result = await service.getStudentStreak(testTenantId, testStudentId);

      expect(result.success).toBe(true);
    });
  });

  describe('Analytics & Insights', () => {
    it('should get student analytics', async () => {
      const dateRange: DateRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const result = await service.getStudentAnalytics(testTenantId, testStudentId, dateRange);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.studentId).toBe(testStudentId);
      }
    });

    it('should get classroom analytics', async () => {
      const dateRange: DateRange = {
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const result = await service.getClassroomAnalytics(testTenantId, testClassroomId, dateRange);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.classroomId).toBe(testClassroomId);
      }
    });

    it('should generate AI insights for a student', async () => {
      const result = await service.generateStudentInsights(testTenantId, testStudentId, 14);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.summary).toBeDefined();
        expect(result.data.trend).toBeDefined();
      }
    });

    it('should generate AI insights for a classroom', async () => {
      const result = await service.generateClassroomInsights(testTenantId, testClassroomId, 7);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.overallSummary).toBeDefined();
      }
    });
  });
});

describe('AI Service', () => {
  let aiService: LittleExplorersAIService;

  beforeEach(() => {
    const { eventBus, cache, config } = initializeInfrastructure();
    aiService = createAIService({ eventBus, cache, config });
  });

  describe('Configuration', () => {
    it('should return default configuration', () => {
      const config = aiService.getConfig();
      
      expect(config.provider).toBe('anthropic');
      expect(config.features.behaviourSuggestions).toBe(true);
    });

    it('should allow updating configuration', () => {
      aiService.configure({ provider: 'openai' as any });
      
      const config = aiService.getConfig();
      expect(config.provider).toBe('openai');
    });
  });

  describe('Message Drafts', () => {
    it('should generate message drafts', async () => {
      const result = await aiService.generateMessageDrafts({
        tenantId: 'test',
        teacherId: 'teacher_1',
        context: {
          school: { id: 's1', name: 'School', type: 'primary', jurisdiction: 'AU_NSW' },
          student: { id: 'stu1', firstName: 'Emma', age: 5, grade: AgeGroup.KINDERGARTEN },
          parent: { id: 'p1', firstName: 'Sarah', preferredLanguage: 'en' },
          teacher: { id: 't1', firstName: 'Ms. Johnson', preferredTone: 'warm' },
          timeContext: { currentTime: new Date(), dayOfWeek: 'Monday', periodOfDay: 'morning' }
        },
        draftContext: {
          purpose: 'celebration',
          preferredTone: 'warm',
          preferredLength: 'standard'
        },
        numberOfDrafts: 3,
        maxLength: 500
      });

      expect(result.drafts.length).toBe(3);
      expect(result.suggestedSubject).toBeDefined();
    });
  });

  describe('Content Analysis', () => {
    it('should analyze message sentiment', async () => {
      const result = await aiService.analyzeMessage({
        tenantId: 'test',
        messageContent: 'Thank you so much for all you do! Emma loves coming to school.',
        senderRole: 'parent',
        context: {
          school: { id: 's1', name: 'School', type: 'primary', jurisdiction: 'AU_NSW' },
          timeContext: { currentTime: new Date(), dayOfWeek: 'Monday', periodOfDay: 'morning' }
        }
      });

      expect(result.sentiment).toBe('very_positive');
      expect(result.urgency).toBe('low');
    });

    it('should detect safeguarding concerns', async () => {
      const result = await aiService.checkSafeguarding({
        tenantId: 'test',
        contentType: 'text',
        content: 'The child mentioned feeling scared at home',
        context: { source: 'message', authorRole: 'teacher' }
      });

      expect(result.safe).toBe(false);
      expect(result.flags.length).toBeGreaterThan(0);
    });
  });

  describe('Celebration Content', () => {
    it('should generate celebration content', async () => {
      const result = await aiService.generateCelebrationContent({
        tenantId: 'test',
        studentId: 'stu1',
        achievementType: 'points',
        achievementDetails: '100',
        context: {
          school: { id: 's1', name: 'School', type: 'primary', jurisdiction: 'AU_NSW' },
          student: { id: 'stu1', firstName: 'Emma', age: 5, grade: AgeGroup.KINDERGARTEN },
          timeContext: { currentTime: new Date(), dayOfWeek: 'Monday', periodOfDay: 'morning' }
        },
        tone: 'exciting',
        includeEmoji: true,
        forDisplay: 'student'
      });

      expect(result.title).toContain('Points');
      expect(result.emoji).toBeDefined();
      expect(result.sharableText).toBeDefined();
    });
  });
});
