"use client"

import { useState, useCallback, useRef } from "react"
import Cropper from "react-easy-crop"
import type { Area, Point } from "react-easy-crop"
import { Upload, ImageIcon, Sparkles, FlipHorizontal2, FlipVertical2, RotateCw, Crop, X, Check } from "lucide-react"

interface ImageEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

type FitMode = "contain" | "cover" | "fill"
type Preset  = "none" | "grayscale" | "sepia" | "invert"

function buildFilter(b: number, c: number, s: number, h: number, bl: number, preset: Preset): string {
  if (preset === "grayscale") return "grayscale(100%)"
  if (preset === "sepia")     return "sepia(90%)"
  if (preset === "invert")    return "invert(100%)"
  const parts = [`brightness(${b}%)`, `contrast(${c}%)`, `saturate(${s}%)`]
  if (h  !== 0)  parts.push(`hue-rotate(${h}deg)`)
  if (bl > 0)    parts.push(`blur(${bl}px)`)
  return parts.join(" ")
}

function buildTransform(flipH: boolean, flipV: boolean, rotation: number): string {
  const parts: string[] = []
  if (flipH)     parts.push("scaleX(-1)")
  if (flipV)     parts.push("scaleY(-1)")
  if (rotation)  parts.push(`rotate(${rotation}deg)`)
  return parts.length ? parts.join(" ") : "none"
}

async function makeCroppedDataUrl(src: string, px: Area): Promise<string> {
  const img = new Image()
  img.crossOrigin = "anonymous"
  img.src = src
  await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej() })
  const canvas = document.createElement("canvas")
  canvas.width  = px.width
  canvas.height = px.height
  canvas.getContext("2d")!.drawImage(img, px.x, px.y, px.width, px.height, 0, 0, px.width, px.height)
  return canvas.toDataURL("image/jpeg", 0.94)
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "none",      label: "Default" },
  { value: "grayscale", label: "B&W" },
  { value: "sepia",     label: "Sepia" },
  { value: "invert",    label: "Invert" },
]

export function ImageEditor({ content, onChange }: ImageEditorProps) {
  const [sourceTab,       setSourceTab]       = useState<"url" | "upload">("url")
  const [imgDims,         setImgDims]         = useState<{ w: number; h: number } | null>(null)
  const [cropMode,        setCropMode]        = useState(false)
  const [crop,            setCrop]            = useState<Point>({ x: 0, y: 0 })
  const [zoom,            setZoom]            = useState(1)
  const [cropPixels,      setCropPixels]      = useState<Area | null>(null)
  const [applying,        setApplying]        = useState(false)
  const urlDraftRef = useRef<string>("")
  const [urlDraft, setUrlDraft] = useState((content.url as string) || "")

  const url         = (content.url         as string)  || ""
  const alt         = (content.alt         as string)  || ""
  const caption     = (content.caption     as string)  || ""
  const attribution = (content.attribution as string)  || ""
  const fitMode     = ((content.fitMode    as FitMode) || "contain")
  const flipH       = (content.flipH       as boolean) || false
  const flipV       = (content.flipV       as boolean) || false
  const rotation    = (content.rotation    as number)  || 0
  const brightness  = (content.brightness  as number)  ?? 100
  const contrast    = (content.contrast    as number)  ?? 100
  const saturate    = (content.saturate    as number)  ?? 100
  const hue         = (content.hue         as number)  ?? 0
  const blur        = (content.blur        as number)  ?? 0
  const opacity     = (content.opacity     as number)  ?? 100
  const preset      = ((content.preset     as Preset)  || "none")

  const handleFileDrop = (files: FileList) => {
    const file = files[0]
    if (!file?.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = (ev) => onChange("url", ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const commitUrlDraft = useCallback(() => {
    if (urlDraftRef.current !== url) onChange("url", urlDraftRef.current)
  }, [url, onChange])

  const handleApplyCrop = async () => {
    if (!cropPixels || !url) return
    setApplying(true)
    try {
      const cropped = await makeCroppedDataUrl(url, cropPixels)
      onChange("url", cropped)
      setCropMode(false)
    } catch { /* swallow */ } finally { setApplying(false) }
  }

  const rotate90   = () => onChange("rotation", (rotation + 90) % 360)
  const resetAdj   = () => { onChange("brightness", 100); onChange("contrast", 100); onChange("saturate", 100); onChange("hue", 0); onChange("blur", 0); onChange("opacity", 100) }

  const imgStyle: React.CSSProperties = {
    width: "100%", height: "100%",
    objectFit: fitMode,
    filter:    buildFilter(brightness, contrast, saturate, hue, blur, preset),
    transform: buildTransform(flipH, flipV, rotation),
    opacity:   opacity / 100,
  }

  // Micro slider row — label abbrev | track | numeric value
  function AdjRow({ label, value, min, max, onVal }: { label: string; value: number; min: number; max: number; onVal: (v: number) => void }) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="w-[18px] shrink-0 text-[7.5px] font-bold uppercase tracking-wide text-neutral-400 select-none">{label}</span>
        <input
          type="range" min={min} max={max} value={value}
          onChange={(e) => onVal(Number(e.target.value))}
          className="h-0.5 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-neutral-900"
        />
        <span className="w-6 shrink-0 text-right font-mono text-[8px] text-neutral-500 select-none">{value}</span>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-white">

      {/* ── Source bar ─────────────────────── */}
      <div className="flex shrink-0 items-center gap-2 border-b border-neutral-100 px-3 py-2">
        <div className="flex shrink-0 gap-0.5">
          {(["url", "upload"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setSourceTab(tab)}
              className={[
                "rounded px-2 py-1 text-[9px] font-bold uppercase tracking-wider transition-all",
                sourceTab === tab ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" : "text-neutral-400 hover:bg-neutral-100",
              ].join(" ")}
            >
              {tab}
            </button>
          ))}
        </div>

        {sourceTab === "url" ? (
          <div className="flex min-w-0 flex-1 overflow-hidden rounded-md border border-neutral-200">
            <input
              type="text"
              value={urlDraft}
              placeholder="https://example.com/image.jpg"
              onChange={(e) => { setUrlDraft(e.target.value); urlDraftRef.current = e.target.value }}
              onBlur={commitUrlDraft}
              onKeyDown={(e) => e.key === "Enter" && commitUrlDraft()}
              className="min-w-0 flex-1 bg-neutral-50/80 px-2.5 py-1.5 text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none focus:bg-white"
            />
            <button
              type="button"
              onClick={commitUrlDraft}
              className="shrink-0 border-l border-neutral-200 bg-neutral-900 px-3 text-[10px] font-bold text-white hover:bg-neutral-800 transition-colors"
            >
              Load
            </button>
          </div>
        ) : (
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-dashed border-neutral-200 bg-neutral-50 px-3 py-1.5 text-[10px] text-neutral-500 hover:bg-neutral-100 transition-colors">
            <Upload size={12} />
            Browse or drop an image
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { if (e.target.files) handleFileDrop(e.target.files) }} />
          </label>
        )}
      </div>

      {/* ── Main: controls + preview ─────────── */}
      <div className="flex min-h-0 flex-1 border-b border-neutral-100">

        {/* Left controls panel */}
        <div className="flex w-36 shrink-0 flex-col overflow-y-auto border-r border-neutral-100">

          {/* Fit */}
          <div className="border-b border-neutral-100 px-2 py-2 space-y-0.5">
            {(["contain", "cover", "fill"] as FitMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChange("fitMode", mode)}
                className={[
                  "w-full rounded px-2 py-1 text-left text-[9px] font-bold uppercase tracking-wider transition-all",
                  fitMode === mode ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700",
                ].join(" ")}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Transform */}
          <div className="border-b border-neutral-100 px-2 py-2">
            <div className="flex gap-1">
              <button
                type="button"
                title="Flip horizontal"
                onClick={() => onChange("flipH", !flipH)}
                className={["flex flex-1 items-center justify-center rounded py-1.5 transition-all", flipH ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"].join(" ")}
              >
                <FlipHorizontal2 size={12} />
              </button>
              <button
                type="button"
                title="Flip vertical"
                onClick={() => onChange("flipV", !flipV)}
                className={["flex flex-1 items-center justify-center rounded py-1.5 transition-all", flipV ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"].join(" ")}
              >
                <FlipVertical2 size={12} />
              </button>
              <button
                type="button"
                title="Rotate 90°"
                onClick={rotate90}
                className="flex flex-1 items-center justify-center rounded bg-neutral-100 py-1.5 text-neutral-500 hover:bg-neutral-200 transition-all"
              >
                <RotateCw size={12} />
              </button>
            </div>
          </div>

          {/* Adjustments */}
          <div className="border-b border-neutral-100 px-2 py-2.5 space-y-2">
            <AdjRow label="Br" value={brightness} min={0}   max={200} onVal={(v) => onChange("brightness", v)} />
            <AdjRow label="Co" value={contrast}   min={0}   max={200} onVal={(v) => onChange("contrast",   v)} />
            <AdjRow label="Sa" value={saturate}   min={0}   max={200} onVal={(v) => onChange("saturate",   v)} />
            <AdjRow label="Hu" value={hue}        min={0}   max={360} onVal={(v) => onChange("hue",        v)} />
            <AdjRow label="Bl" value={blur}       min={0}   max={20}  onVal={(v) => onChange("blur",       v)} />
            <AdjRow label="Op" value={opacity}    min={10}  max={100} onVal={(v) => onChange("opacity",    v)} />
            <button
              type="button"
              onClick={resetAdj}
              className="w-full rounded px-2 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
            >
              Reset
            </button>
          </div>

          {/* Presets */}
          <div className="border-b border-neutral-100 px-2 py-2 space-y-0.5">
            {PRESETS.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => onChange("preset", p.value)}
                className={[
                  "w-full rounded px-2 py-0.5 text-left text-[9px] font-bold uppercase tracking-wider transition-all",
                  preset === p.value ? "bg-[#dbe8f6] text-[#233f5d] shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]" : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700",
                ].join(" ")}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Crop */}
          {url && (
            <div className="border-b border-neutral-100 px-2 py-2">
              <button
                type="button"
                onClick={() => { setCropMode(true); setCrop({ x: 0, y: 0 }); setZoom(1) }}
                className={["flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider transition-all", cropMode ? "bg-[#4a94ff] text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200 hover:text-neutral-700"].join(" ")}
              >
                <Crop size={10} />
                Crop
              </button>
            </div>
          )}

          {/* AI stub */}
          <div className="px-2 py-2">
            <button type="button" disabled className="flex w-full items-center gap-1.5 rounded px-2 py-1.5 text-[9px] font-bold uppercase tracking-wider text-neutral-300 cursor-not-allowed">
              <Sparkles size={10} />
              AI Gen
            </button>
          </div>
        </div>

        {/* Preview area */}
        <div className="relative flex-1 overflow-hidden">
          {url ? (
            cropMode ? (
              <>
                <Cropper
                  image={url}
                  crop={crop}
                  zoom={zoom}
                  aspect={undefined}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_, px) => setCropPixels(px)}
                  style={{ containerStyle: { position: "absolute", inset: 0 } }}
                />
                <div className="absolute bottom-2.5 right-2.5 z-20 flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCropMode(false)}
                    className="flex items-center gap-1 rounded-md bg-black/60 px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-black/80 transition-colors"
                  >
                    <X size={10} /> Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    disabled={applying}
                    className="flex items-center gap-1 rounded-md bg-[#4a94ff] px-2.5 py-1.5 text-[10px] font-bold text-white hover:bg-[#2b6cd2] disabled:opacity-60 transition-colors"
                  >
                    <Check size={10} /> Apply
                  </button>
                </div>
              </>
            ) : (
              <div className="relative h-full w-full bg-[repeating-conic-gradient(#f0f0f0_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt={alt || "Preview"}
                  style={imgStyle}
                  onLoad={(e) => { const i = e.currentTarget; setImgDims({ w: i.naturalWidth, h: i.naturalHeight }) }}
                  onError={() => setImgDims(null)}
                />
                {imgDims && (
                  <div className="absolute bottom-1.5 left-1.5 rounded bg-black/50 px-1.5 py-0.5 font-mono text-[8px] text-white">
                    {imgDims.w}×{imgDims.h}
                  </div>
                )}
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center bg-neutral-50">
              <div className="flex flex-col items-center gap-2">
                <ImageIcon size={24} className="text-neutral-300" />
                <p className="text-[11px] text-neutral-400">Load an image to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Metadata (no section headers) ─────── */}
      <div className="overflow-auto">
        <div className="border-b border-neutral-100 px-4 py-2.5">
          <div className="mb-1.5 flex items-center gap-1.5">
            <span className="text-[8px] font-bold uppercase tracking-widest text-neutral-400">Alt text</span>
            <span className="rounded bg-red-100 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-red-600">Required</span>
          </div>
          <input
            type="text"
            value={alt}
            placeholder="Describe this image for screen readers"
            onChange={(e) => onChange("alt", e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-neutral-50/80 px-2.5 py-1.5 text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all focus:border-[#4a94ff]/60 focus:bg-white"
          />
        </div>
        <div className="border-b border-neutral-100 px-4 py-2.5">
          <span className="mb-1.5 block text-[8px] font-bold uppercase tracking-widest text-neutral-400">Caption</span>
          <textarea
            value={caption}
            rows={2}
            placeholder="Optional caption shown below the image"
            onChange={(e) => onChange("caption", e.target.value)}
            className="w-full resize-none rounded-md border border-neutral-200 bg-neutral-50/80 px-2.5 py-1.5 text-[12px] leading-relaxed text-neutral-800 placeholder:text-neutral-400 outline-none transition-all focus:border-[#4a94ff]/60 focus:bg-white"
          />
        </div>
        <div className="px-4 py-2.5">
          <span className="mb-1.5 block text-[8px] font-bold uppercase tracking-widest text-neutral-400">Attribution</span>
          <input
            type="text"
            value={attribution}
            placeholder="Photo by … / CC BY 2.0"
            onChange={(e) => onChange("attribution", e.target.value)}
            className="w-full rounded-md border border-neutral-200 bg-neutral-50/80 px-2.5 py-1.5 text-[12px] text-neutral-800 placeholder:text-neutral-400 outline-none transition-all focus:border-[#4a94ff]/60 focus:bg-white"
          />
        </div>
      </div>
    </div>
  )
}
