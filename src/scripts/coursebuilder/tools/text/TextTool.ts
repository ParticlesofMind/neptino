/**
 * Modern Text Tool - Drag to Create Text Areas
 * Supports dynamic typing, copy/paste, and modern styling
 */

import {
    FederatedPointerEvent,
    Container,
    BitmapText,
    Point,
    Rectangle,
    Application
} from "pixi.js";
import { BaseTool } from "../ToolInterface";
import { 
    TextAreaManager,
    TextBitmapFontManager,
    TextSettings 
} from "./index";
import {
    PROFESSIONAL_COLORS,
    TEXT_SIZES,
    FONT_FAMILIES,
} from "../SharedResources";

export class TextTool extends BaseTool {
    private app: Application;
    private textAreaManager: TextAreaManager;
    private fontManager: TextBitmapFontManager;
    private isDragging = false;
    private dragStart = new Point(0, 0);
    private dragCurrent = new Point(0, 0);
    private currentContainer: Container | null = null;

    constructor(toolName: string, app: Application) {
        super(toolName, "text");
        this.app = app;
        
        // Initialize managers
        this.fontManager = new TextBitmapFontManager();
        this.textAreaManager = new TextAreaManager(this.fontManager);
        
        // Initialize bitmap fonts asynchronously
        this.initializeFonts();
    }

    /**
     * Initialize bitmap fonts
     */
    private async initializeFonts(): Promise<void> {
        try {
            await this.fontManager.initializeFonts();
            console.log('📝 TEXT: Bitmap fonts initialized successfully');
        } catch (error) {
            console.error('📝 TEXT: Failed to initialize bitmap fonts:', error);
        }
    }

    onPointerDown(event: FederatedPointerEvent, container: Container): void {
        if (!this.isActive) return;

        const localPoint = container.toLocal(event.global);
        
        // Check if we clicked on an existing text element
        const hitTest = this.findTextAtPoint(localPoint, container);
        if (hitTest) {
            console.log('📝 TEXT: Clicked on existing text - not creating new textbox');
            return; // Don't create new textbox if clicking on existing text
        }
        
        // Start drag operation for new textbox
        this.isDragging = true;
        this.dragStart.copyFrom(localPoint);
        this.dragCurrent.copyFrom(localPoint);
        this.currentContainer = container;

        console.log(`📝 TEXT: Starting drag at (${Math.round(localPoint.x)}, ${Math.round(localPoint.y)})`);
    }

    /**
     * Check if we clicked on an existing text element
     */
    private findTextAtPoint(point: Point, container: Container): BitmapText | null {
        // Iterate through children to find BitmapText at this point
        for (let i = container.children.length - 1; i >= 0; i--) {
            const child = container.children[i];
            if (child instanceof BitmapText) {
                const bounds = child.getBounds();
                // Check if point is within bounds
                if (point.x >= bounds.x && point.x <= bounds.x + bounds.width &&
                    point.y >= bounds.y && point.y <= bounds.y + bounds.height) {
                    return child;
                }
            }
        }
        return null;
    }

    onPointerMove(event: FederatedPointerEvent): void {
        if (!this.isDragging || !this.currentContainer) return;

        const localPoint = this.currentContainer.toLocal(event.global);
        this.dragCurrent.copyFrom(localPoint);

        // No preview - just track the drag position
    }

    onPointerUp(event: FederatedPointerEvent): void {
        if (!this.isDragging || !this.currentContainer) return;

        const localPoint = this.currentContainer.toLocal(event.global);
        this.dragCurrent.copyFrom(localPoint);

        // Calculate final bounds
        const bounds = this.calculateTextAreaBounds();
        
        // Only create if drag was meaningful (minimum size)
        if (bounds.width > 20 && bounds.height > 20) {
            this.createTextArea(bounds, this.currentContainer);
        } else {
            // Single click - create default sized text area
            const defaultBounds = new Rectangle(
                this.dragStart.x,
                this.dragStart.y,
                200, // Default width
                60   // Default height
            );
            this.createTextArea(defaultBounds, this.currentContainer);
        }

        this.finalizeDrag();
    }

    private calculateTextAreaBounds(): Rectangle {
        const minX = Math.min(this.dragStart.x, this.dragCurrent.x);
        const minY = Math.min(this.dragStart.y, this.dragCurrent.y);
        const maxX = Math.max(this.dragStart.x, this.dragCurrent.x);
        const maxY = Math.max(this.dragStart.y, this.dragCurrent.y);

        return new Rectangle(
            minX,
            minY,
            maxX - minX,
            maxY - minY
        );
    }

    private createTextArea(bounds: Rectangle, container: Container): void {
        console.log(`📝 TEXT: Creating text area at bounds: ${bounds.x}, ${bounds.y}, ${bounds.width}x${bounds.height}`);
        
        this.textAreaManager.createTextArea(
            bounds,
            this.settings,
            (text: string, position: Point) => {
                this.finalizeText(text, position, container);
            }
        );
    }

    private finalizeText(text: string, position: Point, container: Container): void {
        if (!text.trim()) return;

        // Create BitmapText using our font manager
        const bitmapText = this.fontManager.createBitmapText(text, this.settings);
        
        // Position the text
        bitmapText.x = position.x;
        bitmapText.y = position.y;
        
        // Make text interactive and draggable
        bitmapText.eventMode = "static";
        bitmapText.cursor = "grab";
        
        // Enable drag behavior for existing text
        this.makeTextDraggable(bitmapText);

        // Add to container
        container.addChild(bitmapText);

        console.log(`📝 TEXT: BitmapText created and added to canvas: "${text}"`);
    }

    /**
     * Make a text element draggable
     */
    private makeTextDraggable(textElement: BitmapText): void {
        let isDragging = false;
        let dragOffset = new Point(0, 0);

        textElement.on('pointerdown', (event: FederatedPointerEvent) => {
            // Don't check if this.isActive - text should be draggable regardless of active tool
            if (!textElement.parent) return;
            
            isDragging = true;
            textElement.cursor = "grabbing";
            
            // Calculate offset from text position to click position
            const localPoint = textElement.parent.toLocal(event.global);
            dragOffset.set(localPoint.x - textElement.x, localPoint.y - textElement.y);
            
            event.stopPropagation(); // Prevent other tools from handling this
        });

        textElement.on('pointermove', (event: FederatedPointerEvent) => {
            if (!isDragging || !textElement.parent) return;
            
            const localPoint = textElement.parent.toLocal(event.global);
            textElement.x = localPoint.x - dragOffset.x;
            textElement.y = localPoint.y - dragOffset.y;
        });

        textElement.on('pointerup', () => {
            isDragging = false;
            textElement.cursor = "grab";
        });

        textElement.on('pointerupoutside', () => {
            isDragging = false;
            textElement.cursor = "grab";
        });
    }

    private finalizeDrag(): void {
        this.isDragging = false;
        this.currentContainer = null;
        this.dragStart.set(0, 0);
        this.dragCurrent.set(0, 0);
    }

    onDeactivate(): void {
        super.onDeactivate();
        
        // Only clean up active textareas (HTML elements), NOT finalized BitmapText
        this.textAreaManager.cleanup();
        
        // Reset drag state
        this.finalizeDrag();
        
        console.log('📝 TEXT: Tool deactivated - BitmapText objects should remain on canvas');
    }

    updateSettings(settings: Partial<TextSettings>): void {
        this.settings = { ...this.settings, ...settings };
        console.log('📝 TEXT: Settings updated:', this.settings);
    }

    // Static getters for UI
    static getAvailableFonts(): string[] { return FONT_FAMILIES; }
    static getAvailableTextSizes(): number[] { return TEXT_SIZES; }
    static getAvailableColors(): string[] { return PROFESSIONAL_COLORS; }
    static getAlignmentOptions(): string[] { return ["left", "center", "right", "justify"]; }
    static getFontWeights(): string[] { return ["normal", "bold", "100", "200", "300", "400", "500", "600", "700", "800", "900"]; }
    static getFontStyles(): string[] { return ["normal", "italic", "oblique"]; }
}
