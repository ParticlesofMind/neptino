/**
 * Shape Tool Types and Interfaces
 * Defines the data structures and settings for the shapes tool system
 */

export interface ShapesSettings {
    color: string;
    strokeWidth: number;
    fillColor?: string;
    fillEnabled: boolean;
    shapeType:
        | "rectangle"
        | "square"
        | "triangle" 
        | "circle"
        | "ellipse"
        | "rhombus"
        | "parallelogram"
        | "trapezoid"
        | "pentagon"
        | "hexagon"
        | "octagon"
        | "star"
        | "sphere"
        | "cube"
        | "cuboid"
        | "cylinder"
        | "cone"
        | "pyramid"
        | "torus"
        | "prism"
        | "line"
        | "arrow";

    sides?: number; // For polygons (deprecated, use specific shape types instead)
    points?: number; // For stars
}

export interface ShapeDrawingContext {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    width: number;
    height: number;
    isProportional: boolean;
}

export interface StrokeStyle {
    width: number;
    color: number;
    cap: "round" | "square" | "butt";
    join: "round" | "bevel" | "miter";
}

export interface FillStyle {
    color: number;
}
