/**
 * Enrollment & Prior Learning Assessment Service
 *
 * The gateway to the Intelligence Mesh. This service manages the complete
 * enrollment lifecycle from initial application through to Day One teacher
 * briefing, capturing the comprehensive context that enables personalised
 * education from the very first interaction.
 *
 * ## The Granny Explanation
 *
 * Imagine a new family moving to town and enrolling their child at school.
 * Traditionally, they'd fill out paper forms, hand over last year's report card,
 * and hope the new teacher figures things out eventually. Little Sarah might
 * spend weeks being bored in lessons she's already mastered, or struggling
 * silently with gaps nobody knew about.
 *
 * This system transforms that experience:
 *
 * 1. **Smart Application**: Parents fill out an online form that asks the right
 *    questions - not just "previous school" but "what makes your child excited
 *    to learn?" and "what challenges should we know about?"
 *
 * 2. **Document Intelligence**: When they upload Sarah's old report cards, AI
 *    reads them and extracts: "Sarah excels at creative writing but struggles
 *    with multiplication tables. Previous teacher noted anxiety around timed tests."
 *
 * 3. **Diagnostic Assessment**: Before Day One, Sarah completes a friendly
 *    diagnostic that adapts to her level - if she gets multiplication wrong,
 *    it checks addition; if she aces fractions, it tests decimals. In 20 minutes,
 *    we know exactly where she is.
 *
 * 4. **Transition Plan**: The system creates a personalised pathway: "Focus on
 *    times tables using visual methods (not timed drills). Extend her in writing.
 *    Pair her with Alex who also loves stories."
 *
 * 5. **Teacher Briefing**: Sarah's new teacher gets a one-pager: strengths, gaps,
 *    learning preferences, social notes, and specific strategies. Day One, she
 *    feels seen.
 *
 * 6. **Knowledge Graph Seeding**: All this understanding flows into the Learner
 *    Intelligence System, so every future interaction builds on what we know.
 *
 * @module IntelligenceMesh/Enrollment
 * @version 1.4.0
 */

import { log } from '../lib/logger';
import { ScholarlyBaseService, Result, success, failure, ScholarlyError, Validator, ValidationError, NotFoundError } from './base.service';

import {
  MeshBaseEntity, MeshStudent, MeshGuardian, EnrollmentApplication,
  ApplicationDocument, DocumentType, ApplicationStatus, ApplicationStatusChange,
  PriorLearningAssessment, TransitionPlan, EnrollmentDecision, StudentPrivacySettings,
  StudentStatus
} from './mesh-types';

import { ENROLLMENT_EVENTS, createMeshEvent } from './mesh-events';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface ApplicationRepository {
  findById(tenantId: string, id: string): Promise<EnrollmentApplication | null>;
  findByStatus(tenantId: string, statuses: ApplicationStatus[]): Promise<EnrollmentApplication[]>;
  findByGuardianEmail(tenantId: string, email: string): Promise<EnrollmentApplication[]>;
  findByYearLevel(tenantId: string, yearLevel: string): Promise<EnrollmentApplication[]>;
  search(tenantId: string, query: ApplicationSearchQuery): Promise<ApplicationSearchResult>;
  save(tenantId: string, application: EnrollmentApplication): Promise<EnrollmentApplication>;
  update(tenantId: string, id: string, updates: Partial<EnrollmentApplication>): Promise<EnrollmentApplication>;
  delete(tenantId: string, id: string, deletedBy: string): Promise<void>;
}

export interface ApplicationSearchQuery {
  status?: ApplicationStatus[];
  yearLevel?: string;
  submittedAfter?: Date;
  submittedBefore?: Date;
  guardianEmail?: string;
  studentName?: string;
  hasAssessment?: boolean;
  hasDecision?: boolean;
  sortBy?: 'submittedAt' | 'status' | 'yearLevel';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ApplicationSearchResult {
  applications: EnrollmentApplication[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface StudentRepository {
  findById(tenantId: string, id: string): Promise<MeshStudent | null>;
  findByLISProfileId(tenantId: string, lisProfileId: string): Promise<MeshStudent | null>;
  findByYearLevel(tenantId: string, yearLevel: string): Promise<MeshStudent[]>;
  findByClassGroup(tenantId: string, classGroup: string): Promise<MeshStudent[]>;
  save(tenantId: string, student: MeshStudent): Promise<MeshStudent>;
  update(tenantId: string, id: string, updates: Partial<MeshStudent>): Promise<MeshStudent>;
}

export interface GuardianRepository {
  findById(tenantId: string, id: string): Promise<MeshGuardian | null>;
  findByEmail(tenantId: string, email: string): Promise<MeshGuardian | null>;
  findByStudent(tenantId: string, studentId: string): Promise<MeshGuardian[]>;
  save(tenantId: string, guardian: MeshGuardian): Promise<MeshGuardian>;
  update(tenantId: string, id: string, updates: Partial<MeshGuardian>): Promise<MeshGuardian>;
}

export interface AssessmentRepository {
  findById(tenantId: string, id: string): Promise<PriorLearningAssessment | null>;
  findByApplication(tenantId: string, applicationId: string): Promise<PriorLearningAssessment | null>;
  save(tenantId: string, assessment: PriorLearningAssessment): Promise<PriorLearningAssessment>;
  update(tenantId: string, id: string, updates: Partial<PriorLearningAssessment>): Promise<PriorLearningAssessment>;
}

export interface TransitionPlanRepository {
  findById(tenantId: string, id: string): Promise<TransitionPlan | null>;
  findByStudent(tenantId: string, studentId: string): Promise<TransitionPlan | null>;
  findByApplication(tenantId: string, applicationId: string): Promise<TransitionPlan | null>;
  save(tenantId: string, plan: TransitionPlan): Promise<TransitionPlan>;
  update(tenantId: string, id: string, updates: Partial<TransitionPlan>): Promise<TransitionPlan>;
}

export interface DocumentStorageService {
  upload(tenantId: string, file: Buffer, filename: string, contentType: string): Promise<{ url: string; id: string }>;
  getSignedUrl(tenantId: string, documentId: string): Promise<string>;
  delete(tenantId: string, documentId: string): Promise<void>;
}

// ============================================================================
// AI SERVICE INTERFACES
// ============================================================================

export interface DocumentAnalysisService {
  analyzeDocument(tenantId: string, documentUrl: string, documentType: DocumentType): Promise<DocumentAnalysisResult>;
  analyzeReports(tenantId: string, reportUrls: string[]): Promise<ReportAnalysisResult>;
}

export interface DocumentAnalysisResult {
  success: boolean;
  documentType: DocumentType;
  extractedData: Record<string, any>;
  confidence: number;
  validationFlags: string[];
}

export interface ReportAnalysisResult {
  reportsAnalysed: number;
  extractedGrades: { subject: string; grade: string; period: string; yearLevel?: string; teacherComment?: string }[];
  identifiedPatterns: { pattern: string; confidence: number; evidence: string[] }[];
  strengths: string[];
  concerns: string[];
  recommendations: string[];
  learningPreferences?: string[];
  socialEmotionalNotes?: string[];
  overallConfidence: number;
}

export interface DiagnosticAssessmentService {
  generateAssessment(tenantId: string, yearLevel: string, domains: string[]): Promise<DiagnosticAssessment>;
  processResponses(tenantId: string, assessmentId: string, responses: AssessmentResponse[]): Promise<DiagnosticResult>;
}

export interface DiagnosticAssessment {
  id: string;
  yearLevel: string;
  domains: string[];
  items: DiagnosticItem[];
  estimatedDuration: number;
  adaptiveRules: AdaptiveRule[];
}

export interface DiagnosticItem {
  id: string;
  domain: string;
  subDomain?: string;
  curriculumCode?: string;
  difficulty: number;
  itemType: 'multiple_choice' | 'short_answer' | 'constructed_response' | 'matching' | 'ordering';
  content: string;
  options?: string[];
  correctAnswer: any;
  rubric?: string;
  adaptiveNext?: { correct: string; incorrect: string };
}

export interface AdaptiveRule {
  condition: string;
  action: 'skip_ahead' | 'go_back' | 'end_domain' | 'add_items';
  targetItems?: string[];
}

export interface AssessmentResponse {
  itemId: string;
  response: any;
  timeSpent: number;
  confidence?: number;
}

export interface DiagnosticResult {
  domainResults: {
    domain: string;
    subDomain?: string;
    assessedLevel: string;
    masteryEstimate: number;
    itemsAttempted: number;
    itemsCorrect: number;
    strengths: string[];
    gaps: string[];
    misconceptions?: string[];
  }[];
  overallReadiness: string;
  recommendedYearLevel: string;
  initialCompetencies: {
    competencyId: string;
    curriculumCode?: string;
    estimatedMastery: number;
    confidence: number;
    source: 'assessment';
  }[];
  recommendedInterventions: string[];
}

export interface LISBridgeService {
  seedKnowledgeGraph(
    tenantId: string,
    studentId: string,
    initialCompetencies: { competencyId: string; curriculumCode?: string; estimatedMastery: number; confidence: number; source: string }[]
  ): Promise<{ lisProfileId: string; competenciesSeeded: number }>;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class EnrollmentMeshService extends ScholarlyBaseService {
  private readonly applicationRepo: ApplicationRepository;
  private readonly studentRepo: StudentRepository;
  private readonly guardianRepo: GuardianRepository;
  private readonly assessmentRepo: AssessmentRepository;
  private readonly transitionRepo: TransitionPlanRepository;
  private readonly documentStorage: DocumentStorageService;
  private readonly documentAnalysis: DocumentAnalysisService;
  private readonly diagnosticService: DiagnosticAssessmentService;
  private readonly lisBridge: LISBridgeService;

  constructor(deps: {
    applicationRepo: ApplicationRepository;
    studentRepo: StudentRepository;
    guardianRepo: GuardianRepository;
    assessmentRepo: AssessmentRepository;
    transitionRepo: TransitionPlanRepository;
    documentStorage: DocumentStorageService;
    documentAnalysis: DocumentAnalysisService;
    diagnosticService: DiagnosticAssessmentService;
    lisBridge: LISBridgeService;
  }) {
    super('EnrollmentMeshService');
    this.applicationRepo = deps.applicationRepo;
    this.studentRepo = deps.studentRepo;
    this.guardianRepo = deps.guardianRepo;
    this.assessmentRepo = deps.assessmentRepo;
    this.transitionRepo = deps.transitionRepo;
    this.documentStorage = deps.documentStorage;
    this.documentAnalysis = deps.documentAnalysis;
    this.diagnosticService = deps.diagnosticService;
    this.lisBridge = deps.lisBridge;
  }

  // ==========================================================================
  // APPLICATION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new enrollment application
   *
   * This is the entry point to the Intelligence Mesh. When a family begins
   * an application, we create the foundation that will eventually become
   * a rich, interconnected student profile.
   */
  async submitApplication(
    tenantId: string,
    data: {
      student: EnrollmentApplication['student'];
      guardians: EnrollmentApplication['guardians'];
      previousSchooling: EnrollmentApplication['previousSchooling'];
      requestedStartDate: Date;
      requestedYearLevel: string;
      preferredClassGroup?: string;
      submittedBy: string;
    }
  ): Promise<Result<EnrollmentApplication>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.student.firstName) {
      return failure({ code: 'VALIDATION_ERROR', message: 'student.firstName is required' });
    }
    if (!data.student.lastName) {
      return failure({ code: 'VALIDATION_ERROR', message: 'student.lastName is required' });
    }
    if (!data.student.dateOfBirth) {
      return failure({ code: 'VALIDATION_ERROR', message: 'student.dateOfBirth is required' });
    }
    if (!data.guardians) {
      return failure({ code: 'VALIDATION_ERROR', message: 'guardians is required' });
    }

    if (data.guardians.length === 0) {
      return failure({ code: 'VALIDATION_ERROR', message: 'At least one guardian is required' });
    }

    const primaryGuardian = data.guardians.find(g => g.isPrimaryContact);
    if (!primaryGuardian) {
      return failure({ code: 'VALIDATION_ERROR', message: 'A primary contact guardian is required' });
    }

    if (!Validator.isEmail(primaryGuardian.email)) {
      return failure({ code: 'VALIDATION_ERROR', message: 'Invalid email format for primary guardian' });
    }

    return this.withTiming('submitApplication', async () => {
      const now = new Date();
      const applicationId = this.generateId('app');
      const primaryGuardian = data.guardians.find(g => g.isPrimaryContact)!;

      const application: EnrollmentApplication = {
        id: applicationId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.submittedBy,
        updatedBy: data.submittedBy,

        student: data.student,
        guardians: data.guardians,
        previousSchooling: data.previousSchooling,

        requestedStartDate: data.requestedStartDate,
        requestedYearLevel: data.requestedYearLevel,
        preferredClassGroup: data.preferredClassGroup,

        documents: [],
        status: 'submitted',
        statusHistory: [{
          from: 'draft' as ApplicationStatus,
          to: 'submitted',
          changedAt: now,
          changedBy: data.submittedBy
        }]
      };

      const saved = await this.applicationRepo.save(tenantId, application);

      await this.publishEvent(ENROLLMENT_EVENTS.APPLICATION_SUBMITTED, tenantId, {
        applicationId: saved.id,
        studentName: `${saved.student.firstName} ${saved.student.lastName}`,
        requestedYearLevel: saved.requestedYearLevel,
        requestedStartDate: saved.requestedStartDate.toISOString(),
        primaryGuardianEmail: primaryGuardian.email
      });

      return success(saved);
    });
  }

  /**
   * Get application by ID
   */
  async getApplication(
    tenantId: string,
    applicationId: string
  ): Promise<Result<EnrollmentApplication>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!applicationId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'applicationId is required' });
    }

    return this.withTiming('getApplication', async () => {
      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) {
        throw new NotFoundError('Application', applicationId);
      }
      return success(application);
    });
  }

  /**
   * Search applications with filtering and pagination
   */
  async searchApplications(
    tenantId: string,
    query: ApplicationSearchQuery
  ): Promise<Result<ApplicationSearchResult>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }

    return this.withTiming('searchApplications', async () => {
      const result = await this.applicationRepo.search(tenantId, {
        ...query,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? 20
      });
      return success(result);
    });
  }

  /**
   * Update application status with history tracking
   */
  async updateApplicationStatus(
    tenantId: string,
    applicationId: string,
    newStatus: ApplicationStatus,
    changedBy: string,
    reason?: string
  ): Promise<Result<EnrollmentApplication>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!applicationId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'applicationId is required' });
    }
    if (!newStatus) {
      return failure({ code: 'VALIDATION_ERROR', message: 'newStatus is required' });
    }

    return this.withTiming('updateApplicationStatus', async () => {
      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) {
        throw new NotFoundError('Application', applicationId);
      }

      const statusChange: ApplicationStatusChange = {
        from: application.status,
        to: newStatus,
        changedAt: new Date(),
        changedBy,
        reason
      };

      const updated = await this.applicationRepo.update(tenantId, applicationId, {
        status: newStatus,
        statusHistory: [...application.statusHistory, statusChange],
        updatedAt: new Date(),
        updatedBy: changedBy
      });

      await this.publishEvent(ENROLLMENT_EVENTS.STATUS_CHANGED, tenantId, {
        applicationId,
        previousStatus: application.status,
        newStatus,
        reason
      });

      return success(updated);
    });
  }

  // ==========================================================================
  // DOCUMENT MANAGEMENT
  // ==========================================================================

  /**
   * Upload and process a document for an application
   */
  async uploadDocument(
    tenantId: string,
    applicationId: string,
    data: {
      file: Buffer;
      filename: string;
      contentType: string;
      documentType: DocumentType;
      uploadedBy: string;
    }
  ): Promise<Result<ApplicationDocument>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!applicationId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'applicationId is required' });
    }
    if (!data.file) {
      return failure({ code: 'VALIDATION_ERROR', message: 'file is required' });
    }
    if (!data.documentType) {
      return failure({ code: 'VALIDATION_ERROR', message: 'documentType is required' });
    }

    return this.withTiming('uploadDocument', async () => {
      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) {
        throw new NotFoundError('Application', applicationId);
      }

      const { url, id: documentId } = await this.documentStorage.upload(
        tenantId, data.file, data.filename, data.contentType
      );

      const document: ApplicationDocument = {
        id: documentId,
        type: data.documentType,
        fileName: data.filename,
        fileUrl: url,
        uploadedAt: new Date(),
        uploadedBy: data.uploadedBy,
        verified: false
      };

      // AI analysis (async - don't block upload)
      this.analyzeDocumentAsync(tenantId, applicationId, document);

      const updatedDocs = [...application.documents, document];
      await this.applicationRepo.update(tenantId, applicationId, {
        documents: updatedDocs,
        updatedAt: new Date(),
        updatedBy: data.uploadedBy
      });

      await this.publishEvent(ENROLLMENT_EVENTS.DOCUMENT_UPLOADED, tenantId, {
        applicationId,
        documentId: document.id,
        documentType: document.type
      });

      return success(document);
    });
  }

  private async analyzeDocumentAsync(
    tenantId: string,
    applicationId: string,
    document: ApplicationDocument
  ): Promise<void> {
    try {
      const analysis = await this.documentAnalysis.analyzeDocument(
        tenantId, document.fileUrl, document.type
      );

      if (analysis.success) {
        const application = await this.applicationRepo.findById(tenantId, applicationId);
        if (application) {
          const updatedDocs = application.documents.map(d =>
            d.id === document.id
              ? { ...d, aiExtractedData: analysis.extractedData, verified: analysis.confidence > 0.85 }
              : d
          );

          await this.applicationRepo.update(tenantId, applicationId, {
            documents: updatedDocs,
            updatedAt: new Date(),
            updatedBy: 'system'
          });

          if (analysis.confidence > 0.85) {
            await this.publishEvent(ENROLLMENT_EVENTS.DOCUMENT_VERIFIED, tenantId, {
              applicationId,
              documentId: document.id,
              documentType: document.type,
              confidence: analysis.confidence
            });
          }
        }
      }
    } catch (error) {
      log.error('Document analysis failed', error as Error, { applicationId, documentId: document.id });
    }
  }

  /**
   * Analyze historical school reports to extract patterns
   */
  async analyzeHistoricalReports(
    tenantId: string,
    applicationId: string
  ): Promise<Result<ReportAnalysisResult>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!applicationId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'applicationId is required' });
    }

    return this.withTiming('analyzeHistoricalReports', async () => {
      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) {
        throw new NotFoundError('Application', applicationId);
      }

      const reportDocs = application.documents.filter(d => d.type === 'previous_report');
      if (reportDocs.length === 0) {
        throw new ValidationError('No previous reports uploaded for analysis');
      }

      const reportUrls = reportDocs.map(d => d.fileUrl);
      const analysis = await this.documentAnalysis.analyzeReports(tenantId, reportUrls);

      // Store analysis results in the assessment if it exists
      const assessment = await this.assessmentRepo.findByApplication(tenantId, applicationId);
      if (assessment) {
        await this.assessmentRepo.update(tenantId, assessment.id, {
          reportAnalysis: {
            reportsAnalysed: reportDocs.map(d => d.id),
            extractedGrades: analysis.extractedGrades,
            identifiedPatterns: analysis.identifiedPatterns.map(p => p.pattern),
            concerns: analysis.concerns,
            recommendations: analysis.recommendations,
            confidence: analysis.overallConfidence
          },
          updatedAt: new Date(),
          updatedBy: 'system'
        });
      }

      await this.publishEvent(ENROLLMENT_EVENTS.PRIOR_LEARNING_ANALYSED, tenantId, {
        applicationId,
        reportsAnalysed: reportDocs.length,
        strengthsIdentified: analysis.strengths.length,
        concernsIdentified: analysis.concerns.length,
        confidence: analysis.overallConfidence
      });

      return success(analysis);
    });
  }

  // ==========================================================================
  // PRIOR LEARNING ASSESSMENT
  // ==========================================================================

  /**
   * Schedule a diagnostic assessment for a prospective student
   */
  async scheduleDiagnosticAssessment(
    tenantId: string,
    applicationId: string,
    data: {
      assessmentDate: Date;
      assessor: string;
      assessmentType: PriorLearningAssessment['assessmentType'];
      domains: string[];
      scheduledBy: string;
    }
  ): Promise<Result<{
    assessmentId: string;
    assessmentDate: Date;
    estimatedDuration: number;
    diagnosticAssessment?: DiagnosticAssessment;
  }>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!applicationId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'applicationId is required' });
    }
    if (!data.assessmentDate || data.assessmentDate <= new Date()) {
      return failure({ code: 'VALIDATION_ERROR', message: 'assessmentDate must be in the future' });
    }

    return this.withTiming('scheduleDiagnosticAssessment', async () => {
      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) {
        throw new NotFoundError('Application', applicationId);
      }

      const diagnosticAssessment = await this.diagnosticService.generateAssessment(
        tenantId, application.requestedYearLevel, data.domains
      );

      const assessmentId = this.generateId('pla');
      const now = new Date();

      const assessment: PriorLearningAssessment = {
        id: assessmentId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.scheduledBy,
        updatedBy: data.scheduledBy,
        applicationId,
        assessmentDate: data.assessmentDate,
        assessedBy: data.assessor,
        assessmentType: data.assessmentType,
        domainResults: [],
        recommendedYearLevel: application.requestedYearLevel,
        recommendedInterventions: []
      };

      await this.assessmentRepo.save(tenantId, assessment);
      await this.updateApplicationStatus(tenantId, applicationId, 'assessment_scheduled', data.scheduledBy);

      await this.publishEvent(ENROLLMENT_EVENTS.ASSESSMENT_SCHEDULED, tenantId, {
        applicationId,
        assessmentId,
        assessmentDate: data.assessmentDate.toISOString(),
        assessmentType: data.assessmentType
      });

      return success({
        assessmentId,
        assessmentDate: data.assessmentDate,
        estimatedDuration: diagnosticAssessment.estimatedDuration,
        diagnosticAssessment
      });
    });
  }

  /**
   * Run the diagnostic assessment and process responses
   */
  async runDiagnosticAssessment(
    tenantId: string,
    assessmentId: string,
    responses: AssessmentResponse[],
    assessedBy: string
  ): Promise<Result<PriorLearningAssessment>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!assessmentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'assessmentId is required' });
    }
    if (!responses) {
      return failure({ code: 'VALIDATION_ERROR', message: 'responses is required' });
    }

    return this.withTiming('runDiagnosticAssessment', async () => {
      const assessment = await this.assessmentRepo.findById(tenantId, assessmentId);
      if (!assessment) {
        throw new NotFoundError('Assessment', assessmentId);
      }

      // Process responses through the diagnostic service
      const result = await this.diagnosticService.processResponses(tenantId, assessmentId, responses);

      // Update assessment with results
      const updatedAssessment = await this.assessmentRepo.update(tenantId, assessmentId, {
        domainResults: result.domainResults,
        recommendedYearLevel: result.recommendedYearLevel,
        recommendedInterventions: result.recommendedInterventions,
        initialCompetencies: result.initialCompetencies,
        updatedAt: new Date(),
        updatedBy: assessedBy
      });

      // Update application status
      await this.updateApplicationStatus(
        tenantId, assessment.applicationId, 'assessment_complete', assessedBy
      );

      await this.publishEvent(ENROLLMENT_EVENTS.ASSESSMENT_COMPLETED, tenantId, {
        applicationId: assessment.applicationId,
        assessmentId,
        recommendedYearLevel: result.recommendedYearLevel,
        competenciesIdentified: result.initialCompetencies.length,
        interventionsRecommended: result.recommendedInterventions.length
      });

      return success(updatedAssessment);
    });
  }

  // ==========================================================================
  // TRANSITION PLANNING
  // ==========================================================================

  /**
   * Generate a transition plan based on assessment results
   */
  async generateTransitionPlan(
    tenantId: string,
    applicationId: string,
    generatedBy: string
  ): Promise<Result<TransitionPlan>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!applicationId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'applicationId is required' });
    }

    return this.withTiming('generateTransitionPlan', async () => {
      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) {
        throw new NotFoundError('Application', applicationId);
      }

      const assessment = await this.assessmentRepo.findByApplication(tenantId, applicationId);
      if (!assessment) {
        throw new ValidationError('Assessment must be completed before generating transition plan');
      }

      // Build gap analysis from assessment results
      const identifiedGaps = this.buildGapAnalysis(assessment);

      // Build pathway steps
      const pathwaySteps = this.buildPathwaySteps(assessment, identifiedGaps);

      // Build teacher briefing
      const teacherBriefing = this.buildTeacherBriefing(application, assessment);

      const now = new Date();
      const planId = this.generateId('tp');

      const transitionPlan: TransitionPlan = {
        id: planId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: generatedBy,
        updatedBy: generatedBy,
        applicationId,
        identifiedGaps,
        pathwaySteps,
        teacherBriefing,
        status: 'draft',
        progressCheckpoints: []
      };

      const saved = await this.transitionRepo.save(tenantId, transitionPlan);

      await this.publishEvent(ENROLLMENT_EVENTS.TRANSITION_PLAN_CREATED, tenantId, {
        applicationId,
        planId: saved.id,
        gapsIdentified: identifiedGaps.length,
        pathwaySteps: pathwaySteps.length
      });

      return success(saved);
    });
  }

  private buildGapAnalysis(assessment: PriorLearningAssessment): TransitionPlan['identifiedGaps'] {
    const gaps: TransitionPlan['identifiedGaps'] = [];

    for (const domain of assessment.domainResults) {
      for (const gap of domain.gaps) {
        gaps.push({
          curriculumCode: '', // Would be mapped from domain
          gapDescription: gap,
          severity: domain.masteryEstimate < 50 ? 'significant' :
                   domain.masteryEstimate < 70 ? 'moderate' : 'minor',
          prerequisitesAffected: [],
          remediationApproach: `Targeted intervention in ${domain.domain}: ${gap}`,
          estimatedTimeToClose: domain.masteryEstimate < 50 ? 20 :
                               domain.masteryEstimate < 70 ? 10 : 5
        });
      }
    }

    return gaps;
  }

  private buildPathwaySteps(
    assessment: PriorLearningAssessment,
    gaps: TransitionPlan['identifiedGaps']
  ): TransitionPlan['pathwaySteps'] {
    return gaps.map((gap, index) => ({
      sequence: index + 1,
      curriculumCode: gap.curriculumCode,
      title: `Address: ${gap.gapDescription}`,
      description: gap.remediationApproach,
      estimatedDuration: gap.estimatedTimeToClose,
      resources: [],
      assessmentCheckpoint: index % 3 === 2 ? `checkpoint_${index}` : undefined
    }));
  }

  private buildTeacherBriefing(
    application: EnrollmentApplication,
    assessment: PriorLearningAssessment
  ): TransitionPlan['teacherBriefing'] {
    const strengths = assessment.domainResults
      .flatMap(d => d.strengths)
      .slice(0, 5);

    const areasNeedingSupport = assessment.domainResults
      .flatMap(d => d.gaps)
      .slice(0, 5);

    const accommodations: string[] = [];
    if (assessment.reportAnalysis?.concerns.some(c => c.toLowerCase().includes('anxiety'))) {
      accommodations.push('Avoid timed assessments where possible');
      accommodations.push('Provide advance notice of changes to routine');
    }

    return {
      keyStrengths: strengths,
      areasNeedingSupport,
      learningPreferences: (assessment.reportAnalysis as any)?.learningPreferences,
      socialEmotionalNotes: (assessment.reportAnalysis as any)?.socialEmotionalNotes?.join('. '),
      accommodationsNeeded: accommodations,
      parentCommunicationNotes: `Primary contact: ${application.guardians.find(g => g.isPrimaryContact)?.firstName}`
    };
  }

  /**
   * Generate a teacher briefing document
   */
  async createTeacherBriefing(
    tenantId: string,
    applicationId: string,
    assignedTeacher: string,
    generatedBy: string
  ): Promise<Result<{
    briefingId: string;
    briefing: TransitionPlan['teacherBriefing'];
    assignedTo: string;
    generatedAt: Date;
  }>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!applicationId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'applicationId is required' });
    }
    if (!assignedTeacher) {
      return failure({ code: 'VALIDATION_ERROR', message: 'assignedTeacher is required' });
    }

    return this.withTiming('createTeacherBriefing', async () => {
      const transitionPlan = await this.transitionRepo.findByApplication(tenantId, applicationId);
      if (!transitionPlan) {
        throw new ValidationError('Transition plan must exist before generating teacher briefing');
      }

      const briefingId = this.generateId('tbf');

      await this.publishEvent(ENROLLMENT_EVENTS.TEACHER_BRIEFING_GENERATED, tenantId, {
        applicationId,
        briefingId,
        assignedTeacher
      });

      return success({
        briefingId,
        briefing: transitionPlan.teacherBriefing,
        assignedTo: assignedTeacher,
        generatedAt: new Date()
      });
    });
  }

  // ==========================================================================
  // ENROLLMENT DECISION & COMPLETION
  // ==========================================================================

  /**
   * Make an enrollment decision
   */
  async makeDecision(
    tenantId: string,
    applicationId: string,
    data: {
      decision: EnrollmentDecision['decision'];
      decidedBy: string;
      offerDetails?: EnrollmentDecision['offerDetails'];
      waitlistDetails?: EnrollmentDecision['waitlistDetails'];
      declineDetails?: EnrollmentDecision['declineDetails'];
    }
  ): Promise<Result<EnrollmentDecision>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!applicationId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'applicationId is required' });
    }
    if (!data.decision) {
      return failure({ code: 'VALIDATION_ERROR', message: 'decision is required' });
    }

    if (data.decision === 'offer' && !data.offerDetails) {
      return failure({ code: 'VALIDATION_ERROR', message: 'Offer details required for offer decision' });
    }
    if (data.decision === 'decline' && !data.declineDetails) {
      return failure({ code: 'VALIDATION_ERROR', message: 'Decline details required for decline decision' });
    }

    return this.withTiming('makeDecision', async () => {
      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) {
        throw new NotFoundError('Application', applicationId);
      }

      const now = new Date();
      const decisionId = this.generateId('dec');

      const decision: EnrollmentDecision = {
        id: decisionId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.decidedBy,
        updatedBy: data.decidedBy,
        applicationId,
        decision: data.decision,
        decisionDate: now,
        decidedBy: data.decidedBy,
        offerDetails: data.offerDetails,
        waitlistDetails: data.waitlistDetails,
        declineDetails: data.declineDetails,
        communicationsSent: []
      };

      await this.applicationRepo.update(tenantId, applicationId, {
        decision,
        status: data.decision === 'offer' ? 'offered' :
               data.decision === 'waitlist' ? 'waitlisted' : 'declined',
        updatedAt: now,
        updatedBy: data.decidedBy
      });

      await this.publishEvent(ENROLLMENT_EVENTS.DECISION_MADE, tenantId, {
        applicationId,
        decision: data.decision
      });

      if (data.decision === 'offer') {
        await this.publishEvent(ENROLLMENT_EVENTS.OFFER_EXTENDED, tenantId, {
          applicationId,
          startDate: data.offerDetails!.startDate.toISOString(),
          yearLevel: data.offerDetails!.yearLevel,
          expiresAt: data.offerDetails!.expiresAt.toISOString()
        });
      }

      return success(decision);
    });
  }

  /**
   * Complete enrollment and create student record
   */
  async completeEnrollment(
    tenantId: string,
    applicationId: string,
    data: {
      acceptedBy: string;
      classGroup?: string;
      privacySettings: StudentPrivacySettings;
    }
  ): Promise<Result<{
    student: MeshStudent;
    guardians: MeshGuardian[];
    lisProfileId?: string;
    transitionPlan?: TransitionPlan;
  }>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!applicationId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'applicationId is required' });
    }
    if (!data.privacySettings) {
      return failure({ code: 'VALIDATION_ERROR', message: 'privacySettings is required' });
    }

    return this.withTiming('completeEnrollment', async () => {
      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) {
        throw new NotFoundError('Application', applicationId);
      }

      if (!application.decision || application.decision.decision !== 'offer') {
        throw new ValidationError('Application must have an accepted offer to complete enrollment');
      }

      const now = new Date();
      const studentId = this.generateId('stu');

      // Create student record
      const student: MeshStudent = {
        id: studentId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.acceptedBy,
        updatedBy: data.acceptedBy,
        firstName: application.student.firstName,
        lastName: application.student.lastName,
        preferredName: application.student.preferredName,
        dateOfBirth: application.student.dateOfBirth,
        gender: application.student.gender as any,
        currentStatus: 'enrolled',
        currentYearLevel: application.decision.offerDetails!.yearLevel,
        currentClassGroups: data.classGroup ? [data.classGroup] : [],
        privacySettings: data.privacySettings,
        meshProfile: {}
      };

      const savedStudent = await this.studentRepo.save(tenantId, student);

      // Create guardian records
      const savedGuardians: MeshGuardian[] = [];
      for (const guardian of application.guardians) {
        const guardianId = this.generateId('gdn');
        const newGuardian: MeshGuardian = {
          id: guardianId,
          tenantId,
          createdAt: now,
          updatedAt: now,
          createdBy: data.acceptedBy,
          updatedBy: data.acceptedBy,
          firstName: guardian.firstName,
          lastName: guardian.lastName,
          email: guardian.email,
          phone: guardian.phone,
          studentLinks: [{
            studentId,
            relationship: guardian.relationship as any,
            isPrimaryContact: guardian.isPrimaryContact,
            hasLegalCustody: guardian.hasLegalCustody,
            canPickUp: true,
            emergencyContact: guardian.isPrimaryContact,
            portalAccessLevel: 'full'
          }],
          communicationPreferences: {
            preferredLanguage: 'en',
            preferredChannel: 'email',
            emailOptIn: true,
            smsOptIn: true,
            pushNotifications: true,
            communicationFrequency: 'real_time'
          }
        };

        const savedGuardian = await this.guardianRepo.save(tenantId, newGuardian);
        savedGuardians.push(savedGuardian);
      }

      // Seed Knowledge Graph if assessment exists and privacy allows
      let lisProfileId: string | undefined;
      if (data.privacySettings.shareWithLIS) {
        const assessment = await this.assessmentRepo.findByApplication(tenantId, applicationId);
        if (assessment?.initialCompetencies && assessment.initialCompetencies.length > 0) {
          const lisResult = await this.lisBridge.seedKnowledgeGraph(
            tenantId,
            studentId,
            assessment.initialCompetencies
          );
          lisProfileId = lisResult.lisProfileId;

          // Update student with LIS profile link
          await this.studentRepo.update(tenantId, studentId, {
            lisProfileId,
            updatedAt: new Date(),
            updatedBy: 'system'
          });

          await this.publishEvent(ENROLLMENT_EVENTS.KNOWLEDGE_GRAPH_SEEDED, tenantId, {
            studentId,
            lisProfileId,
            competenciesSeeded: lisResult.competenciesSeeded,
            sourceAssessmentId: assessment.id,
            confidence: 0.8
          });
        }
      }

      // Update transition plan with student ID
      let transitionPlan: TransitionPlan | undefined;
      const existingPlan = await this.transitionRepo.findByApplication(tenantId, applicationId);
      if (existingPlan) {
        transitionPlan = await this.transitionRepo.update(tenantId, existingPlan.id, {
          studentId,
          status: 'active',
          updatedAt: now,
          updatedBy: data.acceptedBy
        });
      }

      // Update application status
      await this.updateApplicationStatus(tenantId, applicationId, 'enrolled', data.acceptedBy);

      // Emit enrolled event for mesh integration
      await this.publishEvent(ENROLLMENT_EVENTS.STUDENT_ENROLLED, tenantId, {
        applicationId,
        studentId,
        studentName: `${savedStudent.firstName} ${savedStudent.lastName}`,
        yearLevel: savedStudent.currentYearLevel,
        classGroup: data.classGroup,
        startDate: application.decision.offerDetails!.startDate.toISOString(),
        hasTransitionPlan: !!transitionPlan,
        hasIEP: false,
        initialCompetencies: lisProfileId ? (await this.assessmentRepo.findByApplication(tenantId, applicationId))?.initialCompetencies : undefined
      });

      return success({
        student: savedStudent,
        guardians: savedGuardians,
        lisProfileId,
        transitionPlan
      });
    });
  }

  // ==========================================================================
  // STATISTICS & REPORTING
  // ==========================================================================

  /**
   * Get enrollment statistics for a tenant
   */
  async getEnrollmentStatistics(
    tenantId: string,
    options?: {
      fromDate?: Date;
      toDate?: Date;
      yearLevel?: string;
    }
  ): Promise<Result<{
    totalApplications: number;
    byStatus: Record<ApplicationStatus, number>;
    byYearLevel: Record<string, number>;
    averageProcessingDays: number;
    conversionRate: number;
  }>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }

    return this.withTiming('getEnrollmentStatistics', async () => {
      const allApplications = await this.applicationRepo.search(tenantId, {
        submittedAfter: options?.fromDate,
        submittedBefore: options?.toDate,
        yearLevel: options?.yearLevel,
        pageSize: 10000
      });

      const byStatus: Record<string, number> = {};
      const byYearLevel: Record<string, number> = {};
      let totalProcessingDays = 0;
      let processedCount = 0;
      let enrolledCount = 0;

      for (const app of allApplications.applications) {
        byStatus[app.status] = (byStatus[app.status] || 0) + 1;
        byYearLevel[app.requestedYearLevel] = (byYearLevel[app.requestedYearLevel] || 0) + 1;

        if (app.status === 'enrolled') {
          enrolledCount++;
          const submitDate = app.statusHistory.find(s => s.to === 'submitted')?.changedAt;
          const enrollDate = app.statusHistory.find(s => s.to === 'enrolled')?.changedAt;
          if (submitDate && enrollDate) {
            totalProcessingDays += (enrollDate.getTime() - submitDate.getTime()) / (1000 * 60 * 60 * 24);
            processedCount++;
          }
        }
      }

      return success({
        totalApplications: allApplications.totalCount,
        byStatus: byStatus as Record<ApplicationStatus, number>,
        byYearLevel,
        averageProcessingDays: processedCount > 0 ? totalProcessingDays / processedCount : 0,
        conversionRate: allApplications.totalCount > 0 ? enrolledCount / allApplications.totalCount : 0
      });
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let enrollmentMeshServiceInstance: EnrollmentMeshService | null = null;

export function initializeEnrollmentMeshService(deps: {
  applicationRepo: ApplicationRepository;
  studentRepo: StudentRepository;
  guardianRepo: GuardianRepository;
  assessmentRepo: AssessmentRepository;
  transitionRepo: TransitionPlanRepository;
  documentStorage: DocumentStorageService;
  documentAnalysis: DocumentAnalysisService;
  diagnosticService: DiagnosticAssessmentService;
  lisBridge: LISBridgeService;
}): EnrollmentMeshService {
  enrollmentMeshServiceInstance = new EnrollmentMeshService(deps);
  return enrollmentMeshServiceInstance;
}

export function getEnrollmentMeshService(): EnrollmentMeshService {
  if (!enrollmentMeshServiceInstance) {
    throw new Error('EnrollmentMeshService has not been initialized. Call initializeEnrollmentMeshService first.');
  }
  return enrollmentMeshServiceInstance;
}
