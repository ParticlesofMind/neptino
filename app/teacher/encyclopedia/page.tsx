import Link from "next/link";
import Script from "next/script";

import EncyclopediaClient from "./encyclopedia-client";

export default function EncyclopediaPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Script
        src="https://cdn.knightlab.com/libs/timeline3/latest/js/timeline.js"
        strategy="afterInteractive"
      />
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-[1600px] items-center px-6 py-4 lg:px-8">
          <Link href="/teacher/home" className="flex items-center flex-shrink-0">
            <span className="text-lg font-semibold tracking-tight text-foreground">Neptino</span>
          </Link>
          <ul className="hidden flex-1 items-center justify-center gap-8 list-none p-0 sm:flex">
            <li>
              <Link
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                href="/teacher/courses"
              >
                My Courses
              </Link>
            </li>
            <li>
              <Link
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                href="/teacher/marketplace"
              >
                Marketplace
              </Link>
            </li>
            <li>
              <Link
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                href="/teacher/tutorials"
              >
                Tutorials
              </Link>
            </li>
            <li>
              <Link className="text-sm font-medium text-primary" href="/teacher/encyclopedia">
                Encyclopedia
              </Link>
            </li>
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

      <main className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col gap-5 px-3 py-6 lg:px-5 lg:py-8">
        <EncyclopediaClient />
      </main>
    </div>
  );
}
