/**
 * Responsiveness Module Index
 * 
 * Responsibilities:
 * - Export all responsiveness components
 * - Provide convenient imports for other modules
 * - Define the public API for the responsiveness system
 * 
 * Target: ~50 lines
 */

// Main responsiveness manager
export { ResponsivenessManager } from './ResponsivenessManager';

// Core components
export { ResizeHandler } from './ResizeHandler';
export { ViewportAdapter } from './ViewportAdapter';

// Utilities
export { ViewportUtils } from './ViewportUtils';

// Types and interfaces
export type {
  ResponsiveSettings,
  ResponsiveDimensions,
  ViewportInfo,
  ResizeEventData,
  ResizeCallback,
  ResponsiveBreakpoints,
  ResponsiveConstraints
} from './ResponsiveTypes';

export {
  ResponsiveMode,
  DEFAULT_BREAKPOINTS
} from './ResponsiveTypes';

// Convenience factory function
import { ResponsivenessManager } from './ResponsivenessManager';
import { ResponsiveMode, ResponsiveSettings } from './ResponsiveTypes';

export function createResponsivenessManager(settings?: Partial<ResponsiveSettings>) {
  return new ResponsivenessManager(settings);
}

// Default responsive settings for common use cases
export const RESPONSIVE_PRESETS = {
  WINDOW_RESPONSIVE: {
    enabled: true,
    mode: ResponsiveMode.WINDOW,
    maintainAspectRatio: true,
    throttleMs: 16
  } as Partial<ResponsiveSettings>,
  
  CONTAINER_RESPONSIVE: {
    enabled: true,
    mode: ResponsiveMode.ELEMENT,
    maintainAspectRatio: true,
    throttleMs: 16
  } as Partial<ResponsiveSettings>,
  
  MOBILE_OPTIMIZED: {
    enabled: true,
    mode: ResponsiveMode.WINDOW,
    maintainAspectRatio: true,
    minWidth: 320,
    minHeight: 240,
    throttleMs: 33 // ~30fps for mobile
  } as Partial<ResponsiveSettings>
};
