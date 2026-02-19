'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicShell } from '@/components/layout/public-shell'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.refresh()
    }
  }

  return (
    <PublicShell hideNavActions>
      <div
        className="flex min-h-[calc(100vh-3.75rem-56px)] items-center justify-center px-4 py-16"
        style={{ background: "linear-gradient(180deg,#f3f4f8 0%,#ffffff 60%)" }}
      >
        <div className="w-full max-w-[22rem]">
          {/* Card */}
          <div className="rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Card header */}
            <div className="px-8 pt-8 pb-6 border-b border-[#f5f5f5]">
              <h1 className="text-xl font-bold text-[#171717] mb-1">Welcome back</h1>
              <p className="text-sm text-[#737373]">Sign in to your Neptino account</p>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="px-8 py-6 space-y-4">
              {error && (
                <div className="rounded-lg bg-[#fef2f2] border border-[#fee2e2] px-4 py-3 text-sm text-[#b91c1c]">
                  {error}
                </div>
              )}

              {/* Email */}
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4a94ff]"
                  width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2"
                  stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                >
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  disabled={loading}
                  autoComplete="email"
                  className="w-full rounded-xl border border-[#d4d4d4] bg-[#fafafa] py-2.5 pl-10 pr-4 text-sm text-[#171717] placeholder:text-[#a3a3a3] focus:border-[#4a94ff] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#4a94ff]/15 disabled:opacity-50 transition-all duration-150"
                />
              </div>

              {/* Password */}
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4a94ff]"
                  width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2"
                  stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <circle cx="12" cy="16" r="1" fill="currentColor" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                  className="w-full rounded-xl border border-[#d4d4d4] bg-[#fafafa] py-2.5 pl-10 pr-4 text-sm text-[#171717] placeholder:text-[#a3a3a3] focus:border-[#4a94ff] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#4a94ff]/15 disabled:opacity-50 transition-all duration-150"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 w-full rounded-xl bg-[#4a94ff] py-2.5 text-sm font-semibold text-white hover:bg-[#2f7de0] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4a94ff]"
              >
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Card footer */}
            <div className="px-8 pb-7 text-center">
              <p className="text-sm text-[#737373]">
                Don&apos;t have an account?{' '}
                <Link href="/signup" className="font-semibold text-[#4a94ff] hover:text-[#2f7de0] transition-colors duration-150">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  )
}
