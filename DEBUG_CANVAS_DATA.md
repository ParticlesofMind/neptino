# Canvas Data Structure Debug Guide

## Expected Data Structure

Your `canvas_data` JSONB column should have this structure:

```json
{
  "version": "1.0",
  "engine": "pixi",
  "template": { /* template configuration */ },
  "lesson": {
    "number": 1,
    "title": "Introduction to Math",
    "moduleNumber": 1
  },
  "margins": {
    "top": 96,
    "right": 96,
    "bottom": 96,
    "left": 96,
    "unit": "px"
  },
  "dimensions": {
    "width": 1200,
    "height": 1800
  },
  "layout": {
    "id": "root",
    "type": "container",
    "yoga": { /* Yoga layout config */ },
    "children": [
      {
        "id": "header",
        "role": "header",
        "type": "section",
        "children": [ /* header content */ ]
      },
      {
        "id": "body",
        "role": "body",
        "type": "section",
        "children": [ /* body content */ ]
      },
      {
        "id": "footer",
        "role": "footer",
        "type": "section",
        "children": [ /* footer content */ ]
      }
    ]
  }
}
```

## Step 1: Check Database Connection

Open browser console at `http://localhost:3000` and run:

```javascript
// Check if Supabase is connected
const { supabase } = await import('./src/scripts/backend/supabase.js');
const { data, error } = await supabase.from('canvases').select('count');
console.log('Canvas count:', data, error);
```

## Step 2: Check Canvas Data

Run this SQL query in Supabase Studio or psql:

```sql
-- Check canvas_data structure
SELECT 
  id,
  course_id,
  lesson_number,
  canvas_index,
  CASE 
    WHEN canvas_data IS NULL THEN 'NULL'
    WHEN canvas_data::text = '{}' THEN 'EMPTY_OBJECT'
    WHEN canvas_data ? 'layout' THEN 'HAS_LAYOUT'
    ELSE 'NO_LAYOUT'
  END as data_status,
  jsonb_pretty(canvas_data) as data_preview
FROM canvases
ORDER BY lesson_number, canvas_index
LIMIT 5;
```

## Step 3: Check Console Logs

When scrolling, look for these messages in browser console:

### ✅ Success Messages:
```
🎨 SharedCanvasEngine: Registering canvas "canvas-id"
✅ SharedCanvasEngine: Canvas "canvas-id" registered with layers
🎨 Rendering template for canvas "canvas-id"
✅ Template rendered for canvas "canvas-id"
👁️ SharedCanvasEngine: Canvas "canvas-id" is now visible
```

### ⚠️ Warning Messages:
```
⚠️ Canvas data missing for canvas-id
⚠️ No templateLayoutManager for canvas canvas-id
⚠️ Failed to load canvas data for canvas-id
⚠️ Non-standard dimensions: [width]x[height] (expected 1200x1800)
```

## Step 4: Common Issues & Solutions

### Issue 1: Canvas Data is NULL
**Symptoms:** 
- Warning: "Canvas data missing for canvas-id"
- Empty placeholders never render content

**Solution:**
```sql
-- Insert sample canvas data
INSERT INTO canvases (course_id, lesson_number, canvas_index, canvas_data)
VALUES (
  'your-course-id',
  1,
  1,
  '{
    "version": "1.0",
    "engine": "pixi",
    "lesson": {"number": 1, "title": "Test Lesson"},
    "margins": {"top": 96, "right": 96, "bottom": 96, "left": 96},
    "dimensions": {"width": 1200, "height": 1800},
    "layout": {
      "id": "root",
      "type": "container",
      "children": []
    }
  }'::jsonb
);
```

### Issue 2: Missing Layout Node
**Symptoms:**
- Canvas loads but nothing renders
- No errors in console

**Solution:**
```sql
-- Update canvas_data to include layout
UPDATE canvases 
SET canvas_data = jsonb_set(
  canvas_data,
  '{layout}',
  '{
    "id": "root",
    "type": "container",
    "children": [
      {
        "id": "header",
        "role": "header",
        "type": "section",
        "children": []
      }
    ]
  }'::jsonb
)
WHERE canvas_data ? 'layout' = false;
```

### Issue 3: Canvas Never Becomes Visible
**Symptoms:**
- Registered but never shows "is now visible" message
- Placeholder visible but no PixiJS content

**Check:**
1. Is the placeholder in the DOM? Check: `document.querySelector('[data-canvas-id="your-id"]')`
2. Is it in viewport? Scroll to it manually
3. Check placeholder dimensions: Should be 1200x1800 at 100% zoom

## Step 5: Manual Test

In browser console:

```javascript
// Get the container
const container = window.verticalCanvasContainer;

// Check canvas applications
console.log('Total canvases:', container.getCanvasCount());
console.log('Loaded canvases:', container.getLoadedCanvasIds());
console.log('Active canvas:', container.getActiveCanvas());

// Force load a specific canvas
await container.lazyLoadCanvas('canvas-id-here');

// Check debug info
console.log(container.getDebugInfo());
```

## Step 6: Verify Template Rendering

```javascript
// Get active canvas
const active = window.verticalCanvasContainer.getActiveCanvas();

// Check layers
console.log('Layers:', active.layers?.getLayerInfo());

// Check template manager
console.log('Template Manager:', active.templateLayoutManager);

// Check canvas row data
console.log('Canvas Data:', active.canvasRow.canvas_data);
```

## Expected Behavior

1. **On page load:** Placeholders render as invisible divs
2. **On scroll:** When placeholder enters viewport (200px buffer):
   - IntersectionObserver triggers
   - `lazyLoadCanvas()` called
   - Virtual canvas registered
   - `canvas_data` fetched from Supabase
   - Template rendered to PixiJS layers
   - Content becomes visible

3. **Visual result:** Each canvas shows:
   - Header section (if defined in layout)
   - Body content (if defined in layout)
   - Footer section (if defined in layout)
   - Dynamic metadata (teacher, course, page number)

## Need Help?

If canvases are still not populating:

1. Run the SQL query above to check data status
2. Check browser console for error messages
3. Verify Supabase connection
4. Check that course_id matches between canvases and courses tables
5. Verify RLS policies allow reading canvas_data
