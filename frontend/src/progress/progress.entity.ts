export interface DailyProgress {
  totalScheduled: number
  totalCompleted: number
  progressPct: number
}

export interface HabitMonthlyProgress {
  habitId: string
  habitName: string
  categoryName: string
  target: number
  completed: number
  progressPct: number
}
