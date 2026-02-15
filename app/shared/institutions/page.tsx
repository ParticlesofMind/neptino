import { MarketingShell } from "@/components/layouts/marketing-shell";

const offerings = [
  {
    title: "Centralized Governance",
    body: "Manage content approvals and permissions.",
  },
  {
    title: "District Analytics",
    body: "Monitor impact across schools in real time.",
  },
  {
    title: "Secure Infrastructure",
    body: "Built with compliance and privacy in mind.",
  },
];

export default function InstitutionsPage() {
  return (
    <MarketingShell activePath="/shared/institutions">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground">For Institutions</h1>
          <p className="mt-4 text-base text-muted-foreground">
            Scale learning experiences across campuses and districts.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {offerings.map((item) => (
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
