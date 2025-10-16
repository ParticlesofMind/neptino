import { Graphics } from 'pixi.js';
import { PenShapeNodeMeta } from '../pen/PenGeometry';
import { colorToNumber, detectToolType } from './SelectionUtils';

export class SelectionStyling {
  public apply(toolName: string, settings: any, selected: any[]): boolean {
    if (!selected || selected.length === 0) return false;
    let changed = false; const effectiveTool = toolName;
    for (const obj of selected) {
      const t = detectToolType(obj); if (!t || t !== effectiveTool) continue;
      const meta = (obj as any).__meta || {};
      try {
        switch (t) {
          case 'brush': changed = this.restyleBrush(obj as any, meta, settings) || changed; break;
          case 'pen': changed = this.restylePen(obj as any, meta, settings) || changed; break;
          case 'shapes': changed = this.restyleShape(obj as any, meta, settings) || changed; break;
          case 'text': changed = this.restyleText(obj as any, settings) || changed; break;
        }
      } catch {
        /* empty */
      }
    }
    return changed;
  }

  private restyleBrush(gfx: any, meta: any, settings: any): boolean {
    if (!meta || !meta.points || meta.points.length < 2) return false;
    const color = colorToNumber(settings.color) ?? colorToNumber(meta.color) ?? 0x000000;
    const width = (settings.size ?? meta.size ?? 2) as number;
    const opacity = typeof settings.opacity === 'number' ? Math.max(0, Math.min(1, settings.opacity)) : (typeof meta.opacity === 'number' ? Math.max(0, Math.min(1, meta.opacity)) : 1);
    gfx.clear(); gfx.moveTo(meta.points[0].x, meta.points[0].y);
    for (let i = 1; i < meta.points.length; i++) { const p = meta.points[i]; gfx.lineTo(p.x, p.y); }
    gfx.stroke({ width, color, cap: 'round', join: 'round' });
    gfx.alpha = opacity;
    meta.size = width; meta.color = typeof settings.color === 'string' ? settings.color : meta.color; meta.opacity = opacity; gfx.__meta = meta; return true;
  }

  private restylePen(gfx: Graphics, meta: any, settings: any): boolean {
    if (!meta || !Array.isArray(meta.nodes) || meta.nodes.length < 2) return false;

    const nodes = meta.nodes as PenShapeNodeMeta[];
    const strokeColorStr =
      typeof (settings.strokeColor ?? settings.color) === 'string'
        ? (settings.strokeColor ?? settings.color)
        : meta.strokeColor;
    const strokeColorNum = colorToNumber(strokeColorStr) ?? colorToNumber(meta.strokeColor) ?? 0x000000;
    const strokeWidth = (settings.size ?? meta.size ?? 2) as number;

    if (strokeColorStr) meta.strokeColor = strokeColorStr;
    meta.size = strokeWidth;

    if ('fillColor' in settings) {
      meta.fillColor = settings.fillColor;
    }

    gfx.clear();

    const first = nodes[0];
    gfx.moveTo(first.x, first.y);
    for (let i = 1; i < nodes.length; i++) {
      const prev = nodes[i - 1];
      const curr = nodes[i];
      this.drawPenSegment(gfx, prev, curr);
    }

    if (meta.closed && nodes.length > 2) {
      const last = nodes[nodes.length - 1];
      this.drawPenSegment(gfx, last, first);
      gfx.closePath();

      const fillCandidate = 'fillColor' in settings ? settings.fillColor : meta.fillColor;
      const fillColorNum = colorToNumber(fillCandidate);
      if (
        fillCandidate !== null &&
        fillCandidate !== undefined &&
        fillCandidate !== '' &&
        fillCandidate !== 'transparent' &&
        fillColorNum !== undefined
      ) {
        gfx.fill({ color: fillColorNum });
      }
    }

    gfx.stroke({
      width: strokeWidth,
      color: strokeColorNum,
      cap: 'round',
      join: 'round',
    });

    (gfx as any).__meta = meta;
    return true;
  }

  private drawPenSegment(gfx: Graphics, prev: PenShapeNodeMeta, curr: PenShapeNodeMeta): void {
    const out = prev.out ?? null;
    const inn = curr.in ?? null;
    if (out && inn) {
      gfx.bezierCurveTo(out.x, out.y, inn.x, inn.y, curr.x, curr.y);
    } else if (out) {
      gfx.bezierCurveTo(out.x, out.y, out.x, out.y, curr.x, curr.y);
    } else if (inn) {
      gfx.bezierCurveTo(inn.x, inn.y, inn.x, inn.y, curr.x, curr.y);
    } else {
      gfx.lineTo(curr.x, curr.y);
    }
  }

  private restyleShape(gfx: any, meta: any, settings: any): boolean {
    const strokeColor = colorToNumber(settings.strokeColor || settings.color) ?? colorToNumber(meta.strokeColor) ?? 0x000000;
    const strokeWidth = Math.max(1, (settings.strokeWidth ?? meta.strokeWidth ?? 2) as number);
    const fillColorNum = colorToNumber(settings.fillColor !== undefined ? settings.fillColor : meta.fillColor);
    const fillEnabled = settings.fillEnabled === true || (fillColorNum !== undefined) || meta.fillEnabled === true;
    const x = meta.x ?? meta.startX ?? 0; const y = meta.y ?? meta.startY ?? 0; const w = meta.width ?? Math.abs((meta.currentX ?? 0) - (meta.startX ?? 0)); const h = meta.height ?? Math.abs((meta.currentY ?? 0) - (meta.startY ?? 0));
    gfx.clear();
    switch (meta.shapeType) {
      case 'rectangle': { gfx.rect(x, y, w, h); break; }
      case 'circle': { const cx = x + w / 2; const cy = y + h / 2; const radius = Math.max(Math.abs(w), Math.abs(h)) / 2; gfx.ellipse(cx, cy, radius, radius); break; }
      case 'ellipse': { const cx = x + w / 2; const cy = y + h / 2; gfx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2)); break; }
      case 'triangle': { const topX = x + w / 2, topY = y; const blX = x, blY = y + h; const brX = x + w, brY = y + h; gfx.moveTo(topX, topY).lineTo(blX, blY).lineTo(brX, brY).closePath(); break; }
      case 'line': { const x1 = meta.startX ?? x, y1 = meta.startY ?? y; const x2 = meta.currentX ?? (x + w), y2 = meta.currentY ?? (y + h); gfx.moveTo(x1, y1).lineTo(x2, y2); break; }
      case 'arrow': { const x1 = meta.startX ?? x, y1 = meta.startY ?? y; const x2 = meta.currentX ?? (x + w), y2 = meta.currentY ?? (y + h); gfx.moveTo(x1, y1).lineTo(x2, y2); const dx = x2 - x1, dy = y2 - y1; const angle = Math.atan2(dy, dx); const length = Math.hypot(dx, dy); const headLength = Math.min(20, length * 0.3); const headAngle = Math.PI / 6; const hx1 = x2 - headLength * Math.cos(angle - headAngle); const hy1 = y2 - headLength * Math.sin(angle - headAngle); const hx2 = x2 - headLength * Math.cos(angle + headAngle); const hy2 = y2 - headLength * Math.sin(angle + headAngle); gfx.moveTo(x2, y2).lineTo(hx1, hy1).moveTo(x2, y2).lineTo(hx2, hy2); break; }
      case 'polygon': { const sides = Math.max(3, meta.sides ?? 5); const cx = x + w / 2, cy = y + h / 2; const rx = w / 2, ry = h / 2; for (let i = 0; i < sides; i++) { const theta = (i / sides) * Math.PI * 2 - Math.PI / 2; const px = cx + rx * Math.cos(theta); const py = cy + ry * Math.sin(theta); if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py); } gfx.closePath(); break; }
      case 'star': { const points = Math.max(3, meta.points ?? 5); const cx = x + w / 2, cy = y + h / 2; const outerRadius = Math.max(w, h) / 2; const innerRadius = Math.max(1, meta.innerRadius ?? outerRadius * 0.4); for (let i = 0; i < points * 2; i++) { const angle = (i * Math.PI) / points - Math.PI / 2; const radius = i % 2 === 0 ? outerRadius : innerRadius; const px = cx + radius * Math.cos(angle); const py = cy + radius * Math.sin(angle); if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py); } gfx.closePath(); break; }
      case 'square': { const size = Math.min(Math.abs(w), Math.abs(h)); gfx.rect(x, y, size, size); break; }
      case 'rhombus': { const cx2 = x + w / 2, cy2 = y + h / 2; const hw = Math.abs(w) / 2, hh = Math.abs(h) / 2; gfx.moveTo(cx2, cy2 - hh).lineTo(cx2 + hw, cy2).lineTo(cx2, cy2 + hh).lineTo(cx2 - hw, cy2).closePath(); break; }
      case 'parallelogram': { const skew = meta.skew ?? w * 0.3; gfx.moveTo(x + skew, y).lineTo(x + w, y).lineTo(x + w - skew, y + h).lineTo(x, y + h).closePath(); break; }
      case 'trapezoid': { const topWidth = meta.topWidth ?? w * 0.6; const sideOffset = (w - topWidth) / 2; gfx.moveTo(x + sideOffset, y).lineTo(x + sideOffset + topWidth, y).lineTo(x + w, y + h).lineTo(x, y + h).closePath(); break; }
      case 'pentagon': { const cx3 = x + w / 2, cy3 = y + h / 2; const radius = Math.max(Math.abs(w), Math.abs(h)) / 2; for (let i = 0; i < 5; i++) { const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2; const px = cx3 + radius * Math.cos(angle); const py = cy3 + radius * Math.sin(angle); if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py); } gfx.closePath(); break; }
      case 'hexagon': { const cx4 = x + w / 2, cy4 = y + h / 2; const radius = Math.max(Math.abs(w), Math.abs(h)) / 2; for (let i = 0; i < 6; i++) { const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2; const px = cx4 + radius * Math.cos(angle); const py = cy4 + radius * Math.sin(angle); if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py); } gfx.closePath(); break; }
      case 'octagon': { const cx5 = x + w / 2, cy5 = y + h / 2; const radius = Math.max(Math.abs(w), Math.abs(h)) / 2; for (let i = 0; i < 8; i++) { const angle = (i * 2 * Math.PI) / 8 - Math.PI / 2; const px = cx5 + radius * Math.cos(angle); const py = cy5 + radius * Math.sin(angle); if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py); } gfx.closePath(); break; }
      case 'sphere': { const cx6 = x + w / 2, cy6 = y + h / 2; const radius = Math.min(Math.abs(w), Math.abs(h)) / 2; gfx.ellipse(cx6, cy6, radius, radius); break; }
      case 'cube': { const size = Math.min(Math.abs(w), Math.abs(h)); const offset = meta.offset ?? size * 0.3; gfx.rect(x, y, size, size); gfx.moveTo(x, y).lineTo(x + offset, y - offset).lineTo(x + size + offset, y - offset).lineTo(x + size, y); gfx.moveTo(x + size, y).lineTo(x + size + offset, y - offset).lineTo(x + size + offset, y + size - offset).lineTo(x + size, y + size); break; }
      case 'cuboid': { const offset = meta.offset ?? Math.min(w, h) * 0.25; gfx.rect(x, y, w, h); gfx.moveTo(x, y).lineTo(x + offset, y - offset).lineTo(x + w + offset, y - offset).lineTo(x + w, y); gfx.moveTo(x + w, y).lineTo(x + w + offset, y - offset).lineTo(x + w + offset, y + h - offset).lineTo(x + w, y + h); break; }
      case 'cylinder': { const cx7 = x + w / 2; const radiusX = w / 2; const radiusY = (meta.ellipseY ?? (h * 0.15)); gfx.rect(x, y + radiusY, w, h - 2 * radiusY); gfx.ellipse(cx7, y + radiusY, radiusX, radiusY); gfx.ellipse(cx7, y + h - radiusY, radiusX, radiusY); break; }
      case 'cone': { const cx8 = x + w / 2; const topX = cx8; const topY = y; const baseY = y + h; const radiusX = w / 2; const radiusY = (meta.ellipseY ?? (h * 0.15)); gfx.moveTo(topX, topY).lineTo(x, baseY - radiusY).lineTo(x + w, baseY - radiusY).closePath(); gfx.ellipse(cx8, baseY - radiusY, radiusX, radiusY); break; }
      case 'torus': {
        const cx9 = x + w / 2, cy9 = y + h / 2; const outerR = Math.max(Math.abs(w), Math.abs(h)) / 2; const innerR = Math.max(1, Math.min(outerR - 1, meta.innerRadius ?? outerR * 0.6)); // draw as two concentric paths approximation
        void innerR;
        gfx.ellipse(cx9, cy9, outerR, outerR); if (fillEnabled) { /* holes not directly supported by Graphics fill; leave geometry intact */ } break;
      }
      default: { gfx.rect(x, y, w, h); }
    }
    if (fillEnabled && fillColorNum !== undefined) { gfx.fill({ color: fillColorNum }); }
    gfx.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' });
    meta.strokeWidth = strokeWidth; meta.strokeColor = settings.strokeColor || settings.color || meta.strokeColor; if ('fillColor' in settings) meta.fillColor = settings.fillColor; if ('fillEnabled' in settings) meta.fillEnabled = settings.fillEnabled; if ('fillColor' in settings && settings.fillEnabled === undefined) { meta.fillEnabled = (fillColorNum !== undefined); } gfx.__meta = meta; return true;
  }

  private restyleText(container: any, settings: any): boolean {
    try { const children = container.children || []; const textObj = children.find((c: any) => c.constructor?.name === 'Text'); if (!textObj) return false; let changed = false; if (settings.color) { textObj.style.fill = settings.color; changed = true; } if (settings.fontSize) { textObj.style.fontSize = settings.fontSize; changed = true; } return changed; } catch { return false; }
  }
}
