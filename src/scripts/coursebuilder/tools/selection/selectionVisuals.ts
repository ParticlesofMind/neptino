/**
 * Selection Visual Feedback  
 * Manages visual representation of selected objects (selection boxes, transform handles)
 */

import {
 Container,
 Graphics,
 Rectangle,
} from "pixi.js";
import { SELECTION_CONSTANTS } from "../SharedResources";
import { SelectionGroup, TransformHandle } from "./types";
import { RotateObjects } from "./rotateObjects";

export class SelectionVisuals {
 private rotator: RotateObjects;
 private currentCursor: string = 'default';
 private canvasElement: HTMLCanvasElement | null = null;

 constructor(rotator: RotateObjects, canvasElement?: HTMLCanvasElement) {
 this.rotator = rotator;
 this.canvasElement = canvasElement || null;
 }

    public createSelectionGroup(
        selectedObjects: any[], 
        parentContainer: Container
    ): SelectionGroup | null {
        if (selectedObjects.length === 0) return null;

        // Check if any selected object disables rotation
        const hasNonRotatableObject = selectedObjects.some(obj => obj.disableRotation);
        
        // Check if any selected object is a text object
        const hasTextObject = selectedObjects.some(obj => this.isTextObject(obj));

        // Always calculate actual object bounds for proper selection visuals
        // Ignore marqueeBounds parameter as it causes visual misalignment
        const bounds = this.calculateCombinedBounds(selectedObjects);
        const selectionBox = this.createSelectionBox(bounds);
        
        // For text objects, don't show transform handles (resize/scale handles)
        const transformHandles = hasTextObject ? [] : this.createTransformHandles(bounds);
        
        // Only create rotation handle if no object disables rotation and no text objects
        const rotationHandle = (hasNonRotatableObject || hasTextObject) ? null : this.rotator.createRotationHandle(bounds);
        
        const selectionGroup: SelectionGroup = {
            objects: [...selectedObjects],
            bounds,
            transformHandles,
            rotationHandle,
            selectionBox
        }; // Add selection graphics to parent container
 parentContainer.addChild(selectionBox);
 transformHandles.forEach(handle => parentContainer.addChild(handle.graphics));
 if (rotationHandle) {
 parentContainer.addChild(rotationHandle.graphics);
 }

 return selectionGroup;
 }

 public removeSelectionGroup(selectionGroup: SelectionGroup | null): void {
 if (!selectionGroup) return;

 // Remove selection box
 if (selectionGroup.selectionBox.parent) {
 selectionGroup.selectionBox.parent.removeChild(selectionGroup.selectionBox);
 }

 // Remove transform handles
 selectionGroup.transformHandles.forEach(handle => {
 if (handle.graphics.parent) {
 handle.graphics.parent.removeChild(handle.graphics);
 }
 });

 // Remove rotation handle if exists
 if (selectionGroup.rotationHandle?.graphics.parent) {
 selectionGroup.rotationHandle.graphics.parent.removeChild(
 selectionGroup.rotationHandle.graphics
 );
 }
 }

 private calculateCombinedBounds(objects: any[]): Rectangle {
 if (objects.length === 0) return new Rectangle(0, 0, 0, 0);

 let minX = Infinity;
 let minY = Infinity;
 let maxX = -Infinity;
 let maxY = -Infinity;

 objects.forEach(obj => {
 // Force bounds recalculation to get accurate current bounds
 let bounds;
 try {
 // Force fresh bounds calculation
 bounds = obj.getBounds(true) || obj.getBounds();
 } catch {
 bounds = obj.getBounds();
 }
 
 minX = Math.min(minX, bounds.x);
 minY = Math.min(minY, bounds.y);
 maxX = Math.max(maxX, bounds.x + bounds.width);
 maxY = Math.max(maxY, bounds.y + bounds.height);
 });

 return new Rectangle(minX, minY, maxX - minX, maxY - minY);
 }

 private createSelectionBox(bounds: Rectangle): Graphics {
 const graphics = new Graphics();
 graphics.name = 'selection-box';
 
 // Adjust for stroke width so the selection box stays exactly within object bounds
 const strokeWidth = SELECTION_CONSTANTS.SELECTION_LINE_WIDTH;
 const halfStroke = strokeWidth / 2;
 
 graphics.rect(
 bounds.x + halfStroke, 
 bounds.y + halfStroke, 
 bounds.width - strokeWidth, 
 bounds.height - strokeWidth
 );
 graphics.stroke({
 width: strokeWidth,
 color: SELECTION_CONSTANTS.SELECTION_COLOR,
 alpha: 1.0,
 });

 return graphics;
 }

 private createTransformHandles(bounds: Rectangle): TransformHandle[] {
 const handles: TransformHandle[] = [];
 const size = SELECTION_CONSTANTS.HANDLE_SIZE;
 const halfSize = size / 2;

 // Corner handles - positioned exactly on the bounds corners (not extending outside)
 const corners = [
 { pos: "tl", x: bounds.x, y: bounds.y },
 { pos: "tr", x: bounds.x + bounds.width - size, y: bounds.y },
 { pos: "bl", x: bounds.x, y: bounds.y + bounds.height - size },
 { pos: "br", x: bounds.x + bounds.width - size, y: bounds.y + bounds.height - size },
 ];

 corners.forEach(corner => {
 const graphics = new Graphics();
 graphics.name = `transform-handle-${corner.pos}`;
 graphics.rect(corner.x, corner.y, size, size);
 graphics.fill({ color: SELECTION_CONSTANTS.HANDLE_COLOR });
 graphics.stroke({ width: 1, color: SELECTION_CONSTANTS.SELECTION_COLOR });

 handles.push({
 type: "corner",
 position: corner.pos as any,
 graphics,
 bounds: new Rectangle(corner.x, corner.y, size, size)
 });
 });

 // Edge handles - positioned exactly on the bounds edges (not extending outside)
 const edges = [
 { pos: "t", x: bounds.x + bounds.width / 2 - halfSize, y: bounds.y },
 { pos: "r", x: bounds.x + bounds.width - size, y: bounds.y + bounds.height / 2 - halfSize },
 { pos: "b", x: bounds.x + bounds.width / 2 - halfSize, y: bounds.y + bounds.height - size },
 { pos: "l", x: bounds.x, y: bounds.y + bounds.height / 2 - halfSize },
 ];

 edges.forEach(edge => {
 const graphics = new Graphics();
 graphics.name = `transform-handle-${edge.pos}`;
 graphics.rect(edge.x, edge.y, size, size);
 graphics.fill({ color: SELECTION_CONSTANTS.HANDLE_COLOR });
 graphics.stroke({ width: 1, color: SELECTION_CONSTANTS.SELECTION_COLOR });

 handles.push({
 type: "edge",
 position: edge.pos as any,
 graphics,
 bounds: new Rectangle(edge.x, edge.y, size, size)
 });
 });

 return handles;
 }

 /**
 * Find transform handle at a given point
 */
 public getTransformHandleAtPoint(
 point: { x: number; y: number }, 
 selectionGroup: SelectionGroup | null
 ): TransformHandle | null {
 if (!selectionGroup) {
   return null;
 }

 for (const handle of selectionGroup.transformHandles) {
 if (point.x >= handle.bounds.x && point.x <= handle.bounds.x + handle.bounds.width &&
     point.y >= handle.bounds.y && point.y <= handle.bounds.y + handle.bounds.height) {
 return handle;
 }
 }

 // Check rotation handle
 if (selectionGroup.rotationHandle) {
 const rb = selectionGroup.rotationHandle.bounds;
 if (point.x >= rb.x && point.x <= rb.x + rb.width &&
     point.y >= rb.y && point.y <= rb.y + rb.height) {
 return selectionGroup.rotationHandle;
 }
 }

 return null;
 }

 /**
 * Update cursor based on the handle being hovered over
 */
 public updateCursor(handle: TransformHandle | null): void {
 const newCursor = this.getCursorForHandle(handle);
 if (newCursor !== this.currentCursor) {
 this.setCursor(newCursor);
 this.currentCursor = newCursor;
 }
 }

 /**
 * Set cursor for dragging mode
 */
 public setDragCursor(): void {
 this.setCursor('move');
 this.currentCursor = 'move';
 }

 /**
 * Get appropriate cursor for a transform handle
 */
 private getCursorForHandle(handle: TransformHandle | null): string {
 if (!handle) return 'default';

 switch (handle.type) {
 case 'corner':
 return this.getCornerCursor(handle.position);
 case 'edge':
 return this.getEdgeCursor(handle.position);
 case 'rotation':
 return 'grab';
 default:
 return 'default';
 }
 }

 /**
 * Get cursor for corner handles
 */
 private getCornerCursor(position: string): string {
 switch (position) {
 case 'tl': // Top-left
 case 'br': // Bottom-right
 return 'nw-resize';
 case 'tr': // Top-right
 case 'bl': // Bottom-left
 return 'ne-resize';
 default:
 return 'default';
 }
 }

 /**
 * Get cursor for edge handles
 */
 private getEdgeCursor(position: string): string {
 switch (position) {
 case 't': // Top
 case 'b': // Bottom
 return 'n-resize';
 case 'l': // Left
 case 'r': // Right
 return 'e-resize';
 default:
 return 'default';
 }
 }

 /**
 * Set the canvas element reference for cursor updates
 */
 public setCanvasElement(canvasElement: HTMLCanvasElement): void {
 this.canvasElement = canvasElement;
 }

 /**
 * Apply cursor to canvas element (preferred) or document body as fallback
 */
 private setCursor(cursor: string): void {
 console.log('🖱️ SelectionVisuals.setCursor called with:', cursor);
 
 // Try to set on canvas element first (this takes precedence in the app)
 if (this.canvasElement) {
 this.canvasElement.style.cursor = cursor;
 console.log('🖱️ Set cursor on canvas element:', cursor);
 } else {
 // Fallback to document body
 if (typeof document !== 'undefined' && document.body) {
 document.body.style.cursor = cursor;
 console.log('🖱️ Set cursor on document body:', cursor);
 }
 }
 }

 /**
  * Reset cursor to default
  */
 public resetCursor(): void {
   this.setCursor('default');
   this.currentCursor = 'default';
 }

 /**
  * Check if an object is a text object
  */
 private isTextObject(object: any): boolean {
   return object && (
     object.constructor.name === 'Text' || 
     object.text !== undefined ||
     object.isTextObject === true  // Support for our TextArea containers
   );
 }
}