/**
 * Canvas Navigation Manager
 * Handles navigation between multiple canvases, thumbnails, and table of contents
 */

import type { CourseLayout, CanvasLayout } from "../coursebuilder/layout/LayoutTypes";

interface CanvasThumbnail {
 id: string;
 sessionNumber: number;
 canvasNumber: number;
 element: HTMLElement;
 isActive: boolean;
}

export class CanvasNavigator {
 private thumbnails: CanvasThumbnail[] = [];
 private currentCanvasIndex: number = 0;
 private tocContainer: HTMLElement | null = null;
 private onCanvasChangeCallback: ((canvasIndex: number) => void) | null = null;

 constructor(tocContainerId: string = "") {
 this.tocContainer = document.getElementById(tocContainerId);
 if (!this.tocContainer) {
 console.warn(`TOC container with id "${tocContainerId}" not found`);
 }
 }

 /**
 * Set callback for canvas change events
 */
 setOnCanvasChange(callback: (canvasIndex: number) => void): void {
 this.onCanvasChangeCallback = callback;
 }

 /**
 * Generate navigation for a course layout
 */
 generateNavigation(courseLayout: CourseLayout): void {
 if (!this.tocContainer) return;

 this.tocContainer.innerHTML = "";
 this.thumbnails = [];

 // Create header with course summary
 this.createNavigationHeader(courseLayout);

 // Create thumbnail for each canvas
 courseLayout.canvases.forEach((canvas, index) => {
 const thumbnail = this.createCanvasThumbnail(canvas, index);
 this.thumbnails.push(thumbnail);
 this.tocContainer!.appendChild(thumbnail.element);
 });

 // Set first canvas as active
 if (this.thumbnails.length > 0) {
 this.setActiveCanvas(0);
 }
 }

 /**
 * Create navigation header with course summary
 */
 private createNavigationHeader(courseLayout: CourseLayout): void {
 const header = document.createElement("div");
 header
 header.innerHTML = `
 <h3>Course Navigation</h3>
 <div class="">
 Total Sessions: ${courseLayout.scheduledSessions}<br>
 Total Canvases: ${courseLayout.totalCanvases}<br>
 Lesson Duration: ${courseLayout.lessonDuration.type}
 </div>
 `;

 const controls = document.createElement("div");
 controls
 controls.innerHTML = `
 <button class="canvas-nav-btn canvas-nav-btn--prev" title="Previous Canvas">
 <span class="">←</span>
 </button>
 <span class="canvas-nav-current">
 Canvas <span class="current-number">1</span> of ${courseLayout.totalCanvases}
 </span>
 <button class="canvas-nav-btn canvas-nav-btn--next" title="Next Canvas">
 <span class="">→</span>
 </button>
 `;

 // Add event listeners
 const prevBtn = controls.querySelector(
 ".canvas-nav-btn--prev",
 ) as HTMLElement;
 const nextBtn = controls.querySelector(
 ".canvas-nav-btn--next",
 ) as HTMLElement;

 prevBtn?.addEventListener("click", () =>
 this.navigateToCanvas(this.currentCanvasIndex - 1),
 );
 nextBtn?.addEventListener("click", () =>
 this.navigateToCanvas(this.currentCanvasIndex + 1),
 );

 header.appendChild(controls);
 this.tocContainer!.appendChild(header);
 }

 /**
 * Create thumbnail for a canvas
 */
 private createCanvasThumbnail(
 canvas: CanvasLayout,
 index: number,
 ): CanvasThumbnail {
 const thumbnail = document.createElement("div");
 thumbnail
 thumbnail.dataset.canvasIndex = index.toString();

 // Create visual preview of canvas layout
 const preview = document.createElement("div");
 preview

 // Add miniature blocks
 canvas.blocks.forEach((block) => {
 const blockElement = document.createElement("div");
 blockElement

 // Scale down the block proportionally
 const scaleX = 0.1; // 10% of original width
 const scaleY = 0.1; // 10% of original height

 blockElement.style.cssText = `
 position: absolute;
 left: ${block.x * scaleX}px;
 top: ${block.y * scaleY}px;
 width: ${block.width * scaleX}px;
 height: ${block.height * scaleY}px;
 `;

 preview.appendChild(blockElement);
 });

 // Create label
 const label = document.createElement("div");
 label

 const canvasTypeName = this.getCanvasTypeName(
 canvas.sessionNumber,
 canvas.canvasNumber,
 );
 label.innerHTML = `
 <div class="">Session ${canvas.sessionNumber}</div>
 <div class="">${canvasTypeName}</div>
 <div class="">${canvas.canvasNumber}</div>
 `;

 thumbnail.appendChild(preview);
 thumbnail.appendChild(label);

 // Add click handler
 thumbnail.addEventListener("click", () => {
 this.navigateToCanvas(index);
 });

 return {
 id: canvas.id,
 sessionNumber: canvas.sessionNumber,
 canvasNumber: canvas.canvasNumber,
 element: thumbnail,
 isActive: false,
 };
 }

 /**
 * Navigate to specific canvas
 */
 navigateToCanvas(index: number): void {
 if (index < 0 || index >= this.thumbnails.length) return;

 // Update active states
 this.setActiveCanvas(index);

 // Update current canvas counter
 const currentNumberSpan =
 this.tocContainer?.querySelector('element');
 if (currentNumberSpan) {
 currentNumberSpan.textContent = (index + 1).toString();
 }

 // Trigger callback
 if (this.onCanvasChangeCallback) {
 this.onCanvasChangeCallback(index);
 }
 }

 /**
 * Set active canvas
 */
 private setActiveCanvas(index: number): void {
 // Remove active class from all thumbnails
 this.thumbnails.forEach((thumbnail) => {
 thumbnail.isActive = false;
 thumbnail.element
 });

 // Set new active canvas
 if (this.thumbnails[index]) {
 this.thumbnails[index].isActive = true;
 this.thumbnails[index].element
 this.currentCanvasIndex = index;
 }
 }

 /**
 * Get canvas type name for display
 */
 private getCanvasTypeName(
 _sessionNumber: number,
 canvasNumber: number,
 ): string {
 if (canvasNumber === 1) return "Opening";
 if (canvasNumber === 2) return "Development";
 if (canvasNumber === 3) return "Closing";
 return `Canvas ${canvasNumber}`;
 }

 /**
 * Get current canvas index
 */
 getCurrentCanvasIndex(): number {
 return this.currentCanvasIndex;
 }

 /**
 * Get total canvas count
 */
 getTotalCanvases(): number {
 return this.thumbnails.length;
 }
}
