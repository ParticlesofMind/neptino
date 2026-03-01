import { ERA_LABELS, ERA_RANGE_LABELS } from "./atlas-filter-bar-styles"

interface AtlasEraOrderRowProps {
  selectedEra: string | null
  eraOptions: string[]
  selectedOrder: string | null
  navigate: (overrides: Record<string, string | null>) => void
}

export function AtlasEraOrderRow({
  selectedEra,
  eraOptions,
  selectedOrder,
  navigate,
}: AtlasEraOrderRowProps) {
  const monoLabel = (text: string) => (
    <span style={{
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" as const,
      color: "var(--atlas-text-dim)", flexShrink: 0,
    }}>
      {text}
    </span>
  )

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>

      {monoLabel("Era")}

      <button
        type="button"
        className={`afb-era-pill${!selectedEra ? " afb-era-active" : ""}`}
        onClick={() => navigate({ era: null })}
      >
        Any
      </button>

      {eraOptions.map(era => {
        const isActive = selectedEra === era
        return (
          <button
            key={era}
            type="button"
            className={`afb-era-pill${isActive ? " afb-era-active" : ""}`}
            onClick={() => navigate({ era })}
          >
            <span>{ERA_LABELS[era] ?? era}</span>
            {ERA_RANGE_LABELS[era] && (
              <span style={{ opacity: 0.5, marginLeft: 3, fontSize: 9 }}>· {ERA_RANGE_LABELS[era]}</span>
            )}
          </button>
        )
      })}

      <div style={{ width: 1, height: 14, background: "var(--atlas-border)", margin: "0 4px", flexShrink: 0 }} />

      {monoLabel("Order")}

      <button
        type="button"
        className={`afb-era-pill${!selectedOrder || selectedOrder === "asc" ? " afb-era-active" : ""}`}
        onClick={() => navigate({ order: null })}
      >
        A → Z
      </button>

      <button
        type="button"
        className={`afb-era-pill${selectedOrder === "desc" ? " afb-era-active" : ""}`}
        onClick={() => navigate({ order: "desc" })}
      >
        Z → A
      </button>
    </div>
  )
}
