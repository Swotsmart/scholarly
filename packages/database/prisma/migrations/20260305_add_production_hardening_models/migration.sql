-- S&R Canvas Persistence Models (replaces InMemory stores)

CREATE TABLE "SRWorkflow" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "definition" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SRWorkflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SRWorkflowRun" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "nodeRuns" JSONB NOT NULL DEFAULT '[]',
    "portData" JSONB NOT NULL DEFAULT '{}',
    "timeline" JSONB NOT NULL DEFAULT '[]',
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SRWorkflowRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "HealthCheckLog" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "details" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HealthCheckLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MetricsSnapshot" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "labels" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricsSnapshot_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
CREATE UNIQUE INDEX "SRWorkflow_workflowId_tenantId_key" ON "SRWorkflow"("workflowId", "tenantId");
CREATE UNIQUE INDEX "SRWorkflowRun_runId_key" ON "SRWorkflowRun"("runId");

-- Indexes for SRWorkflow
CREATE INDEX "SRWorkflow_tenantId_isDeleted_updatedAt_idx" ON "SRWorkflow"("tenantId", "isDeleted", "updatedAt");
CREATE INDEX "SRWorkflow_tenantId_tags_idx" ON "SRWorkflow"("tenantId", "tags");

-- Indexes for SRWorkflowRun
CREATE INDEX "SRWorkflowRun_workflowId_tenantId_idx" ON "SRWorkflowRun"("workflowId", "tenantId");
CREATE INDEX "SRWorkflowRun_tenantId_status_idx" ON "SRWorkflowRun"("tenantId", "status");

-- Indexes for HealthCheckLog
CREATE INDEX "HealthCheckLog_service_checkedAt_idx" ON "HealthCheckLog"("service", "checkedAt");
CREATE INDEX "HealthCheckLog_status_checkedAt_idx" ON "HealthCheckLog"("status", "checkedAt");

-- Indexes for MetricsSnapshot
CREATE INDEX "MetricsSnapshot_name_timestamp_idx" ON "MetricsSnapshot"("name", "timestamp");

-- Foreign keys
ALTER TABLE "SRWorkflow" ADD CONSTRAINT "SRWorkflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SRWorkflowRun" ADD CONSTRAINT "SRWorkflowRun_workflowId_tenantId_fkey" FOREIGN KEY ("workflowId", "tenantId") REFERENCES "SRWorkflow"("workflowId", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;
