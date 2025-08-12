/**
 * Page Navigation Controller
 * Handles page navigation, UI updates, and page switching logic
 * Single Responsibility: Page navigation and navigation UI only
 */

export class PageNavigationController {
  private currentPageIndex: number = 0;
  private totalPages: number = 1;
  private onPageChangeCallback: ((pageIndex: number) => void) | null = null;

  constructor() {
    this.bindNavigationEvents();
  }

  /**
   * Set callback for page changes
   */
  setOnPageChange(callback: (pageIndex: number) => void): void {
    this.onPageChangeCallback = callback;
  }

  /**
   * Bind navigation events
   */
  private bindNavigationEvents(): void {
    // Previous page button
    const prevPageBtn = document.getElementById("prev-page");
    if (prevPageBtn) {
      prevPageBtn.addEventListener("click", this.goToPreviousPage.bind(this));
    }

    // Next page button
    const nextPageBtn = document.getElementById("next-page");
    if (nextPageBtn) {
      nextPageBtn.addEventListener("click", this.goToNextPage.bind(this));
    }

    // Page selector dropdown
    const pageSelector = document.getElementById(
      "page-selector",
    ) as HTMLSelectElement;
    if (pageSelector) {
      pageSelector.addEventListener(
        "change",
        this.handlePageSelection.bind(this),
      );
    }

    // Keyboard navigation
    document.addEventListener(
      "keydown",
      this.handleKeyboardNavigation.bind(this),
    );
  }

  /**
   * Handle keyboard navigation
   */
  private handleKeyboardNavigation(event: KeyboardEvent): void {
    // Only handle navigation if no input elements are focused
    if (
      document.activeElement?.tagName === "INPUT" ||
      document.activeElement?.tagName === "TEXTAREA"
    ) {
      return;
    }

    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case "ArrowLeft":
          event.preventDefault();
          this.goToPreviousPage();
          break;
        case "ArrowRight":
          event.preventDefault();
          this.goToNextPage();
          break;
      }
    }
  }

  /**
   * Go to previous page
   */
  goToPreviousPage(): void {
    if (this.currentPageIndex > 0) {
      this.setCurrentPage(this.currentPageIndex - 1);
      console.log("⬅️ Previous page");
    }
  }

  /**
   * Go to next page
   */
  goToNextPage(): void {
    if (this.currentPageIndex < this.totalPages - 1) {
      this.setCurrentPage(this.currentPageIndex + 1);
      console.log("➡️ Next page");
    }
  }

  /**
   * Handle page selection from dropdown
   */
  private handlePageSelection(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const selectedIndex = parseInt(select.value);

    if (selectedIndex >= 0 && selectedIndex < this.totalPages) {
      this.setCurrentPage(selectedIndex);
      console.log("🎯 Page selected:", selectedIndex + 1);
    }
  }

  /**
   * Set current page index
   */
  setCurrentPage(pageIndex: number): void {
    if (pageIndex >= 0 && pageIndex < this.totalPages) {
      this.currentPageIndex = pageIndex;
      this.updateNavigationUI();

      // Trigger callback
      if (this.onPageChangeCallback) {
        this.onPageChangeCallback(pageIndex);
      }
    }
  }

  /**
   * Set total pages count
   */
  setTotalPages(count: number): void {
    this.totalPages = Math.max(1, count);

    // Adjust current page if necessary
    if (this.currentPageIndex >= this.totalPages) {
      this.currentPageIndex = this.totalPages - 1;
    }

    this.updateNavigationUI();
  }

  /**
   * Update page selector with page names
   */
  updatePageSelector(pages: Array<{ name: string }>): void {
    const pageSelector = document.getElementById(
      "page-selector",
    ) as HTMLSelectElement;
    if (!pageSelector) return;

    pageSelector.innerHTML = pages
      .map(
        (page, index) =>
          `<option value="${index}" ${index === this.currentPageIndex ? "selected" : ""}>${page.name}</option>`,
      )
      .join("");
  }

  /**
   * Update navigation UI elements
   */
  private updateNavigationUI(): void {
    // Update navigation buttons
    const prevBtn = document.getElementById("prev-page") as HTMLButtonElement;
    const nextBtn = document.getElementById("next-page") as HTMLButtonElement;

    if (prevBtn) {
      prevBtn.disabled = this.currentPageIndex === 0;
      prevBtn.title =
        this.currentPageIndex === 0 ? "First page" : "Previous page";
    }

    if (nextBtn) {
      nextBtn.disabled = this.currentPageIndex === this.totalPages - 1;
      nextBtn.title =
        this.currentPageIndex === this.totalPages - 1
          ? "Last page"
          : "Next page";
    }

    // Update page counter
    const pageCounter = document.getElementById("page-counter");
    if (pageCounter) {
      pageCounter.textContent = `${this.currentPageIndex + 1} / ${this.totalPages}`;
    }

    // Update progress indicator
    this.updateProgressIndicator();
  }

  /**
   * Update progress indicator
   */
  private updateProgressIndicator(): void {
    const progressBar = document.getElementById("page-progress");
    if (progressBar) {
      const progressPercentage =
        this.totalPages > 1
          ? (this.currentPageIndex / (this.totalPages - 1)) * 100
          : 100;
      progressBar.style.width = `${progressPercentage}%`;
    }
  }

  /**
   * Get current page index
   */
  getCurrentPageIndex(): number {
    return this.currentPageIndex;
  }

  /**
   * Get total pages count
   */
  getTotalPages(): number {
    return this.totalPages;
  }

  /**
   * Check if can go to previous page
   */
  canGoToPrevious(): boolean {
    return this.currentPageIndex > 0;
  }

  /**
   * Check if can go to next page
   */
  canGoToNext(): boolean {
    return this.currentPageIndex < this.totalPages - 1;
  }

  /**
   * Reset to first page
   */
  resetToFirstPage(): void {
    this.setCurrentPage(0);
  }

  /**
   * Go to last page
   */
  goToLastPage(): void {
    this.setCurrentPage(this.totalPages - 1);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    document.removeEventListener("keydown", this.handleKeyboardNavigation);
    this.onPageChangeCallback = null;
  }
}
