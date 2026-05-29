"use client"

import type React from "react"
import type { CardRenderProps } from "../CardRegistry"
import { ResourceCardFrame } from "./ResourceCardFrame"
import { PretextText } from "../../text/PretextText"

type FitMode = "contain" | "cover" | "fill"
type Preset  = "none" | "grayscale" | "sepia" | "invert"

export function ImageCard({ card, onRemove, fillAvailable }: CardRenderProps) {
  const url         = (card.content["url"]         as string)  || ""
  const alt         = (card.content["alt"]         as string)  || ""
  const title       = (card.content["title"]       as string)  || ""
  const caption     = (card.content["caption"]     as string)  || ""
  const attribution = (card.content["attribution"] as string)  || ""
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
    maxHeight: fillAvailable ? undefined : card.dimensions.height || 200,
  }

  return (
    <ResourceCardFrame card={card} onRemove={onRemove} fillAvailable={fillAvailable} bodyClassName="p-0">
      {url ? (
        <div className={["relative overflow-hidden", fillAvailable ? "h-full min-h-0" : ""].join(" ")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={alt || title || "Image"} className="block" style={imgStyle} />
          {(caption || attribution) && (
            <div className="absolute inset-x-0 bottom-0 border-t border-white/40 bg-white/95 px-3 py-2 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-sm">
              {caption && (
                <PretextText
                  text={caption}
                  className="text-[11px] leading-relaxed text-neutral-700"
                  tone="caption"
                  fontSizePx={11}
                  lineHeightPx={16}
                  maxLines={3}
                />
              )}
              {attribution && (
                <PretextText
                  text={attribution}
                  className="mt-0.5 text-[10px] italic text-neutral-500"
                  fontSizePx={10}
                  lineHeightPx={14}
                  maxLines={2}
                  italic
                />
              )}
            </div>
          )}
        </div>
      ) : (
        <div
          className="flex items-center justify-center bg-neutral-100 text-neutral-400 text-xs italic"
          style={{ height: 80 }}
        >
          No image
        </div>
      )}
    </ResourceCardFrame>
  )
}
