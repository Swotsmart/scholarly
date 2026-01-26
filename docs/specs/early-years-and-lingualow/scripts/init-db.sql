-- =============================================================================
-- SCHOLARLY PLATFORM - DATABASE INITIALIZATION
-- =============================================================================
-- This script runs automatically when the PostgreSQL container starts for the
-- first time. It sets up extensions and initial configuration.
-- =============================================================================

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For fuzzy text search

-- Create application user with limited privileges (optional - for production)
-- In development, we use the default 'scholarly' user with full privileges

-- Log successful initialization
DO $$
BEGIN
  RAISE NOTICE 'Scholarly database initialized successfully';
END $$;
