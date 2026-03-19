"use client"

import { OverlineLabel } from "@/components/ui/overline-label"
import {
  FieldLabel,
  TextInput,
  SEGMENTED_CONTROL_GROUP_CLASS,
  SEGMENTED_CONTROL_BUTTON_BASE_CLASS,
  SEGMENTED_CONTROL_BUTTON_ACTIVE_CLASS,
  SEGMENTED_CONTROL_BUTTON_INACTIVE_CLASS,
  TOGGLE_SWITCH_TRACK_BASE_CLASS,
  TOGGLE_SWITCH_TRACK_ON_CLASS,
  TOGGLE_SWITCH_TRACK_OFF_CLASS,
} from "@/components/coursebuilder"

// ─── Print Options Type ───────────────────────────────────────────────────────

export interface PrintOptions {
  colorMode: "color" | "grayscale" | "bw"
  inkSaver: boolean
  bleed: number
  cropMarks: boolean
  pageScaling: "fit" | "actual" | "custom"
  customScale: number
  duplex: "none" | "long" | "short"
  exportQuality: "screen" | "print" | "high"
}

export const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  colorMode: "color",
  inkSaver: false,
  bleed: 0,
  cropMarks: false,
  pageScaling: "fit",
  customScale: 100,
  duplex: "none",
  exportQuality: "print",
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
  value: PrintOptions
  onChange: <K extends keyof PrintOptions>(key: K, val: PrintOptions[K]) => void
}

export function PageSetupPrintOptions({ value, onChange }: Props) {
  const { colorMode, inkSaver, bleed, cropMarks, pageScaling, customScale, duplex, exportQuality } = value

  return (
    <div className="border-t border-border pt-6">
      <OverlineLabel className="mb-4">Print Options</OverlineLabel>

      {/* Color mode */}
      <div className="mb-5">
        <FieldLabel>Color Mode</FieldLabel>
        <div className={SEGMENTED_CONTROL_GROUP_CLASS}>
          {(["color", "grayscale", "bw"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange("colorMode", m)}
              className={`${SEGMENTED_CONTROL_BUTTON_BASE_CLASS} ${
                colorMode === m
                  ? SEGMENTED_CONTROL_BUTTON_ACTIVE_CLASS
                  : SEGMENTED_CONTROL_BUTTON_INACTIVE_CLASS
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
            onClick={() => onChange("inkSaver", !inkSaver)}
            className={`${TOGGLE_SWITCH_TRACK_BASE_CLASS} ${
              inkSaver ? TOGGLE_SWITCH_TRACK_ON_CLASS : TOGGLE_SWITCH_TRACK_OFF_CLASS
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
            onChange={(e) => onChange("bleed", parseFloat(e.target.value) || 0)}
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
              onClick={() => onChange("cropMarks", !cropMarks)}
              className={`${TOGGLE_SWITCH_TRACK_BASE_CLASS} ${
                cropMarks ? TOGGLE_SWITCH_TRACK_ON_CLASS : TOGGLE_SWITCH_TRACK_OFF_CLASS
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
        <div className={SEGMENTED_CONTROL_GROUP_CLASS}>
          {(["fit", "actual", "custom"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChange("pageScaling", s)}
              className={`${SEGMENTED_CONTROL_BUTTON_BASE_CLASS} capitalize ${
                pageScaling === s
                  ? SEGMENTED_CONTROL_BUTTON_ACTIVE_CLASS
                  : SEGMENTED_CONTROL_BUTTON_INACTIVE_CLASS
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
              onChange={(e) => onChange("customScale", Math.max(25, Math.min(400, parseInt(e.target.value) || 100)))}
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
        )}
      </div>

      {/* Duplex */}
      <div className="mb-5">
        <FieldLabel>Duplex Binding</FieldLabel>
        <div className={SEGMENTED_CONTROL_GROUP_CLASS}>
          {(["none", "long", "short"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onChange("duplex", d)}
              className={`${SEGMENTED_CONTROL_BUTTON_BASE_CLASS} ${
                duplex === d
                  ? SEGMENTED_CONTROL_BUTTON_ACTIVE_CLASS
                  : SEGMENTED_CONTROL_BUTTON_INACTIVE_CLASS
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
        <div className={SEGMENTED_CONTROL_GROUP_CLASS}>
          {(["screen", "print", "high"] as const).map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => onChange("exportQuality", q)}
              className={`${SEGMENTED_CONTROL_BUTTON_BASE_CLASS} ${
                exportQuality === q
                  ? SEGMENTED_CONTROL_BUTTON_ACTIVE_CLASS
                  : SEGMENTED_CONTROL_BUTTON_INACTIVE_CLASS
              }`}
            >
              {q === "screen" ? "Screen (150 DPI)" : q === "print" ? "Print (300 DPI)" : "High (600 DPI)"}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
