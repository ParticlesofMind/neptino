import { test, expect } from '@playwright/test';

test.describe('Color Select Dropdowns', () => {
  test('should have working color select dropdowns on coursebuilder page', async ({ page }) => {
        // Navigate to the coursebuilder page
    await page.goto('/pages/teacher/coursebuilder.html');
    
    // Wait for page to load and scripts to initialize
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(2000); // Give time for TypeScript modules to load
    
    // Click on the pen tool to activate it and make its options visible
    const penTool = page.locator('.tools__item[data-tool="pen"]');
    await expect(penTool).toBeVisible();
    await penTool.click();
    
    // Wait a bit for the tool to activate
    await page.waitForTimeout(1000);
    
    // Now test the color selects
    const penStrokeColor = page.locator('select[data-color-selector="pen-stroke"]');
    const penFillColor = page.locator('select[data-color-selector="pen-fill"]');
    
    // Verify the pen color selects exist and are visible
    await expect(penStrokeColor).toBeVisible();
    await expect(penFillColor).toBeVisible();
    
    // Check that they are select elements with correct classes
    await expect(penStrokeColor).toHaveClass(/input--color/);
    await expect(penFillColor).toHaveClass(/input--color/);
    
    // Check initial selected values
    await expect(penStrokeColor).toHaveValue('#1a1a1a'); // Black
    await expect(penFillColor).toHaveValue('#f8fafc');   // White
    
    // Test changing color selection
    console.log('Testing pen stroke color selection...');
    await penStrokeColor.selectOption('#a74a4a'); // Red
    await expect(penStrokeColor).toHaveValue('#a74a4a');
    
    // Test another color selection  
    await penFillColor.selectOption('#4a79a4'); // Blue
    await expect(penFillColor).toHaveValue('#4a79a4');
    
    console.log('Color select dropdowns working correctly!');
  });
  
  test('should trigger color change events when selections change', async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html');
    await page.waitForLoadState('networkidle');
    
    // Force the pen settings panel to be visible
    await page.evaluate(() => {
      // Force multiple elements to be visible
      const penSettings = document.querySelector('.tools__item--pen[data-tool="pen"]') as HTMLElement;
      if (penSettings) {
        penSettings.style.display = 'block !important';
        penSettings.style.visibility = 'visible !important';
        penSettings.style.opacity = '1';
      }
      
      // Also force the parent tools container to be visible
      const toolsOptions = document.querySelector('.tools__options') as HTMLElement;
      if (toolsOptions) {
        toolsOptions.style.display = 'block !important';
        toolsOptions.style.visibility = 'visible !important';
      }
      
      // Force the color selects themselves to be visible
      const colorSelects = document.querySelectorAll('select[data-color-selector]') as NodeListOf<HTMLElement>;
      colorSelects.forEach(select => {
        select.style.display = 'block !important';
        select.style.visibility = 'visible !important';
        select.style.opacity = '1';
        select.style.position = 'static';
      });
    });
    
    // Add event listeners to capture events
    await page.evaluate(() => {
      (window as any).capturedEvents = [];
      document.addEventListener('toolColorChange', (e: any) => {
        (window as any).capturedEvents.push({
          type: 'toolColorChange',
          detail: e.detail
        });
      });
    });
    
    // Change a color selection
    const penStrokeColor = page.locator('select[data-color-selector="pen-stroke"]');
    await penStrokeColor.selectOption('#4a7c59'); // Green
    
    // Wait a bit for events to process
    await page.waitForTimeout(500);
    
    // Check if events were captured
    const capturedEvents = await page.evaluate(() => (window as any).capturedEvents);
    console.log('Captured events:', capturedEvents);
    
    // The test should capture at least one toolColorChange event
    expect(capturedEvents.length).toBeGreaterThan(0);
    expect(capturedEvents[0].type).toBe('toolColorChange');
    expect(capturedEvents[0].detail.hex).toBe('#4a7c59');
  });
});
