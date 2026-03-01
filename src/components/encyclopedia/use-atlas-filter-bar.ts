"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { getNarrowForBroad, getDetailedForNarrow } from "@/data/isced-f-2013"
import { TAXONOMY, CATEGORY_KEYS, layerToCat, type CatKey } from "./atlas-taxonomy"
// Inline to avoid circular import (atlas-filter-bar.tsx ↔ use-atlas-filter-bar.ts)
type Props = {
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

type OpenPanel = "broad" | "narrow" | "detail" | "sort" | null

export function useAtlasFilterBar({
  queryText,
  selectedDomain,
  selectedDomainNarrow,
  selectedDomainDetail,
  selectedType,
  selectedSubtype,
  selectedLayer,
  selectedMediaType,
  displayMode,
  selectedEra,
  selectedOrder,
}: Props) {
  const router = useRouter()

  const [q, setQ]                       = useState(queryText)
  const [domain, setDomain]             = useState(selectedDomain ?? "all")
  const [domainNarrow, setDomainNarrow] = useState(selectedDomainNarrow ?? "all")
  const [domainDetail, setDomainDetail] = useState(selectedDomainDetail ?? "all")
  const [openPanel, setOpenPanel]       = useState<OpenPanel>(null)
  const [iscedSearch, setIscedSearch]   = useState("")
  const [hoveredTop, setHoveredTop]     = useState<string | null>(null)
  const [panelAnchor, setPanelAnchor]   = useState<{ top: number; left: number } | null>(null)

  const containerRef  = useRef<HTMLDivElement>(null)
  const broadWrapRef  = useRef<HTMLDivElement>(null)
  const narrowWrapRef = useRef<HTMLDivElement>(null)
  const detailWrapRef = useRef<HTMLDivElement>(null)

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

  const narrowOptions = useMemo(
    () => (domain === "all" ? [] : getNarrowForBroad(domain)),
    [domain],
  )
  const detailOptions = useMemo(
    () => (domainNarrow === "all" ? [] : getDetailedForNarrow(domainNarrow)),
    [domainNarrow],
  )

  const activeCat = layerToCat(selectedLayer)
  const cat       = TAXONOMY[activeCat]
  const topItems  = cat.items as ReadonlyArray<{ name: string; children: readonly string[] }>
  const subItems  = hoveredTop ? (topItems.find(i => i.name === hoveredTop)?.children ?? []) : []

  let sortChipLabel: string | null = null
  if (selectedSubtype)   sortChipLabel = `${selectedType} › ${selectedSubtype}`
  else if (selectedType) sortChipLabel = selectedType

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

  function openIscedPanel(which: "broad" | "narrow" | "detail", ref: { current: HTMLDivElement | null }) {
    if (openPanel === which) { setOpenPanel(null); setPanelAnchor(null); return }
    const rect = ref.current?.getBoundingClientRect()
    if (rect) setPanelAnchor({ top: rect.bottom + 4, left: rect.left })
    setOpenPanel(which)
  }

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

  function pillClass(isActive: boolean) {
    return `afb-pill${isActive ? " afb-active" : ""}`
  }

  return {
    q, setQ,
    domain, domainNarrow, domainDetail,
    openPanel, setOpenPanel,
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
  }
}
