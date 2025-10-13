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
      <div class="template-blocks">
        ${TEMPLATE_BLOCKS.map(
          (block) => `
            <div class="block-config">
              <h4 class="block-config__title">${block.label}</h4>
              <div class="block-config__fields">
                ${block.configFields.map((field: any) => `
                  <label class="block-config__field">
                    <input type="checkbox" id="field-${block.type}-${field.name}" ${(field.required || field.defaultValue) ? 'checked' : ''} ${field.required ? 'disabled' : ''} class="input input--checkbox">
                    <span class="block-config__label">${field.label}</span>
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
    document.querySelectorAll('.block-config').forEach((blockElement) => {
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
  private updateFieldConfig(blockType: string, fieldName: string, value: boolean): void {
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

    // Update preview
    this.updatePreview();
  }

  /**
   * Selects a block for configuration
   */
  private selectBlock(blockType: string): void {
    // Remove previous selection
    document.querySelectorAll('.block-config').forEach((block) => {
      block.classList.remove('block-config--selected');
    });

    // Add selection to current block
    const selectedBlock = Array.from(document.querySelectorAll('.block-config')).find(block => {
      return block.querySelector('h4')?.textContent?.toLowerCase() === blockType;
    });
    
    if (selectedBlock) {
      selectedBlock.classList.add('block-config--selected');
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
