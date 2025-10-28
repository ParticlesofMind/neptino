# Shared Canvas Rendering Fix

## Problem Summary
The shared PixiJS canvas was initializing correctly, placeholders were rendering, and data was loading successfully, but every lesson appeared blank. The underlying templates never became visible despite successful data fetches and placeholder removal.

## Root Cause
**Critical Issue: Mask Visibility**

In `SharedCanvasEngine.ts`, the mask Graphics object was created with `visible = false` and was never set to `true`. In PixiJS, when a Container uses masking, the mask must be visible for proper clipping to work. This caused all content within the virtual canvases to be effectively invisible.

### Code Location
File: `src/scripts/coursebuilder/canvas/SharedCanvasEngine.ts`
Function: `registerCanvas()`

### The Bug
```typescript
const mask = new Graphics();
mask.label = `virtual-canvas-mask-${id}`;
mask.visible = false;  // ❌ BUG: This prevents content from rendering
mask.rect(0, 0, this.baseWidth, this.baseHeight).fill({ color: 0xffffff, alpha: 1 });

root.mask = mask;
root.addChild(mask);
```

### The Fix
```typescript
const mask = new Graphics();
mask.label = `virtual-canvas-mask-${id}`;
// CRITICAL: Mask must be visible for proper clipping in PixiJS
mask.visible = true;  // ✅ FIX: Set mask to visible
mask.rect(0, 0, this.baseWidth, this.baseHeight).fill({ color: 0xffffff, alpha: 1 });

root.mask = mask;
root.addChild(mask);
```

## Changes Made

### 1. Fixed Mask Visibility (SharedCanvasEngine.ts)
- **Line ~93**: Set `mask.visible = true` when creating the mask
- Added comment explaining why this is critical for PixiJS masking

### 2. Removed Unused Variable (SharedCanvasEngine.ts)
- **Line ~224**: Removed unused `mask` variable from destructuring in `updateVirtualCanvas()`
- The mask doesn't need to be manipulated in the update loop since it stays visible

### 3. Added Debug Logging
Added comprehensive logging to track the rendering pipeline:

#### SharedCanvasEngine.ts
- Log when a canvas is registered
- Log layer info after registration
- Log when a canvas becomes visible with detailed state info

#### VerticalCanvasContainer.ts
- Log when template rendering starts
- Log canvas data details (lesson number, canvas index)
- Log when template rendering completes

#### TemplateLayoutManager.ts
- Log when rendering starts with lesson and layout info
- Log when rendering completes with children counts for each section

## Why This Works

### PixiJS Masking Behavior
In PixiJS, when you assign a mask to a Container:
```typescript
container.mask = maskGraphics;
```

The mask Graphics object **must be visible** (`visible = true`) for the masking to work properly. This is because:

1. **Masking is a rendering operation**: The mask defines the visible region through its geometry
2. **Hidden masks don't render**: If `mask.visible = false`, the mask geometry isn't processed
3. **Result**: Content inside the masked container becomes invisible or doesn't clip properly

### The Architecture
The shared canvas system uses virtual viewports where:
- Each lesson has a `root` Container
- Each `root` has a mask to clip content to the lesson boundaries
- The mask must be visible for the clipping to work
- The `root` visibility is toggled based on viewport intersection
- But the mask must **always stay visible** once created

## Testing the Fix

### What to Verify
1. ✅ Lessons render with visible content
2. ✅ Templates display header, body, and footer sections
3. ✅ Content is properly clipped to canvas boundaries
4. ✅ Scrolling reveals different lessons correctly
5. ✅ Multiple canvases can be visible simultaneously

### Debug Console Output
You should now see:
```
🎨 SharedCanvasEngine: Registering canvas "canvas-1"
✅ SharedCanvasEngine: Canvas "canvas-1" registered with layers {...}
🎨 Rendering template for canvas "canvas-1" {...}
🎨 TemplateLayoutManager: Starting render {...}
✅ TemplateLayoutManager: Render complete {...}
✅ Template rendered for canvas "canvas-1"
👁️ SharedCanvasEngine: Canvas "canvas-1" is now visible {...}
```

### Browser DevTools Inspection
```javascript
// In console, check the shared app
window.app                    // Should show the shared Application
window.app.stage.children     // Should show multiple virtual canvas roots
window.app.stage.children[0]  // Check first canvas
  .visible                    // Should be true if in viewport
  .mask                       // Should exist
  .mask.visible               // Should be TRUE (was false before)
  .children                   // Should include layers (background, layout, drawing, ui)
```

## Additional Notes

### Performance
The fix doesn't impact performance - the mask was always being processed, it just wasn't working correctly because of the visibility flag.

### Future Improvements
Consider adding assertions:
```typescript
if (!mask.visible) {
  console.error('Mask must be visible for proper clipping!');
}
```

### Related Files
- `src/scripts/coursebuilder/canvas/SharedCanvasEngine.ts` - Main fix location
- `src/scripts/coursebuilder/canvas/VerticalCanvasContainer.ts` - Added logging
- `src/scripts/coursebuilder/layout/TemplateLayoutManager.ts` - Added logging
- `src/scripts/coursebuilder/layout/CanvasLayers.ts` - Layer initialization (working correctly)

## Commit Message Suggestion
```
fix(canvas): Set mask visibility to true for proper PixiJS clipping

The shared canvas virtual viewports were not rendering content because
the mask Graphics objects were created with visible=false. In PixiJS,
masks must be visible for proper clipping to work.

Changes:
- Set mask.visible = true in SharedCanvasEngine.registerCanvas()
- Add debug logging to track rendering pipeline
- Document the fix and reasoning

Fixes: Blank lesson canvases in shared PixiJS architecture
```
