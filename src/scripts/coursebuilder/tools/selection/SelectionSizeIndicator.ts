import { Container, Graphics, Point, Text } from 'pixi.js';
import { SelectionFrame } from './types';

export class SelectionSizeIndicator {
  private uiContainer: Container | null = null;
  private indicator: { container: Container; bg: Graphics; text: Text } | null = null;

  public setUILayer(container: Container) { this.uiContainer = container; }

  public update(frame: SelectionFrame, fallbackContainer: Container): void {
    const ui = this.uiContainer || fallbackContainer;
    const width = Math.max(0, Math.round(frame.width));
    const height = Math.max(0, Math.round(frame.height));
    const label = `${width} x ${height}`;
    if (!this.indicator) {
      const container = new Container();
      container.name = 'selection-size-indicator';
      const bg = new Graphics();
      const text = new Text({ text: label, style: { fontFamily: 'Arial', fontSize: 12, fill: 0x111111 } });
      container.eventMode = 'none'; (bg as any).eventMode = 'none'; (text as any).eventMode = 'none';
      container.addChild(bg); container.addChild(text); ui.addChild(container);
      this.indicator = { container, bg, text };
    } else { this.indicator.text.text = label; }
    const paddingX = 6, paddingY = 3;
    const textW = (this.indicator.text as any).width || 0; const textH = (this.indicator.text as any).height || 0;
    const boxW = Math.ceil(textW + paddingX * 2); const boxH = Math.ceil(textH + paddingY * 2);
    this.indicator.bg.clear(); this.indicator.bg.rect(0, 0, boxW, boxH); this.indicator.bg.fill({ color: 0xffffff, alpha: 1 }); this.indicator.bg.stroke({ width: 1, color: 0x3b82f6 });
    this.indicator.text.position.set(paddingX, paddingY - 1);
    const corners = frame.corners;
    const edges = [
      { p1: corners.tl, p2: corners.tr },
      { p1: corners.tr, p2: corners.br },
      { p1: corners.br, p2: corners.bl },
      { p1: corners.bl, p2: corners.tl },
    ];

    let bestEdge = edges[0];
    let bestScore = -Infinity;
    for (const edge of edges) {
      const score = (edge.p1.y + edge.p2.y) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestEdge = edge;
      }
    }

    const midX = (bestEdge.p1.x + bestEdge.p2.x) * 0.5;
    const midY = (bestEdge.p1.y + bestEdge.p2.y) * 0.5;
    const dir = new Point(bestEdge.p2.x - bestEdge.p1.x, bestEdge.p2.y - bestEdge.p1.y);
    const len = Math.hypot(dir.x, dir.y) || 1;
    dir.x /= len; dir.y /= len;
    const normal = new Point(-dir.y, dir.x);
    if (normal.y < 0) {
      normal.x = -normal.x;
      normal.y = -normal.y;
    }

    const gap = 8;
    const offset = gap + boxH * 0.5;
    const centerX = midX + normal.x * offset;
    const centerY = midY + normal.y * offset;
    this.indicator.container.position.set(centerX - boxW * 0.5, centerY - boxH * 0.5);
  }

  public clear(): void {
    if (this.indicator) { if (this.indicator.container.parent) this.indicator.container.parent.removeChild(this.indicator.container); try { this.indicator.container.destroy({ children: true }); } catch { /* empty */ } this.indicator = null; }
  }
}

