import { test, expect } from '@playwright/test';

test.describe('Text Tool - Focused Input Tests', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to the course builder
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    
    // Wait for canvas to be ready
    await page.waitForFunction(() => window.canvasAPI?.isReady());
    
    // Wait for tool state manager to be ready
    await page.waitForFunction(() => window.toolStateManager?.getCurrentTool);
    
    // Activate text tool
    await page.evaluate(() => window.toolStateManager?.setTool('text'));
    
    // Wait for tool to be activated
    await page.waitForFunction(() => window.toolStateManager?.getCurrentTool() === 'text');
  });

  test('01 - Text tool activation and focus setup', async ({ page }) => {
    // Verify text tool is active
    const activeTool = await page.evaluate(() => window.toolStateManager?.getCurrentTool());
    expect(activeTool).toBe('text');
    
    // Verify text tool instance is available
    const textToolExists = await page.evaluate(() => !!window.textTool);
    expect(textToolExists).toBe(true);
  });

  test('02 - Programmatic text area creation with focus', async ({ page }) => {
    // Create text area programmatically
    const textAreaCreated = await page.evaluate(() => {
      try {
        window.textTool?.debugCreateAndActivate({ x: 200, y: 200, width: 300, height: 150 });
        
        // Focus the canvas explicitly
        const canvas = document.querySelector('#pixi-canvas') as HTMLElement;
        if (canvas) {
          (canvas as any).focus?.();
          canvas.setAttribute('tabindex', '0'); // Ensure it can receive focus
        }
        
        // Wait a moment for activation
        return new Promise(resolve => {
          setTimeout(() => resolve(!!window.textTool?.activeTextArea), 100);
        });
      } catch (error) {
        console.error('Text area creation error:', error);
        return false;
      }
    });
    
    expect(textAreaCreated).toBe(true);
    
    // Verify active text area exists
    const hasActiveTextArea = await page.evaluate(() => !!window.textTool?.activeTextArea);
    expect(hasActiveTextArea).toBe(true);
  });

  test('03 - Text input with proper focus and simulation', async ({ page }) => {
    // Create and activate text area
    await page.evaluate(() => {
      window.textTool?.debugCreateAndActivate({ x: 200, y: 200, width: 300, height: 150 });
      
      // Focus the canvas and ensure it can receive keyboard events
      const canvas = document.querySelector('#pixi-canvas') as HTMLElement;
      if (canvas) {
        (canvas as any).focus?.();
        canvas.setAttribute('tabindex', '0');
      }
    });
    
    // Wait for text area to be active
    await page.waitForFunction(() => !!window.textTool?.activeTextArea);
    
    // Simulate direct text input through the input handler
    const inputResult = await page.evaluate(() => {
      try {
        const testText = 'Hello World!';
        
        // Get the input handler and insert text directly
        const textTool = window.textTool;
        const inputHandler = textTool?.inputHandler;
        
        if (inputHandler && inputHandler.insertCharacter) {
          // Insert each character individually to simulate typing
          for (const char of testText) {
            inputHandler.insertCharacter(char);
          }
          
          // Return the current text
          return textTool?.activeTextArea?.text || '';
        }
        
        return '';
      } catch (error) {
        console.error('Text input error:', error);
        return '';
      }
    });
    
    expect(inputResult).toBe('Hello World!');
  });

  test('04 - Cursor position and movement', async ({ page }) => {
    // Create text area and add text
    await page.evaluate(() => {
      window.textTool?.debugCreateAndActivate({ x: 200, y: 200, width: 300, height: 150 });
      
      const canvas = document.querySelector('#pixi-canvas') as HTMLElement;
      if (canvas) {
        (canvas as any).focus?.();
        canvas.setAttribute('tabindex', '0');
      }
      
      // Add some text
      const inputHandler = window.textTool?.inputHandler;
      if (inputHandler) {
        for (const char of 'Sample text') {
          inputHandler.insertCharacter(char);
        }
      }
    });
    
    // Test cursor operations
    const cursorTests = await page.evaluate(() => {
      const results = [];
      const inputHandler = window.textTool?.inputHandler;
      
      if (inputHandler) {
        // Get initial cursor position
        const initialPos = inputHandler.currentCursorPosition;
        results.push({ test: 'initial_position', value: initialPos });
        
        // Test cursor positioning
        inputHandler.currentCursorPosition = 0;
        const atStart = inputHandler.currentCursorPosition;
        results.push({ test: 'move_to_start', value: atStart });
        
        // Test cursor at end
        const textLength = window.textTool?.activeTextArea?.text?.length || 0;
        inputHandler.currentCursorPosition = textLength;
        const atEnd = inputHandler.currentCursorPosition;
        results.push({ test: 'move_to_end', value: atEnd, textLength });
      }
      
      return results;
    });
    
    // Verify cursor positioning works
    const initialPosTest = cursorTests.find(t => t.test === 'initial_position');
    expect(initialPosTest?.value).toBeGreaterThanOrEqual(0);
    
    const startPosTest = cursorTests.find(t => t.test === 'move_to_start');
    expect(startPosTest?.value).toBe(0);
    
    const endPosTest = cursorTests.find(t => t.test === 'move_to_end');
    expect(endPosTest?.value).toBe(endPosTest?.textLength);
  });

  test('05 - Multiple text areas management', async ({ page }) => {
    // Create multiple text areas
    const areasCreated = await page.evaluate(() => {
      try {
        // Create first text area
        window.textTool?.debugCreateAndActivate({ x: 100, y: 100, width: 200, height: 100 });
        
        const canvas = document.querySelector('#pixi-canvas') as HTMLElement;
        if (canvas) {
          (canvas as any).focus?.();
          canvas.setAttribute('tabindex', '0');
        }
        
        // Add text to first area
        const inputHandler = window.textTool?.inputHandler;
        if (inputHandler) {
          for (const char of 'First area') {
            inputHandler.insertCharacter(char);
          }
        }
        
        // Create second text area
        window.textTool?.debugCreateAndActivate({ x: 400, y: 200, width: 200, height: 100 });
        
        // Add text to second area
        if (inputHandler) {
          for (const char of 'Second area') {
            inputHandler.insertCharacter(char);
          }
        }
        
        return {
          textAreaCount: window.textTool?.textAreas?.length || 0,
          firstAreaText: window.textTool?.textAreas?.[0]?.text || '',
          secondAreaText: window.textTool?.textAreas?.[1]?.text || '',
          activeAreaText: window.textTool?.activeTextArea?.text || ''
        };
        
      } catch (error) {
        return { error: (error as Error)?.message || 'Unknown error' };
      }
    });
    
    expect(areasCreated.textAreaCount).toBe(2);
    expect(areasCreated.firstAreaText).toBe('First area');
    expect(areasCreated.activeAreaText).toBe('Second area'); // Most recently created should be active
  });

  test('06 - Performance with direct input', async ({ page }) => {
    // Create text area
    await page.evaluate(() => {
      window.textTool?.debugCreateAndActivate({ x: 200, y: 200, width: 400, height: 200 });
      
      const canvas = document.querySelector('#pixi-canvas') as HTMLElement;
      if (canvas) {
        (canvas as any).focus?.();
        canvas.setAttribute('tabindex', '0');
      }
    });
    
    // Performance test with rapid text insertion
    const performanceResults = await page.evaluate(() => {
      const startTime = performance.now();
      
      try {
        const inputHandler = window.textTool?.inputHandler;
        if (inputHandler) {
          // Insert a substantial amount of text
          const testText = 'Performance test with a longer text string that includes various characters and numbers 12345! ';
          
          // Insert text multiple times to test performance
          for (let i = 0; i < 20; i++) {
            for (const char of testText) {
              inputHandler.insertCharacter(char);
            }
          }
        }
        
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        return {
          duration,
          textLength: window.textTool?.activeTextArea?.text?.length || 0,
          success: true
        };
        
      } catch (error) {
        return {
          error: (error as Error)?.message || 'Unknown error',
          success: false
        };
      }
    });
    
    expect(performanceResults.success).toBe(true);
    expect(performanceResults.textLength).toBeGreaterThan(1000);
    // Performance should be reasonable for this amount of text
    expect(performanceResults.duration).toBeLessThan(2000); // 2 seconds max
  });

});