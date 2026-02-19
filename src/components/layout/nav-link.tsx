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
        className={active ? "text-primary" : "text-muted-foreground hover:text-primary"}
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
