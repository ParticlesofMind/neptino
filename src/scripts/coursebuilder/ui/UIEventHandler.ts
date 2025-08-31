/**
 * UI Event Handler
 * Manages DOM events and user interactions for the coursebuilder interface
 * Single Responsibility: Event handling and UI interactions only
 */

import { ToolStateManager } from './ToolStateManager';

export class UIEventHandler {
    private toolStateManager: ToolStateManager;

    constructor(toolStateManager: ToolStateManager) {
        this.toolStateManager = toolStateManager;
        this.bindEvents();
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

        // Plus/minus button events for number inputs
        document
            .querySelectorAll('.tools__button[data-action]')
            .forEach(button => {
                button.addEventListener(
                    'click',
                    this.handleNumberButtonClick.bind(this),
                );
            });

        // Canvas actions
        this.bindCanvasActions();

        // Initialize default shape selection
        this.initializeDefaultShapeSelection();

        // Initialize color dropdowns with saved values
        this.initializeColorDropdowns();
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

        // Shape selection is now handled by direct event binding to .tools__shape-item
        // No need to handle it in global click anymore
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

        // Clean architecture: UI delegates to state manager, no callbacks needed
        this.toolStateManager.setTool(toolName);
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

        // Clean architecture: delegate to state manager
        this.toolStateManager.updateCurrentToolColor(colorValue);
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
        } else if (currentTool === 'shapes' && setting === 'strokeWidth') {
            this.toolStateManager.updateToolSettings('shapes', {
                strokeWidth: Math.max(1, numericValue), // Ensure positive stroke width
            });
        } else if (['pen', 'brush', 'eraser'].includes(currentTool) && setting === 'size') {
            this.toolStateManager.updateToolSettings(currentTool, {
                [setting]: numericValue,
            });
        }

        // Settings already applied through toolStateManager.updateToolSettings()
    }

    /**
     * Handle plus/minus button clicks for number inputs
     */
    private handleNumberButtonClick(event: Event): void {
        const button = event.currentTarget as HTMLButtonElement;
        const action = button.dataset.action;
        const toolItem = button.closest('.tools__item');
        const numberInput = toolItem?.querySelector('input[type="number"][data-setting]') as HTMLInputElement;
        
        if (!numberInput || !action) return;
        
        const min = parseInt(numberInput.min) || 1;
        const max = parseInt(numberInput.max) || 100;
        let currentValue = parseInt(numberInput.value) || min;
        
        if (action === 'increase' && currentValue < max) {
            currentValue += 1;
        } else if (action === 'decrease' && currentValue > min) {
            currentValue -= 1;
        }
        
        numberInput.value = currentValue.toString();
        
        const changeEvent = new Event('input', { bubbles: true });
        numberInput.dispatchEvent(changeEvent);
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
        }
        // Note: shapes are now handled by the grid, not select dropdown
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

        // Color and settings already applied through toolStateManager methods
    }

    /**
     * Handle color selection from Select2 dropdown
     * Public method called by Select2 configuration
     */
    public handleColorChange(colorSelector: string, colorHex: string): void {
        if (!colorSelector || !colorHex) {
            console.warn('🎨 COLOR: Invalid color selection parameters');
            return;
        }

        console.log(`🎨 UI: Color changed for ${colorSelector} to ${colorHex}`);

        // Map compound selectors to tool and property
        const toolMapping: { [key: string]: { tool: string; property: string } } = {
            'pen-stroke': { tool: 'pen', property: 'strokeColor' },
            'pen-fill': { tool: 'pen', property: 'fillColor' },
            'shapes-stroke': { tool: 'shapes', property: 'color' }, // Fixed: shapes stroke uses 'color' property
            'shapes-fill': { tool: 'shapes', property: 'fillColor' },
            'brush': { tool: 'brush', property: 'color' },
            'text': { tool: 'text', property: 'color' }
        };

        const mapping = toolMapping[colorSelector];
        if (mapping) {
            // Update tool settings with the specific color property
            const settings: any = {};
            settings[mapping.property] = colorHex;
            this.toolStateManager.updateToolSettings(mapping.tool, settings);
            
            console.log(`🎨 UI: Updated ${mapping.tool}.${mapping.property} to ${colorHex}`);
        } else {
            console.warn(`🎨 UI: Unknown color selector: ${colorSelector}`);
        }
    }

    /**
     * Handle shape selection from Select2 dropdown
     * Public method called by Select2 configuration
     */
    public handleShapeSelection(shapeType: string): void {
        if (!shapeType) {
            console.warn('🔶 SHAPES: No shape type provided');
            return;
        }

        console.log(`🔶 SHAPES: Selected shape type: ${shapeType}`);

        // Activate the shapes tool first
        this.toolStateManager.setTool('shapes');

        // Update state manager with selected shape
        this.toolStateManager.setSelectedShape(shapeType);
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

        // Ensure the canvas gets the updated shape settings immediately
        const canvasAPI = (window as any).canvasAPI;
        if (canvasAPI) {
            try {
                canvasAPI.setToolSettings('shapes', { shapeType });
                console.log(`🔶 CANVAS: Applied shape type: ${shapeType}`);
            } catch (error) {
                console.error('❌ CANVAS: Error applying shape settings:', error);
            }
        }
    }

    /**
     * Initialize shape selection from saved state for Select2
     */
    private initializeDefaultShapeSelection(): void {
        const savedShape = this.toolStateManager.getSelectedShape() || 'rectangle';
        
        console.log(`🔶 SHAPES: Initializing with saved shape: ${savedShape}`);
        
        // Set the Select2 value
        const shapeSelect = document.querySelector('#shapes-select') as HTMLSelectElement;
        if (shapeSelect && (window as any).$) {
            (window as any).$('#shapes-select').val(savedShape).trigger('change');
        }
        
        // Update tool settings
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
    }

    /**
     * Handle font family changes from Select2 dropdown
     * Public method called by Select2 configuration
     */
    public handleFontChange(fontFamily: string): void {
        if (!fontFamily) {
            console.warn('🔤 FONT: No font family provided');
            return;
        }

        console.log(`🔤 UI: Font changed to ${fontFamily}`);
        
        // Update text tool settings
        this.toolStateManager.updateToolSettings('text', {
            fontFamily: fontFamily,
        });
    }

    /**
     * Handle stroke type changes from Select2 dropdown
     * Public method called by Select2 configuration
     */
    public handleStrokeTypeChange(strokeType: string): void {
        if (!strokeType) {
            console.warn('✏️ STROKE: No stroke type provided');
            return;
        }

        console.log(`✏️ UI: Stroke type changed to ${strokeType}`);
        
        // Update pen tool settings
        this.toolStateManager.updateToolSettings('pen', {
            strokeType: strokeType,
        });
    }

    /**
     * Initialize color dropdowns with saved values
     */
    public initializeColorDropdowns(): void {
        const toolSettings = this.toolStateManager.getToolSettings();
        
        // Wait for jQuery and Select2 to be available
        const initializeWhenReady = () => {
            if (!(window as any).$) {
                setTimeout(initializeWhenReady, 100);
                return;
            }

            console.log('🎨 INIT: Initializing color dropdowns with saved values...');

            // Restore pen colors
            if (toolSettings.pen.strokeColor) {
                const penStroke = (window as any).$('#pen-stroke-select');
                if (penStroke.length) {
                    penStroke.val(toolSettings.pen.strokeColor).trigger('change.select2');
                    console.log(`🎨 INIT: Set pen stroke color to ${toolSettings.pen.strokeColor}`);
                }
            }

            if (toolSettings.pen.fillColor) {
                const penFill = (window as any).$('#pen-fill-select');
                if (penFill.length) {
                    penFill.val(toolSettings.pen.fillColor).trigger('change.select2');
                    console.log(`🎨 INIT: Set pen fill color to ${toolSettings.pen.fillColor}`);
                }
            }

            // Restore brush color
            if (toolSettings.brush.color) {
                const brushColor = (window as any).$('#brush-color-select');
                if (brushColor.length) {
                    brushColor.val(toolSettings.brush.color).trigger('change.select2');
                    console.log(`🎨 INIT: Set brush color to ${toolSettings.brush.color}`);
                }
            }

            // Restore shapes colors
            if (toolSettings.shapes.color) {
                const shapesStroke = (window as any).$('#shapes-stroke-select');
                if (shapesStroke.length) {
                    shapesStroke.val(toolSettings.shapes.color).trigger('change.select2');
                    console.log(`🎨 INIT: Set shapes stroke color to ${toolSettings.shapes.color}`);
                }
            }

            if (toolSettings.shapes.fillColor) {
                const shapesFill = (window as any).$('#shapes-fill-select');
                if (shapesFill.length) {
                    shapesFill.val(toolSettings.shapes.fillColor).trigger('change.select2');
                    console.log(`🎨 INIT: Set shapes fill color to ${toolSettings.shapes.fillColor}`);
                }
            }

            // Restore text color
            if (toolSettings.text.color) {
                const textColor = (window as any).$('#text-color-select');
                if (textColor.length) {
                    textColor.val(toolSettings.text.color).trigger('change.select2');
                    console.log(`🎨 INIT: Set text color to ${toolSettings.text.color}`);
                }
            }
        };

        // Start the initialization process
        setTimeout(initializeWhenReady, 500); // Give time for DOM and libraries to load
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
