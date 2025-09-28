import { Graphics, Point } from 'pixi.js';

export interface PenPathSettings {
  size: number;
  strokeColor: string;
  fillColor: string;
  strokeType?: string;
}

export interface PenShapeNodeMeta {
  x: number;
  y: number;
  in: { x: number; y: number } | null;
  out: { x: number; y: number } | null;
}

export interface PenShapeMeta {
  kind: 'pen';
  closed: boolean;
  nodes: PenShapeNodeMeta[];
  size: number;
  strokeColor: string;
  fillColor: string | null;
}

export enum VectorPointType {
  Corner = 'corner',
  Smooth = 'smooth',
  Mirrored = 'mirrored',
}

export interface VectorHandleGraphics {
  line: Graphics;
  knob: Graphics;
}

export interface VectorNode {
  position: Point;
  graphics: Graphics;
  pointType: VectorPointType;
  handleIn?: Point | null;
  handleOut?: Point | null;
  handleInGraphics?: VectorHandleGraphics | null;
  handleOutGraphics?: VectorHandleGraphics | null;
  isSelected?: boolean;
}

export interface VectorPath {
  nodes: VectorNode[];
  pathGraphics: Graphics;
  isComplete: boolean;
  settings: PenPathSettings;
}
