/**
 * Shapes Tool - Refactored
 * Multi-geometry creation with professional styling and modular shape drawing
 */

import { FederatedPointerEvent, Container, Graphics, Point, Text } from "pixi.js";
import { BaseTool } from "../ToolInterface";
import {
    PROFESSIONAL_COLORS,
    STROKE_SIZES,
    hexToNumber,
} from "../SharedResources";
import { BoundaryUtils } from "../BoundaryUtils";
import { snapManager } from "../SnapManager";
import { ShapeDrawerFactory } from "./ShapeDrawerFactory";
import { 
    ShapesSettings, 
    ShapeDrawingContext, 
    StrokeStyle, 
    FillStyle 
} from "./types";

export class ShapesTool extends BaseTool {
    private isDrawing: boolean = false;
    private currentShape: Graphics | null = null;
    private startPoint: Point = new Point(0, 0);
    private currentPoint: Point = new Point(0, 0);
    private isProportional: boolean = false;
    private boundKeyDown: (event: KeyboardEvent) => void;
    private boundKeyUp: (event: KeyboardEvent) => void;
    private drawerFactory: ShapeDrawerFactory | null = null;
    private uiContainer: Container | null = null;
    private sizeIndicator: { container: Container; bg: Graphics; text: Text } | null = null;
    
    declare protected settings: ShapesSettings;

    constructor() {
        // Use a precise crosshair cursor so the shape emerges from the center
        super("shapes", "crosshair");
        this.settings = {
            color: PROFESSIONAL_COLORS[0], // Dark charcoal stroke
            strokeWidth: STROKE_SIZES.SHAPES[2], // 4px stroke
            fillColor: PROFESSIONAL_COLORS[13], // Light gray fill
            fillEnabled: false,
            shapeType: "rectangle",
            cornerRadius: 0,
            sides: 6, // For hexagon default
        };

        // Bind keyboard events for proportional drawing
        this.boundKeyDown = this.handleKeyDown.bind(this);
        this.boundKeyUp = this.handleKeyUp.bind(this);
        this.bindKeyboardEvents();

        console.log('🔶 SHAPES: Initialized with modular shape drawing system');
        console.log(`🔶 SHAPES: Default settings - Color: ${this.settings.color}, Stroke: ${this.settings.strokeWidth}px, Fill: ${this.settings.fillEnabled ? 'enabled' : 'disabled'}`);
    }

    // Provided by ToolManager so helper visuals can be drawn on UI layer
    public setUILayer(container: Container) {
        this.uiContainer = container;
    }

    onPointerDown(event: FederatedPointerEvent, container: Container): void {
        // 🔒 CRITICAL: Only respond if this tool is active
        if (!this.isActive) {
            console.log('🔶 SHAPES: Ignoring pointer down - tool not active');
            return;
        }

        this.isDrawing = true;
        console.log(
            `🔶 SHAPES: Started drawing ${this.settings.shapeType} at (${Math.round(event.global.x)}, ${Math.round(event.global.y)})`,
        );
        console.log(
            `🔶 SHAPES: Settings - Color: ${this.settings.color}, Stroke: ${this.settings.strokeWidth}px, Fill: ${this.settings.fillEnabled ? this.settings.fillColor : "none"}`,
        );

        // Use local coordinates relative to the container
        const localPoint = container.toLocal(event.global);

        // 🚫 MARGIN PROTECTION: Prevent creation in margin areas
        const canvasBounds = this.manager.getCanvasBounds();
        if (!BoundaryUtils.isPointInContentArea(localPoint, canvasBounds)) {
            console.log(`🔷 SHAPES: 🚫 Click in margin area rejected - point (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)}) outside content area`);
            return; // Exit early - no creation allowed in margins
        }

        // Point is in content area, safe to proceed
        const clampedStartPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);

        this.startPoint.copyFrom(clampedStartPoint);
        // Apply snapping to the initial point for a precise start
        const snappedStart = snapManager.snapPoint(clampedStartPoint);
        this.currentPoint.copyFrom(snappedStart);

        // Create new graphics object with professional styling
        this.currentShape = new Graphics();
        this.currentShape.eventMode = "static";
        // Tag for selection-based option routing
        (this.currentShape as any).__toolType = 'shapes';

        // Initialize drawer factory with new graphics
        this.drawerFactory = new ShapeDrawerFactory(this.currentShape);

        // Configure specific drawer settings
        this.configureDrawerSettings();

        container.addChild(this.currentShape);
        console.log(
            `🔶 SHAPES: Professional ${this.settings.shapeType} graphics object created`,
        );

        // Initialize size indicator on first draw update
    }

    onPointerMove(event: FederatedPointerEvent, container: Container): void {
        // 🔒 CRITICAL: Only respond if this tool is active
        if (!this.isActive) {
            return;
        }

        if (!this.isDrawing || !this.currentShape || !this.drawerFactory) return;

        // Use local coordinates relative to the container
        const localPoint = container.toLocal(event.global);

        // 🎯 BOUNDARY ENFORCEMENT: Clamp current point to canvas bounds
        const canvasBounds = this.manager.getCanvasBounds();
        const clampedCurrentPoint = BoundaryUtils.clampPoint(localPoint, canvasBounds);
        const snapped = snapManager.snapPoint(clampedCurrentPoint);
        this.currentPoint.copyFrom(snapped);

        // Check if shift key is pressed for proportional drawing
        this.isProportional = event.shiftKey;

        const context = this.drawShape();
        // Update size indicator box under the creating shape
        if (context) {
            this.updateSizeIndicator(context);
        }
    }

    onPointerUp(): void {
        // 🔒 CRITICAL: Only respond if this tool is active
        if (!this.isActive) {
            return;
        }

        if (this.isDrawing && this.currentShape) {
            const width = this.currentPoint.x - this.startPoint.x;
            const height = this.currentPoint.y - this.startPoint.y;
            console.log(
                `🔶 SHAPES: Finished drawing professional ${this.settings.shapeType}${this.isProportional ? " (proportional)" : ""} - Final size: ${Math.round(Math.abs(width))}x${Math.round(Math.abs(height))}`,
            );

            // Log the final shape details
            if (this.currentShape.parent) {
                console.log(`🔶 SHAPES: Shape added to parent with ${this.currentShape.parent.children.length} total children`);
            } else {
                console.warn(`🔶 SHAPES: Shape not added to any parent!`);
            }

            // Attach metadata for selection-based restyling
            try {
                const x = Math.min(this.startPoint.x, this.currentPoint.x);
                const y = Math.min(this.startPoint.y, this.currentPoint.y);
                const w = Math.abs(this.currentPoint.x - this.startPoint.x);
                const h = Math.abs(this.currentPoint.y - this.startPoint.y);
                const meta: any = {
                    kind: 'shapes',
                    shapeType: this.settings.shapeType,
                    x, y, width: w, height: h,
                    startX: this.startPoint.x, startY: this.startPoint.y,
                    currentX: this.currentPoint.x, currentY: this.currentPoint.y,
                    strokeWidth: this.settings.strokeWidth,
                    strokeColor: this.settings.color,
                    fillEnabled: this.settings.fillEnabled,
                    fillColor: this.settings.fillColor,
                };
                if (this.settings.shapeType === 'rectangle' && this.settings.cornerRadius) {
                    meta.cornerRadius = this.settings.cornerRadius;
                }
                if (this.settings.shapeType === 'polygon' && this.settings.sides) {
                    meta.sides = this.settings.sides;
                }
                (this.currentShape as any).__toolType = 'shapes';
                (this.currentShape as any).__meta = meta;
            } catch {}
        }
        this.isDrawing = false;
        this.currentShape = null;
        this.drawerFactory = null;
        this.isProportional = false;
        this.removeSizeIndicator();
    }

    /**
     * Bind keyboard events for proportional drawing
     */
    private bindKeyboardEvents(): void {
        document.addEventListener("keydown", this.boundKeyDown);
        document.addEventListener("keyup", this.boundKeyUp);
    }

    /**
     * Handle key down events
     */
    private handleKeyDown(event: KeyboardEvent): void {
        if (event.key === "Shift" && this.isDrawing) {
            this.isProportional = true;
            this.drawShape();
        }
    }

    /**
     * Handle key up events
     */
    private handleKeyUp(event: KeyboardEvent): void {
        if (event.key === "Shift" && this.isDrawing) {
            this.isProportional = false;
            this.drawShape();
        }
    }

    /**
     * Configure specific drawer settings based on current shape type
     */
    private configureDrawerSettings(): void {
        if (!this.drawerFactory) return;

        // Configure rectangle drawer
        if (this.settings.shapeType === "rectangle" && this.settings.cornerRadius) {
            this.drawerFactory.getRectangleDrawer().setCornerRadius(this.settings.cornerRadius);
        }

        // Configure polygon drawer
        if (this.settings.shapeType === "polygon" && this.settings.sides) {
            this.drawerFactory.getPolygonDrawer().setSides(this.settings.sides);
        }
    }

    private drawShape(): ShapeDrawingContext | null {
        if (!this.currentShape || !this.drawerFactory) return;

        // Clear previous drawing
        this.currentShape.clear();

        const strokeColor = hexToNumber(this.settings.color);
        let width = this.currentPoint.x - this.startPoint.x;
        let height = this.currentPoint.y - this.startPoint.y;

        // Create drawing context
        let context: ShapeDrawingContext = {
            startX: this.startPoint.x,
            startY: this.startPoint.y,
            currentX: this.currentPoint.x,
            currentY: this.currentPoint.y,
            width,
            height,
            isProportional: this.isProportional,
        };

        // Get the appropriate drawer
        const drawer = this.drawerFactory.getDrawer(this.settings.shapeType);
        if (!drawer) {
            console.warn(`🔶 SHAPES: No drawer found for shape type: ${this.settings.shapeType}`);
            return;
        }

        // Apply proportional constraints
        context = drawer.applyProportionalConstraints(context);

        // Create styles
        const strokeStyle: StrokeStyle = {
            width: Math.max(this.settings.strokeWidth, 1), // Ensure minimum 1px stroke
            color: strokeColor,
            cap: "round",
            join: "round",
        };

        let fillStyle: FillStyle | undefined = undefined;
        if (this.settings.fillEnabled && this.settings.fillColor) {
            fillStyle = { color: hexToNumber(this.settings.fillColor) };
        }

        console.log(`🔶 SHAPES: Drawing ${this.settings.shapeType} - Width: ${Math.round(context.width)}, Height: ${Math.round(context.height)}, Stroke: ${strokeStyle.width}px, Color: ${this.settings.color}`);

        // Draw the shape using the appropriate drawer
        drawer.draw(context, strokeStyle, fillStyle);
        return context;
    }

    setShapeType(
        shapeType: ShapesSettings["shapeType"],
    ): void {
        const previousType = this.settings.shapeType;
        this.settings.shapeType = shapeType;
        console.log(`🔶 SHAPES: Shape type changed from ${previousType} to ${shapeType}`);
    }

    setCornerRadius(radius: number): void {
        this.settings.cornerRadius = Math.max(0, radius);
    }

    setPolygonSides(sides: number): void {
        this.settings.sides = Math.max(3, sides);
    }

    toggleFill(): void {
        this.settings.fillEnabled = !this.settings.fillEnabled;
        console.log(
            `🔶 SHAPES: Fill ${this.settings.fillEnabled ? "enabled" : "disabled"}`,
        );
    }

    updateSettings(settings: Partial<ShapesSettings>): void {
        const previousShapeType = this.settings.shapeType;
        this.settings = { ...this.settings, ...settings };

        // Log shape type changes
        if (settings.shapeType && settings.shapeType !== previousShapeType) {
            console.log(`🔶 SHAPES: Shape type changed from ${previousShapeType} to ${settings.shapeType}`);
        }
    }

    // Get available colors for UI
    static getAvailableColors(): string[] {
        return PROFESSIONAL_COLORS;
    }

    // Get available stroke sizes for UI
    static getAvailableStrokeSizes(): number[] {
        return STROKE_SIZES.SHAPES;
    }

    // Get available shape types - prioritize basic shapes
    static getShapeTypes(): string[] {
        return ShapeDrawerFactory.getAvailableShapeTypes();
    }

    // Get shape type display names - emphasize basic shapes
    static getShapeTypeNames(): { [key: string]: string } {
        return ShapeDrawerFactory.getShapeTypeNames();
    }

    /**
     * Cleanup method to remove event listeners
     */
    destroy(): void {
        document.removeEventListener("keydown", this.boundKeyDown);
        document.removeEventListener("keyup", this.boundKeyUp);
    }

    // ----- Size indicator (during creation) -----
    private updateSizeIndicator(context: ShapeDrawingContext): void {
        if (!this.uiContainer) return;
        const ui = this.uiContainer;

        // Determine normalized bounds of the creating shape
        const minX = Math.min(context.startX, context.currentX);
        const minY = Math.min(context.startY, context.currentY);
        const width = Math.max(0, Math.round(Math.abs(context.width)));
        const height = Math.max(0, Math.round(Math.abs(context.height)));
        const label = `${width} x ${height}`;

        if (!this.sizeIndicator) {
            const container = new Container();
            container.name = 'creation-size-indicator';
            const bg = new Graphics();
            const text = new Text({ text: label, style: { fontFamily: 'Arial', fontSize: 12, fill: 0x111111 } });
            container.addChild(bg);
            container.addChild(text);
            ui.addChild(container);
            this.sizeIndicator = { container, bg, text };
        } else {
            this.sizeIndicator.text.text = label;
        }

        const paddingX = 6;
        const paddingY = 3;
        const textW = (this.sizeIndicator.text as any).width || 0;
        const textH = (this.sizeIndicator.text as any).height || 0;
        const boxW = Math.ceil(textW + paddingX * 2);
        const boxH = Math.ceil(textH + paddingY * 2);

        this.sizeIndicator.bg.clear();
        this.sizeIndicator.bg.rect(0, 0, boxW, boxH);
        this.sizeIndicator.bg.fill({ color: 0xffffff, alpha: 1 });
        this.sizeIndicator.bg.stroke({ width: 1, color: 0x3b82f6 });

        this.sizeIndicator.text.position.set(paddingX, paddingY - 1);

        // Position below the current shape bounds
        const cx = minX + width * 0.5 - boxW * 0.5;
        const cy = minY + Math.max(0, Math.round(Math.abs(context.height))) + 8;
        this.sizeIndicator.container.position.set(cx, cy);
    }

    private removeSizeIndicator(): void {
        if (this.sizeIndicator) {
            if (this.sizeIndicator.container.parent) {
                this.sizeIndicator.container.parent.removeChild(this.sizeIndicator.container);
            }
            this.sizeIndicator = null;
        }
    }
}
