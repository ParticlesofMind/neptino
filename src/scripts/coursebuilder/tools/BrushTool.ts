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
 super("brush", "crosshair");
 this.settings = {
 color: BRUSH_COLORS[0], // Start with classic yellow
 size: STROKE_SIZES.BRUSH[1], // Start with 12px
 };
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 this.isDrawing = true;

 // Create new graphics object for this stroke with authentic marker properties
 this.currentStroke = new Graphics();
 this.currentStroke.eventMode = "static";
 this.currentStroke.alpha = BRUSH_CONSTANTS.FIXED_OPACITY; // Fixed opacity like real markers

 // Use local coordinates relative to the container
 const localPoint = container.toLocal(event.global);
 this.lastPoint.copyFrom(localPoint);
 this.strokePoints = [localPoint.clone()];

 console.log(
 `🖍️ BRUSH: Container local point: (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`,
 );

 // Set stroke style with authentic marker characteristics
 const color = hexToNumber(this.settings.color);
 console.log(
 `🖍️ BRUSH: Setting authentic marker stroke - color: ${color} (from ${this.settings.color}), width: ${this.settings.size}`,
 );

 // Start the drawing path with marker-style properties
 this.currentStroke.moveTo(localPoint.x, localPoint.y).stroke({
 width: this.settings.size,
 color,
 cap: "round", // Authentic marker tip
 join: "round", // Smooth joins like real markers
 });

 // Add to container
 container.addChild(this.currentStroke);
 console.log(
 `🖍️ BRUSH: Marker stroke started with authentic properties`,
 );
 }

 onPointerMove(event: FederatedPointerEvent, container: Container): void {
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

 console.log(
 `🖍️ BRUSH: Brushing to (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`,
 );

 // Add slight texture variation for authentic marker feel
 const opacityVariation =
 1 + (Math.random() - 0.5) * BRUSH_CONSTANTS.TEXTURE_VARIATION;
 const adjustedOpacity = Math.max(
 0.3,
 Math.min(1, BRUSH_CONSTANTS.FIXED_OPACITY * opacityVariation),
 );

 // Continue the stroke with authentic marker characteristics
 this.currentStroke.lineTo(localPoint.x, localPoint.y).stroke({
 width: this.settings.size,
 color: hexToNumber(this.settings.color),
 cap: "round",
 join: "round",
 });

 // Apply subtle opacity variation
 this.currentStroke.alpha = adjustedOpacity;

 // Update tracking
 this.lastPoint.copyFrom(localPoint);
 this.strokePoints.push(localPoint.clone());
 }

 onPointerUp(): void {
 if (this.isDrawing) {
 console.log(
 `🖍️ BRUSH: Finished marker stroke with ${this.strokePoints.length} points`,
 );

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
