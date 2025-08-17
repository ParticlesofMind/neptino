export class TemplatePreviewHandler {
 private previewContainer: HTMLElement | null = null;

 constructor() {
 this.previewContainer = document.querySelector('.template-preview__content');
 this.setupEventListeners();
 }

 /**
 * Sets up event listeners for template preview updates
 */
 private setupEventListeners(): void {
 document.addEventListener("templateConfigChanged", (e: any) => {
 this.updatePreview(e.detail.template, e.detail.activeBlocks);
 });
 }

 /**
 * Updates the template preview based on configuration
 */
 updatePreview(template: any, activeBlocks: string[]): void {
 if (!this.previewContainer) return;

 if (!template || !activeBlocks.length) {
 this.renderEmptyPreview();
 return;
 }

 const previewHtml = this.generatePreviewHtml(template, activeBlocks);
 this.previewContainer.innerHTML = previewHtml;
 }

 /**
 * Renders an empty preview state
 */
 private renderEmptyPreview(): void {
 if (!this.previewContainer) return;

 this.previewContainer.innerHTML = `
 <div class="preview-placeholder">
 <div class="">📋</div>
 <h4 class="">Template Preview</h4>
 <p class="">Configure your template blocks to see a preview here.</p>
 </div>
 `;
 }

 /**
 * Generates HTML for the template preview
 */
 private generatePreviewHtml(template: any, activeBlocks: string[]): string {
 const blocks = template.blocks || [];
 const sortedBlocks = blocks
 .filter((block: any) => activeBlocks.includes(block.type))
 .sort((a: any, b: any) => {
 const aIndex = activeBlocks.indexOf(a.type);
 const bIndex = activeBlocks.indexOf(b.type);
 return aIndex - bIndex;
 });

 const blocksHtml = sortedBlocks
 .map((block: any) => this.renderBlock(block))
 .join("");

 return blocksHtml;
 }

 /**
 * Renders a single block in the preview
 */
 private renderBlock(block: any): string {
 const config = block.config || {};

 switch (block.type) {
 case "header":
 return this.renderHeaderBlock(config);
 case "program":
 return this.renderProgramBlock(config);
 case "resources":
 return this.renderResourcesBlock(config);
 case "content":
 return this.renderContentBlock(config);
 case "assignment":
 return this.renderAssignmentBlock(config);
 case "footer":
 return this.renderFooterBlock(config);
 default:
 return `<div class="preview-block preview-block--unknown">Unknown block type: ${block.type}</div>`;
 }
 }

 /**
 * Renders header block preview
 */
 private renderHeaderBlock(_config: any): string {
 return `
 <div class="preview-block preview-block--header">
 <div class="preview-block__header">Header</div>
 <div class="preview-block__content">
 <table class="preview-table">
 <thead>
 <tr>
 <th>Field</th>
 <th>Content</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td>Lesson Number</td>
 <td>01</td>
 </tr>
 <tr>
 <td>Lesson Title</td>
 <td>Introduction to Course Topics</td>
 </tr>
 <tr>
 <td>Module Title</td>
 <td>Foundation Module</td>
 </tr>
 <tr>
 <td>Course Title</td>
 <td>Complete Course Name</td>
 </tr>
 <tr>
 <td>Institution Name</td>
 <td>Your Institution</td>
 </tr>
 <tr>
 <td>Teacher Name</td>
 <td>Instructor Name</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 `;
 }

 /**
 * Renders program block preview
 */
 private renderProgramBlock(_config: any): string {
 return `
 <div class="preview-block preview-block--program">
 <div class="preview-block__header">Program</div>
 <div class="preview-block__content">
 <table class="preview-table">
 <thead>
 <tr>
 <th>Component</th>
 <th>Details</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td>Competence</td>
 <td>Core learning competency for this lesson</td>
 </tr>
 <tr>
 <td>Topic</td>
 <td>Main topic or subject area</td>
 </tr>
 <tr>
 <td>Objective</td>
 <td>Specific learning objective to achieve</td>
 </tr>
 <tr>
 <td>Task</td>
 <td>Primary task or activity for students</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 `;
 }

 /**
 * Renders resources block preview
 */
 private renderResourcesBlock(_config: any): string {
 return `
 <div class="preview-block preview-block--resources">
 <div class="preview-block__header">Resources</div>
 <div class="preview-block__content">
 <table class="preview-table">
 <thead>
 <tr>
 <th>Resource Type</th>
 <th>Description</th>
 </tr>
 </thead>
 <tbody>
 <tr>
 <td>Task</td>
 <td>Learning task or exercise</td>
 </tr>
 <tr>
 <td>Type</td>
 <td>Resource category (reading, video, activity)</td>
 </tr>
 <tr>
 <td>Origin</td>
 <td>Source or origin of the resource</td>
 </tr>
 <tr>
 <td>State</td>
 <td>Current state (available, pending, archived)</td>
 </tr>
 <tr>
 <td>Quality</td>
 <td>Quality rating or review status</td>
 </tr>
 <tr>
 <td>Include Glossary</td>
 <td>Whether to include terminology glossary</td>
 </tr>
 <tr>
 <td>Historical Figures</td>
 <td>Important people related to topic</td>
 </tr>
 <tr>
 <td>Terminology</td>
 <td>Key terms and definitions</td>
 </tr>
 <tr>
 <td>Concepts</td>
 <td>Core concepts and ideas</td>
 </tr>
 </tbody>
 </table>
 </div>
 </div>
 `;
 }

 /**
 * Renders content block preview
 */
 private renderContentBlock(config: any): string {
 const editor = config.editor || "rich-text";
 const allowMedia = config.allowMedia !== false;
 const allowTables = config.allowTables !== false;

 return `
 <div class="preview-block preview-block--content">
 <div class="">📝 Content</div>
 <div class="">
 <div class="preview-section">
 <div class="preview-editor">Editor: ${editor}</div>
 ${allowMedia ? '<div class="preview-feature">✓ Media uploads enabled</div>' : ""}
 ${allowTables ? '<div class="preview-feature">✓ Tables enabled</div>' : ""}
 <div class="preview-placeholder">Course content will be displayed here...</div>
 </div>
 </div>
 </div>
 `;
 }

 /**
 * Renders assignment block preview
 */
 private renderAssignmentBlock(config: any): string {
 const allowSubmissions = config.allowSubmissions !== false;
 const requireDueDate = config.requireDueDate !== false;
 const enableGrading = config.enableGrading !== false;
 const maxSubmissions = config.maxSubmissions || 1;

 return `
 <div class="preview-block preview-block--assignment">
 <div class="">✅ Assignment</div>
 <div class="">
 <div class="preview-section">
 ${allowSubmissions ? `<div class="preview-feature">✓ Student submissions (max: ${maxSubmissions})</div>` : ""}
 ${requireDueDate ? '<div class="preview-feature">✓ Due date required</div>' : ""}
 ${enableGrading ? '<div class="preview-feature">✓ Grading enabled</div>' : ""}
 <div class="preview-placeholder">Assignment details will be displayed here...</div>
 </div>
 </div>
 </div>
 `;
 }

 /**
 * Renders footer block preview
 */
 private renderFooterBlock(config: any): string {
 const showCredits = config.showCredits !== false;
 const showDate = config.showDate !== false;
 const showContact = config.showContact === true;

 return `
 <div class="preview-block preview-block--footer">
 <div class="">🔖 Footer</div>
 <div class="">
 <div class="preview-section">
 ${showCredits ? '<div class="preview-feature">✓ Credits displayed</div>' : ""}
 ${showDate ? '<div class="preview-feature">✓ Creation date displayed</div>' : ""}
 ${showContact ? '<div class="preview-feature">✓ Contact information displayed</div>' : ""}
 </div>
 </div>
 </div>
 `;
 }

 /**
 * Exports the current template configuration
 */
 exportTemplate(): void {
 // This would open an export modal or trigger a download
 // Implementation for template export functionality
 }
}

// Create global instance
declare global {
 interface Window {
 templatePreviewHandler: TemplatePreviewHandler;
 }
}

window.templatePreviewHandler = new TemplatePreviewHandler();
