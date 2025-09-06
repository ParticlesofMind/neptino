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
import { createHighQualityGraphics, alignToPixel } from "../utils/graphicsQuality";

interface BrushSettings {
 color: string;
 size: number;
}

export class BrushTool extends BaseTool {
  public isDrawing: boolean = false;
  private currentStroke: Graphics | null = null;
  private lastPoint: Point = new Point(0, 0);
  private strokePoints: Point[] = [];
  private constrainStart: Point | null = null; // anchor for shift-straight-line

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
   console.log('🖍️ BRUSH: Ignoring pointer down - tool not active');
   return;
 }

 this.isDrawing = true;

 // Create new graphics object for this stroke with authentic marker properties
 this.currentStroke = createHighQualityGraphics();
 this.currentStroke.eventMode = "static";
 this.currentStroke.alpha = BRUSH_CONSTANTS.FIXED_OPACITY; // Fixed opacity like real markers
  // Tag for selection-based option routing
  (this.currentStroke as any).__toolType = 'brush';

  // Use local coordinates relative to the container
  const localPoint = container.toLocal(event.global);

  // 🚫 MARGIN PROTECTION: Prevent creation in margin areas
  const canvasBounds = this.manager.getCanvasBounds();
  if (!BoundaryUtils.isPointInContentArea(localPoint, canvasBounds)) {
    console.log(`🖍️ BRUSH: 🚫 Click in margin area rejected - point (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)}) outside content area`);
    return; // Exit early - no creation allowed in margins
  }

  // Align coordinates for pixel-perfect rendering, then clamp to bounds
  const alignedPoint = { x: alignToPixel(localPoint.x), y: alignToPixel(localPoint.y) };
  const clampedAligned = BoundaryUtils.clampPoint(new Point(alignedPoint.x, alignedPoint.y), canvasBounds);

  this.lastPoint.copyFrom(clampedAligned);
  this.strokePoints = [new Point(clampedAligned.x, clampedAligned.y)];
  // If shift is held at stroke start, initialize constrain anchor
  this.constrainStart = (event as any).shiftKey ? new Point(clampedAligned.x, clampedAligned.y) : null;

 console.log(
 `🖍️ BRUSH: Container local point: (${Math.round(alignedPoint.x)}, ${Math.round(alignedPoint.y)})`,
 );

 // Set stroke style with authentic marker characteristics
 const color = hexToNumber(this.settings.color);
 console.log(
 `🖍️ BRUSH: Setting high-quality marker stroke - color: ${color} (from ${this.settings.color}), width: ${this.settings.size}`,
 );

 // Start the drawing path - just moveTo, don't stroke yet
 this.currentStroke.moveTo(clampedAligned.x, clampedAligned.y);

 // Add to container
 container.addChild(this.currentStroke);
 console.log(
 `🖍️ BRUSH: Marker stroke started at (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`,
 );
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
 // 🎯 Clamp to canvas bounds to prevent drawing into margins
 const canvasBoundsMove = this.manager.getCanvasBounds();
 let clampedLocal = BoundaryUtils.clampPoint(localPoint, canvasBoundsMove);
 // If shift is held, snap to straight line from constrainStart (or first point)
 const shiftHeld = (event as any).shiftKey === true;
 if (shiftHeld) {
   const anchor = this.constrainStart || (this.strokePoints.length > 0 ? this.strokePoints[0] : null);
   if (anchor) {
     const dx = clampedLocal.x - anchor.x;
     const dy = clampedLocal.y - anchor.y;
     const angle = Math.atan2(dy, dx);
     const step = Math.PI / 4; // 45-degree increments
     const snapped = Math.round(angle / step) * step;
     const dist = Math.hypot(dx, dy);
     clampedLocal = new Point(anchor.x + Math.cos(snapped) * dist, anchor.y + Math.sin(snapped) * dist);
     // Clamp the snapped point again to be safe
     clampedLocal = BoundaryUtils.clampPoint(clampedLocal, canvasBoundsMove);
   }
 } else {
   // If shift released, clear constrain anchor
   this.constrainStart = null;
 }

 // Implement stroke smoothing for authentic marker feel
 if (BRUSH_CONSTANTS.STROKE_SMOOTHING) {
 const distance = Math.sqrt(
   Math.pow(clampedLocal.x - this.lastPoint.x, 2) +
   Math.pow(clampedLocal.y - this.lastPoint.y, 2),
 );

 // Only draw if we've moved a minimum distance (reduces jitter)
 if (distance < BRUSH_CONSTANTS.MIN_DISTANCE) return;
 }

 console.log(
 `🖍️ BRUSH: Brushing to (${Math.round(clampedLocal.x)}, ${Math.round(clampedLocal.y)})`,
 );

 // Clear the current stroke and redraw the entire path
 this.currentStroke.clear();
 
 // Redraw the entire path
 if (this.strokePoints.length > 0) {
 this.currentStroke.moveTo(this.strokePoints[0].x, this.strokePoints[0].y);
 
 for (let i = 1; i < this.strokePoints.length; i++) {
 this.currentStroke.lineTo(this.strokePoints[i].x, this.strokePoints[i].y);
 }
 
 // Add the current point
 this.currentStroke.lineTo(clampedLocal.x, clampedLocal.y);
 
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
 this.lastPoint.copyFrom(clampedLocal);
 this.strokePoints.push(clampedLocal.clone());
 }

  onPointerUp(): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

  if (this.isDrawing) {
    console.log(
      `🖍️ BRUSH: Finished marker stroke with ${this.strokePoints.length} points`,
    );

    // Apply final authentic marker properties
    if (this.currentStroke) {
      this.currentStroke.alpha = BRUSH_CONSTANTS.FIXED_OPACITY;
      // Attach metadata for later re-styling via selection
      try {
        const pts = this.strokePoints.map(p => ({ x: p.x, y: p.y }));
        (this.currentStroke as any).__meta = {
          kind: 'brush',
          points: pts,
          size: this.settings.size,
          color: this.settings.color,
        };
      } catch {}
    }
  }

 this.isDrawing = false;
 this.currentStroke = null;
 this.strokePoints = [];
 this.constrainStart = null;
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
