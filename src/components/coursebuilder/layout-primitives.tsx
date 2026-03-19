"use client"

import { Children, useState, type ReactNode } from "react"

export type SaveStatus = "empty" | "saving" | "saved" | "error"

export const PRIMARY_ACTION_BUTTON_CLASS = "inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-medium text-accent-foreground backdrop-blur-sm transition hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-foreground/60"
export const PRIMARY_ACTION_BUTTON_SM_CLASS = "inline-flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-medium text-accent-foreground backdrop-blur-sm transition hover:bg-primary/15 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-foreground/60"
export const SECONDARY_ACTION_BUTTON_CLASS = "inline-flex items-center gap-2 rounded-md border border-secondary/30 bg-secondary/10 px-4 py-2 text-sm font-medium text-[#0d7a6b] backdrop-blur-sm transition hover:bg-secondary/15 focus:outline-none focus:ring-2 focus:ring-secondary/30 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-foreground/60"
export const SECONDARY_ACTION_BUTTON_SM_CLASS = "inline-flex items-center gap-2 rounded-md border border-secondary/30 bg-secondary/10 px-3 py-1.5 text-xs font-medium text-[#0d7a6b] backdrop-blur-sm transition hover:bg-secondary/15 focus:outline-none focus:ring-2 focus:ring-secondary/30 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-foreground/60"
export const DANGER_ACTION_BUTTON_CLASS = "inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive backdrop-blur-sm transition hover:bg-destructive/15 focus:outline-none focus:ring-2 focus:ring-destructive/30 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-foreground/60"
export const DANGER_ACTION_BUTTON_SM_CLASS = "inline-flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs font-medium text-destructive backdrop-blur-sm transition hover:bg-destructive/15 focus:outline-none focus:ring-2 focus:ring-destructive/30 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-foreground/60"
export const SEGMENTED_CONTROL_GROUP_CLASS = "flex gap-1 rounded-lg border border-border bg-muted/50 p-1"
export const SEGMENTED_CONTROL_BUTTON_BASE_CLASS = "flex-1 rounded-md border px-3 py-1.5 text-xs font-medium transition focus:outline-none"
export const SEGMENTED_CONTROL_BUTTON_ACTIVE_CLASS = "border-primary/35 bg-primary/10 text-accent-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.72)]"
export const SEGMENTED_CONTROL_BUTTON_INACTIVE_CLASS = "border-transparent text-muted-foreground hover:text-foreground"
export const TOGGLE_SWITCH_TRACK_BASE_CLASS = "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition"
export const TOGGLE_SWITCH_TRACK_ON_CLASS = "bg-primary"
export const TOGGLE_SWITCH_TRACK_OFF_CLASS = "bg-muted"

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
    <div className={`flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
      {(title || headerActions) && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border pb-3 mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">{title}</h2>
            {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
          </div>
          {headerActions ? <div className="flex flex-wrap items-center gap-2">{headerActions}</div> : null}
        </div>
      )}
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
    <div className={`no-scrollbar h-full min-h-0 max-h-full overflow-y-auto [&_button:not(:disabled)]:cursor-pointer ${className}`}>
      {children}
    </div>
  )
}

export function SetupPanelLayout({
  children,
  className = "",
}: {
  children: ReactNode
  className?: string
}) {
  const [panel, setPanel] = useState<"config" | "preview">("config")
  const kids = Children.toArray(children)

  return (
    <div className={`flex flex-1 min-h-0 flex-col ${className}`}>
      {/* Mobile config / preview toggle */}
      <div className="flex shrink-0 border-b border-border pb-2 mb-4 gap-4 lg:hidden">
        <button
          type="button"
          onClick={() => setPanel("config")}
          className={`pb-1 text-xs font-medium transition border-b-2 -mb-[10px] ${
            panel === "config"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Configure
        </button>
        <button
          type="button"
          onClick={() => setPanel("preview")}
          className={`pb-1 text-xs font-medium transition border-b-2 -mb-[10px] ${
            panel === "preview"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Preview
        </button>
      </div>

      {/* Panels — thin vertical divider on desktop */}
      <div className="flex flex-1 min-h-0">
        <div className={`min-h-0 flex-1 ${panel === "preview" ? "hidden lg:block" : ""} lg:pr-7`}>
          {kids[0]}
        </div>
        <div className="hidden lg:block w-px shrink-0 bg-border" />
        <div className={`min-h-0 flex-1 ${panel === "config" ? "hidden lg:block" : ""} lg:pl-7`}>
          {kids[1]}
        </div>
      </div>
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
    <SetupPanelLayout className={className}>
      <SetupColumn className={configClassName}>{config}</SetupColumn>
      <SetupColumn className={previewClassName}>{preview}</SetupColumn>
    </SetupPanelLayout>
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
    <div className={`${sticky ? "sticky bottom-0 z-20 mt-auto" : "mt-0"} hidden bg-muted/20 pt-0 pb-2 backdrop-blur-sm md:block`}>
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

