/**
 * AI-Enabled Homeschool Hub
 * 
 * A comprehensive platform for homeschool families to connect, collaborate,
 * form co-ops, plan excursions, share resources, and navigate compliance
 * requirements across jurisdictions.
 * 
 * ## The Granny Explanation
 * 
 * Remember the old days when homeschool families were isolated? Mum teaching
 * alone at the kitchen table, kids missing out on group activities, everyone
 * reinventing the wheel?
 * 
 * This system is like a village square for homeschoolers:
 * - Find other homeschool families nearby who teach similar things
 * - Form a "co-op" where parents take turns teaching their specialties
 * - Plan group excursions (museum visits are better with 20 kids!)
 * - Share resources ("I made a great unit on Ancient Egypt - want it?")
 * - Navigate the compliance maze ("What paperwork does NSW require?")
 * - Track your child's progress against curriculum standards
 * - Find tutors when you're stuck on Year 10 Chemistry
 * 
 * The AI helps by:
 * - Matching families with compatible educational philosophies
 * - Suggesting co-op structures that balance everyone's strengths
 * - Automatically generating compliance documentation
 * - Recommending excursions that hit multiple curriculum points
 * - Predicting when you might need extra support
 * 
 * ## Architecture
 * 
 * ```
 * â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
 * â”‚                        HOMESCHOOL HUB                                   â”‚
 * â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
 * â”‚                                                                         â”‚
 * â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”‚
 * â”‚  â”‚   Family    â”‚   â”‚    Co-op    â”‚   â”‚  Excursion  â”‚   â”‚ Compliance  â”‚ â”‚
 * â”‚  â”‚  Profiles   â”‚   â”‚  Formation  â”‚   â”‚   Planner   â”‚   â”‚   Engine    â”‚ â”‚
 * â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
 * â”‚         â”‚                 â”‚                 â”‚                 â”‚         â”‚
 * â”‚         â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜         â”‚
 * â”‚                           â–¼                 â–¼                           â”‚
 * â”‚              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”               â”‚
 * â”‚              â”‚        Community & Resources            â”‚               â”‚
 * â”‚              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜               â”‚
 * â”‚                                                                         â”‚
 * â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
 * ```
 * 
 * @module HomeschoolHub
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  Validator, EventBus, Cache, ScholarlyConfig, Jurisdiction,
  JURISDICTION_REQUIREMENTS
} from '../shared/types';

// ============================================================================
// FAMILY PROFILE TYPES
// ============================================================================

export interface HomeschoolFamily {
  id: string;
  tenantId: string;
  
  // Primary contact
  primaryContact: {
    userId: string;
    name: string;
    email: string;
    phone?: string;
  };
  
  // Additional parents/guardians
  additionalContacts: {
    userId?: string;
    name: string;
    relationship: string;
    email?: string;
    canTeach: boolean;
  }[];
  
  // Children
  children: HomeschoolChild[];
  
  // Location
  location: {
    jurisdiction: Jurisdiction;
    suburb: string;
    postcode: string;
    coordinates?: { lat: number; lng: number };
    travelRadiusKm: number;
  };
  
  // Educational approach
  educationalProfile: EducationalProfile;
  
  // Co-op preferences
  coopPreferences: CoopPreferences;
  
  // Teaching capabilities
  teachingCapabilities: TeachingCapability[];
  
  // Compliance
  compliance: ComplianceStatus;
  
  // AI profile
  aiProfile: FamilyAIProfile;
  
  // Status
  status: 'active' | 'inactive' | 'pending_verification';
  joinedAt: Date;
  lastActiveAt: Date;
}

export interface HomeschoolChild {
  id: string;
  name: string;
  dateOfBirth: Date;
  currentYearLevel: string;
  
  // Learning profile
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed';
  interests: string[];
  strengths: string[];
  challengeAreas: string[];
  specialNeeds?: string[];
  
  // Curriculum tracking
  curriculumFramework: string;  // "ACARA", "Charlotte Mason", "Classical", etc.
  subjectProgress: SubjectProgress[];
  
  // LIS integration (if enabled)
  lisProfileId?: string;
  lisIntegrationEnabled: boolean;
  
  // Social
  friendConnections: string[];  // Other child IDs
  coopParticipation: string[];  // Co-op IDs
}

export interface SubjectProgress {
  subject: string;
  currentLevel: string;
  curriculumCodes: string[];
  completedCodes: string[];
  inProgressCodes: string[];
  lastUpdated: Date;
}

export interface EducationalProfile {
  // Philosophy
  primaryApproach: EducationalApproach;
  secondaryApproaches: EducationalApproach[];
  
  // Structure
  structureLevel: 'highly_structured' | 'moderately_structured' | 'relaxed' | 'unschooling';
  typicalDailySchedule?: string;
  
  // Focus areas
  prioritySubjects: string[];
  enrichmentFocus: string[];  // Arts, sports, STEM, languages, etc.
  
  // Religious/values
  religiousAffiliation?: string;
  valuesEmphasis: string[];
  
  // Assessment approach
  assessmentStyle: 'formal_testing' | 'portfolio' | 'narrative' | 'minimal' | 'mixed';
}

export type EducationalApproach = 
  | 'traditional'
  | 'charlotte_mason'
  | 'classical'
  | 'montessori'
  | 'waldorf'
  | 'unschooling'
  | 'eclectic'
  | 'project_based'
  | 'online_hybrid'
  | 'school_at_home';

export interface CoopPreferences {
  // Participation level
  interestedInCoops: boolean;
  maxCoopsToJoin: number;
  willingToHost: boolean;
  willingToTeach: boolean;
  willingToOrganize: boolean;
  
  // Availability
  availableDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday')[];
  preferredTimes: ('morning' | 'afternoon' | 'full_day')[];
  
  // Preferences
  preferredCoopSize: 'small' | 'medium' | 'large';  // 3-5, 6-10, 11+
  ageRangeTolerance: number;  // Years above/below child's age
  
  // Deal-breakers
  mustHave: string[];
  dealBreakers: string[];
}

export interface TeachingCapability {
  subject: string;
  yearLevels: string[];
  confidence: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  qualifications?: string[];
  willingToTeachCoop: boolean;
  willingToTutor: boolean;  // For payment
  notes?: string;
}

export interface ComplianceStatus {
  jurisdiction: Jurisdiction;
  registrationStatus: 'registered' | 'pending' | 'exempt' | 'not_required';
  registrationNumber?: string;
  registrationExpiry?: Date;
  
  // Required documentation
  documents: ComplianceDocument[];
  
  // Reporting
  lastReportSubmitted?: Date;
  nextReportDue?: Date;
  reportingFrequency: 'annual' | 'biannual' | 'quarterly' | 'none';
  
  // Inspections
  lastInspection?: Date;
  inspectionOutcome?: 'satisfactory' | 'improvements_required' | 'pending';
  
  // AI compliance assistance
  complianceScore: number;  // 0-100
  complianceAlerts: string[];
  suggestedActions: string[];
}

export interface ComplianceDocument {
  type: string;
  name: string;
  status: 'current' | 'expiring_soon' | 'expired' | 'missing';
  expiryDate?: Date;
  documentUrl?: string;
  lastUpdated?: Date;
}

export interface FamilyAIProfile {
  // Matching factors
  compatibilityVector: number[];  // For similarity matching
  
  // Predicted needs
  predictedChallenges: string[];
  predictedStrengths: string[];
  
  // Engagement
  engagementScore: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  
  // Recommendations
  recommendedCoops: string[];
  recommendedResources: string[];
  recommendedConnections: string[];
  
  // Support needs
  supportNeedsScore: number;
  suggestedSupport: string[];
  
  lastAnalyzed: Date;
}

// ============================================================================
// CO-OP TYPES
// ============================================================================

export interface HomeschoolCoop {
  id: string;
  tenantId: string;
  
  // Identity
  name: string;
  description: string;
  philosophy: string;
  
  // Location
  primaryLocation: {
    name: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  meetingLocations: {
    name: string;
    address: string;
    suitableFor: string[];
  }[];
  
  // Membership
  members: CoopMember[];
  maxMembers: number;
  membershipType: 'open' | 'application' | 'invitation';
  
  // Structure
  structure: CoopStructure;
  
  // Schedule
  schedule: CoopSchedule;
  
  // Subjects offered
  subjects: CoopSubject[];
  
  // Governance
  governance: CoopGovernance;
  
  // Finances
  finances: CoopFinances;
  
  // AI insights
  aiInsights: CoopAIInsights;
  
  // Status
  status: 'forming' | 'active' | 'paused' | 'dissolved';
  foundedAt: Date;
}

export interface CoopMember {
  familyId: string;
  familyName: string;
  
  // Children participating
  childrenIds: string[];
  
  // Role
  role: 'founder' | 'admin' | 'teacher' | 'member';
  responsibilities: string[];
  
  // Teaching commitments
  teachingCommitments: {
    subject: string;
    frequency: string;
    yearLevels: string[];
  }[];
  
  // Attendance
  attendanceRate: number;
  lastAttended?: Date;
  
  // Status
  status: 'active' | 'on_break' | 'leaving';
  joinedAt: Date;
}

export interface CoopStructure {
  type: 'rotating_parent' | 'specialist_parent' | 'hired_teachers' | 'hybrid';
  
  // For rotating parent model
  rotationSchedule?: {
    familyId: string;
    subjects: string[];
    frequency: string;
  }[];
  
  // For specialist model
  specialists?: {
    familyId: string;
    subject: string;
    ongoing: boolean;
  }[];
  
  // Class groupings
  classGroupings: 'single_age' | 'multi_age' | 'ability_based' | 'interest_based';
  
  // Assessment approach
  sharedAssessment: boolean;
  portfolioSharing: boolean;
}

export interface CoopSchedule {
  // Regular meetings
  regularMeetings: {
    day: string;
    startTime: string;
    endTime: string;
    focus: string;
    location: string;
  }[];
  
  // Term dates
  termDates: {
    term: string;
    startDate: string;
    endDate: string;
  }[];
  
  // Breaks
  breaks: {
    name: string;
    startDate: string;
    endDate: string;
  }[];
  
  // Special events
  upcomingEvents: CoopEvent[];
}

export interface CoopEvent {
  id: string;
  name: string;
  type: 'excursion' | 'performance' | 'showcase' | 'social' | 'workshop' | 'other';
  date: string;
  time?: string;
  location: string;
  description: string;
  
  // Participation
  targetYearLevels: string[];
  maxParticipants?: number;
  registeredFamilies: string[];
  
  // Curriculum links
  curriculumConnections: string[];
  
  // Costs
  costPerChild?: number;
  costPerFamily?: number;
  
  // Status
  status: 'proposed' | 'confirmed' | 'cancelled' | 'completed';
}

export interface CoopSubject {
  subject: string;
  yearLevels: string[];
  
  // Teacher
  taughtBy: 'rotating' | 'specialist';
  currentTeacher?: { familyId: string; name: string };
  
  // Schedule
  frequency: string;
  duration: number;  // minutes
  
  // Curriculum
  curriculumApproach: string;
  curriculumCodes?: string[];
  
  // Resources
  sharedResources: string[];
  resourceCost?: number;
}

export interface CoopGovernance {
  decisionMaking: 'consensus' | 'majority_vote' | 'leadership_decides';
  
  // Leadership
  leaders: {
    role: string;
    familyId: string;
    name: string;
    term?: string;
  }[];
  
  // Policies
  policies: {
    name: string;
    description: string;
    lastUpdated: Date;
  }[];
  
  // Communication
  communicationPlatform: string;
  meetingFrequency: string;
}

export interface CoopFinances {
  model: 'free' | 'cost_share' | 'membership_fee' | 'pay_per_class';
  
  // Fees
  membershipFee?: { amount: number; frequency: string };
  classFees?: { subject: string; amount: number }[];
  
  // Shared costs
  sharedCosts: {
    item: string;
    totalCost: number;
    perFamilyCost: number;
    frequency: string;
  }[];
  
  // Treasury
  currentBalance?: number;
  
  // Payment tracking
  outstandingPayments: {
    familyId: string;
    amount: number;
    dueDate: string;
  }[];
}

export interface CoopAIInsights {
  // Health metrics
  healthScore: number;
  healthFactors: { factor: string; score: number; trend: string }[];
  
  // Engagement
  engagementLevel: 'thriving' | 'healthy' | 'struggling' | 'at_risk';
  engagementIssues: string[];
  
  // Balance analysis
  teachingLoadBalance: number;  // 0-100
  participationBalance: number;
  
  // Recommendations
  recommendations: {
    priority: 'high' | 'medium' | 'low';
    type: 'membership' | 'schedule' | 'curriculum' | 'engagement' | 'conflict';
    suggestion: string;
    rationale: string;
  }[];
  
  // Predictions
  predictions: {
    metric: string;
    prediction: string;
    confidence: number;
    timeframe: string;
  }[];
  
  // Conflict detection
  potentialConflicts: {
    type: string;
    parties: string[];
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }[];
  
  lastAnalyzed: Date;
}

// ============================================================================
// EXCURSION TYPES
// ============================================================================

export interface Excursion {
  id: string;
  tenantId: string;
  
  // Basic info
  title: string;
  description: string;
  type: ExcursionType;
  
  // Organizer
  organizerId: string;  // Family or Co-op ID
  organizerType: 'family' | 'coop';
  organizerName: string;
  
  // Venue
  venue: {
    name: string;
    address: string;
    coordinates?: { lat: number; lng: number };
    website?: string;
    contactPhone?: string;
  };
  
  // Date/Time
  date: string;
  startTime: string;
  endTime: string;
  duration: number;  // minutes
  
  // Participation
  openTo: 'organizer_only' | 'coop_members' | 'network' | 'public';
  targetYearLevels: string[];
  minParticipants: number;
  maxParticipants: number;
  registrations: ExcursionRegistration[];
  waitlist: ExcursionRegistration[];
  
  // Costs
  costStructure: {
    childCost: number;
    adultCost: number;
    familyCap?: number;
    includesWhat: string[];
  };
  
  // Curriculum connections
  curriculumConnections: CurriculumConnection[];
  
  // Logistics
  logistics: ExcursionLogistics;
  
  // AI enhancements
  aiEnhancements: ExcursionAIEnhancements;
  
  // Status
  status: 'draft' | 'open' | 'full' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
}

export type ExcursionType = 
  | 'museum'
  | 'science_centre'
  | 'zoo_wildlife'
  | 'historical_site'
  | 'nature_outdoor'
  | 'arts_performance'
  | 'industry_visit'
  | 'sports_recreation'
  | 'workshop'
  | 'community_service'
  | 'other';

export interface ExcursionRegistration {
  familyId: string;
  familyName: string;
  children: { childId: string; name: string; yearLevel: string }[];
  adults: number;
  totalCost: number;
  paymentStatus: 'pending' | 'paid' | 'refunded';
  specialRequirements?: string;
  registeredAt: Date;
}

export interface CurriculumConnection {
  curriculumCode: string;
  subject: string;
  description: string;
  activitySuggestion: string;
  connectionStrength: 'primary' | 'secondary' | 'enrichment';
}

export interface ExcursionLogistics {
  // Transport
  transport: 'self_drive' | 'carpool' | 'bus' | 'public_transport' | 'walking';
  meetingPoint?: string;
  carpoolCoordination?: boolean;
  
  // Requirements
  adultToChildRatio: number;
  minimumAdults: number;
  
  // What to bring
  toBring: string[];
  
  // Safety
  riskAssessmentCompleted: boolean;
  emergencyProcedures?: string;
  firstAidResponsible?: string;
  
  // Accessibility
  wheelchairAccessible: boolean;
  accessibilityNotes?: string;
}

export interface ExcursionAIEnhancements {
  // Curriculum mapping
  suggestedCurriculumCodes: {
    code: string;
    relevance: number;
    preActivityIdea: string;
    postActivityIdea: string;
  }[];
  
  // Learning extension
  preExcursionActivities: string[];
  postExcursionActivities: string[];
  discussionQuestions: string[];
  
  // Similar excursions
  relatedVenues: {
    name: string;
    distance: number;
    relevance: number;
  }[];
  
  // Optimal timing
  bestTimeToVisit?: string;
  crowdPrediction?: 'quiet' | 'moderate' | 'busy';
  
  // Cost optimization
  groupDiscountAvailable: boolean;
  suggestedCombinations?: string[];  // "Combine with X for bundle discount"
}

// ============================================================================
// COMMUNITY TYPES
// ============================================================================

export interface CommunityPost {
  id: string;
  tenantId: string;
  
  authorId: string;
  authorName: string;
  authorType: 'family' | 'coop';
  
  // Content
  title?: string;
  content: string;
  type: 'discussion' | 'question' | 'resource' | 'event' | 'recommendation' | 'success_story';
  
  // Categorization
  categories: string[];
  yearLevels: string[];
  subjects: string[];
  
  // Attachments
  attachments: { type: string; url: string; name: string }[];
  
  // Engagement
  likes: number;
  likedBy: string[];
  comments: CommunityComment[];
  shares: number;
  
  // Visibility
  visibility: 'public' | 'local' | 'coop' | 'connections';
  
  // Status
  status: 'active' | 'archived' | 'removed';
  createdAt: Date;
  updatedAt: Date;
}

export interface CommunityComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  likes: number;
  parentCommentId?: string;
  createdAt: Date;
}

export interface SharedResource {
  id: string;
  tenantId: string;
  
  // Creator
  creatorId: string;
  creatorName: string;
  
  // Resource details
  title: string;
  description: string;
  type: 'lesson_plan' | 'worksheet' | 'curriculum_map' | 'book_list' | 'unit_study' | 'printable' | 'link_collection' | 'other';
  
  // Files
  files: { name: string; url: string; type: string; size: number }[];
  externalLinks: { title: string; url: string }[];
  
  // Categorization
  subjects: string[];
  yearLevels: string[];
  educationalApproaches: EducationalApproach[];
  curriculumCodes: string[];
  
  // Licensing
  license: 'free_use' | 'attribution' | 'non_commercial' | 'restricted';
  
  // Engagement
  downloads: number;
  rating: number;
  ratingCount: number;
  reviews: ResourceReview[];
  
  // Status
  status: 'active' | 'archived';
  createdAt: Date;
}

export interface ResourceReview {
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  helpful: number;
  createdAt: Date;
}

// ============================================================================
// REPOSITORIES
// ============================================================================

export interface HomeschoolFamilyRepository {
  findById(tenantId: string, id: string): Promise<HomeschoolFamily | null>;
  findByUserId(tenantId: string, userId: string): Promise<HomeschoolFamily | null>;
  findNearby(tenantId: string, location: { lat: number; lng: number }, radiusKm: number): Promise<HomeschoolFamily[]>;
  findByJurisdiction(tenantId: string, jurisdiction: Jurisdiction): Promise<HomeschoolFamily[]>;
  findCompatible(tenantId: string, familyId: string, limit: number): Promise<HomeschoolFamily[]>;
  search(tenantId: string, filters: FamilySearchFilters): Promise<HomeschoolFamily[]>;
  save(tenantId: string, family: HomeschoolFamily): Promise<HomeschoolFamily>;
  update(tenantId: string, id: string, updates: Partial<HomeschoolFamily>): Promise<HomeschoolFamily>;
}

export interface FamilySearchFilters {
  jurisdiction?: Jurisdiction;
  yearLevels?: string[];
  educationalApproach?: EducationalApproach;
  interests?: string[];
  coopInterested?: boolean;
  radiusKm?: number;
  fromLocation?: { lat: number; lng: number };
}

export interface CoopRepository {
  findById(tenantId: string, id: string): Promise<HomeschoolCoop | null>;
  findByMember(tenantId: string, familyId: string): Promise<HomeschoolCoop[]>;
  findNearby(tenantId: string, location: { lat: number; lng: number }, radiusKm: number): Promise<HomeschoolCoop[]>;
  findAcceptingMembers(tenantId: string): Promise<HomeschoolCoop[]>;
  search(tenantId: string, filters: CoopSearchFilters): Promise<HomeschoolCoop[]>;
  save(tenantId: string, coop: HomeschoolCoop): Promise<HomeschoolCoop>;
  update(tenantId: string, id: string, updates: Partial<HomeschoolCoop>): Promise<HomeschoolCoop>;
}

export interface CoopSearchFilters {
  philosophy?: EducationalApproach;
  yearLevels?: string[];
  subjects?: string[];
  days?: string[];
  acceptingMembers?: boolean;
}

export interface ExcursionRepository {
  findById(tenantId: string, id: string): Promise<Excursion | null>;
  findUpcoming(tenantId: string, filters?: ExcursionFilters): Promise<Excursion[]>;
  findByOrganizer(tenantId: string, organizerId: string): Promise<Excursion[]>;
  findRegistered(tenantId: string, familyId: string): Promise<Excursion[]>;
  save(tenantId: string, excursion: Excursion): Promise<Excursion>;
  update(tenantId: string, id: string, updates: Partial<Excursion>): Promise<Excursion>;
}

export interface ExcursionFilters {
  type?: ExcursionType;
  yearLevels?: string[];
  dateFrom?: string;
  dateTo?: string;
  maxCost?: number;
  hasSpots?: boolean;
}

export interface CommunityRepository {
  findPosts(tenantId: string, filters?: PostFilters): Promise<CommunityPost[]>;
  findResources(tenantId: string, filters?: ResourceFilters): Promise<SharedResource[]>;
  savePost(tenantId: string, post: CommunityPost): Promise<CommunityPost>;
  saveResource(tenantId: string, resource: SharedResource): Promise<SharedResource>;
}

export interface PostFilters {
  type?: string;
  categories?: string[];
  yearLevels?: string[];
}

export interface ResourceFilters {
  type?: string;
  subjects?: string[];
  yearLevels?: string[];
  approaches?: EducationalApproach[];
}

// ============================================================================
// SERVICE
// ============================================================================

export class HomeschoolHubService extends ScholarlyBaseService {
  private readonly familyRepo: HomeschoolFamilyRepository;
  private readonly coopRepo: CoopRepository;
  private readonly excursionRepo: ExcursionRepository;
  private readonly communityRepo: CommunityRepository;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    familyRepo: HomeschoolFamilyRepository;
    coopRepo: CoopRepository;
    excursionRepo: ExcursionRepository;
    communityRepo: CommunityRepository;
  }) {
    super('HomeschoolHubService', deps);
    this.familyRepo = deps.familyRepo;
    this.coopRepo = deps.coopRepo;
    this.excursionRepo = deps.excursionRepo;
    this.communityRepo = deps.communityRepo;
  }

  // ==========================================================================
  // FAMILY MANAGEMENT
  // ==========================================================================

  /**
   * Register a new homeschool family
   */
  async registerFamily(
    tenantId: string,
    data: {
      primaryContact: { userId: string; name: string; email: string };
      children: Omit<HomeschoolChild, 'id' | 'lisProfileId' | 'lisIntegrationEnabled' | 'friendConnections' | 'coopParticipation'>[];
      location: HomeschoolFamily['location'];
      educationalProfile: EducationalProfile;
    }
  ): Promise<Result<HomeschoolFamily>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.primaryContact.email, 'email');
      Validator.required(data.children, 'children');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('registerFamily', tenantId, async () => {
      // Create children with IDs
      const children: HomeschoolChild[] = data.children.map(child => ({
        ...child,
        id: this.generateId('child'),
        lisIntegrationEnabled: false,
        friendConnections: [],
        coopParticipation: [],
        subjectProgress: this.initializeSubjectProgress(child.currentYearLevel)
      }));

      // Get jurisdiction requirements
      const complianceRequirements = this.getComplianceRequirements(data.location.jurisdiction);

      // Create family
      const family: HomeschoolFamily = {
        id: this.generateId('family'),
        tenantId,
        primaryContact: data.primaryContact,
        additionalContacts: [],
        children,
        location: data.location,
        educationalProfile: data.educationalProfile,
        coopPreferences: this.defaultCoopPreferences(),
        teachingCapabilities: [],
        compliance: {
          jurisdiction: data.location.jurisdiction,
          registrationStatus: complianceRequirements.registrationRequired ? 'pending' : 'not_required',
          documents: complianceRequirements.requiredDocuments.map(doc => ({
            type: doc,
            name: doc,
            status: 'missing'
          })),
          reportingFrequency: complianceRequirements.reportingFrequency,
          complianceScore: 0,
          complianceAlerts: complianceRequirements.registrationRequired 
            ? ['Registration required - please complete registration process']
            : [],
          suggestedActions: []
        },
        aiProfile: await this.generateFamilyAIProfile(data),
        status: 'active',
        joinedAt: new Date(),
        lastActiveAt: new Date()
      };

      const saved = await this.familyRepo.save(tenantId, family);

      await this.publishEvent('scholarly.homeschool.family_registered', tenantId, {
        familyId: saved.id,
        jurisdiction: data.location.jurisdiction,
        childCount: children.length
      });

      return saved;
    }, {});
  }

  /**
   * Find compatible families for connection or co-op formation
   */
  async findCompatibleFamilies(
    tenantId: string,
    familyId: string,
    options?: {
      maxResults?: number;
      prioritize?: 'location' | 'philosophy' | 'children_ages' | 'interests';
    }
  ): Promise<Result<{
    matches: FamilyMatch[];
    matchingFactors: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(familyId, 'familyId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('findCompatibleFamilies', tenantId, async () => {
      const family = await this.familyRepo.findById(tenantId, familyId);
      if (!family) throw new NotFoundError('Family', familyId);

      const maxResults = options?.maxResults || 20;

      // Find nearby families
      const nearbyFamilies = family.location.coordinates
        ? await this.familyRepo.findNearby(
            tenantId,
            family.location.coordinates,
            family.location.travelRadiusKm
          )
        : await this.familyRepo.findByJurisdiction(tenantId, family.location.jurisdiction);

      // Score each family for compatibility
      const matches: FamilyMatch[] = [];

      for (const candidate of nearbyFamilies) {
        if (candidate.id === familyId) continue;

        const score = this.calculateFamilyCompatibility(family, candidate, options?.prioritize);
        
        if (score.totalScore > 50) {
          matches.push({
            familyId: candidate.id,
            familyName: candidate.primaryContact.name,
            totalScore: score.totalScore,
            breakdown: score.breakdown,
            matchReasons: score.matchReasons,
            childrenOverlap: this.findChildrenOverlap(family.children, candidate.children),
            distance: score.distance,
            sharedInterests: score.sharedInterests
          });
        }
      }

      // Sort by total score
      matches.sort((a, b) => b.totalScore - a.totalScore);

      // Determine what factors drove the matches
      const matchingFactors = this.analyzeMatchingFactors(matches);

      return {
        matches: matches.slice(0, maxResults),
        matchingFactors
      };
    }, { familyId });
  }

  // ==========================================================================
  // CO-OP MANAGEMENT
  // ==========================================================================

  /**
   * AI-assisted co-op formation
   */
  async suggestCoopFormation(
    tenantId: string,
    initiatorFamilyId: string,
    preferences: {
      desiredSize: number;
      focusSubjects?: string[];
      preferredDays?: string[];
      philosophy?: EducationalApproach;
    }
  ): Promise<Result<{
    suggestedMembers: FamilyMatch[];
    suggestedStructure: CoopStructure;
    suggestedSchedule: Partial<CoopSchedule>;
    viabilityScore: number;
    considerations: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(initiatorFamilyId, 'initiatorFamilyId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('suggestCoopFormation', tenantId, async () => {
      const initiator = await this.familyRepo.findById(tenantId, initiatorFamilyId);
      if (!initiator) throw new NotFoundError('Family', initiatorFamilyId);

      // Find compatible families
      const compatibleResult = await this.findCompatibleFamilies(tenantId, initiatorFamilyId, {
        maxResults: preferences.desiredSize * 2
      });

      if (!compatibleResult.success) throw compatibleResult.error;

      // Filter and rank for co-op suitability
      const coopCandidates = compatibleResult.data.matches
        .filter(m => {
          const candidateFamily = m;  // Would fetch full family
          return true;  // Would check co-op preferences
        })
        .slice(0, preferences.desiredSize - 1);

      // Analyse teaching capabilities across suggested members
      const allCapabilities = await this.aggregateTeachingCapabilities(
        tenantId,
        [initiatorFamilyId, ...coopCandidates.map(c => c.familyId)]
      );

      // Suggest structure based on capabilities
      const suggestedStructure = this.suggestCoopStructure(allCapabilities, preferences);

      // Suggest schedule based on preferences
      const suggestedSchedule = this.suggestCoopSchedule(
        preferences.preferredDays || [],
        coopCandidates.length + 1
      );

      // Calculate viability
      const viabilityScore = this.calculateCoopViability(
        coopCandidates,
        allCapabilities,
        preferences
      );

      // Generate considerations
      const considerations = this.generateCoopConsiderations(
        coopCandidates,
        allCapabilities,
        suggestedStructure
      );

      return {
        suggestedMembers: coopCandidates,
        suggestedStructure,
        suggestedSchedule,
        viabilityScore,
        considerations
      };
    }, { initiatorFamilyId });
  }

  /**
   * Create a new co-op
   */
  async createCoop(
    tenantId: string,
    data: {
      name: string;
      description: string;
      philosophy: string;
      founderFamilyId: string;
      initialMembers: string[];
      structure: CoopStructure;
      schedule: CoopSchedule;
      governance: CoopGovernance;
      finances: CoopFinances;
    }
  ): Promise<Result<HomeschoolCoop>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.name, 'name');
      Validator.required(data.founderFamilyId, 'founderFamilyId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createCoop', tenantId, async () => {
      const founder = await this.familyRepo.findById(tenantId, data.founderFamilyId);
      if (!founder) throw new NotFoundError('Founder family', data.founderFamilyId);

      // Build member list
      const members: CoopMember[] = [{
        familyId: data.founderFamilyId,
        familyName: founder.primaryContact.name,
        childrenIds: founder.children.map(c => c.id),
        role: 'founder',
        responsibilities: ['Overall coordination', 'Member management'],
        teachingCommitments: [],
        attendanceRate: 100,
        status: 'active',
        joinedAt: new Date()
      }];

      // Add initial members
      for (const memberId of data.initialMembers) {
        const memberFamily = await this.familyRepo.findById(tenantId, memberId);
        if (memberFamily) {
          members.push({
            familyId: memberId,
            familyName: memberFamily.primaryContact.name,
            childrenIds: memberFamily.children.map(c => c.id),
            role: 'member',
            responsibilities: [],
            teachingCommitments: [],
            attendanceRate: 100,
            status: 'active',
            joinedAt: new Date()
          });
        }
      }

      const coop: HomeschoolCoop = {
        id: this.generateId('coop'),
        tenantId,
        name: data.name,
        description: data.description,
        philosophy: data.philosophy,
        primaryLocation: {
          name: 'TBD',
          address: founder.location.suburb
        },
        meetingLocations: [],
        members,
        maxMembers: 15,
        membershipType: 'application',
        structure: data.structure,
        schedule: data.schedule,
        subjects: [],
        governance: data.governance,
        finances: data.finances,
        aiInsights: await this.generateCoopAIInsights(members),
        status: 'forming',
        foundedAt: new Date()
      };

      const saved = await this.coopRepo.save(tenantId, coop);

      // Update family records
      for (const member of members) {
        const family = await this.familyRepo.findById(tenantId, member.familyId);
        if (family) {
          for (const child of family.children) {
            child.coopParticipation.push(saved.id);
          }
          await this.familyRepo.update(tenantId, member.familyId, { children: family.children });
        }
      }

      await this.publishEvent('scholarly.homeschool.coop_created', tenantId, {
        coopId: saved.id,
        name: data.name,
        memberCount: members.length
      });

      return saved;
    }, {});
  }

  /**
   * Analyze co-op health and generate recommendations
   */
  async analyzeCoopHealth(
    tenantId: string,
    coopId: string
  ): Promise<Result<CoopAIInsights>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(coopId, 'coopId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('analyzeCoopHealth', tenantId, async () => {
      const coop = await this.coopRepo.findById(tenantId, coopId);
      if (!coop) throw new NotFoundError('Co-op', coopId);

      // Analyze various health dimensions
      const memberEngagement = this.analyzeMemberEngagement(coop.members);
      const teachingBalance = this.analyzeTeachingBalance(coop);
      const participationBalance = this.analyzeParticipationBalance(coop.members);
      const financialHealth = this.analyzeFinancialHealth(coop.finances);

      // Detect potential conflicts
      const potentialConflicts = this.detectPotentialConflicts(coop);

      // Generate recommendations
      const recommendations = this.generateCoopRecommendations(
        coop,
        memberEngagement,
        teachingBalance,
        participationBalance
      );

      // Generate predictions
      const predictions = this.generateCoopPredictions(coop, memberEngagement);

      const insights: CoopAIInsights = {
        healthScore: Math.round((memberEngagement + teachingBalance + participationBalance + financialHealth) / 4),
        healthFactors: [
          { factor: 'Member Engagement', score: memberEngagement, trend: 'stable' },
          { factor: 'Teaching Load Balance', score: teachingBalance, trend: 'stable' },
          { factor: 'Participation Balance', score: participationBalance, trend: 'stable' },
          { factor: 'Financial Health', score: financialHealth, trend: 'stable' }
        ],
        engagementLevel: memberEngagement > 80 ? 'thriving' : memberEngagement > 60 ? 'healthy' : memberEngagement > 40 ? 'struggling' : 'at_risk',
        engagementIssues: memberEngagement < 60 ? ['Some members showing reduced participation'] : [],
        teachingLoadBalance: teachingBalance,
        participationBalance,
        recommendations,
        predictions,
        potentialConflicts,
        lastAnalyzed: new Date()
      };

      // Update co-op with new insights
      await this.coopRepo.update(tenantId, coopId, { aiInsights: insights });

      return insights;
    }, { coopId });
  }

  // ==========================================================================
  // EXCURSION PLANNING
  // ==========================================================================

  /**
   * AI-powered excursion suggestions based on curriculum
   */
  async suggestExcursions(
    tenantId: string,
    request: {
      familyOrCoopId: string;
      type: 'family' | 'coop';
      curriculumCodes?: string[];
      subjects?: string[];
      yearLevels: string[];
      dateRange?: { from: string; to: string };
      maxCost?: number;
      travelRadius?: number;
    }
  ): Promise<Result<{
    suggestions: ExcursionSuggestion[];
    curriculumConnections: { code: string; venues: string[] }[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.familyOrCoopId, 'familyOrCoopId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('suggestExcursions', tenantId, async () => {
      // Get location
      let location: { lat: number; lng: number } | undefined;
      
      if (request.type === 'family') {
        const family = await this.familyRepo.findById(tenantId, request.familyOrCoopId);
        location = family?.location.coordinates;
      } else {
        const coop = await this.coopRepo.findById(tenantId, request.familyOrCoopId);
        location = coop?.primaryLocation.coordinates;
      }

      // Generate venue suggestions based on curriculum
      const suggestions = await this.generateExcursionSuggestions(
        request.yearLevels,
        request.curriculumCodes || [],
        request.subjects || [],
        location,
        request.travelRadius || 50
      );

      // Map curriculum to venues
      const curriculumConnections = this.mapCurriculumToVenues(
        request.curriculumCodes || [],
        suggestions
      );

      return { suggestions, curriculumConnections };
    }, {});
  }

  /**
   * Create an excursion
   */
  async createExcursion(
    tenantId: string,
    data: Omit<Excursion, 'id' | 'tenantId' | 'registrations' | 'waitlist' | 'aiEnhancements' | 'status' | 'createdAt'>
  ): Promise<Result<Excursion>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.title, 'title');
      Validator.required(data.venue, 'venue');
      Validator.required(data.date, 'date');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createExcursion', tenantId, async () => {
      // Generate AI enhancements
      const aiEnhancements = await this.generateExcursionAIEnhancements(
        data.venue,
        data.targetYearLevels,
        data.curriculumConnections
      );

      const excursion: Excursion = {
        ...data,
        id: this.generateId('excursion'),
        tenantId,
        registrations: [],
        waitlist: [],
        aiEnhancements,
        status: 'draft',
        createdAt: new Date()
      };

      // Auto-register organizer
      if (data.organizerType === 'family') {
        const family = await this.familyRepo.findById(tenantId, data.organizerId);
        if (family) {
          excursion.registrations.push({
            familyId: family.id,
            familyName: family.primaryContact.name,
            children: family.children.map(c => ({
              childId: c.id,
              name: c.name,
              yearLevel: c.currentYearLevel
            })),
            adults: 1,
            totalCost: 0,  // Organizer often free
            paymentStatus: 'paid',
            registeredAt: new Date()
          });
        }
      }

      const saved = await this.excursionRepo.save(tenantId, excursion);

      await this.publishEvent('scholarly.homeschool.excursion_created', tenantId, {
        excursionId: saved.id,
        title: data.title,
        date: data.date
      });

      return saved;
    }, {});
  }

  /**
   * Register for an excursion
   */
  async registerForExcursion(
    tenantId: string,
    excursionId: string,
    registration: {
      familyId: string;
      childrenIds: string[];
      adults: number;
      specialRequirements?: string;
    }
  ): Promise<Result<{
    excursion: Excursion;
    registration: ExcursionRegistration;
    status: 'registered' | 'waitlisted';
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(excursionId, 'excursionId');
      Validator.required(registration.familyId, 'familyId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('registerForExcursion', tenantId, async () => {
      const excursion = await this.excursionRepo.findById(tenantId, excursionId);
      if (!excursion) throw new NotFoundError('Excursion', excursionId);

      const family = await this.familyRepo.findById(tenantId, registration.familyId);
      if (!family) throw new NotFoundError('Family', registration.familyId);

      // Check if already registered
      if (excursion.registrations.some(r => r.familyId === registration.familyId)) {
        throw new ValidationError('Family already registered for this excursion');
      }

      // Build registration
      const children = family.children
        .filter(c => registration.childrenIds.includes(c.id))
        .map(c => ({ childId: c.id, name: c.name, yearLevel: c.currentYearLevel }));

      const totalCost = 
        (children.length * excursion.costStructure.childCost) +
        (registration.adults * excursion.costStructure.adultCost);

      const finalCost = excursion.costStructure.familyCap
        ? Math.min(totalCost, excursion.costStructure.familyCap)
        : totalCost;

      const newRegistration: ExcursionRegistration = {
        familyId: registration.familyId,
        familyName: family.primaryContact.name,
        children,
        adults: registration.adults,
        totalCost: finalCost,
        paymentStatus: 'pending',
        specialRequirements: registration.specialRequirements,
        registeredAt: new Date()
      };

      // Check capacity
      const currentCount = excursion.registrations.reduce(
        (sum, r) => sum + r.children.length,
        0
      );

      let status: 'registered' | 'waitlisted';

      if (currentCount + children.length <= excursion.maxParticipants) {
        excursion.registrations.push(newRegistration);
        status = 'registered';
      } else {
        excursion.waitlist.push(newRegistration);
        status = 'waitlisted';
      }

      // Update status if full
      if (excursion.registrations.reduce((s, r) => s + r.children.length, 0) >= excursion.maxParticipants) {
        excursion.status = 'full';
      }

      const updated = await this.excursionRepo.update(tenantId, excursionId, excursion);

      await this.publishEvent('scholarly.homeschool.excursion_registration', tenantId, {
        excursionId,
        familyId: registration.familyId,
        status
      });

      return { excursion: updated, registration: newRegistration, status };
    }, { excursionId });
  }

  // ==========================================================================
  // COMPLIANCE ASSISTANCE
  // ==========================================================================

  /**
   * Generate compliance report for a family
   */
  async generateComplianceReport(
    tenantId: string,
    familyId: string,
    reportType: 'annual' | 'progress' | 'registration'
  ): Promise<Result<{
    report: ComplianceReport;
    recommendations: string[];
    nextSteps: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(familyId, 'familyId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateComplianceReport', tenantId, async () => {
      const family = await this.familyRepo.findById(tenantId, familyId);
      if (!family) throw new NotFoundError('Family', familyId);

      const requirements = this.getComplianceRequirements(family.location.jurisdiction);

      // Generate report based on type and jurisdiction
      const report = await this.buildComplianceReport(family, reportType, requirements);

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(family, requirements);

      // Determine next steps
      const nextSteps = this.determineComplianceNextSteps(family, requirements);

      return { report, recommendations, nextSteps };
    }, { familyId, reportType });
  }

  /**
   * Check compliance status and generate alerts
   */
  async checkComplianceStatus(
    tenantId: string,
    familyId: string
  ): Promise<Result<{
    status: ComplianceStatus;
    alerts: ComplianceAlert[];
    score: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(familyId, 'familyId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('checkComplianceStatus', tenantId, async () => {
      const family = await this.familyRepo.findById(tenantId, familyId);
      if (!family) throw new NotFoundError('Family', familyId);

      const requirements = this.getComplianceRequirements(family.location.jurisdiction);
      const alerts: ComplianceAlert[] = [];

      // Check registration
      if (requirements.registrationRequired && family.compliance.registrationStatus !== 'registered') {
        alerts.push({
          type: 'registration',
          severity: 'high',
          message: 'Home education registration required but not complete',
          action: 'Complete registration with education authority',
          deadline: undefined
        });
      }

      // Check document expiry
      for (const doc of family.compliance.documents) {
        if (doc.status === 'expiring_soon') {
          alerts.push({
            type: 'document',
            severity: 'medium',
            message: `${doc.name} expiring soon`,
            action: 'Renew document before expiry',
            deadline: doc.expiryDate
          });
        } else if (doc.status === 'expired' || doc.status === 'missing') {
          alerts.push({
            type: 'document',
            severity: 'high',
            message: `${doc.name} is ${doc.status}`,
            action: doc.status === 'missing' ? 'Submit required document' : 'Renew expired document',
            deadline: undefined
          });
        }
      }

      // Check reporting
      if (family.compliance.nextReportDue) {
        const daysUntilDue = Math.ceil(
          (new Date(family.compliance.nextReportDue).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        
        if (daysUntilDue < 30) {
          alerts.push({
            type: 'reporting',
            severity: daysUntilDue < 7 ? 'high' : 'medium',
            message: `Progress report due in ${daysUntilDue} days`,
            action: 'Prepare and submit progress report',
            deadline: family.compliance.nextReportDue
          });
        }
      }

      // Calculate score
      const score = this.calculateComplianceScore(family, requirements, alerts);

      // Update family compliance
      family.compliance.complianceScore = score;
      family.compliance.complianceAlerts = alerts.map(a => a.message);
      await this.familyRepo.update(tenantId, familyId, { compliance: family.compliance });

      return { status: family.compliance, alerts, score };
    }, { familyId });
  }

  // ==========================================================================
  // COMMUNITY FEATURES
  // ==========================================================================

  /**
   * Get personalized community feed
   */
  async getCommunityFeed(
    tenantId: string,
    familyId: string,
    options?: {
      limit?: number;
      offset?: number;
      types?: string[];
    }
  ): Promise<Result<{
    posts: CommunityPost[];
    resources: SharedResource[];
    excursions: Excursion[];
    coopAnnouncements: { coopId: string; coopName: string; message: string }[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(familyId, 'familyId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getCommunityFeed', tenantId, async () => {
      const family = await this.familyRepo.findById(tenantId, familyId);
      if (!family) throw new NotFoundError('Family', familyId);

      const yearLevels = family.children.map(c => c.currentYearLevel);

      // Get relevant posts
      const posts = await this.communityRepo.findPosts(tenantId, {
        yearLevels,
        type: options?.types?.[0]
      });

      // Get relevant resources
      const resources = await this.communityRepo.findResources(tenantId, {
        yearLevels,
        approaches: [family.educationalProfile.primaryApproach]
      });

      // Get upcoming excursions
      const excursions = await this.excursionRepo.findUpcoming(tenantId, {
        yearLevels,
        hasSpots: true
      });

      // Get co-op announcements
      const coops = await this.coopRepo.findByMember(tenantId, familyId);
      const coopAnnouncements = coops.flatMap(coop => 
        coop.schedule.upcomingEvents.map(event => ({
          coopId: coop.id,
          coopName: coop.name,
          message: `Upcoming: ${event.name} on ${event.date}`
        }))
      );

      return {
        posts: posts.slice(0, options?.limit || 20),
        resources: resources.slice(0, 10),
        excursions: excursions.slice(0, 5),
        coopAnnouncements
      };
    }, { familyId });
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private initializeSubjectProgress(yearLevel: string): SubjectProgress[] {
    const coreSubjects = ['English', 'Mathematics', 'Science', 'History', 'Geography', 'Arts', 'Health & PE'];
    return coreSubjects.map(subject => ({
      subject,
      currentLevel: yearLevel,
      curriculumCodes: [],
      completedCodes: [],
      inProgressCodes: [],
      lastUpdated: new Date()
    }));
  }

  private defaultCoopPreferences(): CoopPreferences {
    return {
      interestedInCoops: true,
      maxCoopsToJoin: 2,
      willingToHost: false,
      willingToTeach: false,
      willingToOrganize: false,
      availableDays: ['monday', 'wednesday', 'friday'],
      preferredTimes: ['morning'],
      preferredCoopSize: 'medium',
      ageRangeTolerance: 2,
      mustHave: [],
      dealBreakers: []
    };
  }

  private getComplianceRequirements(jurisdiction: Jurisdiction): JurisdictionRequirements {
    // Australian jurisdictions
    const requirements: Record<string, JurisdictionRequirements> = {
      'AU_NSW': {
        registrationRequired: true,
        registrationAuthority: 'NESA',
        requiredDocuments: ['Registration Certificate', 'Learning Plan'],
        reportingFrequency: 'annual',
        inspectionPossible: true,
        curriculumRequirement: 'Must address NSW syllabuses or equivalent'
      },
      'AU_VIC': {
        registrationRequired: true,
        registrationAuthority: 'VRQA',
        requiredDocuments: ['Registration Certificate'],
        reportingFrequency: 'annual',
        inspectionPossible: true,
        curriculumRequirement: 'Must provide regular and efficient instruction'
      },
      'AU_QLD': {
        registrationRequired: true,
        registrationAuthority: 'HEU',
        requiredDocuments: ['Registration Certificate', 'Educational Program'],
        reportingFrequency: 'annual',
        inspectionPossible: false,
        curriculumRequirement: 'Must cover 8 key learning areas'
      }
    };

    return requirements[jurisdiction] || {
      registrationRequired: false,
      registrationAuthority: 'Unknown',
      requiredDocuments: [],
      reportingFrequency: 'none',
      inspectionPossible: false,
      curriculumRequirement: 'Check local requirements'
    };
  }

  private async generateFamilyAIProfile(data: any): Promise<FamilyAIProfile> {
    return {
      compatibilityVector: Array(50).fill(0).map(() => Math.random()),
      predictedChallenges: [],
      predictedStrengths: [],
      engagementScore: 100,
      engagementTrend: 'stable',
      recommendedCoops: [],
      recommendedResources: [],
      recommendedConnections: [],
      supportNeedsScore: 0,
      suggestedSupport: [],
      lastAnalyzed: new Date()
    };
  }

  private calculateFamilyCompatibility(
    family: HomeschoolFamily,
    candidate: HomeschoolFamily,
    prioritize?: string
  ): {
    totalScore: number;
    breakdown: Record<string, number>;
    matchReasons: string[];
    distance?: number;
    sharedInterests: string[];
  } {
    const breakdown: Record<string, number> = {};
    const matchReasons: string[] = [];
    const sharedInterests: string[] = [];

    // Educational philosophy match (0-30)
    if (family.educationalProfile.primaryApproach === candidate.educationalProfile.primaryApproach) {
      breakdown.philosophy = 30;
      matchReasons.push(`Same educational approach: ${family.educationalProfile.primaryApproach}`);
    } else if (family.educationalProfile.secondaryApproaches.includes(candidate.educationalProfile.primaryApproach)) {
      breakdown.philosophy = 20;
      matchReasons.push('Compatible educational philosophies');
    } else {
      breakdown.philosophy = 10;
    }

    // Children age overlap (0-25)
    const familyAges = family.children.map(c => parseInt(c.currentYearLevel.replace(/\D/g, '')));
    const candidateAges = candidate.children.map(c => parseInt(c.currentYearLevel.replace(/\D/g, '')));
    const ageOverlap = familyAges.filter(age => 
      candidateAges.some(cAge => Math.abs(age - cAge) <= 2)
    ).length;
    breakdown.childrenAges = Math.min(25, ageOverlap * 10);
    if (ageOverlap > 0) {
      matchReasons.push(`${ageOverlap} children in similar year levels`);
    }

    // Location proximity (0-20)
    let distance: number | undefined;
    if (family.location.coordinates && candidate.location.coordinates) {
      distance = this.calculateDistance(
        family.location.coordinates,
        candidate.location.coordinates
      );
      if (distance <= 5) {
        breakdown.location = 20;
        matchReasons.push('Within 5km');
      } else if (distance <= 15) {
        breakdown.location = 15;
        matchReasons.push('Within 15km');
      } else if (distance <= family.location.travelRadiusKm) {
        breakdown.location = 10;
      } else {
        breakdown.location = 5;
      }
    } else if (family.location.suburb === candidate.location.suburb) {
      breakdown.location = 15;
      matchReasons.push('Same suburb');
    } else {
      breakdown.location = 5;
    }

    // Shared interests (0-15)
    const familyInterests = family.children.flatMap(c => c.interests);
    const candidateInterests = candidate.children.flatMap(c => c.interests);
    const shared = familyInterests.filter(i => candidateInterests.includes(i));
    sharedInterests.push(...[...new Set(shared)]);
    breakdown.interests = Math.min(15, shared.length * 3);
    if (shared.length > 0) {
      matchReasons.push(`Shared interests: ${sharedInterests.slice(0, 3).join(', ')}`);
    }

    // Co-op preferences alignment (0-10)
    if (family.coopPreferences.interestedInCoops && candidate.coopPreferences.interestedInCoops) {
      const dayOverlap = family.coopPreferences.availableDays.filter(d => 
        candidate.coopPreferences.availableDays.includes(d)
      ).length;
      breakdown.coopPrefs = Math.min(10, dayOverlap * 3);
      if (dayOverlap > 0) {
        matchReasons.push(`${dayOverlap} matching available days`);
      }
    } else {
      breakdown.coopPrefs = 0;
    }

    // Apply priority weighting
    if (prioritize) {
      const weights: Record<string, Record<string, number>> = {
        location: { location: 2, philosophy: 1, childrenAges: 1, interests: 1, coopPrefs: 1 },
        philosophy: { philosophy: 2, location: 1, childrenAges: 1, interests: 1, coopPrefs: 1 },
        children_ages: { childrenAges: 2, location: 1, philosophy: 1, interests: 1, coopPrefs: 1 },
        interests: { interests: 2, location: 1, philosophy: 1, childrenAges: 1, coopPrefs: 1 }
      };
      const weight = weights[prioritize] || {};
      for (const key of Object.keys(breakdown)) {
        breakdown[key] *= (weight[key] || 1);
      }
    }

    const totalScore = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

    return { totalScore: Math.min(100, totalScore), breakdown, matchReasons, distance, sharedInterests };
  }

  private calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
    const R = 6371; // Earth's radius in km
    const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
    const dLon = (coord2.lng - coord1.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private findChildrenOverlap(children1: HomeschoolChild[], children2: HomeschoolChild[]): {
    child1Name: string;
    child2Name: string;
    yearLevelDiff: number;
    sharedInterests: string[];
  }[] {
    const overlaps = [];
    
    for (const c1 of children1) {
      const c1Year = parseInt(c1.currentYearLevel.replace(/\D/g, ''));
      for (const c2 of children2) {
        const c2Year = parseInt(c2.currentYearLevel.replace(/\D/g, ''));
        const yearDiff = Math.abs(c1Year - c2Year);
        
        if (yearDiff <= 2) {
          const sharedInterests = c1.interests.filter(i => c2.interests.includes(i));
          overlaps.push({
            child1Name: c1.name,
            child2Name: c2.name,
            yearLevelDiff: yearDiff,
            sharedInterests
          });
        }
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

  private async aggregateTeachingCapabilities(
    tenantId: string,
    familyIds: string[]
  ): Promise<{ subject: string; teachers: { familyId: string; confidence: string }[] }[]> {
    const capabilities: Map<string, { familyId: string; confidence: string }[]> = new Map();
    
    for (const familyId of familyIds) {
      const family = await this.familyRepo.findById(tenantId, familyId);
      if (family) {
        for (const cap of family.teachingCapabilities) {
          if (cap.willingToTeachCoop) {
            if (!capabilities.has(cap.subject)) {
              capabilities.set(cap.subject, []);
            }
            capabilities.get(cap.subject)!.push({
              familyId,
              confidence: cap.confidence
            });
          }
        }
      }
    }

    return Array.from(capabilities.entries()).map(([subject, teachers]) => ({
      subject,
      teachers
    }));
  }

  private suggestCoopStructure(
    capabilities: { subject: string; teachers: any[] }[],
    preferences: any
  ): CoopStructure {
    const hasSpecialists = capabilities.some(c => 
      c.teachers.some(t => t.confidence === 'expert' || t.confidence === 'advanced')
    );

    return {
      type: hasSpecialists ? 'specialist_parent' : 'rotating_parent',
      classGroupings: 'multi_age',
      sharedAssessment: false,
      portfolioSharing: true
    };
  }

  private suggestCoopSchedule(preferredDays: string[], memberCount: number): Partial<CoopSchedule> {
    return {
      regularMeetings: preferredDays.slice(0, 2).map(day => ({
        day,
        startTime: '09:30',
        endTime: '14:30',
        focus: 'Core subjects and activities',
        location: 'TBD - rotating homes or community venue'
      }))
    };
  }

  private calculateCoopViability(
    candidates: FamilyMatch[],
    capabilities: any[],
    preferences: any
  ): number {
    let score = 50;  // Base
    
    // More members = more viable (up to a point)
    score += Math.min(20, candidates.length * 4);
    
    // More teaching capabilities = more viable
    score += Math.min(20, capabilities.length * 3);
    
    // High average compatibility = more viable
    const avgCompatibility = candidates.reduce((sum, c) => sum + c.totalScore, 0) / Math.max(1, candidates.length);
    score += avgCompatibility * 0.1;

    return Math.min(100, Math.round(score));
  }

  private generateCoopConsiderations(
    candidates: FamilyMatch[],
    capabilities: any[],
    structure: CoopStructure
  ): string[] {
    const considerations: string[] = [];

    if (candidates.length < 3) {
      considerations.push('Consider recruiting more families for sustainability');
    }

    if (capabilities.length < 5) {
      considerations.push('May need to supplement with external resources for some subjects');
    }

    if (structure.type === 'rotating_parent') {
      considerations.push('Ensure all parents are comfortable teaching before committing');
    }

    considerations.push('Establish clear communication channels and expectations early');
    considerations.push('Consider a trial period before formalizing the co-op');

    return considerations;
  }

  private async generateCoopAIInsights(members: CoopMember[]): Promise<CoopAIInsights> {
    return {
      healthScore: 100,
      healthFactors: [],
      engagementLevel: 'thriving',
      engagementIssues: [],
      teachingLoadBalance: 100,
      participationBalance: 100,
      recommendations: [],
      predictions: [],
      potentialConflicts: [],
      lastAnalyzed: new Date()
    };
  }

  private analyzeMemberEngagement(members: CoopMember[]): number {
    const activeMembers = members.filter(m => m.status === 'active').length;
    const avgAttendance = members.reduce((sum, m) => sum + m.attendanceRate, 0) / members.length;
    return Math.round((activeMembers / members.length) * 50 + avgAttendance * 0.5);
  }

  private analyzeTeachingBalance(coop: HomeschoolCoop): number {
    if (coop.members.length === 0) return 100;
    
    const commitmentCounts = coop.members.map(m => m.teachingCommitments.length);
    const avg = commitmentCounts.reduce((a, b) => a + b, 0) / commitmentCounts.length;
    const variance = commitmentCounts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / commitmentCounts.length;
    
    return Math.max(0, 100 - variance * 10);
  }

  private analyzeParticipationBalance(members: CoopMember[]): number {
    const attendanceRates = members.map(m => m.attendanceRate);
    const avg = attendanceRates.reduce((a, b) => a + b, 0) / attendanceRates.length;
    return Math.round(avg);
  }

  private analyzeFinancialHealth(finances: CoopFinances): number {
    if (finances.model === 'free') return 100;
    
    const hasOutstanding = finances.outstandingPayments.length > 0;
    return hasOutstanding ? 70 : 100;
  }

  private detectPotentialConflicts(coop: HomeschoolCoop): CoopAIInsights['potentialConflicts'] {
    return [];  // Would analyze patterns
  }

  private generateCoopRecommendations(
    coop: HomeschoolCoop,
    engagement: number,
    teachingBalance: number,
    participationBalance: number
  ): CoopAIInsights['recommendations'] {
    const recommendations: CoopAIInsights['recommendations'] = [];

    if (engagement < 70) {
      recommendations.push({
        priority: 'high',
        type: 'engagement',
        suggestion: 'Consider a social event to boost member engagement',
        rationale: 'Engagement score is below optimal level'
      });
    }

    if (teachingBalance < 60) {
      recommendations.push({
        priority: 'medium',
        type: 'schedule',
        suggestion: 'Redistribute teaching responsibilities more evenly',
        rationale: 'Some families are carrying more teaching load than others'
      });
    }

    return recommendations;
  }

  private generateCoopPredictions(
    coop: HomeschoolCoop,
    engagement: number
  ): CoopAIInsights['predictions'] {
    return [{
      metric: 'Membership',
      prediction: engagement > 80 ? 'Likely to grow' : 'Stable',
      confidence: 0.7,
      timeframe: 'Next 6 months'
    }];
  }

  private async generateExcursionSuggestions(
    yearLevels: string[],
    curriculumCodes: string[],
    subjects: string[],
    location?: { lat: number; lng: number },
    radius?: number
  ): Promise<ExcursionSuggestion[]> {
    // Would integrate with venue databases and curriculum mapping
    return [{
      venueId: 'venue_1',
      venueName: 'Australian Museum',
      venueType: 'museum',
      address: 'Sydney',
      distance: 10,
      relevanceScore: 95,
      curriculumConnections: ['ACSSU094', 'ACSHE098'],
      suggestedActivities: ['Guided dinosaur tour', 'Indigenous culture workshop'],
      estimatedCost: 15,
      bestFor: yearLevels,
      bookingRequired: true
    }];
  }

  private mapCurriculumToVenues(
    codes: string[],
    suggestions: ExcursionSuggestion[]
  ): { code: string; venues: string[] }[] {
    return codes.map(code => ({
      code,
      venues: suggestions
        .filter(s => s.curriculumConnections.includes(code))
        .map(s => s.venueName)
    }));
  }

  private async generateExcursionAIEnhancements(
    venue: Excursion['venue'],
    yearLevels: string[],
    connections: CurriculumConnection[]
  ): Promise<ExcursionAIEnhancements> {
    return {
      suggestedCurriculumCodes: connections.map(c => ({
        code: c.curriculumCode,
        relevance: 0.9,
        preActivityIdea: 'Research activity before visit',
        postActivityIdea: 'Reflection journal after visit'
      })),
      preExcursionActivities: ['Read about the topic', 'Prepare questions'],
      postExcursionActivities: ['Write a report', 'Create a presentation'],
      discussionQuestions: ['What did you learn?', 'What surprised you?'],
      relatedVenues: [],
      groupDiscountAvailable: true
    };
  }

  private async buildComplianceReport(
    family: HomeschoolFamily,
    type: string,
    requirements: JurisdictionRequirements
  ): Promise<ComplianceReport> {
    return {
      familyId: family.id,
      type,
      generatedAt: new Date(),
      jurisdiction: family.location.jurisdiction,
      children: family.children.map(c => ({
        name: c.name,
        yearLevel: c.currentYearLevel,
        subjectsCovered: c.subjectProgress.map(s => s.subject),
        curriculumCodesAddressed: c.subjectProgress.flatMap(s => s.completedCodes)
      })),
      summary: `Home education report for ${family.primaryContact.name} family`,
      curriculumCoverage: 'Comprehensive coverage of required learning areas',
      assessmentEvidence: 'Portfolio-based assessment ongoing'
    };
  }

  private generateComplianceRecommendations(
    family: HomeschoolFamily,
    requirements: JurisdictionRequirements
  ): string[] {
    const recommendations: string[] = [];

    if (requirements.registrationRequired && family.compliance.registrationStatus !== 'registered') {
      recommendations.push('Complete registration with education authority');
    }

    for (const doc of family.compliance.documents) {
      if (doc.status === 'missing') {
        recommendations.push(`Submit ${doc.name}`);
      }
    }

    return recommendations;
  }

  private determineComplianceNextSteps(
    family: HomeschoolFamily,
    requirements: JurisdictionRequirements
  ): string[] {
    const steps: string[] = [];

    if (family.compliance.nextReportDue) {
      steps.push(`Prepare progress report by ${family.compliance.nextReportDue}`);
    }

    return steps;
  }

  private calculateComplianceScore(
    family: HomeschoolFamily,
    requirements: JurisdictionRequirements,
    alerts: ComplianceAlert[]
  ): number {
    let score = 100;

    // Deduct for registration issues
    if (requirements.registrationRequired && family.compliance.registrationStatus !== 'registered') {
      score -= 30;
    }

    // Deduct for document issues
    for (const doc of family.compliance.documents) {
      if (doc.status === 'missing') score -= 15;
      if (doc.status === 'expired') score -= 10;
      if (doc.status === 'expiring_soon') score -= 5;
    }

    // Deduct for high-severity alerts
    const highAlerts = alerts.filter(a => a.severity === 'high').length;
    score -= highAlerts * 10;

    return Math.max(0, score);
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

interface FamilyMatch {
  familyId: string;
  familyName: string;
  totalScore: number;
  breakdown: Record<string, number>;
  matchReasons: string[];
  childrenOverlap: {
    child1Name: string;
    child2Name: string;
    yearLevelDiff: number;
    sharedInterests: string[];
  }[];
  distance?: number;
  sharedInterests: string[];
}

interface JurisdictionRequirements {
  registrationRequired: boolean;
  registrationAuthority: string;
  requiredDocuments: string[];
  reportingFrequency: 'annual' | 'biannual' | 'quarterly' | 'none';
  inspectionPossible: boolean;
  curriculumRequirement: string;
}

interface ComplianceAlert {
  type: 'registration' | 'document' | 'reporting' | 'inspection';
  severity: 'low' | 'medium' | 'high';
  message: string;
  action: string;
  deadline?: Date;
}

interface ComplianceReport {
  familyId: string;
  type: string;
  generatedAt: Date;
  jurisdiction: Jurisdiction;
  children: {
    name: string;
    yearLevel: string;
    subjectsCovered: string[];
    curriculumCodesAddressed: string[];
  }[];
  summary: string;
  curriculumCoverage: string;
  assessmentEvidence: string;
}

interface ExcursionSuggestion {
  venueId: string;
  venueName: string;
  venueType: ExcursionType;
  address: string;
  distance: number;
  relevanceScore: number;
  curriculumConnections: string[];
  suggestedActivities: string[];
  estimatedCost: number;
  bestFor: string[];
  bookingRequired: boolean;
}

export { HomeschoolHubService };
