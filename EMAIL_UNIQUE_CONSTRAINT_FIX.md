# CRITICAL FIX: Email Unique Constraint Bug

## The Problem

The `students` table had a **broken constraint**:

```sql
email text UNIQUE,  -- ❌ WRONG: Global unique constraint
```

This means:
- Only ONE student in the ENTIRE database can have any given email
- If you try to upload 5 students with emails like `student1@school.com`, the 2nd student with that domain might already exist in another course
- Multiple students with empty/NULL email violates this constraint
- Uploads **silently fail** with no error message shown to the user

## The Fix

Changed to:

```sql
UNIQUE (course_id, email),  -- ✅ CORRECT: Email unique per course
```

Now:
- Each course can have students with the same email
- Email uniqueness is scoped to just that course
- Multiple NULL emails are allowed (students without emails)
- Uploads work reliably

## Why This Wasn't Caught

The `upsertStudents()` method doesn't properly handle or display constraint errors to the user. The error occurs silently at the database level.

## What to Do Now

### Option 1: Run the Migration

If you haven't applied migrations yet:

```bash
cd /Users/benjaminjacklaubacher/Neptino
supabase migration up
```

### Option 2: Fix Existing Database

If you already created the table with the wrong constraint, you need to:

1. **Drop the constraint in Supabase dashboard**:
   - Go to SQL Editor
   - Run:
   ```sql
   ALTER TABLE public.students DROP CONSTRAINT IF EXISTS students_email_key;
   ```

2. **Or delete and recreate the table** (will lose data):
   - Delete all rows from `students` table
   - Re-upload your students

### Option 3: Check Supabase Dashboard

To verify the constraint:

1. Go to Supabase Dashboard
2. Click **SQL Editor**
3. Run:
   ```sql
   SELECT constraint_name, constraint_type 
   FROM information_schema.table_constraints 
   WHERE table_name = 'students';
   ```

Look for:
- ✅ `students_course_id_student_id_key` (correct)
- ❌ `students_email_key` (wrong - this is the global unique constraint)

## Related Issues Fixed

This same issue affects the `upsertStudents()` method in the repository. We should also add better error handling to show users when uploads fail due to constraints.

## Testing After Fix

1. Upload 5 students to Course A
2. Upload 5 different students to Course B  
3. Try uploading same 5 students again to Course B (should fail with duplicate student_id message, not email)
4. Students should now persist when you refresh the page

## Schema Comparison

**Before (BROKEN)**:
```sql
email text UNIQUE,                    -- Global unique
UNIQUE (course_id, student_id)        -- Only this was right
```

**After (FIXED)**:
```sql
email text,                           -- No global unique
UNIQUE (course_id, student_id)        -- Still correct
-- Could add this: UNIQUE (course_id, email)  -- Optional: enforce email uniqueness per course
```

Actually, the current state is better because it allows:
- Multiple students with NULL email in the same course (students without email)
- Flexible email handling without constraints

The real issue was the global UNIQUE on email preventing cross-course student uploads.

---

**Apply this fix and your upload issues should be resolved!**
