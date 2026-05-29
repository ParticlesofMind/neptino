'use client'

import { createClient, getSupabaseClientConfigError } from '@/lib/supabase/client'
import Link from 'next/link'
import { BookOpen, Building2, GraduationCap, type LucideIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { PublicShell } from '@/components/layout/public-shell'
import { AuthErrorBanner, AuthInput, AuthSelect, AuthSubmitButton } from '@/components/ui/auth-primitives'
import { buttonVariants } from '@/components/ui/button'
import {
  getSignupProvisioning,
  INSTITUTION_TYPE_OPTIONS,
  isSignupIntent,
  type SignupIntent,
} from '@/lib/institutions/core'
import { resolvePostAuthDestination } from '@/lib/institutions/client'

type PublicSignupIntent = Exclude<SignupIntent, 'join_course'>

const SIGNUP_INTENTS: {
  value: PublicSignupIntent
  label: string
  description: string
  icon: LucideIcon
}[] = [
  {
    value: 'learn_independently',
    label: 'Student',
    description: 'Learn independently, then join teacher-led courses with a link, code, or invite.',
    icon: GraduationCap,
  },
  {
    value: 'create_courses',
    label: 'Teacher',
    description: 'Build courses now. Your workspace can be named or changed later.',
    icon: BookOpen,
  },
  {
    value: 'setup_institution',
    label: 'Admin',
    description: 'Set up a school or organization, then manage courses, access, and teams.',
    icon: Building2,
  },
]

const JOIN_INTENT_COPY = {
  label: 'Continue with an invitation',
  description: 'Use the email address your school, teacher, or organization provided for this access.',
}

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

const BuildingIcon = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" strokeWidth="2"
    stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01" />
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
  const [intent, setIntent] = useState<SignupIntent | null>(null)
  const [institutionName, setInstitutionName] = useState('')
  const [institutionType, setInstitutionType] = useState('private_school')
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [hasJoinContext, setHasJoinContext] = useState(false)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [nextPath, setNextPath] = useState<string | null>(null)
  const configError = getSupabaseClientConfigError()
  const router = useRouter()
  const loginHref = nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const next = params.get('next')
      const requestedIntent = params.get('intent')
      const token = params.get('invite_token') ?? params.get('token')
      const safeNext = next?.startsWith('/') ? next : null
      const joinContext = requestedIntent === 'join_course' || safeNext?.startsWith('/join/') === true || Boolean(token?.trim())

      setNextPath(safeNext)
      setHasJoinContext(joinContext)
      if (joinContext) {
        setIntent('join_course')
      } else if (isSignupIntent(requestedIntent) && requestedIntent !== 'join_course') {
        setIntent(requestedIntent)
      }
      if (token?.trim()) setInviteToken(token.trim())
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (configError) {
      setError(configError)
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (!intent) {
      setError('Choose Student, Teacher, or Admin to continue.')
      return
    }

    const provisioning = getSignupProvisioning({
      intent,
      firstName,
      lastName,
      institutionName,
      institutionType,
    })

    if (intent === 'setup_institution' && !provisioning.institutionName) {
      setError('Enter a school or organization name.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath ?? '/')}`,
          data: {
            first_name: firstName,
            last_name: lastName,
            signup_intent: intent,
            user_role: provisioning.legacyRole,
            institution_name: provisioning.institutionName,
            institution_type: provisioning.institutionType,
            invite_token: inviteToken,
          },
        },
      })

      if (error) {
        setError(error.message)
        setLoading(false)
      } else if (data.session) {
        const destination = await resolvePostAuthDestination({
          supabase,
          userId: data.session.user.id,
          nextPath,
        })
        router.push(!nextPath && intent === 'create_courses' ? '/teacher' : destination)
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
        <Link href={loginHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
          Sign In
        </Link>
      }>
        <div className="flex min-h-[calc(100vh-3.75rem-56px)] items-center justify-center px-4 py-16 bg-gradient-to-b from-muted to-background">
          <div className="w-full max-w-[22rem] rounded-2xl border border-border bg-background shadow-[0_2px_20px_rgba(0,0,0,0.06)] p-8 text-center space-y-5">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#d6ede3] border border-[#5c9970]/30">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5c9970" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground mb-1.5">Check your email</h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A confirmation link has been sent to{' '}
                <span className="font-semibold text-foreground/80">{email}</span>. Click it to finish setting up your account.
              </p>
            </div>
            <Link href={loginHref} className={buttonVariants({ variant: "primary", size: "md", className: "w-full" })}>
              Go to Sign In
            </Link>
          </div>
        </div>
      </PublicShell>
    )
  }

  return (
    <PublicShell hideNavActions navActions={
      <Link href={loginHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
        Sign In
      </Link>
    }>
      <div className="flex min-h-[calc(100vh-3.75rem-56px)] items-center justify-center px-4 py-16 bg-gradient-to-b from-muted to-background">
        <div className="w-full max-w-[27rem]">
          <div className="rounded-2xl border border-border bg-background shadow-[0_2px_20px_rgba(0,0,0,0.06)] overflow-hidden">
            {/* Header */}
            <div className="px-8 pt-8 pb-6 border-b border-muted">
              <h1 className="text-xl font-bold text-foreground mb-1">
                {hasJoinContext ? 'Accept your Neptino access' : 'Create your Neptino account'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {hasJoinContext
                  ? 'Finish setup from the link or invitation you received.'
                  : 'Choose how you want to use Neptino.'}
              </p>
            </div>

            <form onSubmit={handleSignup} className="px-8 py-6 space-y-3.5">
              {(error || configError) && <AuthErrorBanner message={error ?? configError!} />}

              {hasJoinContext ? (
                <div className="rounded-xl border border-primary/30 bg-accent px-3 py-3">
                  <p className="text-sm font-semibold text-primary">{JOIN_INTENT_COPY.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{JOIN_INTENT_COPY.description}</p>
                </div>
              ) : (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">Choose your profile</p>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Profile type">
                    {SIGNUP_INTENTS.map(({ value, label, icon: Icon }) => {
                      const selected = intent === value

                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => setIntent(value)}
                          disabled={loading}
                          className={`flex h-[4.25rem] flex-col items-center justify-center gap-1.5 rounded-xl border px-2 text-center text-xs font-semibold transition-all duration-150 disabled:opacity-50 sm:text-sm ${
                            selected
                              ? 'border-primary bg-accent text-primary ring-2 ring-primary/15'
                              : 'border-border bg-muted text-foreground hover:border-muted-foreground/40 hover:bg-background'
                          }`}
                        >
                          <Icon aria-hidden="true" className="h-4 w-4" strokeWidth={2.1} />
                          <span>{label}</span>
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-3 flex min-h-[4rem] items-center rounded-lg border border-border bg-muted/40 px-3 py-2">
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {SIGNUP_INTENTS.find((option) => option.value === intent)?.description
                        ?? 'Select a profile to see how Neptino will set up your account.'}
                    </p>
                  </div>
                </div>
              )}

              {intent === 'create_courses' && (
                <AuthInput
                  type="text"
                  icon={BuildingIcon}
                  value={institutionName}
                  onChange={(e) => setInstitutionName(e.target.value)}
                  placeholder="Workspace name (optional)"
                  disabled={loading}
                  autoComplete="organization"
                />
              )}

              {intent === 'setup_institution' && (
                <div className="grid gap-3.5">
                  <AuthInput
                    type="text"
                    icon={BuildingIcon}
                    value={institutionName}
                    onChange={(e) => setInstitutionName(e.target.value)}
                    placeholder="School or organization name"
                    required
                    disabled={loading}
                    autoComplete="organization"
                  />
                  <AuthSelect
                    icon={BuildingIcon}
                    value={institutionType}
                    onChange={(e) => setInstitutionType(e.target.value)}
                    disabled={loading}
                    required
                  >
                    {INSTITUTION_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </AuthSelect>
                </div>
              )}

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
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-primary">
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
                  className="w-full rounded-xl border border-border bg-muted py-2.5 pl-10 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-primary focus:bg-background focus:outline-none focus:ring-3 focus:ring-primary/15 disabled:opacity-50 transition-all duration-150"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    disabled={loading}
                    className="flex items-center justify-center rounded-lg p-1.5 text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150"
                    tabIndex={-1}
                  >
                    {showPassword ? EyeOffIcon : EyeIcon}
                  </button>

                </div>
              </div>

              <AuthSubmitButton loading={loading} loadingLabel="Creating account…" disabled={!intent}>
                {hasJoinContext
                  ? 'Create Account'
                  : intent === 'setup_institution'
                    ? 'Create Organization'
                    : intent === 'create_courses'
                      ? 'Create Workspace'
                      : intent === 'learn_independently'
                        ? 'Create Learner Account'
                        : 'Choose a Profile'}
              </AuthSubmitButton>

              <p className="text-xs text-muted-foreground/60 leading-relaxed text-center">
                By clicking Create Account, you are creating a Neptino account and you agree to Neptino&apos;s{' '}
                <a href="/terms" className="text-primary hover:text-primary/80 transition-colors duration-150 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/60">Terms of Use</a>
                {' '}and{' '}
                <a href="/privacy" className="text-primary hover:text-primary/80 transition-colors duration-150 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/60">Privacy Policy</a>.
              </p>
            </form>

            <div className="px-8 pb-7 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href={loginHref} className="font-semibold text-primary hover:text-primary/80 transition-colors duration-150 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary/60">
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
