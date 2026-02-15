import Link from "next/link";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/student/home", label: "Dashboard" },
  { href: "/student/courses", label: "My Courses" },
  { href: "/student/progress", label: "Progress" },
  { href: "/student/marketplace", label: "Marketplace" },
  { href: "/student/tutorials", label: "Tutorials" },
];

export function StudentShell({
  children,
  activePath,
}: {
  children: React.ReactNode;
  activePath: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-7xl items-center gap-8 px-6 py-4 lg:px-8">
          <Link href="/student/home" className="flex items-center">
            <span className="text-lg font-semibold tracking-tight text-foreground">Neptino</span>
          </Link>
          <ul className="flex flex-1 items-center gap-6 list-none p-0">
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
          <button
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
            id="logout-btn"
            type="button"
          >
            Logout
          </button>
        </nav>
      </header>
      {children}
    </div>
  );
}
