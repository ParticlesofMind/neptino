import { AdminShell } from "@/components/layouts/admin-shell";

const metrics = [
  { label: "Active Schools", value: "12" },
  { label: "Total Instructors", value: "84" },
  { label: "Weekly Signups", value: "146" },
];

const alerts = [
  "2 new organization requests",
  "1 payment issue requires review",
  "3 course approvals pending",
];

export default function AdminHomePage() {
  return (
    <AdminShell activePath="/admin/home">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor organizations, content, and operational health.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {metrics.map((item) => (
            <article key={item.label} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-3xl font-bold text-foreground">{item.value}</p>
            </article>
          ))}
        </section>
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Operational Alerts</h2>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              {alerts.map((alert) => (
                <li key={alert}>{alert}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Quick Actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                Review new orgs
              </button>
              <button className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                View reports
              </button>
            </div>
          </div>
        </section>
      </main>
    </AdminShell>
  );
}
