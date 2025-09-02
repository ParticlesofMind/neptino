/**
 * Object Rotation Functionality  
 * Handles rotation of selected objects around their centers and rotation centers
 */

import { Point, Rectangle, Graphics } from "pixi.js";
import { SELECTION_CONSTANTS } from "../SharedResources";
import { SelectionState, TransformHandle } from "./types";

export class RotateObjects {
 private state: SelectionState;
 private rotationStartAngle: number = 0;

 constructor(state: SelectionState) {
 this.state = state;
 }

 public updateTransform(currentPoint: Point): void {
 if (!this.state.activeHandle || !this.state.selectionGroup) return;
 if (this.state.activeHandle.type !== "rotation") return;

 this.performRotation(currentPoint);
 }

 public startRotation(currentPoint: Point): void {
 if (!this.state.selectionGroup) return;

 // Calculate initial angle
 const bounds = this.state.selectionGroup.bounds;
 const centerX = bounds.x + bounds.width / 2;
 const centerY = bounds.y + bounds.height / 2;
 
 this.rotationStartAngle = Math.atan2(
 currentPoint.y - centerY,
 currentPoint.x - centerX
 );
 }

 public stopRotation(): void {
 // Rotation complete - could add any cleanup here if needed
 }

 private performRotation(currentPoint: Point): void {
 if (!this.state.selectionGroup || this.state.selectedObjects.length === 0) return;

 const bounds = this.state.selectionGroup.bounds;
 const centerX = bounds.x + bounds.width / 2;
 const centerY = bounds.y + bounds.height / 2;

 // Calculate current angle
 const currentAngle = Math.atan2(
 currentPoint.y - centerY,
 currentPoint.x - centerX
 );

 // Calculate rotation delta
 const deltaAngle = currentAngle - this.rotationStartAngle;

 // Apply rotation to each selected object
 this.state.selectedObjects.forEach(obj => {
 if (obj.rotation !== undefined) {
 // Set rotation center first
 this.setRotationCenter(obj);
 
 // Apply rotation
 obj.rotation += deltaAngle;

 // Rotate object position around selection center
 const relativeX = obj.position.x - centerX;
 const relativeY = obj.position.y - centerY;
 const cos = Math.cos(deltaAngle);
 const sin = Math.sin(deltaAngle);

 obj.position.x = centerX + (relativeX * cos - relativeY * sin);
 obj.position.y = centerY + (relativeX * sin + relativeY * cos);
 }
 });

 this.rotationStartAngle = currentAngle;
 }

 /**
 * Set proper rotation center for an object based on its type
 */
 private setRotationCenter(obj: any): void {
 if (!obj) return;

 try {
 const bounds = obj.getLocalBounds ? obj.getLocalBounds() : obj.getBounds();
 
 if (bounds.width === 0 || bounds.height === 0) {
 return;
 }

 if (obj.constructor.name === 'Graphics') {
 // For Graphics objects, use pivot
 obj.pivot.set(
 bounds.x + bounds.width / 2,
 bounds.y + bounds.height / 2
 );
 } else if (obj.constructor.name === 'Text' || obj.text !== undefined) {
 // For Text objects, use anchor
 if (obj.anchor) {
 obj.anchor.set(0.5, 0.5);
 }
 }
 } catch (error) {
 // Silently handle any bounds calculation errors
 }
 }

 /**
 * Create rotation handle for selection group
 */
 public createRotationHandle(bounds: Rectangle): TransformHandle {
 const handleRadius = 8;
 const handleOffset = 25;
 
 // Position rotation handle above the selection
 const centerX = bounds.x + bounds.width / 2;
 const handleY = bounds.y - handleOffset;

 const graphics = new Graphics();
 graphics.name = 'rotation-handle';
 
 // Draw circular rotation handle
 graphics.circle(centerX, handleY, handleRadius);
 graphics.fill({ color: SELECTION_CONSTANTS.HANDLE_COLOR });
 graphics.stroke({ 
 width: 2, 
 color: SELECTION_CONSTANTS.SELECTION_COLOR 
 });

 // Draw connection line
 graphics.moveTo(centerX, handleY + handleRadius);
 graphics.lineTo(centerX, bounds.y);
 graphics.stroke({ 
 width: 1, 
 color: SELECTION_CONSTANTS.SELECTION_COLOR,
 alpha: 0.6 
 });

 return {
 type: "rotation",
 position: "rotate",
 graphics,
 bounds: new Rectangle(
 centerX - handleRadius, 
 handleY - handleRadius, 
 handleRadius * 2, 
 handleRadius * 2
 )
 };
 }

 /**
 * Programmatically rotate selected objects by a specific angle (in radians)  
 */
 public rotateSelectedObjects(angleInRadians: number): void {
 if (this.state.selectedObjects.length === 0) return;

 const bounds = this.calculateCombinedBounds(this.state.selectedObjects);
 const center = new Point(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);

 this.state.selectedObjects.forEach(obj => {
 if (obj.rotation !== undefined) {
 this.setRotationCenter(obj);
 obj.rotation += angleInRadians;
 
 const relativeX = obj.position.x - center.x;
 const relativeY = obj.position.y - center.y;
 const cos = Math.cos(angleInRadians);
 const sin = Math.sin(angleInRadians);
 
         obj.position.x = center.x + (relativeX * cos - relativeY * sin);
         obj.position.y = center.y + (relativeX * sin + relativeY * cos);
         }
         });
         } private calculateCombinedBounds(objects: any[]): Rectangle {
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
