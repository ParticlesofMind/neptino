import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { DashboardShell } from "@/components/layout/dashboard-shell"

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return (
    <DashboardShell
      brandHref="/teacher"
      headerItems={[
        { href: "/teacher/courses", label: "Courses" },
        { href: "/teacher/marketplace", label: "Marketplace" },
        { href: "/teacher/tutorials", label: "Tutorials" },
        { href: "/teacher/encyclopedia", label: "Encyclopedia" },
      ]}
      actions={<SignOutButton />}
    >
      {children}
    </DashboardShell>
  )
}
