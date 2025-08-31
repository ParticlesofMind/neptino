/**
 * HeaderComponent - Minimalist Header Layout Component
 * 
 * Responsibilities:
 * - Render header content with clean typography
 * - Transparent backgrounds that don't interfere with canvas
 * - Subtle Neptino blue accents for visual hierarchy
 * - Inter font family for professional look
 */

import { Container, Graphics, Text } from 'pixi.js';
import { LayoutRegion } from './LayoutManager';
import { getFieldLabel } from './FieldConfigurations.js';
import { 
  COMPONENT_STYLES, 
  createTextStyle, 
  createBackground, 
  createBorder,
  SPACING
} from './LayoutStyles.js';

export interface HeaderConfig {
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

export interface HeaderContent {
  type: 'text' | 'logo' | 'mixed' | 'columns';
  title?: string;
  subtitle?: string;
  logoUrl?: string;
  alignment?: 'left' | 'center' | 'right';
  customElements?: any[];
  // Column-specific content
  columnData?: {
    fields: string[];
    distribution: number[];
    values?: Record<string, string>;
  };
}

export class HeaderComponent {
  private container: Container;
  private region: LayoutRegion;
  private config: HeaderConfig;
  private content: HeaderContent | null = null;
  private background: Graphics | null = null;
  private contentContainer: Container;

  constructor(region: LayoutRegion, config?: Partial<HeaderConfig>) {
    this.region = region;
    this.config = this.getDefaultConfig();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.container = new Container();
    this.container.label = 'header-component';
    this.container.x = region.x;
    this.container.y = region.y;

    this.contentContainer = new Container();
    this.contentContainer.label = 'header-content';

    this.setupBackground();
    this.container.addChild(this.contentContainer);
  }

  /**
   * Get default header configuration - Modern minimalist style
   */
  private getDefaultConfig(): HeaderConfig {
    const headerStyle = COMPONENT_STYLES.HEADER;
    
    return {
      backgroundColor: headerStyle.background.color,
      borderColor: 0x0066cc, // Neptino blue accent
      borderWidth: headerStyle.border.width,
      padding: headerStyle.padding,
      textStyle: {
        fontSize: headerStyle.typography.fontSize,
        fill: headerStyle.typography.fill,
        fontFamily: headerStyle.typography.fontFamily,
        fontWeight: headerStyle.typography.fontWeight,
        align: 'left'
      }
    };
  }

  /**
   * Setup background graphics - Modern transparent approach
   */
  private setupBackground(): void {
    this.background = new Graphics();
    this.background.label = 'header-background';

    const bg = createBackground('transparent');
    
    // Create completely transparent background (no visual interference with canvas)
    this.background
      .rect(0, 0, this.region.width, this.region.height)
      .fill({ color: bg.color, alpha: bg.alpha });

    // Optional subtle border can be added if needed
    if (this.config.borderWidth && this.config.borderWidth > 0) {
      const border = createBorder('subtle');
      this.background.stroke(border);
    }

    this.container.addChild(this.background);
  }

  /**
   * Set header content
   */
  public setContent(content: HeaderContent): void {
    this.content = content;
    this.renderContent();
  }

  /**
   * Render the header content based on type
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
      case 'logo':
        this.renderLogoContent(contentArea);
        break;
      case 'mixed':
        this.renderMixedContent(contentArea);
        break;
      case 'columns':
        this.renderColumnContent(contentArea);
        break;
    }

    console.log('✅ Header content rendered:', this.content.type);
  }

  /**
   * Render text-only content
   */
  private renderTextContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content || !this.content.title) return;

    const titleStyle = createTextStyle('title');
    
    const titleText = new Text({
      text: this.content.title,
      style: {
        ...titleStyle,
        fontWeight: titleStyle.fontWeight as any
      }
    });

    // Position based on alignment
    switch (this.content.alignment || 'left') {
      case 'center':
        titleText.anchor.set(0.5, 0);
        titleText.x = area.x + area.width / 2;
        break;
      case 'right':
        titleText.anchor.set(1, 0);
        titleText.x = area.x + area.width;
        break;
      default: // left
        titleText.anchor.set(0, 0);
        titleText.x = area.x;
    }

    titleText.y = area.y + this.config.padding!.top;

    // Add subtitle if provided - more elegant spacing
    if (this.content.subtitle) {
      const subtitleStyle = createTextStyle('label');
      
      const subtitleText = new Text({
        text: this.content.subtitle,
        style: {
          ...subtitleStyle,
          fontWeight: subtitleStyle.fontWeight as any
        }
      });

      // Position subtitle below title with minimal spacing
      subtitleText.anchor.copyFrom(titleText.anchor);
      subtitleText.x = titleText.x;
      subtitleText.y = titleText.y + titleText.height + SPACING.XS;

      this.contentContainer.addChild(subtitleText);
    }

    this.contentContainer.addChild(titleText);
  }

  /**
   * Render logo content - Modern minimalist placeholder
   */
  private renderLogoContent(area: { x: number; y: number; width: number; height: number }): void {
    const border = createBorder('subtle');
    const textStyle = createTextStyle('meta');
    
    // Create ultra-minimal logo placeholder with Neptino accent
    const logoPlaceholder = new Graphics();
    logoPlaceholder
      .rect(area.x, area.y, Math.min(area.width, 60), area.height - 4)
      .fill({ color: 0x000000, alpha: 0 }) // Transparent fill
      .stroke(border); // Subtle border

    const logoText = new Text({
      text: 'LOGO',
      style: {
        ...textStyle,
        fontWeight: textStyle.fontWeight as any,
        align: 'center'
      }
    });

    logoText.anchor.set(0.5, 0.5);
    logoText.x = area.x + 30;
    logoText.y = area.y + area.height / 2;

    this.contentContainer.addChild(logoPlaceholder);
    this.contentContainer.addChild(logoText);

    console.log('📷 Minimal logo placeholder rendered');
  }

  /**
   * Render mixed content (logo + text)
   */
  private renderMixedContent(area: { x: number; y: number; width: number; height: number }): void {
    const logoWidth = 80;
    const spacing = 16;

    // Render logo on the left
    const logoArea = {
      x: area.x,
      y: area.y,
      width: logoWidth,
      height: area.height
    };
    this.renderLogoContent(logoArea);

    // Render text on the right
    const textArea = {
      x: area.x + logoWidth + spacing,
      y: area.y,
      width: area.width - logoWidth - spacing,
      height: area.height
    };

    // Temporarily set content to text-only for rendering
    const originalContent = this.content;
    this.content = { ...originalContent, type: 'text' };
    this.renderTextContent(textArea);
    this.content = originalContent;
  }

  /**
   * Render template-based column content
   */
  private renderColumnContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content || !this.content.columnData) {
      console.warn('⚠️ No column data provided for column header');
      return;
    }

    const { fields, distribution, values } = this.content.columnData;
    const totalColumns = 12; // Bootstrap-style 12-column grid
    const columnWidth = area.width / totalColumns;
    const columnHeight = area.height;

    console.log('📊 Rendering header columns:', { fields, distribution, area });

    let currentX = area.x;

    fields.forEach((field, index) => {
      const colSpan = distribution[index] || 1;
      const colWidth = columnWidth * colSpan;
      
      // Create column background with border
      const columnBg = new Graphics();
      columnBg
        .rect(currentX, area.y, colWidth, columnHeight)
        .fill({ color: 0xf8f9fa, alpha: 0.8 })
        .stroke({ color: 0xdee2e6, width: 1 });

      // Create column label
      const fieldLabel = this.getFieldLabel(field);
      const columnText = new Text({
        text: values?.[field] || `[${fieldLabel}]`,
        style: {
          fontSize: Math.min(14, this.config.textStyle!.fontSize * 0.6),
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
          fontSize: Math.min(10, this.config.textStyle!.fontSize * 0.4),
          fill: 0x6c757d,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'bold' as any,
          align: 'center'
        }
      });

      columnTitle.anchor.set(0.5, 0);
      columnTitle.x = currentX + colWidth / 2;
      columnTitle.y = area.y + 4;

      this.contentContainer.addChild(columnBg);
      this.contentContainer.addChild(columnTitle);
      this.contentContainer.addChild(columnText);

      currentX += colWidth;
    });

    console.log('✅ Header columns rendered:', fields.length, 'columns');
  }

  /**
   * Get user-friendly label for template field (using shared configuration)
   */
  private getFieldLabel(field: string): string {
    return getFieldLabel(field);
  }

  /**
   * Update header configuration
   */
  public updateConfig(updates: Partial<HeaderConfig>): void {
    this.config = { ...this.config, ...updates };
    this.setupBackground();
    if (this.content) {
      this.renderContent();
    }
  }

  /**
   * Update header content
   */
  public updateContent(updates: Partial<HeaderContent>): void {
    if (this.content) {
      this.content = { ...this.content, ...updates };
      this.renderContent();
    }
  }

  /**
   * Get header container for adding to parent
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Get header region information
   */
  public getRegion(): LayoutRegion {
    return this.region;
  }

  /**
   * Get header configuration
   */
  public getConfig(): HeaderConfig {
    return { ...this.config };
  }

  /**
   * Get current content
   */
  public getContent(): HeaderContent | null {
    return this.content ? { ...this.content } : null;
  }

  /**
   * Hide/show header
   */
  public setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  /**
   * Check if header is visible
   */
  public isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Resize header (update region and re-render)
   */
  public resize(newRegion: LayoutRegion): void {
    this.region = newRegion;
    this.container.x = newRegion.x;
    this.container.y = newRegion.y;
    
    this.setupBackground();
    if (this.content) {
      this.renderContent();
    }

    console.log('📏 Header resized to:', { width: newRegion.width, height: newRegion.height });
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
   * Destroy header component
   */
  public destroy(): void {
    this.container.destroy({ children: true });
    this.content = null;
    this.background = null;
    console.log('🗑️ Header component destroyed');
  }
}
