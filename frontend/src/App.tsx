import { useState, useEffect, useCallback } from 'react'
import AppLayout from './ui/layout/AppLayout'
import AuthPage from './ui/pages/AuthPage'
import TodayPage from './ui/pages/TodayPage'
import ProgressPage from './ui/pages/ProgressPage'
import HabitsPage from './ui/pages/HabitsPage'
import ProfilePage from './ui/pages/ProfilePage'
import LegalPage from './ui/pages/LegalPage'
import HabitFormModal from './ui/components/HabitFormModal'
import type { HabitFormData } from './ui/components/HabitFormModal'
import { createAuthService, type AuthService } from './auth/auth.service'
import { habitService } from './habit/habit.service'
import { categoryService } from './category/category.service'
import type { Tab } from './ui/components/BottomNav'
import type { AuthState } from './auth/auth.entity'

let _authService: AuthService | null = null
function getAuthService(): AuthService {
  if (!_authService) _authService = createAuthService()
  return _authService
}

export default function App() {
  const [authState, setAuthState] = useState<AuthState>({ status: 'loading' })
  const [activeTab, setActiveTab] = useState<Tab>('today')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [categories, setCategories] = useState<Awaited<ReturnType<typeof categoryService.list>>>([])
  const [globalRefreshKey, setGlobalRefreshKey] = useState(0)
  const [showLegal, setShowLegal] = useState(false)

  const auth = getAuthService()

  useEffect(() => {
    const unsub = auth.subscribe(setAuthState)
    auth.init()
    return unsub
  }, [])

  useEffect(() => {
    if (activeTab === 'add') {
      setAddModalOpen(true)
      setActiveTab('today')
    }
  }, [activeTab])

  useEffect(() => {
    if (addModalOpen) {
      categoryService.list().then(setCategories)
    }
  }, [addModalOpen])

  const handleAddHabit = useCallback(
    async (data: HabitFormData) => {
      try {
        await habitService.create(data)
        setGlobalRefreshKey((k) => k + 1)
      } catch (e) {
        console.error('Failed to create habit:', e)
      }
    },
    []
  )

  if (showLegal) {
    return (
      <div className="mx-auto min-h-dvh max-w-lg bg-gray-50">
        <LegalPage onBack={() => setShowLegal(false)} />
      </div>
    )
  }

  if (authState.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-b from-indigo-500 to-purple-700">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/30 border-t-white" />
      </div>
    )
  }

  if (authState.status === 'unauthenticated') {
    return <AuthPage authService={auth} onNavigateLegal={() => setShowLegal(true)} />
  }

  const session = authState.session

  return (
    <AppLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'today' && <TodayPage globalRefreshKey={globalRefreshKey} />}
      {activeTab === 'progress' && <ProgressPage />}
      {activeTab === 'habits' && <HabitsPage />}
      {activeTab === 'profile' && (
        <ProfilePage
          authService={auth}
          session={session}
          onNavigateLegal={() => setShowLegal(true)}
        />
      )}

      <HabitFormModal
        open={addModalOpen}
        categories={categories}
        onClose={() => setAddModalOpen(false)}
        onSubmit={handleAddHabit}
      />
    </AppLayout>
  )
}
