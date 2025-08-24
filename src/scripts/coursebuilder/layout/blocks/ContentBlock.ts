/**
 * Content Block
 * Main learning content area with multiple sections
 */

import { Container, Text, Graphics } from "pixi.js";
import { BaseBlock } from "./BaseBlock";
import type { 
  BaseBlockConfig, 
  BlockRow, 
  BlockArea,
  LayoutContainer 
} from "../core/LayoutTypes";

export interface ContentBlockConfig extends BaseBlockConfig {
  sections?: ContentSection[];
  layoutStyle?: "single" | "dual" | "multi";
  showSectionTabs?: boolean;
}

export interface ContentSection {
  id: string;
  title: string;
  contentType: "text" | "video" | "interactive" | "mixed";
  data: any;
}

export class ContentBlock extends BaseBlock {
  private contentConfig: ContentBlockConfig;

  constructor(config: ContentBlockConfig) {
    super(config);
    this.contentConfig = config;
    this.setupDefaultRows();
  }

  /**
   * Setup default content layout
   */
  private setupDefaultRows(): void {
    const layoutStyle = this.contentConfig.layoutStyle || "single";

    if (layoutStyle === "single") {
      this.setupSingleColumnLayout();
    } else if (layoutStyle === "dual") {
      this.setupDualColumnLayout();
    } else {
      this.setupMultiColumnLayout();
    }
  }

  /**
   * Single column layout for focused learning
   */
  private setupSingleColumnLayout(): void {
    this.addRow({
      id: "content-main",
      height: 400,
      backgroundColor: 0xffffff,
      areas: [
        {
          id: "content-primary",
          widthPercentage: 100,
          content: { type: "container", data: {} },
          styles: { 
            padding: 20,
            flexDirection: "column",
            justifyContent: "flex-start",
            alignItems: "stretch"
          },
        },
      ],
    });

    // Optional section tabs
    if (this.contentConfig.showSectionTabs) {
      this.addRow({
        id: "content-tabs",
        height: 50,
        backgroundColor: 0xf0f0f0,
        areas: [
          {
            id: "content-tab-bar",
            widthPercentage: 100,
            content: { type: "container", data: {} },
            styles: { 
              flexDirection: "row",
              justifyContent: "flex-start",
              alignItems: "center",
              gap: 10,
              padding: 10
            },
          },
        ],
      });
    }
  }

  /**
   * Dual column layout for instruction + practice
   */
  private setupDualColumnLayout(): void {
    this.addRow({
      id: "content-dual",
      height: 400,
      backgroundColor: 0xffffff,
      areas: [
        {
          id: "content-instruction",
          widthPercentage: 50,
          content: { type: "container", data: {} },
          styles: { 
            padding: 20,
            backgroundColor: 0xf9f9f9,
            flexDirection: "column"
          },
        },
        {
          id: "content-practice",
          widthPercentage: 50,
          content: { type: "container", data: {} },
          styles: { 
            padding: 20,
            backgroundColor: 0xffffff,
            flexDirection: "column"
          },
        },
      ],
    });
  }

  /**
   * Multi-column layout for complex content
   */
  private setupMultiColumnLayout(): void {
    this.addRow({
      id: "content-multi",
      height: 400,
      backgroundColor: 0xffffff,
      areas: [
        {
          id: "content-left",
          widthPercentage: 30,
          content: { type: "container", data: {} },
          styles: { 
            padding: 15,
            backgroundColor: 0xf5f5f5,
            flexDirection: "column"
          },
        },
        {
          id: "content-center",
          widthPercentage: 40,
          content: { type: "container", data: {} },
          styles: { 
            padding: 20,
            backgroundColor: 0xffffff,
            flexDirection: "column"
          },
        },
        {
          id: "content-right",
          widthPercentage: 30,
          content: { type: "container", data: {} },
          styles: { 
            padding: 15,
            backgroundColor: 0xf5f5f5,
            flexDirection: "column"
          },
        },
      ],
    });
  }

  /**
   * Change layout style dynamically
   */
  changeLayoutStyle(style: "single" | "dual" | "multi"): void {
    this.contentConfig.layoutStyle = style;
    
    // Clear existing rows
    this.rows = [];
    
    // Setup new layout
    this.setupDefaultRows();
  }

  /**
   * Add a content section
   */
  addSection(section: ContentSection): void {
    if (!this.contentConfig.sections) {
      this.contentConfig.sections = [];
    }
    this.contentConfig.sections.push(section);
  }

  /**
   * Remove a content section
   */
  removeSection(sectionId: string): void {
    if (this.contentConfig.sections) {
      this.contentConfig.sections = this.contentConfig.sections.filter(
        section => section.id !== sectionId
      );
    }
  }

  /**
   * Get a specific section
   */
  getSection(sectionId: string): ContentSection | undefined {
    return this.contentConfig.sections?.find(section => section.id === sectionId);
  }

  /**
   * Toggle section tabs visibility
   */
  toggleSectionTabs(show: boolean): void {
    this.contentConfig.showSectionTabs = show;
    
    if (!show) {
      this.removeRow("content-tabs");
    } else {
      const tabsRow = this.getRow("content-tabs");
      if (!tabsRow) {
        this.addRow({
          id: "content-tabs",
          height: 50,
          backgroundColor: 0xf0f0f0,
          areas: [
            {
              id: "content-tab-bar",
              widthPercentage: 100,
              content: { type: "container", data: {} },
              styles: { 
                flexDirection: "row",
                justifyContent: "flex-start",
                alignItems: "center",
                gap: 10,
                padding: 10
              },
            },
          ],
        });
      }
    }
  }

  /**
   * Render the content block
   */
  render(parentContainer: Container): Container {
    const contentContainer = this.createContainer();
    
    this.rows.forEach(row => {
      const rowContainer = this.createRowContainer(row);
      contentContainer.addChild(rowContainer);
    });

    parentContainer.addChild(contentContainer);
    return contentContainer;
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
      background.drawRect(0, 0, 800, row.height);
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
      ...area.styles,
    };

    // Add content placeholder for now
    if (area.content.type === "text") {
      const text = new Text(area.content.data as string || "Content Area", {
        fontSize: 14,
        fill: 0x333333,
      });
      areaContainer.addChild(text);
    } else {
      // Container placeholder
      const placeholder = new Text(`${area.id} - ${area.content.type}`, {
        fontSize: 12,
        fill: 0x666666,
        fontStyle: "italic",
      });
      areaContainer.addChild(placeholder);
    }

    areaContainer.label = `area-${area.id}`;
    return areaContainer;
  }

  /**
   * Get content configuration
   */
  getContentConfig(): ContentBlockConfig {
    return this.contentConfig;
  }
}
