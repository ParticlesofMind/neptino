/**
 * Cuboid Shape Drawer
 * Handles drawing of cuboid (rectangular prism) shapes with 3D effect
 */

import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { ShapeDrawingContext, StrokeStyle, FillStyle } from "./types";

export class CuboidDrawer extends BaseShapeDrawer {
    draw(context: ShapeDrawingContext, strokeStyle: StrokeStyle, fillStyle?: FillStyle): void {
        if (!this.isValidSize(context)) {
            return;
        }
        
        const x = Math.min(context.startX, context.startX + context.width);
        const y = Math.min(context.startY, context.startY + context.height);
        const width = Math.abs(context.width);
        const height = Math.abs(context.height);
        
        // 3D offset for depth effect
        const offset = Math.min(width, height) * 0.25;
        
        // Front face
        this.graphics.rect(x, y, width, height);
        this.applyFill(fillStyle);
        this.applyStroke(strokeStyle);
        
        // Top face (parallelogram)
        const topPoints: number[] = [
            x, y,                    // Front top-left
            x + offset, y - offset,  // Back top-left
            x + width + offset, y - offset, // Back top-right
            x + width, y             // Front top-right
        ];
        this.graphics.poly(topPoints);
        if (fillStyle) {
            // Darker shade for top face
            this.graphics.fill({ color: fillStyle.color, alpha: 0.7 });
        }
        this.applyStroke(strokeStyle);
        
        // Right face (parallelogram)
        const rightPoints: number[] = [
            x + width, y,            // Front top-right
            x + width + offset, y - offset, // Back top-right
            x + width + offset, y + height - offset, // Back bottom-right
            x + width, y + height    // Front bottom-right
        ];
        this.graphics.poly(rightPoints);
        if (fillStyle) {
            // Medium shade for right face
            this.graphics.fill({ color: fillStyle.color, alpha: 0.5 });
        }
        this.applyStroke(strokeStyle);
    }
    
    applyProportionalConstraints(context: ShapeDrawingContext): ShapeDrawingContext {
        // Cuboid can be rectangular, no proportional constraints needed
        return context;
    }
}