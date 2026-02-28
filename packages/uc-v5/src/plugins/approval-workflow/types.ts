/**
 * Scholarly Unified Communications 4.0 — Approval Workflow Types
 *
 * The complete type system for the generalised approval workflow engine.
 * These types define the vocabulary of the permit office analogy: workflow
 * definitions are the different application forms, approval requests are
 * the submitted applications, approval chains are the sequence of officers
 * who must stamp each form, and execution hooks are the downstream actions
 * that happen once the final stamp is applied.
 *
 * Every type is designed to be workflow-agnostic. The same type system
 * powers virtual lesson access requests, field trip approvals, equipment
 * checkout, staff leave, budget approvals — any workflow where someone
 * asks, someone decides, and something happens.
 */

// ─── Request Lifecycle ───────────────────────────────────────────

/**
 * The state machine for an approval request. Every request follows this
 * linear (with branches) progression. Think of it as a package tracking
 * system: the package (request) moves through stations (states), and at
 * each station someone either forwards it, returns it, or it times out.
 *
 *   DRAFT → SUBMITTED → UNDER_REVIEW → APPROVED → EXECUTING → COMPLETED
 *                                     ↘ REJECTED
 *                        ↘ ESCALATED → UNDER_REVIEW (next level)
 *                                     ↘ EXPIRED
 *                                     ↘ CANCELLED
 *                                               ↘ FAILED
 */
export enum RequestStatus {
  /** Request created but not yet submitted. Requester can still edit. */
  DRAFT = 'DRAFT',
  /** Request submitted and awaiting assignment to a reviewer. */
  SUBMITTED = 'SUBMITTED',
  /** Request is actively being reviewed by an assigned approver. */
  UNDER_REVIEW = 'UNDER_REVIEW',
  /** Request approved (possibly with conditions). Awaiting execution. */
  APPROVED = 'APPROVED',
  /** Request rejected by a reviewer. Terminal state unless appealed. */
  REJECTED = 'REJECTED',
  /** Request escalated to a higher authority (timeout or manual). */
  ESCALATED = 'ESCALATED',
  /** Post-approval execution hooks are running. */
  EXECUTING = 'EXECUTING',
  /** All execution hooks completed successfully. Terminal state. */
  COMPLETED = 'COMPLETED',
  /** One or more execution hooks failed. Requires intervention. */
  FAILED = 'FAILED',
  /** Request expired without a decision. Terminal state. */
  EXPIRED = 'EXPIRED',
  /** Request cancelled by the requester before decision. Terminal state. */
  CANCELLED = 'CANCELLED',
}

// ─── Workflow Definition ─────────────────────────────────────────

/**
 * A workflow definition is the blueprint for a type of approval process.
 * It's the form template, not a filled-in form. You create one definition
 * for "Virtual Lesson Access" and it's reused for every request of that type.
 *
 * The definition specifies: who can ask (requester roles), who decides
 * (approval chain), what information is captured (form schema), what
 * validations run, what happens on approval, and when things time out.
 */
export interface WorkflowDefinition {
  /** Unique identifier for this workflow type, e.g. 'VIRTUAL_LESSON_ACCESS' */
  id: string;
  /** Human-readable name for display */
  name: string;
  /** Description of what this workflow is for */
  description: string;
  /** Version string for schema evolution */
  version: string;

  /** Roles that can submit requests using this workflow */
  requesterRoles: string[];
  /** The approval chain: one or more approval steps that must be completed */
  approvalChain: ApprovalStep[];

  /** JSON Schema describing the request payload. Validated on submission. */
  formSchema: Record<string, unknown>;
  /** Custom validation functions run before submission */
  preSubmitValidators?: ValidatorDefinition[];
  /** Custom validation functions run before each approval decision */
  preApproveValidators?: ValidatorDefinition[];

  /** Hooks executed after final approval */
  onApproved?: ExecutionHook[];
  /** Hooks executed on rejection */
  onRejected?: NotificationHook[];
  /** Hooks executed on expiry */
  onExpired?: NotificationHook[];

  /** Auto-expire requests after this many hours without a decision */
  expiryHours?: number;
  /** Allow the requester to cancel after submission */
  allowCancel?: boolean;
  /** Allow batch approval of multiple requests */
  allowBatchApproval?: boolean;

  /** Whether this workflow is currently active and accepting requests */
  enabled: boolean;
  /** Tenant-specific — allows different tenants to have different workflows */
  tenantId?: string;
}

/**
 * A single step in the approval chain. Multi-step chains enable
 * escalation patterns: step 1 is the teacher, step 2 is the head
 * of department, step 3 is the principal.
 */
export interface ApprovalStep {
  /** Step order (1-based) */
  order: number;
  /** Human-readable name for this step */
  name: string;
  /** Roles that can approve at this step */
  approverRoles: string[];
  /** Specific user IDs that can approve (optional, in addition to roles) */
  approverUserIds?: string[];
  /** How the request is assigned: 'any' (first responder) or 'all' (unanimous) */
  assignmentMode: 'any' | 'all';
  /** Auto-escalate to next step after this many hours */
  escalationHours?: number;
  /** Whether the approver can add conditions to their approval */
  allowConditions?: boolean;
  /** Whether the approver can delegate to another user */
  allowDelegation?: boolean;
}

// ─── Approval Request ────────────────────────────────────────────

/**
 * A concrete instance of a workflow — a filled-in form submitted by
 * a specific person at a specific time. This is the core entity that
 * moves through the state machine.
 */
export interface ApprovalRequest {
  /** Unique request ID */
  id: string;
  /** Which workflow definition this request follows */
  workflowId: string;
  /** Current status in the lifecycle */
  status: RequestStatus;
  /** Which step in the approval chain is currently active (1-based) */
  currentStep: number;

  /** Who submitted the request */
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;

  /** Tenant this request belongs to */
  tenantId: string;

  /** The request payload — validated against the workflow's formSchema */
  payload: Record<string, unknown>;

  /** Conditions attached by approvers (if any) */
  conditions?: string[];

  /** Decisions made at each step */
  decisions: ApprovalDecision[];

  /** Complete audit trail */
  auditTrail: AuditEntry[];

  /** Timestamps */
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  decidedAt?: string;
  completedAt?: string;
  expiresAt?: string;

  /** Priority level */
  priority: 'low' | 'normal' | 'high' | 'urgent';

  /** Optional metadata for plugin-specific use */
  metadata?: Record<string, unknown>;
}

// ─── Approval Decision ───────────────────────────────────────────

export interface ApprovalDecision {
  /** Which step this decision is for */
  step: number;
  /** Who made the decision */
  deciderId: string;
  deciderName: string;
  /** The decision */
  outcome: 'approved' | 'rejected' | 'delegated' | 'escalated';
  /** Reason for the decision (required for rejection) */
  reason?: string;
  /** Conditions attached to an approval */
  conditions?: string[];
  /** If delegated, who it was delegated to */
  delegatedTo?: string;
  /** When the decision was made */
  decidedAt: string;
}

// ─── Escalation Rules ────────────────────────────────────────────

export interface EscalationRule {
  /** Which step this rule applies to */
  fromStep: number;
  /** Escalate to which step (usually fromStep + 1) */
  toStep: number;
  /** Trigger after this many hours without a decision */
  afterHours: number;
  /** Reason recorded in the audit trail */
  reason: string;
}

// ─── Execution Hooks ─────────────────────────────────────────────

/**
 * An execution hook runs after the final approval. These are the
 * downstream actions: generate access codes, send notifications,
 * create calendar entries, provision resources, etc.
 *
 * Hooks run in order. If a hook fails, subsequent hooks can still
 * run (configurable), and the request moves to FAILED status.
 */
export interface ExecutionHook {
  /** Unique hook identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Hook priority — lower numbers run first */
  order: number;
  /**
   * The actual hook function. Receives the approved request and
   * returns a result. Implemented by the consuming plugin (e.g.,
   * VirtualLessonAccess registers its code-generation hook here).
   */
  execute?: (request: ApprovalRequest) => Promise<ExecutionResult>;
  /** Whether to continue running subsequent hooks if this one fails */
  continueOnFailure?: boolean;
}

export interface ExecutionResult {
  success: boolean;
  message?: string;
  data?: Record<string, unknown>;
  error?: string;
}

// ─── Notification Hooks ──────────────────────────────────────────

export interface NotificationHook {
  /** Hook identifier */
  id: string;
  /** Who to notify: 'requester', 'approvers', 'all', or specific user IDs */
  target: 'requester' | 'approvers' | 'all' | string[];
  /** Notification template identifier */
  templateId?: string;
  /** Optional custom message */
  message?: string;
}

// ─── Validator Definitions ───────────────────────────────────────

export interface ValidatorDefinition {
  /** Validator identifier */
  id: string;
  /** Human-readable description of what's being validated */
  description: string;
  /**
   * The validation function. Returns null if valid, or an error
   * message string if invalid.
   */
  validate?: (payload: Record<string, unknown>, request?: ApprovalRequest) => Promise<string | null>;
}

// ─── Audit Trail ─────────────────────────────────────────────────

export interface AuditEntry {
  /** Unique audit entry ID */
  id: string;
  /** What happened */
  action: AuditAction;
  /** Who did it (userId or 'system') */
  actorId: string;
  actorName: string;
  /** When it happened */
  timestamp: string;
  /** Additional details */
  details?: Record<string, unknown>;
  /** Previous status (for state transitions) */
  fromStatus?: RequestStatus;
  /** New status (for state transitions) */
  toStatus?: RequestStatus;
}

export type AuditAction =
  | 'created'
  | 'submitted'
  | 'assigned'
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'delegated'
  | 'cancelled'
  | 'expired'
  | 'execution_started'
  | 'execution_completed'
  | 'execution_failed'
  | 'comment_added'
  | 'payload_updated'
  | 'priority_changed'
  | 'conditions_added';

// ─── Event Payloads ──────────────────────────────────────────────

export interface ApprovalRequestSubmittedEvent {
  requestId: string;
  workflowId: string;
  requesterId: string;
  requesterName: string;
  tenantId: string;
  priority: string;
}

export interface ApprovalRequestAssignedEvent {
  requestId: string;
  assigneeId: string;
  assigneeName: string;
  step: number;
  workflowId: string;
  tenantId: string;
}

export interface ApprovalRequestApprovedEvent {
  requestId: string;
  approverId: string;
  approverName: string;
  step: number;
  conditions?: string[];
  isFinalApproval: boolean;
  workflowId: string;
  tenantId: string;
}

export interface ApprovalRequestRejectedEvent {
  requestId: string;
  approverId: string;
  approverName: string;
  step: number;
  reason: string;
  workflowId: string;
  tenantId: string;
}

export interface ApprovalRequestEscalatedEvent {
  requestId: string;
  fromStep: number;
  toStep: number;
  fromId: string;
  toId: string;
  reason: string;
  workflowId: string;
  tenantId: string;
}

export interface ApprovalExecutionStartedEvent {
  requestId: string;
  hookId: string;
  hookName: string;
  workflowId: string;
  tenantId: string;
}

export interface ApprovalExecutionCompletedEvent {
  requestId: string;
  hookId: string;
  hookName: string;
  result: ExecutionResult;
  workflowId: string;
  tenantId: string;
}

export interface ApprovalExecutionFailedEvent {
  requestId: string;
  hookId: string;
  hookName: string;
  error: string;
  workflowId: string;
  tenantId: string;
}

export interface ApprovalRequestExpiredEvent {
  requestId: string;
  expiryReason: string;
  workflowId: string;
  tenantId: string;
}

export interface ApprovalRequestCancelledEvent {
  requestId: string;
  cancelledBy: string;
  reason?: string;
  workflowId: string;
  tenantId: string;
}

// ─── Query Types ─────────────────────────────────────────────────

export interface ApprovalRequestFilter {
  workflowId?: string;
  status?: RequestStatus | RequestStatus[];
  requesterId?: string;
  assigneeId?: string;
  tenantId?: string;
  priority?: string;
  createdAfter?: string;
  createdBefore?: string;
}

export interface ApprovalRequestSort {
  field: 'createdAt' | 'updatedAt' | 'priority' | 'status';
  direction: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
