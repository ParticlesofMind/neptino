-- Create the 'courses' storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'courses',
  'courses',
  true,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the courses bucket
CREATE POLICY "Authenticated users can upload course images" ON storage.objects
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'courses');

CREATE POLICY "Anyone can view course images" ON storage.objects
FOR SELECT USING (bucket_id = 'courses');

CREATE POLICY "Authenticated users can update course images" ON storage.objects
FOR UPDATE TO authenticated USING (bucket_id = 'courses');

CREATE POLICY "Authenticated users can delete course images" ON storage.objects
FOR DELETE TO authenticated USING (bucket_id = 'courses');
