"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import Cropper from "react-easy-crop"
import type { Area, Point } from "react-easy-crop"
import { ImageIcon, X, Check } from "lucide-react"
import {
  ImageEditorSidebar,
  type FitMode,
  type Preset,
} from "./image-editor-sidebar"
import { EditorPreviewFrame } from "./editor-preview-frame"
import { MAKE_BLUE_BUTTON } from "../make-theme"

interface ImageEditorProps {
  content: Record<string, unknown>
  onChange: (key: string, value: unknown) => void
}

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

export function ImageEditor({ content, onChange }: ImageEditorProps) {
  const [sourceTab,       setSourceTab]       = useState<"url" | "upload">("url")
  const [cropMode,        setCropMode]        = useState(false)
  const [crop,            setCrop]            = useState<Point>({ x: 0, y: 0 })
  const [zoom,            setZoom]            = useState(1)
  const [cropPixels,      setCropPixels]      = useState<Area | null>(null)
  const [applying,        setApplying]        = useState(false)
  const urlDraftRef = useRef<string>("")
  const [urlDraft, setUrlDraft] = useState((content.url as string) || "")

  const url         = (content.url         as string)  || ""
  const title       = (content.title       as string)  || ""
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

  useEffect(() => {
    setUrlDraft(url)
    urlDraftRef.current = url
  }, [url])

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

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white md:flex-row">
      <div className="w-full shrink-0 border-b border-neutral-100 md:min-h-0 md:w-[26rem] md:border-b-0 md:border-r md:border-neutral-200 xl:w-[30rem]">
        <ImageEditorSidebar
          sourceTab={sourceTab}
          urlDraft={urlDraft}
          url={url}
          alt={alt}
          caption={caption}
          attribution={attribution}
          fitMode={fitMode}
          flipH={flipH}
          flipV={flipV}
          preset={preset}
          brightness={brightness}
          contrast={contrast}
          saturate={saturate}
          hue={hue}
          blur={blur}
          opacity={opacity}
          cropMode={cropMode}
          onSourceTabChange={setSourceTab}
          onUrlDraftChange={(value) => {
            setUrlDraft(value)
            urlDraftRef.current = value
          }}
          onCommitUrl={commitUrlDraft}
          onUploadChange={handleFileDrop}
          onValueChange={onChange}
          onRotate={rotate90}
          onResetAdjustments={resetAdj}
          onStartCrop={() => {
            setCropMode(true)
            setCrop({ x: 0, y: 0 })
            setZoom(1)
          }}
        />
      </div>

      <div className="min-h-0 min-w-0 flex-1 bg-[#f5f7fb]">
        <div className="relative min-h-0 h-full overflow-hidden">
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
                      className="flex min-h-10 items-center gap-1 rounded-md border border-neutral-200 bg-white px-3.5 py-2.5 text-[10px] font-bold text-neutral-700 transition-colors hover:bg-neutral-50"
                    >
                      <X size={10} /> Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleApplyCrop}
                      disabled={applying}
                      className={`flex min-h-10 items-center gap-1 rounded-md border px-3.5 py-2.5 text-[10px] font-bold transition-colors ${MAKE_BLUE_BUTTON} disabled:opacity-60`}
                    >
                      <Check size={10} /> Apply
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex h-full items-center justify-center p-4 md:p-6">
                  <EditorPreviewFrame
                    cardType="image"
                    title={title}
                    onTitleChange={(next) => onChange("title", next)}
                    className="h-full w-full"
                    bodyClassName="relative h-[calc(100%-4.5rem)] min-h-[20rem] overflow-hidden bg-[repeating-conic-gradient(#f0f0f0_0%_25%,transparent_0%_50%)] bg-[length:12px_12px]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt={alt || "Preview"}
                      style={imgStyle}
                    />
                  </EditorPreviewFrame>
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center px-4 md:px-6">
                <EditorPreviewFrame
                  cardType="image"
                  title={title}
                  onTitleChange={(next) => onChange("title", next)}
                  className="w-full max-w-md"
                  bodyClassName="flex flex-col items-center gap-3 bg-white/75 px-8 py-12 text-center"
                >
                  <ImageIcon size={28} className="text-neutral-300" />
                  <p className="text-[13px] font-medium text-neutral-700">No image loaded</p>
                  <p className="text-[11px] leading-relaxed text-neutral-400">
                    Add a remote image URL or upload a file from the source panel.
                  </p>
                </EditorPreviewFrame>
              </div>
            )}
        </div>
      </div>
    </div>
  )
}
