"use client"

import type { ReactNode } from "react"
import type { CardType } from "../../types"
import { CARD_TYPE_META } from "../../cards/CardTypePreview"

const PREVIEW_WIDTH_BY_TYPE: Partial<Record<CardType, string>> = {
  text: "max-w-[44rem]",
  image: "max-w-[58rem]",
  audio: "max-w-[46rem]",
  video: "max-w-[58rem]",
  animation: "max-w-[54rem]",
  dataset: "max-w-[44rem]",
  embed: "max-w-[56rem]",
  flashcards: "max-w-[40rem]",
  games: "max-w-[40rem]",
  sorter: "max-w-[40rem]",
  "code-snippet": "max-w-[48rem]",
  "code-editor": "max-w-[48rem]",
  "text-editor": "max-w-[46rem]",
  "model-3d": "max-w-[58rem]",
  map: "max-w-[58rem]",
  chart: "max-w-[58rem]",
  diagram: "max-w-[58rem]",
  document: "max-w-[56rem]",
  timeline: "max-w-[54rem]",
  table: "max-w-[52rem]",
  media: "max-w-[56rem]",
  "rich-sim": "max-w-[58rem]",
  "village-3d": "max-w-[58rem]",
  interactive: "max-w-[46rem]",
  form: "max-w-[46rem]",
  "voice-recorder": "max-w-[42rem]",
  chat: "max-w-[46rem]",
  whiteboard: "max-w-[58rem]",
  legend: "max-w-[42rem]",
}

interface EditorPreviewFrameProps {
  cardType: CardType
  title: string
  onTitleChange: (title: string) => void
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function EditorPreviewFrame({
  cardType,
  title,
  onTitleChange,
  children,
  className,
  bodyClassName,
}: EditorPreviewFrameProps) {
  const meta = CARD_TYPE_META[cardType]
  const widthClassName = PREVIEW_WIDTH_BY_TYPE[cardType] ?? "max-w-[44rem]"

  return (
    <div
      className={[
        className,
        widthClassName,
        "mx-auto w-[calc(100%-1rem)] md:w-[calc(100%-2rem)] max-h-[min(36rem,calc(100vh-9rem))] overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-[0_16px_44px_rgba(15,23,42,0.08)]",
      ].filter(Boolean).join(" ")}
    >
      <div className="flex items-center gap-2.5 border-b border-neutral-100 bg-white px-4 py-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-50 text-neutral-500">
          <meta.icon size={14} />
        </div>
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={`${meta.label} name`}
          aria-label="Block name"
          className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-1 text-[13px] font-semibold text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:bg-neutral-50 focus:ring-[3px] focus:ring-primary/10"
        />
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}
