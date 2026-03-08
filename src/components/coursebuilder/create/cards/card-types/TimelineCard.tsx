"use client"

import dynamic from "next/dynamic"
import type { CardRenderProps } from "../CardRegistry"

const TimelineCardInner = dynamic(
  () => import("./timeline-card-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full min-h-[200px] items-center justify-center bg-muted/10 text-[12px] text-muted-foreground">
        Loading timeline…
      </div>
    ),
  },
)

export function TimelineCard({ card }: CardRenderProps) {
  return (
    <div style={{ width: "100%", height: 160 }}>
      <TimelineCardInner content={card.content} />
    </div>
  )
}
