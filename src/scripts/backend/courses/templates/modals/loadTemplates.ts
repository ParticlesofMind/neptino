import { supabase } from '../../../supabase';
import { ensureTemplateModals } from '../templateModals';
import { ModalHandler } from '../../../../navigation/CourseBuilderNavigation';
import {
  TEMPLATE_TYPE_LABELS,
  TemplateType,
} from '../templateOptions';

interface Template {
  id: string;
  template_id: string;
  template_type: TemplateType;
  template_description?: string;
  created_at: string;
  template_data: {
    name: string;
    blocks: any[];
    settings: Record<string, any>;
  };
}

export class LoadTemplatesModal {
  private templates: Template[] = [];
  private onTemplateSelected: ((templateId: string) => void) | null = null;
  private currentFilterType: TemplateType | "" = "";
  private filterInitialized = false;
  private selectedTemplateId: string | null = null;

  constructor() {
    // No initialization needed for DOM-based approach
  }

  /**
   * Shows the load template modal
   */
  public async show(): Promise<void> {
    ensureTemplateModals();

    const modal = document.getElementById("load-template-modal");
    if (!modal) {
      console.error("Load template modal not found");
      return;
    }

    // Reset selection when modal opens
    this.selectedTemplateId = null;
    this.updateLoadButtonState();

    ModalHandler.getInstance().showModal('load-template-modal');

    this.initializeFilterControl();
    this.initializeLoadButton();

    await this.loadTemplates();
  }

  /**
   * Hides the load template modal
   */
  public hide(): void {
    const modal = document.getElementById("load-template-modal");
    if (modal && !modal.classList.contains('hidden')) {
      ModalHandler.getInstance().hideModal();
    }
  }

  /**
   * Sets the callback for when a template is selected
   */
  public setOnTemplateSelected(callback: (templateId: string) => void): void {
    this.onTemplateSelected = callback;
  }

  /**
   * Loads templates from the database and displays them
   */
  private async loadTemplates(): Promise<void> {
    const loadingEl = document.getElementById("template-loading");
    const contentEl = document.getElementById("template-list-content");
    const noTemplatesEl = document.getElementById("no-templates-message");

    if (loadingEl) loadingEl.style.display = "flex";
    if (contentEl) contentEl.style.display = "none";
    if (noTemplatesEl) noTemplatesEl.style.display = "none";

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('templates')
        .select('id, template_id, template_type, template_description, created_at, template_data')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.templates = data || [];
      
      if (loadingEl) loadingEl.style.display = "none";

      if (this.templates.length === 0) {
        if (noTemplatesEl) noTemplatesEl.style.display = "flex";
      } else {
        this.displayTemplates();
        if (contentEl) contentEl.style.display = "block";
      }
      
    } catch (error) {
      console.error('Failed to load templates:', error);
      this.showError('Failed to load templates. Please try again.');
    }
  }

  /**
   * Displays templates in the modal
   */
  private displayTemplates(): void {
    const contentEl = document.getElementById("template-list-content");
    if (!contentEl) return;

    const filteredTemplates = this.getFilteredTemplates();

    if (filteredTemplates.length === 0) {
      contentEl.innerHTML = `
        <div class="text-center text-sm text-neutral-500" data-template-empty-inline>
          <span class="text-2xl" data-template-empty-icon>🔍</span>
          <h3 class="mt-2 text-base font-semibold text-neutral-800">No Templates Match</h3>
          <p class="mt-1">Try selecting a different template type.</p>
        </div>
      `;
      return;
    }

    const templatesHtml = filteredTemplates
      .map((template: Template) => {
        const createdDate = new Date(template.created_at).toLocaleDateString();
        const templateName = template.template_data?.name || "Untitled Template";
        const description = template.template_description || "No description provided";
        const typeLabel = TEMPLATE_TYPE_LABELS[template.template_type];

        const isSelected = this.selectedTemplateId === template.id;
        return `
          <div class="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm transition hover:shadow-md" data-template-card data-template-id="${template.id}" ${isSelected ? 'data-selected="true"' : ''} onclick="loadTemplatesModal.selectTemplateCard('${template.id}')">
            <div class="flex items-start justify-between gap-3">
              <h4 class="text-base font-semibold text-neutral-900">${templateName}</h4>
              <span class="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">${typeLabel}</span>
            </div>
            <div class="mt-2 text-sm text-neutral-600">
              ${description}
            </div>
            <div class="mt-3 text-xs text-neutral-500">
              <span>Created: ${createdDate}</span>
            </div>
            <div class="mt-4 flex flex-wrap gap-2">
              <button class="inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50" onclick="event.stopPropagation(); loadTemplatesModal.previewTemplate('${template.id}')">
                Preview
              </button>
              <button class="inline-flex items-center justify-center rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50" onclick="event.stopPropagation(); loadTemplatesModal.deleteTemplate('${template.id}')">
                Delete
              </button>
            </div>
          </div>
        `;
      })
      .join("");

    contentEl.innerHTML = templatesHtml;
    
    // Update selection state after rendering
    if (this.selectedTemplateId) {
      this.updateCardSelection();
    }
  }

  /**
   * Selects a template card (does not load it)
   */
  public selectTemplateCard(templateId: string): void {
    this.selectedTemplateId = templateId;
    this.updateCardSelection();
    this.updateLoadButtonState();
  }

  /**
   * Loads the currently selected template
   */
  public loadSelectedTemplate(): void {
    if (!this.selectedTemplateId) {
      return;
    }

    if (this.onTemplateSelected) {
      this.onTemplateSelected(this.selectedTemplateId);
    }
    this.hide();
  }

  /**
   * Updates the visual selection state of cards
   */
  private updateCardSelection(): void {
    const cards = document.querySelectorAll('[data-template-card]');
    cards.forEach((card) => {
      const templateId = card.getAttribute('data-template-id');
      if (templateId === this.selectedTemplateId) {
        card.setAttribute('data-selected', 'true');
        card.classList.add('ring-2', 'ring-primary-500');
      } else {
        card.removeAttribute('data-selected');
        card.classList.remove('ring-2', 'ring-primary-500');
      }
    });
  }

  /**
   * Updates the Load Template button state
   */
  private updateLoadButtonState(): void {
    const loadButton = document.getElementById('load-selected-template') as HTMLButtonElement | null;
    if (loadButton) {
      loadButton.disabled = !this.selectedTemplateId;
    }
  }

  /**
   * Initializes the Load Template button handler
   */
  private initializeLoadButton(): void {
    const loadButton = document.getElementById('load-selected-template');
    if (loadButton) {
      // Remove any existing listeners by cloning and replacing
      const newButton = loadButton.cloneNode(true) as HTMLButtonElement;
      loadButton.parentNode?.replaceChild(newButton, loadButton);
      
      newButton.addEventListener('click', () => {
        this.loadSelectedTemplate();
      });
    }
  }

  /**
   * Shows a preview of the template (placeholder implementation)
   */
  public async previewTemplate(templateId: string): Promise<void> {
    void templateId; // Placeholder usage
    // Implementation would show a preview modal
    alert('Template preview functionality coming soon!');
  }

  /**
   * Deletes a template
   */
  public async deleteTemplate(templateId: string): Promise<void> {
    const confirmed = confirm('Are you sure you want to delete this template? This action cannot be undone.');
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      // Reload templates and reset selection
      this.selectedTemplateId = null;
      await this.loadTemplates();
      this.updateLoadButtonState();
      
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template. Please try again.');
    }
  }

  /**
   * Shows an error message
   */
  private showError(message: string): void {
    const loadingEl = document.getElementById("template-loading");
    const noTemplatesEl = document.getElementById("no-templates-message");
    
    if (loadingEl) loadingEl.style.display = "none";
    
    if (noTemplatesEl) {
      noTemplatesEl.innerHTML = `
        <div class="text-2xl" data-template-empty-icon>⚠️</div>
        <h3 class="mt-2 text-base font-semibold text-neutral-800">Error Loading Templates</h3>
        <p class="mt-1 text-sm text-neutral-500">${message}</p>
        <button class="mt-4 inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50" onclick="loadTemplatesModal.reloadTemplates()">
          Retry
        </button>
      `;
      noTemplatesEl.style.display = "flex";
    }
  }

  /**
   * Public method to reload templates (for retry button)
   */
  public async reloadTemplates(): Promise<void> {
    await this.loadTemplates();
  }

  /**
   * Cleanup method (no longer needed for DOM-based approach)
   */
  public destroy(): void {
    // Nothing to clean up for DOM-based approach
  }

  private initializeFilterControl(): void {
    const filterSelect = document.getElementById("template-type-filter") as HTMLSelectElement | null;
    if (!filterSelect) {
      return;
    }

    if (!this.filterInitialized) {
      filterSelect.addEventListener("change", () => {
        this.currentFilterType = (filterSelect.value as TemplateType) || "";
        this.displayTemplates();
      });
      this.filterInitialized = true;
    }

    filterSelect.value = this.currentFilterType;
  }

  private getFilteredTemplates(): Template[] {
    if (!this.currentFilterType) {
      return this.templates;
    }

    return this.templates.filter(
      (template) => template.template_type === this.currentFilterType,
    );
  }
}

// Export singleton instance
export const loadTemplatesModal = new LoadTemplatesModal();

// Make it available globally for HTML onclick handlers
declare global {
  interface Window {
    loadTemplatesModal: LoadTemplatesModal;
  }
}

window.loadTemplatesModal = loadTemplatesModal;
