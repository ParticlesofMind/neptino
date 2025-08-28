import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('student can navigate between pages', async ({ page }) => {
    await page.goto('/src/pages/student/home.html');
    
    // Test navigation to courses
    await page.click('text=Courses');
    await expect(page).toHaveURL(/courses/);
    
    // Test navigation to marketplace
    await page.click('text=Marketplace');
    await expect(page).toHaveURL(/marketplace/);
    
    // Test navigation to progress
    await page.click('text=Progress');
    await expect(page).toHaveURL(/progress/);
  });

  test('teacher navigation works correctly', async ({ page }) => {
    await page.goto('/src/pages/teacher/home.html');
    
    // Test teacher-specific navigation
    await page.click('text=Course Builder');
    await expect(page).toHaveURL(/coursebuilder/);
    
    await page.click('text=My Courses');
    await expect(page).toHaveURL(/courses/);
  });

  test('admin navigation is accessible', async ({ page }) => {
    await page.goto('/src/pages/admin/home.html');
    
    // Test admin-specific features
    await page.click('text=Manage Courses');
    await expect(page).toHaveURL(/admin.*courses/);
    
    await page.click('text=Tutorials');
    await expect(page).toHaveURL(/admin.*tutorials/);
  });
});
