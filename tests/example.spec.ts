import { test, expect } from '@playwright/test';

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Check that the page has a title
  await expect(page).toHaveTitle(/Neptino/);
  
  // Check main hero content
  await expect(page.locator('h1.hero__title')).toContainText('Neptino changes everything');
  await expect(page.locator('.hero__description')).toBeVisible();
  
  // Check navigation elements
  await expect(page.locator('.nav')).toBeVisible();
  await expect(page.locator('img[alt="Neptino Logo"]')).toBeVisible();
});

test('hero section call-to-action buttons work', async ({ page }) => {
  await page.goto('/');
  
  // Test "Get Started Free" button
  const getStartedButton = page.locator('.hero__cta-primary');
  await expect(getStartedButton).toContainText('Get Started Free');
  await expect(getStartedButton).toHaveAttribute('href', '/src/pages/shared/signup.html');
  
  // Test "View Pricing" button
  const pricingButton = page.locator('.hero__cta-secondary');
  await expect(pricingButton).toContainText('View Pricing');
  await expect(pricingButton).toHaveAttribute('href', '/src/pages/shared/pricing.html');
});

test('stats section displays correctly', async ({ page }) => {
  await page.goto('/');
  
  // Check stats section is visible
  await expect(page.locator('.stats__title')).toContainText('Trusted by Educators Worldwide');
  
  // Check all metric cards are present
  const metricCards = page.locator('.card--metric');
  await expect(metricCards).toHaveCount(4);
  
  // Check specific metrics
  await expect(page.locator('.metric__number').nth(0)).toContainText('10,000+');
  await expect(page.locator('.metric__number').nth(1)).toContainText('500,000+');
  await expect(page.locator('.metric__number').nth(2)).toContainText('500+');
  await expect(page.locator('.metric__number').nth(3)).toContainText('98%');
});

test('language dropdown works', async ({ page }) => {
  await page.goto('/');
  
  // Find and click the language toggle
  const languageToggle = page.locator('#language-toggle');
  await expect(languageToggle).toBeVisible();
  await languageToggle.click();
  
  // Check dropdown menu appears
  const languageMenu = page.locator('#language-menu');
  await expect(languageMenu).toBeVisible();
  
  // Check language options
  await expect(page.locator('[data-lang="en"]')).toContainText('English');
  await expect(page.locator('[data-lang="es"]')).toContainText('Español');
  await expect(page.locator('[data-lang="fr"]')).toContainText('Français');
  await expect(page.locator('[data-lang="de"]')).toContainText('Deutsch');
});
