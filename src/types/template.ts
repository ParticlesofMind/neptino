// ─── Media Types ────────────────────────────────────────────
export type MediaType =
  | 'video'
  | 'image'
  | 'richText'
  | 'embed'
  | 'quizQuestion'
  | 'assessment'
  | 'codePlayground'
  | 'downloadable'
  | 'certificateField';

// ─── Block Config Registry (maps each type to its data shape) ───
export interface BlockConfigMap {
  video: {
    url: string;
    provider: 'youtube' | 'vimeo' | 'loom' | 'upload';
    autoplay: boolean;
    startTime?: number;
    caption?: string;
  };
  image: {
    url: string;
    alt: string;
    caption?: string;
    alignment: 'left' | 'center' | 'right' | 'full';
    crop?: { x: number; y: number; width: number; height: number };
  };
  richText: {
    content: unknown[]; // Portable Text / Plate.js JSON
    format: 'portable-text' | 'plate' | 'html';
  };
  embed: {
    url: string;
    embedType: 'iframe' | 'oembed' | 'codepen' | 'figma';
    aspectRatio?: string;
  };
  quizQuestion: {
    questionType: 'multiple-choice' | 'true-false' | 'short-answer';
    question: string;
    options?: Array<{ id: string; text: string; isCorrect: boolean }>;
    explanation?: string;
    points: number;
  };
  assessment: {
    title: string;
    description: string;
    questions: string[]; // references to question blocks or embedded questions
  };
  codePlayground: {
    language: 'javascript' | 'python' | 'html' | 'css';
    code: string;
  };
  downloadable: {
    url: string;
    filename: string;
    fileSize: number;
  };
  certificateField: {
    field: 'recipientName' | 'courseName' | 'completionDate' | 'instructorName';
    placeholder: string;
  };
}

// ─── Content Block (discriminated union) ────────────────────
export interface BaseBlock {
  id: string;
  zoneId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export type ContentBlock = {
  [K in keyof BlockConfigMap]: BaseBlock & { type: K; data: BlockConfigMap[K] };
}[keyof BlockConfigMap];

// ─── Zone Definition ────────────────────────────────────────
export interface ZoneDefinition {
  id: string;
  name: string;                        // Machine name, doubles as CSS grid-area
  label: string;                       // Display label: "Main Content Area"
  description?: string;
  acceptedMediaTypes: MediaType[];     // Type constraint for this slot
  minBlocks: number;
  maxBlocks: number;                   // Use Infinity for unlimited
  defaultContent?: ContentBlock[];
}

// ─── Template Definition ────────────────────────────────────
export interface TemplateDefinition {
  id: string;
  name: string;                        // "Standard Lesson", "Quiz", "Certificate"
  slug: string;
  version: string;
  category: 'lesson' | 'quiz' | 'assessment' | 'certificate' | 'custom';
  description?: string;
  icon?: string;

  // CSS Grid layout (the "baked-in" structure)
  grid: {
    areas: string[];                   // ASCII-art rows for grid-template-areas
    columns: string;                   // grid-template-columns value
    rows: string;                      // grid-template-rows value
    gap: string;
  };

  zones: ZoneDefinition[];             // Named content slots
  metadata?: {
    estimatedDuration?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  };
}

// ─── Page Instance (a filled-in template) ───────────────────
export interface PageInstance {
  id: string;
  templateId: string;
  courseId: string;
  title: string;
  status: 'draft' | 'published' | 'archived';
  zones: Record<string, ContentBlock[]>;   // zoneId → ordered blocks
  version: number;
  createdAt: string;
  updatedAt: string;
}
