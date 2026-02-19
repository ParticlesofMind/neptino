export default function StudentCoursesPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Courses</h1>
        <p className="text-muted-foreground">View enrolled classes and continue learning.</p>
      </header>
      <div className="rounded-xl border bg-background p-5 shadow-sm">
        <p className="text-sm text-muted-foreground">You are currently enrolled in 6 classes.</p>
      </div>
    </section>
  )
}
