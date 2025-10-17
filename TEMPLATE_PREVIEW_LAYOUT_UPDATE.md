# Template Preview Layout Update

## Changes Made

### 1. **Reduced Configuration Panel Width**
**File**: `src/scss/layout/_article.scss`

Changed the grid template columns ratio for `.article__main--panels`:
- **Before**: `grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);` (equal split)
- **After**: `grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);` (narrower config, wider preview)

This reduces the template configuration panel width to 40% while expanding the preview to 60%.

### 2. **Converted Checkbox Layout to Vertical Rows**
**File**: `src/scss/components/_templates.scss`

Updated `.block-config__row` styling:
- **Before**: `display: flex; flex-wrap: wrap; gap: var(--spacing-2) var(--spacing-4);` (horizontal wrap)
- **After**: `display: flex; flex-direction: column; gap: var(--spacing-1);` (vertical stack)

Now checkboxes stack vertically in rows instead of wrapping horizontally, reducing vertical space usage.

### 3. **Template Preview as Canvas/Sheet**
**File**: `src/scss/components/_templates.scss` + `src/scripts/backend/courses/templates/createTemplate.ts`

#### SCSS Changes:
- Added `.template-canvas-sheet` class: Paper-like container with white background, shadow, and fixed height
- Added `.template-canvas-content`: Scrollable middle section for content blocks
- Header block pinned at top with visual separation
- Footer block pinned at bottom with visual separation
- Added `.curriculum__preview` and `.template-preview` grid background effect
- Content blocks scroll independently

#### TypeScript Changes:
Modified `updateTemplatePreview()` method in `createTemplate.ts`:
- Separates blocks into header, footer, and content sections
- Renders header at the top (pinned)
- Renders content blocks in a scrollable middle section
- Renders footer at the bottom (pinned)
- Wraps everything in `.template-canvas-sheet` container

## Visual Result

The template preview now looks like:
```
┌─────────────────────────────────────┐
│ Header Block (Pinned Top)           │  ← Fixed position
├─────────────────────────────────────┤
│ Program Block                       │
│ Resources Block                     │  ← Scrollable content
│ Content Block                       │     area
│ Assignment Block                    │
├─────────────────────────────────────┤
│ Footer Block (Pinned Bottom)        │  ← Fixed position
└─────────────────────────────────────┘
```

## Benefits

1. **Better Space Utilization**: Narrower config panel reduces clutter
2. **Easier Configuration**: Vertical checkbox layout is cleaner and easier to scan
3. **Professional Preview**: Canvas-style layout resembles actual lesson output
4. **Clear Structure**: Header/footer pinned provides visual hierarchy
5. **Scrollable Content**: Long templates don't overwhelm the preview area

## Files Modified

1. `/Users/benjaminjacklaubacher/Neptino/src/scss/layout/_article.scss`
2. `/Users/benjaminjacklaubacher/Neptino/src/scss/components/_templates.scss`
3. `/Users/benjaminjacklaubacher/Neptino/src/scripts/backend/courses/templates/createTemplate.ts`

## Responsive Behavior

- **Desktop (64rem+)**: Config panel 40% width, preview 60% width
- **Mobile (<64rem)**: Single column layout maintained
- Canvas preview scales appropriately on smaller screens
