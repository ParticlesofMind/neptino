import { MarketingShell } from "@/components/layouts/marketing-shell";

const highlights = [
  {
    title: "Interactive Canvas",
    body: "Build rich course experiences with real-time visual tools.",
  },
  {
    title: "Smart Assessments",
    body: "Blend quizzes, reflections, and adaptive checkpoints.",
  },
  {
    title: "Insightful Analytics",
    body: "Track progress with actionable learning insights.",
  },
];

export default function FeaturesPage() {
  return (
    <MarketingShell activePath="/shared/features">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground">Features</h1>
          <p className="mt-4 text-base text-muted-foreground">
            Everything you need to design, deliver, and measure learning.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {highlights.map((item) => (
            <article key={item.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">{item.title}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
