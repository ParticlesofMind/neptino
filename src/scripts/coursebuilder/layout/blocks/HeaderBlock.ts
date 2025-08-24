/**
 * Header Block
 * Handles course title, navigation, and key info
 */

import { Container, Text, Graphics } from "pixi.js";
import { BaseBlock } from "./BaseBlock";
import type { 
  BaseBlockConfig, 
  BlockRow, 
  BlockArea,
  LayoutContainer 
} from "../core/LayoutTypes";

export interface HeaderBlockConfig extends BaseBlockConfig {
  title?: string;
  subtitle?: string;
  showNavigation?: boolean;
  showBreadcrumbs?: boolean;
  customHeaderData?: Record<string, any>;
}

export class HeaderBlock extends BaseBlock {
  private headerConfig: HeaderBlockConfig;

  constructor(config: HeaderBlockConfig) {
    super(config);
    this.headerConfig = config;
    this.setupDefaultRows();
  }

  /**
   * Setup default header rows
   */
  private setupDefaultRows(): void {
    // Main header row
    this.addRow({
      id: "header-main",
      height: 60,
      backgroundColor: 0x4a90e2,
      areas: [
        {
          id: "header-title",
          widthPercentage: 70,
          content: { type: "text", data: this.headerConfig.title || "Course Title" },
          styles: { fontSize: 24, fontWeight: "bold", color: "white" },
        },
        {
          id: "header-actions",
          widthPercentage: 30,
          content: { type: "container", data: {} },
          styles: { justifyContent: "flex-end", alignItems: "center" },
        },
      ],
    });

    // Optional subtitle row
    if (this.headerConfig.subtitle) {
      this.addRow({
        id: "header-subtitle",
        height: 30,
        backgroundColor: 0x357abd,
        areas: [
          {
            id: "header-subtitle-text",
            widthPercentage: 100,
            content: { type: "text", data: this.headerConfig.subtitle },
            styles: { fontSize: 14, color: "white", fontStyle: "italic" },
          },
        ],
      });
    }

    // Optional navigation row
    if (this.headerConfig.showNavigation) {
      this.addRow({
        id: "header-navigation",
        height: 40,
        backgroundColor: 0x2a5f8f,
        areas: [
          {
            id: "header-nav-items",
            widthPercentage: 100,
            content: { type: "container", data: {} },
            styles: { 
              flexDirection: "row", 
              justifyContent: "space-around",
              alignItems: "center" 
            },
          },
        ],
      });
    }
  }

  /**
   * Update header title
   */
  updateTitle(title: string): void {
    this.headerConfig.title = title;
    const titleRow = this.getRow("header-main");
    if (titleRow) {
      const titleArea = titleRow.areas.find(area => area.id === "header-title");
      if (titleArea) {
        titleArea.content = { type: "text", data: title };
      }
    }
  }

  /**
   * Update header subtitle
   */
  updateSubtitle(subtitle: string): void {
    this.headerConfig.subtitle = subtitle;
    
    let subtitleRow = this.getRow("header-subtitle");
    if (!subtitleRow && subtitle) {
      // Create subtitle row if it doesn't exist
      this.addRow({
        id: "header-subtitle",
        height: 30,
        backgroundColor: 0x357abd,
        areas: [
          {
            id: "header-subtitle-text",
            widthPercentage: 100,
            content: { type: "text", data: subtitle },
            styles: { fontSize: 14, color: "white", fontStyle: "italic" },
          },
        ],
      });
    } else if (subtitleRow) {
      const subtitleArea = subtitleRow.areas.find(area => area.id === "header-subtitle-text");
      if (subtitleArea) {
        subtitleArea.content = { type: "text", data: subtitle };
      }
    }
  }

  /**
   * Toggle navigation visibility
   */
  toggleNavigation(show: boolean): void {
    this.headerConfig.showNavigation = show;
    
    if (!show) {
      this.removeRow("header-navigation");
    } else {
      const navRow = this.getRow("header-navigation");
      if (!navRow) {
        this.addRow({
          id: "header-navigation",
          height: 40,
          backgroundColor: 0x2a5f8f,
          areas: [
            {
              id: "header-nav-items",
              widthPercentage: 100,
              content: { type: "container", data: {} },
              styles: { 
                flexDirection: "row", 
                justifyContent: "space-around",
                alignItems: "center" 
              },
            },
          ],
        });
      }
    }
  }

  /**
   * Render the header block
   */
  render(parentContainer: Container): Container {
    const headerContainer = this.createContainer();
    
    this.rows.forEach(row => {
      const rowContainer = this.createRowContainer(row);
      headerContainer.addChild(rowContainer);
    });

    parentContainer.addChild(headerContainer);
    return headerContainer;
  }

  /**
   * Create a row container
   */
  private createRowContainer(row: BlockRow): Container {
    const rowContainer = new Container() as LayoutContainer;
    
    rowContainer.layout = {
      width: "100%",
      height: row.height,
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "stretch",
      backgroundColor: row.backgroundColor,
    };

    // Create a background if backgroundColor is specified
    if (row.backgroundColor !== undefined) {
      const background = new Graphics();
      background.beginFill(row.backgroundColor);
      background.drawRect(0, 0, 800, row.height); // Will be resized by layout
      background.endFill();
      rowContainer.addChild(background);
    }

    // Add areas to row
    row.areas.forEach(area => {
      const areaContainer = this.createAreaContainer(area);
      rowContainer.addChild(areaContainer);
    });

    rowContainer.label = `row-${row.id}`;
    return rowContainer;
  }

  /**
   * Create an area container
   */
  private createAreaContainer(area: BlockArea): Container {
    const areaContainer = new Container() as LayoutContainer;
    
    areaContainer.layout = {
      width: `${area.widthPercentage}%`,
      height: "100%",
      justifyContent: "center",
      alignItems: "center",
      ...area.styles,
    };

    // Add content based on type
    if (area.content.type === "text") {
      const text = new Text(area.content.data as string, {
        fontSize: area.styles?.fontSize || 16,
        fill: area.styles?.color || 0x000000,
        fontWeight: area.styles?.fontWeight || "normal",
        fontStyle: area.styles?.fontStyle || "normal",
      });
      areaContainer.addChild(text);
    }

    areaContainer.label = `area-${area.id}`;
    return areaContainer;
  }

  /**
   * Get header configuration
   */
  getHeaderConfig(): HeaderBlockConfig {
    return this.headerConfig;
  }
}
