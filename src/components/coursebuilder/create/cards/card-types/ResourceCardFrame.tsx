"use client"

import type { ReactNode } from "react"
import { X } from "lucide-react"
import { CARD_TYPE_META } from "../card-type-registry"
import type { DroppedCard } from "../../types"

interface ResourceCardFrameProps {
  card: DroppedCard
  children: ReactNode
  onRemove?: () => void
  className?: string
  bodyClassName?: string
  maxWidthClassName?: string
}

export function ResourceCardFrame({
  card,
  children,
  onRemove,
  className,
  bodyClassName = "p-2.5",
  maxWidthClassName,
}: ResourceCardFrameProps) {
  const meta = CARD_TYPE_META[card.cardType]
  const resolvedMaxWidth = maxWidthClassName ?? "max-w-none"
  const title = typeof card.content["title"] === "string" && card.content["title"].trim()
    ? card.content["title"].trim()
    : meta.label

  return (
    <div className={["group relative w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm", resolvedMaxWidth, className].filter(Boolean).join(" ")}>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-1.5 top-1.5 z-10 hidden h-6 w-6 items-center justify-center rounded-md text-neutral-400 transition-colors hover:bg-destructive/10 hover:text-destructive group-hover:flex focus:flex focus:outline-none focus:ring-[3px] focus:ring-primary/15"
          aria-label="Remove block"
        >
          <X size={12} />
        </button>
      )}
      <div className="flex items-center gap-2 border-b border-neutral-100 bg-white px-2.5 py-2 pr-7">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-neutral-100 text-neutral-600">
          <meta.icon size={13} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-semibold text-neutral-900">{title}</p>
          <p className="text-[9px] uppercase tracking-normal text-neutral-400">{meta.label}</p>
        </div>
      </div>
      <div className={bodyClassName}>
        {children}
      </div>
    </div>
  )
}
