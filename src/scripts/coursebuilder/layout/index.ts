/**
 * Modular Layout System
 * Professional, extensible layout system for course builder
 */

// Core system
export * from "./core/LayoutTypes";
export * from "./core/BlockManager";
export * from "./core/TemplateRenderer";
export * from "./core/ConfigManager";

// Lesson template implementation
export * from "./lesson/LessonTemplate";
export * from "./lesson/LessonRenderer";

// Block implementations
export * from "./blocks";

// Quick access to main classes
export { TemplateRenderer } from "./core/TemplateRenderer";
export { LessonRenderer } from "./lesson/LessonRenderer";
export { ConfigManager } from "./core/ConfigManager";
export { BaseBlock } from "./blocks/BaseBlock";
export { HeaderBlock } from "./blocks/HeaderBlock";
export { ContentBlock } from "./blocks/ContentBlock";
