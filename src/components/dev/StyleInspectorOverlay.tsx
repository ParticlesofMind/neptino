"use client"

import { usePathname } from "next/navigation"
import {
  Brush,
  EyeOff,
  Minus,
  MousePointer2,
  Move,
  Plus,
  RotateCcw,
  Scissors,
  Type,
  Undo2,
  X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react"

type FontScope = "selected" | "page" | "global"

type LauncherPosition = {
  x: number | null
  y: number
}

type InspectorRect = {
  height: number
  left: number
  top: number
  width: number
}

type FontBaseline = {
  basePx: number
  inlinePriority: string
  inlineValue: string
}

type DisplayBaseline = {
  inlinePriority: string
  inlineValue: string
}

type HiddenEntryBase = {
  id: number
  label: string
  path: string
}

type ElementHiddenEntry = HiddenEntryBase & {
  kind: "element"
  selector: string
  tagName: string
  touched: Map<HTMLElement, DisplayBaseline>
}

type TextHiddenEntry = HiddenEntryBase & {
  kind: "text"
  occurrence: number
  selector: string
  text: string
}

type HiddenEntry = ElementHiddenEntry | TextHiddenEntry

type StoredHiddenEntry =
  | Omit<ElementHiddenEntry, "touched">
  | TextHiddenEntry

const INSPECTOR_ATTR = "data-style-inspector-root"
const HIDDEN_RULE_ID_ATTR = "data-style-inspector-hidden-rule-id"
const HIDDEN_TEXT_ATTR = "data-style-inspector-hidden-text"
const TEXT_SELECTION_ATTR = "data-style-inspector-text-selection"
const MIN_FONT_SIZE = 7
const FONT_STEP = 1
const STORAGE_KEY = "neptino-style-lab-hidden-rules-v1"

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isHTMLElement(value: EventTarget | Node | null): value is HTMLElement {
  return value instanceof HTMLElement
}

function isInspectorElement(element: Element | null): boolean {
  return Boolean(element?.closest(`[${INSPECTOR_ATTR}]`))
}

function cssEscape(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value)
  }

  return value.replace(/[^a-zA-Z0-9_-]/g, "\\$&")
}

function readRect(element: HTMLElement): InspectorRect {
  const rect = element.getBoundingClientRect()
  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  }
}

function hasDirectText(element: HTMLElement): boolean {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
  )
}

function isTextTarget(element: HTMLElement): boolean {
  if (isInspectorElement(element)) return false

  const tag = element.tagName.toLowerCase()
  if (["input", "textarea", "select", "button"].includes(tag)) return true
  if (["a", "blockquote", "caption", "code", "dd", "dt", "figcaption", "h1", "h2", "h3", "h4", "h5", "h6", "label", "legend", "li", "p", "pre", "small", "span", "strong", "td", "th"].includes(tag)) {
    return Boolean(element.textContent?.trim())
  }

  return hasDirectText(element)
}

function describeElement(element: HTMLElement): string {
  if (element.hasAttribute(TEXT_SELECTION_ATTR)) return "text selection"

  const tag = element.tagName.toLowerCase()
  const id = element.id ? `#${element.id}` : ""
  const className = Array.from(element.classList).slice(0, 2).map((item) => `.${item}`).join("")
  const text = element.textContent?.trim().replace(/\s+/g, " ").slice(0, 42)

  return [tag, id, className, text ? `"${text}"` : ""].filter(Boolean).join(" ")
}

function countOccurrences(value: string, search: string): number {
  if (!search) return 0

  let count = 0
  let index = value.indexOf(search)
  while (index !== -1) {
    count += 1
    index = value.indexOf(search, index + search.length)
  }
  return count
}

function textBeforeNode(root: Node, target: Node): string {
  let value = ""
  let found = false

  const visit = (node: Node) => {
    if (found) return
    if (node === target) {
      found = true
      return
    }

    if (node.nodeType === Node.TEXT_NODE) {
      value += node.textContent ?? ""
      return
    }

    node.childNodes.forEach(visit)
  }

  visit(root)
  return value
}

function getElementSelector(element: HTMLElement): string {
  if (element === document.body) return "body"

  const parts: string[] = []
  let current: HTMLElement | null = element

  while (current && current !== document.body) {
    const tagName = current.tagName.toLowerCase()

    if (current.id) {
      parts.unshift(`${tagName}#${cssEscape(current.id)}`)
      break
    }

    let part = tagName
    const parent: HTMLElement | null = current.parentElement
    if (parent) {
      const sameTagSiblings = Array.from(parent.children).filter((child) => child.tagName.toLowerCase() === tagName)
      if (sameTagSiblings.length > 1) {
        part += `:nth-of-type(${sameTagSiblings.indexOf(current) + 1})`
      }
    }

    parts.unshift(part)
    current = parent
  }

  return parts.length > 0 ? `body > ${parts.join(" > ")}` : "body"
}

function restoreDisplay(element: HTMLElement, baseline: DisplayBaseline): void {
  if (!element.isConnected) return
  if (baseline.inlineValue) {
    element.style.setProperty("display", baseline.inlineValue, baseline.inlinePriority)
  } else {
    element.style.removeProperty("display")
  }
}

function unwrapHiddenText(marker: HTMLElement): void {
  marker.replaceWith(document.createTextNode(marker.textContent ?? ""))
}

function toStoredHiddenEntry(entry: HiddenEntry): StoredHiddenEntry {
  if (entry.kind === "text") return entry

  return {
    id: entry.id,
    kind: entry.kind,
    label: entry.label,
    path: entry.path,
    selector: entry.selector,
    tagName: entry.tagName,
  }
}

function reviveStoredHiddenEntry(entry: StoredHiddenEntry): HiddenEntry {
  if (entry.kind === "text") return entry

  return {
    ...entry,
    touched: new Map(),
  }
}

function isStoredHiddenEntry(value: unknown): value is StoredHiddenEntry {
  if (!value || typeof value !== "object") return false

  const entry = value as Partial<StoredHiddenEntry>
  if (typeof entry.id !== "number" || typeof entry.label !== "string" || typeof entry.path !== "string") return false
  if (entry.kind === "text") {
    return typeof entry.selector === "string" && typeof entry.text === "string" && typeof entry.occurrence === "number"
  }
  if (entry.kind === "element") {
    return typeof entry.selector === "string" && typeof entry.tagName === "string"
  }
  return false
}

function readStoredHiddenEntries(): HiddenEntry[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return parsed.filter(isStoredHiddenEntry).map(reviveStoredHiddenEntry)
  } catch {
    return []
  }
}

function writeStoredHiddenEntries(entries: HiddenEntry[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.map(toStoredHiddenEntry)))
  } catch {
    // localStorage can be unavailable in private or constrained browser contexts.
  }
}

export function StyleInspectorOverlay() {
  const pathname = usePathname() ?? "/"
  const [open, setOpen] = useState(false)
  const [pickMode, setPickMode] = useState(false)
  const [scope, setScope] = useState<FontScope>("selected")
  const [launcherPosition, setLauncherPosition] = useState<LauncherPosition>({ x: null, y: 16 })
  const [selectedElement, setSelectedElement] = useState<HTMLElement | null>(null)
  const [selectedLabel, setSelectedLabel] = useState("No selection")
  const [selectedRect, setSelectedRect] = useState<InspectorRect | null>(null)
  const [hoverRect, setHoverRect] = useState<InspectorRect | null>(null)
  const [globalFontOffset, setGlobalFontOffset] = useState(0)
  const [pageFontOffsets, setPageFontOffsets] = useState<Record<string, number>>({})
  const [selectedFontOffset, setSelectedFontOffset] = useState(0)
  const [hiddenCount, setHiddenCount] = useState(0)

  const dragRef = useRef<{
    moved: boolean
    pointerId: number
    startX: number
    startY: number
    x: number
    y: number
  } | null>(null)
  const fontBaselinesRef = useRef(new Map<HTMLElement, FontBaseline>())
  const globalFontOffsetRef = useRef(0)
  const hiddenEntriesRef = useRef<HiddenEntry[]>([])
  const hideIdRef = useRef(0)
  const pageFontOffsetsRef = useRef<Record<string, number>>({})
  const pathnameRef = useRef(pathname)
  const selectedElementRef = useRef<HTMLElement | null>(null)
  const selectedFontOffsetsRef = useRef(new Map<HTMLElement, number>())

  const pageFontOffset = pageFontOffsets[pathname] ?? 0
  const activeFontOffset = scope === "global" ? globalFontOffset : scope === "page" ? pageFontOffset : selectedFontOffset

  const launcherStyle = useMemo(() => {
    if (launcherPosition.x === null) {
      return { right: 16, top: launcherPosition.y }
    }
    return { left: launcherPosition.x, top: launcherPosition.y }
  }, [launcherPosition])

  const panelStyle = useMemo(() => {
    if (typeof window === "undefined" || launcherPosition.x === null) {
      return { right: 16, top: launcherPosition.y + 44 }
    }

    return {
      left: clamp(launcherPosition.x - 284, 12, window.innerWidth - 348),
      top: clamp(launcherPosition.y + 44, 12, window.innerHeight - 468),
    }
  }, [launcherPosition])

  const ensureFontBaseline = useCallback((element: HTMLElement): FontBaseline | null => {
    const existing = fontBaselinesRef.current.get(element)
    if (existing) return existing

    const basePx = Number.parseFloat(window.getComputedStyle(element).fontSize)
    if (!Number.isFinite(basePx)) return null

    const baseline = {
      basePx,
      inlinePriority: element.style.getPropertyPriority("font-size"),
      inlineValue: element.style.getPropertyValue("font-size"),
    }
    fontBaselinesRef.current.set(element, baseline)
    return baseline
  }, [])

  const restoreElementFont = useCallback((element: HTMLElement, baseline: FontBaseline): void => {
    if (baseline.inlineValue) {
      element.style.setProperty("font-size", baseline.inlineValue, baseline.inlinePriority)
    } else {
      element.style.removeProperty("font-size")
    }
  }, [])

  const applyElementFont = useCallback((element: HTMLElement): void => {
    if (!element.isConnected || isInspectorElement(element)) return
    if (!isTextTarget(element) && !selectedFontOffsetsRef.current.has(element)) return

    const baseline = ensureFontBaseline(element)
    if (!baseline) return

    const totalOffset =
      globalFontOffsetRef.current +
      (pageFontOffsetsRef.current[pathnameRef.current] ?? 0) +
      (selectedFontOffsetsRef.current.get(element) ?? 0)

    if (totalOffset === 0) {
      restoreElementFont(element, baseline)
      return
    }

    element.style.setProperty("font-size", `${Math.max(MIN_FONT_SIZE, baseline.basePx + totalOffset).toFixed(2)}px`, "important")
  }, [ensureFontBaseline, restoreElementFont])

  const applyAllFontOffsets = useCallback(() => {
    if (typeof document === "undefined") return
    document.querySelectorAll<HTMLElement>("body *").forEach((element) => applyElementFont(element))
  }, [applyElementFont])

  const applyHiddenEntry = useCallback((entry: HiddenEntry): void => {
    if (entry.path !== pathnameRef.current) return

    if (entry.kind === "text") {
      let parents: HTMLElement[] = []
      try {
        parents = Array.from(document.querySelectorAll<HTMLElement>(entry.selector))
      } catch {
        parents = []
      }

      for (const parent of parents) {
        if (isInspectorElement(parent)) continue
        if (parent.querySelector(`[${HIDDEN_TEXT_ATTR}][${HIDDEN_RULE_ID_ATTR}="${entry.id}"]`)) continue

        const walker = document.createTreeWalker(parent, NodeFilter.SHOW_TEXT, {
          acceptNode: (node) => {
            const owner = node.parentElement
            if (!owner || isInspectorElement(owner) || owner.closest(`[${HIDDEN_TEXT_ATTR}]`)) {
              return NodeFilter.FILTER_REJECT
            }
            return NodeFilter.FILTER_ACCEPT
          },
        })
        let occurrence = 0
        let textNode = walker.nextNode() as Text | null

        while (textNode) {
          const value = textNode.data
          let searchIndex = value.indexOf(entry.text)

          while (searchIndex !== -1) {
            if (occurrence === entry.occurrence) {
              const before = value.slice(0, searchIndex)
              const hiddenText = value.slice(searchIndex, searchIndex + entry.text.length)
              const after = value.slice(searchIndex + entry.text.length)
              const marker = document.createElement("span")
              marker.setAttribute(HIDDEN_TEXT_ATTR, "true")
              marker.setAttribute(HIDDEN_RULE_ID_ATTR, String(entry.id))
              marker.textContent = hiddenText
              marker.style.setProperty("display", "none", "important")

              const fragment = document.createDocumentFragment()
              if (before) fragment.appendChild(document.createTextNode(before))
              fragment.appendChild(marker)
              if (after) fragment.appendChild(document.createTextNode(after))
              textNode.replaceWith(fragment)
              return
            }

            occurrence += 1
            searchIndex = value.indexOf(entry.text, searchIndex + entry.text.length)
          }

          textNode = walker.nextNode() as Text | null
        }
      }
      return
    }

    let candidates: HTMLElement[] = []
    try {
      candidates = Array.from(document.querySelectorAll<HTMLElement>(entry.selector))
    } catch {
      candidates = []
    }

    for (const element of candidates) {
      if (element.tagName.toLowerCase() !== entry.tagName || isInspectorElement(element)) continue

      if (!entry.touched.has(element)) {
        entry.touched.set(element, {
          inlinePriority: element.style.getPropertyPriority("display"),
          inlineValue: element.style.getPropertyValue("display"),
        })
      }
      element.style.setProperty("display", "none", "important")
    }
  }, [])

  const applyHiddenEntries = useCallback(() => {
    for (const entry of hiddenEntriesRef.current) {
      applyHiddenEntry(entry)
    }
  }, [applyHiddenEntry])

  const restoreHiddenEntry = useCallback((entry: HiddenEntry) => {
    if (entry.kind === "text") {
      document
        .querySelectorAll<HTMLElement>(`[${HIDDEN_TEXT_ATTR}][${HIDDEN_RULE_ID_ATTR}="${entry.id}"]`)
        .forEach(unwrapHiddenText)
      return
    }

    for (const [element, baseline] of entry.touched.entries()) {
      restoreDisplay(element, baseline)
    }
    entry.touched.clear()
  }, [])

  const selectElement = useCallback((element: HTMLElement): void => {
    selectedElementRef.current = element
    setSelectedElement(element)
    setSelectedLabel(describeElement(element))
    setSelectedRect(readRect(element))
    setSelectedFontOffset(selectedFontOffsetsRef.current.get(element) ?? 0)
    setScope("selected")
  }, [])

  const clearSelection = useCallback(() => {
    selectedElementRef.current = null
    setSelectedElement(null)
    setSelectedLabel("No selection")
    setSelectedRect(null)
    setHoverRect(null)
    setSelectedFontOffset(0)
  }, [])

  const captureTextSelection = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return

    const range = selection.getRangeAt(0)
    if (isInspectorElement(range.commonAncestorContainer instanceof Element ? range.commonAncestorContainer : range.commonAncestorContainer.parentElement)) {
      return
    }

    const span = document.createElement("span")
    span.setAttribute(TEXT_SELECTION_ATTR, "true")

    try {
      range.surroundContents(span)
    } catch {
      const fragment = range.extractContents()
      span.appendChild(fragment)
      range.insertNode(span)
    }

    selection.removeAllRanges()
    selectElement(span)
  }, [selectElement])

  const adjustFont = useCallback((delta: number) => {
    if (scope === "global") {
      const next = globalFontOffsetRef.current + delta
      globalFontOffsetRef.current = next
      setGlobalFontOffset(next)
      applyAllFontOffsets()
      return
    }

    if (scope === "page") {
      const next = (pageFontOffsetsRef.current[pathname] ?? 0) + delta
      const nextOffsets = { ...pageFontOffsetsRef.current, [pathname]: next }
      pageFontOffsetsRef.current = nextOffsets
      setPageFontOffsets(nextOffsets)
      applyAllFontOffsets()
      return
    }

    const target = selectedElementRef.current
    if (!target) return

    const next = (selectedFontOffsetsRef.current.get(target) ?? 0) + delta
    selectedFontOffsetsRef.current.set(target, next)
    setSelectedFontOffset(next)
    applyElementFont(target)
  }, [applyAllFontOffsets, applyElementFont, pathname, scope])

  const resetFontScope = useCallback(() => {
    if (scope === "global") {
      globalFontOffsetRef.current = 0
      setGlobalFontOffset(0)
      applyAllFontOffsets()
      return
    }

    if (scope === "page") {
      const nextOffsets = { ...pageFontOffsetsRef.current, [pathname]: 0 }
      pageFontOffsetsRef.current = nextOffsets
      setPageFontOffsets(nextOffsets)
      applyAllFontOffsets()
      return
    }

    const target = selectedElementRef.current
    if (!target) return
    selectedFontOffsetsRef.current.delete(target)
    setSelectedFontOffset(0)
    applyElementFont(target)
  }, [applyAllFontOffsets, applyElementFont, pathname, scope])

  const resetAllFonts = useCallback(() => {
    for (const [element, baseline] of fontBaselinesRef.current.entries()) {
      if (element.isConnected) restoreElementFont(element, baseline)
    }
    fontBaselinesRef.current.clear()
    globalFontOffsetRef.current = 0
    pageFontOffsetsRef.current = {}
    selectedFontOffsetsRef.current.clear()
    setGlobalFontOffset(0)
    setPageFontOffsets({})
    setSelectedFontOffset(0)
  }, [restoreElementFont])

  const hideSelectedElement = useCallback(() => {
    const target = selectedElementRef.current
    if (!target || isInspectorElement(target)) return

    hideIdRef.current += 1
    const selectedText = target.hasAttribute(TEXT_SELECTION_ATTR) ? target.textContent ?? "" : ""
    const parent = target.parentElement
    const entry: HiddenEntry = selectedText.trim() && parent
      ? {
          id: hideIdRef.current,
          kind: "text",
          label: `text "${selectedText.trim().slice(0, 42)}"`,
          occurrence: countOccurrences(textBeforeNode(parent, target), selectedText),
          path: pathname,
          selector: getElementSelector(parent),
          text: selectedText,
        }
      : {
          id: hideIdRef.current,
          kind: "element",
          label: describeElement(target),
          path: pathname,
          selector: getElementSelector(target),
          tagName: target.tagName.toLowerCase(),
          touched: new Map(),
        }

    hiddenEntriesRef.current = [...hiddenEntriesRef.current, entry]
    writeStoredHiddenEntries(hiddenEntriesRef.current)
    applyHiddenEntry(entry)
    setHiddenCount(hiddenEntriesRef.current.length)
    clearSelection()
  }, [applyHiddenEntry, clearSelection, pathname])

  const restoreLastHidden = useCallback(() => {
    const nextEntries = [...hiddenEntriesRef.current]
    const entry = nextEntries.pop()
    if (entry) restoreHiddenEntry(entry)
    hiddenEntriesRef.current = nextEntries
    writeStoredHiddenEntries(nextEntries)
    setHiddenCount(nextEntries.length)
  }, [restoreHiddenEntry])

  const restoreAllHidden = useCallback(() => {
    hiddenEntriesRef.current.forEach(restoreHiddenEntry)
    hiddenEntriesRef.current = []
    writeStoredHiddenEntries([])
    setHiddenCount(0)
  }, [restoreHiddenEntry])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    dragRef.current = {
      moved: false,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: rect.left,
      y: rect.top,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const deltaX = event.clientX - drag.startX
    const deltaY = event.clientY - drag.startY
    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) drag.moved = true
    if (!drag.moved) return

    setLauncherPosition({
      x: clamp(drag.x + deltaX, 8, window.innerWidth - 48),
      y: clamp(drag.y + deltaY, 8, window.innerHeight - 48),
    })
  }, [])

  const handlePointerUp = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
    if (!drag?.moved) setOpen((value) => !value)
  }, [])

  useEffect(() => {
    const entries = readStoredHiddenEntries()
    hiddenEntriesRef.current = entries
    hideIdRef.current = Math.max(0, ...entries.map((entry) => entry.id))
    window.requestAnimationFrame(() => {
      setHiddenCount(entries.length)
      applyHiddenEntries()
    })
  }, [applyHiddenEntries])

  useEffect(() => {
    pathnameRef.current = pathname
    applyHiddenEntries()
    applyAllFontOffsets()
  }, [applyAllFontOffsets, applyHiddenEntries, pathname])

  useEffect(() => {
    if (!pickMode) return

    const handleMouseOver = (event: MouseEvent) => {
      if (!isHTMLElement(event.target) || isInspectorElement(event.target)) return
      setHoverRect(readRect(event.target))
    }

    const handleClick = (event: MouseEvent) => {
      if (!isHTMLElement(event.target) || isInspectorElement(event.target)) return
      event.preventDefault()
      event.stopPropagation()
      selectElement(event.target)
      setPickMode(false)
      setHoverRect(null)
    }

    document.addEventListener("mouseover", handleMouseOver, true)
    document.addEventListener("click", handleClick, true)
    return () => {
      document.removeEventListener("mouseover", handleMouseOver, true)
      document.removeEventListener("click", handleClick, true)
    }
  }, [pickMode, selectElement])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPickMode(false)
        setHoverRect(null)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    const updateSelectedRect = () => {
      const target = selectedElementRef.current
      if (!target) return
      if (!target.isConnected) {
        clearSelection()
        return
      }
      setSelectedRect(readRect(target))
    }

    window.addEventListener("resize", updateSelectedRect)
    window.addEventListener("scroll", updateSelectedRect, true)
    return () => {
      window.removeEventListener("resize", updateSelectedRect)
      window.removeEventListener("scroll", updateSelectedRect, true)
    }
  }, [clearSelection])

  useEffect(() => {
    const observer = new MutationObserver(() => {
      if (
        hiddenEntriesRef.current.length > 0 ||
        globalFontOffsetRef.current !== 0 ||
        (pageFontOffsetsRef.current[pathnameRef.current] ?? 0) !== 0
      ) {
        window.requestAnimationFrame(() => {
          applyHiddenEntries()
          applyAllFontOffsets()
        })
      }
    })

    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [applyAllFontOffsets, applyHiddenEntries])

  return (
    <div {...{ [INSPECTOR_ATTR]: "true" }}>
      <button
        type="button"
        aria-label="Toggle style inspector"
        title="Style inspector"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className={[
          "fixed z-[10000] flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-neutral-950/90 text-white/80 shadow-xl backdrop-blur transition-colors hover:bg-neutral-900 hover:text-white focus:outline-none focus:ring-[3px] focus:ring-primary/20",
          pickMode ? "ring-2 ring-sky-400/70" : "",
        ].join(" ")}
        style={launcherStyle}
      >
        <Brush size={16} />
      </button>

      {hoverRect && pickMode && (
        <div
          className="pointer-events-none fixed z-[9998] rounded-sm border border-sky-400 bg-sky-400/10"
          style={hoverRect}
        />
      )}

      {selectedRect && (
        <div
          className="pointer-events-none fixed z-[9997] rounded-sm border border-emerald-400 bg-emerald-400/10"
          style={selectedRect}
        />
      )}

      {open && (
        <section
          className="fixed z-[9999] flex w-[336px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-lg border border-white/10 bg-neutral-950/95 text-white shadow-2xl backdrop-blur"
          style={panelStyle}
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <Move size={13} className="text-white/45" />
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold leading-tight text-white/85">Style Lab</p>
              <p className="truncate text-[10px] text-white/40">{pathname}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              title="Close"
              className="flex h-7 w-7 items-center justify-center rounded-md text-white/45 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus:ring-[3px] focus:ring-white/10"
            >
              <X size={13} />
            </button>
          </div>

          <div className="space-y-3 p-3">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setPickMode((value) => !value)}
                className={[
                  "flex h-8 items-center justify-center gap-1.5 rounded-md px-2 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-[3px] focus:ring-white/10",
                  pickMode ? "bg-sky-400 text-neutral-950" : "bg-white/8 text-white/70 hover:bg-white/12 hover:text-white",
                ].join(" ")}
              >
                <MousePointer2 size={12} />
                Pick
              </button>
              <button
                type="button"
                onClick={captureTextSelection}
                className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-white/8 px-2 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/12 hover:text-white focus:outline-none focus:ring-[3px] focus:ring-white/10"
              >
                <Type size={12} />
                Use text
              </button>
            </div>

            <div className="rounded-md border border-white/10 bg-white/[0.03] p-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/35">Selected</p>
              <p className="mt-1 truncate text-[11px] text-white/78">{selectedLabel}</p>
            </div>

            <div>
              <div className="grid grid-cols-3 gap-1 rounded-md bg-white/8 p-1">
                {(["selected", "page", "global"] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setScope(item)}
                    disabled={item === "selected" && !selectedElement}
                    className={[
                      "h-7 rounded px-1 text-[10px] font-bold uppercase transition-colors focus:outline-none focus:ring-[3px] focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-35",
                      scope === item ? "bg-white text-neutral-950" : "text-white/55 hover:bg-white/10 hover:text-white",
                    ].join(" ")}
                  >
                    {item}
                  </button>
                ))}
              </div>

              <div className="mt-2 grid grid-cols-[2rem_1fr_2rem_2rem] gap-1">
                <button
                  type="button"
                  onClick={() => adjustFont(-FONT_STEP)}
                  disabled={scope === "selected" && !selectedElement}
                  title="Decrease font"
                  className="flex h-8 items-center justify-center rounded-md bg-white/8 text-white/70 transition-colors hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Minus size={13} />
                </button>
                <div className="flex h-8 items-center justify-center rounded-md border border-white/10 bg-black/20 text-[11px] font-semibold tabular-nums text-white/70">
                  {activeFontOffset > 0 ? "+" : ""}{activeFontOffset}px
                </div>
                <button
                  type="button"
                  onClick={() => adjustFont(FONT_STEP)}
                  disabled={scope === "selected" && !selectedElement}
                  title="Increase font"
                  className="flex h-8 items-center justify-center rounded-md bg-white/8 text-white/70 transition-colors hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <Plus size={13} />
                </button>
                <button
                  type="button"
                  onClick={resetFontScope}
                  disabled={scope === "selected" && !selectedElement}
                  title="Reset scope"
                  className="flex h-8 items-center justify-center rounded-md bg-white/8 text-white/70 transition-colors hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={hideSelectedElement}
                disabled={!selectedElement}
                className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-red-500/12 px-2 text-[11px] font-semibold text-red-200 transition-colors hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Scissors size={12} />
                Remove selected
              </button>
              <button
                type="button"
                onClick={restoreLastHidden}
                disabled={hiddenCount === 0}
                className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-white/8 px-2 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <Undo2 size={12} />
                Undo
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={resetAllFonts}
                className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-white/8 px-2 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/12 hover:text-white focus:outline-none focus:ring-[3px] focus:ring-white/10"
              >
                <Type size={12} />
                Reset fonts
              </button>
              <button
                type="button"
                onClick={restoreAllHidden}
                disabled={hiddenCount === 0}
                className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-white/8 px-2 text-[11px] font-semibold text-white/70 transition-colors hover:bg-white/12 hover:text-white disabled:cursor-not-allowed disabled:opacity-35"
              >
                <EyeOff size={12} />
                Restore all {hiddenCount > 0 ? hiddenCount : ""}
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
