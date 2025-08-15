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

interface IconState {
  modes: string;
  media: string | null;
  tools: string;
  navigation: string | null;
  shape: string | null;
}

export class ToolStateManager {
  private currentTool: string = "selection";
  private currentMode: string = "build";
  private selectedMedia: string | null = null;
  private selectedNavigation: string | null = null;
  private selectedShape: string | null = null;
  private toolSettings: ToolSettings;
  private storageKey = "coursebuilder-icon-states";

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

    // Load saved states from localStorage or set defaults
    this.loadSavedStates();

    // Set initial selected states
    this.setInitialSelections();
  }

  /**
   * Load saved icon states from localStorage
   */
  private loadSavedStates(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const iconState: IconState = JSON.parse(saved);
        this.currentMode = iconState.modes || "build";
        this.currentTool = iconState.tools || "select";
        this.selectedMedia = iconState.media;
        this.selectedNavigation = iconState.navigation;
        this.selectedShape = iconState.shape;
      } else {
        // Set defaults to first icons if no localStorage exists
        this.setDefaultSelections();
      }
    } catch (error) {
      console.warn("Error loading coursebuilder states:", error);
      this.setDefaultSelections();
    }
  }

  /**
   * Set default selections to first icon in each category
   */
  private setDefaultSelections(): void {
    // Get first icons from DOM
    const firstMode = document.querySelector('.coursebuilder__modes .icon[data-mode]') as HTMLElement;
    const firstTool = document.querySelector('.coursebuilder__tools .icon[data-tool]') as HTMLElement;
    const firstMedia = document.querySelector('.coursebuilder__media .icon[data-media]') as HTMLElement;
    const firstNav = document.querySelector('.coursebuilder__navigation .icon') as HTMLElement;
    const firstShape = document.querySelector('[data-shape]') as HTMLElement;

    this.currentMode = firstMode?.dataset.mode || "build";
    this.currentTool = firstTool?.dataset.tool || "selection";
    this.selectedMedia = firstMedia?.dataset.media || null;
    this.selectedNavigation = firstNav?.title || null;
    this.selectedShape = firstShape?.dataset.shape || null;
  }

  /**
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
      };
      localStorage.setItem(this.storageKey, JSON.stringify(iconState));
    } catch (error) {
      console.warn("Error saving coursebuilder states:", error);
    }
  }

  /**
   * Set initial selected states
   */
  private setInitialSelections(): void {
    // Delay execution to ensure DOM is ready
    setTimeout(() => {
      this.setMode(this.currentMode);
      this.setTool(this.currentTool);
      if (this.selectedMedia) {
        this.setSelectedMedia(this.selectedMedia);
      }
      if (this.selectedNavigation) {
        this.setSelectedNavigation(this.selectedNavigation);
      }
      if (this.selectedShape) {
        this.setSelectedShape(this.selectedShape);
      }
    }, 100);
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
   * Set current tool
   */
  setTool(toolName: string): void {
    this.currentTool = toolName;
    this.updateToolUI(toolName);
    this.saveStates();
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
    this.saveStates();
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
   * Set selected shape
   */
  setSelectedShape(shapeName: string | null): void {
    this.selectedShape = shapeName;
    this.updateShapeUI(shapeName);
    this.saveStates();
  }

  /**
   * Get selected shape
   */
  getSelectedShape(): string | null {
    return this.selectedShape;
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
    // Remove selected class from all mode icons and wrappers
    document
      .querySelectorAll("[data-mode]")
      .forEach((icon) => {
        icon.classList.remove("icon--selected");
        const wrapper = icon.closest('.icon-wrapper');
        if (wrapper) {
          wrapper.classList.remove("icon-wrapper--selected");
        }
      });

    // Add selected class to current mode
    const selectedMode = document.querySelector(`[data-mode="${modeName}"]`);
    if (selectedMode) {
      selectedMode.classList.add("icon--selected");
      const wrapper = selectedMode.closest('.icon-wrapper');
      if (wrapper) {
        wrapper.classList.add("icon-wrapper--selected");
      }
    }
  }

  /**
   * Update media UI to reflect current selection
   */
  private updateMediaUI(mediaId: string | null): void {
    // Remove selected class from all media icons and wrappers
    document
      .querySelectorAll("[data-media]")
      .forEach((icon) => {
        icon.classList.remove("icon--selected");
        const wrapper = icon.closest('.icon-wrapper');
        if (wrapper) {
          wrapper.classList.remove("icon-wrapper--selected");
        }
      });

    // Add selected class to current media if one is selected
    if (mediaId) {
      const selectedMedia = document.querySelector(`[data-media="${mediaId}"]`);
      if (selectedMedia) {
        selectedMedia.classList.add("icon--selected");
        const wrapper = selectedMedia.closest('.icon-wrapper');
        if (wrapper) {
          wrapper.classList.add("icon-wrapper--selected");
        }
      }
    }
  }

  /**
   * Update navigation UI to reflect current selection
   */
  private updateNavigationUI(navTitle: string | null): void {
    // Remove selected class from all navigation icons and wrappers
    document
      .querySelectorAll(".coursebuilder__navigation .icon")
      .forEach((icon) => {
        icon.classList.remove("icon--selected");
        const wrapper = icon.closest('.icon-wrapper');
        if (wrapper) {
          wrapper.classList.remove("icon-wrapper--selected");
        }
      });

    // Add selected class to current navigation if one is selected
    if (navTitle) {
      const selectedNav = document.querySelector(`.coursebuilder__navigation .icon[title="${navTitle}"]`);
      if (selectedNav) {
        selectedNav.classList.add("icon--selected");
        const wrapper = selectedNav.closest('.icon-wrapper');
        if (wrapper) {
          wrapper.classList.add("icon-wrapper--selected");
        }
      }
    }
  }

  /**
   * Update shape UI to reflect current selection
   */
  private updateShapeUI(shapeName: string | null): void {
    // Remove selected class from all shape icons and wrappers
    document
      .querySelectorAll("[data-shape]")
      .forEach((icon) => {
        icon.classList.remove("icon--selected");
        const wrapper = icon.closest('.icon-wrapper');
        if (wrapper) {
          wrapper.classList.remove("icon-wrapper--selected");
        }
      });

    // Add selected class to current shape if one is selected
    if (shapeName) {
      const selectedShape = document.querySelector(`[data-shape="${shapeName}"]`);
      if (selectedShape) {
        selectedShape.classList.add("icon--selected");
        const wrapper = selectedShape.closest('.icon-wrapper');
        if (wrapper) {
          wrapper.classList.add("icon-wrapper--selected");
        }
      }
    }
  }

  /**
   * Update tool UI to reflect current selection
   */
  private updateToolUI(toolName: string): void {
    // Remove selected class from ALL icons in coursebuilder (tools, modes, media, navigation) and wrappers
    document
      .querySelectorAll(".coursebuilder .icon")
      .forEach((icon) => {
        icon.classList.remove("icon--selected");
        const wrapper = icon.closest('.icon-wrapper');
        if (wrapper) {
          wrapper.classList.remove("icon-wrapper--selected");
        }
      });

    // Remove old tool class if it exists
    document
      .querySelectorAll(".tool")
      .forEach((t) => t.classList.remove("tool--selected"));

    // Add selected class to current tool icon
    const selectedTool = document.querySelector(`[data-tool="${toolName}"]`);
    if (selectedTool) {
      selectedTool.classList.add("icon--selected");
      const wrapper = selectedTool.closest('.icon-wrapper');
      if (wrapper) {
        wrapper.classList.add("icon-wrapper--selected");
      }
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
