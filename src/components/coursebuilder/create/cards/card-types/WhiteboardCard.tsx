"use client"

import dynamic from "next/dynamic"
import type { CardRenderProps } from "../CardRegistry"

const WhiteboardCardInner = dynamic(
  () => import("./whiteboard-card-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-neutral-50 text-[12px] text-neutral-400">
        Loading whiteboard…
      </div>
    ),
  },
)

export function WhiteboardCard({ card, onRemove }: CardRenderProps) {
  const title = typeof card.content["title"] === "string" ? card.content["title"] : "Whiteboard"
  const prompt = typeof card.content["prompt"] === "string" ? card.content["prompt"] : ""
  const boardKey = typeof card.content["boardKey"] === "string" ? card.content["boardKey"] : card.id

  return (
    <div
      className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm"
      style={{ width: "100%", height: card.dimensions.height || 420 }}
    >
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-2 top-2 z-30 hidden h-6 w-6 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 shadow-sm hover:text-neutral-700 group-hover:flex"
          aria-label="Remove"
        >
          &times;
        </button>
      )}

      <div className="absolute left-3 top-3 z-20 rounded-lg border border-neutral-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Whiteboard</p>
        <h3 className="mt-0.5 text-sm font-semibold text-neutral-800">{title}</h3>
        {prompt && <p className="mt-1 max-w-64 text-[11px] text-neutral-500">{prompt}</p>}
      </div>

      <WhiteboardCardInner persistenceKey={`coursebuilder-whiteboard-${boardKey}`} />
    </div>
  )
}