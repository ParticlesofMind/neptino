import { TemplateBlock, TemplateBlockType, BlockFieldConfig } from "./types.js";
import { TemplateConfigManager } from "./TemplateConfigManager.js";
import { TemplateBlockRenderer, TemplateRenderOptions } from "./TemplateBlockRenderer.js";
import { TEMPLATE_BLOCK_SEQUENCES, TEMPLATE_BODY_BLOCKS } from "./templateOptions.js";

export class TemplateRenderer {
  static displayTemplateBlocks(templateData: any): void {
    const configArea = document.getElementById('template-config-content');
    if (!configArea) {
      console.error('Template config content area not found');
      return;
    }

    // Handle both full template object and just template_data
    const actualData =
      this.ensureTemplateDataObject(templateData.template_data || templateData) ??
      { blocks: [], settings: {} };
    TemplateConfigManager.normalizeTemplateData(actualData);

    const blocks = actualData.blocks || [];
    const templateId = templateData.id;
    const fieldConfig = TemplateConfigManager.getBlockFieldConfiguration();

    const blockItems = blocks
      .filter((block: TemplateBlock) => block.type !== "body")
      .map((block: TemplateBlock) => {
        const fields = fieldConfig[block.type] || [];
        const rowsHtml = this.renderBlockConfigRows(templateId ?? null, block, fields);
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
      .join("");

    const blocksHtml = `
      <div class="template-blocks">
        ${blockItems}
      </div>
    `;

    configArea.innerHTML = blocksHtml;

    // Attach event listeners to all checkboxes for saving changes
    this.attachCheckboxListeners(templateId);

    // Initialize glossary item state for resources block
    const resourcesBlock = blocks.find((b: TemplateBlock) => b.type === "resources");
    if (resourcesBlock) {
      const glossaryEnabled = Boolean(resourcesBlock.config?.["include_glossary"]);
      this.toggleGlossaryItems(glossaryEnabled);
    }

    // Update template preview after displaying blocks
    this.updateTemplatePreview(templateData);
  }

  private static attachCheckboxListeners(templateId: string): void {
    const configArea = document.getElementById('template-config-content');
    if (!configArea) return;

    // Find all checkboxes in block config areas
    const checkboxes = configArea.querySelectorAll('.block-config input[type="checkbox"]');
    
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', async (e) => {
        const input = e.target as HTMLInputElement;
        const fieldLabel = input.closest('.field-label');
        const blockConfig = input.closest('.block-config');
        
        if (!fieldLabel || !blockConfig) return;
        
        const fieldName = fieldLabel.getAttribute('data-field');
        const blockType = blockConfig.getAttribute('data-block');
        
        if (!fieldName || !blockType) return;
        
        // Import dynamically to avoid circular dependency
        const { TemplateManager } = await import('./TemplateManager.js');
        await TemplateManager.updateTemplateField(templateId, blockType, fieldName, input.checked);
        
        console.log(`✅ Saved ${blockType}.${fieldName} = ${input.checked}`);
      });
    });
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

    const programBlock = sortedBlocks.find((b: TemplateBlock) => b.type === 'program');
    const competencyEnabled = programBlock?.config?.competency !== false;
    const renderOptions: TemplateRenderOptions = { competencyEnabled };

    // Separate header, footer, body, and body sub-blocks
    const headerBlock = sortedBlocks.find((b: TemplateBlock) => b.type === 'header');
    const footerBlock = sortedBlocks.find((b: TemplateBlock) => b.type === 'footer');
    const bodyBlock = sortedBlocks.find((b: TemplateBlock) => b.type === 'body');
    // Content blocks are body sub-blocks (program, resources, content, assignment, scoring)
    // The body block itself is not rendered as a visible block, only its sub-blocks
    const contentBlocks = sortedBlocks.filter((b: TemplateBlock) => 
      b.type !== 'header' && b.type !== 'footer' && b.type !== 'body'
    );

    // Render header
    const headerHtml = headerBlock
      ? `<div class="preview-block preview-block--${headerBlock.type}">
          <h4 class="preview-block__title">${headerBlock.type.charAt(0).toUpperCase() + headerBlock.type.slice(1)}</h4>
          ${TemplateBlockRenderer.renderBlockContent(headerBlock, TemplateConfigManager.getCheckedFields(headerBlock), renderOptions)}
        </div>`
      : '';

    // Render content blocks (scrollable middle section)
    const contentHtml = contentBlocks
      .map((block: TemplateBlock) => {
        const checkedFields = TemplateConfigManager.getCheckedFields(block);
        return `
<div class="preview-block preview-block--${block.type}">
<h4 class="preview-block__title">${block.type.charAt(0).toUpperCase() + block.type.slice(1)}</h4>
${TemplateBlockRenderer.renderBlockContent(block, checkedFields, renderOptions)}
</div>
`;
      })
      .join("");

    // Render footer
    const footerHtml = footerBlock
      ? `<div class="preview-block preview-block--${footerBlock.type}">
          <h4 class="preview-block__title">${footerBlock.type.charAt(0).toUpperCase() + footerBlock.type.slice(1)}</h4>
          ${TemplateBlockRenderer.renderBlockContent(footerBlock, TemplateConfigManager.getCheckedFields(footerBlock), renderOptions)}
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

    // Create a basic template structure to display with body sub-blocks
    const blockSequence = TEMPLATE_BLOCK_SEQUENCES.lesson;
    const defaultBlocks: TemplateBlock[] = [];
    let order = 1;

    blockSequence.forEach((blockType) => {
      defaultBlocks.push(this.createDefaultBlock(blockType, order));
      order++;
      
      // Add body sub-blocks after body block
      if (blockType === "body") {
        const bodyBlocks = TEMPLATE_BODY_BLOCKS.lesson ?? [];
        bodyBlocks.forEach((subBlockType) => {
          defaultBlocks.push(this.createDefaultBlock(subBlockType, order));
          order++;
        });
      }
    });

    const basicTemplate = {
      template_data: {
        name: "New Template",
        blocks: defaultBlocks,
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
    const glossarySelectors = [
      '.field-label[data-field="historical_figures"]',
      '.field-label[data-field="terminology"]',
      '.field-label[data-field="concepts"]',
    ];
    const glossaryItems = document.querySelectorAll(glossarySelectors.join(','));
    glossaryItems.forEach((item) => {
      const label = item as HTMLElement;
      const checkbox = label.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
      if (!checkbox) {
        return;
      }
      checkbox.disabled = !glossaryEnabled;
      if (!glossaryEnabled) {
        checkbox.checked = false;
      }
      label.classList.toggle('field-label--disabled', !glossaryEnabled);
    });
  }

  private static renderBlockConfigRows(templateId: string | null, block: TemplateBlock, overrideFields?: BlockFieldConfig[]): string {
    const fieldConfig = TemplateConfigManager.getBlockFieldConfiguration();
    const blockFields = (overrideFields ?? fieldConfig[block.type]) || [];
    if (!blockFields.length) {
      return "";
    }

    if (block.type === "resources") {
      return this.renderResourceRows(templateId, block, blockFields);
    }

    const hasHierarchy = blockFields.some((field) => typeof field.indentLevel === "number" && field.indentLevel > 0);
    if (hasHierarchy) {
      return this.renderHierarchicalRowsCompact(templateId, block, blockFields);
    }

    return this.renderCompactRows(templateId, block, blockFields);
  }

  private static renderCompactRows(templateId: string | null, block: TemplateBlock, fields: BlockFieldConfig[]): string {
    const simpleFields = fields.filter((field) => !field.separator && !field.mandatory);
    if (!simpleFields.length) {
      return "";
    }

    const rows: string[] = [];
    for (let i = 0; i < simpleFields.length; i += 3) {
      const rowFields = simpleFields.slice(i, i + 3);
      rows.push(`
        <div class="field-row field-row--compact">
          ${rowFields.map((field) => this.renderFieldCheckbox(templateId, block, field)).join("")}
        </div>
      `);
    }

    return rows.join("");
  }

  private static renderHierarchicalRowsCompact(templateId: string | null, block: TemplateBlock, fields: BlockFieldConfig[]): string {
    // Separate "Include Project" field to render it separately at the bottom
    const includeProjectField = fields.find(f => f.name === "include_project");
    const regularFields = fields.filter(f => f.name !== "include_project" && !f.separator && !f.mandatory);
    
    // Group regular fields by indent level
    const fieldsByIndent = new Map<number, BlockFieldConfig[]>();
    regularFields.forEach((field) => {
      const indent = field.indentLevel ?? 0;
      if (!fieldsByIndent.has(indent)) {
        fieldsByIndent.set(indent, []);
      }
      fieldsByIndent.get(indent)!.push(field);
    });

    // Render each indent level group with 3 items per row
    const rows: string[] = [];
    const sortedIndents = Array.from(fieldsByIndent.keys()).sort((a, b) => a - b);
    
    sortedIndents.forEach((indentLevel) => {
      const indentFields = fieldsByIndent.get(indentLevel)!;
      const indentClass = indentLevel ? ` field-row--indent-${indentLevel}` : "";
      
      for (let i = 0; i < indentFields.length; i += 3) {
        const rowFields = indentFields.slice(i, i + 3);
        rows.push(`
          <div class="field-row field-row--compact${indentClass}">
            ${rowFields.map((field) => this.renderFieldCheckbox(templateId, block, field)).join("")}
          </div>
        `);
      }
    });

    // Add "Include Project" in its own row at the bottom
    if (includeProjectField) {
      rows.push(`
        <div class="field-row field-row--full">
          ${this.renderFieldCheckbox(templateId, block, includeProjectField)}
        </div>
      `);
    }

    return rows.join("");
  }

  private static renderHierarchicalRow(templateId: string | null, block: TemplateBlock, field: BlockFieldConfig): string {
    const indentLevel = field.indentLevel ?? 0;
    const indentClass = indentLevel ? ` field-row--indent-${indentLevel}` : "";

    return `
      <div class="field-row field-row--hierarchy${indentClass}">
        ${this.renderFieldCheckbox(templateId, block, field)}
      </div>
    `;
  }

  private static renderResourceRows(templateId: string | null, block: TemplateBlock, fields: BlockFieldConfig[]): string {
    const byGroup = new Map<string, BlockFieldConfig[]>();
    fields.forEach((field) => {
      // Skip mandatory fields
      if (field.mandatory) return;
      
      const key = field.rowGroup ?? "resources-default";
      if (!byGroup.has(key)) {
        byGroup.set(key, []);
      }
      byGroup.get(key)!.push(field);
    });

    const rows: string[] = [];
    const renderGroup = (groupKey: string, className: string) => {
      const groupFields = byGroup.get(groupKey);
      if (!groupFields || !groupFields.length) {
        return;
      }
      rows.push(`
        <div class="field-row field-row--resource ${className}">
          ${groupFields.map((field) => this.renderFieldCheckbox(templateId, block, field)).join("")}
        </div>
      `);
      byGroup.delete(groupKey);
    };

    renderGroup("resources-main", "field-row--resource-main");
    
    // Render glossary toggle in its own row with separator styling (like Include Project)
    const glossaryToggleFields = byGroup.get("resources-glossary-toggle");
    if (glossaryToggleFields && glossaryToggleFields.length) {
      rows.push(`
        <div class="field-row field-row--full">
          ${glossaryToggleFields.map((field) => this.renderFieldCheckbox(templateId, block, field)).join("")}
        </div>
      `);
      byGroup.delete("resources-glossary-toggle");
    }
    
    renderGroup("resources-glossary-items", "field-row--resource-glossary");

    if (byGroup.size) {
      const remainingFields = Array.from(byGroup.values()).flat();
      rows.push(this.renderCompactRows(templateId, block, remainingFields));
    }

    return rows.join("");
  }

  private static renderFieldCheckbox(templateId: string | null, block: TemplateBlock, field: BlockFieldConfig): string {
    const glossaryItems = ["historical_figures", "terminology", "concepts"];
    const isGlossaryItem = glossaryItems.includes(field.name);
    const glossaryEnabled = Boolean(block.config?.["include_glossary"]);

    const shouldCheck = field.mandatory
      ? true
      : isGlossaryItem && !glossaryEnabled
      ? false
      : Boolean(block.config?.[field.name]);

    const shouldDisable = field.mandatory || (isGlossaryItem && !glossaryEnabled);

    let updateHandler = "";
    if (field.name === "include_glossary") {
      updateHandler = `onchange="TemplateRenderer.toggleGlossaryItems(this.checked)"`;
    }

    const labelClasses = ["field-label"];
    if (field.mandatory) {
      labelClasses.push("field-label--locked");
    }
    if (isGlossaryItem && !glossaryEnabled) {
      labelClasses.push("field-label--disabled");
    }

    const fieldId = this.buildFieldId(templateId, block, field);

    return `
      <label class="${labelClasses.join(" ")}" data-field="${field.name}">
        <input type="checkbox"
               id="${fieldId}"
               name="${field.name}"
               ${shouldCheck ? "checked" : ""}
               ${shouldDisable ? "disabled" : ""}
               ${updateHandler}>
        <span class="field-label__text">${field.label}</span>
      </label>
    `;
  }

  private static sanitizeForId(value: string | null | undefined): string {
    if (!value) {
      return "na";
    }
    return String(value).trim().replace(/[^a-zA-Z0-9_-]+/g, "-") || "na";
  }

  private static buildFieldId(templateId: string | null, block: TemplateBlock, field: BlockFieldConfig): string {
    const templatePart = this.sanitizeForId(templateId);
    const blockPart = this.sanitizeForId(block.id ?? block.type);
    const fieldPart = this.sanitizeForId(field.name);
    return `field-${templatePart}-${blockPart}-${fieldPart}`;
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

  private static ensureTemplateDataObject(raw: unknown): Record<string, unknown> | null {
    if (!raw) {
      return null;
    }

    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch (error) {
        console.warn("TemplateRenderer: failed to parse template data JSON", error);
        return null;
      }
    }

    if (typeof raw === "object" && !Array.isArray(raw)) {
      return raw as Record<string, unknown>;
    }

    return null;
  }
}
