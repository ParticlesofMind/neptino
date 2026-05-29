import { useCallback } from "react"
import { useCreateModeStore, type CreateMode } from "./store/createModeStore"

const CREATE_MODES = ["curate", "make"] as const satisfies readonly CreateMode[]

const CREATE_MODE_LABELS: Record<CreateMode, string> = {
  curate: "Canvas",
  make:   "Add Card",
}

export function ModeBar() {
  const mode    = useCreateModeStore((s) => s.mode)
  const setMode = useCreateModeStore((s) => s.setMode)

  const handleClick = useCallback(
    (m: CreateMode) => () => setMode(m),
    [setMode],
  )

  return (
    <div className="flex h-10 shrink-0 items-center justify-center gap-1 border-b border-border bg-background px-3">
      {CREATE_MODES.map((m) => (
        <button
          key={m}
          onClick={handleClick(m)}
          className={
            `inline-flex h-7 min-w-[5.5rem] items-center justify-center rounded-md px-3 font-sans text-[11px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60 ${
              mode === m
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`
          }
        >
          {CREATE_MODE_LABELS[m]}
        </button>
      ))}
    </div>
  )
}
