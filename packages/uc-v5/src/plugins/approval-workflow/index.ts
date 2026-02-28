/**
 * Scholarly Unified Communications 4.0 — Approval Workflow Plugin
 *
 * A generalised approval workflow engine that follows the pattern:
 *   Request → Review → Approve/Reject → Execute
 *
 * Think of it as a government permit office: you submit an application
 * (request), it goes into a queue (review), an authorised officer stamps
 * it (approve/reject), and the stamp triggers downstream actions (execute).
 * The permit office doesn't care whether you're applying for a building
 * permit or a food licence — the workflow is the same. The specifics live
 * in the application form (the workflow definition).
 *
 * This plugin is parameterised by WorkflowDefinitions. Other plugins
 * (like VirtualLessonAccess) register their workflow definitions and
 * execution hooks, and this engine handles the entire lifecycle.
 *
 * REST API: 18 endpoints under /api/approval-workflow/
 * Events: approval:* (15 event types)
 * WebSocket: real-time status updates via EventBus
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { UCPlugin, PluginContext, PluginHealth, PluginCapability } from '../../core/plugin-interface';
import type {
  WorkflowDefinition, ApprovalRequest, ApprovalDecision, AuditEntry,
  ExecutionHook, ExecutionResult, RequestStatus as RequestStatusType,
  ApprovalRequestFilter, PaginatedResult,
} from './types';
import { RequestStatus } from './types';
import { validatePayload, runCustomValidators, type ValidationResult } from './validators';

export class ApprovalWorkflowPlugin implements UCPlugin {
  readonly id = 'approval-workflow';
  readonly name = 'Approval Workflow Engine';
  readonly version = '4.0.0';
  readonly dependencies = [];

  private ctx!: PluginContext;
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executionHooks: Map<string, ExecutionHook[]> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  // ─── Plugin Lifecycle ──────────────────────────────────────────

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    ctx.logger.info('Approval Workflow Engine initializing...');

    // Register capabilities for Self-Composing Interface
    const mgr = (ctx as any).getPlugin?.('__plugin-manager__');
    ctx.logger.info('Approval Workflow Engine ready — 0 workflow definitions loaded');
  }

  getRoutes(): Router {
    const r = Router();

    // ─── Workflow Definition Management ────────────────────────
    r.get('/workflows', this.handleListWorkflows.bind(this));
    r.get('/workflows/:workflowId', this.handleGetWorkflow.bind(this));
    r.post('/workflows', this.handleRegisterWorkflow.bind(this));
    r.put('/workflows/:workflowId', this.handleUpdateWorkflow.bind(this));
    r.delete('/workflows/:workflowId', this.handleDeleteWorkflow.bind(this));

    // ─── Request Lifecycle ─────────────────────────────────────
    r.post('/requests', this.handleCreateRequest.bind(this));
    r.get('/requests', this.handleListRequests.bind(this));
    r.get('/requests/:requestId', this.handleGetRequest.bind(this));
    r.post('/requests/:requestId/submit', this.handleSubmitRequest.bind(this));
    r.post('/requests/:requestId/cancel', this.handleCancelRequest.bind(this));

    // ─── Approval Actions ──────────────────────────────────────
    r.post('/requests/:requestId/approve', this.handleApproveRequest.bind(this));
    r.post('/requests/:requestId/reject', this.handleRejectRequest.bind(this));
    r.post('/requests/:requestId/delegate', this.handleDelegateRequest.bind(this));
    r.post('/requests/:requestId/escalate', this.handleEscalateRequest.bind(this));

    // ─── Batch Operations ──────────────────────────────────────
    r.post('/batch/approve', this.handleBatchApprove.bind(this));

    // ─── Review Queue ──────────────────────────────────────────
    r.get('/queue', this.handleGetReviewQueue.bind(this));
    r.get('/queue/count', this.handleGetQueueCount.bind(this));

    // ─── Audit Trail ───────────────────────────────────────────
    r.get('/requests/:requestId/audit', this.handleGetAuditTrail.bind(this));

    return r;
  }

  async shutdown(): Promise<void> {
    // Clear all escalation timers
    for (const [id, timer] of this.escalationTimers) {
      clearTimeout(timer);
    }
    this.escalationTimers.clear();
    this.ctx.logger.info('Approval Workflow Engine shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    return {
      status: 'healthy',
      details: {
        workflowCount: this.workflows.size,
        activeTimers: this.escalationTimers.size,
      },
    };
  }

  // ─── Public API (for other plugins) ────────────────────────────

  /**
   * Register a workflow definition programmatically.
   * Used by plugins like VirtualLessonAccess to register their workflow.
   */
  registerWorkflowDefinition(definition: WorkflowDefinition): void {
    this.workflows.set(definition.id, definition);
    this.ctx.logger.info(`Workflow registered: ${definition.name} (${definition.id})`);
  }

  /**
   * Register execution hooks for a workflow.
   * Hooks run after final approval in the order specified.
   */
  registerExecutionHooks(workflowId: string, hooks: ExecutionHook[]): void {
    const existing = this.executionHooks.get(workflowId) || [];
    this.executionHooks.set(workflowId, [...existing, ...hooks].sort((a, b) => a.order - b.order));
    this.ctx.logger.info(`Registered ${hooks.length} execution hooks for workflow ${workflowId}`);
  }

  /**
   * Create and optionally submit a request programmatically.
   */
  async createRequest(
    workflowId: string,
    requesterId: string,
    requesterName: string,
    tenantId: string,
    payload: Record<string, unknown>,
    autoSubmit = false,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    metadata?: Record<string, unknown>
  ): Promise<ApprovalRequest> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${workflowId}`);
    if (!workflow.enabled) throw new Error(`Workflow is disabled: ${workflowId}`);

    const now = new Date().toISOString();
    const id = uuidv4();

    const request: ApprovalRequest = {
      id,
      workflowId,
      status: RequestStatus.DRAFT,
      currentStep: 0,
      requesterId,
      requesterName,
      tenantId,
      payload,
      conditions: [],
      decisions: [],
      auditTrail: [],
      createdAt: now,
      updatedAt: now,
      priority,
      metadata,
    };

    // Add creation audit entry
    this.addAuditEntry(request, 'created', requesterId, requesterName);

    // Persist
    await this.ctx.storage.set('approval_requests', id, request);

    if (autoSubmit) {
      return this.submitRequest(request);
    }

    return request;
  }

  /**
   * Get a request by ID.
   */
  async getRequest(requestId: string): Promise<ApprovalRequest | null> {
    return this.ctx.storage.get<ApprovalRequest>('approval_requests', requestId);
  }

  // ─── Route Handlers: Workflow Definitions ──────────────────────

  private async handleListWorkflows(_req: Request, res: Response): Promise<void> {
    const workflows = [...this.workflows.values()];
    res.json({ workflows, total: workflows.length });
  }

  private async handleGetWorkflow(req: Request, res: Response): Promise<void> {
    const workflow = this.workflows.get(req.params.workflowId);
    if (!workflow) { res.status(404).json({ error: 'Workflow not found' }); return; }
    res.json(workflow);
  }

  private async handleRegisterWorkflow(req: Request, res: Response): Promise<void> {
    const definition = req.body as WorkflowDefinition;
    if (!definition.id || !definition.name) {
      res.status(400).json({ error: 'Workflow must have id and name' }); return;
    }
    this.registerWorkflowDefinition(definition);
    res.status(201).json(definition);
  }

  private async handleUpdateWorkflow(req: Request, res: Response): Promise<void> {
    const existing = this.workflows.get(req.params.workflowId);
    if (!existing) { res.status(404).json({ error: 'Workflow not found' }); return; }
    const updated = { ...existing, ...req.body, id: existing.id };
    this.workflows.set(existing.id, updated);
    res.json(updated);
  }

  private async handleDeleteWorkflow(req: Request, res: Response): Promise<void> {
    const deleted = this.workflows.delete(req.params.workflowId);
    if (!deleted) { res.status(404).json({ error: 'Workflow not found' }); return; }
    res.json({ success: true });
  }

  // ─── Route Handlers: Request Lifecycle ─────────────────────────

  private async handleCreateRequest(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId, payload, priority, autoSubmit, metadata } = req.body;
      const user = this.getUser(req);

      const request = await this.createRequest(
        workflowId, user.userId, user.name || 'Unknown', user.tenantId,
        payload, autoSubmit, priority, metadata
      );

      res.status(201).json(request);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  }

  private async handleListRequests(req: Request, res: Response): Promise<void> {
    const user = this.getUser(req);
    const filter: Record<string, unknown> = {};

    // Filter by query params
    if (req.query.workflowId) filter.workflowId = req.query.workflowId;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.requesterId) filter.requesterId = req.query.requesterId;

    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20', 10), 100);

    const requests = await this.ctx.storage.query<ApprovalRequest>(
      'approval_requests', filter,
      { limit: pageSize, offset: (page - 1) * pageSize, orderBy: { field: 'updatedAt', direction: 'desc' } }
    );
    const total = await this.ctx.storage.count('approval_requests', filter);

    res.json({
      items: requests,
      total,
      page,
      pageSize,
      hasMore: page * pageSize < total,
    });
  }

  private async handleGetRequest(req: Request, res: Response): Promise<void> {
    const request = await this.getRequest(req.params.requestId);
    if (!request) { res.status(404).json({ error: 'Request not found' }); return; }
    res.json(request);
  }

  private async handleSubmitRequest(req: Request, res: Response): Promise<void> {
    try {
      const request = await this.getRequest(req.params.requestId);
      if (!request) { res.status(404).json({ error: 'Request not found' }); return; }

      const updated = await this.submitRequest(request);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  }

  private async handleCancelRequest(req: Request, res: Response): Promise<void> {
    const request = await this.getRequest(req.params.requestId);
    if (!request) { res.status(404).json({ error: 'Request not found' }); return; }

    const workflow = this.workflows.get(request.workflowId);
    if (workflow && !workflow.allowCancel) {
      res.status(403).json({ error: 'Cancellation not allowed for this workflow' }); return;
    }

    if (![RequestStatus.DRAFT, RequestStatus.SUBMITTED, RequestStatus.UNDER_REVIEW].includes(request.status as any)) {
      res.status(400).json({ error: `Cannot cancel request in ${request.status} status` }); return;
    }

    const user = this.getUser(req);
    request.status = RequestStatus.CANCELLED;
    request.updatedAt = new Date().toISOString();
    this.addAuditEntry(request, 'cancelled', user.userId, user.name || 'Unknown', {
      reason: req.body?.reason,
    });

    await this.ctx.storage.set('approval_requests', request.id, request);
    this.clearEscalationTimer(request.id);

    await this.ctx.bus.emit('approval:request-cancelled', {
      requestId: request.id, cancelledBy: user.userId,
      reason: req.body?.reason, workflowId: request.workflowId, tenantId: request.tenantId,
    }, 'approval-workflow');

    res.json(request);
  }

  // ─── Route Handlers: Approval Actions ──────────────────────────

  private async handleApproveRequest(req: Request, res: Response): Promise<void> {
    try {
      const request = await this.getRequest(req.params.requestId);
      if (!request) { res.status(404).json({ error: 'Request not found' }); return; }

      const user = this.getUser(req);
      const { conditions, reason } = req.body || {};

      const updated = await this.approveRequest(request, user.userId, user.name || 'Unknown', conditions, reason);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  }

  private async handleRejectRequest(req: Request, res: Response): Promise<void> {
    try {
      const request = await this.getRequest(req.params.requestId);
      if (!request) { res.status(404).json({ error: 'Request not found' }); return; }

      const user = this.getUser(req);
      const { reason } = req.body || {};
      if (!reason) { res.status(400).json({ error: 'Rejection reason is required' }); return; }

      const updated = await this.rejectRequest(request, user.userId, user.name || 'Unknown', reason);
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  }

  private async handleDelegateRequest(req: Request, res: Response): Promise<void> {
    try {
      const request = await this.getRequest(req.params.requestId);
      if (!request) { res.status(404).json({ error: 'Request not found' }); return; }

      const user = this.getUser(req);
      const { delegateToId, delegateToName, reason } = req.body;
      if (!delegateToId) { res.status(400).json({ error: 'delegateToId is required' }); return; }

      const workflow = this.workflows.get(request.workflowId);
      const currentStep = workflow?.approvalChain[request.currentStep - 1];
      if (!currentStep?.allowDelegation) {
        res.status(403).json({ error: 'Delegation not allowed at this step' }); return;
      }

      const decision: ApprovalDecision = {
        step: request.currentStep,
        deciderId: user.userId,
        deciderName: user.name || 'Unknown',
        outcome: 'delegated',
        reason,
        delegatedTo: delegateToId,
        decidedAt: new Date().toISOString(),
      };

      request.decisions.push(decision);
      request.updatedAt = new Date().toISOString();
      this.addAuditEntry(request, 'delegated', user.userId, user.name || 'Unknown', {
        delegatedTo: delegateToId, delegateToName, reason,
      });

      await this.ctx.storage.set('approval_requests', request.id, request);

      await this.ctx.bus.emit('approval:request-assigned', {
        requestId: request.id, assigneeId: delegateToId,
        assigneeName: delegateToName || delegateToId, step: request.currentStep,
        workflowId: request.workflowId, tenantId: request.tenantId,
      }, 'approval-workflow');

      res.json(request);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  }

  private async handleEscalateRequest(req: Request, res: Response): Promise<void> {
    try {
      const request = await this.getRequest(req.params.requestId);
      if (!request) { res.status(404).json({ error: 'Request not found' }); return; }

      const user = this.getUser(req);
      const updated = await this.escalateRequest(request, user.userId, req.body?.reason || 'Manual escalation');
      res.json(updated);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  }

  // ─── Route Handlers: Batch & Queue ─────────────────────────────

  private async handleBatchApprove(req: Request, res: Response): Promise<void> {
    const { requestIds, conditions, reason } = req.body;
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      res.status(400).json({ error: 'requestIds array is required' }); return;
    }

    const user = this.getUser(req);
    const results: { requestId: string; success: boolean; error?: string }[] = [];

    for (const requestId of requestIds) {
      try {
        const request = await this.getRequest(requestId);
        if (!request) {
          results.push({ requestId, success: false, error: 'Not found' });
          continue;
        }
        const workflow = this.workflows.get(request.workflowId);
        if (!workflow?.allowBatchApproval) {
          results.push({ requestId, success: false, error: 'Batch approval not allowed' });
          continue;
        }
        await this.approveRequest(request, user.userId, user.name || 'Unknown', conditions, reason);
        results.push({ requestId, success: true });
      } catch (error) {
        results.push({ requestId, success: false, error: String(error) });
      }
    }

    res.json({
      total: requestIds.length,
      approved: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  }

  private async handleGetReviewQueue(req: Request, res: Response): Promise<void> {
    const user = this.getUser(req);
    const page = parseInt(req.query.page as string || '1', 10);
    const pageSize = Math.min(parseInt(req.query.pageSize as string || '20', 10), 100);

    // Get all requests that are SUBMITTED or UNDER_REVIEW
    const allRequests = await this.ctx.storage.query<ApprovalRequest>(
      'approval_requests',
      { status: RequestStatus.UNDER_REVIEW },
      { limit: 200, orderBy: { field: 'updatedAt', direction: 'desc' } }
    );

    const submitted = await this.ctx.storage.query<ApprovalRequest>(
      'approval_requests',
      { status: RequestStatus.SUBMITTED },
      { limit: 200, orderBy: { field: 'updatedAt', direction: 'desc' } }
    );

    // Filter to those where the current user can approve at the current step
    const queue = [...allRequests, ...submitted].filter(request => {
      const workflow = this.workflows.get(request.workflowId);
      if (!workflow) return false;
      const step = workflow.approvalChain[request.currentStep - 1];
      if (!step) return false;
      return step.approverRoles.includes(user.role) ||
        (step.approverUserIds && step.approverUserIds.includes(user.userId));
    });

    const start = (page - 1) * pageSize;
    const items = queue.slice(start, start + pageSize);

    res.json({
      items,
      total: queue.length,
      page,
      pageSize,
      hasMore: start + pageSize < queue.length,
    });
  }

  private async handleGetQueueCount(req: Request, res: Response): Promise<void> {
    const user = this.getUser(req);

    const reviewRequests = await this.ctx.storage.query<ApprovalRequest>(
      'approval_requests', { status: RequestStatus.UNDER_REVIEW }, { limit: 500 }
    );
    const submittedRequests = await this.ctx.storage.query<ApprovalRequest>(
      'approval_requests', { status: RequestStatus.SUBMITTED }, { limit: 500 }
    );

    const count = [...reviewRequests, ...submittedRequests].filter(request => {
      const workflow = this.workflows.get(request.workflowId);
      if (!workflow) return false;
      const step = workflow.approvalChain[request.currentStep - 1];
      if (!step) return false;
      return step.approverRoles.includes(user.role) ||
        (step.approverUserIds && step.approverUserIds.includes(user.userId));
    }).length;

    res.json({ count });
  }

  private async handleGetAuditTrail(req: Request, res: Response): Promise<void> {
    const request = await this.getRequest(req.params.requestId);
    if (!request) { res.status(404).json({ error: 'Request not found' }); return; }
    res.json({ requestId: request.id, auditTrail: request.auditTrail });
  }

  // ─── Core Logic ────────────────────────────────────────────────

  private async submitRequest(request: ApprovalRequest): Promise<ApprovalRequest> {
    if (request.status !== RequestStatus.DRAFT) {
      throw new Error(`Cannot submit request in ${request.status} status`);
    }

    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${request.workflowId}`);

    // Validate payload against schema
    const validation = validatePayload(request.payload, workflow.formSchema);
    if (!validation.valid) {
      throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Run custom pre-submit validators
    if (workflow.preSubmitValidators?.length) {
      const customValidation = await runCustomValidators(workflow.preSubmitValidators, request.payload, request);
      if (!customValidation.valid) {
        throw new Error(`Pre-submit validation failed: ${customValidation.errors.map(e => e.message).join(', ')}`);
      }
    }

    // Advance to first approval step
    request.status = RequestStatus.SUBMITTED;
    request.currentStep = 1;
    request.submittedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();

    // Set expiry if configured
    if (workflow.expiryHours) {
      const expiry = new Date();
      expiry.setHours(expiry.getHours() + workflow.expiryHours);
      request.expiresAt = expiry.toISOString();
    }

    this.addAuditEntry(request, 'submitted', request.requesterId, request.requesterName);

    // Move to UNDER_REVIEW
    request.status = RequestStatus.UNDER_REVIEW;
    this.addAuditEntry(request, 'assigned', 'system', 'System', {
      step: 1, stepName: workflow.approvalChain[0]?.name,
    });

    await this.ctx.storage.set('approval_requests', request.id, request);

    // Set up escalation timer for this step
    this.setEscalationTimer(request, workflow);

    // Emit events
    await this.ctx.bus.emit('approval:request-submitted', {
      requestId: request.id, workflowId: request.workflowId,
      requesterId: request.requesterId, requesterName: request.requesterName,
      tenantId: request.tenantId, priority: request.priority,
    }, 'approval-workflow');

    return request;
  }

  private async approveRequest(
    request: ApprovalRequest,
    approverId: string,
    approverName: string,
    conditions?: string[],
    reason?: string
  ): Promise<ApprovalRequest> {
    if (request.status !== RequestStatus.UNDER_REVIEW && request.status !== RequestStatus.SUBMITTED) {
      throw new Error(`Cannot approve request in ${request.status} status`);
    }

    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${request.workflowId}`);

    // Run pre-approve validators
    if (workflow.preApproveValidators?.length) {
      const validation = await runCustomValidators(workflow.preApproveValidators, request.payload, request);
      if (!validation.valid) {
        throw new Error(`Pre-approve validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
      }
    }

    const decision: ApprovalDecision = {
      step: request.currentStep,
      deciderId: approverId,
      deciderName: approverName,
      outcome: 'approved',
      reason,
      conditions,
      decidedAt: new Date().toISOString(),
    };

    request.decisions.push(decision);
    if (conditions?.length) {
      request.conditions = [...(request.conditions || []), ...conditions];
    }
    request.updatedAt = new Date().toISOString();

    this.addAuditEntry(request, 'approved', approverId, approverName, {
      step: request.currentStep, conditions, reason,
    });

    this.clearEscalationTimer(request.id);

    const isFinalStep = request.currentStep >= workflow.approvalChain.length;

    // Emit approval event
    await this.ctx.bus.emit('approval:request-approved', {
      requestId: request.id, approverId, approverName,
      step: request.currentStep, conditions,
      isFinalApproval: isFinalStep,
      workflowId: request.workflowId, tenantId: request.tenantId,
    }, 'approval-workflow');

    if (isFinalStep) {
      // Final approval — move to execution
      request.status = RequestStatus.APPROVED;
      request.decidedAt = new Date().toISOString();
      await this.ctx.storage.set('approval_requests', request.id, request);
      await this.executeApprovalHooks(request);
    } else {
      // Advance to next step
      request.currentStep += 1;
      request.status = RequestStatus.UNDER_REVIEW;
      this.addAuditEntry(request, 'assigned', 'system', 'System', {
        step: request.currentStep,
        stepName: workflow.approvalChain[request.currentStep - 1]?.name,
      });
      await this.ctx.storage.set('approval_requests', request.id, request);
      this.setEscalationTimer(request, workflow);
    }

    return request;
  }

  private async rejectRequest(
    request: ApprovalRequest,
    rejecterId: string,
    rejecterName: string,
    reason: string
  ): Promise<ApprovalRequest> {
    if (request.status !== RequestStatus.UNDER_REVIEW && request.status !== RequestStatus.SUBMITTED) {
      throw new Error(`Cannot reject request in ${request.status} status`);
    }

    const decision: ApprovalDecision = {
      step: request.currentStep,
      deciderId: rejecterId,
      deciderName: rejecterName,
      outcome: 'rejected',
      reason,
      decidedAt: new Date().toISOString(),
    };

    request.decisions.push(decision);
    request.status = RequestStatus.REJECTED;
    request.decidedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();

    this.addAuditEntry(request, 'rejected', rejecterId, rejecterName, {
      step: request.currentStep, reason,
    });

    this.clearEscalationTimer(request.id);
    await this.ctx.storage.set('approval_requests', request.id, request);

    await this.ctx.bus.emit('approval:request-rejected', {
      requestId: request.id, approverId: rejecterId, approverName: rejecterName,
      step: request.currentStep, reason,
      workflowId: request.workflowId, tenantId: request.tenantId,
    }, 'approval-workflow');

    // Run rejection notification hooks
    const workflow = this.workflows.get(request.workflowId);
    if (workflow?.onRejected) {
      for (const hook of workflow.onRejected) {
        await this.ctx.bus.emit('notification:queued', {
          notificationId: uuidv4(),
          userId: hook.target === 'requester' ? request.requesterId : '',
          channel: 'in-app',
          type: 'approval_rejected',
          priority: 'high',
        }, 'approval-workflow');
      }
    }

    return request;
  }

  private async escalateRequest(
    request: ApprovalRequest,
    escalatedBy: string,
    reason: string
  ): Promise<ApprovalRequest> {
    const workflow = this.workflows.get(request.workflowId);
    if (!workflow) throw new Error(`Workflow not found: ${request.workflowId}`);

    if (request.currentStep >= workflow.approvalChain.length) {
      throw new Error('Cannot escalate — already at final step');
    }

    const fromStep = request.currentStep;
    const toStep = fromStep + 1;

    const decision: ApprovalDecision = {
      step: fromStep,
      deciderId: escalatedBy,
      deciderName: escalatedBy === 'system' ? 'System (auto-escalation)' : escalatedBy,
      outcome: 'escalated',
      reason,
      decidedAt: new Date().toISOString(),
    };

    request.decisions.push(decision);
    request.currentStep = toStep;
    request.status = RequestStatus.UNDER_REVIEW;
    request.updatedAt = new Date().toISOString();

    this.addAuditEntry(request, 'escalated', escalatedBy,
      escalatedBy === 'system' ? 'System' : escalatedBy,
      { fromStep, toStep, reason }
    );

    this.clearEscalationTimer(request.id);
    await this.ctx.storage.set('approval_requests', request.id, request);
    this.setEscalationTimer(request, workflow);

    await this.ctx.bus.emit('approval:request-escalated', {
      requestId: request.id, fromStep, toStep,
      fromId: escalatedBy, toId: 'pending-assignment',
      reason, workflowId: request.workflowId, tenantId: request.tenantId,
    }, 'approval-workflow');

    return request;
  }

  // ─── Execution Hooks ───────────────────────────────────────────

  private async executeApprovalHooks(request: ApprovalRequest): Promise<void> {
    const hooks = this.executionHooks.get(request.workflowId) || [];
    const workflow = this.workflows.get(request.workflowId);
    const allHooks = [...hooks, ...(workflow?.onApproved || [])].sort((a, b) => a.order - b.order);

    if (allHooks.length === 0) {
      request.status = RequestStatus.COMPLETED;
      request.completedAt = new Date().toISOString();
      await this.ctx.storage.set('approval_requests', request.id, request);
      return;
    }

    request.status = RequestStatus.EXECUTING;
    this.addAuditEntry(request, 'execution_started', 'system', 'System');
    await this.ctx.storage.set('approval_requests', request.id, request);

    let allSucceeded = true;

    for (const hook of allHooks) {
      if (!hook.execute) continue;

      await this.ctx.bus.emit('approval:execution-started', {
        requestId: request.id, hookId: hook.id, hookName: hook.name,
        workflowId: request.workflowId, tenantId: request.tenantId,
      }, 'approval-workflow');

      try {
        const result = await hook.execute(request);

        if (result.success) {
          this.addAuditEntry(request, 'execution_completed', 'system', 'System', {
            hookId: hook.id, hookName: hook.name, result: result.data,
          });

          await this.ctx.bus.emit('approval:execution-completed', {
            requestId: request.id, hookId: hook.id, hookName: hook.name,
            result, workflowId: request.workflowId, tenantId: request.tenantId,
          }, 'approval-workflow');
        } else {
          allSucceeded = false;
          this.addAuditEntry(request, 'execution_failed', 'system', 'System', {
            hookId: hook.id, hookName: hook.name, error: result.error,
          });

          await this.ctx.bus.emit('approval:execution-failed', {
            requestId: request.id, hookId: hook.id, hookName: hook.name,
            error: result.error || 'Unknown error',
            workflowId: request.workflowId, tenantId: request.tenantId,
          }, 'approval-workflow');

          if (!hook.continueOnFailure) break;
        }
      } catch (error) {
        allSucceeded = false;
        this.addAuditEntry(request, 'execution_failed', 'system', 'System', {
          hookId: hook.id, hookName: hook.name, error: String(error),
        });

        await this.ctx.bus.emit('approval:execution-failed', {
          requestId: request.id, hookId: hook.id, hookName: hook.name,
          error: String(error), workflowId: request.workflowId, tenantId: request.tenantId,
        }, 'approval-workflow');

        if (!hook.continueOnFailure) break;
      }
    }

    request.status = allSucceeded ? RequestStatus.COMPLETED : RequestStatus.FAILED;
    request.completedAt = new Date().toISOString();
    request.updatedAt = new Date().toISOString();
    await this.ctx.storage.set('approval_requests', request.id, request);
  }

  // ─── Escalation Timers ─────────────────────────────────────────

  private setEscalationTimer(request: ApprovalRequest, workflow: WorkflowDefinition): void {
    const step = workflow.approvalChain[request.currentStep - 1];
    if (!step?.escalationHours) return;

    const timeoutMs = step.escalationHours * 60 * 60 * 1000;
    const timer = setTimeout(async () => {
      try {
        const current = await this.getRequest(request.id);
        if (!current || current.status !== RequestStatus.UNDER_REVIEW) return;

        if (current.currentStep < workflow.approvalChain.length) {
          await this.escalateRequest(current, 'system', `Auto-escalation: no decision after ${step.escalationHours} hours`);
        } else {
          // At final step — expire
          current.status = RequestStatus.EXPIRED;
          current.updatedAt = new Date().toISOString();
          this.addAuditEntry(current, 'expired', 'system', 'System', {
            reason: `No decision after ${step.escalationHours} hours at final step`,
          });
          await this.ctx.storage.set('approval_requests', current.id, current);
          await this.ctx.bus.emit('approval:request-expired', {
            requestId: current.id,
            expiryReason: `No decision after ${step.escalationHours} hours`,
            workflowId: current.workflowId, tenantId: current.tenantId,
          }, 'approval-workflow');
        }
      } catch (error) {
        this.ctx.logger.error(`Escalation timer error for ${request.id}: ${error}`);
      }
    }, timeoutMs);

    this.escalationTimers.set(request.id, timer);
  }

  private clearEscalationTimer(requestId: string): void {
    const timer = this.escalationTimers.get(requestId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(requestId);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────

  private addAuditEntry(
    request: ApprovalRequest,
    action: AuditEntry['action'],
    actorId: string,
    actorName: string,
    details?: Record<string, unknown>,
    fromStatus?: RequestStatus,
    toStatus?: RequestStatus
  ): void {
    request.auditTrail.push({
      id: uuidv4(),
      action,
      actorId,
      actorName,
      timestamp: new Date().toISOString(),
      details,
      fromStatus: fromStatus || request.status,
      toStatus,
    });
  }

  private getUser(req: Request): { userId: string; name?: string; role: string; tenantId: string } {
    const user = (req as any).scholarlyUser;
    if (user) {
      return { userId: user.userId, name: user.name, role: user.role, tenantId: user.tenantId };
    }
    // Fallback for unauthenticated/dev mode
    return {
      userId: (req.body?.userId || req.query?.userId || 'anonymous') as string,
      name: (req.body?.userName || req.query?.userName || 'Anonymous') as string,
      role: (req.body?.role || req.query?.role || 'user') as string,
      tenantId: (req.body?.tenantId || req.query?.tenantId || '__default__') as string,
    };
  }

  // ─── Plugin Capabilities ───────────────────────────────────────

  getCapabilities(): PluginCapability[] {
    return [
      { key: 'approval.submit-request', label: 'Submit Request', description: 'Submit a new approval request', icon: 'FileText', routePath: '/requests', requiredRoles: [] },
      { key: 'approval.review-queue', label: 'Review Queue', description: 'View and action pending approval requests', icon: 'Inbox', routePath: '/queue', requiredRoles: ['teacher', 'admin', 'principal'] },
      { key: 'approval.manage-workflows', label: 'Manage Workflows', description: 'Create and configure approval workflow definitions', icon: 'Settings', routePath: '/workflows', requiredRoles: ['admin'] },
    ];
  }
}

export default ApprovalWorkflowPlugin;
