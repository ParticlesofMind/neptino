'use client';

import { useDraggable } from '@dnd-kit/core';
import { MediaType } from '@/types/template';
import {
  Video,
  Image as ImageIcon,
  Type,
  Link as LinkIcon,
  HelpCircle,
  Download,
  Award,
  Terminal,
  FileCheck
} from 'lucide-react';

const PALETTE_ITEMS: Array<{ type: MediaType; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { type: 'video',        label: 'Video',         icon: Video },
  { type: 'image',        label: 'Image',         icon: ImageIcon },
  { type: 'richText',     label: 'Text Block',    icon: Type },
  { type: 'embed',        label: 'Embed',         icon: LinkIcon },
  { type: 'quizQuestion', label: 'Quiz Question', icon: HelpCircle },
  { type: 'assessment',   label: 'Assessment',    icon: FileCheck },
  { type: 'codePlayground', label: 'Code Playground', icon: Terminal },
  { type: 'downloadable', label: 'File Download', icon: Download },
  { type: 'certificateField', label: 'Cert Field', icon: Award },
];

interface PaletteItemProps {
  type: MediaType;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

function PaletteItem({ type, label, icon: Icon }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { mediaType: type, fromPalette: true },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-3 px-3 py-2.5 rounded-md border
        bg-white cursor-grab hover:border-blue-300 hover:shadow-sm hover:bg-gray-50
        transition-all select-none w-full
        ${isDragging ? 'opacity-40 scale-95' : 'border-gray-200'}
      `}
    >
      <div className="text-gray-500">
        <Icon className="w-4 h-4" />
      </div>
      <span className="text-sm font-medium text-gray-700">{label}</span>
    </div>
  );
}

export function MediaPalette() {
  return (
    <div className="w-64 p-4 bg-gray-50 border-r border-gray-200 h-full overflow-y-auto">
      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4 px-1">
        Content Blocks
      </h3>
      <div className="space-y-2">
        {PALETTE_ITEMS.map((item) => (
          <PaletteItem key={item.type} {...item} />
        ))}
      </div>

      <div className="mt-8 px-1">
        <p className="text-xs text-gray-400">
          Drag blocks onto the canvas zones to build your lesson structure.
        </p>
      </div>
    </div>
  );
}
