import { StudentShell } from "@/components/layouts/student-shell";

const milestones = [
  { label: "Weekly Goal", value: "4 / 6 lessons" },
  { label: "Quiz Average", value: "92%" },
  { label: "Projects Submitted", value: "7" },
];

const insights = [
  "Strength: Critical thinking",
  "Focus area: Math fluency",
  "Badge earned: Consistency",
];

export default function StudentProgressPage() {
  return (
    <StudentShell activePath="/student/progress">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Progress</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review your achievements and performance trends.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {milestones.map((item) => (
            <article key={item.label} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-2xl font-bold text-foreground">{item.value}</p>
            </article>
          ))}
        </section>
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Insights</h2>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            {insights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      </main>
    </StudentShell>
  );
}
