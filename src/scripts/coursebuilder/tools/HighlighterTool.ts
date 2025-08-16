/**
 * Highlighter Tool
 * Authentic marker experience with professional colors and realistic behavior
 */

import { FederatedPointerEvent, Container, Graphics, Point } from "pixi.js";
import { BaseTool } from "./ToolInterface";
import {
 HIGHLIGHTER_COLORS,
 STROKE_SIZES,
 HIGHLIGHTER_CONSTANTS,
 hexToNumber,
} from "./SharedResources";

interface HighlighterSettings {
 color: string;
 size: number;
}

export class HighlighterTool extends BaseTool {
 public isDrawing: boolean = false;
 private currentStroke: Graphics | null = null;
 private lastPoint: Point = new Point(0, 0);
 private strokePoints: Point[] = [];

 constructor() {
 super("highlighter", "crosshair");
 this.settings = {
 color: HIGHLIGHTER_COLORS[0], // Start with classic yellow
 size: STROKE_SIZES.HIGHLIGHTER[1], // Start with 12px
 };
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 this.isDrawing = true;
 console.log(
 `🖍️ HIGHLIGHTER: Started highlighting at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
 );
 console.log(
 `🖍️ HIGHLIGHTER: Settings - Color: ${this.settings.color}, Size: ${this.settings.size}`,
 );

 // Create new graphics object for this stroke with authentic marker properties
 this.currentStroke = new Graphics();
 this.currentStroke.eventMode = "static";
 this.currentStroke.alpha = HIGHLIGHTER_CONSTANTS.FIXED_OPACITY; // Fixed opacity like real markers

 // Use local coordinates relative to the container
 const localPoint = container.toLocal(event.global);
 this.lastPoint.copyFrom(localPoint);
 this.strokePoints = [localPoint.clone()];

 console.log(
 `🖍️ HIGHLIGHTER: Container local point: (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`,
 );

 // Set stroke style with authentic marker characteristics
 const color = hexToNumber(this.settings.color);
 console.log(
 `🖍️ HIGHLIGHTER: Setting authentic marker stroke - color: ${color} (from ${this.settings.color}), width: ${this.settings.size}`,
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
 `🖍️ HIGHLIGHTER: Marker stroke started with authentic properties`,
 );
 }

 onPointerMove(event: FederatedPointerEvent, container: Container): void {
 // Only respond to move events when actively drawing
 if (!this.isDrawing || !this.currentStroke) return;

 // Use local coordinates relative to the container
 const localPoint = container.toLocal(event.global);

 // Implement stroke smoothing for authentic marker feel
 if (HIGHLIGHTER_CONSTANTS.STROKE_SMOOTHING) {
 const distance = Math.sqrt(
 Math.pow(localPoint.x - this.lastPoint.x, 2) +
 Math.pow(localPoint.y - this.lastPoint.y, 2),
 );

 // Only draw if we've moved a minimum distance (reduces jitter)
 if (distance < HIGHLIGHTER_CONSTANTS.MIN_DISTANCE) return;
 }

 console.log(
 `🖍️ HIGHLIGHTER: Highlighting to (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`,
 );

 // Add slight texture variation for authentic marker feel
 const opacityVariation =
 1 + (Math.random() - 0.5) * HIGHLIGHTER_CONSTANTS.TEXTURE_VARIATION;
 const adjustedOpacity = Math.max(
 0.3,
 Math.min(1, HIGHLIGHTER_CONSTANTS.FIXED_OPACITY * opacityVariation),
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
 `🖍️ HIGHLIGHTER: Finished marker stroke with ${this.strokePoints.length} points`,
 );

 // Apply final authentic marker properties
 if (this.currentStroke) {
 this.currentStroke.alpha = HIGHLIGHTER_CONSTANTS.FIXED_OPACITY;
 }
 }

 this.isDrawing = false;
 this.currentStroke = null;
 this.strokePoints = [];
 }

 updateSettings(settings: HighlighterSettings): void {
 this.settings = { ...this.settings, ...settings };
 }

 // Get available highlighter colors for UI
 static getAvailableColors(): string[] {
 return HIGHLIGHTER_COLORS;
 }

 // Get available highlighter sizes for UI
 static getAvailableStrokeSizes(): number[] {
 return STROKE_SIZES.HIGHLIGHTER;
 }

 // Get authentic marker opacity (fixed like real highlighters)
 static getMarkerOpacity(): number {
 return HIGHLIGHTER_CONSTANTS.FIXED_OPACITY;
 }
}
