-- ================================================================
-- INITIALIZE DATABASE EXTENSIONS
-- This migration enables all required PostgreSQL extensions
-- ================================================================

-- Enable UUID generation extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for additional cryptographic functions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Comment for documentation
COMMENT ON EXTENSION "uuid-ossp" IS 'UUID generation functions (uuid_generate_v4, etc.)';
COMMENT ON EXTENSION "pgcrypto" IS 'Cryptographic functions (gen_random_uuid, etc.)';
COMMENT ON EXTENSION "pg_stat_statements" IS 'Query performance statistics';
