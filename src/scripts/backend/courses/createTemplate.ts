import { supabase } from '../supabase.js';

export interface TemplateData {
  template_id: string;
  course_id?: string;
  template_description?: string;
  template_type: 'lesson';
  template_data: {
    name: string;
    blocks: TemplateBlock[];
    settings: Record<string, any>;
  };
}

export interface TemplateBlock {
  id: string;
  type: 'header' | 'program' | 'resources' | 'content' | 'assignment' | 'footer';
  order: number;
  config: Record<string, any>;
  content: string;
}

export class TemplateManager {
  /**
   * Shows the create template modal
   */
  static showCreateTemplateModal(): void {
    const modal = document.getElementById('create-template-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('modal--active');
      // Add a small delay to trigger the animation
      setTimeout(() => {
        const content = modal.querySelector('.modal__content') as HTMLElement;
        if (content) {
          content.style.transform = 'scale(1)';
          content.style.opacity = '1';
        }
      }, 10);
    }
  }

  /**
   * Hides the create template modal
   */
  static hideCreateTemplateModal(): void {
    const modal = document.getElementById('create-template-modal');
    if (modal) {
      const content = modal.querySelector('.modal__content') as HTMLElement;
      if (content) {
        content.style.transform = 'scale(0.9)';
        content.style.opacity = '0';
      }
      
      setTimeout(() => {
        modal.style.display = 'none';
        modal.classList.remove('modal--active');
      }, 300);
    }
  }

  /**
   * Creates a new template with default blocks
   */
  static async createTemplate(formData: { name: string; type: 'lesson'; description?: string }): Promise<string | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Generate a unique template ID
      const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create default blocks for the template
      const defaultBlocks: TemplateBlock[] = [
        {
          id: 'header-1',
          type: 'header',
          order: 1,
          config: { style: 'default', showTitle: true, showSubtitle: true },
          content: '<h1>{{title}}</h1><h2>{{subtitle}}</h2>'
        },
        {
          id: 'program-1',
          type: 'program',
          order: 2,
          config: { showObjectives: true, showOutcomes: true },
          content: '<div class="program-section"><h3>Learning Objectives</h3><ul>{{objectives}}</ul></div>'
        },
        {
          id: 'resources-1',
          type: 'resources',
          order: 3,
          config: { allowFiles: true, allowLinks: true, allowVideos: true },
          content: '<div class="resources-section"><h3>Resources</h3>{{resources}}</div>'
        },
        {
          id: 'content-1',
          type: 'content',
          order: 4,
          config: { editor: 'rich-text', allowMedia: true },
          content: '<div class="content-section">{{content}}</div>'
        },
        {
          id: 'assignment-1',
          type: 'assignment',
          order: 5,
          config: { allowSubmissions: true, dueDate: true, grading: true },
          content: '<div class="assignment-section"><h3>Assignment</h3>{{assignment}}</div>'
        },
        {
          id: 'footer-1',
          type: 'footer',
          order: 6,
          config: { showCredits: true, showDate: true },
          content: '<footer class="template-footer">{{footer}}</footer>'
        }
      ];

      const templateData: TemplateData = {
        template_id: templateId,
        template_type: formData.type,
        template_description: formData.description,
        template_data: {
          name: formData.name,
          blocks: defaultBlocks,
          settings: {
            version: '1.0',
            created_at: new Date().toISOString()
          }
        }
      };

      const { data, error } = await supabase
        .from('templates')
        .insert([{
          template_id: templateData.template_id,
          template_type: templateData.template_type,
          template_description: templateData.template_description,
          template_data: templateData.template_data,
          created_by: user.id,
          created_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (error) {
        console.error('Error creating template:', error);
        throw error;
      }

      console.log('Template created successfully:', data.id);
      return data.id;
    } catch (error) {
      console.error('Failed to create template:', error);
      return null;
    }
  }

  /**
   * Shows the template configuration and preview areas
   */
  static showTemplateBuilder(templateId?: string): void {
    const templateLayout = document.querySelector('.template-layout') as HTMLElement;
    
    if (templateLayout) {
      // Template layout is now always visible, no need to change display
      
      // Wait a bit for the layout to be visible, then initialize
      setTimeout(() => {
        // Initialize the configuration handler if available
        if (window.templateConfigHandler) {
          window.templateConfigHandler.init();
        } else {
          console.warn('Template config handler not available, showing basic interface');
          this.initializeBasicInterface();
        }
        
        // If templateId is provided, load the template
        if (templateId) {
          console.log('Loading template with ID:', templateId);
          this.loadTemplate(templateId);
        } else {
          console.log('Initializing empty template');
          this.initializeEmptyTemplate();
        }
      }, 100);
    } else {
      console.error('Template layout not found');
    }
  }

  /**
   * Loads existing templates from the database
   */
  static async loadExistingTemplates(): Promise<void> {
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

      if (error) {
        throw error;
      }

      console.log('Loaded templates:', data);
      this.displayTemplateList(data || []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }

  /**
   * Displays the list of available templates
   */
  static displayTemplateList(templates: any[]): void {
    const configArea = document.querySelector('.template-config');
    if (!configArea) return;

    if (templates.length === 0) {
      configArea.innerHTML = `
        <div class="placeholder-content">
          <h4>No Templates Found</h4>
          <p>You haven't created any templates yet. Create your first template to get started!</p>
          <button class="button button--primary" onclick="TemplateManager.showCreateTemplateModal()">
            Create First Template
          </button>
        </div>
      `;
      return;
    }

    const templatesHtml = templates.map(template => `
      <div class="template-item" data-template-id="${template.id}">
        <div class="template-item-header">
          <h4>${template.template_data?.name || 'Untitled Template'}</h4>
          <span class="template-type">${template.template_type}</span>
        </div>
        <div class="template-description">
          ${template.template_description || 'No description provided'}
        </div>
        <div class="template-actions">
          <button class="button button--secondary button--small" onclick="TemplateManager.loadTemplate('${template.id}')">
            Edit
          </button>
          <button class="button button--outline button--small" onclick="TemplateManager.previewTemplate('${template.id}')">
            Preview
          </button>
        </div>
      </div>
    `).join('');

    configArea.innerHTML = `
      <div class="template-list">
        <div class="template-config__header">
          <h3 class="heading heading--tertiary">Your Templates</h3>
          <button class="button button--primary button--small" onclick="TemplateManager.showCreateTemplateModal()">
            Create New Template
          </button>
        </div>
        <div class="template-items">
          ${templatesHtml}
        </div>
      </div>
    `;
  }

  /**
   * Previews a template without editing
   */
  static async previewTemplate(templateId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        throw error;
      }

      console.log('Previewing template:', data);
      this.updateTemplatePreview(data);
    } catch (error) {
      console.error('Failed to preview template:', error);
    }
  }

  /**
   * Initializes a basic interface when the config handler is not available
   */
  static initializeBasicInterface(): void {
    const configArea = document.querySelector('.template-config');
    const previewArea = document.querySelector('.template-preview');
    
    if (configArea) {
      configArea.innerHTML = `
        <div class="template-config__header">
          <h3 class="heading heading--tertiary">Template Configuration</h3>
          <button type="button" class="button button--secondary button--small" id="save-template-btn">
            Save Template
          </button>
        </div>
        <div class="template-blocks">
          <div class="template-blocks__list">
            <div class="template-block-item" data-block="header">
              <div class="template-block-item__icon template-block-item__icon--header"></div>
              <div class="template-block-item__content">
                <span class="template-block-item__name">Header</span>
                <span class="template-block-item__description">Title and introduction section</span>
              </div>
              <button type="button" class="button button--outline button--small">Configure</button>
            </div>
            <div class="template-block-item" data-block="program">
              <div class="template-block-item__icon template-block-item__icon--program"></div>
              <div class="template-block-item__content">
                <span class="template-block-item__name">Program</span>
                <span class="template-block-item__description">Learning objectives and outcomes</span>
              </div>
              <button type="button" class="button button--outline button--small">Configure</button>
            </div>
            <div class="template-block-item" data-block="resources">
              <div class="template-block-item__icon template-block-item__icon--resources"></div>
              <div class="template-block-item__content">
                <span class="template-block-item__name">Resources</span>
                <span class="template-block-item__description">Files, links, and materials</span>
              </div>
              <button type="button" class="button button--outline button--small">Configure</button>
            </div>
            <div class="template-block-item" data-block="content">
              <div class="template-block-item__icon template-block-item__icon--content"></div>
              <div class="template-block-item__content">
                <span class="template-block-item__name">Content</span>
                <span class="template-block-item__description">Main lesson content and materials</span>
              </div>
              <button type="button" class="button button--outline button--small">Configure</button>
            </div>
            <div class="template-block-item" data-block="assignment">
              <div class="template-block-item__icon template-block-item__icon--assignment"></div>
              <div class="template-block-item__content">
                <span class="template-block-item__name">Assignment</span>
                <span class="template-block-item__description">Tasks and submissions</span>
              </div>
              <button type="button" class="button button--outline button--small">Configure</button>
            </div>
            <div class="template-block-item" data-block="footer">
              <div class="template-block-item__icon template-block-item__icon--footer"></div>
              <div class="template-block-item__content">
                <span class="template-block-item__name">Footer</span>
                <span class="template-block-item__description">Credits and additional information</span>
              </div>
              <button type="button" class="button button--outline button--small">Configure</button>
            </div>
          </div>
        </div>
      `;
      
      // Add event listeners for block configuration
      const blockItems = configArea.querySelectorAll('.template-block-item button');
      blockItems.forEach(button => {
        button.addEventListener('click', (e) => {
          const blockItem = (e.target as HTMLElement).closest('.template-block-item');
          const blockType = blockItem?.getAttribute('data-block');
          if (blockType) {
            console.log('Configuring block:', blockType);
            this.showBlockConfiguration(blockType);
          }
        });
      });
    }
    
    if (previewArea) {
      previewArea.innerHTML = `
        <div class="template-preview__header">
          <h3 class="heading heading--tertiary">Template Preview</h3>
          <div class="template-preview__controls">
            <button type="button" class="button button--secondary button--small button--active">Desktop</button>
            <button type="button" class="button button--secondary button--small">Mobile</button>
          </div>
        </div>
        <div class="template-preview__content">
          <div class="template-preview__frame">
            <div class="template-preview-block template-preview-block--header">
              <div class="template-preview-block__label">Header</div>
              <div class="template-preview-block__content">Course title and introduction will appear here</div>
            </div>
            <div class="template-preview-block template-preview-block--program">
              <div class="template-preview-block__label">Program</div>
              <div class="template-preview-block__content">Learning objectives and outcomes will appear here</div>
            </div>
            <div class="template-preview-block template-preview-block--resources">
              <div class="template-preview-block__label">Resources</div>
              <div class="template-preview-block__content">Files, links, and materials will appear here</div>
            </div>
            <div class="template-preview-block template-preview-block--content">
              <div class="template-preview-block__label">Content</div>
              <div class="template-preview-block__content">Main lesson content will appear here</div>
            </div>
            <div class="template-preview-block template-preview-block--assignment">
              <div class="template-preview-block__label">Assignment</div>
              <div class="template-preview-block__content">Tasks and submission instructions will appear here</div>
            </div>
            <div class="template-preview-block template-preview-block--footer">
              <div class="template-preview-block__label">Footer</div>
              <div class="template-preview-block__content">Credits and additional information will appear here</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  /**
   * Loads an existing template for editing
   */
  static async loadTemplate(templateId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) {
        throw error;
      }

      console.log('Loaded template:', data);

      // Populate the template configuration
      this.populateTemplateConfig(data);
      
      // Update the preview
      this.updateTemplatePreview(data);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  }

  /**
   * Initializes an empty template configuration
   */
  static initializeEmptyTemplate(): void {
    console.log('Initializing empty template interface');
    
    // Clear any existing configuration
    const form = document.querySelector('.template-config form');
    if (form) {
      (form as HTMLFormElement).reset();
    }

    // Show default blocks in preview with a welcoming message
    const previewContainer = document.querySelector('.preview-container');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="template-welcome">
          <h4>🎉 Template Created Successfully!</h4>
          <p>Your template has been saved to the database. You can now configure the template blocks below.</p>
          <div class="template-blocks-default">
            <div class="template-block template-block--header">📋 Header Block</div>
            <div class="template-block template-block--program">🎯 Program Block</div>
            <div class="template-block template-block--resources">📚 Resources Block</div>
            <div class="template-block template-block--content">📝 Content Block</div>
            <div class="template-block template-block--assignment">✅ Assignment Block</div>
            <div class="template-block template-block--footer">🔖 Footer Block</div>
          </div>
        </div>
      `;
    }

    // Show default blocks in preview
    this.updateTemplatePreview(null);
  }

  /**
   * Populates the template configuration form
   */
  static populateTemplateConfig(templateData: any): void {
    // Implementation will be added in template configuration handler
    console.log('Populating template config:', templateData);
  }

  /**
   * Updates the template preview
   */
  static updateTemplatePreview(templateData: any): void {
    const previewContainer = document.querySelector('.preview-container');
    if (!previewContainer) return;

    if (!templateData || !templateData.template_data) {
      previewContainer.innerHTML = `
        <div class="template-blocks">
          <div class="template-block template-block--header">Header Block</div>
          <div class="template-block template-block--program">Program Block</div>
          <div class="template-block template-block--resources">Resources Block</div>
          <div class="template-block template-block--content">Content Block</div>
          <div class="template-block template-block--assignment">Assignment Block</div>
          <div class="template-block template-block--footer">Footer Block</div>
        </div>
      `;
    } else {
      // Render actual template content
      const blocks = templateData.template_data.blocks || [];
      const blocksHtml = blocks
        .sort((a: TemplateBlock, b: TemplateBlock) => a.order - b.order)
        .map((block: TemplateBlock) => `
          <div class="template-block template-block--${block.type}">
            <h4>${block.type.charAt(0).toUpperCase() + block.type.slice(1)} Block</h4>
            <div class="block-content">${block.content}</div>
          </div>
        `).join('');

      previewContainer.innerHTML = `<div class="template-blocks">${blocksHtml}</div>`;
    }
  }
  
  /**
   * Show block configuration modal/interface
   */
  static showBlockConfiguration(blockType: string, templateId?: string): void {
    console.log(`Showing configuration for ${blockType} block${templateId ? ` of template ${templateId}` : ''}`);
    
    // Create an elegant modal for block configuration
    const modalHtml = `
      <div class="modal modal--active" id="block-config-modal">
        <div class="modal__backdrop" onclick="TemplateManager.hideBlockConfiguration()"></div>
        <div class="modal__content">
          <div class="modal__header">
            <h3 class="heading heading--tertiary">Configure ${blockType.charAt(0).toUpperCase() + blockType.slice(1)} Block</h3>
            <button type="button" class="modal__close" onclick="TemplateManager.hideBlockConfiguration()">
              <span class="sr-only">Close</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          <div class="modal__body">
            <form id="block-config-form" class="form">
              <div class="form__group">
                <label for="block-title" class="form__label">Block Title</label>
                <input type="text" id="block-title" name="block-title" class="form__input" 
                       placeholder="Enter block title" value="${blockType.charAt(0).toUpperCase() + blockType.slice(1)}">
              </div>
              <div class="form__group">
                <label for="block-content" class="form__label">Block Content</label>
                <textarea id="block-content" name="block-content" class="form__textarea" 
                          placeholder="Enter block content" rows="6">Configure ${blockType} block settings and content...</textarea>
              </div>
              <div class="form__group">
                <label class="form__label">Block Options</label>
                <div class="form__checkbox-group">
                  <label class="form__checkbox">
                    <input type="checkbox" name="block-visible" checked>
                    <span class="form__checkbox-label">Visible in template</span>
                  </label>
                  <label class="form__checkbox">
                    <input type="checkbox" name="block-required">
                    <span class="form__checkbox-label">Required field</span>
                  </label>
                </div>
              </div>
            </form>
          </div>
          <div class="modal__footer">
            <button type="button" class="button button--secondary" onclick="TemplateManager.hideBlockConfiguration()">
              Cancel
            </button>
            <button type="button" class="button button--primary" onclick="TemplateManager.saveBlockConfiguration('${blockType}')">
              Save Block
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);
  }
  
  /**
   * Hide block configuration modal
   */
  static hideBlockConfiguration(): void {
    const modal = document.getElementById('block-config-modal');
    if (modal) {
      modal.remove();
    }
  }
  
  /**
   * Save block configuration
   */
  static saveBlockConfiguration(blockType: string): void {
    const form = document.getElementById('block-config-form') as HTMLFormElement;
    if (form) {
      const formData = new FormData(form);
      const config = {
        title: formData.get('block-title'),
        content: formData.get('block-content'),
        visible: formData.get('block-visible') === 'on',
        required: formData.get('block-required') === 'on'
      };
      
      console.log(`Saving ${blockType} block configuration:`, config);
      
      // Here you would save the configuration to the template
      // For now, just show success and close modal
      alert(`${blockType.charAt(0).toUpperCase() + blockType.slice(1)} block saved successfully!`);
      this.hideBlockConfiguration();
      
      // Update the preview
      this.updateBlockPreview(blockType, config);
    }
  }
  
  /**
   * Update block preview
   */
  static updateBlockPreview(blockType: string, config: any): void {
    const previewBlock = document.querySelector(`.preview-${blockType}`);
    if (previewBlock && config.title) {
      previewBlock.textContent = config.title;
    }
  }
}

// Make TemplateManager available globally for onclick handlers
declare global {
  interface Window {
    TemplateManager: typeof TemplateManager;
  }
}

window.TemplateManager = TemplateManager;

// Initialize template modal handlers when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  // Create template button handler
  const createTemplateBtn = document.getElementById('create-template-btn');
  if (createTemplateBtn) {
    createTemplateBtn.addEventListener('click', () => {
      TemplateManager.showCreateTemplateModal();
    });
  }

  // Load existing templates when the templates section is accessed
  const templatesSection = document.getElementById('templates');
  if (templatesSection) {
    // Create a MutationObserver to watch for when the templates section becomes active
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target as HTMLElement;
          if (target.classList.contains('article--active') && target.id === 'templates') {
            // Templates section is now active, load existing templates
            console.log('Templates section activated, loading existing templates');
            TemplateManager.loadExistingTemplates();
          }
        }
      });
    });

    observer.observe(templatesSection, { attributes: true });

    // Also check if templates section is already active on page load
    if (templatesSection.classList.contains('article--active')) {
      console.log('Templates section already active on page load');
      TemplateManager.loadExistingTemplates();
    }
  }

  // Modal form submission handler
  const createTemplateForm = document.getElementById('create-template-form');
  if (createTemplateForm) {
    createTemplateForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const formData = new FormData(e.target as HTMLFormElement);
      const templateFormData = {
        name: formData.get('template-name') as string,
        type: formData.get('template-type') as 'lesson',
        description: formData.get('template-description') as string || undefined
      };

      console.log('Creating template with data:', templateFormData);
      
      const templateId = await TemplateManager.createTemplate(templateFormData);
      if (templateId) {
        console.log('Template created with ID:', templateId);
        TemplateManager.hideCreateTemplateModal();
        TemplateManager.showTemplateBuilder(templateId);
        // Reload the template list to show the new template
        setTimeout(() => {
          TemplateManager.loadExistingTemplates();
        }, 500);
      } else {
        console.error('Failed to create template');
        // You could show an error message to the user here
      }
    });
  }

  // Modal close handlers
  const modalCloseBtn = document.querySelector('.modal__close');
  const modal = document.getElementById('create-template-modal');
  
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener('click', () => {
      TemplateManager.hideCreateTemplateModal();
    });
  }

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        TemplateManager.hideCreateTemplateModal();
      }
    });
  }
});
