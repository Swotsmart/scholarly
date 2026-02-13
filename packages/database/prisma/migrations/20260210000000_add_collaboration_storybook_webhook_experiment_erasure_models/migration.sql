-- CreateTable
CREATE TABLE "CollaborativeSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "sessionType" TEXT NOT NULL DEFAULT 'story',
    "participants" JSONB NOT NULL DEFAULT '[]',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollaborativeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionContribution" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionContribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlanComment" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'comment',
    "text" TEXT NOT NULL,
    "parentId" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlanComment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SharedResource" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SharedResource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoryGenerationJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL DEFAULT 'story',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "resultContentId" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoryGenerationJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookSubscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "events" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "headers" JSONB,
    "lastDeliveredAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookDelivery" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "statusCode" INTEGER,
    "response" TEXT,
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "deliveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextRetry" TIMESTAMP(3),

    CONSTRAINT "WebhookDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ABExperiment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "variants" JSONB NOT NULL,
    "targetMetric" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "sampleSize" INTEGER,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ABExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ABExperimentAssignment" (
    "id" TEXT NOT NULL,
    "experimentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "ABExperimentAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataErasureRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "dataTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "processedBy" TEXT,
    "notes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DataErasureRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CollaborativeSession_tenantId_status_idx" ON "CollaborativeSession"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CollaborativeSession_creatorId_idx" ON "CollaborativeSession"("creatorId");

-- CreateIndex
CREATE INDEX "SessionContribution_sessionId_sequence_idx" ON "SessionContribution"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "SessionContribution_userId_idx" ON "SessionContribution"("userId");

-- CreateIndex
CREATE INDEX "LessonPlanComment_lessonPlanId_idx" ON "LessonPlanComment"("lessonPlanId");

-- CreateIndex
CREATE INDEX "LessonPlanComment_userId_idx" ON "LessonPlanComment"("userId");

-- CreateIndex
CREATE INDEX "LessonPlanComment_parentId_idx" ON "LessonPlanComment"("parentId");

-- CreateIndex
CREATE INDEX "SharedResource_tenantId_status_idx" ON "SharedResource"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SharedResource_tenantId_type_idx" ON "SharedResource"("tenantId", "type");

-- CreateIndex
CREATE INDEX "SharedResource_creatorId_idx" ON "SharedResource"("creatorId");

-- CreateIndex
CREATE INDEX "StoryGenerationJob_tenantId_userId_idx" ON "StoryGenerationJob"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "StoryGenerationJob_status_idx" ON "StoryGenerationJob"("status");

-- CreateIndex
CREATE INDEX "WebhookSubscription_tenantId_developerId_idx" ON "WebhookSubscription"("tenantId", "developerId");

-- CreateIndex
CREATE INDEX "WebhookSubscription_status_idx" ON "WebhookSubscription"("status");

-- CreateIndex
CREATE INDEX "WebhookDelivery_subscriptionId_deliveredAt_idx" ON "WebhookDelivery"("subscriptionId", "deliveredAt");

-- CreateIndex
CREATE INDEX "WebhookDelivery_eventType_idx" ON "WebhookDelivery"("eventType");

-- CreateIndex
CREATE INDEX "ABExperiment_tenantId_status_idx" ON "ABExperiment"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ABExperimentAssignment_experimentId_userId_key" ON "ABExperimentAssignment"("experimentId", "userId");

-- CreateIndex
CREATE INDEX "ABExperimentAssignment_userId_idx" ON "ABExperimentAssignment"("userId");

-- AddForeignKey
ALTER TABLE "SessionContribution" ADD CONSTRAINT "SessionContribution_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CollaborativeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookDelivery" ADD CONSTRAINT "WebhookDelivery_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "WebhookSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ABExperimentAssignment" ADD CONSTRAINT "ABExperimentAssignment_experimentId_fkey" FOREIGN KEY ("experimentId") REFERENCES "ABExperiment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
