"use client"

import React from "react"
import { TEMPLATE_TYPE_META, type TemplateType, ALL_BLOCKS, BLOCK_FIELDS, type BlockId, type TemplateFieldState } from "@/components/coursebuilder/sections/templates-section"

interface TemplateBlueprintProps {
  type: TemplateType
  enabled: Record<BlockId, boolean>
  fieldEnabled: TemplateFieldState
  name?: string
  scale?: "sm" | "md" | "lg"
  scrollable?: boolean
  data?: TemplateBlueprintData
}

export interface TemplateBlueprintData {
  fieldValues?: Partial<Record<BlockId, Record<string, string>>>
  programRows?: Array<Record<string, string>>
  resourceRows?: Array<Record<string, string>>
  contentItems?: {
    topics?: string[]
    objectives?: string[]
    tasks?: string[]
  }
  assignmentItems?: {
    tasks?: string[]
  }
  resourceItems?: string[]
  scoringItems?: string[]
}

const SCALE_CONFIG = {
  sm: {
    containerPadding: "p-2",
    headerPadding: "px-3 py-2",
    headerFontSize: "text-xs",
    blockPadding: "p-2",
    blockTitleSize: "text-[9px]",
    fieldSize: "text-[8px]",
    blockGap: "gap-1",
    headerFieldGap: "gap-1",
    headerFieldPadding: "px-1 py-0.5",
  },
  md: {
    containerPadding: "p-3",
    headerPadding: "px-4 py-3",
    headerFontSize: "text-sm",
    blockPadding: "p-3",
    blockTitleSize: "text-[10px]",
    fieldSize: "text-xs",
    blockGap: "gap-2",
    headerFieldGap: "gap-1.5",
    headerFieldPadding: "px-1.5 py-0.5",
  },
  lg: {
    containerPadding: "p-4",
    headerPadding: "px-5 py-4",
    headerFontSize: "text-base",
    blockPadding: "p-4",
    blockTitleSize: "text-[11px]",
    fieldSize: "text-sm",
    blockGap: "gap-3",
    headerFieldGap: "gap-2",
    headerFieldPadding: "px-2 py-1",
  },
}

function TemplateHeaderBlueprint({
  type,
  fieldEnabled,
  scale = "md",
  fieldValues,
}: {
  type: TemplateType
  fieldEnabled: TemplateFieldState
  scale?: "sm" | "md" | "lg"
  fieldValues?: Record<string, string>
}) {
  const config = SCALE_CONFIG[scale]
  const headerFields = BLOCK_FIELDS.header
    .filter((f) => f.forTypes.includes(type))
    .filter((f) => f.required || Boolean(fieldEnabled.header?.[f.key]))

  return (
    <div className={`flex items-center overflow-x-auto ${config.headerFieldGap}`}>
      {headerFields.map((field, idx) => (
        <div key={field.key} className="flex items-center gap-1 flex-shrink-0">
          {idx > 0 && <span className="text-muted-foreground/40 text-xs">·</span>}
          <span
            className={`rounded border border-border/60 bg-muted/30 ${config.headerFieldPadding} text-foreground text-xs`}
          >
            {fieldValues?.[field.key] ? `${field.label}: ${fieldValues[field.key]}` : field.label}
          </span>
        </div>
      ))}
    </div>
  )
}

function TemplateBlockBlueprint({
  blockId,
  type,
  fieldEnabled,
  scale = "md",
  fieldValues,
}: {
  blockId: BlockId
  type: TemplateType
  fieldEnabled: TemplateFieldState
  scale?: "sm" | "md" | "lg"
  fieldValues?: Record<string, string>
}) {
  const config = SCALE_CONFIG[scale]
  const block = ALL_BLOCKS.find((b) => b.id === blockId)

  if (!block) return null

  const fields = BLOCK_FIELDS[blockId]
    .filter((f) => f.forTypes.includes(type))
    .filter((f) => f.required || Boolean(fieldEnabled[blockId]?.[f.key]))

  if (fields.length === 0) return null

  return (
    <div className={`rounded-lg border border-border bg-muted/10 ${config.blockPadding}`}>
      <div className={`mb-2 ${config.blockTitleSize} font-semibold uppercase tracking-wide text-muted-foreground`}>
        {block.label}
      </div>
      <div className={`flex flex-wrap ${config.blockGap}`}>
        {fields.map((field) => (
          <span
            key={field.key}
            className={`rounded border border-border/50 bg-background ${config.headerFieldPadding} ${config.fieldSize} text-foreground/80`}
          >
            {fieldValues?.[field.key] ? `${field.label}: ${fieldValues[field.key]}` : field.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function PlaceholderLine({ widthClass = "w-full" }: { widthClass?: string }) {
  return <div className={`h-2.5 rounded bg-muted/60 ${widthClass}`} />
}

function DocumentSection({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={`rounded-xl border border-border bg-card ${className ?? ""}`}>
      <div className="border-b border-border bg-muted/30 px-2 py-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      </div>
      <div className="p-1.5">{children}</div>
    </section>
  )
}

function NestedContent({
  topic = true,
  objective = true,
  task = true,
  instructionArea = true,
  studentArea = true,
  teacherArea = true,
  includeProject,
}: {
  topic?: boolean
  objective?: boolean
  task?: boolean
  instructionArea?: boolean
  studentArea?: boolean
  teacherArea?: boolean
  includeProject?: boolean
}) {
  const renderHierarchy = () => (
    <div className="space-y-1.5">
      {topic && (
        <div className="rounded-lg border border-border/70 bg-background p-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Topic</p>
          <div className="mt-1 space-y-1.5 border-l-2 border-border/70 pl-1.5">
            <PlaceholderLine widthClass="w-10/12" />
            {objective && (
              <div className="rounded-md border border-border/60 bg-muted/10 p-1.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Objective</p>
                <div className="mt-1 space-y-1.5 border-l-2 border-border/60 pl-1.5">
                  <PlaceholderLine widthClass="w-9/12" />
                  {task && (
                    <div className="rounded-md border border-border/60 bg-background p-1.5">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Task</p>
                      <div className="mt-1 space-y-1.5 border-l-2 border-border/60 pl-1.5">
                        {instructionArea && (
                          <div className="rounded-md border border-border/50 bg-muted/10 p-1.5">
                            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Instruction Area</p>
                            <PlaceholderLine widthClass="w-11/12" />
                          </div>
                        )}
                        {studentArea && (
                          <div className="rounded-md border border-border/50 bg-muted/10 p-1.5">
                            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Student Area</p>
                            <PlaceholderLine widthClass="w-10/12" />
                          </div>
                        )}
                        {teacherArea && (
                          <div className="rounded-md border border-border/50 bg-muted/10 p-1.5">
                            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Teacher Area</p>
                            <PlaceholderLine widthClass="w-8/12" />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  if (!topic && !objective && !task && !instructionArea && !studentArea && !teacherArea && !includeProject) {
    return null
  }

  return (
    <div className="space-y-1.5">
      {renderHierarchy()}
      {includeProject && (
        <div className="rounded-lg border border-border bg-muted/10 p-1.5">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Project</p>
          {renderHierarchy()}
        </div>
      )}
    </div>
  )
}

function LessonTemplatePreview({
  enabled,
  fieldEnabled,
  scrollable = true,
  data,
}: {
  enabled: Record<BlockId, boolean>
  fieldEnabled: TemplateFieldState
  scrollable?: boolean
  data?: TemplateBlueprintData
}) {
  const headerFields = BLOCK_FIELDS.header.filter((field) => field.required || Boolean(fieldEnabled.header?.[field.key]))
  const programFields = BLOCK_FIELDS.program
    .filter((field) => field.forTypes.includes("lesson"))
    .filter((field) => field.required || Boolean(fieldEnabled.program?.[field.key]))
  const resourceFields = BLOCK_FIELDS.resources
    .filter((field) => field.forTypes.includes("lesson"))
    .filter((field) => field.required || Boolean(fieldEnabled.resources?.[field.key]))
  const fieldValues = data?.fieldValues

  return (
    <div className={`h-full ${scrollable ? "overflow-auto" : "overflow-hidden"} rounded-xl border border-border bg-background p-1.5 md:p-2`}>
      <div className="mx-auto w-full max-w-4xl space-y-2">
            {enabled.header && (
              <DocumentSection title="Header" className="">
                <div className="flex flex-wrap items-start gap-1">
                  {headerFields.map((field) => (
                    <span key={field.key} className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                      {fieldValues?.header?.[field.key] ? `${field.label}: ${fieldValues.header[field.key]}` : field.label}
                    </span>
                  ))}
                </div>
              </DocumentSection>
            )}

            {enabled.program && (
              <DocumentSection title="Program" className="">
                {Array.isArray(data?.programRows) && data.programRows.length > 0 ? (
                  <div className="space-y-1">
                    {data.programRows.slice(0, 6).map((row, rowIdx) => (
                      <div key={`program-row-${rowIdx}`} className="grid gap-1 rounded border border-border/70 bg-background p-1.5 text-[10px] text-muted-foreground md:grid-cols-4">
                        {programFields.map((field) => (
                          <span key={`${field.key}-${rowIdx}`} className="truncate">
                            <span className="font-semibold">{field.label}:</span> {row[field.key] || "—"}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start gap-1">
                    {programFields.map((field) => (
                      <span key={field.key} className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {fieldValues?.program?.[field.key] ? `${field.label}: ${fieldValues.program[field.key]}` : field.label}
                      </span>
                    ))}
                  </div>
                )}
              </DocumentSection>
            )}

            {enabled.resources && (
              <DocumentSection title="Resources" className="">
                {Array.isArray(data?.resourceRows) && data.resourceRows.length > 0 ? (
                  <div className="space-y-1">
                    {data.resourceRows.slice(0, 6).map((row, rowIdx) => (
                      <div key={`resource-row-${rowIdx}`} className="grid gap-1 rounded border border-border/70 bg-background p-1.5 text-[10px] text-muted-foreground md:grid-cols-5">
                        {resourceFields.map((field) => (
                          <span key={`${field.key}-${rowIdx}`} className="truncate">
                            <span className="font-semibold">{field.label}:</span> {row[field.key] || "—"}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                ) : Array.isArray(data?.resourceItems) && data.resourceItems.length > 0 ? (
                  <div className="space-y-1">
                    {data.resourceItems.slice(0, 6).map((item, idx) => (
                      <p key={`resource-item-${idx}`} className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {item}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-start gap-1">
                    {resourceFields.map((field) => (
                      <span key={field.key} className="rounded border border-border/70 bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        {fieldValues?.resources?.[field.key] ? `${field.label}: ${fieldValues.resources[field.key]}` : field.label}
                      </span>
                    ))}
                  </div>
                )}
              </DocumentSection>
            )}

            {enabled.content && (
              <DocumentSection title="Content" className="" >
                {(data?.contentItems?.topics?.length || data?.contentItems?.objectives?.length || data?.contentItems?.tasks?.length) ? (
                  <div className="space-y-1.5 text-[10px] text-muted-foreground">
                    {data.contentItems?.topics?.length ? <p><span className="font-semibold">Topics:</span> {data.contentItems.topics.join(" · ")}</p> : null}
                    {data.contentItems?.objectives?.length ? <p><span className="font-semibold">Objectives:</span> {data.contentItems.objectives.join(" · ")}</p> : null}
                    {data.contentItems?.tasks?.length ? <p><span className="font-semibold">Tasks:</span> {data.contentItems.tasks.join(" · ")}</p> : null}
                  </div>
                ) : (
                  <NestedContent
                    topic={fieldEnabled.content?.topic}
                    objective={fieldEnabled.content?.objective}
                    task={fieldEnabled.content?.task}
                    instructionArea={fieldEnabled.content?.instruction_area}
                    studentArea={fieldEnabled.content?.student_area}
                    teacherArea={fieldEnabled.content?.teacher_area}
                    includeProject={fieldEnabled.content?.include_project}
                  />
                )}
              </DocumentSection>
            )}

            {enabled.assignment && (
              <DocumentSection title="Assignment" className="" >
                {Array.isArray(data?.assignmentItems?.tasks) && data.assignmentItems.tasks.length > 0 ? (
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    {data.assignmentItems.tasks.slice(0, 6).map((task, idx) => (
                      <p key={`assignment-item-${idx}`} className="rounded border border-border/70 bg-background px-1.5 py-0.5">{task}</p>
                    ))}
                  </div>
                ) : (
                  <NestedContent
                    topic={fieldEnabled.assignment?.topic}
                    objective={fieldEnabled.assignment?.objective}
                    task={fieldEnabled.assignment?.task}
                    instructionArea={fieldEnabled.assignment?.instruction_area}
                    studentArea={fieldEnabled.assignment?.student_area}
                    teacherArea={fieldEnabled.assignment?.teacher_area}
                    includeProject={fieldEnabled.assignment?.include_project}
                  />
                )}
              </DocumentSection>
            )}

            {enabled.scoring && (
              <DocumentSection title="Scoring" className="" >
                {Array.isArray(data?.scoringItems) && data.scoringItems.length > 0 ? (
                  <div className="space-y-1 text-[10px] text-muted-foreground">
                    {data.scoringItems.slice(0, 6).map((criterion, idx) => (
                      <p key={`scoring-item-${idx}`} className="rounded border border-border/70 bg-background px-1.5 py-0.5">{criterion}</p>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground">Scoring criteria appear here.</div>
                )}
              </DocumentSection>
            )}

            {enabled.footer && (
              <DocumentSection title="Footer" className="" >
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <div className="flex min-w-[180px] flex-wrap items-center gap-1">
                    {fieldEnabled.footer?.copyright && <span className="rounded border border-border bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground">Copyright</span>}
                    {fieldEnabled.footer?.institution_name && <span className="rounded border border-border bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground">Institution</span>}
                    {fieldEnabled.footer?.teacher_name && <span className="rounded border border-border bg-muted/20 px-1.5 py-0.5 text-[10px] text-muted-foreground">Teacher</span>}
                  </div>
                  {fieldEnabled.footer?.page_number && (
                    <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-semibold text-foreground">Page 1</span>
                  )}
                </div>
              </DocumentSection>
            )}
      </div>
    </div>
  )
}

export function TemplateBlueprint({
  type,
  enabled,
  fieldEnabled,
  name,
  scale = "md",
  scrollable = true,
  data,
}: TemplateBlueprintProps) {
  const config = SCALE_CONFIG[scale]
  const meta = TEMPLATE_TYPE_META[type]

  // Use lesson-specific styled preview for lesson type
  if (type === "lesson") {
    return (
      <div className={`h-full w-full ${scrollable ? "overflow-auto" : "overflow-hidden"} rounded-xl bg-background`}>
        <LessonTemplatePreview enabled={enabled} fieldEnabled={fieldEnabled} scrollable={scrollable} data={data} />
      </div>
    )
  }

  // Fallback blueprint for other template types
  const visibleBlocks = ALL_BLOCKS.filter(
    (b) => b.forTypes.includes(type) && (enabled[b.id] || b.mandatory),
  )

  return (
    <div className={`w-full rounded-xl bg-background overflow-hidden flex flex-col`}>
      {/* Header */}
      <div className={`flex items-center justify-between border-b border-border bg-muted/40 ${config.headerPadding}`}>
        <div className="min-w-0">
          <p className={`truncate font-semibold text-foreground ${config.headerFontSize}`}>
            {name || "Untitled template"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 text-muted-foreground">{meta.icon}</span>
          <span className={`rounded border ${meta.badge} px-2 py-1 text-xs font-semibold`}>
            {meta.label}
          </span>
        </div>
      </div>

      {/* Blueprint Content */}
      <div className={`flex-1 ${scrollable ? "overflow-y-auto" : "overflow-hidden"} ${config.containerPadding}`}>
        <div className={`space-y-${scale === "sm" ? "1" : scale === "md" ? "2" : "3"}`}>
          {/* Header Row - Always First */}
          {enabled.header && (
            <TemplateHeaderBlueprint type={type} fieldEnabled={fieldEnabled} scale={scale} fieldValues={data?.fieldValues?.header} />
          )}

          {/* Other Blocks */}
          {visibleBlocks
            .filter((b) => b.id !== "header" && b.id !== "footer")
            .map((block) => (
              <TemplateBlockBlueprint
                key={block.id}
                blockId={block.id}
                type={type}
                fieldEnabled={fieldEnabled}
                scale={scale}
                fieldValues={data?.fieldValues?.[block.id]}
              />
            ))}

          {/* Footer - Always Last */}
          {enabled.footer && (
            <TemplateBlockBlueprint
              blockId="footer"
              type={type}
              fieldEnabled={fieldEnabled}
              scale={scale}
              fieldValues={data?.fieldValues?.footer}
            />
          )}
        </div>
      </div>
    </div>
  )
}
