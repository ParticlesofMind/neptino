# Multi-Page Canvas System - Quick Start Guide

## What You've Got

A complete multi-page scrollable canvas system with:

✅ **Single Canvas** - One PIXI.js Application, one DOM element  
✅ **Multiple Pages** - 10 lessons × 3 pages = 30 scrollable pages  
✅ **Metadata Headers/Footers** - Auto-populated with course data  
✅ **Lazy Loading** - Only 5 pages loaded at once (virtualization)  
✅ **Smooth Navigation** - Animated scrolling between pages  
✅ **Full Integration** - Works with existing CanvasEngine  

## Try It Now (3 Steps)

### Option 1: URL Parameter (Easiest)

Just add `?multipage=true` to your dev server URL:

```
http://localhost:3000/?multipage=true
```

The demo auto-initializes and you'll see 30 pages with populated metadata!

### Option 2: Console Command

Open browser console and run:

```javascript
// If MultiPageDemo is imported somewhere
window.multiPageDemo.init();

// Or manually
import { initMultiPageDemo } from './scripts/coursebuilder/pages/MultiPageDemo';
await initMultiPageDemo();
```

### Option 3: Code Integration

```typescript
import { PageManager } from './scripts/coursebuilder/pages';
import { createSampleCourseData } from './scripts/coursebuilder/pages';
import { canvasEngine } from './scripts/coursebuilder/CanvasEngine';

// Wait for canvas ready
await new Promise<void>((resolve) => {
  canvasEngine.onReady(() => resolve());
});

// Create sample data (30 pages)
const pageData = createSampleCourseData();

// Initialize page manager
const pageManager = new PageManager({
  viewport: canvasEngine.getViewport()!,
  pageData,
  margins: { top: 96, right: 96, bottom: 96, left: 96 },
  showDebugBorders: true, // Optional
});
```

## Navigation

### Keyboard Shortcuts
- `Arrow Up/Down` or `Page Up/Down` → Navigate pages
- `Home` → First page
- `End` → Last page
- `1-9` → Jump to page 1-9
- `Space + Drag` → Pan canvas
- `Cmd/Ctrl + Scroll` → Zoom

### Console API

```javascript
// Navigate
window.multiPageDemo.goToPage(5);     // Go to page 6 (0-indexed)
window.multiPageDemo.nextPage();      // Next page
window.multiPageDemo.previousPage();  // Previous page

// Get info
window.multiPageDemo.getCurrentPage();    // Current page index
window.multiPageDemo.getTotalPages();     // Total pages (30)
window.multiPageDemo.getAllMetadata();    // All page metadata

// Access containers
window.multiPageDemo.getCurrentPageContainer();  // PageContainer instance
window.multiPageDemo.getPage(5);                 // Get page 6 container
```

## What The Demo Shows

### 10 Lessons with Real Data

1. **Lesson 1** - Introduction to Programming (3 pages)
   - Method: Lecture
   - Social Form: Whole Class
   
2. **Lesson 2** - Variables and Data Types (3 pages)
   - Method: Activity
   - Social Form: Pairs
   
3. **Lesson 3** - Control Flow (4 pages)
   - Method: Lab
   - Social Form: Individual
   
4. **Lesson 4** - Functions and Modules (3 pages)
   - Method: Discussion
   - Social Form: Small Group
   
5. **Lesson 5** - Object-Oriented Programming (4 pages)
   - Method: Lecture
   - Social Form: Whole Class

...and so on up to Lesson 10 (Final Project)

### Populated Metadata in Headers

Each page header shows:
- **Left**: Course code, course name, lesson title
- **Right**: Date, method, social form, duration badge
- **Styling**: Professional typography, color-coded badges

### Populated Metadata in Footers

Each page footer shows:
- **Center**: Page number + total pages
- **Left**: Instructor name
- **Right**: Topic/section
- **Top**: Separator line

## Performance Features

### Virtualization in Action

Watch the console as you scroll:
```
✅ Loaded page 1
✅ Loaded page 2
✅ Loaded page 3
🗑️ Unloaded page 1    ← Happens when you scroll far enough
✅ Loaded page 6
```

Only 5 pages maximum are in memory at once!

### Lazy Loading

Pages are loaded:
- When entering viewport ± 200px buffer
- Before you even see them (smooth experience)
- Asynchronously (no blocking)

Pages are unloaded:
- When far from viewport
- Automatically when exceeding 5 loaded pages
- Memory is freed immediately

## Customization Examples

### Add Custom Content to Page Body

```typescript
const page = window.multiPageDemo.getCurrentPageContainer();
const body = page.getBody();

// Add text
const text = new Text({ 
  text: "Custom content!", 
  style: { fontSize: 24 } 
});
text.x = 100;
text.y = 100;
body.addChild(text);

// Add image
const sprite = await Sprite.from('image.png');
sprite.x = 200;
sprite.y = 200;
body.addChild(sprite);
```

### Create Custom Page Data

```typescript
import { PageMetadata } from './scripts/coursebuilder/pages';

const customPages: PageMetadata[] = [
  {
    pageNumber: 1,
    totalPages: 5,
    lessonNumber: 1,
    lessonTitle: "My Custom Lesson",
    courseName: "My Course",
    courseCode: "MC-101",
    date: "2025-01-15",
    method: "Workshop",
    socialForm: "Small Group",
    duration: 90,
    instructor: "Your Name",
    topic: "Introduction",
  },
  // ... more pages
];

const pageManager = new PageManager({
  viewport: canvasEngine.getViewport()!,
  pageData: customPages,
  margins: { top: 96, right: 96, bottom: 96, left: 96 },
});
```

### Modify Header/Footer Styling

Edit `src/scripts/coursebuilder/pages/PageContainer.ts`:

- `populateHeader()` - Customize header layout/styling
- `populateFooter()` - Customize footer layout/styling
- Change fonts, colors, positions, add icons, etc.

## Architecture Recap

```
Single Canvas (PIXI.js Application)
  └─ Viewport (pixi-viewport)
      └─ Scroll Container
          ├─ Page 1 (PageContainer)
          │   ├─ Header (metadata)
          │   ├─ Body (content)
          │   └─ Footer (metadata)
          ├─ (40px gap)
          ├─ Page 2 (PageContainer)
          ├─ (40px gap)
          └─ Page 30 (PageContainer)
```

**Key Concept**: 
- You DON'T swap data into one container
- You DO scroll through multiple stacked containers
- Only visible containers are loaded (virtualization)

## Files Created

```
src/scripts/coursebuilder/pages/
├── PageMetadata.ts       # Data structures + sample data generator
├── PageContainer.ts      # Single page with header/body/footer
├── PageManager.ts        # Multi-page scrolling + virtualization
├── MultiPageDemo.ts      # Demo with keyboard nav + console API
├── index.ts             # Module exports
├── README.md            # Full documentation
└── QUICK_START.md       # This file
```

## Next Steps

1. **Try the demo**: Add `?multipage=true` to URL
2. **Explore in console**: Use `window.multiPageDemo.*` commands
3. **Read full docs**: See `README.md` for complete API reference
4. **Customize**: Modify `PageContainer.ts` for your layout
5. **Integrate**: Use `PageManager` in your actual course builder

## Common Questions

**Q: Do I need multiple canvases for multiple pages?**  
A: No! One canvas, one viewport, multiple pages stacked vertically.

**Q: How many pages can I have?**  
A: Unlimited! Only 5 are loaded at once, so memory is constant.

**Q: Can I use my own data?**  
A: Yes! Just provide an array of `PageMetadata` objects.

**Q: Can I add videos, images, animations to pages?**  
A: Yes! Access `page.getBody()` and add any PIXI DisplayObject.

**Q: Does this work with existing CanvasEngine?**  
A: Yes! It uses the same viewport and integrates seamlessly.

## Help

If something doesn't work:

1. Check browser console for errors
2. Verify canvas engine initialized: `window.canvasAPI`
3. Try: `window.multiPageDemo.getCurrentPage()`
4. See full docs: `pages/README.md`

## Demo Video Flow

When you run the demo, you'll see:

1. Console banner with instructions
2. Canvas with first page (page 1 of 30)
3. Header showing: "CS-101: Introduction to Computer Science"
4. Lesson info: "Lesson 1: Introduction to Programming"
5. Metadata: Date, Lecture, Whole Class, 50 min badge
6. Body with placeholder content
7. Footer with page number, instructor, topic

**Try scrolling down** → Pages load smoothly, old pages unload!

---

**That's it!** You now have a fully functional multi-page scrollable canvas system. 🎉
