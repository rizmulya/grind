export interface HabitLog {
  id: string
  habitId: string
  userId: string
  completedDate: string
  note?: string
  createdAt: string
}

export interface CreateHabitLogInput {
  habitId: string
  completedDate: string
  note?: string
}
