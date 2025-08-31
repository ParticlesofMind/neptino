/**
 * AssignmentComponent - Modern Minimalist Assignment Layout Component
 * 
 * Handles nested hierarchical assignment structure:
 * Topic > Objective > Task > Instruction Area, Student Area, Teacher Area
 * 
 * Assignment-specific features:
 * - Due dates, points, submission status
 * - Color-coded status indicators with Neptino blue
 * - Transparent backgrounds for canvas compatibility
 * - Clean, professional typography
 */

import { Container, Graphics, Text } from 'pixi.js';
import { LayoutRegion } from './LayoutManager';
import { getFieldLabel } from './FieldConfigurations.js';

export interface AssignmentConfig {
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

export interface AssignmentHierarchy {
  topics: AssignmentTopic[];
}

export interface AssignmentTopic {
  id: string;
  title: string;
  objectives: AssignmentObjective[];
}

export interface AssignmentObjective {
  id: string;
  title: string;
  tasks: AssignmentTask[];
}

export interface AssignmentTask {
  id: string;
  title: string;
  areas: AssignmentAreas;
  // Assignment-specific properties
  dueDate?: string;
  points?: number;
  submissionType?: 'text' | 'file' | 'url' | 'quiz';
  status?: 'not_started' | 'in_progress' | 'submitted' | 'graded';
}

export interface AssignmentAreas {
  instruction_area?: string;
  student_area?: string;
  teacher_area?: string;
}

export interface AssignmentContent {
  type: 'nested' | 'columns';
  // Nested hierarchical structure
  hierarchy?: AssignmentHierarchy;
  // Column-specific content
  columnData?: {
    fields: string[];
    distribution: number[];
    values?: Record<string, string>;
  };
}

export class AssignmentComponent {
  private container: Container;
  private region: LayoutRegion;
  private config: AssignmentConfig;
  private content: AssignmentContent | null = null;
  private background: Graphics | null = null;
  private contentContainer: Container;

  constructor(region: LayoutRegion, config?: Partial<AssignmentConfig>) {
    this.region = region;
    this.config = this.getDefaultConfig();
    
    if (config) {
      this.config = { ...this.config, ...config };
    }

    this.container = new Container();
    this.container.label = 'assignment-component';
    this.container.x = region.x;
    this.container.y = region.y;

    this.contentContainer = new Container();
    this.contentContainer.label = 'assignment-content';

    this.setupBackground();
    this.container.addChild(this.contentContainer);
  }

  /**
   * Get default assignment configuration
   */
  private getDefaultConfig(): AssignmentConfig {
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
        topic: 0xfff3cd,     // Light yellow for assignments
        objective: 0xf8d7da, // Light red for assignments
        task: 0xd4e5f7,      // Light blue for assignments
        areas: 0xffffff
      },
      headerHeight: 28,
      areaHeight: 60
    };
  }

  /**
   * Setup assignment background
   */
  private setupBackground(): void {
    this.background = new Graphics();
    this.background.label = 'assignment-background';

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
   * Set assignment data
   */
  public setContent(content: AssignmentContent): void {
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

    console.log('✅ Assignment content rendered:', this.content.type);
  }

  /**
   * Render nested hierarchical assignments (Topic > Objective > Task > Areas)
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
        topic.title || `Assignment Topic ${topicIndex + 1}`,
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
          objective.title || `Assignment Objective ${objIndex + 1}`,
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
          const taskContainer = this.createAssignmentTaskLevel(
            task,
            `Assignment Task ${taskIndex + 1}`,
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
            const instructionContainer = this.createAssignmentArea(
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

          // Student Area (with submission capabilities)
          if (task.areas.student_area !== undefined) {
            const studentContainer = this.createAssignmentArea(
              'Student Area',
              task.areas.student_area,
              area.x + 60,
              currentY,
              area.width - 60,
              areaHeight,
              this.config.levelColors!.areas,
              task
            );
            this.contentContainer.addChild(studentContainer);
            currentY += areaHeight + areaSpacing;
          }

          // Teacher Area (with grading capabilities)
          if (task.areas.teacher_area !== undefined) {
            const teacherContainer = this.createAssignmentArea(
              'Teacher Area',
              task.areas.teacher_area,
              area.x + 60,
              currentY,
              area.width - 60,
              areaHeight,
              this.config.levelColors!.areas,
              task
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

    console.log('📝 Nested assignment hierarchy rendered:', topics.length, 'topics');
  }

  /**
   * Create a nested level container (Topic, Objective)
   */
  private createNestedLevel(
    level: 'topic' | 'objective',
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
    const fontSize = level === 'topic' ? 14 : 12;
    const fontWeight = level === 'topic' ? 'bold' : 'bold';

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

    // Add level indicator with assignment-specific colors
    const indicator = new Graphics();
    indicator
      .rect(0, 0, 4, height)
      .fill({ 
        color: level === 'topic' ? 0xffc107 : 0xdc3545, // Yellow for topic, red for objective
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
   * Create assignment task level container with assignment metadata
   */
  private createAssignmentTaskLevel(
    task: AssignmentTask,
    title: string,
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: number
  ): Container {
    const container = new Container();
    container.label = 'assignment-task-container';

    // Create background
    const background = new Graphics();
    background
      .rect(0, 0, width, height)
      .fill({ color: backgroundColor, alpha: 0.8 })
      .stroke({ color: 0xdee2e6, width: 1 });

    // Create title text
    const titleText = new Text({
      text: task.title || title,
      style: {
        fontSize: 10,
        fill: 0x495057,
        fontFamily: this.config.textStyle!.fontFamily,
        fontWeight: 'normal' as any,
        align: 'left'
      }
    });

    titleText.anchor.set(0, 0.5);
    titleText.x = 8;
    titleText.y = height / 2;

    // Add assignment metadata
    const metadata: string[] = [];
    if (task.dueDate) metadata.push(`Due: ${task.dueDate}`);
    if (task.points) metadata.push(`${task.points} pts`);
    if (task.submissionType) metadata.push(`Type: ${task.submissionType}`);

    if (metadata.length > 0) {
      const metadataText = new Text({
        text: metadata.join(' • '),
        style: {
          fontSize: 8,
          fill: 0x6c757d,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'normal' as any,
          align: 'right'
        }
      });

      metadataText.anchor.set(1, 0.5);
      metadataText.x = width - 8;
      metadataText.y = height / 2;
      container.addChild(metadataText);
    }

    // Add status indicator
    const statusColor = this.getStatusColor(task.status);
    const statusIndicator = new Graphics();
    statusIndicator
      .rect(0, 0, 4, height)
      .fill({ color: statusColor, alpha: 1 });

    container.addChild(background);
    container.addChild(statusIndicator);
    container.addChild(titleText);

    container.x = x;
    container.y = y;

    return container;
  }

  /**
   * Get color for assignment status
   */
  private getStatusColor(status?: string): number {
    switch (status) {
      case 'not_started': return 0x6c757d; // Gray
      case 'in_progress': return 0xffc107; // Yellow
      case 'submitted': return 0x007bff;   // Blue
      case 'graded': return 0x28a745;      // Green
      default: return 0x6c757d;            // Gray
    }
  }

  /**
   * Create assignment area container with assignment-specific features
   */
  private createAssignmentArea(
    areaType: string,
    content: string,
    x: number,
    y: number,
    width: number,
    height: number,
    backgroundColor: number,
    task?: AssignmentTask
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

    // Add assignment-specific UI elements
    if (task && areaType === 'Student Area') {
      this.addStudentAreaFeatures(container, task, width, height);
    } else if (task && areaType === 'Teacher Area') {
      this.addTeacherAreaFeatures(container, task, width, height);
    }

    container.x = x;
    container.y = y;

    return container;
  }

  /**
   * Add student-specific features to assignment area
   */
  private addStudentAreaFeatures(container: Container, task: AssignmentTask, width: number, _height: number): void {
    // Submission status indicator
    if (task.status) {
      const statusText = new Text({
        text: `Status: ${task.status.replace('_', ' ')}`,
        style: {
          fontSize: 8,
          fill: this.getStatusColor(task.status),
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'bold' as any,
          align: 'right'
        }
      });

      statusText.anchor.set(1, 0);
      statusText.x = width - 8;
      statusText.y = 4;
      container.addChild(statusText);
    }

    // Due date reminder (if task has due date)
    if (task.dueDate) {
      const dueDateText = new Text({
        text: `Due: ${task.dueDate}`,
        style: {
          fontSize: 8,
          fill: 0x6c757d,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'normal' as any,
          align: 'right'
        }
      });

      dueDateText.anchor.set(1, 0);
      dueDateText.x = width - 8;
      dueDateText.y = 14;
      container.addChild(dueDateText);
    }
  }

  /**
   * Add teacher-specific features to assignment area
   */
  private addTeacherAreaFeatures(container: Container, task: AssignmentTask, width: number, _height: number): void {
    // Points indicator
    if (task.points) {
      const pointsText = new Text({
        text: `${task.points} points`,
        style: {
          fontSize: 8,
          fill: 0x495057,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'bold' as any,
          align: 'right'
        }
      });

      pointsText.anchor.set(1, 0);
      pointsText.x = width - 8;
      pointsText.y = 4;
      container.addChild(pointsText);
    }

    // Submission type indicator
    if (task.submissionType) {
      const typeText = new Text({
        text: `Type: ${task.submissionType}`,
        style: {
          fontSize: 8,
          fill: 0x6c757d,
          fontFamily: this.config.textStyle!.fontFamily,
          fontWeight: 'normal' as any,
          align: 'right'
        }
      });

      typeText.anchor.set(1, 0);
      typeText.x = width - 8;
      typeText.y = 14;
      container.addChild(typeText);
    }
  }

  /**
   * Render empty hierarchy placeholder
   */
  private renderEmptyHierarchy(area: { x: number; y: number; width: number; height: number }): void {
    const placeholderText = new Text({
      text: 'No assignment hierarchy defined.\nAdd assignment topics, objectives, and tasks to populate this section.',
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
      console.warn('⚠️ No column data provided for assignment columns');
      return;
    }

    const { fields, distribution, values } = this.content.columnData;
    const totalColumns = 12; // Bootstrap-style 12-column grid
    const columnWidth = area.width / totalColumns;
    const columnHeight = area.height;

    console.log('📊 Rendering assignment columns:', { fields, distribution, area });

    let currentX = area.x;

    fields.forEach((field, index) => {
      const colSpan = distribution[index] || 1;
      const colWidth = columnWidth * colSpan;
      
      // Create column background with assignment-specific styling
      const columnBg = new Graphics();
      columnBg
        .rect(currentX, area.y, colWidth, columnHeight)
        .fill({ color: 0xfff3cd, alpha: 0.6 }) // Light yellow for assignments
        .stroke({ color: 0xffeaa7, width: 1 });

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
          fill: 0x856404,
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

    console.log('✅ Assignment columns rendered:', fields.length, 'columns');
  }

  /**
   * Get user-friendly label for assignment field
   */
  private getFieldLabel(field: string): string {
    return getFieldLabel(field);
  }

  /**
   * Create empty assignment hierarchy for layout
   */
  public createEmptyHierarchy(): AssignmentHierarchy {
    return {
      topics: [
        {
          id: 'assignment-topic-1',
          title: '[Assignment Topic]',
          objectives: [
            {
              id: 'assignment-obj-1-1',
              title: '[Assignment Objective]',
              tasks: [
                {
                  id: 'assignment-task-1-1-1',
                  title: '[Assignment Task]',
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
   * Update assignment configuration
   */
  public updateConfig(updates: Partial<AssignmentConfig>): void {
    this.config = { ...this.config, ...updates };
    this.setupBackground();
    if (this.content) {
      this.renderContent();
    }
  }

  /**
   * Update assignment content
   */
  public updateContent(updates: Partial<AssignmentContent>): void {
    if (this.content) {
      this.content = { ...this.content, ...updates };
      this.renderContent();
    }
  }

  /**
   * Get assignment container for adding to parent
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * Get assignment region information
   */
  public getRegion(): LayoutRegion {
    return this.region;
  }

  /**
   * Get assignment configuration
   */
  public getConfig(): AssignmentConfig {
    return { ...this.config };
  }

  /**
   * Get current content
   */
  public getContent(): AssignmentContent | null {
    return this.content ? { ...this.content } : null;
  }

  /**
   * Hide/show assignment
   */
  public setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  /**
   * Check if assignment is visible
   */
  public isVisible(): boolean {
    return this.container.visible;
  }

  /**
   * Resize assignment (update region and re-render)
   */
  public resize(newRegion: LayoutRegion): void {
    this.region = newRegion;
    this.container.x = newRegion.x;
    this.container.y = newRegion.y;
    
    this.setupBackground();
    if (this.content) {
      this.renderContent();
    }

    console.log('📏 Assignment resized to:', { width: newRegion.width, height: newRegion.height });
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
   * Destroy assignment component
   */
  public destroy(): void {
    this.container.destroy({ children: true });
    this.content = null;
    this.background = null;
    console.log('🗑️ Assignment component destroyed');
  }
}
