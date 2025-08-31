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
    // Navigate to the coursebuilder page
    await page.goto('/src/pages/teacher/coursebuilder.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
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
    const fontSizeInput = page.locator('.tools__item--text input[data-setting="fontSize"]');
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
    
    // Change font size
    const fontSizeInput = page.locator('.tools__item--text input[data-setting="fontSize"]');
    await fontSizeInput.fill('24');
    
    // Verify the value was set
    await expect(fontSizeInput).toHaveValue('24');
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
    // Verify canvas container exists
    const canvasContainer = page.locator('#canvas-container');
    await expect(canvasContainer).toBeVisible();
    
    // Verify it has reasonable dimensions
    const boundingBox = await canvasContainer.boundingBox();
    expect(boundingBox).toBeTruthy();
    expect(boundingBox!.width).toBeGreaterThan(100);
    expect(boundingBox!.height).toBeGreaterThan(100);
  });

  test('should switch between tools correctly', async ({ page }) => {
    // Start with text tool
    const textTool = page.locator('.tools__item[data-tool="text"]');
    const penTool = page.locator('.tools__item[data-tool="pen"]');
    
    await textTool.click();
    await page.waitForTimeout(300);
    await expect(textTool).toHaveClass(/active/);
    
    // Switch to pen tool
    await penTool.click();
    await page.waitForTimeout(300);
    await expect(penTool).toHaveClass(/active/);
    await expect(textTool).not.toHaveClass(/active/);
    
    // Switch back to text tool
    await textTool.click();
    await page.waitForTimeout(300);
    await expect(textTool).toHaveClass(/active/);
    await expect(penTool).not.toHaveClass(/active/);
  });

  test('should show appropriate tool settings when switching', async ({ page }) => {
    const textTool = page.locator('.tools__item[data-tool="text"]');
    const penTool = page.locator('.tools__item[data-tool="pen"]');
    
    // Activate text tool and check settings
    await textTool.click();
    await page.waitForTimeout(300);
    
    const textSettings = page.locator('.tools__item--text');
    const penSettings = page.locator('.tools__item--pen');
    
    // Text settings should be visible, pen settings should not
    await expect(textSettings).toBeVisible();
    await expect(penSettings).not.toBeVisible();
    
    // Switch to pen tool
    await penTool.click();
    await page.waitForTimeout(300);
    
    // Now pen settings should be visible, text settings should not
    await expect(penSettings).toBeVisible();
    await expect(textSettings).not.toBeVisible();
  });

  test('should handle multiple setting changes', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(500);
    
    // Change multiple settings
    const fontSizeInput = page.locator('.tools__item--text input[data-setting="fontSize"]');
    const fontFamilySelect = page.locator('#font-family-select');
    const textColorSelect = page.locator('#text-color-select');
    
    await fontSizeInput.fill('20');
    await fontFamilySelect.selectOption('Verdana');
    await textColorSelect.selectOption('#a74a4a'); // Red
    
    // Verify all settings were applied
    await expect(fontSizeInput).toHaveValue('20');
    await expect(fontFamilySelect).toHaveValue('Verdana');
    await expect(textColorSelect).toHaveValue('#a74a4a');
  });

  test('should have working canvas interaction area', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(500);
    
    const canvasContainer = page.locator('#canvas-container');
    
    // Test clicking on canvas doesn't cause errors
    await canvasContainer.click({ position: { x: 200, y: 200 } });
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
    await page.goto('/src/pages/teacher/coursebuilder.html');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('should work with coursebuilder navigation', async ({ page }) => {
    // Navigate to create view where tools are
    const createTab = page.locator('button#next-btn'); // Or appropriate navigation
    if (await createTab.isVisible()) {
      await createTab.click();
      await page.waitForTimeout(500);
    }
    
    // Activate text tool
    const textTool = page.locator('.tools__item[data-tool="text"]');
    if (await textTool.isVisible()) {
      await textTool.click();
      await expect(textTool).toHaveClass(/active/);
    }
  });

  test('should persist settings across tool switches', async ({ page }) => {
    // Activate text tool and change settings
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(300);
    
    const fontSizeInput = page.locator('.tools__item--text input[data-setting="fontSize"]');
    await fontSizeInput.fill('18');
    
    // Switch to another tool and back
    await page.locator('.tools__item[data-tool="pen"]').click();
    await page.waitForTimeout(300);
    
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(300);
    
    // Setting should be preserved
    await expect(fontSizeInput).toHaveValue('18');
  });

  test('should handle Select2 dropdowns correctly', async ({ page }) => {
    // Activate text tool
    await page.locator('.tools__item[data-tool="text"]').click();
    await page.waitForTimeout(500);
    
    // Test Select2 font family dropdown
    const fontSelect = page.locator('#font-family-select');
    
    // Check if Select2 is working (dropdown should open)
    await fontSelect.click();
    await page.waitForTimeout(200);
    
    // Look for Select2 dropdown container
    const select2Dropdown = page.locator('.select2-dropdown');
    const isSelect2Working = await select2Dropdown.isVisible().catch(() => false);
    
    // If Select2 is working, we should see the dropdown or at least be able to select
    if (isSelect2Working) {
      // Select an option through Select2
      await page.locator('.select2-results__option').first().click();
    } else {
      // Fallback to regular select
      await fontSelect.selectOption({ index: 1 });
    }
    
    // Verify some value is selected
    const selectedValue = await fontSelect.inputValue();
    expect(selectedValue).toBeTruthy();
  });
});
