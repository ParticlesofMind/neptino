# Content & Assignment Block Layout - Visual Comparison

## Before: Generic 3-Per-Row Layout ❌

### Content Block (OLD)
```
┌─────────────────────────────────────────────────────────────────┐
│ Content                                                         │
├─────────────────────────────────────────────────────────────────┤
│ ☑ Competence     ☑ Time         ☑ Topic                        │  ← Confusing!
│ ☑ Time           ☑ Objective    ☑ Time                         │  ← 3 "Time" labels
│ ☑ Task           ☑ Time         ☑ Instruction Area             │  ← Mixed hierarchy
│ ☑ Method         ☑ Social form  ☑ Student Area                 │  ← Unclear grouping
│ ☑ Method         ☑ Social form  ☑ Teacher Area                 │
│ ☑ Method         ☑ Social form  ☐ Include Project              │
└─────────────────────────────────────────────────────────────────┘
```

**Issues:**
- ❌ "Competence" and its "Time" are separated by 2 other fields
- ❌ Three "Time" labels in row 2 - very confusing
- ❌ No clear visual hierarchy
- ❌ "Method" and "Social form" aren't clearly linked to their areas
- ❌ Hard to understand the relationships between fields

---

## After: Inline Group Layout ✅

### Content Block (NEW)
```
┌─────────────────────────────────────────────────────────────────┐
│ Content                                                         │
├─────────────────────────────────────────────────────────────────┤
│ ☑ Competence                    ☑ Time                         │  ← Level 0
│   ☑ Topic                       ☑ Time                         │  ← Level 1 (indent)
│     ☑ Objective                 ☑ Time                         │  ← Level 2 (more indent)
│       ☑ Task                    ☑ Time                         │  ← Level 3 (even more)
│         ☑ Instruction Area  ☑ Method  ☑ Social form           │  ← Level 4 (most indent)
│         ☑ Student Area      ☑ Method  ☑ Social form           │  ← Level 4
│         ☑ Teacher Area      ☑ Method  ☑ Social form           │  ← Level 4
│ ☐ Include Project                                              │  ← Standalone
└─────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- ✅ Related fields stay together: "Competence" + "Time" on same row
- ✅ Clear visual hierarchy with indentation
- ✅ Each "Time" is clearly associated with its primary field
- ✅ "Method" and "Social form" are clearly linked to their area
- ✅ Easy to understand the pedagogical structure
- ✅ Matches the hierarchical structure in the preview table

---

## Assignment Block (NEW)
```
┌─────────────────────────────────────────────────────────────────┐
│ Assignment                                                      │
├─────────────────────────────────────────────────────────────────┤
│ ☑ Competence                    ☑ Time                         │
│   ☑ Topic                       ☑ Time                         │
│     ☑ Objective                 ☑ Time                         │
│       ☑ Task                    ☑ Time                         │
│         ☑ Instruction Area  ☑ Method  ☑ Social form           │
│         ☑ Student Area      ☑ Method  ☑ Social form           │
│         ☑ Teacher Area      ☑ Method  ☑ Social form           │
│ ☐ Include Project                                              │
└─────────────────────────────────────────────────────────────────┘
```

Same improved layout as Content block!

---

## How It Maps to the Preview Table

The new layout mirrors the hierarchical structure shown in the preview:

### Config Layout (Left Side)
```
☑ Competence     ☑ Time
  ☑ Topic        ☑ Time
    ☑ Objective  ☑ Time
      ☑ Task     ☑ Time
```

### Preview Table (Right Side)
```
┌──────────────────┬──────┬────────┬─────────────┐
│ Primary Field    │ Time │ Method │ Social Form │
├──────────────────┼──────┼────────┼─────────────┤
│ Competence       │ [T]  │        │             │
│   Topic          │ [T]  │        │             │
│     Objective    │ [T]  │        │             │
│       Task       │ [T]  │        │             │
│         Instruct │      │ [M]    │ [SF]        │
│         Student  │      │ [M]    │ [SF]        │
│         Teacher  │      │ [M]    │ [SF]        │
└──────────────────┴──────┴────────┴─────────────┘
```

The indentation levels match perfectly! 🎯

---

## Other Blocks Remain Unchanged

### Header Block (Still 3-Per-Row)
```
┌─────────────────────────────────────────────────────────────────┐
│ Header                                                          │
├─────────────────────────────────────────────────────────────────┤
│ ☑ Lesson number (#)  ☑ Lesson title    ☑ Module title         │
│ ☑ Course title       ☑ Institution name ☐ Teacher name        │
└─────────────────────────────────────────────────────────────────┘
```

### Program Block (Still 3-Per-Row)
```
┌─────────────────────────────────────────────────────────────────┐
│ Program                                                         │
├─────────────────────────────────────────────────────────────────┤
│ ☑ Competence         ☑ Topic           ☑ Objective            │
│ ☑ Task               ☑ Method          ☑ Social form          │
│ ☑ Time                                                         │
└─────────────────────────────────────────────────────────────────┘
```

### Resources Block (Still 3-Per-Row with Glossary Group)
```
┌─────────────────────────────────────────────────────────────────┐
│ Resources                                                       │
├─────────────────────────────────────────────────────────────────┤
│ ☑ Task               ☑ Type            ☑ Origin               │
│ ☐ State              ☐ Quality                                │
│ ☐ Include Glossary                                            │
│   ☐ Historical figures ☐ Terminology   ☐ Concepts            │ (greyed out)
└─────────────────────────────────────────────────────────────────┘
```

---

## Key Improvements Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Field Grouping** | Random 3-per-row | Logical inline groups |
| **Hierarchy** | Not visible | Clear indentation (0-4 levels) |
| **Related Fields** | Separated | Together on same row |
| **Time Fields** | Scattered | Next to their primary field |
| **Method/Social** | Floating | Clearly linked to their area |
| **Readability** | Confusing | Intuitive |
| **Matches Preview** | No | Yes ✅ |
| **User Experience** | Poor | Excellent |

---

## Technical Implementation

### Automatic Detection
```typescript
// Automatically uses inline-group layout for Content/Assignment
const hasInlineGroups = fields.some(f => f.inlineGroup);
if (hasInlineGroups && (block.type === 'content' || block.type === 'assignment')) {
  return this.renderInlineGroupRows(templateId, block, fields);
}
```

### Group Processing
```typescript
// Groups fields by their inlineGroup property
fields.forEach((field) => {
  if (field.inlineGroup) {
    groups.get(field.inlineGroup).push(field);
  }
});

// Each group becomes one row with proper indentation
<div class="block-config__row--indent-${indentLevel}">
  ${groupFields.map(renderCheckbox).join('')}
</div>
```

This creates a much more intuitive and professional-looking interface! 🎉
