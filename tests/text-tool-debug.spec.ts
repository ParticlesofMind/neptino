import { test, expect } from '@playwright/test';

/**
 * Debug Test Suite for Text Tool Issues
 * Focuses on identifying and fixing core problems
 */

test.describe('Text Tool - Debug Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    
    // Wait for basic initialization
    await page.waitForFunction(() => {
      return !!(window as any).canvasAPI && 
             !!(window as any).toolStateManager && 
             (window as any).canvasAPI.isReady();
    }, null, { timeout: 15000 });
  });

  test('01 - Debug tool selector elements', async ({ page }) => {
    // Check for selection tool selectors
    const selectionTools = await page.locator('.tools__item[data-tool="selection"]').count();
    console.log(`Found ${selectionTools} selection tool selectors`);
    
    // List all tool selectors
    const toolSelectors = await page.evaluate(() => {
      const tools = Array.from(document.querySelectorAll('[data-tool]'));
      return tools.map(el => ({
        tool: el.getAttribute('data-tool'),
        classes: el.className,
        text: el.textContent?.trim(),
        visible: (el as HTMLElement).offsetParent !== null
      }));
    });
    
    console.log('All tool selectors:', toolSelectors);
    
    // Focus on visible text tool
    const textToolSelectors = toolSelectors.filter(t => t.tool === 'text' && t.visible);
    expect(textToolSelectors).toHaveLength(1);
  });

  test('02 - Debug tool activation synchronization', async ({ page }) => {
    // Initial state
    let canvasTool = await page.evaluate(() => (window as any).canvasAPI?.getActiveTool());
    let uiTool = await page.evaluate(() => (window as any).toolStateManager?.getCurrentTool());
    
    console.log(`Initial: Canvas="${canvasTool}", UI="${uiTool}"`);
    
    // Try to activate text tool via CanvasAPI
    const apiSuccess = await page.evaluate(() => {
      return (window as any).canvasAPI?.setTool('text');
    });
    console.log(`CanvasAPI.setTool('text') returned: ${apiSuccess}`);
    
    // Check states immediately after
    canvasTool = await page.evaluate(() => (window as any).canvasAPI?.getActiveTool());
    uiTool = await page.evaluate(() => (window as any).toolStateManager?.getCurrentTool());
    
    console.log(`After API: Canvas="${canvasTool}", UI="${uiTool}"`);
    
    // Try to activate via ToolStateManager
    await page.evaluate(() => {
      (window as any).toolStateManager?.setTool('text');
    });
    
    // Wait a bit for synchronization
    await page.waitForTimeout(200);
    
    canvasTool = await page.evaluate(() => (window as any).canvasAPI?.getActiveTool());
    uiTool = await page.evaluate(() => (window as any).toolStateManager?.getCurrentTool());
    
    console.log(`After UI Manager: Canvas="${canvasTool}", UI="${uiTool}"`);
    
    // Both should agree
    expect(canvasTool).toBe(uiTool);
  });

  test('03 - Debug canvas bounds and mouse coordinates', async ({ page }) => {
    // Get content bounds
    const bounds = await page.evaluate(() => {
      return (window as any).canvasAPI?.getContentBounds();
    });
    
    console.log('Content bounds:', bounds);
    expect(bounds).toBeDefined();
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.y).toBeGreaterThanOrEqual(0);
    expect(bounds.width).toBeGreaterThan(0);
    expect(bounds.height).toBeGreaterThan(0);
    
    // Test if coordinates are valid for mouse operations
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height / 2;
    
    console.log(`Center coordinates: (${centerX}, ${centerY})`);
    
    // Try a simple mouse move to test coordinate validity
    try {
      await page.mouse.move(centerX, centerY);
      console.log('✅ Mouse move successful');
    } catch (error) {
      console.log('❌ Mouse move failed:', error);
      throw error;
    }
  });

  test('04 - Debug text tool instance and global exposure', async ({ page }) => {
    // First activate text tool
    await page.evaluate(() => {
      (window as any).toolStateManager?.setTool('text');
    });
    
    await page.waitForTimeout(100);
    
    // Check if textTool is exposed globally
    const textToolInfo = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      if (!textTool) return { exists: false };
      
      return {
        exists: true,
        hasTextAreas: typeof textTool.textAreas !== 'undefined',
        textAreaCount: textTool.textAreas?.length || 0,
        hasSettings: typeof textTool.settings !== 'undefined',
        isActive: textTool.isActive || false,
        hasActiveTextArea: !!textTool.activeTextArea,
        methods: Object.getOwnPropertyNames(textTool).filter(name => typeof textTool[name] === 'function')
      };
    });
    
    console.log('Text tool global info:', textToolInfo);
    expect(textToolInfo.exists).toBe(true);
  });

  test('05 - Debug simplest text area creation', async ({ page }) => {
    // Activate text tool
    await page.evaluate(() => {
      (window as any).toolStateManager?.setTool('text');
    });
    
    await page.waitForTimeout(100);
    
    // Use debug method to create text area programmatically
    const createResult = await page.evaluate(() => {
      const textTool = (window as any).textTool;
      if (!textTool || typeof textTool.debugCreateAndActivate !== 'function') {
        return { success: false, error: 'Text tool or debug method not available' };
      }
      
      try {
        textTool.debugCreateAndActivate({ x: 100, y: 100, width: 200, height: 80 });
        return { 
          success: true, 
          textAreaCount: textTool.textAreas?.length || 0,
          hasActiveTextArea: !!textTool.activeTextArea
        };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });
    
    console.log('Programmatic text area creation:', createResult);
    expect(createResult.success).toBe(true);
    expect(createResult.textAreaCount).toBe(1);
  });

  test('06 - Debug click activation via UI', async ({ page }) => {
    // Find the visible text tool selector
    const textToolSelector = page.locator('.tools__item[data-tool="text"]').first();
    await expect(textToolSelector).toBeVisible();
    
    // Click it
    await textToolSelector.click();
    
    // Wait for activation
    await page.waitForTimeout(200);
    
    // Check results
    const activationResult = await page.evaluate(() => {
      const canvasTool = (window as any).canvasAPI?.getActiveTool();
      const uiTool = (window as any).toolStateManager?.getCurrentTool();
      const textToolExists = !!(window as any).textTool;
      
      return {
        canvasTool,
        uiTool,
        textToolExists,
        synchronized: canvasTool === uiTool
      };
    });
    
    console.log('UI click activation result:', activationResult);
    expect(activationResult.synchronized).toBe(true);
    expect(activationResult.canvasTool).toBe('text');
  });
});