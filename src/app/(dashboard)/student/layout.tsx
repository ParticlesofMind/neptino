import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { DashboardShell } from "@/components/layout/dashboard-shell"

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

  return (
    <DashboardShell
      brandHref="/student"
      headerItems={[
        { href: "/student/courses", label: "Courses" },
        { href: "/student/progress", label: "Progress" },
        { href: "/student/messages", label: "Messages" },
        { href: "/student/settings", label: "Settings" },
      ]}
      actions={<SignOutButton />}
    >
        {children}
    </DashboardShell>
  )
}
