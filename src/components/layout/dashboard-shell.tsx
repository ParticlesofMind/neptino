import Link from "next/link"
import Image from "next/image"
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
  role?: 'admin' | 'teacher' | 'student'
}

export function DashboardShell({
  brandHref,
  brandLabel,
  headerItems,
  sidebarItems,
  actions,
  children,
  role = 'student',
}: DashboardShellProps) {
  const brandColor = {
    admin: 'from-amber-600 to-amber-700',
    teacher: 'from-blue-600 to-blue-700',
    student: 'from-green-600 to-green-700',
  }[role]

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex h-16 w-full max-w-[1400px] items-center justify-between px-4 lg:px-6">
          <Link href={brandHref} className="text-lg font-bold text-slate-900">
            {brandLabel}
          </Link>

          <div className="hidden items-center gap-1 text-sm md:flex">
            {headerItems.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} variant="header" />
            ))}
          </div>

          {actions ? <div className="flex items-center gap-4">{actions}</div> : <div />}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex md:w-64 flex-col border-r border-slate-200 bg-white shadow-sm">
          {/* Brand Block */}
          <div className={`bg-gradient-to-br ${brandColor} p-6 text-white`}>
            <Image 
              src="/octopus-logo.png" 
              alt="Neptino Logo" 
              width={40} 
              height={40}
              className="rounded-lg mb-3 bg-white/20 p-1"
            />
            <div className="font-bold text-lg">Neptino</div>
            <div className="text-xs text-white/80 mt-1 capitalize">{role} Portal</div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-1">
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

          {/* Footer */}
          <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
            <p className="font-medium text-slate-700 mb-2">Platform Info</p>
            <p>Version 1.0.0</p>
            <p className="mt-1">© {new Date().getFullYear()} Neptino</p>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
