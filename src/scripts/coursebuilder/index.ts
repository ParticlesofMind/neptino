/**
 * CourseBuilder System - Centralized exports
 * Main entry point for coursebuilder functionality
 */

// Main coursebuilder class
export { CourseBuilderCanvas } from './coursebuilder';

// Utility classes
export { ErrorBoundary } from './utils/ErrorBoundary';
export { PerformanceMonitor } from './utils/PerformanceMonitor';

// UI components
export { AdaptiveSearchManager } from './ui/AdaptiveSearchManager';

// Dropdown system exports
export { DropdownDOMHelper } from './helpers/DropdownDOMHelper';
export { DropdownRenderer } from './helpers/DropdownRenderer';
export { CourseBuilderDropdownHandler } from './dropdownHandler';

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
