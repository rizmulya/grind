import type { HabitLogRepository } from '../habit-log.repository'
import type { HabitLog, CreateHabitLogInput } from '../habit-log.entity'
import { getPostgrest, getToken } from '../../infrastructure/postgrest/postgrest.client'

function mapRow(r: any): HabitLog {
  return {
    id: r.id,
    habitId: r.habit_id,
    userId: r.user_id,
    completedDate: r.completed_date,
    note: r.note,
    createdAt: r.created_at,
  }
}

function auth<T>(b: T): T {
  const t = getToken()
  if (!t) return b
  return (b as any).setHeader('Authorization', `Bearer ${t}`)
}

export const habitLogPostgrestStore: HabitLogRepository = {
  async listByDate(date: string) {
    const res = await auth(
      getPostgrest().from('habit_logs').select('*').eq('completed_date', date)
    )
    return (res.data || []).map(mapRow)
  },

  async listByMonth(yearMonth: string) {
    const [y, m] = yearMonth.split('-').map(Number)
    const nextM = m === 12 ? 1 : m + 1
    const nextY = m === 12 ? y + 1 : y
    const nextStr = `${nextY}-${String(nextM).padStart(2, '0')}-01`

    const res = await auth(
      getPostgrest().from('habit_logs').select('*')
        .gte('completed_date', yearMonth)
        .lt('completed_date', nextStr)
    )
    return (res.data || []).map(mapRow)
  },

  async create(input: CreateHabitLogInput) {
    const res = await auth(
      getPostgrest().from('habit_logs').insert({
        habit_id: input.habitId,
        completed_date: input.completedDate,
        note: input.note || null,
      }).select('*').single()
    )
    return mapRow(res.data!)
  },

  async remove(id: string) {
    await auth(
      getPostgrest().from('habit_logs').delete().eq('id', id)
    )
  },

  async findByHabitAndDate(habitId: string, date: string) {
    const res = await auth(
      getPostgrest().from('habit_logs').select('*')
        .eq('habit_id', habitId)
        .eq('completed_date', date)
        .maybeSingle()
    )
    return res.data ? mapRow(res.data) : null
  },
}
