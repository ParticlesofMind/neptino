/**
 * Cube Shape Drawer
 * Handles drawing of cube shapes with 3D effect
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class CubeDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const x = Math.min(context.startX, context.startX + context.width);
        const y = Math.min(context.startY, context.startY + context.height);
        const size = Math.min(Math.abs(context.width), Math.abs(context.height));
        
        // 3D offset for depth effect
        const offset = size * 0.3;
        
        // Front face
        this.graphics.rect(x, y, size, size);
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
        
        // Top face (parallelogram)
        const topPoints: number[] = [
            x, y,                    // Front top-left
            x + offset, y - offset,  // Back top-left
            x + size + offset, y - offset, // Back top-right
            x + size, y              // Front top-right
        ];
        this.graphics.poly(topPoints);
        if (fillStyle) {
            // Darker shade for top face
            this.graphics.fill({ color: fillStyle.color, alpha: 0.7 });
        }
        this.applyStroke(strokeStyle);
        
        // Right face (parallelogram)
        const rightPoints: number[] = [
            x + size, y,             // Front top-right
            x + size + offset, y - offset, // Back top-right
            x + size + offset, y + size - offset, // Back bottom-right
            x + size, y + size       // Front bottom-right
        ];
        this.graphics.poly(rightPoints);
        if (fillStyle) {
            // Medium shade for right face
            this.graphics.fill({ color: fillStyle.color, alpha: 0.5 });
        }
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Cube is always square - use the smaller dimension
        const minDim = Math.min(Math.abs(context.width), Math.abs(context.height));
        return {
            ...context,
            width: context.width >= 0 ? minDim : -minDim,
            height: context.height >= 0 ? minDim : -minDim,
        };
    }
}