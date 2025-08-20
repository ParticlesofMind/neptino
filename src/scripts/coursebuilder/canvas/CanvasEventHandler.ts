/**
 * Canvas Event Handler
 * Manages PIXI canvas events and interactions
 * Single Responsibility: Event handling only
 */

import { Application, FederatedPointerEvent } from "pixi.js";
import { ToolManager } from "../tools/ToolManager";
import { DisplayObjectManager } from "./DisplayObjectManager";

export class CanvasEventHandler {
 private app: Application;
 private toolManager: ToolManager;
 private displayManager: DisplayObjectManager | null = null;

 constructor(app: Application, toolManager: ToolManager) {
 this.app = app;
 this.toolManager = toolManager;
 }

 /**
 * Provide display object manager for tool interactions
 */
 public setDisplayManager(manager: DisplayObjectManager): void {
 this.displayManager = manager;
 }

 /**
 * Set up all canvas events
 */
 public setupEvents(): void {
 // Make the stage interactive
 this.app.stage.eventMode = "static";
 this.app.stage.hitArea = this.app.screen;

 // Add pointer events
 this.setupPointerEvents();

 }

 /**
 * Set up pointer events for tool interactions
 */
 private setupPointerEvents(): void {
 // Pointer down event
 this.app.stage.on("pointerdown", (event: FederatedPointerEvent) => {
 this.handlePointerDown(event);
 });

 // Pointer move event
 this.app.stage.on("pointermove", (event: FederatedPointerEvent) => {
 this.handlePointerMove(event);
 });

 // Pointer up event
 this.app.stage.on("pointerup", (event: FederatedPointerEvent) => {
 this.handlePointerUp(event);
 });

 }

 /**
 * Handle pointer down events
 */
 private handlePointerDown(event: FederatedPointerEvent): void {
 const activeTool = this.toolManager.getActiveTool();
 const container = this.displayManager?.getRoot();
 if (activeTool && container) {
 try {
 activeTool.onPointerDown(event, container);
 } catch (error) {
 console.error("❌ Error in tool pointer down:", error);
 }
 }
 }

 /**
 * Handle pointer move events
 */
 private handlePointerMove(event: FederatedPointerEvent): void {
 const activeTool = this.toolManager.getActiveTool();
 const container = this.displayManager?.getRoot();
 if (activeTool && container) {
 try {
 activeTool.onPointerMove(event, container);
 } catch (error) {
 console.error("❌ Error in tool pointer move:", error);
 }
 }
 }

 /**
 * Handle pointer up events
 */
 private handlePointerUp(event: FederatedPointerEvent): void {
 const activeTool = this.toolManager.getActiveTool();
 const container = this.displayManager?.getRoot();
 if (activeTool && container) {
 try {
 activeTool.onPointerUp(event, container);
 } catch (error) {
 console.error("❌ Error in tool pointer up:", error);
 }
 }
 }

 /**
 * Update canvas cursor based on current tool
 */
 public updateCanvasCursor(toolName: string): void {
 const canvas = this.app.canvas;
 if (!canvas) return;

 // Remove all cursor classes
 canvas

 // Add cursor class for current tool
 switch (toolName) {
 case "pen":
 canvas
 break;
 case "eraser":
 canvas
 break;
 case "text":
 canvas
 break;
 case "brush":
 canvas
 break;
 default:
 canvas
 }

 }

 /**
 * Enable/disable events
 */
 public setEventsEnabled(enabled: boolean): void {
 this.app.stage.eventMode = enabled ? "static" : "none";
 }

 /**
 * Get event information
 */
 public getEventInfo(): any {
 return {
 stageInteractive: this.app.stage.eventMode === "static",
 hasHitArea: !!this.app.stage.hitArea,
 eventMode: this.app.stage.eventMode,
 };
 }

 /**
 * Destroy event handler
 */
 public destroy(): void {
 // Remove all event listeners
 this.app.stage.off("pointerdown");
 this.app.stage.off("pointermove");
 this.app.stage.off("pointerup");

 // Disable events
 this.app.stage.eventMode = "none";

 }
}
