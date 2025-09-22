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
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/canvasSizing';

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

    // Optimized resolution for performance and quality balance
    const devicePixelRatio = window.devicePixelRatio || 1;
    // Cap resolution at 2x to prevent excessive memory usage on high-DPI displays
    const optimizedResolution = Math.min(devicePixelRatio, 2); 

    const defaultConfig: PixiAppConfig = {
      width: CANVAS_WIDTH,  // Canvas width from canvasSizing.ts
      height: CANVAS_HEIGHT, // Canvas height from canvasSizing.ts
      backgroundColor: 0xffffff, // White background
      antialias: true,      // Enable antialiasing for smooth edges
      resolution: optimizedResolution, // Capped resolution for performance
      autoDensity: true     // Ensure CSS size matches logical width/height
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {

      this.app = new Application();
      await this.app.init({
        ...finalConfig,
        preference: 'webgl', // Prefer WebGL for better performance and quality
        hello: false, // Disable PIXI hello message
      });

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
      const hasGridLayout = this.container.classList.contains('canvas--grid') || 
                            this.container.classList.contains('engine__canvas--grid');
      
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
      
      // Ensure a stable id on the canvas for tools/tests that query it
      try {
        this.app.canvas.id = 'pixi-canvas';
        // Make canvas focusable for keyboard handling
        (this.app.canvas as any).tabIndex = 0;
        
        // With autoDensity=true, PIXI manages CSS size automatically to match logical dimensions
      } catch {}

      this.mounted = true;


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
    if (!this.app) return { width: 0, height: 0 };
    const screen = (this.app as any).screen || this.app.renderer.screen;
    return { width: screen.width, height: screen.height };
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
      // Remove only the canvas element, preserve other grid elements like perspective tools
      const canvas = this.container.querySelector('canvas');
      if (canvas) {
        canvas.remove();
      }
      
      // If no grid layout, clear everything (legacy behavior)
      const hasGridLayout = this.container.classList.contains('canvas--grid') || 
                            this.container.classList.contains('engine__canvas--grid');
      if (!hasGridLayout) {
        this.container.innerHTML = '';
      }
    }

    this.mounted = false;
  }
}
