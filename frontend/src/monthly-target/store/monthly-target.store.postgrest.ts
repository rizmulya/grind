import type { MonthlyTargetRepository } from '../monthly-target.repository'
import type { MonthlyTarget } from '../monthly-target.entity'
import { getPostgrest, getToken } from '../../infrastructure/postgrest/postgrest.client'

function mapRow(r: any): MonthlyTarget {
  return {
    id: r.id,
    habitId: r.habit_id,
    yearMonth: r.year_month,
    targetCount: r.target_count,
  }
}

function auth<T>(b: T): T {
  const t = getToken()
  if (!t) return b
  return (b as any).setHeader('Authorization', `Bearer ${t}`)
}

export const monthlyTargetPostgrestStore: MonthlyTargetRepository = {
  async listByMonth(yearMonth: string) {
    const res = await auth(
      getPostgrest().from('monthly_targets').select('*').eq('year_month', yearMonth)
    )
    return (res.data || []).map(mapRow)
  },

  async upsert(habitId: string, yearMonth: string, targetCount: number) {
    const res = await auth(
      getPostgrest().from('monthly_targets').upsert(
        { habit_id: habitId, year_month: yearMonth, target_count: targetCount },
        { onConflict: 'habit_id,year_month', ignoreDuplicates: false }
      ).select('*').single()
    )
    return mapRow(res.data!)
  },
}
