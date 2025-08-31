/**
 * Layout Demo - Example Usage of the Layout System
 * 
 * This file demonstrates how to integrate the layout system with the existing
 * PIXI canvas and shows basic usage of header and footer components.
 */

import { CanvasAPI } from '../canvas/CanvasAPI';
import { LayoutManager } from './LayoutManager';
import { HeaderComponent, FooterComponent } from './index';

export class LayoutDemo {
  private canvasAPI: CanvasAPI;
  private layoutManager: LayoutManager;
  private headerComponent: HeaderComponent | null = null;
  private footerComponent: FooterComponent | null = null;

  constructor(canvasAPI: CanvasAPI) {
    this.canvasAPI = canvasAPI;
    this.layoutManager = new LayoutManager();
  }

  /**
   * Initialize and demonstrate the layout system
   */
  public async demo(): Promise<void> {
    console.log('🎯 Starting Layout System Demo...');

    // Ensure canvas is ready
    if (!this.canvasAPI.isReady()) {
      console.log('⏳ Waiting for canvas to initialize...');
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    if (!this.canvasAPI.isReady()) {
      console.error('❌ Canvas not ready - cannot proceed with layout demo');
      return;
    }

    // Get the UI layer for layout components
    const uiLayer = this.canvasAPI.getLayer('ui');
    if (!uiLayer) {
      console.error('❌ UI layer not available - cannot setup layout');
      return;
    }

    // Initialize layout manager
    this.layoutManager.initialize(uiLayer);
    
    // Debug grid disabled by default (can be enabled via console: layoutDemo.toggleDebugGrid())
    // this.layoutManager.toggleDebugGrid(true);

    // Create and apply basic template
    const basicTemplate = this.layoutManager.createBasicTemplate();
    this.layoutManager.applyTemplate(basicTemplate);

    // Create header component
    await this.createHeader();

    // Create footer component
    await this.createFooter();

    // Log layout information
    this.logLayoutInfo();

    // Add helpful console commands
    console.log('🎮 CONSOLE COMMANDS AVAILABLE:');
    console.log('layoutDemo.getCurrentMargins() - Get current margins');
    console.log('layoutDemo.setMargins({top: 1, bottom: 1}) - Set margins in cm');
    console.log('layoutDemo.testMarginAdaptation() - Test margin changes');
    console.log('layoutDemo.refreshLayout() - Refresh layout system');
    console.log('layoutDemo.toggleDebugGrid() - Toggle debug grid');
    console.log('🆕 TEMPLATE INTEGRATION COMMANDS:');
    console.log('layoutDemo.testTemplateIntegration() - Test template data integration');
    console.log('layoutDemo.demonstrateColumnConfiguration() - Show dynamic column config');
    console.log('layoutDemo.getCurrentColumnConfiguration() - Get current column config');
    console.log('layoutDemo.refreshTemplateData() - Clear cache and refresh template data');
    console.log('layoutDemo.recreateHeaderFooter() - Recreate components with new data');
    console.log('layoutDemo.updateColumnData({lesson_title: "New Title"}, {page_number: "Page 2"}) - Update column values');

    console.log('✅ Layout System Demo completed!');
    
    // Auto-demonstrate template integration if available
    setTimeout(() => {
      this.demonstrateColumnConfiguration().catch(err => 
        console.log('ℹ️ Template integration demo skipped (no template data available):', err.message)
      );
    }, 1000);
  }

  /**
   * Create and configure header component
   */
  private async createHeader(): Promise<void> {
    try {
      // Get column configuration from template
      const columnConfig = await this.layoutManager.getColumnConfiguration();
      const headerRegion = this.layoutManager.createHeaderRegion();

      this.headerComponent = new HeaderComponent(headerRegion, {
        backgroundColor: 0xfcfcfc,
        borderColor: 0xeeeeee,
        borderWidth: 1,
        textStyle: {
          fontSize: 22,
          fill: 0x333333,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'bold'
        }
      });

      // Set header content to show template columns
      this.headerComponent.setContent({
        type: 'columns',
        columnData: {
          fields: columnConfig.headerFields,
          distribution: columnConfig.headerDistribution,
          values: {
            lesson_number: 'Lesson 1',
            lesson_title: 'Introduction to Templates',
            module_title: 'Course Builder',
            course_title: 'Web Development',
            institution_name: 'Neptino Academy',
            teacher_name: 'Course Instructor'
          }
        }
      });

      // Add to UI layer
      const uiLayer = this.canvasAPI.getLayer('ui');
      if (uiLayer) {
        uiLayer.addChild(this.headerComponent.getContainer());
      }

      console.log('📋 Header component created with', columnConfig.headerFields.length, 'template columns');
    } catch (error) {
      console.error('❌ Failed to create template-based header, falling back to static:', error);
      this.createStaticHeader();
    }
  }

  /**
   * Create static header as fallback
   */
  private createStaticHeader(): void {
    const headerRegion = this.layoutManager.createHeaderRegion();

    this.headerComponent = new HeaderComponent(headerRegion, {
      backgroundColor: 0xfcfcfc,
      borderColor: 0xeeeeee,
      borderWidth: 1,
      textStyle: {
        fontSize: 22,
        fill: 0x333333,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold'
      }
    });

    // Set static header content
    this.headerComponent.setContent({
      type: 'text',
      title: 'Course Builder',
      subtitle: 'Layout System (Static Fallback)',
      alignment: 'center'
    });

    // Add to UI layer
    const uiLayer = this.canvasAPI.getLayer('ui');
    if (uiLayer) {
      uiLayer.addChild(this.headerComponent.getContainer());
    }

    console.log('📋 Static header component created (template integration failed)');
  }

  /**
   * Create and configure footer component
   */
  private async createFooter(): Promise<void> {
    try {
      // Get column configuration from template
      const columnConfig = await this.layoutManager.getColumnConfiguration();
      const footerRegion = this.layoutManager.createFooterRegion();

      this.footerComponent = new FooterComponent(footerRegion, {
        backgroundColor: 0xf9f9f9,
        borderColor: 0xeeeeee,
        borderWidth: 1,
        textStyle: {
          fontSize: 12,
          fill: 0x777777,
          fontFamily: 'Arial, sans-serif',
          fontWeight: 'normal'
        }
      });

      // Set footer content to show template columns
      this.footerComponent.setContent({
        type: 'columns',
        columnData: {
          fields: columnConfig.footerFields,
          distribution: columnConfig.footerDistribution,
          values: {
            copyright: '© 2025 Neptino',
            teacher_name: 'Course Instructor',
            institution_name: 'Neptino Academy',
            page_number: 'Page 1'
          }
        }
      });

      // Add to UI layer
      const uiLayer = this.canvasAPI.getLayer('ui');
      if (uiLayer) {
        uiLayer.addChild(this.footerComponent.getContainer());
      }

      console.log('📄 Footer component created with', columnConfig.footerFields.length, 'template columns');
    } catch (error) {
      console.error('❌ Failed to create template-based footer, falling back to static:', error);
      this.createStaticFooter();
    }
  }

  /**
   * Create static footer as fallback
   */
  private createStaticFooter(): void {
    const footerRegion = this.layoutManager.createFooterRegion();

    this.footerComponent = new FooterComponent(footerRegion, {
      backgroundColor: 0xf9f9f9,
      borderColor: 0xeeeeee,
      borderWidth: 1,
      textStyle: {
        fontSize: 12,
        fill: 0x777777,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'normal'
      }
    });

    // Set static footer content
    this.footerComponent.setContent({
      type: 'mixed',
      leftText: 'Course Draft',
      centerText: 'Neptino Course Builder',
      rightText: 'Page 1'
    });

    // Add to UI layer
    const uiLayer = this.canvasAPI.getLayer('ui');
    if (uiLayer) {
      uiLayer.addChild(this.footerComponent.getContainer());
    }

    console.log('📄 Static footer component created (template integration failed)');
  }

  /**
   * Update header content (example of dynamic updates)
   */
  public updateHeaderTitle(newTitle: string, subtitle?: string): void {
    if (this.headerComponent) {
      this.headerComponent.updateContent({
        title: newTitle,
        subtitle: subtitle
      });
      console.log('📝 Header updated:', newTitle);
    }
  }

  /**
   * Update footer page number (example of dynamic updates)
   */
  public updatePageNumber(pageNumber: number, totalPages?: number): void {
    if (this.footerComponent) {
      this.footerComponent.updateContent({
        rightText: totalPages ? `Page ${pageNumber} of ${totalPages}` : `Page ${pageNumber}`
      });
      console.log('📊 Page number updated:', pageNumber);
    }
  }

  /**
   * Toggle debug grid visibility
   */
  public toggleDebugGrid(): void {
    this.layoutManager.toggleDebugGrid();
  }

  /**
   * Get layout system information (now includes adaptive info)
   */
  public getLayoutInfo(): any {
    return {
      canvas: this.canvasAPI.getCanvasInfo(),
      layout: this.layoutManager.getLayoutInfo(), // Use layout info
      header: this.headerComponent?.getDebugInfo() || null,
      footer: this.footerComponent?.getDebugInfo() || null
    };
  }

  /**
   * Log comprehensive layout information
   */
  private logLayoutInfo(): void {
    const info = this.getLayoutInfo();
    
    console.log('🔍 Layout System Information:');
    console.log('Canvas dimensions:', info.canvas.dimensions);
    console.log('Grid config:', info.layout.config);
    console.log('Column width:', info.layout.columnWidth);
    console.log('Content height:', info.layout.contentHeight);
    console.log('📐 ADAPTIVE FEATURES:');
    console.log('Current margins (cm):', info.layout.adaptive?.currentMargins?.cm);
    console.log('Current margins (pixels):', info.layout.adaptive?.currentMargins?.pixels);
    console.log('Content area (within margins):', info.layout.adaptive?.contentArea);
    console.log('Header in top margin:', info.layout.adaptive?.headerInMargin);
    console.log('Footer in bottom margin:', info.layout.adaptive?.footerInMargin);
    console.log('Margins connected to inputs:', info.layout.adaptive?.marginsConnected);
    console.log('Listening for changes:', info.layout.adaptive?.listening);
    console.log('Header region:', info.header?.region);
    console.log('Footer region:', info.footer?.region);
  }

  /**
   * Test responsive behavior (simulate canvas resize)
   */
  public testResponsive(): void {
    console.log('🔄 Testing responsive behavior...');
    
    // This would typically be called when canvas resizes
    // For now, just log what would happen
    const newWidth = 900;
    const newHeight = 1200;
    
    console.log(`Would resize canvas to ${newWidth}x${newHeight}`);
    console.log('Layout components would automatically adjust to new dimensions');
    
    // In a real scenario, we would:
    // 1. Update layout manager configuration
    // 2. Recreate regions with new dimensions
    // 3. Update header and footer components
    // 4. Re-render everything
  }

  /**
   * Test margin adaptation (NEW FEATURE)
   */
  public testMarginAdaptation(): void {
    this.layoutManager.testMarginChanges();
  }

  /**
   * Test template integration (NEWEST FEATURE)
   */
  public async testTemplateIntegration(templateId?: string): Promise<void> {
    console.log('🧪 Testing template integration from layout demo...');
    await this.layoutManager.testTemplateIntegration(templateId);
  }

  /**
   * Demonstrate dynamic column configuration (NEWEST FEATURE)
   */
  public async demonstrateColumnConfiguration(templateId?: string): Promise<void> {
    console.log('📊 Demonstrating dynamic column configuration...');
    
    try {
      const columnConfig = await this.layoutManager.getColumnConfiguration(templateId);
      console.log('🎯 Column Configuration Result:', columnConfig);
      
      console.log('📊 HEADER CONFIGURATION:');
      console.log(`  - Columns: ${columnConfig.headerColumns}`);
      console.log(`  - Fields: ${columnConfig.headerFields.join(', ')}`);
      console.log(`  - Distribution: ${columnConfig.headerDistribution.join(', ')}`);
      
      console.log('📊 FOOTER CONFIGURATION:');
      console.log(`  - Columns: ${columnConfig.footerColumns}`);
      console.log(`  - Fields: ${columnConfig.footerFields.join(', ')}`);
      console.log(`  - Distribution: ${columnConfig.footerDistribution.join(', ')}`);
      
      // Create dynamic regions
      const headerResult = await this.layoutManager.createDynamicHeaderRegion(templateId);
      const footerResult = await this.layoutManager.createDynamicFooterRegion(templateId);
      
      console.log('📱 Dynamic regions created:', {
        header: { ...headerResult.region, columnCount: columnConfig.headerColumns },
        footer: { ...footerResult.region, columnCount: columnConfig.footerColumns }
      });
      
    } catch (error) {
      console.error('❌ Column configuration demo failed:', error);
    }
  }

  /**
   * Get current template column configuration (NEWEST FEATURE)
   */
  public getCurrentColumnConfiguration(): any {
    return this.layoutManager.getCurrentColumnConfiguration();
  }

  /**
   * Clear template cache and refresh (NEWEST FEATURE)
   */
  public async refreshTemplateData(): Promise<void> {
    console.log('🔄 Refreshing template data...');
    this.layoutManager.clearTemplateCache();
    await this.demonstrateColumnConfiguration();
    
    // Recreate header and footer with new template data
    await this.recreateHeaderFooter();
  }

  /**
   * Recreate header and footer components with updated template data
   */
  public async recreateHeaderFooter(): Promise<void> {
    console.log('🔄 Recreating header and footer with updated template data...');
    
    try {
      // Remove existing components
      if (this.headerComponent) {
        this.headerComponent.destroy();
        this.headerComponent = null;
      }
      if (this.footerComponent) {
        this.footerComponent.destroy();
        this.footerComponent = null;
      }

      // Recreate with new template data
      await this.createHeader();
      await this.createFooter();

      console.log('✅ Header and footer recreated with updated template data');
    } catch (error) {
      console.error('❌ Failed to recreate components:', error);
    }
  }

  /**
   * Update column data with specific values
   */
  public async updateColumnData(headerValues?: Record<string, string>, footerValues?: Record<string, string>): Promise<void> {
    console.log('📝 Updating column data with new values...');
    
    try {
      const columnConfig = await this.layoutManager.getColumnConfiguration();

      // Update header if component exists and values provided
      if (this.headerComponent && headerValues) {
        this.headerComponent.setContent({
          type: 'columns',
          columnData: {
            fields: columnConfig.headerFields,
            distribution: columnConfig.headerDistribution,
            values: headerValues
          }
        });
      }

      // Update footer if component exists and values provided
      if (this.footerComponent && footerValues) {
        this.footerComponent.setContent({
          type: 'columns',
          columnData: {
            fields: columnConfig.footerFields,
            distribution: columnConfig.footerDistribution,
            values: footerValues
          }
        });
      }

      console.log('✅ Column data updated successfully');
    } catch (error) {
      console.error('❌ Failed to update column data:', error);
    }
  }

  /**
   * Get current page margins (NEW FEATURE)
   */
  public getCurrentMargins(): any {
    return this.layoutManager.getCurrentMargins();
  }

  /**
   * Set page margins programmatically (NEW FEATURE)
   */
  public setMargins(margins: { top?: number; right?: number; bottom?: number; left?: number }): void {
    this.layoutManager.setMargins(margins);
  }

  /**
   * Refresh layout adaptation (useful after changes) (NEW FEATURE)
   */
  public refreshLayout(): void {
    this.layoutManager.refreshLayout();
  }

  /**
   * Show visual layout structure in console (NEW FEATURE)
   */
  public showLayoutStructure(): void {
    const margins = this.layoutManager.getCurrentMargins();
    const info = this.layoutManager.getLayoutInfo();
    
    console.log('📋 LAYOUT STRUCTURE:');
    console.log('┌─────────────────────────────────────────┐ ← Canvas (794×1123px)');
    console.log('│ ╔═══════════ HEADER AREA ═════════════╗ │ ← In TOP margin');
    console.log('│ ║                                     ║ │');
    console.log('│ ╚═════════════════════════════════════╝ │');
    console.log('│ ┌───────── CONTENT AREA ─────────────┐ │ ← Between margins');
    console.log('│ │                                   │ │');
    console.log('│ │     Main content goes here        │ │');
    console.log('│ │                                   │ │');
    console.log('│ └───────────────────────────────────┘ │');
    console.log('│ ╔═══════════ FOOTER AREA ═════════════╗ │ ← In BOTTOM margin');
    console.log('│ ║                                     ║ │');
    console.log('│ ╚═════════════════════════════════════╝ │');
    console.log('└─────────────────────────────────────────┘');
    console.log(`Margins: ${margins.cm.top}cm top, ${margins.cm.right}cm right, ${margins.cm.bottom}cm bottom, ${margins.cm.left}cm left`);
    console.log(`Content area: ${info.adaptive.contentArea.width}×${info.adaptive.contentArea.height}px`);
  }

  /**
   * Clean up demo
   */
  public destroy(): void {
    if (this.headerComponent) {
      this.headerComponent.destroy();
      this.headerComponent = null;
    }

    if (this.footerComponent) {
      this.footerComponent.destroy();
      this.footerComponent = null;
    }

    this.layoutManager.destroy();
    console.log('🗑️ Layout demo destroyed');
  }
}
