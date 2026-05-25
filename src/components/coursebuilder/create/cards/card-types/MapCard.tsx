"use client"

import dynamic from "next/dynamic"
import type { CardRenderProps } from "../CardRegistry"
import { ResourceCardFrame } from "./ResourceCardFrame"

const MapCardInner = dynamic(
  () => import("./map-card-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[200px] rounded-lg border border-border/70 bg-muted/20 p-3">
        <div className="h-4 w-24 rounded bg-muted/70" />
        <div className="mt-3 h-[150px] rounded bg-muted/50" />
      </div>
    ),
  },
)

export function MapCard({ card, onRemove }: CardRenderProps) {
  const bodyHeight = Math.max(200, (card.dimensions.height || 300) - 58)

  return (
    <ResourceCardFrame card={card} onRemove={onRemove} bodyClassName="p-0">
      <div style={{ width: "100%", height: bodyHeight, minHeight: 200 }}>
        <MapCardInner card={card} />
      </div>
    </ResourceCardFrame>
  )
}
