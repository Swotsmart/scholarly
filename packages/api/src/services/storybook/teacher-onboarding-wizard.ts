// ============================================================================
// SCHOLARLY PLATFORM — S12-005: Teacher Onboarding Wizard
// Sprint 12: Guided setup flow for teachers
// ============================================================================
import { ScholarlyBaseService, Result } from '../shared/base';

// Section 1: Types
interface OnboardingSession { id: string; userId: string; tenantId: string; currentStep: number; totalSteps: number; completedSteps: string[]; data: OnboardingData; status: 'in_progress' | 'completed' | 'abandoned'; startedAt: Date; completedAt?: Date; }
interface OnboardingData { profile: TeacherProfile; school: SchoolSetup; classroom: ClassroomSetup; students: StudentImport; phonicsProgramme: PhonicsProgrammeConfig; preferences: TeacherPreferences; }
interface TeacherProfile { firstName: string; lastName: string; displayName: string; role: 'classroom_teacher' | 'specialist' | 'coordinator' | 'principal'; yearsExperience: number; phonicsTraining: string[]; }
interface SchoolSetup { name: string; type: 'primary' | 'prep' | 'combined' | 'special' | 'homeschool'; address?: string; country: string; timezone: string; existingSchoolId?: string; }
interface ClassroomSetup { name: string; yearGroup: string; academicYear: string; studentCount: number; phonicsPhase: number; scheduledSessionDays: string[]; sessionDuration: number; }
interface StudentImport { method: 'manual' | 'csv' | 'sis_integration' | 'google_classroom'; students: StudentEntry[]; importStatus: 'pending' | 'validating' | 'complete' | 'error'; errors: ImportError[]; }
interface StudentEntry { firstName: string; lastName: string; dateOfBirth?: string; parentEmail?: string; currentPhase?: number; notes?: string; }
interface ImportError { row: number; field: string; message: string; }
interface PhonicsProgrammeConfig { framework: 'letters_and_sounds' | 'jolly_phonics' | 'read_write_inc' | 'custom'; startingPhase: number; pacePreference: 'standard' | 'accelerated' | 'supported'; assessmentFrequency: 'weekly' | 'fortnightly' | 'termly'; enableArena: boolean; enableStoryLibrary: boolean; enableParentAccess: boolean; }
interface TeacherPreferences { dashboardLayout: 'compact' | 'detailed'; notificationPreferences: { email: boolean; push: boolean; interventionAlerts: boolean; weeklyDigest: boolean }; accessibilitySettings: { highContrast: boolean; largeText: boolean; reducedMotion: boolean }; }

// Section 2: Step Definitions
const ONBOARDING_STEPS = [
  { id: 'welcome', title: 'Welcome to Scholarly', description: 'A quick overview of what Scholarly can do for your classroom', required: true, estimatedMinutes: 2 },
  { id: 'profile', title: 'About You', description: 'Tell us about your teaching background', required: true, estimatedMinutes: 2 },
  { id: 'school', title: 'Your School', description: 'Set up or join your school', required: true, estimatedMinutes: 3 },
  { id: 'classroom', title: 'Create Your Class', description: 'Set up your classroom and schedule', required: true, estimatedMinutes: 3 },
  { id: 'students', title: 'Add Students', description: 'Import or add your students', required: true, estimatedMinutes: 5 },
  { id: 'phonics', title: 'Phonics Programme', description: 'Configure your phonics approach', required: true, estimatedMinutes: 3 },
  { id: 'preferences', title: 'Preferences', description: 'Customise your experience', required: false, estimatedMinutes: 2 },
  { id: 'tour', title: 'Quick Tour', description: 'A guided tour of key features', required: false, estimatedMinutes: 5 },
];

// Section 3: Onboarding Wizard Service
class TeacherOnboardingWizard extends ScholarlyBaseService {
  private session: OnboardingSession;
  constructor(tenantId: string, userId: string, private readonly prisma: any) {
    super(tenantId, userId);
    this.session = this.createSession();
  }

  private createSession(): OnboardingSession {
    return { id: `onb_${Date.now()}`, userId: this.userId, tenantId: this.tenantId, currentStep: 0, totalSteps: ONBOARDING_STEPS.length, completedSteps: [], data: { profile: {} as TeacherProfile, school: {} as SchoolSetup, classroom: {} as ClassroomSetup, students: { method: 'manual', students: [], importStatus: 'pending', errors: [] }, phonicsProgramme: { framework: 'letters_and_sounds', startingPhase: 2, pacePreference: 'standard', assessmentFrequency: 'fortnightly', enableArena: true, enableStoryLibrary: true, enableParentAccess: true }, preferences: { dashboardLayout: 'detailed', notificationPreferences: { email: true, push: true, interventionAlerts: true, weeklyDigest: true }, accessibilitySettings: { highContrast: false, largeText: false, reducedMotion: false } } }, status: 'in_progress', startedAt: new Date() };
  }

  async advanceStep(stepId: string, data: Partial<OnboardingData>): Promise<Result<OnboardingSession>> {
    const step = ONBOARDING_STEPS.find(s => s.id === stepId);
    if (!step) return { success: false, error: { code: 'INVALID_STEP', message: `Step ${stepId} not found` } };

    // Validate step data
    const validation = await this.validateStepData(stepId, data);
    if (!validation.success) return validation as Result<OnboardingSession>;

    // Merge data
    this.session.data = { ...this.session.data, ...data };
    this.session.completedSteps.push(stepId);
    this.session.currentStep = ONBOARDING_STEPS.findIndex(s => s.id === stepId) + 1;

    // Execute step-specific actions
    await this.executeStepActions(stepId, data);

    // Check completion
    const requiredSteps = ONBOARDING_STEPS.filter(s => s.required).map(s => s.id);
    const allRequired = requiredSteps.every(s => this.session.completedSteps.includes(s));
    if (allRequired) {
      this.session.status = 'completed';
      this.session.completedAt = new Date();
      await this.finaliseOnboarding();
    }

    return { success: true, data: this.session };
  }

  private async validateStepData(stepId: string, data: Partial<OnboardingData>): Promise<Result<void>> {
    switch (stepId) {
      case 'profile':
        if (!data.profile?.firstName || !data.profile?.lastName) return { success: false, error: { code: 'VALIDATION', message: 'Name required' } };
        break;
      case 'school':
        if (!data.school?.name || !data.school?.type) return { success: false, error: { code: 'VALIDATION', message: 'School name and type required' } };
        break;
      case 'classroom':
        if (!data.classroom?.name || !data.classroom?.yearGroup) return { success: false, error: { code: 'VALIDATION', message: 'Class name and year group required' } };
        if (data.classroom?.phonicsPhase && (data.classroom.phonicsPhase < 1 || data.classroom.phonicsPhase > 6)) return { success: false, error: { code: 'VALIDATION', message: 'Phonics phase must be 1-6' } };
        break;
      case 'students':
        if (data.students?.method === 'csv') {
          const errors = this.validateCSVImport(data.students.students);
          if (errors.length > 0) return { success: false, error: { code: 'CSV_ERRORS', message: `${errors.length} import errors`, details: { errors } } };
        }
        break;
    }
    return { success: true };
  }

  private validateCSVImport(students: StudentEntry[]): ImportError[] {
    const errors: ImportError[] = [];
    students.forEach((s, i) => {
      if (!s.firstName) errors.push({ row: i+1, field: 'firstName', message: 'First name required' });
      if (!s.lastName) errors.push({ row: i+1, field: 'lastName', message: 'Last name required' });
      if (s.parentEmail && !s.parentEmail.includes('@')) errors.push({ row: i+1, field: 'parentEmail', message: 'Invalid email' });
      if (s.currentPhase && (s.currentPhase < 1 || s.currentPhase > 6)) errors.push({ row: i+1, field: 'currentPhase', message: 'Phase must be 1-6' });
    });
    return errors;
  }

  private async executeStepActions(stepId: string, data: Partial<OnboardingData>): Promise<void> {
    switch (stepId) {
      case 'school':
        if (!data.school?.existingSchoolId) {
          await this.prisma.school.create({ data: { tenantId: this.tenantId, name: data.school!.name, type: data.school!.type, country: data.school!.country || 'AU', timezone: data.school!.timezone || 'Australia/Perth' } });
        }
        break;
      case 'classroom':
        await this.prisma.classroom.create({ data: { tenantId: this.tenantId, name: data.classroom!.name, yearGroup: data.classroom!.yearGroup, phonicsPhase: data.classroom!.phonicsPhase, teacherId: this.userId } });
        break;
      case 'students':
        for (const student of data.students?.students || []) {
          await this.prisma.learner.create({ data: { tenantId: this.tenantId, firstName: student.firstName, lastName: student.lastName, currentPhase: student.currentPhase || this.session.data.classroom.phonicsPhase, classroomId: this.session.data.classroom.name } });
        }
        break;
      case 'phonics':
        await this.prisma.phonicsConfig.create({ data: { tenantId: this.tenantId, classroomId: this.session.data.classroom.name, framework: data.phonicsProgramme!.framework, startingPhase: data.phonicsProgramme!.startingPhase, pacePreference: data.phonicsProgramme!.pacePreference } });
        break;
    }
  }

  private async finaliseOnboarding(): Promise<void> {
    // Create initial BKT profiles for all students
    // Generate welcome storybook recommendations
    // Send parent invitation emails if enabled
    // Schedule first assessment
    this.emit('onboarding.completed', { tenantId: this.tenantId, userId: this.userId, studentCount: this.session.data.students.students.length, phonicsPhase: this.session.data.classroom.phonicsPhase });
    this.log('info', 'Teacher onboarding completed', { sessionId: this.session.id });
  }

  async getProgress(): Promise<{ percentage: number; currentStep: string; remainingMinutes: number }> {
    const completed = this.session.completedSteps.length;
    const remaining = ONBOARDING_STEPS.slice(completed);
    return { percentage: Math.round((completed / this.session.totalSteps) * 100), currentStep: ONBOARDING_STEPS[this.session.currentStep]?.id || 'complete', remainingMinutes: remaining.reduce((sum, s) => sum + s.estimatedMinutes, 0) };
  }

  async parseCSV(csvContent: string): Promise<Result<StudentEntry[]>> {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return { success: false, error: { code: 'EMPTY_CSV', message: 'CSV must have header + data rows' } };
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const students: StudentEntry[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const entry: StudentEntry = { firstName: values[headers.indexOf('first_name')] || values[headers.indexOf('firstname')] || '', lastName: values[headers.indexOf('last_name')] || values[headers.indexOf('lastname')] || '' };
      const dobIdx = headers.indexOf('date_of_birth') !== -1 ? headers.indexOf('date_of_birth') : headers.indexOf('dob');
      if (dobIdx !== -1 && values[dobIdx]) entry.dateOfBirth = values[dobIdx];
      const emailIdx = headers.indexOf('parent_email') !== -1 ? headers.indexOf('parent_email') : headers.indexOf('email');
      if (emailIdx !== -1 && values[emailIdx]) entry.parentEmail = values[emailIdx];
      const phaseIdx = headers.indexOf('phase') !== -1 ? headers.indexOf('phase') : headers.indexOf('current_phase');
      if (phaseIdx !== -1 && values[phaseIdx]) entry.currentPhase = parseInt(values[phaseIdx]);
      students.push(entry);
    }
    return { success: true, data: students };
  }
}

export { TeacherOnboardingWizard, ONBOARDING_STEPS, OnboardingSession, OnboardingData, TeacherProfile, SchoolSetup, ClassroomSetup, StudentImport, StudentEntry, PhonicsProgrammeConfig };
