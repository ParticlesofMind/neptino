/**
 * Tool Interface and Base Classes
 * Defines the structure for all drawing tools
 */

import { FederatedPointerEvent, Container } from "pixi.js";
import { DisplayObjectManager } from "../canvas/DisplayObjectManager";

export interface ToolSettings {
  pen: {
    color: string;
    size: number;
  };
  text: {
    fontFamily: string;
    fontSize: number;
    color: string;
  };
  highlighter: {
    color: string;
    opacity: number;
    size: number;
  };
  shapes: {
    color: string;
    strokeWidth: number;
    fillColor?: string;
    shapeType: "rectangle" | "triangle" | "circle";
  };
  eraser: {
    size: number;
  };
}

export interface Tool {
  name: string;
  cursor: string;

  onPointerDown(event: FederatedPointerEvent, container: Container): void;
  onPointerMove(event: FederatedPointerEvent, container: Container): void;
  onPointerUp(event: FederatedPointerEvent, container: Container): void;
  onActivate(): void;
  onDeactivate(): void;
  updateSettings(settings: any): void;
  setDisplayObjectManager(manager: DisplayObjectManager): void;
}

export abstract class BaseTool implements Tool {
  public name: string;
  public cursor: string;
  protected isActive: boolean = false;
  protected settings: any;
  protected displayManager: DisplayObjectManager | null = null;

  constructor(name: string, cursor: string = "default") {
    this.name = name;
    this.cursor = cursor;
  }

  abstract onPointerDown(
    event: FederatedPointerEvent,
    container: Container,
  ): void;
  abstract onPointerMove(
    event: FederatedPointerEvent,
    container: Container,
  ): void;
  abstract onPointerUp(
    event: FederatedPointerEvent,
    container: Container,
  ): void;

  onActivate(): void {
    this.isActive = true;
  }

  onDeactivate(): void {
    this.isActive = false;
  }

  updateSettings(settings: any): void {
    this.settings = { ...this.settings, ...settings };
  }

  setDisplayObjectManager(manager: DisplayObjectManager): void {
    this.displayManager = manager;
  }

  protected hexToNumber(hex: string): number {
    return parseInt(hex.replace("#", ""), 16);
  }
}
