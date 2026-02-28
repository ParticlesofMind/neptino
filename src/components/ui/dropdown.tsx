"use client"

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
  type KeyboardEvent,
} from "react"

// ─── Types ───────────────────────────────────────────────────────────────────

export type DropdownOption<V extends string = string> = {
  value: V
  label: string
  /** Optional secondary line shown below the label */
  description?: string
  /** Optional leading icon/avatar */
  icon?: ReactNode
  disabled?: boolean
}

type DropdownProps<V extends string = string> = {
  options: DropdownOption<V>[]
  value?: V | null
  onChange?: (value: V) => void
  placeholder?: string
  /** Small label rendered above the trigger */
  label?: string
  disabled?: boolean
  /** Extra classes on the outer wrapper */
  className?: string
  /** "left" aligns the panel to the trigger's left edge (default); "right" to the right edge */
  align?: "left" | "right"
  /** Override the trigger width — defaults to "w-full" */
  triggerWidth?: string
}

// ─── Search threshold ────────────────────────────────────────────────────────
const SEARCH_THRESHOLD = 15

// ─── Chevron icon ─────────────────────────────────────────────────────────────
function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : "rotate-0"}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

// ─── Check icon ───────────────────────────────────────────────────────────────
function Check() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

// ─── Search icon ──────────────────────────────────────────────────────────────
function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Dropdown<V extends string = string>({
  options,
  value,
  onChange,
  placeholder = "Select…",
  label,
  disabled = false,
  className = "",
  align = "left",
  triggerWidth = "w-full",
}: DropdownProps<V>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  const showSearch = options.length >= SEARCH_THRESHOLD

  const filtered = query.trim()
    ? options.filter((o) =>
        o.label.toLowerCase().includes(query.toLowerCase()) ||
        o.description?.toLowerCase().includes(query.toLowerCase())
      )
    : options

  const selected = options.find((o) => o.value === value) ?? null

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // ── Focus search when opening ───────────────────────────────────────────────
  useEffect(() => {
    if (open && showSearch) {
      // Small delay allows the panel's entrance animation to start
      const t = setTimeout(() => searchRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
    if (!open) {
      setQuery("")
      setActiveIndex(-1)
    }
  }, [open, showSearch])

  // ── Scroll active option into view ─────────────────────────────────────────
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return
    const item = listRef.current.children[activeIndex] as HTMLElement | undefined
    item?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (disabled) return
      switch (e.key) {
        case "Enter":
        case " ":
          if (!open) {
            e.preventDefault()
            setOpen(true)
          } else if (activeIndex >= 0 && filtered[activeIndex]) {
            e.preventDefault()
            const opt = filtered[activeIndex]
            if (!opt.disabled) {
              onChange?.(opt.value)
              setOpen(false)
            }
          }
          break
        case "Escape":
          e.preventDefault()
          setOpen(false)
          break
        case "ArrowDown":
          e.preventDefault()
          if (!open) {
            setOpen(true)
          } else {
            setActiveIndex((i) =>
              Math.min(i + 1, filtered.length - 1)
            )
          }
          break
        case "ArrowUp":
          e.preventDefault()
          setActiveIndex((i) => Math.max(i - 1, 0))
          break
        case "Tab":
          setOpen(false)
          break
      }
    },
    [disabled, open, activeIndex, filtered, onChange]
  )

  function handleSelect(opt: DropdownOption<V>) {
    if (opt.disabled) return
    onChange?.(opt.value)
    setOpen(false)
  }

  return (
    <div
      ref={wrapperRef}
      className={`relative ${triggerWidth} ${className}`}
      onKeyDown={handleKeyDown}
    >
      {/* Label */}
      {label && (
        <label className="mb-1.5 block text-xs font-medium tracking-wide text-[var(--muted-foreground,#737373)] uppercase">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={[
          "flex w-full items-center justify-between gap-2",
          "rounded-xl border border-[var(--border,#e5e5e5)] bg-[var(--background,#fff)]",
          "px-3.5 py-2.5 text-sm",
          "shadow-sm",
          "transition-all duration-150",
          open
            ? "border-[var(--primary,#4a94ff)] ring-3 ring-[var(--primary,#4a94ff)]/15"
            : "hover:border-[var(--muted-foreground,#a3a3a3)]/50",
          disabled
            ? "cursor-not-allowed opacity-50"
            : "cursor-pointer",
        ].join(" ")}
      >
        {/* Leading icon + label */}
        <span className="flex min-w-0 items-center gap-2">
          {selected?.icon && (
            <span className="shrink-0 text-[var(--muted-foreground,#737373)]">
              {selected.icon}
            </span>
          )}
          <span
            className={
              selected
                ? "truncate text-[var(--foreground,#171717)]"
                : "truncate text-[var(--muted-foreground,#a3a3a3)]"
            }
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>

        {/* Chevron */}
        <span className="text-[var(--muted-foreground,#a3a3a3)]">
          <ChevronDown open={open} />
        </span>
      </button>

      {/* Panel */}
      <div
        role="listbox"
        aria-label={label ?? "Options"}
        className={[
          "absolute z-50 mt-1.5 w-full overflow-hidden",
          "rounded-xl border border-[var(--border,#e5e5e5)] bg-white",
          "shadow-[0_8px_30px_rgb(0,0,0,0.10)]",
          "transition-all duration-150 origin-top",
          align === "right" ? "right-0" : "left-0",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-[0.97] opacity-0",
        ].join(" ")}
      >
        {/* Search bar */}
        {showSearch && (
          <div className="border-b border-[var(--border,#e5e5e5)] px-3 py-2.5">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--border,#e5e5e5)] bg-[#fafafa] px-3 py-1.5 focus-within:border-[var(--primary,#4a94ff)] focus-within:ring-2 focus-within:ring-[var(--primary,#4a94ff)]/15 transition-all duration-150">
              <span className="shrink-0 text-[var(--muted-foreground,#a3a3a3)]">
                <SearchIcon />
              </span>
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIndex(0)
                }}
                placeholder="Search…"
                className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--foreground,#171717)] placeholder:text-[var(--muted-foreground,#a3a3a3)] outline-none"
              />
              {query && (
                <button
                  tabIndex={-1}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setQuery("")
                    setActiveIndex(-1)
                    searchRef.current?.focus()
                  }}
                  className="shrink-0 text-[var(--muted-foreground,#a3a3a3)] hover:text-[var(--foreground,#171717)] transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Options list */}
        <ul
          ref={listRef}
          className="max-h-60 overflow-y-auto overscroll-contain py-1.5 focus:outline-none"
          style={{ scrollbarWidth: "none" }}
        >
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-[13px] text-[var(--muted-foreground,#a3a3a3)]">
              No results found
            </li>
          ) : (
            filtered.map((opt, idx) => {
              const isSelected = opt.value === value
              const isActive = idx === activeIndex

              return (
                <li
                  key={opt.value}
                  role="option"
                  aria-selected={isSelected}
                  aria-disabled={opt.disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSelect(opt)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  className={[
                    "flex cursor-pointer items-center gap-3 px-3.5 py-2.5 mx-1 rounded-lg",
                    "transition-colors duration-100",
                    opt.disabled
                      ? "cursor-not-allowed opacity-40"
                      : isActive || isSelected
                      ? "bg-[var(--accent,#f5f9ff)]"
                      : "hover:bg-[var(--accent,#f5f9ff)]",
                  ].join(" ")}
                >
                  {/* Option leading icon */}
                  {opt.icon && (
                    <span
                      className={`shrink-0 ${
                        isSelected
                          ? "text-[var(--primary,#4a94ff)]"
                          : "text-[var(--muted-foreground,#737373)]"
                      }`}
                    >
                      {opt.icon}
                    </span>
                  )}

                  {/* Option text */}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span
                      className={`truncate text-sm leading-snug ${
                        isSelected
                          ? "font-medium text-[var(--primary,#4a94ff)]"
                          : "text-[var(--foreground,#171717)]"
                      }`}
                    >
                      {opt.label}
                    </span>
                    {opt.description && (
                      <span className="mt-0.5 truncate text-[11px] leading-snug text-[var(--muted-foreground,#a3a3a3)]">
                        {opt.description}
                      </span>
                    )}
                  </span>

                  {/* Checkmark */}
                  <span
                    className={`shrink-0 transition-opacity duration-100 ${
                      isSelected
                        ? "text-[var(--primary,#4a94ff)] opacity-100"
                        : "opacity-0"
                    }`}
                  >
                    <Check />
                  </span>
                </li>
              )
            })
          )}
        </ul>
      </div>
    </div>
  )
}
