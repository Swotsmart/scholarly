/**
 * Google Drive Integration Service
 *
 * The "Digital Filing Cabinet" that connects Scholarly's educational ecosystem
 * to Google's cloud storage -- with an educational intelligence layer that
 * transforms a generic file store into a curriculum-aware document hub.
 *
 * ## The Granny Explanation
 *
 * Imagine every student has a big filing cabinet at school where they keep all
 * their work -- essays, drawings, projects, report cards. Now imagine that filing
 * cabinet is magical:
 *
 * - Teachers can peek into the right drawer to see a student's latest essay
 * - Parents get a special window that shows them their child's progress reports
 * - The cabinet automatically organises itself by subject and term
 * - When a tutor needs to see what a student is working on, the right folder
 *   lights up and opens
 * - Group projects have a shared drawer that everyone in the team can access
 *
 * That's what this service does with Google Drive. It doesn't just store files --
 * it creates an intelligent bridge where Scholarly's understanding of a learner's
 * educational journey meets Google Drive's storage and collaboration capabilities.
 *
 * ## Why Google Drive?
 *
 * Google Workspace for Education is already deployed in millions of classrooms
 * worldwide. Rather than asking schools to abandon their existing infrastructure,
 * Scholarly meets them where they are -- like building a new wing onto an existing
 * school building rather than demolishing the whole thing and starting over.
 *
 * ## Architecture
 *
 * The service follows a "proxy with intelligence" pattern. Think of it as a
 * bilingual translator who doesn't just convert words but understands context:
 *
 * 1. **OAuth Gateway**: Handles the handshake with Google (like exchanging
 *    credentials at a border crossing)
 * 2. **Folder Orchestrator**: Creates and maintains the educational folder
 *    hierarchy (like a librarian who knows exactly where every book should go)
 * 3. **Sync Engine**: Keeps Scholarly's metadata in sync with Drive's reality
 *    (like a ledger that always matches the actual inventory)
 * 4. **Permission Mapper**: Translates Scholarly's role-based access into
 *    Google Drive sharing permissions (like converting between measurement
 *    systems -- different notation, same meaning)
 * 5. **Educational Context Layer**: Enriches file operations with curriculum
 *    alignment and learning context (like a teacher's annotation on a student's
 *    work, providing meaning beyond the raw content)
 *
 * @module GoogleDriveIntegrationService
 * @version 1.4.0
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  Validator,
  EventBus,
  Cache,
  ScholarlyConfig,
} from './base.service';
import { log } from '../lib/logger';

// ============================================================================
// OAUTH & AUTHENTICATION TYPES
// ============================================================================

/**
 * OAuth 2.0 credentials for Google Drive API access.
 *
 * Think of this as a visitor's pass at a secure building -- it has an expiry,
 * it was issued by a trusted authority, and it can be renewed without going
 * through the full vetting process again (that's what the refresh token does).
 */
export interface GoogleOAuthCredentials {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresAt: Date;
  scope: GoogleDriveScope[];
  issuedAt: Date;
}

/**
 * Granular permission scopes -- we request only what we need.
 *
 * This follows the principle of least privilege, like giving a maintenance
 * worker keys only to the rooms they need to clean, not a master key to
 * the entire building.
 */
export enum GoogleDriveScope {
  // Core file access -- the minimum we need
  FILE = 'https://www.googleapis.com/auth/drive.file',

  // Read-only metadata -- for browsing without modification rights
  METADATA_READONLY = 'https://www.googleapis.com/auth/drive.metadata.readonly',

  // Full Drive access -- only for admin-level operations
  FULL_ACCESS = 'https://www.googleapis.com/auth/drive',

  // Read-only access -- for student/parent view-only scenarios
  READONLY = 'https://www.googleapis.com/auth/drive.readonly',

  // App data folder -- for Scholarly's internal configuration
  APPDATA = 'https://www.googleapis.com/auth/drive.appdata',

  // Activity tracking -- for sync and audit
  ACTIVITY = 'https://www.googleapis.com/auth/drive.activity.readonly',
}

/**
 * Maps Scholarly roles to the minimum required Google Drive scopes.
 * Each persona gets exactly the access they need -- no more, no less.
 */
export const ROLE_SCOPE_MAP: Record<string, GoogleDriveScope[]> = {
  student: [GoogleDriveScope.FILE, GoogleDriveScope.METADATA_READONLY],
  teacher: [GoogleDriveScope.FILE, GoogleDriveScope.METADATA_READONLY, GoogleDriveScope.ACTIVITY],
  tutor: [GoogleDriveScope.FILE, GoogleDriveScope.METADATA_READONLY],
  parent: [GoogleDriveScope.READONLY],
  admin: [GoogleDriveScope.FULL_ACCESS, GoogleDriveScope.ACTIVITY],
  homeschool_parent: [GoogleDriveScope.FILE, GoogleDriveScope.METADATA_READONLY],
};

export interface OAuthState {
  tenantId: string;
  userId: string;
  role: string;
  redirectUri: string;
  nonce: string;
  initiatedAt: Date;
}

// ============================================================================
// CONNECTION & ACCOUNT TYPES
// ============================================================================

/**
 * Represents a user's Google Drive connection within Scholarly.
 *
 * This is the "bridge record" -- it maps a Scholarly identity to a Google
 * identity, much like a passport links a person to a country of citizenship.
 */
export interface DriveConnection {
  id: string;
  tenantId: string;
  userId: string;
  googleAccountEmail: string;
  googleAccountId: string;
  credentials: GoogleOAuthCredentials;

  // What this connection is used for
  connectionPurpose: ConnectionPurpose;

  // Folder structure we've created
  rootFolderId?: string;
  folderMapping: FolderMapping;

  // Health & sync state
  status: 'active' | 'expired' | 'revoked' | 'error';
  lastSyncAt?: Date;
  lastError?: string;
  syncCursor?: string;

  // Quota tracking
  storageUsedBytes: number;
  storageLimitBytes: number;

  createdAt: Date;
  updatedAt: Date;
}

export enum ConnectionPurpose {
  PERSONAL_STORAGE = 'personal_storage',
  CLASSROOM_SHARED = 'classroom_shared',
  PORTFOLIO = 'portfolio',
  ASSIGNMENT_SUBMISSION = 'assignment_submission',
  RESOURCE_LIBRARY = 'resource_library',
  HOMESCHOOL_RECORDS = 'homeschool_records',
  TUTOR_MATERIALS = 'tutor_materials',
  ADMIN_BACKUP = 'admin_backup',
  COMPLIANCE_DOCUMENT = 'compliance_document',
}

/**
 * Maps Scholarly's logical folder structure to actual Google Drive folder IDs.
 *
 * Think of this as the index at the back of a book -- it tells you where
 * to find each chapter without having to flip through every page.
 */
export interface FolderMapping {
  root?: string;
  subjects: Record<string, string>; // subjectId -> Drive folder ID
  terms: Record<string, string>; // termId -> Drive folder ID
  portfolios: Record<string, string>; // portfolioType -> Drive folder ID
  shared: Record<string, string>; // groupId -> Drive folder ID
  submissions: Record<string, string>; // assignmentId -> Drive folder ID
}

// ============================================================================
// FILE & FOLDER OPERATION TYPES
// ============================================================================

/**
 * A Scholarly-enriched view of a Google Drive file.
 *
 * Google Drive sees a PDF. Scholarly sees "Sarah's Term 2 Mathematics
 * assessment, aligned to ACARA Year 5 Number & Algebra, submitted 3 days
 * late, reviewed by Mr. Thompson, score pending."
 */
export interface ScholarlyDriveFile {
  id: string;
  driveFileId: string;
  tenantId: string;
  ownerId: string;

  // Google Drive metadata
  name: string;
  mimeType: string;
  sizeBytes: number;
  webViewLink: string;
  webContentLink?: string;
  iconLink: string;
  thumbnailLink?: string;

  // Scholarly educational context
  educationalContext?: EducationalFileContext;

  // Permissions
  sharingStatus: 'private' | 'specific_users' | 'classroom' | 'school_wide';
  permissions: DriveFilePermission[];

  // Version tracking
  version: number;
  lastModifiedBy?: string;

  // Timestamps
  createdAt: Date;
  modifiedAt: Date;
  viewedByMeAt?: Date;
}

/**
 * The educational "soul" of a file -- what makes a generic document
 * meaningful within a learning context.
 */
export interface EducationalFileContext {
  // What is this file for?
  fileType: EducationalFileType;

  // Curriculum alignment
  subjectId?: string;
  yearLevel?: string;
  curriculumCodes?: string[];

  // Academic context
  termId?: string;
  unitId?: string;
  lessonId?: string;
  assignmentId?: string;

  // Assessment metadata
  assessmentType?: 'formative' | 'summative' | 'diagnostic' | 'portfolio';
  submissionStatus?: 'draft' | 'submitted' | 'reviewed' | 'returned';

  // Learning context
  learnerIds?: string[];
  tutorSessionId?: string;

  // Tags for discovery
  tags: string[];
}

export enum EducationalFileType {
  LESSON_PLAN = 'lesson_plan',
  WORKSHEET = 'worksheet',
  ASSESSMENT = 'assessment',
  STUDENT_WORK = 'student_work',
  PORTFOLIO_PIECE = 'portfolio_piece',
  REPORT = 'report',
  RESOURCE = 'resource',
  PRESENTATION = 'presentation',
  RECORDING = 'recording',
  TUTOR_NOTES = 'tutor_notes',
  PARENT_COMMUNICATION = 'parent_communication',
  COMPLIANCE_DOCUMENT = 'compliance_document',
  CURRICULUM_MAP = 'curriculum_map',
  IEP_DOCUMENT = 'iep_document',
}

export interface DriveFilePermission {
  email?: string;
  role: 'owner' | 'organizer' | 'fileOrganizer' | 'writer' | 'commenter' | 'reader';
  type: 'user' | 'group' | 'domain' | 'anyone';
  scholarlyRole?: string; // Maps back to Scholarly roles
}

export interface FolderStructureTemplate {
  name: string;
  purpose: ConnectionPurpose;
  children: FolderStructureTemplate[];
  description?: string;
  color?: string; // Google Drive folder colour
}

// ============================================================================
// SYNC & WEBHOOK TYPES
// ============================================================================

/**
 * Change tracking for bidirectional sync between Scholarly and Drive.
 *
 * This works like a two-way radio -- changes on either side get transmitted
 * to the other. The sync cursor acts like a bookmark, remembering where
 * we left off so we don't re-process old changes.
 */
export interface DriveSyncEvent {
  id: string;
  tenantId: string;
  connectionId: string;

  changeType: 'created' | 'modified' | 'deleted' | 'moved' | 'permissions_changed';
  resourceType: 'file' | 'folder';
  driveResourceId: string;

  // What changed
  before?: Partial<ScholarlyDriveFile>;
  after?: Partial<ScholarlyDriveFile>;

  // Processing state
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  error?: string;
  retryCount: number;

  detectedAt: Date;
}

export interface DriveWebhookPayload {
  kind: string;
  id: string;
  resourceId: string;
  resourceUri: string;
  token: string;
  expiration: string;
  type: string;
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export interface BulkUploadRequest {
  files: Array<{
    name: string;
    mimeType: string;
    content: Buffer | ReadableStream;
    parentFolderId?: string;
    educationalContext?: EducationalFileContext;
  }>;
  targetFolder?: string;
  conflictResolution: 'skip' | 'overwrite' | 'rename';
}

export interface BulkUploadResult {
  totalFiles: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  results: Array<{
    fileName: string;
    status: 'success' | 'failed' | 'skipped';
    driveFileId?: string;
    error?: string;
  }>;
}

export interface ClassroomDistribution {
  templateFileId: string;
  recipientIds: string[];
  distributionMode: 'copy_per_student' | 'shared_view' | 'shared_edit';
  folderStrategy: 'student_folders' | 'single_folder' | 'assignment_folder';
  namingPattern: string; // e.g., "{student_name} - {assignment_title}"
}

// ============================================================================
// SEARCH & DISCOVERY
// ============================================================================

export interface DriveSearchQuery {
  query?: string;
  mimeTypes?: string[];
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  ownedByMe?: boolean;
  sharedWithMe?: boolean;
  inFolder?: string;

  // Educational filters (Scholarly-specific)
  subjectId?: string;
  yearLevel?: string;
  curriculumCodes?: string[];
  fileType?: EducationalFileType;
  assignmentId?: string;

  // Pagination
  pageSize?: number;
  pageToken?: string;
  orderBy?: 'name' | 'modifiedTime' | 'createdTime' | 'folder';
}

export interface DriveSearchResult {
  files: ScholarlyDriveFile[];
  totalCount: number;
  nextPageToken?: string;
  hasMore: boolean;
}

// ============================================================================
// ANALYTICS & QUOTA
// ============================================================================

export interface DriveUsageAnalytics {
  connectionId: string;
  period: { start: Date; end: Date };

  storage: {
    usedBytes: number;
    limitBytes: number;
    usagePercentage: number;
    byMimeType: Record<string, number>;
    bySubject: Record<string, number>;
    trend: 'growing' | 'stable' | 'shrinking';
  };

  activity: {
    filesCreated: number;
    filesModified: number;
    filesShared: number;
    totalViews: number;
    activeCollaborators: number;
  };

  educational: {
    submissionsUploaded: number;
    assignmentsDistributed: number;
    portfolioPiecesAdded: number;
    resourcesShared: number;
  };
}

// ============================================================================
// REPOSITORIES
// ============================================================================

export interface DriveConnectionRepository {
  findById(tenantId: string, id: string): Promise<DriveConnection | null>;
  findByUser(tenantId: string, userId: string): Promise<DriveConnection[]>;
  findByGoogleAccount(tenantId: string, googleAccountId: string): Promise<DriveConnection | null>;
  findActiveByTenant(tenantId: string): Promise<DriveConnection[]>;
  save(tenantId: string, connection: DriveConnection): Promise<DriveConnection>;
  update(tenantId: string, id: string, updates: Partial<DriveConnection>): Promise<DriveConnection>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface DriveFileIndexRepository {
  findByDriveId(tenantId: string, driveFileId: string): Promise<ScholarlyDriveFile | null>;
  findByFolder(tenantId: string, folderId: string): Promise<ScholarlyDriveFile[]>;
  findByEducationalContext(
    tenantId: string,
    context: Partial<EducationalFileContext>
  ): Promise<ScholarlyDriveFile[]>;
  search(tenantId: string, query: DriveSearchQuery): Promise<DriveSearchResult>;
  save(tenantId: string, file: ScholarlyDriveFile): Promise<ScholarlyDriveFile>;
  update(tenantId: string, id: string, updates: Partial<ScholarlyDriveFile>): Promise<ScholarlyDriveFile>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface DriveSyncRepository {
  findPending(tenantId: string, limit: number): Promise<DriveSyncEvent[]>;
  save(tenantId: string, event: DriveSyncEvent): Promise<DriveSyncEvent>;
  update(tenantId: string, id: string, updates: Partial<DriveSyncEvent>): Promise<DriveSyncEvent>;
  findByConnection(tenantId: string, connectionId: string, since?: Date): Promise<DriveSyncEvent[]>;
}

// ============================================================================
// GOOGLE DRIVE API CLIENT (Abstracted for testability)
// ============================================================================

/**
 * Abstraction over the Google Drive REST API v3.
 *
 * This interface decouples our service from the actual HTTP client,
 * making it testable with mock implementations -- like having a
 * dress rehearsal with stand-ins before the actual performance.
 */
export interface GoogleDriveApiClient {
  // Authentication
  getAuthUrl(state: OAuthState, scopes: GoogleDriveScope[]): string;
  exchangeCode(code: string, redirectUri: string): Promise<GoogleOAuthCredentials>;
  refreshToken(refreshToken: string): Promise<GoogleOAuthCredentials>;
  revokeToken(accessToken: string): Promise<void>;

  // Files
  getFile(accessToken: string, fileId: string, fields?: string[]): Promise<any>;
  listFiles(
    accessToken: string,
    query: string,
    pageSize: number,
    pageToken?: string,
    fields?: string[]
  ): Promise<any>;
  createFile(accessToken: string, metadata: any, media?: Buffer, mimeType?: string): Promise<any>;
  updateFile(accessToken: string, fileId: string, metadata?: any, media?: Buffer): Promise<any>;
  deleteFile(accessToken: string, fileId: string): Promise<void>;
  copyFile(accessToken: string, fileId: string, metadata: any): Promise<any>;

  // Folders
  createFolder(accessToken: string, name: string, parentId?: string, color?: string): Promise<any>;

  // Permissions
  createPermission(accessToken: string, fileId: string, permission: any): Promise<any>;
  deletePermission(accessToken: string, fileId: string, permissionId: string): Promise<void>;
  listPermissions(accessToken: string, fileId: string): Promise<any>;

  // Changes (for sync)
  getStartPageToken(accessToken: string): Promise<string>;
  listChanges(accessToken: string, pageToken: string): Promise<any>;

  // Webhooks
  watchChanges(
    accessToken: string,
    channelId: string,
    webhookUrl: string,
    pageToken: string
  ): Promise<any>;
  stopWatch(accessToken: string, channelId: string, resourceId: string): Promise<void>;

  // Quota
  getAbout(accessToken: string): Promise<any>;
}

// ============================================================================
// EDUCATIONAL FOLDER TEMPLATES
// ============================================================================

/**
 * Pre-defined folder structures for different educational contexts.
 *
 * These templates are like architectural blueprints -- they ensure every
 * student's Drive has a consistent, navigable structure that educators
 * and parents can rely on, regardless of which school or year level.
 */
const STUDENT_FOLDER_TEMPLATE: FolderStructureTemplate = {
  name: 'Scholarly',
  purpose: ConnectionPurpose.PERSONAL_STORAGE,
  children: [
    {
      name: 'My Work',
      purpose: ConnectionPurpose.PERSONAL_STORAGE,
      description: 'All your schoolwork, organised by subject',
      children: [], // Dynamically populated per enrolled subjects
    },
    {
      name: 'Assignments',
      purpose: ConnectionPurpose.ASSIGNMENT_SUBMISSION,
      description: 'Submitted and returned assignments',
      children: [
        { name: 'Submitted', purpose: ConnectionPurpose.ASSIGNMENT_SUBMISSION, children: [] },
        { name: 'Returned', purpose: ConnectionPurpose.ASSIGNMENT_SUBMISSION, children: [] },
        { name: 'Drafts', purpose: ConnectionPurpose.ASSIGNMENT_SUBMISSION, children: [] },
      ],
    },
    {
      name: 'Portfolio',
      purpose: ConnectionPurpose.PORTFOLIO,
      description: 'Your best work -- showcase pieces',
      children: [],
    },
    {
      name: 'Tutor Sessions',
      purpose: ConnectionPurpose.PERSONAL_STORAGE,
      description: 'Materials from tutoring sessions',
      children: [],
    },
    {
      name: 'Resources',
      purpose: ConnectionPurpose.RESOURCE_LIBRARY,
      description: 'Downloaded learning resources',
      children: [],
    },
  ],
};

const TEACHER_FOLDER_TEMPLATE: FolderStructureTemplate = {
  name: 'Scholarly - Teaching',
  purpose: ConnectionPurpose.CLASSROOM_SHARED,
  children: [
    { name: 'Lesson Plans', purpose: ConnectionPurpose.RESOURCE_LIBRARY, children: [] },
    { name: 'Assessments', purpose: ConnectionPurpose.RESOURCE_LIBRARY, children: [] },
    { name: 'Student Submissions', purpose: ConnectionPurpose.ASSIGNMENT_SUBMISSION, children: [] },
    { name: 'Reports', purpose: ConnectionPurpose.PERSONAL_STORAGE, children: [] },
    { name: 'Shared with Students', purpose: ConnectionPurpose.CLASSROOM_SHARED, children: [] },
    { name: 'Shared with Parents', purpose: ConnectionPurpose.PERSONAL_STORAGE, children: [] },
  ],
};

const HOMESCHOOL_FOLDER_TEMPLATE: FolderStructureTemplate = {
  name: 'Scholarly - Homeschool',
  purpose: ConnectionPurpose.HOMESCHOOL_RECORDS,
  children: [
    { name: 'Curriculum Plans', purpose: ConnectionPurpose.RESOURCE_LIBRARY, children: [] },
    { name: 'Student Work', purpose: ConnectionPurpose.PERSONAL_STORAGE, children: [] },
    { name: 'Compliance Records', purpose: ConnectionPurpose.COMPLIANCE_DOCUMENT, children: [] },
    { name: 'Co-op Resources', purpose: ConnectionPurpose.CLASSROOM_SHARED, children: [] },
    { name: 'Assessment Evidence', purpose: ConnectionPurpose.PORTFOLIO, children: [] },
  ],
};

// ============================================================================
// SERVICE LOGGER
// ============================================================================

const serviceLogger = {
  info: (message: string, data?: Record<string, unknown>) => log.info(message, data),
  warn: (message: string, data?: Record<string, unknown>) => log.warn(message, data),
  error: (message: string, err?: Error, data?: Record<string, unknown>) => log.error(message, err, data),
  debug: (message: string, data?: Record<string, unknown>) => log.debug(message, data),
};

// ============================================================================
// SERVICE
// ============================================================================

export class GoogleDriveIntegrationService extends ScholarlyBaseService {
  private connectionRepo: DriveConnectionRepository | null = null;
  private fileIndexRepo: DriveFileIndexRepository | null = null;
  private syncRepo: DriveSyncRepository | null = null;
  private driveClient: GoogleDriveApiClient | null = null;
  private serviceCache: Cache | null = null;

  constructor(deps?: {
    eventBus?: EventBus;
    cache?: Cache;
    config?: ScholarlyConfig;
    connectionRepo?: DriveConnectionRepository;
    fileIndexRepo?: DriveFileIndexRepository;
    syncRepo?: DriveSyncRepository;
    driveClient?: GoogleDriveApiClient;
  }) {
    super('GoogleDriveIntegration', deps);
    this.connectionRepo = deps?.connectionRepo || null;
    this.fileIndexRepo = deps?.fileIndexRepo || null;
    this.syncRepo = deps?.syncRepo || null;
    this.driveClient = deps?.driveClient || null;
    this.serviceCache = deps?.cache || null;
  }

  /**
   * Initialize repositories for the service (called at startup)
   */
  initializeRepositories(repos: {
    connectionRepo: DriveConnectionRepository;
    fileIndexRepo: DriveFileIndexRepository;
    syncRepo: DriveSyncRepository;
    driveClient: GoogleDriveApiClient;
    cache?: Cache;
  }): void {
    this.connectionRepo = repos.connectionRepo;
    this.fileIndexRepo = repos.fileIndexRepo;
    this.syncRepo = repos.syncRepo;
    this.driveClient = repos.driveClient;
    if (repos.cache) this.serviceCache = repos.cache;
  }

  // ==========================================================================
  // OAUTH 2.0 FLOW -- THE HANDSHAKE
  // ==========================================================================

  /**
   * Initiate the OAuth 2.0 authorization flow.
   *
   * This is the "knock on the door" moment -- we're asking Google to
   * let the user grant us specific permissions. The state parameter
   * acts like a claim ticket at a coat check: we'll need it back to
   * verify the response is genuinely from the user we sent.
   */
  async initiateOAuthFlow(
    tenantId: string,
    userId: string,
    role: string,
    redirectUri: string
  ): Promise<Result<{ authorizationUrl: string; state: string }>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(userId)) {
      return failure(new ValidationError('userId is required'));
    }
    if (!Validator.isNonEmptyString(role)) {
      return failure(new ValidationError('role is required'));
    }
    if (!Validator.isNonEmptyString(redirectUri)) {
      return failure(new ValidationError('redirectUri is required'));
    }

    return this.withTiming('initiateOAuthFlow', async () => {
      if (!this.driveClient) {
        return failure(new Error('Drive client not initialized'));
      }

      // Determine scopes based on user's role
      const scopes = ROLE_SCOPE_MAP[role] || ROLE_SCOPE_MAP['student'];

      // Generate cryptographic nonce for CSRF protection
      const nonce = this.generateId('nonce');

      const state: OAuthState = {
        tenantId,
        userId,
        role,
        redirectUri,
        nonce,
        initiatedAt: new Date(),
      };

      // Store state in cache for verification on callback (expires in 10 minutes)
      if (this.serviceCache) {
        await this.serviceCache.set(`oauth_state:${tenantId}:${nonce}`, state, 600);
      }

      const authorizationUrl = this.driveClient.getAuthUrl(state, scopes);

      serviceLogger.info('OAuth flow initiated', { userId, role, scopeCount: scopes.length });

      return success({ authorizationUrl, state: nonce });
    });
  }

  /**
   * Handle the OAuth callback -- exchange the authorization code for tokens.
   *
   * This is the "coat check return" -- the user comes back with their
   * claim ticket (state) and Google's approval stamp (code). We verify
   * both before establishing the connection.
   */
  async handleOAuthCallback(
    tenantId: string,
    code: string,
    stateNonce: string,
    redirectUri: string
  ): Promise<Result<DriveConnection>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(code)) {
      return failure(new ValidationError('code is required'));
    }
    if (!Validator.isNonEmptyString(stateNonce)) {
      return failure(new ValidationError('stateNonce is required'));
    }

    return this.withTiming('handleOAuthCallback', async () => {
      if (!this.driveClient || !this.connectionRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      // Verify state to prevent CSRF attacks
      let cachedState: OAuthState | null = null;
      if (this.serviceCache) {
        cachedState = await this.serviceCache.get<OAuthState>(`oauth_state:${tenantId}:${stateNonce}`);
      }

      if (!cachedState) {
        return failure(new AuthorizationError('Invalid or expired OAuth state. Please try connecting again.'));
      }

      // Check state hasn't expired (10-minute window)
      const stateAge = Date.now() - new Date(cachedState.initiatedAt).getTime();
      if (stateAge > 600_000) {
        return failure(new AuthorizationError('OAuth flow expired. Please try connecting again.'));
      }

      // Exchange authorization code for tokens
      const credentials = await this.driveClient.exchangeCode(code, redirectUri);

      // Get Google account info
      const aboutInfo = await this.driveClient.getAbout(credentials.accessToken);

      // Check for existing connection to prevent duplicates
      const existingConnection = await this.connectionRepo.findByGoogleAccount(
        tenantId,
        aboutInfo.user.permissionId
      );

      if (existingConnection && existingConnection.userId !== cachedState.userId) {
        return failure(
          new AuthorizationError('This Google account is already connected to another Scholarly user.')
        );
      }

      // Determine the folder template based on the user's role
      const template = this.getFolderTemplate(cachedState.role);

      // Create the connection record
      const connection: DriveConnection = {
        id: existingConnection?.id || this.generateId('gdrive'),
        tenantId,
        userId: cachedState.userId,
        googleAccountEmail: aboutInfo.user.emailAddress,
        googleAccountId: aboutInfo.user.permissionId,
        credentials,
        connectionPurpose: template.purpose,
        folderMapping: existingConnection?.folderMapping || {
          subjects: {},
          terms: {},
          portfolios: {},
          shared: {},
          submissions: {},
        },
        status: 'active',
        lastSyncAt: new Date(),
        storageUsedBytes: aboutInfo.storageQuota?.usage || 0,
        storageLimitBytes: aboutInfo.storageQuota?.limit || 0,
        createdAt: existingConnection?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.connectionRepo.save(tenantId, connection);

      // Provision the folder structure in the background
      this.provisionFolderStructure(tenantId, saved.id, template).catch((err) => {
        serviceLogger.error('Background folder provisioning failed', err as Error, { connectionId: saved.id });
      });

      // Clean up OAuth state from cache
      if (this.serviceCache) {
        await this.serviceCache.delete(`oauth_state:${tenantId}:${stateNonce}`);
      }

      await this.publishEvent('scholarly.gdrive.connected', tenantId, {
        connectionId: saved.id,
        userId: cachedState.userId,
        role: cachedState.role,
        googleEmail: aboutInfo.user.emailAddress,
      });

      return success(saved);
    });
  }

  /**
   * Refresh an expired access token using the stored refresh token.
   *
   * Like renewing a library card -- you don't need to re-register,
   * just present your existing membership for a fresh pass.
   */
  async refreshAccessToken(tenantId: string, connectionId: string): Promise<Result<GoogleOAuthCredentials>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(connectionId)) {
      return failure(new ValidationError('connectionId is required'));
    }

    return this.withTiming('refreshAccessToken', async () => {
      if (!this.driveClient || !this.connectionRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connection = await this.connectionRepo.findById(tenantId, connectionId);
      if (!connection) {
        return failure(new NotFoundError('DriveConnection', connectionId));
      }

      const newCredentials = await this.driveClient.refreshToken(connection.credentials.refreshToken);

      await this.connectionRepo.update(tenantId, connectionId, {
        credentials: newCredentials,
        status: 'active',
        updatedAt: new Date(),
      });

      return success(newCredentials);
    });
  }

  /**
   * Disconnect a Google Drive account -- revoke tokens and clean up.
   */
  async disconnect(tenantId: string, connectionId: string): Promise<Result<void>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(connectionId)) {
      return failure(new ValidationError('connectionId is required'));
    }

    return this.withTiming('disconnect', async () => {
      if (!this.driveClient || !this.connectionRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connection = await this.connectionRepo.findById(tenantId, connectionId);
      if (!connection) {
        return failure(new NotFoundError('DriveConnection', connectionId));
      }

      // Revoke the OAuth token with Google
      try {
        await this.driveClient.revokeToken(connection.credentials.accessToken);
      } catch (err) {
        serviceLogger.warn('Token revocation failed (may already be revoked)', { connectionId });
      }

      // Update status rather than hard-deleting (for audit trail)
      await this.connectionRepo.update(tenantId, connectionId, {
        status: 'revoked',
        updatedAt: new Date(),
      });

      // Clear any cached data
      if (this.serviceCache) {
        await this.serviceCache.invalidatePattern(`gdrive:${connectionId}:*`);
      }

      await this.publishEvent('scholarly.gdrive.disconnected', tenantId, {
        connectionId,
        userId: connection.userId,
        googleEmail: connection.googleAccountEmail,
      });

      return success(undefined);
    });
  }

  // ==========================================================================
  // FOLDER MANAGEMENT -- THE ORGANISATIONAL BACKBONE
  // ==========================================================================

  /**
   * Provision the educational folder structure in the user's Google Drive.
   *
   * This is like a librarian setting up a new section in the library --
   * creating the right shelves, labelling them clearly, and making sure
   * there's a logical flow from one area to the next.
   */
  async provisionFolderStructure(
    tenantId: string,
    connectionId: string,
    template: FolderStructureTemplate
  ): Promise<Result<FolderMapping>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(connectionId)) {
      return failure(new ValidationError('connectionId is required'));
    }

    return this.withTiming('provisionFolderStructure', async () => {
      if (!this.driveClient || !this.connectionRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connection = await this.getActiveConnection(tenantId, connectionId);
      if (!connection.success) return connection as Result<FolderMapping>;

      const accessToken = await this.ensureValidToken(tenantId, connection.data);
      if (!accessToken.success) return accessToken as Result<FolderMapping>;

      const mapping: FolderMapping = {
        subjects: {},
        terms: {},
        portfolios: {},
        shared: {},
        submissions: {},
      };

      // Create root folder
      const rootFolder = await this.driveClient.createFolder(accessToken.data, template.name, undefined, '#4285f4');
      mapping.root = rootFolder.id;

      // Recursively create child folders
      for (const child of template.children) {
        await this.createFolderRecursive(accessToken.data, child, rootFolder.id, mapping);
      }

      // Update connection with the folder mapping
      await this.connectionRepo.update(tenantId, connectionId, {
        rootFolderId: rootFolder.id,
        folderMapping: mapping,
        updatedAt: new Date(),
      });

      await this.publishEvent('scholarly.gdrive.folders_provisioned', tenantId, {
        connectionId,
        rootFolderId: rootFolder.id,
        folderCount: Object.values(mapping).reduce(
          (sum, m) => sum + (typeof m === 'object' ? Object.keys(m).length : 0),
          1
        ),
      });

      return success(mapping);
    });
  }

  /**
   * Create or get a subject-specific folder.
   *
   * Ensures each subject has its own organised space -- like having
   * separate notebooks for Maths, English, and Science.
   */
  async ensureSubjectFolder(
    tenantId: string,
    connectionId: string,
    subjectId: string,
    subjectName: string
  ): Promise<Result<string>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(connectionId)) {
      return failure(new ValidationError('connectionId is required'));
    }
    if (!Validator.isNonEmptyString(subjectId)) {
      return failure(new ValidationError('subjectId is required'));
    }

    return this.withTiming('ensureSubjectFolder', async () => {
      if (!this.driveClient || !this.connectionRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connectionResult = await this.getActiveConnection(tenantId, connectionId);
      if (!connectionResult.success) return connectionResult as Result<string>;

      const connection = connectionResult.data;

      // Check if folder already exists in mapping
      if (connection.folderMapping.subjects[subjectId]) {
        return success(connection.folderMapping.subjects[subjectId]);
      }

      const accessTokenResult = await this.ensureValidToken(tenantId, connection);
      if (!accessTokenResult.success) return accessTokenResult as Result<string>;

      // Find the "My Work" parent folder (or root if not found)
      const parentId = connection.rootFolderId;

      const folder = await this.driveClient.createFolder(accessTokenResult.data, subjectName, parentId);

      // Update mapping
      connection.folderMapping.subjects[subjectId] = folder.id;
      await this.connectionRepo.update(tenantId, connectionId, {
        folderMapping: connection.folderMapping,
        updatedAt: new Date(),
      });

      return success(folder.id);
    });
  }

  // ==========================================================================
  // FILE OPERATIONS -- CURRICULUM-AWARE CRUD
  // ==========================================================================

  /**
   * Upload a file with educational context metadata.
   *
   * This doesn't just dump a file into Drive -- it enriches it with
   * curriculum alignment, places it in the right folder, and indexes
   * it for educational discovery. Like a librarian who catalogues a
   * new book with its Dewey Decimal number, not just tosses it on
   * the nearest shelf.
   */
  async uploadFile(
    tenantId: string,
    connectionId: string,
    file: {
      name: string;
      mimeType: string;
      content: Buffer;
      parentFolderId?: string;
      educationalContext?: EducationalFileContext;
    }
  ): Promise<Result<ScholarlyDriveFile>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(connectionId)) {
      return failure(new ValidationError('connectionId is required'));
    }
    if (!Validator.isNonEmptyString(file.name)) {
      return failure(new ValidationError('fileName is required'));
    }

    return this.withTiming('uploadFile', async () => {
      if (!this.driveClient || !this.connectionRepo || !this.fileIndexRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connectionResult = await this.getActiveConnection(tenantId, connectionId);
      if (!connectionResult.success) return connectionResult as Result<ScholarlyDriveFile>;

      const connection = connectionResult.data;
      const accessTokenResult = await this.ensureValidToken(tenantId, connection);
      if (!accessTokenResult.success) return accessTokenResult as Result<ScholarlyDriveFile>;

      // Determine target folder based on educational context
      const targetFolder =
        file.parentFolderId || this.resolveTargetFolder(connection.folderMapping, file.educationalContext);

      // Prepare Drive metadata
      const metadata: any = {
        name: file.name,
        parents: targetFolder ? [targetFolder] : undefined,
        // Store educational context as Drive app properties
        appProperties: file.educationalContext
          ? this.serializeEducationalContext(file.educationalContext)
          : undefined,
      };

      // Upload to Google Drive
      const driveFile = await this.driveClient.createFile(
        accessTokenResult.data,
        metadata,
        file.content,
        file.mimeType
      );

      // Create Scholarly index record
      const scholarlyFile: ScholarlyDriveFile = {
        id: this.generateId('gdf'),
        driveFileId: driveFile.id,
        tenantId,
        ownerId: connection.userId,
        name: file.name,
        mimeType: file.mimeType,
        sizeBytes: file.content.length,
        webViewLink: driveFile.webViewLink || '',
        webContentLink: driveFile.webContentLink,
        iconLink: driveFile.iconLink || '',
        thumbnailLink: driveFile.thumbnailLink,
        educationalContext: file.educationalContext,
        sharingStatus: 'private',
        permissions: [],
        version: 1,
        createdAt: new Date(),
        modifiedAt: new Date(),
      };

      await this.fileIndexRepo.save(tenantId, scholarlyFile);

      await this.publishEvent('scholarly.gdrive.file_uploaded', tenantId, {
        fileId: scholarlyFile.id,
        driveFileId: driveFile.id,
        fileName: file.name,
        educationalContext: file.educationalContext,
      });

      return success(scholarlyFile);
    });
  }

  /**
   * Search files with both Google Drive's full-text search AND
   * Scholarly's educational metadata filtering.
   */
  async searchFiles(tenantId: string, connectionId: string, query: DriveSearchQuery): Promise<Result<DriveSearchResult>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(connectionId)) {
      return failure(new ValidationError('connectionId is required'));
    }

    return this.withTiming('searchFiles', async () => {
      if (!this.driveClient || !this.connectionRepo || !this.fileIndexRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connectionResult = await this.getActiveConnection(tenantId, connectionId);
      if (!connectionResult.success) return connectionResult as Result<DriveSearchResult>;

      const connection = connectionResult.data;

      // If educational filters are present, search our index first
      if (query.subjectId || query.curriculumCodes || query.fileType || query.assignmentId) {
        const result = await this.fileIndexRepo.search(tenantId, query);
        return success(result);
      }

      // Otherwise, search Drive directly for broader results
      const accessTokenResult = await this.ensureValidToken(tenantId, connection);
      if (!accessTokenResult.success) return accessTokenResult as Result<DriveSearchResult>;

      const driveQuery = this.buildDriveSearchQuery(query);

      const driveResults = await this.driveClient.listFiles(
        accessTokenResult.data,
        driveQuery,
        query.pageSize || 20,
        query.pageToken,
        ['id', 'name', 'mimeType', 'size', 'webViewLink', 'thumbnailLink', 'modifiedTime', 'appProperties']
      );

      // Enrich Drive results with Scholarly metadata
      const enrichedFiles = await Promise.all(
        (driveResults.files || []).map(async (df: any) => {
          const indexed = await this.fileIndexRepo!.findByDriveId(tenantId, df.id);
          return indexed || this.mapDriveFileToScholarly(df, tenantId, connection.userId);
        })
      );

      return success({
        files: enrichedFiles,
        totalCount: driveResults.files?.length || 0,
        nextPageToken: driveResults.nextPageToken,
        hasMore: !!driveResults.nextPageToken,
      });
    });
  }

  /**
   * Distribute a file to an entire classroom -- like handing out worksheets,
   * but each student gets their own copy they can write on.
   */
  async distributeToClassroom(
    tenantId: string,
    connectionId: string,
    distribution: ClassroomDistribution
  ): Promise<Result<BulkUploadResult>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(connectionId)) {
      return failure(new ValidationError('connectionId is required'));
    }
    if (!Validator.isNonEmptyString(distribution.templateFileId)) {
      return failure(new ValidationError('templateFileId is required'));
    }

    return this.withTiming('distributeToClassroom', async () => {
      if (!this.driveClient || !this.connectionRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connectionResult = await this.getActiveConnection(tenantId, connectionId);
      if (!connectionResult.success) return connectionResult as Result<BulkUploadResult>;

      const connection = connectionResult.data;
      const accessTokenResult = await this.ensureValidToken(tenantId, connection);
      if (!accessTokenResult.success) return accessTokenResult as Result<BulkUploadResult>;

      const accessToken = accessTokenResult.data;

      const results: BulkUploadResult = {
        totalFiles: distribution.recipientIds.length,
        successCount: 0,
        failedCount: 0,
        skippedCount: 0,
        results: [],
      };

      for (const recipientId of distribution.recipientIds) {
        try {
          if (distribution.distributionMode === 'copy_per_student') {
            // Create individual copies
            const fileName = distribution.namingPattern.replace('{student_id}', recipientId);

            const copy = await this.driveClient.copyFile(accessToken, distribution.templateFileId, {
              name: fileName,
            });

            results.results.push({
              fileName,
              status: 'success',
              driveFileId: copy.id,
            });
            results.successCount++;
          } else {
            // Share the original with appropriate permissions
            const role = distribution.distributionMode === 'shared_edit' ? 'writer' : 'reader';
            await this.driveClient.createPermission(accessToken, distribution.templateFileId, {
              type: 'user',
              role,
              emailAddress: recipientId,
            });

            results.results.push({
              fileName: distribution.templateFileId,
              status: 'success',
              driveFileId: distribution.templateFileId,
            });
            results.successCount++;
          }
        } catch (err) {
          results.results.push({
            fileName: recipientId,
            status: 'failed',
            error: (err as Error).message,
          });
          results.failedCount++;
        }
      }

      await this.publishEvent('scholarly.gdrive.classroom_distributed', tenantId, {
        connectionId,
        templateFileId: distribution.templateFileId,
        mode: distribution.distributionMode,
        successCount: results.successCount,
        failedCount: results.failedCount,
      });

      return success(results);
    });
  }

  // ==========================================================================
  // SYNC ENGINE -- BIDIRECTIONAL CHANGE TRACKING
  // ==========================================================================

  /**
   * Process incoming Drive changes and sync them to Scholarly's index.
   *
   * This is the "mail room" -- it receives notifications about changes
   * in the user's Drive and routes them to the appropriate handlers,
   * like sorting incoming letters to the right departments.
   */
  async processDriveChanges(
    tenantId: string,
    connectionId: string
  ): Promise<Result<{ processed: number; errors: number }>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(connectionId)) {
      return failure(new ValidationError('connectionId is required'));
    }

    return this.withTiming('processDriveChanges', async () => {
      if (!this.driveClient || !this.connectionRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connectionResult = await this.getActiveConnection(tenantId, connectionId);
      if (!connectionResult.success) return connectionResult as Result<{ processed: number; errors: number }>;

      const connection = connectionResult.data;
      const accessTokenResult = await this.ensureValidToken(tenantId, connection);
      if (!accessTokenResult.success) return accessTokenResult as Result<{ processed: number; errors: number }>;

      const accessToken = accessTokenResult.data;

      // Get changes since last sync
      let pageToken = connection.syncCursor || (await this.driveClient.getStartPageToken(accessToken));

      let processed = 0;
      let errors = 0;

      let hasMore = true;
      while (hasMore) {
        const changes = await this.driveClient.listChanges(accessToken, pageToken);

        for (const change of changes.changes || []) {
          try {
            await this.processChange(tenantId, connectionId, change);
            processed++;
          } catch (err) {
            serviceLogger.error('Failed to process Drive change', err as Error, {
              connectionId,
              changeId: change.fileId,
            });
            errors++;
          }
        }

        pageToken = changes.newStartPageToken || changes.nextPageToken;
        hasMore = !changes.newStartPageToken;
      }

      // Update sync cursor
      await this.connectionRepo.update(tenantId, connectionId, {
        syncCursor: pageToken,
        lastSyncAt: new Date(),
        updatedAt: new Date(),
      });

      return success({ processed, errors });
    });
  }

  /**
   * Handle incoming webhook from Google Drive's push notifications.
   */
  async handleWebhook(tenantId: string, payload: DriveWebhookPayload): Promise<Result<void>> {
    return this.withTiming('handleWebhook', async () => {
      if (!this.serviceCache || !this.syncRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      // Verify the webhook token
      const cachedToken = await this.serviceCache.get<string>(`webhook_token:${tenantId}:${payload.id}`);

      if (!cachedToken || cachedToken !== payload.token) {
        return failure(new AuthorizationError('Invalid webhook token'));
      }

      // Queue the sync for processing
      const syncEvent: DriveSyncEvent = {
        id: this.generateId('dsync'),
        tenantId,
        connectionId: payload.id,
        changeType: 'modified',
        resourceType: 'file',
        driveResourceId: payload.resourceId,
        status: 'pending',
        retryCount: 0,
        detectedAt: new Date(),
      };

      await this.syncRepo.save(tenantId, syncEvent);

      serviceLogger.info('Drive webhook queued for processing', {
        channelId: payload.id,
        resourceId: payload.resourceId,
      });

      return success(undefined);
    });
  }

  // ==========================================================================
  // ANALYTICS & MONITORING
  // ==========================================================================

  /**
   * Generate usage analytics for a Drive connection.
   *
   * Provides insight not just into storage consumption, but into how
   * the educational content is being used -- like a report card for
   * the filing cabinet itself.
   */
  async getUsageAnalytics(
    tenantId: string,
    connectionId: string,
    period: { start: Date; end: Date }
  ): Promise<Result<DriveUsageAnalytics>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(connectionId)) {
      return failure(new ValidationError('connectionId is required'));
    }

    return this.withTiming('getUsageAnalytics', async () => {
      if (!this.driveClient || !this.connectionRepo || !this.fileIndexRepo || !this.syncRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connectionResult = await this.getActiveConnection(tenantId, connectionId);
      if (!connectionResult.success) return connectionResult as Result<DriveUsageAnalytics>;

      const connection = connectionResult.data;
      const accessTokenResult = await this.ensureValidToken(tenantId, connection);
      if (!accessTokenResult.success) return accessTokenResult as Result<DriveUsageAnalytics>;

      // Get current quota info from Google
      const about = await this.driveClient.getAbout(accessTokenResult.data);

      // Get sync events for the period
      const syncEvents = await this.syncRepo.findByConnection(tenantId, connectionId, period.start);

      // Get indexed files for subject breakdown
      const allFiles = await this.fileIndexRepo.findByFolder(tenantId, connection.rootFolderId || '');

      // Calculate metrics
      const byMimeType: Record<string, number> = {};
      const bySubject: Record<string, number> = {};
      let submissionsUploaded = 0;
      let portfolioPiecesAdded = 0;

      for (const file of allFiles) {
        byMimeType[file.mimeType] = (byMimeType[file.mimeType] || 0) + file.sizeBytes;
        if (file.educationalContext?.subjectId) {
          bySubject[file.educationalContext.subjectId] =
            (bySubject[file.educationalContext.subjectId] || 0) + file.sizeBytes;
        }
        if (file.educationalContext?.submissionStatus) submissionsUploaded++;
        if (file.educationalContext?.fileType === EducationalFileType.PORTFOLIO_PIECE) portfolioPiecesAdded++;
      }

      const filesCreated = syncEvents.filter((e) => e.changeType === 'created').length;
      const filesModified = syncEvents.filter((e) => e.changeType === 'modified').length;

      return success({
        connectionId,
        period,
        storage: {
          usedBytes: about.storageQuota?.usage || 0,
          limitBytes: about.storageQuota?.limit || 0,
          usagePercentage: about.storageQuota?.limit
            ? (about.storageQuota.usage / about.storageQuota.limit) * 100
            : 0,
          byMimeType,
          bySubject,
          trend: 'stable',
        },
        activity: {
          filesCreated,
          filesModified,
          filesShared: syncEvents.filter((e) => e.changeType === 'permissions_changed').length,
          totalViews: 0, // Would require Activity API
          activeCollaborators: 0,
        },
        educational: {
          submissionsUploaded,
          assignmentsDistributed: 0,
          portfolioPiecesAdded,
          resourcesShared: 0,
        },
      });
    });
  }

  /**
   * Get connection status for a user
   */
  async getConnectionStatus(tenantId: string, userId: string): Promise<Result<DriveConnection[]>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(userId)) {
      return failure(new ValidationError('userId is required'));
    }

    return this.withTiming('getConnectionStatus', async () => {
      if (!this.connectionRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connections = await this.connectionRepo.findByUser(tenantId, userId);
      return success(connections);
    });
  }

  /**
   * Get a single connection by ID
   */
  async getConnection(tenantId: string, connectionId: string): Promise<Result<DriveConnection>> {
    if (!Validator.isNonEmptyString(tenantId)) {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!Validator.isNonEmptyString(connectionId)) {
      return failure(new ValidationError('connectionId is required'));
    }

    return this.withTiming('getConnection', async () => {
      if (!this.connectionRepo) {
        return failure(new Error('Service not fully initialized'));
      }

      const connection = await this.connectionRepo.findById(tenantId, connectionId);
      if (!connection) {
        return failure(new NotFoundError('DriveConnection', connectionId));
      }
      return success(connection);
    });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async getActiveConnection(tenantId: string, connectionId: string): Promise<Result<DriveConnection>> {
    if (!this.connectionRepo) {
      return failure(new Error('Connection repository not initialized'));
    }

    const connection = await this.connectionRepo.findById(tenantId, connectionId);
    if (!connection) {
      return failure(new NotFoundError('DriveConnection', connectionId));
    }
    if (connection.status === 'revoked') {
      return failure(new AuthorizationError('Google Drive connection has been revoked. Please reconnect.'));
    }
    return success(connection);
  }

  private async ensureValidToken(tenantId: string, connection: DriveConnection): Promise<Result<string>> {
    if (new Date() >= new Date(connection.credentials.expiresAt)) {
      const result = await this.refreshAccessToken(tenantId, connection.id);
      if (!result.success) return result as Result<string>;
      return success(result.data.accessToken);
    }
    return success(connection.credentials.accessToken);
  }

  private getFolderTemplate(role: string): FolderStructureTemplate {
    switch (role) {
      case 'teacher':
        return TEACHER_FOLDER_TEMPLATE;
      case 'homeschool_parent':
        return HOMESCHOOL_FOLDER_TEMPLATE;
      default:
        return STUDENT_FOLDER_TEMPLATE;
    }
  }

  private async createFolderRecursive(
    accessToken: string,
    template: FolderStructureTemplate,
    parentId: string,
    mapping: FolderMapping
  ): Promise<void> {
    if (!this.driveClient) return;

    const folder = await this.driveClient.createFolder(accessToken, template.name, parentId, template.color);

    // Map known folder purposes
    if (template.purpose === ConnectionPurpose.ASSIGNMENT_SUBMISSION) {
      mapping.submissions[template.name.toLowerCase()] = folder.id;
    } else if (template.purpose === ConnectionPurpose.PORTFOLIO) {
      mapping.portfolios[template.name.toLowerCase()] = folder.id;
    }

    for (const child of template.children) {
      await this.createFolderRecursive(accessToken, child, folder.id, mapping);
    }
  }

  private resolveTargetFolder(
    mapping: FolderMapping,
    context?: EducationalFileContext
  ): string | undefined {
    if (!context) return mapping.root;

    if (context.assignmentId && mapping.submissions[context.assignmentId]) {
      return mapping.submissions[context.assignmentId];
    }
    if (context.subjectId && mapping.subjects[context.subjectId]) {
      return mapping.subjects[context.subjectId];
    }
    if (context.fileType === EducationalFileType.PORTFOLIO_PIECE) {
      return mapping.portfolios['portfolio'] || mapping.root;
    }
    return mapping.root;
  }

  private serializeEducationalContext(context: EducationalFileContext): Record<string, string> {
    const props: Record<string, string> = {};
    if (context.fileType) props['scholarly_fileType'] = context.fileType;
    if (context.subjectId) props['scholarly_subjectId'] = context.subjectId;
    if (context.yearLevel) props['scholarly_yearLevel'] = context.yearLevel;
    if (context.curriculumCodes?.length) {
      props['scholarly_curriculumCodes'] = context.curriculumCodes.join(',');
    }
    if (context.assignmentId) props['scholarly_assignmentId'] = context.assignmentId;
    if (context.assessmentType) props['scholarly_assessmentType'] = context.assessmentType;
    if (context.tags?.length) props['scholarly_tags'] = context.tags.join(',');
    return props;
  }

  private buildDriveSearchQuery(query: DriveSearchQuery): string {
    const parts: string[] = [];
    if (query.query) parts.push(`fullText contains '${query.query}'`);
    if (query.mimeTypes?.length) {
      parts.push(`(${query.mimeTypes.map((m) => `mimeType='${m}'`).join(' or ')})`);
    }
    if (query.modifiedAfter) {
      parts.push(`modifiedTime > '${query.modifiedAfter.toISOString()}'`);
    }
    if (query.modifiedBefore) {
      parts.push(`modifiedTime < '${query.modifiedBefore.toISOString()}'`);
    }
    if (query.inFolder) parts.push(`'${query.inFolder}' in parents`);
    parts.push('trashed = false');
    return parts.join(' and ');
  }

  private mapDriveFileToScholarly(driveFile: any, tenantId: string, userId: string): ScholarlyDriveFile {
    return {
      id: this.generateId('gdf'),
      driveFileId: driveFile.id,
      tenantId,
      ownerId: userId,
      name: driveFile.name,
      mimeType: driveFile.mimeType,
      sizeBytes: parseInt(driveFile.size) || 0,
      webViewLink: driveFile.webViewLink || '',
      webContentLink: driveFile.webContentLink,
      iconLink: driveFile.iconLink || '',
      thumbnailLink: driveFile.thumbnailLink,
      educationalContext: this.deserializeEducationalContext(driveFile.appProperties),
      sharingStatus: 'private',
      permissions: [],
      version: parseInt(driveFile.version) || 1,
      createdAt: new Date(driveFile.createdTime),
      modifiedAt: new Date(driveFile.modifiedTime),
    };
  }

  private deserializeEducationalContext(
    appProperties?: Record<string, string>
  ): EducationalFileContext | undefined {
    if (!appProperties?.scholarly_fileType) return undefined;
    return {
      fileType: appProperties.scholarly_fileType as EducationalFileType,
      subjectId: appProperties.scholarly_subjectId,
      yearLevel: appProperties.scholarly_yearLevel,
      curriculumCodes: appProperties.scholarly_curriculumCodes?.split(','),
      assignmentId: appProperties.scholarly_assignmentId,
      assessmentType: appProperties.scholarly_assessmentType as any,
      tags: appProperties.scholarly_tags?.split(',') || [],
    };
  }

  private async processChange(tenantId: string, connectionId: string, change: any): Promise<void> {
    if (!this.fileIndexRepo) return;

    if (change.removed) {
      // File was deleted or moved out of accessible scope
      const indexed = await this.fileIndexRepo.findByDriveId(tenantId, change.fileId);
      if (indexed) {
        await this.fileIndexRepo.delete(tenantId, indexed.id);
        await this.publishEvent('scholarly.gdrive.file_removed', tenantId, {
          connectionId,
          driveFileId: change.fileId,
        });
      }
      return;
    }

    if (change.file) {
      const existing = await this.fileIndexRepo.findByDriveId(tenantId, change.fileId);
      if (existing) {
        await this.fileIndexRepo.update(tenantId, existing.id, {
          name: change.file.name,
          mimeType: change.file.mimeType,
          sizeBytes: parseInt(change.file.size) || existing.sizeBytes,
          modifiedAt: new Date(change.file.modifiedTime),
          version: parseInt(change.file.version) || existing.version + 1,
        });
      }
    }
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const googleDriveIntegrationService = new GoogleDriveIntegrationService();
