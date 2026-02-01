-- Scholarly Hosting Platform Tables
-- Migration: add_hosting_models

-- CreateTable
CREATE TABLE "HostingProvider" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "legalName" TEXT,
    "description" TEXT NOT NULL,
    "tagline" TEXT,
    "logoUrl" TEXT,
    "faviconUrl" TEXT,
    "theme" JSONB NOT NULL DEFAULT '{}',
    "locations" JSONB NOT NULL DEFAULT '[]',
    "serviceArea" JSONB,
    "primaryContact" JSONB NOT NULL,
    "primaryDomain" TEXT,
    "qualityProfile" JSONB NOT NULL DEFAULT '{}',
    "features" JSONB NOT NULL DEFAULT '{}',
    "seoConfig" JSONB NOT NULL DEFAULT '{}',
    "agentConfig" JSONB NOT NULL DEFAULT '{}',
    "lisIdentifiers" JSONB,
    "scholarlyTenantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending_setup',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "HostingProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingDomain" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "sslStatus" TEXT NOT NULL DEFAULT 'pending',
    "sslExpiresAt" TIMESTAMP(3),
    "verificationToken" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingDomain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingOffering" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortDescription" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "yearLevels" TEXT[],
    "subjectAreas" TEXT[],
    "prerequisites" TEXT,
    "deliveryModes" TEXT[],
    "duration" JSONB,
    "schedule" JSONB,
    "pricing" JSONB NOT NULL,
    "capacity" JSONB,
    "curriculum" JSONB,
    "learningOutcomes" TEXT[],
    "materials" JSONB,
    "featuredImage" TEXT,
    "gallery" TEXT[],
    "videoUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingOffering_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingEnquiry" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "offeringId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "preferredContact" TEXT NOT NULL DEFAULT 'email',
    "studentName" TEXT,
    "studentAge" INTEGER,
    "studentYearLevel" TEXT,
    "enquiryType" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'website',
    "agentId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "responseMessage" TEXT,
    "respondedAt" TIMESTAMP(3),
    "respondedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingEnquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingTourBooking" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 60,
    "tourType" TEXT NOT NULL,
    "attendeeCount" INTEGER NOT NULL DEFAULT 1,
    "studentNames" TEXT[],
    "specialRequests" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancellationReason" TEXT,
    "providerNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingTourBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingReview" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "authorId" TEXT,
    "authorType" TEXT NOT NULL,
    "authorName" TEXT,
    "overallRating" DOUBLE PRECISION NOT NULL,
    "categoryRatings" JSONB NOT NULL DEFAULT '[]',
    "title" TEXT,
    "content" TEXT NOT NULL,
    "wouldRecommend" BOOLEAN NOT NULL DEFAULT true,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationMethod" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "providerResponse" TEXT,
    "providerRespondedAt" TIMESTAMP(3),
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "moderatedAt" TIMESTAMP(3),
    "moderationNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HostingQualityEvent" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "verificationMethod" TEXT,
    "supportingDocumentUrl" TEXT,
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HostingQualityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostingProvider_tenantId_primaryDomain_key" ON "HostingProvider"("tenantId", "primaryDomain");

-- CreateIndex
CREATE INDEX "HostingProvider_tenantId_status_idx" ON "HostingProvider"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HostingProvider_tenantId_type_idx" ON "HostingProvider"("tenantId", "type");

-- CreateIndex
CREATE INDEX "HostingProvider_primaryDomain_idx" ON "HostingProvider"("primaryDomain");

-- CreateIndex
CREATE INDEX "HostingProvider_status_idx" ON "HostingProvider"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HostingDomain_domain_key" ON "HostingDomain"("domain");

-- CreateIndex
CREATE INDEX "HostingDomain_providerId_idx" ON "HostingDomain"("providerId");

-- CreateIndex
CREATE INDEX "HostingDomain_domain_idx" ON "HostingDomain"("domain");

-- CreateIndex
CREATE INDEX "HostingDomain_status_idx" ON "HostingDomain"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HostingOffering_providerId_slug_key" ON "HostingOffering"("providerId", "slug");

-- CreateIndex
CREATE INDEX "HostingOffering_providerId_status_idx" ON "HostingOffering"("providerId", "status");

-- CreateIndex
CREATE INDEX "HostingOffering_providerId_type_idx" ON "HostingOffering"("providerId", "type");

-- CreateIndex
CREATE INDEX "HostingOffering_status_idx" ON "HostingOffering"("status");

-- CreateIndex
CREATE INDEX "HostingEnquiry_providerId_status_idx" ON "HostingEnquiry"("providerId", "status");

-- CreateIndex
CREATE INDEX "HostingEnquiry_providerId_createdAt_idx" ON "HostingEnquiry"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "HostingEnquiry_contactEmail_idx" ON "HostingEnquiry"("contactEmail");

-- CreateIndex
CREATE INDEX "HostingTourBooking_providerId_status_idx" ON "HostingTourBooking"("providerId", "status");

-- CreateIndex
CREATE INDEX "HostingTourBooking_providerId_scheduledAt_idx" ON "HostingTourBooking"("providerId", "scheduledAt");

-- CreateIndex
CREATE INDEX "HostingTourBooking_contactEmail_idx" ON "HostingTourBooking"("contactEmail");

-- CreateIndex
CREATE INDEX "HostingReview_providerId_status_idx" ON "HostingReview"("providerId", "status");

-- CreateIndex
CREATE INDEX "HostingReview_providerId_overallRating_idx" ON "HostingReview"("providerId", "overallRating");

-- CreateIndex
CREATE INDEX "HostingReview_status_idx" ON "HostingReview"("status");

-- CreateIndex
CREATE INDEX "HostingQualityEvent_providerId_eventType_idx" ON "HostingQualityEvent"("providerId", "eventType");

-- CreateIndex
CREATE INDEX "HostingQualityEvent_providerId_isVerified_idx" ON "HostingQualityEvent"("providerId", "isVerified");

-- AddForeignKey
ALTER TABLE "HostingDomain" ADD CONSTRAINT "HostingDomain_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "HostingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingOffering" ADD CONSTRAINT "HostingOffering_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "HostingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingEnquiry" ADD CONSTRAINT "HostingEnquiry_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "HostingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingTourBooking" ADD CONSTRAINT "HostingTourBooking_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "HostingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingReview" ADD CONSTRAINT "HostingReview_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "HostingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HostingQualityEvent" ADD CONSTRAINT "HostingQualityEvent_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "HostingProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
