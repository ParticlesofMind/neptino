/**
 * Shape Drawer Factory
 * Manages creation and access to shape drawer instances
 */

import { Graphics } from "pixi.js";
import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { RectangleDrawer } from "./RectangleDrawer";
import { SquareDrawer } from "./SquareDrawer";
import { TriangleDrawer } from "./TriangleDrawer";
import { CircleDrawer } from "./CircleDrawer";
import { EllipseDrawer } from "./EllipseDrawer";
import { RhombusDrawer } from "./RhombusDrawer";
import { ParallelogramDrawer } from "./ParallelogramDrawer";
import { TrapezoidDrawer } from "./TrapezoidDrawer";
import { PentagonDrawer } from "./PentagonDrawer";
import { HexagonDrawer } from "./HexagonDrawer";
import { OctagonDrawer } from "./OctagonDrawer";
import { StarDrawer } from "./StarDrawer";
import { SphereDrawer } from "./SphereDrawer";
import { CubeDrawer } from "./CubeDrawer";
import { CuboidDrawer } from "./CuboidDrawer";
import { CylinderDrawer } from "./CylinderDrawer";
import { ConeDrawer } from "./ConeDrawer";
import { PyramidDrawer } from "./PyramidDrawer";
import { TorusDrawer } from "./TorusDrawer";
import { PrismDrawer } from "./PrismDrawer";
import { LineDrawer } from "./LineDrawer";
import { ArrowDrawer } from "./ArrowDrawer";
import { ShapesSettings } from "./types";

export class ShapeDrawerFactory {
    private drawers: Map<string, BaseShapeDrawer> = new Map();
    
    constructor(private graphics: Graphics) {
        this.initializeDrawers();
    }
    
    private initializeDrawers(): void {
        // Basic 2D shapes
        this.drawers.set("rectangle", new RectangleDrawer(this.graphics));
        this.drawers.set("square", new SquareDrawer(this.graphics));
        this.drawers.set("triangle", new TriangleDrawer(this.graphics));
        this.drawers.set("circle", new CircleDrawer(this.graphics));
        this.drawers.set("ellipse", new EllipseDrawer(this.graphics));
        
        // Quadrilaterals
        this.drawers.set("rhombus", new RhombusDrawer(this.graphics));
        this.drawers.set("parallelogram", new ParallelogramDrawer(this.graphics));
        this.drawers.set("trapezoid", new TrapezoidDrawer(this.graphics));
        
        // Polygons
        this.drawers.set("pentagon", new PentagonDrawer(this.graphics));
        this.drawers.set("hexagon", new HexagonDrawer(this.graphics));
        this.drawers.set("octagon", new OctagonDrawer(this.graphics));
        this.drawers.set("star", new StarDrawer(this.graphics));
        
        // 3D shapes
        this.drawers.set("sphere", new SphereDrawer(this.graphics));
        this.drawers.set("cube", new CubeDrawer(this.graphics));
        this.drawers.set("cuboid", new CuboidDrawer(this.graphics));
        this.drawers.set("cylinder", new CylinderDrawer(this.graphics));
        this.drawers.set("cone", new ConeDrawer(this.graphics));
        this.drawers.set("pyramid", new PyramidDrawer(this.graphics));
        this.drawers.set("torus", new TorusDrawer(this.graphics));
        this.drawers.set("prism", new PrismDrawer(this.graphics));
        
        // Lines and arrows
        this.drawers.set("line", new LineDrawer(this.graphics));
        this.drawers.set("arrow", new ArrowDrawer(this.graphics));
    }
    
    getDrawer(shapeType: ShapesSettings["shapeType"]): BaseShapeDrawer | null {
        return this.drawers.get(shapeType) || null;
    }
    
    getRectangleDrawer(): RectangleDrawer {
        return this.drawers.get("rectangle") as RectangleDrawer;
    }
    
    getStarDrawer(): StarDrawer {
        return this.drawers.get("star") as StarDrawer;
    }
    
    /**
     * Update graphics context for all drawers (when new shape is created)
     */
    updateGraphics(graphics: Graphics): void {
        this.graphics = graphics;
        this.drawers.clear();
        this.initializeDrawers();
    }
    
    /**
     * Get available shape types
     */
    static getAvailableShapeTypes(): string[] {
        return [
            "rectangle",
            "triangle", 
            "circle",
            "line",
            "arrow",
            "polygon",
        ];
    }
    
    /**
     * Get shape type display names
     */
    static getShapeTypeNames(): { [key: string]: string } {
        return {
            rectangle: "Rectangle",
            triangle: "Triangle", 
            circle: "Circle",
            line: "Line",
            arrow: "Arrow",
            polygon: "Polygon",
        };
    }
}
