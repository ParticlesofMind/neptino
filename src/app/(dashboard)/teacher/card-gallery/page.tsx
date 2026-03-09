"use client"

import { useEffect, useMemo, useState } from "react"
import type { CardType } from "@/components/coursebuilder/create/types"
import { CARD_TYPE_META, CardTypePreview } from "@/components/coursebuilder/create/cards/CardTypePreview"
import { CARD_SPECS, SAMPLE_CONTENT } from "@/components/coursebuilder/create/sidebar/make-panel-data"
import { LayoutSpecThumbnail } from "./layout-spec-thumbnail"
import { LayoutSandboxPreview } from "./layout-sandbox-preview"
import { CARD_MIN_SLOT_WIDTH_PX } from "./layout-system-specs"

type ViewMode = "single" | "grid"
const APPROVED_STORAGE_KEY = "teacher-card-gallery-approved-v1"
const DRAG_MIME = "text/x-neptino-card-type"
const PREVIEW_FRAME = { width: 760, height: 560 }
const LAYOUT_SIDE_MARGIN_MM = 2.54

const VISIBLE_GROUPS = ["media", "products", "layout"] as const
type VisibleGroup = typeof VISIBLE_GROUPS[number]

interface GalleryItem {
  cardType: CardType
  label: string
  group: VisibleGroup
  summary: string
  content: Record<string, unknown>
}
const GROUP_LABELS: Record<VisibleGroup, string> = {
  media: "Media",
  products: "Products",
  layout: "Layouts",
}
const GROUP_DOT_CLASS: Record<VisibleGroup, string> = {
  media: "bg-emerald-500", products: "bg-amber-500", layout: "bg-slate-500",
}
function buildFallbackContent(cardType: CardType, label: string): Record<string, unknown> {
  if (cardType.startsWith("layout-")) return { title: `${label} layout`, slots: {} }
  if (cardType === "media") return { title: "Media bundle", primary: "video/mp4", sources: ["video", "audio", "transcript"] }
  if (cardType === "village-3d") return { title: "Village scene", environment: "village" }
  return { title: label }
}
export default function CardGalleryPage() {
  const [activeType, setActiveType] = useState<CardType>("text")
  const [viewMode, setViewMode] = useState<ViewMode>("single")
  const [showApprovedOnly, setShowApprovedOnly] = useState(false)
  const [approvedTypes, setApprovedTypes] = useState<CardType[]>(() => {
    if (typeof window === "undefined") return []
    const raw = window.localStorage.getItem(APPROVED_STORAGE_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw) as string[]
      return parsed.filter((item): item is CardType => item in CARD_TYPE_META)
    } catch {
      window.localStorage.removeItem(APPROVED_STORAGE_KEY)
      return []
    }
  })

  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(APPROVED_STORAGE_KEY, JSON.stringify(approvedTypes))
  }, [approvedTypes])

  const cardItems = useMemo<GalleryItem[]>(() => {
    const specMap = new Map(CARD_SPECS.map((spec) => [spec.cardType, spec]))
    const allTypes = Object.keys(CARD_TYPE_META) as CardType[]

    return allTypes.flatMap((cardType) => {
      const meta = CARD_TYPE_META[cardType]
      const spec = specMap.get(cardType)
      const group = spec?.group
      if (!group || !(VISIBLE_GROUPS as readonly string[]).includes(group)) return []
      return [{
        cardType,
        label: meta.label,
        group: group as VisibleGroup,
        summary: spec.description,
        content: (SAMPLE_CONTENT[cardType] as Record<string, unknown> | undefined)
          ?? buildFallbackContent(cardType, meta.label),
      }]
    })
  }, [])

  const grouped = useMemo(() => cardItems.reduce<Record<string, GalleryItem[]>>((acc, item) => {
    const key = item.group
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {}), [cardItems])

  const activeItem = cardItems.find((item) => item.cardType === activeType) ?? cardItems[0]
  const isSingleLayoutPreview = viewMode === "single" && activeItem.cardType.startsWith("layout-")
  const approvedItems = cardItems.filter((item) => approvedTypes.includes(item.cardType))
  const gridItems = showApprovedOnly ? approvedItems : cardItems

  const toggleApproved = (cardType: CardType) => setApprovedTypes((prev) =>
    prev.includes(cardType) ? prev.filter((t) => t !== cardType) : [...prev, cardType],
  )

  return (
    <div className="min-h-[520px] h-[calc(100dvh-96px)] overflow-hidden">
      <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="flex h-full min-h-0 flex-col rounded-xl border border-border/80 bg-muted/10 p-3.5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Card Index</p>
            <span className="text-[11px] text-muted-foreground">{cardItems.length} total</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setViewMode("grid")
              setShowApprovedOnly(false)
            }}
            className={
              viewMode === "grid" && !showApprovedOnly
                ? "mb-3 w-full rounded-lg border border-primary/45 bg-primary/10 px-2.5 py-1.5 text-left text-[12px] font-medium text-foreground"
                : "mb-3 w-full rounded-lg border border-border bg-background/70 px-2.5 py-1.5 text-left text-[12px] font-medium text-foreground hover:border-primary/35 hover:bg-primary/5"
            }
          >
            All Cards
          </button>
            <div className="mb-3 rounded-md border border-border bg-background/70 px-2.5 py-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground">Approved</p>
                <span className="text-[11px] text-muted-foreground">{approvedItems.length}</span>
              </div>
              {approvedItems.length > 0 ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {approvedItems.map((item) => (
                    <button
                      key={item.cardType}
                      type="button"
                      onClick={() => {
                        setActiveType(item.cardType)
                        setViewMode("single")
                      }}
                        className="rounded border border-primary/35 bg-primary/10 px-1.5 py-0.5 text-[10px] text-foreground"
                    >
                      {typeof item.content["title"] === "string" && item.content["title"] ? item.content["title"] : item.label}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-[10px] text-muted-foreground">Use Approve buttons to mark keepers.</p>
              )}
            </div>
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-4">
            {Object.entries(grouped).map(([group, items]) => (
              <div key={group} className="space-y-2">
                <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  <span className={`h-1.5 w-1.5 rounded-full ${GROUP_DOT_CLASS[group as VisibleGroup]}`} />
                  {GROUP_LABELS[group as VisibleGroup]}
                </p>
                <div className="space-y-1.5">
                  {items.map((item) => {
                    const isActive = item.cardType === activeType
                    const RowIcon = CARD_TYPE_META[item.cardType].icon
                    return (
                      <div
                        key={item.cardType}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setActiveType(item.cardType)
                          setViewMode("single")
                        }}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter" || ev.key === " ") {
                            ev.preventDefault()
                            setActiveType(item.cardType)
                            setViewMode("single")
                          }
                        }}
                        draggable
                        onDragStart={(ev) => {
                          ev.dataTransfer.setData(DRAG_MIME, item.cardType)
                          ev.dataTransfer.setData("text/plain", item.cardType)
                          ev.dataTransfer.effectAllowed = "copy"

                          // Clone the card element as the drag ghost so it looks identical
                          const el = ev.currentTarget as HTMLElement
                          const rect = el.getBoundingClientRect()
                          const clone = el.cloneNode(true) as HTMLElement
                          clone.style.position = "fixed"
                          clone.style.top = "-9999px"
                          clone.style.left = "-9999px"
                          clone.style.width = `${rect.width}px`
                          clone.style.pointerEvents = "none"
                          document.body.appendChild(clone)
                          ev.dataTransfer.setDragImage(clone, ev.clientX - rect.left, ev.clientY - rect.top)
                          requestAnimationFrame(() => document.body.removeChild(clone))
                        }}
                        className={
                          isActive
                            ? "w-full cursor-grab rounded-lg border border-primary/45 bg-primary/10 px-2 py-1.5 text-left"
                            : "w-full cursor-grab rounded-lg border border-border bg-background/70 px-2 py-1.5 text-left hover:border-primary/35 hover:bg-primary/5"
                        }
                      >
                        <div className="mb-1 flex items-center gap-1.5">
                          <RowIcon className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[11px] font-medium text-foreground">{typeof item.content["title"] === "string" && item.content["title"] ? item.content["title"] : item.label}</p>
                        </div>
                        {!item.cardType.startsWith("layout-") && CARD_MIN_SLOT_WIDTH_PX[item.cardType] != null && (
                          <p className="mb-1 text-[10px] text-muted-foreground">
                            min slot <span className="font-medium text-foreground">{CARD_MIN_SLOT_WIDTH_PX[item.cardType]}px</span> wide
                          </p>
                        )}
                        <div className="mt-1 overflow-hidden">
                          {item.cardType.startsWith("layout-") ? (
                            <LayoutSpecThumbnail layoutType={item.cardType} />
                          ) : (
                            <div className="overflow-hidden" style={{ maxHeight: 140 }}>
                              <CardTypePreview cardType={item.cardType} content={item.content} hideTitle />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section
          className={
            viewMode === "single"
              ? "min-w-0 min-h-0 h-full overflow-hidden p-5"
              : "min-w-0 min-h-0 h-full overflow-hidden rounded-2xl border border-border bg-background p-5"
          }
        >
          <div
            className={viewMode === "single"
              ? "h-full min-h-0 overflow-auto p-0"
              : "h-full min-h-0 overflow-auto rounded-xl border border-dashed border-border bg-muted/10 p-4"}
          >
              {viewMode === "single" ? (
                isSingleLayoutPreview ? (
                  <div
                    className="mx-auto h-full"
                    style={{
                      width: `calc(100% - ${LAYOUT_SIDE_MARGIN_MM * 2}mm)`,
                      height: "100%",
                    }}
                  >
                    <LayoutSandboxPreview key={activeItem.cardType} layoutType={activeItem.cardType} />
                  </div>
                ) : (
                  <div className="mx-auto" style={{ width: PREVIEW_FRAME.width, minHeight: PREVIEW_FRAME.height }}>
                    <CardTypePreview cardType={activeItem.cardType} content={activeItem.content} />
                  </div>
                )
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {gridItems.map((item) => (
                    <article key={item.cardType} className="rounded-xl border border-border bg-background p-3 shadow-sm">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-foreground">{typeof item.content["title"] === "string" && item.content["title"] ? item.content["title"] : item.label}</p>
                          <div className="flex items-center gap-2">
                            <p className="text-[10px] text-muted-foreground">{GROUP_LABELS[item.group]}</p>
                            {!item.cardType.startsWith("layout-") && CARD_MIN_SLOT_WIDTH_PX[item.cardType] != null && (
                              <span className="rounded border border-border px-1 py-px text-[10px] text-muted-foreground">
                                min {CARD_MIN_SLOT_WIDTH_PX[item.cardType]}px
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleApproved(item.cardType)}
                          className={
                            approvedTypes.includes(item.cardType)
                              ? "rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-foreground"
                              : "rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                          }
                        >
                          {approvedTypes.includes(item.cardType) ? "Approved" : "Approve"}
                        </button>
                      </div>
                      {item.cardType.startsWith("layout-") ? (
                        <LayoutSpecThumbnail layoutType={item.cardType} />
                      ) : (
                        <div style={{ minHeight: PREVIEW_FRAME.height }}>
                          <CardTypePreview cardType={item.cardType} content={item.content} hideTitle />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
          </div>
        </section>
      </div>
    </div>
  )
}
