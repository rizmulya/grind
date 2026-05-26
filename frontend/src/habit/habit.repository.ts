import type { Habit, CreateHabitInput, UpdateHabitInput } from './habit.entity'

export interface HabitRepository {
  list(): Promise<Habit[]>
  getById(id: string): Promise<Habit | null>
  create(input: CreateHabitInput): Promise<Habit>
  update(id: string, input: UpdateHabitInput): Promise<Habit>
  remove(id: string): Promise<void>
  reorder(ids: string[]): Promise<void>
}
