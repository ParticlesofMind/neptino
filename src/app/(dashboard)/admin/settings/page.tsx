export default function AdminSettingsPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure platform behavior and policies.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Security</h2>
          <p className="mt-2 text-sm text-muted-foreground">Manage authentication and access settings.</p>
        </article>
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="mt-2 text-sm text-muted-foreground">Set email and in-app alert behavior.</p>
        </article>
      </div>
    </section>
  )
}
