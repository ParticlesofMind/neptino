import { AdminShell } from "@/components/layouts/admin-shell";

const tutorials = [
  {
    title: "Platform Overview",
    summary: "Understand administrative workflows and approvals.",
  },
  {
    title: "Data Governance",
    summary: "Learn how to keep content compliant.",
  },
  {
    title: "Support Playbooks",
    summary: "Handle urgent instructor requests quickly.",
  },
];

export default function AdminTutorialsPage() {
  return (
    <AdminShell activePath="/admin/tutorials">
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Tutorials</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Guides tailored for administrators and support teams.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {tutorials.map((tutorial) => (
            <article key={tutorial.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">{tutorial.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{tutorial.summary}</p>
              <button className="mt-5 inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                View tutorial
              </button>
            </article>
          ))}
        </section>
      </main>
    </AdminShell>
  );
}
