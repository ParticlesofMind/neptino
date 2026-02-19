import Link from "next/link"
import { Home, BookOpen, MessageSquare, Settings } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { SignOutButton } from "@/components/auth/sign-out-button"

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
    <div className="flex h-screen w-full flex-col md:flex-row">
      <aside className="w-full border-r bg-muted/40 md:w-64 md:shrink-0">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/student" className="flex items-center gap-2 font-semibold">
            <span className="">Neptino Student</span>
          </Link>
        </div>
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 py-4 gap-2">
          <Link
            href="/student"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Home className="h-4 w-4" />
            Home
          </Link>
          <Link
            href="/student/courses"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <BookOpen className="h-4 w-4" />
            Courses
          </Link>
          <Link
            href="/student/messages"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <MessageSquare className="h-4 w-4" />
            Messages
          </Link>
          <Link
            href="/student/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </nav>
        <div className="mt-auto p-4">
             <SignOutButton />
        </div>
      </aside>
      <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
