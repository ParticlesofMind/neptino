/**
 * Selection Tool Suite - Unified Export
 * Provides a complete selection, scaling, and rotation system for canvas objects
 */

// Core modules
export { ClickSelection } from "./clickSelection";
export * from "./types";

// Main selection tool implemented with a custom PixiJS v8 transformer
export { AABBSelectionTool as SelectionTool } from "./AABBSelectionTool";
