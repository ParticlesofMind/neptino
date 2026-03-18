"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { type ReactNode } from "react"

type NavLinkProps = {
  href: string
  label: string
  icon?: ReactNode
  variant: "header" | "sidebar"
}

function isActivePath(pathname: string, href: string) {
  if (pathname === href) {
    return true
  }

  if (href !== "/" && pathname.startsWith(`${href}/`)) {
    return true
  }

  return false
}

export function NavLink({ href, label, icon, variant }: NavLinkProps) {
  const pathname = usePathname()
  const active = isActivePath(pathname, href)

  if (variant === "header") {
    return (
      <Link
        href={href}
        className={`rounded-md px-2.5 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary/60 ${
          active
            ? "text-foreground bg-muted/60"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
        }`}
      >
        {label}
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={
        active
          ? "flex items-center gap-3 rounded-lg border border-primary/20 bg-accent px-3 py-2 text-primary"
          : "flex items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-muted-foreground transition-all hover:border-primary/20 hover:bg-accent hover:text-primary"
      }
    >
      {icon}
      {label}
    </Link>
  )
}
