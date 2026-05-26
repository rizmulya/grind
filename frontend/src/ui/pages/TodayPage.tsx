import { useState, useEffect, useCallback } from 'react'
import DateNavigator from '../components/DateNavigator'
import ProgressRing from '../components/ProgressRing'
import HabitCheckItem from '../components/HabitCheckItem'
import { habitService } from '../../habit/habit.service'
import { habitLogService } from '../../habit-log/habit-log.service'
import { categoryService } from '../../category/category.service'
import { progressService } from '../../progress/progress.service'
import type { Habit } from '../../habit/habit.entity'
import type { HabitLog } from '../../habit-log/habit-log.entity'
import type { Category } from '../../category/category.entity'
import type { DailyProgress } from '../../progress/progress.entity'
import { FireIcon } from '@heroicons/react/24/outline'

function dateToStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

interface Props {
  globalRefreshKey?: number
}

export default function TodayPage({ globalRefreshKey = 0 }: Props) {
  const [date, setDate] = useState(new Date())
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [progress, setProgress] = useState<DailyProgress>({ totalScheduled: 0, totalCompleted: 0, progressPct: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  const dateStr = dateToStr(date)
  const dayOfWeek = date.getDay()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [h, l, c] = await Promise.all([
        habitService.list(),
        habitLogService.listByDate(dateStr),
        categoryService.list(),
      ])
      if (cancelled) return
      setHabits(h)
      setLogs(l)
      setCategories(c)
      setProgress(progressService.calculateDailyProgress(h, l, dateStr))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [dateStr, refreshKey, globalRefreshKey])

  const handleToggle = useCallback(async (habitId: string) => {
    await habitLogService.toggle(habitId, dateStr)
    setRefreshKey((k) => k + 1)
  }, [dateStr])

  if (loading && habits.length === 0) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
      </div>
    )
  }

  const catMap = new Map(categories.map((c) => [c.id, c]))
  const scheduledHabits = habits.filter((h) => h.daysOfWeek.includes(dayOfWeek) && h.isActive)

  return (
    <div>
      <DateNavigator date={date} onChange={setDate} />

      <div className="flex flex-col items-center px-4 py-4">
        <ProgressRing progress={progress.progressPct} size={130} />

        <div className="mt-3 flex items-center gap-1 text-sm text-gray-500">
          <FireIcon className="h-4 w-4 text-orange-400" />
          <span>
            {progress.totalCompleted} / {progress.totalScheduled} completed
          </span>
        </div>
      </div>

      <div className="px-4">
        {scheduledHabits.length === 0 && !loading ? (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">No habits scheduled today</p>
            <p className="mt-1 text-xs text-gray-300">Add a habit to get started</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {scheduledHabits.map((h) => (
              <HabitCheckItem
                key={h.id}
                name={h.name}
                categoryName={catMap.get(h.categoryId)?.name}
                completed={logs.some((l) => l.habitId === h.id)}
                onToggle={() => handleToggle(h.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
