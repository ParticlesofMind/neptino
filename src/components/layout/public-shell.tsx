import Image from "next/image"
import Link from "next/link"
import { type ReactNode } from "react"

type PublicShellProps = {
  /** Override the right-hand nav actions. Defaults to Sign In. */
  navActions?: ReactNode
  hideNavActions?: boolean
  children: ReactNode
}

export function PublicShell({ navActions, hideNavActions = false, children }: PublicShellProps) {
  const defaultNavActions = (
    <Link
      href="/login"
      className="px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium text-foreground hover:border-primary hover:text-primary transition-all duration-150"
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
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/octopus-logo.png"
              alt="Neptino"
              width={30}
              height={30}
              className="h-[30px] w-[30px]"
            />
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-7">
            <Link href="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">
              Features
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150">
              About
            </Link>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-2.5">
            {!hideNavActions ? navActions ?? defaultNavActions : null}
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-border bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 w-full max-w-7xl px-5 py-5 lg:px-8">
          <Link href="/" className="flex items-center shrink-0">
            <Image
              src="/octopus-logo.png"
              alt="Neptino"
              width={20}
              height={20}
              className="h-5 w-5"
            />
          </Link>
          <div className="flex items-center gap-5">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150">Privacy Policy</Link>
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150">Terms of Service</Link>
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors duration-150">Contact</Link>
          </div>
          <span className="text-xs text-muted-foreground">© {new Date().getFullYear()} Neptino</span>
        </div>
      </footer>
    </div>
  )
}
