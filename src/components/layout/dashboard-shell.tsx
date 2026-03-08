import Link from "next/link"
import Image from "next/image"
import { type ReactNode } from "react"
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
  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background">
        <div className="grid h-12 w-full grid-cols-[auto_1fr_auto] items-center px-4 lg:px-6">
          <Link href={brandHref} className="flex items-center justify-self-start shrink-0">
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

          {actions ? <div className="flex items-center justify-self-end gap-2">{actions}</div> : <div />}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
