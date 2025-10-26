import { TemplateDefinitionBlock, CurriculumLesson } from "../curriculumManager.js";

export class SectionDataBuilder {
  /**
   * Build header data with fields and active fields
   */
  static buildHeaderData(
    block: TemplateDefinitionBlock,
    lesson: CurriculumLesson,
  ): Record<string, unknown> {
    const config = (block.config ?? {}) as Record<string, unknown>;
    
    const headerFields = [
      { key: "lesson_number", label: "Lesson number", configKey: "lesson_number", mandatory: true },
      { key: "lesson_title", label: "Lesson title", configKey: "lesson_title", mandatory: true },
      { key: "module_title", label: "Module title", configKey: "module_title", mandatory: true },
      { key: "course_title", label: "Course title", configKey: "course_title", mandatory: true },
      { key: "institution_name", label: "Institution name", configKey: "institution_name", mandatory: true },
      { key: "teacher_name", label: "Teacher name", configKey: "teacher_name", mandatory: false },
    ];

    const activeFields = headerFields.filter((field) => {
      if (field.mandatory) {
        return config[field.configKey] !== false;
      } else {
        return config[field.configKey] === true;
      }
    });

    const headerData: Record<string, unknown> = {};
    
    activeFields.forEach(field => {
      switch (field.key) {
        case "lesson_number":
          headerData[field.key] = lesson.lessonNumber || 1;
          break;
        case "lesson_title":
          headerData[field.key] = lesson.title || `Lesson ${lesson.lessonNumber || 1}`;
          break;
        case "module_title":
          headerData[field.key] = lesson.moduleNumber ? `Module ${lesson.moduleNumber}` : "Module 1";
          break;
        case "course_title":
          headerData[field.key] = "[Course Title]";
          break;
        case "institution_name":
          headerData[field.key] = "[Institution Name]";
          break;
        case "teacher_name":
          headerData[field.key] = "[Teacher Name]";
          break;
        default:
          headerData[field.key] = `[${field.label}]`;
      }
    });

    return {
      fields: headerData,
      activeFields: activeFields.map(f => ({ key: f.key, label: f.label })),
    };
  }

  /**
   * Build footer data with fields and active fields
   */
  static buildFooterData(
    block: TemplateDefinitionBlock,
    _lesson: CurriculumLesson,
  ): Record<string, unknown> {
    const config = (block.config ?? {}) as Record<string, unknown>;
    
    const footerFields = [
      { key: "copyright", label: "Copyright", configKey: "copyright", mandatory: true },
      { key: "teacher_name", label: "Teacher name", configKey: "teacher_name", mandatory: false },
      { key: "institution_name", label: "Institution name", configKey: "institution_name", mandatory: false },
      { key: "page_number", label: "Page number", configKey: "page_number", mandatory: true },
    ];

    const activeFields = footerFields.filter((field) => {
      if (field.mandatory) {
        return config[field.configKey] !== false;
      } else {
        return config[field.configKey] === true;
      }
    });

    const footerData: Record<string, unknown> = {};
    
    activeFields.forEach(field => {
      switch (field.key) {
        case "copyright":
          footerData[field.key] = "© 2024 Neptino";
          break;
        case "teacher_name":
          footerData[field.key] = "[Teacher Name]";
          break;
        case "institution_name":
          footerData[field.key] = "[Institution Name]";
          break;
        case "page_number":
          footerData[field.key] = "1";
          break;
        default:
          footerData[field.key] = `[${field.label}]`;
      }
    });

    return {
      fields: footerData,
      activeFields: activeFields.map(f => ({ key: f.key, label: f.label })),
    };
  }
}

