/**
 * PixiApp - Pixi Application Creation & DOM Mounting
 * 
 * Responsibilities:
 * - Create PIXI.Application with proper configuration
 * - Mount canvas to HTML container
 * - Handle basic app lifecycle (create/destroy)
 * - Provide access to the app instance
 * 
 * Target: ~100 lines
 */

import { Application } from 'pixi.js';

export interface PixiAppConfig {
  width: number;
  height: number;
  backgroundColor: number;
  antialias?: boolean;
  resolution?: number;
  autoDensity?: boolean;
}

export class PixiApp {
  private app: Application | null = null;
  private container: HTMLElement | null = null;
  private mounted: boolean = false;

  constructor(private containerSelector: string) {
    this.container = document.querySelector(containerSelector);
    if (!this.container) {
      throw new Error(`Canvas container '${containerSelector}' not found`);
    }
  }

  /**
   * Create the PIXI application with coursebuilder-specific settings
   */
  public async create(config?: Partial<PixiAppConfig>): Promise<Application> {
    if (this.app) {
      console.warn('⚠️ PixiApp already created');
      return this.app;
    }

    const defaultConfig: PixiAppConfig = {
      width: 794,           // A4 width in pixels
      height: 1123,         // A4 height in pixels  
      backgroundColor: 0xffffff, // White background
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      console.log('🎨 Creating PIXI Application...', finalConfig);

      this.app = new Application();
      await this.app.init(finalConfig);

      console.log('✅ PIXI Application created successfully');
      return this.app;

    } catch (error) {
      console.error('❌ Failed to create PIXI Application:', error);
      throw error;
    }
  }

  /**
   * Mount the canvas to the DOM container
   */
  public mount(): void {
    if (!this.app) {
      throw new Error('Cannot mount: PIXI app not created yet');
    }

    if (!this.container) {
      throw new Error('Cannot mount: container not found');
    }

    if (this.mounted) {
      console.warn('⚠️ Canvas already mounted');
      return;
    }

    try {
      // Clear any existing content
      this.container.innerHTML = '';
      
      // Mount the canvas
      this.container.appendChild(this.app.canvas);
      this.mounted = true;

      console.log('✅ Canvas mounted to', this.containerSelector);

    } catch (error) {
      console.error('❌ Failed to mount canvas:', error);
      throw error;
    }
  }

  /**
   * Get the PIXI application instance
   */
  public getApp(): Application | null {
    return this.app;
  }

  /**
   * Get canvas dimensions
   */
  public getDimensions(): { width: number; height: number } {
    if (!this.app) {
      return { width: 0, height: 0 };
    }
    
    // Check if canvas is available - it might not be ready immediately after init
    if (!this.app.canvas) {
      console.warn('⚠️ Canvas not yet available - returning zero dimensions');
      return { width: 0, height: 0 };
    }
    
    return {
      width: this.app.canvas.width,
      height: this.app.canvas.height
    };
  }

  /**
   * Check if app is created and mounted
   */
  public isReady(): boolean {
    return this.app !== null && this.mounted && this.app.canvas !== undefined;
  }

  /**
   * Destroy the application and clean up
   */
  public destroy(): void {
    if (this.app) {
      this.app.destroy(true, true);
      this.app = null;
    }

    if (this.container) {
      this.container.innerHTML = '';
    }

    this.mounted = false;
    console.log('🗑️ PixiApp destroyed');
  }
}
