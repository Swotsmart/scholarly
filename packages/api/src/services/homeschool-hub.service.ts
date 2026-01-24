/**
 * AI-Enabled Homeschool Hub
 *
 * A comprehensive platform for homeschool families to connect, collaborate,
 * form co-ops, plan excursions, share resources, and navigate compliance
 * requirements across jurisdictions.
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  Validator, EventBus, Cache, ScholarlyConfig, Jurisdiction
} from '@scholarly/shared/types/scholarly-types';

// ============================================================================
// TYPES
// ============================================================================

export type EducationalApproach =
  | 'traditional' | 'charlotte_mason' | 'classical' | 'montessori'
  | 'waldorf' | 'unschooling' | 'eclectic' | 'project_based'
  | 'online_hybrid' | 'school_at_home';

export interface HomeschoolFamily {
  id: string;
  tenantId: string;
  primaryContact: { userId: string; name: string; email: string; phone?: string };
  additionalContacts: { userId?: string; name: string; relationship: string; email?: string; canTeach: boolean }[];
  children: HomeschoolChild[];
  location: { jurisdiction: Jurisdiction; suburb: string; postcode: string; coordinates?: { lat: number; lng: number }; travelRadiusKm: number };
  educationalProfile: EducationalProfile;
  coopPreferences: CoopPreferences;
  teachingCapabilities: TeachingCapability[];
  compliance: ComplianceStatus;
  aiProfile: FamilyAIProfile;
  status: 'active' | 'inactive' | 'pending_verification';
  joinedAt: Date;
  lastActiveAt: Date;
}

export interface HomeschoolChild {
  id: string;
  name: string;
  dateOfBirth: Date;
  currentYearLevel: string;
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed';
  interests: string[];
  strengths: string[];
  challengeAreas: string[];
  specialNeeds?: string[];
  curriculumFramework: string;
  subjectProgress: SubjectProgress[];
  lisProfileId?: string;
  lisIntegrationEnabled: boolean;
  friendConnections: string[];
  coopParticipation: string[];
}

export interface SubjectProgress { subject: string; currentLevel: string; curriculumCodes: string[]; completedCodes: string[]; inProgressCodes: string[]; lastUpdated: Date; }
export interface EducationalProfile { primaryApproach: EducationalApproach; secondaryApproaches: EducationalApproach[]; structureLevel: 'highly_structured' | 'moderately_structured' | 'relaxed' | 'unschooling'; typicalDailySchedule?: string; prioritySubjects: string[]; enrichmentFocus: string[]; religiousAffiliation?: string; valuesEmphasis: string[]; assessmentStyle: 'formal_testing' | 'portfolio' | 'narrative' | 'minimal' | 'mixed'; }
export interface CoopPreferences { interestedInCoops: boolean; maxCoopsToJoin: number; willingToHost: boolean; willingToTeach: boolean; willingToOrganize: boolean; availableDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday')[]; preferredTimes: ('morning' | 'afternoon' | 'full_day')[]; preferredCoopSize: 'small' | 'medium' | 'large'; ageRangeTolerance: number; mustHave: string[]; dealBreakers: string[]; }
export interface TeachingCapability { subject: string; yearLevels: string[]; confidence: 'beginner' | 'intermediate' | 'advanced' | 'expert'; qualifications?: string[]; willingToTeachCoop: boolean; willingToTutor: boolean; notes?: string; }
export interface ComplianceStatus { jurisdiction: Jurisdiction; registrationStatus: 'registered' | 'pending' | 'exempt' | 'not_required'; registrationNumber?: string; registrationExpiry?: Date; documents: { type: string; name: string; status: 'current' | 'expiring_soon' | 'expired' | 'missing'; expiryDate?: Date; documentUrl?: string; lastUpdated?: Date }[]; lastReportSubmitted?: Date; nextReportDue?: Date; reportingFrequency: 'annual' | 'biannual' | 'quarterly' | 'none'; lastInspection?: Date; inspectionOutcome?: 'satisfactory' | 'improvements_required' | 'pending'; complianceScore: number; complianceAlerts: string[]; suggestedActions: string[]; }
export interface FamilyAIProfile { compatibilityVector: number[]; predictedChallenges: string[]; predictedStrengths: string[]; engagementScore: number; engagementTrend: 'increasing' | 'stable' | 'decreasing'; recommendedCoops: string[]; recommendedResources: string[]; recommendedConnections: string[]; supportNeedsScore: number; suggestedSupport: string[]; lastAnalyzed: Date; }

export interface HomeschoolCoop { id: string; tenantId: string; name: string; description: string; philosophy: string; primaryLocation: { name: string; address: string; coordinates?: { lat: number; lng: number } }; meetingLocations: { name: string; address: string; suitableFor: string[] }[]; members: CoopMember[]; maxMembers: number; membershipType: 'open' | 'application' | 'invitation'; structure: CoopStructure; schedule: CoopSchedule; subjects: CoopSubject[]; governance: CoopGovernance; finances: CoopFinances; aiInsights: CoopAIInsights; status: 'forming' | 'active' | 'paused' | 'dissolved'; foundedAt: Date; }
export interface CoopMember { familyId: string; familyName: string; childrenIds: string[]; role: 'founder' | 'admin' | 'teacher' | 'member'; responsibilities: string[]; teachingCommitments: { subject: string; frequency: string; yearLevels: string[] }[]; attendanceRate: number; lastAttended?: Date; status: 'active' | 'on_break' | 'leaving'; joinedAt: Date; }
export interface CoopStructure { type: 'rotating_parent' | 'specialist_parent' | 'hired_teachers' | 'hybrid'; rotationSchedule?: { familyId: string; subjects: string[]; frequency: string }[]; specialists?: { familyId: string; subject: string; ongoing: boolean }[]; classGroupings: 'single_age' | 'multi_age' | 'ability_based' | 'interest_based'; sharedAssessment: boolean; portfolioSharing: boolean; }
export interface CoopSchedule { regularMeetings: { day: string; startTime: string; endTime: string; focus: string; location: string }[]; termDates: { term: string; startDate: string; endDate: string }[]; breaks: { name: string; startDate: string; endDate: string }[]; upcomingEvents: CoopEvent[]; }
export interface CoopEvent { id: string; name: string; type: 'excursion' | 'performance' | 'showcase' | 'social' | 'workshop' | 'other'; date: string; time?: string; location: string; description: string; targetYearLevels: string[]; maxParticipants?: number; registeredFamilies: string[]; curriculumConnections: string[]; costPerChild?: number; costPerFamily?: number; status: 'proposed' | 'confirmed' | 'cancelled' | 'completed'; }
export interface CoopSubject { subject: string; yearLevels: string[]; taughtBy: 'rotating' | 'specialist'; currentTeacher?: { familyId: string; name: string }; frequency: string; duration: number; curriculumApproach: string; curriculumCodes?: string[]; sharedResources: string[]; resourceCost?: number; }
export interface CoopGovernance { decisionMaking: 'consensus' | 'majority_vote' | 'leadership_decides'; leaders: { role: string; familyId: string; name: string; term?: string }[]; policies: { name: string; description: string; lastUpdated: Date }[]; communicationPlatform: string; meetingFrequency: string; }
export interface CoopFinances { model: 'free' | 'cost_share' | 'membership_fee' | 'pay_per_class'; membershipFee?: { amount: number; frequency: string }; classFees?: { subject: string; amount: number }[]; sharedCosts: { item: string; totalCost: number; perFamilyCost: number; frequency: string }[]; currentBalance?: number; outstandingPayments: { familyId: string; amount: number; dueDate: string }[]; }
export interface CoopAIInsights { healthScore: number; healthFactors: { factor: string; score: number; trend: string }[]; engagementLevel: 'thriving' | 'healthy' | 'struggling' | 'at_risk'; engagementIssues: string[]; teachingLoadBalance: number; participationBalance: number; recommendations: { priority: 'high' | 'medium' | 'low'; type: 'membership' | 'schedule' | 'curriculum' | 'engagement' | 'conflict'; suggestion: string; rationale: string }[]; predictions: { metric: string; prediction: string; confidence: number; timeframe: string }[]; potentialConflicts: { type: string; parties: string[]; severity: 'low' | 'medium' | 'high'; suggestion: string }[]; lastAnalyzed: Date; }

export type ExcursionType = 'museum' | 'science_centre' | 'zoo_wildlife' | 'historical_site' | 'nature_outdoor' | 'arts_performance' | 'industry_visit' | 'sports_recreation' | 'workshop' | 'community_service' | 'other';
export interface Excursion { id: string; tenantId: string; title: string; description: string; type: ExcursionType; organizerId: string; organizerType: 'family' | 'coop'; organizerName: string; venue: { name: string; address: string; coordinates?: { lat: number; lng: number }; website?: string; contactPhone?: string }; date: string; startTime: string; endTime: string; duration: number; openTo: 'organizer_only' | 'coop_members' | 'network' | 'public'; targetYearLevels: string[]; minParticipants: number; maxParticipants: number; registrations: ExcursionRegistration[]; waitlist: ExcursionRegistration[]; costStructure: { childCost: number; adultCost: number; familyCap?: number; includesWhat: string[] }; curriculumConnections: CurriculumConnection[]; logistics: ExcursionLogistics; aiEnhancements: ExcursionAIEnhancements; status: 'draft' | 'open' | 'full' | 'confirmed' | 'completed' | 'cancelled'; createdAt: Date; }
export interface ExcursionRegistration { familyId: string; familyName: string; children: { childId: string; name: string; yearLevel: string }[]; adults: number; totalCost: number; paymentStatus: 'pending' | 'paid' | 'refunded'; specialRequirements?: string; registeredAt: Date; }
export interface CurriculumConnection { curriculumCode: string; subject: string; description: string; activitySuggestion: string; connectionStrength: 'primary' | 'secondary' | 'enrichment'; }
export interface ExcursionLogistics { transport: 'self_drive' | 'carpool' | 'bus' | 'public_transport' | 'walking'; meetingPoint?: string; carpoolCoordination?: boolean; adultToChildRatio: number; minimumAdults: number; toBring: string[]; riskAssessmentCompleted: boolean; emergencyProcedures?: string; firstAidResponsible?: string; wheelchairAccessible: boolean; accessibilityNotes?: string; }
export interface ExcursionAIEnhancements { suggestedCurriculumCodes: { code: string; relevance: number; preActivityIdea: string; postActivityIdea: string }[]; preExcursionActivities: string[]; postExcursionActivities: string[]; discussionQuestions: string[]; relatedVenues: { name: string; distance: number; relevance: number }[]; bestTimeToVisit?: string; crowdPrediction?: 'quiet' | 'moderate' | 'busy'; groupDiscountAvailable: boolean; suggestedCombinations?: string[]; }

export interface CommunityPost { id: string; tenantId: string; authorId: string; authorName: string; authorType: 'family' | 'coop'; title?: string; content: string; type: 'discussion' | 'question' | 'resource' | 'event' | 'recommendation' | 'success_story'; categories: string[]; yearLevels: string[]; subjects: string[]; attachments: { type: string; url: string; name: string }[]; likes: number; likedBy: string[]; comments: CommunityComment[]; shares: number; visibility: 'public' | 'local' | 'coop' | 'connections'; status: 'active' | 'archived' | 'removed'; createdAt: Date; updatedAt: Date; }
export interface CommunityComment { id: string; authorId: string; authorName: string; content: string; likes: number; parentCommentId?: string; createdAt: Date; }
export interface SharedResource { id: string; tenantId: string; creatorId: string; creatorName: string; title: string; description: string; type: 'lesson_plan' | 'worksheet' | 'curriculum_map' | 'book_list' | 'unit_study' | 'printable' | 'link_collection' | 'other'; files: { name: string; url: string; type: string; size: number }[]; externalLinks: { title: string; url: string }[]; subjects: string[]; yearLevels: string[]; educationalApproaches: EducationalApproach[]; curriculumCodes: string[]; license: 'free_use' | 'attribution' | 'non_commercial' | 'restricted'; downloads: number; rating: number; ratingCount: number; reviews: { reviewerId: string; reviewerName: string; rating: number; comment: string; helpful: number; createdAt: Date }[]; status: 'active' | 'archived'; createdAt: Date; }

// ============================================================================
// REPOSITORIES
// ============================================================================

export interface HomeschoolFamilyRepository {
  findById(tenantId: string, id: string): Promise<HomeschoolFamily | null>;
  findByUserId(tenantId: string, userId: string): Promise<HomeschoolFamily | null>;
  findNearby(tenantId: string, location: { lat: number; lng: number }, radiusKm: number): Promise<HomeschoolFamily[]>;
  findByJurisdiction(tenantId: string, jurisdiction: Jurisdiction): Promise<HomeschoolFamily[]>;
  findCompatible(tenantId: string, familyId: string, limit: number): Promise<HomeschoolFamily[]>;
  save(tenantId: string, family: HomeschoolFamily): Promise<HomeschoolFamily>;
  update(tenantId: string, id: string, updates: Partial<HomeschoolFamily>): Promise<HomeschoolFamily>;
}

export interface CoopRepository {
  findById(tenantId: string, id: string): Promise<HomeschoolCoop | null>;
  findByMember(tenantId: string, familyId: string): Promise<HomeschoolCoop[]>;
  findNearby(tenantId: string, location: { lat: number; lng: number }, radiusKm: number): Promise<HomeschoolCoop[]>;
  findAcceptingMembers(tenantId: string): Promise<HomeschoolCoop[]>;
  save(tenantId: string, coop: HomeschoolCoop): Promise<HomeschoolCoop>;
  update(tenantId: string, id: string, updates: Partial<HomeschoolCoop>): Promise<HomeschoolCoop>;
}

export interface ExcursionRepository {
  findById(tenantId: string, id: string): Promise<Excursion | null>;
  findUpcoming(tenantId: string, filters?: { type?: ExcursionType; yearLevels?: string[]; dateFrom?: string; dateTo?: string; maxCost?: number; hasSpots?: boolean }): Promise<Excursion[]>;
  findByOrganizer(tenantId: string, organizerId: string): Promise<Excursion[]>;
  findRegistered(tenantId: string, familyId: string): Promise<Excursion[]>;
  save(tenantId: string, excursion: Excursion): Promise<Excursion>;
  update(tenantId: string, id: string, updates: Partial<Excursion>): Promise<Excursion>;
}

export interface CommunityRepository {
  findPosts(tenantId: string, filters?: { type?: string; categories?: string[]; yearLevels?: string[] }): Promise<CommunityPost[]>;
  findResources(tenantId: string, filters?: { type?: string; subjects?: string[]; yearLevels?: string[]; approaches?: EducationalApproach[] }): Promise<SharedResource[]>;
  savePost(tenantId: string, post: CommunityPost): Promise<CommunityPost>;
  saveResource(tenantId: string, resource: SharedResource): Promise<SharedResource>;
}

interface FamilyMatch { familyId: string; familyName: string; totalScore: number; breakdown: Record<string, number>; matchReasons: string[]; childrenOverlap: { child1Name: string; child2Name: string; yearLevelDiff: number; sharedInterests: string[] }[]; distance?: number; sharedInterests: string[]; }
interface JurisdictionRequirements { registrationRequired: boolean; registrationAuthority: string; requiredDocuments: string[]; reportingFrequency: 'annual' | 'biannual' | 'quarterly' | 'none'; inspectionPossible: boolean; curriculumRequirement: string; }
interface ComplianceAlert { type: 'registration' | 'document' | 'reporting' | 'inspection'; severity: 'low' | 'medium' | 'high'; message: string; action: string; deadline?: Date; }
interface ComplianceReport { familyId: string; type: string; generatedAt: Date; jurisdiction: Jurisdiction; children: { name: string; yearLevel: string; subjectsCovered: string[]; curriculumCodesAddressed: string[] }[]; summary: string; curriculumCoverage: string; assessmentEvidence: string; }
interface ExcursionSuggestion { venueId: string; venueName: string; venueType: ExcursionType; address: string; distance: number; relevanceScore: number; curriculumConnections: string[]; suggestedActivities: string[]; estimatedCost: number; bestFor: string[]; bookingRequired: boolean; }

// ============================================================================
// SERVICE
// ============================================================================

export class HomeschoolHubService extends ScholarlyBaseService {
  private readonly familyRepo: HomeschoolFamilyRepository;
  private readonly coopRepo: CoopRepository;
  private readonly excursionRepo: ExcursionRepository;
  private readonly communityRepo: CommunityRepository;

  constructor(deps: {
    eventBus: EventBus; cache: Cache; config: ScholarlyConfig;
    familyRepo: HomeschoolFamilyRepository; coopRepo: CoopRepository;
    excursionRepo: ExcursionRepository; communityRepo: CommunityRepository;
  }) {
    super('HomeschoolHubService', deps);
    this.familyRepo = deps.familyRepo;
    this.coopRepo = deps.coopRepo;
    this.excursionRepo = deps.excursionRepo;
    this.communityRepo = deps.communityRepo;
  }

  async registerFamily(tenantId: string, data: {
    primaryContact: { userId: string; name: string; email: string };
    children: Omit<HomeschoolChild, 'id' | 'lisProfileId' | 'lisIntegrationEnabled' | 'friendConnections' | 'coopParticipation'>[];
    location: HomeschoolFamily['location'];
    educationalProfile: EducationalProfile;
  }): Promise<Result<HomeschoolFamily>> {
    try { Validator.tenantId(tenantId); Validator.required(data.primaryContact.email, 'email'); } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('registerFamily', tenantId, async () => {
      const children: HomeschoolChild[] = data.children.map(child => ({
        ...child, id: this.generateId('child'), lisIntegrationEnabled: false, friendConnections: [], coopParticipation: [],
        subjectProgress: this.initializeSubjectProgress(child.currentYearLevel)
      }));
      const requirements = this.getJurisdictionRequirements(data.location.jurisdiction);
      const family: HomeschoolFamily = {
        id: this.generateId('family'), tenantId, primaryContact: data.primaryContact, additionalContacts: [], children, location: data.location,
        educationalProfile: data.educationalProfile, coopPreferences: this.defaultCoopPreferences(), teachingCapabilities: [],
        compliance: { jurisdiction: data.location.jurisdiction, registrationStatus: requirements.registrationRequired ? 'pending' : 'not_required',
          documents: requirements.requiredDocuments.map(doc => ({ type: doc, name: doc, status: 'missing' as const })),
          reportingFrequency: requirements.reportingFrequency, complianceScore: 0, complianceAlerts: requirements.registrationRequired ? ['Registration required'] : [], suggestedActions: [] },
        aiProfile: this.generateFamilyAIProfile(), status: 'active', joinedAt: new Date(), lastActiveAt: new Date()
      };
      const saved = await this.familyRepo.save(tenantId, family);
      await this.publishEvent('scholarly.homeschool.family_registered', tenantId, { familyId: saved.id, jurisdiction: data.location.jurisdiction });
      return saved;
    }, {});
  }

  async findCompatibleFamilies(tenantId: string, familyId: string, options?: { maxResults?: number; prioritize?: 'location' | 'philosophy' | 'children_ages' | 'interests' }): Promise<Result<{ matches: FamilyMatch[]; matchingFactors: string[] }>> {
    try { Validator.tenantId(tenantId); Validator.required(familyId, 'familyId'); } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('findCompatibleFamilies', tenantId, async () => {
      const family = await this.familyRepo.findById(tenantId, familyId);
      if (!family) throw new NotFoundError('Family', familyId);
      const nearbyFamilies = family.location.coordinates
        ? await this.familyRepo.findNearby(tenantId, family.location.coordinates, family.location.travelRadiusKm)
        : await this.familyRepo.findByJurisdiction(tenantId, family.location.jurisdiction);
      const matches: FamilyMatch[] = nearbyFamilies.filter(c => c.id !== familyId).map(candidate => this.calculateFamilyCompatibility(family, candidate, options?.prioritize)).filter(m => m.totalScore > 50);
      matches.sort((a, b) => b.totalScore - a.totalScore);
      return { matches: matches.slice(0, options?.maxResults || 20), matchingFactors: this.analyzeMatchingFactors(matches) };
    }, { familyId });
  }

  async createCoop(tenantId: string, data: { name: string; description: string; philosophy: string; founderFamilyId: string; initialMembers: string[]; structure: CoopStructure; schedule: CoopSchedule; governance: CoopGovernance; finances: CoopFinances }): Promise<Result<HomeschoolCoop>> {
    try { Validator.tenantId(tenantId); Validator.required(data.name, 'name'); Validator.required(data.founderFamilyId, 'founderFamilyId'); } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('createCoop', tenantId, async () => {
      const founder = await this.familyRepo.findById(tenantId, data.founderFamilyId);
      if (!founder) throw new NotFoundError('Founder family', data.founderFamilyId);
      const members: CoopMember[] = [{ familyId: data.founderFamilyId, familyName: founder.primaryContact.name, childrenIds: founder.children.map(c => c.id), role: 'founder', responsibilities: ['Overall coordination'], teachingCommitments: [], attendanceRate: 100, status: 'active', joinedAt: new Date() }];
      for (const memberId of data.initialMembers) {
        const memberFamily = await this.familyRepo.findById(tenantId, memberId);
        if (memberFamily) members.push({ familyId: memberId, familyName: memberFamily.primaryContact.name, childrenIds: memberFamily.children.map(c => c.id), role: 'member', responsibilities: [], teachingCommitments: [], attendanceRate: 100, status: 'active', joinedAt: new Date() });
      }
      const coop: HomeschoolCoop = { id: this.generateId('coop'), tenantId, name: data.name, description: data.description, philosophy: data.philosophy, primaryLocation: { name: 'TBD', address: founder.location.suburb }, meetingLocations: [], members, maxMembers: 15, membershipType: 'application', structure: data.structure, schedule: data.schedule, subjects: [], governance: data.governance, finances: data.finances, aiInsights: this.generateCoopAIInsights(members), status: 'forming', foundedAt: new Date() };
      const saved = await this.coopRepo.save(tenantId, coop);
      await this.publishEvent('scholarly.homeschool.coop_created', tenantId, { coopId: saved.id, name: data.name });
      return saved;
    }, {});
  }

  async analyzeCoopHealth(tenantId: string, coopId: string): Promise<Result<CoopAIInsights>> {
    try { Validator.tenantId(tenantId); Validator.required(coopId, 'coopId'); } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('analyzeCoopHealth', tenantId, async () => {
      const coop = await this.coopRepo.findById(tenantId, coopId);
      if (!coop) throw new NotFoundError('Co-op', coopId);
      const memberEngagement = this.analyzeMemberEngagement(coop.members);
      const teachingBalance = this.analyzeTeachingBalance(coop);
      const participationBalance = this.analyzeParticipationBalance(coop.members);
      const financialHealth = this.analyzeFinancialHealth(coop.finances);
      const insights: CoopAIInsights = {
        healthScore: Math.round((memberEngagement + teachingBalance + participationBalance + financialHealth) / 4),
        healthFactors: [{ factor: 'Member Engagement', score: memberEngagement, trend: 'stable' }, { factor: 'Teaching Load', score: teachingBalance, trend: 'stable' }, { factor: 'Participation', score: participationBalance, trend: 'stable' }, { factor: 'Financial', score: financialHealth, trend: 'stable' }],
        engagementLevel: memberEngagement > 80 ? 'thriving' : memberEngagement > 60 ? 'healthy' : memberEngagement > 40 ? 'struggling' : 'at_risk',
        engagementIssues: memberEngagement < 60 ? ['Some members showing reduced participation'] : [],
        teachingLoadBalance: teachingBalance, participationBalance,
        recommendations: this.generateCoopRecommendations(memberEngagement, teachingBalance, participationBalance),
        predictions: [{ metric: 'Membership', prediction: memberEngagement > 80 ? 'Likely to grow' : 'Stable', confidence: 0.7, timeframe: 'Next 6 months' }],
        potentialConflicts: [], lastAnalyzed: new Date()
      };
      await this.coopRepo.update(tenantId, coopId, { aiInsights: insights });
      return insights;
    }, { coopId });
  }

  async createExcursion(tenantId: string, data: Omit<Excursion, 'id' | 'tenantId' | 'registrations' | 'waitlist' | 'aiEnhancements' | 'status' | 'createdAt'>): Promise<Result<Excursion>> {
    try { Validator.tenantId(tenantId); Validator.required(data.title, 'title'); Validator.required(data.venue, 'venue'); Validator.required(data.date, 'date'); } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('createExcursion', tenantId, async () => {
      const aiEnhancements = this.generateExcursionAIEnhancements(data.venue, data.targetYearLevels, data.curriculumConnections);
      const excursion: Excursion = { ...data, id: this.generateId('excursion'), tenantId, registrations: [], waitlist: [], aiEnhancements, status: 'draft', createdAt: new Date() };
      const saved = await this.excursionRepo.save(tenantId, excursion);
      await this.publishEvent('scholarly.homeschool.excursion_created', tenantId, { excursionId: saved.id, title: data.title, date: data.date });
      return saved;
    }, {});
  }

  async registerForExcursion(tenantId: string, excursionId: string, registration: { familyId: string; childrenIds: string[]; adults: number; specialRequirements?: string }): Promise<Result<{ excursion: Excursion; registration: ExcursionRegistration; status: 'registered' | 'waitlisted' }>> {
    try { Validator.tenantId(tenantId); Validator.required(excursionId, 'excursionId'); Validator.required(registration.familyId, 'familyId'); } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('registerForExcursion', tenantId, async () => {
      const excursion = await this.excursionRepo.findById(tenantId, excursionId);
      if (!excursion) throw new NotFoundError('Excursion', excursionId);
      const family = await this.familyRepo.findById(tenantId, registration.familyId);
      if (!family) throw new NotFoundError('Family', registration.familyId);
      if (excursion.registrations.some(r => r.familyId === registration.familyId)) throw new ValidationError('Family already registered');

      const children = family.children.filter(c => registration.childrenIds.includes(c.id)).map(c => ({ childId: c.id, name: c.name, yearLevel: c.currentYearLevel }));
      const totalCost = (children.length * excursion.costStructure.childCost) + (registration.adults * excursion.costStructure.adultCost);
      const finalCost = excursion.costStructure.familyCap ? Math.min(totalCost, excursion.costStructure.familyCap) : totalCost;
      const newReg: ExcursionRegistration = { familyId: registration.familyId, familyName: family.primaryContact.name, children, adults: registration.adults, totalCost: finalCost, paymentStatus: 'pending', specialRequirements: registration.specialRequirements, registeredAt: new Date() };

      const currentCount = excursion.registrations.reduce((sum, r) => sum + r.children.length, 0);
      let status: 'registered' | 'waitlisted';
      if (currentCount + children.length <= excursion.maxParticipants) { excursion.registrations.push(newReg); status = 'registered'; }
      else { excursion.waitlist.push(newReg); status = 'waitlisted'; }
      if (excursion.registrations.reduce((s, r) => s + r.children.length, 0) >= excursion.maxParticipants) excursion.status = 'full';

      const updated = await this.excursionRepo.update(tenantId, excursionId, excursion);
      await this.publishEvent('scholarly.homeschool.excursion_registration', tenantId, { excursionId, familyId: registration.familyId, status });
      return { excursion: updated, registration: newReg, status };
    }, { excursionId });
  }

  async checkComplianceStatus(tenantId: string, familyId: string): Promise<Result<{ status: ComplianceStatus; alerts: ComplianceAlert[]; score: number }>> {
    try { Validator.tenantId(tenantId); Validator.required(familyId, 'familyId'); } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('checkComplianceStatus', tenantId, async () => {
      const family = await this.familyRepo.findById(tenantId, familyId);
      if (!family) throw new NotFoundError('Family', familyId);
      const requirements = this.getJurisdictionRequirements(family.location.jurisdiction);
      const alerts: ComplianceAlert[] = [];

      if (requirements.registrationRequired && family.compliance.registrationStatus !== 'registered')
        alerts.push({ type: 'registration', severity: 'high', message: 'Registration required but not complete', action: 'Complete registration' });
      for (const doc of family.compliance.documents) {
        if (doc.status === 'expiring_soon') alerts.push({ type: 'document', severity: 'medium', message: `${doc.name} expiring soon`, action: 'Renew document', deadline: doc.expiryDate });
        if (doc.status === 'expired' || doc.status === 'missing') alerts.push({ type: 'document', severity: 'high', message: `${doc.name} is ${doc.status}`, action: doc.status === 'missing' ? 'Submit document' : 'Renew document' });
      }
      if (family.compliance.nextReportDue) {
        const daysUntilDue = Math.ceil((new Date(family.compliance.nextReportDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntilDue < 30) alerts.push({ type: 'reporting', severity: daysUntilDue < 7 ? 'high' : 'medium', message: `Progress report due in ${daysUntilDue} days`, action: 'Submit report', deadline: family.compliance.nextReportDue });
      }

      const score = this.calculateComplianceScore(family, requirements, alerts);
      family.compliance.complianceScore = score;
      family.compliance.complianceAlerts = alerts.map(a => a.message);
      await this.familyRepo.update(tenantId, familyId, { compliance: family.compliance });
      return { status: family.compliance, alerts, score };
    }, { familyId });
  }

  async getCommunityFeed(tenantId: string, familyId: string, options?: { limit?: number; offset?: number; types?: string[] }): Promise<Result<{ posts: CommunityPost[]; resources: SharedResource[]; excursions: Excursion[]; coopAnnouncements: { coopId: string; coopName: string; message: string }[] }>> {
    try { Validator.tenantId(tenantId); Validator.required(familyId, 'familyId'); } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('getCommunityFeed', tenantId, async () => {
      const family = await this.familyRepo.findById(tenantId, familyId);
      if (!family) throw new NotFoundError('Family', familyId);
      const yearLevels = family.children.map(c => c.currentYearLevel);
      const posts = await this.communityRepo.findPosts(tenantId, { yearLevels, type: options?.types?.[0] });
      const resources = await this.communityRepo.findResources(tenantId, { yearLevels, approaches: [family.educationalProfile.primaryApproach] });
      const excursions = await this.excursionRepo.findUpcoming(tenantId, { yearLevels, hasSpots: true });
      const coops = await this.coopRepo.findByMember(tenantId, familyId);
      const coopAnnouncements = coops.flatMap(coop => coop.schedule.upcomingEvents.map(event => ({ coopId: coop.id, coopName: coop.name, message: `Upcoming: ${event.name} on ${event.date}` })));
      return { posts: posts.slice(0, options?.limit || 20), resources: resources.slice(0, 10), excursions: excursions.slice(0, 5), coopAnnouncements };
    }, { familyId });
  }

  // Private helpers
  private initializeSubjectProgress(yearLevel: string): SubjectProgress[] {
    return ['English', 'Mathematics', 'Science', 'History', 'Geography', 'Arts', 'Health & PE'].map(subject => ({ subject, currentLevel: yearLevel, curriculumCodes: [], completedCodes: [], inProgressCodes: [], lastUpdated: new Date() }));
  }

  private defaultCoopPreferences(): CoopPreferences {
    return { interestedInCoops: true, maxCoopsToJoin: 2, willingToHost: false, willingToTeach: false, willingToOrganize: false, availableDays: ['monday', 'wednesday', 'friday'], preferredTimes: ['morning'], preferredCoopSize: 'medium', ageRangeTolerance: 2, mustHave: [], dealBreakers: [] };
  }

  private getJurisdictionRequirements(jurisdiction: Jurisdiction): JurisdictionRequirements {
    const defaults: JurisdictionRequirements = { registrationRequired: true, registrationAuthority: 'State Education Authority', requiredDocuments: ['Registration Certificate', 'Learning Plan'], reportingFrequency: 'annual', inspectionPossible: true, curriculumRequirement: 'Must address national curriculum' };
    const byJurisdiction: Record<string, Partial<JurisdictionRequirements>> = {
      'AU_NSW': { registrationAuthority: 'NESA', curriculumRequirement: 'Must address NSW syllabuses' },
      'AU_VIC': { registrationAuthority: 'VRQA', curriculumRequirement: 'Must provide regular and efficient instruction' },
      'AU_QLD': { registrationAuthority: 'HEU', curriculumRequirement: 'Must cover 8 key learning areas' }
    };
    return { ...defaults, ...byJurisdiction[jurisdiction] };
  }

  private generateFamilyAIProfile(): FamilyAIProfile {
    return { compatibilityVector: Array(50).fill(0).map(() => Math.random()), predictedChallenges: [], predictedStrengths: [], engagementScore: 100, engagementTrend: 'stable', recommendedCoops: [], recommendedResources: [], recommendedConnections: [], supportNeedsScore: 0, suggestedSupport: [], lastAnalyzed: new Date() };
  }

  private calculateFamilyCompatibility(family: HomeschoolFamily, candidate: HomeschoolFamily, prioritize?: string): FamilyMatch {
    const breakdown: Record<string, number> = {};
    const matchReasons: string[] = [];
    const sharedInterests: string[] = [];

    breakdown.philosophy = family.educationalProfile.primaryApproach === candidate.educationalProfile.primaryApproach ? 30 : family.educationalProfile.secondaryApproaches.includes(candidate.educationalProfile.primaryApproach) ? 20 : 10;
    if (breakdown.philosophy >= 20) matchReasons.push('Compatible educational philosophy');

    const familyAges = family.children.map(c => parseInt(c.currentYearLevel.replace(/\D/g, '')));
    const candidateAges = candidate.children.map(c => parseInt(c.currentYearLevel.replace(/\D/g, '')));
    const ageOverlap = familyAges.filter(age => candidateAges.some(cAge => Math.abs(age - cAge) <= 2)).length;
    breakdown.childrenAges = Math.min(25, ageOverlap * 10);
    if (ageOverlap > 0) matchReasons.push(`${ageOverlap} children in similar year levels`);

    let distance: number | undefined;
    if (family.location.coordinates && candidate.location.coordinates) {
      distance = this.calculateDistance(family.location.coordinates, candidate.location.coordinates);
      breakdown.location = distance <= 5 ? 20 : distance <= 15 ? 15 : distance <= family.location.travelRadiusKm ? 10 : 5;
      if (distance <= 15) matchReasons.push(`Within ${Math.round(distance)}km`);
    } else if (family.location.suburb === candidate.location.suburb) {
      breakdown.location = 15;
      matchReasons.push('Same suburb');
    } else { breakdown.location = 5; }

    const familyInterests = family.children.flatMap(c => c.interests);
    const candidateInterests = candidate.children.flatMap(c => c.interests);
    const shared = familyInterests.filter(i => candidateInterests.includes(i));
    sharedInterests.push(...[...new Set(shared)]);
    breakdown.interests = Math.min(15, shared.length * 3);
    if (shared.length > 0) matchReasons.push(`Shared interests: ${sharedInterests.slice(0, 3).join(', ')}`);

    if (family.coopPreferences.interestedInCoops && candidate.coopPreferences.interestedInCoops) {
      const dayOverlap = family.coopPreferences.availableDays.filter(d => candidate.coopPreferences.availableDays.includes(d)).length;
      breakdown.coopPrefs = Math.min(10, dayOverlap * 3);
      if (dayOverlap > 0) matchReasons.push(`${dayOverlap} matching available days`);
    } else { breakdown.coopPrefs = 0; }

    const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);
    const childrenOverlap = this.findChildrenOverlap(family.children, candidate.children);
    return { familyId: candidate.id, familyName: candidate.primaryContact.name, totalScore: Math.min(100, totalScore), breakdown, matchReasons, childrenOverlap, distance, sharedInterests };
  }

  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371;
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  private findChildrenOverlap(children1: HomeschoolChild[], children2: HomeschoolChild[]): FamilyMatch['childrenOverlap'] {
    const overlaps: FamilyMatch['childrenOverlap'] = [];
    for (const c1 of children1) {
      const c1Year = parseInt(c1.currentYearLevel.replace(/\D/g, ''));
      for (const c2 of children2) {
        const c2Year = parseInt(c2.currentYearLevel.replace(/\D/g, ''));
        const yearDiff = Math.abs(c1Year - c2Year);
        if (yearDiff <= 2) overlaps.push({ child1Name: c1.name, child2Name: c2.name, yearLevelDiff: yearDiff, sharedInterests: c1.interests.filter(i => c2.interests.includes(i)) });
      }
    }
    return overlaps;
  }

  private analyzeMatchingFactors(matches: FamilyMatch[]): string[] {
    const factors: string[] = [];
    if (matches.length > 0) {
      const avgPhilosophy = matches.reduce((sum, m) => sum + (m.breakdown.philosophy || 0), 0) / matches.length;
      if (avgPhilosophy > 20) factors.push('Strong philosophical alignment in your area');
      const avgAges = matches.reduce((sum, m) => sum + (m.breakdown.childrenAges || 0), 0) / matches.length;
      if (avgAges > 15) factors.push('Good age-match potential for children');
    }
    return factors;
  }

  private generateCoopAIInsights(members: CoopMember[]): CoopAIInsights {
    return { healthScore: 100, healthFactors: [], engagementLevel: 'thriving', engagementIssues: [], teachingLoadBalance: 100, participationBalance: 100, recommendations: [], predictions: [], potentialConflicts: [], lastAnalyzed: new Date() };
  }

  private analyzeMemberEngagement(members: CoopMember[]): number {
    const activeMembers = members.filter(m => m.status === 'active').length;
    const avgAttendance = members.reduce((sum, m) => sum + m.attendanceRate, 0) / members.length;
    return Math.round((activeMembers / members.length) * 50 + avgAttendance * 0.5);
  }

  private analyzeTeachingBalance(coop: HomeschoolCoop): number {
    if (coop.members.length === 0) return 100;
    const counts = coop.members.map(m => m.teachingCommitments.length);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
    return Math.max(0, 100 - variance * 10);
  }

  private analyzeParticipationBalance(members: CoopMember[]): number {
    const rates = members.map(m => m.attendanceRate);
    return Math.round(rates.reduce((a, b) => a + b, 0) / rates.length);
  }

  private analyzeFinancialHealth(finances: CoopFinances): number {
    if (finances.model === 'free') return 100;
    return finances.outstandingPayments.length > 0 ? 70 : 100;
  }

  private generateCoopRecommendations(engagement: number, teachingBalance: number, participationBalance: number): CoopAIInsights['recommendations'] {
    const recs: CoopAIInsights['recommendations'] = [];
    if (engagement < 70) recs.push({ priority: 'high', type: 'engagement', suggestion: 'Consider a social event to boost engagement', rationale: 'Engagement below optimal' });
    if (teachingBalance < 60) recs.push({ priority: 'medium', type: 'schedule', suggestion: 'Redistribute teaching responsibilities', rationale: 'Uneven teaching load' });
    return recs;
  }

  private generateExcursionAIEnhancements(venue: Excursion['venue'], yearLevels: string[], connections: CurriculumConnection[]): ExcursionAIEnhancements {
    return { suggestedCurriculumCodes: connections.map(c => ({ code: c.curriculumCode, relevance: 0.9, preActivityIdea: 'Research activity before visit', postActivityIdea: 'Reflection journal after visit' })), preExcursionActivities: ['Read about the topic', 'Prepare questions'], postExcursionActivities: ['Write a report', 'Create a presentation'], discussionQuestions: ['What did you learn?', 'What surprised you?'], relatedVenues: [], groupDiscountAvailable: true };
  }

  private calculateComplianceScore(family: HomeschoolFamily, requirements: JurisdictionRequirements, alerts: ComplianceAlert[]): number {
    let score = 100;
    if (requirements.registrationRequired && family.compliance.registrationStatus !== 'registered') score -= 30;
    for (const doc of family.compliance.documents) {
      if (doc.status === 'missing') score -= 15;
      if (doc.status === 'expired') score -= 10;
      if (doc.status === 'expiring_soon') score -= 5;
    }
    score -= alerts.filter(a => a.severity === 'high').length * 10;
    return Math.max(0, score);
  }
}
