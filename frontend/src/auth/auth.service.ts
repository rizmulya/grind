import {
  authClient,
  signInWithGoogle as goTrueSignIn,
} from '../infrastructure/auth/auth.client'
import type { AuthSession, AuthState } from './auth.entity'

function mapSession(session: any): AuthSession | null {
  if (!session?.access_token || !session?.user) return null
  return {
    accessToken: session.access_token,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
      username: session.user.user_metadata?.full_name || session.user.email?.split('@')[0],
      avatarUrl: session.user.user_metadata?.avatar_url,
    },
  }
}

export function createAuthService() {
  let _listeners: Array<(state: AuthState) => void> = []
  let _state: AuthState = { status: 'loading' }

  function notify() {
    _listeners.forEach((l) => l(_state))
  }

  return {
    getState() {
      return _state
    },

    subscribe(listener: (state: AuthState) => void) {
      _listeners.push(listener)
      return () => {
        _listeners = _listeners.filter((l) => l !== listener)
      }
    },

    async init() {
      const { data } = await authClient.getSession()
      _state = data?.session
        ? { status: 'authenticated', session: mapSession(data.session)! }
        : { status: 'unauthenticated' }
      notify()
    },

    async signInWithGoogle() {
      await goTrueSignIn()
    },

    async signOut() {
      await authClient.signOut()
      _state = { status: 'unauthenticated' }
      notify()
    },
  }
}

export type AuthService = ReturnType<typeof createAuthService>
