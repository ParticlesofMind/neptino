/**
 * LayoutManager - Core Layout System for Coursebuilder
 * 
 * Responsibilities:
 * - Define grid system that maps to PIXI canvas (794x1123 pixels)
 * - Manage header and footer areas that are always present
 * - Coordinate layout regions and their relationships
 * - Provide positioning calculations for layout components
 * - Read margin settings from coursebuilder page layout inputs
 * - Convert centimeters to pixels for canvas positioning
 * - Listen for margin changes and update layout accordingly
 * - Provide real-time layout updates to user settings
 * - Calculate dynamic column configuration based on template data
 * - Integrate with Supabase template configuration
 * 
 * Grid System Design:
 * - Canvas: 794x1123 pixels (A4 at 96 DPI)
 * - Grid: 12 columns × flexible rows
 * - Header: Always present, fixed height
 * - Footer: Always present, fixed height
 * - Content area: Flexible between header and footer
 */

import { Container, Graphics, Text } from 'pixi.js';
import type { TemplateBlock } from '../../backend/courses/templates/createTemplate.js';
import { supabase } from '../../backend/supabase.js';
import { 
  HEADER_FIELDS, 
  FOOTER_FIELDS, 
  PROGRAM_FIELDS, 
  RESOURCES_FIELDS,
  CONTENT_FIELDS,
  ASSIGNMENT_FIELDS
} from './FieldConfigurations.js';
import { HeaderComponent } from './HeaderComponent.js';
import { FooterComponent } from './FooterComponent.js';
import { ProgramComponent } from './ProgramComponent.js';
import { ResourcesComponent } from './ResourcesComponent.js';
import { ContentComponent } from './ContentComponent.js';
import { AssignmentComponent } from './AssignmentComponent.js';

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

export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
  unit: 'cm' | 'mm' | 'px';
}

export interface ColumnConfiguration {
  headerColumns: number;
  footerColumns: number;
  headerFields: string[];
  footerFields: string[];
  headerDistribution: number[];
  footerDistribution: number[];
  programFields: string[];
  programValues: Record<string, string>;
  resourcesFields: string[];
  resourcesValues: Record<string, string>;
  resourcesGlossaryFields?: string[];
  includeGlossary?: boolean;
  contentFields: string[];
  contentValues: Record<string, string>;
  assignmentFields: string[];
  assignmentValues: Record<string, string>;
}

export class LayoutManager {
  private config: GridConfig;
  private container: Container | null = null;
  private debugGraphics: Graphics | null = null;
  private currentTemplate: LayoutTemplate | null = null;
  private showDebugGrid: boolean = false;
  private marginInputs: {
    top?: HTMLInputElement;
    right?: HTMLInputElement;
    bottom?: HTMLInputElement;
    left?: HTMLInputElement;
  } = {};
  
  private currentMargins: PageMargins = {
    top: 2.54,
    right: 2.54,
    bottom: 2.54,
    left: 2.54,
    unit: 'cm'
  };

  private marginChangeListeners: Array<() => void> = [];
  private isListening: boolean = false;
  private templateCache: Map<string, any> = new Map();
  private currentColumnConfig: ColumnConfiguration | null = null;

  // Layout components
  private headerComponent: HeaderComponent | null = null;
  private footerComponent: FooterComponent | null = null;
  private programComponent: ProgramComponent | null = null;
  private resourcesComponent: ResourcesComponent | null = null;
  private contentComponent: ContentComponent | null = null;
  private assignmentComponent: AssignmentComponent | null = null;

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
    this.initializeMarginInputs();
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
    
    // Update grid config based on current margins
    this.updateGridConfigFromMargins();
    
    // Setup margin change listeners
    this.setupMarginListeners();
    
    console.log('📐 Layout Manager initialized with real-time margin updates');
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
   * Create header region positioned WITHIN the top margin but SPANNING FULL WIDTH and HEIGHT
   */
  public createHeaderRegion(): LayoutRegion {
    const config = this.getGridConfig();
    const margins = this.getCurrentMarginsInPixels();
    
    return {
      id: 'header',
      name: 'Header',
      x: 0, // Start at canvas edge
      y: 0, // Start at very top of canvas
      width: config.totalWidth, // Full canvas width
      height: margins.top, // Full top margin height (dynamic)
      gridColumn: 1,
      gridRow: 0,
      columnSpan: config.columns,
      rowSpan: 1,
      isFixed: true
    };
  }

  /**
   * Create footer region positioned WITHIN the bottom margin but SPANNING FULL WIDTH and HEIGHT
   */
  public createFooterRegion(): LayoutRegion {
    const config = this.getGridConfig();
    const margins = this.getCurrentMarginsInPixels();
    
    return {
      id: 'footer',
      name: 'Footer',
      x: 0, // Start at canvas edge
      y: config.totalHeight - margins.bottom, // Position at start of bottom margin
      width: config.totalWidth, // Full canvas width
      height: margins.bottom, // Full bottom margin height (dynamic)
      gridColumn: 1,
      gridRow: -1,
      columnSpan: config.columns,
      rowSpan: 1,
      isFixed: true
    };
  }

  /**
   * Create program region positioned right after the header
   */
  public createProgramRegion(height: number = 50): LayoutRegion {
    const config = this.getGridConfig();
    const margins = this.getCurrentMarginsInPixels();
    
    return {
      id: 'program',
      name: 'Program',
      x: margins.left, // Start within left margin
      y: margins.top, // Start right after header (which uses the top margin)
      width: config.totalWidth - margins.left - margins.right, // Content width within margins
      height: height, // Configurable height
      gridColumn: 1,
      gridRow: 1, // First content row after header
      columnSpan: config.columns,
      rowSpan: 1,
      isFixed: false // Can be dynamic based on content
    };
  }

  /**
   * Create resources region
   */
  public createResourcesRegion(height: number = 50): LayoutRegion {
    const config = this.getGridConfig();
    const margins = this.getCurrentMarginsInPixels();
    
    // Position resources after program region (header + program + spacing)
    const headerHeight = config.headerHeight;
    const programHeight = 50; // Default program height
    const spacingBetweenRegions = 10; // Small gap between regions
    const yPosition = margins.top + headerHeight + programHeight + spacingBetweenRegions;

    return {
      id: 'resources',
      name: 'Resources',
      x: margins.left, // Start within left margin
      y: yPosition, // Position after program
      width: config.totalWidth - margins.left - margins.right, // Content width within margins
      height: height, // Configurable height
      gridColumn: 1,
      gridRow: 2, // Second content row after program
      columnSpan: config.columns,
      rowSpan: 1,
      isFixed: false // Can be dynamic based on content
    };
  }

  /**
   * Create content region with nested structure support
   */
  public createContentRegion(height: number = 280): LayoutRegion {
    const config = this.getGridConfig();
    const margins = this.getCurrentMarginsInPixels();
    
    // Position content after resources region
    const headerHeight = config.headerHeight;
    const programHeight = 50; // Default program height
    const resourcesHeight = 80; // Default resources height
    const spacingBetweenRegions = 10; // Small gap between regions
    const yPosition = margins.top + headerHeight + programHeight + resourcesHeight + (spacingBetweenRegions * 2);

    return {
      id: 'content',
      name: 'Content',
      x: margins.left,
      y: yPosition,
      width: config.totalWidth - margins.left - margins.right,
      height: height, // Larger height for nested content
      gridColumn: 1,
      gridRow: 3, // Third content row
      columnSpan: config.columns,
      rowSpan: 1,
      isFixed: false
    };
  }

  /**
   * Create assignment region with nested structure support
   */
  public createAssignmentRegion(height: number = 150): LayoutRegion {
    const config = this.getGridConfig();
    const margins = this.getCurrentMarginsInPixels();
    
    // Position assignment after content region
    const headerHeight = config.headerHeight;
    const programHeight = 50; // Default program height
    const resourcesHeight = 80; // Default resources height
    const contentHeight = 280; // Updated content height to accommodate Teacher Area
    const spacingBetweenRegions = 10; // Small gap between regions
    const yPosition = margins.top + headerHeight + programHeight + resourcesHeight + contentHeight + (spacingBetweenRegions * 3);

    return {
      id: 'assignment',
      name: 'Assignment',
      x: margins.left,
      y: yPosition,
      width: config.totalWidth - margins.left - margins.right,
      height: height, // Configurable height for assignment content
      gridColumn: 1,
      gridRow: 4, // Fourth content row
      columnSpan: config.columns,
      rowSpan: 1,
      isFixed: false
    };
  }

  /**
   * Create a basic template with all layout components
   */
  public createBasicTemplate(): LayoutTemplate {
    const headerRegion = this.createHeaderRegion();
    const programRegion = this.createProgramRegion();
    const resourcesRegion = this.createResourcesRegion();
    const contentRegion = this.createContentRegion();
    const assignmentRegion = this.createAssignmentRegion();
    const footerRegion = this.createFooterRegion();

    return {
      id: 'basic',
      name: 'Basic Layout',
      description: 'Complete layout with header, program, resources, content, assignment, and footer',
      regions: [headerRegion, programRegion, resourcesRegion, contentRegion, assignmentRegion, footerRegion],
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
   * Create and display basic layout with header, program, resources, and footer components
   */
  public async createBasicLayout(): Promise<void> {
    if (!this.container) {
      console.error('❌ Cannot create layout - no container set');
      return;
    }

    console.log('📐 Creating basic layout with components...');

    // Clear any existing components
    this.clearComponents();

    // Create regions
    const headerRegion = this.createHeaderRegion();
    const programRegion = this.createProgramRegion(100);
    const resourcesRegion = this.createResourcesRegion(80);
    const contentRegion = this.createContentRegion(280); // Increased height for Teacher Area
    const assignmentRegion = this.createAssignmentRegion(150);
    const footerRegion = this.createFooterRegion();

    // Get column configuration
    const columnConfig = await this.getColumnConfiguration();

    // Create header component
    this.headerComponent = new HeaderComponent(headerRegion);
    this.headerComponent.setContent({
      type: 'columns',
      columnData: {
        fields: columnConfig.headerFields,
        distribution: columnConfig.headerDistribution,
        values: {
          lesson_number: '[#]',
          lesson_title: '[Lesson Title]',
          module_title: '[Module Title]',
          course_title: '[Course Title]',
          institution_name: '[Institution]'
        }
      }
    });
    this.container.addChild(this.headerComponent.getContainer());

    // Create program component  
    this.programComponent = new ProgramComponent(programRegion);
    this.programComponent.setContent({
      type: 'columns',
      columnData: {
        fields: columnConfig.programFields,
        distribution: [3, 3, 3, 3], // Equal distribution for 4 program fields
        values: columnConfig.programValues
      }
    });
    this.container.addChild(this.programComponent.getContainer());

    // Create resources component
    this.resourcesComponent = new ResourcesComponent(resourcesRegion, {
      type: 'columns',
      fields: columnConfig.resourcesFields,
      values: columnConfig.resourcesValues,
      glossaryFields: columnConfig.resourcesGlossaryFields,
      includeGlossary: columnConfig.includeGlossary
    }, columnConfig);
    this.container.addChild(this.resourcesComponent.getContainer());

    // Create content component
    this.contentComponent = new ContentComponent(contentRegion);
    this.contentComponent.setContent({
      type: 'nested',
      hierarchy: this.contentComponent.createEmptyHierarchy()
    });
    this.container.addChild(this.contentComponent.getContainer());

    // Create assignment component
    this.assignmentComponent = new AssignmentComponent(assignmentRegion);
    this.assignmentComponent.setContent({
      type: 'nested',
      hierarchy: this.assignmentComponent.createEmptyHierarchy()
    });
    this.container.addChild(this.assignmentComponent.getContainer());

    // Create footer component
    this.footerComponent = new FooterComponent(footerRegion);
    this.footerComponent.setContent({
      type: 'columns',
      columnData: {
        fields: columnConfig.footerFields,
        distribution: columnConfig.footerDistribution,
        values: {
          copyright: '[© Copyright]',
          page_number: '[Page #]'
        }
      }
    });
    this.container.addChild(this.footerComponent.getContainer());

    console.log('✅ Basic layout created with all components');
  }

  /**
   * Clear existing components
   */
  private clearComponents(): void {
    if (this.headerComponent) {
      this.container?.removeChild(this.headerComponent.getContainer());
      this.headerComponent.destroy();
      this.headerComponent = null;
    }
    if (this.programComponent) {
      this.container?.removeChild(this.programComponent.getContainer());
      this.programComponent.destroy();
      this.programComponent = null;
    }
    if (this.resourcesComponent) {
      this.container?.removeChild(this.resourcesComponent.getContainer());
      this.resourcesComponent.destroy();
      this.resourcesComponent = null;
    }
    if (this.contentComponent) {
      this.container?.removeChild(this.contentComponent.getContainer());
      this.contentComponent.destroy();
      this.contentComponent = null;
    }
    if (this.assignmentComponent) {
      this.container?.removeChild(this.assignmentComponent.getContainer());
      this.assignmentComponent.destroy();
      this.assignmentComponent = null;
    }
    if (this.footerComponent) {
      this.container?.removeChild(this.footerComponent.getContainer());
      this.footerComponent.destroy();
      this.footerComponent = null;
    }
  }

  /**
   * Create visual container for a layout region - Modern minimalist style
   */
  private createRegionContainer(region: LayoutRegion): Container {
    if (!this.container) {
      throw new Error('No container available');
    }

    const regionContainer = new Container();
    regionContainer.label = `layout-region-${region.id}`;
    regionContainer.x = region.x;
    regionContainer.y = region.y;

    // Create ultra-minimal background - no background color to preserve canvas transparency
    const background = new Graphics();
    background
      .rect(0, 0, region.width, region.height)
      .fill({ color: 0xffffff, alpha: 0 }) // Completely transparent
      .stroke({ color: 0x0066cc, width: 0.5, alpha: 0.1 }); // Ultra-subtle Neptino blue accent border

    regionContainer.addChild(background);

    // Add label for debugging - more elegant typography
    if (this.showDebugGrid) {
      const label = new Text({
        text: `${region.name}`,
        style: {
          fontSize: 10,
          fill: 0x0066cc, // Neptino blue for debug labels
          fontFamily: 'Inter, -apple-system, system-ui, sans-serif',
          fontWeight: '400',
          align: 'center'
        }
      });
      label.anchor.set(0.5, 0.5);
      label.x = region.width / 2;
      label.y = region.height / 2;
      label.alpha = 0.6; // Subtle transparency
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
   * Create visual debug grid - Ultra-minimal, modern approach
   */
  private createDebugGrid(): void {
    if (!this.container || this.debugGraphics) return;

    this.debugGraphics = new Graphics();
    this.debugGraphics.label = 'debug-grid';
    this.debugGraphics.zIndex = -1; // Behind everything else

    // Only show very subtle margin guides - no visual clutter
    const margins = this.getCurrentMarginsInPixels();
    
    // Ultra-subtle margin guides with Neptino blue
    this.debugGraphics
      .rect(margins.left, margins.top, 
            this.config.totalWidth - margins.left - margins.right, 
            this.config.totalHeight - margins.top - margins.bottom)
      .stroke({ color: 0x0066cc, width: 0.5, alpha: 0.05 }); // Extremely subtle Neptino blue border

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
   * Get information about current layout with margin details
   */
  public getLayoutInfo(): any {
    const baseInfo = {
      config: this.config,
      template: this.currentTemplate?.name || 'None',
      regions: this.currentTemplate?.regions.length || 0,
      debugGrid: this.showDebugGrid,
      columnWidth: this.getColumnWidth(),
      contentHeight: this.getContentHeight()
    };
    
    const margins = this.getCurrentMargins();
    const contentArea = this.getContentArea();
    
    return {
      ...baseInfo,
      margins: {
        connected: Object.values(this.marginInputs).some(input => input !== null),
        listening: this.isListening,
        current: margins,
        conversionFactor: 794 / 21, // pixels per cm
        contentArea: contentArea,
        headerInMargin: true,
        footerInMargin: true
      }
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
    // Clean up components first
    this.clearComponents();
    
    // Remove event listeners
    Object.entries(this.marginInputs).forEach(([side, input]) => {
      if (input) {
        // We can't remove specific listeners without references, but they'll be cleaned up when the page unloads
        console.log(`📐 Cleaned up ${side} margin listener`);
      }
    });
    
    this.marginChangeListeners = [];
    this.isListening = false;
    
    // Clear timeout
    clearTimeout((this as any).marginChangeTimeout);
    
    this.clearLayout();
    this.removeDebugGrid();
    this.container = null;
    this.currentTemplate = null;
    console.log('🗑️ Layout Manager destroyed');
  }

  // ===== MARGIN MANAGEMENT METHODS =====

  /**
   * Initialize by finding margin input elements
   */
  private initializeMarginInputs(): void {
    // Find margin input elements from the page setup
    this.marginInputs = {
      top: document.querySelector('input[name="margin_top"]') as HTMLInputElement,
      right: document.querySelector('input[name="margin_right"]') as HTMLInputElement,
      bottom: document.querySelector('input[name="margin_bottom"]') as HTMLInputElement,
      left: document.querySelector('input[name="margin_left"]') as HTMLInputElement,
    };

    // Read current values if inputs are found
    if (this.marginInputs.top) {
      this.readCurrentMargins();
      console.log('📐 Layout Manager: Current margins read from page setup:', this.currentMargins);
    } else {
      console.warn('⚠️ Layout Manager: Margin inputs not found, using defaults');
    }
  }

  /**
   * Read current margin values from HTML inputs
   */
  private readCurrentMargins(): void {
    if (this.marginInputs.top) {
      this.currentMargins.top = parseFloat(this.marginInputs.top.value) || 2.54;
    }
    if (this.marginInputs.right) {
      this.currentMargins.right = parseFloat(this.marginInputs.right.value) || 2.54;
    }
    if (this.marginInputs.bottom) {
      this.currentMargins.bottom = parseFloat(this.marginInputs.bottom.value) || 2.54;
    }
    if (this.marginInputs.left) {
      this.currentMargins.left = parseFloat(this.marginInputs.left.value) || 2.54;
    }
  }

  /**
   * Convert centimeters to pixels based on A4 canvas dimensions
   * A4 at 96 DPI: 210mm × 297mm = 794px × 1123px
   * So 1cm = 794/21 pixels ≈ 37.81 pixels
   */
  private cmToPixels(cm: number): number {
    const pixelsPerCm = 794 / 21; // 794px / 21cm (A4 width)
    return cm * pixelsPerCm;
  }

  /**
   * Convert current margins to pixel values
   */
  private getCurrentMarginsInPixels(): { top: number; right: number; bottom: number; left: number } {
    return {
      top: Math.round(this.cmToPixels(this.currentMargins.top)),
      right: Math.round(this.cmToPixels(this.currentMargins.right)),
      bottom: Math.round(this.cmToPixels(this.currentMargins.bottom)),
      left: Math.round(this.cmToPixels(this.currentMargins.left))
    };
  }

  /**
   * Update grid configuration based on current margins
   */
  private updateGridConfigFromMargins(): void {
    this.readCurrentMargins();
    const pixelMargins = this.getCurrentMarginsInPixels();
    
    // Update the grid configuration
    // Header and footer should be positioned WITHIN the margin areas
    const updatedConfig: Partial<GridConfig> = {
      margins: {
        top: pixelMargins.top,
        right: pixelMargins.right,
        bottom: pixelMargins.bottom,
        left: pixelMargins.left
      },
      // Header goes in the top margin area (reduce height to fit in margin)
      headerHeight: Math.min(pixelMargins.top - 10, 60), // Leave 10px padding, max 60px
      // Footer goes in the bottom margin area  
      footerHeight: Math.min(pixelMargins.bottom - 10, 40) // Leave 10px padding, max 40px
    };
    
    // Call parent method to update config
    this.updateConfig(updatedConfig);
    
    console.log('📐 Grid config updated - header/footer positioned in margin areas:', {
      margins: pixelMargins,
      headerHeight: updatedConfig.headerHeight,
      footerHeight: updatedConfig.footerHeight
    });
  }

  /**
   * Setup event listeners for margin input changes
   */
  private setupMarginListeners(): void {
    if (this.isListening) return;

    Object.entries(this.marginInputs).forEach(([side, input]) => {
      if (input) {
        const listener = () => {
          console.log(`📐 Margin ${side} changed to:`, input.value);
          this.handleMarginChange();
        };
        
        input.addEventListener('input', listener);
        input.addEventListener('change', listener);
        this.marginChangeListeners.push(listener);
      }
    });

    this.isListening = true;
    console.log('👂 Margin change listeners setup complete');
  }

  /**
   * Handle margin input changes
   */
  private handleMarginChange(): void {
    // Debounce rapid changes
    clearTimeout((this as any).marginChangeTimeout);
    (this as any).marginChangeTimeout = setTimeout(() => {
      this.updateGridConfigFromMargins();
      
      // Update margins info display if it exists
      this.updateMarginsDisplay();
      
    }, 100);
  }

  /**
   * Update the margins info display in the UI
   */
  private updateMarginsDisplay(): void {
    const marginsInfo = document.getElementById('margins-info');
    if (marginsInfo) {
      const margins = this.currentMargins;
      if (margins.top === margins.right && margins.right === margins.bottom && margins.bottom === margins.left) {
        marginsInfo.textContent = `Margins: ${margins.top}cm all sides`;
      } else {
        marginsInfo.textContent = `Margins: ${margins.top}cm top, ${margins.right}cm right, ${margins.bottom}cm bottom, ${margins.left}cm left`;
      }
    }
  }

  /**
   * Get current margins in both cm and pixels
   */
  public getCurrentMargins(): { cm: PageMargins; pixels: { top: number; right: number; bottom: number; left: number } } {
    this.readCurrentMargins();
    return {
      cm: { ...this.currentMargins },
      pixels: this.getCurrentMarginsInPixels()
    };
  }

  /**
   * Set margins programmatically (will update inputs and grid)
   */
  public setMargins(margins: Partial<PageMargins>): void {
    // Update internal state
    Object.assign(this.currentMargins, margins);
    
    // Update HTML inputs
    if (margins.top !== undefined && this.marginInputs.top) {
      this.marginInputs.top.value = margins.top.toString();
    }
    if (margins.right !== undefined && this.marginInputs.right) {
      this.marginInputs.right.value = margins.right.toString();
    }
    if (margins.bottom !== undefined && this.marginInputs.bottom) {
      this.marginInputs.bottom.value = margins.bottom.toString();
    }
    if (margins.left !== undefined && this.marginInputs.left) {
      this.marginInputs.left.value = margins.left.toString();
    }
    
    // Update grid configuration
    this.updateGridConfigFromMargins();
    
    console.log('📐 Margins set programmatically:', this.currentMargins);
  }

  /**
   * Get the main content area dimensions (between header and footer, within margins)
   */
  public getContentArea(): { x: number; y: number; width: number; height: number } {
    const config = this.getGridConfig();
    
    return {
      x: config.margins.left,
      y: config.margins.top, // Content starts at top margin
      width: config.totalWidth - config.margins.left - config.margins.right,
      height: config.totalHeight - config.margins.top - config.margins.bottom // Content area is within margins
    };
  }

  /**
   * Test margin changes by cycling through different values
   */
  public testMarginChanges(): void {
    console.log('🧪 Testing margin changes...');
    
    const testMargins = [
      { top: 1, right: 1, bottom: 1, left: 1 },      // 1cm all
      { top: 2, right: 3, bottom: 2, left: 3 },      // Asymmetric
      { top: 4, right: 2, bottom: 4, left: 2 },      // Wide margins
      { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 }, // Narrow margins
      { top: 2.54, right: 2.54, bottom: 2.54, left: 2.54 } // Back to default
    ];
    
    let index = 0;
    const testInterval = setInterval(() => {
      if (index >= testMargins.length) {
        clearInterval(testInterval);
        console.log('✅ Margin test completed');
        return;
      }
      
      const margins = testMargins[index];
      console.log(`📐 Test ${index + 1}: Setting margins to`, margins);
      this.setMargins(margins);
      index++;
    }, 2000);
  }

  /**
   * Refresh layout (useful after dynamic content changes)
   */
  public refreshLayout(): void {
    this.initializeMarginInputs();
    if (this.marginInputs.top) {
      this.updateGridConfigFromMargins();
      console.log('🔄 Layout refreshed');
    }
  }

  // ===== TEMPLATE INTEGRATION & DYNAMIC COLUMN CALCULATION =====

  /**
   * Get dynamic column configuration based on template data from Supabase
   */
  public async getColumnConfiguration(templateId?: string): Promise<ColumnConfiguration> {
    try {
      const templateData = await this.getTemplateData(templateId);
      
      if (!templateData) {
        return this.getDefaultColumnConfiguration();
      }

      const headerConfig = this.calculateHeaderColumns(templateData);
      const footerConfig = this.calculateFooterColumns(templateData);
      const programConfig = this.calculateProgramFields(templateData);
      const resourcesConfig = this.calculateResourcesFields(templateData);
      const contentConfig = this.calculateContentFields(templateData);
      const assignmentConfig = this.calculateAssignmentFields(templateData);

      this.currentColumnConfig = {
        headerColumns: headerConfig.columns,
        footerColumns: footerConfig.columns,
        headerFields: headerConfig.fields,
        footerFields: footerConfig.fields,
        headerDistribution: this.calculateColumnDistribution(headerConfig.columns),
        footerDistribution: this.calculateColumnDistribution(footerConfig.columns),
        programFields: programConfig.fields,
        programValues: programConfig.values,
        resourcesFields: resourcesConfig.fields,
        resourcesValues: resourcesConfig.values,
        resourcesGlossaryFields: resourcesConfig.glossaryFields,
        includeGlossary: resourcesConfig.includeGlossary,
        contentFields: contentConfig.fields,
        contentValues: contentConfig.values,
        assignmentFields: assignmentConfig.fields,
        assignmentValues: assignmentConfig.values
      };

      console.log('📊 Dynamic column configuration calculated:', this.currentColumnConfig);
      return this.currentColumnConfig;
    } catch (error) {
      console.error('❌ Error calculating column configuration:', error);
      return this.getDefaultColumnConfiguration();
    }
  }

  /**
   * Get template data from cache or Supabase
   */
  private async getTemplateData(templateId?: string): Promise<any> {
    if (!templateId) {
      const courseTemplateId = await this.getCurrentCourseTemplateId();
      templateId = courseTemplateId || undefined;
    }

    if (!templateId) {
      return null;
    }

    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId);
    }

    try {
      const { data, error } = await supabase
        .from('templates')
        .select('template_data')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      this.templateCache.set(templateId, data);
      return data;
    } catch (error) {
      console.error('❌ Error fetching template data:', error);
      return null;
    }
  }

  /**
   * Get template ID for current course from session storage
   */
  private async getCurrentCourseTemplateId(): Promise<string | null> {
    try {
      const courseId = sessionStorage.getItem('currentCourseId');
      if (!courseId) return null;

      const { data, error } = await supabase
        .from('templates')
        .select('id')
        .eq('course_id', courseId)
        .single();

      if (error) return null;
      return data.id;
    } catch (error) {
      console.error('❌ Error getting current course template ID:', error);
      return null;
    }
  }

  /**
   * Calculate header columns based on template configuration
   */
  private calculateHeaderColumns(templateData: any): { columns: number; fields: string[] } {
    const headerBlock = this.findBlockByType(templateData, 'header');
    if (!headerBlock) {
      return { columns: 5, fields: ['lesson_number', 'lesson_title', 'module_title', 'course_title', 'institution_name'] };
    }

    const enabledFields = this.getEnabledFields(headerBlock, HEADER_FIELDS);
    return {
      columns: Math.max(1, Math.min(12, enabledFields.length)),
      fields: enabledFields
    };
  }

  /**
   * Calculate footer columns based on template configuration
   */
  private calculateFooterColumns(templateData: any): { columns: number; fields: string[] } {
    const footerBlock = this.findBlockByType(templateData, 'footer');
    if (!footerBlock) {
      return { columns: 2, fields: ['copyright', 'page_number'] };
    }

    const enabledFields = this.getEnabledFields(footerBlock, FOOTER_FIELDS);
    return {
      columns: Math.max(1, Math.min(12, enabledFields.length)),
      fields: enabledFields
    };
  }

  /**
   * Calculate program fields based on template configuration
   */
  private calculateProgramFields(templateData: any): { fields: string[]; values: Record<string, string> } {
    const programBlock = this.findBlockByType(templateData, 'program');
    if (!programBlock) {
      return { 
        fields: ['competence', 'topic', 'objective', 'task'],
        values: {
          competence: '',
          topic: '', 
          objective: '',
          task: ''
        }
      };
    }

    const enabledFields = this.getEnabledFields(programBlock, PROGRAM_FIELDS);
    const values: Record<string, string> = {};
    
    // Extract values from template data
    enabledFields.forEach(field => {
      values[field] = programBlock.config?.fields?.[field]?.value || '';
    });

    return {
      fields: enabledFields,
      values
    };
  }

  /**
   * Calculate resources fields based on template configuration
   */
  private calculateResourcesFields(templateData: any): { fields: string[]; values: Record<string, string>; glossaryFields?: string[]; includeGlossary?: boolean } {
    const resourcesBlock = this.findBlockByType(templateData, 'resources');
    if (!resourcesBlock) {
      return { 
        fields: ['task', 'type', 'origin'],
        values: {
          task: '',
          type: '', 
          origin: ''
        }
      };
    }

    const allEnabledFields = this.getEnabledFields(resourcesBlock, RESOURCES_FIELDS);
    
    // Separate main fields from glossary fields
    const mainFields = allEnabledFields.filter(field => 
      !['include_glossary', 'historical_figures', 'terminology', 'concepts'].includes(field)
    );
    
    const includeGlossary = allEnabledFields.includes('include_glossary');
    const glossaryFields = allEnabledFields.filter(field => 
      ['historical_figures', 'terminology', 'concepts'].includes(field)
    );

    const values: Record<string, string> = {};
    
    // Extract values from template data (only for main fields)
    mainFields.forEach(field => {
      values[field] = resourcesBlock.config?.fields?.[field]?.value || '';
    });

    return {
      fields: mainFields,
      values,
      glossaryFields: includeGlossary ? glossaryFields : undefined,
      includeGlossary
    };
  }

  /**
   * Find block by type in template data
   */
  private findBlockByType(templateData: any, blockType: string): TemplateBlock | null {
    const blocks = templateData?.template_data?.blocks || [];
    return blocks.find((block: TemplateBlock) => block.type === blockType) || null;
  }

  /**
   * Calculate content fields configuration
   */
  private calculateContentFields(templateData: any): { fields: string[]; values: Record<string, string> } {
    const contentBlock = this.findBlockByType(templateData, 'content');
    
    if (!contentBlock) {
      return {
        fields: CONTENT_FIELDS.filter(f => f.mandatory).map(f => f.name),
        values: {}
      };
    }

    const fields = this.getEnabledFields(contentBlock, CONTENT_FIELDS);
    const values: Record<string, string> = {};
    
    // Extract values from template data
    fields.forEach(field => {
      values[field] = contentBlock.config?.fields?.[field]?.value || '';
    });

    return { fields, values };
  }

  /**
   * Calculate assignment fields configuration
   */
  private calculateAssignmentFields(templateData: any): { fields: string[]; values: Record<string, string> } {
    const assignmentBlock = this.findBlockByType(templateData, 'assignment');
    
    if (!assignmentBlock) {
      return {
        fields: ASSIGNMENT_FIELDS.filter(f => f.mandatory).map(f => f.name),
        values: {}
      };
    }

    const fields = this.getEnabledFields(assignmentBlock, ASSIGNMENT_FIELDS);
    const values: Record<string, string> = {};
    
    // Extract values from template data
    fields.forEach(field => {
      values[field] = assignmentBlock.config?.fields?.[field]?.value || '';
    });

    return { fields, values };
  }

  /**
   * Get enabled fields from block configuration
   */
  private getEnabledFields(block: TemplateBlock, fieldConfig: any[]): string[] {
    const enabledFields: string[] = [];
    
    fieldConfig.forEach(field => {
      if (field.mandatory || (block.config && block.config[field.name] === true)) {
        enabledFields.push(field.name);
      }
    });

    return enabledFields;
  }

  /**
   * Get default column configuration when no template data
   */
  public getDefaultColumnConfiguration(): ColumnConfiguration {
    return {
      headerColumns: 5,
      footerColumns: 2,
      headerFields: ['lesson_number', 'lesson_title', 'module_title', 'course_title', 'institution_name'],
      footerFields: ['copyright', 'page_number'],
      headerDistribution: [2, 3, 2, 3, 2],
      footerDistribution: [6, 6],
      programFields: ['competence', 'topic', 'objective', 'task'],
      programValues: {
        competence: '[Competence]',
        topic: '[Topic]', 
        objective: '[Objective]',
        task: '[Task]'
      },
      resourcesFields: ['task', 'type', 'origin'],
      resourcesValues: {
        task: '[Task]',
        type: '[Type]', 
        origin: '[Origin]'
      },
      contentFields: ['topic', 'objective', 'task', 'instruction_area', 'student_area', 'teacher_area'],
      contentValues: {
        topic: '[Topic]',
        objective: '[Objective]',
        task: '[Task]',
        instruction_area: '[Instruction Area]',
        student_area: '[Student Area]',
        teacher_area: '[Teacher Area]'
      },
      assignmentFields: ['topic', 'objective', 'task', 'instruction_area', 'student_area', 'teacher_area'],
      assignmentValues: {
        topic: '[Assignment Topic]',
        objective: '[Assignment Objective]',
        task: '[Assignment Task]',
        instruction_area: '[Assignment Instructions]',
        student_area: '[Student Submission]',
        teacher_area: '[Teacher Grading]'
      }
    };
  }

  /**
   * Calculate optimal column width distribution for a given number of fields
   */
  private calculateColumnDistribution(fieldCount: number): number[] {
    if (fieldCount === 0) return [];
    if (fieldCount === 1) return [12];
    if (fieldCount === 2) return [6, 6];
    if (fieldCount === 3) return [4, 4, 4];
    if (fieldCount === 4) return [3, 3, 3, 3];
    if (fieldCount === 5) return [2, 3, 2, 3, 2];
    if (fieldCount === 6) return [2, 2, 2, 2, 2, 2];
    
    // For 7+ fields, distribute as evenly as possible
    const baseWidth = Math.floor(12 / fieldCount);
    const remainder = 12 % fieldCount;
    const distribution: number[] = [];
    
    for (let i = 0; i < fieldCount; i++) {
      distribution.push(baseWidth + (i < remainder ? 1 : 0));
    }
    
    return distribution;
  }

  /**
   * Create header region with dynamic column configuration
   */
  public async createDynamicHeaderRegion(templateId?: string): Promise<{ region: LayoutRegion; columnConfig: ColumnConfiguration }> {
    const columnConfig = await this.getColumnConfiguration(templateId);
    const region = this.createHeaderRegion();
    
    console.log('📱 Dynamic header region created with', columnConfig.headerColumns, 'columns');
    return { region, columnConfig };
  }

  /**
   * Create footer region with dynamic column configuration
   */
  public async createDynamicFooterRegion(templateId?: string): Promise<{ region: LayoutRegion; columnConfig: ColumnConfiguration }> {
    const columnConfig = await this.getColumnConfiguration(templateId);
    const region = this.createFooterRegion();
    
    console.log('📱 Dynamic footer region created with', columnConfig.footerColumns, 'columns');
    return { region, columnConfig };
  }

  /**
   * Create program region with dynamic configuration from template
   */
  /**
   * Create program region with dynamic configuration from template
   */
  public async createDynamicProgramRegion(height: number = 100, templateId?: string): Promise<{ region: LayoutRegion; columnConfig: ColumnConfiguration }> {
    const columnConfig = await this.getColumnConfiguration(templateId);
    const region = this.createProgramRegion(height);
    
    console.log('📱 Dynamic program region created with program fields:', columnConfig.programFields);
    return { region, columnConfig };
  }

  /**
   * Create resources region with dynamic configuration from template
   */
  public async createDynamicResourcesRegion(height: number = 50, templateId?: string): Promise<{ region: LayoutRegion; columnConfig: ColumnConfiguration }> {
    const columnConfig = await this.getColumnConfiguration(templateId);
    const region = this.createResourcesRegion(height);
    
    console.log('📚 Dynamic resources region created with resources fields:', columnConfig.resourcesFields);
    return { region, columnConfig };
  }

  /**
   * Clear template cache when templates are updated
   */
  public clearTemplateCache(): void {
    this.templateCache.clear();
    this.currentColumnConfig = null;
    console.log('🗑️ Template cache cleared');
  }

  /**
   * Get current column configuration (cached)
   */
  public getCurrentColumnConfiguration(): ColumnConfiguration | null {
    return this.currentColumnConfig;
  }

  /**
   * Test template integration with sample data
   */
  public async testTemplateIntegration(templateId?: string): Promise<void> {
    console.log('🧪 Testing template integration...');
    
    try {
      const config = await this.getColumnConfiguration(templateId);
      console.log('📊 Column configuration:', config);
      
      const headerResult = await this.createDynamicHeaderRegion(templateId);
      const footerResult = await this.createDynamicFooterRegion(templateId);
      
      console.log('📱 Dynamic header:', {
        region: headerResult.region,
        columns: headerResult.columnConfig.headerColumns,
        fields: headerResult.columnConfig.headerFields
      });
      console.log('📱 Dynamic footer:', {
        region: footerResult.region,
        columns: footerResult.columnConfig.footerColumns,
        fields: footerResult.columnConfig.footerFields
      });
      
      console.log('✅ Template integration test completed successfully');
    } catch (error) {
      console.error('❌ Template integration test failed:', error);
    }
  }
}
