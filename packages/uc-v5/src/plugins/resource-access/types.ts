/**
 * Unified Communications 4.0 — Resource Access Control Types
 *
 * Generalised from "Virtual Lesson Access" into a reusable access control
 * system. The pattern: someone requests time-bound access to a resource,
 * an authority approves/rejects (via Approval Workflow), and the system
 * generates time-limited access codes that gate entry.
 *
 * The analogy is a hotel key card system: a guest (requester) books a room
 * (resource) for specific dates (time window), reception (approver) activates
 * the key card (access code), and the card only opens the right door during
 * the booked period. The hotel doesn't care if the room is a standard room,
 * a conference room, or a spa — the key card system works the same way.
 *
 * Deployment examples:
 *   - Virtual classroom access for absent students (Scholarly)
 *   - Temporary office/meeting room access for visitors (corporate)
 *   - Equipment checkout with time-bound access (facilities)
 *   - Secure document viewing sessions with expiry (Chekd-ID)
 */

// ─── Resource Definition ────────────────────────────────────────────────────

/** A resource is anything that can be access-controlled with time bounds */
export interface ResourceDefinition {
  id: string;
  tenantId: string;
  /** Resource type — determines validation rules and UI treatment */
  resourceType: string;
  /** Human-readable name */
  name: string;
  description?: string;
  /** Who owns/manages this resource */
  ownerId: string;
  ownerName: string;
  /** Associated video room, if applicable */
  roomId?: string;
  /** Associated channel, if applicable */
  channelId?: string;
  /** Schedule: recurring time slots when this resource is available */
  schedule?: ResourceSchedule[];
  /** Maximum concurrent access codes for this resource */
  maxConcurrent: number;
  /** Whether access requires approval or is self-service */
  requiresApproval: boolean;
  /** Approval workflow ID (from Approval Workflow plugin) */
  approvalWorkflowId?: string;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ResourceSchedule {
  /** Day of week (0=Sunday, 6=Saturday) or 'daily' */
  dayOfWeek: number | 'daily';
  /** Start time in HH:mm format */
  startTime: string;
  /** End time in HH:mm format */
  endTime: string;
  /** Optional label (e.g., "Period 3 - Maths", "Morning Shift") */
  label?: string;
}

// ─── Access Request ─────────────────────────────────────────────────────────

export interface AccessRequest {
  id: string;
  tenantId: string;
  /** The resource being requested */
  resourceId: string;
  resourceName: string;
  /** Who is requesting access */
  requesterId: string;
  requesterName: string;
  /** Who the access is for (may differ from requester — e.g., parent requests for child) */
  beneficiaryId: string;
  beneficiaryName: string;
  /** Requested time slots */
  requestedSlots: RequestedSlot[];
  /** Reason for the request */
  reason: string;
  reasonCategory?: string;
  /** Supporting documents */
  attachmentUrls?: string[];
  /** Linked approval request ID (from Approval Workflow plugin) */
  approvalRequestId?: string;
  /** Overall status */
  status: AccessRequestStatus;
  /** Per-slot approval decisions */
  slotDecisions: SlotDecision[];
  /** Generated access codes (post-approval) */
  accessCodes: AccessCode[];
  createdAt: string;
  updatedAt: string;
}

export type AccessRequestStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'PARTIALLY_APPROVED'
  | 'APPROVED'
  | 'REJECTED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REVOKED';

export interface RequestedSlot {
  id: string;
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Schedule slot reference */
  startTime: string;
  endTime: string;
  label?: string;
  /** Slot-specific metadata */
  metadata?: Record<string, unknown>;
}

export interface SlotDecision {
  slotId: string;
  approved: boolean;
  decidedBy: string;
  reason?: string;
  decidedAt: string;
}

// ─── Access Code ────────────────────────────────────────────────────────────

export interface AccessCode {
  id: string;
  /** The code itself: 6-char alphanumeric (e.g., "RA-K4M9") */
  code: string;
  accessRequestId: string;
  resourceId: string;
  beneficiaryId: string;
  /** Time window */
  validFrom: string;
  validUntil: string;
  /** Buffer: minutes before/after the slot that the code is valid */
  bufferMinutes: number;
  /** Has this code been used to establish a session? */
  isUsed: boolean;
  usedAt?: string;
  /** Revocation */
  isRevoked: boolean;
  revokedAt?: string;
  revokedBy?: string;
  revokedReason?: string;
  /** Brute-force protection */
  failedAttempts: number;
  isLocked: boolean;
  tenantId: string;
  createdAt: string;
}

// ─── Access Session ─────────────────────────────────────────────────────────

/** Tracks actual usage: when the beneficiary joined, how long, disconnects */
export interface AccessSession {
  id: string;
  accessCodeId: string;
  accessRequestId: string;
  resourceId: string;
  beneficiaryId: string;
  /** Video room session ID if applicable */
  roomSessionId?: string;
  joinedAt: string;
  leftAt?: string;
  durationSeconds?: number;
  /** Disconnect/reconnect tracking */
  reconnectCount: number;
  tenantId: string;
}

// ─── Event Payloads ─────────────────────────────────────────────────────────

export interface ResourceAccessRequestedEvent {
  requestId: string;
  resourceId: string;
  requesterId: string;
  beneficiaryId: string;
  slotCount: number;
  tenantId: string;
}

export interface ResourceAccessApprovedEvent {
  requestId: string;
  resourceId: string;
  approvedSlots: number;
  rejectedSlots: number;
  accessCodeCount: number;
  tenantId: string;
}

export interface ResourceAccessCodeValidatedEvent {
  codeId: string;
  resourceId: string;
  beneficiaryId: string;
  isValid: boolean;
  reason?: string;
  tenantId: string;
}

export interface ResourceAccessSessionEvent {
  sessionId: string;
  resourceId: string;
  beneficiaryId: string;
  action: 'joined' | 'left' | 'reconnected';
  tenantId: string;
}

export interface ResourceAccessRevokedEvent {
  requestId: string;
  resourceId: string;
  revokedBy: string;
  codesRevoked: number;
  tenantId: string;
}
