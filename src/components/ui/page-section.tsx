import { type ReactNode } from "react"

type PageSectionProps = {
  title: string
  description: string
  children: ReactNode
}

export function PageSection({ title, description, children }: PageSectionProps) {
  return (
    <section className="overflow-hidden rounded-xl border bg-background shadow-sm">
      <header className="border-b bg-accent/40 px-5 py-4">
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

type MetricCardProps = {
  label: string
  value: string
}

export function MetricCard({ label, value }: MetricCardProps) {
  return (
    <article className="rounded-xl border bg-background p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </article>
  )
}
