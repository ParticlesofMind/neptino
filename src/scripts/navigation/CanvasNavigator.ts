/**
 * Canvas Navigation Manager
 * Handles navigation between multiple canvases, thumbnails, and table of contents
 */

// Define layout types locally until LayoutTypes module is created
interface CourseLayout {
  scheduledSessions: number;
  totalCanvases: number;
  lessonDuration: {
    type: string;
  };
  canvases: CanvasLayout[];
}

interface CanvasLayout {
  id: string;
  sessionNumber: number;
  canvasNumber: number;
  type: string;
  blocks: any[];
}

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
 courseLayout.canvases.forEach((canvas: CanvasLayout, index: number) => {
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
 header.className = "flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600";
 header.innerHTML = `
 <h3 class="text-base font-semibold text-neutral-900">Course Navigation</h3>
 <div class="space-y-1">
 Total Sessions: ${courseLayout.scheduledSessions}<br>
 Total Canvases: ${courseLayout.totalCanvases}<br>
 Lesson Duration: ${courseLayout.lessonDuration.type}
 </div>
 `;

 const controls = document.createElement("div");
 controls.className = "flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600";
 controls.innerHTML = `
 <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-white" title="Previous Canvas" data-canvas-nav="prev">
 <span aria-hidden="true">←</span>
 </button>
 <span class="text-sm font-medium text-neutral-700" data-canvas-nav-current>
 Canvas <span data-canvas-nav-current-number>1</span> of ${courseLayout.totalCanvases}
 </span>
 <button class="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-300 text-neutral-600 hover:bg-white" title="Next Canvas" data-canvas-nav="next">
 <span aria-hidden="true">→</span>
 </button>
 `;

 // Add event listeners
 const prevBtn = controls.querySelector(
 "[data-canvas-nav=\"prev\"]",
 ) as HTMLElement;
 const nextBtn = controls.querySelector(
 "[data-canvas-nav=\"next\"]",
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
 thumbnail.className = "flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 bg-white p-3 text-sm text-neutral-700 transition hover:border-primary-300 hover:shadow-sm";
 thumbnail.dataset.canvasIndex = index.toString();

 // Create visual preview of canvas layout
 const preview = document.createElement("div");
 preview.className = "relative h-16 w-12 flex-shrink-0 rounded-md border border-neutral-200 bg-neutral-50";

 // Add miniature blocks
 canvas.blocks.forEach((block: any) => {
 const blockElement = document.createElement("div");
 blockElement.className = "rounded-sm bg-neutral-300/70";

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
 label.className = "flex flex-col gap-1";

 const canvasTypeName = this.getCanvasTypeName(
 canvas.sessionNumber,
 canvas.canvasNumber,
 );
 label.innerHTML = `
 <div class="text-xs font-semibold text-neutral-500">Session ${canvas.sessionNumber}</div>
 <div class="text-sm font-semibold text-neutral-900">${canvasTypeName}</div>
 <div class="text-xs text-neutral-500">Canvas ${canvas.canvasNumber}</div>
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
 this.tocContainer?.querySelector('[data-canvas-nav-current-number]');
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
 thumbnail.element.classList.remove("ring-2", "ring-primary-500", "bg-primary-50");
 thumbnail.element.setAttribute("aria-current", "false");
 });

 // Set new active canvas
 if (this.thumbnails[index]) {
 this.thumbnails[index].isActive = true;
 this.thumbnails[index].element.classList.add("ring-2", "ring-primary-500", "bg-primary-50");
 this.thumbnails[index].element.setAttribute("aria-current", "true");
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
