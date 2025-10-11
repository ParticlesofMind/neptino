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
import { PathBooleanOperations, BooleanOperation, PathData } from "./PathBooleanOperations";
import { PenPathSettings, VectorNode, VectorPath, VectorPointType } from "./pen/PenGeometry";
import { snapManager } from "./selection/guides/SnapManager";

interface PenSettings extends PenPathSettings {
 mode: 'pen' | 'bend';  // Pen mode (click to place) or bend mode (drag to curve)
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
  
  // Enhanced features
  private selectedNodeIndex: number = -1;
  private pathJoinIndicator: Graphics | null = null;
  private bendModePreview: Graphics | null = null;
  private pathSegmentHover: Graphics | null = null;
  private contextMenu: HTMLElement | null = null;
  private selectedPaths: Graphics[] = []; // For Boolean operations
  private multiSelectMode: boolean = false;

 constructor() {
         super("pen", "url('/src/assets/cursors/pen-cursor.svg') 2 2, crosshair");
 this.settings = {
 size: STROKE_SIZES.PEN[2], // Start with 3px
 strokeColor: '#282a29',
 fillColor: '#fef6eb',
 strokeType: 'solid',     // Solid lines by default
 mode: 'pen',             // Default to pen mode
 };
 }

 private markAsPenControl(graphic: Graphics | null | undefined, label: string = ''): void {
 if (!graphic) {
 return;
 }
 try {
 graphic.eventMode = 'none';
 (graphic as any).interactive = false;
 (graphic as any).interactiveChildren = false;
 } catch {}
 const suffix = label ? `-${label}` : '';
 try {
 graphic.name = `pen-control${suffix}`;
 } catch {}
 try {
 (graphic as any).__penControl = true;
 if ((graphic as any).__toolType) {
 delete (graphic as any).__toolType;
 }
 } catch {}
 }

 onPointerDown(event: FederatedPointerEvent, container: Container): void {
 // 🔒 CRITICAL: Only respond if this tool is active
 if (!this.isActive) {
   return;
 }

 // Handle right-click for context menu
 if (event.button === 2) { // Right mouse button
   this.handleRightClick(event, container);
   return;
 }

 console.log(
 `✏️ PEN: Node placement at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
 );
 console.log(
 `✏️ PEN: Settings - Stroke: ${this.settings.strokeColor}, Size: ${this.settings.size}px, Fill: ${this.settings.fillColor}, Mode: ${this.settings.mode}`,
 );

 const localPoint = container.toLocal(event.global);
 
 // 🎨 CANVAS AREA: Allow creation in canvas area
 const canvasBounds = BoundaryUtils.getCanvasDrawingBounds();
 if (!BoundaryUtils.isPointWithinBounds(localPoint, canvasBounds)) {
 return; // Exit early - no creation allowed outside canvas
 }
 
 // Point is in canvas area, safe to proceed
 let clampedPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);
 
 // Log if point was adjusted
 if (Math.abs(localPoint.x - clampedPoint.x) > 1 || Math.abs(localPoint.y - clampedPoint.y) > 1) {
 console.log(
 `✏️ PEN: 🎯 Point clamped from (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)}) to (${Math.round(clampedPoint.x)}, ${Math.round(clampedPoint.y)})`
 );
 }
 
 this.lastMousePosition.copyFrom(clampedPoint);

 // Bend mode: different behavior for click and drag to create curves
 if (this.settings.mode === 'bend') {
   this.handleBendModePointerDown(event, container, clampedPoint);
   return;
 }

 // If not currently drawing, check if clicking an existing pen shape to edit
 if (!this.currentPath) {
   // Handle multi-selection with Ctrl/Cmd
   if ((event as any).ctrlKey || (event as any).metaKey) {
     this.handleMultiplePathSelection(event, container);
     return;
   }
   
   const penShape = this.findPenShapeAt(container, event.global);
   if (penShape) {
     this.enterEditModeFromShape(penShape as Graphics, container);
     return;
   }
 }

 // Check for path joining opportunity
 if (!this.currentPath && this.checkPathJoinOpportunity(container, clampedPoint)) {
   return;
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
         this.cycleNodeType(this.currentPath.nodes[idx], idx, container);
         this.lastClickTime = 0; // reset
         this.updatePathGraphics();
         return;
       }
       this.lastClickTime = now;
       this.lastClickedNodeIndex = idx;
       this.selectNode(idx);
     }

     // Start dragging
     this.isPointerDown = true;
     this.activeDragNode = this.currentPath.nodes[hit.index];
     this.dragMode = hit.kind as any;
     this.maintainMirrorOnHandleDrag = !(event as any).altKey;
     this.lastMousePosition.copyFrom(local);
     return; // do not add nodes in edit mode
   }
   // Clicked empty space in edit mode: deselect
   this.deselectAllNodes();
   return;
 }

 // Check if we're continuing an existing path or starting a new one
 if (this.currentPath && this.currentPath.nodes.length > 0) {
   // Illustrator-style handle reset: clicking the last node removes its outgoing handle
   if (!this.isEditingExistingPath) {
     const lastNode = this.currentPath.nodes[this.currentPath.nodes.length - 1];
     const distToLast = Math.hypot(
       clampedPoint.x - lastNode.position.x,
       clampedPoint.y - lastNode.position.y,
     );
     if (distToLast <= PenTool.NODE_HIT_TOLERANCE) {
       this.resetOutgoingHandle(lastNode, container);
       this.updatePathGraphics();
       this.updatePreviewLine(container);
       return;
     }
   }

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
 
 // CANVAS ENFORCEMENT: Clamp mouse position for preview
 const canvasBounds = BoundaryUtils.getCanvasDrawingBounds();
 let clampedPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);

 // Enhanced hover feedback for bend mode
 if (this.settings.mode === 'bend' && !this.isPointerDown) {
   this.updateBendModeHover(clampedPoint, container);
 }

 // Enhanced path joining feedback
 if (!this.currentPath || !this.isEditingExistingPath) {
   this.checkPathJoinOpportunity(container, clampedPoint);
 }

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

 // Show snap anchor hover if near any anchor (only when smart guides enabled)
 if (snapManager.isSmartEnabled()) {
   const snap = this.findNearestAnchor(container, clampedPoint, 8);
   if (snap) {
     this.showSnapIndicator(snap, container);
   } else {
     this.removeSnapIndicator();
   }
 } else {
   this.removeSnapIndicator();
 }

 this.lastMousePosition.copyFrom(clampedPoint);

 // Editing drag logic with enhanced handle behavior
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
     
     // Apply point type behavior
     if (node.pointType === VectorPointType.Mirrored) {
       const vx = node.position.x - p.x;
       const vy = node.position.y - p.y;
       node.handleOut = new Point(node.position.x + vx, node.position.y + vy);
     } else if (node.pointType === VectorPointType.Smooth && this.maintainMirrorOnHandleDrag) {
       // Smooth: keep collinear but allow different lengths
       const vx = node.position.x - p.x;
       const vy = node.position.y - p.y;
       const len = Math.hypot(vx, vy);
       if (len > 0 && node.handleOut) {
         const outLen = Math.hypot(node.handleOut.x - node.position.x, node.handleOut.y - node.position.y);
         const ratio = outLen / len;
         node.handleOut = new Point(node.position.x + vx * ratio, node.position.y + vy * ratio);
       }
     }
   } else if (this.dragMode === 'handle-out') {
     node.handleOut = new Point(p.x, p.y);
     
     // Apply point type behavior
     if (node.pointType === VectorPointType.Mirrored) {
       const vx = node.position.x - p.x;
       const vy = node.position.y - p.y;
       node.handleIn = new Point(node.position.x + vx, node.position.y + vy);
     } else if (node.pointType === VectorPointType.Smooth && this.maintainMirrorOnHandleDrag) {
       // Smooth: keep collinear but allow different lengths
       const vx = node.position.x - p.x;
       const vy = node.position.y - p.y;
       const len = Math.hypot(vx, vy);
       if (len > 0 && node.handleIn) {
         const inLen = Math.hypot(node.handleIn.x - node.position.x, node.handleIn.y - node.position.y);
         const ratio = inLen / len;
         node.handleIn = new Point(node.position.x + vx * ratio, node.position.y + vy * ratio);
       }
     }
   }

   // Refresh visuals
   this.updateHandleGraphics(node, container);
   this.updatePathGraphics();
   return;
 }

 // If pointer is down on the last placed node, interpret as handle dragging
 if (this.isPointerDown && this.activeDragNode && this.dragStartAtNode) {
   const node = this.activeDragNode;
   const dx = clampedPoint.x - this.dragStartAtNode.x;
   const dy = clampedPoint.y - this.dragStartAtNode.y;
   const dist = Math.hypot(dx, dy);
   if (dist > PenTool.HANDLE_DRAG_THRESHOLD) {
     this.isDraggingHandles = true;
   }

   if (this.isDraggingHandles) {
     // Create handles based on the node's point type
     if (node.pointType === VectorPointType.Mirrored) {
       // Mirrored: both handles same length, opposite direction
       const outX = node.position.x + dx;
       const outY = node.position.y + dy;
       const inX = node.position.x - dx;
       const inY = node.position.y - dy;
       node.handleOut = new Point(outX, outY);
       node.handleIn = new Point(inX, inY);
     } else {
       // Corner or Smooth: create handles independently (smooth behavior applied later)
       node.handleOut = new Point(node.position.x + dx, node.position.y + dy);
       node.handleIn = new Point(node.position.x - dx, node.position.y - dy);
       
       // Set point type to smooth if not already set
       if (node.pointType === VectorPointType.Corner) {
         node.pointType = VectorPointType.Smooth;
       }
     }
     this.autoAssignPreviousHandle(node, dx, dy, container);
     
     this.updateHandleGraphics(node, container);
     this.updateNodeVisuals(node);
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

 container.addChild(nodeGraphics);
 this.markAsPenControl(nodeGraphics, 'node');
 
 // 🔗 CRITICAL: Store reference to the path graphics for cleanup
 (nodeGraphics as any).__attachedTo = this.currentPath.pathGraphics;

 // Create node object
 const node: VectorNode = {
 position: position.clone(),
 graphics: nodeGraphics,
 pointType: VectorPointType.Corner, // Default to corner point
 handleIn: null,
 handleOut: null,
 handleInGraphics: null,
 handleOutGraphics: null,
 isSelected: false,
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
    this.drawSegment(path, prev, curr);
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
  this.markAsPenControl(this.previewLine, 'preview');
  this.previewLine.alpha = PEN_CONSTANTS.PREVIEW_LINE_ALPHA;
  container.addChild(this.previewLine);
  } else {
  this.markAsPenControl(this.previewLine, 'preview');
  }

 const lastNode = this.currentPath.nodes[this.currentPath.nodes.length - 1];

 // Snap preview end to nearest anchor
 const snapped = this.snapToNearestAnchor(container, this.lastMousePosition);
 this.lastMousePosition.copyFrom(snapped);

  this.previewLine.clear();
  this.previewLine.moveTo(lastNode.position.x, lastNode.position.y);
  if (lastNode.handleOut) {
    this.previewLine.bezierCurveTo(
      lastNode.handleOut.x,
      lastNode.handleOut.y,
      lastNode.handleOut.x,
      lastNode.handleOut.y,
      this.lastMousePosition.x,
      this.lastMousePosition.y,
    );
  } else {
    this.previewLine.lineTo(this.lastMousePosition.x, this.lastMousePosition.y);
  }
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
      this.markAsPenControl(line, `handle-${kind}-line`);
      if (!knob) {
        knob = new Graphics();
        container.addChild(knob);
      }
      this.markAsPenControl(knob, `handle-${kind}-knob`);
      
      // 🔗 CRITICAL: Store reference to the path graphics for cleanup
      if (this.currentPath?.pathGraphics) {
        (line as any).__attachedTo = this.currentPath.pathGraphics;
        (knob as any).__attachedTo = this.currentPath.pathGraphics;
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

  private autoAssignPreviousHandle(node: VectorNode, dx: number, dy: number, container: Container): void {
    if (!this.currentPath || this.isEditingExistingPath) return;
    const index = this.currentPath.nodes.indexOf(node);
    if (index !== this.currentPath.nodes.length - 1 || index <= 0) return;
    const prev = this.currentPath.nodes[index - 1];
    if (!prev) return;
    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) return;
    if (prev.handleOut && prev.pointType !== VectorPointType.Corner) {
      return;
    }

    prev.handleOut = new Point(prev.position.x + dx, prev.position.y + dy);
    if (!prev.handleIn) {
      prev.handleIn = new Point(prev.position.x - dx, prev.position.y - dy);
    }
    if (prev.pointType === VectorPointType.Corner) {
      prev.pointType = VectorPointType.Smooth;
    }
    this.updateHandleGraphics(prev, container);
    this.updateNodeVisuals(prev);
  }

  private resetOutgoingHandle(node: VectorNode, container: Container): void {
    if (!node) return;

    node.handleOut = null;
    node.handleOutGraphics = null;

    // Breaking the outgoing handle converts the point to a corner for the next segment
    node.pointType = VectorPointType.Corner;

    this.updateHandleGraphics(node, container);
    this.updateNodeVisuals(node);
  }

  private drawSegment(path: Graphics, prev: VectorNode, curr: VectorNode): void {
    const c1 = prev.handleOut ?? null;
    const c2 = curr.handleIn ?? null;
    if (c1 && c2) {
      path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, curr.position.x, curr.position.y);
    } else if (c1) {
      path.bezierCurveTo(c1.x, c1.y, c1.x, c1.y, curr.position.x, curr.position.y);
    } else if (c2) {
      path.bezierCurveTo(c2.x, c2.y, c2.x, c2.y, curr.position.x, curr.position.y);
    } else {
      path.lineTo(curr.position.x, curr.position.y);
    }
  }

  private ensureClosingHandles(): void {
    if (!this.currentPath || this.currentPath.nodes.length < 2) return;
    const nodes = this.currentPath.nodes;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (!first || !last) return;

    if (last.handleOut && (!first.handleIn || first.pointType === VectorPointType.Corner)) {
      const dx = last.handleOut.x - last.position.x;
      const dy = last.handleOut.y - last.position.y;
      first.handleIn = new Point(first.position.x - dx, first.position.y - dy);
      if (first.pointType === VectorPointType.Corner) {
        first.pointType = VectorPointType.Smooth;
      }
    }

    if (first.handleIn && (!last.handleOut || last.pointType === VectorPointType.Corner)) {
      const dx = first.position.x - first.handleIn.x;
      const dy = first.position.y - first.handleIn.y;
      last.handleOut = new Point(last.position.x + dx, last.position.y + dy);
      if (last.pointType === VectorPointType.Corner) {
        last.pointType = VectorPointType.Smooth;
      }
    }
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
 this.markAsPenControl(this.hoverIndicator, 'hover');
 
 // 🔗 CRITICAL: Store reference to the path graphics for cleanup
 if (this.currentPath?.pathGraphics) {
   (this.hoverIndicator as any).__attachedTo = this.currentPath.pathGraphics;
 }
 
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
     this.markAsPenControl(this.snapIndicator, 'snap');
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

  if (closeShape && this.currentPath.nodes.length >= 2) {
 // Ensure first and last nodes have mirrored handles for smooth closure
 this.ensureClosingHandles();
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
   this.drawSegment(finalShape, prev, curr);
 }
 
 // Close the path back to the first node
 // If last->first has handles, use them for a smooth close
 const last = this.currentPath.nodes[this.currentPath.nodes.length - 1];
 this.drawSegment(finalShape, last, firstNode);
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
    
    // 🚨 CRITICAL: Register with DisplayObjectManager so it shows in layers panel
    if (this.displayManager) {
      try {
        this.displayManager.add(finalShape, container);
        console.log('✏️ PEN: Registered closed shape with DisplayObjectManager');
      } catch (error) {
        console.warn('Failed to register pen shape with DisplayObjectManager:', error);
      }
    }
    
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

  // 🚨 CRITICAL: Register with DisplayObjectManager so it shows in layers panel
  if (this.displayManager && this.currentPath.pathGraphics) {
    try {
      this.displayManager.add(this.currentPath.pathGraphics, this.currentPath.pathGraphics.parent || undefined);
      console.log('✏️ PEN: Registered open path with DisplayObjectManager');
    } catch (error) {
      console.warn('Failed to register pen path with DisplayObjectManager:', error);
    }
  }

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

 // Handle keyboard events for path completion and node operations
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
 case "Delete":
 case "Backspace":
 // Delete selected node
 if (this.selectedNodeIndex >= 0 && this.isEditingExistingPath) {
   this.removeNodeAtIndex(this.selectedNodeIndex);
   event.preventDefault();
 }
 break;
 case "=":
 case "+":
 // Add point (when hovering over segment)
 if (this.isEditingExistingPath && this.pathSegmentHover) {
   // Implementation would need segment hover tracking
   event.preventDefault();
 }
 break;
 case "Tab":
 // Cycle point type for selected node
 if (this.selectedNodeIndex >= 0 && this.isEditingExistingPath && this.currentPath) {
   this.cycleNodeType(this.currentPath.nodes[this.selectedNodeIndex], this.selectedNodeIndex, 
     this.currentPath.pathGraphics.parent as Container);
   this.updatePathGraphics();
   event.preventDefault();
 }
 break;
 case "b":
 case "B":
 // Toggle bend mode
 if (event.ctrlKey || event.metaKey) {
   this.settings.mode = this.settings.mode === 'pen' ? 'bend' : 'pen';
   console.log(`✏️ PEN: Switched to ${this.settings.mode} mode`);
   event.preventDefault();
 }
 break;
 case "u":
 case "U":
 // Union operation
 if ((event.ctrlKey || event.metaKey) && this.selectedPaths.length >= 2) {
   this.performBooleanOperation(BooleanOperation.Union, this.currentPath?.pathGraphics.parent as Container);
   event.preventDefault();
 }
 break;
 case "s":
 case "S":
 // Subtract operation
 if ((event.ctrlKey || event.metaKey) && event.shiftKey && this.selectedPaths.length >= 2) {
   this.performBooleanOperation(BooleanOperation.Subtract, this.currentPath?.pathGraphics.parent as Container);
   event.preventDefault();
 }
 break;
 case "i":
 case "I":
 // Intersect operation
 if ((event.ctrlKey || event.metaKey) && this.selectedPaths.length >= 2) {
   this.performBooleanOperation(BooleanOperation.Intersect, this.currentPath?.pathGraphics.parent as Container);
   event.preventDefault();
 }
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

 // Clean up all visual indicators and selections
 this.removePreviewLine();
 this.removeHoverIndicator();
 this.removeSnapIndicator();
 this.removePathJoinIndicator();
 this.removeBendModePreview();
 this.hideContextMenu();
 this.clearPathSelection();
 this.deselectAllNodes();
 }

  private handleKeyDown = (): void => {
  // This would need to be handled by the tool manager to get container reference
  };

  /**
   * Find nearest anchor point on existing objects and snap within tolerance
   */
  private snapToNearestAnchor(container: Container, p: Point, tolerance: number = 8): Point {
    // Only snap if smart guides are enabled
    if (!snapManager.isSmartEnabled()) {
      return p;
    }
    
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

    const toContainerPoint = (coords: { x: number; y: number } | null) => {
      if (!coords) {
        return null;
      }
      const localPoint = new Point(coords.x, coords.y);
      const globalPoint = shape.toGlobal(localPoint);
      return container.toLocal(globalPoint);
    };

    // Create a working path
    const workingPath: VectorPath = this.currentPath = {
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
    (workingPath.pathGraphics as any).__toolType = 'pen';
    container.addChild(workingPath.pathGraphics);

    // Recreate nodes and visuals with transformed coordinates
    for (const n of meta.nodes as any[]) {
      const pos = toContainerPoint({ x: n.x, y: n.y }) ?? new Point(n.x, n.y);
      const handleIn = toContainerPoint(n.in);
      const handleOut = toContainerPoint(n.out);
      let inferredPointType = VectorPointType.Corner;
      if (handleIn && handleOut) {
        const vxIn = pos.x - handleIn.x;
        const vyIn = pos.y - handleIn.y;
        const vxOut = handleOut.x - pos.x;
        const vyOut = handleOut.y - pos.y;
        const lenIn = Math.hypot(vxIn, vyIn);
        const lenOut = Math.hypot(vxOut, vyOut);
        if (lenIn > 0 && lenOut > 0) {
          const dot = vxIn * vxOut + vyIn * vyOut;
          const cosAngle = dot / (lenIn * lenOut);
          if (Math.abs(cosAngle + 1) < 0.02 && Math.abs(lenIn - lenOut) < 0.5) {
            inferredPointType = VectorPointType.Mirrored;
          } else {
            inferredPointType = VectorPointType.Smooth;
          }
        } else {
          inferredPointType = VectorPointType.Smooth;
        }
      }

      const nodeGraphics = new Graphics();
      nodeGraphics.circle(0, 0, PEN_CONSTANTS.NODE_SIZE);
      nodeGraphics.fill({ color: PEN_CONSTANTS.NODE_COLOR });
      nodeGraphics.stroke({ width: PEN_CONSTANTS.NODE_STROKE_WIDTH, color: 0xffffff });
      nodeGraphics.position.set(pos.x, pos.y);
      container.addChild(nodeGraphics);
      this.markAsPenControl(nodeGraphics, 'node');
      
      // 🔗 CRITICAL: Store reference to the path graphics for cleanup
      (nodeGraphics as any).__attachedTo = workingPath.pathGraphics;

      const node: VectorNode = {
        position: pos.clone(),
        graphics: nodeGraphics,
        pointType: inferredPointType,
        handleIn: handleIn ?? (n.in ? new Point(n.in.x, n.in.y) : null),
        handleOut: handleOut ?? (n.out ? new Point(n.out.x, n.out.y) : null),
        handleInGraphics: null,
        handleOutGraphics: null,
        isSelected: false,
      };
      workingPath.nodes.push(node);
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

  // ===== ENHANCED FEATURES =====

  /**
   * Handle right-click for context menu operations
   */
  private handleRightClick(event: FederatedPointerEvent, container: Container): void {
    const local = container.toLocal(event.global);
    
    if (this.currentPath && this.isEditingExistingPath) {
      // Check if right-clicking on node (delete) or path segment (add point)
      const hit = this.pickNodeOrHandle(local);
      if (hit && hit.kind === 'anchor') {
        this.showNodeContextMenu(event, hit.index);
      } else {
        // Check if clicking on path segment
        const segmentHit = this.pickPathSegment(local);
        if (segmentHit !== null) {
          this.showSegmentContextMenu(event, segmentHit, local);
        }
      }
    }
  }

  /**
   * Handle bend mode pointer down - click and drag to create instant curves
   */
  private handleBendModePointerDown(event: FederatedPointerEvent, container: Container, point: Point): void {
    // In bend mode, clicking on existing path segments adds curves
    if (!this.currentPath) {
      const penShape = this.findPenShapeAt(container, event.global);
      if (penShape) {
        this.enterEditModeFromShape(penShape as Graphics, container);
        // Fall through to bend the segment
      } else {
        return; // No existing path to bend
      }
    }

    if (this.currentPath && this.isEditingExistingPath) {
      const segmentIndex = this.pickPathSegment(point);
      if (segmentIndex !== null) {
        this.startBendOperation(segmentIndex, point, container);
      }
    }
  }

  /**
   * Check if we can join two path endpoints
   */
  private checkPathJoinOpportunity(container: Container, point: Point): boolean {
    const nearbyEndpoint = this.findNearbyPathEndpoint(container, point);
    if (nearbyEndpoint) {
      this.showPathJoinIndicator(nearbyEndpoint.position, container);
      
      // Auto-join if clicking close enough to an endpoint
      if (this.currentPath && this.currentPath.nodes.length > 0) {
        const distance = Math.hypot(
          point.x - nearbyEndpoint.position.x,
          point.y - nearbyEndpoint.position.y
        );
        
        if (distance < 8) { // Close enough to join
          this.joinPaths(nearbyEndpoint.path, container);
          return true;
        }
      }
      return false;
    }
    this.removePathJoinIndicator();
    return false;
  }

  /**
   * Join current path with another path
   */
  private joinPaths(targetPath: Graphics, container: Container): void {
    if (!this.currentPath) return;
    
    const targetMeta = (targetPath as any).__meta;
    if (!targetMeta || !targetMeta.nodes) return;
    
    // Extract target path data
    const targetNodes = targetMeta.nodes as any[];
    const isTargetClosed = targetMeta.closed;
    
    if (isTargetClosed) {
      console.log('✏️ PEN: Cannot join to closed path');
      return;
    }
    
    // Determine which endpoint of target to join to
    const currentLastNode = this.currentPath.nodes[this.currentPath.nodes.length - 1];
    const targetFirst = new Point(targetNodes[0].x, targetNodes[0].y);
    const targetLast = new Point(targetNodes[targetNodes.length - 1].x, targetNodes[targetNodes.length - 1].y);
    
    const distToFirst = Math.hypot(
      currentLastNode.position.x - targetFirst.x,
      currentLastNode.position.y - targetFirst.y
    );
    const distToLast = Math.hypot(
      currentLastNode.position.x - targetLast.x,
      currentLastNode.position.y - targetLast.y
    );
    
    // Add target nodes to current path
    let nodesToAdd = targetNodes;
    if (distToFirst < distToLast) {
      // Join to first node - use nodes in order
      nodesToAdd = targetNodes.slice(1); // Skip first node to avoid duplication
    } else {
      // Join to last node - reverse the order and skip last node
      nodesToAdd = targetNodes.slice(0, -1).reverse();
    }
    
    // Create graphics for new nodes and add them to current path
    nodesToAdd.forEach(nodeData => {
      const nodeGraphics = new Graphics();
      nodeGraphics.circle(0, 0, PEN_CONSTANTS.NODE_SIZE);
      nodeGraphics.fill({ color: PEN_CONSTANTS.NODE_COLOR });
      nodeGraphics.stroke({
        width: PEN_CONSTANTS.NODE_STROKE_WIDTH,
        color: 0xffffff,
      });
      nodeGraphics.position.set(nodeData.x, nodeData.y);
      container.addChild(nodeGraphics);
      this.markAsPenControl(nodeGraphics, 'node');
      
      // 🔗 CRITICAL: Store reference to the path graphics for cleanup
      (nodeGraphics as any).__attachedTo = this.currentPath!.pathGraphics;

      const node: VectorNode = {
        position: new Point(nodeData.x, nodeData.y),
        graphics: nodeGraphics,
        pointType: VectorPointType.Corner,
        handleIn: nodeData.in ? new Point(nodeData.in.x, nodeData.in.y) : null,
        handleOut: nodeData.out ? new Point(nodeData.out.x, nodeData.out.y) : null,
        handleInGraphics: null,
        handleOutGraphics: null,
        isSelected: false,
      };

      this.currentPath!.nodes.push(node);
      this.updateHandleGraphics(node, container);
    });
    
    // Remove the target path since it's now part of current path
    if (targetPath.parent) {
      targetPath.parent.removeChild(targetPath);
    }
    
    // Update current path graphics
    this.updatePathGraphics();
    
    console.log(`✏️ PEN: Joined paths - now has ${this.currentPath.nodes.length} nodes`);
  }

  /**
   * Enhanced node type cycling: Corner -> Smooth -> Mirrored -> Corner
   */
  private cycleNodeType(node: VectorNode, idx: number, container: Container): void {
    switch (node.pointType) {
      case VectorPointType.Corner:
        // Convert to Smooth
        node.pointType = VectorPointType.Smooth;
        this.createDefaultHandles(node, idx);
        break;
      case VectorPointType.Smooth:
        // Convert to Mirrored
        node.pointType = VectorPointType.Mirrored;
        this.enforceHandleMirroring(node);
        break;
      case VectorPointType.Mirrored:
        // Convert back to Corner
        node.pointType = VectorPointType.Corner;
        node.handleIn = null;
        node.handleOut = null;
        break;
    }
    this.updateHandleGraphics(node, container);
    this.updateNodeVisuals(node);
  }

  /**
   * Select a node for editing
   */
  private selectNode(index: number): void {
    this.selectedNodeIndex = index;
    if (this.currentPath && this.currentPath.nodes[index]) {
      this.currentPath.nodes[index].isSelected = true;
      this.updateNodeVisuals(this.currentPath.nodes[index]);
    }
  }

  /**
   * Deselect all nodes
   */
  private deselectAllNodes(): void {
    this.selectedNodeIndex = -1;
    if (this.currentPath) {
      this.currentPath.nodes.forEach(node => {
        node.isSelected = false;
        this.updateNodeVisuals(node);
      });
    }
  }

  /**
   * Create default handles for a node based on neighboring nodes
   */
  private createDefaultHandles(node: VectorNode, idx: number): void {
    if (!this.currentPath) return;
    
    let dirX = 1, dirY = 0;
    const prev = this.currentPath.nodes[idx - 1];
    const next = this.currentPath.nodes[idx + 1];
    
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
    node.handleIn = new Point(node.position.x - dirX * lenH, node.position.y - dirY * lenH);
  }

  /**
   * Enforce handle mirroring for mirrored point type
   */
  private enforceHandleMirroring(node: VectorNode): void {
    if (!node.handleOut && !node.handleIn) return;
    
    if (node.handleOut) {
      const dx = node.handleOut.x - node.position.x;
      const dy = node.handleOut.y - node.position.y;
      node.handleIn = new Point(node.position.x - dx, node.position.y - dy);
    } else if (node.handleIn) {
      const dx = node.handleIn.x - node.position.x;
      const dy = node.handleIn.y - node.position.y;
      node.handleOut = new Point(node.position.x - dx, node.position.y - dy);
    }
  }

  /**
   * Update node visual appearance based on type and selection state
   */
  private updateNodeVisuals(node: VectorNode): void {
    if (!node.graphics) return;
    
    node.graphics.clear();
    
    // Different colors for different point types
    let nodeColor = PEN_CONSTANTS.NODE_COLOR;
    switch (node.pointType) {
      case VectorPointType.Corner:
        nodeColor = 0x64748b; // Gray for corner
        break;
      case VectorPointType.Smooth:
        nodeColor = 0x3b82f6; // Blue for smooth
        break;
      case VectorPointType.Mirrored:
        nodeColor = 0x10b981; // Green for mirrored
        break;
    }
    
    // Larger size if selected
    const size = node.isSelected ? PEN_CONSTANTS.NODE_SIZE + 2 : PEN_CONSTANTS.NODE_SIZE;
    
    node.graphics.circle(0, 0, size);
    node.graphics.fill({ color: nodeColor });
    node.graphics.stroke({
      width: node.isSelected ? 2 : PEN_CONSTANTS.NODE_STROKE_WIDTH,
      color: node.isSelected ? 0xffffff : 0xffffff,
    });
  }

  /**
   * Pick a path segment at the given point
   */
  private pickPathSegment(point: Point): number | null {
    if (!this.currentPath || this.currentPath.nodes.length < 2) return null;
    
    for (let i = 0; i < this.currentPath.nodes.length - 1; i++) {
      const start = this.currentPath.nodes[i].position;
      const end = this.currentPath.nodes[i + 1].position;
      
      // Simple distance to line segment check
      const distToSegment = this.distanceToLineSegment(point, start, end);
      if (distToSegment < 8) { // 8px tolerance
        return i; // Return the index of the starting node of the segment
      }
    }
    return null;
  }

  /**
   * Calculate distance from point to line segment
   */
  private distanceToLineSegment(point: Point, start: Point, end: Point): number {
    const A = point.x - start.x;
    const B = point.y - start.y;
    const C = end.x - start.x;
    const D = end.y - start.y;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;
    if (param < 0) {
      xx = start.x;
      yy = start.y;
    } else if (param > 1) {
      xx = end.x;
      yy = end.y;
    } else {
      xx = start.x + param * C;
      yy = start.y + param * D;
    }

    const dx = point.x - xx;
    const dy = point.y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Find nearby path endpoint for joining
   */
  private findNearbyPathEndpoint(container: Container, point: Point): { position: Point; path: Graphics } | null {
    try {
      for (const child of container.children) {
        const type = (child as any).__toolType;
        const meta = (child as any).__meta;
        if (type !== 'pen' || !meta || meta.closed) continue;
        
        const nodes = meta.nodes as any[];
        if (!nodes || nodes.length < 2) continue;
        
        // Check first and last node as endpoints
        const first = new Point(nodes[0].x, nodes[0].y);
        const last = new Point(nodes[nodes.length - 1].x, nodes[nodes.length - 1].y);
        
        if (Math.hypot(point.x - first.x, point.y - first.y) < 12) {
          return { position: first, path: child as Graphics };
        }
        if (Math.hypot(point.x - last.x, point.y - last.y) < 12) {
          return { position: last, path: child as Graphics };
        }
      }
    } catch {}
    return null;
  }

  /**
   * Show path join indicator
   */
  private showPathJoinIndicator(position: Point, container: Container): void {
    if (!this.pathJoinIndicator) {
    this.pathJoinIndicator = new Graphics();
    this.markAsPenControl(this.pathJoinIndicator, 'join');
      this.pathJoinIndicator.zIndex = 2000;
      container.addChild(this.pathJoinIndicator);
    }
    this.pathJoinIndicator.clear();
    this.pathJoinIndicator.circle(0, 0, 8);
    this.pathJoinIndicator.fill({ color: 0x10b981, alpha: 0.7 });
    this.pathJoinIndicator.stroke({ width: 2, color: 0x059669, alpha: 0.9 });
    this.pathJoinIndicator.position.set(position.x, position.y);
  }

  /**
   * Remove path join indicator
   */
  private removePathJoinIndicator(): void {
    if (this.pathJoinIndicator && this.pathJoinIndicator.parent) {
      this.pathJoinIndicator.parent.removeChild(this.pathJoinIndicator);
      this.pathJoinIndicator = null;
    }
  }

  /**
   * Start bend operation on a path segment
   */
  private startBendOperation(segmentIndex: number, point: Point, container: Container): void {
    if (!this.currentPath) return;
    
    // Add a new node at the bend point if the segment is straight
    const startNode = this.currentPath.nodes[segmentIndex];
    const endNode = this.currentPath.nodes[segmentIndex + 1];
    
    // Calculate the position along the segment
    const t = this.getParameterAlongSegment(point, startNode.position, endNode.position);
    const newPos = new Point(
      startNode.position.x + (endNode.position.x - startNode.position.x) * t,
      startNode.position.y + (endNode.position.y - startNode.position.y) * t
    );
    
    // Create new node
    this.insertNodeAtPosition(segmentIndex + 1, newPos, container);
    
    // Make it a smooth point with handles
    const newNode = this.currentPath.nodes[segmentIndex + 1];
    newNode.pointType = VectorPointType.Smooth;
    this.createDefaultHandles(newNode, segmentIndex + 1);
    this.updateHandleGraphics(newNode, container);
    this.updatePathGraphics();
  }

  /**
   * Get parameter t along line segment where point is closest
   */
  private getParameterAlongSegment(point: Point, start: Point, end: Point): number {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) return 0;
    
    const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
    return Math.max(0, Math.min(1, t));
  }

  /**
   * Insert a new node at the specified position in the path
   */
  private insertNodeAtPosition(index: number, position: Point, container: Container): void {
    if (!this.currentPath) return;
    
    // Create node graphics
    const nodeGraphics = new Graphics();
    nodeGraphics.circle(0, 0, PEN_CONSTANTS.NODE_SIZE);
    nodeGraphics.fill({ color: PEN_CONSTANTS.NODE_COLOR });
    nodeGraphics.stroke({
      width: PEN_CONSTANTS.NODE_STROKE_WIDTH,
      color: 0xffffff,
    });
    nodeGraphics.position.set(position.x, position.y);
    container.addChild(nodeGraphics);
    this.markAsPenControl(nodeGraphics, 'node');
    
    // 🔗 CRITICAL: Store reference to the path graphics for cleanup
    (nodeGraphics as any).__attachedTo = this.currentPath.pathGraphics;

    // Create node object
    const node: VectorNode = {
      position: position.clone(),
      graphics: nodeGraphics,
      pointType: VectorPointType.Corner,
      handleIn: null,
      handleOut: null,
      handleInGraphics: null,
      handleOutGraphics: null,
      isSelected: false,
    };

    // Insert at the specified index
    this.currentPath.nodes.splice(index, 0, node);
  }

  /**
   * Remove a node from the path
   */
  private removeNodeAtIndex(index: number): void {
    if (!this.currentPath || index < 0 || index >= this.currentPath.nodes.length) return;
    if (this.currentPath.nodes.length <= 2) return; // Don't allow removing if only 2 nodes left
    
    const node = this.currentPath.nodes[index];
    
    // Remove graphics
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
    
    // Remove from array
    this.currentPath.nodes.splice(index, 1);
    
    // Update selected index
    if (this.selectedNodeIndex === index) {
      this.selectedNodeIndex = -1;
    } else if (this.selectedNodeIndex > index) {
      this.selectedNodeIndex--;
    }
    
    this.updatePathGraphics();
  }

  /**
   * Show context menu for node operations
   */
  private showNodeContextMenu(event: FederatedPointerEvent, nodeIndex: number): void {
    this.hideContextMenu();
    
    const menu = document.createElement('div');
    menu.className = 'pen-tool-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${event.clientX}px;
      top: ${event.clientY}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 10000;
      min-width: 150px;
    `;
    
    const deleteOption = document.createElement('div');
    deleteOption.textContent = 'Delete Point';
    deleteOption.style.cssText = 'padding: 8px 12px; cursor: pointer; border-bottom: 1px solid #eee;';
    deleteOption.onmouseenter = () => deleteOption.style.backgroundColor = '#f5f5f5';
    deleteOption.onmouseleave = () => deleteOption.style.backgroundColor = 'white';
    deleteOption.onclick = () => {
      this.removeNodeAtIndex(nodeIndex);
      this.hideContextMenu();
    };
    
    const convertOption = document.createElement('div');
    convertOption.textContent = 'Convert Point Type';
    convertOption.style.cssText = 'padding: 8px 12px; cursor: pointer;';
    if (this.multiSelectMode) {
      convertOption.style.cssText += 'border-bottom: 1px solid #eee;';
    }
    convertOption.onmouseenter = () => convertOption.style.backgroundColor = '#f5f5f5';
    convertOption.onmouseleave = () => convertOption.style.backgroundColor = 'white';
    convertOption.onclick = () => {
      if (this.currentPath) {
        this.cycleNodeType(this.currentPath.nodes[nodeIndex], nodeIndex, this.currentPath.pathGraphics.parent as Container);
        this.updatePathGraphics();
      }
      this.hideContextMenu();
    };
    
    menu.appendChild(deleteOption);
    menu.appendChild(convertOption);
    
    // Add Boolean operations if multiple paths are selected
    if (this.multiSelectMode && this.selectedPaths.length >= 2) {
      const separator = document.createElement('div');
      separator.style.cssText = 'height: 1px; background: #eee; margin: 4px 0;';
      menu.appendChild(separator);
      
      const booleanOperations = [
        { name: 'Union', operation: BooleanOperation.Union },
        { name: 'Subtract', operation: BooleanOperation.Subtract },
        { name: 'Intersect', operation: BooleanOperation.Intersect },
        { name: 'Exclude', operation: BooleanOperation.Exclude }
      ];
      
      booleanOperations.forEach((op, index) => {
        const opOption = document.createElement('div');
        opOption.textContent = op.name;
        opOption.style.cssText = 'padding: 8px 12px; cursor: pointer;';
        if (index < booleanOperations.length - 1) {
          opOption.style.cssText += 'border-bottom: 1px solid #eee;';
        }
        opOption.onmouseenter = () => opOption.style.backgroundColor = '#f5f5f5';
        opOption.onmouseleave = () => opOption.style.backgroundColor = 'white';
        opOption.onclick = () => {
          if (this.currentPath) {
            this.performBooleanOperation(op.operation, this.currentPath.pathGraphics.parent as Container);
          }
          this.hideContextMenu();
        };
        menu.appendChild(opOption);
      });
    }
    
    document.body.appendChild(menu);
    this.contextMenu = menu;
    
    // Close menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
    }, 0);
  }

  /**
   * Show context menu for path segment operations
   */
  private showSegmentContextMenu(event: FederatedPointerEvent, segmentIndex: number, point: Point): void {
    this.hideContextMenu();
    
    const menu = document.createElement('div');
    menu.className = 'pen-tool-context-menu';
    menu.style.cssText = `
      position: fixed;
      left: ${event.clientX}px;
      top: ${event.clientY}px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      z-index: 10000;
      min-width: 150px;
    `;
    
    const addOption = document.createElement('div');
    addOption.textContent = 'Add Point';
    addOption.style.cssText = 'padding: 8px 12px; cursor: pointer;';
    addOption.onmouseenter = () => addOption.style.backgroundColor = '#f5f5f5';
    addOption.onmouseleave = () => addOption.style.backgroundColor = 'white';
    addOption.onclick = () => {
      if (this.currentPath) {
        this.insertNodeAtPosition(segmentIndex + 1, point, this.currentPath.pathGraphics.parent as Container);
        this.updatePathGraphics();
      }
      this.hideContextMenu();
    };
    
    menu.appendChild(addOption);
    document.body.appendChild(menu);
    this.contextMenu = menu;
    
    // Close menu when clicking elsewhere
    setTimeout(() => {
      document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
    }, 0);
  }

  /**
   * Hide context menu
   */
  private hideContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
    }
  }

  /**
   * Update bend mode hover effects
   */
  private updateBendModeHover(point: Point, container: Container): void {
    // Remove existing hover
    this.removeBendModePreview();
    
    // Find pen shapes to bend
    const penShape = this.findPenShapeAt(container, container.toGlobal(point));
    if (penShape) {
      const meta = (penShape as any).__meta;
      if (meta && meta.nodes) {
        // Check if hovering over a path segment
        const localPoint = point;
        const segmentIndex = this.pickPathSegmentFromMeta(localPoint, meta.nodes);
        if (segmentIndex !== null) {
          this.showBendModePreview(point, container);
        }
      }
    }
  }

  /**
   * Pick path segment from metadata nodes
   */
  private pickPathSegmentFromMeta(point: Point, nodes: any[]): number | null {
    for (let i = 0; i < nodes.length - 1; i++) {
      const start = new Point(nodes[i].x, nodes[i].y);
      const end = new Point(nodes[i + 1].x, nodes[i + 1].y);
      
      const distToSegment = this.distanceToLineSegment(point, start, end);
      if (distToSegment < 8) {
        return i;
      }
    }
    return null;
  }

  /**
   * Show bend mode preview
   */
  private showBendModePreview(point: Point, container: Container): void {
    if (!this.bendModePreview) {
      this.bendModePreview = new Graphics();
      this.markAsPenControl(this.bendModePreview, 'bend-preview');
      this.bendModePreview.zIndex = 1999;
      container.addChild(this.bendModePreview);
    }
    
    this.bendModePreview.clear();
    this.bendModePreview.circle(0, 0, 6);
    this.bendModePreview.fill({ color: 0x8b5cf6, alpha: 0.7 });
    this.bendModePreview.stroke({ width: 2, color: 0x7c3aed, alpha: 0.9 });
    this.bendModePreview.position.set(point.x, point.y);
  }

  /**
   * Remove bend mode preview
   */
  private removeBendModePreview(): void {
    if (this.bendModePreview && this.bendModePreview.parent) {
      this.bendModePreview.parent.removeChild(this.bendModePreview);
      this.bendModePreview = null;
    }
  }

  /**
   * Handle multiple path selection for Boolean operations
   */
  private handleMultiplePathSelection(event: FederatedPointerEvent, container: Container): void {
    const penShape = this.findPenShapeAt(container, event.global);
    if (penShape && (event as any).ctrlKey) {
      // Add to selection
      if (!this.selectedPaths.includes(penShape)) {
        this.selectedPaths.push(penShape);
        this.highlightPath(penShape, true);
      } else {
        // Remove from selection
        this.selectedPaths = this.selectedPaths.filter(p => p !== penShape);
        this.highlightPath(penShape, false);
      }
      this.multiSelectMode = this.selectedPaths.length > 1;
    } else if (!event.ctrlKey) {
      // Clear selection
      this.clearPathSelection();
    }
  }

  /**
   * Highlight path for selection
   */
  private highlightPath(path: Graphics, highlight: boolean): void {
    if (highlight) {
      // Add selection glow
      path.filters = []; // Simple approach - in a full implementation, add glow filter
      path.alpha = 0.8;
    } else {
      // Remove selection glow
      path.filters = [];
      path.alpha = 1.0;
    }
  }

  /**
   * Clear path selection
   */
  private clearPathSelection(): void {
    this.selectedPaths.forEach(path => this.highlightPath(path, false));
    this.selectedPaths = [];
    this.multiSelectMode = false;
  }

  /**
   * Perform Boolean operation on selected paths
   */
  private performBooleanOperation(operation: BooleanOperation, container: Container): void {
    if (this.selectedPaths.length < 2) {
      console.log('✏️ PEN: Need at least 2 paths selected for Boolean operations');
      return;
    }

    const pathA = this.extractPathData(this.selectedPaths[0]);
    const pathB = this.extractPathData(this.selectedPaths[1]);

    if (!pathA || !pathB) {
      console.log('✏️ PEN: Could not extract path data for Boolean operation');
      return;
    }

    const result = PathBooleanOperations.performOperation(pathA, pathB, operation);
    if (result) {
      // Create new graphics from result
      const newGraphics = PathBooleanOperations.createGraphicsFromPath(result);
      (newGraphics as any).__toolType = 'pen';
      (newGraphics as any).__meta = {
        kind: 'pen',
        closed: result.closed,
        nodes: result.nodes,
        size: result.size || 2,
        strokeColor: result.strokeColor || '#1a1a1a',
        fillColor: result.fillColor || '#f8fafc',
      };

      // Remove original paths
      this.selectedPaths.forEach(path => {
        if (path.parent) {
          path.parent.removeChild(path);
        }
      });

      // Add new path
      container.addChild(newGraphics);
      
      // Clear selection
      this.clearPathSelection();

      console.log(`✏️ PEN: Performed ${operation} operation`);
    }
  }

  /**
   * Extract path data from graphics object
   */
  private extractPathData(graphics: Graphics): PathData | null {
    const meta = (graphics as any).__meta;
    if (!meta || !meta.nodes) return null;

    return {
      nodes: meta.nodes,
      closed: meta.closed || false,
      strokeColor: meta.strokeColor,
      fillColor: meta.fillColor,
      size: meta.size
    };
  }

  // ===== END ENHANCED FEATURES =====

 // Get available colors for UI
 static getAvailableColors(): string[] {
 return PROFESSIONAL_COLORS;
 }

 // Get available stroke sizes for UI
 static getAvailableStrokeSizes(): number[] {
 return STROKE_SIZES.PEN;
 }

 /**
  * Clean up all control graphics associated with a pen path
  * This should be called when a pen path is deleted to ensure handles/nodes are removed
  */
 public static cleanupPathControls(pathGraphics: Graphics, container: Container): void {
   if (!pathGraphics || !container) return;
   
   // Find and remove all controls attached to this path
   const controlsToRemove: Graphics[] = [];
   
   for (const child of container.children) {
     const attachedTo = (child as any).__attachedTo;
     const isPenControl = (child as any).__penControl;
     
     // If this control is attached to the path being deleted, mark it for removal
     if (isPenControl && attachedTo === pathGraphics) {
       controlsToRemove.push(child as Graphics);
     }
   }
   
   // Remove all collected controls
   controlsToRemove.forEach(control => {
     try {
       if (control.parent) {
         control.parent.removeChild(control);
       }
     } catch (error) {
       console.warn('Failed to remove pen control:', error);
     }
   });
   
   if (controlsToRemove.length > 0) {
     console.log(`✏️ PEN: Cleaned up ${controlsToRemove.length} control graphics for deleted path`);
   }
 }
}
