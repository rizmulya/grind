import type { MonthlyTarget } from './monthly-target.entity'

export interface MonthlyTargetRepository {
  listByMonth(yearMonth: string): Promise<MonthlyTarget[]>
  upsert(habitId: string, yearMonth: string, targetCount: number): Promise<MonthlyTarget>
}
