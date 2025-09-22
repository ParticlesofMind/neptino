import { test, expect } from '@playwright/test';

test.describe('Corner Rounding Fix', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForFunction(() => window.canvasAPI?.isReady());
  });

  test('should maintain object position when using corner rounding', async ({ page }) => {
    console.log('Starting corner rounding position test...');

    // Set tool to shapes to create a rectangle
    await page.evaluate(() => window.toolStateManager?.setTool('shapes'));
    await page.waitForTimeout(500);

    // Create a rectangle at a specific position
    const createPosition = { x: 300, y: 200 };
    await page.mouse.move(createPosition.x, createPosition.y);
    await page.mouse.down();
    await page.mouse.move(createPosition.x + 150, createPosition.y + 100);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Switch to selection tool
    await page.evaluate(() => window.toolStateManager?.setTool('selection'));
    await page.waitForTimeout(500);

    // Get the created object and its initial position
    const initialObjectData = await page.evaluate(() => {
      const objects = window.canvasAPI?.getAllObjects() || [];
      if (objects.length === 0) return null;
      
      const obj = objects[objects.length - 1]; // Get the last created object
      return {
        id: obj.id,
        x: obj.x,
        y: obj.y,
        metaX: obj.meta?.x,
        metaY: obj.meta?.y
      };
    });

    console.log('Initial object data:', initialObjectData);
    expect(initialObjectData).not.toBeNull();
    expect(initialObjectData!.x).toBeGreaterThan(250); // Should be around 300
    expect(initialObjectData!.y).toBeGreaterThan(150); // Should be around 200

    // Click on the object to select it
    await page.mouse.click(createPosition.x + 75, createPosition.y + 50);
    await page.waitForTimeout(500);

    // Find and click a corner rounding handle
    const cornerHandlePosition = await page.evaluate(() => {
      // Look for green corner rounding handles
      const handles = document.querySelectorAll('[data-corner-handle]');
      if (handles.length === 0) {
        // Try to find corner handles by looking for small green circles
        const canvasRect = document.querySelector('#coursebuilder-canvas')?.getBoundingClientRect();
        if (!canvasRect) return null;
        
        // Return approximate position of top-right corner handle
        return {
          x: canvasRect.left + 450, // createPosition.x + width + handle offset
          y: canvasRect.top + 200   // createPosition.y + handle offset
        };
      }
      
      const handle = handles[0] as HTMLElement;
      const rect = handle.getBoundingClientRect();
      return {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2
      };
    });

    if (cornerHandlePosition) {
      console.log('Clicking corner handle at:', cornerHandlePosition);
      
      // Click and drag the corner handle to apply rounding
      await page.mouse.move(cornerHandlePosition.x, cornerHandlePosition.y);
      await page.mouse.down();
      await page.mouse.move(cornerHandlePosition.x - 20, cornerHandlePosition.y - 20);
      await page.mouse.up();
      await page.waitForTimeout(500);
    } else {
      // Fallback: try clicking near where corner handles should be
      console.log('No corner handle found, trying fallback position');
      await page.mouse.click(createPosition.x + 150, createPosition.y);
      await page.waitForTimeout(500);
    }

    // Check the object position after corner rounding
    const finalObjectData = await page.evaluate(() => {
      const objects = window.canvasAPI?.getAllObjects() || [];
      if (objects.length === 0) return null;
      
      const obj = objects[objects.length - 1];
      return {
        id: obj.id,
        x: obj.x,
        y: obj.y,
        metaX: obj.meta?.x,
        metaY: obj.meta?.y
      };
    });

    console.log('Final object data:', finalObjectData);
    expect(finalObjectData).not.toBeNull();

    // The critical test: object should NOT be displaced to (0,0)
    expect(finalObjectData!.x).not.toBe(0);
    expect(finalObjectData!.y).not.toBe(0);
    
    // Object should maintain approximately the same position
    expect(Math.abs(finalObjectData!.x - initialObjectData!.x)).toBeLessThan(50);
    expect(Math.abs(finalObjectData!.y - initialObjectData!.y)).toBeLessThan(50);

    console.log('Corner rounding test completed successfully!');
  });

  test('should show debug output in console during corner rounding', async ({ page }) => {
    console.log('Testing debug output during corner rounding...');

    // Capture console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.text().includes('corner') || msg.text().includes('object position') || msg.text().includes('meta')) {
        logs.push(msg.text());
      }
    });

    // Set tool to shapes and create a rectangle
    await page.evaluate(() => window.toolStateManager?.setTool('shapes'));
    await page.waitForTimeout(500);

    await page.mouse.move(400, 300);
    await page.mouse.down();
    await page.mouse.move(550, 400);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Switch to selection tool and select the object
    await page.evaluate(() => window.toolStateManager?.setTool('selection'));
    await page.waitForTimeout(500);
    await page.mouse.click(475, 350);
    await page.waitForTimeout(500);

    // Try to interact with corner rounding
    await page.mouse.click(550, 300); // Try clicking near top-right corner
    await page.waitForTimeout(1000);

    // Check that we got some debug output
    console.log('Captured debug logs:', logs);
    expect(logs.length).toBeGreaterThan(0);
  });
});