import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react"

export function FieldLabel({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-sm font-medium text-foreground">{children}</span>
      {hint && <span className="ml-2 text-xs text-muted-foreground">{hint}</span>}
    </div>
  )
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
    />
  )
}

export function SelectInput({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      {...props}
      className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/15"
    >
      {children}
    </select>
  )
}

export function CharCount({ value, max }: { value: string; max: number }) {
  return (
    <p className="mt-1 text-right text-[11px] text-muted-foreground">
      {value.length}/{max}
    </p>
  )
}
