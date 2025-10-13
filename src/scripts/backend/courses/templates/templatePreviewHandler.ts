export class TemplatePreviewHandler {
    private previewContainer: HTMLElement | null = null;

    constructor() {
        this.previewContainer = document.getElementById('template-preview-content');
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
 <h4 class="preview-block__title">Header</h4>
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 <td>[Lesson number (#)]</td>
 <td>[Lesson title]</td>
 <td>[Module title]</td>
 <td>[Course title]</td>
 <td>[Institution name]</td>
 <td>[Teacher name]</td>
 </tr>
 </tbody>
 </table>
 </div>
 `;
    }

    /**
    * Renders program block preview
    */
    private renderProgramBlock(_config: any): string {
        return `
 <div class="preview-block preview-block--program">
 <h4 class="preview-block__title">Program</h4>
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 <td>[Competence]</td>
 <td>[Topic]</td>
 <td>[Objective]</td>
 <td>[Task]</td>
 </tr>
 </tbody>
 </table>
 </div>
 `;
    }

    /**
    * Renders resources block preview
    */
    private renderResourcesBlock(_config: any): string {
        return `
 <div class="preview-block preview-block--resources">
 <h4 class="preview-block__title">Resources</h4>
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 <td>[Task]</td>
 <td>[Type]</td>
 <td>[Origin]</td>
 <td>[State]</td>
 <td>[Quality]</td>
 </tr>
 </tbody>
 </table>
 <h5 class="preview-block__subtitle">Glossary</h5>
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 <td>[Historical figures - URL]</td>
 <td>[Terminology - URL]</td>
 <td>[Concepts - URL]</td>
 </tr>
 </tbody>
 </table>
 </div>
 `;
    }

    /**
    * Renders content block preview
    */
    private renderContentBlock(_config: any): string {
        return `
 <div class="preview-block preview-block--content">
 <h4 class="preview-block__title">Content</h4>
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 <td>[Topic]</td>
 </tr>
 <tr>
 <td>[Objective]</td>
 </tr>
 <tr>
 <td>[Task]</td>
 </tr>
 <tr>
 <td>[Instruction area]</td>
 </tr>
 <tr>
 <td>[Student Area]</td>
 </tr>
 <tr>
 <td>[Teacher area]</td>
 </tr>
 </tbody>
 </table>
 </div>
 `;
    }

    /**
    * Renders assignment block preview
    */
    private renderAssignmentBlock(_config: any): string {
        return `
 <div class="preview-block preview-block--assignment">
 <h4 class="preview-block__title">Assignment</h4>
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 <td>[Topic]</td>
 </tr>
 <tr>
 <td>[Objective]</td>
 </tr>
 <tr>
 <td>[Task]</td>
 </tr>
 <tr>
 <td>[Instruction area]</td>
 </tr>
 <tr>
 <td>[Student Area]</td>
 </tr>
 <tr>
 <td>[Teacher area]</td>
 </tr>
 </tbody>
 </table>
 </div>
 `;
    }

    /**
    * Renders footer block preview
    */
    private renderFooterBlock(_config: any): string {
        return `
 <div class="preview-block preview-block--footer">
 <h4 class="preview-block__title">Footer</h4>
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 <td>[Copyright by Teacher name, year]</td>
 <td>[Page number]</td>
 </tr>
 </tbody>
 </table>
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
