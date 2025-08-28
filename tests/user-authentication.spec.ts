import { test, expect } from '@playwright/test';

test.describe('User Authentication', () => {
  test('user can navigate to sign in page', async ({ page }) => {
    await page.goto('/');
    
    // Look for a sign in button/link and click it
    await page.click('text=Sign In');
    
    // Verify we're on the sign in page
    await expect(page).toHaveURL(/signin/);
    await expect(page.locator('h1')).toContainText('Sign In');
  });

  test('user can navigate to sign up page', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to sign up
    await page.click('text=Sign Up');
    
    // Verify we're on the sign up page  
    await expect(page).toHaveURL(/signup/);
    await expect(page.locator('h1')).toContainText('Sign Up');
  });

  test('sign in form validation works', async ({ page }) => {
    await page.goto('/src/pages/shared/signin.html');
    
    // Try to submit empty form
    await page.click('button[type="submit"]');
    
    // Check for validation messages
    await expect(page.locator('.error-message')).toBeVisible();
  });
});
