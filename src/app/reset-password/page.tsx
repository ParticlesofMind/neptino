'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PublicShell } from '@/components/layout/public-shell'
import { AuthErrorBanner, AuthSubmitButton } from '@/components/ui/auth-primitives'

const LockIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const EyeIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

function PasswordField({
  value,
  onChange,
  placeholder,
  disabled,
  autoComplete,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder: string
  disabled?: boolean
  autoComplete?: string
}) {
  const [show, setShow] = useState(false)

  return (
    <div className="relative flex items-center rounded-xl border border-[#e5e5e5] bg-white focus-within:border-[#4a94ff] focus-within:ring-2 focus-within:ring-[#4a94ff]/15 transition-all duration-150">
      <span className="pl-3.5 text-[#a3a3a3] pointer-events-none flex-shrink-0">{LockIcon}</span>
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required
        disabled={disabled}
        autoComplete={autoComplete}
        className="flex-1 min-w-0 px-3 py-2.5 text-sm text-[#171717] placeholder:text-[#a3a3a3] bg-transparent outline-none disabled:opacity-50"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        disabled={disabled}
        className="pr-3 pl-1 text-[#a3a3a3] hover:text-[#525252] transition-colors duration-150 flex-shrink-0"
        tabIndex={-1}
        aria-label={show ? 'Hide password' : 'Show password'}
      >
        {show ? EyeOffIcon : EyeIcon}
      </button>
    </div>
  )
}

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.updateUser({ password })

    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
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
              <h1 className="text-xl font-bold text-[#171717] mb-1">Choose a new password</h1>
              <p className="text-sm text-[#737373]">Must be at least 8 characters</p>
            </div>

            {done ? (
              /* Success state */
              <div className="px-8 py-8 text-center space-y-3">
                <div className="mx-auto flex items-center justify-center w-11 h-11 rounded-full bg-[#f0f7ff]">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" strokeWidth="2.5"
                    stroke="#4a94ff" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-[#171717]">Password updated</p>
                <p className="text-sm text-[#737373]">Redirecting you to sign in&hellip;</p>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
                {error && <AuthErrorBanner message={error} />}

                <PasswordField
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="New password"
                  disabled={loading}
                  autoComplete="new-password"
                />

                <PasswordField
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  disabled={loading}
                  autoComplete="new-password"
                />

                <AuthSubmitButton loading={loading} loadingLabel="Updating password…">
                  Update password
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
