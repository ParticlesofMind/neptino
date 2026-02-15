import Link from "next/link";

import { cn } from "@/lib/utils";

const navItems = [
  { href: "/teacher/courses", label: "My Courses" },
  { href: "/teacher/coursebuilder", label: "Course Builder" },
  { href: "/teacher/marketplace", label: "Marketplace" },
  { href: "/teacher/tutorials", label: "Tutorials" },
  { href: "/teacher/encyclopedia", label: "Encyclopedia" },
];

export function TeacherShell({
  children,
  activePath,
}: {
  children: React.ReactNode;
  activePath: string;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-[1600px] items-center px-6 py-4 lg:px-8">
          <Link href="/teacher/home" className="flex items-center flex-shrink-0">
            <span className="text-lg font-semibold tracking-tight text-foreground">Neptino</span>
          </Link>
          <ul className="hidden flex-1 items-center justify-center gap-8 list-none p-0 sm:flex">
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
            className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background"
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
