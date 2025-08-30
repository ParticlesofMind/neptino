/**
 * Click Selection Functionality
 * Handles single-click, multi-click, and point-based object selection
 */

import {
 Container,
 Point,
} from "pixi.js";

export class ClickSelection {
 // Double-click tracking for text editing
 private lastClickTime: number = 0;
 private lastClickedObject: any = null;
 private readonly DOUBLE_CLICK_TIMEOUT = 300; // milliseconds

 public handleClick(
 point: Point, 
 container: Container, 
 _shiftKey: boolean,
 onTextEdit?: (object: any, point: Point, container: Container) => void
 ): { clickedObject: any; isDoubleClick: boolean } {
 const clickedObject = this.getObjectAtPoint(point, container);
 const currentTime = Date.now();
 
 // Check for double-click on text objects
 const isDoubleClick = clickedObject && 
   clickedObject === this.lastClickedObject && 
   currentTime - this.lastClickTime < this.DOUBLE_CLICK_TIMEOUT &&
   this.isTextObject(clickedObject);
 
 if (isDoubleClick && onTextEdit) {
 onTextEdit(clickedObject, point, container);
 }
 
 // Update click tracking
 this.lastClickTime = currentTime;
 this.lastClickedObject = clickedObject;

 return { clickedObject, isDoubleClick };
 }

 public getObjectAtPoint(point: Point, container: Container): any {
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

 public isSelectableObject(object: any): boolean {
 // Skip selection graphics and handles
 if (object.name?.startsWith('selection-') || 
     object.name?.startsWith('transform-')) {
 return false;
 }
 
 // Check for valid drawable objects
 return object.getBounds && typeof object.getBounds === 'function';
 }

 public isTextObject(object: any): boolean {
   return object && (
     (object.constructor.name === 'Text' ||
     object.text !== undefined || object.isTextObject === true)  // Support for our TextArea containers
   );
 } /**
 * Determine selection action based on click context
 */
 public getSelectionAction(
 clickedObject: any, 
 currentSelection: any[], 
 shiftKey: boolean
 ): { action: 'replace' | 'add' | 'remove' | 'clear'; object?: any } {
 
 if (!clickedObject) {
 return shiftKey ? { action: 'clear' } : { action: 'clear' };
 }

 if (shiftKey) {
 // Toggle selection when shift is held
 const isSelected = currentSelection.includes(clickedObject);
 return {
 action: isSelected ? 'remove' : 'add',
 object: clickedObject
 };
 } else {
 // Replace selection when no modifier
 return {
 action: 'replace',
 object: clickedObject
 };
 }
 }

 /**
 * Apply selection changes based on action
 */
 public applySelectionAction(
 action: { action: 'replace' | 'add' | 'remove' | 'clear'; object?: any },
 currentSelection: any[]
 ): any[] {
 switch (action.action) {
 case 'replace':
 return action.object ? [action.object] : [];
 
 case 'add':
 return action.object ? [...currentSelection, action.object] : currentSelection;
 
 case 'remove':
 return action.object ? 
 currentSelection.filter(obj => obj !== action.object) : 
 currentSelection;
 
 case 'clear':
 default:
 return [];
 }
 }
}
