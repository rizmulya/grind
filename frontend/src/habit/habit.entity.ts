export interface Habit {
  id: string
  userId: string
  categoryId: string
  name: string
  daysOfWeek: number[]
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateHabitInput {
  name: string
  categoryId: string
  daysOfWeek: number[]
}

export interface UpdateHabitInput {
  name?: string
  categoryId?: string
  daysOfWeek?: number[]
  isActive?: boolean
  sortOrder?: number
}
