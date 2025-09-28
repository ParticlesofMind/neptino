/**
 * Cone Shape Drawer
 * Handles drawing of cone shapes with 3D effect
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class ConeDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const x = Math.min(context.startX, context.startX + context.width);
        const y = Math.min(context.startY, context.startY + context.height);
        const width = Math.abs(context.width);
        const height = Math.abs(context.height);
        
        const centerX = x + width / 2;
        const topX = centerX;
        const topY = y;
        const baseY = y + height;
        const radiusX = width / 2;
        const radiusY = height * 0.15; // Ellipse height for 3D effect
        
        // Cone body (triangle-like shape with curved base)
        const conePoints: number[] = [
            topX, topY,              // Apex
            x, baseY - radiusY,      // Left base edge
            x + width, baseY - radiusY // Right base edge
        ];
        this.graphics.poly(conePoints);
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
        
        // Base ellipse
        this.graphics.ellipse(centerX, baseY - radiusY, radiusX, radiusY);
        if (fillStyle) {
            // Darker shade for base
            this.graphics.fill({ color: fillStyle.color, alpha: 0.6 });
        }
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Cone doesn't need specific proportional constraints
        return context;
    }
}