# Template Placement Feature Implementation

## Overview
Enhanced the curriculum configuration interface to allow users to place created templates (certificates, assessments, etc.) at specific points in the course structure.

## Changes Made

### 1. HTML Structure (`src/pages/teacher/coursebuilder.html`)
- Added a new "Template Placement" section inside the curriculum `article__config`
- Created container `#curriculum-template-placement-list` for template placement cards
- Added descriptive heading and help text

### 2. SCSS Styling (`src/scss/layout/_coursebuilder.scss`)

#### New Section Styling
- `.curriculum-config__section-title` - Heading for template placement section
- `.curriculum-config__group--templates` - Container with top border separation

#### Enhanced Template Block Display
- Updated `.template-block` with:
  - Larger padding and borders (more prominent)
  - Left accent stripe using `::before` pseudo-element
  - Hover effects for interactivity
  - Shadow and rounded corners
  - Better visual hierarchy with color usage

- Context-specific styles:
  - `.template-block--module` - Module-level placement
  - `.template-block--lesson` - Lesson-level placement (with left indent)
  - `.template-block--course` - Course-end placement (gradient background, thicker border)
  - `.template-block--missing` - Striped pattern for missing templates

#### Enhanced Template Placement Cards
- Updated `.template-placement-card` with:
  - Left accent stripe matching template blocks
  - Thicker borders (2px instead of 1px)
  - Hover shadow effect
  - Better visual consistency

#### Color Palette Enhancement
- Made accent colors more vibrant and distinct:
  - **Sky** (Blue) - `#38bdf8` border, `#e0f2fe` surface
  - **Violet** (Purple) - `#c084fc` border, `#ede9fe` surface
  - **Amber** (Orange/Yellow) - `#fbbf24` border, `#fef3c7` surface
  - **Teal** (Green) - `#2dd4bf` border, `#ccfbf1` surface
  - **Rose** (Pink/Red) - `#fb7185` border, `#ffe4e6` surface
  - **Slate** (Gray) - `#94a3b8` border, `#e2e8f0` surface

- Applied accent colors to both:
  - Template blocks (in curriculum preview)
  - Template placement cards (in configuration panel)

## How It Works

### User Workflow
1. User creates templates (certificates, assessments, etc.) in the Templates section
2. Navigates to Curriculum → Configure Curriculum
3. Scrolls to "Template Placement" section at the bottom of the config panel
4. For each template, user can choose:
   - **No automatic placement** - Template not automatically inserted
   - **End of each module** - Template appears after every module
   - **Specific modules** - User selects which modules get the template
   - **Specific lessons** - User selects which lessons get the template
   - **End of course** - Template appears at the very end

### Visual Representation
- Each template gets a unique color from the accent palette (6 colors cycle)
- Template blocks appear in the curriculum preview as colored cards
- Color scheme persists between placement cards and preview blocks
- Different contexts have visual variations:
  - Module placement: Standard left border
  - Lesson placement: Indented with left border
  - Course placement: Thicker border with gradient background
  - Missing templates: Dashed border with diagonal stripes

## Technical Details

### Color Assignment
- Uses hash-based algorithm in `resolveTemplateAccentClass()` 
- Ensures same template always gets same color
- 6-color palette cycles based on template ID

### Data Structure
```typescript
interface TemplatePlacementConfig {
  templateId: string;
  templateSlug: string;
  templateName: string;
  placementType: "end-of-each-module" | "specific-modules" | "specific-lessons" | "end-of-course";
  moduleNumbers?: number[];  // For specific-modules
  lessonNumbers?: number[];  // For specific-lessons
}
```

### Rendering Logic
- `renderTemplatePlacementUI()` - Generates placement cards in config panel
- `renderTemplateBlock()` - Generates colored blocks in preview
- Blocks inserted at appropriate positions based on placement configuration
- Real-time preview updates as user changes placement settings

## Benefits

1. **Visual Clarity**: Distinct colors make templates easy to identify in curriculum
2. **Flexible Placement**: Multiple options for where templates appear
3. **Module/Lesson Awareness**: Can target specific course segments
4. **Real-time Preview**: See exactly where templates will appear
5. **Scalable**: Supports unlimited templates with cycling color palette

## Future Enhancements
- Drag-and-drop reordering of template blocks
- Template preview on hover
- Bulk placement actions
- Template categories/tags
- Custom color assignment per template
