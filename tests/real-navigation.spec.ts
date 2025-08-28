import { test, expect } from '@playwright/test';

test.describe('Real Navigation Tests', () => {
  test('can navigate from homepage to sign in', async ({ page }) => {
    await page.goto('/');
    
    // Click the Sign In button in navigation
    const signInLink = page.locator('a[href="/src/pages/shared/signin.html"]');
    await expect(signInLink).toContainText('Sign In');
    await signInLink.click();
    
    // Verify we're on the sign in page
    await expect(page).toHaveURL(/signin/);
  });

  test('navigation links are accessible', async ({ page }) => {
    await page.goto('/');
    
    // Test Features link
    const featuresLink = page.locator('a[href="/src/pages/shared/features.html"]');
    await expect(featuresLink).toContainText('Features');
    
    // Test About link
    const aboutLink = page.locator('a[href="/src/pages/shared/about.html"]');
    await expect(aboutLink).toContainText('About');
    
    // Test that navigation is visible
    await expect(page.locator('.nav')).toBeVisible();
  });

  test('footer navigation exists', async ({ page }) => {
    await page.goto('/');
    
    // Check footer is present
    const footer = page.locator('.footer');
    await expect(footer).toBeVisible();
    
    // Check footer links exist (even if they point to #)
    await expect(page.locator('.link--footer').first()).toBeVisible();
  });

  test('call-to-action buttons link correctly', async ({ page }) => {
    await page.goto('/');
    
    // Test multiple CTA buttons
    const ctaButtons = [
      { selector: '.hero__cta-primary', expectedHref: '/src/pages/shared/signup.html' },
      { selector: '.hero__cta-secondary', expectedHref: '/src/pages/shared/pricing.html' },
      { selector: '.cta__button-primary', expectedHref: '/src/pages/shared/signup.html' },
      { selector: '.cta__button-secondary', expectedHref: '/src/pages/shared/pricing.html' }
    ];
    
    for (const button of ctaButtons) {
      const element = page.locator(button.selector);
      await expect(element).toHaveAttribute('href', button.expectedHref);
    }
  });
});
