/**
 * PIXI Application Manager
 * Handles PIXI Application initialization and basic setup
 * Single Responsibility: PIXI App creation and configuration only
 */

import { Application } from "pixi.js";
import { initDevtools } from "@pixi/devtools";

// Expose PIXI globally for devtools (PIXI v8.2+ requirement)
import * as PIXI from "pixi.js";

// Safely expose PIXI globally without trying to extend it
try {
  // Only set if not already set to avoid conflicts
  if (typeof window !== 'undefined' && !(window as any).PIXI) {
    (window as any).PIXI = PIXI;
  }
  if (typeof globalThis !== 'undefined' && !(globalThis as any).PIXI) {
    (globalThis as any).PIXI = PIXI;
  }
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

      // Expose app globally for PIXI devtools using alternative approach
      // Instead of trying to extend PIXI object, use separate properties
      if (typeof window !== 'undefined') {
        (window as any).__PIXI_APP__ = this.app;
        (window as any).__NEPTINO_PIXI_APP__ = this.app; // Backup reference
      }

      // Enhanced devtools compatibility
      this.enhanceDevtoolsCompatibility();

      // Style the canvas
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

    try {
      // Register with global hook if available
      if ((window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__) {
        (window as any).__PIXI_DEVTOOLS_GLOBAL_HOOK__.register(this.app);
      }

      // Make app detectable by various methods
      const globalTargets = [window, globalThis];
      globalTargets.forEach((target) => {
        try {
          if (!(target as any).pixiApps) (target as any).pixiApps = [];
          if (!(target as any).pixiApps.includes(this.app)) {
            (target as any).pixiApps.push(this.app);
          }
        } catch (error) {
          console.warn("Could not register with global target:", error);
        }
      });

      // Add event listeners for devtools frame detection
      this.app.renderer.on("resize", () => {
        // Silent hook for devtools detection
      });

      // Try to initialize devtools
      setTimeout(() => {
        try {
          initDevtools({ app: this.app! });
          console.log("✅ PIXI Devtools initialized successfully");
        } catch (error) {
          console.warn("⚠️ Could not initialize PIXI devtools:", error);
        }
      }, 100);

    } catch (error) {
      console.warn("⚠️ Error in devtools compatibility setup:", error);
    }
  }

  /**
   * Style the canvas element
   */
  private styleCanvas(): void {
    if (!this.app) return;

    try {
      // Apply base canvas class for CSS styling
      this.app.canvas.classList.add('coursebuilder-canvas');
    } catch (error) {
      console.warn("Could not style canvas:", error);
    }
  }

  /**
   * Resize the application
   */
  public resize(width: number, height: number): void {
    if (this.app) {
      try {
        this.app.renderer.resize(width, height);
      } catch (error) {
        console.error("Error resizing PIXI application:", error);
      }
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
      try {
        this.app.destroy(true, { children: true, texture: true });
        this.app = null;
      } catch (error) {
        console.error("Error destroying PIXI application:", error);
      }
    }
  }
}
