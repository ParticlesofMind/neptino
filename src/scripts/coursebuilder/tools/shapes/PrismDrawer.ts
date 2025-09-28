/**
 * Prism Shape Drawer
 * Handles drawing of triangular prism shapes with 3D effect
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class PrismDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const x = Math.min(context.startX, context.startX + context.width);
        const y = Math.min(context.startY, context.startY + context.height);
        const width = Math.abs(context.width);
        const height = Math.abs(context.height);
        
        // 3D offset for depth effect
        const offset = width * 0.3;
        
        // Front triangular face
        const frontPoints: number[] = [
            x + width / 2, y,        // Top vertex
            x, y + height,           // Bottom left
            x + width, y + height    // Bottom right
        ];
        this.graphics.poly(frontPoints);
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
        
        // Back triangular face (slightly offset)
        const backPoints: number[] = [
            x + width / 2 + offset, y - offset,     // Top vertex
            x + offset, y + height - offset,        // Bottom left
            x + width + offset, y + height - offset // Bottom right
        ];
        this.graphics.poly(backPoints);
        if (fillStyle) {
            // Lighter shade for back face
            this.graphics.fill({ color: fillStyle.color, alpha: 0.4 });
        }
        this.applyStroke(strokeStyle);
        
        // Left face (parallelogram)
        const leftPoints: number[] = [
            x + width / 2, y,                       // Front top
            x + width / 2 + offset, y - offset,     // Back top
            x + offset, y + height - offset,        // Back bottom left
            x, y + height                           // Front bottom left
        ];
        this.graphics.poly(leftPoints);
        if (fillStyle) {
            // Medium shade for left face
            this.graphics.fill({ color: fillStyle.color, alpha: 0.6 });
        }
        this.applyStroke(strokeStyle);
        
        // Right face (parallelogram)
        const rightPoints: number[] = [
            x + width / 2, y,                       // Front top
            x + width / 2 + offset, y - offset,     // Back top
            x + width + offset, y + height - offset, // Back bottom right
            x + width, y + height                   // Front bottom right
        ];
        this.graphics.poly(rightPoints);
        if (fillStyle) {
            // Darker shade for right face
            this.graphics.fill({ color: fillStyle.color, alpha: 0.7 });
        }
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Prism doesn't need specific proportional constraints
        return context;
    }
}