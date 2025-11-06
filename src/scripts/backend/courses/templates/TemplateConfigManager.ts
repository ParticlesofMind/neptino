import { TemplateBlockType, TemplateBlock } from "./types.js";

export interface BlockFieldConfig {
  name: string;
  label: string;
  mandatory: boolean;
  separator?: boolean;
  indentLevel?: number;
  inlineGroup?: string;
  role?: "primary" | "time" | "method" | "social";
}

export class TemplateConfigManager {
  static getBlockFieldConfiguration(): Record<TemplateBlockType, BlockFieldConfig[]> {
    return {
      header: [
        { name: "lesson_number", label: "Lesson number (#)", mandatory: true },
        { name: "lesson_title", label: "Lesson title", mandatory: true },
        { name: "module_title", label: "Module title", mandatory: true },
        { name: "course_title", label: "Course title", mandatory: true },
        { name: "institution_name", label: "Institution name", mandatory: true },
        { name: "teacher_name", label: "Teacher name", mandatory: false },
        { name: "date", label: "Date", mandatory: true },
      ],
      body: [
        { name: "body_content", label: "Body content", mandatory: true },
      ],
      footer: [
        { name: "copyright", label: "Copyright", mandatory: true },
        { name: "teacher_name", label: "Teacher name", mandatory: false },
        { name: "institution_name", label: "Institution name", mandatory: false },
        { name: "page_number", label: "Page number (#)", mandatory: true },
      ],
      program: [
        { name: "competence", label: "Competence", mandatory: true },
        { name: "topic", label: "Topic", mandatory: true },
        { name: "objective", label: "Objective", mandatory: true },
        { name: "task", label: "Task", mandatory: true },
        { name: "program_method", label: "Method", mandatory: true, role: "method" },
        { name: "program_social_form", label: "Social form", mandatory: true, role: "social" },
        { name: "program_time", label: "Time", mandatory: true, role: "time" },
      ],
      resources: [
        { name: "task", label: "Task", mandatory: true },
        { name: "type", label: "Type", mandatory: true },
        { name: "origin", label: "Origin", mandatory: true },
        { name: "state", label: "State", mandatory: false },
        { name: "quality", label: "Quality", mandatory: false },
        { name: "include_glossary", label: "Include Glossary", mandatory: false, separator: true },
        { name: "historical_figures", label: "Historical figures", mandatory: false },
        { name: "terminology", label: "Terminology", mandatory: false },
        { name: "concepts", label: "Concepts", mandatory: false },
      ],
      content: [
        { name: "competence", label: "Competency", mandatory: true, indentLevel: 0, inlineGroup: "competence", role: "primary" },
        { name: "competence_time", label: "Display time", mandatory: false, indentLevel: 0, inlineGroup: "competence", role: "time" },
        { name: "topic", label: "Topic", mandatory: true, indentLevel: 1, inlineGroup: "topic", role: "primary" },
        { name: "topic_time", label: "Display time", mandatory: false, indentLevel: 1, inlineGroup: "topic", role: "time" },
        { name: "objective", label: "Objective", mandatory: true, indentLevel: 2, inlineGroup: "objective", role: "primary" },
        { name: "objective_time", label: "Display time", mandatory: false, indentLevel: 2, inlineGroup: "objective", role: "time" },
        { name: "task", label: "Task", mandatory: true, indentLevel: 3, inlineGroup: "task", role: "primary" },
        { name: "task_time", label: "Display time", mandatory: false, indentLevel: 3, inlineGroup: "task", role: "time" },
        { name: "instruction_area", label: "Instruction Area", mandatory: true, indentLevel: 4, inlineGroup: "instruction", role: "primary" },
        { name: "instruction_method", label: "Method", mandatory: true, indentLevel: 4, inlineGroup: "instruction", role: "method" },
        { name: "instruction_social_form", label: "Social form", mandatory: true, indentLevel: 4, inlineGroup: "instruction", role: "social" },
        { name: "instruction_space", label: "", mandatory: false, indentLevel: 4, inlineGroup: "instruction_space", role: "primary" },
        { name: "student_area", label: "Student Area", mandatory: true, indentLevel: 4, inlineGroup: "student", role: "primary" },
        { name: "student_method", label: "Method", mandatory: true, indentLevel: 4, inlineGroup: "student", role: "method" },
        { name: "student_social_form", label: "Social form", mandatory: true, indentLevel: 4, inlineGroup: "student", role: "social" },
        { name: "student_space", label: "", mandatory: false, indentLevel: 4, inlineGroup: "student_space", role: "primary" },
        { name: "teacher_area", label: "Teacher Area", mandatory: true, indentLevel: 4, inlineGroup: "teacher", role: "primary" },
        { name: "teacher_method", label: "Method", mandatory: true, indentLevel: 4, inlineGroup: "teacher", role: "method" },
        { name: "teacher_social_form", label: "Social form", mandatory: true, indentLevel: 4, inlineGroup: "teacher", role: "social" },
        { name: "teacher_space", label: "", mandatory: false, indentLevel: 4, inlineGroup: "teacher_space", role: "primary" },
        { name: "include_project", label: "Include Project", mandatory: false },
      ],
      assignment: [
        { name: "competence", label: "Competency", mandatory: true, indentLevel: 0, inlineGroup: "competence", role: "primary" },
        { name: "competence_time", label: "Display time", mandatory: false, indentLevel: 0, inlineGroup: "competence", role: "time" },
        { name: "topic", label: "Topic", mandatory: true, indentLevel: 1, inlineGroup: "topic", role: "primary" },
        { name: "topic_time", label: "Display time", mandatory: false, indentLevel: 1, inlineGroup: "topic", role: "time" },
        { name: "objective", label: "Objective", mandatory: true, indentLevel: 2, inlineGroup: "objective", role: "primary" },
        { name: "objective_time", label: "Display time", mandatory: false, indentLevel: 2, inlineGroup: "objective", role: "time" },
        { name: "task", label: "Task", mandatory: true, indentLevel: 3, inlineGroup: "task", role: "primary" },
        { name: "task_time", label: "Display time", mandatory: false, indentLevel: 3, inlineGroup: "task", role: "time" },
        { name: "instruction_area", label: "Instruction Area", mandatory: true, indentLevel: 4, inlineGroup: "instruction", role: "primary" },
        { name: "instruction_method", label: "Method", mandatory: true, indentLevel: 4, inlineGroup: "instruction", role: "method" },
        { name: "instruction_social_form", label: "Social form", mandatory: true, indentLevel: 4, inlineGroup: "instruction", role: "social" },
        { name: "instruction_space", label: "", mandatory: false, indentLevel: 4, inlineGroup: "instruction_space", role: "primary" },
        { name: "student_area", label: "Student Area", mandatory: true, indentLevel: 4, inlineGroup: "student", role: "primary" },
        { name: "student_method", label: "Method", mandatory: true, indentLevel: 4, inlineGroup: "student", role: "method" },
        { name: "student_social_form", label: "Social form", mandatory: true, indentLevel: 4, inlineGroup: "student", role: "social" },
        { name: "student_space", label: "", mandatory: false, indentLevel: 4, inlineGroup: "student_space", role: "primary" },
        { name: "teacher_area", label: "Teacher Area", mandatory: true, indentLevel: 4, inlineGroup: "teacher", role: "primary" },
        { name: "teacher_method", label: "Method", mandatory: true, indentLevel: 4, inlineGroup: "teacher", role: "method" },
        { name: "teacher_social_form", label: "Social form", mandatory: true, indentLevel: 4, inlineGroup: "teacher", role: "social" },
        { name: "teacher_space", label: "", mandatory: false, indentLevel: 4, inlineGroup: "teacher_space", role: "primary" },
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
      body: "Main content container for template blocks",
      footer: "Contains copyright, contact, and page information",
      program: "Displays lesson structure with competencies, topics, objectives, and tasks",
      resources: "Lists materials, files, links, and reference resources",
      content: "Shows detailed content structure with instruction, student, and teacher areas",
      assignment: "Defines assignment structure with task details and areas",
      scoring: "Contains assessment criteria and scoring information",
    };
    return descriptions[blockType] || "Template block";
  }
}
