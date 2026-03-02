"use client"

import { useState, useCallback, useRef } from "react"
import {
  DEFAULT_TOKENS,
  applyTokens,
  loadStoredTokens,
  saveTokens,
} from "@/components/providers/ThemeTokensProvider"

// ─── helpers ──────────────────────────────────────────────────────────────────

function hexToValid(value: string): string {
  const v = value.startsWith("#") ? value : `#${value}`
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : ""
}

/** WCAG relative luminance of a hex color (0–1) */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrastRatio(hex1: string, hex2: string): number {
  const l1 = luminance(hex1)
  const l2 = luminance(hex2)
  const [light, dark] = l1 > l2 ? [l1, l2] : [l2, l1]
  return (light + 0.05) / (dark + 0.05)
}

function wcagGrade(ratio: number): { grade: string; color: string } {
  if (ratio >= 7)   return { grade: "AAA", color: "#16a34a" }
  if (ratio >= 4.5) return { grade: "AA",  color: "#65a30d" }
  if (ratio >= 3)   return { grade: "AA+", color: "#ca8a04" }
  return              { grade: "Fail",     color: "#dc2626" }
}

function radiusToNumber(rem: string): number {
  return parseFloat(rem.replace("rem", "")) || 0.5
}

function numberToRadius(n: number): string {
  return `${n.toFixed(3)}rem`
}

// ─── preset themes ─────────────────────────────────────────────────────────────

const PRESET_THEMES: { label: string; tokens: Record<string, string> }[] = [
  { label: "Default", tokens: DEFAULT_TOKENS },
  {
    label: "Ocean",
    tokens: {
      ...DEFAULT_TOKENS,
      "--primary":              "#0ea5e9",
      "--primary-foreground":   "#ffffff",
      "--secondary":            "#06b6d4",
      "--secondary-foreground": "#ffffff",
      "--accent":               "#f0f9ff",
      "--accent-foreground":    "#0369a1",
    },
  },
  {
    label: "Forest",
    tokens: {
      ...DEFAULT_TOKENS,
      "--primary":              "#16a34a",
      "--primary-foreground":   "#ffffff",
      "--secondary":            "#65a30d",
      "--secondary-foreground": "#ffffff",
      "--accent":               "#f0fdf4",
      "--accent-foreground":    "#14532d",
    },
  },
  {
    label: "Warm",
    tokens: {
      ...DEFAULT_TOKENS,
      "--primary":              "#ea580c",
      "--primary-foreground":   "#ffffff",
      "--secondary":            "#d97706",
      "--secondary-foreground": "#ffffff",
      "--accent":               "#fff7ed",
      "--accent-foreground":    "#9a3412",
    },
  },
  {
    label: "Violet",
    tokens: {
      ...DEFAULT_TOKENS,
      "--primary":              "#7c3aed",
      "--primary-foreground":   "#ffffff",
      "--secondary":            "#a21caf",
      "--secondary-foreground": "#ffffff",
      "--accent":               "#faf5ff",
      "--accent-foreground":    "#4c1d95",
    },
  },
  {
    label: "Slate",
    tokens: {
      ...DEFAULT_TOKENS,
      "--primary":              "#475569",
      "--primary-foreground":   "#ffffff",
      "--secondary":            "#64748b",
      "--secondary-foreground": "#ffffff",
      "--foreground":           "#0f172a",
      "--muted":                "#f1f5f9",
      "--muted-foreground":     "#64748b",
      "--border":               "#e2e8f0",
      "--accent":               "#f8fafc",
      "--accent-foreground":    "#1e293b",
    },
  },
]

// ─── token groups ─────────────────────────────────────────────────────────────

const TOKEN_GROUPS = [
  {
    label: "Brand",
    tokens: [
      { variable: "--primary",              label: "Primary",          description: "Main action color" },
      { variable: "--primary-foreground",   label: "On Primary",       description: "Text on primary bg" },
      { variable: "--secondary",            label: "Secondary",        description: "Supporting accent" },
      { variable: "--secondary-foreground", label: "On Secondary",     description: "Text on secondary bg" },
    ],
  },
  {
    label: "Surfaces",
    tokens: [
      { variable: "--background",           label: "Background",       description: "Page background" },
      { variable: "--foreground",           label: "Foreground",       description: "Primary text" },
      { variable: "--muted",                label: "Muted",            description: "Subtle backgrounds" },
      { variable: "--muted-foreground",     label: "Muted text",       description: "De-emphasized text" },
    ],
  },
  {
    label: "Utility",
    tokens: [
      { variable: "--accent",               label: "Accent",           description: "Hover / tinted bg" },
      { variable: "--accent-foreground",    label: "On Accent",        description: "Text on accent bg" },
      { variable: "--destructive",          label: "Destructive",      description: "Error / danger" },
      { variable: "--destructive-foreground", label: "On Destructive", description: "Text on destructive" },
      { variable: "--border",               label: "Border",           description: "All borders" },
    ],
  },
] as const

// ─── sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  )
}

interface TokenRowProps {
  label: string
  variable: string
  value: string
  onChange: (variable: string, value: string) => void
  description?: string
}

/**
 * TokenRow — NO useEffect. Eliminates the setState-in-effect infinite loop
 * that occurs in React 19 / Turbopack when syncing local state from a prop
 * that is itself derived from the same state update.
 *
 * - Color picker is controlled directly by parent `value`.
 * - Text input keeps a local `draft` only while the field is focused.
 * - On blur, the draft is discarded and the parent `value` takes over.
 */
function TokenRow({ label, variable, value, onChange, description }: TokenRowProps) {
  const [draft, setDraft]     = useState("")
  const [editing, setEditing] = useState(false)

  const displayText = editing ? draft : value

  function handleColorPicker(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(variable, e.target.value)
  }

  function handleTextFocus() {
    setDraft(value)
    setEditing(true)
  }

  function handleTextChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setDraft(raw)
    const valid = hexToValid(raw)
    if (valid) onChange(variable, valid)
  }

  function handleTextBlur() {
    setEditing(false)
  }

  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <div
          className="relative h-8 w-8 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-border shadow-sm"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={handleColorPicker}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>
        <input
          type="text"
          value={displayText}
          onFocus={handleTextFocus}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          maxLength={7}
          spellCheck={false}
          className="w-20 rounded-lg border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder="#000000"
        />
      </div>
    </div>
  )
}

interface RadiusRowProps { value: number; onChange: (v: number) => void }

function RadiusRow({ value, onChange }: RadiusRowProps) {
  return (
    <div className="py-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Border Radius</p>
        <span className="font-mono text-xs text-muted-foreground">{value.toFixed(3)} rem</span>
      </div>
      <input type="range" min={0} max={1.5} step={0.0625} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary" />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>Sharp</span><span>Rounded</span><span>Pill</span>
      </div>
    </div>
  )
}

interface FontSizeRowProps { value: number; onChange: (v: number) => void }

function FontSizeRow({ value, onChange }: FontSizeRowProps) {
  return (
    <div className="py-2">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Base Font Size</p>
        <span className="font-mono text-xs text-muted-foreground">{value} px</span>
      </div>
      <input type="range" min={12} max={20} step={1} value={value}
        onChange={(e) => onChange(parseInt(e.target.value, 10))}
        className="w-full accent-primary" />
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>12 px</span><span>16 px</span><span>20 px</span>
      </div>
    </div>
  )
}

// ─── contrast checker ─────────────────────────────────────────────────────────

const CONTRAST_PAIRS = [
  { label: "Body text on background",          fg: "--foreground",             bg: "--background" },
  { label: "Primary color on background",      fg: "--primary",                bg: "--background" },
  { label: "Muted text on background",         fg: "--muted-foreground",       bg: "--background" },
  { label: "Text on primary button",           fg: "--primary-foreground",     bg: "--primary" },
  { label: "Text on secondary button",         fg: "--secondary-foreground",   bg: "--secondary" },
  { label: "Text on destructive",              fg: "--destructive-foreground", bg: "--destructive" },
  { label: "Muted text on muted surface",      fg: "--muted-foreground",       bg: "--muted" },
  { label: "Accent foreground on accent",      fg: "--accent-foreground",      bg: "--accent" },
] as const

function ContrastChecker({ tokens }: { tokens: Record<string, string> }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground leading-relaxed mb-3">
        WCAG 2.1 contrast ratios for key color pairings. AA requires 4.5:1 for normal text, AAA requires 7:1.
      </p>
      {CONTRAST_PAIRS.map(({ label, fg, bg }) => {
        const fgHex   = hexToValid(tokens[fg] ?? "#000000") || "#000000"
        const bgHex   = hexToValid(tokens[bg] ?? "#ffffff") || "#ffffff"
        const ratio   = contrastRatio(fgHex, bgHex)
        const { grade, color } = wcagGrade(ratio)
        return (
          <div key={label} className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5">
            <div
              className="h-8 w-10 shrink-0 rounded-lg border border-border flex items-center justify-center"
              style={{ backgroundColor: bgHex }}
            >
              <span className="text-xs font-bold" style={{ color: fgHex }}>Aa</span>
            </div>
            <span className="min-w-0 flex-1 text-xs text-foreground truncate">{label}</span>
            <span className="shrink-0 font-mono text-xs text-muted-foreground">{ratio.toFixed(1)}:1</span>
            <span className="shrink-0 w-9 text-right font-mono text-xs font-semibold" style={{ color }}>{grade}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── preview components ────────────────────────────────────────────────────────

function PreviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      {children}
    </div>
  )
}

function TypographyPreview() {
  return (
    <PreviewSection title="Typography">
      <div className="rounded-xl border border-border bg-background p-5 space-y-3">
        <h1 className="text-2xl font-semibold text-foreground">Heading 1 — Page title</h1>
        <h2 className="text-lg font-semibold text-foreground">Heading 2 — Section title</h2>
        <h3 className="text-base font-medium text-foreground">Heading 3 — Card title</h3>
        <p className="text-sm text-foreground leading-relaxed">
          Body text — Standard paragraph in primary foreground color. Used for most content areas.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Muted text — Subtitles, descriptions, and supplementary information with reduced contrast.
        </p>
        <div className="flex flex-wrap items-baseline gap-4 pt-1">
          <span className="text-xs text-muted-foreground">Extra small</span>
          <span className="text-sm text-foreground">Small</span>
          <span className="text-base text-foreground">Base</span>
          <span className="text-lg font-medium text-foreground">Large</span>
          <span className="text-xl font-semibold text-foreground">XL</span>
          <span className="text-2xl font-bold text-foreground">2XL</span>
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Overline label style
        </p>
      </div>
    </PreviewSection>
  )
}

function ButtonsPreview() {
  return (
    <PreviewSection title="Buttons">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 active:scale-[0.97]">Primary</button>
          <button type="button" className="rounded-[var(--radius)] bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition hover:opacity-90 active:scale-[0.97]">Secondary</button>
          <button type="button" className="rounded-[var(--radius)] border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted active:scale-[0.97]">Outline</button>
          <button type="button" className="rounded-[var(--radius)] bg-transparent px-4 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-[0.97]">Ghost</button>
          <button type="button" className="rounded-[var(--radius)] bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:opacity-90 active:scale-[0.97]">Destructive</button>
          <button type="button" disabled className="rounded-[var(--radius)] bg-muted px-4 py-2 text-sm font-medium text-muted-foreground opacity-50 cursor-not-allowed">Disabled</button>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">Primary pill</button>
          <button type="button" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90">Accent pill</button>
          <button type="button" className="rounded-[var(--radius)] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Small</button>
          <button type="button" className="rounded-[var(--radius)] border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">Subtle</button>
        </div>
      </div>
    </PreviewSection>
  )
}

function FormPreview() {
  return (
    <PreviewSection title="Form Elements">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Email address</label>
            <input type="email" readOnly placeholder="you@example.com" className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Course title</label>
            <input type="text" readOnly placeholder="Introduction to Algebra" className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
            <p className="text-xs text-muted-foreground">Choose a descriptive title.</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Subject area</label>
            <select className="w-full rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20">
              <option>Mathematics</option>
              <option>Sciences</option>
              <option>Languages</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-foreground">Focused state</label>
            <input type="text" defaultValue="Focused input" className="w-full rounded-[var(--radius)] border-2 border-primary bg-background px-3 py-2 text-sm text-foreground ring-2 ring-primary/20 outline-none" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Save changes</button>
          <button type="button" className="rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">Cancel</button>
        </div>
      </div>
    </PreviewSection>
  )
}

function CardPreview() {
  return (
    <PreviewSection title="Cards">
      <div className="grid gap-3 sm:grid-cols-2">
        <article className="rounded-[var(--radius)] border border-border bg-background p-5 shadow-sm">
          <h3 className="text-base font-semibold text-foreground">Introduction to Algebra</h3>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">24 enrolled · 8 lessons · Published</p>
          <div className="mt-4 flex items-center gap-2">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Live</span>
            <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">Mathematics</span>
          </div>
        </article>
        <article className="rounded-[var(--radius)] border border-border bg-accent p-5">
          <h3 className="text-base font-semibold text-accent-foreground">Quick Actions</h3>
          <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">Create a new course or continue a draft.</p>
          <div className="mt-4">
            <button type="button" className="rounded-[var(--radius)] bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">New course</button>
          </div>
        </article>
        <article className="rounded-[var(--radius)] border border-border bg-muted p-5 sm:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Notification</h3>
              <p className="mt-1 text-sm text-muted-foreground">3 students submitted assignments in Advanced JavaScript — 2 hours ago.</p>
            </div>
            <button type="button" className="shrink-0 rounded-[var(--radius)] border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground">Dismiss</button>
          </div>
        </article>
      </div>
    </PreviewSection>
  )
}

function BadgesPreview() {
  return (
    <PreviewSection title="Badges and Status">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">Primary</span>
          <span className="rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-medium text-secondary">Secondary</span>
          <span className="rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-medium text-destructive">Error</span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Neutral</span>
          <span className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">Accent</span>
          <span className="rounded-full border border-primary/30 px-2.5 py-1 text-xs font-medium text-primary">Outlined</span>
          <span className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground">Default</span>
        </div>
        <div className="space-y-2">
          {[
            { dot: "bg-secondary",         text: "Course published",           time: "Just now" },
            { dot: "bg-primary",            text: "5 new enrollments",          time: "6h ago" },
            { dot: "bg-muted-foreground",   text: "Draft saved automatically",  time: "2m ago" },
          ].map(({ dot, text, time }) => (
            <div key={text} className="flex items-center gap-2 rounded-[var(--radius)] border border-border bg-background px-3 py-2">
              <span className={`h-2 w-2 rounded-full ${dot}`} />
              <span className="text-sm text-foreground">{text}</span>
              <span className="ml-auto text-xs text-muted-foreground">{time}</span>
            </div>
          ))}
          <div className="flex items-center gap-2 rounded-[var(--radius)] border border-destructive/20 bg-destructive/5 px-3 py-2">
            <span className="h-2 w-2 rounded-full bg-destructive" />
            <span className="text-sm text-foreground">Payment failed</span>
            <span className="ml-auto text-xs text-muted-foreground">Yesterday</span>
          </div>
        </div>
      </div>
    </PreviewSection>
  )
}

function NavigationPreview() {
  return (
    <PreviewSection title="Navigation">
      <div className="rounded-xl border border-border bg-background p-5 space-y-4">
        <div className="flex items-center gap-6 border-b border-border pb-4 overflow-x-auto">
          <div className="h-6 w-6 shrink-0 rounded bg-primary/20" />
          {["Courses", "Atlas", "Style Guide", "Settings"].map((item, i) => (
            <button key={item} type="button" className={i === 2 ? "shrink-0 text-sm font-medium text-primary border-b-2 border-primary pb-[1px]" : "shrink-0 text-sm text-muted-foreground hover:text-foreground"}>
              {item}
            </button>
          ))}
        </div>
        <div className="rounded-[var(--radius)] border border-border p-2 space-y-0.5">
          {[{ label: "Home", active: false }, { label: "Courses", active: true }, { label: "Classes", active: false }, { label: "Settings", active: false }].map(({ label, active }) => (
            <button key={label} type="button" className={active ? "flex w-full rounded-[var(--radius)] border border-primary/25 bg-primary/10 px-3 py-2 text-sm font-medium text-primary" : "flex w-full rounded-[var(--radius)] px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"}>
              {label}
            </button>
          ))}
        </div>
      </div>
    </PreviewSection>
  )
}

// ─── main page ────────────────────────────────────────────────────────────────

export default function StyleGuidePage() {
  const [tokens, setTokens] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const stored = loadStoredTokens()
      if (stored) return { ...DEFAULT_TOKENS, ...stored }
    }
    return DEFAULT_TOKENS
  })
  const [radius, setRadius] = useState(() => {
    if (typeof window !== "undefined") {
      const r = loadStoredTokens()?.["--radius"]
      if (r) return radiusToNumber(r)
    }
    return radiusToNumber(DEFAULT_TOKENS["--radius"])
  })
  const [fontSize, setFontSize] = useState(16)
  const [saved, setSaved]     = useState(false)
  const [copied, setCopied]   = useState(false)
  const [activeTab, setActiveTab] = useState<"tokens" | "contrast" | "export">("tokens")
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleTokenChange = useCallback((variable: string, value: string) => {
    document.documentElement.style.setProperty(variable, value)
    setTokens((prev) => ({ ...prev, [variable]: value }))
    setSaved(false)
  }, [])

  const handleRadiusChange = useCallback((value: number) => {
    const rem = numberToRadius(value)
    setRadius(value)
    document.documentElement.style.setProperty("--radius", rem)
    setTokens((prev) => ({ ...prev, "--radius": rem }))
    setSaved(false)
  }, [])

  const handleFontSizeChange = useCallback((value: number) => {
    setFontSize(value)
    document.documentElement.style.fontSize = `${value}px`
    setSaved(false)
  }, [])

  function handlePreset(preset: typeof PRESET_THEMES[number]) {
    applyTokens(preset.tokens)
    setTokens(preset.tokens)
    setRadius(radiusToNumber(preset.tokens["--radius"] ?? DEFAULT_TOKENS["--radius"]))
    setSaved(false)
  }

  function handleSave() {
    const allTokens = { ...tokens, "--radius": numberToRadius(radius) }
    saveTokens(allTokens)
    setSaved(true)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    applyTokens(DEFAULT_TOKENS)
    document.documentElement.style.fontSize = "16px"
    setTokens(DEFAULT_TOKENS)
    setRadius(radiusToNumber(DEFAULT_TOKENS["--radius"]))
    setFontSize(16)
    saveTokens(DEFAULT_TOKENS)
    setSaved(false)
  }

  function buildCSSExport(): string {
    return [
      ":root {",
      ...Object.entries({ ...tokens, "--radius": numberToRadius(radius) })
        .map(([k, v]) => `  ${k}: ${v};`),
      "}",
    ].join("\n")
  }

  async function handleCopyCSS() {
    try {
      await navigator.clipboard.writeText(buildCSSExport())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  const tabs = [
    { id: "tokens"   as const, label: "Colors" },
    { id: "contrast" as const, label: "Contrast" },
    { id: "export"   as const, label: "Export" },
  ]

  return (
    <div className="pb-12">
      {/* Page header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Style Guide</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Edit design tokens to update every component across the platform in real time.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" onClick={handleReset}
            className="rounded-[var(--radius)] border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
            Reset
          </button>
          <button type="button" onClick={handleSave}
            className="rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
            {saved ? "Saved" : "Save"}
          </button>
        </div>
      </div>

      <div className="flex gap-8 items-start">
        {/* ── Left: Controls ───────────────────────────────────────────── */}
        <aside className="w-72 shrink-0 space-y-4 sticky top-20">

          {/* Preset themes */}
          <div className="rounded-2xl border border-border bg-background p-4">
            <SectionHeader>Presets</SectionHeader>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_THEMES.map((preset) => (
                <button key={preset.label} type="button" onClick={() => handlePreset(preset)}
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background px-2 py-2.5 text-[10px] font-medium text-foreground transition hover:border-primary/40 hover:bg-primary/5">
                  <div className="flex gap-1">
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.tokens["--primary"] }} />
                    <div className="h-3 w-3 rounded-full" style={{ backgroundColor: preset.tokens["--secondary"] }} />
                  </div>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabbed controls */}
          <div className="rounded-2xl border border-border bg-background overflow-hidden">
            <div className="flex border-b border-border">
              {tabs.map((tab) => (
                <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)}
                  className={activeTab === tab.id
                    ? "flex-1 py-2.5 text-[11px] font-semibold text-primary border-b-2 border-primary"
                    : "flex-1 py-2.5 text-[11px] text-muted-foreground hover:text-foreground transition"
                  }>
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4">
              {activeTab === "tokens" && (
                <div className="space-y-5">
                  {TOKEN_GROUPS.map((group) => (
                    <div key={group.label}>
                      <SectionHeader>{group.label}</SectionHeader>
                      <div className="divide-y divide-border/50">
                        {group.tokens.map((token) => (
                          <TokenRow key={token.variable} label={token.label} variable={token.variable}
                            description={token.description} value={tokens[token.variable] ?? "#000000"}
                            onChange={handleTokenChange} />
                        ))}
                      </div>
                    </div>
                  ))}
                  <div>
                    <SectionHeader>Shape</SectionHeader>
                    <RadiusRow value={radius} onChange={handleRadiusChange} />
                  </div>
                  <div>
                    <SectionHeader>Typography</SectionHeader>
                    <FontSizeRow value={fontSize} onChange={handleFontSizeChange} />
                    <p className="mt-1.5 text-[10px] text-muted-foreground">
                      Sets the root font size — all rem values scale with it.
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "contrast" && (
                <ContrastChecker tokens={tokens} />
              )}

              {activeTab === "export" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Copy and paste into{" "}
                    <code className="rounded bg-muted px-1 font-mono">{":root {}"}</code>{" "}
                    inside <code className="rounded bg-muted px-1 font-mono">globals.css</code> to bake in these tokens permanently.
                  </p>
                  <pre className="rounded-xl border border-border bg-muted p-3 text-[10px] font-mono text-foreground overflow-x-auto leading-relaxed whitespace-pre-wrap break-all">
                    {buildCSSExport()}
                  </pre>
                  <button type="button" onClick={handleCopyCSS}
                    className="w-full rounded-[var(--radius)] bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90">
                    {copied ? "Copied!" : "Copy CSS"}
                  </button>
                </div>
              )}
            </div>
          </div>

          <p className="px-1 text-[10px] text-muted-foreground">
            Changes apply immediately sitewide. Save persists tokens to localStorage across page loads.
          </p>
        </aside>

        {/* ── Right: Preview ───────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-8">
          <TypographyPreview />
          <ButtonsPreview />
          <FormPreview />
          <CardPreview />
          <BadgesPreview />
          <NavigationPreview />
        </div>
      </div>
    </div>
  )
}
