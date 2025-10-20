# Multi-Canvas Implementation Guide

## Current State: Single Canvas Problem

### What's Happening Now
You currently have **ONE PIXI canvas** that gets initialized in `canvasInit.ts`:

```typescript
// src/scripts/coursebuilder/canvasInit.ts (line 71)
canvasAPI = new CanvasAPI('#canvas-container');
await canvasAPI.init({ width: 1200, height: 1800 });
```

This single canvas is mounted to the HTML element:
```html
<!-- coursebuilder.html line 1737 -->
<div class="engine__canvas canvas canvas--grid" id="canvas-container">
  <!-- Single canvas gets inserted here -->
</div>
```

### The Database Has Multiple Canvases
Your Supabase `canvases` table **already has the data structure** for multiple canvases:

```sql
-- Each lesson has its own canvas record
CREATE TABLE canvases (
  id UUID PRIMARY KEY,
  course_id UUID NOT NULL,
  lesson_number INTEGER NOT NULL,  -- 1 to 75
  canvas_index INTEGER NOT NULL DEFAULT 1,
  canvas_data JSONB,  -- The PIXI scene data you showed
  canvas_metadata JSONB
);
```

The `ensureLessonCanvases()` function in `curriculumManager.ts` (line 3790) **already creates one canvas per session**:
- If you have 75 scheduled sessions, it creates 75 rows in the `canvases` table
- Each row has `canvas_data` with the PIXI/Yoga layout you showed

---

## Solution: Vertical Stack of Canvases

You need to transform from **1 canvas** to **N canvases stacked vertically**, where N = number of scheduled sessions.

### Architecture Changes Required

#### 1. **HTML Structure Change** (`coursebuilder.html`)
Instead of one container, you need a scrollable container with multiple canvas instances:

```html
<div class="engine__canvas-scroll-container">
  <!-- Multiple canvases will be generated here -->
  <div class="canvas-wrapper" data-lesson="1" id="canvas-container-1">
    <!-- Canvas 1 for Lesson 1 -->
  </div>
  <div class="canvas-wrapper" data-lesson="2" id="canvas-container-2">
    <!-- Canvas 2 for Lesson 2 -->
  </div>
  <!-- ... 75 total canvases -->
</div>
```

#### 2. **Canvas Initialization** (`canvasInit.ts`)
Change from creating ONE CanvasAPI to creating MULTIPLE:

**Current (WRONG):**
```typescript
canvasAPI = new CanvasAPI('#canvas-container');
```

**New (CORRECT):**
```typescript
// Load all canvases for this course
const { data: canvasRecords } = await supabase
  .from('canvases')
  .select('*')
  .eq('course_id', courseId)
  .order('lesson_number', { ascending: true });

// Create one CanvasAPI per lesson
const canvasAPIs = [];
for (const record of canvasRecords) {
  const containerId = `#canvas-container-${record.lesson_number}`;
  const api = new CanvasAPI(containerId);
  
  await api.init({
    width: record.canvas_data.dimensions.width || 1200,
    height: record.canvas_data.dimensions.height || 1800,
    backgroundColor: 0xffffff
  });
  
  // Load the saved canvas data
  await api.loadCanvasData(record.canvas_data);
  
  canvasAPIs.push({
    lessonNumber: record.lesson_number,
    api: api,
    canvasId: record.id
  });
}

// Store all canvas instances globally
window.canvasAPIs = canvasAPIs;
```

#### 3. **CanvasAPI Enhancement**
Add a method to load canvas data from the database:

```typescript
// In src/scripts/coursebuilder/canvas/CanvasAPI.ts
export class CanvasAPI {
  // ... existing code ...
  
  /**
   * Load canvas data from database and reconstruct the scene
   */
  public async loadCanvasData(canvasData: any): Promise<void> {
    if (!this.isReady()) {
      throw new Error('Canvas not initialized');
    }
    
    // Parse the Yoga layout from canvas_data.layout
    if (canvasData.layout && canvasData.layout.children) {
      await this.reconstructLayoutFromYoga(canvasData.layout);
    }
    
    // Apply margins
    if (canvasData.margins) {
      canvasMarginManager.setMargins(canvasData.margins);
    }
    
    // Apply template data
    if (canvasData.template) {
      this.applyTemplateSettings(canvasData.template);
    }
  }
  
  private async reconstructLayoutFromYoga(layout: any): Promise<void> {
    // Recursively rebuild the PIXI scene from the Yoga layout
    // This is where you'd parse layout.children and create
    // the corresponding PIXI containers, text, graphics, etc.
  }
}
```

#### 4. **Navigation Panel Integration** (`CurriculumNavigationPanel.ts`)
Make each lesson item clickable to scroll to its canvas:

```typescript
private createLessonBlock(lesson: CurriculumLesson, ...): HTMLElement {
  const lessonCard = document.createElement("div");
  lessonCard.className = "navigation-content__item navigation-content__item--lesson";
  
  // Make it clickable
  lessonCard.style.cursor = 'pointer';
  lessonCard.addEventListener('click', () => {
    this.scrollToCanvas(lesson.lessonNumber);
  });
  
  // ... rest of existing code ...
}

private scrollToCanvas(lessonNumber: number): void {
  const targetCanvas = document.getElementById(`canvas-container-${lessonNumber}`);
  if (targetCanvas) {
    targetCanvas.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
    
    // Highlight active canvas
    document.querySelectorAll('.canvas-wrapper').forEach(el => {
      el.classList.remove('active');
    });
    targetCanvas.classList.add('active');
  }
}
```

#### 5. **CSS for Vertical Stacking** (new file: `canvasScroll.scss`)
```scss
.engine__canvas-scroll-container {
  height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  scroll-snap-type: y mandatory; // Optional: snap to each canvas
}

.canvas-wrapper {
  width: 100%;
  height: auto;
  margin-bottom: 2rem;
  scroll-snap-align: start; // Optional: snap alignment
  position: relative;
  
  &.active {
    outline: 3px solid var(--primary-color);
  }
  
  // Each canvas gets its height from canvas_data.dimensions
  canvas {
    display: block;
    margin: 0 auto;
  }
}
```

---

## Implementation Steps (In Order)

### Step 1: Create Canvas Container Generator
**File:** `src/scripts/coursebuilder/canvas/CanvasContainerGenerator.ts`

```typescript
export class CanvasContainerGenerator {
  static async generateContainersForCourse(courseId: string): Promise<void> {
    const { data: canvases } = await supabase
      .from('canvases')
      .select('*')
      .eq('course_id', courseId)
      .order('lesson_number', { ascending: true });
    
    const scrollContainer = document.querySelector('.engine__canvas-scroll-container');
    if (!scrollContainer) return;
    
    scrollContainer.innerHTML = ''; // Clear existing
    
    for (const canvas of canvases) {
      const wrapper = document.createElement('div');
      wrapper.className = 'canvas-wrapper';
      wrapper.id = `canvas-container-${canvas.lesson_number}`;
      wrapper.dataset.lesson = String(canvas.lesson_number);
      wrapper.dataset.canvasId = canvas.id;
      
      scrollContainer.appendChild(wrapper);
    }
  }
}
```

### Step 2: Modify HTML Structure
**File:** `src/pages/teacher/coursebuilder.html` (line ~1737)

Replace:
```html
<div class="engine__canvas canvas canvas--grid" id="canvas-container">
```

With:
```html
<div class="engine__canvas-scroll-container" id="canvas-scroll-container">
  <!-- Canvas wrappers generated by JavaScript -->
</div>
```

### Step 3: Update Canvas Initialization
**File:** `src/scripts/coursebuilder/canvasInit.ts`

Replace entire `initializeCanvas()` function with:
```typescript
export async function initializeCanvas(): Promise<void> {
  try {
    initializeCanvasSystem();
    
    const courseId = sessionStorage.getItem('currentCourseId');
    if (!courseId) {
      console.warn('No course ID found - cannot initialize canvases');
      return;
    }
    
    // Generate canvas containers from database
    await CanvasContainerGenerator.generateContainersForCourse(courseId);
    
    // Load all canvas records
    const { data: canvasRecords } = await supabase
      .from('canvases')
      .select('*')
      .eq('course_id', courseId)
      .order('lesson_number', { ascending: true });
    
    if (!canvasRecords || canvasRecords.length === 0) {
      console.warn('No canvases found for course');
      return;
    }
    
    // Initialize each canvas
    const canvasInstances = [];
    for (const record of canvasRecords) {
      const api = await initializeSingleCanvas(record);
      if (api) {
        canvasInstances.push({
          lessonNumber: record.lesson_number,
          canvasId: record.id,
          api: api
        });
      }
    }
    
    // Expose all canvas instances globally
    (window as any).canvasAPIs = canvasInstances;
    
    console.log(`✅ Initialized ${canvasInstances.length} canvases`);
    
  } catch (error) {
    console.error('❌ Canvas initialization failed:', error);
  }
}

async function initializeSingleCanvas(record: any): Promise<CanvasAPI | null> {
  const containerId = `#canvas-container-${record.lesson_number}`;
  const container = document.querySelector(containerId);
  
  if (!container) {
    console.warn(`Container ${containerId} not found`);
    return null;
  }
  
  const api = new CanvasAPI(containerId);
  
  const dims = record.canvas_data?.dimensions || { width: 1200, height: 1800 };
  await api.init({
    width: dims.width,
    height: dims.height,
    backgroundColor: 0xffffff
  });
  
  // Load saved canvas data
  if (record.canvas_data) {
    await api.loadCanvasData(record.canvas_data);
  }
  
  return api;
}
```

### Step 4: Add loadCanvasData Method
**File:** `src/scripts/coursebuilder/canvas/CanvasAPI.ts`

Add this method to the CanvasAPI class:
```typescript
/**
 * Load and reconstruct canvas from database JSON
 */
public async loadCanvasData(canvasData: any): Promise<void> {
  if (!this.isReady()) {
    throw new Error('Canvas not initialized - call init() first');
  }
  
  console.log('📦 Loading canvas data:', canvasData);
  
  // Apply margins
  if (canvasData.margins) {
    canvasMarginManager.setMargins({
      top: canvasData.margins.top,
      right: canvasData.margins.right,
      bottom: canvasData.margins.bottom,
      left: canvasData.margins.left,
      unit: canvasData.margins.unit || 'px'
    });
  }
  
  // Reconstruct layout
  if (canvasData.layout) {
    await this.reconstructLayout(canvasData.layout);
  }
}

private async reconstructLayout(layout: any): Promise<void> {
  // This is where you'd parse the Yoga layout structure
  // and rebuild the PIXI scene
  // For now, just log it
  console.log('📐 Layout to reconstruct:', layout);
  
  // TODO: Implement full Yoga layout reconstruction
  // You'll need to traverse layout.children and create
  // PIXI containers, text objects, graphics, etc.
}
```

### Step 5: Update Navigation to Scroll
**File:** `src/scripts/coursebuilder/ui/CurriculumNavigationPanel.ts`

Add click handlers to lesson items:
```typescript
private createLessonBlock(lesson: CurriculumLesson, lessonIndex: number, totalLessons: number): HTMLElement {
  const lessonCard = document.createElement("div");
  lessonCard.className = "navigation-content__item navigation-content__item--lesson";
  
  // Add click handler
  lessonCard.style.cursor = 'pointer';
  lessonCard.dataset.lessonNumber = String(lesson.lessonNumber || lessonIndex + 1);
  
  lessonCard.addEventListener('click', () => {
    const lessonNum = lesson.lessonNumber || lessonIndex + 1;
    this.scrollToCanvasForLesson(lessonNum);
  });
  
  // ... rest of existing code ...
  
  return lessonCard;
}

private scrollToCanvasForLesson(lessonNumber: number): void {
  const targetCanvas = document.getElementById(`canvas-container-${lessonNumber}`);
  if (targetCanvas) {
    targetCanvas.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start',
      inline: 'nearest'
    });
    
    // Highlight active canvas
    document.querySelectorAll('.canvas-wrapper').forEach(el => {
      el.classList.remove('active');
    });
    targetCanvas.classList.add('active');
    
    // Update active tool state for this canvas
    const canvasAPIs = (window as any).canvasAPIs;
    if (canvasAPIs) {
      const activeCanvas = canvasAPIs.find((c: any) => c.lessonNumber === lessonNumber);
      if (activeCanvas) {
        (window as any).activeCanvasAPI = activeCanvas.api;
      }
    }
  }
}
```

---

## Expected Result

After implementation, you'll have:

1. **75 canvases** (one per scheduled session) stacked vertically in a scrollable container
2. Each canvas loads its data from the `canvases` table
3. Clicking a lesson in the navigation panel scrolls to that canvas
4. Each canvas is independently editable with the PIXI tools
5. Canvas data saves back to the correct row in `canvases` table

---

## Key Files to Modify

| File | Change |
|------|--------|
| `coursebuilder.html` | Replace `#canvas-container` with scrollable container |
| `canvasInit.ts` | Load multiple canvases instead of one |
| `CanvasAPI.ts` | Add `loadCanvasData()` method |
| `CurriculumNavigationPanel.ts` | Add click-to-scroll handlers |
| `canvasScroll.scss` (new) | Styling for vertical canvas stack |
| `CanvasContainerGenerator.ts` (new) | Generate canvas wrappers |

---

## Testing Plan

1. **Verify canvas generation**: Check that 75 `<div class="canvas-wrapper">` elements are created
2. **Verify PIXI initialization**: All 75 canvases should have PIXI apps mounted
3. **Verify data loading**: Each canvas should display its `canvas_data` from Supabase
4. **Verify navigation**: Clicking lesson items should scroll to the correct canvas
5. **Verify tool interaction**: Drawing on canvas 1 should not affect canvas 2
6. **Verify saving**: Changes to canvas 42 should only update that row in `canvases` table

---

## Performance Considerations

**75 canvases = potential memory issues!**

### Optimization: Lazy Loading
Instead of initializing all 75 canvases at once:

1. **Only render visible canvases + buffer** (e.g., current canvas ± 2)
2. Use **Intersection Observer** to detect when user scrolls near a canvas
3. **Initialize canvas on-demand** when it enters the viewport
4. **Destroy off-screen canvases** to free memory

This is similar to how infinite scroll works - you'd need to add a `LazyCanvasManager` that handles this.

---

## Questions to Answer Before Implementation

1. **Do you want all 75 canvases loaded immediately?** (simple but memory-heavy)
   - OR lazy-load them as user scrolls? (complex but performant)

2. **Should navigation show ALL 75 lessons?** Or paginate/collapse modules?

3. **What happens when curriculum changes?** (e.g., adding lesson 76)
   - Need to regenerate containers and reinitialize canvases

4. **Should we support multiple canvases per lesson?** 
   - The database schema supports `canvas_index` (1, 2, 3...)
   - Currently we only use `canvas_index = 1`
