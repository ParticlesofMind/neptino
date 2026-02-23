"use client"

import React from "react"
import { TEMPLATE_TYPE_META, type TemplateType, ALL_BLOCKS, BLOCK_FIELDS, type BlockId, type TemplateFieldState } from "@/components/coursebuilder/sections/templates-section"

interface TemplateBlueprintProps {
  type: TemplateType
  enabled: Record<BlockId, boolean>
  fieldEnabled: TemplateFieldState
  name?: string
  scale?: "sm" | "md" | "lg"
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
}: {
  type: TemplateType
  fieldEnabled: TemplateFieldState
  scale?: "sm" | "md" | "lg"
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
            {field.label}
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
}: {
  blockId: BlockId
  type: TemplateType
  fieldEnabled: TemplateFieldState
  scale?: "sm" | "md" | "lg"
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
            {field.label}
          </span>
        ))}
      </div>
    </div>
  )
}

// ─── Nested content with proper visual hierarchy ───────────────────────────
function NestedContent({ 
  topic = true,
  objective = true,
  task = true,
  instructionArea = true,
  studentArea = true,
  teacherArea = true,
  includeProject
}: {
  topic?: boolean
  objective?: boolean
  task?: boolean
  instructionArea?: boolean
  studentArea?: boolean
  teacherArea?: boolean
  includeProject?: boolean
}) {
  // Don't render anything if no fields are enabled
  if (!topic && !objective && !task && !instructionArea && !studentArea && !teacherArea && !includeProject) {
    return null
  }

  return (
    <div style={{
      background: "#fafaf8",
      border: "1px solid #d0d0d0",
      borderRadius: 6,
      padding: 10,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      {topic && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
            Topic
          </div>
          <div style={{
            padding: "8px 12px",
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            borderRadius: 4,
            minHeight: 24,
          }}>
            {/* Nested under Topic */}
            {objective && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                  Objective
                </div>
                <div style={{
                  padding: "8px 12px",
                  background: "#ffffff",
                  border: "1px solid #e0e0e0",
                  borderRadius: 4,
                  minHeight: 24,
                }}>
                  {/* Nested under Objective */}
                  {task && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                        Task
                      </div>
                      <div style={{
                        padding: "8px 12px",
                        background: "#ffffff",
                        border: "1px solid #e0e0e0",
                        borderRadius: 4,
                        minHeight: 24,
                      }}>
                        {/* Nested under Task - the three areas stacked vertically */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                          {instructionArea && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                                Instruction Area
                              </div>
                              <div style={{
                                padding: "8px 12px",
                                background: "#ffffff",
                                border: "1px solid #e0e0e0",
                                borderRadius: 4,
                                minHeight: 24,
                              }} />
                            </div>
                          )}
                          {studentArea && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                                Student Area
                              </div>
                              <div style={{
                                padding: "8px 12px",
                                background: "#ffffff",
                                border: "1px solid #e0e0e0",
                                borderRadius: 4,
                                minHeight: 24,
                              }} />
                            </div>
                          )}
                          {teacherArea && (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                                Teacher Area
                              </div>
                              <div style={{
                                padding: "8px 12px",
                                background: "#ffffff",
                                border: "1px solid #e0e0e0",
                                borderRadius: 4,
                                minHeight: 24,
                              }} />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {includeProject && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666", marginTop: 8 }}>
            Project
          </div>
          <div style={{
            padding: "8px 12px",
            background: "#ffffff",
            border: "1px solid #e0e0e0",
            borderRadius: 4,
            minHeight: 24,
          }}>
            {/* Project contains the same hierarchy: Topic > Objective > Task > Areas */}
            {topic && (
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                  Topic
                </div>
                <div style={{
                  padding: "8px 12px",
                  background: "#ffffff",
                  border: "1px solid #e0e0e0",
                  borderRadius: 4,
                  minHeight: 24,
                }}>
                  {objective && (
                    <div style={{ marginTop: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                        Objective
                      </div>
                      <div style={{
                        padding: "8px 12px",
                        background: "#ffffff",
                        border: "1px solid #e0e0e0",
                        borderRadius: 4,
                        minHeight: 24,
                      }}>
                        {task && (
                          <div style={{ marginTop: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                              Task
                            </div>
                            <div style={{
                              padding: "8px 12px",
                              background: "#ffffff",
                              border: "1px solid #e0e0e0",
                              borderRadius: 4,
                              minHeight: 24,
                            }}>
                              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                                {instructionArea && (
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                                      Instruction Area
                                    </div>
                                    <div style={{
                                      padding: "8px 12px",
                                      background: "#ffffff",
                                      border: "1px solid #e0e0e0",
                                      borderRadius: 4,
                                      minHeight: 24,
                                    }} />
                                  </div>
                                )}
                                {studentArea && (
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                                      Student Area
                                    </div>
                                    <div style={{
                                      padding: "8px 12px",
                                      background: "#ffffff",
                                      border: "1px solid #e0e0e0",
                                      borderRadius: 4,
                                      minHeight: 24,
                                    }} />
                                  </div>
                                )}
                                {teacherArea && (
                                  <div>
                                    <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 4, color: "#666" }}>
                                      Teacher Area
                                    </div>
                                    <div style={{
                                      padding: "8px 12px",
                                      background: "#ffffff",
                                      border: "1px solid #e0e0e0",
                                      borderRadius: 4,
                                      minHeight: 24,
                                    }} />
                                  </div>
                                )}
                              </div>
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
        </div>
      )}
    </div>
  )
}

function LessonTemplatePreview({
  enabled,
  fieldEnabled,
}: {
  enabled: Record<BlockId, boolean>
  fieldEnabled: TemplateFieldState
}) {

  return (
    <div style={{
      minHeight: "100vh",
      background: "#f8f7f4",
      fontFamily: "'Lora', Georgia, serif",
      padding: "0 0 40px",
    }}>
      <div style={{
        maxWidth: 900,
        margin: "0 auto",
        padding: "24px",
      }}>
        {/* Header Block */}
        {enabled.header && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #d4cfc7",
            borderRadius: 10,
            marginBottom: 12,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{ padding: "12px 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {fieldEnabled.header?.lesson_number && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Lesson No.</th>}
                    {fieldEnabled.header?.lesson_title && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Lesson Title</th>}
                    {fieldEnabled.header?.module_title && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Module</th>}
                    {fieldEnabled.header?.course_title && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Course</th>}
                    {fieldEnabled.header?.institution_name && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Institution</th>}
                    {fieldEnabled.header?.teacher_name && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Teacher</th>}
                    {fieldEnabled.header?.date && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Date</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {fieldEnabled.header?.lesson_number && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.header?.lesson_title && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.header?.module_title && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.header?.course_title && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.header?.institution_name && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.header?.teacher_name && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.header?.date && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Program Block */}
        {enabled.program && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #d4cfc7",
            borderRadius: 10,
            marginBottom: 12,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              background: "#f0ede8",
              borderBottom: "1px solid #d4cfc7",
              padding: "9px 16px",
            }}>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 13,
                fontWeight: 700,
                color: "#1a56a0",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}>Program</span>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {fieldEnabled.program?.topic && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Topic</th>}
                    {fieldEnabled.program?.objective && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Objective</th>}
                    {fieldEnabled.program?.task && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Task</th>}
                    {fieldEnabled.program?.program_time && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Time</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {fieldEnabled.program?.topic && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.program?.objective && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.program?.task && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.program?.program_time && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Resources Block */}
        {enabled.resources && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #d4cfc7",
            borderRadius: 10,
            marginBottom: 12,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              background: "#f0ede8",
              borderBottom: "1px solid #d4cfc7",
              padding: "9px 16px",
            }}>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 13,
                fontWeight: 700,
                color: "#1a56a0",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}>Resources</span>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr>
                    {fieldEnabled.resources?.task && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Task</th>}
                    {fieldEnabled.resources?.type && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Type</th>}
                    {fieldEnabled.resources?.origin && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Origin</th>}
                    {fieldEnabled.resources?.state && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>State</th>}
                    {fieldEnabled.resources?.quality && <th style={{ textAlign: "left", padding: "6px 8px", borderBottom: "1px solid #e0e0e0", fontWeight: 600, color: "#5a5a62", textTransform: "uppercase", fontSize: 10 }}>Quality</th>}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    {fieldEnabled.resources?.task && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.resources?.type && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.resources?.origin && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.resources?.state && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                    {fieldEnabled.resources?.quality && <td style={{ padding: "6px 8px", borderBottom: "1px solid #f0f0f0", color: "#999" }}>&nbsp;</td>}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Content Block - with nested structure */}
        {enabled.content && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #d4cfc7",
            borderRadius: 10,
            marginBottom: 12,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              background: "#f0ede8",
              borderBottom: "1px solid #d4cfc7",
              padding: "9px 16px",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 13,
                fontWeight: 700,
                color: "#1a56a0",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}>Content</span>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <NestedContent
                topic={fieldEnabled.content?.topic}
                objective={fieldEnabled.content?.objective}
                task={fieldEnabled.content?.task}
                instructionArea={fieldEnabled.content?.instruction_area}
                studentArea={fieldEnabled.content?.student_area}
                teacherArea={fieldEnabled.content?.teacher_area}
                includeProject={fieldEnabled.content?.include_project}
              />
            </div>
          </div>
        )}

        {/* Assignment Block - with nested structure */}
        {enabled.assignment && (
          <div style={{
            background: "#ffffff",
            border: "1px solid #d4cfc7",
            borderRadius: 10,
            marginBottom: 12,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              background: "#f0ede8",
              borderBottom: "1px solid #d4cfc7",
              padding: "9px 16px",
            }}>
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 13,
                fontWeight: 700,
                color: "#1a56a0",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
              }}>Assignment</span>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <NestedContent
                topic={fieldEnabled.assignment?.topic}
                objective={fieldEnabled.assignment?.objective}
                task={fieldEnabled.assignment?.task}
                instructionArea={fieldEnabled.assignment?.instruction_area}
                studentArea={fieldEnabled.assignment?.student_area}
                teacherArea={fieldEnabled.assignment?.teacher_area}
                includeProject={fieldEnabled.assignment?.include_project}
              />
            </div>
          </div>
        )}

        {/* Footer Block */}
        {enabled.footer && (
          <div style={{
            background: "#f0ede8",
            border: "1px solid #d4cfc7",
            borderRadius: 10,
            overflow: "hidden",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 16px",
            }}>
              {fieldEnabled.footer?.copyright && (
                <div style={{ fontFamily: "monospace", fontSize: 11, color: "#8a8a94" }}>
                  [Copyright]
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                {fieldEnabled.footer?.institution_name && (
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#5a5a62" }}>
                    [Institution Name]
                  </div>
                )}
                {fieldEnabled.footer?.teacher_name && (
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "#5a5a62" }}>
                    [Teacher Name]
                  </div>
                )}
                {fieldEnabled.footer?.page_number && (
                  <div style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    background: "#1a56a0",
                    color: "#fff",
                    borderRadius: 4,
                    padding: "2px 9px",
                    fontWeight: 700,
                  }}>
                    p. [Num]
                  </div>
                )}
              </div>
            </div>
          </div>
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
}: TemplateBlueprintProps) {
  const config = SCALE_CONFIG[scale]
  const meta = TEMPLATE_TYPE_META[type]

  // Use lesson-specific styled preview for lesson type
  if (type === "lesson") {
    return (
      <div style={{
        width: "100%",
        height: "100%",
        overflow: "auto",
        borderRadius: 12,
        background: "#f8f7f4",
      }}>
        <LessonTemplatePreview enabled={enabled} fieldEnabled={fieldEnabled} />
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
      <div className={`flex-1 overflow-y-auto ${config.containerPadding}`}>
        <div className={`space-y-${scale === "sm" ? "1" : scale === "md" ? "2" : "3"}`}>
          {/* Header Row - Always First */}
          {enabled.header && (
            <TemplateHeaderBlueprint type={type} fieldEnabled={fieldEnabled} scale={scale} />
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
              />
            ))}

          {/* Footer - Always Last */}
          {enabled.footer && (
            <TemplateBlockBlueprint
              blockId="footer"
              type={type}
              fieldEnabled={fieldEnabled}
              scale={scale}
            />
          )}
        </div>
      </div>
    </div>
  )
}
