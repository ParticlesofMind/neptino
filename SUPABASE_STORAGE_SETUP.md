# Supabase Storage Setup Instructions for LLMs

## Critical Constraints
- **NEVER restart Supabase** when applying fixes unless explicitly authorized
- **NO contradictions** between migrations and code
- **NO mismatched configurations** between storage settings and upload expectations
- Migrations are the source of truth for schema state

---

## System Architecture

### Storage Configuration
- **File Size Limit**: 50MiB (defined in `supabase/config.toml`)
- **Storage Engine**: Local S3-compatible storage for development
- **Bucket Name**: `courses` (must exist and be public)
- **Upload Path Format**: `course-images/{sanitizedCourseId}/cover.{extension}`
- **Public Access**: Required for clients to retrieve course cover images

### RLS Policy State
- **Current State**: RLS disabled on `storage.objects` and `storage.buckets` tables
- **Reasoning**: Development environment requires permissive access without session-based constraints
- **Migration**: Applied via `supabase/migrations/20251016120000_fix_storage_bucket_permissions.sql`

### Upload Client Code Location
- **File**: `src/scripts/backend/courses/shared/uploadCourseImage.ts`
- **Key Function**: `uploadCourseImage({ file, courseId })`
- **Behavior**: 
  - Accepts `File` object and `courseId`
  - Sanitizes course ID (removes special chars, keeps alphanumerics, underscores, hyphens)
  - Derives file extension from filename or MIME type
  - Uploads to `storage.from('courses').upload(filePath, arrayBuffer, ...)`
  - Returns public URL via `getPublicUrl()`

---

## Verification Checklist

### Before Making Changes
1. **Confirm migration applied**:
   ```bash
   supabase migration list
   ```
   Should show: `20251016120000_fix_storage_bucket_permissions` with status ✓

2. **Verify local database state**:
   - Open Supabase Studio at `http://127.0.0.1:54323`
   - Navigate to SQL Editor
   - Run: `SELECT rls_enabled FROM pg_tables WHERE tablename IN ('objects', 'buckets');`
   - Expected result: Both `rls_enabled` should be `false`

3. **Check bucket existence**:
   - In Studio, go to Storage > Buckets
   - Verify `courses` bucket exists and is marked as public
   - If missing, run in SQL Editor:
     ```sql
     INSERT INTO storage.buckets (id, name, public)
     VALUES ('courses', 'courses', true)
     ON CONFLICT (id) DO UPDATE SET public = true;
     ```

### After Any Code Changes
1. **Clear browser cache** (Cmd+Shift+R on Mac, Ctrl+Shift+R on Linux/Windows)
2. **Check console for errors**: Open DevTools → Console tab
3. **Verify upload works**: Attempt to create/save a course with an image
4. **Monitor Supabase logs**: Run `supabase logs` to see upload activity

---

## Configuration Consistency Rules

### Storage Table Access
✓ **REQUIRED**: `storage.objects` and `storage.buckets` RLS disabled in development  
✓ **REQUIRED**: `GRANT ALL` permissions to both `authenticated` and `anon` roles  
✓ **REQUIRED**: `courses` bucket must be publicly accessible

### Upload Code Expectations
✓ Uses Supabase client from `src/scripts/backend/supabase.ts`  
✓ Expects bucket: `courses`  
✓ Expects folder structure: `course-images/{courseId}/cover.{ext}`  
✓ Uses `getPublicUrl()` to generate shareable URLs  
✓ Handles errors gracefully, returns `null` on failure  

### No Contradictions
❌ **FORBIDDEN**: RLS enabled on storage tables while code expects permissive access  
❌ **FORBIDDEN**: Bucket `courses` marked as private while code fetches public URLs  
❌ **FORBIDDEN**: File size limit < 50MiB while uploads attempt larger files  
❌ **FORBIDDEN**: Mismatch between code path `course-images/{id}/cover.ext` and actual bucket structure  

---

## Step-by-Step Setup (From Scratch)

### 1. Ensure Migration Exists
File: `supabase/migrations/20251016120000_fix_storage_bucket_permissions.sql`

Contains:
```sql
-- Drop any conflicting policies
DROP POLICY IF EXISTS "Enable read access to all" ON storage.objects;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read access to course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update course images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete course images" ON storage.objects;

-- Disable RLS for development
ALTER TABLE IF EXISTS storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS storage.buckets DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.objects TO anon;
GRANT ALL ON storage.buckets TO authenticated;
GRANT ALL ON storage.buckets TO anon;

-- Ensure courses bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('courses', 'courses', true)
ON CONFLICT (id) DO UPDATE SET public = true;
```

### 2. Apply Migration (Non-Destructive)
```bash
# Push migrations to Supabase (does NOT restart)
cd /Users/benjaminjacklaubacher/Neptino
supabase db push
```

### 3. Verify via Supabase Studio
1. Navigate to `http://127.0.0.1:54323`
2. Go to SQL Editor tab
3. Run verification queries:
   ```sql
   -- Check RLS status
   SELECT tablename, rls_enabled FROM pg_tables 
   WHERE tablename IN ('objects', 'buckets') AND schemaname = 'storage';
   
   -- Check bucket
   SELECT id, name, public FROM storage.buckets WHERE id = 'courses';
   
   -- Check grants
   SELECT grantee, privilege_type FROM table_privileges 
   WHERE table_name IN ('objects', 'buckets');
   ```

### 4. Verify Upload Code
- Location: `src/scripts/backend/courses/shared/uploadCourseImage.ts`
- Uses: `supabase.storage.from('courses').upload(...)`
- Returns: Public URL via `getPublicUrl()`

### 5. Test Upload (Manual)
1. Start dev server: `npm run dev`
2. Navigate to course creation page
3. Upload a test image
4. Check browser console for errors
5. Verify image appears in course preview

---

## Troubleshooting

### Error: "new row violates row-level security policy"
**Cause**: RLS is enabled on storage tables  
**Fix**: Run migration again, verify RLS status with:
```sql
SELECT tablename, rls_enabled FROM pg_tables 
WHERE tablename IN ('objects', 'buckets');
```

### Error: "Bucket 'courses' not found"
**Cause**: Bucket doesn't exist or name mismatch  
**Fix**: Create via SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('courses', 'courses', true);
```

### Upload returns `null`, console shows no error
**Cause**: Invalid file, missing courseId, or network issue  
**Fix**: 
1. Check file size < 50MiB
2. Verify courseId is not empty
3. Check Supabase status: `supabase status`

### Images upload but can't be retrieved
**Cause**: Bucket is private or path mismatch  
**Fix**: Verify bucket is public:
```sql
UPDATE storage.buckets SET public = true WHERE id = 'courses';
```

### "getPublicUrl() returns wrong URL"
**Cause**: Typically URL format issue, not a configuration problem  
**Fix**: Check that bucket is public (above), then clear cache and retry

---

## Environment Variables

Required in `.env` or `supabase/config.toml`:
```
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_ANON_KEY=<from supabase status output>
```

Verify with:
```bash
supabase status
```

Output should show:
```
API URL: http://127.0.0.1:54321
Publishable key: sb_publishable_...
```

---

## Migration Safety

### Before Running Any Migration
1. Check current applied migrations: `supabase migration list`
2. Review migration SQL for contradictions with existing code
3. Verify target state matches code expectations

### Safe Migration Steps (Without Reset)
1. Create new migration file with timestamp: `20251016120000_migration_name.sql`
2. Write idempotent SQL (use `IF NOT EXISTS`, `IF EXISTS`, `ON CONFLICT`)
3. Push without reset: `supabase db push`
4. Verify in Supabase Studio via SQL queries
5. Test upload functionality in browser

### Never Required to Reset
- RLS policy changes: Drop old policies, then create new ones
- Bucket configuration: Use `ON CONFLICT DO UPDATE`
- Permissions: GRANT/REVOKE are idempotent
- Table schema: Use `ALTER TABLE IF EXISTS`

---

## Storage Upload Flow Diagram

```
uploadCourseImage(file, courseId)
    ↓
Sanitize courseId → "my-course-123"
Derive extension → "png"
Build path → "course-images/my-course-123/cover.png"
    ↓
supabase.storage.from('courses').upload(path, arrayBuffer)
    ↓
Check RLS on storage.objects → Must be DISABLED
Check GRANT permissions → Must include anon role
    ↓
Upload succeeds → getPublicUrl(path)
    ↓
Return public URL to client
```

---

## Code-to-Config Mapping

| Code Requirement | Config Location | Current Value | Status |
|---|---|---|---|
| Bucket name | `uploadCourseImage.ts` | `courses` | ✓ |
| Upload folder | `uploadCourseImage.ts` | `course-images` | ✓ |
| File size limit | `supabase/config.toml` | 50MiB | ✓ |
| RLS on storage.objects | Migration | DISABLED | ✓ |
| RLS on storage.buckets | Migration | DISABLED | ✓ |
| Bucket public access | Migration | TRUE | ✓ |
| anon role permission | Migration | GRANT ALL | ✓ |
| authenticated role permission | Migration | GRANT ALL | ✓ |

---

## Documentation Updates Required When Changing

If modifying storage setup, update these files:
1. **Migration file**: `supabase/migrations/20251016120000_*.sql`
2. **Upload code**: `src/scripts/backend/courses/shared/uploadCourseImage.ts`
3. **This document**: `SUPABASE_STORAGE_SETUP.md`
4. **Config**: `supabase/config.toml` (if limits change)

Always ensure these three stay in sync - migration, code, and this document.

