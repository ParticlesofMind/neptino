import { Container, FederatedPointerEvent, Graphics, Point } from 'pixi.js';
import { PEN_CONSTANTS, hexToNumber } from '../SharedResources';
import {
  PenPathSettings,
  PenShapeMeta,
  PenShapeNodeMeta,
  VectorNode,
  VectorPointType,
} from './PenGeometry';
import { historyManager } from '../../canvas/HistoryManager';

interface PenPathEditorOptions {
  onCommit?: (shape: Graphics) => void;
  onCancel?: (shape: Graphics) => void;
}

type DragMode = 'none' | 'anchor' | 'handle-in' | 'handle-out';

export class PenPathEditor {
  private container: Container | null = null;
  private shape: Graphics | null = null;
  private workingPath: Graphics | null = null;
  private nodes: VectorNode[] = [];
  private settings: PenPathSettings | null = null;
  private isClosed: boolean = false;
  private isActive: boolean = false;
  private originalMeta: PenShapeMeta | null = null;
  private options: PenPathEditorOptions;

  private lastPointer: Point = new Point(0, 0);
  private isPointerDown = false;
  private activeNode: VectorNode | null = null;
  private dragMode: DragMode = 'none';
  private maintainMirrorOnHandleDrag = true;

  private lastClickTime = 0;
  private lastClickedNodeIndex = -1;
  private selectedNodeIndex = -1;

  private static readonly NODE_HIT_TOLERANCE = 8;
  private static readonly HANDLE_KNOB_RADIUS = 3;
  private static readonly DEFAULT_HANDLE_LEN = 30;

  constructor(options: PenPathEditorOptions = {}) {
    this.options = options;
  }

  public isEditing(): boolean {
    return this.isActive;
  }

  public startEditing(shape: Graphics, container: Container): boolean {
    const meta = ((shape as any).__meta || null) as PenShapeMeta | null;
    if (!meta || meta.kind !== 'pen' || !Array.isArray(meta.nodes)) {
      return false;
    }

    this.teardown(false);

    this.container = container;
    this.shape = shape;
    this.originalMeta = this.cloneMeta(meta);
    this.isClosed = !!meta.closed;
    this.settings = {
      size: meta.size ?? 2,
      strokeColor: meta.strokeColor ?? '#282a29',
      fillColor: meta.fillColor ?? 'transparent',
      strokeType: 'solid',
    };

    this.shape.visible = false;
    this.isActive = true;

    this.workingPath = new Graphics();
    this.workingPath.eventMode = 'none';
    this.workingPath.zIndex = (this.shape.zIndex ?? 0) + 0.1;
    container.addChild(this.workingPath);

    this.nodes = meta.nodes.map((n) => {
      const nodeGraphics = new Graphics();
      nodeGraphics.circle(0, 0, PEN_CONSTANTS.NODE_SIZE);
      nodeGraphics.fill({ color: PEN_CONSTANTS.NODE_COLOR });
      nodeGraphics.stroke({ width: PEN_CONSTANTS.NODE_STROKE_WIDTH, color: 0xffffff });
      nodeGraphics.position.set(n.x, n.y);
      nodeGraphics.eventMode = 'none';
      nodeGraphics.zIndex = (this.shape?.zIndex ?? 0) + 0.2;
      container.addChild(nodeGraphics);

      const node: VectorNode = {
        position: new Point(n.x, n.y),
        graphics: nodeGraphics,
        pointType: VectorPointType.Corner,
        handleIn: n.in ? new Point(n.in.x, n.in.y) : null,
        handleOut: n.out ? new Point(n.out.x, n.out.y) : null,
        handleInGraphics: null,
        handleOutGraphics: null,
        isSelected: false,
      };

      this.updateHandleGraphics(node, container);
      return node;
    });

    if (container.sortableChildren !== true) {
      try {
        container.sortableChildren = true;
      } catch {}
    }

    this.deselectAllNodes();
    this.updatePathGraphics();

    return true;
  }

  public handlePointerDown(event: FederatedPointerEvent, container: Container): boolean {
    if (!this.isActive) return false;

    const local = container.toLocal(event.global);
    this.lastPointer.copyFrom(local);

    const hit = this.pickNodeOrHandle(local);
    if (hit) {
      const now = performance.now();
      if (hit.kind === 'anchor') {
        if (this.lastClickedNodeIndex === hit.index && now - this.lastClickTime < 300) {
          this.cycleNodeType(this.nodes[hit.index], hit.index, container);
          this.updatePathGraphics();
          this.lastClickTime = 0;
          this.lastClickedNodeIndex = -1;
          return true;
        }
        this.lastClickTime = now;
        this.lastClickedNodeIndex = hit.index;
      } else {
        this.lastClickedNodeIndex = -1;
      }

      this.selectNode(hit.index);

      this.isPointerDown = true;
      this.activeNode = this.nodes[hit.index];
      this.dragMode = hit.kind;
      this.maintainMirrorOnHandleDrag = !(event as any).altKey;
      return true;
    }

    // Clicked outside: commit edits so selection tool can proceed
    this.commit();
    return false;
  }

  public handlePointerMove(event: FederatedPointerEvent, container: Container): boolean {
    if (!this.isActive) return false;
    const local = container.toLocal(event.global);

    if (this.isPointerDown && this.activeNode) {
      const prev = this.lastPointer;
      const dx = local.x - prev.x;
      const dy = local.y - prev.y;
      const node = this.activeNode;

      if (this.dragMode === 'anchor') {
        node.position.x += dx;
        node.position.y += dy;
        node.graphics.position.copyFrom(node.position);
        if (node.handleIn) {
          node.handleIn.x += dx;
          node.handleIn.y += dy;
        }
        if (node.handleOut) {
          node.handleOut.x += dx;
          node.handleOut.y += dy;
        }
      } else if (this.dragMode === 'handle-in') {
        node.handleIn = new Point(local.x, local.y);
        if (node.pointType === VectorPointType.Mirrored) {
          const vx = node.position.x - local.x;
          const vy = node.position.y - local.y;
          node.handleOut = new Point(node.position.x + vx, node.position.y + vy);
        } else if (node.pointType === VectorPointType.Smooth && this.maintainMirrorOnHandleDrag && node.handleOut) {
          const vx = node.position.x - local.x;
          const vy = node.position.y - local.y;
          const len = Math.hypot(vx, vy);
          if (len > 0) {
            const outLen = Math.hypot(node.handleOut.x - node.position.x, node.handleOut.y - node.position.y);
            const ratio = outLen / len;
            node.handleOut = new Point(node.position.x + vx * ratio, node.position.y + vy * ratio);
          }
        }
      } else if (this.dragMode === 'handle-out') {
        node.handleOut = new Point(local.x, local.y);
        if (node.pointType === VectorPointType.Mirrored) {
          const vx = node.position.x - local.x;
          const vy = node.position.y - local.y;
          node.handleIn = new Point(node.position.x + vx, node.position.y + vy);
        } else if (node.pointType === VectorPointType.Smooth && this.maintainMirrorOnHandleDrag && node.handleIn) {
          const vx = node.position.x - local.x;
          const vy = node.position.y - local.y;
          const len = Math.hypot(vx, vy);
          if (len > 0) {
            const inLen = Math.hypot(node.handleIn.x - node.position.x, node.handleIn.y - node.position.y);
            const ratio = inLen / len;
            node.handleIn = new Point(node.position.x + vx * ratio, node.position.y + vy * ratio);
          }
        }
      }

      this.updateHandleGraphics(node, container);
      this.updateNodeVisuals(node);
      this.updatePathGraphics();
      this.lastPointer.copyFrom(local);
      return true;
    }

    this.lastPointer.copyFrom(local);
    return true;
  }

  public handlePointerUp(_event: FederatedPointerEvent): boolean {
    if (!this.isActive) return false;
    this.isPointerDown = false;
    this.activeNode = null;
    this.dragMode = 'none';
    return true;
  }

  public handleKeyDown(event: KeyboardEvent): boolean {
    if (!this.isActive) return false;
    const key = event.key;
    switch (key) {
      case 'Enter':
        this.commit();
        return true;
      case 'Escape':
        this.cancel();
        return true;
      case 'Backspace':
      case 'Delete':
        if (this.removeSelectedNode()) {
          this.updatePathGraphics();
        }
        return true;
      case 'Tab':
        if (this.selectedNodeIndex >= 0) {
          this.cycleNodeType(this.nodes[this.selectedNodeIndex], this.selectedNodeIndex, this.container!);
          this.updatePathGraphics();
        }
        return true;
      default:
        return false;
    }
  }

  public commit(): boolean {
    if (!this.isActive || !this.shape || !this.settings) return false;

    const newMeta = this.buildMetaFromNodes();
    const oldMeta = this.originalMeta ? this.cloneMeta(this.originalMeta) : null;

    this.applyMetaToShape(newMeta);
    this.finishSession();

    if (oldMeta && !this.metaEquals(oldMeta, newMeta)) {
      historyManager.push({
        label: 'Edit Pen Path',
        undo: () => this.applyMetaToShape(oldMeta),
        redo: () => this.applyMetaToShape(newMeta),
      });
    }

    if (this.shape) {
      this.options.onCommit?.(this.shape);
    }
    return true;
  }

  public cancel(): boolean {
    if (!this.isActive || !this.shape) return false;

    if (this.originalMeta) {
      this.applyMetaToShape(this.originalMeta);
    }
    this.finishSession();
    if (this.shape) {
      this.options.onCancel?.(this.shape);
    }
    return true;
  }

  private finishSession(): void {
    if (this.shape) {
      this.shape.visible = true;
    }
    this.teardown(true);
  }

  private teardown(keepOriginalMetaVisible: boolean): void {
    if (!keepOriginalMetaVisible && this.shape) {
      this.shape.visible = true;
    }
    if (this.workingPath && this.workingPath.parent) {
      this.workingPath.parent.removeChild(this.workingPath);
    }
    this.workingPath = null;

    this.nodes.forEach((node) => {
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
    this.nodes = [];

    this.isActive = false;
    this.isPointerDown = false;
    this.activeNode = null;
    this.dragMode = 'none';
    this.container = null;
  }

  private pickNodeOrHandle(point: Point): { kind: DragMode; index: number } | null {
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      if (node.handleIn) {
        if (Math.hypot(point.x - node.handleIn.x, point.y - node.handleIn.y) <= PenPathEditor.HANDLE_KNOB_RADIUS + 3) {
          return { kind: 'handle-in', index: i };
        }
      }
      if (node.handleOut) {
        if (Math.hypot(point.x - node.handleOut.x, point.y - node.handleOut.y) <= PenPathEditor.HANDLE_KNOB_RADIUS + 3) {
          return { kind: 'handle-out', index: i };
        }
      }
      if (Math.hypot(point.x - node.position.x, point.y - node.position.y) <= PenPathEditor.NODE_HIT_TOLERANCE) {
        return { kind: 'anchor', index: i };
      }
    }
    return null;
  }

  private updatePathGraphics(): void {
    if (!this.workingPath || !this.settings || this.nodes.length === 0) return;

    if (this.isClosed && this.nodes.length > 1) {
      this.ensureClosingHandles();
    }

    const path = this.workingPath;
    path.clear();

    if (this.nodes.length === 1) {
      return;
    }

    const first = this.nodes[0];
    path.moveTo(first.position.x, first.position.y);

    for (let i = 1; i < this.nodes.length; i++) {
      const prev = this.nodes[i - 1];
      const curr = this.nodes[i];
      this.drawSegment(path, prev, curr);
    }

    if (this.isClosed && this.nodes.length > 2) {
      const last = this.nodes[this.nodes.length - 1];
      this.drawSegment(path, last, first);
      path.closePath();
      const fill = this.settings.fillColor;
      if (fill && fill !== 'transparent' && fill !== '') {
        try {
          path.fill({ color: hexToNumber(fill) });
        } catch {}
      }
    }

    path.stroke({
      width: this.settings.size,
      color: hexToNumber(this.settings.strokeColor),
      cap: 'round',
      join: 'round',
    });
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

  private drawMetaSegment(path: Graphics, prev: PenShapeNodeMeta, curr: PenShapeNodeMeta): void {
    const c1 = prev.out ?? null;
    const c2 = curr.in ?? null;
    if (c1 && c2) {
      path.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, curr.x, curr.y);
    } else if (c1) {
      path.bezierCurveTo(c1.x, c1.y, c1.x, c1.y, curr.x, curr.y);
    } else if (c2) {
      path.bezierCurveTo(c2.x, c2.y, c2.x, c2.y, curr.x, curr.y);
    } else {
      path.lineTo(curr.x, curr.y);
    }
  }

  private ensureClosingHandles(): void {
    if (!this.isClosed || this.nodes.length < 2) return;
    const container = this.container;
    if (!container) return;
    const first = this.nodes[0];
    const last = this.nodes[this.nodes.length - 1];
    if (!first || !last) return;

    let updatedFirst = false;
    let updatedLast = false;

    if (last.handleOut && (!first.handleIn || first.pointType === VectorPointType.Corner)) {
      const dx = last.handleOut.x - last.position.x;
      const dy = last.handleOut.y - last.position.y;
      first.handleIn = new Point(first.position.x - dx, first.position.y - dy);
      if (first.pointType === VectorPointType.Corner) {
        first.pointType = VectorPointType.Smooth;
      }
      updatedFirst = true;
    }

    if (first.handleIn && (!last.handleOut || last.pointType === VectorPointType.Corner)) {
      const dx = first.position.x - first.handleIn.x;
      const dy = first.position.y - first.handleIn.y;
      last.handleOut = new Point(last.position.x + dx, last.position.y + dy);
      if (last.pointType === VectorPointType.Corner) {
        last.pointType = VectorPointType.Smooth;
      }
      updatedLast = true;
    }

    if (updatedFirst) {
      this.updateHandleGraphics(first, container);
      this.updateNodeVisuals(first);
    }

    if (updatedLast) {
      this.updateHandleGraphics(last, container);
      this.updateNodeVisuals(last);
    }
  }

  private updateHandleGraphics(node: VectorNode, container: Container): void {
    const drawHandle = (
      kind: 'in' | 'out',
      anchor: Point,
      handle: Point | null | undefined,
      bundle: VectorNode['handleInGraphics'] | VectorNode['handleOutGraphics'] | null,
    ): VectorNode['handleInGraphics'] | VectorNode['handleOutGraphics'] | null => {
      if (!handle) {
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
        line.zIndex = (this.shape?.zIndex ?? 0) + 0.05;
        container.addChild(line);
      }
      if (!knob) {
        knob = new Graphics();
        knob.zIndex = (this.shape?.zIndex ?? 0) + 0.06;
        container.addChild(knob);
      }

      line.clear();
      line.moveTo(anchor.x, anchor.y);
      line.lineTo(handle.x, handle.y);
      line.stroke({ width: 1, color: 0x9ca3af, alpha: 0.9 });

      knob.clear();
      knob.circle(0, 0, 3);
      knob.fill({ color: kind === 'in' ? 0x22c55e : 0x3b82f6 });
      knob.position.set(handle.x, handle.y);

      return { line, knob };
    };

    node.handleInGraphics = drawHandle('in', node.position, node.handleIn, node.handleInGraphics || null) as any;
    node.handleOutGraphics = drawHandle('out', node.position, node.handleOut, node.handleOutGraphics || null) as any;
  }

  private updateNodeVisuals(node: VectorNode): void {
    if (!node.graphics) return;

    node.graphics.clear();

    let nodeColor = PEN_CONSTANTS.NODE_COLOR;
    switch (node.pointType) {
      case VectorPointType.Corner:
        nodeColor = 0x64748b;
        break;
      case VectorPointType.Smooth:
        nodeColor = 0x3b82f6;
        break;
      case VectorPointType.Mirrored:
        nodeColor = 0x10b981;
        break;
    }

    const size = node.isSelected ? PEN_CONSTANTS.NODE_SIZE + 2 : PEN_CONSTANTS.NODE_SIZE;
    node.graphics.circle(0, 0, size);
    node.graphics.fill({ color: nodeColor });
    node.graphics.stroke({
      width: node.isSelected ? 2 : PEN_CONSTANTS.NODE_STROKE_WIDTH,
      color: 0xffffff,
    });
  }

  private selectNode(index: number): void {
    this.selectedNodeIndex = index;
    this.nodes.forEach((node, idx) => {
      node.isSelected = idx === index;
      this.updateNodeVisuals(node);
    });
  }

  private deselectAllNodes(): void {
    this.selectedNodeIndex = -1;
    this.nodes.forEach((node) => {
      node.isSelected = false;
      this.updateNodeVisuals(node);
    });
  }

  private cycleNodeType(node: VectorNode, idx: number, container: Container): void {
    switch (node.pointType) {
      case VectorPointType.Corner:
        node.pointType = VectorPointType.Smooth;
        this.createDefaultHandles(node, idx);
        break;
      case VectorPointType.Smooth:
        node.pointType = VectorPointType.Mirrored;
        this.enforceHandleMirroring(node);
        break;
      case VectorPointType.Mirrored:
        node.pointType = VectorPointType.Corner;
        node.handleIn = null;
        node.handleOut = null;
        break;
    }
    this.updateHandleGraphics(node, container);
    this.updateNodeVisuals(node);
  }

  private createDefaultHandles(node: VectorNode, idx: number): void {
    if (!this.nodes.length) return;

    let dirX = 1;
    let dirY = 0;
    const prev = this.nodes[idx - 1];
    const next = this.nodes[idx + 1];

    if (prev && next) {
      const vx = next.position.x - prev.position.x;
      const vy = next.position.y - prev.position.y;
      const len = Math.hypot(vx, vy) || 1;
      dirX = vx / len;
      dirY = vy / len;
    } else if (prev) {
      const vx = node.position.x - prev.position.x;
      const vy = node.position.y - prev.position.y;
      const len = Math.hypot(vx, vy) || 1;
      dirX = vx / len;
      dirY = vy / len;
    } else if (next) {
      const vx = next.position.x - node.position.x;
      const vy = next.position.y - node.position.y;
      const len = Math.hypot(vx, vy) || 1;
      dirX = vx / len;
      dirY = vy / len;
    }

    const lenH = PenPathEditor.DEFAULT_HANDLE_LEN;
    node.handleOut = new Point(node.position.x + dirX * lenH, node.position.y + dirY * lenH);
    node.handleIn = new Point(node.position.x - dirX * lenH, node.position.y - dirY * lenH);
  }

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

  private removeSelectedNode(): boolean {
    if (this.selectedNodeIndex < 0) return false;
    return this.removeNodeAtIndex(this.selectedNodeIndex);
  }

  private removeNodeAtIndex(index: number): boolean {
    if (index < 0 || index >= this.nodes.length) return false;
    if (this.nodes.length <= 2) return false;

    const node = this.nodes[index];
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

    this.nodes.splice(index, 1);
    this.selectedNodeIndex = -1;
    return true;
  }

  private buildMetaFromNodes(): PenShapeMeta {
    const nodes: PenShapeNodeMeta[] = this.nodes.map((node) => ({
      x: node.position.x,
      y: node.position.y,
      in: node.handleIn ? { x: node.handleIn.x, y: node.handleIn.y } : null,
      out: node.handleOut ? { x: node.handleOut.x, y: node.handleOut.y } : null,
    }));

    const fill = this.isClosed ? (this.settings?.fillColor ?? 'transparent') : null;

    return {
      kind: 'pen',
      closed: this.isClosed,
      nodes,
      size: this.settings?.size ?? 2,
      strokeColor: this.settings?.strokeColor ?? '#282a29',
      fillColor: fill,
    };
  }

  private applyMetaToShape(meta: PenShapeMeta): void {
    if (!this.shape) return;

    const shape = this.shape;
    shape.clear();

    const nodes = meta.nodes;
    if (!nodes || nodes.length === 0) {
      shape.visible = true;
      (shape as any).__meta = meta;
      return;
    }

    const first = nodes[0];
    shape.moveTo(first.x, first.y);

    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      this.drawMetaSegment(shape, prev, curr);
    }

    if (meta.closed && nodes.length > 2) {
      const last = nodes[nodes.length - 1];
      this.drawMetaSegment(shape, last, first);
      shape.closePath();
      if (meta.fillColor && meta.fillColor !== 'transparent' && meta.fillColor !== '') {
        try {
          shape.fill({ color: hexToNumber(meta.fillColor) });
        } catch {}
      }
    }

    shape.stroke({
      width: meta.size ?? 2,
      color: hexToNumber(meta.strokeColor ?? '#282a29'),
      cap: 'round',
      join: 'round',
    });

    shape.visible = true;
    (shape as any).__meta = this.cloneMeta(meta);
    (shape as any).__toolType = 'pen';
  }

  private cloneMeta(meta: PenShapeMeta): PenShapeMeta {
    return JSON.parse(JSON.stringify(meta));
  }

  private metaEquals(a: PenShapeMeta, b: PenShapeMeta): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
  }
}
