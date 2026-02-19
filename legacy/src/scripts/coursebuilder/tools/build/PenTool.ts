import { Container, Graphics, type FederatedPointerEvent } from "pixi.js";
import type { CanvasTool, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";
import { hexToNumber, normalizeHex } from "../common/color";

const SETTING_SIZE = "strokeSize";
const SETTING_COLOR = "strokeColor";
const SETTING_FILL = "fillColor";
const SETTING_VECTOR = "vectorMode";

const DEFAULT_VECTOR_TOGGLE = true;
const CLOSE_DISTANCE = 16;
const MIN_HANDLE_LENGTH = 0.75;
const HANDLE_LINE_COLOR = 0x7ca6ff;
const HANDLE_FILL_COLOR = 0xffffff;
const HANDLE_STROKE_COLOR = 0x2f66d0;
const ANCHOR_FILL_COLOR = 0xffffff;
const ANCHOR_STROKE_COLOR = 0x1c4ed8;

interface PathPoint {
  x: number;
  y: number;
}

interface PenModeController {
  activate(context: ToolRuntimeContext): void;
  deactivate(): void;
  pointerDown(event: ToolPointerEvent): void;
  pointerMove(event: ToolPointerEvent): void;
  pointerUp(event: ToolPointerEvent): void;
  pointerCancel(event: ToolPointerEvent): void;
  setStrokeSize(value: number): void;
  setStrokeColor(value: string): void;
  setFillColor(value: string): void;
}

export class PenTool implements CanvasTool {
  public readonly id = "pen";
  public readonly mode = "build" as const;

  private context: ToolRuntimeContext | null = null;
  private strokeSize = 2;
  private strokeColor = "#4A7FB8";
  private fillColor = "transparent";
  private vectorMode = DEFAULT_VECTOR_TOGGLE;

  private readonly freehandController = new FreehandPenController();
  private readonly vectorController = new VectorPenController();
  private activeController: PenModeController = this.vectorController;

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.strokeSize = this.normalizeStrokeSize(context.getSetting<number>(SETTING_SIZE, this.strokeSize));
    this.strokeColor = normalizeHex(context.getSetting<string>(SETTING_COLOR, this.strokeColor), this.strokeColor);
    this.fillColor = context.getSetting<string>(SETTING_FILL, this.fillColor);
    this.vectorMode = context.getSetting<boolean>(SETTING_VECTOR, DEFAULT_VECTOR_TOGGLE) !== false;

    this.freehandController.setStrokeSize(this.strokeSize);
    this.freehandController.setStrokeColor(this.strokeColor);
    this.freehandController.setFillColor(this.fillColor);

    this.vectorController.setStrokeSize(this.strokeSize);
    this.vectorController.setStrokeColor(this.strokeColor);
    this.vectorController.setFillColor(this.fillColor);

    this.activeController = this.vectorMode ? this.vectorController : this.freehandController;
    this.activeController.activate(context);
  }

  public deactivate(): void {
    this.activeController.deactivate();
    if (this.activeController !== this.vectorController) {
      this.vectorController.deactivate();
    }
    if (this.activeController !== this.freehandController) {
      this.freehandController.deactivate();
    }
    this.context = null;
  }

  public pointerDown(event: ToolPointerEvent): void {
    this.activeController.pointerDown(event);
  }

  public pointerMove(event: ToolPointerEvent): void {
    this.activeController.pointerMove(event);
  }

  public pointerUp(event: ToolPointerEvent): void {
    this.activeController.pointerUp(event);
  }

  public pointerCancel(event: ToolPointerEvent): void {
    this.activeController.pointerCancel(event);
  }

  public updateSetting(key: string, value: unknown): void {
    if (key === SETTING_SIZE && typeof value === "number" && Number.isFinite(value)) {
      this.strokeSize = this.normalizeStrokeSize(value);
      this.freehandController.setStrokeSize(this.strokeSize);
      this.vectorController.setStrokeSize(this.strokeSize);
    }
    if (key === SETTING_COLOR && typeof value === "string") {
      this.strokeColor = normalizeHex(value, this.strokeColor);
      this.freehandController.setStrokeColor(this.strokeColor);
      this.vectorController.setStrokeColor(this.strokeColor);
    }
    if (key === SETTING_FILL && typeof value === "string") {
      this.fillColor = value;
      this.freehandController.setFillColor(this.fillColor);
      this.vectorController.setFillColor(this.fillColor);
    }
    if (key === SETTING_VECTOR && typeof value === "boolean") {
      if (this.vectorMode === value) {
        return;
      }
      this.vectorMode = value;
      if (!this.context) {
        this.activeController = value ? this.vectorController : this.freehandController;
        return;
      }
      this.activeController.deactivate();
      this.activeController = value ? this.vectorController : this.freehandController;
      if (value) {
        this.vectorController.setStrokeSize(this.strokeSize);
        this.vectorController.setStrokeColor(this.strokeColor);
        this.vectorController.setFillColor(this.fillColor);
      } else {
        this.freehandController.setStrokeSize(this.strokeSize);
        this.freehandController.setStrokeColor(this.strokeColor);
        this.freehandController.setFillColor(this.fillColor);
      }
      this.activeController.activate(this.context);
    }
  }

  private normalizeStrokeSize(value: number): number {
    return Math.max(1, Math.min(24, Math.round(value)));
  }
}

interface ActiveStroke {
  id: string | null;
  graphics: Graphics;
  points: PathPoint[];
}

class FreehandPenController implements PenModeController {
  private context: ToolRuntimeContext | null = null;
  private activeStroke: ActiveStroke | null = null;
  private strokeSize = 2;
  private strokeColor = "#4A7FB8";
  private fillColor = "transparent";

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
  }

  public deactivate(): void {
    if (this.activeStroke?.id) {
      this.commitStroke(true);
    }
    this.activeStroke = null;
    this.context = null;
  }

  public pointerDown(event: ToolPointerEvent): void {
    if (!this.context) {
      return;
    }
    this.startStroke({ x: event.worldX, y: event.worldY });
  }

  public pointerMove(event: ToolPointerEvent): void {
    if (!this.activeStroke) {
      return;
    }

    const nextPoint = { x: event.worldX, y: event.worldY };
    const points = this.activeStroke.points;
    const lastPoint = points[points.length - 1];

    if (!lastPoint || distance(nextPoint, lastPoint) < 1) {
      return;
    }

    points.push(nextPoint);
    this.redrawStroke();
  }

  public pointerUp(_event: ToolPointerEvent): void {
    void _event;
    this.commitStroke(false);
  }

  public pointerCancel(_event: ToolPointerEvent): void {
    void _event;
    this.commitStroke(true);
  }

  public setStrokeSize(value: number): void {
    this.strokeSize = value;
    if (this.activeStroke) {
      this.redrawStroke();
    }
  }

  public setStrokeColor(value: string): void {
    this.strokeColor = value;
    if (this.activeStroke) {
      this.redrawStroke();
    }
  }

  public setFillColor(value: string): void {
    this.fillColor = value;
  }

  private startStroke(point: PathPoint): void {
    const context = this.context;
    if (!context) {
      return;
    }

    const graphics = new Graphics();
    graphics.label = "pen-path";

    const id = context.canvas.addDisplayObject(graphics);
    this.activeStroke = {
      id,
      graphics,
      points: [point],
    };
    this.redrawStroke();
  }

  private redrawStroke(): void {
    const active = this.activeStroke;
    if (!active) {
      return;
    }

    const points = active.points;
    const graphics = active.graphics;
    graphics.clear();

    if (!points.length) {
      return;
    }

    const isClosed = points.length >= 3 && distance(points[0], points[points.length - 1]) <= CLOSE_DISTANCE;

    // Build the full path first
    graphics.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) {
      graphics.lineTo(points[i].x, points[i].y);
    }

    if (isClosed) {
      graphics.closePath();
      // Fill the closed shape first (drawn behind the stroke)
      const fill = this.resolveFillColor();
      graphics.fill({ color: fill.color, alpha: fill.alpha });
    }

    // Apply stroke on top
    graphics.stroke({
      color: hexToNumber(this.strokeColor, 0x4a7fb8),
      width: this.strokeSize,
      cap: "round",
      join: "round",
    });
  }

  private resolveFillColor(): { color: number; alpha: number } {
    if (typeof this.fillColor !== "string" || this.fillColor === "" || this.fillColor === "transparent") {
      return { color: 0xa0a0a0, alpha: 0.25 };
    }
    const color = hexToNumber(this.fillColor, 0xa0a0a0);
    return { color, alpha: 0.6 };
  }

  private commitStroke(forceRemove: boolean): void {
    const context = this.context;
    const active = this.activeStroke;
    if (!context || !active) {
      return;
    }

    if (forceRemove || active.points.length < 2) {
      if (active.id) {
        context.canvas.removeObject(active.id);
      }
    } else {
      this.redrawStroke();
    }

    this.activeStroke = null;
  }
}

type Vec2 = PathPoint;

interface PathNode {
  position: Vec2;
  handleIn: Vec2 | null;
  handleOut: Vec2 | null;
}

interface NodePath {
  id: string;
  graphics: Graphics;
  overlay: Container;
  handlesLayer: Container;
  preview: Graphics;
  nodes: PathNode[];
  closed: boolean;
  strokeSize: number;
  strokeColor: string;
  fillColor: string;
}

type Interaction =
  | {
      type: "add-node";
      pointerId: number;
      pathId: string;
      nodeIndex: number;
      dragged: boolean;
    }
  | {
      type: "drag-anchor";
      pointerId: number;
      pathId: string;
      nodeIndex: number;
      anchorOffset: Vec2;
      handleInDelta: Vec2 | null;
      handleOutDelta: Vec2 | null;
      moved: boolean;
    }
  | {
      type: "drag-handle";
      pointerId: number;
      pathId: string;
      nodeIndex: number;
      handle: "in" | "out";
      moved: boolean;
    };

class VectorPenController implements PenModeController {
  private context: ToolRuntimeContext | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private handleLayer: Container | null = null;
  private readonly paths = new Map<string, NodePath>();
  private selectedPathId: string | null = null;
  private interaction: Interaction | null = null;
  private strokeSize = 2;
  private strokeColor = "#4A7FB8";
  private fillColor = "transparent";
  private hoverPoint: Vec2 | null = null;

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.canvasElement = context.canvas.getCanvasElement();
    const layer = this.ensureHandleLayer();
    layer.visible = true;

    this.paths.forEach((path) => {
      if (!path.overlay.parent) {
        layer.addChild(path.overlay);
      }
      const isActive = path.id === this.selectedPathId;
      path.overlay.visible = isActive;
      if (isActive) {
        this.renderOverlay(path);
        this.renderPreviewForPath(path, this.hoverPoint);
      } else {
        this.clearOverlay(path);
      }
    });
    this.updateHoverPreview(this.hoverPoint);
  }

  public deactivate(): void {
    this.interaction = null;
    this.unbindPointerEvents();
    if (this.handleLayer) {
      this.handleLayer.visible = false;
    }
    this.hoverPoint = null;
    this.clearAllPreviews();
    this.canvasElement = null;
    this.context = null;
  }

  public pointerDown(event: ToolPointerEvent): void {
    if (!this.context || (event.buttons & 1) === 0 || this.interaction) {
      return;
    }
    this.updateHoverPreview(null);

    let path = this.getSelectedPath();
    if (!path || path.closed) {
      path = this.createPath();
    }
    if (!path) {
      return;
    }

    if (path.nodes.length >= 2) {
      const first = path.nodes[0];
      if (distance(first.position, { x: event.worldX, y: event.worldY }) <= CLOSE_DISTANCE) {
        path.closed = true;
        this.renderPath(path);
        if (path.id === this.selectedPathId) {
          this.renderOverlay(path);
        }
        this.interaction = null;
        this.updateHoverPreview(null);
        return;
      }
    }

    const newNode: PathNode = {
      position: { x: event.worldX, y: event.worldY },
      handleIn: null,
      handleOut: null,
    };
    path.nodes.push(newNode);
    this.interaction = {
      type: "add-node",
      pointerId: event.pointerId,
      pathId: path.id,
      nodeIndex: path.nodes.length - 1,
      dragged: false,
    };
    this.renderPath(path);
    if (path.id === this.selectedPathId) {
      this.renderOverlay(path);
      this.renderPreviewForPath(path, this.hoverPoint);
    }
  }

  public pointerMove(event: ToolPointerEvent): void {
    if (!this.interaction) {
      this.updateHoverPreview({ x: event.worldX, y: event.worldY });
      return;
    }
    if (this.interaction.type !== "add-node" || event.pointerId !== this.interaction.pointerId) {
      return;
    }
    const path = this.paths.get(this.interaction.pathId);
    if (!path) {
      return;
    }

    const node = path.nodes[this.interaction.nodeIndex];
    const prev = path.nodes[this.interaction.nodeIndex - 1];
    if (!node || !prev) {
      return;
    }

    const dx = event.worldX - node.position.x;
    const dy = event.worldY - node.position.y;
    const length = Math.hypot(dx, dy);

    if (length >= MIN_HANDLE_LENGTH) {
      this.interaction.dragged = true;
      node.handleIn = { x: node.position.x - dx, y: node.position.y - dy };
      node.handleOut = { x: node.position.x + dx, y: node.position.y + dy };
      // Only auto-set previous node's handleOut if it doesn't already have one
      // (i.e. the user placed a sharp corner node previously)
      if (!prev.handleOut) {
        prev.handleOut = { x: prev.position.x + dx * 0.5, y: prev.position.y + dy * 0.5 };
      }
    } else if (!this.interaction.dragged) {
      node.handleIn = null;
      node.handleOut = null;
    }

    this.renderPath(path);
    if (path.id === this.selectedPathId) {
      this.renderOverlay(path);
    }
    this.updateHoverPreview(null);
  }

  public pointerUp(event: ToolPointerEvent): void {
    if (!this.interaction || this.interaction.type !== "add-node" || event.pointerId !== this.interaction.pointerId) {
      return;
    }
    const path = this.paths.get(this.interaction.pathId);
    if (path) {
      const node = path.nodes[this.interaction.nodeIndex];
      if (node) {
        if (!this.interaction.dragged) {
          node.handleIn = null;
          node.handleOut = null;
        }
        this.renderPath(path);
        if (path.id === this.selectedPathId) {
          this.renderOverlay(path);
        }
      }
    }
    this.interaction = null;
  }

  public pointerCancel(_event: ToolPointerEvent): void {
    void _event;
    if (this.interaction?.type === "add-node") {
      const path = this.paths.get(this.interaction.pathId);
      if (path) {
        path.nodes.splice(this.interaction.nodeIndex, 1);
        this.renderPath(path);
        if (path.id === this.selectedPathId) {
          this.renderOverlay(path);
        }
      }
    }
    this.interaction = null;
    this.unbindPointerEvents();
    this.updateHoverPreview(null);
  }

  public setStrokeSize(value: number): void {
    this.strokeSize = value;
    const path = this.getSelectedPath();
    if (path) {
      path.strokeSize = value;
      this.renderPath(path);
      this.renderOverlay(path);
      this.renderPreviewForPath(path, this.hoverPoint);
    }
  }

  public setStrokeColor(value: string): void {
    this.strokeColor = value;
    const path = this.getSelectedPath();
    if (path) {
      path.strokeColor = value;
      this.renderPath(path);
      this.renderOverlay(path);
      this.renderPreviewForPath(path, this.hoverPoint);
    }
  }

  public setFillColor(value: string): void {
    this.fillColor = value;
    const path = this.getSelectedPath();
    if (path) {
      path.fillColor = value;
      this.renderPath(path);
    }
  }

  private createPath(): NodePath | null {
    if (!this.context) {
      return null;
    }

    const graphics = new Graphics();
    graphics.label = "node-path";
    graphics.eventMode = "static";
    graphics.cursor = "pointer";

    const id = this.context.canvas.addDisplayObject(graphics);
    if (!id) {
      graphics.destroy();
      return null;
    }

    const overlay = new Container();
    overlay.label = "node-path-overlay";
    overlay.eventMode = "none";

    const preview = new Graphics();
    preview.eventMode = "none";

    const handlesLayer = new Container();
    handlesLayer.eventMode = "none";

    overlay.addChild(preview);
    overlay.addChild(handlesLayer);

    const layer = this.ensureHandleLayer();
    layer.addChild(overlay);

    const path: NodePath = {
      id,
      graphics,
      overlay,
      handlesLayer,
      preview,
      nodes: [],
      closed: false,
      strokeSize: this.strokeSize,
      strokeColor: this.strokeColor,
      fillColor: this.fillColor,
    };

    graphics.on("pointerdown", (event: FederatedPointerEvent) => this.handlePathPointerDown(path.id, event));

    this.paths.set(id, path);
    this.selectPath(path);
    return path;
  }

  private ensureHandleLayer(): Container {
    if (!this.context) {
      if (!this.handleLayer) {
        this.handleLayer = new Container();
        this.handleLayer.label = "node-tool-overlay";
        this.handleLayer.eventMode = "none";
      }
      return this.handleLayer;
    }
    if (!this.handleLayer) {
      this.handleLayer = new Container();
      this.handleLayer.label = "node-tool-overlay";
      this.handleLayer.eventMode = "none";
      this.context.overlayLayer.addChild(this.handleLayer);
    } else if (this.handleLayer.parent !== this.context.overlayLayer) {
      this.context.overlayLayer.addChild(this.handleLayer);
    }
    return this.handleLayer;
  }

  private getSelectedPath(): NodePath | null {
    if (!this.selectedPathId) {
      return null;
    }
    return this.paths.get(this.selectedPathId) ?? null;
  }

  private selectPath(path: NodePath | null): void {
    this.selectedPathId = path?.id ?? null;
    this.paths.forEach((candidate) => {
      const active = candidate.id === this.selectedPathId && (this.handleLayer?.visible ?? true);
      candidate.overlay.visible = active;
      if (active) {
        this.renderOverlay(candidate);
        this.renderPreviewForPath(candidate, this.hoverPoint);
      } else {
        this.clearOverlay(candidate);
      }
    });
  }

  private handlePathPointerDown(pathId: string, event: FederatedPointerEvent): void {
    const native = event.nativeEvent as PointerEvent | undefined;
    if (native?.button !== 0) {
      return;
    }
    event.stopPropagation();
    const path = this.paths.get(pathId);
    if (!path) {
      return;
    }
    this.selectPath(path);
  }

  private renderPath(path: NodePath): void {
    const graphics = path.graphics;
    graphics.clear();

    if (!path.nodes.length) {
      return;
    }

    const first = path.nodes[0];
    graphics.moveTo(first.position.x, first.position.y);
    for (let i = 1; i < path.nodes.length; i += 1) {
      const node = path.nodes[i];
      const prev = path.nodes[i - 1];
      const cp1 = prev.handleOut ?? prev.position;
      const cp2 = node.handleIn ?? node.position;
      if (!prev.handleOut && !node.handleIn) {
        graphics.lineTo(node.position.x, node.position.y);
      } else {
        graphics.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, node.position.x, node.position.y);
      }
    }

    if (path.closed && path.nodes.length >= 2) {
      const last = path.nodes[path.nodes.length - 1];
      const cp1 = last.handleOut ?? last.position;
      const cp2 = first.handleIn ?? first.position;
      if (!last.handleOut && !first.handleIn) {
        graphics.lineTo(first.position.x, first.position.y);
      } else {
        graphics.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, first.position.x, first.position.y);
      }
      graphics.closePath();
    }

    graphics.stroke({
      color: hexToNumber(path.strokeColor, 0x4a7fb8),
      width: path.strokeSize,
      cap: "round",
      join: "round",
    });

    if (path.closed && !isTransparent(path.fillColor)) {
      const fill = this.resolveFillColor(path.fillColor);
      graphics.fill({ color: fill.color, alpha: fill.alpha });
    }
  }

  private renderOverlay(path: NodePath): void {
    if (!this.handleLayer || !this.handleLayer.visible) {
      return;
    }
    const handles = path.handlesLayer;
    const children = handles.removeChildren();
    children.forEach((child) => child.destroy());

    const scale = Math.max(this.context?.canvas.getCurrentZoom() ?? 1, 0.001);
    const lineWidth = 1.2 / scale;
    const handleRadius = 5.5 / scale;
    const anchorRadius = 7 / scale;

    path.nodes.forEach((node, index) => {
      if (node.handleIn) {
        const connector = new Graphics();
        connector.moveTo(node.position.x, node.position.y);
        connector.lineTo(node.handleIn.x, node.handleIn.y);
        connector.stroke({ color: HANDLE_LINE_COLOR, width: lineWidth, alignment: 0.5, alpha: 0.9 });
        handles.addChild(connector);

        const handle = this.createHandleGraphic(node.handleIn, handleRadius);
        handle.on("pointerdown", (event: FederatedPointerEvent) => this.beginHandleInteraction(path.id, index, "in", event));
        handles.addChild(handle);
      }

      if (node.handleOut) {
        const connector = new Graphics();
        connector.moveTo(node.position.x, node.position.y);
        connector.lineTo(node.handleOut.x, node.handleOut.y);
        connector.stroke({ color: HANDLE_LINE_COLOR, width: lineWidth, alignment: 0.5, alpha: 0.9 });
        handles.addChild(connector);

        const handle = this.createHandleGraphic(node.handleOut, handleRadius);
        handle.on("pointerdown", (event: FederatedPointerEvent) => this.beginHandleInteraction(path.id, index, "out", event));
        handles.addChild(handle);
      }
    });

    path.nodes.forEach((node, index) => {
      const anchor = this.createAnchorGraphic(node.position, anchorRadius);
      anchor.on("pointerdown", (event: FederatedPointerEvent) => this.beginAnchorInteraction(path.id, index, event));
      handles.addChild(anchor);
    });
  }

  private updateHoverPreview(point: Vec2 | null): void {
    this.hoverPoint = point;
    const path = this.getSelectedPath();
    this.clearAllPreviews();
    if (!point || !path || path.closed || !path.nodes.length) {
      return;
    }
    this.renderPreviewForPath(path, point);
  }

  private renderPreviewForPath(path: NodePath, point: Vec2 | null): void {
    path.preview.clear();
    if (!point || path.closed || !path.nodes.length) {
      return;
    }
    const last = path.nodes[path.nodes.length - 1];
    path.preview.moveTo(last.position.x, last.position.y);
    if (last.handleOut) {
      const direction = { x: point.x - last.position.x, y: point.y - last.position.y };
      const cp2 = { x: point.x - direction.x * 0.25, y: point.y - direction.y * 0.25 };
      path.preview.bezierCurveTo(last.handleOut.x, last.handleOut.y, cp2.x, cp2.y, point.x, point.y);
    } else {
      path.preview.lineTo(point.x, point.y);
    }
    path.preview.stroke({
      color: hexToNumber(path.strokeColor, 0x4a7fb8),
      width: Math.max(1, path.strokeSize),
      alpha: 0.45,
      cap: "round",
      join: "round",
    });
  }

  private clearAllPreviews(): void {
    this.paths.forEach((candidate) => candidate.preview.clear());
  }

  private createHandleGraphic(position: Vec2, radius: number): Graphics {
    const graphic = new Graphics();
    graphic.eventMode = "static";
    graphic.cursor = "crosshair";
    graphic.circle(position.x, position.y, radius * 1.4).fill({ color: 0xffffff, alpha: 0.001 });
    graphic
      .circle(position.x, position.y, radius)
      .fill({ color: HANDLE_FILL_COLOR, alpha: 1 })
      .stroke({ color: HANDLE_STROKE_COLOR, width: radius * 0.35 });
    return graphic;
  }

  private createAnchorGraphic(position: Vec2, radius: number): Graphics {
    const graphic = new Graphics();
    graphic.eventMode = "static";
    graphic.cursor = "pointer";
    graphic.circle(position.x, position.y, radius * 1.6).fill({ color: 0xffffff, alpha: 0.001 });
    graphic
      .circle(position.x, position.y, radius)
      .fill({ color: ANCHOR_FILL_COLOR, alpha: 1 })
      .stroke({ color: ANCHOR_STROKE_COLOR, width: radius * 0.4 });
    return graphic;
  }

  private beginAnchorInteraction(pathId: string, index: number, event: FederatedPointerEvent): void {
    const native = event.nativeEvent as PointerEvent | undefined;
    if (native?.button !== 0) {
      return;
    }
    event.stopPropagation();

    if (native?.shiftKey) {
      this.deleteNode(pathId, index);
      return;
    }

    this.updateHoverPreview(null);

    const path = this.paths.get(pathId);
    const world = this.worldFromFederated(event);
    if (!path || !world) {
      return;
    }

    const node = path.nodes[index];
    const pointerId = native?.pointerId ?? event.pointerId ?? 0;
    this.interaction = {
      type: "drag-anchor",
      pointerId,
      pathId,
      nodeIndex: index,
      anchorOffset: { x: world.x - node.position.x, y: world.y - node.position.y },
      handleInDelta: node.handleIn ? { x: node.handleIn.x - node.position.x, y: node.handleIn.y - node.position.y } : null,
      handleOutDelta: node.handleOut ? { x: node.handleOut.x - node.position.x, y: node.handleOut.y - node.position.y } : null,
      moved: false,
    };
    this.bindPointerEvents();
  }

  private beginHandleInteraction(pathId: string, index: number, handle: "in" | "out", event: FederatedPointerEvent): void {
    const native = event.nativeEvent as PointerEvent | undefined;
    if (native?.button !== 0) {
      return;
    }
    event.stopPropagation();
    this.updateHoverPreview(null);

    const path = this.paths.get(pathId);
    if (!path) {
      return;
    }

    const pointerId = native?.pointerId ?? event.pointerId ?? 0;
    this.interaction = {
      type: "drag-handle",
      pointerId,
      pathId,
      nodeIndex: index,
      handle,
      moved: false,
    };
    this.bindPointerEvents();
  }

  private handleWindowPointerMove = (event: PointerEvent): void => {
    if (!this.interaction || event.pointerId !== this.interaction.pointerId) {
      return;
    }
    const world = this.pointerToWorld(event);
    if (!world) {
      return;
    }
    const path = this.paths.get(this.interaction.pathId);
    if (!path) {
      return;
    }

    switch (this.interaction.type) {
      case "drag-anchor":
        this.applyAnchorDrag(this.interaction, path, world);
        this.interaction.moved = true;
        break;
      case "drag-handle":
        this.applyHandleDrag(this.interaction, path, world, event);
        this.interaction.moved = true;
        break;
      default:
        break;
    }

    event.preventDefault();
    this.renderPath(path);
    if (path.id === this.selectedPathId) {
      this.renderOverlay(path);
    }
  };

  private handleWindowPointerUp = (event: PointerEvent): void => {
    if (!this.interaction || event.pointerId !== this.interaction.pointerId) {
      return;
    }
    if (this.interaction.type === "drag-anchor" && !this.interaction.moved) {
      const path = this.paths.get(this.interaction.pathId);
      if (path && this.interaction.nodeIndex === path.nodes.length - 1) {
        const node = path.nodes[this.interaction.nodeIndex];
        node.handleIn = null;
        node.handleOut = null;
        const prev = path.nodes[this.interaction.nodeIndex - 1];
        if (prev) {
          prev.handleOut = null;
        }
        this.renderPath(path);
        if (path.id === this.selectedPathId) {
          this.renderOverlay(path);
          this.renderPreviewForPath(path, this.hoverPoint);
        }
      }
    }

    this.interaction = null;
    this.unbindPointerEvents();
    this.updateHoverPreview(null);
  };

  private applyAnchorDrag(interaction: Extract<Interaction, { type: "drag-anchor" }>, path: NodePath, world: Vec2): void {
    const node = path.nodes[interaction.nodeIndex];
    if (!node) {
      return;
    }

    const nextPosition = {
      x: world.x - interaction.anchorOffset.x,
      y: world.y - interaction.anchorOffset.y,
    };
    node.position = nextPosition;

    if (interaction.handleInDelta) {
      node.handleIn = {
        x: nextPosition.x + interaction.handleInDelta.x,
        y: nextPosition.y + interaction.handleInDelta.y,
      };
    } else {
      node.handleIn = null;
    }

    if (interaction.handleOutDelta) {
      node.handleOut = {
        x: nextPosition.x + interaction.handleOutDelta.x,
        y: nextPosition.y + interaction.handleOutDelta.y,
      };
    } else {
      node.handleOut = null;
    }
  }

  private applyHandleDrag(
    interaction: Extract<Interaction, { type: "drag-handle" }>,
    path: NodePath,
    world: Vec2,
    event: PointerEvent,
  ): void {
    const node = path.nodes[interaction.nodeIndex];
    if (!node) {
      return;
    }

    const anchor = node.position;
    const vector = { x: world.x - anchor.x, y: world.y - anchor.y };
    const length = Math.hypot(vector.x, vector.y);

    if (length < MIN_HANDLE_LENGTH) {
      if (interaction.handle === "in") {
        node.handleIn = null;
        if (!event.altKey && !event.metaKey) {
          node.handleOut = null;
        }
      } else {
        node.handleOut = null;
        if (!event.altKey && !event.metaKey) {
          node.handleIn = null;
        }
      }
      return;
    }

    const target = { x: anchor.x + vector.x, y: anchor.y + vector.y };
    if (interaction.handle === "in") {
      node.handleIn = target;
      if (!event.altKey && !event.metaKey) {
        node.handleOut = { x: anchor.x - vector.x, y: anchor.y - vector.y };
      }
    } else {
      node.handleOut = target;
      if (!event.altKey && !event.metaKey) {
        node.handleIn = { x: anchor.x - vector.x, y: anchor.y - vector.y };
      }
    }
  }

  private deleteNode(pathId: string, index: number): void {
    const path = this.paths.get(pathId);
    if (!path) {
      return;
    }

    path.nodes.splice(index, 1);
    if (!path.nodes.length) {
      this.removePath(pathId);
      return;
    }

    if (path.nodes.length === 1) {
      const sole = path.nodes[0];
      sole.handleIn = null;
      sole.handleOut = null;
      path.closed = false;
    }

    this.renderPath(path);
    if (path.id === this.selectedPathId) {
      this.renderOverlay(path);
    }
  }

  private removePath(pathId: string): void {
    const path = this.paths.get(pathId);
    if (!path || !this.context) {
      return;
    }
    this.context.canvas.removeObject(pathId);
    path.graphics.destroy();
    path.preview.destroy();
    const handleChildren = path.handlesLayer.removeChildren();
    handleChildren.forEach((child) => child.destroy());
    path.handlesLayer.destroy();
    path.overlay.destroy();
    this.paths.delete(pathId);
    if (this.selectedPathId === pathId) {
      this.selectedPathId = null;
    }
  }

  private clearOverlay(path: NodePath): void {
    path.preview.clear();
    const children = path.handlesLayer.removeChildren();
    children.forEach((child) => child.destroy());
  }

  private bindPointerEvents(): void {
    window.addEventListener("pointermove", this.handleWindowPointerMove, { passive: false });
    window.addEventListener("pointerup", this.handleWindowPointerUp);
    window.addEventListener("pointercancel", this.handleWindowPointerUp);
  }

  private unbindPointerEvents(): void {
    window.removeEventListener("pointermove", this.handleWindowPointerMove);
    window.removeEventListener("pointerup", this.handleWindowPointerUp);
    window.removeEventListener("pointercancel", this.handleWindowPointerUp);
  }

  private pointerToWorld(event: PointerEvent): Vec2 | null {
    if (!this.context?.viewport || !this.canvasElement) {
      return null;
    }
    const rect = this.canvasElement.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const world = this.context.viewport.toWorld(localX, localY);
    return { x: world.x, y: world.y };
  }

  private worldFromFederated(event: FederatedPointerEvent): Vec2 | null {
    if (!this.context?.viewport) {
      return null;
    }
    const world = this.context.viewport.toWorld(event.globalX, event.globalY);
    return { x: world.x, y: world.y };
  }

  private resolveFillColor(value: string): { color: number; alpha: number } {
    if (isTransparent(value)) {
      return { color: 0xffffff, alpha: 0 };
    }
    return { color: hexToNumber(value, 0xa0a0a0), alpha: 0.6 };
  }
}

const distance = (a: PathPoint, b: PathPoint): number => Math.hypot(a.x - b.x, a.y - b.y);

const isTransparent = (value: string): boolean =>
  typeof value !== "string" || !value.trim() || value.trim().toLowerCase() === "transparent";

export const createPenTool = (): CanvasTool => new PenTool();
