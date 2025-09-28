/**
 * Pyramid Shape Drawer
 * Handles drawing of pyramid shapes with 3D effect
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class PyramidDrawer extends BaseShapeDrawer {
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
        
        // 3D offset for depth effect
        const offset = width * 0.25;
        
        // Front face (triangle)
        const frontPoints: number[] = [
            topX, topY,              // Apex
            x, baseY,                // Left base
            x + width, baseY         // Right base
        ];
        this.graphics.poly(frontPoints);
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
        
        // Right face (triangle)
        const rightPoints: number[] = [
            topX, topY,              // Apex
            x + width, baseY,        // Front right base
            x + width + offset, baseY - offset // Back right base
        ];
        this.graphics.poly(rightPoints);
        if (fillStyle) {
            // Darker shade for right face
            this.graphics.fill({ color: fillStyle.color, alpha: 0.6 });
        }
        this.applyStroke(strokeStyle);
        
        // Base (parallelogram)
        const basePoints: number[] = [
            x, baseY,                // Front left
            x + width, baseY,        // Front right
            x + width + offset, baseY - offset, // Back right
            x + offset, baseY - offset // Back left
        ];
        this.graphics.poly(basePoints);
        if (fillStyle) {
            // Medium shade for base
            this.graphics.fill({ color: fillStyle.color, alpha: 0.4 });
        }
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Pyramid doesn't need specific proportional constraints
        return context;
    }
}