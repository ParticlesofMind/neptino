"use client"

import { Children, useState, type ReactNode } from "react"

export type SaveStatus = "empty" | "saving" | "saved" | "error"

export const PRIMARY_ACTION_BUTTON_CLASS = "inline-flex items-center gap-2 rounded-md border border-[#93C5FD]/70 bg-[#BFDBFE]/70 px-4 py-2 text-sm font-medium text-[#1E3A8A] backdrop-blur-sm transition hover:bg-[#BFDBFE]/85 focus:outline-none focus:ring-2 focus:ring-[#93C5FD]/60 disabled:cursor-not-allowed disabled:border-[#ECECEC] disabled:bg-[#ECECEC] disabled:text-foreground/60"
export const PRIMARY_ACTION_BUTTON_SM_CLASS = "inline-flex items-center gap-2 rounded-md border border-[#93C5FD]/70 bg-[#BFDBFE]/70 px-3 py-1.5 text-xs font-medium text-[#1E3A8A] backdrop-blur-sm transition hover:bg-[#BFDBFE]/85 focus:outline-none focus:ring-2 focus:ring-[#93C5FD]/60 disabled:cursor-not-allowed disabled:border-[#ECECEC] disabled:bg-[#ECECEC] disabled:text-foreground/60"
export const SECONDARY_ACTION_BUTTON_CLASS = "inline-flex items-center gap-2 rounded-md border border-[#86EFAC]/70 bg-[#BBF7D0]/70 px-4 py-2 text-sm font-medium text-[#166534] backdrop-blur-sm transition hover:bg-[#BBF7D0]/85 focus:outline-none focus:ring-2 focus:ring-[#86EFAC]/60 disabled:cursor-not-allowed disabled:border-[#ECECEC] disabled:bg-[#ECECEC] disabled:text-foreground/60"
export const SECONDARY_ACTION_BUTTON_SM_CLASS = "inline-flex items-center gap-2 rounded-md border border-[#86EFAC]/70 bg-[#BBF7D0]/70 px-3 py-1.5 text-xs font-medium text-[#166534] backdrop-blur-sm transition hover:bg-[#BBF7D0]/85 focus:outline-none focus:ring-2 focus:ring-[#86EFAC]/60 disabled:cursor-not-allowed disabled:border-[#ECECEC] disabled:bg-[#ECECEC] disabled:text-foreground/60"
export const DANGER_ACTION_BUTTON_CLASS = "inline-flex items-center gap-2 rounded-md border border-[#FCA5A5]/70 bg-[#FECACA]/70 px-4 py-2 text-sm font-medium text-[#991B1B] backdrop-blur-sm transition hover:bg-[#FECACA]/85 focus:outline-none focus:ring-2 focus:ring-[#FCA5A5]/60 disabled:cursor-not-allowed disabled:border-[#ECECEC] disabled:bg-[#ECECEC] disabled:text-foreground/60"
export const DANGER_ACTION_BUTTON_SM_CLASS = "inline-flex items-center gap-2 rounded-md border border-[#FCA5A5]/70 bg-[#FECACA]/70 px-3 py-1.5 text-xs font-medium text-[#991B1B] backdrop-blur-sm transition hover:bg-[#FECACA]/85 focus:outline-none focus:ring-2 focus:ring-[#FCA5A5]/60 disabled:cursor-not-allowed disabled:border-[#ECECEC] disabled:bg-[#ECECEC] disabled:text-foreground/60"

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
    <div className={`flex h-full min-h-0 flex-col gap-2 overflow-hidden ${className}`}>
      <div className="hidden rounded-lg border border-border bg-background p-3 md:block">
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
    <div className={`no-scrollbar h-full min-h-0 max-h-full overflow-y-auto rounded-lg border border-border bg-background px-3 py-3 [&_button:not(:disabled)]:cursor-pointer ${className}`}>
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
    <div className={`flex flex-1 min-h-0 flex-col gap-2 ${className}`}>
      {/* Mobile config / preview toggle — hidden on lg+ */}
      <div className="flex shrink-0 gap-1 rounded-lg border border-border bg-muted/50 p-1 lg:hidden">
        <button
          type="button"
          onClick={() => setPanel("config")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            panel === "config"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Configure
        </button>
        <button
          type="button"
          onClick={() => setPanel("preview")}
          className={`flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition ${
            panel === "preview"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Preview
        </button>
      </div>

      {/* Panels grid */}
      <div className="grid flex-1 min-h-0 items-stretch gap-2 lg:grid-cols-2">
        <div className={`min-h-0 ${panel === "preview" ? "hidden lg:block" : ""}`}>
          {kids[0]}
        </div>
        <div className={`min-h-0 ${panel === "config" ? "hidden lg:block" : ""}`}>
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

export const SectionContainer = SetupSection
export const SplitPane = SetupColumn
export const SetupSaveFooter = SaveStatusBar
