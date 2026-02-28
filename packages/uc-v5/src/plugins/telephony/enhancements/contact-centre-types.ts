/**
 * Scholarly Unified Communications 4.0 — Contact Centre Type System
 *
 * ═══════════════════════════════════════════════════════════════════════════
 *  THE VOCABULARY OF A CONTACT CENTRE
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Before building the engine, we need to agree on the words. A contact
 * centre has a precise vocabulary that maps to specific data structures:
 *
 *   Queue       — A waiting line. Callers enter, agents serve.
 *   Agent       — A human who handles interactions. Has states, skills, limits.
 *   Skill       — A capability tag: "Spanish", "Tier-2 Support", "Billing".
 *   Interaction — A broader term than "call". An interaction can be a voice
 *                 call today, and a chat/email/WhatsApp message when the
 *                 omnichannel inbox lands. The contact centre treats them
 *                 uniformly.
 *   ACD         — Automatic Call Distribution. The brain that decides which
 *                 agent gets the next interaction, based on strategy.
 *   Wrap-Up     — Post-interaction time for agents to log notes, update CRM.
 *   SLA         — Service Level Agreement. "80% of calls answered in 20s."
 *
 * These types are deliberately interaction-agnostic. The same queue, agent,
 * and routing model will serve voice calls now and chat/email/WhatsApp when
 * the omnichannel inbox is built. We're laying the rail gauge for a train
 * system where multiple types of trains will eventually run.
 */

// ─── Agent Model ────────────────────────────────────────────────────

/** Agent presence states — the lifecycle of availability */
export type AgentState =
  | 'AVAILABLE'     // Ready to accept interactions
  | 'ON_INTERACTION' // Currently handling an interaction
  | 'WRAP_UP'       // Post-interaction note-taking time
  | 'ON_BREAK'      // Scheduled break
  | 'TRAINING'      // In a training session (visible to supervisors)
  | 'MEETING'       // In a meeting (not available for routing)
  | 'OFFLINE';      // Signed out

export interface Agent {
  id: string;
  userId: string;
  displayName: string;
  state: AgentState;
  /** Skills this agent possesses, with proficiency level (1-10) */
  skills: AgentSkill[];
  /** Queue IDs this agent is assigned to */
  queueIds: string[];
  /** Maximum concurrent interactions (1 for voice, potentially >1 for chat) */
  maxConcurrentInteractions: number;
  /** Current active interaction count */
  activeInteractionCount: number;
  /** Timestamp of last state change */
  stateChangedAt: Date;
  /** Timestamp of last interaction completion (for idle-time routing) */
  lastInteractionCompletedAt?: Date;
  /** Cumulative stats for the current shift */
  shiftStats: AgentShiftStats;
  /** Tenant and team grouping */
  tenantId: string;
  teamId?: string;
  /** Custom metadata (CRM user ID, extension number, etc.) */
  metadata?: Record<string, unknown>;
}

export interface AgentSkill {
  skillId: string;
  name: string;
  proficiency: number; // 1 (basic) to 10 (expert)
}

export interface AgentShiftStats {
  /** When the agent logged in for this shift */
  shiftStartedAt: Date;
  /** Total interactions handled this shift */
  interactionsHandled: number;
  /** Total talk/handle time in seconds */
  totalHandleTimeSeconds: number;
  /** Total wrap-up time in seconds */
  totalWrapUpTimeSeconds: number;
  /** Total break time in seconds */
  totalBreakTimeSeconds: number;
  /** Average handle time in seconds */
  averageHandleTimeSeconds: number;
}

// ─── Queue Model ────────────────────────────────────────────────────

/** Distribution strategy — how the ACD selects an agent */
export type DistributionStrategy =
  | 'ROUND_ROBIN'       // Rotate through agents in order
  | 'LEAST_OCCUPIED'    // Agent with fewest active interactions
  | 'LONGEST_IDLE'      // Agent who has been available longest
  | 'SKILLS_WEIGHTED'   // Best skill match × availability
  | 'PRIORITY_AGENT'    // Specific preferred agent, fallback to others
  | 'RANDOM';           // Random selection (useful for load testing)

/** Priority levels for queue entries */
export type InteractionPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT' | 'EMERGENCY';

export interface Queue {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  /** Distribution strategy for this queue */
  strategy: DistributionStrategy;
  /** Required skills — an agent must have ALL of these to be eligible */
  requiredSkills: string[];
  /** Preferred skills — agents with these rank higher but aren't required */
  preferredSkills: string[];
  /** Maximum time a caller waits before overflow action (seconds) */
  maxWaitTimeSeconds: number;
  /** What happens when max wait time is exceeded */
  overflowAction: OverflowAction;
  /** SLA target: percentage of interactions answered within N seconds */
  slaTarget: { percentageThreshold: number; timeThresholdSeconds: number };
  /** Music/message on hold configuration */
  holdConfig: HoldConfig;
  /** Position announcements */
  announcements: QueueAnnouncement[];
  /** Operating hours — null means 24/7 */
  operatingHours?: OperatingHours;
  /** What happens outside operating hours */
  afterHoursAction: OverflowAction;
  /** Maximum queue depth before rejecting new entries */
  maxQueueDepth: number;
  /** Whether this queue is active */
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface OverflowAction {
  type: 'VOICEMAIL' | 'TRANSFER_QUEUE' | 'TRANSFER_NUMBER' | 'ANNOUNCEMENT' | 'CALLBACK_OFFER' | 'DISCONNECT';
  /** Target queue ID for TRANSFER_QUEUE */
  targetQueueId?: string;
  /** Target phone number for TRANSFER_NUMBER */
  targetNumber?: string;
  /** Message to play */
  message?: string;
  /** Audio URL */
  audioUrl?: string;
}

export interface HoldConfig {
  /** Music-on-hold audio URL (loop) */
  musicUrl?: string;
  /** Estimated wait message frequency (seconds) */
  estimatedWaitAnnouncementInterval: number;
  /** Position-in-queue announcement enabled */
  positionAnnouncementEnabled: boolean;
}

export interface QueueAnnouncement {
  /** When to play: after N seconds in queue */
  afterSeconds: number;
  /** Message text (TTS) or audio URL */
  message?: string;
  audioUrl?: string;
  /** Whether to offer callback */
  offerCallback: boolean;
}

export interface OperatingHours {
  timezone: string;
  /** Per-day schedules (0=Sun, 6=Sat). Missing days = closed */
  schedule: Record<number, { open: string; close: string }>;
  /** Holiday overrides (ISO date → closed or custom hours) */
  holidays?: Record<string, { closed: boolean; open?: string; close?: string }>;
}

// ─── Queue Entry (Caller in the Queue) ──────────────────────────────

export interface QueueEntry {
  id: string;
  queueId: string;
  /** The interaction being queued */
  interactionId: string;
  interactionType: InteractionType;
  /** Caller/customer information */
  caller: CallerInfo;
  /** Priority in the queue */
  priority: InteractionPriority;
  /** When the entry was added to the queue */
  enteredAt: Date;
  /** Estimated wait time in seconds (computed dynamically) */
  estimatedWaitSeconds: number;
  /** Position in queue (1-based) */
  position: number;
  /** How many times this entry has been offered to agents and declined */
  offerAttempts: number;
  /** Currently offered to this agent (null if waiting in queue) */
  offeredToAgentId?: string;
  offeredAt?: Date;
  /** Tags for CRM/context enrichment */
  tags: string[];
  /** Callback request if the caller opted for callback */
  callbackRequested?: CallbackRequest;
  /** Status */
  status: QueueEntryStatus;
  /** If answered: which agent */
  answeredByAgentId?: string;
  answeredAt?: Date;
  tenantId: string;
}

export type QueueEntryStatus =
  | 'WAITING'         // In queue, not yet offered
  | 'OFFERED'         // Offered to an agent, awaiting acceptance
  | 'CONNECTED'       // Connected to an agent
  | 'CALLBACK_PENDING'// Caller requested callback, waiting for agent
  | 'ABANDONED'       // Caller hung up while waiting
  | 'OVERFLOWED'      // Max wait exceeded, overflow action taken
  | 'COMPLETED';      // Interaction completed

export type InteractionType = 'VOICE' | 'CHAT' | 'EMAIL' | 'SMS' | 'WHATSAPP' | 'SOCIAL' | 'VIDEO';

export interface CallerInfo {
  /** Phone number, email, or channel-specific identifier */
  identifier: string;
  /** Display name (from CRM lookup or caller ID) */
  displayName?: string;
  /** CRM contact ID if matched */
  crmContactId?: string;
  /** Channel the interaction originated from */
  channel: InteractionType;
  /** Customer context from IVR, previous interactions, CRM */
  context?: Record<string, unknown>;
}

export interface CallbackRequest {
  /** Number to call back */
  callbackNumber: string;
  /** Preferred time (null = ASAP) */
  preferredTime?: Date;
  /** Status of the callback */
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  /** When the callback was made */
  calledBackAt?: Date;
  calledBackByAgentId?: string;
}

// ─── Queue Metrics (Real-Time Dashboard) ────────────────────────────

export interface QueueMetrics {
  queueId: string;
  queueName: string;
  /** Snapshot timestamp */
  timestamp: Date;
  /** Current state */
  current: {
    waitingCount: number;
    longestWaitSeconds: number;
    averageWaitSeconds: number;
    activeInteractions: number;
    offeredCount: number;
    callbacksPending: number;
  };
  /** Agent pool stats */
  agents: {
    total: number;
    available: number;
    onInteraction: number;
    wrapUp: number;
    onBreak: number;
    offline: number;
  };
  /** SLA performance */
  sla: {
    targetPercent: number;
    targetSeconds: number;
    currentPercent: number;
    /** Whether we're meeting SLA right now */
    isMet: boolean;
  };
  /** Today's cumulative stats */
  today: {
    totalOffered: number;
    totalAnswered: number;
    totalAbandoned: number;
    totalOverflowed: number;
    totalCallbacks: number;
    averageHandleTimeSeconds: number;
    averageWaitTimeSeconds: number;
    abandonRate: number;
    answerRate: number;
  };
}

// ─── Events ─────────────────────────────────────────────────────────

export interface QueueEventPayloads {
  'queue:entry-added': { queueId: string; entryId: string; interactionType: InteractionType; position: number; estimatedWait: number; tenantId: string };
  'queue:entry-offered': { queueId: string; entryId: string; agentId: string; tenantId: string };
  'queue:entry-connected': { queueId: string; entryId: string; agentId: string; waitSeconds: number; tenantId: string };
  'queue:entry-abandoned': { queueId: string; entryId: string; waitSeconds: number; tenantId: string };
  'queue:entry-overflowed': { queueId: string; entryId: string; action: OverflowAction['type']; tenantId: string };
  'queue:entry-completed': { queueId: string; entryId: string; agentId: string; handleTimeSeconds: number; tenantId: string };
  'queue:callback-requested': { queueId: string; entryId: string; callbackNumber: string; tenantId: string };
  'queue:callback-completed': { queueId: string; entryId: string; agentId: string; tenantId: string };
  'queue:sla-breached': { queueId: string; currentPercent: number; targetPercent: number; tenantId: string };
  'queue:depth-warning': { queueId: string; depth: number; maxDepth: number; tenantId: string };
  'agent:state-changed': { agentId: string; previousState: AgentState; newState: AgentState; tenantId: string };
  'agent:logged-in': { agentId: string; tenantId: string };
  'agent:logged-out': { agentId: string; shiftStats: AgentShiftStats; tenantId: string };
  'agent:interaction-assigned': { agentId: string; queueId: string; interactionId: string; tenantId: string };
  'agent:wrap-up-started': { agentId: string; interactionId: string; tenantId: string };
  'agent:wrap-up-completed': { agentId: string; interactionId: string; wrapUpSeconds: number; tenantId: string };
}

export type QueueEventName = keyof QueueEventPayloads;
