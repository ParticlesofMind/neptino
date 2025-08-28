/**
 * Shape Drawer Factory
 * Manages creation and access to shape drawer instances
 */

import { Graphics } from "pixi.js";
import { BaseShapeDrawer } from "./BaseShapeDrawer";
import { RectangleDrawer } from "./RectangleDrawer";
import { TriangleDrawer } from "./TriangleDrawer";
import { CircleDrawer } from "./CircleDrawer";
import { EllipseDrawer } from "./EllipseDrawer";
import { LineDrawer } from "./LineDrawer";
import { ArrowDrawer } from "./ArrowDrawer";
import { PolygonDrawer } from "./PolygonDrawer";
import { ShapesSettings } from "./types";

export class ShapeDrawerFactory {
    private drawers: Map<string, BaseShapeDrawer> = new Map();
    
    constructor(private graphics: Graphics) {
        this.initializeDrawers();
    }
    
    private initializeDrawers(): void {
        this.drawers.set("rectangle", new RectangleDrawer(this.graphics));
        this.drawers.set("triangle", new TriangleDrawer(this.graphics));
        this.drawers.set("circle", new CircleDrawer(this.graphics));
        this.drawers.set("ellipse", new EllipseDrawer(this.graphics));
        this.drawers.set("line", new LineDrawer(this.graphics));
        this.drawers.set("arrow", new ArrowDrawer(this.graphics));
        this.drawers.set("polygon", new PolygonDrawer(this.graphics));
    }
    
    getDrawer(shapeType: ShapesSettings["shapeType"]): BaseShapeDrawer | null {
        return this.drawers.get(shapeType) || null;
    }
    
    getRectangleDrawer(): RectangleDrawer {
        return this.drawers.get("rectangle") as RectangleDrawer;
    }
    
    getPolygonDrawer(): PolygonDrawer {
        return this.drawers.get("polygon") as PolygonDrawer;
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
            "ellipse",
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
            ellipse: "Ellipse",
            line: "Line",
            arrow: "Arrow",
            polygon: "Polygon",
        };
    }
}
