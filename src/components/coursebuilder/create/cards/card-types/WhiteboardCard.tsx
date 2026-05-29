"use client"

import dynamic from "next/dynamic"
import type { SyntheticEvent } from "react"
import type { CardRenderProps } from "../CardRegistry"
import { resolveWhiteboardPersistenceKey } from "./whiteboard-card-utils"
import { PretextText } from "../../text/PretextText"

const WhiteboardCardInner = dynamic(
  () => import("./whiteboard-card-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-full rounded-xl border border-neutral-200 bg-neutral-50 p-3">
        <div className="h-4 w-32 rounded bg-neutral-200" />
        <div className="mt-3 h-[300px] rounded-lg bg-neutral-100" />
      </div>
    ),
  },
)

function WhiteboardCardShell({
  card,
  onRemove,
  fillAvailable,
  readOnly = false,
}: CardRenderProps & { readOnly?: boolean }) {
  const title = typeof card.content["title"] === "string" ? card.content["title"] : "Whiteboard"
  const prompt = typeof card.content["prompt"] === "string" ? card.content["prompt"] : ""
  const persistenceKey = resolveWhiteboardPersistenceKey(card)

  const stopCanvasEvent = (event: SyntheticEvent) => {
    event.stopPropagation()
  }

  return (
    <div
      className={[
        "group relative overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm",
        readOnly || !fillAvailable ? "min-h-[24rem]" : "h-full min-h-[inherit]",
      ].join(" ")}
    >
      {!readOnly && onRemove && (
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
        {prompt && (
          <PretextText
            text={prompt}
            className="mt-1 max-w-64 text-[11px] text-neutral-500"
            tone="soft"
            fontSizePx={11}
            lineHeightPx={16}
            maxLines={4}
          />
        )}
      </div>

      <div
        className="h-full w-full"
        onPointerDown={stopCanvasEvent}
        onClick={stopCanvasEvent}
        onDoubleClick={stopCanvasEvent}
        onWheel={stopCanvasEvent}
        onKeyDown={stopCanvasEvent}
      >
        <WhiteboardCardInner
          persistenceKey={persistenceKey}
          readOnly={readOnly}
          hideUi={readOnly}
        />
      </div>
    </div>
  )
}

export function WhiteboardCard(props: CardRenderProps) {
  return <WhiteboardCardShell {...props} />
}

export function WhiteboardPreviewCard(props: CardRenderProps) {
  return <WhiteboardCardShell {...props} readOnly />
}
