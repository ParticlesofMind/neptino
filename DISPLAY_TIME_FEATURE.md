# Content & Assignment Block: Display Time Feature

## Summary
Updated Content and Assignment blocks to use "Display time" as facultative (optional) checkboxes instead of mandatory "Time" fields, and removed hierarchical indentation for a cleaner flat layout.

## Changes Made

### 1. Field Label Change
**Before**: "Time" (mandatory)
**After**: "Display time" (facultative/optional)

### 2. Mandatory Status Change
All time fields are now **optional** (mandatory: false):
- `competence_time`
- `topic_time`
- `objective_time`
- `task_time`

### 3. Layout Change
**Before**: Hierarchical with indentation levels (0-4)
**After**: Flat layout with no indentation

## New Layout Structure

### Content Block
```
┌─────────────────────────────────────────────────────────┐
│ Content                                                 │
├─────────────────────────────────────────────────────────┤
│ ☑ Competence              ☐ Display time               │
│ ☑ Topic                   ☐ Display time               │
│ ☑ Objective               ☐ Display time               │
│ ☑ Task                    ☐ Display time               │
│ ☑ Instruction Area    ☑ Method    ☑ Social form       │
│ ☑ Student Area        ☑ Method    ☑ Social form       │
│ ☑ Teacher Area        ☑ Method    ☑ Social form       │
│ ☐ Include Project                                      │
└─────────────────────────────────────────────────────────┘
```

### Assignment Block
```
┌─────────────────────────────────────────────────────────┐
│ Assignment                                              │
├─────────────────────────────────────────────────────────┤
│ ☑ Competence              ☐ Display time               │
│ ☑ Topic                   ☐ Display time               │
│ ☑ Objective               ☐ Display time               │
│ ☑ Task                    ☐ Display time               │
│ ☑ Instruction Area    ☑ Method    ☑ Social form       │
│ ☑ Student Area        ☑ Method    ☑ Social form       │
│ ☑ Teacher Area        ☑ Method    ☑ Social form       │
│ ☐ Include Project                                      │
└─────────────────────────────────────────────────────────┘
```

## Field Configuration

### Updated Content Block Fields
```typescript
content: [
  { name: "competence", label: "Competence", mandatory: true, inlineGroup: "competence", role: "primary" },
  { name: "competence_time", label: "Display time", mandatory: false, inlineGroup: "competence", role: "time" },
  { name: "topic", label: "Topic", mandatory: true, inlineGroup: "topic", role: "primary" },
  { name: "topic_time", label: "Display time", mandatory: false, inlineGroup: "topic", role: "time" },
  { name: "objective", label: "Objective", mandatory: true, inlineGroup: "objective", role: "primary" },
  { name: "objective_time", label: "Display time", mandatory: false, inlineGroup: "objective", role: "time" },
  { name: "task", label: "Task", mandatory: true, inlineGroup: "task", role: "primary" },
  { name: "task_time", label: "Display time", mandatory: false, inlineGroup: "task", role: "time" },
  { name: "instruction_area", label: "Instruction Area", mandatory: true, inlineGroup: "instruction", role: "primary" },
  { name: "instruction_method", label: "Method", mandatory: true, inlineGroup: "instruction", role: "method" },
  { name: "instruction_social_form", label: "Social form", mandatory: true, inlineGroup: "instruction", role: "social" },
  { name: "student_area", label: "Student Area", mandatory: true, inlineGroup: "student", role: "primary" },
  { name: "student_method", label: "Method", mandatory: true, inlineGroup: "student", role: "method" },
  { name: "student_social_form", label: "Social form", mandatory: true, inlineGroup: "student", role: "social" },
  { name: "teacher_area", label: "Teacher Area", mandatory: true, inlineGroup: "teacher", role: "primary" },
  { name: "teacher_method", label: "Method", mandatory: true, inlineGroup: "teacher", role: "method" },
  { name: "teacher_social_form", label: "Social form", mandatory: true, inlineGroup: "teacher", role: "social" },
  { name: "include_project", label: "Include Project", mandatory: false }
]
```

### Key Changes:
1. **Removed `indentLevel`** from all fields (was 0-4)
2. **Changed `mandatory: true` → `mandatory: false`** for all time fields
3. **Changed label from "Time" → "Display time"** for all time fields

## Database Storage

### Example Template Data (Content Block)
```json
{
  "type": "content",
  "config": {
    "competence": true,
    "competence_time": false,        // ✅ "Display time" for Competence (disabled)
    "topic": true,
    "topic_time": true,              // ✅ "Display time" for Topic (enabled)
    "objective": true,
    "objective_time": false,         // ✅ "Display time" for Objective (disabled)
    "task": true,
    "task_time": true,               // ✅ "Display time" for Task (enabled)
    "instruction_area": true,
    "instruction_method": true,
    "instruction_social_form": true,
    "student_area": true,
    "student_method": true,
    "student_social_form": true,
    "teacher_area": true,
    "teacher_method": true,
    "teacher_social_form": true,
    "include_project": false         // ✅ Facultative
  }
}
```

## Behavior

### Display Time Checkbox
- **Unchecked (default)**: Time column will NOT appear in the preview for that row
- **Checked**: Time column WILL appear in the preview for that row
- **Stored as**: Boolean value (`true` or `false`) in `template_data.blocks[].config`

### Include Project Checkbox
- **Unchecked (default)**: No project section appears
- **Checked**: Additional project section is rendered at the end
- **Stored as**: Boolean value in `template_data.blocks[].config.include_project`

## Preview Rendering Logic

The preview should respect the "Display time" setting:

```typescript
// If competence_time is true, show time column for Competence row
if (block.config.competence_time) {
  // Render: | Competence | [Time] |
} else {
  // Render: | Competence | (no time column)
}
```

## Migration Notes

### Existing Templates
Templates created before this change will have:
- `competence_time: true` (was mandatory)
- `topic_time: true` (was mandatory)
- `objective_time: true` (was mandatory)
- `task_time: true` (was mandatory)

These will continue to work and show time columns in the preview.

### New Templates
Templates created after this change will have:
- All time fields default to `false` (unchecked)
- User can opt-in to display time for specific rows

## UI/UX Benefits

1. **Clearer Purpose**: "Display time" makes it obvious it's a toggle for visibility
2. **Flexibility**: Users can choose which rows show time columns
3. **Cleaner Layout**: Flat structure is easier to scan
4. **Consistent Labeling**: All time fields have the same label
5. **Better Grouping**: Related fields stay together on the same row

## Files Modified
- `src/scripts/backend/courses/templates/createTemplate.ts`
  - `getBlockFieldConfiguration()` - Updated content & assignment field configs
  - `renderInlineGroupRows()` - Removed indentation logic

## Testing Checklist
- [x] Build completes without errors
- [ ] "Display time" appears instead of "Time" for Content block
- [ ] "Display time" appears instead of "Time" for Assignment block
- [ ] All "Display time" checkboxes are unchecked by default
- [ ] "Include Project" is unchecked by default
- [ ] Checking "Display time" stores `true` in template_data
- [ ] Unchecking "Display time" stores `false` in template_data
- [ ] Preview respects "Display time" setting (shows/hides time column)
- [ ] No indentation appears in Content/Assignment layouts
- [ ] All rows are visually aligned (flat layout)
