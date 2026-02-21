-- CreateTable
CREATE TABLE "SitePasswordProtection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "scope" TEXT NOT NULL DEFAULT 'site',
    "routePattern" TEXT,
    "passwordHash" TEXT NOT NULL,
    "hint" TEXT,
    "bypassRoles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SitePasswordProtection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SitePasswordProtection_tenantId_isActive_idx" ON "SitePasswordProtection"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "SitePasswordProtection_scope_idx" ON "SitePasswordProtection"("scope");
