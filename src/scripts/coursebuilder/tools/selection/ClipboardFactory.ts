import { Container, Graphics, Point, Rectangle, Sprite, Texture, Text } from 'pixi.js';

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
  const alpha = typeof meta.opacity === 'number' ? Math.max(0, Math.min(1, meta.opacity)) : 1;
  gfx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) gfx.lineTo(pts[i].x, pts[i].y);
  gfx.stroke({ width, color, cap: 'round', join: 'round' }); gfx.alpha = alpha;
  try { meta.points = pts; meta.opacity = alpha; } catch {}
  return gfx;
}

export function createPenFromMeta(meta: any, offset: number): Graphics | null {
  if (!meta || !meta.nodes || meta.nodes.length < 2) return null;
  const gfx = new Graphics();
  const color = colorToNumber(meta.strokeColor) ?? 0x000000;
  const width = Math.max(1, meta.size ?? 2);

  // Support cubic bezier via in/out handles when present
  type Node = { x: number; y: number; in?: { x: number; y: number } | null; out?: { x: number; y: number } | null };
  const nodes = (meta.nodes as Node[]).map(n => ({
    x: (n.x || 0) + offset,
    y: (n.y || 0) + offset,
    in: n.in ? { x: (n.in.x || 0) + offset, y: (n.in.y || 0) + offset } : null,
    out: n.out ? { x: (n.out.x || 0) + offset, y: (n.out.y || 0) + offset } : null,
  }));

  gfx.moveTo(nodes[0].x, nodes[0].y);
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1]; const curr = nodes[i];
    if (prev.out && curr.in) {
      gfx.bezierCurveTo(prev.out.x, prev.out.y, curr.in.x, curr.in.y, curr.x, curr.y);
    } else {
      gfx.lineTo(curr.x, curr.y);
    }
  }
  if (meta.closed) {
    const first = nodes[0]; const last = nodes[nodes.length - 1];
    if (last.out && first.in) gfx.bezierCurveTo(last.out.x, last.out.y, first.in.x, first.in.y, first.x, first.y);
    else gfx.lineTo(first.x, first.y);
    gfx.closePath();
    // Only apply fill when explicitly enabled/defined.
    // Some pen paths are closed but intentionally unfilled; duplicating should respect that.
    const fillNum = colorToNumber(meta.fillColor);
    const fillEnabled = (meta.fillEnabled === true) || (typeof meta.fillColor !== 'undefined' && meta.fillColor !== null && meta.fillColor !== '');
    if (fillEnabled && fillNum !== undefined) {
      gfx.fill({ color: fillNum });
    }
  }
  gfx.stroke({ width, color, cap: 'round', join: 'round' });
  try { meta.nodes = nodes; } catch {}
  return gfx;
}

export function createShapeFromMeta(meta: any, offset: number): Graphics | null {
  if (!meta) return null; const gfx = new Graphics();
  const strokeColor = colorToNumber(meta.strokeColor) ?? 0x000000; const strokeWidth = Math.max(1, meta.strokeWidth ?? 2);
  const fillColorNum = colorToNumber(meta.fillColor); const fillEnabled = meta.fillEnabled === true || (fillColorNum !== undefined);
  const x = (meta.x ?? meta.startX ?? 0) + offset; const y = (meta.y ?? meta.startY ?? 0) + offset; const w = meta.width ?? Math.abs((meta.currentX ?? 0) - (meta.startX ?? 0)); const h = meta.height ?? Math.abs((meta.currentY ?? 0) - (meta.startY ?? 0));
  switch (meta.shapeType) {
    case 'rectangle': { gfx.rect(x, y, w, h); break; }
    case 'circle': { const cx = x + w / 2; const cy = y + h / 2; const radius = Math.max(Math.abs(w), Math.abs(h)) / 2; gfx.ellipse(cx, cy, radius, radius); break; }
    case 'ellipse': { const cx = x + w / 2; const cy = y + h / 2; gfx.ellipse(cx, cy, Math.abs(w / 2), Math.abs(h / 2)); break; }
    case 'triangle': { const topX = x + w / 2, topY = y; const blX = x, blY = y + h; const brX = x + w, brY = y + h; gfx.moveTo(topX, topY).lineTo(blX, blY).lineTo(brX, brY).closePath(); break; }
    case 'line': { const x1 = meta.startX ?? x, y1 = meta.startY ?? y; const x2 = meta.currentX ?? (x + w), y2 = meta.currentY ?? (y + h); gfx.moveTo(x1, y1).lineTo(x2, y2); break; }
    case 'arrow': { const x1 = meta.startX ?? x, y1 = meta.startY ?? y; const x2 = meta.currentX ?? (x + w), y2 = meta.currentY ?? (y + h); gfx.moveTo(x1, y1).lineTo(x2, y2); const dx = x2 - x1, dy = y2 - y1; const angle = Math.atan2(dy, dx); const length = Math.hypot(dx, dy); const headLength = Math.min(20, length * 0.3); const headAngle = Math.PI / 6; const hx1 = x2 - headLength * Math.cos(angle - headAngle); const hy1 = y2 - headLength * Math.sin(angle - headAngle); const hx2 = x2 - headLength * Math.cos(angle + headAngle); const hy2 = y2 - headLength * Math.sin(angle + headAngle); gfx.moveTo(x2, y2).lineTo(hx1, hy1).moveTo(x2, y2).lineTo(hx2, hy2); break; }
    case 'star': { const points = Math.max(3, meta.points ?? 5); const cx = x + w / 2, cy = y + h / 2; const outerRadius = Math.max(w, h) / 2; const innerRadius = outerRadius * 0.4; for (let i = 0; i < points * 2; i++) { const angle = (i * Math.PI) / points - Math.PI / 2; const radius = i % 2 === 0 ? outerRadius : innerRadius; const px = cx + radius * Math.cos(angle); const py = cy + radius * Math.sin(angle); if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py); } gfx.closePath(); break; }
    case 'square': { const size = Math.min(Math.abs(w), Math.abs(h)); gfx.rect(x, y, size, size); break; }
    case 'rhombus': { const cx = x + w / 2, cy = y + h / 2; const hw = Math.abs(w) / 2, hh = Math.abs(h) / 2; gfx.moveTo(cx, cy - hh).lineTo(cx + hw, cy).lineTo(cx, cy + hh).lineTo(cx - hw, cy).closePath(); break; }
    case 'parallelogram': { const skew = w * 0.3; gfx.moveTo(x + skew, y).lineTo(x + w, y).lineTo(x + w - skew, y + h).lineTo(x, y + h).closePath(); break; }
    case 'trapezoid': { const topWidth = w * 0.6; const sideOffset = (w - topWidth) / 2; gfx.moveTo(x + sideOffset, y).lineTo(x + sideOffset + topWidth, y).lineTo(x + w, y + h).lineTo(x, y + h).closePath(); break; }
    case 'pentagon': { const cx = x + w / 2, cy = y + h / 2; const radius = Math.max(Math.abs(w), Math.abs(h)) / 2; for (let i = 0; i < 5; i++) { const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2; const px = cx + radius * Math.cos(angle); const py = cy + radius * Math.sin(angle); if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py); } gfx.closePath(); break; }
    case 'hexagon': { const cx = x + w / 2, cy = y + h / 2; const radius = Math.max(Math.abs(w), Math.abs(h)) / 2; for (let i = 0; i < 6; i++) { const angle = (i * 2 * Math.PI) / 6 - Math.PI / 2; const px = cx + radius * Math.cos(angle); const py = cy + radius * Math.sin(angle); if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py); } gfx.closePath(); break; }
    case 'octagon': { const cx = x + w / 2, cy = y + h / 2; const radius = Math.max(Math.abs(w), Math.abs(h)) / 2; for (let i = 0; i < 8; i++) { const angle = (i * 2 * Math.PI) / 8 - Math.PI / 2; const px = cx + radius * Math.cos(angle); const py = cy + radius * Math.sin(angle); if (i === 0) gfx.moveTo(px, py); else gfx.lineTo(px, py); } gfx.closePath(); break; }
    case 'sphere': { const cx = x + w / 2, cy = y + h / 2; const radius = Math.min(Math.abs(w), Math.abs(h)) / 2; gfx.ellipse(cx, cy, radius, radius); break; }
    case 'cube': { const size = Math.min(Math.abs(w), Math.abs(h)); const offset = size * 0.3; gfx.rect(x, y, size, size); gfx.moveTo(x, y).lineTo(x + offset, y - offset).lineTo(x + size + offset, y - offset).lineTo(x + size, y); gfx.moveTo(x + size, y).lineTo(x + size + offset, y - offset).lineTo(x + size + offset, y + size - offset).lineTo(x + size, y + size); break; }
    case 'cuboid': { const offset = Math.min(w, h) * 0.25; gfx.rect(x, y, w, h); gfx.moveTo(x, y).lineTo(x + offset, y - offset).lineTo(x + w + offset, y - offset).lineTo(x + w, y); gfx.moveTo(x + w, y).lineTo(x + w + offset, y - offset).lineTo(x + w + offset, y + h - offset).lineTo(x + w, y + h); break; }
    case 'cylinder': { const cx = x + w / 2; const radiusX = w / 2; const radiusY = h * 0.15; gfx.rect(x, y + radiusY, w, h - 2 * radiusY); gfx.ellipse(cx, y + radiusY, radiusX, radiusY); gfx.ellipse(cx, y + h - radiusY, radiusX, radiusY); break; }
    case 'cone': { const cx = x + w / 2; const topX = cx; const topY = y; const baseY = y + h; const radiusX = w / 2; const radiusY = h * 0.15; gfx.moveTo(topX, topY).lineTo(x, baseY - radiusY).lineTo(x + w, baseY - radiusY).closePath(); gfx.ellipse(cx, baseY - radiusY, radiusX, radiusY); break; }
    case 'pyramid': { const cx = x + w / 2; const topX = cx; const topY = y; const baseY = y + h; const offset = w * 0.25; gfx.moveTo(topX, topY).lineTo(x, baseY).lineTo(x + w, baseY).closePath(); gfx.moveTo(topX, topY).lineTo(x + w, baseY).lineTo(x + w + offset, baseY - offset); gfx.moveTo(x, baseY).lineTo(x + w, baseY).lineTo(x + w + offset, baseY - offset).lineTo(x + offset, baseY - offset).closePath(); break; }
    case 'torus': { const cx = x + w / 2, cy = y + h / 2; const outerRadiusX = Math.abs(w) / 2, outerRadiusY = Math.abs(h) / 2; const innerRadiusX = outerRadiusX * 0.4, innerRadiusY = outerRadiusY * 0.4; gfx.ellipse(cx, cy, outerRadiusX, outerRadiusY); gfx.ellipse(cx, cy, innerRadiusX, innerRadiusY); break; }
    case 'prism': { const cx = x + w / 2; const offset = w * 0.3; gfx.moveTo(cx, y).lineTo(x, y + h).lineTo(x + w, y + h).closePath(); gfx.moveTo(cx, y).lineTo(cx + offset, y - offset).lineTo(x + offset, y + h - offset).lineTo(x, y + h); gfx.moveTo(cx, y).lineTo(cx + offset, y - offset).lineTo(x + w + offset, y + h - offset).lineTo(x + w, y + h); break; }
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

// ===== Descriptor utilities for history/clipboard =====
export type TransformDesc = { x: number; y: number; scaleX: number; scaleY: number; rotation: number; pivotX?: number; pivotY?: number; anchorX?: number; anchorY?: number };
export type TextDesc = { kind: 'text'; text: string; style: any; transform: TransformDesc };
export type SpriteDesc = { kind: 'sprite'; texture: Texture; transform: TransformDesc };
export type MetaGraphicsDesc = { kind: 'shapes' | 'pen' | 'brush'; meta: any; transform: TransformDesc };
export type TableCellDesc = { x: number; y: number; width: number; height: number; text: string; style: any };
export type TableDesc = { kind: 'table'; settings: any; cells: TableCellDesc[]; transform: TransformDesc };
export type ContainerDesc = { kind: 'container'; children: NodeDesc[]; transform: TransformDesc };
export type NodeDesc = TextDesc | SpriteDesc | MetaGraphicsDesc | TableDesc | ContainerDesc;

export function transformOf(obj: any): TransformDesc {
  return {
    x: obj.x || 0,
    y: obj.y || 0,
    scaleX: obj.scale?.x ?? 1,
    scaleY: obj.scale?.y ?? 1,
    rotation: obj.rotation ?? 0,
    pivotX: obj.pivot?.x ?? 0,
    pivotY: obj.pivot?.y ?? 0,
    anchorX: (obj as any).anchor?.x,
    anchorY: (obj as any).anchor?.y,
  };
}

export function buildNodeDesc(obj: any): NodeDesc | null {
  const tr = transformOf(obj);
  // Heuristic to detect tool type
  let type: string | null = null;
  let cur: any = obj;
  for (let i = 0; i < 5 && cur; i++) { if (cur.__toolType) { type = String(cur.__toolType); break; } if (cur.constructor?.name === 'Text') { type = 'text'; break; } cur = cur.parent; }
  if (type === 'text') { try { return { kind: 'text', text: String(obj.text ?? ''), style: { ...(obj.style || {}) }, transform: tr }; } catch { return null; } }
  if (type === 'shapes' || type === 'pen' || type === 'brush') { const meta = (obj as any).__meta; if (meta) return { kind: type as any, meta: JSON.parse(JSON.stringify(meta)), transform: tr } as MetaGraphicsDesc; }
  if (obj?.constructor?.name === 'Graphics' && (obj as any).__meta && (obj as any).__meta.kind) {
    const kind = String((obj as any).__meta.kind);
    if (kind === 'shapes' || kind === 'pen' || kind === 'brush') { const meta = (obj as any).__meta; return { kind: kind as any, meta: JSON.parse(JSON.stringify(meta)), transform: tr } as MetaGraphicsDesc; }
  }
  if ((obj as any).isTable || (obj as any).__toolType === 'tables') {
    const settings = (obj as any).__meta || {};
    const cells: TableCellDesc[] = [];
    try { for (const ch of (obj.children || [])) { const cell = (ch as any).tableCell; if (!cell) continue; const textChild = (obj.children || []).find((c: any) => (c as any).tableCell === cell && c.constructor?.name === 'Text'); const text = textChild ? String((textChild as any).text || '') : ''; const style = textChild ? { ...((textChild as any).style || {}) } : {}; cells.push({ x: cell.bounds.x, y: cell.bounds.y, width: cell.bounds.width, height: cell.bounds.height, text, style }); } } catch {}
    return { kind: 'table', settings, cells, transform: tr };
  }
  if ((obj as any).texture) { try { return { kind: 'sprite', texture: (obj as Sprite).texture, transform: tr }; } catch { return null; } }
  if (obj.children && Array.isArray(obj.children) && obj.children.length > 0) {
    const children: NodeDesc[] = []; for (const ch of obj.children) { const d = buildNodeDesc(ch); if (d) children.push(d); }
    return { kind: 'container', children, transform: tr };
  }
  try { if (obj.constructor?.name === 'Graphics') { const tex = (Texture as any).from ? (Texture as any).from(obj) : null; if (tex) return { kind: 'sprite', texture: tex, transform: tr } as any; } } catch {}
  return null;
}

export function applyTransform(obj: any, tr: TransformDesc): void {
  obj.x = tr.x; obj.y = tr.y; obj.rotation = tr.rotation || 0;
  if (obj.pivot) obj.pivot.set(tr.pivotX ?? 0, tr.pivotY ?? 0);
  if (obj.scale) obj.scale.set(tr.scaleX ?? 1, tr.scaleY ?? 1);
  if ((obj as any).anchor && (tr.anchorX !== undefined || tr.anchorY !== undefined)) (obj as any).anchor.set(tr.anchorX ?? 0, tr.anchorY ?? 0);
}

export function constructNodeFromDesc(desc: NodeDesc, target: Container, offset: number = 0): any | any[] | null {
  switch (desc.kind) {
    case 'text': {
      const t = new Text({ text: desc.text, style: desc.style }); (t as any).isTextObject = true; target.addChild(t); applyTransform(t, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset }); return t;
    }
    case 'sprite': { const sp = new Sprite(desc.texture); target.addChild(sp); applyTransform(sp, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset }); return sp; }
    case 'shapes': { const gfx = createShapeFromMeta(JSON.parse(JSON.stringify(desc.meta)), 0); if (!gfx) return null; (gfx as any).__toolType = 'shapes'; (gfx as any).__meta = desc.meta; target.addChild(gfx); applyTransform(gfx, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset }); return gfx; }
    case 'pen': { const gfx = createPenFromMeta(JSON.parse(JSON.stringify(desc.meta)), 0); if (!gfx) return null; (gfx as any).__toolType = 'pen'; (gfx as any).__meta = desc.meta; target.addChild(gfx); applyTransform(gfx, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset }); return gfx; }
    case 'brush': { const gfx = createBrushFromMeta(JSON.parse(JSON.stringify(desc.meta)), 0); if (!gfx) return null; (gfx as any).__toolType = 'brush'; (gfx as any).__meta = desc.meta; target.addChild(gfx); applyTransform(gfx, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset }); return gfx; }
    case 'table': {
      const cont = new Graphics(); (cont as any).isTable = true; (cont as any).__toolType = 'tables'; (cont as any).__meta = desc.settings || {}; target.addChild(cont);
      const borderW = (desc.settings?.borderWidth ?? 1) as number; const borderC = colorToNumber(desc.settings?.borderColor || '#000000') ?? 0x000000; const bgC = colorToNumber(desc.settings?.backgroundColor || '#ffffff') ?? 0xffffff;
      for (const cell of desc.cells) { const g = new Graphics(); g.rect(cell.x, cell.y, cell.width, cell.height); g.fill({ color: bgC }); g.stroke({ width: Math.max(1, borderW), color: borderC }); const txt = new Text({ text: cell.text || '', style: { ...(cell.style || {}) } }); txt.x = cell.x + ((desc.settings?.cellPadding ?? 4) as number); txt.y = cell.y + ((desc.settings?.cellPadding ?? 4) as number); (g as any).tableCell = { bounds: { x: cell.x, y: cell.y, width: cell.width, height: cell.height } }; (txt as any).tableCell = (g as any).tableCell; cont.addChild(g); cont.addChild(txt); }
      applyTransform(cont, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset }); return cont;
    }
    case 'container': { const group = new Container(); target.addChild(group); applyTransform(group, { ...desc.transform, x: desc.transform.x + offset, y: desc.transform.y + offset }); for (const ch of desc.children) { const node = constructNodeFromDesc(ch, group, 0); if (Array.isArray(node)) node.forEach(n => group.addChild(n)); else if (node) group.addChild(node); } return group; }
  }
  return null;
}
