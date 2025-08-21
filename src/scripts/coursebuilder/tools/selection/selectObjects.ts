/**
 * Object Selection Functionality
 * Handles marquee selection, single/multiple object selection, and selection management
 */

import {
 FederatedPointerEvent,
 Container,
 Graphics,
 Point,
 Rectangle,
} from "pixi.js";
import { BaseTool } from "../ToolInterface";
import { SELECTION_CONSTANTS } from "../SharedResources";
import { SelectionSettings, SelectionState, SelectionGroup, TransformHandle } from "./types";
import { ScaleObjects } from "./scaleObjects";
import { RotateObjects } from "./rotateObjects";

export class SelectObjects extends BaseTool {
 private isSelecting: boolean = false;
 private marqueeStart: Point = new Point(0, 0);
 private marqueeGraphics: Graphics | null = null;
 private state: SelectionState;
 protected settings: SelectionSettings = {};
 
 // Specialized functionality modules
 private scaler: ScaleObjects;
 private rotator: RotateObjects;
 
 // Double-click tracking for text editing
 private lastClickTime: number = 0;
 private lastClickedObject: any = null;
 private readonly DOUBLE_CLICK_TIMEOUT = 300; // milliseconds

 constructor() {
 super("selection", "default");
 this.state = {
 selectedObjects: [],
 selectionGroup: null,
 isTransforming: false,
 activeHandle: null,
 transformStart: new Point(0, 0),
 selectionCenter: new Point(0, 0)
 };
 
 // Initialize modules
 this.scaler = new ScaleObjects(this.state);
 this.rotator = new RotateObjects(this.state);
 
 this.handleKeyDown = this.handleKeyDown.bind(this);
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 const localPoint = container.toLocal(event.global);
 this.marqueeStart.copyFrom(localPoint);

 // Check if clicking on a transform handle
 const handle = this.getTransformHandleAtPoint(localPoint);
 
 if (handle) {
 // Start transformation
 this.state.isTransforming = true;
 this.state.activeHandle = handle;
 this.state.transformStart.copyFrom(localPoint);
 
 // Start rotation if it's a rotation handle
 if (handle.type === "rotation") {
 this.rotator.startRotation(localPoint);
 }
 return;
 }

 // Check if clicking on selected objects to start dragging
 const clickedObject = this.getObjectAtPoint(localPoint, container);
 if (clickedObject && this.state.selectedObjects.includes(clickedObject)) {
 this.state.isTransforming = true;
 this.state.transformStart.copyFrom(localPoint);
 return;
 }

 // Handle selection
 this.handleSingleClick(localPoint, container, event.shiftKey);
 
 // Start marquee selection if no object was clicked
 if (!clickedObject && !event.shiftKey) {
 this.startMarqueeSelection(localPoint, container);
 }
 }

 onPointerMove(event: FederatedPointerEvent, container: Container): void {
 const localPoint = container.toLocal(event.global);

 if (this.state.isTransforming && this.state.activeHandle) {
 // Handle transformation via specialized modules
 if (this.state.activeHandle.type === "rotation") {
 this.rotator.updateTransform(localPoint);
 } else {
 this.scaler.updateTransform(localPoint);
 }
 this.createSelectionGroup(); // Refresh selection group
 } else if (this.state.isTransforming && this.state.selectedObjects.length > 0) {
 // Handle dragging
 this.scaler.updateDrag(localPoint);
 this.createSelectionGroup(); // Refresh selection group
 } else if (this.isSelecting && this.marqueeGraphics) {
 this.updateMarqueeSelection(localPoint);
 }
 }

 onPointerUp(_event: FederatedPointerEvent, container: Container): void {
 if (this.isSelecting) {
 this.completeMarqueeSelection(container);
 } else if (this.state.isTransforming) {
 if (this.state.activeHandle?.type === "rotation") {
 this.rotator.stopRotation();
 }
 this.state.isTransforming = false;
 this.state.activeHandle = null;
 }
 
 this.isSelecting = false;
 }

 private startMarqueeSelection(_point: Point, container: Container): void {
 this.isSelecting = true;
 
 // Create marquee graphics
 this.marqueeGraphics = new Graphics();
 container.addChild(this.marqueeGraphics);
 }

 private updateMarqueeSelection(currentPoint: Point): void {
 if (!this.marqueeGraphics) return;

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

 private completeMarqueeSelection(container: Container): void {
 this.isSelecting = false;

 if (this.marqueeGraphics) {
 const bounds = this.marqueeGraphics.getBounds();
 const rect = new Rectangle(bounds.x, bounds.y, bounds.width, bounds.height);

 // Find objects within the marquee
 const objectsInMarquee = this.findObjectsInBounds(rect, container);

 if (objectsInMarquee.length > 0) {
 this.selectObjects(objectsInMarquee);
 }

 // Remove marquee graphics
 container.removeChild(this.marqueeGraphics);
 this.marqueeGraphics = null;
 }
 }

 private handleSingleClick(point: Point, container: Container, shiftKey: boolean): void {
 const clickedObject = this.getObjectAtPoint(point, container);
 const currentTime = Date.now();
 
 // Check for double-click on text objects
 if (clickedObject && 
     clickedObject === this.lastClickedObject && 
     currentTime - this.lastClickTime < this.DOUBLE_CLICK_TIMEOUT &&
     this.isTextObject(clickedObject)) {
   
   this.enterTextEditMode(clickedObject, point, container);
   return;
 }
 
 // Update click tracking
 this.lastClickTime = currentTime;
 this.lastClickedObject = clickedObject;

 if (clickedObject) {
 if (shiftKey) {
 this.toggleObjectSelection(clickedObject);
 } else {
 this.selectObjects([clickedObject]);
 }
 } else if (!shiftKey) {
 this.clearSelection();
 }
 }

 private isTextObject(object: any): boolean {
 return object && (object.constructor.name === 'Text' || object.text !== undefined);
 }

 private enterTextEditMode(textObject: any, _point: Point, _container: Container): void {
 // TODO: Implement text editing mode
 console.log('Text editing mode not yet implemented for:', textObject);
 }

 private getObjectAtPoint(point: Point, container: Container): any {
 const children = container.children.slice().reverse();
 
 for (const child of children) {
 if (this.isSelectableObject(child)) {
 const bounds = child.getBounds();
 if (point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
     point.y >= bounds.y && point.y <= bounds.y + bounds.height) {
 return child;
 }
 }
 }
 return null;
 }

 private isSelectableObject(object: any): boolean {
 // Skip selection graphics and handles
 if (object.name?.startsWith('selection-') || 
     object.name?.startsWith('transform-')) {
 return false;
 }
 
 // Check for valid drawable objects
 return object.getBounds && typeof object.getBounds === 'function';
 }

 private findObjectsInBounds(rect: Rectangle, container: Container): any[] {
 const objectsInBounds: any[] = [];
 
 container.children.forEach(child => {
 if (this.isSelectableObject(child)) {
 const bounds = child.getBounds();
 // Check if rectangles intersect
 if (!(rect.x > bounds.x + bounds.width || 
       rect.x + rect.width < bounds.x || 
       rect.y > bounds.y + bounds.height || 
       rect.y + rect.height < bounds.y)) {
 objectsInBounds.push(child);
 }
 }
 });
 
 return objectsInBounds;
 }

 public selectObjects(objects: any[]): void {
 this.state.selectedObjects = [...objects];
 this.createSelectionGroup();
 }

 private toggleObjectSelection(object: any): void {
 const index = this.state.selectedObjects.indexOf(object);
 if (index >= 0) {
 this.state.selectedObjects.splice(index, 1);
 } else {
 this.state.selectedObjects.push(object);
 }
 this.createSelectionGroup();
 }

 public clearSelection(): void {
 this.state.selectedObjects = [];
 this.removeSelectionGroup();
 }

 private createSelectionGroup(): void {
 this.removeSelectionGroup();

 if (this.state.selectedObjects.length === 0) return;

 const bounds = this.calculateCombinedBounds(this.state.selectedObjects);
 const selectionBox = this.createSelectionBox(bounds);
 const transformHandles = this.createTransformHandles(bounds);
 const rotationHandle = this.rotator.createRotationHandle(bounds);
 
 this.state.selectionGroup = {
 objects: [...this.state.selectedObjects],
 bounds,
 transformHandles,
 rotationHandle,
 selectionBox
 };

 // Add selection graphics to first selected object's parent
 const parentContainer = this.state.selectedObjects[0]?.parent;
 if (parentContainer) {
 parentContainer.addChild(selectionBox);
 transformHandles.forEach(handle => parentContainer.addChild(handle.graphics));
 if (rotationHandle) {
 parentContainer.addChild(rotationHandle.graphics);
 }
 }
 }

 private removeSelectionGroup(): void {
 if (this.state.selectionGroup) {
 // Remove selection box
 if (this.state.selectionGroup.selectionBox.parent) {
 this.state.selectionGroup.selectionBox.parent.removeChild(this.state.selectionGroup.selectionBox);
 }

 // Remove transform handles
 this.state.selectionGroup.transformHandles.forEach(handle => {
 if (handle.graphics.parent) {
 handle.graphics.parent.removeChild(handle.graphics);
 }
 });

 // Remove rotation handle if exists
 if (this.state.selectionGroup.rotationHandle?.graphics.parent) {
 this.state.selectionGroup.rotationHandle.graphics.parent.removeChild(
 this.state.selectionGroup.rotationHandle.graphics
 );
 }

 this.state.selectionGroup = null;
 }
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

 private createSelectionBox(bounds: Rectangle): Graphics {
 const graphics = new Graphics();
 graphics.name = 'selection-box';
 
 graphics.rect(bounds.x, bounds.y, bounds.width, bounds.height);
 graphics.stroke({
 width: SELECTION_CONSTANTS.SELECTION_LINE_WIDTH,
 color: SELECTION_CONSTANTS.SELECTION_COLOR,
 alpha: 1.0,
 });

 return graphics;
 }

 private createTransformHandles(bounds: Rectangle): TransformHandle[] {
 const handles: TransformHandle[] = [];
 const size = SELECTION_CONSTANTS.HANDLE_SIZE;
 const halfSize = size / 2;

 // Corner handles
 const corners = [
 { pos: "tl", x: bounds.x - halfSize, y: bounds.y - halfSize },
 { pos: "tr", x: bounds.x + bounds.width - halfSize, y: bounds.y - halfSize },
 { pos: "bl", x: bounds.x - halfSize, y: bounds.y + bounds.height - halfSize },
 { pos: "br", x: bounds.x + bounds.width - halfSize, y: bounds.y + bounds.height - halfSize },
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

 // Edge handles
 const edges = [
 { pos: "t", x: bounds.x + bounds.width / 2 - halfSize, y: bounds.y - halfSize },
 { pos: "r", x: bounds.x + bounds.width - halfSize, y: bounds.y + bounds.height / 2 - halfSize },
 { pos: "b", x: bounds.x + bounds.width / 2 - halfSize, y: bounds.y + bounds.height - halfSize },
 { pos: "l", x: bounds.x - halfSize, y: bounds.y + bounds.height / 2 - halfSize },
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

 private getTransformHandleAtPoint(point: Point): TransformHandle | null {
 if (!this.state.selectionGroup) return null;

 for (const handle of this.state.selectionGroup.transformHandles) {
 if (point.x >= handle.bounds.x && point.x <= handle.bounds.x + handle.bounds.width &&
     point.y >= handle.bounds.y && point.y <= handle.bounds.y + handle.bounds.height) {
 return handle;
 }
 }

 // Check rotation handle
 if (this.state.selectionGroup.rotationHandle) {
 const rb = this.state.selectionGroup.rotationHandle.bounds;
 if (point.x >= rb.x && point.x <= rb.x + rb.width &&
     point.y >= rb.y && point.y <= rb.y + rb.height) {
 return this.state.selectionGroup.rotationHandle;
 }
 }

 return null;
 }

 private handleKeyDown = (event: KeyboardEvent): void => {
 if (event.key === 'Delete' || event.key === 'Backspace') {
 event.preventDefault();
 this.deleteSelectedObjects();
 }

 if (event.key === 'Escape') {
 this.clearSelection();
 }
 };

 private deleteSelectedObjects(): void {
 if (this.state.selectedObjects.length === 0) return;

 this.state.selectedObjects.forEach(obj => {
 if (obj.parent) {
 obj.parent.removeChild(obj);
 }
 if (obj.destroy && typeof obj.destroy === 'function') {
 obj.destroy();
 }
 });

 this.clearSelection();
 }

 onActivate(): void {
 super.onActivate();
 document.addEventListener('keydown', this.handleKeyDown);
 }

 onDeactivate(): void {
 super.onDeactivate();
 this.clearSelection();
 document.removeEventListener('keydown', this.handleKeyDown);
 this.isSelecting = false;
 this.state.isTransforming = false;
 }

 updateSettings(settings: SelectionSettings): void {
 this.settings = { ...this.settings, ...settings };
 }

 // Getters for other modules to access state
 public getSelectedObjects(): any[] {
 return this.state.selectedObjects;
 }

 public getSelectionGroup(): SelectionGroup | null {
 return this.state.selectionGroup;
 }

 public getSelectionState(): SelectionState {
 return this.state;
 }
}
