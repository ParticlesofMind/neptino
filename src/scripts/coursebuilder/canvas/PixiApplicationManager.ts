/**
 * PIXI Application Manager
 * Handles PIXI Application initialization and basic setup
 * Single Responsibility: PIXI App creation and configuration only
 */

import { Application } from "pixi.js";
import { initDevtools } from "@pixi/devtools";

// Expose PIXI globally for devtools (PIXI v8.2+ requirement)
import * as PIXI from "pixi.js";

// Safely expose PIXI globally
try {
  (window as any).PIXI = PIXI;
  (globalThis as any).PIXI = PIXI;
} catch (error) {
  console.warn("Could not expose PIXI globally:", error);
}

export class PixiApplicationManager {
  private app: Application | null = null;
  private canvasElement: HTMLElement | null = null;

  constructor(containerSelector: string) {
    // Handle both ID (#id) and class (.class) selectors
    if (
      containerSelector.startsWith("#") ||
      containerSelector.startsWith(".")
    ) {
      this.canvasElement = document.querySelector(containerSelector);
    } else {
      // Fallback for plain ID strings (legacy compatibility)
      this.canvasElement = document.getElementById(containerSelector);
    }

    if (!this.canvasElement) {
      throw new Error(
        `Canvas container with selector "${containerSelector}" not found`,
      );
    }
  }

  /**
   * Initialize the PixiJS application with A4 dimensions
   */
  public async initializeApplication(): Promise<Application> {
    try {
      // Create PixiJS application
      this.app = new Application();

      // Use fixed A4 dimensions since container is now properly sized in CSS
      const canvasWidth = 794;
      const canvasHeight = 1123;
      const a4AspectRatio = canvasWidth / canvasHeight;

      console.log(
        `🎨 Using fixed A4 dimensions: ${canvasWidth}x${canvasHeight}`,
      );

      // Initialize the application with A4 dimensions
      await this.app.init({
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 0xffffff, // White background
        antialias: true,
        autoDensity: true,
        resolution: window.devicePixelRatio || 1,
      });

      // Clear the canvas container and add PixiJS canvas
      this.canvasElement!.innerHTML = "";
      this.canvasElement!.appendChild(this.app.canvas);

      // Expose app globally for PIXI devtools with multiple approaches
      (window as any).__PIXI_APP__ = this.app;
      (globalThis as any).__PIXI_APP__ = this.app;

      // Safely expose on PIXI object for devtools detection
      try {
        if ((window as any).PIXI && typeof (window as any).PIXI === "object") {
          // Use getOwnPropertyDescriptor to check if property exists and is configurable
          const appDescriptor = Object.getOwnPropertyDescriptor(
            (window as any).PIXI,
            "app",
          );

          if (!appDescriptor) {
            // Property doesn't exist, create it
            Object.defineProperty((window as any).PIXI, "app", {
              value: this.app,
              writable: true,
              configurable: true,
            });
          } else if (appDescriptor.configurable || appDescriptor.writable) {
            // Property exists and can be modified
            (window as any).PIXI.app = this.app;
          } else {
            // Property exists but is sealed/frozen, skip modification
            console.warn(
              "PIXI.app property exists but is not configurable/writable, skipping modification",
            );
          }

          // Handle apps array similarly
          const appsDescriptor = Object.getOwnPropertyDescriptor(
            (window as any).PIXI,
            "apps",
          );

          if (!appsDescriptor) {
            Object.defineProperty((window as any).PIXI, "apps", {
              value: [this.app],
              writable: true,
              configurable: true,
            });
          } else if (Array.isArray((window as any).PIXI.apps)) {
            // Check if this app is already in the array to avoid duplicates
            if (!(window as any).PIXI.apps.includes(this.app)) {
              try {
                (window as any).PIXI.apps.push(this.app);
              } catch (pushError) {
                console.warn("Could not add to PIXI.apps array:", pushError);
              }
            }
          }
        }
      } catch (error) {
        console.warn("Could not extend PIXI object (it may be sealed):", error);
        // Create alternative global references
        (window as any).PIXI_APP_INSTANCE = this.app;
        (window as any).PIXI_APPS = [
          (window as any).PIXI_APPS || [],
          this.app,
        ].flat();
      }

      // Initialize PIXI devtools - for v8.2+ use no-parameter call
      try {

        // For PIXI v8.2+, try with app parameter first
        initDevtools({ app: this.app });

        // Dispatch custom event for additional devtools support
        window.dispatchEvent(
          new CustomEvent("pixi-app-ready", { detail: this.app }),
        );
      } catch (error) {
        console.error(
          "❌ Failed to initialize PIXI devtools with global hooks:",
          error,
        );

        // Fallback to explicit configuration
        try {
          initDevtools({
            app: this.app,
          });
        } catch (fallbackError) {
          try {
            initDevtools({
              renderer: this.app.renderer,
              stage: this.app.stage,
            });
          } catch (finalError) {
            console.error(
              "❌ All devtools initialization methods failed:",
              finalError,
            );
          }
        }
      }

      // Style the canvas to be centered in container
      this.styleCanvas();

      // Store the scale factor for layout calculations
      (this.app as any).scaleToA4 = {
        width: 794 / canvasWidth,
        height: 1123 / canvasHeight,
        canvasWidth,
        canvasHeight,
      };

      console.log(
        `🎨 Canvas dimensions: ${canvasWidth}x${canvasHeight} (A4 dimensions)`,
      );
      console.log(
        "🎨 PIXI Application exposed as window.__PIXI_APP__:",
        !!(window as any).__PIXI_APP__,
      );

      // Enhanced devtools compatibility
      this.enhanceDevtoolsCompatibility();

      return this.app;
    } catch (error) {
      console.error("❌ Failed to initialize PixiJS Application:", error);
      throw error;
    }
  }

  /**
   * Enhanced devtools compatibility measures
   */
  private enhanceDevtoolsCompatibility(): void {
    if (!this.app) return;

    // Register with global hook if available
    if ((window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__) {
      (window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__.register(this.app);
    }

    // Make app detectable by various methods
    const globalTargets = [window, globalThis];
    globalTargets.forEach((target) => {
      if (!(target as any).pixiApps) (target as any).pixiApps = [];
      if (!(target as any).pixiApps.includes(this.app)) {
        (target as any).pixiApps.push(this.app);
      }
    });

    // Add event listeners for devtools frame detection
    this.app.renderer.on("resize", () => {
      // Silent hook for devtools detection
    });

  }

  /**
   * Style the canvas element
   */
  private styleCanvas(): void {
    if (!this.app) return;

    this.app.canvas.style.display = "block";
    this.app.canvas.style.margin = "auto";
    this.app.canvas.style.border = "2px solid #6495ed";
    this.app.canvas.style.borderRadius = "8px";
    this.app.canvas.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.1)";
  }

  /**
   * Resize the application
   */
  public resize(width: number, height: number): void {
    if (this.app) {
      this.app.renderer.resize(width, height);
    }
  }

  /**
   * Get the PIXI application instance
   */
  public getApplication(): Application | null {
    return this.app;
  }

  /**
   * Get canvas dimensions
   */
  public getDimensions(): { width: number; height: number } {
    if (!this.app) {
      return { width: 0, height: 0 };
    }

    return {
      width: this.app.screen.width,
      height: this.app.screen.height,
    };
  }

  /**
   * Get detailed canvas information
   */
  public getCanvasInfo(): any {
    if (!this.app) return null;

    return {
      dimensions: this.getDimensions(),
      renderer: {
        type: this.app.renderer.type,
        resolution: this.app.renderer.resolution,
      },
      stage: {
        children: this.app.stage.children.length,
        interactive: this.app.stage.eventMode === "static",
      },
      scaleToA4: (this.app as any).scaleToA4,
    };
  }

  /**
   * Export canvas as image
   */
  public async exportAsImage(): Promise<string> {
    if (!this.app) {
      throw new Error("PixiJS application not initialized");
    }

    try {
      // Extract the canvas as base64
      const base64 = await this.app.renderer.extract.base64(this.app.stage);
      return base64;
    } catch (error) {
      console.error("❌ Failed to export canvas as image:", error);
      throw error;
    }
  }

  /**
   * Destroy the application
   */
  public destroy(): void {
    if (this.app) {
      this.app.destroy(true, { children: true, texture: true });
      this.app = null;
    }
  }
}
