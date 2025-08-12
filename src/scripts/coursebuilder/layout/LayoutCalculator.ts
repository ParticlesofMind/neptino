/**
 * Layout Calculator
 * Handles mathematical calculations for layout positioning and sizing
 * Pure functions - no state, no side effects
 */

import type {
  LayoutBlock,
  RenderedBlock,
  RenderedArea,
  LessonDuration,
} from "./LayoutTypes";
import { LESSON_DURATIONS } from "./LayoutTypes";

export class LayoutCalculator {
  /**
   * Calculate total canvases needed for a course
   */
  static calculateTotalCanvases(
    scheduledSessions: number,
    lessonDurationMinutes: number,
  ): number {
    const lessonDuration = this.determineLessonDuration(lessonDurationMinutes);
    return Math.ceil(scheduledSessions * lessonDuration.canvasMultiplier);
  }

  /**
   * Determine lesson duration type based on minutes
   */
  static determineLessonDuration(minutes: number): LessonDuration {
    return (
      LESSON_DURATIONS.find((duration) => minutes <= duration.maxMinutes) ||
      LESSON_DURATIONS[LESSON_DURATIONS.length - 1]
    );
  }

  /**
   * Calculate block positions within canvas
   */
  static calculateBlockPositions(
    blocks: LayoutBlock[],
    canvasWidth: number,
    canvasHeight: number,
    margins = { top: 40, bottom: 40, left: 60, right: 60 },
  ): RenderedBlock[] {
    const availableWidth = canvasWidth - margins.left - margins.right;
    const availableHeight = canvasHeight - margins.top - margins.bottom;
    let currentY = margins.top;

    return blocks.map((block) => {
      const blockHeight = (availableHeight * block.heightPercentage) / 100;

      // Header and Footer span full width, others use margin constraints
      const isFullWidth = block.id === "header" || block.id === "footer";
      const blockX = isFullWidth ? 0 : margins.left;
      const blockWidth = isFullWidth ? canvasWidth : availableWidth;
      const blockY = isFullWidth
        ? block.id === "header"
          ? 0
          : currentY
        : currentY;

      // Calculate canvas areas within the block
      const areas = this.calculateCanvasAreas(
        block,
        blockX,
        blockY,
        blockWidth,
        blockHeight,
      );

      const renderedBlock: RenderedBlock = {
        blockId: block.id,
        x: blockX,
        y: blockY,
        width: blockWidth,
        height: blockHeight,
        areas,
      };

      // Update Y position for next block
      if (block.id === "header") {
        currentY = blockHeight; // Next block starts after header
      } else if (block.id !== "footer") {
        currentY += blockHeight;
      }

      return renderedBlock;
    });
  }

  /**
   * Calculate canvas areas within a block
   */
  private static calculateCanvasAreas(
    block: LayoutBlock,
    blockX: number,
    blockY: number,
    blockWidth: number,
    blockHeight: number,
  ): RenderedArea[] {
    if (!block.canvasAreas || block.canvasAreas.length === 0) {
      return [];
    }

    const areaHeight = blockHeight / block.canvasAreas.length;

    return block.canvasAreas.map((area, index) => ({
      areaId: area.id,
      x: blockX + 10, // Small padding
      y: blockY + index * areaHeight + 10,
      width: blockWidth - 20,
      height: areaHeight - 20,
    }));
  }

  /**
   * Calculate canvas dimensions based on lesson type
   */
  static calculateCanvasDimensions(lessonDuration: LessonDuration): {
    width: number;
    height: number;
  } {
    // Base A4-like dimensions
    const baseWidth = 794;
    const baseHeight = 1123;

    // Adjust based on lesson duration if needed
    return {
      width: baseWidth,
      height: Math.floor(baseHeight * lessonDuration.canvasMultiplier),
    };
  }
}
