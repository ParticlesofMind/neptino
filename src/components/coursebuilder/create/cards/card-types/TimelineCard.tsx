"use client"

import dynamic from "next/dynamic"
import type { CardRenderProps } from "../CardRegistry"
import { ResourceCardFrame } from "./ResourceCardFrame"

const TimelineCardInner = dynamic(
  () => import("./timeline-card-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[200px] rounded-lg border border-border/70 bg-muted/20 p-3">
        <div className="h-4 w-28 rounded bg-muted/70" />
        <div className="mt-3 h-[120px] rounded bg-muted/50" />
      </div>
    ),
  },
)

export function TimelineCard({ card, onRemove }: CardRenderProps) {
  const bodyHeight = Math.max(160, (card.dimensions.height || 220) - 58)

  return (
    <ResourceCardFrame card={card} onRemove={onRemove} bodyClassName="p-0">
      <div style={{ width: "100%", height: bodyHeight }}>
        <TimelineCardInner content={card.content} />
      </div>
    </ResourceCardFrame>
  )
}
