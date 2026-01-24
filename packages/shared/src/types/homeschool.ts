/**
 * Homeschool Hub Types
 */

import { Jurisdiction } from './jurisdiction';

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

  // Additional contacts
  additionalContacts: FamilyContact[];

  // Children
  children: HomeschoolChild[];

  // Location
  location: FamilyLocation;

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

export interface FamilyContact {
  userId?: string;
  name: string;
  relationship: string;
  email?: string;
  phone?: string;
  canTeach: boolean;
}

export interface FamilyLocation {
  jurisdiction: Jurisdiction;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  coordinates?: { lat: number; lng: number };
  travelRadiusKm: number;
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
  curriculumFramework: string;
  subjectProgress: SubjectProgress[];

  // LIS integration
  lisProfileId?: string;
  lisIntegrationEnabled: boolean;

  // Social
  friendConnections: string[];
  coopParticipation: string[];
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
  primaryApproach: EducationalApproach;
  secondaryApproaches: EducationalApproach[];
  structureLevel: 'highly_structured' | 'moderately_structured' | 'relaxed' | 'unschooling';
  typicalDailySchedule?: string;
  prioritySubjects: string[];
  enrichmentFocus: string[];
  religiousAffiliation?: string;
  valuesEmphasis: string[];
  assessmentStyle: 'formal_testing' | 'portfolio' | 'narrative' | 'minimal' | 'mixed';
}

export interface CoopPreferences {
  interestedInCoops: boolean;
  maxCoopsToJoin: number;
  willingToHost: boolean;
  willingToTeach: boolean;
  willingToOrganize: boolean;
  availableDays: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday')[];
  preferredTimes: ('morning' | 'afternoon' | 'full_day')[];
  preferredCoopSize: 'small' | 'medium' | 'large';
  ageRangeTolerance: number;
  mustHave: string[];
  dealBreakers: string[];
}

export interface TeachingCapability {
  subject: string;
  yearLevels: string[];
  confidence: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  qualifications?: string[];
  willingToTeachCoop: boolean;
  willingToTutor: boolean;
  notes?: string;
}

export interface ComplianceStatus {
  jurisdiction: Jurisdiction;
  registrationStatus: 'registered' | 'pending' | 'exempt' | 'not_required';
  registrationNumber?: string;
  registrationExpiry?: Date;
  documents: HomeschoolComplianceDocument[];
  lastReportSubmitted?: Date;
  nextReportDue?: Date;
  reportingFrequency: 'annual' | 'biannual' | 'quarterly' | 'none';
  lastInspection?: Date;
  inspectionOutcome?: 'satisfactory' | 'improvements_required' | 'pending';
  complianceScore: number;
  complianceAlerts: string[];
  suggestedActions: string[];
}

export interface HomeschoolComplianceDocument {
  id: string;
  type: string;
  name: string;
  status: 'current' | 'expiring_soon' | 'expired' | 'missing';
  expiryDate?: Date;
  documentUrl?: string;
  lastUpdated?: Date;
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
  primaryLocation: CoopLocation;
  meetingLocations: CoopLocation[];

  // Membership
  members: CoopMember[];
  maxFamilies: number;
  membershipFee?: number;

  // Schedule
  meetingSchedule: MeetingSchedule;

  // Educational Focus
  subjects: string[];
  ageRange: { min: number; max: number };
  educationalApproaches: EducationalApproach[];

  // Structure
  structure: CoopStructure;
  roles: CoopRole[];

  // Status
  status: 'forming' | 'active' | 'on_hold' | 'dissolved';
  createdAt: Date;
  updatedAt: Date;
}

export interface CoopLocation {
  name: string;
  address: string;
  coordinates?: { lat: number; lng: number };
  suitableFor: string[];
  capacity?: number;
}

export interface CoopMember {
  familyId: string;
  role: 'organizer' | 'teacher' | 'member' | 'observer';
  teachingSubjects: string[];
  joinedAt: Date;
  status: 'active' | 'inactive' | 'pending';
}

export interface MeetingSchedule {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
  exceptions: Date[];
}

export interface CoopStructure {
  type: 'rotating_parent' | 'specialist_parent' | 'hybrid' | 'hired_teacher';
  description: string;
}

export interface CoopRole {
  name: string;
  responsibilities: string[];
  assignedTo?: string;
}

// ============================================================================
// EXCURSION TYPES
// ============================================================================

export interface Excursion {
  id: string;
  tenantId: string;
  organizerId: string;
  coopId?: string;

  // Details
  title: string;
  description: string;
  venue: ExcursionVenue;

  // Curriculum Alignment
  curriculumConnections: CurriculumConnection[];
  learningObjectives: string[];

  // Logistics
  date: Date;
  startTime: string;
  endTime: string;
  meetingPoint: string;
  transportation: string;

  // Capacity
  minParticipants: number;
  maxParticipants: number;
  registrations: ExcursionRegistration[];
  waitlist: string[];

  // Cost
  costPerChild: number;
  costPerAdult: number;
  paymentDeadline?: Date;

  // Status
  status: 'planning' | 'open' | 'confirmed' | 'completed' | 'cancelled';

  // Pre/Post Activities
  preActivities?: string[];
  postActivities?: string[];

  createdAt: Date;
  updatedAt: Date;
}

export interface ExcursionVenue {
  name: string;
  type: 'museum' | 'park' | 'zoo' | 'farm' | 'factory' | 'historical_site' | 'nature_reserve' | 'other';
  address: string;
  coordinates?: { lat: number; lng: number };
  website?: string;
  contactPhone?: string;
  accessibility: string[];
  facilities: string[];
}

export interface CurriculumConnection {
  curriculumCode: string;
  subject: string;
  description: string;
  yearLevels: string[];
}

export interface ExcursionRegistration {
  familyId: string;
  childrenIds: string[];
  adultsAttending: number;
  dietaryRequirements?: string;
  medicalNotes?: string;
  emergencyContact: string;
  paymentStatus: 'pending' | 'paid';
  registeredAt: Date;
}

// ============================================================================
// FAMILY MATCHING TYPES
// ============================================================================

export interface FamilyMatch {
  familyId: string;
  familyName: string;
  location: string;
  distanceKm: number;
  compatibilityScore: number;
  matchReasons: string[];
  matchBreakdown: {
    philosophyAlignment: number;
    childAgeOverlap: number;
    geographicProximity: number;
    sharedInterests: number;
    scheduleCompatibility: number;
  };
  childrenAges: number[];
  educationalApproach: EducationalApproach;
  sharedInterests: string[];
  availableDays: string[];
}

export interface CoopSuggestion {
  suggestedName: string;
  families: string[];
  structure: CoopStructure;
  suggestedSubjects: string[];
  suggestedSchedule: MeetingSchedule;
  viabilityScore: number;
  considerations: string[];
  teachingCapabilitiesMatrix: { [subject: string]: string[] };
}
