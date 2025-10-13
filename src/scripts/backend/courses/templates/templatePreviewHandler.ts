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
            case "scoring":
                return this.renderScoringBlock(config);
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
     private renderProgramBlock(config: any): string {
        return `
 <div class="preview-block preview-block--program">
 <h4 class="preview-block__title">Program</h4>
 <table class="lesson-plan-table lesson-plan-table--program">
 <tbody>
 <tr>
 <td>[Competence]</td>
 <td>[Topic]</td>
 <td>[Objective]</td>
 <td>[Task]</td>
 <td>[Method]</td>
 <td>[Social form]</td>
 <td>[Time]</td>
 </tr>
 </tbody>
 </table>
 ${config?.include_project ? this.renderProjectSection("Project") : ""}
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
    private renderContentBlock(config: any): string {
        return `
 <div class="preview-block preview-block--content">
 <h4 class="preview-block__title">Content</h4>
 ${this.renderNestedHierarchy()}
 ${config?.include_project ? this.renderProjectSection("Project") : ""}
 </div>
 `;
    }

    /**
    * Renders assignment block preview
    */
    private renderAssignmentBlock(config: any): string {
        return `
 <div class="preview-block preview-block--assignment">
 <h4 class="preview-block__title">Assignment</h4>
 ${this.renderNestedHierarchy()}
 ${config?.include_project ? this.renderProjectSection("Project Assignment") : ""}
 </div>
 `;
    }

    /**
    * Renders scoring block preview
    */
    private renderScoringBlock(_config: any): string {
        return `
 <div class="preview-block preview-block--scoring">
 <h4 class="preview-block__title">Scoring</h4>
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 <td>[Criteria]</td>
 <td>[Max points]</td>
 <td>[Passing threshold]</td>
 <td>[Feedback guidelines]</td>
 <td>[Rubric link]</td>
 </tr>
 </tbody>
 </table>
 </div>
 `;
    }

    private renderNestedHierarchy(prefix = ""): string {
          const label = (text: string): string => `[${prefix ? `${prefix} ${text}` : text}]`;

          return `
 <table class="lesson-plan-table lesson-plan-table--hierarchy">
 <tbody>
 <tr>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--primary">${label("Competence")}</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--time">[Time]</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--method"></td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--social"></td>
 </tr>
 <tr>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--primary lesson-plan-table__cell--indent-1">${label("Topic")}</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--time">[Time]</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--method"></td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--social"></td>
 </tr>
 <tr>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--primary lesson-plan-table__cell--indent-2">${label("Objective")}</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--time">[Time]</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--method"></td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--social"></td>
 </tr>
 <tr>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--primary lesson-plan-table__cell--indent-3">${label("Task")}</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--time">[Time]</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--method"></td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--social"></td>
 </tr>
 <tr>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--primary lesson-plan-table__cell--indent-4">${label("Instruction Area")}</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--time"></td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--method">[Method]</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--social">[Social form]</td>
 </tr>
 <tr>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--primary lesson-plan-table__cell--indent-4">${label("Student Area")}</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--time"></td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--method">[Method]</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--social">[Social form]</td>
 </tr>
 <tr>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--primary lesson-plan-table__cell--indent-4">${label("Teacher Area")}</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--time"></td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--method">[Method]</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--social">[Social form]</td>
 </tr>
 </tbody>
 </table>
 `;
     }

    private renderProjectSection(title: string): string {
        const mainSection = this.renderNestedHierarchy("Project");
          return `
 <h5 class="preview-block__subtitle">${title}</h5>
 ${mainSection}
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
