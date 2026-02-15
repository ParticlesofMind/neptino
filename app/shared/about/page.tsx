import { MarketingShell } from "@/components/layouts/marketing-shell";

const values = [
  {
    title: "Learner-centered",
    body: "Design for curiosity, agency, and clarity.",
  },
  {
    title: "Educator-powered",
    body: "Tools that adapt to classroom realities.",
  },
  {
    title: "Future-ready",
    body: "Build skills for tomorrow, today.",
  },
];

export default function AboutPage() {
  return (
    <MarketingShell activePath="/shared/about">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground">About Neptino</h1>
          <p className="mt-4 text-base text-muted-foreground">
            Neptino is built to help educators create immersive learning journeys for every student.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {values.map((item) => (
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
