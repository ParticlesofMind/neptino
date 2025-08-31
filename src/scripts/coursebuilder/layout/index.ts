/**
 * Layout System Index - Main Export File
 * 
 * Provides a clean API for importing layout system components
 */

export { LayoutManager, type GridConfig, type LayoutRegion, type LayoutTemplate, type PageMargins, type ColumnConfiguration } from './LayoutManager';
export { HeaderComponent, type HeaderConfig, type HeaderContent } from './HeaderComponent';
export { FooterComponent, type FooterConfig, type FooterContent } from './FooterComponent';

// Re-export commonly used types for convenience
export type {
  GridConfig as LayoutGridConfig,
  LayoutRegion as LayoutArea,
  LayoutTemplate as Template
} from './LayoutManager';
