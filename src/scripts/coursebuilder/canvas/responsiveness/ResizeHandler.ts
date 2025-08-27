/**
 * ResizeHandler - Handle canvas resizing with ResizePlugin integration
 * 
 * Responsibilities:
 * - Integrate with PixiJS ResizePlugin
 * - Handle window and element resize events
 * - Throttle resize operations for performance
 * - Manage resize callbacks and notifications
 * 
 * Target: ~250 lines
 */

import { Application } from 'pixi.js';
import { 
  ResponsiveSettings, 
  ResponsiveMode, 
  ResizeCallback, 
  ResizeEventData, 
  ResponsiveDimensions
} from './ResponsiveTypes';
import { ViewportUtils } from './ViewportUtils';

export class ResizeHandler {
  private app: Application | null = null;
  private settings: ResponsiveSettings;
  private callbacks: ResizeCallback[] = [];
  private currentTarget: HTMLElement | Window | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private throttleTimer: number | null = null;
  private lastDimensions: ResponsiveDimensions | null = null;
  private enabled: boolean = true;

  constructor(settings: ResponsiveSettings) {
    this.settings = { ...settings };
  }

  /**
   * Initialize resize handling with PixiJS ResizePlugin
   */
  public async initialize(app: Application, containerSelector?: string): Promise<void> {
    this.app = app;

    console.log('📏 Initializing ResizeHandler...');

    // Set up initial resize target based on mode
    this.setupResizeTarget(containerSelector);

    // Store initial dimensions
    this.lastDimensions = {
      width: app.renderer.width,
      height: app.renderer.height,
      aspectRatio: app.renderer.width / app.renderer.height
    };

    console.log('✅ ResizeHandler initialized');
  }

  /**
   * Set up resize target based on current mode
   */
  private setupResizeTarget(containerSelector?: string): void {
    if (!this.app) return;

    // Clean up existing setup
    this.cleanupResizeTarget();

    switch (this.settings.mode) {
      case ResponsiveMode.WINDOW:
        this.setupWindowResize();
        break;
      
      case ResponsiveMode.ELEMENT:
        this.setupElementResize(containerSelector);
        break;
      
      case ResponsiveMode.MANUAL:
        // No automatic resizing - cast to any to bypass type check
        (this.app as any).resizeTo = null;
        break;
    }
  }

  /**
   * Set up window resizing using ResizePlugin
   */
  private setupWindowResize(): void {
    if (!this.app) return;

    console.log('📏 Setting up window resize with ResizePlugin');
    
    // Use PixiJS ResizePlugin to resize to window
    this.app.resizeTo = window;
    this.currentTarget = window;

    // Add our own resize listener for callbacks
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  /**
   * Set up element resizing using ResizePlugin and ResizeObserver
   */
  private setupElementResize(containerSelector?: string): void {
    if (!this.app) return;

    let targetElement: HTMLElement | null = null;

    if (containerSelector) {
      targetElement = document.querySelector(containerSelector);
    } else {
      // Try to find the canvas parent element
      const canvasParent = this.app.canvas.parentElement;
      targetElement = canvasParent;
    }

    if (!targetElement) {
      console.warn('⚠️ Could not find target element for resizing, falling back to window');
      this.setupWindowResize();
      return;
    }

    console.log('📏 Setting up element resize with ResizePlugin');
    
    // Use PixiJS ResizePlugin to resize to element
    this.app.resizeTo = targetElement;
    this.currentTarget = targetElement;

    // Use ResizeObserver for better element resize detection
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(this.handleElementResize.bind(this));
      this.resizeObserver.observe(targetElement);
    } else {
      // Fallback to window resize
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  }

  /**
   * Handle window resize events
   */
  private handleResize(): void {
    if (!this.enabled || !this.app) return;

    this.throttledResize();
  }

  /**
   * Handle element resize events from ResizeObserver
   */
  private handleElementResize(entries: ResizeObserverEntry[]): void {
    if (!this.enabled || !this.app || entries.length === 0) return;

    this.throttledResize();
  }

  /**
   * Throttled resize handler
   */
  private throttledResize(): void {
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
    }

    this.throttleTimer = window.setTimeout(() => {
      this.performResize();
      this.throttleTimer = null;
    }, this.settings.throttleMs);
  }

  /**
   * Perform the actual resize operation and notify callbacks
   */
  private performResize(): void {
    if (!this.app || !this.lastDimensions) return;

    const currentDimensions: ResponsiveDimensions = {
      width: this.app.renderer.width,
      height: this.app.renderer.height,
      aspectRatio: this.app.renderer.width / this.app.renderer.height
    };

    // Check if dimensions actually changed
    const changed = (
      currentDimensions.width !== this.lastDimensions.width ||
      currentDimensions.height !== this.lastDimensions.height
    );

    if (!changed) return;

    const viewport = ViewportUtils.getViewportInfo();

    const eventData: ResizeEventData = {
      dimensions: currentDimensions,
      previousDimensions: this.lastDimensions,
      viewport,
      timestamp: Date.now()
    };

    console.log('📏 Canvas resized:', {
      from: this.lastDimensions,
      to: currentDimensions
    });

    // Update stored dimensions
    this.lastDimensions = currentDimensions;

    // Notify callbacks
    this.callbacks.forEach(callback => {
      try {
        callback(eventData);
      } catch (error) {
        console.error('❌ Error in resize callback:', error);
      }
    });
  }

  /**
   * Add resize callback
   */
  public onResize(callback: ResizeCallback): void {
    this.callbacks.push(callback);
  }

  /**
   * Remove resize callback
   */
  public offResize(callback: ResizeCallback): void {
    const index = this.callbacks.indexOf(callback);
    if (index > -1) {
      this.callbacks.splice(index, 1);
    }
  }

  /**
   * Change resize mode
   */
  public setMode(mode: ResponsiveMode, target?: HTMLElement): void {
    this.settings.mode = mode;

    if (mode === ResponsiveMode.ELEMENT && target) {
      // Custom element target provided
      this.setupElementResize();
      if (this.app) {
        this.app.resizeTo = target;
      }
    } else {
      this.setupResizeTarget();
    }
  }

  /**
   * Update settings
   */
  public updateSettings(settings: ResponsiveSettings): void {
    this.settings = { ...settings };
  }

  /**
   * Enable resize handling
   */
  public enable(): void {
    this.enabled = true;
  }

  /**
   * Disable resize handling
   */
  public disable(): void {
    this.enabled = false;
  }

  /**
   * Force trigger resize
   */
  public triggerResize(): void {
    if (this.app) {
      this.performResize();
    }
  }

  /**
   * Clean up resize target
   */
  private cleanupResizeTarget(): void {
    // Remove window listener
    window.removeEventListener('resize', this.handleResize.bind(this));

    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clear throttle timer
    if (this.throttleTimer) {
      clearTimeout(this.throttleTimer);
      this.throttleTimer = null;
    }
  }

  /**
   * Destroy resize handler
   */
  public destroy(): void {
    console.log('🧹 Cleaning up ResizeHandler...');

    this.cleanupResizeTarget();
    
    if (this.app) {
      (this.app as any).resizeTo = null;
    }

    this.callbacks = [];
    this.app = null;
    this.currentTarget = null;
    this.lastDimensions = null;

    console.log('✅ ResizeHandler cleaned up');
  }
}
