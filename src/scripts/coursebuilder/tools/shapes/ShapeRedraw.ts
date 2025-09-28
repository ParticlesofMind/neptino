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

    // Handle all shape types
    switch (meta.shapeType) {
      case 'rectangle':
        g.rect(0, 0, w, h);
        break;
      case 'square':
        const size = Math.min(Math.abs(w), Math.abs(h));
        g.rect(0, 0, size, size);
        break;
      case 'triangle':
        drawTriangle(g, 0, 0, w, h);
        break;
      case 'circle':
        const radius = Math.max(Math.abs(w), Math.abs(h)) / 2;
        g.circle(w / 2, h / 2, radius);
        break;
      case 'ellipse':
        g.ellipse(w / 2, h / 2, Math.abs(w / 2), Math.abs(h / 2));
        break;
      case 'rhombus':
        drawRhombus(g, 0, 0, w, h);
        break;
      case 'parallelogram':
        drawParallelogram(g, 0, 0, w, h);
        break;
      case 'trapezoid':
        drawTrapezoid(g, 0, 0, w, h);
        break;
      case 'pentagon':
        drawPolygon(g, 0, 0, w, h, 5);
        break;
      case 'hexagon':
        drawPolygon(g, 0, 0, w, h, 6);
        break;
      case 'octagon':
        drawPolygon(g, 0, 0, w, h, 8);
        break;
      case 'star':
        drawStar(g, 0, 0, w, h, meta.points || 5);
        break;
      case 'sphere':
        drawSphere(g, 0, 0, w, h);
        break;
      case 'cube':
        drawCube(g, 0, 0, w, h);
        break;
      case 'cuboid':
        drawCuboid(g, 0, 0, w, h);
        break;
      case 'cylinder':
        drawCylinder(g, 0, 0, w, h);
        break;
      case 'cone':
        drawCone(g, 0, 0, w, h);
        break;
      case 'pyramid':
        drawPyramid(g, 0, 0, w, h);
        break;
      case 'torus':
        drawTorus(g, 0, 0, w, h);
        break;
      case 'prism':
        drawPrism(g, 0, 0, w, h);
        break;
      case 'line':
        const x1 = meta.startX ?? 0, y1 = meta.startY ?? 0;
        const x2 = meta.currentX ?? w, y2 = meta.currentY ?? h;
        g.moveTo(x1, y1).lineTo(x2, y2);
        break;
      case 'arrow':
        drawArrow(g, meta);
        break;
      default:
        // Fallback to rectangle for unknown shapes
        if (w > 0 && h > 0) {
          g.rect(0, 0, w, h);
        }
        break;
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

function drawRhombus(g: Graphics, x: number, y: number, w: number, h: number) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const halfWidth = Math.abs(w) / 2;
  const halfHeight = Math.abs(h) / 2;
  
  g.moveTo(centerX, centerY - halfHeight); // Top
  g.lineTo(centerX + halfWidth, centerY); // Right
  g.lineTo(centerX, centerY + halfHeight); // Bottom
  g.lineTo(centerX - halfWidth, centerY); // Left
  g.closePath();
}

function drawParallelogram(g: Graphics, x: number, y: number, w: number, h: number) {
  const skew = w * 0.3;
  g.moveTo(x + skew, y);
  g.lineTo(x + w, y);
  g.lineTo(x + w - skew, y + h);
  g.lineTo(x, y + h);
  g.closePath();
}

function drawTrapezoid(g: Graphics, x: number, y: number, w: number, h: number) {
  const topWidth = w * 0.6;
  const sideOffset = (w - topWidth) / 2;
  g.moveTo(x + sideOffset, y);
  g.lineTo(x + sideOffset + topWidth, y);
  g.lineTo(x + w, y + h);
  g.lineTo(x, y + h);
  g.closePath();
}

function drawPolygon(g: Graphics, x: number, y: number, w: number, h: number, sides: number) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.max(Math.abs(w), Math.abs(h)) / 2;
  
  for (let i = 0; i < sides; i++) {
    const angle = (i * 2 * Math.PI) / sides - Math.PI / 2;
    const px = centerX + radius * Math.cos(angle);
    const py = centerY + radius * Math.sin(angle);
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

function drawStar(g: Graphics, x: number, y: number, w: number, h: number, points: number) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const outerRadius = Math.max(Math.abs(w), Math.abs(h)) / 2;
  const innerRadius = outerRadius * 0.4;
  
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const px = centerX + radius * Math.cos(angle);
    const py = centerY + radius * Math.sin(angle);
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  }
  g.closePath();
}

function drawSphere(g: Graphics, x: number, y: number, w: number, h: number) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const radius = Math.min(Math.abs(w), Math.abs(h)) / 2;
  g.circle(centerX, centerY, radius);
}

function drawCube(g: Graphics, x: number, y: number, w: number, h: number) {
  const size = Math.min(Math.abs(w), Math.abs(h));
  const offset = size * 0.3;
  
  // Front face
  g.rect(x, y, size, size);
  
  // Top face
  g.moveTo(x, y);
  g.lineTo(x + offset, y - offset);
  g.lineTo(x + size + offset, y - offset);
  g.lineTo(x + size, y);
  
  // Right face
  g.moveTo(x + size, y);
  g.lineTo(x + size + offset, y - offset);
  g.lineTo(x + size + offset, y + size - offset);
  g.lineTo(x + size, y + size);
}

function drawCuboid(g: Graphics, x: number, y: number, w: number, h: number) {
  const offset = Math.min(w, h) * 0.25;
  
  // Front face
  g.rect(x, y, w, h);
  
  // Top face
  g.moveTo(x, y);
  g.lineTo(x + offset, y - offset);
  g.lineTo(x + w + offset, y - offset);
  g.lineTo(x + w, y);
  
  // Right face
  g.moveTo(x + w, y);
  g.lineTo(x + w + offset, y - offset);
  g.lineTo(x + w + offset, y + h - offset);
  g.lineTo(x + w, y + h);
}

function drawCylinder(g: Graphics, x: number, y: number, w: number, h: number) {
  const centerX = x + w / 2;
  const radiusX = w / 2;
  const radiusY = h * 0.15;
  
  // Main body
  g.rect(x, y + radiusY, w, h - 2 * radiusY);
  
  // Top ellipse
  g.ellipse(centerX, y + radiusY, radiusX, radiusY);
  
  // Bottom ellipse
  g.ellipse(centerX, y + h - radiusY, radiusX, radiusY);
}

function drawCone(g: Graphics, x: number, y: number, w: number, h: number) {
  const centerX = x + w / 2;
  const topX = centerX;
  const topY = y;
  const baseY = y + h;
  const radiusX = w / 2;
  const radiusY = h * 0.15;
  
  // Cone body
  g.moveTo(topX, topY);
  g.lineTo(x, baseY - radiusY);
  g.lineTo(x + w, baseY - radiusY);
  g.closePath();
  
  // Base ellipse
  g.ellipse(centerX, baseY - radiusY, radiusX, radiusY);
}

function drawPyramid(g: Graphics, x: number, y: number, w: number, h: number) {
  const centerX = x + w / 2;
  const topX = centerX;
  const topY = y;
  const baseY = y + h;
  const offset = w * 0.25;
  
  // Front face
  g.moveTo(topX, topY);
  g.lineTo(x, baseY);
  g.lineTo(x + w, baseY);
  g.closePath();
  
  // Right face
  g.moveTo(topX, topY);
  g.lineTo(x + w, baseY);
  g.lineTo(x + w + offset, baseY - offset);
  
  // Base
  g.moveTo(x, baseY);
  g.lineTo(x + w, baseY);
  g.lineTo(x + w + offset, baseY - offset);
  g.lineTo(x + offset, baseY - offset);
  g.closePath();
}

function drawTorus(g: Graphics, x: number, y: number, w: number, h: number) {
  const centerX = x + w / 2;
  const centerY = y + h / 2;
  const outerRadiusX = Math.abs(w) / 2;
  const outerRadiusY = Math.abs(h) / 2;
  const innerRadiusX = outerRadiusX * 0.4;
  const innerRadiusY = outerRadiusY * 0.4;
  
  // Outer ellipse
  g.ellipse(centerX, centerY, outerRadiusX, outerRadiusY);
  
  // Inner ellipse (hole)
  g.ellipse(centerX, centerY, innerRadiusX, innerRadiusY);
}

function drawPrism(g: Graphics, x: number, y: number, w: number, h: number) {
  const centerX = x + w / 2;
  const offset = w * 0.3;
  
  // Front triangular face
  g.moveTo(centerX, y);
  g.lineTo(x, y + h);
  g.lineTo(x + w, y + h);
  g.closePath();
  
  // Left face
  g.moveTo(centerX, y);
  g.lineTo(centerX + offset, y - offset);
  g.lineTo(x + offset, y + h - offset);
  g.lineTo(x, y + h);
  
  // Right face
  g.moveTo(centerX, y);
  g.lineTo(centerX + offset, y - offset);
  g.lineTo(x + w + offset, y + h - offset);
  g.lineTo(x + w, y + h);
}

function drawArrow(g: Graphics, meta: any) {
  const x1 = meta.startX ?? 0;
  const y1 = meta.startY ?? 0;
  const x2 = meta.currentX ?? 0;
  const y2 = meta.currentY ?? 0;
  
  // Arrow line
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  
  // Arrow head
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx);
  const length = Math.hypot(dx, dy);
  const headLength = Math.min(20, length * 0.3);
  const headAngle = Math.PI / 6;
  
  const hx1 = x2 - headLength * Math.cos(angle - headAngle);
  const hy1 = y2 - headLength * Math.sin(angle - headAngle);
  const hx2 = x2 - headLength * Math.cos(angle + headAngle);
  const hy2 = y2 - headLength * Math.sin(angle + headAngle);
  
  g.moveTo(x2, y2);
  g.lineTo(hx1, hy1);
  g.moveTo(x2, y2);
  g.lineTo(hx2, hy2);
}

