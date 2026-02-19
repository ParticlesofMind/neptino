export default function AdminCoursesPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">All Courses</h1>
        <p className="text-muted-foreground">Monitor and review all course content.</p>
      </header>
      <div className="rounded-xl border bg-background p-5 shadow-sm">
        <h2 className="text-lg font-semibold">Course Moderation Queue</h2>
        <p className="mt-2 text-sm text-muted-foreground">12 courses are awaiting review.</p>
      </div>
    </section>
  )
}
