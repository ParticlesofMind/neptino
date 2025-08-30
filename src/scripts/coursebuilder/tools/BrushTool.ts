/**
 * Brush Tool
 * Authentic marker experience with professional colors and realistic behavior
 */

import { FederatedPointerEvent, Container, Graphics, Point } from "pixi.js";
import { BaseTool } from "./ToolInterface";
import {
 BRUSH_COLORS,
 STROKE_SIZES,
 BRUSH_CONSTANTS,
 hexToNumber,
} from "./SharedResources";
import { BoundaryUtils } from "./BoundaryUtils";

interface BrushSettings {
 color: string;
 size: number;
}

export class BrushTool extends BaseTool {
 public isDrawing: boolean = false;
 private currentStroke: Graphics | null = null;
 private lastPoint: Point = new Point(0, 0);
 private strokePoints: Point[] = [];

 constructor() {
         super("brush", "url('/src/assets/cursors/brush-cursor.svg') 3 21, crosshair");
 this.settings = {
 color: BRUSH_COLORS[0], // Start with classic yellow
 size: STROKE_SIZES.BRUSH[1], // Start with 12px
 };
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
  // 🔒 CRITICAL: Only respond if this tool is active
  if (!this.isActive) {
   return;
  }

  this.isDrawing = true;

  // Create new graphics object for this stroke with authentic marker properties
  this.currentStroke = new Graphics();
  this.currentStroke.eventMode = "static";
  this.currentStroke.alpha = BRUSH_CONSTANTS.FIXED_OPACITY; // Fixed opacity like real markers

  // Use local coordinates relative to the container
  const localPoint = container.toLocal(event.global);

  // 🚫 MARGIN PROTECTION: Prevent creation in margin areas
  const canvasBounds = this.manager.getCanvasBounds();
  if (!BoundaryUtils.isPointInContentArea(localPoint, canvasBounds)) {
   return; // Exit early - no creation allowed in margins
  }

  this.lastPoint.copyFrom(localPoint);
  this.strokePoints = [localPoint.clone()];

  // Set stroke style with authentic marker characteristics
  const color = hexToNumber(this.settings.color);

  // Start the drawing path - just moveTo, don't stroke yet
  this.currentStroke.moveTo(localPoint.x, localPoint.y);

  // Add to container
  container.addChild(this.currentStroke);
 }

 onPointerMove(event: FederatedPointerEvent, container: Container): void {
  // 🔒 CRITICAL: Only respond if this tool is active
  if (!this.isActive) {
    return;
  }

  // Only respond to move events when actively drawing
  if (!this.isDrawing || !this.currentStroke) return;

  // Use local coordinates relative to the container
  const localPoint = container.toLocal(event.global);

  // Implement stroke smoothing for authentic marker feel
  if (BRUSH_CONSTANTS.STROKE_SMOOTHING) {
  const distance = Math.sqrt(
  Math.pow(localPoint.x - this.lastPoint.x, 2) +
  Math.pow(localPoint.y - this.lastPoint.y, 2),
  );

  // Only draw if we've moved a minimum distance (reduces jitter)
  if (distance < BRUSH_CONSTANTS.MIN_DISTANCE) return;
  }

  // Clear the current stroke and redraw the entire path
  this.currentStroke.clear();

  // Redraw the entire path
  if (this.strokePoints.length > 0) {
  this.currentStroke.moveTo(this.strokePoints[0].x, this.strokePoints[0].y);

  for (let i = 1; i < this.strokePoints.length; i++) {
  this.currentStroke.lineTo(this.strokePoints[i].x, this.strokePoints[i].y);
  }

  // Add the current point
  this.currentStroke.lineTo(localPoint.x, localPoint.y);

  // Apply the stroke style
  this.currentStroke.stroke({
  width: this.settings.size,
  color: hexToNumber(this.settings.color),
  cap: "round",
  join: "round",
  });
  }

  // Add slight texture variation for authentic marker feel
  const opacityVariation =
  1 + (Math.random() - 0.5) * BRUSH_CONSTANTS.TEXTURE_VARIATION;
  const adjustedOpacity = Math.max(
  0.3,
  Math.min(1, BRUSH_CONSTANTS.FIXED_OPACITY * opacityVariation),
  );

  // Apply subtle opacity variation
  this.currentStroke.alpha = adjustedOpacity;

  // Update tracking
  this.lastPoint.copyFrom(localPoint);
  this.strokePoints.push(localPoint.clone());
 }

 onPointerUp(): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 if (this.isDrawing) {
  // Apply final authentic marker properties
  if (this.currentStroke) {
  this.currentStroke.alpha = BRUSH_CONSTANTS.FIXED_OPACITY;
  }
 }

 this.isDrawing = false;
 this.currentStroke = null;
 this.strokePoints = [];
 }

 updateSettings(settings: BrushSettings): void {
 this.settings = { ...this.settings, ...settings };
 }

 // Get available brush colors for UI
 static getAvailableColors(): string[] {
 return BRUSH_COLORS;
 }

 // Get available brush sizes for UI
 static getAvailableStrokeSizes(): number[] {
 return STROKE_SIZES.BRUSH;
 }

 // Get authentic marker opacity (fixed like real brushes)
 static getMarkerOpacity(): number {
 return BRUSH_CONSTANTS.FIXED_OPACITY;
 }
}
