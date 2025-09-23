import { test, expect } from '@playwright/test';

/**
 * Working Text Tool Test Suite
 * Based on debug findings, using correct APIs and patterns
 */

test.describe('Text Tool - Working Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    
    // Wait for canvas initialization
    await page.waitForFunction(() => {
      return !!(window as any).canvasAPI && 
             !!(window as any).toolStateManager && 
             (window as any).canvasAPI.isReady();
    }, null, { timeout: 15000 });
  });

  test('01 - Text tool activation via UI click', async ({ page }) => {
    // Click text tool in UI
    await page.locator('.tools__item[data-tool="text"]').first().click();
    
    // Wait for activation
    await page.waitForTimeout(200);
    
    // Verify activation
    const activationResult = await page.evaluate(() => {
      const canvasTool = (window as any).canvasAPI?.getActiveTool();
      const uiTool = (window as any).toolStateManager?.getCurrentTool();
      return { canvasTool, uiTool, synchronized: canvasTool === uiTool };
    });
    
    expect(activationResult.synchronized).toBe(true);
    expect(activationResult.canvasTool).toBe('text');
    
    console.log('✅ Text tool activation successful');
  });

  test('02 - Text area creation via programmatic method', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').first().click();
    await page.waitForTimeout(100);
    
    // Create text area programmatically
    const createResult = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      if (!textTool || typeof textTool.debugCreateAndActivate !== 'function') {
        return { success: false, error: 'Text tool not available' };
      }
      
      try {
        // Create a 200x80 text area at position (150, 150)
        textTool.debugCreateAndActivate({ x: 150, y: 150, width: 200, height: 80 });
        return { 
          success: true, 
          textAreaCount: textTool.textAreas?.length || 0,
          hasActiveTextArea: !!textTool.activeTextArea
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });
    
    expect(createResult.success).toBe(true);
    expect(createResult.textAreaCount).toBe(1);
    expect(createResult.hasActiveTextArea).toBe(true);
    
    console.log('✅ Text area creation successful');
  });

  test('03 - Text input and basic editing', async ({ page }) => {
    // Activate text tool and create text area
    await page.locator('.tools__item[data-tool="text"]').first().click();
    await page.waitForTimeout(100);
    
    await page.evaluate(() => {
      const textTool = (window as any).textTool;
      textTool.debugCreateAndActivate({ x: 150, y: 150, width: 200, height: 80 });
    });
    
    // Type some text
    const testText = 'Hello World!';
    await page.keyboard.type(testText);
    
    // Verify text was entered
    const textContent = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      if (textTool && textTool.activeTextArea && textTool.activeTextArea.textHandler) {
        return textTool.activeTextArea.textHandler.getText();
      }
      return '';
    });
    
    expect(textContent).toBe(testText);
    
    console.log('✅ Text input successful');
  });

  test('04 - Cursor movement and navigation', async ({ page }) => {
    // Setup text area with content
    await page.locator('.tools__item[data-tool="text"]').first().click();
    await page.waitForTimeout(100);
    
    await page.evaluate(() => {
      const textTool = (window as any).textTool;
      textTool.debugCreateAndActivate({ x: 150, y: 150, width: 200, height: 80 });
    });
    
    const testText = 'Test cursor movement';
    await page.keyboard.type(testText);
    
    // Test Home key
    await page.keyboard.press('Home');
    let cursorPos = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      if (textTool && textTool.activeTextArea && textTool.activeTextArea.textHandler) {
        return textTool.activeTextArea.textHandler.getCursorPosition();
      }
      return -1;
    });
    expect(cursorPos).toBe(0);
    
    // Test End key
    await page.keyboard.press('End');
    cursorPos = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      if (textTool && textTool.activeTextArea && textTool.activeTextArea.textHandler) {
        return textTool.activeTextArea.textHandler.getCursorPosition();
      }
      return -1;
    });
    expect(cursorPos).toBe(testText.length);
    
    console.log('✅ Cursor navigation successful');
  });

  test('05 - Font size modification', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').first().click();
    await page.waitForTimeout(100);
    
    // Get initial font size
    const initialSize = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      return textTool ? textTool.settings?.fontSize : null;
    });
    expect(initialSize).toBeGreaterThan(0);
    
    // Change font size
    const newSize = 24;
    const success = await page.evaluate((size) => {
      const textTool = (window as any).textTool;
      if (textTool && textTool.updateSettings) {
        textTool.updateSettings({ fontSize: size });
        return true;
      }
      return false;
    }, newSize);
    expect(success).toBe(true);
    
    // Verify font size changed
    const updatedSize = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      return textTool ? textTool.settings?.fontSize : null;
    });
    expect(updatedSize).toBe(newSize);
    
    console.log('✅ Font size modification successful');
  });

  test('06 - Multiple text areas management', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').first().click();
    await page.waitForTimeout(100);
    
    // Create multiple text areas
    await page.evaluate(() => {
      const textTool = (window as any).textTool;
      // Create first text area
      textTool.debugCreateAndActivate({ x: 100, y: 100, width: 150, height: 60 });
    });
    
    await page.keyboard.type('First area');
    
    // Create second text area
    await page.evaluate(() => {
      const textTool = (window as any).textTool;
      textTool.debugCreateAndActivate({ x: 300, y: 150, width: 150, height: 60 });
    });
    
    await page.keyboard.type('Second area');
    
    // Verify multiple text areas exist
    const textAreaInfo = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      return {
        count: textTool.textAreas?.length || 0,
        hasActiveArea: !!textTool.activeTextArea,
        firstAreaText: textTool.textAreas?.[0]?.textHandler?.getText() || '',
        secondAreaText: textTool.textAreas?.[1]?.textHandler?.getText() || ''
      };
    });
    
    expect(textAreaInfo.count).toBe(2);
    expect(textAreaInfo.hasActiveArea).toBe(true);
    expect(textAreaInfo.firstAreaText).toBe('First area');
    expect(textAreaInfo.secondAreaText).toBe('Second area');
    
    console.log('✅ Multiple text areas management successful');
  });

  test('07 - Tool switching preserves text areas', async ({ page }) => {
    // Create text area with content
    await page.locator('.tools__item[data-tool="text"]').first().click();
    await page.waitForTimeout(100);
    
    await page.evaluate(() => {
      const textTool = (window as any).textTool;
      textTool.debugCreateAndActivate({ x: 150, y: 150, width: 200, height: 80 });
    });
    
    await page.keyboard.type('Persistent text');
    
    // Switch to selection tool
    await page.locator('.tools__item[data-tool="selection"]').first().click();
    await page.waitForTimeout(100);
    
    // Switch back to text tool
    await page.locator('.tools__item[data-tool="text"]').first().click();
    await page.waitForTimeout(100);
    
    // Verify text area still exists
    const textAreaPersistence = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      return {
        count: textTool.textAreas?.length || 0,
        text: textTool.textAreas?.[0]?.textHandler?.getText() || ''
      };
    });
    
    expect(textAreaPersistence.count).toBe(1);
    expect(textAreaPersistence.text).toBe('Persistent text');
    
    console.log('✅ Tool switching preserves text areas');
  });

  test('08 - Performance benchmark', async ({ page }) => {
    const startTime = Date.now();
    
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').first().click();
    await page.waitForTimeout(100);
    
    // Create text area and type
    await page.evaluate(() => {
      const textTool = (window as any).textTool;
      textTool.debugCreateAndActivate({ x: 150, y: 150, width: 200, height: 80 });
    });
    
    await page.keyboard.type('Performance test text');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Should complete within reasonable time (3 seconds)
    expect(duration).toBeLessThan(3000);
    
    console.log(`✅ Performance test completed in ${duration}ms`);
  });
});