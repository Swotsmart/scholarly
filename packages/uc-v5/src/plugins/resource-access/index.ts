/**
 * Unified Communications 4.0 — Resource Access Control Plugin
 *
 * Generalised time-bound, approval-gated access control. The first consumer
 * of the Approval Workflow engine, proving the generalised pattern works for
 * real-world use cases.
 *
 * The workflow: request → review → approve (per-slot) → generate codes →
 * validate code at entry → track session → audit everything.
 *
 * Think of it as an airport boarding system:
 *   - The traveller (requester) books a flight (access request) for specific
 *     dates/times (slots)
 *   - The airline (approver) confirms the booking
 *   - A boarding pass (access code) is generated with a gate number (resource)
 *     and a time window (valid from/until)
 *   - At the gate, the pass is scanned (code validation) — wrong gate, wrong
 *     time, or cancelled flight = denied
 *   - Once boarded, the manifest tracks who's on the plane (access session)
 *
 * The plugin doesn't know or care whether the resource is a classroom,
 * a meeting room, a document vault, or a piece of equipment. Resource types
 * are tenant-configured strings that drive UI treatment and validation rules.
 *
 * Integration points:
 *   - Approval Workflow: registers a workflow definition, creates requests
 *   - Video: creates/joins rooms when resource has a roomId
 *   - Chat: posts system messages on access events
 *   - Notifications: sends codes and status updates
 *
 * Event prefix: resource-access:*
 * REST endpoints: 14 under /api/resource-access/
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { UCPlugin, PluginContext, PluginHealth, PluginCapability } from '../../core/plugin-interface';
import type {
  ResourceDefinition, AccessRequest, AccessRequestStatus,
  RequestedSlot, SlotDecision, AccessCode, AccessSession,
} from './types';

// ─── Constants ──────────────────────────────────────────────────────────────

const CODE_PREFIX = 'RA';
const CODE_LENGTH = 4;
const DEFAULT_BUFFER_MINUTES = 5;
const MAX_FAILED_ATTEMPTS = 5;
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 0, 1 (ambiguity)

// ─── Plugin ─────────────────────────────────────────────────────────────────

export class ResourceAccessPlugin implements UCPlugin {
  readonly id = 'resource-access';
  readonly name = 'Resource Access Control';
  readonly version = '4.0.0';
  readonly dependencies = ['approval-workflow'];

  private ctx!: PluginContext;

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;

    // Listen for approval workflow decisions to auto-generate access codes
    ctx.bus.on('approval:request-approved', async (data: any) => {
      if (data.workflowId?.startsWith('RESOURCE_ACCESS_')) {
        await this.handleApprovalCompleted(data.requestId, true);
      }
    });

    ctx.bus.on('approval:request-rejected', async (data: any) => {
      if (data.workflowId?.startsWith('RESOURCE_ACCESS_')) {
        await this.handleApprovalCompleted(data.requestId, false);
      }
    });

    ctx.logger.info('[ResourceAccess] Initialised — resources, access codes, session tracking');
  }

  getRoutes(): Router {
    const r = Router();

    // Resource definitions
    r.post('/resources', this.w(this.createResource));
    r.get('/resources', this.w(this.listResources));
    r.get('/resources/:resourceId', this.w(this.getResource));
    r.put('/resources/:resourceId', this.w(this.updateResource));

    // Access requests
    r.post('/requests', this.w(this.createAccessRequest));
    r.get('/requests', this.w(this.listAccessRequests));
    r.get('/requests/:requestId', this.w(this.getAccessRequest));
    r.post('/requests/:requestId/decide', this.w(this.decideSlots));
    r.post('/requests/:requestId/cancel', this.w(this.cancelRequest));
    r.post('/requests/:requestId/revoke', this.w(this.revokeAccess));

    // Code validation & session
    r.post('/validate', this.w(this.validateCode));
    r.post('/sessions/:sessionId/leave', this.w(this.leaveSession));

    // Dashboard
    r.get('/resources/:resourceId/active-sessions', this.w(this.getActiveSessions));
    r.get('/resources/:resourceId/schedule-view', this.w(this.getScheduleView));

    return r;
  }

  async shutdown(): Promise<void> { this.ctx.logger.info('[ResourceAccess] Shut down'); }

  async healthCheck(): Promise<PluginHealth> {
    return { status: 'healthy', details: {} };
  }

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'resource-access.manage', label: 'Resource Access', description: 'Manage time-bound access to resources', icon: 'Key', routePath: '/resource-access', requiredRoles: ['admin', 'teacher', 'manager'] },
      { key: 'resource-access.request', label: 'Request Access', description: 'Request access to resources', icon: 'Lock', routePath: '/resource-access/request', requiredRoles: [] },
    ];
  }

  // ─── Resource Definitions ─────────────────────────────────────────────────

  private async createResource(req: Request, res: Response): Promise<void> {
    const u = this.user(req);
    const { name, description, resourceType, schedule, maxConcurrent,
            requiresApproval, approvalWorkflowId, roomId, channelId, metadata } = req.body;

    const resource: ResourceDefinition = {
      id: uuidv4(), tenantId: u.tenantId,
      resourceType: resourceType || 'GENERAL',
      name: name || 'Unnamed Resource', description,
      ownerId: u.userId, ownerName: req.body.ownerName || 'Unknown',
      roomId, channelId, schedule: schedule || [],
      maxConcurrent: maxConcurrent || 1,
      requiresApproval: requiresApproval !== false,
      approvalWorkflowId, isActive: true, metadata,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('ra_resources', resource.id, resource);
    res.status(201).json(resource);
  }

  private async listResources(req: Request, res: Response): Promise<void> {
    const filter: Record<string, unknown> = { isActive: true };
    if (req.query.resourceType) filter.resourceType = req.query.resourceType;
    const resources = await this.ctx.storage.query<ResourceDefinition>('ra_resources', filter, {
      limit: 100, orderBy: { field: 'name', direction: 'asc' },
    });
    res.json({ resources, total: resources.length });
  }

  private async getResource(req: Request, res: Response): Promise<void> {
    const r = await this.ctx.storage.get<ResourceDefinition>('ra_resources', req.params.resourceId);
    if (!r) { res.status(404).json({ error: 'Resource not found' }); return; }
    res.json(r);
  }

  private async updateResource(req: Request, res: Response): Promise<void> {
    const r = await this.ctx.storage.get<ResourceDefinition>('ra_resources', req.params.resourceId);
    if (!r) { res.status(404).json({ error: 'Resource not found' }); return; }
    const fields = ['name', 'description', 'schedule', 'maxConcurrent', 'requiresApproval',
                    'approvalWorkflowId', 'roomId', 'channelId', 'metadata', 'isActive'];
    for (const f of fields) {
      if (req.body[f] !== undefined) (r as any)[f] = req.body[f];
    }
    r.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('ra_resources', r.id, r);
    res.json(r);
  }

  // ─── Access Requests ──────────────────────────────────────────────────────

  private async createAccessRequest(req: Request, res: Response): Promise<void> {
    const u = this.user(req);
    const { resourceId, beneficiaryId, beneficiaryName, slots, reason,
            reasonCategory, attachmentUrls } = req.body;

    const resource = await this.ctx.storage.get<ResourceDefinition>('ra_resources', resourceId);
    if (!resource) { res.status(404).json({ error: 'Resource not found' }); return; }

    const requestedSlots: RequestedSlot[] = (slots || []).map((s: any) => ({
      id: uuidv4(), date: s.date, startTime: s.startTime, endTime: s.endTime,
      label: s.label, metadata: s.metadata,
    }));

    const accessReq: AccessRequest = {
      id: uuidv4(), tenantId: u.tenantId,
      resourceId, resourceName: resource.name,
      requesterId: u.userId, requesterName: req.body.requesterName || 'Unknown',
      beneficiaryId: beneficiaryId || u.userId,
      beneficiaryName: beneficiaryName || req.body.requesterName || 'Unknown',
      requestedSlots, reason: reason || '',
      reasonCategory, attachmentUrls,
      status: resource.requiresApproval ? 'SUBMITTED' : 'APPROVED',
      slotDecisions: [], accessCodes: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    await this.ctx.storage.set('ra_requests', accessReq.id, accessReq);

    this.ctx.bus.emit('resource-access:requested', {
      requestId: accessReq.id, resourceId, requesterId: u.userId,
      beneficiaryId: accessReq.beneficiaryId,
      slotCount: requestedSlots.length, tenantId: u.tenantId,
    }, 'resource-access');

    // If no approval required, auto-generate codes immediately
    if (!resource.requiresApproval) {
      // Auto-approve all slots
      accessReq.slotDecisions = requestedSlots.map(s => ({
        slotId: s.id, approved: true, decidedBy: 'system', decidedAt: new Date().toISOString(),
      }));
      await this.generateAccessCodes(accessReq);
      accessReq.status = 'ACTIVE';
      await this.ctx.storage.set('ra_requests', accessReq.id, accessReq);
    }

    // If approval required, create approval workflow request
    if (resource.requiresApproval && resource.approvalWorkflowId) {
      // Integration: post to approval workflow plugin via event
      this.ctx.bus.emit('approval:request-submitted', {
        requestId: accessReq.id,
        workflowId: resource.approvalWorkflowId,
        requesterId: u.userId,
        requesterName: accessReq.requesterName,
        tenantId: u.tenantId,
        priority: 'normal',
      }, 'resource-access');
    }

    res.status(201).json(accessReq);
  }

  private async listAccessRequests(req: Request, res: Response): Promise<void> {
    const filter: Record<string, unknown> = {};
    if (req.query.resourceId) filter.resourceId = req.query.resourceId;
    if (req.query.requesterId) filter.requesterId = req.query.requesterId;
    if (req.query.beneficiaryId) filter.beneficiaryId = req.query.beneficiaryId;
    if (req.query.status) filter.status = req.query.status;

    const requests = await this.ctx.storage.query<AccessRequest>('ra_requests', filter, {
      limit: 50, orderBy: { field: 'createdAt', direction: 'desc' },
    });
    res.json({ requests, total: requests.length });
  }

  private async getAccessRequest(req: Request, res: Response): Promise<void> {
    const r = await this.ctx.storage.get<AccessRequest>('ra_requests', req.params.requestId);
    if (!r) { res.status(404).json({ error: 'Request not found' }); return; }
    res.json(r);
  }

  private async decideSlots(req: Request, res: Response): Promise<void> {
    const accessReq = await this.ctx.storage.get<AccessRequest>('ra_requests', req.params.requestId);
    if (!accessReq) { res.status(404).json({ error: 'Request not found' }); return; }

    const u = this.user(req);
    const { decisions } = req.body;
    // decisions: [{ slotId: string, approved: boolean, reason?: string }]

    let approvedCount = 0;
    let rejectedCount = 0;

    for (const d of (decisions || [])) {
      accessReq.slotDecisions.push({
        slotId: d.slotId, approved: d.approved,
        decidedBy: u.userId, reason: d.reason,
        decidedAt: new Date().toISOString(),
      });
      if (d.approved) approvedCount++; else rejectedCount++;
    }

    // Determine overall status
    const totalSlots = accessReq.requestedSlots.length;
    const totalDecided = accessReq.slotDecisions.length;

    if (totalDecided >= totalSlots) {
      if (approvedCount === 0) {
        accessReq.status = 'REJECTED';
      } else if (rejectedCount === 0) {
        accessReq.status = 'APPROVED';
      } else {
        accessReq.status = 'PARTIALLY_APPROVED';
      }

      // Generate codes for approved slots
      if (approvedCount > 0) {
        await this.generateAccessCodes(accessReq);
        accessReq.status = approvedCount === totalSlots ? 'ACTIVE' : 'PARTIALLY_APPROVED';
      }
    } else {
      accessReq.status = 'UNDER_REVIEW';
    }

    accessReq.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('ra_requests', accessReq.id, accessReq);

    this.ctx.bus.emit('resource-access:decided', {
      requestId: accessReq.id, resourceId: accessReq.resourceId,
      approvedSlots: approvedCount, rejectedSlots: rejectedCount,
      accessCodeCount: accessReq.accessCodes.length, tenantId: accessReq.tenantId,
    }, 'resource-access');

    res.json(accessReq);
  }

  private async cancelRequest(req: Request, res: Response): Promise<void> {
    const accessReq = await this.ctx.storage.get<AccessRequest>('ra_requests', req.params.requestId);
    if (!accessReq) { res.status(404).json({ error: 'Request not found' }); return; }

    accessReq.status = 'CANCELLED';
    // Revoke any generated codes
    for (const code of accessReq.accessCodes) {
      code.isRevoked = true;
      code.revokedAt = new Date().toISOString();
      code.revokedBy = this.user(req).userId;
      code.revokedReason = 'Request cancelled';
    }
    accessReq.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('ra_requests', accessReq.id, accessReq);

    this.ctx.bus.emit('resource-access:cancelled', {
      requestId: accessReq.id, resourceId: accessReq.resourceId,
      tenantId: accessReq.tenantId,
    }, 'resource-access');

    res.json({ success: true });
  }

  private async revokeAccess(req: Request, res: Response): Promise<void> {
    const accessReq = await this.ctx.storage.get<AccessRequest>('ra_requests', req.params.requestId);
    if (!accessReq) { res.status(404).json({ error: 'Request not found' }); return; }

    const u = this.user(req);
    let revokedCount = 0;

    for (const code of accessReq.accessCodes) {
      if (!code.isRevoked) {
        code.isRevoked = true;
        code.revokedAt = new Date().toISOString();
        code.revokedBy = u.userId;
        code.revokedReason = req.body.reason || 'Access revoked';
        revokedCount++;
      }
    }

    accessReq.status = 'REVOKED';
    accessReq.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('ra_requests', accessReq.id, accessReq);

    this.ctx.bus.emit('resource-access:revoked', {
      requestId: accessReq.id, resourceId: accessReq.resourceId,
      revokedBy: u.userId, codesRevoked: revokedCount, tenantId: accessReq.tenantId,
    }, 'resource-access');

    res.json({ success: true, codesRevoked: revokedCount });
  }

  // ─── Code Validation & Session ────────────────────────────────────────────

  private async validateCode(req: Request, res: Response): Promise<void> {
    const { code, resourceId, userId } = req.body;
    const now = new Date();

    // Find the access code
    const requests = await this.ctx.storage.query<AccessRequest>('ra_requests', {
      resourceId,
    }, { limit: 200 });

    let foundCode: AccessCode | null = null;
    let foundRequest: AccessRequest | null = null;

    for (const r of requests) {
      const c = r.accessCodes.find(ac => ac.code === code);
      if (c) { foundCode = c; foundRequest = r; break; }
    }

    if (!foundCode || !foundRequest) {
      res.status(404).json({ valid: false, reason: 'Invalid access code' }); return;
    }

    // Check locked (brute-force protection)
    if (foundCode.isLocked) {
      res.status(403).json({ valid: false, reason: 'Code locked due to too many failed attempts' }); return;
    }

    // Check revoked
    if (foundCode.isRevoked) {
      res.status(403).json({ valid: false, reason: 'Access has been revoked' }); return;
    }

    // Check beneficiary
    if (userId && foundCode.beneficiaryId !== userId) {
      foundCode.failedAttempts++;
      if (foundCode.failedAttempts >= MAX_FAILED_ATTEMPTS) foundCode.isLocked = true;
      await this.ctx.storage.set('ra_requests', foundRequest.id, foundRequest);
      res.status(403).json({ valid: false, reason: 'Code not assigned to this user' }); return;
    }

    // Check time window
    const validFrom = new Date(foundCode.validFrom);
    const validUntil = new Date(foundCode.validUntil);

    if (now < validFrom) {
      const minsUntil = Math.ceil((validFrom.getTime() - now.getTime()) / 60000);
      res.status(400).json({ valid: false, reason: 'Code not yet valid', minutesUntilValid: minsUntil }); return;
    }

    if (now > validUntil) {
      res.status(400).json({ valid: false, reason: 'Code has expired' }); return;
    }

    // Valid! Mark as used and create session
    foundCode.isUsed = true;
    foundCode.usedAt = now.toISOString();
    await this.ctx.storage.set('ra_requests', foundRequest.id, foundRequest);

    const session: AccessSession = {
      id: uuidv4(), accessCodeId: foundCode.id,
      accessRequestId: foundRequest.id,
      resourceId: foundCode.resourceId,
      beneficiaryId: foundCode.beneficiaryId,
      joinedAt: now.toISOString(), reconnectCount: 0,
      tenantId: foundRequest.tenantId,
    };

    await this.ctx.storage.set('ra_sessions', session.id, session);

    this.ctx.bus.emit('resource-access:code-validated', {
      codeId: foundCode.id, resourceId, beneficiaryId: foundCode.beneficiaryId,
      isValid: true, tenantId: foundRequest.tenantId,
    }, 'resource-access');

    this.ctx.bus.emit('resource-access:session-started', {
      sessionId: session.id, resourceId, beneficiaryId: foundCode.beneficiaryId,
      action: 'joined', tenantId: foundRequest.tenantId,
    }, 'resource-access');

    // Return resource connection info
    const resource = await this.ctx.storage.get<ResourceDefinition>('ra_resources', resourceId);

    res.json({
      valid: true,
      sessionId: session.id,
      resourceName: resource?.name,
      roomId: resource?.roomId,
      channelId: resource?.channelId,
      validUntil: foundCode.validUntil,
    });
  }

  private async leaveSession(req: Request, res: Response): Promise<void> {
    const session = await this.ctx.storage.get<AccessSession>('ra_sessions', req.params.sessionId);
    if (!session) { res.status(404).json({ error: 'Session not found' }); return; }

    session.leftAt = new Date().toISOString();
    session.durationSeconds = Math.floor(
      (new Date(session.leftAt).getTime() - new Date(session.joinedAt).getTime()) / 1000
    );
    await this.ctx.storage.set('ra_sessions', session.id, session);

    this.ctx.bus.emit('resource-access:session-ended', {
      sessionId: session.id, resourceId: session.resourceId,
      beneficiaryId: session.beneficiaryId, action: 'left',
      durationSeconds: session.durationSeconds, tenantId: session.tenantId,
    }, 'resource-access');

    res.json({ success: true, durationSeconds: session.durationSeconds });
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  private async getActiveSessions(req: Request, res: Response): Promise<void> {
    const sessions = await this.ctx.storage.query<AccessSession>('ra_sessions', {
      resourceId: req.params.resourceId,
    }, { limit: 100, orderBy: { field: 'joinedAt', direction: 'desc' } });

    const active = sessions.filter(s => !s.leftAt);
    res.json({ activeSessions: active, total: active.length });
  }

  private async getScheduleView(req: Request, res: Response): Promise<void> {
    const resource = await this.ctx.storage.get<ResourceDefinition>('ra_resources', req.params.resourceId);
    if (!resource) { res.status(404).json({ error: 'Resource not found' }); return; }

    // Get all active/approved requests for this resource
    const requests = await this.ctx.storage.query<AccessRequest>('ra_requests', {
      resourceId: req.params.resourceId,
    }, { limit: 200 });

    const activeRequests = requests.filter(r =>
      ['ACTIVE', 'APPROVED', 'PARTIALLY_APPROVED'].includes(r.status)
    );

    // Build schedule view: for each slot, show who has access
    const slots = activeRequests.flatMap(r =>
      r.accessCodes
        .filter(c => !c.isRevoked)
        .map(c => ({
          date: new Date(c.validFrom).toISOString().split('T')[0],
          validFrom: c.validFrom,
          validUntil: c.validUntil,
          beneficiaryId: c.beneficiaryId,
          requestId: r.id,
          code: c.code,
          isUsed: c.isUsed,
          status: c.isRevoked ? 'revoked' : c.isUsed ? 'used' : 'ready',
        }))
    );

    res.json({
      resource: { id: resource.id, name: resource.name, schedule: resource.schedule },
      accessSlots: slots,
      total: slots.length,
    });
  }

  // ─── Internal: Code Generation ────────────────────────────────────────────

  private async generateAccessCodes(accessReq: AccessRequest): Promise<void> {
    const approvedSlotIds = new Set(
      accessReq.slotDecisions.filter(d => d.approved).map(d => d.slotId)
    );

    for (const slot of accessReq.requestedSlots) {
      if (!approvedSlotIds.has(slot.id)) continue;

      // Calculate time window with buffer
      const dateStr = slot.date;
      const validFrom = new Date(dateStr + 'T' + slot.startTime + ':00');
      validFrom.setMinutes(validFrom.getMinutes() - DEFAULT_BUFFER_MINUTES);
      const validUntil = new Date(dateStr + 'T' + slot.endTime + ':00');
      validUntil.setMinutes(validUntil.getMinutes() + DEFAULT_BUFFER_MINUTES);

      const code: AccessCode = {
        id: uuidv4(),
        code: this.generateCode(),
        accessRequestId: accessReq.id,
        resourceId: accessReq.resourceId,
        beneficiaryId: accessReq.beneficiaryId,
        validFrom: validFrom.toISOString(),
        validUntil: validUntil.toISOString(),
        bufferMinutes: DEFAULT_BUFFER_MINUTES,
        isUsed: false, isRevoked: false,
        failedAttempts: 0, isLocked: false,
        tenantId: accessReq.tenantId,
        createdAt: new Date().toISOString(),
      };

      accessReq.accessCodes.push(code);
    }
  }

  private generateCode(): string {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CHARS.charAt(Math.floor(Math.random() * CHARS.length));
    }
    return CODE_PREFIX + '-' + code;
  }

  // ─── Internal: Approval Integration ───────────────────────────────────────

  private async handleApprovalCompleted(approvalRequestId: string, approved: boolean): Promise<void> {
    // Find access request linked to this approval
    const requests = await this.ctx.storage.query<AccessRequest>('ra_requests', {
      approvalRequestId,
    }, { limit: 1 });

    if (requests.length === 0) return;
    const accessReq = requests[0];

    if (approved) {
      // Auto-approve all slots
      for (const slot of accessReq.requestedSlots) {
        if (!accessReq.slotDecisions.some(d => d.slotId === slot.id)) {
          accessReq.slotDecisions.push({
            slotId: slot.id, approved: true,
            decidedBy: 'approval-workflow', decidedAt: new Date().toISOString(),
          });
        }
      }
      await this.generateAccessCodes(accessReq);
      accessReq.status = 'ACTIVE';
    } else {
      accessReq.status = 'REJECTED';
    }

    accessReq.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('ra_requests', accessReq.id, accessReq);
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

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
      this.ctx.logger.error('[ResourceAccess] ' + err.message);
      res.status(500).json({ error: 'Internal resource access error' });
    });
  }
}

export default ResourceAccessPlugin;
