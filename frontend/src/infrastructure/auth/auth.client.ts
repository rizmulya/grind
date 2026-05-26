import { GoTrueClient } from '@supabase/supabase-js'
import { setAuthToken } from '../postgrest/postgrest.client'

const gotrueUrl = import.meta.env.VITE_GOTRUE_URL
const siteUrl = import.meta.env.VITE_SITE_URL

export const authClient = new GoTrueClient({
  url: gotrueUrl,
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
})

authClient.onAuthStateChange((event, session) => {
  if (session?.access_token) {
    setAuthToken(session.access_token)
    localStorage.setItem('grind_access_token', session.access_token)
  } else if (event === 'SIGNED_OUT') {
    setAuthToken(null)
    localStorage.removeItem('grind_access_token')
  }
})

export async function signInWithGoogle(): Promise<void> {
  const { error } = await authClient.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: siteUrl },
  })
  if (error) throw error
}


