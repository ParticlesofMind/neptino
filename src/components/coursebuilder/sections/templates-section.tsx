"use client"

import { useMemo, useState, useCallback, useEffect, useRef } from "react"
import {
  SetupSection,
  SetupPanels,
  useSteadyLoading,
  updateCourseById,
  useCourseRowLoader,
} from "@/components/coursebuilder"
import {
  BLOCK_FIELDS,
  TEMPLATE_TYPES,
  createDefaultTemplateFieldState,
  type BlockId,
  type TemplateFieldState,
} from "./template-fields"
import { getDefaultBlocksForType, type TemplateDesignConfig } from "@/lib/curriculum/template-blocks"
import {
  CUSTOM_PARTITION_PRESET_ID,
  createNextCustomPartition,
  createPartitionState,
  resolveTemplatePartitions,
} from "@/lib/curriculum/template-partitions"
import { TemplateConfigPanel } from "./template-config-panel"
import { TemplateHeaderActions } from "./template-header-actions"
import { TemplatePreviewPanel } from "./template-preview-panel"

export type { TemplateType } from "@/lib/curriculum/template-blocks"
export { TEMPLATE_TYPES } from "./template-fields"
export type { BlockId, TemplateFieldState } from "./template-fields"

interface TemplateSettingsShape {
  active_template_type?: SetupTemplateType
  active_template_id?: string
  templates?: Array<{
    id: string
    type: SetupTemplateType
    label: string
    description?: string
    blocks: BlockId[]
    fieldState?: TemplateFieldState
  }>
}

type SavedTemplateDefinition = NonNullable<TemplateSettingsShape["templates"]>[number]

interface CurriculumShape {
  session_rows?: Array<Record<string, unknown>>
}

export type SetupTemplateType = "lesson" | "certificate" | "quiz" | "assessment" | "exam"

function createTemplateDefinition(
  type: SetupTemplateType,
  label: string,
  description?: string,
  fieldState?: TemplateFieldState,
): SavedTemplateDefinition {
  return {
    id: crypto.randomUUID(),
    type,
    label,
    description,
    blocks: [...getDefaultBlocksForType(type)],
    fieldState,
  }
}

function createTemplateDesign(template: SavedTemplateDefinition): TemplateDesignConfig {
  return {
    enabledBlocks: template.blocks,
    blockSettings: template.fieldState as TemplateDesignConfig["blockSettings"],
  }
}

function applyTemplateToSessionRows(curriculum: CurriculumShape, template: SavedTemplateDefinition): CurriculumShape {
  const sessionRows = Array.isArray(curriculum.session_rows) ? curriculum.session_rows : []
  const templateDesign = createTemplateDesign(template)
  return {
    ...curriculum,
    session_rows: sessionRows.map((row) => ({
      ...row,
      template_id: template.id,
      template_type: template.type,
      template_design: templateDesign,
    })),
  }
}

function updateMatchingTemplateSessionRows(curriculum: CurriculumShape, template: SavedTemplateDefinition): CurriculumShape {
  const sessionRows = Array.isArray(curriculum.session_rows) ? curriculum.session_rows : []
  if (sessionRows.length === 0) return curriculum

  const templateDesign = createTemplateDesign(template)
  return {
    ...curriculum,
    session_rows: sessionRows.map((row) => {
      const rowTemplateId = typeof row.template_id === "string" ? row.template_id : null
      const rowTemplateType = typeof row.template_type === "string" ? row.template_type : null
      const matchesTemplate = rowTemplateId === template.id || (!rowTemplateId && rowTemplateType === template.type)
      if (!matchesTemplate) return row
      return {
        ...row,
        template_id: template.id,
        template_type: template.type,
        template_design: templateDesign,
      }
    }),
  }
}

export function TemplatesSection({ courseId }: { courseId: string | null }) {
  const [templateSettings, setTemplateSettings] = useState<TemplateSettingsShape>({})
  const [curriculum, setCurriculum] = useState<CurriculumShape>({})
  const [selectedTemplateType, setSelectedTemplateType] = useState<SetupTemplateType>("lesson")
  const [showCreatePopup, setShowCreatePopup] = useState(false)
  const [showLoadPopup, setShowLoadPopup] = useState(false)
  const [createType, setCreateType] = useState<SetupTemplateType>("lesson")
  const [createName, setCreateName] = useState("Lesson")
  const [createDescription, setCreateDescription] = useState("")
  const [selectedLoadTemplateId, setSelectedLoadTemplateId] = useState<string>("")
  const [fieldState, setFieldState] = useState<TemplateFieldState>(() => createDefaultTemplateFieldState("lesson"))
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>("")
  // When activating a saved template we set fieldState and selectedTemplateType
  // together.  The selectedTemplateType effect would normally reset fieldState to
  // defaults (to keep the config panel in sync when the user switches types via
  // the dropdown).  This flag tells the effect to skip that reset for the current
  // render cycle so the saved fieldState is preserved.
  const skipFieldStateResetRef = useRef(false)

  // Refs used for debounced fieldState auto-save —
  // using refs avoids the effect re-running when templateSettings changes
  // due to the save itself.
  const templateSettingsRef = useRef<TemplateSettingsShape>({})
  const curriculumRef = useRef<CurriculumShape>({})
  const activeTemplateIdRef = useRef<string | null>(null)
  const courseIdRef = useRef<string | null>(courseId)
  const fieldStateInteractedRef = useRef(false)
  const fieldStateSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep refs in sync with latest values
  useEffect(() => { activeTemplateIdRef.current = activeTemplateId }, [activeTemplateId])
  useEffect(() => { courseIdRef.current = courseId }, [courseId])
  useEffect(() => { curriculumRef.current = curriculum }, [curriculum])

  const { loading, hasData } = useCourseRowLoader<{ template_settings: Record<string, unknown> | null; curriculum_data: Record<string, unknown> | null }>({
    courseId,
    select: "template_settings,curriculum_data",
    onLoaded: (row) => {
      const loadedSettings = (row.template_settings as TemplateSettingsShape | null) ?? {}
      const loadedCurriculum = (row.curriculum_data as CurriculumShape | null) ?? {}
      setTemplateSettings(loadedSettings)
      setCurriculum(loadedCurriculum)
      curriculumRef.current = loadedCurriculum
      // Restore fieldState and activeTemplateId from the active (or first)
      // saved template so config panel and preview are in sync.
      if (Array.isArray(loadedSettings.templates) && loadedSettings.templates.length > 0) {
        const activeType = loadedSettings.active_template_type ?? "lesson"
        const activeTemplate =
          loadedSettings.templates.find((t) => t.id === loadedSettings.active_template_id) ??
          loadedSettings.templates.find((t) => t.type === activeType) ??
          loadedSettings.templates[0]
        if (activeTemplate) {
          skipFieldStateResetRef.current = true
          if (activeTemplate.fieldState) setFieldState(activeTemplate.fieldState)
          setActiveTemplateId(activeTemplate.id)
          setSelectedTemplateType(activeTemplate.type)
          setSelectedLoadTemplateId(activeTemplate.id)
        }
      }
      templateSettingsRef.current = loadedSettings
    },
  })
  const hydrated = !courseId || hasData
  const showHydrationPlaceholder = useSteadyLoading(Boolean(courseId && !hydrated && loading), {
    delayMs: 120,
    minVisibleMs: 220,
  })

  const savedTemplates = useMemo(
    () => (Array.isArray(templateSettings.templates) ? templateSettings.templates : []),
    [templateSettings.templates],
  )

  const selectedBlocks = getDefaultBlocksForType(selectedTemplateType)


  const handleToggleOptional = useCallback((block: BlockId, key: string, checked: boolean) => {
    const def = (BLOCK_FIELDS[block] ?? []).find((field) => field.key === key)
    if (def?.required) return
    fieldStateInteractedRef.current = true
    setFieldState((prev) => ({
      ...prev,
      [block]: {
        ...(prev[block] ?? {}),
        [key]: checked,
      },
    }))
  }, [])

  const handleApplyPartitionPreset = useCallback((block: BlockId, presetId: string) => {
    fieldStateInteractedRef.current = true
    setFieldState((prev) => {
      const current = prev[block] as Record<string, unknown> | undefined
      const currentPartitions = resolveTemplatePartitions(current, block)
      const partitionState = createPartitionState(
        block,
        presetId,
        presetId === CUSTOM_PARTITION_PRESET_ID ? currentPartitions : undefined,
      )

      return {
        ...prev,
        [block]: {
          ...(prev[block] ?? {}),
          ...partitionState,
        },
      }
    })
  }, [])

  const handleRenamePartition = useCallback((block: BlockId, partitionId: string, label: string) => {
    fieldStateInteractedRef.current = true
    setFieldState((prev) => {
      const current = prev[block] as Record<string, unknown> | undefined
      const partitions = resolveTemplatePartitions(current, block).map((partition) =>
        partition.id === partitionId ? { ...partition, label } : partition,
      )

      return {
        ...prev,
        [block]: {
          ...(prev[block] ?? {}),
          ...createPartitionState(block, CUSTOM_PARTITION_PRESET_ID, partitions),
        },
      }
    })
  }, [])

  const handleAddPartition = useCallback((block: BlockId) => {
    fieldStateInteractedRef.current = true
    setFieldState((prev) => {
      const current = prev[block] as Record<string, unknown> | undefined
      const partitions = resolveTemplatePartitions(current, block)
      const nextPartitions = [...partitions, createNextCustomPartition(partitions)]

      return {
        ...prev,
        [block]: {
          ...(prev[block] ?? {}),
          ...createPartitionState(block, CUSTOM_PARTITION_PRESET_ID, nextPartitions),
        },
      }
    })
  }, [])

  const handleRemovePartition = useCallback((block: BlockId, partitionId: string) => {
    fieldStateInteractedRef.current = true
    setFieldState((prev) => {
      const current = prev[block] as Record<string, unknown> | undefined
      const partitions = resolveTemplatePartitions(current, block).filter((partition) => partition.id !== partitionId)

      return {
        ...prev,
        [block]: {
          ...(prev[block] ?? {}),
          ...createPartitionState(block, CUSTOM_PARTITION_PRESET_ID, partitions),
        },
      }
    })
  }, [])

  const saveTemplateSettings = useCallback(async (nextSettings: TemplateSettingsShape, nextCurriculum?: CurriculumShape) => {
    if (!courseId) return
    setSaving(true)
    setMessage("")
    const { error } = await updateCourseById(courseId, {
      template_settings: nextSettings,
      ...(nextCurriculum ? { curriculum_data: nextCurriculum } : {}),
      updated_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) {
      setMessage("Failed to save template changes.")
      return
    }
    setTemplateSettings(nextSettings)
    templateSettingsRef.current = nextSettings
    if (nextCurriculum) {
      setCurriculum(nextCurriculum)
      curriculumRef.current = nextCurriculum
    }
    setMessage("Template updated.")
  }, [courseId])

  useEffect(() => {
    // Skip reset when activating a saved template — fieldState was already set
    // to the saved template's state in the event handler.
    if (skipFieldStateResetRef.current) {
      skipFieldStateResetRef.current = false
      return
    }
    const frame = window.requestAnimationFrame(() => {
      setFieldState(createDefaultTemplateFieldState(selectedTemplateType))
    })
    // Selecting a different template type resets the editing context
    fieldStateInteractedRef.current = false
    return () => window.cancelAnimationFrame(frame)
  }, [selectedTemplateType])

  // Debounced auto-save: whenever the user toggles a field checkbox and there
  // is already a saved template (activeTemplateId), push the update to
  // courses.template_settings without requiring a separate "Save" action.
  useEffect(() => {
    if (!fieldStateInteractedRef.current) return
    const aid = activeTemplateIdRef.current
    const cid = courseIdRef.current
    if (!aid || !cid) return

    if (fieldStateSaveTimerRef.current) clearTimeout(fieldStateSaveTimerRef.current)

    fieldStateSaveTimerRef.current = setTimeout(async () => {
      const currentSettings = templateSettingsRef.current
      let updatedActiveTemplate: SavedTemplateDefinition | null = null
      const updatedTemplates = (currentSettings.templates ?? []).map((t) => {
        if (t.id !== aid) return t
        updatedActiveTemplate = { ...t, fieldState }
        return updatedActiveTemplate
      })
      const nextCurriculum = updatedActiveTemplate
        ? updateMatchingTemplateSessionRows(curriculumRef.current, updatedActiveTemplate)
        : undefined
      const shouldPersistCurriculum = Boolean(
        nextCurriculum &&
        nextCurriculum !== curriculumRef.current &&
        Array.isArray(nextCurriculum.session_rows),
      )
      const nextSettings: TemplateSettingsShape = {
        ...currentSettings,
        active_template_id: aid,
        templates: updatedTemplates,
      }

      // courses.template_settings
      const { error: courseError } = await updateCourseById(cid, {
        template_settings: nextSettings,
        ...(shouldPersistCurriculum ? { curriculum_data: nextCurriculum } : {}),
        updated_at: new Date().toISOString(),
      })
      if (!courseError) {
        setTemplateSettings(nextSettings)
        templateSettingsRef.current = nextSettings
        if (shouldPersistCurriculum && nextCurriculum) {
          setCurriculum(nextCurriculum)
          curriculumRef.current = nextCurriculum
        }
      }

    }, 800)

    return () => {
      if (fieldStateSaveTimerRef.current) clearTimeout(fieldStateSaveTimerRef.current)
    }
  }, [fieldState])

  const handleCreateTemplate = useCallback(async () => {
    if (!createName.trim()) {
      setMessage("Template name is required.")
      return
    }
    if (!courseId) return
    const existingTemplates = Array.isArray(templateSettings.templates) ? templateSettings.templates : []
    const initialFieldState = createType === selectedTemplateType
      ? fieldState
      : createDefaultTemplateFieldState(createType)
    const newTemplate = createTemplateDefinition(
      createType,
      createName.trim(),
      createDescription.trim() || undefined,
      initialFieldState,
    )
    const nextSettings: TemplateSettingsShape = {
      ...templateSettings,
      active_template_type: newTemplate.type,
      active_template_id: newTemplate.id,
      templates: [...existingTemplates, newTemplate],
    }
    const nextCurriculum = applyTemplateToSessionRows(curriculum, newTemplate)
    await saveTemplateSettings(nextSettings, nextCurriculum)
    skipFieldStateResetRef.current = true
    setFieldState(initialFieldState)
    setActiveTemplateId(newTemplate.id)
    fieldStateInteractedRef.current = false
    setSelectedTemplateType(createType)
    setSelectedLoadTemplateId(newTemplate.id)
    setShowCreatePopup(false)
  }, [courseId, createDescription, createName, createType, curriculum, fieldState, saveTemplateSettings, selectedTemplateType, templateSettings])

  const handleLoadTemplate = useCallback(async () => {
    const targetTemplate = savedTemplates.find((template) => template.id === selectedLoadTemplateId)
    if (!targetTemplate) {
      setMessage("Select a template to load.")
      return
    }
    // Restore the saved template's field configuration into the config panel
    if (targetTemplate.fieldState) {
      skipFieldStateResetRef.current = true
      setFieldState(targetTemplate.fieldState)
    }
    setActiveTemplateId(targetTemplate.id)
    setSelectedTemplateType(targetTemplate.type)
    fieldStateInteractedRef.current = false
    const nextSettings: TemplateSettingsShape = {
      ...templateSettings,
      active_template_type: targetTemplate.type,
      active_template_id: targetTemplate.id,
      templates: savedTemplates,
    }
    const nextCurriculum = applyTemplateToSessionRows(curriculum, targetTemplate)
    await saveTemplateSettings(nextSettings, nextCurriculum)
    setShowLoadPopup(false)
  }, [curriculum, saveTemplateSettings, savedTemplates, selectedLoadTemplateId, templateSettings])

  const openCreatePopup = useCallback(() => {
    setShowLoadPopup(false)
    // Reset name to match the currently selected type
    setCreateName((prev) => {
      const defaultName = createType.charAt(0).toUpperCase() + createType.slice(1)
      // Only reset if it looks like an auto-generated / default name
      const knownDefaults = ["Lesson", "Certificate", "Quiz", "Assessment", "Exam"]
      return knownDefaults.includes(prev) ? defaultName : prev
    })
    setShowCreatePopup((prev) => !prev)
  }, [createType])

  const openLoadPopup = useCallback(() => {
    if (!savedTemplates.length) return
    setShowCreatePopup(false)
    setSelectedLoadTemplateId((current) => current || savedTemplates[0]?.id || "")
    setShowLoadPopup((prev) => !prev)
  }, [savedTemplates])

  const handleActivateTemplate = useCallback(async (templateId: string) => {
    const targetTemplate = savedTemplates.find((t) => t.id === templateId)
    if (!targetTemplate) return
    // Guard must be set BEFORE setSelectedTemplateType so the effect that
    // resets fieldState to type defaults sees the flag and skips the reset.
    if (targetTemplate.fieldState) {
      skipFieldStateResetRef.current = true
      setFieldState(targetTemplate.fieldState)
    }
    setActiveTemplateId(templateId)
    setSelectedTemplateType(targetTemplate.type)
    fieldStateInteractedRef.current = false
    const nextSettings: TemplateSettingsShape = {
      ...templateSettings,
      active_template_type: targetTemplate.type,
      active_template_id: targetTemplate.id,
      templates: savedTemplates,
    }
    const nextCurriculum = applyTemplateToSessionRows(curriculum, targetTemplate)
    await saveTemplateSettings(nextSettings, nextCurriculum)
    setMessage("Template applied.")
  }, [curriculum, saveTemplateSettings, savedTemplates, templateSettings])

  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    const remainingTemplates = savedTemplates.filter((t) => t.id !== templateId)
    const nextActiveTemplate = activeTemplateId === templateId
      ? remainingTemplates[0]
      : remainingTemplates.find((t) => t.id === activeTemplateId)
    const nextSettings: TemplateSettingsShape = {
      ...templateSettings,
      active_template_type: nextActiveTemplate?.type ?? templateSettings.active_template_type,
      active_template_id: nextActiveTemplate?.id,
      templates: remainingTemplates,
    }
    if (activeTemplateId === templateId) {
      setActiveTemplateId(nextActiveTemplate?.id ?? null)
      if (nextActiveTemplate) {
        setSelectedTemplateType(nextActiveTemplate.type)
        if (nextActiveTemplate.fieldState) setFieldState(nextActiveTemplate.fieldState)
      }
    }
    await saveTemplateSettings(nextSettings)
  }, [activeTemplateId, saveTemplateSettings, savedTemplates, templateSettings])

  return (
    <SetupSection
      title="Templates"
      description="Create and configure reusable templates applied to course sessions."
      headerActions={(
        <TemplateHeaderActions
          canCreate={Boolean(courseId) && !saving}
          canLoad={Boolean(courseId) && !saving && savedTemplates.length > 0}
          showCreatePopup={showCreatePopup}
          showLoadPopup={showLoadPopup}
          templateTypes={TEMPLATE_TYPES as SetupTemplateType[]}
          createType={createType}
          createName={createName}
          createDescription={createDescription}
          selectedLoadTemplateId={selectedLoadTemplateId}
          savedTemplates={savedTemplates}
          activeTemplateId={activeTemplateId}
          onOpenCreate={openCreatePopup}
          onOpenLoad={openLoadPopup}
          onCloseCreate={() => setShowCreatePopup(false)}
          onCloseLoad={() => setShowLoadPopup(false)}
          onChangeCreateType={setCreateType}
          onChangeCreateName={setCreateName}
          onChangeCreateDescription={setCreateDescription}
          onChangeSelectedLoadTemplate={setSelectedLoadTemplateId}
          onCreate={handleCreateTemplate}
          onLoad={handleLoadTemplate}
          onActivateTemplate={handleActivateTemplate}
          onDeleteTemplate={handleDeleteTemplate}
        />
      )}
    >
      {courseId && !hydrated && (showHydrationPlaceholder || loading) ? (
        <SetupPanels
          config={(
            <div className="space-y-4 rounded-xl border border-border/70 bg-background p-5">
              <div className="h-10 rounded bg-muted/60" />
              <div className="h-10 rounded bg-muted/60" />
              <div className="h-10 rounded bg-muted/60" />
              <div className="h-40 rounded bg-muted/50" />
            </div>
          )}
          preview={(
            <div className="rounded-xl border border-border/70 bg-background p-5">
              <div className="h-4 w-32 rounded bg-muted/60" />
              <div className="mt-4 space-y-3">
                <div className="h-8 rounded bg-muted/50" />
                <div className="h-8 rounded bg-muted/50" />
                <div className="h-8 rounded bg-muted/50" />
              </div>
            </div>
          )}
        />
      ) : (
        <SetupPanels
          config={(
            <div className="space-y-4">
              {/* Active template indicator */}
              {activeTemplateId && (() => {
                const activeTpl = savedTemplates.find((t) => t.id === activeTemplateId)
                return activeTpl ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Active template</span>
                    <span className="text-xs font-medium text-foreground">{activeTpl.label}</span>
                    <span className="rounded border border-border bg-background/70 px-1.5 py-0.5 text-[10px] text-muted-foreground capitalize">{activeTpl.type}</span>
                  </div>
                ) : null
              })()}

              {/* Field toggle panel */}
              <div className="rounded-lg border border-border bg-background p-4">
                <TemplateConfigPanel
                  blocks={selectedBlocks}
                  fieldDefs={BLOCK_FIELDS}
                  fieldState={fieldState}
                  onToggleOptional={handleToggleOptional}
                  onApplyPartitionPreset={handleApplyPartitionPreset}
                  onRenamePartition={handleRenamePartition}
                  onAddPartition={handleAddPartition}
                  onRemovePartition={handleRemovePartition}
                />
                {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
                {!courseId && <p className="mt-2 text-xs text-muted-foreground">Create a course first to save templates.</p>}
              </div>
            </div>
          )}
          preview={(
            <TemplatePreviewPanel
              blocks={selectedBlocks}
              fieldState={fieldState}
            />
          )}
        />
      )}
    </SetupSection>
  )
}
