/**
 * TemplateLayoutManager - Yoga Layout Integration for Template Blocks
 * 
 * Responsibilities:
 * - Create and manage Header, Body, Footer template blocks
 * - Integrate with @pixi/layout (Yoga) for flexible positioning
 * - Handle dynamic sizing based on canvas dimensions and margins
 * - Provide visual debugging with color-coded blocks
 * - Connect to CanvasMarginManager for margin updates
 * 
 * Target: ~200 lines
 */

import { Container, Graphics, Text } from 'pixi.js';
import { canvasMarginManager } from './CanvasMarginManager';
import { canvasDimensionManager } from '../utils/CanvasDimensionManager';

export interface TemplateBlock {
  container: Container;
  graphics: Graphics;
  height: number;
}

export class TemplateLayoutManager {
  private layoutContainer: Container | null = null;
  private Yoga: any = null;
  private yogaRoot: any = null;
  private yogaNodes: {
    header: any;
    body: any;
    footer: any;
  } = {
    header: null,
    body: null,
    footer: null
  };
  private blocks: {
    header: TemplateBlock | null;
    body: TemplateBlock | null;
    footer: TemplateBlock | null;
  } = {
    header: null,
    body: null,
    footer: null
  };

  // Color scheme for visual debugging
  private readonly COLORS = {
    header: 0xCC6666,  // Desaturated red
    body: 0x66CC66,    // Desaturated green
    footer: 0x6666CC   // Desaturated blue
  };
  private readonly ALPHA = 0.3;

  /**
   * Initialize the template layout manager with a container
   */
  public async initialize(container: Container): Promise<void> {
    this.layoutContainer = container;
    
    // Add white background to the layout container to span the full canvas
    this.addWhiteBackground();
    
    // Load yoga-layout asynchronously
    try {
      const yogaModule = await import('yoga-layout');
      this.Yoga = yogaModule.default || yogaModule;
    } catch (error) {
      console.error('❌ Failed to load yoga-layout:', error);
      throw new Error('Could not load yoga-layout package');
    }
    
    this.setupYogaLayout();
    this.createLayoutBlocks();
    this.subscribeToMarginUpdates();
  }

  /**
   * Add white background to span the full canvas
   */
  private addWhiteBackground(): void {
    if (!this.layoutContainer) return;
    
    const background = new Graphics();
    background.label = 'canvas-background';
    
    // Create white background that spans the full canvas (1200x1800)
    background.rect(0, 0, 1200, 1800)
      .fill({ color: 0xffffff }); // White background
    
    // Add background as the first child (behind everything)
    this.layoutContainer.addChildAt(background, 0);
    
    console.log('✅ Added white background spanning full canvas (1200x1800)');
  }

  /**
   * Set up Yoga layout root with canvas dimensions
   */
  private setupYogaLayout(): void {
    if (!this.layoutContainer || !this.Yoga) {
      throw new Error('Layout container or Yoga not set');
    }

    // Use full canvas dimensions (1200x1800) instead of container dimensions
    const canvasWidth = 1200;
    const canvasHeight = 1800;
    
    // Create Yoga layout root
    this.yogaRoot = this.Yoga.Node.create();
    this.yogaRoot.setWidth(canvasWidth);
    this.yogaRoot.setHeight(canvasHeight);
    this.yogaRoot.setFlexDirection(this.Yoga.FLEX_DIRECTION_COLUMN);
    this.yogaRoot.setJustifyContent(this.Yoga.JUSTIFY_FLEX_START);
    this.yogaRoot.setAlignItems(this.Yoga.ALIGN_STRETCH);

    // Create child nodes
    this.yogaNodes.header = this.Yoga.Node.create();
    this.yogaNodes.body = this.Yoga.Node.create();
    this.yogaNodes.footer = this.Yoga.Node.create();

    // Add children to root
    this.yogaRoot.insertChild(this.yogaNodes.header, 0);
    this.yogaRoot.insertChild(this.yogaNodes.body, 1);
    this.yogaRoot.insertChild(this.yogaNodes.footer, 2);
  }

  /**
   * Create the three template blocks with Yoga layout
   */
  public createLayoutBlocks(): void {
    if (!this.layoutContainer || !this.yogaRoot) {
      throw new Error('Layout not initialized');
    }

    const margins = canvasMarginManager.getMargins();
    // Use full canvas dimensions (1200x1800)
    const canvasWidth = 1200;
    const canvasHeight = 1800;

    // Create Header Block
    this.blocks.header = this.createBlock('header', {
      width: canvasWidth,
      height: margins.top,
      backgroundColor: this.COLORS.header,
      alpha: this.ALPHA
    });

    // Create Body Block
    this.blocks.body = this.createBlock('body', {
      width: canvasWidth,
      height: canvasHeight - margins.top - margins.bottom,
      backgroundColor: this.COLORS.body,
      alpha: this.ALPHA
    });

    // Create Footer Block
    this.blocks.footer = this.createBlock('footer', {
      width: canvasWidth,
      height: margins.bottom,
      backgroundColor: this.COLORS.footer,
      alpha: this.ALPHA
    });

    // Configure Yoga layout properties
    this.configureYogaLayout();
    
    // Add blocks to layout container
    this.layoutContainer.addChild(this.blocks.header.container);
    this.layoutContainer.addChild(this.blocks.body.container);
    this.layoutContainer.addChild(this.blocks.footer.container);
  }

  /**
   * Create a template block with visual graphics
   */
  private createBlock(
    type: 'header' | 'body' | 'footer',
    config: { width: number; height: number; backgroundColor: number; alpha: number }
  ): TemplateBlock {
    const container = new Container();
    container.label = `template-${type}`;

    // Create visual graphics overlay that spans the full canvas width
    const graphics = new Graphics();
    graphics.label = `${type}-visual`;
    
    // Ensure the graphics span the full canvas width (1200px)
    const canvasWidth = 1200; // Full canvas width
    graphics.rect(0, 0, canvasWidth, config.height)
      .fill({ color: config.backgroundColor, alpha: config.alpha });

    container.addChild(graphics);

    return {
      container,
      graphics,
      height: config.height
    };
  }

  /**
   * Configure Yoga layout properties for each block
   */
  private configureYogaLayout(): void {
    if (!this.yogaRoot || !this.blocks.header || !this.blocks.body || !this.blocks.footer) {
      return;
    }

    // Use full canvas dimensions (1200x1800)
    const canvasWidth = 1200;
    const canvasHeight = 1800;

    // Configure Header: fixed height
    this.yogaNodes.header.setWidth(canvasWidth);
    this.yogaNodes.header.setHeight(this.blocks.header.height);
    this.yogaNodes.header.setFlexGrow(0);
    this.yogaNodes.header.setFlexShrink(0);

    // Configure Body: flexible height
    this.yogaNodes.body.setWidth(canvasWidth);
    this.yogaNodes.body.setFlexGrow(1);
    this.yogaNodes.body.setFlexShrink(1);

    // Configure Footer: fixed height
    this.yogaNodes.footer.setWidth(canvasWidth);
    this.yogaNodes.footer.setHeight(this.blocks.footer.height);
    this.yogaNodes.footer.setFlexGrow(0);
    this.yogaNodes.footer.setFlexShrink(0);

    // Calculate layout
    this.yogaRoot.calculateLayout();

    // Apply computed positions to containers
    this.applyLayoutPositions();
  }

  /**
   * Apply computed Yoga layout positions to containers
   */
  private applyLayoutPositions(): void {
    if (!this.blocks.header || !this.blocks.body || !this.blocks.footer) {
      return;
    }

    // Position Header
    this.blocks.header.container.x = this.yogaNodes.header.getComputedLeft();
    this.blocks.header.container.y = this.yogaNodes.header.getComputedTop();
    this.blocks.header.container.width = this.yogaNodes.header.getComputedWidth();
    this.blocks.header.container.height = this.yogaNodes.header.getComputedHeight();

    // Position Body
    this.blocks.body.container.x = this.yogaNodes.body.getComputedLeft();
    this.blocks.body.container.y = this.yogaNodes.body.getComputedTop();
    this.blocks.body.container.width = this.yogaNodes.body.getComputedWidth();
    this.blocks.body.container.height = this.yogaNodes.body.getComputedHeight();

    // Position Footer
    this.blocks.footer.container.x = this.yogaNodes.footer.getComputedLeft();
    this.blocks.footer.container.y = this.yogaNodes.footer.getComputedTop();
    this.blocks.footer.container.width = this.yogaNodes.footer.getComputedWidth();
    this.blocks.footer.container.height = this.yogaNodes.footer.getComputedHeight();
  }

  /**
   * Update block sizes when margins change
   */
  public updateBlockSizes(): void {
    if (!this.blocks.header || !this.blocks.body || !this.blocks.footer) {
      return;
    }

    const margins = canvasMarginManager.getMargins();
    // Use full canvas dimensions (1200x1800)
    const canvasWidth = 1200;
    const canvasHeight = 1800;

    // Update Header height
    this.blocks.header.height = margins.top;
    this.blocks.header.graphics.clear();
    this.blocks.header.graphics.rect(0, 0, canvasWidth, margins.top)
      .fill({ color: this.COLORS.header, alpha: this.ALPHA });

    // Update Body height
    const bodyHeight = canvasHeight - margins.top - margins.bottom;
    this.blocks.body.height = bodyHeight;
    this.blocks.body.graphics.clear();
    this.blocks.body.graphics.rect(0, 0, canvasWidth, bodyHeight)
      .fill({ color: this.COLORS.body, alpha: this.ALPHA });

    // Update Footer height
    this.blocks.footer.height = margins.bottom;
    this.blocks.footer.graphics.clear();
    this.blocks.footer.graphics.rect(0, 0, canvasWidth, margins.bottom)
      .fill({ color: this.COLORS.footer, alpha: this.ALPHA });

    // Update Yoga layout properties
    this.configureYogaLayout();
  }

  /**
   * Subscribe to margin updates from CanvasMarginManager
   */
  private subscribeToMarginUpdates(): void {
    // Note: CanvasMarginManager doesn't currently have event system
    // For now, we'll update manually when needed
    // TODO: Add event system to CanvasMarginManager for automatic updates
  }

  /**
   * Handle canvas resize events
   */
  public handleCanvasResize(): void {
    if (!this.yogaRoot) {
      return;
    }

    // Use full canvas dimensions (1200x1800)
    const canvasWidth = 1200;
    const canvasHeight = 1800;
    
    // Update Yoga layout dimensions
    this.yogaRoot.setWidth(canvasWidth);
    this.yogaRoot.setHeight(canvasHeight);

    // Update block sizes
    this.updateBlockSizes();
  }

  /**
   * Get Header block container
   */
  public getHeaderBlock(): Container | null {
    return this.blocks.header?.container || null;
  }

  /**
   * Get Body block container
   */
  public getBodyBlock(): Container | null {
    return this.blocks.body?.container || null;
  }

  /**
   * Get Footer block container
   */
  public getFooterBlock(): Container | null {
    return this.blocks.footer?.container || null;
  }

  /**
   * Get all template blocks
   */
  public getAllBlocks(): { header: Container | null; body: Container | null; footer: Container | null } {
    return {
      header: this.getHeaderBlock(),
      body: this.getBodyBlock(),
      footer: this.getFooterBlock()
    };
  }

  /**
   * Get debug information about template blocks
   */
  public getDebugInfo(): any {
    return {
      initialized: !!this.layoutContainer && !!this.yogaRoot,
      blocks: {
        header: {
          exists: !!this.blocks.header,
          height: this.blocks.header?.height || 0,
          children: this.blocks.header?.container.children.length || 0
        },
        body: {
          exists: !!this.blocks.body,
          height: this.blocks.body?.height || 0,
          children: this.blocks.body?.container.children.length || 0
        },
        footer: {
          exists: !!this.blocks.footer,
          height: this.blocks.footer?.height || 0,
          children: this.blocks.footer?.container.children.length || 0
        }
      },
      yogaLayout: {
        exists: !!this.yogaRoot,
        width: this.yogaRoot?.getComputedWidth() || 0,
        height: this.yogaRoot?.getComputedHeight() || 0
      }
    };
  }

  /**
   * Populate header with dynamic content
   */
  public populateHeaderContent(content: {
    pageNumber?: number;
    lessonNumber?: number;
    courseTitle?: string;
  }): void {
    if (!this.blocks.header) return;

    // Clear existing text content
    this.clearTextContent(this.blocks.header.container);

    const headerBlock = this.blocks.header.container;
    const margins = canvasMarginManager.getMargins();
    // Use full canvas dimensions (1200x1800)
    const canvasWidth = 1200;

    // Create page number text
    if (content.pageNumber !== undefined) {
      const pageText = new Text({
        text: `Page ${content.pageNumber}`,
        style: {
          fontFamily: 'Arial',
          fontSize: 14,
          fill: 0x333333,
          fontWeight: 'bold'
        }
      });
      pageText.x = 20;
      pageText.y = margins.top / 2 - pageText.height / 2;
      headerBlock.addChild(pageText);
    }

    // Create lesson number text
    if (content.lessonNumber !== undefined) {
      const lessonText = new Text({
        text: `Lesson ${content.lessonNumber}`,
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0x666666
        }
      });
      lessonText.x = 20;
      lessonText.y = margins.top / 2 + lessonText.height / 2;
      headerBlock.addChild(lessonText);
    }

    // Create course title text (right-aligned)
    if (content.courseTitle) {
      const titleText = new Text({
        text: content.courseTitle,
        style: {
          fontFamily: 'Arial',
          fontSize: 16,
          fill: 0x333333,
          fontWeight: 'bold'
        }
      });
      titleText.x = canvasWidth - titleText.width - 20;
      titleText.y = margins.top / 2 - titleText.height / 2;
      headerBlock.addChild(titleText);
    }
  }

  /**
   * Populate footer with dynamic content
   */
  public populateFooterContent(content: {
    teacherName?: string;
    creationDate?: string;
    courseCode?: string;
  }): void {
    if (!this.blocks.footer) return;

    // Clear existing text content
    this.clearTextContent(this.blocks.footer.container);

    const footerBlock = this.blocks.footer.container;
    const margins = canvasMarginManager.getMargins();
    // Use full canvas dimensions (1200x1800)
    const canvasWidth = 1200;

    // Create teacher name text
    if (content.teacherName) {
      const teacherText = new Text({
        text: content.teacherName,
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0x333333
        }
      });
      teacherText.x = 20;
      teacherText.y = margins.bottom / 2 - teacherText.height / 2;
      footerBlock.addChild(teacherText);
    }

    // Create creation date text
    if (content.creationDate) {
      const dateText = new Text({
        text: content.creationDate,
        style: {
          fontFamily: 'Arial',
          fontSize: 10,
          fill: 0x666666
        }
      });
      dateText.x = 20;
      dateText.y = margins.bottom / 2 + dateText.height / 2;
      footerBlock.addChild(dateText);
    }

    // Create course code text (right-aligned)
    if (content.courseCode) {
      const codeText = new Text({
        text: content.courseCode,
        style: {
          fontFamily: 'Arial',
          fontSize: 12,
          fill: 0x666666
        }
      });
      codeText.x = canvasWidth - codeText.width - 20;
      codeText.y = margins.bottom / 2 - codeText.height / 2;
      footerBlock.addChild(codeText);
    }
  }

  /**
   * Clear text content from a container
   */
  private clearTextContent(container: Container): void {
    // Remove all text objects (keep graphics)
    const textObjects = container.children.filter(child => child instanceof Text);
    textObjects.forEach(text => container.removeChild(text));
  }

  /**
   * Destroy the template layout manager
   */
  public destroy(): void {
    // Clean up blocks
    Object.values(this.blocks).forEach(block => {
      if (block) {
        block.container.destroy({ children: true });
      }
    });

    // Clean up Yoga nodes
    if (this.yogaNodes.header) {
      this.yogaNodes.header.free();
    }
    if (this.yogaNodes.body) {
      this.yogaNodes.body.free();
    }
    if (this.yogaNodes.footer) {
      this.yogaNodes.footer.free();
    }
    if (this.yogaRoot) {
      this.yogaRoot.free();
    }

    // Reset state
    this.layoutContainer = null;
    this.yogaRoot = null;
    this.yogaNodes = { header: null, body: null, footer: null };
    this.blocks = { header: null, body: null, footer: null };
  }
}
