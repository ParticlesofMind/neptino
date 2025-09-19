/**
 * Shapes Tool - Refactored
 * Multi-geometry creation with professional styling and modular shape drawing
 */

import { FederatedPointerEvent, Container, Graphics, Point, Text, Rectangle } from "pixi.js";
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
  // Dimension snap visuals
  private dimGuide: Graphics | null = null;
  private dimSnap: { width?: number; height?: number } = {};
  // Track the final drawing context actually used to render the shape (after constraints)
  private lastDrawContext: ShapeDrawingContext | null = null;
    
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

        // Dimension snapping to match width/height of nearby objects
        try {
            this.applyDimensionSnapping(container);
        } catch {}

        // Check if shift key is pressed for proportional drawing
        this.isProportional = event.shiftKey;

        const context = this.drawShape();
        // Update size indicator box under the creating shape
        if (context) {
            this.updateSizeIndicator(context);
            // Draw dimension guides if any
            this.drawDimensionGuides(context);
        }
    }

    onPointerUp(): void {
        // 🔒 CRITICAL: Only respond if this tool is active
        if (!this.isActive) {
            return;
        }

        if (this.isDrawing && this.currentShape) {
            // Use the last context that the drawer actually used (after proportional constraints)
            const ctx = this.lastDrawContext;
            const width = ctx ? ctx.width : (this.currentPoint.x - this.startPoint.x);
            const height = ctx ? ctx.height : (this.currentPoint.y - this.startPoint.y);
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
                // Derive meta from the final rendered context when available
                const endX = this.startPoint.x + width;
                const endY = this.startPoint.y + height;
                const x = Math.min(this.startPoint.x, endX);
                const y = Math.min(this.startPoint.y, endY);
                const w = Math.abs(width);
                const h = Math.abs(height);
                const meta: any = {
                    kind: 'shapes',
                    shapeType: this.settings.shapeType,
                    x, y, width: w, height: h,
                    startX: this.startPoint.x, startY: this.startPoint.y,
                    currentX: endX, currentY: endY,
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
        // Clear dimension guides
        if (this.dimGuide && this.dimGuide.parent) this.dimGuide.parent.removeChild(this.dimGuide);
        this.dimGuide = null;
        this.dimSnap = {};
        this.lastDrawContext = null;
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
        if (!this.currentShape || !this.drawerFactory) return null;

        // Clear previous drawing
        this.currentShape.clear();

        const strokeColor = hexToNumber(this.settings.color);
        let width = this.currentPoint.x - this.startPoint.x;
        let height = this.currentPoint.y - this.startPoint.y;

        // Apply dimension snapping overrides if present
        if (this.dimSnap.width !== undefined) {
            const sign = (width >= 0) ? 1 : -1;
            width = Math.abs(this.dimSnap.width) * sign;
            this.currentPoint.x = this.startPoint.x + width;
        }
        if (this.dimSnap.height !== undefined) {
            const sign = (height >= 0) ? 1 : -1;
            height = Math.abs(this.dimSnap.height) * sign;
            this.currentPoint.y = this.startPoint.y + height;
        }

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
            return null;
        }

        // Apply proportional constraints and keep the final context used for drawing
        context = drawer.applyProportionalConstraints(context);
        this.lastDrawContext = context;

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

    // Compute and apply dimension snapping (width/height matching to nearby objects)
    private applyDimensionSnapping(container: Container): void {
        const prefs = (snapManager as any).getPrefs?.() || { threshold: 6, matchWidth: true, matchHeight: true };
        const threshold = prefs.threshold ?? 6;
        const enableW = prefs.matchWidth !== false;
        const enableH = prefs.matchHeight !== false;
        const others = this.collectOtherBounds(container);

        const curW = Math.abs(this.currentPoint.x - this.startPoint.x);
        const curH = Math.abs(this.currentPoint.y - this.startPoint.y);

        // Current provisional rect
        const minX = Math.min(this.startPoint.x, this.currentPoint.x);
        const minY = Math.min(this.startPoint.y, this.currentPoint.y);
        const curRect = new Rectangle(minX, minY, curW, curH);

        // Choose width/height candidates from nearest object among those within width/height value threshold
        let chosenW: number | undefined; let bestWDist = Number.POSITIVE_INFINITY;
        let chosenH: number | undefined; let bestHDist = Number.POSITIVE_INFINITY;

        for (const r of others) {
            // Distance metric: center-to-center distance
            const dx = (r.x + r.width / 2) - (curRect.x + curRect.width / 2);
            const dy = (r.y + r.height / 2) - (curRect.y + curRect.height / 2);
            const dist = Math.hypot(dx, dy);

            if (enableW) {
                const dW = Math.abs(curW - Math.round(r.width));
                if (dW <= threshold && dist < bestWDist) {
                    bestWDist = dist; chosenW = Math.round(r.width);
                }
            }
            if (enableH) {
                const dH = Math.abs(curH - Math.round(r.height));
                if (dH <= threshold && dist < bestHDist) {
                    bestHDist = dist; chosenH = Math.round(r.height);
                }
            }
        }

        this.dimSnap = {};
        if (enableW && chosenW !== undefined) this.dimSnap.width = chosenW;
        if (enableH && chosenH !== undefined) this.dimSnap.height = chosenH;
    }

    // Draw dimension guides next to the creating shape
    private drawDimensionGuides(context: ShapeDrawingContext): void {
        if (!this.uiContainer) return;
        const ui = this.uiContainer;
        if (!this.dimGuide) { this.dimGuide = new Graphics(); this.dimGuide.zIndex = 1000; ui.addChild(this.dimGuide); }
        this.dimGuide.clear();

        const guideColor = 0x3b82f6;
        const highlight = 0x10b981;
        const minX = Math.min(context.startX, context.currentX);
        const minY = Math.min(context.startY, context.currentY);
        const w = Math.abs(context.width);
        const h = Math.abs(context.height);

        // Width guide above the shape
        const widthColor = (this.dimSnap.width !== undefined) ? highlight : guideColor;
        this.dimGuide.moveTo(minX, minY - 6).lineTo(minX + w, minY - 6).stroke({ width: 1, color: widthColor, alpha: 0.95 });
        // Small end caps
        this.dimGuide.moveTo(minX, minY - 10).lineTo(minX, minY - 2).stroke({ width: 1, color: widthColor, alpha: 0.95 });
        this.dimGuide.moveTo(minX + w, minY - 10).lineTo(minX + w, minY - 2).stroke({ width: 1, color: widthColor, alpha: 0.95 });

        // Height guide to the left of the shape
        const heightColor = (this.dimSnap.height !== undefined) ? highlight : guideColor;
        this.dimGuide.moveTo(minX - 6, minY).lineTo(minX - 6, minY + h).stroke({ width: 1, color: heightColor, alpha: 0.95 });
        this.dimGuide.moveTo(minX - 10, minY).lineTo(minX - 2, minY).stroke({ width: 1, color: heightColor, alpha: 0.95 });
        this.dimGuide.moveTo(minX - 10, minY + h).lineTo(minX - 2, minY + h).stroke({ width: 1, color: heightColor, alpha: 0.95 });
    }

    private collectOtherBounds(container: Container): Rectangle[] {
        const out: Rectangle[] = [];
        const visit = (node: any) => {
            if (!node || node === container || node === this.currentShape) return;
            try {
                if (typeof node.getBounds === 'function' && node.visible !== false) {
                    const wb = node.getBounds();
                    const tl = container.toLocal(new Point(wb.x, wb.y));
                    const br = container.toLocal(new Point(wb.x + wb.width, wb.y + wb.height));
                    const x = Math.min(tl.x, br.x);
                    const y = Math.min(tl.y, br.y);
                    const w = Math.abs(br.x - tl.x);
                    const h = Math.abs(br.y - tl.y);
                    if (w > 0.01 && h > 0.01) out.push(new Rectangle(x, y, w, h));
                }
            } catch {}
            if (node.children && Array.isArray(node.children)) {
                for (const child of node.children) visit(child);
            }
        };
        for (const child of container.children) visit(child);
        return out;
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
        // Highlight when snapped to a dimension
        const snapped = (this.dimSnap.width !== undefined) || (this.dimSnap.height !== undefined);
        this.sizeIndicator.bg.stroke({ width: 1, color: snapped ? 0x10b981 : 0x3b82f6 });

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

// ----- Dimension snapping helpers for ShapesTool -----
export interface DimensionMatch {
    width?: { value: number; ref: Rectangle };
    height?: { value: number; ref: Rectangle };
}
