/**
 * Knowledge Workspace Integration Service
 *
 * The "Digital Notebook" that replaces OneNote with something better — an open-source,
 * self-hosted knowledge workspace that merges documents, whiteboards, and databases
 * into a unified learning environment. This service integrates AFFiNE as Scholarly's
 * recommended knowledge workspace platform.
 *
 * ## The Granny Explanation
 *
 * Remember those big, colourful scrapbooks kids used to make? Where they'd paste
 * photos, write stories, draw pictures, and stick in little pockets with notes?
 * That's what this service creates — but digital, shareable, and smart.
 *
 * A student can write their history essay, draw a timeline on a whiteboard next
 * to it, and track their research sources in a little table — all on the same
 * page. Their teacher can peek in, leave sticky-note comments, and the parent
 * can see a beautiful portfolio of their child's best work.
 *
 * ## Architecture
 *
 * This service acts as the "embassy" between Scholarly and AFFiNE:
 *
 * 1. **Workspace Orchestrator** — Creates and manages AFFiNE workspaces per
 *    classroom, student, or learning group (like assigning notebooks)
 * 2. **Content Bridge** — Syncs educational content between Scholarly and
 *    AFFiNE documents (like a photocopier between two offices)
 * 3. **Permission Mapper** — Translates Scholarly's RBAC into AFFiNE's
 *    workspace membership model
 * 4. **Template Engine** — Provisions pre-built educational templates
 *    (lesson plan layouts, lab report structures, project boards)
 * 5. **Activity Tracker** — Monitors learning activity within workspaces
 *    for engagement analytics
 *
 * @module KnowledgeWorkspaceIntegrationService
 * @version 1.4.0
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  Validator,
  EventBus,
  Cache,
  ScholarlyConfig,
} from './base.service';
import { log } from '../lib/logger';

// ============================================================================
// AFFINE CONNECTION TYPES
// ============================================================================

/**
 * Configuration for connecting to a self-hosted AFFiNE instance.
 */
export interface AFFiNEInstanceConfig {
  baseUrl: string;
  graphqlEndpoint: string;
  serviceAccountEmail: string;
  serviceAccountToken: string;
  version: string;
  supportsAI: boolean;
  maxWorkspaces: number;
  maxStoragePerUser: number;
  status: 'connected' | 'degraded' | 'offline';
  lastHealthCheck: Date;
}

/**
 * A user's identity mapping between Scholarly and AFFiNE.
 */
export interface AFFiNEUserMapping {
  id: string;
  tenantId: string;
  scholarlyUserId: string;
  affineUserId: string;
  affineEmail: string;
  currentSessionToken?: string;
  sessionExpiresAt?: Date;
  workspaceIds: string[];
  theme: 'light' | 'dark' | 'system';
  defaultView: 'page' | 'edgeless';
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// WORKSPACE TYPES
// ============================================================================

/**
 * An AFFiNE workspace mapped to an educational context.
 */
export interface EducationalWorkspace {
  id: string;
  tenantId: string;
  affineWorkspaceId: string;
  workspaceType: WorkspaceType;
  name: string;
  description: string;
  purpose: WorkspacePurpose;
  ownerId: string;
  members: WorkspaceMember[];
  classroomId?: string;
  subjectId?: string;
  yearLevel?: string;
  termId?: string;
  coopId?: string;
  tutorSessionGroupId?: string;
  templateId?: string;
  pageCount: number;
  whiteboardCount: number;
  lastActivityAt?: Date;
  status: 'active' | 'archived' | 'locked';
  createdAt: Date;
  updatedAt: Date;
}

export enum WorkspaceType {
  PERSONAL_NOTEBOOK = 'personal_notebook',
  CLASSROOM = 'classroom',
  STUDY_GROUP = 'study_group',
  HOMESCHOOL_COOP = 'homeschool_coop',
  TUTOR_SESSION = 'tutor_session',
  TEACHER_PLANNING = 'teacher_planning',
  PORTFOLIO = 'portfolio',
  PROJECT_BASED = 'project_based',
}

export enum WorkspacePurpose {
  NOTE_TAKING = 'note_taking',
  LESSON_DELIVERY = 'lesson_delivery',
  COLLABORATIVE_LEARNING = 'collaborative_learning',
  BRAINSTORMING = 'brainstorming',
  PROJECT_MANAGEMENT = 'project_management',
  ASSESSMENT_PORTFOLIO = 'assessment_portfolio',
  RESOURCE_LIBRARY = 'resource_library',
  MEETING_NOTES = 'meeting_notes',
}

export interface WorkspaceMember {
  scholarlyUserId: string;
  affineUserId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  scholarlyRole: string;
  joinedAt: Date;
}

// ============================================================================
// PAGE & CONTENT TYPES
// ============================================================================

/**
 * A page within an AFFiNE workspace, enriched with educational metadata.
 */
export interface EducationalPage {
  id: string;
  tenantId: string;
  workspaceId: string;
  affinePageId: string;
  title: string;
  mode: 'page' | 'edgeless';
  pageType: EducationalPageType;
  subjectId?: string;
  curriculumCodes?: string[];
  lessonId?: string;
  assignmentId?: string;
  createdById: string;
  lastEditedById?: string;
  isShared: boolean;
  activeEditors: number;
  wordCount: number;
  blockCount: number;
  hasWhiteboardContent: boolean;
  hasKanbanBoard: boolean;
  tags: string[];
  createdAt: Date;
  modifiedAt: Date;
}

export enum EducationalPageType {
  // Student-facing
  LESSON_NOTES = 'lesson_notes',
  STUDY_GUIDE = 'study_guide',
  LAB_REPORT = 'lab_report',
  ESSAY_DRAFT = 'essay_draft',
  PROJECT_PLAN = 'project_plan',
  MIND_MAP = 'mind_map',
  FLASH_CARDS = 'flash_cards',
  REVISION_NOTES = 'revision_notes',

  // Teacher-facing
  LESSON_PLAN = 'lesson_plan',
  UNIT_OVERVIEW = 'unit_overview',
  ASSESSMENT_RUBRIC = 'assessment_rubric',
  CLASS_NOTES = 'class_notes',
  DIFFERENTIATION_PLAN = 'differentiation_plan',

  // Collaborative
  GROUP_PROJECT = 'group_project',
  BRAINSTORM_BOARD = 'brainstorm_board',
  PEER_REVIEW = 'peer_review',

  // Portfolio
  PORTFOLIO_PIECE = 'portfolio_piece',
  REFLECTION = 'reflection',

  // General
  FREEFORM = 'freeform',
  MEETING_NOTES = 'meeting_notes',
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface WorkspaceTemplate {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  category: TemplateCategory;
  pages: TemplatePageDefinition[];
  targetRoles: string[];
  yearLevels?: string[];
  subjects?: string[];
  curriculumFramework?: string;
  curriculumCodes?: string[];
  createdById: string;
  usageCount: number;
  averageRating: number;
  isPublic: boolean;
  isOfficial: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum TemplateCategory {
  LESSON_DELIVERY = 'lesson_delivery',
  LAB_SCIENCE = 'lab_science',
  ESSAY_WRITING = 'essay_writing',
  PROJECT_BASED_LEARNING = 'project_based_learning',
  STUDY_REVISION = 'study_revision',
  PORTFOLIO = 'portfolio',
  TEACHER_PLANNING = 'teacher_planning',
  HOMESCHOOL = 'homeschool',
  TUTORING = 'tutoring',
  GENERAL = 'general',
}

export interface TemplatePageDefinition {
  title: string;
  mode: 'page' | 'edgeless';
  pageType: EducationalPageType;
  blocks: TemplateBlock[];
  required: boolean;
  description?: string;
}

export interface TemplateBlock {
  type:
    | 'heading'
    | 'paragraph'
    | 'todo'
    | 'table'
    | 'divider'
    | 'callout'
    | 'code'
    | 'image_placeholder'
    | 'database'
    | 'kanban';
  content?: string;
  properties?: Record<string, unknown>;
  children?: TemplateBlock[];
}

// ============================================================================
// ACTIVITY & ANALYTICS TYPES
// ============================================================================

export interface WorkspaceActivity {
  workspaceId: string;
  period: { start: Date; end: Date };
  uniqueVisitors: number;
  totalEdits: number;
  totalTimeSpentMinutes: number;
  pagesCreated: number;
  whiteboardsCreated: number;
  blocksAdded: number;
  wordsWritten: number;
  commentsAdded: number;
  mentionsSent: number;
  simultaneousEditors: number;
  modeUsage: {
    documentTime: number;
    whiteboardTime: number;
  };
  topContributors: Array<{
    userId: string;
    edits: number;
    pagesCreated: number;
    timeSpentMinutes: number;
  }>;
}

export interface StudentLearningProfile {
  studentId: string;
  workspaceId: string;
  preferredMode: 'document' | 'whiteboard' | 'mixed';
  averageSessionLength: number;
  peakProductivityHour: number;
  noteTakingStyle: 'structured' | 'freeform' | 'visual' | 'mixed';
  usesKanban: boolean;
  usesDatabases: boolean;
  engagementTrend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

// ============================================================================
// REPOSITORIES (In-memory implementation for now)
// ============================================================================

export interface AFFiNEUserMappingRepository {
  findByScholarlyUser(
    tenantId: string,
    scholarlyUserId: string
  ): Promise<AFFiNEUserMapping | null>;
  findByAffineUser(
    tenantId: string,
    affineUserId: string
  ): Promise<AFFiNEUserMapping | null>;
  save(tenantId: string, mapping: AFFiNEUserMapping): Promise<AFFiNEUserMapping>;
  update(
    tenantId: string,
    id: string,
    updates: Partial<AFFiNEUserMapping>
  ): Promise<AFFiNEUserMapping>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface EducationalWorkspaceRepository {
  findById(tenantId: string, id: string): Promise<EducationalWorkspace | null>;
  findByAffineWorkspaceId(
    tenantId: string,
    affineWorkspaceId: string
  ): Promise<EducationalWorkspace | null>;
  findByOwner(tenantId: string, ownerId: string): Promise<EducationalWorkspace[]>;
  findByClassroom(
    tenantId: string,
    classroomId: string
  ): Promise<EducationalWorkspace[]>;
  findByMember(tenantId: string, userId: string): Promise<EducationalWorkspace[]>;
  findByType(tenantId: string, type: WorkspaceType): Promise<EducationalWorkspace[]>;
  save(tenantId: string, workspace: EducationalWorkspace): Promise<EducationalWorkspace>;
  update(
    tenantId: string,
    id: string,
    updates: Partial<EducationalWorkspace>
  ): Promise<EducationalWorkspace>;
}

export interface EducationalPageRepository {
  findById(tenantId: string, id: string): Promise<EducationalPage | null>;
  findByWorkspace(tenantId: string, workspaceId: string): Promise<EducationalPage[]>;
  findByType(
    tenantId: string,
    workspaceId: string,
    pageType: EducationalPageType
  ): Promise<EducationalPage[]>;
  findByAssignment(tenantId: string, assignmentId: string): Promise<EducationalPage[]>;
  save(tenantId: string, page: EducationalPage): Promise<EducationalPage>;
  update(
    tenantId: string,
    id: string,
    updates: Partial<EducationalPage>
  ): Promise<EducationalPage>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface WorkspaceTemplateRepository {
  findById(tenantId: string, id: string): Promise<WorkspaceTemplate | null>;
  findByCategory(
    tenantId: string,
    category: TemplateCategory
  ): Promise<WorkspaceTemplate[]>;
  findPublic(tenantId: string): Promise<WorkspaceTemplate[]>;
  save(tenantId: string, template: WorkspaceTemplate): Promise<WorkspaceTemplate>;
  update(
    tenantId: string,
    id: string,
    updates: Partial<WorkspaceTemplate>
  ): Promise<WorkspaceTemplate>;
}

// ============================================================================
// AFFINE GRAPHQL CLIENT (Abstracted)
// ============================================================================

export interface AFFiNEGraphQLClient {
  createUser(email: string, name: string, password?: string): Promise<{ id: string }>;
  getUser(userId: string): Promise<unknown>;
  createWorkspace(name: string): Promise<{ id: string }>;
  getWorkspace(workspaceId: string): Promise<unknown>;
  deleteWorkspace(workspaceId: string): Promise<void>;
  inviteMember(
    workspaceId: string,
    email: string,
    permission: string
  ): Promise<unknown>;
  removeMember(workspaceId: string, userId: string): Promise<void>;
  updateMemberPermission(
    workspaceId: string,
    userId: string,
    permission: string
  ): Promise<unknown>;
  listMembers(workspaceId: string): Promise<unknown[]>;
  createPage(
    workspaceId: string,
    title: string,
    mode?: 'page' | 'edgeless'
  ): Promise<{ id: string }>;
  getPage(workspaceId: string, pageId: string): Promise<unknown>;
  updatePage(
    workspaceId: string,
    pageId: string,
    updates: unknown
  ): Promise<unknown>;
  deletePage(workspaceId: string, pageId: string): Promise<void>;
  listPages(workspaceId: string): Promise<unknown[]>;
  getPageBlocks(workspaceId: string, pageId: string): Promise<unknown[]>;
  addBlock(workspaceId: string, pageId: string, block: unknown): Promise<unknown>;
  searchWorkspace(workspaceId: string, query: string): Promise<unknown[]>;
  searchGlobal(query: string): Promise<Array<{ id: string }>>;
  addComment(
    workspaceId: string,
    pageId: string,
    content: string
  ): Promise<unknown>;
  listComments(workspaceId: string, pageId: string): Promise<unknown[]>;
  getPageHistory(workspaceId: string, pageId: string): Promise<unknown[]>;
  restoreVersion(
    workspaceId: string,
    pageId: string,
    versionId: string
  ): Promise<void>;
  ping(): Promise<boolean>;
}

// ============================================================================
// IN-MEMORY REPOSITORIES (Demo/Development)
// ============================================================================

class InMemoryUserMappingRepository implements AFFiNEUserMappingRepository {
  private mappings: Map<string, AFFiNEUserMapping> = new Map();

  async findByScholarlyUser(
    tenantId: string,
    scholarlyUserId: string
  ): Promise<AFFiNEUserMapping | null> {
    for (const mapping of this.mappings.values()) {
      if (
        mapping.tenantId === tenantId &&
        mapping.scholarlyUserId === scholarlyUserId
      ) {
        return mapping;
      }
    }
    return null;
  }

  async findByAffineUser(
    tenantId: string,
    affineUserId: string
  ): Promise<AFFiNEUserMapping | null> {
    for (const mapping of this.mappings.values()) {
      if (mapping.tenantId === tenantId && mapping.affineUserId === affineUserId) {
        return mapping;
      }
    }
    return null;
  }

  async save(
    _tenantId: string,
    mapping: AFFiNEUserMapping
  ): Promise<AFFiNEUserMapping> {
    this.mappings.set(mapping.id, mapping);
    return mapping;
  }

  async update(
    _tenantId: string,
    id: string,
    updates: Partial<AFFiNEUserMapping>
  ): Promise<AFFiNEUserMapping> {
    const existing = this.mappings.get(id);
    if (!existing) throw new NotFoundError('AFFiNEUserMapping', id);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.mappings.set(id, updated);
    return updated;
  }

  async delete(_tenantId: string, id: string): Promise<void> {
    this.mappings.delete(id);
  }
}

class InMemoryWorkspaceRepository implements EducationalWorkspaceRepository {
  private workspaces: Map<string, EducationalWorkspace> = new Map();

  async findById(
    tenantId: string,
    id: string
  ): Promise<EducationalWorkspace | null> {
    const ws = this.workspaces.get(id);
    return ws && ws.tenantId === tenantId ? ws : null;
  }

  async findByAffineWorkspaceId(
    tenantId: string,
    affineWorkspaceId: string
  ): Promise<EducationalWorkspace | null> {
    for (const ws of this.workspaces.values()) {
      if (
        ws.tenantId === tenantId &&
        ws.affineWorkspaceId === affineWorkspaceId
      ) {
        return ws;
      }
    }
    return null;
  }

  async findByOwner(
    tenantId: string,
    ownerId: string
  ): Promise<EducationalWorkspace[]> {
    return Array.from(this.workspaces.values()).filter(
      (ws) => ws.tenantId === tenantId && ws.ownerId === ownerId
    );
  }

  async findByClassroom(
    tenantId: string,
    classroomId: string
  ): Promise<EducationalWorkspace[]> {
    return Array.from(this.workspaces.values()).filter(
      (ws) => ws.tenantId === tenantId && ws.classroomId === classroomId
    );
  }

  async findByMember(
    tenantId: string,
    userId: string
  ): Promise<EducationalWorkspace[]> {
    return Array.from(this.workspaces.values()).filter(
      (ws) =>
        ws.tenantId === tenantId &&
        ws.members.some((m) => m.scholarlyUserId === userId)
    );
  }

  async findByType(
    tenantId: string,
    type: WorkspaceType
  ): Promise<EducationalWorkspace[]> {
    return Array.from(this.workspaces.values()).filter(
      (ws) => ws.tenantId === tenantId && ws.workspaceType === type
    );
  }

  async save(
    _tenantId: string,
    workspace: EducationalWorkspace
  ): Promise<EducationalWorkspace> {
    this.workspaces.set(workspace.id, workspace);
    return workspace;
  }

  async update(
    _tenantId: string,
    id: string,
    updates: Partial<EducationalWorkspace>
  ): Promise<EducationalWorkspace> {
    const existing = this.workspaces.get(id);
    if (!existing) throw new NotFoundError('EducationalWorkspace', id);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.workspaces.set(id, updated);
    return updated;
  }
}

class InMemoryPageRepository implements EducationalPageRepository {
  private pages: Map<string, EducationalPage> = new Map();

  async findById(tenantId: string, id: string): Promise<EducationalPage | null> {
    const page = this.pages.get(id);
    return page && page.tenantId === tenantId ? page : null;
  }

  async findByWorkspace(
    tenantId: string,
    workspaceId: string
  ): Promise<EducationalPage[]> {
    return Array.from(this.pages.values()).filter(
      (p) => p.tenantId === tenantId && p.workspaceId === workspaceId
    );
  }

  async findByType(
    tenantId: string,
    workspaceId: string,
    pageType: EducationalPageType
  ): Promise<EducationalPage[]> {
    return Array.from(this.pages.values()).filter(
      (p) =>
        p.tenantId === tenantId &&
        p.workspaceId === workspaceId &&
        p.pageType === pageType
    );
  }

  async findByAssignment(
    tenantId: string,
    assignmentId: string
  ): Promise<EducationalPage[]> {
    return Array.from(this.pages.values()).filter(
      (p) => p.tenantId === tenantId && p.assignmentId === assignmentId
    );
  }

  async save(_tenantId: string, page: EducationalPage): Promise<EducationalPage> {
    this.pages.set(page.id, page);
    return page;
  }

  async update(
    _tenantId: string,
    id: string,
    updates: Partial<EducationalPage>
  ): Promise<EducationalPage> {
    const existing = this.pages.get(id);
    if (!existing) throw new NotFoundError('EducationalPage', id);
    const updated = { ...existing, ...updates, modifiedAt: new Date() };
    this.pages.set(id, updated);
    return updated;
  }

  async delete(_tenantId: string, id: string): Promise<void> {
    this.pages.delete(id);
  }
}

class InMemoryTemplateRepository implements WorkspaceTemplateRepository {
  private templates: Map<string, WorkspaceTemplate> = new Map();

  async findById(
    tenantId: string,
    id: string
  ): Promise<WorkspaceTemplate | null> {
    const template = this.templates.get(id);
    return template && template.tenantId === tenantId ? template : null;
  }

  async findByCategory(
    tenantId: string,
    category: TemplateCategory
  ): Promise<WorkspaceTemplate[]> {
    return Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId && t.category === category
    );
  }

  async findPublic(tenantId: string): Promise<WorkspaceTemplate[]> {
    return Array.from(this.templates.values()).filter(
      (t) => t.tenantId === tenantId && t.isPublic
    );
  }

  async save(
    _tenantId: string,
    template: WorkspaceTemplate
  ): Promise<WorkspaceTemplate> {
    this.templates.set(template.id, template);
    return template;
  }

  async update(
    _tenantId: string,
    id: string,
    updates: Partial<WorkspaceTemplate>
  ): Promise<WorkspaceTemplate> {
    const existing = this.templates.get(id);
    if (!existing) throw new NotFoundError('WorkspaceTemplate', id);
    const updated = { ...existing, ...updates, updatedAt: new Date() };
    this.templates.set(id, updated);
    return updated;
  }
}

// ============================================================================
// MOCK AFFINE CLIENT (Demo/Development)
// ============================================================================

class MockAFFiNEClient implements AFFiNEGraphQLClient {
  private idCounter = 1000;

  private generateId(): string {
    return `affine_${this.idCounter++}`;
  }

  async createUser(
    email: string,
    _name: string,
    _password?: string
  ): Promise<{ id: string }> {
    log.debug('Mock AFFiNE: Creating user', { email });
    return { id: this.generateId() };
  }

  async getUser(_userId: string): Promise<unknown> {
    return { id: _userId, status: 'active' };
  }

  async createWorkspace(name: string): Promise<{ id: string }> {
    log.debug('Mock AFFiNE: Creating workspace', { name });
    return { id: this.generateId() };
  }

  async getWorkspace(workspaceId: string): Promise<unknown> {
    return { id: workspaceId, status: 'active' };
  }

  async deleteWorkspace(_workspaceId: string): Promise<void> {
    log.debug('Mock AFFiNE: Deleting workspace');
  }

  async inviteMember(
    _workspaceId: string,
    email: string,
    permission: string
  ): Promise<unknown> {
    log.debug('Mock AFFiNE: Inviting member', { email, permission });
    return { success: true };
  }

  async removeMember(_workspaceId: string, _userId: string): Promise<void> {
    log.debug('Mock AFFiNE: Removing member');
  }

  async updateMemberPermission(
    _workspaceId: string,
    _userId: string,
    permission: string
  ): Promise<unknown> {
    return { permission };
  }

  async listMembers(_workspaceId: string): Promise<unknown[]> {
    return [];
  }

  async createPage(
    _workspaceId: string,
    title: string,
    _mode?: 'page' | 'edgeless'
  ): Promise<{ id: string }> {
    log.debug('Mock AFFiNE: Creating page', { title });
    return { id: this.generateId() };
  }

  async getPage(_workspaceId: string, pageId: string): Promise<unknown> {
    return { id: pageId };
  }

  async updatePage(
    _workspaceId: string,
    pageId: string,
    _updates: unknown
  ): Promise<unknown> {
    return { id: pageId };
  }

  async deletePage(_workspaceId: string, _pageId: string): Promise<void> {
    log.debug('Mock AFFiNE: Deleting page');
  }

  async listPages(_workspaceId: string): Promise<unknown[]> {
    return [];
  }

  async getPageBlocks(_workspaceId: string, _pageId: string): Promise<unknown[]> {
    return [];
  }

  async addBlock(
    _workspaceId: string,
    _pageId: string,
    _block: unknown
  ): Promise<unknown> {
    return { id: this.generateId() };
  }

  async searchWorkspace(_workspaceId: string, _query: string): Promise<unknown[]> {
    return [];
  }

  async searchGlobal(_query: string): Promise<Array<{ id: string }>> {
    return [];
  }

  async addComment(
    _workspaceId: string,
    _pageId: string,
    _content: string
  ): Promise<unknown> {
    return { id: this.generateId() };
  }

  async listComments(_workspaceId: string, _pageId: string): Promise<unknown[]> {
    return [];
  }

  async getPageHistory(_workspaceId: string, _pageId: string): Promise<unknown[]> {
    return [];
  }

  async restoreVersion(
    _workspaceId: string,
    _pageId: string,
    _versionId: string
  ): Promise<void> {
    log.debug('Mock AFFiNE: Restoring version');
  }

  async ping(): Promise<boolean> {
    return true;
  }
}

// ============================================================================
// SERVICE
// ============================================================================

export class KnowledgeWorkspaceIntegrationService extends ScholarlyBaseService {
  private readonly userMappingRepo: AFFiNEUserMappingRepository;
  private readonly workspaceRepo: EducationalWorkspaceRepository;
  private readonly pageRepo: EducationalPageRepository;
  private readonly templateRepo: WorkspaceTemplateRepository;
  private readonly affineClient: AFFiNEGraphQLClient;
  private readonly instanceConfig: AFFiNEInstanceConfig;

  constructor(deps?: {
    eventBus?: EventBus;
    cache?: Cache;
    config?: ScholarlyConfig;
    userMappingRepo?: AFFiNEUserMappingRepository;
    workspaceRepo?: EducationalWorkspaceRepository;
    pageRepo?: EducationalPageRepository;
    templateRepo?: WorkspaceTemplateRepository;
    affineClient?: AFFiNEGraphQLClient;
    instanceConfig?: AFFiNEInstanceConfig;
  }) {
    super('KnowledgeWorkspaceIntegration', deps);
    this.userMappingRepo = deps?.userMappingRepo || new InMemoryUserMappingRepository();
    this.workspaceRepo = deps?.workspaceRepo || new InMemoryWorkspaceRepository();
    this.pageRepo = deps?.pageRepo || new InMemoryPageRepository();
    this.templateRepo = deps?.templateRepo || new InMemoryTemplateRepository();
    this.affineClient = deps?.affineClient || new MockAFFiNEClient();
    this.instanceConfig = deps?.instanceConfig || {
      baseUrl: process.env.AFFINE_BASE_URL || 'http://localhost:3010',
      graphqlEndpoint: '/graphql',
      serviceAccountEmail: 'service@scholarly.edu',
      serviceAccountToken: 'mock-token',
      version: '0.17.0',
      supportsAI: true,
      maxWorkspaces: 100,
      maxStoragePerUser: 1024 * 1024 * 1024, // 1GB
      status: 'connected',
      lastHealthCheck: new Date(),
    };
  }

  // ==========================================================================
  // USER PROVISIONING
  // ==========================================================================

  /**
   * Provision an AFFiNE user account for a Scholarly user.
   */
  async provisionUser(
    tenantId: string,
    scholarlyUserId: string,
    userData: {
      email: string;
      displayName: string;
      role: string;
      preferredTheme?: 'light' | 'dark' | 'system';
    }
  ): Promise<Result<AFFiNEUserMapping>> {
    return this.withTiming('provisionUser', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(scholarlyUserId)) {
        return failure(new ValidationError('Invalid scholarlyUserId'));
      }
      if (!Validator.isEmail(userData.email)) {
        return failure(new ValidationError('Invalid email'));
      }

      // Check if already provisioned
      const existing = await this.userMappingRepo.findByScholarlyUser(
        tenantId,
        scholarlyUserId
      );
      if (existing) return success(existing);

      // Create user in AFFiNE
      const affineUser = await this.affineClient.createUser(
        userData.email,
        userData.displayName
      );

      const mapping: AFFiNEUserMapping = {
        id: this.generateId('affmap'),
        tenantId,
        scholarlyUserId,
        affineUserId: affineUser.id,
        affineEmail: userData.email,
        workspaceIds: [],
        theme: userData.preferredTheme || 'system',
        defaultView: 'page',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.userMappingRepo.save(tenantId, mapping);

      // Create personal workspace automatically
      await this.createPersonalNotebook(tenantId, scholarlyUserId, userData.displayName);

      await this.publishEvent('scholarly.workspace.user_provisioned', tenantId, {
        scholarlyUserId,
        affineUserId: affineUser.id,
        role: userData.role,
      });

      return success(saved);
    });
  }

  // ==========================================================================
  // WORKSPACE LIFECYCLE
  // ==========================================================================

  /**
   * Create a personal learning notebook for a student.
   */
  async createPersonalNotebook(
    tenantId: string,
    scholarlyUserId: string,
    displayName: string
  ): Promise<Result<EducationalWorkspace>> {
    return this.withTiming('createPersonalNotebook', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(scholarlyUserId)) {
        return failure(new ValidationError('Invalid scholarlyUserId'));
      }

      const userMappingResult = await this.ensureUserProvisioned(
        tenantId,
        scholarlyUserId
      );
      if (!userMappingResult) {
        return failure(new NotFoundError('AFFiNEUserMapping', scholarlyUserId));
      }
      const userMapping = userMappingResult;

      // Check if personal workspace already exists
      const existingWorkspaces = await this.workspaceRepo.findByOwner(
        tenantId,
        scholarlyUserId
      );
      const existingPersonal = existingWorkspaces.find(
        (w) => w.workspaceType === WorkspaceType.PERSONAL_NOTEBOOK
      );
      if (existingPersonal) return success(existingPersonal);

      // Create workspace in AFFiNE
      const affineWorkspace = await this.affineClient.createWorkspace(
        `${displayName}'s Notebook`
      );

      const workspace: EducationalWorkspace = {
        id: this.generateId('ws'),
        tenantId,
        affineWorkspaceId: affineWorkspace.id,
        workspaceType: WorkspaceType.PERSONAL_NOTEBOOK,
        name: `${displayName}'s Notebook`,
        description:
          'Your personal learning space - notes, ideas, projects, and portfolio',
        purpose: WorkspacePurpose.NOTE_TAKING,
        ownerId: scholarlyUserId,
        members: [
          {
            scholarlyUserId,
            affineUserId: userMapping.affineUserId,
            role: 'owner',
            scholarlyRole: 'student',
            joinedAt: new Date(),
          },
        ],
        pageCount: 0,
        whiteboardCount: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.workspaceRepo.save(tenantId, workspace);

      // Create starter pages from template
      await this.provisionStarterPages(
        tenantId,
        saved.id,
        affineWorkspace.id,
        'personal'
      );

      // Update user mapping with new workspace
      userMapping.workspaceIds.push(saved.id);
      await this.userMappingRepo.update(tenantId, userMapping.id, {
        workspaceIds: userMapping.workspaceIds,
        updatedAt: new Date(),
      });

      return success(saved);
    });
  }

  /**
   * Create a classroom workspace.
   */
  async createClassroomWorkspace(
    tenantId: string,
    teacherId: string,
    classroomData: {
      classroomId: string;
      className: string;
      subjectId: string;
      yearLevel: string;
      termId?: string;
      studentIds: string[];
      templateId?: string;
    }
  ): Promise<Result<EducationalWorkspace>> {
    return this.withTiming('createClassroomWorkspace', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(teacherId)) {
        return failure(new ValidationError('Invalid teacherId'));
      }
      if (!Validator.isNonEmptyString(classroomData.classroomId)) {
        return failure(new ValidationError('Invalid classroomId'));
      }

      const teacherMapping = await this.ensureUserProvisioned(tenantId, teacherId);
      if (!teacherMapping) {
        return failure(new NotFoundError('AFFiNEUserMapping', teacherId));
      }

      // Create workspace in AFFiNE
      const affineWorkspace = await this.affineClient.createWorkspace(
        classroomData.className
      );

      // Build member list
      const members: WorkspaceMember[] = [
        {
          scholarlyUserId: teacherId,
          affineUserId: teacherMapping.affineUserId,
          role: 'owner',
          scholarlyRole: 'teacher',
          joinedAt: new Date(),
        },
      ];

      // Invite students
      for (const studentId of classroomData.studentIds) {
        try {
          const studentMapping = await this.ensureUserProvisioned(
            tenantId,
            studentId
          );
          if (studentMapping) {
            await this.affineClient.inviteMember(
              affineWorkspace.id,
              studentMapping.affineEmail,
              'Editor'
            );
            members.push({
              scholarlyUserId: studentId,
              affineUserId: studentMapping.affineUserId,
              role: 'editor',
              scholarlyRole: 'student',
              joinedAt: new Date(),
            });
          }
        } catch (err) {
          log.warn('Failed to invite student to workspace', {
            studentId,
            workspaceId: affineWorkspace.id,
            error: (err as Error).message,
          });
        }
      }

      const workspace: EducationalWorkspace = {
        id: this.generateId('ws'),
        tenantId,
        affineWorkspaceId: affineWorkspace.id,
        workspaceType: WorkspaceType.CLASSROOM,
        name: classroomData.className,
        description: `Classroom workspace for ${classroomData.className}`,
        purpose: WorkspacePurpose.LESSON_DELIVERY,
        ownerId: teacherId,
        members,
        classroomId: classroomData.classroomId,
        subjectId: classroomData.subjectId,
        yearLevel: classroomData.yearLevel,
        termId: classroomData.termId,
        templateId: classroomData.templateId,
        pageCount: 0,
        whiteboardCount: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.workspaceRepo.save(tenantId, workspace);

      // Provision from template if specified
      if (classroomData.templateId) {
        await this.applyTemplate(tenantId, saved.id, classroomData.templateId);
      } else {
        await this.provisionStarterPages(
          tenantId,
          saved.id,
          affineWorkspace.id,
          'classroom'
        );
      }

      await this.publishEvent('scholarly.workspace.classroom_created', tenantId, {
        workspaceId: saved.id,
        classroomId: classroomData.classroomId,
        memberCount: members.length,
      });

      return success(saved);
    });
  }

  /**
   * Create a tutor session workspace.
   */
  async createTutorSessionWorkspace(
    tenantId: string,
    tutorId: string,
    studentId: string,
    subjectName: string
  ): Promise<Result<EducationalWorkspace>> {
    return this.withTiming('createTutorSessionWorkspace', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(tutorId)) {
        return failure(new ValidationError('Invalid tutorId'));
      }
      if (!Validator.isNonEmptyString(studentId)) {
        return failure(new ValidationError('Invalid studentId'));
      }

      const tutorMapping = await this.ensureUserProvisioned(tenantId, tutorId);
      const studentMapping = await this.ensureUserProvisioned(tenantId, studentId);
      if (!tutorMapping || !studentMapping) {
        return failure(
          new NotFoundError('AFFiNEUserMapping', tutorId || studentId)
        );
      }

      const workspaceName = `Tutoring: ${subjectName}`;
      const affineWorkspace =
        await this.affineClient.createWorkspace(workspaceName);

      // Add student as editor
      await this.affineClient.inviteMember(
        affineWorkspace.id,
        studentMapping.affineEmail,
        'Editor'
      );

      const workspace: EducationalWorkspace = {
        id: this.generateId('ws'),
        tenantId,
        affineWorkspaceId: affineWorkspace.id,
        workspaceType: WorkspaceType.TUTOR_SESSION,
        name: workspaceName,
        description: `Shared workspace for ${subjectName} tutoring sessions`,
        purpose: WorkspacePurpose.COLLABORATIVE_LEARNING,
        ownerId: tutorId,
        members: [
          {
            scholarlyUserId: tutorId,
            affineUserId: tutorMapping.affineUserId,
            role: 'owner',
            scholarlyRole: 'tutor',
            joinedAt: new Date(),
          },
          {
            scholarlyUserId: studentId,
            affineUserId: studentMapping.affineUserId,
            role: 'editor',
            scholarlyRole: 'student',
            joinedAt: new Date(),
          },
        ],
        pageCount: 0,
        whiteboardCount: 0,
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.workspaceRepo.save(tenantId, workspace);
      await this.provisionStarterPages(
        tenantId,
        saved.id,
        affineWorkspace.id,
        'tutor'
      );

      return success(saved);
    });
  }

  /**
   * Get a workspace by ID.
   */
  async getWorkspace(
    tenantId: string,
    workspaceId: string
  ): Promise<Result<EducationalWorkspace>> {
    return this.withTiming('getWorkspace', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(workspaceId)) {
        return failure(new ValidationError('Invalid workspaceId'));
      }

      const workspace = await this.workspaceRepo.findById(tenantId, workspaceId);
      if (!workspace) {
        return failure(new NotFoundError('EducationalWorkspace', workspaceId));
      }

      return success(workspace);
    });
  }

  /**
   * List workspaces for a user.
   */
  async listWorkspaces(
    tenantId: string,
    userId: string,
    filters?: {
      type?: WorkspaceType;
      status?: 'active' | 'archived' | 'locked';
    }
  ): Promise<Result<EducationalWorkspace[]>> {
    return this.withTiming('listWorkspaces', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(userId)) {
        return failure(new ValidationError('Invalid userId'));
      }

      let workspaces = await this.workspaceRepo.findByMember(tenantId, userId);

      if (filters?.type) {
        workspaces = workspaces.filter((w) => w.workspaceType === filters.type);
      }
      if (filters?.status) {
        workspaces = workspaces.filter((w) => w.status === filters.status);
      }

      return success(workspaces);
    });
  }

  /**
   * Update workspace details.
   */
  async updateWorkspace(
    tenantId: string,
    workspaceId: string,
    updates: {
      name?: string;
      description?: string;
      status?: 'active' | 'archived' | 'locked';
    }
  ): Promise<Result<EducationalWorkspace>> {
    return this.withTiming('updateWorkspace', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(workspaceId)) {
        return failure(new ValidationError('Invalid workspaceId'));
      }

      const workspace = await this.workspaceRepo.findById(tenantId, workspaceId);
      if (!workspace) {
        return failure(new NotFoundError('EducationalWorkspace', workspaceId));
      }

      const updated = await this.workspaceRepo.update(tenantId, workspaceId, {
        ...updates,
        updatedAt: new Date(),
      });

      return success(updated);
    });
  }

  /**
   * Add a member to a workspace.
   */
  async addWorkspaceMember(
    tenantId: string,
    workspaceId: string,
    memberId: string,
    role: 'admin' | 'editor' | 'viewer',
    scholarlyRole: string
  ): Promise<Result<EducationalWorkspace>> {
    return this.withTiming('addWorkspaceMember', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }

      const workspace = await this.workspaceRepo.findById(tenantId, workspaceId);
      if (!workspace) {
        return failure(new NotFoundError('EducationalWorkspace', workspaceId));
      }

      const memberMapping = await this.ensureUserProvisioned(tenantId, memberId);
      if (!memberMapping) {
        return failure(new NotFoundError('AFFiNEUserMapping', memberId));
      }

      // Check if already a member
      if (workspace.members.some((m) => m.scholarlyUserId === memberId)) {
        return success(workspace); // Already a member
      }

      // Invite to AFFiNE
      await this.affineClient.inviteMember(
        workspace.affineWorkspaceId,
        memberMapping.affineEmail,
        role.charAt(0).toUpperCase() + role.slice(1)
      );

      const newMember: WorkspaceMember = {
        scholarlyUserId: memberId,
        affineUserId: memberMapping.affineUserId,
        role,
        scholarlyRole,
        joinedAt: new Date(),
      };

      const updated = await this.workspaceRepo.update(tenantId, workspaceId, {
        members: [...workspace.members, newMember],
        updatedAt: new Date(),
      });

      return success(updated);
    });
  }

  /**
   * Remove a member from a workspace.
   */
  async removeWorkspaceMember(
    tenantId: string,
    workspaceId: string,
    memberId: string
  ): Promise<Result<EducationalWorkspace>> {
    return this.withTiming('removeWorkspaceMember', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }

      const workspace = await this.workspaceRepo.findById(tenantId, workspaceId);
      if (!workspace) {
        return failure(new NotFoundError('EducationalWorkspace', workspaceId));
      }

      const member = workspace.members.find((m) => m.scholarlyUserId === memberId);
      if (!member) {
        return success(workspace); // Not a member
      }

      // Remove from AFFiNE
      await this.affineClient.removeMember(
        workspace.affineWorkspaceId,
        member.affineUserId
      );

      const updated = await this.workspaceRepo.update(tenantId, workspaceId, {
        members: workspace.members.filter((m) => m.scholarlyUserId !== memberId),
        updatedAt: new Date(),
      });

      return success(updated);
    });
  }

  // ==========================================================================
  // PAGE MANAGEMENT
  // ==========================================================================

  /**
   * Create an educational page within a workspace.
   */
  async createPage(
    tenantId: string,
    workspaceId: string,
    creatorId: string,
    pageData: {
      title: string;
      mode?: 'page' | 'edgeless';
      pageType: EducationalPageType;
      subjectId?: string;
      curriculumCodes?: string[];
      assignmentId?: string;
      tags?: string[];
    }
  ): Promise<Result<EducationalPage>> {
    return this.withTiming('createPage', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(workspaceId)) {
        return failure(new ValidationError('Invalid workspaceId'));
      }
      if (!Validator.isNonEmptyString(creatorId)) {
        return failure(new ValidationError('Invalid creatorId'));
      }

      const workspace = await this.workspaceRepo.findById(tenantId, workspaceId);
      if (!workspace) {
        return failure(new NotFoundError('EducationalWorkspace', workspaceId));
      }

      // Create page in AFFiNE
      const affinePage = await this.affineClient.createPage(
        workspace.affineWorkspaceId,
        pageData.title,
        pageData.mode || 'page'
      );

      const page: EducationalPage = {
        id: this.generateId('page'),
        tenantId,
        workspaceId,
        affinePageId: affinePage.id,
        title: pageData.title,
        mode: pageData.mode || 'page',
        pageType: pageData.pageType,
        subjectId: pageData.subjectId,
        curriculumCodes: pageData.curriculumCodes,
        assignmentId: pageData.assignmentId,
        createdById: creatorId,
        isShared: workspace.members.length > 1,
        activeEditors: 0,
        wordCount: 0,
        blockCount: 0,
        hasWhiteboardContent: pageData.mode === 'edgeless',
        hasKanbanBoard: false,
        tags: pageData.tags || [],
        createdAt: new Date(),
        modifiedAt: new Date(),
      };

      const saved = await this.pageRepo.save(tenantId, page);

      // Update workspace page counts
      await this.workspaceRepo.update(tenantId, workspaceId, {
        pageCount: workspace.pageCount + 1,
        whiteboardCount:
          pageData.mode === 'edgeless'
            ? workspace.whiteboardCount + 1
            : workspace.whiteboardCount,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      });

      await this.publishEvent('scholarly.workspace.page_created', tenantId, {
        pageId: saved.id,
        workspaceId,
        pageType: pageData.pageType,
        mode: pageData.mode,
      });

      return success(saved);
    });
  }

  /**
   * Get a page by ID.
   */
  async getPage(
    tenantId: string,
    pageId: string
  ): Promise<Result<EducationalPage>> {
    return this.withTiming('getPage', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(pageId)) {
        return failure(new ValidationError('Invalid pageId'));
      }

      const page = await this.pageRepo.findById(tenantId, pageId);
      if (!page) {
        return failure(new NotFoundError('EducationalPage', pageId));
      }

      return success(page);
    });
  }

  /**
   * List pages in a workspace.
   */
  async listPages(
    tenantId: string,
    workspaceId: string,
    filters?: {
      pageType?: EducationalPageType;
      mode?: 'page' | 'edgeless';
    }
  ): Promise<Result<EducationalPage[]>> {
    return this.withTiming('listPages', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(workspaceId)) {
        return failure(new ValidationError('Invalid workspaceId'));
      }

      let pages = await this.pageRepo.findByWorkspace(tenantId, workspaceId);

      if (filters?.pageType) {
        pages = pages.filter((p) => p.pageType === filters.pageType);
      }
      if (filters?.mode) {
        pages = pages.filter((p) => p.mode === filters.mode);
      }

      return success(pages);
    });
  }

  /**
   * Update a page.
   */
  async updatePage(
    tenantId: string,
    pageId: string,
    updates: {
      title?: string;
      tags?: string[];
      curriculumCodes?: string[];
    }
  ): Promise<Result<EducationalPage>> {
    return this.withTiming('updatePage', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(pageId)) {
        return failure(new ValidationError('Invalid pageId'));
      }

      const page = await this.pageRepo.findById(tenantId, pageId);
      if (!page) {
        return failure(new NotFoundError('EducationalPage', pageId));
      }

      const updated = await this.pageRepo.update(tenantId, pageId, {
        ...updates,
        modifiedAt: new Date(),
      });

      return success(updated);
    });
  }

  /**
   * Delete a page.
   */
  async deletePage(
    tenantId: string,
    pageId: string
  ): Promise<Result<{ deleted: boolean }>> {
    return this.withTiming('deletePage', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(pageId)) {
        return failure(new ValidationError('Invalid pageId'));
      }

      const page = await this.pageRepo.findById(tenantId, pageId);
      if (!page) {
        return failure(new NotFoundError('EducationalPage', pageId));
      }

      const workspace = await this.workspaceRepo.findById(tenantId, page.workspaceId);

      // Delete from AFFiNE
      if (workspace) {
        await this.affineClient.deletePage(workspace.affineWorkspaceId, page.affinePageId);
      }

      await this.pageRepo.delete(tenantId, pageId);

      // Update workspace counts
      if (workspace) {
        await this.workspaceRepo.update(tenantId, workspace.id, {
          pageCount: Math.max(0, workspace.pageCount - 1),
          whiteboardCount:
            page.mode === 'edgeless'
              ? Math.max(0, workspace.whiteboardCount - 1)
              : workspace.whiteboardCount,
          updatedAt: new Date(),
        });
      }

      return success({ deleted: true });
    });
  }

  /**
   * Search across all accessible workspaces for educational content.
   */
  async searchContent(
    tenantId: string,
    userId: string,
    query: {
      text?: string;
      pageType?: EducationalPageType;
      subjectId?: string;
      curriculumCodes?: string[];
      workspaceType?: WorkspaceType;
      tags?: string[];
    }
  ): Promise<Result<EducationalPage[]>> {
    return this.withTiming('searchContent', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(userId)) {
        return failure(new ValidationError('Invalid userId'));
      }

      // Find user's accessible workspaces
      const accessibleWorkspaces = await this.workspaceRepo.findByMember(
        tenantId,
        userId
      );

      const allPages: EducationalPage[] = [];

      // Search within each workspace
      for (const workspace of accessibleWorkspaces) {
        if (
          query.workspaceType &&
          workspace.workspaceType !== query.workspaceType
        ) {
          continue;
        }

        let workspacePages: EducationalPage[];

        if (
          query.pageType ||
          query.subjectId ||
          (query.curriculumCodes && query.curriculumCodes.length > 0)
        ) {
          workspacePages = await this.pageRepo.findByType(
            tenantId,
            workspace.id,
            query.pageType || EducationalPageType.FREEFORM
          );
        } else {
          workspacePages = await this.pageRepo.findByWorkspace(
            tenantId,
            workspace.id
          );
        }

        // Apply additional filters
        if (query.subjectId) {
          workspacePages = workspacePages.filter(
            (p) => p.subjectId === query.subjectId
          );
        }
        if (query.tags && query.tags.length > 0) {
          workspacePages = workspacePages.filter((p) =>
            query.tags!.some((t) => p.tags.includes(t))
          );
        }

        allPages.push(...workspacePages);
      }

      // If text search is specified, also search AFFiNE's full-text index
      if (query.text) {
        const affineResults = await this.affineClient.searchGlobal(query.text);
        // Cross-reference with our educational index
        for (const result of affineResults) {
          const existingPage = allPages.find(
            (p) => p.affinePageId === result.id
          );
          if (!existingPage) {
            log.info('Unindexed AFFiNE page found via search', {
              affinePageId: result.id,
            });
          }
        }
      }

      return success(allPages);
    });
  }

  // ==========================================================================
  // TEMPLATE ENGINE
  // ==========================================================================

  /**
   * Apply a workspace template.
   */
  async applyTemplate(
    tenantId: string,
    workspaceId: string,
    templateId: string
  ): Promise<Result<{ pagesCreated: number }>> {
    return this.withTiming('applyTemplate', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(workspaceId)) {
        return failure(new ValidationError('Invalid workspaceId'));
      }
      if (!Validator.isNonEmptyString(templateId)) {
        return failure(new ValidationError('Invalid templateId'));
      }

      const workspace = await this.workspaceRepo.findById(tenantId, workspaceId);
      if (!workspace) {
        return failure(new NotFoundError('EducationalWorkspace', workspaceId));
      }

      const template = await this.templateRepo.findById(tenantId, templateId);
      if (!template) {
        return failure(new NotFoundError('WorkspaceTemplate', templateId));
      }

      let pagesCreated = 0;

      for (const pageDef of template.pages) {
        const affinePage = await this.affineClient.createPage(
          workspace.affineWorkspaceId,
          pageDef.title,
          pageDef.mode
        );

        // Add template blocks to the page
        for (const block of pageDef.blocks) {
          await this.affineClient.addBlock(
            workspace.affineWorkspaceId,
            affinePage.id,
            this.mapTemplateBlockToAffineBlock(block)
          );
        }

        // Index the page
        await this.pageRepo.save(tenantId, {
          id: this.generateId('page'),
          tenantId,
          workspaceId,
          affinePageId: affinePage.id,
          title: pageDef.title,
          mode: pageDef.mode,
          pageType: pageDef.pageType,
          subjectId: workspace.subjectId,
          curriculumCodes: template.curriculumCodes,
          createdById: workspace.ownerId,
          isShared: workspace.members.length > 1,
          activeEditors: 0,
          wordCount: 0,
          blockCount: pageDef.blocks.length,
          hasWhiteboardContent: pageDef.mode === 'edgeless',
          hasKanbanBoard: pageDef.blocks.some((b) => b.type === 'kanban'),
          tags: [],
          createdAt: new Date(),
          modifiedAt: new Date(),
        });

        pagesCreated++;
      }

      // Update workspace counts
      await this.workspaceRepo.update(tenantId, workspaceId, {
        pageCount: (workspace.pageCount || 0) + pagesCreated,
        templateId,
        updatedAt: new Date(),
      });

      // Increment template usage
      await this.templateRepo.update(tenantId, templateId, {
        usageCount: template.usageCount + 1,
        updatedAt: new Date(),
      });

      return success({ pagesCreated });
    });
  }

  /**
   * List available templates.
   */
  async listTemplates(
    tenantId: string,
    filters?: {
      category?: TemplateCategory;
      isPublic?: boolean;
    }
  ): Promise<Result<WorkspaceTemplate[]>> {
    return this.withTiming('listTemplates', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }

      let templates: WorkspaceTemplate[];

      if (filters?.category) {
        templates = await this.templateRepo.findByCategory(
          tenantId,
          filters.category
        );
      } else if (filters?.isPublic) {
        templates = await this.templateRepo.findPublic(tenantId);
      } else {
        templates = await this.templateRepo.findPublic(tenantId);
      }

      return success(templates);
    });
  }

  // ==========================================================================
  // ACTIVITY & LEARNING ANALYTICS
  // ==========================================================================

  /**
   * Get workspace activity analytics.
   */
  async getWorkspaceActivity(
    tenantId: string,
    workspaceId: string,
    period: { start: Date; end: Date }
  ): Promise<Result<WorkspaceActivity>> {
    return this.withTiming('getWorkspaceActivity', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(workspaceId)) {
        return failure(new ValidationError('Invalid workspaceId'));
      }

      const workspace = await this.workspaceRepo.findById(tenantId, workspaceId);
      if (!workspace) {
        return failure(new NotFoundError('EducationalWorkspace', workspaceId));
      }

      const pages = await this.pageRepo.findByWorkspace(tenantId, workspaceId);

      // Calculate content metrics
      const pagesInPeriod = pages.filter(
        (p) => p.createdAt >= period.start && p.createdAt <= period.end
      );

      const documentPages = pages.filter((p) => p.mode === 'page');
      const whiteboardPages = pages.filter((p) => p.mode === 'edgeless');

      // Build contributor stats from page authorship
      const contributorMap = new Map<
        string,
        { edits: number; pagesCreated: number; timeSpentMinutes: number }
      >();

      for (const page of pagesInPeriod) {
        const existing = contributorMap.get(page.createdById) || {
          edits: 0,
          pagesCreated: 0,
          timeSpentMinutes: 0,
        };
        existing.pagesCreated++;
        existing.edits += page.blockCount;
        contributorMap.set(page.createdById, existing);
      }

      const topContributors = Array.from(contributorMap.entries())
        .map(([userId, stats]) => ({ userId, ...stats }))
        .sort((a, b) => b.edits - a.edits)
        .slice(0, 10);

      return success({
        workspaceId,
        period,
        uniqueVisitors: workspace.members.length,
        totalEdits: pages.reduce((sum, p) => sum + p.blockCount, 0),
        totalTimeSpentMinutes: 0,
        pagesCreated: pagesInPeriod.filter((p) => p.mode === 'page').length,
        whiteboardsCreated: pagesInPeriod.filter((p) => p.mode === 'edgeless')
          .length,
        blocksAdded: pagesInPeriod.reduce((sum, p) => sum + p.blockCount, 0),
        wordsWritten: pagesInPeriod.reduce((sum, p) => sum + p.wordCount, 0),
        commentsAdded: 0,
        mentionsSent: 0,
        simultaneousEditors: 0,
        modeUsage: {
          documentTime: documentPages.length * 30,
          whiteboardTime: whiteboardPages.length * 30,
        },
        topContributors,
      });
    });
  }

  /**
   * Derive a student's learning profile from their workspace behaviour.
   */
  async deriveStudentLearningProfile(
    tenantId: string,
    studentId: string
  ): Promise<Result<StudentLearningProfile>> {
    return this.withTiming('deriveStudentLearningProfile', async () => {
      if (!Validator.isNonEmptyString(tenantId)) {
        return failure(new ValidationError('Invalid tenantId'));
      }
      if (!Validator.isNonEmptyString(studentId)) {
        return failure(new ValidationError('Invalid studentId'));
      }

      const workspaces = await this.workspaceRepo.findByMember(tenantId, studentId);

      let totalDocPages = 0;
      let totalWhiteboardPages = 0;
      let totalWordCount = 0;
      let usesKanban = false;
      const usesDatabases = false;

      for (const ws of workspaces) {
        const pages = await this.pageRepo.findByWorkspace(tenantId, ws.id);
        const studentPages = pages.filter((p) => p.createdById === studentId);

        totalDocPages += studentPages.filter((p) => p.mode === 'page').length;
        totalWhiteboardPages += studentPages.filter(
          (p) => p.mode === 'edgeless'
        ).length;
        totalWordCount += studentPages.reduce((sum, p) => sum + p.wordCount, 0);

        if (studentPages.some((p) => p.hasKanbanBoard)) usesKanban = true;
      }

      const totalPages = totalDocPages + totalWhiteboardPages;
      const whiteboardRatio =
        totalPages > 0 ? totalWhiteboardPages / totalPages : 0;

      let preferredMode: 'document' | 'whiteboard' | 'mixed';
      if (whiteboardRatio > 0.6) preferredMode = 'whiteboard';
      else if (whiteboardRatio < 0.3) preferredMode = 'document';
      else preferredMode = 'mixed';

      let noteTakingStyle: 'structured' | 'freeform' | 'visual' | 'mixed';
      if (preferredMode === 'whiteboard') noteTakingStyle = 'visual';
      else if (usesKanban || usesDatabases) noteTakingStyle = 'structured';
      else noteTakingStyle = 'freeform';

      return success({
        studentId,
        workspaceId: workspaces[0]?.id || '',
        preferredMode,
        averageSessionLength: 30,
        peakProductivityHour: 15,
        noteTakingStyle,
        usesKanban,
        usesDatabases,
        engagementTrend: 'stable',
        lastUpdated: new Date(),
      });
    });
  }

  // ==========================================================================
  // HEALTH CHECK
  // ==========================================================================

  /**
   * Check the health of the AFFiNE instance connection.
   */
  async checkHealth(tenantId: string): Promise<
    Result<{
      status: 'healthy' | 'degraded' | 'offline';
      latencyMs: number;
      version?: string;
    }>
  > {
    return this.withTiming('checkHealth', async () => {
      const start = Date.now();
      try {
        const alive = await this.affineClient.ping();
        const latencyMs = Date.now() - start;

        return success({
          status: alive
            ? latencyMs < 2000
              ? 'healthy'
              : 'degraded'
            : 'offline',
          latencyMs,
          version: this.instanceConfig.version,
        });
      } catch (_err) {
        return success({
          status: 'offline' as const,
          latencyMs: Date.now() - start,
          version: undefined,
        });
      }
    });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async ensureUserProvisioned(
    tenantId: string,
    scholarlyUserId: string
  ): Promise<AFFiNEUserMapping | null> {
    return await this.userMappingRepo.findByScholarlyUser(
      tenantId,
      scholarlyUserId
    );
  }

  private async provisionStarterPages(
    tenantId: string,
    workspaceId: string,
    affineWorkspaceId: string,
    context: 'personal' | 'classroom' | 'tutor'
  ): Promise<void> {
    const starterPages = this.getStarterPages(context);

    for (const starter of starterPages) {
      try {
        const affinePage = await this.affineClient.createPage(
          affineWorkspaceId,
          starter.title,
          starter.mode
        );

        const workspace = await this.workspaceRepo.findById(tenantId, workspaceId);

        await this.pageRepo.save(tenantId, {
          id: this.generateId('page'),
          tenantId,
          workspaceId,
          affinePageId: affinePage.id,
          title: starter.title,
          mode: starter.mode,
          pageType: starter.pageType,
          createdById: workspace?.ownerId || '',
          isShared: false,
          activeEditors: 0,
          wordCount: 0,
          blockCount: 0,
          hasWhiteboardContent: starter.mode === 'edgeless',
          hasKanbanBoard: false,
          tags: [],
          createdAt: new Date(),
          modifiedAt: new Date(),
        });
      } catch (err) {
        log.warn(`Starter page creation failed: ${starter.title}`, {
          workspaceId,
        });
      }
    }
  }

  private getStarterPages(context: string): Array<{
    title: string;
    mode: 'page' | 'edgeless';
    pageType: EducationalPageType;
  }> {
    switch (context) {
      case 'personal':
        return [
          {
            title: 'Quick Notes',
            mode: 'page',
            pageType: EducationalPageType.FREEFORM,
          },
          {
            title: 'My Goals',
            mode: 'page',
            pageType: EducationalPageType.PROJECT_PLAN,
          },
          {
            title: 'Brainstorm Board',
            mode: 'edgeless',
            pageType: EducationalPageType.BRAINSTORM_BOARD,
          },
          {
            title: 'Study Notes',
            mode: 'page',
            pageType: EducationalPageType.STUDY_GUIDE,
          },
        ];
      case 'classroom':
        return [
          {
            title: 'Class Overview',
            mode: 'page',
            pageType: EducationalPageType.UNIT_OVERVIEW,
          },
          {
            title: 'Weekly Plan',
            mode: 'page',
            pageType: EducationalPageType.LESSON_PLAN,
          },
          {
            title: 'Class Whiteboard',
            mode: 'edgeless',
            pageType: EducationalPageType.BRAINSTORM_BOARD,
          },
          {
            title: 'Assessment Tracker',
            mode: 'page',
            pageType: EducationalPageType.ASSESSMENT_RUBRIC,
          },
        ];
      case 'tutor':
        return [
          {
            title: 'Session Notes',
            mode: 'page',
            pageType: EducationalPageType.CLASS_NOTES,
          },
          {
            title: 'Working Board',
            mode: 'edgeless',
            pageType: EducationalPageType.BRAINSTORM_BOARD,
          },
          {
            title: 'Homework Tracker',
            mode: 'page',
            pageType: EducationalPageType.PROJECT_PLAN,
          },
          {
            title: 'Key Concepts',
            mode: 'page',
            pageType: EducationalPageType.STUDY_GUIDE,
          },
        ];
      default:
        return [
          {
            title: 'Getting Started',
            mode: 'page',
            pageType: EducationalPageType.FREEFORM,
          },
        ];
    }
  }

  private mapTemplateBlockToAffineBlock(block: TemplateBlock): unknown {
    const blockMap: Record<string, string> = {
      heading: 'affine:paragraph',
      paragraph: 'affine:paragraph',
      todo: 'affine:list',
      table: 'affine:database',
      divider: 'affine:divider',
      callout: 'affine:paragraph',
      code: 'affine:code',
      image_placeholder: 'affine:image',
      database: 'affine:database',
      kanban: 'affine:database',
    };

    return {
      flavour: blockMap[block.type] || 'affine:paragraph',
      props: {
        text: block.content
          ? { delta: [{ insert: block.content }] }
          : undefined,
        ...block.properties,
      },
      children: (block.children || []).map((c) =>
        this.mapTemplateBlockToAffineBlock(c)
      ),
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const knowledgeWorkspaceService =
  new KnowledgeWorkspaceIntegrationService();
