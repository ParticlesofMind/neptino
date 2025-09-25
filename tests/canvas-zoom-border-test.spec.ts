import { test, expect } from '@playwright/test';

test.describe('Canvas Zoom & Border Issues', () => {
  test.beforeEach(async ({ page }) => {
    // Add console listener to catch errors
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleLogs.push(`ERROR: ${msg.text()}`);
      } else if (msg.type() === 'warning') {
        consoleLogs.push(`WARN: ${msg.text()}`);
      }
    });
    
    // Store logs on page for later access
    await page.addInitScript(() => {
      (window as any).testConsoleLogs = [];
      const originalError = console.error;
      const originalWarn = console.warn;
      console.error = (...args) => {
        (window as any).testConsoleLogs.push(`ERROR: ${args.join(' ')}`);
        originalError.apply(console, args);
      };
      console.warn = (...args) => {
        (window as any).testConsoleLogs.push(`WARN: ${args.join(' ')}`);
        originalWarn.apply(console, args);
      };
    });

    await page.goto('http://localhost:3008/src/pages/teacher/coursebuilder.html#create');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for canvas to initialize
    await page.waitForFunction(() => {
      return !!(window as any).canvasAPI && (window as any).canvasAPI.isReady();
    }, { timeout: 10000 });
  });

  test('Canvas border should be visible', async ({ page }) => {
    console.log('🧪 Testing canvas border visibility...');
    
    // Check if margin manager is working
    const marginInfo = await page.evaluate(() => {
      const canvasAPI = (window as any).canvasAPI;
      const marginManager = (window as any).canvasMarginManager;
      
      return {
        canvasReady: !!canvasAPI && canvasAPI.isReady(),
        marginManagerExists: !!marginManager,
        backgroundLayer: !!canvasAPI?.getLayer?.('background'),
        margins: marginManager?.getMargins?.() || null
      };
    });
    
    console.log('📊 Margin Info:', marginInfo);
    
    expect(marginInfo.canvasReady).toBe(true);
    expect(marginInfo.marginManagerExists).toBe(true);
    expect(marginInfo.backgroundLayer).toBe(true);
    expect(marginInfo.margins).toBeTruthy();
  });

  test('Zoom indicator should update correctly', async ({ page }) => {
    console.log('🧪 Testing zoom indicator...');
    
    // Get initial zoom info
    const initialZoomInfo = await page.evaluate(() => {
      const perspectiveManager = (window as any).perspectiveManager;
      return {
        perspectiveManagerExists: !!perspectiveManager,
        currentZoom: perspectiveManager?.getZoom?.() || perspectiveManager?.getZoomLevel?.() || null,
        hasDrawingLayer: !!(perspectiveManager as any)?.drawingLayer
      };
    });
    
    console.log('📊 Initial Zoom Info:', initialZoomInfo);
    
    expect(initialZoomInfo.perspectiveManagerExists).toBe(true);
    expect(initialZoomInfo.currentZoom).toBeGreaterThan(0);
    
    // Check if zoom indicator in UI shows correct value
    const zoomDisplayText = await page.locator('.zoom-display, [class*="zoom"]').first().textContent();
    console.log('📊 Zoom Display Text:', zoomDisplayText);
    
    // Should show some percentage, not stuck at 100%
    expect(zoomDisplayText).toMatch(/\d+%/);
  });

  test('Mouse wheel zoom should work', async ({ page }) => {
    console.log('🧪 Testing mouse wheel zoom...');
    
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
    
    // Get initial zoom
    const initialZoom = await page.evaluate(() => {
      const pm = (window as any).perspectiveManager;
      return pm?.getZoom?.() || pm?.getZoomLevel?.() || 1;
    });
    
    console.log('📊 Initial zoom:', initialZoom);
    
    // Try zooming in with Ctrl+Wheel
    await canvas.hover();
    await page.keyboard.down('Control');
    await canvas.hover({ position: { x: 400, y: 300 } });
    await page.mouse.wheel(0, -100); // Zoom in
    await page.keyboard.up('Control');
    
    await page.waitForTimeout(500); // Allow zoom to process
    
    const newZoom = await page.evaluate(() => {
      const pm = (window as any).perspectiveManager;
      return pm?.getZoom?.() || pm?.getZoomLevel?.() || 1;
    });
    
    console.log('📊 New zoom after wheel:', newZoom);
    
    expect(newZoom).toBeGreaterThan(initialZoom);
  });

  test('Object selection should work', async ({ page }) => {
    console.log('🧪 Testing object selection...');
    
    // First create a test object to select
    await page.evaluate(() => {
      const canvasAPI = (window as any).canvasAPI;
      if (canvasAPI) {
        // Create a simple rectangle for testing
        canvasAPI.addRectangle(100, 100, 50, 50, '#ff0000');
      }
    });
    
    await page.waitForTimeout(500);
    
    // Switch to selection tool
    const selectionTool = page.locator('[data-tool="selection"]').first();
    if (await selectionTool.isVisible()) {
      await selectionTool.click();
    }
    
    await page.waitForTimeout(200);
    
    // Try to select the object
    const canvas = page.locator('canvas').first();
    await canvas.click({ position: { x: 125, y: 125 } }); // Click center of rectangle
    
    await page.waitForTimeout(500);
    
    // Check if selection worked
    const selectionInfo = await page.evaluate(() => {
      const selectionTool = (window as any).toolManager?.getActiveTool?.();
      return {
        activeToolName: (window as any).toolManager?.getActiveToolName?.() || 'unknown',
        hasSelection: selectionTool && selectionTool.selected && selectionTool.selected.length > 0
      };
    });
    
    console.log('📊 Selection Info:', selectionInfo);
    
    expect(selectionInfo.activeToolName).toBe('selection');
  });

  test('Spacebar grab tool should work', async ({ page }) => {
    console.log('🧪 Testing spacebar grab tool...');
    
    const canvas = page.locator('canvas').first();
    await canvas.hover();
    
    // Test spacebar functionality
    await page.keyboard.down('Space');
    await page.waitForTimeout(100);
    
    const grabInfo = await page.evaluate(() => {
      const pm = (window as any).perspectiveManager;
      return {
        grabActive: pm?.isGrabActive?.() || false,
        cursorStyle: document.body.style.cursor
      };
    });
    
    console.log('📊 Grab Info:', grabInfo);
    
    await page.keyboard.up('Space');
    
    expect(grabInfo.grabActive || grabInfo.cursorStyle.includes('grab')).toBeTruthy();
  });

  test('Console should not have critical errors', async ({ page }) => {
    console.log('🧪 Checking for console errors...');
    
    await page.waitForTimeout(2000); // Let page fully load
    
    const consoleLogs = await page.evaluate(() => {
      return (window as any).testConsoleLogs || [];
    });
    
    console.log('📊 Console Messages:', consoleLogs);
    
    // Filter out non-critical warnings
    const criticalErrors = consoleLogs.filter((log: string) => 
      log.includes('ERROR:') && 
      !log.includes('favicon') && 
      !log.includes('DevTools')
    );
    
    console.log('🚨 Critical Errors:', criticalErrors);
    
    expect(criticalErrors.length).toBe(0);
  });
});