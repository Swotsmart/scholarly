/**
 * Micro-School Service Types
 */

import { Jurisdiction, SafeguardingCheck } from './jurisdiction';
import { EducationalApproach } from './homeschool';

export interface MicroSchool {
  id: string;
  tenantId: string;

  // Identity
  name: string;
  description: string;
  philosophy: string;
  educationalModel: EducationalApproach;

  // Location
  location: MicroSchoolLocation;
  facilities: SchoolFacility[];

  // Legal & Compliance
  legalEntity?: LegalEntity;
  compliance: MicroSchoolCompliance;

  // Founder & Staff
  founderId: string;
  staff: MicroSchoolStaff[];

  // Students
  students: MicroSchoolStudent[];
  enrollmentCapacity: number;

  // Curriculum
  curriculumFramework: string;
  subjects: string[];
  yearLevelsOffered: string[];

  // Schedule
  schedule: SchoolSchedule;
  termDates: TermDates[];

  // Fees
  tuitionFees: TuitionFees;

  // AI Health
  healthAnalysis?: SchoolHealthAnalysis;

  // Status
  status: 'forming' | 'registered' | 'active' | 'on_hold' | 'closed';
  foundedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MicroSchoolLocation {
  name: string;
  type: 'home' | 'commercial' | 'community_center' | 'church' | 'shared_space' | 'outdoor';
  address: string;
  suburb: string;
  state: string;
  postcode: string;
  jurisdiction: Jurisdiction;
  coordinates?: { lat: number; lng: number };
  indoorArea?: number; // square meters
  outdoorArea?: number;
  accessibility: string[];
}

export interface SchoolFacility {
  type: 'classroom' | 'library' | 'science_lab' | 'art_room' | 'music_room' | 'outdoor_area' | 'kitchen' | 'bathroom' | 'office';
  capacity: number;
  features: string[];
}

export interface LegalEntity {
  type: 'sole_trader' | 'partnership' | 'company' | 'association' | 'trust';
  registeredName: string;
  abn?: string;
  acn?: string;
  registrationDate?: Date;
}

export interface MicroSchoolCompliance {
  jurisdiction: Jurisdiction;
  registrationStatus: 'pending' | 'registered' | 'conditional' | 'exempt';
  registrationNumber?: string;
  registrationExpiry?: Date;
  registrationAuthority: string;

  // Required documents
  documents: ComplianceDocument[];

  // Insurance
  publicLiabilityInsurance?: InsurancePolicy;
  professionalIndemnityInsurance?: InsurancePolicy;
  workersCompensation?: InsurancePolicy;

  // Policies
  policies: SchoolPolicy[];

  // Inspections
  lastInspection?: Date;
  nextInspection?: Date;
  inspectionOutcome?: 'satisfactory' | 'improvements_required' | 'failed';

  // Overall score
  complianceScore: number;
  complianceAlerts: string[];
  recommendedActions: string[];
}

export interface ComplianceDocument {
  id: string;
  type: string;
  name: string;
  status: 'current' | 'expiring_soon' | 'expired' | 'missing' | 'not_required';
  expiryDate?: Date;
  documentUrl?: string;
  uploadedAt?: Date;
  verifiedAt?: Date;
}

export interface InsurancePolicy {
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  expiryDate: Date;
  documentUrl?: string;
}

export interface SchoolPolicy {
  type: 'child_protection' | 'behavior_management' | 'health_safety' | 'emergency' | 'privacy' | 'complaints' | 'enrollment' | 'fees' | 'curriculum';
  name: string;
  version: string;
  status: 'draft' | 'current' | 'under_review' | 'missing';
  documentUrl?: string;
  lastReviewedAt?: Date;
  nextReviewDue?: Date;
}

export interface MicroSchoolStaff {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  role: StaffRole;
  employmentType: 'full_time' | 'part_time' | 'casual' | 'volunteer';

  // Qualifications
  qualifications: StaffQualification[];
  teachingSubjects: string[];
  yearLevelCapabilities: string[];

  // Compliance
  safeguardingCheck?: SafeguardingCheck;
  firstAidCertification?: Certification;
  teachingRegistration?: TeachingRegistration;

  // Status
  status: 'active' | 'inactive' | 'pending_verification';
  startDate: Date;
  endDate?: Date;
}

export type StaffRole = 'principal' | 'lead_teacher' | 'teacher' | 'assistant' | 'admin' | 'volunteer';

export interface StaffQualification {
  type: string;
  title: string;
  institution?: string;
  dateObtained?: Date;
  verified: boolean;
  documentUrl?: string;
}

export interface Certification {
  type: string;
  issuer: string;
  certificateNumber?: string;
  issueDate: Date;
  expiryDate?: Date;
  status: 'valid' | 'expired' | 'pending';
  documentUrl?: string;
}

export interface TeachingRegistration {
  authority: string;
  registrationNumber: string;
  status: 'provisional' | 'full' | 'expired' | 'suspended';
  expiryDate: Date;
  verified: boolean;
}

export interface MicroSchoolStudent {
  id: string;
  familyId: string;
  name: string;
  dateOfBirth: Date;
  yearLevel: string;

  // Enrollment
  enrollmentStatus: 'applicant' | 'enrolled' | 'waitlisted' | 'withdrawn' | 'graduated';
  enrollmentDate?: Date;
  withdrawalDate?: Date;

  // Profile
  learningProfile?: StudentLearningProfile;
  medicalInformation?: MedicalInformation;
  emergencyContacts: EmergencyContact[];

  // LIS Integration
  lisProfileId?: string;
}

export interface StudentLearningProfile {
  learningStyle: string;
  strengths: string[];
  challenges: string[];
  interests: string[];
  goals: string[];
  accommodations?: string[];
  iep?: boolean;
}

export interface MedicalInformation {
  conditions: string[];
  allergies: string[];
  medications: string[];
  emergencyPlan?: string;
  doctorName?: string;
  doctorPhone?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  canCollect: boolean;
  priority: number;
}

export interface SchoolSchedule {
  timezone: string;
  daysOfOperation: number[]; // 0-6
  startTime: string;
  endTime: string;
  periods: SchedulePeriod[];
}

export interface SchedulePeriod {
  name: string;
  startTime: string;
  endTime: string;
  type: 'class' | 'break' | 'lunch' | 'assembly' | 'free_play';
}

export interface TermDates {
  term: number;
  year: number;
  startDate: Date;
  endDate: Date;
  holidays: HolidayPeriod[];
}

export interface HolidayPeriod {
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface TuitionFees {
  currency: string;
  annualFee?: number;
  termFee?: number;
  weeklyFee?: number;
  dailyFee?: number;
  siblingDiscount?: number;
  paymentSchedule: 'upfront' | 'termly' | 'monthly' | 'weekly';
  includesText: string[];
  excludes: string[];
}

export interface SchoolHealthAnalysis {
  overallScore: number;
  dimensions: HealthDimension[];
  predictions: HealthPrediction[];
  risks: HealthRisk[];
  recommendations: HealthRecommendation[];
  analyzedAt: Date;
}

export interface HealthDimension {
  name: string;
  score: number;
  trend: 'improving' | 'stable' | 'declining';
  factors: string[];
}

export interface HealthPrediction {
  type: string;
  description: string;
  probability: number;
  timeframe: string;
}

export interface HealthRisk {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  mitigations: string[];
}

export interface HealthRecommendation {
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  description: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

// ============================================================================
// ENROLLMENT TYPES
// ============================================================================

export interface EnrollmentApplication {
  id: string;
  schoolId: string;
  familyId: string;

  // Student Info
  studentName: string;
  studentDob: Date;
  requestedYearLevel: string;
  requestedStartDate: Date;

  // Application Details
  reasonForEnrolling: string;
  previousSchooling: string;
  learningNeeds?: string;
  additionalInfo?: string;

  // Status
  status: 'submitted' | 'under_review' | 'interview_scheduled' | 'trial_offered' | 'accepted' | 'rejected' | 'withdrawn';

  // Process
  submittedAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
  interviewDate?: Date;
  trialStartDate?: Date;
  trialEndDate?: Date;
  decisionDate?: Date;
  decisionNotes?: string;
}

// ============================================================================
// SETUP GUIDANCE TYPES
// ============================================================================

export interface SetupGuidance {
  jurisdiction: Jurisdiction;
  steps: SetupStep[];
  estimatedTimeline: string;
  estimatedCosts: CostEstimate[];
  requiredPolicies: string[];
  requiredDocuments: string[];
  warnings: string[];
}

export interface SetupStep {
  order: number;
  category: string;
  title: string;
  description: string;
  requirements: string[];
  deadline?: string;
  estimatedDuration: string;
  resources: SetupResource[];
  status: 'not_started' | 'in_progress' | 'completed';
}

export interface SetupResource {
  type: 'link' | 'document' | 'template' | 'contact';
  title: string;
  url?: string;
  description?: string;
}

export interface CostEstimate {
  category: string;
  item: string;
  estimatedAmount: number;
  currency: string;
  frequency: 'one_time' | 'annual' | 'monthly';
  required: boolean;
  notes?: string;
}
