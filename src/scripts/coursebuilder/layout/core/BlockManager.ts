/**
 * Block Manager
 * Manages any block type with rows/columns
 */

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { 
  Block, 
  BaseBlockConfig, 
  BlockRow, 
  BlockArea, 
  IBlockManager,
  LayoutContainer,
  LayoutProperties 
} from "./LayoutTypes";

export class BlockManager implements IBlockManager {
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number = 794, canvasHeight: number = 1123) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Create a generic block with row/column structure
   */
  createBlock(config: BaseBlockConfig): Block {
    return {
      ...config,
      rows: [], // Will be populated by specific block implementations
    };
  }

  /**
   * Render a block with its rows and areas
   */
  renderBlock(block: Block, parentContainer: Container): Container {
    const blockContainer = new Container() as LayoutContainer;
    
    // Calculate actual pixel dimensions
    const blockHeight = (this.canvasHeight * block.heightPercentage) / 100;
    const blockWidth = this.canvasWidth;
    
    // Apply block-level layout
    blockContainer.layout = {
      width: "100%",
      height: `${block.heightPercentage}%`,
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      gap: block.styles?.gap || 5,
      padding: block.styles?.padding || 10,
      backgroundColor: this.getBlockColor(block.type),
      borderRadius: block.styles?.borderRadius || 8,
      ...block.styles,
    };

    blockContainer.label = `block-${block.id}`;

    // Add visible background rectangle for the block
    this.addBlockBackground(blockContainer, block, blockWidth, blockHeight);

    // Add block title
    this.addBlockTitle(blockContainer, block);

    // Render each row
    let yOffset = 30; // Start with more padding to account for title
    block.rows.forEach((row) => {
      const rowHeight = block.rows.length > 1 ? (blockHeight - 20) / block.rows.length : blockHeight - 20;
      const rowContainer = this.renderRow(row, block, blockWidth - 20, rowHeight); 
      rowContainer.y = yOffset;
      yOffset += rowHeight + 5; // Add some gap between rows
      blockContainer.addChild(rowContainer);
    });

    return blockContainer;
  }

  /**
   * Update block configuration
   */
  updateBlock(block: Block, config: Partial<BaseBlockConfig>): Block {
    return {
      ...block,
      ...config,
      styles: { ...block.styles, ...config.styles },
    };
  }

  /**
   * Render a row within a block
   */
  private renderRow(row: BlockRow, parentBlock: Block, width: number, height: number): Container {
    const rowContainer = new Container() as LayoutContainer;
    
    // Row layout - horizontal by default
    rowContainer.layout = {
      width: "100%",
      height: row.heightPercentage ? `${row.heightPercentage}%` : undefined,
      flex: row.heightPercentage ? undefined : 1, // Take available space if no specific height
      flexDirection: "row",
      justifyContent: "flex-start", 
      alignItems: "stretch",
      gap: 8,
    };

    rowContainer.label = `row-${row.id}`;

    // Add row background for visibility
    const rowBackground = new Graphics();
    rowBackground.rect(0, 0, width, height);
    rowBackground.fill({ color: this.getRowColor(parentBlock.type), alpha: 0.3 });
    rowBackground.stroke({ width: 1, color: this.getRowBorderColor(parentBlock.type), alpha: 0.5 });
    rowContainer.addChildAt(rowBackground, 0);

    // Render each area in the row
    let xOffset = 8; // Start with gap
    const areaWidth = (width - (row.areas.length + 1) * 8) / row.areas.length; // Equal width for now
    row.areas.forEach((area) => {
      const areaContainer = this.renderArea(area, areaWidth, height - 16);
      areaContainer.x = xOffset;
      areaContainer.y = 8;
      xOffset += areaWidth + 8;
      rowContainer.addChild(areaContainer);
    });

    return rowContainer;
  }

  /**
   * Render an area within a row
   */
  private renderArea(area: BlockArea, width: number, height: number): Container {
    const areaContainer = new Container() as LayoutContainer;
    
    // Area layout
    areaContainer.layout = {
      flex: area.flex || 1, // Equal sizing by default
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      padding: 8,
      gap: 4,
      backgroundColor: this.getAreaColor(area.type || 'text'),
      borderRadius: 4,
    };

    areaContainer.label = `area-${area.id}`;
    areaContainer.interactive = area.allowsDrawing;

    // Add area background
    const areaBackground = new Graphics();
    areaBackground.rect(0, 0, width, height);
    areaBackground.fill({ color: this.getAreaColor(area.type || 'text'), alpha: 0.6 });
    areaBackground.stroke({ width: 1, color: this.getAreaBorderColor(area.type || 'text'), alpha: 0.8 });
    areaContainer.addChildAt(areaBackground, 0);

    // Add capability indicators
    this.addAreaIndicators(areaContainer, area);

    // Add area label
    this.addAreaLabel(areaContainer, area);

    return areaContainer;
  }

  /**
   * Add visible background rectangle for the block
   */
  private addBlockBackground(container: Container, block: Block, width: number, height: number): void {
    const background = new Graphics();
    background.rect(0, 0, width, height);
    background.fill({ color: this.getBlockColor(block.type), alpha: 0.4 });
    background.stroke({ 
      width: 2, 
      color: this.getBlockBorderColor(block.type), 
      alpha: 0.8 
    });
    background.label = `background-${block.id}`;
    container.addChildAt(background, 0);
  }

  /**
   * Add block title at the top of the block
   */
  private addBlockTitle(container: Container, block: Block): void {
    const title = new Text({
      text: block.name,
      style: new TextStyle({
        fontSize: 16,
        fill: 0xffffff,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'bold',
        align: 'center',
      }),
    });

    title.x = 10;
    title.y = 8;
    title.label = `title-${block.id}`;
    container.addChild(title);
  }

  /**
   * Add visual indicators for area capabilities
   */
  private addAreaIndicators(container: Container, area: BlockArea): void {
    const indicators = new Graphics();
    let xOffset = 4;

    // Drawing indicator
    if (area.allowsDrawing) {
      indicators.circle(xOffset, 6, 3);
      indicators.fill({ color: 0x00ff00, alpha: 0.7 });
      xOffset += 10;
    }

    // Media indicator  
    if (area.allowsMedia) {
      indicators.rect(xOffset, 3, 6, 6);
      indicators.fill({ color: 0x0080ff, alpha: 0.7 });
      xOffset += 10;
    }

    // Text indicator
    if (area.allowsText) {
      indicators.rect(xOffset, 5, 8, 2);
      indicators.fill({ color: 0xff8000, alpha: 0.7 });
    }

    indicators.label = `indicators-${area.id}`;
    container.addChild(indicators);
  }

  /**
   * Add text label to area
   */
  private addAreaLabel(container: Container, area: BlockArea): void {
    const label = new Text({
      text: area.name,
      style: new TextStyle({
        fontSize: 10,
        fill: 0x666666,
        fontFamily: 'Arial, sans-serif',
        wordWrap: true,
        wordWrapWidth: 150,
      }),
    });

    label.label = `label-${area.id}`;
    container.addChild(label);
  }

  /**
   * Color scheme for different block types
   */
  private getBlockColor(blockType: string): number {
    const colors: Record<string, number> = {
      header: 0x4a90e2,    // Blue
      program: 0x7ed321,   // Green  
      content: 0xd0021b,   // Red
      resources: 0xf5a623, // Orange
      assessment: 0x9013fe, // Purple
      footer: 0x50e3c2,    // Teal
    };
    return colors[blockType] || 0x999999;
  }

  private getBlockBorderColor(blockType: string): number {
    const baseColor = this.getBlockColor(blockType);
    return Math.max(0, baseColor - 0x202020);
  }

  private getRowColor(blockType: string): number {
    // Lighter version of block color
    const baseColor = this.getBlockColor(blockType);
    return Math.min(0xffffff, baseColor + 0x404040);
  }

  private getRowBorderColor(blockType: string): number {
    return this.getBlockBorderColor(blockType);
  }

  private getAreaColor(areaType: string): number {
    const colors: Record<string, number> = {
      instruction: 0xe8f4fd, // Light blue
      student: 0xfff4e6,    // Light orange  
      teacher: 0xf0f9ff,    // Very light blue
      media: 0xf5f0ff,      // Light purple
      text: 0xf9f9f9,       // Light gray
    };
    return colors[areaType] || 0xf5f5f5;
  }

  private getAreaBorderColor(areaType: string): number {
    const baseColor = this.getAreaColor(areaType);
    return Math.max(0, baseColor - 0x303030);
  }

  /**
   * Update canvas dimensions
   */
  updateDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
