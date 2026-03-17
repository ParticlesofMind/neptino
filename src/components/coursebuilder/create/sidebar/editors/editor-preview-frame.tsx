"use client"

import type { ReactNode } from "react"
import type { CardType } from "../../types"
import { CARD_TYPE_META } from "../../cards/CardTypePreview"

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

  return (
    <div
      className={[
        "overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)]",
        className,
      ].filter(Boolean).join(" ")}
    >
      <div className="flex items-center gap-3 border-b border-neutral-100 bg-white px-5 py-3.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-500">
          <meta.icon size={15} />
        </div>
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder={`${meta.label} name`}
          aria-label="Block name"
          className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-neutral-900 outline-none placeholder:text-neutral-400"
        />
      </div>
      <div className={bodyClassName}>{children}</div>
    </div>
  )
}