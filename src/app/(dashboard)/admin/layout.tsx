import { Home, BookOpen, MessageSquare, Settings, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SignOutButton } from "@/components/auth/sign-out-button"
import { DashboardShell } from "@/components/layout/dashboard-shell"

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

  return (
    <DashboardShell
      brandHref="/admin"
      brandLabel="Neptino Admin"
      headerItems={[
        { href: "/admin/courses", label: "Courses" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/messages", label: "Messages" },
      ]}
      sidebarItems={[
        { href: "/admin", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
        { href: "/admin/users", label: "Users", icon: <Users className="h-4 w-4" /> },
        { href: "/admin/courses", label: "All Courses", icon: <BookOpen className="h-4 w-4" /> },
        { href: "/admin/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
        { href: "/admin/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ]}
      actions={<SignOutButton />}
    >
        {children}
    </DashboardShell>
  )
}
