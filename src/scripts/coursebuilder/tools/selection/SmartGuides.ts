import { Container, Graphics, Rectangle, Text, Point } from 'pixi.js';
import { snapManager } from '../SnapManager';

export class SmartGuides {
  private uiContainer: Container | null = null;
  private guideGfx: Graphics | null = null;
  private guideLabels: Container | null = null;

  public setUILayer(container: Container) { this.uiContainer = container; }

  public clear(): void {
    if (this.guideGfx && this.guideGfx.parent) this.guideGfx.parent.removeChild(this.guideGfx);
    try { this.guideGfx?.destroy({ children: false }); } catch {}
    this.guideGfx = null;
    if (this.guideLabels && this.guideLabels.parent) this.guideLabels.parent.removeChild(this.guideLabels);
    try { this.guideLabels?.destroy({ children: true }); } catch {}
    this.guideLabels = null;
  }

  public update(container: Container, selected: any[], groupBounds: Rectangle): void {
    if (!this.uiContainer && !container) return;
    if (!snapManager.isSmartEnabled()) { this.clear(); return; }
    const ui = this.uiContainer || container;
    const b = groupBounds;

    if (!this.guideGfx) {
      this.guideGfx = new Graphics();
      this.guideGfx.zIndex = 10000;
      this.guideGfx.eventMode = 'none';
      ui.addChild(this.guideGfx);
    } else { this.guideGfx.clear(); }

    if (!this.guideLabels) {
      this.guideLabels = new Container();
      this.guideLabels.zIndex = 10001;
      this.guideLabels.eventMode = 'none';
      ui.addChild(this.guideLabels);
    } else { try { this.guideLabels.removeChildren(); } catch {} }

    const candidates = snapManager.getCandidates({ exclude: selected, container });
    const threshold = candidates.threshold;
    const guideColor = 0x3b82f6;
    const others = this.collectOtherBounds(container, selected || []);

    type Line = { pos: number; rects: Rectangle[] };
    const vLines: Line[] = []; const hLines: Line[] = [];
    const bLeft = b.x, bRight = b.x + b.width; const bTop = b.y, bBottom = b.y + b.height;
    const bCx = b.x + b.width / 2; const bCy = b.y + b.height / 2;
    const ensureLine = (list: Line[], pos: number): Line => {
      for (const l of list) { if (Math.abs(l.pos - pos) <= threshold) return l; }
      const l = { pos, rects: [] as Rectangle[] }; list.push(l); return l;
    };

    for (const r of others) {
      const rLeft = r.x, rRight = r.x + r.width, rCx = r.x + r.width / 2;
      const rTop = r.y, rBottom = r.y + r.height, rCy = r.y + r.height / 2;
      if (Math.abs(bLeft - rLeft) <= threshold) ensureLine(vLines, rLeft).rects.push(r);
      if (Math.abs(bLeft - rCx) <= threshold) ensureLine(vLines, rCx).rects.push(r);
      if (Math.abs(bLeft - rRight) <= threshold) ensureLine(vLines, rRight).rects.push(r);
      if (Math.abs(bCx - rLeft) <= threshold) ensureLine(vLines, rLeft).rects.push(r);
      if (Math.abs(bCx - rCx) <= threshold) ensureLine(vLines, rCx).rects.push(r);
      if (Math.abs(bCx - rRight) <= threshold) ensureLine(vLines, rRight).rects.push(r);
      if (Math.abs(bRight - rLeft) <= threshold) ensureLine(vLines, rLeft).rects.push(r);
      if (Math.abs(bRight - rCx) <= threshold) ensureLine(vLines, rCx).rects.push(r);
      if (Math.abs(bRight - rRight) <= threshold) ensureLine(vLines, rRight).rects.push(r);
      if (Math.abs(bTop - rTop) <= threshold) ensureLine(hLines, rTop).rects.push(r);
      if (Math.abs(bTop - rCy) <= threshold) ensureLine(hLines, rCy).rects.push(r);
      if (Math.abs(bTop - rBottom) <= threshold) ensureLine(hLines, rBottom).rects.push(r);
      if (Math.abs(bCy - rTop) <= threshold) ensureLine(hLines, rTop).rects.push(r);
      if (Math.abs(bCy - rCy) <= threshold) ensureLine(hLines, rCy).rects.push(r);
      if (Math.abs(bCy - rBottom) <= threshold) ensureLine(hLines, rBottom).rects.push(r);
      if (Math.abs(bBottom - rTop) <= threshold) ensureLine(hLines, rTop).rects.push(r);
      if (Math.abs(bBottom - rCy) <= threshold) ensureLine(hLines, rCy).rects.push(r);
      if (Math.abs(bBottom - rBottom) <= threshold) ensureLine(hLines, rBottom).rects.push(r);
    }
    for (const l of vLines) l.rects.push(b.clone());
    for (const l of hLines) l.rects.push(b.clone());
    for (const l of vLines) l.rects = l.rects.filter((r, i, arr) => arr.indexOf(r) === i);
    for (const l of hLines) l.rects = l.rects.filter((r, i, arr) => arr.indexOf(r) === i);

    for (const l of vLines) {
      if (l.rects.length < 2) continue;
      const yMin = Math.min(...l.rects.map(r => r.y));
      const yMax = Math.max(...l.rects.map(r => r.y + r.height));
      const gaps: number[] = []; const sorted = l.rects.slice().sort((a, b) => a.y - b.y);
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i]; const c = sorted[i + 1];
        const gap = Math.round(c.y - (a.y + a.height)); if (gap > 0) gaps.push(gap);
      }
      const eqTol = snapManager.getPrefs().equalTolerance;
      const eqSpacing = gaps.length >= 2 && (Math.max(...gaps) - Math.min(...gaps) <= eqTol);
      const lineColor = eqSpacing ? 0x10b981 : guideColor;
      this.guideGfx!.moveTo(l.pos, yMin).lineTo(l.pos, yMax).stroke({ width: 1, color: lineColor, alpha: 0.98 });
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i]; const c = sorted[i + 1]; const gap = Math.round(c.y - (a.y + a.height));
        if (gap > 0) {
          const midY = (a.y + a.height + c.y) / 2;
          this.drawGuideLabel(l.pos + 6, midY - 8, `${gap}px`, lineColor);
        }
      }
    }
    for (const l of hLines) {
      if (l.rects.length < 2) continue;
      const xMin = Math.min(...l.rects.map(r => r.x));
      const xMax = Math.max(...l.rects.map(r => r.x + r.width));
      const gaps: number[] = []; const sorted = l.rects.slice().sort((a, b) => a.x - b.x);
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i]; const c = sorted[i + 1];
        const gap = Math.round(c.x - (a.x + a.width)); if (gap > 0) gaps.push(gap);
      }
      const eqTol = snapManager.getPrefs().equalTolerance;
      const eqSpacing = gaps.length >= 2 && (Math.max(...gaps) - Math.min(...gaps) <= eqTol);
      const lineColor = eqSpacing ? 0x10b981 : guideColor;
      this.guideGfx!.moveTo(xMin, l.pos).lineTo(xMax, l.pos).stroke({ width: 1, color: lineColor, alpha: 0.98 });
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i]; const c = sorted[i + 1]; const gap = Math.round(c.x - (a.x + a.width));
        if (gap > 0) {
          const midX = (a.x + a.width + c.x) / 2; this.drawGuideLabel(midX - 10, l.pos - 16, `${gap}px`, lineColor);
        }
      }
    }
  }

  private drawGuideLabel(x: number, y: number, text: string, strokeColor: number = 0x3b82f6): void {
    if (!this.guideLabels) return;
    const bg = new Graphics(); const t = new Text({ text, style: { fontFamily: 'Arial', fontSize: 10, fill: 0x111111 } });
    const paddingX = 4, paddingY = 2; const boxW = Math.ceil(((t as any).width || 0) + paddingX * 2); const boxH = Math.ceil(((t as any).height || 0) + paddingY * 2);
    bg.rect(0, 0, boxW, boxH).fill({ color: 0xffffff, alpha: 1 }).stroke({ width: 1, color: strokeColor, alpha: 1 });
    const container = new Container(); container.eventMode = 'none'; bg.eventMode = 'none'; (t as any).eventMode = 'none';
    container.addChild(bg); container.addChild(t); t.position.set(paddingX, paddingY - 1); container.position.set(x, y);
    this.guideLabels.addChild(container);
  }

  private collectOtherBounds(container: Container, exclude: any[]): Rectangle[] {
    const out: Rectangle[] = []; const ex = new Set<any>(exclude);
    const visit = (node: any) => {
      if (!node || ex.has(node)) return;
      try {
        if (typeof node.getBounds === 'function' && node.visible !== false) {
          const wb = node.getBounds();
          const tl = container.toLocal(new Point(wb.x, wb.y));
          const br = container.toLocal(new Point(wb.x + wb.width, wb.y + wb.height));
          const x = Math.min(tl.x, br.x); const y = Math.min(tl.y, br.y);
          const w = Math.abs(br.x - tl.x); const h = Math.abs(br.y - tl.y);
          if (isFinite(x) && isFinite(y) && w > 0.01 && h > 0.01) out.push(new Rectangle(x, y, w, h));
        }
      } catch {}
      if (node.children && Array.isArray(node.children)) for (const child of node.children) visit(child);
    };
    for (const child of container.children) visit(child);
    return out;
  }
}

