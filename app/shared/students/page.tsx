import { MarketingShell } from "@/components/layouts/marketing-shell";

const benefits = [
  {
    title: "Guided Learning",
    body: "Follow structured paths with helpful checkpoints.",
  },
  {
    title: "Progress Tracking",
    body: "See growth over time and celebrate milestones.",
  },
  {
    title: "Community",
    body: "Connect with peers and mentors.",
  },
];

export default function StudentsPage() {
  return (
    <MarketingShell activePath="/shared/students">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground">For Students</h1>
          <p className="mt-4 text-base text-muted-foreground">
            Learn with confidence using interactive lessons and resources.
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
