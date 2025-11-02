import type { DisplayObject } from "pixi.js";
import type { CanvasTool, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";
import type { SelectionTarget } from "../selection/SelectionManager";
import { timelineStore } from "./TimelineStore";

const SETTING_TIME = "time";
const SETTING_KEYFRAME = "keyframe";

export class ModifyTool implements CanvasTool {
  public readonly id = "modify";
  public readonly mode = "animate" as const;

  private context: ToolRuntimeContext | null = null;
  private currentTime = 0;
  private selected: SelectionTarget | null = null;
  private lastKeyframeToken = 0;

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.currentTime = context.getSetting<number>(SETTING_TIME, this.currentTime);
  }

  public deactivate(): void {
    this.context?.selection.clear();
    this.context?.transformHelper.detach();
    this.context = null;
    this.selected = null;
  }

  public updateSetting(key: string, value: unknown): void {
    if (key === SETTING_TIME && typeof value === "number") {
      this.currentTime = value;
    }
    if (key === SETTING_KEYFRAME) {
      const token = typeof value === "number" ? value : this.lastKeyframeToken + 1;
      if (token !== this.lastKeyframeToken) {
        this.lastKeyframeToken = token;
        this.captureKeyframe();
      }
    }
  }

  public pointerDown(_: ToolPointerEvent): void {}

  public pointerMove(_: ToolPointerEvent): void {}

  public pointerUp(event: ToolPointerEvent): void {
    this.selectAt(event.worldX, event.worldY);
  }

  public pointerCancel(): void {}

  private selectAt(x: number, y: number): void {
    if (!this.context) {
      return;
    }
    const objects = this.context.canvas.getObjectsSnapshot();
    for (let i = objects.length - 1; i >= 0; i -= 1) {
      const { id, displayObject } = objects[i];
      const bounds = displayObject.getBounds(true);
      if (x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height) {
        this.selected = { id, object: displayObject };
        this.context.selection.setSelection([{ id, object: displayObject }]);
        this.context.transformHelper.attach(displayObject);
        return;
      }
    }
    this.selected = null;
    this.context.selection.clear();
    this.context.transformHelper.detach();
  }

  private captureKeyframe(): void {
    if (!this.context || !this.selected) {
      return;
    }
    const object = this.selected.object;
    const parent = object.parent;
    if (!parent) {
      return;
    }

    const position = this.resolvePosition(object);
    timelineStore.addKeyframe(this.selected.id, {
      time: this.currentTime,
      position,
      rotation: object.rotation ?? 0,
      scale: {
        x: object.scale?.x ?? 1,
        y: object.scale?.y ?? 1,
      },
    });
  }

  private resolvePosition(object: DisplayObject): { x: number; y: number } {
    if (object.parent) {
      const global = object.parent.toGlobal(object.position);
      return { x: global.x, y: global.y };
    }
    return { x: object.position.x ?? 0, y: object.position.y ?? 0 };
  }
}

export const createModifyTool = (): CanvasTool => new ModifyTool();
