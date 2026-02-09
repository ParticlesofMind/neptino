export const BODY_PADDING = 24;
export const SECTION_SPACING = 28;
export const LINE_SPACING = 6;
export const BULLET_INDENT = 24;
export const NESTED_INDENT = 48;

export const HEADER_FIELD_ORDER = [
  "lesson_number",
  "date",
  "lesson_title",
  "module_title",
  "course_title",
  "teacher_name",
];

export const HEADER_FIELD_LABELS: Record<string, string> = {
  lesson_number: "Lesson Number",
  date: "Lesson Date",
  lesson_title: "Lesson Title",
  module_title: "Module Title",
  course_title: "Course Title",
  teacher_name: "Teacher",
};

export const FOOTER_FIELD_ORDER = ["copyright", "teacher_name", "institution_name", "page_number"];

export const FOOTER_FIELD_LABELS: Record<string, string> = {
  copyright: "Copyright",
  teacher_name: "Teacher",
  institution_name: "Institution",
  page_number: "Page",
};

export const HEADER_FOOTER_BG_COLOR = 0xdbeafe;
export const HEADER_FOOTER_BG_ALPHA = 0.35;
