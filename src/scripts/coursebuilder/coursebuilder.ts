/**
 * Course Builder Main Controller
 * Coordinates all coursebuilder components using modern modular architecture
 * Single Responsibility: Component coordination and initialization only
 */

import { PixiCanvas } from "./canvas/PixiCanvas";
import { ToolStateManager } from "./ui/ToolStateManager";
import { UIEventHandler } from "./ui/UIEventHandler";
import { MarginSettingsManager } from "./managers/MarginSettingsManager";
import { PageManager } from "./managers/PageManager";
import { MediaManagerRefactored as MediaManager } from "./media/MediaManagerRefactored";
import { FontManager } from "./font/FontManager";
import { CommandManager } from "./commands/CommandManager";

export class CourseBuilder {
  private pixiCanvas: PixiCanvas | null = null;
  private toolStateManager: ToolStateManager;
  private uiEventHandler: UIEventHandler;
  private marginSettings: MarginSettingsManager;
  private pageManager: PageManager;
  private mediaManager: MediaManager;
  private fontManager: FontManager;
  private commandManager: CommandManager;
  private canvasContainer: HTMLElement | null = null;
  private currentCourseId: string | null = null;

  constructor() {
    this.canvasContainer = document.getElementById("canvas-container");

    // Initialize all managers
    this.commandManager = new CommandManager();
    this.toolStateManager = new ToolStateManager();
    this.marginSettings = new MarginSettingsManager();
    this.pageManager = new PageManager();
    this.mediaManager = new MediaManager();
    this.fontManager = new FontManager();
    this.uiEventHandler = new UIEventHandler(this.toolStateManager);

    this.init();
  }

  /**
   * Initialize the coursebuilder
   */
  private async init(): Promise<void> {
    console.log("🚀 Initializing CourseBuilder with modular architecture");

    await this.initializePixiCanvas();
    this.setupComponentCallbacks();
    this.bindGlobalEvents();

    console.log("✅ CourseBuilder initialization complete");
  }

  /**
   * Initialize PIXI canvas
   */
  private async initializePixiCanvas(): Promise<void> {
    if (!this.canvasContainer) {
      console.error("❌ Canvas container not found");
      return;
    }

    try {
      this.pixiCanvas = new PixiCanvas("canvas-container");
      await this.pixiCanvas.init();

      console.log("🎨 PIXI Canvas initialized");
    } catch (error) {
      console.error("❌ Failed to initialize PIXI Canvas:", error);
    }
  }

  /**
   * Setup callbacks between components
   */
  private setupComponentCallbacks(): void {
    // Tool state changes
    this.uiEventHandler.setOnToolChange((toolName: string) => {
      if (this.pixiCanvas) {
        this.pixiCanvas.setTool(toolName);
      }
    });

    // Color changes
    this.uiEventHandler.setOnColorChange((color: string) => {
      if (this.pixiCanvas) {
        this.pixiCanvas.updateToolColor(color);
      }
    });

    // Page changes
    this.pageManager.setOnPageChange((page: any) => {
      console.log("📄 Page changed:", page.name);
      // Handle page change logic here
    });

    // Margin changes
    this.marginSettings.setOnMarginChange((margins) => {
      console.log("📐 Margins updated:", margins);
      // Handle margin changes here
    });

    // Font changes
    this.fontManager.setOnFontChange((fontFamily: string) => {
      console.log("🔤 Font changed:", fontFamily);
      // Handle font changes here
    });

    // Media selection
    this.mediaManager.setOnMediaSelection((mediaType: string) => {
      console.log("🎬 Media type selected:", mediaType);
      // Handle media selection here
    });
  }

  /**
   * Bind global events
   */
  private bindGlobalEvents(): void {
    // Canvas actions
    document.addEventListener("clearCanvas", () => this.clearCanvas());
    document.addEventListener("clearAll", () => this.clearAll());
    document.addEventListener("addPage", () => this.addNewPage());
    document.addEventListener("toggleLayout", () => this.toggleLayout());

    // Media integration
    document.addEventListener("addMediaToCanvas", (event: any) => {
      this.addMediaToCanvas(event.detail.url, event.detail.type);
    });

    // Keyboard shortcuts for undo/redo
    document.addEventListener("keydown", (event) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const undoKeyPressed =
        (isMac ? event.metaKey : event.ctrlKey) && event.key === "z";
      const redoKeyPressed =
        (isMac ? event.metaKey : event.ctrlKey) && event.key === "y";

      if (undoKeyPressed) {
        event.preventDefault();
        this.undo();
      } else if (redoKeyPressed) {
        event.preventDefault();
        this.redo();
      }
    });
  }

  /**
   * Undo the last command
   */
  public undo(): void {
    this.commandManager.undo();
  }

  /**
   * Redo the last undone command
   */
  public redo(): void {
    this.commandManager.redo();
  }

  /**
   * Set the current course ID and pass it to margin settings
   */
  public setCourseId(courseId: string): void {
    this.currentCourseId = courseId;
    console.log(`📚 Course ID set to: ${courseId}`);

    // Pass the course ID to margin settings so it can load/save to database
    this.marginSettings.setCourseId(courseId);
  }

  /**
   * Get the current course ID
   */
  public getCourseId(): string | null {
    return this.currentCourseId;
  }

  /**
   * Clear canvas content
   */
  public clearCanvas(): void {
    if (this.pixiCanvas) {
      this.pixiCanvas.clearCanvas();
      console.log("🧹 Canvas cleared");
    }
  }

  /**
   * Clear all content
   */
  public clearAll(): void {
    if (this.pixiCanvas) {
      this.pixiCanvas.clearAll();
    }
    console.log("🧹 All content cleared");
  }

  /**
   * Add new page
   */
  private addNewPage(): void {
    this.pageManager.addNewPage();
  }

  /**
   * Toggle layout visibility
   */
  private toggleLayout(): void {
    if (this.pixiCanvas) {
      // PIXI.js doesn't have the same layout visibility concept
      // This could be implemented as layer visibility in PIXI
      console.log("🔄 Layout visibility toggle requested");
    }
  }

  /**
   * Add media to canvas
   */
  private addMediaToCanvas(url: string, type: string): void {
    if (this.pixiCanvas) {
      // Add media to canvas (implement based on media type)
      console.log(`➕ Adding ${type} to canvas:`, url);
    }
  }

  /**
   * Resize canvas
   */
  public resizeCanvas(width: number, height: number): void {
    if (this.pixiCanvas) {
      this.pixiCanvas.resize(width, height);
    }
  }

  /**
   * Get current tool
   */
  public getCurrentTool(): string {
    return this.toolStateManager.getCurrentTool();
  }

  /**
   * Get tool settings
   */
  public getToolSettings(): any {
    return this.toolStateManager.getToolSettings();
  }

  /**
   * Get page manager
   */
  public getPageManager(): PageManager {
    return this.pageManager;
  }

  /**
   * Get PIXI canvas instance
   */
  public getPixiCanvas(): PixiCanvas | null {
    return this.pixiCanvas;
  }

  /**
   * Get command manager
   */
  public getCommandManager(): CommandManager {
    return this.commandManager;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    // Only destroy components that have destroy methods
    this.uiEventHandler.destroy();
    if (this.pixiCanvas) {
      this.pixiCanvas.destroy();
    }
    this.marginSettings.destroy();
    this.pageManager.destroy();
    this.mediaManager.destroy();
    this.fontManager.destroy();

    if (this.pixiCanvas) {
      this.pixiCanvas.destroy();
    }

    console.log("🗑️ CourseBuilder destroyed");
  }
}

// Global debug helper
(window as any).courseBuilderDebug = {
  getInstance: () => {
    return (window as any).courseBuilder;
  },
  getState: () => {
    const instance = (window as any).courseBuilder;
    if (!instance) return null;

    return {
      currentTool: instance.getCurrentTool(),
      toolSettings: instance.getToolSettings(),
      pageCount: instance.getPageManager().getPageCount(),
      currentPage: instance.getPageManager().getCurrentPageIndex(),
    };
  },
};
