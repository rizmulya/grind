import { CalendarDaysIcon, ChartBarIcon, PlusCircleIcon, ListBulletIcon, UserIcon } from '@heroicons/react/24/outline'

export type Tab = 'today' | 'progress' | 'add' | 'habits' | 'profile'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const tabs: { key: Tab; icon: typeof CalendarDaysIcon; label: string }[] = [
  { key: 'today', icon: CalendarDaysIcon, label: 'Today' },
  { key: 'progress', icon: ChartBarIcon, label: 'Progress' },
  { key: 'add', icon: PlusCircleIcon, label: '' },
  { key: 'habits', icon: ListBulletIcon, label: 'Habits' },
  { key: 'profile', icon: UserIcon, label: 'Profile' },
]

export default function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-100 bg-white/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 pb-2 pt-1">
        {tabs.map(({ key, icon: Icon, label }) => {
          if (key === 'add') {
            return (
              <button
                key={key}
                onClick={() => onTabChange('add')}
                className="relative -mt-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform active:scale-95"
              >
                <Icon className="h-8 w-8" />
              </button>
            )
          }
          return (
            <button
              key={key}
              onClick={() => onTabChange(key)}
              className={`flex flex-col items-center gap-0.5 px-3 py-1 transition-colors ${
                activeTab === key ? 'text-indigo-600' : 'text-gray-400'
              }`}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
