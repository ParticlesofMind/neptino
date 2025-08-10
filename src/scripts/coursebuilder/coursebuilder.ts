/**
 * Course Builder Main Controller
 * Handles tool selection, media management, and canvas interactions
 */

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

  constructor() {
    this.toolSettings = {
      pen: {
        color: '#000000',
        size: 2
      },
      text: {
        fontFamily: 'Arial',
        fontSize: 16,
        color: '#000000'
      },
      highlighter: {
        color: '#ffff00',
        opacity: 0.5
      }
    };

    this.init();
  }

  private init(): void {
    this.canvasContainer = document.getElementById('coursebuilder-canvas-container');
    this.bindEvents();
    console.log('Course Builder initialized');
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
    }
    
    this.currentTool = toolName;
    this.updateCanvasCursor();
    
    console.log(`Selected tool: ${toolName}`);
  }

  private handleColorSelection(event: Event): void {
    const colorSquare = event.target as HTMLElement;
    const selectedColor = colorSquare.dataset.color;
    
    if (!selectedColor) return;

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
    
    console.log(`Selected color: ${selectedColor} for tool: ${this.currentTool}`);
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
}

// Initialize course builder when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Only initialize if we're on the coursebuilder page
  if (document.querySelector('.coursebuilder')) {
    new CourseBuilder();
  }
});
