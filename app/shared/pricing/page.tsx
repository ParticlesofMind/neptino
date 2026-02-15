import { MarketingShell } from "@/components/layouts/marketing-shell";

const plans = [
  {
    title: "Starter",
    price: "$0",
    summary: "For solo educators exploring Neptino.",
  },
  {
    title: "Team",
    price: "$29",
    summary: "For schools and departments collaborating.",
  },
  {
    title: "Enterprise",
    price: "Custom",
    summary: "For districts with advanced governance needs.",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell activePath="/shared/pricing">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-12 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <h1 className="text-4xl font-bold text-foreground">Pricing</h1>
          <p className="mt-4 text-base text-muted-foreground">
            Flexible plans for classrooms, schools, and districts.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">{plan.title}</h2>
              <p className="mt-2 text-3xl font-bold text-foreground">{plan.price}</p>
              <p className="mt-3 text-sm text-muted-foreground">{plan.summary}</p>
              <button className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                Get started
              </button>
            </article>
          ))}
        </section>
      </main>
    </MarketingShell>
  );
}
