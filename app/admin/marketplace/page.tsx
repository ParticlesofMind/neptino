import { AdminShell } from "@/components/layouts/admin-shell";

const listings = [
  {
    title: "Advanced Physics",
    summary: "Pending vendor verification",
  },
  {
    title: "Creative Coding",
    summary: "Top-rated marketplace bundle",
  },
  {
    title: "Social Studies Pack",
    summary: "Requires content audit",
  },
];

export default function AdminMarketplacePage() {
  return (
    <AdminShell activePath="/admin/marketplace">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Marketplace</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Curate listings and manage partner submissions.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {listings.map((listing) => (
            <article key={listing.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">{listing.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{listing.summary}</p>
              <div className="mt-6 flex items-center gap-3">
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                  Review
                </button>
                <button className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                  Suspend
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </AdminShell>
  );
}
