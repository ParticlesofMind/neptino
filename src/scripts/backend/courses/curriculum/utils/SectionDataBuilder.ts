import { TemplateDefinitionBlock, CurriculumLesson } from "../curriculumManager.js";

export class SectionDataBuilder {
  /**
   * Build header data with fields and active fields
   */
  static buildHeaderData(
    block: TemplateDefinitionBlock,
    lesson: CurriculumLesson,
    courseContext?: {
      courseTitle?: string | null;
      institutionName?: string | null;
      teacherName?: string | null;
      moduleTitles?: Map<number, string> | Record<number, string>;
    },
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

    const moduleTitlesLookup = (() => {
      if (!courseContext?.moduleTitles) {
        return new Map<number, string>();
      }
      if (courseContext.moduleTitles instanceof Map) {
        return courseContext.moduleTitles as Map<number, string>;
      }
      return new Map(
        Object.entries(courseContext.moduleTitles).map(([key, value]) => [Number(key), value as string]),
      );
    })();

    const activeFields = headerFields.filter((field) => {
      if (field.mandatory) {
        return config[field.configKey] !== false;
      }
      return config[field.configKey] === true;
    });

    const headerData: Record<string, unknown> = {};

    activeFields.forEach((field) => {
      switch (field.key) {
        case "lesson_number":
          headerData[field.key] = lesson.lessonNumber || 1;
          break;
        case "lesson_title":
          headerData[field.key] =
            lesson.title && lesson.title.trim().length
              ? lesson.title
              : `Lesson ${lesson.lessonNumber || 1}`;
          break;
        case "module_title": {
          const moduleNumber = lesson.moduleNumber || 0;
          const moduleTitle = moduleNumber
            ? moduleTitlesLookup.get(moduleNumber) || `Module ${moduleNumber}`
            : null;
          headerData[field.key] = moduleTitle;
          break;
        }
        case "course_title":
          headerData[field.key] = courseContext?.courseTitle ?? null;
          break;
        case "institution_name":
          headerData[field.key] = courseContext?.institutionName ?? null;
          break;
        case "teacher_name":
          headerData[field.key] = courseContext?.teacherName ?? null;
          break;
        default:
          headerData[field.key] = null;
      }
    });

    return {
      fields: headerData,
    };
  }

  /**
   * Build footer data with fields and active fields
   */
  static buildFooterData(
    block: TemplateDefinitionBlock,
    _lesson: CurriculumLesson,
    courseContext?: {
      institutionName?: string | null;
      teacherName?: string | null;
    },
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
      }
      return config[field.configKey] === true;
    });

    const footerData: Record<string, unknown> = {};

    activeFields.forEach((field) => {
      switch (field.key) {
        case "copyright":
          footerData[field.key] = "© 2024 Neptino";
          break;
        case "teacher_name":
          footerData[field.key] = courseContext?.teacherName ?? null;
          break;
        case "institution_name":
          footerData[field.key] = courseContext?.institutionName ?? null;
          break;
        case "page_number":
          footerData[field.key] = "1";
          break;
        default:
          footerData[field.key] = null;
      }
    });

    return {
      fields: footerData,
    };
  }
}
