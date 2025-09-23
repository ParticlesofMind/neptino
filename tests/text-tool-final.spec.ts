import { test, expect, Page } from '@playwright/test';

/**
 * Final Text Tool Test Suite
 * Comprehensive testing with correct API method calls
 */

class TextToolTestHelpers {
  constructor(private page: Page) {}

  async waitForCanvasReady() {
    await this.page.waitForFunction(() => {
      return !!(window as any).canvasAPI && 
             !!(window as any).toolStateManager && 
             (window as any).canvasAPI.isReady();
    }, null, { timeout: 15000 });
  }

  async setTextTool() {
    return await this.page.evaluate(() => {
      return (window as any).canvasAPI?.setTool('text');
    });
  }

  async getCurrentTool() {
    return await this.page.evaluate(() => {
      return (window as any).toolStateManager?.getCurrentTool();
    });
  }

  async getCanvasActiveTool() {
    return await this.page.evaluate(() => {
      return (window as any).canvasAPI?.getActiveTool();
    });
  }

  async getContentBounds() {
    return await this.page.evaluate(() => {
      return (window as any).canvasAPI?.getContentBounds();
    });
  }

  async dragToCreateTextArea(startX: number, startY: number, endX: number, endY: number) {
    await this.page.mouse.move(startX, startY);
    await this.page.mouse.down();
    await this.page.mouse.move(endX, endY);
    await this.page.mouse.up();
    
    // Wait for text area creation
    await this.page.waitForTimeout(100);
  }

  async getTextAreas() {
    return await this.page.evaluate(() => {
      const textTool = (window as any).textTool;
      return textTool ? textTool.textAreas?.length || 0 : 0;
    });
  }

  async isTextAreaActive() {
    return await this.page.evaluate(() => {
      const textTool = (window as any).textTool;
      return !!(textTool && textTool.activeTextArea && textTool.activeTextArea.isActive);
    });
  }

  async typeText(text: string) {
    for (const char of text) {
      await this.page.keyboard.type(char);
      await this.page.waitForTimeout(10);
    }
  }

  async getTextContent() {
    return await this.page.evaluate(() => {
      const textTool = (window as any).textTool;
      if (textTool && textTool.activeTextArea && textTool.activeTextArea.textHandler) {
        return textTool.activeTextArea.textHandler.getText();
      }
      return '';
    });
  }

  async getCursorPosition() {
    return await this.page.evaluate(() => {
      const textTool = (window as any).textTool;
      if (textTool && textTool.activeTextArea && textTool.activeTextArea.textHandler) {
        return textTool.activeTextArea.textHandler.getCursorPosition();
      }
      return -1;
    });
  }

  async pressCursorKey(key: string) {
    await this.page.keyboard.press(key);
    await this.page.waitForTimeout(50);
  }

  async getFontSize() {
    return await this.page.evaluate(() => {
      const textTool = (window as any).textTool;
      if (textTool && textTool.settings) {
        return textTool.settings.fontSize;
      }
      return null;
    });
  }

  async setFontSize(size: number) {
    return await this.page.evaluate((newSize) => {
      const textTool = (window as any).textTool;
      if (textTool && textTool.updateSettings) {
        textTool.updateSettings({ fontSize: newSize });
        return true;
      }
      return false;
    }, size);
  }
}

test.describe('Text Tool - Final Comprehensive Tests', () => {
  let helpers: TextToolTestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TextToolTestHelpers(page);
    
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await helpers.waitForCanvasReady();
  });

  test('01 - Tool selectors exist with correct attributes', async ({ page }) => {
    // Verify text tool selector exists
    const textToolSelector = page.locator('.tools__item[data-tool="text"]');
    await expect(textToolSelector).toBeVisible();
    
    // Verify selection tool selector exists
    const selectionToolSelector = page.locator('.tools__item[data-tool="selection"]');
    await expect(selectionToolSelector).toBeVisible();
    
    console.log('✅ Tool selectors found with correct data-tool attributes');
  });

  test('02 - Text tool activation and state management', async () => {
    // Activate text tool
    const success = await helpers.setTextTool();
    expect(success).toBe(true);
    
    // Verify both state managers agree
    const toolStateManagerTool = await helpers.getCurrentTool();
    const canvasApiTool = await helpers.getCanvasActiveTool();
    
    expect(toolStateManagerTool).toBe('text');
    expect(canvasApiTool).toBe('text');
    
    console.log('✅ Text tool activation and state management working');
  });

  test('03 - Text area creation through drag interaction', async () => {
    await helpers.setTextTool();
    
    // Get canvas bounds for positioning
    const bounds = await helpers.getContentBounds();
    expect(bounds).toBeDefined();
    
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // Create text area by dragging
    await helpers.dragToCreateTextArea(
      centerX - 50, centerY - 25,
      centerX + 50, centerY + 25
    );
    
    // Verify text area was created
    const textAreaCount = await helpers.getTextAreas();
    expect(textAreaCount).toBe(1);
    
    console.log('✅ Text area creation through drag working');
  });

  test('04 - Double-click activation and text input', async ({ page }) => {
    await helpers.setTextTool();
    
    const bounds = await helpers.getContentBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // Create text area
    await helpers.dragToCreateTextArea(
      centerX - 50, centerY - 25,
      centerX + 50, centerY + 25
    );
    
    // Double-click to activate for editing
    await page.mouse.dblclick(centerX, centerY);
    await page.waitForTimeout(200);
    
    // Check if text area is active for editing
    const isActive = await helpers.isTextAreaActive();
    expect(isActive).toBe(true);
    
    // Type some text
    const testText = 'Hello World';
    await helpers.typeText(testText);
    
    // Verify text was entered
    const content = await helpers.getTextContent();
    expect(content).toBe(testText);
    
    console.log('✅ Double-click activation and text input working');
  });

  test('05 - Cursor positioning and navigation', async ({ page }) => {
    await helpers.setTextTool();
    
    const bounds = await helpers.getContentBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // Create and activate text area
    await helpers.dragToCreateTextArea(
      centerX - 50, centerY - 25,
      centerX + 50, centerY + 25
    );
    await page.mouse.dblclick(centerX, centerY);
    
    // Type text
    const testText = 'Test cursor navigation';
    await helpers.typeText(testText);
    
    // Test cursor navigation
    await helpers.pressCursorKey('Home');
    let cursorPos = await helpers.getCursorPosition();
    expect(cursorPos).toBe(0);
    
    await helpers.pressCursorKey('End');
    cursorPos = await helpers.getCursorPosition();
    expect(cursorPos).toBe(testText.length);
    
    await helpers.pressCursorKey('ArrowLeft');
    cursorPos = await helpers.getCursorPosition();
    expect(cursorPos).toBe(testText.length - 1);
    
    console.log('✅ Cursor positioning and navigation working');
  });

  test('06 - Font size modification', async () => {
    await helpers.setTextTool();
    
    // Get initial font size
    const initialSize = await helpers.getFontSize();
    expect(initialSize).toBeGreaterThan(0);
    
    // Change font size
    const newSize = 24;
    const success = await helpers.setFontSize(newSize);
    expect(success).toBe(true);
    
    // Verify font size changed
    const updatedSize = await helpers.getFontSize();
    expect(updatedSize).toBe(newSize);
    
    console.log('✅ Font size modification working');
  });

  test('07 - Tool switching workflow', async ({ page }) => {
    // Start with text tool
    await helpers.setTextTool();
    expect(await helpers.getCurrentTool()).toBe('text');
    
    // Switch to selection tool
    const selectionSuccess = await page.evaluate(() => {
      return (window as any).canvasAPI?.setTool('selection');
    });
    expect(selectionSuccess).toBe(true);
    expect(await helpers.getCurrentTool()).toBe('selection');
    
    // Switch back to text tool
    await helpers.setTextTool();
    expect(await helpers.getCurrentTool()).toBe('text');
    
    console.log('✅ Tool switching workflow working');
  });

  test('08 - Performance baseline test', async ({ page }) => {
    const startTime = Date.now();
    
    await helpers.setTextTool();
    
    const bounds = await helpers.getContentBounds();
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    // Create text area
    await helpers.dragToCreateTextArea(
      centerX - 50, centerY - 25,
      centerX + 50, centerY + 25
    );
    
    // Activate and type
    await page.mouse.dblclick(centerX, centerY);
    await helpers.typeText('Performance test');
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Reasonable performance expectation (should complete within 5 seconds)
    expect(duration).toBeLessThan(5000);
    
    console.log(`✅ Performance test completed in ${duration}ms`);
  });
});