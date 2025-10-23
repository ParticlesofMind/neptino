import { supabase } from "../../supabase.js";
import "./templateConfigHandler.js";
import "./templatePreviewHandler.js";
import '@pixi/layout';

// Import loadTemplates modal to make it available globally
import { loadTemplatesModal } from "./modals/loadTemplates.js";
import { ensureTemplateModals } from "./templateModals.js";
import { ModalHandler } from "../../../navigation/CourseBuilderNavigation.js";
import {
  BLOCK_CONTENT_TEMPLATES,
  TEMPLATE_BLOCK_SEQUENCES,
  TemplateBlockType,
  TemplateType,
} from "./templateOptions.js";

export interface TemplateData {
  template_id: string;
  course_id?: string;
  template_description?: string;
  template_type: TemplateType;
  template_data: {
    name: string;
    blocks: TemplateBlock[];
    settings: Record<string, any>;
  };
}

export interface TemplateBlock {
  id: string;
  type: TemplateBlockType;
  order: number;
  config: Record<string, boolean | undefined>;
  content: string;
}

interface BlockFieldConfig {
  name: string;
  label: string;
  mandatory: boolean;
  separator?: boolean;
  indentLevel?: number;
  inlineGroup?: string;
  role?: "primary" | "time" | "method" | "social";
}

interface FieldRow {
  groupId: string;
  indentLevel: number;
  placeholders: {
    primary?: string;
    time?: string;
    method?: string;
    social?: string;
  };
}

function formatTemplateSavedMessage(): string {
  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const year = now.getFullYear();
  return `This page was last saved at ${hours}:${minutes}, on ${day}.${month}.${year}`;
}

function setTemplateStatus(
  state: "saving" | "saved" | "error",
  message?: string,
): void {
  const statusEl = document.getElementById(
    "template-save-status",
  ) as HTMLElement | null;
  if (!statusEl) return;

  const textEl = statusEl.querySelector(
    ".save-status__text",
  ) as HTMLElement | null;
  if (!textEl) return;

  statusEl.dataset.status = state;

  if (state === "saved" && !message) {
    textEl.textContent = formatTemplateSavedMessage();
    return;
  }

  if (state === "saving" && !message) {
    textEl.textContent = "Saving changes…";
    return;
  }

  textEl.textContent = message || "";
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
    blockType: TemplateBlockType,
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
          // Always set the value (true or false) instead of deleting
          block.config[fieldName] = isChecked;
        }

        // Data is automatically persisted to database via auto-save
      }

      // Show saving status
      setTemplateStatus("saving");

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
        // Always set the value (true or false) instead of deleting
        blockToUpdate.config[fieldName] = isChecked;
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
      setTemplateStatus("saved");

      // Update the preview
      this.updateTemplatePreview();
    } catch (error) {
      console.error("Failed to update template field:", error);

      // Show error status
      setTemplateStatus("error", "Error saving changes");
    }
  }

  /**
   * Toggle enabled state of glossary items based on the "include_glossary" checkbox
   */
  static toggleGlossaryItems(glossaryEnabled: boolean): void {
    const glossaryItems = document.querySelectorAll(".glossary-item input");
    glossaryItems.forEach((item) => {
      if (glossaryEnabled) {
        (item as HTMLInputElement).disabled = false;
        (item.parentElement as HTMLElement).classList.remove("glossary-item--disabled");
      } else {
        (item as HTMLInputElement).disabled = true;
        (item.parentElement as HTMLElement).classList.add("glossary-item--disabled");
      }
    });
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
    type: TemplateType;
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

      const blockSequence = TEMPLATE_BLOCK_SEQUENCES[formData.type] ?? TEMPLATE_BLOCK_SEQUENCES.lesson;
      const defaultBlocks: TemplateBlock[] = blockSequence.map((blockType, index) =>
        this.createDefaultBlock(blockType, index + 1),
      );

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

  private static createDefaultBlock(blockType: TemplateBlockType, order: number): TemplateBlock {
    return {
      id: `${blockType}-${order}`,
      type: blockType,
      order,
      config: this.buildDefaultBlockConfig(blockType),
      content:
        BLOCK_CONTENT_TEMPLATES[blockType] ?? `<div class="${blockType}-section">{{${blockType}}}</div>`,
    };
  }

  private static buildDefaultBlockConfig(blockType: TemplateBlockType): Record<string, boolean> {
    const fields = this.getBlockFieldConfiguration()[blockType] || [];
    return fields.reduce<Record<string, boolean>>((acc, field) => {
      if (field.separator) {
        return acc;
      }
      acc[field.name] = field.mandatory ? true : false;
      return acc;
    }, {});
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
          <p>No templates created yet. Use the buttons below to create or load a template.</p>
        </div>
      `;
      return;
    }

    // If templates exist, show the configuration interface instead of a list
    // The Load Template button in the header will handle template selection
    configArea.innerHTML = `
      <div class="template-config-placeholder">
        <h3 class="heading heading--tertiary">Manage Your Templates</h3>
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
          <h3 class="heading heading--tertiary">Configure Templates</h3>
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
            <div class="block-item block-item--scoring">Scoring Block</div>
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
          <h3 class="heading heading--tertiary">Template Not Loaded</h3>
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

      const normalized = this.normalizeTemplateData(data);
      if (normalized) {
        try {
          await supabase
            .from("templates")
            .update({
              template_data: data.template_data,
              updated_at: new Date().toISOString(),
            })
            .eq("id", data.id);
        } catch (normalizationError) {
          console.error("Failed to normalize template structure:", normalizationError);
        }
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
      const { data, error } = await supabase
        .from("templates")
        .select("*")
        .eq("course_id", courseId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) {
        console.error("Error loading course template:", error);
        this.loadExistingTemplates();
        return;
      }

      const template = data?.[0];

      if (template) {
        console.log(
          "Found existing template for course:",
          template.template_id,
        );

        const normalized = this.normalizeTemplateData(template);
        if (normalized) {
          try {
            await supabase
              .from("templates")
              .update({
                template_data: template.template_data,
                updated_at: new Date().toISOString(),
              })
              .eq("id", template.id);
          } catch (normalizationError) {
            console.error("Failed to normalize course template structure:", normalizationError);
          }
        }

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
  static getBlockFieldConfiguration(): Record<TemplateBlockType, BlockFieldConfig[]> {
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
      body: [
        // Body is a container - its configuration is derived from template type
        { name: "body_content", label: "Body content", mandatory: true },
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
      program: [
        { name: "competence", label: "Competence", mandatory: true },
        { name: "topic", label: "Topic", mandatory: true },
        { name: "objective", label: "Objective", mandatory: true },
        { name: "task", label: "Task", mandatory: true },
        {
          name: "program_method",
          label: "Method",
          mandatory: true,
          role: "method",
        },
        {
          name: "program_social_form",
          label: "Social form",
          mandatory: true,
          role: "social",
        },
        {
          name: "program_time",
          label: "Time",
          mandatory: true,
          role: "time",
        },
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
          name: "competence",
          label: "Competence",
          mandatory: true,
          inlineGroup: "competence",
          role: "primary",
        },
        {
          name: "competence_time",
          label: "Display time",
          mandatory: false,
          inlineGroup: "competence",
          role: "time",
        },
        {
          name: "topic",
          label: "Topic",
          mandatory: true,
          inlineGroup: "topic",
          role: "primary",
        },
        {
          name: "topic_time",
          label: "Display time",
          mandatory: false,
          inlineGroup: "topic",
          role: "time",
        },
        {
          name: "objective",
          label: "Objective",
          mandatory: true,
          inlineGroup: "objective",
          role: "primary",
        },
        {
          name: "objective_time",
          label: "Display time",
          mandatory: false,
          inlineGroup: "objective",
          role: "time",
        },
        {
          name: "task",
          label: "Task",
          mandatory: true,
          inlineGroup: "task",
          role: "primary",
        },
        {
          name: "task_time",
          label: "Display time",
          mandatory: false,
          inlineGroup: "task",
          role: "time",
        },
        {
          name: "instruction_area",
          label: "Instruction Area",
          mandatory: true,
          inlineGroup: "instruction",
          role: "primary",
        },
        {
          name: "instruction_method",
          label: "Method",
          mandatory: true,
          inlineGroup: "instruction",
          role: "method",
        },
        {
          name: "instruction_social_form",
          label: "Social form",
          mandatory: true,
          inlineGroup: "instruction",
          role: "social",
        },
        {
          name: "student_area",
          label: "Student Area",
          mandatory: true,
          inlineGroup: "student",
          role: "primary",
        },
        {
          name: "student_method",
          label: "Method",
          mandatory: true,
          inlineGroup: "student",
          role: "method",
        },
        {
          name: "student_social_form",
          label: "Social form",
          mandatory: true,
          inlineGroup: "student",
          role: "social",
        },
        {
          name: "teacher_area",
          label: "Teacher Area",
          mandatory: true,
          inlineGroup: "teacher",
          role: "primary",
        },
        {
          name: "teacher_method",
          label: "Method",
          mandatory: true,
          inlineGroup: "teacher",
          role: "method",
        },
        {
          name: "teacher_social_form",
          label: "Social form",
          mandatory: true,
          inlineGroup: "teacher",
          role: "social",
        },
        {
          name: "include_project",
          label: "Include Project",
          mandatory: false,
        },
      ],
      assignment: [
        {
          name: "competence",
          label: "Competence",
          mandatory: true,
          inlineGroup: "competence",
          role: "primary",
        },
        {
          name: "competence_time",
          label: "Display time",
          mandatory: false,
          inlineGroup: "competence",
          role: "time",
        },
        {
          name: "topic",
          label: "Topic",
          mandatory: true,
          inlineGroup: "topic",
          role: "primary",
        },
        {
          name: "topic_time",
          label: "Display time",
          mandatory: false,
          inlineGroup: "topic",
          role: "time",
        },
        {
          name: "objective",
          label: "Objective",
          mandatory: true,
          inlineGroup: "objective",
          role: "primary",
        },
        {
          name: "objective_time",
          label: "Display time",
          mandatory: false,
          inlineGroup: "objective",
          role: "time",
        },
        {
          name: "task",
          label: "Task",
          mandatory: true,
          inlineGroup: "task",
          role: "primary",
        },
        {
          name: "task_time",
          label: "Display time",
          mandatory: false,
          inlineGroup: "task",
          role: "time",
        },
        {
          name: "instruction_area",
          label: "Instruction Area",
          mandatory: true,
          inlineGroup: "instruction",
          role: "primary",
        },
        {
          name: "instruction_method",
          label: "Method",
          mandatory: true,
          inlineGroup: "instruction",
          role: "method",
        },
        {
          name: "instruction_social_form",
          label: "Social form",
          mandatory: true,
          inlineGroup: "instruction",
          role: "social",
        },
        {
          name: "student_area",
          label: "Student Area",
          mandatory: true,
          inlineGroup: "student",
          role: "primary",
        },
        {
          name: "student_method",
          label: "Method",
          mandatory: true,
          inlineGroup: "student",
          role: "method",
        },
        {
          name: "student_social_form",
          label: "Social form",
          mandatory: true,
          inlineGroup: "student",
          role: "social",
        },
        {
          name: "teacher_area",
          label: "Teacher Area",
          mandatory: true,
          inlineGroup: "teacher",
          role: "primary",
        },
        {
          name: "teacher_method",
          label: "Method",
          mandatory: true,
          inlineGroup: "teacher",
          role: "method",
        },
        {
          name: "teacher_social_form",
          label: "Social form",
          mandatory: true,
          inlineGroup: "teacher",
          role: "social",
        },
        {
          name: "include_project",
          label: "Include Project",
          mandatory: false,
        },
      ],
      scoring: [
        { name: "criteria", label: "Criteria", mandatory: true },
        { name: "max_points", label: "Max points", mandatory: true },
        { name: "passing_threshold", label: "Passing threshold", mandatory: false },
        { name: "feedback_guidelines", label: "Feedback guidelines", mandatory: false },
        { name: "rubric_link", label: "Rubric link", mandatory: false },
      ],
    };
  }

  /**
   * Displays the template blocks in the configuration area
   */
  private static ensureBlockConfigDefaults(block: TemplateBlock): boolean {
    const fieldConfig = this.getBlockFieldConfiguration()[block.type] || [];
    if (!block.config) {
      block.config = {};
    }

    let changed = false;

    fieldConfig.forEach((field) => {
      if (field.separator) {
        return;
      }

      if (field.mandatory) {
        if (block.config[field.name] !== true) {
          block.config[field.name] = true;
          changed = true;
        }
      } else if (typeof block.config[field.name] === "undefined") {
        block.config[field.name] = false;
        changed = true;
    }
    });

    return changed;
  }

  private static normalizeTemplateData(templateData: any): boolean {
    const actualData = templateData?.template_data || templateData;
    if (!actualData || !Array.isArray(actualData.blocks)) {
      return false;
    }

    let hasChanges = false;

    actualData.blocks.forEach((block: TemplateBlock) => {
      if (this.ensureBlockConfigDefaults(block)) {
        hasChanges = true;
      }
    });

    return hasChanges;
  }

  private static renderFieldCheckbox(
    templateId: string | null,
    block: TemplateBlock,
    field: BlockFieldConfig,
  ): string {
    const templateUuid = templateId ?? this.currentlyLoadedTemplateId ?? "";
    const isChecked = field.mandatory ? true : Boolean(block.config?.[field.name]);
    const disabledAttr = field.mandatory ? " checked disabled" : isChecked ? " checked" : "";
    
    // Check if this is a glossary item
    const glossaryItems = ["historical_figures", "terminology", "concepts"];
    const isGlossaryItem = glossaryItems.includes(field.name);
    const glossaryEnabled = Boolean(block.config?.["include_glossary"]);
    
    // Only call toggleGlossaryItems for the "include_glossary" field itself
    let updateHandler = "";
    if (!field.mandatory && templateUuid) {
      if (field.name === "include_glossary") {
        // Special handler for include_glossary: update field AND toggle glossary items
        updateHandler = ` onchange="TemplateManager.updateTemplateField('${templateUuid}', '${block.type}', '${field.name}', this.checked); TemplateManager.toggleGlossaryItems(this.checked);"`;
      } else {
        // Regular handler for all other fields: just update the field
        updateHandler = ` onchange="TemplateManager.updateTemplateField('${templateUuid}', '${block.type}', '${field.name}', this.checked);"`;
      }
    } else if (field.name === "include_glossary") {
      // Handle include_glossary when no templateUuid (shouldn't happen, but safety check)
      updateHandler = ` onchange="TemplateManager.toggleGlossaryItems(this.checked)"`;
    }
    
    // Glossary items are always visible but disabled if glossary is not enabled
    const glossaryDisabled = isGlossaryItem && !glossaryEnabled ? " disabled" : "";
    const combinedDisabled = disabledAttr || glossaryDisabled;

    return `
      <label class="block-config__field${isGlossaryItem ? ' glossary-item' : ''}${glossaryDisabled ? ' glossary-item--disabled' : ''}">
        <input
          type="checkbox"
          name="${field.name}"
          data-block="${block.type}"
          class="input input--checkbox"${combinedDisabled}${updateHandler}
        />
        <span class="block-config__label">${field.label}</span>
      </label>
    `;
  }

  private static renderBlockConfigRows(
    templateId: string | null,
    block: TemplateBlock,
    fields: BlockFieldConfig[],
  ): string {
    if (!fields.length) {
      return '<p class="block-config__empty">No configurable fields</p>';
    }

    // Special handling for Content and Assignment blocks with inline groups
    const hasInlineGroups = fields.some(f => f.inlineGroup);
    if (hasInlineGroups && (block.type === 'content' || block.type === 'assignment')) {
      return this.renderInlineGroupRows(templateId, block, fields);
    }

    // Default rendering for other blocks (3-per-row layout)
    const rows: Array<{ id: string; indentLevel: number; separator?: boolean; fields: BlockFieldConfig[] }> = [];
    let currentRow: BlockFieldConfig[] = [];
    let currentIndent = 0;

    fields.forEach((field) => {
      if (field.separator) {
        // Flush current row if it has items
        if (currentRow.length > 0) {
          rows.push({
            id: `row-${rows.length}`,
            indentLevel: currentIndent,
            fields: currentRow,
          });
          currentRow = [];
        }
        // Add the separator field itself as a row (it will render as a checkbox)
        rows.push({
          id: `row-${rows.length}`,
          indentLevel: 0,
          fields: [field],
        });
        return;
      }

      // Track indent level from first field in row
      if (currentRow.length === 0) {
        currentIndent = field.indentLevel ?? 0;
      }

      currentRow.push(field);

      // Flush row when it reaches 3 items or if indent changes
      if (currentRow.length === 3 || (field.indentLevel ?? 0) !== currentIndent) {
        if (currentRow.length === 3) {
          rows.push({
            id: `row-${rows.length}`,
            indentLevel: currentIndent,
            fields: currentRow,
          });
          currentRow = [];
        } else {
          // Start new row with this field if indent changed
          rows.push({
            id: `row-${rows.length}`,
            indentLevel: currentIndent,
            fields: currentRow.slice(0, -1),
          });
          currentRow = [field];
          currentIndent = field.indentLevel ?? 0;
        }
      }
    });

    // Flush any remaining fields
    if (currentRow.length > 0) {
      rows.push({
        id: `row-${rows.length}`,
        indentLevel: currentIndent,
        fields: currentRow,
      });
    }

    return rows
      .map((row) => {
        const indentClass = row.indentLevel
          ? ` block-config__row--indent-${row.indentLevel}`
          : "";

        const rowFields = row.fields
          .map((field) => this.renderFieldCheckbox(templateId, block, field))
          .join("");

        return `<div class="block-config__row${indentClass}">${rowFields}</div>`;
      })
      .join("");
  }

  /**
   * Renders rows for Content/Assignment blocks with inline groups
   * Groups fields by inlineGroup and displays them in a flat layout
   */
  private static renderInlineGroupRows(
    templateId: string | null,
    block: TemplateBlock,
    fields: BlockFieldConfig[],
  ): string {
    const groups = new Map<string, BlockFieldConfig[]>();
    const standaloneFields: BlockFieldConfig[] = [];

    // Group fields by inlineGroup
    fields.forEach((field) => {
      if (field.inlineGroup) {
        if (!groups.has(field.inlineGroup)) {
          groups.set(field.inlineGroup, []);
        }
        groups.get(field.inlineGroup)!.push(field);
      } else {
        standaloneFields.push(field);
      }
    });

    const rows: string[] = [];

    // Process groups in order they appear in fields array
    const processedGroups = new Set<string>();
    
    fields.forEach((field) => {
      if (field.inlineGroup && !processedGroups.has(field.inlineGroup)) {
        processedGroups.add(field.inlineGroup);
        const groupFields = groups.get(field.inlineGroup)!;

        // Render the group as a single row (no indentation)
        const groupHtml = groupFields
          .map((f) => this.renderFieldCheckbox(templateId, block, f))
          .join("");

        rows.push(`<div class="block-config__row block-config__row--inline-group">${groupHtml}</div>`);
      }
    });

    // Add standalone fields (like include_project)
    standaloneFields.forEach((field) => {
      const fieldHtml = this.renderFieldCheckbox(templateId, block, field);
      rows.push(`<div class="block-config__row">${fieldHtml}</div>`);
    });

    return rows.join("");
  }

  static displayTemplateBlocks(templateData: any): void {
    const configArea = document.getElementById('template-config-content');
    if (!configArea) {
      console.error('Template config content area not found');
      return;
    }

    // Handle both full template object and just template_data
    const actualData = templateData.template_data || templateData;
  this.normalizeTemplateData(actualData);

  const blocks = actualData.blocks || [];
    const templateId = templateData.id || this.currentlyLoadedTemplateId;
    const fieldConfig = this.getBlockFieldConfiguration();

    const blocksHtml = `
      <div class="template-blocks">
        ${blocks
          .map((block: TemplateBlock) => {
            const fields = fieldConfig[block.type] || [];
            const rowsHtml = this.renderBlockConfigRows(templateId, block, fields);
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
          .join("")}
      </div>
    `;

    configArea.innerHTML = blocksHtml;

    // Initialize glossary item state for resources block
    const resourcesBlock = blocks.find((b: TemplateBlock) => b.type === "resources");
    if (resourcesBlock) {
      const glossaryEnabled = Boolean(resourcesBlock.config?.["include_glossary"]);
      this.toggleGlossaryItems(glossaryEnabled);
    }

    // Update template preview after displaying blocks
    this.updateTemplatePreview(templateData);
  }

  /**
  * Gets description for a block type
  */
  static getBlockDescription(blockType: TemplateBlockType): string {
    const descriptions: Record<TemplateBlockType, string> = {
      header: "Title and introduction section",
      body: "Main template content container",
      footer: "Credits and additional information",
      program: "Learning objectives and outcomes",
      resources: "Files, links, and materials",
      content: "Main lesson content and materials",
      assignment: "Tasks and submissions",
      scoring: "Evaluation criteria and grading guidance",
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
        blocks: TEMPLATE_BLOCK_SEQUENCES.lesson.map((blockType, index) =>
          this.createDefaultBlock(blockType, index + 1),
        ),
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

    // Separate header, footer, and content blocks
    const headerBlock = sortedBlocks.find((b: TemplateBlock) => b.type === 'header');
    const footerBlock = sortedBlocks.find((b: TemplateBlock) => b.type === 'footer');
    const contentBlocks = sortedBlocks.filter((b: TemplateBlock) => b.type !== 'header' && b.type !== 'footer');

    // Render header
    const headerHtml = headerBlock
      ? `<div class="preview-block preview-block--${headerBlock.type}">
          <h4 class="preview-block__title">${headerBlock.type.charAt(0).toUpperCase() + headerBlock.type.slice(1)}</h4>
          ${this.renderBlockContent(headerBlock, this.getCheckedFields(headerBlock))}
        </div>`
      : '';

    // Render content blocks (scrollable middle section)
    const contentHtml = contentBlocks
      .map((block: TemplateBlock) => {
        const checkedFields = this.getCheckedFields(block);
        return `
 <div class="preview-block preview-block--${block.type}">
 <h4 class="preview-block__title">${block.type.charAt(0).toUpperCase() + block.type.slice(1)}</h4>
 ${this.renderBlockContent(block, checkedFields)}
 </div>
 `;
      })
      .join("");

    // Render footer
    const footerHtml = footerBlock
      ? `<div class="preview-block preview-block--${footerBlock.type}">
          <h4 class="preview-block__title">${footerBlock.type.charAt(0).toUpperCase() + footerBlock.type.slice(1)}</h4>
          ${this.renderBlockContent(footerBlock, this.getCheckedFields(footerBlock))}
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

  /**
  * Gets the currently checked fields for a block type from template data
  */
  static getCheckedFields(block: TemplateBlock): BlockFieldConfig[] {
    const fieldConfig = this.getBlockFieldConfiguration();
    const blockFields = fieldConfig[block.type] || [];
    const checkedFields: BlockFieldConfig[] = [];

    blockFields.forEach((field) => {
      if (field.separator) {
        return;
      }

      if (field.mandatory) {
        checkedFields.push(field);
        return;
      }

      if (block.config && block.config[field.name] === true) {
        checkedFields.push(field);
      }
    });

    return checkedFields;
  }

  /**
  * Renders the content for a specific block type
  */
  static renderBlockContent(
    block: TemplateBlock,
    checkedFields: BlockFieldConfig[],
  ): string {
    if (block.type === "resources") {
      return this.renderResourcesBlockContent(checkedFields, block);
    }

    if (block.type === "program") {
      return this.renderProgramBlockContent(checkedFields);
    }

    if (block.type === "content" || block.type === "assignment") {
      return this.renderNestedBlockContent(block, checkedFields);
    }

    // Default table rendering for other blocks - single row with values only
    return `
 <table class="lesson-plan-table">
 <tbody>
 <tr>
 ${checkedFields
        .map((field) => `
 <td>[${field.label}]</td>
 `)
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
    block: TemplateBlock,
    checkedFields: BlockFieldConfig[],
  ): string {
    const rows = this.buildFieldRows(checkedFields);
    const baseTable = this.renderRowsTable(rows);

    if (!baseTable) {
      return '<p class="preview-placeholder">No fields selected</p>';
    }

    const includeProject = Boolean(block.config?.include_project);
    const projectSection = includeProject
      ? this.renderProjectExtension(block.type === "assignment" ? "Project Assignment" : "Project")
      : "";

    return `${baseTable}${projectSection}`;
  }

  private static buildFieldRows(fields: BlockFieldConfig[]): FieldRow[] {
    const rows: FieldRow[] = [];
    const rowIndex = new Map<string, number>();

    fields.forEach((field) => {
      if (field.separator || field.name === "include_project") {
        return;
      }

      const groupId = field.inlineGroup || field.name;
      if (!rowIndex.has(groupId)) {
        rowIndex.set(groupId, rows.length);
        rows.push({
          groupId,
          indentLevel: field.indentLevel ?? 0,
          placeholders: {},
        });
      }

      const row = rows[rowIndex.get(groupId)!];
      const placeholder = `[${field.label}]`;

      switch (field.role) {
        case "time":
          row.placeholders.time = placeholder;
          break;
        case "method":
          row.placeholders.method = placeholder;
          break;
        case "social":
          row.placeholders.social = placeholder;
          break;
        default:
          row.placeholders.primary = placeholder;
      }
    });

    return rows;
  }

  private static renderRowsTable(rows: FieldRow[]): string {
    if (!rows.length) {
      return "";
    }

    const body = rows.map((row) => this.renderRow(row)).join("");

    return `
 <table class="lesson-plan-table lesson-plan-table--hierarchy">
 <tbody>
 ${body}
 </tbody>
 </table>
 `;
  }

  private static renderRow(row: FieldRow): string {
    const indentClass = row.indentLevel
      ? ` lesson-plan-table__cell--indent-${row.indentLevel}`
      : "";

    return `
 <tr>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--primary${indentClass}">${row.placeholders.primary ?? ""}</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--time">${row.placeholders.time ?? ""}</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--method">${row.placeholders.method ?? ""}</td>
 <td class="lesson-plan-table__cell lesson-plan-table__cell--social">${row.placeholders.social ?? ""}</td>
 </tr>
 `;
  }

  private static renderProjectExtension(sectionTitle: string): string {
    const projectRows: FieldRow[] = [
      {
        groupId: "project_competence",
        indentLevel: 0,
        placeholders: {
          primary: "[Project Competence]",
          time: "[Time]",
        },
      },
      {
        groupId: "project_topic",
        indentLevel: 1,
        placeholders: {
          primary: "[Project Topic]",
          time: "[Time]",
        },
      },
      {
        groupId: "project_objective",
        indentLevel: 2,
        placeholders: {
          primary: "[Project Objective]",
          time: "[Time]",
        },
      },
      {
        groupId: "project_task",
        indentLevel: 3,
        placeholders: {
          primary: "[Project Task]",
          time: "[Time]",
        },
      },
      {
        groupId: "project_instruction",
        indentLevel: 4,
        placeholders: {
          primary: "[Project Instruction Area]",
          method: "[Method]",
          social: "[Social form]",
        },
      },
      {
        groupId: "project_student",
        indentLevel: 4,
        placeholders: {
          primary: "[Project Student Area]",
          method: "[Method]",
          social: "[Social form]",
        },
      },
      {
        groupId: "project_teacher",
        indentLevel: 4,
        placeholders: {
          primary: "[Project Teacher Area]",
          method: "[Method]",
          social: "[Social form]",
        },
      },
    ];

    return `
 <h5 class="preview-block__subtitle">${sectionTitle}</h5>
 ${this.renderRowsTable(projectRows)}
 `;
  }

  private static renderProgramBlockContent(
    fields: BlockFieldConfig[],
  ): string {
    const lookup = new Map<string, BlockFieldConfig>();
    fields.forEach((field) => {
      lookup.set(field.name, field);
    });

    const getPlaceholder = (name: string): string => {
      const field = lookup.get(name);
      return field ? `[${field.label}]` : "";
    };

   return `
 <table class="lesson-plan-table lesson-plan-table--program">
 <tbody>
 <tr>
 <td>${getPlaceholder("competence")}</td>
 <td>${getPlaceholder("topic")}</td>
 <td>${getPlaceholder("objective")}</td>
 <td>${getPlaceholder("task")}</td>
 <td>${getPlaceholder("program_method")}</td>
 <td>${getPlaceholder("program_social_form")}</td>
 <td>${getPlaceholder("program_time")}</td>
 </tr>
 </tbody>
 </table>
 `;
  }

  /**
  * Renders the special Resources block content with optional glossary table
  */
  static renderResourcesBlockContent(
    checkedFields: BlockFieldConfig[],
    block?: TemplateBlock,
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

    // Check if glossary is included from the block config
    // This ensures we check the actual config value, not just if it's in checkedFields
    const includeGlossary = block?.config?.["include_glossary"] === true;

    // Get glossary items that are selected (checked)
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

    // Glossary section - each selected item gets its own row
    if (includeGlossary && glossaryItems.length > 0) {
      html += `
 <h5 class="preview-block__subtitle">Glossary</h5>
 <table class="lesson-plan-table">
 <tbody>
 ${glossaryItems
          .map(
            (item) => `
 <tr>
 <td>${item.label}</td>
 <td>[URL]</td>
 </tr>
 `,
          )
          .join("")}
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
  static getDefaultBlockContent(blockType: TemplateBlockType): string {
    const defaultContent: Record<TemplateBlockType, string> = {
      header: "Course title and introduction will appear here",
      body: "Main body content container - contains all nested blocks",
      footer: "Credits and additional information will appear here",
      program: "Learning objectives and outcomes will be displayed here",
      resources: "Files, links, and materials will be listed here",
      content: "Main lesson content and materials will appear here",
      assignment: "Tasks and submission instructions will be shown here",
      scoring: "Evaluation criteria and scoring details will appear here",
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
        type: formData.get("template-type") as TemplateType,
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
