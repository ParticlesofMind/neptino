import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  const isStudentRoute = path.startsWith('/student')
  const isTeacherRoute = path.startsWith('/teacher')
  const isAdminRoute = path.startsWith('/admin')
  const isAuthRoute = path.startsWith('/login') || path.startsWith('/auth')

  if (!user && (isStudentRoute || isTeacherRoute || isAdminRoute)) {
    const url = new URL('/login', request.url)
    return NextResponse.redirect(url)
  }

  if (user) {
    const userRole = user.user_metadata?.user_role || 'student'
    const isTeacher = userRole === 'teacher'
    const isAdmin = userRole === 'admin' || userRole === 'administrator'
    const isStudent = !isTeacher && !isAdmin

    if (isAuthRoute && path !== '/auth/callback') {
      if (isTeacher) return NextResponse.redirect(new URL('/teacher', request.url))
      if (isAdmin) return NextResponse.redirect(new URL('/admin', request.url))
      return NextResponse.redirect(new URL('/student', request.url))
    }

    if (isStudentRoute && !isStudent) {
      if (isTeacher) return NextResponse.redirect(new URL('/teacher', request.url))
      if (isAdmin) return NextResponse.redirect(new URL('/admin', request.url))
    }

    if (isTeacherRoute && !isTeacher) {
      if (isAdmin) return NextResponse.redirect(new URL('/admin', request.url))
      return NextResponse.redirect(new URL('/student', request.url))
    }

    if (isAdminRoute && !isAdmin) {
      if (isTeacher) return NextResponse.redirect(new URL('/teacher', request.url))
      return NextResponse.redirect(new URL('/student', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
