import Image from "next/image"
import Link from "next/link"
import { type ReactNode } from "react"

type PublicShellProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function PublicShell({ title, subtitle, children }: PublicShellProps) {
  return (
    <div className="min-h-screen bg-accent/30">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 lg:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/octopus-logo.png" alt="Neptino Logo" width={30} height={30} className="rounded-sm" />
            <span className="text-lg font-semibold text-primary">Neptino</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-primary">Home</Link>
            <Link href="/teacher/tutorials" className="hover:text-primary">Tutorials</Link>
            <Link href="/login" className="hover:text-primary">Sign In</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-4 py-8 lg:px-6 lg:py-12">
        <section className="overflow-hidden rounded-xl border bg-background shadow-sm">
          <header className="border-b bg-accent/40 px-5 py-4">
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </header>
          <div className="p-5">{children}</div>
        </section>
      </main>

      <footer className="border-t bg-background/95">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between px-4 text-xs text-muted-foreground lg:px-6">
          <span>© {new Date().getFullYear()} Neptino</span>
          <div className="flex items-center gap-4">
            <Link href="/" className="hover:text-primary">Privacy</Link>
            <Link href="/" className="hover:text-primary">Terms</Link>
            <Link href="/" className="hover:text-primary">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
