import { test, expect } from '@playwright/test';

test.describe('Color Select Simple Test', () => {
  test('should have working color selects on test page', async ({ page }) => {
    // Navigate to the test page
    await page.goto('/tests/color-test.html');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Get the color selects
    const strokeSelect = page.locator('#pen-stroke-color');
    const fillSelect = page.locator('#pen-fill-color');

    // Verify they exist and are visible
    await expect(strokeSelect).toBeVisible();
    await expect(fillSelect).toBeVisible();

    // Check they have the correct CSS classes
    await expect(strokeSelect).toHaveClass(/input--color/);
    await expect(fillSelect).toHaveClass(/input--color/);

    // Check initial values
    await expect(strokeSelect).toHaveValue('#1a1a1a'); // Black
    await expect(fillSelect).toHaveValue('#f8fafc');   // White

    // Test changing values
    await strokeSelect.selectOption('#a74a4a'); // Red
    await expect(strokeSelect).toHaveValue('#a74a4a');

    await fillSelect.selectOption('#4a79a4'); // Blue
    await expect(fillSelect).toHaveValue('#4a79a4');
  });
});
