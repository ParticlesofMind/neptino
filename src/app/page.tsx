import Link from "next/link"
import { PageSection } from "@/components/ui/page-section"

const menuItems = [
  { label: "Admin Dashboard", href: "/admin", description: "System administration and platform control" },
  { label: "Teacher Dashboard", href: "/teacher", description: "Create courses and manage classes" },
  { label: "Student Dashboard", href: "/student", description: "Access classes, progress, and messages" },
  { label: "Sign In", href: "/login", description: "Use your Neptino account credentials" },
]

export default function Home() {
  return (
    <main className="min-h-screen bg-accent/30 p-6">
      <section className="mx-auto w-full max-w-5xl">
        <PageSection title="Neptino" description="Main menu and role entry point.">
        <nav className="grid gap-4 md:grid-cols-2">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border bg-background p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md"
            >
              <span className="block text-lg font-semibold">{item.label}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{item.description}</span>
            </Link>
          ))}
        </nav>
        </PageSection>
      </section>
    </main>
  )
}
