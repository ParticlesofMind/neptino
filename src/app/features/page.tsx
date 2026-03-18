import Link from "next/link"
import { PublicShell } from "@/components/layout/public-shell"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

const featureCards = [
  {
    title: "Course Building",
    description: "Create structured learning paths with reusable templates, curriculum modules, and flexible page layouts.",
    points: ["Template-driven course setup", "Multi-page canvas authoring", "Curriculum and module support"],
  },
  {
    title: "Live Learning",
    description: "Deliver engaging sessions with interactive canvas tools, messaging, and real-time classroom collaboration.",
    points: ["Interactive teaching canvas", "Integrated class messaging", "Live collaboration workflows"],
  },
  {
    title: "Progress Tracking",
    description: "Track learner participation and outcomes with clear summaries and insight-driven reporting.",
    points: ["Learner participation visibility", "Performance summaries", "Actionable progress insights"],
  },
]

export default function FeaturesPage() {
  return (
    <PublicShell>
      <section className="relative border-b border-border overflow-hidden bg-gradient-to-b from-muted to-background">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_right,_rgba(74,148,255,0.16),_transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8 pt-16 pb-14 lg:pt-24 lg:pb-20">
          <div className="max-w-3xl">
            <Badge variant="primary">Platform capabilities</Badge>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
              Built for high-impact learning experiences
            </h1>
            <p className="mt-5 max-w-2xl text-muted-foreground leading-relaxed text-base md:text-lg">
              Neptino combines planning, delivery, communication, and tracking in one streamlined platform so teachers can focus on outcomes, not tool-switching.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { metric: "3x", label: "Faster course setup" },
              { metric: "Real-time", label: "Collaboration and delivery" },
              { metric: "Single", label: "Unified teaching workspace" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-primary/20 bg-background/85 backdrop-blur px-5 py-5">
                <div className="text-xl font-bold text-accent-foreground">{item.metric}</div>
                <div className="mt-1 text-sm text-muted-foreground">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 grid gap-6 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-border bg-background p-7 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
              <h2 className="text-xl font-semibold text-foreground">{feature.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              <ul className="mt-5 space-y-2">
                {feature.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-foreground/80">
                    <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-muted border-y border-border">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">How it works</h2>
            <p className="mt-3 text-muted-foreground">A clear workflow from planning to teaching to improvement.</p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { step: "01", title: "Design", body: "Build course structure, sessions, and templates in a guided flow." },
              { step: "02", title: "Deliver", body: "Teach with real-time tools, messaging, and interactive canvas experiences." },
              { step: "03", title: "Improve", body: "Use progress feedback and summaries to continuously optimize outcomes." },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-border bg-background px-5 py-6">
                <div className="font-sans text-xs font-bold tracking-wider text-primary">STEP {item.step}</div>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 text-center">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Ready to try it?</h2>
          <p className="mt-3 text-muted-foreground">Create an account and start building your first learning flow.</p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <Link href="/signup" className={buttonVariants({ variant: "primary", size: "lg" })}>
              Get started
            </Link>
            <Link href="/about" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Learn about Neptino
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
