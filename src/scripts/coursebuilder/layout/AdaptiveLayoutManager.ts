/**
 * AdaptiveLayoutManager - Responsive Layout System
 * 
 * Responsibilities:
 * - Read margin settings from coursebuilder page layout inputs
 * - Convert centimeters to pixels for canvas positioning
 * - Listen for margin changes and update layout accordingly
 * - Provide real-time layout adaptation to user settings
 * - Calculate dynamic column configuration based on template data
 * - Integrate with Supabase template configuration
 */

import { LayoutManager, GridConfig, LayoutRegion } from './LayoutManager';
import { Container } from 'pixi.js';
import type { TemplateBlock } from '../../backend/courses/templates/createTemplate.js';
import { supabase } from '../../backend/supabase.js';

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
}

export class AdaptiveLayoutManager extends LayoutManager {
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

  constructor() {
    super();
    this.initializeMarginInputs();
  }

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
      console.log('📐 Adaptive Layout: Current margins read from page setup:', this.currentMargins);
    } else {
      console.warn('⚠️ Adaptive Layout: Margin inputs not found, using defaults');
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
   * Initialize with container and setup adaptive behavior
   */
  public initialize(container: Container): void {
    // Call parent initialize
    super.initialize(container);
    
    // Update grid config based on current margins
    this.updateGridConfigFromMargins();
    
    // Setup margin change listeners
    this.setupMarginListeners();
    
    console.log('📐 Adaptive Layout Manager initialized with real-time margin adaptation');
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
   * Get adaptive layout information for debugging
   */
  public getAdaptiveLayoutInfo(): any {
    const baseInfo = this.getLayoutInfo();
    const margins = this.getCurrentMargins();
    const contentArea = this.getContentArea();
    
    return {
      ...baseInfo,
      adaptive: {
        marginsConnected: Object.values(this.marginInputs).some(input => input !== null),
        listening: this.isListening,
        currentMargins: margins,
        conversionFactor: 794 / 21, // pixels per cm
        contentArea: contentArea,
        headerInMargin: true,
        footerInMargin: true
      }
    };
  }

  /**
   * Test margin adaptation by cycling through different values
   */
  public testMarginAdaptation(): void {
    console.log('🧪 Testing margin adaptation...');
    
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
        console.log('✅ Margin adaptation test completed');
        return;
      }
      
      const margins = testMargins[index];
      console.log(`📐 Test ${index + 1}: Setting margins to`, margins);
      this.setMargins(margins);
      index++;
    }, 2000);
  }

  /**
   * Refresh adaptation (useful after dynamic content changes)
   */
  public refreshAdaptation(): void {
    this.initializeMarginInputs();
    if (this.marginInputs.top) {
      this.updateGridConfigFromMargins();
      console.log('🔄 Adaptive layout refreshed');
    }
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
  public destroy(): void {
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
    
    // Call parent destroy
    super.destroy();
    
    console.log('🗑️ Adaptive Layout Manager destroyed');
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

      this.currentColumnConfig = {
        headerColumns: headerConfig.columns,
        footerColumns: footerConfig.columns,
        headerFields: headerConfig.fields,
        footerFields: footerConfig.fields,
        headerDistribution: this.calculateColumnDistribution(headerConfig.columns),
        footerDistribution: this.calculateColumnDistribution(footerConfig.columns)
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

    const enabledFields = this.getEnabledFields(headerBlock, this.getHeaderFieldConfig());
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

    const enabledFields = this.getEnabledFields(footerBlock, this.getFooterFieldConfig());
    return {
      columns: Math.max(1, Math.min(12, enabledFields.length)),
      fields: enabledFields
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
   * Get header field configuration (matches createTemplate.ts)
   */
  private getHeaderFieldConfig() {
    return [
      { name: 'lesson_number', label: 'Lesson number (#)', mandatory: true },
      { name: 'lesson_title', label: 'Lesson title', mandatory: true },
      { name: 'module_title', label: 'Module title', mandatory: true },
      { name: 'course_title', label: 'Course title', mandatory: true },
      { name: 'institution_name', label: 'Institution name', mandatory: true },
      { name: 'teacher_name', label: 'Teacher name', mandatory: false }
    ];
  }

  /**
   * Get footer field configuration (matches createTemplate.ts)
   */
  private getFooterFieldConfig() {
    return [
      { name: 'copyright', label: 'Copyright', mandatory: true },
      { name: 'teacher_name', label: 'Teacher name', mandatory: false },
      { name: 'institution_name', label: 'Institution name', mandatory: false },
      { name: 'page_number', label: 'Page number (#)', mandatory: true }
    ];
  }

  /**
   * Get default column configuration when no template data
   */
  private getDefaultColumnConfiguration(): ColumnConfiguration {
    return {
      headerColumns: 5,
      footerColumns: 2,
      headerFields: ['lesson_number', 'lesson_title', 'module_title', 'course_title', 'institution_name'],
      footerFields: ['copyright', 'page_number'],
      headerDistribution: [2, 3, 2, 3, 2],
      footerDistribution: [6, 6]
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
