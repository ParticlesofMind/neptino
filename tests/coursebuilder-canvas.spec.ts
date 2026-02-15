/**
 * Coursebuilder Canvas Tests
 * Tests canvas initialization, multi-canvas loading, and PIXI.js rendering
 */

import { test, expect } from '@playwright/test';

test.describe('Coursebuilder Canvas System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to coursebuilder page
    await page.goto('/teacher/coursebuilder');
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');
  });

  test('Canvas container exists on coursebuilder page', async ({ page }) => {
    // Check that the canvas container element exists
    const canvasContainer = page.locator('#canvas-container');
    await expect(canvasContainer).toBeVisible({ timeout: 10000 });
    
    console.log('✅ Canvas container found');
  });

  test('Canvas API initializes', async ({ page }) => {
    // Wait for canvasAPI to be available on window
    await page.waitForFunction(() => {
      return typeof (window as any).canvasAPI !== 'undefined';
    }, { timeout: 15000 });
    
    const hasCanvasAPI = await page.evaluate(() => {
      return typeof (window as any).canvasAPI !== 'undefined';
    });
    
    expect(hasCanvasAPI).toBeTruthy();
    console.log('✅ Canvas API initialized');
  });

  test('Multi-canvas manager initializes', async ({ page }) => {
    // Wait for multiCanvasManager to be available
    await page.waitForFunction(() => {
      return typeof (window as any).multiCanvasManager !== 'undefined';
    }, { timeout: 15000 });
    
    const hasMultiCanvasManager = await page.evaluate(() => {
      return typeof (window as any).multiCanvasManager !== 'undefined';
    });
    
    expect(hasMultiCanvasManager).toBeTruthy();
    console.log('✅ Multi-canvas manager initialized');
  });

  test('PIXI.js application initializes', async ({ page }) => {
    // Check if PIXI app exists
    await page.waitForFunction(() => {
      const canvasAPI = (window as any).canvasAPI;
      if (!canvasAPI) return false;
      
      try {
        const app = canvasAPI.getApp();
        return app !== null && app !== undefined;
      } catch {
        return false;
      }
    }, { timeout: 15000 });
    
    const hasPixiApp = await page.evaluate(() => {
      const canvasAPI = (window as any).canvasAPI;
      if (!canvasAPI) return false;
      const app = canvasAPI.getApp();
      return app !== null;
    });
    
    expect(hasPixiApp).toBeTruthy();
    console.log('✅ PIXI.js application initialized');
  });

  test('Canvas renders with correct dimensions', async ({ page }) => {
    // Wait for canvas element to exist
    await page.waitForSelector('canvas', { timeout: 15000 });
    
    const canvasDimensions = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      
      return {
        width: canvas.width,
        height: canvas.height,
        hasContent: canvas.parentElement !== null
      };
    });
    
    expect(canvasDimensions).not.toBeNull();
    expect(canvasDimensions?.width).toBeGreaterThan(0);
    expect(canvasDimensions?.height).toBeGreaterThan(0);
    expect(canvasDimensions?.hasContent).toBeTruthy();
    
    console.log('✅ Canvas rendered with dimensions:', canvasDimensions);
  });

  test('Tool system initializes', async ({ page }) => {
    // Wait for tool state manager
    await page.waitForFunction(() => {
      return typeof (window as any).toolStateManager !== 'undefined';
    }, { timeout: 15000 });
    
    const toolsInitialized = await page.evaluate(() => {
      const toolStateManager = (window as any).toolStateManager;
      if (!toolStateManager) return false;
      
      // Check if default tool is set
      const currentTool = toolStateManager.getCurrentTool();
      return typeof currentTool === 'string' && currentTool.length > 0;
    });
    
    expect(toolsInitialized).toBeTruthy();
    console.log('✅ Tool system initialized');
  });

  test('Zoom controls are available', async ({ page }) => {
    // Check for zoom buttons
    const zoomInButton = page.locator('[data-action="zoom-in"]');
    const zoomOutButton = page.locator('[data-action="zoom-out"]');
    const resetButton = page.locator('[data-action="reset"]');
    
    await expect(zoomInButton).toBeVisible({ timeout: 10000 });
    await expect(zoomOutButton).toBeVisible();
    await expect(resetButton).toBeVisible();
    
    console.log('✅ Zoom controls visible');
  });

  test('Navigation to create section shows canvas', async ({ page }) => {
    // Navigate to create section (where canvas is active)
    const createLink = page.locator('a[href="#create"]');
    await createLink.click();
    
    // Wait for create section to be active
    await page.waitForSelector('.coursebuilder__create[aria-hidden="false"]', { timeout: 10000 });
    
    // Verify canvas is still present and visible
    const canvasContainer = page.locator('#canvas-container');
    await expect(canvasContainer).toBeVisible();
    
    console.log('✅ Canvas visible in create section');
  });
});

test.describe('Coursebuilder Canvas with Course', () => {
  test('Canvases load when course ID is set', async ({ page }) => {
    await page.goto('/teacher/coursebuilder');
    await page.waitForLoadState('networkidle');
    
    // Wait for canvas API to initialize
    await page.waitForFunction(() => {
      return typeof (window as any).multiCanvasManager !== 'undefined';
    }, { timeout: 15000 });
    
    // Set a test course ID (you'll need to replace this with an actual course ID from your DB)
    const courseId = await page.evaluate(async () => {
      // Try to get course ID from URL or create a test one
      const urlParams = new URLSearchParams(window.location.search);
      let testCourseId = urlParams.get('course_id');
      
      if (!testCourseId) {
        // If no course ID in URL, try to get first course from database
        const supabase = (window as any).supabase;
        if (supabase) {
          const { data } = await supabase
            .from('courses')
            .select('id')
            .limit(1);
          
          if (data && data.length > 0) {
            testCourseId = data[0].id;
          }
        }
      }
      
      return testCourseId;
    });
    
    if (!courseId) {
      test.skip(true, 'No test course available');
      return;
    }
    
    // Load canvases for this course
    await page.evaluate((cId) => {
      const mcm = (window as any).multiCanvasManager;
      if (mcm) {
        return mcm.loadCourseCanvases(cId);
      }
    }, courseId);
    
    // Wait a bit for canvases to load
    await page.waitForTimeout(2000);
    
    // Check if canvas placeholders exist
    const canvasCount = await page.evaluate(() => {
      const mcm = (window as any).multiCanvasManager;
      return mcm ? mcm.getCanvasCount() : 0;
    });
    
    console.log(`✅ Loaded ${canvasCount} canvases for course ${courseId}`);
    expect(canvasCount).toBeGreaterThan(0);
  });
});
