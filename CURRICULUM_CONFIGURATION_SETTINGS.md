# Curriculum Configuration Settings Implementation

This document describes the three configuration settings implemented in the curriculum section of the course builder.

## Overview

The curriculum section now includes three comprehensive configuration settings that guide how course structure and templates are applied:

1. **Setting #1: Module Organization** - Controls how lessons are grouped into modules
2. **Setting #2: Content Volume** - Defines lesson duration and content depth
3. **Setting #3: Course Type** - Determines which templates are automatically available

---

## Setting #1: Module Organization

### Purpose
Defines how lessons are structured and grouped into modules within the course.

### Options

#### Linear (No modules)
- **Description**: All lessons appear in a single list with no module grouping
- **Use case**: Simple, short courses or tutorials
- **UI behavior**: Module controls hidden in preview

#### Equal Modules
- **Description**: Lessons are automatically distributed into equal-sized modules
- **Use case**: Balanced course structure with consistent pacing
- **UI behavior**: System calculates optimal module distribution

#### Custom
- **Description**: Instructor defines custom module boundaries
- **Features**:
  - Scrollable list of module rows
  - Each row shows "Module N" followed by "Lesson 1 → [input]"
  - Input field accepts last lesson number for that module
  - Add/remove module buttons for flexibility
  - Supports long courses without cluttering interface
- **Use case**: Complex courses requiring specific lesson groupings

### Implementation Details
- **HTML**: Module organization dropdown with custom module configuration panel
- **TypeScript**: 
  - `renderCustomModuleRows()` - Generates dynamic module input rows
  - `addCustomModule()` - Adds new module boundary
  - `removeCustomModule()` - Removes module (except first)
  - `updateCustomModulesFromInputs()` - Rebuilds module structure from inputs
- **Storage**: Module structure saved in `curriculum_data` field

---

## Setting #2: Content Volume

### Purpose
Defines the duration and depth of a standard lesson, controlling content density.

### Table Structure

| Option    | Duration Range | Description |
|-----------|----------------|-------------|
| Mini      | ≤ 30 min      | Short session with 1–2 topics and light tasks |
| Standard  | ≤ 60 min      | Normal lesson with balanced topics and tasks |
| Extended  | ≤ 120 min     | Double-length lesson with more practice and discussion |
| Intensive | ≤ 180 min     | Long block for deeper coverage or projects |
| Full Day  | > 180 min     | Workshop-style session with multiple breaks or modules |

### Additional Numeric Fields

These fields allow fine-tuning of lesson structure:
- **Topics per lesson** (1-10)
- **Objectives per topic** (1-5)
- **Tasks per objective** (1-5)

### Implementation Details
- **HTML**: Radio button table with structured layout
- **CSS**: 
  - Grid-based table layout with hover effects
  - Selected row highlights with primary color
  - Responsive design for mobile
- **TypeScript**: 
  - `handleDurationSelection()` - Updates preset values
  - `setDurationRadioState()` - Syncs UI with state
  - Auto-selects recommended duration based on schedule
- **Behavior**: 
  - Real-time curriculum regeneration when values change
  - Debounced save (500ms) to prevent excessive updates

---

## Setting #3: Course Type

### Purpose
Defines which templates are automatically available and applied within the course.

### Options

#### Minimalist Course
**Description**: Core instructional templates only  
**Templates**:
- Lesson
- Quiz

**Use case**: Basic courses focusing only on instruction and assessment

#### Essential Course (Default)
**Description**: All Minimalist templates plus evaluation and certification  
**Templates**:
- Lesson
- Quiz
- Feedback
- Assessment
- Certificate

**Use case**: Professional courses requiring comprehensive evaluation

#### Complete Course
**Description**: Every available template included  
**Templates**:
- Lesson
- Quiz
- Feedback
- Assessment
- Report
- Review
- Project
- Module Orientation
- Course Orientation
- Certificate

**Use case**: Full-featured courses with maximum flexibility

#### Custom Course
**Description**: Manually select any combination of templates  
**Feature**: Configure template placements below using the Template Placement section

**Use case**: Courses requiring specific template combinations

### Implementation Details
- **HTML**: Radio button cards with visual template lists
- **CSS**: 
  - Card-based layout with hover effects
  - Selected state with border highlighting
  - Template tags displayed as small badges
- **Integration**: Works with existing Template Placement system
- **Future Enhancement**: Auto-configure template placements based on course type selection

---

## Template Placement Rules

### User's Template Library
- Templates come from the user's own `#templates` library
- User must select which specific template to apply (e.g., "Lesson A," "Lesson B")

### Placement Options
Templates can be assigned to:
1. **Specific lessons** - e.g., Module 1 Lessons 1–3 use Template A
2. **Specific modules** - e.g., End of Module 2 and Module 4
3. **End of each module** - Applied automatically after every module
4. **End of course** - Single placement at course completion
5. **No automatic placement** - Manual placement only

### Storage Format
Each placement record in `templatePlacements` array includes:
```typescript
{
  templateId: string;
  templateName: string;
  placementType: "specific-lessons" | "specific-modules" | "end-of-each-module" | "end-of-course";
  lessonNumbers?: number[];  // For specific-lessons
  moduleNumbers?: number[];  // For specific-modules
}
```

---

## Preview Behavior

The curriculum preview (`article__preview`) dynamically reflects all three settings:

### Module Organization
- Shows flat list for Linear
- Groups lessons into modules for Equal and Custom
- Updates module boundaries in real-time

### Content Volume
- Displays correct number of topics per lesson
- Shows objectives and tasks according to structure
- Reflects changes immediately

### Template Placements
- Renders template blocks at appropriate positions
- Shows template badges on lessons
- Indicates which template applies to each lesson/module
- Updates instantly as placements change

---

## User Interface Design Principles

### Compact & Responsive
- Settings organized in collapsible groups
- Scrollable custom module list prevents overflow
- Mobile-friendly table collapses to essential columns

### Clear & Descriptive
- Each option includes explanatory text
- Help text updates dynamically based on selection
- Visual feedback for active selections

### Instant Feedback
- Preview updates immediately upon changes
- No "save" button needed for most interactions
- Debounced saves prevent performance issues

---

## Technical Architecture

### Data Flow
1. User changes setting → Event handler triggered
2. State updated in CurriculumManager
3. Preview re-rendered
4. Database updated (debounced)
5. UI synced with new state

### Key Methods

#### Module Organization
- `setModuleOrganization()` - Changes organization type
- `syncModuleOrganizationUI()` - Updates UI to match state
- `organizeLessonsIntoModules()` - Transforms flat lesson list
- `extractLessonsFromModules()` - Flattens module structure

#### Content Volume
- `handleDurationSelection()` - Processes preset selection
- `handleInputChange()` - Updates from manual input
- `regenerateAndSaveCurriculum()` - Rebuilds lesson structure

#### Template Placement
- `renderTemplatePlacementUI()` - Generates placement cards
- `handleTemplatePlacementInputChange()` - Processes user selections
- `getTemplatePlacementsFor[Module|Lesson|CourseEnd]()` - Retrieval helpers

### Database Schema
All configuration stored in `courses.curriculum_data` as JSONB:
```json
{
  "structure": {
    "durationType": "single",
    "topicsPerLesson": 2,
    "objectivesPerTopic": 2,
    "tasksPerObjective": 2
  },
  "moduleOrganization": "custom",
  "modules": [...],
  "lessons": [...],
  "templatePlacements": [...]
}
```

---

## Files Modified

### HTML
- `/src/pages/teacher/coursebuilder.html` - Added new UI sections

### CSS
- `/src/scss/layout/_coursebuilder.scss` - Styling for all three settings

### TypeScript
- `/src/scripts/backend/courses/curriculum/curriculumManager.ts` - Core logic

---

## Future Enhancements

1. **Auto-Template Assignment**: Automatically configure template placements based on Course Type selection
2. **Module Templates**: Allow different lesson templates per module
3. **Smart Duration Recommendations**: AI-based suggestions based on course content
4. **Bulk Module Operations**: Copy/paste module structures between courses
5. **Visual Module Editor**: Drag-and-drop interface for lesson organization
6. **Template Conflict Detection**: Warn when multiple templates overlap
7. **Import/Export Configurations**: Save and reuse configuration presets

---

## Usage Guide

### For Instructors

1. **Choose Module Organization**
   - Start with Linear for simple courses
   - Use Equal for balanced structure
   - Select Custom for precise control

2. **Set Content Volume**
   - Match to your actual lesson duration
   - Adjust topics/objectives/tasks as needed
   - Preview updates automatically

3. **Select Course Type**
   - Minimalist: Teaching-focused
   - Essential: Add certification
   - Complete: Full feature set
   - Custom: Manual control

4. **Configure Template Placements**
   - Assign templates to specific lessons
   - Set module-end templates
   - Define course completion templates

### Best Practices

- **Module Organization**: Match to natural content divisions
- **Content Volume**: Less is often more - avoid overwhelming students
- **Template Placement**: Be strategic - too many templates disrupts flow
- **Preview Often**: Check how changes affect the course structure

---

## Testing Recommendations

1. **Module Organization**
   - Test with 5, 15, 30 lessons
   - Verify custom module boundaries work correctly
   - Check preview mode switching

2. **Content Volume**
   - Test all five duration presets
   - Verify manual input changes regenerate curriculum
   - Check boundary values (min/max inputs)

3. **Template Placement**
   - Test all placement types
   - Verify templates appear in preview
   - Check removal of templates from library

4. **Integration**
   - Test all three settings together
   - Verify database persistence
   - Check curriculum regeneration

---

*Last Updated: October 14, 2025*
