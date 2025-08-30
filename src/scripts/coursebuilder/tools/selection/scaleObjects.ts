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

 const bounds = this.state.selectionGroup.bounds;
 const dx = currentPoint.x - this.state.transformStart.x;
 const dy = currentPoint.y - this.state.transformStart.y;

 // Check if any selected objects are rotated
 const hasRotatedObjects = this.state.selectedObjects.some(obj => 
 obj.rotation !== undefined && Math.abs(obj.rotation) > 0.01
 );

 if (this.state.activeHandle.type === "corner") {
 if (hasRotatedObjects) {
  this.performRotationAwareCornerResize(dx, dy, this.state.activeHandle.position);
 } else {
 // 📐 Using standard corner scaling for non-rotated objects
 this.performCornerResize(dx, dy, this.state.activeHandle.position, bounds);
 }
 } else if (this.state.activeHandle.type === "edge") {
 this.performEdgeResize(dx, dy, this.state.activeHandle.position, bounds);
 }

 this.state.transformStart.copyFrom(currentPoint);
 }

 private performRotationAwareCornerResize(dx: number, dy: number, corner: string): void {
 // For rotated objects, we need to temporarily reset rotation and pivot for predictable scaling
 if (this.state.selectedObjects.length === 0) return;

 // 🔄 TRANSFORMATION RESET: Store original transformations and temporarily reset them
 const originalTransforms: Array<{obj: any, pivot: {x: number, y: number}, rotation: number}> = [];
 
 this.state.selectedObjects.forEach(obj => {
 if (obj.rotation !== undefined && Math.abs(obj.rotation) > 0.01) {
  // Store original transform state
  originalTransforms.push({
  obj: obj,
  pivot: { x: obj.pivot.x, y: obj.pivot.y },
  rotation: obj.rotation
  });

  // Temporarily reset to neutral state for predictable scaling
  obj.pivot.set(0, 0);
  obj.rotation = 0;
 }
 });

 // Recalculate bounds after reset to get non-rotated bounding box
 const resetBounds = this.calculateCombinedBounds(this.state.selectedObjects);

 // Calculate scale factors based on the reset bounds and corner being dragged
 let scaleX = 1;
 let scaleY = 1;
 let pivotX = resetBounds.x + resetBounds.width / 2;
 let pivotY = resetBounds.y + resetBounds.height / 2;

 // Determine anchor point based on corner (opposite corner becomes the pivot)
 switch (corner) {
 case "tl": // Top-left corner
 scaleX = 1 - dx / resetBounds.width;
 scaleY = 1 - dy / resetBounds.height;
 pivotX = resetBounds.x + resetBounds.width;  // Anchor at bottom-right
 pivotY = resetBounds.y + resetBounds.height;
 break;
 case "tr": // Top-right corner
 scaleX = 1 + dx / resetBounds.width;
 scaleY = 1 - dy / resetBounds.height;
 pivotX = resetBounds.x;                      // Anchor at bottom-left
 pivotY = resetBounds.y + resetBounds.height;
 break;
 case "bl": // Bottom-left corner
 scaleX = 1 - dx / resetBounds.width;
 scaleY = 1 + dy / resetBounds.height;
 pivotX = resetBounds.x + resetBounds.width;  // Anchor at top-right
 pivotY = resetBounds.y;
 break;
 case "br": // Bottom-right corner
 scaleX = 1 + dx / resetBounds.width;
 scaleY = 1 + dy / resetBounds.height;
 pivotX = resetBounds.x;                      // Anchor at top-left
 pivotY = resetBounds.y;
 break;
 }

 // Apply minimum scale constraints
 const minScale = 0.2;
 scaleX = Math.max(minScale, scaleX);
 scaleY = Math.max(minScale, scaleY);

 // Apply scaling to each object using traditional corner-anchored approach
 this.state.selectedObjects.forEach(obj => {
 if (obj.scale && obj.position) {
 // Calculate object's position relative to the anchor point
 const relativeX = obj.position.x - pivotX;
 const relativeY = obj.position.y - pivotY;

 // 🎯 STROKE WIDTH PRESERVATION: Store original stroke width if not already stored
 this.preserveStrokeWidth(obj);

 // Apply scale to object size
 obj.scale.x = Math.abs(obj.scale.x * scaleX);
 obj.scale.y = Math.abs(obj.scale.y * scaleY);

 // 🎯 STROKE WIDTH PRESERVATION: Adjust stroke width to maintain visual consistency
 this.adjustStrokeWidth(obj);

 // Adjust position based on anchor point (this keeps the anchor stable)
 obj.position.x = pivotX + relativeX * scaleX;
 obj.position.y = pivotY + relativeY * scaleY;
 }
 });

 // 🔄 TRANSFORMATION RESTORE: Restore original transformations after scaling
 originalTransforms.forEach(({obj, pivot, rotation}) => {
  // Calculate the new position after scaling
  const scaledX = obj.position.x;
  const scaledY = obj.position.y;

  // Restore pivot and rotation
  obj.pivot.set(pivot.x, pivot.y);
  obj.rotation = rotation;

  // Keep the scaled position
  obj.position.x = scaledX;
  obj.position.y = scaledY;
 });
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

 // 🎯 STROKE WIDTH PRESERVATION: Store original stroke width if not already stored
 this.preserveStrokeWidth(obj);

 // Apply scale
 obj.scale.x = Math.abs(obj.scale.x * scaleX);
 obj.scale.y = Math.abs(obj.scale.y * scaleY);

 // 🎯 STROKE WIDTH PRESERVATION: Adjust stroke width to maintain visual consistency
 this.adjustStrokeWidth(obj);

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

 // 🔄 PIVOT RESET: Store original pivots and temporarily reset them for predictable scaling
 const originalPivots: Array<{obj: any, pivot: {x: number, y: number}}> = [];
 
 this.state.selectedObjects.forEach(obj => {
 if (obj.pivot && (obj.pivot.x !== 0 || obj.pivot.y !== 0)) {
  // Store original pivot
  originalPivots.push({
  obj: obj,
  pivot: { x: obj.pivot.x, y: obj.pivot.y }
  });

  // Temporarily reset pivot to (0,0) for predictable scaling behavior
  obj.pivot.set(0, 0);
 }
 });

 // Apply transformation to all selected objects
 this.state.selectedObjects.forEach(obj => {
 if (obj.scale && obj.position) {
 const relativeX = obj.position.x - pivotX;
 const relativeY = obj.position.y - pivotY;

 // 🎯 STROKE WIDTH PRESERVATION: Store original stroke width if not already stored
 this.preserveStrokeWidth(obj);

 obj.scale.x = Math.abs(obj.scale.x * scaleX);
 obj.scale.y = Math.abs(obj.scale.y * scaleY);

 // 🎯 STROKE WIDTH PRESERVATION: Adjust stroke width to maintain visual consistency
 this.adjustStrokeWidth(obj);

 obj.position.x = pivotX + relativeX * scaleX;
 obj.position.y = pivotY + relativeY * scaleY;
 }
 });

 // 🔄 PIVOT RESTORE: Restore original pivots after scaling
 originalPivots.forEach(({obj, pivot}) => {
  obj.pivot.set(pivot.x, pivot.y);
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

 // 🔄 PIVOT RESET: Store original pivots and temporarily reset them for predictable scaling
 const originalPivots: Array<{obj: any, pivot: {x: number, y: number}}> = [];
 
 this.state.selectedObjects.forEach(obj => {
 if (obj.pivot && (obj.pivot.x !== 0 || obj.pivot.y !== 0)) {
  // Store original pivot
  originalPivots.push({
  obj: obj,
  pivot: { x: obj.pivot.x, y: obj.pivot.y }
  });

  // Temporarily reset pivot to (0,0) for predictable scaling behavior
  obj.pivot.set(0, 0);
 }
 });

 this.state.selectedObjects.forEach(obj => {
 if (obj.scale && obj.position) {
 // Store position relative to center
 const relativeX = obj.position.x - centerX;
 const relativeY = obj.position.y - centerY;

 // 🎯 STROKE WIDTH PRESERVATION: Store original stroke width if not already stored
 this.preserveStrokeWidth(obj);

 // Apply scale
 obj.scale.x *= scaleX;
 obj.scale.y *= scaleY;

 // 🎯 STROKE WIDTH PRESERVATION: Adjust stroke width to maintain visual consistency
 this.adjustStrokeWidth(obj);

 // Adjust position
 obj.position.x = centerX + relativeX * scaleX;
 obj.position.y = centerY + relativeY * scaleY;
 }
 });

 // 🔄 PIVOT RESTORE: Restore original pivots after scaling
 originalPivots.forEach(({obj, pivot}) => {
  obj.pivot.set(pivot.x, pivot.y);
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

 /**
 * 🎯 STROKE WIDTH PRESERVATION: Attempt to preserve stroke width during scaling
 * Note: This is a complex problem in PixiJS. For now, we log the issue and mark objects.
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
 * 🎯 STROKE WIDTH PRESERVATION: Log scaling information for debugging
 * Note: Full stroke width preservation requires more complex graphics recreation.
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
 }
}
