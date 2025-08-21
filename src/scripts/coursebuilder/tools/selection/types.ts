/**
 * Shared types and interfaces for selection tools
 */

import { Graphics, Point, Rectangle } from "pixi.js";

export interface SelectionSettings {
 // Selection settings can be expanded as needed
}

export interface TransformHandle {
 type: "corner" | "edge" | "rotation";
 position: "tl" | "tr" | "bl" | "br" | "t" | "r" | "b" | "l" | "rotate";
 graphics: Graphics;
 bounds: Rectangle;
}

export interface SelectionGroup {
 objects: any[];
 bounds: Rectangle;
 transformHandles: TransformHandle[];
 rotationHandle: TransformHandle | null;
 selectionBox: Graphics;
}

export interface SelectionState {
 selectedObjects: any[];
 selectionGroup: SelectionGroup | null;
 isTransforming: boolean;
 activeHandle: TransformHandle | null;
 transformStart: Point;
 selectionCenter: Point;
}
