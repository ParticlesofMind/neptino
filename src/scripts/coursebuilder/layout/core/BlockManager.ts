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

    // Add background if required
    if (block.isRequired) {
      this.addBlockBackground(blockContainer, block);
    }

    // Render each row
    block.rows.forEach((row, rowIndex) => {
      const rowContainer = this.renderRow(row, block);
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
  private renderRow(row: BlockRow, parentBlock: Block): Container {
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

    // Render each area in the row
    row.areas.forEach((area) => {
      const areaContainer = this.renderArea(area);
      rowContainer.addChild(areaContainer);
    });

    return rowContainer;
  }

  /**
   * Render an area within a row
   */
  private renderArea(area: BlockArea): Container {
    const areaContainer = new Container() as LayoutContainer;
    
    // Area layout
    areaContainer.layout = {
      flex: area.flex || 1, // Equal sizing by default
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      padding: 8,
      gap: 4,
      backgroundColor: this.getAreaColor(area.type),
      borderRadius: 4,
    };

    areaContainer.label = `area-${area.id}`;
    areaContainer.interactive = area.allowsDrawing;

    // Add capability indicators
    this.addAreaIndicators(areaContainer, area);

    // Add area label
    this.addAreaLabel(areaContainer, area);

    return areaContainer;
  }

  /**
   * Add visual background to blocks
   */
  private addBlockBackground(container: Container, block: Block): void {
    const background = new Graphics();
    background.rect(0, 0, 100, 100); // Will be sized by layout
    background.stroke({ 
      width: 2, 
      color: this.getBlockBorderColor(block.type), 
      alpha: 0.8 
    });
    background.label = `background-${block.id}`;
    container.addChildAt(background, 0);
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
      header: 0x4a90e2,
      program: 0x7ed321,
      content: 0xd0021b,
      resources: 0xf5a623,
      assessment: 0x9013fe,
      footer: 0x50e3c2,
    };
    return colors[blockType] || 0x999999;
  }

  private getBlockBorderColor(blockType: string): number {
    const baseColor = this.getBlockColor(blockType);
    return Math.max(0, baseColor - 0x202020);
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

  /**
   * Update canvas dimensions
   */
  updateDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }
}
