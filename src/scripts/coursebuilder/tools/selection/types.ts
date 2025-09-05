/**
 * Shared types and interfaces for selection tools
 */

import { Graphics, Point, Rectangle } from "pixi.js";

export interface SelectionSettings {
  // Selection tool configuration
  enableMirroring?: boolean;            // allow negative scale (mirror) when crossing anchor
  restorePivotOnEnd?: boolean;          // restore original pivot after transform
  rotationSnapDeg?: number;             // rotation snap increment in degrees (used with Shift)
  scaleSnapStep?: number;               // scale snap step (e.g., 0.05) used with Ctrl/Cmd
}

export interface TransformHandle {
  type: "corner" | "edge" | "rotation";
  position: "tl" | "tr" | "bl" | "br" | "t" | "r" | "b" | "l" | "rotate";
  graphics?: Graphics;   // optional for synthetic rotation hotspots
  bounds?: Rectangle;    // optional for synthetic rotation hotspots
  // Optional metadata for rotated frames and precise anchor math
  index?: number; // 0..3 for corners or edges (order: tl,tr,br,bl for corners; t,r,b,l for edges)
  center?: Point; // handle center in parent container local coordinates
}

export interface SelectionGroup {
 objects: any[];
 bounds: Rectangle;
 transformHandles: TransformHandle[];
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
