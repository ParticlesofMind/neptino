# Smart Guides Testing Guide

## Issue Resolution Summary

The smart guides system wasn't working due to several critical bugs:

1. **Graphics Destruction Bug**: The `GuideRenderer.clear()` method was destroying graphics objects instead of just clearing their content, making it impossible to draw guides after the first clear.

2. **Poor Object Detection**: The `findNearbyObjects()` method wasn't properly using SnapManager results and had inadequate fallback mechanisms.

3. **Missing Debug Information**: No logging made it impossible to diagnose issues.

## Fixes Applied

### 1. Fixed GuideRenderer Graphics Management
- Changed `clear()` to clear graphics content instead of destroying objects
- Added automatic graphics recreation when needed
- Added proper UI container reference storage

### 2. Improved Object Detection
- Enhanced `findNearbyObjects()` with better fallback mechanisms
- Added container traversal for object discovery
- Improved object filtering logic

### 3. Added Comprehensive Debug Logging
- Added console logging throughout the smart guides pipeline
- Clear visibility into guide generation process
- Easy troubleshooting capabilities

### 4. Enhanced Reliability
- Marked guide graphics with `__isGuide` flag to prevent interference
- Better error handling and fallback mechanisms
- Improved initialization timing

## How to Test

### 1. Basic Functionality Test
1. Open the coursebuilder page: http://localhost:3001/src/pages/teacher/coursebuilder.html
2. Switch to "Canvas" view (Engine tab)
3. Create 2-3 shapes or text objects on the canvas
4. Try to drag one object near another
5. **Expected Result**: Blue lines should appear when objects align horizontally or vertically

### 2. Console Debug Test
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Type: `testSmartGuides()`
4. **Expected Result**: Debug messages showing smart guides system status

### 3. Centering Test
1. Create one object in the center of the canvas
2. Create another object and drag it near the first
3. Try to align the centers horizontally and vertically
4. **Expected Result**: Blue guide lines should help you center objects perfectly

### 4. Multiple Object Alignment
1. Create 3-4 objects
2. Align some of them horizontally or vertically
3. Drag a new object to align with the existing group
4. **Expected Result**: Guide lines should appear showing alignment with multiple objects

## Debug Commands

Open browser console and try these commands:

```javascript
// Test smart guides system
testSmartGuides()

// Check canvas info
showCanvasInfo()

// Check if smart snapping is enabled
console.log('Smart snapping enabled:', window.snapManager?.isSmartEnabled())

// Check tool state
console.log('Current tool:', window.toolStateManager?.getCurrentTool())
```

## Expected Console Output

When dragging objects, you should see messages like:
```
🔄 SmartGuides.update called with bounds: {x: 100, y: 200, width: 50, height: 30}
🔍 Finding nearby objects for smart guides...
📦 Found 2 potential objects for alignment
🔍 AlignmentDetector.generateAlignmentGuides called
🔵 Drawing 1 alignment guides
🔵 Guide: vertical at 125, strength: 2, alpha: 0.85
✅ Guide rendering complete
```

## Troubleshooting

### If guides still don't appear:

1. **Check smart snapping is enabled**:
   ```javascript
   console.log(window.snapManager?.isSmartEnabled())
   ```

2. **Verify objects are being detected**:
   - Look for "Found X potential objects" in console
   - If 0 objects found, the issue is object detection

3. **Check guide generation**:
   - Look for "Generated alignment guides: X" messages
   - If 0 guides generated, objects might not be close enough (within 8px threshold)

4. **Verify graphics rendering**:
   - Look for "Drawing X alignment guides" messages
   - Check browser console for any rendering errors

### Common Issues:

- **No objects detected**: Make sure you have multiple objects on canvas
- **No guides generated**: Objects might be too far apart (try moving closer)
- **Guides not visible**: Check z-index or container hierarchy issues

## Visual Indicators

### Working Smart Guides Should Show:
- **Blue lines** (color: #007AFF) for alignment guides
- Lines should be **2px thick** for object-to-object alignment
- Lines should be **1px thick** for canvas alignment
- Lines should have **high alpha** (0.8+) for good visibility
- Lines should extend across the full canvas area

### With Alt/Option Key:
- **Distance labels** showing pixel distances between objects
- Red background labels with white text

## Performance

The system is throttled to ~60fps (16ms intervals) to maintain smooth performance during dragging operations.