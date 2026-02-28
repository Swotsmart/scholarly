/**
 * Scholarly Unified Communications 4.0 — Consent Gate Framework Enhancement
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE CHECKPOINT BEFORE THE BRIDGE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Imagine a medieval city with different quarters, each accessible via
 * a bridge with a checkpoint. Some bridges require a merchant's seal to
 * cross (age verification). Others require a noble's letter of permission
 * (parental consent). Some require both, and the guards check a different
 * set of documents depending on where the traveller comes from (jurisdiction).
 *
 * The Consent Gate Framework is this checkpoint system for the UC platform.
 * Before a user can access certain features (joining a video room, viewing
 * a recording, accessing a training session), they must pass through
 * whatever consent gates apply to them based on:
 *
 *   - Their age (COPPA: under 13 requires verifiable parental consent)
 *   - Their role (student vs teacher vs parent vs administrator)
 *   - Their jurisdiction (GDPR-K for EU, COPPA for US, PIPL for China)
 *   - The feature being accessed (video with recording, chat, file sharing)
 *   - Custom rules defined by the tenant
 *
 * This is not education-specific. A healthcare platform needs patient consent
 * before recording a telehealth session. A financial platform needs client
 * consent before recording an advisory call. A corporate platform needs
 * employee acknowledgement before enabling surveillance features.
 *
 * The framework is declarative: you define consent gate rules, and the
 * platform evaluates them at access time, returning either "access granted"
 * or "consent required" with the specific consent form that must be completed.
 *
 * REST endpoints added to /api/compliance:
 *   POST /consent-gates                — Create a consent gate rule
 *   GET  /consent-gates                — List consent gate rules
 *   GET  /consent-gates/:id            — Get gate details
 *   PUT  /consent-gates/:id            — Update gate
 *   DELETE /consent-gates/:id          — Delete gate
 *   POST /consent/evaluate             — Evaluate gates for a user + feature
 *   POST /consent/grant                — Record consent granted
 *   POST /consent/revoke               — Revoke previously granted consent
 *   GET  /consent/status/:userId       — Get all consent statuses for a user
 *   GET  /consent/audit                — Consent audit trail
 *   POST /consent/bulk-check           — Check multiple users against a gate
 *   GET  /consent/pending              — Get pending consent requests
 *
 * Bus events emitted:
 *   compliance:consent-required, compliance:consent-granted,
 *   compliance:consent-revoked, compliance:consent-expired,
 *   compliance:access-blocked, compliance:gate-created,
 *   compliance:gate-evaluated
 */

import { Router } from 'express';
import type { PluginContext } from '../../../core/plugin-interface';

// ─── Types ──────────────────────────────────────────────────────────

export interface ConsentGate {
  id: string;
  name: string;
  description: string;
  /** Regulatory framework this gate implements */
  regulation: 'coppa' | 'ferpa' | 'gdpr-k' | 'hipaa' | 'pipl' | 'custom';
  /** Conditions that trigger this gate */
  conditions: GateCondition[];
  /** The consent that must be obtained */
  consentRequirement: ConsentRequirement;
  /** Features this gate applies to */
  targetFeatures: string[];
  /** Priority — lower number = evaluated first. First blocking gate wins. */
  priority: number;
  isActive: boolean;
  tenantId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GateCondition {
  type: 'age-below' | 'age-above' | 'role-is' | 'role-is-not' | 'jurisdiction-is' | 'custom';
  /** For age conditions: the threshold age */
  ageThreshold?: number;
  /** For role conditions: the role identifier(s) */
  roles?: string[];
  /** For jurisdiction conditions: ISO country codes */
  jurisdictions?: string[];
  /** For custom conditions: a key-value match against user metadata */
  customField?: string;
  customValue?: string;
  /** Logical operator when multiple conditions exist on the same gate */
  operator?: 'and' | 'or';
}

export interface ConsentRequirement {
  /** Type of consent needed */
  type: 'self-consent' | 'guardian-consent' | 'both' | 'acknowledgement';
  /** The consent form to present (HTML or structured fields) */
  formTitle: string;
  formDescription: string;
  formFields?: ConsentFormField[];
  /** How long consent is valid before requiring renewal */
  validityDays?: number;
  /** Whether to require re-consent on each session or persist */
  persistent: boolean;
  /** Whether consent can be granted by the user themselves or requires an authority */
  requiredGrantorRole?: string;
}

export interface ConsentFormField {
  id: string;
  label: string;
  type: 'checkbox' | 'signature' | 'date' | 'text';
  required: boolean;
  helpText?: string;
}

export interface ConsentRecord {
  id: string;
  gateId: string;
  gateName: string;
  /** The user who the consent is for */
  subjectUserId: string;
  subjectName: string;
  /** The user who granted consent (may be the subject or a guardian) */
  grantorUserId: string;
  grantorName: string;
  grantorRole: string;
  /** The specific feature this consent applies to */
  feature: string;
  /** Consent form responses */
  formResponses: Record<string, unknown>;
  /** Status of this consent */
  status: 'pending' | 'granted' | 'revoked' | 'expired';
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  /** IP address and user agent for audit purposes */
  grantorIp?: string;
  grantorUserAgent?: string;
  tenantId?: string;
  createdAt: Date;
}

export interface EvaluationResult {
  /** Whether access is allowed */
  allowed: boolean;
  /** Gates that were evaluated */
  evaluatedGates: {
    gateId: string;
    gateName: string;
    regulation: string;
    triggered: boolean;
    consentStatus: 'not-required' | 'granted' | 'pending' | 'expired' | 'required';
    consentRecordId?: string;
  }[];
  /** If not allowed, the consent form(s) that need to be completed */
  requiredConsents?: {
    gateId: string;
    gateName: string;
    requirement: ConsentRequirement;
  }[];
}

export interface ConsentAuditEntry {
  timestamp: Date;
  action: 'evaluated' | 'granted' | 'revoked' | 'expired' | 'access-blocked';
  gateId: string;
  subjectUserId: string;
  grantorUserId?: string;
  feature: string;
  result: string;
  ip?: string;
}

// ─── Consent Gate Manager ───────────────────────────────────────────

export class ConsentGateManager {
  private gates: Map<string, ConsentGate> = new Map();
  private consents: Map<string, ConsentRecord> = new Map();
  /** Index: subjectUserId:gateId:feature → consentRecordId */
  private consentIndex: Map<string, string> = new Map();
  private auditTrail: ConsentAuditEntry[] = [];

  constructor(private ctx: PluginContext) {}

  // ─── Event Subscriptions ──────────────────────────────────────────

  subscribeToEvents(): void {
    // Intercept feature access events and evaluate consent gates
    // These are the "checkpoint triggers" — when someone tries to cross a bridge
    const accessEvents = [
      'room:participant-joining',     // Before joining a video room
      'webinar:attendee-joining',     // Before joining a webinar
      'cloud:file-accessing',         // Before accessing a shared file
      'recording:playback-requested', // Before viewing a recording
    ];

    for (const event of accessEvents) {
      this.ctx.bus.on(event, (evt: any) => {
        const feature = event.split(':')[0]; // 'room', 'webinar', 'cloud', 'recording'
        const userId = evt.userId;
        if (!userId) return;

        const result = this.evaluate(userId, feature, evt.userMetadata || {});
        if (!result.allowed) {
          this.ctx.bus.emit('compliance:access-blocked', {
            userId, feature, event,
            requiredConsents: result.requiredConsents?.map(c => c.gateName),
          });
        }
      });
    }

    // Periodically check for expired consents
    setInterval(() => this.checkExpiredConsents(), 60 * 60 * 1000); // Hourly
  }

  // ─── Gate CRUD ────────────────────────────────────────────────────

  createGate(input: Omit<ConsentGate, 'id' | 'createdAt' | 'updatedAt'>): ConsentGate {
    const gate: ConsentGate = {
      ...input,
      id: `gate-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.gates.set(gate.id, gate);
    this.ctx.bus.emit('compliance:gate-created', { gateId: gate.id, name: gate.name, regulation: gate.regulation });
    return gate;
  }

  updateGate(id: string, updates: Partial<ConsentGate>): ConsentGate | null {
    const gate = this.gates.get(id);
    if (!gate) return null;
    Object.assign(gate, updates, { updatedAt: new Date() });
    return gate;
  }

  deleteGate(id: string): boolean {
    return this.gates.delete(id);
  }

  // ─── Consent Evaluation ───────────────────────────────────────────

  /**
   * Evaluate all applicable consent gates for a user accessing a feature.
   * Returns whether access is allowed and which consents are needed if not.
   *
   * @param userId - The user attempting access
   * @param feature - The feature being accessed (e.g., 'room', 'webinar')
   * @param userMetadata - User attributes for condition evaluation (age, role, jurisdiction, etc.)
   */
  evaluate(
    userId: string,
    feature: string,
    userMetadata: Record<string, any>,
  ): EvaluationResult {
    const applicableGates = [...this.gates.values()]
      .filter(g => g.isActive && g.targetFeatures.includes(feature))
      .sort((a, b) => a.priority - b.priority);

    const evaluated: EvaluationResult['evaluatedGates'] = [];
    const requiredConsents: EvaluationResult['requiredConsents'] = [];
    let allowed = true;

    for (const gate of applicableGates) {
      const triggered = this.evaluateConditions(gate.conditions, userMetadata);

      if (!triggered) {
        evaluated.push({
          gateId: gate.id, gateName: gate.name, regulation: gate.regulation,
          triggered: false, consentStatus: 'not-required',
        });
        continue;
      }

      // Gate triggered — check if consent exists
      const consentKey = `${userId}:${gate.id}:${feature}`;
      const consentId = this.consentIndex.get(consentKey);
      const consent = consentId ? this.consents.get(consentId) : undefined;

      let consentStatus: 'granted' | 'pending' | 'expired' | 'required';

      if (consent?.status === 'granted') {
        // Check expiry
        if (consent.expiresAt && consent.expiresAt < new Date()) {
          consent.status = 'expired';
          consentStatus = 'expired';
        } else if (!gate.consentRequirement.persistent) {
          // Non-persistent: require per-session
          consentStatus = 'required';
        } else {
          consentStatus = 'granted';
        }
      } else if (consent?.status === 'pending') {
        consentStatus = 'pending';
      } else {
        consentStatus = 'required';
      }

      evaluated.push({
        gateId: gate.id, gateName: gate.name, regulation: gate.regulation,
        triggered: true, consentStatus, consentRecordId: consent?.id,
      });

      if (consentStatus !== 'granted') {
        allowed = false;
        requiredConsents.push({
          gateId: gate.id, gateName: gate.name,
          requirement: gate.consentRequirement,
        });
      }
    }

    // Audit
    this.auditTrail.push({
      timestamp: new Date(), action: 'evaluated',
      gateId: applicableGates.map(g => g.id).join(','),
      subjectUserId: userId, feature,
      result: allowed ? 'access-granted' : 'consent-required',
    });

    this.ctx.bus.emit('compliance:gate-evaluated', {
      userId, feature, allowed,
      gatesTriggered: evaluated.filter(e => e.triggered).length,
      consentsRequired: requiredConsents.length,
    });

    if (!allowed) {
      this.ctx.bus.emit('compliance:consent-required', {
        userId, feature,
        gates: requiredConsents.map(c => ({ gateId: c.gateId, name: c.gateName })),
      });
    }

    return { allowed, evaluatedGates: evaluated, requiredConsents: allowed ? undefined : requiredConsents };
  }

  private evaluateConditions(conditions: GateCondition[], metadata: Record<string, any>): boolean {
    if (conditions.length === 0) return false;

    // Determine logical operator (default: 'and' — all conditions must match)
    const operator = conditions[0].operator || 'and';

    const results = conditions.map(condition => {
      switch (condition.type) {
        case 'age-below':
          return metadata.age !== undefined && metadata.age < (condition.ageThreshold || 18);
        case 'age-above':
          return metadata.age !== undefined && metadata.age >= (condition.ageThreshold || 18);
        case 'role-is':
          return condition.roles?.includes(metadata.role) ?? false;
        case 'role-is-not':
          return !(condition.roles?.includes(metadata.role) ?? true);
        case 'jurisdiction-is':
          return condition.jurisdictions?.includes(metadata.jurisdiction || metadata.country) ?? false;
        case 'custom':
          return condition.customField
            ? String(metadata[condition.customField]) === condition.customValue
            : false;
        default:
          return false;
      }
    });

    return operator === 'or' ? results.some(Boolean) : results.every(Boolean);
  }

  // ─── Consent Grant/Revoke ─────────────────────────────────────────

  grantConsent(input: {
    gateId: string;
    subjectUserId: string;
    subjectName: string;
    grantorUserId: string;
    grantorName: string;
    grantorRole: string;
    feature: string;
    formResponses: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): ConsentRecord {
    const gate = this.gates.get(input.gateId);
    if (!gate) throw new Error('Consent gate not found');

    // Validate grantor role if required
    if (gate.consentRequirement.requiredGrantorRole &&
        input.grantorRole !== gate.consentRequirement.requiredGrantorRole) {
      throw new Error(`Consent must be granted by a user with role: ${gate.consentRequirement.requiredGrantorRole}`);
    }

    const record: ConsentRecord = {
      id: `consent-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      gateId: input.gateId,
      gateName: gate.name,
      subjectUserId: input.subjectUserId,
      subjectName: input.subjectName,
      grantorUserId: input.grantorUserId,
      grantorName: input.grantorName,
      grantorRole: input.grantorRole,
      feature: input.feature,
      formResponses: input.formResponses,
      status: 'granted',
      grantedAt: new Date(),
      expiresAt: gate.consentRequirement.validityDays
        ? new Date(Date.now() + gate.consentRequirement.validityDays * 86400000)
        : undefined,
      grantorIp: input.ip,
      grantorUserAgent: input.userAgent,
      tenantId: gate.tenantId,
      createdAt: new Date(),
    };

    this.consents.set(record.id, record);
    this.consentIndex.set(`${input.subjectUserId}:${input.gateId}:${input.feature}`, record.id);

    this.auditTrail.push({
      timestamp: new Date(), action: 'granted',
      gateId: input.gateId, subjectUserId: input.subjectUserId,
      grantorUserId: input.grantorUserId, feature: input.feature,
      result: 'consent-granted', ip: input.ip,
    });

    this.ctx.bus.emit('compliance:consent-granted', {
      consentId: record.id, gateId: input.gateId, gateName: gate.name,
      subjectUserId: input.subjectUserId, grantorUserId: input.grantorUserId,
      feature: input.feature, expiresAt: record.expiresAt?.toISOString(),
    });

    return record;
  }

  revokeConsent(consentId: string, revokedBy: string, reason?: string): boolean {
    const record = this.consents.get(consentId);
    if (!record || record.status !== 'granted') return false;

    record.status = 'revoked';
    record.revokedAt = new Date();

    this.auditTrail.push({
      timestamp: new Date(), action: 'revoked',
      gateId: record.gateId, subjectUserId: record.subjectUserId,
      grantorUserId: revokedBy, feature: record.feature,
      result: `consent-revoked${reason ? `: ${reason}` : ''}`,
    });

    this.ctx.bus.emit('compliance:consent-revoked', {
      consentId, gateId: record.gateId, subjectUserId: record.subjectUserId,
      revokedBy, reason,
    });

    return true;
  }

  getConsentStatus(userId: string): ConsentRecord[] {
    return [...this.consents.values()].filter(c => c.subjectUserId === userId);
  }

  getPendingConsents(): ConsentRecord[] {
    return [...this.consents.values()].filter(c => c.status === 'pending');
  }

  private checkExpiredConsents(): void {
    const now = new Date();
    for (const record of this.consents.values()) {
      if (record.status === 'granted' && record.expiresAt && record.expiresAt < now) {
        record.status = 'expired';
        this.auditTrail.push({
          timestamp: now, action: 'expired',
          gateId: record.gateId, subjectUserId: record.subjectUserId,
          feature: record.feature, result: 'consent-expired',
        });
        this.ctx.bus.emit('compliance:consent-expired', {
          consentId: record.id, gateId: record.gateId,
          subjectUserId: record.subjectUserId, feature: record.feature,
        });
      }
    }
  }

  bulkCheck(userIds: string[], feature: string, userMetadataMap: Record<string, Record<string, any>>): {
    userId: string; allowed: boolean; requiredGates: string[];
  }[] {
    return userIds.map(userId => {
      const metadata = userMetadataMap[userId] || {};
      const result = this.evaluate(userId, feature, metadata);
      return {
        userId,
        allowed: result.allowed,
        requiredGates: (result.requiredConsents || []).map(c => c.gateName),
      };
    });
  }

  // ─── REST Router ──────────────────────────────────────────────────

  createRouter(): Router {
    const router = Router();

    // ── Consent Gates ──────────────────────────────────────────────
    router.post('/consent-gates', (req, res) => {
      const gate = this.createGate(req.body);
      res.status(201).json(gate);
    });

    router.get('/consent-gates', (_req, res) => {
      res.json({ gates: [...this.gates.values()] });
    });

    router.get('/consent-gates/:id', (req, res) => {
      const gate = this.gates.get(req.params.id);
      if (!gate) return res.status(404).json({ error: 'Gate not found' });
      res.json(gate);
    });

    router.put('/consent-gates/:id', (req, res) => {
      const gate = this.updateGate(req.params.id, req.body);
      if (!gate) return res.status(404).json({ error: 'Gate not found' });
      res.json(gate);
    });

    router.delete('/consent-gates/:id', (req, res) => {
      if (!this.deleteGate(req.params.id)) return res.status(404).json({ error: 'Gate not found' });
      res.json({ deleted: true });
    });

    // ── Consent Evaluation ─────────────────────────────────────────
    router.post('/consent/evaluate', (req, res) => {
      const { userId, feature, userMetadata } = req.body;
      if (!userId || !feature) return res.status(400).json({ error: 'userId and feature required' });
      const result = this.evaluate(userId, feature, userMetadata || {});
      res.json(result);
    });

    router.post('/consent/grant', (req, res) => {
      try {
        const record = this.grantConsent(req.body);
        res.status(201).json(record);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    router.post('/consent/revoke', (req, res) => {
      const { consentId, revokedBy, reason } = req.body;
      if (!this.revokeConsent(consentId, revokedBy, reason)) {
        return res.status(404).json({ error: 'Consent record not found or not active' });
      }
      res.json({ revoked: true });
    });

    router.get('/consent/status/:userId', (req, res) => {
      res.json({ userId: req.params.userId, consents: this.getConsentStatus(req.params.userId) });
    });

    router.get('/consent/audit', (req, res) => {
      let entries = [...this.auditTrail];
      if (req.query.userId) entries = entries.filter(e => e.subjectUserId === req.query.userId);
      if (req.query.gateId) entries = entries.filter(e => e.gateId.includes(req.query.gateId as string));
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      res.json({ total: entries.length, entries: entries.slice(-limit).reverse() });
    });

    router.post('/consent/bulk-check', (req, res) => {
      const { userIds, feature, userMetadataMap } = req.body;
      if (!userIds?.length || !feature) return res.status(400).json({ error: 'userIds and feature required' });
      const results = this.bulkCheck(userIds, feature, userMetadataMap || {});
      res.json({ results });
    });

    router.get('/consent/pending', (_req, res) => {
      res.json({ pending: this.getPendingConsents() });
    });

    return router;
  }

  // ─── Health ───────────────────────────────────────────────────────

  getHealth(): {
    gateCount: number; activeGates: number;
    totalConsents: number; grantedConsents: number;
    expiredConsents: number; auditEntries: number;
  } {
    const consents = [...this.consents.values()];
    return {
      gateCount: this.gates.size,
      activeGates: [...this.gates.values()].filter(g => g.isActive).length,
      totalConsents: consents.length,
      grantedConsents: consents.filter(c => c.status === 'granted').length,
      expiredConsents: consents.filter(c => c.status === 'expired').length,
      auditEntries: this.auditTrail.length,
    };
  }
}

export default ConsentGateManager;
