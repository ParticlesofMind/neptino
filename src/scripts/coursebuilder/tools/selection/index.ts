/**
 * Selection Tool Suite - Unified Export
 * Provides a complete selection, scaling, and rotation system for canvas objects
 */

// Core modules
export { MarqueeSelection } from "./marqueeSelection";
export { ClickSelection } from "./clickSelection";  
export { SelectionVisuals } from "./selectionVisuals";
export { SelectionCoordinator } from "./selectionCoordinator";

// Functionality modules
export { ScaleObjects } from "./scaleObjects";
export { RotateObjects } from "./rotateObjects";

// Types
export * from "./types";

// Main selection tool - now uses the modular coordinator
export { SelectionCoordinator as SelectionTool } from "./selectionCoordinator";
