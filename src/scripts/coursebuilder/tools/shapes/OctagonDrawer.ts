/**
 * Octagon Shape Drawer
 * Handles drawing of regular octagons (8-sided polygons)
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class OctagonDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const centerX = context.startX + context.width / 2;
        const centerY = context.startY + context.height / 2;
        const radius = Math.max(Math.abs(context.width), Math.abs(context.height)) / 2;
        
        // Generate octagon points (8 sides)
        const points: number[] = [];
        for (let i = 0; i < 8; i++) {
            const angle = (i * 2 * Math.PI) / 8 - Math.PI / 2; // Start from top
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            points.push(x, y);
        }
        
        this.graphics.poly(points);
        
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        if (!context.isProportional) {
            return context;
        }
        
        // Make it a regular octagon by using the larger dimension
        const maxDim = Math.max(Math.abs(context.width), Math.abs(context.height));
        return {
            ...context,
            width: context.width >= 0 ? maxDim : -maxDim,
            height: context.height >= 0 ? maxDim : -maxDim,
        };
    }
}