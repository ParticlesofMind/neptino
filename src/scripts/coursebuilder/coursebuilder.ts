/**
 * Course Builder Main Controller
 * Handles tool selection, media management, and canvas interactions
 */

import { PixiCanvas } from './PixiCanvas';
import { LayoutManager, CanvasNavigator, type CourseLayout } from './layout';

interface ToolSettings {
  pen: {
    color: string;
    size: number;
  };
  text: {
    fontFamily: string;
    fontSize: number;
    color: string;
  };
  highlighter: {
    color: string;
    opacity: number;
  };
}

export class CourseBuilder {
  private currentTool: string = 'selection';
  private selectedMedia: string | null = null;
  private toolSettings: ToolSettings;
  private canvasContainer: HTMLElement | null = null;
  
  // PixiJS Canvas
  private pixiCanvas: PixiCanvas | null = null;
  
  // Layout System
  private layoutManager: LayoutManager | null = null;
  private canvasNavigator: CanvasNavigator | null = null;
  private currentLayout: CourseLayout | null = null;
  private layoutVisible: boolean = false;

  constructor() {
    this.toolSettings = {
      pen: {
        color: '#000000', // Black for good visibility
        size: 4 // Increased size for better visibility
      },
      text: {
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#000000'
      },
      highlighter: {
        color: '#ffff00', // Bright yellow
        opacity: 0.8 // Increased opacity for better visibility
      }
    };

    this.init().catch(error => {
      console.error('Failed to initialize Course Builder:', error);
    });
  }

  private async init(): Promise<void> {
    this.canvasContainer = document.getElementById('coursebuilder-canvas-container');
    await this.initPixiCanvas();
    this.initLayoutSystem();
    this.bindEvents();
    console.log('Course Builder initialized with PixiJS and Layout System');
  }

  private async initPixiCanvas(): Promise<void> {
    if (!this.canvasContainer) {
      console.error('Canvas container not found');
      return;
    }

    try {
      this.pixiCanvas = new PixiCanvas('coursebuilder-canvas-container');
      await this.pixiCanvas.init();
      console.log('PixiJS Canvas initialized successfully');
    } catch (error) {
      console.error('Failed to initialize PixiJS Canvas:', error);
    }
  }

  private bindEvents(): void {
    // Tool selection events
    document.querySelectorAll('.tool').forEach(tool => {
      tool.addEventListener('click', (e) => this.handleToolSelection(e));
    });

    // Color selection events
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('color-palette__color')) {
        this.handleColorSelection(e);
      }
    });

    // Shape selection events
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('shape-btn') || target.closest('.shape-btn')) {
        this.handleShapeSelection(e);
      }
    });

    // Media selection events
    document.querySelectorAll('.media-btn').forEach(media => {
      media.addEventListener('click', (e) => this.handleMediaSelection(e));
    });

    // Action button events
    document.querySelectorAll('.action-btn').forEach(action => {
      action.addEventListener('click', (e) => this.handleActionButton(e));
    });

    // Font selection events
    const fontSelect = document.querySelector('.font-controls__select') as HTMLSelectElement;
    if (fontSelect) {
      fontSelect.addEventListener('change', (e) => this.handleFontChange(e));
    }
  }

  private handleToolSelection(event: Event): void {
    const button = event.currentTarget as HTMLButtonElement;
    const toolName = button.dataset.tool;
    
    if (!toolName) return;

    console.log(`🔧 COURSEBUILDER: Tool selection requested - ${toolName}`);

    // Remove selected state from all tools
    document.querySelectorAll('.tool').forEach(t => t.classList.remove('tool--selected'));
    
    // Add selected state to clicked tool
    button.classList.add('tool--selected');
    
    // Hide all tool settings
    document.querySelectorAll('.tool-settings').forEach(settings => {
      settings.classList.remove('tool-settings--active');
    });
    
    // Show settings for selected tool
    const toolSettings = document.querySelector(`.tool-settings[data-tool="${toolName}"]`) as HTMLElement;
    if (toolSettings) {
      toolSettings.classList.add('tool-settings--active');
      console.log(`🔧 COURSEBUILDER: Tool settings panel activated for ${toolName}`);
    }
    
    this.currentTool = toolName;
    this.updateCanvasCursor();
    
    // Update PixiJS canvas tool
    if (this.pixiCanvas) {
      const success = this.pixiCanvas.setTool(toolName);
      console.log(`🔧 COURSEBUILDER: PixiJS tool switch ${success ? 'successful' : 'failed'} for ${toolName}`);
    }
    
    console.log(`🔧 COURSEBUILDER: Tool selection completed - ${toolName}`);
  }

  private handleColorSelection(event: Event): void {
    const colorSquare = event.target as HTMLElement;
    const selectedColor = colorSquare.dataset.color;
    
    if (!selectedColor) return;

    console.log(`🎨 COURSEBUILDER: Color selection requested - ${selectedColor} for tool ${this.currentTool}`);

    // Remove active state from all colors in the same palette
    const palette = colorSquare.closest('.color-palette');
    if (palette) {
      palette.querySelectorAll('.color-palette__color').forEach(color => 
        color.classList.remove('color-palette__color--active')
      );
    }
    
    // Add active state to clicked color
    colorSquare.classList.add('color-palette__color--active');
    
    // Update tool settings based on current tool
    switch (this.currentTool) {
      case 'pen':
        this.toolSettings.pen.color = selectedColor;
        break;
      case 'text':
        this.toolSettings.text.color = selectedColor;
        break;
      case 'highlighter':
        this.toolSettings.highlighter.color = selectedColor;
        break;
    }
    
    // Update PixiJS canvas tool color
    if (this.pixiCanvas) {
      this.pixiCanvas.updateToolColor(selectedColor);
      console.log(`🎨 COURSEBUILDER: Color updated in PixiJS canvas`);
    }
    
    console.log(`🎨 COURSEBUILDER: Color selection completed - ${selectedColor} for tool ${this.currentTool}`);
  }

  private handleShapeSelection(event: Event): void {
    const target = event.target as HTMLElement;
    const shapeButton = target.closest('.shape-btn') as HTMLButtonElement;
    
    if (!shapeButton) return;

    const selectedShape = shapeButton.dataset.shape;
    if (!selectedShape) return;

    console.log(`🔶 COURSEBUILDER: Shape selection requested - ${selectedShape}`);

    // Remove active state from all shape buttons
    document.querySelectorAll('.shape-btn').forEach(btn => 
      btn.classList.remove('shape-btn--active')
    );
    
    // Add active state to clicked shape button
    shapeButton.classList.add('shape-btn--active');
    
    // Update the shapes tool with the selected shape
    if (this.pixiCanvas && this.currentTool === 'shapes') {
      const toolManager = this.pixiCanvas.getToolManager();
      const shapesTool = toolManager.getActiveTool();
      if (shapesTool && 'setShapeType' in shapesTool) {
        (shapesTool as any).setShapeType(selectedShape);
        console.log(`🔶 COURSEBUILDER: Shape type updated in ShapesTool`);
      }
    }
    
    console.log(`🔶 COURSEBUILDER: Shape selection completed - ${selectedShape}`);
  }

  public clearCanvas(): void {
    if (this.pixiCanvas) {
      this.pixiCanvas.clearCanvas();
    }
  }

  public resizeCanvas(width: number, height: number): void {
    if (this.pixiCanvas) {
      this.pixiCanvas.resize(width, height);
    }
  }

  private handleMediaSelection(event: Event): void {
    const button = event.currentTarget as HTMLButtonElement;
    const mediaType = button.dataset.media;
    
    if (!mediaType) return;

    // Remove selected state from all media buttons
    document.querySelectorAll('.media-btn').forEach(m => m.classList.remove('media-btn--selected'));
    
    // Add selected state to clicked media
    button.classList.add('media-btn--selected');
    
    this.selectedMedia = mediaType;
    this.updateMediaSearchPanel(mediaType);
    
    console.log(`Selected media: ${mediaType}`);
  }

  private handleActionButton(event: Event): void {
    const button = event.currentTarget as HTMLButtonElement;
    const title = button.getAttribute('title');
    
    console.log(`Action button clicked: ${title}`);
    
    // Handle specific actions
    if (title === 'Add Page') {
      this.addNewPage();
    } else if (title === 'Page Settings') {
      this.openPageSettings();
    } else if (title === 'Clear Canvas') {
      this.clearCanvas();
    }
  }

  private handleFontChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.toolSettings.text.fontFamily = select.value;
    console.log(`Font changed to: ${select.value}`);
  }

  private updateCanvasCursor(): void {
    if (!this.canvasContainer) return;

    // Update cursor based on selected tool
    const cursorMap: Record<string, string> = {
      selection: 'default',
      pen: 'crosshair',
      highlighter: 'crosshair',
      text: 'text',
      shapes: 'crosshair',
      eraser: 'crosshair'
    };

    this.canvasContainer.style.cursor = cursorMap[this.currentTool] || 'default';
  }

  private updateMediaSearchPanel(mediaType: string): void {
    const searchPanel = document.querySelector('.coursebuilder__media-search');
    if (!searchPanel) return;

    const mediaTypeCapitalized = mediaType.charAt(0).toUpperCase() + mediaType.slice(1);
    
    searchPanel.innerHTML = `
      <div class="media-search">
        <h3 class="media-search__title">${mediaTypeCapitalized}</h3>
        <input type="search" class="media-search__input" placeholder="Search ${mediaType}...">
        <div class="media-search__content">
          Loading ${mediaType}...
        </div>
      </div>
    `;
  }

  private addNewPage(): void {
    console.log('Adding new page...');
    // TODO: Implement page addition logic
    // This could involve adding a new page to the table of contents
    // and updating the canvas to show the new page
  }

  private openPageSettings(): void {
    console.log('Opening page settings...');
    // TODO: Implement page settings modal or panel
    // This could show options for page size, orientation, background, etc.
  }

  public getCurrentTool(): string {
    return this.currentTool;
  }

  public getToolSettings(): ToolSettings {
    return this.toolSettings;
  }

  public getSelectedMedia(): string | null {
    return this.selectedMedia;
  }

  // Layout System Methods
  
  private initLayoutSystem(): void {
    console.log('🏗️ Initializing layout system...');
    
    // Get detailed canvas information for debugging
    const canvasInfo = this.pixiCanvas?.getCanvasInfo();
    console.log('🏗️ Canvas Info:', canvasInfo);
    
    // Get actual canvas dimensions using the new method
    const dimensions = this.pixiCanvas?.getCanvasDimensions() || { width: 794, height: 1123 };
    const { width: canvasWidth, height: canvasHeight } = dimensions;
    
    console.log(`🏗️ Canvas dimensions from getCanvasDimensions(): ${canvasWidth}x${canvasHeight}`);
    console.log(`🏗️ PixiJS screen from getApp():`, this.pixiCanvas?.getApp()?.screen);
    
    // Initialize layout manager with actual canvas dimensions
    this.layoutManager = new LayoutManager(canvasWidth, canvasHeight, this.pixiCanvas?.getApp());
    
    // Initialize canvas navigator
    this.canvasNavigator = new CanvasNavigator('coursebuilder__toc');
    
    // Set up canvas change callback
    this.canvasNavigator.onCanvasChange((canvasIndex: number) => {
      this.handleCanvasChange(canvasIndex);
    });
    
    console.log('🏗️ Layout system initialized');
    
    // Force update dimensions to make sure layout uses correct size
    if (this.layoutManager && canvasWidth > 0 && canvasHeight > 0) {
      this.layoutManager.updateDimensions(canvasWidth, canvasHeight, this.pixiCanvas?.getApp());
    }
  }

  public initializeCourseLayout(
    courseId: string,
    scheduledSessions: number = 1,
    lessonDurationMinutes: number = 30
  ): void {
    if (!this.layoutManager || !this.canvasNavigator) {
      console.error('Layout system not initialized');
      return;
    }

    console.log(`🏗️ Creating course layout: ${scheduledSessions} sessions, ${lessonDurationMinutes} min each`);
    
    // Create course layout
    this.currentLayout = this.layoutManager.createCourseLayout(
      courseId,
      'default-template',
      scheduledSessions,
      lessonDurationMinutes
    );
    
    // Initialize navigator with the layout
    this.canvasNavigator.init(this.currentLayout);
    
    // Show layout structure by default
    this.showLayoutStructure();
    
    console.log(`🏗️ Course layout created with ${this.currentLayout.totalCanvases} canvases`);
  }

  private handleCanvasChange(canvasIndex: number): void {
    console.log(`🧭 Switched to canvas ${canvasIndex + 1}`);
    
    // Here you could implement canvas-specific content loading
    // For now, we'll just update the layout structure if visible
    if (this.layoutVisible && this.layoutManager && this.pixiCanvas && this.currentLayout) {
      if (this.currentLayout.canvases.length > 0) {
        const canvasLayout = this.currentLayout.canvases[Math.min(canvasIndex, this.currentLayout.canvases.length - 1)];
        this.pixiCanvas.renderLayoutAsBackground(canvasLayout.blocks);
      }
    }
  }

  public showLayoutStructure(): void {
    if (!this.layoutManager || !this.pixiCanvas) return;

    // Get the current layout blocks from the first canvas
    if (!this.currentLayout || !this.currentLayout.canvases.length) {
      console.warn('No layout available to render');
      return;
    }

    const canvasLayout = this.currentLayout.canvases[0];
    
    // Use the new background rendering method instead of overlay graphics
    this.pixiCanvas.renderLayoutAsBackground(canvasLayout.blocks);
    this.layoutVisible = true;
    
    console.log('🏗️ Layout structure rendered as canvas background');
  }

  public hideLayoutStructure(): void {
    if (!this.layoutManager) return;

    this.layoutManager.hideLayoutStructure();
    this.layoutVisible = false;
    
    console.log('🏗️ Layout structure hidden');
  }

  public toggleLayoutStructure(): void {
    if (this.layoutVisible) {
      this.hideLayoutStructure();
    } else {
      this.showLayoutStructure();
    }
  }

  public navigateToCanvas(canvasIndex: number): void {
    if (this.canvasNavigator) {
      this.canvasNavigator.navigateToCanvas(canvasIndex);
    }
  }

  public navigateToSession(sessionNumber: number): void {
    if (this.canvasNavigator) {
      this.canvasNavigator.navigateToSession(sessionNumber);
    }
  }

  public getCurrentCanvasIndex(): number {
    return this.canvasNavigator?.getCurrentCanvasIndex() || 0;
  }

  public destroy(): void {
    // Clean up layout system
    if (this.layoutManager) {
      this.layoutManager.destroy();
      this.layoutManager = null;
    }
    
    if (this.canvasNavigator) {
      this.canvasNavigator.destroy();
      this.canvasNavigator = null;
    }
    
    this.currentLayout = null;
    
    // Clean up PixiJS
    if (this.pixiCanvas) {
      this.pixiCanvas.destroy();
      this.pixiCanvas = null;
    }
  }
}

// Initialize course builder when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on the coursebuilder page
  if (document.querySelector('.coursebuilder')) {
    const courseBuilder = new CourseBuilder();
    
    // Demo: Initialize with a sample course layout
    // This would normally be triggered from the course setup flow
    setTimeout(() => {
      // Demo layout: 3 sessions of 60 minutes each (regular lessons = 2 canvases per session)
      courseBuilder.initializeCourseLayout('demo-course-123', 3, 60);
      console.log('🎯 Demo layout initialized: 3 sessions × 2 canvases = 6 total canvases');
    }, 1000);
  }
});

// DEBUG: Add window function to manually check CourseBuilder state
(window as any).debugCourseBuilder = () => {
  const createSection = document.getElementById('create');
  const courseBuilderElement = document.querySelector('.coursebuilder');
  const canvasContainer = document.getElementById('coursebuilder-canvas-container');
  const toolsContainer = document.querySelector('.coursebuilder__canvas-toolbar');
  
  console.log('🔍 CourseBuilder Debug Check:', {
    createSectionExists: !!createSection,
    createSectionActive: createSection?.classList.contains('section--active'),
    createSectionDisplay: createSection ? window.getComputedStyle(createSection).display : 'none',
    courseBuilderExists: !!courseBuilderElement,
    courseBuilderDisplay: courseBuilderElement ? window.getComputedStyle(courseBuilderElement).display : 'none',
    canvasContainerExists: !!canvasContainer,
    canvasContainerDisplay: canvasContainer ? window.getComputedStyle(canvasContainer).display : 'none',
    canvasContainerDimensions: canvasContainer ? canvasContainer.getBoundingClientRect() : 'none',
    toolsExists: !!toolsContainer,
    toolsDisplay: toolsContainer ? window.getComputedStyle(toolsContainer).display : 'none',
    pixiCanvasExists: !!canvasContainer?.querySelector('canvas'),
    placeholderExists: !!canvasContainer?.querySelector('.canvas-placeholder')
  });
  
  return {
    createSection,
    courseBuilderElement,
    canvasContainer,
    toolsContainer
  };
};
