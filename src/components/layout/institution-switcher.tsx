"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Check, ChevronDown } from "lucide-react"
import {
  formatInstitutionRoles,
  type InstitutionContext,
} from "@/lib/institutions/core"
import { setActiveInstitution } from "@/lib/institutions/client"

export function InstitutionSwitcher({
  current,
  contexts,
}: {
  current: InstitutionContext | null
  contexts: InstitutionContext[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [pendingId, setPendingId] = useState<string | null>(null)

  if (!current) return null

  async function switchContext(context: InstitutionContext) {
    if (context.institutionId === current?.institutionId) {
      setOpen(false)
      return
    }

    setPendingId(context.institutionId)
    try {
      await setActiveInstitution(context.institutionId)
      router.push(context.dashboardPath)
      router.refresh()
    } finally {
      setPendingId(null)
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex h-9 max-w-[136px] items-center gap-2 rounded-lg border border-border bg-background px-2.5 text-left text-xs text-foreground transition hover:border-primary/30 hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60 sm:max-w-[220px]"
      >
        <Building2 className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="min-w-0">
          <span className="block truncate font-semibold leading-4">{current.institutionName}</span>
          <span className="hidden truncate text-[11px] leading-3 text-muted-foreground sm:block">{formatInstitutionRoles(current.roles)}</span>
        </span>
        {contexts.length > 1 && <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
      </button>

      {open && contexts.length > 1 && (
        <div className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-lg border border-border bg-background shadow-lg">
          <div className="border-b border-border px-3 py-2">
            <p className="text-xs font-semibold text-foreground">Switch workspace</p>
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {contexts.map((context) => {
              const active = context.institutionId === current.institutionId
              const pending = pendingId === context.institutionId
              return (
                <button
                  key={context.institutionId}
                  type="button"
                  onClick={() => void switchContext(context)}
                  disabled={Boolean(pendingId)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-foreground">{context.institutionName}</span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {pending ? "Switching..." : formatInstitutionRoles(context.roles)}
                    </span>
                  </span>
                  {active && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
