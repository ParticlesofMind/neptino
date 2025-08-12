/**
 * Layout Renderer
 * Handles PixiJS rendering of layout structures
 * Focused on visual rendering only
 */

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { RenderedBlock, RenderedArea } from "./LayoutTypes";

export class LayoutRenderer {
  private layoutContainer: Container;

  constructor(layoutContainer: Container) {
    this.layoutContainer = layoutContainer;
  }

  /**
   * Render complete layout structure
   */
  renderLayoutStructure(
    renderedBlocks: RenderedBlock[],
    showLabels: boolean = true,
  ): void {
    // Clear previous rendering
    this.layoutContainer.removeChildren();

    console.log(
      `🎨 Rendering ${renderedBlocks.length} blocks with labels: ${showLabels}`,
    );

    // Render each block
    renderedBlocks.forEach((block) => {
      this.renderBlock(block, showLabels);
    });
  }

  /**
   * Render individual block
   */
  private renderBlock(block: RenderedBlock, showLabels: boolean): void {
    // Block background
    const blockGraphics = new Graphics();
    blockGraphics.rect(block.x, block.y, block.width, block.height);
    blockGraphics.fill({
      color: this.getBlockColor(block.blockId),
      alpha: 0.1,
    });
    blockGraphics.stroke({
      width: 2,
      color: this.getBlockColor(block.blockId),
      alpha: 0.8,
    });

    blockGraphics.label = `layout-block-${block.blockId}`;
    blockGraphics.interactive = false; // Prevent user interaction
    this.layoutContainer.addChild(blockGraphics);

    // Block label
    if (showLabels) {
      const blockLabel = new Text({
        text: this.getBlockDisplayName(block.blockId),
        style: new TextStyle({
          fontSize: 16,
          fill: this.getBlockColor(block.blockId),
          fontWeight: "bold",
          fontFamily: "Arial",
        }),
      });

      blockLabel.position.set(block.x + 10, block.y + 5);
      blockLabel.label = `layout-block-label-${block.blockId}`;
      blockLabel.interactive = false;
      this.layoutContainer.addChild(blockLabel);
    }

    // Render areas within the block
    block.areas.forEach((area) => {
      this.renderArea(area, showLabels);
    });
  }

  /**
   * Render individual area
   */
  private renderArea(area: RenderedArea, showLabels: boolean): void {
    // Area background
    const areaGraphics = new Graphics();
    areaGraphics.rect(area.x, area.y, area.width, area.height);
    areaGraphics.fill({ color: 0xffffff, alpha: 0.5 });
    areaGraphics.stroke({ width: 1, color: 0x999999, alpha: 0.4 });

    areaGraphics.label = `layout-area-${area.areaId}`;
    areaGraphics.interactive = false; // Prevent user interaction
    this.layoutContainer.addChild(areaGraphics);

    // Area label
    if (showLabels) {
      const areaLabel = new Text({
        text: this.getAreaDisplayName(area.areaId),
        style: new TextStyle({
          fontSize: 12,
          fill: 0x666666,
          fontFamily: "Arial",
        }),
      });

      areaLabel.position.set(area.x + 5, area.y + 5);
      areaLabel.label = `layout-area-label-${area.areaId}`;
      areaLabel.interactive = false;
      this.layoutContainer.addChild(areaLabel);
    }
  }

  /**
   * Get block color for visual distinction
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

  /**
   * Get block display name
   */
  private getBlockDisplayName(blockId: string): string {
    const names: Record<string, string> = {
      header: "Header",
      program: "Program",
      resources: "Resources",
      content: "Content",
      assignment: "Assignment",
      footer: "Footer",
    };
    return names[blockId] || blockId;
  }

  /**
   * Get area display name
   */
  private getAreaDisplayName(areaId: string): string {
    // Convert kebab-case to Title Case
    return areaId
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Clear all rendered content
   */
  clear(): void {
    this.layoutContainer.removeChildren();
  }

  /**
   * Update layout container
   */
  setLayoutContainer(container: Container): void {
    this.layoutContainer = container;
  }
}
