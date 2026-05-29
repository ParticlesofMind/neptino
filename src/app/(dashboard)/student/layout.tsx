import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { resolveServerInstitutionContext } from "@/lib/institutions/server"

export default async function StudentLayout({
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
      brandHref="/student"
      headerItems={[
        { href: "/student/courses", label: "Courses" },
        { href: "/student/progress", label: "Progress" },
        { href: "/student/messages", label: "Messages" },
        { href: "/student/settings", label: "Settings" },
      ]}
      institutionContext={institutionContext}
      actions={<SignOutButton />}
    >
        {children}
    </DashboardShell>
  )
}
