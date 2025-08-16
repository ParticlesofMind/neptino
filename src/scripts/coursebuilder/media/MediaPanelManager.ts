/**
 * Media Panel Manager
 * Manages search panel display and result rendering
 * Single Responsibility: Panel UI management only
 */

export class MediaPanelManager {
 private panelElement: HTMLElement | null = null;
 private resultsContainer: HTMLElement | null = null;
 private onMediaSelectionCallback: ((url: string) => void) | null = null;

 constructor() {
 this.initializePanelElements();
 }

 /**
 * Initialize panel elements
 */
 private initializePanelElements(): void {
 this.panelElement = document.getElementById("media-search-panel");
 this.resultsContainer = document.getElementById("media-search-results");
 }

 /**
 * Set callback for media item selection
 */
 setOnMediaSelection(callback: (url: string) => void): void {
 this.onMediaSelectionCallback = callback;
 }

 /**
 * Update search panel for media type
 */
 updateSearchPanel(mediaType: string): void {
 if (!this.panelElement) return;

 // Update panel title
 const panelTitle = this.panelElement.querySelector('element');
 if (panelTitle) {
 panelTitle.textContent = `Search ${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`;
 }

 // Show panel
 this.panelElement

 // Show placeholder
 this.showSearchPlaceholder();

 }

 /**
 * Display search results
 */
 displaySearchResults(results: any[]): void {
 if (!this.resultsContainer) return;

 // Clear previous results
 this.resultsContainer.innerHTML = "";

 if (results.length === 0) {
 this.showNoResults();
 return;
 }

 // Create result items
 results.forEach((result) => {
 const resultItem = this.createResultItem(result);
 if (this.resultsContainer) {
 this.resultsContainer.appendChild(resultItem);
 }
 });

 }

 /**
 * Create a result item element
 */
 private createResultItem(result: any): HTMLElement {
 const item = document.createElement("div");
 item
 item.setAttribute("data-media-url", result.url);

 item.innerHTML = `
 <img src="${result.thumbnail}" alt="${result.title}" class="media-result-thumbnail">
 <div class="media-result-info">
 <h4 class="media-result-title">${result.title}</h4>
 <p class="media-result-description">${result.description}</p>
 </div>
 `;

 // Add click handler
 item.addEventListener("click", (event) => {
 this.handleMediaItemSelection(event);
 });

 return item;
 }

 /**
 * Handle media item selection
 */
 private handleMediaItemSelection(event: Event): void {
 const target = event.currentTarget as HTMLElement;
 const mediaUrl = target.getAttribute("data-media-url");

 if (!mediaUrl) return;

 // Trigger callback
 if (this.onMediaSelectionCallback) {
 this.onMediaSelectionCallback(mediaUrl);
 }

 // Close panel
 this.closePanel();
 }

 /**
 * Show search placeholder
 */
 private showSearchPlaceholder(): void {
 if (!this.resultsContainer) return;

 this.resultsContainer.innerHTML = `
 <div class="media-search-placeholder">
 <p>Enter a search term to find media</p>
 </div>
 `;
 }

 /**
 * Show no results message
 */
 private showNoResults(): void {
 if (!this.resultsContainer) return;

 this.resultsContainer.innerHTML = `
 <div class="media-no-results">
 <p>No results found</p>
 </div>
 `;
 }

 /**
 * Close search panel
 */
 closePanel(): void {
 if (!this.panelElement) return;

 this.panelElement

 // Clear results
 if (this.resultsContainer) {
 this.resultsContainer.innerHTML = "";
 }

 }

 /**
 * Check if panel is open
 */
 isPanelOpen(): boolean {
 return (
 this.panelElement?
 }

 /**
 * Destroy panel manager
 */
 destroy(): void {
 // Remove event listeners from result items
 if (this.resultsContainer) {
 const resultItems =
 this.resultsContainer.querySelectorAll('elements');
 resultItems.forEach((item) => {
 item.removeEventListener("click", this.handleMediaItemSelection);
 });
 }

 this.closePanel();
 this.onMediaSelectionCallback = null;

 }
}
