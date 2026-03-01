"use client"

import { DndContext, closestCenter } from "@dnd-kit/core"
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import {
  PRIMARY_ACTION_BUTTON_CLASS,
  SECONDARY_ACTION_BUTTON_CLASS,
  SetupColumn, SetupSection,
} from "@/components/coursebuilder/layout-primitives"
import { TemplateBlueprint } from "@/components/coursebuilder/template-blueprint"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import type { TemplateVisualDensity } from "@/lib/curriculum/template-source-of-truth"
import { TEMPLATE_TYPES, type BlockId, type TemplateFieldState } from "./template-section-data"
import { SortableBlockCard } from "./sortable-block-card"
import { TemplateTypeOverlay } from "./template-type-overlay"
import { TemplateLoadOverlay } from "./template-load-overlay"
import { useTemplatesSection } from "./use-templates-section"

// Re-exports so importers of templates-section keep working unchanged
export type { TemplateType }
export { TEMPLATE_TYPES }
export type { BlockId, TemplateFieldState }
export { TEMPLATE_TYPE_META, BLOCK_META } from "./template-section-meta"

// ─── Preview helper ───────────────────────────────────────────────────────────

function TemplatePreview({
  type, enabled, fieldEnabled, blockOrder, name, visualDensity, isEmpty,
}: {
  type: TemplateType; enabled: Record<BlockId, boolean>; fieldEnabled: TemplateFieldState
  blockOrder: BlockId[]; name: string; description: string; visualDensity: TemplateVisualDensity; isEmpty: boolean
}) {
  if (isEmpty) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-border bg-muted/10 px-6 py-8">
        <p className="text-center text-sm italic text-muted-foreground">
          Create a new template or load an existing one to see the preview here.
        </p>
      </div>
    )
  }
  return (
    <TemplateBlueprint type={type} enabled={enabled} fieldEnabled={fieldEnabled} blockOrder={blockOrder} name={name || "Untitled template"} scale="md" density={visualDensity} />
  )
}

// ─── Section component ────────────────────────────────────────────────────────

export function TemplatesSection({ courseId }: { courseId: string | null }) {
  const {
    panelView, setPanelView, visualDensity, setVisualDensity,
    showTypeOverlay, showLoadOverlay,
    pendingTypeSelection, setPendingTypeSelection,
    pendingLoadId, setPendingLoadId,
    confirmDelete, setConfirmDelete,
    configType, configName, setConfigName, configDesc, setConfigDesc,
    configEnabled, configFieldEnabled,
    sensors, isCreating, isConfiguring,
    beginCreate, beginLoad,
    createFromOverlay, saveFromOverlay,
    formatTemplateDate, toggleBlock, toggleField, loadTemplate,
    deletePendingTemplate, handleBlockDragEnd,
    previewType, previewEnabled, previewFieldEnabled,
    previewName, previewDescription, previewBlockOrder, templates,
    orderedBlocks,
  } = useTemplatesSection(courseId)

  return (
    <SetupSection
      title="Templates"
      description="Design reusable page templates for your course lessons, quizzes, assessments, and more."
      headerActions={(
        <>
          <button type="button" onClick={beginCreate} className={PRIMARY_ACTION_BUTTON_CLASS}>Create Template</button>
          <button type="button" onClick={beginLoad} disabled={templates.length === 0} className={SECONDARY_ACTION_BUTTON_CLASS}>Load Template</button>
        </>
      )}
    >
      {/* Mobile panel toggle */}
      <div className="mb-4 flex items-center gap-2 lg:hidden">
        {(["config", "preview"] as const).map(view => (
          <button
            key={view}
            type="button"
            onClick={() => setPanelView(view)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition capitalize ${
              panelView === view
                ? "border-primary bg-accent text-primary"
                : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
            }`}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Main two-column layout */}
      <div className="grid flex-1 min-h-0 items-stretch gap-4 lg:grid-cols-2">
        <div className={`${panelView === "preview" ? "hidden lg:block" : "block lg:block"} min-h-0`}>
          <SetupColumn className="flex h-full min-h-0 flex-col gap-4 !p-0 !border-0">
            <div className="relative min-h-0 flex-1">
              <div className="space-y-5">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleBlockDragEnd}>
                  <SortableContext items={orderedBlocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                    {orderedBlocks.map(block => (
                      <SortableBlockCard
                        key={block.id}
                        block={block}
                        configType={configType}
                        configEnabled={configEnabled}
                        configFieldEnabled={configFieldEnabled}
                        onToggleBlock={toggleBlock}
                        onToggleField={toggleField}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </div>
            </div>
          </SetupColumn>
        </div>

        <div className={`${panelView === "config" ? "hidden lg:block" : "block lg:block"} min-h-0`}>
          <SetupColumn className="h-full min-h-0 !p-0">
            <TemplatePreview
              type={previewType} enabled={previewEnabled} fieldEnabled={previewFieldEnabled}
              blockOrder={previewBlockOrder} name={previewName} description={previewDescription}
              visualDensity={visualDensity} isEmpty={false}
            />
          </SetupColumn>
        </div>
      </div>

      {/* Overlays */}
      {isConfiguring && showTypeOverlay && (
        <TemplateTypeOverlay
          isCreating={isCreating}
          pendingTypeSelection={pendingTypeSelection}
          setPendingTypeSelection={setPendingTypeSelection}
          configName={configName} setConfigName={setConfigName}
          configDesc={configDesc} setConfigDesc={setConfigDesc}
          onCancel={() => { setPendingTypeSelection(null) }}
          onConfirm={() => { if (isCreating) { createFromOverlay() } else { void saveFromOverlay() } }}
        />
      )}
      {showLoadOverlay && (
        <TemplateLoadOverlay
          templates={templates}
          pendingLoadId={pendingLoadId} setPendingLoadId={setPendingLoadId}
          confirmDelete={confirmDelete} setConfirmDelete={setConfirmDelete}
          onDelete={() => { void deletePendingTemplate() }}
          onCancel={() => { setPendingLoadId(null) }}
          onLoad={() => { if (!pendingLoadId) return; const tpl = templates.find(t => t.id === pendingLoadId); if (tpl) loadTemplate(tpl) }}
          onEditTemplate={tpl => { loadTemplate(tpl); setPendingTypeSelection(tpl.type) }}
          formatTemplateDate={formatTemplateDate}
        />
      )}
    </SetupSection>
  )
}

