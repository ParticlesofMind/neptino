import { TEMPLATE_BLOCKS } from "./templateBlocks.js";

export class TemplateConfigHandler {
  private currentTemplate: any = null;
  private activeBlocks: string[] = [];

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
    const configContainer = document.querySelector(".template-config");
    if (!configContainer) return;

    const blockSelectorHtml = `
      <div class="template-blocks-selector">
        <h3 class="heading heading--tertiary">Template Blocks</h3>
        <div class="blocks-grid">
          ${TEMPLATE_BLOCKS.map(
            (block) => `
            <div class="block-option" data-block-type="${block.type}">
              <div class="block-option__icon">${block.icon}</div>
              <div class="block-option__label">${block.label}</div>
              <div class="block-option__toggle">
                <input type="checkbox" id="toggle-${block.type}" checked>
                <label for="toggle-${block.type}"></label>
              </div>
            </div>
          `,
          ).join("")}
        </div>
      </div>
      <div class="template-block-config">
        <h3 class="heading heading--tertiary">Block Configuration</h3>
        <div class="block-config-content">
          <p class="text">Select a block above to configure its settings.</p>
        </div>
      </div>
    `;

    configContainer.innerHTML = blockSelectorHtml;
  }

  /**
   * Sets up event listeners for the configuration interface
   */
  private setupEventListeners(): void {
    // Block toggle listeners
    document
      .querySelectorAll('.block-option input[type="checkbox"]')
      .forEach((checkbox) => {
        checkbox.addEventListener("change", (e) => {
          const target = e.target as HTMLInputElement;
          const blockType = target.id.replace("toggle-", "");
          this.toggleBlock(blockType, target.checked);
        });
      });

    // Block selection listeners
    document.querySelectorAll(".block-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        // Avoid triggering when clicking the checkbox
        if ((e.target as HTMLElement).tagName !== "INPUT") {
          const blockType = option.getAttribute("data-block-type");
          if (blockType) {
            this.selectBlock(blockType);
          }
        }
      });
    });
  }

  /**
   * Toggles a block on/off
   */
  private toggleBlock(blockType: string, enabled: boolean): void {
    if (enabled) {
      if (!this.activeBlocks.includes(blockType)) {
        this.activeBlocks.push(blockType);
      }
    } else {
      this.activeBlocks = this.activeBlocks.filter(
        (type) => type !== blockType,
      );
    }

    this.updatePreview();
  }

  /**
   * Selects a block for configuration
   */
  private selectBlock(blockType: string): void {
    // Remove previous selection
    document.querySelectorAll(".block-option").forEach((option) => {
      option.classList.remove("block-option--selected");
    });

    // Add selection to current block
    const selectedOption = document.querySelector(
      `[data-block-type="${blockType}"]`,
    );
    if (selectedOption) {
      selectedOption.classList.add("block-option--selected");
    }

    // Load block configuration
    this.loadBlockConfig(blockType);
  }

  /**
   * Loads configuration form for a specific block
   */
  private loadBlockConfig(blockType: string): void {
    const blockConfig = TEMPLATE_BLOCKS.find(
      (block) => block.type === blockType,
    );
    if (!blockConfig) return;

    const configContent = document.querySelector(".block-config-content");
    if (!configContent) return;

    const configFormHtml = `
      <form class="form" data-block-type="${blockType}">
        <h4 class="heading heading--quaternary">${blockConfig.label} Settings</h4>
        ${blockConfig.configFields.map((field) => this.renderConfigField(field)).join("")}
        <div class="form__group">
          <button type="button" class="btn btn--secondary btn--small" onclick="templateConfigHandler.resetBlockConfig('${blockType}')">
            Reset to Default
          </button>
        </div>
      </form>
    `;

    configContent.innerHTML = configFormHtml;

    // Setup field change listeners
    configContent
      .querySelectorAll("input, select, textarea")
      .forEach((input) => {
        input.addEventListener("change", () => {
          this.updateBlockConfig(blockType);
        });
      });
  }

  /**
   * Renders a configuration field
   */
  private renderConfigField(field: any): string {
    switch (field.type) {
      case "checkbox":
        return `
          <div class="form__group">
            <label class="form__label form__label--checkbox">
              <input type="checkbox" name="${field.name}" ${field.defaultValue ? "checked" : ""}>
              ${field.label}
            </label>
          </div>
        `;
      case "select":
        return `
          <div class="form__group">
            <label class="form__label" for="${field.name}">${field.label}</label>
            <select class="form__input" name="${field.name}">
              ${
                field.options
                  ?.map(
                    (option: any) =>
                      `<option value="${option.value}" ${option.value === field.defaultValue ? "selected" : ""}>${option.label}</option>`,
                  )
                  .join("") || ""
              }
            </select>
          </div>
        `;
      case "color":
        return `
          <div class="form__group">
            <label class="form__label" for="${field.name}">${field.label}</label>
            <input type="color" class="form__input form__input--color" name="${field.name}" value="${field.defaultValue || "#000000"}">
          </div>
        `;
      case "number":
        return `
          <div class="form__group">
            <label class="form__label" for="${field.name}">${field.label}</label>
            <input type="number" class="form__input" name="${field.name}" value="${field.defaultValue || 0}">
          </div>
        `;
      case "textarea":
        return `
          <div class="form__group">
            <label class="form__label" for="${field.name}">${field.label}</label>
            <textarea class="form__input" name="${field.name}" rows="3">${field.defaultValue || ""}</textarea>
          </div>
        `;
      default:
        return `
          <div class="form__group">
            <label class="form__label" for="${field.name}">${field.label}</label>
            <input type="text" class="form__input" name="${field.name}" value="${field.defaultValue || ""}">
          </div>
        `;
    }
  }

  /**
   * Updates block configuration based on form values
   */
  private updateBlockConfig(blockType: string): void {
    const form = document.querySelector(
      `form[data-block-type="${blockType}"]`,
    ) as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const config: Record<string, any> = {};

    // Process form data
    for (const [key, value] of formData.entries()) {
      config[key] = value;
    }

    // Handle checkboxes (they don't appear in FormData when unchecked)
    form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
      const input = checkbox as HTMLInputElement;
      config[input.name] = input.checked;
    });

    // Update the template configuration
    if (!this.currentTemplate) {
      this.currentTemplate = { blocks: [] };
    }

    const blockIndex = this.currentTemplate.blocks.findIndex(
      (block: any) => block.type === blockType,
    );
    if (blockIndex >= 0) {
      this.currentTemplate.blocks[blockIndex].config = config;
    } else {
      this.currentTemplate.blocks.push({
        type: blockType,
        config: config,
        order: this.activeBlocks.indexOf(blockType) + 1,
      });
    }

    this.updatePreview();
  }

  /**
   * Resets a block to its default configuration
   */
  resetBlockConfig(blockType: string): void {
    const blockConfig = TEMPLATE_BLOCKS.find(
      (block) => block.type === blockType,
    );
    if (!blockConfig) return;

    // Update form with default values
    const form = document.querySelector(
      `form[data-block-type="${blockType}"]`,
    ) as HTMLFormElement;
    if (form) {
      blockConfig.configFields.forEach((field) => {
        const input = form.querySelector(
          `[name="${field.name}"]`,
        ) as HTMLInputElement;
        if (input) {
          if (input.type === "checkbox") {
            input.checked = field.defaultValue || false;
          } else {
            input.value = field.defaultValue || "";
          }
        }
      });

      // Trigger update
      this.updateBlockConfig(blockType);
    }
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
      },
    });
    document.dispatchEvent(event);
  }
}

// Create global instance
declare global {
  interface Window {
    templateConfigHandler: TemplateConfigHandler;
  }
}

window.templateConfigHandler = new TemplateConfigHandler();
