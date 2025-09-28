/**
 * Star Shape Drawer
 * Handles drawing of star shapes with configurable number of points
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class StarDrawer extends BaseShapeDrawer {
    private points: number = 5; // Default 5-pointed star
    
    setPoints(points: number): void {
        this.points = Math.max(3, points);
    }
    
    getPoints(): number {
        return this.points;
    }
    
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context) || this.points < 3) {
            return;
        }
        
        const centerX = context.startX + context.width / 2;
        const centerY = context.startY + context.height / 2;
        const outerRadius = Math.max(Math.abs(context.width), Math.abs(context.height)) / 2;
        const innerRadius = outerRadius * 0.4; // Inner radius is 40% of outer radius
        
        // Generate star points
        const starPoints: number[] = [];
        for (let i = 0; i < this.points * 2; i++) {
            const angle = (i * Math.PI) / this.points - Math.PI / 2; // Start from top
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            starPoints.push(x, y);
        }
        
        this.graphics.poly(starPoints);
        
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        if (!context.isProportional) {
            return context;
        }
        
        // Make it a regular star by using the larger dimension
        const maxDim = Math.max(Math.abs(context.width), Math.abs(context.height));
        return {
            ...context,
            width: context.width >= 0 ? maxDim : -maxDim,
            height: context.height >= 0 ? maxDim : -maxDim,
        };
    }
}