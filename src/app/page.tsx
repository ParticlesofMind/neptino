import Link from "next/link"
import { PublicShell } from "@/components/layout/public-shell"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"

const brands = ["Paraswap", "Superfluid", "Cobo", "CowSwap", "DODO", "Steelwallet", "AlphaWallet", "Frontier"]

const previewFeatures = [
  {
    title: "Plan stellar lessons",
    detail: "Layer templates, syllabi, and multi-page canvases.",
  },
  {
    title: "Guide live orbits",
    detail: "Interactive canvas + live tools keep every learner in sync.",
  },
  {
    title: "Summarise & act",
    detail: "Auto summaries, payouts, and feedback roll in instantly.",
  },
]

const featureCards = [
  {
    title: "Course Building",
    desc: "Create rich, interactive courses with multimedia content and assessments.",
    accentClass: "bg-primary",
  },
  {
    title: "Live Learning",
    desc: "Real-time collaboration with integrated messaging and canvas tools.",
    accentClass: "bg-secondary",
  },
  {
    title: "Progress Tracking",
    desc: "Monitor learner engagement and achievement with detailed analytics.",
    accentClass: "bg-[#6b8fc4]",
  },
]

export default function Home() {
  return (
    <PublicShell>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-muted to-background">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 lg:py-28 grid gap-12 lg:gap-16 lg:grid-cols-[1fr_1.1fr] items-center">
          {/* Left — text */}
          <div className="animate-fade-up flex flex-col gap-6 max-w-[34rem]">
            <h1 className="text-5xl lg:text-6xl font-bold leading-[1.05] text-foreground tracking-tight">
              <span className="inline-block relative px-[0.15em] rounded-[0.45rem] bg-primary/10">
                Powerful
              </span>{" "}
              tutoring and classes.
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Set your own rate, we&apos;ll connect you with students, you earn money on your schedule.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className={buttonVariants({ variant: "primary", size: "lg", className: "min-w-[11rem]" })}
              >
                Get started today
              </Link>
              <Link
                href="/features"
                className="text-sm font-semibold text-foreground hover:text-primary hover:underline transition-colors duration-150"
              >
                See Details
              </Link>
            </div>
            <p className="text-[0.9rem] text-muted-foreground/70">14-day free trial. No credit card required.</p>
          </div>

          {/* Right — preview card */}
          <div className="animate-fade-up [animation-delay:120ms] rounded-2xl border border-border bg-background shadow-[0_2px_24px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <Badge variant="primary">Live demo</Badge>
              <span className="text-xs text-muted-foreground">Neptino canvas</span>
            </div>
            <div className="px-5 pt-3 pb-1">
              <h2 className="text-base font-semibold text-foreground">Orbit through a Neptino session.</h2>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                We render entire courses on a high-performance canvas. Watch how builders plan, teach, and track progress in seconds.
              </p>
            </div>
            <ul className="mt-3 divide-y divide-muted">
              {previewFeatures.map((f, i) => (
                <li
                  key={i}
                  className={`flex flex-col gap-0.5 px-5 py-3.5 ${i === 0 ? "bg-accent" : ""}`}
                >
                  <span className="text-sm font-semibold text-foreground">{f.title}</span>
                  <span className="text-xs text-muted-foreground">{f.detail}</span>
                </li>
              ))}
            </ul>
            <div className="h-1.5 mx-5 mb-5 mt-4 rounded-full bg-border overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-primary" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted by ────────────────────────────────────────────────── */}
      <section className="border-t border-muted bg-background">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-14 flex flex-col sm:flex-row items-center gap-6">
          <span className="shrink-0 font-sans text-xs font-semibold uppercase tracking-widest text-muted-foreground">Used by</span>
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-2">
            {brands.map((b) => (
              <li key={b} className="font-sans text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-150 cursor-default">
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Features strip ────────────────────────────────────────────── */}
      <section className="bg-muted border-y border-border">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 grid gap-6 sm:grid-cols-3">
          {featureCards.map((f) => (
            <div key={f.title} className="rounded-xl bg-background border border-border p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className={`mb-3 h-1 w-10 rounded-full ${f.accentClass}`} />
              <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────── */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 text-center flex flex-col items-center gap-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight leading-tight">
            Ready to start teaching?
          </h2>
          <p className="text-muted-foreground max-w-xl">
            Join thousands of educators already using Neptino to build and deliver courses.
          </p>
          <Link href="/signup" className={buttonVariants({ variant: "primary", size: "lg" })}>
            Create your free account
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
