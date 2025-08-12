/**
 * Canvas Manager
 * Manages canvas state, rendering pipeline, and coordinate transformations
 * Single Responsibility: Canvas lifecycle and state management only
 */

import * as PIXI from "pixi.js";
import { LayoutRenderer } from "../layout/LayoutRenderer";

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private pixiApp: any; // PIXI.Application
  private layoutRenderer: LayoutRenderer | null = null;
  private currentTemplate: any = null;
  private isLayoutVisible: boolean = true;

  constructor(canvasId: string = "canvas") {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }

    this.ctx = this.canvas.getContext("2d")!;
    this.initializeCanvas();
  }

  /**
   * Initialize canvas and PIXI application
   */
  private initializeCanvas(): void {
    // Set canvas size
    this.resizeCanvas();

    // Initialize PIXI if available
    if (typeof PIXI !== "undefined") {
      this.initializePixi();
    }

    // Bind resize events
    window.addEventListener("resize", this.resizeCanvas.bind(this));
  }

  /**
   * Initialize PIXI application
   */
  private initializePixi(): void {
    this.pixiApp = new PIXI.Application({
      view: this.canvas,
      width: this.canvas.width,
      height: this.canvas.height,
      backgroundColor: 0xffffff,
      antialias: true,
    });

    console.log("📱 PIXI application initialized");
  }

  /**
   * Resize canvas to container size
   */
  private resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;

    if (this.pixiApp) {
      this.pixiApp.renderer.resize(rect.width, rect.height);
    }

    // Trigger re-render if layout is active
    if (this.layoutRenderer && this.currentTemplate) {
      this.renderLayout();
    }
  }

  /**
   * Set layout renderer
   */
  setLayoutRenderer(renderer: LayoutRenderer): void {
    this.layoutRenderer = renderer;
  }

  /**
   * Load and render template
   */
  async loadTemplate(template: any): Promise<void> {
    this.currentTemplate = template;

    if (this.layoutRenderer) {
      // Note: LayoutRenderer doesn't have renderTemplate method
      // Template data should be processed before calling renderLayoutStructure
      console.log("📋 Template loaded:", template.name);
      this.renderLayout();
    }
  }

  /**
   * Render current layout
   */
  renderLayout(): void {
    if (!this.layoutRenderer || !this.currentTemplate) return;

    this.clearCanvas();

    if (this.isLayoutVisible) {
      // Use renderLayoutStructure with blocks from template
      const blocks = this.currentTemplate.blocks || [];
      this.layoutRenderer.renderLayoutStructure(blocks, true);
    }
  }

  /**
   * Toggle layout visibility
   */
  toggleLayoutVisibility(): void {
    this.isLayoutVisible = !this.isLayoutVisible;
    this.renderLayout();

    console.log(`👁️ Layout visibility: ${this.isLayoutVisible ? "ON" : "OFF"}`);
  }

  /**
   * Clear entire canvas
   */
  clearCanvas(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.pixiApp) {
      this.pixiApp.stage.removeChildren();
    }
  }

  /**
   * Clear all content (canvas + layout)
   */
  clearAll(): void {
    this.clearCanvas();
    this.currentTemplate = null;

    if (this.layoutRenderer) {
      this.layoutRenderer.clear();
    }

    console.log("🧹 Canvas and layout cleared");
  }

  /**
   * Add new page to canvas
   */
  addPage(): void {
    if (!this.currentTemplate) {
      console.warn("No template loaded - cannot add page");
      return;
    }

    // Logic for adding new page
    console.log("📄 Adding new page");

    // Trigger re-render with new page
    this.renderLayout();
  }

  /**
   * Get canvas dimensions
   */
  getDimensions(): { width: number; height: number } {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  /**
   * Get canvas element
   */
  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /**
   * Get canvas context
   */
  getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  /**
   * Get PIXI application
   */
  getPixiApp(): any {
    return this.pixiApp;
  }

  /**
   * Get current template
   */
  getCurrentTemplate(): any {
    return this.currentTemplate;
  }

  /**
   * Check if layout is visible
   */
  isLayoutVisibleState(): boolean {
    return this.isLayoutVisible;
  }

  /**
   * Convert screen coordinates to canvas coordinates
   */
  screenToCanvas(screenX: number, screenY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: screenX - rect.left,
      y: screenY - rect.top,
    };
  }

  /**
   * Convert canvas coordinates to screen coordinates
   */
  canvasToScreen(canvasX: number, canvasY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: canvasX + rect.left,
      y: canvasY + rect.top,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    window.removeEventListener("resize", this.resizeCanvas);

    if (this.pixiApp) {
      this.pixiApp.destroy();
    }

    this.layoutRenderer = null;
    this.currentTemplate = null;
  }
}
