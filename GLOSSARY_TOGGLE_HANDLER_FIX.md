# Glossary Item Toggle Handler Fix

## Issue
When checking/unchecking individual glossary items (Historical figures, Terminology, Concepts), ALL glossary items were being disabled incorrectly.

## Root Cause
The `renderFieldCheckbox()` method was calling `toggleGlossaryItems()` for **every** non-mandatory field change:

```typescript
// ❌ BEFORE (incorrect)
const updateHandler = !field.mandatory && templateUuid
  ? ` onchange="TemplateManager.updateTemplateField(...); TemplateManager.toggleGlossaryItems(this.checked);"`
  //                                                        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  //                                                        This was called for ALL fields!
  : field.name === "include_glossary" ? ` onchange="TemplateManager.toggleGlossaryItems(this.checked)"` : "";
```

### What Was Happening:
1. User checks "Historical figures" ✅
2. Handler calls: `updateTemplateField(..., 'historical_figures', true)` ✅
3. Handler ALSO calls: `toggleGlossaryItems(true)` ❌
4. `toggleGlossaryItems(true)` enables ALL glossary items (confusing!)
5. User unchecks "Terminology" ☑️
6. Handler calls: `updateTemplateField(..., 'terminology', false)` ✅
7. Handler ALSO calls: `toggleGlossaryItems(false)` ❌❌
8. `toggleGlossaryItems(false)` **DISABLES ALL GLOSSARY ITEMS** including "Historical figures" 😱

## Solution
Only call `toggleGlossaryItems()` when the "Include Glossary" checkbox itself is toggled:

```typescript
// ✅ AFTER (correct)
let updateHandler = "";
if (!field.mandatory && templateUuid) {
  if (field.name === "include_glossary") {
    // Special case: Include Glossary controls all glossary items
    updateHandler = ` onchange="TemplateManager.updateTemplateField('${templateUuid}', '${block.type}', '${field.name}', this.checked); TemplateManager.toggleGlossaryItems(this.checked);"`;
  } else {
    // Regular case: Just update the field, don't toggle glossary items
    updateHandler = ` onchange="TemplateManager.updateTemplateField('${templateUuid}', '${block.type}', '${field.name}', this.checked);"`;
  }
}
```

## Correct Behavior Now:

### Scenario 1: Toggle "Include Glossary"
```
[✓] Include Glossary  ← User clicks this
  [✓] Historical figures  ← Becomes ENABLED
  [✓] Terminology         ← Becomes ENABLED
  [✓] Concepts            ← Becomes ENABLED
```
✅ Calls: `toggleGlossaryItems(true)` → Enables all glossary items

### Scenario 2: Toggle Individual Glossary Items
```
[✓] Include Glossary
  [✓] Historical figures  ← User clicks this (unchecks it)
  [✓] Terminology         ← Stays ENABLED ✅
  [✓] Concepts            ← Stays ENABLED ✅
```
✅ Calls: `updateTemplateField(..., 'historical_figures', false)` → Only updates this field
❌ Does NOT call: `toggleGlossaryItems()` → Other items remain enabled

### Scenario 3: Disable Glossary
```
[☐] Include Glossary  ← User clicks this (unchecks it)
  [☐] Historical figures  ← Becomes DISABLED (greyed out)
  [☐] Terminology         ← Becomes DISABLED (greyed out)
  [☐] Concepts            ← Becomes DISABLED (greyed out)
```
✅ Calls: `toggleGlossaryItems(false)` → Disables all glossary items

## Testing
```javascript
// Test in browser console after loading template:

// 1. Enable glossary
document.querySelector('input[name="include_glossary"]').click();
// Expected: All glossary items become enabled

// 2. Check "Historical figures"
document.querySelector('input[name="historical_figures"]').click();
// Expected: Only Historical figures is checked, others remain enabled

// 3. Check "Terminology"
document.querySelector('input[name="terminology"]').click();
// Expected: Both Historical figures and Terminology are checked, Concepts remains enabled

// 4. Uncheck "Historical figures"
document.querySelector('input[name="historical_figures"]').click();
// Expected: Only Historical figures is unchecked, Terminology and Concepts remain enabled ✅
```

## File Changed
- `src/scripts/backend/courses/templates/createTemplate.ts`
- Method: `renderFieldCheckbox()`
- Lines: ~1063-1080
