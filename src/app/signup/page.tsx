'use client'

import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { PublicShell } from '@/components/layout/public-shell'
import { AuthErrorBanner, AuthInput, AuthSubmitButton } from '@/components/ui/auth-primitives'

type Role = 'student' | 'teacher' | 'administrator'

const ROLES: { value: Role; label: string; description: string }[] = [
  {
    value: 'student',
    label: 'Student',
    description: 'Enroll in courses and track your progress',
  },
  {
    value: 'teacher',
    label: 'Teacher',
    description: 'Build courses and manage your students',
  },
  {
    value: 'administrator',
    label: 'Admin',
    description: 'Oversee users and institution settings',
  },
]

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

const LockIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <circle cx="12" cy="16" r="1" fill="currentColor" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)

const EyeIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const EyeOffIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
)

export default function SignupPage() {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('student')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
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
      } else if (data.session) {
        // Email confirmation is disabled — user is immediately signed in, redirect to their dashboard
        const roleRoutes: Record<Role, string> = {
          student: '/student',
          teacher: '/teacher',
          administrator: '/admin',
        }
        router.push(roleRoutes[role])
      } else {
        setSuccess(true)
        setLoading(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
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
        <div className="w-full max-w-[27rem]">
          <div className="rounded-2xl border border-[#e5e5e5] bg-white shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-[#f5f5f5]">
              <h1 className="text-xl font-bold text-[#171717] mb-1">Join Neptino</h1>
              <p className="text-sm text-[#737373]">Create your account to get started</p>
            </div>

            <form onSubmit={handleSignup} className="px-8 py-6 space-y-3.5">
              {error && <AuthErrorBanner message={error} />}

              {/* Role picker */}
              <div>
                <p className="mb-2 text-xs font-medium text-[#737373] uppercase tracking-wide">I am a</p>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRole(value)}
                      disabled={loading}
                      className={`rounded-xl border px-3 py-2 text-center text-sm font-medium transition-all duration-150 disabled:opacity-50 ${
                        role === value
                          ? 'border-[#4a94ff] bg-[#f0f7ff] text-[#4a94ff] ring-2 ring-[#4a94ff]/15'
                          : 'border-[#d4d4d4] bg-[#fafafa] text-[#171717] hover:border-[#a3a3a3] hover:bg-white'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#737373] leading-snug min-h-[1rem]">
                  {ROLES.find(r => r.value === role)?.description}
                </p>
              </div>

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
                placeholder="Last name (optional)"
                disabled={loading}
                autoComplete="family-name"
              />

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

              {/* Password with show/hide and generator */}
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#4a94ff]">
                  {LockIcon}
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  disabled={loading}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-[#d4d4d4] bg-[#fafafa] py-2.5 pl-10 pr-10 text-sm text-[#171717] placeholder:text-[#a3a3a3] focus:border-[#4a94ff] focus:bg-white focus:outline-none focus:ring-3 focus:ring-[#4a94ff]/15 disabled:opacity-50 transition-all duration-150"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    disabled={loading}
                    className="flex items-center justify-center rounded-lg p-1.5 text-[#a3a3a3] hover:text-[#737373] transition-colors duration-150"
                    tabIndex={-1}
                  >
                    {showPassword ? EyeOffIcon : EyeIcon}
                  </button>

                </div>
              </div>

              <AuthSubmitButton loading={loading} loadingLabel="Creating account…">
                Create Account
              </AuthSubmitButton>

              <p className="text-[11px] text-[#a3a3a3] leading-relaxed text-center">
                By clicking Create Account, you are creating a Neptino account and you agree to Neptino&apos;s{' '}
                <a href="/terms" className="text-[#4a94ff] hover:text-[#2f7de0] transition-colors duration-150">Terms of Use</a>
                {' '}and{' '}
                <a href="/privacy" className="text-[#4a94ff] hover:text-[#2f7de0] transition-colors duration-150">Privacy Policy</a>.
              </p>
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
