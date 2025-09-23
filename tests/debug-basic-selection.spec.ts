import { test, expect } from '@playwright/test';

test.describe('Debug Basic Selection Tool', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForFunction(() => window.canvasAPI?.isReady());
  });

  test('should debug selection tool onPointerDown calls', async ({ page }) => {
    // Intercept console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Add debugging to the selection tool onPointerDown
    await page.evaluate(() => {
      const selectionTool = window.toolStateManager?.tools?.get('selection');
      if (selectionTool && selectionTool.onPointerDown) {
        const originalOnPointerDown = selectionTool.onPointerDown;
        selectionTool.onPointerDown = function(event: any, container: any) {
          console.log('🚀 SelectionTool.onPointerDown called with point:', event.global.x, event.global.y);
          console.log('🚀 Tool is active:', this.isActive);
          return originalOnPointerDown.call(this, event, container);
        };
      } else {
        console.log('❌ Selection tool or onPointerDown not found');
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
    
    // First click to see what gets called
    console.log('--- First click ---');
    await page.mouse.click(400, 350);
    await page.waitForTimeout(200);
    
    // Check logs
    console.log('Captured logs:', logs);
    
    // At minimum, we should see onPointerDown being called
    const onPointerDownCalled = logs.some(log => log.includes('SelectionTool.onPointerDown called'));
    expect(onPointerDownCalled).toBe(true);
  });
});