import { MarketingShell } from "@/components/layouts/marketing-shell";

export default function SignInPage() {
  return (
    <MarketingShell activePath="/shared/signin">
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-12 sm:px-6 lg:px-8">
        <header>
          <h1 className="text-3xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to continue your Neptino journey.
          </p>
        </header>
        <form className="space-y-4 rounded-lg border border-border bg-card p-6 shadow-sm">
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground" htmlFor="email">
            Email
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              id="email"
              placeholder="you@example.com"
              type="email"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium text-foreground" htmlFor="password">
            Password
            <input
              className="rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              id="password"
              placeholder="••••••••"
              type="password"
            />
          </label>
          <button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90" type="submit">
            Sign in
          </button>
        </form>
      </main>
    </MarketingShell>
  );
}
