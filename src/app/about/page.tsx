import Link from "next/link"
import { PublicShell } from "@/components/layout/public-shell"

export default function AboutPage() {
  return (
    <PublicShell>
      <section className="relative border-b border-[#e5e5e5] overflow-hidden" style={{ background: "linear-gradient(180deg,#f3f4f8 0%,#ffffff 75%)" }}>
        <div className="absolute inset-x-0 top-0 h-44 bg-[radial-gradient(circle_at_top_left,_rgba(74,148,255,0.16),_transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-5 lg:px-8 pt-16 pb-14 lg:pt-24 lg:pb-20">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-[#e6f2ff] px-3 py-1 text-xs font-semibold text-[#1f5fb3]">
              Our story
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight text-[#171717] leading-tight">
              Education software that stays focused on learning outcomes
            </h1>
            <p className="mt-5 max-w-2xl text-[#525252] leading-relaxed text-base md:text-lg">
              Neptino helps educators and learners collaborate through clear structure, interactive delivery, and measurable progress in one unified platform.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Built for", value: "Teachers & learners" },
              { label: "Core focus", value: "Clarity and engagement" },
              { label: "Outcome", value: "Better learning results" },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-[#dbeafe] bg-white/85 backdrop-blur px-5 py-4">
                <div className="text-xs uppercase tracking-wider text-[#737373]">{item.label}</div>
                <div className="mt-1 text-sm font-semibold text-[#171717]">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-5 lg:px-8 py-16 grid gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-2xl border border-[#e5e5e5] bg-white p-8 shadow-[0_8px_28px_rgba(15,23,42,0.05)]">
            <h2 className="text-2xl font-semibold text-[#171717]">Our mission</h2>
            <p className="mt-3 text-[#525252] leading-relaxed">
              We believe high-quality education should be easy to design and deliver. Neptino gives teachers practical tools to create engaging learning journeys while giving students a clear path to progress.
            </p>
            <p className="mt-4 text-[#525252] leading-relaxed">
              Instead of juggling disconnected apps, teams can plan curriculum, run live instruction, and evaluate outcomes in one place.
            </p>
          </div>

          <div className="rounded-2xl border border-[#e5e5e5] bg-[#f8fafc] p-8">
            <h2 className="text-2xl font-semibold text-[#171717]">What we focus on</h2>
            <ul className="mt-5 space-y-3">
              {[
                "Simple course planning and structured curriculum workflows",
                "Interactive teaching with real-time communication",
                "Visibility into performance, participation, and outcomes",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[#404040] leading-relaxed">
                  <span className="mt-[7px] h-1.5 w-1.5 rounded-full bg-[#4a94ff]" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="bg-[#f3f4f8] border-y border-[#e5e5e5]">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 grid gap-5 md:grid-cols-3">
          {[
            { title: "Clarity", body: "Clear course structure and predictable learning paths." },
            { title: "Engagement", body: "Interactive delivery that keeps classrooms active and connected." },
            { title: "Progress", body: "Meaningful reporting to support better decisions over time." },
          ].map((pillar) => (
            <article key={pillar.title} className="rounded-xl border border-[#e5e5e5] bg-white p-6">
              <h3 className="text-lg font-semibold text-[#171717]">{pillar.title}</h3>
              <p className="mt-2 text-sm text-[#525252] leading-relaxed">{pillar.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 lg:px-8 py-16 text-center">
          <p className="text-[#525252]">Want to explore what Neptino can do in practice?</p>
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/features"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#d4d4d4] bg-white px-7 text-sm font-semibold text-[#171717] hover:border-[#4a94ff] hover:text-[#4a94ff] transition-all duration-150"
            >
              View features
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[#4a94ff] px-7 text-sm font-semibold text-white shadow-sm hover:bg-[#2f7de0] transition-all duration-150"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>
    </PublicShell>
  )
}
