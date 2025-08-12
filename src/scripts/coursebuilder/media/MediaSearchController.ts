/**
 * Media Search Controller
 * Handles search functionality and result display
 * Single Responsibility: Search operations only
 */

export class MediaSearchController {
  private currentQuery: string = "";
  private currentMediaType: string = "";
  private onSearchCallback: ((results: any[]) => void) | null = null;

  constructor() {
    this.bindSearchEvents();
  }

  /**
   * Set callback for search results
   */
  setOnSearchResults(callback: (results: any[]) => void): void {
    this.onSearchCallback = callback;
  }

  /**
   * Bind search events
   */
  private bindSearchEvents(): void {
    // Search input
    const searchInput = document.getElementById(
      "media-search-input",
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.addEventListener("input", (event) => {
        this.handleSearchInput(event);
      });

      searchInput.addEventListener("keypress", (event) => {
        this.handleSearchKeypress(event);
      });
    }

    // Search button
    const searchBtn = document.getElementById("media-search-btn");
    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        this.performSearch();
      });
    }
  }

  /**
   * Handle search input changes
   */
  private handleSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.currentQuery = target.value.trim();
  }

  /**
   * Handle search keypress (Enter to search)
   */
  private handleSearchKeypress(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      this.performSearch();
    }
  }

  /**
   * Perform media search
   */
  private performSearch(): void {
    if (!this.currentQuery || !this.currentMediaType) {
      console.warn("⚠️ Search query or media type missing");
      return;
    }

    console.log(
      `🔍 Searching for ${this.currentMediaType}: "${this.currentQuery}"`,
    );

    // Generate mock results (replace with real API call)
    const results = this.generateMockResults(
      this.currentQuery,
      this.currentMediaType,
    );

    // Trigger callback with results
    if (this.onSearchCallback) {
      this.onSearchCallback(results);
    }
  }

  /**
   * Set media type for search context
   */
  setMediaType(mediaType: string): void {
    this.currentMediaType = mediaType;
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.currentQuery = "";
    this.currentMediaType = "";

    const searchInput = document.getElementById(
      "media-search-input",
    ) as HTMLInputElement;
    if (searchInput) {
      searchInput.value = "";
    }
  }

  /**
   * Get current search state
   */
  getSearchState(): { query: string; mediaType: string } {
    return {
      query: this.currentQuery,
      mediaType: this.currentMediaType,
    };
  }

  /**
   * Generate mock search results
   */
  private generateMockResults(
    query: string,
    mediaType: string,
  ): Array<{
    url: string;
    thumbnail: string;
    title: string;
    description: string;
  }> {
    const results = [];
    const baseUrl = "https://picsum.photos";

    for (let i = 1; i <= 8; i++) {
      const imageId = 200 + i;
      results.push({
        url: `${baseUrl}/400/300?random=${imageId}`,
        thumbnail: `${baseUrl}/150/150?random=${imageId}`,
        title: `${mediaType} result ${i} for "${query}"`,
        description: `Sample ${mediaType} found for search term: ${query}`,
      });
    }

    return results;
  }

  /**
   * Destroy controller
   */
  destroy(): void {
    // Remove event listeners
    const searchInput = document.getElementById("media-search-input");
    const searchBtn = document.getElementById("media-search-btn");

    if (searchInput) {
      searchInput.removeEventListener("input", this.handleSearchInput);
      searchInput.removeEventListener("keypress", this.handleSearchKeypress);
    }

    if (searchBtn) {
      searchBtn.removeEventListener("click", this.performSearch);
    }

    this.onSearchCallback = null;
    this.clearSearch();

  }
}
