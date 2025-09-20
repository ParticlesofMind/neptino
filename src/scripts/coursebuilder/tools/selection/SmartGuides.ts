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

    const candidates = snapManager.getCandidates({ exclude: selected, container, rect: groupBounds, margin: 200 });
    const threshold = candidates.threshold;
    const guideColor = 0x3b82f6;
    const others = this.collectOtherBounds(container, selected || [], groupBounds, (candidates.threshold || 0) + 200);

    type Line = { pos: number; rects: Rectangle[]; _acc?: { sum: number; count: number } };
    const vLines: Line[] = []; const hLines: Line[] = [];
    const bLeft = b.x, bRight = b.x + b.width; const bTop = b.y, bBottom = b.y + b.height;
    const bCx = b.x + b.width / 2; const bCy = b.y + b.height / 2;
    const ensureLine = (list: Line[], pos: number): Line => {
      for (const l of list) {
        if (Math.abs(l.pos - pos) <= threshold) {
          // Accumulate to stabilize line position around contributing values
          l._acc = l._acc || { sum: l.pos, count: 1 };
          l._acc.sum += pos; l._acc.count += 1;
          // Update representative position to the running average
          l.pos = l._acc.sum / l._acc.count;
          return l;
        }
      }
      const l = { pos, rects: [] as Rectangle[] } as Line; list.push(l); return l;
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
    // Include canvas guides (edges and center) as candidates as well
    try {
      for (const x of candidates.canvas.v) { const ln: any = ensureLine(vLines, x); ln.isCanvas = true; }
      for (const y of candidates.canvas.h) { const ln: any = ensureLine(hLines, y); ln.isCanvas = true; }
    } catch {}

    for (const l of vLines) l.rects.push(b.clone());
    for (const l of hLines) l.rects.push(b.clone());
    for (const l of vLines) l.rects = l.rects.filter((r, i, arr) => arr.indexOf(r) === i);
    for (const l of hLines) l.rects = l.rects.filter((r, i, arr) => arr.indexOf(r) === i);

    // Limit how far guide segments extend to avoid framing the canvas
    const segmentMargin = 24;
    for (const l of vLines) {
      if (l.rects.length < 2 && !(l as any).isCanvas) continue;
      // Draw segment around selection bounds only
      const yMin = bTop - segmentMargin;
      const yMax = bBottom + segmentMargin;
      const gaps: number[] = []; const sorted = l.rects.slice().sort((a, b) => a.y - b.y);
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i]; const c = sorted[i + 1];
        const gap = (c.y - (a.y + a.height)); if (gap > 0) gaps.push(gap);
      }
      const eqTol = snapManager.getPrefs().equalTolerance;
      const eqSpacing = gaps.length >= 2 && (Math.max(...gaps) - Math.min(...gaps) <= eqTol);
      const lineColor = eqSpacing ? 0x10b981 : guideColor;
      // Align to pixel for crisp 1px line
      const px = Math.round(l.pos) + 0.5;
      this.guideGfx!.moveTo(px, yMin).lineTo(px, yMax).stroke({ width: 1, color: lineColor, alpha: 0.98 });
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i]; const c = sorted[i + 1]; const gap = (c.y - (a.y + a.height));
        if (gap > 0) {
          const midY = (a.y + a.height + c.y) / 2;
          this.drawGuideLabel(px + 6, midY - 8, `${Math.round(gap)}px`, lineColor);
        }
      }
    }
    for (const l of hLines) {
      if (l.rects.length < 2 && !(l as any).isCanvas) continue;
      const xMin = bLeft - segmentMargin;
      const xMax = bRight + segmentMargin;
      const gaps: number[] = []; const sorted = l.rects.slice().sort((a, b) => a.x - b.x);
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i]; const c = sorted[i + 1];
        const gap = (c.x - (a.x + a.width)); if (gap > 0) gaps.push(gap);
      }
      const eqTol = snapManager.getPrefs().equalTolerance;
      const eqSpacing = gaps.length >= 2 && (Math.max(...gaps) - Math.min(...gaps) <= eqTol);
      const lineColor = eqSpacing ? 0x10b981 : guideColor;
      const py = Math.round(l.pos) + 0.5;
      this.guideGfx!.moveTo(xMin, py).lineTo(xMax, py).stroke({ width: 1, color: lineColor, alpha: 0.98 });
      for (let i = 0; i < sorted.length - 1; i++) {
        const a = sorted[i]; const c = sorted[i + 1]; const gap = (c.x - (a.x + a.width));
        if (gap > 0) {
          const midX = (a.x + a.width + c.x) / 2; this.drawGuideLabel(midX - 10, py - 16, `${Math.round(gap)}px`, lineColor);
        }
      }
    }

    // Symmetry indicators: draw optional short center/midpoint guides and tick markers when centered
    try {
      const prefs = snapManager.getPrefs();
      if (prefs.enableSymmetryGuides) {
        const allV = (candidates.canvas.v || []).concat(candidates.vLines || []);
        const allH = (candidates.canvas.h || []).concat(candidates.hLines || []);
        const centerX = bCx; const centerY = bCy;
        const nearestV = allV.reduce<{ pos: number; d: number } | null>((acc, x) => {
          const d = Math.abs(x - centerX);
          if (!acc || d < acc.d) return { pos: x, d };
          return acc;
        }, null);
        const nearestH = allH.reduce<{ pos: number; d: number } | null>((acc, y) => {
          const d = Math.abs(y - centerY);
          if (!acc || d < acc.d) return { pos: y, d };
          return acc;
        }, null);
        const thr = threshold;
        const shortMargin = 20;
        const tick = 6;
        if (nearestV && nearestV.d <= thr) {
          const px = Math.round(nearestV.pos) + 0.5;
          // Short guide through selection center
          this.guideGfx!.moveTo(px, bTop - shortMargin).lineTo(px, bBottom + shortMargin).stroke({ width: 1, color: guideColor, alpha: 0.98 });
          // Tick markers at selection bounds
          const tyTop = Math.round(bTop) + 0.5;
          const tyBottom = Math.round(bBottom) + 0.5;
          this.guideGfx!.moveTo(px - tick, tyTop).lineTo(px + tick, tyTop).stroke({ width: 1, color: guideColor, alpha: 0.98 });
          this.guideGfx!.moveTo(px - tick, tyBottom).lineTo(px + tick, tyBottom).stroke({ width: 1, color: guideColor, alpha: 0.98 });
        }
        if (nearestH && nearestH.d <= thr) {
          const py = Math.round(nearestH.pos) + 0.5;
          // Short guide through selection center
          this.guideGfx!.moveTo(bLeft - shortMargin, py).lineTo(bRight + shortMargin, py).stroke({ width: 1, color: guideColor, alpha: 0.98 });
          // Tick markers at selection bounds
          const txLeft = Math.round(bLeft) + 0.5;
          const txRight = Math.round(bRight) + 0.5;
          this.guideGfx!.moveTo(txLeft, py - tick).lineTo(txLeft, py + tick).stroke({ width: 1, color: guideColor, alpha: 0.98 });
          this.guideGfx!.moveTo(txRight, py - tick).lineTo(txRight, py + tick).stroke({ width: 1, color: guideColor, alpha: 0.98 });
        }
      }
    } catch {}
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

  private collectOtherBounds(container: Container, exclude: any[], ref?: Rectangle, margin: number = 160): Rectangle[] {
    const out: Rectangle[] = []; const ex = new Set<any>(exclude);
    const visit = (node: any) => {
      if (!node || ex.has(node)) return;
      // Skip known UI overlay elements by name or direct references
      try {
        const n = (node as any).name || '';
        if (
          n === 'selection-box' ||
          (typeof n === 'string' && (n.startsWith('transform-handle-') || n === 'selection-size-indicator')) ||
          node === this.guideGfx || node === this.guideLabels
        ) {
          // do not consider overlay graphics as snap candidates
          if (node.children && Array.isArray(node.children)) {
            // but still traverse children in case (defensive)
            for (const child of node.children) visit(child);
          }
          return;
        }
      } catch {}
      try {
        if (typeof node.getBounds === 'function' && node.visible !== false) {
          const wb = node.getBounds();
          const tl = container.toLocal(new Point(wb.x, wb.y));
          const br = container.toLocal(new Point(wb.x + wb.width, wb.y + wb.height));
          const x = Math.min(tl.x, br.x); const y = Math.min(tl.y, br.y);
          const w = Math.abs(br.x - tl.x); const h = Math.abs(br.y - tl.y);
          if (isFinite(x) && isFinite(y) && w > 0.01 && h > 0.01) {
            if (ref) {
              const ax1 = x, ax2 = x + w, ay1 = y, ay2 = y + h;
              const bx1 = ref.x - margin, bx2 = ref.x + ref.width + margin;
              const by1 = ref.y - margin, by2 = ref.y + ref.height + margin;
              const overlapX = ax2 >= bx1 && ax1 <= bx2;
              const overlapY = ay2 >= by1 && ay1 <= by2;
              if (overlapX || overlapY) {
                out.push(new Rectangle(x, y, w, h));
              }
            } else {
              out.push(new Rectangle(x, y, w, h));
            }
          }
        }
      } catch {}
      if (node.children && Array.isArray(node.children)) for (const child of node.children) visit(child);
    };
    for (const child of container.children) visit(child);
    return out;
  }
}
