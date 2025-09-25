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
      } catch {}
    }
    return changed;
  }

  private restyleBrush(gfx: any, meta: any, settings: any): boolean {
    if (!meta || !meta.points || meta.points.length < 2) return false;
    const color = colorToNumber(settings.color) ?? colorToNumber(meta.color) ?? 0x000000;
    const width = (settings.size ?? meta.size ?? 2) as number;
    gfx.clear(); gfx.moveTo(meta.points[0].x, meta.points[0].y);
    for (let i = 1; i < meta.points.length; i++) { const p = meta.points[i]; gfx.lineTo(p.x, p.y); }
    gfx.stroke({ width, color, cap: 'round', join: 'round' });
    meta.size = width; meta.color = typeof settings.color === 'string' ? settings.color : meta.color; gfx.__meta = meta; return true;
  }

  private restylePen(gfx: any, meta: any, settings: any): boolean {
    if (!meta || !meta.nodes || meta.nodes.length < 2) return false;
    const color = colorToNumber(settings.strokeColor || settings.color) ?? colorToNumber(meta.strokeColor) ?? 0x000000;
    const width = (settings.size ?? meta.size ?? 2) as number;
    gfx.clear(); const nodes = meta.nodes as Array<{ x: number; y: number }>;
    gfx.moveTo(nodes[0].x, nodes[0].y); for (let i = 1; i < nodes.length; i++) { const p = nodes[i]; gfx.lineTo(p.x, p.y); }
    if (meta.closed) { gfx.lineTo(nodes[0].x, nodes[0].y); gfx.closePath(); const fillCandidate = (settings.fillColor !== undefined) ? settings.fillColor : meta.fillColor; const fillNum = colorToNumber(fillCandidate); if (fillNum !== undefined) { gfx.fill({ color: fillNum }); } }
    gfx.stroke({ width, color, cap: 'round', join: 'round' }); meta.size = width; meta.strokeColor = typeof (settings.strokeColor || settings.color) === 'string' ? (settings.strokeColor || settings.color) : meta.strokeColor; gfx.__meta = meta; return true;
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
