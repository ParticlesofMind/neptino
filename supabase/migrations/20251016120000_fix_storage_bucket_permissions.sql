-- ================================================================
-- FIX STORAGE BUCKET RLS POLICIES FOR COURSE IMAGES
-- ================================================================

-- Note: In local Supabase development, storage permissions are handled by the system
-- This file is kept for reference but core storage setup is handled by Supabase

-- Ensure the courses bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('courses', 'courses', true)
ON CONFLICT (id) DO UPDATE SET public = true;
