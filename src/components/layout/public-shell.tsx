"use client"

import Image from "next/image"
import Link from "next/link"
import { useState, type ReactNode } from "react"
import { Menu, X } from "lucide-react"

type PublicShellProps = {
  /** Override the right-hand nav actions. Defaults to Sign In. */
  navActions?: ReactNode
  hideNavActions?: boolean
  children: ReactNode
}

const NAV_LINKS = [
  { href: "/features", label: "Features" },
  { href: "/about",    label: "About" },
]

const LINK_BASE = "font-sans text-sm font-medium transition-colors duration-150 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"

export function PublicShell({ navActions, hideNavActions = false, children }: PublicShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const defaultNavActions = (
    <Link
      href="/login"
      className="px-4 py-2 rounded-lg border border-border bg-background font-sans text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
    >
      Sign In
    </Link>
  )

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex h-[3.75rem] w-full max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Brand */}
          <Link href="/" className="flex items-center shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">
            <Image
              src="/octopus-logo.png"
              alt="Neptino"
              width={30}
              height={30}
              className="h-[30px] w-[30px]"
            />
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className={`${LINK_BASE} text-muted-foreground hover:text-foreground`}>
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side: desktop CTA + mobile hamburger */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex">
              {!hideNavActions ? navActions ?? defaultNavActions : null}
            </div>
            <button
              type="button"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-lg text-foreground hover:bg-muted/50 transition-colors duration-150 md:hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav panel */}
        {mobileMenuOpen && (
          <div className="animate-fade-in border-t border-border bg-background/95 md:hidden">
            <nav className="divide-y divide-border px-5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`${LINK_BASE} flex min-h-[44px] items-center text-foreground hover:text-primary`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            {!hideNavActions && (
              <div className="px-5 py-4">
                {navActions ?? defaultNavActions}
              </div>
            )}
          </div>
        )}
      </header>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-7xl px-5 py-8 lg:px-8">
          <Link href="/" className="flex items-center shrink-0 rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">
            <Image
              src="/octopus-logo.png"
              alt="Neptino"
              width={20}
              height={20}
              className="h-5 w-5"
            />
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/" className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 rounded-sm py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">Privacy Policy</Link>
            <Link href="/" className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 rounded-sm py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">Terms of Service</Link>
            <Link href="/" className="font-sans text-xs text-muted-foreground hover:text-foreground transition-colors duration-150 rounded-sm py-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60">Contact</Link>
          </div>
          <span className="font-sans text-xs text-muted-foreground">© {new Date().getFullYear()} Neptino</span>
        </div>
      </footer>
    </div>
  )
}
