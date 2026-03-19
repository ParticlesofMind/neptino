'use client'
import { createClient, getSupabaseClientConfigError } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export function SignOutButton() {
  const router = useRouter()

  const handleSignOut = async () => {
    const configError = getSupabaseClientConfigError()
    if (configError) {
      console.error(configError)
      return
    }

    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push('/login')
  }

  return (
    <button
      onClick={handleSignOut}
      className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-primary/30 hover:bg-muted/50 hover:text-foreground transition-all cursor-pointer"
    >
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </button>
  )
}
