import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { resolveServerInstitutionContext } from "@/lib/institutions/server"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const institutionContext = await resolveServerInstitutionContext(supabase, user.id)

  return (
    <DashboardShell
      brandHref="/admin"
      headerItems={[
        { href: "/admin/courses", label: "Courses" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/marketplace", label: "Marketplace" },
        { href: "/admin/tutorials", label: "Tutorials" },
        { href: "/admin/messages", label: "Messages" },
      ]}
      institutionContext={institutionContext}
      actions={<SignOutButton />}
    >
        {children}
    </DashboardShell>
  )
}
