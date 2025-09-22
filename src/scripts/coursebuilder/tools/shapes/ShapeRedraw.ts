import { Graphics, Point } from 'pixi.js';

type CornerKey = 'tl' | 'tr' | 'br' | 'bl';
type TriKey = 't' | 'bl' | 'br';

export type CornerRadii = Partial<Record<CornerKey, number>> & Partial<Record<TriKey, number>>;

export function redrawShapeFromMeta(g: Graphics): boolean {
  const meta = (g as any).__meta as any;
  
  console.log('🔍 REDRAW ENTRY - meta check:', {
    'has_meta': !!meta,
    'meta_kind': meta?.kind,
    'meta_shapeType': meta?.shapeType
  });
  
  if (!meta || meta.kind !== 'shapes') {
    return false;
  }
  
  // DEBUG: Log object state before redraw
  console.log('🔍 REDRAW DEBUG - BEFORE:', {
    'object.x': g.x,
    'object.y': g.y,
    'meta.x': meta.x,
    'meta.y': meta.y,
    'meta.startX': meta.startX,
    'meta.startY': meta.startY,
    'meta.width': meta.width,
    'meta.height': meta.height,
    'bounds': g.getLocalBounds()
  });
  
  try {
    // Styles
    const strokeWidth = Math.max(1, Number(meta.strokeWidth || 1));
    const strokeColor = Number(meta.strokeColor || 0x000000);
    const fillEnabled = !!meta.fillEnabled;
    const fillColor = Number(meta.fillColor || 0xffffff);

    // Use stored original dimensions from meta to prevent displacement
    // Fall back to current bounds only if meta dimensions are missing
    // Use same fallback logic as createShapeFromMeta to ensure consistency
    const x = meta.x ?? meta.startX ?? 0;
    const y = meta.y ?? meta.startY ?? 0;
    const w = meta.width ?? (g.getLocalBounds?.()?.width || (g as any).width || 0);
    const h = meta.height ?? (g.getLocalBounds?.()?.height || (g as any).height || 0);

    console.log('🔍 REDRAW DEBUG - CALCULATED COORDINATES:', {
      'calculated_x': x,
      'calculated_y': y,
      'calculated_w': w,
      'calculated_h': h,
      'meta.x_exists': meta.x !== undefined,
      'meta.startX_exists': meta.startX !== undefined
    });

    // CRITICAL FIX: The shape should be drawn at (0,0) in local coordinates,
    // and the object position should be set to the meta coordinates
    g.clear();

    if (meta.shapeType === 'rectangle') {
      const radii: CornerRadii = normalizeRectRadii(meta, w, h);
      drawRoundedRect(g, 0, 0, w, h, radii); // Draw at 0,0 in local space
    } else if (meta.shapeType === 'triangle') {
      const radii: CornerRadii = normalizeTriRadii(meta);
      drawRoundedTriangle(g, 0, 0, w, h, radii); // Draw at 0,0 in local space
    } else {
      // Unsupported shape; do nothing special
      if (w > 0 && h > 0) {
        g.rect(0, 0, w, h); // Draw at 0,0 in local space
      }
    }

    if (fillEnabled) g.fill({ color: fillColor });
    g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' });
    
    // Set the object position to the meta coordinates (global position)
    g.x = x;
    g.y = y;
    
    // DEBUG: Log object state after redraw
    console.log('🔍 REDRAW DEBUG - AFTER:', {
      'object.x': g.x,
      'object.y': g.y,
      'used_x': x,
      'used_y': y,
      'bounds_after': g.getLocalBounds()
    });
    
    return true;
  } catch (error) {
    return false;
  }
}

function normalizeRectRadii(meta: any, w: number, h: number): CornerRadii {
  const halfW = Math.max(0, w * 0.5);
  const halfH = Math.max(0, h * 0.5);
  const clamp = (v: number) => Math.max(0, Math.min(v, Math.min(halfW, halfH)));
  const mode = meta.cornerMode || 'uniform';
  const r = Math.max(0, Number(meta.cornerRadius || 0));
  const rr = meta.cornerRadii || {};
  if (mode === 'uniform') {
    const c = clamp(r);
    return { tl: c, tr: c, br: c, bl: c };
  }
  return {
    tl: clamp(Number(rr.tl || 0)),
    tr: clamp(Number(rr.tr || 0)),
    br: clamp(Number(rr.br || 0)),
    bl: clamp(Number(rr.bl || 0)),
  };
}

function drawRoundedRect(g: Graphics, x: number, y: number, w: number, h: number, radii: CornerRadii) {
  const tl = Math.max(0, Number(radii.tl || 0));
  const tr = Math.max(0, Number(radii.tr || 0));
  const br = Math.max(0, Number(radii.br || 0));
  const bl = Math.max(0, Number(radii.bl || 0));

  if (tl === 0 && tr === 0 && br === 0 && bl === 0) {
    g.rect(x, y, w, h);
    return;
  }

  g.moveTo(x + tl, y);
  g.lineTo(x + w - tr, y);
  if (tr > 0) g.quadraticCurveTo(x + w, y, x + w, y + tr);
  g.lineTo(x + w, y + h - br);
  if (br > 0) g.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
  g.lineTo(x + bl, y + h);
  if (bl > 0) g.quadraticCurveTo(x, y + h, x, y + h - bl);
  g.lineTo(x, y + tl);
  if (tl > 0) g.quadraticCurveTo(x, y, x + tl, y);
  g.closePath();
}

function normalizeTriRadii(meta: any): CornerRadii {
  const rr = meta.cornerRadii || {};
  const mode = meta.cornerMode || 'uniform';
  const r = Math.max(0, Number(meta.cornerRadius || 0));
  if (mode === 'uniform') {
    const c = Math.max(0, r);
    return { t: c, bl: c, br: c } as any;
  }
  return {
    t: Math.max(0, Number(rr.t || 0)) as any,
    bl: Math.max(0, Number(rr.bl || 0)),
    br: Math.max(0, Number(rr.br || 0)),
  } as any;
}

function drawRoundedTriangle(g: Graphics, x: number, y: number, w: number, h: number, radii: CornerRadii) {
  const vTop = new Point(x + w / 2, y);
  const vBL = new Point(x, y + h);
  const vBR = new Point(x + w, y + h);
  const vertices = [vTop, vBR, vBL]; // clockwise
  const keys: (TriKey)[] = ['t', 'br', 'bl'];
  const rs: number[] = keys.map((k) => Math.max(0, Number((radii as any)[k] || 0)));

  const pIn: Point[] = [];
  const pOut: Point[] = [];

  const norm = (dx: number, dy: number) => {
    const m = Math.hypot(dx, dy) || 1; return { x: dx / m, y: dy / m, m };
  };

  for (let i = 0; i < 3; i++) {
    const vi = vertices[i];
    const vPrev = vertices[(i + 2) % 3];
    const vNext = vertices[(i + 1) % 3];
    const ePrev = norm(vPrev.x - vi.x, vPrev.y - vi.y);
    const eNext = norm(vNext.x - vi.x, vNext.y - vi.y);
    // Max radius limited by half of adjacent edge lengths
    const rMax = Math.min(ePrev.m * 0.5, eNext.m * 0.5);
    const r = Math.min(rs[i], rMax);
    const pin = new Point(vi.x + ePrev.x * r, vi.y + ePrev.y * r);
    const pout = new Point(vi.x + eNext.x * r, vi.y + eNext.y * r);
    pIn.push(pin); pOut.push(pout);
  }

  // Start at previous vertex's out point to close nicely
  g.moveTo(pOut[2].x, pOut[2].y);
  for (let i = 0; i < 3; i++) {
    g.lineTo(pIn[i].x, pIn[i].y);
    g.quadraticCurveTo(vertices[i].x, vertices[i].y, pOut[i].x, pOut[i].y);
  }
  g.closePath();
}

