import { useState, useEffect, useCallback } from 'react'
import MonthNavigator from '../components/MonthNavigator'
import SetTargetModal from '../components/SetTargetModal'
import { progressService } from '../../progress/progress.service'
import { monthlyTargetService } from '../../monthly-target/monthly-target.service'
import type { HabitMonthlyProgress } from '../../progress/progress.entity'

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return `${monthNames[m - 1]} ${y}`
}

export default function ProgressPage() {
  const [yearMonth, setYearMonth] = useState(currentYearMonth())
  const [data, setData] = useState<HabitMonthlyProgress[]>([])
  const [averagePct, setAveragePct] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedHabit, setSelectedHabit] = useState<HabitMonthlyProgress | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const monthly = await progressService.getMonthlyProgress(yearMonth)
      if (cancelled) return
      setData(monthly)
      setAveragePct(progressService.calculateAverageProgress(monthly))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [yearMonth, refreshKey])

  const openModal = useCallback((item: HabitMonthlyProgress) => {
    setSelectedHabit(item)
    setModalOpen(true)
  }, [])

  const handleSetTarget = useCallback(async (targetCount: number) => {
    if (!selectedHabit) return
    await monthlyTargetService.upsert(selectedHabit.habitId, yearMonth, targetCount)
    setRefreshKey((k) => k + 1)
  }, [selectedHabit, yearMonth])

  return (
    <div>
      <MonthNavigator yearMonth={yearMonth} onChange={setYearMonth} />

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
        </div>
      ) : (
        <div className="space-y-4 px-4 pb-6">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-400">AVERAGE PROGRESS</p>
            <p className="mt-1 text-4xl font-bold text-indigo-600">{averagePct}%</p>
            <p className="mt-0.5 text-xs text-gray-400">
              across {data.filter((d) => d.target > 0).length} habits with targets
            </p>
          </div>

          {data.length === 0 ? (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-400">No active habits this month</p>
            </div>
          ) : (
            data.map((item) => (
              <button
                key={item.habitId}
                onClick={() => openModal(item)}
                className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.habitName}</p>
                    <p className="text-xs text-gray-400">{item.categoryName}</p>
                  </div>
                  <div className="ml-3 text-right">
                    <span className="text-lg font-bold text-indigo-600">{item.progressPct}%</span>
                    {item.target > 0 ? (
                      <p className="text-[10px] text-gray-400">
                        {item.completed}/{item.target}
                      </p>
                    ) : (
                      <p className="text-[12px] text-red-500">Set target here</p>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                    style={{ width: `${Math.min(item.progressPct, 100)}%` }}
                  />
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {selectedHabit && (
        <SetTargetModal
          open={modalOpen}
          habitName={selectedHabit.habitName}
          currentTarget={selectedHabit.target}
          monthLabel={monthLabel(yearMonth)}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSetTarget}
        />
      )}
    </div>
  )
}
