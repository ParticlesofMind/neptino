/**
 * Media Selection Controller
 * Handles media type selection and UI interactions
 * Single Responsibility: Media selection UI only
 */

export class MediaSelectionController {
 private onMediaSelectionCallback: ((mediaType: string) => void) | null = null;
 private selectedMediaType: string | null = null;

 constructor() {
 this.bindMediaEvents();
 }

 /**
 * Set callback for media selection
 */
 setOnMediaSelection(callback: (mediaType: string) => void): void {
 this.onMediaSelectionCallback = callback;
 }

 /**
 * Bind media selection events
 */
 private bindMediaEvents(): void {
 // Media type buttons (image, video, audio, etc.)
 const mediaButtons = document.querySelectorAll("[data-media-type]");
 mediaButtons.forEach((button) => {
 button.addEventListener("click", (event) => {
 this.handleMediaSelection(event);
 });
 });
 }

 /**
 * Handle media type selection
 */
 private handleMediaSelection(event: Event): void {
 const target = event.target as HTMLElement;
 const mediaType = target.getAttribute("data-media-type");

 if (!mediaType) return;

 // Update visual selection
 this.updateSelectionUI(mediaType);

 // Store selected media type
 this.selectedMediaType = mediaType;

 // Trigger callback
 if (this.onMediaSelectionCallback) {
 this.onMediaSelectionCallback(mediaType);
 }

 }

 /**
 * Update visual selection in UI
 */
 private updateSelectionUI(selectedType: string): void {
 // Remove active class from all media buttons
 const mediaButtons = document.querySelectorAll("[data-media-type]");
 mediaButtons.forEach((button) => {
 button
 });

 // Add active class to selected button
 const selectedButton = document.querySelector(
 `[data-media-type="${selectedType}"]`,
 );
 if (selectedButton) {
 selectedButton
 }
 }

 /**
 * Get currently selected media type
 */
 getSelectedMediaType(): string | null {
 return this.selectedMediaType;
 }

 /**
 * Clear selection
 */
 clearSelection(): void {
 this.selectedMediaType = null;

 // Remove all active classes
 const mediaButtons = document.querySelectorAll("[data-media-type]");
 mediaButtons.forEach((button) => {
 button
 });
 }

 /**
 * Get available media types
 */
 getAvailableMediaTypes(): string[] {
 const buttons = document.querySelectorAll("[data-media-type]");
 return Array.from(buttons)
 .map((button) => button.getAttribute("data-media-type"))
 .filter((type) => type !== null) as string[];
 }

 /**
 * Destroy controller
 */
 destroy(): void {
 // Remove event listeners
 const mediaButtons = document.querySelectorAll("[data-media-type]");
 mediaButtons.forEach((button) => {
 button.removeEventListener("click", this.handleMediaSelection);
 });

 this.onMediaSelectionCallback = null;
 this.selectedMediaType = null;

 }
}
