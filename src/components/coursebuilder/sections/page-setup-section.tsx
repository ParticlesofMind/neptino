"use client"

import { useState, useCallback, useRef } from "react"
import {
  FieldLabel,
  TextInput,
  updateCourseById,
  useCourseRowLoader,
  useDebouncedChangeSave,
  SetupSection,
  SetupPanelLayout,
  SetupColumn,
} from "@/components/coursebuilder"
import { OverlineLabel } from "@/components/ui/overline-label"
import { computePageConfig } from "@/lib/page-config"
import type { CanvasPageConfig } from "@/lib/page-config"

const PAGE_DIMS = {
  a4:          { w: 21,    h: 29.7  },
  "us-letter": { w: 21.59, h: 27.94 },
}

const PAGE_LABELS = {
  a4:          { cm: "A4 (21.0 × 29.7 cm)",        inches: 'A4 (8.27″ × 11.69″)'        },
  "us-letter": { cm: "US Letter (21.6 × 27.9 cm)", inches: 'US Letter (8.5″ × 11″)'      },
}

export function PageSetupSection({
  courseId,
  initialConfig,
  onSaved,
}: {
  courseId?:      string | null
  initialConfig?: CanvasPageConfig | null
  onSaved?:       (cfg: CanvasPageConfig) => void
}) {
  const [units, setUnits]             = useState<"cm" | "inches">("cm")
  const [orientation, setOrientation] = useState<"portrait" | "landscape">("portrait")
  const [size, setSize]               = useState<"a4" | "us-letter">("a4")
  const [pageCount]                   = useState(initialConfig?.pageCount ?? 1)
  const [margins, setMargins]         = useState({ top: 2.54, bottom: 2.54, left: 2.54, right: 2.54 })
  const existingGenerationSettingsRef = useRef<Record<string, unknown> | null>(null)

  useCourseRowLoader<{ generation_settings: Record<string, unknown> | null }>({
    courseId: courseId ?? null,
    select: "generation_settings",
    onLoaded: (row) => {
      existingGenerationSettingsRef.current = row.generation_settings
    },
  })

  // ── Print options ──
  const [colorMode, setColorMode]         = useState<"color" | "grayscale" | "bw">("color")
  const [headerFooter]                    = useState({ pageNumbers: true, courseTitle: false, date: false, studentName: false })
  const [inkSaver, setInkSaver]           = useState(false)
  const [bleed, setBleed]                 = useState(0)
  const [cropMarks, setCropMarks]         = useState(false)
  const [pageScaling, setPageScaling]     = useState<"fit" | "actual" | "custom">("fit")
  const [customScale, setCustomScale]     = useState(100)
  const [duplex, setDuplex]               = useState<"none" | "long" | "short">("none")
  const [exportQuality, setExportQuality] = useState<"screen" | "print" | "high">("print")

  const updateMargin = (side: keyof typeof margins, val: string) =>
    setMargins((prev) => ({ ...prev, [side]: parseFloat(val) || 0 }))

  const handleSave = useCallback(async () => {
    if (!courseId) return

    const factor = units === "cm" ? 10 : 25.4
    const marginsMm = {
      top:    margins.top    * factor,
      right:  margins.right  * factor,
      bottom: margins.bottom * factor,
      left:   margins.left   * factor,
    }
    const cfg = computePageConfig(size, orientation, pageCount, marginsMm)

    const pageSettings = {
      page_size:        size,
      page_orientation: orientation,
      page_count:       pageCount,
      margins_mm:       marginsMm,
      print_options: {
        color_mode:     colorMode,
        header_footer:  headerFooter,
        ink_saver:      inkSaver,
        bleed_mm:       bleed,
        crop_marks:     cropMarks,
        page_scaling:   pageScaling,
        custom_scale:   pageScaling === "custom" ? customScale : null,
        duplex,
        export_quality: exportQuality,
      },
    }

    const { error } = await updateCourseById(courseId, {
      generation_settings: { ...(existingGenerationSettingsRef.current ?? {}), ...pageSettings },
      updated_at: new Date().toISOString(),
    })

    if (!error) {
      onSaved?.(cfg)
    }
  }, [courseId, units, margins, size, orientation, pageCount, onSaved, colorMode, headerFooter, inkSaver, bleed, cropMarks, pageScaling, customScale, duplex, exportQuality])

  useDebouncedChangeSave(handleSave, 800, Boolean(courseId))

  const isLandscape = orientation === "landscape"
  const { w, h } = PAGE_DIMS[size]
  const physW = isLandscape ? h : w
  const physH = isLandscape ? w : h
  const previewW = 480
  const previewH = Math.round(previewW * (physH / physW))

  return (
    <SetupSection title="Page Setup" description="Configure the canvas dimensions and margins for lesson pages.">
      <SetupPanelLayout>
        {/* Config */}
        <SetupColumn className="space-y-6">
          {/* Units toggle */}
          <div>
            <FieldLabel>Units</FieldLabel>
            <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
              {(["cm", "inches"] as const).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnits(u)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    units === u
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {u === "cm" ? "Metric (cm)" : "Imperial (in)"}
                </button>
              ))}
            </div>
          </div>

          {/* Page size toggle */}
          <div>
            <FieldLabel>Page Size</FieldLabel>
            <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
              {(["a4", "us-letter"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                    size === s
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s === "a4" ? "A4" : "US Letter"}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">{PAGE_LABELS[size][units]}</p>
          </div>

          {/* Orientation toggle */}
          <div>
            <FieldLabel>Orientation</FieldLabel>
            <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
              {(["portrait", "landscape"] as const).map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => setOrientation(o)}
                  className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition ${
                    orientation === o
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {/* Margins */}
          <div>
            <FieldLabel>Margins ({units})</FieldLabel>
            <div className="grid gap-3 grid-cols-2">
              {(["top", "bottom", "left", "right"] as const).map((side) => (
                <div key={side}>
                  <span className="mb-1 block text-xs text-muted-foreground">{side.charAt(0).toUpperCase() + side.slice(1)}</span>
                  <TextInput
                    type="number"
                    step={0.01}
                    min={0}
                    max={10}
                    value={margins[side]}
                    onChange={(e) => updateMargin(side, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Print Options ── */}
          <div className="border-t border-border pt-6">
            <OverlineLabel className="mb-4">Print Options</OverlineLabel>

            {/* Color mode */}
            <div className="mb-5">
              <FieldLabel>Color Mode</FieldLabel>
              <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {(["color", "grayscale", "bw"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setColorMode(m)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                      colorMode === m
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "color" ? "Full Color" : m === "grayscale" ? "Grayscale" : "B & W"}
                  </button>
                ))}
              </div>
            </div>

            {/* Ink saver */}
            <div className="mb-5">
              <label className="flex cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2.5">
                <div>
                  <span className="text-xs font-medium text-foreground">Ink Saver Mode</span>
                  <p className="text-[11px] text-muted-foreground">Reduces backgrounds &amp; color saturation</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={inkSaver}
                  onClick={() => setInkSaver((v) => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                    inkSaver ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition ${
                    inkSaver ? "translate-x-[18px]" : "translate-x-[2px]"
                  }`} />
                </button>
              </label>
            </div>

            {/* Bleed & Crop marks */}
            <div className="mb-5 grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Bleed (mm)</FieldLabel>
                <TextInput
                  type="number"
                  step={0.5}
                  min={0}
                  max={10}
                  value={bleed}
                  onChange={(e) => setBleed(parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <FieldLabel>Crop Marks</FieldLabel>
                <label className="flex cursor-pointer items-center justify-between rounded-md border border-border px-3 py-2">
                  <span className="text-xs text-foreground">{cropMarks ? "Enabled" : "Disabled"}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={cropMarks}
                    onClick={() => setCropMarks((v) => !v)}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
                      cropMarks ? "bg-primary" : "bg-muted"
                    }`}
                  >
                    <span className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition ${
                      cropMarks ? "translate-x-[18px]" : "translate-x-[2px]"
                    }`} />
                  </button>
                </label>
              </div>
            </div>

            {/* Page scaling */}
            <div className="mb-5">
              <FieldLabel>Page Scaling</FieldLabel>
              <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {(["fit", "actual", "custom"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setPageScaling(s)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium capitalize transition ${
                      pageScaling === s
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s === "fit" ? "Fit to Page" : s === "actual" ? "Actual Size" : "Custom"}
                  </button>
                ))}
              </div>
              {pageScaling === "custom" && (
                <div className="mt-2 flex items-center gap-2">
                  <TextInput
                    type="number"
                    min={25}
                    max={400}
                    step={5}
                    value={customScale}
                    onChange={(e) => setCustomScale(Math.max(25, Math.min(400, parseInt(e.target.value) || 100)))}
                  />
                  <span className="text-xs text-muted-foreground">%</span>
                </div>
              )}
            </div>

            {/* Duplex */}
            <div className="mb-5">
              <FieldLabel>Duplex Binding</FieldLabel>
              <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {(["none", "long", "short"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDuplex(d)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                      duplex === d
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {d === "none" ? "Single-Sided" : d === "long" ? "Long Edge" : "Short Edge"}
                  </button>
                ))}
              </div>
            </div>

            {/* Export quality */}
            <div>
              <FieldLabel>Export Quality</FieldLabel>
              <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
                {(["screen", "print", "high"] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setExportQuality(q)}
                    className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition ${
                      exportQuality === q
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {q === "screen" ? "Screen (150 DPI)" : q === "print" ? "Print (300 DPI)" : "High (600 DPI)"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SetupColumn>

        {/* Visual preview */}
        <SetupColumn>
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div
              className="relative rounded-sm border border-border bg-white shadow-md transition-all duration-200"
              style={{ width: previewW, height: previewH }}
            >
              {/* Bleed area */}
              {bleed > 0 && (
                <div
                  className="absolute rounded-sm border border-dotted border-orange-400/50 bg-orange-400/5"
                  style={{
                    top:    `-${(bleed / 10 / physH) * 100}%`,
                    bottom: `-${(bleed / 10 / physH) * 100}%`,
                    left:   `-${(bleed / 10 / physW) * 100}%`,
                    right:  `-${(bleed / 10 / physW) * 100}%`,
                  }}
                />
              )}
              {/* Crop marks */}
              {cropMarks && (
                <>
                  <div className="absolute -top-3 left-0 h-3 w-px bg-foreground/40" />
                  <div className="absolute top-0 -left-3 h-px w-3 bg-foreground/40" />
                  <div className="absolute -top-3 right-0 h-3 w-px bg-foreground/40" />
                  <div className="absolute top-0 -right-3 h-px w-3 bg-foreground/40" />
                  <div className="absolute -bottom-3 left-0 h-3 w-px bg-foreground/40" />
                  <div className="absolute bottom-0 -left-3 h-px w-3 bg-foreground/40" />
                  <div className="absolute -bottom-3 right-0 h-3 w-px bg-foreground/40" />
                  <div className="absolute bottom-0 -right-3 h-px w-3 bg-foreground/40" />
                </>
              )}
              {/* Margin area */}
              <div
                className="absolute rounded-sm border border-dashed border-primary/30 bg-primary/[0.03]"
                style={{
                  top:    `${(margins.top    / physH) * 100}%`,
                  bottom: `${(margins.bottom / physH) * 100}%`,
                  left:   `${(margins.left   / physW) * 100}%`,
                  right:  `${(margins.right  / physW) * 100}%`,
                }}
              />
              {/* Fake content lines */}
              <div
                className="absolute flex flex-col gap-[6px] opacity-30"
                style={{
                  top:   `calc(${(margins.top  / physH) * 100}% + 8px)`,
                  left:  `calc(${(margins.left / physW) * 100}% + 8px)`,
                  right: `calc(${(margins.right / physW) * 100}% + 8px)`,
                }}
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-[3px] rounded-full ${
                      colorMode === "bw" ? "bg-black/60" : colorMode === "grayscale" ? "bg-gray-400/60" : "bg-muted-foreground/60"
                    }`}
                    style={{ width: `${70 + (i % 3) * 10}%` }}
                  />
                ))}
              </div>
              {/* Grayscale/BW overlay */}
              {colorMode !== "color" && (
                <div className={`pointer-events-none absolute inset-0 rounded-sm ${
                  colorMode === "bw" ? "mix-blend-saturation bg-white" : "mix-blend-saturation bg-gray-200/40"
                }`} />
              )}
            </div>
          </div>
        </SetupColumn>
      </SetupPanelLayout>
    </SetupSection>
  )
}
