/**
 * Industry Experience Module Service
 *
 * Phase 3: Advanced Learning Features
 *
 * ## The Granny Explanation
 *
 * Imagine a student learning to cook. They can read recipes and watch videos,
 * but nothing beats actually working in a real restaurant kitchen alongside
 * a professional chef. That's what the Industry Experience Module provides!
 *
 * It's a matchmaking service connecting:
 * - Students with internships, apprenticeships, and work placements
 * - Teachers with industry externships (short stints in companies)
 * - Schools with industry partners for project collaborations
 *
 * When a student completes a placement, the industry mentor issues a
 * Verifiable Credential proving their real-world skills. This goes into
 * their Learning Portfolio as proof they don't just know theory -- they've
 * DONE the work.
 *
 * ## Architecture
 *
 * This service provides:
 * - Industry partner management
 * - Opportunity posting and discovery
 * - AI-powered matching
 * - Application processing
 * - Placement management and tracking
 * - Progress logging and milestones
 * - Mentor evaluations
 * - Credential issuance integration
 *
 * @module IndustryExperienceService
 */

import { ScholarlyBaseService, Result, success, failure, type ServiceDependencies } from './base.service';
import { log } from '../lib/logger';

import {
  IndustryPartner,
  ContactInfo,
  PartnerLocation,
  ExperienceType,
  IndustryOpportunity,
  ExperienceApplication,
  ApplicationStatus,
  ExperiencePlacement,
  PlacementStatus,
  LearningPlan,
  ProgressLog,
  Milestone,
  MentorEvaluation,
  CredentialIssuanceRequest
} from './phase3-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface IndustryPartnerRepository {
  findById(tenantId: string, id: string): Promise<IndustryPartner | null>;
  findByStatus(tenantId: string, status: IndustryPartner['partnershipStatus']): Promise<IndustryPartner[]>;
  findByIndustry(tenantId: string, industry: string): Promise<IndustryPartner[]>;
  search(tenantId: string, query: { industry?: string; location?: string; experienceTypes?: ExperienceType[] }): Promise<IndustryPartner[]>;
  save(tenantId: string, partner: IndustryPartner): Promise<IndustryPartner>;
  update(tenantId: string, id: string, updates: Partial<IndustryPartner>): Promise<IndustryPartner>;
}

export interface IndustryOpportunityRepository {
  findById(tenantId: string, id: string): Promise<IndustryOpportunity | null>;
  findByPartner(tenantId: string, partnerId: string): Promise<IndustryOpportunity[]>;
  findActive(tenantId: string): Promise<IndustryOpportunity[]>;
  search(tenantId: string, query: OpportunitySearchQuery): Promise<IndustryOpportunity[]>;
  save(tenantId: string, opportunity: IndustryOpportunity): Promise<IndustryOpportunity>;
  update(tenantId: string, id: string, updates: Partial<IndustryOpportunity>): Promise<IndustryOpportunity>;
}

export interface ExperienceApplicationRepository {
  findById(tenantId: string, id: string): Promise<ExperienceApplication | null>;
  findByOpportunity(tenantId: string, opportunityId: string): Promise<ExperienceApplication[]>;
  findByApplicant(tenantId: string, applicantId: string): Promise<ExperienceApplication[]>;
  save(tenantId: string, application: ExperienceApplication): Promise<ExperienceApplication>;
  update(tenantId: string, id: string, updates: Partial<ExperienceApplication>): Promise<ExperienceApplication>;
}

export interface ExperiencePlacementRepository {
  findById(tenantId: string, id: string): Promise<ExperiencePlacement | null>;
  findByParticipant(tenantId: string, participantId: string): Promise<ExperiencePlacement[]>;
  findByPartner(tenantId: string, partnerId: string): Promise<ExperiencePlacement[]>;
  findByMentor(tenantId: string, mentorId: string): Promise<ExperiencePlacement[]>;
  findActive(tenantId: string): Promise<ExperiencePlacement[]>;
  save(tenantId: string, placement: ExperiencePlacement): Promise<ExperiencePlacement>;
  update(tenantId: string, id: string, updates: Partial<ExperiencePlacement>): Promise<ExperiencePlacement>;
}

export interface OpportunitySearchQuery {
  experienceType?: ExperienceType;
  industry?: string;
  location?: string;
  isRemote?: boolean;
  skillsRequired?: string[];
  gradeLevel?: string;
  startDateAfter?: Date;
  startDateBefore?: Date;
}

// ============================================================================
// EXTERNAL SERVICE INTERFACES
// ============================================================================

export interface MatchingAIProvider {
  matchOpportunities(
    applicantProfile: ApplicantProfile,
    opportunities: IndustryOpportunity[]
  ): Promise<{ opportunityId: string; score: number; rationale: string }[]>;

  matchApplicants(
    opportunity: IndustryOpportunity,
    applicants: ApplicantProfile[]
  ): Promise<{ applicantId: string; score: number; rationale: string }[]>;
}

export interface CredentialIssuanceProvider {
  issueCredential(request: CredentialIssuanceRequest): Promise<{ credentialId: string }>;
}

export interface ApplicantProfile {
  id: string;
  type: 'student' | 'educator';
  name: string;
  skills: string[];
  interests: string[];
  qualifications: string[];
  location?: string;
  availableFrom?: Date;
  preferredExperienceTypes?: ExperienceType[];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface IEMServiceConfig {
  maxApplicationsPerOpportunity: number;
  maxActiveApplicationsPerUser: number;
  requireSafeguardingVerification: boolean;
  autoMatchEnabled: boolean;
  credentialIssuanceEnabled: boolean;
  minimumPlacementHours: number;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class IndustryExperienceService extends ScholarlyBaseService {
  private readonly partnerRepo: IndustryPartnerRepository;
  private readonly opportunityRepo: IndustryOpportunityRepository;
  private readonly applicationRepo: ExperienceApplicationRepository;
  private readonly placementRepo: ExperiencePlacementRepository;
  private readonly matchingAI: MatchingAIProvider;
  private readonly credentialProvider: CredentialIssuanceProvider;
  private readonly serviceConfig: IEMServiceConfig;

  constructor(deps?: any) {
    super('IndustryExperienceService', deps);
    this.partnerRepo = deps?.partnerRepo;
    this.opportunityRepo = deps?.opportunityRepo;
    this.applicationRepo = deps?.applicationRepo;
    this.placementRepo = deps?.placementRepo;
    this.matchingAI = deps?.matchingAI;
    this.credentialProvider = deps?.credentialProvider;
    this.serviceConfig = deps?.serviceConfig || {
      maxApplicationsPerOpportunity: 50,
      maxActiveApplicationsPerUser: 5,
      requireSafeguardingVerification: true,
      autoMatchEnabled: true,
      credentialIssuanceEnabled: true,
      minimumPlacementHours: 40
    };
  }

  // --------------------------------------------------------------------------
  // PARTNER MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Register a new industry partner
   */
  async registerPartner(
    tenantId: string,
    partnerData: {
      name: string;
      description: string;
      industry: string;
      sector: string;
      size: IndustryPartner['size'];
      primaryContact: ContactInfo;
      locations: PartnerLocation[];
      offeredExperienceTypes: ExperienceType[];
      skillsOffered: string[];
    }
  ): Promise<Result<IndustryPartner>> {
    return this.withTiming('registerPartner', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!partnerData.name) {
        return failure({ code: 'VALIDATION_ERROR', message: 'name is required' });
      }
      if (!partnerData.industry) {
        return failure({ code: 'VALIDATION_ERROR', message: 'industry is required' });
      }
      if (!partnerData.primaryContact) {
        return failure({ code: 'VALIDATION_ERROR', message: 'primaryContact is required' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(partnerData.primaryContact.email)) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Invalid email format' });
      }

      const partner: IndustryPartner = {
        id: this.generateId('partner'),
        tenantId,
        name: partnerData.name,
        description: partnerData.description,
        industry: partnerData.industry,
        sector: partnerData.sector,
        size: partnerData.size,
        primaryContact: partnerData.primaryContact,
        secondaryContacts: [],
        locations: partnerData.locations,
        partnershipStatus: 'prospective',
        partnershipTier: 'bronze',
        offeredExperienceTypes: partnerData.offeredExperienceTypes,
        skillsOffered: partnerData.skillsOffered,
        industriesRepresented: [partnerData.industry],
        safeguardingVerified: false,
        insuranceVerified: false,
        totalPlacements: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.partnerRepo.save(tenantId, partner);

      await this.publishEvent('scholarly.iem.partner_registered', tenantId, {
        partnerId: saved.id,
        partnerName: saved.name,
        industry: saved.industry
      });

      log.info('Industry partner registered', {
        tenantId,
        partnerId: saved.id,
        partnerName: saved.name
      });

      return success(saved);
    });
  }

  /**
   * Activate a partner (after verification)
   */
  async activatePartner(
    tenantId: string,
    partnerId: string,
    verification: {
      safeguardingVerified: boolean;
      insuranceVerified: boolean;
      tier?: IndustryPartner['partnershipTier'];
    }
  ): Promise<Result<IndustryPartner>> {
    return this.withTiming('activatePartner', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!partnerId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'partnerId is required' });
      }

      const partner = await this.partnerRepo.findById(tenantId, partnerId);
      if (!partner) {
        return failure({ code: 'NOT_FOUND', message: `IndustryPartner not found: ${partnerId}` });
      }

      if (this.serviceConfig.requireSafeguardingVerification && !verification.safeguardingVerified) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Safeguarding verification required to activate partner' });
      }

      const updated = await this.partnerRepo.update(tenantId, partnerId, {
        partnershipStatus: 'active',
        partnershipStartDate: new Date(),
        safeguardingVerified: verification.safeguardingVerified,
        safeguardingVerifiedAt: verification.safeguardingVerified ? new Date() : undefined,
        insuranceVerified: verification.insuranceVerified,
        partnershipTier: verification.tier || 'bronze',
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.iem.partner_activated', tenantId, {
        partnerId,
        tier: updated.partnershipTier
      });

      return success(updated);
    });
  }

  // --------------------------------------------------------------------------
  // OPPORTUNITY MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Create a new industry experience opportunity
   */
  async createOpportunity(
    tenantId: string,
    partnerId: string,
    opportunityData: {
      title: string;
      description: string;
      experienceType: ExperienceType;
      skillsRequired: string[];
      qualificationsRequired: string[];
      duration: { value: number; unit: 'hours' | 'days' | 'weeks' | 'months' };
      schedule: IndustryOpportunity['schedule'];
      location: PartnerLocation;
      isRemote: boolean;
      compensation: IndustryOpportunity['compensation'];
      totalPositions: number;
      learningOutcomes: string[];
      applicationRequirements?: string[];
      mentorId?: string;
      mentorName?: string;
    }
  ): Promise<Result<IndustryOpportunity>> {
    return this.withTiming('createOpportunity', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!partnerId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'partnerId is required' });
      }
      if (!opportunityData.title) {
        return failure({ code: 'VALIDATION_ERROR', message: 'title is required' });
      }
      if (!opportunityData.experienceType) {
        return failure({ code: 'VALIDATION_ERROR', message: 'experienceType is required' });
      }

      const partner = await this.partnerRepo.findById(tenantId, partnerId);
      if (!partner) {
        return failure({ code: 'NOT_FOUND', message: `IndustryPartner not found: ${partnerId}` });
      }

      if (partner.partnershipStatus !== 'active') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Partner must be active to post opportunities' });
      }

      const opportunity: IndustryOpportunity = {
        id: this.generateId('opportunity'),
        tenantId,
        partnerId,
        partnerName: partner.name,
        title: opportunityData.title,
        description: opportunityData.description,
        experienceType: opportunityData.experienceType,
        skillsRequired: opportunityData.skillsRequired,
        qualificationsRequired: opportunityData.qualificationsRequired,
        duration: opportunityData.duration,
        schedule: opportunityData.schedule,
        location: opportunityData.location,
        isRemote: opportunityData.isRemote,
        isHybrid: opportunityData.isRemote && opportunityData.location.address !== '',
        compensation: opportunityData.compensation,
        totalPositions: opportunityData.totalPositions,
        filledPositions: 0,
        applicationRequirements: opportunityData.applicationRequirements || [],
        mentorId: opportunityData.mentorId,
        mentorName: opportunityData.mentorName,
        learningOutcomes: opportunityData.learningOutcomes,
        status: 'draft',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.opportunityRepo.save(tenantId, opportunity);

      await this.publishEvent('scholarly.iem.opportunity_created', tenantId, {
        opportunityId: saved.id,
        partnerId,
        experienceType: opportunityData.experienceType
      });

      return success(saved);
    });
  }

  /**
   * Publish an opportunity
   */
  async publishOpportunity(tenantId: string, opportunityId: string): Promise<Result<IndustryOpportunity>> {
    return this.withTiming('publishOpportunity', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!opportunityId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'opportunityId is required' });
      }

      const opportunity = await this.opportunityRepo.findById(tenantId, opportunityId);
      if (!opportunity) {
        return failure({ code: 'NOT_FOUND', message: `IndustryOpportunity not found: ${opportunityId}` });
      }

      if (opportunity.status !== 'draft') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Only draft opportunities can be published' });
      }

      const updated = await this.opportunityRepo.update(tenantId, opportunityId, {
        status: 'published',
        publishedAt: new Date(),
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.iem.opportunity_published', tenantId, {
        opportunityId,
        partnerId: opportunity.partnerId
      });

      return success(updated);
    });
  }

  /**
   * Search for opportunities
   */
  async searchOpportunities(
    tenantId: string,
    query: OpportunitySearchQuery
  ): Promise<Result<IndustryOpportunity[]>> {
    return this.withTiming('searchOpportunities', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }

      const results = await this.opportunityRepo.search(tenantId, query);
      return success(results);
    });
  }

  /**
   * Get AI-matched opportunities for an applicant
   */
  async getMatchedOpportunities(
    tenantId: string,
    applicantProfile: ApplicantProfile
  ): Promise<Result<{ opportunity: IndustryOpportunity; score: number; rationale: string }[]>> {
    return this.withTiming('getMatchedOpportunities', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!applicantProfile.id) {
        return failure({ code: 'VALIDATION_ERROR', message: 'applicantProfile.id is required' });
      }

      if (!this.serviceConfig.autoMatchEnabled) {
        const opportunities = await this.opportunityRepo.findActive(tenantId);
        return success(opportunities.map(o => ({
          opportunity: o,
          score: 0.5,
          rationale: 'Auto-matching disabled'
        })));
      }

      const opportunities = await this.opportunityRepo.findActive(tenantId);
      const matches = await this.matchingAI.matchOpportunities(applicantProfile, opportunities);

      const results: { opportunity: IndustryOpportunity; score: number; rationale: string }[] = [];
      for (const match of matches.sort((a, b) => b.score - a.score)) {
        const opportunity = opportunities.find(o => o.id === match.opportunityId);
        if (opportunity) {
          results.push({
            opportunity,
            score: match.score,
            rationale: match.rationale
          });
        }
      }

      return success(results);
    });
  }

  // --------------------------------------------------------------------------
  // APPLICATION MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Submit an application
   */
  async submitApplication(
    tenantId: string,
    opportunityId: string,
    applicant: {
      id: string;
      type: 'student' | 'educator';
      name: string;
      email: string;
    },
    applicationData: {
      coverLetter?: string;
      resumeUrl?: string;
      portfolioUrl?: string;
      responses: { questionId: string; response: string }[];
    }
  ): Promise<Result<ExperienceApplication>> {
    return this.withTiming('submitApplication', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!opportunityId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'opportunityId is required' });
      }
      if (!applicant.id || !applicant.id.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'applicant.id is required' });
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(applicant.email)) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Invalid email format' });
      }

      const opportunity = await this.opportunityRepo.findById(tenantId, opportunityId);
      if (!opportunity) {
        return failure({ code: 'NOT_FOUND', message: `IndustryOpportunity not found: ${opportunityId}` });
      }

      if (opportunity.status !== 'published' && opportunity.status !== 'accepting_applications') {
        return failure({ code: 'VALIDATION_ERROR', message: 'This opportunity is not accepting applications' });
      }

      if (opportunity.applicationDeadline && new Date() > opportunity.applicationDeadline) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Application deadline has passed' });
      }

      // Check existing applications
      const existingApps = await this.applicationRepo.findByApplicant(tenantId, applicant.id);
      const activeApps = existingApps.filter(a =>
        !['withdrawn', 'rejected', 'declined'].includes(a.status)
      );

      if (activeApps.length >= this.serviceConfig.maxActiveApplicationsPerUser) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: `Maximum of ${this.serviceConfig.maxActiveApplicationsPerUser} active applications allowed`
        });
      }

      if (existingApps.some(a => a.opportunityId === opportunityId && a.status !== 'withdrawn')) {
        return failure({ code: 'VALIDATION_ERROR', message: 'You have already applied to this opportunity' });
      }

      const application: ExperienceApplication = {
        id: this.generateId('application'),
        tenantId,
        opportunityId,
        applicantId: applicant.id,
        applicantType: applicant.type,
        applicantName: applicant.name,
        applicantEmail: applicant.email,
        coverLetter: applicationData.coverLetter,
        resumeUrl: applicationData.resumeUrl,
        portfolioUrl: applicationData.portfolioUrl,
        responses: applicationData.responses,
        status: 'submitted',
        statusHistory: [{
          status: 'submitted',
          timestamp: new Date()
        }],
        submittedAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.applicationRepo.save(tenantId, application);

      await this.publishEvent('scholarly.iem.application_submitted', tenantId, {
        applicationId: saved.id,
        opportunityId,
        applicantId: applicant.id
      });

      return success(saved);
    });
  }

  /**
   * Update application status
   */
  async updateApplicationStatus(
    tenantId: string,
    applicationId: string,
    newStatus: ApplicationStatus,
    note?: string
  ): Promise<Result<ExperienceApplication>> {
    return this.withTiming('updateApplicationStatus', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!applicationId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'applicationId is required' });
      }
      if (!newStatus) {
        return failure({ code: 'VALIDATION_ERROR', message: 'newStatus is required' });
      }

      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) {
        return failure({ code: 'NOT_FOUND', message: `ExperienceApplication not found: ${applicationId}` });
      }

      application.status = newStatus;
      application.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note
      });
      application.updatedAt = new Date();

      const updated = await this.applicationRepo.update(tenantId, applicationId, {
        status: application.status,
        statusHistory: application.statusHistory,
        updatedAt: application.updatedAt
      });

      await this.publishEvent('scholarly.iem.application_status_changed', tenantId, {
        applicationId,
        newStatus,
        applicantId: application.applicantId
      });

      // If accepted, create placement
      if (newStatus === 'accepted') {
        await this.createPlacementFromApplication(tenantId, application);
      }

      return success(updated);
    });
  }

  // --------------------------------------------------------------------------
  // PLACEMENT MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Create placement from accepted application
   */
  private async createPlacementFromApplication(
    tenantId: string,
    application: ExperienceApplication
  ): Promise<ExperiencePlacement> {
    const opportunity = await this.opportunityRepo.findById(tenantId, application.opportunityId);
    if (!opportunity) {
      throw new Error(`IndustryOpportunity not found: ${application.opportunityId}`);
    }

    const placement: ExperiencePlacement = {
      id: this.generateId('placement'),
      tenantId,
      opportunityId: application.opportunityId,
      applicationId: application.id,
      participantId: application.applicantId,
      participantType: application.applicantType,
      participantName: application.applicantName,
      mentorId: opportunity.mentorId!,
      mentorName: opportunity.mentorName!,
      partnerId: opportunity.partnerId,
      partnerName: opportunity.partnerName,
      startDate: opportunity.schedule.startDate || new Date(),
      endDate: opportunity.schedule.endDate || new Date(),
      actualHours: 0,
      targetHours: this.calculateTargetHours(opportunity),
      learningPlan: {
        objectives: opportunity.learningOutcomes,
        skills: opportunity.skillsRequired,
        activities: [],
        assessmentCriteria: []
      },
      progressLogs: [],
      milestones: [],
      mentorEvaluations: [],
      selfReflections: [],
      status: 'pending_start',
      credentialIssued: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const saved = await this.placementRepo.save(tenantId, placement);

    // Update opportunity filled positions
    await this.opportunityRepo.update(tenantId, application.opportunityId, {
      filledPositions: opportunity.filledPositions + 1,
      status: opportunity.filledPositions + 1 >= opportunity.totalPositions ? 'closed' : opportunity.status
    });

    await this.publishEvent('scholarly.iem.placement_created', tenantId, {
      placementId: saved.id,
      opportunityId: application.opportunityId,
      participantId: application.applicantId
    });

    return saved;
  }

  private calculateTargetHours(opportunity: IndustryOpportunity): number {
    const { value, unit } = opportunity.duration;
    switch (unit) {
      case 'hours': return value;
      case 'days': return value * 8;
      case 'weeks': return value * 40;
      case 'months': return value * 160;
      default: return 0;
    }
  }

  /**
   * Start a placement
   */
  async startPlacement(tenantId: string, placementId: string): Promise<Result<ExperiencePlacement>> {
    return this.withTiming('startPlacement', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!placementId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'placementId is required' });
      }

      const placement = await this.placementRepo.findById(tenantId, placementId);
      if (!placement) {
        return failure({ code: 'NOT_FOUND', message: `ExperiencePlacement not found: ${placementId}` });
      }

      if (placement.status !== 'pending_start') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Placement is not pending start' });
      }

      const updated = await this.placementRepo.update(tenantId, placementId, {
        status: 'active',
        startDate: new Date(),
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.iem.placement_started', tenantId, {
        placementId,
        participantId: placement.participantId
      });

      return success(updated);
    });
  }

  /**
   * Log progress
   */
  async logProgress(
    tenantId: string,
    placementId: string,
    logData: {
      hoursLogged: number;
      activitiesCompleted: string[];
      skillsDeveloped: string[];
      reflections: string;
    }
  ): Promise<Result<ExperiencePlacement>> {
    return this.withTiming('logProgress', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!placementId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'placementId is required' });
      }
      if (logData.hoursLogged <= 0) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Hours logged must be positive' });
      }

      const placement = await this.placementRepo.findById(tenantId, placementId);
      if (!placement) {
        return failure({ code: 'NOT_FOUND', message: `ExperiencePlacement not found: ${placementId}` });
      }

      if (placement.status !== 'active') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Placement must be active to log progress' });
      }

      const progressLog: ProgressLog = {
        id: this.generateId('log'),
        date: new Date(),
        hoursLogged: logData.hoursLogged,
        activitiesCompleted: logData.activitiesCompleted,
        skillsDeveloped: logData.skillsDeveloped,
        reflections: logData.reflections
      };

      placement.progressLogs.push(progressLog);
      placement.actualHours += logData.hoursLogged;

      const updated = await this.placementRepo.update(tenantId, placementId, {
        progressLogs: placement.progressLogs,
        actualHours: placement.actualHours,
        updatedAt: new Date()
      });

      return success(updated);
    });
  }

  /**
   * Submit mentor evaluation
   */
  async submitMentorEvaluation(
    tenantId: string,
    placementId: string,
    evaluation: {
      evaluatorId: string;
      evaluatorName: string;
      evaluatorRole: 'industry_mentor' | 'school_supervisor';
      overallRating: 1 | 2 | 3 | 4 | 5;
      skillRatings: { skill: string; rating: 1 | 2 | 3 | 4 | 5 }[];
      strengths: string[];
      areasForImprovement: string[];
      recommendationForCredential: boolean;
      additionalComments?: string;
    }
  ): Promise<Result<ExperiencePlacement>> {
    return this.withTiming('submitMentorEvaluation', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!placementId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'placementId is required' });
      }
      if (!evaluation.evaluatorId || !evaluation.evaluatorId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'evaluatorId is required' });
      }

      const placement = await this.placementRepo.findById(tenantId, placementId);
      if (!placement) {
        return failure({ code: 'NOT_FOUND', message: `ExperiencePlacement not found: ${placementId}` });
      }

      const mentorEval: MentorEvaluation = {
        id: this.generateId('eval'),
        ...evaluation,
        completedAt: new Date()
      };

      placement.mentorEvaluations.push(mentorEval);

      const updated = await this.placementRepo.update(tenantId, placementId, {
        mentorEvaluations: placement.mentorEvaluations,
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.iem.evaluation_submitted', tenantId, {
        placementId,
        evaluatorId: evaluation.evaluatorId,
        overallRating: evaluation.overallRating
      });

      return success(updated);
    });
  }

  /**
   * Complete a placement and issue credential
   */
  async completePlacement(
    tenantId: string,
    placementId: string,
    participantDid: string
  ): Promise<Result<{ placement: ExperiencePlacement; credentialId?: string }>> {
    return this.withTiming('completePlacement', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!placementId) {
        return failure({ code: 'VALIDATION_ERROR', message: 'placementId is required' });
      }

      const placement = await this.placementRepo.findById(tenantId, placementId);
      if (!placement) {
        return failure({ code: 'NOT_FOUND', message: `ExperiencePlacement not found: ${placementId}` });
      }

      if (placement.status !== 'active') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Placement must be active to complete' });
      }

      // Validate minimum hours
      if (placement.actualHours < this.serviceConfig.minimumPlacementHours) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: `Minimum ${this.serviceConfig.minimumPlacementHours} hours required. Logged: ${placement.actualHours}`
        });
      }

      // Check for mentor recommendation
      const hasRecommendation = placement.mentorEvaluations.some(e => e.recommendationForCredential);

      let credentialId: string | undefined;

      if (this.serviceConfig.credentialIssuanceEnabled && hasRecommendation && participantDid) {
        // Issue credential
        const opportunity = await this.opportunityRepo.findById(tenantId, placement.opportunityId);

        const credentialResult = await this.credentialProvider.issueCredential({
          recipientId: placement.participantId,
          recipientDid: participantDid,
          credentialType: 'IndustryExperienceCredential',
          achievementData: {
            opportunityTitle: opportunity?.title,
            partnerName: placement.partnerName,
            experienceType: opportunity?.experienceType,
            hoursCompleted: placement.actualHours,
            skillsDemonstrated: opportunity?.skillsRequired,
            learningOutcomes: opportunity?.learningOutcomes,
            mentorRating: placement.mentorEvaluations[0]?.overallRating,
            completedAt: new Date().toISOString()
          },
          issuedBy: placement.partnerId,
          evidence: placement.mentorEvaluations.map(e => JSON.stringify(e))
        });

        credentialId = credentialResult.credentialId;
      }

      const updated = await this.placementRepo.update(tenantId, placementId, {
        status: 'completed',
        completedAt: new Date(),
        credentialIssued: !!credentialId,
        credentialId,
        updatedAt: new Date()
      });

      // Update partner stats
      const partner = await this.partnerRepo.findById(tenantId, placement.partnerId);
      if (partner) {
        await this.partnerRepo.update(tenantId, placement.partnerId, {
          totalPlacements: partner.totalPlacements + 1
        });
      }

      await this.publishEvent('scholarly.iem.placement_completed', tenantId, {
        placementId,
        participantId: placement.participantId,
        credentialIssued: !!credentialId
      });

      return success({ placement: updated, credentialId });
    });
  }

  /**
   * Get placement statistics
   */
  async getPlacementStatistics(
    tenantId: string,
    filters?: { partnerId?: string; participantType?: 'student' | 'educator' }
  ): Promise<Result<{
    totalPlacements: number;
    activePlacements: number;
    completedPlacements: number;
    averageHours: number;
    credentialsIssued: number;
    byExperienceType: Record<ExperienceType, number>;
  }>> {
    return this.withTiming('getPlacementStatistics', async () => {
      if (!tenantId || !tenantId.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }

      let placements: ExperiencePlacement[];

      if (filters?.partnerId) {
        placements = await this.placementRepo.findByPartner(tenantId, filters.partnerId);
      } else {
        placements = await this.placementRepo.findActive(tenantId);
      }

      if (filters?.participantType) {
        placements = placements.filter(p => p.participantType === filters.participantType);
      }

      const completed = placements.filter(p => p.status === 'completed');
      const active = placements.filter(p => p.status === 'active');
      const credentialed = placements.filter(p => p.credentialIssued);

      const byExperienceType: Record<ExperienceType, number> = {
        apprenticeship: 0,
        traineeship: 0,
        internship_paid: 0,
        internship_unpaid: 0,
        work_placement: 0,
        industry_project: 0,
        job_shadow: 0,
        mentorship: 0,
        site_visit: 0,
        guest_lecture: 0,
        teacher_externship: 0
      };

      return success({
        totalPlacements: placements.length,
        activePlacements: active.length,
        completedPlacements: completed.length,
        averageHours: completed.length > 0
          ? completed.reduce((sum, p) => sum + p.actualHours, 0) / completed.length
          : 0,
        credentialsIssued: credentialed.length,
        byExperienceType
      });
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: IndustryExperienceService | null = null;

export function initializeIndustryExperienceService(deps?: any): IndustryExperienceService {
  if (!instance) {
    instance = new IndustryExperienceService(deps);
    log.info('IndustryExperienceService initialized');
  }
  return instance;
}

export function getIndustryExperienceService(): IndustryExperienceService {
  if (!instance) {
    throw new Error('IndustryExperienceService not initialized. Call initializeIndustryExperienceService() first.');
  }
  return instance;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export const IEM_SERVICE_VERSION = '1.0.0';
