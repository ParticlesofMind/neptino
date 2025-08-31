/**
 * ContentComponent - Modern Minimalist Content Layout Component
 * 
 exporexport interface ContentContent {
  type: 'nested' | 'columns';
  // Nested hierarchical structure
  hierarchy?: ContentHierarchy;
  // Column-based structure
  columnData?: {ontentContent {
  type: 'nested' | 'columns';
  // Nested hierarchical structure
  hierarchy?: ContentHierarchy;
  // Column-based structure
  columnData?: {ted hierarchical content structure:
 * Topic > Objective > Task > Instruction Area, Student Area, Teacher Area
 * 
 * Modern design principles:
 * - Transparent backgrounds that don't interfere with canvas
 * - Clean typography hierarchy with subtle spacing
 * - Neptino blue accents for visual emphasis
 * - Professional Inter font family
 */

import { Container, Graphics, Text } from 'pixi.js';
import { LayoutRegion } from './LayoutManager';
import { getFieldLabel } from './FieldConfigurations.js';

export interface ContentConfig {
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
  // Nested design specific config
  nestedSpacing?: number;
  levelColors?: {
    topic: number;
    objective: number;
    task: number;
    areas: number;
  };
  headerHeight?: number;
  areaHeight?: number;
}

export interface ContentHierarchy {
  topics: Topic[];
}

export interface Topic {
  id: string;
  title: string;
  objectives: Objective[];
}

export interface Objective {
  id: string;
  title: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  title: string;
  areas: ContentAreas;
}

export interface ContentAreas {
  instruction_area?: string;
  student_area?: string;
  teacher_area?: string;
}

export interface ContentContent {
  type: 'nested' | 'flat' | 'columns';
  // Nested hierarchical structure
  hierarchy?: ContentHierarchy;
  // Flat structure (legacy support)
  topic?: string;
  objective?: string;
  task?: string;
  instruction_area?: string;
  student_area?: string;
  teacher_area?: string;
  // Column-specific content
  columnData?: {
    fields: string[];
    distribution: number[];
    values?: Record<string, string>;
  };
}

export class ContentComponent {
  private container: Container;
  private region: LayoutRegion;
  private config: ContentConfig;
  private content: ContentContent | null = null;
  private background: Graphics | null = null;
  private contentContainer: Container;

  constructor(region: LayoutRegion, config?: Partial<ContentConfig>) {
    this.region = region;
    this.config = this.getDefaultConfig();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.container = new Container();
    this.container.label = 'content-component';
    this.container.x = region.x;
    this.container.y = region.y;

    this.contentContainer = new Container();
    this.contentContainer.label = 'content-content';

    this.setupBackground();
    this.container.addChild(this.contentContainer);
  }

  /**
   * Get default content configuration
   */
  private getDefaultConfig(): ContentConfig {
    return {
      backgroundColor: 0xffffff,
      borderColor: 0xe9ecef,
      borderWidth: 1,
      padding: {
        top: 8,
        right: 8,
        bottom: 8,
        left: 8
      },
      textStyle: {
        fontSize: 12,
        fill: 0x333333,
        fontFamily: 'Arial, sans-serif',
        fontWeight: 'normal',
        align: 'left'
      },
      nestedSpacing: 4,
      levelColors: {
        topic: 0xf8f9fa,
        objective: 0xf1f3f4,
        task: 0xe8eaed,
        areas: 0xffffff
      },
      headerHeight: 28,
      areaHeight: 60
    };
  }

  /**
   * Setup content background
   */
  private setupBackground(): void {
    this.background = new Graphics();
    this.background.label = 'content-background';

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
   * Set content data
   */
  public setContent(content: ContentContent): void {
    this.content = content;
    this.renderContent();
  }

  /**
   * Render the content based on type
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
      case 'nested':
        this.renderNestedContent(contentArea);
        break;
      case 'columns':
        this.renderColumnContent(contentArea);
        break;
    }

    console.log('✅ Content rendered:', this.content.type);
  }

  /**
   * Render nested hierarchical content (Topic > Objective > Task > Areas)
   */
  private renderNestedContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content?.hierarchy) {
      this.renderEmptyHierarchy(area);
      return;
    }

    const { topics } = this.content.hierarchy;
    let currentY = area.y;
    const spacing = this.config.nestedSpacing!;

    topics.forEach((topic, topicIndex) => {
      // Render Topic level
      const topicContainer = this.createNestedLevel(
        'topic',
        topic.title || `Topic ${topicIndex + 1}`,
        area.x,
        currentY,
        area.width,
        this.config.headerHeight!,
        this.config.levelColors!.topic
      );

      this.contentContainer.addChild(topicContainer);
      currentY += this.config.headerHeight! + spacing;

      // Render Objectives for this topic
      topic.objectives.forEach((objective, objIndex) => {
        const objectiveContainer = this.createNestedLevel(
          'objective',
          objective.title || `Objective ${objIndex + 1}`,
          area.x + 20,
          currentY,
          area.width - 20,
          this.config.headerHeight!,
          this.config.levelColors!.objective
        );

        this.contentContainer.addChild(objectiveContainer);
        currentY += this.config.headerHeight! + spacing;

        // Render Tasks for this objective
        objective.tasks.forEach((task, taskIndex) => {
          const taskContainer = this.createNestedLevel(
            'task',
            task.title || `Task ${taskIndex + 1}`,
            area.x + 40,
            currentY,
            area.width - 40,
            this.config.headerHeight!,
            this.config.levelColors!.task
          );

          this.contentContainer.addChild(taskContainer);
          currentY += this.config.headerHeight! + spacing;

          // Render Areas for this task (Instruction, Student, Teacher)
          const areaHeight = this.config.areaHeight!;
          const areaSpacing = 2;

          // Instruction Area
          if (task.areas.instruction_area !== undefined) {
            const instructionContainer = this.createContentArea(
              'Instruction Area',
              task.areas.instruction_area,
              area.x + 60,
              currentY,
              area.width - 60,
              areaHeight,
              this.config.levelColors!.areas
            );
            this.contentContainer.addChild(instructionContainer);
            currentY += areaHeight + areaSpacing;
          }

          // Student Area
          if (task.areas.student_area !== undefined) {
            const studentContainer = this.createContentArea(
              'Student Area',
              task.areas.student_area,
              area.x + 60,
              currentY,
              area.width - 60,
              areaHeight,
              this.config.levelColors!.areas
            );
            this.contentContainer.addChild(studentContainer);
            currentY += areaHeight + areaSpacing;
          }

          // Teacher Area
          if (task.areas.teacher_area !== undefined) {
            const teacherContainer = this.createContentArea(
              'Teacher Area',
              task.areas.teacher_area,
              area.x + 60,
              currentY,
              area.width - 60,
              areaHeight,
              this.config.levelColors!.areas
            );
            this.contentContainer.addChild(teacherContainer);
            currentY += areaHeight + areaSpacing;
          }

          currentY += spacing * 2; // Extra spacing after task areas
        });

        currentY += spacing; // Extra spacing after objectives
      });

      currentY += spacing; // Extra spacing after topics
    });

    console.log('📚 Nested content hierarchy rendered:', topics.length, 'topics');
  }

  /**
   * Create a nested level container (Topic, Objective, Task)
   */
  private createNestedLevel(
    level: 'topic' | 'objective' | 'task',
    title: string,
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: number
  ): Container {
    const container = new Container();
    container.label = `${level}-container`;

    // Create background
    const background = new Graphics();
    background
      .rect(0, 0, width, height)
      .fill({ color: backgroundColor, alpha: 0.8 })
      .stroke({ color: 0xdee2e6, width: 1 });

    // Create title text
    const fontSize = level === 'topic' ? 14 : level === 'objective' ? 12 : 10;
    const fontWeight = level === 'topic' ? 'bold' : level === 'objective' ? 'bold' : 'normal';

    const titleText = new Text({
      text: title,
      style: {
        fontSize,
        fill: 0x495057,
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: fontWeight as any,
        align: 'left'
      }
    });

    titleText.anchor.set(0, 0.5);
    titleText.x = 8;
    titleText.y = height / 2;

    // Add level indicator
    const indicator = new Graphics();
    indicator
      .rect(0, 0, 4, height)
      .fill({ 
        color: level === 'topic' ? 0x007bff : 
              level === 'objective' ? 0x28a745 : 0x6c757d, 
        alpha: 1 
      });

    container.addChild(background);
    container.addChild(indicator);
    container.addChild(titleText);

    container.x = x;
    container.y = y;

    return container;
  }

  /**
   * Create content area container (Instruction, Student, Teacher)
   */
  private createContentArea(
    areaType: string,
    content: string,
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: number
  ): Container {
    const container = new Container();
    container.label = `${areaType.toLowerCase().replace(' ', '-')}-area`;

    // Create background
    const background = new Graphics();
    background
      .rect(0, 0, width, height)
      .fill({ color: backgroundColor, alpha: 1 })
      .stroke({ color: 0xced4da, width: 1 });

    // Create area header
    const headerText = new Text({
      text: areaType,
      style: {
        fontSize: 10,
        fill: 0x6c757d,
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: 'bold' as any,
        align: 'left'
      }
    });

    headerText.anchor.set(0, 0);
    headerText.x = 8;
    headerText.y = 4;

    // Create content text
    const contentText = new Text({
      text: content || `[${areaType} Content]`,
      style: {
        fontSize: this.config.textStyle!.fontSize,
        fill: this.config.textStyle!.fill,
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: 'normal' as any,
        align: 'left',
        wordWrap: true,
        wordWrapWidth: width - 16
      }
    });

    contentText.anchor.set(0, 0);
    contentText.x = 8;
    contentText.y = 18;

    container.addChild(background);
    container.addChild(headerText);
    container.addChild(contentText);

    container.x = x;
    container.y = y;

    return container;
  }

  /**
   * Render empty hierarchy placeholder
   */
  private renderEmptyHierarchy(area: { x: number; y: number; width: number; height: number }): void {
    const placeholderText = new Text({
      text: 'No content hierarchy defined.\nAdd topics, objectives, and tasks to populate this section.',
      style: {
        fontSize: this.config.textStyle!.fontSize,
        fill: 0x6c757d,
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: 'normal' as any,
        align: 'center',
        wordWrap: true,
        wordWrapWidth: area.width
      }
    });

    placeholderText.anchor.set(0.5, 0.5);
    placeholderText.x = area.x + area.width / 2;
    placeholderText.y = area.y + area.height / 2;

    this.contentContainer.addChild(placeholderText);
  }

  /**
   * Render template-based column content
   */
  private renderColumnContent(area: { x: number; y: number; width: number; height: number }): void {
    if (!this.content || !this.content.columnData) {
      console.warn('⚠️ No column data provided for content columns');
      return;
    }

    const { fields, distribution, values } = this.content.columnData;
    const totalColumns = 12; // Bootstrap-style 12-column grid
    const columnWidth = area.width / totalColumns;
    const columnHeight = area.height;

    console.log('📊 Rendering content columns:', { fields, distribution, area });

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

      // Create column content
      const fieldLabel = this.getFieldLabel(field);
      const columnText = new Text({
        text: values?.[field] || `[${fieldLabel}]`,
        style: {
          fontSize: Math.min(11, this.config.textStyle!.fontSize * 0.8),
          fill: 0x495057,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'normal' as any,
          align: 'center',
          wordWrap: true,
          wordWrapWidth: colWidth - 8
        }
      });

      columnText.anchor.set(0.5, 0.5);
      columnText.x = currentX + colWidth / 2;
      columnText.y = area.y + columnHeight / 2;

      // Add column label at top
      const columnLabel = new Text({
        text: fieldLabel,
        style: {
          fontSize: Math.min(8, this.config.textStyle!.fontSize * 0.6),
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

    console.log('✅ Content columns rendered:', fields.length, 'columns');
  }

  /**
   * Get user-friendly label for content field
   */
  private getFieldLabel(field: string): string {
    return getFieldLabel(field);
  }

  /**
   * Create empty hierarchical structure for layout
   */
  public createEmptyHierarchy(): ContentHierarchy {
    return {
      topics: [
        {
          id: 'topic-1',
          title: '[Topic]',
          objectives: [
            {
              id: 'obj-1-1',
              title: '[Objective]',
              tasks: [
                {
                  id: 'task-1-1-1',
                  title: '[Task]',
                  areas: {
                    instruction_area: '',
                    student_area: '',
                    teacher_area: ''
                  }
                }
              ]
            }
          ]
        }
      ]
    };
  }

  /**
   * Update content configuration
   */
  public updateConfig(updates: Partial<ContentConfig>): void {
    this.config = { ...this.config, ...updates };
    this.setupBackground();
    if (this.content) {
      this.renderContent();
    }
  }

  /**
   * Update content data
   */
  public updateContent(updates: Partial<ContentContent>): void {
    if (this.content) {
      this.content = { ...this.content, ...updates };
      this.renderContent();
    }
  }

  /**
   * Get content container for adding to parent
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Get content region information
   */
  public getRegion(): LayoutRegion {
    return this.region;
  }

  /**
   * Get content configuration
   */
  public getConfig(): ContentConfig {
    return { ...this.config };
  }

  /**
   * Get current content
   */
  public getContent(): ContentContent | null {
    return this.content ? { ...this.content } : null;
  }

  /**
   * Hide/show content
   */
  public setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  /**
   * Check if content is visible
   */
  public isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Resize content (update region and re-render)
   */
  public resize(newRegion: LayoutRegion): void {
    this.region = newRegion;
    this.container.x = newRegion.x;
    this.container.y = newRegion.y;
    
    this.setupBackground();
    if (this.content) {
      this.renderContent();
    }

    console.log('📏 Content resized to:', { width: newRegion.width, height: newRegion.height });
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
   * Destroy content component
   */
  public destroy(): void {
    this.container.destroy({ children: true });
    this.content = null;
    this.background = null;
    console.log('🗑️ Content component destroyed');
  }
}
