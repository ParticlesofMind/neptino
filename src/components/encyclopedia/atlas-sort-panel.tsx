interface SortPanelProps {
  cat: { label: string; color: string }
  topItems: ReadonlyArray<{ name: string; children: readonly string[] }>
  subItems: readonly string[]
  selectedType: string | null
  selectedSubtype: string | null
  hoveredTop: string | null
  setHoveredTop: (val: string | null) => void
  selectTopItem: (name: string) => void
  selectSubItem: (name: string) => void
  navigate: (overrides: Record<string, string | null>) => void
}

export function AtlasSortPanel({
  cat, topItems, subItems,
  selectedType, selectedSubtype,
  hoveredTop, setHoveredTop,
  selectTopItem, selectSubItem,
  navigate,
}: SortPanelProps) {
  return (
    <div className="afb-sort-panel" onClick={e => e.stopPropagation()}>
      <div style={{ display: "flex", borderTop: "1px solid var(--atlas-border)" }}>

        {/* Col 1 — types */}
        <div style={{ width: 190, borderRight: "1px solid var(--atlas-border)", overflowY: "auto", maxHeight: 280, overscrollBehavior: "contain" }}>
          <div style={{ padding: "5px 14px 4px", borderBottom: "1px solid var(--atlas-border)", position: "sticky", top: 0, background: "var(--atlas-bg-elevated)" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: cat.color, letterSpacing: "0.1em", textTransform: "uppercase" }}>{cat.label} Type</span>
          </div>
          {topItems.map(item => {
            const sel = selectedType === item.name
            const hov = hoveredTop === item.name
            return (
              <div
                key={item.name}
                className={`afb-sort-top-item${hov ? " afb-hov" : ""}`}
                style={{ borderLeftColor: hov ? cat.color : "transparent" }}
                onMouseEnter={() => setHoveredTop(item.name)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", flexShrink: 0, background: sel ? cat.color : "transparent", border: `1px solid ${sel ? cat.color : "var(--atlas-border-hover)"}`, transition: "all 0.1s" }} />
                  <span style={{ fontFamily: "Georgia, serif", fontSize: 13, color: hov ? "var(--atlas-text)" : sel ? cat.color : "var(--atlas-text-dim)" }}>{item.name}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  {item.children.length > 0 && <span style={{ fontSize: 8, color: "var(--atlas-text-dim)" }}>›</span>}
                  <span
                    role="button" tabIndex={0}
                    onClick={e => { e.stopPropagation(); selectTopItem(item.name) }}
                    onKeyDown={e => e.key === "Enter" && selectTopItem(item.name)}
                    style={{ fontSize: 9, padding: "1px 6px", borderRadius: 2, cursor: "pointer", background: sel ? cat.color + "20" : "transparent", border: `1px solid ${sel ? cat.color + "40" : "var(--atlas-border)"}`, color: sel ? cat.color : "var(--atlas-text-dim)", fontFamily: "'JetBrains Mono', monospace", transition: "all 0.1s" }}
                  >
                    {sel ? "✓" : "+"}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Col 2 — subtypes */}
        <div style={{ width: 190, borderRight: "1px solid var(--atlas-border)", background: "var(--atlas-bg)", overflowY: "auto", maxHeight: 280, overscrollBehavior: "contain" }}>
          <div style={{ padding: "5px 14px 4px", borderBottom: "1px solid var(--atlas-border)", position: "sticky", top: 0, background: "var(--atlas-bg)" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: hoveredTop ? cat.color : "var(--atlas-text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{hoveredTop ?? "—"}</span>
          </div>
          {subItems.length === 0
            ? <div style={{ padding: 14, fontSize: 11, color: "var(--atlas-text-dim)", opacity: 0.5, fontStyle: "italic", fontFamily: "Georgia, serif" }}>hover a type</div>
            : subItems.map(sub => {
                const sel = selectedSubtype === sub
                return (
                  <div key={sub} className="afb-sort-sub-item" onClick={() => selectSubItem(sub)}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: sel ? cat.color : "transparent", border: `1px solid ${sel ? cat.color : "var(--atlas-border-hover)"}` }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: sel ? cat.color : "var(--atlas-text-dim)" }}>{sub}</span>
                    {sel && <span style={{ marginLeft: "auto", fontSize: 9, color: cat.color }}>✓</span>}
                  </div>
                )
              })
          }
        </div>

        {/* Col 3 — active summary */}
        <div style={{ flex: 1, background: "var(--atlas-bg)", overflowY: "auto", maxHeight: 280, overscrollBehavior: "contain" }}>
          <div style={{ padding: "5px 14px 4px", borderBottom: "1px solid var(--atlas-border)", position: "sticky", top: 0, background: "var(--atlas-bg)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 8, color: "var(--atlas-text-dim)", letterSpacing: "0.1em", textTransform: "uppercase" }}>Active</span>
            {(selectedType || selectedSubtype) && (
              <button type="button" onClick={() => navigate({ type: null, subtype: null })} style={{ background: "transparent", border: "none", color: "var(--atlas-text-dim)", cursor: "pointer", fontSize: 8, fontFamily: "'JetBrains Mono', monospace" }}>clear</button>
            )}
          </div>
          {!(selectedType || selectedSubtype)
            ? <div style={{ padding: 14, fontSize: 11, color: "var(--atlas-text-dim)", opacity: 0.35, fontStyle: "italic", fontFamily: "Georgia, serif" }}>none selected</div>
            : <>
                {selectedType && (
                  <div style={{ padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, borderBottom: "1px solid var(--atlas-border)" }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: cat.color, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--atlas-text-dim)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedType}</span>
                    <button type="button" className="afb-chip-x" style={{ color: "var(--atlas-text-dim)" }} onClick={() => navigate({ type: null, subtype: null })}>×</button>
                  </div>
                )}
                {selectedSubtype && (
                  <div style={{ padding: "6px 14px", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: cat.color, opacity: 0.6, flexShrink: 0 }} />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 9, color: "var(--atlas-text-dim)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedSubtype}</span>
                    <button type="button" className="afb-chip-x" style={{ color: "var(--atlas-text-dim)" }} onClick={() => navigate({ subtype: null })}>×</button>
                  </div>
                )}
              </>
          }
        </div>
      </div>
    </div>
  )
}
