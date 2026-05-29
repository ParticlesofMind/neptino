"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AlertCircle, Building2 } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { formatInstitutionRoles, type InstitutionContext } from "@/lib/institutions/core"
import { setActiveInstitution } from "@/lib/institutions/client"

export function InstitutionSelectionClient({ contexts }: { contexts: InstitutionContext[] }) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function choose(context: InstitutionContext) {
    setPendingId(context.institutionId)
    setError(null)

    try {
      await setActiveInstitution(context.institutionId)
      router.push(context.dashboardPath)
      router.refresh()
    } catch (selectionError) {
      setError(selectionError instanceof Error ? selectionError.message : "Unable to choose this workspace.")
      setPendingId(null)
    }
  }

  return (
    <div className="grid gap-3">
      {contexts.map((context) => {
        const pending = pendingId === context.institutionId
        return (
          <button
            key={context.institutionId}
            type="button"
            onClick={() => void choose(context)}
            disabled={Boolean(pendingId)}
            className="flex min-h-[84px] items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3 text-left transition hover:border-primary/40 hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 text-primary">
                <Building2 className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-foreground">{context.institutionName}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{formatInstitutionRoles(context.roles)}</span>
              </span>
            </span>
            <span className={buttonVariants({ variant: pending ? "outline" : "primary", size: "sm" })}>
              {pending ? "Opening..." : "Open"}
            </span>
          </button>
        )
      })}

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
