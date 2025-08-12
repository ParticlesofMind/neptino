/**
 * PixiJS Devtools Setup
 * Ensures proper devtools initialization and global exposure
 */

import * as PIXI from "pixi.js";
import { initDevtools } from "@pixi/devtools";
import PixiSceneInspector from "./devtools/PixiSceneInspector";

// Global exposure for devtools compatibility
try {
  (window as any).PIXI = PIXI;
  (globalThis as any).PIXI = PIXI;
} catch (error) {
  console.warn("Could not expose PIXI globally in devtools setup:", error);
}

// Enhanced devtools setup function
export function setupPixiDevtools() {

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
      register: function (app: any) {
        this.apps.set(app, app);
        if (app.renderer) {
          this.renderers.set(app.renderer, app.renderer);
        }
      },

      // Method to get all registered apps
      getApps: function () {
        return Array.from(this.apps.keys());
      },
    };
  }

  // Listen for app ready events
  window.addEventListener("pixi-app-ready", (event: any) => {
    const app = event.detail;

    // Setup inspector with the app
    if ((window as any).pixiInspector) {
      (window as any).pixiInspector.setApp(app);
      console.log(
        "🔍 Scene Inspector ready! Try: window.pixiInspector.inspectScene()",
      );
    }

    if ((window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__) {
      (window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__.register(app);
    }

    // Try to initialize devtools again when app is ready
    setTimeout(() => {
      try {
        initDevtools({ app });
      } catch (error) {
        console.warn(
          "⚠️ Could not initialize devtools after app ready:",
          error,
        );
      }
    }, 100);
  });

}

// Initialize Spector.js for WebGL debugging
function initializeSpectorJS() {
  try {

    // Method 1: Try to load from node_modules using dynamic import
    import("spectorjs")
      .then((SPECTOR) => {
        if (SPECTOR && SPECTOR.Spector) {
          const spector = new SPECTOR.Spector();
          (window as any).spector = spector;
          (window as any).SPECTOR = SPECTOR;

          console.log(
            "✅ Spector.js WebGL debugger initialized successfully (ES Module)",
          );
          logSpectorUsage();
          addSpectorIndicator();
        }
      })
      .catch(() => {
        loadSpectorScript();
      });
  } catch (error) {
    console.warn("⚠️ Error initializing Spector.js:", error);
    loadSpectorScript();
  }
}

// Fallback: Load Spector.js via script tag
function loadSpectorScript() {
  // Load Spector.js script dynamically
  const script = document.createElement("script");
  script.src = "/node_modules/spectorjs/dist/spector.bundle.js";
  script.onload = () => {
    // @ts-ignore - Spector is loaded globally by the script
    if (window.SPECTOR) {
      // @ts-ignore
      const spector = new window.SPECTOR.Spector();
      (window as any).spector = spector;

      console.log(
        "✅ Spector.js WebGL debugger initialized successfully (Script)",
      );
      logSpectorUsage();
      addSpectorIndicator();
    }
  };
  script.onerror = () => {
    console.warn(
      "⚠️ Could not load Spector.js from node_modules, trying CDN...",
    );
    loadSpectorFromCDN();
  };

  document.head.appendChild(script);
}

// Last resort: Load from CDN
function loadSpectorFromCDN() {
  const script = document.createElement("script");
  script.src = "https://spectorcdn.babylonjs.com/spector.bundle.js";
  script.onload = () => {
    // @ts-ignore
    if (window.SPECTOR) {
      // @ts-ignore
      const spector = new window.SPECTOR.Spector();
      (window as any).spector = spector;

      console.log(
        "✅ Spector.js WebGL debugger initialized successfully (CDN)",
      );
      logSpectorUsage();
      addSpectorIndicator();
    }
  };
  script.onerror = () => {
    console.warn("❌ Could not load Spector.js from any source");
    console.log(
      '   <script src="https://spectorcdn.babylonjs.com/spector.bundle.js"></script>',
    );
  };

  document.head.appendChild(script);
}

// Log usage instructions
function logSpectorUsage() {
  console.log(
    "   window.spector.captureCanvas(canvas) - Capture specific canvas",
  );
}

// Add visual indicator that Spector.js is available
function addSpectorIndicator() {
  try {
    // Create a small indicator in the corner
    const indicator = document.createElement("div");
    indicator.id = "spector-indicator";
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
      const elem = document.getElementById("spector-indicator");
      if (elem) {
        elem.style.transition = "opacity 0.5s";
        elem.style.opacity = "0";
        setTimeout(() => elem.remove(), 500);
      }
    }, 5000);
  } catch (error) {
    console.warn("Could not add Spector.js indicator:", error);
  }
}

// Auto-setup if on coursebuilder page
if (window.location.pathname.includes("coursebuilder.html")) {
  setupPixiDevtools();
}
