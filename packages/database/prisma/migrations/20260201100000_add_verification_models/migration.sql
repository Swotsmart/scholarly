-- Scholarly KYC/KYB/WWCC Verification Tables
-- Migration: add_verification_models

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerSessionId" TEXT,
    "providerIntentId" TEXT,
    "providerAccountId" TEXT,
    "verificationType" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "dateOfBirth" TIMESTAMP(3),
    "idNumber" TEXT,
    "idNumberType" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "documentType" TEXT,
    "documentCountry" TEXT,
    "documentNumber" TEXT,
    "documentExpiresAt" TIMESTAMP(3),
    "documentFrontUrl" TEXT,
    "documentBackUrl" TEXT,
    "selfieUrl" TEXT,
    "selfieScore" DOUBLE PRECISION,
    "livenessScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "riskScore" DOUBLE PRECISION,
    "riskSignals" JSONB NOT NULL DEFAULT '[]',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "deviceInfo" JSONB,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WWCCVerification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "wwccNumber" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "cardType" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "registryStatus" TEXT,
    "registryLastChecked" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verificationMethod" TEXT,
    "verifierNotes" TEXT,
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "employerRegistrationNumber" TEXT,
    "organisationName" TEXT,
    "cardFrontUrl" TEXT,
    "cardBackUrl" TEXT,
    "lastMonitoredAt" TIMESTAMP(3),
    "monitoringEnabled" BOOLEAN NOT NULL DEFAULT true,
    "alertOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WWCCVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessVerification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "abn" TEXT,
    "acn" TEXT,
    "abnStatus" TEXT,
    "abnStatusDate" TIMESTAMP(3),
    "gstRegistered" BOOLEAN,
    "legalName" TEXT,
    "tradingName" TEXT,
    "businessType" TEXT,
    "businessAddress" JSONB,
    "businessStartDate" TIMESTAMP(3),
    "asicStatus" TEXT,
    "asicRegistrationDate" TIMESTAMP(3),
    "asicReviewDate" TIMESTAMP(3),
    "directors" JSONB NOT NULL DEFAULT '[]',
    "registrationAuthority" TEXT,
    "registrationNumber" TEXT,
    "registrationStatus" TEXT,
    "registrationExpiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "verifierNotes" TEXT,
    "riskLevel" TEXT,
    "riskSignals" JSONB NOT NULL DEFAULT '[]',
    "documents" JSONB NOT NULL DEFAULT '[]',
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "storageProvider" TEXT NOT NULL DEFAULT 'azure',
    "storagePath" TEXT NOT NULL,
    "storageUrl" TEXT,
    "extractedData" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "documentExpiresAt" TIMESTAMP(3),
    "retentionPolicy" TEXT NOT NULL DEFAULT 'standard',
    "deleteAfter" TIMESTAMP(3),
    "uploadedBy" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3),
    "accessCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "verificationType" TEXT NOT NULL,
    "verificationId" TEXT NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "previousStatus" TEXT,
    "newStatus" TEXT,
    "eventData" JSONB NOT NULL DEFAULT '{}',
    "errorDetails" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: IdentityVerification
CREATE UNIQUE INDEX "IdentityVerification_providerSessionId_key" ON "IdentityVerification"("providerSessionId");

CREATE INDEX "IdentityVerification_tenantId_userId_idx" ON "IdentityVerification"("tenantId", "userId");

CREATE INDEX "IdentityVerification_tenantId_status_idx" ON "IdentityVerification"("tenantId", "status");

CREATE INDEX "IdentityVerification_provider_providerSessionId_idx" ON "IdentityVerification"("provider", "providerSessionId");

CREATE INDEX "IdentityVerification_userId_status_idx" ON "IdentityVerification"("userId", "status");

-- CreateIndex: WWCCVerification
CREATE UNIQUE INDEX "WWCCVerification_tenantId_userId_state_key" ON "WWCCVerification"("tenantId", "userId", "state");

CREATE INDEX "WWCCVerification_tenantId_status_idx" ON "WWCCVerification"("tenantId", "status");

CREATE INDEX "WWCCVerification_wwccNumber_state_idx" ON "WWCCVerification"("wwccNumber", "state");

CREATE INDEX "WWCCVerification_userId_status_idx" ON "WWCCVerification"("userId", "status");

CREATE INDEX "WWCCVerification_expiresAt_idx" ON "WWCCVerification"("expiresAt");

-- CreateIndex: BusinessVerification
CREATE UNIQUE INDEX "BusinessVerification_tenantId_entityType_entityId_key" ON "BusinessVerification"("tenantId", "entityType", "entityId");

CREATE INDEX "BusinessVerification_tenantId_status_idx" ON "BusinessVerification"("tenantId", "status");

CREATE INDEX "BusinessVerification_abn_idx" ON "BusinessVerification"("abn");

CREATE INDEX "BusinessVerification_entityType_entityId_idx" ON "BusinessVerification"("entityType", "entityId");

-- CreateIndex: VerificationDocument
CREATE INDEX "VerificationDocument_tenantId_ownerType_ownerId_idx" ON "VerificationDocument"("tenantId", "ownerType", "ownerId");

CREATE INDEX "VerificationDocument_documentType_idx" ON "VerificationDocument"("documentType");

CREATE INDEX "VerificationDocument_deleteAfter_idx" ON "VerificationDocument"("deleteAfter");

-- CreateIndex: VerificationAuditLog
CREATE INDEX "VerificationAuditLog_tenantId_verificationId_idx" ON "VerificationAuditLog"("tenantId", "verificationId");

CREATE INDEX "VerificationAuditLog_tenantId_verificationType_timestamp_idx" ON "VerificationAuditLog"("tenantId", "verificationType", "timestamp");

CREATE INDEX "VerificationAuditLog_actorId_timestamp_idx" ON "VerificationAuditLog"("actorId", "timestamp");

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WWCCVerification" ADD CONSTRAINT "WWCCVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
