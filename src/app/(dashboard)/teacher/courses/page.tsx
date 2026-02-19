export default function TeacherCoursesPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">My Courses</h1>
        <p className="text-muted-foreground">Create, organize, and publish your course library.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Active Courses</h2>
          <p className="mt-2 text-sm text-muted-foreground">You currently have 5 active courses.</p>
        </article>
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Drafts</h2>
          <p className="mt-2 text-sm text-muted-foreground">2 courses are saved as drafts.</p>
        </article>
      </div>
    </section>
  )
}
