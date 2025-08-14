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
    size: number;
  };
  shapes: {
    color: string;
    strokeWidth: number;
    fillColor?: string;
    shapeType: "rectangle" | "triangle" | "circle" | "ellipse" | "line" | "arrow" | "polygon";
  };
  eraser: {
    size: number;
  };
}

export class ToolStateManager {
  private currentTool: string = "selection";
  private currentMode: string = "build";
  private selectedMedia: string | null = null;
  private toolSettings: ToolSettings;

  constructor() {
    this.toolSettings = {
      pen: {
        color: "#000000",
        size: 2,
      },
      text: {
        fontFamily: "Arial",
        fontSize: 16,
        color: "#000000",
      },
      highlighter: {
        color: "#ffff00",
        opacity: 0.3,
        size: 20,
      },
      shapes: {
        color: "#000000",
        strokeWidth: 2,
        shapeType: "rectangle",
      },
      eraser: {
        size: 20,
      },
    };

    // Set initial selected states
    this.setInitialSelections();
  }

  /**
   * Set initial selected states
   */
  private setInitialSelections(): void {
    // Delay execution to ensure DOM is ready
    setTimeout(() => {
      this.setMode(this.currentMode);
      this.setTool(this.currentTool);
    }, 100);
  }

  /**
   * Set current mode
   */
  setMode(modeName: string): void {
    this.currentMode = modeName;
    this.updateModeUI(modeName);
  }

  /**
   * Get current mode
   */
  getCurrentMode(): string {
    return this.currentMode;
  }

  /**
   * Set current tool
   */
  setTool(toolName: string): void {
    this.currentTool = toolName;
    this.updateToolUI(toolName);
  }

  /**
   * Get current tool
   */
  getCurrentTool(): string {
    return this.currentTool;
  }

  /**
   * Set selected media
   */
  setSelectedMedia(mediaId: string | null): void {
    this.selectedMedia = mediaId;
    this.updateMediaUI(mediaId);
  }

  /**
   * Get selected media
   */
  getSelectedMedia(): string | null {
    return this.selectedMedia;
  }

  /**
   * Update tool settings
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
    }
  }

  /**
   * Get tool settings
   */
  getToolSettings(): ToolSettings {
    return { ...this.toolSettings };
  }

  /**
   * Update mode UI to reflect current selection
   */
  private updateModeUI(modeName: string): void {
    // Remove selected class from all mode icons
    document
      .querySelectorAll("[data-mode]")
      .forEach((icon) => {
        icon.classList.remove("icon--selected");
      });

    // Add selected class to current mode
    const selectedMode = document.querySelector(`[data-mode="${modeName}"]`);
    if (selectedMode) {
      selectedMode.classList.add("icon--selected");
    }
  }

  /**
   * Update media UI to reflect current selection
   */
  private updateMediaUI(mediaId: string | null): void {
    // Remove selected class from all media icons
    document
      .querySelectorAll("[data-media]")
      .forEach((icon) => {
        icon.classList.remove("icon--selected");
      });

    // Add selected class to current media if one is selected
    if (mediaId) {
      const selectedMedia = document.querySelector(`[data-media="${mediaId}"]`);
      if (selectedMedia) {
        selectedMedia.classList.add("icon--selected");
      }
    }
  }

  /**
   * Update tool UI to reflect current selection
   */
  private updateToolUI(toolName: string): void {
    // Remove selected class from ALL icons in coursebuilder (tools, modes, media, navigation)
    document
      .querySelectorAll(".coursebuilder .icon")
      .forEach((icon) => {
        icon.classList.remove("icon--selected");
      });

    // Remove old tool class if it exists
    document
      .querySelectorAll(".tool")
      .forEach((t) => t.classList.remove("tool--selected"));

    // Add selected class to current tool icon
    const selectedTool = document.querySelector(`[data-tool="${toolName}"]`);
    if (selectedTool) {
      selectedTool.classList.add("icon--selected");
    }

    // Hide all tool settings
    document.querySelectorAll(".tool-settings").forEach((settings) => {
      settings.classList.remove("tool-settings--active");
    });

    // Show settings for current tool - look for the div with data-tool attribute matching the tool name
    const toolSettings = document.querySelector(
      `.tool-settings[data-tool="${toolName}"]`,
    );
    if (toolSettings) {
      toolSettings.classList.add("tool-settings--active");
    }
  }

  /**
   * Update canvas cursor based on current tool
   */
  updateCanvasCursor(): void {
    const canvas = document.querySelector("#pixi-canvas") as HTMLElement;
    if (!canvas) return;

    // Remove all cursor classes
    canvas.classList.remove(
      "cursor-pen",
      "cursor-eraser",
      "cursor-text",
      "cursor-highlighter",
      "cursor-selection",
    );

    // Add cursor class for current tool
    switch (this.currentTool) {
      case "pen":
        canvas.classList.add("cursor-pen");
        break;
      case "eraser":
        canvas.classList.add("cursor-eraser");
        break;
      case "text":
        canvas.classList.add("cursor-text");
        break;
      case "highlighter":
        canvas.classList.add("cursor-highlighter");
        break;
      default:
        canvas.classList.add("cursor-selection");
    }
  }
}
