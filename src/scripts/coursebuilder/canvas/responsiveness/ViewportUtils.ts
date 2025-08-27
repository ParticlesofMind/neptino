/**
 * ViewportUtils - Utility functions for viewport detection and information
 * 
 * Responsibilities:
 * - Detect device type and capabilities
 * - Calculate viewport dimensions and ratios
 * - Provide responsive breakpoint utilities
 * - Handle orientation and device pixel ratio
 * 
 * Target: ~150 lines
 */

import { ViewportInfo, DEFAULT_BREAKPOINTS } from './ResponsiveTypes';

export class ViewportUtils {
  /**
   * Get comprehensive viewport information
   */
  public static getViewportInfo(): ViewportInfo {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    return {
      width,
      height,
      pixelRatio,
      isMobile: this.isMobile(),
      isTablet: this.isTablet(),
      isDesktop: this.isDesktop(),
      orientation: this.getOrientation()
    };
  }

  /**
   * Check if current device is mobile
   */
  public static isMobile(): boolean {
    const width = window.innerWidth;
    return width <= DEFAULT_BREAKPOINTS.mobile;
  }

  /**
   * Check if current device is tablet
   */
  public static isTablet(): boolean {
    const width = window.innerWidth;
    return width > DEFAULT_BREAKPOINTS.mobile && width <= DEFAULT_BREAKPOINTS.tablet;
  }

  /**
   * Check if current device is desktop
   */
  public static isDesktop(): boolean {
    const width = window.innerWidth;
    return width >= DEFAULT_BREAKPOINTS.desktop;
  }

  /**
   * Get current orientation
   */
  public static getOrientation(): 'landscape' | 'portrait' {
    return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
  }

  /**
   * Get device pixel ratio
   */
  public static getPixelRatio(): number {
    return window.devicePixelRatio || 1;
  }

  /**
   * Calculate optimal canvas dimensions for viewport
   */
  public static calculateOptimalDimensions(
    targetWidth: number,
    targetHeight: number,
    containerWidth: number,
    containerHeight: number,
    maintainAspectRatio: boolean = true
  ): { width: number; height: number; scale: number } {
    
    if (!maintainAspectRatio) {
      return {
        width: containerWidth,
        height: containerHeight,
        scale: Math.min(containerWidth / targetWidth, containerHeight / targetHeight)
      };
    }

    const targetRatio = targetWidth / targetHeight;
    const containerRatio = containerWidth / containerHeight;

    let width: number;
    let height: number;
    let scale: number;

    if (containerRatio > targetRatio) {
      // Container is wider than target - fit to height
      height = containerHeight;
      width = height * targetRatio;
      scale = height / targetHeight;
    } else {
      // Container is taller than target - fit to width
      width = containerWidth;
      height = width / targetRatio;
      scale = width / targetWidth;
    }

    return { width, height, scale };
  }

  /**
   * Get viewport dimensions from element or window
   */
  public static getDimensions(target: HTMLElement | Window | null): { width: number; height: number } {
    if (!target) {
      return { width: 0, height: 0 };
    }

    if (target === window) {
      return {
        width: window.innerWidth,
        height: window.innerHeight
      };
    }

    // HTMLElement
    const element = target as HTMLElement;
    const rect = element.getBoundingClientRect();
    
    return {
      width: rect.width || element.offsetWidth,
      height: rect.height || element.offsetHeight
    };
  }

  /**
   * Check if viewport has changed significantly
   */
  public static hasSignificantChange(
    oldDimensions: { width: number; height: number },
    newDimensions: { width: number; height: number },
    threshold: number = 10
  ): boolean {
    const widthDiff = Math.abs(newDimensions.width - oldDimensions.width);
    const heightDiff = Math.abs(newDimensions.height - oldDimensions.height);
    
    return widthDiff >= threshold || heightDiff >= threshold;
  }

  /**
   * Get CSS media query for responsive breakpoints
   */
  public static getMediaQuery(breakpoint: 'mobile' | 'tablet' | 'desktop'): string {
    switch (breakpoint) {
      case 'mobile':
        return `(max-width: ${DEFAULT_BREAKPOINTS.mobile}px)`;
      case 'tablet':
        return `(min-width: ${DEFAULT_BREAKPOINTS.mobile + 1}px) and (max-width: ${DEFAULT_BREAKPOINTS.tablet}px)`;
      case 'desktop':
        return `(min-width: ${DEFAULT_BREAKPOINTS.desktop}px)`;
      default:
        return '';
    }
  }

  /**
   * Add viewport meta tag for mobile optimization
   */
  public static setupViewportMeta(): void {
    let viewport = document.querySelector('meta[name="viewport"]') as HTMLMetaElement;
    
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }

    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
  }
}
