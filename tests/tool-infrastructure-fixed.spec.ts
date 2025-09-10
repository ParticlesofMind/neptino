import { test, expect, Page } from '@playwright/test';

/**
 * Core Tool Infrastructure Tests
 * Tests fundamental tool system behavior that all tools depend on
 */

class ToolTestHelpers {
  constructor(private page: Page) {}

  async waitForCanvasReady() {
    await this.page.waitForFunction(() => !!(window as any).uiEventHandler && !!(window as any).toolStateManager, null, { timeout: 20000 });
    await this.page.waitForFunction(() => {
      return window.canvasAPI !== undefined && window.canvasAPI.isReady();
    }, null, { timeout: 20000 });
  }

  async activateTool(toolName: string) {
    // Use CanvasAPI to set the tool
    const result = await this.page.evaluate((tool) => {
      return window.canvasAPI?.setTool(tool);
    }, toolName);
    
    // Verify tool activation
    if (result) {
      await this.page.waitForFunction((tool) => {
        return window.canvasAPI?.getActiveTool() === tool;
      }, toolName, { timeout: 3000 });
    }
    
    return result;
  }

  async getCanvasBounds() {
    // Prefer canvasAPI content bounds for reliability in headless
    const b = await this.page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
    return b;
  }

  async performPointerAction(
    action: 'down' | 'move' | 'up',
    x: number,
    y: number,
    options?: { button?: 'left' | 'right' | 'middle' }
  ) {
    const canvas = await this.page.locator('canvas').first();
    
    switch (action) {
      case 'down':
        await canvas.click({ position: { x, y }, button: options?.button });
        break;
      case 'move':
        await canvas.hover({ position: { x, y } });
        break;
      case 'up':
        // Mouse up is handled automatically after click
        break;
    }
  }

  async measurePerformance(action: () => Promise<void>) {
    const startTime = Date.now();
    await action();
    const endTime = Date.now();
    return endTime - startTime;
  }

  async checkForErrors() {
    const errors = await this.page.evaluate(() => {
      return window.errors || [];
    });
    return errors;
  }
}

test.describe('Core Tool Infrastructure', () => {
  let helpers: ToolTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new ToolTestHelpers(page);
    await page.addInitScript(() => { (window as any).__TEST_MODE__ = true; try { window.localStorage.clear(); } catch {} });
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForLoadState('domcontentloaded');
    await helpers.waitForCanvasReady();
  });

  test('CanvasAPI initializes correctly', async ({ page }) => {
    // Verify canvasAPI exists and is ready
    const canvasAPIReady = await page.evaluate(() => {
      return window.canvasAPI !== undefined && window.canvasAPI.isReady();
    });
    expect(canvasAPIReady).toBe(true);

    // Verify default tool is selection
    const activeToolName = await page.evaluate(() => {
      return window.canvasAPI?.getActiveTool();
    });
    expect(activeToolName).toBe('selection');

    // Verify canvas has proper dimensions
    const dimensions = await page.evaluate(() => {
      return window.canvasAPI?.getDimensions();
    });
    expect(dimensions).toBeDefined();
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
  });

  test('Tool activation/deactivation works correctly', async ({ page }) => {
    const tools = ['pen', 'brush', 'text', 'shapes', 'eraser', 'selection'];
    
    for (const tool of tools) {
      const success = await helpers.activateTool(tool);
      expect(success).toBe(true);
      
      // Verify tool is active
      const activeToolName = await page.evaluate(() => {
        return window.canvasAPI?.getActiveTool();
      });
      expect(activeToolName).toBe(tool);
    }
  });

  test('Canvas boundaries are correctly calculated', async ({ page }) => {
    const canvasBounds = await helpers.getCanvasBounds();
    expect(canvasBounds).not.toBeNull();

    // Test canvas dimensions match expected values
    const pixiDimensions = await page.evaluate(() => {
      return window.canvasAPI?.getDimensions();
    });
    
    expect(pixiDimensions).toBeDefined();
    expect(pixiDimensions.width).toBeGreaterThan(0);
    expect(pixiDimensions.height).toBeGreaterThan(0);
  });

  test('Performance meets requirements', async ({ page }) => {
    // Test tool switching performance
    const switchTime = await helpers.measurePerformance(async () => {
      await helpers.activateTool('pen');
      await helpers.activateTool('brush');
      await helpers.activateTool('selection');
    });
    
    // Should complete tool switches within 500ms
    expect(switchTime).toBeLessThan(500);

    // Test basic canvas interactions
    const canvasBounds = await helpers.getCanvasBounds();
    if (canvasBounds) {
      await helpers.performPointerAction('down', 100, 100);
      await helpers.performPointerAction('move', 200, 200);
      await helpers.performPointerAction('up', 200, 200);
    }

    // Verify no errors occurred during interactions
    const errors = await helpers.checkForErrors();
    expect(errors).toHaveLength(0);
  });

  test('Error handling works correctly', async ({ page }) => {
    // Test invalid tool activation
    const invalidToolResult = await page.evaluate(() => {
      return window.canvasAPI?.setTool('nonexistent-tool');
    });
    expect(invalidToolResult).toBe(false);

    // Verify no errors were thrown and we still have an active tool
    const errors = await helpers.checkForErrors();
    expect(errors).toHaveLength(0);

    const activeToolName = await page.evaluate(() => {
      return window.canvasAPI?.getActiveTool();
    });
    expect(activeToolName).toBeDefined();
  });

  test('Memory management - no leaks during tool switching', async ({ page }) => {
    // Get initial memory usage (if available)
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Switch tools multiple times
    for (let i = 0; i < 10; i++) {
      await helpers.activateTool('pen');
      await helpers.activateTool('brush');
      await helpers.activateTool('selection');
    }

    // Force garbage collection if available
    await page.evaluate(() => {
      if ((window as any).gc) {
        (window as any).gc();
      }
    });

    // Check final memory usage
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });

    // Memory should not increase significantly (allow for some growth)
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryIncrease = finalMemory - initialMemory;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB threshold
    }
  });

  test('Color management works correctly', async ({ page }) => {
    await helpers.activateTool('pen');
    
    // Change color using CanvasAPI
    const newColor = '#ff0000';
    await page.evaluate((color) => {
      window.canvasAPI?.setToolColor(color);
    }, newColor);
    
    // Verify tool settings were updated
    const toolSettings = await page.evaluate(() => {
      return window.canvasAPI?.getToolSettings();
    });
    
    expect(toolSettings).toBeDefined();
    expect(toolSettings.pen?.color).toBe(newColor);
  });

  test('Tool settings management works correctly', async ({ page }) => {
    // Update settings for pen tool
    await helpers.activateTool('pen');
    await page.evaluate(() => {
      window.canvasAPI?.setToolSettings('pen', { size: 8 });
    });
    
    // Switch to brush and update its settings
    await helpers.activateTool('brush');
    await page.evaluate(() => {
      window.canvasAPI?.setToolSettings('brush', { opacity: 0.5 });
    });
    
    // Switch back to pen tool and verify settings were persisted
    await helpers.activateTool('pen');
    const penSettings = await page.evaluate(() => {
      return window.canvasAPI?.getToolSettings()?.pen;
    });
    
    expect(penSettings?.size).toBe(8);
  });

  test('Drawing events can be enabled/disabled', async ({ page }) => {
    // Test enabling drawing events
    await page.evaluate(() => {
      window.canvasAPI?.enableDrawingEvents();
    });

    // Test disabling drawing events
    await page.evaluate(() => {
      window.canvasAPI?.disableDrawingEvents();
    });

    // Re-enable for normal operation
    await page.evaluate(() => {
      window.canvasAPI?.enableDrawingEvents();
    });

    // Verify no errors occurred
    const errors = await helpers.checkForErrors();
    expect(errors).toHaveLength(0);
  });

  test('Canvas layers are accessible', async ({ page }) => {
    // Test getting drawing layer
    const drawingLayer = await page.evaluate(() => {
      const layer = window.canvasAPI?.getDrawingLayer();
      return layer !== null;
    });
    expect(drawingLayer).toBe(true);

    // Test getting background layer
    const backgroundLayer = await page.evaluate(() => {
      const layer = window.canvasAPI?.getLayer('background');
      return layer !== null;
    });
    expect(backgroundLayer).toBe(true);
  });
});
