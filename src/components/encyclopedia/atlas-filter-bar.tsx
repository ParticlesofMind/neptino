"use client"

import { AtlasIscedPanel } from "./atlas-isced-panel"
import { ATLAS_FILTER_BAR_STYLES } from "./atlas-filter-bar-styles"
import { useAtlasFilterBar } from "./use-atlas-filter-bar"
import { AtlasSortPanel } from "./atlas-sort-panel"
import { AtlasEraOrderRow } from "./atlas-era-order-row"
import { TAXONOMY } from "./atlas-taxonomy"

// ─── Types ────────────────────────────────────────────────────────────────────

export type Props = {
  queryText:            string
  domainOptions:        string[]
  selectedDomain:       string | null
  selectedDomainNarrow: string | null
  selectedDomainDetail: string | null
  selectedType:         string | null
  selectedSubtype:      string | null
  selectedLayer:        string | null
  selectedMediaType:    string | null
  displayMode:          string
  selectedEra:          string | null
  eraOptions:           string[]
  selectedOrder:        string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AtlasFilterBar(props: Props) {
  const {
    q, setQ,
    domain, domainNarrow, domainDetail,
    openPanel,
    iscedSearch, setIscedSearch,
    hoveredTop, setHoveredTop,
    panelAnchor,
    containerRef, broadWrapRef, narrowWrapRef, detailWrapRef,
    narrowOptions, detailOptions,
    activeCat, cat, topItems, subItems,
    sortChipLabel,
    navigate, openIscedPanel,
    selectBroad, selectNarrow, selectDetail,
    selectCategory, selectTopItem, selectSubItem,
    pillClass,
    CATEGORY_KEYS,
  } = useAtlasFilterBar(props)

  const { selectedType, selectedSubtype, selectedEra, eraOptions, selectedOrder, domainOptions } = props

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

  return (
    <>
      <style>{ATLAS_FILTER_BAR_STYLES}</style>
      <div ref={containerRef}>

        {/* ── Row 1: search · ISCED fields · sort by ───────────────────── */}
        <div style={{ position: "relative" }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "var(--atlas-bg-elevated)",
            border: "1px solid var(--atlas-border)",
            borderRadius: 8, padding: "9px 14px", transition: "border-radius 0.12s",
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
                  type="text" value={q} onChange={e => setQ(e.target.value)} placeholder="Search…"
                  style={{ width: 260, borderRadius: 6, border: "1px solid var(--atlas-border)", background: "var(--atlas-bg)", padding: "6px 12px 6px 32px", fontSize: 13, color: "var(--atlas-text)", outline: "none", transition: "border-color 0.12s" }}
                  onFocus={e  => { e.currentTarget.style.borderColor = "var(--primary)" }}
                  onBlur={e   => { e.currentTarget.style.borderColor = "var(--atlas-border)" }}
                />
              </div>
            </form>

            {dividerEl}

            {/* ISCED level 1 — broad field */}
            <div ref={broadWrapRef} style={{ flexShrink: 0 }}>
              <button type="button" className={pillClass(openPanel === "broad" || domain !== "all")} style={{ borderColor: (openPanel === "broad" || domain !== "all") ? "#a78bfa50" : undefined }} onClick={() => openIscedPanel("broad", broadWrapRef)}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#a78bfa", opacity: domain !== "all" ? 1 : 0.35, flexShrink: 0 }} />
                <span style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", color: domain !== "all" ? "#a78bfa" : undefined }}>{domain !== "all" ? domain : "Field"}</span>
              </button>
              {openPanel === "broad" && <AtlasIscedPanel which="broad" items={domainOptions.map(d => ({ code: d, label: d }))} activeValue={domain} allLabel="All fields" onSelect={selectBroad} accentColor="#a78bfa" anchor={panelAnchor ?? undefined} iscedSearch={iscedSearch} setIscedSearch={setIscedSearch} />}
            </div>

            {/* ISCED level 2 — narrow field */}
            <div ref={narrowWrapRef} style={{ flexShrink: 0, opacity: domain === "all" ? 0.35 : 1, pointerEvents: domain === "all" ? "none" : "auto" }}>
              <button type="button" className={pillClass(openPanel === "narrow" || domainNarrow !== "all")} style={{ borderColor: (openPanel === "narrow" || domainNarrow !== "all") ? "#fb923c50" : undefined }} onClick={() => openIscedPanel("narrow", narrowWrapRef)}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#fb923c", opacity: domainNarrow !== "all" ? 1 : 0.35, flexShrink: 0 }} />
                <span style={{ color: domainNarrow !== "all" ? "#fb923c" : undefined }}>{domainNarrow !== "all" ? domainNarrow : "Narrow"}</span>
              </button>
              {openPanel === "narrow" && <AtlasIscedPanel which="narrow" items={narrowOptions.map(n => ({ code: n.code, label: n.label }))} activeValue={domainNarrow} allLabel="All narrow fields" onSelect={selectNarrow} accentColor="#fb923c" anchor={panelAnchor ?? undefined} iscedSearch={iscedSearch} setIscedSearch={setIscedSearch} />}
            </div>

            {/* ISCED level 3 — detailed field */}
            <div ref={detailWrapRef} style={{ flexShrink: 0, opacity: domainNarrow === "all" ? 0.35 : 1, pointerEvents: domainNarrow === "all" ? "none" : "auto" }}>
              <button type="button" className={pillClass(openPanel === "detail" || domainDetail !== "all")} style={{ borderColor: (openPanel === "detail" || domainDetail !== "all") ? "#4ade8050" : undefined }} onClick={() => openIscedPanel("detail", detailWrapRef)}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#4ade80", opacity: domainDetail !== "all" ? 1 : 0.35, flexShrink: 0 }} />
                <span style={{ color: domainDetail !== "all" ? "#4ade80" : undefined }}>{domainDetail !== "all" ? domainDetail : "Detail"}</span>
              </button>
              {openPanel === "detail" && <AtlasIscedPanel which="detail" items={detailOptions.map(d => ({ code: d.code, label: d.label }))} activeValue={domainDetail} allLabel="All detailed fields" onSelect={selectDetail} accentColor="#4ade80" anchor={panelAnchor ?? undefined} iscedSearch={iscedSearch} setIscedSearch={setIscedSearch} />}
            </div>

            {dividerEl}
            {monoLabel("Sort")}

            {/* Sort category pills */}
            {CATEGORY_KEYS.map(key => {
              const c = TAXONOMY[key]
              const isOpen = openPanel === "sort" && activeCat === key
              const isSelected = activeCat === key && (selectedType != null || props.selectedLayer != null)
              const highlight = isOpen || isSelected
              return (
                <button key={key} type="button" className={pillClass(highlight)} style={{ borderColor: highlight ? c.color + "50" : undefined }} onClick={() => selectCategory(key)}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: c.color, opacity: highlight ? 1 : 0.35, flexShrink: 0 }} />
                  <span style={{ color: highlight ? c.color : undefined }}>{c.label}</span>
                </button>
              )
            })}

            {/* Active sort chip */}
            {sortChipLabel && (
              <>
                {dividerEl}
                <span style={{ fontSize: 9, padding: "2px 7px 2px 8px", borderRadius: 3, whiteSpace: "nowrap", background: cat.color + "14", border: `1px solid ${cat.color}30`, color: cat.color, fontFamily: "'JetBrains Mono', ui-monospace, monospace", display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  {sortChipLabel}
                  <button type="button" className="afb-chip-x" style={{ color: cat.color }} onClick={() => navigate({ type: null, subtype: null })}>×</button>
                </span>
              </>
            )}
          </div>

          {/* Sort drilldown panel */}
          {openPanel === "sort" && (
            <AtlasSortPanel
              cat={cat}
              topItems={topItems}
              subItems={subItems}
              selectedType={selectedType}
              selectedSubtype={selectedSubtype}
              hoveredTop={hoveredTop}
              setHoveredTop={setHoveredTop}
              selectTopItem={selectTopItem}
              selectSubItem={selectSubItem}
              navigate={navigate}
            />
          )}
        </div>

        {/* ── Row 2: era · order ────────────────────────────────────────── */}
        <AtlasEraOrderRow
          selectedEra={selectedEra}
          eraOptions={eraOptions}
          selectedOrder={selectedOrder}
          navigate={navigate}
        />

      </div>
    </>
  )
}
