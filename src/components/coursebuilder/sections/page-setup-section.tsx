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
import { computePageConfig } from "@/lib/page-config"
import { PageSetupPrintOptions, PrintOptions, DEFAULT_PRINT_OPTIONS } from "./page-setup-print-options"
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
  const [printOptions, setPrintOptions] = useState<PrintOptions>(DEFAULT_PRINT_OPTIONS)
  const headerFooter = { pageNumbers: true, courseTitle: false, date: false, studentName: false }

  const handlePrintChange = useCallback(
    <K extends keyof PrintOptions>(key: K, val: PrintOptions[K]) =>
      setPrintOptions((prev) => ({ ...prev, [key]: val })),
    []
  )

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
        color_mode:     printOptions.colorMode,
        header_footer:  headerFooter,
        ink_saver:      printOptions.inkSaver,
        bleed_mm:       printOptions.bleed,
        crop_marks:     printOptions.cropMarks,
        page_scaling:   printOptions.pageScaling,
        custom_scale:   printOptions.pageScaling === "custom" ? printOptions.customScale : null,
        duplex:         printOptions.duplex,
        export_quality: printOptions.exportQuality,
      },
    }

    const { error } = await updateCourseById(courseId, {
      generation_settings: { ...(existingGenerationSettingsRef.current ?? {}), ...pageSettings },
      updated_at: new Date().toISOString(),
    })

    if (!error) {
      onSaved?.(cfg)
    }
  }, [courseId, units, margins, size, orientation, pageCount, onSaved, printOptions, headerFooter])

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
                      ? "border border-[#9eb9da] bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
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
                      ? "border border-[#9eb9da] bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
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
                      ? "border border-[#9eb9da] bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
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

          <PageSetupPrintOptions value={printOptions} onChange={handlePrintChange} />
        </SetupColumn>

        {/* Visual preview */}
        <SetupColumn>
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <div
              className="relative rounded-sm border border-border bg-white shadow-md transition-all duration-200"
              style={{ width: previewW, height: previewH }}
            >
              {/* Bleed area */}
              {printOptions.bleed > 0 && (
                <div
                  className="absolute rounded-sm border border-dotted border-[#b87c5c]/50 bg-[#b87c5c]/5"
                  style={{
                    top:    `-${(printOptions.bleed / 10 / physH) * 100}%`,
                    bottom: `-${(printOptions.bleed / 10 / physH) * 100}%`,
                    left:   `-${(printOptions.bleed / 10 / physW) * 100}%`,
                    right:  `-${(printOptions.bleed / 10 / physW) * 100}%`,
                  }}
                />
              )}
              {/* Crop marks */}
              {printOptions.cropMarks && (
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
                      printOptions.colorMode === "bw" ? "bg-black/60" : printOptions.colorMode === "grayscale" ? "bg-gray-400/60" : "bg-muted-foreground/60"
                    }`}
                    style={{ width: `${70 + (i % 3) * 10}%` }}
                  />
                ))}
              </div>
              {/* Grayscale/BW overlay */}
              {printOptions.colorMode !== "color" && (
                <div className={`pointer-events-none absolute inset-0 rounded-sm ${
                  printOptions.colorMode === "bw" ? "mix-blend-saturation bg-white" : "mix-blend-saturation bg-gray-200/40"
                }`} />
              )}
            </div>
          </div>
        </SetupColumn>
      </SetupPanelLayout>
    </SetupSection>
  )
}
