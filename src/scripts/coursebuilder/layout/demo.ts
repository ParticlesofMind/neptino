/**
 * Layout System Demo
 * Example usage of the modular layout system
 */

import { LessonRenderer } from "./lesson/LessonRenderer";
import { HeaderBlock, ContentBlock } from "./blocks";

/**
 * Demo: Create and render a lesson template
 */
async function demoLessonLayout(): Promise<void> {
  console.log("🎨 Starting demoLessonLayout...");
  
  // Get the existing coursebuilder canvas instance instead of creating a new one
  const courseBuilderInstance = (window as any).courseBuilderCanvasInstance;
  
  if (!courseBuilderInstance) {
    console.error("❌ CourseBuilder canvas not found. Make sure you're on the coursebuilder page.");
    console.log("Available on window:", Object.keys(window as any).filter(k => k.includes('course')));
    return;
  }
  console.log("✅ Found courseBuilderInstance");

  const pixiCanvas = courseBuilderInstance.getPixiCanvas();
  
  if (!pixiCanvas) {
    console.error("❌ PIXI Canvas not initialized. Navigate to the Create section first.");
    return;
  }
  console.log("✅ Found pixiCanvas");

  const layoutContainer = pixiCanvas.getLayoutContainer();
  
  if (!layoutContainer) {
    console.error("❌ Layout container not found.");
    return;
  }
  console.log("✅ Found layoutContainer, children:", layoutContainer.children.length);

  // Get canvas dimensions from the existing canvas
  const canvasDimensions = pixiCanvas.getCanvasDimensions();
  console.log(`🎨 Using canvas dimensions: ${canvasDimensions.width}x${canvasDimensions.height}`);

  // Clear existing layout content but keep background
  console.log("🧹 Clearing existing content...");
  // Remove all children except the background (usually first child)
  while (layoutContainer.children.length > 1) {
    const child = layoutContainer.children[layoutContainer.children.length - 1];
    layoutContainer.removeChild(child);
  }
  console.log("✅ Cleared, remaining children:", layoutContainer.children.length);

  // Create lesson renderer with existing layout container
  console.log("🏗️ Creating lesson renderer...");
  const lessonRenderer = new LessonRenderer(
    layoutContainer, 
    canvasDimensions.width, 
    canvasDimensions.height
  );

  // Render the lesson with default template and visible colors
  console.log("🎨 Rendering lesson...");
  const lessonContainer = lessonRenderer.renderLesson({
    theme: "modern",
    showLabels: true,
    responsive: true,
  });

  console.log("✅ Demo lesson rendered successfully!");
  console.log("📊 Lesson container info:");
  console.log("  - Children count:", lessonContainer.children.length);
  console.log("  - Position:", lessonContainer.x, lessonContainer.y);
  console.log("  - Visible:", lessonContainer.visible);
  console.log("  - Alpha:", lessonContainer.alpha);
  console.log("📊 Layout container info:");
  console.log("  - Total children:", layoutContainer.children.length);
  console.log("  - Position:", layoutContainer.x, layoutContainer.y);
  console.log("  - Visible:", layoutContainer.visible);
  console.log("  - Alpha:", layoutContainer.alpha);
}

/**
 * Demo: Create custom blocks
 */
function demoCustomBlocks(): void {
  // Create a custom header block
  const headerBlock = new HeaderBlock({
    id: "custom-header",
    name: "Course Header",
    type: "header",
    heightPercentage: 15,
    isRequired: true,
    enabled: true,
    title: "Python Programming Basics",
    subtitle: "Variables, Functions, and Control Flow",
    showNavigation: true,
    showBreadcrumbs: true,
  });

  // Create a custom content block
  const contentBlock = new ContentBlock({
    id: "custom-content",
    name: "Main Content",
    type: "content",
    heightPercentage: 60,
    isRequired: true,
    enabled: true,
    layoutStyle: "dual",
    showSectionTabs: true,
  });

  // Add content sections
  contentBlock.addSection({
    id: "intro",
    title: "Introduction",
    contentType: "text",
    data: { content: "Welcome to variables in Python..." },
  });

  contentBlock.addSection({
    id: "examples",
    title: "Examples", 
    contentType: "interactive",
    data: { exercises: ["Create a variable", "Print the variable"] },
  });

  // Log the block configurations
  console.log("Header Block Config:", headerBlock.getHeaderConfig());
  console.log("Content Block Config:", contentBlock.getContentConfig());
  console.log("Header Block Rows:", headerBlock.getRows().length);
  console.log("Content Block Rows:", contentBlock.getRows().length);
}

/**
 * Demo: Dynamic block configuration
 */
function demoDynamicConfiguration(): void {
  console.log("=== Dynamic Configuration Demo ===");
  
  // Create a content block and modify it
  const contentBlock = new ContentBlock({
    id: "dynamic-content",
    name: "Dynamic Content",
    type: "content", 
    heightPercentage: 50,
    isRequired: false,
    enabled: true,
    layoutStyle: "single",
  });

  console.log("Initial layout:", contentBlock.getContentConfig().layoutStyle);
  console.log("Initial rows:", contentBlock.getRows().length);

  // Change to dual column
  contentBlock.changeLayoutStyle("dual");
  console.log("After dual layout:", contentBlock.getRows().length);

  // Change to multi column
  contentBlock.changeLayoutStyle("multi");
  console.log("After multi layout:", contentBlock.getRows().length);

  // Toggle section tabs
  contentBlock.toggleSectionTabs(true);
  console.log("With tabs:", contentBlock.getRows().length);
  
  contentBlock.toggleSectionTabs(false);
  console.log("Without tabs:", contentBlock.getRows().length);

  console.log("Dynamic configuration complete!");
}

/**
 * Demo Launcher - Easy access to layout demos
 */
export class LayoutDemoLauncher {
  private canvasContainer: HTMLElement | null = null;
  private isDemo: boolean = false;

  constructor() {
    this.canvasContainer = document.getElementById("canvas-container");
  }

  /**
   * Launch the full visual demo in the canvas
   */
  public async launchVisualDemo(): Promise<void> {
    if (!this.canvasContainer) {
      console.error("❌ Canvas container not found. Make sure you're on the coursebuilder page.");
      return;
    }

    console.log("🎨 Launching Layout Demo in Canvas...");
    
    try {
      // Check if we're on the create section, if not navigate there first
      const createSection = document.querySelector('.coursebuilder__create') as HTMLElement;
      if (createSection && createSection.getAttribute('aria-hidden') === 'true') {
        // Navigate to create section
        window.location.hash = 'create';
        
        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Run the lesson layout demo
      await demoLessonLayout();
      
      this.isDemo = true;
      console.log("✅ Layout Demo launched successfully!");
      console.log("💡 Check the canvas area to see the rendered lesson template");
      
    } catch (error) {
      console.error("❌ Failed to launch demo:", error);
      throw error;
    }
  }

  /**
   * Run just the console demos (no visual rendering)
   */
  public runConsoleDemos(): void {
    console.log("🎨 Running Layout Console Demos...");
    demoDynamicConfiguration();
    demoCustomBlocks();
    console.log("✅ Console demos completed!");
  }

  /**
   * Get demo status
   */
  public isDemoActive(): boolean {
    return this.isDemo;
  }

  /**
   * Clear the demo
   */
  public clearDemo(): void {
    if (this.canvasContainer && this.isDemo) {
      this.canvasContainer.innerHTML = '';
      this.isDemo = false;
      console.log("🧹 Demo cleared");
    }
  }
}

// Create global demo launcher
const demoLauncher = new LayoutDemoLauncher();

// Export all demos for testing
export { demoLessonLayout, demoCustomBlocks, demoDynamicConfiguration, demoLauncher };

// Auto-run demos in development
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  console.log("🎨 Layout System Initialized");
  console.log("Available demos:");
  console.log("  demoLauncher.launchVisualDemo() - Launch full visual demo in canvas");
  console.log("  demoLauncher.runConsoleDemos() - Run console demos only");
  console.log("  demoLauncher.clearDemo() - Clear the demo");
  console.log("  demoLessonLayout, demoCustomBlocks, demoDynamicConfiguration - Individual demos");
  
  // Make demo launcher globally accessible
  (window as any).layoutDemo = demoLauncher;
  
  // Run configuration demo immediately (no rendering)
  demoDynamicConfiguration();
  demoCustomBlocks();
  
  // Show helpful instructions
  console.log("💡 Quick start: Type 'layoutDemo.launchVisualDemo()' in the console to see the template in action!");
}
