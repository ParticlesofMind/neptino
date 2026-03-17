import { type ButtonHTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/utils"

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "destructive"
export type ButtonSize = "sm" | "md" | "lg"

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm focus-visible:outline-primary",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/90 shadow-sm focus-visible:outline-secondary",
  outline:
    "border border-border bg-background text-foreground hover:bg-muted/50 hover:border-primary/40 hover:text-primary focus-visible:outline-primary",
  ghost:
    "bg-transparent text-foreground hover:bg-muted/50 focus-visible:outline-primary",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm focus-visible:outline-destructive",
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs rounded",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-11 px-6 text-sm rounded-md",
}

const BASE =
  "inline-flex items-center justify-center gap-2 font-semibold transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50"

/** Generates button Tailwind classes without rendering. Use on <Link> or any element. */
export function buttonVariants({
  variant = "primary",
  size = "md",
  className,
}: {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
} = {}) {
  return cn(BASE, variantClasses[variant], sizeClasses[size], className)
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  children: ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(BASE, variantClasses[variant], sizeClasses[size], className)}
    >
      {children}
    </button>
  )
}
