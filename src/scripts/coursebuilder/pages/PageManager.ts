/**
 * PageManager - Manages multiple pages, scrolling, and virtualization
 * Creates a scrollable multi-page canvas with lazy loading
 */

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { Viewport } from "pixi-viewport";
import { PageContainer } from "./PageContainer";
import type { PageMetadata } from "./PageMetadata";

const BASE_WIDTH = 1200;
const BASE_HEIGHT = 1800;
const PAGE_GAP = 40; // Gap between pages
const VIEWPORT_BUFFER = 200; // Pre-load buffer in pixels
const MAX_LOADED_PAGES = 5; // Maximum number of pages to keep loaded

interface PageManagerConfig {
  viewport: Viewport;
  pageData: PageMetadata[];
  margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  showDebugBorders?: boolean;
}

interface LoadedPage {
  index: number;
  container: PageContainer;
  yPosition: number;
}

export class PageManager {
  private viewport: Viewport;
  private scrollContainer: Container;
  private pageData: PageMetadata[];
  private margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  private showDebugBorders: boolean;

  // Page management
  private loadedPages = new Map<number, LoadedPage>();
  private pagePositions: number[] = [];
  private totalHeight = 0;

  // Current state
  private currentPageIndex = 0;
  private animating = false;

  // Background
  private backgroundContainer: Container;

  constructor(config: PageManagerConfig) {
    this.viewport = config.viewport;
    this.pageData = config.pageData;
    this.margins = config.margins;
    this.showDebugBorders = config.showDebugBorders ?? false;

    // Create scroll container
    this.scrollContainer = new Container();
    this.scrollContainer.label = "scroll-container";
    this.viewport.addChild(this.scrollContainer);

    // Create background container (for visual guides)
    this.backgroundContainer = new Container();
    this.backgroundContainer.label = "background-container";
    this.scrollContainer.addChild(this.backgroundContainer);

    // Calculate page positions
    this.calculatePagePositions();

    // Draw backgrounds
    this.drawBackgrounds();

    // Setup viewport listeners
    this.setupViewportListeners();

    // Load initial pages
    this.loadVisiblePages();

    // Go to first page
    this.goToPage(0, false);
  }

  /**
   * Calculate Y positions for all pages
   */
  private calculatePagePositions(): void {
    this.pagePositions = [];
    let currentY = 0;

    for (let i = 0; i < this.pageData.length; i++) {
      this.pagePositions.push(currentY);
      currentY += BASE_HEIGHT + PAGE_GAP;
    }

    this.totalHeight = currentY - PAGE_GAP; // Remove last gap
    console.log(`📐 Page positions calculated for ${this.pageData.length} pages, total height: ${this.totalHeight}px`);
  }

  /**
   * Draw background rectangles for all pages (visual guide)
   */
  private drawBackgrounds(): void {
    this.backgroundContainer.removeChildren();

    const bg = new Graphics();

    this.pagePositions.forEach((y, index) => {
      // Draw page background
      bg.rect(0, y, BASE_WIDTH, BASE_HEIGHT);
      bg.fill({ color: 0xffffff, alpha: 1 });
      bg.stroke({ color: 0xe2e8f0, width: 2 });

      // Draw page number indicator (small)
      const numberStyle = new TextStyle({
        fontSize: 10,
        fontWeight: "600",
        fill: 0xcbd5e1,
      });
      
      const numberText = new Text({
        text: `${index + 1}`,
        style: numberStyle,
      });
      numberText.anchor.set(0.5);
      numberText.x = BASE_WIDTH / 2;
      numberText.y = y + BASE_HEIGHT / 2;
      bg.addChild(numberText);
    });

    this.backgroundContainer.addChild(bg);
  }

  /**
   * Setup viewport event listeners for scroll tracking
   */
  private setupViewportListeners(): void {
    this.viewport.on("moved", () => {
      if (!this.animating) {
        this.onViewportMove();
      }
    });

    this.viewport.on("zoomed", () => {
      if (!this.animating) {
        this.onViewportMove();
      }
    });
  }

  /**
   * Handle viewport movement - load/unload pages as needed
   */
  private onViewportMove(): void {
    this.loadVisiblePages();
    this.updateCurrentPage();
  }

  /**
   * Load pages that are visible in the viewport
   */
  private loadVisiblePages(): void {
    const viewportTop = this.viewport.top;
    const viewportBottom = this.viewport.bottom;
    const scale = this.viewport.scale.y || 1;

    // Calculate visible range with buffer
    const loadTop = Math.max(0, viewportTop - VIEWPORT_BUFFER / scale);
    const loadBottom = Math.min(this.totalHeight, viewportBottom + VIEWPORT_BUFFER / scale);

    // Find pages that should be loaded
    const pagesToLoad: number[] = [];
    
    this.pagePositions.forEach((y, index) => {
      const pageBottom = y + BASE_HEIGHT;
      
      // Check if page intersects with load range
      if (y <= loadBottom && pageBottom >= loadTop) {
        pagesToLoad.push(index);
      }
    });

    // Unload pages that are far from viewport
    const pagesToUnload: number[] = [];
    this.loadedPages.forEach((_page, index) => {
      if (!pagesToLoad.includes(index)) {
        pagesToUnload.push(index);
      }
    });

    // Unload distant pages if we exceed max loaded pages
    if (this.loadedPages.size > MAX_LOADED_PAGES) {
      pagesToUnload.push(...this.findDistantPages(viewportTop, viewportBottom));
    }

    // Unload pages
    pagesToUnload.forEach((index) => {
      this.unloadPage(index);
    });

    // Load pages
    pagesToLoad.forEach((index) => {
      if (!this.loadedPages.has(index)) {
        this.loadPage(index);
      }
    });
  }

  /**
   * Find pages that are distant from the current viewport
   */
  private findDistantPages(viewportTop: number, viewportBottom: number): number[] {
    const viewportCenter = (viewportTop + viewportBottom) / 2;
    const distant: { index: number; distance: number }[] = [];

    this.loadedPages.forEach((page) => {
      const pageCenter = page.yPosition + BASE_HEIGHT / 2;
      const distance = Math.abs(pageCenter - viewportCenter);
      distant.push({ index: page.index, distance });
    });

    // Sort by distance (furthest first)
    distant.sort((a, b) => b.distance - a.distance);

    // Return indices of furthest pages (keep only MAX_LOADED_PAGES)
    const toUnload = distant.slice(MAX_LOADED_PAGES).map((d) => d.index);
    return toUnload;
  }

  /**
   * Load a specific page
   */
  private loadPage(index: number): void {
    if (this.loadedPages.has(index)) {
      return; // Already loaded
    }

    if (index < 0 || index >= this.pageData.length) {
      return; // Invalid index
    }

    const metadata = this.pageData[index];
    const yPosition = this.pagePositions[index];

    // Create page container
    const pageContainer = new PageContainer(metadata, {
      width: BASE_WIDTH,
      height: BASE_HEIGHT,
      margins: this.margins,
      showDebugBorders: this.showDebugBorders,
    });

    pageContainer.y = yPosition;

    // Add to scroll container
    this.scrollContainer.addChild(pageContainer);

    // Store in loaded pages
    this.loadedPages.set(index, {
      index,
      container: pageContainer,
      yPosition,
    });

    console.log(`✅ Loaded page ${index + 1}`);
  }

  /**
   * Unload a specific page
   */
  private unloadPage(index: number): void {
    const page = this.loadedPages.get(index);
    if (!page) {
      return; // Not loaded
    }

    // Remove from scroll container
    this.scrollContainer.removeChild(page.container);
    
    // Destroy the page
    page.container.destroy({ children: true });

    // Remove from loaded pages
    this.loadedPages.delete(index);

    console.log(`🗑️ Unloaded page ${index + 1}`);
  }

  /**
   * Update current page index based on viewport position
   */
  private updateCurrentPage(): void {
    const viewportCenter = this.viewport.center.y;

    // Find the page closest to viewport center
    let closestIndex = 0;
    let closestDistance = Infinity;

    this.pagePositions.forEach((y, index) => {
      const pageCenter = y + BASE_HEIGHT / 2;
      const distance = Math.abs(pageCenter - viewportCenter);
      
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== this.currentPageIndex) {
      this.currentPageIndex = closestIndex;
      console.log(`📄 Current page: ${this.currentPageIndex + 1}`);
    }
  }

  /**
   * Navigate to a specific page
   */
  public goToPage(index: number, animated = true): void {
    if (index < 0 || index >= this.pageData.length) {
      console.warn(`Invalid page index: ${index}`);
      return;
    }

    const targetY = this.pagePositions[index] + BASE_HEIGHT / 2;
    const targetX = BASE_WIDTH / 2;

    this.currentPageIndex = index;

    if (animated && !this.animating) {
      this.animating = true;
      this.viewport.animate({
        position: { x: targetX, y: targetY },
        time: 400,
        ease: "easeInOutCubic",
        callbackOnComplete: () => {
          this.animating = false;
          this.loadVisiblePages();
        },
      });
    } else {
      this.viewport.moveCenter(targetX, targetY);
      this.loadVisiblePages();
    }

    console.log(`🎯 Navigating to page ${index + 1}`);
  }

  /**
   * Go to next page
   */
  public nextPage(): void {
    if (this.currentPageIndex < this.pageData.length - 1) {
      this.goToPage(this.currentPageIndex + 1);
    }
  }

  /**
   * Go to previous page
   */
  public previousPage(): void {
    if (this.currentPageIndex > 0) {
      this.goToPage(this.currentPageIndex - 1);
    }
  }

  /**
   * Get current page index
   */
  public getCurrentPageIndex(): number {
    return this.currentPageIndex;
  }

  /**
   * Get total number of pages
   */
  public getTotalPages(): number {
    return this.pageData.length;
  }

  /**
   * Get a specific loaded page container
   */
  public getPage(index: number): PageContainer | null {
    const page = this.loadedPages.get(index);
    return page ? page.container : null;
  }

  /**
   * Get current page container
   */
  public getCurrentPage(): PageContainer | null {
    return this.getPage(this.currentPageIndex);
  }

  /**
   * Get all page metadata
   */
  public getAllMetadata(): PageMetadata[] {
    return this.pageData;
  }

  /**
   * Update margins for all pages
   */
  public updateMargins(margins: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  }): void {
    this.margins = margins;

    // Update all loaded pages
    this.loadedPages.forEach((page) => {
      // Note: Would need to implement updateMargins in PageContainer
      console.log(`Updating margins for page ${page.index + 1}`);
    });
  }

  /**
   * Destroy the page manager
   */
  public destroy(): void {
    // Unload all pages
    const indices = Array.from(this.loadedPages.keys());
    indices.forEach((index) => {
      this.unloadPage(index);
    });

    // Remove scroll container
    this.viewport.removeChild(this.scrollContainer);
    this.scrollContainer.destroy({ children: true });

    console.log("🧹 PageManager destroyed");
  }
}
