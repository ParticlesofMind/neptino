import { test, expect } from '@playwright/test';

test.describe('Debug Canvas Events', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForFunction(() => window.canvasAPI?.isReady());
  });

  test('should debug canvas events and tool switching', async ({ page }) => {
    // Intercept console logs
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    // Check current tool and add basic tool debugging
    await page.evaluate(() => {
      console.log('🔧 Initial tool:', window.toolStateManager?.getActiveToolName());
      
      // Add debugging to tool manager
      if (window.toolStateManager) {
        const originalSetTool = window.toolStateManager.setTool;
        window.toolStateManager.setTool = function(toolName: string) {
          console.log('🔧 Setting tool to:', toolName);
          const result = originalSetTool.call(this, toolName);
          console.log('🔧 Tool set result. Active tool is now:', this.getActiveToolName());
          return result;
        };
      }
    });

    // Switch to text tool and create a text area
    await page.evaluate(() => {
      console.log('🔧 Switching to text tool...');
      window.toolStateManager?.setTool('text');
    });
    
    // Create text area by dragging
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(500, 400);
    await page.mouse.up();
    
    // Type some text
    await page.keyboard.type('Hello World');
    
    // Switch to selection tool
    await page.evaluate(() => {
      console.log('🔧 Switching to selection tool...');
      window.toolStateManager?.setTool('selection');
    });
    
    // Wait a bit for tool switch
    await page.waitForTimeout(100);
    
    // Check current tool
    const currentTool = await page.evaluate(() => {
      return window.toolStateManager?.getActiveToolName();
    });
    
    console.log('Current tool after switch:', currentTool);
    
    // Check if canvas events are being handled
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (canvas) {
        console.log('📍 Canvas found:', canvas.width, 'x', canvas.height);
        
        // Add event listeners to the canvas to see if events are reaching it
        canvas.addEventListener('pointerdown', (e) => {
          console.log('📍 Canvas pointerdown event:', e.offsetX, e.offsetY);
        });
        
        canvas.addEventListener('click', (e) => {
          console.log('📍 Canvas click event:', e.offsetX, e.offsetY);
        });
      } else {
        console.log('❌ No canvas found');
      }
    });
    
    // Click on the text area
    console.log('--- Clicking on canvas ---');
    await page.mouse.click(400, 350);
    await page.waitForTimeout(200);
    
    // Check logs
    console.log('Captured logs:', logs);
    
    // We should at least see the tool switch logs
    const toolSwitchLogs = logs.filter(log => log.includes('Setting tool to:'));
    expect(toolSwitchLogs.length).toBeGreaterThan(0);
  });
});