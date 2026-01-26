/**
 * Professional Development Hub Service
 *
 * Phase 3: Advanced Learning Features
 *
 * On-demand professional development for educators with ISTE U-style courses.
 * Issues Verifiable Credentials upon completion.
 *
 * @module PDHubService
 */

import { ScholarlyBaseService, Result, success, failure, type ServiceDependencies } from './base.service';
import { log } from '../lib/logger';

import {
  PDCourse,
  PDCategory,
  PDModule,
  ModuleContent,
  ModuleAssessment,
  AssessmentQuestion,
  CourseInstructor,
  PDEnrollment,
  StandardReference,
  CredentialIssuanceRequest
} from './phase3-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface PDCourseRepository {
  findById(tenantId: string, id: string): Promise<PDCourse | null>;
  findByCategory(tenantId: string, category: PDCategory): Promise<PDCourse[]>;
  findPublished(tenantId: string): Promise<PDCourse[]>;
  search(tenantId: string, query: { category?: PDCategory; topic?: string; level?: string }): Promise<PDCourse[]>;
  save(tenantId: string, course: PDCourse): Promise<PDCourse>;
  update(tenantId: string, id: string, updates: Partial<PDCourse>): Promise<PDCourse>;
}

export interface PDEnrollmentRepository {
  findById(tenantId: string, id: string): Promise<PDEnrollment | null>;
  findByEducator(tenantId: string, educatorId: string): Promise<PDEnrollment[]>;
  findByCourse(tenantId: string, courseId: string): Promise<PDEnrollment[]>;
  findActiveByEducator(tenantId: string, educatorId: string): Promise<PDEnrollment[]>;
  save(tenantId: string, enrollment: PDEnrollment): Promise<PDEnrollment>;
  update(tenantId: string, id: string, updates: Partial<PDEnrollment>): Promise<PDEnrollment>;
}

export interface CredentialProvider {
  issueCredential(request: CredentialIssuanceRequest): Promise<{ credentialId: string }>;
}

export interface PDServiceConfig {
  maxConcurrentEnrollments: number;
  credentialIssuanceEnabled: boolean;
  passingScoreDefault: number;
  pdCreditsPerHour: number;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class PDHubService extends ScholarlyBaseService {
  private readonly courseRepo: PDCourseRepository;
  private readonly enrollmentRepo: PDEnrollmentRepository;
  private readonly credentialProvider: CredentialProvider;
  private readonly serviceConfig: PDServiceConfig;

  constructor(deps?: any) {
    super('PDHubService', deps);
    this.courseRepo = deps?.courseRepo;
    this.enrollmentRepo = deps?.enrollmentRepo;
    this.credentialProvider = deps?.credentialProvider;
    this.serviceConfig = deps?.serviceConfig || {
      maxConcurrentEnrollments: 5,
      credentialIssuanceEnabled: true,
      passingScoreDefault: 70,
      pdCreditsPerHour: 1
    };
  }

  // --------------------------------------------------------------------------
  // COURSE MANAGEMENT
  // --------------------------------------------------------------------------

  async createCourse(
    tenantId: string,
    courseData: {
      title: string;
      description: string;
      shortDescription: string;
      thumbnailUrl?: string;
      category: PDCategory;
      topics: string[];
      targetAudience: ('teacher' | 'administrator' | 'counselor' | 'support_staff')[];
      experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
      format: 'self_paced' | 'instructor_led' | 'cohort_based' | 'blended';
      modules: Omit<PDModule, 'id' | 'courseId'>[];
      estimatedHours: number;
      prerequisites?: string[];
      alignedStandards?: StandardReference[];
      instructors: CourseInstructor[];
      pricing: { type: 'free' | 'paid' | 'subscription'; amount?: number; currency?: string };
      credentialOffered: boolean;
      credentialType?: string;
    }
  ): Promise<Result<PDCourse>> {
    return this.withTiming('createCourse', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!courseData.title) {
        return failure({ code: 'VALIDATION_ERROR', message: 'title is required' });
      }
      if (!courseData.category) {
        return failure({ code: 'VALIDATION_ERROR', message: 'category is required' });
      }
      if (courseData.modules.length === 0) {
        return failure({ code: 'VALIDATION_ERROR', message: 'At least one module required' });
      }

      const courseId = this.generateId('pdcourse');

      const modules: PDModule[] = courseData.modules.map((m, i) => ({
        ...m,
        id: this.generateId('pdmodule'),
        courseId,
        order: i + 1,
        content: m.content.map((c, j) => ({ ...c, id: this.generateId('content'), order: j + 1 }))
      }));

      const pdCredits = courseData.estimatedHours * this.serviceConfig.pdCreditsPerHour;

      const course: PDCourse = {
        id: courseId,
        tenantId,
        title: courseData.title,
        description: courseData.description,
        shortDescription: courseData.shortDescription,
        thumbnailUrl: courseData.thumbnailUrl,
        category: courseData.category,
        topics: courseData.topics,
        targetAudience: courseData.targetAudience,
        experienceLevel: courseData.experienceLevel,
        format: courseData.format,
        modules,
        estimatedHours: courseData.estimatedHours,
        pdCredits,
        prerequisites: courseData.prerequisites || [],
        alignedStandards: courseData.alignedStandards || [],
        instructors: courseData.instructors,
        pricing: courseData.pricing,
        credentialOffered: courseData.credentialOffered,
        credentialType: courseData.credentialType,
        status: 'draft',
        enrollmentCount: 0,
        completionRate: 0,
        averageRating: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.courseRepo.save(tenantId, course);
      await this.publishEvent('scholarly.pd.course_created', tenantId, { courseId: saved.id, title: saved.title });
      return success(saved);
    });
  }

  async publishCourse(tenantId: string, courseId: string): Promise<Result<PDCourse>> {
    return this.withTiming('publishCourse', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!courseId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'courseId is required' });
      }

      const course = await this.courseRepo.findById(tenantId, courseId);
      if (!course) {
        return failure({ code: 'NOT_FOUND', message: `PDCourse not found: ${courseId}` });
      }
      if (course.status !== 'draft') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Only draft courses can be published' });
      }

      const updated = await this.courseRepo.update(tenantId, courseId, { status: 'published', publishedAt: new Date(), updatedAt: new Date() });
      await this.publishEvent('scholarly.pd.course_published', tenantId, { courseId });
      return success(updated);
    });
  }

  async searchCourses(tenantId: string, query: { category?: PDCategory; topic?: string; level?: string }): Promise<Result<PDCourse[]>> {
    return this.withTiming('searchCourses', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      const results = await this.courseRepo.search(tenantId, query);
      return success(results);
    });
  }

  // --------------------------------------------------------------------------
  // ENROLLMENT MANAGEMENT
  // --------------------------------------------------------------------------

  async enrollInCourse(tenantId: string, educatorId: string, educatorName: string, courseId: string): Promise<Result<PDEnrollment>> {
    return this.withTiming('enrollInCourse', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!educatorId || !educatorId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'educatorId is required' });
      }
      if (!courseId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'courseId is required' });
      }

      const course = await this.courseRepo.findById(tenantId, courseId);
      if (!course) {
        return failure({ code: 'NOT_FOUND', message: `PDCourse not found: ${courseId}` });
      }
      if (course.status !== 'published') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Course is not available for enrollment' });
      }

      const activeEnrollments = await this.enrollmentRepo.findActiveByEducator(tenantId, educatorId);
      if (activeEnrollments.length >= this.serviceConfig.maxConcurrentEnrollments) {
        return failure({ code: 'VALIDATION_ERROR', message: `Maximum ${this.serviceConfig.maxConcurrentEnrollments} concurrent enrollments allowed` });
      }

      if (activeEnrollments.some(e => e.courseId === courseId)) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Already enrolled in this course' });
      }

      const enrollment: PDEnrollment = {
        id: this.generateId('enrollment'),
        tenantId,
        educatorId,
        educatorName,
        courseId,
        courseName: course.title,
        status: 'enrolled',
        progress: course.modules.map(m => ({
          moduleId: m.id,
          contentProgress: m.content.map(c => ({ contentId: c.id, completed: false }))
        })),
        overallProgress: 0,
        enrolledAt: new Date(),
        lastAccessedAt: new Date()
      };

      const saved = await this.enrollmentRepo.save(tenantId, enrollment);

      course.enrollmentCount++;
      await this.courseRepo.update(tenantId, courseId, { enrollmentCount: course.enrollmentCount });

      await this.publishEvent('scholarly.pd.enrolled', tenantId, { enrollmentId: saved.id, courseId, educatorId });
      return success(saved);
    });
  }

  async markContentComplete(tenantId: string, enrollmentId: string, moduleId: string, contentId: string): Promise<Result<PDEnrollment>> {
    return this.withTiming('markContentComplete', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!enrollmentId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'enrollmentId is required' });
      }
      if (!moduleId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'moduleId is required' });
      }
      if (!contentId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'contentId is required' });
      }

      const enrollment = await this.enrollmentRepo.findById(tenantId, enrollmentId);
      if (!enrollment) {
        return failure({ code: 'NOT_FOUND', message: `PDEnrollment not found: ${enrollmentId}` });
      }

      const moduleProgress = enrollment.progress.find(p => p.moduleId === moduleId);
      if (!moduleProgress) {
        return failure({ code: 'NOT_FOUND', message: `ModuleProgress not found: ${moduleId}` });
      }

      const contentProgress = moduleProgress.contentProgress.find(c => c.contentId === contentId);
      if (!contentProgress) {
        return failure({ code: 'NOT_FOUND', message: `ContentProgress not found: ${contentId}` });
      }

      contentProgress.completed = true;
      contentProgress.completedAt = new Date();

      // Calculate overall progress
      const totalContent = enrollment.progress.reduce((sum, m) => sum + m.contentProgress.length, 0);
      const completedContent = enrollment.progress.reduce((sum, m) => sum + m.contentProgress.filter(c => c.completed).length, 0);
      enrollment.overallProgress = Math.round((completedContent / totalContent) * 100);

      if (enrollment.status === 'enrolled') enrollment.status = 'in_progress';

      const updated = await this.enrollmentRepo.update(tenantId, enrollmentId, {
        progress: enrollment.progress,
        overallProgress: enrollment.overallProgress,
        status: enrollment.status,
        lastAccessedAt: new Date()
      });

      return success(updated);
    });
  }

  async submitModuleAssessment(tenantId: string, enrollmentId: string, moduleId: string, answers: { questionId: string; answer: string | string[] }[]): Promise<Result<{ score: number; passed: boolean; feedback: string[] }>> {
    return this.withTiming('submitModuleAssessment', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!enrollmentId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'enrollmentId is required' });
      }
      if (!moduleId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'moduleId is required' });
      }

      const enrollment = await this.enrollmentRepo.findById(tenantId, enrollmentId);
      if (!enrollment) {
        return failure({ code: 'NOT_FOUND', message: `PDEnrollment not found: ${enrollmentId}` });
      }

      const course = await this.courseRepo.findById(tenantId, enrollment.courseId);
      if (!course) {
        return failure({ code: 'NOT_FOUND', message: `PDCourse not found: ${enrollment.courseId}` });
      }

      const module = course.modules.find(m => m.id === moduleId);
      if (!module?.assessment) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Module has no assessment' });
      }

      // Grade the assessment
      let totalPoints = 0;
      let earnedPoints = 0;
      const feedback: string[] = [];

      for (const question of module.assessment.questions || []) {
        totalPoints += question.points;
        const answer = answers.find(a => a.questionId === question.id);

        if (answer) {
          const isCorrect = Array.isArray(question.correctAnswer)
            ? Array.isArray(answer.answer) && this.arraysEqual(answer.answer.sort(), (question.correctAnswer as string[]).sort())
            : answer.answer === question.correctAnswer;

          if (isCorrect) {
            earnedPoints += question.points;
          } else if (question.explanation) {
            feedback.push(`Q: ${question.question.substring(0, 50)}... - ${question.explanation}`);
          }
        }
      }

      const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      const passingScore = module.assessment.passingScore || this.serviceConfig.passingScoreDefault;
      const passed = score >= passingScore;

      // Update enrollment
      const moduleProgress = enrollment.progress.find(p => p.moduleId === moduleId);
      if (moduleProgress) {
        moduleProgress.assessmentScore = score;
        moduleProgress.assessmentCompletedAt = new Date();
      }

      await this.enrollmentRepo.update(tenantId, enrollmentId, {
        progress: enrollment.progress,
        lastAccessedAt: new Date()
      });

      return success({ score, passed, feedback });
    });
  }

  private arraysEqual(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((v, i) => v === b[i]);
  }

  async completeCourse(tenantId: string, enrollmentId: string, educatorDid?: string): Promise<Result<{ enrollment: PDEnrollment; credentialId?: string }>> {
    return this.withTiming('completeCourse', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!enrollmentId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'enrollmentId is required' });
      }

      const enrollment = await this.enrollmentRepo.findById(tenantId, enrollmentId);
      if (!enrollment) {
        return failure({ code: 'NOT_FOUND', message: `PDEnrollment not found: ${enrollmentId}` });
      }

      const course = await this.courseRepo.findById(tenantId, enrollment.courseId);
      if (!course) {
        return failure({ code: 'NOT_FOUND', message: `PDCourse not found: ${enrollment.courseId}` });
      }

      // Verify all content complete
      const allContentComplete = enrollment.progress.every(m => m.contentProgress.every(c => c.completed));
      if (!allContentComplete) {
        return failure({ code: 'VALIDATION_ERROR', message: 'All content must be completed' });
      }

      // Verify all assessments passed
      for (const module of course.modules) {
        if (module.assessment) {
          const moduleProgress = enrollment.progress.find(p => p.moduleId === module.id);
          const passingScore = module.assessment.passingScore || this.serviceConfig.passingScoreDefault;
          if (!moduleProgress?.assessmentScore || moduleProgress.assessmentScore < passingScore) {
            return failure({ code: 'VALIDATION_ERROR', message: `Module "${module.title}" assessment not passed` });
          }
        }
      }

      enrollment.status = 'completed';
      enrollment.completedAt = new Date();
      enrollment.overallProgress = 100;

      let credentialId: string | undefined;
      if (this.serviceConfig.credentialIssuanceEnabled && course.credentialOffered && educatorDid) {
        const result = await this.credentialProvider.issueCredential({
          recipientId: enrollment.educatorId,
          recipientDid: educatorDid,
          credentialType: course.credentialType || 'PDCompletionCredential',
          achievementData: {
            courseTitle: course.title,
            category: course.category,
            topics: course.topics,
            estimatedHours: course.estimatedHours,
            pdCredits: course.pdCredits,
            alignedStandards: course.alignedStandards?.map(s => s.standardCode),
            completedAt: new Date().toISOString()
          },
          issuedBy: course.instructors[0]?.id || 'scholarly-pd'
        });
        credentialId = result.credentialId;
        enrollment.credentialId = credentialId;
      }

      const updated = await this.enrollmentRepo.update(tenantId, enrollmentId, {
        status: enrollment.status,
        completedAt: enrollment.completedAt,
        overallProgress: enrollment.overallProgress,
        credentialId: enrollment.credentialId
      });

      // Update course stats
      const allEnrollments = await this.enrollmentRepo.findByCourse(tenantId, enrollment.courseId);
      const completedCount = allEnrollments.filter(e => e.status === 'completed').length;
      const completionRate = allEnrollments.length > 0 ? completedCount / allEnrollments.length : 0;
      await this.courseRepo.update(tenantId, enrollment.courseId, { completionRate });

      await this.publishEvent('scholarly.pd.course_completed', tenantId, { enrollmentId, courseId: enrollment.courseId, credentialIssued: !!credentialId });
      return success({ enrollment: updated, credentialId });
    });
  }

  async rateCourse(tenantId: string, enrollmentId: string, rating: number, feedback?: string): Promise<Result<PDEnrollment>> {
    return this.withTiming('rateCourse', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!enrollmentId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'enrollmentId is required' });
      }
      if (rating < 1 || rating > 5) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Rating must be between 1 and 5' });
      }

      const enrollment = await this.enrollmentRepo.findById(tenantId, enrollmentId);
      if (!enrollment) {
        return failure({ code: 'NOT_FOUND', message: `PDEnrollment not found: ${enrollmentId}` });
      }
      if (enrollment.status !== 'completed') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Can only rate completed courses' });
      }

      enrollment.courseRating = rating;
      enrollment.courseFeedback = feedback;

      const updated = await this.enrollmentRepo.update(tenantId, enrollmentId, {
        courseRating: enrollment.courseRating,
        courseFeedback: enrollment.courseFeedback
      });

      // Update course average rating
      const allEnrollments = await this.enrollmentRepo.findByCourse(tenantId, enrollment.courseId);
      const ratingsArr = allEnrollments.filter(e => e.courseRating).map(e => e.courseRating!);
      const averageRating = ratingsArr.length > 0 ? ratingsArr.reduce((a, b) => a + b, 0) / ratingsArr.length : 0;
      await this.courseRepo.update(tenantId, enrollment.courseId, { averageRating });

      return success(updated);
    });
  }

  async getEducatorPDHistory(tenantId: string, educatorId: string): Promise<Result<{
    enrollments: PDEnrollment[];
    totalHours: number;
    totalCredits: number;
    completedCourses: number;
    credentialsEarned: number;
  }>> {
    return this.withTiming('getEducatorPDHistory', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!educatorId || !educatorId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'educatorId is required' });
      }

      const enrollments = await this.enrollmentRepo.findByEducator(tenantId, educatorId);
      const completed = enrollments.filter(e => e.status === 'completed');

      let totalHours = 0;
      let totalCredits = 0;

      for (const enrollment of completed) {
        const course = await this.courseRepo.findById(tenantId, enrollment.courseId);
        if (course) {
          totalHours += course.estimatedHours;
          totalCredits += course.pdCredits || 0;
        }
      }

      return success({
        enrollments,
        totalHours,
        totalCredits,
        completedCourses: completed.length,
        credentialsEarned: enrollments.filter(e => e.credentialId).length
      });
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: PDHubService | null = null;

export function initializePDHubService(deps?: any): PDHubService {
  if (!instance) {
    instance = new PDHubService(deps);
    log.info('PDHubService initialized');
  }
  return instance;
}

export function getPDHubService(): PDHubService {
  if (!instance) {
    throw new Error('PDHubService not initialized. Call initializePDHubService() first.');
  }
  return instance;
}

export const PD_HUB_SERVICE_VERSION = '1.0.0';
