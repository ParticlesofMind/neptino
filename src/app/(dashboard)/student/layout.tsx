import { Home, BookOpen, MessageSquare, Settings } from "lucide-react"
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
      brandLabel="Neptino Student"
      headerItems={[
        { href: "/student/courses", label: "Courses" },
        { href: "/student/messages", label: "Messages" },
        { href: "/student/settings", label: "Settings" },
      ]}
      sidebarItems={[
        { href: "/student", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
        { href: "/student/courses", label: "Courses", icon: <BookOpen className="h-4 w-4" /> },
        { href: "/student/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
        { href: "/student/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ]}
      actions={<SignOutButton />}
    >
        {children}
    </DashboardShell>
  )
}
