# Canvas Zoom/Scroll System Fix

## Problem Summary

**Issue**: When zoomed into the canvas, users couldn't scroll to see different parts of the canvas using normal mouse wheel scrolling, but the grab tool worked fine for panning around.

**Root Cause**: The zoom system was using CSS `transform: scale()` which only affects visual appearance, not layout dimensions. The container didn't know the content was larger when zoomed, so there was no scrollable area to navigate.

## The Solution

### Fixed Zoom/Scroll Behavior
- **Ctrl/Cmd + Wheel**: Zoom in/out (unchanged)
- **Normal Wheel Scroll (when zoomed)**: Pan around the zoomed canvas (NEW!)
- **Normal Wheel Scroll (when not zoomed)**: Default browser scroll behavior (unchanged)
- **Grab Tool**: Works as before for mouse-based panning

### Technical Implementation

1. **Enhanced Wheel Event Handler**:
   ```typescript
   private handleWheelZoom(event: WheelEvent): void {
       // Handle zoom when Ctrl/Cmd is held
       if (event.ctrlKey || event.metaKey) {
           event.preventDefault();
           // Zoom in/out logic
           return;
       }

       // Handle normal scrolling when zoomed in (like grab tool)
       if (this.zoomLevel > 1.0) {
           event.preventDefault();
           // Convert scroll to pan movement
           this.panOffset.x -= deltaX / this.zoomLevel;
           this.panOffset.y -= deltaY / this.zoomLevel;
           this.constrainPanOffset();
           this.applyTransform();
       }
   }
   ```

2. **Container Overflow Management**:
   - When zoomed in: `overflow: hidden` (manual scroll handling)
   - When at 100% zoom: `overflow: auto` (normal browser scroll)

3. **Boundary Constraints**:
   - Added `constrainPanOffset()` to prevent scrolling too far off-screen
   - Applied to both wheel scrolling and grab tool panning

## Unified Zoom System

✅ **Single System**: Only `SimplePerspectiveManager` is active
- ❌ `ViewportManager` (pixi-viewport based) - exists but not used
- ❌ `PerspectiveManager` (basic CSS zoom) - exists but not used

### Features
- **Zoom Range**: 20% to 200% in 20% increments
- **Pan/Grab Mode**: Available when zoomed ≥120%
- **Grid Overlay**: Scales with zoom level
- **Keyboard Shortcuts**: Ctrl/Cmd + Plus/Minus, Ctrl/Cmd + 0 to reset
- **Mouse Wheel**: Ctrl/Cmd + wheel for zoom, normal wheel for pan when zoomed

## Testing

### Test Page
Created `test_zoom_scroll.html` to demonstrate the expected behavior with a simpler test case.

### Verification Steps
1. Navigate to coursebuilder page
2. Zoom in using Ctrl/Cmd + wheel or zoom buttons
3. Try scrolling with normal mouse wheel → should pan around canvas
4. Try scrolling at 100% zoom → should behave normally
5. Use grab tool → should work as before

### User Experience
- **Intuitive**: Normal scroll works as expected when zoomed in
- **Consistent**: Same behavior as grab tool but with wheel instead of mouse drag
- **Non-breaking**: All existing functionality preserved
- **Informative**: Tooltips explain the scroll behavior

## Future Considerations

1. **Touch Support**: Could extend to support touch pan gestures
2. **Momentum Scrolling**: Could add smooth deceleration like grab tool
3. **Zoom to Point**: Could zoom towards mouse cursor position
4. **Boundary Feedback**: Could add visual feedback when reaching pan limits

## Files Changed
- `/src/scripts/coursebuilder/tools/SimplePerspectiveManager.ts`
  - Enhanced `handleWheelZoom()` method
  - Added `constrainPanOffset()` method
  - Updated `applyTransform()` to manage container overflow
  - Improved `updateZoomDisplay()` with user guidance

This fix ensures that users have a smooth, intuitive experience when navigating around a zoomed canvas, matching the behavior they would expect from other canvas/drawing applications.
