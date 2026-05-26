import { habitPostgrestStore } from './store/habit.store.postgrest'
import type { Habit, CreateHabitInput, UpdateHabitInput } from './habit.entity'

export const habitService = {
  async list(): Promise<Habit[]> {
    return habitPostgrestStore.list()
  },

  async getById(id: string): Promise<Habit | null> {
    return habitPostgrestStore.getById(id)
  },

  async create(input: CreateHabitInput): Promise<Habit> {
    if (!input.name.trim()) throw new Error('Name is required')
    if (!input.categoryId) throw new Error('Category is required')
    if (!input.daysOfWeek.length) throw new Error('Select at least one day')
    return habitPostgrestStore.create(input)
  },

  async update(id: string, input: UpdateHabitInput): Promise<Habit> {
    return habitPostgrestStore.update(id, input)
  },

  async remove(id: string): Promise<void> {
    return habitPostgrestStore.remove(id)
  },

  async reorder(ids: string[]): Promise<void> {
    return habitPostgrestStore.reorder(ids)
  },

  getActiveOnDay(habits: Habit[], dayOfWeek: number): Habit[] {
    return habits.filter((h) => h.daysOfWeek.includes(dayOfWeek) && h.isActive)
  },
}
