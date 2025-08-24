import * as PIXI from 'pixi.js';

/**
 * PixiRenderer - Simple PIXI.js renderer for coursebuilder canvas
 * Handles basic PIXI application setup and rendering
 */
export class PixiRenderer {
  private app: PIXI.Application | null = null;
  private container: HTMLElement | null = null;

  constructor(containerId: string) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      throw new Error(`Container with id '${containerId}' not found`);
    }
  }

  /**
   * Initialize PIXI application
   */
  async init(width: number = 800, height: number = 600): Promise<void> {
    try {
      console.log('🎨 Initializing PIXI renderer...');

      this.app = new PIXI.Application({
        width,
        height,
        backgroundColor: 0xf8f9fa,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true
      });

      // Add canvas to container
      this.container!.appendChild(this.app.view as HTMLCanvasElement);

      // Add a simple test graphic
      this.addTestGraphics();

      console.log('✅ PIXI renderer initialized');
    } catch (error) {
      console.error('❌ Failed to initialize PIXI:', error);
      throw error;
    }
  }

 /**
 * Add simple test graphics to verify PIXI is working
 */
 addTestGraphics(): void {
 if (!this.app) return;

 // Add a simple blue rectangle
 const graphics = new PIXI.Graphics();
 graphics.beginFill(0x4da6ff); // Blue color matching coursebuilder theme
 graphics.drawRect(50, 50, 200, 100);
 graphics.endFill();

 // Add some text
 const text = new PIXI.Text('PIXI.js Canvas Ready!', {
 fontFamily: 'Arial',
 fontSize: 18,
 fill: 0x2c3e50,
 align: 'center'
 });
 text.x = 60;
 text.y = 180;

 this.app.stage.addChild(graphics);
 this.app.stage.addChild(text);
 }  /**
   * Resize the renderer
   */
  resize(width: number, height: number): void {
    if (this.app) {
      this.app.renderer.resize(width, height);
    }
  }

  /**
   * Get the PIXI application instance
   */
  getApp(): PIXI.Application | null {
    return this.app;
  }

  /**
   * Clear all graphics
   */
  clear(): void {
    if (this.app) {
      this.app.stage.removeChildren();
    }
  }

  /**
   * Destroy the renderer
   */
  destroy(): void {
    if (this.app) {
      this.app.destroy(true);
      this.app = null;
    }
  }
}
