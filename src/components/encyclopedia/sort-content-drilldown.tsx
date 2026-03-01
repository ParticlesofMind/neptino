"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { TAXONOMY, CATEGORY_KEYS, layerToCat, type CatKey } from "./atlas-taxonomy"

// ─── Component ────────────────────────────────────────────────────────────────

export function SortContentDrilldown() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const layer    = searchParams.get("layer")
  const typeParam = searchParams.get("type")
  const subtype  = searchParams.get("subtype")

  const activeCat  = layerToCat(layer)
  const cat        = TAXONOMY[activeCat]
  const topItems   = cat.items as ReadonlyArray<{ name: string; children: readonly string[] }>

  // Whether any sort filter is active
  const hasLayer   = layer != null
  const hasType    = typeParam != null
  const hasSub     = subtype != null

  // Build visible chips from URL state
  type Chip = { key: string; label: string; color: string; clearParams: Record<string, string | null> }
  const chips: Chip[] = []
  if (hasLayer || hasType || hasSub) {
    if (hasType && hasSub) {
      chips.push({
        key: "sub",
        label: `${typeParam} › ${subtype}`,
        color: cat.color,
        clearParams: { subtype: null },
      })
    } else if (hasType) {
      chips.push({
        key: "type",
        label: typeParam!,
        color: cat.color,
        clearParams: { type: null, subtype: null },
      })
    } else if (hasLayer) {
      chips.push({
        key: "layer",
        label: cat.label,
        color: cat.color,
        clearParams: { layer: null },
      })
    }
  }

  const hasFilters = chips.length > 0

  // Panel state
  const [open, setOpen]           = useState(false)
  const [hoveredTop, setHoveredTop] = useState<string | null>(null)
  const containerRef              = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setHoveredTop(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // ─── Navigation helpers ────────────────────────────────────────────────────

  function buildHref(overrides: Record<string, string | null>) {
    const p = new URLSearchParams(searchParams.toString())
    p.set("page", "1")
    p.delete("item")
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) p.delete(k)
      else p.set(k, v)
    }
    return `/teacher/atlas?${p.toString()}`
  }

  function navigate(overrides: Record<string, string | null>) {
    router.push(buildHref(overrides))
  }

  function selectCategory(key: CatKey) {
    const newLayer = TAXONOMY[key].layerParam
    if (open && activeCat === key) {
      setOpen(false)
    } else {
      setHoveredTop(null)
      setOpen(true)
    }
    // Only navigate if the category actually changes
    if (key !== activeCat) {
      navigate({ layer: newLayer, type: null, subtype: null })
    }
  }

  function selectTopItem(itemName: string) {
    const alreadySelected = typeParam === itemName
    navigate({
      layer: TAXONOMY[activeCat].layerParam,
      type: alreadySelected ? null : itemName,
      subtype: null,
    })
  }

  function selectSubItem(subName: string) {
    const alreadySelected = subtype === subName
    navigate({
      layer: TAXONOMY[activeCat].layerParam,
      type: typeParam,
      subtype: alreadySelected ? null : subName,
    })
  }

  function clearAll() {
    navigate({ layer: null, type: null, subtype: null })
    setOpen(false)
  }

  const subItems = hoveredTop
    ? (topItems.find((i) => i.name === hoveredTop)?.children ?? [])
    : []

  return (
    <>
      <style>{`
        .scd-top-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 8px 14px; cursor: pointer;
          border-left: 2px solid transparent;
          transition: background 0.1s;
        }
        .scd-top-item:hover, .scd-top-item.scd-hov {
          background: var(--atlas-bg-elevated);
        }
        .scd-sub-item {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 14px; cursor: pointer;
          transition: background 0.1s;
        }
        .scd-sub-item:hover {
          background: var(--atlas-bg-elevated);
        }
        .scd-chip-x {
          background: transparent; border: none; cursor: pointer;
          color: inherit; opacity: 0.45; font-size: 13px; line-height: 1;
          padding: 0; transition: opacity 0.12s;
        }
        .scd-chip-x:hover { opacity: 1; }
        .scd-cat-pill {
          display: flex; align-items: center; gap: 5px;
          padding: 5px 11px; border-radius: 4px;
          border: 1px solid var(--atlas-border);
          cursor: pointer; transition: all 0.12s;
          background: transparent; white-space: nowrap;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .scd-cat-pill:hover {
          border-color: var(--atlas-border-hover);
          background: var(--atlas-bg-elevated);
        }
        .scd-cat-pill.scd-active {
          background: var(--atlas-bg-elevated);
        }
        .scd-panel {
          position: absolute; top: calc(100% + 1px); left: 0;
          background: var(--atlas-bg-elevated);
          border: 1px solid var(--atlas-border);
          border-top: none;
          border-radius: 0 0 8px 8px;
          overflow: hidden;
          box-shadow: 0 16px 48px rgba(0,0,0,0.12);
          z-index: 100; width: 100%;
          animation: scdIn 0.14s ease;
        }
        @keyframes scdIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: none; }
        }
        .scd-panel::-webkit-scrollbar { width: 3px; }
        .scd-panel::-webkit-scrollbar-thumb { background: var(--atlas-border); border-radius: 2px; }
      `}</style>

      <div style={{ position: "relative" }} ref={containerRef}>

        {/* ── Trigger bar ─────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", alignItems: "center", gap: 6,
          background: "var(--atlas-bg-elevated)",
          border: `1px solid ${open ? "var(--atlas-border-hover)" : "var(--atlas-border)"}`,
          borderRadius: open ? "6px 6px 0 0" : 6,
          padding: "7px 10px",
          transition: "border-color 0.12s",
          borderBottom: open ? `1px solid var(--atlas-bg-elevated)` : undefined,
        }}>

          {/* Label */}
          <span style={{
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            fontSize: 9, color: "var(--atlas-text-dim)",
            letterSpacing: "0.1em", textTransform: "uppercase",
            flexShrink: 0, marginRight: 2,
          }}>
            Sort by
          </span>

          {/* Category pills */}
          {CATEGORY_KEYS.map((key) => {
            const c = TAXONOMY[key]
            const isActive = open && activeCat === key
            const isSelected = !open && activeCat === key && hasFilters
            return (
              <button
                key={key}
                type="button"
                className={`scd-cat-pill${isActive || isSelected ? " scd-active" : ""}`}
                onClick={() => selectCategory(key)}
                style={{ borderColor: (isActive || isSelected) ? c.color + "50" : undefined }}
              >
                <div style={{
                  width: 5, height: 5, borderRadius: "50%",
                  background: c.color,
                  opacity: (isActive || isSelected) ? 1 : 0.4,
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 10, letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: (isActive || isSelected) ? "var(--atlas-text)" : "var(--atlas-text-dim)",
                  transition: "color 0.12s",
                }}>
                  {c.label}
                </span>
              </button>
            )
          })}

          {/* Divider */}
          {hasFilters && (
            <div style={{ width: 1, height: 18, background: "var(--atlas-border)", margin: "0 4px", flexShrink: 0 }} />
          )}

          {/* Active chips */}
          {hasFilters && (
            <div style={{ display: "flex", gap: 4, flex: 1, overflow: "hidden", alignItems: "center" }}>
              {chips.map((chip) => (
                <span key={chip.key} style={{
                  fontSize: 9, padding: "2px 7px 2px 8px", borderRadius: 3,
                  whiteSpace: "nowrap",
                  background: chip.color + "14",
                  border: `1px solid ${chip.color}30`,
                  color: chip.color,
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  {chip.label}
                  <button
                    type="button"
                    className="scd-chip-x"
                    onClick={(e) => { e.stopPropagation(); navigate(chip.clearParams) }}
                    style={{ color: chip.color }}
                  >
                    ×
                  </button>
                </span>
              ))}
              <button
                type="button"
                onClick={clearAll}
                style={{
                  marginLeft: "auto", background: "transparent", border: "none",
                  cursor: "pointer", fontSize: 9,
                  color: "var(--atlas-text-dim)",
                  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--atlas-text)" }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--atlas-text-dim)" }}
              >
                clear all
              </button>
            </div>
          )}
        </div>

        {/* ── Panel ───────────────────────────────────────────────────────── */}
        {open && (
          <div className="scd-panel">
            <div style={{ display: "flex", borderTop: `1px solid var(--atlas-border)` }}>

              {/* Col 1 — types */}
              <div style={{
                width: 200, borderRight: `1px solid var(--atlas-border)`,
                overflowY: "auto", maxHeight: 300,
              }}>
                <div style={{
                  padding: "6px 14px 5px",
                  borderBottom: `1px solid var(--atlas-border)`,
                  position: "sticky", top: 0,
                  background: "var(--atlas-bg-elevated)",
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: 8, color: cat.color,
                    letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    {cat.label} Type
                  </span>
                </div>
                {topItems.map((item) => {
                  const sel = typeParam === item.name
                  const hov = hoveredTop === item.name
                  return (
                    <div
                      key={item.name}
                      className={`scd-top-item${hov ? " scd-hov" : ""}`}
                      style={{ borderLeftColor: hov ? cat.color : "transparent" }}
                      onMouseEnter={() => setHoveredTop(item.name)}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                          background: sel ? cat.color : "transparent",
                          border: `1px solid ${sel ? cat.color : "var(--atlas-border-hover)"}`,
                          transition: "all 0.1s",
                        }} />
                        <span style={{
                          fontFamily: "Georgia, 'Times New Roman', serif",
                          fontSize: 13,
                          color: hov ? "var(--atlas-text)" : sel ? cat.color : "var(--atlas-text-dim)",
                        }}>
                          {item.name}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        {item.children.length > 0 && (
                          <span style={{ fontSize: 8, color: "var(--atlas-text-dim)" }}>›</span>
                        )}
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); selectTopItem(item.name) }}
                          onKeyDown={(e) => e.key === "Enter" && selectTopItem(item.name)}
                          style={{
                            fontSize: 9, padding: "1px 6px", borderRadius: 2, cursor: "pointer",
                            background: sel ? cat.color + "20" : "transparent",
                            border: `1px solid ${sel ? cat.color + "40" : "var(--atlas-border)"}`,
                            color: sel ? cat.color : "var(--atlas-text-dim)",
                            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                            transition: "all 0.1s",
                          }}
                        >
                          {sel ? "✓" : "+"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Col 2 — subtypes */}
              <div style={{
                width: 200, borderRight: `1px solid var(--atlas-border)`,
                background: "var(--atlas-bg)", overflowY: "auto", maxHeight: 300,
              }}>
                <div style={{
                  padding: "6px 14px 5px",
                  borderBottom: `1px solid var(--atlas-border)`,
                  position: "sticky", top: 0,
                  background: "var(--atlas-bg)",
                }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: 8,
                    color: hoveredTop ? cat.color : "var(--atlas-text-dim)",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                  }}>
                    {hoveredTop ?? "—"}
                  </span>
                </div>
                {subItems.length === 0 ? (
                  <div style={{
                    padding: "14px", fontSize: 11,
                    color: "var(--atlas-text-dim)", opacity: 0.5,
                    fontStyle: "italic", fontFamily: "Georgia, serif",
                  }}>
                    hover a type to see subtypes
                  </div>
                ) : (
                  subItems.map((sub) => {
                    const sel = subtype === sub
                    return (
                      <div
                        key={sub}
                        className="scd-sub-item"
                        onClick={() => selectSubItem(sub)}
                      >
                        <div style={{
                          width: 5, height: 5, borderRadius: "50%", flexShrink: 0,
                          background: sel ? cat.color : "transparent",
                          border: `1px solid ${sel ? cat.color : "var(--atlas-border-hover)"}`,
                          transition: "all 0.1s",
                        }} />
                        <span style={{
                          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          fontSize: 11,
                          color: sel ? cat.color : "var(--atlas-text-dim)",
                          transition: "color 0.1s",
                        }}>
                          {sub}
                        </span>
                        {sel && (
                          <span style={{ marginLeft: "auto", fontSize: 9, color: cat.color }}>✓</span>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {/* Col 3 — active summary */}
              <div style={{
                flex: 1, background: "var(--atlas-bg)",
                overflowY: "auto", maxHeight: 300,
              }}>
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
                      <div style={{
                        padding: "7px 14px", display: "flex", alignItems: "center", gap: 6,
                      }}>
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
            </div>
          </div>
        )}
      </div>
    </>
  )
}
