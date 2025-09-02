import { Matrix, Point, Rectangle } from 'pixi.js';

/**
 * Provides matrix-based transformation utilities for unified object manipulation.
 * This class replaces the dual-path scaling logic with a single matrix-based approach.
 */
export class MatrixTransforms {
    
    /**
     * Applies a scaling transformation to an object using matrix operations.
     * This provides consistent behavior regardless of the object's current rotation.
     * 
     * @param object The PIXI object to scale
     * @param scaleX The X-axis scale factor
     * @param scaleY The Y-axis scale factor
     * @param anchorPoint The point to scale around (in world coordinates)
     */
    public static scaleObjectFromAnchor(
        object: any,
        scaleX: number,
        scaleY: number,
        anchorPoint: Point
    ): void {
        // Convert anchor point to object's local space
        const localAnchor = object.toLocal(anchorPoint);
        
        // Create scaling matrix around the local anchor point
        const scaleMatrix = new Matrix();
        
        // Translate to anchor, scale, then translate back
        scaleMatrix.translate(-localAnchor.x, -localAnchor.y);
        scaleMatrix.scale(scaleX, scaleY);
        scaleMatrix.translate(localAnchor.x, localAnchor.y);
        
        // Apply the transformation by combining with existing transform
        const currentMatrix = object.transform.worldTransform.clone();
        const newMatrix = currentMatrix.prepend(scaleMatrix);
        
        // Extract the new transform values
        object.transform.setFromMatrix(newMatrix);
    }
    
    /**
     * Applies a rotation to an object around a specific world point without affecting pivot.
     * 
     * @param object The PIXI object to rotate
     * @param angle The rotation angle in radians
     * @param rotationCenter The point to rotate around (in world coordinates)
     */
    public static rotateObjectAroundPoint(
        object: any,
        angle: number,
        rotationCenter: Point
    ): void {
        // Convert rotation center to object's local space
        const localCenter = object.toLocal(rotationCenter);
        
        // Create rotation matrix around the local center
        const rotationMatrix = new Matrix();
        
        // Translate to center, rotate, then translate back
        rotationMatrix.translate(-localCenter.x, -localCenter.y);
        rotationMatrix.rotate(angle);
        rotationMatrix.translate(localCenter.x, localCenter.y);
        
        // Apply the transformation by combining with existing transform
        const currentMatrix = object.transform.worldTransform.clone();
        const newMatrix = currentMatrix.prepend(rotationMatrix);
        
        // Extract the new transform values
        object.transform.setFromMatrix(newMatrix);
    }
    
    /**
     * Calculates the world bounds of an object after applying a hypothetical transformation.
     * This is useful for preview calculations without actually modifying the object.
     * 
     * @param object The PIXI object
     * @param scaleX The X-axis scale factor (optional, defaults to 1)
     * @param scaleY The Y-axis scale factor (optional, defaults to 1)
     * @param rotation The rotation angle in radians (optional, defaults to 0)
     * @param anchorPoint The transformation anchor point (optional, defaults to object center)
     * @returns The predicted world bounds as a Rectangle
     */
    public static getTransformedBounds(
        object: any,
        scaleX: number = 1,
        scaleY: number = 1,
        rotation: number = 0,
        anchorPoint?: Point
    ): Rectangle {
        // If no anchor provided, use object's current world center
        if (!anchorPoint) {
            const currentBounds = object.getBounds(true);
            anchorPoint = new Point(
                currentBounds.x + currentBounds.width * 0.5,
                currentBounds.y + currentBounds.height * 0.5
            );
        }
        
        // Create transformation matrix
        const localAnchor = object.toLocal(anchorPoint);
        const transformMatrix = new Matrix();
        
        transformMatrix.translate(-localAnchor.x, -localAnchor.y);
        transformMatrix.scale(scaleX, scaleY);
        transformMatrix.rotate(rotation);
        transformMatrix.translate(localAnchor.x, localAnchor.y);
        
        // Apply to current transform to get predicted world transform
        const currentMatrix = object.transform.worldTransform.clone();
        const predictedMatrix = currentMatrix.prepend(transformMatrix);
        
        // Calculate bounds using the predicted transform
        // This is an approximation - for exact bounds we'd need to transform all vertices
        const localBounds = object.getLocalBounds();
        const corners = [
            new Point(localBounds.x, localBounds.y),
            new Point(localBounds.x + localBounds.width, localBounds.y),
            new Point(localBounds.x + localBounds.width, localBounds.y + localBounds.height),
            new Point(localBounds.x, localBounds.y + localBounds.height)
        ];
        
        // Transform corners to world space
        const worldCorners = corners.map(corner => {
            return predictedMatrix.apply(corner);
        });
        
        // Find bounding box of transformed corners
        let minX = worldCorners[0].x;
        let minY = worldCorners[0].y;
        let maxX = worldCorners[0].x;
        let maxY = worldCorners[0].y;
        
        for (let i = 1; i < worldCorners.length; i++) {
            const corner = worldCorners[i];
            minX = Math.min(minX, corner.x);
            minY = Math.min(minY, corner.y);
            maxX = Math.max(maxX, corner.x);
            maxY = Math.max(maxY, corner.y);
        }
        
        return new Rectangle(minX, minY, maxX - minX, maxY - minY);
    }
    
    /**
     * Utility to decompose a matrix into scale, rotation, and translation components.
     * Useful for debugging and understanding applied transformations.
     * 
     * @param matrix The matrix to decompose
     * @returns An object with scale, rotation, and translation components
     */
    public static decompose(matrix: Matrix): {
        scaleX: number;
        scaleY: number;
        rotation: number;
        x: number;
        y: number;
        skewX: number;
        skewY: number;
    } {
        const { a, b, c, d, tx, ty } = matrix;
        
        // Calculate scale
        const scaleX = Math.sqrt(a * a + b * b);
        const scaleY = Math.sqrt(c * c + d * d);
        
        // Calculate rotation (from X-axis)
        const rotation = Math.atan2(b, a);
        
        // Calculate skew
        const skewX = Math.atan2(-c, d) - rotation;
        const skewY = Math.atan2(b, a) - rotation;
        
        return {
            scaleX,
            scaleY,
            rotation,
            x: tx,
            y: ty,
            skewX,
            skewY
        };
    }
}
