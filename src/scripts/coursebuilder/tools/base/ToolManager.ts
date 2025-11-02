import { Container } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import type { CanvasEngine } from "../../CanvasEngine";
import { SelectionManager } from "../selection/SelectionManager";
import { TransformHelper } from "../selection/TransformHelper";
import { ToolSettingsStore } from "./ToolSettingsStore";
import type { CanvasTool, ToolFactory, ToolMode, ToolPointerEvent, ToolRuntimeContext } from "./ToolTypes";

const MODE_CHANGED_EVENT = "engine:mode-change";
const TOOL_CHANGED_EVENT = "engine:tool-change";
const TOOL_SETTING_EVENT = "engine:tool-setting";

interface ModeChangeDetail {
  mode: ToolMode;
}

interface ToolChangeDetail {
  mode: ToolMode;
  toolId: string;
}

interface ToolSettingDetail {
  toolId: string;
  setting: string;
  value: unknown;
  mode?: ToolMode;
}

export class ToolManager {
  private readonly toolFactories = new Map<string, ToolFactory>();
  private readonly toolInstances = new Map<string, CanvasTool>();
  private readonly toolSettings = new Map<string, ToolSettingsStore>();
  private activeTool: CanvasTool | null = null;
  private currentMode: ToolMode = "build";
  private overlayLayer: Container | null = null;
  private viewport: Viewport | null = null;
  private selectionManager: SelectionManager | null = null;
  private transformHelper: TransformHelper | null = null;
  private pointerBindingsActive = false;

  constructor(private readonly canvas: CanvasEngine) {
    this.bootstrap();
    if (typeof window !== "undefined") {
      window.addEventListener(MODE_CHANGED_EVENT, this.handleModeChange as EventListener);
      window.addEventListener(TOOL_CHANGED_EVENT, this.handleToolChange as EventListener);
      window.addEventListener(TOOL_SETTING_EVENT, this.handleToolSetting as EventListener);
      window.addEventListener("keydown", this.handleKeyDown as EventListener);
      window.addEventListener("keyup", this.handleKeyUp as EventListener);
    }
  }

  public registerTool(factory: ToolFactory): void {
    const instance = factory();
    const key = this.getToolKey(instance.mode, instance.id);
    this.toolFactories.set(key, factory);
    this.toolInstances.set(key, instance);
  }

  public destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener(MODE_CHANGED_EVENT, this.handleModeChange as EventListener);
      window.removeEventListener(TOOL_CHANGED_EVENT, this.handleToolChange as EventListener);
      window.removeEventListener(TOOL_SETTING_EVENT, this.handleToolSetting as EventListener);
      window.removeEventListener("keydown", this.handleKeyDown as EventListener);
      window.removeEventListener("keyup", this.handleKeyUp as EventListener);
    }
    this.detachPointerEvents();
    this.toolInstances.forEach((tool) => {
      try {
        tool.destroy?.();
      } catch (error) {
        console.warn(`Tool ${tool.id} destroy error`, error);
      }
    });
    this.toolInstances.clear();
    this.toolFactories.clear();
    this.toolSettings.clear();
    this.selectionManager?.clear();
    this.transformHelper?.destroy();
  }

  private bootstrap(): void {
    this.canvas.onReady(() => {
      const layers = this.canvas.getLayers();
      const viewport = this.canvas.getViewport();
      if (!layers || !viewport) {
        return;
      }
      this.viewport = viewport;
      this.ensureOverlayLayer(layers.ui);
      this.ensurePointerBindings(viewport);
    });
  }

  private ensureOverlayLayer(uiLayer: Container): void {
    if (this.overlayLayer) {
      return;
    }
    const overlay = new Container();
    overlay.label = "tool-overlay";
    overlay.eventMode = "passive";
    uiLayer.addChild(overlay);
    this.overlayLayer = overlay;
    this.selectionManager = new SelectionManager(overlay);
    this.transformHelper = new TransformHelper(overlay, this.canvas);
  }

  private ensurePointerBindings(viewport: Viewport): void {
    if (this.pointerBindingsActive) {
      return;
    }
    viewport.on("pointerdown", this.handlePointerDown);
    viewport.on("pointermove", this.handlePointerMove);
    viewport.on("pointerup", this.handlePointerUp);
    viewport.on("pointerupoutside", this.handlePointerCancel);
    viewport.on("pointercancel", this.handlePointerCancel);
    this.pointerBindingsActive = true;
  }

  private detachPointerEvents(): void {
    if (!this.pointerBindingsActive || !this.viewport) {
      return;
    }
    this.viewport.off("pointerdown", this.handlePointerDown);
    this.viewport.off("pointermove", this.handlePointerMove);
    this.viewport.off("pointerup", this.handlePointerUp);
    this.viewport.off("pointerupoutside", this.handlePointerCancel);
    this.viewport.off("pointercancel", this.handlePointerCancel);
    this.pointerBindingsActive = false;
  }

  private handleModeChange = (event: Event): void => {
    const { mode } = (event as CustomEvent<ModeChangeDetail>).detail;
    if (!mode || mode === this.currentMode) {
      return;
    }
    this.currentMode = mode;
    if (this.activeTool?.mode !== mode) {
      this.deactivateActiveTool();
    }
  };

  private handleToolChange = (event: Event): void => {
    const { toolId, mode } = (event as CustomEvent<ToolChangeDetail>).detail;
    if (!toolId) {
      return;
    }
    const targetMode = mode ?? this.currentMode;
    const tool = this.getToolInstance(toolId, targetMode);
    if (!tool) {
      console.warn(`ToolManager: unknown tool "${toolId}"`);
      return;
    }
    if (mode && tool.mode !== mode) {
      console.warn(`ToolManager: tool "${toolId}" does not belong to mode "${mode}"`);
      return;
    }
    if (this.activeTool?.id === toolId && this.activeTool.mode === targetMode) {
      return;
    }
    this.activateTool(tool);
  };

  private handleToolSetting = (event: Event): void => {
    const { toolId, setting, value, mode } = (event as CustomEvent<ToolSettingDetail>).detail;
    if (!toolId || !setting) {
      return;
    }
    const targetMode = mode ?? (this.activeTool?.mode ?? this.currentMode);
    const store = this.getSettingsStore(targetMode, toolId);
    store.set(setting, value);
    if (this.activeTool?.id === toolId && this.activeTool.mode === targetMode) {
      this.activeTool.updateSetting?.(setting, value);
    }
  };

  private activateTool(tool: CanvasTool): void {
    const layers = this.canvas.getLayers();
    if (!layers || !this.overlayLayer || !this.selectionManager || !this.transformHelper || !this.viewport) {
      return;
    }
    this.deactivateActiveTool();
    const store = this.getSettingsStore(tool.mode, tool.id);
    const context: ToolRuntimeContext = {
      canvas: this.canvas,
      viewport: this.viewport,
      layers,
      overlayLayer: this.overlayLayer,
      selection: this.selectionManager,
      transformHelper: this.transformHelper,
      getSetting: (key, fallback) => store.get(key, fallback),
      setSetting: (key, value) => store.set(key, value),
      getAllSettings: () => store.getSnapshot(),
    };
    try {
      tool.activate(context);
      this.activeTool = tool;
    } catch (error) {
      console.error(`Failed to activate tool "${tool.id}"`, error);
    }
  }

  private deactivateActiveTool(): void {
    if (!this.activeTool) {
      return;
    }
    try {
      this.activeTool.deactivate();
    } catch (error) {
      console.warn(`Tool "${this.activeTool.id}" deactivate error`, error);
    }
    this.selectionManager?.clear();
    this.transformHelper?.detach();
    this.activeTool = null;
  }

  private getToolInstance(toolId: string, mode: ToolMode): CanvasTool | null {
    const key = this.getToolKey(mode, toolId);
    if (this.toolInstances.has(key)) {
      return this.toolInstances.get(key)!;
    }
    const factory = this.toolFactories.get(key);
    if (!factory) {
      return null;
    }
    const tool = factory();
    this.toolInstances.set(key, tool);
    return tool;
  }

  private getSettingsStore(mode: ToolMode, toolId: string): ToolSettingsStore {
    const key = this.getToolKey(mode, toolId);
    if (!this.toolSettings.has(key)) {
      this.toolSettings.set(key, new ToolSettingsStore());
    }
    return this.toolSettings.get(key)!;
  }

  private handlePointerDown = (event: FederatedPointerEvent): void => {
    if (!this.activeTool) {
      return;
    }
    this.activeTool.pointerDown?.(this.toToolPointerEvent(event));
  };

  private handlePointerMove = (event: FederatedPointerEvent): void => {
    if (!this.activeTool) {
      return;
    }
    this.activeTool.pointerMove?.(this.toToolPointerEvent(event));
  };

  private handlePointerUp = (event: FederatedPointerEvent): void => {
    if (!this.activeTool) {
      return;
    }
    this.activeTool.pointerUp?.(this.toToolPointerEvent(event));
  };

  private handlePointerCancel = (event: FederatedPointerEvent): void => {
    if (!this.activeTool) {
      return;
    }
    this.activeTool.pointerCancel?.(this.toToolPointerEvent(event));
  };

  private handleKeyDown = (event: KeyboardEvent): void => {
    this.activeTool?.keyDown?.(event);
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    this.activeTool?.keyUp?.(event);
  };

  private getToolKey(mode: ToolMode, toolId: string): string {
    return `${mode}:${toolId}`;
  }

  private toToolPointerEvent(event: FederatedPointerEvent): ToolPointerEvent {
    const world = this.viewport ? this.viewport.toWorld(event.globalX, event.globalY) : { x: event.globalX, y: event.globalY };
    return {
      pointerId: event.pointerId ?? 0,
      worldX: world.x,
      worldY: world.y,
      screenX: event.globalX,
      screenY: event.globalY,
      buttons: event.buttons ?? 0,
      pressure: event.pressure ?? 0,
      shiftKey: event.shiftKey ?? false,
      altKey: event.altKey ?? false,
      ctrlKey: event.ctrlKey ?? false,
      metaKey: event.metaKey ?? false,
    };
  }
}
