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
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 lg:px-6">
          <Link href={brandHref} className="flex items-center">
            <Image
              src="/octopus-logo.png"
              alt="Neptino"
              width={24}
              height={24}
              className="rounded"
            />
          </Link>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            {headerItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} variant="header" />
            ))}
          </nav>

          {actions ? <div className="flex items-center gap-3">{actions}</div> : <div />}
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-muted/30">
        <div className="mx-auto w-full max-w-[1400px] px-4 py-8 lg:px-8">{children}</div>
      </main>
    </div>
  )
}
