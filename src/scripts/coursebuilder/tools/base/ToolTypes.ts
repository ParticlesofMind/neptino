import type { Viewport } from "pixi-viewport";
import type { Container } from "pixi.js";
import type { CanvasEngine } from "../../canvas/CanvasEngine";
import type { SelectionManager } from "../selection/SelectionManager";
import type { TransformHelper } from "../selection/TransformHelper";

export type ToolMode = "build" | "animate";

export interface ToolSettingsSnapshot {
  [key: string]: unknown;
}

export interface ToolRuntimeContext {
  canvas: CanvasEngine;
  viewport: Viewport;
  layers: {
    background: Container;
    drawing: Container;
    ui: Container;
  };
  overlayLayer: Container;
  selection: SelectionManager;
  transformHelper: TransformHelper;
  getSetting<T>(key: string, fallback: T): T;
  setSetting<T>(key: string, value: T): void;
  getAllSettings(): ToolSettingsSnapshot;
}

export interface ToolPointerEvent {
  pointerId: number;
  worldX: number;
  worldY: number;
  screenX: number;
  screenY: number;
  buttons: number;
  pressure: number;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

export interface CanvasTool {
  readonly id: string;
  readonly mode: ToolMode;
  activate(context: ToolRuntimeContext): void;
  deactivate(): void;
  pointerDown?(event: ToolPointerEvent): void;
  pointerMove?(event: ToolPointerEvent): void;
  pointerUp?(event: ToolPointerEvent): void;
  pointerCancel?(event: ToolPointerEvent): void;
  keyDown?(event: KeyboardEvent): void;
  keyUp?(event: KeyboardEvent): void;
  updateSetting?(key: string, value: unknown): void;
  destroy?(): void;
}

export type ToolFactory = () => CanvasTool;
