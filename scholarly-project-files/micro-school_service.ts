/**
 * AI-Enabled Micro-School Service
 * 
 * Comprehensive management for micro-schools - small, independent learning
 * communities (5-30 students) operating between homeschooling and traditional schools.
 * 
 * @module MicroSchoolService
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  Validator, EventBus, Cache, ScholarlyConfig, Jurisdiction
} from '../shared/types';

// ============================================================================
// CORE TYPES
// ============================================================================

export interface MicroSchool {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  mission: string;
  educationalModel: MicroSchoolModel;
  locations: MicroSchoolLocation[];
  primaryLocationId: string;
  compliance: MicroSchoolCompliance;
  governance: MicroSchoolGovernance;
  enrollment: EnrollmentConfig;
  staff: StaffMember[];
  students: EnrolledStudent[];
  finances: MicroSchoolFinances;
  schedule: MicroSchoolSchedule;
  aiInsights: MicroSchoolAIInsights;
  status: 'forming' | 'registered' | 'active' | 'paused' | 'closed';
  foundedAt: Date;
  updatedAt: Date;
}

export interface MicroSchoolModel {
  type: 'montessori' | 'waldorf' | 'classical' | 'project_based' | 'hybrid' | 'custom';
  description: string;
  ageRange: { min: number; max: number };
  yearLevels: string[];
  curriculumFrameworks: string[];
  curriculumDescription: string;
  multiAgeGrouping: boolean;
  studentLedLearning: number;
  technologyIntegration: 'minimal' | 'moderate' | 'extensive';
  outdoorLearning: boolean;
  assessmentApproach: 'traditional' | 'portfolio' | 'mastery' | 'narrative' | 'mixed';
  formalReporting: boolean;
  reportingFrequency: 'termly' | 'semesterly' | 'annually';
}

export interface MicroSchoolLocation {
  id: string;
  name: string;
  type: 'primary' | 'satellite' | 'outdoor' | 'partner_venue';
  address: { street: string; suburb: string; state: string; postcode: string; country: string };
  coordinates?: { lat: number; lng: number };
  facilities: {
    indoorSpaceSqm: number;
    outdoorSpaceSqm: number;
    maxCapacity: number;
    rooms: { name: string; type: string; capacity: number }[];
    amenities: string[];
  };
  compliance: {
    fireEvacuationPlan: boolean;
    firstAidKit: boolean;
    accessibilityCompliant: boolean;
    insuranceCovered: boolean;
    councilApproved: boolean;
    lastInspection?: Date;
  };
  availability: { days: string[]; startTime: string; endTime: string; termOnly: boolean };
  ownership: 'owned' | 'leased' | 'shared' | 'donated';
  monthlyCost?: number;
}

export interface MicroSchoolCompliance {
  jurisdiction: Jurisdiction;
  registrationType: RegistrationType;
  registrationStatus: 'not_required' | 'pending' | 'registered' | 'conditional' | 'lapsed';
  registrationNumber?: string;
  registrationExpiry?: Date;
  registrationAuthority: string;
  documents: ComplianceDocument[];
  staffRequirements: { minQualifiedTeachers: number; wwccRequired: boolean; firstAidRequired: boolean; currentCompliance: boolean };
  curriculumRequirements: { mustFollowNational: boolean; reportingRequired: boolean; assessmentRequired: boolean; currentCompliance: boolean };
  safetyRequirements: { childProtectionPolicy: boolean; emergencyProcedures: boolean; insuranceMinimum: number; currentCompliance: boolean };
  complianceScore: number;
  lastAudit?: Date;
  nextAuditDue?: Date;
  complianceAlerts: ComplianceAlert[];
  suggestedActions: string[];
}

export type RegistrationType = 'unregistered_small_group' | 'home_education_extension' | 'registered_non_government' | 'registered_independent' | 'community_learning_centre' | 'custom';

export interface ComplianceDocument {
  id: string;
  type: string;
  name: string;
  description: string;
  required: boolean;
  status: 'current' | 'expiring_soon' | 'expired' | 'missing' | 'not_required';
  documentUrl?: string;
  expiryDate?: Date;
  lastUpdated?: Date;
}

export interface ComplianceAlert {
  id: string;
  type: 'document' | 'staff' | 'facility' | 'curriculum' | 'registration';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  action: string;
  deadline?: Date;
}

export interface MicroSchoolGovernance {
  type: 'sole_operator' | 'parent_cooperative' | 'nonprofit' | 'private_company';
  leadership: { role: string; name: string; email: string; userId?: string }[];
  decisionMaking: 'founder_led' | 'committee' | 'consensus' | 'voting';
  policies: { name: string; status: 'draft' | 'active' | 'under_review'; lastReviewed: Date; documentUrl?: string }[];
  meetingFrequency: string;
  lastMeeting?: Date;
  legalEntity?: { name: string; abn?: string; acn?: string; type: string };
}

export interface EnrollmentConfig {
  maxStudents: number;
  currentEnrollment: number;
  waitlistSize: number;
  enrollmentType: 'rolling' | 'term_based' | 'annual';
  currentlyAccepting: boolean;
  nextEnrollmentOpen?: Date;
  enrollmentRequirements: string[];
  applicationProcess: string;
  trialPeriodDays?: number;
  feeStructure: { type: 'per_term' | 'per_month' | 'per_day' | 'annual'; amount: number; siblingsDiscount?: number; scholarshipsAvailable: boolean };
  ageMin: number;
  ageMax: number;
  yearLevelsAccepted: string[];
}

export interface StaffMember {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  role: 'founder' | 'lead_educator' | 'educator' | 'assistant' | 'specialist' | 'volunteer' | 'admin';
  responsibilities: string[];
  employmentType: 'full_time' | 'part_time' | 'casual' | 'volunteer' | 'contractor';
  hoursPerWeek?: number;
  startDate: Date;
  qualifications: { type: string; name: string; institution: string; year: number; verified: boolean }[];
  wwccNumber?: string;
  wwccExpiry?: Date;
  wwccVerified: boolean;
  firstAidCurrent: boolean;
  firstAidExpiry?: Date;
  teachingRegistration?: { number: string; jurisdiction: string; expiry: Date; verified: boolean };
  subjectsCanTeach: string[];
  yearLevelsCanTeach: string[];
  status: 'active' | 'on_leave' | 'departed';
}

export interface EnrolledStudent {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: Date;
  gender?: string;
  familyId: string;
  primaryContactId: string;
  contacts: { name: string; relationship: string; email: string; phone: string; isEmergencyContact: boolean; authorizedPickup: boolean }[];
  enrollmentDate: Date;
  yearLevel: string;
  enrollmentStatus: 'enrolled' | 'trial' | 'waitlist' | 'withdrawn' | 'graduated';
  learningProfile?: { strengths: string[]; challenges: string[]; interests: string[]; learningStyle: string; specialNeeds?: string[]; supportRequired?: string[] };
  medicalInfo?: { allergies: string[]; conditions: string[]; medications: string[]; dietaryRequirements: string[]; actionPlan?: string };
  lisProfileId?: string;
  currentProgress: { subject: string; level: string; status: 'below' | 'at' | 'above' | 'well_above'; lastUpdated: Date }[];
  attendanceRate: number;
  feeStatus: 'current' | 'overdue' | 'scholarship' | 'payment_plan';
  outstandingAmount?: number;
}

export interface MicroSchoolFinances {
  termlyFeeIncome: number;
  otherIncome: number;
  expenses: { category: string; budgeted: number; actual: number; frequency: 'weekly' | 'monthly' | 'termly' | 'annual' }[];
  currentBalance?: number;
  projectedBalanceEndTerm?: number;
  feesOutstanding: number;
  collectionRate: number;
  breakEvenStudents: number;
  sustainabilityScore: number;
}

export interface MicroSchoolSchedule {
  terms: { name: string; startDate: string; endDate: string; holidays: { name: string; date: string }[] }[];
  weeklySchedule: { day: string; isSchoolDay: boolean; startTime?: string; endTime?: string; activities: { time: string; activity: string; location?: string; staff?: string[] }[] }[];
  upcomingEvents: { id: string; name: string; date: string; type: string; description: string; allStudents: boolean; yearLevels?: string[] }[];
}

export interface MicroSchoolAIInsights {
  overallHealth: number;
  healthDimensions: { dimension: string; score: number; trend: 'improving' | 'stable' | 'declining'; issues: string[] }[];
  predictions: { metric: string; currentValue: number; predictedValue: number; timeframe: string; confidence: number }[];
  recommendations: { priority: 'high' | 'medium' | 'low'; category: string; recommendation: string; rationale: string; estimatedImpact: string }[];
  risks: { type: string; severity: 'low' | 'medium' | 'high'; description: string; mitigation: string }[];
  lastAnalyzed: Date;
}

export interface EnrollmentApplication {
  id: string;
  tenantId: string;
  microSchoolId: string;
  student: { firstName: string; lastName: string; dateOfBirth: Date; currentSchool?: string; currentYearLevel: string };
  family: { familyId?: string; primaryContact: { name: string; email: string; phone: string; relationship: string }; address: { street: string; suburb: string; state: string; postcode: string } };
  desiredStartDate: string;
  desiredYearLevel: string;
  reasonForApplying: string;
  status: 'submitted' | 'under_review' | 'interview_scheduled' | 'trial_offered' | 'accepted' | 'waitlisted' | 'declined' | 'withdrawn';
  statusHistory: { status: string; date: Date; notes?: string }[];
  decision?: { outcome: 'accept' | 'waitlist' | 'decline'; reason?: string; decidedBy: string; decidedAt: Date };
  trialDates?: { start: string; end: string };
  submittedAt: Date;
  updatedAt: Date;
}

export interface WaitlistEntry {
  id: string;
  applicationId: string;
  studentName: string;
  yearLevel: string;
  position: number;
  addedAt: Date;
  status: 'waiting' | 'offered' | 'declined' | 'enrolled';
}

interface JurisdictionRequirements {
  registrationRequired: boolean;
  registrationAuthority: string;
  minQualifiedStaff: number;
  wwccRequired: boolean;
  firstAidRequired: boolean;
  insuranceRequired: boolean;
  insuranceMinimum: number;
  curriculumRequirements: string;
  reportingRequirements: string;
  facilityRequirements: string[];
  requiredPolicies: string[];
  requiredDocuments: string[];
}

interface SetupStep {
  step: number;
  title: string;
  description: string;
  estimatedDays: number;
  requirements: string[];
  tips: string[];
}

// Repositories
export interface MicroSchoolRepository {
  findById(tenantId: string, id: string): Promise<MicroSchool | null>;
  findByOperator(tenantId: string, userId: string): Promise<MicroSchool[]>;
  save(tenantId: string, school: MicroSchool): Promise<MicroSchool>;
  update(tenantId: string, id: string, updates: Partial<MicroSchool>): Promise<MicroSchool>;
}

export interface ApplicationRepository {
  findById(tenantId: string, id: string): Promise<EnrollmentApplication | null>;
  findBySchool(tenantId: string, schoolId: string): Promise<EnrollmentApplication[]>;
  save(tenantId: string, application: EnrollmentApplication): Promise<EnrollmentApplication>;
  update(tenantId: string, id: string, updates: Partial<EnrollmentApplication>): Promise<EnrollmentApplication>;
}

export interface WaitlistRepository {
  findBySchool(tenantId: string, schoolId: string): Promise<WaitlistEntry[]>;
  save(tenantId: string, entry: WaitlistEntry): Promise<WaitlistEntry>;
  update(tenantId: string, id: string, updates: Partial<WaitlistEntry>): Promise<WaitlistEntry>;
}

// ============================================================================
// SERVICE
// ============================================================================

export class MicroSchoolService extends ScholarlyBaseService {
  private readonly schoolRepo: MicroSchoolRepository;
  private readonly applicationRepo: ApplicationRepository;
  private readonly waitlistRepo: WaitlistRepository;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    schoolRepo: MicroSchoolRepository;
    applicationRepo: ApplicationRepository;
    waitlistRepo: WaitlistRepository;
  }) {
    super('MicroSchoolService', deps);
    this.schoolRepo = deps.schoolRepo;
    this.applicationRepo = deps.applicationRepo;
    this.waitlistRepo = deps.waitlistRepo;
  }

  // ==========================================================================
  // SCHOOL MANAGEMENT
  // ==========================================================================

  async createMicroSchool(
    tenantId: string,
    data: {
      name: string;
      description: string;
      mission: string;
      educationalModel: MicroSchoolModel;
      primaryLocation: Omit<MicroSchoolLocation, 'id'>;
      founder: { name: string; email: string; userId?: string };
      jurisdiction: Jurisdiction;
    }
  ): Promise<Result<MicroSchool>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.name, 'name');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createMicroSchool', tenantId, async () => {
      const requirements = this.getJurisdictionRequirements(data.jurisdiction);
      const primaryLocation: MicroSchoolLocation = { ...data.primaryLocation, id: this.generateId('loc') };

      const school: MicroSchool = {
        id: this.generateId('school'),
        tenantId,
        name: data.name,
        description: data.description,
        mission: data.mission,
        educationalModel: data.educationalModel,
        locations: [primaryLocation],
        primaryLocationId: primaryLocation.id,
        compliance: this.initializeCompliance(data.jurisdiction, requirements),
        governance: {
          type: 'sole_operator',
          leadership: [{ role: 'Founder', name: data.founder.name, email: data.founder.email, userId: data.founder.userId }],
          decisionMaking: 'founder_led',
          policies: this.getDefaultPolicies(),
          meetingFrequency: 'Monthly'
        },
        enrollment: {
          maxStudents: 15,
          currentEnrollment: 0,
          waitlistSize: 0,
          enrollmentType: 'rolling',
          currentlyAccepting: false,
          enrollmentRequirements: ['Application form', 'Meet and greet'],
          applicationProcess: 'Submit application, attend meet and greet, trial period',
          trialPeriodDays: 5,
          feeStructure: { type: 'per_term', amount: 2500, scholarshipsAvailable: false },
          ageMin: data.educationalModel.ageRange.min,
          ageMax: data.educationalModel.ageRange.max,
          yearLevelsAccepted: data.educationalModel.yearLevels
        },
        staff: [],
        students: [],
        finances: { termlyFeeIncome: 0, otherIncome: 0, expenses: [], feesOutstanding: 0, collectionRate: 0, breakEvenStudents: 5, sustainabilityScore: 0 },
        schedule: { terms: [], weeklySchedule: this.getDefaultWeeklySchedule(), upcomingEvents: [] },
        aiInsights: this.generateInitialAIInsights(),
        status: 'forming',
        foundedAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.schoolRepo.save(tenantId, school);
      await this.publishEvent('scholarly.microschool.created', tenantId, { schoolId: saved.id, name: data.name });
      return saved;
    }, {});
  }

  async checkCompliance(tenantId: string, schoolId: string): Promise<Result<{ compliance: MicroSchoolCompliance; score: number; alerts: ComplianceAlert[]; recommendations: string[] }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('checkCompliance', tenantId, async () => {
      const school = await this.schoolRepo.findById(tenantId, schoolId);
      if (!school) throw new NotFoundError('School', schoolId);

      const requirements = this.getJurisdictionRequirements(school.compliance.jurisdiction);
      const alerts: ComplianceAlert[] = [];
      const recommendations: string[] = [];
      let score = 100;

      // Check registration
      if (requirements.registrationRequired && school.compliance.registrationStatus !== 'registered') {
        score -= 30;
        alerts.push({ id: this.generateId('alert'), type: 'registration', severity: 'critical', title: 'Registration Required', message: 'School registration is required but not complete', action: 'Complete registration process' });
      }

      // Check documents
      for (const doc of school.compliance.documents) {
        if (doc.required && doc.status === 'missing') {
          score -= 10;
          alerts.push({ id: this.generateId('alert'), type: 'document', severity: 'critical', title: `Missing: ${doc.name}`, message: doc.description, action: `Submit ${doc.name}` });
        } else if (doc.status === 'expired') {
          score -= 5;
          alerts.push({ id: this.generateId('alert'), type: 'document', severity: 'warning', title: `Expired: ${doc.name}`, message: `${doc.name} has expired`, action: `Renew ${doc.name}` });
        }
      }

      // Check staff WWCC
      for (const staff of school.staff) {
        if (requirements.wwccRequired && !staff.wwccVerified) {
          score -= 15;
          alerts.push({ id: this.generateId('alert'), type: 'staff', severity: 'critical', title: `WWCC Missing: ${staff.name}`, message: 'Working With Children Check not verified', action: 'Verify WWCC status' });
        }
        if (staff.wwccExpiry && this.daysUntil(staff.wwccExpiry) < 30) {
          alerts.push({ id: this.generateId('alert'), type: 'staff', severity: 'warning', title: `WWCC Expiring: ${staff.name}`, message: 'WWCC expires soon', action: 'Renew WWCC' });
        }
      }

      // Update compliance
      school.compliance.complianceScore = Math.max(0, score);
      school.compliance.complianceAlerts = alerts;
      await this.schoolRepo.update(tenantId, schoolId, { compliance: school.compliance });

      if (score < 70) recommendations.push('Urgent attention needed to compliance issues');
      if (alerts.filter(a => a.severity === 'critical').length > 0) recommendations.push('Address critical issues before continuing operations');

      return { compliance: school.compliance, score: Math.max(0, score), alerts, recommendations };
    }, { schoolId });
  }

  async getSetupGuidance(tenantId: string, jurisdiction: Jurisdiction, schoolType: RegistrationType): Promise<Result<{ requirements: JurisdictionRequirements; steps: SetupStep[]; estimatedTimeline: string; estimatedCosts: { item: string; cost: number; frequency: string }[]; warnings: string[] }>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getSetupGuidance', tenantId, async () => {
      const requirements = this.getJurisdictionRequirements(jurisdiction);
      const steps = this.generateSetupSteps(jurisdiction, schoolType, requirements);
      const estimatedTimeline = this.estimateSetupTimeline(steps);
      const estimatedCosts = this.estimateSetupCosts(jurisdiction, schoolType);
      const warnings = this.generateSetupWarnings(jurisdiction, schoolType);

      return { requirements, steps, estimatedTimeline, estimatedCosts, warnings };
    }, { jurisdiction });
  }

  // ==========================================================================
  // ENROLLMENT MANAGEMENT
  // ==========================================================================

  async submitApplication(tenantId: string, schoolId: string, applicationData: { student: EnrollmentApplication['student']; family: EnrollmentApplication['family']; desiredStartDate: string; desiredYearLevel: string; reasonForApplying: string }): Promise<Result<EnrollmentApplication>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('submitApplication', tenantId, async () => {
      const school = await this.schoolRepo.findById(tenantId, schoolId);
      if (!school) throw new NotFoundError('School', schoolId);
      if (!school.enrollment.currentlyAccepting) throw new ValidationError('School is not currently accepting applications');

      const application: EnrollmentApplication = {
        ...applicationData,
        id: this.generateId('app'),
        tenantId,
        microSchoolId: schoolId,
        status: 'submitted',
        statusHistory: [{ status: 'submitted', date: new Date() }],
        submittedAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.applicationRepo.save(tenantId, application);
      await this.publishEvent('scholarly.microschool.application_submitted', tenantId, { applicationId: saved.id, schoolId });
      return saved;
    }, { schoolId });
  }

  async processApplication(tenantId: string, applicationId: string, decision: { outcome: 'accept' | 'waitlist' | 'decline'; reason?: string; decidedBy: string; trialDates?: { start: string; end: string } }): Promise<Result<{ application: EnrollmentApplication; nextSteps: string[] }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(applicationId, 'applicationId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('processApplication', tenantId, async () => {
      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) throw new NotFoundError('Application', applicationId);

      const school = await this.schoolRepo.findById(tenantId, application.microSchoolId);
      if (!school) throw new NotFoundError('School', application.microSchoolId);

      let newStatus: EnrollmentApplication['status'];
      const nextSteps: string[] = [];

      switch (decision.outcome) {
        case 'accept':
          newStatus = decision.trialDates ? 'trial_offered' : 'accepted';
          application.trialDates = decision.trialDates;
          nextSteps.push(decision.trialDates ? `Trial: ${decision.trialDates.start} to ${decision.trialDates.end}` : 'Send enrollment contract');
          break;
        case 'waitlist':
          newStatus = 'waitlisted';
          const waitlist = await this.waitlistRepo.findBySchool(tenantId, school.id);
          await this.waitlistRepo.save(tenantId, { id: this.generateId('wait'), applicationId, studentName: `${application.student.firstName} ${application.student.lastName}`, yearLevel: application.desiredYearLevel, position: waitlist.length + 1, addedAt: new Date(), status: 'waiting' });
          nextSteps.push('Notify family of waitlist position');
          break;
        case 'decline':
          newStatus = 'declined';
          nextSteps.push('Send decline letter with reason');
          break;
      }

      application.status = newStatus;
      application.statusHistory.push({ status: newStatus, date: new Date(), notes: decision.reason });
      application.decision = { outcome: decision.outcome, reason: decision.reason, decidedBy: decision.decidedBy, decidedAt: new Date() };
      application.updatedAt = new Date();

      const updated = await this.applicationRepo.update(tenantId, applicationId, application);
      await this.publishEvent('scholarly.microschool.application_processed', tenantId, { applicationId, outcome: decision.outcome });

      return { application: updated, nextSteps };
    }, { applicationId });
  }

  async enrollStudent(tenantId: string, applicationId: string, enrollmentData: { startDate: Date; yearLevel: string }): Promise<Result<{ student: EnrolledStudent; school: MicroSchool }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(applicationId, 'applicationId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('enrollStudent', tenantId, async () => {
      const application = await this.applicationRepo.findById(tenantId, applicationId);
      if (!application) throw new NotFoundError('Application', applicationId);
      if (application.status !== 'accepted' && application.status !== 'trial_offered') {
        throw new ValidationError('Application must be accepted before enrollment');
      }

      const school = await this.schoolRepo.findById(tenantId, application.microSchoolId);
      if (!school) throw new NotFoundError('School', application.microSchoolId);
      if (school.enrollment.currentEnrollment >= school.enrollment.maxStudents) {
        throw new ValidationError('School is at maximum capacity');
      }

      const student: EnrolledStudent = {
        id: this.generateId('student'),
        firstName: application.student.firstName,
        lastName: application.student.lastName,
        dateOfBirth: application.student.dateOfBirth,
        familyId: application.family.familyId || this.generateId('family'),
        primaryContactId: this.generateId('contact'),
        contacts: [{ name: application.family.primaryContact.name, relationship: application.family.primaryContact.relationship, email: application.family.primaryContact.email, phone: application.family.primaryContact.phone, isEmergencyContact: true, authorizedPickup: true }],
        enrollmentDate: enrollmentData.startDate,
        yearLevel: enrollmentData.yearLevel,
        enrollmentStatus: 'enrolled',
        currentProgress: [],
        attendanceRate: 100,
        feeStatus: 'current'
      };

      school.students.push(student);
      school.enrollment.currentEnrollment = school.students.filter(s => s.enrollmentStatus === 'enrolled').length;
      const updatedSchool = await this.schoolRepo.update(tenantId, school.id, { students: school.students, enrollment: school.enrollment });

      application.status = 'accepted';
      await this.applicationRepo.update(tenantId, applicationId, application);

      await this.publishEvent('scholarly.microschool.student_enrolled', tenantId, { schoolId: school.id, studentId: student.id, studentName: `${student.firstName} ${student.lastName}` });

      return { student, school: updatedSchool };
    }, { applicationId });
  }

  // ==========================================================================
  // STAFF MANAGEMENT
  // ==========================================================================

  async addStaffMember(tenantId: string, schoolId: string, staffData: Omit<StaffMember, 'id' | 'status'>): Promise<Result<StaffMember>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('addStaffMember', tenantId, async () => {
      const school = await this.schoolRepo.findById(tenantId, schoolId);
      if (!school) throw new NotFoundError('School', schoolId);

      const staff: StaffMember = { ...staffData, id: this.generateId('staff'), status: 'active' };
      school.staff.push(staff);

      await this.schoolRepo.update(tenantId, schoolId, { staff: school.staff });
      await this.publishEvent('scholarly.microschool.staff_added', tenantId, { schoolId, staffId: staff.id, name: staff.name, role: staff.role });

      return staff;
    }, { schoolId });
  }

  async verifyStaffCompliance(tenantId: string, schoolId: string, staffId: string, verification: { wwccVerified?: boolean; wwccNumber?: string; wwccExpiry?: Date; firstAidCurrent?: boolean; firstAidExpiry?: Date }): Promise<Result<StaffMember>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
      Validator.required(staffId, 'staffId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('verifyStaffCompliance', tenantId, async () => {
      const school = await this.schoolRepo.findById(tenantId, schoolId);
      if (!school) throw new NotFoundError('School', schoolId);

      const staffIndex = school.staff.findIndex(s => s.id === staffId);
      if (staffIndex === -1) throw new NotFoundError('Staff', staffId);

      const staff = school.staff[staffIndex];
      if (verification.wwccVerified !== undefined) staff.wwccVerified = verification.wwccVerified;
      if (verification.wwccNumber) staff.wwccNumber = verification.wwccNumber;
      if (verification.wwccExpiry) staff.wwccExpiry = verification.wwccExpiry;
      if (verification.firstAidCurrent !== undefined) staff.firstAidCurrent = verification.firstAidCurrent;
      if (verification.firstAidExpiry) staff.firstAidExpiry = verification.firstAidExpiry;

      school.staff[staffIndex] = staff;
      await this.schoolRepo.update(tenantId, schoolId, { staff: school.staff });

      return staff;
    }, { schoolId, staffId });
  }

  // ==========================================================================
  // AI INSIGHTS
  // ==========================================================================

  async analyzeSchoolHealth(tenantId: string, schoolId: string): Promise<Result<MicroSchoolAIInsights>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('analyzeSchoolHealth', tenantId, async () => {
      const school = await this.schoolRepo.findById(tenantId, schoolId);
      if (!school) throw new NotFoundError('School', schoolId);

      const dimensions: MicroSchoolAIInsights['healthDimensions'] = [];
      const recommendations: MicroSchoolAIInsights['recommendations'] = [];
      const risks: MicroSchoolAIInsights['risks'] = [];

      // Compliance health
      const complianceScore = school.compliance.complianceScore;
      dimensions.push({ dimension: 'Compliance', score: complianceScore, trend: 'stable', issues: school.compliance.complianceAlerts.filter(a => a.severity !== 'info').map(a => a.title) });

      // Enrollment health
      const enrollmentPercent = (school.enrollment.currentEnrollment / school.enrollment.maxStudents) * 100;
      const enrollmentScore = enrollmentPercent >= 70 ? 90 : enrollmentPercent >= 50 ? 70 : enrollmentPercent >= 30 ? 50 : 30;
      dimensions.push({ dimension: 'Enrollment', score: enrollmentScore, trend: school.enrollment.waitlistSize > 0 ? 'improving' : 'stable', issues: enrollmentPercent < 50 ? ['Below optimal enrollment'] : [] });

      // Staff health
      const staffWithWWCC = school.staff.filter(s => s.wwccVerified).length;
      const staffScore = school.staff.length > 0 ? (staffWithWWCC / school.staff.length) * 100 : 0;
      dimensions.push({ dimension: 'Staff Compliance', score: staffScore, trend: 'stable', issues: staffScore < 100 ? ['Not all staff WWCC verified'] : [] });

      // Financial health
      const financialScore = school.finances.sustainabilityScore;
      dimensions.push({ dimension: 'Financial', score: financialScore, trend: 'stable', issues: financialScore < 50 ? ['Sustainability concerns'] : [] });

      // Overall health
      const overallHealth = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);

      // Generate recommendations
      if (complianceScore < 70) {
        recommendations.push({ priority: 'high', category: 'Compliance', recommendation: 'Address critical compliance issues immediately', rationale: 'Compliance score below acceptable threshold', estimatedImpact: 'Avoid regulatory issues' });
      }
      if (enrollmentPercent < 50) {
        recommendations.push({ priority: 'medium', category: 'Enrollment', recommendation: 'Implement enrollment marketing campaign', rationale: 'Current enrollment below sustainable level', estimatedImpact: 'Improve financial sustainability' });
      }
      if (school.enrollment.currentEnrollment < school.finances.breakEvenStudents) {
        risks.push({ type: 'Financial', severity: 'high', description: 'Below break-even enrollment', mitigation: 'Increase enrollment or reduce costs' });
      }

      const insights: MicroSchoolAIInsights = {
        overallHealth,
        healthDimensions: dimensions,
        predictions: [
          { metric: 'Enrollment', currentValue: school.enrollment.currentEnrollment, predictedValue: school.enrollment.currentEnrollment + Math.min(3, school.enrollment.waitlistSize), timeframe: 'Next term', confidence: 0.7 }
        ],
        recommendations,
        risks,
        lastAnalyzed: new Date()
      };

      await this.schoolRepo.update(tenantId, schoolId, { aiInsights: insights });
      return insights;
    }, { schoolId });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private getJurisdictionRequirements(jurisdiction: Jurisdiction): JurisdictionRequirements {
    const defaults: JurisdictionRequirements = {
      registrationRequired: true,
      registrationAuthority: 'State Education Authority',
      minQualifiedStaff: 1,
      wwccRequired: true,
      firstAidRequired: true,
      insuranceRequired: true,
      insuranceMinimum: 10000000,
      curriculumRequirements: 'Must address national curriculum areas',
      reportingRequirements: 'Annual progress reporting',
      facilityRequirements: ['Fire safety', 'First aid kit', 'Adequate space'],
      requiredPolicies: ['Child Protection', 'Emergency Procedures', 'Complaints Handling'],
      requiredDocuments: ['Registration Certificate', 'Insurance Certificate', 'Child Protection Policy']
    };

    const byJurisdiction: Record<string, Partial<JurisdictionRequirements>> = {
      'AU_NSW': { registrationAuthority: 'NESA', curriculumRequirements: 'Must address NSW syllabuses' },
      'AU_VIC': { registrationAuthority: 'VRQA', curriculumRequirements: 'Must provide regular and efficient instruction' },
      'AU_QLD': { registrationAuthority: 'NSSAB', curriculumRequirements: 'Must cover 8 key learning areas' }
    };

    return { ...defaults, ...byJurisdiction[jurisdiction] };
  }

  private initializeCompliance(jurisdiction: Jurisdiction, requirements: JurisdictionRequirements): MicroSchoolCompliance {
    return {
      jurisdiction,
      registrationType: 'unregistered_small_group',
      registrationStatus: requirements.registrationRequired ? 'pending' : 'not_required',
      registrationAuthority: requirements.registrationAuthority,
      documents: requirements.requiredDocuments.map(doc => ({ id: this.generateId('doc'), type: doc, name: doc, description: `Required: ${doc}`, required: true, status: 'missing' })),
      staffRequirements: { minQualifiedTeachers: requirements.minQualifiedStaff, wwccRequired: requirements.wwccRequired, firstAidRequired: requirements.firstAidRequired, currentCompliance: false },
      curriculumRequirements: { mustFollowNational: true, reportingRequired: true, assessmentRequired: true, currentCompliance: false },
      safetyRequirements: { childProtectionPolicy: false, emergencyProcedures: false, insuranceMinimum: requirements.insuranceMinimum, currentCompliance: false },
      complianceScore: 0,
      complianceAlerts: [],
      suggestedActions: ['Complete registration', 'Upload required documents', 'Verify staff compliance']
    };
  }

  private getDefaultPolicies(): MicroSchoolGovernance['policies'] {
    return [
      { name: 'Child Protection Policy', status: 'draft', lastReviewed: new Date() },
      { name: 'Emergency Procedures', status: 'draft', lastReviewed: new Date() },
      { name: 'Complaints Handling', status: 'draft', lastReviewed: new Date() },
      { name: 'Attendance Policy', status: 'draft', lastReviewed: new Date() }
    ];
  }

  private getDefaultWeeklySchedule(): MicroSchoolSchedule['weeklySchedule'] {
    const schoolDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    return schoolDays.map(day => ({
      day,
      isSchoolDay: true,
      startTime: '09:00',
      endTime: '15:00',
      activities: [
        { time: '09:00', activity: 'Morning circle' },
        { time: '09:30', activity: 'Core learning block' },
        { time: '11:00', activity: 'Morning tea' },
        { time: '11:30', activity: 'Project work' },
        { time: '13:00', activity: 'Lunch' },
        { time: '13:45', activity: 'Afternoon activities' },
        { time: '14:45', activity: 'Closing circle' }
      ]
    }));
  }

  private generateInitialAIInsights(): MicroSchoolAIInsights {
    return {
      overallHealth: 50,
      healthDimensions: [
        { dimension: 'Setup Progress', score: 20, trend: 'improving', issues: ['Initial setup in progress'] }
      ],
      predictions: [],
      recommendations: [
        { priority: 'high', category: 'Setup', recommendation: 'Complete compliance requirements', rationale: 'Essential for operations', estimatedImpact: 'Enable legal operation' }
      ],
      risks: [],
      lastAnalyzed: new Date()
    };
  }

  private generateSetupSteps(jurisdiction: Jurisdiction, schoolType: RegistrationType, requirements: JurisdictionRequirements): SetupStep[] {
    return [
      { step: 1, title: 'Define Educational Model', description: 'Document your educational philosophy, curriculum approach, and learning outcomes', estimatedDays: 14, requirements: ['Mission statement', 'Curriculum overview'], tips: ['Research similar micro-schools', 'Consult with experienced educators'] },
      { step: 2, title: 'Secure Location', description: 'Find and prepare a suitable learning space', estimatedDays: 30, requirements: requirements.facilityRequirements, tips: ['Consider community venues', 'Check zoning requirements'] },
      { step: 3, title: 'Develop Policies', description: 'Create required operational policies', estimatedDays: 21, requirements: requirements.requiredPolicies, tips: ['Use templates as starting point', 'Have policies reviewed by legal professional'] },
      { step: 4, title: 'Staff Compliance', description: 'Ensure all staff have required checks and qualifications', estimatedDays: 30, requirements: ['WWCC for all staff', 'First aid certification', 'Qualifications verification'], tips: ['Start WWCC applications early', 'Document all verifications'] },
      { step: 5, title: 'Registration', description: `Complete registration with ${requirements.registrationAuthority}`, estimatedDays: 60, requirements: requirements.requiredDocuments, tips: ['Contact authority early for guidance', 'Prepare thorough documentation'] },
      { step: 6, title: 'Insurance & Legal', description: 'Obtain required insurance and legal structure', estimatedDays: 14, requirements: ['Public liability insurance', 'Professional indemnity'], tips: ['Shop around for education-specific policies', 'Consider legal entity structure'] }
    ];
  }

  private estimateSetupTimeline(steps: SetupStep[]): string {
    const totalDays = steps.reduce((sum, s) => sum + s.estimatedDays, 0);
    const months = Math.ceil(totalDays / 30);
    return `${months}-${months + 2} months (parallel activities can reduce this)`;
  }

  private estimateSetupCosts(jurisdiction: Jurisdiction, schoolType: RegistrationType): { item: string; cost: number; frequency: string }[] {
    return [
      { item: 'Registration fees', cost: 500, frequency: 'one-time' },
      { item: 'Insurance', cost: 2000, frequency: 'annual' },
      { item: 'WWCC checks (per person)', cost: 80, frequency: 'one-time' },
      { item: 'First aid training', cost: 150, frequency: 'per person' },
      { item: 'Facility setup', cost: 5000, frequency: 'one-time' },
      { item: 'Curriculum resources', cost: 2000, frequency: 'annual' },
      { item: 'Legal/accounting setup', cost: 1500, frequency: 'one-time' }
    ];
  }

  private generateSetupWarnings(jurisdiction: Jurisdiction, schoolType: RegistrationType): string[] {
    const warnings: string[] = [];
    warnings.push('Operating without proper registration may result in penalties');
    warnings.push('All adults working with children must have valid Working With Children Check');
    warnings.push('Ensure adequate insurance coverage before commencing operations');
    if (schoolType === 'unregistered_small_group') {
      warnings.push('Small group exemptions may have student number limits - verify with authority');
    }
    return warnings;
  }

  private daysUntil(date: Date): number {
    return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }
}

export { MicroSchoolService };
