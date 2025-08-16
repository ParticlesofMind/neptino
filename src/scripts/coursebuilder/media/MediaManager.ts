/**
 * Focused Media Manager
 * Coordinates media selection, search, and panel management
 * Single Responsibility: High-level media coordination only
 */

import { MediaSelectionController } from "./MediaSelectionController";
import { MediaSearchController } from "./MediaSearchController";
import { MediaPanelManager } from "./MediaPanelManager";

export class MediaManager {
 private selectionController: MediaSelectionController;
 private searchController: MediaSearchController;
 private panelManager: MediaPanelManager;
 private onMediaSelectionCallback: ((mediaType: string) => void) | null = null;

 constructor() {
 this.selectionController = new MediaSelectionController();
 this.searchController = new MediaSearchController();
 this.panelManager = new MediaPanelManager();

 this.setupComponentCallbacks();
 }

 /**
 * Setup callbacks between components
 */
 private setupComponentCallbacks(): void {
 // When media type is selected, update search context and panel
 this.selectionController.setOnMediaSelection((mediaType: string) => {
 this.searchController.setMediaType(mediaType);
 this.panelManager.updateSearchPanel(mediaType);

 // Trigger external callback
 if (this.onMediaSelectionCallback) {
 this.onMediaSelectionCallback(mediaType);
 }
 });

 // When search results are ready, display them
 this.searchController.setOnSearchResults((results: any[]) => {
 this.panelManager.displaySearchResults(results);
 });

 // When media item is selected from panel, add to canvas
 this.panelManager.setOnMediaSelection((mediaUrl: string) => {
 this.addMediaToCanvas(mediaUrl);
 });
 }

 /**
 * Set callback for media selection events
 */
 setOnMediaSelection(callback: (mediaType: string) => void): void {
 this.onMediaSelectionCallback = callback;
 }

 /**
 * Add media to canvas
 */
 private addMediaToCanvas(mediaUrl: string): void {

 // Dispatch event for canvas integration
 const event = new CustomEvent("addMediaToCanvas", {
 detail: {
 url: mediaUrl,
 type: this.selectionController.getSelectedMediaType(),
 },
 });
 document.dispatchEvent(event);
 }

 /**
 * Get current state
 */
 getState(): any {
 return {
 selectedMediaType: this.selectionController.getSelectedMediaType(),
 searchState: this.searchController.getSearchState(),
 panelOpen: this.panelManager.isPanelOpen(),
 availableMediaTypes: this.selectionController.getAvailableMediaTypes(),
 };
 }

 /**
 * Clear all selections and close panel
 */
 clear(): void {
 this.selectionController.clearSelection();
 this.searchController.clearSearch();
 this.panelManager.closePanel();
 }

 /**
 * Destroy all components
 */
 destroy(): void {
 this.selectionController.destroy();
 this.searchController.destroy();
 this.panelManager.destroy();
 this.onMediaSelectionCallback = null;
 }
}
