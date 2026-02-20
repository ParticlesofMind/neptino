import { TemplateBlock, TemplateBlockType, BlockFieldConfig, TemplateType } from "./types.js";
import { TemplateConfigManager } from "./TemplateConfigManager.js";
import { TemplateBlockRenderer, TemplateRenderOptions } from "./TemplateBlockRenderer.js";
import { TEMPLATE_BLOCK_SEQUENCES, TEMPLATE_BODY_BLOCKS } from "./templateOptions.js";

export class TemplateRenderer {
  private static readonly LESSON_BLOCK_SEQUENCE: TemplateBlockType[] = [
    "header",
    "program",
    "resources",
    "content",
    "assignment",
    "footer",
  ];

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

    const blocks = this.getRenderableBlocks(actualData, templateData);
    actualData.blocks = blocks;
    const templateId = templateData.id;
    const fieldConfig = TemplateConfigManager.getBlockFieldConfiguration();

    const blockItems = blocks
      .filter((block: TemplateBlock) => block.type !== "body")
      .map((block: TemplateBlock) => {
        const fields = fieldConfig[block.type] || [];
        const rowsHtml = this.renderBlockConfigRows(templateId ?? null, block, fields);
        const title = block.type.charAt(0).toUpperCase() + block.type.slice(1);

        return `
              <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm" data-block-config data-block="${block.type}" data-template-id="${templateId}">
                <h4 class="text-base font-semibold text-neutral-900" data-block-title>${title}</h4>
                <div class="mt-3 grid gap-2" data-block-fields>
                  ${rowsHtml}
                </div>
              </div>
            `;
      })
      .join("");

    const blocksHtml = `
      <div class="space-y-4" data-template-blocks>
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
    const checkboxes = configArea.querySelectorAll('[data-block-config] input[type="checkbox"]');
    
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', async (e) => {
        const input = e.target as HTMLInputElement;
        const fieldLabel = input.closest('[data-field-label]');
        const blockConfig = input.closest('[data-block-config]');
        
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
    <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
    <h4 class="text-base font-semibold text-neutral-800">No Template Selected</h4>
    <p class="mt-2 text-sm text-neutral-500">Create a new template or select an existing one to see the preview here.</p>
    </div>
    `;
      return;
    }

    const blocks = this.getRenderableBlocks(actualData, templateData);
    actualData.blocks = blocks;

    // Sort blocks by order and render them
    const sortedBlocks = [...blocks].sort(
      (a: TemplateBlock, b: TemplateBlock) => a.order - b.order,
    );

    const programBlock = sortedBlocks.find((b: TemplateBlock) => b.type === 'program');
    const competencyEnabled = programBlock?.config?.competency !== false;
    const renderOptions: TemplateRenderOptions = { competencyEnabled };

    const sectionLabels: Partial<Record<TemplateBlockType, string>> = {
      header: "Lesson Header",
      program: "Program",
      resources: "Resources",
      content: "Content",
      assignment: "Assignment",
      footer: "Lesson Footer",
    };

    const lessonSections = this.LESSON_BLOCK_SEQUENCE
      .map((type) => sortedBlocks.find((block) => block.type === type))
      .filter((block): block is TemplateBlock => Boolean(block))
      .map((block) => {
        const checkedFields = TemplateConfigManager.getCheckedFields(block);
        const title = sectionLabels[block.type] ?? (block.type.charAt(0).toUpperCase() + block.type.slice(1));

        return `
          <section class="rounded-lg border border-neutral-200 bg-white p-4" data-preview-block="${block.type}">
            <h4 class="mb-3 text-xs font-semibold uppercase tracking-wide text-neutral-500">${title}</h4>
            ${TemplateBlockRenderer.renderBlockContent(block, checkedFields, renderOptions)}
          </section>
        `;
      })
      .join("");

    // Build lesson-sheet layout
    previewContainer.innerHTML = `
      <div class="mx-auto w-full max-w-6xl rounded-2xl border border-neutral-200 bg-neutral-50 p-4 sm:p-6" data-template-preview-sheet>
        <div class="space-y-4" data-template-preview-body>
          ${lessonSections}
        </div>
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
        <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
          <h4 class="text-base font-semibold text-neutral-800">No Templates Found</h4>
          <p class="mt-2 text-sm text-neutral-500">Create your first template to get started.</p>
        </div>
      `;
      return;
    }

    const templatesHtml = templates
      .map((template) => `
        <div class="rounded-lg border border-neutral-200 bg-white p-4 shadow-sm" data-template-item data-template-id="${template.id}">
          <h4 class="text-sm font-semibold text-neutral-900">${template.template_data?.name || 'Unnamed Template'}</h4>
          <p class="mt-1 text-xs text-neutral-600">${template.template_description || 'No description'}</p>
          <div class="mt-2 flex flex-wrap gap-2 text-xs text-neutral-500">
            <span>${template.template_type}</span>
            <span>${new Date(template.created_at).toLocaleDateString()}</span>
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
        <div class="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-6 text-center">
          <h4 class="text-base font-semibold text-neutral-800">No Template Selected</h4>
          <p class="mt-2 text-sm text-neutral-500">Template preview will appear here when you load a template...</p>
        </div>
      `;
    }
  }

  static toggleGlossaryItems(glossaryEnabled: boolean): void {
    const glossarySelectors = [
      '[data-field-label][data-field="historical_figures"]',
      '[data-field-label][data-field="terminology"]',
      '[data-field-label][data-field="concepts"]',
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
      label.classList.toggle('opacity-50', !glossaryEnabled);
      label.classList.toggle('text-neutral-400', !glossaryEnabled);
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
    const simpleFields = fields.filter((field) => !field.separator);
    if (!simpleFields.length) {
      return "";
    }

    const rows: string[] = [];
    for (let i = 0; i < simpleFields.length; i += 3) {
      const rowFields = simpleFields.slice(i, i + 3);
      rows.push(`
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3" data-field-row="compact">
          ${rowFields.map((field) => this.renderFieldCheckbox(templateId, block, field)).join("")}
        </div>
      `);
    }

    return rows.join("");
  }

  private static renderHierarchicalRowsCompact(templateId: string | null, block: TemplateBlock, fields: BlockFieldConfig[]): string {
    // Separate "Include Project" field to render it separately at the bottom
    const includeProjectField = fields.find(f => f.name === "include_project");
    const regularFields = fields.filter(f => f.name !== "include_project" && !f.separator);
    
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
      const indentStyle = indentLevel ? ` style="padding-left: ${indentLevel * 0.75}rem"` : "";
      
      for (let i = 0; i < indentFields.length; i += 3) {
        const rowFields = indentFields.slice(i, i + 3);
        rows.push(`
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-3" data-field-row="compact"${indentStyle}>
            ${rowFields.map((field) => this.renderFieldCheckbox(templateId, block, field)).join("")}
          </div>
        `);
      }
    });

    // Add "Include Project" in its own row at the bottom
    if (includeProjectField) {
      rows.push(`
        <div class="flex flex-col gap-2" data-field-row="full">
          ${this.renderFieldCheckbox(templateId, block, includeProjectField)}
        </div>
      `);
    }

    return rows.join("");
  }

  private static renderResourceRows(templateId: string | null, block: TemplateBlock, fields: BlockFieldConfig[]): string {
    const byGroup = new Map<string, BlockFieldConfig[]>();
    fields.forEach((field) => {
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
        <div class="grid grid-cols-1 gap-3 sm:grid-cols-3" data-field-row="resource" data-field-row-group="${className}">
          ${groupFields.map((field) => this.renderFieldCheckbox(templateId, block, field)).join("")}
        </div>
      `);
      byGroup.delete(groupKey);
    };

    renderGroup("resources-main", "resource-main");
    
    // Render glossary toggle in its own row with separator styling (like Include Project)
    const glossaryToggleFields = byGroup.get("resources-glossary-toggle");
    if (glossaryToggleFields && glossaryToggleFields.length) {
      rows.push(`
        <div class="flex flex-col gap-2" data-field-row="full">
          ${glossaryToggleFields.map((field) => this.renderFieldCheckbox(templateId, block, field)).join("")}
        </div>
      `);
      byGroup.delete("resources-glossary-toggle");
    }
    
    renderGroup("resources-glossary-items", "resource-glossary");

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

    const labelClasses = ["inline-flex items-center gap-2 text-sm text-neutral-700"];
    if (isGlossaryItem && !glossaryEnabled) {
      labelClasses.push("opacity-50", "text-neutral-400");
    }

    const fieldId = this.buildFieldId(templateId, block, field);

    return `
      <label class="${labelClasses.join(" ")}" data-field-label data-field="${field.name}">
        <input type="checkbox"
               id="${fieldId}"
               name="${field.name}"
               ${shouldCheck ? "checked" : ""}
               ${shouldDisable ? "disabled" : ""}
               ${updateHandler}>
        <span>${field.label}</span>
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

  private static getRenderableBlocks(actualData: any, templateData?: any): TemplateBlock[] {
    const existingBlocks = ((actualData?.blocks as TemplateBlock[] | undefined) ?? []).filter(
      (block) => block.type !== "body",
    );

    const templateType = this.resolveTemplateType(actualData, templateData);
    const sequence = this.getRequiredBlockSequence(templateType);
    const blocksByType = new Map(existingBlocks.map((block) => [block.type, block]));

    const normalizedBlocks = sequence.map((blockType, index) => {
      const existing = blocksByType.get(blockType);
      if (existing) {
        return existing;
      }
      return this.createDefaultBlock(blockType, index + 1);
    });

    const extraBlocks = existingBlocks.filter((block) => !sequence.includes(block.type));
    return [...normalizedBlocks, ...extraBlocks].map((block, index) => ({
      ...block,
      order: index + 1,
    }));
  }

  private static resolveTemplateType(actualData: any, templateData?: any): TemplateType {
    const rawTemplateType =
      templateData?.template_type ??
      actualData?.template_type ??
      actualData?.settings?.template_type ??
      "lesson";

    if (typeof rawTemplateType === "string" && rawTemplateType in TEMPLATE_BODY_BLOCKS) {
      return rawTemplateType as TemplateType;
    }

    return "lesson";
  }

  private static getRequiredBlockSequence(templateType: TemplateType): TemplateBlockType[] {
    const mainSequence = TEMPLATE_BLOCK_SEQUENCES[templateType] ?? TEMPLATE_BLOCK_SEQUENCES.lesson;
    const bodySubBlocks = TEMPLATE_BODY_BLOCKS[templateType] ?? TEMPLATE_BODY_BLOCKS.lesson;

    const sequence: TemplateBlockType[] = [];
    mainSequence.forEach((blockType) => {
      if (blockType === "body") {
        sequence.push(...bodySubBlocks);
        return;
      }
      sequence.push(blockType);
    });

    return sequence;
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
