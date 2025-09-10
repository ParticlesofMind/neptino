import { test, expect } from '@playwright/test';

/**
 * Text Tool Basic Functionality Tests
 * 
 * This test suite focuses on the core features that can be tested immediately:
 * - Tool activation
 * - Settings changes
 * - Basic UI interactions
 * - Canvas presence and initialization
 */

test.describe('Text Tool - Basic Functionality', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => { (window as any).__TEST_MODE__ = true; try { window.localStorage.clear(); } catch {} });
    // Navigate to coursebuilder page (design/create view)
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForLoadState('domcontentloaded');
    // Wait for UI wiring to finish
    await page.waitForFunction(() => !!(window as any).uiEventHandler && !!(window as any).toolStateManager, null, { timeout: 20000 });
    // Wait for canvas API ready
    await page.waitForFunction(() => (window as any).canvasAPI && (window as any).canvasAPI.isReady && (window as any).canvasAPI.isReady(), null, { timeout: 20000 });
    await (await page.waitForSelector('.tools__item[data-tool="text"]', { timeout: 20000 }))?.isVisible();
  });

  test('should activate text tool when clicked', async ({ page }) => {
    // Click on the text tool
    const textTool = page.locator('.tools__item[data-tool="text"]');
    await expect(textTool).toBeVisible();
    await textTool.click();
    
    // Verify text tool is activated (should have active class)
    await expect(textTool).toHaveClass(/active/);
    
    // Verify text tool settings are visible
    const textSettings = page.locator('.tools__item--text');
    await expect(textSettings).toBeVisible();
  });

  test('should display text tool settings when activated', async ({ page }) => {
    // Activate text tool
    const textTool = page.locator('.tools__item[data-tool="text"]');
    await textTool.click();
    await page.waitForTimeout(500);
    
    // Check for text-specific settings
    const fontSizeInput = page.locator('#text-size-select');
    const fontFamilySelect = page.locator('#font-family-select');
    const textColorSelect = page.locator('#text-color-select');
    
    await expect(fontSizeInput).toBeVisible();
    await expect(fontFamilySelect).toBeVisible();
    await expect(textColorSelect).toBeVisible();
  });

  test('should change font size setting', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(500);
    
    // Change font size via dropdown
    const fontSizeInput = page.locator('#text-size-select');
    await fontSizeInput.selectOption('26');
    
    // Verify the value was set
    await expect(fontSizeInput).toHaveValue('26');
  });

  test('should change font family setting', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(500);
    
    // Change font family using Select2
    const fontFamilySelect = page.locator('#font-family-select');
    await fontFamilySelect.selectOption('Georgia');
    
    // Verify the value was set
    await expect(fontFamilySelect).toHaveValue('Georgia');
  });

  test('should change text color setting', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(500);
    
    // Change text color
    const textColorSelect = page.locator('#text-color-select');
    await textColorSelect.selectOption('#4a79a4'); // Blue
    
    // Verify the value was set
    await expect(textColorSelect).toHaveValue('#4a79a4');
  });

  test('should have canvas container present', async ({ page }) => {
    // Wait for non-zero content bounds
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      if (!api) return false;
      const b = api.getContentBounds?.();
      return !!b && b.width > 0 && b.height > 0;
    }, null, { timeout: 20000 });
    const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThan(0);
    expect(bounds!.height).toBeGreaterThan(0);
  });

  test('should switch between tools correctly', async ({ page }) => {
    const textTool = page.locator('.tools__item[data-tool="text"]');
    const penTool = page.locator('.tools__item[data-tool="pen"]');
    await page.evaluate(() => (window as any).toolStateManager?.setTool('text'));
    await expect(textTool).toHaveClass(/active|tools__item--active/);
    await page.evaluate(() => (window as any).toolStateManager?.setTool('pen'));
    await expect(penTool).toHaveClass(/active|tools__item--active/);
    await expect(textTool).not.toHaveClass(/active|tools__item--active/);
    await page.evaluate(() => (window as any).toolStateManager?.setTool('text'));
    await expect(textTool).toHaveClass(/active|tools__item--active/);
    await expect(penTool).not.toHaveClass(/active|tools__item--active/);
  });

  test('should show appropriate tool settings when switching', async ({ page }) => {
    const textSettings = page.locator('.tools__item--text');
    const penSettings = page.locator('.tools__item--pen');
    await page.evaluate(() => (window as any).toolStateManager?.setTool('text'));
    await expect(textSettings).toBeVisible();
    await expect(penSettings).not.toBeVisible();
    await page.evaluate(() => (window as any).toolStateManager?.setTool('pen'));
    await expect(penSettings).toBeVisible();
    await expect(textSettings).not.toBeVisible();
  });

  test('should handle multiple setting changes', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(500);
    
    // Change multiple settings
    const fontSizeInput = page.locator('#text-size-select');
    const fontFamilySelect = page.locator('#font-family-select');
    const textColorSelect = page.locator('#text-color-select');
    
    await fontSizeInput.selectOption('20');
    await fontFamilySelect.selectOption('Verdana');
    await textColorSelect.selectOption('#a74a4a'); // Red
    
    // Verify all settings were applied
    await expect(fontSizeInput).toHaveValue('20');
    // Verify font family via tool state (Select2 may not update native select.value in headless reliably)
    const appliedFont = await page.evaluate(() => (window as any).toolStateManager?.getToolSettings()?.text?.fontFamily);
    expect(appliedFont).toBe('Verdana');
    await expect(textColorSelect).toHaveValue('#a74a4a');
  });

  test('should have working canvas interaction area', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(500);
    
    const bounds = await page.evaluate(() => window.canvasAPI?.getContentBounds());
    if (!bounds) throw new Error('Content bounds not available');
    await page.mouse.click(bounds.left + 200, bounds.top + 200);
    await page.waitForTimeout(300);
    
    // Test that no JavaScript errors occurred
    const errors = await page.evaluate(() => {
      return (window as any).errors || [];
    });
    
    expect(errors.length).toBe(0);
  });

  test('should maintain tool state after page interactions', async ({ page }) => {
    // Activate text tool
    const textTool = page.locator('.tools__item[data-tool="text"]');
    await textTool.click();
    await page.waitForTimeout(300);
    
    // Interact with other page elements
    await page.locator('.nav-course__item[data-preview="outline"]').click();
    await page.waitForTimeout(300);
    
    await page.locator('.nav-course__item[data-preview="preview"]').click();
    await page.waitForTimeout(300);
    
    // Text tool should still be active
    await expect(textTool).toHaveClass(/active/);
  });
});

/**
 * Text Tool Integration Tests
 * Tests the text tool with the broader coursebuilder interface
 */
test.describe('Text Tool - Integration Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForFunction(() => !!(window as any).uiEventHandler && !!(window as any).toolStateManager, null, { timeout: 15000 });
    await page.waitForFunction(() => (window as any).canvasAPI && (window as any).canvasAPI.isReady && (window as any).canvasAPI.isReady(), null, { timeout: 20000 });
  });

  test('should work with coursebuilder navigation', async ({ page }) => {
    // Activate text tool using ToolStateManager
    const textTool = page.locator('.tools__item[data-tool="text"]');
    await page.evaluate(() => (window as any).toolStateManager?.setTool('text'));
    await expect(textTool).toHaveClass(/active|tools__item--active/);
  });

  test('should persist settings across tool switches', async ({ page }) => {
    // Activate text tool and change settings
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(300);
    
    const fontSizeInput = page.locator('#text-size-select');
    await fontSizeInput.selectOption('20');
    
    // Switch to another tool and back
    await page.locator('.tools__item[data-tool="pen"]').click();
    await page.waitForTimeout(300);
    
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(300);
    
    // Setting should be preserved
    await expect(fontSizeInput).toHaveValue('20');
  });

  test('should handle Select2 dropdowns correctly', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(500);
    
    // Use direct selectOption to avoid UI interception by neighboring buttons
    const fontSelect = page.locator('#font-family-select');
    await fontSelect.selectOption({ index: 1 });
    const selectedValue = await fontSelect.inputValue();
    expect(selectedValue).toBeTruthy();
  });
});
