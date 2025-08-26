/**
 * UI Event Handler
 * Manages DOM events and user interactions for the coursebuilder interface
 * Single Responsibility: Event handling and UI interactions only
 */

import { ToolStateManager } from './ToolStateManager';

export class UIEventHandler {
    private toolStateManager: ToolStateManager;
    private onToolChangeCallback: ((toolName: string) => void) | null = null;
    private onColorChangeCallback: ((color: string) => void) | null = null;
    private onToolSettingsChangeCallback:
        | ((toolName: string, settings: any) => void)
        | null = null;

    constructor(toolStateManager: ToolStateManager) {
        this.toolStateManager = toolStateManager;
        this.bindEvents();
    }

    /**
     * Set callback for tool changes
     */
    setOnToolChange(callback: (toolName: string) => void): void {
        this.onToolChangeCallback = callback;
    }

    /**
     * Set callback for color changes
     */
    setOnColorChange(callback: (color: string) => void): void {
        this.onColorChangeCallback = callback;
    }

    /**
     * Set callback for tool settings changes
     */
    setOnToolSettingsChange(
        callback: (toolName: string, settings: any) => void,
    ): void {
        this.onToolSettingsChangeCallback = callback;
    }

    /**
     * Bind all UI events
     */
    private bindEvents(): void {
        document.addEventListener('click', this.handleGlobalClick.bind(this));

        // Tool selection events
        document.querySelectorAll('[data-tool]').forEach(button => {
            button.addEventListener(
                'click',
                this.handleToolSelection.bind(this),
            );
        });

        // Mode selection events
        document.querySelectorAll('[data-mode]').forEach(button => {
            button.addEventListener(
                'click',
                this.handleModeSelection.bind(this),
            );
        });

        // Media selection events
        document.querySelectorAll('[data-media]').forEach(button => {
            button.addEventListener(
                'click',
                this.handleMediaSelection.bind(this),
            );
        });

        // Navigation selection events
        document
            .querySelectorAll('.engine__nav-course .nav-course__item')
            .forEach(button => {
                button.addEventListener(
                    'click',
                    this.handleNavigationSelection.bind(this),
                );
            });

        // Color palette events
        document.querySelectorAll('.color-square').forEach(color => {
            color.addEventListener(
                'click',
                this.handleColorSelection.bind(this),
            );
        });

        // Shape tool events - bind to shape icons instead of buttons
        document.querySelectorAll('.tools__icon').forEach(icon => {
            icon.addEventListener(
                'click',
                this.handleShapeSelection.bind(this),
            );
        });

        // Slider events for tool settings
        document
            .querySelectorAll('input[type="range"][data-setting]')
            .forEach(slider => {
                slider.addEventListener(
                    'input',
                    this.handleSliderChange.bind(this),
                );
            });

        // Select dropdown events for font settings
        document.querySelectorAll('select[data-setting]').forEach(select => {
            select.addEventListener(
                'change',
                this.handleSelectChange.bind(this),
            );
        });

        // Color input events for direct color selection
        document
            .querySelectorAll('input[type="color"][data-setting]')
            .forEach(colorInput => {
                colorInput.addEventListener(
                    'input',
                    this.handleColorInputChange.bind(this),
                );
            });

        // Number input events for table settings (rows, columns, etc.)
        document
            .querySelectorAll('input[type="number"][data-setting]')
            .forEach(numberInput => {
                numberInput.addEventListener(
                    'input',
                    this.handleNumberInputChange.bind(this),
                );
            });

        // Canvas actions
        this.bindCanvasActions();

        // Initialize default shape selection
        this.initializeDefaultShapeSelection();
    }

    /**
     * Handle global click events
     */
    private handleGlobalClick(event: Event): void {
        const target = event.target as HTMLElement;

        // Handle color selection
        const colorElement = target.closest('.color-square') as HTMLElement;
        if (colorElement) {
            const colorEvent = { ...event, currentTarget: colorElement };
            this.handleColorSelection(colorEvent);
            return;
        }

        // Handle shape selection - check if target is a shape icon
        const shapeIcon = target.closest('.tools__icon') as HTMLElement;
        if (shapeIcon) {
            // Create a new event with the shape icon as currentTarget
            const shapeEvent = { ...event, currentTarget: shapeIcon };
            this.handleShapeSelection(shapeEvent);
            return;
        }
    }

    /**
     * Handle tool selection
     */
    private handleToolSelection(event: Event): void {
        event.preventDefault();
        const button = event.currentTarget as HTMLElement;
        const toolName = button.dataset.tool;

        if (!toolName) return;

        console.log(`🔧 UI: Tool selection event for "${toolName}"`);

        this.toolStateManager.setTool(toolName);
        this.toolStateManager.updateCanvasCursor();

        // Trigger callback with additional logging
        if (this.onToolChangeCallback) {
            console.log(`🔧 UI: Triggering tool change callback for "${toolName}"`);
            this.onToolChangeCallback(toolName);
            console.log(`🔧 UI: Tool change callback completed for "${toolName}"`);
        } else {
            console.warn('⚠️ UI: No tool change callback registered');
        }

        // Verify synchronization after a short delay
        setTimeout(() => {
            this.toolStateManager.forceSyncVerification();
        }, 100);
    }

    /**
     * Handle mode selection
     */
    private handleModeSelection(event: Event): void {
        event.preventDefault();
        const button = event.currentTarget as HTMLElement;
        const modeName = button.dataset.mode;

        if (!modeName) return;

        this.toolStateManager.setMode(modeName);
    }

    /**
     * Handle media selection
     */
    private handleMediaSelection(event: Event): void {
        event.preventDefault();
        const button = event.currentTarget as HTMLElement;
        const mediaType = button.dataset.media;

        if (!mediaType) return;

        this.toolStateManager.setSelectedMedia(mediaType);
    }

    /**
     * Handle navigation selection
     */
    private handleNavigationSelection(event: Event): void {
        event.preventDefault();
        const button = event.currentTarget as HTMLElement;
        const label = button.querySelector('.icon-label');
        const navTitle = label?.textContent;

        if (!navTitle) return;

        this.toolStateManager.setSelectedNavigation(navTitle);
    }

    /**
     * Handle color selection
     */
    private handleColorSelection(event: Event): void {
        event.preventDefault();
        const colorSquare = event.currentTarget as HTMLElement;
        const colorValue = colorSquare.dataset.color;

        if (!colorValue) {
            console.warn('🎨 Color selection failed: no color data found');
            return;
        }

        // Update UI - find the parent color palette and update active state
        const parentPalette = colorSquare.closest('.color-palette');
        if (parentPalette) {
            parentPalette.querySelectorAll('.color-square').forEach(color => {
                color.classList.remove('active');
            });
            colorSquare.classList.add('active');
        }

        // Update tool settings based on currently active tool
        const currentTool = this.toolStateManager.getCurrentTool();
        if (currentTool === 'pen') {
            this.toolStateManager.updateToolSettings('pen', {
                color: colorValue,
            });
        } else if (currentTool === 'text') {
            this.toolStateManager.updateToolSettings('text', {
                color: colorValue,
            });
        } else if (currentTool === 'brush') {
            this.toolStateManager.updateToolSettings('brush', {
                color: colorValue,
            });
        } else if (currentTool === 'shapes') {
            this.toolStateManager.updateToolSettings('shapes', {
                color: colorValue,
            });
        }

        // Trigger callback
        if (this.onColorChangeCallback) {
            this.onColorChangeCallback(colorValue);
        }
    }

    /**
     * Handle slider changes for tool settings
     */
    private handleSliderChange(event: Event): void {
        const slider = event.currentTarget as HTMLInputElement;
        const setting = slider.dataset.setting;
        const value = slider.value;

        if (!setting) return;

        // Update the displayed value
        const valueDisplay =
            slider.parentElement?.querySelector('.size-display');
        if (valueDisplay) {
            if (setting === 'opacity') {
                const percentage = Math.round(parseFloat(value) * 100);
                valueDisplay.textContent = `${percentage}%`;
            } else {
                valueDisplay.textContent = `${value}px`;
            }
        }

        // Update tool settings based on currently active tool
        const currentTool = this.toolStateManager.getCurrentTool();
        const numericValue =
            setting === 'opacity' ? parseFloat(value) : parseInt(value);

        if (currentTool === 'pen' && setting === 'size') {
            this.toolStateManager.updateToolSettings('pen', {
                [setting]: numericValue,
            });
        } else if (currentTool === 'text' && setting === 'fontSize') {
            this.toolStateManager.updateToolSettings('text', {
                [setting]: numericValue,
            });
        } else if (
            currentTool === 'brush' &&
            (setting === 'size' || setting === 'opacity')
        ) {
            this.toolStateManager.updateToolSettings('brush', {
                [setting]: numericValue,
            });
        } else if (currentTool === 'shapes' && setting === 'strokeWidth') {
            this.toolStateManager.updateToolSettings('shapes', {
                [setting]: numericValue,
            });
        } else if (currentTool === 'eraser' && setting === 'size') {
            this.toolStateManager.updateToolSettings('eraser', {
                [setting]: numericValue,
            });
        }

        // Trigger callback if set
        if (this.onToolSettingsChangeCallback) {
            this.onToolSettingsChangeCallback(currentTool, {
                [setting]: numericValue,
            });
        }
    }

    /**
     * Handle number input changes for tool settings (tables, etc.)
     */
    private handleNumberInputChange(event: Event): void {
        const numberInput = event.currentTarget as HTMLInputElement;
        const setting = numberInput.dataset.setting;
        const value = numberInput.value;

        if (!setting) return;

        // Update tool settings based on currently active tool
        const currentTool = this.toolStateManager.getCurrentTool();
        const numericValue = parseInt(value) || 1; // Ensure minimum value of 1

        if (currentTool === 'tables' && (setting === 'rows' || setting === 'columns')) {
            this.toolStateManager.updateToolSettings('tables', {
                [setting]: Math.max(1, numericValue), // Ensure positive values
            });
        }

        // Trigger callback if set
        if (this.onToolSettingsChangeCallback) {
            this.onToolSettingsChangeCallback(currentTool, {
                [setting]: numericValue,
            });
        }
    }

    /**
     * Handle select changes for tool settings
     */
    private handleSelectChange(event: Event): void {
        const select = event.currentTarget as HTMLSelectElement;
        const setting = select.dataset.setting;
        const value = select.value;

        if (!setting) return;

        // Update tool settings based on currently active tool
        const currentTool = this.toolStateManager.getCurrentTool();

        if (currentTool === 'text' && setting === 'fontFamily') {
            this.toolStateManager.updateToolSettings('text', {
                [setting]: value,
            });

            // Trigger callback if set
            if (this.onToolSettingsChangeCallback) {
                this.onToolSettingsChangeCallback('text', { [setting]: value });
            }
        }
    }

    /**
     * Handle color input changes (direct color picker)
     */
    private handleColorInputChange(event: Event): void {
        const colorInput = event.currentTarget as HTMLInputElement;
        const setting = colorInput.dataset.setting;
        const colorValue = colorInput.value;

        if (!setting) return;

        // Update tool settings based on currently active tool
        const currentTool = this.toolStateManager.getCurrentTool();

        if (currentTool === 'pen' && setting === 'color') {
            this.toolStateManager.updateToolSettings('pen', {
                color: colorValue,
            });
        } else if (currentTool === 'text' && setting === 'color') {
            this.toolStateManager.updateToolSettings('text', {
                color: colorValue,
            });
        } else if (currentTool === 'brush' && setting === 'color') {
            this.toolStateManager.updateToolSettings('brush', {
                color: colorValue,
            });
        } else if (currentTool === 'shapes' && setting === 'color') {
            this.toolStateManager.updateToolSettings('shapes', {
                color: colorValue,
            });
        }

        // Trigger callback if set
        if (this.onColorChangeCallback) {
            this.onColorChangeCallback(colorValue);
        }

        // Trigger settings callback if set
        if (this.onToolSettingsChangeCallback) {
            this.onToolSettingsChangeCallback(currentTool, {
                [setting]: colorValue,
            });
        }
    }

    /**
     * Handle shape selection
     */
    private handleShapeSelection(event: Event): void {
        event.preventDefault();
        const icon = event.currentTarget as HTMLImageElement;

        if (!icon || !icon.src) {
            console.warn('🔶 SHAPES: Invalid icon element in shape selection');
            return;
        }

        // Extract shape type from the image src path
        let shapeType: string | null = null;
        if (icon.src.includes('shape-circle.svg')) {
            shapeType = 'circle';
        } else if (icon.src.includes('shape-rectangle.svg')) {
            shapeType = 'rectangle';
        } else if (icon.src.includes('shape-triangle.svg')) {
            shapeType = 'triangle';
        }

        if (!shapeType) {
            console.warn(
                '🔶 SHAPES: No shape type found in icon src:',
                icon.src,
            );
            return;
        }

        console.log(`🔶 SHAPES: Selected shape type: ${shapeType}`);

        // Update UI - remove active class from all shape icons
        document.querySelectorAll('.tools__icon').forEach(img => {
            img.classList.remove('tools__icon--active');
        });

        // Add active class to clicked icon
        icon.classList.add('tools__icon--active');

        // Update shape selection in ToolStateManager
        this.toolStateManager.setSelectedShape(shapeType);

        // Update tool settings for the shape tool
        this.toolStateManager.updateToolSettings('shapes', {
            shapeType: shapeType as
                | 'rectangle'
                | 'triangle'
                | 'circle'
                | 'ellipse'
                | 'line'
                | 'arrow'
                | 'polygon',
        });

        // Trigger callback if set
        if (this.onToolSettingsChangeCallback) {
            this.onToolSettingsChangeCallback('shapes', { shapeType });
        }
    }

    /**
     * Initialize shape selection from saved state (not hardcoded default)
     */
    private initializeDefaultShapeSelection(): void {
        // Get the saved shape from ToolStateManager instead of forcing rectangle
        const savedShape = this.toolStateManager.getSelectedShape() || 'rectangle';
        
        const shapeIcon = document.querySelector(
            `img[src*="shape-${savedShape}.svg"]`,
        ) as HTMLElement;
        
        if (shapeIcon) {
            // Remove active class from all shape icons first
            document.querySelectorAll('.tools__icon').forEach(img => {
                img.classList.remove('tools__icon--active');
            });
            
            // Add active class to the saved shape
            shapeIcon.classList.add('tools__icon--active');
            this.toolStateManager.setSelectedShape(savedShape);
            
            // Update tool settings to match saved shape
            this.toolStateManager.updateToolSettings('shapes', {
                shapeType: savedShape as
                    | 'rectangle'
                    | 'triangle'
                    | 'circle'
                    | 'ellipse'
                    | 'line'
                    | 'arrow'
                    | 'polygon',
            });
            
            console.log(
                `🔶 SHAPES: Initialized with saved shape: ${savedShape}`,
            );
        } else {
            console.warn(`🔶 SHAPES: Could not find icon for saved shape: ${savedShape}`);
        }
    }

    /**
     * Bind canvas action events
     */
    private bindCanvasActions(): void {
        // Clear canvas button
        const clearBtn = document.getElementById('clear-canvas');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                const event = new CustomEvent('clearCanvas');
                document.dispatchEvent(event);
            });
        }

        // Clear all button
        const clearAllBtn = document.getElementById('clear-all');
        if (clearAllBtn) {
            clearAllBtn.addEventListener('click', () => {
                const event = new CustomEvent('clearAll');
                document.dispatchEvent(event);
            });
        }

        // Add page button
        const addPageBtn = document.getElementById('add-page');
        if (addPageBtn) {
            addPageBtn.addEventListener('click', () => {
                const event = new CustomEvent('addPage');
                document.dispatchEvent(event);
            });
        }

        // Layout toggle button
        const layoutToggleBtn = document.getElementById('toggle-layout');
        if (layoutToggleBtn) {
            layoutToggleBtn.addEventListener('click', () => {
                const event = new CustomEvent('toggleLayout');
                document.dispatchEvent(event);
            });
        }
    }

    /**
     * Cleanup event listeners
     */
    destroy(): void {
        document.removeEventListener('click', this.handleGlobalClick);
        // Additional cleanup as needed
    }
}
