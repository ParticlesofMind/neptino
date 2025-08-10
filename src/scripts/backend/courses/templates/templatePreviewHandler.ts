export class TemplatePreviewHandler {
  private previewContainer: HTMLElement | null = null;

  constructor() {
    this.previewContainer = document.querySelector('.preview-container');
    this.setupEventListeners();
  }

  /**
   * Sets up event listeners for template preview updates
   */
  private setupEventListeners(): void {
    document.addEventListener('templateConfigChanged', (e: any) => {
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
      <div class="preview-empty">
        <div class="preview-empty__icon">📋</div>
        <h4 class="preview-empty__title">Template Preview</h4>
        <p class="preview-empty__text">Configure your template blocks to see a preview here.</p>
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

    const blocksHtml = sortedBlocks.map((block: any) => this.renderBlock(block)).join('');

    return `
      <div class="template-preview-content">
        <div class="preview-header">
          <h4 class="preview-title">Template Preview</h4>
          <div class="preview-actions">
            <button type="button" class="btn btn--small btn--secondary" onclick="templatePreviewHandler.exportTemplate()">
              Export
            </button>
          </div>
        </div>
        <div class="preview-body">
          ${blocksHtml}
        </div>
      </div>
    `;
  }

  /**
   * Renders a single block in the preview
   */
  private renderBlock(block: any): string {
    const config = block.config || {};
    
    switch (block.type) {
      case 'header':
        return this.renderHeaderBlock(config);
      case 'program':
        return this.renderProgramBlock(config);
      case 'resources':
        return this.renderResourcesBlock(config);
      case 'content':
        return this.renderContentBlock(config);
      case 'assignment':
        return this.renderAssignmentBlock(config);
      case 'footer':
        return this.renderFooterBlock(config);
      default:
        return `<div class="preview-block preview-block--unknown">Unknown block type: ${block.type}</div>`;
    }
  }

  /**
   * Renders header block preview
   */
  private renderHeaderBlock(config: any): string {
    const backgroundColor = config.backgroundColor || '#ffffff';
    const textColor = config.textColor || '#333333';
    const showTitle = config.showTitle !== false;
    const showSubtitle = config.showSubtitle !== false;

    return `
      <div class="preview-block preview-block--header" style="background-color: ${backgroundColor}; color: ${textColor};">
        <div class="preview-block__label">📋 Header</div>
        <div class="preview-block__content">
          ${showTitle ? '<h1 class="preview-title">Course Title</h1>' : ''}
          ${showSubtitle ? '<h2 class="preview-subtitle">Course Subtitle</h2>' : ''}
        </div>
      </div>
    `;
  }

  /**
   * Renders program block preview
   */
  private renderProgramBlock(config: any): string {
    const showObjectives = config.showObjectives !== false;
    const showOutcomes = config.showOutcomes !== false;
    const showPrerequisites = config.showPrerequisites === true;

    return `
      <div class="preview-block preview-block--program">
        <div class="preview-block__label">🎯 Program</div>
        <div class="preview-block__content">
          ${showObjectives ? '<div class="preview-section"><strong>Learning Objectives:</strong> <span class="preview-placeholder">Objectives will be displayed here</span></div>' : ''}
          ${showOutcomes ? '<div class="preview-section"><strong>Learning Outcomes:</strong> <span class="preview-placeholder">Outcomes will be displayed here</span></div>' : ''}
          ${showPrerequisites ? '<div class="preview-section"><strong>Prerequisites:</strong> <span class="preview-placeholder">Prerequisites will be displayed here</span></div>' : ''}
        </div>
      </div>
    `;
  }

  /**
   * Renders resources block preview
   */
  private renderResourcesBlock(config: any): string {
    const allowFiles = config.allowFiles !== false;
    const allowLinks = config.allowLinks !== false;
    const allowVideos = config.allowVideos !== false;
    const maxFiles = config.maxFiles || 10;

    return `
      <div class="preview-block preview-block--resources">
        <div class="preview-block__label">📚 Resources</div>
        <div class="preview-block__content">
          <div class="preview-section">
            ${allowFiles ? `<div class="preview-resource">📎 File uploads (max: ${maxFiles})</div>` : ''}
            ${allowLinks ? '<div class="preview-resource">🔗 External links</div>' : ''}
            ${allowVideos ? '<div class="preview-resource">🎥 Video embeds</div>' : ''}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Renders content block preview
   */
  private renderContentBlock(config: any): string {
    const editor = config.editor || 'rich-text';
    const allowMedia = config.allowMedia !== false;
    const allowTables = config.allowTables !== false;

    return `
      <div class="preview-block preview-block--content">
        <div class="preview-block__label">📝 Content</div>
        <div class="preview-block__content">
          <div class="preview-section">
            <div class="preview-editor">Editor: ${editor}</div>
            ${allowMedia ? '<div class="preview-feature">✓ Media uploads enabled</div>' : ''}
            ${allowTables ? '<div class="preview-feature">✓ Tables enabled</div>' : ''}
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
        <div class="preview-block__label">✅ Assignment</div>
        <div class="preview-block__content">
          <div class="preview-section">
            ${allowSubmissions ? `<div class="preview-feature">✓ Student submissions (max: ${maxSubmissions})</div>` : ''}
            ${requireDueDate ? '<div class="preview-feature">✓ Due date required</div>' : ''}
            ${enableGrading ? '<div class="preview-feature">✓ Grading enabled</div>' : ''}
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
        <div class="preview-block__label">🔖 Footer</div>
        <div class="preview-block__content">
          <div class="preview-section">
            ${showCredits ? '<div class="preview-feature">✓ Credits displayed</div>' : ''}
            ${showDate ? '<div class="preview-feature">✓ Creation date displayed</div>' : ''}
            ${showContact ? '<div class="preview-feature">✓ Contact information displayed</div>' : ''}
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
    console.log('Exporting template...');
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
