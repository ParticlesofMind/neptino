import { type LabelHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Label({
  className,
  children,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("text-sm font-sans font-medium text-foreground leading-none", className)}
      {...props}
    >
      {children}
    </label>
  )
}
