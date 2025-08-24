/**
 * Layout System Demo
 * Example usage of the modular layout system
 */

import { Application } from "pixi.js";
import { LessonRenderer } from "./lesson/LessonRenderer";
import { HeaderBlock, ContentBlock } from "./blocks";

/**
 * Demo: Create and render a lesson template
 */
async function demoLessonLayout(): Promise<void> {
  // Create PIXI application
  const app = new Application();
  await app.init({
    width: 1200,
    height: 800,
    backgroundColor: 0xf0f0f0,
  });

  // Create lesson renderer with required parameters
  const lessonRenderer = new LessonRenderer(app.stage, 1200, 800);

  // Render the lesson with default template
  const lessonContainer = lessonRenderer.renderLesson({
    theme: "modern",
    showLabels: true,
    responsive: true,
  });

  console.log("Demo lesson rendered successfully!", lessonContainer.children.length, "blocks");
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

// Export all demos for testing
export { demoLessonLayout, demoCustomBlocks, demoDynamicConfiguration };

// Auto-run demos in development
if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
  console.log("🎨 Layout System Initialized");
  console.log("Available demos: demoLessonLayout, demoCustomBlocks, demoDynamicConfiguration");
  
  // Run configuration demo immediately (no rendering)
  demoDynamicConfiguration();
  demoCustomBlocks();
}
