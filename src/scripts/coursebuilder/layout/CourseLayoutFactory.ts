/**
 * Course Layout Factory
 * Orchestrates layout creation by coordinating all layout components
 * This is the main interface that replaces the monolithic LayoutManager
 */

import type { CourseLayout, CanvasLayout, LayoutBlock } from './LayoutTypes';
import { LayoutCalculator } from './LayoutCalculator';
import { CanvasNavigator } from './CanvasNavigator';
import { LayoutRenderer } from './LayoutRenderer';
import { DEFAULT_BLOCKS } from './LayoutTypes';
import { Container } from 'pixi.js';

export class CourseLayoutFactory {
  private canvasWidth: number;
  private canvasHeight: number;
  private navigator: CanvasNavigator;
  private renderer: LayoutRenderer | null = null;

  constructor(
    canvasWidth: number = 794, 
    canvasHeight: number = 1123,
    tocContainerId: string = 'coursebuilder__toc'
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.navigator = new CanvasNavigator(tocContainerId);
    
    console.log(`🏭 CourseLayoutFactory created with dimensions: ${this.canvasWidth}x${this.canvasHeight}`);
  }

  /**
   * Create complete course layout with all canvases
   */
  createCourseLayout(
    courseId: string,
    templateId: string,
    scheduledSessions: number,
    lessonDurationMinutes: number,
    customBlocks?: LayoutBlock[]
  ): CourseLayout {
    const blocks = customBlocks || DEFAULT_BLOCKS;
    const totalCanvases = LayoutCalculator.calculateTotalCanvases(scheduledSessions, lessonDurationMinutes);
    const lessonDuration = LayoutCalculator.determineLessonDuration(lessonDurationMinutes);

    console.log(`🏗️ Creating course layout: ${totalCanvases} canvases for ${scheduledSessions} sessions`);

    // Create all canvas layouts
    const canvases: CanvasLayout[] = [];
    let sessionNumber = 1;
    let canvasNumber = 1;

    for (let i = 0; i < totalCanvases; i++) {
      const canvas = this.createCanvasLayout(
        `${courseId}-canvas-${i + 1}`,
        sessionNumber,
        canvasNumber,
        blocks
      );
      canvases.push(canvas);

      // Update session and canvas numbers
      canvasNumber++;
      if (canvasNumber > lessonDuration.canvasMultiplier) {
        sessionNumber++;
        canvasNumber = 1;
      }
    }

    const courseLayout: CourseLayout = {
      id: `course-layout-${courseId}`,
      courseId,
      templateId,
      totalCanvases,
      scheduledSessions,
      lessonDuration,
      canvases
    };

    // Generate navigation
    this.navigator.generateNavigation(courseLayout);

    return courseLayout;
  }

  /**
   * Create layout for individual canvas
   */
  createCanvasLayout(
    canvasId: string,
    sessionNumber: number,
    canvasNumber: number,
    blocks: LayoutBlock[]
  ): CanvasLayout {
    const renderedBlocks = LayoutCalculator.calculateBlockPositions(
      blocks,
      this.canvasWidth,
      this.canvasHeight
    );

    return {
      id: canvasId,
      sessionNumber,
      canvasNumber,
      blocks: renderedBlocks
    };
  }

  /**
   * Initialize renderer with PixiJS container
   */
  initializeRenderer(layoutContainer: Container): void {
    this.renderer = new LayoutRenderer(layoutContainer);
  }

  /**
   * Render layout structure (requires renderer to be initialized)
   */
  renderLayout(canvasLayout: CanvasLayout, showLabels: boolean = true): void {
    if (!this.renderer) {
      throw new Error('Renderer not initialized. Call initializeRenderer() first.');
    }
    this.renderer.renderLayoutStructure(canvasLayout.blocks, showLabels);
  }

  /**
   * Get navigation instance
   */
  getNavigator(): CanvasNavigator {
    return this.navigator;
  }

  /**
   * Get renderer instance
   */
  getRenderer(): LayoutRenderer | null {
    return this.renderer;
  }

  /**
   * Update canvas dimensions
   */
  updateDimensions(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    console.log(`📐 Updated dimensions: ${width}x${height}`);
  }

  /**
   * Calculate total canvases (static utility)
   */
  static calculateTotalCanvases(scheduledSessions: number, lessonDurationMinutes: number): number {
    return LayoutCalculator.calculateTotalCanvases(scheduledSessions, lessonDurationMinutes);
  }
}
