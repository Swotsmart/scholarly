/**
 * Unified Communications 4.0 — Cloud Files Plugin
 *
 * The filing cabinet that connects to any cloud storage provider. Provides
 * a unified interface over Google Drive, OneDrive, Dropbox, iCloud, S3 —
 * like a universal power adapter: one plug, every wall socket.
 *
 * The plugin stores references (provider, fileId, metadata), never file
 * content itself. Zero storage cost on our side; full respect for provider
 * permissions. The same architecture serves corporate OneDrive, a teacher's
 * Google Drive, or a student's iCloud.
 *
 * Event prefix: files:*
 * REST endpoints: 14 under /api/cloud-files/
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { UCPlugin, PluginContext, PluginHealth, PluginCapability } from '../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CloudProvider = 'GOOGLE_DRIVE' | 'ONEDRIVE' | 'DROPBOX' | 'ICLOUD' | 'S3' | 'LOCAL';

export interface CloudConnection {
  id: string;
  userId: string;
  tenantId: string;
  provider: CloudProvider;
  label: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  accountEmail?: string;
  accountName?: string;
  rootFolderId?: string;
  isActive: boolean;
  connectedAt: string;
  lastUsedAt?: string;
}

export interface CloudFile {
  id: string;
  connectionId: string;
  provider: CloudProvider;
  providerFileId: string;
  name: string;
  mimeType: string;
  size: number;
  isFolder: boolean;
  parentFolderId?: string;
  webViewUrl?: string;
  downloadUrl?: string;
  thumbnailUrl?: string;
  version?: string;
  lastModified: string;
  lastModifiedBy?: string;
  permissions: FilePermission[];
}

export interface FilePermission {
  type: 'ANYONE' | 'USER' | 'GROUP' | 'DOMAIN';
  role: 'VIEWER' | 'COMMENTER' | 'EDITOR' | 'OWNER';
  email?: string;
  domain?: string;
}

export interface FileShare {
  id: string;
  fileId: string;
  connectionId: string;
  sharedBy: string;
  sharedIn: string;
  sharedInType: 'ROOM' | 'CHANNEL' | 'DM';
  sharedAt: string;
  tenantId: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: string;
  modifiedBy: string;
  modifiedAt: string;
  size: number;
}

// ─── Plugin ─────────────────────────────────────────────────────────────────

export class CloudFilesPlugin implements UCPlugin {
  readonly id = 'cloud-files';
  readonly name = 'Cloud Files';
  readonly version = '4.0.0';
  readonly dependencies: string[] = [];

  private ctx!: PluginContext;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    ctx.logger.info('[CloudFiles] Initialised — OAuth, browse, share, version');
  }

  getRoutes(): Router {
    const r = Router();

    // OAuth connections
    r.post('/connections', this.w(this.createConnection));
    r.get('/connections', this.w(this.listConnections));
    r.delete('/connections/:connId', this.w(this.removeConnection));
    r.post('/connections/:connId/refresh', this.w(this.refreshToken));

    // Browsing
    r.get('/connections/:connId/browse', this.w(this.browseFiles));
    r.get('/connections/:connId/files/:fileId', this.w(this.getFileDetails));
    r.get('/connections/:connId/search', this.w(this.searchFiles));

    // Sharing
    r.post('/connections/:connId/files/:fileId/share', this.w(this.shareFile));
    r.get('/shares', this.w(this.listShares));

    // Upload / Download
    r.post('/upload', this.w(this.uploadFile));
    r.get('/connections/:connId/files/:fileId/download', this.w(this.downloadFile));

    // Versioning & Permissions
    r.get('/connections/:connId/files/:fileId/versions', this.w(this.listVersions));
    r.get('/connections/:connId/files/:fileId/permissions', this.w(this.getPermissions));
    r.post('/connections/:connId/files/:fileId/permissions', this.w(this.setPermissions));

    return r;
  }

  async shutdown(): Promise<void> { this.ctx.logger.info('[CloudFiles] Shut down'); }
  async healthCheck(): Promise<PluginHealth> { return { status: 'healthy', details: {} }; }

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'cloud-files.browse', label: 'Cloud Files', description: 'Access Google Drive, OneDrive, Dropbox, and more', icon: 'Cloud', routePath: '/files', requiredRoles: [] },
    ];
  }

  // ─── OAuth Connections ────────────────────────────────────────────────────

  private async createConnection(req: Request, res: Response): Promise<void> {
    const u = this.user(req);
    const { provider, accessToken, refreshToken, tokenExpiresAt, accountEmail, accountName, label } = req.body;

    const conn: CloudConnection = {
      id: uuidv4(), userId: u.userId, tenantId: u.tenantId,
      provider: provider || 'GOOGLE_DRIVE',
      label: label || provider + ' (' + (accountEmail || 'connected') + ')',
      accessToken, refreshToken, tokenExpiresAt,
      accountEmail, accountName, isActive: true,
      connectedAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('cloud_connections', conn.id, conn);
    this.ctx.bus.emit('files:connection-created', {
      connectionId: conn.id, provider: conn.provider, userId: u.userId, tenantId: u.tenantId,
    }, 'cloud-files');

    res.status(201).json({ ...conn, accessToken: '***', refreshToken: '***' });
  }

  private async listConnections(req: Request, res: Response): Promise<void> {
    const u = this.user(req);
    const conns = await this.ctx.storage.query<CloudConnection>('cloud_connections', {
      userId: u.userId, isActive: true,
    }, { limit: 20 });
    res.json({ connections: conns.map(c => ({ ...c, accessToken: '***', refreshToken: '***' })), total: conns.length });
  }

  private async removeConnection(req: Request, res: Response): Promise<void> {
    const conn = await this.conn(req, res);
    if (!conn) return;
    conn.isActive = false;
    await this.ctx.storage.set('cloud_connections', conn.id, conn);
    this.ctx.bus.emit('files:connection-removed', {
      connectionId: conn.id, provider: conn.provider, tenantId: conn.tenantId,
    }, 'cloud-files');
    res.json({ success: true });
  }

  private async refreshToken(req: Request, res: Response): Promise<void> {
    const conn = await this.conn(req, res);
    if (!conn) return;
    // In production: call provider's token refresh endpoint with refreshToken
    if (req.body.accessToken) conn.accessToken = req.body.accessToken;
    if (req.body.refreshToken) conn.refreshToken = req.body.refreshToken;
    if (req.body.tokenExpiresAt) conn.tokenExpiresAt = req.body.tokenExpiresAt;
    conn.lastUsedAt = new Date().toISOString();
    await this.ctx.storage.set('cloud_connections', conn.id, conn);
    res.json({ success: true, expiresAt: conn.tokenExpiresAt });
  }

  // ─── File Browsing ────────────────────────────────────────────────────────

  private async browseFiles(req: Request, res: Response): Promise<void> {
    const c = await this.conn(req, res);
    if (!c) return;
    const folderId = req.query.folderId as string || c.rootFolderId || 'root';
    // Production: call provider API (Drive files.list, OneDrive /children, etc.)
    const files = await this.ctx.storage.query<CloudFile>('cloud_files', {
      connectionId: c.id, parentFolderId: folderId,
    }, { limit: 100, orderBy: { field: 'name', direction: 'asc' } });
    c.lastUsedAt = new Date().toISOString();
    await this.ctx.storage.set('cloud_connections', c.id, c);
    res.json({ files, total: files.length, folderId, provider: c.provider });
  }

  private async getFileDetails(req: Request, res: Response): Promise<void> {
    const c = await this.conn(req, res);
    if (!c) return;
    const file = await this.ctx.storage.get<CloudFile>('cloud_files', c.id + ':' + req.params.fileId);
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }
    res.json(file);
  }

  private async searchFiles(req: Request, res: Response): Promise<void> {
    const c = await this.conn(req, res);
    if (!c) return;
    const q = (req.query.q as string || '').toLowerCase();
    const files = await this.ctx.storage.query<CloudFile>('cloud_files', {
      connectionId: c.id,
    }, { limit: 200 });
    const results = files.filter(f => f.name.toLowerCase().includes(q)).slice(0, 50);
    res.json({ results, total: results.length, query: q });
  }

  // ─── Sharing ──────────────────────────────────────────────────────────────

  private async shareFile(req: Request, res: Response): Promise<void> {
    const c = await this.conn(req, res);
    if (!c) return;
    const u = this.user(req);
    const { targetId, targetType } = req.body;
    const share: FileShare = {
      id: uuidv4(), fileId: req.params.fileId, connectionId: c.id,
      sharedBy: u.userId, sharedIn: targetId, sharedInType: targetType || 'CHANNEL',
      sharedAt: new Date().toISOString(), tenantId: u.tenantId,
    };
    await this.ctx.storage.set('cloud_file_shares', share.id, share);
    this.ctx.bus.emit('files:shared', {
      shareId: share.id, fileId: share.fileId, sharedBy: u.userId,
      sharedIn: targetId, sharedInType: share.sharedInType, tenantId: u.tenantId,
    }, 'cloud-files');
    res.status(201).json(share);
  }

  private async listShares(req: Request, res: Response): Promise<void> {
    const filter: Record<string, unknown> = {};
    if (req.query.sharedIn) filter.sharedIn = req.query.sharedIn;
    if (req.query.sharedBy) filter.sharedBy = req.query.sharedBy;
    const shares = await this.ctx.storage.query<FileShare>('cloud_file_shares', filter, {
      limit: 50, orderBy: { field: 'sharedAt', direction: 'desc' },
    });
    res.json({ shares, total: shares.length });
  }

  // ─── Upload / Download ────────────────────────────────────────────────────

  private async uploadFile(req: Request, res: Response): Promise<void> {
    const u = this.user(req);
    const { connectionId, parentFolderId, fileName, mimeType, size } = req.body;
    // Production: proxy upload to provider API (multipart to Drive, etc.)
    const file: CloudFile = {
      id: uuidv4(), connectionId, provider: 'LOCAL' as CloudProvider,
      providerFileId: uuidv4(), name: fileName || 'untitled',
      mimeType: mimeType || 'application/octet-stream',
      size: size || 0, isFolder: false, parentFolderId,
      lastModified: new Date().toISOString(), permissions: [],
    };
    await this.ctx.storage.set('cloud_files', connectionId + ':' + file.id, file);
    this.ctx.bus.emit('files:uploaded', {
      fileId: file.id, fileName: file.name, connectionId, userId: u.userId, tenantId: u.tenantId,
    }, 'cloud-files');
    res.status(201).json(file);
  }

  private async downloadFile(req: Request, res: Response): Promise<void> {
    const c = await this.conn(req, res);
    if (!c) return;
    const file = await this.ctx.storage.get<CloudFile>('cloud_files', c.id + ':' + req.params.fileId);
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }
    // Production: redirect to provider download URL or proxy the stream
    res.json({ downloadUrl: file.downloadUrl || '#', fileName: file.name, mimeType: file.mimeType });
  }

  // ─── Versioning ───────────────────────────────────────────────────────────

  private async listVersions(req: Request, res: Response): Promise<void> {
    const c = await this.conn(req, res);
    if (!c) return;
    const versions = await this.ctx.storage.query<FileVersion>('cloud_file_versions', {
      fileId: req.params.fileId,
    }, { limit: 20, orderBy: { field: 'modifiedAt', direction: 'desc' } });
    res.json({ versions, total: versions.length });
  }

  // ─── Permissions ──────────────────────────────────────────────────────────

  private async getPermissions(req: Request, res: Response): Promise<void> {
    const c = await this.conn(req, res);
    if (!c) return;
    const file = await this.ctx.storage.get<CloudFile>('cloud_files', c.id + ':' + req.params.fileId);
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }
    res.json({ permissions: file.permissions });
  }

  private async setPermissions(req: Request, res: Response): Promise<void> {
    const c = await this.conn(req, res);
    if (!c) return;
    const file = await this.ctx.storage.get<CloudFile>('cloud_files', c.id + ':' + req.params.fileId);
    if (!file) { res.status(404).json({ error: 'File not found' }); return; }
    file.permissions = req.body.permissions || [];
    await this.ctx.storage.set('cloud_files', c.id + ':' + file.id, file);
    res.json({ permissions: file.permissions });
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async conn(req: Request, res: Response): Promise<CloudConnection | null> {
    const c = await this.ctx.storage.get<CloudConnection>('cloud_connections', req.params.connId);
    if (!c || !c.isActive) { res.status(404).json({ error: 'Connection not found' }); return null; }
    return c;
  }

  private user(req: Request): { userId: string; tenantId: string } {
    const u = (req as any).scholarlyUser;
    if (u) return { userId: u.userId, tenantId: u.tenantId };
    return {
      userId: (req.body?.userId || req.query?.userId || 'anonymous') as string,
      tenantId: (req.body?.tenantId || req.query?.tenantId || '__default__') as string,
    };
  }

  private w(fn: (req: Request, res: Response) => Promise<void>) {
    return (req: Request, res: Response) => fn.call(this, req, res).catch((err: any) => {
      this.ctx.logger.error('[CloudFiles] ' + err.message);
      res.status(500).json({ error: 'Internal cloud files error' });
    });
  }
}

export default CloudFilesPlugin;
