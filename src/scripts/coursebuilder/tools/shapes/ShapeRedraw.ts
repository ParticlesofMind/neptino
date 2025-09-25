import { Graphics, Point } from 'pixi.js';



const DEBUG_REDRAW = true; // Set to true for verbose logging

export function redrawShapeFromMeta(g: Graphics): boolean {
  const meta = (g as any).__meta as any;
  
  if (DEBUG_REDRAW) {
    console.log('🔍 REDRAW ENTRY - meta check:', {
      'has_meta': !!meta,
      'meta_kind': meta?.kind,
      'meta_shapeType': meta?.shapeType
    });
  }
  
  if (!meta || meta.kind !== 'shapes') {
    return false;
  }
  
  if (DEBUG_REDRAW) {
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
  }
  
  try {
    // Styles
    const strokeWidth = Math.max(1, Number(meta.strokeWidth || 1));
    const strokeColor = Number(meta.strokeColor || 0x000000);
    const fillEnabled = !!meta.fillEnabled;
    const fillColor = Number(meta.fillColor || 0xffffff);

    // CRITICAL: Get position from meta, but NEVER default to (0,0) if object has real position
    let x = meta.x ?? meta.startX ?? g.x ?? 0;
    let y = meta.y ?? meta.startY ?? g.y ?? 0;
    
    // SAFETY: If meta would place us at (0,0) but object is currently elsewhere, use object position
    if (x === 0 && y === 0 && (g.x !== 0 || g.y !== 0)) {
      console.warn('🚨 CRITICAL - Meta wants (0,0) but object at real position, using object position');
      x = g.x;
      y = g.y;
    }
    const w = meta.width ?? (g.getLocalBounds?.()?.width || (g as any).width || 0);
    const h = meta.height ?? (g.getLocalBounds?.()?.height || (g as any).height || 0);

    if (DEBUG_REDRAW) {
      console.log('🔍 REDRAW DEBUG - CALCULATED COORDINATES:', {
        'calculated_x': x,
        'calculated_y': y,
        'calculated_w': w,
        'calculated_h': h,
        'meta.x_exists': meta.x !== undefined,
        'meta.startX_exists': meta.startX !== undefined
      });
    }

    // CRITICAL FIX: The shape should be drawn at (0,0) in local coordinates,
    // and the object position should be set to the meta coordinates
    g.clear();

    if (meta.shapeType === 'rectangle') {
      g.rect(0, 0, w, h); // Draw at 0,0 in local space
    } else if (meta.shapeType === 'triangle') {
      drawTriangle(g, 0, 0, w, h); // Draw at 0,0 in local space
    } else {
      // Unsupported shape; do nothing special
      if (w > 0 && h > 0) {
        g.rect(0, 0, w, h); // Draw at 0,0 in local space
      }
    }

    if (fillEnabled) g.fill({ color: fillColor });
    g.stroke({ width: strokeWidth, color: strokeColor, cap: 'round', join: 'round' });
    
    // Set the object position to the meta coordinates (global position)
    // SAFETY: Never move to (0,0) if object currently has a real position
    if (x === 0 && y === 0 && (g.x !== 0 || g.y !== 0)) {
      // Keep current position if meta would move us to origin
      if (DEBUG_REDRAW) {
        console.warn('🚨 PREVENTED (0,0) jump - keeping current position:', { 
          current_x: g.x, 
          current_y: g.y, 
          meta_x: x, 
          meta_y: y 
        });
      }
    } else {
      g.x = x;
      g.y = y;
    }
    
    if (DEBUG_REDRAW) {
      console.log('🔍 REDRAW DEBUG - AFTER:', {
        'object.x': g.x,
        'object.y': g.y,
        'used_x': x,
        'used_y': y,
        'bounds_after': g.getLocalBounds()
      });
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

function drawTriangle(g: Graphics, x: number, y: number, w: number, h: number) {
  const vTop = new Point(x + w / 2, y);
  const vBL = new Point(x, y + h);
  const vBR = new Point(x + w, y + h);
  
  g.moveTo(vTop.x, vTop.y);
  g.lineTo(vBR.x, vBR.y);
  g.lineTo(vBL.x, vBL.y);
  g.closePath();
}

