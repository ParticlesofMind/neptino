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
 modal
 modal.innerHTML = `
 <div class=""></div>
 <div class="">
 <div class="">
 <h3>Page Settings</h3>
 <button class="" aria-label="Close">&times;</button>
 </div>
 <div class="">
 <div class="form-group">
 <label for="page-name-input">Page Name</label>
 <input type="text" id="page-name-input" value="${page.name}" class="form-control">
 </div>
 <div class="form-group">
 <label for="page-description-input">Description (optional)</label>
 <textarea id="page-description-input" class="form-control" rows="3" placeholder="Page description...">${page.description || ""}</textarea>
 </div>
 </div>
 <div class="">
 <button class="button button--secondary modal-cancel">Cancel</button>
 <button class="button button--primary modal-save">Save Changes</button>
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
 const closeBtn = modal.querySelector('element');
 if (closeBtn) {
 closeBtn.addEventListener("click", () => {
 this.close();
 reject(new Error("Modal cancelled"));
 });
 }

 // Cancel button
 const cancelBtn = modal.querySelector('element');
 if (cancelBtn) {
 cancelBtn.addEventListener("click", () => {
 this.close();
 reject(new Error("Modal cancelled"));
 });
 }

 // Save button
 const saveBtn = modal.querySelector('element');
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
 const backdrop = modal.querySelector('element');
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
