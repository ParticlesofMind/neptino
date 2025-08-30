/**
 * Polygon Shape Drawer
 * Handles drawing of regular polygons with configurable number of sides
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class PolygonDrawer extends BaseShapeDrawer {
    private sides: number = 6; // Default hexagon
    
    setSides(sides: number): void {
        this.sides = Math.max(3, sides);
    }
    
    getSides(): number {
        return this.sides;
    }
    
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context) || this.sides < 3) {
            return;
        }

        const centerX = context.startX + context.width / 2;
        const centerY = context.startY + context.height / 2;
        const radius = Math.max(Math.abs(context.width), Math.abs(context.height)) / 2;

        // Generate polygon points
        const points: number[] = [];
        for (let i = 0; i < this.sides; i++) {
            const angle = (i * 2 * Math.PI) / this.sides - Math.PI / 2; // Start from top
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
        
        // Make it a regular polygon by using the larger dimension
        const maxDim = Math.max(Math.abs(context.width), Math.abs(context.height));
        return {
            ...context,
            width: context.width >= 0 ? maxDim : -maxDim,
            height: context.height >= 0 ? maxDim : -maxDim,
        };
    }
}
