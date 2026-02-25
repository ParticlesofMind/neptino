'use client';

import { ContentBlock } from '@/types/template';
import { Trash2, GripVertical } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

interface PlacedBlockProps {
  block: ContentBlock;
  onRemove: (blockId: string) => void;
}

export function PlacedBlock({ block, onRemove }: PlacedBlockProps) {
  // Blocks within a zone are also draggable (for reordering or moving between zones)
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: block.id,
    data: {
      block,
      type: block.type, // Useful for validation
      fromZone: block.zoneId,
    },
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        relative group flex items-start gap-2 p-3 rounded-md border bg-white shadow-sm
        transition-all select-none
        ${isDragging ? 'opacity-50 z-50 ring-2 ring-blue-400' : 'border-gray-200 hover:border-blue-300'}
      `}
      {...attributes}
      {...listeners}
    >
      <div className="mt-1 text-gray-400 cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {block.type}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemove(block.id);
            }}
            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded"
          >
            <Trash2 size={14} />
          </button>
        </div>

        <div className="text-sm text-gray-700 truncate">
           {renderBlockSummary(block)}
        </div>
      </div>
    </div>
  );
}

function renderBlockSummary(block: ContentBlock): string {
  switch (block.type) {
    case 'video':
      return block.data.url || 'No video URL set';
    case 'image':
      return block.data.alt || block.data.url || 'Image block';
    case 'richText':
      return 'Rich Text Content';
    case 'embed':
      return block.data.url || 'Embed block';
    case 'quizQuestion':
      return block.data.question || 'New Question';
    case 'assessment':
      return block.data.title || 'Assessment';
    case 'codePlayground':
      return `${block.data.language} playground`;
    case 'downloadable':
      return block.data.filename || 'Downloadable file';
    case 'certificateField':
      return `Certificate Field: ${block.data.field}`;
    default:
      return 'Unknown block';
  }
}
