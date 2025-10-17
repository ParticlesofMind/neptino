-- ================================================================
-- FIX STORAGE BUCKET RLS POLICIES FOR COURSE IMAGES
-- ================================================================

-- Ensure the courses bucket exists and is marked public so signed URLs resolve
INSERT INTO storage.buckets (id, name, public)
VALUES ('courses', 'courses', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Make sure row level security stays enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Reset policies so the file can be rerun safely
DROP POLICY IF EXISTS "Authenticated users manage course images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users read course images" ON storage.objects;
DROP POLICY IF EXISTS "Anonymous users read course images" ON storage.objects;

-- Allow signed-in users to upload, overwrite, and delete objects inside the courses bucket
CREATE POLICY "Authenticated users manage course images" ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'courses')
WITH CHECK (bucket_id = 'courses');

-- Permit authenticated users to fetch files directly (needed for previews in the builder)
CREATE POLICY "Authenticated users read course images" ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'courses');

-- Keep the bucket public for shared preview links
CREATE POLICY "Anonymous users read course images" ON storage.objects
FOR SELECT
TO anon
USING (bucket_id = 'courses');
