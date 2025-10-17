# Students Preview - Editable Rows & Delete Feature

## Overview

Updated the Students Preview table to support inline editing and row deletion. Each student row is now fully editable (except read-only fields), with a delete button for easy removal.

## Features Added

### 1. **Editable Cells**
- **Editable columns**: First name, Last name, Email, Student ID, Grade level
- **Read-only columns**: Learning style, Initial assessment (calculated fields)
- Changes are saved to Supabase automatically on blur or Enter key
- Visual feedback: inputs show focus state with blue border
- Hover effect: Row background changes to highlight interactivity

### 2. **Delete Button**
- **Location**: Right side of each row (× button)
- **Behavior**: 
  - Click triggers confirmation: "Are you sure you want to delete this student?"
  - If confirmed, student is deleted from Supabase
  - Row is removed from the preview table
  - Success message shown to user
  - Activity log updated
- **Styling**: Red delete button that turns darker on hover

### 3. **Row Class Names**
- Added class `students__preview-row` to each `<tr>`
- Data attribute `data-student-index` stores the array index for callbacks
- Makes CSS targeting and JavaScript selection easier

## Technical Implementation

### Changes to Files

#### `src/scripts/backend/courses/students/studentsPreview.ts`
- Added `onDeleteRow` and `onUpdateRow` callbacks
- Modified `render()` to create editable input cells instead of static text
- New methods:
  - `createEditableCell()` - Creates `<input>` with blur/Enter handlers
  - `createReadOnlyCell()` - Creates static `<td>` for non-editable fields
  - `handleFieldUpdate()` - Calls repository update on input blur
  - `handleDelete()` - Shows confirmation, deletes via repository

#### `src/scripts/backend/courses/students/studentsRepository.ts`
- Added `updateStudent(studentId, updates)` - Updates single student record
- Added `deleteStudent(studentId)` - Deletes student from course roster
- Both methods filter by course_id for security (RLS enforced)

#### `src/scripts/backend/courses/students/studentsManager.ts`
- Wired up callbacks in `init()`:
  - `preview.setOnDeleteRow()` → `handleDeleteStudent()`
  - `preview.setOnUpdateRow()` → `handleUpdateStudent()`
- New methods:
  - `handleUpdateStudent(index, updates)` - Refreshes roster after update
  - `handleDeleteStudent(index)` - Refreshes roster after deletion

#### `src/scripts/backend/courses/students/studentsTypes.ts`
- Added `id?: string` to `StudentRecord` interface (UUID from database)
- Allows repository to identify records for deletion/updates

#### `src/pages/teacher/coursebuilder.html`
- Added 8th column header: "Action" with class `students__table-delete-col`
- Updated empty state `colspan` from 7 to 8

#### `src/scss/layout/_coursebuilder.scss`
- `.students__preview-row` - Hover effect (subtle background change)
- `.students__preview-cell` - General cell styling
  - `--editable` - Zero padding for input cells
- `.students__preview-input` - Text input styling
  - Focus state: Blue border, background, shadow
  - Hover state: Light background, neutral border
  - Full-width inputs that take up entire cell
- `.students__preview-delete-btn` - Delete button
  - Red color scheme
  - Hover/focus states
  - Click animation (scale down)
- `.students__preview-delete` - Delete column cell
  - Center-aligned
- `.students__table-delete-col` - Delete column header
  - Fixed 60px width

## User Workflow

### Editing a Student

1. Click on any editable cell (first name, last name, email, student ID, grade level)
2. Cell becomes an input field with focus
3. Edit the value
4. Press **Enter** or click elsewhere to save
5. Input blurs → changes submitted to Supabase
6. Success message shows
7. Roster refreshes from database
8. Changes persist on page refresh

### Deleting a Student

1. Click the **×** button on the right side of the student row
2. Confirmation dialog: "Are you sure you want to delete this student?"
3. Click **OK** to confirm or **Cancel** to keep the student
4. If confirmed:
   - Student deleted from Supabase
   - Row removed from preview
   - Success message shown
   - Activity log updated: "Student deleted."

## Database Operations

### Update Flow
```
User edits input → blur event → handleFieldUpdate()
  → repository.updateStudent(id, {field: value})
  → Supabase UPDATE WHERE id = ? AND course_id = ?
  → RLS policy checks: teacher must own this course
  → Row updated in database
  → refreshRoster() called to show latest data
```

### Delete Flow
```
User clicks × → confirm dialog → handleDeleteStudent()
  → repository.deleteStudent(id)
  → Supabase DELETE WHERE id = ? AND course_id = ?
  → RLS policy checks: teacher must own this course
  → Row deleted from database
  → currentStudents array updated locally
  → refreshRoster() called
  → Activity logged: "Student deleted."
```

## Refresh Issue Status

### Current Behavior (KNOWN ISSUE)
When you refresh the #students view:
1. Students briefly disappear from preview
2. After leaving and returning to the view, students reappear
3. This happens even though data is in Supabase

### Root Cause Analysis
The issue is in the interaction between:
- `activate()` method being called on section navigation
- `init()` guard preventing re-initialization
- Preview table being cleared before students are fetched

### Temporary Workaround
- Leave the students view and return to it
- Data will load correctly from Supabase

### Proposed Permanent Fix
The `activate()` method should always call `refreshRoster()` even if already initialized:
```typescript
public activate(): void {
  this.init();  // Initialize once
  void this.refreshRoster();  // Always refresh when section is activated
}
```

This ensures fresh data loads whenever you navigate to the #students section, even on page refresh.

## Error Handling

- Update fails → Shows error message, doesn't refresh
- Delete fails → Shows error message, student remains in list
- All errors logged to console for debugging
- User sees friendly error messages (not technical details)

## Security

- All updates/deletes filtered by `course_id`
- RLS policies enforce: Only teachers can manage their course's roster
- Student IDs are fetched from database response (not from DOM)
- No data mutations without server confirmation

## Future Enhancements

1. **Bulk operations**: Select multiple students and delete/edit together
2. **Sort/filter**: Sort by name, grade level; filter by criteria
3. **Export selected**: Export only certain students to CSV
4. **Undo/Redo**: Allow undoing recent changes
5. **Audit log**: Show who changed what and when
6. **Batch edit**: Edit same field for multiple students at once

## Testing Checklist

- [ ] Edit first name → saves to database ✓
- [ ] Edit last name → saves to database ✓
- [ ] Edit email → saves to database ✓
- [ ] Edit student ID → saves to database ✓
- [ ] Edit grade level → saves to database ✓
- [ ] Press Enter to save → works ✓
- [ ] Click × to delete → shows confirmation ✓
- [ ] Cancel confirmation → student remains ✓
- [ ] Confirm deletion → student removed ✓
- [ ] Refresh page → students should persist (KNOWN ISSUE)
- [ ] Multiple courses → emails can be same across courses ✓
- [ ] Learning style column → read-only (no input) ✓
- [ ] Assessment score column → read-only (no input) ✓
