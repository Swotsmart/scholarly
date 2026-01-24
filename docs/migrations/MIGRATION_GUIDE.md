# Scholarly Schema Migration Guide

## From Original Schema to Enhanced Schema v2.0

This guide walks you through applying the schema enhancements incrementally, minimizing risk and allowing for rollback at each stage. Think of it like renovating a house while people are still living in it – we tackle one room at a time, ensuring everything still works before moving to the next.

---

## Table of Contents

1. [Pre-Migration Checklist](#pre-migration-checklist)
2. [Migration Phases Overview](#migration-phases-overview)
3. [Phase 1: Infrastructure & Audit](#phase-1-infrastructure--audit)
4. [Phase 2: Reference Tables](#phase-2-reference-tables)
5. [Phase 3: Soft Deletes](#phase-3-soft-deletes)
6. [Phase 4: Extracted Models](#phase-4-extracted-models)
7. [Phase 5: Unique Constraints](#phase-5-unique-constraints)
8. [Phase 6: Composite Indexes](#phase-6-composite-indexes)
9. [Phase 7: New Feature Models](#phase-7-new-feature-models)
10. [Post-Migration Validation](#post-migration-validation)
11. [Rollback Procedures](#rollback-procedures)

---

## Pre-Migration Checklist

Before starting any migration, complete these steps:

### Environment Preparation

```bash
# 1. Create a database backup
pg_dump -h $DB_HOST -U $DB_USER -d scholarly_production > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify backup integrity
pg_restore --list backup_*.sql | head -20

# 3. Create a staging environment with production data copy
createdb scholarly_staging
pg_restore -d scholarly_staging backup_*.sql

# 4. Run existing tests against staging
npm run test:integration -- --database=staging
```

### Code Preparation

```bash
# 1. Create a migration branch
git checkout -b feature/schema-enhancements-v2

# 2. Copy the enhanced schema
cp schema-enhanced.prisma packages/database/prisma/schema.prisma

# 3. Generate Prisma client (don't run migrations yet)
cd packages/database
npx prisma generate
```

### Estimated Timeline

| Phase | Duration | Risk Level | Downtime Required |
|-------|----------|------------|-------------------|
| Phase 1: Infrastructure | 30 min | Low | No |
| Phase 2: Reference Tables | 1-2 hours | Medium | No |
| Phase 3: Soft Deletes | 30 min | Low | No |
| Phase 4: Extracted Models | 2-4 hours | High | Brief (< 5 min) |
| Phase 5: Unique Constraints | 1 hour | Medium | No |
| Phase 6: Composite Indexes | 30 min | Low | No |
| Phase 7: New Features | 1 hour | Low | No |

**Total: 6-10 hours** (can be spread across multiple deployment windows)

---

## Migration Phases Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    MIGRATION DEPENDENCY GRAPH                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Phase 1: Infrastructure    ─────────────────────────────────┐          │
│  (AuditLog, DataMigration)                                   │          │
│           │                                                  │          │
│           ▼                                                  │          │
│  Phase 2: Reference Tables  ◄────────────────────────────────┤          │
│  (Subject, Address)                                          │          │
│           │                                                  │          │
│           ├──────────────────┐                               │          │
│           ▼                  ▼                               │          │
│  Phase 3: Soft Deletes    Phase 4: Extracted Models          │          │
│  (deletedAt fields)       (Availability, Pricing, Votes)     │          │
│           │                  │                               │          │
│           └────────┬─────────┘                               │          │
│                    ▼                                         │          │
│           Phase 5: Unique Constraints                        │          │
│           (Dedupe then constrain)                            │          │
│                    │                                         │          │
│                    ▼                                         │          │
│           Phase 6: Composite Indexes                         │          │
│           (Performance optimization)                         │          │
│                    │                                         │          │
│                    ▼                                         │          │
│           Phase 7: New Feature Models                        │          │
│           (EduScrum, Notifications, Analytics, etc.)         │          │
│                                                              │          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Infrastructure & Audit

**Goal:** Add foundational infrastructure models that don't affect existing functionality.

**Risk Level:** 🟢 Low

### Step 1.1: Create Migration File

```bash
npx prisma migrate dev --name add_audit_infrastructure --create-only
```

### Step 1.2: Migration SQL

```sql
-- Migration: add_audit_infrastructure
-- Description: Add AuditLog and DataMigration tables for compliance and tracking

-- AuditLog table for compliance tracking
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "sensitivity" TEXT NOT NULL DEFAULT 'normal',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- DataMigration table for tracking data migrations
CREATE TABLE "DataMigration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecords" INTEGER,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "resultSummary" JSONB,
    "errorLog" JSONB NOT NULL DEFAULT '[]',
    "isReversible" BOOLEAN NOT NULL DEFAULT false,
    "rollbackData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataMigration_pkey" PRIMARY KEY ("id")
);

-- Indexes for AuditLog
CREATE INDEX "AuditLog_tenantId_timestamp_idx" ON "AuditLog"("tenantId", "timestamp");
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");
CREATE INDEX "AuditLog_tenantId_userId_timestamp_idx" ON "AuditLog"("tenantId", "userId", "timestamp");
CREATE INDEX "AuditLog_tenantId_action_timestamp_idx" ON "AuditLog"("tenantId", "action", "timestamp");
CREATE INDEX "AuditLog_sensitivity_timestamp_idx" ON "AuditLog"("sensitivity", "timestamp");

-- Indexes for DataMigration
CREATE UNIQUE INDEX "DataMigration_name_key" ON "DataMigration"("name");
CREATE INDEX "DataMigration_status_idx" ON "DataMigration"("status");
CREATE INDEX "DataMigration_createdAt_idx" ON "DataMigration"("createdAt");
```

### Step 1.3: Apply and Verify

```bash
# Apply migration
npx prisma migrate deploy

# Verify tables exist
npx prisma db execute --stdin <<< "SELECT COUNT(*) FROM \"AuditLog\";"

# Log this migration
npx prisma db execute --stdin <<< "
INSERT INTO \"DataMigration\" (id, name, description, status, \"completedAt\", \"createdAt\", \"updatedAt\")
VALUES (
  'mig_phase1_audit',
  'phase1_audit_infrastructure',
  'Added AuditLog and DataMigration tables',
  'completed',
  NOW(),
  NOW(),
  NOW()
);
"
```

### Step 1.4: Update Application Code

```typescript
// packages/api/src/middleware/audit.middleware.ts
import { prisma } from '@scholarly/database';

export async function auditMiddleware(req, res, next) {
  // Store original end function
  const originalEnd = res.end;
  
  res.end = async function(...args) {
    // Log the action after response
    if (req.auditAction) {
      await prisma.auditLog.create({
        data: {
          tenantId: req.tenantId,
          userId: req.user?.id,
          userEmail: req.user?.email,
          userRole: req.user?.roles?.[0],
          action: req.auditAction.action,
          entityType: req.auditAction.entityType,
          entityId: req.auditAction.entityId,
          changes: req.auditAction.changes,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
          requestId: req.id,
          sensitivity: req.auditAction.sensitivity || 'normal',
        },
      });
    }
    
    return originalEnd.apply(this, args);
  };
  
  next();
}
```

---

## Phase 2: Reference Tables

**Goal:** Add Subject and Address reference tables, then migrate existing data to use them.

**Risk Level:** 🟡 Medium (requires data migration)

### Step 2.1: Create Subject Table

```sql
-- Migration: add_subject_reference_table

CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "learningArea" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subject_tenantId_code_key" ON "Subject"("tenantId", "code");
CREATE INDEX "Subject_tenantId_isActive_idx" ON "Subject"("tenantId", "isActive");
CREATE INDEX "Subject_learningArea_idx" ON "Subject"("learningArea");

-- Add foreign key to Tenant
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_tenantId_fkey" 
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Step 2.2: Populate Subjects from Existing Data

```sql
-- Extract unique subjects from existing bookings and content
-- This creates Subject records from denormalized data

INSERT INTO "Subject" ("id", "tenantId", "code", "name", "createdAt", "updatedAt")
SELECT 
    'subj_' || md5(b."tenantId" || b."subjectId") as id,
    b."tenantId",
    b."subjectId" as code,
    COALESCE(b."subjectName", b."subjectId") as name,
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM "Booking" b
WHERE b."subjectId" IS NOT NULL
GROUP BY b."tenantId", b."subjectId", b."subjectName"
ON CONFLICT ("tenantId", "code") DO NOTHING;

-- Also from Content
INSERT INTO "Subject" ("id", "tenantId", "code", "name", "createdAt", "updatedAt")
SELECT 
    'subj_' || md5(c."tenantId" || unnest(c."subjects")) as id,
    c."tenantId",
    unnest(c."subjects") as code,
    unnest(c."subjects") as name,
    NOW() as "createdAt",
    NOW() as "updatedAt"
FROM "Content" c
WHERE c."subjects" IS NOT NULL AND array_length(c."subjects", 1) > 0
ON CONFLICT ("tenantId", "code") DO NOTHING;
```

### Step 2.3: Add Foreign Key Columns (Nullable Initially)

```sql
-- Add subjectId foreign key to Booking (keep subjectName for now)
ALTER TABLE "Booking" ADD COLUMN "subjectIdRef" TEXT;

-- Add subjectId foreign key to TutoringSession
ALTER TABLE "TutoringSession" ADD COLUMN "subjectIdRef" TEXT;

-- Add subjectId foreign key to Content
ALTER TABLE "Content" ADD COLUMN "subjectIdRef" TEXT;
```

### Step 2.4: Backfill Foreign Keys

```sql
-- Update Booking with Subject references
UPDATE "Booking" b
SET "subjectIdRef" = s."id"
FROM "Subject" s
WHERE b."tenantId" = s."tenantId" 
  AND b."subjectId" = s."code";

-- Update TutoringSession
UPDATE "TutoringSession" ts
SET "subjectIdRef" = s."id"
FROM "Subject" s
WHERE ts."tenantId" = s."tenantId" 
  AND ts."subjectId" = s."code";

-- Verify backfill success rate
SELECT 
    'Booking' as table_name,
    COUNT(*) as total,
    COUNT("subjectIdRef") as migrated,
    ROUND(COUNT("subjectIdRef")::numeric / COUNT(*) * 100, 2) as percentage
FROM "Booking"
UNION ALL
SELECT 
    'TutoringSession',
    COUNT(*),
    COUNT("subjectIdRef"),
    ROUND(COUNT("subjectIdRef")::numeric / COUNT(*) * 100, 2)
FROM "TutoringSession";
```

### Step 2.5: Rename Columns and Add Constraints

```sql
-- Only proceed if backfill was successful (>95% migrated)

-- Rename old columns
ALTER TABLE "Booking" RENAME COLUMN "subjectId" TO "subjectCode_deprecated";
ALTER TABLE "Booking" RENAME COLUMN "subjectIdRef" TO "subjectId";

ALTER TABLE "TutoringSession" RENAME COLUMN "subjectId" TO "subjectCode_deprecated";
ALTER TABLE "TutoringSession" RENAME COLUMN "subjectIdRef" TO "subjectId";

-- Add foreign key constraints
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TutoringSession" ADD CONSTRAINT "TutoringSession_subjectId_fkey"
    FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add indexes
CREATE INDEX "Booking_subjectId_idx" ON "Booking"("subjectId");
CREATE INDEX "TutoringSession_subjectId_idx" ON "TutoringSession"("subjectId");
```

### Step 2.6: Create Address Table

```sql
-- Migration: add_address_table

CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "streetAddress" TEXT,
    "suburb" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Australia',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "type" TEXT NOT NULL DEFAULT 'primary',
    "label" TEXT,
    "homeschoolFamilyId" TEXT,
    "microSchoolId" TEXT,
    "homeschoolCoopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Address_homeschoolFamilyId_key" ON "Address"("homeschoolFamilyId");
CREATE UNIQUE INDEX "Address_microSchoolId_key" ON "Address"("microSchoolId");
CREATE UNIQUE INDEX "Address_homeschoolCoopId_key" ON "Address"("homeschoolCoopId");
CREATE INDEX "Address_tenantId_idx" ON "Address"("tenantId");
CREATE INDEX "Address_latitude_longitude_idx" ON "Address"("latitude", "longitude");
CREATE INDEX "Address_postcode_idx" ON "Address"("postcode");

-- Foreign keys
ALTER TABLE "Address" ADD CONSTRAINT "Address_homeschoolFamilyId_fkey"
    FOREIGN KEY ("homeschoolFamilyId") REFERENCES "HomeschoolFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Address" ADD CONSTRAINT "Address_microSchoolId_fkey"
    FOREIGN KEY ("microSchoolId") REFERENCES "MicroSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Address" ADD CONSTRAINT "Address_homeschoolCoopId_fkey"
    FOREIGN KEY ("homeschoolCoopId") REFERENCES "HomeschoolCoop"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Step 2.7: Migrate Location JSON to Address

```typescript
// packages/database/scripts/migrate-locations.ts
import { prisma } from '../src';

async function migrateLocations() {
  // Migrate HomeschoolFamily locations
  const families = await prisma.homeschoolFamily.findMany({
    where: { location: { not: null } },
  });

  for (const family of families) {
    const location = family.location as any;
    if (location) {
      await prisma.address.create({
        data: {
          tenantId: family.tenantId,
          homeschoolFamilyId: family.id,
          streetAddress: location.streetAddress || location.street,
          suburb: location.suburb,
          city: location.city,
          state: location.state,
          postcode: location.postcode || location.postalCode,
          country: location.country || 'Australia',
          latitude: location.lat || location.latitude,
          longitude: location.lng || location.longitude,
          type: 'primary',
        },
      });
    }
  }

  // Similar for MicroSchool and HomeschoolCoop...
  console.log(`Migrated ${families.length} family locations`);
}

migrateLocations();
```

---

## Phase 3: Soft Deletes

**Goal:** Add `deletedAt` columns to key entities for soft delete support.

**Risk Level:** 🟢 Low (additive only)

### Step 3.1: Add deletedAt Columns

```sql
-- Migration: add_soft_delete_columns

-- Add deletedAt to entities that need soft delete
ALTER TABLE "Tenant" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "TutorProfile" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Content" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "HomeschoolFamily" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "HomeschoolCoop" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "MicroSchool" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "ReliefTeacher" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Add indexes for soft delete queries
CREATE INDEX "Tenant_deletedAt_idx" ON "Tenant"("deletedAt");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");
CREATE INDEX "TutorProfile_deletedAt_idx" ON "TutorProfile"("deletedAt");
CREATE INDEX "Content_deletedAt_idx" ON "Content"("deletedAt");
CREATE INDEX "HomeschoolFamily_deletedAt_idx" ON "HomeschoolFamily"("deletedAt");
CREATE INDEX "HomeschoolCoop_deletedAt_idx" ON "HomeschoolCoop"("deletedAt");
CREATE INDEX "MicroSchool_deletedAt_idx" ON "MicroSchool"("deletedAt");
CREATE INDEX "ReliefTeacher_deletedAt_idx" ON "ReliefTeacher"("deletedAt");
```

### Step 3.2: Update Prisma Middleware for Soft Deletes

```typescript
// packages/database/src/middleware/soft-delete.ts
import { Prisma } from '@prisma/client';

const softDeleteModels = [
  'Tenant', 'User', 'TutorProfile', 'Content',
  'HomeschoolFamily', 'HomeschoolCoop', 'MicroSchool', 'ReliefTeacher'
];

export const softDeleteMiddleware: Prisma.Middleware = async (params, next) => {
  // Check if model supports soft delete
  if (!softDeleteModels.includes(params.model || '')) {
    return next(params);
  }

  // Convert delete to update
  if (params.action === 'delete') {
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }

  if (params.action === 'deleteMany') {
    params.action = 'updateMany';
    if (params.args.data) {
      params.args.data.deletedAt = new Date();
    } else {
      params.args.data = { deletedAt: new Date() };
    }
  }

  // Filter out soft-deleted records on reads
  if (params.action === 'findUnique' || params.action === 'findFirst') {
    params.action = 'findFirst';
    params.args.where = {
      ...params.args.where,
      deletedAt: null,
    };
  }

  if (params.action === 'findMany') {
    if (!params.args) params.args = {};
    if (!params.args.where) params.args.where = {};
    if (params.args.where.deletedAt === undefined) {
      params.args.where.deletedAt = null;
    }
  }

  return next(params);
};

// Usage in prisma client
// prisma.$use(softDeleteMiddleware);
```

---

## Phase 4: Extracted Models

**Goal:** Extract high-churn JSON fields into proper relational models.

**Risk Level:** 🔴 High (requires application code changes)

### Step 4.1: Create TutorAvailabilitySlot Table

```sql
-- Migration: extract_tutor_availability

CREATE TABLE "TutorAvailabilitySlot" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorAvailabilitySlot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TutorAvailabilitySlot_profileId_idx" ON "TutorAvailabilitySlot"("profileId");
CREATE INDEX "TutorAvailabilitySlot_profileId_dayOfWeek_idx" ON "TutorAvailabilitySlot"("profileId", "dayOfWeek");

ALTER TABLE "TutorAvailabilitySlot" ADD CONSTRAINT "TutorAvailabilitySlot_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Step 4.2: Migrate Availability Data

```typescript
// packages/database/scripts/migrate-availability.ts
import { prisma } from '../src';

interface AvailabilitySlot {
  day: number | string;
  dayOfWeek?: number;
  start: string;
  startTime?: string;
  end: string;
  endTime?: string;
  recurring?: boolean;
}

async function migrateAvailability() {
  const profiles = await prisma.tutorProfile.findMany({
    where: {
      availability: { not: Prisma.DbNull },
    },
  });

  let migrated = 0;
  let failed = 0;

  for (const profile of profiles) {
    try {
      const availability = profile.availability as any;
      
      // Handle different JSON structures
      let slots: AvailabilitySlot[] = [];
      
      if (Array.isArray(availability)) {
        slots = availability;
      } else if (availability.slots) {
        slots = availability.slots;
      } else if (availability.weekly) {
        slots = availability.weekly;
      }

      for (const slot of slots) {
        await prisma.tutorAvailabilitySlot.create({
          data: {
            profileId: profile.id,
            dayOfWeek: typeof slot.day === 'string' 
              ? ['sun','mon','tue','wed','thu','fri','sat'].indexOf(slot.day.toLowerCase())
              : (slot.dayOfWeek ?? slot.day),
            startTime: slot.startTime || slot.start,
            endTime: slot.endTime || slot.end,
            isRecurring: slot.recurring ?? true,
          },
        });
      }
      
      migrated++;
    } catch (error) {
      console.error(`Failed to migrate profile ${profile.id}:`, error);
      failed++;
    }
  }

  console.log(`Migrated: ${migrated}, Failed: ${failed}`);
}

migrateAvailability();
```

### Step 4.3: Create TutorPricingTier Table

```sql
-- Migration: extract_tutor_pricing

CREATE TABLE "TutorPricingTier" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "groupDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxGroupSize" INTEGER NOT NULL DEFAULT 1,
    "introRate" DOUBLE PRECISION,
    "packageRate" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorPricingTier_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TutorPricingTier_profileId_sessionType_duration_key" 
    ON "TutorPricingTier"("profileId", "sessionType", "duration");
CREATE INDEX "TutorPricingTier_profileId_isActive_idx" ON "TutorPricingTier"("profileId", "isActive");

ALTER TABLE "TutorPricingTier" ADD CONSTRAINT "TutorPricingTier_profileId_fkey"
    FOREIGN KEY ("profileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Step 4.4: Create LearningAssetVote Table

```sql
-- Migration: extract_learning_asset_votes

CREATE TABLE "LearningAssetVote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningAssetVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearningAssetVote_requestId_userId_key" ON "LearningAssetVote"("requestId", "userId");
CREATE INDEX "LearningAssetVote_requestId_idx" ON "LearningAssetVote"("requestId");
CREATE INDEX "LearningAssetVote_userId_idx" ON "LearningAssetVote"("userId");

ALTER TABLE "LearningAssetVote" ADD CONSTRAINT "LearningAssetVote_requestId_fkey"
    FOREIGN KEY ("requestId") REFERENCES "LearningAssetRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LearningAssetVote" ADD CONSTRAINT "LearningAssetVote_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Step 4.5: Migrate Vote Data

```typescript
// packages/database/scripts/migrate-votes.ts
import { prisma } from '../src';

async function migrateVotes() {
  const requests = await prisma.learningAssetRequest.findMany({
    where: {
      votes: { not: Prisma.DbNull },
    },
  });

  for (const request of requests) {
    const votes = request.votes as any[];
    
    if (Array.isArray(votes)) {
      for (const vote of votes) {
        const userId = vote.userId || vote.user_id || vote.id;
        if (userId) {
          await prisma.learningAssetVote.upsert({
            where: {
              requestId_userId: {
                requestId: request.id,
                userId: userId,
              },
            },
            create: {
              requestId: request.id,
              userId: userId,
            },
            update: {},
          });
        }
      }
    }
  }
}

migrateVotes();
```

### Step 4.6: Update Application Code

```typescript
// Before (using JSON)
const availability = tutorProfile.availability as AvailabilitySlot[];
const isAvailable = availability.some(slot => 
  slot.dayOfWeek === requestedDay && 
  slot.startTime <= requestedTime
);

// After (using relation)
const slots = await prisma.tutorAvailabilitySlot.findMany({
  where: {
    profileId: tutorProfile.id,
    dayOfWeek: requestedDay,
    startTime: { lte: requestedTime },
    endTime: { gte: requestedTime },
    isRecurring: true,
  },
});
const isAvailable = slots.length > 0;
```

---

## Phase 5: Unique Constraints

**Goal:** Add unique constraints after deduplicating existing data.

**Risk Level:** 🟡 Medium (may require data cleanup)

### Step 5.1: Identify Duplicates

```sql
-- Find duplicate content reviews
SELECT "contentId", "reviewerId", COUNT(*) as count
FROM "ContentReview"
GROUP BY "contentId", "reviewerId"
HAVING COUNT(*) > 1;

-- Find duplicate content purchases
SELECT "contentId", "buyerId", COUNT(*) as count
FROM "ContentPurchase"
GROUP BY "contentId", "buyerId"
HAVING COUNT(*) > 1;

-- Find duplicate learning asset requests
SELECT "tenantId", "requesterId", "title", COUNT(*) as count
FROM "LearningAssetRequest"
GROUP BY "tenantId", "requesterId", "title"
HAVING COUNT(*) > 1;
```

### Step 5.2: Deduplicate Data

```sql
-- Keep the most recent review, delete older duplicates
DELETE FROM "ContentReview" cr1
USING "ContentReview" cr2
WHERE cr1."contentId" = cr2."contentId"
  AND cr1."reviewerId" = cr2."reviewerId"
  AND cr1."createdAt" < cr2."createdAt";

-- Keep the first purchase (most important for records)
DELETE FROM "ContentPurchase" cp1
USING "ContentPurchase" cp2
WHERE cp1."contentId" = cp2."contentId"
  AND cp1."buyerId" = cp2."buyerId"
  AND cp1."purchasedAt" > cp2."purchasedAt";

-- For learning asset requests, merge duplicates
-- (Manual review may be needed)
```

### Step 5.3: Add Unique Constraints

```sql
-- Migration: add_unique_constraints

-- ContentReview: one review per user per content
CREATE UNIQUE INDEX "ContentReview_contentId_reviewerId_key" 
    ON "ContentReview"("contentId", "reviewerId");

-- ContentPurchase: one purchase per user per content
CREATE UNIQUE INDEX "ContentPurchase_contentId_buyerId_key" 
    ON "ContentPurchase"("contentId", "buyerId");

-- LearningAssetRequest: prevent duplicate requests
CREATE UNIQUE INDEX "LearningAssetRequest_tenantId_requesterId_title_key" 
    ON "LearningAssetRequest"("tenantId", "requesterId", "title");

-- DesignPeerReview: one review per reviewer per journey
CREATE UNIQUE INDEX "DesignPeerReview_journeyId_reviewerId_key" 
    ON "DesignPeerReview"("journeyId", "reviewerId");
```

---

## Phase 6: Composite Indexes

**Goal:** Add performance-optimizing composite indexes.

**Risk Level:** 🟢 Low (no data changes)

### Step 6.1: Add Composite Indexes

```sql
-- Migration: add_composite_indexes

-- Booking: tutor schedule queries
CREATE INDEX CONCURRENTLY "Booking_tutorId_scheduledStart_idx" 
    ON "Booking"("tutorId", "scheduledStart");

-- Booking: pending bookings by tenant
CREATE INDEX CONCURRENTLY "Booking_tenantId_status_scheduledStart_idx" 
    ON "Booking"("tenantId", "status", "scheduledStart");

-- TutoringSession: tutor session queries
CREATE INDEX CONCURRENTLY "TutoringSession_tutorProfileId_scheduledStart_status_idx" 
    ON "TutoringSession"("tutorProfileId", "scheduledStart", "status");

-- Content: marketplace browsing
CREATE INDEX CONCURRENTLY "Content_tenantId_status_subjects_idx" 
    ON "Content"("tenantId", "status") WHERE "subjects" IS NOT NULL;

-- TeacherAbsence: daily coverage dashboard
CREATE INDEX CONCURRENTLY "TeacherAbsence_tenantId_date_status_idx" 
    ON "TeacherAbsence"("tenantId", "date", "status");

-- TokenTransaction: transaction reports
CREATE INDEX CONCURRENTLY "TokenTransaction_tenantId_type_createdAt_idx" 
    ON "TokenTransaction"("tenantId", "type", "createdAt");

-- ReliefBooking: date-based queries
CREATE INDEX CONCURRENTLY "ReliefBooking_tenantId_date_idx" 
    ON "ReliefBooking"("tenantId", "date");
```

**Note:** Using `CONCURRENTLY` to avoid locking tables during index creation.

---

## Phase 7: New Feature Models

**Goal:** Add models for new features (EduScrum, Notifications, Analytics, etc.)

**Risk Level:** 🟢 Low (additive only)

### Step 7.1: EduScrum Models

```sql
-- Migration: add_eduscrum_models

CREATE TABLE "EduScrumTeam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scrumMasterId" TEXT NOT NULL,
    "productOwnerId" TEXT,
    "memberIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "velocity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maturityLevel" TEXT NOT NULL DEFAULT 'forming',
    "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sprintDuration" INTEGER NOT NULL DEFAULT 14,
    "standupSchedule" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EduScrumTeam_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EduScrumSprint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "sprintNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "backlogItems" JSONB NOT NULL DEFAULT '[]',
    "totalStoryPoints" INTEGER NOT NULL DEFAULT 0,
    "completedPoints" INTEGER NOT NULL DEFAULT 0,
    "standups" JSONB NOT NULL DEFAULT '[]',
    "burndownData" JSONB NOT NULL DEFAULT '[]',
    "aiInsights" JSONB,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EduScrumSprint_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EduScrumRetrospective" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sprintId" TEXT,
    "wentWell" JSONB NOT NULL DEFAULT '[]',
    "toImprove" JSONB NOT NULL DEFAULT '[]',
    "actionItems" JSONB NOT NULL DEFAULT '[]',
    "participantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "facilitatorId" TEXT NOT NULL,
    "aiSummary" TEXT,
    "aiRecommendations" JSONB NOT NULL DEFAULT '[]',
    "teamDynamicsScore" DOUBLE PRECISION,
    "conductedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduScrumRetrospective_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "EduScrumTeam_tenantId_idx" ON "EduScrumTeam"("tenantId");
CREATE INDEX "EduScrumTeam_tenantId_status_idx" ON "EduScrumTeam"("tenantId", "status");
CREATE UNIQUE INDEX "EduScrumSprint_teamId_sprintNumber_key" ON "EduScrumSprint"("teamId", "sprintNumber");
CREATE INDEX "EduScrumSprint_tenantId_idx" ON "EduScrumSprint"("tenantId");
CREATE INDEX "EduScrumSprint_teamId_idx" ON "EduScrumSprint"("teamId");
CREATE INDEX "EduScrumRetrospective_tenantId_idx" ON "EduScrumRetrospective"("tenantId");
CREATE INDEX "EduScrumRetrospective_teamId_idx" ON "EduScrumRetrospective"("teamId");

-- Foreign keys
ALTER TABLE "EduScrumSprint" ADD CONSTRAINT "EduScrumSprint_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "EduScrumTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EduScrumRetrospective" ADD CONSTRAINT "EduScrumRetrospective_teamId_fkey"
    FOREIGN KEY ("teamId") REFERENCES "EduScrumTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

### Step 7.2: Notification Models

```sql
-- Migration: add_notification_models

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "channels" TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "inAppStatus" TEXT NOT NULL DEFAULT 'unread',
    "emailStatus" TEXT,
    "smsStatus" TEXT,
    "pushStatus" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "groupKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "categoryPreferences" JSONB NOT NULL DEFAULT '{}',
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestFrequency" TEXT,
    "digestTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Notification_tenantId_userId_idx" ON "Notification"("tenantId", "userId");
CREATE INDEX "Notification_userId_inAppStatus_idx" ON "Notification"("userId", "inAppStatus");
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX "Notification_type_idx" ON "Notification"("type");
CREATE INDEX "Notification_scheduledFor_idx" ON "Notification"("scheduledFor");
CREATE UNIQUE INDEX "NotificationPreference_tenantId_userId_key" ON "NotificationPreference"("tenantId", "userId");
```

### Step 7.3: Analytics Models

```sql
-- Migration: add_analytics_models

CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "region" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- Indexes (partitioning recommended for high volume)
CREATE INDEX "AnalyticsEvent_tenantId_timestamp_idx" ON "AnalyticsEvent"("tenantId", "timestamp");
CREATE INDEX "AnalyticsEvent_tenantId_eventType_timestamp_idx" ON "AnalyticsEvent"("tenantId", "eventType", "timestamp");
CREATE INDEX "AnalyticsEvent_tenantId_userId_timestamp_idx" ON "AnalyticsEvent"("tenantId", "userId", "timestamp");
CREATE INDEX "AnalyticsEvent_entityType_entityId_idx" ON "AnalyticsEvent"("entityType", "entityId");
```

### Step 7.4: Feature Flags and Configuration

```sql
-- Migration: add_feature_flags

CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "owner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TenantConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branding" JSONB NOT NULL DEFAULT '{}',
    "enabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "limits" JSONB NOT NULL DEFAULT '{}',
    "integrations" JSONB NOT NULL DEFAULT '{}',
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 2555,
    "gdprEnabled" BOOLEAN NOT NULL DEFAULT true,
    "billingPlan" TEXT NOT NULL DEFAULT 'free',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantConfiguration_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");
CREATE INDEX "FeatureFlag_isEnabled_idx" ON "FeatureFlag"("isEnabled");
CREATE INDEX "FeatureFlag_category_idx" ON "FeatureFlag"("category");
CREATE UNIQUE INDEX "TenantConfiguration_tenantId_key" ON "TenantConfiguration"("tenantId");
CREATE INDEX "TenantConfiguration_billingPlan_idx" ON "TenantConfiguration"("billingPlan");
```

---

## Post-Migration Validation

### Validation Checklist

```bash
#!/bin/bash
# post_migration_validation.sh

echo "=== Schema Validation ==="
npx prisma validate

echo "=== Record Counts ==="
npx prisma db execute --stdin <<< "
SELECT 'AuditLog' as table_name, COUNT(*) as count FROM \"AuditLog\"
UNION ALL SELECT 'Subject', COUNT(*) FROM \"Subject\"
UNION ALL SELECT 'Address', COUNT(*) FROM \"Address\"
UNION ALL SELECT 'TutorAvailabilitySlot', COUNT(*) FROM \"TutorAvailabilitySlot\"
UNION ALL SELECT 'TutorPricingTier', COUNT(*) FROM \"TutorPricingTier\"
UNION ALL SELECT 'LearningAssetVote', COUNT(*) FROM \"LearningAssetVote\"
ORDER BY table_name;
"

echo "=== Foreign Key Integrity ==="
npx prisma db execute --stdin <<< "
-- Check for orphaned records
SELECT 'Booking->Subject orphans' as check_name, COUNT(*) as count
FROM \"Booking\" b
LEFT JOIN \"Subject\" s ON b.\"subjectId\" = s.id
WHERE b.\"subjectId\" IS NOT NULL AND s.id IS NULL;
"

echo "=== Index Verification ==="
npx prisma db execute --stdin <<< "
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE '%composite%' OR indexname LIKE '%tenantId%'
ORDER BY tablename, indexname;
"

echo "=== Unique Constraint Verification ==="
npx prisma db execute --stdin <<< "
SELECT conname, conrelid::regclass
FROM pg_constraint
WHERE contype = 'u'
ORDER BY conrelid::regclass::text;
"
```

### Integration Test Suite

```typescript
// packages/database/tests/migration-validation.test.ts
import { prisma } from '../src';

describe('Migration Validation', () => {
  describe('Phase 2: Subject References', () => {
    it('all bookings have valid subject references', async () => {
      const orphanedBookings = await prisma.booking.findMany({
        where: {
          subjectId: { not: null },
          subject: null,
        },
      });
      expect(orphanedBookings).toHaveLength(0);
    });
  });

  describe('Phase 4: Extracted Models', () => {
    it('tutor availability slots match original JSON count', async () => {
      const profiles = await prisma.tutorProfile.findMany({
        include: { availabilitySlots: true },
      });
      
      for (const profile of profiles) {
        const originalSlots = (profile.availability as any)?.slots || [];
        expect(profile.availabilitySlots.length).toBeGreaterThanOrEqual(
          Array.isArray(originalSlots) ? originalSlots.length : 0
        );
      }
    });
  });

  describe('Phase 5: Unique Constraints', () => {
    it('prevents duplicate content reviews', async () => {
      const review = await prisma.contentReview.findFirst();
      if (review) {
        await expect(
          prisma.contentReview.create({
            data: {
              contentId: review.contentId,
              reviewerId: review.reviewerId,
              rating: 5,
            },
          })
        ).rejects.toThrow();
      }
    });
  });
});
```

---

## Rollback Procedures

### Phase-Specific Rollbacks

Each phase can be rolled back independently. Store rollback scripts alongside migrations.

#### Rollback Phase 1 (Audit Infrastructure)

```sql
-- rollback_phase1.sql
DROP TABLE IF EXISTS "AuditLog";
DROP TABLE IF EXISTS "DataMigration";
```

#### Rollback Phase 2 (Subject References)

```sql
-- rollback_phase2.sql
-- Restore original columns
ALTER TABLE "Booking" RENAME COLUMN "subjectId" TO "subjectIdRef_temp";
ALTER TABLE "Booking" RENAME COLUMN "subjectCode_deprecated" TO "subjectId";
ALTER TABLE "Booking" DROP COLUMN "subjectIdRef_temp";

-- Drop Subject table
DROP TABLE IF EXISTS "Subject" CASCADE;
DROP TABLE IF EXISTS "Address" CASCADE;
```

#### Rollback Phase 4 (Extracted Models)

```sql
-- rollback_phase4.sql
-- Note: Data should be preserved in original JSON fields
DROP TABLE IF EXISTS "TutorAvailabilitySlot";
DROP TABLE IF EXISTS "TutorPricingTier";
DROP TABLE IF EXISTS "LearningAssetVote";
```

### Emergency Full Rollback

```bash
#!/bin/bash
# emergency_rollback.sh

# Stop all services
kubectl scale deployment scholarly-api --replicas=0

# Restore from backup
pg_restore -d scholarly_production -c backup_YYYYMMDD_HHMMSS.sql

# Revert schema
git checkout main -- packages/database/prisma/schema.prisma

# Regenerate client
cd packages/database && npx prisma generate

# Restart services
kubectl scale deployment scholarly-api --replicas=3
```

---

## Migration Tracking Dashboard

After completing all migrations, your `DataMigration` table should look like:

| name | status | processedRecords | completedAt |
|------|--------|------------------|-------------|
| phase1_audit_infrastructure | completed | 0 | 2026-01-25 |
| phase2_subject_table | completed | 1,234 | 2026-01-25 |
| phase2_address_table | completed | 456 | 2026-01-25 |
| phase3_soft_deletes | completed | 0 | 2026-01-26 |
| phase4_availability_extraction | completed | 2,345 | 2026-01-26 |
| phase4_pricing_extraction | completed | 1,890 | 2026-01-26 |
| phase4_vote_extraction | completed | 567 | 2026-01-26 |
| phase5_unique_constraints | completed | 23 (deduped) | 2026-01-27 |
| phase6_composite_indexes | completed | 0 | 2026-01-27 |
| phase7_eduscrum_models | completed | 0 | 2026-01-28 |
| phase7_notification_models | completed | 0 | 2026-01-28 |
| phase7_analytics_models | completed | 0 | 2026-01-28 |
| phase7_feature_flags | completed | 0 | 2026-01-28 |

---

## Summary

This migration guide provides a safe, incremental path from your original schema to the enhanced version. Key principles:

1. **Additive first** – New tables and columns before modifications
2. **Data preservation** – Always backfill before dropping columns
3. **Reversibility** – Each phase has a rollback procedure
4. **Validation** – Test at each phase before proceeding
5. **Documentation** – Track progress in the DataMigration table

Total estimated time: **6-10 hours** spread across multiple deployment windows.

Questions or issues? The AuditLog will help you trace any problems back to their source.
