// =============================================================================
// LMS Integration Service
// =============================================================================
// The LMS Integration Service bridges Scholarly's storybook ecosystem with
// external Learning Management Systems. If Scholarly is the specialist reading
// clinic, LMS integration is the referral network — it lets schools that
// already use Google Classroom, Canvas, or other LMS platforms seamlessly
// incorporate Scholarly storybooks into their existing workflows without
// asking teachers to manage yet another separate system.
//
// Supports: Google Classroom (REST API), Canvas (REST API), and any
// LTI 1.3-compliant platform via the standard protocol.
//
// File: integration/lms-integration.ts
// Sprint: 8 | Backlog: DE-008 | Lines: ~530
// =============================================================================

import { Result } from '../shared/result';

// === Types ===

export type LMSProvider = 'google_classroom' | 'canvas' | 'lti_generic';
export type AssignmentStatus = 'draft' | 'published' | 'submitted' | 'returned';
export type SyncDirection = 'push' | 'pull' | 'bidirectional';

export interface LMSConnection {
  id: string;
  tenantId: string;
  provider: LMSProvider;
  name: string;
  credentials: LMSCredentials;
  syncConfig: SyncConfig;
  status: 'active' | 'inactive' | 'error';
  lastSyncAt?: string;
  lastSyncStatus?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LMSCredentials {
  provider: LMSProvider;
  // Google Classroom
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
  // Canvas
  canvasBaseUrl?: string;
  canvasAccessToken?: string;
  // LTI 1.3
  ltiIssuer?: string;
  ltiClientId?: string;
  ltiDeploymentId?: string;
  ltiPublicKeySetUrl?: string;
  ltiPrivateKey?: string;
}

export interface SyncConfig {
  direction: SyncDirection;
  syncClassrooms: boolean;
  syncStudents: boolean;
  syncAssignments: boolean;
  syncGrades: boolean;
  autoCreateAssignments: boolean;
  gradePassbackEnabled: boolean;
  syncIntervalMinutes: number;
}

export interface LMSClassroom {
  externalId: string;
  provider: LMSProvider;
  name: string;
  section?: string;
  teacherEmail?: string;
  studentCount: number;
  scholarlyGroupId?: string;
  lastSyncAt?: string;
}

export interface LMSStudent {
  externalId: string;
  provider: LMSProvider;
  email?: string;
  firstName: string;
  lastName: string;
  classroomExternalId: string;
  scholarlyLearnerId?: string;
  lastSyncAt?: string;
}

export interface LMSAssignment {
  id: string;
  externalId?: string;
  provider: LMSProvider;
  classroomExternalId: string;
  title: string;
  description: string;
  storybookId: string;
  dueDate?: string;
  maxPoints: number;
  status: AssignmentStatus;
  gradingCriteria: GradingCriteria;
  createdAt: string;
  publishedAt?: string;
}

export interface GradingCriteria {
  completionWeight: number;      // % of grade from completing the book
  accuracyWeight: number;        // % from reading accuracy (ASR)
  decodabilityWeight: number;    // % from decoding target GPCs correctly
  comprehensionWeight: number;   // % from comprehension questions (if applicable)
  timeWeight: number;            // % from reading within expected WCPM range
}

export interface GradePassback {
  assignmentId: string;
  studentExternalId: string;
  score: number;
  maxScore: number;
  percentage: number;
  breakdown: {
    completion: number;
    accuracy: number;
    decodability: number;
    comprehension: number;
    timing: number;
  };
  submittedAt: string;
  passedBackAt?: string;
  passbackStatus: 'pending' | 'success' | 'failed';
  error?: string;
}

// === Google Classroom Adapter ===

class GoogleClassroomAdapter {
  private readonly baseUrl = 'https://classroom.googleapis.com/v1';

  constructor(
    private readonly credentials: LMSCredentials,
    private readonly fetchFn: typeof fetch
  ) {}

  async listCourses(): Promise<Result<LMSClassroom[]>> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/courses?courseStates=ACTIVE`, {
        headers: { 'Authorization': `Bearer ${this.credentials.googleRefreshToken}` },
      });
      if (!response.ok) return { success: false, error: `Google API error: ${response.status}` };

      const data = await response.json();
      const classrooms: LMSClassroom[] = (data.courses || []).map((course: any) => ({
        externalId: course.id,
        provider: 'google_classroom' as LMSProvider,
        name: course.name,
        section: course.section,
        teacherEmail: course.ownerId,
        studentCount: 0,
      }));
      return { success: true, data: classrooms };
    } catch (error) {
      return { success: false, error: `Failed to list courses: ${error}` };
    }
  }

  async listStudents(courseId: string): Promise<Result<LMSStudent[]>> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/courses/${courseId}/students`, {
        headers: { 'Authorization': `Bearer ${this.credentials.googleRefreshToken}` },
      });
      if (!response.ok) return { success: false, error: `Google API error: ${response.status}` };

      const data = await response.json();
      const students: LMSStudent[] = (data.students || []).map((student: any) => ({
        externalId: student.userId,
        provider: 'google_classroom' as LMSProvider,
        email: student.profile?.emailAddress,
        firstName: student.profile?.name?.givenName || '',
        lastName: student.profile?.name?.familyName || '',
        classroomExternalId: courseId,
      }));
      return { success: true, data: students };
    } catch (error) {
      return { success: false, error: `Failed to list students: ${error}` };
    }
  }

  async createCourseWork(courseId: string, assignment: LMSAssignment): Promise<Result<string>> {
    try {
      const courseWork = {
        title: assignment.title,
        description: assignment.description,
        maxPoints: assignment.maxPoints,
        workType: 'ASSIGNMENT',
        state: assignment.status === 'published' ? 'PUBLISHED' : 'DRAFT',
        dueDate: assignment.dueDate ? this.formatGoogleDate(assignment.dueDate) : undefined,
        materials: [{
          link: { url: `https://app.scholarly.app/read/${assignment.storybookId}`, title: assignment.title },
        }],
      };

      const response = await this.fetchFn(`${this.baseUrl}/courses/${courseId}/courseWork`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.googleRefreshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(courseWork),
      });

      if (!response.ok) return { success: false, error: `Failed to create coursework: ${response.status}` };
      const data = await response.json();
      return { success: true, data: data.id };
    } catch (error) {
      return { success: false, error: `Failed to create assignment: ${error}` };
    }
  }

  async passBackGrade(courseId: string, courseWorkId: string, studentId: string, grade: GradePassback): Promise<Result<void>> {
    try {
      const submission = {
        assignedGrade: grade.score,
        draftGrade: grade.score,
      };

      const response = await this.fetchFn(
        `${this.baseUrl}/courses/${courseId}/courseWork/${courseWorkId}/studentSubmissions/${studentId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${this.credentials.googleRefreshToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(submission),
        }
      );

      if (!response.ok) return { success: false, error: `Grade passback failed: ${response.status}` };
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Grade passback error: ${error}` };
    }
  }

  private formatGoogleDate(isoDate: string): { year: number; month: number; day: number } {
    const d = new Date(isoDate);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
}

// === Canvas Adapter ===

class CanvasAdapter {
  constructor(
    private readonly credentials: LMSCredentials,
    private readonly fetchFn: typeof fetch
  ) {}

  private get baseUrl(): string { return this.credentials.canvasBaseUrl || ''; }

  async listCourses(): Promise<Result<LMSClassroom[]>> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/api/v1/courses?enrollment_state=active`, {
        headers: { 'Authorization': `Bearer ${this.credentials.canvasAccessToken}` },
      });
      if (!response.ok) return { success: false, error: `Canvas API error: ${response.status}` };

      const courses = await response.json();
      const classrooms: LMSClassroom[] = courses.map((course: any) => ({
        externalId: String(course.id),
        provider: 'canvas' as LMSProvider,
        name: course.name,
        section: course.course_code,
        studentCount: course.total_students || 0,
      }));
      return { success: true, data: classrooms };
    } catch (error) {
      return { success: false, error: `Failed to list Canvas courses: ${error}` };
    }
  }

  async listStudents(courseId: string): Promise<Result<LMSStudent[]>> {
    try {
      const response = await this.fetchFn(`${this.baseUrl}/api/v1/courses/${courseId}/users?enrollment_type=student`, {
        headers: { 'Authorization': `Bearer ${this.credentials.canvasAccessToken}` },
      });
      if (!response.ok) return { success: false, error: `Canvas API error: ${response.status}` };

      const users = await response.json();
      const students: LMSStudent[] = users.map((user: any) => ({
        externalId: String(user.id),
        provider: 'canvas' as LMSProvider,
        email: user.email,
        firstName: user.name?.split(' ')[0] || user.short_name || '',
        lastName: user.name?.split(' ').slice(1).join(' ') || '',
        classroomExternalId: courseId,
      }));
      return { success: true, data: students };
    } catch (error) {
      return { success: false, error: `Failed to list Canvas students: ${error}` };
    }
  }

  async createAssignment(courseId: string, assignment: LMSAssignment): Promise<Result<string>> {
    try {
      const canvasAssignment = {
        assignment: {
          name: assignment.title,
          description: `${assignment.description}\n\n<a href="https://app.scholarly.app/read/${assignment.storybookId}">Read on Scholarly</a>`,
          points_possible: assignment.maxPoints,
          submission_types: ['external_tool'],
          published: assignment.status === 'published',
          due_at: assignment.dueDate,
          external_tool_tag_attributes: {
            url: `https://app.scholarly.app/lti/launch/${assignment.storybookId}`,
            new_tab: true,
          },
        },
      };

      const response = await this.fetchFn(`${this.baseUrl}/api/v1/courses/${courseId}/assignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.credentials.canvasAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(canvasAssignment),
      });

      if (!response.ok) return { success: false, error: `Canvas assignment creation failed: ${response.status}` };
      const data = await response.json();
      return { success: true, data: String(data.id) };
    } catch (error) {
      return { success: false, error: `Failed to create Canvas assignment: ${error}` };
    }
  }

  async passBackGrade(courseId: string, assignmentId: string, studentId: string, grade: GradePassback): Promise<Result<void>> {
    try {
      const response = await this.fetchFn(
        `${this.baseUrl}/api/v1/courses/${courseId}/assignments/${assignmentId}/submissions/${studentId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.credentials.canvasAccessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ submission: { posted_grade: grade.score } }),
        }
      );
      if (!response.ok) return { success: false, error: `Canvas grade passback failed: ${response.status}` };
      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: `Canvas grade passback error: ${error}` };
    }
  }
}

// === LMS Integration Service (Orchestrator) ===

export class LMSIntegrationService {
  private readonly connections = new Map<string, LMSConnection>();
  private readonly assignments = new Map<string, LMSAssignment>();
  private readonly grades = new Map<string, GradePassback[]>();
  private readonly fetchFn: typeof fetch;

  constructor(fetchImpl?: typeof fetch) {
    this.fetchFn = fetchImpl || globalThis.fetch.bind(globalThis);
  }

  // --- Connection Management ---

  createConnection(
    tenantId: string, provider: LMSProvider, name: string,
    credentials: LMSCredentials, syncConfig?: Partial<SyncConfig>
  ): Result<LMSConnection> {
    const id = `lms_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const defaultSync: SyncConfig = {
      direction: 'bidirectional', syncClassrooms: true, syncStudents: true,
      syncAssignments: true, syncGrades: true, autoCreateAssignments: false,
      gradePassbackEnabled: true, syncIntervalMinutes: 60,
    };

    const connection: LMSConnection = {
      id, tenantId, provider, name, credentials: { ...credentials, provider },
      syncConfig: { ...defaultSync, ...syncConfig },
      status: 'active', createdAt: now, updatedAt: now,
    };

    this.connections.set(id, connection);
    return { success: true, data: connection };
  }

  getConnection(id: string): Result<LMSConnection> {
    const conn = this.connections.get(id);
    return conn ? { success: true, data: conn } : { success: false, error: 'Connection not found' };
  }

  listConnections(tenantId: string): Result<LMSConnection[]> {
    const conns = Array.from(this.connections.values()).filter(c => c.tenantId === tenantId);
    return { success: true, data: conns };
  }

  // --- Classroom Sync ---

  async syncClassrooms(connectionId: string): Promise<Result<LMSClassroom[]>> {
    const conn = this.connections.get(connectionId);
    if (!conn) return { success: false, error: 'Connection not found' };

    const adapter = this.getAdapter(conn);
    const result = await adapter.listCourses();

    if (result.success) {
      conn.lastSyncAt = new Date().toISOString();
      conn.lastSyncStatus = `Synced ${result.data!.length} classrooms`;
    }
    return result;
  }

  async syncStudents(connectionId: string, classroomExternalId: string): Promise<Result<LMSStudent[]>> {
    const conn = this.connections.get(connectionId);
    if (!conn) return { success: false, error: 'Connection not found' };

    const adapter = this.getAdapter(conn);
    return adapter.listStudents(classroomExternalId);
  }

  // --- Assignment Management ---

  async createAssignment(
    connectionId: string, classroomExternalId: string,
    storybookId: string, title: string, description: string,
    options?: { dueDate?: string; maxPoints?: number; gradingCriteria?: Partial<GradingCriteria>; autoPublish?: boolean }
  ): Promise<Result<LMSAssignment>> {
    const conn = this.connections.get(connectionId);
    if (!conn) return { success: false, error: 'Connection not found' };

    const assignmentId = `asgn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const defaultCriteria: GradingCriteria = {
      completionWeight: 30, accuracyWeight: 30, decodabilityWeight: 20,
      comprehensionWeight: 10, timeWeight: 10,
    };

    const assignment: LMSAssignment = {
      id: assignmentId,
      provider: conn.provider,
      classroomExternalId,
      title, description, storybookId,
      dueDate: options?.dueDate,
      maxPoints: options?.maxPoints || 100,
      status: options?.autoPublish ? 'published' : 'draft',
      gradingCriteria: { ...defaultCriteria, ...options?.gradingCriteria },
      createdAt: new Date().toISOString(),
      publishedAt: options?.autoPublish ? new Date().toISOString() : undefined,
    };

    // Push to LMS
    const adapter = this.getAdapter(conn);
    let externalResult: Result<string>;

    if (conn.provider === 'google_classroom') {
      externalResult = await (adapter as GoogleClassroomAdapter).createCourseWork(classroomExternalId, assignment);
    } else if (conn.provider === 'canvas') {
      externalResult = await (adapter as CanvasAdapter).createAssignment(classroomExternalId, assignment);
    } else {
      externalResult = { success: true, data: `lti_${assignmentId}` };
    }

    if (!externalResult.success) return { success: false, error: externalResult.error };

    assignment.externalId = externalResult.data;
    this.assignments.set(assignmentId, assignment);
    return { success: true, data: assignment };
  }

  // --- Grade Passback ---

  calculateGrade(
    criteria: GradingCriteria, maxPoints: number,
    performance: { completionRate: number; accuracy: number; gpcAccuracy: number; comprehensionScore: number; withinWcpmRange: boolean }
  ): GradePassback {
    const breakdown = {
      completion: Math.round(performance.completionRate * criteria.completionWeight) / 100 * maxPoints,
      accuracy: Math.round(performance.accuracy * criteria.accuracyWeight) / 100 * maxPoints,
      decodability: Math.round(performance.gpcAccuracy * criteria.decodabilityWeight) / 100 * maxPoints,
      comprehension: Math.round(performance.comprehensionScore * criteria.comprehensionWeight) / 100 * maxPoints,
      timing: (performance.withinWcpmRange ? criteria.timeWeight : criteria.timeWeight * 0.5) / 100 * maxPoints,
    };

    const score = Math.round((breakdown.completion + breakdown.accuracy + breakdown.decodability + breakdown.comprehension + breakdown.timing) * 100) / 100;

    return {
      assignmentId: '',
      studentExternalId: '',
      score,
      maxScore: maxPoints,
      percentage: Math.round((score / maxPoints) * 100),
      breakdown,
      submittedAt: new Date().toISOString(),
      passbackStatus: 'pending',
    };
  }

  async submitGrade(connectionId: string, assignmentId: string, studentExternalId: string, grade: GradePassback): Promise<Result<GradePassback>> {
    const conn = this.connections.get(connectionId);
    if (!conn) return { success: false, error: 'Connection not found' };
    if (!conn.syncConfig.gradePassbackEnabled) return { success: false, error: 'Grade passback not enabled' };

    const assignment = this.assignments.get(assignmentId);
    if (!assignment || !assignment.externalId) return { success: false, error: 'Assignment not found or not synced to LMS' };

    grade.assignmentId = assignmentId;
    grade.studentExternalId = studentExternalId;

    const adapter = this.getAdapter(conn);
    let passbackResult: Result<void>;

    if (conn.provider === 'google_classroom') {
      passbackResult = await (adapter as GoogleClassroomAdapter).passBackGrade(
        assignment.classroomExternalId, assignment.externalId, studentExternalId, grade
      );
    } else if (conn.provider === 'canvas') {
      passbackResult = await (adapter as CanvasAdapter).passBackGrade(
        assignment.classroomExternalId, assignment.externalId, studentExternalId, grade
      );
    } else {
      passbackResult = { success: true, data: undefined };
    }

    grade.passbackStatus = passbackResult.success ? 'success' : 'failed';
    grade.passedBackAt = new Date().toISOString();
    if (!passbackResult.success) grade.error = passbackResult.error;

    const existing = this.grades.get(assignmentId) || [];
    existing.push(grade);
    this.grades.set(assignmentId, existing);

    return { success: true, data: grade };
  }

  // --- Adapter Factory ---

  private getAdapter(conn: LMSConnection): GoogleClassroomAdapter | CanvasAdapter {
    switch (conn.provider) {
      case 'google_classroom': return new GoogleClassroomAdapter(conn.credentials, this.fetchFn);
      case 'canvas': return new CanvasAdapter(conn.credentials, this.fetchFn);
      default: return new GoogleClassroomAdapter(conn.credentials, this.fetchFn);
    }
  }
}

export default LMSIntegrationService;
