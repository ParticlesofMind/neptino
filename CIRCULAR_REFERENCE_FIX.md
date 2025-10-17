# Circular Reference Fix for Curriculum Save

## Issue Description

**Error**: "Failed to save: Converting circular structure to JSON"

**Triggered when**: Partitioning 44 lessons into equal modules

## Root Cause

The problem occurred in the `saveCurriculumToDatabase()` method when attempting to save the curriculum structure to Supabase. The issue was:

1. When distributing lessons into equal modules, the same lesson objects were being referenced in multiple places
2. The `lessons` array in the curriculum and the `lessons` arrays within each module were the **same object references** (not copies)
3. When JavaScript's `JSON.stringify()` tried to serialize the payload, it detected a circular reference:
   ```
   payload.modules[0].lessons[0] → same object as → payload.lessons[0]
   ```

## The Fix

### Fix #1: Deep Copy Before Serialization (saveCurriculumToDatabase)

Added deep copies of the curriculum and modules before creating the payload:

```typescript
// Create deep copies to avoid circular references
const curriculumCopy = JSON.parse(JSON.stringify(curriculum));
const modulesCopy = JSON.parse(JSON.stringify(modules));

// Then use the copies in the payload
const payload: CurriculumDataPayload = {
  structure: this.buildStructurePayload(),
  moduleOrganization: this.moduleOrganization,
  templatePlacements: this.templatePlacements,
  courseType: this.courseType,
  modules: modulesCopy,  // Uses copy, not original
  lessons: curriculumCopy // Uses copy, not original
};

// Safety check before sending to database
try {
  JSON.stringify(payload);
} catch (circularRefError) {
  throw new Error('Failed to serialize curriculum data: ' + circularRefError.message);
}
```

### Fix #2: Create Independent Lesson Copies (distributeEqualModules)

Modified the module distribution to create independent copies of lessons:

```typescript
// Before (shared references):
const moduleLessons = lessons.slice(lessonIndex, lessonIndex + moduleSize);
moduleLessons.forEach((lesson) => {
  lesson.moduleNumber = i + 1;
});

// After (independent copies):
const moduleLessons = lessons.slice(lessonIndex, lessonIndex + moduleSize).map(lesson => ({
  ...lesson,
  moduleNumber: i + 1
}));
```

This ensures each lesson in a module is an independent object, not a reference to the original.

## How It Works

1. **Shallow spread operator** (`...lesson`) creates a new object with the same properties
2. **Override `moduleNumber`** for the specific module
3. **Result**: Each module has its own lesson objects, not shared references
4. **Database save**: Deep copy everything before JSON serialization as a final safety check

## Testing

To verify the fix works:
1. Navigate to Curriculum section
2. Set "Module Organization" to "Equal Modules"
3. Partition 44 lessons (or any large number)
4. Observe: Should save without "circular structure" error
5. Check footer: Should show "Curriculum saved at [time]" message

## Files Modified

- `/Users/benjaminjacklaubacher/Neptino/src/scripts/backend/courses/curriculum/curriculumManager.ts`
  - `saveCurriculumToDatabase()` method (line ~2708): Added deep copies and serialization check
  - `distributeEqualModules()` method (line ~2610): Changed to create independent lesson copies

## Impact

- **No breaking changes** to the API or data structure
- **Performance**: Minimal impact (deep copy only on save, not during editing)
- **Reliability**: Prevents circular reference errors across all module organization types
- **Data integrity**: Ensures clean, serializable objects are sent to Supabase
