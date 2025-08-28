import { test, expect } from '@playwright/test';

test.describe('Course Builder', () => {
  test('teacher can access course builder', async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html');
    
    // Wait for the canvas to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Verify the canvas is visible
    await expect(page.locator('canvas')).toBeVisible();
    
    // Check for course builder tools
    await expect(page.locator('[data-tool]')).toHaveCount(1, { timeout: 5000 });
  });

  test('can create a new course element', async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html');
    
    // Wait for canvas to load
    await page.waitForSelector('canvas');
    
    // Simulate adding a new element (adjust selectors based on your UI)
    await page.click('[data-tool="text"]'); // Example: click text tool
    await page.click('canvas'); // Click on canvas to add element
    
    // Verify element was added (you'll need to adjust this based on your implementation)
    // This might involve checking for new DOM elements or canvas content
  });

  test('course builder navigation works', async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html');
    
    // Test navigation between different sections
    await page.click('[data-nav="tools"]'); // Example navigation
    await expect(page.locator('.tools-panel')).toBeVisible();
    
    await page.click('[data-nav="properties"]'); // Example navigation  
    await expect(page.locator('.properties-panel')).toBeVisible();
  });
});
