import { monthlyTargetPostgrestStore } from './store/monthly-target.store.postgrest'
import type { MonthlyTarget } from './monthly-target.entity'

export const monthlyTargetService = {
  async listByMonth(yearMonth: string): Promise<MonthlyTarget[]> {
    return monthlyTargetPostgrestStore.listByMonth(yearMonth)
  },

  async upsert(habitId: string, yearMonth: string, targetCount: number): Promise<MonthlyTarget> {
    if (targetCount < 1) throw new Error('Target must be at least 1')
    return monthlyTargetPostgrestStore.upsert(habitId, yearMonth, targetCount)
  },
}
