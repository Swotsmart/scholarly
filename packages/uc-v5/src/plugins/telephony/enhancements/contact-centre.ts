/**
 * Scholarly Unified Communications 4.0 — Contact Centre Engine
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE AIR TRAFFIC CONTROL TOWER
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * An airport without air traffic control is chaos: planes circling
 * endlessly, collisions on the runway, passengers stranded. A contact
 * centre without ACD is the same: callers waiting forever, agents idle
 * while queues build up, no one knowing who should handle what.
 *
 * This engine is the control tower. It manages three interlocking systems:
 *
 *   1. The Queue — where interactions wait for an agent. Like the holding
 *      pattern above the airport. Each queue has its own priority rules,
 *      overflow actions, and SLA targets.
 *
 *   2. The Agent Pool — pilots on duty. Each agent has a state machine
 *      (AVAILABLE → ON_INTERACTION → WRAP_UP → AVAILABLE), skills that
 *      determine which queues they can serve, and capacity limits.
 *
 *   3. The ACD (Automatic Call Distribution) — the controller who decides
 *      which plane lands on which runway. It evaluates the queue, finds
 *      eligible agents, applies the distribution strategy, and makes the
 *      assignment. This happens in milliseconds, not minutes.
 *
 * The engine is interaction-type-agnostic. Right now it routes voice calls.
 * When the omnichannel inbox lands, it will route chats, emails, and
 * WhatsApp messages through the exact same queues and agent pools. The
 * InteractionType field on QueueEntry is the hook for that future.
 *
 * REST endpoints (mounted at /api/telephony/):
 *
 *   ── Queue Management ──
 *   POST   /queues                         Create a queue
 *   GET    /queues                         List queues
 *   GET    /queues/:id                     Get queue details
 *   PUT    /queues/:id                     Update queue
 *   DELETE /queues/:id                     Deactivate queue
 *   GET    /queues/:id/entries             List entries in a queue
 *   POST   /queues/:id/enqueue            Add an interaction to a queue
 *   POST   /queues/:id/entries/:entryId/callback  Request callback
 *
 *   ── Agent Management ──
 *   POST   /agents/login                  Agent logs in (starts shift)
 *   POST   /agents/logout                 Agent logs out (ends shift)
 *   GET    /agents                        List agents with states
 *   GET    /agents/:id                    Get agent details
 *   PUT    /agents/:id/state              Change agent state
 *   PUT    /agents/:id/skills             Update agent skills
 *   PUT    /agents/:id/queues             Update queue assignments
 *   POST   /agents/:id/accept             Agent accepts offered interaction
 *   POST   /agents/:id/reject             Agent rejects offered interaction
 *   POST   /agents/:id/complete           Agent completes interaction
 *   POST   /agents/:id/wrap-up-complete   Agent finishes wrap-up
 *
 *   ── Supervisor / Dashboard ──
 *   GET    /dashboard/queues              All queue metrics (real-time)
 *   GET    /dashboard/queues/:id          Single queue metrics
 *   GET    /dashboard/agents              All agents with live states
 *   GET    /dashboard/sla                 SLA performance across queues
 *   GET    /dashboard/today               Today's aggregate stats
 *
 * Bus events emitted: queue:*, agent:* (16 event types — see types file)
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { PluginContext, PluginCapability } from '../../../core/plugin-interface';
import type {
  Agent, AgentState, AgentSkill, AgentShiftStats,
  Queue, QueueEntry, QueueEntryStatus, QueueMetrics,
  CallerInfo, CallbackRequest, OverflowAction,
  DistributionStrategy, InteractionPriority, InteractionType,
} from './contact-centre-types';

// ─── ACD Router ─────────────────────────────────────────────────────

/**
 * The ACD (Automatic Call Distribution) engine. Given a queue and a pool
 * of agents, it selects the best agent using the queue's distribution
 * strategy. This is the single most important function in the contact
 * centre — it runs on every enqueue and every agent state change.
 *
 * Think of it as a matchmaker: the queue entry describes what's needed,
 * the agent pool describes what's available, and the strategy determines
 * how to pick the best match.
 */
function selectAgent(
  queue: Queue,
  agents: Agent[],
  entry: QueueEntry,
): Agent | null {
  // Filter to eligible agents: available, assigned to this queue, has required skills
  const eligible = agents.filter(a => {
    if (a.state !== 'AVAILABLE') return false;
    if (!a.queueIds.includes(queue.id)) return false;
    if (a.activeInteractionCount >= a.maxConcurrentInteractions) return false;
    // Check required skills
    for (const requiredSkill of queue.requiredSkills) {
      if (!a.skills.some(s => s.skillId === requiredSkill)) return false;
    }
    return true;
  });

  if (eligible.length === 0) return null;

  switch (queue.strategy) {
    case 'ROUND_ROBIN': {
      // Sort by last interaction completed time (oldest first)
      eligible.sort((a, b) => {
        const aTime = a.lastInteractionCompletedAt?.getTime() || 0;
        const bTime = b.lastInteractionCompletedAt?.getTime() || 0;
        return aTime - bTime;
      });
      return eligible[0];
    }

    case 'LEAST_OCCUPIED': {
      eligible.sort((a, b) => a.activeInteractionCount - b.activeInteractionCount);
      return eligible[0];
    }

    case 'LONGEST_IDLE': {
      eligible.sort((a, b) => {
        const aIdle = a.stateChangedAt.getTime();
        const bIdle = b.stateChangedAt.getTime();
        return aIdle - bIdle; // Earliest state change = longest idle
      });
      return eligible[0];
    }

    case 'SKILLS_WEIGHTED': {
      // Score each agent by how many preferred skills they have + proficiency
      const scored = eligible.map(a => {
        let score = 0;
        for (const prefSkill of queue.preferredSkills) {
          const agentSkill = a.skills.find(s => s.skillId === prefSkill);
          if (agentSkill) score += agentSkill.proficiency;
        }
        // Tiebreaker: longest idle
        const idleBonus = (Date.now() - a.stateChangedAt.getTime()) / 60000; // minutes idle
        score += idleBonus * 0.1; // Small bonus per minute idle
        return { agent: a, score };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored[0]?.agent || null;
    }

    case 'PRIORITY_AGENT': {
      // Check if there's a preferred agent in the entry's tags
      const preferredAgentId = entry.tags.find(t => t.startsWith('preferred-agent:'))?.split(':')[1];
      if (preferredAgentId) {
        const preferred = eligible.find(a => a.userId === preferredAgentId);
        if (preferred) return preferred;
      }
      // Fallback to longest idle
      eligible.sort((a, b) => a.stateChangedAt.getTime() - b.stateChangedAt.getTime());
      return eligible[0];
    }

    case 'RANDOM': {
      return eligible[Math.floor(Math.random() * eligible.length)];
    }

    default:
      return eligible[0];
  }
}

// ─── Contact Centre Manager ─────────────────────────────────────────

export class ContactCentreManager {
  private queues: Map<string, Queue> = new Map();
  private agents: Map<string, Agent> = new Map();
  /** Queue entries indexed by queue ID */
  private queueEntries: Map<string, QueueEntry[]> = new Map();
  /** Active interactions: interactionId → { queueId, entryId, agentId } */
  private activeInteractions: Map<string, { queueId: string; entryId: string; agentId: string }> = new Map();
  /** Overflow timers per queue entry */
  private overflowTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  /** Offer timeouts: entryId → timer (agent has N seconds to accept) */
  private offerTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  /** Announcement timers: entryId → timers[] */
  private announcementTimers: Map<string, ReturnType<typeof setTimeout>[]> = new Map();
  /** SLA tracking: queueId → { answered: number, answeredInSla: number } */
  private slaCounters: Map<string, { answered: number; answeredInSla: number; abandoned: number; overflowed: number }> = new Map();
  /** Today counters per queue */
  private dailyCounters: Map<string, QueueMetrics['today']> = new Map();
  /** Agent offer timeout in seconds */
  private offerTimeoutSeconds = 20;
  /** Routing check interval */
  private routingInterval?: ReturnType<typeof setInterval>;

  constructor(private ctx: PluginContext) {}

  // ─── Lifecycle ────────────────────────────────────────────────────

  start(): void {
    // Start the routing loop — runs every 2 seconds to check for unmatched queue entries
    this.routingInterval = setInterval(() => this.routingCycle(), 2000);
    this.ctx.logger.info('[ContactCentre] ACD engine started — routing cycle active');
  }

  stop(): void {
    if (this.routingInterval) clearInterval(this.routingInterval);
    for (const timer of this.overflowTimers.values()) clearTimeout(timer);
    for (const timer of this.offerTimers.values()) clearTimeout(timer);
    for (const timers of this.announcementTimers.values()) timers.forEach(t => clearTimeout(t));
    this.ctx.logger.info('[ContactCentre] ACD engine stopped');
  }

  // ─── Queue Management ─────────────────────────────────────────────

  createQueue(input: Omit<Queue, 'id' | 'isActive' | 'createdAt' | 'updatedAt'>): Queue {
    const queue: Queue = {
      ...input,
      id: uuidv4(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.queues.set(queue.id, queue);
    this.queueEntries.set(queue.id, []);
    this.slaCounters.set(queue.id, { answered: 0, answeredInSla: 0, abandoned: 0, overflowed: 0 });
    this.dailyCounters.set(queue.id, this.emptyDailyCounters());
    return queue;
  }

  updateQueue(id: string, updates: Partial<Queue>): Queue | null {
    const queue = this.queues.get(id);
    if (!queue) return null;
    Object.assign(queue, updates, { updatedAt: new Date() });
    return queue;
  }

  deactivateQueue(id: string): boolean {
    const queue = this.queues.get(id);
    if (!queue) return false;
    queue.isActive = false;
    queue.updatedAt = new Date();
    return true;
  }

  getQueue(id: string): Queue | undefined { return this.queues.get(id); }
  listQueues(): Queue[] { return [...this.queues.values()].filter(q => q.isActive); }

  // ─── Enqueue ──────────────────────────────────────────────────────

  /**
   * Add an interaction to a queue. This is the entry point for every inbound
   * call, chat, email, etc. The ACD immediately tries to find an agent;
   * if none is available, the entry waits in the queue.
   */
  enqueue(
    queueId: string,
    caller: CallerInfo,
    options?: {
      priority?: InteractionPriority;
      interactionId?: string;
      tags?: string[];
    },
  ): QueueEntry | null {
    const queue = this.queues.get(queueId);
    if (!queue || !queue.isActive) return null;

    const entries = this.queueEntries.get(queueId) || [];

    // Check queue depth
    const waitingEntries = entries.filter(e => e.status === 'WAITING' || e.status === 'OFFERED');
    if (waitingEntries.length >= queue.maxQueueDepth) {
      this.ctx.bus.emit('queue:depth-warning', {
        queueId, depth: waitingEntries.length, maxDepth: queue.maxQueueDepth,
        tenantId: queue.tenantId,
      } as any);
      return null; // Caller should be sent to overflow
    }

    const entry: QueueEntry = {
      id: uuidv4(),
      queueId,
      interactionId: options?.interactionId || uuidv4(),
      interactionType: caller.channel,
      caller,
      priority: options?.priority || 'NORMAL',
      enteredAt: new Date(),
      estimatedWaitSeconds: this.estimateWaitTime(queueId),
      position: waitingEntries.length + 1,
      offerAttempts: 0,
      tags: options?.tags || [],
      status: 'WAITING',
      tenantId: queue.tenantId,
    };

    // Insert by priority (EMERGENCY > URGENT > HIGH > NORMAL > LOW)
    const priorityOrder: Record<InteractionPriority, number> = {
      EMERGENCY: 5, URGENT: 4, HIGH: 3, NORMAL: 2, LOW: 1,
    };
    const insertIdx = entries.findIndex(
      e => (e.status === 'WAITING' || e.status === 'OFFERED') &&
           priorityOrder[e.priority] < priorityOrder[entry.priority]
    );
    if (insertIdx >= 0) {
      entries.splice(insertIdx, 0, entry);
    } else {
      entries.push(entry);
    }

    this.queueEntries.set(queueId, entries);
    this.recalculatePositions(queueId);

    this.ctx.bus.emit('queue:entry-added', {
      queueId, entryId: entry.id, interactionType: entry.interactionType,
      position: entry.position, estimatedWait: entry.estimatedWaitSeconds,
      tenantId: queue.tenantId,
    } as any);

    // Set overflow timer
    this.startOverflowTimer(entry, queue);

    // Set announcement timers
    this.startAnnouncementTimers(entry, queue);

    // Immediately try to route
    this.tryRouteEntry(entry, queue);

    return entry;
  }

  /**
   * Caller abandons the queue (hung up).
   */
  abandon(entryId: string): boolean {
    for (const entries of this.queueEntries.values()) {
      const entry = entries.find(e => e.id === entryId);
      if (entry && (entry.status === 'WAITING' || entry.status === 'OFFERED')) {
        entry.status = 'ABANDONED';
        const waitSeconds = (Date.now() - entry.enteredAt.getTime()) / 1000;

        this.clearTimers(entryId);

        const sla = this.slaCounters.get(entry.queueId);
        if (sla) sla.abandoned++;
        const daily = this.dailyCounters.get(entry.queueId);
        if (daily) daily.totalAbandoned++;

        this.ctx.bus.emit('queue:entry-abandoned', {
          queueId: entry.queueId, entryId, waitSeconds, tenantId: entry.tenantId,
        } as any);

        this.recalculatePositions(entry.queueId);
        return true;
      }
    }
    return false;
  }

  /**
   * Request callback instead of waiting.
   */
  requestCallback(entryId: string, callbackNumber: string, preferredTime?: Date): boolean {
    for (const entries of this.queueEntries.values()) {
      const entry = entries.find(e => e.id === entryId);
      if (entry && entry.status === 'WAITING') {
        entry.callbackRequested = {
          callbackNumber,
          preferredTime,
          status: 'PENDING',
        };
        entry.status = 'CALLBACK_PENDING';

        this.clearTimers(entryId);

        const daily = this.dailyCounters.get(entry.queueId);
        if (daily) daily.totalCallbacks++;

        this.ctx.bus.emit('queue:callback-requested', {
          queueId: entry.queueId, entryId, callbackNumber, tenantId: entry.tenantId,
        } as any);

        this.recalculatePositions(entry.queueId);
        return true;
      }
    }
    return false;
  }

  // ─── Agent Management ─────────────────────────────────────────────

  agentLogin(userId: string, displayName: string, tenantId: string, options?: {
    skills?: AgentSkill[];
    queueIds?: string[];
    maxConcurrent?: number;
    teamId?: string;
  }): Agent {
    const existing = [...this.agents.values()].find(a => a.userId === userId);
    if (existing) {
      // Re-login: reset shift stats, set available
      existing.state = 'AVAILABLE';
      existing.stateChangedAt = new Date();
      existing.shiftStats = this.emptyShiftStats();
      if (options?.skills) existing.skills = options.skills;
      if (options?.queueIds) existing.queueIds = options.queueIds;
      this.ctx.bus.emit('agent:logged-in', { agentId: existing.id, tenantId } as any);
      return existing;
    }

    const agent: Agent = {
      id: uuidv4(),
      userId, displayName,
      state: 'AVAILABLE',
      skills: options?.skills || [],
      queueIds: options?.queueIds || [],
      maxConcurrentInteractions: options?.maxConcurrent || 1,
      activeInteractionCount: 0,
      stateChangedAt: new Date(),
      shiftStats: this.emptyShiftStats(),
      tenantId,
      teamId: options?.teamId,
    };

    this.agents.set(agent.id, agent);

    this.ctx.bus.emit('agent:logged-in', { agentId: agent.id, tenantId } as any);

    // Becoming available might match waiting queue entries
    this.routingCycle();

    return agent;
  }

  agentLogout(agentId: string): AgentShiftStats | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const previousState = agent.state;
    agent.state = 'OFFLINE';
    agent.stateChangedAt = new Date();

    // Calculate final break time if currently on break
    if (previousState === 'ON_BREAK') {
      // Could track break start, but shift stats are cumulative
    }

    this.ctx.bus.emit('agent:logged-out', {
      agentId, shiftStats: agent.shiftStats, tenantId: agent.tenantId,
    } as any);

    this.ctx.bus.emit('agent:state-changed', {
      agentId, previousState, newState: 'OFFLINE', tenantId: agent.tenantId,
    } as any);

    return agent.shiftStats;
  }

  changeAgentState(agentId: string, newState: AgentState): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    const previousState = agent.state;

    // Validate state transitions
    const allowed = this.isValidTransition(previousState, newState);
    if (!allowed) return null;

    agent.state = newState;
    agent.stateChangedAt = new Date();

    this.ctx.bus.emit('agent:state-changed', {
      agentId, previousState, newState, tenantId: agent.tenantId,
    } as any);

    // If agent became available, trigger routing cycle
    if (newState === 'AVAILABLE') {
      this.routingCycle();
    }

    return agent;
  }

  private isValidTransition(from: AgentState, to: AgentState): boolean {
    const transitions: Record<AgentState, AgentState[]> = {
      AVAILABLE: ['ON_INTERACTION', 'ON_BREAK', 'TRAINING', 'MEETING', 'OFFLINE'],
      ON_INTERACTION: ['WRAP_UP', 'AVAILABLE', 'OFFLINE'], // AVAILABLE = skip wrap-up
      WRAP_UP: ['AVAILABLE', 'ON_BREAK', 'OFFLINE'],
      ON_BREAK: ['AVAILABLE', 'OFFLINE'],
      TRAINING: ['AVAILABLE', 'ON_BREAK', 'OFFLINE'],
      MEETING: ['AVAILABLE', 'ON_BREAK', 'OFFLINE'],
      OFFLINE: ['AVAILABLE'],
    };
    return transitions[from]?.includes(to) || false;
  }

  updateAgentSkills(agentId: string, skills: AgentSkill[]): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    agent.skills = skills;
    return agent;
  }

  updateAgentQueues(agentId: string, queueIds: string[]): Agent | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;
    agent.queueIds = queueIds;
    // If available, might now be eligible for queued entries
    if (agent.state === 'AVAILABLE') this.routingCycle();
    return agent;
  }

  /**
   * Agent accepts an offered interaction.
   */
  agentAccept(agentId: string): QueueEntry | null {
    const agent = this.agents.get(agentId);
    if (!agent) return null;

    // Find the entry offered to this agent
    for (const entries of this.queueEntries.values()) {
      const entry = entries.find(e => e.offeredToAgentId === agentId && e.status === 'OFFERED');
      if (entry) {
        // Clear offer timer
        this.clearOfferTimer(entry.id);

        // Connect
        entry.status = 'CONNECTED';
        entry.answeredByAgentId = agentId;
        entry.answeredAt = new Date();

        agent.state = 'ON_INTERACTION';
        agent.activeInteractionCount++;
        agent.stateChangedAt = new Date();

        const waitSeconds = (entry.answeredAt.getTime() - entry.enteredAt.getTime()) / 1000;

        // Track interaction
        this.activeInteractions.set(entry.interactionId, {
          queueId: entry.queueId, entryId: entry.id, agentId,
        });

        // SLA tracking
        const sla = this.slaCounters.get(entry.queueId);
        const queue = this.queues.get(entry.queueId);
        if (sla) {
          sla.answered++;
          if (queue && waitSeconds <= queue.slaTarget.timeThresholdSeconds) {
            sla.answeredInSla++;
          }
        }

        // Daily counters
        const daily = this.dailyCounters.get(entry.queueId);
        if (daily) {
          daily.totalAnswered++;
          // Running average wait time
          const n = daily.totalAnswered;
          daily.averageWaitTimeSeconds = ((daily.averageWaitTimeSeconds * (n - 1)) + waitSeconds) / n;
        }

        this.clearTimers(entry.id);
        this.recalculatePositions(entry.queueId);

        this.ctx.bus.emit('queue:entry-connected', {
          queueId: entry.queueId, entryId: entry.id, agentId, waitSeconds,
          tenantId: entry.tenantId,
        } as any);

        this.ctx.bus.emit('agent:interaction-assigned', {
          agentId, queueId: entry.queueId, interactionId: entry.interactionId,
          tenantId: agent.tenantId,
        } as any);

        this.ctx.bus.emit('agent:state-changed', {
          agentId, previousState: 'AVAILABLE', newState: 'ON_INTERACTION',
          tenantId: agent.tenantId,
        } as any);

        return entry;
      }
    }

    return null;
  }

  /**
   * Agent rejects an offered interaction — return to queue for re-routing.
   */
  agentReject(agentId: string): boolean {
    for (const entries of this.queueEntries.values()) {
      const entry = entries.find(e => e.offeredToAgentId === agentId && e.status === 'OFFERED');
      if (entry) {
        this.clearOfferTimer(entry.id);
        entry.status = 'WAITING';
        entry.offeredToAgentId = undefined;
        entry.offeredAt = undefined;
        entry.offerAttempts++;
        this.recalculatePositions(entry.queueId);
        // Try routing again immediately
        const queue = this.queues.get(entry.queueId);
        if (queue) this.tryRouteEntry(entry, queue);
        return true;
      }
    }
    return false;
  }

  /**
   * Agent completes an interaction — transition to WRAP_UP.
   */
  agentCompleteInteraction(agentId: string, interactionId: string, notes?: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent) return false;

    const tracking = this.activeInteractions.get(interactionId);
    if (!tracking || tracking.agentId !== agentId) return false;

    // Find the entry
    const entries = this.queueEntries.get(tracking.queueId);
    const entry = entries?.find(e => e.id === tracking.entryId);

    if (entry) {
      entry.status = 'COMPLETED';
      const handleTimeSeconds = entry.answeredAt
        ? (Date.now() - entry.answeredAt.getTime()) / 1000
        : 0;

      // Daily counters
      const daily = this.dailyCounters.get(entry.queueId);
      if (daily) {
        const n = daily.totalAnswered;
        daily.averageHandleTimeSeconds = ((daily.averageHandleTimeSeconds * (n - 1)) + handleTimeSeconds) / n;
      }

      this.ctx.bus.emit('queue:entry-completed', {
        queueId: entry.queueId, entryId: entry.id, agentId,
        handleTimeSeconds: Math.round(handleTimeSeconds), tenantId: entry.tenantId,
      } as any);
    }

    this.activeInteractions.delete(interactionId);

    // Transition agent to wrap-up
    const previousState = agent.state;
    agent.state = 'WRAP_UP';
    agent.activeInteractionCount = Math.max(0, agent.activeInteractionCount - 1);
    agent.stateChangedAt = new Date();
    agent.shiftStats.interactionsHandled++;

    this.ctx.bus.emit('agent:wrap-up-started', {
      agentId, interactionId, tenantId: agent.tenantId,
    } as any);

    this.ctx.bus.emit('agent:state-changed', {
      agentId, previousState, newState: 'WRAP_UP', tenantId: agent.tenantId,
    } as any);

    return true;
  }

  /**
   * Agent finishes wrap-up — back to AVAILABLE.
   */
  agentWrapUpComplete(agentId: string): boolean {
    const agent = this.agents.get(agentId);
    if (!agent || agent.state !== 'WRAP_UP') return false;

    const wrapUpSeconds = (Date.now() - agent.stateChangedAt.getTime()) / 1000;
    agent.shiftStats.totalWrapUpTimeSeconds += wrapUpSeconds;

    agent.state = 'AVAILABLE';
    agent.stateChangedAt = new Date();
    agent.lastInteractionCompletedAt = new Date();

    this.ctx.bus.emit('agent:wrap-up-completed', {
      agentId, interactionId: '', wrapUpSeconds: Math.round(wrapUpSeconds),
      tenantId: agent.tenantId,
    } as any);

    this.ctx.bus.emit('agent:state-changed', {
      agentId, previousState: 'WRAP_UP', newState: 'AVAILABLE',
      tenantId: agent.tenantId,
    } as any);

    // Now available — trigger routing
    this.routingCycle();

    return true;
  }

  // ─── ACD Routing Cycle ────────────────────────────────────────────

  /**
   * The heartbeat of the contact centre. Runs every 2 seconds (and on
   * demand when agents become available). Scans all queues for WAITING
   * entries and attempts to route them to eligible agents.
   */
  private routingCycle(): void {
    const allAgents = [...this.agents.values()];

    for (const queue of this.queues.values()) {
      if (!queue.isActive) continue;

      const entries = this.queueEntries.get(queue.id) || [];
      const waiting = entries.filter(e => e.status === 'WAITING');

      for (const entry of waiting) {
        this.tryRouteEntry(entry, queue, allAgents);
      }

      // Also process callbacks
      const callbacks = entries.filter(e => e.status === 'CALLBACK_PENDING');
      for (const cb of callbacks) {
        this.tryRouteEntry(cb, queue, allAgents);
      }
    }
  }

  private tryRouteEntry(entry: QueueEntry, queue: Queue, allAgents?: Agent[]): void {
    const agents = allAgents || [...this.agents.values()];
    const selected = selectAgent(queue, agents, entry);

    if (selected) {
      this.offerToAgent(entry, selected, queue);
    }
  }

  private offerToAgent(entry: QueueEntry, agent: Agent, queue: Queue): void {
    entry.status = 'OFFERED';
    entry.offeredToAgentId = agent.id;
    entry.offeredAt = new Date();

    this.ctx.bus.emit('queue:entry-offered', {
      queueId: queue.id, entryId: entry.id, agentId: agent.id,
      tenantId: queue.tenantId,
    } as any);

    // Set offer timeout — if agent doesn't accept in N seconds, re-queue
    const timer = setTimeout(() => {
      if (entry.status === 'OFFERED' && entry.offeredToAgentId === agent.id) {
        entry.status = 'WAITING';
        entry.offeredToAgentId = undefined;
        entry.offeredAt = undefined;
        entry.offerAttempts++;
        this.recalculatePositions(entry.queueId);
        // Try next agent
        this.tryRouteEntry(entry, queue);
      }
    }, this.offerTimeoutSeconds * 1000);

    this.offerTimers.set(entry.id, timer);
  }

  // ─── Overflow & Announcements ─────────────────────────────────────

  private startOverflowTimer(entry: QueueEntry, queue: Queue): void {
    if (queue.maxWaitTimeSeconds <= 0) return;

    const timer = setTimeout(() => {
      if (entry.status !== 'WAITING' && entry.status !== 'OFFERED') return;

      entry.status = 'OVERFLOWED';
      const sla = this.slaCounters.get(queue.id);
      if (sla) sla.overflowed++;
      const daily = this.dailyCounters.get(queue.id);
      if (daily) daily.totalOverflowed++;

      this.ctx.bus.emit('queue:entry-overflowed', {
        queueId: queue.id, entryId: entry.id,
        action: queue.overflowAction.type, tenantId: queue.tenantId,
      } as any);

      this.recalculatePositions(queue.id);
    }, queue.maxWaitTimeSeconds * 1000);

    this.overflowTimers.set(entry.id, timer);
  }

  private startAnnouncementTimers(entry: QueueEntry, queue: Queue): void {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const ann of queue.announcements) {
      const timer = setTimeout(() => {
        if (entry.status !== 'WAITING') return;
        // In production, this would trigger audio playback to the caller
        // Here we emit an event that the telephony plugin's TwiML can use
        this.ctx.bus.emit('queue:announcement', {
          queueId: queue.id, entryId: entry.id,
          message: ann.message, audioUrl: ann.audioUrl,
          estimatedWait: this.estimateWaitTime(queue.id),
          offerCallback: ann.offerCallback,
        } as any);
      }, ann.afterSeconds * 1000);
      timers.push(timer);
    }
    this.announcementTimers.set(entry.id, timers);
  }

  private clearTimers(entryId: string): void {
    this.clearOfferTimer(entryId);
    const overflow = this.overflowTimers.get(entryId);
    if (overflow) { clearTimeout(overflow); this.overflowTimers.delete(entryId); }
    const anns = this.announcementTimers.get(entryId);
    if (anns) { anns.forEach(t => clearTimeout(t)); this.announcementTimers.delete(entryId); }
  }

  private clearOfferTimer(entryId: string): void {
    const timer = this.offerTimers.get(entryId);
    if (timer) { clearTimeout(timer); this.offerTimers.delete(entryId); }
  }

  // ─── Position & Wait Time ─────────────────────────────────────────

  private recalculatePositions(queueId: string): void {
    const entries = this.queueEntries.get(queueId) || [];
    let position = 1;
    for (const entry of entries) {
      if (entry.status === 'WAITING' || entry.status === 'OFFERED') {
        entry.position = position++;
        entry.estimatedWaitSeconds = this.estimateWaitTimeForPosition(queueId, entry.position);
      }
    }
  }

  private estimateWaitTime(queueId: string): number {
    const entries = this.queueEntries.get(queueId) || [];
    const waiting = entries.filter(e => e.status === 'WAITING' || e.status === 'OFFERED');
    return this.estimateWaitTimeForPosition(queueId, waiting.length + 1);
  }

  private estimateWaitTimeForPosition(queueId: string, position: number): number {
    // Estimate based on: available agents, average handle time, position
    const queue = this.queues.get(queueId);
    if (!queue) return 0;

    const availableAgents = [...this.agents.values()].filter(
      a => a.state === 'AVAILABLE' && a.queueIds.includes(queueId)
    ).length;

    const daily = this.dailyCounters.get(queueId);
    const avgHandle = daily?.averageHandleTimeSeconds || 180; // Default 3 min

    if (availableAgents === 0) {
      // No agents: estimate based on current agents completing their interactions
      const busyAgents = [...this.agents.values()].filter(
        a => a.state === 'ON_INTERACTION' && a.queueIds.includes(queueId)
      ).length;
      return busyAgents > 0 ? Math.round((position / busyAgents) * avgHandle) : 300;
    }

    // With agents available: roughly position / agents × handle time
    return Math.round((position / availableAgents) * avgHandle);
  }

  // ─── Dashboard Metrics ────────────────────────────────────────────

  getQueueMetrics(queueId: string): QueueMetrics | null {
    const queue = this.queues.get(queueId);
    if (!queue) return null;

    const entries = this.queueEntries.get(queueId) || [];
    const waiting = entries.filter(e => e.status === 'WAITING' || e.status === 'OFFERED');
    const active = entries.filter(e => e.status === 'CONNECTED');
    const callbacks = entries.filter(e => e.status === 'CALLBACK_PENDING');

    const now = Date.now();
    const waitTimes = waiting.map(e => (now - e.enteredAt.getTime()) / 1000);
    const longestWait = waitTimes.length > 0 ? Math.max(...waitTimes) : 0;
    const avgWait = waitTimes.length > 0 ? waitTimes.reduce((s, w) => s + w, 0) / waitTimes.length : 0;

    const assignedAgents = [...this.agents.values()].filter(a => a.queueIds.includes(queueId));
    const agentStates = {
      total: assignedAgents.length,
      available: assignedAgents.filter(a => a.state === 'AVAILABLE').length,
      onInteraction: assignedAgents.filter(a => a.state === 'ON_INTERACTION').length,
      wrapUp: assignedAgents.filter(a => a.state === 'WRAP_UP').length,
      onBreak: assignedAgents.filter(a => a.state === 'ON_BREAK').length,
      offline: assignedAgents.filter(a => a.state === 'OFFLINE').length,
    };

    const sla = this.slaCounters.get(queueId) || { answered: 0, answeredInSla: 0, abandoned: 0, overflowed: 0 };
    const slaPercent = sla.answered > 0 ? (sla.answeredInSla / sla.answered) * 100 : 100;

    const daily = this.dailyCounters.get(queueId) || this.emptyDailyCounters();
    const totalOffered = daily.totalAnswered + daily.totalAbandoned + daily.totalOverflowed;
    daily.totalOffered = totalOffered;
    daily.answerRate = totalOffered > 0 ? daily.totalAnswered / totalOffered : 1;
    daily.abandonRate = totalOffered > 0 ? daily.totalAbandoned / totalOffered : 0;

    return {
      queueId, queueName: queue.name, timestamp: new Date(),
      current: {
        waitingCount: waiting.length, longestWaitSeconds: Math.round(longestWait),
        averageWaitSeconds: Math.round(avgWait), activeInteractions: active.length,
        offeredCount: waiting.filter(e => e.status === 'OFFERED').length,
        callbacksPending: callbacks.length,
      },
      agents: agentStates,
      sla: {
        targetPercent: queue.slaTarget.percentageThreshold,
        targetSeconds: queue.slaTarget.timeThresholdSeconds,
        currentPercent: Math.round(slaPercent * 10) / 10,
        isMet: slaPercent >= queue.slaTarget.percentageThreshold,
      },
      today: { ...daily },
    };
  }

  getAllQueueMetrics(): QueueMetrics[] {
    return this.listQueues().map(q => this.getQueueMetrics(q.id)!).filter(Boolean);
  }

  getAllAgents(): Agent[] {
    return [...this.agents.values()];
  }

  getAgent(agentId: string): Agent | undefined {
    return this.agents.get(agentId);
  }

  getSlaOverview(): { queueId: string; queueName: string; slaPercent: number; isMet: boolean; target: number }[] {
    return this.listQueues().map(q => {
      const sla = this.slaCounters.get(q.id);
      const pct = sla && sla.answered > 0 ? (sla.answeredInSla / sla.answered) * 100 : 100;
      return {
        queueId: q.id, queueName: q.name,
        slaPercent: Math.round(pct * 10) / 10,
        isMet: pct >= q.slaTarget.percentageThreshold,
        target: q.slaTarget.percentageThreshold,
      };
    });
  }

  getTodayAggregate(): {
    totalInteractions: number; totalAnswered: number; totalAbandoned: number;
    overallAnswerRate: number; overallAbandonRate: number;
    averageWaitSeconds: number; averageHandleSeconds: number;
    activeAgents: number; activeQueues: number;
  } {
    let totalInteractions = 0, totalAnswered = 0, totalAbandoned = 0;
    let totalWait = 0, totalHandle = 0, waitCount = 0, handleCount = 0;

    for (const daily of this.dailyCounters.values()) {
      totalInteractions += daily.totalOffered;
      totalAnswered += daily.totalAnswered;
      totalAbandoned += daily.totalAbandoned;
      if (daily.totalAnswered > 0) {
        totalWait += daily.averageWaitTimeSeconds * daily.totalAnswered;
        totalHandle += daily.averageHandleTimeSeconds * daily.totalAnswered;
        waitCount += daily.totalAnswered;
        handleCount += daily.totalAnswered;
      }
    }

    return {
      totalInteractions, totalAnswered, totalAbandoned,
      overallAnswerRate: totalInteractions > 0 ? totalAnswered / totalInteractions : 1,
      overallAbandonRate: totalInteractions > 0 ? totalAbandoned / totalInteractions : 0,
      averageWaitSeconds: waitCount > 0 ? Math.round(totalWait / waitCount) : 0,
      averageHandleSeconds: handleCount > 0 ? Math.round(totalHandle / handleCount) : 0,
      activeAgents: [...this.agents.values()].filter(a => a.state !== 'OFFLINE').length,
      activeQueues: this.listQueues().length,
    };
  }

  // ─── Queue Entries Query ──────────────────────────────────────────

  getQueueEntries(queueId: string, status?: QueueEntryStatus): QueueEntry[] {
    const entries = this.queueEntries.get(queueId) || [];
    return status ? entries.filter(e => e.status === status) : entries;
  }

  // ─── Helpers ──────────────────────────────────────────────────────

  private emptyShiftStats(): AgentShiftStats {
    return {
      shiftStartedAt: new Date(),
      interactionsHandled: 0,
      totalHandleTimeSeconds: 0,
      totalWrapUpTimeSeconds: 0,
      totalBreakTimeSeconds: 0,
      averageHandleTimeSeconds: 0,
    };
  }

  private emptyDailyCounters(): QueueMetrics['today'] {
    return {
      totalOffered: 0, totalAnswered: 0, totalAbandoned: 0,
      totalOverflowed: 0, totalCallbacks: 0,
      averageHandleTimeSeconds: 0, averageWaitTimeSeconds: 0,
      abandonRate: 0, answerRate: 1,
    };
  }

  // ─── Capabilities ─────────────────────────────────────────────────

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'cc.queues', label: 'Call Queues', description: 'Manage call queues and routing', icon: 'PhoneForwarded', routePath: '/queues', requiredRoles: ['admin', 'supervisor'] },
      { key: 'cc.agents', label: 'Agent Management', description: 'Monitor agent availability', icon: 'Headphones', routePath: '/agents', requiredRoles: ['admin', 'supervisor'] },
      { key: 'cc.dashboard', label: 'Queue Dashboard', description: 'Real-time queue metrics', icon: 'BarChart', routePath: '/dashboard', requiredRoles: ['admin', 'supervisor'] },
    ];
  }

  // ─── REST Router ──────────────────────────────────────────────────

  createRouter(): Router {
    const r = Router();

    // ── Queue Management ───────────────────────────────────────────
    r.post('/queues', (req: Request, res: Response) => {
      try {
        const queue = this.createQueue(req.body);
        res.status(201).json(queue);
      } catch (err: any) {
        res.status(400).json({ error: err.message });
      }
    });

    r.get('/queues', (_req: Request, res: Response) => {
      res.json({ queues: this.listQueues() });
    });

    r.get('/queues/:id', (req: Request, res: Response) => {
      const queue = this.getQueue(req.params.id);
      if (!queue) return res.status(404).json({ error: 'Queue not found' });
      res.json(queue);
    });

    r.put('/queues/:id', (req: Request, res: Response) => {
      const queue = this.updateQueue(req.params.id, req.body);
      if (!queue) return res.status(404).json({ error: 'Queue not found' });
      res.json(queue);
    });

    r.delete('/queues/:id', (req: Request, res: Response) => {
      if (!this.deactivateQueue(req.params.id)) return res.status(404).json({ error: 'Queue not found' });
      res.json({ deactivated: true });
    });

    r.get('/queues/:id/entries', (req: Request, res: Response) => {
      const status = req.query.status as QueueEntryStatus | undefined;
      const entries = this.getQueueEntries(req.params.id, status);
      res.json({ queueId: req.params.id, entries, total: entries.length });
    });

    r.post('/queues/:id/enqueue', (req: Request, res: Response) => {
      const { caller, priority, interactionId, tags } = req.body;
      if (!caller?.identifier) return res.status(400).json({ error: 'caller.identifier required' });
      const entry = this.enqueue(req.params.id, caller, { priority, interactionId, tags });
      if (!entry) return res.status(400).json({ error: 'Queue is full, inactive, or not found' });
      res.status(201).json(entry);
    });

    r.post('/queues/:id/entries/:entryId/callback', (req: Request, res: Response) => {
      const { callbackNumber, preferredTime } = req.body;
      if (!callbackNumber) return res.status(400).json({ error: 'callbackNumber required' });
      const ok = this.requestCallback(req.params.entryId, callbackNumber, preferredTime ? new Date(preferredTime) : undefined);
      if (!ok) return res.status(404).json({ error: 'Entry not found or not in WAITING state' });
      res.json({ callbackRequested: true });
    });

    r.post('/queues/entries/:entryId/abandon', (req: Request, res: Response) => {
      if (!this.abandon(req.params.entryId)) return res.status(404).json({ error: 'Entry not found' });
      res.json({ abandoned: true });
    });

    // ── Agent Management ───────────────────────────────────────────
    r.post('/agents/login', (req: Request, res: Response) => {
      const { userId, displayName, tenantId, skills, queueIds, maxConcurrent, teamId } = req.body;
      if (!userId || !displayName) return res.status(400).json({ error: 'userId and displayName required' });
      const agent = this.agentLogin(userId, displayName, tenantId || '__default__', { skills, queueIds, maxConcurrent, teamId });
      res.json(agent);
    });

    r.post('/agents/logout', (req: Request, res: Response) => {
      const { agentId } = req.body;
      const stats = this.agentLogout(agentId);
      if (!stats) return res.status(404).json({ error: 'Agent not found' });
      res.json({ loggedOut: true, shiftStats: stats });
    });

    r.get('/agents', (req: Request, res: Response) => {
      let agents = this.getAllAgents();
      if (req.query.state) agents = agents.filter(a => a.state === req.query.state);
      if (req.query.queueId) agents = agents.filter(a => a.queueIds.includes(req.query.queueId as string));
      res.json({ agents, total: agents.length });
    });

    r.get('/agents/:id', (req: Request, res: Response) => {
      const agent = this.getAgent(req.params.id);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      res.json(agent);
    });

    r.put('/agents/:id/state', (req: Request, res: Response) => {
      const { state } = req.body;
      if (!state) return res.status(400).json({ error: 'state required' });
      const agent = this.changeAgentState(req.params.id, state);
      if (!agent) return res.status(400).json({ error: 'Invalid state transition or agent not found' });
      res.json(agent);
    });

    r.put('/agents/:id/skills', (req: Request, res: Response) => {
      const { skills } = req.body;
      const agent = this.updateAgentSkills(req.params.id, skills || []);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      res.json(agent);
    });

    r.put('/agents/:id/queues', (req: Request, res: Response) => {
      const { queueIds } = req.body;
      const agent = this.updateAgentQueues(req.params.id, queueIds || []);
      if (!agent) return res.status(404).json({ error: 'Agent not found' });
      res.json(agent);
    });

    r.post('/agents/:id/accept', (req: Request, res: Response) => {
      const entry = this.agentAccept(req.params.id);
      if (!entry) return res.status(404).json({ error: 'No interaction offered to this agent' });
      res.json({ connected: true, entry });
    });

    r.post('/agents/:id/reject', (req: Request, res: Response) => {
      if (!this.agentReject(req.params.id)) return res.status(404).json({ error: 'No interaction offered to this agent' });
      res.json({ rejected: true, requeued: true });
    });

    r.post('/agents/:id/complete', (req: Request, res: Response) => {
      const { interactionId, notes } = req.body;
      if (!interactionId) return res.status(400).json({ error: 'interactionId required' });
      if (!this.agentCompleteInteraction(req.params.id, interactionId, notes)) {
        return res.status(400).json({ error: 'Interaction not found or not assigned to this agent' });
      }
      res.json({ completed: true, state: 'WRAP_UP' });
    });

    r.post('/agents/:id/wrap-up-complete', (req: Request, res: Response) => {
      if (!this.agentWrapUpComplete(req.params.id)) {
        return res.status(400).json({ error: 'Agent not in WRAP_UP state' });
      }
      res.json({ wrapUpComplete: true, state: 'AVAILABLE' });
    });

    // ── Supervisor Dashboard ───────────────────────────────────────
    r.get('/dashboard/queues', (_req: Request, res: Response) => {
      res.json({ queues: this.getAllQueueMetrics() });
    });

    r.get('/dashboard/queues/:id', (req: Request, res: Response) => {
      const metrics = this.getQueueMetrics(req.params.id);
      if (!metrics) return res.status(404).json({ error: 'Queue not found' });
      res.json(metrics);
    });

    r.get('/dashboard/agents', (req: Request, res: Response) => {
      const agents = this.getAllAgents();
      const summary = {
        total: agents.length,
        byState: {} as Record<string, number>,
      };
      for (const agent of agents) {
        summary.byState[agent.state] = (summary.byState[agent.state] || 0) + 1;
      }
      res.json({ agents, summary });
    });

    r.get('/dashboard/sla', (_req: Request, res: Response) => {
      res.json({ sla: this.getSlaOverview() });
    });

    r.get('/dashboard/today', (_req: Request, res: Response) => {
      res.json(this.getTodayAggregate());
    });

    return r;
  }

  // ─── Health ───────────────────────────────────────────────────────

  getHealth(): {
    activeQueues: number; totalAgents: number; availableAgents: number;
    totalWaiting: number; activeInteractions: number;
  } {
    let totalWaiting = 0;
    for (const entries of this.queueEntries.values()) {
      totalWaiting += entries.filter(e => e.status === 'WAITING' || e.status === 'OFFERED').length;
    }
    const agents = [...this.agents.values()];
    return {
      activeQueues: this.listQueues().length,
      totalAgents: agents.length,
      availableAgents: agents.filter(a => a.state === 'AVAILABLE').length,
      totalWaiting,
      activeInteractions: this.activeInteractions.size,
    };
  }
}

export default ContactCentreManager;
