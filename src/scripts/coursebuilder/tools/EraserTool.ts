/**
 * Eraser Tool
 * Precision brush-based deletion with professional visual feedback
 */

import { FederatedPointerEvent, Container, Graphics, Point } from "pixi.js";
import { BaseTool } from "./ToolInterface";
import { STROKE_SIZES } from "./SharedResources.js";
import { historyManager } from "../canvas/HistoryManager.js";

interface EraserSettings {
 size: number;
 mode: "brush" | "object"; // Brush mode for partial deletion, object mode for complete removal
}

export class EraserTool extends BaseTool {
 public isErasing: boolean = false;
 private lastErasePoint: Point = new Point(0, 0);
 private erasePreview: Graphics | null = null;

 constructor() {
 super("eraser", "none"); // Custom cursor
 this.settings = {
 size: STROKE_SIZES.ERASER[2], // Start with 20px
 mode: "brush", // Default to brush mode for precision
 };
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 this.isErasing = true;
 console.log(
 `🗑️ ERASER: Started precision erasing at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
 );
 console.log(
 `🗑️ ERASER: Settings - Size: ${this.settings.size}px, Mode: ${this.settings.mode}`,
 );

 const localPoint = container.toLocal(event.global);
 this.lastErasePoint.copyFrom(localPoint);

 this.eraseAtPoint(event, container);
 }

 onPointerMove(event: FederatedPointerEvent, container: Container): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 // Always update cursor position, even outside canvas bounds
 this.updateCursorPosition(event);

 // Show preview of what would be erased (only when inside canvas)
 if (this.isPointInsideCanvas(event, container)) {
 this.showErasePreview(event, container);
 } else {
 this.hideErasePreview();
 }

 // Only erase if we're actively erasing (mouse button is pressed) and inside canvas
 if (this.isErasing && this.isPointInsideCanvas(event, container)) {
 const localPoint = container.toLocal(event.global);

 // Brush mode: continuous erasing along the path
 if (this.settings.mode === "brush") {
 this.brushErase(this.lastErasePoint, localPoint, container);
 } else {
 this.eraseAtPoint(event, container);
 }

 this.lastErasePoint.copyFrom(localPoint);
 }
 }

 onPointerUp(): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 this.isErasing = false;
 this.hideErasePreview();
 }

 onActivate(): void {
 super.onActivate();
 this.createProfessionalEraserCursor();
 console.log(
 `�️ ERASER: Activated precision brush eraser - Size: ${this.settings.size}px, Mode: ${this.settings.mode}`,
 );
 }

 onDeactivate(): void {
 super.onDeactivate();
 this.isErasing = false;
 this.removeEraserCursor();
 this.hideErasePreview();
 }

 private eraseAtPoint(
 event: FederatedPointerEvent,
 container: Container,
 ): void {
 const globalPoint = event.global;
 const eraserRadius = this.settings.size / 2;

 console.log(
 `🗑️ ERASER: Precision erasing at point (${Math.round(globalPoint.x)}, ${Math.round(globalPoint.y)}) with radius ${eraserRadius}px`,
 );

 // Check all objects in the container
 for (let i = container.children.length - 1; i >= 0; i--) {
 const child = container.children[i];

 // LAYOUT PROTECTION: Skip protected objects
 if (this.isProtectedObject(child)) {
 continue;
 }

 // Get accurate bounds
 const bounds = child.getBounds();

 // Enhanced collision detection for precision
 if (
 this.precisionCollisionDetection(
 globalPoint.x,
 globalPoint.y,
 eraserRadius,
 bounds.x,
 bounds.y,
 bounds.width,
 bounds.height,
 )
 ) {
 console.log(
 `🗑️ ERASER: Removing object (${child.constructor.name}) at bounds (${Math.round(bounds.x)}, ${Math.round(bounds.y)}, ${Math.round(bounds.width)}x${Math.round(bounds.height)})`,
 );
 
 // Store data for history before removal
 const childRef = child;
 const parentContainer = container;
 const index = parentContainer.getChildIndex(child);
 
         // Use DisplayObjectManager.remove() if available for proper layer panel sync
         if (this.displayManager && (this.displayManager as any).remove) {
           (this.displayManager as any).remove(child);
         } else {
           container.removeChild(child);
           // Don't destroy immediately - keep object alive for undo functionality
         } // Add history entry for eraser action
 try {
   historyManager.push({
     label: 'Erase Object',
     undo: () => {
       try {
         // Re-add to display
         if (index >= 0 && index <= parentContainer.children.length) {
           parentContainer.addChildAt(childRef, Math.min(index, parentContainer.children.length));
         } else {
           parentContainer.addChild(childRef);
         }
         
         // Re-register with DisplayObjectManager
         if (this.displayManager && (this.displayManager as any).add) {
           (this.displayManager as any).add(childRef, parentContainer);
         }
       } catch (error) {
         console.warn('Failed to undo eraser action:', error);
       }
     },
     redo: () => {
       try {
         // Remove again (but don't destroy - we might need to undo again)
         if (this.displayManager && (this.displayManager as any).remove) {
           (this.displayManager as any).remove(childRef);
         } else if (childRef.parent) {
           childRef.parent.removeChild(childRef);
           // Don't destroy here - keep object alive for potential future undo
         }
       } catch (error) {
         console.warn('Failed to redo eraser action:', error);
       }
     }
   });
 } catch (error) {
   console.warn('Failed to add eraser action to history:', error);
 }
 }
 }
 }

 private brushErase(
 fromPoint: Point,
 toPoint: Point,
 container: Container,
 ): void {
 // Create a path between the two points and erase along it
 const distance = Math.sqrt(
 Math.pow(toPoint.x - fromPoint.x, 2) +
 Math.pow(toPoint.y - fromPoint.y, 2),
 );

 // Sample points along the path for smooth erasing
 const steps = Math.max(1, Math.floor(distance / 5)); // Every 5 pixels

 for (let i = 0; i <= steps; i++) {
 const t = i / steps;
 const x = fromPoint.x + (toPoint.x - fromPoint.x) * t;
 const y = fromPoint.y + (toPoint.y - fromPoint.y) * t;

 // Convert to global coordinates for erasing
 const globalPoint = container.toGlobal({ x, y });
 const mockEvent = {
 global: globalPoint,
 client: globalPoint,
 } as FederatedPointerEvent;

 this.eraseAtPoint(mockEvent, container);
 }
 }

 private showErasePreview(
 event: FederatedPointerEvent,
 container: Container,
 ): void {
 // Ensure preview graphic exists and hasn't been destroyed
 if (!this.erasePreview || this.erasePreview.destroyed) {
 this.erasePreview = new Graphics();
 this.erasePreview.alpha = 0.3;
 container.addChild(this.erasePreview);
 }

 if (!this.erasePreview) {
 return; // bail out if creation somehow failed
 }

 const localPoint = container.toLocal(event.global);
 const radius = this.settings.size / 2;

 // Clear any previous preview and draw the current one
 this.erasePreview.clear();
 this.erasePreview.circle(localPoint.x, localPoint.y, radius);
 this.erasePreview.fill({ color: 0xff4444 }); // Red preview
 this.erasePreview.stroke({ width: 1, color: 0xff0000 });
 }

 private hideErasePreview(): void {
 if (this.erasePreview) {
 // Remove from display list if still attached
 if (this.erasePreview.parent) {
 this.erasePreview.parent.removeChild(this.erasePreview);
 }
 // Destroy the graphics object to avoid invalid references
 this.erasePreview.destroy();
 this.erasePreview = null;
 }
 }

 private isProtectedObject(child: any): boolean {
 // LAYOUT PROTECTION: Skip objects that have layout-related names or are system objects
 if (
 child.name &&
 (child.name.includes("layout-") ||
 child.name.includes("grid-") ||
 child.name.includes("background-") ||
 child.name.includes("system-"))
 ) {
 return true;
 }

 // Skip objects with special tags
 if (child.tag && child.tag.includes("protected")) {
 return true;
 }

 return false;
 }

 private precisionCollisionDetection(
 circleX: number,
 circleY: number,
 radius: number,
 rectX: number,
 rectY: number,
 rectWidth: number,
 rectHeight: number,
 ): boolean {
 // Enhanced collision detection for better precision

 // Handle zero-width or zero-height objects
 if (rectWidth <= 0 || rectHeight <= 0) {
 return false;
 }

 // Find the closest point to the circle within the rectangle
 const closestX = Math.max(rectX, Math.min(circleX, rectX + rectWidth));
 const closestY = Math.max(rectY, Math.min(circleY, rectY + rectHeight));

 // Calculate the distance between the circle's center and this closest point
 const distanceX = circleX - closestX;
 const distanceY = circleY - closestY;

 // If the distance is less than the circle's radius, an intersection occurs
 const distanceSquared = distanceX * distanceX + distanceY * distanceY;
 return distanceSquared <= radius * radius;
 }

 private createProfessionalEraserCursor(): void {
 // Create a professional visual cursor for the eraser
 const cursorElement = document.createElement("div");
 cursorElement.style.position = "fixed";
 cursorElement.style.pointerEvents = "none";
 cursorElement.style.zIndex = "10000";
 cursorElement.style.width = `${this.settings.size}px`;
 cursorElement.style.height = `${this.settings.size}px`;
 cursorElement.style.border = "2px solid #ff6b6b";
 cursorElement.style.borderRadius = "50%";
 cursorElement.style.backgroundColor = "rgba(255, 107, 107, 0.15)";
 cursorElement.style.boxShadow = "0 0 8px rgba(255, 107, 107, 0.3)";
 cursorElement.style.transform = "translate(-50%, -50%)";
 cursorElement.style.transition = "opacity 0.2s ease"; // Smooth fade
 cursorElement.id = "precision-eraser-cursor";

 // Add inner dot for precision
 const innerDot = document.createElement("div");
 innerDot.style.position = "absolute";
 innerDot.style.top = "50%";
 innerDot.style.left = "50%";
 innerDot.style.width = "2px";
 innerDot.style.height = "2px";
 innerDot.style.backgroundColor = "#ff0000";
 innerDot.style.borderRadius = "50%";
 innerDot.style.transform = "translate(-50%, -50%)";
 cursorElement.appendChild(innerDot);

 // Add mode indicator
 cursorElement.title = `🗑️ Precision Eraser - ${this.settings.mode} mode, ${this.settings.size}px`;

 document.body.appendChild(cursorElement);

 // Hide default cursor on the entire document when eraser is active
 document.body.style.cursor = "none";
 
 }

 private updateCursorPosition(event: FederatedPointerEvent): void {
 const cursorElement = document.getElementById("precision-eraser-cursor");
 if (cursorElement) {
 cursorElement.style.left = `${event.client.x}px`;
 cursorElement.style.top = `${event.client.y}px`;
 
 // Show/hide cursor based on canvas bounds
 const canvasElement = document.querySelector("canvas");
 if (canvasElement) {
 const canvasRect = canvasElement.getBoundingClientRect();
 const isInsideCanvas = (
 event.client.x >= canvasRect.left &&
 event.client.x <= canvasRect.right &&
 event.client.y >= canvasRect.top &&
 event.client.y <= canvasRect.bottom
 );
 
 cursorElement.style.opacity = isInsideCanvas ? "1" : "0.3";
 }
 }
 }

 /**
 * Check if a point is inside the canvas bounds
 */
 private isPointInsideCanvas(event: FederatedPointerEvent, _container: Container): boolean {
 const canvasElement = document.querySelector("canvas");
 if (!canvasElement) return true; // If no canvas found, assume inside
 
 const canvasRect = canvasElement.getBoundingClientRect();
 return (
 event.client.x >= canvasRect.left &&
 event.client.x <= canvasRect.right &&
 event.client.y >= canvasRect.top &&
 event.client.y <= canvasRect.bottom
 );
 }

 private removeEraserCursor(): void {
 const cursorElement = document.getElementById("precision-eraser-cursor");
 if (cursorElement) {
 cursorElement.remove();
 }

 // Reset cursor
 document.body.style.cursor = "default";

 const canvasContainer = document.querySelector(
 ".coursebuilder__canvas",
 ) as HTMLElement;
 if (canvasContainer) {
 canvasContainer.style.cursor = "default";
 }
 }

 setMode(mode: "brush" | "object"): void {
 this.settings.mode = mode;

 // Update cursor tooltip
 const cursorElement = document.getElementById("precision-eraser-cursor");
 if (cursorElement) {
 cursorElement.title = `🗑️ Precision Eraser - ${mode} mode, ${this.settings.size}px`;
 }
 }

 updateSettings(settings: EraserSettings): void {
 this.settings = { ...this.settings, ...settings };

 // Update cursor size if it exists
 const cursorElement = document.getElementById("precision-eraser-cursor");
 if (cursorElement) {
 cursorElement.style.width = `${this.settings.size}px`;
 cursorElement.style.height = `${this.settings.size}px`;
 cursorElement.title = `🗑️ Precision Eraser - ${this.settings.mode} mode, ${this.settings.size}px`;
 }
 }

 // Get available eraser sizes for UI
 static getAvailableEraserSizes(): number[] {
 return STROKE_SIZES.ERASER;
 }

 // Get available eraser modes
 static getEraserModes(): string[] {
 return ["brush", "object"];
 }

 // Get eraser mode display names
 static getEraserModeNames(): { [key: string]: string } {
 return {
 brush: "Brush Mode (Continuous)",
 object: "Object Mode (Click to Delete)",
 };
 }
}
