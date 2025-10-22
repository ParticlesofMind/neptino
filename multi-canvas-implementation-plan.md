# Multi-Canvas Virtual Pages Implementation Plan

## Overview
Implement a multi-canvas system where each lesson canvas is stored as a separate database row but rendered as virtual pages in a single PixiJS application. Users can navigate between canvases like flipping pages in a book.

## Database Structure (Already Exists)
```sql
canvases table:
- id: Unique canvas identifier
- course_id: Links all canvases to the same course  
- lesson_number: Which lesson this canvas belongs to
- canvas_index: The order/position (1, 2, 3...)
- canvas_data: The full PixiJS layout structure (JSONB)
- canvas_metadata: Quick reference data (title, template, dimensions)
```

## Architecture Decisions
- **Single PixiJS Application**: One application instance for all canvases
- **Multiple Containers**: One container per canvas row (virtual pages)
- **Visibility Management**: Only one container visible at a time
- **Navigation System**: Page flipping between canvases
- **Header/Footer Population**: Dynamic content based on canvas metadata

## Implementation Steps

### 1. Create MultiCanvasManager Class
**File**: `src/scripts/coursebuilder/canvas/MultiCanvasManager.ts` (new)

Responsibilities:
- Fetch all canvas rows from Supabase for a course
- Create PixiJS containers for each canvas
- Manage visibility switching between canvases
- Handle navigation (next/previous page)
- Populate header/footer with dynamic content

Key methods:
```typescript
- async loadCourseCanvases(courseId: string): Promise<void>
- createCanvasContainer(canvasRow: CanvasRow): Container
- showCanvas(canvasIndex: number): void
- hideAllCanvases(): void
- navigateToNext(): void
- navigateToPrevious(): void
- populateHeaderFooter(canvasMetadata: any): void
```

### 2. Update CanvasAPI for Multi-Canvas Support
**File**: `src/scripts/coursebuilder/canvas/CanvasAPI.ts`

- Add MultiCanvasManager integration
- Modify initialization to support multiple canvases
- Add navigation methods
- Update template layout to work with multiple canvas containers

### 3. Create Canvas Navigation UI
**File**: `src/scripts/coursebuilder/ui/CanvasNavigation.ts` (new)

- Page navigation controls (previous/next buttons)
- Page counter display (e.g., "Page 3 of 12")
- Canvas thumbnail preview
- Quick jump to specific canvas

### 4. Implement Dynamic Header/Footer Content
**File**: `src/scripts/coursebuilder/canvas/TemplateLayoutManager.ts`

- Add methods to populate header with:
  - Page number (canvas_index)
  - Course title
  - Lesson number
- Add methods to populate footer with:
  - Teacher name
  - Creation date
  - Course information

### 5. Database Integration
**File**: `src/scripts/coursebuilder/canvas/CanvasDataManager.ts` (new)

- Fetch canvas rows from Supabase
- Parse canvas_data JSONB into PixiJS structure
- Save canvas changes back to database
- Handle canvas creation/deletion

### 6. Canvas State Management
**File**: `src/scripts/coursebuilder/canvas/CanvasStateManager.ts` (new)

- Track current active canvas
- Manage canvas loading states
- Handle unsaved changes
- Coordinate between multiple canvas instances

## Technical Implementation Details

### Multi-Canvas Container Structure
```
PixiJS Application
├── Background Layer (shared)
├── Layout Layer (shared)
│   ├── Canvas Container 1 (lesson 1, page 1) [VISIBLE]
│   ├── Canvas Container 2 (lesson 1, page 2) [HIDDEN]
│   ├── Canvas Container 3 (lesson 2, page 1) [HIDDEN]
│   └── ...
├── Drawing Layer (per canvas)
└── UI Layer (shared)
    ├── Navigation Controls
    └── Page Counter
```

### Header/Footer Content Population
```typescript
// Header content
- Page Number: `canvas_index` from database
- Course Title: from course metadata
- Lesson Number: `lesson_number` from database

// Footer content  
- Teacher Name: from user profile
- Creation Date: from canvas metadata
- Course Code: from course metadata
```

### Navigation Flow
1. User clicks "Next Page" → Hide current canvas → Show next canvas
2. Update header/footer content for new canvas
3. Update navigation UI (page counter, thumbnails)
4. Save any unsaved changes from previous canvas

### Canvas Data Structure
```typescript
interface CanvasRow {
  id: string;
  course_id: string;
  lesson_number: number;
  canvas_index: number;
  canvas_data: {
    layout: YogaLayoutStructure;
    content: PixiJSObjects[];
    metadata: CanvasMetadata;
  };
  canvas_metadata: {
    title: string;
    template: string;
    dimensions: { width: number; height: number };
    created_at: string;
    updated_at: string;
  };
}
```

## Files to Create
1. `src/scripts/coursebuilder/canvas/MultiCanvasManager.ts`
2. `src/scripts/coursebuilder/canvas/CanvasDataManager.ts`
3. `src/scripts/coursebuilder/canvas/CanvasStateManager.ts`
4. `src/scripts/coursebuilder/ui/CanvasNavigation.ts`

## Files to Modify
1. `src/scripts/coursebuilder/canvas/CanvasAPI.ts`
2. `src/scripts/coursebuilder/canvas/TemplateLayoutManager.ts`
3. `src/scripts/coursebuilder/canvasInit.ts`

## Success Criteria
- Multiple canvases load from database
- Navigation between canvases works smoothly
- Header shows correct page number and course info
- Footer shows teacher name and creation date
- Only one canvas visible at a time
- Canvas changes save to correct database row
- Navigation UI shows current page and total pages

## Implementation Priority
1. **MultiCanvasManager** - Core multi-canvas functionality
2. **CanvasDataManager** - Database integration
3. **Header/Footer Population** - Dynamic content
4. **Navigation UI** - User interface
5. **Canvas State Management** - Advanced features


