/**
 * Homeschool Hub Type Definitions
 *
 * Types for the Homeschool Hub module:
 * - Family profiles (CRUD, educational approach, compliance, AI matching)
 * - Children management (year levels, learning styles, curriculum)
 * - Co-op discovery, creation, and membership
 * - Excursion planning with curriculum connections
 * - Family matching and compatibility scoring
 *
 * Source of truth:
 *   Prisma models: HomeschoolFamily, HomeschoolChild, HomeschoolCoop, CoopMember, Excursion
 *   Routes: packages/api/src/routes/homeschool.ts (514L, 8 endpoints)
 *   Shared types: packages/shared/src/types/homeschool.ts (377L)
 *   Service: packages/api/src/services/homeschool-hub.service.ts (469L)
 */

// =============================================================================
// EDUCATIONAL APPROACH & STRUCTURE
// =============================================================================

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

export type StructureLevel =
  | 'highly_structured'
  | 'moderately_structured'
  | 'relaxed'
  | 'unschooling';

export type AssessmentStyle =
  | 'formal_testing'
  | 'portfolio'
  | 'narrative'
  | 'minimal'
  | 'mixed';

export type LearningStyle =
  | 'visual'
  | 'auditory'
  | 'kinesthetic'
  | 'reading_writing'
  | 'mixed';

// =============================================================================
// FAMILY
// =============================================================================

export interface FamilyLocation {
  id?: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

export interface ComplianceStatus {
  jurisdiction: string;
  registrationStatus: 'registered' | 'pending' | 'exempt' | 'not_required';
  registrationNumber?: string;
  registrationExpiry?: string;
  documents: ComplianceDocument[];
  lastReportSubmitted?: string;
  nextReportDue?: string;
  reportingFrequency: 'annual' | 'biannual' | 'quarterly' | 'none';
  complianceScore: number;
  complianceAlerts: string[];
  suggestedActions: string[];
}

export interface ComplianceDocument {
  type: string;
  name: string;
  status: 'current' | 'expiring_soon' | 'expired' | 'missing';
  expiryDate?: string;
  documentUrl?: string;
  lastUpdated?: string;
}

export interface FamilyAIProfile {
  compatibilityVector: number[];
  predictedChallenges: string[];
  predictedStrengths: string[];
  engagementScore: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  recommendedCoops: string[];
  recommendedResources: string[];
  recommendedConnections: string[];
  supportNeedsScore: number;
  suggestedSupport: string[];
  lastAnalyzed: string;
}

export interface CoopPreferences {
  interestedInCoops: boolean;
  maxCoopsToJoin: number;
  willingToHost: boolean;
  willingToTeach: boolean;
  willingToOrganize: boolean;
  availableDays: string[];
  preferredTimes: string[];
  preferredCoopSize: string;
  ageRangeTolerance: number;
}

export interface HomeschoolFamily {
  id: string;
  tenantId: string;
  primaryContactUserId: string;
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  additionalContacts: unknown[];
  educationalPhilosophy?: string;
  curriculumApproach?: string;
  teachingCapabilities: unknown[];
  coopPreferences: CoopPreferences;
  compliance: ComplianceStatus;
  aiProfile: FamilyAIProfile;
  status: 'active' | 'inactive' | 'pending_verification';
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
  children: HomeschoolChild[];
  location?: FamilyLocation;
  coopMemberships?: Array<{
    coop: { id: string; name: string; status: string };
  }>;
}

// =============================================================================
// CHILDREN
// =============================================================================

export interface HomeschoolChild {
  id: string;
  familyId: string;
  name: string;
  dateOfBirth: string;
  currentYearLevel: string;
  learningStyle?: LearningStyle;
  interests: string[];
  strengths: string[];
  challengeAreas: string[];
  specialNeeds: string[];
  curriculumFramework: string;
  subjectProgress: SubjectProgress[];
}

export interface SubjectProgress {
  subject: string;
  currentLevel: string;
  curriculumCodes: string[];
  completedCodes: string[];
  inProgressCodes: string[];
  lastUpdated: string;
}

export interface CreateChildInput {
  name: string;
  dateOfBirth: string;
  currentYearLevel: string;
  learningStyle?: string;
  interests?: string[];
  strengths?: string[];
  challengeAreas?: string[];
  specialNeeds?: string[];
  curriculumFramework?: string;
}

// =============================================================================
// FAMILY CREATE/UPDATE INPUT (maps to Zod familySchema)
// =============================================================================

export interface CreateFamilyInput {
  primaryContactName: string;
  primaryContactEmail: string;
  primaryContactPhone?: string;
  location: {
    jurisdiction: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
    travelRadiusKm: number;
  };
  educationalProfile: {
    primaryApproach: string;
    secondaryApproaches?: string[];
    structureLevel: string;
    prioritySubjects: string[];
    enrichmentFocus?: string[];
    assessmentStyle: string;
  };
  coopPreferences: {
    interestedInCoops: boolean;
    maxCoopsToJoin: number;
    willingToHost: boolean;
    willingToTeach: boolean;
    willingToOrganize: boolean;
    availableDays: string[];
    preferredTimes: string[];
    preferredCoopSize: string;
    ageRangeTolerance: number;
  };
}

// =============================================================================
// FAMILY MATCHING
// =============================================================================

export interface FamilyMatch {
  familyId: string;
  familyName: string;
  location: string;
  educationalApproach: string;
  childrenAges: number[];
  childrenCount: number;
  compatibilityScore: number;
  matchReasons: string[];
}

// =============================================================================
// CO-OPS
// =============================================================================

export interface HomeschoolCoop {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  philosophy: string;
  primaryLocation?: {
    id: string;
    label: string;
    streetAddress: string;
  };
  meetingLocations: unknown[];
  maxFamilies: number;
  membershipFee?: number;
  meetingSchedule: MeetingSchedule;
  subjects: string[];
  ageRange: { min: number; max: number };
  educationalApproaches: string[];
  structure: CoopStructure;
  roles: unknown[];
  status: 'forming' | 'active' | 'paused' | 'dissolved';
  createdAt: string;
  updatedAt: string;
  members?: CoopMemberWithFamily[];
  _count?: { members: number };
}

export interface MeetingSchedule {
  frequency: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface CoopStructure {
  type: 'rotating_parent' | 'specialist_parent' | 'hired_teachers' | 'hybrid';
  description?: string;
}

export interface CoopMemberWithFamily {
  id: string;
  coopId: string;
  familyId: string;
  role: 'organizer' | 'admin' | 'teacher' | 'member';
  teachingSubjects: string[];
  joinedAt: string;
  status: 'active' | 'pending' | 'on_break' | 'leaving';
  family?: { primaryContactName: string };
}

export interface CreateCoopInput {
  name: string;
  description: string;
  philosophy: string;
  primaryLocation: { name: string; address: string };
  maxFamilies: number;
  meetingSchedule: MeetingSchedule;
  subjects: string[];
  ageRange: { min: number; max: number };
  educationalApproaches: string[];
}

export interface JoinCoopResult {
  id: string;
  coopId: string;
  familyId: string;
  role: string;
  teachingSubjects: string[];
  status: string;
}

// =============================================================================
// EXCURSIONS
// =============================================================================

export interface Excursion {
  id: string;
  tenantId: string;
  organizerId: string;
  coopId?: string;
  title: string;
  description: string;
  venue: ExcursionVenue;
  curriculumConnections: CurriculumConnection[];
  learningObjectives: string[];
  date: string;
  startTime: string;
  endTime: string;
  meetingPoint: string;
  transportation: string;
  minParticipants: number;
  maxParticipants: number;
  status: 'draft' | 'open' | 'full' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
  coop?: { name: string };
  _count?: { registrations: number };
}

export interface ExcursionVenue {
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  website?: string;
  contactPhone?: string;
}

export interface CurriculumConnection {
  curriculumCode: string;
  subject: string;
  description: string;
  activitySuggestion?: string;
  connectionStrength?: 'primary' | 'secondary' | 'enrichment';
}

// =============================================================================
// PAGINATION (shared response wrapper for coops and excursions)
// =============================================================================

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface PaginatedCoops {
  coops: HomeschoolCoop[];
  pagination: PaginationInfo;
}

export interface PaginatedExcursions {
  excursions: Excursion[];
  pagination: PaginationInfo;
}

// =============================================================================
// LEGACY TYPES (used by existing pages importing static data)
// These maintain compatibility with current page imports.
// =============================================================================

export interface LegacyHomeschoolChild {
  id: string;
  name: string;
  age: number;
  yearLevel: number;
  avatar: string;
  subjects: string[];
  overallProgress: number;
}

export interface LegacyHomeschoolSubject {
  id: string;
  name: string;
  hoursPerWeek: number;
  yearLevel: number;
  acaraAlignment: string;
  progress: number;
  units: string[];
  standardsCoverage: number;
  color: string;
}

export interface LegacyHomeschoolResource {
  id: string;
  title: string;
  type: 'Textbook' | 'Worksheet' | 'Video' | 'Interactive' | 'Game';
  subject: string;
  yearLevel: string;
  description: string;
  provider: string;
  bookmarked: boolean;
}

export interface LegacyWeeklyScheduleDay {
  day: string;
  subjects: string[];
}
