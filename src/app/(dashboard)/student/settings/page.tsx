export default function StudentSettingsPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your learning preferences and account.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">Edit your personal details.</p>
        </article>
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Notifications</h2>
          <p className="mt-2 text-sm text-muted-foreground">Choose how you receive updates.</p>
        </article>
      </div>
    </section>
  )
}
