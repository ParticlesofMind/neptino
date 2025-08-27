/**
 * ResponsivenessManager - Main Responsiveness Controller
 * 
 * Responsibilities:
 * - Coordinate all responsive features
 * - Initialize ResizePlugin and other responsive components
 * - Manage responsive configuration and settings
 * - Provide unified API for responsive canvas features
 * 
 * Target: ~200 lines
 */

import { Application } from 'pixi.js';
import { ResizeHandler } from './ResizeHandler';
import { ViewportAdapter } from './ViewportAdapter';
import { ResponsiveSettings, ResponsiveMode } from './ResponsiveTypes';

export class ResponsivenessManager {
  private app: Application | null = null;
  private resizeHandler: ResizeHandler | null = null;
  private viewportAdapter: ViewportAdapter | null = null;
  private settings: ResponsiveSettings;
  private initialized: boolean = false;

  constructor(settings: Partial<ResponsiveSettings> = {}) {
    this.settings = {
      enabled: true,
      mode: ResponsiveMode.WINDOW,
      maintainAspectRatio: true,
      minWidth: 400,
      minHeight: 300,
      maxWidth: 2560,
      maxHeight: 1440,
      throttleMs: 16, // ~60fps
      ...settings
    };
  }

  /**
   * Initialize responsiveness system
   */
  public async initialize(app: Application, containerSelector?: string): Promise<void> {
    if (this.initialized) {
      console.warn('⚠️ ResponsivenessManager already initialized');
      return;
    }

    if (!app) {
      throw new Error('PIXI Application is required for responsiveness');
    }

    this.app = app;

    try {
      console.log('📱 Initializing ResponsivenessManager...');

      // Create resize handler
      this.resizeHandler = new ResizeHandler(this.settings);
      await this.resizeHandler.initialize(app, containerSelector);

      // Create viewport adapter
      this.viewportAdapter = new ViewportAdapter(this.settings);
      this.viewportAdapter.initialize(app);

      // Connect resize events to viewport updates
      this.resizeHandler.onResize((dimensions) => {
        if (this.viewportAdapter) {
          this.viewportAdapter.updateViewport(dimensions);
        }
      });

      this.initialized = true;
      console.log('✅ ResponsivenessManager initialized');

      // Trigger initial resize to set proper dimensions
      this.resizeHandler.triggerResize();

    } catch (error) {
      console.error('❌ Failed to initialize ResponsivenessManager:', error);
      throw error;
    }
  }

  /**
   * Enable responsiveness
   */
  public enable(): void {
    this.settings.enabled = true;
    if (this.resizeHandler) {
      this.resizeHandler.enable();
    }
    console.log('📱 Responsiveness enabled');
  }

  /**
   * Disable responsiveness
   */
  public disable(): void {
    this.settings.enabled = false;
    if (this.resizeHandler) {
      this.resizeHandler.disable();
    }
    console.log('📱 Responsiveness disabled');
  }

  /**
   * Update responsiveness settings
   */
  public updateSettings(newSettings: Partial<ResponsiveSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    
    if (this.resizeHandler) {
      this.resizeHandler.updateSettings(this.settings);
    }
    
    if (this.viewportAdapter) {
      this.viewportAdapter.updateSettings(this.settings);
    }

    console.log('📱 Responsiveness settings updated:', newSettings);
  }

  /**
   * Change responsive mode
   */
  public setMode(mode: ResponsiveMode, target?: HTMLElement): void {
    this.settings.mode = mode;
    
    if (this.resizeHandler) {
      this.resizeHandler.setMode(mode, target);
    }

    console.log('📱 Responsiveness mode changed to:', mode);
  }

  /**
   * Get current canvas dimensions
   */
  public getDimensions(): { width: number; height: number } {
    if (!this.app) {
      return { width: 0, height: 0 };
    }
    
    return {
      width: this.app.renderer.width,
      height: this.app.renderer.height
    };
  }

  /**
   * Get current responsive settings
   */
  public getSettings(): ResponsiveSettings {
    return { ...this.settings };
  }

  /**
   * Check if responsiveness is active
   */
  public isEnabled(): boolean {
    return this.settings.enabled;
  }

  /**
   * Force a resize operation
   */
  public forceResize(): void {
    if (this.resizeHandler) {
      this.resizeHandler.triggerResize();
    }
  }

  /**
   * Get resize handler for advanced control
   */
  public getResizeHandler(): ResizeHandler | null {
    return this.resizeHandler;
  }

  /**
   * Get viewport adapter for advanced control
   */
  public getViewportAdapter(): ViewportAdapter | null {
    return this.viewportAdapter;
  }

  /**
   * Clean up responsiveness system
   */
  public destroy(): void {
    console.log('🧹 Cleaning up ResponsivenessManager...');

    if (this.resizeHandler) {
      this.resizeHandler.destroy();
      this.resizeHandler = null;
    }

    if (this.viewportAdapter) {
      this.viewportAdapter.destroy();
      this.viewportAdapter = null;
    }

    this.app = null;
    this.initialized = false;

    console.log('✅ ResponsivenessManager cleaned up');
  }
}
