/**
 * Template Renderer
 * Renders any template structure using BlockManager
 */

import { Container } from "pixi.js";
import type { 
  Template, 
  RenderOptions, 
  ITemplateRenderer,
  LayoutContainer 
} from "./LayoutTypes";
import { BlockManager } from "./BlockManager";

export class TemplateRenderer implements ITemplateRenderer {
  private layoutContainer: Container;
  private blockManager: BlockManager;
  private canvasWidth: number;
  private canvasHeight: number;
  private debugMode: boolean = false;

  constructor(layoutContainer: Container, canvasWidth: number = 794, canvasHeight: number = 1123) {
    this.layoutContainer = layoutContainer;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.blockManager = new BlockManager(canvasWidth, canvasHeight);
  }

  /**
   * Render a complete template
   */
  render(template: Template, options: RenderOptions = {}): Container {
    this.clear();

    const {
      showLabels = true,
      debugMode = false,
      responsive = true,
      theme = "modern"
    } = options;

    this.debugMode = debugMode;

    console.log(`🎨 Rendering template: ${template.name} (${template.type})`);

    // Create main template container
    const mainContainer = this.createMainContainer(template, responsive);

    // Render each block
    template.blocks
      .filter(block => block.enabled) // Only render enabled blocks
      .forEach(block => {
        const blockContainer = this.blockManager.renderBlock(block, mainContainer);
        
        // Add block labels if requested
        if (showLabels) {
          this.addBlockLabel(blockContainer, block);
        }

        mainContainer.addChild(blockContainer);
      });

    // Add to main layout container
    this.layoutContainer.addChild(mainContainer);

    // Apply theme styling
    this.applyTheme(mainContainer, theme);

    // Enable debug mode if requested
    if (debugMode) {
      this.enableDebugMode(mainContainer);
    }

    console.log(`✅ Template rendered: ${template.blocks.length} blocks`);
    return mainContainer;
  }

  /**
   * Clear all rendered content
   */
  clear(): void {
    this.layoutContainer.removeChildren();
  }

  /**
   * Update canvas dimensions
   */
  updateDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.blockManager.updateDimensions(width, height);
  }

  /**
   * Create the main container for the template
   */
  private createMainContainer(template: Template, responsive: boolean): Container {
    const mainContainer = new Container() as LayoutContainer;
    
    // Adapt dimensions for responsiveness
    const { width, height } = responsive ? 
      this.getResponsiveDimensions() : 
      { width: this.canvasWidth, height: this.canvasHeight };

    mainContainer.layout = {
      width,
      height,
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      gap: 0,
      padding: 8,
    };

    mainContainer.label = `template-${template.id}`;
    return mainContainer;
  }

  /**
   * Calculate responsive dimensions
   */
  private getResponsiveDimensions(): { width: number; height: number } {
    const isPortrait = this.canvasHeight > this.canvasWidth;
    
    return {
      width: this.canvasWidth,
      height: this.canvasHeight,
      // Could add more responsive logic here
    };
  }

  /**
   * Add label to a block
   */
  private addBlockLabel(container: Container, block: any): void {
    // Block labels will be handled by BlockManager
    // This is a placeholder for future template-level labeling
  }

  /**
   * Apply theme styling to the template
   */
  private applyTheme(container: Container, theme: string): void {
    switch (theme) {
      case "modern":
        this.applyModernTheme(container);
        break;
      case "classic":
        this.applyClassicTheme(container);
        break;
      case "minimal":
        this.applyMinimalTheme(container);
        break;
    }
  }

  private applyModernTheme(container: Container): void {
    // Modern theme with rounded corners, shadows, etc.
    const layoutContainer = container as LayoutContainer;
    if (layoutContainer.layout) {
      layoutContainer.layout.borderRadius = 12;
      layoutContainer.layout.gap = 8;
    }
  }

  private applyClassicTheme(container: Container): void {
    // Classic theme with traditional styling
    const layoutContainer = container as LayoutContainer;
    if (layoutContainer.layout) {
      layoutContainer.layout.borderRadius = 4;
      layoutContainer.layout.gap = 6;
    }
  }

  private applyMinimalTheme(container: Container): void {
    // Minimal theme with clean lines
    const layoutContainer = container as LayoutContainer;
    if (layoutContainer.layout) {
      layoutContainer.layout.borderRadius = 0;
      layoutContainer.layout.gap = 2;
    }
  }

  /**
   * Enable debug mode to show layout boundaries
   */
  private enableDebugMode(container: Container): void {
    // Debug mode implementation
    console.log('🐛 Debug mode enabled');
    // This would add visual debugging aids
  }

  /**
   * Get the block manager instance
   */
  getBlockManager(): BlockManager {
    return this.blockManager;
  }
}
