export interface AuthUser {
  id: string
  email?: string
  name?: string
  username?: string
  avatarUrl?: string
}

export interface AuthSession {
  accessToken: string
  refreshToken?: string
  user: AuthUser
}

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; session: AuthSession }
