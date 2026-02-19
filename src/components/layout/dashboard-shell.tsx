import Link from "next/link"
import { type ReactNode } from "react"
import { NavLink } from "@/components/layout/nav-link"

type HeaderItem = {
  href: string
  label: string
}

type SidebarItem = {
  href: string
  label: string
  icon: ReactNode
}

type DashboardShellProps = {
  brandHref: string
  brandLabel: string
  headerItems: HeaderItem[]
  sidebarItems: SidebarItem[]
  actions?: ReactNode
  children: ReactNode
}

export function DashboardShell({
  brandHref,
  brandLabel,
  headerItems,
  sidebarItems,
  actions,
  children,
}: DashboardShellProps) {
  return (
    <div className="min-h-screen bg-accent/30">
      <header className="border-b bg-background/95">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 lg:px-6">
          <Link href={brandHref} className="text-lg font-semibold text-primary">
            {brandLabel}
          </Link>

          <div className="hidden items-center gap-4 text-sm md:flex">
            {headerItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} variant="header" />
            ))}
          </div>

          {actions ? <div className="w-28">{actions}</div> : <div />}
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1400px] grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="border-b border-r bg-background p-4 md:min-h-[calc(100vh-56px)] md:border-b-0">
          <h2 className="mb-3 text-xs font-semibold tracking-[0.14em] text-muted-foreground">MENU</h2>
          <nav className="grid gap-2">
            {sidebarItems.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                variant="sidebar"
              />
            ))}
          </nav>
        </aside>

        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
