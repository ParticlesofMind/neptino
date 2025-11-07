import { TemplateDataHandler } from "./TemplateDataHandler.js";
import { TemplateRenderer } from "./TemplateRenderer.js";
import { TemplateConfigManager } from "./TemplateConfigManager.js";
import { TemplateBlockRenderer } from "./TemplateBlockRenderer.js";
import { TemplateManagerState } from "./types.js";
import { loadTemplatesModal } from "./modals/loadTemplates.js";

export class TemplateManager {
  private static state: TemplateManagerState = {
    currentlyLoadedTemplateId: null,
    currentlyLoadedTemplateData: null,
  };

  static showCreateTemplateModal(): void {
    const modal = document.getElementById('create-template-modal');
    if (modal) {
      modal.classList.add('modal--active');
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
    }
  }

  static hideCreateTemplateModal(): void {
    const modal = document.getElementById('create-template-modal');
    if (modal) {
      modal.classList.remove('modal--active');
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
    }
  }

  static async showLoadTemplateModal(): Promise<void> {
    try {
      // Set the callback for when a template is selected
      loadTemplatesModal.setOnTemplateSelected((templateId: string) => {
        this.loadTemplate(templateId);
      });
      
      // Show the modal
      await loadTemplatesModal.show();
    } catch (error) {
      console.error('Failed to show load template modal:', error);
    }
  }

  static hideLoadTemplateModal(): void {
    loadTemplatesModal.hide();
  }

  static async updateTemplateField(templateId: string, blockType: string, fieldName: string, value: boolean): Promise<void> {
    try {
      const templateData = this.state.currentlyLoadedTemplateData;
      if (!templateData) {
        console.error('No template loaded');
        return;
      }

      const actualData = templateData.template_data || templateData;
      const block = actualData.blocks.find((b: any) => b.type === blockType);
      
      if (block) {
        if (!block.config) {
          block.config = {};
        }
        block.config[fieldName] = value;

        // Update preview immediately for instant feedback
        TemplateRenderer.updateTemplatePreview(templateData);
        
        // Persist changes
        await TemplateDataHandler.saveTemplateChanges(templateId, actualData);
      }
    } catch (error) {
      console.error('Failed to update template field:', error);
    }
  }

  static async saveTemplateChanges(): Promise<void> {
    try {
      if (!this.state.currentlyLoadedTemplateId) {
        console.error('No template loaded to save');
        return;
      }

      const templateData = this.state.currentlyLoadedTemplateData;
      if (!templateData) {
        console.error('No template data to save');
        return;
      }

      const actualData = templateData.template_data || templateData;
      const success = await TemplateDataHandler.saveTemplateChanges(this.state.currentlyLoadedTemplateId, actualData);
      
      if (success) {
        console.log('Template changes saved successfully');
      } else {
        console.error('Failed to save template changes');
      }
    } catch (error) {
      console.error('Failed to save template changes:', error);
    }
  }

  static async createTemplate(formData: {
    name: string;
    type: string;
    description?: string;
  }): Promise<string | null> {
    try {
      const templateId = await TemplateDataHandler.createTemplate(formData as any);
      if (templateId) {
        console.log('Template created successfully:', templateId);
        this.hideCreateTemplateModal();
        return templateId;
      }
      return null;
    } catch (error) {
      console.error('Failed to create template:', error);
      return null;
    }
  }

  static showTemplateBuilder(templateId?: string): void {
    const templateContainer = document.querySelector(".template") as HTMLElement;

    if (templateContainer) {
      setTimeout(() => {
        // Initialize the configuration handler if available
        if (window.templateConfigHandler) {
          window.templateConfigHandler.init();
        } else {
          console.warn("Template config handler not available, showing basic interface");
          this.initializeBasicInterface();
        }

        // If templateId is provided, load the template
        if (templateId) {
          this.loadTemplate(templateId);
        } else {
          TemplateRenderer.initializeEmptyTemplate();
        }
      }, 100);
    } else {
      console.error("Template container not found");
    }
  }

  static async loadExistingTemplates(): Promise<void> {
    try {
      // If we have a currently loaded template, display it instead of the placeholder
      if (this.state.currentlyLoadedTemplateData) {
        console.log("Displaying currently loaded template:", this.state.currentlyLoadedTemplateData);
        TemplateRenderer.displayTemplateBlocks(this.state.currentlyLoadedTemplateData);
        TemplateRenderer.updateTemplatePreview(this.state.currentlyLoadedTemplateData);
        return;
      }

      const templates = await TemplateDataHandler.loadExistingTemplates();
      TemplateRenderer.displayTemplateList(templates);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }

  static async previewTemplate(templateId: string): Promise<void> {
    try {
      const templateData = await TemplateDataHandler.loadTemplate(templateId);
      if (templateData) {
        this.state.currentlyLoadedTemplateId = templateData.id;
        this.state.currentlyLoadedTemplateData = templateData;
        
        // Persist to sessionStorage
        sessionStorage.setItem('lastLoadedTemplateId', templateData.id);
        
        TemplateRenderer.displayTemplateBlocks(templateData);
        TemplateRenderer.updateTemplatePreview(templateData);
      }
    } catch (error) {
      console.error("Failed to preview template:", error);
    }
  }

  static initializeBasicInterface(): void {
    // Initialize basic template interface
    console.log("🔧 Initializing basic template interface");
    
    // Set up event listeners for template actions
    const createBtn = document.getElementById('create-template-btn');
    if (createBtn) {
      console.log("✅ Found create-template-btn, attaching listener");
      createBtn.addEventListener('click', () => {
        console.log("🎯 Create template button clicked");
        this.showCreateTemplateModal();
      });
    } else {
      console.warn("⚠️ create-template-btn not found in DOM");
    }

    const loadBtn = document.getElementById('load-template-btn');
    if (loadBtn) {
      console.log("✅ Found load-template-btn, attaching listener");
      loadBtn.addEventListener('click', () => {
        console.log("🎯 Load template button clicked");
        this.showLoadTemplateModal();
      });
    } else {
      console.warn("⚠️ load-template-btn not found in DOM");
    }

    // Try to restore previously loaded template from sessionStorage
    this.restoreLastLoadedTemplate();
  }

  static clearTemplateState(): void {
    this.state.currentlyLoadedTemplateId = null;
    this.state.currentlyLoadedTemplateData = null;
    TemplateRenderer.clearTemplateState();
    
    // Clear from sessionStorage as well
    sessionStorage.removeItem('lastLoadedTemplateId');
  }

  static getCurrentTemplateId(): string | null {
    return this.state.currentlyLoadedTemplateId;
  }

  static getCurrentTemplateData(): any {
    return this.state.currentlyLoadedTemplateData;
  }

  static async restoreLastLoadedTemplate(): Promise<void> {
    try {
      // Check if there's a template ID in sessionStorage
      const lastTemplateId = sessionStorage.getItem('lastLoadedTemplateId');
      
      if (lastTemplateId) {
        console.log('🔄 Restoring last loaded template:', lastTemplateId);
        await this.loadTemplate(lastTemplateId);
      } else {
        console.log('📋 No previous template to restore, showing template list');
        this.loadExistingTemplates();
      }
    } catch (error) {
      console.error('Failed to restore last loaded template:', error);
      // Fallback to showing template list
      this.loadExistingTemplates();
    }
  }

  static async loadTemplate(templateId: string): Promise<void> {
    try {
      const templateData = await TemplateDataHandler.loadTemplate(templateId);
      if (templateData) {
        this.state.currentlyLoadedTemplateId = templateData.id;
        this.state.currentlyLoadedTemplateData = templateData;
        
        // Persist to sessionStorage so it survives page reloads
        sessionStorage.setItem('lastLoadedTemplateId', templateData.id);
        
        TemplateRenderer.displayTemplateBlocks(templateData);
        TemplateRenderer.updateTemplatePreview(templateData);
      }
    } catch (error) {
      console.error("Failed to load template:", error);
    }
  }

  static async loadCourseTemplate(): Promise<void> {
    try {
      const templateData = await TemplateDataHandler.loadCourseTemplate();
      if (templateData) {
        this.state.currentlyLoadedTemplateId = templateData.id;
        this.state.currentlyLoadedTemplateData = templateData;
        
        // Persist to sessionStorage
        sessionStorage.setItem('lastLoadedTemplateId', templateData.id);
        
        TemplateRenderer.displayTemplateBlocks(templateData);
        TemplateRenderer.updateTemplatePreview(templateData);
      } else {
        this.loadExistingTemplates();
      }
    } catch (error) {
      console.error("Failed to load course template:", error);
    }
  }

  static async regenerateCanvasesForTemplate(templateId: string): Promise<void> {
    try {
      await TemplateDataHandler.regenerateCanvasesForTemplate(templateId);
    } catch (error) {
      console.error("Failed to regenerate canvases:", error);
    }
  }

  // Utility methods for backward compatibility
  static getBlockFieldConfiguration() {
    return TemplateConfigManager.getBlockFieldConfiguration();
  }

  static getBlockDescription(blockType: string) {
    return TemplateConfigManager.getBlockDescription(blockType as any);
  }

  static getBlockPreviewContent(block: any) {
    return TemplateBlockRenderer.getBlockPreviewContent(block);
  }

  static getDefaultBlockContent(blockType: string) {
    return TemplateBlockRenderer.getDefaultBlockContent(blockType as any);
  }

  static renderBlockContent(block: any, checkedFields: any[]) {
    return TemplateBlockRenderer.renderBlockContent(block, checkedFields);
  }

  static renderResourcesBlockContent(checkedFields: any[], block?: any) {
    return TemplateBlockRenderer.renderResourcesBlockContent(checkedFields, block);
  }

  static getCheckedFields(block: any) {
    return TemplateConfigManager.getCheckedFields(block);
  }

  static displayTemplateBlocks(templateData: any) {
    TemplateRenderer.displayTemplateBlocks(templateData);
  }

  static updateTemplatePreview(templateData?: any) {
    TemplateRenderer.updateTemplatePreview(templateData);
  }

  static initializeEmptyTemplate() {
    TemplateRenderer.initializeEmptyTemplate();
  }

  static toggleGlossaryItems(glossaryEnabled: boolean) {
    TemplateRenderer.toggleGlossaryItems(glossaryEnabled);
  }
}

// Make TemplateManager available globally
(window as any).TemplateManager = TemplateManager;
