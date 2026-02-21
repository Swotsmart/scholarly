-- CreateTable
CREATE TABLE "TenantIntegrationConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "emailProvider" TEXT,
    "emailCredentials" JSONB,
    "emailConfigured" BOOLEAN NOT NULL DEFAULT false,
    "smsProvider" TEXT,
    "smsCredentials" JSONB,
    "smsConfigured" BOOLEAN NOT NULL DEFAULT false,
    "whatsappProvider" TEXT,
    "whatsappCredentials" JSONB,
    "whatsappConfigured" BOOLEAN NOT NULL DEFAULT false,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantIntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TenantIntegrationConfig_tenantId_key" ON "TenantIntegrationConfig"("tenantId");

-- CreateIndex
CREATE INDEX "TenantIntegrationConfig_tenantId_idx" ON "TenantIntegrationConfig"("tenantId");
