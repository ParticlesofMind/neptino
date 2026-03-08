import type { CardType } from "@/components/coursebuilder/create/types"
import { LAYOUT_SYSTEM_SPECS } from "./layout-system-specs"

export function LayoutSpecThumbnail({ layoutType }: { layoutType: CardType }) {
  const spec = LAYOUT_SYSTEM_SPECS[layoutType]

  if (!spec) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
        No layout spec
      </div>
    )
  }

  return (
    <div
      className="grid h-full gap-1"
      style={{
        gridTemplateColumns: spec.cols,
        gridTemplateRows: spec.rows,
      }}
    >
      {spec.panels.map((panel) => (
        <div
          key={`${panel.label}-${panel.col ?? "auto"}-${panel.row ?? "auto"}`}
          className="min-h-0 overflow-hidden rounded-[4px] border px-1 py-0.5"
          style={{
            gridColumn: panel.col,
            gridRow: panel.row,
            borderColor: `${panel.accent}66`,
            backgroundColor: `${panel.accent}14`,
          }}
        >
          <p
            className="truncate text-[8px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: panel.accent }}
            title={panel.label}
          >
            {panel.label}
          </p>
        </div>
      ))}
    </div>
  )
}
