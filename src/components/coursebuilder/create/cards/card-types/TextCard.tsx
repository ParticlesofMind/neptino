"use client"

import type { CardRenderProps } from "../CardRegistry"
import { ResourceCardFrame } from "./ResourceCardFrame"
import { PretextText } from "../../text/PretextText"

export function TextCard({ card, onRemove, fillAvailable }: CardRenderProps) {
  const html = typeof card.content["text"] === "string" ? card.content["text"] : ""
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()

  return (
    <ResourceCardFrame card={card} onRemove={onRemove} fillAvailable={fillAvailable}>
      <PretextText
        text={text}
        emptyText={<span className="italic text-neutral-400">Empty text card</span>}
        className="text-xs leading-relaxed text-neutral-600"
        tone="soft"
        fontSizePx={12}
        lineHeightPx={19}
        maxLines={fillAvailable ? undefined : 18}
      />
    </ResourceCardFrame>
  )
}
