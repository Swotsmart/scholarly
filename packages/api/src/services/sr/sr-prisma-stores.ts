/**
 * Prisma-backed Stores for S&R Canvas
 *
 * Replaces InMemoryWorkflowStore and InMemoryRunStore with
 * persistent database-backed implementations.
 */

import { prisma } from '@scholarly/database';
import { WorkflowRunStore, WorkflowRun, WorkflowRunStatus } from './sr-workflow-engine';
import { WorkflowStore, StoredWorkflow, EventBus } from './sr-api-gateway';
import { logger } from '../../lib/logger';

/**
 * Prisma-backed workflow store
 */
export class PrismaWorkflowStore implements WorkflowStore {
  async save(workflow: StoredWorkflow): Promise<void> {
    await prisma.sRWorkflow.upsert({
      where: {
        workflowId_tenantId: {
          workflowId: workflow.workflowId,
          tenantId: workflow.tenantId,
        },
      },
      create: {
        workflowId: workflow.workflowId,
        tenantId: workflow.tenantId,
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        definition: workflow.definition as any,
        createdBy: workflow.createdBy,
        tags: workflow.tags,
        isDeleted: false,
      },
      update: {
        name: workflow.name,
        description: workflow.description,
        version: workflow.version,
        definition: workflow.definition as any,
        tags: workflow.tags,
      },
    });
  }

  async load(workflowId: string, tenantId: string): Promise<StoredWorkflow | null> {
    const row = await prisma.sRWorkflow.findUnique({
      where: {
        workflowId_tenantId: { workflowId, tenantId },
      },
    });

    if (!row || row.isDeleted) return null;

    return {
      workflowId: row.workflowId,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      version: row.version,
      definition: row.definition as any,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tags: row.tags,
      isDeleted: row.isDeleted,
    };
  }

  async update(workflowId: string, tenantId: string, updates: Partial<StoredWorkflow>): Promise<void> {
    await prisma.sRWorkflow.update({
      where: {
        workflowId_tenantId: { workflowId, tenantId },
      },
      data: {
        ...(updates.name !== undefined && { name: updates.name }),
        ...(updates.description !== undefined && { description: updates.description }),
        ...(updates.version !== undefined && { version: updates.version }),
        ...(updates.definition !== undefined && { definition: updates.definition as any }),
        ...(updates.tags !== undefined && { tags: updates.tags }),
      },
    });
  }

  async list(
    tenantId: string,
    options?: { limit?: number; offset?: number; tags?: string[] },
  ): Promise<StoredWorkflow[]> {
    const rows = await prisma.sRWorkflow.findMany({
      where: {
        tenantId,
        isDeleted: false,
        ...(options?.tags && options.tags.length > 0
          ? { tags: { hasSome: options.tags } }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      skip: options?.offset ?? 0,
      take: options?.limit ?? 50,
    });

    return rows.map((row) => ({
      workflowId: row.workflowId,
      tenantId: row.tenantId,
      name: row.name,
      description: row.description,
      version: row.version,
      definition: row.definition as any,
      createdBy: row.createdBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tags: row.tags,
      isDeleted: row.isDeleted,
    }));
  }

  async softDelete(workflowId: string, tenantId: string): Promise<void> {
    await prisma.sRWorkflow.update({
      where: {
        workflowId_tenantId: { workflowId, tenantId },
      },
      data: { isDeleted: true },
    });
  }
}

/**
 * Prisma-backed workflow run store
 */
export class PrismaRunStore implements WorkflowRunStore {
  async save(run: WorkflowRun): Promise<void> {
    await prisma.sRWorkflowRun.upsert({
      where: { runId: run.runId },
      create: {
        runId: run.runId,
        workflowId: run.workflowId,
        tenantId: run.tenantId,
        triggeredBy: run.triggeredBy,
        status: run.status,
        nodeRuns: run.nodeRuns as any,
        portData: Object.fromEntries(run.portData),
        timeline: run.timeline as any,
        error: run.error ? JSON.stringify(run.error) : null,
        durationMs: run.durationMs,
        pausedAtNodeId: run.pausedAtNodeId ?? null,
        startedAt: run.startedAt,
        completedAt: run.completedAt,
      },
      update: {
        status: run.status,
        nodeRuns: run.nodeRuns as any,
        portData: Object.fromEntries(run.portData),
        timeline: run.timeline as any,
        error: run.error ? JSON.stringify(run.error) : null,
        durationMs: run.durationMs,
        pausedAtNodeId: run.pausedAtNodeId ?? null,
        completedAt: run.completedAt,
      },
    });
  }

  async load(runId: string): Promise<WorkflowRun | null> {
    const row = await prisma.sRWorkflowRun.findUnique({
      where: { runId },
    });

    if (!row) return null;

    return {
      runId: row.runId,
      workflowId: row.workflowId,
      tenantId: row.tenantId,
      triggeredBy: row.triggeredBy,
      status: row.status as WorkflowRunStatus,
      nodeRuns: (row.nodeRuns as any[]) || [],
      portData: new Map(Object.entries((row.portData as Record<string, any>) || {})),
      timeline: (row.timeline as any[]) || [],
      error: row.error ? JSON.parse(row.error) : undefined,
      durationMs: row.durationMs,
      pausedAtNodeId: row.pausedAtNodeId ?? undefined,
      startedAt: row.startedAt,
      completedAt: row.completedAt ?? undefined,
    };
  }

  async update(runId: string, updates: Partial<WorkflowRun>): Promise<void> {
    const data: any = {};
    if (updates.status !== undefined) data.status = updates.status;
    if (updates.nodeRuns !== undefined) data.nodeRuns = updates.nodeRuns;
    if (updates.portData !== undefined) data.portData = Object.fromEntries(updates.portData);
    if (updates.timeline !== undefined) data.timeline = updates.timeline;
    if (updates.error !== undefined) data.error = JSON.stringify(updates.error);
    if (updates.completedAt !== undefined) data.completedAt = updates.completedAt;
    if (updates.durationMs !== undefined) data.durationMs = updates.durationMs;
    if (updates.pausedAtNodeId !== undefined) data.pausedAtNodeId = updates.pausedAtNodeId ?? null;

    await prisma.sRWorkflowRun.update({
      where: { runId },
      data,
    });
  }

  async findByWorkflow(workflowId: string, limit = 20): Promise<WorkflowRun[]> {
    const rows = await prisma.sRWorkflowRun.findMany({
      where: { workflowId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return rows.map((row) => ({
      runId: row.runId,
      workflowId: row.workflowId,
      tenantId: row.tenantId,
      triggeredBy: row.triggeredBy,
      status: row.status as WorkflowRunStatus,
      nodeRuns: (row.nodeRuns as any[]) || [],
      portData: new Map(Object.entries((row.portData as Record<string, any>) || {})),
      timeline: (row.timeline as any[]) || [],
      error: row.error ? JSON.parse(row.error) : undefined,
      durationMs: row.durationMs,
      pausedAtNodeId: row.pausedAtNodeId ?? undefined,
      startedAt: row.startedAt,
      completedAt: row.completedAt ?? undefined,
    }));
  }
}

/**
 * In-process event bus
 *
 * Delivers events to in-process subscribers for real-time WebSocket streaming.
 * This is purely in-memory pub/sub — no database persistence occurs.
 * For multi-instance deployments, swap for a NATS or Redis pub/sub implementation.
 */
export class PersistentEventBus implements EventBus {
  private handlers = new Map<string, Array<(payload: Record<string, unknown>) => void>>();

  async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
    // Deliver to in-process subscribers (for WebSocket streaming)
    const subscribers = this.handlers.get(topic) ?? [];
    const wildcardSubs = this.handlers.get('*') ?? [];
    for (const handler of [...subscribers, ...wildcardSubs]) {
      try {
        handler({ ...payload, __topic: topic });
      } catch (err) {
        logger.error({ err, topic }, 'Event handler error');
      }
    }
  }

  subscribe(topic: string, handler: (payload: Record<string, unknown>) => void): { unsubscribe: () => void } {
    const handlers = this.handlers.get(topic) ?? [];
    handlers.push(handler);
    this.handlers.set(topic, handlers);

    return {
      unsubscribe: () => {
        const current = this.handlers.get(topic) ?? [];
        this.handlers.set(topic, current.filter(h => h !== handler));
      },
    };
  }
}
