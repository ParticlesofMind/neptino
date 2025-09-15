/**
 * Click Selection Functionality
 * Handles single-click, multi-click, and point-based object selection
 */

import { Container, Point } from "pixi.js";

export class ClickSelection {
 // Double-click tracking for text editing
 private lastClickTime: number = 0;
 private lastClickedObject: any = null;
 private lastClickPoint: Point = new Point(0, 0);
 private lastHitStack: any[] = [];
 private lastHitIndex: number = -1;
 private readonly DOUBLE_CLICK_TIMEOUT = 300; // milliseconds
 private readonly CYCLE_TIMEOUT = 500; // milliseconds for cycling through stack
 private readonly CYCLE_TOLERANCE = 4; // px movement tolerance to consider same spot

 public handleClick(
 point: Point,
 container: Container,
 modifiers: boolean | { shiftKey?: boolean; altKey?: boolean; ctrlKey?: boolean },
 onTextEdit?: (object: any, point: Point, container: Container) => void
 ): { clickedObject: any; isDoubleClick: boolean } {
 const mod = typeof modifiers === 'boolean' ? { shiftKey: modifiers } : (modifiers || {});
 const hitStack = this.getObjectsAtPoint(point, container);
 let clickedObject = hitStack[0] || null;
 // Alt/Ctrl-click cycles through stacked objects at the same point (backwards in z-order)
 const now = Date.now();
 const sameSpot = Math.hypot(point.x - this.lastClickPoint.x, point.y - this.lastClickPoint.y) <= this.CYCLE_TOLERANCE;
 const canCycle = (mod.altKey || mod.ctrlKey || (sameSpot && (now - this.lastClickTime) < this.CYCLE_TIMEOUT));
 if (canCycle && hitStack.length > 1) {
   // Build a stable stack id by reference list; if same as last, advance index
   const sameStack = this.lastHitStack.length === hitStack.length && this.lastHitStack.every((o, i) => o === hitStack[i]);
   if (!sameStack) {
     this.lastHitStack = hitStack;
     this.lastHitIndex = 0;
   } else {
     this.lastHitIndex = (this.lastHitIndex + 1) % hitStack.length;
   }
   clickedObject = this.lastHitStack[this.lastHitIndex];
 } else {
   this.lastHitStack = hitStack;
   this.lastHitIndex = 0;
 }
 const currentTime = now;

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
 this.lastClickPoint = new Point(point.x, point.y);

 return { clickedObject, isDoubleClick };
 }

  public getObjectsAtPoint(point: Point, container: Container): any[] {
    const hits: any[] = [];
    const visit = (node: any) => {
      if (!node) return;
      // Skip entire scene containers and their subtree; scenes are not selectable targets
      if ((node as any).__sceneRef) return;
      try {
        if (this.isSelectableObject(node)) {
          const b = node.getBounds();
          if (point.x >= b.x && point.x <= b.x + b.width && point.y >= b.y && point.y <= b.y + b.height) {
            hits.push(node);
          }
        }
      } catch {}
      if (node.children && Array.isArray(node.children)) {
        for (const ch of node.children) visit(ch);
      }
    };
   // Front-to-back: visit in reverse order at each level to prioritize visually top items first
   const visitReversed = (nodes: any[]) => {
     for (let i = nodes.length - 1; i >= 0; i--) visit(nodes[i]);
   };
   visitReversed(container.children);
   return hits;
 }

  public isSelectableObject(object: any): boolean {
    // Skip selection graphics and handles
    if (object.name?.startsWith('selection-') || 
        object.name?.startsWith('transform-') ||
        this.isTransformerObject(object)) {
      return false;
    }

    // Skip scene containers and anything inside them
    let cur: any = object;
    for (let i = 0; i < 8 && cur; i++) {
      if ((cur as any).__sceneRef) return false;
      cur = cur.parent;
    }

    // Check for valid drawable objects
    return object.getBounds && typeof object.getBounds === 'function';
  }

  private isTransformerObject(object: any): boolean {
    // Exclude transformer UI root and its children (custom transformer)
    let cur: any = object;
    for (let i = 0; i < 5 && cur; i++) {
      const ctorName = cur?.constructor?.name || '';
      const name = cur?.name || '';
      if (ctorName === 'Transformer' || name.includes('transformer')) return true;
      cur = cur.parent;
    }
    return false;
  }

 public isTextObject(object: any): boolean {
   return object && (
     object.constructor.name === 'Text' || 
     object.text !== undefined ||
     object.isTextObject === true  // Support for our TextArea containers
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

 const isSelected = currentSelection.includes(clickedObject);
 if (shiftKey) {
   // Toggle with shift
   return { action: isSelected ? 'remove' : 'add', object: clickedObject };
 }
 // No modifier: if already in a multi-selection, clicking it removes it; otherwise replace
 if (isSelected && currentSelection.length > 1) {
   return { action: 'remove', object: clickedObject };
 }
 // Default replace
 return { action: 'replace', object: clickedObject };
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
