/**
 * Scholarly Unified Communications 4.0 — Contact Centre Event Bridge
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE TRANSLATOR BETWEEN TWO WORLDS
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * The base Telephony plugin speaks one language: calls, numbers, IVR trees.
 * The Contact Centre engine speaks another: queues, agents, routing strategies.
 * This bridge sits between them, translating events from one world into
 * actions in the other.
 *
 * When an inbound call arrives (call:inbound), the bridge checks if the
 * phone number's IVR tree routes to a queue (IVR nodes with routeToQueueId).
 * If so, it enqueues the call. When a call ends (call:completed), it
 * signals the agent to enter wrap-up. When a caller hangs up while
 * waiting (call:cancelled), it marks the queue entry as abandoned.
 *
 * Think of it like an embassy translator at a diplomatic meeting: neither
 * side needs to learn the other's language; the translator handles the
 * conversion in real time, preserving the meaning while adapting the form.
 *
 * This module also provides the subscribeToEvents() method required by
 * the enhancement pattern, making the entire Contact Centre enhancement
 * self-wiring when plugged into the Telephony plugin.
 */

import type { PluginContext } from '../../../core/plugin-interface';
import type { ContactCentreManager } from './contact-centre';
import type { InteractionType, CallerInfo, InteractionPriority } from './contact-centre-types';

export interface EventBridgeConfig {
  /** Default queue ID for inbound calls that don't match a specific queue */
  defaultQueueId?: string;
  /** Default priority for inbound calls */
  defaultPriority?: InteractionPriority;
  /** Auto-enqueue inbound calls (vs manual enqueue via API) */
  autoEnqueueInbound: boolean;
  /** Auto wrap-up timeout: if agent doesn't complete wrap-up in N seconds, auto-complete */
  autoWrapUpTimeoutSeconds?: number;
  /** Map IVR routeToQueueId references to actual queue IDs (for IVR integration) */
  ivrQueueMapping?: Record<string, string>;
}

const DEFAULT_CONFIG: EventBridgeConfig = {
  autoEnqueueInbound: true,
  defaultPriority: 'NORMAL',
};

export class ContactCentreEventBridge {
  private config: EventBridgeConfig;
  /** Track call → queue entry mapping for lifecycle management */
  private callEntryMap: Map<string, { queueId: string; entryId: string }> = new Map();
  /** Track call → agent mapping for wrap-up triggering */
  private callAgentMap: Map<string, string> = new Map();
  /** Auto wrap-up timers */
  private wrapUpTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();

  constructor(
    private ctx: PluginContext,
    private ccManager: ContactCentreManager,
    config?: Partial<EventBridgeConfig>,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Wire into the event bus. This is the main integration point.
   * After calling this, inbound calls automatically flow through
   * the contact centre's queue and routing system.
   */
  subscribeToEvents(): void {
    // ── Inbound Call → Queue Entry ──────────────────────────────────
    this.ctx.bus.on('call:inbound', (evt: any) => {
      if (!this.config.autoEnqueueInbound) return;

      const queueId = this.resolveQueueForCall(evt);
      if (!queueId) return; // No queue configured — call handled by IVR/direct dial

      const caller: CallerInfo = {
        identifier: evt.fromNumber,
        displayName: evt.callerName || evt.fromNumber,
        crmContactId: evt.crmContactId,
        channel: 'VOICE' as InteractionType,
        context: {
          callId: evt.callId,
          toNumber: evt.toNumber,
          ivrTreeId: evt.ivrTreeId,
          ivrDigits: evt.ivrDigits,
        },
      };

      const entry = this.ccManager.enqueue(queueId, caller, {
        priority: this.resolveCallPriority(evt),
        interactionId: evt.callId,
        tags: this.buildCallTags(evt),
      });

      if (entry) {
        this.callEntryMap.set(evt.callId, { queueId, entryId: entry.id });
        this.ctx.logger.info(`[CC Bridge] Inbound call ${evt.callId} enqueued → ${queueId} at position ${entry.position}`);
      }
    });

    // ── Call Answered → Track Agent ─────────────────────────────────
    // When an agent accepts a queue entry, the CC engine emits
    // queue:entry-connected. We map the call to the agent so we can
    // trigger wrap-up when the call ends.
    this.ctx.bus.on('queue:entry-connected', (evt: any) => {
      // Find the call ID from entry's interactionId
      for (const [callId, mapping] of this.callEntryMap.entries()) {
        if (mapping.entryId === evt.entryId) {
          this.callAgentMap.set(callId, evt.agentId);
          break;
        }
      }
    });

    // ── Call Completed → Agent Wrap-Up ──────────────────────────────
    this.ctx.bus.on('call:completed', (evt: any) => {
      this.handleCallEnd(evt.callId, 'completed');
    });

    this.ctx.bus.on('call:in_progress', (evt: any) => {
      // Call was answered — if this call is in a queue, update call status
      const mapping = this.callEntryMap.get(evt.callId);
      if (mapping) {
        this.ctx.logger.info(`[CC Bridge] Call ${evt.callId} answered — queue entry ${mapping.entryId} connected`);
      }
    });

    // ── Caller Hung Up While Waiting → Abandon ─────────────────────
    this.ctx.bus.on('call:cancelled', (evt: any) => {
      this.handleCallEnd(evt.callId, 'abandoned');
    });

    this.ctx.bus.on('call:no_answer', (evt: any) => {
      this.handleCallEnd(evt.callId, 'abandoned');
    });

    this.ctx.bus.on('call:failed', (evt: any) => {
      this.handleCallEnd(evt.callId, 'abandoned');
    });

    // ── Agent State Sync ────────────────────────────────────────────
    // When a video room or meeting starts/ends, sync agent availability
    this.ctx.bus.on('room:participant-joined', (evt: any) => {
      // If this user is a CC agent, mark them as in a meeting
      const agent = this.findAgentByUserId(evt.userId);
      if (agent && agent.state === 'AVAILABLE') {
        this.ccManager.changeAgentState(agent.id, 'MEETING');
        this.ctx.logger.info(`[CC Bridge] Agent ${agent.displayName} joined room — state → MEETING`);
      }
    });

    this.ctx.bus.on('room:participant-left', (evt: any) => {
      const agent = this.findAgentByUserId(evt.userId);
      if (agent && agent.state === 'MEETING') {
        this.ccManager.changeAgentState(agent.id, 'AVAILABLE');
        this.ctx.logger.info(`[CC Bridge] Agent ${agent.displayName} left room — state → AVAILABLE`);
      }
    });

    // ── SLA Breach Monitoring ───────────────────────────────────────
    // Periodically check SLA and emit breach events
    setInterval(() => this.checkSlaBreaches(), 30000); // Every 30s

    this.ctx.logger.info('[CC Bridge] Event subscriptions active — telephony ↔ contact centre bridge online');
  }

  // ─── Call Lifecycle Handling ───────────────────────────────────────

  private handleCallEnd(callId: string, reason: 'completed' | 'abandoned'): void {
    const mapping = this.callEntryMap.get(callId);
    if (!mapping) return;

    if (reason === 'abandoned') {
      // Caller hung up while in queue
      this.ccManager.abandon(mapping.entryId);
      this.ctx.logger.info(`[CC Bridge] Call ${callId} abandoned in queue ${mapping.queueId}`);
    } else if (reason === 'completed') {
      // Call completed — trigger agent wrap-up
      const agentId = this.callAgentMap.get(callId);
      if (agentId) {
        this.ccManager.agentCompleteInteraction(agentId, callId);
        this.ctx.logger.info(`[CC Bridge] Call ${callId} completed — agent ${agentId} → WRAP_UP`);

        // Auto wrap-up timeout if configured
        if (this.config.autoWrapUpTimeoutSeconds) {
          const timer = setTimeout(() => {
            this.ccManager.agentWrapUpComplete(agentId);
            this.ctx.logger.info(`[CC Bridge] Auto wrap-up timeout for agent ${agentId}`);
          }, this.config.autoWrapUpTimeoutSeconds * 1000);
          this.wrapUpTimers.set(agentId, timer);
        }
      }
    }

    // Cleanup
    this.callEntryMap.delete(callId);
    this.callAgentMap.delete(callId);
  }

  // ─── Queue Resolution ─────────────────────────────────────────────

  /**
   * Determine which queue an inbound call should enter.
   * Priority: IVR routing → number mapping → default queue.
   */
  private resolveQueueForCall(evt: any): string | null {
    // 1. Check if IVR digits map to a queue
    if (evt.ivrTreeId && evt.ivrDigits && this.config.ivrQueueMapping) {
      const mappingKey = `${evt.ivrTreeId}:${evt.ivrDigits}`;
      if (this.config.ivrQueueMapping[mappingKey]) {
        return this.config.ivrQueueMapping[mappingKey];
      }
    }

    // 2. Check if the IVR tree has a ROUTE node with routeToQueueId
    if (evt.routeToQueueId) {
      return evt.routeToQueueId;
    }

    // 3. Fall back to default queue
    return this.config.defaultQueueId || null;
  }

  /**
   * Determine call priority from event context.
   * VIP callers, emergency lines, or IVR-selected urgency can boost priority.
   */
  private resolveCallPriority(evt: any): InteractionPriority {
    if (evt.isEmergency) return 'EMERGENCY';
    if (evt.isVip || evt.crmContactId) return 'HIGH'; // Known CRM contacts get priority
    if (evt.ivrDigits === '0') return 'HIGH'; // "Press 0 for urgent" pattern
    return this.config.defaultPriority || 'NORMAL';
  }

  /**
   * Build tags for the queue entry from call context.
   * These tags are used by the ACD for priority-agent matching and
   * by the CRM connector for screen pop data.
   */
  private buildCallTags(evt: any): string[] {
    const tags: string[] = [];
    if (evt.fromNumber) tags.push(`caller:${evt.fromNumber}`);
    if (evt.toNumber) tags.push(`dialed:${evt.toNumber}`);
    if (evt.ivrTreeId) tags.push(`ivr:${evt.ivrTreeId}`);
    if (evt.ivrDigits) tags.push(`digits:${evt.ivrDigits}`);
    if (evt.crmContactId) tags.push(`crm:${evt.crmContactId}`);
    if (evt.preferredAgent) tags.push(`preferred-agent:${evt.preferredAgent}`);
    if (evt.language) tags.push(`language:${evt.language}`);
    return tags;
  }

  // ─── Agent Lookup ─────────────────────────────────────────────────

  private findAgentByUserId(userId: string): { id: string; displayName: string; state: string } | null {
    const agents = this.ccManager.getAllAgents();
    const agent = agents.find(a => a.userId === userId);
    if (!agent) return null;
    return { id: agent.id, displayName: agent.displayName, state: agent.state };
  }

  // ─── SLA Monitoring ───────────────────────────────────────────────

  private checkSlaBreaches(): void {
    const slaOverview = this.ccManager.getSlaOverview();
    for (const entry of slaOverview) {
      if (!entry.isMet) {
        this.ctx.bus.emit('queue:sla-breached', {
          queueId: entry.queueId,
          currentPercent: entry.slaPercent,
          targetPercent: entry.target,
          tenantId: '', // Would come from queue
        } as any);
      }
    }
  }

  // ─── Cleanup ──────────────────────────────────────────────────────

  shutdown(): void {
    for (const timer of this.wrapUpTimers.values()) clearTimeout(timer);
    this.wrapUpTimers.clear();
    this.callEntryMap.clear();
    this.callAgentMap.clear();
  }
}

export default ContactCentreEventBridge;
