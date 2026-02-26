'use client';

import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
} from '@dnd-kit/core';
import { useState, useCallback } from 'react';
import type { TemplateDefinition, ContentBlock, PageInstance } from '@/types/template';
import { createBlock, getDefaultData } from '@/lib/blocks';
import { LESSON_TEMPLATE } from '@/templates/lesson';
import { MediaPalette } from './MediaPalette';
import { PageCanvas } from './PageCanvas';
import { TemplateZone } from './TemplateZone';
import { ZoomControls } from './ZoomControls';
import { EditorCommand, AddBlockCommand, MoveBlockCommand, RemoveBlockCommand } from '@/lib/commands';

export function CoursePageEditor({ template = LESSON_TEMPLATE }: {
  template?: TemplateDefinition;
}) {
  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  const [page, setPage] = useState<PageInstance>({
    id: crypto.randomUUID(),
    templateId: template.id,
    courseId: 'course-1',
    title: 'Untitled Page',
    status: 'draft',
    zones: Object.fromEntries(template.zones.map(z => [z.id, []])),
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState<EditorCommand[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const executeCommand = useCallback((command: EditorCommand) => {
    command.execute();
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(command);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex >= 0) {
      const command = history[historyIndex];
      command.undo();
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const command = history[historyIndex + 1];
      command.execute();
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    // noop for now but kept to aid debugging and future overlays
    void event;
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const targetZoneId = over.id as string;
    const sourceData = active.data.current;

    const zoneDef = template.zones.find((z) => z.id === targetZoneId);
    if (!zoneDef) return;

    const currentBlocks = page.zones[targetZoneId] || [];

    // Media-type gating
    const draggedType = sourceData?.mediaType ?? sourceData?.block?.type;
    if (draggedType && !zoneDef.acceptedMediaTypes.includes(draggedType)) return;

    // Capacity gating
    if (currentBlocks.length >= zoneDef.maxBlocks) return;

    if (sourceData?.fromPalette) {
      const newBlock = createBlock(
        sourceData.mediaType,
        getDefaultData(sourceData.mediaType),
        targetZoneId,
      );

      const command = new AddBlockCommand(setPage, targetZoneId, { ...newBlock, order: currentBlocks.length });
      executeCommand(command);
      return;
    }

    if (sourceData?.block) {
      const block = sourceData.block as ContentBlock;
      const sourceZoneId = sourceData.fromZone;

      if (sourceZoneId === targetZoneId) return; // same-zone reordering not wired yet

      const command = new MoveBlockCommand(setPage, sourceZoneId, targetZoneId, block, currentBlocks.length);
      executeCommand(command);
    }
  }, [page, template, executeCommand]);

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <MediaPalette />

        <div className="flex-1 relative overflow-hidden flex flex-col">
            <div className="absolute top-4 left-4 z-10 flex gap-2">
              <button 
                onClick={undo} 
                disabled={historyIndex < 0}
                className="px-3 py-1 bg-white border rounded shadow-sm disabled:opacity-50"
              >
                Undo
              </button>
              <button 
                onClick={redo} 
                disabled={historyIndex >= history.length - 1}
                className="px-3 py-1 bg-white border rounded shadow-sm disabled:opacity-50"
              >
                Redo
              </button>
            </div>

            <PageCanvas template={template} zoom={zoom}>
            {template.zones.map(zone => (
                <TemplateZone
                key={zone.id}
                zone={zone}
                blocks={page.zones[zone.id] || []}
                onRemoveBlock={(blockId) => {
                    const block = page.zones[zone.id].find(b => b.id === blockId);
                    if (block) {
                      const command = new RemoveBlockCommand(setPage, zone.id, block);
                      executeCommand(command);
                    }
                }}
                />
            ))}
            </PageCanvas>

            <ZoomControls zoom={zoom} onZoomChange={setZoom} />
        </div>
      </div>
      <DragOverlay>
        {active => {
          if (!active) return null;
          const data = active.data.current;
          return (
            <div className="px-3 py-2.5 rounded-md border bg-white shadow-xl border-blue-400 opacity-90 scale-105">
              <span className="text-sm font-medium text-gray-700">
                {data?.mediaType || data?.block?.type || 'Dragging...'}
              </span>
            </div>
          );
        }}
      </DragOverlay>
    </DndContext>
  );
}
