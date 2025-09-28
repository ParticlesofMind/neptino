/**
 * Torus Shape Drawer
 * Handles drawing of torus (donut) shapes
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class TorusDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const centerX = context.startX + context.width / 2;
        const centerY = context.startY + context.height / 2;
        const outerRadiusX = Math.abs(context.width) / 2;
        const outerRadiusY = Math.abs(context.height) / 2;
        const innerRadiusX = outerRadiusX * 0.4; // Inner hole is 40% of outer radius
        const innerRadiusY = outerRadiusY * 0.4;
        
        // Outer ellipse
        this.graphics.ellipse(centerX, centerY, outerRadiusX, outerRadiusY);
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
        
        // Inner ellipse (hole) - use background color or transparent
        this.graphics.ellipse(centerX, centerY, innerRadiusX, innerRadiusY);
        this.graphics.fill({ color: 0xFFFFFF }); // White fill for hole
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        if (!context.isProportional) {
            return context;
        }
        
        // Make it a circular torus by using the larger dimension
        const maxDim = Math.max(Math.abs(context.width), Math.abs(context.height));
        return {
            ...context,
            width: context.width >= 0 ? maxDim : -maxDim,
            height: context.height >= 0 ? maxDim : -maxDim,
        };
    }
}