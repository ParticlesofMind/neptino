"use client"

interface PixiLayoutPagerProps {
  visible: boolean
  currentPage: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}

export function PixiLayoutPager({
  visible,
  currentPage,
  totalPages,
  onPrev,
  onNext,
}: PixiLayoutPagerProps) {
  if (!visible) return null

  return (
    <div className="absolute right-3 top-3 z-30 flex items-center gap-2 rounded border border-border bg-background/90 px-2 py-1 text-xs shadow-sm">
      <button
        type="button"
        onClick={onPrev}
        className="rounded border border-border px-2 py-0.5 hover:bg-muted/50"
        disabled={currentPage <= 1}
      >
        Prev
      </button>
      <span className="tabular-nums text-muted-foreground">{currentPage}/{totalPages}</span>
      <button
        type="button"
        onClick={onNext}
        className="rounded border border-border px-2 py-0.5 hover:bg-muted/50"
        disabled={currentPage >= totalPages}
      >
        Next
      </button>
    </div>
  )
}
