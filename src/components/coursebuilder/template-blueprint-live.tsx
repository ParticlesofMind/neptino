"use client"
// Live (data-driven) canvas components: LiveNestedSlot, BlueprintBodySlot, MarginBand.

import React from "react"
import {
  useTemplateBlueprintContext,
  buildStableTaskKey,
  buildTaskAreaKey,
  type TemplateBlueprintData,
  type TaskAreaKind,
} from "./template-blueprint-types"
import { TaskAreaDropZone } from "./template-blueprint-media"
import {
  SlotSectionLabel,
  NestedSlotView,
  TableSlotView,
  ScoringRubricView,
  TocListView,
  CertificateBodyView,
  DiscussionPromptView,
  ReflectionJournalView,
  SurveyFormView,
} from "./template-blueprint-slot-views"
import { slotToBlockId, type BodySlot } from "@/lib/curriculum/template-json-blueprints"
import type { BlockId } from "@/components/coursebuilder/sections/templates-section"

export function LiveNestedSlot({
  label,
  block,
  topicGroups,
  areaFilter,
  isContinuation,
}: {
  label: string
  block: "content" | "assignment"
  topicGroups: NonNullable<TemplateBlueprintData["contentItems"]>["topicGroups"]
  areaFilter: TaskAreaKind[]
  isContinuation: boolean
}) {
  const { orderedTaskAreas, droppedMediaByArea, mediaDragActive, onRemoveAreaMedia, densityAreaHeightClass } = useTemplateBlueprintContext()
  if (!topicGroups || topicGroups.length === 0) {
    return <NestedSlotView label={label} areas={areaFilter} />
  }
  const resolvedAreas = orderedTaskAreas.filter((a) => areaFilter.includes(a))
  const phaseLabels = ["Phase I", "Phase II", "Phase III"] as const
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border/60">
      {!isContinuation && (
        <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
          <SlotSectionLabel>{label}</SlotSectionLabel>
        </div>
      )}
      <div className="min-h-0 overflow-hidden p-1.5 space-y-1.5 text-[10px] text-muted-foreground">
        {topicGroups.map((group, topicIdx) => (
          <div key={topicIdx} className="rounded border border-border/70 bg-background p-1.5">
            <p className="font-semibold">Topic {topicIdx + 1}: {group.topic}</p>
            <div className="mt-1 space-y-1 border-l-2 border-border/60 pl-1.5">
              {group.objectives.map((objective, objIdx) => (
                <div key={objIdx} className="rounded border border-border/60 bg-muted/10 p-1.5">
                  <p className="font-semibold">Objective {objIdx + 1}: {objective.objective}</p>
                  <div className="mt-1 space-y-1 border-l-2 border-border/60 pl-1.5">
                    {objective.tasks.map((task, taskIdx) => {
                      const stableTaskKey = task.stableTaskKey ?? buildStableTaskKey({
                        block,
                        topic: group.topic,
                        objective: objective.objective,
                        task: task.task,
                      })
                      return (
                        <div key={taskIdx} className="rounded border border-border/60 bg-background p-1.5">
                          <p className="font-semibold">Task {taskIdx + 1}: {task.task}</p>
                          <div className="mt-1 flex flex-col gap-1">
                            {resolvedAreas.map((areaKind, areaIndex) => {
                              const areaKey = buildTaskAreaKey(block, stableTaskKey, areaKind)
                              const phaseLabel = phaseLabels[Math.min(areaIndex, phaseLabels.length - 1)]
                              return (
                                <div key={`${areaKey}:wrap`} className="space-y-0.5">
                                  <p className="text-[8px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-0.5">
                                    {phaseLabel}
                                  </p>
                                  <TaskAreaDropZone
                                    key={`${areaKey}:zone`}
                                    seedText={phaseLabel}
                                    areaKey={areaKey}
                                    droppedMedia={droppedMediaByArea?.[areaKey] ?? []}
                                    mediaDragActive={mediaDragActive}
                                    areaHeightClass={densityAreaHeightClass}
                                    onRemoveMedia={onRemoveAreaMedia}
                                  />
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function BlueprintBodySlot({
  slot,
  isContinuation = false,
}: {
  slot: BodySlot
  isContinuation?: boolean
}) {
  const { enabled, data } = useTemplateBlueprintContext()

  const blockId = slotToBlockId(slot.kind) as BlockId | null
  if (blockId && !enabled[blockId]) return null


  switch (slot.kind) {
    case "program_table": {
      if (data?.programRows && data.programRows.length > 0) {
        const cols = slot.columns
        return (
          <div className="overflow-hidden rounded-lg border border-border/60">
            {!isContinuation && (
              <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
                <SlotSectionLabel>Program</SlotSectionLabel>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-[10px] text-muted-foreground">
                <thead>
                  <tr>
                    {cols.map((col) => (
                      <th key={col.key} className="border-b border-r border-border/50 bg-muted/20 px-1.5 py-0.5 text-left font-semibold text-muted-foreground last:border-r-0">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.programRows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {cols.map((col) => {
                        const rawValue = row[col.key] || "—"
                        const segmentedLines = (col.key === "objective" || col.key === "task")
                          ? String(rawValue).split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
                          : []
                        if (segmentedLines.length > 0) {
                          return (
                            <td key={col.key} className="border-b border-r border-border/40 bg-background p-0 align-top last:border-r-0">
                              <div className="flex flex-col">
                                {segmentedLines.map((line, lineIdx) => (
                                  <div key={lineIdx} className={`px-1.5 py-1 ${lineIdx > 0 ? "border-t border-border/40" : ""}`}>{line}</div>
                                ))}
                              </div>
                            </td>
                          )
                        }
                        return (
                          <td key={col.key} className="whitespace-pre-wrap border-b border-r border-border/40 bg-background px-1.5 py-1 align-top last:border-r-0">
                            {rawValue}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
      return <TableSlotView label="Program" columns={slot.columns} />
    }

    case "resources_table": {
      if (data?.resourceRows && data.resourceRows.length > 0) {
        const cols = slot.columns
        return (
          <div className="overflow-hidden rounded-lg border border-border/60">
            {!isContinuation && (
              <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
                <SlotSectionLabel>Resources</SlotSectionLabel>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-[10px] text-muted-foreground">
                <thead>
                  <tr>
                    {cols.map((col) => (
                      <th key={col.key} className="border-b border-r border-border/50 bg-muted/20 px-1.5 py-0.5 text-left font-semibold text-muted-foreground last:border-r-0">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.resourceRows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {cols.map((col) => (
                        <td key={col.key} className="whitespace-pre-wrap border-b border-r border-border/40 bg-background px-1.5 py-1 align-top last:border-r-0">
                          {row[col.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
      return <TableSlotView label="Resources" columns={slot.columns} />
    }

    case "content_nested":
      return (
        <LiveNestedSlot
          label="Content"
          block="content"
          topicGroups={data?.contentItems?.topicGroups}
          areaFilter={slot.areas}
          isContinuation={isContinuation}
        />
      )

    case "assignment_nested":
      return (
        <LiveNestedSlot
          label="Assignment"
          block="assignment"
          topicGroups={data?.assignmentItems?.topicGroups}
          areaFilter={slot.areas}
          isContinuation={isContinuation}
        />
      )

    case "scoring_rubric": {
      if (data?.scoringItems && data.scoringItems.length > 0) {
        return (
          <div className="overflow-hidden rounded-lg border border-border/60">
            {!isContinuation && (
              <div className="border-b border-border/50 bg-muted/15 px-1.5 py-0.5">
                <SlotSectionLabel>Scoring</SlotSectionLabel>
              </div>
            )}
            <div className="p-1.5 space-y-1 text-[10px] text-muted-foreground">
              {data.scoringItems.map((criterion, idx) => (
                <p key={idx} className="rounded border border-border/70 bg-background px-1.5 py-0.5">{criterion}</p>
              ))}
            </div>
          </div>
        )
      }
      return <ScoringRubricView columns={slot.columns} />
    }

    case "toc_list":
      return <TocListView />
    case "certificate_body":
      return <CertificateBodyView />
    case "discussion_prompt":
      return <DiscussionPromptView />
    case "reflection_journal":
      return <ReflectionJournalView />
    case "survey_form":
      return <SurveyFormView />
    default:
      return null
  }
}

export function MarginBand({
  side,
  left,
  right,
  fieldValues,
}: {
  side: "top" | "bottom"
  left: Array<{ key: string; label: string }>
  right: Array<{ key: string; label: string }>
  fieldValues?: Record<string, string>
}) {
  return (
    <div
      className={`flex items-center justify-between gap-2 bg-muted/[0.13] px-2 py-1 ${
        side === "top" ? "border-b" : "border-t"
      } border-border/40`}
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1">
        {left.map((field, idx) => (
          <React.Fragment key={field.key}>
            {idx > 0 && <span className="text-[8px] text-muted-foreground/30">·</span>}
            <span className="rounded border border-border/40 bg-background/70 px-1.5 py-0.5 text-[8px] text-muted-foreground/65">
              {fieldValues?.[field.key] ?? field.label}
            </span>
          </React.Fragment>
        ))}
      </div>
      <div className="flex flex-shrink-0 flex-wrap items-center justify-end gap-1">
        {right.map((field) => (
          <span
            key={field.key}
            className={`rounded border px-1.5 py-0.5 text-[8px] ${
              field.key === "page_number"
                ? "border-border/45 bg-background font-semibold text-foreground/55"
                : "border-border/40 bg-background/70 text-muted-foreground/65"
            }`}
          >
            {fieldValues?.[field.key] ?? (field.key === "page_number" ? "1" : field.label)}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Unified JSON-driven template preview.
 *
 * Reads TEMPLATE_BLUEPRINTS for the given type and renders the canonical
 * tri-region layout:
 *   Header margin  /  Body content blocks  /  Footer margin
 *
 * The same visual logic is used in the configurator preview and when a
 * template is baked into the canvas, ensuring identical appearance everywhere.
 *
 * Set `omitMargins` to skip the header/footer band rendering — used in canvas
 * mode where TemplateSurface renders the margin bands itself.
 */
