import { Container, Graphics, Point, Rectangle } from 'pixi.js';

export function unionBoundsLocal(objects: any[], container: Container): Rectangle {
  let minWX = Infinity, minWY = Infinity, maxWX = -Infinity, maxWY = -Infinity;
  for (const obj of objects) {
    try { const wb = obj.getBounds(); minWX = Math.min(minWX, wb.x); minWY = Math.min(minWY, wb.y); maxWX = Math.max(maxWX, wb.x + wb.width); maxWY = Math.max(maxWY, wb.y + wb.height); } catch {}
  }
  if (!isFinite(minWX)) return new Rectangle(0, 0, 0, 0);
  const tl = container.toLocal(new Point(minWX, minWY)); const br = container.toLocal(new Point(maxWX, maxWY));
  const x = Math.min(tl.x, br.x); const y = Math.min(tl.y, br.y); const w = Math.abs(br.x - tl.x); const h = Math.abs(br.y - tl.y);
  return new Rectangle(x, y, w, h);
}

export function moveByContainerDelta(obj: any, dx: number, dy: number, container: Container): void {
  try { const pAWorld = container.toGlobal(new Point(0, 0)); const pBWorld = container.toGlobal(new Point(dx, dy)); const pALocal = obj.parent.toLocal(pAWorld); const pBLocal = obj.parent.toLocal(pBWorld); obj.position.x += (pBLocal.x - pALocal.x); obj.position.y += (pBLocal.y - pALocal.y); } catch {}
}

export function createBrushFromMeta(meta: any, offset: number): Graphics | null {
  if (!meta || !meta.points || meta.points.length < 2) return null;
  const gfx = new Graphics(); const color = colorToNumber(meta.color) ?? 0x000000; const width = Math.max(1, meta.size ?? 2);
  const pts = meta.points.map((p: any) => ({ x: (p.x || 0) + offset, y: (p.y || 0) + offset }));
  gfx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
  gfx.stroke({ width, color, cap: 'round', join: 'round' }); try { meta.points = pts; } catch {}
  return gfx;
}

export function createPenFromMeta(meta: any, offset: number): Graphics | null {
  if (!meta || !meta.nodes || meta.nodes.length < 2) return null;
  const gfx = new Graphics(); const color = colorToNumber(meta.strokeColor) ?? 0x000000; const width = Math.max(1, meta.size ?? 2);
  const nodes = (meta.nodes as Array<{ x: number; y: number }>).map(n => ({ x: (n.x || 0) + offset, y: (n.y || 0) + offset }));
  gfx.moveTo(nodes[0].x, nodes[0].y); for (let i = 1; i < nodes.length; i++) gfx.lineTo(nodes[i].x, nodes[i].y);
  if (meta.closed) { gfx.lineTo(nodes[0].x, nodes[0].y); gfx.closePath(); const fillNum = colorToNumber(meta.fillColor); if (fillNum !== undefined) gfx.fill({ color: fillNum }); }
  gfx.stroke({ width, color, cap: 'round', join: 'round' }); try { meta.nodes = nodes; } catch {}
  return gfx;
}

export function createShapeFromMeta(meta: any, offset: number): Graphics | null {
  if (!meta) return null; const gfx = new Graphics();
  const strokeColor = colorToNumber(meta.strokeColor) ?? 0x000000; const strokeWidth = Math.max(1, meta.strokeWidth ?? 2);
  const fillColorNum = colorToNumber(meta.fillColor); const fillEnabled = meta.fillEnabled === true || (fillColorNum !== undefined);
  const x = (meta.x ?? meta.startX ?? 0) + offset; const y = (meta.y ?? meta.startY ?? 0) + offset; const w = meta.width ?? Math.abs((meta.currentX ?? 0) - (meta.startX ?? 0)); const h = meta.height ?? Math.abs((meta.currentY ?? 0) - (meta.startY ?? 0));
  switch (meta.shapeType) {
    case 'rectangle': { const r = meta.cornerRadius ?? 0; if (r > 0) gfx.roundRect(x, y, w, h, r); else gfx.rect(x, y, w, h); break; }
    case 'circle': { const cx = x + w / 2; const cy = y + h / 2; const radius = Math.max(w, h) / 2; gfx.ellipse(cx, cy, radius, radius); break; }
    case 'ellipse': { const cx = x + w / 2; const cy = y + h / 2; gfx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2)); break; }
    case 'triangle': { const topX = x + w / 2, topY = y; const blX = x, blY = y + h; const brX = x + w, brY = y + h; gfx.moveTo(topX, topY).lineTo(blX, blY).lineTo(brX, brY).closePath(); break; }
    case 'line': { const x1 = meta.startX ?? x, y1 = meta.startY ?? y; const x2 = meta.currentX ?? (x + w), y2 = meta.currentY ?? (y + h); gfx.moveTo(x1, y1).lineTo(x2, y2); break; }
    case 'arrow': { const x1 = meta.startX ?? x, y1 = meta.startY ?? y; const x2 = meta.currentX ?? (x + w), y2 = meta.currentY ?? (y + h); gfx.moveTo(x1, y1).lineTo(x2, y2); const dx = x2 - x1, dy = y2 - y1; const angle = Math.atan2(dy, dx); const length = Math.hypot(dx, dy); const headLength = Math.min(20, length * 0.3); const headAngle = Math.PI / 6; const hx1 = x2 - headLength * Math.cos(angle - headAngle); const hy1 = y2 - headLength * Math.sin(angle - headAngle); const hx2 = x2 - headLength * Math.cos(angle + headAngle); const hy2 = y2 - headLength * Math.sin(angle + headAngle); gfx.moveTo(x2, y2).lineTo(hx1, hy1).moveTo(x2, y2).lineTo(hx2, hy2); break; }
    case 'polygon': { const sides = Math.max(3, meta.sides ?? 5); const cx = x + w / 2, cy = y + h / 2; const rx = w / 2, ry = h / 2; for (let i = 0; i < sides; i++) { const theta = (i / sides) * Math.PI * 2 - Math.PI / 2; const px = cx + rx * Math.cos(theta); const py = cy + ry * Math.sin(theta); if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py); } gfx.closePath(); break; }
    default: { gfx.rect(x, y, w, h); }
  }
  if (fillEnabled && fillColorNum !== undefined) { gfx.fill({ color: fillColorNum }); }
  gfx.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' });
  try { if (meta.x !== undefined) meta.x = x; if (meta.y !== undefined) meta.y = y; if (meta.startX !== undefined) meta.startX += offset; if (meta.startY !== undefined) meta.startY += offset; if (meta.currentX !== undefined) meta.currentX += offset; if (meta.currentY !== undefined) meta.currentY += offset; } catch {}
  return gfx;
}

export function colorToNumber(c?: any): number | undefined {
  if (c === null || c === undefined) return undefined;
  if (typeof c === 'number') return Number.isFinite(c) ? c : undefined;
  if (typeof c === 'string') {
    const s = c.trim();
    if (!s) return undefined;
    let v: number = NaN;
    try {
      if (s.startsWith('#')) v = parseInt(s.slice(1), 16);
      else if (/^0x/i.test(s)) v = parseInt(s, 16);
      else if (/^\d+$/.test(s)) v = parseInt(s, 10);
    } catch {}
    return Number.isFinite(v) ? v : undefined;
  }
  return undefined;
}
