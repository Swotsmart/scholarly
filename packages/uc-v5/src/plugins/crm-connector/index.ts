/**
 * Scholarly Unified Communications 4.0 — CRM Connector Plugin
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE BRIDGE BETWEEN CONVERSATIONS AND CUSTOMER DATA
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Imagine a receptionist at a high-end hotel. When a guest walks in,
 * they don't ask "Have you stayed with us before?" and fumble through
 * a paper ledger. They glance at their screen, see the guest's history,
 * preferences, and upcoming reservations, and greet them by name with
 * a warm "Welcome back, Mr. Chen — your usual room is ready."
 *
 * That's what the CRM Connector does for every call, chat, and email
 * that enters the UC platform. The moment an interaction arrives:
 *
 *   1. SCREEN POP: The caller's phone number is looked up across all
 *      configured CRM providers. Contact record, open deals, recent
 *      activities, and previous interaction history are bundled and
 *      delivered to the agent's screen before they even answer.
 *
 *   2. AUTO-LOG: When the interaction completes, a call activity is
 *      automatically logged to the CRM with duration, disposition,
 *      recording URL, and agent notes. No manual data entry.
 *
 *   3. CLICK-TO-DIAL: Agents can initiate calls directly from CRM
 *      contact records. The platform dials the number and pre-populates
 *      the screen pop with the contact's data.
 *
 *   4. USER MAPPING: UC platform agents are linked to CRM users so
 *      activities are logged under the correct owner.
 *
 * The plugin supports multiple simultaneous CRM providers per tenant —
 * some organisations use Salesforce for sales and HubSpot for marketing.
 * Screen pop aggregates data from all active providers.
 *
 * REST endpoints (mounted at /api/crm/):
 *
 *   ── Provider Management ──
 *   POST   /providers                     Register a CRM provider
 *   GET    /providers                     List configured providers
 *   GET    /providers/:id                 Get provider details
 *   PUT    /providers/:id                 Update provider config
 *   DELETE /providers/:id                 Remove provider
 *   POST   /providers/:id/test            Test provider connectivity
 *
 *   ── Screen Pop ──
 *   GET    /screen-pop/phone/:number      Look up by phone number
 *   GET    /screen-pop/email/:email       Look up by email
 *   GET    /screen-pop/contact/:id        Look up by CRM contact ID
 *   POST   /screen-pop/search             Search contacts
 *
 *   ── Activity Logging ──
 *   POST   /activities                    Log an activity to CRM
 *   GET    /activities/recent/:contactId  Get recent activities
 *
 *   ── Click-to-Dial ──
 *   POST   /click-to-dial                 Initiate a call from CRM
 *
 *   ── Agent Mapping ──
 *   POST   /agent-mappings                Create agent ↔ CRM user mapping
 *   GET    /agent-mappings                List mappings
 *   GET    /agent-mappings/:ucUserId      Get mapping for a UC user
 *   DELETE /agent-mappings/:id            Remove mapping
 *   POST   /agent-mappings/auto-discover  Auto-discover mappings by email
 *
 *   ── Deals ──
 *   GET    /deals/:contactId              Get open deals for a contact
 *
 * Event prefix: crm:*
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { UCPlugin, PluginContext, PluginHealth, PluginCapability } from '../../core/plugin-interface';
import type {
  CrmProvider, CrmProviderConfig, CrmContact, CrmActivity,
  ScreenPopData, ClickToDialRequest, ClickToDialResult,
  AgentCrmMapping, CrmAutoLogEvent,
} from './types';
import { SalesforceProvider } from './providers/salesforce';
import { HubSpotProvider } from './providers/hubspot';

// ─── Provider Registry ──────────────────────────────────────────────

const PROVIDER_FACTORIES: Record<string, () => CrmProvider> = {
  salesforce: () => new SalesforceProvider(),
  hubspot: () => new HubSpotProvider(),
};

// ─── Plugin ─────────────────────────────────────────────────────────

export class CrmConnectorPlugin implements UCPlugin {
  readonly id = 'crm-connector';
  readonly name = 'CRM Connector';
  readonly version = '4.0.0';
  readonly dependencies = ['telephony'];

  private ctx!: PluginContext;
  /** Active providers: configId → { config, provider } */
  private activeProviders: Map<string, { config: CrmProviderConfig; provider: CrmProvider }> = new Map();
  /** Provider configs stored for persistence */
  private providerConfigs: Map<string, CrmProviderConfig & { id: string }> = new Map();
  /** Agent ↔ CRM user mappings */
  private agentMappings: Map<string, AgentCrmMapping> = new Map();
  /** Screen pop cache: lookupKey → { data, expiresAt } */
  private screenPopCache: Map<string, { data: ScreenPopData; expiresAt: number }> = new Map();
  /** Cache TTL in ms (2 minutes — contacts don't change mid-call) */
  private cacheTtlMs = 120000;
  /** Interaction context for auto-logging: interactionId → context */
  private interactionContexts: Map<string, {
    callId?: string; queueId?: string; agentId?: string; agentUserId?: string;
    contactId?: string; startedAt: string; callerNumber?: string;
  }> = new Map();

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    this.subscribeToEvents();
    ctx.logger.info('[CRM Connector] Initialised — screen pop, auto-log, click-to-dial ready');
  }

  getRoutes(): Router {
    return this.createRouter();
  }

  async shutdown(): Promise<void> {
    for (const { provider } of this.activeProviders.values()) {
      await provider.shutdown();
    }
    this.activeProviders.clear();
    this.screenPopCache.clear();
    this.ctx.logger.info('[CRM Connector] Shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    return {
      status: this.activeProviders.size > 0 ? 'healthy' : 'degraded',
      details: {
        providers: this.activeProviders.size,
        agentMappings: this.agentMappings.size,
        cachedScreenPops: this.screenPopCache.size,
        activeInteractions: this.interactionContexts.size,
      },
    };
  }

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'crm.screenpop', label: 'Screen Pop', description: 'Real-time caller identification', icon: 'UserSearch', routePath: '/screen-pop', requiredRoles: [] },
      { key: 'crm.providers', label: 'CRM Providers', description: 'Manage CRM integrations', icon: 'Database', routePath: '/providers', requiredRoles: ['admin'] },
      { key: 'crm.clicktodial', label: 'Click-to-Dial', description: 'Call from CRM contacts', icon: 'PhoneOutgoing', routePath: '/click-to-dial', requiredRoles: [] },
    ];
  }

  // ─── Event Subscriptions ──────────────────────────────────────────

  private subscribeToEvents(): void {
    // ── Screen Pop on Inbound Call ───────────────────────────────
    // When a call enters the queue, immediately look up the caller
    this.ctx.bus.on('queue:entry-added', async (evt: any) => {
      await this.handleInboundScreenPop(evt);
    });

    // Also trigger on raw inbound call for non-queued calls
    this.ctx.bus.on('call:inbound', async (evt: any) => {
      if (evt.fromNumber) {
        const startTime = Date.now();
        const screenPop = await this.lookupByPhone(evt.fromNumber);
        this.ctx.bus.emit('crm:screen-pop-delivered', {
          lookupKey: evt.fromNumber,
          matched: screenPop.matched,
          provider: screenPop.providers.join(','),
          fetchDurationMs: Date.now() - startTime,
          tenantId: evt.tenantId || '__default__',
        } as any);
      }
    });

    // ── Track Interaction Context ────────────────────────────────
    // When an agent connects, capture context for auto-logging later
    this.ctx.bus.on('queue:entry-connected', (evt: any) => {
      this.interactionContexts.set(evt.entryId, {
        callId: evt.callId,
        queueId: evt.queueId,
        agentId: evt.agentId,
        startedAt: new Date().toISOString(),
      });
    });

    this.ctx.bus.on('agent:interaction-assigned', (evt: any) => {
      const ctx = this.interactionContexts.get(evt.interactionId);
      if (ctx) {
        ctx.agentId = evt.agentId;
        ctx.agentUserId = evt.agentUserId;
      }
    });

    // ── Auto-Log on Interaction Complete ─────────────────────────
    this.ctx.bus.on('queue:entry-completed', async (evt: any) => {
      await this.autoLogInteraction(evt);
    });

    // Also auto-log on direct call completion (non-queued)
    this.ctx.bus.on('call:completed', async (evt: any) => {
      if (!this.interactionContexts.has(evt.callId)) {
        // Direct call — not from queue
        await this.autoLogDirectCall(evt);
      }
    });

    // ── Track Missed/Abandoned for Logging ──────────────────────
    this.ctx.bus.on('queue:entry-abandoned', async (evt: any) => {
      await this.autoLogMissedCall(evt);
    });

    this.ctx.bus.on('call:no_answer', async (evt: any) => {
      await this.autoLogMissedCall(evt);
    });

    // ── Cache Cleanup ───────────────────────────────────────────
    setInterval(() => this.cleanupCache(), 60000);
  }

  // ─── Screen Pop Pipeline ──────────────────────────────────────────

  private async handleInboundScreenPop(evt: any): Promise<void> {
    // Extract caller number from the queue entry event
    // The contact centre bridge puts caller info in the event
    const callerNumber = evt.callerIdentifier || evt.fromNumber;
    if (!callerNumber) return;

    this.ctx.bus.emit('crm:screen-pop-requested', {
      lookupKey: callerNumber,
      lookupType: 'PHONE',
      agentId: evt.offeredToAgentId || '',
      tenantId: evt.tenantId || '__default__',
    } as any);

    const startTime = Date.now();
    const screenPop = await this.lookupByPhone(callerNumber);

    // Store contact ID for auto-logging
    if (screenPop.matched && screenPop.contact?.id) {
      const interactionCtx = this.interactionContexts.get(evt.entryId);
      if (interactionCtx) {
        interactionCtx.contactId = screenPop.contact.id;
        interactionCtx.callerNumber = callerNumber;
      }
    }

    this.ctx.bus.emit('crm:screen-pop-delivered', {
      lookupKey: callerNumber,
      matched: screenPop.matched,
      provider: screenPop.providers.join(','),
      fetchDurationMs: Date.now() - startTime,
      tenantId: evt.tenantId || '__default__',
    } as any);
  }

  async lookupByPhone(phone: string): Promise<ScreenPopData> {
    // Check cache
    const cached = this.screenPopCache.get(`phone:${phone}`);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const startTime = Date.now();
    const providers: string[] = [];
    let contact: ScreenPopData['contact'];
    let account: ScreenPopData['account'];
    let openDeals: ScreenPopData['openDeals'];
    let recentActivities: ScreenPopData['recentActivities'];

    // Query all active providers in parallel
    const lookups = [...this.activeProviders.entries()].map(async ([id, { provider }]) => {
      try {
        const result = await provider.lookupByPhone(phone);
        if (result) {
          providers.push(provider.providerId);
          if (!contact) contact = result; // First match wins

          // Fetch associated data
          if (result.accountId) {
            const acct = await provider.getAccount(result.accountId);
            if (acct && !account) account = acct;
          }

          const deals = await provider.getOpenDeals(result.id);
          if (deals.length > 0 && !openDeals) openDeals = deals;

          const activities = await provider.getRecentActivities(result.id, 5);
          if (activities.length > 0 && !recentActivities) recentActivities = activities;
        }
      } catch (err: any) {
        this.ctx.bus.emit('crm:provider-error', {
          provider: provider.providerId, operation: 'lookupByPhone',
          error: err.message, tenantId: '__default__',
        } as any);
      }
    });

    await Promise.allSettled(lookups);

    const screenPop: ScreenPopData = {
      lookupKey: phone, lookupType: 'PHONE',
      matched: !!contact,
      contact, account, openDeals, recentActivities,
      fetchDurationMs: Date.now() - startTime,
      providers,
      fetchedAt: new Date().toISOString(),
    };

    // Cache
    this.screenPopCache.set(`phone:${phone}`, {
      data: screenPop, expiresAt: Date.now() + this.cacheTtlMs,
    });

    return screenPop;
  }

  async lookupByEmail(email: string): Promise<ScreenPopData> {
    const cached = this.screenPopCache.get(`email:${email}`);
    if (cached && cached.expiresAt > Date.now()) return cached.data;

    const startTime = Date.now();
    const providers: string[] = [];
    let contact: ScreenPopData['contact'];

    for (const [, { provider }] of this.activeProviders) {
      try {
        const result = await provider.lookupByEmail(email);
        if (result) {
          providers.push(provider.providerId);
          if (!contact) contact = result;
        }
      } catch { /* continue to next provider */ }
    }

    const screenPop: ScreenPopData = {
      lookupKey: email, lookupType: 'EMAIL',
      matched: !!contact, contact,
      fetchDurationMs: Date.now() - startTime,
      providers, fetchedAt: new Date().toISOString(),
    };

    this.screenPopCache.set(`email:${email}`, {
      data: screenPop, expiresAt: Date.now() + this.cacheTtlMs,
    });

    return screenPop;
  }

  // ─── Auto-Logging ─────────────────────────────────────────────────

  private async autoLogInteraction(evt: any): Promise<void> {
    const ctx = this.interactionContexts.get(evt.entryId);
    if (!ctx) return;

    // Resolve CRM user ID for the agent
    const crmUserId = ctx.agentId ? this.resolveCrmUserId(ctx.agentId) : undefined;

    const activity: CrmActivity = {
      type: 'CALL',
      subject: `Inbound Call${ctx.callerNumber ? ` from ${ctx.callerNumber}` : ''}`,
      description: `Call handled via queue ${evt.queueId}. Handle time: ${evt.handleTimeSeconds || 0}s.`,
      direction: 'INBOUND',
      durationSeconds: evt.handleTimeSeconds,
      contactId: ctx.contactId,
      crmUserId,
      activityDate: ctx.startedAt,
      ucReferences: {
        callId: ctx.callId,
        interactionId: evt.entryId,
        queueId: evt.queueId,
      },
    };

    await this.logActivityToAllProviders(activity, evt.tenantId);
    this.interactionContexts.delete(evt.entryId);
  }

  private async autoLogDirectCall(evt: any): Promise<void> {
    // Look up contact for the call
    const phone = evt.fromNumber || evt.toNumber;
    let contactId: string | undefined;

    if (phone) {
      const screenPop = await this.lookupByPhone(phone);
      if (screenPop.matched && screenPop.contact) {
        contactId = screenPop.contact.id;
      }
    }

    const activity: CrmActivity = {
      type: 'CALL',
      subject: `${evt.direction || 'Outbound'} Call — ${phone || 'unknown'}`,
      description: `Call duration: ${evt.durationSeconds || 0}s.`,
      direction: evt.direction || 'OUTBOUND',
      durationSeconds: evt.durationSeconds,
      contactId,
      activityDate: evt.startedAt || new Date().toISOString(),
      ucReferences: { callId: evt.callId },
    };

    await this.logActivityToAllProviders(activity, evt.tenantId);
  }

  private async autoLogMissedCall(evt: any): Promise<void> {
    const phone = evt.callerIdentifier || evt.fromNumber;
    let contactId: string | undefined;

    if (phone) {
      const screenPop = await this.lookupByPhone(phone);
      if (screenPop.matched) contactId = screenPop.contact?.id;
    }

    const activity: CrmActivity = {
      type: 'CALL',
      subject: `Missed Call${phone ? ` from ${phone}` : ''}`,
      description: `Call was abandoned/missed. Wait time: ${evt.waitSeconds || 0}s.`,
      direction: 'INBOUND',
      disposition: 'no-answer',
      contactId,
      activityDate: new Date().toISOString(),
      ucReferences: { callId: evt.callId, queueId: evt.queueId },
    };

    await this.logActivityToAllProviders(activity, evt.tenantId);
  }

  private async logActivityToAllProviders(activity: CrmActivity, tenantId: string): Promise<void> {
    for (const [, { provider, config }] of this.activeProviders) {
      // Check if this event type should be auto-logged
      const shouldLog = config.autoLogEvents.includes('call:completed') ||
                        config.autoLogEvents.includes('queue:entry-completed');
      if (!shouldLog) continue;

      try {
        const result = await provider.logActivity(activity);
        if (result.success) {
          this.ctx.bus.emit('crm:activity-logged', {
            activityId: result.id, type: activity.type,
            provider: provider.providerId, contactId: activity.contactId,
            tenantId,
          } as any);
        } else {
          this.ctx.bus.emit('crm:activity-log-failed', {
            error: result.error || 'Unknown error',
            provider: provider.providerId, tenantId,
          } as any);
        }
      } catch (err: any) {
        this.ctx.bus.emit('crm:activity-log-failed', {
          error: err.message, provider: provider.providerId, tenantId,
        } as any);
      }
    }
  }

  // ─── Click-to-Dial ────────────────────────────────────────────────

  async clickToDial(request: ClickToDialRequest): Promise<ClickToDialResult> {
    this.ctx.bus.emit('crm:click-to-dial', {
      phoneNumber: request.phoneNumber,
      contactId: request.contactId,
      agentUserId: request.agentUserId,
      tenantId: request.tenantId,
    } as any);

    // Pre-fetch screen pop for the contact
    let screenPop: ScreenPopData | undefined;
    if (request.contactId) {
      for (const [, { provider }] of this.activeProviders) {
        try {
          const contact = await provider.lookupById(request.contactId);
          if (contact) {
            screenPop = {
              lookupKey: request.contactId, lookupType: 'CRM_ID',
              matched: true, contact,
              fetchDurationMs: 0, providers: [provider.providerId],
              fetchedAt: new Date().toISOString(),
            };
            break;
          }
        } catch { /* continue */ }
      }
    }

    // Initiate the call via the telephony plugin's event bus
    const callId = uuidv4();
    this.ctx.bus.emit('call:click-to-dial-requested', {
      callId,
      phoneNumber: request.phoneNumber,
      agentUserId: request.agentUserId,
      tenantId: request.tenantId,
      metadata: {
        crmContactId: request.contactId,
        crmAccountId: request.accountId,
        crmDealId: request.dealId,
        ...request.metadata,
      },
    } as any);

    // Track for auto-logging when call completes
    this.interactionContexts.set(callId, {
      callId,
      agentUserId: request.agentUserId,
      contactId: request.contactId,
      callerNumber: request.phoneNumber,
      startedAt: new Date().toISOString(),
    });

    return {
      success: true,
      callId,
      screenPop,
    };
  }

  // ─── Agent Mapping ────────────────────────────────────────────────

  private resolveCrmUserId(agentId: string): string | undefined {
    for (const mapping of this.agentMappings.values()) {
      if (mapping.ucUserId === agentId) return mapping.crmUserId;
    }
    return undefined;
  }

  async autoDiscoverMappings(tenantId: string, ucUsers: { userId: string; email: string }[]): Promise<AgentCrmMapping[]> {
    const discovered: AgentCrmMapping[] = [];

    for (const user of ucUsers) {
      for (const [, { provider }] of this.activeProviders) {
        try {
          const crmUser = await provider.lookupUserByEmail(user.email);
          if (crmUser) {
            const mapping: AgentCrmMapping = {
              id: uuidv4(),
              ucUserId: user.userId,
              crmUserId: crmUser.id,
              provider: provider.providerId,
              crmUserEmail: crmUser.email,
              tenantId,
              createdAt: new Date().toISOString(),
            };
            this.agentMappings.set(mapping.id, mapping);
            discovered.push(mapping);
          }
        } catch { /* continue */ }
      }
    }

    return discovered;
  }

  // ─── Provider Management ──────────────────────────────────────────

  async registerProvider(config: CrmProviderConfig & { id?: string }): Promise<{ id: string; connected: boolean; error?: string }> {
    const id = config.id || uuidv4();
    const factory = PROVIDER_FACTORIES[config.provider];
    if (!factory) {
      return { id, connected: false, error: `Unknown provider: ${config.provider}. Supported: ${Object.keys(PROVIDER_FACTORIES).join(', ')}` };
    }

    const provider = factory();
    try {
      await provider.initialize(config);
      const test = await provider.testConnection();

      if (test.connected) {
        this.activeProviders.set(id, { config, provider });
        this.providerConfigs.set(id, { ...config, id });

        this.ctx.bus.emit('crm:provider-connected', {
          provider: config.provider, tenantId: config.tenantId,
        } as any);

        return { id, connected: true };
      } else {
        return { id, connected: false, error: test.error };
      }
    } catch (err: any) {
      return { id, connected: false, error: err.message };
    }
  }

  async removeProvider(id: string): Promise<boolean> {
    const entry = this.activeProviders.get(id);
    if (!entry) return false;

    await entry.provider.shutdown();
    this.activeProviders.delete(id);
    this.providerConfigs.delete(id);

    this.ctx.bus.emit('crm:provider-disconnected', {
      provider: entry.config.provider, tenantId: entry.config.tenantId,
    } as any);

    return true;
  }

  // ─── Cache ────────────────────────────────────────────────────────

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.screenPopCache) {
      if (entry.expiresAt < now) this.screenPopCache.delete(key);
    }
  }

  // ─── REST Router ──────────────────────────────────────────────────

  private createRouter(): Router {
    const r = Router();

    // ── Provider Management ────────────────────────────────────────
    r.post('/providers', async (req: Request, res: Response) => {
      try {
        const result = await this.registerProvider(req.body);
        res.status(result.connected ? 201 : 400).json(result);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    r.get('/providers', (_req: Request, res: Response) => {
      const providers = [...this.providerConfigs.values()].map(c => ({
        id: c.id, provider: c.provider, name: c.name, isActive: c.isActive,
        tenantId: c.tenantId, autoLogEvents: c.autoLogEvents,
      }));
      res.json({ providers });
    });

    r.get('/providers/:id', (req: Request, res: Response) => {
      const config = this.providerConfigs.get(req.params.id);
      if (!config) return res.status(404).json({ error: 'Provider not found' });
      // Omit secrets
      const safe = { ...config, auth: { type: config.auth.type } };
      res.json(safe);
    });

    r.put('/providers/:id', async (req: Request, res: Response) => {
      const existing = this.providerConfigs.get(req.params.id);
      if (!existing) return res.status(404).json({ error: 'Provider not found' });
      await this.removeProvider(req.params.id);
      const result = await this.registerProvider({ ...existing, ...req.body, id: req.params.id });
      res.json(result);
    });

    r.delete('/providers/:id', async (req: Request, res: Response) => {
      if (!await this.removeProvider(req.params.id)) return res.status(404).json({ error: 'Provider not found' });
      res.json({ removed: true });
    });

    r.post('/providers/:id/test', async (req: Request, res: Response) => {
      const entry = this.activeProviders.get(req.params.id);
      if (!entry) return res.status(404).json({ error: 'Provider not found' });
      const result = await entry.provider.testConnection();
      res.json(result);
    });

    // ── Screen Pop ─────────────────────────────────────────────────
    r.get('/screen-pop/phone/:number', async (req: Request, res: Response) => {
      const data = await this.lookupByPhone(req.params.number);
      res.json(data);
    });

    r.get('/screen-pop/email/:email', async (req: Request, res: Response) => {
      const data = await this.lookupByEmail(req.params.email);
      res.json(data);
    });

    r.get('/screen-pop/contact/:id', async (req: Request, res: Response) => {
      for (const [, { provider }] of this.activeProviders) {
        try {
          const contact = await provider.lookupById(req.params.id);
          if (contact) {
            return res.json({
              lookupKey: req.params.id, lookupType: 'CRM_ID',
              matched: true, contact,
              providers: [provider.providerId],
              fetchedAt: new Date().toISOString(),
            });
          }
        } catch { /* next provider */ }
      }
      res.json({ lookupKey: req.params.id, lookupType: 'CRM_ID', matched: false, providers: [] });
    });

    r.post('/screen-pop/search', async (req: Request, res: Response) => {
      const { query, limit } = req.body;
      if (!query) return res.status(400).json({ error: 'query required' });
      const allResults: any[] = [];
      for (const [, { provider }] of this.activeProviders) {
        try {
          const contacts = await provider.searchContacts(query, limit || 10);
          allResults.push(...contacts);
        } catch { /* continue */ }
      }
      res.json({ query, results: allResults, total: allResults.length });
    });

    // ── Activity Logging ───────────────────────────────────────────
    r.post('/activities', async (req: Request, res: Response) => {
      const activity = req.body as CrmActivity;
      if (!activity.subject || !activity.type) {
        return res.status(400).json({ error: 'subject and type required' });
      }
      const results: any[] = [];
      for (const [, { provider }] of this.activeProviders) {
        try {
          const result = await provider.logActivity(activity);
          results.push({ provider: provider.providerId, ...result });
        } catch (err: any) {
          results.push({ provider: provider.providerId, success: false, error: err.message });
        }
      }
      res.json({ results });
    });

    r.get('/activities/recent/:contactId', async (req: Request, res: Response) => {
      const limit = parseInt(req.query.limit as string || '5');
      const allActivities: CrmActivity[] = [];
      for (const [, { provider }] of this.activeProviders) {
        try {
          const activities = await provider.getRecentActivities(req.params.contactId, limit);
          allActivities.push(...activities);
        } catch { /* continue */ }
      }
      allActivities.sort((a, b) => new Date(b.activityDate).getTime() - new Date(a.activityDate).getTime());
      res.json({ contactId: req.params.contactId, activities: allActivities.slice(0, limit) });
    });

    // ── Click-to-Dial ──────────────────────────────────────────────
    r.post('/click-to-dial', async (req: Request, res: Response) => {
      const request = req.body as ClickToDialRequest;
      if (!request.phoneNumber || !request.agentUserId) {
        return res.status(400).json({ error: 'phoneNumber and agentUserId required' });
      }
      const result = await this.clickToDial(request);
      res.json(result);
    });

    // ── Agent Mappings ─────────────────────────────────────────────
    r.post('/agent-mappings', (req: Request, res: Response) => {
      const { ucUserId, crmUserId, provider, crmUserEmail, tenantId } = req.body;
      if (!ucUserId || !crmUserId) return res.status(400).json({ error: 'ucUserId and crmUserId required' });
      const mapping: AgentCrmMapping = {
        id: uuidv4(), ucUserId, crmUserId,
        provider: provider || 'unknown',
        crmUserEmail, tenantId: tenantId || '__default__',
        createdAt: new Date().toISOString(),
      };
      this.agentMappings.set(mapping.id, mapping);
      res.status(201).json(mapping);
    });

    r.get('/agent-mappings', (_req: Request, res: Response) => {
      res.json({ mappings: [...this.agentMappings.values()] });
    });

    r.get('/agent-mappings/:ucUserId', (req: Request, res: Response) => {
      const mappings = [...this.agentMappings.values()].filter(m => m.ucUserId === req.params.ucUserId);
      res.json({ ucUserId: req.params.ucUserId, mappings });
    });

    r.delete('/agent-mappings/:id', (req: Request, res: Response) => {
      if (!this.agentMappings.delete(req.params.id)) {
        return res.status(404).json({ error: 'Mapping not found' });
      }
      res.json({ removed: true });
    });

    r.post('/agent-mappings/auto-discover', async (req: Request, res: Response) => {
      const { tenantId, users } = req.body;
      if (!users?.length) return res.status(400).json({ error: 'users array required' });
      const discovered = await this.autoDiscoverMappings(tenantId || '__default__', users);
      res.json({ discovered, total: discovered.length });
    });

    // ── Deals ──────────────────────────────────────────────────────
    r.get('/deals/:contactId', async (req: Request, res: Response) => {
      const allDeals: any[] = [];
      for (const [, { provider }] of this.activeProviders) {
        try {
          const deals = await provider.getOpenDeals(req.params.contactId);
          allDeals.push(...deals);
        } catch { /* continue */ }
      }
      res.json({ contactId: req.params.contactId, deals: allDeals });
    });

    return r;
  }

  private wrap(fn: (req: Request, res: Response) => Promise<void>) {
    return (req: Request, res: Response) => fn.call(this, req, res).catch((err: any) => {
      this.ctx.logger.error(`[CRM Connector] Error: ${err.message}`);
      res.status(500).json({ error: 'Internal CRM connector error' });
    });
  }
}

export default CrmConnectorPlugin;
