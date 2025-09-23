import { test, expect } from '@playwright/test';

/**
 * Canvas Initialization Debug Test
 * This test helps diagnose exactly what's failing during canvas initialization
 */

test.describe('Canvas Initialization Debug', () => {
  
  test('should debug canvas initialization step by step', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log(`BROWSER: ${msg.type()}: ${msg.text()}`));
    page.on('pageerror', error => console.error(`PAGE ERROR: ${error.message}`));
    
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    await page.waitForLoadState('domcontentloaded');
    
    // Check if container exists
    const containerExists = await page.evaluate(() => {
      const container = document.getElementById('canvas-container');
      return {
        exists: !!container,
        clientWidth: container?.clientWidth || 0,
        clientHeight: container?.clientHeight || 0,
        offsetWidth: container?.offsetWidth || 0,
        offsetHeight: container?.offsetHeight || 0
      };
    });
    console.log('Container info:', containerExists);
    
    // Check if scripts are loading
    const scriptsLoaded = await page.evaluate(() => {
      return {
        canvasAPI: typeof (window as any).canvasAPI,
        toolStateManager: typeof (window as any).toolStateManager,
        uiEventHandler: typeof (window as any).uiEventHandler,
        errors: (window as any).errors || []
      };
    });
    console.log('Scripts loaded:', scriptsLoaded);
    
    // Wait and check again
    await page.waitForTimeout(2000);
    
    const afterWait = await page.evaluate(() => {
      const api = (window as any).canvasAPI;
      return {
        canvasAPI: !!api,
        isReady: api ? api.isReady() : false,
        pixiApp: api ? !!api.pixiApp : false,
        initialized: api ? api.initialized : false,
        lastError: (window as any).lastError,
        globalErrors: (window as any).errors || []
      };
    });
    console.log('After wait:', afterWait);
    
    // Try to get more detailed error info
    const detailedInfo = await page.evaluate(() => {
      try {
        const api = (window as any).canvasAPI;
        if (!api) return { error: 'No canvasAPI found' };
        
        return {
          app: !!api.getApp?.(),
          layers: !!api.layers,
          events: !!api.events,
          displayManager: !!api.displayManager,
          toolManager: !!api.toolManager,
          webglSupport: !!window.WebGLRenderingContext
        };
      } catch (error) {
        return { error: error instanceof Error ? error.message : String(error) };
      }
    });
    console.log('Detailed info:', detailedInfo);
    
    // This test is for debugging only - it always passes
    expect(true).toBe(true);
  });
  
  test('should test WebGL availability', async ({ page }) => {
    await page.goto('/src/pages/teacher/coursebuilder.html#create');
    
    const webglInfo = await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') as WebGLRenderingContext | null;
      
      return {
        webglSupported: !!gl,
        vendor: gl ? gl.getParameter(gl.VENDOR) : null,
        renderer: gl ? gl.getParameter(gl.RENDERER) : null,
        version: gl ? gl.getParameter(gl.VERSION) : null,
        extensions: gl ? gl.getSupportedExtensions() : null
      };
    });
    
    console.log('WebGL info:', webglInfo);
    expect(webglInfo.webglSupported).toBe(true);
  });
});