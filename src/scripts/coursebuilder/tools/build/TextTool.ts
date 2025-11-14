import { Text } from "pixi.js";
import type { CanvasTool, ToolPointerEvent, ToolRuntimeContext } from "../base/ToolTypes";
import { hexToNumber, normalizeHex } from "../common/color";

const SETTING_SIZE = "fontSize";
const SETTING_FAMILY = "fontFamily";
const SETTING_COLOR = "fontColor";
const SETTING_BOLD = "bold";
const SETTING_ITALIC = "italic";
const SETTING_UNDERLINE = "underline";

const BASE_FONT_SIZE = 12;
const FONT_SCALE = 2;

export class TextTool implements CanvasTool {
  public readonly id = "text";
  public readonly mode = "build" as const;

  private context: ToolRuntimeContext | null = null;
  private editor: HTMLDivElement | null = null;
  private isEditing = false;
  private editPosition: { x: number; y: number } | null = null;

  private fontSize = 8;
  private fontFamily = "Helvetica";
  private fontColor = "#2E2E2E";
  private bold = false;
  private italic = false;
  private underline = false;

  public activate(context: ToolRuntimeContext): void {
    this.context = context;
    this.fontSize = context.getSetting<number>(SETTING_SIZE, this.fontSize);
    this.fontFamily = context.getSetting<string>(SETTING_FAMILY, this.fontFamily);
    this.fontColor = normalizeHex(context.getSetting<string>(SETTING_COLOR, this.fontColor), this.fontColor);
    this.bold = Boolean(context.getSetting<boolean>(SETTING_BOLD, this.bold));
    this.italic = Boolean(context.getSetting<boolean>(SETTING_ITALIC, this.italic));
    this.underline = Boolean(context.getSetting<boolean>(SETTING_UNDERLINE, this.underline));
    this.ensureEditor();
  }

  public deactivate(): void {
    this.commitEditing(false);
    this.removeEditor();
    this.context = null;
  }

  public updateSetting(key: string, value: unknown): void {
    switch (key) {
      case SETTING_SIZE:
        if (typeof value === "number") {
          this.fontSize = Math.max(1, Math.min(16, Math.round(value)));
        }
        break;
      case SETTING_FAMILY:
        if (typeof value === "string") {
          this.fontFamily = value;
        }
        break;
      case SETTING_COLOR:
        if (typeof value === "string") {
          this.fontColor = normalizeHex(value, this.fontColor);
        }
        break;
      case SETTING_BOLD:
        this.bold = Boolean(value);
        break;
      case SETTING_ITALIC:
        this.italic = Boolean(value);
        break;
      case SETTING_UNDERLINE:
        this.underline = Boolean(value);
        break;
      default:
        break;
    }
    this.applyEditorStyle();
  }

  public pointerDown(): void {
    // no-op to prevent other tools
  }

  public pointerUp(event: ToolPointerEvent): void {
    if (!this.context) {
      return;
    }
    if (this.isEditing) {
      return;
    }
    this.editPosition = { x: event.worldX, y: event.worldY };
    this.showEditor();
  }

  private ensureEditor(): void {
    if (this.editor || typeof document === "undefined") {
      return;
    }
    const element = document.createElement("div");
    element.className = "canvas-text-editor";
    element.contentEditable = "true";
    element.style.position = "fixed";
    element.style.minWidth = "48px";
    element.style.minHeight = "24px";
    element.style.background = "rgba(255, 255, 255, 0.95)";
    element.style.border = "1px solid #4A7FB8";
    element.style.borderRadius = "4px";
    element.style.padding = "8px 12px";
    element.style.outline = "none";
    element.style.display = "none";
    element.style.whiteSpace = "pre-wrap";
    element.style.zIndex = "1000";
    element.addEventListener("keydown", this.handleEditorKeyDown);
    element.addEventListener("blur", () => this.commitEditing(true));
    document.body.appendChild(element);
    this.editor = element;
    this.applyEditorStyle();
  }

  private removeEditor(): void {
    if (this.editor && this.editor.parentElement) {
      this.editor.parentElement.removeChild(this.editor);
    }
    this.editor = null;
    this.isEditing = false;
  }

  private showEditor(): void {
    if (!this.editor || !this.context || !this.editPosition) {
      return;
    }
    const canvas = this.context.canvas.getCanvasElement();
    const viewport = this.context.viewport;
    if (!canvas) {
      return;
    }
    const canvasRect = canvas.getBoundingClientRect();
    const screenPoint = viewport.toScreen(this.editPosition.x, this.editPosition.y);

    this.editor.style.display = "block";
    this.editor.textContent = "";
    this.editor.style.left = `${canvasRect.left + screenPoint.x}px`;
    this.editor.style.top = `${canvasRect.top + screenPoint.y}px`;
    this.editor.style.transform = "translate(-50%, -50%)";
    this.applyEditorStyle();
    this.isEditing = true;
    this.editor.focus();
  }

  private commitEditing(apply: boolean): void {
    if (!this.isEditing || !this.editor) {
      return;
    }

    const content = (this.editor.textContent ?? "").trim();
    this.editor.style.display = "none";
    this.isEditing = false;

    if (!apply || !content || !this.context || !this.editPosition) {
      this.editPosition = null;
      return;
    }

    const style = {
      fontFamily: this.fontFamily,
      fontSize: this.resolveFontSize(),
      fill: hexToNumber(this.fontColor, 0x2e2e2e),
      fontWeight: this.bold ? "700" : "400",
      fontStyle: this.italic ? "italic" : "normal",
      textDecoration: this.underline ? "underline" : "none",
      breakWords: true,
      wordWrap: true,
      wordWrapWidth: 480,
    } as const;

    const text = new Text({ text: content, style });
    text.position.set(this.editPosition.x, this.editPosition.y);
    text.anchor.set(0.5, 0.5);
    this.context.canvas.addDisplayObject(text);
    this.editPosition = null;
  }

  private applyEditorStyle(): void {
    if (!this.editor) {
      return;
    }
    this.editor.style.fontFamily = this.fontFamily;
    this.editor.style.color = this.fontColor;
    this.editor.style.fontSize = `${this.resolveFontSize()}px`;
    this.editor.style.fontWeight = this.bold ? "700" : "400";
    this.editor.style.fontStyle = this.italic ? "italic" : "normal";
    this.editor.style.textDecoration = this.underline ? "underline" : "none";
  }

  private resolveFontSize(): number {
    return BASE_FONT_SIZE + this.fontSize * FONT_SCALE;
  }

  private handleEditorKeyDown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.commitEditing(false);
      return;
    }
    if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
      event.preventDefault();
      this.commitEditing(true);
    }
  };
}

export const createTextTool = (): CanvasTool => new TextTool();
