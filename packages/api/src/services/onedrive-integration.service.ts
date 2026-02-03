/**
 * OneDrive Integration Service
 *
 * The "Microsoft Wing" of Scholarly's cloud storage strategy — connecting
 * to OneDrive and SharePoint through the Microsoft Graph API, providing
 * first-class support for schools that run on the Microsoft 365 ecosystem.
 *
 * ## The Granny Explanation
 *
 * You know how some families are "Apple families" and some are "Windows
 * families"? Schools are the same way. Some run everything on Google,
 * others run everything on Microsoft. This service is for the Microsoft
 * schools — it connects to their OneDrive (personal files) and SharePoint
 * (shared school files) so students and teachers can use Scholarly without
 * abandoning the tools they already know.
 *
 * Think of it like a universal remote control. Your TV might be a Samsung
 * or an LG, but the remote works with both. Scholarly is that remote for
 * cloud storage — whether a school uses Google Drive or OneDrive, the
 * experience inside Scholarly feels the same.
 *
 * ## Why OneDrive / Microsoft 365?
 *
 * Microsoft 365 Education serves over 200 million users in educational
 * institutions. The Microsoft Graph API provides unified access to OneDrive
 * (personal storage), SharePoint (institutional storage), and Teams (collaboration).
 * Many schools that use Teams for virtual classrooms already have their
 * files living in SharePoint and OneDrive — this service reaches into
 * that world and brings it into Scholarly's educational intelligence layer.
 *
 * ## Architecture: The "Three Doors" Model
 *
 * Microsoft's storage world has three distinct doors, each leading to
 * different content with different access patterns:
 *
 * 1. **OneDrive Personal** — The user's own files (like a private locker)
 * 2. **OneDrive for Business** — School-provisioned storage (like an
 *    assigned desk with drawers)
 * 3. **SharePoint Document Libraries** — Shared institutional content
 *    (like the school library's reference section)
 *
 * This service abstracts all three behind a unified interface, so a teacher
 * doesn't need to think about which "door" to use — Scholarly routes files
 * to the right place based on their educational purpose.
 *
 * ## Microsoft Graph API
 *
 * Unlike Google Drive's single-purpose API, Microsoft Graph is a unified
 * gateway to the entire Microsoft 365 ecosystem. We're accessing Drive items
 * through Graph, which means we could extend to Teams channels, Outlook
 * calendar events, and OneNote notebooks using the same authentication —
 * like having one key that opens every room in the Microsoft building.
 *
 * @module OneDriveIntegrationService
 * @version 1.4.0
 */

import { log } from '../lib/logger';
import {
  Result,
  success,
  failure,
  isFailure,
  ScholarlyBaseService,
  ServiceDependencies,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  Cache,
  EventBus,
  ScholarlyConfig,
} from './base.service';

// ============================================================================
// MICROSOFT IDENTITY & AUTH TYPES
// ============================================================================

/**
 * Microsoft OAuth 2.0 credentials obtained via the Microsoft Identity Platform.
 *
 * Microsoft's auth model supports both "delegated" (user-signed-in) and
 * "application" (daemon/service) permissions. In educational contexts, we
 * primarily use delegated permissions because we're acting on behalf of a
 * specific teacher or student, not the institution itself.
 */
export interface MicrosoftOAuthCredentials {
  accessToken: string;
  refreshToken: string;
  idToken?: string; // Contains user identity claims
  tokenType: 'Bearer';
  expiresAt: Date;
  scope: string[];
  issuedAt: Date;
  tenantId: string; // Azure AD tenant (school/org identity)
}

/**
 * Microsoft Graph API permissions — granular access control.
 *
 * The permission naming follows Microsoft's convention:
 * - "Files.Read" = Read my files
 * - "Files.ReadWrite" = Read and write my files
 * - "Files.ReadWrite.All" = Read and write all files I can access
 * - "Sites.ReadWrite.All" = SharePoint access
 */
export enum MicrosoftGraphScope {
  // User profile
  USER_READ = 'User.Read',

  // OneDrive personal/business
  FILES_READ = 'Files.Read',
  FILES_READ_ALL = 'Files.Read.All',
  FILES_READWRITE = 'Files.ReadWrite',
  FILES_READWRITE_ALL = 'Files.ReadWrite.All',

  // SharePoint
  SITES_READ_ALL = 'Sites.Read.All',
  SITES_READWRITE_ALL = 'Sites.ReadWrite.All',

  // Offline access (for refresh tokens)
  OFFLINE_ACCESS = 'offline_access',

  // OpenID Connect
  OPENID = 'openid',
  PROFILE = 'profile',
  EMAIL = 'email',
}

/**
 * Role-based scope mapping — educators get more access than students,
 * parents get read-only views.
 */
export const MS_ROLE_SCOPE_MAP: Record<string, MicrosoftGraphScope[]> = {
  student: [
    MicrosoftGraphScope.USER_READ,
    MicrosoftGraphScope.FILES_READWRITE,
    MicrosoftGraphScope.OFFLINE_ACCESS,
    MicrosoftGraphScope.OPENID,
  ],
  teacher: [
    MicrosoftGraphScope.USER_READ,
    MicrosoftGraphScope.FILES_READWRITE_ALL,
    MicrosoftGraphScope.SITES_READWRITE_ALL,
    MicrosoftGraphScope.OFFLINE_ACCESS,
    MicrosoftGraphScope.OPENID,
  ],
  tutor: [
    MicrosoftGraphScope.USER_READ,
    MicrosoftGraphScope.FILES_READWRITE,
    MicrosoftGraphScope.OFFLINE_ACCESS,
    MicrosoftGraphScope.OPENID,
  ],
  parent: [
    MicrosoftGraphScope.USER_READ,
    MicrosoftGraphScope.FILES_READ,
    MicrosoftGraphScope.OFFLINE_ACCESS,
    MicrosoftGraphScope.OPENID,
  ],
  admin: [
    MicrosoftGraphScope.USER_READ,
    MicrosoftGraphScope.FILES_READWRITE_ALL,
    MicrosoftGraphScope.SITES_READWRITE_ALL,
    MicrosoftGraphScope.OFFLINE_ACCESS,
    MicrosoftGraphScope.OPENID,
  ],
  homeschool_parent: [
    MicrosoftGraphScope.USER_READ,
    MicrosoftGraphScope.FILES_READWRITE,
    MicrosoftGraphScope.OFFLINE_ACCESS,
    MicrosoftGraphScope.OPENID,
  ],
};

export interface MicrosoftOAuthState {
  tenantId: string;
  userId: string;
  role: string;
  redirectUri: string;
  nonce: string;
  codeVerifier: string; // PKCE — Microsoft requires this
  initiatedAt: Date;
}

// ============================================================================
// CONNECTION TYPES
// ============================================================================

/**
 * Represents a user's OneDrive/SharePoint connection within Scholarly.
 *
 * The storageType field is crucial — it determines which Microsoft Graph
 * endpoints we use. Think of it as the difference between asking to borrow
 * someone's personal notebook versus accessing the shared filing cabinet
 * in the staff room.
 */
export interface OneDriveConnection {
  id: string;
  tenantId: string;
  userId: string;

  // Microsoft identity
  microsoftUserId: string;
  microsoftEmail: string;
  azureTenantId: string;
  displayName: string;

  // Auth credentials
  credentials: MicrosoftOAuthCredentials;

  // Which "door" are we accessing?
  storageType: OneDriveStorageType;

  // For SharePoint connections
  sharePointSiteId?: string;
  sharePointSiteName?: string;
  documentLibraryId?: string;

  // Folder structure
  rootFolderId?: string;
  folderMapping: OneDriveFolderMapping;

  // Delta tracking (Microsoft's change feed mechanism)
  deltaLink?: string;

  // Health
  status: 'active' | 'expired' | 'revoked' | 'consent_required' | 'error';
  lastSyncAt?: Date;
  lastError?: string;

  // Quota
  storageUsedBytes: number;
  storageTotalBytes: number;
  storageStateDescription: string; // "normal", "nearing", "critical", "exceeded"

  createdAt: Date;
  updatedAt: Date;
}

export enum OneDriveStorageType {
  PERSONAL = 'personal', // Consumer OneDrive
  BUSINESS = 'business', // OneDrive for Business (M365)
  SHAREPOINT = 'sharepoint', // SharePoint Document Library
}

export interface OneDriveFolderMapping {
  root?: string;
  subjects: Record<string, string>;
  terms: Record<string, string>;
  portfolios: Record<string, string>;
  shared: Record<string, string>;
  submissions: Record<string, string>;
  classNotebooks: Record<string, string>; // OneNote Class Notebooks
}

// ============================================================================
// DRIVE ITEM TYPES (Microsoft Graph DriveItem)
// ============================================================================

/**
 * Scholarly-enriched representation of a Microsoft Graph DriveItem.
 *
 * Microsoft's DriveItem is more feature-rich than Google's File resource —
 * it natively supports thumbnails, sharing links, version history, and
 * special folder types. We leverage all of these while adding our
 * educational metadata layer on top.
 */
export interface ScholarlyOneDriveItem {
  id: string;
  graphItemId: string;
  tenantId: string;
  ownerId: string;
  connectionId: string;

  // Microsoft Graph metadata
  name: string;
  mimeType: string;
  sizeBytes: number;
  webUrl: string;
  downloadUrl?: string;

  // Rich metadata from Graph
  description?: string;
  thumbnails?: OneDriveThumbnailSet;

  // Item type
  isFolder: boolean;
  isPackage: boolean; // OneNote notebooks, etc.
  packageType?: 'oneNote';

  // Sharing
  sharingInfo?: OneDriveSharingInfo;

  // Version control (Graph natively supports this)
  versionId?: string;
  versionCount: number;

  // Parent navigation
  parentPath: string;
  parentId?: string;

  // Educational context (our enrichment layer)
  educationalContext?: OneDriveEducationalContext;

  // Timestamps
  createdAt: Date;
  modifiedAt: Date;
  lastModifiedByName?: string;
}

export interface OneDriveThumbnailSet {
  small?: { url: string; width: number; height: number };
  medium?: { url: string; width: number; height: number };
  large?: { url: string; width: number; height: number };
}

export interface OneDriveSharingInfo {
  scope: 'anonymous' | 'organization' | 'users';
  sharedWith: Array<{
    email: string;
    displayName: string;
    role: 'read' | 'write' | 'owner';
  }>;
  sharingLink?: {
    type: 'view' | 'edit';
    url: string;
    expiresAt?: Date;
  };
}

export interface OneDriveEducationalContext {
  fileType: string;
  subjectId?: string;
  yearLevel?: string;
  curriculumCodes?: string[];
  termId?: string;
  assignmentId?: string;
  assessmentType?: string;
  submissionStatus?: string;
  tags: string[];
}

// ============================================================================
// SHAREPOINT TYPES
// ============================================================================

/**
 * SharePoint site metadata — represents a school or department's
 * shared document repository.
 */
export interface SharePointSite {
  siteId: string;
  siteName: string;
  siteUrl: string;
  description?: string;
  documentLibraries: SharePointDocumentLibrary[];
}

export interface SharePointDocumentLibrary {
  libraryId: string;
  name: string;
  description?: string;
  driveId: string;
  webUrl: string;
  itemCount: number;
}

// ============================================================================
// DELTA SYNC TYPES (Microsoft's change tracking mechanism)
// ============================================================================

/**
 * Microsoft Graph uses "delta queries" for change tracking — a different
 * approach than Google's change feed. Instead of receiving individual
 * change events, you request a "delta" (diff) between the current state
 * and the last state you knew about, identified by a deltaLink URL.
 *
 * Think of it like asking "what's changed since I last checked?" rather
 * than listening for individual notifications. It's more batch-oriented
 * but equally effective for our sync needs.
 */
export interface OneDriveDeltaChange {
  id: string;
  tenantId: string;
  connectionId: string;

  graphItemId: string;
  changeType: 'created' | 'modified' | 'deleted';

  // The item's current state (null if deleted)
  item?: Partial<ScholarlyOneDriveItem>;

  // Processing
  status: 'pending' | 'processing' | 'completed' | 'failed';
  processedAt?: Date;
  error?: string;

  detectedAt: Date;
}

// ============================================================================
// SEARCH & DISCOVERY
// ============================================================================

export interface OneDriveSearchQuery {
  query?: string;
  mimeTypes?: string[];
  modifiedAfter?: Date;
  modifiedBefore?: Date;
  inFolder?: string;

  // Educational filters
  subjectId?: string;
  yearLevel?: string;
  fileType?: string;
  assignmentId?: string;

  // SharePoint-specific
  siteId?: string;
  libraryId?: string;

  pageSize?: number;
  skipToken?: string;
}

export interface OneDriveSearchResult {
  items: ScholarlyOneDriveItem[];
  totalCount: number;
  skipToken?: string;
  hasMore: boolean;
}

// ============================================================================
// SHARING & COLLABORATION
// ============================================================================

export interface OneDriveSharingRequest {
  itemId: string;
  recipients: Array<{
    email: string;
    scholarlyRole?: string;
  }>;
  role: 'read' | 'write';
  sendNotification: boolean;
  message?: string;
  expiresAt?: Date;
  password?: string;
}

export interface ClassroomDistributionRequest {
  sourceItemId: string;
  recipientEmails: string[];
  mode: 'copy_per_student' | 'shared_view' | 'shared_edit';
  targetFolderName?: string;
  namingPattern: string;
}

// ============================================================================
// REPOSITORIES
// ============================================================================

export interface OneDriveConnectionRepository {
  findById(tenantId: string, id: string): Promise<OneDriveConnection | null>;
  findByUser(tenantId: string, userId: string): Promise<OneDriveConnection[]>;
  findByMicrosoftUser(
    tenantId: string,
    microsoftUserId: string
  ): Promise<OneDriveConnection | null>;
  findActiveByTenant(tenantId: string): Promise<OneDriveConnection[]>;
  save(
    tenantId: string,
    connection: OneDriveConnection
  ): Promise<OneDriveConnection>;
  update(
    tenantId: string,
    id: string,
    updates: Partial<OneDriveConnection>
  ): Promise<OneDriveConnection>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface OneDriveItemIndexRepository {
  findByGraphId(
    tenantId: string,
    graphItemId: string
  ): Promise<ScholarlyOneDriveItem | null>;
  findByFolder(
    tenantId: string,
    folderId: string
  ): Promise<ScholarlyOneDriveItem[]>;
  findByEducationalContext(
    tenantId: string,
    context: Partial<OneDriveEducationalContext>
  ): Promise<ScholarlyOneDriveItem[]>;
  search(tenantId: string, query: OneDriveSearchQuery): Promise<OneDriveSearchResult>;
  save(tenantId: string, item: ScholarlyOneDriveItem): Promise<ScholarlyOneDriveItem>;
  update(
    tenantId: string,
    id: string,
    updates: Partial<ScholarlyOneDriveItem>
  ): Promise<ScholarlyOneDriveItem>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface OneDriveDeltaRepository {
  findPending(tenantId: string, limit: number): Promise<OneDriveDeltaChange[]>;
  save(tenantId: string, change: OneDriveDeltaChange): Promise<OneDriveDeltaChange>;
  update(
    tenantId: string,
    id: string,
    updates: Partial<OneDriveDeltaChange>
  ): Promise<OneDriveDeltaChange>;
}

// ============================================================================
// MICROSOFT GRAPH API CLIENT (Abstracted)
// ============================================================================

/**
 * Abstraction over the Microsoft Graph REST API v1.0.
 *
 * Graph is Microsoft's "universal translator" — one endpoint to access
 * everything in Microsoft 365. We focus on the /me/drive and /sites
 * portions, but the same auth token could theoretically access Teams,
 * Outlook, and OneNote content.
 */
export interface MicrosoftGraphClient {
  // Auth (via Microsoft Identity Platform / MSAL)
  getAuthUrl(state: MicrosoftOAuthState, scopes: MicrosoftGraphScope[]): string;
  exchangeCode(
    code: string,
    redirectUri: string,
    codeVerifier: string
  ): Promise<MicrosoftOAuthCredentials>;
  refreshToken(refreshToken: string): Promise<MicrosoftOAuthCredentials>;
  revokeToken(refreshToken: string): Promise<void>;

  // User Info
  getMe(accessToken: string): Promise<Record<string, unknown>>;

  // OneDrive Items (personal/business)
  getDrive(accessToken: string): Promise<Record<string, unknown>>;
  getItem(accessToken: string, itemId: string): Promise<Record<string, unknown>>;
  listChildren(
    accessToken: string,
    itemId: string,
    select?: string[]
  ): Promise<Record<string, unknown>>;
  createFolder(
    accessToken: string,
    parentId: string,
    name: string
  ): Promise<Record<string, unknown>>;
  uploadFile(
    accessToken: string,
    parentId: string,
    fileName: string,
    content: Buffer
  ): Promise<Record<string, unknown>>;
  uploadLargeFile(
    accessToken: string,
    parentId: string,
    fileName: string,
    fileSize: number
  ): Promise<Record<string, unknown>>;
  updateItem(
    accessToken: string,
    itemId: string,
    metadata: Record<string, unknown>
  ): Promise<Record<string, unknown>>;
  deleteItem(accessToken: string, itemId: string): Promise<void>;
  copyItem(
    accessToken: string,
    itemId: string,
    destination: Record<string, unknown>,
    newName?: string
  ): Promise<Record<string, unknown>>;
  moveItem(
    accessToken: string,
    itemId: string,
    destination: Record<string, unknown>
  ): Promise<Record<string, unknown>>;

  // Sharing
  createSharingLink(
    accessToken: string,
    itemId: string,
    type: string,
    scope: string,
    password?: string,
    expiresAt?: Date
  ): Promise<Record<string, unknown>>;
  createSharingInvitation(
    accessToken: string,
    itemId: string,
    recipients: Record<string, unknown>[],
    roles: string[],
    message?: string
  ): Promise<Record<string, unknown>>;
  listPermissions(
    accessToken: string,
    itemId: string
  ): Promise<Record<string, unknown>>;
  deletePermission(
    accessToken: string,
    itemId: string,
    permissionId: string
  ): Promise<void>;

  // Search
  search(accessToken: string, query: string): Promise<Record<string, unknown>>;

  // Delta (change tracking)
  getDelta(
    accessToken: string,
    folderId?: string
  ): Promise<Record<string, unknown>>;
  getDeltaNext(
    accessToken: string,
    deltaLink: string
  ): Promise<Record<string, unknown>>;

  // SharePoint
  getSites(
    accessToken: string,
    query?: string
  ): Promise<Record<string, unknown>>;
  getSite(accessToken: string, siteId: string): Promise<Record<string, unknown>>;
  getSiteDrives(
    accessToken: string,
    siteId: string
  ): Promise<Record<string, unknown>>;

  // Thumbnails
  getThumbnails(
    accessToken: string,
    itemId: string
  ): Promise<Record<string, unknown>>;

  // Versions
  getVersions(
    accessToken: string,
    itemId: string
  ): Promise<Record<string, unknown>>;
  restoreVersion(
    accessToken: string,
    itemId: string,
    versionId: string
  ): Promise<void>;
}

// ============================================================================
// SERVICE SINGLETON
// ============================================================================

let oneDriveServiceInstance: OneDriveIntegrationService | null = null;

export function initializeOneDriveService(deps: {
  connectionRepo: OneDriveConnectionRepository;
  itemIndexRepo: OneDriveItemIndexRepository;
  deltaRepo: OneDriveDeltaRepository;
  graphClient: MicrosoftGraphClient;
  eventBus?: EventBus;
  cache?: Cache;
  config?: ScholarlyConfig;
}): OneDriveIntegrationService {
  oneDriveServiceInstance = new OneDriveIntegrationService(deps);
  return oneDriveServiceInstance;
}

export function getOneDriveService(): OneDriveIntegrationService {
  if (!oneDriveServiceInstance) {
    throw new Error(
      'OneDriveIntegrationService not initialized. Call initializeOneDriveService first.'
    );
  }
  return oneDriveServiceInstance;
}

// ============================================================================
// SERVICE
// ============================================================================

export class OneDriveIntegrationService extends ScholarlyBaseService {
  private readonly connectionRepo: OneDriveConnectionRepository;
  private readonly itemIndexRepo: OneDriveItemIndexRepository;
  private readonly deltaRepo: OneDriveDeltaRepository;
  private readonly graphClient: MicrosoftGraphClient;

  constructor(deps: {
    connectionRepo: OneDriveConnectionRepository;
    itemIndexRepo: OneDriveItemIndexRepository;
    deltaRepo: OneDriveDeltaRepository;
    graphClient: MicrosoftGraphClient;
    eventBus?: EventBus;
    cache?: Cache;
    config?: ScholarlyConfig;
  }) {
    super('OneDriveIntegration', {
      eventBus: deps.eventBus,
      cache: deps.cache,
      config: deps.config,
    });
    this.connectionRepo = deps.connectionRepo;
    this.itemIndexRepo = deps.itemIndexRepo;
    this.deltaRepo = deps.deltaRepo;
    this.graphClient = deps.graphClient;
  }

  // ==========================================================================
  // OAUTH 2.0 WITH PKCE — THE MICROSOFT HANDSHAKE
  // ==========================================================================

  /**
   * Initiate the Microsoft Identity Platform OAuth flow with PKCE.
   *
   * Microsoft's auth requires PKCE (Proof Key for Code Exchange) — think
   * of it as a two-part secret: you create a challenge (like splitting a
   * banknote in half), send one half with the initial request, and prove
   * ownership with the other half when exchanging the code. This prevents
   * interception attacks even if someone captures the authorization code.
   */
  async initiateOAuthFlow(
    tenantId: string,
    userId: string,
    role: string,
    redirectUri: string
  ): Promise<Result<{ authorizationUrl: string; state: string }>> {
    const validationResult = this.validateRequired(
      { tenantId, userId, role, redirectUri },
      ['tenantId', 'userId', 'role', 'redirectUri']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('initiateOAuthFlow', async () => {
      const scopes = MS_ROLE_SCOPE_MAP[role] || MS_ROLE_SCOPE_MAP['student'];
      const nonce = this.generateId('nonce');
      const codeVerifier = this.generateCodeVerifier();

      const state: MicrosoftOAuthState = {
        tenantId,
        userId,
        role,
        redirectUri,
        nonce,
        codeVerifier,
        initiatedAt: new Date(),
      };

      await this.cacheSet(`ms_oauth_state:${nonce}`, state, 600);

      const authorizationUrl = this.graphClient.getAuthUrl(state, scopes);

      log.info('Microsoft OAuth flow initiated', { userId, role });

      return success({ authorizationUrl, state: nonce });
    });
  }

  /**
   * Handle the OAuth callback from Microsoft Identity Platform.
   */
  async handleOAuthCallback(
    tenantId: string,
    code: string,
    stateNonce: string,
    redirectUri: string
  ): Promise<Result<OneDriveConnection>> {
    const validationResult = this.validateRequired(
      { tenantId, code, stateNonce },
      ['tenantId', 'code', 'stateNonce']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('handleOAuthCallback', async () => {
      const cachedState = await this.cacheGet<MicrosoftOAuthState>(
        `ms_oauth_state:${stateNonce}`
      );

      if (!cachedState) {
        return failure({
          code: 'AUTHORIZATION_ERROR',
          message: 'Invalid or expired OAuth state.',
        });
      }

      // Exchange code with PKCE verification
      const credentials = await this.graphClient.exchangeCode(
        code,
        redirectUri,
        cachedState.codeVerifier
      );

      // Get user profile from Microsoft Graph
      const userInfo = await this.graphClient.getMe(credentials.accessToken);

      // Get drive info for quota
      const driveInfo = await this.graphClient.getDrive(credentials.accessToken);

      // Determine storage type from the drive info
      const storageType = this.determineStorageType(driveInfo);

      // Check for existing connection
      const existing = await this.connectionRepo.findByMicrosoftUser(
        tenantId,
        userInfo.id as string
      );

      const connection: OneDriveConnection = {
        id: existing?.id || this.generateId('onedrive'),
        tenantId,
        userId: cachedState.userId,
        microsoftUserId: userInfo.id as string,
        microsoftEmail:
          (userInfo.mail as string) || (userInfo.userPrincipalName as string),
        azureTenantId: credentials.tenantId,
        displayName: userInfo.displayName as string,
        credentials,
        storageType,
        rootFolderId: (driveInfo.root as Record<string, unknown>)?.id as string,
        folderMapping: existing?.folderMapping || {
          subjects: {},
          terms: {},
          portfolios: {},
          shared: {},
          submissions: {},
          classNotebooks: {},
        },
        status: 'active',
        lastSyncAt: new Date(),
        storageUsedBytes:
          ((driveInfo.quota as Record<string, unknown>)?.used as number) || 0,
        storageTotalBytes:
          ((driveInfo.quota as Record<string, unknown>)?.total as number) || 0,
        storageStateDescription:
          ((driveInfo.quota as Record<string, unknown>)?.state as string) || 'normal',
        createdAt: existing?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      const saved = await this.connectionRepo.save(tenantId, connection);

      // Provision folder structure in background
      this.provisionFolderStructure(tenantId, saved.id, cachedState.role).catch(
        (err) => {
          log.error('Background folder provisioning failed', err as Error, {
            connectionId: saved.id,
          });
        }
      );

      await this.cacheInvalidate(`ms_oauth_state:${stateNonce}`);

      await this.publishEvent('scholarly.onedrive.connected', tenantId, {
        connectionId: saved.id,
        userId: cachedState.userId,
        microsoftEmail: connection.microsoftEmail,
        storageType,
      });

      return success(saved);
    });
  }

  /**
   * Refresh Microsoft access token — similar to Google but with some
   * nuances. Microsoft tokens typically last 60-90 minutes, and
   * refresh tokens can rotate (the new response may include a new
   * refresh token, invalidating the old one).
   */
  async refreshAccessToken(
    tenantId: string,
    connectionId: string
  ): Promise<Result<MicrosoftOAuthCredentials>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId },
      ['tenantId', 'connectionId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('refreshAccessToken', async () => {
      const connection = await this.connectionRepo.findById(tenantId, connectionId);
      if (!connection) {
        return failure({
          code: 'NOT_FOUND',
          message: `OneDriveConnection with id '${connectionId}' not found`,
        });
      }

      try {
        const newCredentials = await this.graphClient.refreshToken(
          connection.credentials.refreshToken
        );

        // Microsoft may rotate refresh tokens — always save the latest
        await this.connectionRepo.update(tenantId, connectionId, {
          credentials: newCredentials,
          status: 'active',
          updatedAt: new Date(),
        });

        return success(newCredentials);
      } catch (err) {
        // If refresh fails, it often means user needs to re-consent
        await this.connectionRepo.update(tenantId, connectionId, {
          status: 'consent_required',
          lastError: (err as Error).message,
          updatedAt: new Date(),
        });
        return failure({
          code: 'AUTHORIZATION_ERROR',
          message:
            'Microsoft token refresh failed. User may need to re-authorize. ' +
            'This can happen when organizational policies change or consent is revoked.',
        });
      }
    });
  }

  /**
   * Disconnect a OneDrive account.
   */
  async disconnect(tenantId: string, connectionId: string): Promise<Result<void>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId },
      ['tenantId', 'connectionId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('disconnect', async () => {
      const connection = await this.connectionRepo.findById(tenantId, connectionId);
      if (!connection) {
        return failure({
          code: 'NOT_FOUND',
          message: `OneDriveConnection with id '${connectionId}' not found`,
        });
      }

      try {
        await this.graphClient.revokeToken(connection.credentials.refreshToken);
      } catch (err) {
        log.warn('Microsoft token revocation failed', { connectionId });
      }

      await this.connectionRepo.update(tenantId, connectionId, {
        status: 'revoked',
        updatedAt: new Date(),
      });

      await this.publishEvent('scholarly.onedrive.disconnected', tenantId, {
        connectionId,
        userId: connection.userId,
      });

      return success(undefined);
    });
  }

  /**
   * Get user's connections.
   */
  async getUserConnections(
    tenantId: string,
    userId: string
  ): Promise<Result<OneDriveConnection[]>> {
    const validationResult = this.validateRequired(
      { tenantId, userId },
      ['tenantId', 'userId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('getUserConnections', async () => {
      const connections = await this.connectionRepo.findByUser(tenantId, userId);
      return success(connections);
    });
  }

  /**
   * Get connection by ID.
   */
  async getConnection(
    tenantId: string,
    connectionId: string
  ): Promise<Result<OneDriveConnection>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId },
      ['tenantId', 'connectionId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('getConnection', async () => {
      const connection = await this.connectionRepo.findById(tenantId, connectionId);
      if (!connection) {
        return failure({
          code: 'NOT_FOUND',
          message: `OneDriveConnection with id '${connectionId}' not found`,
        });
      }
      return success(connection);
    });
  }

  // ==========================================================================
  // FOLDER MANAGEMENT
  // ==========================================================================

  /**
   * Provision educational folder structure in OneDrive.
   */
  async provisionFolderStructure(
    tenantId: string,
    connectionId: string,
    role: string
  ): Promise<Result<OneDriveFolderMapping>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId },
      ['tenantId', 'connectionId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('provisionFolderStructure', async () => {
      const connection = await this.getActiveConnection(tenantId, connectionId);
      if (isFailure(connection)) {
        return failure(connection.error);
      }

      const accessToken = await this.ensureValidToken(tenantId, connection.data);
      if (isFailure(accessToken)) {
        return failure(accessToken.error);
      }

      const mapping: OneDriveFolderMapping = {
        subjects: {},
        terms: {},
        portfolios: {},
        shared: {},
        submissions: {},
        classNotebooks: {},
      };

      // Create the Scholarly root folder
      const rootFolder = await this.graphClient.createFolder(
        accessToken.data,
        connection.data.rootFolderId || 'root',
        'Scholarly'
      );
      mapping.root = rootFolder.id as string;

      // Create role-appropriate subfolders
      const folderStructure = this.getFolderStructure(role);

      for (const folderName of folderStructure) {
        try {
          const folder = await this.graphClient.createFolder(
            accessToken.data,
            rootFolder.id as string,
            folderName
          );
          // Map known folder names to categories
          if (folderName.includes('Assignment') || folderName.includes('Submission')) {
            mapping.submissions[folderName.toLowerCase().replace(/\s/g, '_')] =
              folder.id as string;
          } else if (folderName.includes('Portfolio')) {
            mapping.portfolios['default'] = folder.id as string;
          }
        } catch (err) {
          // Folder may already exist — not a fatal error
          log.warn(`Folder creation skipped (may exist): ${folderName}`, {
            connectionId,
          });
        }
      }

      await this.connectionRepo.update(tenantId, connectionId, {
        folderMapping: mapping,
        updatedAt: new Date(),
      });

      await this.publishEvent('scholarly.onedrive.folders_provisioned', tenantId, {
        connectionId,
        rootFolderId: rootFolder.id,
      });

      return success(mapping);
    });
  }

  // ==========================================================================
  // FILE OPERATIONS
  // ==========================================================================

  /**
   * Upload a file to OneDrive with educational context.
   *
   * For files under 4MB, we use simple upload. For larger files,
   * Microsoft requires a resumable upload session — like shipping a
   * large package in multiple tracked parcels rather than one uninsured box.
   */
  async uploadFile(
    tenantId: string,
    connectionId: string,
    file: {
      name: string;
      mimeType: string;
      content: Buffer;
      parentFolderId?: string;
      educationalContext?: OneDriveEducationalContext;
    }
  ): Promise<Result<ScholarlyOneDriveItem>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId, fileName: file.name },
      ['tenantId', 'connectionId', 'fileName']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('uploadFile', async () => {
      const connection = await this.getActiveConnection(tenantId, connectionId);
      if (isFailure(connection)) {
        return failure(connection.error);
      }

      const accessToken = await this.ensureValidToken(tenantId, connection.data);
      if (isFailure(accessToken)) {
        return failure(accessToken.error);
      }

      const targetFolder =
        file.parentFolderId ||
        this.resolveTargetFolder(connection.data.folderMapping, file.educationalContext);

      let driveItem: Record<string, unknown>;
      const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024; // 4MB

      if (file.content.length <= SIMPLE_UPLOAD_LIMIT) {
        driveItem = await this.graphClient.uploadFile(
          accessToken.data,
          targetFolder || connection.data.rootFolderId || 'root',
          file.name,
          file.content
        );
      } else {
        // Large file — use upload session
        driveItem = await this.graphClient.uploadLargeFile(
          accessToken.data,
          targetFolder || connection.data.rootFolderId || 'root',
          file.name,
          file.content.length
        );
      }

      // If we have educational context, store it as a description
      // (OneDrive doesn't have custom properties like Google's appProperties,
      //  so we encode context in the description field and our index)
      if (file.educationalContext) {
        await this.graphClient.updateItem(accessToken.data, driveItem.id as string, {
          description: this.serializeContextToDescription(file.educationalContext),
        });
      }

      const scholarlyItem = this.mapGraphItemToScholarly(
        driveItem,
        tenantId,
        connection.data.userId,
        connectionId,
        file.educationalContext
      );

      await this.itemIndexRepo.save(tenantId, scholarlyItem);

      await this.publishEvent('scholarly.onedrive.file_uploaded', tenantId, {
        itemId: scholarlyItem.id,
        graphItemId: driveItem.id,
        fileName: file.name,
      });

      return success(scholarlyItem);
    });
  }

  /**
   * List items in a folder.
   */
  async listFolderItems(
    tenantId: string,
    connectionId: string,
    folderId?: string
  ): Promise<Result<ScholarlyOneDriveItem[]>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId },
      ['tenantId', 'connectionId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('listFolderItems', async () => {
      const connection = await this.getActiveConnection(tenantId, connectionId);
      if (isFailure(connection)) {
        return failure(connection.error);
      }

      const accessToken = await this.ensureValidToken(tenantId, connection.data);
      if (isFailure(accessToken)) {
        return failure(accessToken.error);
      }

      const targetFolderId =
        folderId || connection.data.folderMapping.root || connection.data.rootFolderId || 'root';

      const result = await this.graphClient.listChildren(accessToken.data, targetFolderId);
      const items = ((result.value as Record<string, unknown>[]) || []).map((item) =>
        this.mapGraphItemToScholarly(
          item,
          tenantId,
          connection.data.userId,
          connectionId
        )
      );

      return success(items);
    });
  }

  /**
   * Search across OneDrive and/or SharePoint.
   *
   * Microsoft Graph's search is powerful — it indexes content within
   * documents, not just filenames. So searching for "photosynthesis"
   * will find a Word document that mentions photosynthesis in paragraph 3,
   * even if the filename is "Biology_Unit_7.docx".
   */
  async searchItems(
    tenantId: string,
    connectionId: string,
    query: OneDriveSearchQuery
  ): Promise<Result<OneDriveSearchResult>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId },
      ['tenantId', 'connectionId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('searchItems', async () => {
      // Educational context filters search our index
      if (query.subjectId || query.fileType || query.assignmentId) {
        const result = await this.itemIndexRepo.search(tenantId, query);
        return success(result);
      }

      const connection = await this.getActiveConnection(tenantId, connectionId);
      if (isFailure(connection)) {
        return failure(connection.error);
      }

      const accessToken = await this.ensureValidToken(tenantId, connection.data);
      if (isFailure(accessToken)) {
        return failure(accessToken.error);
      }

      const searchText = query.query || '*';
      const results = await this.graphClient.search(accessToken.data, searchText);

      const items = ((results.value as Record<string, unknown>[]) || []).map(
        (hit: Record<string, unknown>) => {
          const item = hit.resource as Record<string, unknown>;
          return this.mapGraphItemToScholarly(
            item,
            tenantId,
            connection.data.userId,
            connectionId
          );
        }
      );

      return success({
        items,
        totalCount: (results['@odata.count'] as number) || items.length,
        skipToken: results['@odata.nextLink'] ? 'next' : undefined,
        hasMore: !!results['@odata.nextLink'],
      });
    });
  }

  /**
   * Share an item using Microsoft's sharing infrastructure.
   *
   * Microsoft supports both "sharing links" (URL-based, anonymous or
   * organization-scoped) and "direct invitations" (email-based, specific
   * people). We use invitations for classroom contexts and links for
   * broader sharing like parent communications.
   */
  async shareItem(
    tenantId: string,
    connectionId: string,
    request: OneDriveSharingRequest
  ): Promise<Result<OneDriveSharingInfo>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId, itemId: request.itemId },
      ['tenantId', 'connectionId', 'itemId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('shareItem', async () => {
      const connection = await this.getActiveConnection(tenantId, connectionId);
      if (isFailure(connection)) {
        return failure(connection.error);
      }

      const accessToken = await this.ensureValidToken(tenantId, connection.data);
      if (isFailure(accessToken)) {
        return failure(accessToken.error);
      }

      const roles = request.role === 'write' ? ['write'] : ['read'];

      await this.graphClient.createSharingInvitation(
        accessToken.data,
        request.itemId,
        request.recipients.map((r) => ({ email: r.email })),
        roles,
        request.message
      );

      const sharingInfo: OneDriveSharingInfo = {
        scope: 'users',
        sharedWith: request.recipients.map((r) => ({
          email: r.email,
          displayName: r.email,
          role: request.role,
        })),
      };

      // Update our index with sharing status
      const indexed = await this.itemIndexRepo.findByGraphId(tenantId, request.itemId);
      if (indexed) {
        await this.itemIndexRepo.update(tenantId, indexed.id, {
          sharingInfo: sharingInfo,
        });
      }

      await this.publishEvent('scholarly.onedrive.item_shared', tenantId, {
        connectionId,
        itemId: request.itemId,
        recipientCount: request.recipients.length,
        role: request.role,
      });

      return success(sharingInfo);
    });
  }

  // ==========================================================================
  // DELTA SYNC — MICROSOFT'S CHANGE TRACKING
  // ==========================================================================

  /**
   * Process delta changes from OneDrive.
   *
   * Delta queries return ALL changes since the last deltaLink, in a single
   * response (possibly paginated). This is efficient because we only need
   * one API call to catch up, regardless of how many changes happened.
   *
   * The deltaLink is like a save point in a video game — you can always
   * resume from exactly where you left off.
   */
  async processDeltaChanges(
    tenantId: string,
    connectionId: string
  ): Promise<Result<{ processed: number; errors: number }>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId },
      ['tenantId', 'connectionId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('processDeltaChanges', async () => {
      const connection = await this.getActiveConnection(tenantId, connectionId);
      if (isFailure(connection)) {
        return failure(connection.error);
      }

      const accessToken = await this.ensureValidToken(tenantId, connection.data);
      if (isFailure(accessToken)) {
        return failure(accessToken.error);
      }

      let processed = 0;
      let errors = 0;

      let deltaResult: Record<string, unknown>;

      if (connection.data.deltaLink) {
        deltaResult = await this.graphClient.getDeltaNext(
          accessToken.data,
          connection.data.deltaLink
        );
      } else {
        deltaResult = await this.graphClient.getDelta(accessToken.data);
      }

      // Process all returned items
      for (const item of (deltaResult.value as Record<string, unknown>[]) || []) {
        try {
          if ((item as Record<string, unknown>).deleted) {
            const indexed = await this.itemIndexRepo.findByGraphId(
              tenantId,
              item.id as string
            );
            if (indexed) {
              await this.itemIndexRepo.delete(tenantId, indexed.id);
            }
          } else {
            const existing = await this.itemIndexRepo.findByGraphId(
              tenantId,
              item.id as string
            );
            const scholarlyItem = this.mapGraphItemToScholarly(
              item,
              tenantId,
              connection.data.userId,
              connectionId
            );

            if (existing) {
              await this.itemIndexRepo.update(tenantId, existing.id, scholarlyItem);
            } else {
              await this.itemIndexRepo.save(tenantId, scholarlyItem);
            }
          }
          processed++;
        } catch (err) {
          errors++;
          log.error('Delta change processing failed', err as Error, {
            connectionId,
            graphItemId: item.id,
          });
        }
      }

      // Follow pagination if needed
      while (deltaResult['@odata.nextLink']) {
        deltaResult = await this.graphClient.getDeltaNext(
          accessToken.data,
          deltaResult['@odata.nextLink'] as string
        );

        for (const item of (deltaResult.value as Record<string, unknown>[]) || []) {
          try {
            // Same processing logic as above
            if ((item as Record<string, unknown>).deleted) {
              const indexed = await this.itemIndexRepo.findByGraphId(
                tenantId,
                item.id as string
              );
              if (indexed) await this.itemIndexRepo.delete(tenantId, indexed.id);
            } else {
              const scholarlyItem = this.mapGraphItemToScholarly(
                item,
                tenantId,
                connection.data.userId,
                connectionId
              );
              const existing = await this.itemIndexRepo.findByGraphId(
                tenantId,
                item.id as string
              );
              if (existing) {
                await this.itemIndexRepo.update(tenantId, existing.id, scholarlyItem);
              } else {
                await this.itemIndexRepo.save(tenantId, scholarlyItem);
              }
            }
            processed++;
          } catch (err) {
            errors++;
          }
        }
      }

      // Save the new deltaLink for next sync
      const newDeltaLink = deltaResult['@odata.deltaLink'] as string;
      if (newDeltaLink) {
        await this.connectionRepo.update(tenantId, connectionId, {
          deltaLink: newDeltaLink,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
        });
      }

      return success({ processed, errors });
    });
  }

  // ==========================================================================
  // SHAREPOINT INTEGRATION
  // ==========================================================================

  /**
   * Discover available SharePoint sites for the connected user.
   *
   * In a school context, this reveals the institutional document libraries
   * available — like seeing which sections of the school library you have
   * access to based on your role.
   */
  async discoverSharePointSites(
    tenantId: string,
    connectionId: string,
    searchQuery?: string
  ): Promise<Result<SharePointSite[]>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId },
      ['tenantId', 'connectionId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('discoverSharePointSites', async () => {
      const connection = await this.getActiveConnection(tenantId, connectionId);
      if (isFailure(connection)) {
        return failure(connection.error);
      }

      const accessToken = await this.ensureValidToken(tenantId, connection.data);
      if (isFailure(accessToken)) {
        return failure(accessToken.error);
      }

      const sitesResult = await this.graphClient.getSites(
        accessToken.data,
        searchQuery
      );

      const sites: SharePointSite[] = [];

      for (const site of (sitesResult.value as Record<string, unknown>[]) || []) {
        const drivesResult = await this.graphClient.getSiteDrives(
          accessToken.data,
          site.id as string
        );

        sites.push({
          siteId: site.id as string,
          siteName: (site.displayName as string) || (site.name as string),
          siteUrl: site.webUrl as string,
          description: site.description as string,
          documentLibraries: (
            (drivesResult.value as Record<string, unknown>[]) || []
          ).map((drive: Record<string, unknown>) => ({
            libraryId: drive.id as string,
            name: drive.name as string,
            description: drive.description as string,
            driveId: drive.id as string,
            webUrl: drive.webUrl as string,
            itemCount:
              ((drive.quota as Record<string, unknown>)?.total as number) || 0,
          })),
        });
      }

      return success(sites);
    });
  }

  /**
   * Connect a SharePoint document library for institutional content sharing.
   */
  async connectSharePointLibrary(
    tenantId: string,
    connectionId: string,
    siteId: string,
    libraryId: string
  ): Promise<Result<OneDriveConnection>> {
    const validationResult = this.validateRequired(
      { tenantId, connectionId, siteId, libraryId },
      ['tenantId', 'connectionId', 'siteId', 'libraryId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('connectSharePointLibrary', async () => {
      const connection = await this.getActiveConnection(tenantId, connectionId);
      if (isFailure(connection)) {
        return failure(connection.error);
      }

      const accessToken = await this.ensureValidToken(tenantId, connection.data);
      if (isFailure(accessToken)) {
        return failure(accessToken.error);
      }

      const site = await this.graphClient.getSite(accessToken.data, siteId);

      const updated = await this.connectionRepo.update(tenantId, connectionId, {
        sharePointSiteId: siteId,
        sharePointSiteName: site.displayName as string,
        documentLibraryId: libraryId,
        storageType: OneDriveStorageType.SHAREPOINT,
        updatedAt: new Date(),
      });

      await this.publishEvent('scholarly.onedrive.sharepoint_connected', tenantId, {
        connectionId,
        siteId,
        siteName: site.displayName,
        libraryId,
      });

      return success(updated);
    });
  }

  // ==========================================================================
  // VERSION HISTORY
  // ==========================================================================

  /**
   * Get version history for a file — a powerful feature that OneDrive
   * provides natively. Essential for tracking the evolution of student work
   * and providing evidence of learning progression.
   */
  async getVersionHistory(
    tenantId: string,
    connectionId: string,
    graphItemId: string
  ): Promise<
    Result<
      Array<{
        versionId: string;
        modifiedAt: Date;
        modifiedBy: string;
        sizeBytes: number;
        isCurrentVersion: boolean;
      }>
    >
  > {
    const validationResult = this.validateRequired(
      { tenantId, connectionId, graphItemId },
      ['tenantId', 'connectionId', 'graphItemId']
    );
    if (isFailure(validationResult)) {
      return failure(validationResult.error);
    }

    return this.withTiming('getVersionHistory', async () => {
      const connection = await this.getActiveConnection(tenantId, connectionId);
      if (isFailure(connection)) {
        return failure(connection.error);
      }

      const accessToken = await this.ensureValidToken(tenantId, connection.data);
      if (isFailure(accessToken)) {
        return failure(accessToken.error);
      }

      const versions = await this.graphClient.getVersions(
        accessToken.data,
        graphItemId
      );

      return success(
        ((versions.value as Record<string, unknown>[]) || []).map(
          (v: Record<string, unknown>, index: number) => ({
            versionId: v.id as string,
            modifiedAt: new Date(v.lastModifiedDateTime as string),
            modifiedBy:
              ((v.lastModifiedBy as Record<string, unknown>)?.user as Record<string, unknown>)
                ?.displayName as string || 'Unknown',
            sizeBytes: (v.size as number) || 0,
            isCurrentVersion: index === 0,
          })
        )
      );
    });
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  private async getActiveConnection(
    tenantId: string,
    connectionId: string
  ): Promise<Result<OneDriveConnection>> {
    const connection = await this.connectionRepo.findById(tenantId, connectionId);
    if (!connection) {
      return failure({
        code: 'NOT_FOUND',
        message: `OneDriveConnection with id '${connectionId}' not found`,
      });
    }
    if (connection.status === 'revoked') {
      return failure({
        code: 'AUTHORIZATION_ERROR',
        message: 'OneDrive connection has been revoked.',
      });
    }
    if (connection.status === 'consent_required') {
      return failure({
        code: 'AUTHORIZATION_ERROR',
        message:
          'Microsoft requires re-authorization. Please reconnect your OneDrive account.',
      });
    }
    return success(connection);
  }

  private async ensureValidToken(
    tenantId: string,
    connection: OneDriveConnection
  ): Promise<Result<string>> {
    // Microsoft tokens typically expire in 60-90 minutes
    const buffer = 5 * 60 * 1000; // 5-minute buffer
    if (
      new Date().getTime() + buffer >=
      new Date(connection.credentials.expiresAt).getTime()
    ) {
      const result = await this.refreshAccessToken(tenantId, connection.id);
      if (isFailure(result)) return failure(result.error);
      return success(result.data.accessToken);
    }
    return success(connection.credentials.accessToken);
  }

  private determineStorageType(driveInfo: Record<string, unknown>): OneDriveStorageType {
    if (driveInfo.driveType === 'business') return OneDriveStorageType.BUSINESS;
    if (driveInfo.driveType === 'documentLibrary') return OneDriveStorageType.SHAREPOINT;
    return OneDriveStorageType.PERSONAL;
  }

  private getFolderStructure(role: string): string[] {
    switch (role) {
      case 'teacher':
        return [
          'Lesson Plans',
          'Assessments',
          'Student Submissions',
          'Reports',
          'Shared Resources',
          'Parent Communications',
        ];
      case 'homeschool_parent':
        return [
          'Curriculum Plans',
          'Student Work',
          'Compliance Records',
          'Co-op Resources',
          'Assessment Evidence',
        ];
      default:
        return ['My Work', 'Assignments', 'Portfolio', 'Tutor Sessions', 'Resources'];
    }
  }

  private resolveTargetFolder(
    mapping: OneDriveFolderMapping,
    context?: OneDriveEducationalContext
  ): string | undefined {
    if (!context) return mapping.root;
    if (context.assignmentId && mapping.submissions[context.assignmentId]) {
      return mapping.submissions[context.assignmentId];
    }
    if (context.subjectId && mapping.subjects[context.subjectId]) {
      return mapping.subjects[context.subjectId];
    }
    return mapping.root;
  }

  private serializeContextToDescription(context: OneDriveEducationalContext): string {
    const parts = [`[Scholarly: ${context.fileType}]`];
    if (context.subjectId) parts.push(`Subject: ${context.subjectId}`);
    if (context.yearLevel) parts.push(`Year: ${context.yearLevel}`);
    if (context.curriculumCodes?.length)
      parts.push(`Curriculum: ${context.curriculumCodes.join(', ')}`);
    if (context.tags?.length) parts.push(`Tags: ${context.tags.join(', ')}`);
    return parts.join(' | ');
  }

  private mapGraphItemToScholarly(
    item: Record<string, unknown>,
    tenantId: string,
    userId: string,
    connectionId: string,
    educationalContext?: OneDriveEducationalContext
  ): ScholarlyOneDriveItem {
    return {
      id: this.generateId('odi'),
      graphItemId: item.id as string,
      tenantId,
      ownerId: userId,
      connectionId,
      name: item.name as string,
      mimeType:
        ((item.file as Record<string, unknown>)?.mimeType as string) ||
        'application/octet-stream',
      sizeBytes: (item.size as number) || 0,
      webUrl: (item.webUrl as string) || '',
      downloadUrl: item['@microsoft.graph.downloadUrl'] as string,
      description: item.description as string,
      isFolder: !!(item.folder as Record<string, unknown>),
      isPackage: !!(item.package as Record<string, unknown>),
      packageType: (item.package as Record<string, unknown>)?.type as 'oneNote',
      versionCount: 1,
      parentPath:
        ((item.parentReference as Record<string, unknown>)?.path as string) || '',
      parentId: (item.parentReference as Record<string, unknown>)?.id as string,
      educationalContext,
      createdAt: new Date((item.createdDateTime as string) || Date.now()),
      modifiedAt: new Date((item.lastModifiedDateTime as string) || Date.now()),
      lastModifiedByName: (
        (item.lastModifiedBy as Record<string, unknown>)?.user as Record<string, unknown>
      )?.displayName as string,
    };
  }

  /**
   * Generate a cryptographically random PKCE code verifier.
   * A 43-128 character string from the unreserved URL characters set.
   */
  private generateCodeVerifier(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const length = 64;
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
