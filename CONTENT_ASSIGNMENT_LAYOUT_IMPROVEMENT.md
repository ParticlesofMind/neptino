# Content & Assignment Block Layout Improvement

## Issue
The Content and Assignment blocks have a hierarchical structure with related fields (primary field + time, method, social form), but they were being rendered in a generic 3-per-row grid layout that didn't respect these relationships.

### Before (Confusing Layout):
```
Content
[✓] Competence    [✓] Time    [✓] Topic      ← Row 1: Mixed relationships
[✓] Time          [✓] Objective [✓] Time     ← Row 2: Confusing! Multiple "Time" labels
[✓] Task          [✓] Time    [✓] Instruction Area  ← Row 3: Mixed indent levels
[✓] Method        [✓] Social form [✓] Student Area   ← Row 4: Unclear grouping
...
```

**Problems:**
- Related fields (e.g., "Competence" + its "Time") were separated
- Multiple "Time" fields appeared in random positions
- Indent levels were applied to rows, not respecting field groupings
- "Method" and "Social form" weren't clearly associated with their area
- Hard to understand the hierarchical structure

## Solution
Implemented a new `renderInlineGroupRows()` method that:
1. Detects blocks with `inlineGroup` properties (Content/Assignment)
2. Groups related fields together by their `inlineGroup`
3. Renders each group as a single row with proper indentation
4. Maintains hierarchical structure visually

### After (Clear Layout):
```
Content
[✓] Competence              [✓] Time                               ← Level 0: Competence + Time
  [✓] Topic                 [✓] Time                               ← Level 1: Topic + Time (indented)
    [✓] Objective           [✓] Time                               ← Level 2: Objective + Time (more indented)
      [✓] Task              [✓] Time                               ← Level 3: Task + Time (even more indented)
        [✓] Instruction Area [✓] Method  [✓] Social form           ← Level 4: Instruction (primary + method + social)
        [✓] Student Area     [✓] Method  [✓] Social form           ← Level 4: Student (primary + method + social)
        [✓] Teacher Area     [✓] Method  [✓] Social form           ← Level 4: Teacher (primary + method + social)
[✓] Include Project                                                ← Standalone field
```

**Benefits:**
✅ Related fields stay together on the same row
✅ Clear hierarchical structure with proper indentation
✅ Each group is visually distinct
✅ Easy to understand the relationship between fields
✅ "Method" and "Social form" are clearly associated with their areas
✅ Standalone fields (like "Include Project") render separately

## Implementation Details

### Field Configuration
Each field in Content/Assignment blocks has metadata:
```typescript
{
  name: "competence",
  label: "Competence",
  mandatory: true,
  indentLevel: 0,        // Hierarchy level (0-4)
  inlineGroup: "competence",  // Groups related fields
  role: "primary"        // Field role in the group
}
```

### Rendering Logic
```typescript
// NEW: renderInlineGroupRows() method
private static renderInlineGroupRows(
  templateId: string | null,
  block: TemplateBlock,
  fields: BlockFieldConfig[],
): string {
  // 1. Group fields by inlineGroup
  const groups = new Map<string, BlockFieldConfig[]>();
  
  // 2. Process each group as a single row
  groups.forEach((groupFields) => {
    const indentLevel = groupFields[0].indentLevel ?? 0;
    // Render all fields in the group together
    // Apply indentation based on the group's indent level
  });
  
  // 3. Handle standalone fields separately
}
```

### Updated renderBlockConfigRows()
```typescript
// Detects if block has inline groups
const hasInlineGroups = fields.some(f => f.inlineGroup);
if (hasInlineGroups && (block.type === 'content' || block.type === 'assignment')) {
  return this.renderInlineGroupRows(templateId, block, fields);
}
// Otherwise use default 3-per-row layout
```

## Field Groups Structure

### Content Block Groups:
1. **competence** (indent 0): Competence + Time
2. **topic** (indent 1): Topic + Time
3. **objective** (indent 2): Objective + Time
4. **task** (indent 3): Task + Time
5. **instruction** (indent 4): Instruction Area + Method + Social form
6. **student** (indent 4): Student Area + Method + Social form
7. **teacher** (indent 4): Teacher Area + Method + Social form
8. Standalone: Include Project

### Assignment Block Groups:
Same structure as Content block (identical field configuration)

## CSS Requirements
The new layout uses these CSS classes:
```css
.block-config__row--inline-group {
  /* Row containing a group of related fields */
}

.block-config__row--indent-1 {
  /* First level indentation */
  padding-left: 1.5rem;
}

.block-config__row--indent-2 {
  /* Second level indentation */
  padding-left: 3rem;
}

.block-config__row--indent-3 {
  /* Third level indentation */
  padding-left: 4.5rem;
}

.block-config__row--indent-4 {
  /* Fourth level indentation */
  padding-left: 6rem;
}
```

## Backwards Compatibility
- Other blocks (Header, Program, Resources, Footer, Scoring) continue using the 3-per-row layout
- Only Content and Assignment blocks use the new inline-group layout
- No changes to data structure or database
- Existing templates render correctly with the new layout

## File Modified
- `src/scripts/backend/courses/templates/createTemplate.ts`
  - Method: `renderBlockConfigRows()` - Lines ~1103-1180 (added detection logic)
  - Method: `renderInlineGroupRows()` - Lines ~1182-1224 (new method)

## Testing Checklist
- [x] Build completes without errors
- [ ] Content block displays fields in hierarchical groups
- [ ] Assignment block displays fields in hierarchical groups
- [ ] Indentation levels are visually clear
- [ ] "Include Project" appears at the bottom as standalone field
- [ ] Other blocks (Header, Program, etc.) still use 3-per-row layout
- [ ] Toggling checkboxes works correctly
- [ ] Template preview updates correctly
- [ ] Responsive layout works on different screen sizes
