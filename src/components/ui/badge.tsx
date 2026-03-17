import { type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type BadgeVariant =
  | "default"
  | "primary"
  | "secondary"
  | "success"
  | "destructive"
  | "outline"

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  secondary: "bg-secondary/10 text-secondary",
  success: "bg-[#5c9970]/10 text-[#5c9970]",
  destructive: "bg-destructive/10 text-destructive",
  outline: "border border-border text-foreground",
}

type BadgeProps = {
  variant?: BadgeVariant
  className?: string
  children: ReactNode
}

export function Badge({ variant = "default", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        variantClasses[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
