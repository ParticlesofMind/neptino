/**
 * Object Scaling/Resizing Functionality  
 * Handles corner and edge-based scaling/resizing of selected objects
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

 const bounds = this.state.selectionGroup.bounds;
 const dx = currentPoint.x - this.state.transformStart.x;
 const dy = currentPoint.y - this.state.transformStart.y;

 if (this.state.activeHandle.type === "corner") {
 this.performCornerResize(dx, dy, this.state.activeHandle.position, bounds);
 } else if (this.state.activeHandle.type === "edge") {
 this.performEdgeResize(dx, dy, this.state.activeHandle.position, bounds);
 }

 this.state.transformStart.copyFrom(currentPoint);
 }

 private performCornerResize(dx: number, dy: number, corner: string, bounds: Rectangle): void {
 if (this.state.selectedObjects.length === 0) return;

 // Calculate scale factors based on corner being dragged
 let scaleX = 1;
 let scaleY = 1;
 let pivotX = bounds.x + bounds.width / 2;
 let pivotY = bounds.y + bounds.height / 2;

 switch (corner) {
 case "tl": // Top-left corner
 scaleX = 1 - dx / bounds.width;
 scaleY = 1 - dy / bounds.height;
 pivotX = bounds.x + bounds.width;
 pivotY = bounds.y + bounds.height;
 break;
 case "tr": // Top-right corner
 scaleX = 1 + dx / bounds.width;
 scaleY = 1 - dy / bounds.height;
 pivotX = bounds.x;
 pivotY = bounds.y + bounds.height;
 break;
 case "bl": // Bottom-left corner
 scaleX = 1 - dx / bounds.width;
 scaleY = 1 + dy / bounds.height;
 pivotX = bounds.x + bounds.width;
 pivotY = bounds.y;
 break;
 case "br": // Bottom-right corner
 scaleX = 1 + dx / bounds.width;
 scaleY = 1 + dy / bounds.height;
 pivotX = bounds.x;
 pivotY = bounds.y;
 break;
 }

 // Calculate minimum scale based on canvas size and object bounds
 const minPixelSize = 10; // Minimum 10px size
 const minScaleX = minPixelSize / bounds.width;
 const minScaleY = minPixelSize / bounds.height;
 
 // 🎯 BOUNDARY ENFORCEMENT: Calculate maximum scale to keep within canvas bounds
 const canvasBounds = BoundaryUtils.getCanvasBoundsWithGlobalMargins();
 const maxScale = BoundaryUtils.getMaxAllowedScale(bounds, canvasBounds);
 
 // Apply all constraints: minimum scale, minimum size, and canvas boundaries
 scaleX = Math.max(0.2, minScaleX, Math.min(maxScale.scaleX, scaleX));
 scaleY = Math.max(0.2, minScaleY, Math.min(maxScale.scaleY, scaleY));

 // Apply transformation to all selected objects
 this.state.selectedObjects.forEach(obj => {
 if (obj.scale && obj.position) {
 // Store original position relative to pivot
 const relativeX = obj.position.x - pivotX;
 const relativeY = obj.position.y - pivotY;

 // Apply scale
 obj.scale.x = Math.abs(obj.scale.x * scaleX);
 obj.scale.y = Math.abs(obj.scale.y * scaleY);

 // Adjust position based on new scale
 obj.position.x = pivotX + relativeX * scaleX;
 obj.position.y = pivotY + relativeY * scaleY;
 }
 });
 }

 private performEdgeResize(dx: number, dy: number, edge: string, bounds: Rectangle): void {
 if (this.state.selectedObjects.length === 0) return;

 let scaleX = 1;
 let scaleY = 1;
 let pivotX = bounds.x + bounds.width / 2;
 let pivotY = bounds.y + bounds.height / 2;

 switch (edge) {
 case "t": // Top edge
 scaleY = 1 - dy / bounds.height;
 pivotY = bounds.y + bounds.height;
 break;
 case "r": // Right edge
 scaleX = 1 + dx / bounds.width;
 pivotX = bounds.x;
 break;
 case "b": // Bottom edge
 scaleY = 1 + dy / bounds.height;
 pivotY = bounds.y;
 break;
 case "l": // Left edge
 scaleX = 1 - dx / bounds.width;
 pivotX = bounds.x + bounds.width;
 break;
 }

 // Apply minimum scale constraints
 const minPixelSize = 10;
 const minScaleX = minPixelSize / bounds.width;
 const minScaleY = minPixelSize / bounds.height;
 
 // 🎯 BOUNDARY ENFORCEMENT: Calculate maximum scale to keep within canvas bounds
 const canvasBounds = BoundaryUtils.getCanvasBoundsWithGlobalMargins();
 const maxScale = BoundaryUtils.getMaxAllowedScale(bounds, canvasBounds);
 
 scaleX = Math.max(0.2, minScaleX, Math.min(maxScale.scaleX, scaleX));
 scaleY = Math.max(0.2, minScaleY, Math.min(maxScale.scaleY, scaleY));

 // Apply transformation to all selected objects
 this.state.selectedObjects.forEach(obj => {
 if (obj.scale && obj.position) {
 const relativeX = obj.position.x - pivotX;
 const relativeY = obj.position.y - pivotY;

 obj.scale.x = Math.abs(obj.scale.x * scaleX);
 obj.scale.y = Math.abs(obj.scale.y * scaleY);

 obj.position.x = pivotX + relativeX * scaleX;
 obj.position.y = pivotY + relativeY * scaleY;
 }
 });
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
 
 // Log boundary constraint if movement was limited
 if (Math.abs(dx - clampedDx) > 1 || Math.abs(dy - clampedDy) > 1) {
 console.log(
 `🎯 SELECTION: Drag constrained - requested delta (${Math.round(dx)}, ${Math.round(dy)}), applied (${Math.round(clampedDx)}, ${Math.round(clampedDy)})`
 );
 }
 }

 /**
 * Programmatically scale selected objects by specific factors
 */
 public scaleSelectedObjects(scaleX: number, scaleY: number): void {
 if (this.state.selectedObjects.length === 0) return;

 // Calculate center point of selection
 const bounds = this.calculateCombinedBounds(this.state.selectedObjects);
 const centerX = bounds.x + bounds.width / 2;
 const centerY = bounds.y + bounds.height / 2;

 this.state.selectedObjects.forEach(obj => {
 if (obj.scale && obj.position) {
 // Store position relative to center
 const relativeX = obj.position.x - centerX;
 const relativeY = obj.position.y - centerY;

 // Apply scale
 obj.scale.x *= scaleX;
 obj.scale.y *= scaleY;

 // Adjust position
 obj.position.x = centerX + relativeX * scaleX;
 obj.position.y = centerY + relativeY * scaleY;
 }
 });
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
}
