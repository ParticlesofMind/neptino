import Link from "next/link";

import { TeacherShell } from "@/components/layouts/teacher-shell";

const courseCards = [
  {
    title: "Math 101",
    body: "In progress - 25 students",
  },
  {
    title: "Science Lab",
    body: "Draft - 10 students",
  },
  {
    title: "History",
    body: "Published - 30 students",
  },
];

export default function TeacherCoursesPage() {
  return (
    <TeacherShell activePath="/teacher/courses">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Courses</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage lessons, assignments, and curriculum updates.
          </p>
        </header>
        <section className="grid gap-6 md:grid-cols-3">
          {courseCards.map((course) => (
            <article key={course.title} className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">{course.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{course.body}</p>
              <button className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
                View course
              </button>
            </article>
          ))}
        </section>
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Create a new course</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Build lessons, upload resources, and invite students.
          </p>
          <Link
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
            href="/teacher/coursebuilder"
          >
            Start course builder
          </Link>
        </section>
      </main>
    </TeacherShell>
  );
}
