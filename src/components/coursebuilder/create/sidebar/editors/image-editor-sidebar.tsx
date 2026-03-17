"use client"

import {
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  RotateCw,
  Sparkles,
  Upload,
} from "lucide-react"
import {
  SectionLabel,
  StudioInput,
  StudioSection,
  StudioTextarea,
} from "./studio-primitives"
import { MAKE_BLUE_ACTIVE_SOFT } from "../make-theme"

export type FitMode = "contain" | "cover" | "fill"
export type Preset = "none" | "grayscale" | "sepia" | "invert"

export const IMAGE_PRESETS: { value: Preset; label: string }[] = [
  { value: "none", label: "Default" },
  { value: "grayscale", label: "B&W" },
  { value: "sepia", label: "Sepia" },
  { value: "invert", label: "Invert" },
]

interface ImageEditorSidebarProps {
  sourceTab: "url" | "upload"
  urlDraft: string
  url: string
  alt: string
  caption: string
  attribution: string
  fitMode: FitMode
  flipH: boolean
  flipV: boolean
  preset: Preset
  brightness: number
  contrast: number
  saturate: number
  hue: number
  blur: number
  opacity: number
  cropMode: boolean
  onSourceTabChange: (tab: "url" | "upload") => void
  onUrlDraftChange: (value: string) => void
  onCommitUrl: () => void
  onUploadChange: (files: FileList) => void
  onValueChange: (key: string, value: unknown) => void
  onRotate: () => void
  onResetAdjustments: () => void
  onStartCrop: () => void
}

function AdjustmentRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <SectionLabel>{label}</SectionLabel>
        <span className="text-[10px] font-mono text-neutral-500">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-neutral-900"
      />
    </div>
  )
}

export function ImageEditorSidebar({
  sourceTab,
  urlDraft,
  url,
  alt,
  caption,
  attribution,
  fitMode,
  flipH,
  flipV,
  preset,
  brightness,
  contrast,
  saturate,
  hue,
  blur,
  opacity,
  cropMode,
  onSourceTabChange,
  onUrlDraftChange,
  onCommitUrl,
  onUploadChange,
  onValueChange,
  onRotate,
  onResetAdjustments,
  onStartCrop,
}: ImageEditorSidebarProps) {
  return (
    <aside className="flex h-full w-full flex-col overflow-hidden bg-white">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <StudioSection label="Source">
          <div className="flex gap-1 rounded-lg bg-neutral-100 p-1">
            {(["url", "upload"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => onSourceTabChange(tab)}
                className={[
                  "flex-1 rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all",
                  sourceTab === tab
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700",
                ].join(" ")}
              >
                {tab}
              </button>
            ))}
          </div>

          {sourceTab === "url" ? (
            <div className="flex overflow-hidden rounded-md border border-neutral-200 bg-neutral-50/80">
              <input
                type="text"
                value={urlDraft}
                placeholder="https://example.com/image.jpg"
                onChange={(event) => onUrlDraftChange(event.target.value)}
                onBlur={onCommitUrl}
                onKeyDown={(event) => event.key === "Enter" && onCommitUrl()}
                className="min-h-10 min-w-0 flex-1 bg-transparent px-3 py-2.5 text-[12px] text-neutral-800 outline-none"
              />
              <button
                type="button"
                onClick={onCommitUrl}
                className="min-h-10 shrink-0 border-l border-neutral-200 bg-white px-3.5 text-[10px] font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                Load
              </button>
            </div>
          ) : (
            <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] text-neutral-600 transition-colors hover:bg-neutral-100">
              <Upload size={14} />
              Browse or drop an image
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files) onUploadChange(event.target.files)
                }}
              />
            </label>
          )}
        </StudioSection>

        <StudioSection label="Display">
          <div className="grid grid-cols-3 gap-2">
            {(["contain", "cover", "fill"] as FitMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onValueChange("fitMode", mode)}
                className={[
                  "min-h-10 rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all",
                  fitMode === mode
                    ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700",
                ].join(" ")}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              title="Flip horizontal"
              onClick={() => onValueChange("flipH", !flipH)}
              className={[
                "flex min-h-10 items-center justify-center rounded-md transition-all",
                flipH
                  ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
              ].join(" ")}
            >
              <FlipHorizontal2 size={14} />
            </button>
            <button
              type="button"
              title="Flip vertical"
              onClick={() => onValueChange("flipV", !flipV)}
              className={[
                "flex min-h-10 items-center justify-center rounded-md transition-all",
                flipV
                  ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
              ].join(" ")}
            >
              <FlipVertical2 size={14} />
            </button>
            <button
              type="button"
              title="Rotate 90°"
              onClick={onRotate}
              className="flex min-h-10 items-center justify-center rounded-md bg-neutral-100 text-neutral-500 transition-all hover:bg-neutral-200"
            >
              <RotateCw size={14} />
            </button>
          </div>
        </StudioSection>

        <StudioSection
          label="Adjustments"
          action={(
            <button
              type="button"
              onClick={onResetAdjustments}
              className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400 transition-colors hover:text-neutral-700"
            >
              Reset
            </button>
          )}
        >
          <AdjustmentRow label="Brightness" value={brightness} min={0} max={200} onChange={(value) => onValueChange("brightness", value)} />
          <AdjustmentRow label="Contrast" value={contrast} min={0} max={200} onChange={(value) => onValueChange("contrast", value)} />
          <AdjustmentRow label="Saturation" value={saturate} min={0} max={200} onChange={(value) => onValueChange("saturate", value)} />
          <AdjustmentRow label="Hue" value={hue} min={0} max={360} onChange={(value) => onValueChange("hue", value)} />
          <AdjustmentRow label="Blur" value={blur} min={0} max={20} onChange={(value) => onValueChange("blur", value)} />
          <AdjustmentRow label="Opacity" value={opacity} min={10} max={100} onChange={(value) => onValueChange("opacity", value)} />
        </StudioSection>

        <StudioSection label="Presets">
          <div className="grid grid-cols-2 gap-2">
            {IMAGE_PRESETS.map((entry) => (
              <button
                key={entry.value}
                type="button"
                onClick={() => onValueChange("preset", entry.value)}
                className={[
                  "min-h-10 rounded-md px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-[0.14em] transition-all",
                  preset === entry.value
                    ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700",
                ].join(" ")}
              >
                {entry.label}
              </button>
            ))}
          </div>
        </StudioSection>

        <StudioSection label="Tools">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onStartCrop}
              disabled={!url}
              className={[
                "flex min-h-10 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition-all",
                cropMode
                  ? MAKE_BLUE_ACTIVE_SOFT
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700",
                !url && "cursor-not-allowed opacity-40",
              ].filter(Boolean).join(" ")}
            >
              <Crop size={13} />
              Crop
            </button>
            <button
              type="button"
              disabled
              className="flex min-h-10 cursor-not-allowed items-center justify-center gap-1.5 rounded-md bg-neutral-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-300"
            >
              <Sparkles size={13} />
              AI Gen
            </button>
          </div>
        </StudioSection>

        <StudioSection label="Metadata" noBorder>
          <StudioInput
            label="Alt text"
            badge="Required"
            badgeVariant="required"
            value={alt}
            placeholder="Describe this image for screen readers"
            onChange={(event) => onValueChange("alt", event.target.value)}
          />
          <StudioTextarea
            label="Caption"
            rows={3}
            value={caption}
            placeholder="Optional caption shown below the image"
            onChange={(event) => onValueChange("caption", event.target.value)}
          />
          <StudioInput
            label="Attribution"
            value={attribution}
            placeholder="Photo by ... / CC BY 2.0"
            onChange={(event) => onValueChange("attribution", event.target.value)}
          />
        </StudioSection>
      </div>
    </aside>
  )
}