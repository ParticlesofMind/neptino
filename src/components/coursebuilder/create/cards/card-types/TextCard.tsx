"use client"

import type { CardRenderProps } from "../CardRegistry"
import { ResourceCardFrame } from "./ResourceCardFrame"

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
      <p className="whitespace-pre-wrap text-xs leading-relaxed text-neutral-600">
        {text || <span className="italic text-neutral-400">Empty text card</span>}
      </p>
    </ResourceCardFrame>
  )
}
