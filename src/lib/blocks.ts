import { MediaType, BlockConfigMap, BaseBlock, ZoneDefinition, PageInstance, TemplateDefinition } from '@/types/template';

// Type-safe block creation
export function createBlock<T extends MediaType>(
  type: T,
  data: BlockConfigMap[T],
  zoneId: string,
): BaseBlock & { type: T; data: BlockConfigMap[T] } {
  return {
    id: crypto.randomUUID(),
    type,
    data,
    zoneId,
    order: 0, // Order should be managed by the container
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function validateBlockForZone(
  blockType: MediaType,
  zone: ZoneDefinition,
  currentBlockCount: number,
): { valid: boolean; reason?: string } {
  if (!zone.acceptedMediaTypes.includes(blockType)) {
    return {
      valid: false,
      reason: `"${blockType}" is not allowed in "${zone.label}". Accepts: ${zone.acceptedMediaTypes.join(', ')}`,
    };
  }
  if (currentBlockCount >= zone.maxBlocks) {
    return {
      valid: false,
      reason: `"${zone.label}" already has ${zone.maxBlocks} block(s) (maximum reached)`,
    };
  }
  return { valid: true };
}

export function validatePage(
  page: PageInstance,
  template: TemplateDefinition,
): Array<{ zoneId: string; message: string }> {
  const errors: Array<{ zoneId: string; message: string }> = [];

  for (const zone of template.zones) {
    const blocks = page.zones[zone.id] ?? [];
    if (blocks.length < zone.minBlocks) {
      errors.push({ zoneId: zone.id, message: `Requires at least ${zone.minBlocks} block(s)` });
    }
    for (const block of blocks) {
      if (!zone.acceptedMediaTypes.includes(block.type)) {
        errors.push({ zoneId: zone.id, message: `Invalid block type "${block.type}" in "${zone.label}"` });
      }
    }
  }
  return errors;
}

export function getDefaultData(type: MediaType): BlockConfigMap[MediaType] {
    switch (type) {
        case 'video':
            return {
                url: '',
                provider: 'youtube',
                autoplay: false
            };
        case 'image':
            return {
                url: '',
                alt: '',
                alignment: 'center'
            };
        case 'richText':
            return {
                content: [],
                format: 'html'
            };
        case 'embed':
            return {
                url: '',
                embedType: 'iframe'
            };
        case 'quizQuestion':
            return {
                questionType: 'multiple-choice',
                question: '',
                points: 1
            };
        case 'assessment':
            return {
                title: 'New Assessment',
                description: '',
                questions: []
            };
        case 'codePlayground':
            return {
                language: 'javascript',
                code: '// Write your code here'
            };
        case 'downloadable':
            return {
                url: '',
                filename: 'file.pdf',
                fileSize: 0
            };
        case 'certificateField':
            return {
                field: 'recipientName',
                placeholder: 'Recipient Name'
            };
        default:
             throw new Error(`Unknown media type: ${type}`);
    }
}
