import type { HabitLog, CreateHabitLogInput } from './habit-log.entity'

export interface HabitLogRepository {
  listByDate(date: string): Promise<HabitLog[]>
  listByMonth(yearMonth: string): Promise<HabitLog[]>
  create(input: CreateHabitLogInput): Promise<HabitLog>
  remove(id: string): Promise<void>
  findByHabitAndDate(habitId: string, date: string): Promise<HabitLog | null>
}
