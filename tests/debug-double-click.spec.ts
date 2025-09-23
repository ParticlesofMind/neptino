import { test, expect } from '@playwright/test';

test.describe('Debug Double-Click Detection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForFunction(() => window.canvasAPI?.isReady());
  });

  test('should debug double-click and text object detection', async ({ page }) => {
    // Intercept console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Add comprehensive debugging to the click selection
    await page.evaluate(() => {
      const selectionTool = window.toolStateManager?.tools?.get('selection');
      if (selectionTool && selectionTool.click) {
        const clickSelection = selectionTool.click;
        
        // Debug isTextObject
        const originalIsTextObject = clickSelection.isTextObject;
        clickSelection.isTextObject = function(object: any) {
          const result = originalIsTextObject.call(this, object);
          console.log('🔍 isTextObject called with:', {
            object: object?.constructor?.name,
            hasText: object?.text !== undefined,
            isTextObject: object?.isTextObject,
            result: result
          });
          return result;
        };
        
        // Debug handleClick
        const originalHandleClick = clickSelection.handleClick;
        clickSelection.handleClick = function(point: any, container: any, modifiers: any, onTextEdit: any) {
          console.log('🎯 handleClick called with point:', point.x, point.y);
          const result = originalHandleClick.call(this, point, container, modifiers, onTextEdit);
          console.log('🎯 handleClick result:', {
            clickedObject: result.clickedObject?.constructor?.name,
            isDoubleClick: result.isDoubleClick,
            isTextObject: result.clickedObject ? this.isTextObject(result.clickedObject) : false
          });
          return result;
        };
      } else {
        console.log('❌ Selection tool or click not found');
      }
    });

    // Switch to text tool and create a text area
    await page.evaluate(() => window.toolStateManager?.setTool('text'));
    
    // Create text area by dragging
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(500, 400);
    await page.mouse.up();
    
    // Type some text
    await page.keyboard.type('Hello World');
    
    // Switch to selection tool
    await page.evaluate(() => window.toolStateManager?.setTool('selection'));
    
    // Wait a bit for tool switch
    await page.waitForTimeout(100);
    
    // First click to see what gets detected
    console.log('--- First click ---');
    await page.mouse.click(400, 350);
    await page.waitForTimeout(200);
    
    // Second click quickly to trigger double-click
    console.log('--- Second click (double-click) ---');
    await page.mouse.click(400, 350);
    
    // Wait for any async operations
    await page.waitForTimeout(500);
    
    // Check logs
    console.log('Captured logs:', logs);
    
    // At minimum, we should see handleClick being called
    const handleClickCalled = logs.some(log => log.includes('handleClick called'));
    expect(handleClickCalled).toBe(true);
  });
});