import Link from "next/link";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/shared/features", label: "Features" },
  { href: "/shared/about", label: "About" },
  { href: "/shared/pricing", label: "Pricing" },
  { href: "/shared/teachers", label: "Teachers" },
  { href: "/shared/students", label: "Students" },
  { href: "/shared/institutions", label: "Institutions" },
];

export function MarketingShell({
  children,
  activePath,
}: {
  children: React.ReactNode;
  activePath: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
          <Link href="/" className="flex items-center">
            <span className="text-lg font-semibold tracking-tight text-foreground">Neptino</span>
          </Link>
          <ul className="hidden items-center gap-10 list-none p-0 sm:flex">
            {navItems.map((item) => (
              <li key={item.href}>
                <Link
                  className={cn(
                    "text-sm font-medium transition-colors",
                    activePath === item.href
                      ? "text-primary"
                      : "text-muted-foreground hover:text-primary"
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-4">
            <Link
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
              href="/shared/signin"
            >
              Sign In
            </Link>
            <Link
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
              href="/shared/signup"
            >
              Sign Up
            </Link>
          </div>
        </nav>
      </header>
      {children}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <span className="text-sm font-semibold text-foreground">Neptino</span>
              <p className="mt-3 text-xs text-muted-foreground">
                Empowering educators and students worldwide.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Product</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link className="hover:text-primary" href="/shared/features">
                    Features
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-primary" href="/shared/pricing">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link className="hover:text-primary" href="/shared/about">
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Legal</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
                <li>Contact</li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Connect</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li>Twitter</li>
                <li>LinkedIn</li>
                <li>GitHub</li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            © 2024 Neptino. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
