import { TemplateBlock, TemplateBlockType, BlockFieldConfig } from "./types.js";
import { TemplateConfigManager } from "./TemplateConfigManager.js";
import { TemplateBlockRenderer } from "./TemplateBlockRenderer.js";
import { TEMPLATE_BLOCK_SEQUENCES } from "./templateOptions.js";

export class TemplateRenderer {
  static displayTemplateBlocks(templateData: any): void {
    const configArea = document.getElementById('template-config-content');
    if (!configArea) {
      console.error('Template config content area not found');
      return;
    }

    // Handle both full template object and just template_data
    const actualData = templateData.template_data || templateData;
    TemplateConfigManager.normalizeTemplateData(actualData);

    const blocks = actualData.blocks || [];
    const templateId = templateData.id;
    const fieldConfig = TemplateConfigManager.getBlockFieldConfiguration();

    const blocksHtml = `
      <div class="template-blocks">
        ${blocks
          .map((block: TemplateBlock) => {
            const fields = fieldConfig[block.type] || [];
            const rowsHtml = this.renderBlockConfigRows(templateId, block, fields);
            const title = block.type.charAt(0).toUpperCase() + block.type.slice(1);

            return `
              <div class="block-config" data-block="${block.type}" data-template-id="${templateId}">
                <h4 class="block-config__title">${title}</h4>
                <div class="block-config__fields">
                  ${rowsHtml}
                </div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    configArea.innerHTML = blocksHtml;

    // Initialize glossary item state for resources block
    const resourcesBlock = blocks.find((b: TemplateBlock) => b.type === "resources");
    if (resourcesBlock) {
      const glossaryEnabled = Boolean(resourcesBlock.config?.["include_glossary"]);
      this.toggleGlossaryItems(glossaryEnabled);
    }

    // Update template preview after displaying blocks
    this.updateTemplatePreview(templateData);
  }

  static updateTemplatePreview(templateData?: any): void {
    const previewContainer = document.getElementById('template-preview-content');
    if (!previewContainer) {
      console.error('Template preview content area not found');
      return;
    }

    // Handle both full template object and just template_data
    const actualData = templateData?.template_data || templateData;
    if (!actualData || !actualData.blocks) {
      previewContainer.innerHTML = `
<div class="preview-placeholder">
<h4 class="">No Template Selected</h4>
<p class="">Create a new template or select an existing one to see the preview here.</p>
</div>
`;
      return;
    }

    const blocks = actualData.blocks || [];

    // Sort blocks by order and render them
    const sortedBlocks = blocks.sort(
      (a: TemplateBlock, b: TemplateBlock) => a.order - b.order,
    );

    // Separate header, footer, and content blocks
    const headerBlock = sortedBlocks.find((b: TemplateBlock) => b.type === 'header');
    const footerBlock = sortedBlocks.find((b: TemplateBlock) => b.type === 'footer');
    const contentBlocks = sortedBlocks.filter((b: TemplateBlock) => b.type !== 'header' && b.type !== 'footer');

    // Render header
    const headerHtml = headerBlock
      ? `<div class="preview-block preview-block--${headerBlock.type}">
          <h4 class="preview-block__title">${headerBlock.type.charAt(0).toUpperCase() + headerBlock.type.slice(1)}</h4>
          ${TemplateBlockRenderer.renderBlockContent(headerBlock, TemplateConfigManager.getCheckedFields(headerBlock))}
        </div>`
      : '';

    // Render content blocks (scrollable middle section)
    const contentHtml = contentBlocks
      .map((block: TemplateBlock) => {
        const checkedFields = TemplateConfigManager.getCheckedFields(block);
        return `
<div class="preview-block preview-block--${block.type}">
<h4 class="preview-block__title">${block.type.charAt(0).toUpperCase() + block.type.slice(1)}</h4>
${TemplateBlockRenderer.renderBlockContent(block, checkedFields)}
</div>
`;
      })
      .join("");

    // Render footer
    const footerHtml = footerBlock
      ? `<div class="preview-block preview-block--${footerBlock.type}">
          <h4 class="preview-block__title">${footerBlock.type.charAt(0).toUpperCase() + footerBlock.type.slice(1)}</h4>
          ${TemplateBlockRenderer.renderBlockContent(footerBlock, TemplateConfigManager.getCheckedFields(footerBlock))}
        </div>`
      : '';

    // Build canvas-style layout
    previewContainer.innerHTML = `
      <div class="template-canvas-sheet">
        ${headerHtml}
        <div class="template-canvas-content">
          ${contentHtml}
        </div>
        ${footerHtml}
      </div>
    `;
  }

  static displayTemplateList(templates: any[]): void {
    const listContainer = document.getElementById('template-list-content');
    if (!listContainer) {
      console.error('Template list content area not found');
      return;
    }

    if (!templates.length) {
      listContainer.innerHTML = `
        <div class="empty-state">
          <h4>No Templates Found</h4>
          <p>Create your first template to get started.</p>
        </div>
      `;
      return;
    }

    const templatesHtml = templates
      .map((template) => `
        <div class="template-item" data-template-id="${template.id}">
          <h4 class="template-item__title">${template.template_data?.name || 'Unnamed Template'}</h4>
          <p class="template-item__description">${template.template_description || 'No description'}</p>
          <div class="template-item__meta">
            <span class="template-item__type">${template.template_type}</span>
            <span class="template-item__date">${new Date(template.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      `)
      .join('');

    listContainer.innerHTML = templatesHtml;
  }

  static initializeEmptyTemplate(): void {
    // Clear any existing configuration forms
    const forms = document.querySelectorAll('form');
    forms.forEach((form) => {
      (form as HTMLFormElement).reset();
    });

    // Create a basic template structure to display
    const basicTemplate = {
      template_data: {
        name: "New Template",
        blocks: TEMPLATE_BLOCK_SEQUENCES.lesson.map((blockType, index) =>
          this.createDefaultBlock(blockType, index + 1),
        ),
      },
    };

    // Display the template blocks and preview
    this.displayTemplateBlocks(basicTemplate);
    this.updateTemplatePreview(basicTemplate);
  }

  static clearTemplateState(): void {
    const previewContainer = document.getElementById('template-preview-content');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="preview-placeholder">
          <h4>No Template Selected</h4>
          <p>Template preview will appear here when you load a template...</p>
        </div>
      `;
    }
  }

  static toggleGlossaryItems(glossaryEnabled: boolean): void {
    const glossaryItems = document.querySelectorAll('[data-field="historical_figures"], [data-field="terminology"], [data-field="concepts"]');
    glossaryItems.forEach((item) => {
      const checkbox = item as HTMLInputElement;
      checkbox.disabled = !glossaryEnabled;
      if (!glossaryEnabled) {
        checkbox.checked = false;
      }
    });
  }

  private static renderBlockConfigRows(templateId: string, block: TemplateBlock, fields: BlockFieldConfig[]): string {
    const fieldConfig = TemplateConfigManager.getBlockFieldConfiguration();
    const blockFields = fieldConfig[block.type] || [];
    
    return blockFields
      .map((field) => this.renderFieldCheckbox(templateId, block, field))
      .join('');
  }

  private static renderFieldCheckbox(templateId: string, block: TemplateBlock, field: BlockFieldConfig): string {
    const isChecked = field.mandatory ? true : Boolean(block.config?.[field.name]);
    const disabledAttr = field.mandatory ? " checked disabled" : isChecked ? " checked" : "";
    
    // Check if this is a glossary item
    const glossaryItems = ["historical_figures", "terminology", "concepts"];
    const isGlossaryItem = glossaryItems.includes(field.name);
    const glossaryEnabled = Boolean(block.config?.["include_glossary"]);
    
    // Only call toggleGlossaryItems for the "include_glossary" field itself
    let updateHandler = "";
    if (field.name === "include_glossary") {
      updateHandler = `onchange="TemplateRenderer.toggleGlossaryItems(this.checked)"`;
    }

    return `
      <div class="field-row" data-field="${field.name}">
        <label class="field-label">
          <input type="checkbox" 
                 name="${field.name}" 
                 ${disabledAttr}
                 ${updateHandler}
                 ${isGlossaryItem && !glossaryEnabled ? 'disabled' : ''}>
          <span class="field-label__text">${field.label}</span>
          ${field.mandatory ? '<span class="field-label__required">*</span>' : ''}
        </label>
      </div>
    `;
  }

  private static createDefaultBlock(blockType: TemplateBlockType, order: number): TemplateBlock {
    return {
      id: `${blockType}-${order}`,
      type: blockType,
      order,
      config: this.buildDefaultBlockConfig(blockType),
      content: `<div class="${blockType}-section">{{${blockType}}}</div>`,
    };
  }

  private static buildDefaultBlockConfig(blockType: TemplateBlockType): Record<string, boolean> {
    const fields = TemplateConfigManager.getBlockFieldConfiguration()[blockType] || [];
    return fields.reduce<Record<string, boolean>>((acc, field) => {
      if (field.separator) {
        return acc;
      }
      acc[field.name] = field.mandatory ? true : false;
      return acc;
    }, {});
  }
}
