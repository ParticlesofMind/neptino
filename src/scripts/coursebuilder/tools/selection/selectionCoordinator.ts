/**
 * Selection Coordinator  
 * Main coordination layer that orchestrates all selection functionality
 */

import {
 FederatedPointerEvent,
 Container,
 Point,
} from "pixi.js";
import { BaseTool } from "../ToolInterface";
import { SelectionSettings, SelectionState, TransformHandle } from "./types";
import { MarqueeSelection } from "./marqueeSelection";
import { ClickSelection } from "./clickSelection";
import { SelectionVisuals } from "./selectionVisuals";
import { ScaleObjects } from "./scaleObjects";
import { RotateObjects } from "./rotateObjects";

export class SelectionCoordinator extends BaseTool {
 private state: SelectionState;
 protected settings: SelectionSettings = {};
 
 // Specialized functionality modules
 private marqueeSelector: MarqueeSelection;
 private clickSelector: ClickSelection;
 private visuals: SelectionVisuals;
 private scaler: ScaleObjects;
 private rotator: RotateObjects;

 constructor() {
 super("selection", "default");
 
 this.state = {
 selectedObjects: [],
 selectionGroup: null,
 isTransforming: false,
 activeHandle: null,
 transformStart: new Point(0, 0),
 selectionCenter: new Point(0, 0),
 };
 
 // Initialize modules
 this.marqueeSelector = new MarqueeSelection();
 this.clickSelector = new ClickSelection();
 this.scaler = new ScaleObjects(this.state);
 this.rotator = new RotateObjects(this.state);
 this.visuals = new SelectionVisuals(this.rotator);
 
 this.handleKeyDown = this.handleKeyDown.bind(this);
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 const localPoint = container.toLocal(event.global);

 // Check if clicking on a transform handle
 const handle = this.visuals.getTransformHandleAtPoint(localPoint, this.state.selectionGroup);
 
 if (handle) {
   // Start transformation
   this.state.isTransforming = true;
   this.state.activeHandle = handle;
   this.state.transformStart.copyFrom(localPoint);

   // 🎯 CURSOR MANAGEMENT: Set appropriate cursor for active transformation
   this.cursor = this.getCursorForHandle(handle);

   // Start rotation if it's a rotation handle
   if (handle.type === "rotation") {
   this.rotator.startRotation(localPoint);
   }
   return;
 }

 // Check if clicking on selected objects to start dragging
 const clickedObject = this.clickSelector.getObjectAtPoint(localPoint, container);
 if (clickedObject && this.state.selectedObjects.includes(clickedObject)) {
   this.state.isTransforming = true;
   this.state.transformStart.copyFrom(localPoint);
   // 🎯 CURSOR MANAGEMENT: Use move cursor for dragging
   this.cursor = 'move';
   return;
 }

 // Handle selection
 const clickResult = this.clickSelector.handleClick(
 localPoint, 
 container, 
 event.shiftKey,
 this.enterTextEditMode.bind(this)
 );

 if (!clickResult.isDoubleClick) {
 const selectionAction = this.clickSelector.getSelectionAction(
 clickResult.clickedObject,
 this.state.selectedObjects,
 event.shiftKey
 );

 const newSelection = this.clickSelector.applySelectionAction(
 selectionAction,
 this.state.selectedObjects
 );

 this.selectObjects(newSelection);

 // Start marquee selection if no object was clicked and not holding shift
 if (!clickResult.clickedObject && !event.shiftKey) {
 this.marqueeSelector.startSelection(localPoint, container);
 }
 }
 }

 onPointerMove(event: FederatedPointerEvent, container: Container): void {
   // 🔒 CRITICAL: Only respond if this tool is active
   if (!this.isActive) {
     return;
   } const localPoint = container.toLocal(event.global);

 if (this.state.isTransforming && this.state.activeHandle) {
 // Handle transformation via specialized modules
 if (this.state.activeHandle.type === "rotation") {
 this.rotator.updateTransform(localPoint);
 } else {
 // Use the existing scaling system (it works!)
 this.scaler.updateTransform(localPoint);
 }
 this.refreshSelectionGroup(container);
 } else if (this.state.isTransforming && this.state.selectedObjects.length > 0) {
 // Handle dragging
 this.scaler.updateDrag(localPoint);
 this.refreshSelectionGroup(container);
 } else if (this.marqueeSelector.isActive) {
 this.marqueeSelector.updateSelection(localPoint);
 } else {
   const hoveredHandle = this.visuals.getTransformHandleAtPoint(localPoint, this.state.selectionGroup);

   // Update tool cursor directly instead of using visuals.updateCursor
   const newCursor = this.getCursorForHandle(hoveredHandle);
   if (newCursor !== this.cursor) {
     this.cursor = newCursor;
   }
 }
 }

 onPointerUp(_event: FederatedPointerEvent, container: Container): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 if (this.marqueeSelector.isActive) {
 const marqueeResult = this.marqueeSelector.completeSelection(container);
 if (marqueeResult.objects.length > 0) {
 // Use regular selection method - selection visuals will use actual object bounds
 this.selectObjects(marqueeResult.objects);
 }
 } else if (this.state.isTransforming) {
   if (this.state.activeHandle?.type === "rotation") {
   this.rotator.stopRotation();
   }
   this.state.isTransforming = false;
   this.state.activeHandle = null;
   // 🎯 CURSOR MANAGEMENT: Reset cursor when transformation ends
   this.cursor = 'default';
 }
 }

 public selectObjects(objects: any[]): void {
 this.state.selectedObjects = [...objects];
 this.refreshSelectionGroup();
 }

 public clearSelection(): void {
   this.state.selectedObjects = [];
   this.refreshSelectionGroup();
   // 🎯 CURSOR MANAGEMENT: Reset cursor when clearing selection
   this.cursor = 'default';
 }

 private refreshSelectionGroup(container?: Container): void {
 // Remove existing selection group
 this.visuals.removeSelectionGroup(this.state.selectionGroup);
 this.state.selectionGroup = null;

 // Create new selection group if objects are selected
 if (this.state.selectedObjects.length > 0) {
 const parentContainer = container || this.state.selectedObjects[0]?.parent;
 if (parentContainer) {
 this.state.selectionGroup = this.visuals.createSelectionGroup(
 this.state.selectedObjects, 
 parentContainer
 );
 }
 }
 }

  private enterTextEditMode(textObject: any, point: Point, container: Container): void {
    // Get the tool manager to switch to text tool
    if (this.manager && typeof (this.manager as any).manager !== 'undefined') {
      const toolManager = (this.manager as any).manager;
      
      // Switch to text tool
      const success = toolManager.setActiveTool('text');
      if (success) {
        // Get the text tool instance
        const textTool = toolManager.getActiveTool();
        if (textTool && typeof (textTool as any).activateTextObjectForEditing === 'function') {
          // Activate the specific text object for editing
          (textTool as any).activateTextObjectForEditing(textObject, point, container);
        }
      }
    }
  } private handleKeyDown = (event: KeyboardEvent): void => {
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
   this.marqueeSelector.cancelSelection(this.state.selectedObjects[0]?.parent);
   document.removeEventListener('keydown', this.handleKeyDown);
   this.state.isTransforming = false;
   // 🎯 CURSOR MANAGEMENT: Reset cursor when deactivating tool
   this.cursor = 'default';
 } updateSettings(settings: SelectionSettings): void {
 this.settings = { ...this.settings, ...settings };
 }

 // Public API getters for external access
 public getSelectedObjects(): any[] {
 return this.state.selectedObjects;
 }

 public getSelectionGroup() {
 return this.state.selectionGroup;
 }

 public getSelectionState() {
 return this.state;
 }

 // Programmatic methods
 public clearSelectionProgrammatically(): void {
 this.clearSelection();
 }

 public rotateSelectedObjects(angleInRadians: number): void {
 this.rotator.rotateSelectedObjects(angleInRadians);
 this.refreshSelectionGroup();
 }

 public scaleSelectedObjects(scaleX: number, scaleY: number): void {
 this.scaler.scaleSelectedObjects(scaleX, scaleY);
 this.refreshSelectionGroup();
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
 return 'nwse-resize';
 case 'tr': // Top-right
 case 'bl': // Bottom-left
 return 'nesw-resize';
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
 return 'ns-resize';
 case 'l': // Left
 case 'r': // Right
 return 'ew-resize';
 default:
 return 'default';
 }
 }
}
