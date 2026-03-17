import Link from "next/link"
import { PublicShell } from "@/components/layout/public-shell"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="relative border-b border-border overflow-hidden bg-gradient-to-b from-muted to-background">
        <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,_rgba(74,148,255,0.16),_transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8 pt-16 pb-14 lg:pt-24 lg:pb-20">
          <div className="max-w-3xl">
            <Badge variant="primary">Our story</Badge>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Education software that stays focused on learning outcomes
            </h1>
            <p className="mt-5 max-w-2xl text-muted-foreground leading-relaxed text-base md:text-lg">
              Neptino helps educators and learners collaborate through clear structure, interactive delivery, and measurable progress in one unified platform.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Built for", value: "Teachers & learners" },
              { label: "Core focus", value: "Clarity and engagement" },
              { label: "Outcome", value: "Better learning results" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-primary/20 bg-background/85 backdrop-blur px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{item.label}</div>
                <div className="mt-1 text-sm font-semibold text-foreground">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-5 lg:px-8 py-16 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-border bg-background p-8 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
            <h2 className="text-2xl font-semibold text-foreground">Our mission</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              We believe high-quality education should be easy to design and deliver. Neptino gives teachers practical tools to create engaging learning journeys while giving students a clear path to progress.
            </p>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Instead of juggling disconnected apps, teams can plan curriculum, run live instruction, and evaluate outcomes in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-muted p-8">
            <h2 className="text-2xl font-semibold text-foreground">What we focus on</h2>
            <ul className="mt-5 space-y-3">
              {[
                "Simple course planning and structured curriculum workflows",
                "Interactive teaching with real-time communication",
                "Visibility into performance, participation, and outcomes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-foreground/80 leading-relaxed">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-muted border-y border-border">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 grid gap-5 md:grid-cols-3">
          {[
            { title: "Clarity", body: "Clear course structure and predictable learning paths." },
            { title: "Engagement", body: "Interactive delivery that keeps classrooms active and connected." },
            { title: "Progress", body: "Meaningful reporting to support better decisions over time." },
          ].map((pillar) => (
            <article key={pillar.title} className="rounded-xl border border-border bg-background p-6">
              <h3 className="text-lg font-semibold text-foreground">{pillar.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 text-center">
          <p className="text-muted-foreground">Want to explore what Neptino can do in practice?</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link href="/features" className={buttonVariants({ variant: "outline", size: "lg" })}>
              View features
            </Link>
            <Link href="/signup" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Create account
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
