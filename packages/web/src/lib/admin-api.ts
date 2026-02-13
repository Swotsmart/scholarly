/**
 * Admin API Client
 * Handles all API interactions for platform administration
 */

import type {
  AdminUser,
  PlatformStats,
  PlatformHealth,
  ReliefTeacher,
  RoomInventory,
  SchedulingConstraint,
  SystemReport,
  FeatureFlag,
  IntegrationService,
  AdminActivity,
} from '@/types/admin';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// DEMO DATA
// =============================================================================

const demoStats: PlatformStats = {
  totalUsers: 1247,
  activeSessions: 89,
  storageUsed: '45.2 GB',
  uptime: '99.97%',
};

const demoHealth: PlatformHealth = {
  cpuUsage: 34,
  memoryUsage: 62,
  dbConnections: 45,
  dbMaxConnections: 100,
  responseTimeMs: 142,
};

const demoUsers: AdminUser[] = [
  { id: 'u1', firstName: 'Liam', lastName: 'O\'Connor', email: 'liam.oconnor@scholarly.edu.au', role: 'learner', status: 'active', lastLogin: '2026-01-26T08:15:00Z', createdAt: '2025-02-10T00:00:00Z' },
  { id: 'u2', firstName: 'Charlotte', lastName: 'Nguyen', email: 'charlotte.nguyen@scholarly.edu.au', role: 'teacher', status: 'active', lastLogin: '2026-01-26T07:45:00Z', createdAt: '2024-11-03T00:00:00Z' },
  { id: 'u3', firstName: 'Jack', lastName: 'Williams', email: 'jack.williams@scholarly.edu.au', role: 'admin', status: 'active', lastLogin: '2026-01-26T09:00:00Z', createdAt: '2024-06-15T00:00:00Z' },
  { id: 'u4', firstName: 'Olivia', lastName: 'Smith', email: 'olivia.smith@scholarly.edu.au', role: 'parent', status: 'active', lastLogin: '2026-01-25T18:30:00Z', createdAt: '2025-03-22T00:00:00Z' },
  { id: 'u5', firstName: 'Noah', lastName: 'Patel', email: 'noah.patel@scholarly.edu.au', role: 'learner', status: 'inactive', lastLogin: '2026-01-10T14:00:00Z', createdAt: '2025-01-08T00:00:00Z' },
  { id: 'u6', firstName: 'Amelia', lastName: 'Chen', email: 'amelia.chen@scholarly.edu.au', role: 'teacher', status: 'active', lastLogin: '2026-01-26T06:30:00Z', createdAt: '2024-08-19T00:00:00Z' },
  { id: 'u7', firstName: 'Thomas', lastName: 'Brown', email: 'thomas.brown@scholarly.edu.au', role: 'learner', status: 'suspended', lastLogin: '2026-01-15T11:20:00Z', createdAt: '2025-05-14T00:00:00Z' },
  { id: 'u8', firstName: 'Isabella', lastName: 'Murphy', email: 'isabella.murphy@scholarly.edu.au', role: 'parent', status: 'active', lastLogin: '2026-01-24T20:10:00Z', createdAt: '2025-07-01T00:00:00Z' },
];

const demoActivities: AdminActivity[] = [
  { id: 'a1', action: 'User Registered', description: 'New learner account created for Sophie Taylor', user: 'System', timestamp: '2026-01-26T09:12:00Z', type: 'user' },
  { id: 'a2', action: 'Config Updated', description: 'Maintenance window scheduled for 28 Jan 02:00-04:00 AEST', user: 'Jack Williams', timestamp: '2026-01-26T08:45:00Z', type: 'config' },
  { id: 'a3', action: 'Report Generated', description: 'Term 1 enrolment summary exported', user: 'Charlotte Nguyen', timestamp: '2026-01-26T08:30:00Z', type: 'report' },
  { id: 'a4', action: 'User Suspended', description: 'Account suspended for Thomas Brown (policy violation)', user: 'Jack Williams', timestamp: '2026-01-26T07:15:00Z', type: 'user' },
  { id: 'a5', action: 'Feature Flag Toggled', description: 'AI Buddy chat enabled for Year 11-12 learners', user: 'Jack Williams', timestamp: '2026-01-25T16:50:00Z', type: 'config' },
];

const demoReliefTeachers: ReliefTeacher[] = [
  { id: 'rt1', name: 'Sarah Mitchell', qualifications: ['Mathematics', 'Physics'], availability: 'Mon-Fri', rating: 4.8, status: 'available' },
  { id: 'rt2', name: 'David Park', qualifications: ['English', 'History'], availability: 'Mon, Wed, Fri', rating: 4.6, status: 'assigned' },
  { id: 'rt3', name: 'Emma Kowalski', qualifications: ['Science', 'Biology'], availability: 'Tue-Thu', rating: 4.9, status: 'available' },
  { id: 'rt4', name: 'James Okafor', qualifications: ['PE', 'Health'], availability: 'Mon-Fri', rating: 4.5, status: 'available' },
  { id: 'rt5', name: 'Priya Sharma', qualifications: ['Art', 'Design & Technology'], availability: 'Mon-Thu', rating: 4.7, status: 'unavailable' },
  { id: 'rt6', name: 'Michael Torres', qualifications: ['Music', 'Drama'], availability: 'Wed-Fri', rating: 4.4, status: 'available' },
];

const demoRooms: RoomInventory[] = [
  { id: 'rm1', name: 'Room 101', type: 'classroom', capacity: 30, equipment: ['Projector', 'Whiteboard', 'Air Conditioning'], status: 'available' },
  { id: 'rm2', name: 'Science Lab A', type: 'lab', capacity: 24, equipment: ['Fume Hood', 'Projector', 'Lab Benches', 'Safety Shower'], status: 'occupied' },
  { id: 'rm3', name: 'Computer Lab 1', type: 'lab', capacity: 28, equipment: ['28 Workstations', 'Projector', 'Printer'], status: 'available' },
  { id: 'rm4', name: 'Assembly Hall', type: 'hall', capacity: 400, equipment: ['Stage', 'Sound System', 'Lighting Rig', 'Projector'], status: 'available' },
  { id: 'rm5', name: 'Library', type: 'library', capacity: 80, equipment: ['Study Desks', 'Computers', 'Projector', 'Quiet Zones'], status: 'occupied' },
  { id: 'rm6', name: 'Art Studio', type: 'studio', capacity: 20, equipment: ['Easels', 'Kiln', 'Sink Stations', 'Natural Lighting'], status: 'available' },
  { id: 'rm7', name: 'Room 204', type: 'classroom', capacity: 32, equipment: ['Projector', 'Interactive Whiteboard', 'Air Conditioning'], status: 'maintenance' },
  { id: 'rm8', name: 'Music Room', type: 'studio', capacity: 25, equipment: ['Piano', 'Sound System', 'Recording Booth', 'Instruments'], status: 'available' },
];

const demoConstraints: SchedulingConstraint[] = [
  { id: 'sc1', name: 'No Period 1 for Senior Staff', type: 'teacher_preference', description: 'Head of Department and coordinators should not have Period 1 classes to allow for morning meetings', priority: 'medium', enabled: true },
  { id: 'sc2', name: 'Double Periods for Science Labs', type: 'room_requirement', description: 'All science practical sessions require consecutive double periods in lab facilities', priority: 'high', enabled: true },
  { id: 'sc3', name: 'Year 12 Morning Block', type: 'time_block', description: 'Year 12 ATAR subjects must be scheduled in Periods 1-4 for optimal focus', priority: 'high', enabled: true },
  { id: 'sc4', name: 'PE Outdoor Availability', type: 'room_requirement', description: 'Physical Education classes require access to the oval or gymnasium', priority: 'medium', enabled: true },
  { id: 'sc5', name: 'Staff Meeting Wednesday P5', type: 'time_block', description: 'No classes scheduled for Period 5 on Wednesdays to allow weekly staff meetings', priority: 'high', enabled: true },
  { id: 'sc6', name: 'Part-Time Teacher Days', type: 'teacher_preference', description: 'Part-time staff teaching days must align with contracted days', priority: 'high', enabled: true },
  { id: 'sc7', name: 'Art Room Ventilation', type: 'room_requirement', description: 'Ceramics and painting classes must be in rooms with proper ventilation', priority: 'low', enabled: false },
  { id: 'sc8', name: 'Lunch Break Coverage', type: 'time_block', description: 'No Year 7-8 classes in the period immediately after lunch (transition buffer)', priority: 'low', enabled: false },
  { id: 'sc9', name: 'Music Noise Buffer', type: 'room_requirement', description: 'Music practice rooms should not be adjacent to exam rooms during assessment periods', priority: 'medium', enabled: true },
  { id: 'sc10', name: 'Senior Teacher Preference', type: 'teacher_preference', description: 'Teachers with 15+ years experience may request preferred teaching periods', priority: 'low', enabled: true },
  { id: 'sc11', name: 'Assembly Block Friday P6', type: 'time_block', description: 'Friday Period 6 reserved for whole-school or year-level assemblies', priority: 'medium', enabled: true },
  { id: 'sc12', name: 'Computer Lab Maintenance', type: 'room_requirement', description: 'Computer Lab 2 unavailable on Monday mornings for IT maintenance', priority: 'medium', enabled: true },
];

const demoReports: SystemReport[] = [
  { id: 'rp1', name: 'Term 1 Enrolment Summary', type: 'enrollment', generatedAt: '2026-01-26T08:30:00Z', status: 'ready', size: '2.4 MB' },
  { id: 'rp2', name: 'Weekly Attendance Report', type: 'attendance', generatedAt: '2026-01-25T17:00:00Z', status: 'ready', size: '1.1 MB' },
  { id: 'rp3', name: 'ACARA Compliance Audit', type: 'compliance', generatedAt: '2026-01-24T09:00:00Z', status: 'ready', size: '5.8 MB' },
  { id: 'rp4', name: 'Student Performance Analytics', type: 'performance', generatedAt: '2026-01-23T14:30:00Z', status: 'ready', size: '3.2 MB' },
  { id: 'rp5', name: 'Financial Year Budget Report', type: 'financial', generatedAt: '2026-01-22T10:00:00Z', status: 'generating', size: '--' },
  { id: 'rp6', name: 'System Security Audit Log', type: 'audit', generatedAt: '2026-01-20T06:00:00Z', status: 'ready', size: '890 KB' },
];

const demoFeatureFlags: FeatureFlag[] = [
  { id: 'ff1', name: 'AI Buddy Chat', enabled: true, description: 'AI-powered learning assistant for student queries', scope: 'global' },
  { id: 'ff2', name: 'LinguaFlow Module', enabled: true, description: 'CEFR-based language learning with IB integration', scope: 'tenant' },
  { id: 'ff3', name: 'Blockchain Credentials', enabled: false, description: 'Verified digital credentials on blockchain', scope: 'global' },
  { id: 'ff4', name: 'Early Years Module', enabled: true, description: 'EYLF-aligned early childhood learning tools', scope: 'tenant' },
  { id: 'ff5', name: 'Parent Portal', enabled: true, description: 'Parent access to student progress and communications', scope: 'global' },
  { id: 'ff6', name: 'Design Pitch AI', enabled: false, description: 'AI-assisted pitch deck creation and feedback', scope: 'user' },
  { id: 'ff7', name: 'Data Lake Analytics', enabled: true, description: 'Advanced analytics dashboard with data lake integration', scope: 'tenant' },
];

const demoIntegrations: IntegrationService[] = [
  { id: 'int1', name: 'Google Workspace', description: 'Single sign-on, Google Classroom sync, and Drive integration', status: 'connected', lastSync: '2026-01-26T09:00:00Z', icon: 'google' },
  { id: 'int2', name: 'Microsoft 365', description: 'Teams integration, OneDrive sync, and Azure AD authentication', status: 'connected', lastSync: '2026-01-26T08:45:00Z', icon: 'microsoft' },
  { id: 'int3', name: 'Canvas LMS', description: 'Grade passback, assignment sync, and course import', status: 'disconnected', lastSync: '2026-01-15T12:00:00Z', icon: 'canvas' },
  { id: 'int4', name: 'NAPLAN Online', description: 'National assessment results import and analytics', status: 'connected', lastSync: '2025-12-01T00:00:00Z', icon: 'naplan' },
];

// =============================================================================
// API CLIENT
// =============================================================================

class AdminApiClient {
  private baseUrl: string;
  private demoMode: boolean;

  constructor() {
    this.baseUrl = `${API_BASE}/admin`;
    this.demoMode = DEMO_MODE;
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Dashboard
  async getStats(): Promise<PlatformStats> {
    if (this.demoMode) return demoStats;
    return this.request('GET', '/stats');
  }

  async getHealth(): Promise<PlatformHealth> {
    if (this.demoMode) return demoHealth;
    return this.request('GET', '/health');
  }

  async getRecentActivity(): Promise<AdminActivity[]> {
    if (this.demoMode) return demoActivities;
    return this.request('GET', '/activity');
  }

  // Users
  async getUsers(): Promise<AdminUser[]> {
    if (this.demoMode) return demoUsers;
    return this.request('GET', '/users');
  }

  async updateUser(id: string, data: Partial<AdminUser>): Promise<AdminUser> {
    if (this.demoMode) {
      const user = demoUsers.find((u) => u.id === id);
      return { ...user!, ...data };
    }
    return this.request('PATCH', `/users/${id}`, data);
  }

  async deleteUser(id: string): Promise<void> {
    if (this.demoMode) return;
    return this.request('DELETE', `/users/${id}`);
  }

  // Scheduling
  async getReliefTeachers(): Promise<ReliefTeacher[]> {
    if (this.demoMode) return demoReliefTeachers;
    return this.request('GET', '/scheduling/relief');
  }

  async getRooms(): Promise<RoomInventory[]> {
    if (this.demoMode) return demoRooms;
    return this.request('GET', '/scheduling/rooms');
  }

  async getConstraints(): Promise<SchedulingConstraint[]> {
    if (this.demoMode) return demoConstraints;
    return this.request('GET', '/scheduling/constraints');
  }

  // Reports
  async getReports(): Promise<SystemReport[]> {
    if (this.demoMode) return demoReports;
    return this.request('GET', '/reports');
  }

  async generateReport(type: string): Promise<SystemReport> {
    if (this.demoMode) {
      return {
        id: `rp-${Date.now()}`,
        name: `${type} Report`,
        type,
        generatedAt: new Date().toISOString(),
        status: 'generating',
        size: '--',
      };
    }
    return this.request('POST', '/reports/generate', { type });
  }

  // Settings
  async getFeatureFlags(): Promise<FeatureFlag[]> {
    if (this.demoMode) return demoFeatureFlags;
    return this.request('GET', '/settings/feature-flags');
  }

  async toggleFeatureFlag(id: string, enabled: boolean): Promise<FeatureFlag> {
    if (this.demoMode) {
      const flag = demoFeatureFlags.find((f) => f.id === id);
      return { ...flag!, enabled };
    }
    return this.request('PATCH', `/settings/feature-flags/${id}`, { enabled });
  }

  async getIntegrations(): Promise<IntegrationService[]> {
    if (this.demoMode) return demoIntegrations;
    return this.request('GET', '/settings/integrations');
  }
}

export const adminApi = new AdminApiClient();
