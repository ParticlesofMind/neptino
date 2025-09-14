import { Container, Point, Rectangle } from 'pixi.js';

export function computeCombinedBoundsLocal(objects: any[], container: Container): Rectangle {
  let minWX = Infinity, minWY = Infinity, maxWX = -Infinity, maxWY = -Infinity;
  for (const obj of objects) {
    try {
      const b = obj.getBounds();
      minWX = Math.min(minWX, b.x); minWY = Math.min(minWY, b.y);
      maxWX = Math.max(maxWX, b.x + b.width); maxWY = Math.max(maxWY, b.y + b.height);
    } catch {}
  }
  if (!isFinite(minWX)) return new Rectangle(0, 0, 0, 0);
  const tl = container.toLocal(new Point(minWX, minWY));
  const br = container.toLocal(new Point(maxWX, maxWY));
  const x = Math.min(tl.x, br.x);
  const y = Math.min(tl.y, br.y);
  const w = Math.abs(br.x - tl.x);
  const h = Math.abs(br.y - tl.y);
  return new Rectangle(x, y, w, h);
}

export function boundsInContainer(obj: any, container: Container): Rectangle {
  try {
    const wb = obj.getBounds();
    const tl = container.toLocal(new Point(wb.x, wb.y));
    const br = container.toLocal(new Point(wb.x + wb.width, wb.y + wb.height));
    const x = Math.min(tl.x, br.x);
    const y = Math.min(tl.y, br.y);
    const w = Math.abs(br.x - tl.x);
    const h = Math.abs(br.y - tl.y);
    return new Rectangle(x, y, w, h);
  } catch {
    return new Rectangle(0, 0, 0, 0);
  }
}

export function moveObjectByContainerDelta(obj: any, dx: number, dy: number, container: Container): void {
  if (!obj?.parent) return;
  if (dx === 0 && dy === 0) return;
  try {
    const pAWorld = container.toGlobal(new Point(0, 0));
    const pBWorld = container.toGlobal(new Point(dx, dy));
    const pALocal = obj.parent.toLocal(pAWorld);
    const pBLocal = obj.parent.toLocal(pBWorld);
    obj.position.x += (pBLocal.x - pALocal.x);
    obj.position.y += (pBLocal.y - pALocal.y);
  } catch {}
}

export function detectToolType(obj: any): string | null {
  let cur: any = obj;
  for (let i = 0; i < 5 && cur; i++) {
    if (cur.__toolType) return String(cur.__toolType);
    if (cur.isTextObject === true || cur.constructor?.name === 'Text') return 'text';
    cur = cur.parent;
  }
  return null;
}

export function determineSelectionType(selected: any[]): string | null {
  if (!selected || selected.length === 0) return null;
  let t: string | null = null;
  for (const obj of selected) {
    const tt = detectToolType(obj);
    if (!t) t = tt; else if (tt && t !== tt) return 'mixed';
  }
  return t || 'unknown';
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
