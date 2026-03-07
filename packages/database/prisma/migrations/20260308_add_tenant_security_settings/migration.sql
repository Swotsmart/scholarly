-- Add security settings column to Tenant table
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "securitySettings" JSONB NOT NULL DEFAULT '{}';
