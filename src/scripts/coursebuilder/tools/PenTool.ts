/**
 * Pen Tool
 * Node-based vector drawing system with professional color palette
 */

import { FederatedPointerEvent, Container, Graphics, Point } from "pixi.js";
import { BaseTool } from "./ToolInterface";
import {
 PROFESSIONAL_COLORS,
 STROKE_SIZES,
 PEN_CONSTANTS,
 hexToNumber,
} from "./SharedResources";
import { BoundaryUtils } from "./BoundaryUtils";
import { historyManager } from "../canvas/HistoryManager";

interface PenSettings {
 size: number;
 strokeColor: string;   // Primary stroke color
 fillColor: string;     // Fill color for closed shapes
 strokeType?: string;   // Line style (solid, dashed)
}

interface VectorNode {
 position: Point;
 graphics: Graphics;
 // Cubic bezier handles (optional). If absent, treat as corner.
 handleIn?: Point | null;
 handleOut?: Point | null;
 // Visuals for handles while editing
 handleInGraphics?: { line: Graphics; knob: Graphics } | null;
 handleOutGraphics?: { line: Graphics; knob: Graphics } | null;
}

interface VectorPath {
 nodes: VectorNode[];
 pathGraphics: Graphics;
 isComplete: boolean;
 settings: PenSettings;
}

export class PenTool extends BaseTool {
 public isDrawing: boolean = false;
 private currentPath: VectorPath | null = null;
  private previewLine: Graphics | null = null;
 private lastMousePosition: Point = new Point(0, 0);
 private hoverIndicator: Graphics | null = null;
  private snapIndicator: Graphics | null = null;
  // Drag-to-create-handle state
  private isPointerDown: boolean = false;
  private activeDragNode: VectorNode | null = null;
  private dragStartAtNode: Point | null = null;
  private isDraggingHandles: boolean = false;
  private static readonly HANDLE_DRAG_THRESHOLD = 3; // px
  // Editing existing path state
  private isEditingExistingPath: boolean = false;
  private editingWasClosed: boolean = false;
  private originalShapeForEdit: Graphics | null = null;
  private dragMode: 'none' | 'anchor' | 'handle-in' | 'handle-out' = 'none';
  private maintainMirrorOnHandleDrag: boolean = true;
  private lastClickTime: number = 0;
  private lastClickedNodeIndex: number = -1;
  private static readonly NODE_HIT_TOLERANCE = 8;
  private static readonly HANDLE_KNOB_RADIUS = 3;
  private static readonly DEFAULT_HANDLE_LEN = 30;

 constructor() {
         super("pen", "url('/src/assets/cursors/pen-cursor.svg') 2 2, crosshair");
 this.settings = {
 size: STROKE_SIZES.PEN[2], // Start with 3px
 strokeColor: '#1a1a1a',  // Black stroke
 fillColor: '#f8fafc',    // White fill
 strokeType: 'solid',     // Solid lines by default
 };
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 console.log(
 `✏️ PEN: Node placement at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
 );
 console.log(
 `✏️ PEN: Settings - Stroke: ${this.settings.strokeColor}, Size: ${this.settings.size}px, Fill: ${this.settings.fillColor}`,
 );

 const localPoint = container.toLocal(event.global);
 
 // 🚫 MARGIN PROTECTION: Prevent creation in margin areas
 const canvasBounds = this.manager.getCanvasBounds();
 if (!BoundaryUtils.isPointInContentArea(localPoint, canvasBounds)) {
 return; // Exit early - no creation allowed in margins
 }
 
 // Point is in content area, safe to proceed
 let clampedPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);
 
 // Log if point was adjusted
 if (Math.abs(localPoint.x - clampedPoint.x) > 1 || Math.abs(localPoint.y - clampedPoint.y) > 1) {
 console.log(
 `✏️ PEN: 🎯 Point clamped from (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)}) to (${Math.round(clampedPoint.x)}, ${Math.round(clampedPoint.y)})`
 );
 }
 
 this.lastMousePosition.copyFrom(clampedPoint);

 // If not currently drawing, check if clicking an existing pen shape to edit
 if (!this.currentPath) {
   const penShape = this.findPenShapeAt(container, event.global);
   if (penShape) {
     this.enterEditModeFromShape(penShape as Graphics, container);
     return;
   }
 }

 // If editing existing path, interpret click as selection/drag start
 if (this.currentPath && this.isEditingExistingPath) {
   const local = container.toLocal(event.global);
   const hit = this.pickNodeOrHandle(local);
   if (hit) {
     const now = performance.now();
     // Double-click to toggle point type
     if (hit.kind === 'anchor') {
       const idx = hit.index;
       if (this.lastClickedNodeIndex === idx && now - this.lastClickTime < 300) {
         this.toggleNodeType(this.currentPath.nodes[idx], idx, container);
         this.lastClickTime = 0; // reset
         this.updatePathGraphics();
         return;
       }
       this.lastClickTime = now;
       this.lastClickedNodeIndex = idx;
     }

     // Start dragging
     this.isPointerDown = true;
     this.activeDragNode = this.currentPath.nodes[hit.index];
     this.dragMode = hit.kind as any;
     this.maintainMirrorOnHandleDrag = !(event as any).altKey;
     this.lastMousePosition.copyFrom(local);
     return; // do not add nodes in edit mode
   }
   // Clicked empty space in edit mode: no-op (could deselect)
   return;
 }

 // Check if we're continuing an existing path or starting a new one
 if (this.currentPath && this.currentPath.nodes.length > 0) {
  // Check if clicking near the first node to close the path
  const firstNode = this.currentPath.nodes[0];
 const distance = Math.sqrt(
 Math.pow(clampedPoint.x - firstNode.position.x, 2) +
 Math.pow(clampedPoint.y - firstNode.position.y, 2),
 );

 if (distance <= PEN_CONSTANTS.PATH_CLOSE_TOLERANCE) {
 this.completePath(true);
 return;
 }

 // If extending an existing path with Shift held, snap the new node to a straight line
 if ((event as any).shiftKey && this.currentPath && this.currentPath.nodes.length > 0) {
   const lastNode = this.currentPath.nodes[this.currentPath.nodes.length - 1].position;
   const dx = clampedPoint.x - lastNode.x;
   const dy = clampedPoint.y - lastNode.y;
   const angle = Math.atan2(dy, dx);
   const step = Math.PI / 4;
   const snapped = Math.round(angle / step) * step;
   const dist = Math.hypot(dx, dy);
   const snappedPoint = new Point(lastNode.x + Math.cos(snapped) * dist, lastNode.y + Math.sin(snapped) * dist);
   clampedPoint = BoundaryUtils.clampPoint(snappedPoint, canvasBounds);
 } else {
   // No constraint
 }
 }

 // Add new node to current path or start new path
 this.addNodeToPath(clampedPoint, container);

 // Begin potential handle drag for the just-created node
 this.isPointerDown = true;
 this.isDraggingHandles = false;
 if (this.currentPath && this.currentPath.nodes.length > 0) {
   this.activeDragNode = this.currentPath.nodes[this.currentPath.nodes.length - 1];
   this.dragStartAtNode = this.activeDragNode.position.clone();
 }
 }

 onPointerMove(event: FederatedPointerEvent, container: Container): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 const localPoint = container.toLocal(event.global);
 
 // 🎯 BOUNDARY ENFORCEMENT: Clamp mouse position for preview
 const canvasBounds = this.manager.getCanvasBounds();
 let clampedPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);

 // If Shift held and we have an anchor (last node), snap preview to straight line
 const shiftHeld = (event as any).shiftKey === true;
 if (shiftHeld && this.currentPath && this.currentPath.nodes.length > 0) {
   const anchor = this.currentPath.nodes[this.currentPath.nodes.length - 1].position;
   const dx = clampedPoint.x - anchor.x;
   const dy = clampedPoint.y - anchor.y;
   const angle = Math.atan2(dy, dx);
   const step = Math.PI / 4;
   const snapped = Math.round(angle / step) * step;
   const dist = Math.hypot(dx, dy);
   const snappedPoint = new Point(anchor.x + Math.cos(snapped) * dist, anchor.y + Math.sin(snapped) * dist);
   clampedPoint = BoundaryUtils.clampPoint(snappedPoint, canvasBounds);
 } else if (!shiftHeld) {
   // No constraint
 }

 // Show snap anchor hover if near any anchor
 const snap = this.findNearestAnchor(container, clampedPoint, 8);
 if (snap) {
   this.showSnapIndicator(snap, container);
 } else {
   this.removeSnapIndicator();
 }

 this.lastMousePosition.copyFrom(clampedPoint);

 // Editing drag logic
 if (this.currentPath && this.isEditingExistingPath && this.isPointerDown && this.activeDragNode) {
   const node = this.activeDragNode;
   const prev = new Point(this.lastMousePosition.x, this.lastMousePosition.y);
   const p = clampedPoint;
   const dx = p.x - prev.x;
   const dy = p.y - prev.y;
   if (this.dragMode === 'anchor') {
     // Move anchor and translate handles accordingly
     node.position.x += dx;
     node.position.y += dy;
     if (node.handleIn) { node.handleIn.x += dx; node.handleIn.y += dy; }
     if (node.handleOut) { node.handleOut.x += dx; node.handleOut.y += dy; }
   } else if (this.dragMode === 'handle-in') {
     // Set handleIn to current point
     node.handleIn = new Point(p.x, p.y);
     if (this.maintainMirrorOnHandleDrag) {
       const vx = node.position.x - p.x;
       const vy = node.position.y - p.y;
       node.handleOut = new Point(node.position.x + vx, node.position.y + vy);
     }
   } else if (this.dragMode === 'handle-out') {
     node.handleOut = new Point(p.x, p.y);
     if (this.maintainMirrorOnHandleDrag) {
       const vx = node.position.x - p.x;
       const vy = node.position.y - p.y;
       node.handleIn = new Point(node.position.x + vx, node.position.y + vy);
     }
   }

   // Refresh visuals
   this.updateHandleGraphics(node, container);
   this.updatePathGraphics();
   return;
 }

 // If pointer is down on the last placed node, interpret as handle dragging
 if (this.isPointerDown && this.activeDragNode && this.dragStartAtNode) {
   const dx = clampedPoint.x - this.dragStartAtNode.x;
   const dy = clampedPoint.y - this.dragStartAtNode.y;
   const dist = Math.hypot(dx, dy);
   if (dist > PenTool.HANDLE_DRAG_THRESHOLD) {
     this.isDraggingHandles = true;
   }

   if (this.isDraggingHandles) {
     // For a smooth point, handles are mirrored
     const outX = this.activeDragNode.position.x + dx;
     const outY = this.activeDragNode.position.y + dy;
     const inX = this.activeDragNode.position.x - dx;
     const inY = this.activeDragNode.position.y - dy;

     this.activeDragNode.handleOut = new Point(outX, outY);
     this.activeDragNode.handleIn = new Point(inX, inY);
     this.updateHandleGraphics(this.activeDragNode, container);
     // Redraw path with curves
     this.updatePathGraphics();
     // While dragging handles, hide the straight preview segment
     this.removePreviewLine();
     return;
   }
 }

 // Check for path completion hover
 this.updatePathCompletionHover(clampedPoint, container);

 // Update preview line if we have an active path
 this.updatePreviewLine(container);
 }

 onPointerUp(_event: FederatedPointerEvent, _container: Container): void {
 // Finalize drag-to-create-handle interaction
 this.isPointerDown = false;
 this.activeDragNode = null;
 this.dragStartAtNode = null;
 this.isDraggingHandles = false;
 this.dragMode = 'none';
 }

  private addNodeToPath(position: Point, container: Container): void {
 // Snap to nearest anchor (shape corners, centers, existing pen nodes)
 position = this.snapToNearestAnchor(container, position);
 if (!this.currentPath) {
  // Start new path
  this.currentPath = {
    nodes: [],
    pathGraphics: new Graphics(),
    isComplete: false,
    settings: { ...this.settings },
  };

  this.currentPath.pathGraphics.eventMode = "static";
  // Tag for selection-based option routing
  (this.currentPath.pathGraphics as any).__toolType = 'pen';
  container.addChild(this.currentPath.pathGraphics);
 }

 // Create node graphics
 const nodeGraphics = new Graphics();
 nodeGraphics.circle(0, 0, PEN_CONSTANTS.NODE_SIZE);
 nodeGraphics.fill({ color: PEN_CONSTANTS.NODE_COLOR });
 nodeGraphics.stroke({
   width: PEN_CONSTANTS.NODE_STROKE_WIDTH,
   color: 0xffffff,
 });
 nodeGraphics.position.set(position.x, position.y);
 nodeGraphics.eventMode = "static";

 container.addChild(nodeGraphics);

 // Create node object
 const node: VectorNode = {
 position: position.clone(),
 graphics: nodeGraphics,
 handleIn: null,
 handleOut: null,
 handleInGraphics: null,
 handleOutGraphics: null,
 };

 this.currentPath.nodes.push(node);
 console.log(
 `✏️ PEN: Added node ${this.currentPath.nodes.length} at (${Math.round(position.x)}, ${Math.round(position.y)})`,
 );
 
 // Give user tips on how to close the path for fill
 if (this.currentPath.nodes.length === 3 && this.settings.fillColor && this.settings.fillColor !== 'transparent') {
 }

 // Update path graphics
 this.updatePathGraphics();

 // Update preview line
 this.updatePreviewLine(container);
 }

 private updatePathGraphics(): void {
 if (!this.currentPath || this.currentPath.nodes.length === 0) return;

 const path = this.currentPath.pathGraphics;

 path.clear();

 if (this.currentPath.nodes.length === 1) {
 // Single node - just show the node
 return;
 }

  // Draw segments between nodes (cubic bezier if handles exist)
  const firstNode = this.currentPath.nodes[0];
  path.moveTo(firstNode.position.x, firstNode.position.y);
  for (let i = 1; i < this.currentPath.nodes.length; i++) {
    const prev = this.currentPath.nodes[i - 1];
    const curr = this.currentPath.nodes[i];
    const c1 = prev.handleOut ?? null;
    const c2 = curr.handleIn ?? null;
    if (c1 && c2) {
      path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, curr.position.x, curr.position.y);
    } else {
      path.lineTo(curr.position.x, curr.position.y);
    }
  }
  // Only apply stroke during the drawing process (not fill)
  // The fill will be applied when the path is completed and closed
  path.stroke({
    width: this.currentPath.settings.size,
    color: hexToNumber(this.currentPath.settings.strokeColor),
    cap: "round",
    join: "round",
  });

 console.log(
 `✏️ PEN: Updated path graphics with ${this.currentPath.nodes.length} nodes, strokeColor: ${this.currentPath.settings.strokeColor}`,
 );
 }

  private updatePreviewLine(container: Container): void {
 if (!this.currentPath || this.currentPath.nodes.length === 0) {
 this.removePreviewLine();
 return;
 }

 if (this.isDraggingHandles) {
   // When dragging handles, do not show a straight preview line
   this.removePreviewLine();
   return;
 }

  if (this.isEditingExistingPath) {
    // No preview while editing an existing shape
    this.removePreviewLine();
    return;
  }

  if (!this.previewLine) {
  this.previewLine = new Graphics();
  this.previewLine.alpha = PEN_CONSTANTS.PREVIEW_LINE_ALPHA;
  container.addChild(this.previewLine);
  }

 const lastNode = this.currentPath.nodes[this.currentPath.nodes.length - 1];

 // Snap preview end to nearest anchor
 const snapped = this.snapToNearestAnchor(container, this.lastMousePosition);
 this.lastMousePosition.copyFrom(snapped);

  this.previewLine.clear();
  this.previewLine.moveTo(lastNode.position.x, lastNode.position.y);
  this.previewLine.lineTo(this.lastMousePosition.x, this.lastMousePosition.y);
  this.previewLine.stroke({
    width: this.currentPath.settings.size,
    color: hexToNumber(this.currentPath.settings.strokeColor),
    cap: "round",
  });
  }

  private removePreviewLine(): void {
  if (this.previewLine && this.previewLine.parent) {
  this.previewLine.parent.removeChild(this.previewLine);
  this.previewLine = null;
  }
  }

  private updateHandleGraphics(node: VectorNode, container: Container): void {
    const drawHandle = (
      kind: 'in' | 'out',
      anchor: Point,
      handle: Point | null | undefined,
      bundle: { line: Graphics; knob: Graphics } | null | undefined,
    ): { line: Graphics; knob: Graphics } | null => {
      if (!handle) {
        // Remove visuals if present
        if (bundle) {
          try {
            bundle.line.parent?.removeChild(bundle.line);
            bundle.knob.parent?.removeChild(bundle.knob);
          } catch {}
        }
        return null;
      }
      let line = bundle?.line;
      let knob = bundle?.knob;
      if (!line) {
        line = new Graphics();
        container.addChild(line);
      }
      if (!knob) {
        knob = new Graphics();
        container.addChild(knob);
      }
      // Style
      line.clear();
      line.moveTo(anchor.x, anchor.y);
      line.lineTo(handle.x, handle.y);
      line.stroke({ width: 1, color: 0x9ca3af, alpha: 0.9 }); // neutral gray

      knob.clear();
      knob.circle(0, 0, 3);
      knob.fill({ color: kind === 'in' ? 0x22c55e : 0x3b82f6 }); // green for in, blue for out
      knob.position.set(handle.x, handle.y);
      return { line, knob };
    };

    node.handleInGraphics = drawHandle('in', node.position, node.handleIn, node.handleInGraphics || undefined);
    node.handleOutGraphics = drawHandle('out', node.position, node.handleOut, node.handleOutGraphics || undefined);
  }

 /**
 * Update hover indicator for path completion
 */
 private updatePathCompletionHover(point: Point, container: Container): void {
 // Remove existing hover indicator
 this.removeHoverIndicator();

 // Only show hover indicator if we have an active path with 2+ nodes
 if (!this.currentPath || this.currentPath.nodes.length < 2) {
 return;
 }

 const firstNode = this.currentPath.nodes[0];
 const distance = Math.sqrt(
 Math.pow(point.x - firstNode.position.x, 2) +
 Math.pow(point.y - firstNode.position.y, 2)
 );

 // Show green indicator when hovering near first node
 if (distance <= PEN_CONSTANTS.PATH_CLOSE_TOLERANCE) {
 this.showHoverIndicator(firstNode.position, container);
 }
 }

 /**
 * Show green hover indicator for path completion
 */
 private showHoverIndicator(position: Point, container: Container): void {
 this.hoverIndicator = new Graphics();
 
 // Create a subtle, desaturated green circle (no blinking)
 this.hoverIndicator.circle(0, 0, PEN_CONSTANTS.NODE_SIZE + 2);
 this.hoverIndicator.fill({ 
 color: 0x4ade80, // Subtle green (more desaturated)
 alpha: 0.6 // More subtle opacity
 });
 this.hoverIndicator.stroke({
 width: 2,
 color: 0x22c55e, // Slightly darker green border (desaturated)
 alpha: 0.8
 });
 
 this.hoverIndicator.position.set(position.x, position.y);
 
 // No animation - static indicator
 
 container.addChild(this.hoverIndicator);
 }

 /**
 * Animate the hover indicator with a pulsing effect
 */
 /**
 * Remove hover indicator
 */
 private removeHoverIndicator(): void {
   if (this.hoverIndicator && this.hoverIndicator.parent) {
     this.hoverIndicator.parent.removeChild(this.hoverIndicator);
     this.hoverIndicator = null;
   }
 }

 /** Snap indicator (blue dot) **/
 private showSnapIndicator(position: Point, container: Container): void {
   if (!this.snapIndicator) {
     this.snapIndicator = new Graphics();
     this.snapIndicator.zIndex = 2000;
     container.addChild(this.snapIndicator);
   }
   this.snapIndicator.clear();
   this.snapIndicator.circle(0, 0, PEN_CONSTANTS.NODE_SIZE + 1);
   this.snapIndicator.fill({ color: 0x3b82f6, alpha: 0.85 });
   this.snapIndicator.position.set(position.x, position.y);
 }
 private removeSnapIndicator(): void {
   if (this.snapIndicator && this.snapIndicator.parent) {
     this.snapIndicator.parent.removeChild(this.snapIndicator);
   }
   this.snapIndicator = null;
 }

 private completePath(closeShape: boolean = false): void {
 if (!this.currentPath) return;

  if (closeShape && this.currentPath.nodes.length >= 3) {
 // Create a new graphics object for the final filled shape
 const finalShape = new Graphics();
 const strokeColorToUse = this.currentPath.settings.strokeColor;
 const fillColorToUse = this.currentPath.settings.fillColor;

 // Build the complete closed path
 const firstNode = this.currentPath.nodes[0];
 finalShape.moveTo(firstNode.position.x, firstNode.position.y);
 
 for (let i = 1; i < this.currentPath.nodes.length; i++) {
   const prev = this.currentPath.nodes[i - 1];
   const curr = this.currentPath.nodes[i];
   const c1 = prev.handleOut ?? null;
   const c2 = curr.handleIn ?? null;
   if (c1 && c2) {
     finalShape.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, curr.position.x, curr.position.y);
   } else {
     finalShape.lineTo(curr.position.x, curr.position.y);
   }
 }
 
 // Close the path back to the first node
 // If last->first has handles, use them for a smooth close
 const last = this.currentPath.nodes[this.currentPath.nodes.length - 1];
 const c1Close = last.handleOut ?? null;
 const c2Close = firstNode.handleIn ?? null;
 if (c1Close && c2Close) {
   finalShape.bezierCurveTo(c1Close.x, c1Close.y, c2Close.x, c2Close.y, firstNode.position.x, firstNode.position.y);
 } else {
   finalShape.lineTo(firstNode.position.x, firstNode.position.y);
 }
 finalShape.closePath();
 
 // Apply fill first (if specified)
 if (fillColorToUse && fillColorToUse !== 'transparent' && fillColorToUse !== '') {
   finalShape.fill({ color: hexToNumber(fillColorToUse) });
 } else {
 }
 
 // Then apply stroke
 finalShape.stroke({
 width: this.currentPath.settings.size,
 color: hexToNumber(strokeColorToUse),
 cap: "round",
 join: "round",
 });

  // Replace the old path graphics with the new filled shape
  const container = this.currentPath.pathGraphics.parent;
  if (container) {
    container.removeChild(this.currentPath.pathGraphics);
    // Tag final shape for selection routing and metadata for restyling
    (finalShape as any).__toolType = 'pen';
    try {
      const nodesData = this.currentPath.nodes.map(n => ({
        x: n.position.x,
        y: n.position.y,
        in: n.handleIn ? { x: n.handleIn.x, y: n.handleIn.y } : null,
        out: n.handleOut ? { x: n.handleOut.x, y: n.handleOut.y } : null,
      }));
      (finalShape as any).__meta = {
        kind: 'pen',
        closed: true,
        nodes: nodesData,
        size: this.currentPath.settings.size,
        strokeColor: this.currentPath.settings.strokeColor,
        fillColor: this.currentPath.settings.fillColor,
      };
    } catch {}
    container.addChild(finalShape);
    // If editing, swap shapes and push history to allow undo back to original
    if (this.originalShapeForEdit) {
      const orig = this.originalShapeForEdit;
      const parent = container;
      try { orig.parent?.removeChild(orig); } catch {}
      const finalIndex = parent.getChildIndex(finalShape);
      historyManager.push({
        label: 'Edit Pen Path',
        undo: () => { try { if (finalShape.parent) finalShape.parent.removeChild(finalShape); } catch {}; try { if (finalIndex >= 0 && finalIndex <= parent.children.length) parent.addChildAt(orig, Math.min(finalIndex, parent.children.length)); else parent.addChild(orig); } catch {}; },
        redo: () => { try { if (orig.parent) orig.parent.removeChild(orig); } catch {}; try { if (finalIndex >= 0 && finalIndex <= parent.children.length) parent.addChildAt(finalShape, Math.min(finalIndex, parent.children.length)); else parent.addChild(finalShape); } catch {}; },
      });
      this.originalShapeForEdit = null;
      this.isEditingExistingPath = false;
    } else {
      // New shape creation history
      const parent = container; const idx = parent.getChildIndex(finalShape);
      historyManager.push({ label: 'Create Pen Path', undo: () => { try { if (finalShape.parent) finalShape.parent.removeChild(finalShape); } catch {}; }, redo: () => { try { if (idx >= 0 && idx <= parent.children.length) parent.addChildAt(finalShape, Math.min(idx, parent.children.length)); else parent.addChild(finalShape); } catch {}; } });
    }
  }

 console.log(
 `✏️ PEN: Closed shape with ${this.currentPath.nodes.length} nodes - Stroke: ${strokeColorToUse}, Fill: ${fillColorToUse || 'none'}`,
 );
 } else {
 // Just a path (open), no fill
 const strokeColorToUse = this.currentPath.settings.strokeColor;
 this.currentPath.pathGraphics.stroke({
   width: this.currentPath.settings.size,
   color: hexToNumber(strokeColorToUse),
   cap: "round",
   join: "round",
 });

  // Attach metadata for later restyling
  try {
    const nodesData = this.currentPath.nodes.map(n => ({
      x: n.position.x,
      y: n.position.y,
      in: n.handleIn ? { x: n.handleIn.x, y: n.handleIn.y } : null,
      out: n.handleOut ? { x: n.handleOut.x, y: n.handleOut.y } : null,
    }));
    (this.currentPath.pathGraphics as any).__meta = {
      kind: 'pen',
      closed: false,
      nodes: nodesData,
      size: this.currentPath.settings.size,
      strokeColor: strokeColorToUse,
      fillColor: null,
    };
    (this.currentPath.pathGraphics as any).__toolType = 'pen';
  } catch {}

 console.log(
 `✏️ PEN: Completed open path with ${this.currentPath.nodes.length} nodes - Stroke: ${strokeColorToUse}`,
 );
 }

 // Remove individual node graphics since the path is complete
 this.currentPath.nodes.forEach((node) => {
 if (node.graphics.parent) {
 node.graphics.parent.removeChild(node.graphics);
 }
 if (node.handleInGraphics) {
   try {
     node.handleInGraphics.line.parent?.removeChild(node.handleInGraphics.line);
     node.handleInGraphics.knob.parent?.removeChild(node.handleInGraphics.knob);
   } catch {}
 }
 if (node.handleOutGraphics) {
   try {
     node.handleOutGraphics.line.parent?.removeChild(node.handleOutGraphics.line);
     node.handleOutGraphics.knob.parent?.removeChild(node.handleOutGraphics.knob);
   } catch {}
 }
 });

 // Mark path as complete
 this.currentPath.isComplete = true;

 // Clean up
 this.removePreviewLine();
 this.currentPath = null;
 this.isEditingExistingPath = false;
 this.originalShapeForEdit = null;

 }

 // Handle keyboard events for path completion
 public onKeyDown(event: KeyboardEvent): void {
 if (!this.currentPath) return;

 switch (event.key) {
 case "Enter":
 // Complete current path without closing
 if (this.isEditingExistingPath) {
   this.completePath(this.editingWasClosed);
 } else {
   this.completePath(false);
 }
 break;
 case "Escape":
 // Cancel current path
 this.cancelPath();
 break;
 case " ": // Spacebar
 // Complete and close current path
 if (this.currentPath.nodes.length >= 3) {
 this.completePath(true);
 }
 event.preventDefault();
 break;
 }
 }

 private cancelPath(): void {
 if (!this.currentPath) return;

 // Remove all node graphics
 this.currentPath.nodes.forEach((node) => {
 if (node.graphics.parent) {
 node.graphics.parent.removeChild(node.graphics);
 }
 if (node.handleInGraphics) {
   try {
     node.handleInGraphics.line.parent?.removeChild(node.handleInGraphics.line);
     node.handleInGraphics.knob.parent?.removeChild(node.handleInGraphics.knob);
   } catch {}
 }
 if (node.handleOutGraphics) {
   try {
     node.handleOutGraphics.line.parent?.removeChild(node.handleOutGraphics.line);
     node.handleOutGraphics.knob.parent?.removeChild(node.handleOutGraphics.knob);
   } catch {}
 }
 });

 // Remove path graphics
 if (this.currentPath.pathGraphics.parent) {
 this.currentPath.pathGraphics.parent.removeChild(
 this.currentPath.pathGraphics,
 );
 }

 // Remove preview line
 this.removePreviewLine();

 // If editing an existing shape, restore it
 if (this.isEditingExistingPath && this.originalShapeForEdit) {
   try { this.originalShapeForEdit.visible = true; } catch {}
 }
 this.currentPath = null;
 this.isEditingExistingPath = false;
 this.originalShapeForEdit = null;
 }

 onActivate(): void {
 super.onActivate();

 // Set up keyboard listeners
 document.addEventListener("keydown", this.handleKeyDown);
 }

 onDeactivate(): void {
  super.onDeactivate();

 // Finalize any active path as open if it has at least 2 nodes, otherwise cancel
 if (this.currentPath) {
   if (this.isEditingExistingPath) {
     // Cancel editing and restore original
     this.cancelPath();
   } else {
     if (this.currentPath.nodes.length >= 2) {
       this.completePath(false);
     } else {
       this.cancelPath();
     }
   }
 }

 // Remove keyboard listeners
 document.removeEventListener("keydown", this.handleKeyDown);

 // Clean up preview line and hover indicator
 this.removePreviewLine();
 this.removeHoverIndicator();
 }

  private handleKeyDown = (): void => {
  // This would need to be handled by the tool manager to get container reference
  };

  /**
   * Find nearest anchor point on existing objects and snap within tolerance
   */
  private snapToNearestAnchor(container: Container, p: Point, tolerance: number = 8): Point {
    const best = this.findNearestAnchor(container, p, tolerance);
    if (best) return best;
    return p;
  }

  private findNearestAnchor(container: Container, p: Point, tolerance: number = 8): Point | null {
    try {
      let best: Point | null = null;
      let bestDist = Infinity;
      const anchors: Point[] = [];
      for (const child of container.children) {
        const meta = (child as any).__meta;
        const type = (child as any).__toolType;
        if (!meta || !type) continue;
        if (type === 'shapes') {
          const x = meta.x ?? Math.min(meta.startX, meta.currentX);
          const y = meta.y ?? Math.min(meta.startY, meta.currentY);
          const w = meta.width ?? Math.abs((meta.currentX ?? 0) - (meta.startX ?? 0));
          const h = meta.height ?? Math.abs((meta.currentY ?? 0) - (meta.startY ?? 0));
          // corners, mids, center
          anchors.push(
            new Point(x, y), new Point(x + w, y), new Point(x + w, y + h), new Point(x, y + h),
            new Point(x + w / 2, y), new Point(x + w, y + h / 2), new Point(x + w / 2, y + h), new Point(x, y + h / 2),
            new Point(x + w / 2, y + h / 2),
          );
          // polygon vertices if applicable
          if (meta.shapeType === 'polygon' && meta.sides) {
            const cx = x + w / 2; const cy = y + h / 2; const radius = Math.max(w, h) / 2;
            const sides = Math.max(3, meta.sides);
            for (let i = 0; i < sides; i++) {
              const ang = (i * 2 * Math.PI) / sides - Math.PI / 2;
              anchors.push(new Point(cx + radius * Math.cos(ang), cy + radius * Math.sin(ang)));
            }
          }
        } else if (type === 'pen') {
          const nodes = meta?.nodes as any[] | undefined;
          if (nodes && Array.isArray(nodes)) {
            for (const n of nodes) anchors.push(new Point(n.x, n.y));
          }
        }
      }
      for (const a of anchors) {
        const d = Math.hypot(a.x - p.x, a.y - p.y);
        if (d < bestDist) { bestDist = d; best = a; }
      }
      if (best && bestDist <= tolerance) return best;
    } catch {}
    return null;
  }

  // (no dashed stroke support)

 /**
 * Public method to handle key down events from tool manager
 */

 updateSettings(settings: PenSettings): void {
 this.settings = { ...this.settings, ...settings };

 // Update current path settings if drawing
 if (this.currentPath) {
 this.currentPath.settings = { ...this.settings };
 this.updatePathGraphics();
 }

 // Log fill color changes for debugging
 if (settings.fillColor) {
 }
 }

  // ----- Editing helpers -----
  private findPenShapeAt(container: Container, globalPoint: Point): Graphics | null {
    try {
      const localPoint = container.toLocal(globalPoint);
      for (let i = container.children.length - 1; i >= 0; i--) {
        const child = container.children[i];
        const type = (child as any).__toolType;
        if (type !== 'pen') continue;
        try {
          const b = child.getBounds();
          if (localPoint.x >= b.x && localPoint.x <= b.x + b.width &&
              localPoint.y >= b.y && localPoint.y <= b.y + b.height) {
            return child as Graphics;
          }
        } catch {}
      }
    } catch {}
    return null;
  }

  private enterEditModeFromShape(shape: Graphics, container: Container): void {
    const meta = (shape as any).__meta;
    if (!meta || meta.kind !== 'pen' || !Array.isArray(meta.nodes)) return;
    this.isEditingExistingPath = true;
    this.editingWasClosed = !!meta.closed;
    this.originalShapeForEdit = shape;
    try { shape.visible = false; } catch {}

    // Create a working path
    this.currentPath = {
      nodes: [],
      pathGraphics: new Graphics(),
      isComplete: false,
      settings: {
        size: meta.size ?? this.settings.size,
        strokeColor: meta.strokeColor ?? this.settings.strokeColor,
        fillColor: meta.fillColor ?? this.settings.fillColor,
        strokeType: 'solid',
      },
    };
    (this.currentPath.pathGraphics as any).__toolType = 'pen';
    container.addChild(this.currentPath.pathGraphics);

    // Recreate nodes and visuals
    for (const n of meta.nodes as any[]) {
      const pos = new Point(n.x, n.y);
      const nodeGraphics = new Graphics();
      nodeGraphics.circle(0, 0, PEN_CONSTANTS.NODE_SIZE);
      nodeGraphics.fill({ color: PEN_CONSTANTS.NODE_COLOR });
      nodeGraphics.stroke({ width: PEN_CONSTANTS.NODE_STROKE_WIDTH, color: 0xffffff });
      nodeGraphics.position.set(pos.x, pos.y);
      nodeGraphics.eventMode = 'static';
      container.addChild(nodeGraphics);

      const node: VectorNode = {
        position: pos.clone(),
        graphics: nodeGraphics,
        handleIn: n.in ? new Point(n.in.x, n.in.y) : null,
        handleOut: n.out ? new Point(n.out.x, n.out.y) : null,
        handleInGraphics: null,
        handleOutGraphics: null,
      };
      this.currentPath.nodes.push(node);
      this.updateHandleGraphics(node, container);
    }

    this.updatePathGraphics();
  }

  private pickNodeOrHandle(local: Point): { kind: 'anchor' | 'handle-in' | 'handle-out'; index: number } | null {
    if (!this.currentPath) return null;
    for (let i = this.currentPath.nodes.length - 1; i >= 0; i--) {
      const node = this.currentPath.nodes[i];
      // Check handles first (knobs are small targets)
      if (node.handleIn) {
        if (Math.hypot(local.x - node.handleIn.x, local.y - node.handleIn.y) <= PenTool.HANDLE_KNOB_RADIUS + 3) {
          return { kind: 'handle-in', index: i };
        }
      }
      if (node.handleOut) {
        if (Math.hypot(local.x - node.handleOut.x, local.y - node.handleOut.y) <= PenTool.HANDLE_KNOB_RADIUS + 3) {
          return { kind: 'handle-out', index: i };
        }
      }
      // Check anchor
      if (Math.hypot(local.x - node.position.x, local.y - node.position.y) <= PenTool.NODE_HIT_TOLERANCE) {
        return { kind: 'anchor', index: i };
      }
    }
    return null;
  }

  private toggleNodeType(node: VectorNode, idx: number, container: Container): void {
    const hasHandles = !!(node.handleIn || node.handleOut);
    if (hasHandles) {
      // Convert to corner
      node.handleIn = null; node.handleOut = null;
      this.updateHandleGraphics(node, container);
    } else {
      // Convert to smooth with default mirrored handles
      // Direction heuristic: use neighboring points if available
      let dirX = 1, dirY = 0;
      const prev = this.currentPath?.nodes[idx - 1];
      const next = this.currentPath?.nodes[idx + 1];
      if (prev && next) {
        const vx = next.position.x - prev.position.x;
        const vy = next.position.y - prev.position.y;
        const len = Math.hypot(vx, vy) || 1;
        dirX = vx / len; dirY = vy / len;
      } else if (prev) {
        const vx = node.position.x - prev.position.x;
        const vy = node.position.y - prev.position.y;
        const len = Math.hypot(vx, vy) || 1;
        dirX = vx / len; dirY = vy / len;
      } else if (next) {
        const vx = next.position.x - node.position.x;
        const vy = next.position.y - node.position.y;
        const len = Math.hypot(vx, vy) || 1;
        dirX = vx / len; dirY = vy / len;
      }
      const lenH = PenTool.DEFAULT_HANDLE_LEN;
      node.handleOut = new Point(node.position.x + dirX * lenH, node.position.y + dirY * lenH);
      node.handleIn  = new Point(node.position.x - dirX * lenH, node.position.y - dirY * lenH);
      this.updateHandleGraphics(node, container);
    }
  }

 // Get available colors for UI
 static getAvailableColors(): string[] {
 return PROFESSIONAL_COLORS;
 }

 // Get available stroke sizes for UI
 static getAvailableStrokeSizes(): number[] {
 return STROKE_SIZES.PEN;
 }
}
