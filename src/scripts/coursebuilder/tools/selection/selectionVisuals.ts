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

 constructor(rotator: RotateObjects) {
 this.rotator = rotator;
 }

 public createSelectionGroup(
 selectedObjects: any[], 
 parentContainer: Container
 ): SelectionGroup | null {
 if (selectedObjects.length === 0) return null;

 // Always calculate actual object bounds for proper selection visuals
 // Ignore marqueeBounds parameter as it causes visual misalignment
 const bounds = this.calculateCombinedBounds(selectedObjects);
 const selectionBox = this.createSelectionBox(bounds);
 const transformHandles = this.createTransformHandles(bounds);
 const rotationHandle = this.rotator.createRotationHandle(bounds);
 
 const selectionGroup: SelectionGroup = {
 objects: [...selectedObjects],
 bounds,
 transformHandles,
 rotationHandle,
 selectionBox
 };

 // Add selection graphics to parent container
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
 if (!selectionGroup) return null;

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
}
