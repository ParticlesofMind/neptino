/**
 * Shapes Tool
 * Multi-geometry creation with professional styling and advanced shape options
 */

import { FederatedPointerEvent, Container, Graphics, Point } from "pixi.js";
import { BaseTool } from "./ToolInterface";
import {
 PROFESSIONAL_COLORS,
 STROKE_SIZES,
 hexToNumber,
} from "./SharedResources";
import { BoundaryUtils } from "./BoundaryUtils";

interface ShapesSettings {
 color: string;
 strokeWidth: number;
 fillColor?: string;
 fillEnabled: boolean;
 shapeType:
 | "rectangle"
 | "triangle"
 | "circle"
 | "ellipse"
 | "line"
 | "arrow"
 | "polygon";
 cornerRadius?: number; // For rounded rectangles
 sides?: number; // For polygons
}

export class ShapesTool extends BaseTool {
 private isDrawing: boolean = false;
 private currentShape: Graphics | null = null;
 private startPoint: Point = new Point(0, 0);
 private currentPoint: Point = new Point(0, 0);
 private isProportional: boolean = false;
 private boundKeyDown: (event: KeyboardEvent) => void;
 private boundKeyUp: (event: KeyboardEvent) => void;

 constructor() {
 super("shapes", "crosshair");
 this.settings = {
 color: PROFESSIONAL_COLORS[0], // Dark charcoal stroke
 strokeWidth: STROKE_SIZES.SHAPES[2], // 4px stroke
 fillColor: PROFESSIONAL_COLORS[13], // Light gray fill
 fillEnabled: false,
 shapeType: "rectangle",
 cornerRadius: 0,
 sides: 6, // For hexagon default
 };
 
 // Bind keyboard events for proportional drawing
 this.boundKeyDown = this.handleKeyDown.bind(this);
 this.boundKeyUp = this.handleKeyUp.bind(this);
 this.bindKeyboardEvents();
 
 console.log('🔶 SHAPES: Initialized with rectangle, triangle, and circle support');
 console.log(`🔶 SHAPES: Default settings - Color: ${this.settings.color}, Stroke: ${this.settings.strokeWidth}px, Fill: ${this.settings.fillEnabled ? 'enabled' : 'disabled'}`);
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 this.isDrawing = true;
 console.log(
 `🔶 SHAPES: Started drawing ${this.settings.shapeType} at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
 );
 console.log(
 `🔶 SHAPES: Settings - Color: ${this.settings.color}, Stroke: ${this.settings.strokeWidth}px, Fill: ${this.settings.fillEnabled ? this.settings.fillColor : "none"}`,
 );

 // Use local coordinates relative to the container
 const localPoint = container.toLocal(event.global);
 
 // 🚫 MARGIN PROTECTION: Prevent creation in margin areas
 const canvasBounds = this.manager.getCanvasBounds();
 if (!BoundaryUtils.isPointInContentArea(localPoint, canvasBounds)) {
 console.log(`🔷 SHAPES: 🚫 Click in margin area rejected - point (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)}) outside content area`);
 return; // Exit early - no creation allowed in margins
 }
 
 // Point is in content area, safe to proceed
 const clampedStartPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);
 
 this.startPoint.copyFrom(clampedStartPoint);
 this.currentPoint.copyFrom(clampedStartPoint);

 // Create new graphics object with professional styling
 this.currentShape = new Graphics();
 this.currentShape.eventMode = "static";

 container.addChild(this.currentShape);
 console.log(
 `🔶 SHAPES: Professional ${this.settings.shapeType} graphics object created`,
 );
 }

 onPointerMove(event: FederatedPointerEvent, container: Container): void {
 if (!this.isDrawing || !this.currentShape) return;

 // Use local coordinates relative to the container
 const localPoint = container.toLocal(event.global);
 
 // 🎯 BOUNDARY ENFORCEMENT: Clamp current point to canvas bounds
 const canvasBounds = this.manager.getCanvasBounds();
 const clampedCurrentPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);
 
 this.currentPoint.copyFrom(clampedCurrentPoint);

 // Check if shift key is pressed for proportional drawing
 this.isProportional = event.shiftKey;

 this.drawShape();
 }

 onPointerUp(): void {
 if (this.isDrawing && this.currentShape) {
 const width = this.currentPoint.x - this.startPoint.x;
 const height = this.currentPoint.y - this.startPoint.y;
 console.log(
 `🔶 SHAPES: Finished drawing professional ${this.settings.shapeType}${this.isProportional ? " (proportional)" : ""} - Final size: ${Math.round(Math.abs(width))}x${Math.round(Math.abs(height))}`,
 );
 
 // Log the final shape details
 if (this.currentShape.parent) {
 console.log(`🔶 SHAPES: Shape added to parent with ${this.currentShape.parent.children.length} total children`);
 } else {
 console.warn(`🔶 SHAPES: Shape not added to any parent!`);
 }
 }
 this.isDrawing = false;
 this.currentShape = null;
 this.isProportional = false;
 }

 /**
 * Bind keyboard events for proportional drawing
 */
 private bindKeyboardEvents(): void {
 document.addEventListener("keydown", this.boundKeyDown);
 document.addEventListener("keyup", this.boundKeyUp);
 }

 /**
 * Handle key down events
 */
 private handleKeyDown(event: KeyboardEvent): void {
 if (event.key === "Shift" && this.isDrawing) {
 this.isProportional = true;
 this.drawShape();
 }
 }

 /**
 * Handle key up events
 */
 private handleKeyUp(event: KeyboardEvent): void {
 if (event.key === "Shift" && this.isDrawing) {
 this.isProportional = false;
 this.drawShape();
 }
 }

 private drawShape(): void {
 if (!this.currentShape) return;

 // Clear previous drawing
 this.currentShape.clear();

 const strokeColor = hexToNumber(this.settings.color);
 let width = this.currentPoint.x - this.startPoint.x;
 let height = this.currentPoint.y - this.startPoint.y;

 // Apply proportional constraints if shift is held
 if (this.isProportional) {
 switch (this.settings.shapeType) {
 case "rectangle":
 // Make it a square by using the larger dimension
 const maxDim = Math.max(Math.abs(width), Math.abs(height));
 width = width >= 0 ? maxDim : -maxDim;
 height = height >= 0 ? maxDim : -maxDim;
 break;
 case "triangle":
 // Equilateral triangle - width should equal height
 height = Math.abs(width) * (height >= 0 ? 1 : -1);
 break;
 case "circle":
 // Circle is always proportional, no change needed
 break;
 }
 }

 // Apply stroke style
 const strokeStyle = {
 width: Math.max(this.settings.strokeWidth, 1), // Ensure minimum 1px stroke
 color: strokeColor,
 cap: "round" as const,
 join: "round" as const,
 };

 // Apply fill if enabled
 let fillStyle = undefined;
 if (this.settings.fillEnabled && this.settings.fillColor) {
 fillStyle = { color: hexToNumber(this.settings.fillColor) };
 }

 // Ensure the shape is actually drawn by checking dimensions
 const minSize = 5; // Minimum size to be visible
 if (Math.abs(width) < minSize || Math.abs(height) < minSize) {
 // Don't draw shapes that are too small to see
 return;
 }

 console.log(`🔶 SHAPES: Drawing ${this.settings.shapeType} - Width: ${Math.round(width)}, Height: ${Math.round(height)}, Stroke: ${strokeStyle.width}px, Color: ${this.settings.color}`);

 switch (this.settings.shapeType) {
 case "rectangle":
 this.drawRectangle(width, height, strokeStyle, fillStyle);
 break;

 case "triangle":
 this.drawTriangle(width, height, strokeStyle, fillStyle);
 break;

 case "circle":
 this.drawCircle(width, height, strokeStyle, fillStyle);
 break;

 case "ellipse":
 this.drawEllipse(width, height, strokeStyle, fillStyle);
 break;

 case "line":
 this.drawLine(strokeStyle);
 break;

 case "arrow":
 this.drawArrow(strokeStyle);
 break;

 case "polygon":
 this.drawPolygon(width, height, strokeStyle, fillStyle);
 break;
 }
 }

 private drawRectangle(
 width: number,
 height: number,
 strokeStyle: any,
 fillStyle: any,
 ): void {
 if (!this.currentShape) return;

 console.log(`🔶 SHAPES: Drawing rectangle at (${this.startPoint.x}, ${this.startPoint.y}) with size ${width}x${height}`);

 if (this.settings.cornerRadius && this.settings.cornerRadius > 0) {
 // Rounded rectangle
 this.currentShape.roundRect(
 this.startPoint.x,
 this.startPoint.y,
 width,
 height,
 this.settings.cornerRadius,
 );
 } else {
 // Standard rectangle
 this.currentShape.rect(
 this.startPoint.x,
 this.startPoint.y,
 width,
 height,
 );
 }

 if (fillStyle) {
 console.log(`🔶 SHAPES: Applying fill style:`, fillStyle);
 this.currentShape.fill(fillStyle);
 }
 console.log(`🔶 SHAPES: Applying stroke style:`, strokeStyle);
 this.currentShape.stroke(strokeStyle);
 }

 private drawTriangle(
 width: number,
 height: number,
 strokeStyle: any,
 fillStyle: any,
 ): void {
 if (!this.currentShape) return;

 // Equilateral triangle pointing up
 const topX = this.startPoint.x + width / 2;
 const topY = this.startPoint.y;
 const bottomLeftX = this.startPoint.x;
 const bottomLeftY = this.startPoint.y + height;
 const bottomRightX = this.startPoint.x + width;
 const bottomRightY = this.startPoint.y + height;

 this.currentShape
 .moveTo(topX, topY)
 .lineTo(bottomLeftX, bottomLeftY)
 .lineTo(bottomRightX, bottomRightY)
 .closePath();

 if (fillStyle) this.currentShape.fill(fillStyle);
 this.currentShape.stroke(strokeStyle);
 }

 private drawCircle(
 width: number,
 height: number,
 strokeStyle: any,
 fillStyle: any,
 ): void {
 if (!this.currentShape) return;

 // Perfect circle using the larger dimension
 const radius = Math.max(Math.abs(width), Math.abs(height)) / 2;
 const centerX = this.startPoint.x + width / 2;
 const centerY = this.startPoint.y + height / 2;

 console.log(`🔶 SHAPES: Drawing circle at center (${Math.round(centerX)}, ${Math.round(centerY)}) with radius ${Math.round(radius)}`);

 this.currentShape.circle(centerX, centerY, radius);

 if (fillStyle) {
 console.log(`🔶 SHAPES: Applying circle fill:`, fillStyle);
 this.currentShape.fill(fillStyle);
 }
 console.log(`🔶 SHAPES: Applying circle stroke:`, strokeStyle);
 this.currentShape.stroke(strokeStyle);
 }

 private drawEllipse(
 width: number,
 height: number,
 strokeStyle: any,
 fillStyle: any,
 ): void {
 if (!this.currentShape) return;

 const centerX = this.startPoint.x + width / 2;
 const centerY = this.startPoint.y + height / 2;
 const radiusX = Math.abs(width) / 2;
 const radiusY = Math.abs(height) / 2;

 this.currentShape.ellipse(centerX, centerY, radiusX, radiusY);

 if (fillStyle) this.currentShape.fill(fillStyle);
 this.currentShape.stroke(strokeStyle);
 }

 private drawLine(strokeStyle: any): void {
 if (!this.currentShape) return;

 this.currentShape
 .moveTo(this.startPoint.x, this.startPoint.y)
 .lineTo(this.currentPoint.x, this.currentPoint.y)
 .stroke(strokeStyle);
 }

 private drawArrow(strokeStyle: any): void {
 if (!this.currentShape) return;

 const dx = this.currentPoint.x - this.startPoint.x;
 const dy = this.currentPoint.y - this.startPoint.y;
 const angle = Math.atan2(dy, dx);
 const length = Math.sqrt(dx * dx + dy * dy);

 // Arrow head size
 const headLength = Math.min(20, length * 0.3);
 const headAngle = Math.PI / 6; // 30 degrees

 // Draw line
 this.currentShape
 .moveTo(this.startPoint.x, this.startPoint.y)
 .lineTo(this.currentPoint.x, this.currentPoint.y)
 .stroke(strokeStyle);

 // Draw arrow head
 const headX1 =
 this.currentPoint.x - headLength * Math.cos(angle - headAngle);
 const headY1 =
 this.currentPoint.y - headLength * Math.sin(angle - headAngle);
 const headX2 =
 this.currentPoint.x - headLength * Math.cos(angle + headAngle);
 const headY2 =
 this.currentPoint.y - headLength * Math.sin(angle + headAngle);

 this.currentShape
 .moveTo(this.currentPoint.x, this.currentPoint.y)
 .lineTo(headX1, headY1)
 .moveTo(this.currentPoint.x, this.currentPoint.y)
 .lineTo(headX2, headY2)
 .stroke(strokeStyle);
 }

 private drawPolygon(
 width: number,
 height: number,
 strokeStyle: any,
 fillStyle: any,
 ): void {
 if (!this.currentShape || !this.settings.sides || this.settings.sides < 3)
 return;

 const centerX = this.startPoint.x + width / 2;
 const centerY = this.startPoint.y + height / 2;
 const radius = Math.max(Math.abs(width), Math.abs(height)) / 2;
 const sides = this.settings.sides;

 // Generate polygon points
 const points: number[] = [];
 for (let i = 0; i < sides; i++) {
 const angle = (i * 2 * Math.PI) / sides - Math.PI / 2; // Start from top
 const x = centerX + radius * Math.cos(angle);
 const y = centerY + radius * Math.sin(angle);
 points.push(x, y);
 }

 this.currentShape.poly(points);

 if (fillStyle) this.currentShape.fill(fillStyle);
 this.currentShape.stroke(strokeStyle);
 }

 setShapeType(
 shapeType:
 | "rectangle"
 | "triangle"
 | "circle"
 | "ellipse"
 | "line"
 | "arrow"
 | "polygon",
 ): void {
 this.settings.shapeType = shapeType;
 }

 setCornerRadius(radius: number): void {
 this.settings.cornerRadius = Math.max(0, radius);
 }

 setPolygonSides(sides: number): void {
 this.settings.sides = Math.max(3, sides);
 }

 toggleFill(): void {
 this.settings.fillEnabled = !this.settings.fillEnabled;
 console.log(
 `🔶 SHAPES: Fill ${this.settings.fillEnabled ? "enabled" : "disabled"}`,
 );
 }

 updateSettings(settings: ShapesSettings): void {
 const previousShapeType = this.settings.shapeType;
 this.settings = { ...this.settings, ...settings };
 
 // Log shape type changes
 if (settings.shapeType && settings.shapeType !== previousShapeType) {
 console.log(`🔶 SHAPES: Shape type changed from ${previousShapeType} to ${settings.shapeType}`);
 }
 }

 // Get available colors for UI
 static getAvailableColors(): string[] {
 return PROFESSIONAL_COLORS;
 }

 // Get available stroke sizes for UI
 static getAvailableStrokeSizes(): number[] {
 return STROKE_SIZES.SHAPES;
 }

 // Get available shape types - prioritize basic shapes
 static getShapeTypes(): string[] {
 return [
 "rectangle",
 "triangle", 
 "circle",
 // Additional advanced shapes
 "ellipse",
 "line",
 "arrow",
 "polygon",
 ];
 }

 // Get shape type display names - emphasize basic shapes
 static getShapeTypeNames(): { [key: string]: string } {
 return {
 rectangle: "Rectangle",
 triangle: "Triangle", 
 circle: "Circle",
 ellipse: "Ellipse",
 line: "Line",
 arrow: "Arrow",
 polygon: "Polygon",
 };
 }

 /**
 * Cleanup method to remove event listeners
 */
 destroy(): void {
 document.removeEventListener("keydown", this.boundKeyDown);
 document.removeEventListener("keyup", this.boundKeyUp);
 }
}
