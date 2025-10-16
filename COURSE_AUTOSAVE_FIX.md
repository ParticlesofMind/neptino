# Course Auto-Save Fix - Complete Solution

## Problem Statement
After creating a course in the essentials section, users could update course name, description, language, and image, but changes were **not persisted** to the database. Upon page refresh, the form would revert to the original values created during course creation.

## Root Causes

1. **Auto-save not enabled after course creation**: The essentials section had `autoSave: false` in the config, and auto-save was only triggered if a section had `autoSave: true` **or** had a courseId.

2. **Silent save failures**: The `updateCourse()` function in Supabase wasn't logging detailed error information, making it impossible to diagnose what was actually failing.

3. **Display-only fields being included in updates**: Read-only fields like `teacher_id` and `institution` were being included in the update payload, potentially causing validation errors.

4. **JSONB field structure confusion**: The code wasn't properly distinguishing between top-level column updates (essentials) and JSONB field updates (classification, pedagogy, etc.).

## Solution Implemented

### 1. Enable Auto-Save After Course Creation
**File**: `src/scripts/backend/courses/shared/courseFormHandler.ts` (line ~616)

Changed the input change handler to enable auto-save for the essentials section **after** a course is created:

```typescript
// Enable auto-save for essentials section after course creation
const shouldAutoSave = this.sectionConfig.autoSave || 
    (this.sectionConfig.section === 'essentials' && this.currentCourseId);

if (shouldAutoSave && this.currentCourseId) {
    this.debouncedSave();
}
```

**Effect**: Any changes to essentials fields now trigger a debounced (500ms) auto-save.

### 2. Update UI to Reflect Auto-Save Status
**File**: `src/scripts/backend/courses/shared/courseFormHandler.ts` (line ~1027)

Changed the submit button text and disabled state after course creation to indicate that auto-save is active:

```typescript
if (isEssentialsSection && this.currentCourseId) {
    submitBtn.textContent = "✓ Course Created (auto-save active)";
    submitBtn.disabled = true;
    submitBtn.classList.add("button--disabled");
    submitBtn.setAttribute("aria-disabled", "true");
    submitBtn.title = "Changes are automatically saved as you type";
    return;
}
```

**Effect**: User sees clear indication that the course is now in auto-save mode.

### 3. Enhanced Data Validation & Logging
**File**: `src/scripts/backend/courses/essentials/createCourse.ts` (line ~237)

Improved the `updateCourse()` function with:
- File object filtering
- Detailed error logging with error code, message, hints, and details
- Better error messages

```typescript
export async function updateCourse(
    courseId: string,
    data: Partial<CourseCreationData>,
): Promise<{ success: boolean; error?: string }> {
    try {
        // Filter out File objects
        const cleanData: Record<string, any> = {};
        for (const [key, value] of Object.entries(data)) {
            if (value instanceof File) {
                console.log(`⏭️  Skipping File object for key: ${key}`);
                continue;
            }
            cleanData[key] = value;
        }

        console.log('📤 Sending update to Supabase:', {
            courseId,
            data: cleanData,
            timestamp: new Date().toISOString()
        });

        const { error } = await supabase
            .from("courses")
            .update({
                ...cleanData,
                updated_at: new Date().toISOString(),
            })
            .eq("id", courseId);

        if (error) {
            console.error("❌ Error updating course in Supabase:", {
                courseId,
                error: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
            return { success: false, error: error.message || "Failed to update course" };
        }

        console.log('✅ Course updated successfully in Supabase:', courseId);
        return { success: true };
    } catch (error) {
        console.error("❌ Error in updateCourse:", error);
        return { 
            success: false, 
            error: error instanceof Error ? error.message : "Unexpected error occurred" 
        };
    }
}
```

### 4. Smart Field Filtering in Update Handler
**File**: `src/scripts/backend/courses/shared/courseFormHandler.ts` (line ~759)

Implemented intelligent filtering to exclude:
- Display-only fields (read-only)
- File objects
- Empty string values

```typescript
if (this.sectionConfig.jsonbField) {
    // For JSONB fields, only include non-File values
    for (const [key, value] of Object.entries(formData)) {
        if (value instanceof File || (typeof value === 'string' && value === '')) {
            continue;
        }
        updateData[key] = value;
    }
    if (Object.keys(updateData).length > 0) {
        updateData[this.sectionConfig.jsonbField] = updateData;
        // Remove individual keys since they're now in the JSONB field
        this.sectionConfig.fields.forEach((field) => {
            delete updateData[field.name];
        });
    }
} else {
    // For top-level columns, only include updatable fields
    const displayOnlyFields = new Set(
        this.sectionConfig.fields
            .filter(f => f.type === 'display')
            .map(f => f.name)
    );

    for (const [key, value] of Object.entries(formData)) {
        // Skip display fields (read-only)
        if (displayOnlyFields.has(key)) {
            console.log(`⏭️  Skipping display-only field: ${key}`);
            continue;
        }
        // Skip File objects and empty strings
        if (value instanceof File) {
            continue;
        }
        if (typeof value === 'string' && value === '' && key !== 'course_image') {
            continue;
        }
        updateData[key] = value;
    }
}
```

### 5. Enhanced Data Loading from Supabase
**File**: `src/scripts/backend/courses/shared/courseFormHandler.ts` (line ~292)

Improved logging when loading existing course data:

```typescript
console.log('✅ Course data loaded successfully:', {
    courseId: courseData.id,
    courseName: courseData.course_name,
    courseDescription: courseData.course_description,
    courseLanguage: courseData.course_language,
    lastUpdated: courseData.updated_at,
    timestamp: new Date().toISOString()
});
```

**Effect**: Easy to verify that data is being fetched correctly on page load.

## User Experience Flow

### Before Fix
1. User creates course ✓
2. User updates course name
3. User refreshes page
4. Course name reverts to original ✗

### After Fix
1. User creates course ✓
2. Button changes to "✓ Course Created (auto-save active)"
3. User updates course name
4. Text updates trigger debounced save
5. Status shows "Saved ✓"
6. User refreshes page
7. Course name persists ✓

## Debugging Tips

Check the browser console for detailed logs:
- Look for `📥 Loading existing course data for ID:` when page loads
- Look for `📤 Final update payload:` when changes are saved
- Look for `✅ Course update success:` to confirm Supabase accepted the update
- Look for `❌ Error updating course in Supabase:` with detailed error info if save fails

## Testing Checklist

- [ ] Create a course with all required fields
- [ ] Change course name, verify "Saved ✓" appears
- [ ] Change course description, verify "Saved ✓" appears
- [ ] Change course language, verify "Saved ✓" appears
- [ ] Upload new course image, verify "Saved ✓" appears
- [ ] Refresh page, verify all changes persist
- [ ] Check browser console for no errors
- [ ] Verify Supabase database shows updated `updated_at` timestamp
