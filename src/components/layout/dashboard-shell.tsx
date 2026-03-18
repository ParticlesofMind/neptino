"use client"

import Link from "next/link"
import Image from "next/image"
import { useState, type ReactNode } from "react"
import { Menu, X } from "lucide-react"
import { NavLink } from "@/components/layout/nav-link"

type HeaderItem = {
  href: string
  label: string
}

type DashboardShellProps = {
  brandHref: string
  headerItems: HeaderItem[]
  actions?: ReactNode
  children: ReactNode
}

export function DashboardShell({
  brandHref,
  headerItems,
  actions,
  children,
}: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="grid h-12 w-full grid-cols-[auto_1fr_auto] items-center px-4 lg:px-6">
          <Link href={brandHref} className="flex items-center justify-self-start shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">
            <Image
              src="/octopus-logo.png"
              alt="Neptino"
              width={26}
              height={26}
              className="rounded"
            />
          </Link>

          <nav className="hidden items-center justify-center gap-2 md:flex lg:gap-3">
            {headerItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} variant="header" />
            ))}
          </nav>

          <div className="flex items-center justify-self-end gap-2">
            {actions}
            {/* Mobile hamburger — only shown when there are nav items */}
            {headerItems.length > 0 && (
              <button
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileMenuOpen}
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground hover:bg-muted/50 transition-colors duration-150 md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile nav panel */}
        {mobileMenuOpen && (
          <div className="animate-fade-in border-t border-border bg-background md:hidden">
            <nav className="divide-y divide-border px-4">
              {headerItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex min-h-[44px] items-center font-sans text-sm font-medium text-foreground hover:text-primary transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
