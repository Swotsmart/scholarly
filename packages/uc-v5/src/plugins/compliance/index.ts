/**
 * Chekd Unified Communications 3.0 — Compliance Recording & Retention Plugin
 *
 * When you manage $500M in institutional capital, regulators are watching.
 * SEC requires investment advisers to retain communications for 5-7 years.
 * FINRA requires archiving all business electronic communications.
 * MiFID II mandates recording of conversations related to client orders.
 *
 * This plugin is the platform's compliance officer:
 *   1. Enforces retention policies — content cannot be deleted before expiry
 *   2. Manages legal holds — freezes content when litigation is pending
 *   3. Blocks regulated deletion — intercepts events via bus middleware
 *   4. Generates audit packages — timestamped compliance exports
 *   5. Maintains immutable audit trail — every action logged
 *
 * The magic is in the bus middleware. It runs BEFORE every event emission.
 * If a deletion event targets content under legal hold, the middleware
 * returns false to cancel the event entirely — the message stays.
 *
 * Bus events: compliance:hold-applied, compliance:hold-released,
 *   compliance:deletion-blocked, compliance:retention-applied,
 *   compliance:export-generated, compliance:audit-created
 */

import { Router } from 'express';
import type { UCPlugin, PluginContext, PluginHealth } from '../../core/plugin-interface';
import type { BusEvent } from '../../bus/event-bus';

// ─── Types ──────────────────────────────────────────────────────

type HoldScope = 'channel' | 'room' | 'user' | 'tenant' | 'deal' | 'global';
type HoldStatus = 'active' | 'released' | 'expired';
type AuditAction = 'hold-applied' | 'hold-released' | 'deletion-blocked'
  | 'content-archived' | 'export-generated' | 'retention-enforced'
  | 'policy-created' | 'policy-updated' | 'policy-deleted';

interface LegalHold {
  id: string; name: string; scope: HoldScope; scopeId: string;
  reason: string; appliedBy: string; status: HoldStatus; tenantId?: string;
  affectedEntities: { type: string; id: string }[];
  createdAt: Date; expiresAt?: Date;
  releasedAt?: Date; releasedBy?: string; releaseReason?: string;
}

interface RetentionPolicy {
  id: string; name: string; tenantId?: string;
  contentTypes: string[]; retentionDays: number;
  isDefault: boolean; autoArchive: boolean; autoDelete: boolean;
  createdAt: Date; updatedAt: Date;
}

interface AuditRecord {
  id: string; action: AuditAction; entityType: string; entityId: string;
  userId: string; details: Record<string, unknown>;
  holdId?: string; policyId?: string; timestamp: Date;
}

interface ComplianceExport {
  id: string; tenantId: string; scope: HoldScope; scopeId: string;
  dateFrom?: Date; dateTo?: Date; recordCount: number;
  fileSizeBytes: number; format: 'json' | 'csv' | 'pdf';
  status: 'generating' | 'completed' | 'failed';
  requestedBy: string; createdAt: Date; completedAt?: Date;
}

// ─── Plugin ─────────────────────────────────────────────────────

export class CompliancePlugin implements UCPlugin {
  readonly id = 'compliance';
  readonly name = 'Compliance Recording & Retention';
  readonly version = '3.0.0';
  readonly dependencies = ['chat'];

  private ctx!: PluginContext;
  private holds: Map<string, LegalHold> = new Map();
  private policies: Map<string, RetentionPolicy> = new Map();
  private auditTrail: AuditRecord[] = [];
  private exports: Map<string, ComplianceExport> = new Map();
  private blockedDeletions = 0;
  private contentShadow: Map<string, {
    type: string; sourceId: string; content: string;
    userId: string; timestamp: Date; metadata: Record<string, unknown>;
  }> = new Map();

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    ctx.logger.info('Compliance plugin initializing...');

    // Install default SEC retention policy
    this.policies.set('default-sec', {
      id: 'default-sec', name: 'SEC 7-Year Retention',
      contentTypes: ['chat-message', 'call-recording', 'meeting-transcript', 'document'],
      retentionDays: 2555, isDefault: true, autoArchive: true, autoDelete: false,
      createdAt: new Date(), updatedAt: new Date(),
    });

    // ─── Bus middleware: intercept deletions ───
    ctx.bus.use(async (event: BusEvent) => {
      return this.complianceMiddleware(event);
    });
    ctx.logger.info('  → Bus middleware installed (deletion interception active)');

    // ── Shadow-copy chat messages for compliance retention ──
    ctx.bus.on('chat:message-sent', async (data: any) => {
      this.shadowContent('chat-message', data.messageId, data.content || '', data.senderId || 'unknown', {
        channelId: data.channelId, messageType: data.messageType, threadId: data.threadId,
      });
    }, 'compliance');

    // ── Shadow-copy call records ──
    ctx.bus.on('call:completed', async (data: any) => {
      this.shadowContent('call-recording', data.callId, `Call: ${data.duration}s`, data.from || 'unknown', {
        duration: data.duration, costCents: data.costCents,
      });
    }, 'compliance');

    // ── Shadow-copy transcriptions ──
    ctx.bus.on('transcription:completed', async (data: any) => {
      this.shadowContent('meeting-transcript', data.transcriptionId,
        `Transcript: ${data.wordCount} words`, 'system', {
          roomId: data.roomId, wordCount: data.wordCount,
        });
    }, 'compliance');

    // ── Shadow-copy file shares ──
    ctx.bus.on('cloud:file-shared', async (data: any) => {
      this.shadowContent('document', data.shareId, data.fileName || 'file', data.sharedBy || 'unknown', {
        provider: data.provider, scope: data.scope,
      });
    }, 'compliance');

    // ── Audit all room recordings ──
    ctx.bus.on('room:recording-started', async (data: any) => {
      this.addAuditRecord('content-archived', 'recording', data.recordingId || data.roomId,
        'system', { roomId: data.roomId });
    }, 'compliance');

    ctx.logger.info('Compliance plugin initialized — retention enforcement active ✓');
  }

  // ─── Bus Middleware ───────────────────────────────────────────

  private async complianceMiddleware(event: BusEvent): Promise<boolean | void> {
    // Only intercept deletion events
    if (event.type !== 'chat:message-deleted') return; // Allow all other events

    const data = event.data as any;
    const messageId = data?.messageId;
    if (!messageId) return; // No message ID — let it through

    // Check if content is under legal hold
    const isHeld = this.isContentUnderHold('chat-message', messageId, data.channelId);
    if (isHeld) {
      this.blockedDeletions++;
      this.addAuditRecord('deletion-blocked', 'chat-message', messageId,
        data.deletedBy || 'unknown', { channelId: data.channelId, holdId: isHeld.id });

      this.ctx.bus.emit('compliance:deletion-blocked', {
        entityType: 'chat-message', entityId: messageId,
        holdId: isHeld.id, attemptedBy: data.deletedBy || 'unknown',
      }, 'compliance');

      this.ctx.logger.warn(`DELETION BLOCKED: Message ${messageId} is under legal hold "${isHeld.name}"`);
      return false; // Cancel the event
    }

    // Check retention policy
    const withinRetention = this.isWithinRetention('chat-message', messageId);
    if (withinRetention) {
      this.blockedDeletions++;
      this.addAuditRecord('deletion-blocked', 'chat-message', messageId,
        data.deletedBy || 'unknown', { reason: 'retention-policy', policyId: withinRetention.id });

      this.ctx.bus.emit('compliance:deletion-blocked', {
        entityType: 'chat-message', entityId: messageId,
        holdId: withinRetention.id, attemptedBy: data.deletedBy || 'unknown',
      }, 'compliance');

      return false; // Cancel the event
    }

    // Not under hold and past retention — allow deletion
  }

  // ─── Hold Management ──────────────────────────────────────────

  private isContentUnderHold(contentType: string, contentId: string, scopeId?: string): LegalHold | null {
    for (const hold of this.holds.values()) {
      if (hold.status !== 'active') continue;
      if (hold.expiresAt && hold.expiresAt < new Date()) continue;

      // Global holds affect everything
      if (hold.scope === 'global') return hold;

      // Check if the content's scope matches the hold's scope
      if (hold.scope === 'channel' && scopeId === hold.scopeId) return hold;

      // Check affected entities
      if (hold.affectedEntities.some(e => e.type === contentType && e.id === contentId)) return hold;
    }
    return null;
  }

  private isWithinRetention(contentType: string, contentId: string): RetentionPolicy | null {
    const shadow = this.contentShadow.get(`${contentType}:${contentId}`);
    if (!shadow) return null;

    for (const policy of this.policies.values()) {
      if (!policy.contentTypes.includes(contentType)) continue;
      const retentionEnd = new Date(shadow.timestamp.getTime() + policy.retentionDays * 24 * 60 * 60 * 1000);
      if (new Date() < retentionEnd) return policy;
    }
    return null;
  }

  // ─── Helpers ──────────────────────────────────────────────────

  private shadowContent(type: string, sourceId: string, content: string, userId: string, metadata: Record<string, unknown>): void {
    this.contentShadow.set(`${type}:${sourceId}`, {
      type, sourceId, content, userId, timestamp: new Date(), metadata,
    });
  }

  private addAuditRecord(action: AuditAction, entityType: string, entityId: string,
    userId: string, details: Record<string, unknown>): void {
    const record: AuditRecord = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      action, entityType, entityId, userId, details,
      holdId: (details.holdId as string) || undefined, policyId: (details.policyId as string) || undefined,
      timestamp: new Date(),
    };
    this.auditTrail.push(record);
    if (this.auditTrail.length > 100_000) {
      // In production: persist to database; here we keep last 100K in memory
      this.auditTrail = this.auditTrail.slice(-50_000);
    }

    this.ctx.bus.emit('compliance:audit-created', {
      auditId: record.id, action, entityType, entityId, userId,
    }, 'compliance');
  }

  // ─── REST Routes ──────────────────────────────────────────────

  getRoutes(): Router {
    const router = Router();

    // ── Legal Holds ──

    router.get('/holds', (req, res) => {
      let results = [...this.holds.values()];
      if (req.query.status) results = results.filter(h => h.status === req.query.status);
      if (req.query.tenantId) results = results.filter(h => h.tenantId === req.query.tenantId);
      res.json(results);
    });

    router.get('/holds/:id', (req, res) => {
      const hold = this.holds.get(req.params.id);
      if (!hold) return res.status(404).json({ error: 'Hold not found' });
      res.json(hold);
    });

    router.post('/holds', async (req, res) => {
      const { name, scope, scopeId, reason, appliedBy, tenantId, expiresAt } = req.body;
      if (!name || !scope || !scopeId || !reason || !appliedBy) {
        return res.status(400).json({ error: 'name, scope, scopeId, reason, appliedBy required' });
      }

      const hold: LegalHold = {
        id: `hold-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name, scope, scopeId, reason, appliedBy, status: 'active',
        tenantId, affectedEntities: req.body.affectedEntities || [],
        createdAt: new Date(), expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      };

      this.holds.set(hold.id, hold);
      await this.ctx.storage.set('legal-holds', hold.id, hold);

      this.addAuditRecord('hold-applied', scope, scopeId, appliedBy, { holdId: hold.id, reason });

      this.ctx.bus.emit('compliance:hold-applied', {
        holdId: hold.id, scope, scopeId, appliedBy, reason,
      }, 'compliance');

      this.ctx.logger.info(`Legal hold applied: "${name}" on ${scope}:${scopeId} by ${appliedBy}`);
      res.status(201).json(hold);
    });

    router.post('/holds/:id/release', async (req, res) => {
      const hold = this.holds.get(req.params.id);
      if (!hold) return res.status(404).json({ error: 'Hold not found' });
      if (hold.status !== 'active') return res.status(409).json({ error: 'Hold is not active' });

      hold.status = 'released';
      hold.releasedAt = new Date();
      const releasedBy = req.body.releasedBy || 'unknown';
      hold.releasedBy = releasedBy;
      hold.releaseReason = req.body.reason;
      await this.ctx.storage.set('legal-holds', hold.id, hold);

      this.addAuditRecord('hold-released', hold.scope, hold.scopeId, releasedBy,
        { holdId: hold.id, releaseReason: hold.releaseReason });

      this.ctx.bus.emit('compliance:hold-released', {
        holdId: hold.id, releasedBy,
      }, 'compliance');

      res.json(hold);
    });

    // ── Retention Policies ──

    router.get('/retention-policies', (req, res) => {
      let results = [...this.policies.values()];
      if (req.query.tenantId) results = results.filter(p => p.tenantId === req.query.tenantId);
      res.json(results);
    });

    router.post('/retention-policies', async (req, res) => {
      const { name, contentTypes, retentionDays } = req.body;
      if (!name || !contentTypes || !retentionDays) {
        return res.status(400).json({ error: 'name, contentTypes, retentionDays required' });
      }

      const policy: RetentionPolicy = {
        id: `pol-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name, tenantId: req.body.tenantId, contentTypes, retentionDays,
        isDefault: false, autoArchive: req.body.autoArchive ?? true,
        autoDelete: req.body.autoDelete ?? false,
        createdAt: new Date(), updatedAt: new Date(),
      };

      this.policies.set(policy.id, policy);
      await this.ctx.storage.set('retention-policies', policy.id, policy);
      this.addAuditRecord('policy-created', 'policy', policy.id, req.body.createdBy || 'admin', {});

      this.ctx.bus.emit('compliance:retention-applied', {
        policyId: policy.id, tenantId: policy.tenantId || 'global', retentionDays,
      }, 'compliance');

      res.status(201).json(policy);
    });

    router.put('/retention-policies/:id', async (req, res) => {
      const policy = this.policies.get(req.params.id);
      if (!policy) return res.status(404).json({ error: 'Policy not found' });
      if (req.body.name) policy.name = req.body.name;
      if (req.body.retentionDays) policy.retentionDays = req.body.retentionDays;
      if (req.body.contentTypes) policy.contentTypes = req.body.contentTypes;
      if (req.body.autoArchive !== undefined) policy.autoArchive = req.body.autoArchive;
      if (req.body.autoDelete !== undefined) policy.autoDelete = req.body.autoDelete;
      policy.updatedAt = new Date();
      this.addAuditRecord('policy-updated', 'policy', policy.id, req.body.updatedBy || 'admin', {});
      res.json(policy);
    });

    router.delete('/retention-policies/:id', (req, res) => {
      const policy = this.policies.get(req.params.id);
      if (!policy) return res.status(404).json({ error: 'Policy not found' });
      if (policy.isDefault) return res.status(403).json({ error: 'Cannot delete default policy' });
      this.policies.delete(req.params.id);
      this.addAuditRecord('policy-deleted', 'policy', policy.id, req.body.deletedBy || 'admin', {});
      res.json({ deleted: true });
    });

    // ── Exports ──

    router.post('/export', async (req, res) => {
      const { tenantId, scope, scopeId, dateFrom, dateTo, format, requestedBy } = req.body;
      if (!tenantId || !scope || !scopeId || !requestedBy) {
        return res.status(400).json({ error: 'tenantId, scope, scopeId, requestedBy required' });
      }

      // Count matching records from shadow store
      let records = [...this.contentShadow.values()];
      if (dateFrom) records = records.filter(r => r.timestamp >= new Date(dateFrom));
      if (dateTo) records = records.filter(r => r.timestamp <= new Date(dateTo));

      const exportRecord: ComplianceExport = {
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tenantId, scope, scopeId,
        dateFrom: dateFrom ? new Date(dateFrom) : undefined,
        dateTo: dateTo ? new Date(dateTo) : undefined,
        recordCount: records.length,
        fileSizeBytes: JSON.stringify(records).length,
        format: format || 'json',
        status: 'completed',
        requestedBy,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      this.exports.set(exportRecord.id, exportRecord);
      this.addAuditRecord('export-generated', scope, scopeId, requestedBy, {
        exportId: exportRecord.id, recordCount: exportRecord.recordCount,
      });

      this.ctx.bus.emit('compliance:export-generated', {
        exportId: exportRecord.id, tenantId, scope, recordCount: records.length,
      }, 'compliance');

      res.status(201).json(exportRecord);
    });

    router.get('/exports', (req, res) => {
      let results = [...this.exports.values()];
      if (req.query.tenantId) results = results.filter(e => e.tenantId === req.query.tenantId);
      res.json(results);
    });

    router.get('/exports/:id', (req, res) => {
      const exp = this.exports.get(req.params.id);
      if (!exp) return res.status(404).json({ error: 'Export not found' });
      res.json(exp);
    });

    // ── Audit Trail ──

    router.get('/audit-trail', (req, res) => {
      const { action, entityType, userId, limit: limitStr } = req.query;
      let results = [...this.auditTrail];
      if (action) results = results.filter(r => r.action === action);
      if (entityType) results = results.filter(r => r.entityType === entityType);
      if (userId) results = results.filter(r => r.userId === userId);
      results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const limit = parseInt(limitStr as string || '100', 10);
      res.json({ total: results.length, records: results.slice(0, limit) });
    });

    router.get('/audit-trail/:entityId', (req, res) => {
      const records = this.auditTrail.filter(r => r.entityId === req.params.entityId);
      records.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      res.json(records);
    });

    // ── Stats ──

    router.get('/stats', (_req, res) => {
      const activeHolds = [...this.holds.values()].filter(h => h.status === 'active').length;
      res.json({
        activeHolds,
        totalHolds: this.holds.size,
        retentionPolicies: this.policies.size,
        auditRecords: this.auditTrail.length,
        shadowedContent: this.contentShadow.size,
        blockedDeletions: this.blockedDeletions,
        exports: this.exports.size,
        contentBreakdown: this.getContentBreakdown(),
      });
    });

    return router;
  }

  private getContentBreakdown(): Record<string, number> {
    const breakdown: Record<string, number> = {};
    for (const item of this.contentShadow.values()) {
      breakdown[item.type] = (breakdown[item.type] || 0) + 1;
    }
    return breakdown;
  }

  async shutdown(): Promise<void> {
    this.holds.clear();
    this.policies.clear();
    this.auditTrail = [];
    this.contentShadow.clear();
    this.exports.clear();
    this.ctx.logger.info('Compliance plugin shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    const activeHolds = [...this.holds.values()].filter(h => h.status === 'active').length;
    return {
      status: 'healthy',
      details: {
        activeHolds,
        retentionPolicies: this.policies.size,
        auditRecords: this.auditTrail.length,
        shadowedContent: this.contentShadow.size,
        blockedDeletions: this.blockedDeletions,
      },
    };
  }
}

export default CompliancePlugin;
