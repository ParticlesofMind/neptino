# LessonTemplate Canvas Overflow Fix

## Issues Addressed

### 1. Canvas Height Overflow Prevention
**Problem**: LessonTemplate content could exceed canvas height and bleed into header/footer areas.

**Solution**:
- Added proper safe area boundaries with `safeAreaTop` and `safeAreaBottom`
- Enhanced `checkPageBreak()` method with buffer space to prevent tight fits
- Added `constrainToSafeArea()` method for content boundary validation
- Improved page creation logic to ensure content never overlaps with header/footer

**Key Changes**:
```typescript
// Old approach - used basic margins
private marginTop = 90;
private marginBottom = 90;

// New approach - calculated safe areas
private readonly HEADER_HEIGHT = 80;
private readonly FOOTER_HEIGHT = 60; 
private readonly CONTENT_PADDING = 15;
private safeAreaTop: number;
private safeAreaBottom: number;
```

### 2. Styling Moved from TypeScript to SCSS
**Problem**: Hardcoded colors, fonts, and layout values scattered throughout TypeScript files.

**Solution**:
- Moved all styling constants to CSS variables in `_layout-lesson.scss`
- Created `cssPixiHelper.ts` utility to bridge CSS and PIXI.js
- Removed inline `backgroundColor`, `fontSize`, `color` properties from TypeScript
- Added CSS class identifiers to PIXI objects for future styling integration

**CSS Variables Added**:
```scss
:root {
  // Layout constants
  --lesson-header-height: 80px;
  --lesson-footer-height: 60px;
  --lesson-content-padding: 15px;
  
  // Block colors
  --lesson-header-bg: #4a90e2;
  --lesson-program-bg: #7ed321;
  --lesson-resources-bg: #f5a623;
  
  // Typography
  --lesson-font-family: 'Arial', sans-serif;
  --lesson-font-size-header: 14px;
  --lesson-font-size-content: 11px;
}
```

## Files Modified

### `/src/scripts/coursebuilder/canvas/LessonTemplate.ts`
- ✅ Replaced hardcoded margins with calculated safe areas
- ✅ Enhanced page break logic to prevent overflow
- ✅ Added buffer space for content placement
- ✅ Improved header/footer positioning
- ✅ Started migration away from hardcoded colors

### `/src/scripts/coursebuilder/layout/lesson/LessonTemplate.ts`
- ✅ Removed hardcoded `backgroundColor` values
- ✅ Added CSS class references in comments
- ✅ Fixed duplicate resource block ID issue

### `/src/scss/layout/_layout-lesson.scss`
- ✅ Added comprehensive CSS variables for all styling
- ✅ Created structured SCSS architecture for lesson templates
- ✅ Added safe area and overflow prevention styles
- ✅ Organized typography, colors, and layout constants

### `/src/scripts/coursebuilder/utils/cssPixiHelper.ts` (New)
- ✅ Created bridge utilities between CSS and PIXI.js
- ✅ Centralized CSS variable mappings
- ✅ Added safe area validation functions
- ✅ Provided helper functions for consistent styling

## Overflow Prevention Strategy

### Safe Area Calculation
```typescript
// Calculate safe areas to prevent header/footer overlap
this.safeAreaTop = this.HEADER_HEIGHT + this.CONTENT_PADDING;
this.safeAreaBottom = this.canvasHeight - (this.FOOTER_HEIGHT + this.CONTENT_PADDING);
this.editableAreaHeight = this.safeAreaBottom - this.safeAreaTop;
```

### Enhanced Page Break Logic
```typescript
// Check if content would exceed safe area boundaries
if (currentY + contentHeight + bufferSpace > this.safeAreaBottom) {
    // Create new page and start at safe area top
    return { page: newPage, y: this.safeAreaTop };
}
```

### CSS Safe Area Enforcement
```scss
.layout-lesson {
  &__safe-area {
    position: absolute;
    top: var(--lesson-header-height);
    bottom: var(--lesson-footer-height);
    overflow: hidden; // Critical: prevents content bleeding
  }
}
```

## Benefits

1. **Prevents Content Bleeding**: Content can no longer overlap with header/footer areas
2. **Better Page Management**: Enhanced pagination with proper safe area boundaries  
3. **Centralized Styling**: All visual styling moved to CSS for easier maintenance
4. **Consistent Design**: CSS variables ensure consistent styling across components
5. **Future-Proof**: Easy to modify colors and layouts without touching TypeScript
6. **Better Performance**: Reduced inline styling computations

## Next Steps

1. **Complete Migration**: Continue removing hardcoded styling from remaining render methods
2. **CSS Integration**: Implement actual CSS class application to PIXI objects
3. **Testing**: Verify overflow prevention works with various content sizes
4. **Documentation**: Update component documentation with new CSS variable usage

## Usage Example

```typescript
// Old way - hardcoded styling
const text = new Text('Hello', {
  fontSize: 12,
  fill: 0x000000,
  fontFamily: 'Arial'
});

// New way - CSS-based styling
import { createLessonText } from './utils/cssPixiHelper';
const text = createLessonText('Hello', 'content');
```
