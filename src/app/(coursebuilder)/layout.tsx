import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Coursebuilder route group layout.
 *
 * Auth-protected but intentionally bare — no DashboardShell header so the
 * builder can use every pixel of vertical space.
 */
export default async function CourseBuilderGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  return <>{children}</>
}
