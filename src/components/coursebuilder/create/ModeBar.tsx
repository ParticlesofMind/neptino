import { useCallback } from "react"
import { useCreateModeStore, type CreateMode } from "./store/createModeStore"

const CREATE_MODES = ["curate", "make", "fix"] as const satisfies readonly CreateMode[]

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
            `inline-flex h-7 min-w-[4.75rem] items-center justify-center rounded-md px-3 font-sans text-[11px] font-semibold capitalize transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60 ${
              mode === m
                ? "border border-primary/25 bg-primary/10 text-accent-foreground shadow-sm"
                : "border border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            }`
          }
        >
          {m}
        </button>
      ))}
    </div>
  )
}
