"use client"

import { useCallback, useEffect, useState } from "react"
import { PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { arrayMove } from "@dnd-kit/sortable"
import { createClient } from "@/lib/supabase/client"
import { DEFAULT_TEMPLATE_VISUAL_DENSITY, type TemplateVisualDensity } from "@/lib/curriculum/template-source-of-truth"
import type { TemplateType } from "@/lib/curriculum/template-blocks"
import { useDebouncedChangeSave } from "@/components/coursebuilder/use-debounced-change-save"
import {
  ALL_BLOCKS,
  BLOCK_FIELDS,
  defaultBlockOrder,
  defaultEnabled,
  defaultFieldEnabled,
  normalizeTemplate,
  normalizeTemplateSettings,
  resolveBlockOrder,
  type BlockId,
  type LocalTemplate,
  type TemplateBlockConfig,
  type TemplateFieldState,
  type TemplateSettingsPayload,
  type TemplateUiState,
} from "./template-section-data"

export function useTemplatesSection(courseId: string | null) {
  // ── Persisted state ───────────────────────────────────────────────────────
  const [templates, setTemplates]         = useState<LocalTemplate[]>([])
  const [activeId, setActiveId]           = useState<string | null>(null)
  const [panelView, setPanelView]         = useState<"config" | "preview">("config")
  const [configView, setConfigView]       = useState<"idle" | "create" | "edit">("idle")
  const [visualDensity, setVisualDensity] = useState<TemplateVisualDensity>(DEFAULT_TEMPLATE_VISUAL_DENSITY)

  // ── Overlay state ─────────────────────────────────────────────────────────
  const [showTypeOverlay, setShowTypeOverlay]             = useState(false)
  const [showLoadOverlay, setShowLoadOverlay]             = useState(false)
  const [pendingTypeSelection, setPendingTypeSelection]   = useState<TemplateType | null>(null)
  const [pendingLoadId, setPendingLoadId]                 = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete]                 = useState(false)

  // ── UI hydration state ────────────────────────────────────────────────────
  const [uiStateLoaded, setUiStateLoaded]     = useState(false)
  const [localUiState, setLocalUiState]       = useState<TemplateUiState | null>(null)
  const [serverUiState, setServerUiState]     = useState<TemplateUiState | null>(null)

  const uiStorageKey = courseId ? `coursebuilder:templates:ui:${courseId}` : null

  // ── Config form state ─────────────────────────────────────────────────────
  const [configType, setConfigType]                   = useState<TemplateType>("lesson")
  const [configName, setConfigName]                   = useState("")
  const [configDesc, setConfigDesc]                   = useState("")
  const [configEnabled, setConfigEnabled]             = useState<Record<BlockId, boolean>>(defaultEnabled())
  const [configFieldEnabled, setConfigFieldEnabled]   = useState<TemplateFieldState>(defaultFieldEnabled("lesson", defaultEnabled()))
  const [configBlockOrder, setConfigBlockOrder]       = useState<BlockId[]>(defaultBlockOrder("lesson"))

  // ── Load templates on courseId change ─────────────────────────────────────
  useEffect(() => {
    queueMicrotask(() => { setUiStateLoaded(false); setLocalUiState(null); setServerUiState(null) })
  }, [courseId])

  useEffect(() => {
    if (!courseId) return
    if (uiStorageKey) {
      const raw = localStorage.getItem(uiStorageKey)
      if (raw) {
        try   { queueMicrotask(() => setLocalUiState(JSON.parse(raw) as TemplateUiState)) }
        catch { queueMicrotask(() => setLocalUiState(null)) }
      } else {
        queueMicrotask(() => setLocalUiState(null))
      }
    }
    const supabase = createClient()
    supabase.from("courses").select("template_settings").eq("id", courseId).single().then(({ data, error }) => {
      if (error) return
      const settings = normalizeTemplateSettings(data?.template_settings)
      setTemplates(settings.templates.map(normalizeTemplate))
      setServerUiState(settings.ui ?? null)
    })
  }, [courseId, uiStorageKey])

  // ── Persist to Supabase ───────────────────────────────────────────────────
  const persistTemplates = useCallback(async (list: LocalTemplate[], uiOverrides?: Partial<TemplateUiState>) => {
    if (!courseId) return
    const supabase = createClient()
    const payload: TemplateSettingsPayload = {
      templates: list,
      ui: {
        activeId:       uiOverrides?.activeId     ?? activeId,
        panelView:      uiOverrides?.panelView    ?? panelView,
        configView:     uiOverrides?.configView   ?? configView,
        visualDensity:  uiOverrides?.visualDensity ?? visualDensity,
      },
    }
    await supabase.from("courses").update({ template_settings: payload, updated_at: new Date().toISOString() }).eq("id", courseId)
  }, [courseId, activeId, panelView, configView, visualDensity])

  // ── Persist UI state to localStorage ─────────────────────────────────────
  useEffect(() => {
    if (!uiStorageKey) return
    const nextState: TemplateUiState = { activeId, panelView, configView, visualDensity }
    localStorage.setItem(uiStorageKey, JSON.stringify(nextState))
  }, [uiStorageKey, activeId, panelView, configView, visualDensity])

  // ── Body scroll lock when overlays are open ───────────────────────────────
  useEffect(() => {
    if (!showTypeOverlay && !showLoadOverlay) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = previousOverflow }
  }, [showTypeOverlay, showLoadOverlay])

  // ── UI state hydration ────────────────────────────────────────────────────
  useEffect(() => {
    if (uiStateLoaded) return
    if (templates.length === 0) return
    const savedUi     = localUiState ?? serverUiState
    const targetId    = savedUi?.activeId ?? templates[0]?.id ?? null
    const targetTpl   = targetId ? templates.find(t => t.id === targetId) ?? null : null
    const nextPanelView   = savedUi?.panelView
    const nextDensity     = savedUi?.visualDensity ?? DEFAULT_TEMPLATE_VISUAL_DENSITY
    queueMicrotask(() => {
      if (targetTpl) loadTemplate(targetTpl)
      if (nextPanelView) setPanelView(nextPanelView)
      setVisualDensity(nextDensity)
      setUiStateLoaded(true)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, localUiState, serverUiState, uiStateLoaded])

  // ── DnD sensors ───────────────────────────────────────────────────────────
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  // ── Derived values ────────────────────────────────────────────────────────
  const activeTemplate  = templates.find(t => t.id === activeId) ?? null
  const isCreating      = configView === "create"
  const isEditing       = configView === "edit"
  const isConfiguring   = isCreating || isEditing

  // ── Action: begin create ──────────────────────────────────────────────────
  function beginCreate() {
    const nextEnabled = defaultEnabled()
    setActiveId(null)
    setConfigView("create")
    setConfigType("lesson")
    setConfigName("")
    setConfigDesc("")
    setConfigEnabled(nextEnabled)
    setConfigFieldEnabled(defaultFieldEnabled("lesson", nextEnabled))
    setConfigBlockOrder(defaultBlockOrder("lesson"))
    setPendingTypeSelection(null)
    setShowTypeOverlay(true)
  }

  function beginLoad() {
    if (templates.length === 0) return
    setPendingLoadId(activeId ?? templates[0]?.id ?? null)
    setConfirmDelete(false)
    setShowLoadOverlay(true)
  }

  // ── Action: complete type overlay (create or save) ────────────────────────
  function createFromOverlay() {
    if (!pendingTypeSelection || !configName.trim()) return
    const nextEnabled       = defaultEnabled()
    const nextFieldEnabled  = defaultFieldEnabled(pendingTypeSelection, nextEnabled)
    const tpl: LocalTemplate = {
      id: crypto.randomUUID(), name: configName.trim(), type: pendingTypeSelection,
      enabled: { ...nextEnabled }, fieldEnabled: { ...nextFieldEnabled },
      blockOrder: defaultBlockOrder(pendingTypeSelection),
      description: configDesc, createdAt: new Date().toISOString(),
    }
    const updated = [...templates, tpl]
    setTemplates(updated);  setActiveId(tpl.id);  setConfigType(tpl.type)
    setConfigEnabled({ ...tpl.enabled })
    setConfigFieldEnabled(tpl.fieldEnabled ?? defaultFieldEnabled(tpl.type, tpl.enabled))
    setConfigBlockOrder(resolveBlockOrder(tpl.type, tpl.blockOrder))
    setConfigView("edit")
    void persistTemplates(updated)
    setShowTypeOverlay(false)
  }

  async function saveFromOverlay() {
    if (!activeId || !pendingTypeSelection || !configName.trim()) return
    const updated = templates.map(tplRaw => {
      if (tplRaw.id !== activeId) return tplRaw
      const tpl = normalizeTemplate(tplRaw)
      return normalizeTemplate({ ...tpl, name: configName.trim(), description: configDesc, type: pendingTypeSelection })
    })
    setTemplates(updated)
    setConfigType(pendingTypeSelection)
    setConfigName(configName.trim())
    const updatedActive = updated.find(tpl => tpl.id === activeId)
    if (updatedActive) setConfigBlockOrder(resolveBlockOrder(updatedActive.type, updatedActive.blockOrder))
    setShowTypeOverlay(false);  setShowLoadOverlay(false)
    setConfirmDelete(false);    setPendingLoadId(null)
    await persistTemplates(updated)
  }

  function formatTemplateDate(ts?: string) {
    if (!ts) return "Date unavailable"
    const parsed = new Date(ts)
    return Number.isNaN(parsed.getTime()) ? "Date unavailable" : parsed.toLocaleString()
  }

  function toggleBlock(id: BlockId, force?: boolean) {
    if (activeId) setConfigView("edit")
    const block = ALL_BLOCKS.find(b => b.id === id)
    if (block?.mandatory) return
    setConfigEnabled(prev => {
      const nextValue = force ?? !prev[id]
      setConfigFieldEnabled(fieldsPrev => {
        const nextFields = { ...fieldsPrev, [id]: { ...(fieldsPrev[id] ?? {}) } }
        for (const field of BLOCK_FIELDS[id].filter(f => f.forTypes.includes(configType))) {
          nextFields[id][field.key] = nextValue ? field.required : false
        }
        return nextFields
      })
      return { ...prev, [id]: nextValue }
    })
  }

  function toggleField(blockId: BlockId, fieldKey: string, value?: boolean) {
    if (activeId) setConfigView("edit")
    setConfigFieldEnabled(prev => ({ ...prev, [blockId]: { ...prev[blockId], [fieldKey]: value ?? !prev[blockId]?.[fieldKey] } }))
  }

  function loadTemplate(tplRaw: LocalTemplate) {
    const tpl = normalizeTemplate(tplRaw)
    setActiveId(tpl.id);          setConfigType(tpl.type)
    setConfigName(tpl.name);      setConfigDesc(tpl.description)
    setConfigEnabled({ ...tpl.enabled })
    setConfigFieldEnabled(tpl.fieldEnabled ?? defaultFieldEnabled(tpl.type, tpl.enabled))
    setConfigBlockOrder(resolveBlockOrder(tpl.type, tpl.blockOrder))
    setConfigView("edit");        setPanelView("config")
    setShowTypeOverlay(false);    setShowLoadOverlay(false)
    setConfirmDelete(false);      setPendingLoadId(null)
  }

  async function deletePendingTemplate() {
    if (!pendingLoadId) return
    const updated = templates.filter(tpl => tpl.id !== pendingLoadId)
    setTemplates(updated)
    if (activeId === pendingLoadId) { setActiveId(null); setConfigView("idle") }
    setConfirmDelete(false)
    setPendingLoadId(updated[0]?.id ?? null)
    if (showLoadOverlay && updated.length === 0) setShowLoadOverlay(false)
    await persistTemplates(updated)
  }

  function handleBlockDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const current  = resolveBlockOrder(configType, configBlockOrder)
    const oldIndex = current.indexOf(active.id as BlockId)
    const newIndex = current.indexOf(over.id as BlockId)
    if (oldIndex < 0 || newIndex < 0) return
    setConfigBlockOrder(arrayMove(current, oldIndex, newIndex))
    if (activeId) setConfigView("edit")
  }

  // ── Debounced auto-save ───────────────────────────────────────────────────
  const persistTemplateDraft = useCallback(async () => {
    if (!courseId || !activeId || configView === "create") return
    const active = templates.find(item => item.id === activeId)
    if (!active) return
    const normalizedActive = normalizeTemplate(active)
    const nextDraft = normalizeTemplate({
      ...normalizedActive, name: configName.trim(), type: configType,
      enabled: { ...configEnabled }, fieldEnabled: { ...configFieldEnabled },
      blockOrder: resolveBlockOrder(configType, configBlockOrder), description: configDesc,
    })
    const unchanged =
      normalizedActive.name === nextDraft.name &&
      normalizedActive.type === nextDraft.type &&
      normalizedActive.description === nextDraft.description &&
      JSON.stringify(normalizedActive.enabled) === JSON.stringify(nextDraft.enabled) &&
      JSON.stringify(normalizedActive.fieldEnabled) === JSON.stringify(nextDraft.fieldEnabled) &&
      JSON.stringify(normalizedActive.blockOrder) === JSON.stringify(nextDraft.blockOrder)
    if (unchanged) return
    const updated = templates.map(item => (item.id === activeId ? nextDraft : item))
    setTemplates(updated)
    await persistTemplates(updated)
  }, [courseId, activeId, configView, templates, configName, configType, configEnabled, configFieldEnabled, configBlockOrder, configDesc, persistTemplates])

  useDebouncedChangeSave(persistTemplateDraft, 700, Boolean(courseId) && isEditing && Boolean(activeId))
  useDebouncedChangeSave(persistTemplateDraft, 700, Boolean(courseId) && Boolean(activeId))

  // ── Preview derived values ────────────────────────────────────────────────
  const useDraftPreview    = isCreating || Boolean(activeTemplate)
  const previewType        = useDraftPreview ? configType         : (activeTemplate?.type ?? "lesson")
  const previewEnabled     = useDraftPreview ? configEnabled      : (activeTemplate?.enabled ?? defaultEnabled())
  const previewFieldEnabled = useDraftPreview ? configFieldEnabled : (activeTemplate?.fieldEnabled ?? defaultFieldEnabled(previewType, previewEnabled))
  const previewName        = useDraftPreview ? configName         : (activeTemplate?.name ?? "")
  const previewDescription = useDraftPreview ? configDesc         : (activeTemplate?.description ?? "")
  const previewBlockOrder  = useDraftPreview
    ? resolveBlockOrder(configType, configBlockOrder)
    : resolveBlockOrder(activeTemplate?.type ?? "lesson", activeTemplate?.blockOrder)
  const orderedBlocks: TemplateBlockConfig[] = resolveBlockOrder(configType, configBlockOrder)
    .map(id => ALL_BLOCKS.find(b => b.id === id))
    .filter((b): b is TemplateBlockConfig => Boolean(b))

  return {
    // State
    templates, activeId, panelView, setPanelView, configView, visualDensity, setVisualDensity,
    showTypeOverlay, showLoadOverlay,
    pendingTypeSelection, setPendingTypeSelection,
    pendingLoadId, setPendingLoadId,
    confirmDelete, setConfirmDelete,
    configType, configName, setConfigName, configDesc, setConfigDesc,
    configEnabled, configFieldEnabled, configBlockOrder,
    sensors,
    // Derived
    activeTemplate, isCreating, isEditing, isConfiguring,
    // Actions
    beginCreate, beginLoad,
    createFromOverlay, saveFromOverlay,
    formatTemplateDate, toggleBlock, toggleField, loadTemplate,
    deletePendingTemplate, handleBlockDragEnd,
    // Preview
    previewType, previewEnabled, previewFieldEnabled,
    previewName, previewDescription, previewBlockOrder,
    orderedBlocks,
  }
}
