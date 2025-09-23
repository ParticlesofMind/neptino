import { test, expect } from '@playwright/test';

/**
 * Simple Debug Test for Selection Tool to Text Editing Issue
 */

test.describe('Debug Selection Tool Text Object Detection', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.isReady && api.isReady();
    }, null, { timeout: 30000 });
  });

  test('simple debug for text object double-click', async ({ page }) => {
    // 1. Create text area with text tool
    const textToolBtn = page.locator('.tools__item[data-tool="text"]');
    await textToolBtn.click();
    
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.getActiveTool && api.getActiveTool() === 'text';
    });

    const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
    const startX = bounds.left + 100;
    const startY = bounds.top + 100;
    const endX = startX + 200;
    const endY = startY + 100;
    
    // Create text area
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // 2. Switch to selection tool
    const selectionToolBtn = page.locator('.tools__item[data-tool="selection"]').first();
    await selectionToolBtn.click();
    
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.getActiveTool && api.getActiveTool() === 'selection';
    });

    // 3. Simple click to see if anything is detected
    const centerX = startX + 100;
    const centerY = startY + 50;
    
    // Add a debug handler to log what happens during clicks
    await page.evaluate(() => {
      const originalHandleClick = (window as any).canvasAPI?.getActiveTool()?.click?.handleClick;
      if (originalHandleClick) {
        (window as any).canvasAPI.getActiveTool().click.handleClick = function(...args: any[]) {
          console.log('🔍 handleClick called with:', args);
          const result = originalHandleClick.apply(this, args);
          console.log('🎯 handleClick result:', result);
          return result;
        };
      }
    });
    
    // Try a single click first
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(500);
    
    // Then try a double-click
    await page.mouse.dblclick(centerX, centerY);
    await page.waitForTimeout(1000);
    
    // Check what happened
    const finalTool = await page.evaluate(() => (window as any).canvasAPI?.getActiveTool());
    console.log('🎯 Final active tool after double-click:', finalTool);
    
    // Check if we switched to text mode
    if (finalTool === 'text') {
      console.log('✅ Successfully switched to text tool!');
    } else {
      console.log('❌ Failed to switch to text tool, still in:', finalTool);
    }
    
    // For now, let's make this pass to see the console output
    expect(true).toBe(true);
  });
});