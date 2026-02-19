import Link from "next/link"
import { PublicShell } from "@/components/layout/public-shell"

const brands = ["Paraswap", "Superfluid", "Cobo", "CowSwap", "DODO", "Steelwallet", "AlphaWallet", "Frontier"]

const features = [
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

export default function Home() {
  return (
    <PublicShell>
      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section
        className="relative"
        style={{ background: "linear-gradient(180deg,#f3f4f8 0%,#ffffff 28%,#ffffff 100%)" }}
      >
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 lg:py-28 grid gap-12 lg:gap-8 lg:grid-cols-[1fr_1.1fr] items-center">
          {/* Left — text */}
          <div className="flex flex-col gap-6 max-w-[34rem]">
            <h1 className="text-[2.8rem] sm:text-[3.5rem] lg:text-[4rem] font-bold leading-[1.05] text-[#171717] tracking-tight">
              <span
                className="inline-block relative px-[0.15em] rounded-[0.45rem]"
                style={{ background: "linear-gradient(120deg,#ffd6e7 0%,#ffd6e7 100%)" }}
              >
                Powerful
              </span>{" "}
              tutoring and classes.
            </h1>
            <p className="text-lg text-[#525252] leading-relaxed">
              Set your own rate, we&apos;ll connect you with students, you earn money on your schedule.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/signup"
                className="inline-flex h-11 min-w-[11rem] items-center justify-center rounded-xl bg-[#4a94ff] px-6 text-sm font-semibold text-white shadow-sm hover:bg-[#2f7de0] transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a94ff]"
              >
                Get started today
              </Link>
              <Link
                href="/features"
                className="text-sm font-semibold text-[#171717] hover:text-[#4a94ff] hover:underline transition-colors duration-150"
              >
                See Details
              </Link>
            </div>
            <p className="text-[0.9rem] text-[#a3a3a3]">14-day free trial. No credit card required.</p>
          </div>

          {/* Right — preview card */}
          <div className="rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_2px_24px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#4a94ff]/10 px-3 py-1 text-xs font-semibold text-[#4a94ff]">
                Live demo
              </span>
              <span className="text-xs text-[#a3a3a3]">Neptino canvas</span>
            </div>
            <div className="px-5 pt-3 pb-1">
              <h2 className="text-base font-semibold text-[#171717]">Orbit through a Neptino session.</h2>
              <p className="mt-1.5 text-sm text-[#525252] leading-relaxed">
                We render entire courses on a high-performance PIXI.js canvas. Watch how builders plan, teach, and track progress in seconds.
              </p>
            </div>
            <ul className="mt-3 divide-y divide-[#f5f5f5]">
              {features.map((f, i) => (
                <li
                  key={i}
                  className={`flex flex-col gap-0.5 px-5 py-3.5 ${i === 0 ? "bg-[#f5f9ff]" : ""}`}
                >
                  <span className="text-sm font-semibold text-[#171717]">{f.title}</span>
                  <span className="text-xs text-[#737373]">{f.detail}</span>
                </li>
              ))}
            </ul>
            <div className="h-1.5 mx-5 mb-5 mt-4 rounded-full bg-[#e5e5e5] overflow-hidden">
              <div className="h-full w-1/3 rounded-full bg-[#4a94ff]" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trusted by ────────────────────────────────────────────────── */}
      <section className="border-t border-[#f5f5f5] bg-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-8 flex flex-col sm:flex-row items-center gap-6">
          <span className="shrink-0 text-xs font-semibold uppercase tracking-widest text-[#a3a3a3]">Used by</span>
          <ul className="flex flex-wrap items-center gap-x-7 gap-y-2">
            {brands.map((b) => (
              <li key={b} className="text-sm font-medium text-[#737373] hover:text-[#171717] transition-colors duration-150 cursor-default">
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Features strip ────────────────────────────────────────────── */}
      <section className="bg-[#f3f4f8] border-y border-[#e5e5e5]">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 grid gap-6 sm:grid-cols-3">
          {[
            { title: "Course Building", desc: "Create rich, interactive courses with multimedia content and assessments.", color: "#4a94ff" },
            { title: "Live Learning", desc: "Real-time collaboration with integrated messaging and canvas tools.", color: "#00ccb3" },
            { title: "Progress Tracking", desc: "Monitor learner engagement and achievement with detailed analytics.", color: "#8b5cf6" },
          ].map((f) => (
            <div key={f.title} className="rounded-xl bg-white border border-[#e5e5e5] p-6 shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="mb-3 h-1 w-10 rounded-full" style={{ background: f.color }} />
              <h3 className="text-base font-semibold text-[#171717] mb-2">{f.title}</h3>
              <p className="text-sm text-[#525252] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA banner ────────────────────────────────────────────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-20 text-center flex flex-col items-center gap-6">
          <h2 className="text-3xl sm:text-4xl font-bold text-[#171717] tracking-tight">
            Ready to start teaching?
          </h2>
          <p className="text-[#525252] max-w-xl">
            Join thousands of educators already using Neptino to build and deliver courses.
          </p>
          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-[#4a94ff] px-8 text-sm font-semibold text-white shadow-sm hover:bg-[#2f7de0] transition-all duration-150"
          >
            Create your free account
          </Link>
        </div>
      </section>
    </PublicShell>
  )
}
