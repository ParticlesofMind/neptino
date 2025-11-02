import { Graphics, type Container, type DisplayObject } from "pixi.js";

export interface SelectionTarget {
  id: string;
  object: DisplayObject;
}

export class SelectionManager {
  private selected: SelectionTarget[] = [];
  private readonly highlight: Graphics;

  constructor(private readonly overlayLayer: Container) {
    this.highlight = new Graphics();
    this.highlight.eventMode = "none";
    overlayLayer.addChild(this.highlight);
  }

  public setSelection(targets: SelectionTarget[]): void {
    this.selected = targets;
    this.render();
  }

  public clear(): void {
    this.selected = [];
    this.render();
  }

  public getSelection(): SelectionTarget[] {
    return [...this.selected];
  }

  private render(): void {
    this.highlight.clear();
    if (!this.selected.length) {
      return;
    }

    this.selected.forEach(({ object }) => {
      const bounds = object.getBounds(true);
      this.highlight.rect(bounds.x, bounds.y, bounds.width, bounds.height).stroke({
        color: 0xb3d7ff,
        width: 1.2,
        alignment: 0.5,
        alpha: 0.85,
      });
    });
  }
}
