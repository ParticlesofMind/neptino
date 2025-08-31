/**
 * ProgramComponent - Program Layout Component
 * 
 * Responsibilities:
 * - Render program content within the program layout region
 * - Handle different program content types (program title, details, metadata, etc.)
 * - Provide configurable styling and layout options
 * - Manage program-specific interactions and updates
 * - Position immediately after header in the layout flow
 */

import { Container, Graphics, Text } from 'pixi.js';
import { LayoutRegion } from './LayoutManager';

export interface ProgramConfig {
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
  height?: number; // Default height for program section
}

export interface ProgramContent {
  type: 'text' | 'details' | 'mixed' | 'columns';
  // Mandatory Program fields (when not using columns)
  competence?: string;
  topic?: string;
  objective?: string;
  task?: string;
  // Optional fields
  title?: string;
  subtitle?: string;
  description?: string;
  programCode?: string;
  duration?: string;
  level?: string;
  alignment?: 'left' | 'center' | 'right';
  customElements?: any[];
  // Column-specific content
  columnData?: {
    fields: string[];
    distribution: number[];
    values?: Record<string, string>;
  };
}

export class ProgramComponent {
  private container: Container;
  private region: LayoutRegion;
  private config: ProgramConfig;
  private content: ProgramContent | null = null;
  private background: Graphics | null = null;
  private contentContainer: Container;

  constructor(region: LayoutRegion, config?: Partial<ProgramConfig>) {
    this.region = region;
    this.config = this.getDefaultConfig();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.container = new Container();
    this.container.label = 'program-component';
    this.container.x = region.x;
    this.container.y = region.y;

    this.contentContainer = new Container();
    this.contentContainer.label = 'program-content';

    this.setupBackground();
    this.container.addChild(this.contentContainer);
  }

  /**
   * Get default program configuration
   */
  private getDefaultConfig(): ProgramConfig {
    return {
      backgroundColor: 0xfafbfc,
      borderColor: 0xe9ecef,
      borderWidth: 1,
      padding: {
        top: 12,
        right: 20,
        bottom: 12,
        left: 20
      },
      textStyle: {
        fontSize: 16,
        fill: 0x495057,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'normal',
        align: 'left'
      },
      height: 50 // Default program section height
    };
  }

  /**
   * Setup program background
   */
  private setupBackground(): void {
    this.background = new Graphics();
    this.background.label = 'program-background';

    // Draw background rectangle
    this.background
      .rect(0, 0, this.region.width, this.region.height)
      .fill({ color: this.config.backgroundColor, alpha: 1 });

    // Add border if specified
    if (this.config.borderWidth && this.config.borderWidth > 0) {
      this.background
        .stroke({ 
          color: this.config.borderColor || 0xe9ecef, 
          width: this.config.borderWidth 
        });
    }

    this.container.addChild(this.background);
  }

  /**
   * Set program content
   */
  public setContent(content: ProgramContent): void {
    this.content = content;
    this.renderContent();
  }

  /**
   * Render the program content based on type
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
      case 'details':
        this.renderDetailsContent(contentArea);
        break;
      case 'mixed':
        this.renderMixedContent(contentArea);
        break;
      case 'columns':
        this.renderColumnContent(contentArea);
        break;
    }

    console.log('✅ Program content rendered:', this.content.type);
  }

  /**
   * Render text-only content
   */
  private renderTextContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content) return;

    const padding = 10;
    const lineHeight = 20;
    const labelWidth = 100;
    let currentY = area.y + padding;

    // Competence
    if (this.content.competence) {
      this.createLabelValuePair('Competence:', this.content.competence, 
        area.x + padding, currentY, labelWidth, area.width - 2 * padding);
      currentY += lineHeight;
    }

    // Topic
    if (this.content.topic) {
      this.createLabelValuePair('Topic:', this.content.topic, 
        area.x + padding, currentY, labelWidth, area.width - 2 * padding);
      currentY += lineHeight;
    }

    // Objective
    if (this.content.objective) {
      this.createLabelValuePair('Objective:', this.content.objective, 
        area.x + padding, currentY, labelWidth, area.width - 2 * padding);
      currentY += lineHeight;
    }

    // Task
    if (this.content.task) {
      this.createLabelValuePair('Task:', this.content.task, 
        area.x + padding, currentY, labelWidth, area.width - 2 * padding);
    }
  }

  private createLabelValuePair(label: string, value: string, x: number, y: number, labelWidth: number, totalWidth: number): void {
    // Create label text
    const labelText = new Text({
      text: label,
      style: {
        fontSize: this.config.textStyle!.fontSize,
        fill: 0x495057, // Darker color for labels
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: 'bold'
      }
    });
    labelText.anchor.set(0, 0.5);
    labelText.x = x;
    labelText.y = y;
    this.contentContainer.addChild(labelText);

    // Create value text
    const valueText = new Text({
      text: value,
      style: {
        fontSize: this.config.textStyle!.fontSize,
        fill: this.config.textStyle!.fill,
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: this.config.textStyle!.fontWeight as any,
        wordWrap: true,
        wordWrapWidth: totalWidth - labelWidth - 10
      }
    });
    valueText.anchor.set(0, 0.5);
    valueText.x = x + labelWidth;
    valueText.y = y;
    this.contentContainer.addChild(valueText);
  }

  /**
   * Render program details content (title + metadata)
   */
  private renderDetailsContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content) return;

    const padding = 10;
    const sectionSpacing = 25;
    let currentY = area.y + padding;

    // Competence section
    if (this.content.competence) {
      this.createDetailSection('COMPETENCE', this.content.competence, 
        area.x + padding, currentY, area.width - 2 * padding);
      currentY += sectionSpacing;
    }

    // Topic section
    if (this.content.topic) {
      this.createDetailSection('TOPIC', this.content.topic, 
        area.x + padding, currentY, area.width - 2 * padding);
      currentY += sectionSpacing;
    }

    // Objective section
    if (this.content.objective) {
      this.createDetailSection('OBJECTIVE', this.content.objective, 
        area.x + padding, currentY, area.width - 2 * padding);
      currentY += sectionSpacing;
    }

    // Task section
    if (this.content.task) {
      this.createDetailSection('TASK', this.content.task, 
        area.x + padding, currentY, area.width - 2 * padding);
    }
  }

  private createDetailSection(label: string, content: string, x: number, y: number, width: number): void {
    // Create section header
    const headerText = new Text({
      text: label,
      style: {
        fontSize: Math.max(10, this.config.textStyle!.fontSize * 0.75),
        fill: 0x6c757d,
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: 'bold',
        letterSpacing: 1
      }
    });
    headerText.anchor.set(0, 0);
    headerText.x = x;
    headerText.y = y;
    this.contentContainer.addChild(headerText);

    // Create content text
    const contentText = new Text({
      text: content,
      style: {
        fontSize: this.config.textStyle!.fontSize,
        fill: this.config.textStyle!.fill,
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: this.config.textStyle!.fontWeight as any,
        wordWrap: true,
        wordWrapWidth: width
      }
    });
    contentText.anchor.set(0, 0);
    contentText.x = x;
    contentText.y = y + 14;
    this.contentContainer.addChild(contentText);
  }

  /**
   * Render mixed content (title on left, metadata on right)
   */
  private renderMixedContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content) return;

    const leftWidth = area.width * 0.6;
    const rightWidth = area.width * 0.4;
    const spacing = 20;

    // Left side - title and description
    const leftArea = {
      x: area.x,
      y: area.y,
      width: leftWidth - spacing / 2,
      height: area.height
    };

    if (this.content.title) {
      const titleText = new Text({
        text: this.content.title,
        style: {
          fontSize: this.config.textStyle!.fontSize,
          fill: this.config.textStyle!.fill,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'bold' as any,
          align: 'left'
        }
      });

      titleText.anchor.set(0, 0.5);
      titleText.x = leftArea.x;
      titleText.y = leftArea.y + leftArea.height / 2;
      this.contentContainer.addChild(titleText);
    }

    // Right side - metadata
    const rightArea = {
      x: area.x + leftWidth + spacing / 2,
      y: area.y,
      width: rightWidth - spacing / 2,
      height: area.height
    };

    const metadata: string[] = [];
    if (this.content.programCode) metadata.push(this.content.programCode);
    if (this.content.duration) metadata.push(this.content.duration);
    if (this.content.level) metadata.push(this.content.level);

    if (metadata.length > 0) {
      const metadataText = new Text({
        text: metadata.join(' • '),
        style: {
          fontSize: Math.max(10, this.config.textStyle!.fontSize * 0.75),
          fill: 0x6c757d,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'normal' as any,
          align: 'right'
        }
      });

      metadataText.anchor.set(1, 0.5);
      metadataText.x = rightArea.x + rightArea.width;
      metadataText.y = rightArea.y + rightArea.height / 2;
      this.contentContainer.addChild(metadataText);
    }
  }

  /**
   * Render template-based column content
   */
  private renderColumnContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content || !this.content.columnData) {
      console.warn('⚠️ No column data provided for program columns');
      return;
    }

    const { fields, distribution, values } = this.content.columnData;
    const totalColumns = 12; // Bootstrap-style 12-column grid
    const columnWidth = area.width / totalColumns;
    const columnHeight = area.height;

    console.log('📊 Rendering program columns:', { fields, distribution, area });

    let currentX = area.x;

    fields.forEach((field, index) => {
      const colSpan = distribution[index] || 1;
      const colWidth = columnWidth * colSpan;
      
      // Create column background with border
      const columnBg = new Graphics();
      columnBg
        .rect(currentX, area.y, colWidth, columnHeight)
        .fill({ color: 0xfafbfc, alpha: 0.8 })
        .stroke({ color: 0xdee2e6, width: 1 });

      // Create column content
      const fieldLabel = this.getFieldLabel(field);
      const columnText = new Text({
        text: values?.[field] || `[${fieldLabel}]`,
        style: {
          fontSize: Math.min(12, this.config.textStyle!.fontSize * 0.75),
          fill: 0x495057,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'normal' as any,
          align: 'center'
        }
      });

      columnText.anchor.set(0.5, 0.5);
      columnText.x = currentX + colWidth / 2;
      columnText.y = area.y + columnHeight / 2;

      // Add column label at top
      const columnLabel = new Text({
        text: fieldLabel,
        style: {
          fontSize: Math.min(9, this.config.textStyle!.fontSize * 0.5),
          fill: 0x6c757d,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'bold' as any,
          align: 'center'
        }
      });

      columnLabel.anchor.set(0.5, 0);
      columnLabel.x = currentX + colWidth / 2;
      columnLabel.y = area.y + 2;

      this.contentContainer.addChild(columnBg);
      this.contentContainer.addChild(columnLabel);
      this.contentContainer.addChild(columnText);

      currentX += colWidth;
    });

    console.log('✅ Program columns rendered:', fields.length, 'columns');
  }

  /**
   * Get user-friendly label for program field
   */
  private getFieldLabel(field: string): string {
    const labels: Record<string, string> = {
      program_code: 'Code',
      program_title: 'Program',
      program_level: 'Level',
      duration: 'Duration',
      credits: 'Credits',
      department: 'Department',
      semester: 'Semester',
      year: 'Year',
      prerequisite: 'Prerequisites'
    };
    return labels[field] || field.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  /**
   * Update program configuration
   */
  public updateConfig(updates: Partial<ProgramConfig>): void {
    this.config = { ...this.config, ...updates };
    this.setupBackground();
    if (this.content) {
      this.renderContent();
    }
  }

  /**
   * Update program content
   */
  public updateContent(updates: Partial<ProgramContent>): void {
    if (this.content) {
      this.content = { ...this.content, ...updates };
      this.renderContent();
    }
  }

  /**
   * Get program container for adding to parent
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Get program region information
   */
  public getRegion(): LayoutRegion {
    return this.region;
  }

  /**
   * Get program configuration
   */
  public getConfig(): ProgramConfig {
    return { ...this.config };
  }

  /**
   * Get current content
   */
  public getContent(): ProgramContent | null {
    return this.content ? { ...this.content } : null;
  }

  /**
   * Hide/show program
   */
  public setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  /**
   * Check if program is visible
   */
  public isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Resize program (update region and re-render)
   */
  public resize(newRegion: LayoutRegion): void {
    this.region = newRegion;
    this.container.x = newRegion.x;
    this.container.y = newRegion.y;
    
    this.setupBackground();
    if (this.content) {
      this.renderContent();
    }

    console.log('📏 Program resized to:', { width: newRegion.width, height: newRegion.height });
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
   * Destroy program component
   */
  public destroy(): void {
    this.container.destroy({ children: true });
    this.content = null;
    this.background = null;
    console.log('🗑️ Program component destroyed');
  }
}
