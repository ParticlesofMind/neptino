/**
 * Object Scaling/Resizing Functionality  
 * Handles corner and edge-based scaling/resizing of selected objects
 * 
 * Note: Stroke width preservation during scaling is a complex problem in PixiJS.
 * Currently, stroke widths will scale proportionally with the object. 
 * Full stroke preservation would require recreating Graphics objects with adjusted stroke widths.
 */

import { Point, Rectangle } from "pixi.js";
import { SelectionState } from "./types";
import { BoundaryUtils } from "../BoundaryUtils";

export class ScaleObjects {
 private state: SelectionState;

 constructor(state: SelectionState) {
 this.state = state;
 }

 public updateTransform(currentPoint: Point): void {
        if (!this.state.activeHandle || !this.state.selectionGroup) return;
        if (this.state.activeHandle.type === "rotation") return; // Handled by rotation module

        // Use fresh bounds calculation instead of stored bounds to ensure accuracy
        const bounds = this.calculateCombinedBounds(this.state.selectedObjects);
        const dx = currentPoint.x - this.state.transformStart.x;
        const dy = currentPoint.y - this.state.transformStart.y; if (this.state.activeHandle.type === "corner") {
 this.scaleFromCorner(dx, dy, this.state.activeHandle.position, bounds);
 } else if (this.state.activeHandle.type === "edge") {
 this.scaleFromEdge(dx, dy, this.state.activeHandle.position, bounds);
 }

 this.state.transformStart.copyFrom(currentPoint);
 }

 private scaleFromCorner(dx: number, dy: number, corner: string, bounds: Rectangle): void {
 if (this.state.selectedObjects.length === 0) return;

 const anchorPoint = this.calculateCornerAnchorPoint(corner, bounds);
 const scaleFactors = this.calculateCornerScaleFactors(dx, dy, corner, bounds);
 const constrainedScale = this.applyScaleConstraints(scaleFactors, bounds);
 
 this.applyScaleTransformation(constrainedScale, anchorPoint);
 }

 private calculateCornerAnchorPoint(corner: string, bounds: Rectangle): Point {
 const anchorPoint = new Point();
 
 switch (corner) {
 case "tl": // Top-left corner
 anchorPoint.x = bounds.x + bounds.width;  // Anchor at bottom-right
 anchorPoint.y = bounds.y + bounds.height;
 break;
 case "tr": // Top-right corner
 anchorPoint.x = bounds.x;                 // Anchor at bottom-left
 anchorPoint.y = bounds.y + bounds.height;
 break;
 case "bl": // Bottom-left corner
 anchorPoint.x = bounds.x + bounds.width;  // Anchor at top-right
 anchorPoint.y = bounds.y;
 break;
 case "br": // Bottom-right corner
 anchorPoint.x = bounds.x;                 // Anchor at top-left
 anchorPoint.y = bounds.y;
 break;
 default:
 anchorPoint.x = bounds.x + bounds.width / 2;
 anchorPoint.y = bounds.y + bounds.height / 2;
 }
 
 return anchorPoint;
 }

 private calculateCornerScaleFactors(dx: number, dy: number, corner: string, bounds: Rectangle): Point {
 const scaleFactors = new Point(1, 1);
 
 switch (corner) {
 case "tl": // Top-left corner
 scaleFactors.x = 1 - dx / bounds.width;
 scaleFactors.y = 1 - dy / bounds.height;
 break;
 case "tr": // Top-right corner
 scaleFactors.x = 1 + dx / bounds.width;
 scaleFactors.y = 1 - dy / bounds.height;
 break;
 case "bl": // Bottom-left corner
 scaleFactors.x = 1 - dx / bounds.width;
 scaleFactors.y = 1 + dy / bounds.height;
 break;
 case "br": // Bottom-right corner
 scaleFactors.x = 1 + dx / bounds.width;
 scaleFactors.y = 1 + dy / bounds.height;
 break;
 }
 
 return scaleFactors;
 }

 private applyScaleConstraints(scaleFactors: Point, bounds: Rectangle): Point {
 // Calculate minimum scale based on canvas size and object bounds
 const minPixelSize = 10; // Minimum 10px size
 const minScaleX = minPixelSize / bounds.width;
 const minScaleY = minPixelSize / bounds.height;
 
 // Calculate maximum scale to keep within canvas bounds
 const canvasBounds = BoundaryUtils.getCanvasBoundsWithGlobalMargins();
 const maxScale = BoundaryUtils.getMaxAllowedScale(bounds, canvasBounds);
 
 // Apply all constraints: minimum scale, minimum size, and canvas boundaries
 const constrainedScale = new Point();
 constrainedScale.x = Math.max(0.2, minScaleX, Math.min(maxScale.scaleX, scaleFactors.x));
 constrainedScale.y = Math.max(0.2, minScaleY, Math.min(maxScale.scaleY, scaleFactors.y));
 
 return constrainedScale;
 }

 private applyScaleTransformation(scaleFactors: Point, anchorPoint: Point): void {
 this.state.selectedObjects.forEach(obj => {
 if (obj.scale && obj.position) {
 // Store original stroke width if not already stored
 this.preserveStrokeWidth(obj);

         // Check if object is rotated - if so, handle differently
         if (Math.abs(obj.rotation) > 0.01) { // Small threshold to handle floating point precision
           this.scaleRotatedObject(obj, scaleFactors, anchorPoint);
         } else {
           this.scaleNormalObject(obj, scaleFactors, anchorPoint);
         } // Adjust stroke width to maintain visual consistency
 this.adjustStrokeWidth(obj);
 }
 });
 }

 /**
  * Scale a non-rotated object using the original method
  */
 private scaleNormalObject(obj: any, scaleFactors: Point, anchorPoint: Point): void {
 // Calculate object's position relative to the anchor point
 const relativeX = obj.position.x - anchorPoint.x;
 const relativeY = obj.position.y - anchorPoint.y;

 // Apply scale to object size
 obj.scale.x = Math.abs(obj.scale.x * scaleFactors.x);
 obj.scale.y = Math.abs(obj.scale.y * scaleFactors.y);

 // Adjust position based on anchor point (this keeps the anchor stable)
 obj.position.x = anchorPoint.x + relativeX * scaleFactors.x;
 obj.position.y = anchorPoint.y + relativeY * scaleFactors.y;
 }

 /**
  * Scale a rotated object by working in world coordinates
  */
 private scaleRotatedObject(obj: any, scaleFactors: Point, anchorPoint: Point): void {
 // For rotated objects, we need to:
 // 1. Get the object's world bounds (which include rotation)
 // 2. Calculate scaling relative to world coordinates
 // 3. Apply scaling while preserving the rotation

 // Get world position (accounting for pivot offset)
 const worldBounds = obj.getBounds();
 const worldCenterX = worldBounds.x + worldBounds.width / 2;
 const worldCenterY = worldBounds.y + worldBounds.height / 2;

 // Calculate relative position from anchor to world center
 const relativeX = worldCenterX - anchorPoint.x;
 const relativeY = worldCenterY - anchorPoint.y;

 // Apply scale to object size
 obj.scale.x = Math.abs(obj.scale.x * scaleFactors.x);
 obj.scale.y = Math.abs(obj.scale.y * scaleFactors.y);

 // Calculate new world center position
 const newWorldCenterX = anchorPoint.x + relativeX * scaleFactors.x;
 const newWorldCenterY = anchorPoint.y + relativeY * scaleFactors.y;

 // Convert back to object position (accounting for pivot)
 // For rotated objects, the position needs to be adjusted for pivot offset
 const pivotOffsetX = obj.pivot.x * obj.scale.x;
 const pivotOffsetY = obj.pivot.y * obj.scale.y;
 
 // Apply rotation transform to pivot offset
 const cos = Math.cos(obj.rotation);
 const sin = Math.sin(obj.rotation);
 const rotatedPivotOffsetX = pivotOffsetX * cos - pivotOffsetY * sin;
 const rotatedPivotOffsetY = pivotOffsetX * sin + pivotOffsetY * cos;

 obj.position.x = newWorldCenterX - rotatedPivotOffsetX;
 obj.position.y = newWorldCenterY - rotatedPivotOffsetY;
 }

 private scaleFromEdge(dx: number, dy: number, edge: string, bounds: Rectangle): void {
 if (this.state.selectedObjects.length === 0) return;

 const anchorPoint = this.calculateEdgeAnchorPoint(edge, bounds);
 const scaleFactors = this.calculateEdgeScaleFactors(dx, dy, edge, bounds);
 const constrainedScale = this.applyScaleConstraints(scaleFactors, bounds);
 
 this.applyScaleTransformation(constrainedScale, anchorPoint);
 }

 private calculateEdgeAnchorPoint(edge: string, bounds: Rectangle): Point {
 const anchorPoint = new Point();
 
 switch (edge) {
 case "t": // Top edge
 anchorPoint.x = bounds.x + bounds.width / 2;
 anchorPoint.y = bounds.y + bounds.height;
 break;
 case "r": // Right edge
 anchorPoint.x = bounds.x;
 anchorPoint.y = bounds.y + bounds.height / 2;
 break;
 case "b": // Bottom edge
 anchorPoint.x = bounds.x + bounds.width / 2;
 anchorPoint.y = bounds.y;
 break;
 case "l": // Left edge
 anchorPoint.x = bounds.x + bounds.width;
 anchorPoint.y = bounds.y + bounds.height / 2;
 break;
 default:
 anchorPoint.x = bounds.x + bounds.width / 2;
 anchorPoint.y = bounds.y + bounds.height / 2;
 }
 
 return anchorPoint;
 }

 private calculateEdgeScaleFactors(dx: number, dy: number, edge: string, bounds: Rectangle): Point {
 const scaleFactors = new Point(1, 1);
 
 switch (edge) {
 case "t": // Top edge
 scaleFactors.y = 1 - dy / bounds.height;
 break;
 case "r": // Right edge
 scaleFactors.x = 1 + dx / bounds.width;
 break;
 case "b": // Bottom edge
 scaleFactors.y = 1 + dy / bounds.height;
 break;
 case "l": // Left edge
 scaleFactors.x = 1 - dx / bounds.width;
 break;
 }
 
 return scaleFactors;
 }

 /**
 * Handle dragging/moving objects
 */
 public updateDrag(currentPoint: Point): void {
 if (this.state.selectedObjects.length === 0) return;

 const dx = currentPoint.x - this.state.transformStart.x;
 const dy = currentPoint.y - this.state.transformStart.y;

 // 🎯 BOUNDARY ENFORCEMENT: Calculate new positions and clamp them
 const canvasBounds = BoundaryUtils.getCanvasBoundsWithGlobalMargins();
 
 // Calculate the combined bounds of all selected objects to constrain as a group
 const combinedBounds = this.calculateCombinedBounds(this.state.selectedObjects);
 const newX = combinedBounds.x + dx;
 const newY = combinedBounds.y + dy;
 
 // Clamp the group position to keep it within canvas bounds
 const clampedX = Math.max(canvasBounds.left, 
                          Math.min(canvasBounds.right - combinedBounds.width, newX));
 const clampedY = Math.max(canvasBounds.top, 
                          Math.min(canvasBounds.bottom - combinedBounds.height, newY));
 
 // Calculate the actual allowed movement delta
 const clampedDx = clampedX - combinedBounds.x;
 const clampedDy = clampedY - combinedBounds.y;
 
 // Apply the clamped movement to all selected objects
 this.state.selectedObjects.forEach(obj => {
 if (obj.position) {
 obj.position.x += clampedDx;
 obj.position.y += clampedDy;
 }
 });

 // Update transform start with the clamped position
 this.state.transformStart.x += clampedDx;
 this.state.transformStart.y += clampedDy;
 }

 /**
 * Programmatically scale selected objects by specific factors
 */
 public scaleSelectedObjects(scaleX: number, scaleY: number): void {
 if (this.state.selectedObjects.length === 0) return;

 // Calculate center point of selection as anchor
 const bounds = this.calculateCombinedBounds(this.state.selectedObjects);
 const centerPoint = new Point(
 bounds.x + bounds.width / 2,
 bounds.y + bounds.height / 2
 );
 
 const scaleFactors = new Point(scaleX, scaleY);
 this.applyScaleTransformation(scaleFactors, centerPoint);
 }

 private calculateCombinedBounds(objects: any[]): Rectangle {
 if (objects.length === 0) return new Rectangle(0, 0, 0, 0);

 let minX = Infinity;
 let minY = Infinity;
 let maxX = -Infinity;
 let maxY = -Infinity;

 objects.forEach(obj => {
 const bounds = obj.getBounds();
 minX = Math.min(minX, bounds.x);
 minY = Math.min(minY, bounds.y);
 maxX = Math.max(maxX, bounds.x + bounds.width);
 maxY = Math.max(maxY, bounds.y + bounds.height);
 });

 return new Rectangle(minX, minY, maxX - minX, maxY - minY);
 }

 /**
 * Store stroke width preservation data for Graphics objects
 */
 private preserveStrokeWidth(obj: any): void {
 // Skip if not a Graphics object or if we've already processed it
 if (obj.constructor.name !== 'Graphics' || obj._strokeWidthPreservationAttempted) return;
 
 // Mark that we've attempted preservation on this object
 obj._strokeWidthPreservationAttempted = true;
 obj._originalScale = { x: Math.abs(obj.scale.x), y: Math.abs(obj.scale.y) };
 
 // Try to enable any built-in stroke scaling prevention
 if (obj.geometry && typeof obj.geometry.setScaleMode === 'function') {
 obj.geometry.setScaleMode(false); // Disable scaling for geometry if available
 }
 }

 /**
 * Log scaling information for stroke width debugging
 */
 private adjustStrokeWidth(obj: any): void {
 if (!obj._strokeWidthPreservationAttempted || obj.constructor.name !== 'Graphics') return;
 
 const currentScaleX = Math.abs(obj.scale.x);
 const currentScaleY = Math.abs(obj.scale.y);
 const originalScaleX = obj._originalScale.x;
 const originalScaleY = obj._originalScale.y;
 
 const scaleChangeX = currentScaleX / originalScaleX;
 const scaleChangeY = currentScaleY / originalScaleY;
 const averageScaleChange = (scaleChangeX + scaleChangeY) / 2;
 
 // Log significant scale changes that will affect stroke width
 if (Math.abs(averageScaleChange - 1.0) > 0.1) { // 10% threshold
 // Note: Graphics stroke width will change proportionally with scale
 }
 }
}
