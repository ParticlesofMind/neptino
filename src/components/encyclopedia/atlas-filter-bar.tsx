"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getNarrowForBroad, getDetailedForNarrow } from "@/data/isced-f-2013"

// ─── Taxonomy (sort-by drilldown) ─────────────────────────────────────────────

const TAXONOMY = {
  entities: {
    label: "Entity",
    color: "#60a5fa",
    layerParam: null as string | null,
    items: [
      { name: "Concept",     children: ["Theory", "Theorem", "Law", "Principle", "Definition", "Model"] },
      { name: "Process",     children: ["Procedure", "Technique", "Algorithm", "Cycle", "Method", "Reaction"] },
      { name: "Instance",    children: ["Example", "Case Study", "Specimen", "Record"] },
      { name: "Person",      children: ["Individual", "Collective"] },
      { name: "State",       children: ["Physical State", "Psychological State", "Social State", "Health State"] },
      { name: "Time",        children: ["Event", "Period", "Epoch"] },
      { name: "Environment", children: ["Place", "Organism", "Matter"] },
      { name: "Work",        children: ["Text", "Artwork", "Musical Work", "Artifact"] },
      { name: "Technology",  children: ["Instrument", "Machine", "System", "Material Technology"] },
      { name: "Institution", children: ["Political Body", "Educational Body", "Religious Body", "Economic Body", "Cultural Body"] },
      { name: "Movement",    children: ["Intellectual", "Artistic", "Political", "Social"] },
    ],
  },
  media: {
    label: "Media",
    color: "#f472b6",
    layerParam: "2" as string | null,
    items: [
      { name: "Text",      children: ["Primary Source", "Secondary Source", "Reference", "Annotation"] },
      { name: "Image",     children: ["Photograph", "Illustration", "Diagram", "Chart", "Map Image"] },
      { name: "Audio",     children: ["Speech", "Music", "Natural Sound", "Narration"] },
      { name: "Video",     children: ["Documentary Clip", "Lecture Recording", "Demonstration", "Animation", "Archival Footage"] },
      { name: "Dataset",   children: ["Statistical Data", "Geospatial Data", "Time Series", "Genomic Data", "Economic Data"] },
      { name: "3D Model",  children: ["Static Model", "Interactive Model", "Scan"] },
    ],
  },
  products: {
    label: "Product",
    color: "#34d399",
    layerParam: "3" as string | null,
    items: [
      { name: "Map",         children: ["Geographic Map", "Thematic Map", "Concept Map", "Interactive Map"] },
      { name: "Timeline",    children: ["Chronological", "Comparative", "Geological", "Interactive"] },
      { name: "Simulation",  children: ["Passive", "Interactive", "Role Simulation"] },
      { name: "Game",        children: ["Knowledge Game", "Strategy Game", "Role-Play Game", "Puzzle Game"] },
      { name: "Documentary", children: ["Historical", "Scientific", "Social"] },
      { name: "Diagram",     children: ["Structural", "Process", "Comparative", "Hierarchical"] },
      { name: "Narrative",   children: ["Historical Narrative", "Scientific Narrative", "Annotated Work"] },
      { name: "Profile",     children: ["Person Profile", "Place Profile", "Institution Profile", "Species Profile", "Work Profile"] },
    ],
  },
} as const

type CatKey = keyof typeof TAXONOMY
const CATEGORY_KEYS: CatKey[] = ["entities", "media", "products"]

function layerToCat(layer: string | null): CatKey {
  if (layer === "2") return "media"
  if (layer === "3") return "products"
  return "entities"
}

// ─── Era labels ───────────────────────────────────────────────────────────────

const ERA_LABELS: Record<string, string> = {
  ancient:        "Ancient",
  "early-modern": "Early Modern",
  modern:         "Modern",
  contemporary:   "Contemporary",
}

const ERA_RANGE_LABELS: Record<string, string> = {
  ancient:        "pre-500 CE",
  "early-modern": "1500–1800",
  modern:         "1800–1945",
  contemporary:   "1945–today",
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type Props = {
  queryText:            string
  domainOptions:        string[]       // broad ISCED-F domain labels
  selectedDomain:       string | null
  selectedDomainNarrow: string | null  // 3-digit code e.g. "031"
  selectedDomainDetail: string | null  // 4-digit code e.g. "0311"
  selectedType:         string | null  // sort-by top item
  selectedSubtype:      string | null  // sort-by sub item
  selectedLayer:        string | null  // null=entities "2"=media "3"=products
  selectedMediaType:    string | null  // preserved in URL
  displayMode:          string         // preserved in URL
  selectedEra:          string | null
  eraOptions:           string[]       // available era slugs from DB
  selectedOrder:        string | null  // "asc" (default) | "desc"
}

// ─── Open panel state ──────────────────────────────────────────────────────

type OpenPanel = "broad" | "narrow" | "detail" | "sort" | null

// ─── CSS ──────────────────────────────────────────────────────────────────────

const STYLES = `
  .afb-pill {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 6px 13px; border-radius: 5px; flex-shrink: 0;
    border: 1px solid var(--atlas-border);
    cursor: pointer; transition: all 0.12s;
    background: transparent; white-space: nowrap;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
    color: var(--atlas-text-dim);
  }
  .afb-pill:hover { border-color: var(--atlas-border-hover); background: var(--atlas-bg-elevated); }
  .afb-pill.afb-active { background: var(--atlas-bg-elevated); color: var(--atlas-text); }

  .afb-era-pill {
    display: inline-flex; align-items: center; gap: 3px;
    padding: 4px 10px; border-radius: 20px; flex-shrink: 0;
    border: 1px solid var(--atlas-border);
    cursor: pointer; transition: all 0.12s;
    background: transparent; white-space: nowrap;
    font-family: 'JetBrains Mono', ui-monospace, monospace;
    font-size: 10px; letter-spacing: 0.04em; color: var(--atlas-text-dim);
  }
  .afb-era-pill:hover { border-color: var(--atlas-border-hover); color: var(--atlas-text); }
  .afb-era-pill.afb-era-active {
    border-color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
    color: var(--primary);
  }

  .afb-mini-panel {
    position: fixed;
    min-width: 240px; max-width: 340px;
    background: var(--atlas-bg-elevated);
    border: 1px solid var(--atlas-border);
    border-radius: 8px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.12);
    z-index: 9999; overflow: hidden;
    animation: afbIn 0.13s ease;
  }
  .afb-mini-panel-item {
    display: flex; align-items: center; gap: 8px;
    padding: 7px 12px; cursor: pointer; transition: background 0.08s;
    font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 11px;
    color: var(--atlas-text-dim);
  }
  .afb-mini-panel-item:hover { background: var(--atlas-bg); color: var(--atlas-text); }
  .afb-mini-panel-item.afb-item-active { color: var(--atlas-text); }

  .afb-sort-panel {
    position: absolute; left: 0; right: 0; top: 100%;
    background: var(--atlas-bg-elevated);
    border: 1px solid var(--atlas-border);
    border-radius: 0 0 8px 8px;
    overflow: hidden; box-shadow: 0 16px 48px rgba(0,0,0,0.1);
    z-index: 9999;
    animation: afbIn 0.13s ease;
  }
  .afb-sort-top-item {
    display: flex; align-items: center; justify-content: space-between;
    padding: 7px 14px; cursor: pointer;
    border-left: 2px solid transparent; transition: background 0.08s;
  }
  .afb-sort-top-item:hover, .afb-sort-top-item.afb-hov { background: var(--atlas-bg); }
  .afb-sort-sub-item {
    display: flex; align-items: center; gap: 8px;
    padding: 6px 14px; cursor: pointer; transition: background 0.08s;
  }
  .afb-sort-sub-item:hover { background: var(--atlas-bg); }

  @keyframes afbIn {
    from { opacity: 0; transform: translateY(-3px); }
    to   { opacity: 1; transform: none; }
  }
  .afb-chip-x {
    background: transparent; border: none; cursor: pointer;
    opacity: 0.45; font-size: 13px; line-height: 1; padding: 0;
    transition: opacity 0.1s;
  }
  .afb-chip-x:hover { opacity: 1; }
`

// ─── Component ────────────────────────────────────────────────────────────────

export function AtlasFilterBar({
  queryText,
  domainOptions,
  selectedDomain,
  selectedDomainNarrow,
  selectedDomainDetail,
  selectedType,
  selectedSubtype,
  selectedLayer,
  selectedMediaType,
  displayMode,
  selectedEra,
  eraOptions,
  selectedOrder,
}: Props) {
  const router = useRouter()

  // ── Local form state ────────────────────────────────────────────────────
  const [q, setQ]                       = useState(queryText)
  const [domain, setDomain]             = useState(selectedDomain ?? "all")
  const [domainNarrow, setDomainNarrow] = useState(selectedDomainNarrow ?? "all")
  const [domainDetail, setDomainDetail] = useState(selectedDomainDetail ?? "all")

  // ── Panel state ─────────────────────────────────────────────────────────
  const [openPanel, setOpenPanel]     = useState<OpenPanel>(null)
  const [iscedSearch, setIscedSearch] = useState("")
  const [hoveredTop, setHoveredTop]   = useState<string | null>(null)
  const [panelAnchor, setPanelAnchor] = useState<{ top: number; left: number } | null>(null)
  const containerRef                  = useRef<HTMLDivElement>(null)
  const broadWrapRef                  = useRef<HTMLDivElement>(null)
  const narrowWrapRef                 = useRef<HTMLDivElement>(null)
  const detailWrapRef                 = useRef<HTMLDivElement>(null)

  useEffect(() => { setIscedSearch("") }, [openPanel])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPanel(null)
        setHoveredTop(null)
        setPanelAnchor(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  useEffect(() => {
    const close = () => { setOpenPanel(null); setPanelAnchor(null) }
    window.addEventListener("scroll", close, true)
    return () => window.removeEventListener("scroll", close, true)
  }, [])

  function openIscedPanel(which: "broad" | "narrow" | "detail", ref: { current: HTMLDivElement | null }) {
    if (openPanel === which) { setOpenPanel(null); setPanelAnchor(null); return }
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setPanelAnchor({ top: rect.bottom + 4, left: rect.left })
    setOpenPanel(which)
  }

  // ── ISCED derived options ───────────────────────────────────────────────
  const narrowOptions = useMemo(
    () => (domain === "all" ? [] : getNarrowForBroad(domain)),
    [domain],
  )
  const detailOptions = useMemo(
    () => (domainNarrow === "all" ? [] : getDetailedForNarrow(domainNarrow)),
    [domainNarrow],
  )

  // ── Sort derived values ─────────────────────────────────────────────────
  const activeCat = layerToCat(selectedLayer)
  const cat       = TAXONOMY[activeCat]
  const topItems  = cat.items as ReadonlyArray<{ name: string; children: readonly string[] }>
  const subItems  = hoveredTop ? (topItems.find(i => i.name === hoveredTop)?.children ?? []) : []

  let sortChipLabel: string | null = null
  if (selectedSubtype)   sortChipLabel = `${selectedType} › ${selectedSubtype}`
  else if (selectedType) sortChipLabel = selectedType

  // ── URL builder ─────────────────────────────────────────────────────────
  function buildHref(overrides: Record<string, string | null>): string {
    const base: Record<string, string | null> = {
      q:             q || null,
      domain:        domain === "all" ? null : domain,
      domain_narrow: domainNarrow === "all" ? null : domainNarrow,
      domain_detail: domainDetail === "all" ? null : domainDetail,
      type:          selectedType,
      subtype:       selectedSubtype,
      layer:         selectedLayer,
      era:           selectedEra,
      order:         selectedOrder,
      media:         selectedMediaType,
      display:       displayMode !== "small" ? displayMode : null,
    }
    const merged = { ...base, ...overrides }
    const p = new URLSearchParams()
    p.set("page", "1")
    for (const [k, v] of Object.entries(merged)) {
      if (v) p.set(k, v)
    }
    return `/teacher/atlas?${p.toString()}`
  }

  function navigate(overrides: Record<string, string | null>) {
    router.push(buildHref(overrides))
    setOpenPanel(null)
  }

  // ── ISCED actions ───────────────────────────────────────────────────────
  function selectBroad(val: string) {
    setDomain(val)
    setDomainNarrow("all")
    setDomainDetail("all")
    navigate({ domain: val === "all" ? null : val, domain_narrow: null, domain_detail: null })
  }

  function selectNarrow(val: string) {
    setDomainNarrow(val)
    setDomainDetail("all")
    navigate({ domain_narrow: val === "all" ? null : val, domain_detail: null })
  }

  function selectDetail(val: string) {
    setDomainDetail(val)
    navigate({ domain_detail: val === "all" ? null : val })
  }

  // ── Sort category actions ───────────────────────────────────────────────
  function selectCategory(key: CatKey) {
    if (openPanel === "sort" && activeCat === key) {
      setOpenPanel(null)
    } else {
      setHoveredTop(null)
      setOpenPanel("sort")
      if (key !== activeCat) {
        router.push(buildHref({ layer: TAXONOMY[key].layerParam, type: null, subtype: null }))
      }
    }
  }

  function selectTopItem(itemName: string) {
    const isSel = selectedType === itemName
    navigate({ layer: TAXONOMY[activeCat].layerParam, type: isSel ? null : itemName, subtype: null })
  }

  function selectSubItem(subName: string) {
    const isSel = selectedSubtype === subName
    navigate({ layer: TAXONOMY[activeCat].layerParam, type: selectedType, subtype: isSel ? null : subName })
  }

  // ── Helpers ─────────────────────────────────────────────────────────────
  function pillClass(isActive: boolean) {
    return `afb-pill${isActive ? " afb-active" : ""}`
  }

  const dividerEl = (
    <div style={{ width: 1, height: 16, background: "var(--atlas-border)", flexShrink: 0 }} />
  )

  const monoLabel = (text: string) => (
    <span style={{
      fontFamily: "'JetBrains Mono', ui-monospace, monospace",
      fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase" as const,
      color: "var(--atlas-text-dim)", flexShrink: 0,
    }}>
      {text}
    </span>
  )

  // ── ISCED mini-panel ────────────────────────────────────────────────────
  function IscedPanel({
    which, items, activeValue, allLabel, onSelect, accentColor, anchor,
  }: {
    which: "broad" | "narrow" | "detail"
    items: Array<{ code: string; label: string }>
    activeValue: string
    allLabel: string
    onSelect: (val: string) => void
    accentColor: string
    anchor?: { top: number; left: number }
  }) {
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

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style>{STYLES}</style>
      <div ref={containerRef}>

        {/* ── Row 1: search · ISCED fields · sort by ───────────────────── */}
        <div style={{ position: "relative" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "var(--atlas-bg-elevated)",
          border: "1px solid var(--atlas-border)",
          borderRadius: 8,
          padding: "9px 14px",
          transition: "border-radius 0.12s",
          flexWrap: "nowrap", overflowX: "auto",
        }}>

          {/* Search */}
          <form
            style={{ display: "flex", flex: "0 0 auto" }}
            onSubmit={e => { e.preventDefault(); navigate({}) }}
          >
            <div style={{ position: "relative" }}>
              <svg
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--atlas-text-dim)", pointerEvents: "none" }}
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search…"
                style={{
                  width: 260, borderRadius: 6,
                  border: "1px solid var(--atlas-border)",
                  background: "var(--atlas-bg)",
                  padding: "6px 12px 6px 32px",
                  fontSize: 13, color: "var(--atlas-text)", outline: "none",
                  transition: "border-color 0.12s",
                }}
                onFocus={e  => { e.currentTarget.style.borderColor = "var(--primary)" }}
                onBlur={e   => { e.currentTarget.style.borderColor = "var(--atlas-border)" }}
              />
            </div>
          </form>

          {dividerEl}

          {/* ISCED level 1 — broad field */}
          <div ref={broadWrapRef} style={{ flexShrink: 0 }}>
            <button
              type="button"
              className={pillClass(openPanel === "broad" || domain !== "all")}
              style={{ borderColor: (openPanel === "broad" || domain !== "all") ? "#a78bfa50" : undefined }}
              onClick={() => openIscedPanel("broad", broadWrapRef)}
            >
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", opacity: domain !== "all" ? 1 : 0.35, flexShrink: 0 }} />
              <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", color: domain !== "all" ? "#a78bfa" : undefined }}>
                {domain !== "all" ? domain : "Field"}
              </span>
            </button>
            {openPanel === "broad" && (
              <IscedPanel
                which="broad"
                items={domainOptions.map(d => ({ code: d, label: d }))}
                activeValue={domain}
                allLabel="All fields"
                onSelect={selectBroad}
                accentColor="#a78bfa"
                anchor={panelAnchor ?? undefined}
              />
            )}
          </div>

          {/* ISCED level 2 — narrow field */}
          <div ref={narrowWrapRef} style={{ flexShrink: 0, opacity: domain === "all" ? 0.35 : 1, pointerEvents: domain === "all" ? "none" : "auto" }}>
            <button
              type="button"
              className={pillClass(openPanel === "narrow" || domainNarrow !== "all")}
              style={{ borderColor: (openPanel === "narrow" || domainNarrow !== "all") ? "#fb923c50" : undefined }}
              onClick={() => openIscedPanel("narrow", narrowWrapRef)}
            >
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fb923c", opacity: domainNarrow !== "all" ? 1 : 0.35, flexShrink: 0 }} />
              <span style={{ color: domainNarrow !== "all" ? "#fb923c" : undefined }}>
                {domainNarrow !== "all" ? domainNarrow : "Narrow"}
              </span>
            </button>
            {openPanel === "narrow" && (
              <IscedPanel
                which="narrow"
                items={narrowOptions.map(n => ({ code: n.code, label: n.label }))}
                activeValue={domainNarrow}
                allLabel="All narrow fields"
                onSelect={selectNarrow}
                accentColor="#fb923c"
                anchor={panelAnchor ?? undefined}
              />
            )}
          </div>

          {/* ISCED level 3 — detailed field */}
          <div ref={detailWrapRef} style={{ flexShrink: 0, opacity: domainNarrow === "all" ? 0.35 : 1, pointerEvents: domainNarrow === "all" ? "none" : "auto" }}>
            <button
              type="button"
              className={pillClass(openPanel === "detail" || domainDetail !== "all")}
              style={{ borderColor: (openPanel === "detail" || domainDetail !== "all") ? "#4ade8050" : undefined }}
              onClick={() => openIscedPanel("detail", detailWrapRef)}
            >
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", opacity: domainDetail !== "all" ? 1 : 0.35, flexShrink: 0 }} />
              <span style={{ color: domainDetail !== "all" ? "#4ade80" : undefined }}>
                {domainDetail !== "all" ? domainDetail : "Detail"}
              </span>
            </button>
            {openPanel === "detail" && (
              <IscedPanel
                which="detail"
                items={detailOptions.map(d => ({ code: d.code, label: d.label }))}
                activeValue={domainDetail}
                allLabel="All detailed fields"
                onSelect={selectDetail}
                accentColor="#4ade80"
                anchor={panelAnchor ?? undefined}
              />
            )}
          </div>

          {dividerEl}
          {monoLabel("Sort")}

          {/* Sort category pills */}
          {CATEGORY_KEYS.map(key => {
            const c         = TAXONOMY[key]
            const isOpen    = openPanel === "sort" && activeCat === key
            const isSelected = activeCat === key && (selectedType != null || selectedLayer != null)
            const highlight = isOpen || isSelected
            return (
              <button
                key={key}
                type="button"
                className={pillClass(highlight)}
                style={{ borderColor: highlight ? c.color + "50" : undefined }}
                onClick={() => selectCategory(key)}
              >
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.color, opacity: highlight ? 1 : 0.35, flexShrink: 0 }} />
                <span style={{ color: highlight ? c.color : undefined }}>{c.label}</span>
              </button>
            )
          })}

          {/* Active sort chip */}
          {sortChipLabel && (
            <>
              {dividerEl}
              <span style={{
                fontSize: 9, padding: "2px 7px 2px 8px", borderRadius: 3, whiteSpace: "nowrap",
                background: cat.color + "14", border: `1px solid ${cat.color}30`, color: cat.color,
                fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0,
              }}>
                {sortChipLabel}
                <button type="button" className="afb-chip-x" style={{ color: cat.color }} onClick={() => navigate({ type: null, subtype: null })}>×</button>
              </span>
            </>
          )}
        </div>

        {/* ── Sort drilldown panel ─────────────────────────────────────── */}
        {openPanel === "sort" && (
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
        )}
        </div>{/* end relative Row 1 wrapper */}

        {/* ── Row 2: era · order ────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>

          {monoLabel("Era")}

          {/* Any era */}
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

      </div>
    </>
  )
}
