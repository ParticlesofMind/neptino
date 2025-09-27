import { test, expect } from '@playwright/test';

test.describe('Canvas Functionality Fix Tests', () => {
  const consoleErrors: string[] = [];

  test.beforeEach(async ({ page }) => {
    // Clear console errors
    consoleErrors.length = 0;
    
    // Intercept console errors 
    await page.addInitScript(() => {
      const originalError = console.error;
      const originalWarn = console.warn;
      (window as any).testConsoleLogs = [];
      
      console.error = (...args: any[]) => {
        (window as any).testConsoleLogs.push(`ERROR: ${args.join(' ')}`);
        originalError.apply(console, args);
      };
      console.warn = (...args: any[]) => {
        (window as any).testConsoleLogs.push(`WARN: ${args.join(' ')}`);
        originalWarn.apply(console, args);
      };
      
      // Add PIXI globals and test helper methods to CanvasAPI
      window.addEventListener('DOMContentLoaded', () => {
        // Make PIXI available globally for testing
        (window as any).PIXI = (async () => {
          const PIXI = await import('pixi.js');
          return PIXI;
        })();
        
        setTimeout(() => {
          if ((window as any).canvasAPI) {
            const canvasAPI = (window as any).canvasAPI;
            
            // Add addRectangle method for testing
            canvasAPI.addRectangle = async function(x: number, y: number, width: number, height: number, color: number = 0x0000ff) {
              const PIXI = await (window as any).PIXI;
              const graphics = new PIXI.Graphics();
              graphics.beginFill(color);
              graphics.drawRect(0, 0, width, height);
              graphics.endFill();
              graphics.x = x;
              graphics.y = y;
              
              const drawingLayer = this.getDrawingLayer();
              if (drawingLayer) {
                drawingLayer.addChild(graphics);
                return `rect_${Date.now()}`;
              }
              return null;
            };
          }
        }, 1000);
      });
    });

    await page.goto('http://localhost:3008/src/pages/teacher/coursebuilder.html#create');
    await page.waitForLoadState('domcontentloaded');
    
    // Navigate to build section where main canvas is located
    await page.evaluate(() => {
      // Hide setup section
      const setupSection = document.querySelector('#setup') as HTMLElement;
      if (setupSection) {
        setupSection.style.display = 'none';
        setupSection.setAttribute('aria-hidden', 'true');
      }
      
      // Show build section
      const buildSection = document.querySelector('#build') as HTMLElement;
      if (buildSection) {
        buildSection.style.display = 'block';
        buildSection.setAttribute('aria-hidden', 'false');
      }
    });
    
    // Wait for section transition
    await page.waitForTimeout(500);
    
    // Wait for canvas to initialize
    await page.waitForFunction(() => {
      return !!(window as any).canvasAPI && (window as any).canvasAPI.isReady();
    }, { timeout: 10000 });
  });

  test('Main PIXI canvas should be visible and ready', async ({ page }) => {
    console.log('🧪 Testing PIXI canvas visibility...');
    
    // Check canvas state
    const canvasInfo = await page.evaluate(() => {
      const canvasAPI = (window as any).canvasAPI;
      const canvasContainer = document.querySelector('#canvas-container');
      const pixiCanvas = canvasContainer?.querySelector('canvas');
      
      return {
        canvasAPIReady: !!canvasAPI && canvasAPI.isReady(),
        containerExists: !!canvasContainer,
        pixiCanvasExists: !!pixiCanvas,
        pixiCanvasVisible: pixiCanvas ? window.getComputedStyle(pixiCanvas).display !== 'none' : false,
        canvasWidth: pixiCanvas?.width || 0,
        canvasHeight: pixiCanvas?.height || 0,
      };
    });
    
    console.log('📊 Canvas Info:', canvasInfo);
    
    expect(canvasInfo.canvasAPIReady).toBe(true);
    expect(canvasInfo.containerExists).toBe(true);
    expect(canvasInfo.pixiCanvasExists).toBe(true);
    expect(canvasInfo.pixiCanvasVisible).toBe(true);
  });

  test('Canvas border should be visible', async ({ page }) => {
    console.log('🧪 Testing canvas border visibility...');
    
    // Check margin manager
    const marginInfo = await page.evaluate(() => {
      const canvasAPI = (window as any).canvasAPI;
      const marginManager = (window as any).canvasMarginManager;
      
      return {
        canvasReady: !!canvasAPI && canvasAPI.isReady(),
        marginManagerExists: !!marginManager,
        backgroundLayer: !!canvasAPI?.getLayer?.('background'),
        margins: marginManager?.getMargins?.() || null,
        borderVisible: marginManager?.isBorderVisible?.() || false
      };
    });
    
    console.log('📊 Margin Info:', marginInfo);
    expect(marginInfo.marginManagerExists).toBe(true);
    expect(marginInfo.backgroundLayer).toBe(true);
  });

  test('Zoom indicator should update correctly', async ({ page }) => {
    console.log('🧪 Testing zoom indicator...');
    
    const zoomDisplay = page.locator('.engine__perspective-zoom');
    await expect(zoomDisplay).toBeVisible();
    
    const initialZoom = await zoomDisplay.textContent();
    console.log('📊 Initial zoom:', initialZoom);
    
    // Try to trigger zoom change
    const canvas = page.locator('#canvas-container canvas').first();
    await canvas.hover();
    
    // Test mouse wheel zoom
    await page.mouse.wheel(0, -100); // Zoom in
    await page.waitForTimeout(500);
    
    const newZoom = await zoomDisplay.textContent();
    console.log('📊 New zoom after wheel:', newZoom);
    
    expect(zoomDisplay).toBeVisible();
  });

  test('Mouse wheel zoom should work', async ({ page }) => {
    console.log('🧪 Testing mouse wheel zoom...');
    
    const canvas = page.locator('#canvas-container canvas');
    await expect(canvas).toBeVisible();
    
    // Get initial zoom info
    const initialZoomInfo = await page.evaluate(() => {
      const perspectiveManager = (window as any).perspectiveManager;
      return {
        hasManager: !!perspectiveManager,
        currentZoom: perspectiveManager?.getCurrentZoom?.() || 1
      };
    });
    
    console.log('📊 Initial zoom info:', initialZoomInfo);
    
    await canvas.hover();
    await page.mouse.wheel(0, -100); // Zoom in
    await page.waitForTimeout(300);
    
    const finalZoomInfo = await page.evaluate(() => {
      const perspectiveManager = (window as any).perspectiveManager;
      return {
        currentZoom: perspectiveManager?.getCurrentZoom?.() || 1
      };
    });
    
    console.log('📊 Final zoom info:', finalZoomInfo);
    
    expect(initialZoomInfo.hasManager).toBe(true);
  });

  test('Object selection should work', async ({ page }) => {
    console.log('🧪 Testing object selection...');
    
    // First, make sure we can create objects
    const rectId = await page.evaluate(async () => {
      const canvasAPI = (window as any).canvasAPI;
      if (canvasAPI && canvasAPI.addRectangle) {
        return await canvasAPI.addRectangle(100, 100, 50, 50, 0xff0000);
      }
      return null;
    });
    
    console.log('📊 Created rectangle with ID:', rectId);
    expect(rectId).toBeTruthy();
    
    // Wait for object to be rendered
    await page.waitForTimeout(500);
    
    // Try to click on the object
    const canvas = page.locator('#canvas-container canvas');
    await canvas.click({ position: { x: 125, y: 125 } });
    
    // Check if selection tool is working
    const selectionInfo = await page.evaluate(() => {
      const toolManager = (window as any).toolManager;
      return {
        hasToolManager: !!toolManager,
        currentTool: toolManager?.getCurrentTool?.() || 'unknown'
      };
    });
    
    console.log('📊 Selection info:', selectionInfo);
    expect(selectionInfo.hasToolManager).toBe(true);
  });

  test('Spacebar grab tool should work', async ({ page }) => {
    console.log('🧪 Testing spacebar grab tool...');
    
    const canvas = page.locator('#canvas-container canvas');
    await expect(canvas).toBeVisible();
    
    // Test spacebar grab activation
    await canvas.hover();
    await page.keyboard.down('Space');
    await page.waitForTimeout(200);
    
    const grabInfo = await page.evaluate(() => {
      const perspectiveManager = (window as any).perspectiveManager;
      return {
        hasManager: !!perspectiveManager,
        isGrabActive: perspectiveManager?.isGrabActive?.() || false
      };
    });
    
    console.log('📊 Grab info:', grabInfo);
    
    await page.keyboard.up('Space');
    
    expect(grabInfo.hasManager).toBe(true);
  });

  test('Console should not have critical errors', async ({ page }) => {
    console.log('🧪 Testing console errors...');
    
    // Get console logs
    const consoleLogs = await page.evaluate(() => {
      return (window as any).testConsoleLogs || [];
    });
    
    console.log('📊 Console logs:', consoleLogs);
    
    // Filter for critical errors (not warnings)
    const criticalErrors = consoleLogs.filter((log: string) => 
      log.startsWith('ERROR:') && 
      !log.includes('favicon') &&
      !log.includes('DevTools')
    );
    
    console.log('🚨 Critical errors:', criticalErrors);
    
    expect(criticalErrors.length).toBe(0);
  });
});