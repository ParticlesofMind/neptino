import { test, expect } from '@playwright/test';

test.describe('Visual Testing', () => {
  test('homepage appears correctly', async ({ page }) => {
    await page.goto('/');
    
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for visual comparison
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('course builder UI is consistent', async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html');
    
    // Wait for canvas and tools to load
    await page.waitForSelector('canvas');
    await page.waitForLoadState('networkidle');
    
    // Screenshot the course builder interface
    await expect(page).toHaveScreenshot('coursebuilder.png');
  });

  test('mobile responsive design works', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify mobile navigation
    await expect(page.locator('.mobile-menu-toggle')).toBeVisible();
    
    // Take mobile screenshot
    await expect(page).toHaveScreenshot('homepage-mobile.png');
  });
});
