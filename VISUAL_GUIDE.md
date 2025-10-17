# VISUAL GUIDE - Students Table Features

## Table Structure

```
                                                          DELETE
                                                          COLUMN
                                                            ▼
┌─────────┬──────────┬─────────────────┬────────┬──────────┬──────────────┬─────────────┬────────┐
│ First   │ Last     │ Email           │ ID     │ Grade    │ Learning     │ Assessment  │ Action │
│ name    │ name     │                 │        │ level    │ style        │ score       │        │
├─────────┼──────────┼─────────────────┼────────┼──────────┼──────────────┼─────────────┼────────┤
│ [John]  │ [Doe]    │ [john@x.com]    │ [S-01] │ [10]     │ Visual       │ 85          │  [×]   │  ← Row with
│  input  │  input   │  input          │ input  │  input   │  (read-only) │ (read-only) │button  │    class
│  field  │  field   │  field          │ field  │  field   │              │             │        │    students
│         │          │                 │        │          │              │             │        │    __preview
│ Focus:  │ Hover:   │ Editable        │ Text   │ Editable │ Plain text   │ Plain text  │ Red    │    __row
│ blue    │ gray bg  │ on click        │ area   │ on click │              │             │ btn    │
│ border  │ border   │                 │        │          │              │             │        │
├─────────┼──────────┼─────────────────┼────────┼──────────┼──────────────┼─────────────┼────────┤
│ [Jane]  │ [Smith]  │ [jane@y.com]    │ [S-02] │ [9]      │ Kinesthetic  │ 92          │  [×]   │
│         │          │                 │        │          │              │             │        │
├─────────┼──────────┼─────────────────┼────────┼──────────┼──────────────┼─────────────┼────────┤
│ [Bob]   │ [Jones]  │ [bob@z.com]     │ [S-03] │ [11]     │ Auditory     │ 78          │  [×]   │
│         │          │                 │        │          │              │             │        │
└─────────┴──────────┴─────────────────┴────────┴──────────┴──────────────┴─────────────┴────────┘
     ▲         ▲           ▲              ▲         ▲
     │         │           │              │         │
  INPUT      INPUT       INPUT          INPUT    INPUT
  FIELD      FIELD       FIELD          FIELD    FIELD
  Editable   Editable    Editable       Editable Editable
```

---

## Interaction States

### 1️⃣ Default State
```
│ [John]  │  Click to edit
│ Text    │  Light background
│ display │  Dark text
```

### 2️⃣ Hover State
```
│ [John]  │  Cursor changes to pointer
│ Gray BG │  Light gray background
│ Gray    │  Gray border visible
│ border  │
```

### 3️⃣ Focus State (Clicked)
```
│ [John]  │  Text input active
│ |cursor │  Blue border
│ Blue    │  Blue glow shadow
│ glow    │  Ready to type
```

### 4️⃣ Input State (Typing)
```
│ [John D │  User typing
│ |cursor │  White background
│ Blue    │  Cursor visible
│ glow    │
```

### 5️⃣ Save State (Blur/Enter)
```
│ John    │  Saved to database
│ Done    │  Green checkmark (optional)
│ display │  Returns to normal display
```

---

## Delete Button Interaction

### Button Locations
```
LEFT SIDE (Editable)          RIGHT SIDE (Delete)
                              
[John]    [Doe]               ... [×] ← Red button
Input     Input               ... Hover: Dark red
Fields    Fields              ... Focus: Blue ring
                              ... Click: Scales down
```

### Delete Sequence

**Step 1: Default**
```
Row: │ John  │ Doe  │ ... │  [×]  │
     └───────┴──────┴─────┴───────┘
              Red button
```

**Step 2: Hover**
```
Row: │ John  │ Doe  │ ... │  [×]  │  ← Darker red
     └───────┴──────┴─────┴───────┘
       Light gray row background
```

**Step 3: Click**
```
Confirmation dialog appears:

  ╔════════════════════════════════════╗
  ║  Confirm Deletion                  ║
  ║                                    ║
  ║  Are you sure you want to         ║
  ║  delete this student?             ║
  ║                                    ║
  ║  [Cancel]  [OK - Delete]          ║
  ╚════════════════════════════════════╝
```

**Step 4: Delete (Confirmed)**
```
Row REMOVED:
│ John  │ Doe  │ ... │  [×]  │  ← Fades out/removed
└───────┴──────┴─────┴───────┘

Success message:
✓ "Student deleted successfully."
```

---

## Editing Workflow

### Quick Edit Example

```
BEFORE: Student name is "Jon" (typo)

│ [Jon]   │ [Smith] │
  Input     Input

STEP 1: Click "Jon" cell
│ [Jon]   │ ← Cell becomes input, focused
  |cursor

STEP 2: Fix the typo
│ [John]  │ ← User changed Jon→John
  |cursor

STEP 3: Press Enter (or click elsewhere)
│ [John]  │ ← Changes saved!
  Display    ✓ Goes to database
             ✓ Row refreshes
             ✓ Message: "Student updated successfully"

AFTER: Database updated, students list refreshed
│ [John]  │ [Smith] │ ← Persisted in Supabase
  Display    Display
```

---

## CSS Classes Reference

### For Developers

```html
<tr class="students__preview-row" data-student-index="0">
    ↓ Each row
    
  <td class="students__preview-cell students__preview-cell--editable">
      ↓ Editable cell
      
    <input type="text" 
           class="students__preview-input" 
           value="John" />
           ↓ Input field
  </td>

  <td class="students__preview-cell students__preview-cell--readonly">
      ↓ Read-only cell (no input)
      Visual
  </td>

  <td class="students__preview-delete">
      ↓ Delete button cell
      
    <button class="students__preview-delete-btn">×</button>
            ↓ Delete button
  </td>
</tr>
```

### For Styling

```scss
.students__preview-row {
  // Hover effect on entire row
  &:hover { background: light-gray; }
}

.students__preview-input {
  // Editable input fields
  &:focus { border-color: blue; box-shadow: blue-glow; }
  &:hover { background: light-gray; }
}

.students__preview-delete-btn {
  // Delete button
  color: red;
  &:hover { background: light-red; color: dark-red; }
  &:focus { box-shadow: red-glow; }
}
```

---

## Accessibility Features

### Keyboard Navigation
```
Tab      → Move to next editable cell
Shift+Tab → Move to previous editable cell
Enter    → Save current cell & move down
Escape   → Cancel editing, revert to original
Space    → Activate delete button
```

### Screen Reader Labels
```
✓ Row announces as table row with index
✓ Cells announce as table cells with content
✓ Delete button announces as "Delete, button"
✓ Input fields have data type (text input)
✓ Focus states clearly announced
```

### Visual Indicators
```
✓ Blue focus ring on inputs
✓ Red focus ring on delete button
✓ Hover state background color
✓ Cursor changes (pointer on hover)
✓ Success/error messages clear
```

---

## Color Reference

| Element | Default | Hover | Focus | State |
|---------|---------|-------|-------|-------|
| **Input** | Black text, transparent | Light gray BG | Blue border + glow | Default |
| **Input** | input value | input value | Blue border + glow | Focused |
| **Delete btn** | Red (#EF4444) | Dark red (#DC2626) | Red border + glow | Default |
| **Row** | White BG | Light gray (#F3F4F6) | - | Hover |
| **Read-only** | Gray text | Gray text | - | Can't edit |

---

## What NOT to Edit

These columns are **read-only** (no editing):

```
┌──────────────────┬────────────────────────┐
│ Column           │ Why Read-Only?         │
├──────────────────┼────────────────────────┤
│ Learning style   │ Calculated from survey │
│ Assessment score │ Calculated from tests  │
└──────────────────┴────────────────────────┘

If you need to change them:
1. Delete the student
2. Re-upload with corrected values
```

---

**This interactive table is production-ready! 🚀**
