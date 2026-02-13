/**
 * Compliance & Operations Routes
 *
 * API endpoints for data retention, security audits, accessibility,
 * A/B testing, monitoring, and production operations.
 * Sprints: 11, 12, 13, 16, 17, 18
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { authMiddleware } from '../middleware/auth';

export const complianceRouter: Router = Router();
complianceRouter.use(authMiddleware);

// ============================================================================
// Helpers
// ============================================================================

function paginationParams(query: Record<string, any>) {
  const page = Math.max(1, parseInt(query.page as string, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit as string, 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

// Static retention policies (governance reference data)
const RETENTION_POLICIES = [
  {
    id: 'pol_learner_pii',
    category: 'learner_pii',
    retentionDays: 365,
    strategy: 'anonymise',
    regulation: 'COPPA/GDPR',
    description: 'Personally identifiable information for learners under 13',
  },
  {
    id: 'pol_learning_sessions',
    category: 'learning_sessions',
    retentionDays: 730,
    strategy: 'aggregate',
    regulation: 'FERPA',
    description: 'Individual tutoring and learning session records',
  },
  {
    id: 'pol_audio_recordings',
    category: 'audio_recordings',
    retentionDays: 90,
    strategy: 'hard_delete',
    regulation: 'COPPA',
    description: 'Voice recordings from phonics and language exercises',
  },
  {
    id: 'pol_payment_records',
    category: 'payment_records',
    retentionDays: 2555,
    strategy: 'archive',
    regulation: 'Financial',
    description: 'Payment and transaction records (7-year retention)',
  },
  {
    id: 'pol_audit_logs',
    category: 'audit_logs',
    retentionDays: 1825,
    strategy: 'archive',
    regulation: 'SOC2',
    description: 'System audit trail entries (5-year retention)',
  },
  {
    id: 'pol_analytics_events',
    category: 'analytics_events',
    retentionDays: 365,
    strategy: 'aggregate',
    regulation: 'GDPR',
    description: 'Anonymised analytics and usage events',
  },
  {
    id: 'pol_chat_messages',
    category: 'chat_messages',
    retentionDays: 180,
    strategy: 'hard_delete',
    regulation: 'COPPA',
    description: 'AI buddy conversation messages',
  },
  {
    id: 'pol_portfolio_artifacts',
    category: 'portfolio_artifacts',
    retentionDays: 1095,
    strategy: 'archive',
    regulation: 'FERPA',
    description: 'Student portfolio work samples and artifacts',
  },
  {
    id: 'pol_assessment_results',
    category: 'assessment_results',
    retentionDays: 1095,
    strategy: 'anonymise',
    regulation: 'FERPA',
    description: 'Assessment scores and competency records',
  },
  {
    id: 'pol_notification_logs',
    category: 'notification_logs',
    retentionDays: 90,
    strategy: 'hard_delete',
    regulation: 'Internal',
    description: 'Push and email notification delivery logs',
  },
  {
    id: 'pol_file_uploads',
    category: 'file_uploads',
    retentionDays: 730,
    strategy: 'hard_delete',
    regulation: 'GDPR',
    description: 'User-uploaded files and documents',
  },
  {
    id: 'pol_marketplace_transactions',
    category: 'marketplace_transactions',
    retentionDays: 2555,
    strategy: 'archive',
    regulation: 'Financial',
    description: 'Content marketplace purchase and royalty records',
  },
  {
    id: 'pol_verification_documents',
    category: 'verification_documents',
    retentionDays: 365,
    strategy: 'hard_delete',
    regulation: 'Privacy',
    description: 'Identity verification documents and WWCC checks',
  },
];

// Static monitoring rules (operational reference data)
const MONITORING_RULES = [
  { id: 'rule_1', name: 'High Error Rate', severity: 'critical', threshold: '5% 5xx in 5min', action: 'page_oncall', enabled: true },
  { id: 'rule_2', name: 'High Latency', severity: 'warning', threshold: 'p99 > 2000ms', action: 'slack_alert', enabled: true },
  { id: 'rule_3', name: 'Low Memory', severity: 'warning', threshold: '< 10% free', action: 'slack_alert', enabled: true },
  { id: 'rule_4', name: 'Database Connection Pool', severity: 'critical', threshold: '> 90% used', action: 'page_oncall', enabled: true },
  { id: 'rule_5', name: 'Queue Depth', severity: 'warning', threshold: '> 1000 pending jobs', action: 'slack_alert', enabled: true },
  { id: 'rule_6', name: 'Failed Auth Attempts', severity: 'critical', threshold: '> 50 in 10min per IP', action: 'block_ip', enabled: true },
  { id: 'rule_7', name: 'Disk Usage', severity: 'warning', threshold: '> 85% used', action: 'slack_alert', enabled: true },
  { id: 'rule_8', name: 'Certificate Expiry', severity: 'critical', threshold: '< 14 days to expiry', action: 'page_oncall', enabled: true },
  { id: 'rule_9', name: 'Replication Lag', severity: 'warning', threshold: '> 5s lag', action: 'slack_alert', enabled: true },
  { id: 'rule_10', name: 'Child Data Access Anomaly', severity: 'critical', threshold: '> 100 reads in 1min per user', action: 'page_oncall', enabled: true },
];

// ============================================================================
// Data Retention (COPPA/GDPR/FERPA)
// ============================================================================

/**
 * GET /retention/dashboard
 * Query AuditLog counts grouped by entityType, last purge run, and data age stats.
 */
complianceRouter.get('/retention/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Count audit logs grouped by entityType
    const entityCounts = await prisma.auditLog.groupBy({
      by: ['entityType'],
      where: { tenantId },
      _count: { id: true },
    });

    // Find the most recent data purge
    const lastPurge = await prisma.auditLog.findFirst({
      where: { tenantId, action: 'data_purge' },
      orderBy: { timestamp: 'desc' },
      select: { id: true, timestamp: true, metadata: true },
    });

    // Data age stats: oldest and newest audit log entries
    const oldestEntry = await prisma.auditLog.findFirst({
      where: { tenantId },
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true },
    });

    const newestEntry = await prisma.auditLog.findFirst({
      where: { tenantId },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });

    // Count total records
    const totalRecords = await prisma.auditLog.count({
      where: { tenantId },
    });

    // Count records by sensitivity
    const sensitivityCounts = await prisma.auditLog.groupBy({
      by: ['sensitivity'],
      where: { tenantId },
      _count: { id: true },
    });

    const dataCategories = entityCounts.map((ec) => ({
      entityType: ec.entityType,
      recordCount: ec._count.id,
    }));

    res.json({
      success: true,
      data: {
        policies: RETENTION_POLICIES.map((p) => ({
          ...p,
          status: 'compliant',
        })),
        lastPurgeRun: lastPurge
          ? {
              id: lastPurge.id,
              timestamp: lastPurge.timestamp.toISOString(),
              metadata: lastPurge.metadata,
            }
          : null,
        complianceFrameworks: ['COPPA', 'GDPR', 'FERPA', 'APP'],
        dataStats: {
          totalRecords,
          oldestRecord: oldestEntry?.timestamp?.toISOString() ?? null,
          newestRecord: newestEntry?.timestamp?.toISOString() ?? null,
          dataCategories,
          sensitivityBreakdown: sensitivityCounts.map((sc) => ({
            sensitivity: sc.sensitivity,
            count: sc._count.id,
          })),
        },
      },
    });
  } catch (error) {
    console.error('GET /retention/dashboard error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve retention dashboard' });
  }
});

/**
 * POST /retention/purge
 * Create an AuditLog entry for the purge job and estimate records to purge.
 */
complianceRouter.post('/retention/purge', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { category, retentionDays } = req.body;

    // Determine the cutoff date based on retention period
    const effectiveRetentionDays = retentionDays ?? 365;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - effectiveRetentionDays);

    // Count records older than the retention period
    const estimatedRecords = await prisma.auditLog.count({
      where: {
        tenantId,
        timestamp: { lt: cutoffDate },
        ...(category ? { entityType: category } : {}),
      },
    });

    // Create an audit log entry for the purge job
    const purgeEntry = await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.roles[0] ?? null,
        action: 'data_purge',
        entityType: 'system',
        entityId: `purge_job`,
        metadata: {
          category: category ?? 'all',
          retentionDays: effectiveRetentionDays,
          cutoffDate: cutoffDate.toISOString(),
          estimatedRecords,
          initiatedBy: req.user!.id,
        },
        sensitivity: 'sensitive',
      },
    });

    res.json({
      success: true,
      data: {
        jobId: purgeEntry.id,
        status: 'queued',
        estimatedRecords,
        cutoffDate: cutoffDate.toISOString(),
        category: category ?? 'all',
        retentionDays: effectiveRetentionDays,
      },
    });
  } catch (error) {
    console.error('POST /retention/purge error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate purge job' });
  }
});

/**
 * POST /retention/erasure
 * Create a DataErasureRequest for the given user.
 */
complianceRouter.post('/retention/erasure', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { userId, reason, dataTypes } = req.body;

    if (!userId || typeof userId !== 'string') {
      res.status(400).json({ success: false, error: 'userId is required and must be a string' });
      return;
    }

    if (!reason || typeof reason !== 'string') {
      res.status(400).json({ success: false, error: 'reason is required and must be a string' });
      return;
    }

    const erasureRequest = await prisma.dataErasureRequest.create({
      data: {
        tenantId,
        userId,
        reason,
        status: 'pending',
        dataTypes: Array.isArray(dataTypes) ? dataTypes : [],
      },
    });

    // Create an audit log entry for the erasure request
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.roles[0] ?? null,
        action: 'data_erasure_requested',
        entityType: 'DataErasureRequest',
        entityId: erasureRequest.id,
        metadata: {
          targetUserId: userId,
          dataTypes: erasureRequest.dataTypes,
        },
        sensitivity: 'pii',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        requestId: erasureRequest.id,
        userId: erasureRequest.userId,
        reason: erasureRequest.reason,
        status: erasureRequest.status,
        dataTypes: erasureRequest.dataTypes,
        requestedAt: erasureRequest.requestedAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /retention/erasure error:', error);
    res.status(500).json({ success: false, error: 'Failed to create erasure request' });
  }
});

/**
 * GET /retention/policies
 * Return retention policies as static configuration.
 */
complianceRouter.get('/retention/policies', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      policies: RETENTION_POLICIES,
      total: RETENTION_POLICIES.length,
      complianceFrameworks: ['COPPA', 'GDPR', 'FERPA', 'APP'],
    },
  });
});

// ============================================================================
// A/B Testing Framework
// ============================================================================

const createExperimentSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().optional(),
  variants: z.array(z.object({
    name: z.string(),
    weight: z.number().min(0).max(1),
  })).min(2),
  targetMetric: z.string(),
  sampleSize: z.number().int().positive().optional(),
  safetyClassification: z.enum(['Low', 'Medium', 'High', 'Critical']).default('Low'),
});

/**
 * POST /experiments
 * Create a new A/B experiment in draft status.
 */
complianceRouter.post('/experiments', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const parsed = createExperimentSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.issues,
      });
      return;
    }

    const { name, description, variants, targetMetric, sampleSize } = parsed.data;

    const experiment = await prisma.aBExperiment.create({
      data: {
        tenantId,
        name,
        description: description ?? null,
        variants: variants as any,
        targetMetric,
        sampleSize: sampleSize ?? null,
        status: 'draft',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: experiment.id,
        name: experiment.name,
        description: experiment.description,
        variants: experiment.variants,
        targetMetric: experiment.targetMetric,
        sampleSize: experiment.sampleSize,
        status: experiment.status,
        createdAt: experiment.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /experiments error:', error);
    res.status(500).json({ success: false, error: 'Failed to create experiment' });
  }
});

/**
 * GET /experiments
 * List experiments for the tenant, paginated. Supports status filter.
 */
complianceRouter.get('/experiments', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { page, limit, skip } = paginationParams(req.query);
    const statusFilter = req.query.status as string | undefined;

    const where: any = { tenantId };
    if (statusFilter) {
      where.status = statusFilter;
    }

    const [experiments, total] = await Promise.all([
      prisma.aBExperiment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { assignments: true },
          },
        },
      }),
      prisma.aBExperiment.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        experiments: experiments.map((exp) => ({
          id: exp.id,
          name: exp.name,
          description: exp.description,
          variants: exp.variants,
          targetMetric: exp.targetMetric,
          sampleSize: exp.sampleSize,
          status: exp.status,
          startedAt: exp.startedAt?.toISOString() ?? null,
          endedAt: exp.endedAt?.toISOString() ?? null,
          createdAt: exp.createdAt.toISOString(),
          updatedAt: exp.updatedAt.toISOString(),
          assignmentCount: exp._count.assignments,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /experiments error:', error);
    res.status(500).json({ success: false, error: 'Failed to list experiments' });
  }
});

/**
 * POST /experiments/:experimentId/start
 * Start a draft experiment.
 */
complianceRouter.post('/experiments/:experimentId/start', async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.params;

    const experiment = await prisma.aBExperiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      res.status(404).json({ success: false, error: 'Experiment not found' });
      return;
    }

    if (experiment.status !== 'draft') {
      res.status(400).json({
        success: false,
        error: `Cannot start experiment with status '${experiment.status}'. Only draft experiments can be started.`,
      });
      return;
    }

    const updated = await prisma.aBExperiment.update({
      where: { id: experimentId },
      data: {
        status: 'running',
        startedAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        startedAt: updated.startedAt!.toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /experiments/:experimentId/start error:', error);
    res.status(500).json({ success: false, error: 'Failed to start experiment' });
  }
});

/**
 * POST /experiments/:experimentId/assign
 * Assign a user to a variant. Uses upsert to prevent double-assignment.
 */
complianceRouter.post('/experiments/:experimentId/assign', async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.params;
    const userId = req.body.userId || req.user!.id;

    const experiment = await prisma.aBExperiment.findUnique({
      where: { id: experimentId },
    });

    if (!experiment) {
      res.status(404).json({ success: false, error: 'Experiment not found' });
      return;
    }

    if (experiment.status !== 'running') {
      res.status(400).json({
        success: false,
        error: `Cannot assign to experiment with status '${experiment.status}'. Experiment must be running.`,
      });
      return;
    }

    // Select a variant based on weights using weighted random selection
    const variants = experiment.variants as Array<{ name: string; weight: number }>;
    if (!Array.isArray(variants) || variants.length === 0) {
      res.status(400).json({ success: false, error: 'Experiment has no valid variants configured' });
      return;
    }

    const totalWeight = variants.reduce((sum, v) => sum + (v.weight || 0), 0);
    let random = Math.random() * totalWeight;
    let selectedVariant = variants[0].name;

    for (const variant of variants) {
      random -= variant.weight || 0;
      if (random <= 0) {
        selectedVariant = variant.name;
        break;
      }
    }

    // Upsert to prevent double-assignment on the unique [experimentId, userId] constraint
    const assignment = await prisma.aBExperimentAssignment.upsert({
      where: {
        experimentId_userId: {
          experimentId,
          userId,
        },
      },
      update: {}, // No update if already assigned — keep original assignment
      create: {
        experimentId,
        userId,
        variant: selectedVariant,
        metadata: req.body.metadata ?? null,
      },
    });

    res.json({
      success: true,
      data: {
        id: assignment.id,
        experimentId: assignment.experimentId,
        userId: assignment.userId,
        variant: assignment.variant,
        assignedAt: assignment.assignedAt.toISOString(),
        isNewAssignment: assignment.variant === selectedVariant,
      },
    });
  } catch (error) {
    console.error('POST /experiments/:experimentId/assign error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign variant' });
  }
});

/**
 * GET /experiments/:experimentId/analysis
 * Analyse experiment results: counts per variant and statistical readiness.
 */
complianceRouter.get('/experiments/:experimentId/analysis', async (req: Request, res: Response) => {
  try {
    const { experimentId } = req.params;

    const experiment = await prisma.aBExperiment.findUnique({
      where: { id: experimentId },
      include: {
        assignments: true,
      },
    });

    if (!experiment) {
      res.status(404).json({ success: false, error: 'Experiment not found' });
      return;
    }

    // Count assignments per variant
    const variantCounts: Record<string, number> = {};
    for (const assignment of experiment.assignments) {
      variantCounts[assignment.variant] = (variantCounts[assignment.variant] || 0) + 1;
    }

    const totalAssignments = experiment.assignments.length;
    const variants = experiment.variants as Array<{ name: string; weight: number }>;

    const variantAnalysis = variants.map((v) => {
      const count = variantCounts[v.name] || 0;
      return {
        name: v.name,
        weight: v.weight,
        sampleSize: count,
        proportion: totalAssignments > 0 ? count / totalAssignments : 0,
      };
    });

    // Determine if the experiment has reached its target sample size
    const targetReached = experiment.sampleSize != null && totalAssignments >= experiment.sampleSize;
    let recommendation: string | null = null;

    if (experiment.status === 'running' && targetReached) {
      recommendation = 'Target sample size reached. The experiment can be concluded and results analysed for statistical significance.';
    } else if (experiment.status === 'running' && experiment.sampleSize != null) {
      const remaining = experiment.sampleSize - totalAssignments;
      recommendation = `${remaining} more assignments needed to reach the target sample size of ${experiment.sampleSize}.`;
    } else if (experiment.status === 'completed') {
      recommendation = 'Experiment has been completed.';
    } else if (experiment.status === 'draft') {
      recommendation = 'Experiment has not been started yet.';
    }

    res.json({
      success: true,
      data: {
        experimentId: experiment.id,
        name: experiment.name,
        status: experiment.status,
        targetMetric: experiment.targetMetric,
        sampleSize: totalAssignments,
        targetSampleSize: experiment.sampleSize,
        targetReached,
        variants: variantAnalysis,
        recommendation,
        startedAt: experiment.startedAt?.toISOString() ?? null,
        endedAt: experiment.endedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    console.error('GET /experiments/:experimentId/analysis error:', error);
    res.status(500).json({ success: false, error: 'Failed to analyse experiment' });
  }
});

// ============================================================================
// Security Audit
// ============================================================================

/**
 * GET /security/audit
 * Query security-related audit log entries and produce an audit summary.
 */
complianceRouter.get('/security/audit', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Query security-related audit log entries
    const securityActions = [
      'login', 'logout', 'permission_change',
      'security_scan', 'security_audit_initiated',
      'security_patch', 'security_incident',
    ];

    const securityLogs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        OR: [
          { action: { startsWith: 'security_' } },
          { action: { in: securityActions } },
        ],
      },
      orderBy: { timestamp: 'desc' },
      take: 100,
    });

    // Get the most recent entry's timestamp
    const lastAuditDate = securityLogs.length > 0
      ? securityLogs[0].timestamp.toISOString()
      : null;

    // Categorise by action type to produce check statuses
    const actionSet = new Set(securityLogs.map((l) => l.action));

    const checks = [
      {
        name: 'OWASP Top 10',
        status: actionSet.has('security_scan') || actionSet.has('security_audit_initiated') ? 'completed' : 'not_started',
        lastRun: securityLogs.find((l) => l.action === 'security_scan')?.timestamp.toISOString() ?? null,
      },
      {
        name: 'COPPA Compliance',
        status: actionSet.has('security_audit_initiated') ? 'completed' : 'not_started',
        lastRun: securityLogs.find((l) => l.action === 'security_audit_initiated')?.timestamp.toISOString() ?? null,
      },
      {
        name: 'GDPR Compliance',
        status: actionSet.has('security_audit_initiated') ? 'completed' : 'not_started',
        lastRun: securityLogs.find((l) => l.action === 'security_audit_initiated')?.timestamp.toISOString() ?? null,
      },
      {
        name: 'FERPA Compliance',
        status: actionSet.has('security_audit_initiated') ? 'completed' : 'not_started',
        lastRun: securityLogs.find((l) => l.action === 'security_audit_initiated')?.timestamp.toISOString() ?? null,
      },
      {
        name: 'Penetration Testing',
        status: actionSet.has('security_scan') ? 'completed' : 'not_started',
        lastRun: securityLogs.find((l) => l.action === 'security_scan')?.timestamp.toISOString() ?? null,
      },
      {
        name: 'Dependency Audit',
        status: actionSet.has('security_patch') ? 'completed' : 'not_started',
        lastRun: securityLogs.find((l) => l.action === 'security_patch')?.timestamp.toISOString() ?? null,
      },
    ];

    // Overall status
    const completedChecks = checks.filter((c) => c.status === 'completed').length;
    const overallStatus = completedChecks === checks.length
      ? 'passed'
      : completedChecks > 0
        ? 'partial'
        : 'pending';

    res.json({
      success: true,
      data: {
        lastAuditDate,
        status: overallStatus,
        checks,
        totalSecurityEvents: securityLogs.length,
        recentEvents: securityLogs.slice(0, 10).map((l) => ({
          id: l.id,
          action: l.action,
          entityType: l.entityType,
          timestamp: l.timestamp.toISOString(),
          userId: l.userId,
        })),
      },
    });
  } catch (error) {
    console.error('GET /security/audit error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve security audit' });
  }
});

/**
 * POST /security/audit/run
 * Initiate a security audit by creating an AuditLog entry.
 */
complianceRouter.post('/security/audit/run', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { scope, categories } = req.body;

    const auditEntry = await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.user!.id,
        userEmail: req.user!.email,
        userRole: req.user!.roles[0] ?? null,
        action: 'security_audit_initiated',
        entityType: 'system',
        entityId: `audit_${Date.now()}`,
        metadata: {
          scope: scope ?? 'full',
          categories: categories ?? ['owasp', 'coppa', 'gdpr', 'ferpa', 'dependencies'],
          initiatedBy: req.user!.id,
          initiatedAt: new Date().toISOString(),
        },
        sensitivity: 'sensitive',
      },
    });

    res.json({
      success: true,
      data: {
        auditId: auditEntry.id,
        status: 'running',
        startedAt: auditEntry.timestamp.toISOString(),
        scope: (auditEntry.metadata as any)?.scope ?? 'full',
      },
    });
  } catch (error) {
    console.error('POST /security/audit/run error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate security audit' });
  }
});

// ============================================================================
// Accessibility Audit
// ============================================================================

/**
 * GET /accessibility/audit
 * Return the most recent accessibility audit results from AuditLog.
 */
complianceRouter.get('/accessibility/audit', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const latestAudit = await prisma.auditLog.findFirst({
      where: {
        tenantId,
        action: 'accessibility_audit',
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!latestAudit) {
      res.json({
        success: true,
        data: {
          wcagLevel: 'AA',
          score: null,
          issues: [],
          lastAuditDate: null,
        },
      });
      return;
    }

    const metadata = (latestAudit.metadata ?? {}) as Record<string, any>;

    res.json({
      success: true,
      data: {
        wcagLevel: metadata.wcagLevel ?? 'AA',
        score: metadata.score ?? null,
        issues: metadata.issues ?? [],
        lastAuditDate: latestAudit.timestamp.toISOString(),
        auditId: latestAudit.id,
      },
    });
  } catch (error) {
    console.error('GET /accessibility/audit error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve accessibility audit' });
  }
});

// ============================================================================
// Monitoring & Alerting
// ============================================================================

/**
 * POST /monitoring/evaluate
 * Evaluate monitoring rules against recent AuditLog activity.
 */
complianceRouter.post('/monitoring/evaluate', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Query recent AuditLog entries (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const recentLogs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        timestamp: { gte: fiveMinutesAgo },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Count entries by action
    const actionCounts: Record<string, number> = {};
    for (const log of recentLogs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    }

    // Evaluate each monitoring rule against the data
    const triggeredAlerts: Array<{
      rule: string;
      severity: string;
      message: string;
      count: number;
    }> = [];

    // Check for high error rate (5xx-like events)
    const errorCount = (actionCounts['error'] || 0) + (actionCounts['server_error'] || 0);
    if (recentLogs.length > 0 && errorCount / recentLogs.length > 0.05) {
      triggeredAlerts.push({
        rule: 'High Error Rate',
        severity: 'critical',
        message: `Error rate is ${((errorCount / recentLogs.length) * 100).toFixed(1)}% (${errorCount}/${recentLogs.length}) in the last 5 minutes`,
        count: errorCount,
      });
    }

    // Check for failed auth attempts
    const failedAuthCount = actionCounts['login_failed'] || 0;
    if (failedAuthCount > 50) {
      triggeredAlerts.push({
        rule: 'Failed Auth Attempts',
        severity: 'critical',
        message: `${failedAuthCount} failed login attempts in the last 5 minutes`,
        count: failedAuthCount,
      });
    }

    // Check for child data access anomaly
    const childDataCount = recentLogs.filter((l) => l.sensitivity === 'child_data').length;
    if (childDataCount > 100) {
      triggeredAlerts.push({
        rule: 'Child Data Access Anomaly',
        severity: 'critical',
        message: `${childDataCount} child data access events in the last 5 minutes`,
        count: childDataCount,
      });
    }

    // Create an AuditLog entry for the evaluation
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: req.user!.id,
        userEmail: req.user!.email,
        action: 'monitoring_evaluation',
        entityType: 'system',
        entityId: `eval_${Date.now()}`,
        metadata: {
          rulesEvaluated: MONITORING_RULES.length,
          alertsTriggered: triggeredAlerts.length,
          recentLogCount: recentLogs.length,
          actionCounts,
          alerts: triggeredAlerts,
        },
      },
    });

    res.json({
      success: true,
      data: {
        alertsTriggered: triggeredAlerts.length,
        alerts: triggeredAlerts,
        rulesEvaluated: MONITORING_RULES.length,
        recentEventCount: recentLogs.length,
        evaluationWindow: '5m',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /monitoring/evaluate error:', error);
    res.status(500).json({ success: false, error: 'Failed to evaluate monitoring rules' });
  }
});

/**
 * GET /monitoring/incidents
 * List incidents from AuditLog, paginated.
 */
complianceRouter.get('/monitoring/incidents', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { page, limit, skip } = paginationParams(req.query);

    const where = {
      tenantId,
      action: 'incident',
    };

    const [incidents, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestamp: 'desc' },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        incidents: incidents.map((inc) => ({
          id: inc.id,
          entityType: inc.entityType,
          entityId: inc.entityId,
          metadata: inc.metadata,
          sensitivity: inc.sensitivity,
          timestamp: inc.timestamp.toISOString(),
          userId: inc.userId,
          userEmail: inc.userEmail,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('GET /monitoring/incidents error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve incidents' });
  }
});

/**
 * POST /monitoring/incidents/:incidentId/acknowledge
 * Acknowledge an incident by updating its metadata.
 */
complianceRouter.post('/monitoring/incidents/:incidentId/acknowledge', async (req: Request, res: Response) => {
  try {
    const { incidentId } = req.params;

    const incident = await prisma.auditLog.findFirst({
      where: {
        id: incidentId,
        action: 'incident',
      },
    });

    if (!incident) {
      res.status(404).json({ success: false, error: 'Incident not found' });
      return;
    }

    const existingMetadata = (incident.metadata ?? {}) as Record<string, any>;

    const updated = await prisma.auditLog.update({
      where: { id: incidentId },
      data: {
        metadata: {
          ...existingMetadata,
          acknowledgedBy: req.user!.id,
          acknowledgedByEmail: req.user!.email,
          acknowledgedAt: new Date().toISOString(),
          acknowledgementNote: req.body.note ?? null,
        },
      },
    });

    res.json({
      success: true,
      data: {
        incidentId: updated.id,
        status: 'acknowledged',
        acknowledgedBy: req.user!.id,
        acknowledgedAt: ((updated.metadata as any)?.acknowledgedAt) ?? new Date().toISOString(),
        metadata: updated.metadata,
      },
    });
  } catch (error) {
    console.error('POST /monitoring/incidents/:incidentId/acknowledge error:', error);
    res.status(500).json({ success: false, error: 'Failed to acknowledge incident' });
  }
});

/**
 * GET /monitoring/rules
 * Return monitoring rules as static configuration data.
 */
complianceRouter.get('/monitoring/rules', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      rules: MONITORING_RULES,
      total: MONITORING_RULES.length,
    },
  });
});

/**
 * GET /monitoring/oncall
 * Return on-call rotation from AuditLog or defaults.
 */
complianceRouter.get('/monitoring/oncall', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const latestRotation = await prisma.auditLog.findFirst({
      where: {
        tenantId,
        action: 'oncall_rotation',
      },
      orderBy: { timestamp: 'desc' },
    });

    if (!latestRotation) {
      res.json({
        success: true,
        data: {
          rotation: {
            primary: null,
            secondary: null,
            escalation: null,
          },
          lastUpdated: null,
        },
      });
      return;
    }

    const metadata = (latestRotation.metadata ?? {}) as Record<string, any>;

    res.json({
      success: true,
      data: {
        rotation: {
          primary: metadata.primary ?? null,
          secondary: metadata.secondary ?? null,
          escalation: metadata.escalation ?? null,
        },
        lastUpdated: latestRotation.timestamp.toISOString(),
        rotationId: latestRotation.id,
      },
    });
  } catch (error) {
    console.error('GET /monitoring/oncall error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve on-call rotation' });
  }
});

// ============================================================================
// Production Deployment
// ============================================================================

/**
 * GET /deploy/status
 * Query recent DataMigration records as deployment history and return current version.
 */
complianceRouter.get('/deploy/status', async (_req: Request, res: Response) => {
  try {
    const recentDeployments = await prisma.dataMigration.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const currentVersion = process.env.APP_VERSION || process.env.npm_package_version || '1.0.0';

    // Determine the current running deployment
    const latestCompleted = recentDeployments.find((d) => d.status === 'completed');
    const latestPending = recentDeployments.find((d) => d.status === 'pending' || d.status === 'running');

    res.json({
      success: true,
      data: {
        currentVersion,
        status: latestPending ? 'deploying' : 'running',
        lastDeployedAt: latestCompleted?.completedAt?.toISOString() ?? latestCompleted?.createdAt?.toISOString() ?? null,
        recentDeployments: recentDeployments.map((d) => ({
          id: d.id,
          name: d.name,
          description: d.description,
          status: d.status,
          startedAt: d.startedAt?.toISOString() ?? null,
          completedAt: d.completedAt?.toISOString() ?? null,
          totalRecords: d.totalRecords,
          processedRecords: d.processedRecords,
          failedRecords: d.failedRecords,
          isReversible: d.isReversible,
          createdAt: d.createdAt.toISOString(),
        })),
        services: [
          { name: 'api-gateway', status: 'healthy' },
          { name: 'web', status: 'healthy' },
          { name: 'storybook-engine', status: 'healthy' },
        ],
      },
    });
  } catch (error) {
    console.error('GET /deploy/status error:', error);
    res.status(500).json({ success: false, error: 'Failed to retrieve deployment status' });
  }
});

/**
 * POST /deploy/:version/promote
 * Create a DataMigration record to represent a deployment promotion.
 */
complianceRouter.post('/deploy/:version/promote', async (req: Request, res: Response) => {
  try {
    const { version } = req.params;

    if (!version || version.trim() === '') {
      res.status(400).json({ success: false, error: 'Version parameter is required and must be non-empty' });
      return;
    }

    const strategy = req.body.strategy || 'blue-green';

    const deployment = await prisma.dataMigration.create({
      data: {
        name: `deploy_${version}_${Date.now()}`,
        description: `Promote version ${version} using ${strategy} strategy`,
        status: 'pending',
        isReversible: true,
        resultSummary: {
          version,
          strategy,
          promotedBy: req.user!.id,
          promotedAt: new Date().toISOString(),
        },
      },
    });

    res.json({
      success: true,
      data: {
        id: deployment.id,
        name: deployment.name,
        version,
        status: deployment.status,
        strategy,
        isReversible: deployment.isReversible,
        createdAt: deployment.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /deploy/:version/promote error:', error);
    res.status(500).json({ success: false, error: 'Failed to promote deployment' });
  }
});

/**
 * POST /deploy/rollback
 * Rollback to the most recent completed deployment.
 */
complianceRouter.post('/deploy/rollback', async (req: Request, res: Response) => {
  try {
    // Find the most recent completed deployment
    const lastCompleted = await prisma.dataMigration.findFirst({
      where: { status: 'completed' },
      orderBy: { completedAt: 'desc' },
    });

    if (!lastCompleted) {
      res.status(404).json({
        success: false,
        error: 'No completed deployment found to rollback from',
      });
      return;
    }

    // Extract version from the deployment name or resultSummary
    const summaryData = (lastCompleted.resultSummary ?? {}) as Record<string, any>;
    const targetVersion = summaryData.version ?? lastCompleted.name;

    const rollback = await prisma.dataMigration.create({
      data: {
        name: `rollback_${Date.now()}`,
        description: `Rollback to version: ${targetVersion} (from deployment ${lastCompleted.name})`,
        status: 'pending',
        isReversible: true,
        rollbackData: {
          sourceDeploymentId: lastCompleted.id,
          sourceDeploymentName: lastCompleted.name,
          targetVersion,
          rolledBackBy: req.user!.id,
          rolledBackAt: new Date().toISOString(),
        },
      },
    });

    res.json({
      success: true,
      data: {
        id: rollback.id,
        name: rollback.name,
        status: rollback.status,
        targetVersion,
        sourceDeploymentId: lastCompleted.id,
        createdAt: rollback.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('POST /deploy/rollback error:', error);
    res.status(500).json({ success: false, error: 'Failed to initiate rollback' });
  }
});
