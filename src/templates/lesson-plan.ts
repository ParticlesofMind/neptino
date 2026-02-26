import { TemplateDefinition } from '@/types/template';

// Template that mirrors the Program/Resources/Content layout from the lesson plan mock
// (page header, structured program table area, resources strip, and large content area)
export const LESSON_PLAN_TEMPLATE: TemplateDefinition = {
  id: 'tpl-lesson-plan',
  name: 'Lesson Plan (Program + Content)',
  slug: 'lesson-plan',
  version: '1.0.0',
  category: 'lesson',
  description: 'A4 lesson plan with program, content, resources, and footer slots styled like the provided template.',
  grid: {
    areas: [
      'header    header    header',
      'program   program   resources',
      'program   program   resources',
      'content   content   resources',
      'content   content   resources',
      'footer    footer    footer',
    ],
    columns: '2fr 2fr 1.15fr',
    rows: '100px 1fr 1fr 1fr 1fr 80px',
    gap: '12px',
  },
  zones: [
    {
      id: 'header',
      name: 'header',
      label: 'Session Header',
      acceptedMediaTypes: ['richText', 'image'],
      minBlocks: 0,
      maxBlocks: 2,
      description: 'Session meta (e.g., L1 Session 1, date, delivery mode).',
    },
    {
      id: 'program',
      name: 'program',
      label: 'Program',
      acceptedMediaTypes: ['richText', 'embed', 'image'],
      minBlocks: 0,
      maxBlocks: 8,
      description: 'Objectives, topics, and task rows — matches the Program table in the screenshot.',
    },
    {
      id: 'resources',
      name: 'resources',
      label: 'Resources',
      acceptedMediaTypes: ['downloadable', 'embed', 'image', 'richText'],
      minBlocks: 0,
      maxBlocks: 10,
      description: 'Resource list / table alongside the program.',
    },
    {
      id: 'content',
      name: 'content',
      label: 'Content',
      acceptedMediaTypes: ['richText', 'image', 'video', 'embed', 'quizQuestion', 'assessment', 'codePlayground'],
      minBlocks: 0,
      maxBlocks: 30,
      description: 'Main content area (instruction, student/teacher areas, facilitation notes).',
    },
    {
      id: 'footer',
      name: 'footer',
      label: 'Footer',
      acceptedMediaTypes: ['richText', 'image'],
      minBlocks: 0,
      maxBlocks: 2,
      description: 'Footer badges / tags (year, audience, mode).',
    },
  ],
};
