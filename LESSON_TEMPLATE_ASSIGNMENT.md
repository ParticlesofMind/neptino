# Lesson Template Assignment Feature

## Overview
This feature allows teachers to assign any template type (Lesson, Project, Assessment, Lab, Certificate, etc.) to individual scheduled sessions in their curriculum. This provides maximum flexibility in course design, where each session can use a different instructional format.

## Use Cases

### Example 1: Varied Instruction
- **Sessions 1-3**: Standard Lesson template (lecture + practice)
- **Session 4**: Lab Session template (hands-on activities)
- **Session 5**: Project template (independent work)
- **Session 6**: Assessment template (quiz/test)

### Example 2: Project-Based Course
- **Session 1**: Lesson template (introduction)
- **Sessions 2-5**: Project template (iterative development)
- **Session 6**: Presentation template (showcase)
- **Session 7**: Certificate template (completion)

## Implementation Details

### 1. Data Structure Changes

#### Updated Interface
```typescript
interface CurriculumLesson {
  lessonNumber: number;
  title: string;
  topics: CurriculumTopic[];
  moduleNumber?: number;
  templateId?: string; // NEW: Template assigned to this lesson/session
}
```

#### Database Storage
The `templateId` is stored in the `curriculum_data` JSONB field in the `courses` table:

```json
{
  "modules": [
    {
      "moduleNumber": 1,
      "title": "Module 1",
      "lessons": [
        {
          "lessonNumber": 1,
          "title": "Introduction",
          "templateId": "uuid-of-standard-lesson-template",
          "topics": [...]
        },
        {
          "lessonNumber": 2,
          "title": "Lab Day",
          "templateId": "uuid-of-lab-template",
          "topics": [...]
        }
      ]
    }
  ]
}
```

### 2. User Interface

#### Template Selector Location
The template selector appears inline in the curriculum preview, directly below each lesson title:

```
┌──────────────────────────────────────────┐
│ Lesson 1: Introduction to Programming    │
│ Template: [Standard Lesson ▼]  [Lesson] │ ← Dropdown + Badge
│ • Topic 1                                │
│ • Topic 2                                │
└──────────────────────────────────────────┘
```

#### Dropdown Features
- **Grouped by type**: Templates organized by type (Lesson, Project, Assessment, etc.)
- **"No Template" option**: Sessions can have no template assigned
- **Visual badge**: Shows template type with color coding
- **All preview modes**: Appears in all view modes (Titles, Topics, Objectives, Tasks, All, Modules)

### 3. Component Breakdown

#### `renderLessonTemplateSelector(lesson: CurriculumLesson)`
Generates the HTML for the template selector dropdown:
- Fetches available templates from `this.availableTemplates`
- Groups templates by type (using `<optgroup>`)
- Pre-selects current template if assigned
- Shows color-coded badge for assigned template
- Returns empty string if no templates available

#### `handleLessonTemplateChange(select: HTMLSelectElement)`
Event handler triggered when user changes template selection:
1. Extracts lesson number from `data-lesson-number` attribute
2. Gets selected template ID from dropdown value
3. Updates `lesson.templateId` in curriculum data
4. Re-renders preview to show updated badge
5. Auto-saves curriculum to database

#### Event Delegation
```typescript
this.curriculumPreviewSection.addEventListener('change', (event) => {
  const target = event.target as HTMLSelectElement;
  if (target.classList.contains('lesson__template-dropdown')) {
    this.handleLessonTemplateChange(target);
  }
});
```

### 4. Styling

#### Template Selector Container
```scss
.lesson__template-selector {
  display: flex;
  align-items: center;
  gap: var(--spacing-3);
  padding: var(--spacing-3);
  background: rgba(255, 255, 255, 0.6);
  border-radius: var(--radius-medium);
  border: 1px solid var(--color-neutral-200);
  margin-top: var(--spacing-2);
}
```

#### Template Badge
```scss
.lesson__template-badge {
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-full);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-medium);
  text-transform: capitalize;
  border: 1px solid var(--template-accent-border);
  background: var(--template-accent-surface);
  color: var(--template-accent-strong);
}
```

#### Color Coding
Uses the existing template accent palette (6 colors):
- **Sky** (Blue) - Lesson templates
- **Violet** (Purple) - Assessment templates
- **Amber** (Yellow/Orange) - Project templates
- **Teal** (Green) - Lab templates
- **Rose** (Pink/Red) - Certificate templates
- **Slate** (Gray) - Other templates

Colors are assigned via hash-based algorithm to ensure consistency.

### 5. Integration Points

#### Curriculum Preview Rendering
Template selector is rendered in 5 different preview modes:
1. **Modules mode**: Inside each lesson in module view
2. **Titles mode**: Below each lesson title
3. **Topics mode**: Between title and topics
4. **Objectives mode**: Between title and objectives
5. **Tasks mode**: Between title and tasks
6. **All mode**: Between title and metadata badges

#### Database Persistence
- Template ID is saved to `courses.curriculum_data` JSONB field
- Auto-saves on every template selection change
- Uses existing `saveCurriculumToDatabase()` method
- No additional database migrations required

### 6. Validation & Error Handling

#### Template Availability
- Returns empty string if no templates created yet
- Dropdown only appears when templates exist
- Gracefully handles deleted templates (shows ID until removed)

#### Lesson Lookup
- Validates lesson number from dropdown
- Logs error if lesson not found
- Prevents save if validation fails

#### Template ID Validation
- Accepts empty string for "No Template"
- Stores as `undefined` when no template selected
- Validates against available templates

## User Workflow

### Step-by-Step Usage
1. **Create Templates** (Templates section):
   - Create various template types (Lesson, Project, Lab, etc.)
   - Define structure and fields for each template

2. **Generate Curriculum** (Curriculum section):
   - Configure modules and lessons
   - Set topics, objectives, and tasks

3. **Assign Templates to Sessions**:
   - View curriculum preview (any mode)
   - For each lesson, select appropriate template from dropdown
   - See colored badge indicating template type
   - Change template anytime as needed

4. **Auto-Save**:
   - Changes save immediately to database
   - No manual save button required
   - Template assignments preserved across sessions

## Technical Notes

### Performance Considerations
- Template list is fetched once on initialization
- Dropdowns generated on-the-fly during preview render
- Event delegation used for efficient event handling
- No re-fetching on dropdown changes

### Accessibility
- Dropdown has proper `<label>` with label text
- Badge provides visual reinforcement
- Keyboard navigable
- Screen reader friendly

### Future Enhancements
- **Template preview**: Hover to see template structure
- **Bulk assignment**: Apply template to multiple lessons
- **Template recommendations**: Suggest templates based on lesson content
- **Template duplication**: Copy template from previous lesson
- **Template constraints**: Limit template types by module or course level
- **Template usage analytics**: Track which templates are most popular

## Differences from Template Placement

### Template Assignment (This Feature)
- **Purpose**: Define the structure/format of a lesson session
- **Scope**: Individual lessons
- **Types**: Any template type (Lesson, Project, Lab, Assessment, etc.)
- **Location**: Stored in lesson object
- **UI**: Dropdown selector in preview
- **Use Case**: "This session will follow the Lab template format"

### Template Placement (Existing Feature)
- **Purpose**: Insert additional content at specific points
- **Scope**: Between lessons, modules, or at course end
- **Types**: Typically Certificates, Assessments, Surveys
- **Location**: Separate placement configuration
- **UI**: Placement cards in config panel
- **Use Case**: "Insert certificate after each module"

### Combined Example
```
Module 1
├─ Lesson 1 [Standard Lesson template]
├─ Lesson 2 [Lab Session template]
├─ Lesson 3 [Standard Lesson template]
└─ [Certificate template placement] ← Automatic insertion
```

## Testing Checklist

- [ ] Template selector appears in all preview modes
- [ ] Dropdown is populated with all available templates
- [ ] Templates grouped by type in dropdown
- [ ] "No Template" option works correctly
- [ ] Badge shows correct color and template type
- [ ] Badge updates immediately on selection change
- [ ] Template ID saves to database correctly
- [ ] Template assignment persists after page reload
- [ ] Multiple lessons can have different templates
- [ ] Same template can be assigned to multiple lessons
- [ ] Dropdown works in module view and flat view
- [ ] Event delegation doesn't cause memory leaks
- [ ] Works with no templates (selector hidden)
- [ ] Works with deleted templates (graceful handling)

## Files Modified

### TypeScript
- `src/scripts/backend/courses/curriculum/curriculumManager.ts`
  - Updated `CurriculumLesson` interface
  - Added `renderLessonTemplateSelector()` method
  - Added `handleLessonTemplateChange()` event handler
  - Updated `renderCurriculumPreview()` in all modes
  - Added event delegation for template dropdowns

### SCSS
- `src/scss/layout/_coursebuilder.scss`
  - Added `.lesson__template-selector` styles
  - Added `.lesson__template-label` styles
  - Added `.lesson__template-dropdown` styles
  - Added `.lesson__template-badge` styles
  - Integrated with existing template accent color system

### Database
- No schema changes required
- Uses existing `curriculum_data` JSONB field
- Template ID stored as optional field in lesson objects

## Summary

This feature provides teachers with maximum flexibility in course design by allowing any template type to be assigned to any scheduled session. The inline dropdown interface makes template assignment quick and intuitive, while the color-coded badge system provides instant visual feedback about which templates are in use throughout the curriculum.
