import { test, expect } from '@playwright/test';

/**
 * Test Selection Tool to Text Editing Workflow
 * Tests the ability to double-click text areas when in selection mode to edit them
 */

test.describe('Selection Tool - Text Editing Integration', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for canvas to be ready
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.isReady && api.isReady();
    }, null, { timeout: 30000 });
  });

  test('should double-click text area in selection mode to activate text editing', async ({ page }) => {
    // 1. First activate text tool and create a text area
    const textToolBtn = page.locator('.tools__item[data-tool="text"]');
    await expect(textToolBtn).toBeVisible();
    await textToolBtn.click();
    
    // Wait for tool activation
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.getActiveTool && api.getActiveTool() === 'text';
    });

    // Get canvas bounds and create text area
    const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
    expect(bounds).toBeTruthy();
    
    const startX = bounds.left + 100;
    const startY = bounds.top + 100;
    const endX = startX + 200;
    const endY = startY + 100;
    
    // Create text area by dragging
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY);
    await page.mouse.up();
    await page.waitForTimeout(500);
    
    // Verify text area was created
    const textAreaCount = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      return textTool && textTool.getTextAreas ? textTool.getTextAreas().length : 0;
    });
    expect(textAreaCount).toBe(1);

    // 2. Switch to selection tool
    const selectionToolBtn = page.locator('.tools__item[data-tool="selection"]').first();
    await expect(selectionToolBtn).toBeVisible();
    await selectionToolBtn.click();
    
    // Wait for tool activation
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.getActiveTool && api.getActiveTool() === 'selection';
    });

    // 3. Double-click the text area to activate text editing
    const centerX = startX + 100;
    const centerY = startY + 50;
    
    await page.mouse.dblclick(centerX, centerY);
    await page.waitForTimeout(1000); // Give time for tool switch and activation
    
    // 4. Verify that we switched back to text tool and text area is active
    const activeTool = await page.evaluate(() => (window as any).canvasAPI?.getActiveTool());
    expect(activeTool).toBe('text');
    
    // Verify text area is active for editing
    const isTextAreaActive = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      return textTool && textTool.activeTextArea && textTool.activeTextArea.isActive;
    });
    expect(isTextAreaActive).toBe(true);
    
    // Verify cursor is visible
    const cursorVisible = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      return textTool && textTool.textCursor && textTool.textCursor.visible;
    });
    expect(cursorVisible).toBe(true);
    
    // 5. Test that we can type in the text area
    const testText = 'Hello from selection mode!';
    await page.keyboard.type(testText);
    
    // Verify text was entered
    const text = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
    });
    expect(text).toBe(testText);
    
    console.log('✅ Successfully double-clicked text area from selection mode and edited text');
  });

  test('should handle clicking text area in selection mode without double-click', async ({ page }) => {
    // Create text area with text tool
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
    
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(endX, endY);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Switch to selection tool
    const selectionToolBtn = page.locator('.tools__item[data-tool="selection"]').first();
    await selectionToolBtn.click();
    
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.getActiveTool && api.getActiveTool() === 'selection';
    });

    // Single click the text area (should select it, not edit)
    const centerX = startX + 100;
    const centerY = startY + 50;
    
    await page.mouse.click(centerX, centerY);
    await page.waitForTimeout(500);
    
    // Verify we're still in selection mode
    const activeTool = await page.evaluate(() => (window as any).canvasAPI?.getActiveTool());
    expect(activeTool).toBe('selection');
    
    // Verify the text area is selected in the selection tool
    const selectedCount = await page.evaluate(() => {
      const selectionTool = (window as any).selectionTool;
      return selectionTool && selectionTool.selected ? selectionTool.selected.length : 0;
    });
    expect(selectedCount).toBeGreaterThan(0);
    
    console.log('✅ Successfully selected text area with single click in selection mode');
  });
});