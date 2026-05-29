import { redirect } from "next/navigation"
import { PublicShell } from "@/components/layout/public-shell"
import { createClient } from "@/lib/supabase/server"
import { loadServerMembershipContexts } from "@/lib/institutions/server"
import { type LegacyUserRole } from "@/lib/institutions/core"
import { InstitutionSelectionClient } from "./institution-selection-client"

function legacyDashboardPath(role: LegacyUserRole | null | undefined) {
  if (role === "admin") return "/admin"
  if (role === "teacher") return "/teacher"
  return "/student"
}

export default async function SelectInstitutionPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login?next=/select-institution")
  }

  const contexts = await loadServerMembershipContexts(supabase, user.id)

  if (contexts.length === 0) {
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    redirect(legacyDashboardPath((profile?.role as LegacyUserRole | null) ?? null))
  }

  return (
    <PublicShell hideNavActions>
      <div className="flex min-h-[calc(100vh-3.75rem-56px)] items-center justify-center bg-muted/30 px-4 py-14">
        <div className="w-full max-w-xl rounded-xl border border-border bg-background p-6 shadow-sm md:p-8">
          <div className="mb-6">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Choose where to work</p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">Select your workspace</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Your account can belong to more than one school, organization, or independent teaching workspace.
            </p>
          </div>
          <InstitutionSelectionClient contexts={contexts} />
        </div>
      </div>
    </PublicShell>
  )
}
