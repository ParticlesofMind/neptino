/**
 * Tool State Manager
 * Manages tool selection, settings, and state for the coursebuilder
 * Single Responsibility: Tool management only
 */

interface ToolSettings {
    selection: {
        enabled: boolean;
    };
    pen: {
        color: string;
        size: number;
        strokeColor: string;
        fillColor: string;
        strokeType?: string;
    };
    text: {
        fontFamily: string;
        fontSize: number;
        color: string;
    };
    brush: {
        color: string;
        opacity: number;
        size: number;
    };
    shapes: {
        color: string;
        strokeWidth: number;
        fillColor?: string;
        strokeColor: string;
        shapeType:
            | 'rectangle'
            | 'triangle'
            | 'circle'
            | 'ellipse'
            | 'line'
            | 'arrow'
            | 'polygon';
    };
    eraser: {
        size: number;
    };
    tables: {
        rows: number;
        columns: number;
    };
}

interface IconState {
    modes: string;
    media: string | null;
    tools: string;
    navigation: string | null;
    shape: string | null;
    toolSettings?: ToolSettings; // Add tool settings to persistence
}

export class ToolStateManager {
    private currentTool: string = 'selection';
    private currentMode: string = 'build';
    private selectedMedia: string | null = 'files';
    private selectedNavigation: string | null = 'Outline';
    private selectedShape: string | null = null;
    private toolSettings: ToolSettings;
    private storageKey = 'coursebuilder-icon-states';
    private canvasRetryAttempted = false; // Prevent infinite retry loops
    private selectionContextTool: string | null = null; // tool options to show when selection is active

    constructor() {
        this.toolSettings = {
            selection: {
                enabled: true,
            },
            pen: {
                color: '#1a1a1a',        // Black (matches HTML)
                size: 2,
                strokeColor: '#1a1a1a',  // Black (matches HTML)
                fillColor: '#f8fafc',    // White (matches HTML)
            },
            text: {
                fontFamily: 'Arial',
                fontSize: 16,
                color: '#1a1a1a',        // Black (matches HTML)
            },
            brush: {
                color: '#4a7c59',        // Green (matches HTML)
                opacity: 0.3,
                size: 20,
            },
            shapes: {
                color: '#4a79a4',        // Blue (matches HTML stroke default)
                strokeWidth: 2,
                strokeColor: '#4a79a4',  // Blue (matches HTML)
                fillColor: '#f8fafc',    // White (matches HTML)
                shapeType: 'rectangle',
            },
            eraser: {
                size: 20,
            },
            tables: {
                rows: 3,
                columns: 3,
            },
        };

        // Load saved states from localStorage or set defaults
        this.loadSavedStates();

        // Set initial selected states
        this.setInitialSelections();

        // Listen for color changes from ToolColorManager
        this.bindColorChangeEvents();

        // Listen for selection context to surface relevant options while Selection tool is active
        document.addEventListener('selection:context', (e: Event) => {
            const detail = (e as CustomEvent).detail || {};
            const type = detail.type as string | null;
            this.selectionContextTool = type && type !== 'mixed' ? type : null;
            if (this.currentTool === 'selection') {
                // Only toggle the options panel; do not change the active canvas tool
                this.showSettingsPanelFor(this.selectionContextTool);
            }
        });
    }

    /**
     * Bind color change events from ToolColorManager
     */
    private bindColorChangeEvents(): void {
        document.addEventListener('toolColorChange', (event: Event) => {
            const customEvent = event as CustomEvent;
            const { tool, hex } = customEvent.detail;
            
            if (tool && hex) {
                // Map compound selectors to base tools and properties
                const toolMapping: { [key: string]: { tool: string; property: string } } = {
                    'pen-stroke': { tool: 'pen', property: 'strokeColor' },
                    'pen-fill': { tool: 'pen', property: 'fillColor' },
                    'shapes-stroke': { tool: 'shapes', property: 'color' }, // Fixed: shapes stroke uses 'color' property
                    'shapes-fill': { tool: 'shapes', property: 'fillColor' },
                    'brush': { tool: 'brush', property: 'color' },
                    'text': { tool: 'text', property: 'color' },
                    'eraser': { tool: 'eraser', property: 'color' },
                    'tables': { tool: 'tables', property: 'color' }
                };
                
                const mapping = toolMapping[tool];
                if (mapping) {
                    // Update tool settings with the specific color property
                    const settings: any = {};
                    settings[mapping.property] = hex;
                    this.updateToolSettings(mapping.tool, settings);
                    console.log(`🎨 COLOR SYNC: Updated ${mapping.tool}.${mapping.property} to ${hex}`);
                } else {
                    // Fallback for simple tool names
                    this.updateToolSettings(tool, { color: hex });
                    console.log(`🎨 COLOR SYNC: Updated ${tool} color to ${hex}`);
                }
            }
        });
    }

    /**
     * Load saved icon states from localStorage
     */
    private loadSavedStates(): void {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const iconState: IconState = JSON.parse(saved);
                this.currentMode = iconState.modes || 'build';
                this.currentTool = iconState.tools || 'selection';
                this.selectedMedia = iconState.media || 'files';
                this.selectedNavigation = iconState.navigation || 'Outline';
                this.selectedShape = iconState.shape;
                
                // Load tool settings if available
                if (iconState.toolSettings) {
                    this.toolSettings = { ...this.toolSettings, ...iconState.toolSettings };
                }
            } else {
                // Set defaults to first icons if no localStorage exists
                this.setDefaultSelections();
            }
        } catch (error) {
            console.warn('Error loading coursebuilder states:', error);
            this.setDefaultSelections();
        }
    }

    /**
     * Set default selections to first icon in each category
     */
    private setDefaultSelections(): void {
        // Set hardcoded defaults first as fallbacks
        this.currentMode = 'build';
        this.currentTool = 'selection';
        this.selectedMedia = 'files';
        this.selectedNavigation = 'Outline';

        // Try to get first icons from DOM and override if available
        const firstMode = document.querySelector('[data-mode]') as HTMLElement;
        const firstTool = document.querySelector('[data-tool]') as HTMLElement;
        const firstMedia = document.querySelector(
            '[data-media]',
        ) as HTMLElement;
        const firstNav = document.querySelector(
            '.engine__nav-course .nav-course__item',
        ) as HTMLElement;

        if (firstMode?.dataset.mode) {
            this.currentMode = firstMode.dataset.mode;
        }
        if (firstTool?.dataset.tool) {
            this.currentTool = firstTool.dataset.tool;
        }
        if (firstMedia?.dataset.media) {
            this.selectedMedia = firstMedia.dataset.media;
        }
        if (firstNav?.querySelector('.icon-label')?.textContent) {
            this.selectedNavigation =
                firstNav.querySelector('.icon-label')!.textContent;
        }
    } /**
     * Save current states to localStorage
     */
    private saveStates(): void {
        try {
            const iconState: IconState = {
                modes: this.currentMode,
                tools: this.currentTool,
                media: this.selectedMedia,
                navigation: this.selectedNavigation,
                shape: this.selectedShape,
                toolSettings: this.toolSettings, // Save tool settings
            };
            localStorage.setItem(this.storageKey, JSON.stringify(iconState));
        } catch (error) {
            console.warn('Error saving coursebuilder states:', error);
        }
    }

    /**
     * Set initial selected states
     */
    private setInitialSelections(): void {
        // Use immediate execution instead of setTimeout to prevent race conditions
        // Ensure UI state is synchronized with canvas state immediately
        console.log('🔧 SYNC: Setting initial tool selections...');
        
        this.setMode(this.currentMode);
        
        // CRITICAL: Ensure the tool change is properly propagated
        console.log(`🔧 SYNC: Setting initial tool to "${this.currentTool}"`);
        this.setTool(this.currentTool);
        
        // Always set media and navigation since they now have default values
        this.setSelectedMedia(this.selectedMedia);
        this.setSelectedNavigation(this.selectedNavigation);
        if (this.selectedShape) {
            this.setSelectedShape(this.selectedShape);
        }

        // CRITICAL: Restore saved tool settings to HTML elements
        this.restoreToolSettingsToUI();

        // Add verification step to ensure synchronization
        setTimeout(() => {
            this.verifyToolSynchronization();
        }, 500);
    }

    /**
     * Set current mode
     */
    setMode(modeName: string): void {
        this.currentMode = modeName;
        this.updateModeUI(modeName);
        this.saveStates();
    }

    /**
     * Get current mode
     */
    getCurrentMode(): string {
        return this.currentMode;
    }

    /**
     * Set current tool and apply its settings to canvas
     */
    setTool(toolName: string): void {
        this.currentTool = toolName;
        this.updateToolUI(toolName);
        
        // 🎯 UNIFIED TOOL MANAGEMENT: Notify coordinator about drawing tool selection
        const toolCoordinator = (window as any).toolCoordinator;
        if (toolCoordinator && typeof toolCoordinator.setDrawingTool === 'function') {
            toolCoordinator.setDrawingTool(toolName);
        }
        
        // 🎯 GRAB TOOL MANAGEMENT: Deactivate grab tool when any drawing tool is selected
        this.deactivateGrabToolIfActive();
        
        // CRITICAL: Actually set the tool in canvas first, then apply settings
        const canvasAPI = (window as any).canvasAPI;
        if (canvasAPI) {
            const success = canvasAPI.setTool(toolName);
            if (success) {
                console.log(`✅ TOOL SYNC: Canvas tool successfully set to: ${toolName}`);
                // Apply saved tool settings after successfully changing the tool
                this.applyToolSettingsToCanvas(toolName);
                // Ensure drawing events are enabled whenever a drawing tool is selected
                if (typeof canvasAPI.enableDrawingEvents === 'function') {
                    canvasAPI.enableDrawingEvents();
                }
            } else {
                console.error(`❌ TOOL SYNC: Failed to set canvas tool to: ${toolName}`);
            }
        } else {
            // Canvas API not ready yet - settings will be applied when it becomes available
            console.debug(`🔧 TOOL SYNC: Canvas API not yet available for tool "${toolName}" (will sync when ready)`);
            this.applyToolSettingsToCanvas(toolName);
        }
        
        this.saveStates();
    }

    /**
     * Deactivate grab tool if it's currently active
     * This ensures drawing tools don't conflict with viewport grab tool
     */
    private deactivateGrabToolIfActive(): void {
        const perspectiveManager = (window as any).perspectiveManager;
        if (perspectiveManager && typeof perspectiveManager.deactivateGrabTool === 'function') {
            perspectiveManager.deactivateGrabTool();
        }
    }

    /**
     * Deactivate all drawing tools
     * Called by perspective tools (like grab) to enforce "one tool at a time" rule
     */
    public deactivateAllDrawingTools(): void {
        console.log('🔧 TOOLS: Deactivating all drawing tools');
        
        // Clear visual states for all drawing tool buttons
        document.querySelectorAll('[data-tool]').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Clear internal state (keep current tool reference for later reactivation)
        const previousTool = this.currentTool;
        // Don't change currentTool - keep it for when we reactivate
        
        // CRITICAL: Disable canvas drawing events completely
        const canvasAPI = (window as any).canvasAPI;
        if (canvasAPI && typeof canvasAPI.disableDrawingEvents === 'function') {
            canvasAPI.disableDrawingEvents();
            console.log('🚫 CANVAS: Drawing events DISABLED - grab tool can work without interference');
        } else {
            console.warn('⚠️ CANVAS: Could not disable drawing events - grab tool may conflict');
        }
        
        console.log(`✅ TOOLS: All drawing tools deactivated and canvas events disabled (keeping: ${previousTool})`);
    }

    /**
     * Get current tool
     */
    getCurrentTool(): string {
        return this.currentTool;
    }

    /**
     * Get selection context tool (brush/pen/shapes/text/tables) if any
     */
    getSelectionContextTool(): string | null {
        return this.selectionContextTool;
    }

    /**
     * Set selected media
     */
    setSelectedMedia(mediaId: string | null): void {
        this.selectedMedia = mediaId;
        this.updateMediaUI(mediaId);
        this.saveStates();
        try {
            const evt = new CustomEvent('media:selected', { detail: mediaId });
            document.dispatchEvent(evt);
        } catch {}
    }

    /**
     * Get selected media
     */
    getSelectedMedia(): string | null {
        return this.selectedMedia;
    }

    /**
     * Set selected navigation
     */
    setSelectedNavigation(navTitle: string | null): void {
        this.selectedNavigation = navTitle;
        this.updateNavigationUI(navTitle);
        this.saveStates();
    }

    /**
     * Get selected navigation
     */
    getSelectedNavigation(): string | null {
        return this.selectedNavigation;
    }

    /**
     * Set selected shape and update tool settings
     */
    setSelectedShape(shapeName: string | null): void {
        this.selectedShape = shapeName;
        this.updateShapeUI(shapeName);
        
        // Update tool settings for shapes tool
        if (shapeName && this.currentTool === 'shapes') {
            this.updateToolSettings('shapes', {
                shapeType: shapeName as 'rectangle' | 'triangle' | 'circle' | 'ellipse' | 'line' | 'arrow' | 'polygon',
            });
        }
        
        this.saveStates();
    }

    /**
     * Get selected shape
     */
    getSelectedShape(): string | null {
        return this.selectedShape;
    }

    /**
     * Public method to force tool synchronization verification
     * Useful for debugging or when synchronization issues are detected
     */
    public forceSyncVerification(): void {
        this.verifyToolSynchronization();
    }

    /**
     * Update tool settings and apply them immediately
     */
    updateToolSettings(
        toolName: string,
        settings: Partial<ToolSettings[keyof ToolSettings]>,
    ): void {
        if (toolName in this.toolSettings) {
            Object.assign(
                this.toolSettings[toolName as keyof ToolSettings],
                settings,
            );
            
            // Special handling for pen tool to maintain backward compatibility
            if (toolName === 'pen') {
                const penSettings = this.toolSettings.pen as any;
                // If strokeColor is updated, also update the legacy color property
                if ('strokeColor' in settings) {
                    penSettings.color = (settings as any).strokeColor;
                }
                // If color is updated, also update strokeColor
                if ('color' in settings) {
                    penSettings.strokeColor = (settings as any).color;
                }
            }
            
            // Apply settings to canvas immediately if this is the current tool
            if (toolName === this.currentTool) {
                this.applyToolSettingsToCanvas(toolName);
            }
            
            // If selection tool is active and the settings correspond to the selected object type,
            // apply these settings to the current selection immediately.
            if (this.currentTool === 'selection' && this.selectionContextTool === toolName) {
                const canvasAPI = (window as any).canvasAPI;
                if (canvasAPI && typeof canvasAPI.applySettingsToSelection === 'function') {
                    try { canvasAPI.applySettingsToSelection(toolName, settings); } catch {}
                }
            }
            
            // Save states whenever tool settings are updated
            this.saveStates();
            
            console.log(`🔧 SETTINGS: Updated ${toolName}:`, settings);
        }
    }

    /**
     * Update color for the current tool
     */
    updateCurrentToolColor(color: string): void {
        console.log(`🎨 TOOL COLOR: Updating ${this.currentTool} color to ${color}`);
        
        // Update tool settings with new color
        const toolSettings = this.toolSettings[this.currentTool as keyof ToolSettings] as any;
        if (toolSettings && 'color' in toolSettings) {
            toolSettings.color = color;
            
            // Apply to canvas immediately
            this.applyToolSettingsToCanvas(this.currentTool);
            
            // Save states
            this.saveStates();
        }

        // Also apply to selection when selection tool is active and we have context
        if (this.currentTool === 'selection' && this.selectionContextTool) {
            const canvasAPI = (window as any).canvasAPI;
            if (canvasAPI && typeof canvasAPI.applySettingsToSelection === 'function') {
                const t = this.selectionContextTool;
                const payload: any = { color };
                if (t === 'pen') payload.strokeColor = color;
                if (t === 'shapes') payload.strokeColor = color;
                try { canvasAPI.applySettingsToSelection(t, payload); } catch {}
            }
        }
    }

    /**
     * Get tool settings
     */
    getToolSettings(): ToolSettings {
        return { ...this.toolSettings };
    }

    /**
     * Apply saved tool settings to canvas (colors, shapes, etc.)
     */
    private applyToolSettingsToCanvas(toolName: string): void {
        const canvasAPI = (window as any).canvasAPI;
        if (!canvasAPI) {
            // Canvas API not ready yet - this is normal during initialization
            console.debug(`🔧 CANVAS: Canvas API not yet available for ${toolName} settings (will apply when ready)`);
            
            // Try to apply settings after a short delay if canvas is still initializing
            if (typeof window !== 'undefined' && !this.canvasRetryAttempted) {
                this.canvasRetryAttempted = true;
                setTimeout(() => {
                    this.canvasRetryAttempted = false;
                    this.applyToolSettingsToCanvas(toolName);
                }, 100);
            }
            return;
        }

        const toolSettings = this.toolSettings[toolName as keyof ToolSettings] as any;
        if (!toolSettings) {
            console.warn(`⚠️ CANVAS: No settings found for tool: ${toolName}`);
            return;
        }

        try {
            // Apply color settings based on tool type
            if (toolName === 'pen') {
                // For pen tool, apply both stroke and fill colors
                if (toolSettings.strokeColor) {
                    canvasAPI.setToolColor(toolSettings.strokeColor, 'stroke');
                    console.log(`🎨 CANVAS: Applied pen stroke color: ${toolSettings.strokeColor}`);
                }
                if (toolSettings.fillColor) {
                    canvasAPI.setToolColor(toolSettings.fillColor, 'fill');
                    console.log(`🎨 CANVAS: Applied pen fill color: ${toolSettings.fillColor}`);
                }
            } else if (toolName === 'shapes') {
                // For shapes tool, apply both stroke and fill colors
                if (toolSettings.strokeColor) {
                    canvasAPI.setToolColor(toolSettings.strokeColor, 'stroke');
                    console.log(`🎨 CANVAS: Applied shapes stroke color: ${toolSettings.strokeColor}`);
                }
                if (toolSettings.fillColor) {
                    canvasAPI.setToolColor(toolSettings.fillColor, 'fill');
                    console.log(`🎨 CANVAS: Applied shapes fill color: ${toolSettings.fillColor}`);
                }
            } else if (toolSettings.color) {
                // For other tools, apply the simple color
                canvasAPI.setToolColor(toolSettings.color);
                console.log(`🎨 CANVAS: Applied ${toolName} color: ${toolSettings.color}`);
            }

            // Apply all tool-specific settings
            canvasAPI.setToolSettings(toolName, toolSettings);
            console.log(`🔧 CANVAS: Applied ${toolName} settings:`, toolSettings);
        } catch (error) {
            console.error(`❌ CANVAS: Error applying ${toolName} settings:`, error);
        }
    }

    /**
     * Restore saved tool settings to HTML UI elements
     */
    private restoreToolSettingsToUI(): void {
        console.log('🔧 SYNC: Restoring saved tool settings to UI elements...');

        // Restore number inputs (for size settings)
        document.querySelectorAll('input[type="number"][data-setting]').forEach(input => {
            const numberInput = input as HTMLInputElement;
            const setting = numberInput.dataset.setting!;
            const toolContainer = numberInput.closest('.tools__item[data-tool]') as HTMLElement;
            
            if (toolContainer) {
                const toolName = toolContainer.dataset.tool!;
                const toolSettings = this.toolSettings[toolName as keyof ToolSettings] as any;
                
                if (toolSettings && setting in toolSettings) {
                    const savedValue = toolSettings[setting];
                    numberInput.value = String(savedValue);
                    
                    console.log(`↻ Restored ${toolName} ${setting} to: ${savedValue}`);
                }
            }
        });

        // Restore select dropdowns (font family, etc.)
        document.querySelectorAll('select[data-setting]').forEach(select => {
            const selectElement = select as HTMLSelectElement;
            const setting = selectElement.dataset.setting!;
            const toolContainer = selectElement.closest('.tools__item[data-tool]') as HTMLElement;
            
            if (toolContainer) {
                const toolName = toolContainer.dataset.tool!;
                const toolSettings = this.toolSettings[toolName as keyof ToolSettings] as any;
                
                if (toolSettings && setting in toolSettings) {
                    const savedValue = toolSettings[setting];
                    selectElement.value = savedValue;
                    console.log(`🔧 SYNC: Restored ${toolName}.${setting} = ${savedValue}`);
                }
            }
        });

        // Restore number inputs (rows, columns, etc.)
        document.querySelectorAll('input[type="number"][data-setting]').forEach(input => {
            const numberInput = input as HTMLInputElement;
            const setting = numberInput.dataset.setting!;
            const toolContainer = numberInput.closest('.tools__item[data-tool]') as HTMLElement;
            
            if (toolContainer) {
                const toolName = toolContainer.dataset.tool!;
                const toolSettings = this.toolSettings[toolName as keyof ToolSettings] as any;
                
                if (toolSettings && setting in toolSettings) {
                    const savedValue = toolSettings[setting];
                    numberInput.value = String(savedValue);
                    console.log(`🔧 SYNC: Restored ${toolName}.${setting} = ${savedValue}`);
                }
            }
        });

        // Note: Color selectors are handled by ToolColorManager
        // Restore colors by calling ToolColorManager's setToolColor method
        setTimeout(() => {
            // Use setTimeout to ensure ToolColorManager is initialized
            const toolColorManager = (window as any).toolColorManager;
            if (toolColorManager) {
                Object.keys(this.toolSettings).forEach(toolName => {
                    const toolSettings = this.toolSettings[toolName as keyof ToolSettings] as any;
                    
                    // Handle compound color properties for pen and shapes
                    if (toolName === 'pen') {
                        if (toolSettings.strokeColor) {
                            toolColorManager.setToolColor('pen-stroke', toolSettings.strokeColor);
                            console.log(`🔧 SYNC: Restored pen stroke color = ${toolSettings.strokeColor}`);
                        }
                        if (toolSettings.fillColor) {
                            toolColorManager.setToolColor('pen-fill', toolSettings.fillColor);
                            console.log(`🔧 SYNC: Restored pen fill color = ${toolSettings.fillColor}`);
                        }
                    } else if (toolName === 'shapes') {
                        if (toolSettings.strokeColor) {
                            toolColorManager.setToolColor('shapes-stroke', toolSettings.strokeColor);
                            console.log(`🔧 SYNC: Restored shapes stroke color = ${toolSettings.strokeColor}`);
                        }
                        if (toolSettings.fillColor) {
                            toolColorManager.setToolColor('shapes-fill', toolSettings.fillColor);
                            console.log(`🔧 SYNC: Restored shapes fill color = ${toolSettings.fillColor}`);
                        }
                    } else if (toolSettings.color) {
                        // Handle simple color property for other tools
                        toolColorManager.setToolColor(toolName, toolSettings.color);
                        console.log(`🔧 SYNC: Restored color for ${toolName} = ${toolSettings.color}`);
                    }
                });
                
                // Apply current tool settings to canvas immediately
                this.applyToolSettingsToCanvas(this.currentTool);
            } else {
                console.warn('⚠️ SYNC: ToolColorManager not available for color restoration');
            }
        }, 100);
    }

    /**
     * Update mode UI to reflect current selection
     */
    private updateModeUI(modeName: string): void {
        // Remove selected class from all mode items
        document.querySelectorAll('[data-mode]').forEach(element => {
            element.classList.remove('mode__item--active');
            const parentItem = element.closest('.mode__item');
            if (parentItem) {
                parentItem.classList.remove('mode__item--active');
            }
        });

        // Add selected class to current mode
        const selectedMode = document.querySelector(
            `[data-mode="${modeName}"]`,
        );
        if (selectedMode) {
            const parentItem = selectedMode.closest('.mode__item');
            if (parentItem) {
                parentItem.classList.add('mode__item--active');
            }
        }
    }

    /**
     * Update media UI to reflect current selection
     */
    private updateMediaUI(mediaId: string | null): void {
        // Remove selected class from all media items
        document.querySelectorAll('[data-media]').forEach(element => {
            element.classList.remove('media__item--active');
            const parentItem = element.closest('.media__item');
            if (parentItem) {
                parentItem.classList.remove('media__item--active');
            }
        });

        // Add selected class to current media if one is selected
        if (mediaId) {
            const selectedMedia = document.querySelector(
                `[data-media="${mediaId}"]`,
            );
            if (selectedMedia) {
                const parentItem = selectedMedia.closest('.media__item');
                if (parentItem) {
                    parentItem.classList.add('media__item--active');
                }
            }
        }
    }

    /**
     * Update navigation UI to reflect current selection
     */
    private updateNavigationUI(navTitle: string | null): void {
        // Remove selected class from all navigation items
        document
            .querySelectorAll('.engine__nav-course .nav-course__item')
            .forEach(element => {
                element.classList.remove('nav-course__item--active');
            });

        // Add selected class to current navigation if one is selected
        if (navTitle) {
            const navItems = document.querySelectorAll(
                '.engine__nav-course .nav-course__item',
            );
            navItems.forEach(item => {
                const label = item.querySelector('.icon-label');
                if (label && label.textContent === navTitle) {
                    item.classList.add('nav-course__item--active');
                }
            });
        }
    }

    /**
     * Update shape UI to reflect current selection
     */
    private updateShapeUI(shapeName: string | null): void {
        if (!shapeName) return;
        
        // Update the dropdown trigger to show current shape
        const trigger = document.querySelector('.tools__shapes-trigger');
        const triggerIcon = trigger?.querySelector('.tools__icon') as HTMLImageElement;
        
        if (triggerIcon) {
            triggerIcon.src = `/src/assets/icons/coursebuilder/tools/shapes/shape-${shapeName}.svg`;
            triggerIcon.alt = `Selected shape: ${shapeName}`;
            console.log(`🔶 SHAPES: Updated dropdown trigger to show ${shapeName} as selected`);
        }

        // Update active state in dropdown options
        document.querySelectorAll('.tools__shapes-option').forEach(option => {
            option.classList.remove('tools__shapes-option--active');
        });
        
        const selectedOption = document.querySelector(`[data-shape="${shapeName}"]`);
        if (selectedOption) {
            selectedOption.classList.add('tools__shapes-option--active');
        } else {
            console.warn(`🔶 SHAPES: Could not find dropdown option for shape: ${shapeName}`);
        }
    }    /**
     * Update tool UI to reflect current selection
     */
    private updateToolUI(toolName: string): void {
        // Remove selected class from all tool items
        document.querySelectorAll('.tools__item').forEach(element => {
            element.classList.remove('tools__item--active');
            element.classList.remove('active'); // compatibility for tests
        });

        // Add selected class to current tool item
        const selectedTool = document.querySelector(
            `[data-tool="${toolName}"]`,
        );
        if (selectedTool) {
            const parentItem = selectedTool.closest('.tools__item');
                if (parentItem) {
                parentItem.classList.add('tools__item--active');
                parentItem.classList.add('active'); // compatibility for tests
                }
        }

        // Hide placeholder and all tool settings (updated BEM selector)
        const placeholder = document.querySelector(
            '.tools__placeholder',
        ) as HTMLElement;
        if (placeholder) {
            placeholder.style.display = 'none';
        }

        document
            .querySelectorAll('.tools__options .tools__item')
            .forEach(settings => {
                (settings as HTMLElement).style.display = 'none';
            });

        // Show settings for current tool (updated BEM selector)
        const toolSettings = (document.querySelector(
            `.tools__options .tools__item--${toolName}`,
        ) as HTMLElement) || (document.querySelector(
            `.tools__options [data-settings-for="${toolName}"]`,
        ) as HTMLElement);
        if (toolSettings) {
            toolSettings.style.display = 'flex';
        } else if (placeholder) {
            // Show placeholder if no tool settings found
            placeholder.style.display = 'flex';
        }

        // Update canvas cursor
        this.updateCanvasCursor();
    }

    /**
     * Update canvas cursor based on current tool
     */
    public updateCanvasCursor(): void {
        const canvas = document.querySelector('#pixi-canvas') as HTMLElement;
        if (!canvas) return;

        // Remove all cursor classes
        canvas.classList.remove(
            'cursor-pen',
            'cursor-eraser',
            'cursor-text',
            'cursor-brush',
        );

        // Add cursor class for current tool
        switch (this.currentTool) {
            case 'pen':
                canvas.classList.add('cursor-pen');
                break;
            case 'eraser':
                canvas.classList.add('cursor-eraser');
                break;
            case 'text':
                canvas.classList.add('cursor-text');
                break;
            case 'brush':
                canvas.classList.add('cursor-brush');
                break;
            default:
                canvas.classList.add('cursor-default');
                break;
        }
    }

    /**
     * Show only the settings panel for the specified tool without switching tools
     */
    private showSettingsPanelFor(toolName: string | null): void {
        // Hide all panels
        document.querySelectorAll('.tools__options .tools__item').forEach(el => {
            (el as HTMLElement).style.display = 'none';
        });
        const placeholder = document.querySelector('.tools__placeholder') as HTMLElement | null;
        if (!toolName) {
            if (placeholder) placeholder.style.display = 'flex';
            return;
        }
        // Show specific panel
        const panel = (document.querySelector(`.tools__options .tools__item--${toolName}`) as HTMLElement) ||
                      (document.querySelector(`.tools__options [data-settings-for="${toolName}"]`) as HTMLElement);
        if (panel) {
            panel.style.display = 'flex';
        } else if (placeholder) {
            placeholder.style.display = 'flex';
        }
    }

    /**
     * Verify that UI tool state matches canvas tool state
     * This helps detect and fix synchronization issues
     */
    private verifyToolSynchronization(): void {
        console.log('🔍 SYNC: Verifying tool synchronization...');
        
        // Get the canvas API instance if available globally
        const canvasAPI = (window as any).canvasAPI;
        if (!canvasAPI) {
            console.warn('⚠️ SYNC: Canvas API not available for verification');
            return;
        }

        try {
            const canvasActiveTool = canvasAPI.getActiveTool();
            const uiActiveTool = this.getCurrentTool();
            
            console.log(`🔍 SYNC: UI tool: "${uiActiveTool}", Canvas tool: "${canvasActiveTool}"`);
            
            if (canvasActiveTool !== uiActiveTool) {
                console.warn(`⚠️ SYNC MISMATCH: UI shows "${uiActiveTool}" but canvas has "${canvasActiveTool}"`);
                console.log('🔧 SYNC: Attempting to synchronize...');
                
                // Force synchronization by setting the tool again
                this.setTool(uiActiveTool);
                
                // Re-verify after a short delay
                setTimeout(() => {
                    const newCanvasTool = canvasAPI.getActiveTool();
                    if (newCanvasTool === uiActiveTool) {
                        console.log('✅ SYNC: Successfully synchronized tools');
                    } else {
                        console.error('❌ SYNC: Failed to synchronize tools - manual refresh may be needed');
                    }
                }, 100);
            } else {
                console.log('✅ SYNC: UI and canvas tools are synchronized');
            }
        } catch (error) {
            console.warn('⚠️ SYNC: Error during tool synchronization verification:', error);
        }
    }
}
