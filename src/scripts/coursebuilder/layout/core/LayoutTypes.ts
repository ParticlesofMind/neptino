/**
 * Base Layout Types
 * Core interfaces for all template types
 */

import "@pixi/layout";
import { Container } from "pixi.js";

// Base layout properties for PixiJS Layout integration
export interface LayoutProperties {
  width?: string | number;
  height?: string | number;
  flexDirection?: "row" | "column";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch";
  gap?: number;
  padding?: number;
  margin?: number;
  flex?: number;
  backgroundColor?: number;
  borderRadius?: number;
  // Text styling properties for content areas
  fontSize?: number;
  color?: string | number;
  fontWeight?: "normal" | "bold" | "lighter" | "bolder";
  fontStyle?: "normal" | "italic" | "oblique";
}

// Extended container type for PixiJS Layout
export type LayoutContainer = Container & { layout?: LayoutProperties };

// Base block configuration
export interface BaseBlockConfig {
  id: string;
  name: string;
  type: string;
  heightPercentage: number;
  isRequired: boolean;
  enabled: boolean;
  styles?: LayoutProperties;
}

// Row/Column structure for blocks
export interface BlockArea {
  id: string;
  name?: string;
  type?: "instruction" | "student" | "teacher" | "media" | "text";
  widthPercentage: number;
  content: {
    type: "text" | "container" | "media";
    data: any;
  };
  styles?: LayoutProperties;
  allowsDrawing?: boolean;
  allowsMedia?: boolean;
  allowsText?: boolean;
  flex?: number; // For responsive sizing
}

export interface BlockRow {
  id: string;
  areas: BlockArea[];
  height: number; // Row height in pixels
  backgroundColor?: number;
  heightPercentage?: number; // Optional for row height within block
}

// Generic block with row/column support
export interface Block extends BaseBlockConfig {
  rows: BlockRow[];
}

// Template structure
export interface Template {
  id: string;
  name: string;
  type: string; // "lesson", "quiz", "assessment", etc.
  blocks: Block[];
  canvasWidth: number;
  canvasHeight: number;
}

// Template rendering options
export interface RenderOptions {
  showLabels?: boolean;
  debugMode?: boolean;
  responsive?: boolean;
  theme?: "modern" | "classic" | "minimal";
}

// Block manager interface
export interface IBlockManager {
  createBlock(config: BaseBlockConfig): Block;
  renderBlock(block: Block, container: Container): Container;
  updateBlock(block: Block, config: Partial<BaseBlockConfig>): Block;
}

// Template renderer interface  
export interface ITemplateRenderer {
  render(template: Template, options?: RenderOptions): Container;
  clear(): void;
  updateDimensions(width: number, height: number): void;
}

// Config manager interface
export interface IConfigManager {
  getBlockConfig(blockId: string): BaseBlockConfig | null;
  updateBlockConfig(blockId: string, config: Partial<BaseBlockConfig>): void;
  toggleBlock(blockId: string, enabled: boolean): void;
  exportConfig(): any;
  importConfig(config: any): void;
}
