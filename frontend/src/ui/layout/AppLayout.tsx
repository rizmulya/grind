import BottomNav, { type Tab } from '../components/BottomNav'

interface Props {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: React.ReactNode
}

export default function AppLayout({ activeTab, onTabChange, children }: Props) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col bg-gray-50">
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>
      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  )
}
