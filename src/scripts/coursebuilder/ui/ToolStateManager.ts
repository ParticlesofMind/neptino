/**
 * Tool State Manager
 * Manages tool selection, settings, and state for the coursebuilder
 * Single Responsibility: Tool management only
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

export class ToolStateManager {
  private currentTool: string = 'selection';
  private selectedMedia: string | null = null;
  private toolSettings: ToolSettings;

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
        opacity: 0.3
      }
    };
  }

  /**
   * Set current tool
   */
  setTool(toolName: string): void {
    this.currentTool = toolName;
    this.updateToolUI(toolName);
    console.log(`🔧 Tool changed to: ${toolName}`);
  }

  /**
   * Get current tool
   */
  getCurrentTool(): string {
    return this.currentTool;
  }

  /**
   * Update tool settings
   */
  updateToolSettings(toolName: string, settings: Partial<ToolSettings[keyof ToolSettings]>): void {
    if (toolName in this.toolSettings) {
      Object.assign(this.toolSettings[toolName as keyof ToolSettings], settings);
      console.log(`🔧 Updated ${toolName} settings:`, settings);
    }
  }

  /**
   * Get tool settings
   */
  getToolSettings(): ToolSettings {
    return { ...this.toolSettings };
  }

  /**
   * Set selected media
   */
  setSelectedMedia(mediaId: string | null): void {
    this.selectedMedia = mediaId;
  }

  /**
   * Get selected media
   */
  getSelectedMedia(): string | null {
    return this.selectedMedia;
  }

  /**
   * Update tool UI to reflect current selection
   */
  private updateToolUI(toolName: string): void {
    // Remove active class from all tools
    document.querySelectorAll('.tool').forEach(t => t.classList.remove('tool--selected'));
    
    // Add active class to selected tool
    const selectedTool = document.querySelector(`[data-tool="${toolName}"]`);
    if (selectedTool) {
      selectedTool.classList.add('tool--selected');
    }

    // Hide all tool settings
    document.querySelectorAll('.tool-settings').forEach(settings => {
      settings.classList.remove('tool-settings--active');
    });

    // Show settings for current tool
    const toolSettings = document.querySelector(`[data-tool-settings="${toolName}"]`);
    if (toolSettings) {
      toolSettings.classList.add('tool-settings--active');
    }
  }

  /**
   * Update canvas cursor based on current tool
   */
  updateCanvasCursor(): void {
    const canvas = document.querySelector('#pixi-canvas') as HTMLElement;
    if (!canvas) return;

    // Remove all cursor classes
    canvas.classList.remove('cursor-pen', 'cursor-eraser', 'cursor-text', 'cursor-highlighter', 'cursor-selection');

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
      case 'highlighter':
        canvas.classList.add('cursor-highlighter');
        break;
      default:
        canvas.classList.add('cursor-selection');
    }
  }
}
