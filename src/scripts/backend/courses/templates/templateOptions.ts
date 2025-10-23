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
  "body",
  "footer",
  // Body sub-blocks
  "program",
  "resources",
  "content",
  "assignment",
  "scoring",
] as const;

export type TemplateBlockType = (typeof TEMPLATE_BLOCK_TYPES)[number];

// All templates now follow header-body-footer structure
// Body contains nested sub-blocks specific to each template type
export const TEMPLATE_BLOCK_SEQUENCES: Record<TemplateType, TemplateBlockType[]> = {
  lesson: ["header", "body", "footer"],
  quiz: ["header", "body", "footer"],
  feedback: ["header", "body", "footer"],
  assessment: ["header", "body", "footer"],
  report: ["header", "body", "footer"],
  review: ["header", "body", "footer"],
  project: ["header", "body", "footer"],
  module_orientation: ["header", "body", "footer"],
  course_orientation: ["header", "body", "footer"],
  certificate: ["header", "body", "footer"],
};

// Define what goes inside the body for each template type
export const TEMPLATE_BODY_BLOCKS: Record<TemplateType, TemplateBlockType[]> = {
  lesson: ["program", "resources", "content", "assignment"],
  quiz: ["program", "resources", "content", "scoring"],
  feedback: ["program", "resources", "content", "scoring"],
  assessment: ["program", "resources", "content", "scoring"],
  report: ["program", "resources", "content", "scoring"],
  review: ["program", "resources", "content", "assignment"],
  project: ["program", "resources", "content", "assignment"],
  module_orientation: ["program", "resources"],
  course_orientation: ["program", "resources"],
  certificate: ["content"],
};

export const BLOCK_CONTENT_TEMPLATES: Record<TemplateBlockType, string> = {
  header: '<div class="header-section">{{header}}</div>',
  body: '<div class="body-section">{{body}}</div>',
  footer: '<footer class="template-footer">{{footer}}</footer>',
  // Body sub-blocks
  program: '<div class="program-section">{{program}}</div>',
  resources: '<div class="resources-section">{{resources}}</div>',
  content: '<div class="content-section">{{content}}</div>',
  assignment: '<div class="assignment-section">{{assignment}}</div>',
  scoring: '<div class="scoring-section">{{scoring}}</div>',
};

/**
 * Get the complete block structure for a template type
 * Returns header, body with its nested sub-blocks, and footer
 */
export function getTemplateBlockStructure(templateType: TemplateType): {
  main: TemplateBlockType[];
  bodyBlocks: TemplateBlockType[];
} {
  return {
    main: TEMPLATE_BLOCK_SEQUENCES[templateType],
    bodyBlocks: TEMPLATE_BODY_BLOCKS[templateType],
  };
}

/**
 * Check if a block type is a body sub-block
 */
export function isBodySubBlock(blockType: TemplateBlockType): boolean {
  return !["header", "body", "footer"].includes(blockType);
}
