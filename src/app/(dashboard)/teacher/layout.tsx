import { Home, BookOpen, MessageSquare, Settings, Library, PenTool, Globe } from "lucide-react"
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
      brandLabel="Neptino Teacher"
      headerItems={[
        { href: "/teacher/courses", label: "Courses" },
        { href: "/teacher/marketplace", label: "Marketplace" },
        { href: "/teacher/tutorials", label: "Tutorials" },
      ]}
      sidebarItems={[
        { href: "/teacher", label: "Dashboard", icon: <Home className="h-4 w-4" /> },
        { href: "/teacher/courses", label: "My Courses", icon: <BookOpen className="h-4 w-4" /> },
        { href: "/teacher/coursebuilder", label: "Course Builder", icon: <PenTool className="h-4 w-4" /> },
        { href: "/teacher/encyclopedia", label: "Encyclopedia", icon: <Library className="h-4 w-4" /> },
        { href: "/teacher/marketplace", label: "Marketplace", icon: <Globe className="h-4 w-4" /> },
        { href: "/teacher/messages", label: "Messages", icon: <MessageSquare className="h-4 w-4" /> },
        { href: "/teacher/settings", label: "Settings", icon: <Settings className="h-4 w-4" /> },
      ]}
      actions={<SignOutButton />}
    >
        {children}
    </DashboardShell>
  )
}
