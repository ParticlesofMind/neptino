import Image from "next/image"
import Link from "next/link"
import { type ReactNode } from "react"

type PublicShellProps = {
  title: string
  subtitle: string
  children: ReactNode
}

export function PublicShell({ title, subtitle, children }: PublicShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <Image 
              src="/octopus-logo.png" 
              alt="Neptino Logo" 
              width={32} 
              height={32} 
              className="rounded-md bg-gradient-to-br from-blue-500 to-blue-600 p-1.5"
            />
            <span className="text-lg font-bold text-slate-900">Neptino</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">Home</Link>
            <Link href="/teacher/tutorials" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition">Features</Link>
            <Link href="/login" className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">Sign In</Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-12 lg:px-8">
        {/* Hero Section */}
        <div className="mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">{title}</h1>
          <p className="text-lg text-slate-600 max-w-2xl">{subtitle}</p>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-8 md:p-12">{children}</div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white/95 backdrop-blur-sm mt-16">
        <div className="mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-8 w-full max-w-7xl px-4 py-8 lg:px-8">
          <div className="flex items-center gap-2">
            <Image 
              src="/octopus-logo.png" 
              alt="Neptino Logo" 
              width={24} 
              height={24} 
              className="rounded-md bg-gradient-to-br from-blue-500 to-blue-600 p-1"
            />
            <span className="text-sm font-semibold text-slate-900">Neptino</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xs text-slate-600 hover:text-blue-600 transition">Privacy Policy</Link>
            <Link href="/" className="text-xs text-slate-600 hover:text-blue-600 transition">Terms of Service</Link>
            <Link href="/" className="text-xs text-slate-600 hover:text-blue-600 transition">Contact</Link>
          </div>
          <div className="text-xs text-slate-500">© {new Date().getFullYear()} Neptino. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
