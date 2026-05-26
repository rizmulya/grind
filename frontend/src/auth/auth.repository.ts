import type { AuthSession } from './auth.entity'

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>
  setSession(accessToken: string, refreshToken?: string): Promise<AuthSession>
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
  onAuthStateChange(callback: (session: AuthSession | null) => void): () => void
}
