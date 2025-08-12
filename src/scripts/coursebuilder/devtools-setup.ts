/**
 * PixiJS Devtools Setup
 * Ensures proper devtools initialization and global exposure
 */

import * as PIXI from 'pixi.js';
import { initDevtools } from '@pixi/devtools';
import PixiSceneInspector from './devtools/PixiSceneInspector';

// Global exposure for devtools compatibility
try {
  (window as any).PIXI = PIXI;
  (globalThis as any).PIXI = PIXI;
} catch (error) {
  console.warn('Could not expose PIXI globally in devtools setup:', error);
}

// Enhanced devtools setup function
export function setupPixiDevtools() {
  console.log('🔧 Setting up PixiJS devtools environment...');
  console.log('🔧 PIXI version:', PIXI.VERSION);
  console.log('🔧 PIXI globally available:', !!(window as any).PIXI);
  
  // Initialize Scene Inspector
  const inspector = new PixiSceneInspector();
  (window as any).pixiInspector = inspector;
  
  // Initialize Spector.js WebGL debugger
  initializeSpectorJS();
  
  // Create global hook for devtools detection
  if (!(window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__) {
    (window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__ = {
      renderers: new Map(),
      apps: new Map(),
      
      // Method called by devtools to register
      register: function(app: any) {
        console.log('🔧 Devtools registering app:', app);
        this.apps.set(app, app);
        if (app.renderer) {
          this.renderers.set(app.renderer, app.renderer);
        }
      },
      
      // Method to get all registered apps
      getApps: function() {
        return Array.from(this.apps.keys());
      }
    };
  }
  
  // Listen for app ready events
  window.addEventListener('pixi-app-ready', (event: any) => {
    console.log('🔧 PixiJS app ready event received');
    const app = event.detail;
    
    // Setup inspector with the app
    if ((window as any).pixiInspector) {
      (window as any).pixiInspector.setApp(app);
      console.log('🔍 Scene Inspector ready! Try: window.pixiInspector.inspectScene()');
    }
    
    if ((window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__) {
      (window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__.register(app);
    }
    
    // Try to initialize devtools again when app is ready
    setTimeout(() => {
      try {
        initDevtools({ app });
        console.log('✅ Devtools initialized after app ready event');
      } catch (error) {
        console.warn('⚠️ Could not initialize devtools after app ready:', error);
      }
    }, 100);
  });
  
  console.log('✅ PixiJS devtools environment setup complete');
}

// Initialize Spector.js for WebGL debugging
function initializeSpectorJS() {
  try {
    console.log('🔍 Initializing Spector.js WebGL debugger...');
    
    // Method 1: Try to load from node_modules using dynamic import
    import('spectorjs').then((SPECTOR) => {
      if (SPECTOR && SPECTOR.Spector) {
        const spector = new SPECTOR.Spector();
        (window as any).spector = spector;
        (window as any).SPECTOR = SPECTOR;
        
        console.log('✅ Spector.js WebGL debugger initialized successfully (ES Module)');
        logSpectorUsage();
        addSpectorIndicator();
      }
    }).catch(() => {
      console.log('📦 ES Module import failed, trying script injection...');
      loadSpectorScript();
    });
    
  } catch (error) {
    console.warn('⚠️ Error initializing Spector.js:', error);
    loadSpectorScript();
  }
}

// Fallback: Load Spector.js via script tag  
function loadSpectorScript() {
  // Load Spector.js script dynamically
  const script = document.createElement('script');
  script.src = '/node_modules/spectorjs/dist/spector.bundle.js';
  script.onload = () => {
    // @ts-ignore - Spector is loaded globally by the script
    if (window.SPECTOR) {
      // @ts-ignore
      const spector = new window.SPECTOR.Spector();
      (window as any).spector = spector;
      
      console.log('✅ Spector.js WebGL debugger initialized successfully (Script)');
      logSpectorUsage();
      addSpectorIndicator();
    }
  };
  script.onerror = () => {
    console.warn('⚠️ Could not load Spector.js from node_modules, trying CDN...');
    loadSpectorFromCDN();
  };
  
  document.head.appendChild(script);
}

// Last resort: Load from CDN
function loadSpectorFromCDN() {
  const script = document.createElement('script');
  script.src = 'https://spectorcdn.babylonjs.com/spector.bundle.js';
  script.onload = () => {
    // @ts-ignore
    if (window.SPECTOR) {
      // @ts-ignore
      const spector = new window.SPECTOR.Spector();
      (window as any).spector = spector;
      
      console.log('✅ Spector.js WebGL debugger initialized successfully (CDN)');
      logSpectorUsage();
      addSpectorIndicator();
    }
  };
  script.onerror = () => {
    console.warn('❌ Could not load Spector.js from any source');
    console.log('💡 Manual setup: Add this to your HTML:');
    console.log('   <script src="https://spectorcdn.babylonjs.com/spector.bundle.js"></script>');
  };
  
  document.head.appendChild(script);
}

// Log usage instructions
function logSpectorUsage() {
  console.log('🔍 Spector.js Usage Commands:');
  console.log('   window.spector.displayUI() - Show Spector UI overlay');
  console.log('   window.spector.captureCanvas(canvas) - Capture specific canvas');
  console.log('   window.spector.spyCanvases() - Monitor all canvases');
  console.log('   window.spector.startCapture() - Start capture session');
  console.log('   window.spector.stopCapture() - Stop capture session');
}

// Add visual indicator that Spector.js is available
function addSpectorIndicator() {
  try {
    // Create a small indicator in the corner
    const indicator = document.createElement('div');
    indicator.id = 'spector-indicator';
    indicator.innerHTML = `
      <div style="
        position: fixed;
        top: 10px;
        right: 10px;
        background: #4CAF50;
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-family: monospace;
        z-index: 10000;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      " onclick="window.spector?.displayUI()" title="Click to open Spector.js WebGL debugger">
        🔍 Spector.js Ready
      </div>
    `;
    
    document.body.appendChild(indicator);
    
    // Auto-remove indicator after 5 seconds
    setTimeout(() => {
      const elem = document.getElementById('spector-indicator');
      if (elem) {
        elem.style.transition = 'opacity 0.5s';
        elem.style.opacity = '0';
        setTimeout(() => elem.remove(), 500);
      }
    }, 5000);
    
  } catch (error) {
    console.warn('Could not add Spector.js indicator:', error);
  }
}

// Auto-setup if on coursebuilder page
if (window.location.pathname.includes('coursebuilder.html')) {
  setupPixiDevtools();
}
