/**
 * Simplified Canvas Manager - Canvas lifecycle and state management only
 */

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentTemplate: any = null;
  private isLayoutVisible: boolean = true;

  constructor(canvasId: string = "canvas") {
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error(`Canvas element with id '${canvasId}' not found`);
    }
    this.ctx = this.canvas.getContext("2d")!;
    this.initializeCanvas();
  }

  private initializeCanvas(): void {
    this.canvas.width = 800;
    this.canvas.height = 600;
    window.addEventListener("resize", () => this.resizeCanvas());
  }

  public resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const aspectRatio = 4 / 3;
    let width = rect.width;
    let height = width / aspectRatio;

    if (height > rect.height) {
      height = rect.height;
      width = height * aspectRatio;
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.renderCurrentState();
  }

  public async loadTemplate(template: any): Promise<void> {
    this.currentTemplate = template;
    this.renderCurrentState();
  }

  public renderCurrentState(): void {
    if (!this.isLayoutVisible) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = "#f0f0f0";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  public toggleLayoutVisibility(): void {
    this.isLayoutVisible = !this.isLayoutVisible;
    if (this.isLayoutVisible) {
      this.renderCurrentState();
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  public clearAll(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.currentTemplate = null;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public getCurrentTemplate(): any {
    return this.currentTemplate;
  }

  public isVisible(): boolean {
    return this.isLayoutVisible;
  }

  public getDimensions(): { width: number; height: number } {
    return { width: this.canvas.width, height: this.canvas.height };
  }

  public exportAsDataURL(type: string = "image/png"): string {
    return this.canvas.toDataURL(type);
  }

  public getCanvasState(): any {
    return {
      dimensions: this.getDimensions(),
      isLayoutVisible: this.isLayoutVisible,
      hasTemplate: !!this.currentTemplate,
    };
  }

  public updateCanvas(content: any): void {
    if (content.template) {
      this.loadTemplate(content.template);
    }
    if (content.visibility !== undefined) {
      this.isLayoutVisible = content.visibility;
    }
    this.renderCurrentState();
  }

  public handleCanvasClick(event: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const canvasClickEvent = new CustomEvent("canvasClick", {
      detail: { x, y },
    });
    this.canvas.dispatchEvent(canvasClickEvent);
  }

  public destroy(): void {
    window.removeEventListener("resize", this.resizeCanvas);
    this.clearAll();
  }
}
