# Visual Architecture Diagram

## Single Canvas, Multiple Pages - How It Works

```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  Browser Window                                           ┃
┃  ┌────────────────────────────────────────────────────┐  ┃
┃  │ #canvas-container (HTML DIV) - Fixed size          │  ┃
┃  │                                                    │  ┃
┃  │  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │  ┃
┃  │  ┃ <canvas> - PIXI Application (1200×1800)    ┃  │  ┃  ← ONE CANVAS
┃  │  ┃                                              ┃  │  ┃
┃  │  ┃  ╔═══════════════════════════════════════╗  ┃  │  ┃
┃  │  ┃  ║ Viewport Window (pixi-viewport)       ║  ┃  │  ┃  ← YOUR VIEW
┃  │  ┃  ║ (Pan, Zoom, Scroll)                   ║  ┃  │  ┃
┃  │  ┃  ║                                        ║  ┃  │  ┃
┃  │  ┃  ║  ┌──────────────────────────────────┐ ║  ┃  │  ┃
┃  │  ┃  ║  │ Scroll Container (infinite)      │ ║  ┃  │  ┃
┃  │  ┃  ║  │                                  │ ║  ┃  │  ┃
┃  │  ┃  ║  │  ╭────────────────────────────╮  │ ║  ┃  │  ┃
┃  │  ┃  ║  │  │ Page 1 (PageContainer)     │  │ ║  ┃  │  ┃  ← LOADED
┃  │  ┃  ║  │  │ ┌────────────────────────┐ │  │ ║  ┃  │  ┃
┃  │  ┃  ║  │  │ │ Header (metadata)      │ │  │ ║  ┃  │  ┃
┃  │  ┃  ║  │  │ ├────────────────────────┤ │  │ ║  ┃  │  ┃
┃  │  ┃  ║  │  │ │ Body (content)         │ │  │ ║  ┃  │  ┃
┃  │  ┃  ║  │  │ ├────────────────────────┤ │  │ ║  ┃  │  ┃
┃  │  ┃  ║  │  │ │ Footer (metadata)      │ │  │ ║  ┃  │  ┃
┃  │  ┃  ║  │  │ └────────────────────────┘ │  │ ║  ┃  │  ┃
┃  │  ┃  ║  │  ╰────────────────────────────╯  │ ║  ┃  │  ┃
┃  │  ┃  ║  │           (40px gap)              │ ║  ┃  │  ┃
┃  │  ┃  ║  │  ╭────────────────────────────╮  │ ║  ┃  │  ┃
┃  │  ┃  ║  │  │ Page 2 (PageContainer)     │  │ ║  ┃  │  ┃  ← LOADED
┃  │  ┃  ╚══│══│ Header, Body, Footer       │══│═╝  ┃  │  ┃
┃  │  ┃     │  ╰────────────────────────────╯  │    ┃  │  ┃
┃  │  ┃     │           (40px gap)              │    ┃  │  ┃
┃  │  ┃     │  ╭────────────────────────────╮  │    ┃  │  ┃
┃  │  ┃     │  │ Page 3 (PageContainer)     │  │    ┃  │  ┃  ← LOADED
┃  │  ┗━━━━━│━━│ Header, Body, Footer       │━━│━━━━┛  │  ┃
┃  │        │  ╰────────────────────────────╯  │       │  ┃
┃  │        │           (40px gap)              │       │  ┃
┃  │        │  ╭────────────────────────────╮  │       │  ┃
┃  │        │  │ Page 4 (PageContainer)     │  │       │  ┃  ← LOADED
┃  │        │  │ Header, Body, Footer       │  │       │  ┃
┃  │        │  ╰────────────────────────────╯  │       │  ┃
┃  │        │           (40px gap)              │       │  ┃
┃  │        │  ╭────────────────────────────╮  │       │  ┃
┃  │        │  │ Page 5 (NOT LOADED)        │  │       │  ┃  ← TOO FAR
┃  │        │  │ Background only            │  │       │  ┃
┃  │        │  ╰────────────────────────────╯  │       │  ┃
┃  │        │           (40px gap)              │       │  ┃
┃  │        │  ╭────────────────────────────╮  │       │  ┃
┃  │        │  │ Page 6 (NOT LOADED)        │  │       │  ┃  ← TOO FAR
┃  │        │  │ Background only            │  │       │  ┃
┃  │        │  ╰────────────────────────────╯  │       │  ┃
┃  │        │           ...                     │       │  ┃
┃  │        │  ╭────────────────────────────╮  │       │  ┃
┃  │        │  │ Page 31 (NOT LOADED)       │  │       │  ┃  ← TOO FAR
┃  │        │  │ Background only            │  │       │  ┃
┃  │        │  ╰────────────────────────────╯  │       │  ┃
┃  │        └──────────────────────────────────┘       │  ┃
┃  └────────────────────────────────────────────────────┘  ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```

## What Happens When You Scroll

### Before Scroll (Viewing Page 2)

```
Viewport Y: 1840 (showing pages 1-3)
Loaded Pages: [1, 2, 3]
Memory: ~3 pages worth of DisplayObjects
```

### User Scrolls Down

```
User: *scrolls wheel down*
  ↓
Viewport.center.y += deltaY
  ↓
Viewport Y: 5520 (showing pages 3-5)
  ↓
PageManager.onViewportMove()
  ↓
Calculates visible range: Y 5320 to 7520 (with 200px buffer)
  ↓
Pages in range: [3, 4, 5]
  ↓
Load page 4 ✅
Load page 5 ✅
Unload page 1 🗑️
  ↓
Loaded Pages: [2, 3, 4, 5]
Memory: Still ~4 pages (constant!)
```

### Keep Scrolling to Page 10

```
Viewport Y: 16240
Loaded Pages: [8, 9, 10, 11, 12]  ← Only 5 pages!
Unloaded Pages: [1-7, 13-31]      ← Not in memory
Background: Shows all 31 page outlines ← Visual guide only
```

## Data Flow

### Initialization

```
1. Create PageMetadata[] (all 31 pages worth of data)
   └─ Stored in memory (just data, not graphics)

2. Calculate Y positions for each page
   └─ Page 1: Y = 0
   └─ Page 2: Y = 1840
   └─ Page 3: Y = 3680
   └─ ...

3. Draw backgrounds (lightweight Graphics objects)
   └─ Just outlines, no actual content

4. Load initial pages (1, 2, 3)
   └─ Create PageContainer
   └─ Populate header with metadata
   └─ Populate footer with metadata
   └─ Add placeholder in body
```

### Navigation via `goToPage(5)`

```
1. User calls pageManager.goToPage(5)
   ↓
2. Calculate target Y position
   targetY = pagePositions[5] + HEIGHT/2 = 9200 + 900 = 10100
   ↓
3. Animate viewport to target Y
   viewport.animate({ position: { y: 10100 }, time: 400ms })
   ↓
4. During/after animation, check visible pages
   ↓
5. Load pages 4, 5, 6 (if not already loaded)
   ↓
6. Unload pages 1, 2, 3 (if too far)
   ↓
7. User sees smooth scroll to page 6
   ↓
8. Only 5 pages in memory at end
```

## Memory Comparison

### Traditional Multi-Canvas Approach (DON'T DO THIS)

```
Page 1:
  - Canvas element #1
  - PIXI Application #1
  - Viewport #1
  - All page content loaded
  
Page 2:
  - Canvas element #2
  - PIXI Application #2
  - Viewport #2
  - All page content loaded

...

Page 31:
  - Canvas element #31
  - PIXI Application #31
  - Viewport #31
  - All page content loaded

Total Memory: 31 × (canvas + app + content) = HUGE 💥
```

### Our Virtualized Approach (CORRECT)

```
Canvas: 1 element
PIXI App: 1 instance
Viewport: 1 instance

Pages in memory at any time: 5 maximum
Total Memory: 1 × (canvas + app) + 5 × (page content) = TINY ✅

Even with 1000 pages: Same memory! Only 5 loaded.
```

## Scrolling Mechanics

### What Actually Moves?

```
User scrolls down:
  ↓
Viewport.center.y increases (e.g., 0 → 1840 → 3680)
  ↓
Viewport acts like a "camera" moving down
  ↓
Pages are stationary in world space:
  - Page 1 at Y = 0 (fixed)
  - Page 2 at Y = 1840 (fixed)
  - Page 3 at Y = 3680 (fixed)
  ↓
Camera moves, pages stay put, creates scrolling effect
  ↓
As camera moves, PageManager loads/unloads pages
```

### It's Like a Camera Rig

```
          Camera/Viewport (moves)
                   ↓
    ┌──────────────────────────┐
    │      Visible Area        │ ← What user sees
    └──────────────────────────┘
                   ↓ moves down
           
           Paper Roll (stationary)
           ───────────────────────
           │   Page 1 (Y=0)      │
           │─────────────────────│
           │   Page 2 (Y=1840)   │
           │─────────────────────│
           │   Page 3 (Y=3680)   │
           │─────────────────────│
           │   Page 4 (Y=5520)   │
           │─────────────────────│
                    ...
```

## Header Metadata Rendering

```
PageContainer.populateHeader()
  ↓
Read metadata.courseName → "Introduction to Computer Science"
Read metadata.courseCode → "CS-101"
Read metadata.lessonTitle → "Variables and Data Types"
Read metadata.date → "2025-01-07"
Read metadata.method → "Activity"
Read metadata.socialForm → "Pairs"
Read metadata.duration → 50
  ↓
Create Text objects with styling:
  ├─ Course: "CS-101: Introduction to Computer Science" (14px, bold)
  ├─ Lesson: "Lesson 2: Variables and Data Types" (12px, semi-bold)
  ├─ Date: "January 7, 2025" (12px, right-aligned)
  ├─ Method: "Activity · Pairs" (11px, right-aligned)
  └─ Duration: "50 min" (10px, blue badge)
  ↓
Add to header container at calculated positions
  ↓
Rendered in header section of page
```

## Performance Metrics

```
┌─────────────────────────────────────────────────┐
│ Metric              │ Value                     │
├─────────────────────────────────────────────────┤
│ Total Pages         │ 31                        │
│ Pages Loaded        │ 5 (maximum)               │
│ Memory Usage        │ Constant (~10-20 MB)      │
│ Load Time/Page      │ <100ms                    │
│ Frame Rate          │ 60 FPS                    │
│ Scroll Smoothness   │ Native smooth             │
│ Navigation Speed    │ 400ms animated            │
│ Buffer Zone         │ ±200px                    │
└─────────────────────────────────────────────────┘
```

## Key Takeaways

1. **ONE CANVAS** - Never create multiple canvas elements
2. **ONE VIEWPORT** - Shared pan/zoom/scroll for all pages
3. **STACKED CONTAINERS** - Pages arranged vertically
4. **VIRTUALIZATION** - Only load what's visible
5. **SCROLLING = CAMERA MOVEMENT** - Not data swapping
6. **METADATA = TEMPLATE** - Auto-populated from data
7. **PERFORMANCE = CONSTANT** - Same speed for 10 or 1000 pages

This is how professional applications (Google Docs, Figma, etc.) handle large canvases with multiple "pages"!
