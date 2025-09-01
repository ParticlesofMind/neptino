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
      width: 900,           // Canvas width (4:3 aspect ratio)
      height: 1200,         // Canvas height (4:3 aspect ratio)
      backgroundColor: 0xffffff, // White background
      antialias: true,      // Enable antialiasing for smooth edges
      resolution: window.devicePixelRatio || 1, // Use device pixel ratio for crisp rendering
      autoDensity: true     // Automatically adjust canvas CSS size
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      console.log('🎨 Creating PIXI Application with optimized settings...', finalConfig);

      this.app = new Application();
      await this.app.init({
        ...finalConfig,
        preference: 'webgl', // Prefer WebGL for better performance and quality
        hello: false, // Disable PIXI hello message
      });

      console.log('✅ PIXI Application created successfully');
      console.log(`📐 Canvas size: ${finalConfig.width}x${finalConfig.height}`);
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
      // Check if container has grid layout class
      const hasGridLayout = this.container.classList.contains('engine__canvas--grid');
      
      if (hasGridLayout) {
        // For grid layout, preserve existing content and insert canvas in proper grid position
        // Remove any existing canvas first
        const existingCanvas = this.container.querySelector('canvas');
        if (existingCanvas) {
          existingCanvas.remove();
        }
        
        // Insert canvas after perspective tools (grid-column: 2 will position it correctly)
        const perspectiveTools = this.container.querySelector('.engine__perspective');
        if (perspectiveTools) {
          perspectiveTools.insertAdjacentElement('afterend', this.app.canvas);
        } else {
          // Fallback: append to container
          this.container.appendChild(this.app.canvas);
        }
      } else {
        // Legacy behavior: clear content and add canvas
        this.container.innerHTML = '';
        this.container.appendChild(this.app.canvas);
      }
      
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
   * Get the container selector
   */
  public getContainerSelector(): string {
    return this.containerSelector;
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
