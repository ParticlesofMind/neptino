// Shared presentational primitives for the curriculum section.
// No hooks, no data fetching.
import { OverlineLabel } from "@/components/ui/overline-label"

export function Divider({ label }: { label: string }) {
  return (
    <div className="mt-8 pt-6 border-t border-border">
      <OverlineLabel className="mb-4">{label}</OverlineLabel>
    </div>
  )
}

export function RadioCard({
  name,
  value,
  checked,
  onChange,
  title,
  meta,
  description,
  compact = false,
}: {
  name: string
  value: string
  checked: boolean
  onChange: (v: string) => void
  title: string
  meta?: string
  description: string
  compact?: boolean
}) {
  return (
    <label
      className={`relative flex cursor-pointer rounded-lg border transition ${compact ? "p-2.5" : "p-4"} ${
        checked ? "border-primary bg-accent" : "border-border bg-background hover:border-primary/30"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="sr-only"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`${compact ? "text-xs" : "text-sm"} font-medium ${checked ? "text-primary" : "text-foreground"}`}>{title}</span>
          {meta && <span className={`${compact ? "text-[11px]" : "text-xs"} text-muted-foreground`}>{meta}</span>}
        </div>
        <p className={`${compact ? "mt-0.5 text-[11px] leading-snug" : "mt-1 text-xs leading-relaxed"} text-muted-foreground`}>{description}</p>
      </div>
    </label>
  )
}
