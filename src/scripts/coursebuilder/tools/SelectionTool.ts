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

  constructor() {
    super("selection", "default");
    this.settings = {};
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

    const dx = currentPoint.x - this.transformStart.x;
    const dy = currentPoint.y - this.transformStart.y;

    // Simple scaling for now (can be enhanced with more complex transforms)
    if (this.activeHandle.type === "corner") {
      this.scaleSelection(dx, dy, this.activeHandle.position);
    }

    this.transformStart.copyFrom(currentPoint);
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

  private scaleSelection(dx: number, dy: number, _corner: string): void {
    // Simplified scaling - can be enhanced
    const scaleFactor = 1 + Math.max(dx, dy) / 100;

    this.selectedObjects.forEach((obj) => {
      if (obj.scale) {
        obj.scale.x *= scaleFactor;
        obj.scale.y *= scaleFactor;
      }
    });

    this.createSelectionGroup();
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

  onDeactivate(): void {
    super.onDeactivate();
    this.clearSelection();

    // Remove marquee if active
    if (this.marqueeGraphics && this.marqueeGraphics.parent) {
      this.marqueeGraphics.parent.removeChild(this.marqueeGraphics);
      this.marqueeGraphics = null;
    }

    this.isSelecting = false;
    this.isTransforming = false;
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
