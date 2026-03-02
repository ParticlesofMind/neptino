'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useState } from 'react'
import { PublicShell } from '@/components/layout/public-shell'
import { AuthErrorBanner, AuthInput, AuthSubmitButton } from '@/components/ui/auth-primitives'

const EmailIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSubmitted(true)
    }
  }

  return (
    <PublicShell hideNavActions>
      <div
        className="flex min-h-[calc(100vh-3.75rem-56px)] items-center justify-center px-4 py-16"
        style={{ background: 'linear-gradient(180deg,#f3f4f8 0%,#ffffff 60%)' }}
      >
        <div className="w-full max-w-[22rem]">
          <div className="rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Card header */}
            <div className="px-8 pt-8 pb-6 border-b border-[#f5f5f5]">
              <h1 className="text-xl font-bold text-[#171717] mb-1">Reset your password</h1>
              <p className="text-sm text-[#737373]">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            {submitted ? (
              /* Success state */
              <div className="px-8 py-8 text-center space-y-3">
                <div className="mx-auto flex items-center justify-center w-11 h-11 rounded-full bg-[#f0f7ff]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2"
                    stroke="#4a94ff" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8" />
                    <polyline points="2,6 12,13 22,6" />
                    <polyline points="16,19 18,21 22,17" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-[#171717]">Check your inbox</p>
                <p className="text-sm text-[#737373]">
                  We sent a reset link to <span className="font-medium text-[#171717]">{email}</span>.
                  The link expires in 60 minutes.
                </p>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
                {error && <AuthErrorBanner message={error} />}

                <AuthInput
                  type="email"
                  icon={EmailIcon}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  required
                  disabled={loading}
                  autoComplete="email"
                />

                <AuthSubmitButton loading={loading} loadingLabel="Sending link…">
                  Send reset link
                </AuthSubmitButton>
              </form>
            )}

            {/* Card footer */}
            <div className="px-8 pb-7 text-center">
              <p className="text-sm text-[#737373]">
                <Link
                  href="/login"
                  className="font-semibold text-[#4a94ff] hover:text-[#2f7de0] transition-colors duration-150"
                >
                  Back to sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  )
}
