import { test, expect } from '@playwright/test';

test.describe('Debug Text Tool Activation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForFunction(() => window.canvasAPI?.isReady());
  });

  test('should log when activateTextObjectForEditing is called', async ({ page }) => {
    // Intercept console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Add debug logging to the text tool method
    await page.evaluate(() => {
      const textTool = window.toolStateManager?.tools?.get('text');
      if (textTool && textTool.activateTextObjectForEditing) {
        const originalMethod = textTool.activateTextObjectForEditing;
        textTool.activateTextObjectForEditing = function(...args: any[]) {
          console.log('🔥 activateTextObjectForEditing CALLED with args:', args.length);
          return originalMethod.apply(this, args);
        };
      } else {
        console.log('❌ Text tool or method not found');
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
    
    // Now double-click the text area
    await page.mouse.dblclick(400, 350);
    
    // Wait for any async operations
    await page.waitForTimeout(500);
    
    // Check logs
    console.log('Captured logs:', logs);
    
    // Check if the method was called
    const methodCalled = logs.some(log => log.includes('activateTextObjectForEditing CALLED'));
    expect(methodCalled).toBe(true);
  });
});