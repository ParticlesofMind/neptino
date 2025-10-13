export const TEMPLATE_TYPES = [
  "lesson",
  "quiz",
  "feedback",
  "assessment",
  "report",
  "review",
  "project",
  "module_orientation",
  "course_orientation",
  "certificate",
] as const;

export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const TEMPLATE_TYPE_LABELS: Record<TemplateType, string> = {
  lesson: "Lesson",
  quiz: "Quiz",
  feedback: "Feedback",
  assessment: "Assessment",
  report: "Report",
  review: "Review",
  project: "Project",
  module_orientation: "Module Orientation",
  course_orientation: "Course Orientation",
  certificate: "Certificate",
};

export const TEMPLATE_TYPE_OPTIONS = TEMPLATE_TYPES.map((value) => ({
  value,
  label: TEMPLATE_TYPE_LABELS[value],
}));

export const TEMPLATE_BLOCK_TYPES = [
  "header",
  "program",
  "resources",
  "content",
  "assignment",
  "scoring",
  "footer",
] as const;

export type TemplateBlockType = (typeof TEMPLATE_BLOCK_TYPES)[number];

export const TEMPLATE_BLOCK_SEQUENCES: Record<TemplateType, TemplateBlockType[]> = {
  lesson: ["header", "program", "resources", "content", "assignment", "footer"],
  quiz: ["header", "program", "resources", "content", "scoring", "footer"],
  feedback: ["header", "program", "resources", "content", "scoring", "footer"],
  assessment: ["header", "program", "resources", "content", "scoring", "footer"],
  report: ["header", "program", "resources", "content", "scoring", "footer"],
  review: ["header", "program", "resources", "content", "assignment", "footer"],
  project: ["header", "program", "resources", "content", "assignment"],
  module_orientation: ["header", "program", "resources", "footer"],
  course_orientation: ["header", "program", "resources", "footer"],
  certificate: ["header", "content", "footer"],
};

export const BLOCK_CONTENT_TEMPLATES: Record<TemplateBlockType, string> = {
  header: '<div class="header-section">{{header}}</div>',
  program: '<div class="program-section">{{program}}</div>',
  resources: '<div class="resources-section">{{resources}}</div>',
  content: '<div class="content-section">{{content}}</div>',
  assignment: '<div class="assignment-section">{{assignment}}</div>',
  scoring: '<div class="scoring-section">{{scoring}}</div>',
  footer: '<footer class="template-footer">{{footer}}</footer>',
};
