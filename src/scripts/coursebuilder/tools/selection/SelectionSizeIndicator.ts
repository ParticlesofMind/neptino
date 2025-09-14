import { Container, Graphics, Rectangle, Text } from 'pixi.js';

export class SelectionSizeIndicator {
  private uiContainer: Container | null = null;
  private indicator: { container: Container; bg: Graphics; text: Text } | null = null;

  public setUILayer(container: Container) { this.uiContainer = container; }

  public update(bounds: Rectangle, fallbackContainer: Container): void {
    const ui = this.uiContainer || fallbackContainer;
    const width = Math.max(0, Math.round(bounds.width));
    const height = Math.max(0, Math.round(bounds.height));
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
    const cx = bounds.x + bounds.width * 0.5 - boxW * 0.5; const cy = bounds.y + bounds.height + 8;
    this.indicator.container.position.set(cx, cy);
  }

  public clear(): void {
    if (this.indicator) { if (this.indicator.container.parent) this.indicator.container.parent.removeChild(this.indicator.container); try { this.indicator.container.destroy({ children: true }); } catch {} this.indicator = null; }
  }
}

