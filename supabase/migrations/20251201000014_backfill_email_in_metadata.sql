-- ================================================================
-- BACKFILL EMAIL IN ENROLLMENTS.METADATA
-- This migration adds email to metadata for enrollments that don't have it
-- ================================================================

-- Update enrollments to include email in metadata if missing
-- Use email from users table if available
UPDATE public.enrollments e
SET metadata = e.metadata || jsonb_build_object('email', u.email)
FROM public.users u
WHERE e.student_id = u.id
  AND (e.metadata->>'email' IS NULL OR e.metadata->>'email' = '')
  AND u.email IS NOT NULL;

-- For enrollments without matching users, try to preserve any email info
-- This handles edge cases where student_id might be null or user doesn't exist
-- Note: This is a best-effort recovery

