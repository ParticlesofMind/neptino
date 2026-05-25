"use client"

import {
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  RotateCw,
  Upload,
} from "lucide-react"
import {
  StudioActionButton,
  StudioDropZone,
  StudioFieldGrid,
  StudioInput,
  StudioOptionsPanel,
  StudioSection,
  StudioSegment,
  StudioSlider,
  StudioTextarea,
  StudioUrlInput,
} from "./studio-primitives"

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
    <StudioOptionsPanel>
      <StudioSection
        label="Source"
        description="Choose the image asset before adjusting presentation details."
        priority="primary"
      >
        <StudioSegment
          options={[
            { value: "url", label: "URL" },
            { value: "upload", label: "Upload" },
          ]}
          value={sourceTab}
          onChange={onSourceTabChange}
        />
        {sourceTab === "url" ? (
          <StudioUrlInput
            value={urlDraft}
            placeholder="https://example.com/image.jpg"
            onValueChange={onUrlDraftChange}
            onCommit={onCommitUrl}
            commitOnChange={false}
          />
        ) : (
          <StudioDropZone
            icon={<Upload size={20} />}
            label="Browse or drop an image"
            hint="PNG, JPG, WebP, or GIF"
            accept="image/*"
            onDrop={onUploadChange}
            compact
          />
        )}
      </StudioSection>

      <StudioSection label="Display">
        <StudioSegment<FitMode>
          label="Fit"
          options={[
            { value: "contain", label: "Contain" },
            { value: "cover", label: "Cover" },
            { value: "fill", label: "Fill" },
          ]}
          value={fitMode}
          onChange={(mode) => onValueChange("fitMode", mode)}
        />

        <StudioFieldGrid columns={3}>
          <button
            type="button"
            title="Flip horizontal"
            onClick={() => onValueChange("flipH", !flipH)}
            className={[
              "flex min-h-8 items-center justify-center rounded-md transition-all",
              flipH
                ? "bg-[#dbe8f6] text-[#3a6ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
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
              "flex min-h-8 items-center justify-center rounded-md transition-all",
              flipV
                ? "bg-[#dbe8f6] text-[#3a6ea0] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
                : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
            ].join(" ")}
          >
            <FlipVertical2 size={14} />
          </button>
          <button
            type="button"
            title="Rotate 90°"
            onClick={onRotate}
            className="flex min-h-8 items-center justify-center rounded-md bg-neutral-100 text-neutral-500 transition-all hover:bg-neutral-200"
          >
            <RotateCw size={14} />
          </button>
        </StudioFieldGrid>
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
        <StudioSlider label="Brightness" value={brightness} min={0} max={200} onChange={(value) => onValueChange("brightness", value)} />
        <StudioSlider label="Contrast" value={contrast} min={0} max={200} onChange={(value) => onValueChange("contrast", value)} />
        <StudioSlider label="Saturation" value={saturate} min={0} max={200} onChange={(value) => onValueChange("saturate", value)} />
        <StudioSlider label="Hue" value={hue} min={0} max={360} format={(value) => `${value}°`} onChange={(value) => onValueChange("hue", value)} />
        <StudioSlider label="Blur" value={blur} min={0} max={20} format={(value) => `${value}px`} onChange={(value) => onValueChange("blur", value)} />
        <StudioSlider label="Opacity" value={opacity} min={10} max={100} format={(value) => `${value}%`} onChange={(value) => onValueChange("opacity", value)} />
      </StudioSection>

      <StudioSection label="Presets">
        <StudioSegment<Preset>
          options={IMAGE_PRESETS}
          value={preset}
          onChange={(value) => onValueChange("preset", value)}
        />
      </StudioSection>

      <StudioSection label="Tools">
        <StudioActionButton
          label={cropMode ? "Cropping" : "Crop image"}
          icon={<Crop size={13} />}
          onClick={onStartCrop}
          disabled={!url}
          variant={cropMode ? "primary" : "outline"}
          size="md"
        />
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
    </StudioOptionsPanel>
  )
}
