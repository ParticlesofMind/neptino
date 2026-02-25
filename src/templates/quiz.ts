import { TemplateDefinition } from '@/types/template';

export const QUIZ_TEMPLATE: TemplateDefinition = {
  id: 'tpl-quiz',
  name: 'Quiz',
  slug: 'quiz',
  version: '1.0.0',
  category: 'quiz',
  grid: {
    areas: [
      'instructions',
      'questions',
    ],
    columns: '1fr',
    rows: 'auto 1fr',
    gap: '16px',
  },
  zones: [
    {
      id: 'instructions', name: 'instructions', label: 'Quiz Instructions',
      acceptedMediaTypes: ['richText', 'image'],
      minBlocks: 1, maxBlocks: 1,
    },
    {
      id: 'questions', name: 'questions', label: 'Questions',
      acceptedMediaTypes: ['quizQuestion'],
      minBlocks: 1, maxBlocks: 100,
    },
  ],
};
