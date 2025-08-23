/**
 * PixiJS Layout v3 Integration
 * Bridges the pedagogical layout system with PixiJS Layout's flexbox capabilities
 */

import "@pixi/layout"; // Import must be first to apply mixins
import { Container, Graphics } from "pixi.js";
import type { LayoutBlock, CanvasArea } from "./LayoutTypes";

// Extend PixiJS types to include layout properties
declare global {
  namespace PIXI {
    interface Container {
      layout?: LayoutProperties;
    }
  }
}

interface LayoutProperties {
  width?: string | number;
  height?: string | number;
  flexDirection?: "row" | "column";
  justifyContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "space-evenly";
  alignItems?: "flex-start" | "flex-end" | "center" | "stretch";
  alignContent?: "flex-start" | "flex-end" | "center" | "space-between" | "space-around" | "stretch";
  flexWrap?: "nowrap" | "wrap" | "wrap-reverse";
  gap?: number;
  padding?: number;
  margin?: number;
  flex?: number;
  flexGrow?: number;
  flexShrink?: number;
  flexBasis?: string | number;
  backgroundColor?: number;
  borderRadius?: number;
  overflow?: "visible" | "hidden";
}

export class PixiLayoutIntegration {
  private layoutContainer: Container;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(layoutContainer: Container, canvasWidth: number, canvasHeight: number) {
    this.layoutContainer = layoutContainer;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Create pedagogical layout using PixiJS Layout flexbox
   */
  createPedagogicalLayout(blocks: LayoutBlock[]): Container {
    // Create main container with full canvas layout
    const mainContainer = new Container();
    mainContainer.layout = {
      width: this.canvasWidth,
      height: this.canvasHeight,
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      gap: 0,
    };

    console.log(`🎓 Creating pedagogical layout with ${blocks.length} blocks using PixiJS Layout`);

    // Create each pedagogical block
    blocks.forEach((block, index) => {
      const blockContainer = this.createBlockContainer(block, index);
      mainContainer.addChild(blockContainer);
    });

    return mainContainer;
  }

  /**
   * Create a single block container with areas
   */
  private createBlockContainer(block: LayoutBlock, _index: number): Container {
    const blockContainer = new Container();
    
    // Apply PixiJS Layout properties
    blockContainer.layout = {
      width: "100%",
      height: `${block.heightPercentage}%`,
      flexDirection: block.styles?.flexDirection || "row",
      justifyContent: block.styles?.justifyContent || "flex-start",
      alignItems: block.styles?.alignItems || "stretch",
      gap: block.styles?.gap || 5,
      padding: block.styles?.padding || 10,
      backgroundColor: this.getBlockColor(block.id),
      // Optional border radius for modern look
      borderRadius: block.styles?.borderRadius || 8,
    };

    blockContainer.label = `block-${block.id}`;

    // Add visual background if needed (PixiJS Layout handles backgroundColor)
    // But we might want custom styling
    if (block.isRequired) {
      this.addBlockBorder(blockContainer, block);
    }

    // Create areas within the block
    if (block.canvasAreas) {
      block.canvasAreas.forEach(area => {
        const areaContainer = this.createAreaContainer(area);
        blockContainer.addChild(areaContainer);
      });
    }

    console.log(`📦 Created block: ${block.name} (${block.heightPercentage}%)`);
    return blockContainer;
  }

  /**
   * Create area containers within blocks
   */
  private createAreaContainer(area: CanvasArea): Container {
    const areaContainer = new Container();
    
    // Configure layout based on area type and permissions
    areaContainer.layout = {
      flex: 1, // Take available space
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      padding: 5,
      gap: 3,
      backgroundColor: this.getAreaColor(area.type),
      borderRadius: 4,
    };

    areaContainer.label = `area-${area.id}`;
    areaContainer.interactive = area.allowsDrawing; // Enable interaction for drawing areas

    // Add visual indicators for area permissions
    this.addAreaIndicators(areaContainer, area);

    return areaContainer;
  }

  /**
   * Add visual border to required blocks
   */
  private addBlockBorder(container: Container, block: LayoutBlock): void {
    // PixiJS Layout will handle the backgroundColor, but we can add custom borders
    const border = new Graphics();
    border.rect(0, 0, 100, 100); // Will be sized by layout
    border.stroke({ width: 2, color: this.getBlockBorderColor(block.id), alpha: 0.8 });
    border.label = `border-${block.id}`;
    container.addChildAt(border, 0); // Add as background
  }

  /**
   * Add visual indicators for area capabilities
   */
  private addAreaIndicators(container: Container, area: CanvasArea): void {
    const indicators = new Graphics();
    let yOffset = 2;

    // Drawing indicator
    if (area.allowsDrawing) {
      indicators.circle(10, yOffset, 3);
      indicators.fill({ color: 0x00ff00, alpha: 0.7 });
      yOffset += 8;
    }

    // Media indicator  
    if (area.allowsMedia) {
      indicators.rect(6, yOffset, 8, 6);
      indicators.fill({ color: 0x0080ff, alpha: 0.7 });
      yOffset += 8;
    }

    // Text indicator
    if (area.allowsText) {
      indicators.rect(6, yOffset, 8, 2);
      indicators.fill({ color: 0xff8000, alpha: 0.7 });
    }

    indicators.label = `indicators-${area.id}`;
    container.addChild(indicators);
  }

  /**
   * Convert existing LayoutBlock styles to PixiJS Layout properties
   */
  static convertBlockToLayoutProps(block: LayoutBlock): LayoutProperties {
    return {
      width: "100%",
      height: `${block.heightPercentage}%`,
      flexDirection: block.styles?.flexDirection || "column",
      justifyContent: block.styles?.justifyContent || "flex-start",
      alignItems: block.styles?.alignItems || "stretch",
      gap: block.styles?.gap || 5,
      padding: block.styles?.padding || 10,
      backgroundColor: block.styles?.backgroundColor ? 
        parseInt(block.styles.backgroundColor.replace('#', ''), 16) : 0xffffff,
      borderRadius: block.styles?.borderRadius || 8,
    };
  }

  /**
   * Create responsive layout that adapts to canvas size
   */
  createResponsiveLayout(blocks: LayoutBlock[], targetWidth: number, targetHeight: number): Container {
    this.canvasWidth = targetWidth;
    this.canvasHeight = targetHeight;
    
    // Create adaptive layout based on aspect ratio
    const isPortrait = targetHeight > targetWidth;
    
    const mainContainer = new Container();
    mainContainer.layout = {
      width: targetWidth,
      height: targetHeight,
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      gap: isPortrait ? 2 : 4, // Tighter spacing for portrait
      padding: isPortrait ? 5 : 10, // Less padding for portrait
    };

    // Adjust block proportions for different orientations
    const adaptedBlocks = blocks.map(block => ({
      ...block,
      heightPercentage: this.adaptBlockHeight(block, isPortrait)
    }));

    adaptedBlocks.forEach(block => {
      const blockContainer = this.createBlockContainer(block, 0);
      mainContainer.addChild(blockContainer);
    });

    return mainContainer;
  }

  /**
   * Adapt block heights based on orientation and canvas size
   */
  private adaptBlockHeight(block: LayoutBlock, isPortrait: boolean): number {
    // For portrait, slightly reduce header/footer, expand content
    if (isPortrait) {
      switch (block.id) {
        case 'header': return Math.max(6, block.heightPercentage - 2);
        case 'footer': return Math.max(3, block.heightPercentage - 2);
        case 'content': return Math.min(55, block.heightPercentage + 5);
        default: return block.heightPercentage;
      }
    }
    return block.heightPercentage;
  }

  /**
   * Color schemes for blocks and areas
   */
  private getBlockColor(blockId: string): number {
    const colors: Record<string, number> = {
      header: 0x4a90e2,
      program: 0x7ed321,
      resources: 0xf5a623,
      content: 0xd0021b,
      assignment: 0x9013fe,
      footer: 0x50e3c2,
    };
    return colors[blockId] || 0x999999;
  }

  private getBlockBorderColor(blockId: string): number {
    // Slightly darker version of block color
    const baseColor = this.getBlockColor(blockId);
    return Math.max(0, baseColor - 0x202020);
  }

  private getAreaColor(areaType: string): number {
    const colors: Record<string, number> = {
      instruction: 0xe8f4fd, // Light blue
      student: 0xfff4e6,    // Light orange
      teacher: 0xf0f9ff,    // Very light blue
    };
    return colors[areaType] || 0xf5f5f5;
  }

  /**
   * Update canvas dimensions and refresh layout
   */
  updateCanvasDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    
    // Update main container layout
    if (this.layoutContainer.layout) {
      (this.layoutContainer.layout as any).width = width;
      (this.layoutContainer.layout as any).height = height;
    }
  }

  /**
   * Toggle layout debugging (show/hide layout boundaries)
   */
  toggleLayoutDebug(container: Container, enabled: boolean): void {
    container.children.forEach(child => {
      if (child instanceof Container) {
        // Add or remove debug borders
        const debugBorder = child.getChildByLabel?.('debug-border') as Graphics;
        
        if (enabled && !debugBorder) {
          const debug = new Graphics();
          debug.rect(0, 0, child.width, child.height);
          debug.stroke({ width: 1, color: 0xff0000, alpha: 0.5 });
          debug.label = 'debug-border';
          child.addChild(debug);
        } else if (!enabled && debugBorder) {
          child.removeChild(debugBorder);
        }
        
        // Recursively apply to children
        this.toggleLayoutDebug(child, enabled);
      }
    });
  }
}
