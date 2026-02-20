import { type ReactNode } from "react"

export type SaveStatus = "empty" | "saving" | "saved" | "error"

function formatLastSaved(ts: string | null) {
  if (!ts) return "No data submitted yet"
  return `Last Saved: ${new Date(ts).toLocaleString()}`
}

export function SetupSection({
  title,
  description,
  headerActions,
  children,
  className = "",
}: {
  title: string
  description?: string
  headerActions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`flex h-full min-h-0 flex-col gap-4 overflow-hidden ${className}`}>
      <div className="rounded-lg border border-border bg-background p-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
          </div>
          {headerActions ? <div className="flex flex-wrap items-center gap-2">{headerActions}</div> : null}
        </div>
      </div>
      {children}
    </div>
  )
}

export function SetupColumn({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`no-scrollbar h-full min-h-0 max-h-full overflow-y-auto rounded-lg border border-border bg-background p-4 ${className}`}>
      {children}
    </div>
  )
}

export function SetupPanels({
  config,
  preview,
  className = "",
  configClassName = "",
  previewClassName = "",
}: {
  config: ReactNode
  preview: ReactNode
  className?: string
  configClassName?: string
  previewClassName?: string
}) {
  return (
    <div className={`grid flex-1 min-h-0 items-stretch gap-4 lg:grid-cols-2 ${className}`}>
      <SetupColumn className={configClassName}>{config}</SetupColumn>
      <SetupColumn className={previewClassName}>{preview}</SetupColumn>
    </div>
  )
}

export function SaveStatusBar({
  status,
  lastSavedAt,
  sticky = false,
}: {
  status: SaveStatus
  lastSavedAt: string | null
  sticky?: boolean
}) {
  const text =
    status === "saving"
      ? "Saving…"
      : status === "error"
        ? "Could not save changes"
        : formatLastSaved(lastSavedAt)

  return (
    <div className={`${sticky ? "sticky bottom-0 z-20 mt-auto" : "mt-0"} bg-muted/20 pt-0 pb-2 backdrop-blur-sm`}>
      <div
        className={`rounded-md border px-3 py-2 text-xs ${
          status === "error"
            ? "border-destructive/40 bg-destructive/5 text-destructive"
            : "border-border/80 bg-background text-muted-foreground"
        }`}
      >
        {text}
      </div>
    </div>
  )
}

export const SectionContainer = SetupSection
export const SplitPane = SetupColumn
export const SetupSaveFooter = SaveStatusBar
