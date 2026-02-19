import Link from "next/link"
import { PublicShell } from "@/components/layout/public-shell"

const menuItems = [
  { label: "Admin Dashboard", href: "/admin", description: "System administration and platform control" },
  { label: "Teacher Dashboard", href: "/teacher", description: "Create courses and manage classes" },
  { label: "Student Dashboard", href: "/student", description: "Access classes, progress, and messages" },
  { label: "Sign In", href: "/login", description: "Use your Neptino account credentials" },
]

export default function Home() {
  return (
    <PublicShell
      title="Neptino Main Menu"
      subtitle="Choose your workspace to continue."
    >
      <nav className="grid gap-4 md:grid-cols-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border bg-background p-5 shadow-sm transition hover:border-primary/30 hover:bg-accent hover:shadow-md"
            >
              <span className="block text-lg font-semibold text-primary">{item.label}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
            </Link>
          ))}
        </nav>
    </PublicShell>
  )
}
