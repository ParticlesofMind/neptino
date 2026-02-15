import { StudentShell } from "@/components/layouts/student-shell";

const collections = [
  {
    title: "Practice Packs",
    summary: "Curated problem sets for exam prep.",
  },
  {
    title: "Creative Challenges",
    summary: "Project ideas and inspiration.",
  },
  {
    title: "Career Pathways",
    summary: "Explore future-ready learning bundles.",
  },
];

export default function StudentMarketplacePage() {
  return (
    <StudentShell activePath="/student/marketplace">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Discover enrichment content and practice materials.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {collections.map((collection) => (
            <article key={collection.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">{collection.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{collection.summary}</p>
              <button className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                Explore
              </button>
            </article>
          ))}
        </section>
      </main>
    </StudentShell>
  );
}
