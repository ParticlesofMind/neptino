/**
 * CourseBuilder System - Centralized exports
 * Main entry point for coursebuilder functionality
 */

// Main coursebuilder class
export { CourseBuilderCanvas } from './coursebuilder';

// Utility classes
export { ErrorBoundary } from './utils/ErrorBoundary';


// UI components
export { AdaptiveSearchManager } from './ui/AdaptiveSearchManager';


// Type exports
export type {
  DropdownOption,
  DropdownElements,
  DropdownConfig,
  DropdownRenderOptions,
  DropdownDataConfig,
  CascadingConfig,
  DropdownError,
  DropdownEvent,
  DropdownEventType,
  DataLoader,
  SyncDataLoader
} from './types/DropdownTypes';
