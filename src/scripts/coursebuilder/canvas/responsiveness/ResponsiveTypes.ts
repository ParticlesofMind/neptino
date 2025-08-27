/**
 * ResponsiveTypes - Type definitions for responsiveness system
 * 
 * Responsibilities:
 * - Define interfaces for responsiveness components
 * - Type-safe configuration options
 * - Event callback types
 * - Dimension and viewport types
 * 
 * Target: ~100 lines
 */

export enum ResponsiveMode {
  /** Resize to browser window */
  WINDOW = 'window',
  /** Resize to specific HTML element */
  ELEMENT = 'element',
  /** No automatic resizing */
  MANUAL = 'manual'
}

export interface ResponsiveDimensions {
  width: number;
  height: number;
  aspectRatio?: number;
}

export interface ResponsiveSettings {
  /** Enable/disable responsiveness */
  enabled: boolean;
  /** Responsive mode */
  mode: ResponsiveMode;
  /** Maintain aspect ratio when resizing */
  maintainAspectRatio: boolean;
  /** Minimum canvas width */
  minWidth: number;
  /** Minimum canvas height */
  minHeight: number;
  /** Maximum canvas width */
  maxWidth: number;
  /** Maximum canvas height */
  maxHeight: number;
  /** Throttle resize events (milliseconds) */
  throttleMs: number;
}

export interface ViewportInfo {
  /** Current viewport width */
  width: number;
  /** Current viewport height */
  height: number;
  /** Device pixel ratio */
  pixelRatio: number;
  /** Is mobile device */
  isMobile: boolean;
  /** Is tablet device */
  isTablet: boolean;
  /** Is desktop device */
  isDesktop: boolean;
  /** Orientation */
  orientation: 'landscape' | 'portrait';
}

export interface ResizeEventData {
  /** New dimensions */
  dimensions: ResponsiveDimensions;
  /** Previous dimensions */
  previousDimensions: ResponsiveDimensions;
  /** Viewport information */
  viewport: ViewportInfo;
  /** Timestamp of resize event */
  timestamp: number;
}

export type ResizeCallback = (data: ResizeEventData) => void;

export interface ResponsiveBreakpoints {
  /** Mobile breakpoint (max width) */
  mobile: number;
  /** Tablet breakpoint (max width) */
  tablet: number;
  /** Desktop breakpoint (min width) */
  desktop: number;
}

export const DEFAULT_BREAKPOINTS: ResponsiveBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1025
};

export interface ResponsiveConstraints {
  /** Minimum scale factor */
  minScale: number;
  /** Maximum scale factor */
  maxScale: number;
  /** Force specific aspect ratio */
  aspectRatio?: number;
  /** Padding around canvas */
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
