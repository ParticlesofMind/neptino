/**
 * PageContainer - Individual page with header/body/footer layout
 * Handles rendering metadata in header/footer and managing body content
 */

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { PageMetadata } from "./PageMetadata";
import { formatDate, formatDuration } from "./PageMetadata";

const BASE_WIDTH = 1200;
const BASE_HEIGHT = 1800;

interface PageContainerConfig {
  width?: number;
  height?: number;
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showDebugBorders?: boolean;
}

export class PageContainer extends Container {
  private config: PageContainerConfig;
  private metadata: PageMetadata;
  
  private headerContainer: Container;
  private bodyContainer: Container;
  private footerContainer: Container;

  private headerBg: Graphics;
  private bodyBg: Graphics;
  private footerBg: Graphics;

  constructor(metadata: PageMetadata, config: PageContainerConfig) {
    super();
    
    this.config = {
      width: config.width ?? BASE_WIDTH,
      height: config.height ?? BASE_HEIGHT,
      margins: config.margins,
      showDebugBorders: config.showDebugBorders ?? false,
    };
    
    this.metadata = metadata;
    this.label = `page-${metadata.pageNumber}`;

    // Create containers
    this.headerContainer = new Container();
    this.headerContainer.label = "header";
    
    this.bodyContainer = new Container();
    this.bodyContainer.label = "body";
    
    this.footerContainer = new Container();
    this.footerContainer.label = "footer";

    // Create backgrounds
    this.headerBg = new Graphics();
    this.bodyBg = new Graphics();
    this.footerBg = new Graphics();

    // Build the layout
    this.buildLayout();
    
    // Populate with metadata
    this.populateHeader();
    this.populateFooter();
    this.populateBody();

    // Add containers to stage
    this.addChild(this.headerContainer);
    this.addChild(this.bodyContainer);
    this.addChild(this.footerContainer);
  }

  /**
   * Get the body container for adding custom content
   */
  public getBody(): Container {
    return this.bodyContainer;
  }

  /**
   * Get the header container
   */
  public getHeader(): Container {
    return this.headerContainer;
  }

  /**
   * Get the footer container
   */
  public getFooter(): Container {
    return this.footerContainer;
  }

  /**
   * Get page metadata
   */
  public getMetadata(): PageMetadata {
    return this.metadata;
  }

  /**
   * Update metadata and re-render header/footer
   */
  public updateMetadata(metadata: PageMetadata): void {
    this.metadata = metadata;
    this.clearHeader();
    this.clearFooter();
    this.populateHeader();
    this.populateFooter();
  }

  /**
   * Build the layout structure
   */
  private buildLayout(): void {
    const { width = BASE_WIDTH, height = BASE_HEIGHT, margins } = this.config;
    
    // Calculate dimensions
    const headerWidth = width - margins.left - margins.right;
    const bodyWidth = width - margins.left - margins.right;
    const bodyHeight = height - margins.top - margins.bottom;
    const footerWidth = width - margins.left - margins.right;
    const footerHeight = margins.bottom;

    // Position containers
    this.headerContainer.x = margins.left;
    this.headerContainer.y = 0;

    this.bodyContainer.x = margins.left;
    this.bodyContainer.y = margins.top;

    this.footerContainer.x = margins.left;
    this.footerContainer.y = height - margins.bottom;

    // Draw backgrounds
    const headerHeight = margins.top;
    this.headerBg.clear();
    this.headerBg.rect(0, 0, headerWidth, headerHeight);
    this.headerBg.fill({ color: 0xf8fafc, alpha: 1 });
    if (this.config.showDebugBorders) {
      this.headerBg.stroke({ color: 0xe2e8f0, width: 1 });
    }

    this.bodyBg.clear();
    this.bodyBg.rect(0, 0, bodyWidth, bodyHeight);
    this.bodyBg.fill({ color: 0xffffff, alpha: 1 });
    if (this.config.showDebugBorders) {
      this.bodyBg.stroke({ color: 0xcbd5e1, width: 2 });
    }

    this.footerBg.clear();
    this.footerBg.rect(0, 0, footerWidth, footerHeight);
    this.footerBg.fill({ color: 0xf8fafc, alpha: 1 });
    if (this.config.showDebugBorders) {
      this.footerBg.stroke({ color: 0xe2e8f0, width: 1 });
    }

    // Add backgrounds
    this.headerContainer.addChild(this.headerBg);
    this.bodyContainer.addChild(this.bodyBg);
    this.footerContainer.addChild(this.footerBg);
  }

  /**
   * Populate header with metadata
   */
  private populateHeader(): void {
    const { width = BASE_WIDTH, margins } = this.config;
    const headerWidth = width - margins.left - margins.right;

    // Course info (left side)
    const courseStyle = new TextStyle({
      fontSize: 14,
      fontWeight: "700",
      fill: 0x1e293b,
    });
    
    const courseText = new Text({
      text: `${this.metadata.courseCode}: ${this.metadata.courseName}`,
      style: courseStyle,
    });
    courseText.x = 20;
    courseText.y = 16;
    this.headerContainer.addChild(courseText);

    // Lesson info (left side, second line)
    const lessonStyle = new TextStyle({
      fontSize: 12,
      fontWeight: "600",
      fill: 0x475569,
    });
    
    const lessonText = new Text({
      text: `Lesson ${this.metadata.lessonNumber}: ${this.metadata.lessonTitle}`,
      style: lessonStyle,
    });
    lessonText.x = 20;
    lessonText.y = 38;
    this.headerContainer.addChild(lessonText);

    // Date (right side)
    const dateStyle = new TextStyle({
      fontSize: 12,
      fontWeight: "600",
      fill: 0x64748b,
    });
    
    const dateText = new Text({
      text: formatDate(this.metadata.date),
      style: dateStyle,
    });
    dateText.anchor.set(1, 0);
    dateText.x = headerWidth - 20;
    dateText.y = 16;
    this.headerContainer.addChild(dateText);

    // Method & Social Form (right side, second line)
    const methodStyle = new TextStyle({
      fontSize: 11,
      fontWeight: "500",
      fill: 0x64748b,
    });
    
    const methodText = new Text({
      text: `${this.metadata.method} · ${this.metadata.socialForm}`,
      style: methodStyle,
    });
    methodText.anchor.set(1, 0);
    methodText.x = headerWidth - 20;
    methodText.y = 38;
    this.headerContainer.addChild(methodText);

    // Duration badge (top right corner)
    const badgeX = headerWidth - 20;
    const badgeY = 60;
    const badgePadding = 8;
    
    const durationText = new Text({
      text: formatDuration(this.metadata.duration),
      style: new TextStyle({
        fontSize: 10,
        fontWeight: "600",
        fill: 0xffffff,
      }),
    });
    
    const badgeWidth = durationText.width + badgePadding * 2;
    const badgeHeight = durationText.height + badgePadding;
    
    const badge = new Graphics();
    badge.roundRect(-badgeWidth, 0, badgeWidth, badgeHeight, 4);
    badge.fill({ color: 0x3b82f6, alpha: 1 });
    badge.x = badgeX;
    badge.y = badgeY;
    
    durationText.anchor.set(0.5);
    durationText.x = -badgeWidth / 2;
    durationText.y = badgeHeight / 2;
    badge.addChild(durationText);
    
    this.headerContainer.addChild(badge);
  }

  /**
   * Populate footer with metadata
   */
  private populateFooter(): void {
    const { width = BASE_WIDTH, margins } = this.config;
    const footerWidth = width - margins.left - margins.right;
    const footerHeight = margins.bottom;

    // Page number (center)
    const pageStyle = new TextStyle({
      fontSize: 14,
      fontWeight: "700",
      fill: 0x1e293b,
    });
    
    const pageText = new Text({
      text: `${this.metadata.pageNumber}`,
      style: pageStyle,
    });
    pageText.anchor.set(0.5);
    pageText.x = footerWidth / 2;
    pageText.y = footerHeight / 2;
    this.footerContainer.addChild(pageText);

    // Total pages indicator (below page number)
    const totalStyle = new TextStyle({
      fontSize: 10,
      fontWeight: "500",
      fill: 0x94a3b8,
    });
    
    const totalText = new Text({
      text: `of ${this.metadata.totalPages}`,
      style: totalStyle,
    });
    totalText.anchor.set(0.5, 0);
    totalText.x = footerWidth / 2;
    totalText.y = footerHeight / 2 + 14;
    this.footerContainer.addChild(totalText);

    // Instructor name (left side)
    if (this.metadata.instructor) {
      const instructorStyle = new TextStyle({
        fontSize: 11,
        fontWeight: "500",
        fill: 0x64748b,
      });
      
      const instructorText = new Text({
        text: this.metadata.instructor,
        style: instructorStyle,
      });
      instructorText.x = 20;
      instructorText.y = footerHeight / 2 - 6;
      this.footerContainer.addChild(instructorText);
    }

    // Topic (right side)
    if (this.metadata.topic) {
      const topicStyle = new TextStyle({
        fontSize: 11,
        fontWeight: "500",
        fill: 0x64748b,
      });
      
      const topicText = new Text({
        text: this.metadata.topic,
        style: topicStyle,
      });
      topicText.anchor.set(1, 0);
      topicText.x = footerWidth - 20;
      topicText.y = footerHeight / 2 - 6;
      this.footerContainer.addChild(topicText);
    }

    // Separator line at top of footer
    const separator = new Graphics();
    separator.moveTo(40, 0);
    separator.lineTo(footerWidth - 40, 0);
    separator.stroke({ color: 0xe2e8f0, width: 1 });
    this.footerContainer.addChild(separator);
  }

  /**
   * Populate body with placeholder content
   */
  private populateBody(): void {
    const { width = BASE_WIDTH, height = BASE_HEIGHT, margins } = this.config;
    const bodyWidth = width - margins.left - margins.right;
    const bodyHeight = height - margins.top - margins.bottom;

    // Add placeholder text in body
    const placeholderStyle = new TextStyle({
      fontSize: 18,
      fontWeight: "400",
      fill: 0x94a3b8,
    });
    
    const placeholder = new Text({
      text: `Page ${this.metadata.pageNumber} Content Area\n\nAdd your images, videos, text,\nanimations, and other content here.`,
      style: placeholderStyle,
      anchor: { x: 0.5, y: 0.5 },
    });
    placeholder.x = bodyWidth / 2;
    placeholder.y = bodyHeight / 2;
    this.bodyContainer.addChild(placeholder);
  }

  /**
   * Clear header content (except background)
   */
  private clearHeader(): void {
    while (this.headerContainer.children.length > 1) {
      this.headerContainer.removeChildAt(1).destroy();
    }
  }

  /**
   * Clear footer content (except background)
   */
  private clearFooter(): void {
    while (this.footerContainer.children.length > 1) {
      this.footerContainer.removeChildAt(1).destroy();
    }
  }

  /**
   * Clear body content (except background)
   */
  public clearBody(): void {
    while (this.bodyContainer.children.length > 1) {
      this.bodyContainer.removeChildAt(1).destroy();
    }
  }

  /**
   * Destroy the page container
   */
  public override destroy(options?: any): void {
    this.headerBg.destroy();
    this.bodyBg.destroy();
    this.footerBg.destroy();
    super.destroy(options);
  }
}
