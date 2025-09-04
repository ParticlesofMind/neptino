import { Container, Point, Graphics, Rectangle } from 'pixi.js';
import { BaseTool } from '../ToolInterface';
import { Transformer } from '@pixi-essentials/transformer/dist/transformer.js';
import { ClickSelection } from './clickSelection';

type SelectionSettings = {
  enableMirroring?: boolean;
  restorePivotOnEnd?: boolean;
  rotationSnapDeg?: number;
  scaleSnapStep?: number;
};

export class TransformerSelectionTool extends BaseTool {
  private transformer: any | null = null;
  private clickSelector = new ClickSelection();
  private selected: any[] = [];
  private container: Container | null = null;
  // Marquee selection
  private marquee: { active: boolean; start: Point; gfx: Graphics | null; shift: boolean } = {
    active: false,
    start: new Point(),
    gfx: null,
    shift: false,
  };
  protected settings: SelectionSettings = {
    rotationSnapDeg: 15,
  };

  constructor() {
    super('selection', 'default');
  }

  onPointerDown(event: any, container: Container): void {
    if (!this.isActive) return;
    this.container = container;

    // Lazy-create transformer and attach to container (must be after content in scenegraph)
    this.ensureTransformer(container);

    const localPoint = container.toLocal(event.global);
    const result = this.clickSelector.handleClick(localPoint, container, event.shiftKey);

    if (result.clickedObject) {
      // Apply selection updates from click
      const action = this.clickSelector.getSelectionAction(result.clickedObject, this.selected, event.shiftKey);
      this.selected = this.clickSelector.applySelectionAction(action, this.selected);
      this.updateTransformerGroup();
    } else {
      // Start marquee selection
      this.startMarquee(localPoint, container, !!event.shiftKey);
    }
  }

  onPointerMove(event: any, container: Container): void {
    if (!this.isActive) return;
    if (this.marquee.active) {
      const localPoint = container.toLocal(event.global);
      this.updateMarquee(localPoint);
    }
  }

  onPointerUp(event: any, container: Container): void {
    if (!this.isActive) return;
    if (this.marquee.active) {
      const localPoint = container.toLocal(event.global);
      this.finishMarquee(localPoint, container);
    }
    // Transformer commits its own transforms for handle drags
  }

  onActivate(): void {
    super.onActivate();
  }

  onDeactivate(): void {
    super.onDeactivate();
    // Remove transformer visuals when switching tools
    if (this.transformer && this.transformer.parent) {
      this.transformer.parent.removeChild(this.transformer);
    }
    this.transformer = null;
    this.selected = [];
    if (this.marquee.gfx && this.marquee.gfx.parent) {
      this.marquee.gfx.parent.removeChild(this.marquee.gfx);
    }
    this.marquee = { active: false, start: new Point(), gfx: null, shift: false };
  }

  updateSettings(settings: Partial<SelectionSettings>): void {
    this.settings = { ...this.settings, ...settings };
    if (this.transformer) {
      if (this.settings.rotationSnapDeg && this.settings.rotationSnapDeg > 0) {
        const step = (this.settings.rotationSnapDeg * Math.PI) / 180;
        const snaps: number[] = [];
        for (let a = 0; a < Math.PI * 2 - 1e-6; a += step) snaps.push(a);
        this.transformer.rotationSnaps = snaps;
      }
      // lock aspect ratio is managed by the Transformer itself via corner handles
    }
  }

  private ensureTransformer(container: Container) {
    if (this.transformer) return;

    // The transformer container must come after the display-objects to capture events
    const transformer = new Transformer({
      stage: this.getRootStage(container),
      group: [],
      rotateEnabled: true,
      scaleEnabled: true,
      skewEnabled: false,
      boxScalingEnabled: true,
      boxRotationEnabled: false,
      lockAspectRatio: false,
      boundingBoxes: 'all',
      wireframeStyle: { color: 0x007acc, thickness: 2 },
      handleStyle: { color: 0xffffff, outlineColor: 0x007acc, outlineThickness: 1, radius: 8 },
    });
    transformer.name = 'transformer-root';
    transformer.eventMode = 'static';
    transformer.interactiveChildren = true;

    // Snap settings
    if (this.settings.rotationSnapDeg && this.settings.rotationSnapDeg > 0) {
      const step = (this.settings.rotationSnapDeg * Math.PI) / 180;
      const snaps: number[] = [];
      for (let a = 0; a < Math.PI * 2 - 1e-6; a += step) snaps.push(a);
      transformer.rotationSnaps = snaps;
    }

    container.addChild(transformer);
    this.transformer = transformer;

    // Stage interactivity checks (best-effort): ensure stage is interactive and has a hitArea
    const stage = this.getRootStage(container);
    try {
      (stage as any).eventMode = (stage as any).eventMode || 'static';
      (stage as any).interactiveChildren = true;
      if (!(stage as any).hitArea) {
        // Fallback: use renderer screen if available; otherwise approximate with container bounds
        const rendererAny = (stage as any).renderer || (container as any).renderer;
        if (rendererAny?.screen) {
          (stage as any).hitArea = rendererAny.screen;
        } else {
          const b = container.getBounds();
          (stage as any).hitArea = new Rectangle(b.x, b.y, b.width, b.height);
        }
      }
      // Debug
      console.log('[TransformerSelectionTool] stage check', {
        eventMode: (stage as any).eventMode,
        hasHitArea: !!(stage as any).hitArea,
      });
    } catch {}
  }

  private getRootStage(container: Container): Container {
    let root: any = container as any;
    while (root && root.parent) root = root.parent;
    return root as Container;
  }

  private updateTransformerGroup() {
    if (!this.transformer || !this.container) return;
    this.transformer.group = [...this.selected];
    // Show or hide transformer based on selection
    this.transformer.visible = this.selected.length > 0;
    // Force immediate bounds recompute for visual sync
    this.transformer.getGroupBounds(true);
  }

  // --- Marquee selection helpers ---
  private startMarquee(point: Point, container: Container, shift: boolean) {
    this.marquee.active = true;
    this.marquee.start.copyFrom(point);
    this.marquee.shift = shift;
    if (!this.marquee.gfx) {
      this.marquee.gfx = new Graphics();
      this.marquee.gfx.name = 'selection-marquee';
      this.marquee.gfx.zIndex = 10000;
    } else {
      this.marquee.gfx.clear();
    }
    this.drawMarqueeRect(point, point);
    container.addChild(this.marquee.gfx);
  }

  private updateMarquee(point: Point) {
    if (!this.marquee.active || !this.marquee.gfx) return;
    this.drawMarqueeRect(this.marquee.start, point);
  }

  private finishMarquee(point: Point, container: Container) {
    if (!this.marquee.active) return;
    const rect = this.getRectFromPoints(this.marquee.start, point);

    // Gather objects intersecting marquee
    const picked: any[] = [];
    const children = container.children.slice();
    for (const child of children) {
      if (!this.clickSelector.isSelectableObject(child)) continue;
      try {
        const b = child.getBounds();
        if (this.rectsIntersect(rect, b)) picked.push(child);
      } catch {}
    }

    if (this.marquee.shift) {
      // Add to selection (dedupe)
      const set = new Set<any>(this.selected);
      picked.forEach(o => set.add(o));
      this.selected = Array.from(set);
    } else {
      this.selected = picked;
    }

    // Clean up graphics
    if (this.marquee.gfx && this.marquee.gfx.parent) this.marquee.gfx.parent.removeChild(this.marquee.gfx);
    this.marquee.active = false;

    this.updateTransformerGroup();
  }

  private drawMarqueeRect(a: Point, b: Point) {
    if (!this.marquee.gfx) return;
    const r = this.getRectFromPoints(a, b);
    this.marquee.gfx.clear();
    this.marquee.gfx.rect(r.x, r.y, r.width, r.height);
    this.marquee.gfx.stroke({ width: 1, color: 0x3b82f6, alpha: 0.9 });
    this.marquee.gfx.fill({ color: 0x3b82f6, alpha: 0.12 });
  }

  private getRectFromPoints(a: Point, b: Point) {
    const x = Math.min(a.x, b.x);
    const y = Math.min(a.y, b.y);
    const w = Math.abs(a.x - b.x);
    const h = Math.abs(a.y - b.y);
    return { x, y, width: w, height: h } as any;
  }

  private rectsIntersect(a: any, b: any): boolean {
    return !(a.x > b.x + b.width || a.x + a.width < b.x || a.y > b.y + b.height || a.y + a.height < b.y);
  }
}
