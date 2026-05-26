import type { HabitRepository } from '../habit.repository'
import type { Habit, CreateHabitInput, UpdateHabitInput } from '../habit.entity'
import { getPostgrest, getToken } from '../../infrastructure/postgrest/postgrest.client'

function mapRow(r: any): Habit {
  return {
    id: r.id,
    userId: r.user_id,
    categoryId: r.category_id,
    name: r.name,
    daysOfWeek: r.days_of_week || [],
    sortOrder: r.sort_order ?? 0,
    isActive: r.is_active,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function auth<T>(b: T): T {
  const t = getToken()
  if (!t) return b
  return (b as any).setHeader('Authorization', `Bearer ${t}`)
}

export const habitPostgrestStore: HabitRepository = {
  async list() {
    const res = await auth(
      getPostgrest().from('habits').select('*').order('sort_order', { ascending: true })
      // .order('created_at', { ascending: false })
    )
    return (res.data || []).map(mapRow)
  },

  async getById(id: string) {
    const res = await auth(
      getPostgrest().from('habits').select('*').eq('id', id).single()
    )
    return res.data ? mapRow(res.data) : null
  },

  async create(input: CreateHabitInput) {
    const maxRes = await auth(
      getPostgrest().from('habits').select('sort_order').order('sort_order', { ascending: false }).limit(1)
    )
    const maxSort = (maxRes.data?.[0]?.sort_order ?? 0) + 1
    const res = await auth(
      getPostgrest().from('habits').insert({
        name: input.name,
        category_id: input.categoryId,
        days_of_week: input.daysOfWeek,
        sort_order: maxSort,
      }).select('*').single()
    )
    return mapRow(res.data!)
  },

  async update(id: string, input: UpdateHabitInput) {
    const payload: Record<string, unknown> = {}
    if (input.name !== undefined) payload.name = input.name
    if (input.categoryId !== undefined) payload.category_id = input.categoryId
    if (input.daysOfWeek !== undefined) payload.days_of_week = input.daysOfWeek
    if (input.isActive !== undefined) payload.is_active = input.isActive
    if (input.sortOrder !== undefined) payload.sort_order = input.sortOrder

    const res = await auth(
      getPostgrest().from('habits').update(payload).eq('id', id).select('*').single()
    )
    return mapRow(res.data!)
  },

  async remove(id: string) {
    await auth(
      getPostgrest().from('habits').delete().eq('id', id)
    )
  },

  async reorder(ids: string[]) {
    const updates = ids.map((id, i) => ({
      id,
      sort_order: i + 1,
    }))
    await Promise.all(
      updates.map((u) =>
        auth(
          getPostgrest().from('habits').update({ sort_order: u.sort_order }).eq('id', u.id)
        )
      )
    )
  },
}
