import { ArrowRightOnRectangleIcon, DocumentTextIcon } from '@heroicons/react/24/outline'
import type { AuthService } from '../../auth/auth.service'
import type { AuthSession } from '../../auth/auth.entity'

interface Props {
  authService: AuthService
  session: AuthSession
  onNavigateLegal: () => void
}

export default function ProfilePage({ authService, session, onNavigateLegal }: Props) {
  return (
    <div className="flex min-h-full flex-col justify-between px-4 py-6 pb-6">
      <div>
        <h2 className="mb-6 text-lg font-bold text-gray-900">Profile</h2>

        <div className="flex flex-col items-center">
          {session.user.avatarUrl ? (
            <img
              src={session.user.avatarUrl}
              alt="avatar"
              className="h-20 w-20 rounded-full border-4 border-indigo-100 object-cover shadow-sm"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-indigo-100 text-3xl font-bold text-indigo-600">
              {(session.user.name || '?')[0].toUpperCase()}
            </div>
          )}

          <h3 className="mt-4 text-lg font-semibold text-gray-900">{session.user.name || 'User'}</h3>
          {session.user.email && (
            <p className="text-sm text-gray-400">{session.user.email}</p>
          )}
        </div>

        <button
          onClick={() => authService.signOut()}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition-all active:scale-[0.98]"
        >
          <ArrowRightOnRectangleIcon className="h-5 w-5" />
          Sign Out
        </button>
      </div>

      <div className="mt-10 space-y-4 border-t border-gray-100 pt-6">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">About</h4>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <DocumentTextIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-300" />
            <div>
              <p className="text-sm font-medium text-gray-700">Grind</p>
              <p className="text-xs text-gray-400">
                Version 1.0.0 &middot; Developer:{' '}
                <a href="https://github.com/rizmulya" target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline underline-offset-2">@rizmulya</a>
              </p>
            </div>
          </div>

          <button
            onClick={onNavigateLegal}
            className="flex items-center gap-2 text-xs text-indigo-400 underline underline-offset-2"
          >
            Terms of Service & Privacy Policy
          </button>
        </div>
      </div>
    </div>
  )
}
