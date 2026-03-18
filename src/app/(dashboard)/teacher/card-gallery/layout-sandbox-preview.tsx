"use client"

import { useCallback, useRef, useState } from "react"
import type { CardType } from "@/components/coursebuilder/create/types"
import { CARD_TYPE_META, CardTypePreview } from "@/components/coursebuilder/create/cards/CardTypePreview"
import { SAMPLE_CONTENT } from "@/components/coursebuilder/create/sidebar/make-panel-data"
import { CARD_MIN_SLOT_HEIGHT_PX, CARD_MIN_SLOT_WIDTH_PX, LAYOUT_SYSTEM_SPECS } from "./layout-system-specs"
import type { LayoutPanelSpec } from "./layout-system-specs"

const LAYOUT_PREVIEW_GRID: Partial<Record<CardType, { className: string; slots: number; slotClasses?: string[] }>> = {
  "layout-split": { className: "grid-cols-2 grid-rows-1", slots: 2 },
  "layout-stack": { className: "grid-cols-1 grid-rows-[3fr_2fr]", slots: 2 },
  "layout-feature": { className: "grid-cols-[1fr_3fr] grid-rows-[3fr_1fr]", slots: 3, slotClasses: ["row-span-2", "", ""] },
  "layout-sidebar": { className: "grid-cols-[3fr_7fr] grid-rows-1", slots: 2 },
  "layout-quad": { className: "grid-cols-2 grid-rows-2", slots: 4 },
  "layout-mosaic": { className: "grid-cols-3 grid-rows-3", slots: 9 },
  "layout-triptych": { className: "grid-cols-3 grid-rows-1", slots: 3 },
  "layout-trirow": { className: "grid-cols-1 grid-rows-3", slots: 3 },
  "layout-banner": { className: "grid-cols-2 grid-rows-[1fr_2fr]", slots: 3, slotClasses: ["col-span-2", "", ""] },
  "layout-broadside": { className: "grid-cols-3 grid-rows-[1fr_2fr]", slots: 4, slotClasses: ["col-span-3", "", "", ""] },
  "layout-tower": { className: "grid-cols-[2fr_1fr] grid-rows-3", slots: 4, slotClasses: ["row-span-3", "", "", ""] },
  "layout-pinboard": { className: "grid-cols-2 grid-rows-[1fr_2fr_2fr]", slots: 5, slotClasses: ["col-span-2", "", "", "", ""] },
  "layout-annotated": { className: "grid-cols-[1fr_2fr_2fr] grid-rows-2", slots: 5, slotClasses: ["row-span-2", "", "", "", ""] },
  "layout-sixgrid": { className: "grid-cols-3 grid-rows-2", slots: 6 },
}

const DRAG_MIME = "text/x-neptino-card-type"
// Absolute minimum fraction used when no card constraint applies
const BASE_MIN_FRAC = 0.08

function isLayoutType(cardType: CardType): boolean {
  return cardType.startsWith("layout-")
}

function getFallbackContent(cardType: CardType): Record<string, unknown> {
  const meta = CARD_TYPE_META[cardType]
  return (SAMPLE_CONTENT[cardType] as Record<string, unknown> | undefined) ?? { title: meta.label }
}

/**
 * Parse a CSS grid template string into normalized fractions [0..1].
 * Returns null if any track is not a pure `<n>fr` unit (e.g., contains px / auto / minmax).
 * Only pure-fr tracks are resizable — fixed px rows (like header banners) stay fixed.
 */
function parseTrackFracs(template: string): number[] | null {
  const parts = template.trim().split(/\s+/)
  const raw: number[] = []
  for (const part of parts) {
    const m = /^(\d+(?:\.\d+)?)fr$/.exec(part)
    if (!m) return null
    raw.push(parseFloat(m[1]))
  }
  if (raw.length < 2) return null
  const total = raw.reduce((a, b) => a + b, 0)
  return raw.map((v) => v / total)
}

function fracsToTemplate(fracs: number[]): string {
  return fracs.map((f) => `${Math.round(f * 10000) / 100}fr`).join(" ")
}

function clampFracsAtDivider(
  fracs: number[],
  dividerIndex: number,
  delta: number,
  minA = BASE_MIN_FRAC,
  minB = BASE_MIN_FRAC,
): number[] {
  const updated = [...fracs]
  let a = updated[dividerIndex] + delta
  let b = updated[dividerIndex + 1] - delta
  if (a < minA) { b += a - minA; a = minA }
  if (b < minB) { a += b - minB; b = minB }
  updated[dividerIndex] = a
  updated[dividerIndex + 1] = b
  return updated
}

/**
 * Parse a CSS grid-column/row value like "2 / 4" into { start, end } (1-indexed line numbers).
 */
function parseGridLine(spec: string): { start: number; end: number } | null {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(spec.trim())
  if (!m) return null
  return { start: parseInt(m[1], 10), end: parseInt(m[2], 10) }
}

/**
 * Computes [minFracA, minFracB] for a resize divider based on the cards currently
 * placed in the surrounding slots.
 *
 * dividerIndex: 0-indexed divider — between track[dividerIndex] and track[dividerIndex+1].
 * totalSizePx:  pixel size of the full grid container on this axis.
 * panels:       panel spec array for the active layout.
 * slotCards:    map of slotIndex -> CardType for currently placed cards.
 *
 * Only single-track slots (span = 1) are evaluated; spanning slots are skipped.
 */
function computeMinFracsForDivider(
  axis: "col" | "row",
  dividerIndex: number,
  totalSizePx: number,
  panels: LayoutPanelSpec[],
  slotCards: Record<number, CardType>,
): [number, number] {
  let minA = BASE_MIN_FRAC
  let minB = BASE_MIN_FRAC

  for (let slotIndex = 0; slotIndex < panels.length; slotIndex++) {
    const cardType = slotCards[slotIndex]
    if (!cardType) continue

    const panel = panels[slotIndex]
    const trackSpec = axis === "col" ? panel.col : panel.row
    if (!trackSpec) continue

    const span = parseGridLine(trackSpec)
    if (!span) continue
    // Only handle single-track slots; multi-span distribution is left to future work
    if (span.end - span.start !== 1) continue

    const trackIndex = span.start - 1 // convert to 0-indexed
    const minPx =
      axis === "col"
        ? (CARD_MIN_SLOT_WIDTH_PX[cardType] ?? 100)
        : (CARD_MIN_SLOT_HEIGHT_PX[cardType] ?? 60)
    // Cap at 80% so the opposing side always has at least 20%
    const minFrac = Math.min(minPx / totalSizePx, 0.8)

    if (trackIndex === dividerIndex) {
      minA = Math.max(minA, minFrac)
    } else if (trackIndex === dividerIndex + 1) {
      minB = Math.max(minB, minFrac)
    }
  }

  return [minA, minB]
}

// ─── Resize handle ─────────────────────────────────────────────────────────────

interface ResizeHandleProps {
  axis: "col" | "row"
  dividerIndex: number
  fractions: number[]
  containerRef: React.RefObject<HTMLDivElement | null>
  onUpdate: (fracs: number[]) => void
  onDragStart: () => void
  onDragEnd: () => void
  isActiveDrag: boolean
  anyDragging: boolean
  /** Returns [minA, minB] minimums given the container pixel size at drag start */
  computeMinFracs?: (containerSizePx: number) => [number, number]
}

function ResizeHandle({ axis, dividerIndex, fractions, containerRef, onUpdate, onDragStart, onDragEnd, isActiveDrag, anyDragging, computeMinFracs }: ResizeHandleProps) {
  const [isHovered, setIsHovered] = useState(false)
  const isCol = axis === "col"
  // Suppress all other handles while one is being dragged to prevent visual conflicts
  const suppressed = anyDragging && !isActiveDrag

  // The grid uses gap-2 (8px). Tracks are fractions of (container - nGaps * 8px).
  // The center of gap[i] is at: fracSum * (W - nGaps*8) + (i+1)*8 - 4
  // In CSS: calc(fracSum * 100% + offsetPx) where offsetPx = 8*(i + 0.5 - fracSum*nGaps)
  const fracSum = fractions.slice(0, dividerIndex + 1).reduce((a, b) => a + b, 0)
  const pct = fracSum * 100
  const nGaps = fractions.length - 1
  const gapPx = 8
  const offsetPx = gapPx * (dividerIndex + 0.5 - fracSum * nGaps)
  const pos = `calc(${pct}% + ${offsetPx.toFixed(2)}px)`

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const container = containerRef.current
      if (!container) return
      const rect = container.getBoundingClientRect()
      const totalSize = isCol ? rect.width : rect.height
      const startPos = isCol ? e.clientX : e.clientY
      const startFracs = fractions
      // Capture card-based constraints once at drag start
      const [minA, minB] = computeMinFracs ? computeMinFracs(totalSize) : [BASE_MIN_FRAC, BASE_MIN_FRAC]

      onDragStart()

      const onMove = (me: MouseEvent) => {
        const pos = isCol ? me.clientX : me.clientY
        const delta = (pos - startPos) / totalSize
        onUpdate(clampFracsAtDivider(startFracs, dividerIndex, delta, minA, minB))
      }
      const onUp = () => {
        document.removeEventListener("mousemove", onMove)
        document.removeEventListener("mouseup", onUp)
        onDragEnd()
      }
      document.addEventListener("mousemove", onMove)
      document.addEventListener("mouseup", onUp)
    },
    [isCol, dividerIndex, fractions, containerRef, onUpdate, onDragStart, onDragEnd],
  )

  return (
    <div
      onMouseDown={handleMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="absolute z-[3]"
      style={{
        cursor: isCol ? "col-resize" : "row-resize",
        pointerEvents: suppressed ? "none" : undefined,
        ...(isCol
          ? { left: pos, top: 8, bottom: 8, width: 20, transform: "translateX(-50%)" }
          : { top: pos, left: 8, right: 8, height: 20, transform: "translateY(-50%)" }),
      }}
    >
      <div
        className="absolute transition-opacity"
        style={{
          opacity: (isHovered || isActiveDrag) ? 1 : 0,
          borderRadius: 2,
          backgroundColor: "#6b8fc4",
          ...(isCol
            ? { left: "50%", top: 4, bottom: 4, width: 2, transform: "translateX(-50%)" }
            : { top: "50%", left: 4, right: 4, height: 2, transform: "translateY(-50%)" }),
        }}
      />
    </div>
  )
}

// ─── Sandbox preview ───────────────────────────────────────────────────────────

export function LayoutSandboxPreview({ layoutType }: { layoutType: CardType }) {
  const cfg = LAYOUT_PREVIEW_GRID[layoutType]
  const spec = LAYOUT_SYSTEM_SPECS[layoutType]
  const [slotCards, setSlotCards] = useState<Record<number, CardType>>({})
  const gridRef = useRef<HTMLDivElement>(null)

  // Parse spec track templates into resizable fractions.
  // parseTrackFracs returns null for templates with fixed px units — those stay fixed.
  const [colFracs, setColFracs] = useState<number[] | null>(
    () => (spec ? parseTrackFracs(spec.cols) : null),
  )
  const [rowFracs, setRowFracs] = useState<number[] | null>(
    () => (spec ? parseTrackFracs(spec.rows) : null),
  )
  // Tracks which handle (e.g. "col-0", "row-1") is currently being dragged.
  // Only that handle's indicator is shown; all others are suppressed.
  const [draggingKey, setDraggingKey] = useState<string | null>(null)

  if (!cfg) return null

  const cells = Array.from({ length: cfg.slots }, (_, i) => i)

  const gridCols = colFracs ? fracsToTemplate(colFracs) : spec?.cols
  const gridRows = rowFracs ? fracsToTemplate(rowFracs) : spec?.rows

  function onDrop(slotIndex: number, ev: React.DragEvent<HTMLDivElement>) {
    ev.preventDefault()
    const raw = ev.dataTransfer.getData(DRAG_MIME) || ev.dataTransfer.getData("text/plain")
    if (!raw) return
    if (!(raw in CARD_TYPE_META)) return
    const nextType = raw as CardType
    if (isLayoutType(nextType)) return
    setSlotCards((prev) => ({ ...prev, [slotIndex]: nextType }))
  }

  const header = spec?.header
  const [headerText, setHeaderText] = useState(() => header?.label ?? "")

  return (
    <div className="flex h-full min-h-0 flex-col gap-2 overflow-hidden">
      {header && (
        <div
          className="flex shrink-0 items-center border border-dashed border-border px-3"
          style={{ height: header.height ?? "40px", borderColor: "#55555555" }}
        >
          <input
            type="text"
            value={headerText}
            onChange={(e) => setHeaderText(e.target.value)}
            placeholder={header.note}
            className="min-w-0 flex-1 bg-transparent text-[11px] font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      )}
      <div
        ref={gridRef}
        className={spec ? "relative grid min-h-0 flex-1 gap-2 overflow-hidden" : `relative grid min-h-0 flex-1 gap-2 overflow-hidden ${cfg.className}`}
        style={spec ? { gridTemplateColumns: gridCols, gridTemplateRows: gridRows } : undefined}
      >
        {cells.map((slotIndex) => {
          const panel = spec?.panels[slotIndex]
          const cardType = slotCards[slotIndex]
          return (
            <div
              key={slotIndex}
              onDragOver={(ev) => {
                ev.preventDefault()
                ev.dataTransfer.dropEffect = "copy"
              }}
              onDrop={(ev) => onDrop(slotIndex, ev)}
              className={`relative z-[2] h-full min-h-0 border border-dashed border-border p-1.5 ${cfg.slotClasses?.[slotIndex] ?? ""}`}
              style={{
                gridColumn: panel?.col,
                gridRow: panel?.row,
                borderColor: panel?.accent ? `${panel.accent}55` : undefined,
              }}
            >
              {cardType ? (
                <div className="flex h-full min-h-0 flex-col overflow-hidden border border-border bg-background p-1.5">
                  <div className="mb-1 flex shrink-0 items-center justify-between gap-1">
                    <span className="truncate text-[10px] font-medium text-foreground">
                      {panel?.label ?? CARD_TYPE_META[cardType].label}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSlotCards((prev) => {
                        const next = { ...prev }
                        delete next[slotIndex]
                        return next
                      })}
                      className="rounded border border-border px-1 text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-auto">
                    <CardTypePreview cardType={cardType} content={getFallbackContent(cardType)} />
                  </div>
                </div>
              ) : (
                <div className="flex h-full min-h-[110px] flex-col items-center justify-center px-2 text-center">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: panel?.accent ?? "var(--muted-foreground)" }}
                  >
                    {panel?.label ?? `Slot ${slotIndex + 1}`}
                  </span>
                  <span className="mt-1 text-[10px] text-muted-foreground">{panel?.note ?? "Drop a card here"}</span>
                </div>
              )}
            </div>
          )
        })}

        {/* Inner column divider handles — only between pure-fr tracks */}
        {colFracs && colFracs.slice(0, -1).map((_, i) => (
          <ResizeHandle
            key={`col-${i}`}
            axis="col"
            dividerIndex={i}
            fractions={colFracs}
            containerRef={gridRef}
            onUpdate={setColFracs}
            onDragStart={() => setDraggingKey(`col-${i}`)}
            onDragEnd={() => setDraggingKey(null)}
            isActiveDrag={draggingKey === `col-${i}`}
            anyDragging={draggingKey !== null}
            computeMinFracs={(px) =>
              computeMinFracsForDivider("col", i, px, spec?.panels ?? [], slotCards)
            }
          />
        ))}

        {/* Inner row divider handles — only between pure-fr tracks */}
        {rowFracs && rowFracs.slice(0, -1).map((_, i) => (
          <ResizeHandle
            key={`row-${i}`}
            axis="row"
            dividerIndex={i}
            fractions={rowFracs}
            containerRef={gridRef}
            onUpdate={setRowFracs}
            onDragStart={() => setDraggingKey(`row-${i}`)}
            onDragEnd={() => setDraggingKey(null)}
            isActiveDrag={draggingKey === `row-${i}`}
            anyDragging={draggingKey !== null}
            computeMinFracs={(px) =>
              computeMinFracsForDivider("row", i, px, spec?.panels ?? [], slotCards)
            }
          />
        ))}
      </div>
    </div>
  )
}
