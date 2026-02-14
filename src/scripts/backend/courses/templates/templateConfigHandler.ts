import { TEMPLATE_BLOCKS } from "./templateBlocks.js";

export class TemplateConfigHandler {
  private currentTemplate: any = { blocks: [] };
  private activeBlocks: string[] = [];
  private currentlySelectedBlock: string | null = null;

  /**
   * Initializes the template configuration interface
   */
  init(): void {
    this.renderBlockSelector();
    this.setupEventListeners();
  }

  /**
   * Renders the block selector interface
   */
  private renderBlockSelector(): void {
    const configContainer = document.getElementById('template-config-content');
    if (!configContainer) return;

    const blockSelectorHtml = `
      <div class="space-y-4" data-template-blocks>
        ${TEMPLATE_BLOCKS.map(
          (block) => `
            <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition" data-block-config data-block-type="${block.type}">
              <h4 class="text-base font-semibold text-neutral-900">${block.label}</h4>
              <div class="mt-3 grid gap-2" data-block-fields>
                ${block.configFields.map((field: any, index: number) => `
                  <label class="flex items-center gap-2 text-sm text-neutral-700" data-field-label>
                    <input
                      type="checkbox"
                      id="field-${block.type}-${field.name}-${index}"
                      name="field-${block.type}-${field.name}-${index}"
                      ${(field.required || field.defaultValue) ? 'checked' : ''}
                      ${field.required ? 'disabled' : ''}
                      class="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500">
                    <span>${field.label}</span>
                  </label>
                `).join('')}
              </div>
            </div>
          `,
        ).join("")}
      </div>
    `;

    configContainer.innerHTML = blockSelectorHtml;
  }

  /**
   * Sets up event listeners for the configuration interface
   */
  private setupEventListeners(): void {
    // Template field checkbox listeners
    document.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      if (target.type === 'checkbox' && target.id.startsWith('field-')) {
        const [, blockType, fieldName] = target.id.split('-');
        this.updateFieldConfig(blockType, fieldName, target.checked);
      }
    });

    // Block selection listeners
    document.querySelectorAll('[data-block-config]').forEach((blockElement) => {
      blockElement.addEventListener("click", (e) => {
        // Avoid triggering when clicking checkboxes
        if ((e.target as HTMLElement).tagName !== "INPUT") {
          const blockType = blockElement.querySelector('h4')?.textContent?.toLowerCase();
          if (blockType) {
            this.selectBlock(blockType);
          }
        }
      });
    });
  }

  /**
   * Updates field configuration when checkbox changes
   */
  private async updateFieldConfig(blockType: string, fieldName: string, value: boolean): Promise<void> {
    // Find or create block in current template
    let block = this.currentTemplate.blocks.find((b: any) => b.type === blockType);
    if (!block) {
      block = {
        type: blockType,
        config: {},
        order: this.currentTemplate.blocks.length + 1
      };
      this.currentTemplate.blocks.push(block);
    }

    // Update field value
    block.config[fieldName] = value;

    // Update the active blocks list to include this block
    if (!this.activeBlocks.includes(blockType)) {
      this.activeBlocks.push(blockType);
    }

    // Save to database via TemplateManager
    const { TemplateManager } = await import('./TemplateManager.js');
    const templateId = TemplateManager.getCurrentTemplateId();
    if (templateId) {
      await TemplateManager.updateTemplateField(templateId, blockType, fieldName, value);
    }

    // Update preview
    this.updatePreview();
  }

  /**
   * Selects a block for configuration
   */
  private selectBlock(blockType: string): void {
    // Remove previous selection
    document.querySelectorAll('[data-block-config]').forEach((block) => {
      block.removeAttribute('data-selected');
      block.classList.remove('ring-2', 'ring-primary-500', 'bg-primary-50');
    });

    // Add selection to current block
    const selectedBlock = Array.from(document.querySelectorAll('[data-block-config]')).find(block => {
      return block.querySelector('h4')?.textContent?.toLowerCase() === blockType;
    });
    
    if (selectedBlock) {
      selectedBlock.setAttribute('data-selected', 'true');
      selectedBlock.classList.add('ring-2', 'ring-primary-500', 'bg-primary-50');
    }

    this.currentlySelectedBlock = blockType;
  }

  /**
   * Resets a block's configuration to default values
   */
  resetBlockConfig(blockType: string): void {
    const blockConfig = TEMPLATE_BLOCKS.find(
      (block) => block.type === blockType,
    );
    if (!blockConfig) return;

    // Reset checkboxes to default values
    blockConfig.configFields.forEach((field) => {
      const checkbox = document.getElementById(`field-${blockType}-${field.name}`) as HTMLInputElement;
      if (checkbox) {
        checkbox.checked = field.defaultValue || false;
        this.updateFieldConfig(blockType, field.name, checkbox.checked);
      }
    });
  }

  /**
   * Updates the template preview
   */
  private updatePreview(): void {
    // This will trigger the preview update in the main template manager
    const event = new CustomEvent("templateConfigChanged", {
      detail: {
        template: this.currentTemplate,
        activeBlocks: this.activeBlocks,
        selectedBlock: this.currentlySelectedBlock, // Include selected block info
      },
    });
    document.dispatchEvent(event);
  }

  /**
   * Get the currently selected block type
   */
  getCurrentlySelectedBlock(): string | null {
    return this.currentlySelectedBlock;
  }
}

// Create global instance
declare global {
  interface Window {
    templateConfigHandler: TemplateConfigHandler;
  }
}

window.templateConfigHandler = new TemplateConfigHandler();
