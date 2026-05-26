import { habitLogPostgrestStore } from './store/habit-log.store.postgrest'
import type { HabitLog, CreateHabitLogInput } from './habit-log.entity'

export const habitLogService = {
  async listByDate(date: string): Promise<HabitLog[]> {
    return habitLogPostgrestStore.listByDate(date)
  },

  async listByMonth(yearMonth: string): Promise<HabitLog[]> {
    return habitLogPostgrestStore.listByMonth(yearMonth)
  },

  async create(input: CreateHabitLogInput): Promise<HabitLog> {
    return habitLogPostgrestStore.create(input)
  },

  async remove(id: string): Promise<void> {
    return habitLogPostgrestStore.remove(id)
  },

  async toggle(habitId: string, date: string): Promise<HabitLog | null> {
    const existing = await habitLogPostgrestStore.findByHabitAndDate(habitId, date)
    if (existing) {
      await habitLogPostgrestStore.remove(existing.id)
      return null
    }
    return habitLogPostgrestStore.create({ habitId, completedDate: date })
  },

  async findByHabitAndDate(habitId: string, date: string): Promise<HabitLog | null> {
    return habitLogPostgrestStore.findByHabitAndDate(habitId, date)
  },

  getCompletedHabitIds(logs: HabitLog[]): Set<string> {
    return new Set(logs.map((l) => l.habitId))
  },
}
