import type { DailyProgress, HabitMonthlyProgress } from './progress.entity'
import type { Habit } from '../habit/habit.entity'
import type { HabitLog } from '../habit-log/habit-log.entity'
import type { MonthlyTarget } from '../monthly-target/monthly-target.entity'
import type { Category } from '../category/category.entity'
import { getPostgrest, getToken } from '../infrastructure/postgrest/postgrest.client'

function auth<T>(b: T): T {
  const t = getToken()
  if (!t) return b
  return (b as any).setHeader('Authorization', `Bearer ${t}`)
}

export const progressService = {
  async getDailyProgress(date: string): Promise<DailyProgress> {
    const res = await auth(
      getPostgrest().rpc('get_daily_progress', { p_date: date })
    )
    const row = Array.isArray(res.data) ? res.data[0] : res.data
    if (!row) return { totalScheduled: 0, totalCompleted: 0, progressPct: 0 }
    return {
      totalScheduled: Number(row.total_scheduled) || 0,
      totalCompleted: Number(row.total_completed) || 0,
      progressPct: Number(row.progress_pct) || 0,
    }
  },

  async getMonthlyProgress(yearMonth: string): Promise<HabitMonthlyProgress[]> {
    const res = await auth(
      getPostgrest().rpc('get_monthly_progress', { p_year_month: yearMonth })
    )
    return (res.data || []).map((r: any) => ({
      habitId: r.habit_id,
      habitName: r.habit_name,
      categoryName: r.category_name,
      target: Number(r.target) || 0,
      completed: Number(r.completed) || 0,
      progressPct: Number(r.progress_pct) || 0,
    }))
  },

  calculateDailyProgress(
    habits: Habit[],
    logs: HabitLog[],
    date: string
  ): DailyProgress {
    const dayOfWeek = new Date(date).getDay()
    const scheduled = habits.filter((h) => h.daysOfWeek.includes(dayOfWeek) && h.isActive)
    const completedIds = new Set(logs.map((l) => l.habitId))
    const completed = scheduled.filter((h) => completedIds.has(h.id))
    const total = scheduled.length
    return {
      totalScheduled: total,
      totalCompleted: completed.length,
      progressPct: total > 0 ? Math.round((completed.length / total) * 1000) / 10 : 0,
    }
  },

  calculateMonthlyProgress(
    habits: Habit[],
    logs: HabitLog[],
    targets: MonthlyTarget[],
    categories: Category[],
    yearMonth: string
  ): HabitMonthlyProgress[] {
    const catMap = new Map(categories.map((c) => [c.id, c]))
    const targetMap = new Map(targets.map((t) => [t.habitId, t]))
    const activeHabits = habits.filter((h) => h.isActive)

    const monthStart = new Date(yearMonth + 'T00:00:00')
    const monthEnd = new Date(monthStart)
    monthEnd.setMonth(monthEnd.getMonth() + 1)

    const monthLogs = logs.filter((l) => {
      const d = new Date(l.completedDate + 'T00:00:00')
      return d >= monthStart && d < monthEnd
    })

    return activeHabits.map((h) => {
      const target = targetMap.get(h.id)
      const completed = monthLogs.filter((l) => l.habitId === h.id).length
      const targetCount = target?.targetCount || 0
      const cat = catMap.get(h.categoryId)
      return {
        habitId: h.id,
        habitName: h.name,
        categoryName: cat?.name || 'Uncategorized',
        target: targetCount,
        completed,
        progressPct: targetCount > 0 ? Math.round((completed / targetCount) * 1000) / 10 : 0,
      }
    })
  },

  calculateAverageProgress(monthlyProgress: HabitMonthlyProgress[]): number {
    const withTarget = monthlyProgress.filter((m) => m.target > 0)
    if (!withTarget.length) return 0
    const total = withTarget.reduce((sum, m) => sum + m.progressPct, 0)
    return Math.round((total / withTarget.length) * 10) / 10
  },
}
