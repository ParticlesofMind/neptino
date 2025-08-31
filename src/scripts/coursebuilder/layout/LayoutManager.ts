/**
 * LayoutManager - Core Layout System for Coursebuilder
 * 
 * Responsibilities:
 * - Define grid system that maps to PIXI canvas (794x1123 pixels)
 * - Manage header and footer areas that are always present
 * - Coordinate layout regions and their relationships
 * - Provide positioning calculations for layout components
 * 
 * Grid System Design:
 * - Canvas: 794x1123 pixels (A4 at 96 DPI)
 * - Grid: 12 columns × flexible rows
 * - Header: Always present, fixed height
 * - Footer: Always present, fixed height
 * - Content area: Flexible between header and footer
 */

import { Container, Graphics, Text } from 'pixi.js';

export interface GridConfig {
  totalWidth: number;
  totalHeight: number;
  columns: number;
  headerHeight: number;
  footerHeight: number;
  gutterSize: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}

export interface LayoutRegion {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  gridColumn: number;
  gridRow: number;
  columnSpan: number;
  rowSpan: number;
  isFixed: boolean; // true for header/footer, false for dynamic content
}

export interface LayoutTemplate {
  id: string;
  name: string;
  description: string;
  regions: LayoutRegion[];
  headerContent?: any;
  footerContent?: any;
}

export class LayoutManager {
  private config: GridConfig;
  private container: Container | null = null;
  private debugGraphics: Graphics | null = null;
  private currentTemplate: LayoutTemplate | null = null;
  private showDebugGrid: boolean = false;

  constructor() {
    // Default configuration based on A4 canvas
    this.config = {
      totalWidth: 794,
      totalHeight: 1123,
      columns: 12,
      headerHeight: 80,  // ~7% of total height
      footerHeight: 60,  // ~5% of total height
      gutterSize: 16,    // Space between columns
      margins: {
        top: 20,
        right: 30,
        bottom: 20,
        left: 30
      }
    };
  }

  /**
   * Initialize layout system with a container
   */
  public initialize(container: Container): void {
    this.container = container;
    console.log('📐 Layout Manager initialized with canvas:', {
      width: this.config.totalWidth,
      height: this.config.totalHeight,
      columns: this.config.columns
    });
  }

  /**
   * Get grid configuration
   */
  public getGridConfig(): GridConfig {
    return { ...this.config };
  }

  /**
   * Calculate column width (accounting for gutters and margins)
   */
  public getColumnWidth(): number {
    const availableWidth = this.config.totalWidth - this.config.margins.left - this.config.margins.right;
    const totalGutters = (this.config.columns - 1) * this.config.gutterSize;
    return (availableWidth - totalGutters) / this.config.columns;
  }

  /**
   * Calculate content area height (between header and footer)
   */
  public getContentHeight(): number {
    return this.config.totalHeight - 
           this.config.headerHeight - 
           this.config.footerHeight - 
           this.config.margins.top - 
           this.config.margins.bottom;
  }

  /**
   * Calculate position for a grid cell
   */
  public getGridPosition(column: number, row: number): { x: number; y: number } {
    if (column < 1 || column > this.config.columns) {
      throw new Error(`Invalid column: ${column}. Must be between 1 and ${this.config.columns}`);
    }

    const columnWidth = this.getColumnWidth();
    const x = this.config.margins.left + 
              (column - 1) * (columnWidth + this.config.gutterSize);

    // Y calculation depends on whether we're in header, content, or footer
    let y = this.config.margins.top;
    
    if (row === 0) {
      // Header row
      y = this.config.margins.top;
    } else if (row === -1) {
      // Footer row (special case)
      y = this.config.totalHeight - this.config.footerHeight - this.config.margins.bottom;
    } else {
      // Content rows (start after header)
      y = this.config.margins.top + this.config.headerHeight + (row - 1) * 40; // 40px row height for now
    }

    return { x, y };
  }

  /**
   * Calculate dimensions for a region spanning multiple columns/rows
   */
  public getRegionDimensions(columnSpan: number, rowSpan: number, isHeader: boolean = false, isFooter: boolean = false): { width: number; height: number } {
    const columnWidth = this.getColumnWidth();
    const width = (columnSpan * columnWidth) + ((columnSpan - 1) * this.config.gutterSize);

    let height: number;
    if (isHeader) {
      height = this.config.headerHeight;
    } else if (isFooter) {
      height = this.config.footerHeight;
    } else {
      height = rowSpan * 40; // 40px per row for content (will be made flexible later)
    }

    return { width, height };
  }

  /**
   * Create default header region
   */
  public createHeaderRegion(): LayoutRegion {
    // Header should be positioned at the very top of the canvas (y = 0)
    // and span the entire canvas width (x = 0, width = totalWidth)
    const position = { x: 0, y: 0 };
    const dimensions = { width: this.config.totalWidth, height: this.config.headerHeight };

    return {
      id: 'header',
      name: 'Header',
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      gridColumn: 1,
      gridRow: 0,
      columnSpan: this.config.columns,
      rowSpan: 1,
      isFixed: true
    };
  }

  /**
   * Create default footer region
   */
  public createFooterRegion(): LayoutRegion {
    // Footer should be positioned at the very bottom of the canvas
    // and span the entire canvas width (x = 0, width = totalWidth)
    const position = { x: 0, y: this.config.totalHeight - this.config.footerHeight };
    const dimensions = { width: this.config.totalWidth, height: this.config.footerHeight };

    return {
      id: 'footer',
      name: 'Footer',
      x: position.x,
      y: position.y,
      width: dimensions.width,
      height: dimensions.height,
      gridColumn: 1,
      gridRow: -1,
      columnSpan: this.config.columns,
      rowSpan: 1,
      isFixed: true
    };
  }

  /**
   * Create a basic template with just header and footer
   */
  public createBasicTemplate(): LayoutTemplate {
    const headerRegion = this.createHeaderRegion();
    const footerRegion = this.createFooterRegion();

    return {
      id: 'basic',
      name: 'Basic Layout',
      description: 'Simple layout with header and footer only',
      regions: [headerRegion, footerRegion],
      headerContent: null,
      footerContent: null
    };
  }

  /**
   * Apply a layout template to the container
   */
  public applyTemplate(template: LayoutTemplate): void {
    if (!this.container) {
      console.error('❌ Cannot apply template - no container set');
      return;
    }

    this.currentTemplate = template;

    // Clear existing layout
    this.clearLayout();

    // Create visual representations for each region
    template.regions.forEach(region => {
      this.createRegionContainer(region);
    });

    console.log('✅ Layout template applied:', template.name);
  }

  /**
   * Create visual container for a layout region
   */
  private createRegionContainer(region: LayoutRegion): Container {
    if (!this.container) {
      throw new Error('No container available');
    }

    const regionContainer = new Container();
    regionContainer.label = `layout-region-${region.id}`;
    regionContainer.x = region.x;
    regionContainer.y = region.y;

    // Create subtle background for visual reference (will be configurable)
    const background = new Graphics();
    background
      .rect(0, 0, region.width, region.height)
      .fill({ color: 0xffffff, alpha: 0.01 })
      .stroke({ color: 0xf0f0f0, width: 1, alpha: 0.3 });

    regionContainer.addChild(background);

    // Add label for debugging
    if (this.showDebugGrid) {
      const label = new Text({
        text: `${region.name}\n${region.width}×${region.height}`,
        style: {
          fontSize: 12,
          fill: 0x333333,
          align: 'center'
        }
      });
      label.anchor.set(0.5, 0.5);
      label.x = region.width / 2;
      label.y = region.height / 2;
      regionContainer.addChild(label);
    }

    this.container.addChild(regionContainer);
    return regionContainer;
  }

  /**
   * Clear current layout
   */
  public clearLayout(): void {
    if (!this.container) return;

    // Remove all layout-related children
    const childrenToRemove = this.container.children.filter(child => 
      child.label && child.label.startsWith('layout-region-')
    );

    childrenToRemove.forEach(child => {
      this.container!.removeChild(child);
      child.destroy({ children: true });
    });

    this.currentTemplate = null;
    console.log('🧹 Layout cleared');
  }

  /**
   * Toggle debug grid visibility
   */
  public toggleDebugGrid(show: boolean = !this.showDebugGrid): void {
    this.showDebugGrid = show;

    if (!this.container) return;

    if (show) {
      this.createDebugGrid();
    } else {
      this.removeDebugGrid();
    }

    // Re-apply current template to update labels
    if (this.currentTemplate) {
      this.applyTemplate(this.currentTemplate);
    }

    console.log('🐛 Debug grid:', show ? 'ON' : 'OFF');
  }

  /**
   * Create visual debug grid (very minimal)
   */
  private createDebugGrid(): void {
    if (!this.container || this.debugGraphics) return;

    this.debugGraphics = new Graphics();
    this.debugGraphics.label = 'debug-grid';
    this.debugGraphics.zIndex = -1; // Behind everything else

    // Only show header and footer guides - no column lines
    const headerY = this.config.margins.top;
    const footerY = this.config.totalHeight - this.config.footerHeight - this.config.margins.bottom;

    // Very subtle header guide
    this.debugGraphics
      .rect(this.config.margins.left, headerY, 
            this.config.totalWidth - this.config.margins.left - this.config.margins.right, 
            this.config.headerHeight)
      .stroke({ color: 0xe0e0e0, width: 1, alpha: 0.2 });

    // Very subtle footer guide
    this.debugGraphics
      .rect(this.config.margins.left, footerY, 
            this.config.totalWidth - this.config.margins.left - this.config.margins.right, 
            this.config.footerHeight)
      .stroke({ color: 0xe0e0e0, width: 1, alpha: 0.2 });

    this.container.addChild(this.debugGraphics);
  }

  /**
   * Remove debug grid
   */
  private removeDebugGrid(): void {
    if (this.debugGraphics && this.container) {
      this.container.removeChild(this.debugGraphics);
      this.debugGraphics.destroy({ children: true });
      this.debugGraphics = null;
    }
  }

  /**
   * Get information about current layout
   */
  public getLayoutInfo(): any {
    return {
      config: this.config,
      template: this.currentTemplate?.name || 'None',
      regions: this.currentTemplate?.regions.length || 0,
      debugGrid: this.showDebugGrid,
      columnWidth: this.getColumnWidth(),
      contentHeight: this.getContentHeight()
    };
  }

  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<GridConfig>): void {
    this.config = { ...this.config, ...updates };
    
    // Re-apply current template if exists
    if (this.currentTemplate) {
      this.applyTemplate(this.currentTemplate);
    }

    console.log('⚙️ Layout config updated:', updates);
  }

  /**
   * Destroy layout system
   */
  public destroy(): void {
    this.clearLayout();
    this.removeDebugGrid();
    this.container = null;
    this.currentTemplate = null;
    console.log('🗑️ Layout Manager destroyed');
  }
}
