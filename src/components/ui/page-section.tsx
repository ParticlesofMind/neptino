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

type WelcomeBannerProps = {
  title: string
  description: string
  variant?: "emerald" | "amber"
}

export function WelcomeBanner({ title, description, variant = "emerald" }: WelcomeBannerProps) {
  const variants = {
    emerald: "from-green-50 to-emerald-50 border-green-200",
    amber: "from-amber-50 to-orange-50 border-amber-200"
  }
  return (
    <div className={`rounded-xl bg-gradient-to-r ${variants[variant]} border p-6`}>
      <h1 className="text-2xl font-bold text-foreground mb-2">{title}</h1>
      <p className="text-foreground/80">{description}</p>
    </div>
  )
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-lg font-semibold text-foreground mb-4">{children}</h2>
}

export function ActivityItem({ children }: { children: ReactNode }) {
  return (
    <div className="p-4 rounded-lg bg-muted/30 border border-border">
      <p className="text-sm text-foreground">{children}</p>
    </div>
  )
}

type InfoCardProps = {
  title: string
  description: string
}

export function InfoCard({ title, description }: InfoCardProps) {
  return (
    <article className="rounded-xl border bg-background p-5 shadow-sm transition hover:border-primary/30 hover:shadow-md">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </article>
  )
}
