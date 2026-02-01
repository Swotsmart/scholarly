/**
 * Gradebook Service
 * 
 * Manages gradebooks, calculates grades, generates report cards, and provides
 * grade analytics. Transforms raw assessment data into meaningful achievement
 * records.
 * 
 * ## The Granny Explanation
 * 
 * Imagine a wise teacher who:
 * - Remembers every quiz, test, and project grade
 * - Calculates the final grade fairly (not just averaging everything)
 * - Writes thoughtful report card comments (with AI help to save time)
 * - Notices when a student's grades suddenly drop and alerts someone
 * - Tells parents exactly what their child is good at and what needs work
 * 
 * @module IntelligenceMesh/Gradebook
 * @version 1.5.0
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  Validator, EventBus, Cache, ScholarlyConfig
} from '../../types';

import {
  Gradebook, GradebookItem, GradebookCategory, StudentScore, GradingPolicy,
  GradeScaleEntry, StudentGradeSummary, ReportCard, ReportCardTemplate,
  ReportNarrative, AcademicTranscript, CalculationMethod, AchievementLevel,
  ReportStatus, NarrativeStatus, CategoryGrade, ScoreStatus
} from './gradebook.types';

import { GRADEBOOK_EVENTS, createMeshEvent } from '../events/mesh-events';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface GradebookRepository {
  findById(tenantId: string, id: string): Promise<Gradebook | null>;
  findByClass(tenantId: string, classId: string, periodId?: string): Promise<Gradebook[]>;
  findByTeacher(tenantId: string, teacherId: string): Promise<Gradebook[]>;
  findByStudent(tenantId: string, studentId: string): Promise<Gradebook[]>;
  save(tenantId: string, gradebook: Gradebook): Promise<Gradebook>;
  update(tenantId: string, id: string, updates: Partial<Gradebook>): Promise<Gradebook>;
  delete(tenantId: string, id: string, deletedBy: string): Promise<void>;
}

export interface GradebookItemRepository {
  findById(tenantId: string, id: string): Promise<GradebookItem | null>;
  findByGradebook(tenantId: string, gradebookId: string): Promise<GradebookItem[]>;
  findByAssessment(tenantId: string, assessmentId: string): Promise<GradebookItem | null>;
  save(tenantId: string, item: GradebookItem): Promise<GradebookItem>;
  update(tenantId: string, id: string, updates: Partial<GradebookItem>): Promise<GradebookItem>;
  delete(tenantId: string, id: string, deletedBy: string): Promise<void>;
}

export interface GradingPolicyRepository {
  findById(tenantId: string, id: string): Promise<GradingPolicy | null>;
  findBySchool(tenantId: string, schoolId: string): Promise<GradingPolicy[]>;
  findActive(tenantId: string, schoolId: string): Promise<GradingPolicy | null>;
  save(tenantId: string, policy: GradingPolicy): Promise<GradingPolicy>;
  update(tenantId: string, id: string, updates: Partial<GradingPolicy>): Promise<GradingPolicy>;
}

export interface ReportCardRepository {
  findById(tenantId: string, id: string): Promise<ReportCard | null>;
  findByStudent(tenantId: string, studentId: string): Promise<ReportCard[]>;
  findByPeriod(tenantId: string, periodId: string): Promise<ReportCard[]>;
  findByStatus(tenantId: string, status: ReportStatus[]): Promise<ReportCard[]>;
  save(tenantId: string, report: ReportCard): Promise<ReportCard>;
  update(tenantId: string, id: string, updates: Partial<ReportCard>): Promise<ReportCard>;
  bulkSave(tenantId: string, reports: ReportCard[]): Promise<ReportCard[]>;
}

export interface ReportTemplateRepository {
  findById(tenantId: string, id: string): Promise<ReportCardTemplate | null>;
  findBySchool(tenantId: string, schoolId: string): Promise<ReportCardTemplate[]>;
  findActive(tenantId: string, schoolId: string, yearLevel: string): Promise<ReportCardTemplate | null>;
  save(tenantId: string, template: ReportCardTemplate): Promise<ReportCardTemplate>;
  update(tenantId: string, id: string, updates: Partial<ReportCardTemplate>): Promise<ReportCardTemplate>;
}

export interface StudentRepository {
  findById(tenantId: string, id: string): Promise<{ id: string; name: string; parentIds: string[]; yearLevel: string } | null>;
  findByIds(tenantId: string, ids: string[]): Promise<{ id: string; name: string; parentIds: string[] }[]>;
}

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

export interface AIService {
  generateNarrative(
    studentName: string,
    subject: string,
    grades: { item: string; score: number; maxScore: number }[],
    strengths: string[],
    areasForGrowth: string[],
    guidelines?: string
  ): Promise<{ narrative: string; confidence: number }>;
  
  suggestFeedback(score: number, maxScore: number, topic: string): Promise<string[]>;
}

export interface NotificationService {
  notifyStudent(tenantId: string, studentId: string, title: string, message: string, data?: any): Promise<void>;
  notifyTeacher(tenantId: string, teacherId: string, title: string, message: string, data?: any): Promise<void>;
  notifyParent(tenantId: string, parentId: string, title: string, message: string, data?: any): Promise<void>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface GradebookConfig {
  defaultCalculationMethod: CalculationMethod;
  gradeDropAlertThreshold: number;
  missingWorkReminderDays: number;
  maxMissingWorkDaysBeforeAlert: number;
  narrativeMinWords: number;
  narrativeMaxWords: number;
  enableAINarratives: boolean;
}

const DEFAULT_CONFIG: GradebookConfig = {
  defaultCalculationMethod: CalculationMethod.MEAN,
  gradeDropAlertThreshold: 15,
  missingWorkReminderDays: 3,
  maxMissingWorkDaysBeforeAlert: 7,
  narrativeMinWords: 50,
  narrativeMaxWords: 200,
  enableAINarratives: true
};

// ============================================================================
// GRADEBOOK SERVICE
// ============================================================================

export class GradebookService extends ScholarlyBaseService {
  private gradebookConfig: GradebookConfig;

  constructor(
    private gradebookRepo: GradebookRepository,
    private itemRepo: GradebookItemRepository,
    private policyRepo: GradingPolicyRepository,
    private reportRepo: ReportCardRepository,
    private templateRepo: ReportTemplateRepository,
    private studentRepo: StudentRepository,
    private aiService: AIService,
    private notifications: NotificationService,
    deps: { eventBus: EventBus; cache: Cache; config: ScholarlyConfig },
    gradebookConfig: Partial<GradebookConfig> = {}
  ) {
    super('GradebookService', deps);
    this.gradebookConfig = { ...DEFAULT_CONFIG, ...gradebookConfig };
  }

  // ==========================================================================
  // GRADEBOOK MANAGEMENT
  // ==========================================================================

  /**
   * Create a new gradebook
   */
  async createGradebook(
    tenantId: string,
    data: {
      schoolId: string;
      classId: string;
      className: string;
      subject: string;
      teacherId: string;
      teacherName: string;
      periodId: string;
      periodName: string;
      periodStart: Date;
      periodEnd: Date;
      gradingPolicyId: string;
      studentIds: string[];
      createdBy: string;
    }
  ): Promise<Result<Gradebook>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.classId, 'classId');
      Validator.required(data.subject, 'subject');
      Validator.required(data.teacherId, 'teacherId');
      Validator.required(data.gradingPolicyId, 'gradingPolicyId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createGradebook', tenantId, async () => {
      const policy = await this.policyRepo.findById(tenantId, data.gradingPolicyId);
      if (!policy) {
        throw new NotFoundError('GradingPolicy', data.gradingPolicyId);
      }

      const now = new Date();
      
      // Create categories from policy weights
      const categories: GradebookCategory[] = policy.categoryWeights.map((cw, i) => ({
        id: this.generateId('cat'),
        name: cw.category,
        weight: cw.weight,
        isExtraCredit: false,
        items: []
      }));

      const gradebook: Gradebook = {
        id: this.generateId('gb'),
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
        schoolId: data.schoolId,
        classId: data.classId,
        className: data.className,
        subject: data.subject,
        teacherId: data.teacherId,
        teacherName: data.teacherName,
        periodId: data.periodId,
        periodName: data.periodName,
        periodStart: data.periodStart,
        periodEnd: data.periodEnd,
        gradingPolicyId: data.gradingPolicyId,
        categories,
        studentIds: data.studentIds,
        isLocked: false
      };

      const saved = await this.gradebookRepo.save(tenantId, gradebook);

      await this.publishEvent(GRADEBOOK_EVENTS.GRADEBOOK_CREATED, tenantId, {
        gradebookId: saved.id,
        classId: data.classId,
        subject: data.subject,
        teacherId: data.teacherId,
        studentCount: data.studentIds.length
      });

      return saved;
    }, { classId: data.classId, subject: data.subject });
  }

  /**
   * Get gradebook by ID
   */
  async getGradebook(tenantId: string, gradebookId: string): Promise<Result<Gradebook>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(gradebookId, 'gradebookId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getGradebook', tenantId, async () => {
      const gradebook = await this.gradebookRepo.findById(tenantId, gradebookId);
      if (!gradebook) {
        throw new NotFoundError('Gradebook', gradebookId);
      }
      return gradebook;
    }, { gradebookId });
  }

  /**
   * Get gradebooks for a teacher
   */
  async getTeacherGradebooks(tenantId: string, teacherId: string): Promise<Result<Gradebook[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(teacherId, 'teacherId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getTeacherGradebooks', tenantId, async () => {
      return this.gradebookRepo.findByTeacher(tenantId, teacherId);
    }, { teacherId });
  }

  // ==========================================================================
  // GRADEBOOK ITEMS
  // ==========================================================================

  /**
   * Add an item to a gradebook
   */
  async addItem(
    tenantId: string,
    data: {
      gradebookId: string;
      categoryId: string;
      title: string;
      description?: string;
      maxPoints: number;
      dueDate?: Date;
      curriculumCodes?: string[];
      createdBy: string;
    }
  ): Promise<Result<GradebookItem>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.gradebookId, 'gradebookId');
      Validator.required(data.categoryId, 'categoryId');
      Validator.required(data.title, 'title');
      Validator.positiveNumber(data.maxPoints, 'maxPoints');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('addItem', tenantId, async () => {
      const gradebook = await this.gradebookRepo.findById(tenantId, data.gradebookId);
      if (!gradebook) {
        throw new NotFoundError('Gradebook', data.gradebookId);
      }

      if (gradebook.isLocked) {
        throw new ValidationError('Gradebook is locked');
      }

      const category = gradebook.categories.find(c => c.id === data.categoryId);
      if (!category) {
        throw new NotFoundError('Category', data.categoryId);
      }

      // Initialize empty scores for all students
      const students = await this.studentRepo.findByIds(tenantId, gradebook.studentIds);
      const scores: StudentScore[] = students.map(student => ({
        studentId: student.id,
        studentName: student.name,
        score: null,
        maxPoints: data.maxPoints,
        status: 'not_submitted' as ScoreStatus,
        isLate: false
      }));

      const now = new Date();
      const item: GradebookItem = {
        id: this.generateId('item'),
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
        gradebookId: data.gradebookId,
        categoryId: data.categoryId,
        title: data.title,
        description: data.description,
        sourceType: 'manual',
        maxPoints: data.maxPoints,
        curriculumCodes: data.curriculumCodes,
        dueDate: data.dueDate,
        isExtraCredit: false,
        countsTowardFinal: true,
        showToStudents: true,
        showToParents: true,
        scores
      };

      const saved = await this.itemRepo.save(tenantId, item);

      // Add to category
      category.items.push(saved);
      await this.gradebookRepo.update(tenantId, data.gradebookId, {
        categories: gradebook.categories,
        updatedBy: data.createdBy,
        updatedAt: now
      });

      return saved;
    }, { gradebookId: data.gradebookId });
  }

  /**
   * Link an assessment to a gradebook item
   */
  async linkAssessment(
    tenantId: string,
    itemId: string,
    assessmentId: string,
    linkedBy: string
  ): Promise<Result<GradebookItem>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(itemId, 'itemId');
      Validator.required(assessmentId, 'assessmentId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('linkAssessment', tenantId, async () => {
      const item = await this.itemRepo.findById(tenantId, itemId);
      if (!item) {
        throw new NotFoundError('GradebookItem', itemId);
      }

      const updated = await this.itemRepo.update(tenantId, itemId, {
        sourceType: 'assessment',
        sourceId: assessmentId,
        updatedBy: linkedBy,
        updatedAt: new Date()
      });

      return updated;
    }, { itemId, assessmentId });
  }

  // ==========================================================================
  // SCORE ENTRY
  // ==========================================================================

  /**
   * Enter a score for a student
   */
  async enterScore(
    tenantId: string,
    data: {
      itemId: string;
      studentId: string;
      score: number | null;
      status?: ScoreStatus;
      feedback?: string;
      enteredBy: string;
    }
  ): Promise<Result<StudentScore>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.itemId, 'itemId');
      Validator.required(data.studentId, 'studentId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('enterScore', tenantId, async () => {
      const item = await this.itemRepo.findById(tenantId, data.itemId);
      if (!item) {
        throw new NotFoundError('GradebookItem', data.itemId);
      }

      // Find or create score entry
      let scoreEntry = item.scores.find(s => s.studentId === data.studentId);
      if (!scoreEntry) {
        const student = await this.studentRepo.findById(tenantId, data.studentId);
        if (!student) {
          throw new NotFoundError('Student', data.studentId);
        }
        scoreEntry = {
          studentId: data.studentId,
          studentName: student.name,
          score: null,
          maxPoints: item.maxPoints,
          status: 'not_submitted',
          isLate: false
        };
        item.scores.push(scoreEntry);
      }

      // Track previous score
      const previousScore = scoreEntry.score;

      // Update score
      scoreEntry.score = data.score;
      scoreEntry.status = data.status || (data.score !== null ? 'graded' : scoreEntry.status);
      scoreEntry.feedback = data.feedback;

      if (data.score !== null) {
        scoreEntry.percentage = (data.score / item.maxPoints) * 100;
      }

      // Check if late
      if (item.dueDate && new Date() > item.dueDate && scoreEntry.status === 'submitted') {
        scoreEntry.isLate = true;
      }

      // Track history
      if (previousScore !== data.score && previousScore !== null) {
        scoreEntry.scoreHistory = scoreEntry.scoreHistory || [];
        scoreEntry.scoreHistory.push({
          score: previousScore,
          changedAt: new Date(),
          changedBy: data.enteredBy,
          reason: 'Score updated'
        });
      }

      await this.itemRepo.update(tenantId, data.itemId, {
        scores: item.scores,
        updatedBy: data.enteredBy,
        updatedAt: new Date()
      });

      // Update statistics
      await this.updateItemStatistics(tenantId, data.itemId);

      await this.publishEvent(GRADEBOOK_EVENTS.SCORE_ENTERED, tenantId, {
        itemId: data.itemId,
        studentId: data.studentId,
        score: data.score,
        maxPoints: item.maxPoints,
        gradebookId: item.gradebookId
      });

      // Check for grade alerts
      await this.checkGradeAlerts(tenantId, item.gradebookId, data.studentId);

      return scoreEntry;
    }, { itemId: data.itemId, studentId: data.studentId });
  }

  /**
   * Bulk enter scores for an item
   */
  async bulkEnterScores(
    tenantId: string,
    data: {
      itemId: string;
      scores: { studentId: string; score: number | null; status?: ScoreStatus; feedback?: string }[];
      enteredBy: string;
    }
  ): Promise<Result<StudentScore[]>> {
    const results: StudentScore[] = [];

    for (const scoreData of data.scores) {
      const result = await this.enterScore(tenantId, {
        itemId: data.itemId,
        studentId: scoreData.studentId,
        score: scoreData.score,
        status: scoreData.status,
        feedback: scoreData.feedback,
        enteredBy: data.enteredBy
      });

      if (result.success) {
        results.push(result.data);
      }
    }

    return success(results);
  }

  /**
   * Excuse a score
   */
  async excuseScore(
    tenantId: string,
    itemId: string,
    studentId: string,
    reason: string,
    excusedBy: string
  ): Promise<Result<StudentScore>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(itemId, 'itemId');
      Validator.required(studentId, 'studentId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('excuseScore', tenantId, async () => {
      const item = await this.itemRepo.findById(tenantId, itemId);
      if (!item) {
        throw new NotFoundError('GradebookItem', itemId);
      }

      const scoreEntry = item.scores.find(s => s.studentId === studentId);
      if (!scoreEntry) {
        throw new NotFoundError('StudentScore', studentId);
      }

      scoreEntry.status = 'excused';
      scoreEntry.privateNote = reason;

      await this.itemRepo.update(tenantId, itemId, {
        scores: item.scores,
        updatedBy: excusedBy,
        updatedAt: new Date()
      });

      await this.publishEvent(GRADEBOOK_EVENTS.SCORE_EXCUSED, tenantId, {
        itemId,
        studentId,
        reason,
        gradebookId: item.gradebookId
      });

      return scoreEntry;
    }, { itemId, studentId });
  }

  // ==========================================================================
  // GRADE CALCULATION
  // ==========================================================================

  /**
   * Calculate grade summary for a student
   */
  async calculateStudentGrade(
    tenantId: string,
    gradebookId: string,
    studentId: string
  ): Promise<Result<StudentGradeSummary>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(gradebookId, 'gradebookId');
      Validator.required(studentId, 'studentId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('calculateStudentGrade', tenantId, async () => {
      const gradebook = await this.gradebookRepo.findById(tenantId, gradebookId);
      if (!gradebook) {
        throw new NotFoundError('Gradebook', gradebookId);
      }

      const policy = await this.policyRepo.findById(tenantId, gradebook.gradingPolicyId);
      if (!policy) {
        throw new NotFoundError('GradingPolicy', gradebook.gradingPolicyId);
      }

      const items = await this.itemRepo.findByGradebook(tenantId, gradebookId);

      const student = await this.studentRepo.findById(tenantId, studentId);
      if (!student) {
        throw new NotFoundError('Student', studentId);
      }

      // Calculate by category
      const categoryGrades: CategoryGrade[] = [];
      let totalWeightedPercentage = 0;
      let totalWeight = 0;

      for (const category of gradebook.categories) {
        const categoryItems = items.filter(i => i.categoryId === category.id);
        const studentScores = categoryItems.flatMap(i => 
          i.scores.filter(s => s.studentId === studentId && s.status === 'graded')
        );

        if (studentScores.length === 0) continue;

        const categoryPercentage = this.calculateCategoryPercentage(
          studentScores,
          policy.calculationMethod,
          category.dropLowest
        );

        categoryGrades.push({
          categoryId: category.id,
          categoryName: category.name,
          weight: category.weight,
          percentage: categoryPercentage,
          grade: this.percentageToGrade(categoryPercentage, policy.gradeScale),
          itemsComplete: studentScores.length,
          itemsTotal: categoryItems.length
        });

        totalWeightedPercentage += categoryPercentage * (category.weight / 100);
        totalWeight += category.weight;
      }

      // Normalize if not all categories have scores
      const finalPercentage = totalWeight > 0 
        ? (totalWeightedPercentage / totalWeight) * 100 
        : 0;

      const now = new Date();
      const summary: StudentGradeSummary = {
        id: this.generateId('sum'),
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system',
        updatedBy: 'system',
        studentId,
        studentName: student.name,
        gradebookId,
        currentGrade: this.percentageToGrade(finalPercentage, policy.gradeScale),
        currentPercentage: finalPercentage,
        gpaValue: this.percentageToGPA(finalPercentage, policy.gradeScale),
        categoryGrades,
        gradeTrend: [],
        missingAssignments: this.getMissingAssignments(items, studentId),
        lateAssignments: this.getLateAssignments(items, studentId),
        comparedToClassAverage: 0,
        lastUpdated: now
      };

      return summary;
    }, { gradebookId, studentId });
  }

  /**
   * Calculate grades for all students in a gradebook
   */
  async calculateAllGrades(
    tenantId: string,
    gradebookId: string
  ): Promise<Result<StudentGradeSummary[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(gradebookId, 'gradebookId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('calculateAllGrades', tenantId, async () => {
      const gradebook = await this.gradebookRepo.findById(tenantId, gradebookId);
      if (!gradebook) {
        throw new NotFoundError('Gradebook', gradebookId);
      }

      const summaries: StudentGradeSummary[] = [];

      for (const studentId of gradebook.studentIds) {
        const result = await this.calculateStudentGrade(tenantId, gradebookId, studentId);
        if (result.success) {
          summaries.push(result.data);
        }
      }

      // Calculate class average and update comparisons
      const classAverage = summaries.length > 0
        ? summaries.reduce((sum, s) => sum + s.currentPercentage, 0) / summaries.length
        : 0;

      for (const summary of summaries) {
        summary.comparedToClassAverage = summary.currentPercentage - classAverage;
      }

      // Update gradebook statistics
      await this.gradebookRepo.update(tenantId, gradebookId, {
        statistics: {
          classAverage,
          classMedian: this.calculateMedian(summaries.map(s => s.currentPercentage)),
          standardDeviation: this.calculateStdDev(summaries.map(s => s.currentPercentage)),
          gradeDistribution: this.calculateGradeDistribution(summaries),
          lastUpdated: new Date()
        }
      });

      await this.publishEvent(GRADEBOOK_EVENTS.GRADES_CALCULATED, tenantId, {
        gradebookId,
        studentCount: summaries.length,
        classAverage
      });

      return summaries;
    }, { gradebookId });
  }

  // ==========================================================================
  // REPORT CARDS
  // ==========================================================================

  /**
   * Generate report cards for students
   */
  async generateReportCards(
    tenantId: string,
    data: {
      periodId: string;
      templateId: string;
      studentIds: string[];
      generatedBy: string;
    }
  ): Promise<Result<ReportCard[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.periodId, 'periodId');
      Validator.required(data.templateId, 'templateId');
      Validator.required(data.studentIds, 'studentIds');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateReportCards', tenantId, async () => {
      const template = await this.templateRepo.findById(tenantId, data.templateId);
      if (!template) {
        throw new NotFoundError('ReportCardTemplate', data.templateId);
      }

      const reports: ReportCard[] = [];

      for (const studentId of data.studentIds) {
        const student = await this.studentRepo.findById(tenantId, studentId);
        if (!student) continue;

        // Get all gradebooks for this student
        const gradebooks = await this.gradebookRepo.findByStudent(tenantId, studentId);
        const periodGradebooks = gradebooks.filter(g => g.periodId === data.periodId);

        const subjectGrades: ReportCard['subjectGrades'] = [];
        const narratives: ReportNarrative[] = [];

        for (const gradebook of periodGradebooks) {
          const summaryResult = await this.calculateStudentGrade(tenantId, gradebook.id, studentId);
          if (!summaryResult.success) continue;

          const summary = summaryResult.data;

          subjectGrades.push({
            subject: gradebook.subject,
            teacherId: gradebook.teacherId,
            teacherName: gradebook.teacherName,
            grade: summary.currentGrade,
            percentage: summary.currentPercentage,
            gpaValue: summary.gpaValue
          });

          // Generate AI narrative if enabled
          if (this.gradebookConfig.enableAINarratives && template.narrativeSettings.aiAssistEnabled) {
            const items = await this.itemRepo.findByGradebook(tenantId, gradebook.id);
            const grades = items.flatMap(i => {
              const score = i.scores.find(s => s.studentId === studentId);
              return score?.score != null 
                ? [{ item: i.title, score: score.score, maxScore: i.maxPoints }] 
                : [];
            });

            const strengths = summary.categoryGrades
              .filter(c => c.percentage >= 80)
              .map(c => c.categoryName);

            const areas = summary.categoryGrades
              .filter(c => c.percentage < 70)
              .map(c => c.categoryName);

            const aiResult = await this.aiService.generateNarrative(
              student.name,
              gradebook.subject,
              grades,
              strengths,
              areas,
              template.narrativeSettings.promptGuidelines
            );

            narratives.push({
              id: this.generateId('narr'),
              subject: gradebook.subject,
              teacherId: gradebook.teacherId,
              content: aiResult.narrative,
              status: NarrativeStatus.AI_DRAFT,
              aiDraft: aiResult.narrative,
              aiGeneratedAt: new Date(),
              wordCount: aiResult.narrative.split(/\s+/).length
            });
          }
        }

        const now = new Date();
        const report: ReportCard = {
          id: this.generateId('rpt'),
          tenantId,
          createdAt: now,
          updatedAt: now,
          createdBy: data.generatedBy,
          updatedBy: data.generatedBy,
          studentId,
          studentName: student.name,
          periodId: data.periodId,
          periodName: '',
          yearLevel: student.yearLevel,
          templateId: data.templateId,
          status: ReportStatus.DRAFT,
          workflow: [{
            status: 'draft',
            updatedAt: now,
            updatedBy: data.generatedBy
          }],
          subjectGrades,
          narratives
        };

        const saved = await this.reportRepo.save(tenantId, report);
        reports.push(saved);

        await this.publishEvent(GRADEBOOK_EVENTS.REPORT_DRAFT_READY, tenantId, {
          reportId: saved.id,
          studentId,
          periodId: data.periodId
        });
      }

      return reports;
    }, { periodId: data.periodId, studentCount: data.studentIds.length });
  }

  /**
   * Approve a narrative
   */
  async approveNarrative(
    tenantId: string,
    reportId: string,
    narrativeId: string,
    editedContent: string,
    approvedBy: string
  ): Promise<Result<ReportCard>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(reportId, 'reportId');
      Validator.required(narrativeId, 'narrativeId');
      Validator.required(editedContent, 'editedContent');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('approveNarrative', tenantId, async () => {
      const report = await this.reportRepo.findById(tenantId, reportId);
      if (!report) {
        throw new NotFoundError('ReportCard', reportId);
      }

      const narrative = report.narratives.find(n => n.id === narrativeId);
      if (!narrative) {
        throw new NotFoundError('ReportNarrative', narrativeId);
      }

      // Track edits if changed
      if (narrative.content !== editedContent) {
        narrative.teacherEdits = narrative.teacherEdits || [];
        narrative.teacherEdits.push({
          editedAt: new Date(),
          editedBy: approvedBy,
          previousContent: narrative.content
        });
      }

      narrative.content = editedContent;
      narrative.status = NarrativeStatus.APPROVED;
      narrative.approvedAt = new Date();
      narrative.approvedBy = approvedBy;
      narrative.wordCount = editedContent.split(/\s+/).length;

      const updated = await this.reportRepo.update(tenantId, reportId, {
        narratives: report.narratives,
        updatedBy: approvedBy,
        updatedAt: new Date()
      });

      await this.publishEvent(GRADEBOOK_EVENTS.NARRATIVE_APPROVED, tenantId, {
        reportId,
        narrativeId
      });

      return updated;
    }, { reportId, narrativeId });
  }

  /**
   * Publish a report card
   */
  async publishReport(
    tenantId: string,
    reportId: string,
    publishedBy: string
  ): Promise<Result<ReportCard>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(reportId, 'reportId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('publishReport', tenantId, async () => {
      const report = await this.reportRepo.findById(tenantId, reportId);
      if (!report) {
        throw new NotFoundError('ReportCard', reportId);
      }

      if (report.status !== ReportStatus.APPROVED) {
        throw new ValidationError('Report must be approved before publishing');
      }

      const now = new Date();
      const updated = await this.reportRepo.update(tenantId, reportId, {
        status: ReportStatus.PUBLISHED,
        publishedAt: now,
        updatedBy: publishedBy,
        updatedAt: now
      });

      await this.publishEvent(GRADEBOOK_EVENTS.REPORT_PUBLISHED, tenantId, {
        reportId,
        studentId: report.studentId
      });

      // Notify parents
      const student = await this.studentRepo.findById(tenantId, report.studentId);
      if (student) {
        for (const parentId of student.parentIds) {
          await this.notifications.notifyParent(
            tenantId,
            parentId,
            'Report Card Available',
            `${student.name}'s report card for ${report.periodName} is now available.`,
            { reportId }
          );
        }
      }

      return updated;
    }, { reportId });
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private calculateCategoryPercentage(
    scores: StudentScore[],
    method: CalculationMethod,
    dropLowest?: number
  ): number {
    if (scores.length === 0) return 0;

    const sortedScores = [...scores].sort((a, b) => 
      (a.percentage || 0) - (b.percentage || 0)
    );

    const effectiveScores = dropLowest 
      ? sortedScores.slice(dropLowest) 
      : sortedScores;

    if (effectiveScores.length === 0) return 0;

    switch (method) {
      case CalculationMethod.MEAN:
        return effectiveScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / effectiveScores.length;

      case CalculationMethod.WEIGHTED_RECENT:
        let weightedSum = 0;
        let weightSum = 0;
        effectiveScores.forEach((s, i) => {
          const weight = i + 1;
          weightedSum += (s.percentage || 0) * weight;
          weightSum += weight;
        });
        return weightedSum / weightSum;

      case CalculationMethod.HIGHEST_CONSISTENT:
        const percentages = effectiveScores.map(s => Math.floor((s.percentage || 0) / 10) * 10);
        const counts = new Map<number, number>();
        percentages.forEach(p => counts.set(p, (counts.get(p) || 0) + 1));
        const consistent = [...counts.entries()].filter(([_, count]) => count >= 2);
        return consistent.length > 0 
          ? Math.max(...consistent.map(([p]) => p)) + 5 
          : effectiveScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / effectiveScores.length;

      case CalculationMethod.DECAYING_AVERAGE:
        const decayFactor = 0.7;
        let decayingSum = 0;
        let decayWeight = 0;
        for (let i = effectiveScores.length - 1; i >= 0; i--) {
          const weight = Math.pow(decayFactor, effectiveScores.length - 1 - i);
          decayingSum += (effectiveScores[i].percentage || 0) * weight;
          decayWeight += weight;
        }
        return decayingSum / decayWeight;

      default:
        return effectiveScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / effectiveScores.length;
    }
  }

  private percentageToGrade(percentage: number, gradeScale: GradeScaleEntry[]): string {
    const sorted = [...gradeScale].sort((a, b) => b.minPercentage - a.minPercentage);
    for (const entry of sorted) {
      if (percentage >= entry.minPercentage) {
        return entry.grade;
      }
    }
    return sorted[sorted.length - 1]?.grade || 'F';
  }

  private percentageToGPA(percentage: number, gradeScale: GradeScaleEntry[]): number {
    const sorted = [...gradeScale].sort((a, b) => b.minPercentage - a.minPercentage);
    for (const entry of sorted) {
      if (percentage >= entry.minPercentage && entry.gpaValue !== undefined) {
        return entry.gpaValue;
      }
    }
    return 0;
  }

  private getMissingAssignments(items: GradebookItem[], studentId: string): StudentGradeSummary['missingAssignments'] {
    return items
      .filter(i => {
        const score = i.scores.find(s => s.studentId === studentId);
        return score && (score.status === 'not_submitted' || score.status === 'missing') && i.dueDate;
      })
      .map(i => ({
        itemId: i.id,
        title: i.title,
        dueDate: i.dueDate!,
        maxPoints: i.maxPoints
      }));
  }

  private getLateAssignments(items: GradebookItem[], studentId: string): StudentGradeSummary['lateAssignments'] {
    return items
      .filter(i => {
        const score = i.scores.find(s => s.studentId === studentId);
        return score && score.isLate;
      })
      .map(i => {
        const score = i.scores.find(s => s.studentId === studentId)!;
        return {
          itemId: i.id,
          title: i.title,
          daysLate: i.dueDate 
            ? Math.floor((Date.now() - i.dueDate.getTime()) / (1000 * 60 * 60 * 24))
            : 0,
          penalty: score.latePenalty || 0
        };
      });
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateGradeDistribution(summaries: StudentGradeSummary[]): { grade: string; count: number }[] {
    const counts = new Map<string, number>();
    for (const summary of summaries) {
      counts.set(summary.currentGrade, (counts.get(summary.currentGrade) || 0) + 1);
    }
    return [...counts.entries()].map(([grade, count]) => ({ grade, count }));
  }

  private async updateItemStatistics(tenantId: string, itemId: string): Promise<void> {
    const item = await this.itemRepo.findById(tenantId, itemId);
    if (!item) return;

    const scores = item.scores.filter(s => s.score !== null).map(s => s.score!);
    if (scores.length === 0) return;

    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const sorted = [...scores].sort((a, b) => a - b);

    await this.itemRepo.update(tenantId, itemId, {
      statistics: {
        mean,
        median: sorted[Math.floor(sorted.length / 2)],
        min: Math.min(...scores),
        max: Math.max(...scores),
        submissionRate: item.scores.filter(s => s.status !== 'not_submitted').length / item.scores.length
      }
    });
  }

  private async checkGradeAlerts(tenantId: string, gradebookId: string, studentId: string): Promise<void> {
    try {
      const summaryResult = await this.calculateStudentGrade(tenantId, gradebookId, studentId);
      if (!summaryResult.success) return;

      const summary = summaryResult.data;

      // Check for failing risk
      if (summary.currentPercentage < 60) {
        await this.publishEvent(GRADEBOOK_EVENTS.FAILING_RISK, tenantId, {
          gradebookId,
          studentId,
          currentPercentage: summary.currentPercentage
        });
      }

      // Check for significant grade drop
      if (summary.comparedToClassAverage < -this.gradebookConfig.gradeDropAlertThreshold) {
        await this.publishEvent(GRADEBOOK_EVENTS.GRADE_DROP_DETECTED, tenantId, {
          gradebookId,
          studentId,
          currentPercentage: summary.currentPercentage,
          comparedToClass: summary.comparedToClassAverage
        });

        // Cross-module signal to Wellbeing
        await this.publishEvent(GRADEBOOK_EVENTS.WELLBEING_SIGNAL, tenantId, {
          studentId,
          signal: 'grade_drop',
          severity: summary.comparedToClassAverage < -25 ? 'high' : 'medium'
        });
      }
    } catch (error) {
      this.logger.error('Grade alert check failed', error as Error, { gradebookId, studentId });
    }
  }
}
