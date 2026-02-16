import { TemplateDefinitionBlock, CurriculumLesson } from "../curriculumManager.js";
import { formatDate } from "../../../../coursebuilder/layout/pages/PageMetadata.js";

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
      lessonDate?: string | null;
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
      { key: "date", label: "Date", configKey: "date", mandatory: true },
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

    const resolvedFields = headerFields.map((field) => ({
      ...field,
      selection: SectionDataBuilder.resolveFieldConfig(config[field.configKey], field.mandatory),
    }));
    const activeFields = resolvedFields.filter((field) => field.selection.enabled);

    const headerData: Record<string, unknown> = {};

    activeFields.forEach((field) => {
      const presetValue = field.selection.presetValue;
      let resolvedValue: unknown = null;

      switch (field.key) {
        case "lesson_number":
          resolvedValue = lesson.lessonNumber || 1;
          break;
        case "lesson_title":
          resolvedValue =
            lesson.title && lesson.title.trim().length
              ? lesson.title
              : `Lesson ${lesson.lessonNumber || 1}`;
          break;
        case "module_title": {
          const moduleNumber = lesson.moduleNumber || 0;
          const moduleTitle = moduleNumber
            ? moduleTitlesLookup.get(moduleNumber) || `Module ${moduleNumber}`
            : null;
          resolvedValue = moduleTitle;
          break;
        }
        case "course_title":
          resolvedValue = courseContext?.courseTitle ?? null;
          break;
        case "institution_name":
          resolvedValue = courseContext?.institutionName ?? null;
          break;
        case "teacher_name":
          resolvedValue = courseContext?.teacherName ?? null;
          break;
        case "date":
          resolvedValue = courseContext?.lessonDate ? formatDate(courseContext.lessonDate) : null;
          break;
        default:
          resolvedValue = null;
      }

      headerData[field.key] = SectionDataBuilder.hasPresetValue(presetValue)
        ? presetValue
        : resolvedValue ?? null;
    });

    return {
      fields: headerData,
      activeFields: activeFields.map((field) => ({
        key: field.key,
        label: field.label,
      })),
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

    const resolvedFields = footerFields.map((field) => ({
      ...field,
      selection: SectionDataBuilder.resolveFieldConfig(config[field.configKey], field.mandatory),
    }));
    const activeFields = resolvedFields.filter((field) => field.selection.enabled);

    const footerData: Record<string, unknown> = {};

    activeFields.forEach((field) => {
      const presetValue = field.selection.presetValue;
      let resolvedValue: unknown = null;

      switch (field.key) {
        case "copyright":
          resolvedValue = "© 2024 Neptino";
          break;
        case "teacher_name":
          resolvedValue = courseContext?.teacherName ?? null;
          break;
        case "institution_name":
          resolvedValue = courseContext?.institutionName ?? null;
          break;
        case "page_number":
          resolvedValue = "1";
          break;
        default:
          resolvedValue = null;
      }

      footerData[field.key] = SectionDataBuilder.hasPresetValue(presetValue)
        ? presetValue
        : resolvedValue ?? null;
    });

    return {
      fields: footerData,
      activeFields: activeFields.map((field) => ({
        key: field.key,
        label: field.label,
      })),
    };
  }

  private static resolveFieldConfig(
    rawValue: unknown,
    mandatory: boolean,
  ): { enabled: boolean; presetValue?: unknown } {
    if (rawValue && typeof rawValue === "object" && !Array.isArray(rawValue)) {
      const record = rawValue as Record<string, unknown>;
      const displayFlag = record.display ?? record.show ?? record.enabled;
      const presetValue = record.value ?? record.text ?? record.default ?? record.label;
      const normalizedDisplay = this.normalizeBooleanFlag(displayFlag);

      if (typeof normalizedDisplay === "boolean") {
        return { enabled: normalizedDisplay, presetValue };
      }

      if (this.hasPresetValue(presetValue)) {
        return { enabled: true, presetValue };
      }

      return { enabled: mandatory, presetValue };
    }

    if (this.hasPresetValue(rawValue)) {
      return { enabled: true, presetValue: rawValue };
    }

    const normalized = this.normalizeBooleanFlag(rawValue);
    if (typeof normalized === "boolean") {
      return { enabled: normalized, presetValue: undefined };
    }

    return { enabled: mandatory, presetValue: undefined };
  }

  private static normalizeBooleanFlag(value: unknown): boolean | undefined {
    if (typeof value === "boolean") {
      return value;
    }
    if (typeof value === "number") {
      if (value === 0) return false;
      if (value === 1) return true;
    }
    if (typeof value === "string") {
      const normalized = value.trim().toLowerCase();
      if (["true", "1", "yes", "on"].includes(normalized)) {
        return true;
      }
      if (["false", "0", "no", "off"].includes(normalized)) {
        return false;
      }
    }
    return undefined;
  }

  private static hasPresetValue(value: unknown): boolean {
    if (value === null || typeof value === "undefined") {
      return false;
    }

    if (typeof value === "boolean") {
      return false;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed.length) {
        return false;
      }
      if (this.isPlaceholderToken(trimmed)) {
        return false;
      }
      return true;
    }

    if (typeof value === "number") {
      return Number.isFinite(value);
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return typeof value === "object";
  }

  private static isPlaceholderToken(value: string): boolean {
    const normalized = value.trim().toLowerCase();
    if (!normalized.length) {
      return true;
    }

    if (normalized.startsWith("{{") && normalized.endsWith("}}")) {
      return true;
    }

    if (normalized.startsWith("[") && normalized.endsWith("]")) {
      const inner = normalized.slice(1, -1).trim();
      return this.isPlaceholderToken(inner);
    }

    const placeholderPatterns = [
      /^(lesson\s*(number|title)?)$/,
      /^(module\s*(number|title)?)$/,
      /^(course\s*(title|name)?)$/,
      /^(teacher(\s*name)?)$/,
      /^(institution(\s*name)?)$/,
      /^date$/,
      /^page(\s*number)?$/,
      /^copyright$/,
      /^add\s+.+$/,
      /^click\s+to\s+add.+$/,
    ];

    return placeholderPatterns.some((pattern) => pattern.test(normalized));
  }
}
