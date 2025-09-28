/**
 * Sphere Shape Drawer
 * Handles drawing of sphere shapes (with shading effect)
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class SphereDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const centerX = context.startX + context.width / 2;
        const centerY = context.startY + context.height / 2;
        const radius = Math.min(Math.abs(context.width), Math.abs(context.height)) / 2;
        
        // Draw the main circle
        this.graphics.circle(centerX, centerY, radius);
        
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
        
        // Add highlight circle for 3D effect if fill is enabled
        if (fillStyle) {
            const highlightRadius = radius * 0.3;
            const highlightX = centerX - radius * 0.3;
            const highlightY = centerY - radius * 0.3;
            
            // Create a lighter version of the fill color for highlight
            this.graphics.circle(highlightX, highlightY, highlightRadius);
            this.graphics.fill({ color: 0xFFFFFF, alpha: 0.3 });
        }
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Sphere is always circular - use the smaller dimension
        const minDim = Math.min(Math.abs(context.width), Math.abs(context.height));
        return {
            ...context,
            width: context.width >= 0 ? minDim : -minDim,
            height: context.height >= 0 ? minDim : -minDim,
        };
    }
}