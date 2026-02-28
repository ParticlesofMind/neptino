"use client"

import type { ReactNode } from "react"
import type { OverlayUi } from "@/components/canvas/create-view-types"

interface CanvasIconBtnProps {
  active?: boolean
  onClick?: () => void
  title?: string
  /** Short text label rendered below the icon. */
  label?: string
  iconNode?: ReactNode
  /** When true, renders at h-10 w-10 instead of h-12 w-12. */
  compact?: boolean
  overlayUi?: OverlayUi
  className?: string
}

/**
 * A square icon-tile button used across canvas overlays and the media
 * library sidebar. Applies the standard active / inactive ring styling.
 */
export function CanvasIconBtn({
  active,
  onClick,
  title,
  label,
  iconNode,
  compact,
  overlayUi,
  className = "",
}: CanvasIconBtnProps) {
  return (
    <button
      type="button"
      title={title ?? label}
      onClick={onClick}
      className={[
        "flex flex-col items-center justify-center gap-0.5 rounded border transition select-none",
        compact ? "h-10 w-10" : "h-12 w-12",
        active
          ? "border-primary bg-blue-100 text-primary"
          : "border-border bg-background text-foreground/70 hover:border-primary/40 hover:bg-muted/30",
        overlayUi?.controlInput ?? "text-xs",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {iconNode}
      {label && (
        <span
          className={`${overlayUi?.toolButtonLabel ?? "text-[10px]"} leading-none font-medium truncate max-w-full`}
        >
          {label}
        </span>
      )}
    </button>
  )
}
