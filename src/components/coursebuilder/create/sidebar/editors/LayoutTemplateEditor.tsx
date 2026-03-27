"use client"

import { useDndMonitor, useDraggable, useDroppable } from "@dnd-kit/core"
import { X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"

import { CARD_TYPE_META } from "../../cards/card-type-registry"
import { CardTypePreview } from "../../cards/CardTypePreview"
import { LAYOUT_DEFS, type LayoutKind, type SlotSpec } from "../../cards/card-types/LayoutCard"
import type { CardType } from "../../types"
import { getSampleCardContent } from "../../utils/cardDefaults"

interface LayoutTemplateEditorProps {
  cardType: CardType
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

interface LayoutEditorDragData {
  type: "layout-editor-item"
  cardType: CardType
}

function isLayoutCardType(cardType: unknown): cardType is CardType {
  return typeof cardType === "string" && cardType.startsWith("layout-")
}

function extractLayoutKind(cardType: CardType): LayoutKind {
  const kind = cardType.replace("layout-", "") as LayoutKind
  return kind in LAYOUT_DEFS ? kind : "split"
}

function slotAcceptsText(slot: SlotSpec): string {
  if (!slot.accepts.length) return "Any"
  if (slot.accepts.length > 6) return "Any"
  return slot.accepts.map((type) => CARD_TYPE_META[type].label).join(" / ")
}

function isDropAllowed(slot: SlotSpec, droppedType: CardType): boolean {
  if ((slot.constraint ?? "soft") === "soft") return true
  if (!slot.accepts.length) return true
  return slot.accepts.includes(droppedType)
}

function PaletteItem({ cardType }: { cardType: CardType }) {
  const meta = CARD_TYPE_META[cardType]
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `layout-editor-palette:${cardType}`,
    data: {
      type: "layout-editor-item",
      cardType,
    } as LayoutEditorDragData,
  })

  return (
    <button
      ref={setNodeRef}
      type="button"
      className={[
        "flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-left text-[11px] text-neutral-700 transition-all",
        isDragging ? "opacity-55" : "hover:border-neutral-300 hover:bg-neutral-50",
      ].join(" ")}
      {...attributes}
      {...listeners}
    >
      <span className="flex h-5 w-5 items-center justify-center rounded border border-neutral-200 bg-neutral-50">
        <meta.icon size={11} className="text-neutral-600" />
      </span>
      <span className="truncate">{meta.label}</span>
    </button>
  )
}

function SlotDropzone({
  layoutCardType,
  slot,
  slotKey,
  items,
  onRemove,
}: {
  layoutCardType: CardType
  slot: SlotSpec
  slotKey: string
  items: CardType[]
  onRemove: (slotKey: string, index: number) => void
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `layout-editor-slot:${layoutCardType}:${slotKey}`,
    data: { slotKey },
  })

  return (
    <div
      ref={setNodeRef}
      style={{
        gridArea: slot.gridArea,
        minHeight: slot.minHeight,
      }}
      className={[
        "rounded-lg border border-dashed p-2 transition-all",
        isOver
          ? "border-primary/50 bg-primary/5"
          : "border-neutral-200 bg-white",
      ].join(" ")}
    >
      <div className="mb-1">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-700">{slot.label}</p>
        <p className="text-[9px] text-neutral-500">{slot.role} • {slot.sizeClass ?? "Auto"}</p>
        <p className="text-[9px] text-neutral-400">{slotAcceptsText(slot)}</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-2 py-2">
          <p className="text-[10px] text-neutral-400">Drop component</p>
        </div>
      ) : (
        <div className="space-y-1">
          {items.map((itemType, index) => {
            const meta = CARD_TYPE_META[itemType]
            const previewContent = getSampleCardContent(itemType, meta.label)
            return (
              <div
                key={`${slotKey}:${itemType}:${index}`}
                className="overflow-hidden rounded-md border border-neutral-200 bg-white"
              >
                <div className="flex items-center justify-between border-b border-neutral-100 px-2 py-1">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span className="flex h-4 w-4 items-center justify-center rounded border border-neutral-200 bg-neutral-50">
                      <meta.icon size={10} className="shrink-0 text-neutral-600" />
                    </span>
                    <span className="truncate text-[10px] text-neutral-700">{meta.label}</span>
                  </div>
                  <button
                    type="button"
                    className="rounded p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    onClick={() => onRemove(slotKey, index)}
                    aria-label="Remove slot item"
                  >
                    <X size={10} />
                  </button>
                </div>
                <div className="max-h-44 overflow-auto p-2">
                  <CardTypePreview cardType={itemType} content={previewContent} hideTitle />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function LayoutTemplateEditor({ cardType, content, onChange }: LayoutTemplateEditorProps) {
  const kind = isLayoutCardType(cardType) ? extractLayoutKind(cardType) : "split"
  const def = LAYOUT_DEFS[kind]
  const [message, setMessage] = useState<string>("")

  const slotDraft = useMemo(() => {
    const raw = content.slotDraft
    if (!raw || typeof raw !== "object") return {} as Record<string, CardType[]>
    return raw as Record<string, CardType[]>
  }, [content.slotDraft])

  const paletteTypes = useMemo(() => {
    return (Object.keys(CARD_TYPE_META) as CardType[])
      .filter((type) => !type.startsWith("layout-"))
      .filter((type) => type !== "legend" && type !== "table")
  }, [])

  const removeFromSlot = useCallback((slotKey: string, index: number) => {
    const existing = slotDraft[slotKey] ?? []
    const nextItems = existing.filter((_, i) => i !== index)
    const nextDraft = { ...slotDraft, [slotKey]: nextItems }
    onChange("slotDraft", nextDraft)
  }, [onChange, slotDraft])

  useDndMonitor({
    onDragEnd: (event) => {
      const activeData = event.active.data.current as LayoutEditorDragData | undefined
      if (activeData?.type !== "layout-editor-item") return

      const overId = String(event.over?.id ?? "")
      const prefix = `layout-editor-slot:${cardType}:`
      if (!overId.startsWith(prefix)) return

      const slotKey = overId.slice(prefix.length)
      const slotIndex = Number(slotKey)
      const slot = def.slots[slotIndex]
      if (!slot) return

      if (!isDropAllowed(slot, activeData.cardType)) {
        setMessage(slot.incompatibleHint ?? "This slot does not accept the selected component.")
        return
      }

      const existing = slotDraft[slotKey] ?? []
      if (slot.maxCards != null && existing.length >= slot.maxCards) {
        setMessage("This slot is full.")
        return
      }

      const nextDraft = { ...slotDraft, [slotKey]: [...existing, activeData.cardType] }
      onChange("slotDraft", nextDraft)
      setMessage("")
    },
  })

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white">
      <div className="grid min-h-0 flex-1 grid-cols-[11rem_1fr] gap-0">
        <aside className="border-r border-neutral-200 bg-white p-2">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Components</p>
          <div className="grid max-h-full grid-cols-1 gap-1 overflow-auto pr-1">
            {paletteTypes.map((type) => (
              <PaletteItem key={type} cardType={type} />
            ))}
          </div>
        </aside>

        <section className="min-h-0 overflow-auto p-2">
          <div className="mb-2 rounded-md border border-neutral-200 bg-white px-2.5 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[12px] font-semibold text-neutral-800">{def.label} layout</p>
                <p className="text-[10px] text-neutral-500">Drag components into slots to preview the composition.</p>
              </div>
              <div className="min-w-0 flex-1 max-w-[18rem]">
                <input
                  type="text"
                  value={typeof content.title === "string" ? content.title : ""}
                  onChange={(event) => onChange("title", event.target.value)}
                  placeholder="Composition name"
                  className="h-8 w-full rounded-md border border-neutral-200 bg-white px-2 text-[11px] text-neutral-700 outline-none focus:border-[#9eb9da]"
                />
              </div>
            </div>
            {message && <p className="mt-1 text-[10px] text-amber-700">{message}</p>}
          </div>

          <div
            style={def.gridStyle}
            className="rounded-md border border-neutral-200 bg-white p-2"
          >
            {def.slots.map((slot, idx) => {
              const slotKey = String(idx)
              const items = slotDraft[slotKey] ?? []
              return (
                <SlotDropzone
                  key={slotKey}
                  layoutCardType={cardType}
                  slot={slot}
                  slotKey={slotKey}
                  items={items}
                  onRemove={removeFromSlot}
                />
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}
