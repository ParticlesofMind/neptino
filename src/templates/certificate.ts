import { TemplateDefinition } from '@/types/template';

export const CERTIFICATE_TEMPLATE: TemplateDefinition = {
  id: 'tpl-certificate',
  name: 'Certificate of Completion',
  slug: 'certificate',
  version: '1.0.0',
  category: 'certificate',
  grid: {
    areas: [
      'logo        logo        logo',
      '.           title       .',
      '.           recipient   .',
      '.           details     .',
      'signature   signature   seal',
    ],
    columns: '120px 1fr 120px',
    rows: '80px auto auto 1fr 100px',
    gap: '8px',
  },
  zones: [
    { id: 'logo', name: 'logo', label: 'Organization Logo',
      acceptedMediaTypes: ['image'], minBlocks: 1, maxBlocks: 1 },
    { id: 'title', name: 'title', label: 'Certificate Title',
      acceptedMediaTypes: ['richText'], minBlocks: 1, maxBlocks: 1 },
    { id: 'recipient', name: 'recipient', label: 'Recipient Name',
      acceptedMediaTypes: ['certificateField'], minBlocks: 1, maxBlocks: 1 },
    { id: 'details', name: 'details', label: 'Course Details',
      acceptedMediaTypes: ['richText', 'certificateField'], minBlocks: 0, maxBlocks: 5 },
    { id: 'signature', name: 'signature', label: 'Signature',
      acceptedMediaTypes: ['image', 'richText'], minBlocks: 0, maxBlocks: 2 },
    { id: 'seal', name: 'seal', label: 'Seal / Badge',
      acceptedMediaTypes: ['image'], minBlocks: 0, maxBlocks: 1 },
  ],
};
