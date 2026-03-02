interface Props {
  cat: { color: string; label: string }
  layer: string | null
  typeParam: string | null
  subtype: string | null
  hasFilters: boolean
  clearAll: () => void
  navigate: (overrides: Record<string, string | null>) => void
}

export function DrilldownActiveSummary({ cat, layer, typeParam, subtype, hasFilters, clearAll, navigate }: Props) {
  return (
    <div style={{ flex: 1, background: "var(--atlas-bg)", overflowY: "auto", maxHeight: 300 }}>
      <div style={{
        padding: "6px 14px 5px",
        borderBottom: `1px solid var(--atlas-border)`,
        position: "sticky", top: 0,
        background: "var(--atlas-bg)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{
          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          fontSize: 8, color: "var(--atlas-text-dim)",
          letterSpacing: "0.1em", textTransform: "uppercase",
        }}>
          Active
        </span>
        {hasFilters && (
          <button
            type="button"
            onClick={clearAll}
            style={{
              background: "transparent", border: "none",
              color: "var(--atlas-text-dim)", cursor: "pointer",
              fontSize: 8,
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            }}
          >
            clear all
          </button>
        )}
      </div>
      {!hasFilters ? (
        <div style={{
          padding: "14px", fontSize: 11,
          color: "var(--atlas-text-dim)", opacity: 0.35,
          fontStyle: "italic", fontFamily: "Georgia, serif",
        }}>
          none selected
        </div>
      ) : (
        <>
          {layer && (
            <div style={{
              padding: "7px 14px", display: "flex", alignItems: "center", gap: 6,
              borderBottom: `1px solid var(--atlas-border)`,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
              <span style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 9, color: "var(--atlas-text-dim)", flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {cat.label}
              </span>
              <button
                type="button"
                className="scd-chip-x"
                onClick={() => navigate({ layer: null, type: null, subtype: null })}
                style={{ color: "var(--atlas-text-dim)" }}
              >×</button>
            </div>
          )}
          {typeParam && (
            <div style={{
              padding: "7px 14px", display: "flex", alignItems: "center", gap: 6,
              borderBottom: `1px solid var(--atlas-border)`,
            }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
              <span style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 9, color: "var(--atlas-text-dim)", flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {typeParam}
              </span>
              <button
                type="button"
                className="scd-chip-x"
                onClick={() => navigate({ type: null, subtype: null })}
                style={{ color: "var(--atlas-text-dim)" }}
              >×</button>
            </div>
          )}
          {subtype && (
            <div style={{ padding: "7px 14px", display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: cat.color, opacity: 0.6, flexShrink: 0 }} />
              <span style={{
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                fontSize: 9, color: "var(--atlas-text-dim)", flex: 1,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {subtype}
              </span>
              <button
                type="button"
                className="scd-chip-x"
                onClick={() => navigate({ subtype: null })}
                style={{ color: "var(--atlas-text-dim)" }}
              >×</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
