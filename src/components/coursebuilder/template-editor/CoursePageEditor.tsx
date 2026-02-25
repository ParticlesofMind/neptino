'use client';

import { DndContext, DragEndEvent, DragOverlay, useSensors, useSensor, PointerSensor, DragStartEvent } from '@dnd-kit/core';
import { useState, useCallback, useEffect } from 'react';
import type { TemplateDefinition, ContentBlock, PageInstance, MediaType } from '@/types/template';
import { createBlock, getDefaultData } from '@/lib/blocks';
import { LESSON_TEMPLATE } from '@/templates/lesson';
import { MediaPalette } from './MediaPalette';
import { PageCanvas } from './PageCanvas';
import { TemplateZone } from './TemplateZone';
import { ZoomControls } from './ZoomControls';
import { PlacedBlock } from './PlacedBlock';
import { createPortal } from 'react-dom';

export function CoursePageEditor({ template = LESSON_TEMPLATE }: {
  template?: TemplateDefinition;
}) {
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

  const [zoom, setZoom] = useState(0.75);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeItem, setActiveItem] = useState<ContentBlock | { type: MediaType; label: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    const data = event.active.data.current;
    if (data?.fromPalette) {
       setActiveItem({ type: data.mediaType, label: data.mediaType });
    } else if (data?.block) {
       setActiveItem(data.block);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    setActiveItem(null);

    if (!over) return;

    const targetZoneId = over.id as string;
    const sourceData = active.data.current;

    // Find the zone definition to validate
    const zoneDef = template.zones.find(z => z.id === targetZoneId);

    // If we dropped on a zone (and not somewhere else)
    if (zoneDef) {
        const currentBlocks = page.zones[targetZoneId] || [];

        // 1. Check max blocks
        if (currentBlocks.length >= zoneDef.maxBlocks) return;

        // 2. Check accepted types
        // Note: For dnd-kit core, we manually check here.
        // Although we used data.accepts in TemplateZone for visual feedback, we enforce it here.
        const typeToCheck = sourceData?.mediaType || sourceData?.type;
        if (!zoneDef.acceptedMediaTypes.includes(typeToCheck)) return;

        // 3. Create or Move block
        if (sourceData?.fromPalette) {
            // Creating new block from palette
            const newBlock = createBlock(
                sourceData.mediaType,
                getDefaultData(sourceData.mediaType),
                targetZoneId,
            );

            setPage(prev => ({
                ...prev,
                zones: {
                ...prev.zones,
                [targetZoneId]: [
                    ...prev.zones[targetZoneId],
                    { ...newBlock, order: prev.zones[targetZoneId].length },
                ],
                },
                updatedAt: new Date().toISOString(),
            }));
        } else if (sourceData?.block) {
            // Moving existing block
            const block = sourceData.block as ContentBlock;
            const sourceZoneId = sourceData.fromZone;

            if (sourceZoneId === targetZoneId) {
                // Reordering within same zone (not implemented in this simplified version, requires sortable)
                // For now, we just append to end if it's the same zone, which does nothing if we don't handle index.
                // To properly implement reordering, we'd need @dnd-kit/sortable.
                return;
            }

            // Moving between zones
            setPage(prev => {
                const sourceZoneBlocks = prev.zones[sourceZoneId].filter(b => b.id !== block.id);
                const targetZoneBlocks = [...prev.zones[targetZoneId], { ...block, zoneId: targetZoneId }];

                return {
                    ...prev,
                    zones: {
                        ...prev.zones,
                        [sourceZoneId]: sourceZoneBlocks,
                        [targetZoneId]: targetZoneBlocks
                    },
                    updatedAt: new Date().toISOString(),
                };
            });
        }
    }
  }, [page, template]);

  return (
    <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
    >
      <div className="flex h-screen overflow-hidden bg-gray-100">
        <MediaPalette />

        <div className="flex-1 relative overflow-hidden">
            <PageCanvas template={template} zoom={zoom}>
            {template.zones.map(zone => (
                <TemplateZone
                key={zone.id}
                zone={zone}
                blocks={page.zones[zone.id] || []}
                onRemoveBlock={(blockId) => {
                    setPage(prev => ({
                    ...prev,
                    zones: {
                        ...prev.zones,
                        [zone.id]: prev.zones[zone.id].filter(b => b.id !== blockId),
                    },
                    updatedAt: new Date().toISOString(),
                    }));
                }}
                />
            ))}
            </PageCanvas>

            <ZoomControls zoom={zoom} onZoomChange={setZoom} />
        </div>

        {mounted && createPortal(
            <DragOverlay>
                {activeId && activeItem ? (
                     <div className="opacity-80 rotate-2 cursor-grabbing pointer-events-none">
                        {'id' in activeItem ? (
                            // It's a PlacedBlock (ContentBlock has id)
                             <div className="w-64">
                                <PlacedBlock block={activeItem as ContentBlock} onRemove={() => {}} />
                             </div>
                        ) : (
                            // It's a Palette Item
                            <div className="px-4 py-2 bg-blue-500 text-white rounded-full shadow-xl font-bold text-sm">
                                New {(activeItem as { label: string }).label}
                            </div>
                        )}
                     </div>
                ) : null}
            </DragOverlay>,
            document.body
        )}
      </div>
    </DndContext>
  );
}
