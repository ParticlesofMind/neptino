-- ================================================================
-- FIX STORAGE BUCKET RLS POLICIES FOR COURSE IMAGES
-- ================================================================

-- Drop existing policies on storage.objects if any
DROP POLICY IF EXISTS "Enable read access to all" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for users based on uid" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for users based on uid" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete course images" ON storage.objects;

-- Disable RLS on storage.objects for development (full permissive access)
ALTER TABLE IF EXISTS storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS storage.buckets DISABLE ROW LEVEL SECURITY;

-- Ensure storage tables are accessible
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.buckets TO anon;

-- Ensure the courses bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('courses', 'courses', true)
ON CONFLICT (id) DO UPDATE SET public = true;
