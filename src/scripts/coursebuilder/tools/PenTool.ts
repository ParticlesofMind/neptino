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

interface PenSettings {
  color: string;
  size: number;
}

interface VectorNode {
  position: Point;
  graphics: Graphics;
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

  constructor() {
    super("pen", "crosshair");
    this.settings = {
      color: PROFESSIONAL_COLORS[0], // Start with dark charcoal
      size: STROKE_SIZES.PEN[2], // Start with 3px
    };
  }

  onPointerDown(event: FederatedPointerEvent, container: Container): void {
    console.log(
      `✏️ PEN: Node placement at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
    );
    console.log(
      `✏️ PEN: Settings - Color: ${this.settings.color}, Size: ${this.settings.size}`,
    );

    const localPoint = container.toLocal(event.global);
    this.lastMousePosition.copyFrom(localPoint);

    // Check if we're continuing an existing path or starting a new one
    if (this.currentPath && this.currentPath.nodes.length > 0) {
      // Check if clicking near the first node to close the path
      const firstNode = this.currentPath.nodes[0];
      const distance = Math.sqrt(
        Math.pow(localPoint.x - firstNode.position.x, 2) +
          Math.pow(localPoint.y - firstNode.position.y, 2),
      );

      if (distance <= PEN_CONSTANTS.PATH_CLOSE_TOLERANCE) {
        this.completePath(true);
        return;
      }
    }

    // Add new node to current path or start new path
    this.addNodeToPath(localPoint, container);
  }

  onPointerMove(event: FederatedPointerEvent, container: Container): void {
    const localPoint = container.toLocal(event.global);
    this.lastMousePosition.copyFrom(localPoint);

    // Update preview line if we have an active path
    this.updatePreviewLine(container);
  }

  onPointerUp(_event: FederatedPointerEvent, _container: Container): void {
    // For node-based drawing, we don't need to handle pointer up
    // Nodes are placed on pointer down, path completion happens on double-click or escape
  }

  private addNodeToPath(position: Point, container: Container): void {
    if (!this.currentPath) {
      // Start new path
      this.currentPath = {
        nodes: [],
        pathGraphics: new Graphics(),
        isComplete: false,
        settings: { ...this.settings },
      };

      this.currentPath.pathGraphics.eventMode = "static";
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
    };

    this.currentPath.nodes.push(node);
    console.log(
      `✏️ PEN: Added node ${this.currentPath.nodes.length} at (${Math.round(position.x)}, ${Math.round(position.y)})`,
    );

    // Update path graphics
    this.updatePathGraphics();

    // Update preview line
    this.updatePreviewLine(container);
  }

  private updatePathGraphics(): void {
    if (!this.currentPath || this.currentPath.nodes.length === 0) return;

    const path = this.currentPath.pathGraphics;
    const color = hexToNumber(this.currentPath.settings.color);

    path.clear();

    if (this.currentPath.nodes.length === 1) {
      // Single node - just show the node
      return;
    }

    // Draw lines between nodes
    const firstNode = this.currentPath.nodes[0];
    path.moveTo(firstNode.position.x, firstNode.position.y);

    for (let i = 1; i < this.currentPath.nodes.length; i++) {
      const node = this.currentPath.nodes[i];
      path.lineTo(node.position.x, node.position.y);
    }

    path.stroke({
      width: this.currentPath.settings.size,
      color: color,
      cap: "round",
      join: "round",
    });

    console.log(
      `✏️ PEN: Updated path graphics with ${this.currentPath.nodes.length} nodes`,
    );
  }

  private updatePreviewLine(container: Container): void {
    if (!this.currentPath || this.currentPath.nodes.length === 0) {
      this.removePreviewLine();
      return;
    }

    if (!this.previewLine) {
      this.previewLine = new Graphics();
      this.previewLine.alpha = PEN_CONSTANTS.PREVIEW_LINE_ALPHA;
      container.addChild(this.previewLine);
    }

    const lastNode = this.currentPath.nodes[this.currentPath.nodes.length - 1];
    const color = hexToNumber(this.currentPath.settings.color);

    this.previewLine.clear();
    this.previewLine.moveTo(lastNode.position.x, lastNode.position.y);
    this.previewLine.lineTo(this.lastMousePosition.x, this.lastMousePosition.y);
    this.previewLine.stroke({
      width: this.currentPath.settings.size,
      color: color,
      cap: "round",
    });
  }

  private removePreviewLine(): void {
    if (this.previewLine && this.previewLine.parent) {
      this.previewLine.parent.removeChild(this.previewLine);
      this.previewLine = null;
    }
  }

  private completePath(closeShape: boolean = false): void {
    if (!this.currentPath) return;

    if (closeShape && this.currentPath.nodes.length >= 3) {
      // Close the shape by connecting last node to first
      const firstNode = this.currentPath.nodes[0];
      const path = this.currentPath.pathGraphics;

      path.lineTo(firstNode.position.x, firstNode.position.y);
      path.stroke({
        width: this.currentPath.settings.size,
        color: hexToNumber(this.currentPath.settings.color),
        cap: "round",
        join: "round",
      });

      console.log(
        `✏️ PEN: Closed shape with ${this.currentPath.nodes.length} nodes`,
      );
    }

    // Remove individual node graphics since the path is complete
    this.currentPath.nodes.forEach((node) => {
      if (node.graphics.parent) {
        node.graphics.parent.removeChild(node.graphics);
      }
    });

    // Mark path as complete
    this.currentPath.isComplete = true;

    // Clean up
    this.removePreviewLine();
    this.currentPath = null;

  }

  // Handle keyboard events for path completion
  public onKeyDown(event: KeyboardEvent): void {
    if (!this.currentPath) return;

    switch (event.key) {
      case "Enter":
        // Complete current path without closing
        this.completePath(false);
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
    });

    // Remove path graphics
    if (this.currentPath.pathGraphics.parent) {
      this.currentPath.pathGraphics.parent.removeChild(
        this.currentPath.pathGraphics,
      );
    }

    // Remove preview line
    this.removePreviewLine();

    this.currentPath = null;
  }

  onActivate(): void {
    super.onActivate();

    // Set up keyboard listeners
    document.addEventListener("keydown", this.handleKeyDown);
  }

  onDeactivate(): void {
    super.onDeactivate();

    // Complete any active path
    if (this.currentPath) {
      this.removePreviewLine();
      this.currentPath = null;
    }

    // Remove keyboard listeners
    document.removeEventListener("keydown", this.handleKeyDown);

    // Clean up preview line
    this.removePreviewLine();
  }

  private handleKeyDown = (): void => {
    // This would need to be handled by the tool manager to get container reference
  };

  updateSettings(settings: PenSettings): void {
    this.settings = { ...this.settings, ...settings };

    // Update current path settings if drawing
    if (this.currentPath) {
      this.currentPath.settings = { ...this.settings };
      this.updatePathGraphics();
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
