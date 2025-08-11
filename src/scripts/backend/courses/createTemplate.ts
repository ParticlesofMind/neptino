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
  private static selectedTemplateId: string | null = null;
  private static currentlyLoadedTemplateId: string | null = null;
  private static currentlyLoadedTemplateData: any = null;

  /**
   * Shows the create template modal
   */
  static showCreateTemplateModal(): void {
    const modal = document.getElementById('create-template-modal') as HTMLElement;
    if (!modal) {
      console.error('Create template modal not found');
      return;
    }

    // Clear the form for new template creation
    const form = modal.querySelector('#create-template-form') as HTMLFormElement;
    if (form) {
      form.reset();
    }

    modal.style.display = 'flex';
    modal.classList.add('modal--active');
  }

  /**
   * Hides the create template modal
   */
  static hideCreateTemplateModal(): void {
    const modal = document.getElementById('create-template-modal');
    if (modal) {
      modal.classList.remove('modal--active');
      
      setTimeout(() => {
        modal.style.display = 'none';
      }, 300);
    }
  }

  /**
   * Shows the load template modal
   */
  static async showLoadTemplateModal(): Promise<void> {
    const modal = document.getElementById('load-template-modal');
    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('modal--active');
      
      // Load templates when modal is shown
      await this.loadTemplatesForModal();
      
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
   * Hides the load template modal
   */
  static hideLoadTemplateModal(): void {
    const modal = document.getElementById('load-template-modal');
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
      
      // Clear selection
      this.selectedTemplateId = null;
      this.updateLoadButtonState();
    }
  }

  /**
   * Loads templates for the modal display
   */
  static async loadTemplatesForModal(): Promise<void> {
    const loadingEl = document.getElementById('template-loading');
    const contentEl = document.getElementById('template-list-content');
    const noTemplatesEl = document.getElementById('no-templates-message');

    if (loadingEl) loadingEl.style.display = 'flex';
    if (contentEl) contentEl.style.display = 'none';
    if (noTemplatesEl) noTemplatesEl.style.display = 'none';

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

      if (loadingEl) loadingEl.style.display = 'none';

      if (!data || data.length === 0) {
        if (noTemplatesEl) noTemplatesEl.style.display = 'flex';
      } else {
        this.displayTemplatesInModal(data);
        if (contentEl) contentEl.style.display = 'grid';
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      if (loadingEl) loadingEl.style.display = 'none';
      if (noTemplatesEl) {
        noTemplatesEl.innerHTML = `
          <div class="no-templates__icon">⚠</div>
          <h3>Error Loading Templates</h3>
          <p>There was an error loading your templates. Please try again.</p>
          <button class="button button--secondary" onclick="TemplateManager.loadTemplatesForModal()">
            Retry
          </button>
        `;
        noTemplatesEl.style.display = 'flex';
      }
    }
  }

  /**
   * Displays templates in the modal
   */
  static displayTemplatesInModal(templates: any[]): void {
    const contentEl = document.getElementById('template-list-content');
    if (!contentEl) return;

    const templatesHtml = templates.map(template => {
      const createdDate = new Date(template.created_at).toLocaleDateString();
      const templateName = template.template_data?.name || 'Untitled Template';
      const description = template.template_description || 'No description provided';
      
      return `
        <div class="template-card" data-template-id="${template.id}" onclick="TemplateManager.selectTemplate('${template.id}')">
          <div class="template-card__header">
            <h4 class="template-card__title">${templateName}</h4>
            <span class="template-card__type">${template.template_type}</span>
          </div>
          <div class="template-card__description">
            ${description}
          </div>
          <div class="template-card__meta">
            <span class="template-card__date">Created: ${createdDate}</span>
          </div>
          <div class="template-card__actions">
            <button class="button button--outline button--small" onclick="event.stopPropagation(); TemplateManager.previewTemplateInModal('${template.id}')">
              Preview
            </button>
            <button class="button button--outline button--small button--danger" onclick="event.stopPropagation(); TemplateManager.deleteTemplate('${template.id}')">
              Delete
            </button>
          </div>
        </div>
      `;
    }).join('');

    contentEl.innerHTML = templatesHtml;
  }

  /**
   * Selects a template in the modal
   */
  static selectTemplate(templateId: string): void {
    // Remove previous selection
    document.querySelectorAll('.template-card').forEach(card => {
      card.classList.remove('template-card--selected');
    });

    // Add selection to current template
    const selectedCard = document.querySelector(`[data-template-id="${templateId}"]`);
    if (selectedCard) {
      selectedCard.classList.add('template-card--selected');
    }

    this.selectedTemplateId = templateId;
    this.updateLoadButtonState();
  }

  /**
   * Updates the load button state
   */
  static updateLoadButtonState(): void {
    const loadButton = document.getElementById('load-selected-template') as HTMLButtonElement;
    if (loadButton) {
      loadButton.disabled = !this.selectedTemplateId;
    }
  }

  /**
   * Loads the selected template
   */
  static async loadSelectedTemplate(): Promise<void> {
    if (!this.selectedTemplateId) return;

    try {
      await this.loadTemplate(this.selectedTemplateId);
      this.hideLoadTemplateModal();
      // The template is now loaded in the config and preview areas
      console.log('Template loaded successfully for editing');
    } catch (error) {
      console.error('Failed to load selected template:', error);
      alert('Failed to load template. Please try again.');
    }
  }

  /**
   * Updates a template field and auto-saves to database
   */
  static async updateTemplateField(templateId: string, blockType: string, fieldName: string, isChecked: boolean): Promise<void> {
    try {
      // Update the currently loaded template data
      if (this.currentlyLoadedTemplateData && this.currentlyLoadedTemplateData.id === templateId) {
        const block = this.currentlyLoadedTemplateData.template_data.blocks.find((b: any) => b.type === blockType);
        if (block) {
          if (isChecked) {
            block.config[fieldName] = true;
          } else {
            delete block.config[fieldName];
          }
        }
        
        // Data is automatically persisted to database via auto-save
      }
      
      // Show saving status
      const statusEl = document.getElementById('template-save-status');
      if (statusEl) {
        statusEl.innerHTML = '<span class="save-indicator__text save-indicator__text--saving">Saving...</span>';
      }
      
      // Get current template data from database
      const { data: currentTemplate, error: fetchError } = await supabase
        .from('templates')
        .select('template_data')
        .eq('id', templateId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Update the specific block's config
      const updatedTemplateData = { ...currentTemplate.template_data };
      const blockToUpdate = updatedTemplateData.blocks.find((block: any) => block.type === blockType);
      
      if (blockToUpdate) {
        if (isChecked) {
          blockToUpdate.config[fieldName] = true;
        } else {
          delete blockToUpdate.config[fieldName];
        }
      }
      
      // Save to database
      const { error: updateError } = await supabase
        .from('templates')
        .update({ 
          template_data: updatedTemplateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);
      
      if (updateError) throw updateError;
      
      // Show success status
      if (statusEl) {
        statusEl.innerHTML = '<span class="save-indicator__text save-indicator__text--saved">Saved</span>';
        setTimeout(() => {
          statusEl.innerHTML = '<span class="save-indicator__text">Changes saved automatically</span>';
        }, 2000);
      }
      
      // Update the preview
      this.updateTemplatePreview();
      
    } catch (error) {
      console.error('Failed to update template field:', error);
      
      // Show error status
      const statusEl = document.getElementById('template-save-status');
      if (statusEl) {
        statusEl.innerHTML = '<span class="save-indicator__text save-indicator__text--error">Error saving</span>';
        setTimeout(() => {
          statusEl.innerHTML = '<span class="save-indicator__text">Changes saved automatically</span>';
        }, 3000);
      }
    }
  }

  /**
   * Saves changes to a template
   */
  static async saveTemplateChanges(templateId: string): Promise<void> {
    try {
      // This would typically gather data from the configuration forms
      // For now, just show a success message
      console.log('Saving template changes for:', templateId);
      alert('Template changes saved successfully!');
    } catch (error) {
      console.error('Failed to save template changes:', error);
      alert('Failed to save template changes. Please try again.');
    }
  }

  /**
   * Previews a template in a mini modal
   */
  static async previewTemplateInModal(templateId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;

      // Create a simple preview modal
      const previewHtml = `
        <div class="template-preview-modal" onclick="this.remove()">
          <div class="template-preview-modal__content" onclick="event.stopPropagation()">
            <div class="template-preview-modal__header">
              <h3>${data.template_data?.name || 'Template Preview'}</h3>
              <button onclick="this.closest('.template-preview-modal').remove()">&times;</button>
            </div>
            <div class="template-preview-modal__body">
              <div class="template-blocks-preview">
                ${data.template_data?.blocks?.map((block: any) => `
                  <div class="preview-block preview-block--${block.type}">
                    <div class="preview-block__label">${block.type.charAt(0).toUpperCase() + block.type.slice(1)}</div>
                    <div class="preview-block__content">${block.content || 'No content'}</div>
                  </div>
                `).join('') || '<p>No blocks configured</p>'}
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', previewHtml);
    } catch (error) {
      console.error('Failed to preview template:', error);
      alert('Failed to load template preview.');
    }
  }

  /**
   * Deletes a template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    const confirmation = confirm('Are you sure you want to delete this template? This action cannot be undone.');
    if (!confirmation) return;

    try {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      // Reload templates in modal
      await this.loadTemplatesForModal();
      
      console.log('Template deleted successfully');
    } catch (error) {
      console.error('Failed to delete template:', error);
      alert('Failed to delete template. Please try again.');
    }
  }

  /**
   * Filters templates based on search term
   */
  static filterTemplates(searchTerm: string): void {
    const templateCards = document.querySelectorAll('.template-card');
    
    templateCards.forEach(card => {
      const title = card.querySelector('.template-card__title')?.textContent?.toLowerCase() || '';
      const description = card.querySelector('.template-card__description')?.textContent?.toLowerCase() || '';
      const type = card.querySelector('.template-card__type')?.textContent?.toLowerCase() || '';
      
      const matchesSearch = title.includes(searchTerm) || 
                           description.includes(searchTerm) || 
                           type.includes(searchTerm);
      
      (card as HTMLElement).style.display = matchesSearch ? 'block' : 'none';
    });
  }

  /**
   * Applies filters and sorting to templates
   */
  static applyFiltersAndSort(): void {
    const typeFilter = document.getElementById('template-type-filter') as HTMLSelectElement;
    const sortFilter = document.getElementById('template-sort') as HTMLSelectElement;
    const searchInput = document.getElementById('template-search') as HTMLInputElement;
    
    if (!typeFilter || !sortFilter) return;

    const selectedType = typeFilter.value;
    const sortBy = sortFilter.value;
    const searchTerm = searchInput?.value?.toLowerCase() || '';

    const container = document.getElementById('template-list-content');
    if (!container) return;

    const templateCards = Array.from(container.querySelectorAll('.template-card')) as HTMLElement[];
    
    // Filter by type and search
    templateCards.forEach(card => {
      const cardType = card.querySelector('.template-card__type')?.textContent?.toLowerCase() || '';
      const title = card.querySelector('.template-card__title')?.textContent?.toLowerCase() || '';
      const description = card.querySelector('.template-card__description')?.textContent?.toLowerCase() || '';
      
      const matchesType = !selectedType || cardType === selectedType;
      const matchesSearch = !searchTerm || 
                           title.includes(searchTerm) || 
                           description.includes(searchTerm) || 
                           cardType.includes(searchTerm);
      
      card.style.display = (matchesType && matchesSearch) ? 'block' : 'none';
    });

    // Sort visible cards
    const visibleCards = templateCards.filter(card => card.style.display !== 'none');
    
    visibleCards.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          const nameA = a.querySelector('.template-card__title')?.textContent || '';
          const nameB = b.querySelector('.template-card__title')?.textContent || '';
          return nameA.localeCompare(nameB);
        case 'created_at':
          // For created_at, we assume newer templates are shown first by default
          // This would require storing the actual date in a data attribute for proper sorting
          return 0; // Keep original order for now
        case 'modified_at':
          // Similar to created_at - would need modification date stored
          return 0; // Keep original order for now
        default:
          return 0;
      }
    });

    // Re-append sorted cards
    visibleCards.forEach(card => {
      container.appendChild(card);
    });
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
          config: { 
            lesson_number: true,
            lesson_title: true,
            module_title: true,
            course_title: true,
            institution_name: true
          },
          content: '<div class="header-section">{{header}}</div>'
        },
        {
          id: 'program-1',
          type: 'program',
          order: 2,
          config: { 
            competence: true,
            topic: true,
            objective: true,
            task: true
          },
          content: '<div class="program-section">{{program}}</div>'
        },
        {
          id: 'resources-1',
          type: 'resources',
          order: 3,
          config: { 
            task: true,
            type: true,
            origin: true
          },
          content: '<div class="resources-section">{{resources}}</div>'
        },
        {
          id: 'content-1',
          type: 'content',
          order: 4,
          config: { 
            instruction_title: true,
            instruction_area: true,
            student_title: true,
            student_area: true,
            teacher_title: true,
            teacher_area: true
          },
          content: '<div class="content-section">{{content}}</div>'
        },
        {
          id: 'assignment-1',
          type: 'assignment',
          order: 5,
          config: { 
            instruction_title: true,
            instruction_area: true,
            student_title: true,
            student_area: true,
            teacher_title: true,
            teacher_area: true
          },
          content: '<div class="assignment-section">{{assignment}}</div>'
        },
        {
          id: 'footer-1',
          type: 'footer',
          order: 6,
          config: { 
            copyright: true,
            page_number: true
          },
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
      // If we have a currently loaded template, display it instead of the placeholder
      if (this.currentlyLoadedTemplateData) {
        console.log('Displaying currently loaded template:', this.currentlyLoadedTemplateData);
        this.displayTemplateBlocks(this.currentlyLoadedTemplateData);
        this.updateTemplatePreview(this.currentlyLoadedTemplateData);
        return;
      }

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
        <div class="template-config-placeholder">
          <h3 class="heading heading--tertiary">Template Configuration</h3>
          <p class="text">You haven't created any templates yet. Create your first template to get started!</p>
          <div class="template-actions">
            <button class="button button--primary" onclick="TemplateManager.showCreateTemplateModal()">
              Create First Template
            </button>
          </div>
        </div>
      `;
      return;
    }

    // If templates exist, show the configuration interface instead of a list
    // The Load Template button in the header will handle template selection
    configArea.innerHTML = `
      <div class="template-config-placeholder">
        <h3 class="heading heading--tertiary">Template Configuration</h3>
        <p class="text">Use the "Load Template" button above to select and edit an existing template, or create a new one.</p>
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
      // Use the existing placeholder structure from HTML instead of generating new HTML
      const placeholder = configArea.querySelector('.template-config-placeholder');
      if (placeholder) {
        placeholder.innerHTML = `
          <h3 class="heading heading--tertiary">Template Configuration</h3>
          <p class="text">Template configuration interface is ready. Use the buttons above to create or load templates.</p>
        `;
      }
    }
    
    if (previewArea) {
      const previewContainer = previewArea.querySelector('.preview-container');
      if (previewContainer) {
        previewContainer.innerHTML = `
          <div class="preview-placeholder">
            <h4 class="preview-placeholder__title">Template Preview</h4>
            <p class="preview-placeholder__text">Create a new template or load an existing one to see the preview here.</p>
            <div class="template-blocks-default">
              <div class="template-block template-block--header">Header Block</div>
              <div class="template-block template-block--program">Program Block</div>
              <div class="template-block template-block--resources">Resources Block</div>
              <div class="template-block template-block--content">Content Block</div>
              <div class="template-block template-block--assignment">Assignment Block</div>
              <div class="template-block template-block--footer">Footer Block</div>
            </div>
          </div>
        `;
      }
    }
  }

  /**
   * Loads an existing template for editing
   */
  /**
   * Clears the current template state
   */
  static clearTemplateState(): void {
    this.currentlyLoadedTemplateId = null;
    this.currentlyLoadedTemplateData = null;
    
    // Template state is now managed via database
    
    // Reset the template areas to placeholder state
    const templateConfig = document.querySelector('.template-config');
    if (templateConfig) {
      const placeholder = templateConfig.querySelector('.template-config-placeholder');
      if (placeholder) {
        placeholder.innerHTML = `
          <h3 class="heading heading--tertiary">Template Configuration</h3>
          <p class="text">Select a template to configure or create a new one...</p>
        `;
      }
    }

    const previewContainer = document.querySelector('.preview-container');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="template-preview-placeholder">
          <h4>Template Preview</h4>
          <p>Template preview will appear here when you load a template...</p>
        </div>
      `;
    }
  }

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

      // Get current course ID and associate template with it
      const courseId = sessionStorage.getItem('currentCourseId');
      if (courseId && data.course_id !== courseId) {
        console.log('Associating template with current course:', courseId);
        
        // Update the template to be associated with current course
        const { error: updateError } = await supabase
          .from('templates')
          .update({ course_id: courseId })
          .eq('id', templateId);
          
        if (updateError) {
          console.error('Failed to associate template with course:', updateError);
        } else {
          console.log('Template successfully associated with course');
        }
      }

      // Store the loaded template data  
      this.currentlyLoadedTemplateId = data.id; // Store UUID for database operations
      this.currentlyLoadedTemplateData = data;

      // Populate the template configuration area with blocks
      this.displayTemplateBlocks(data);
      
      // Update the preview area with template content
      this.updateTemplatePreview(data.template_data);
    } catch (error) {
      console.error('Failed to load template:', error);
    }
  }

  /**
   * Loads template associated with current course from database
   */
  static async loadCourseTemplate(): Promise<void> {
    try {
      const courseId = sessionStorage.getItem('currentCourseId');
      console.log('Attempting to load template for course ID:', courseId);
      
      if (!courseId) {
        console.log('No current course ID found in sessionStorage');
        // Try to get the most recent course if no courseId is set
        const { data: recentCourse, error: courseError } = await supabase
          .from('courses')
          .select('id')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
          
        if (!courseError && recentCourse) {
          console.log('Using most recent course:', recentCourse.id);
          sessionStorage.setItem('currentCourseId', recentCourse.id);
          return this.loadCourseTemplate(); // Recursive call with course ID now set
        } else {
          console.log('No courses found, showing template selection');
          this.loadExistingTemplates();
          return;
        }
      }

      console.log('Loading template for course:', courseId);
      
      // Query database for template associated with this course
      const { data: template, error } = await supabase
        .from('templates')
        .select('*')
        .eq('course_id', courseId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
        console.error('Error loading course template:', error);
        this.loadExistingTemplates();
        return;
      }

      if (template) {
        console.log('Found existing template for course:', template.template_id);
        
        // Load the template
        this.currentlyLoadedTemplateId = template.id; // Store UUID for database operations
        this.currentlyLoadedTemplateData = template;

        // Populate the template configuration area with blocks
        this.displayTemplateBlocks(template);
        
        // Update the preview area with template content
        this.updateTemplatePreview(template.template_data);
      } else {
        console.log('No template found for course, showing template selection');
        this.loadExistingTemplates();
      }
    } catch (error) {
      console.error('Failed to load course template:', error);
      // Fallback to showing template list
      this.loadExistingTemplates();
    }
  }

  /**
   * Gets the field configuration for each block type
   */
  static getBlockFieldConfiguration(): Record<string, Array<{name: string, label: string, mandatory: boolean, separator?: boolean}>> {
    return {
      header: [
        { name: 'lesson_number', label: 'Lesson number (#)', mandatory: true },
        { name: 'lesson_title', label: 'Lesson title', mandatory: true },
        { name: 'module_title', label: 'Module title', mandatory: true },
        { name: 'course_title', label: 'Course title', mandatory: true },
        { name: 'institution_name', label: 'Institution name', mandatory: true },
        { name: 'teacher_name', label: 'Teacher name', mandatory: false }
      ],
      program: [
        { name: 'competence', label: 'Competence', mandatory: true },
        { name: 'topic', label: 'Topic', mandatory: true },
        { name: 'objective', label: 'Objective', mandatory: true },
        { name: 'task', label: 'Task', mandatory: true }
      ],
      resources: [
        { name: 'task', label: 'Task', mandatory: true },
        { name: 'type', label: 'Type', mandatory: true },
        { name: 'origin', label: 'Origin', mandatory: true },
        { name: 'state', label: 'State', mandatory: false },
        { name: 'quality', label: 'Quality', mandatory: false },
        { name: 'include_glossary', label: 'Include Glossary', mandatory: false, separator: true },
        { name: 'historical_figures', label: 'Historical figures', mandatory: false },
        { name: 'terminology', label: 'Terminology', mandatory: false },
        { name: 'concepts', label: 'Concepts', mandatory: false }
      ],
      content: [
        { name: 'instruction_title', label: 'Instruction title', mandatory: true },
        { name: 'instruction_area', label: 'Instruction area', mandatory: true },
        { name: 'student_title', label: 'Student Title', mandatory: true },
        { name: 'student_area', label: 'Student Area', mandatory: true },
        { name: 'teacher_title', label: 'Teacher title', mandatory: true },
        { name: 'teacher_area', label: 'Teacher area', mandatory: true }
      ],
      assignment: [
        { name: 'instruction_title', label: 'Instruction title', mandatory: true },
        { name: 'instruction_area', label: 'Instruction area', mandatory: true },
        { name: 'student_title', label: 'Student Title', mandatory: true },
        { name: 'student_area', label: 'Student Area', mandatory: true },
        { name: 'teacher_title', label: 'Teacher title', mandatory: true },
        { name: 'teacher_area', label: 'Teacher area', mandatory: true }
      ],
      footer: [
        { name: 'copyright', label: 'Copyright', mandatory: true },
        { name: 'teacher_name', label: 'Teacher name', mandatory: false },
        { name: 'institution_name', label: 'Institution name', mandatory: false },
        { name: 'page_number', label: 'Page number (#)', mandatory: true }
      ]
    };
  }

  /**
   * Displays the template blocks in the configuration area
   */
  static displayTemplateBlocks(templateData: any): void {
    const configArea = document.querySelector('.template-config');
    if (!configArea) return;

    // Handle both full template object and just template_data
    const actualData = templateData.template_data || templateData;
    const blocks = actualData.blocks || [];
    const templateId = templateData.id || this.currentlyLoadedTemplateId;
    const fieldConfig = this.getBlockFieldConfiguration();

    const blocksHtml = `
      <div class="template-blocks">
        ${blocks.map((block: TemplateBlock) => {
          const fields = fieldConfig[block.type] || [];
          
          return `
            <div class="template-block-config" data-block="${block.type}" data-template-id="${templateId}">
              <div class="template-block-config__header">
                <div class="template-block-item__icon template-block-item__icon--${block.type}"></div>
                <h4 class="template-block-config__title">${block.type.charAt(0).toUpperCase() + block.type.slice(1)}</h4>
              </div>
              <div class="template-block-config__fields" data-block="${block.type}">
                ${fields.map(field => {
                  // Check if field is enabled in template data
                  const isChecked = field.mandatory || (block.config && block.config[field.name] === true);
                  
                  return `
                  ${field.separator ? '<div class="template-field-separator"></div>' : ''}
                  <div class="template-field ${field.separator ? 'template-field--separator' : ''}">
                    <label class="template-field__label">
                      <input 
                        type="checkbox" 
                        name="${field.name}" 
                        data-block="${block.type}"
                        data-template-id="${templateData.id}"
                        ${field.mandatory ? 'checked disabled' : (isChecked ? 'checked' : '')}
                        onchange="TemplateManager.updateTemplateField('${templateId}', '${block.type}', '${field.name}', this.checked)"
                        class="template-field__checkbox"
                      >
                      <span class="template-field__text">
                        ${field.label}
                      </span>
                    </label>
                  </div>
                `;}).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    configArea.innerHTML = blocksHtml;
    
    // Update template preview after displaying blocks
    this.updateTemplatePreview(templateData);
  }

  /**
   * Gets description for a block type
   */
  static getBlockDescription(blockType: string): string {
    const descriptions: Record<string, string> = {
      header: 'Title and introduction section',
      program: 'Learning objectives and outcomes',
      resources: 'Files, links, and materials',
      content: 'Main lesson content and materials',
      assignment: 'Tasks and submissions',
      footer: 'Credits and additional information'
    };
    return descriptions[blockType] || 'Block configuration';
  }

  /**
   * Initializes an empty template configuration
   */
  static initializeEmptyTemplate(): void {
    console.log('Initializing empty template interface');
    
    // Clear any existing configuration forms
    const forms = document.querySelectorAll('.template-config form');
    forms.forEach(form => {
      (form as HTMLFormElement).reset();
    });

    // Create a basic template structure to display
    const basicTemplate = {
      template_data: {
        name: 'New Template',
        blocks: [
          { id: 'header-1', type: 'header', order: 1, config: {}, content: 'Header content will appear here' },
          { id: 'program-1', type: 'program', order: 2, config: {}, content: 'Learning objectives will appear here' },
          { id: 'resources-1', type: 'resources', order: 3, config: {}, content: 'Resources will appear here' },
          { id: 'content-1', type: 'content', order: 4, config: {}, content: 'Main content will appear here' },
          { id: 'assignment-1', type: 'assignment', order: 5, config: {}, content: 'Assignment details will appear here' },
          { id: 'footer-1', type: 'footer', order: 6, config: {}, content: 'Footer content will appear here' }
        ]
      }
    };

    // Display the template blocks and preview
    this.displayTemplateBlocks(basicTemplate);
    this.updateTemplatePreview(basicTemplate);
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
  static updateTemplatePreview(templateData?: any): void {
    const previewContainer = document.querySelector('.preview-container');
    if (!previewContainer) return;

    // Use current template data if none provided
    const data = templateData || this.currentlyLoadedTemplateData;
    
    // Handle both full template object and just template_data
    const actualData = data?.template_data || data;
    
    if (!actualData || !actualData.blocks) {
      previewContainer.innerHTML = `
        <div class="preview-placeholder">
          <h4 class="preview-placeholder__title">No Template Selected</h4>
          <p class="preview-placeholder__text">Create a new template or select an existing one to see the preview here.</p>
        </div>
      `;
      return;
    }

    const blocks = actualData.blocks || [];
    const templateName = actualData.name || 'Untitled Template';
    
    // Sort blocks by order and render them
    const sortedBlocks = blocks.sort((a: TemplateBlock, b: TemplateBlock) => a.order - b.order);
    
    const blocksHtml = sortedBlocks.map((block: TemplateBlock) => {
      const checkedFields = this.getCheckedFields(block.type);
      
      return `
        <div class="template-preview-block template-preview-block--${block.type}">
          <div class="template-preview-block__header">
            <h4 class="template-preview-block__title">${block.type.charAt(0).toUpperCase() + block.type.slice(1)}</h4>
          </div>
          <div class="template-preview-block__content">
            ${this.renderBlockContent(block.type, checkedFields)}
          </div>
        </div>
      `;
    }).join('');

    previewContainer.innerHTML = `


        ${blocksHtml}
    
    `;
  }

  /**
   * Gets the currently checked fields for a block type from template data
   */
  static getCheckedFields(blockType: string): Array<{name: string, label: string}> {
    const fieldConfig = this.getBlockFieldConfiguration();
    const blockFields = fieldConfig[blockType] || [];
    const checkedFields: Array<{name: string, label: string}> = [];
    
    blockFields.forEach(field => {
      // Include mandatory fields (always checked)
      if (field.mandatory) {
        checkedFields.push({ name: field.name, label: field.label });
      } else {
        // Include optional fields that are checked in template data
        if (this.currentlyLoadedTemplateData) {
          const block = this.currentlyLoadedTemplateData.template_data.blocks.find((b: any) => b.type === blockType);
          if (block && block.config && block.config[field.name] === true) {
            checkedFields.push({ name: field.name, label: field.label });
          }
        }
      }
    });
    
    return checkedFields;
  }

  /**
   * Renders the content for a specific block type
   */
  static renderBlockContent(blockType: string, checkedFields: Array<{name: string, label: string}>): string {
    if (blockType === 'resources') {
      return this.renderResourcesBlockContent(checkedFields);
    }
    
    if (blockType === 'content' || blockType === 'assignment') {
      return this.renderNestedBlockContent(blockType, checkedFields);
    }
    
    // Default table rendering for other blocks
    return `
      <div class="template-preview-table">
        <div class="template-preview-table__header">
          ${checkedFields.map(field => `
            <div class="template-preview-table__column-header">${field.label}</div>
          `).join('')}
        </div>
        <div class="template-preview-table__row">
          ${checkedFields.map(field => `
            <div class="template-preview-table__cell">[${field.label}]</div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renders the nested hierarchical content for Content and Assignment blocks
   */
  static renderNestedBlockContent(_blockType: string, checkedFields: Array<{name: string, label: string}>): string {
    let html = `<div class="template-nested-structure">`;
    
    // Add the fixed hierarchy with proper nesting indentation
    html += `
      <div class="template-hierarchy">
        <div class="template-hierarchy-level template-hierarchy-level-1">Topic</div>
        <div class="template-hierarchy-level template-hierarchy-level-2">Objective</div>
        <div class="template-hierarchy-level template-hierarchy-level-3">Task</div>
        
        <div class="template-content-fields">
          ${checkedFields.map(field => `
            <div class="template-content-field template-hierarchy-level-4">
              ${field.label}
            </div>
          `).join('')}
        </div>
      </div>
    `;
    
    html += `</div>`;
    
    return html;
  }

  /**
   * Renders the special Resources block content with optional glossary table
   */
  static renderResourcesBlockContent(checkedFields: Array<{name: string, label: string}>): string {
    // Get main resource fields (excluding glossary items)
    const mainFields = checkedFields.filter(field => 
      !['include_glossary', 'historical_figures', 'terminology', 'concepts'].includes(field.name)
    );
    
    // Check if glossary is included
    const includeGlossary = checkedFields.some(field => field.name === 'include_glossary');
    
    // Get glossary items that are selected
    const glossaryItems = checkedFields.filter(field => 
      ['historical_figures', 'terminology', 'concepts'].includes(field.name)
    );
    
    let html = '';
    
    // Main resources table
    if (mainFields.length > 0) {
      html += `
        <div class="template-preview-table">
          <div class="template-preview-table__header">
            ${mainFields.map(field => `
              <div class="template-preview-table__column-header">${field.label}</div>
            `).join('')}
          </div>
          <div class="template-preview-table__row">
            ${mainFields.map(field => `
              <div class="template-preview-table__cell">[${field.label}]</div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    // Glossary table (only if glossary is included and items are selected)
    if (includeGlossary && glossaryItems.length > 0) {
      html += `
        <div class="template-preview-glossary">
          <h5 class="template-preview-glossary__title">Glossary</h5>
          <div class="template-preview-table">
            <div class="template-preview-table__header">
              <div class="template-preview-table__column-header">Type</div>
              <div class="template-preview-table__column-header">URL</div>
            </div>
            ${glossaryItems.map(item => `
              <div class="template-preview-table__row">
                <div class="template-preview-table__cell">${item.label}</div>
                <div class="template-preview-table__cell">[URL]</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    return html;
  }

  /**
   * Gets preview content for a block
   */
  static getBlockPreviewContent(block: TemplateBlock): string {
    // If block has custom content, show it (removing HTML tags for preview)
    if (block.content && block.content.trim() !== '') {
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = block.content;
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      return textContent.replace(/\{\{.*?\}\}/g, '[Dynamic Content]') || this.getDefaultBlockContent(block.type);
    }
    
    return this.getDefaultBlockContent(block.type);
  }

  /**
   * Gets default content for block preview
   */
  static getDefaultBlockContent(blockType: string): string {
    const defaultContent: Record<string, string> = {
      header: 'Course title and introduction will appear here',
      program: 'Learning objectives and outcomes will be displayed here',
      resources: 'Files, links, and materials will be listed here',
      content: 'Main lesson content and materials will appear here',
      assignment: 'Tasks and submission instructions will be shown here',
      footer: 'Credits and additional information will appear here'
    };
    return defaultContent[blockType] || 'Block content will appear here';
  }  /**
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

  // Load template button handler
  const loadTemplateBtn = document.getElementById('load-template-btn');
  if (loadTemplateBtn) {
    loadTemplateBtn.addEventListener('click', () => {
      TemplateManager.showLoadTemplateModal();
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
            
            // Check if there's a template for the current course
            TemplateManager.loadCourseTemplate();
          }
        }
      });
    });

    observer.observe(templatesSection, { attributes: true });

    // Also check if templates section is already active on page load
    if (templatesSection.classList.contains('article--active')) {
      console.log('Templates section already active on page load');
      
      // Check if there's a template for the current course
      TemplateManager.loadCourseTemplate();
    }
  }

  // Search functionality for load template modal
  const templateSearch = document.getElementById('template-search');
  if (templateSearch) {
    templateSearch.addEventListener('input', (e) => {
      const searchTerm = (e.target as HTMLInputElement).value.toLowerCase();
      TemplateManager.filterTemplates(searchTerm);
    });
  }

  // Filter functionality
  const typeFilter = document.getElementById('template-type-filter');
  const sortFilter = document.getElementById('template-sort');
  
  if (typeFilter) {
    typeFilter.addEventListener('change', () => {
      TemplateManager.applyFiltersAndSort();
    });
  }
  
  if (sortFilter) {
    sortFilter.addEventListener('change', () => {
      TemplateManager.applyFiltersAndSort();
    });
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
