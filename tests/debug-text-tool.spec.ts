import { test, expect } from '@playwright/test';

test.describe('Debug Text Tool Issues', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForFunction(() => window.canvasAPI?.isReady());
    await page.evaluate(() => window.toolStateManager?.setTool('text'));
    await page.waitForTimeout(500);
  });

  test('should debug text area creation and activation', async ({ page }) => {
    console.log('Starting debug test...');
    
    // First, check if text tool is active
    const toolActive = await page.evaluate(() => {
      const tool = (window as any).textTool;
      return {
        exists: !!tool,
        isActive: tool?.isActive,
        textAreasLength: tool?.textAreas?.length || 0
      };
    });
    console.log('Tool state:', toolActive);
    
    // Test programmatic creation
    await page.evaluate(() => {
      const tool = (window as any).textTool;
      if (tool) {
        tool.debugCreateAndActivate({ x: 200, y: 200, width: 220, height: 120 });
      }
    });
    await page.waitForTimeout(300);
    
    // Check if text area was created and activated
    const afterCreation = await page.evaluate(() => {
      const tool = (window as any).textTool;
      return {
        textAreasLength: tool?.textAreas?.length || 0,
        hasActiveTextArea: !!tool?.activeTextArea,
        activeTextAreaIsActive: tool?.activeTextArea?.isActive,
        activeTextAreaText: tool?.activeTextArea?.text,
        cursorExists: !!tool?.textCursor,
        cursorVisible: tool?.textCursor?.visible
      };
    });
    console.log('After creation:', afterCreation);
    
    // Test drag creation
    console.log('Testing drag creation...');
    const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
    if (bounds) {
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      
      console.log('Canvas bounds:', bounds);
      console.log('Center point:', { centerX, centerY });
      
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 150, centerY + 100); // Ensure > 30px
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      const afterDrag = await page.evaluate(() => {
        const tool = (window as any).textTool;
        return {
          textAreasLength: tool?.textAreas?.length || 0,
          hasActiveTextArea: !!tool?.activeTextArea,
          dragState: {
            isDragging: tool?.state?.isDragging,
            hasStarted: tool?.state?.hasStarted
          }
        };
      });
      console.log('After drag:', afterDrag);
    }
    
    expect(true).toBe(true); // Just for debugging, don't fail
  });
});