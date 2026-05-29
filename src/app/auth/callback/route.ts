import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { loadServerMembershipContexts } from '@/lib/institutions/server'
import { resolveActiveInstitutionContext, type LegacyUserRole } from '@/lib/institutions/core'

function safeNextPath(next: string) {
  return next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

function legacyDashboardPath(role: LegacyUserRole | null | undefined) {
  if (role === 'admin') return '/admin'
  if (role === 'teacher') return '/teacher'
  return '/student'
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = safeNextPath(searchParams.get('next') ?? '/')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      let resolvedNext = next
      let activeInstitutionId: string | null = null
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const contexts = await loadServerMembershipContexts(supabase, user.id)
        const active = resolveActiveInstitutionContext(contexts)

        if (active) {
          activeInstitutionId = active.institutionId
          if (next === '/') {
            resolvedNext = contexts.length > 1
              ? '/select-institution'
              : user.user_metadata?.signup_intent === 'create_courses'
                ? '/teacher'
                : active.dashboardPath
          }
        } else if (next === '/') {
          const { data: profile } = await supabase
            .from('users')
            .select('role')
            .eq('id', user.id)
            .maybeSingle()
          resolvedNext = legacyDashboardPath((profile?.role as LegacyUserRole | null) ?? null)
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'
      const redirectUrl = isLocalEnv
        ? `${origin}${resolvedNext}`
        : forwardedHost
          ? `https://${forwardedHost}${resolvedNext}`
          : `${origin}${resolvedNext}`

      const response = NextResponse.redirect(redirectUrl)
      if (activeInstitutionId) {
        response.cookies.set('active_institution_id', activeInstitutionId, {
          path: '/',
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 365,
        })
      }

      return response
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}
