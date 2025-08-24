/**
 * Layout Renderer with PixiJS Layout v3 Integration
 * Replaces manual positioning with flexbox-based layout
 */

import "@pixi/layout"; // Must be imported first
import { Container, Text, TextStyle } from "pixi.js";
import type { LayoutBlock } from "./LayoutTypes";
import { PixiLayoutIntegration } from "./PixiLayoutIntegration";

export class LayoutRenderer {
  private layoutContainer: Container;
  private pixiLayoutIntegration: PixiLayoutIntegration;
  private canvasWidth: number;
  private canvasHeight: number;
  private debugMode: boolean = false;

  constructor(layoutContainer: Container, canvasWidth: number = 794, canvasHeight: number = 1123) {
    this.layoutContainer = layoutContainer;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    // Initialize PixiJS Layout integration
    this.pixiLayoutIntegration = new PixiLayoutIntegration(
      layoutContainer, 
      canvasWidth, 
      canvasHeight
    );

    console.log('🎨 Layout Renderer initialized with PixiJS Layout v3');
  }

  /**
   * Render pedagogical layout using PixiJS Layout flexbox
   */
  renderPedagogicalLayout(
    blocks: LayoutBlock[], 
    showLabels: boolean = true,
    responsive: boolean = true
  ): Container {
    // Clear previous content
    this.layoutContainer.removeChildren();

    console.log(`🏗️ Rendering pedagogical layout with ${blocks.length} blocks`);

    // Create the main layout container using PixiJS Layout
    const mainLayout = responsive ? 
      this.pixiLayoutIntegration.createResponsiveLayout(blocks, this.canvasWidth, this.canvasHeight) :
      this.pixiLayoutIntegration.createPedagogicalLayout(blocks);

    // Add to the stage
    this.layoutContainer.addChild(mainLayout);

    // Add labels if requested
    if (showLabels) {
      this.addLayoutLabels(mainLayout, blocks);
    }

    // Enable debug mode if needed
    if (this.debugMode) {
      this.pixiLayoutIntegration.toggleLayoutDebug(mainLayout, true);
    }

    return mainLayout;
  }

  /**
   * Create a flexible template layout
   */
  createTemplateLayout(
    templateName: string,
    customBlocks?: LayoutBlock[],
    layoutConfig?: {
      orientation?: 'portrait' | 'landscape';
      density?: 'compact' | 'normal' | 'spacious';
      style?: 'modern' | 'classic' | 'minimal';
    }
  ): Container {
    const config = {
      orientation: 'portrait',
      density: 'normal',
      style: 'modern',
      ...layoutConfig
    };

    console.log(`🎯 Creating template layout: ${templateName}`, config);

    // Use default blocks if none provided
    const blocksToUse = customBlocks || this.getDefaultBlocks();
    
    // Apply template-specific modifications
    const adaptedBlocks = this.adaptBlocksForTemplate(blocksToUse, config);

    return this.renderPedagogicalLayout(adaptedBlocks, true, true);
  }

  /**
   * Add contextual labels to layout blocks
   */
  private addLayoutLabels(container: Container, blocks: LayoutBlock[]): void {
    container.children.forEach((child, index) => {
      if (child instanceof Container && blocks[index]) {
        const block = blocks[index];
        
        // Create label
        const label = new Text({
          text: `${block.name} (${block.heightPercentage}%)`,
          style: new TextStyle({
            fontSize: 14,
            fill: 0x333333,
            fontWeight: 'bold',
            fontFamily: 'Arial, sans-serif',
            stroke: { color: 0xffffff, width: 2 },
          }),
        });

        // Position label (PixiJS Layout will handle final positioning)
        label.layout = {
          position: 'absolute' as any, // Position absolutely within the container
          top: 5,
          left: 10,
        };

        label.label = `label-${block.id}`;
        child.addChild(label);

        // Add area labels if present
        if (block.canvasAreas && child.children.length > 1) {
          this.addAreaLabels(child, block);
        }
      }
    });
  }

  /**
   * Add labels to canvas areas
   */
  private addAreaLabels(blockContainer: Container, block: LayoutBlock): void {
    if (!block.canvasAreas) return;

    block.canvasAreas.forEach((area) => {
      // Find the corresponding area container
      const areaContainer = blockContainer.children.find(
        child => child.label === `area-${area.id}`
      ) as Container;

      if (areaContainer) {
        const areaLabel = new Text({
          text: area.name,
          style: new TextStyle({
            fontSize: 10,
            fill: 0x666666,
            fontFamily: 'Arial, sans-serif',
            wordWrap: true,
            wordWrapWidth: 200,
          }),
        });

        // Position within area container
        areaLabel.layout = {
          alignSelf: 'flex-start',
          margin: 2,
        };

        areaLabel.label = `area-label-${area.id}`;
        areaContainer.addChild(areaLabel);
      }
    });
  }

  /**
   * Adapt blocks for specific template configurations
   */
  private adaptBlocksForTemplate(
    blocks: LayoutBlock[], 
    config: { orientation?: string; density?: string; style?: string; }
  ): LayoutBlock[] {
    return blocks.map(block => {
      const adaptedBlock = { ...block };

      // Adjust for density
      if (config.density === 'compact') {
        adaptedBlock.heightPercentage = Math.max(5, block.heightPercentage * 0.8);
      } else if (config.density === 'spacious') {
        adaptedBlock.heightPercentage = Math.min(60, block.heightPercentage * 1.2);
      }

      // Style-based adaptations
      if (config.style === 'modern') {
        adaptedBlock.styles = {
          ...adaptedBlock.styles,
          borderRadius: 12,
          gap: 8,
          padding: 15,
        };
      } else if (config.style === 'minimal') {
        adaptedBlock.styles = {
          ...adaptedBlock.styles,
          borderRadius: 0,
          gap: 2,
          padding: 5,
        };
      }

      return adaptedBlock;
    });
  }

  /**
   * Get default pedagogical blocks
   */
  private getDefaultBlocks(): LayoutBlock[] {
    return [
      {
        id: "header",
        name: "Header",
        heightPercentage: 8,
        isRequired: true,
        styles: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: "#4a90e2",
          gap: 10,
          padding: 10,
        },
        canvasAreas: [{
          id: "header-title",
          name: "Course Title",
          type: "instruction",
          allowsDrawing: false,
          allowsMedia: false,
          allowsText: true,
        }]
      },
      {
        id: "program",
        name: "Learning Objectives",
        heightPercentage: 15,
        isRequired: true,
        styles: {
          flexDirection: "column",
          justifyContent: "flex-start",
          alignItems: "stretch",
          backgroundColor: "#7ed321",
          gap: 5,
          padding: 12,
        },
        canvasAreas: [{
          id: "program-objectives",
          name: "Objectives Area",
          type: "instruction",
          allowsDrawing: true,
          allowsMedia: true,
          allowsText: true,
        }]
      },
      {
        id: "content",
        name: "Main Content",
        heightPercentage: 50,
        isRequired: true,
        styles: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "stretch",
          backgroundColor: "#d0021b",
          gap: 10,
          padding: 15,
        },
        canvasAreas: [
          {
            id: "content-teacher",
            name: "Teacher Area",
            type: "teacher",
            allowsDrawing: true,
            allowsMedia: true,
            allowsText: true,
          },
          {
            id: "content-student",
            name: "Student Work Area",
            type: "student",
            allowsDrawing: true,
            allowsMedia: true,
            allowsText: true,
          }
        ]
      },
      {
        id: "resources",
        name: "Resources",
        heightPercentage: 12,
        isRequired: false,
        styles: {
          flexDirection: "row",
          justifyContent: "flex-start",
          alignItems: "center",
          backgroundColor: "#f5a623",
          gap: 8,
          padding: 10,
        },
        canvasAreas: [{
          id: "resources-area",
          name: "Resources & Materials",
          type: "teacher",
          allowsDrawing: true,
          allowsMedia: true,
          allowsText: true,
        }]
      },
      {
        id: "assignment",
        name: "Assessment",
        heightPercentage: 10,
        isRequired: false,
        styles: {
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "stretch",
          backgroundColor: "#9013fe",
          gap: 6,
          padding: 10,
        },
        canvasAreas: [{
          id: "assignment-area",
          name: "Assessment Tasks",
          type: "instruction",
          allowsDrawing: true,
          allowsMedia: true,
          allowsText: true,
        }]
      },
      {
        id: "footer",
        name: "Footer",
        heightPercentage: 5,
        isRequired: true,
        styles: {
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#50e3c2",
          gap: 5,
          padding: 8,
        },
        canvasAreas: [{
          id: "footer-info",
          name: "Course Information",
          type: "instruction",
          allowsDrawing: false,
          allowsMedia: false,
          allowsText: true,
        }]
      }
    ];
  }

  /**
   * Update canvas dimensions and re-render if needed
   */
  updateCanvasDimensions(width: number, height: number, reRender: boolean = true): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.pixiLayoutIntegration.updateCanvasDimensions(width, height);

    if (reRender && this.layoutContainer.children.length > 0) {
      console.log(`📐 Canvas resized to ${width}x${height}, re-rendering layout`);
      // Trigger layout recalculation
      // PixiJS Layout will automatically handle this
    }
  }

  /**
   * Toggle debug mode to show layout boundaries
   */
  toggleDebugMode(enabled?: boolean): void {
    this.debugMode = enabled !== undefined ? enabled : !this.debugMode;
    
    if (this.layoutContainer.children.length > 0) {
      const mainLayout = this.layoutContainer.children[0] as Container;
      this.pixiLayoutIntegration.toggleLayoutDebug(mainLayout, this.debugMode);
    }

    console.log(`🐛 Layout debug mode ${this.debugMode ? 'enabled' : 'disabled'}`);
  }

  /**
   * Clear all rendered content
   */
  clear(): void {
    this.layoutContainer.removeChildren();
  }

  /**
   * Get layout integration instance for advanced operations
   */
  getLayoutIntegration(): PixiLayoutIntegration {
    return this.pixiLayoutIntegration;
  }

  /**
   * Export layout configuration for saving/loading
   */
  exportLayoutConfig(): any {
    return {
      canvasWidth: this.canvasWidth,
      canvasHeight: this.canvasHeight,
      debugMode: this.debugMode,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Import layout configuration
   */
  importLayoutConfig(config: any): void {
    if (config.canvasWidth && config.canvasHeight) {
      this.updateCanvasDimensions(config.canvasWidth, config.canvasHeight);
    }
    if (typeof config.debugMode === 'boolean') {
      this.toggleDebugMode(config.debugMode);
    }
    console.log('📥 Layout configuration imported');
  }
}
