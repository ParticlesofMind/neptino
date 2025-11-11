/**
 * CanvasLayoutRenderer - Renders the three-block layout system
 * Creates Header, Body, and Footer blocks based on margin configuration
 */

import { Container, Graphics, Text } from "pixi.js";
import type { CanvasMarginState } from "./CanvasMarginManager";

export interface LayoutConfig {
  width: number;
  height: number;
  margins: CanvasMarginState;
}

export interface LayoutBlocks {
  header: Container;
  body: Container;
  footer: Container;
}

export class CanvasLayoutRenderer {
  private config: LayoutConfig;
  private blocks: LayoutBlocks | null = null;

  constructor(config: LayoutConfig) {
    this.config = config;
  }

  /**
   * Update the layout configuration
   */
  public updateConfig(config: Partial<LayoutConfig>): void {
    this.config = { ...this.config, ...config };

     if (this.blocks) {
       const { width, height, margins } = this.config;
       this.updateHeaderBlock(this.blocks.header, width, margins);
       this.updateBodyBlock(this.blocks.body, width, height, margins);
       this.updateFooterBlock(this.blocks.footer, width, height, margins);
     }
  }

  /**
   * Create and return the layout blocks
   */
  public createLayout(): LayoutBlocks {
    const { width, height, margins } = this.config;

    // Create header block
    const header = this.createHeaderBlock(width, margins);

    // Create body block
    const body = this.createBodyBlock(width, height, margins);

    // Create footer block
    const footer = this.createFooterBlock(width, height, margins);

    this.blocks = { header, body, footer };
    return this.blocks;
  }

  /**
   * Get the current layout blocks (or create them if they don't exist)
   */
  public getBlocks(): LayoutBlocks {
    if (!this.blocks) {
      return this.createLayout();
    }
    return this.blocks;
  }

  /**
   * Update margins and recalculate layout
   */
  public updateMargins(margins: CanvasMarginState): void {
    this.config.margins = margins;

    if (this.blocks) {
      const { width, height } = this.config;
      this.updateHeaderBlock(this.blocks.header, width, margins);
      this.updateBodyBlock(this.blocks.body, width, height, margins);
      this.updateFooterBlock(this.blocks.footer, width, height, margins);
    }
  }

  /**
   * Destroy layout blocks and clean up
   */
  public destroy(): void {
    if (this.blocks) {
      this.blocks.header.destroy({ children: true });
      this.blocks.body.destroy({ children: true });
      this.blocks.footer.destroy({ children: true });
      this.blocks = null;
    }
  }

  // ============================
  // Private Methods
  // ============================

  private createHeaderBlock(canvasWidth: number, margins: CanvasMarginState): Container {
    const header = new Container();
    header.label = "layout-header";
    header.eventMode = "none";
    header.interactiveChildren = false;

    // Header occupies the top margin area
    header.x = margins.left;
    header.y = 0;

    const headerWidth = canvasWidth - margins.left - margins.right;
    const headerHeight = margins.top;

    // Add background for visual debugging
    const bg = new Graphics();
    bg.rect(0, 0, headerWidth, headerHeight);
    bg.fill({ color: 0xf0f4f8, alpha: 0.3 });
    header.addChild(bg);

    // Add label
    const label = new Text({
      text: "HEADER",
      style: {
        fontSize: 12,
        fill: 0x64748b,
        fontWeight: "500",
      },
    });
    label.anchor.set(0.5);
    label.position.set(headerWidth / 2, headerHeight / 2);
    header.addChild(label);

    return header;
  }

  private createBodyBlock(
    canvasWidth: number,
    canvasHeight: number,
    margins: CanvasMarginState
  ): Container {
    const body = new Container();
    body.label = "layout-body";
    body.eventMode = "none";
    body.interactiveChildren = false;

    // Body occupies the space between header and footer
    body.x = margins.left;
    body.y = margins.top;

    const bodyWidth = canvasWidth - margins.left - margins.right;
    const bodyHeight = canvasHeight - margins.top - margins.bottom;

    // Add background for visual debugging
    const bg = new Graphics();
    bg.rect(0, 0, bodyWidth, bodyHeight);
    bg.fill({ color: 0xffffff, alpha: 0.5 });
    bg.stroke({ color: 0xe2e8f0, width: 1 });
    body.addChild(bg);

    // Add label
    const label = new Text({
      text: "BODY",
      style: {
        fontSize: 12,
        fill: 0x64748b,
        fontWeight: "500",
      },
    });
    label.anchor.set(0.5);
    label.position.set(bodyWidth / 2, bodyHeight / 2);
    body.addChild(label);

    return body;
  }

  private createFooterBlock(
    canvasWidth: number,
    canvasHeight: number,
    margins: CanvasMarginState
  ): Container {
    const footer = new Container();
    footer.label = "layout-footer";
    footer.eventMode = "none";
    footer.interactiveChildren = false;

    // Footer occupies the bottom margin area
    footer.x = margins.left;
    footer.y = canvasHeight - margins.bottom;

    const footerWidth = canvasWidth - margins.left - margins.right;
    const footerHeight = margins.bottom;

    // Add background for visual debugging
    const bg = new Graphics();
    bg.rect(0, 0, footerWidth, footerHeight);
    bg.fill({ color: 0xf0f4f8, alpha: 0.3 });
    footer.addChild(bg);

    // Add label
    const label = new Text({
      text: "FOOTER",
      style: {
        fontSize: 12,
        fill: 0x64748b,
        fontWeight: "500",
      },
    });
    label.anchor.set(0.5);
    label.position.set(footerWidth / 2, footerHeight / 2);
    footer.addChild(label);

    return footer;
  }

  // Update methods for existing blocks

  private updateHeaderBlock(
    header: Container,
    canvasWidth: number,
    margins: CanvasMarginState
  ): void {
    header.x = margins.left;
    header.y = 0;

    const headerWidth = canvasWidth - margins.left - margins.right;
    const headerHeight = margins.top;

    // Update background and label
    const bg = header.children[0] as Graphics;
    const label = header.children[1] as Text;

    bg.clear();
    bg.rect(0, 0, headerWidth, headerHeight);
    bg.fill({ color: 0xf0f4f8, alpha: 0.3 });

    label.position.set(headerWidth / 2, headerHeight / 2);
  }

  private updateBodyBlock(
    body: Container,
    canvasWidth: number,
    canvasHeight: number,
    margins: CanvasMarginState
  ): void {
    body.x = margins.left;
    body.y = margins.top;

    const bodyWidth = canvasWidth - margins.left - margins.right;
    const bodyHeight = canvasHeight - margins.top - margins.bottom;

    // Update background and label
    const bg = body.children[0] as Graphics;
    const label = body.children[1] as Text;

    bg.clear();
    bg.rect(0, 0, bodyWidth, bodyHeight);
    bg.fill({ color: 0xffffff, alpha: 0.5 });
    bg.stroke({ color: 0xe2e8f0, width: 1 });

    label.position.set(bodyWidth / 2, bodyHeight / 2);
  }

  private updateFooterBlock(
    footer: Container,
    canvasWidth: number,
    canvasHeight: number,
    margins: CanvasMarginState
  ): void {
    footer.x = margins.left;
    footer.y = canvasHeight - margins.bottom;

    const footerWidth = canvasWidth - margins.left - margins.right;
    const footerHeight = margins.bottom;

    // Update background and label
    const bg = footer.children[0] as Graphics;
    const label = footer.children[1] as Text;

    bg.clear();
    bg.rect(0, 0, footerWidth, footerHeight);
    bg.fill({ color: 0xf0f4f8, alpha: 0.3 });

    label.position.set(footerWidth / 2, footerHeight / 2);
  }
}
