import { StudentShell } from "@/components/layouts/student-shell";

const overview = [
  { label: "Active Courses", value: "3" },
  { label: "Assignments Due", value: "4" },
  { label: "Study Streak", value: "12 days" },
];

const nextLessons = [
  {
    title: "Algebra II - Quadratic Review",
    detail: "Starts in 2 hours",
  },
  {
    title: "World History - Industrial Revolution",
    detail: "Starts tomorrow",
  },
];

export default function StudentHomePage() {
  return (
    <StudentShell activePath="/student/home">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Student Dashboard</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Keep track of your lessons, assignments, and progress.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {overview.map((item) => (
            <article key={item.label} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
              <p className="mt-3 text-3xl font-bold text-foreground">{item.value}</p>
            </article>
          ))}
        </section>
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Next lessons</h2>
            <div className="mt-4 space-y-3 text-sm text-muted-foreground">
              {nextLessons.map((lesson) => (
                <div key={lesson.title} className="flex flex-col gap-1">
                  <span className="font-medium text-foreground">{lesson.title}</span>
                  <span>{lesson.detail}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Quick actions</h2>
            <div className="mt-4 flex flex-col gap-3">
              <button className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                Resume latest lesson
              </button>
              <button className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted">
                Review assignments
              </button>
            </div>
          </div>
        </section>
      </main>
    </StudentShell>
  );
}
