export default function AdminUsersPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground">Manage platform users and permissions.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Total Users</p>
          <p className="mt-2 text-2xl font-semibold">1,284</p>
        </article>
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Teachers</p>
          <p className="mt-2 text-2xl font-semibold">212</p>
        </article>
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <p className="text-sm text-muted-foreground">Students</p>
          <p className="mt-2 text-2xl font-semibold">1,032</p>
        </article>
      </div>
    </section>
  )
}
