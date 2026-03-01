"use client"

/** Extracted from AtlasFilterBar to fix the "component created during render" lint violation. */

export type AtlasIscedPanelProps = {
  which: "broad" | "narrow" | "detail"
  items: Array<{ code: string; label: string }>
  activeValue: string
  allLabel: string
  onSelect: (val: string) => void
  accentColor: string
  anchor?: { top: number; left: number }
  iscedSearch: string
  setIscedSearch: (val: string) => void
}

export function AtlasIscedPanel({
  which, items, activeValue, allLabel, onSelect, accentColor, anchor,
  iscedSearch, setIscedSearch,
}: AtlasIscedPanelProps) {
  const filtered = iscedSearch
    ? items.filter(i =>
        i.label.toLowerCase().includes(iscedSearch.toLowerCase()) ||
        i.code.toLowerCase().includes(iscedSearch.toLowerCase())
      )
    : items

  return (
    <div className="afb-mini-panel" style={{ minWidth: which === "broad" ? 220 : 280, top: anchor?.top, left: anchor?.left }}>
      <div style={{ padding: "7px 10px 6px", borderBottom: "1px solid var(--atlas-border)" }}>
        <input
          autoFocus
          type="text"
          value={iscedSearch}
          onChange={e => setIscedSearch(e.target.value)}
          placeholder="Filter…"
          style={{
            width: "100%", background: "var(--atlas-bg)",
            border: "1px solid var(--atlas-border)", borderRadius: 4,
            padding: "4px 8px", fontSize: 11,
            color: "var(--atlas-text)",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace", outline: "none",
          }}
        />
      </div>
      <div style={{ maxHeight: 260, overflowY: "auto", overscrollBehavior: "contain" }}>
        <div
          className={`afb-mini-panel-item${activeValue === "all" ? " afb-item-active" : ""}`}
          onClick={() => onSelect("all")}
        >
          <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: activeValue === "all" ? accentColor : "transparent", border: `1px solid ${activeValue === "all" ? accentColor : "var(--atlas-border-hover)"}` }} />
          <span style={{ fontStyle: "italic", opacity: 0.6 }}>{allLabel}</span>
        </div>
        {filtered.map(item => {
          const isSel = activeValue === item.code
          return (
            <div
              key={item.code}
              className={`afb-mini-panel-item${isSel ? " afb-item-active" : ""}`}
              style={{ color: isSel ? accentColor : undefined }}
              onClick={() => onSelect(item.code)}
            >
              <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, background: isSel ? accentColor : "transparent", border: `1px solid ${isSel ? accentColor : "var(--atlas-border-hover)"}` }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {which !== "broad" && <span style={{ opacity: 0.5, marginRight: 5 }}>{item.code}</span>}
                {item.label}
              </span>
              {isSel && <span style={{ marginLeft: "auto", fontSize: 9, color: accentColor }}>✓</span>}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ padding: "10px 12px", fontSize: 11, color: "var(--atlas-text-dim)", fontStyle: "italic" }}>
            No matches
          </div>
        )}
      </div>
    </div>
  )
}
