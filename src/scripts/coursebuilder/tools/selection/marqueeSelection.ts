/**
 * Marquee Selection Functionality
 * Handles rectangle-based marquee selection of multiple objects
 */

import {
 Container,
 Graphics,
 Point,
 Rectangle,
} from "pixi.js";
import { SELECTION_CONSTANTS } from "../SharedResources";

export class MarqueeSelection {
 private isSelecting: boolean = false;
 private marqueeStart: Point = new Point(0, 0);
 private marqueeGraphics: Graphics | null = null;

 public startSelection(point: Point, container: Container): void {
 this.isSelecting = true;
 this.marqueeStart.copyFrom(point);
 
 // Create marquee graphics
 this.marqueeGraphics = new Graphics();
 container.addChild(this.marqueeGraphics);
 }

 public updateSelection(currentPoint: Point): void {
 if (!this.marqueeGraphics || !this.isSelecting) return;

 const x = Math.min(this.marqueeStart.x, currentPoint.x);
 const y = Math.min(this.marqueeStart.y, currentPoint.y);
 const width = Math.abs(currentPoint.x - this.marqueeStart.x);
 const height = Math.abs(currentPoint.y - this.marqueeStart.y);

 this.marqueeGraphics.clear();

 // Fill
 this.marqueeGraphics.rect(x, y, width, height);
 this.marqueeGraphics.fill({
 color: SELECTION_CONSTANTS.SELECTION_COLOR,
 alpha: SELECTION_CONSTANTS.MARQUEE_FILL_ALPHA,
 });

 // Border
 this.marqueeGraphics.stroke({
 width: SELECTION_CONSTANTS.SELECTION_LINE_WIDTH,
 color: SELECTION_CONSTANTS.SELECTION_COLOR,
 alpha: SELECTION_CONSTANTS.MARQUEE_STROKE_ALPHA,
 });
 }

 public completeSelection(container: Container): { objects: any[], marqueeBounds: Rectangle | null } {
 const selectedObjects: any[] = [];
 let marqueeBounds: Rectangle | null = null;
 
 if (this.marqueeGraphics && this.isSelecting) {
 const bounds = this.marqueeGraphics.getBounds();
 marqueeBounds = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);

 // Find objects within the marquee
 selectedObjects.push(...this.findObjectsInBounds(marqueeBounds, container));

 // Remove marquee graphics
 container.removeChild(this.marqueeGraphics);
 this.marqueeGraphics = null;
 }

 this.isSelecting = false;
 return { objects: selectedObjects, marqueeBounds };
 }

 public cancelSelection(container: Container): void {
 if (this.marqueeGraphics && this.marqueeGraphics.parent) {
 container.removeChild(this.marqueeGraphics);
 this.marqueeGraphics = null;
 }
 this.isSelecting = false;
 }

 private findObjectsInBounds(rect: Rectangle, container: Container): any[] {
 const objectsInBounds: any[] = [];
 
 container.children.forEach((child) => {
 const isSelectable = this.isSelectableObject(child);
 
 if (isSelectable) {
 const bounds = child.getBounds();
 // Check if rectangles intersect
 const intersects = !(rect.x > bounds.x + bounds.width || 
       rect.x + rect.width < bounds.x || 
       rect.y > bounds.y + bounds.height || 
       rect.y + rect.height < bounds.y);
 
 if (intersects) {
 objectsInBounds.push(child);
 }
 }
 });
 
 return objectsInBounds;
 }

 private isSelectableObject(object: any): boolean {
 // Skip selection graphics and handles
 if (object.name?.startsWith('selection-') || 
     object.name?.startsWith('transform-') ||
     object.name?.startsWith('marquee-')) {
 return false;
 }
 
 // Skip objects that are too large (likely UI elements or backgrounds)
 if (object.getBounds && typeof object.getBounds === 'function') {
 const bounds = object.getBounds();
 // Skip objects larger than reasonable drawing objects (e.g., > 400px in any dimension)
 if (bounds.width > 400 || bounds.height > 400) {
 return false;
 }
 }
 
 // Check for valid drawable objects
 return object.getBounds && typeof object.getBounds === 'function';
 }

 public get isActive(): boolean {
 return this.isSelecting;
 }
}
