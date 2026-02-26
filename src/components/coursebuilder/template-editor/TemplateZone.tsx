'use client';

import { useDroppable } from '@dnd-kit/core';
import { ZoneDefinition, ContentBlock } from '@/types/template';
import { Plus } from 'lucide-react';
import { PlacedBlock } from './PlacedBlock';

interface DropZoneProps {
  zone: ZoneDefinition;
  blocks: ContentBlock[];
  onRemoveBlock: (blockId: string) => void;
}

export function TemplateZone({ zone, blocks, onRemoveBlock }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: zone.id,
    data: {
      zoneId: zone.id,
      maxBlocks: zone.maxBlocks,
      currentCount: blocks.length,
      accept: zone.acceptedMediaTypes,
    },
  });

  const isFull = blocks.length >= zone.maxBlocks;
  const isEmpty = blocks.length === 0;

  return (
    <div
      ref={setNodeRef}
      style={{ gridArea: zone.name }}
      className={`
        relative rounded-lg border-2 transition-all duration-200 p-3 min-h-[120px] flex flex-col gap-2
        ${isEmpty
          ? 'border-dashed border-gray-300 bg-gray-50/50'
          : 'border-solid border-transparent bg-white/50'
        }
        ${isOver && !isFull
          ? 'border-blue-500 bg-blue-50 scale-[1.01] shadow-lg shadow-blue-100 ring-2 ring-blue-200'
          : ''
        }
        ${isOver && isFull
          ? 'border-red-300 bg-red-50/30'
          : ''
        }
      `}
    >
      {/* Zone label badge */}
      <div className="absolute -top-2.5 left-3 z-20">
        <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 text-gray-500 rounded uppercase tracking-wider border border-gray-200 shadow-sm">
          {zone.label}
        </span>
        {isFull && (
           <span className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-red-100 text-red-700 rounded border border-red-200">
             FULL
           </span>
        )}
      </div>

      {/* Empty state */}
      {isEmpty && !isDropTarget && (
        <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none pointer-events-none py-8">
          <Plus className="w-6 h-6 mb-1 opacity-40" />
          <span className="text-xs text-center px-4">
            Drop {zone.acceptedMediaTypes.join(', ')} here
          </span>
        </div>
      )}

      {/* Active drop indicator */}
      {isOver && !isFull && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-blue-500/10 pointer-events-none z-20 animate-pulse">
          <span className="text-blue-600 text-sm font-bold bg-white/80 px-3 py-1 rounded-full shadow-sm">
            Release to drop
          </span>
        </div>
      )}

      {/* Rendered blocks */}
      <div className="relative z-10 space-y-2 flex-1">
        {blocks.map((block) => (
          <PlacedBlock key={block.id} block={block} onRemove={onRemoveBlock} />
        ))}
      </div>
    </div>
  );
}
