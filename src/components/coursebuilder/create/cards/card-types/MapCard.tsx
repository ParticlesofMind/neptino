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

export function MapCard({ card, onRemove, fillAvailable }: CardRenderProps) {
  const bodyHeight = Math.max(200, (card.dimensions.height || 300) - 58)

  return (
    <ResourceCardFrame
      card={card}
      onRemove={onRemove}
      className={fillAvailable ? "flex h-full min-h-[inherit] flex-col" : undefined}
      bodyClassName={fillAvailable ? "min-h-0 flex-1 p-0" : "p-0"}
    >
      <div
        className={fillAvailable ? "h-full min-h-[inherit]" : undefined}
        style={fillAvailable ? { width: "100%" } : { width: "100%", height: bodyHeight, minHeight: 200 }}
      >
        <MapCardInner card={card} />
      </div>
    </ResourceCardFrame>
  )
}
