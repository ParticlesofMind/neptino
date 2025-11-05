/**
 * Multi-Page Demo - Demonstrates the scrollable multi-page canvas system
 * 
 * This demo shows:
 * - Single canvas with multiple scrollable pages
 * - Metadata-populated headers and footers
 * - Lazy loading and virtualization
 * - Page navigation
 * 
 * Usage:
 *   import { initMultiPageDemo } from './pages/MultiPageDemo';
 *   initMultiPageDemo();
 */

import { PageManager } from "./PageManager";
import { createSampleCourseData } from "./PageMetadata";
import { canvasEngine } from "../CanvasEngine";
import { canvasMarginManager } from "../layout/CanvasMarginManager";

let pageManager: PageManager | null = null;

/**
 * Initialize the multi-page demo
 */
export const initMultiPageDemo = async (): Promise<void> => {
  console.log("🚀 Initializing multi-page canvas demo...");

  // Wait for canvas engine to be ready
  await new Promise<void>((resolve) => {
    canvasEngine.onReady(() => resolve());
  });

  const viewport = canvasEngine.getViewport();
  if (!viewport) {
    console.error("❌ Viewport not found");
    return;
  }

  // Get current margins
  const margins = canvasMarginManager.getMargins();

  // Create sample course data (10 lessons, ~30 pages)
  const pageData = createSampleCourseData();

  console.log(`📚 Created sample course with ${pageData.length} pages`);

  // Create page manager
  pageManager = new PageManager({
    viewport,
    pageData,
    margins,
    showDebugBorders: true, // Set to false in production
  });

  console.log("✅ Multi-page demo initialized");
  console.log(`📄 Total pages: ${pageManager.getTotalPages()}`);
  console.log(`📍 Current page: ${pageManager.getCurrentPageIndex() + 1}`);

  // Setup keyboard navigation
  setupKeyboardNavigation();

  // Setup window API for debugging
  setupWindowAPI();

  // Show instructions
  showInstructions();
};

/**
 * Setup keyboard navigation
 */
const setupKeyboardNavigation = (): void => {
  if (!pageManager) return;

  window.addEventListener("keydown", (event) => {
    if (!pageManager) return;

    switch (event.key) {
      case "ArrowDown":
      case "PageDown":
        event.preventDefault();
        pageManager.nextPage();
        break;

      case "ArrowUp":
      case "PageUp":
        event.preventDefault();
        pageManager.previousPage();
        break;

      case "Home":
        event.preventDefault();
        pageManager.goToPage(0);
        break;

      case "End":
        event.preventDefault();
        pageManager.goToPage(pageManager.getTotalPages() - 1);
        break;

      // Number keys 1-9 for quick navigation
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        if (!event.ctrlKey && !event.metaKey) {
          const pageNum = parseInt(event.key, 10) - 1;
          if (pageNum < pageManager.getTotalPages()) {
            event.preventDefault();
            pageManager.goToPage(pageNum);
          }
        }
        break;
    }
  });

  console.log("⌨️ Keyboard navigation enabled");
};

/**
 * Setup window API for debugging and external control
 */
const setupWindowAPI = (): void => {
  if (!pageManager) return;

  try {
    (window as any).multiPageDemo = {
      pageManager,
      goToPage: (index: number) => pageManager?.goToPage(index),
      nextPage: () => pageManager?.nextPage(),
      previousPage: () => pageManager?.previousPage(),
      getCurrentPage: () => pageManager?.getCurrentPageIndex(),
      getTotalPages: () => pageManager?.getTotalPages(),
      getCurrentPageContainer: () => pageManager?.getCurrentPage(),
      getPage: (index: number) => pageManager?.getPage(index),
      getAllMetadata: () => pageManager?.getAllMetadata(),
      destroy: () => {
        pageManager?.destroy();
        pageManager = null;
      },
    };

    console.log("🪟 Window API available: window.multiPageDemo");
  } catch (error) {
    console.warn("Failed to setup window API:", error);
  }
};

/**
 * Show usage instructions in console
 */
const showInstructions = (): void => {
  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                    MULTI-PAGE CANVAS DEMO                         ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                   ║
║  NAVIGATION:                                                      ║
║  • Arrow Up/Down or PageUp/PageDown - Navigate pages             ║
║  • Home - Go to first page                                        ║
║  • End - Go to last page                                          ║
║  • Number keys (1-9) - Jump to specific page                      ║
║  • Scroll wheel - Smooth scroll through pages                     ║
║  • Space + Drag - Pan around canvas                               ║
║  • Cmd/Ctrl + Scroll - Zoom in/out                                ║
║                                                                   ║
║  CONSOLE API:                                                     ║
║  • window.multiPageDemo.goToPage(index)                           ║
║  • window.multiPageDemo.nextPage()                                ║
║  • window.multiPageDemo.previousPage()                            ║
║  • window.multiPageDemo.getCurrentPage()                          ║
║  • window.multiPageDemo.getTotalPages()                           ║
║  • window.multiPageDemo.getCurrentPageContainer()                 ║
║  • window.multiPageDemo.getAllMetadata()                          ║
║                                                                   ║
║  FEATURES:                                                        ║
║  ✓ Single Canvas with Multiple Pages                             ║
║  ✓ Metadata-Populated Headers & Footers                          ║
║  ✓ Lazy Loading (max 5 pages loaded at once)                     ║
║  ✓ Smooth Scrolling & Navigation                                 ║
║  ✓ Zoom & Pan Support                                             ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
  `);
};

/**
 * Destroy the multi-page demo
 */
export const destroyMultiPageDemo = (): void => {
  if (pageManager) {
    pageManager.destroy();
    pageManager = null;
    console.log("🧹 Multi-page demo destroyed");
  }
};

// Auto-initialize if enabled
if (typeof window !== "undefined") {
  // Check for auto-init flag
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get("multipage") === "true" || urlParams.get("demo") === "true") {
    console.log("🎬 Auto-initializing multi-page demo...");
    
    // Wait for DOM ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        setTimeout(() => initMultiPageDemo(), 1000);
      });
    } else {
      setTimeout(() => initMultiPageDemo(), 1000);
    }
  }
}
