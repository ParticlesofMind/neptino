import { test, expect } from '@playwright/test';

/**
 * Fixed Text Tool Test
 * Using proper timing and better wait conditions
 */

test.describe('Text Tool - Fixed Timing', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for the UI components to be initialized first
    await page.waitForFunction(() => {
      return !!(window as any).uiEventHandler && !!(window as any).toolStateManager;
    }, null, { timeout: 10000 });
    
    // THEN wait for canvas to be ready with longer timeout
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.isReady && api.isReady();
    }, null, { timeout: 30000 }); // Increased timeout
    
    // Activate text tool
    const textToolBtn = page.locator('.tools__item[data-tool="text"]');
    await expect(textToolBtn).toBeVisible();
    await textToolBtn.locator('.tools__icon').click();
    
    // Wait for tool activation
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.getActiveTool && api.getActiveTool() === 'text';
    });
  });

  test('should activate text tool successfully', async ({ page }) => {
    // Verify tool is active
    const activeTool = await page.evaluate(() => (window as any).canvasAPI?.getActiveTool());
    expect(activeTool).toBe('text');
    
    // Verify text tool settings are visible
    const textSettings = page.locator('.tools__item--text');
    await expect(textSettings).toBeVisible();
  });

  test('should create text area with drag', async ({ page }) => {
    // Get content bounds for safe interaction
    const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
    expect(bounds).toBeTruthy();
    
    const startX = bounds.left + 100;
    const startY = bounds.top + 100;
    const endX = startX + 200;
    const endY = startY + 100;
    
    // Perform drag operation
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY);
    await page.mouse.up();
    
    // Wait for text area to be created
    await page.waitForTimeout(500);
    
    // Verify text area exists via API
    const hasTextArea = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      return textTool && textTool.getTextAreas && textTool.getTextAreas().length > 0;
    });
    
    expect(hasTextArea).toBe(true);
  });
});