import { supabase } from "../../supabase.js";
import "./templateConfigHandler.js";
import "./templatePreviewHandler.js";
import '@pixi/layout';

// Import loadTemplates modal to make it available globally
import { loadTemplatesModal } from "./modals/loadTemplates.js";
import { ensureTemplateModals } from "./templateModals.js";
import { ModalHandler } from "../../../navigation/CourseBuilderNavigation.js";

export interface TemplateData {
  template_id: string;
  course_id?: string;
  template_description?: string;
  template_type: "lesson";
  template_data: {
    name: string;
    blocks: TemplateBlock[];
    settings: Record<string, any>;
  };
}

export interface TemplateBlock {
  id: string;
  type:
  | "header"
  | "program"
  | "resources"
  | "content"
  | "assignment"
  | "footer";
  order: number;
  config: Record<string, any>;
  content: string;
}

export class TemplateManager {
  private static currentlyLoadedTemplateId: string | null = null;
  private static currentlyLoadedTemplateData: any = null;

  /**
  * Shows the create template modal
  */
  static showCreateTemplateModal(): void {
    ensureTemplateModals();

    const modal = document.getElementById("create-template-modal") as HTMLElement | null;
    if (!modal) {
      console.error("Create template modal not found");
      return;
    }

    const form = modal.querySelector("#create-template-form") as HTMLFormElement | null;
    form?.reset();

    ModalHandler.getInstance().showModal('create-template-modal');
  }

  /**
  * Hides the create template modal
  */
  static hideCreateTemplateModal(): void {
    const modal = document.getElementById("create-template-modal");
    if (modal?.classList.contains('modal--active')) {
      ModalHandler.getInstance().hideModal();
    }
  }

  /**
  * Shows the load template modal using the new LoadTemplatesModal
  */
  static async showLoadTemplateModal(): Promise<void> {
    ensureTemplateModals();

    loadTemplatesModal.setOnTemplateSelected((templateId: string) => {
      this.loadTemplate(templateId);
    });

    await loadTemplatesModal.show();
  }

  static hideLoadTemplateModal(): void {
    const modal = document.getElementById('load-template-modal');
    if (modal?.classList.contains('modal--active')) {
      loadTemplatesModal.hide();
    }
  }

  /**
  * Updates a template field and auto-saves to database
  */
  static async updateTemplateField(
    templateId: string,
    blockType: string,
    fieldName: string,
    isChecked: boolean,
  ): Promise<void> {
    try {
      // Update the currently loaded template data
      if (
        this.currentlyLoadedTemplateData &&
        this.currentlyLoadedTemplateData.id === templateId
      ) {
        const block =
          this.currentlyLoadedTemplateData.template_data.blocks.find(
            (b: any) => b.type === blockType,
          );
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
      const statusEl = document.getElementById("template-save-status");
      if (statusEl) {
        statusEl.innerHTML =
          '<span class="save-indicator__text save-indicator__text--saving">Saving...</span>';
      }

      // Get current template data from database
      const { data: currentTemplate, error: fetchError } = await supabase
        .from("templates")
        .select("template_data")
        .eq("id", templateId)
        .single();

      if (fetchError) throw fetchError;

      // Update the specific block's config
      const updatedTemplateData = { ...currentTemplate.template_data };
      const blockToUpdate = updatedTemplateData.blocks.find(
        (block: any) => block.type === blockType,
      );

      if (blockToUpdate) {
        if (isChecked) {
          blockToUpdate.config[fieldName] = true;
        } else {
          delete blockToUpdate.config[fieldName];
        }
      }

      // Save to database
      const { error: updateError } = await supabase
        .from("templates")
        .update({
          template_data: updatedTemplateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", templateId);

      if (updateError) throw updateError;

      // Show success status
      if (statusEl) {
        statusEl.innerHTML =
          '<span class="save-indicator__text save-indicator__text--saved">Saved</span>';
        setTimeout(() => {
          statusEl.innerHTML =
            '<span class="">Changes saved automatically</span>';
        }, 2000);
      }

      // Update the preview
      this.updateTemplatePreview();
    } catch (error) {
      console.error("Failed to update template field:", error);

      // Show error status
      const statusEl = document.getElementById("template-save-status");
      if (statusEl) {
        statusEl.innerHTML =
          '<span class="save-indicator__text save-indicator__text--error">Error saving</span>';
        setTimeout(() => {
          statusEl.innerHTML =
            '<span class="">Changes saved automatically</span>';
        }, 3000);
      }
    }
  }

  /**
  * Saves changes to a template
  */
  static async saveTemplateChanges(): Promise<void> {
    try {
      // This would typically gather data from the configuration forms
      // For now, just show a success message
      alert("Template changes saved successfully!");
    } catch (error) {
      console.error("Failed to save template changes:", error);
      alert("Failed to save template changes. Please try again.");
    }
  }

  /**
  * Creates a new template with default blocks
  */
  static async createTemplate(formData: {
    name: string;
    type: "lesson";
    description?: string;
  }): Promise<string | null> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Generate a unique template ID
      const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create default blocks for the template
      const defaultBlocks: TemplateBlock[] = [
        {
          id: "header-1",
          type: "header",
          order: 1,
          config: {
            lesson_number: true,
            lesson_title: true,
            module_title: true,
            course_title: true,
            institution_name: true,
          },
          content: '<div class="header-section">{{header}}</div>',
        },
        {
          id: "program-1",
          type: "program",
          order: 2,
          config: {
            competence: true,
            topic: true,
            objective: true,
            task: true,
          },
          content: '<div class="program-section">{{program}}</div>',
        },
        {
          id: "resources-1",
          type: "resources",
          order: 3,
          config: {
            task: true,
            type: true,
            origin: true,
          },
          content: '<div class="resources-section">{{resources}}</div>',
        },
        {
          id: "content-1",
          type: "content",
          order: 4,
          config: {
            instruction_area: true,
            student_area: true,
            teacher_area: true,
          },
          content: '<div class="content-section">{{content}}</div>',
        },
        {
          id: "assignment-1",
          type: "assignment",
          order: 5,
          config: {
            instruction_area: true,
            student_area: true,
            teacher_area: true,
          },
          content: '<div class="assignment-section">{{assignment}}</div>',
        },
        {
          id: "footer-1",
          type: "footer",
          order: 6,
          config: {
            copyright: true,
            page_number: true,
          },
          content: '<footer class="template-footer">{{footer}}</footer>',
        },
      ];

      const templateData: TemplateData = {
        template_id: templateId,
        template_type: formData.type,
        template_description: formData.description,
        template_data: {
          name: formData.name,
          blocks: defaultBlocks,
          settings: {
            version: "1.0",
            created_at: new Date().toISOString(),
          },
        },
      };

      const { data, error } = await supabase
        .from("templates")
        .insert([
          {
            template_id: templateData.template_id,
            template_type: templateData.template_type,
            template_description: templateData.template_description,
            template_data: templateData.template_data,
            created_by: user.id,
            created_at: new Date().toISOString(),
          },
        ])
        .select("id")
        .single();

      if (error) {
        console.error("Error creating template:", error);
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error("Failed to create template:", error);
      return null;
    }
  }

  /**
  * Shows the template configuration and preview areas
  */
  static showTemplateBuilder(templateId?: string): void {
    const templateContainer = document.querySelector(
      ".template",
    ) as HTMLElement;

    if (templateContainer) {
      // Template container is now always visible, no need to change display

      // Wait a bit for the layout to be visible, then initialize
      setTimeout(() => {
        // Initialize the configuration handler if available
        if (window.templateConfigHandler) {
          window.templateConfigHandler.init();
        } else {
          console.warn(
            "Template config handler not available, showing basic interface",
          );
          this.initializeBasicInterface();
        }

        // If templateId is provided, load the template
        if (templateId) {
          this.loadTemplate(templateId);
        } else {
          this.initializeEmptyTemplate();
        }
      }, 100);
    } else {
      console.error("Template container not found");
    }
  }

  /**
  * Loads existing templates from the database
  */
  static async loadExistingTemplates(): Promise<void> {
    try {
      // If we have a currently loaded template, display it instead of the placeholder
      if (this.currentlyLoadedTemplateData) {
        console.log(
          "Displaying currently loaded template:",
          this.currentlyLoadedTemplateData,
        );
        this.displayTemplateBlocks(this.currentlyLoadedTemplateData);
        this.updateTemplatePreview(this.currentlyLoadedTemplateData);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data, error } = await supabase
        .from("templates")
        .select(
          "id, template_id, template_type, template_description, created_at, template_data",
        )
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      this.displayTemplateList(data || []);
    } catch (error) {
      console.error("Failed to load templates:", error);
    }
  }

  /**
   * Displays the list of available templates
   */
  static displayTemplateList(templates: any[]): void {
    const configArea = document.getElementById('template-config-content');
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
  } /**
 * Previews a template without editing
 */
  static async previewTemplate(templateId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) {
        throw error;
      }

      this.updateTemplatePreview(data);
    } catch (error) {
      console.error("Failed to preview template:", error);
    }
  }

  /**
   * Initializes a basic interface when the config handler is not available
   */
  static initializeBasicInterface(): void {
    const configArea = document.getElementById('template-config-content');
    const previewArea = document.getElementById('template-preview-content');

    if (configArea) {
      configArea.innerHTML = `
        <div class="template-config-placeholder">
          <h3 class="heading heading--tertiary">Template Configuration</h3>
          <p class="text">Template configuration interface is ready. Use the buttons above to create or load templates.</p>
        </div>
      `;
    }

    if (previewArea) {
      previewArea.innerHTML = `
        <div class="preview-placeholder">
          <h4>Template Preview</h4>
          <p>Create a new template or load an existing one to see the preview here.</p>
          <div class="template-blocks">
            <div class="block-item block-item--header">Header Block</div>
            <div class="block-item block-item--program">Program Block</div>
            <div class="block-item block-item--resources">Resources Block</div>
            <div class="block-item block-item--content">Content Block</div>
            <div class="block-item block-item--assignment">Assignment Block</div>
            <div class="block-item block-item--footer">Footer Block</div>
          </div>
        </div>
      `;
    }
  } /**
 * Loads an existing template for editing
 */
  /**
   * Clears the current template state
   */
  static clearTemplateState(): void {
    this.currentlyLoadedTemplateId = null;
    this.currentlyLoadedTemplateData = null;

    // Reset the template areas to placeholder state
    const templateConfig = document.getElementById('template-config-content');
    if (templateConfig) {
      templateConfig.innerHTML = `
        <div class="template-config-placeholder">
          <h3 class="heading heading--tertiary">Template Configuration</h3>
          <p class="text">Select a template to configure or create a new one...</p>
        </div>
      `;
    }

    const previewContainer = document.getElementById('template-preview-content');
    if (previewContainer) {
      previewContainer.innerHTML = `
        <div class="preview-placeholder">
          <h4>No Template Selected</h4>
          <p>Template preview will appear here when you load a template...</p>
        </div>
      `;
    }
  } static async loadTemplate(templateId: string): Promise<void> {
    try {
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("id", templateId)
        .single();

      if (error) {
        throw error;
      }

      // Get current course ID and associate template with it
      const courseId = sessionStorage.getItem("currentCourseId");
      if (courseId && data.course_id !== courseId) {

        // Update the template to be associated with current course
        const { error: updateError } = await supabase
          .from("templates")
          .update({ course_id: courseId })
          .eq("id", templateId);

        if (updateError) {
          console.error(
            "Failed to associate template with course:",
            updateError,
          );
        } else {
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
      console.error("Failed to load template:", error);
    }
  }

  /**
  * Loads template associated with current course from database
  */
  static async loadCourseTemplate(): Promise<void> {
    try {
      const courseId = sessionStorage.getItem("currentCourseId");

      if (!courseId) {
        // Try to get the most recent course if no courseId is set
        const { data: recentCourse, error: courseError } = await supabase
          .from("courses")
          .select("id")
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (!courseError && recentCourse) {
          sessionStorage.setItem("currentCourseId", recentCourse.id);
          return this.loadCourseTemplate(); // Recursive call with course ID now set
        } else {
          this.loadExistingTemplates();
          return;
        }
      }

      // Query database for template associated with this course
      const { data: template, error } = await supabase
        .from("templates")
        .select("*")
        .eq("course_id", courseId)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found
        console.error("Error loading course template:", error);
        this.loadExistingTemplates();
        return;
      }

      if (template) {
        console.log(
          "Found existing template for course:",
          template.template_id,
        );

        // Load the template
        this.currentlyLoadedTemplateId = template.id; // Store UUID for database operations
        this.currentlyLoadedTemplateData = template;

        // Populate the template configuration area with blocks
        this.displayTemplateBlocks(template);

        // Update the preview area with template content
        this.updateTemplatePreview(template.template_data);
      } else {
        this.loadExistingTemplates();
      }
    } catch (error) {
      console.error("Failed to load course template:", error);
      // Fallback to showing template list
      this.loadExistingTemplates();
    }
  }

  /**
  * Gets the field configuration for each block type
  */
  static getBlockFieldConfiguration(): Record<
    string,
    Array<{
      name: string;
      label: string;
      mandatory: boolean;
      separator?: boolean;
    }>
  > {
    return {
      header: [
        { name: "lesson_number", label: "Lesson number (#)", mandatory: true },
        { name: "lesson_title", label: "Lesson title", mandatory: true },
        { name: "module_title", label: "Module title", mandatory: true },
        { name: "course_title", label: "Course title", mandatory: true },
        {
          name: "institution_name",
          label: "Institution name",
          mandatory: true,
        },
        { name: "teacher_name", label: "Teacher name", mandatory: false },
      ],
      program: [
        { name: "competence", label: "Competence", mandatory: true },
        { name: "topic", label: "Topic", mandatory: true },
        { name: "objective", label: "Objective", mandatory: true },
        { name: "task", label: "Task", mandatory: true },
      ],
      resources: [
        { name: "task", label: "Task", mandatory: true },
        { name: "type", label: "Type", mandatory: true },
        { name: "origin", label: "Origin", mandatory: true },
        { name: "state", label: "State", mandatory: false },
        { name: "quality", label: "Quality", mandatory: false },
        {
          name: "include_glossary",
          label: "Include Glossary",
          mandatory: false,
          separator: true,
        },
        {
          name: "historical_figures",
          label: "Historical figures",
          mandatory: false,
        },
        { name: "terminology", label: "Terminology", mandatory: false },
        { name: "concepts", label: "Concepts", mandatory: false },
      ],
      content: [

        {
          name: "instruction_area",
          label: "Instruction area",
          mandatory: true,
        },

        {
          name: "student_area",
          label: "Student Area",
          mandatory: true
        },

        {
          name: "teacher_area",
          label: "Teacher area",
          mandatory: true
        },
      ],
      assignment: [

        {
          name: "instruction_area",
          label: "Instruction area",
          mandatory: true,
        },
        { name: "student_area", 
          label: "Student Area", mandatory: true 
        },
        { name: "teacher_area", label: "Teacher area", mandatory: true },
      ],
      footer: [
        { name: "copyright", label: "Copyright", mandatory: true },
        { name: "teacher_name", label: "Teacher name", mandatory: false },
        {
          name: "institution_name",
          label: "Institution name",
          mandatory: false,
        },
        { name: "page_number", label: "Page number (#)", mandatory: true },
      ],
    };
  }

  /**
   * Displays the template blocks in the configuration area
   */
  static displayTemplateBlocks(templateData: any): void {
    const configArea = document.getElementById('template-config-content');
    if (!configArea) {
      console.error('Template config content area not found');
      return;
    }

    // Handle both full template object and just template_data
    const actualData = templateData.template_data || templateData;
    const blocks = actualData.blocks || [];
    const templateId = templateData.id || this.currentlyLoadedTemplateId;
    const fieldConfig = this.getBlockFieldConfiguration(); const blocksHtml = `
 <div class="template-blocks">
 ${blocks
        .map((block: TemplateBlock) => {
          const fields = fieldConfig[block.type] || [];

          return `
 <div class="block-config" data-block="${block.type}" data-template-id="${templateId}">
 <div class="">
 <div class="block-item__icon block-item__icon--${block.type}"></div>
 <h4 class="">${block.type.charAt(0).toUpperCase() + block.type.slice(1)}</h4>
 </div>
 <div class="" data-block="${block.type}">
 ${fields
              .map((field) => {
                // Check if field is enabled in template data
                const isChecked =
                  field.mandatory ||
                  (block.config && block.config[field.name] === true);

                return `
 ${field.separator ? '<div class="template-field-separator"></div>' : ""}
 <div class="template-field ${field.separator ? "" : ""}">
 <label class="">
 <input 
 type="checkbox" 
 name="${field.name}" 
 data-block="${block.type}"
 data-template-id="${templateData.id}"
 ${field.mandatory ? "checked disabled" : isChecked ? "checked" : ""}
 onchange="TemplateManager.updateTemplateField('${templateId}', '${block.type}', '${field.name}', this.checked)"
 class="input input--checkbox"
 >
 <span class="">
 ${field.label}
 </span>
 </label>
 </div>
 `;
              })
              .join("")}
 </div>
 </div>
 `;
        })
        .join("")}
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
      header: "Title and introduction section",
      program: "Learning objectives and outcomes",
      resources: "Files, links, and materials",
      content: "Main lesson content and materials",
      assignment: "Tasks and submissions",
      footer: "Credits and additional information",
    };
    return descriptions[blockType] || "Block configuration";
  }

  /**
  * Initializes an empty template configuration
  */
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
        blocks: [
          {
            id: "header-1",
            type: "header",
            order: 1,
            config: {},
            content: "Header content will appear here",
          },
          {
            id: "program-1",
            type: "program",
            order: 2,
            config: {},
            content: "Learning objectives will appear here",
          },
          {
            id: "resources-1",
            type: "resources",
            order: 3,
            config: {},
            content: "Resources will appear here",
          },
          {
            id: "content-1",
            type: "content",
            order: 4,
            config: {},
            content: "Main content will appear here",
          },
          {
            id: "assignment-1",
            type: "assignment",
            order: 5,
            config: {},
            content: "Assignment details will appear here",
          },
          {
            id: "footer-1",
            type: "footer",
            order: 6,
            config: {},
            content: "Footer content will appear here",
          },
        ],
      },
    };

    // Display the template blocks and preview
    this.displayTemplateBlocks(basicTemplate);
    this.updateTemplatePreview(basicTemplate);
  }

  /**
  * Populates the template configuration form
  */
  static populateTemplateConfig(): void {
    // Implementation will be added in template configuration handler
  }

  /**
   * Updates the template preview
   */
  static updateTemplatePreview(templateData?: any): void {
    const previewContainer = document.getElementById('template-preview-content');
    if (!previewContainer) {
      console.error('Template preview content area not found');
      return;
    }

    // Use current template data if none provided
    const data = templateData || this.currentlyLoadedTemplateData;

    // Handle both full template object and just template_data
    const actualData = data?.template_data || data; if (!actualData || !actualData.blocks) {
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

    const blocksHtml = sortedBlocks
      .map((block: TemplateBlock) => {
        const checkedFields = this.getCheckedFields(block.type);

        return `
 <div class="preview-block preview-block--${block.type}">
 <h4 class="preview-block__title">${block.type.charAt(0).toUpperCase() + block.type.slice(1)}</h4>
 ${this.renderBlockContent(block.type, checkedFields)}
 </div>
 `;
      })
      .join("");

    previewContainer.innerHTML = `

 ${blocksHtml}
 
 `;
  }

  /**
  * Gets the currently checked fields for a block type from template data
  */
  static getCheckedFields(
    blockType: string,
  ): Array<{ name: string; label: string }> {
    const fieldConfig = this.getBlockFieldConfiguration();
    const blockFields = fieldConfig[blockType] || [];
    const checkedFields: Array<{ name: string; label: string }> = [];

    blockFields.forEach((field) => {
      // Include mandatory fields (always checked)
      if (field.mandatory) {
        checkedFields.push({ name: field.name, label: field.label });
      } else {
        // Include optional fields that are checked in template data
        if (this.currentlyLoadedTemplateData) {
          const block =
            this.currentlyLoadedTemplateData.template_data.blocks.find(
              (b: any) => b.type === blockType,
            );
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
  static renderBlockContent(
    blockType: string,
    checkedFields: Array<{ name: string; label: string }>,
  ): string {
    if (blockType === "resources") {
      return this.renderResourcesBlockContent(checkedFields);
    }

    if (blockType === "content" || blockType === "assignment") {
      return this.renderNestedBlockContent(blockType, checkedFields);
    }

    // Default table rendering for other blocks - single row with values only
    return `
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 ${checkedFields
        .map(
          (field) => `
 <td>[${field.label}]</td>
 `,
        )
        .join("")}
 </tr>
 </tbody>
 </table>
 `;
  }

  /**
  * Renders the nested hierarchical content for Content and Assignment blocks
  */
  static renderNestedBlockContent(
    _blockType: string,
    checkedFields: Array<{ name: string; label: string }>,
  ): string {
    // Simple table with one cell per row for each field
    if (checkedFields.length === 0) {
      return '<p class="preview-placeholder">No fields selected</p>';
    }

    return `
 <table class="lesson-plan-table">
 <tbody>
 ${checkedFields
        .map(
          (field) => `
 <tr>
 <td>[${field.label}]</td>
 </tr>
 `,
        )
        .join("")}
 </tbody>
 </table>
 `;
  }

  /**
  * Renders the special Resources block content with optional glossary table
  */
  static renderResourcesBlockContent(
    checkedFields: Array<{ name: string; label: string }>,
  ): string {
    // Get main resource fields (excluding glossary items)
    const mainFields = checkedFields.filter(
      (field) =>
        ![
          "include_glossary",
          "historical_figures",
          "terminology",
          "concepts",
        ].includes(field.name),
    );

    // Check if glossary is included
    const includeGlossary = checkedFields.some(
      (field) => field.name === "include_glossary",
    );

    // Get glossary items that are selected
    const glossaryItems = checkedFields.filter((field) =>
      ["historical_figures", "terminology", "concepts"].includes(field.name),
    );

    let html = "";

    // Main resources table - single row with values only
    if (mainFields.length > 0) {
      html += `
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 ${mainFields
          .map(
            (field) => `
 <td>[${field.label}]</td>
 `,
          )
          .join("")}
 </tr>
 </tbody>
 </table>
 `;
    }

    // Glossary table - single row with values only
    if (includeGlossary && glossaryItems.length > 0) {
      html += `
 <h5 class="preview-block__subtitle">Glossary</h5>
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 ${glossaryItems
          .map(
            (item) => `
 <td>[${item.label} - URL]</td>
 `,
          )
          .join("")}
 </tr>
 </tbody>
 </table>
 `;
    }

    return html;
  }

  /**
  * Gets preview content for a block
  */
  static getBlockPreviewContent(block: TemplateBlock): string {
    // If block has custom content, show it (removing HTML tags for preview)
    if (block.content && block.content.trim() !== "") {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = block.content;
      const textContent = tempDiv.textContent || tempDiv.innerText || "";
      return (
        textContent.replace(/\{\{.*?\}\}/g, "[Dynamic Content]") ||
        this.getDefaultBlockContent(block.type)
      );
    }

    return this.getDefaultBlockContent(block.type);
  }

  /**
  * Gets default content for block preview
  */
  static getDefaultBlockContent(blockType: string): string {
    const defaultContent: Record<string, string> = {
      header: "Course title and introduction will appear here",
      program: "Learning objectives and outcomes will be displayed here",
      resources: "Files, links, and materials will be listed here",
      content: "Main lesson content and materials will appear here",
      assignment: "Tasks and submission instructions will be shown here",
      footer: "Credits and additional information will appear here",
    };
    return defaultContent[blockType] || "Block content will appear here";
  } /**
 * Show block configuration modal/interface
 */
  static showBlockConfiguration(blockType: string, templateId?: string): void {
    console.log(
      `Showing configuration for ${blockType} block${templateId ? ` of template ${templateId}` : ""}`,
    );

    // Create an elegant modal for block configuration
    const modalHtml = `
 <div class="modal modal--active" id="block-config-modal">
 <div class="" onclick="TemplateManager.hideBlockConfiguration()"></div>
 <div class="">
 <div class="">
 <h3 class="heading heading--tertiary">Configure ${blockType.charAt(0).toUpperCase() + blockType.slice(1)} Block</h3>
 <button type="button" class="" onclick="TemplateManager.hideBlockConfiguration()">
 <span class="sr-only">Close</span>
 <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 <line x1="18" y1="6" x2="6" y2="18"></line>
 <line x1="6" y1="6" x2="18" y2="18"></line>
 </svg>
 </button>
 </div>
 <div class="">
 <form id="block-config-form" class="form">
 <div class="">
 <label for="block-title" class="">Block Title</label>
 <input type="text" id="block-title" name="block-title" class="" 
 placeholder="Enter block title" value="${blockType.charAt(0).toUpperCase() + blockType.slice(1)}">
 </div>
 <div class="">
 <label for="block-content" class="">Block Content</label>
 <textarea id="block-content" name="block-content" class="" 
 placeholder="Enter block content" rows="6">Configure ${blockType} block settings and content...</textarea>
 </div>
 <div class="">
 <label class="">Block Options</label>
 <div class="">
 <label class="">
 <input type="checkbox" name="block-visible" checked class="input input--checkbox">
 <span class="">Visible in template</span>
 </label>
 <label class="">
 <input type="checkbox" name="block-required" class="input input--checkbox">
 <span class="">Required field</span>
 </label>
 </div>
 </div>
 </form>
 </div>
 <div class="">
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
    document.body.insertAdjacentHTML("beforeend", modalHtml);
  }

  /**
  * Hide block configuration modal
  */
  static hideBlockConfiguration(): void {
    const modal = document.getElementById("block-config-modal");
    if (modal) {
      modal.remove();
    }
  }

  /**
  * Save block configuration
  */
  static saveBlockConfiguration(blockType: string): void {
    const form = document.getElementById(
      "block-config-form",
    ) as HTMLFormElement;
    if (form) {
      const formData = new FormData(form);
      const config = {
        title: formData.get("block-title"),
        content: formData.get("block-content"),
        visible: formData.get("block-visible") === "on",
        required: formData.get("block-required") === "on",
      };

      // Here you would save the configuration to the template
      // For now, just show success and close modal
      alert(
        `${blockType.charAt(0).toUpperCase() + blockType.slice(1)} block saved successfully!`,
      );
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
document.addEventListener("DOMContentLoaded", () => {
  ensureTemplateModals();

  // Create template button handler
  const createTemplateBtn = document.getElementById("create-template-btn");
  if (createTemplateBtn) {
    createTemplateBtn.addEventListener("click", () => {
      TemplateManager.showCreateTemplateModal();
    });
  }

  // Load template button handler
  const loadTemplateBtn = document.getElementById("load-template-btn");
  if (loadTemplateBtn) {
    loadTemplateBtn.addEventListener("click", () => {
      TemplateManager.showLoadTemplateModal();
    });
  }

  // Load existing templates when the templates section is accessed
  const templatesSection = document.getElementById("templates");
  if (templatesSection) {
    // Create a MutationObserver to watch for when the templates section becomes active
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === "attributes" &&
          mutation.attributeName === "class"
        ) {
          const target = mutation.target as HTMLElement;
          if (target.classList.contains('is-active')) {
            // Check if there's a template for the current course
            TemplateManager.loadCourseTemplate();
          }
        }
      });
    });

    observer.observe(templatesSection, { attributes: true });

    // Also check if templates section is already active on page load
    if (templatesSection.classList.contains('is-active')) {
      TemplateManager.loadCourseTemplate();
    }
  }

  // Modal form submission handler
  const createTemplateForm = document.getElementById("create-template-form");
  if (createTemplateForm) {
    createTemplateForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const formData = new FormData(e.target as HTMLFormElement);
      const templateFormData = {
        name: formData.get("template-name") as string,
        type: formData.get("template-type") as "lesson",
        description:
          (formData.get("template-description") as string) || undefined,
      };

      const templateId = await TemplateManager.createTemplate(templateFormData);
      if (templateId) {
        TemplateManager.hideCreateTemplateModal();
        TemplateManager.showTemplateBuilder(templateId);
        // Reload the template list to show the new template
        setTimeout(() => {
          TemplateManager.loadExistingTemplates();
        }, 500);
      } else {
        console.error("Failed to create template");
        // You could show an error message to the user here
      }
    });
  }

  // Modal close handlers
  const modalCloseBtn = document.querySelector('.modal__close');
  const modal = document.getElementById("create-template-modal");

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      TemplateManager.hideCreateTemplateModal();
    });
  }

  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        TemplateManager.hideCreateTemplateModal();
      }
    });
  }
});
