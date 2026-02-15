import { AdminShell } from "@/components/layouts/admin-shell";

const courses = [
  {
    title: "STEM Foundations",
    status: "Awaiting approval",
  },
  {
    title: "World History",
    status: "Published",
  },
  {
    title: "Creative Writing",
    status: "Needs review",
  },
];

export default function AdminCoursesPage() {
  return (
    <AdminShell activePath="/admin/courses">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Courses</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Approve and monitor courses across all organizations.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {courses.map((course) => (
            <article key={course.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">{course.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">Status: {course.status}</p>
              <button className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                Review course
              </button>
            </article>
          ))}
        </section>
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Moderation queue</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            6 items awaiting review across lessons and assessments.
          </p>
        </section>
      </main>
    </AdminShell>
  );
}
