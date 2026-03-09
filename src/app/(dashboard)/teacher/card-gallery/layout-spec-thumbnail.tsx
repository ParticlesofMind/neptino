import type { CardType } from "@/components/coursebuilder/create/types"
import { LAYOUT_SYSTEM_SPECS } from "./layout-system-specs"

/**
 * Converts a CSS grid template string (which may mix fr and px values) into a
 * thumbnail-friendly version using only fr units, preserving relative proportions.
 *
 * px values are treated as absolute sizes within referencePx total space.
 * Remaining space after px tracks is distributed proportionally among fr tracks.
 */
function toThumbnailTemplate(template: string, referencePx: number): string {
  const parts = template.trim().split(/\s+/)
  let totalPx = 0
  let totalFr = 0
  const parsed: Array<{ kind: "fr" | "px"; value: number }> = []

  for (const p of parts) {
    const fr = /^(\d+(?:\.\d+)?)fr$/.exec(p)
    const px = /^(\d+(?:\.\d+)?)px$/.exec(p)
    if (fr)      { const v = parseFloat(fr[1]); parsed.push({ kind: "fr", value: v }); totalFr += v }
    else if (px) { const v = parseFloat(px[1]); parsed.push({ kind: "px", value: v }); totalPx += v }
    else         { parsed.push({ kind: "fr", value: 1 }); totalFr += 1 }
  }

  // Ensure the fr tracks always get at least 15% of overall space so they're visible
  const remainingPx = Math.max(referencePx - totalPx, referencePx * 0.15)
  const safeFr = Math.max(totalFr, 1)

  const abs = parsed.map(({ kind, value }) =>
    kind === "fr" ? (value / safeFr) * remainingPx : value,
  )
  const total = abs.reduce((a, b) => a + b, 0)
  return abs.map((v) => `${Math.round((v / total) * 100)}fr`).join(" ")
}

// Mock content row — three progressively shorter lines representing card body text
function ContentMock({ accent }: { accent: string }) {
  return (
    <div className="mt-auto flex flex-col gap-px pt-1">
      <div className="h-px w-full rounded-sm" style={{ backgroundColor: `${accent}35` }} />
      <div className="h-px rounded-sm" style={{ width: "75%", backgroundColor: `${accent}25` }} />
      <div className="h-px rounded-sm" style={{ width: "55%", backgroundColor: `${accent}18` }} />
    </div>
  )
}

export function LayoutSpecThumbnail({ layoutType }: { layoutType: CardType }) {
  const spec = LAYOUT_SYSTEM_SPECS[layoutType]

  if (!spec) {
    return (
      <div
        className="flex w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 text-[10px] text-muted-foreground"
        style={{ aspectRatio: "4/3" }}
      >
        No layout spec
      </div>
    )
  }

  // Reference pixel dimensions match the sandbox preview frame
  const cols = toThumbnailTemplate(spec.cols, 640)
  const rows = toThumbnailTemplate(spec.rows, 400)

  return (
    <div
      className="flex w-full flex-col overflow-hidden rounded-lg border border-border bg-background"
      style={{ aspectRatio: "4/3" }}
    >
      {/* Card-level header strip (title bar above the layout grid) */}
      {spec.header && (
        <div
          className="flex shrink-0 items-center gap-1.5 border-b border-border/60 bg-muted/30 px-2"
          style={{ height: 14 }}
        >
          <div className="h-1 w-10 rounded-sm bg-muted-foreground/20" />
          <div className="h-1 w-7 rounded-sm bg-muted-foreground/12" />
        </div>
      )}

      {/* Layout grid */}
      <div
        className="min-h-0 flex-1 grid p-1 gap-1"
        style={{
          gridTemplateColumns: cols,
          gridTemplateRows: rows,
        }}
      >
        {spec.panels.map((panel, i) => (
          <div
            key={`${panel.label}-${i}`}
            className="min-h-0 overflow-hidden rounded-sm flex flex-col p-1"
            style={{
              gridColumn: panel.col,
              gridRow: panel.row,
              border: `1px solid ${panel.accent}50`,
              backgroundColor: `${panel.accent}12`,
            }}
          >
            {/* Panel label */}
            <p
              className="truncate font-semibold leading-none"
              style={{ fontSize: "7px", color: panel.accent, letterSpacing: "0.07em" }}
            >
              {panel.label.toUpperCase()}
            </p>
            {/* Panel note */}
            <p
              className="mt-0.5 truncate leading-none"
              style={{ fontSize: "6px", color: `${panel.accent}88` }}
            >
              {panel.note}
            </p>
            <ContentMock accent={panel.accent} />
          </div>
        ))}
      </div>
    </div>
  )
}
