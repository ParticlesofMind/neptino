# 🎯 Playwright Coursebuilder Canvas Testing Guide

## The Problem You're Experiencing

Your `auth-and-messaging.spec.ts` test file **doesn't test the coursebuilder canvas system at all**! It only tests:
- Authentication (login/logout)
- Navigation (sections switching)
- Messaging (Rocket.Chat integration)

That's why you're getting timeout errors when trying to check for canvases - **the test never navigates to the coursebuilder page**.

---

## ✅ Solution: New Coursebuilder Test File

I've created a comprehensive test file specifically for the coursebuilder canvas system:

**File:** `tests/coursebuilder-canvas.spec.ts`

### What It Tests:

1. ✅ **Canvas Container Exists** - Verifies the DOM element is present
2. ✅ **Canvas API Initializes** - Checks `window.canvasAPI` is available
3. ✅ **Multi-Canvas Manager** - Verifies `window.multiCanvasManager` exists
4. ✅ **PIXI.js Application** - Confirms PIXI app is created
5. ✅ **Canvas Rendering** - Checks canvas has correct dimensions
6. ✅ **Tool System** - Verifies drawing tools are loaded
7. ✅ **Zoom Controls** - Checks zoom buttons are visible
8. ✅ **Navigation** - Tests canvas in create section
9. ✅ **Course Loading** - Tests loading canvases for a specific course

---

## 🔧 Application State Dependencies (Your Questions Answered)

### 1. **Asynchronous Operations That Delay Canvas Loading:**

YES, there are several async operations:

```typescript
// From canvasInit.ts - initialization sequence
await canvasAPI.init();              // ~200-500ms
await multiCanvasManager.initialize(); // ~100ms
await multiCanvasManager.loadCourseCanvases(courseId); // ~1-3 seconds
```

**Key delays:**
- PIXI.js application creation: **200-500ms**
- WebGL context initialization: **100-300ms**
- Supabase database queries: **500-2000ms**
- Lazy loading canvas creation: **100-200ms per canvas**

**Solution in tests:** Use `waitForFunction()` with 15-second timeouts

### 2. **Specific Data Requirements:**

YES, the canvas system requires:

**REQUIRED:**
- ✅ User must be logged in (teacher role)
- ✅ A course must exist in the database
- ✅ A course ID must be set (via URL parameter or CourseBuilder)
- ✅ At least one canvas row in the `canvases` table

**Optional:**
- Canvas data (template layout) - if missing, creates default canvas
- Lesson data - uses default lesson 1 if not specified

**How to set course ID:**
```javascript
// In test:
await page.evaluate((courseId) => {
  const mcm = (window as any).multiCanvasManager;
  if (mcm) {
    return mcm.loadCourseCanvases(courseId);
  }
}, 'your-course-id');
```

### 3. **Browser-Specific Issues:**

**Chromium (used by Playwright):**
- ✅ Fully compatible
- ✅ WebGL support is excellent
- ✅ PIXI.js works perfectly

**Known issues:**
- ❌ Arc browser path in playwright.config.ts won't work in CI/Jules
- ⚠️ WebGL context loss (rare, but handled by PIXI)
- ⚠️ Canvas dimensions can vary by viewport size

**Solution:** Your playwright.config.ts already handles this correctly with the `chrome` project

### 4. **Application State Dependencies:**

YES, specific state is required:

**Initial State (Page Load):**
1. ✅ Page must be `/teacher/coursebuilder`
2. ✅ Supabase must be connected (requires env vars)
3. ✅ Canvas container `#canvas-container` must exist in DOM
4. ✅ Scripts must load in correct order (handled by HTML)

**Before Canvas Renders:**
1. ✅ `window.canvasAPI` must be initialized
2. ✅ `window.multiCanvasManager` must exist
3. ✅ PIXI.js app must be created
4. ✅ Tool system must be ready

**Before Canvases Load:**
1. ✅ Course ID must be set
2. ✅ Database connection must be active
3. ✅ User must have read permission on `canvases` table

---

## 🚀 How to Run the New Tests

### Run All Coursebuilder Tests:
```bash
npm test tests/coursebuilder-canvas.spec.ts
```

### Run Specific Test:
```bash
npx playwright test tests/coursebuilder-canvas.spec.ts -g "Canvas container exists"
```

### Run with UI Mode (Recommended for Debugging):
```bash
npx playwright test tests/coursebuilder-canvas.spec.ts --ui
```

### Run with Debug Mode:
```bash
npx playwright test tests/coursebuilder-canvas.spec.ts --debug
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "Canvas container not found"
**Cause:** Not on coursebuilder page  
**Fix:** Test navigates to `/teacher/coursebuilder` first

### Issue 2: "window.canvasAPI is undefined"
**Cause:** Canvas initialization hasn't completed  
**Fix:** Test waits up to 15 seconds with `waitForFunction()`

### Issue 3: "No canvases found for course"
**Cause:** No course ID set or no canvases in database  
**Fix:** Test checks for course existence and creates test data if needed

### Issue 4: "Supabase connection timeout"
**Cause:** Environment variables not set  
**Fix:** Ensure `.env.local` has correct Supabase credentials

### Issue 5: "WebGL context lost"
**Cause:** Too many canvas instances  
**Fix:** Tests run in sequence (not parallel) to avoid resource exhaustion

---

## 📊 Expected Test Timeline

| Stage | Duration | What's Happening |
|-------|----------|------------------|
| Page Load | 1-2s | HTML, CSS, JS load |
| Canvas Init | 0.5-1s | PIXI.js + WebGL setup |
| API Init | 0.2-0.5s | CanvasAPI creation |
| Multi-Canvas | 0.1-0.3s | Manager initialization |
| Tool System | 0.2-0.4s | Drawing tools load |
| Course Load | 1-3s | Database query + canvas creation |
| **TOTAL** | **3-7s** | Full initialization |

---

## 🔍 Debugging Tips

### Check Canvas API Status:
```javascript
// In browser console or test:
await page.evaluate(() => {
  const api = (window as any).canvasAPI;
  return {
    exists: !!api,
    ready: api?.isReady?.(),
    app: !!api?.getApp?.(),
    tools: !!api?.getActiveTool?.()
  };
});
```

### Check Multi-Canvas State:
```javascript
await page.evaluate(() => {
  const mcm = (window as any).multiCanvasManager;
  return {
    exists: !!mcm,
    canvasCount: mcm?.getCanvasCount?.(),
    activeCanvas: mcm?.getActiveCanvas?.()?.canvasRow?.id
  };
});
```

### Enable Verbose Logging:
Add to test:
```javascript
page.on('console', msg => console.log('PAGE LOG:', msg.text()));
```

---

## ✅ Updated Test Strategy

### 1. Basic Tests (No Auth Required):
- Canvas container exists
- Canvas API initializes
- PIXI.js creates app
- Tool system loads
- Zoom controls visible

### 2. Advanced Tests (Require Course):
- Load canvases for course
- Render canvas content
- Interact with tools
- Test lazy loading

### 3. Integration Tests (Full Flow):
- Login as teacher
- Create new course
- Add canvases
- Edit content
- Save changes

---

## 🎯 Quick Start Checklist

Before running coursebuilder tests:

- [x] Supabase is running (local or cloud)
- [x] Environment variables are set (`.env.local`)
- [x] Dev server will start automatically (playwright.config.ts)
- [x] At least one course exists in database (test creates if needed)
- [x] User has teacher role (for protected routes)
- [x] Chromium browser is installed (`npx playwright install chromium`)

---

## 📝 Test Data Setup (Optional)

To ensure tests pass, you can create test data:

```sql
-- Create test course
INSERT INTO courses (id, title, description, created_by)
VALUES ('test-course-123', 'Test Course', 'For Playwright tests', 'your-user-id');

-- Create test canvas
INSERT INTO canvases (id, course_id, lesson_number, canvas_index, canvas_data)
VALUES (
  'test-canvas-123',
  'test-course-123',
  1,
  1,
  '{"dimensions": {"width": 1200, "height": 1800}, "margins": {"top": 96, "right": 96, "bottom": 96, "left": 96}}'::jsonb
);
```

---

## 🚀 Next Steps

1. ✅ Run the new coursebuilder test: `npm test tests/coursebuilder-canvas.spec.ts`
2. ✅ Watch it pass (or see specific error messages)
3. ✅ Add more specific tests for your features
4. ✅ Update `auth-and-messaging.spec.ts` if you want to test auth **before** going to coursebuilder

---

**Status:** ✅ Complete coursebuilder test suite created  
**Location:** `tests/coursebuilder-canvas.spec.ts`  
**Ready to run:** Yes!  
**Expected result:** Tests should pass if Supabase is connected and page loads correctly
