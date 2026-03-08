"use client"

import dynamic from "next/dynamic"
import type { CardRenderProps } from "../CardRegistry"

const MapCardInner = dynamic(
  () => import("./map-card-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[200px] items-center justify-center bg-muted/10 text-[12px] text-muted-foreground">
        Loading map…
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
