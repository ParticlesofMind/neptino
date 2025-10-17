# Template Glossary Feature Fix

## Issue Summary
The glossary feature in the Resources block was not:
1. Appearing in the template preview when enabled with selected items
2. Being saved to the database properly (fields were being deleted instead of set to `false`)

## Root Causes

### 1. Backend Data Storage Issue
**Problem**: In `updateTemplateField()`, when a checkbox was unchecked, the field was being deleted from the config object:
```typescript
// OLD CODE (incorrect)
if (isChecked) {
  block.config[fieldName] = true;
} else {
  delete block.config[fieldName]; // ❌ This removes the field entirely
}
```

**Impact**: When `include_glossary` was unchecked, it disappeared from the `template_data` entirely, making it impossible to distinguish between "user explicitly disabled glossary" vs "glossary option never configured".

### 2. Preview Rendering Logic Issue
**Problem**: The `renderResourcesBlockContent()` method was checking if `include_glossary` existed in the `checkedFields` array (which only contains fields set to `true`):
```typescript
// OLD CODE (incorrect)
const includeGlossary = checkedFields.some(
  (field) => field.name === "include_glossary"
);
```

**Impact**: Even when glossary was enabled and glossary items were checked, the glossary table wasn't rendering in the preview because the check was looking in the wrong place.

### 3. Glossary Item Toggle Handler Issue
**Problem**: The `renderFieldCheckbox()` method was calling `toggleGlossaryItems()` for ALL non-mandatory fields, not just the "include_glossary" field:
```typescript
// OLD CODE (incorrect)
const updateHandler = !field.mandatory && templateUuid
  ? ` onchange="TemplateManager.updateTemplateField(...); TemplateManager.toggleGlossaryItems(this.checked);"`
  : field.name === "include_glossary" ? ` onchange="TemplateManager.toggleGlossaryItems(this.checked)"` : "";
```

**Impact**: When you checked/unchecked ANY glossary item (Historical figures, Terminology, or Concepts), it would disable ALL glossary items because `toggleGlossaryItems()` was being called inappropriately.

## Solutions Implemented

### 1. Fixed Backend Data Storage
**Location**: `src/scripts/backend/courses/templates/createTemplate.ts`
**Method**: `updateTemplateField()`

Changed the logic to always set boolean values instead of deleting fields:

```typescript
// NEW CODE (correct)
// Always set the value (true or false) instead of deleting
blockToUpdate.config[fieldName] = isChecked;
```

This change was applied in two places:
- Line ~165: In the local `currentlyLoadedTemplateData` update
- Line ~198: In the database update before saving

**Benefits**:
- All template options are now consistently stored as boolean values
- Follows the same pattern as all other template fields
- Makes the template data structure predictable and complete
- Enables proper state tracking for all options

### 2. Fixed Preview Rendering
**Location**: `src/scripts/backend/courses/templates/createTemplate.ts`
**Method**: `renderResourcesBlockContent()`

Added the block parameter and changed glossary check to read directly from block config:

```typescript
// NEW CODE (correct)
static renderResourcesBlockContent(
  checkedFields: BlockFieldConfig[],
  block?: TemplateBlock, // ✅ Added block parameter
): string {
  // Check if glossary is included from the block config
  // This ensures we check the actual config value, not just if it's in checkedFields
  const includeGlossary = block?.config?.["include_glossary"] === true;
  // ... rest of the logic
}
```

**Updated caller**:
```typescript
// In renderBlockContent()
if (block.type === "resources") {
  return this.renderResourcesBlockContent(checkedFields, block); // ✅ Pass block
}
```

**Benefits**:
- Glossary section now correctly appears when enabled
- Preview accurately reflects the template configuration
- Glossary items display as individual rows as designed

### 3. Fixed Glossary Item Toggle Handler
**Location**: `src/scripts/backend/courses/templates/createTemplate.ts`
**Method**: `renderFieldCheckbox()`

Refactored the update handler logic to only call `toggleGlossaryItems()` for the "include_glossary" field:

```typescript
// NEW CODE (correct)
let updateHandler = "";
if (!field.mandatory && templateUuid) {
  if (field.name === "include_glossary") {
    // Special handler for include_glossary: update field AND toggle glossary items
    updateHandler = ` onchange="TemplateManager.updateTemplateField('${templateUuid}', '${block.type}', '${field.name}', this.checked); TemplateManager.toggleGlossaryItems(this.checked);"`;
  } else {
    // Regular handler for all other fields: just update the field
    updateHandler = ` onchange="TemplateManager.updateTemplateField('${templateUuid}', '${block.type}', '${field.name}', this.checked);"`;
  }
}
```

**Benefits**:
- Individual glossary items (Historical figures, Terminology, Concepts) can now be checked/unchecked independently
- Only the "Include Glossary" checkbox controls the enabled/disabled state of glossary items
- No accidental disabling when toggling individual glossary options

## Expected Behavior Now

### UI Behavior
1. **When "Include Glossary" is unchecked**:
   - Glossary items (Historical figures, Terminology, Concepts) are visible but disabled (greyed out)
   - Glossary items cannot be checked
   - Preview does NOT show glossary section
   - Database stores: `"include_glossary": false`

2. **When "Include Glossary" is checked**:
   - Glossary items become enabled and can be checked
   - Preview shows "Glossary" subtitle and table ONLY if at least one item is checked
   - Each checked glossary item appears as its own row: `[Glossary Type] | [URL]`
   - Database stores: `"include_glossary": true`

### Database Storage
All fields (including `include_glossary`) are now consistently stored as boolean values:

```json
{
  "type": "resources",
  "config": {
    "task": true,
    "type": true,
    "origin": true,
    "state": false,
    "quality": false,
    "include_glossary": false,  // ✅ Always present
    "historical_figures": false,
    "terminology": false,
    "concepts": false
  }
}
```

Previously, unchecked fields were missing entirely:
```json
{
  "type": "resources",
  "config": {
    "task": true,
    "type": true,
    "origin": true
    // ❌ include_glossary and unchecked items missing
  }
}
```

## Preview Layout
When glossary is enabled with selected items, the Resources block preview renders:

```
Resources
┌─────────────────────────────┐
│ [Task] | [Type] | [Origin]  │ ← Main resources table
└─────────────────────────────┘

Glossary
┌────────────────────┬────────┐
│ Historical figures │ [URL]  │ ← Each selected glossary type
├────────────────────┼────────┤  gets its own row
│ Terminology        │ [URL]  │
└────────────────────┴────────┘
```

## Files Modified
1. `/Users/benjaminjacklaubacher/Neptino/src/scripts/backend/courses/templates/createTemplate.ts`
   - `updateTemplateField()` - Lines ~165, ~198
   - `renderResourcesBlockContent()` - Line ~1608
   - `renderBlockContent()` - Line ~1386
   - `renderFieldCheckbox()` - Lines ~1063-1080 (Fixed handler logic)

## Testing Recommendations
1. Create a new template and verify all fields save as boolean values
2. Toggle "Include Glossary" and verify:
   - Glossary items become enabled/disabled
   - Database stores correct boolean value
3. Check one or more glossary items and verify:
   - Preview shows Glossary section with individual rows
   - Each checked item appears correctly
4. Uncheck "Include Glossary" and verify:
   - Preview hides Glossary section
   - Database stores `"include_glossary": false` (not deleted)
5. Load an existing template and verify backwards compatibility

## Migration Notes
**No database migration required.** The `ensureBlockConfigDefaults()` method already handles normalization:
- Missing fields are automatically added with `false` as default
- Existing templates will be normalized on first load
- The fix is backwards compatible with existing template data
