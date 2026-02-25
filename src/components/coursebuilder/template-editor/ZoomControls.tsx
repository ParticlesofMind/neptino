'use client';

import { ZoomIn, ZoomOut, Search } from 'lucide-react';

interface ZoomControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
}

export function ZoomControls({ zoom, onZoomChange }: ZoomControlsProps) {
  return (
    <div className="fixed bottom-6 right-6 flex items-center gap-2 bg-white rounded-full shadow-lg border border-gray-200 p-1.5 z-50">
      <button
        onClick={() => onZoomChange(Math.max(0.25, zoom - 0.1))}
        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        title="Zoom Out"
      >
        <ZoomOut size={18} />
      </button>

      <span className="text-xs font-medium w-12 text-center select-none text-gray-700">
        {Math.round(zoom * 100)}%
      </span>

      <button
        onClick={() => onZoomChange(Math.min(2, zoom + 0.1))}
        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
        title="Zoom In"
      >
        <ZoomIn size={18} />
      </button>

        <button
        onClick={() => onZoomChange(1)}
        className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors border-l ml-1 pl-3"
        title="Reset Zoom"
      >
        <Search size={14} />
      </button>
    </div>
  );
}
