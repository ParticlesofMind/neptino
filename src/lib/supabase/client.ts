import { createBrowserClient } from '@supabase/ssr'

const MISSING_ENV_ERROR_MESSAGE =
  'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local, then restart the Next.js dev server.'

export function getSupabaseClientConfigError(): string | null {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)
  const hasAnonKey = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

  if (hasUrl && hasAnonKey) {
    return null
  }

  return MISSING_ENV_ERROR_MESSAGE
}

export function createClient() {
  const configError = getSupabaseClientConfigError()

  if (configError) {
    throw new Error(configError)
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
