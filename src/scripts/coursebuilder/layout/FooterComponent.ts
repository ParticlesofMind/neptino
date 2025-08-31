/**
 * FooterComponent - Minimalist Footer Layout Component
 * 
 * Responsibilities:
 * - Render footer content with clean typography
 * - Transparent backgrounds that don't interfere with canvas  
 * - Subtle styling for page numbers, copyright, navigation
 * - Inter font family for professional look
 */

import { Container, Graphics, Text } from 'pixi.js';
import { LayoutRegion } from './LayoutManager';
import { getFieldLabel } from './FieldConfigurations.js';
import { 
  COMPONENT_STYLES, 
  createBackground, 
  createBorder
} from './LayoutStyles.js';

export interface FooterConfig {
  backgroundColor?: number;
  borderColor?: number;
  borderWidth?: number;
  padding?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  textStyle?: {
    fontSize: number;
    fill: number;
    fontFamily?: string;
    fontWeight?: string;
    align?: 'left' | 'center' | 'right';
  };
}

export interface FooterContent {
  type: 'text' | 'pageNumber' | 'mixed' | 'navigation' | 'columns';
  leftText?: string;
  centerText?: string;
  rightText?: string;
  pageNumber?: number;
  totalPages?: number;
  copyright?: string;
  customElements?: any[];
  // Column-specific content
  columnData?: {
    fields: string[];
    distribution: number[];
    values?: Record<string, string>;
  };
}

export class FooterComponent {
  private container: Container;
  private region: LayoutRegion;
  private config: FooterConfig;
  private content: FooterContent | null = null;
  private background: Graphics | null = null;
  private contentContainer: Container;

  constructor(region: LayoutRegion, config?: Partial<FooterConfig>) {
    this.region = region;
    this.config = this.getDefaultConfig();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.container = new Container();
    this.container.label = 'footer-component';
    this.container.x = region.x;
    this.container.y = region.y;

    this.contentContainer = new Container();
    this.contentContainer.label = 'footer-content';

    this.setupBackground();
    this.container.addChild(this.contentContainer);
  }

  /**
   * Get default footer configuration - Modern minimalist style
   */
  private getDefaultConfig(): FooterConfig {
    const footerStyle = COMPONENT_STYLES.FOOTER;
    
    return {
      backgroundColor: footerStyle.background.color,
      borderColor: 0x0066cc, // Neptino blue accent  
      borderWidth: footerStyle.border.width,
      padding: footerStyle.padding,
      textStyle: {
        fontSize: footerStyle.typography.fontSize,
        fill: footerStyle.typography.fill,
        fontFamily: footerStyle.typography.fontFamily,
        fontWeight: footerStyle.typography.fontWeight,
        align: 'center'
      }
    };
  }

  /**
   * Setup footer background - Modern transparent approach
   */
  private setupBackground(): void {
    this.background = new Graphics();
    this.background.label = 'footer-background';

    const bg = createBackground('transparent');

    // Draw transparent background rectangle
    this.background
      .rect(0, 0, this.region.width, this.region.height)
      .fill({ color: bg.color, alpha: bg.alpha });

    // Optional subtle top border 
    if (this.config.borderWidth && this.config.borderWidth > 0) {
      const border = createBorder('subtle');
      this.background
        .moveTo(0, 0)
        .lineTo(this.region.width, 0)
        .stroke(border);
    }

    this.container.addChild(this.background);
  }

  /**
   * Set footer content
   */
  public setContent(content: FooterContent): void {
    this.content = content;
    this.renderContent();
  }

  /**
   * Render the footer content based on type
   */
  private renderContent(): void {
    if (!this.content) return;

    // Clear existing content
    this.contentContainer.removeChildren();

    const contentArea = {
      x: this.config.padding!.left,
      y: this.config.padding!.top,
      width: this.region.width - this.config.padding!.left - this.config.padding!.right,
      height: this.region.height - this.config.padding!.top - this.config.padding!.bottom
    };

    switch (this.content.type) {
      case 'text':
        this.renderTextContent(contentArea);
        break;
      case 'pageNumber':
        this.renderPageNumberContent(contentArea);
        break;
      case 'mixed':
        this.renderMixedContent(contentArea);
        break;
      case 'columns':
        this.renderColumnContent(contentArea);
        break;
    }

    console.log('✅ Footer content rendered:', this.content.type);
  }

  /**
   * Render simple text content (usually center-aligned)
   */
  private renderTextContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content || !this.content.centerText) return;

    const text = new Text({
      text: this.content.centerText,
      style: {
        fontSize: this.config.textStyle!.fontSize,
        fill: this.config.textStyle!.fill,
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: this.config.textStyle!.fontWeight as any,
        align: 'center'
      }
    });

    text.anchor.set(0.5, 0.5);
    text.x = area.x + area.width / 2;
    text.y = area.y + area.height / 2;

    this.contentContainer.addChild(text);
  }

  /**
   * Render page number content
   */
  private renderPageNumberContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content) return;

    const pageText = this.content.totalPages 
      ? `Page ${this.content.pageNumber || 1} of ${this.content.totalPages}`
      : `Page ${this.content.pageNumber || 1}`;

    const text = new Text({
      text: pageText,
      style: {
        fontSize: this.config.textStyle!.fontSize,
        fill: this.config.textStyle!.fill,
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: this.config.textStyle!.fontWeight as any,
        align: 'center'
      }
    });

    text.anchor.set(0.5, 0.5);
    text.x = area.x + area.width / 2;
    text.y = area.y + area.height / 2;

    this.contentContainer.addChild(text);
  }

  /**
   * Render mixed content (left, center, right sections)
   */
  private renderMixedContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content) return;

    const textY = area.y + area.height / 2;

    // Left text
    if (this.content.leftText) {
      const leftText = new Text({
        text: this.content.leftText,
        style: {
          fontSize: this.config.textStyle!.fontSize,
          fill: this.config.textStyle!.fill,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: this.config.textStyle!.fontWeight as any,
          align: 'left'
        }
      });

      leftText.anchor.set(0, 0.5);
      leftText.x = area.x;
      leftText.y = textY;
      this.contentContainer.addChild(leftText);
    }

    // Center text
    if (this.content.centerText) {
      const centerText = new Text({
        text: this.content.centerText,
        style: {
          fontSize: this.config.textStyle!.fontSize,
          fill: this.config.textStyle!.fill,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: this.config.textStyle!.fontWeight as any,
          align: 'center'
        }
      });

      centerText.anchor.set(0.5, 0.5);
      centerText.x = area.x + area.width / 2;
      centerText.y = textY;
      this.contentContainer.addChild(centerText);
    }

    // Right text
    if (this.content.rightText) {
      const rightText = new Text({
        text: this.content.rightText,
        style: {
          fontSize: this.config.textStyle!.fontSize,
          fill: this.config.textStyle!.fill,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: this.config.textStyle!.fontWeight as any,
          align: 'right'
        }
      });

      rightText.anchor.set(1, 0.5);
      rightText.x = area.x + area.width;
      rightText.y = textY;
      this.contentContainer.addChild(rightText);
    }
  }



  /**
   * Render template-based column content for footer
   */
  private renderColumnContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content || !this.content.columnData) {
      console.warn('⚠️ No column data provided for column footer');
      return;
    }

    const { fields, distribution, values } = this.content.columnData;
    const totalColumns = 12; // Bootstrap-style 12-column grid
    const columnWidth = area.width / totalColumns;
    const columnHeight = area.height;

    console.log('📊 Rendering footer columns:', { fields, distribution, area });

    let currentX = area.x;

    fields.forEach((field, index) => {
      const colSpan = distribution[index] || 1;
      const colWidth = columnWidth * colSpan;
      
      // Create column background with border
      const columnBg = new Graphics();
      columnBg
        .rect(currentX, area.y, colWidth, columnHeight)
        .fill({ color: 0xf8f9fa, alpha: 0.6 })
        .stroke({ color: 0xdee2e6, width: 1 });

      // Create column label
      const fieldLabel = this.getFieldLabel(field);
      const columnText = new Text({
        text: values?.[field] || `[${fieldLabel}]`,
        style: {
          fontSize: Math.min(12, this.config.textStyle!.fontSize),
          fill: 0x495057,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'normal' as any,
          align: 'center'
        }
      });

      columnText.anchor.set(0.5, 0.5);
      columnText.x = currentX + colWidth / 2;
      columnText.y = area.y + columnHeight / 2;

      // Add column title (field name) at top
      const columnTitle = new Text({
        text: fieldLabel,
        style: {
          fontSize: Math.min(8, this.config.textStyle!.fontSize * 0.6),
          fill: 0x6c757d,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'bold' as any,
          align: 'center'
        }
      });

      columnTitle.anchor.set(0.5, 0);
      columnTitle.x = currentX + colWidth / 2;
      columnTitle.y = area.y + 2;

      this.contentContainer.addChild(columnBg);
      this.contentContainer.addChild(columnTitle);
      this.contentContainer.addChild(columnText);

      currentX += colWidth;
    });

    console.log('✅ Footer columns rendered:', fields.length, 'columns');
  }

  /**
   * Get user-friendly label for template field (using shared configuration)
   */
  private getFieldLabel(field: string): string {
    return getFieldLabel(field);
  }

  /**
   * Update page number (commonly used for multi-page documents)
   */
  public updatePageNumber(pageNumber: number, totalPages?: number): void {
    if (this.content && (this.content.type === 'pageNumber' || this.content.type === 'mixed')) {
      this.content.pageNumber = pageNumber;
      if (totalPages !== undefined) {
        this.content.totalPages = totalPages;
      }
      this.renderContent();
    }
  }

  /**
   * Update footer configuration
   */
  public updateConfig(updates: Partial<FooterConfig>): void {
    this.config = { ...this.config, ...updates };
    this.setupBackground();
    if (this.content) {
      this.renderContent();
    }
  }

  /**
   * Update footer content
   */
  public updateContent(updates: Partial<FooterContent>): void {
    if (this.content) {
      this.content = { ...this.content, ...updates };
      this.renderContent();
    }
  }

  /**
   * Get footer container for adding to parent
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Get footer region information
   */
  public getRegion(): LayoutRegion {
    return this.region;
  }

  /**
   * Get footer configuration
   */
  public getConfig(): FooterConfig {
    return { ...this.config };
  }

  /**
   * Get current content
   */
  public getContent(): FooterContent | null {
    return this.content ? { ...this.content } : null;
  }

  /**
   * Hide/show footer
   */
  public setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  /**
   * Check if footer is visible
   */
  public isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Resize footer (update region and re-render)
   */
  public resize(newRegion: LayoutRegion): void {
    this.region = newRegion;
    this.container.x = newRegion.x;
    this.container.y = newRegion.y;
    
    this.setupBackground();
    if (this.content) {
      this.renderContent();
    }

    console.log('📏 Footer resized to:', { width: newRegion.width, height: newRegion.height });
  }

  /**
   * Get debug information
   */
  public getDebugInfo(): any {
    return {
      region: this.region,
      config: this.config,
      content: this.content,
      visible: this.container.visible,
      children: this.container.children.length
    };
  }

  /**
   * Destroy footer component
   */
  public destroy(): void {
    this.container.destroy({ children: true });
    this.content = null;
    this.background = null;
    console.log('🗑️ Footer component destroyed');
  }
}
