import Link from "next/link"
import { PublicShell } from "@/components/layout/public-shell"

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
      <section className="relative border-b border-[#e5e5e5] overflow-hidden" style={{ background: "linear-gradient(180deg,#f3f4f8 0%,#ffffff 75%)" }}>
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_right,_rgba(74,148,255,0.16),_transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8 pt-16 pb-14 lg:pt-24 lg:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-[#e6f2ff] px-3 py-1 text-xs font-semibold text-[#1f5fb3]">
              Platform capabilities
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-[#171717] leading-tight">
              Built for high-impact learning experiences
            </h1>
            <p className="mt-5 max-w-2xl text-[#525252] leading-relaxed text-base md:text-lg">
              Neptino combines planning, delivery, communication, and tracking in one streamlined platform so teachers can focus on outcomes, not tool-switching.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { metric: "3x", label: "Faster course setup" },
              { metric: "Real-time", label: "Collaboration and delivery" },
              { metric: "Single", label: "Unified teaching workspace" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[#dbeafe] bg-white/85 backdrop-blur px-5 py-4">
                <div className="text-xl font-bold text-[#1f5fb3]">{item.metric}</div>
                <div className="mt-1 text-sm text-[#525252]">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 grid gap-6 md:grid-cols-3">
          {featureCards.map((feature) => (
            <article key={feature.title} className="rounded-2xl border border-[#e5e5e5] bg-white p-7 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
              <h2 className="text-xl font-semibold text-[#171717]">{feature.title}</h2>
              <p className="mt-3 text-sm text-[#525252] leading-relaxed">{feature.description}</p>
              <ul className="mt-5 space-y-2">
                {feature.points.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-[#404040]">
                    <span className="mt-[5px] h-1.5 w-1.5 rounded-full bg-[#4a94ff]" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#f8fafc] border-y border-[#e5e5e5]">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16">
          <div className="max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold text-[#171717]">How it works</h2>
            <p className="mt-3 text-[#525252]">A clear workflow from planning to teaching to improvement.</p>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { step: "01", title: "Design", body: "Build course structure, sessions, and templates in a guided flow." },
              { step: "02", title: "Deliver", body: "Teach with real-time tools, messaging, and interactive canvas experiences." },
              { step: "03", title: "Improve", body: "Use progress feedback and summaries to continuously optimize outcomes." },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-[#e5e5e5] bg-white px-5 py-6">
                <div className="text-xs font-bold tracking-wider text-[#4a94ff]">STEP {item.step}</div>
                <h3 className="mt-2 text-lg font-semibold text-[#171717]">{item.title}</h3>
                <p className="mt-2 text-sm text-[#525252] leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-[#171717]">Ready to try it?</h2>
          <p className="mt-3 text-[#525252]">Create an account and start building your first learning flow.</p>
          <div className="mt-7 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#4a94ff] px-7 text-sm font-semibold text-white shadow-sm hover:bg-[#2f7de0] transition-all duration-150"
            >
              Get started
            </Link>
            <Link
              href="/about"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d4d4d4] bg-white px-7 text-sm font-semibold text-[#171717] hover:border-[#4a94ff] hover:text-[#4a94ff] transition-all duration-150"
            >
              Learn about Neptino
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
