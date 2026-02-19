export default function TeacherSettingsPage() {
  return (
    <section className="space-y-4">
      <header>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Update your profile and teaching preferences.</p>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Profile</h2>
          <p className="mt-2 text-sm text-muted-foreground">Manage your account details.</p>
        </article>
        <article className="rounded-xl border bg-background p-5 shadow-sm">
          <h2 className="text-lg font-semibold">Classroom Preferences</h2>
          <p className="mt-2 text-sm text-muted-foreground">Control classroom defaults and notifications.</p>
        </article>
      </div>
    </section>
  )
}
