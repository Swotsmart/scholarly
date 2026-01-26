/**
 * Project-Based Learning Framework Service
 * 
 * Phase 3: Advanced Learning Features
 * 
 * Implements Gold Standard PBL with AI-powered pitch coaching.
 * 
 * @module PBLFrameworkService
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
  PBLProject,
  InquiryPlan,
  AuthenticityElements,
  VoiceAndChoiceOptions,
  ReflectionPlan,
  CritiqueRevisionPlan,
  PublicProductPlan,
  ProjectMilestone,
  ProjectResource,
  PBLAssessmentPlan,
  PitchRubric,
  PBLProjectInstance,
  ProjectReflection,
  PitchSubmission,
  PitchAssessment,
  StandardReference,
  CredentialIssuanceRequest
} from './phase3-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface PBLProjectRepository {
  findById(tenantId: string, id: string): Promise<PBLProject | null>;
  findByCreator(tenantId: string, creatorId: string): Promise<PBLProject[]>;
  findPublished(tenantId: string): Promise<PBLProject[]>;
  search(tenantId: string, query: { subjectArea?: string; gradeLevel?: string; keywords?: string }): Promise<PBLProject[]>;
  save(tenantId: string, project: PBLProject): Promise<PBLProject>;
  update(tenantId: string, id: string, updates: Partial<PBLProject>): Promise<PBLProject>;
}

export interface PBLInstanceRepository {
  findById(tenantId: string, id: string): Promise<PBLProjectInstance | null>;
  findByProject(tenantId: string, projectId: string): Promise<PBLProjectInstance[]>;
  findByParticipant(tenantId: string, participantId: string): Promise<PBLProjectInstance[]>;
  findByFacilitator(tenantId: string, facilitatorId: string): Promise<PBLProjectInstance[]>;
  findActive(tenantId: string): Promise<PBLProjectInstance[]>;
  save(tenantId: string, instance: PBLProjectInstance): Promise<PBLProjectInstance>;
  update(tenantId: string, id: string, updates: Partial<PBLProjectInstance>): Promise<PBLProjectInstance>;
}

export interface PitchSubmissionRepository {
  findById(tenantId: string, id: string): Promise<PitchSubmission | null>;
  findByInstance(tenantId: string, instanceId: string): Promise<PitchSubmission | null>;
  save(tenantId: string, submission: PitchSubmission): Promise<PitchSubmission>;
  update(tenantId: string, id: string, updates: Partial<PitchSubmission>): Promise<PitchSubmission>;
}

export interface PitchCoachAI {
  analyzePitch(recordingUrl: string, rubric: PitchRubric): Promise<{
    scores: { criterionId: string; score: number; feedback: string }[];
    overallFeedback: string;
    suggestedImprovements: string[];
    strengths: string[];
  }>;
  generatePracticePrompts(context: string, rubric: PitchRubric): Promise<string[]>;
}

export interface CredentialProvider {
  issueCredential(request: CredentialIssuanceRequest): Promise<{ credentialId: string }>;
}

export interface PBLServiceConfig {
  enableAIPitchCoach: boolean;
  maxTeamSize: number;
  minReflectionsRequired: number;
  minPeerReviewRounds: number;
  credentialIssuanceEnabled: boolean;
  defaultPitchDuration: number;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class PBLFrameworkService extends ScholarlyBaseService {
  private readonly projectRepo: PBLProjectRepository;
  private readonly instanceRepo: PBLInstanceRepository;
  private readonly pitchRepo: PitchSubmissionRepository;
  private readonly pitchCoach: PitchCoachAI;
  private readonly credentialProvider: CredentialProvider;
  private readonly serviceConfig: PBLServiceConfig;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    projectRepo: PBLProjectRepository;
    instanceRepo: PBLInstanceRepository;
    pitchRepo: PitchSubmissionRepository;
    pitchCoach: PitchCoachAI;
    credentialProvider: CredentialProvider;
    serviceConfig: PBLServiceConfig;
  }) {
    super('PBLFrameworkService', deps);
    this.projectRepo = deps.projectRepo;
    this.instanceRepo = deps.instanceRepo;
    this.pitchRepo = deps.pitchRepo;
    this.pitchCoach = deps.pitchCoach;
    this.credentialProvider = deps.credentialProvider;
    this.serviceConfig = deps.serviceConfig;
  }

  // --------------------------------------------------------------------------
  // PROJECT TEMPLATE MANAGEMENT
  // --------------------------------------------------------------------------

  async createProject(
    tenantId: string,
    createdBy: string,
    projectData: {
      title: string;
      drivingQuestion: string;
      description: string;
      challengingProblem: string;
      sustainedInquiry: InquiryPlan;
      authenticity: AuthenticityElements;
      studentVoiceAndChoice: VoiceAndChoiceOptions;
      reflection: ReflectionPlan;
      critiqueAndRevision: CritiqueRevisionPlan;
      publicProduct: PublicProductPlan;
      alignedStandards: StandardReference[];
      subjectAreas: string[];
      gradeLevel: string[];
      estimatedDuration: { value: number; unit: 'days' | 'weeks' | 'months' };
      teamSize: { min: number; max: number };
      allowIndividual: boolean;
      milestones: Omit<ProjectMilestone, 'id'>[];
      resources: Omit<ProjectResource, 'id'>[];
      assessmentPlan: PBLAssessmentPlan;
    }
  ): Promise<Result<PBLProject>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(createdBy);
      Validator.required(projectData.title, 'title');
      Validator.required(projectData.drivingQuestion, 'drivingQuestion');
      
      if (projectData.teamSize.max > this.serviceConfig.maxTeamSize) {
        throw new ValidationError(`Maximum team size is ${this.serviceConfig.maxTeamSize}`);
      }
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createProject', tenantId, async () => {
      const project: PBLProject = {
        id: this.generateId('pbl'),
        tenantId,
        title: projectData.title,
        drivingQuestion: projectData.drivingQuestion,
        description: projectData.description,
        challengingProblem: projectData.challengingProblem,
        sustainedInquiry: projectData.sustainedInquiry,
        authenticity: projectData.authenticity,
        studentVoiceAndChoice: projectData.studentVoiceAndChoice,
        reflection: projectData.reflection,
        critiqueAndRevision: projectData.critiqueAndRevision,
        publicProduct: projectData.publicProduct,
        alignedStandards: projectData.alignedStandards,
        subjectAreas: projectData.subjectAreas,
        gradeLevel: projectData.gradeLevel,
        estimatedDuration: projectData.estimatedDuration,
        teamSize: projectData.teamSize,
        allowIndividual: projectData.allowIndividual,
        milestones: projectData.milestones.map(m => ({ ...m, id: this.generateId('milestone') })),
        resources: projectData.resources.map(r => ({ ...r, id: this.generateId('resource') })),
        assessmentPlan: projectData.assessmentPlan,
        status: 'draft',
        createdBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.projectRepo.save(tenantId, project);
      await this.publishEvent('scholarly.pbl.project_created', tenantId, { projectId: saved.id, title: saved.title });
      return saved;
    }, { title: projectData.title });
  }

  async publishProject(tenantId: string, projectId: string): Promise<Result<PBLProject>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('publishProject', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('PBLProject', projectId);

      this.validateGoldStandardPBL(project);

      const updated = await this.projectRepo.update(tenantId, projectId, {
        status: 'published',
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.pbl.project_published', tenantId, { projectId });
      return updated;
    }, { projectId });
  }

  private validateGoldStandardPBL(project: PBLProject): void {
    const errors: string[] = [];
    if (!project.drivingQuestion || project.drivingQuestion.length < 10) errors.push('Driving question required');
    if (!project.sustainedInquiry.initialQuestions || project.sustainedInquiry.initialQuestions.length < 2) errors.push('At least 2 initial questions required');
    if (!project.authenticity.realWorldContext) errors.push('Real-world context required');
    if (!project.authenticity.audienceDescription) errors.push('Audience description required');
    if (!project.reflection.checkpoints || project.reflection.checkpoints.length < 2) errors.push('At least 2 reflection checkpoints required');
    if (project.critiqueAndRevision.peerReviewRounds < this.serviceConfig.minPeerReviewRounds) errors.push(`At least ${this.serviceConfig.minPeerReviewRounds} peer review rounds required`);
    if (!project.publicProduct.productType) errors.push('Public product type required');
    if (project.milestones.length < 3) errors.push('At least 3 milestones required');
    if (errors.length > 0) throw new ValidationError(`Gold Standard PBL validation failed: ${errors.join('; ')}`);
  }

  async searchProjects(tenantId: string, query: { subjectArea?: string; gradeLevel?: string; keywords?: string }): Promise<Result<PBLProject[]>> {
    try { Validator.tenantId(tenantId); } catch (e) { return failure(e as ValidationError); }
    return this.withTiming('searchProjects', tenantId, async () => this.projectRepo.search(tenantId, query), {});
  }

  // --------------------------------------------------------------------------
  // PROJECT INSTANCE MANAGEMENT
  // --------------------------------------------------------------------------

  async startProjectInstance(
    tenantId: string,
    projectId: string,
    facilitatorId: string,
    facilitatorName: string,
    participants: { id: string; name: string }[],
    options?: { teamId?: string; customDrivingQuestion?: string; startDate?: Date; targetEndDate?: Date }
  ): Promise<Result<PBLProjectInstance>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
      Validator.userId(facilitatorId);
      if (!participants || participants.length === 0) throw new ValidationError('At least one participant required');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('startProjectInstance', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('PBLProject', projectId);
      if (project.status !== 'published') throw new ValidationError('Project must be published');

      const isTeam = participants.length > 1;
      if (isTeam && (participants.length < project.teamSize.min || participants.length > project.teamSize.max)) {
        throw new ValidationError(`Team size must be between ${project.teamSize.min} and ${project.teamSize.max}`);
      }
      if (!isTeam && !project.allowIndividual) throw new ValidationError('This project requires a team');

      const startDate = options?.startDate || new Date();
      const durationDays = this.calculateDurationDays(project.estimatedDuration);
      const targetEndDate = options?.targetEndDate || new Date(startDate.getTime() + durationDays * 86400000);

      const instance: PBLProjectInstance = {
        id: this.generateId('instance'),
        tenantId,
        projectId,
        projectTitle: project.title,
        isTeam,
        teamId: options?.teamId,
        participantIds: participants.map(p => p.id),
        participantNames: participants.map(p => p.name),
        facilitatorId,
        facilitatorName,
        customDrivingQuestion: options?.customDrivingQuestion,
        startDate,
        targetEndDate,
        currentPhase: 'launch',
        milestoneProgress: project.milestones.map(m => ({ milestoneId: m.id, status: 'not_started' })),
        reflections: [],
        peerReviews: [],
        status: 'active',
        credentialIssued: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.instanceRepo.save(tenantId, instance);
      await this.publishEvent('scholarly.pbl.instance_started', tenantId, { instanceId: saved.id, projectId, participantCount: participants.length });
      return saved;
    }, { projectId, participantCount: participants.length });
  }

  private calculateDurationDays(duration: { value: number; unit: 'days' | 'weeks' | 'months' }): number {
    switch (duration.unit) {
      case 'days': return duration.value;
      case 'weeks': return duration.value * 7;
      case 'months': return duration.value * 30;
      default: return 30;
    }
  }

  async updatePhase(tenantId: string, instanceId: string, newPhase: PBLProjectInstance['currentPhase']): Promise<Result<PBLProjectInstance>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(instanceId, 'instanceId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('updatePhase', tenantId, async () => {
      const instance = await this.instanceRepo.findById(tenantId, instanceId);
      if (!instance) throw new NotFoundError('PBLProjectInstance', instanceId);

      const validTransitions: Record<string, string[]> = {
        launch: ['build_knowledge'],
        build_knowledge: ['develop_and_critique'],
        develop_and_critique: ['present'],
        present: []
      };

      if (!validTransitions[instance.currentPhase].includes(newPhase)) {
        throw new ValidationError(`Cannot transition from ${instance.currentPhase} to ${newPhase}`);
      }

      const updated = await this.instanceRepo.update(tenantId, instanceId, { currentPhase: newPhase, updatedAt: new Date() });
      await this.publishEvent('scholarly.pbl.phase_changed', tenantId, { instanceId, oldPhase: instance.currentPhase, newPhase });
      return updated;
    }, { instanceId, newPhase });
  }

  async submitMilestone(tenantId: string, instanceId: string, milestoneId: string, submissionUrl: string): Promise<Result<PBLProjectInstance>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(instanceId, 'instanceId');
      Validator.required(milestoneId, 'milestoneId');
      Validator.required(submissionUrl, 'submissionUrl');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('submitMilestone', tenantId, async () => {
      const instance = await this.instanceRepo.findById(tenantId, instanceId);
      if (!instance) throw new NotFoundError('PBLProjectInstance', instanceId);

      const milestone = instance.milestoneProgress.find(m => m.milestoneId === milestoneId);
      if (!milestone) throw new NotFoundError('Milestone', milestoneId);

      milestone.status = 'completed';
      milestone.submissionUrl = submissionUrl;
      milestone.submittedAt = new Date();

      const updated = await this.instanceRepo.update(tenantId, instanceId, { milestoneProgress: instance.milestoneProgress, updatedAt: new Date() });
      await this.publishEvent('scholarly.pbl.milestone_submitted', tenantId, { instanceId, milestoneId });
      return updated;
    }, { instanceId, milestoneId });
  }

  async addReflection(tenantId: string, instanceId: string, authorId: string, authorName: string, prompt: string, response: string): Promise<Result<PBLProjectInstance>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(instanceId, 'instanceId');
      Validator.userId(authorId);
      Validator.required(response, 'response');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('addReflection', tenantId, async () => {
      const instance = await this.instanceRepo.findById(tenantId, instanceId);
      if (!instance) throw new NotFoundError('PBLProjectInstance', instanceId);
      if (!instance.participantIds.includes(authorId)) throw new AuthorizationError('Only participants can add reflections');

      const reflection: ProjectReflection = { id: this.generateId('reflection'), date: new Date(), prompt, response, authorId, authorName };
      instance.reflections.push(reflection);

      return this.instanceRepo.update(tenantId, instanceId, { reflections: instance.reflections, updatedAt: new Date() });
    }, { instanceId, authorId });
  }

  // --------------------------------------------------------------------------
  // PITCH MANAGEMENT
  // --------------------------------------------------------------------------

  async createPitchSubmission(tenantId: string, instanceId: string, pitchData: {
    presentationType: 'live' | 'recorded';
    scheduledTime?: Date;
    duration: number;
    audienceType: PitchSubmission['audienceType'];
    panelMembers?: { name: string; role: string }[];
  }): Promise<Result<PitchSubmission>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(instanceId, 'instanceId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createPitchSubmission', tenantId, async () => {
      const instance = await this.instanceRepo.findById(tenantId, instanceId);
      if (!instance) throw new NotFoundError('PBLProjectInstance', instanceId);

      const existingPitch = await this.pitchRepo.findByInstance(tenantId, instanceId);
      if (existingPitch) throw new ValidationError('Pitch submission already exists');

      const pitch: PitchSubmission = {
        id: this.generateId('pitch'),
        projectInstanceId: instanceId,
        presentationType: pitchData.presentationType,
        scheduledTime: pitchData.scheduledTime,
        duration: pitchData.duration || this.serviceConfig.defaultPitchDuration,
        audienceType: pitchData.audienceType,
        panelMembers: pitchData.panelMembers,
        aiPracticeSessions: [],
        assessments: [],
        status: 'preparing'
      };

      const saved = await this.pitchRepo.save(tenantId, pitch);
      await this.instanceRepo.update(tenantId, instanceId, { pitch: saved, updatedAt: new Date() });
      await this.publishEvent('scholarly.pbl.pitch_created', tenantId, { pitchId: saved.id, instanceId });
      return saved;
    }, { instanceId });
  }

  async practiceWithAICoach(tenantId: string, pitchId: string, recordingUrl: string): Promise<Result<{
    sessionId: string;
    feedback: string;
    scores: { criterion: string; score: number }[];
    suggestions: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(pitchId, 'pitchId');
      Validator.required(recordingUrl, 'recordingUrl');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('practiceWithAICoach', tenantId, async () => {
      if (!this.serviceConfig.enableAIPitchCoach) throw new ValidationError('AI pitch coach is not enabled');

      const pitch = await this.pitchRepo.findById(tenantId, pitchId);
      if (!pitch) throw new NotFoundError('PitchSubmission', pitchId);

      const instance = await this.instanceRepo.findById(tenantId, pitch.projectInstanceId);
      if (!instance) throw new NotFoundError('PBLProjectInstance', pitch.projectInstanceId);

      const project = await this.projectRepo.findById(tenantId, instance.projectId);
      if (!project?.assessmentPlan.summativeAssessment.pitchRubric) throw new ValidationError('No pitch rubric');

      const analysis = await this.pitchCoach.analyzePitch(recordingUrl, project.assessmentPlan.summativeAssessment.pitchRubric);
      const sessionId = this.generateId('practice');

      pitch.aiPracticeSessions.push({
        sessionId,
        date: new Date(),
        feedback: analysis.overallFeedback,
        scores: analysis.scores.map(s => ({ criterion: s.criterionId, score: s.score }))
      });

      await this.pitchRepo.update(tenantId, pitchId, { aiPracticeSessions: pitch.aiPracticeSessions });

      return {
        sessionId,
        feedback: analysis.overallFeedback,
        scores: analysis.scores.map(s => ({ criterion: s.criterionId, score: s.score })),
        suggestions: analysis.suggestedImprovements
      };
    }, { pitchId });
  }

  async uploadRecordedPitch(tenantId: string, pitchId: string, recordingUrl: string, slidesUrl?: string): Promise<Result<PitchSubmission>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(pitchId, 'pitchId');
      Validator.required(recordingUrl, 'recordingUrl');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('uploadRecordedPitch', tenantId, async () => {
      const pitch = await this.pitchRepo.findById(tenantId, pitchId);
      if (!pitch) throw new NotFoundError('PitchSubmission', pitchId);

      const updated = await this.pitchRepo.update(tenantId, pitchId, { recordingUrl, slidesUrl, submittedAt: new Date(), status: 'delivered' });
      await this.publishEvent('scholarly.pbl.pitch_submitted', tenantId, { pitchId, instanceId: pitch.projectInstanceId });
      return updated;
    }, { pitchId });
  }

  async submitPitchAssessment(tenantId: string, pitchId: string, assessment: {
    assessorId: string;
    assessorName: string;
    assessorType: 'teacher' | 'peer' | 'industry' | 'ai';
    rubricScores: { criterionId: string; score: number; comment?: string }[];
    strengths: string[];
    improvements: string[];
    questions: string[];
  }): Promise<Result<PitchSubmission>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(pitchId, 'pitchId');
      Validator.userId(assessment.assessorId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('submitPitchAssessment', tenantId, async () => {
      const pitch = await this.pitchRepo.findById(tenantId, pitchId);
      if (!pitch) throw new NotFoundError('PitchSubmission', pitchId);

      const totalScore = assessment.rubricScores.reduce((sum, s) => sum + s.score, 0);
      const pitchAssessment: PitchAssessment = {
        id: this.generateId('assess'),
        ...assessment,
        totalScore,
        assessedAt: new Date()
      };

      pitch.assessments.push(pitchAssessment);
      const updated = await this.pitchRepo.update(tenantId, pitchId, { assessments: pitch.assessments, status: 'assessed' });
      await this.publishEvent('scholarly.pbl.pitch_assessed', tenantId, { pitchId, assessorType: assessment.assessorType, totalScore });
      return updated;
    }, { pitchId });
  }

  // --------------------------------------------------------------------------
  // PROJECT COMPLETION
  // --------------------------------------------------------------------------

  async completeProject(
    tenantId: string,
    instanceId: string,
    finalAssessment: {
      rubricScores: { criterionId: string; score: number; feedback: string }[];
      totalScore: number;
      grade?: string;
      overallFeedback: string;
      assessedBy: string;
    },
    participantDids: Map<string, string>
  ): Promise<Result<{ instance: PBLProjectInstance; credentialIds: Map<string, string> }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(instanceId, 'instanceId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('completeProject', tenantId, async () => {
      const instance = await this.instanceRepo.findById(tenantId, instanceId);
      if (!instance) throw new NotFoundError('PBLProjectInstance', instanceId);

      const project = await this.projectRepo.findById(tenantId, instance.projectId);
      if (!project) throw new NotFoundError('PBLProject', instance.projectId);

      const completedMilestones = instance.milestoneProgress.filter(m => m.status === 'completed').length;
      if (completedMilestones < project.milestones.length) {
        throw new ValidationError(`All milestones must be completed. Completed: ${completedMilestones}/${project.milestones.length}`);
      }

      if (instance.reflections.length < this.serviceConfig.minReflectionsRequired) {
        throw new ValidationError(`Minimum ${this.serviceConfig.minReflectionsRequired} reflections required`);
      }

      instance.finalAssessment = { ...finalAssessment, assessedAt: new Date() };
      instance.status = 'completed';
      instance.actualEndDate = new Date();

      const credentialIds = new Map<string, string>();
      if (this.serviceConfig.credentialIssuanceEnabled) {
        for (const participantId of instance.participantIds) {
          const did = participantDids.get(participantId);
          if (did) {
            const result = await this.credentialProvider.issueCredential({
              recipientId: participantId,
              recipientDid: did,
              credentialType: 'PBLCompletionCredential',
              achievementData: {
                projectTitle: project.title,
                drivingQuestion: instance.customDrivingQuestion || project.drivingQuestion,
                subjectAreas: project.subjectAreas,
                finalScore: finalAssessment.totalScore,
                grade: finalAssessment.grade,
                completedAt: new Date().toISOString()
              },
              issuedBy: instance.facilitatorId
            });
            credentialIds.set(participantId, result.credentialId);
          }
        }
      }

      instance.credentialIssued = credentialIds.size > 0;
      const updated = await this.instanceRepo.update(tenantId, instanceId, {
        finalAssessment: instance.finalAssessment,
        status: instance.status,
        actualEndDate: instance.actualEndDate,
        credentialIssued: instance.credentialIssued,
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.pbl.project_completed', tenantId, { instanceId, projectId: instance.projectId, credentialsIssued: credentialIds.size });
      return { instance: updated, credentialIds };
    }, { instanceId });
  }

  async getProjectStatistics(tenantId: string, projectId?: string): Promise<Result<{
    totalInstances: number;
    activeInstances: number;
    completedInstances: number;
    averageCompletionRate: number;
    averageFinalScore: number;
    credentialsIssued: number;
  }>> {
    try { Validator.tenantId(tenantId); } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('getProjectStatistics', tenantId, async () => {
      const instances = projectId
        ? await this.instanceRepo.findByProject(tenantId, projectId)
        : await this.instanceRepo.findActive(tenantId);

      const completed = instances.filter(i => i.status === 'completed');
      const active = instances.filter(i => i.status === 'active');
      const withScores = completed.filter(i => i.finalAssessment?.totalScore);
      const credentialed = instances.filter(i => i.credentialIssued);

      return {
        totalInstances: instances.length,
        activeInstances: active.length,
        completedInstances: completed.length,
        averageCompletionRate: instances.length > 0 ? completed.length / instances.length : 0,
        averageFinalScore: withScores.length > 0 ? withScores.reduce((sum, i) => sum + (i.finalAssessment?.totalScore || 0), 0) / withScores.length : 0,
        credentialsIssued: credentialed.length
      };
    }, { projectId });
  }
}

export const PBL_SERVICE_VERSION = '1.0.0';
