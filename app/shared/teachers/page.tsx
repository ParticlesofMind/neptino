import { MarketingShell } from "@/components/layouts/marketing-shell";

const benefits = [
  {
    title: "Course Builder",
    body: "Design visual lessons with drag-and-drop tools.",
  },
  {
    title: "Reusable Templates",
    body: "Start faster with curated content packs.",
  },
  {
    title: "Collaboration",
    body: "Co-create with your teaching team.",
  },
];

export default function TeachersPage() {
  return (
    <MarketingShell activePath="/shared/teachers">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground">For Teachers</h1>
          <p className="mt-4 text-base text-muted-foreground">
            Craft engaging lessons and bring students along for the journey.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {benefits.map((item) => (
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
