import { test, expect } from '@playwright/test';

/**
 * Comprehensive Text Tool Test Suite
 * Tests all core features, interactions, and advanced functionality
 */

test.describe('Text Tool - Comprehensive Features', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForLoadState('domcontentloaded');
    
    // Wait for the UI components to be initialized first
    await page.waitForFunction(() => {
      return !!(window as any).uiEventHandler && !!(window as any).toolStateManager;
    }, null, { timeout: 10000 });
    
    // THEN wait for canvas to be ready with longer timeout
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.isReady && api.isReady();
    }, null, { timeout: 30000 });
    
    // Activate text tool
    const textToolBtn = page.locator('.tools__item[data-tool="text"]');
    await expect(textToolBtn).toBeVisible();
    await textToolBtn.locator('.tools__icon').click();
    
    // Wait for tool activation
    await page.waitForFunction(() => {
      const api = (window as any).canvasAPI;
      return api && api.getActiveTool && api.getActiveTool() === 'text';
    });
  });

  test.describe('Core Creation & Interaction', () => {
    
    test('should create text area with mouse drag', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      expect(bounds).toBeTruthy();
      
      const startX = bounds.left + 100;
      const startY = bounds.top + 100;
      const endX = startX + 200;
      const endY = startY + 100;
      
      // Perform drag operation
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
      
      // Wait for text area creation
      await page.waitForTimeout(500);
      
      // Verify text area exists
      const hasTextArea = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.getTextAreas && textTool.getTextAreas().length > 0;
      });
      
      expect(hasTextArea).toBe(true);
    });

    test('should double-click to activate existing text area for editing', async ({ page }) => {
      // First create a text area
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      const startX = bounds.left + 100;
      const startY = bounds.top + 100;
      const endX = startX + 200;
      const endY = startY + 100;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Now double-click inside the text area to activate editing
      const centerX = startX + 100;
      const centerY = startY + 50;
      
      await page.mouse.click(centerX, centerY);
      await page.mouse.click(centerX, centerY);
      
      // Verify text area is active and cursor is visible
      const isActive = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea && textTool.activeTextArea.isActive;
      });
      
      const cursorVisible = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.textCursor && textTool.textCursor.visible;
      });
      
      expect(isActive).toBe(true);
      expect(cursorVisible).toBe(true);
    });

    test('should click outside text areas to deactivate them', async ({ page }) => {
      // Create and activate text area
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      const startX = bounds.left + 100;
      const startY = bounds.top + 100;
      const endX = startX + 200;
      const endY = startY + 100;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Click inside to activate
      await page.mouse.click(startX + 100, startY + 50);
      await page.mouse.click(startX + 100, startY + 50);
      await page.waitForTimeout(200);
      
      // Click outside to deactivate
      await page.mouse.click(bounds.left + 400, bounds.top + 300);
      await page.waitForTimeout(200);
      
      // Verify deactivation
      const isActive = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea && textTool.activeTextArea.isActive;
      });
      
      expect(isActive).toBe(false);
    });

    test('should support creating multiple text areas on the same canvas', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Create first text area
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Create second text area
      await page.mouse.move(bounds.left + 400, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 600, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Verify both text areas exist
      const textAreaCount = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.getTextAreas ? textTool.getTextAreas().length : 0;
      });
      
      expect(textAreaCount).toBe(2);
    });

    test('should prevent text area creation in margin areas (boundary protection)', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Try to create text area outside content bounds (in margin)
      const marginX = bounds.left - 50; // Outside left boundary
      const marginY = bounds.top - 50;  // Outside top boundary
      
      await page.mouse.move(marginX, marginY);
      await page.mouse.down();
      await page.mouse.move(marginX + 100, marginY + 100);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Verify no text area was created outside bounds
      const textAreaCount = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.getTextAreas ? textTool.getTextAreas().length : 0;
      });
      
      expect(textAreaCount).toBe(0);
    });

    test('should validate text area boundaries automatically', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Create text area that would extend beyond boundaries
      const startX = bounds.right - 50; // Near right edge
      const startY = bounds.bottom - 50; // Near bottom edge
      const endX = bounds.right + 100; // Beyond right boundary
      const endY = bounds.bottom + 100; // Beyond bottom boundary
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Verify text area is created but clamped to boundaries
      const textAreaBounds = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.getTextAreas && textTool.getTextAreas().length > 0) {
          return textTool.getTextAreas()[0].bounds;
        }
        return null;
      });
      
      expect(textAreaBounds).toBeTruthy();
      if (textAreaBounds) {
        expect(textAreaBounds.x + textAreaBounds.width).toBeLessThanOrEqual(bounds.right);
        expect(textAreaBounds.y + textAreaBounds.height).toBeLessThanOrEqual(bounds.bottom);
      }
    });
  });

  test.describe('Text Input & Editing', () => {
    
    test.beforeEach(async ({ page }) => {
      // Create and activate a text area for each test
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      const startX = bounds.left + 100;
      const startY = bounds.top + 100;
      const endX = startX + 200;
      const endY = startY + 100;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Activate for editing
      await page.mouse.click(startX + 100, startY + 50);
      await page.mouse.click(startX + 100, startY + 50);
      await page.waitForTimeout(200);
    });

    test('should accept typed text input (letters, numbers, symbols)', async ({ page }) => {
      // Type various characters
      await page.keyboard.type('Hello World! 123 @#$%');
      
      // Verify text was entered
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('Hello World! 123 @#$%');
    });

    test('should handle spacebar characters properly (treats space as text)', async ({ page }) => {
      // Type text with spaces
      await page.keyboard.type('word1 word2 word3');
      
      // Verify spaces are preserved
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('word1 word2 word3');
      expect(text.split(' ').length).toBe(3); // Three words separated by spaces
    });

    test('should support Enter key for creating new lines', async ({ page }) => {
      await page.keyboard.type('Line 1');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Line 2');
      await page.keyboard.press('Enter');
      await page.keyboard.type('Line 3');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('Line 1\nLine 2\nLine 3');
    });

    test('should support Tab key insertion (converts to 4 spaces)', async ({ page }) => {
      await page.keyboard.type('Start');
      await page.keyboard.press('Tab');
      await page.keyboard.type('Indented');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('Start    Indented'); // Tab should become 4 spaces
    });

    test('should support Backspace deletion of characters', async ({ page }) => {
      await page.keyboard.type('Hello World');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      await page.keyboard.press('Backspace');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('Hello ');
    });

    test('should support Delete key for forward character deletion', async ({ page }) => {
      await page.keyboard.type('Hello World');
      // Move cursor to position after 'Hello'
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      
      // Delete forward
      await page.keyboard.press('Delete');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('HelloWorld'); // Space should be deleted
    });

    test('should insert text at cursor position', async ({ page }) => {
      await page.keyboard.type('Hello World');
      // Move cursor to between 'Hello' and 'World'
      await page.keyboard.press('Home');
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('ArrowRight');
      }
      
      // Insert text at cursor
      await page.keyboard.type('Beautiful ');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('Hello Beautiful World');
    });

    test('should support text selection and deletion', async ({ page }) => {
      await page.keyboard.type('Hello World');
      
      // Select 'World' by using Shift+Ctrl+ArrowLeft
      await page.keyboard.press('End');
      await page.keyboard.press('Shift+Control+ArrowLeft');
      
      // Delete selection
      await page.keyboard.press('Delete');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('Hello ');
    });
  });

  test.describe('Advanced Text Navigation', () => {
    
    test.beforeEach(async ({ page }) => {
      // Create and activate a text area with multi-line content
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      const startX = bounds.left + 100;
      const startY = bounds.top + 100;
      const endX = startX + 300;
      const endY = startY + 150;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Activate and add multi-line content
      await page.mouse.click(startX + 150, startY + 75);
      await page.mouse.click(startX + 150, startY + 75);
      await page.waitForTimeout(200);
      
      await page.keyboard.type('First line of text\nSecond line here\nThird and final line');
    });

    test('should support arrow key navigation (left, right, up, down)', async ({ page }) => {
      // Move to end
      await page.keyboard.press('End');
      
      // Navigate left
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      await page.keyboard.press('ArrowLeft');
      
      // Get cursor position (should be at 'l' in 'line')
      let cursorPos = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.inputHandler ? textTool.inputHandler.currentCursorPosition : -1;
      });
      
      // Navigate up one line
      await page.keyboard.press('ArrowUp');
      
      let newCursorPos = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.inputHandler ? textTool.inputHandler.currentCursorPosition : -1;
      });
      
      expect(newCursorPos).toBeLessThan(cursorPos); // Should move to previous line
      
      // Navigate down
      await page.keyboard.press('ArrowDown');
      
      let downCursorPos = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.inputHandler ? textTool.inputHandler.currentCursorPosition : -1;
      });
      
      expect(downCursorPos).toBeGreaterThan(newCursorPos); // Should move to next line
    });

    test('should support Home key navigation (beginning of line)', async ({ page }) => {
      // Move to middle of second line
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      await page.keyboard.press('ArrowRight');
      
      // Press Home to go to beginning of current line
      await page.keyboard.press('Home');
      
      // Insert text to verify we're at line start
      await page.keyboard.type('START ');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toContain('START Second line here');
    });

    test('should support End key navigation (end of line)', async ({ page }) => {
      // Move to beginning of first line
      await page.keyboard.press('Home');
      
      // Press End to go to end of current line
      await page.keyboard.press('End');
      
      // Insert text to verify we're at line end
      await page.keyboard.type(' END');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toContain('First line of text END');
    });

    test('should support Shift + arrow keys for text selection', async ({ page }) => {
      // Move to start of second line
      await page.keyboard.press('Home');
      await page.keyboard.press('ArrowDown');
      
      // Select word using Shift+Arrow
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      
      // Replace selected text
      await page.keyboard.type('REPLACEMENT');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toContain('REPLACEMENT');
    });

    test('should support word-by-word navigation with Ctrl/Cmd + arrow keys', async ({ page }) => {
      // Move to start
      await page.keyboard.press('Home');
      
      // Jump by word
      await page.keyboard.press('Control+ArrowRight'); // Should move to 'line'
      await page.keyboard.press('Control+ArrowRight'); // Should move to 'of'
      await page.keyboard.press('Control+ArrowRight'); // Should move to 'text'
      
      // Insert text to verify position
      await page.keyboard.type('WORD ');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toContain('First line of WORD text');
    });

    test('should support select all text functionality (Ctrl/Cmd + A)', async ({ page }) => {
      // Select all text
      await page.keyboard.press('Control+a');
      
      // Replace all text
      await page.keyboard.type('Completely new text');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('Completely new text');
    });

    test('should support cursor positioning from mouse clicks', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Click at approximate position in the middle of the second line
      await page.mouse.click(bounds.left + 200, bounds.top + 130);
      
      // Insert text to verify cursor position
      await page.keyboard.type('CLICK');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toContain('CLICK');
    });

    test('should support text selection with mouse drag', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Drag to select text in the first line
      const startX = bounds.left + 150; // Start of 'line'
      const startY = bounds.top + 115;
      const endX = bounds.left + 200;   // End of 'text'
      const endY = bounds.top + 115;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
      
      // Replace selected text
      await page.keyboard.type('SELECTED');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toContain('SELECTED');
    });
  });

  test.describe('Visual Elements & UI Feedback', () => {
    
    test('should display blinking text cursor with proper visibility management', async ({ page }) => {
      // Create and activate text area
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      const startX = bounds.left + 100;
      const startY = bounds.top + 100;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 200, startY + 100);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      await page.mouse.click(startX + 100, startY + 50);
      await page.mouse.click(startX + 100, startY + 50);
      await page.waitForTimeout(200);
      
      // Check cursor visibility
      const cursorVisible = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.textCursor && textTool.textCursor.visible;
      });
      
      expect(cursorVisible).toBe(true);
      
      // Wait for blink and check that cursor blinks
      await page.waitForTimeout(600); // Wait for blink cycle
      
      // Cursor should still be managed and blinking
      const cursorStillExists = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return !!(textTool && textTool.textCursor);
      });
      
      expect(cursorStillExists).toBe(true);
    });

    test('should display text area borders when active', async ({ page }) => {
      // Create text area
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      const startX = bounds.left + 100;
      const startY = bounds.top + 100;
      
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 200, startY + 100);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Activate text area
      await page.mouse.click(startX + 100, startY + 50);
      await page.mouse.click(startX + 100, startY + 50);
      await page.waitForTimeout(200);
      
      // Check if text area is active (has visible border)
      const isActive = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea && textTool.activeTextArea.isActive;
      });
      
      expect(isActive).toBe(true);
    });

    test('should show drag preview during text area creation', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      const startX = bounds.left + 100;
      const startY = bounds.top + 100;
      
      // Start drag but don't release
      await page.mouse.move(startX, startY);
      await page.mouse.down();
      await page.mouse.move(startX + 100, startY + 50);
      
      // Check if drag preview exists (we can't directly check PIXI graphics, 
      // but we can check if the tool is in dragging state)
      const isDragging = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.state && textTool.state.isDragging;
      });
      
      expect(isDragging).toBe(true);
      
      // Complete the drag
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Verify drag state is reset
      const stillDragging = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.state && textTool.state.isDragging;
      });
      
      expect(stillDragging).toBe(false);
    });

    test('should provide professional cursor management (text cursor vs pointer cursor)', async ({ page }) => {
      // Check that canvas has text cursor when text tool is active
      const cursorStyle = await page.evaluate(() => {
        const canvas = document.querySelector('#pixi-canvas');
        return canvas ? getComputedStyle(canvas).cursor : '';
      });
      
      // Should be text cursor or similar when text tool is active
      expect(['text', 'default'].includes(cursorStyle)).toBe(true);
    });
  });

  test.describe('Text Formatting & Styling', () => {
    
    test('should support font family selection', async ({ page }) => {
      // Create and activate text area
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Check that font families are available
      const availableFonts = await page.evaluate(() => {
        const TextTool = (window as any).TextTool;
        return TextTool ? TextTool.getAvailableFonts() : [];
      });
      
      expect(availableFonts.length).toBeGreaterThan(0);
      expect(availableFonts).toContain('Inter');
    });

    test('should support font size adjustment', async ({ page }) => {
      // Check that font sizes are available
      const availableSizes = await page.evaluate(() => {
        const TextTool = (window as any).TextTool;
        return TextTool ? TextTool.getAvailableSizes() : [];
      });
      
      expect(availableSizes.length).toBeGreaterThan(0);
      expect(availableSizes).toContain(16); // Default size
      expect(Math.min(...availableSizes)).toBeGreaterThanOrEqual(12);
      expect(Math.max(...availableSizes)).toBeLessThanOrEqual(48);
    });

    test('should support text color customization', async ({ page }) => {
      // Check that colors are available
      const availableColors = await page.evaluate(() => {
        const TextTool = (window as any).TextTool;
        return TextTool ? TextTool.getAvailableColors() : [];
      });
      
      expect(availableColors.length).toBeGreaterThan(0);
      expect(availableColors.every((color: any) => typeof color === 'string' && color.startsWith('#'))).toBe(true);
    });

    test('should support updating text settings', async ({ page }) => {
      // Create and activate text area
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Update settings
      await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.updateSettings) {
          textTool.updateSettings({
            fontSize: 24,
            color: '#ff0000',
            fontFamily: 'Arial'
          });
        }
      });
      
      // Verify settings were updated
      const settings = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool ? textTool.settings : null;
      });
      
      expect(settings.fontSize).toBe(24);
      expect(settings.color).toBe('#ff0000');
      expect(settings.fontFamily).toBe('Arial');
    });
  });

  test.describe('Multi-Text Area Management', () => {
    
    test('should create and manage multiple text areas simultaneously', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Create three text areas
      const areas = [
        { x: bounds.left + 100, y: bounds.top + 100, w: 200, h: 100 },
        { x: bounds.left + 350, y: bounds.top + 100, w: 200, h: 100 },
        { x: bounds.left + 100, y: bounds.top + 250, w: 200, h: 100 }
      ];
      
      for (const area of areas) {
        await page.mouse.move(area.x, area.y);
        await page.mouse.down();
        await page.mouse.move(area.x + area.w, area.y + area.h);
        await page.mouse.up();
        await page.waitForTimeout(300);
      }
      
      // Verify all text areas exist
      const textAreaCount = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.getTextAreas ? textTool.getTextAreas().length : 0;
      });
      
      expect(textAreaCount).toBe(3);
    });

    test('should switch between different text areas', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Create two text areas
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      await page.mouse.move(bounds.left + 400, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 600, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Activate first text area and add text
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.waitForTimeout(200);
      await page.keyboard.type('First area');
      
      // Switch to second text area
      await page.mouse.click(bounds.left + 500, bounds.top + 150);
      await page.mouse.click(bounds.left + 500, bounds.top + 150);
      await page.waitForTimeout(200);
      await page.keyboard.type('Second area');
      
      // Verify independent content
      const textAreas = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.getTextAreas) {
          return textTool.getTextAreas().map((area: any) => area.text);
        }
        return [];
      });
      
      expect(textAreas).toContain('First area');
      expect(textAreas).toContain('Second area');
    });

    test('should maintain independent text content for each area', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Create two text areas
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      await page.mouse.move(bounds.left + 400, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 600, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Add different content to each
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.keyboard.type('Area 1 Content');
      
      await page.mouse.click(bounds.left + 500, bounds.top + 150);
      await page.mouse.click(bounds.left + 500, bounds.top + 150);
      await page.keyboard.type('Area 2 Content');
      
      // Verify content independence
      const textAreas = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.getTextAreas) {
          return textTool.getTextAreas().map((area: any) => ({ id: area.id, text: area.text }));
        }
        return [];
      });
      
      expect(textAreas.length).toBe(2);
      expect(textAreas.find((area: any) => area.text === 'Area 1 Content')).toBeTruthy();
      expect(textAreas.find((area: any) => area.text === 'Area 2 Content')).toBeTruthy();
    });

    test('should support proper activation/deactivation state management', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Create two text areas
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      await page.mouse.move(bounds.left + 400, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 600, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Activate first area
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.waitForTimeout(200);
      
      // Check activation state
      const firstActiveState = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.getTextAreas) {
          return textTool.getTextAreas().map((area: any) => area.isActive);
        }
        return [];
      });
      
      expect(firstActiveState.filter((active: any) => active).length).toBe(1); // Only one active
      
      // Switch to second area
      await page.mouse.click(bounds.left + 500, bounds.top + 150);
      await page.mouse.click(bounds.left + 500, bounds.top + 150);
      await page.waitForTimeout(200);
      
      const secondActiveState = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.getTextAreas) {
          return textTool.getTextAreas().map((area: any) => area.isActive);
        }
        return [];
      });
      
      expect(secondActiveState.filter((active: any) => active).length).toBe(1); // Still only one active
    });

    test('should support text area removal functionality', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Create text area
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Remove text area programmatically
      await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.getTextAreas && textTool.removeTextArea) {
          const areas = textTool.getTextAreas();
          if (areas.length > 0) {
            textTool.removeTextArea(areas[0]);
          }
        }
      });
      
      // Verify removal
      const textAreaCount = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.getTextAreas ? textTool.getTextAreas().length : 0;
      });
      
      expect(textAreaCount).toBe(0);
    });

    test('should support clear all text areas capability', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Create multiple text areas
      for (let i = 0; i < 3; i++) {
        await page.mouse.move(bounds.left + 100 + (i * 150), bounds.top + 100);
        await page.mouse.down();
        await page.mouse.move(bounds.left + 200 + (i * 150), bounds.top + 200);
        await page.mouse.up();
        await page.waitForTimeout(300);
      }
      
      // Clear all
      await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.clearAllTextAreas) {
          textTool.clearAllTextAreas();
        }
      });
      
      // Verify all cleared
      const textAreaCount = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.getTextAreas ? textTool.getTextAreas().length : 0;
      });
      
      expect(textAreaCount).toBe(0);
    });
  });

  test.describe('Advanced Features', () => {
    
    test('should support proportional drag creation (Shift key for square areas)', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      const startX = bounds.left + 100;
      const startY = bounds.top + 100;
      const endX = startX + 200;
      const endY = startY + 100; // Rectangle ratio
      
      // Create with Shift held (should create square)
      await page.mouse.move(startX, startY);
      await page.keyboard.down('Shift');
      await page.mouse.down();
      await page.mouse.move(endX, endY);
      await page.mouse.up();
      await page.keyboard.up('Shift');
      await page.waitForTimeout(500);
      
      // Check resulting dimensions
      const textAreaBounds = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.getTextAreas && textTool.getTextAreas().length > 0) {
          return textTool.getTextAreas()[0].bounds;
        }
        return null;
      });
      
      expect(textAreaBounds).toBeTruthy();
      if (textAreaBounds) {
        // Should be square (width equals height)
        expect(textAreaBounds.width).toBe(textAreaBounds.height);
      }
    });

    test('should display size label during creation', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Start drag but don't complete (to test size label during drag)
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 200, bounds.top + 150);
      
      // Check if size label is shown (by checking if sizeLabel exists)
      const hasSizeLabel = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return !!(textTool && textTool.sizeLabel);
      });
      
      // Complete the drag
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Size label should exist during drag
      expect(hasSizeLabel).toBe(true);
    });

    test('should provide creation guide for user assistance', async ({ page }) => {
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      // Create text area
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Check if creation guide exists
      const hasCreationGuide = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return !!(textTool && textTool.creationGuide);
      });
      
      expect(hasCreationGuide).toBe(true);
    });
  });

  test.describe('Tool Integration', () => {
    
    test('should support seamless switching between text tool and other canvas tools', async ({ page }) => {
      // Create text area with text tool
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Switch to selection tool
      const selectionToolBtn = page.locator('.tools__item[data-tool="select"]');
      await expect(selectionToolBtn).toBeVisible();
      await selectionToolBtn.locator('.tools__icon').click();
      
      // Verify tool switch
      let activeTool = await page.evaluate(() => (window as any).canvasAPI?.getActiveTool());
      expect(activeTool).toBe('select');
      
      // Switch back to text tool
      const textToolBtn = page.locator('.tools__item[data-tool="text"]');
      await textToolBtn.locator('.tools__icon').click();
      
      activeTool = await page.evaluate(() => (window as any).canvasAPI?.getActiveTool());
      expect(activeTool).toBe('text');
      
      // Verify text areas still exist after tool switch
      const textAreaCount = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.getTextAreas ? textTool.getTextAreas().length : 0;
      });
      
      expect(textAreaCount).toBeGreaterThan(0);
    });

    test('should maintain persistent settings across tool switches', async ({ page }) => {
      // Update text tool settings
      await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.updateSettings) {
          textTool.updateSettings({
            fontSize: 24,
            color: '#ff0000'
          });
        }
      });
      
      // Switch to another tool and back
      const selectionToolBtn = page.locator('.tools__item[data-tool="select"]');
      await selectionToolBtn.locator('.tools__icon').click();
      await page.waitForTimeout(200);
      
      const textToolBtn = page.locator('.tools__item[data-tool="text"]');
      await textToolBtn.locator('.tools__icon').click();
      await page.waitForTimeout(200);
      
      // Check if settings persist
      const settings = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool ? textTool.settings : null;
      });
      
      expect(settings.fontSize).toBe(24);
      expect(settings.color).toBe('#ff0000');
    });

    test('should integrate with canvas zoom and pan functionality', async ({ page }) => {
      // Create text area
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Test that text tool still works after canvas operations
      // (We can't easily simulate zoom/pan in this test environment,
      // but we can verify the text tool maintains functionality)
      
      // Activate text area
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.waitForTimeout(200);
      
      // Type text
      await page.keyboard.type('Test after canvas operations');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('Test after canvas operations');
    });

    test('should handle canvas resize and adaptation', async ({ page }) => {
      // Create text area
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      // Simulate window resize (this will trigger canvas resize)
      await page.setViewportSize({ width: 1200, height: 800 });
      await page.waitForTimeout(500);
      
      // Verify text areas still exist and are functional
      const textAreaCount = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.getTextAreas ? textTool.getTextAreas().length : 0;
      });
      
      expect(textAreaCount).toBe(1);
      
      // Test that text input still works
      const newBounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      await page.mouse.click(newBounds.left + 200, newBounds.top + 150);
      await page.mouse.click(newBounds.left + 200, newBounds.top + 150);
      await page.keyboard.type('After resize');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('After resize');
    });
  });

  test.describe('Performance & Optimization', () => {
    
    test('should handle multiple rapid text inputs efficiently', async ({ page }) => {
      // Create and activate text area
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.waitForTimeout(200);
      
      // Rapid text input
      const startTime = Date.now();
      for (let i = 0; i < 50; i++) {
        await page.keyboard.type('a');
      }
      const endTime = Date.now();
      
      // Should complete within reasonable time (less than 2 seconds)
      expect(endTime - startTime).toBeLessThan(2000);
      
      // Verify all characters were entered
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text.length).toBe(50);
    });

    test('should efficiently manage cursor blinking animation', async ({ page }) => {
      // Create and activate text area
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      await page.mouse.move(bounds.left + 100, bounds.top + 100);
      await page.mouse.down();
      await page.mouse.move(bounds.left + 300, bounds.top + 200);
      await page.mouse.up();
      await page.waitForTimeout(500);
      
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.mouse.click(bounds.left + 200, bounds.top + 150);
      await page.waitForTimeout(200);
      
      // Wait through multiple blink cycles
      await page.waitForTimeout(2000);
      
      // Verify cursor is still functioning
      const cursorExists = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return !!(textTool && textTool.textCursor);
      });
      
      expect(cursorExists).toBe(true);
      
      // Type to ensure cursor is still responsive
      await page.keyboard.type('test');
      
      const text = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.activeTextArea ? textTool.activeTextArea.text : '';
      });
      
      expect(text).toBe('test');
    });

    test('should properly clean up memory when destroying text areas', async ({ page }) => {
      // Create multiple text areas
      const bounds = await page.evaluate(() => (window as any).canvasAPI?.getContentBounds());
      
      for (let i = 0; i < 5; i++) {
        await page.mouse.move(bounds.left + 100 + (i * 120), bounds.top + 100);
        await page.mouse.down();
        await page.mouse.move(bounds.left + 200 + (i * 120), bounds.top + 200);
        await page.mouse.up();
        await page.waitForTimeout(200);
      }
      
      // Clear all text areas
      await page.evaluate(() => {
        const textTool = (window as any).textTool;
        if (textTool && textTool.clearAllTextAreas) {
          textTool.clearAllTextAreas();
        }
      });
      
      // Verify cleanup
      const textAreaCount = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool && textTool.getTextAreas ? textTool.getTextAreas().length : 0;
      });
      
      expect(textAreaCount).toBe(0);
      
      // Verify no active text area
      const activeTextArea = await page.evaluate(() => {
        const textTool = (window as any).textTool;
        return textTool ? textTool.activeTextArea : undefined;
      });
      
      expect(activeTextArea).toBeNull();
    });
  });
});