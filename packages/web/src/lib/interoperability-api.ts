/**
 * Interoperability API Client
 * Handles all API interactions for 1EdTech and Ed-Fi standards integration
 */

import type {
  LTIPlatform,
  LTITool,
  OneRosterConnection,
  OneRosterSyncJob,
  CASEFramework,
  CASEItem,
  BadgeDefinition,
  BadgeAssertion,
  EdFiConnection,
  EdFiSyncJob,
  EdFiConflict,
} from '@/types/interoperability';

const DEMO_MODE = true;
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// DEMO DATA - LTI
// =============================================================================

const demoPlatforms: LTIPlatform[] = [
  {
    id: 'plat-1',
    name: 'Canvas LMS',
    issuer: 'https://canvas.instructure.com',
    clientId: 'clnt_9f8e7d6c5b4a',
    deploymentId: 'dep_canvas_001',
    status: 'active',
    toolCount: 5,
    lastActivity: '2026-01-26T08:30:00Z',
  },
  {
    id: 'plat-2',
    name: 'Moodle',
    issuer: 'https://moodle.scholarly.edu',
    clientId: 'clnt_1a2b3c4d5e6f',
    deploymentId: 'dep_moodle_001',
    status: 'active',
    toolCount: 4,
    lastActivity: '2026-01-26T07:15:00Z',
  },
  {
    id: 'plat-3',
    name: 'Blackboard Learn',
    issuer: 'https://bb.scholarly.edu',
    clientId: 'clnt_aa11bb22cc33',
    deploymentId: 'dep_bb_001',
    status: 'inactive',
    toolCount: 3,
    lastActivity: '2026-01-20T14:45:00Z',
  },
];

const demoTools: LTITool[] = [
  {
    id: 'tool-1',
    name: 'Scholarly Assessment Engine',
    launchUrl: 'https://scholarly.edu/lti/assessment/launch',
    platformId: 'plat-1',
    scopes: ['lineitem', 'result.readonly', 'score'],
    status: 'active',
  },
  {
    id: 'tool-2',
    name: 'AI Tutor Widget',
    launchUrl: 'https://scholarly.edu/lti/ai-tutor/launch',
    platformId: 'plat-1',
    scopes: ['lineitem', 'result.readonly'],
    status: 'active',
  },
  {
    id: 'tool-3',
    name: 'LinguaFlow Practice',
    launchUrl: 'https://scholarly.edu/lti/linguaflow/launch',
    platformId: 'plat-2',
    scopes: ['lineitem', 'score', 'result.readonly'],
    status: 'active',
  },
  {
    id: 'tool-4',
    name: 'Digital Portfolio Viewer',
    launchUrl: 'https://scholarly.edu/lti/portfolio/launch',
    platformId: 'plat-2',
    scopes: ['lineitem'],
    status: 'active',
  },
  {
    id: 'tool-5',
    name: 'Standards Alignment Tool',
    launchUrl: 'https://scholarly.edu/lti/standards/launch',
    platformId: 'plat-3',
    scopes: ['lineitem', 'result.readonly', 'score'],
    status: 'inactive',
  },
];

// =============================================================================
// DEMO DATA - ONEROSTER
// =============================================================================

const demoOneRosterConnections: OneRosterConnection[] = [
  {
    id: 'or-1',
    name: 'NSW Department of Education',
    baseUrl: 'https://api.det.nsw.edu.au/oneroster/v1p2',
    syncDirection: 'bidirectional',
    status: 'connected',
    lastSync: '2026-01-26T06:00:00Z',
    recordCount: 8721,
  },
  {
    id: 'or-2',
    name: 'Victoria Department of Education',
    baseUrl: 'https://api.education.vic.gov.au/oneroster/v1p2',
    syncDirection: 'inbound',
    status: 'connected',
    lastSync: '2026-01-26T05:30:00Z',
    recordCount: 6711,
  },
];

const demoOneRosterSyncJobs: OneRosterSyncJob[] = [
  {
    id: 'orsj-1',
    connectionId: 'or-1',
    status: 'completed',
    resourceType: 'Users',
    recordsProcessed: 2450,
    recordsTotal: 2450,
    startedAt: '2026-01-26T06:00:00Z',
    completedAt: '2026-01-26T06:02:34Z',
    errors: 0,
  },
  {
    id: 'orsj-2',
    connectionId: 'or-1',
    status: 'completed',
    resourceType: 'Enrollments',
    recordsProcessed: 4120,
    recordsTotal: 4120,
    startedAt: '2026-01-26T06:03:00Z',
    completedAt: '2026-01-26T06:06:12Z',
    errors: 2,
  },
  {
    id: 'orsj-3',
    connectionId: 'or-1',
    status: 'completed',
    resourceType: 'Classes',
    recordsProcessed: 312,
    recordsTotal: 312,
    startedAt: '2026-01-26T06:07:00Z',
    completedAt: '2026-01-26T06:07:45Z',
    errors: 0,
  },
  {
    id: 'orsj-4',
    connectionId: 'or-2',
    status: 'completed',
    resourceType: 'Users',
    recordsProcessed: 1890,
    recordsTotal: 1890,
    startedAt: '2026-01-26T05:30:00Z',
    completedAt: '2026-01-26T05:32:10Z',
    errors: 1,
  },
  {
    id: 'orsj-5',
    connectionId: 'or-2',
    status: 'failed',
    resourceType: 'Enrollments',
    recordsProcessed: 1200,
    recordsTotal: 3400,
    startedAt: '2026-01-26T05:33:00Z',
    errors: 3,
  },
  {
    id: 'orsj-6',
    connectionId: 'or-2',
    status: 'completed',
    resourceType: 'Orgs',
    recordsProcessed: 45,
    recordsTotal: 45,
    startedAt: '2026-01-26T05:35:00Z',
    completedAt: '2026-01-26T05:35:12Z',
    errors: 0,
  },
];

// =============================================================================
// DEMO DATA - CASE
// =============================================================================

const demoCASEFrameworks: CASEFramework[] = [
  {
    id: 'cf-1',
    title: 'Australian Curriculum v9.0',
    creator: 'ACARA',
    version: '9.0',
    itemCount: 892,
    status: 'published',
    lastUpdated: '2026-01-15T00:00:00Z',
  },
  {
    id: 'cf-2',
    title: 'NSW Syllabus for the Australian Curriculum',
    creator: 'NESA',
    version: '2024.1',
    itemCount: 634,
    status: 'published',
    lastUpdated: '2026-01-10T00:00:00Z',
  },
  {
    id: 'cf-3',
    title: 'Victorian Curriculum F-10',
    creator: 'VCAA',
    version: '2.0',
    itemCount: 478,
    status: 'imported',
    lastUpdated: '2025-12-20T00:00:00Z',
  },
  {
    id: 'cf-4',
    title: 'IB Primary Years Programme',
    creator: 'International Baccalaureate',
    version: '2023',
    itemCount: 336,
    status: 'published',
    lastUpdated: '2025-11-01T00:00:00Z',
  },
];

const demoCASEItems: CASEItem[] = [
  {
    id: 'ci-1',
    humanCodingScheme: 'AC9M',
    fullStatement: 'Mathematics',
    type: 'Domain',
    level: 0,
    children: [
      {
        id: 'ci-1-1',
        humanCodingScheme: 'AC9M7',
        fullStatement: 'Year 7 Mathematics',
        type: 'Grade Level',
        level: 1,
        children: [
          {
            id: 'ci-1-1-1',
            humanCodingScheme: 'AC9M7N',
            fullStatement: 'Number and Algebra',
            type: 'Strand',
            level: 2,
            children: [
              {
                id: 'ci-1-1-1-1',
                humanCodingScheme: 'AC9M7N01',
                fullStatement: 'Describe the relationship between perfect square numbers and square roots, and use squares of numbers and square roots of perfect square numbers to solve problems',
                type: 'Content Description',
                level: 3,
              },
              {
                id: 'ci-1-1-1-2',
                humanCodingScheme: 'AC9M7N02',
                fullStatement: 'Find equivalent representations of rational numbers and represent rational numbers on a number line',
                type: 'Content Description',
                level: 3,
              },
            ],
          },
          {
            id: 'ci-1-1-2',
            humanCodingScheme: 'AC9M7M',
            fullStatement: 'Measurement',
            type: 'Strand',
            level: 2,
            children: [
              {
                id: 'ci-1-1-2-1',
                humanCodingScheme: 'AC9M7M01',
                fullStatement: 'Solve problems involving the area of triangles and parallelograms using established formulas and appropriate units',
                type: 'Content Description',
                level: 3,
              },
            ],
          },
        ],
      },
      {
        id: 'ci-1-2',
        humanCodingScheme: 'AC9M8',
        fullStatement: 'Year 8 Mathematics',
        type: 'Grade Level',
        level: 1,
        children: [
          {
            id: 'ci-1-2-1',
            humanCodingScheme: 'AC9M8N',
            fullStatement: 'Number and Algebra',
            type: 'Strand',
            level: 2,
            children: [
              {
                id: 'ci-1-2-1-1',
                humanCodingScheme: 'AC9M8N01',
                fullStatement: 'Recognise irrational numbers in applied contexts, including square roots and pi',
                type: 'Content Description',
                level: 3,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ci-2',
    humanCodingScheme: 'AC9E',
    fullStatement: 'English',
    type: 'Domain',
    level: 0,
    children: [
      {
        id: 'ci-2-1',
        humanCodingScheme: 'AC9E7',
        fullStatement: 'Year 7 English',
        type: 'Grade Level',
        level: 1,
        children: [
          {
            id: 'ci-2-1-1',
            humanCodingScheme: 'AC9E7LA',
            fullStatement: 'Language',
            type: 'Strand',
            level: 2,
            children: [
              {
                id: 'ci-2-1-1-1',
                humanCodingScheme: 'AC9E7LA01',
                fullStatement: 'Analyse how the selection and combination of language features in spoken, written and multimodal texts can influence audiences',
                type: 'Content Description',
                level: 3,
              },
            ],
          },
        ],
      },
    ],
  },
];

// =============================================================================
// DEMO DATA - BADGES & CLR
// =============================================================================

const demoBadgeDefinitions: BadgeDefinition[] = [
  {
    id: 'badge-1',
    name: 'Critical Thinker',
    description: 'Demonstrated excellence in critical analysis and evaluation across multiple assessments',
    criteria: 'Score 85%+ on 3 consecutive critical thinking assessments',
    image: 'blue',
    category: 'Academic',
    issuedCount: 78,
    status: 'active',
  },
  {
    id: 'badge-2',
    name: 'STEM Innovator',
    description: 'Completed an original STEM project with measurable community impact',
    criteria: 'Submit and present an original STEM project judged by panel',
    image: 'green',
    category: 'STEM',
    issuedCount: 34,
    status: 'active',
  },
  {
    id: 'badge-3',
    name: 'Digital Literacy',
    description: 'Mastered digital tools and responsible online practices',
    criteria: 'Complete all 5 digital literacy modules with 80%+ score',
    image: 'purple',
    category: 'Technology',
    issuedCount: 112,
    status: 'active',
  },
  {
    id: 'badge-4',
    name: 'Global Citizen',
    description: 'Engaged in cross-cultural learning and community service projects',
    criteria: 'Complete 20 hours of community service and cultural exchange program',
    image: 'amber',
    category: 'Service',
    issuedCount: 45,
    status: 'active',
  },
  {
    id: 'badge-5',
    name: 'Creative Writer',
    description: 'Published original creative writing showcasing narrative and poetic skills',
    criteria: 'Submit 3 approved creative works to the school publication',
    image: 'pink',
    category: 'Arts',
    issuedCount: 29,
    status: 'active',
  },
  {
    id: 'badge-6',
    name: 'Research Scholar',
    description: 'Conducted independent research with proper methodology and citations',
    criteria: 'Complete a research paper graded A or above with proper citations',
    image: 'indigo',
    category: 'Academic',
    issuedCount: 14,
    status: 'draft',
  },
];

const demoBadgeAssertions: BadgeAssertion[] = [
  {
    id: 'ba-1',
    badgeId: 'badge-1',
    badgeName: 'Critical Thinker',
    recipientName: 'Emma Wilson',
    issuedAt: '2026-01-20T10:00:00Z',
    verified: true,
    onChain: true,
  },
  {
    id: 'ba-2',
    badgeId: 'badge-3',
    badgeName: 'Digital Literacy',
    recipientName: 'Liam Chen',
    issuedAt: '2026-01-19T14:30:00Z',
    verified: true,
    onChain: false,
  },
  {
    id: 'ba-3',
    badgeId: 'badge-2',
    badgeName: 'STEM Innovator',
    recipientName: 'Aria Patel',
    issuedAt: '2026-01-18T09:15:00Z',
    verified: true,
    onChain: true,
  },
  {
    id: 'ba-4',
    badgeId: 'badge-4',
    badgeName: 'Global Citizen',
    recipientName: 'Noah Kim',
    issuedAt: '2026-01-17T16:00:00Z',
    verified: true,
    onChain: false,
  },
  {
    id: 'ba-5',
    badgeId: 'badge-1',
    badgeName: 'Critical Thinker',
    recipientName: 'Sophie Tremblay',
    issuedAt: '2026-01-16T11:45:00Z',
    verified: false,
    onChain: false,
  },
  {
    id: 'ba-6',
    badgeId: 'badge-5',
    badgeName: 'Creative Writer',
    recipientName: 'James Okafor',
    issuedAt: '2026-01-15T13:20:00Z',
    verified: true,
    onChain: true,
  },
];

// =============================================================================
// DEMO DATA - ED-FI
// =============================================================================

const demoEdFiConnections: EdFiConnection[] = [
  {
    id: 'edfi-1',
    districtName: 'Sydney Metro ISD',
    baseUrl: 'https://api.sydneymetro.edu.au/edfi/v5.3',
    apiVersion: '5.3',
    status: 'connected',
    lastSync: '2026-01-26T07:00:00Z',
    syncDirection: 'bidirectional',
  },
  {
    id: 'edfi-2',
    districtName: 'Melbourne Region',
    baseUrl: 'https://api.melbregion.edu.au/edfi/v5.3',
    apiVersion: '5.3',
    status: 'connected',
    lastSync: '2026-01-26T06:30:00Z',
    syncDirection: 'inbound',
  },
  {
    id: 'edfi-3',
    districtName: 'Brisbane South',
    baseUrl: 'https://api.brisbanesouth.edu.au/edfi/v5.2',
    apiVersion: '5.2',
    status: 'error',
    lastSync: '2026-01-25T22:00:00Z',
    syncDirection: 'outbound',
  },
];

const demoEdFiSyncJobs: EdFiSyncJob[] = [
  {
    id: 'efsj-1',
    connectionId: 'edfi-1',
    direction: 'inbound',
    resourceType: 'Students',
    status: 'completed',
    recordsProcessed: 12450,
    recordsTotal: 12450,
    conflicts: 0,
    startedAt: '2026-01-26T07:00:00Z',
  },
  {
    id: 'efsj-2',
    connectionId: 'edfi-1',
    direction: 'outbound',
    resourceType: 'Grades',
    status: 'completed',
    recordsProcessed: 34200,
    recordsTotal: 34200,
    conflicts: 1,
    startedAt: '2026-01-26T07:05:00Z',
  },
  {
    id: 'efsj-3',
    connectionId: 'edfi-1',
    direction: 'inbound',
    resourceType: 'Staff',
    status: 'completed',
    recordsProcessed: 890,
    recordsTotal: 890,
    conflicts: 0,
    startedAt: '2026-01-26T07:08:00Z',
  },
  {
    id: 'efsj-4',
    connectionId: 'edfi-2',
    direction: 'inbound',
    resourceType: 'Students',
    status: 'completed',
    recordsProcessed: 8900,
    recordsTotal: 8900,
    conflicts: 0,
    startedAt: '2026-01-26T06:30:00Z',
  },
  {
    id: 'efsj-5',
    connectionId: 'edfi-2',
    direction: 'inbound',
    resourceType: 'Enrollments',
    status: 'completed',
    recordsProcessed: 15600,
    recordsTotal: 15600,
    conflicts: 1,
    startedAt: '2026-01-26T06:35:00Z',
  },
  {
    id: 'efsj-6',
    connectionId: 'edfi-2',
    direction: 'inbound',
    resourceType: 'Sections',
    status: 'running',
    recordsProcessed: 1200,
    recordsTotal: 3400,
    conflicts: 0,
    startedAt: '2026-01-26T06:40:00Z',
  },
  {
    id: 'efsj-7',
    connectionId: 'edfi-3',
    direction: 'outbound',
    resourceType: 'Students',
    status: 'failed',
    recordsProcessed: 4500,
    recordsTotal: 9800,
    conflicts: 0,
    startedAt: '2026-01-25T22:00:00Z',
  },
  {
    id: 'efsj-8',
    connectionId: 'edfi-3',
    direction: 'outbound',
    resourceType: 'Assessments',
    status: 'pending',
    recordsProcessed: 0,
    recordsTotal: 5200,
    conflicts: 0,
    startedAt: '2026-01-25T22:10:00Z',
  },
];

const demoEdFiConflicts: EdFiConflict[] = [
  {
    id: 'efc-1',
    jobId: 'efsj-2',
    resourceType: 'StudentGrade',
    fieldName: 'letterGradeEarned',
    localValue: 'A',
    remoteValue: 'A-',
    status: 'unresolved',
    createdAt: '2026-01-26T07:06:12Z',
  },
  {
    id: 'efc-2',
    jobId: 'efsj-5',
    resourceType: 'StudentEnrollment',
    fieldName: 'entryDate',
    localValue: '2026-01-15',
    remoteValue: '2026-01-20',
    status: 'unresolved',
    createdAt: '2026-01-26T06:36:45Z',
  },
];

// =============================================================================
// API CLIENT
// =============================================================================

class InteroperabilityApiClient {
  private baseUrl: string;
  private demoMode: boolean;

  constructor() {
    this.baseUrl = `${API_BASE}/interoperability`;
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

  // LTI
  async getLTIPlatforms(): Promise<LTIPlatform[]> {
    if (this.demoMode) return demoPlatforms;
    return this.request('GET', '/lti/platforms');
  }

  async getLTITools(): Promise<LTITool[]> {
    if (this.demoMode) return demoTools;
    return this.request('GET', '/lti/tools');
  }

  // OneRoster
  async getOneRosterConnections(): Promise<OneRosterConnection[]> {
    if (this.demoMode) return demoOneRosterConnections;
    return this.request('GET', '/oneroster/connections');
  }

  async getOneRosterSyncJobs(): Promise<OneRosterSyncJob[]> {
    if (this.demoMode) return demoOneRosterSyncJobs;
    return this.request('GET', '/oneroster/sync-jobs');
  }

  // CASE
  async getCASEFrameworks(): Promise<CASEFramework[]> {
    if (this.demoMode) return demoCASEFrameworks;
    return this.request('GET', '/case/frameworks');
  }

  async getCASEItems(frameworkId: string): Promise<CASEItem[]> {
    if (this.demoMode) return demoCASEItems;
    return this.request('GET', `/case/frameworks/${frameworkId}/items`);
  }

  // Badges
  async getBadgeDefinitions(): Promise<BadgeDefinition[]> {
    if (this.demoMode) return demoBadgeDefinitions;
    return this.request('GET', '/badges/definitions');
  }

  async getBadgeAssertions(): Promise<BadgeAssertion[]> {
    if (this.demoMode) return demoBadgeAssertions;
    return this.request('GET', '/badges/assertions');
  }

  // Ed-Fi
  async getEdFiConnections(): Promise<EdFiConnection[]> {
    if (this.demoMode) return demoEdFiConnections;
    return this.request('GET', '/edfi/connections');
  }

  async getEdFiSyncJobs(): Promise<EdFiSyncJob[]> {
    if (this.demoMode) return demoEdFiSyncJobs;
    return this.request('GET', '/edfi/sync-jobs');
  }

  async getEdFiConflicts(): Promise<EdFiConflict[]> {
    if (this.demoMode) return demoEdFiConflicts;
    return this.request('GET', '/edfi/conflicts');
  }
}

export const interoperabilityApi = new InteroperabilityApiClient();
