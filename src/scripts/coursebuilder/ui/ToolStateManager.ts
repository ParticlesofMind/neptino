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
 brush: {
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
 private selectedMedia: string | null = "files";
 private selectedNavigation: string | null = "Outline";
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
 brush: {
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
 this.currentTool = iconState.tools || "selection";
 this.selectedMedia = iconState.media || "files";
 this.selectedNavigation = iconState.navigation || "Outline";
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
   // Set hardcoded defaults first as fallbacks
   this.currentMode = "build";
   this.currentTool = "selection";
   this.selectedMedia = "files";
   this.selectedNavigation = "Outline";

   // Try to get first icons from DOM and override if available
   const firstMode = document.querySelector('[data-mode]') as HTMLElement;
   const firstTool = document.querySelector('[data-tool]') as HTMLElement;
   const firstMedia = document.querySelector('[data-media]') as HTMLElement;
   const firstNav = document.querySelector('.builder__nav-course .nav-course__item') as HTMLElement;

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
     this.selectedNavigation = firstNav.querySelector('.icon-label')!.textContent;
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
 // Always set media and navigation since they now have default values
 this.setSelectedMedia(this.selectedMedia);
 this.setSelectedNavigation(this.selectedNavigation);
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
   // Remove selected class from all mode items
   document
     .querySelectorAll("[data-mode]")
     .forEach((element) => {
       element.classList.remove('mode__item--active');
       const parentItem = element.closest('.mode__item');
       if (parentItem) {
         parentItem.classList.remove('mode__item--active');
       }
     });

   // Add selected class to current mode
   const selectedMode = document.querySelector(`[data-mode="${modeName}"]`);
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
   document
     .querySelectorAll("[data-media]")
     .forEach((element) => {
       element.classList.remove('media__item--active');
       const parentItem = element.closest('.media__item');
       if (parentItem) {
         parentItem.classList.remove('media__item--active');
       }
     });

   // Add selected class to current media if one is selected
   if (mediaId) {
     const selectedMedia = document.querySelector(`[data-media="${mediaId}"]`);
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
     .querySelectorAll('.builder__nav-course .nav-course__item')
     .forEach((element) => {
       element.classList.remove('nav-course__item--active');
     });

   // Add selected class to current navigation if one is selected
   if (navTitle) {
     const navItems = document.querySelectorAll('.builder__nav-course .nav-course__item');
     navItems.forEach((item) => {
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
   // Remove selected class from all shape icons and wrappers
   document
     .querySelectorAll("[data-shape]")
     .forEach((icon) => {
       icon.classList.remove('selected');
       const wrapper = icon.closest('.icon-wrapper');
       if (wrapper) {
         wrapper.classList.remove('selected');
       }
     });

   // Add selected class to current shape if one is selected
   if (shapeName) {
     const selectedShape = document.querySelector(`[data-shape="${shapeName}"]`);
     if (selectedShape) {
       selectedShape.classList.add('selected');
       const wrapper = selectedShape.closest('.icon-wrapper');
       if (wrapper) {
         wrapper.classList.add('selected');
       }
     }
   }
 }

 /**
  * Update tool UI to reflect current selection
  */
 private updateToolUI(toolName: string): void {
   // Remove selected class from all tool items
   document
     .querySelectorAll('.tools__item')
     .forEach((element) => {
       element.classList.remove('tools__item--active');
     });

   // Add selected class to current tool item
   const selectedTool = document.querySelector(`[data-tool="${toolName}"]`);
   if (selectedTool) {
     const parentItem = selectedTool.closest('.tools__item');
     if (parentItem) {
       parentItem.classList.add('tools__item--active');
     }
   }

   // Hide all tool settings
   document.querySelectorAll('.tool-settings').forEach((settings) => {
     (settings as HTMLElement).style.display = 'none';
   });

   // Show settings for current tool
   const toolSettings = document.querySelector(
     `.tool-settings[data-tool="${toolName}"]`,
   ) as HTMLElement;
   if (toolSettings) {
     toolSettings.style.display = 'flex';
   }

   // Update canvas cursor
   this.updateCanvasCursor();
 }

 /**
  * Update canvas cursor based on current tool
  */
 public updateCanvasCursor(): void {
   const canvas = document.querySelector("#pixi-canvas") as HTMLElement;
   if (!canvas) return;

   // Remove all cursor classes
   canvas.classList.remove('cursor-pen', 'cursor-eraser', 'cursor-text', 'cursor-brush');

   // Add cursor class for current tool
   switch (this.currentTool) {
     case "pen":
       canvas.classList.add('cursor-pen');
       break;
     case "eraser":
       canvas.classList.add('cursor-eraser');
       break;
     case "text":
       canvas.classList.add('cursor-text');
       break;
     case "brush":
       canvas.classList.add('cursor-brush');
       break;
     default:
       canvas.classList.add('cursor-default');
       break;
   }
 }
}
