type CoursePreviewCardProps = {
  children: React.ReactNode
  className?: string
}

type CoursePreviewChipProps = {
  children: React.ReactNode
  variant?: "muted" | "primary"
}

export function CoursePreviewCard({ children, className = "" }: CoursePreviewCardProps) {
  return <div className={`overflow-hidden rounded-lg border border-border bg-background ${className}`.trim()}>{children}</div>
}

export function CoursePreviewChip({ children, variant = "muted" }: CoursePreviewChipProps) {
  const className =
    variant === "primary"
      ? "rounded-full border border-primary/30 bg-accent px-2.5 py-0.5 text-xs text-primary"
      : "rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground"

  return <span className={className}>{children}</span>
}
