/**
 * Layout Blocks
 * Modular block implementations for different content types
 */

export { BaseBlock } from "./BaseBlock";
export { HeaderBlock, type HeaderBlockConfig } from "./HeaderBlock";
export { ContentBlock, type ContentBlockConfig, type ContentSection } from "./ContentBlock";

// Re-export core types for convenience
export type {
  Block,
  BlockRow,
  BlockArea,
  BaseBlockConfig,
  LayoutContainer,
  LayoutProperties,
} from "../core/LayoutTypes";
