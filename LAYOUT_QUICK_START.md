# Quick Visual Guide: Canvas Layout Structure

```
┌─────────────────────────────────────────────────────────┐
│                     1200px Width                        │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  HEADER BLOCK (template-header)                        │
│  🔴 Red overlay (alpha: 0.3)                           │
│  Height: margins.top (default: 100px)                  │
│  ├─ Fixed height (flexGrow: 0)                         │
│  ├─ Position: Y=0                                      │
│  └─ Content: Page numbers, lesson info, titles         │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  BODY BLOCK (template-body)                            │
│  🟢 Green overlay (alpha: 0.3)                         │
│  Height: Flexible (1600px default)                     │
│  ├─ Flexible height (flexGrow: 1)                      │
│  ├─ Position: Y=margins.top                            │
│  ├─ Takes all remaining space                          │
│  └─ Content: Main lesson content, images, text, etc.   │
│                                                         │
│                                                         │
│                    YOUR CONTENT                         │
│                      GOES HERE                          │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
│                                                         │
├─────────────────────────────────────────────────────────┤
│  FOOTER BLOCK (template-footer)                        │
│  🔵 Blue overlay (alpha: 0.3)                          │
│  Height: margins.bottom (default: 100px)               │
│  ├─ Fixed height (flexGrow: 0)                         │
│  ├─ Position: Y=canvas.height - margins.bottom         │
│  └─ Content: Teacher name, date, course code           │
└─────────────────────────────────────────────────────────┘
      Total Height: 1800px (2:3 aspect ratio)
```

## Block Hierarchy in PIXI

```
Canvas (1200x1800)
└── Drawing Layer
    ├── White Background (1200x1800)
    └── Template Layout Container
        ├── Header Container
        │   └── Graphics (red overlay)
        ├── Body Container  
        │   └── Graphics (green overlay)
        └── Footer Container
            └── Graphics (blue overlay)
```

## Yoga Layout Tree

```yaml
root:
  flexDirection: column
  width: 1200px
  height: 1800px
  children:
    - header:
        flexGrow: 0      # Don't expand
        flexShrink: 0    # Don't shrink
        height: 100px    # Fixed size
    
    - body:
        flexGrow: 1      # Expand to fill space
        flexShrink: 1    # Can shrink if needed
        # height is calculated
    
    - footer:
        flexGrow: 0      # Don't expand
        flexShrink: 0    # Don't shrink
        height: 100px    # Fixed size
```

## Example Layout with Different Margins

### Small Margins (50px top/bottom)
```
┌──────────────────┐
│  Header (50px)   │  ← Smaller header
├──────────────────┤
│                  │
│                  │
│   Body (1700px)  │  ← More content space!
│                  │
│                  │
├──────────────────┤
│  Footer (50px)   │  ← Smaller footer
└──────────────────┘
```

### Large Margins (200px top/bottom)
```
┌──────────────────┐
│                  │
│  Header (200px)  │  ← Larger header for branding
│                  │
├──────────────────┤
│                  │
│   Body (1400px)  │  ← Less content space
│                  │
├──────────────────┤
│                  │
│  Footer (200px)  │  ← Larger footer for metadata
│                  │
└──────────────────┘
```

## Quick Start Examples

### 1. Test in Console
```javascript
// Get blocks
const blocks = window.canvasAPI.getTemplateBlocks();
console.log('Header:', blocks.header.getBounds());
console.log('Body:', blocks.body.getBounds());
console.log('Footer:', blocks.footer.getBounds());
```

### 2. Add Content to Body
```javascript
const body = window.canvasAPI.getBodyBlock();

// Add a rectangle
const rect = new PIXI.Graphics();
rect.rect(100, 100, 400, 300);
rect.fill(0xFF5500);
body.addChild(rect);

// Add text
const text = new PIXI.Text('Hello Canvas!', {
  fontSize: 48,
  fill: 0x000000
});
text.x = 200;
text.y = 500;
body.addChild(text);
```

### 3. Change Margin Size
```javascript
// Increase header height
window.canvasMarginManager.setMargins({ 
  top: 200,    // Taller header
  bottom: 100 
});

// Body automatically adjusts to 1500px!
```

### 4. Get Layout Info
```javascript
const info = window.canvasAPI.getTemplateLayoutDebugInfo();
console.table(info.blocks);
/*
┌─────────┬────────┬─────────┬──────────┐
│ (index) │ exists │ height  │ children │
├─────────┼────────┼─────────┼──────────┤
│ header  │  true  │   100   │    1     │
│ body    │  true  │  1600   │    1     │
│ footer  │  true  │   100   │    1     │
└─────────┴────────┴─────────┴──────────┘
*/
```

## Layer System

Your canvas has multiple layers (Z-order from back to front):

1. **Background Layer** - Margin markers, grid
2. **Drawing Layer** - YOUR CONTENT BLOCKS (header/body/footer)
3. **UI Layer** - Selection boxes, tool helpers
4. **Overlays Layer** - Modals, tooltips

Content you add to header/body/footer goes in the **Drawing Layer**.

## Color Scheme (for debugging)

- 🔴 Header: `#CC6666` (desaturated red)
- 🟢 Body: `#66CC66` (desaturated green)  
- 🔵 Footer: `#6666CC` (desaturated blue)
- All at 30% opacity (alpha: 0.3)

## What This Gives You

✅ **Automatic positioning** - Yoga handles all Y-coordinates
✅ **Flexible body** - Grows/shrinks with margin changes
✅ **Fixed header/footer** - Always consistent heights
✅ **Full-width blocks** - Always span 1200px
✅ **Easy content addition** - Just use `addChild()`
✅ **Visual debugging** - Colored overlays show blocks

## Next: Build Content Renderer

Now that you have the three-block structure, you can:
1. Parse `canvas_data.layout` from database
2. Render elements into the body block
3. Position them using Yoga sub-layouts
4. Add interactive elements and tools

The foundation is ready! 🎉
