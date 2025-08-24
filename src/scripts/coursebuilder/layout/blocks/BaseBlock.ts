/**
 * Base Block
 * Generic block with rows/columns support
 */

import { Container } from "pixi.js";
import type { 
  Block, 
  BaseBlockConfig, 
  BlockRow, 
  BlockArea,
  LayoutContainer 
} from "../core/LayoutTypes";

export abstract class BaseBlock {
  protected config: BaseBlockConfig;
  protected rows: BlockRow[] = [];

  constructor(config: BaseBlockConfig) {
    this.config = config;
  }

  /**
   * Get block configuration
   */
  getConfig(): BaseBlockConfig {
    return this.config;
  }

  /**
   * Update block configuration
   */
  updateConfig(updates: Partial<BaseBlockConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      styles: { ...this.config.styles, ...updates.styles },
    };
  }

  /**
   * Get all rows
   */
  getRows(): BlockRow[] {
    return this.rows;
  }

  /**
   * Add a row to the block
   */
  addRow(row: BlockRow): void {
    this.rows.push(row);
  }

  /**
   * Remove a row from the block
   */
  removeRow(rowId: string): void {
    this.rows = this.rows.filter(row => row.id !== rowId);
  }

  /**
   * Get a specific row
   */
  getRow(rowId: string): BlockRow | undefined {
    return this.rows.find(row => row.id === rowId);
  }

  /**
   * Add an area to a specific row
   */
  addAreaToRow(rowId: string, area: BlockArea): void {
    const row = this.getRow(rowId);
    if (row) {
      row.areas.push(area);
    }
  }

  /**
   * Remove an area from a row
   */
  removeAreaFromRow(rowId: string, areaId: string): void {
    const row = this.getRow(rowId);
    if (row) {
      row.areas = row.areas.filter(area => area.id !== areaId);
    }
  }

  /**
   * Convert to full Block interface
   */
  toBlock(): Block {
    return {
      ...this.config,
      rows: this.rows,
    };
  }

  /**
   * Create a basic container for this block
   */
  createContainer(): Container {
    const container = new Container() as LayoutContainer;
    
    container.layout = {
      width: "100%",
      height: `${this.config.heightPercentage}%`,
      flexDirection: "column",
      justifyContent: "flex-start",
      alignItems: "stretch",
      gap: 5,
      padding: 10,
      backgroundColor: this.getBlockColor(),
      ...this.config.styles,
    };

    container.label = `block-${this.config.id}`;
    return container;
  }

  /**
   * Get block color based on type
   */
  protected getBlockColor(): number {
    const colors: Record<string, number> = {
      header: 0x4a90e2,
      program: 0x7ed321,
      content: 0xd0021b,
      resources: 0xf5a623,
      assessment: 0x9013fe,
      footer: 0x50e3c2,
    };
    return colors[this.config.type] || 0x999999;
  }

  /**
   * Abstract method for block-specific rendering logic
   */
  abstract render(parentContainer: Container): Container;
}
