"use client"

import dynamic from "next/dynamic"
import type { CardRenderProps } from "../CardRegistry"

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

export function MapCard({ card }: CardRenderProps) {
  return (
    <div style={{ width: "100%", height: "100%", minHeight: 200 }}>
      <MapCardInner card={card} />
    </div>
  )
}
