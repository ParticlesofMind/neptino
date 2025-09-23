import { test, expect } from '@playwright/test';

/**
 * Debug Test for Selection Tool to Text Editing Issue
 */

test.describe('Debug Selection Tool Text Object Detection', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.isReady && api.isReady();
    }, null, { timeout: 30000 });
  });

  test('debug text object detection and double-click handling', async ({ page }) => {
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
    
    // Add some content for visibility
    const centerX = startX + 100;
    const centerY = startY + 50;
    await page.mouse.dblclick(centerX, centerY);
    await page.waitForTimeout(200);
    await page.keyboard.type('Test Text');
    await page.waitForTimeout(200);

    // 2. Switch to selection tool
    const selectionToolBtn = page.locator('.tools__item[data-tool="selection"]').first();
    await selectionToolBtn.click();
    
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.getActiveTool && api.getActiveTool() === 'selection';
    });

    // 3. Debug: Check what objects exist at the target point
    const debugInfo = await page.evaluate((coords) => {
      const api = (window as any).canvasAPI;
      if (!api) return { error: 'No canvas API' };
      
      const container = api.getDrawingLayer();
      if (!container) return { error: 'No drawing layer' };
      
      const localPoint = container.toLocal({ x: coords.x, y: coords.y });
      
      // Get the selection tool's click handler
      const selectionTool = api.getActiveTool();
      const clickSelection = (selectionTool as any)?.click;
      
      if (!clickSelection) return { error: 'No click selection' };
      
      // Get objects at point
      const objectsAtPoint = clickSelection.getObjectsAtPoint(localPoint, container);
      
      // Check each object
      const objectDetails = objectsAtPoint.map((obj, index) => ({
        index,
        constructor: obj?.constructor?.name,
        isTextObject: clickSelection.isTextObject(obj),
        hasTextProperty: obj.text !== undefined,
        hasIsTextObjectFlag: obj.isTextObject === true,
        name: obj.name,
        textAreaId: obj.textAreaId,
        hasTextArea: !!(obj as any).__textArea,
        bounds: obj.getBounds ? {
          x: obj.getBounds().x,
          y: obj.getBounds().y,
          width: obj.getBounds().width,
          height: obj.getBounds().height
        } : 'No bounds'
      }));
      
      return {
        localPoint,
        objectCount: objectsAtPoint.length,
        objectDetails,
        selectionToolExists: !!selectionTool,
        clickSelectionExists: !!clickSelection
      };
    }, { x: centerX, y: centerY });
    
    console.log('🔍 Debug info:', JSON.stringify(debugInfo, null, 2));
    
    // Check if any text objects were found
    expect(debugInfo.objectCount).toBeGreaterThan(0);
    
    // Check if at least one object is identified as a text object
    const hasTextObject = debugInfo.objectDetails?.some(obj => obj.isTextObject);
    expect(hasTextObject).toBe(true);
    
    // 4. Try the double-click
    await page.mouse.dblclick(centerX, centerY);
    await page.waitForTimeout(1000);
    
    // Check if tool switched
    const finalTool = await page.evaluate(() => (window as any).canvasAPI?.getActiveTool());
    console.log('🎯 Final active tool:', finalTool);
    
    expect(finalTool).toBe('text');
  });
});