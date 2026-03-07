"use client"

import type React from "react"
import type { DroppedCard } from "../../types"

interface ImageCardProps {
  card: DroppedCard
  onRemove?: () => void
}

type FitMode = "contain" | "cover" | "fill"
type Preset  = "none" | "grayscale" | "sepia" | "invert"

export function ImageCard({ card, onRemove }: ImageCardProps) {
  const url         = (card.content["url"]         as string)  || ""
  const alt         = (card.content["alt"]         as string)  || ""
  const title       = (card.content["title"]       as string)  || ""
  const fitMode     = ((card.content["fitMode"]     as FitMode) || "contain")
  const flipH       = (card.content["flipH"]        as boolean) || false
  const flipV       = (card.content["flipV"]        as boolean) || false
  const rotation    = (card.content["rotation"]     as number)  || 0
  const brightness  = (card.content["brightness"]   as number)  ?? 100
  const contrast    = (card.content["contrast"]     as number)  ?? 100
  const saturate    = (card.content["saturate"]     as number)  ?? 100
  const hue         = (card.content["hue"]          as number)  ?? 0
  const blur        = (card.content["blur"]          as number)  ?? 0
  const opacity     = (card.content["opacity"]      as number)  ?? 100
  const preset      = ((card.content["preset"]      as Preset)  || "none")

  const filterStr = (() => {
    if (preset === "grayscale") return "grayscale(100%)"
    if (preset === "sepia")     return "sepia(90%)"
    if (preset === "invert")    return "invert(100%)"
    const p = [`brightness(${brightness}%)`, `contrast(${contrast}%)`, `saturate(${saturate}%)`]
    if (hue  !== 0) p.push(`hue-rotate(${hue}deg)`)
    if (blur > 0)   p.push(`blur(${blur}px)`)
    return p.join(" ")
  })()

  const transformParts: string[] = []
  if (flipH)    transformParts.push("scaleX(-1)")
  if (flipV)    transformParts.push("scaleY(-1)")
  if (rotation) transformParts.push(`rotate(${rotation}deg)`)

  const imgStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    objectFit: fitMode,
    filter: filterStr,
    transform: transformParts.length ? transformParts.join(" ") : undefined,
    opacity: opacity / 100,
    maxHeight: card.dimensions.height || 200,
  }

  return (
    <div className="group relative rounded border border-neutral-200 bg-white shadow-sm overflow-hidden">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute right-1 top-1 z-10 hidden h-5 w-5 items-center justify-center rounded bg-white/80 text-neutral-400 shadow hover:text-neutral-600 group-hover:flex"
          aria-label="Remove"
        >
          &times;
        </button>
      )}
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={alt || title || "Image"} className="block" style={imgStyle} />
      ) : (
        <div
          className="flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs italic"
          style={{ height: 80 }}
        >
          No image
        </div>
      )}
      {title && (
        <div className="px-2 py-1 text-[10px] text-neutral-500 border-t border-neutral-100">
          {title}
        </div>
      )}
    </div>
  )
}
