import { TemplateDefinition } from '@/types/template';

export const LESSON_TEMPLATE: TemplateDefinition = {
  id: 'tpl-lesson-standard',
  name: 'Standard Lesson',
  slug: 'lesson-standard',
  version: '1.0.0',
  category: 'lesson',
  description: 'Two-column lesson with header, content, sidebar, and footer',
  grid: {
    areas: [
      'header   header   header',
      'content  content  sidebar',
      'content  content  sidebar',
      'footer   footer   footer',
    ],
    columns: '1fr 1fr 280px',
    rows: '80px 1fr 1fr 64px',
    gap: '12px',
  },
  zones: [
    {
      id: 'header', name: 'header', label: 'Lesson Header',
      acceptedMediaTypes: ['image', 'video'],
      minBlocks: 0, maxBlocks: 1,
    },
    {
      id: 'content', name: 'content', label: 'Main Content',
      acceptedMediaTypes: ['richText', 'image', 'video', 'embed', 'codePlayground'],
      minBlocks: 1, maxBlocks: 50,
    },
    {
      id: 'sidebar', name: 'sidebar', label: 'Resources',
      acceptedMediaTypes: ['downloadable', 'embed', 'image', 'richText'],
      minBlocks: 0, maxBlocks: 10,
    },
    {
      id: 'footer', name: 'footer', label: 'Page Footer',
      acceptedMediaTypes: ['richText'],
      minBlocks: 0, maxBlocks: 1,
    },
  ],
};
