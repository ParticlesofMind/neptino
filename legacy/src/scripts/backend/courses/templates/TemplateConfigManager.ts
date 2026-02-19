import { TemplateBlockType, TemplateBlock } from "./types.js";

export interface BlockFieldConfig {
  name: string;
  label: string;
  mandatory: boolean;
  separator?: boolean;
  indentLevel?: number;
  inlineGroup?: string;
  rowGroup?: string;
  role?: "primary" | "time" | "method" | "social";
  defaultValue?: boolean;
  placeholderLabel?: string;
}

export class TemplateConfigManager {
  static getBlockFieldConfiguration(): Record<TemplateBlockType, BlockFieldConfig[]> {
    return {
      header: [
        { name: "lesson_number", label: "Lesson number", mandatory: true },
        { name: "lesson_title", label: "Lesson title", mandatory: true },
        { name: "module_title", label: "Module title", mandatory: true },
        { name: "course_title", label: "Course title", mandatory: true },
        { name: "date", label: "Date", mandatory: true },
      ],
      footer: [
        { name: "copyright", label: "Copyright", mandatory: true },
        { name: "teacher_name", label: "Teacher name", mandatory: false },
        { name: "institution_name", label: "Institution name", mandatory: false },
        { name: "page_number", label: "Page number", mandatory: true },
      ],
      program: [
        { name: "topic", label: "Topic", mandatory: true, placeholderLabel: "Topic" },
        {
          name: "competency",
          label: "Enable Competency",
          placeholderLabel: "Competency",
          mandatory: false,
          defaultValue: true,
        },
        { name: "objective", label: "Objective", mandatory: true, placeholderLabel: "Objective" },
        { name: "task", label: "Task", mandatory: true, placeholderLabel: "Task" },
        {
          name: "program_method",
          label: "Method",
          mandatory: true,
          role: "method",
          placeholderLabel: "Method",
        },
        {
          name: "program_social_form",
          label: "Social form",
          mandatory: true,
          role: "social",
          placeholderLabel: "Social form",
        },
        {
          name: "program_time",
          label: "Time",
          mandatory: true,
          role: "time",
          placeholderLabel: "Time",
        },
        {
          name: "program_summary",
          label: "Include Program Summary",
          mandatory: false,
          defaultValue: true,
        },
      ],
      resources: [
        { name: "task", label: "Task", mandatory: true, rowGroup: "resources-main" },
        { name: "type", label: "Type", mandatory: true, rowGroup: "resources-main" },
        { name: "origin", label: "Origin", mandatory: true, rowGroup: "resources-main" },
        { name: "state", label: "State", mandatory: false, rowGroup: "resources-main" },
        { name: "quality", label: "Quality", mandatory: false, rowGroup: "resources-main" },
        { name: "include_glossary", label: "Include Glossary", mandatory: false, separator: true, rowGroup: "resources-glossary-toggle" },
        { name: "historical_figures", label: "Historical figures", mandatory: false, rowGroup: "resources-glossary-items" },
        { name: "terminology", label: "Terminology", mandatory: false, rowGroup: "resources-glossary-items" },
        { name: "concepts", label: "Concepts", mandatory: false, rowGroup: "resources-glossary-items" },
      ],
      content: [
        { name: "topic", label: "Topic", mandatory: true },
        { name: "competency", label: "Competency", mandatory: true },
        { name: "objective", label: "Objective", mandatory: true },
        { name: "task", label: "Task", mandatory: true },
        {
          name: "topic_time",
          label: "Add next to Topic",
          mandatory: false,
          defaultValue: true,
          inlineGroup: "topic",
          role: "time",
          placeholderLabel: "Time",
        },
        {
          name: "objective_time",
          label: "Add next to Objective",
          mandatory: false,
          defaultValue: true,
          inlineGroup: "objective",
          role: "time",
          placeholderLabel: "Time",
        },
        {
          name: "task_time",
          label: "Add next to Task",
          mandatory: false,
          defaultValue: true,
          inlineGroup: "task",
          role: "time",
          placeholderLabel: "Time",
        },
        { name: "instruction_area", label: "Instruction Area", mandatory: true, indentLevel: 1, inlineGroup: "instruction", role: "primary" },
        { name: "instruction_method", label: "Method", mandatory: true, indentLevel: 1, inlineGroup: "instruction", role: "method" },
        { name: "instruction_social_form", label: "Social form", mandatory: true, indentLevel: 1, inlineGroup: "instruction", role: "social" },
        { name: "student_area", label: "Student Area", mandatory: true, indentLevel: 1, inlineGroup: "student", role: "primary" },
        { name: "student_method", label: "Method", mandatory: true, indentLevel: 1, inlineGroup: "student", role: "method" },
        { name: "student_social_form", label: "Social form", mandatory: true, indentLevel: 1, inlineGroup: "student", role: "social" },
        { name: "teacher_area", label: "Teacher Area", mandatory: true, indentLevel: 1, inlineGroup: "teacher", role: "primary" },
        { name: "teacher_method", label: "Method", mandatory: true, indentLevel: 1, inlineGroup: "teacher", role: "method" },
        { name: "teacher_social_form", label: "Social form", mandatory: true, indentLevel: 1, inlineGroup: "teacher", role: "social" },
        { name: "include_project", label: "Include Project", mandatory: false },
      ],
      assignment: [
        { name: "topic", label: "Topic", mandatory: true },
        { name: "competency", label: "Competency", mandatory: true },
        { name: "objective", label: "Objective", mandatory: true },
        { name: "task", label: "Task", mandatory: true },
        {
          name: "topic_time",
          label: "Add next to Topic",
          mandatory: false,
          defaultValue: true,
          inlineGroup: "topic",
          role: "time",
          placeholderLabel: "Time",
        },
        {
          name: "objective_time",
          label: "Add next to Objective",
          mandatory: false,
          defaultValue: true,
          inlineGroup: "objective",
          role: "time",
          placeholderLabel: "Time",
        },
        {
          name: "task_time",
          label: "Add next to Task",
          mandatory: false,
          defaultValue: true,
          inlineGroup: "task",
          role: "time",
          placeholderLabel: "Time",
        },
        { name: "instruction_area", label: "Instruction Area", mandatory: true, indentLevel: 1, inlineGroup: "instruction", role: "primary" },
        { name: "instruction_method", label: "Method", mandatory: true, indentLevel: 1, inlineGroup: "instruction", role: "method" },
        { name: "instruction_social_form", label: "Social form", mandatory: true, indentLevel: 1, inlineGroup: "instruction", role: "social" },
        { name: "student_area", label: "Student Area", mandatory: true, indentLevel: 1, inlineGroup: "student", role: "primary" },
        { name: "student_method", label: "Method", mandatory: true, indentLevel: 1, inlineGroup: "student", role: "method" },
        { name: "student_social_form", label: "Social form", mandatory: true, indentLevel: 1, inlineGroup: "student", role: "social" },
        { name: "teacher_area", label: "Teacher Area", mandatory: true, indentLevel: 1, inlineGroup: "teacher", role: "primary" },
        { name: "teacher_method", label: "Method", mandatory: true, indentLevel: 1, inlineGroup: "teacher", role: "method" },
        { name: "teacher_social_form", label: "Social form", mandatory: true, indentLevel: 1, inlineGroup: "teacher", role: "social" },
        { name: "include_project", label: "Include Project", mandatory: false },
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

  static ensureBlockConfigDefaults(block: TemplateBlock): boolean {
    const fieldConfig = this.getBlockFieldConfiguration()[block.type] || [];
    if (!block.config) {
      block.config = {};
    }

    let changed = false;

    this.migrateLegacyFieldNames(block);

    fieldConfig.forEach((field) => {
      if (field.separator) {
        return;
      }

      const defaultValue = this.getFieldDefaultValue(field);
      if (block.config[field.name] !== defaultValue) {
        block.config[field.name] = defaultValue;
        changed = true;
      }
    });

    return changed;
  }

  static normalizeTemplateData(templateData: any): boolean {
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

  static getCheckedFields(block: TemplateBlock): BlockFieldConfig[] {
    const fieldConfig = this.getBlockFieldConfiguration()[block.type] || [];
    return fieldConfig.filter((field) => {
      if (field.separator) {
        return false;
      }
      return field.mandatory || Boolean(block.config?.[field.name]);
    });
  }

  static getBlockDescription(blockType: TemplateBlockType): string {
    const descriptions: Record<TemplateBlockType, string> = {
      header: "Contains lesson metadata and course information",
      footer: "Contains copyright, contact, and page information",
      program: "Displays lesson structure with competencies, topics, objectives, and tasks",
      resources: "Lists materials, files, links, and reference resources",
      content: "Shows detailed content structure with instruction, student, and teacher areas",
      assignment: "Defines assignment structure with task details and areas",
      scoring: "Contains assessment criteria and scoring information",
    };
    return descriptions[blockType] || "Template block";
  }

  static getFieldDefaultValue(field: BlockFieldConfig): boolean {
    if (field.mandatory) {
      return true;
    }
    if (typeof field.defaultValue === "boolean") {
      return field.defaultValue;
    }
    return false;
  }

  private static migrateLegacyFieldNames(block: TemplateBlock): void {
    if (!block.config) {
      return;
    }

    const legacyMappings: Record<string, string> = {
      competence: "competency",
    };

    Object.entries(legacyMappings).forEach(([legacyKey, normalizedKey]) => {
      if (typeof block.config[normalizedKey] === "undefined" && typeof block.config[legacyKey] !== "undefined") {
        block.config[normalizedKey] = block.config[legacyKey];
        delete block.config[legacyKey];
      }
    });
  }
}
