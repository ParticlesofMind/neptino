'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useState } from 'react'
import { PublicShell } from '@/components/layout/public-shell'
import { AuthErrorBanner, AuthInput, AuthSelect, AuthSubmitButton } from '@/components/ui/auth-primitives'

type Role = 'student' | 'teacher' | 'administrator'

const PersonIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const EmailIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
)

const GroupIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)

const LockIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          user_role: role,
        },
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <PublicShell hideNavActions navActions={
        <Link href="/login" className="px-4 py-2 rounded-lg border border-[#d4d4d4] bg-white text-sm font-medium text-[#404040] hover:border-[#4a94ff] hover:text-[#4a94ff] transition-all duration-150">
          Sign In
        </Link>
      }>
        <div
          className="flex min-h-[calc(100vh-3.75rem-56px)] items-center justify-center px-4 py-16"
          style={{ background: "linear-gradient(180deg,#f3f4f8 0%,#ffffff 60%)" }}
        >
          <div className="w-full max-w-[22rem] rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-8 text-center space-y-5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f0fdf4] border border-[#dcfce7]">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-[#171717] mb-1.5">Check your email</h1>
              <p className="text-sm text-[#737373] leading-relaxed">
                A confirmation link has been sent to{' '}
                <span className="font-semibold text-[#404040]">{email}</span>. Click it to activate your <span className="font-semibold">{role}</span> account.
              </p>
            </div>
            <Link href="/login" className="block w-full rounded-xl bg-[#4a94ff] py-2.5 text-center text-sm font-semibold text-white hover:bg-[#2f7de0] transition-all duration-150 shadow-sm">
              Go to Sign In
            </Link>
          </div>
        </div>
      </PublicShell>
    )
  }

  return (
    <PublicShell hideNavActions navActions={
      <Link href="/login" className="px-4 py-2 rounded-lg border border-[#d4d4d4] bg-white text-sm font-medium text-[#404040] hover:border-[#4a94ff] hover:text-[#4a94ff] transition-all duration-150">
        Sign In
      </Link>
    }>
      <div
        className="flex min-h-[calc(100vh-3.75rem-56px)] items-center justify-center px-4 py-16"
        style={{ background: "linear-gradient(180deg,#f3f4f8 0%,#ffffff 60%)" }}
      >
        <div className="w-full max-w-[24rem]">
          <div className="rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-[#f5f5f5]">
              <h1 className="text-xl font-bold text-[#171717] mb-1">Join Neptino</h1>
              <p className="text-sm text-[#737373]">Create your account to get started</p>
            </div>

            <form onSubmit={handleSignup} className="px-8 py-6 space-y-3.5">
              {error && <AuthErrorBanner message={error} />}

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <AuthInput
                  type="text"
                  icon={PersonIcon}
                  paddingLeft="pl-9"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  required
                  disabled={loading}
                  autoComplete="given-name"
                />
                <AuthInput
                  type="text"
                  icon={PersonIcon}
                  paddingLeft="pl-9"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  disabled={loading}
                  autoComplete="family-name"
                />
              </div>

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

              <AuthSelect
                icon={GroupIcon}
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                required
                disabled={loading}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="administrator">Administrator</option>
              </AuthSelect>

              <AuthInput
                type="password"
                icon={LockIcon}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                required
                disabled={loading}
                autoComplete="new-password"
              />

              <AuthSubmitButton loading={loading} loadingLabel="Creating account…">
                Create Account
              </AuthSubmitButton>
            </form>

            <div className="px-8 pb-7 text-center">
              <p className="text-sm text-[#737373]">
                Already have an account?{' '}
                <Link href="/login" className="font-semibold text-[#4a94ff] hover:text-[#2f7de0] transition-colors duration-150">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </PublicShell>
  )
}
