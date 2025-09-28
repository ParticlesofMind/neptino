/**
 * Cylinder Shape Drawer
 * Handles drawing of cylinder shapes with 3D effect
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class CylinderDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const x = Math.min(context.startX, context.startX + context.width);
        const y = Math.min(context.startY, context.startY + context.height);
        const width = Math.abs(context.width);
        const height = Math.abs(context.height);
        
        const centerX = x + width / 2;
        const radiusX = width / 2;
        const radiusY = height * 0.15; // Ellipse height for 3D effect
        
        // Main cylinder body (rectangle)
        this.graphics.rect(x, y + radiusY, width, height - 2 * radiusY);
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
        
        // Top ellipse
        this.graphics.ellipse(centerX, y + radiusY, radiusX, radiusY);
        if (fillStyle) {
            // Lighter shade for top
            this.graphics.fill({ color: fillStyle.color, alpha: 0.8 });
        }
        this.applyStroke(strokeStyle);
        
        // Bottom ellipse
        this.graphics.ellipse(centerX, y + height - radiusY, radiusX, radiusY);
        if (fillStyle) {
            // Darker shade for bottom
            this.graphics.fill({ color: fillStyle.color, alpha: 0.6 });
        }
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Cylinder doesn't need specific proportional constraints
        return context;
    }
}