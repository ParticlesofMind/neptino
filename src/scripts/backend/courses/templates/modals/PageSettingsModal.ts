/**
 * Page Settings Modal
 * Handles page settings modal creation, display, and user interactions
 * Single Responsibility: Page settings modal management only
 */

export class PageSettingsModal {
 private currentModal: HTMLElement | null = null;

 /**
 * Show page settings modal for a specific page
 */
 show(page: any): Promise<any> {
 return new Promise((resolve, reject) => {
 const modal = this.createModal(page);
 document.body.appendChild(modal);
 this.currentModal = modal;

 // Focus on page name input
 const nameInput = modal.querySelector(
 "#page-name-input",
 ) as HTMLInputElement;
 if (nameInput) {
 nameInput.focus();
 nameInput.select();
 }

 // Set up promise resolution
 (modal as any).__resolve = resolve;
 (modal as any).__reject = reject;
 });
 }

 /**
 * Create page settings modal
 */
 private createModal(page: any): HTMLElement {
 const modal = document.createElement("div");
 modal.className = "page-settings-modal fixed inset-0 z-50 flex items-center justify-center p-4";
 modal.innerHTML = `
 <div class="page-settings-modal__backdrop absolute inset-0 bg-black/40" aria-hidden="true"></div>
 <div class="page-settings-modal__panel relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
 <div class="flex items-start justify-between">
 <h3 class="text-xl font-semibold text-neutral-900">Page Settings</h3>
 <button class="page-settings-modal__close inline-flex h-8 w-8 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100" aria-label="Close">&times;</button>
 </div>
 <div class="mt-6 space-y-4">
 <div class="form-group">
 <label class="text-sm font-medium text-neutral-700" for="page-name-input">Page Name</label>
 <input type="text" id="page-name-input" value="${page.name}" class="mt-2 w-full rounded-md border-0 py-2 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600">
 </div>
 <div class="form-group">
 <label class="text-sm font-medium text-neutral-700" for="page-description-input">Description (optional)</label>
 <textarea id="page-description-input" class="mt-2 w-full rounded-md border-0 py-2 text-sm text-neutral-900 shadow-sm ring-1 ring-inset ring-neutral-300 focus:ring-2 focus:ring-inset focus:ring-primary-600" rows="3" placeholder="Page description...">${page.description || ""}</textarea>
 </div>
 </div>
 <div class="mt-8 flex justify-end gap-3">
 <button class="page-settings-modal__cancel inline-flex items-center justify-center rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm hover:bg-neutral-50">Cancel</button>
 <button class="page-settings-modal__save inline-flex items-center justify-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primary-700">Save Changes</button>
 </div>
 </div>
 `;

 this.bindModalEvents(modal, page);
 return modal;
 }

 /**
 * Bind modal events
 */
 private bindModalEvents(modal: HTMLElement, page: any): void {
 const resolve = (modal as any).__resolve;
 const reject = (modal as any).__reject;

 // Close button
 const closeBtn = modal.querySelector(".page-settings-modal__close");
 if (closeBtn) {
 closeBtn.addEventListener("click", () => {
 this.close();
 reject(new Error("Modal cancelled"));
 });
 }

 // Cancel button
 const cancelBtn = modal.querySelector(".page-settings-modal__cancel");
 if (cancelBtn) {
 cancelBtn.addEventListener("click", () => {
 this.close();
 reject(new Error("Modal cancelled"));
 });
 }

 // Save button
 const saveBtn = modal.querySelector(".page-settings-modal__save");
 if (saveBtn) {
 saveBtn.addEventListener("click", () => {
 const result = this.collectFormData(modal, page);
 if (result) {
 this.close();
 resolve(result);
 }
 });
 }

 // Backdrop click
 const backdrop = modal.querySelector(
 ".page-settings-modal__backdrop",
 );
 if (backdrop) {
 backdrop.addEventListener("click", () => {
 this.close();
 reject(new Error("Modal cancelled"));
 });
 }

 // Escape key
 const handleEscape = (event: KeyboardEvent) => {
 if (event.key === "Escape") {
 this.close();
 reject(new Error("Modal cancelled"));
 document.removeEventListener("keydown", handleEscape);
 }
 };
 document.addEventListener("keydown", handleEscape);
 }

 /**
 * Collect form data from modal
 */
 private collectFormData(modal: HTMLElement, page: any): any | null {
 const nameInput = modal.querySelector(
 "#page-name-input",
 ) as HTMLInputElement;
 const descriptionInput = modal.querySelector(
 "#page-description-input",
 ) as HTMLTextAreaElement;

 if (!nameInput || !nameInput.value.trim()) {
 alert("Page name is required");
 nameInput?.focus();
 return null;
 }

 return {
 ...page,
 name: nameInput.value.trim(),
 description: descriptionInput?.value.trim() || "",
 };
 }

 /**
 * Close modal
 */
 close(): void {
 if (this.currentModal) {
 this.currentModal.remove();
 this.currentModal = null;
 }
 }

 /**
 * Check if modal is open
 */
 isOpen(): boolean {
 return this.currentModal !== null;
 }

 /**
 * Cleanup
 */
 destroy(): void {
 this.close();
 }
}
