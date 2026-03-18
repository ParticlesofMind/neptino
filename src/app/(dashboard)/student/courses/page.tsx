"use client"

import { useState, useMemo, useRef, useEffect, type ReactNode } from "react"
import { ChevronDown, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react"
import { ISCED_F_2013 } from "@/data/isced-f-2013"

type Course = {
  id: string
  title: string
  teacher: string
  description: string
  broadCode: string    // ISCED-F broad field code e.g. "06"
  narrowCode: string   // ISCED-F narrow field code e.g. "061"
  scope: "Programme" | "Course" | "Lesson"
  priceN: number | null // null = free
  enrolled: number
}

const CATALOG: Course[] = [
  {
    id: "1",
    title: "Data Science 101",
    teacher: "Dr. Anna Mueller",
    description: "An introduction to data analysis, visualisation, and statistical thinking using Python.",
    broadCode: "06",
    narrowCode: "061",
    scope: "Programme",
    priceN: 8,
    enrolled: 85,
  },
  {
    id: "2",
    title: "Web Development Basics",
    teacher: "James Park",
    description: "Build your first websites with HTML, CSS, and JavaScript. Covers layout, accessibility, and responsive design.",
    broadCode: "06",
    narrowCode: "061",
    scope: "Course",
    priceN: null,
    enrolled: 62,
  },
  {
    id: "3",
    title: "Introduction to Calculus",
    teacher: "Prof. Maria Santos",
    description: "Limits, derivatives, and integrals from the ground up. Builds strong intuition alongside formal techniques.",
    broadCode: "05",
    narrowCode: "054",
    scope: "Programme",
    priceN: 12,
    enrolled: 110,
  },
  {
    id: "4",
    title: "Advanced Python",
    teacher: "Sarah Kim",
    description: "Decorators, metaclasses, async programming, and performance optimisation for experienced developers.",
    broadCode: "06",
    narrowCode: "061",
    scope: "Course",
    priceN: 20,
    enrolled: 41,
  },
  {
    id: "5",
    title: "Spanish for Beginners",
    teacher: "Luis Fernandez",
    description: "Essential vocabulary, grammar, and conversational phrases to get you speaking Spanish from lesson one.",
    broadCode: "02",
    narrowCode: "023",
    scope: "Programme",
    priceN: null,
    enrolled: 93,
  },
  {
    id: "6",
    title: "World History: The Modern Era",
    teacher: "Dr. Thomas Reed",
    description: "From the Industrial Revolution to the present day — examining how the modern world took shape.",
    broadCode: "02",
    narrowCode: "022",
    scope: "Course",
    priceN: 4,
    enrolled: 57,
  },
  {
    id: "7",
    title: "Organic Chemistry",
    teacher: "Dr. Emily Chen",
    description: "Reaction mechanisms, stereochemistry, and functional group transformations with worked examples.",
    broadCode: "05",
    narrowCode: "053",
    scope: "Course",
    priceN: 15,
    enrolled: 38,
  },
  {
    id: "8",
    title: "Graphic Design Principles",
    teacher: "Anita Osei",
    description: "Typography, colour theory, composition, and visual hierarchy — the foundations every designer needs.",
    broadCode: "02",
    narrowCode: "021",
    scope: "Lesson",
    priceN: 6,
    enrolled: 74,
  },
  {
    id: "9",
    title: "Machine Learning Fundamentals",
    teacher: "Dr. Raj Patel",
    description: "Supervised and unsupervised learning, model evaluation, and practical workflows with scikit-learn.",
    broadCode: "06",
    narrowCode: "061",
    scope: "Programme",
    priceN: 25,
    enrolled: 66,
  },
  {
    id: "10",
    title: "Linear Algebra",
    teacher: "Prof. Henrik Berg",
    description: "Vectors, matrices, eigenvalues, and linear transformations — essential groundwork for machine learning and physics.",
    broadCode: "05",
    narrowCode: "054",
    scope: "Lesson",
    priceN: null,
    enrolled: 29,
  },
]

const PRICE_OPTIONS: { label: string; key: string }[] = [
  { label: "Free",        key: "free"    },
  { label: "Under 5N",   key: "under5"  },
  { label: "5N – 10N",   key: "5to10"   },
  { label: "10N – 25N",  key: "10to25"  },
  { label: "25N+",       key: "over25"  },
]

function matchesPrice(priceN: number | null, key: string): boolean {
  switch (key) {
    case "free":    return priceN === null
    case "under5":  return priceN !== null && priceN < 5
    case "5to10":   return priceN !== null && priceN >= 5 && priceN <= 10
    case "10to25":  return priceN !== null && priceN > 10 && priceN <= 25
    case "over25":  return priceN !== null && priceN > 25
    default:        return true
  }
}

function formatPrice(priceN: number | null): string {
  return priceN === null ? "Free" : `${priceN}N`
}

const scopeStyle: Record<string, string> = {
  Programme: "border-[#6b8fc4]/30 bg-[#6b8fc4]/10 text-[#6b8fc4]",
  Course:    "border-[#5c9970]/30 bg-[#5c9970]/10 text-[#5c9970]",
  Lesson:    "border-[#a89450]/30 bg-[#a89450]/10 text-[#a89450]",
}

// ─── Filter chip ──────────────────────────────────────────────────────────────

type FilterChipProps = {
  name: string
  label: string
  activeLabel: string | undefined
  onClear: () => void
  onToggle: (name: string) => void
  isOpen: boolean
  children: ReactNode
}

function FilterChip({ name, label, activeLabel, onClear, onToggle, isOpen, children }: FilterChipProps) {
  const isActive = !!activeLabel
  const chipBase = "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
  const chipClass = isActive
    ? "border-primary/30 bg-primary/10 text-primary"
    : "border-border text-foreground hover:border-primary/30"

  return (
    <div className="relative">
      <button type="button" onClick={() => onToggle(name)} className={`${chipBase} ${chipClass}`}>
        <span className="max-w-[160px] truncate">{isActive ? activeLabel : label}</span>
        {isActive && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onClear() }}
            className="-mr-0.5 rounded-full p-0.5 hover:bg-primary/20"
          >
            <X className="h-3 w-3" />
          </span>
        )}
        <ChevronDown className={`h-3.5 w-3.5 opacity-50 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <div className="absolute left-0 top-full z-20 mt-1.5 max-h-64 min-w-[220px] overflow-y-auto rounded-lg border border-border bg-background shadow-md">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentCoursesPage() {
  const [search, setSearch]       = useState("")
  const [broadCode, setBroadCode] = useState<string | null>(null)
  const [narrowCode, setNarrowCode] = useState<string | null>(null)
  const [scope, setScope]         = useState<string | null>(null)
  const [priceKey, setPriceKey]   = useState<string | null>(null)
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [view, setView]           = useState<"grid" | "list">("grid")
  const barRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenFilter(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  // Derived ISCED state
  const broadField    = ISCED_F_2013.find((b) => b.code === broadCode)
  const narrowFields  = broadField?.narrow ?? []
  const narrowField   = narrowFields.find((n) => n.code === narrowCode)

  const activeCount = [broadCode, narrowCode, scope, priceKey].filter(Boolean).length

  function toggleFilter(name: string) {
    setOpenFilter((prev) => (prev === name ? null : name))
  }

  function selectBroad(code: string) {
    setBroadCode((prev) => (prev === code ? null : code))
    setNarrowCode(null)
    setOpenFilter(null)
  }

  function selectNarrow(code: string) {
    setNarrowCode((prev) => (prev === code ? null : code))
    setOpenFilter(null)
  }

  function selectScope(s: string) {
    setScope((prev) => (prev === s ? null : s))
    setOpenFilter(null)
  }

  function selectPrice(key: string) {
    setPriceKey((prev) => (prev === key ? null : key))
    setOpenFilter(null)
  }

  function clearAll() {
    setBroadCode(null)
    setNarrowCode(null)
    setScope(null)
    setPriceKey(null)
    setSearch("")
  }

  const results = useMemo(
    () =>
      CATALOG.filter((c) => {
        if (search) {
          const q = search.toLowerCase()
          if (!c.title.toLowerCase().includes(q) && !c.teacher.toLowerCase().includes(q)) return false
        }
        if (broadCode && c.broadCode !== broadCode) return false
        if (narrowCode && c.narrowCode !== narrowCode) return false
        if (scope && c.scope !== scope) return false
        if (priceKey && !matchesPrice(c.priceN, priceKey)) return false
        return true
      }),
    [search, broadCode, narrowCode, scope, priceKey]
  )

  return (
    <div className="animate-fade-up space-y-5">

      {/* Top bar: search + count + view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search courses or teachers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <p className="shrink-0 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{results.length.toLocaleString()}</span> results
        </p>
        <div className="ml-auto flex items-center overflow-hidden rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setView("list")}
            title="List view"
            className={`p-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-primary/60 ${view === "list" ? "bg-muted text-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setView("grid")}
            title="Grid view"
            className={`border-l border-border p-2 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-1px] focus-visible:outline-primary/60 ${view === "grid" ? "bg-muted text-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter chips bar */}
      <div ref={barRef} className="flex flex-wrap items-center gap-2">

        {/* Field — ISCED-F broad */}
        <FilterChip
          name="field"
          label="Field"
          activeLabel={broadField?.label}
          onClear={() => { setBroadCode(null); setNarrowCode(null) }}
          onToggle={toggleFilter}
          isOpen={openFilter === "field"}
        >
          <div className="py-1">
            {ISCED_F_2013.map((b) => (
              <button
                key={b.code}
                type="button"
                onClick={() => selectBroad(b.code)}
                className={`flex w-full items-baseline gap-2.5 px-4 py-2 text-left text-sm transition-colors hover:bg-muted ${b.code === broadCode ? "font-medium text-primary" : "text-foreground"}`}
              >
                <span className="w-5 shrink-0 font-mono text-xs text-muted-foreground">{b.code}</span>
                {b.label}
              </button>
            ))}
          </div>
        </FilterChip>

        {/* Subfield — ISCED-F narrow, only once a broad is selected */}
        {broadCode && (
          <FilterChip
            name="subfield"
            label="Subfield"
            activeLabel={narrowField?.label}
            onClear={() => setNarrowCode(null)}
            onToggle={toggleFilter}
            isOpen={openFilter === "subfield"}
          >
            <div className="py-1">
              {narrowFields.map((n) => (
                <button
                  key={n.code}
                  type="button"
                  onClick={() => selectNarrow(n.code)}
                  className={`flex w-full items-baseline gap-2.5 px-4 py-2 text-left text-sm transition-colors hover:bg-muted ${n.code === narrowCode ? "font-medium text-primary" : "text-foreground"}`}
                >
                  <span className="w-7 shrink-0 font-mono text-xs text-muted-foreground">{n.code}</span>
                  {n.label}
                </button>
              ))}
            </div>
          </FilterChip>
        )}

        {/* Scope */}
        <FilterChip
          name="scope"
          label="Scope"
          activeLabel={scope ?? undefined}
          onClear={() => setScope(null)}
          onToggle={toggleFilter}
          isOpen={openFilter === "scope"}
        >
          <div className="py-1">
            {(["Programme", "Course", "Lesson"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => selectScope(s)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-muted ${s === scope ? "font-medium text-primary" : "text-foreground"}`}
              >
                {s}
              </button>
            ))}
          </div>
        </FilterChip>

        {/* Price */}
        <FilterChip
          name="price"
          label="Price"
          activeLabel={PRICE_OPTIONS.find((p) => p.key === priceKey)?.label}
          onClear={() => setPriceKey(null)}
          onToggle={toggleFilter}
          isOpen={openFilter === "price"}
        >
          <div className="py-1">
            {PRICE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => selectPrice(opt.key)}
                className={`w-full px-4 py-2 text-left text-sm transition-colors hover:bg-muted ${opt.key === priceKey ? "font-medium text-primary" : "text-foreground"}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </FilterChip>

        {/* All filters / clear */}
        <button
          type="button"
          onClick={activeCount > 0 ? clearAll : undefined}
          className={`ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
            activeCount > 0
              ? "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              : "border-border text-muted-foreground opacity-60"
          }`}
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          All filters{activeCount > 0 && ` (${activeCount})`}
          {activeCount > 0 && <X className="h-3 w-3 opacity-60" />}
        </button>

      </div>

      {/* Results */}
      {results.length === 0 ? (
        <div className="rounded-lg border border-border bg-background px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">No courses match your filters.</p>
          <button type="button" onClick={clearAll} className="mt-3 text-xs font-medium text-primary hover:underline transition-all rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/60">
            Clear all filters
          </button>
        </div>
      ) : view === "list" ? (
        <div className="divide-y divide-border rounded-lg border border-border bg-background">
          {results.map((course) => {
            const broad = ISCED_F_2013.find((b) => b.code === course.broadCode)
            return (
              <div key={course.id} className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/20">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-foreground">{course.title}</span>
                    <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${scopeStyle[course.scope]}`}>
                      {course.scope}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{course.teacher}</span>
                    <span className="text-muted-foreground/40">·</span>
                    <span className="text-xs text-muted-foreground">{broad?.label}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <span className="hidden text-xs text-muted-foreground sm:block">{course.enrolled} enrolled</span>
                  <span className="text-sm font-semibold text-foreground">{formatPrice(course.priceN)}</span>
                  <button type="button" className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">
                    Enroll
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((course) => {
            const broad  = ISCED_F_2013.find((b) => b.code === course.broadCode)
            const narrow = broad?.narrow.find((n) => n.code === course.narrowCode)
            return (
              <article key={course.id} className="flex flex-col rounded-lg border border-border bg-background p-5 transition-all hover:border-primary/30 hover:shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-foreground">{course.title}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">{course.teacher}</p>
                  </div>
                  <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${scopeStyle[course.scope]}`}>
                    {course.scope}
                  </span>
                </div>
                <p className="mt-3 line-clamp-3 flex-1 text-xs leading-relaxed text-muted-foreground">{course.description}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {broad?.label}{narrow ? <> &mdash; {narrow.label}</> : null}
                </p>
                <div className="mt-4 flex items-end justify-between border-t border-border pt-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{formatPrice(course.priceN)}</p>
                    <p className="text-xs text-muted-foreground">{course.enrolled} enrolled</p>
                  </div>
                  <button type="button" className="rounded-md border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">
                    Enroll
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

    </div>
  )
}
