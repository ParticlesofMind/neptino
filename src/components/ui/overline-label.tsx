import type { ReactNode } from "react"

/**
 * Eyebrow / overline label — the `text-xs font-semibold uppercase tracking-widest
 * text-muted-foreground` pattern used throughout the UI to head sections.
 *
 * Provide `className` for additional spacing like `mb-3`, `mb-4`, or `pt-1`.
 */
export function OverlineLabel({
  children,
  className = "",
  as: Tag = "p",
}: {
  children: ReactNode
  className?: string
  as?: keyof JSX.IntrinsicElements
}) {
  return (
    <Tag className={`text-xs font-semibold uppercase tracking-widest text-muted-foreground ${className}`}>
      {children}
    </Tag>
  )
}
