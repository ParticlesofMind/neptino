/**
 * Selection Tool
 * Comprehensive selection and transformation system with marquee selection
 */

import {
 FederatedPointerEvent,
 Container,
 Graphics,
 Point,
 Rectangle,
} from "pixi.js";
import { BaseTool } from "./ToolInterface";
import { SELECTION_CONSTANTS } from "./SharedResources";

interface SelectionSettings {
 // Selection settings can be expanded as needed
}

interface TransformHandle {
 type: "corner" | "edge";
 position: "tl" | "tr" | "bl" | "br" | "t" | "r" | "b" | "l";
 graphics: Graphics;
 bounds: Rectangle;
}

interface SelectionGroup {
 objects: any[];
 bounds: Rectangle;
 transformHandles: TransformHandle[];
 selectionBox: Graphics;
}

export class SelectionTool extends BaseTool {
 private isSelecting: boolean = false;
 private marqueeStart: Point = new Point(0, 0);
 private marqueeGraphics: Graphics | null = null;
 private selectedObjects: any[] = [];
 private selectionGroup: SelectionGroup | null = null;
 private isTransforming: boolean = false;
 private activeHandle: TransformHandle | null = null;
 private transformStart: Point = new Point(0, 0);
 
 // Double-click tracking for text editing
 private lastClickTime: number = 0;
 private lastClickedObject: any = null;
 private readonly DOUBLE_CLICK_TIMEOUT = 300; // milliseconds

 constructor() {
 super("selection", "default");
 this.settings = {};
 
 // Bind keyboard event handlers
 this.handleKeyDown = this.handleKeyDown.bind(this);
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 console.log(
 `🎯 SELECTION: Starting selection at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
 );

 const localPoint = container.toLocal(event.global);
 this.marqueeStart.copyFrom(localPoint);

 // Check if clicking on a transform handle
 if (this.selectionGroup) {
 const clickedHandle = this.getHandleAtPoint(localPoint);
 if (clickedHandle) {
 this.startTransform(clickedHandle, localPoint);
 return;
 }
 }

 // Check if clicking on a selected object (for dragging)
 const clickedObject = this.getObjectAtPoint(localPoint, container);
 if (clickedObject && this.selectedObjects.includes(clickedObject)) {
 this.isTransforming = true;
 this.transformStart.copyFrom(localPoint);
 return;
 }

 // Start new marquee selection
 this.clearSelection();
 this.startMarqueeSelection(localPoint, container);
 }

 onPointerMove(event: FederatedPointerEvent, container: Container): void {
 const localPoint = container.toLocal(event.global);

 if (this.isTransforming && this.activeHandle) {
 // Handle transformation
 this.updateTransform(localPoint);
 } else if (this.isTransforming && this.selectedObjects.length > 0) {
 // Handle dragging
 this.updateDrag(localPoint);
 } else if (this.isSelecting && this.marqueeGraphics) {
 // Update marquee selection
 this.updateMarqueeSelection(localPoint);
 }
 }

 onPointerUp(event: FederatedPointerEvent, container: Container): void {
 const localPoint = container.toLocal(event.global);

 if (this.isTransforming) {
 this.isTransforming = false;
 this.activeHandle = null;
 } else if (this.isSelecting) {
 // Complete marquee selection
 this.completeMarqueeSelection(container);
 } else {
 // Single click selection
 this.handleSingleClick(localPoint, container, event.shiftKey);
 }
 }

 private startMarqueeSelection(
 _startPoint: Point,
 container: Container,
 ): void {
 this.isSelecting = true;

 // Create marquee graphics
 this.marqueeGraphics = new Graphics();
 this.marqueeGraphics.alpha = SELECTION_CONSTANTS.MARQUEE_FILL_ALPHA;
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
 const rect = new Rectangle(
 bounds.x,
 bounds.y,
 bounds.width,
 bounds.height,
 );

 // Find objects within the marquee
 const objectsInMarquee = this.findObjectsInBounds(rect, container);

 console.log(
 `🎯 SELECTION: Marquee selection found ${objectsInMarquee.length} objects`,
 );

 if (objectsInMarquee.length > 0) {
 this.selectObjects(objectsInMarquee);
 }

 // Remove marquee graphics
 container.removeChild(this.marqueeGraphics);
 this.marqueeGraphics = null;
 }
 }

 private handleSingleClick(
 point: Point,
 container: Container,
 shiftKey: boolean,
 ): void {
 const clickedObject = this.getObjectAtPoint(point, container);
 const currentTime = Date.now();
 
 // Check for double-click on text objects
 if (clickedObject && 
     clickedObject === this.lastClickedObject && 
     currentTime - this.lastClickTime < this.DOUBLE_CLICK_TIMEOUT &&
     this.isTextObject(clickedObject)) {
   
   // Handle double-click on text - enter edit mode
   this.enterTextEditMode(clickedObject, point, container);
   console.log('🎯 SELECTION: Double-clicked text object - entering edit mode');
   return;
 }
 
 // Update click tracking
 this.lastClickTime = currentTime;
 this.lastClickedObject = clickedObject;

 if (clickedObject) {
 if (shiftKey) {
 // Add to selection
 this.toggleObjectSelection(clickedObject);
 } else {
 // Replace selection
 this.selectObjects([clickedObject]);
 }
 console.log(
 `🎯 SELECTION: Single click selected object, total selected: ${this.selectedObjects.length}`,
 );
 } else if (!shiftKey) {
 // Clear selection if not holding shift
 this.clearSelection();
 }
 }

 /**
 * Check if an object is a text object that can be edited
 */
 private isTextObject(object: any): boolean {
 // Check if object is a PIXI Text object or has text properties
 return object && (object.constructor.name === 'Text' || object.text !== undefined);
 }

 /**
 * Enter text editing mode for a text object
 */
 private enterTextEditMode(textObject: any, _point: Point, container: Container): void {
 if (!this.isTextObject(textObject)) return;

 // Get the global position of the text object
 const globalBounds = textObject.getBounds();
 const globalPoint = container.toGlobal(textObject.position);
 
 // Create a text area positioned over the text object
 this.createEditableTextArea(
   globalPoint.x,
   globalPoint.y,
   textObject,
   globalBounds.width,
   globalBounds.height
 );
 }

 /**
 * Create an editable text area for existing text
 */
 private createEditableTextArea(
 x: number, 
 y: number, 
 textObject: any, 
 width: number,
 height: number
 ): void {
 // Create HTML textarea for editing
 const textArea = document.createElement("textarea");
 
 // Style the text area to match the text object
 textArea.className = "coursebuilder-text-input";
 textArea.style.position = "absolute";
 textArea.style.left = `${x}px`;
 textArea.style.top = `${y}px`;
 textArea.style.width = `${Math.max(width, 120)}px`;
 textArea.style.height = `${Math.max(height, 30)}px`;
 textArea.style.zIndex = "1000";
 textArea.style.fontSize = `${textObject.style?.fontSize || 16}px`;
 textArea.style.fontFamily = textObject.style?.fontFamily || 'Arial';
 textArea.style.color = textObject.style?.fill || '#000000';
 textArea.style.resize = "both";
 
 // Set the current text content
 textArea.value = textObject.text || '';
 
 // Add to document
 document.body.appendChild(textArea);
 textArea.focus();
 textArea.select();
 
 // Handle completion
 const finalizeEdit = () => {
   if (textArea.parentNode) {
     // Update the text object
     textObject.text = textArea.value;
     
     // Remove text area
     textArea.parentNode.removeChild(textArea);
     
     console.log('🎯 SELECTION: Finished editing text object');
   }
 };
 
 // Event listeners
 textArea.addEventListener("blur", () => {
   setTimeout(finalizeEdit, 100);
 });
 
 textArea.addEventListener("keydown", (e) => {
   if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
     e.preventDefault();
     finalizeEdit();
   } else if (e.key === "Escape") {
     e.preventDefault();
     if (textArea.parentNode) {
       textArea.parentNode.removeChild(textArea);
     }
   }
 });
 
 // Prevent canvas interactions
 textArea.addEventListener("mousedown", (e) => e.stopPropagation());
 textArea.addEventListener("click", (e) => e.stopPropagation());
 }

 private selectObjects(objects: any[]): void {
 this.clearSelection();
 this.selectedObjects = [...objects];
 this.createSelectionGroup();
 }

 private toggleObjectSelection(object: any): void {
 const index = this.selectedObjects.indexOf(object);
 if (index >= 0) {
 this.selectedObjects.splice(index, 1);
 } else {
 this.selectedObjects.push(object);
 }
 this.createSelectionGroup();
 }

 private createSelectionGroup(): void {
 // Remove existing selection group
 this.removeSelectionGroup();

 if (this.selectedObjects.length === 0) return;

 // Calculate combined bounds
 const bounds = this.calculateCombinedBounds(this.selectedObjects);

 // Create selection box
 const selectionBox = new Graphics();
 selectionBox.rect(bounds.x, bounds.y, bounds.width, bounds.height);
 selectionBox.stroke({
 width: SELECTION_CONSTANTS.SELECTION_LINE_WIDTH,
 color: SELECTION_CONSTANTS.SELECTION_COLOR,
 alpha: SELECTION_CONSTANTS.SELECTION_ALPHA,
 });

 // Create transform handles
 const handles = this.createTransformHandles(bounds);

 this.selectionGroup = {
 objects: this.selectedObjects,
 bounds,
 transformHandles: handles,
 selectionBox,
 };

 // Add to container (assuming first object's parent)
 if (this.selectedObjects[0] && this.selectedObjects[0].parent) {
 const container = this.selectedObjects[0].parent;
 container.addChild(selectionBox);
 handles.forEach((handle) => container.addChild(handle.graphics));
 }

 console.log(
 `🎯 SELECTION: Created selection group with ${handles.length} transform handles`,
 );
 }

 private createTransformHandles(bounds: Rectangle): TransformHandle[] {
 const handles: TransformHandle[] = [];
 const size = SELECTION_CONSTANTS.HANDLE_SIZE;

 // Corner handles
 const positions = [
 {
 type: "corner" as const,
 position: "tl" as const,
 x: bounds.x,
 y: bounds.y,
 },
 {
 type: "corner" as const,
 position: "tr" as const,
 x: bounds.x + bounds.width,
 y: bounds.y,
 },
 {
 type: "corner" as const,
 position: "bl" as const,
 x: bounds.x,
 y: bounds.y + bounds.height,
 },
 {
 type: "corner" as const,
 position: "br" as const,
 x: bounds.x + bounds.width,
 y: bounds.y + bounds.height,
 },
 {
 type: "edge" as const,
 position: "t" as const,
 x: bounds.x + bounds.width / 2,
 y: bounds.y,
 },
 {
 type: "edge" as const,
 position: "r" as const,
 x: bounds.x + bounds.width,
 y: bounds.y + bounds.height / 2,
 },
 {
 type: "edge" as const,
 position: "b" as const,
 x: bounds.x + bounds.width / 2,
 y: bounds.y + bounds.height,
 },
 {
 type: "edge" as const,
 position: "l" as const,
 x: bounds.x,
 y: bounds.y + bounds.height / 2,
 },
 ];

 positions.forEach((pos) => {
 const graphics = new Graphics();
 graphics.rect(-size / 2, -size / 2, size, size);
 graphics.fill({ color: 0xffffff });
 graphics.stroke({ width: 1, color: SELECTION_CONSTANTS.HANDLE_COLOR });
 graphics.position.set(pos.x, pos.y);
 graphics.eventMode = "static";

 const handle: TransformHandle = {
 type: pos.type,
 position: pos.position,
 graphics,
 bounds: new Rectangle(pos.x - size / 2, pos.y - size / 2, size, size),
 };

 handles.push(handle);
 });

 return handles;
 }

 private getHandleAtPoint(point: Point): TransformHandle | null {
 if (!this.selectionGroup) return null;

 for (const handle of this.selectionGroup.transformHandles) {
 const bounds = handle.bounds;
 // Use manual bounds checking for consistency
 if (
 point.x >= bounds.x &&
 point.x <= bounds.x + bounds.width &&
 point.y >= bounds.y &&
 point.y <= bounds.y + bounds.height
 ) {
 return handle;
 }
 }

 return null;
 }

 private startTransform(handle: TransformHandle, point: Point): void {
 this.isTransforming = true;
 this.activeHandle = handle;
 this.transformStart.copyFrom(point);
 console.log(
 `🎯 SELECTION: Started transform with ${handle.position} handle`,
 );
 }

 private updateTransform(currentPoint: Point): void {
 if (!this.activeHandle || !this.selectionGroup) return;

 const bounds = this.selectionGroup.bounds;
 const dx = currentPoint.x - this.transformStart.x;
 const dy = currentPoint.y - this.transformStart.y;

 console.log(`🎯 SELECTION: Transforming with ${this.activeHandle.position} handle, dx: ${dx}, dy: ${dy}`);

 // Enhanced transformation based on handle position
 if (this.activeHandle.type === "corner") {
 this.performCornerResize(dx, dy, this.activeHandle.position, bounds);
 } else if (this.activeHandle.type === "edge") {
 this.performEdgeResize(dx, dy, this.activeHandle.position, bounds);
 }

 // Update selection group after transformation
 this.createSelectionGroup();
 this.transformStart.copyFrom(currentPoint);
 }

 private performCornerResize(dx: number, dy: number, corner: string, bounds: Rectangle): void {
 if (this.selectedObjects.length === 0) return;

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
 
 // Ensure minimum scale - both relative (20%) and absolute (minimum pixel size)
 scaleX = Math.max(0.2, minScaleX, scaleX);
 scaleY = Math.max(0.2, minScaleY, scaleY);

 console.log(`🎯 SELECTION: Applied corner resize scale constraints - scaleX: ${scaleX.toFixed(2)}, scaleY: ${scaleY.toFixed(2)}`);

 // Apply transformation to all selected objects
 this.selectedObjects.forEach(obj => {
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
 if (this.selectedObjects.length === 0) return;

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

 // Calculate minimum scale based on canvas size and object bounds
 const minPixelSize = 10; // Minimum 10px size
 const minScaleX = minPixelSize / bounds.width;
 const minScaleY = minPixelSize / bounds.height;
 
 // Ensure minimum scale - both relative (20%) and absolute (minimum pixel size)
 scaleX = Math.max(0.2, minScaleX, scaleX);
 scaleY = Math.max(0.2, minScaleY, scaleY);

 console.log(`🎯 SELECTION: Applied edge resize scale constraints - scaleX: ${scaleX.toFixed(2)}, scaleY: ${scaleY.toFixed(2)}`);

 // Apply transformation to all selected objects
 this.selectedObjects.forEach(obj => {
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

 private updateDrag(currentPoint: Point): void {
 if (this.selectedObjects.length === 0) return;

 const dx = currentPoint.x - this.transformStart.x;
 const dy = currentPoint.y - this.transformStart.y;

 // Move all selected objects
 this.selectedObjects.forEach((obj) => {
 if (obj.position) {
 obj.position.x += dx;
 obj.position.y += dy;
 }
 });

 // Update selection group
 this.createSelectionGroup();

 this.transformStart.copyFrom(currentPoint);
 }

 private findObjectsInBounds(bounds: Rectangle, container: Container): any[] {
 const objectsInBounds: any[] = [];

 for (const child of container.children) {
 // Skip selection UI elements
 if (this.isSelectionUIElement(child)) continue;

 try {
 const childBounds = child.getBounds();
 // Manual bounds intersection check since PIXI bounds types might be inconsistent
 if (
 childBounds &&
 typeof childBounds.x === "number" &&
 typeof childBounds.y === "number" &&
 typeof childBounds.width === "number" &&
 typeof childBounds.height === "number"
 ) {
 // Check if rectangles intersect
 if (
 !(
 bounds.x + bounds.width < childBounds.x ||
 childBounds.x + childBounds.width < bounds.x ||
 bounds.y + bounds.height < childBounds.y ||
 childBounds.y + childBounds.height < bounds.y
 )
 ) {
 objectsInBounds.push(child);
 }
 }
 } catch (error) {
 console.warn(
 "🎯 SELECTION: Error checking bounds intersection:",
 error,
 );
 continue;
 }
 }

 return objectsInBounds;
 }

 private getObjectAtPoint(point: Point, container: Container): any | null {
 // Check objects from top to bottom
 for (let i = container.children.length - 1; i >= 0; i--) {
 const child = container.children[i];

 // Skip selection UI elements
 if (this.isSelectionUIElement(child)) continue;

 try {
 const bounds = child.getBounds();
 // Check if bounds is valid and has the required properties
 if (
 bounds &&
 typeof bounds.x === "number" &&
 typeof bounds.y === "number" &&
 typeof bounds.width === "number" &&
 typeof bounds.height === "number"
 ) {
 // Use manual bounds checking since bounds.contains might not work as expected
 if (
 point.x >= bounds.x &&
 point.x <= bounds.x + bounds.width &&
 point.y >= bounds.y &&
 point.y <= bounds.y + bounds.height
 ) {
 return child;
 }
 }
 } catch (error) {
 console.warn("🎯 SELECTION: Error getting bounds for object:", error);
 continue;
 }
 }

 return null;
 }

 private isSelectionUIElement(object: any): boolean {
 // Check if this is part of the selection UI
 if (this.selectionGroup) {
 if (object === this.selectionGroup.selectionBox) return true;
 if (
 this.selectionGroup.transformHandles.some((h) => h.graphics === object)
 )
 return true;
 }
 if (object === this.marqueeGraphics) return true;

 return false;
 }

 private calculateCombinedBounds(objects: any[]): Rectangle {
 if (objects.length === 0) return new Rectangle(0, 0, 0, 0);

 let minX = Infinity,
 minY = Infinity,
 maxX = -Infinity,
 maxY = -Infinity;

 objects.forEach((obj) => {
 try {
 const bounds = obj.getBounds();
 if (
 bounds &&
 typeof bounds.x === "number" &&
 typeof bounds.y === "number" &&
 typeof bounds.width === "number" &&
 typeof bounds.height === "number"
 ) {
 minX = Math.min(minX, bounds.x);
 minY = Math.min(minY, bounds.y);
 maxX = Math.max(maxX, bounds.x + bounds.width);
 maxY = Math.max(maxY, bounds.y + bounds.height);
 }
 } catch (error) {
 console.warn(
 "🎯 SELECTION: Error calculating bounds for object:",
 error,
 );
 }
 });

 // If no valid bounds were found, return a default rectangle
 if (minX === Infinity) {
 return new Rectangle(0, 0, 0, 0);
 }

 return new Rectangle(minX, minY, maxX - minX, maxY - minY);
 }

 private removeSelectionGroup(): void {
 if (this.selectionGroup) {
 // Remove selection box
 if (this.selectionGroup.selectionBox.parent) {
 this.selectionGroup.selectionBox.parent.removeChild(
 this.selectionGroup.selectionBox,
 );
 }

 // Remove transform handles
 this.selectionGroup.transformHandles.forEach((handle) => {
 if (handle.graphics.parent) {
 handle.graphics.parent.removeChild(handle.graphics);
 }
 });

 this.selectionGroup = null;
 }
 }

 private clearSelection(): void {
 this.selectedObjects = [];
 this.removeSelectionGroup();
 }

 onActivate(): void {
 super.onActivate();
 
 // Add keyboard event listener for delete functionality
 document.addEventListener('keydown', this.handleKeyDown);
 console.log('🎯 SELECTION: Activated with keyboard shortcuts');
 }

 onDeactivate(): void {
 super.onDeactivate();
 this.clearSelection();

 // Remove marquee if active
 if (this.marqueeGraphics && this.marqueeGraphics.parent) {
 this.marqueeGraphics.parent.removeChild(this.marqueeGraphics);
 this.marqueeGraphics = null;
 }

 // Remove keyboard event listener
 document.removeEventListener('keydown', this.handleKeyDown);

 this.isSelecting = false;
 this.isTransforming = false;
 }

 /**
 * Handle keyboard events for selection operations
 */
 private handleKeyDown = (event: KeyboardEvent): void => {
 // Only handle events when this tool is active
 if (this.selectedObjects.length === 0) return;

 switch (event.key) {
 case 'Backspace':
 case 'Delete':
 event.preventDefault();
 this.deleteSelectedObjects();
 console.log('🎯 SELECTION: Deleted selected objects via keyboard');
 break;
 case 'Escape':
 this.clearSelection();
 console.log('🎯 SELECTION: Cleared selection via keyboard');
 break;
 }
 };

 /**
 * Delete all currently selected objects
 */
 private deleteSelectedObjects(): void {
 if (this.selectedObjects.length === 0) return;

 const deletedCount = this.selectedObjects.length;
 
 // Remove objects from their parent containers
 this.selectedObjects.forEach(obj => {
 if (obj.parent) {
 obj.parent.removeChild(obj);
 }
 // Destroy the object to free memory
 if (obj.destroy && typeof obj.destroy === 'function') {
 obj.destroy();
 }
 });

 // Clear selection
 this.clearSelection();
 
 console.log(`🎯 SELECTION: Deleted ${deletedCount} objects`);
 }

 updateSettings(settings: SelectionSettings): void {
 this.settings = { ...this.settings, ...settings };
 }

 // Get currently selected objects
 getSelectedObjects(): any[] {
 return [...this.selectedObjects];
 }

 // Select specific objects programmatically
 selectSpecificObjects(objects: any[]): void {
 this.selectObjects(objects);
 }

 // Clear selection programmatically
 clearSelectionProgrammatically(): void {
 this.clearSelection();
 }
}
